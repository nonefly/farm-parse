const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const { execFile, execSync } = require('child_process');
const readline = require('readline');
const express = require('express');
const protobuf = require('protobufjs');
const { Proxy } = require('http-mitm-proxy');

const HTTP_PORT = Number(process.env.FARM_PARSE_HTTP_PORT || 8787);
const PROXY_PORT = Number(process.env.FARM_PARSE_PROXY_PORT || 8788);
const TARGET_HOST = 'gate-obt.nqf.qq.com';
const TARGET_PATH_PREFIX = '/prod/ws';
const AUTH_LIST_URL = 'https://gitee.com/zy_nonefly/docs/raw/master/farm-auth';
const IS_PACKAGED = Boolean(process.pkg);
const MACHINE_CODE_SALT = 'farm-parse-machine-v1';
const APP_DATA_DIR = IS_PACKAGED ? path.join(os.homedir(), '.farm-parse') : path.join(__dirname, '.farm-parse');
const CERT_DIR = path.join(APP_DATA_DIR, 'proxy-certs');
const CA_FILE = path.join(CERT_DIR, 'certs', 'ca.pem');

const state = {
    startedAt: new Date().toISOString(),
    protoReady: false,
    proxyReady: false,
    targetConnections: 0,
    totalFrames: 0,
    parsedFrames: 0,
    currentUser: null,
    events: [],
    clients: new Set(),
    authorized: !IS_PACKAGED,
    authorizedUser: null,
    authorizedUntil: null,
    proxyEnabled: false,
    originalProxySettings: null
};

function setSystemProxy(enable) {
    try {
        if (enable) {
            const currentSettings = getCurrentProxySettings();
            state.originalProxySettings = currentSettings;
            
            const regPath = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings';
            
            execSync(`reg add "${regPath}" /v ProxyEnable /t REG_DWORD /d 1 /f`);
            execSync(`reg add "${regPath}" /v ProxyServer /t REG_SZ /d "127.0.0.1:${PROXY_PORT}" /f`);
            execSync(`reg add "${regPath}" /v ProxyOverride /t REG_SZ /d "localhost;127.*;10.*;172.16.*;172.17.*;172.18.*;172.19.*;172.20.*;172.21.*;172.22.*;172.23.*;172.24.*;172.25.*;172.26.*;172.27.*;172.28.*;172.29.*;172.30.*;172.31.*;192.168.*;<local>" /f`);
            
            try {
                execSync('netsh winhttp reset proxy');
            } catch (e) {
                console.log('netsh reset proxy failed (may be normal):', e.message);
            }
            try {
                execSync(`netsh winhttp set proxy proxy-server="127.0.0.1:${PROXY_PORT}" bypass-list="${TARGET_HOST};localhost"`);
            } catch (e) {
                console.log('netsh set proxy failed:', e.message);
            }
            
            try {
                execSync(`powershell -Command "Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings' -Name ProxyEnable -Value 1"`);
                execSync(`powershell -Command "Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings' -Name ProxyServer -Value '127.0.0.1:${PROXY_PORT}'"`);
            } catch (e) {
                console.log('powershell proxy settings failed:', e.message);
            }
            
            setTimeout(() => {
                const check = getCurrentProxySettings();
                console.log('Proxy settings after enable:', check);
                if (!check.enable || !check.server.includes(`${PROXY_PORT}`)) {
                    console.log('WARNING: Proxy settings may not have taken effect');
                }
            }, 1000);
            
            return { success: true, message: '系统代理已开启，请确保已安装根证书' };
        } else {
            const regPath = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings';
            
            if (state.originalProxySettings) {
                try {
                    execSync(`reg add "${regPath}" /v ProxyEnable /t REG_DWORD /d ${state.originalProxySettings.enable ? 1 : 0} /f`);
                } catch {}
                if (state.originalProxySettings.server) {
                    try {
                        execSync(`reg add "${regPath}" /v ProxyServer /t REG_SZ /d "${state.originalProxySettings.server}" /f`);
                    } catch {}
                }
                if (state.originalProxySettings.override) {
                    try {
                        execSync(`reg add "${regPath}" /v ProxyOverride /t REG_SZ /d "${state.originalProxySettings.override}" /f`);
                    } catch {}
                }
            } else {
                try {
                    execSync(`reg add "${regPath}" /v ProxyEnable /t REG_DWORD /d 0 /f`);
                } catch {}
            }
            
            try {
                execSync('netsh winhttp reset proxy');
            } catch {}
            
            try {
                execSync(`powershell -Command "Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings' -Name ProxyEnable -Value 0"`);
            } catch {}
            
            return { success: true, message: '系统代理已关闭' };
        }
    } catch (error) {
        return { success: false, message: `代理设置失败: ${error.message}` };
    }
}

function getCurrentProxySettings() {
    const regPath = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings';
    try {
        const enableOutput = execSync(`reg query "${regPath}" /v ProxyEnable 2>&1 || echo ERROR`).toString();
        const serverOutput = execSync(`reg query "${regPath}" /v ProxyServer 2>&1 || echo ERROR`).toString();
        const overrideOutput = execSync(`reg query "${regPath}" /v ProxyOverride 2>&1 || echo ERROR`).toString();
        
        const enableMatch = enableOutput.match(/ProxyEnable\s+REG_DWORD\s+([0-9a-fA-F]+)/);
        const serverMatch = serverOutput.match(/ProxyServer\s+REG_SZ\s+(.+)/);
        const overrideMatch = overrideOutput.match(/ProxyOverride\s+REG_SZ\s+(.+)/);
        
        return {
            enable: enableMatch ? parseInt(enableMatch[1], 16) === 1 : false,
            server: serverMatch ? serverMatch[1].trim() : '',
            override: overrideMatch ? overrideMatch[1].trim() : ''
        };
    } catch {
        return { enable: false, server: '', override: '' };
    }
}

function refreshIEProxy() {
    try {
        execSync('powershell -Command "Start-Process iexplore.exe -ArgumentList \'-k\' -WindowStyle Hidden; Start-Sleep -Milliseconds 500; Get-Process iexplore | Stop-Process -Force"', { timeout: 5000 });
    } catch {
        try {
            execSync('powershell -Command "[System.Net.WebRequest]::DefaultWebProxy = [System.Net.WebProxy]::new()"', { timeout: 3000 });
        } catch {}
    }
}

let protoTypes = null;
let plantConfig = [];
let proxyStarted = false;
let machineInfoCache = null;

const MUTATION_TYPE_MAP = {
    1: { name: '冰冻', icon: '❄️', class: 'mutant-ice' },
    2: { name: '爱心', icon: '❤️', class: 'mutant-love' },
    3: { name: '暗化', icon: '🌑', class: 'mutant-dark' },
    4: { name: '湿润', icon: '💧', class: 'mutant-wet' },
    5: { name: '黄金', icon: '✨', class: 'mutant-gold' },
    6: { name: '哈哈', icon: '🎃', class: 'mutant-pumpkin' },
    7: { name: '塔塔', icon: '🏰', class: 'mutant-tower' },
    55: { name: '水晶', icon: '💎', class: 'mutant-crystal' },
    105: { name: '闪耀', icon: '⭐', class: 'mutant-shine' },
    337: { name: '幸运', icon: '🍀', class: 'mutant-lucky' },
    393: { name: '冰晶', icon: '🔹', class: 'mutant-ice-crystal' },
    402: { name: '沙漠', icon: '🏜️', class: 'mutant-desert' },
    611: { name: '奢华', icon: '👑', class: 'mutant-luxury' },
    671: { name: '落雪', icon: '🌨️', class: 'mutant-snow' }
};

function toNumber(value) {
    if (value == null) return 0;
    if (typeof value === 'number') return value;
    if (typeof value.toNumber === 'function') return value.toNumber();
    return Number(value);
}

function getField(obj, snakeName, camelName, fallback) {
    if (!obj) return fallback;
    if (obj[snakeName] !== undefined) return obj[snakeName];
    if (obj[camelName] !== undefined) return obj[camelName];
    return fallback;
}

function getPlantById(id) {
    return plantConfig.find(item => Number(item.id) === Number(id));
}

function getPlantName(id) {
    return getPlantById(id)?.name || `未知(${id})`;
}

function getMutantTypeById(id) {
    const value = Number(id);
    const middle3 = Math.floor(value / 100) % 1000;
    const middle2 = Math.floor(value / 100) % 100;
    return MUTATION_TYPE_MAP[value] || MUTATION_TYPE_MAP[middle3] || MUTATION_TYPE_MAP[middle2] || { name: '变异', icon: '✨', class: 'mutant-gold' };
}

function normalizeBasicInfo(basic) {
    if (!basic) return null;
    return {
        gid: String(toNumber(basic.gid)),
        name: basic.name || '未知',
        avatar: String(toNumber(basic.avatar)),
        level: 0,
        gold: toNumber(basic.gold),
        diamond: toNumber(basic.diamond),
        landCount: toNumber(basic.landCount ?? basic.land_count)
    };
}

function getLocalAddresses() {
    const addresses = [];
    for (const entries of Object.values(os.networkInterfaces())) {
        for (const item of entries || []) {
            if (item.family === 'IPv4' && !item.internal) {
                addresses.push(item.address);
            }
        }
    }
    return addresses;
}

function normalizeText(value) {
    return String(value ?? '').trim();
}

function normalizeMachineCode(value) {
    return normalizeText(value).replace(/[^0-9a-f]/gi, '').toUpperCase();
}

function execFileText(command, args, timeout = 5000) {
    return new Promise(resolve => {
        execFile(command, args, { windowsHide: true, timeout }, (error, stdout) => {
            resolve(error ? '' : String(stdout || ''));
        });
    });
}

function cleanWmicValue(output, header) {
    return String(output || '')
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line && line.toLowerCase() !== header.toLowerCase())
        .find(Boolean) || '';
}

async function getWmicValue(alias, property) {
    const output = await execFileText('wmic', [alias, 'get', property]);
    return cleanWmicValue(output, property);
}

async function getPowerShellValue(script) {
    const output = await execFileText('powershell.exe', [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        script
    ]);
    return String(output || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean)[0] || '';
}

async function collectMachineInfo() {
    if (machineInfoCache) return machineInfoCache;

    const [boardUuidWmic, diskSerialWmic] = await Promise.all([
        getWmicValue('csproduct', 'UUID'),
        getWmicValue('diskdrive', 'SerialNumber')
    ]);

    const boardUuid = boardUuidWmic || await getPowerShellValue('(Get-CimInstance Win32_ComputerSystemProduct).UUID');
    const diskSerial = diskSerialWmic || await getPowerShellValue('(Get-CimInstance Win32_DiskDrive | Select-Object -First 1 -ExpandProperty SerialNumber)');
    const macs = Object.values(os.networkInterfaces())
        .flat()
        .filter(item => item && !item.internal && item.mac && item.mac !== '00:00:00:00:00:00')
        .map(item => item.mac.toUpperCase())
        .sort();

    const parts = {
        boardUuid: normalizeText(boardUuid).toUpperCase(),
        diskSerial: normalizeText(diskSerial).toUpperCase(),
        macs
    };
    const fingerprint = [
        MACHINE_CODE_SALT,
        parts.boardUuid,
        parts.diskSerial,
        parts.macs.join(',')
    ].join('|');

    machineInfoCache = {
        ...parts,
        machineCode: crypto.createHash('md5').update(fingerprint).digest('hex').toUpperCase()
    };
    return machineInfoCache;
}

function fetchText(url, redirectCount = 0) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, {
            headers: {
                'User-Agent': 'farm-parse-auth/1.0',
                'Cache-Control': 'no-cache'
            },
            timeout: 10000
        }, res => {
            if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirectCount < 5) {
                res.resume();
                resolve(fetchText(new URL(res.headers.location, url).toString(), redirectCount + 1));
                return;
            }
            if (res.statusCode < 200 || res.statusCode >= 300) {
                res.resume();
                reject(new Error(`授权列表读取失败: HTTP ${res.statusCode}`));
                return;
            }
            res.setEncoding('utf8');
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve(body));
        });
        req.on('timeout', () => req.destroy(new Error('授权列表读取超时')));
        req.on('error', reject);
    });
}

function splitAuthLine(line) {
    const trimmed = line.trim();
    if (!trimmed || /^[-|:\s]+$/.test(trimmed)) return null;
    if (trimmed.startsWith('|')) {
        return trimmed.split('|').map(item => item.trim()).filter(Boolean);
    }
    for (const separator of ['\t', ',', '，', '|']) {
        if (trimmed.includes(separator)) {
            return trimmed.split(separator).map(item => item.trim()).filter(Boolean);
        }
    }
    return trimmed.split(/\s{2,}/).map(item => item.trim()).filter(Boolean);
}

function parseExpireDate(value) {
    const text = normalizeText(value);
    let match = text.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日$/);
    if (!match) {
        match = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    }
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day, 23, 59, 59, 999);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    return date;
}

function parseAuthList(text) {
    return String(text || '')
        .split(/\r?\n/)
        .map(splitAuthLine)
        .filter(columns => columns && columns.length >= 3)
        .filter(columns => !/用户|用户名|名称|name/i.test(columns[0]) && !/机器|授权|machine/i.test(columns[1]))
        .map(columns => ({
            username: normalizeText(columns[0]),
            machineCode: normalizeMachineCode(columns[1]),
            expiresAt: parseExpireDate(columns[2]),
            expiresText: normalizeText(columns[2])
        }))
        .filter(item => item.username && item.machineCode && item.expiresAt);
}

async function verifyAuthorization(username, machineCode) {
    const normalizedUser = normalizeText(username);
    const normalizedCode = normalizeMachineCode(machineCode);
    if (!normalizedUser) {
        return { ok: false, message: '请输入用户名。' };
    }
    if (!normalizedCode) {
        return { ok: false, message: '未能生成机器码。' };
    }

    const text = await fetchText(AUTH_LIST_URL);
    const entries = parseAuthList(text);
    const matched = entries.find(item => item.username === normalizedUser && item.machineCode === normalizedCode);
    if (!matched) {
        return { ok: false, message: '授权失败：用户名和机器码未在授权列表中匹配。' };
    }
    if (Date.now() > matched.expiresAt.getTime()) {
        return { ok: false, message: `授权已过期：${matched.expiresText}` };
    }
    return { ok: true, username: matched.username, expiresText: matched.expiresText, expiresAt: matched.expiresAt };
}

async function loadProto() {
    const protoFiles = [
        'game.proto',
        'corepb.proto',
        'friendpb.proto',
        'itempb.proto',
        'notifypb.proto',
        'plantpb.proto',
        'shoppb.proto',
        'taskpb.proto',
        'userpb.proto',
        'visitpb.proto'
    ].map(file => path.join(__dirname, 'proto', file));

    const root = await protobuf.load(protoFiles);
    protoTypes = {
        GateMessage: root.lookupType('gatepb.Message'),
        EnterReply: root.lookupType('gamepb.visitpb.EnterReply')
    };

    const plantFile = path.join(__dirname, 'data', 'Plant.json');
    if (fs.existsSync(plantFile)) {
        plantConfig = JSON.parse(fs.readFileSync(plantFile, 'utf8'));
    }

    state.protoReady = true;
}

function normalizeLand(land) {
    const plant = land.plant || null;
    return {
        id: toNumber(land.id),
        unlocked: Boolean(land.unlocked),
        level: toNumber(land.level),
        plant: plant ? {
            id: toNumber(plant.id),
            name: plant.name || getPlantName(toNumber(plant.id)),
            fruitNum: toNumber(getField(plant, 'fruit_num', 'fruitNum', 0)),
            leftFruitNum: toNumber(getField(plant, 'left_fruit_num', 'leftFruitNum', 0)),
            growSec: toNumber(getField(plant, 'grow_sec', 'growSec', 0)),
            stealable: Boolean(plant.stealable),
            mutantConfigIds: (getField(plant, 'mutant_config_ids', 'mutantConfigIds', []) || []).map(toNumber),
            phases: (plant.phases || []).map(phase => ({
                phase: toNumber(phase.phase),
                mutants: (phase.mutants || []).map(mutant => ({
                    mutantTime: toNumber(getField(mutant, 'mutant_time', 'mutantTime', 0)),
                    mutantConfigId: toNumber(getField(mutant, 'mutant_config_id', 'mutantConfigId', 0)),
                    weatherId: toNumber(getField(mutant, 'weather_id', 'weatherId', 0))
                }))
            }))
        } : null
    };
}

function extractMutants(lands) {
    const mutants = [];
    for (const land of lands) {
        if (!land.plant) continue;

        const details = [];
        for (const id of land.plant.mutantConfigIds || []) {
            const typeInfo = getMutantTypeById(id);
            details.push({
                configId: id,
                name: getPlantName(id),
                type: typeInfo.name,
                typeIcon: typeInfo.icon,
                typeClass: typeInfo.class
            });
        }

        for (const phase of land.plant.phases || []) {
            for (const item of phase.mutants || []) {
                if (!item.mutantConfigId || details.some(detail => detail.configId === item.mutantConfigId)) continue;
                const typeInfo = getMutantTypeById(item.mutantConfigId);
                details.push({
                    configId: item.mutantConfigId,
                    name: getPlantName(item.mutantConfigId),
                    type: typeInfo.name,
                    typeIcon: typeInfo.icon,
                    typeClass: typeInfo.class,
                    phase: phase.phase,
                    weatherId: item.weatherId,
                    mutantTime: item.mutantTime
                });
            }
        }

        if (details.length > 0) {
            mutants.push({
                landId: land.id,
                plantId: land.plant.id,
                plantName: land.plant.name,
                details,
                primaryType: details[0]?.type || '变异',
                primaryIcon: details[0]?.typeIcon || '✨',
                primaryClass: details[0]?.typeClass || 'mutant-gold'
            });
        }
    }
    return mutants;
}

function decodeFarmData(meta, body) {
    const serviceName = meta.serviceName || '';
    const methodName = meta.methodName || '';

    if (!serviceName.includes('VisitService') || !methodName.includes('Enter')) {
        return null;
    }

    const reply = protoTypes.EnterReply.decode(body);
    const lands = (reply.lands || []).map(normalizeLand);
    if (lands.length === 0) return null;

    return {
        lands,
        friendInfo: normalizeBasicInfo(reply.basic),
        currentUser: state.currentUser
    };
}

function parseFarmFrame(message, direction) {
    if (!protoTypes || !message) return null;
    const buffer = Buffer.isBuffer(message) ? message : Buffer.from(message);
    if (buffer.length === 0) return null;

    const gate = protoTypes.GateMessage.decode(buffer);
    const meta = gate.meta || {};
    const normalizedMeta = {
        serviceName: meta.serviceName || meta.service_name || '',
        methodName: meta.methodName || meta.method_name || '',
        messageType: toNumber(meta.messageType ?? meta.message_type),
        clientSeq: toNumber(meta.clientSeq ?? meta.client_seq),
        serverSeq: toNumber(meta.serverSeq ?? meta.server_seq),
        errorCode: toNumber(meta.errorCode ?? meta.error_code)
    };
    if (!gate.body || gate.body.length === 0) return null;

    const farmData = decodeFarmData(normalizedMeta, gate.body);
    if (!farmData) return null;
    const mutants = extractMutants(farmData.lands);
    if (farmData.lands.length === 0) return null;

    return {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        time: new Date().toISOString(),
        direction,
        meta: normalizedMeta,
        currentUser: farmData.currentUser,
        friendInfo: farmData.friendInfo,
        lands: farmData.lands,
        landCount: farmData.lands.length,
        mutantCount: mutants.length,
        mutants
    };
}

function publish(event) {
    state.events.unshift(event);
    state.events = state.events.slice(0, 50);
    const payload = `data: ${JSON.stringify(event)}\n\n`;
    for (const res of state.clients) {
        res.write(payload);
    }
}

function isTargetWebSocket(ctx) {
    const req = ctx.clientToProxyWebSocket?.upgradeReq;
    const host = String(req?.headers?.host || '').split(':')[0];
    const url = String(req?.url || '');
    return host === TARGET_HOST && url.startsWith(TARGET_PATH_PREFIX);
}

function startProxy() {
    if (proxyStarted) return;
    proxyStarted = true;
    const proxy = new Proxy();

    proxy.onError((ctx, err, kind) => {
        if (kind === 'request' || kind === 'websocket') {
            return;
        }
        if (ctx?.farmParseTarget) {
            publish({
                id: `${Date.now()}-error`,
                time: new Date().toISOString(),
                type: 'error',
                message: `${kind || 'proxy'}: ${err.message}`
            });
        }
    });

    proxy.onRequest((ctx, callback) => {
        const host = ctx.clientToProxyRequest.headers.host;
        if (host && host.includes(TARGET_HOST)) {
            ctx.farmParseTarget = true;
        }
        callback();
    });

    proxy.onWebSocketConnection((ctx, callback) => {
        ctx.farmParseTarget = isTargetWebSocket(ctx);
        if (ctx.farmParseTarget) {
            state.targetConnections += 1;
            publish({
                id: `${Date.now()}-connect`,
                time: new Date().toISOString(),
                type: 'connection',
                message: `connected ${TARGET_HOST}${TARGET_PATH_PREFIX}`
            });
        }
        callback();
    });

    proxy.onWebSocketMessage((ctx, message, flags, callback) => {
        if (ctx.farmParseTarget) {
            state.totalFrames += 1;
            try {
                const event = parseFarmFrame(message, 'server');
                if (event) {
                    state.parsedFrames += 1;
                    publish(event);
                }
            } catch (_) {
                // Some frames are heartbeats or unrelated messages.
            }
        }
        callback(null, message, flags);
    });

    proxy.listen({
        host: '127.0.0.1',
        port: PROXY_PORT,
        sslCaDir: CERT_DIR
    }, () => {
        state.proxyReady = true;
        console.log(`代理服务已启动: 127.0.0.1:${PROXY_PORT}`);
        console.log(`目标主机: ${TARGET_HOST}${TARGET_PATH_PREFIX}`);
        console.log(`证书目录: ${CERT_DIR}`);
        console.log('注意：仅目标主机的HTTPS流量会被SSL拦截，其他网站直接透传');
    });
}

function startHttp() {
    const app = express();

    app.use(express.json());

    app.get('/api/machine', async (_, res) => {
        try {
            const info = await collectMachineInfo();
            res.json({
                machineCode: info.machineCode
            });
        } catch (error) {
            res.status(500).json({ message: `机器码生成失败: ${error.message}` });
        }
    });

    app.post('/api/authorize', async (req, res) => {
        if (!IS_PACKAGED) {
            state.authorized = true;
            res.json({ ok: true, redirect: '/proxy.html' });
            return;
        }

        try {
            const info = await collectMachineInfo();
            const result = await verifyAuthorization(req.body?.username, info.machineCode);
            if (!result.ok) {
                res.status(403).json(result);
                return;
            }
            state.authorized = true;
            state.authorizedUser = result.username;
            state.authorizedUntil = result.expiresText;
            startProxy();
            res.json({ 
                ok: true, 
                redirect: '/proxy.html', 
                username: result.username, 
                expiresAt: result.expiresText,
                proxyPort: PROXY_PORT,
                targetHost: TARGET_HOST
            });
        } catch (error) {
            res.status(500).json({ ok: false, message: error.message });
        }
    });

    app.get('/api/auth-status', (_, res) => {
        res.json({
            authorized: state.authorized
        });
    });

    app.post('/api/proxy/toggle', async (req, res) => {
        if (!state.authorized) {
            res.status(403).json({ success: false, message: '请先完成授权' });
            return;
        }

        const enable = req.body?.enable === true;
        
        try {
            if (enable && !proxyStarted) {
                startProxy();
            }
            
            const result = setSystemProxy(enable);
            state.proxyEnabled = result.success && enable;
            
            res.json({
                success: result.success,
                message: result.message,
                proxyEnabled: state.proxyEnabled,
                proxyPort: PROXY_PORT,
                targetHost: TARGET_HOST
            });
        } catch (error) {
            res.json({ success: false, message: `操作失败: ${error.message}` });
        }
    });

    app.get('/api/proxy/status', (_, res) => {
        res.json({
            proxyEnabled: state.proxyEnabled,
            proxyReady: state.proxyReady,
            proxyPort: PROXY_PORT,
            targetHost: TARGET_HOST
        });
    });

    if (IS_PACKAGED) {
        app.use((req, res, next) => {
            const allowed = req.path === '/auth.html'
                || req.path === '/api/machine'
                || req.path === '/api/authorize'
                || req.path === '/api/auth-status';
            if (state.authorized || allowed) {
                next();
                return;
            }
            if (req.path.startsWith('/api/')) {
                res.status(401).json({ message: '请先完成授权。' });
                return;
            }
            res.redirect('/auth.html');
        });
    }

    app.use(express.static(__dirname));

    app.get('/', (_, res) => {
        res.redirect(IS_PACKAGED && !state.authorized ? '/auth.html' : '/proxy.html');
    });

    app.get('/api/status', (_, res) => {
        res.json({
            ...state,
            clients: state.clients.size,
            certReady: fs.existsSync(CA_FILE),
            caPath: CA_FILE,
            httpPort: HTTP_PORT,
            proxyPort: PROXY_PORT,
            target: `wss://${TARGET_HOST}${TARGET_PATH_PREFIX}?`,
            addresses: getLocalAddresses()
        });
    });

    app.get('/api/events', (_, res) => {
        res.json(state.events);
    });

    app.get('/api/stream', (req, res) => {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive'
        });
        res.write(`data: ${JSON.stringify({ type: 'hello', time: new Date().toISOString() })}\n\n`);
        state.clients.add(res);
        req.on('close', () => state.clients.delete(res));
    });

    function sendCaCertificate(res, filename) {
        const possiblePaths = [
            CA_FILE,
            path.join(CERT_DIR, 'ca.pem'),
            path.join(CERT_DIR, 'certs', 'ca.pem'),
            path.join(CERT_DIR, '../ca.pem')
        ];
        
        let certPath = null;
        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                certPath = p;
                break;
            }
        }
        
        if (!certPath) {
            res.status(503).send('证书正在生成中，请先开启代理后重试...');
            return;
        }
        
        try {
            const certContent = fs.readFileSync(certPath);
            res.setHeader('Content-Type', 'application/x-x509-ca-cert');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(certContent);
        } catch (error) {
            res.status(500).send(`证书读取失败: ${error.message}`);
        }
    }

    app.get('/ca.pem', (_, res) => sendCaCertificate(res, 'farm-parse-ca.pem'));
    app.get('/ca.cer', (_, res) => sendCaCertificate(res, 'farm-parse-ca.cer'));
    app.get('/ca.crt', (_, res) => sendCaCertificate(res, 'farm-parse-ca.crt'));

    app.listen(HTTP_PORT, '0.0.0.0', () => {
        const addresses = getLocalAddresses();
        const authUrl = IS_PACKAGED ? '/auth.html' : '/proxy.html';
        console.log('');
        console.log('========================================');
        console.log('Farm Parse 服务已启动');
        console.log('========================================');
        console.log(`本地访问: http://127.0.0.1:${HTTP_PORT}${authUrl}`);
        for (const address of addresses) {
            console.log(`局域网访问: http://${address}:${HTTP_PORT}${authUrl}`);
        }
        console.log('========================================');
        console.log('');
    });

}

async function main() {
    if (!fs.existsSync(APP_DATA_DIR)) {
        fs.mkdirSync(APP_DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(CERT_DIR)) {
        fs.mkdirSync(CERT_DIR, { recursive: true });
    }
    
    console.log(`应用数据目录: ${APP_DATA_DIR}`);
    console.log(`证书目录: ${CERT_DIR}`);
    
    await loadProto();
    startHttp();
    if (!IS_PACKAGED) {
        startProxy();
    }
    if (IS_PACKAGED) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        rl.on('close', () => {
            process.exit(0);
        });
        process.on('SIGINT', () => {
            rl.close();
        });
    }
}

main().catch(() => {
    process.exit(1);
});
