const PHASE_MATURE = 6;
const PHASE_DEAD = 7;

function toNumber(value) {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value.toNumber === 'function') return value.toNumber();
  return Number(value) || 0;
}

function getField(obj, snakeName, camelName, fallback = undefined) {
  if (!obj) return fallback;
  if (obj[snakeName] !== undefined) return obj[snakeName];
  if (obj[camelName] !== undefined) return obj[camelName];
  return fallback;
}

function toEpochMs(value) {
  const n = toNumber(value);
  if (!n) return 0;
  // Game protocol normally returns seconds, but keep millisecond compatibility.
  return n > 100000000000 ? n : n * 1000;
}

function getPhaseBeginMs(phase) {
  return toEpochMs(getField(phase, 'begin_time', 'beginTime', 0));
}

function getSortedPhases(plant) {
  return [...(plant?.phases || [])]
    .map(phase => ({ ...phase, phase: toNumber(phase.phase), beginMs: getPhaseBeginMs(phase) }))
    .sort((a, b) => a.beginMs - b.beginMs);
}

function getCurrentPhase(plant, nowMs = Date.now()) {
  const phases = getSortedPhases(plant).filter(phase => phase.beginMs > 0);
  if (phases.length === 0) return null;
  let current = phases[0];
  for (const phase of phases) {
    if (phase.beginMs <= nowMs) current = phase;
  }
  return current;
}

function getMatureAtMs(plant) {
  if (!plant) return 0;
  const phases = getSortedPhases(plant);
  const mature = phases.find(phase => toNumber(phase.phase) === PHASE_MATURE && phase.beginMs > 0);
  if (mature) return mature.beginMs;

  // Fallback for packets that only include the first phase and grow_sec.
  const growSec = toNumber(getField(plant, 'grow_sec', 'growSec', 0));
  const firstBegin = phases.find(phase => phase.beginMs > 0)?.beginMs || 0;
  if (firstBegin && growSec) return firstBegin + growSec * 1000;
  return 0;
}

function getPhaseName(phase) {
  const value = toNumber(phase);
  return {
    0: '未知',
    1: '种子',
    2: '发芽',
    3: '小叶',
    4: '大叶',
    5: '开花',
    6: '成熟',
    7: '枯死',
  }[value] || `阶段${value}`;
}

function getMutationSummary(plant) {
  const ids = new Set();
  for (const id of getField(plant, 'mutant_config_ids', 'mutantConfigIds', []) || []) ids.add(toNumber(id));
  for (const phase of plant?.phases || []) {
    for (const mutant of phase.mutants || []) {
      const id = toNumber(getField(mutant, 'mutant_config_id', 'mutantConfigId', 0));
      if (id) ids.add(id);
    }
  }
  return [...ids].filter(Boolean).join(',');
}

function normalizeFriendInfo(friendInfo) {
  if (!friendInfo) return null;
  const gid = String(getField(friendInfo, 'gid', 'gid', '') || '').trim();
  if (!gid) return null;
  return {
    gid,
    name: String(friendInfo.name || '未知'),
    avatar: String(friendInfo.avatar || ''),
    level: toNumber(friendInfo.level),
    landCount: toNumber(getField(friendInfo, 'land_count', 'landCount', 0)),
  };
}

function normalizeLand(event, land, nowMs = Date.now()) {
  const plant = land?.plant || null;
  const currentPhase = plant ? getCurrentPhase(plant, nowMs) : null;
  const phaseValue = plant ? toNumber(currentPhase?.phase || 0) : 0;
  const matureAtMs = plant ? getMatureAtMs(plant) : 0;
  const matureInMs = matureAtMs ? matureAtMs - nowMs : null;
  return {
    friendGid: event.friendInfo?.gid ? String(event.friendInfo.gid) : '',
    landId: toNumber(land.id),
    unlocked: Boolean(land.unlocked),
    hasPlant: Boolean(plant && toNumber(plant.id)),
    plantId: plant ? toNumber(plant.id) : 0,
    plantName: plant ? String(plant.name || `植物${toNumber(plant.id)}`) : '',
    phase: phaseValue,
    phaseName: getPhaseName(phaseValue),
    matureAtMs,
    matureInMs,
    isMature: phaseValue === PHASE_MATURE || (matureAtMs > 0 && matureAtMs <= nowMs),
    isDead: phaseValue === PHASE_DEAD,
    stealable: Boolean(plant && getField(plant, 'stealable', 'stealable', false)),
    fruitNum: plant ? toNumber(getField(plant, 'fruit_num', 'fruitNum', 0)) : 0,
    leftFruitNum: plant ? toNumber(getField(plant, 'left_fruit_num', 'leftFruitNum', 0)) : 0,
    growSec: plant ? toNumber(getField(plant, 'grow_sec', 'growSec', 0)) : 0,
    mutantSummary: plant ? getMutationSummary(plant) : '',
    raw: JSON.stringify(land || {}),
  };
}

function normalizeFarmEvent(event, nowMs = Date.now()) {
  const friend = normalizeFriendInfo(event?.friendInfo);
  if (!friend) return null;
  const lands = (event.lands || [])
    .map(land => normalizeLand({ ...event, friendInfo: friend }, land, nowMs))
    .filter(land => land.landId > 0);
  return {
    eventId: event.id || `${Date.now()}`,
    capturedAtMs: event.time ? Date.parse(event.time) || nowMs : nowMs,
    friend,
    lands,
  };
}

function formatDuration(ms) {
  if (ms == null || !Number.isFinite(ms)) return '-';
  const abs = Math.abs(ms);
  const sign = ms < 0 ? '-' : '';
  const totalSec = Math.floor(abs / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d) return `${sign}${d}天${h}小时`;
  if (h) return `${sign}${h}小时${m}分`;
  if (m) return `${sign}${m}分${s}秒`;
  return `${sign}${s}秒`;
}

module.exports = {
  PHASE_MATURE,
  PHASE_DEAD,
  toNumber,
  getField,
  toEpochMs,
  getCurrentPhase,
  getMatureAtMs,
  getPhaseName,
  normalizeFarmEvent,
  normalizeLand,
  formatDuration,
};
