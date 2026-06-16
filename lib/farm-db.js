const fs = require('fs');
const os = require('os');
const path = require('path');
const initSqlJs = require('sql.js');
const { normalizeFarmEvent } = require('./maturity');

let SQL = null;
let db = null;
let dbPath = null;

function defaultDataDir() {
  return process.pkg ? path.join(os.homedir(), '.farm-parse') : path.join(__dirname, '..', '.farm-parse');
}

async function init(options = {}) {
  if (db) return db;
  const appDataDir = options.appDataDir || defaultDataDir();
  if (!fs.existsSync(appDataDir)) fs.mkdirSync(appDataDir, { recursive: true });
  dbPath = options.dbPath || path.join(appDataDir, 'farm-maturity.db');

  SQL = await initSqlJs({
    locateFile(file) {
      return path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', file);
    }
  });

  if (fs.existsSync(dbPath)) {
    db = new SQL.Database(fs.readFileSync(dbPath));
  } else {
    db = new SQL.Database();
  }
  migrate();
  save();
  return db;
}

function ensureReady() {
  if (!db) throw new Error('database is not initialized');
}

function save() {
  ensureReady();
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
}

function run(sql, params = []) {
  ensureReady();
  db.run(sql, params);
}

function queryAll(sql, params = []) {
  ensureReady();
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  try {
    while (stmt.step()) rows.push(stmt.getAsObject());
  } finally {
    stmt.free();
  }
  return rows;
}

function queryOne(sql, params = []) {
  return queryAll(sql, params)[0] || null;
}

function migrate() {
  ensureReady();
  db.run(`
    CREATE TABLE IF NOT EXISTS friends (
      gid TEXT PRIMARY KEY,
      name TEXT DEFAULT '',
      avatar TEXT DEFAULT '',
      level INTEGER DEFAULT 0,
      land_count INTEGER DEFAULT 0,
      first_seen_at INTEGER DEFAULT 0,
      last_seen_at INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS friend_lands (
      friend_gid TEXT NOT NULL,
      land_id INTEGER NOT NULL,
      unlocked INTEGER DEFAULT 0,
      has_plant INTEGER DEFAULT 0,
      plant_id INTEGER DEFAULT 0,
      plant_name TEXT DEFAULT '',
      phase INTEGER DEFAULT 0,
      phase_name TEXT DEFAULT '',
      mature_at INTEGER DEFAULT 0,
      stealable INTEGER DEFAULT 0,
      fruit_num INTEGER DEFAULT 0,
      left_fruit_num INTEGER DEFAULT 0,
      grow_sec INTEGER DEFAULT 0,
      mutant_summary TEXT DEFAULT '',
      raw_json TEXT DEFAULT '',
      updated_at INTEGER DEFAULT 0,
      PRIMARY KEY(friend_gid, land_id)
    );

    CREATE TABLE IF NOT EXISTS harvest_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      friend_gid TEXT NOT NULL,
      land_id INTEGER NOT NULL,
      plant_id INTEGER DEFAULT 0,
      plant_name TEXT DEFAULT '',
      mature_at INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      last_error TEXT DEFAULT '',
      needs_rescan INTEGER DEFAULT 0,
      rescan_after INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT 0,
      updated_at INTEGER DEFAULT 0,
      harvested_at INTEGER DEFAULT 0,
      UNIQUE(friend_gid, land_id, plant_id, mature_at)
    );

    CREATE TABLE IF NOT EXISTS automation_profiles (
      friend_gid TEXT PRIMARY KEY,
      profile_json TEXT NOT NULL,
      updated_at INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS automation_commands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      worker TEXT DEFAULT '',
      result_json TEXT DEFAULT '',
      created_at INTEGER DEFAULT 0,
      claimed_at INTEGER DEFAULT 0,
      completed_at INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS automation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT DEFAULT 'info',
      message TEXT DEFAULT '',
      payload_json TEXT DEFAULT '',
      created_at INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_friend_lands_mature ON friend_lands(mature_at);
    CREATE INDEX IF NOT EXISTS idx_tasks_status_mature ON harvest_tasks(status, mature_at);
    CREATE INDEX IF NOT EXISTS idx_tasks_rescan ON harvest_tasks(needs_rescan, rescan_after);
    CREATE INDEX IF NOT EXISTS idx_commands_status ON automation_commands(status, created_at);
  `);
}

function withWrite(fn) {
  ensureReady();
  db.run('BEGIN TRANSACTION');
  try {
    const result = fn();
    db.run('COMMIT');
    save();
    return result;
  } catch (error) {
    try { db.run('ROLLBACK'); } catch {}
    throw error;
  }
}

function upsertFarmEvent(event) {
  const nowMs = Date.now();
  const normalized = normalizeFarmEvent(event, nowMs);
  if (!normalized) return null;

  return withWrite(() => {
    const { friend, lands, capturedAtMs } = normalized;
    run(`
      INSERT INTO friends (gid, name, avatar, level, land_count, first_seen_at, last_seen_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(gid) DO UPDATE SET
        name = excluded.name,
        avatar = excluded.avatar,
        level = excluded.level,
        land_count = excluded.land_count,
        last_seen_at = excluded.last_seen_at
    `, [friend.gid, friend.name, friend.avatar, friend.level, friend.landCount, capturedAtMs, capturedAtMs]);

    for (const land of lands) {
      run(`
        INSERT INTO friend_lands (
          friend_gid, land_id, unlocked, has_plant, plant_id, plant_name, phase, phase_name,
          mature_at, stealable, fruit_num, left_fruit_num, grow_sec, mutant_summary, raw_json, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(friend_gid, land_id) DO UPDATE SET
          unlocked = excluded.unlocked,
          has_plant = excluded.has_plant,
          plant_id = excluded.plant_id,
          plant_name = excluded.plant_name,
          phase = excluded.phase,
          phase_name = excluded.phase_name,
          mature_at = excluded.mature_at,
          stealable = excluded.stealable,
          fruit_num = excluded.fruit_num,
          left_fruit_num = excluded.left_fruit_num,
          grow_sec = excluded.grow_sec,
          mutant_summary = excluded.mutant_summary,
          raw_json = excluded.raw_json,
          updated_at = excluded.updated_at
      `, [
        friend.gid,
        land.landId,
        land.unlocked ? 1 : 0,
        land.hasPlant ? 1 : 0,
        land.plantId,
        land.plantName,
        land.phase,
        land.phaseName,
        land.matureAtMs || 0,
        land.stealable ? 1 : 0,
        land.fruitNum,
        land.leftFruitNum,
        land.growSec,
        land.mutantSummary,
        land.raw,
        capturedAtMs,
      ]);

      run(`
        UPDATE harvest_tasks
        SET status = 'outdated', updated_at = ?
        WHERE friend_gid = ? AND land_id = ? AND status IN ('pending', 'armed', 'harvesting') AND mature_at <> ?
      `, [nowMs, friend.gid, land.landId, land.matureAtMs || 0]);

      if (land.hasPlant && land.matureAtMs > 0 && land.phase !== 7) {
        run(`
          INSERT OR IGNORE INTO harvest_tasks (
            friend_gid, land_id, plant_id, plant_name, mature_at, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
        `, [friend.gid, land.landId, land.plantId, land.plantName, land.matureAtMs, nowMs, nowMs]);
      }
    }

    return { friend, lands: lands.length, capturedAtMs };
  });
}

function listFriends(nowMs = Date.now()) {
  return queryAll(`
    SELECT
      f.*,
      COUNT(l.land_id) AS land_total,
      SUM(CASE WHEN l.has_plant = 1 THEN 1 ELSE 0 END) AS plant_total,
      SUM(CASE WHEN l.mature_at > 0 AND l.mature_at <= ? THEN 1 ELSE 0 END) AS mature_total,
      SUM(CASE WHEN l.stealable = 1 THEN 1 ELSE 0 END) AS stealable_total,
      MIN(CASE WHEN l.mature_at > ? THEN l.mature_at ELSE NULL END) AS next_mature_at
    FROM friends f
    LEFT JOIN friend_lands l ON l.friend_gid = f.gid
    GROUP BY f.gid
    ORDER BY COALESCE(next_mature_at, 9999999999999), f.last_seen_at DESC
  `, [nowMs, nowMs]);
}

function getFriend(gid) {
  return queryOne('SELECT * FROM friends WHERE gid = ?', [String(gid)]);
}

function listFriendLands(gid) {
  return queryAll(`
    SELECT * FROM friend_lands
    WHERE friend_gid = ?
    ORDER BY land_id ASC
  `, [String(gid)]);
}

function listTasks(options = {}) {
  const limit = Number(options.limit || 200);
  const status = options.status || 'active';
  if (status === 'active') {
    return queryAll(`
      SELECT t.*, f.name AS friend_name
      FROM harvest_tasks t
      LEFT JOIN friends f ON f.gid = t.friend_gid
      WHERE t.status IN ('pending', 'armed', 'harvesting')
      ORDER BY t.mature_at ASC
      LIMIT ?
    `, [limit]);
  }
  return queryAll(`
    SELECT t.*, f.name AS friend_name
    FROM harvest_tasks t
    LEFT JOIN friends f ON f.gid = t.friend_gid
    WHERE t.status = ?
    ORDER BY t.updated_at DESC
    LIMIT ?
  `, [status, limit]);
}

function getTask(id) {
  return queryOne(`
    SELECT t.*, f.name AS friend_name
    FROM harvest_tasks t
    LEFT JOIN friends f ON f.gid = t.friend_gid
    WHERE t.id = ?
  `, [Number(id)]);
}

function markTask(id, status, message = '') {
  const nowMs = Date.now();
  return withWrite(() => {
    const harvestedAt = status === 'harvested' ? nowMs : 0;
    const needsRescan = status === 'harvested' ? 1 : 0;
    const rescanAfter = status === 'harvested' ? nowMs + 15000 : 0;
    run(`
      UPDATE harvest_tasks
      SET status = ?, last_error = ?, updated_at = ?, harvested_at = CASE WHEN ? > 0 THEN ? ELSE harvested_at END,
          needs_rescan = CASE WHEN ? = 1 THEN 1 ELSE needs_rescan END,
          rescan_after = CASE WHEN ? > 0 THEN ? ELSE rescan_after END
      WHERE id = ?
    `, [status, message, nowMs, harvestedAt, harvestedAt, needsRescan, rescanAfter, rescanAfter, Number(id)]);
    return getTask(id);
  });
}

function setTaskStatus(id, status) {
  const nowMs = Date.now();
  return withWrite(() => {
    run('UPDATE harvest_tasks SET status = ?, updated_at = ? WHERE id = ?', [status, nowMs, Number(id)]);
    return getTask(id);
  });
}

function getSchedulerTask() {
  return queryOne(`
    SELECT t.*, f.name AS friend_name
    FROM harvest_tasks t
    LEFT JOIN friends f ON f.gid = t.friend_gid
    WHERE t.status IN ('pending', 'armed', 'harvesting')
    ORDER BY t.mature_at ASC
    LIMIT 1
  `);
}

function getRescanFriend(nowMs = Date.now()) {
  return queryOne(`
    SELECT t.friend_gid, f.name AS friend_name, COUNT(*) AS task_count, MIN(t.harvested_at) AS first_harvested_at
    FROM harvest_tasks t
    LEFT JOIN friends f ON f.gid = t.friend_gid
    WHERE t.status = 'harvested' AND t.needs_rescan = 1 AND t.rescan_after <= ?
    GROUP BY t.friend_gid
    ORDER BY first_harvested_at ASC
    LIMIT 1
  `, [nowMs]);
}

function markFriendRescanQueued(gid) {
  const nowMs = Date.now();
  return withWrite(() => {
    run(`
      UPDATE harvest_tasks
      SET needs_rescan = 0, updated_at = ?
      WHERE friend_gid = ? AND status = 'harvested' AND needs_rescan = 1
    `, [nowMs, String(gid)]);
  });
}

function hasOpenCommand() {
  const row = queryOne(`SELECT COUNT(*) AS cnt FROM automation_commands WHERE status IN ('pending', 'running')`);
  return Number(row?.cnt || 0) > 0;
}

function enqueueCommand(type, payload) {
  const nowMs = Date.now();
  return withWrite(() => {
    run(`
      INSERT INTO automation_commands (type, payload_json, status, created_at)
      VALUES (?, ?, 'pending', ?)
    `, [type, JSON.stringify(payload || {}), nowMs]);
    return queryOne('SELECT * FROM automation_commands WHERE id = last_insert_rowid()');
  });
}

function claimNextCommand(worker = 'visual-helper') {
  const nowMs = Date.now();
  return withWrite(() => {
    const cmd = queryOne(`SELECT * FROM automation_commands WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1`);
    if (!cmd) return null;
    run(`UPDATE automation_commands SET status = 'running', worker = ?, claimed_at = ? WHERE id = ?`, [worker, nowMs, cmd.id]);
    const updated = queryOne('SELECT * FROM automation_commands WHERE id = ?', [cmd.id]);
    if (updated) updated.payload = JSON.parse(updated.payload_json || '{}');
    return updated;
  });
}

function completeCommand(id, status = 'done', result = {}) {
  const nowMs = Date.now();
  return withWrite(() => {
    run(`
      UPDATE automation_commands
      SET status = ?, result_json = ?, completed_at = ?
      WHERE id = ?
    `, [status, JSON.stringify(result || {}), nowMs, Number(id)]);
    return queryOne('SELECT * FROM automation_commands WHERE id = ?', [Number(id)]);
  });
}

function getProfile(gid) {
  const row = queryOne('SELECT * FROM automation_profiles WHERE friend_gid = ?', [String(gid)]);
  if (!row) return null;
  return JSON.parse(row.profile_json || '{}');
}

function saveProfile(gid, profile) {
  const nowMs = Date.now();
  return withWrite(() => {
    run(`
      INSERT INTO automation_profiles (friend_gid, profile_json, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(friend_gid) DO UPDATE SET profile_json = excluded.profile_json, updated_at = excluded.updated_at
    `, [String(gid), JSON.stringify(profile || {}), nowMs]);
    return getProfile(gid);
  });
}

function addLog(level, message, payload = {}) {
  const nowMs = Date.now();
  return withWrite(() => {
    run(`INSERT INTO automation_logs (level, message, payload_json, created_at) VALUES (?, ?, ?, ?)`, [level, message, JSON.stringify(payload || {}), nowMs]);
  });
}

function listLogs(limit = 100) {
  return queryAll('SELECT * FROM automation_logs ORDER BY created_at DESC LIMIT ?', [Number(limit)]);
}

function cleanupExpiredFriends(nowMs = Date.now()) {
  return withWrite(() => {
    const expiredFriends = queryAll(`
      SELECT f.gid, f.name
      FROM friends f
      LEFT JOIN friend_lands l ON l.friend_gid = f.gid
      GROUP BY f.gid
      HAVING COUNT(l.land_id) > 0 
         AND MAX(CASE WHEN l.has_plant = 1 THEN l.mature_at ELSE 0 END) > 0
         AND MAX(CASE WHEN l.has_plant = 1 THEN l.mature_at ELSE 0 END) < ?
    `, [nowMs]);

    const removedGids = [];
    for (const friend of expiredFriends) {
      run('DELETE FROM friend_lands WHERE friend_gid = ?', [friend.gid]);
      run('DELETE FROM harvest_tasks WHERE friend_gid = ?', [friend.gid]);
      run('DELETE FROM automation_profiles WHERE friend_gid = ?', [friend.gid]);
      run('DELETE FROM friends WHERE gid = ?', [friend.gid]);
      removedGids.push({ gid: friend.gid, name: friend.name });
    }

    return removedGids;
  });
}

module.exports = {
  init,
  save,
  run,
  upsertFarmEvent,
  listFriends,
  getFriend,
  listFriendLands,
  listTasks,
  getTask,
  markTask,
  setTaskStatus,
  getSchedulerTask,
  getRescanFriend,
  markFriendRescanQueued,
  hasOpenCommand,
  enqueueCommand,
  claimNextCommand,
  completeCommand,
  getProfile,
  saveProfile,
  addLog,
  listLogs,
  cleanupExpiredFriends,
};
