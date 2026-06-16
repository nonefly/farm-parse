const { app, BrowserWindow, Menu, Notification, Tray, nativeImage, shell } = require('electron');
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const APP_NAME = 'Farm Parse';
const PUBLIC_PORT = process.env.FARM_PARSE_HTTP_PORT || '8787';
const HOME_URL = `http://127.0.0.1:${PUBLIC_PORT}/maturity.html`;
const STATUS_URL = `http://127.0.0.1:${PUBLIC_PORT}/api/maturity/status`;
const PREVIEW_URL = `http://127.0.0.1:${PUBLIC_PORT}/api/maturity/pushplus/preview`;

let mainWindow = null;
let tray = null;
let backendProcess = null;
let isQuitting = false;
let lastDesktopNotifyAt = 0;
let desktopNotifyTimer = null;

app.setName(APP_NAME);

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

app.on('second-instance', () => {
  showMainWindow();
});

function createTrayIcon() {
  const svg = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <rect width="32" height="32" rx="8" fill="#16a34a"/>
      <path d="M8 20c8-1 13-6 16-14 2 10-2 18-12 19-2 .2-3-.4-4-5z" fill="#dcfce7"/>
      <path d="M9 21c4-3 8-6 14-12" stroke="#166534" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `);
  return nativeImage.createFromDataURL(`data:image/svg+xml;charset=UTF-8,${svg}`);
}

function startBackend() {
  if (backendProcess) return;
  const script = path.join(__dirname, 'start-all.js');
  backendProcess = spawn(process.execPath, [script], {
    cwd: __dirname,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      FARM_PARSE_HTTP_PORT: PUBLIC_PORT,
      FARM_DESKTOP_MODE: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  backendProcess.stdout.on('data', data => process.stdout.write(`[backend] ${data}`));
  backendProcess.stderr.on('data', data => process.stderr.write(`[backend] ${data}`));
  backendProcess.on('exit', (code, signal) => {
    backendProcess = null;
    if (!isQuitting) {
      console.error(`[desktop] 后端进程退出 code=${code ?? '-'} signal=${signal ?? '-'}`);
      showDesktopNotification('Farm Parse 后端已退出', '请退出后重新打开程序。');
    }
  });
}

function stopBackend() {
  if (!backendProcess) return;
  const child = backendProcess;
  backendProcess = null;
  if (!child.killed) child.kill('SIGTERM');
}

function httpGetJson(url, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) return reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        try { resolve(JSON.parse(body || '{}')); } catch (error) { reject(error); }
      });
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => req.destroy(new Error('request timeout')));
  });
}

async function waitForBackend(timeoutMs = 30000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      await httpGetJson(STATUS_URL, 1500);
      return true;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 600));
    }
  }
  return false;
}

function createWindow() {
  if (mainWindow) return mainWindow;
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 860,
    minWidth: 980,
    minHeight: 640,
    title: APP_NAME,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(HOME_URL);
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.on('close', event => {
    if (isQuitting) return;
    event.preventDefault();
    mainWindow.hide();
    showDesktopNotification('Farm Parse 仍在运行', '窗口已隐藏到托盘，成熟提醒会继续工作。');
  });
  mainWindow.on('closed', () => { mainWindow = null; });
  return mainWindow;
}

function showMainWindow() {
  if (!mainWindow) createWindow();
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function createTray() {
  if (tray) return;
  tray = new Tray(createTrayIcon());
  tray.setToolTip(`${APP_NAME} - 手动启动，托盘运行`);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '打开成熟时间页', click: showMainWindow },
    { label: '发送桌面测试通知', click: () => showDesktopNotification('Farm Parse 桌面提醒测试', '系统通知可用，后续会按配置提醒即将成熟的作物。') },
    { type: 'separator' },
    { label: '退出', click: () => quitApp() },
  ]));
  tray.on('double-click', showMainWindow);
}

function showDesktopNotification(title, body) {
  if (!Notification.isSupported()) return;
  const notification = new Notification({ title, body, silent: false });
  notification.on('click', showMainWindow);
  notification.show();
}

function formatTime(ms) {
  if (!ms) return '-';
  const d = new Date(Number(ms));
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function groupItemsByFriend(items) {
  const groups = new Map();
  for (const item of items || []) {
    const key = item.friendGid || item.friendName || 'unknown';
    if (!groups.has(key)) {
      groups.set(key, { friendName: item.friendName || item.friendGid || '-', plantCounts: new Map(), landIds: [], earliest: Number(item.matureAt || 0), count: 0 });
    }
    const group = groups.get(key);
    const plantName = item.plantName || String(item.plantId || '未知作物');
    group.plantCounts.set(plantName, (group.plantCounts.get(plantName) || 0) + 1);
    group.landIds.push(`#${item.landId}`);
    group.count += 1;
    const matureAt = Number(item.matureAt || 0);
    if (matureAt && (!group.earliest || matureAt < group.earliest)) group.earliest = matureAt;
  }
  return [...groups.values()].sort((a, b) => a.earliest - b.earliest || String(a.friendName).localeCompare(String(b.friendName), 'zh-CN'));
}

function formatPlantCounts(plantCounts) {
  return [...plantCounts.entries()]
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), 'zh-CN'))
    .map(([name, count]) => `${name}${count > 1 ? `×${count}` : ''}`)
    .join('、');
}

async function checkDesktopNotifications({ force = false } = {}) {
  try {
    const data = await httpGetJson(PREVIEW_URL, 5000);
    const items = data.items || [];
    if (!items.length) return;
    const cfg = data.config || {};
    const intervalMs = Number(cfg.intervalMs || (Number(cfg.intervalMinutes || 30) * 60000) || 30 * 60000);
    const now = Date.now();
    if (!force && lastDesktopNotifyAt && now - lastDesktopNotifyAt < intervalMs) return;
    const groups = groupItemsByFriend(items);
    const previewLines = groups.slice(0, 5).map(group => {
      const plants = formatPlantCounts(group.plantCounts);
      return `${group.friendName}：${plants}，${group.count}块，最早${formatTime(group.earliest)}`;
    });
    const more = groups.length > 5 ? `\n还有 ${groups.length - 5} 个好友...` : '';
    showDesktopNotification(`农作物即将成熟（${groups.length}好友/${items.length}块）`, `${previewLines.join('\n')}${more}`);
    lastDesktopNotifyAt = now;
  } catch (error) {
    console.warn('[desktop] 桌面提醒检查失败:', error.message);
  }
}

function startDesktopNotifier() {
  if (desktopNotifyTimer) return;
  setTimeout(() => checkDesktopNotifications().catch(() => {}), 15000);
  desktopNotifyTimer = setInterval(() => checkDesktopNotifications().catch(() => {}), 60000);
}

function quitApp() {
  isQuitting = true;
  if (desktopNotifyTimer) clearInterval(desktopNotifyTimer);
  stopBackend();
  app.quit();
}

app.whenReady().then(async () => {
  startBackend();
  createTray();
  await waitForBackend();
  createWindow();
  startDesktopNotifier();
});

app.on('activate', showMainWindow);
app.on('before-quit', () => { isQuitting = true; });
app.on('will-quit', stopBackend);
