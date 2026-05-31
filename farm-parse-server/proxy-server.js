const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const express = require('express');
const protobuf = require('protobufjs');
const { Proxy } = require('http-mitm-proxy');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const HTTP_PORT = Number(process.env.FARM_PARSE_HTTP_PORT || 80);
const PORT_POOL_START = Number(process.env.FARM_PARSE_PORT_START || 8788);
const PORT_POOL_END = Number(process.env.FARM_PARSE_PORT_END || 8808);
const TARGET_HOST = 'gate-obt.nqf.qq.com';
const TARGET_PATH_PREFIX = '/prod/ws';
const TENCENT_PUBLIC_IP_URL = 'http://metadata.tencentyun.com/latest/meta-data/public-ipv4';
const CERT_DIR = path.join(__dirname, 'proxy-certs');
const CA_FILE = path.join(CERT_DIR, 'certs', 'ca.pem');
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'farm-parse-secret-' + Date.now() + '-' + Math.random().toString(36).slice(2);
const JWT_EXPIRES = '24h';

// ==================== 用户管理模块 ====================

function loadUsers() {
    try {
        if (fs.existsSync(USERS_FILE)) {
            return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('读取用户文件失败:', e.message);
    }
    return [];
}

function saveUsers(users) {
    const dir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

function findUser(users, field, value) {
    return users.find(function(u) { return u[field] === value; });
}

async function initAdmin() {
    var users = loadUsers();
    var admin = findUser(users, 'username', 'admin');
    if (admin) {
        console.log('管理员账号已存在');
        return;
    }
    var hash = await bcrypt.hash('217817', 10);
    users.push({
        id: 1,
        username: 'admin',
        password: hash,
        role: 'admin',
        enabled: true,
        createdAt: new Date().toISOString()
    });
    saveUsers(users);
    console.log('========================================');
    console.log('管理员账号已创建');
    console.log('  用户名: admin');
    console.log('  密码: 217817');
    console.log('========================================');
}

function getNextId(users) {
    var maxId = 0;
    for (var i = 0; i < users.length; i++) {
        if (users[i].id > maxId) maxId = users[i].id;
    }
    return maxId + 1;
}

// ==================== 端口管理器 ====================

var AVAILABLE_PORTS = [];
for (var i = PORT_POOL_START; i <= PORT_POOL_END; i++) {
    AVAILABLE_PORTS.push(i);
}

var state = {
    startedAt: new Date().toISOString(),
    protoReady: false,
    totalFrames: 0,
    parsedFrames: 0,
    userClients: {},
    userEvents: {},
    userStats: {},
    proxyHost: process.env.FARM_PARSE_PUBLIC_HOST || '',
    availablePorts: AVAILABLE_PORTS.slice(),
    portAllocMap: {},
    userPortMap: {},
    proxyInstances: {}
};

function allocatePort(userId) {
    // 如果已分配，直接返回
    if (state.userPortMap[userId]) return state.userPortMap[userId];
    if (state.availablePorts.length === 0) return null;
    var port = state.availablePorts.shift();
    state.portAllocMap[port] = userId;
    state.userPortMap[userId] = port;
    return port;
}

function releasePort(userId) {
    var port = state.userPortMap[userId];
    if (!port) return;
    var proxy = state.proxyInstances[port];
    if (proxy) {
        try { proxy.close(); } catch (e) {}
        delete state.proxyInstances[port];
    }
    delete state.portAllocMap[port];
    delete state.userPortMap[userId];
    state.availablePorts.push(port);
    state.availablePorts.sort(function(a, b) { return a - b; });
}

function getUserStats(userId) {
    if (!state.userStats[userId]) {
        state.userStats[userId] = { totalFrames: 0, parsedFrames: 0 };
    }
    return state.userStats[userId];
}

function publishForUser(userId, event) {
    try {
        if (!state.userEvents[userId]) state.userEvents[userId] = [];
        state.userEvents[userId].unshift(event);
        state.userEvents[userId] = state.userEvents[userId].slice(0, 50);
        var clients = state.userClients[userId];
        if (clients) {
            var payload = 'data: ' + JSON.stringify(event) + '\n\n';
            clients.forEach(function(res) {
                try { res.write(payload); } catch (_) {}
            });
        }
    } catch (e) {
        console.error('publishForUser error:', e);
    }
}

// ==================== JWT 中间件 ====================

function authMiddleware(req, res, next) {
    var authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: '未登录或 token 缺失' });
    }
    var token = authHeader.slice(7);
    try {
        var decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (e) {
        return res.status(401).json({ error: 'token 无效或已过期' });
    }
}

function adminMiddleware(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: '需要管理员权限' });
    }
    next();
}

// ==================== 原始解析逻辑 ====================

var protoTypes = null;
var plantConfig = [];

var MUTATION_TYPE_MAP = {
    1: { name: '冰冻', icon: '❄️', class: 'mutant-ice' },
    2: { name: '爱心', icon: '❤️', class: 'mutant-love' },
    3: { name: '暗化', icon: '🌑', class: 'mutant-dark' },
    4: { name: '湿润', icon: '💧', class: 'mutant-wet' },
    5: { name: '黄金', icon: '✨', class: 'mutant-gold' },
    6: { name: '哈哈', icon: '🎃', class: 'mutant-pumpkin' },
    7: { name: '塔塔', icon: '🏰', class: 'mutant-tower' },
    10: { name: '绵绵', icon: '☁️', class: 'mutant-mianmian' },
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
    return plantConfig.find(function(item) { return Number(item.id) === Number(id); });
}

function getPlantName(id) {
    var p = getPlantById(id);
    return p ? p.name : '未知(' + id + ')';
}

function getMutantTypeById(id) {
    var value = Number(id);
    var middle3 = Math.floor(value / 100) % 1000;
    var middle2 = Math.floor(value / 100) % 100;
    return MUTATION_TYPE_MAP[value] || MUTATION_TYPE_MAP[middle3] || MUTATION_TYPE_MAP[middle2] || { name: '变异', icon: '✨', class: 'mutant-gold' };
}

function normalizeBasicInfo(basic) {
    if (!basic) return null;
    return {
        gid: String(toNumber(basic.gid)),
        name: basic.name || '未知',
        avatar: String(toNumber(basic.avatar)),
        level: toNumber(basic.level),
        gold: toNumber(basic.gold),
        diamond: toNumber(basic.diamond),
        landCount: toNumber(basic.landCount || basic.land_count)
    };
}

function getLocalAddresses() {
    var addresses = [];
    var nets = os.networkInterfaces();
    for (var name in nets) {
        var items = nets[name] || [];
        for (var i = 0; i < items.length; i++) {
            if (items[i].family === 'IPv4' && !items[i].internal) {
                addresses.push(items[i].address);
            }
        }
    }
    return addresses;
}

function isIPv4(value) {
    return /^\d{1,3}(\.\d{1,3}){3}$/.test(String(value || '').trim());
}

function fetchText(url, timeoutMs) {
    return new Promise(function(resolve) {
        var req = http.get(url, function(res) {
            var chunks = [];
            res.setEncoding('utf8');
            res.on('data', function(chunk) { chunks.push(chunk); });
            res.on('end', function() {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(chunks.join('').trim());
                } else {
                    resolve('');
                }
            });
        });
        req.setTimeout(timeoutMs, function() {
            req.destroy();
            resolve('');
        });
        req.on('error', function() { resolve(''); });
    });
}

async function resolveProxyHost() {
    if (state.proxyHost) return state.proxyHost;
    var publicIp = await fetchText(TENCENT_PUBLIC_IP_URL, 1200);
    if (isIPv4(publicIp)) {
        state.proxyHost = publicIp;
        return state.proxyHost;
    }
    var addresses = getLocalAddresses();
    state.proxyHost = addresses[0] || '127.0.0.1';
    return state.proxyHost;
}

async function loadProto() {
    var protoFiles = [
        'game.proto', 'corepb.proto', 'friendpb.proto', 'itempb.proto',
        'notifypb.proto', 'plantpb.proto', 'shoppb.proto', 'taskpb.proto',
        'userpb.proto', 'visitpb.proto'
    ].map(function(file) { return path.join(__dirname, 'proto', file); });

    var root = await protobuf.load(protoFiles);
    protoTypes = {
        GateMessage: root.lookupType('gatepb.Message'),
        EnterReply: root.lookupType('gamepb.visitpb.EnterReply'),
        AllLandsReply: root.lookupType('gamepb.plantpb.AllLandsReply')
    };

    var plantFile = path.join(__dirname, 'data', 'Plant.json');
    if (fs.existsSync(plantFile)) {
        plantConfig = JSON.parse(fs.readFileSync(plantFile, 'utf8'));
    }
    state.protoReady = true;
}

function normalizeLand(land) {
    var plant = land.plant || null;
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
            phases: (plant.phases || []).map(function(phase) {
                return {
                    phase: toNumber(phase.phase),
                    mutants: (phase.mutants || []).map(function(mutant) {
                        return {
                            mutantTime: toNumber(getField(mutant, 'mutant_time', 'mutantTime', 0)),
                            mutantConfigId: toNumber(getField(mutant, 'mutant_config_id', 'mutantConfigId', 0)),
                            weatherId: toNumber(getField(mutant, 'weather_id', 'weatherId', 0))
                        };
                    })
                };
            })
        } : null
    };
}

function extractMutants(lands) {
    var mutants = [];
    for (var i = 0; i < lands.length; i++) {
        var land = lands[i];
        if (!land.plant) continue;
        var details = [];
        var ids = land.plant.mutantConfigIds || [];
        for (var j = 0; j < ids.length; j++) {
            var typeInfo = getMutantTypeById(ids[j]);
            details.push({
                configId: ids[j],
                name: getPlantName(ids[j]),
                type: typeInfo.name,
                typeIcon: typeInfo.icon,
                typeClass: typeInfo.class
            });
        }
        var phases = land.plant.phases || [];
        for (var k = 0; k < phases.length; k++) {
            var mlist = phases[k].mutants || [];
            for (var m = 0; m < mlist.length; m++) {
                var item = mlist[m];
                if (!item.mutantConfigId) continue;
                var exists = false;
                for (var d = 0; d < details.length; d++) {
                    if (details[d].configId === item.mutantConfigId) { exists = true; break; }
                }
                if (exists) continue;
                var typeInfo2 = getMutantTypeById(item.mutantConfigId);
                details.push({
                    configId: item.mutantConfigId,
                    name: getPlantName(item.mutantConfigId),
                    type: typeInfo2.name,
                    typeIcon: typeInfo2.icon,
                    typeClass: typeInfo2.class,
                    phase: phases[k].phase,
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
                details: details,
                primaryType: details[0].type || '变异',
                primaryIcon: details[0].typeIcon || '✨',
                primaryClass: details[0].typeClass || 'mutant-gold'
            });
        }
    }
    return mutants;
}

function decodeFarmData(meta, body) {
    var serviceName = meta.serviceName || '';
    var methodName = meta.methodName || '';
    if (serviceName.indexOf('VisitService') >= 0 && methodName.indexOf('Enter') >= 0) {
        var reply = protoTypes.EnterReply.decode(body);
        var lands = (reply.lands || []).map(normalizeLand);
        if (lands.length === 0) return null;
        return { type: 'friend', lands: lands, friendInfo: normalizeBasicInfo(reply.basic) };
    }
    if (serviceName.indexOf('PlantService') >= 0 && methodName.indexOf('AllLands') >= 0) {
        var reply2 = protoTypes.AllLandsReply.decode(body);
        var lands2 = (reply2.lands || []).map(normalizeLand);
        if (lands2.length === 0) return null;
        return { type: 'self', lands: lands2, friendInfo: null };
    }
    return null;
}

function parseFarmFrame(message) {
    if (!protoTypes || !message) return null;
    var buffer = Buffer.isBuffer(message) ? message : Buffer.from(message);
    if (buffer.length === 0) return null;
    var gate = protoTypes.GateMessage.decode(buffer);
    var meta = gate.meta || {};
    var normalizedMeta = {
        serviceName: meta.serviceName || meta.service_name || '',
        methodName: meta.methodName || meta.method_name || '',
        messageType: toNumber(meta.messageType || meta.message_type),
        clientSeq: toNumber(meta.clientSeq || meta.client_seq),
        serverSeq: toNumber(meta.serverSeq || meta.server_seq),
        errorCode: toNumber(meta.errorCode || meta.error_code)
    };
    if (!gate.body || gate.body.length === 0) return null;
    var farmData = decodeFarmData(normalizedMeta, gate.body);
    if (!farmData) return null;
    var mutants = extractMutants(farmData.lands);
    if (farmData.lands.length === 0) return null;
    return {
        id: Date.now() + '-' + Math.random().toString(16).slice(2),
        time: new Date().toISOString(),
        meta: normalizedMeta,
        lands: farmData.lands,
        landCount: farmData.lands.length,
        mutantCount: mutants.length,
        mutants: mutants,
        type: farmData.type,
        friendInfo: farmData.friendInfo
    };
}

// ==================== 代理服务器（按用户分配端口） ====================

function isTargetWebSocket(ctx) {
    var req = ctx.clientToProxyWebSocket ? ctx.clientToProxyWebSocket.upgradeReq : null;
    var host = String(req ? (req.headers.host || '') : '').split(':')[0];
    var url = String(req ? (req.url || '') : '');
    return host === TARGET_HOST && url.indexOf(TARGET_PATH_PREFIX) === 0;
}

function startUserProxy(userId, port) {
    var proxy = new Proxy();
    proxy.onError(function(ctx, err, kind) {
        if (ctx && ctx.farmParseTarget) {
            var event = {
                id: Date.now() + '-error',
                time: new Date().toISOString(),
                type: 'error',
                message: (kind || 'proxy') + ': ' + err.message
            };
            publishForUser(userId, event);
        }
    });
    proxy.onWebSocketConnection(function(ctx, callback) {
        ctx.farmParseTarget = isTargetWebSocket(ctx);
        callback();
    });
    proxy.onWebSocketMessage(function(ctx, message, flags, callback) {
        if (ctx && ctx.farmParseTarget) {
            state.totalFrames += 1;
            var userStats = getUserStats(userId);
            userStats.totalFrames += 1;
            try {
                var event = parseFarmFrame(message);
                if (event) {
                    state.parsedFrames += 1;
                    userStats.parsedFrames += 1;
                    publishForUser(userId, event);
                }
            } catch (_) {}
        }
        callback(null, message, flags);
    });

    proxy.listen({
        host: '0.0.0.0',
        port: port,
        sslCaDir: CERT_DIR
    }, function() {
        // 代理启动成功
    });
    state.proxyInstances[port] = proxy;
}

// ==================== HTTP 服务器 ====================

function startHttp() {
    var app = express();
    app.use(express.json());
    app.use(express.static(__dirname));

    // 登录
    app.post('/api/login', async function(req, res) {
        var body = req.body || {};
        var username = body.username;
        var password = body.password;
        if (!username || !password) {
            return res.status(400).json({ error: '用户名和密码不能为空' });
        }
        var users = loadUsers();
        var user = findUser(users, 'username', username);
        if (!user) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }
        if (!user.enabled) {
            return res.status(403).json({ error: '账号已被禁用，请联系管理员' });
        }
        var valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }
        var token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES }
        );
        // 分配专属代理端口
        var port = allocatePort(user.id);
        if (!port) {
            return res.status(503).json({ error: '服务器端口已满，请稍后再试' });
        }
        if (!state.proxyInstances[port]) {
            startUserProxy(user.id, port);
        }
        res.json({
            token: token,
            user: { id: user.id, username: user.username, role: user.role },
            proxyPort: port,
            proxyHost: state.proxyHost
        });
    });

    // 注册（开放注册，需管理员审核）
    app.post('/api/register', async function(req, res) {
        var body = req.body || {};
        var username = body.username;
        var password = body.password;
        if (!username || !password) {
            return res.status(400).json({ error: '用户名和密码不能为空' });
        }
        if (username.length < 2 || username.length > 20) {
            return res.status(400).json({ error: '用户名长度需在2-20字符之间' });
        }
        if (password.length < 4) {
            return res.status(400).json({ error: '密码长度至少4位' });
        }
        var users = loadUsers();
        if (findUser(users, 'username', username)) {
            return res.status(409).json({ error: '用户名已存在' });
        }
        if (users.length >= 20) {
            return res.status(403).json({ error: '用户数已达上限（20人）' });
        }
        var hash = await bcrypt.hash(password, 10);
        users.push({
            id: getNextId(users),
            username: username,
            password: hash,
            role: 'user',
            enabled: false,
            createdAt: new Date().toISOString()
        });
        saveUsers(users);
        res.json({ message: '注册成功，等待管理员审核' });
    });

    // 获取当前用户信息
    app.get('/api/me', authMiddleware, function(req, res) {
        var users = loadUsers();
        var user = findUser(users, 'id', req.user.id);
        if (!user) return res.status(404).json({ error: '用户不存在' });
        res.json({
            id: user.id,
            username: user.username,
            role: user.role,
            enabled: user.enabled,
            createdAt: user.createdAt,
            proxyPort: state.userPortMap[user.id] || null,
            proxyHost: state.proxyHost
        });
    });

    // SSE 流（需认证，支持 query token 用于 EventSource）
    app.get('/api/stream', function(req, res) {
        var queryToken = req.query && req.query.token;
        var authHeader = req.headers.authorization;
        var token = null;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.slice(7);
        } else if (queryToken) {
            token = queryToken;
        }
        if (!token) {
            res.status(401).json({ error: '未登录或 token 缺失' });
            return;
        }
        try {
            var decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
        } catch (e) {
            res.status(401).json({ error: 'token 无效或已过期' });
            return;
        }
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });
        var userId = req.user.id;
        // 检查用户是否仍存在且启用
        var checkUser = function() {
            var users = loadUsers();
            var u = findUser(users, 'id', userId);
            if (!u || !u.enabled) {
                res.end();
                return false;
            }
            return true;
        };
        if (!checkUser()) return;
        if (!state.userClients[userId]) {
            state.userClients[userId] = new Set();
        }
        state.userClients[userId].add(res);
        res.write('data: ' + JSON.stringify({
            type: 'hello',
            time: new Date().toISOString(),
            proxyPort: state.userPortMap[userId],
            proxyHost: state.proxyHost
        }) + '\n\n');
        // 发送历史事件
        var events = state.userEvents[userId] || [];
        for (var i = events.length - 1; i >= 0; i--) {
            res.write('data: ' + JSON.stringify(events[i]) + '\n\n');
        }
        // 定期检查用户状态（每 10 秒）
        var checkInterval = setInterval(function() {
            if (!checkUser()) {
                clearInterval(checkInterval);
            }
        }, 10000);
        req.on('close', function() {
            clearInterval(checkInterval);
            if (state.userClients[userId]) {
                state.userClients[userId].delete(res);
                if (state.userClients[userId].size === 0) {
                    delete state.userClients[userId];
                }
            }
        });
    });

    // 状态 API（需认证）
    app.get('/api/status', authMiddleware, function(req, res) {
        var totalClients = 0;
        for (var uid in state.userClients) {
            totalClients += state.userClients[uid].size;
        }
        var userStats = getUserStats(req.user.id);
        res.json({
            startedAt: state.startedAt,
            protoReady: state.protoReady,
            totalFrames: userStats.totalFrames,
            parsedFrames: userStats.parsedFrames,
            clients: totalClients,
            certReady: fs.existsSync(CA_FILE),
            caPath: CA_FILE,
            httpPort: HTTP_PORT,
            proxyPort: state.userPortMap[req.user.id] || 0,
            proxyHost: state.proxyHost,
            target: 'wss://' + TARGET_HOST + TARGET_PATH_PREFIX + '?',
            addresses: getLocalAddresses()
        });
    });

    // 获取用户事件列表
    app.get('/api/events', authMiddleware, function(req, res) {
        var events = state.userEvents[req.user.id] || [];
        res.json(events);
    });

    // 证书下载
    function sendCaCertificate(res, filename) {
        var possiblePaths = [
            CA_FILE,
            path.join(CERT_DIR, 'ca.pem'),
            path.join(CERT_DIR, 'certs', 'ca.pem'),
            path.join(__dirname, 'proxy-certs', 'ca.pem')
        ];
        var certPath = null;
        for (var i = 0; i < possiblePaths.length; i++) {
            if (fs.existsSync(possiblePaths[i])) {
                certPath = possiblePaths[i];
                break;
            }
        }
        if (!certPath) {
            res.status(404).send('CA certificate has not been generated yet. Please login once to start a proxy port, then retry.');
            return;
        }
        res.setHeader('Content-Type', 'application/x-x509-ca-cert');
        res.download(certPath, filename);
    }
    app.get('/ca.pem', function(_, res) { sendCaCertificate(res, 'farm-parse-ca.pem'); });
    app.get('/ca.cer', function(_, res) { sendCaCertificate(res, 'farm-parse-ca.cer'); });
    app.get('/ca.crt', function(_, res) { sendCaCertificate(res, 'farm-parse-ca.crt'); });

    // --- 管理员 API ---
    app.get('/api/admin/users', authMiddleware, adminMiddleware, function(req, res) {
        var users = loadUsers();
        var list = users.map(function(u) {
            return {
                id: u.id,
                username: u.username,
                role: u.role,
                enabled: u.enabled,
                createdAt: u.createdAt,
                proxyPort: state.userPortMap[u.id] || null
            };
        });
        res.json(list);
    });

    app.post('/api/admin/users', authMiddleware, adminMiddleware, async function(req, res) {
        var body = req.body || {};
        var username = body.username;
        var password = body.password;
        if (!username || !password) {
            return res.status(400).json({ error: '用户名和密码不能为空' });
        }
        var users = loadUsers();
        if (findUser(users, 'username', username)) {
            return res.status(409).json({ error: '用户名已存在' });
        }
        if (users.length >= 20) {
            return res.status(403).json({ error: '用户数已达上限（20人）' });
        }
        var hash = await bcrypt.hash(password, 10);
        users.push({
            id: getNextId(users),
            username: username,
            password: hash,
            role: 'user',
            enabled: true,
            createdAt: new Date().toISOString()
        });
        saveUsers(users);
        res.json({ message: '用户创建成功', username: username });
    });

    // 强制关闭用户的所有 SSE 连接
    function closeUserSse(userId) {
        var clients = state.userClients[userId];
        if (clients) {
            clients.forEach(function(res) {
                try { res.end(); } catch (_) {}
            });
        }
        delete state.userClients[userId];
    }

    app.patch('/api/admin/users/:id/toggle', authMiddleware, adminMiddleware, function(req, res) {
        var userId = parseInt(req.params.id);
        if (userId === 1) return res.status(400).json({ error: '不能禁用管理员账号' });
        var users = loadUsers();
        var user = findUser(users, 'id', userId);
        if (!user) return res.status(404).json({ error: '用户不存在' });
        user.enabled = !user.enabled;
        saveUsers(users);
        if (!user.enabled) {
            releasePort(userId);
            closeUserSse(userId);
            delete state.userEvents[userId];
            delete state.userStats[userId];
        }
        res.json({ message: '用户' + (user.enabled ? '已启用' : '已禁用'), enabled: user.enabled, username: user.username });
    });

    app.delete('/api/admin/users/:id', authMiddleware, adminMiddleware, function(req, res) {
        var userId = parseInt(req.params.id);
        if (userId === 1) return res.status(400).json({ error: '不能删除管理员账号' });
        var users = loadUsers();
        var user = findUser(users, 'id', userId);
        if (!user) return res.status(404).json({ error: '用户不存在' });
        users = users.filter(function(u) { return u.id !== userId; });
        saveUsers(users);
        releasePort(userId);
        closeUserSse(userId);
        delete state.userEvents[userId];
        delete state.userStats[userId];
        res.json({ message: '用户已删除', username: user.username });
    });

    app.get('/', function(_, res) {
        res.redirect('/proxy.html');
    });

    app.listen(HTTP_PORT, '0.0.0.0', function() {
        console.log('HTTP server: http://0.0.0.0:' + HTTP_PORT);
    });
}

// ==================== 主函数 ====================

async function main() {
    await initAdmin();
    await resolveProxyHost();
    await loadProto();
    startHttp();
    console.log('========================================');
    console.log('HTTP 页面:   http://0.0.0.0:' + HTTP_PORT + '/proxy.html');
    console.log('公网地址:    ' + state.proxyHost);
    console.log('代理端口池:  ' + PORT_POOL_START + ' ~ ' + PORT_POOL_END);
    console.log('管理面板:   http://0.0.0.0:' + HTTP_PORT + '/admin.html');
    console.log('========================================');
}

main().catch(function(err) {
    console.error('启动失败:', err);
    process.exit(1);
});
