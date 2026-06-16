#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const processes = [];
let shuttingDown = false;

function start(name, script, env = {}) {
  const child = spawn(process.execPath, [path.join(__dirname, script)], {
    cwd: __dirname,
    stdio: ['inherit', 'pipe', 'pipe'],
    env: { ...process.env, ...env }
  });

  processes.push({ name, child });

  child.stdout.on('data', data => prefixOutput(name, data, false));
  child.stderr.on('data', data => prefixOutput(name, data, true));

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
    if (!item.child.killed) {
      item.child.kill(process.platform === 'win32' ? 'SIGTERM' : 'SIGTERM');
    }
  }
  setTimeout(() => process.exit(exitCode), 800);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

console.log('========================================');
console.log('Farm Parse 一体启动');
console.log('主页: http://127.0.0.1:8787/');
console.log('成熟时间页: http://127.0.0.1:8790/maturity.html');
console.log('========================================');

start('proxy', 'proxy-server.js');
start('maturity', 'maturity-server.js', {
  FARM_PARSE_BASE_URL: process.env.FARM_PARSE_BASE_URL || 'http://127.0.0.1:8787'
});
