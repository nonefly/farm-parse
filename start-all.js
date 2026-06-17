#!/usr/bin/env node

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const processes = [];
let shuttingDown = false;

const PUBLIC_HTTP_PORT = process.env.FARM_PARSE_HTTP_PORT || '8787';
const INTERNAL_HTTP_PORT = process.env.FARM_PARSE_INTERNAL_HTTP_PORT || '8791';
const INTERNAL_BASE_URL = `http://127.0.0.1:${INTERNAL_HTTP_PORT}`;
const IS_PACKAGED = Boolean(process.pkg);

function start(name, script, env = {}) {
  const child = spawn(process.execPath, [path.join(__dirname, script)], {
    cwd: __dirname,
    stdio: ['inherit', 'pipe', 'pipe'],
    env: { ...process.env, ...env }
  });
  processes.push({ name, child });
  child.stdout.on('data', data => prefixOutput(name, data, false));
  child.stderr.on('data', data => prefixOutput(name, data, true));
  child.on('error', error => {
    if (shuttingDown) return;
    console.error(`[${name}] 启动失败: ${error.message}`);
    shutdown(1);
  });
  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    console.error(`[${name}] 已退出 code=${code ?? '-'} signal=${signal ?? '-'}`);
    shutdown(code || 1);
  });
  return child;
}

function prefixOutput(name, data, isError) {
  const text = String(data || '');
  for (const line of text.split(/\r?\n/)) {
    if (!line) continue;
    const output = `[${name}] ${line}\n`;
    if (isError) process.stderr.write(output);
    else process.stdout.write(output);
  }
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const item of processes) {
    if (!item.child.killed) item.child.kill('SIGTERM');
  }
  setTimeout(() => process.exit(exitCode), 800);
}

function requestInternalAuthStatus(timeoutMs = 1200) {
  return new Promise(resolve => {
    const req = http.get(`${INTERNAL_BASE_URL}/api/auth-status`, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          resolve(Boolean(JSON.parse(body || '{}').authorized));
        } catch {
          resolve(false);
        }
      });
    });
    req.on('error', () => resolve(false));
    req.setTimeout(timeoutMs, () => req.destroy());
  });
}

function installUnifiedAuthGate() {
  const expressPath = require.resolve('express');
  const originalExpress = require(expressPath);
  const authCache = { at: 0, authorized: false };
  const authApiPaths = new Set(['/api/machine', '/api/authorize', '/api/auth-status']);

  function isPublicPath(reqPath) {
    if (reqPath === '/auth.html' || reqPath === '/favicon.ico') return true;
    if (authApiPaths.has(reqPath)) return true;
    if (/^\/ca\.(pem|cer|crt)$/.test(reqPath)) return true;
    if (reqPath.startsWith('/js/') || reqPath.startsWith('/img/')) return true;
    return false;
  }

  async function isAuthorized() {
    const now = Date.now();
    if (now - authCache.at < 1200) return authCache.authorized;
    authCache.authorized = await requestInternalAuthStatus();
    authCache.at = now;
    return authCache.authorized;
  }

  function wrappedExpress(...args) {
    const app = originalExpress(...args);
    app.use(async (req, res, next) => {
      if (!process.pkg || process.env.FARM_UNIFIED_AUTH !== '1') return next();
      if (isPublicPath(req.path)) return next();
      if (await isAuthorized()) return next();
      if (req.path.startsWith('/api/')) return res.status(401).json({ message: '请先完成授权。' });
      return res.redirect('/auth.html');
    });
    return app;
  }

  Object.setPrototypeOf(wrappedExpress, originalExpress);
  Object.assign(wrappedExpress, originalExpress);
  require.cache[expressPath].exports = wrappedExpress;
}

function startBundledServices() {
  process.env.FARM_PARSE_HTTP_PORT = INTERNAL_HTTP_PORT;
  require('./proxy-server.js');

  process.env.FARM_MATURITY_PORT = PUBLIC_HTTP_PORT;
  process.env.FARM_PARSE_BASE_URL = INTERNAL_BASE_URL;
  process.env.FARM_UNIFIED_AUTH = '1';
  installUnifiedAuthGate();
  require('./maturity-server.js');
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

console.log('========================================');
console.log('Farm Parse 一体启动');
console.log(`统一主页: http://127.0.0.1:${PUBLIC_HTTP_PORT}/`);
console.log(`内部解析服务: ${INTERNAL_BASE_URL}`);
console.log('========================================');

if (IS_PACKAGED) {
  startBundledServices();
} else {
  start('proxy', 'proxy-server.js', {
    FARM_PARSE_HTTP_PORT: INTERNAL_HTTP_PORT
  });

  start('maturity', 'maturity-server.js', {
    FARM_MATURITY_PORT: PUBLIC_HTTP_PORT,
    FARM_PARSE_BASE_URL: INTERNAL_BASE_URL
  });
}
