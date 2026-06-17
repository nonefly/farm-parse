#!/usr/bin/env node

const fs = require('fs');
const http = require('http');
const https = require('https');
const os = require('os');
const path = require('path');
const express = require('express');
const farmDb = require('./lib/farm-db');
const { formatDuration } = require('./lib/maturity');
const pushplus = require('./notify/pushplus');

const HTTP_PORT = Number(process.env.FARM_MATURITY_PORT || 8790);
const FARM_PARSE_BASE_URL = process.env.FARM_PARSE_BASE_URL || 'http://127.0.0.1:8787';
const PRECHECK_BEFORE_MS = Number(process.env.FARM_PRECHECK_BEFORE_MS || 5 * 60 * 1000);
const HARVEST_LOOP_BEFORE_MS = Number(process.env.FARM_HARVEST_LOOP_BEFORE_MS || 60 * 1000);
const SCHEDULER_INTERVAL_MS = Number(process.env.FARM_SCHEDULER_INTERVAL_MS || 5000);
const PUSHPLUS_BATCH_INTERVAL_MS = 30 * 60 * 1000;
const PUSHPLUS_BATCH_WINDOW_MS = 30 * 60 * 1000;

const state = {
  startedAt: Date.now(),
  streamConnected: false,
  streamRetryCount: 0,
  lastEventAt: 0,
  lastPersistedFriend: null,
  schedulerEnabled: process.env.FARM_SCHEDULER_ENABLED !== 'false',
};

function safeJson(value, fallback = {}) {
  try { return JSON.parse(value || '{}'); } catch { return fallback; }
}

function appDataDir() {
  return process.pkg ? path.join(os.homedir(), '.farm-parse') : path.join(__dirname, '.farm-parse');
}

function pushplusConfigFile() {
  const dir = appDataDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'pushplus-config.json');
}

function defaultPushplusConfig() {
  return {
    enabled: false,
    token: '',
    channel: 'wechat',
    friendFilters: [],
    cropFilters: [],
    intervalMs: PUSHPLUS_BATCH_INTERVAL_MS,
    windowMs: PUSHPLUS_BATCH_WINDOW_MS,
    lastSentAt: 0,
    updatedAt: 0,
  };
}

function normalizeFilterList(value) {
  const raw = Array.isArray(value) ? value : String(value || '').split(/[\n,，;；]+/);
  return [...new Set(raw.map(v => String(v || '').trim()).filter(Boolean))];
}

function minutesToMs(value, fallbackMs) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallbackMs;
  return Math.max(60 * 1000, Math.round(n * 60 * 1000));
}

function msToMinutes(ms) {
  const n = Number(ms || 0);
  return Math.max(1, Math.round(n / 60000));
}

function normalizePushplusConfig(config = {}) {
  const base = defaultPushplusConfig();
  const intervalMs = minutesToMs(
    config.intervalMinutes ?? (config.intervalMs ? Number(config.intervalMs) / 60000 : undefined),
    PUSHPLUS_BATCH_INTERVAL_MS
  );
  const windowMs = minutesToMs(
    config.windowMinutes ?? (config.windowMs ? Number(config.windowMs) / 60000 : undefined),
    PUSHPLUS_BATCH_WINDOW_MS
  );
  return {
    ...base,
    ...config,
    enabled: config.enabled === true || config.enabled === 1 || config.enabled === 'true',
    token: String(config.token || '').trim(),
    channel: String(config.channel || 'wechat').trim() || 'wechat',
    friendFilters: normalizeFilterList(config.friendFilters),
    cropFilters: normalizeFilterList(config.cropFilters),
    intervalMs,
    windowMs,
    lastSentAt: Number(config.lastSentAt || 0) || 0,
    updatedAt: Number(config.updatedAt || 0) || 0,
  };
}

function withPublicPushplusFields(cfg) {
  return {
    ...cfg,
    intervalMinutes: msToMinutes(cfg.intervalMs),
    windowMinutes: msToMinutes(cfg.windowMs),
    tokenSet: Boolean(cfg.token),
    tokenMasked: cfg.token ? `${cfg.token.slice(0, 4)}****${cfg.token.slice(-4)}` : '',
  };
}

function readPushplusConfig({ includeToken = false } = {}) {
  const file = pushplusConfigFile();
  let cfg = defaultPushplusConfig();
  if (fs.existsSync(file)) cfg = normalizePushplusConfig(safeJson(fs.readFileSync(file, 'utf8'), cfg));
  cfg = normalizePushplusConfig(cfg);
  if (process.env.PUSHPLUS_TOKEN && !cfg.token) cfg.token = process.env.PUSHPLUS_TOKEN;
  const publicCfg = withPublicPushplusFields(cfg);
  if (!includeToken) delete publicCfg.token;
  return publicCfg;
}

function writePushplusConfig(config) {
  const cfg = normalizePushplusConfig(config);
  fs.writeFileSync(pushplusConfigFile(), JSON.stringify(cfg, null, 2));
  return cfg;
}

function savePushplusConfig(input = {}) {
  const current = readPushplusConfig({ includeToken: true });
  const next = {
    ...current,
    enabled: input.enabled === true,
    channel: String(input.channel || current.channel || 'wechat').trim() || 'wechat',
    friendFilters: normalizeFilterList(input.friendFilters),
    cropFilters: normalizeFilterList(input.cropFilters),
    intervalMs: minutesToMs(input.intervalMinutes ?? (input.intervalMs ? Number(input.intervalMs) / 60000 : current.intervalMinutes), current.intervalMs || PUSHPLUS_BATCH_INTERVAL_MS),
    windowMs: minutesToMs(input.windowMinutes ?? (input.windowMs ? Number(input.windowMs) / 60000 : current.windowMinutes), current.windowMs || PUSHPLUS_BATCH_WINDOW_MS),
    updatedAt: Date.now(),
  };
  const token = String(input.token || '').trim();
  if (input.clearToken === true) next.token = '';
  else if (token) next.token = token;
  writePushplusConfig(next);
  return readPushplusConfig();
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function isMaturePickable(land, nowMs = Date.now()) {
  const matureAt = Number(land?.mature_at || 0);
  const left = Number(land?.left_fruit_num || 0);
  const total = Number(land?.fruit_num || 0);
  return Number(land?.has_plant) === 1
    && matureAt > 0
    && matureAt <= nowMs
    && Number(land?.stealable) === 1
    && total > 0
    && left > total * 0.7;
}

function notifyFarm(title, payload, note) {
  if (!pushplus.isEnabled()) return;
  pushplus.sendFarmReminder({
    title,
    heading: title,
    friendName: payload.friendName || payload.friend_name || '',
    friendGid: payload.friendGid || payload.friend_gid || '',
    plantName: payload.plantName || payload.plant_name || '',
    landId: payload.landId || payload.land_id || '',
    matureAt: payload.matureAt || payload.mature_at || 0,
    note,
  }).catch(error => {
    console.warn('[maturity] PushPlus 推送失败:', error.message);
    try { farmDb.addLog('warn', `PushPlus 推送失败: ${error.message}`); } catch {}
  });
}

function pushplusItemMatches(item, cfg) {
  const friendFilters = normalizeFilterList(cfg.friendFilters).map(v => v.toLowerCase());
  const cropFilters = normalizeFilterList(cfg.cropFilters).map(v => v.toLowerCase());
  if (!friendFilters.length && !cropFilters.length) return true;
  const friendName = String(item.friendName || '').toLowerCase();
  const friendGid = String(item.friendGid || '').toLowerCase();
  const plantName = String(item.plantName || '').toLowerCase();
  const plantId = String(item.plantId || '').toLowerCase();
  const friendMatched = friendFilters.some(filter => friendGid === filter || friendName.includes(filter));
  const cropMatched = cropFilters.some(filter => plantId === filter || plantName.includes(filter));
  return friendMatched || cropMatched;
}

function listUpcomingPushplusItems(cfg, nowMs = Date.now()) {
  const endMs = nowMs + Number(cfg.windowMs || PUSHPLUS_BATCH_WINDOW_MS);
  const items = [];
  for (const friend of farmDb.listFriends(nowMs)) {
    for (const land of farmDb.listFriendLands(friend.gid)) {
      const matureAt = Number(land.mature_at || 0);
      if (Number(land.has_plant) !== 1) continue;
      if (!matureAt || matureAt <= nowMs || matureAt > endMs) continue;
      if (Number(land.phase) === 7) continue;
      const item = {
        friendGid: String(friend.gid),
        friendName: friend.name || '',
        landId: Number(land.land_id),
        plantId: Number(land.plant_id || 0),
        plantName: land.plant_name || '',
        matureAt,
        leftFruitNum: Number(land.left_fruit_num || 0),
        fruitNum: Number(land.fruit_num || 0),
      };
      if (pushplusItemMatches(item, cfg)) items.push(item);
    }
  }
  return items.sort((a, b) => a.matureAt - b.matureAt || String(a.friendName).localeCompare(String(b.friendName), 'zh-CN') || a.landId - b.landId);
}

function groupPushplusItemsByFriend(items) {
  const groups = new Map();
  for (const item of items) {
    const key = item.friendGid || item.friendName || 'unknown';
    if (!groups.has(key)) {
      groups.set(key, {
        friendGid: item.friendGid,
        friendName: item.friendName,
        plantCounts: new Map(),
        landIds: [],
        count: 0,
        totalLeft: 0,
        totalFruit: 0,
        earliest: Number(item.matureAt || 0),
      });
    }
    const group = groups.get(key);
    const plantName = item.plantName || String(item.plantId || '未知作物');
    group.plantCounts.set(plantName, (group.plantCounts.get(plantName) || 0) + 1);
    group.landIds.push(`#${item.landId}`);
    group.count += 1;
    group.totalLeft += Number(item.leftFruitNum || 0);
    group.totalFruit += Number(item.fruitNum || 0);
    const matureAt = Number(item.matureAt || 0);
    if (matureAt && (!group.earliest || matureAt < group.earliest)) group.earliest = matureAt;
  }
  return [...groups.values()].sort((a, b) => a.earliest - b.earliest || String(a.friendName).localeCompare(String(b.friendName), 'zh-CN'));
}

function formatPushplusPlantCounts(plantCounts) {
  return [...plantCounts.entries()]
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), 'zh-CN'))
    .map(([name, count]) => `${escapeHtml(name)}${count > 1 ? `×${count}` : ''}`)
    .join('<br>');
}

function renderPushplusBatchMessage(items, cfg, nowMs = Date.now()) {
  const endMs = nowMs + Number(cfg.windowMs || PUSHPLUS_BATCH_WINDOW_MS);
  const intervalText = formatDuration(Number(cfg.intervalMs || PUSHPLUS_BATCH_INTERVAL_MS));
  const windowText = formatDuration(Number(cfg.windowMs || PUSHPLUS_BATCH_WINDOW_MS));
  const groups = groupPushplusItemsByFriend(items);
  const rows = groups.map(group => {
    const matureText = group.earliest ? new Date(Number(group.earliest)).toLocaleTimeString() : '-';
    const leftText = group.totalFruit ? `${group.totalLeft}/${group.totalFruit}` : '-';
    return `<tr><td>${escapeHtml(group.friendName || group.friendGid || '-')}</td><td>${formatPushplusPlantCounts(group.plantCounts)}</td><td>${escapeHtml(group.landIds.join(', '))}</td><td>${escapeHtml(matureText)}</td><td>${escapeHtml(formatDuration(group.earliest - nowMs))}</td><td>${escapeHtml(`${group.count}块 · ${leftText}`)}</td></tr>`;
  }).join('');
  return `
    <h3>农作物即将成熟</h3>
    <p>时间窗口：${escapeHtml(new Date(nowMs).toLocaleTimeString())} - ${escapeHtml(new Date(endMs).toLocaleTimeString())}</p>
    <p>匹配到 <b>${items.length}</b> 块地，已按好友合并为 <b>${groups.length}</b> 条。当前配置：每 ${escapeHtml(intervalText)} 合并推送一次，推送后续 ${escapeHtml(windowText)} 内成熟的信息。</p>
    <table border="1" cellpadding="6" cellspacing="0">
      <thead><tr><th>好友</th><th>作物</th><th>地块</th><th>最早成熟</th><th>倒计时</th><th>合计</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderPushplusEmptyPreviewMessage(cfg, nowMs = Date.now()) {
  const endMs = nowMs + Number(cfg.windowMs || PUSHPLUS_BATCH_WINDOW_MS);
  const intervalText = formatDuration(Number(cfg.intervalMs || PUSHPLUS_BATCH_INTERVAL_MS));
  const windowText = formatDuration(Number(cfg.windowMs || PUSHPLUS_BATCH_WINDOW_MS));
  return `
    <h3>农作物即将成熟</h3>
    <p>时间窗口：${escapeHtml(new Date(nowMs).toLocaleTimeString())} - ${escapeHtml(new Date(endMs).toLocaleTimeString())}</p>
    <p>当前配置下，推送窗口内没有即将成熟的作物。</p>
    <p>当前配置：每 ${escapeHtml(intervalText)} 合并推送一次，推送后续 ${escapeHtml(windowText)} 内成熟的信息。</p>
  `;
}

function buildPushplusPreview(cfg, nowMs = Date.now()) {
  const items = listUpcomingPushplusItems(cfg, nowMs).map(item => ({
    ...item,
    matureAtText: new Date(item.matureAt).toLocaleString(),
    countdown: formatDuration(item.matureAt - nowMs),
  }));
  const groups = groupPushplusItemsByFriend(items);
  const content = items.length ? renderPushplusBatchMessage(items, cfg, nowMs) : renderPushplusEmptyPreviewMessage(cfg, nowMs);
  return { items, groups, content, nowMs };
}

async function runPushplusBatchNotification({ force = false } = {}) {
  const cfg = readPushplusConfig({ includeToken: true });
  if (!cfg.enabled || !cfg.token) return { skipped: true, reason: 'disabled or token empty' };
  const nowMs = Date.now();
  if (!force && cfg.lastSentAt && nowMs - Number(cfg.lastSentAt) < Number(cfg.intervalMs || PUSHPLUS_BATCH_INTERVAL_MS)) {
    return { skipped: true, reason: 'interval not reached' };
  }
  const items = listUpcomingPushplusItems(cfg, nowMs);
  if (!items.length) return { skipped: true, reason: 'no upcoming items', items: [] };
  const groups = groupPushplusItemsByFriend(items);
  const content = renderPushplusBatchMessage(items, cfg, nowMs);
  const result = await pushplus.sendPushPlus({
    token: cfg.token,
    channel: cfg.channel || 'wechat',
    title: `农作物即将成熟（${groups.length}好友/${items.length}块）`,
    content,
    template: 'html',
  });
  cfg.lastSentAt = nowMs;
  writePushplusConfig(cfg);
  farmDb.addLog('info', `PushPlus 合并推送 ${groups.length} 个好友/${items.length} 块地提醒`, { friendCount: groups.length, count: items.length });
  return { ok: true, result, friendCount: groups.length, count: items.length };
}

function connectFarmParseStream() {
  const streamUrl = new URL('/api/stream', FARM_PARSE_BASE_URL);
  const transport = streamUrl.protocol === 'https:' ? https : http;
  let buffer = '';
  const req = transport.get(streamUrl, res => {
    state.streamConnected = true;
    state.streamRetryCount = 0;
    console.log(`[maturity] 已连接 farm-parse 事件流: ${streamUrl}`);
    res.setEncoding('utf8');
    res.on('data', chunk => {
      buffer += chunk;
      let idx;
      while ((idx = buffer.indexOf('\n\n')) >= 0) {
        const block = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        const dataText = block.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).join('\n');
        if (!dataText) continue;
        try { handleFarmEvent(JSON.parse(dataText)); } catch (error) { console.warn('[maturity] SSE 数据解析失败:', error.message); }
      }
    });
    res.on('end', () => reconnectStream('end'));
  });
  req.on('error', error => reconnectStream(error.message));
  req.setTimeout(60000, () => req.destroy(new Error('stream timeout')));
}

function reconnectStream(reason) {
  if (state.streamConnected) console.warn(`[maturity] farm-parse 事件流断开: ${reason}`);
  state.streamConnected = false;
  state.streamRetryCount += 1;
  const delay = Math.min(30000, 1000 + state.streamRetryCount * 2000);
  setTimeout(connectFarmParseStream, delay);
}

function handleFarmEvent(event) {
  if (!event || !event.lands || !event.friendInfo || event.isOwnFarm) return;
  const result = farmDb.upsertFarmEvent(event);
  if (!result) return;
  state.lastEventAt = Date.now();
  state.lastPersistedFriend = result.friend;
  console.log(`[maturity] 更新好友 ${result.friend.name}(${result.friend.gid}) 土地 ${result.lands} 块`);
}

function schedulerTick() {
  if (!state.schedulerEnabled) return;
  try {
    if (farmDb.hasOpenCommand()) return;
    const nowMs = Date.now();
    const task = farmDb.getSchedulerTask();
    if (task) {
      const untilMs = Number(task.mature_at) - nowMs;
      const basePayload = {
        taskId: task.id,
        friendGid: String(task.friend_gid),
        friendName: task.friend_name || '',
        landId: Number(task.land_id),
        plantId: Number(task.plant_id || 0),
        plantName: task.plant_name || '',
        matureAt: Number(task.mature_at),
        matureAtText: new Date(Number(task.mature_at)).toLocaleString(),
      };
      if (untilMs <= HARVEST_LOOP_BEFORE_MS && task.status !== 'harvesting') {
        farmDb.enqueueCommand('harvest_loop', { ...basePayload, mode: 'countdown_harvest', humanLike: true, stayOnFarm: true, clickUntilMs: Math.max(75000, HARVEST_LOOP_BEFORE_MS + 20000), clickIntervalMinMs: 900, clickIntervalMaxMs: 1800 });
        farmDb.setTaskStatus(task.id, 'harvesting');
        farmDb.addLog('info', `排队连续点击收取: ${task.friend_name || task.friend_gid} 土地#${task.land_id}`, basePayload);
        notifyFarm('农场开始摘取', basePayload, '成熟前最后一分钟，视觉程序开始连续点击收取坐标。');
        return;
      }
      if (untilMs <= PRECHECK_BEFORE_MS && task.status === 'pending') {
        farmDb.enqueueCommand('visit_friend', { ...basePayload, mode: 'precheck_before_mature', humanLike: true, stayOnFarm: true, note: `提前 ${formatDuration(PRECHECK_BEFORE_MS)} 访问，等待抓包刷新成熟时间，不执行催熟。` });
        farmDb.setTaskStatus(task.id, 'armed');
        farmDb.addLog('info', `排队提前访问好友: ${task.friend_name || task.friend_gid}，距成熟 ${formatDuration(untilMs)}`, basePayload);
        notifyFarm('农场即将成熟', basePayload, `距离成熟约 ${formatDuration(untilMs)}，将提前访问好友并等待抓包校准。`);
        return;
      }
    }
    const rescan = farmDb.getRescanFriend(nowMs);
    if (rescan) {
      farmDb.enqueueCommand('visit_friend', { friendGid: String(rescan.friend_gid), friendName: rescan.friend_name || '', mode: 'rescan_after_harvest', humanLike: true, stayOnFarm: false, note: '摘取成功后回访，触发抓包刷新新的成熟时间。' });
      farmDb.markFriendRescanQueued(rescan.friend_gid);
      farmDb.addLog('info', `排队回访已摘取好友: ${rescan.friend_name || rescan.friend_gid}`);
    }
  } catch (error) {
    console.warn('[maturity] 调度失败:', error.message);
  }
}

function proxyToFarmParse(req, res) {
  const target = new URL(req.originalUrl || req.url, FARM_PARSE_BASE_URL);
  const transport = target.protocol === 'https:' ? https : http;
  const headers = { ...req.headers, host: target.host };
  delete headers['content-length'];
  const proxyReq = transport.request(target, { method: req.method, headers }, proxyRes => {
    res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
    proxyRes.pipe(res);
  });
  proxyReq.on('error', error => {
    if (!res.headersSent) res.status(502).json({ message: `farm-parse 后端不可用: ${error.message}` });
    else res.end();
  });
  req.pipe(proxyReq);
}

function sendProxyHtmlWithFixes(res) {
  const file = path.join(__dirname, 'proxy.html');
  let html = fs.readFileSync(file, 'utf8');
  const scriptTag = '<script src="/js/proxy-page-fixes.js"></script>';
  if (!html.includes(scriptTag)) html = html.replace('</body>', `  ${scriptTag}\n</body>`);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
}

function startHttpServer() {
  const app = express();

  app.use('/api/maturity', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    if (req.method === 'OPTIONS') return res.status(204).end();
    next();
  });
  app.use('/api/maturity', express.json({ limit: '1mb' }));

  app.get('/api/maturity/status', (_, res) => {
    const cfg = readPushplusConfig();
    res.json({
      ...state,
      uptimeMs: Date.now() - state.startedAt,
      farmParseBaseUrl: FARM_PARSE_BASE_URL,
      unifiedPort: HTTP_PORT,
      notify: { pushplus: cfg.enabled && cfg.tokenSet, pushplusConfig: cfg },
      scheduler: { enabled: state.schedulerEnabled, precheckBeforeMs: PRECHECK_BEFORE_MS, harvestLoopBeforeMs: HARVEST_LOOP_BEFORE_MS, intervalMs: SCHEDULER_INTERVAL_MS },
    });
  });
  app.post('/api/maturity/scheduler/toggle', (req, res) => { state.schedulerEnabled = req.body?.enabled === true; res.json({ enabled: state.schedulerEnabled }); });
  app.get('/api/maturity/friends', (_, res) => {
    const nowMs = Date.now();
    const rows = farmDb.listFriends(nowMs).map(friend => {
      const lands = farmDb.listFriendLands(friend.gid);
      const maturePickableTotal = lands.filter(land => isMaturePickable(land, nowMs)).length;
      return { ...friend, stealable_total: maturePickableTotal, mature_pickable_total: maturePickableTotal };
    });
    res.json(rows);
  });
  app.get('/api/maturity/friends/:gid', (req, res) => {
    const friend = farmDb.getFriend(req.params.gid);
    if (!friend) return res.status(404).json({ message: 'friend not found' });
    farmDb.run('UPDATE friends SET last_seen_at = ? WHERE gid = ?', [Date.now(), req.params.gid]);
    farmDb.save();
    res.json({ friend, lands: farmDb.listFriendLands(req.params.gid), profile: farmDb.getProfile(req.params.gid) });
  });
  app.get('/api/maturity/friends/:gid/lands', (req, res) => res.json(farmDb.listFriendLands(req.params.gid)));
  app.get('/api/maturity/tasks', (req, res) => res.json(farmDb.listTasks({ status: req.query.status || 'active', limit: req.query.limit || 200 })));
  app.post('/api/maturity/tasks/:id/mark', (req, res) => res.json(farmDb.markTask(req.params.id, req.body?.status || 'harvested', req.body?.message || '')));
  app.get('/api/maturity/commands/next', (req, res) => res.json(farmDb.claimNextCommand(req.query.worker || 'visual-helper') || { idle: true }));
  app.post('/api/maturity/commands/:id/complete', (req, res) => {
    const status = req.body?.status || 'done';
    const result = req.body?.result || {};
    const command = farmDb.completeCommand(req.params.id, status, result);
    const payload = safeJson(command?.payload_json, {});
    if (payload.taskId && payload.mode === 'countdown_harvest') {
      farmDb.markTask(payload.taskId, status === 'done' ? 'harvested' : 'failed', result.message || 'visual helper completed');
      notifyFarm(status === 'done' ? '农场摘取完成' : '农场摘取失败', payload, result.message || (status === 'done' ? '视觉程序已完成摘取流程。' : '视觉程序报告失败，请人工检查。'));
    }
    res.json({ command });
  });
  app.get('/api/maturity/profiles/:gid', (req, res) => res.json(farmDb.getProfile(req.params.gid) || {}));
  app.post('/api/maturity/profiles/:gid', (req, res) => res.json(farmDb.saveProfile(req.params.gid, req.body || {})));
  app.post('/api/maturity/logs', (req, res) => { farmDb.addLog(req.body?.level || 'info', req.body?.message || '', req.body?.payload || {}); res.json({ ok: true }); });
  app.get('/api/maturity/logs', (req, res) => res.json(farmDb.listLogs(req.query.limit || 100)));
  app.post('/api/maturity/cleanup', (_, res) => {
    const removed = farmDb.cleanupExpiredFriends(Date.now());
    res.json({ removed });
  });

  app.get('/api/maturity/pushplus/config', (_, res) => res.json(readPushplusConfig()));
  app.post('/api/maturity/pushplus/config', (req, res) => res.json(savePushplusConfig(req.body || {})));
  app.get('/api/maturity/pushplus/preview', (_, res) => {
    const cfg = readPushplusConfig({ includeToken: true });
    const preview = buildPushplusPreview(cfg);
    res.json({ items: preview.items, count: preview.items.length, groups: preview.groups, config: readPushplusConfig() });
  });
  app.post('/api/maturity/pushplus/test', async (_, res) => {
    try {
      const cfg = readPushplusConfig({ includeToken: true });
      if (!cfg.token) return res.status(400).json({ message: 'PushPlus token 为空，请先保存 token' });
      const preview = buildPushplusPreview(cfg);
      const title = preview.items.length
        ? `农作物即将成熟测试（${preview.groups.length}好友/${preview.items.length}块）`
        : '农作物即将成熟测试（暂无匹配）';
      const result = await pushplus.sendPushPlus({ token: cfg.token, channel: cfg.channel, title, content: preview.content, template: 'html' });
      res.json({ ok: true, result, count: preview.items.length, friendCount: preview.groups.length });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/', (_, res) => res.sendFile(path.join(__dirname, 'index.html')));
  app.get('/proxy.html', (_, res) => sendProxyHtmlWithFixes(res));
  app.use(express.static(__dirname));

  app.use((req, res, next) => {
    if (req.path.startsWith('/api/') || /^\/ca\.(pem|cer|crt)$/.test(req.path)) return proxyToFarmParse(req, res);
    next();
  });

  app.listen(HTTP_PORT, '0.0.0.0', () => {
    const cfg = readPushplusConfig();
    console.log('========================================');
    console.log('Farm Parse 统一入口已启动');
    console.log(`主页: http://127.0.0.1:${HTTP_PORT}/`);
    console.log(`成熟时间页: http://127.0.0.1:${HTTP_PORT}/maturity.html`);
    console.log(`内部 farm-parse: ${FARM_PARSE_BASE_URL}`);
    console.log(`PushPlus 合并推送: ${cfg.enabled && cfg.tokenSet ? '已启用' : '未启用，进入成熟时间页配置'}`);
    console.log('========================================');
  });
}

async function main() {
  await farmDb.init();
  startHttpServer();
  connectFarmParseStream();
  setInterval(schedulerTick, SCHEDULER_INTERVAL_MS);
  setTimeout(() => runPushplusBatchNotification().catch(error => console.warn('[maturity] PushPlus 合并推送失败:', error.message)), 10000);
  setInterval(() => runPushplusBatchNotification().catch(error => console.warn('[maturity] PushPlus 合并推送失败:', error.message)), 60000);
}

main().catch(error => {
  console.error('[maturity] 启动失败:', error);
  process.exit(1);
});
