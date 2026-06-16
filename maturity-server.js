#!/usr/bin/env node

const http = require('http');
const https = require('https');
const path = require('path');
const express = require('express');
const farmDb = require('./lib/farm-db');
const { formatDuration } = require('./lib/maturity');

const HTTP_PORT = Number(process.env.FARM_MATURITY_PORT || 8790);
const FARM_PARSE_BASE_URL = process.env.FARM_PARSE_BASE_URL || 'http://127.0.0.1:8787';
const PRECHECK_BEFORE_MS = Number(process.env.FARM_PRECHECK_BEFORE_MS || 5 * 60 * 1000);
const HARVEST_LOOP_BEFORE_MS = Number(process.env.FARM_HARVEST_LOOP_BEFORE_MS || 60 * 1000);
const SCHEDULER_INTERVAL_MS = Number(process.env.FARM_SCHEDULER_INTERVAL_MS || 5000);

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
        const dataText = block.split(/\r?\n/)
          .filter(line => line.startsWith('data:'))
          .map(line => line.slice(5).trim())
          .join('\n');
        if (!dataText) continue;
        try {
          const event = JSON.parse(dataText);
          handleFarmEvent(event);
        } catch (error) {
          console.warn('[maturity] SSE 数据解析失败:', error.message);
        }
      }
    });
    res.on('end', () => reconnectStream('end'));
  });

  req.on('error', error => reconnectStream(error.message));
  req.setTimeout(60000, () => {
    req.destroy(new Error('stream timeout'));
  });
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
        farmDb.enqueueCommand('harvest_loop', {
          ...basePayload,
          mode: 'countdown_harvest',
          humanLike: true,
          stayOnFarm: true,
          clickUntilMs: Math.max(75000, HARVEST_LOOP_BEFORE_MS + 20000),
          clickIntervalMinMs: 900,
          clickIntervalMaxMs: 1800,
        });
        farmDb.setTaskStatus(task.id, 'harvesting');
        farmDb.addLog('info', `排队连续点击收取: ${task.friend_name || task.friend_gid} 土地#${task.land_id}`, basePayload);
        return;
      }

      if (untilMs <= PRECHECK_BEFORE_MS && task.status === 'pending') {
        farmDb.enqueueCommand('visit_friend', {
          ...basePayload,
          mode: 'precheck_before_mature',
          humanLike: true,
          stayOnFarm: true,
          note: `提前 ${formatDuration(PRECHECK_BEFORE_MS)} 访问，等待抓包刷新成熟时间，不执行催熟。`,
        });
        farmDb.setTaskStatus(task.id, 'armed');
        farmDb.addLog('info', `排队提前访问好友: ${task.friend_name || task.friend_gid}，距成熟 ${formatDuration(untilMs)}`, basePayload);
        return;
      }
    }

    const rescan = farmDb.getRescanFriend(nowMs);
    if (rescan) {
      farmDb.enqueueCommand('visit_friend', {
        friendGid: String(rescan.friend_gid),
        friendName: rescan.friend_name || '',
        mode: 'rescan_after_harvest',
        humanLike: true,
        stayOnFarm: false,
        note: '摘取成功后回访，触发抓包刷新新的成熟时间。',
      });
      farmDb.markFriendRescanQueued(rescan.friend_gid);
      farmDb.addLog('info', `排队回访已摘取好友: ${rescan.friend_name || rescan.friend_gid}`);
    }
  } catch (error) {
    console.warn('[maturity] 调度失败:', error.message);
  }
}

function startHttpServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/', (_, res) => res.redirect('/maturity.html'));
  app.get('/maturity.html', (_, res) => res.sendFile(path.join(__dirname, 'maturity.html')));

  app.get('/api/maturity/status', (_, res) => {
    res.json({
      ...state,
      uptimeMs: Date.now() - state.startedAt,
      farmParseBaseUrl: FARM_PARSE_BASE_URL,
      scheduler: {
        enabled: state.schedulerEnabled,
        precheckBeforeMs: PRECHECK_BEFORE_MS,
        harvestLoopBeforeMs: HARVEST_LOOP_BEFORE_MS,
        intervalMs: SCHEDULER_INTERVAL_MS,
      },
    });
  });

  app.post('/api/maturity/scheduler/toggle', (req, res) => {
    state.schedulerEnabled = req.body?.enabled === true;
    res.json({ enabled: state.schedulerEnabled });
  });

  app.get('/api/maturity/friends', (_, res) => {
    res.json(farmDb.listFriends());
  });

  app.get('/api/maturity/friends/:gid', (req, res) => {
    const friend = farmDb.getFriend(req.params.gid);
    if (!friend) return res.status(404).json({ message: 'friend not found' });
    res.json({ friend, lands: farmDb.listFriendLands(req.params.gid), profile: farmDb.getProfile(req.params.gid) });
  });

  app.get('/api/maturity/friends/:gid/lands', (req, res) => {
    res.json(farmDb.listFriendLands(req.params.gid));
  });

  app.get('/api/maturity/tasks', (req, res) => {
    res.json(farmDb.listTasks({ status: req.query.status || 'active', limit: req.query.limit || 200 }));
  });

  app.post('/api/maturity/tasks/:id/mark', (req, res) => {
    const status = req.body?.status || 'harvested';
    const message = req.body?.message || '';
    res.json(farmDb.markTask(req.params.id, status, message));
  });

  app.get('/api/maturity/commands/next', (req, res) => {
    const worker = req.query.worker || 'visual-helper';
    const command = farmDb.claimNextCommand(worker);
    res.json(command || { idle: true });
  });

  app.post('/api/maturity/commands/:id/complete', (req, res) => {
    const before = farmDb.listTasks({ status: 'harvesting', limit: 1000 });
    const status = req.body?.status || 'done';
    const result = req.body?.result || {};
    const command = farmDb.completeCommand(req.params.id, status, result);

    const payload = safeJson(command?.payload_json, {});
    if (payload.taskId && payload.mode === 'countdown_harvest') {
      if (status === 'done') {
        farmDb.markTask(payload.taskId, 'harvested', result.message || 'visual helper completed harvest loop');
      } else {
        farmDb.markTask(payload.taskId, 'failed', result.message || 'visual helper reported failure');
      }
    }

    res.json({ command, previousHarvesting: before.length });
  });

  app.get('/api/maturity/profiles/:gid', (req, res) => {
    res.json(farmDb.getProfile(req.params.gid) || {});
  });

  app.post('/api/maturity/profiles/:gid', (req, res) => {
    res.json(farmDb.saveProfile(req.params.gid, req.body || {}));
  });

  app.post('/api/maturity/logs', (req, res) => {
    farmDb.addLog(req.body?.level || 'info', req.body?.message || '', req.body?.payload || {});
    res.json({ ok: true });
  });

  app.get('/api/maturity/logs', (req, res) => {
    res.json(farmDb.listLogs(req.query.limit || 100));
  });

  app.listen(HTTP_PORT, '0.0.0.0', () => {
    console.log('========================================');
    console.log('Farm Maturity 服务已启动');
    console.log(`页面: http://127.0.0.1:${HTTP_PORT}/maturity.html`);
    console.log(`读取 farm-parse: ${FARM_PARSE_BASE_URL}/api/stream`);
    console.log('========================================');
  });
}

async function main() {
  await farmDb.init();
  startHttpServer();
  connectFarmParseStream();
  setInterval(schedulerTick, SCHEDULER_INTERVAL_MS);
}

main().catch(error => {
  console.error('[maturity] 启动失败:', error);
  process.exit(1);
});
