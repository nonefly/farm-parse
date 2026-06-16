let selectedGid = null;
let schedulerEnabled = true;

function parseBase() {
  const protocol = location.protocol === 'https:' ? 'https:' : 'http:';
  return `${protocol}//${location.hostname}:8787`;
}
function openHome() { location.href = `${parseBase()}/`; }
function openProxy() { location.href = `${parseBase()}/proxy.html`; }
function fmtTime(ms) {
  if (!ms) return '-';
  return new Date(Number(ms)).toLocaleString();
}
function fmtAge(ms) {
  if (!ms) return '-';
  const sec = Math.floor((Date.now() - Number(ms)) / 1000);
  if (sec < 60) return sec + '秒前';
  const min = Math.floor(sec / 60);
  if (min < 60) return min + '分钟前';
  return Math.floor(min / 60) + '小时前';
}
function fmtCountdown(ms) {
  if (!ms) return '-';
  let diff = Number(ms) - Date.now();
  const past = diff < 0;
  diff = Math.abs(diff);
  const sec = Math.floor(diff / 1000);
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const text = d ? `${d}天${h}小时` : h ? `${h}小时${m}分` : m ? `${m}分${s}秒` : `${s}秒`;
  return past ? '已过 ' + text : text;
}
function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
async function api(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
async function loadStatus() {
  try {
    const s = await api('/api/maturity/status');
    schedulerEnabled = !!s.scheduler?.enabled;
    const streamStateEl = document.getElementById('streamState');
    if (streamStateEl) {
      streamStateEl.textContent = s.streamConnected ? '已连接' : '未连接';
      streamStateEl.className = s.streamConnected ? 'value ok' : 'value ready';
    }
    const lastFriendEl = document.getElementById('lastFriend');
    if (lastFriendEl) lastFriendEl.textContent = s.lastPersistedFriend ? `${s.lastPersistedFriend.name} (${s.lastPersistedFriend.gid})` : '--';
    const schedulerBtnEl = document.getElementById('schedulerBtn');
    if (schedulerBtnEl) {
      schedulerBtnEl.textContent = schedulerEnabled ? '关闭调度' : '开启调度';
      schedulerBtnEl.className = schedulerEnabled ? 'btn warn' : 'btn primary';
    }
  } catch {}
}
async function toggleScheduler() {
  await api('/api/maturity/scheduler/toggle', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ enabled: !schedulerEnabled }) });
  await loadStatus();
}
async function loadFriends() {
  try {
    const friends = await api('/api/maturity/friends');
    const friendCountEl = document.getElementById('friendCount');
    if (friendCountEl) friendCountEl.textContent = friends.length;
  } catch {}
}
async function loadTasks() {
  try {
    const tasks = await api('/api/maturity/tasks?status=active&limit=100');
    const taskCountEl = document.getElementById('taskCount');
    if (taskCountEl) taskCountEl.textContent = tasks.length;
    const taskHintEl = document.getElementById('taskHint');
    if (taskHintEl) taskHintEl.textContent = tasks[0] ? `最近：${fmtCountdown(tasks[0].mature_at)}` : '暂无任务';
    const tasksBodyEl = document.getElementById('tasksBody');
    if (tasksBodyEl) {
      tasksBodyEl.innerHTML = tasks.map(t => `<tr><td><span class="pill">${esc(t.status)}</span></td><td><b>${esc(t.friend_name || '未知')}</b></td><td class="dim">${esc(t.friend_gid)}</td><td>#${t.land_id}</td><td>${esc(t.plant_name || t.plant_id)}</td><td>${fmtTime(t.mature_at)}</td><td class="${Number(t.mature_at) <= Date.now() ? 'ready' : ''}">${fmtCountdown(t.mature_at)}</td><td><button class="btn" onclick="markTask(${t.id}, 'harvested')">标记已摘</button> <button class="btn" onclick="markTask(${t.id}, 'skipped')">跳过</button></td></tr>`).join('') || '<tr><td colspan="8" class="dim">暂无活跃任务</td></tr>';
    }
  } catch {}
}
async function markTask(id, status) {
  await api(`/api/maturity/tasks/${id}/mark`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status, message:'manual mark from dashboard' }) });
  await refreshAll();
}
async function selectFriend(gid) {
  selectedGid = String(gid);
}
async function loadLogs() {
  try {
    const logs = await api('/api/maturity/logs?limit=80');
    const logsEl = document.getElementById('logs');
    if (logsEl) logsEl.innerHTML = logs.map(l => `[${new Date(Number(l.created_at)).toLocaleTimeString()}] ${esc(l.level)} ${esc(l.message)}`).join('<br>') || '--';
  } catch {}
}
async function cleanupExpired() {
  try {
    await api('/api/maturity/cleanup', { method: 'POST' });
  } catch {}
}

async function refreshAll() {
  await cleanupExpired();
  await Promise.all([loadStatus(), loadFriends(), loadTasks(), loadLogs()]);
  if (typeof maturityLoadFriendIndex === 'function') {
    await maturityLoadFriendIndex().catch(()=>{});
    if (typeof applyFriendNameSearch === 'function') applyFriendNameSearch();
  }
}
window.addEventListener('DOMContentLoaded', () => {
  refreshAll().catch(err => alert(err.message));
  setInterval(() => { loadStatus().catch(()=>{}); loadTasks().catch(()=>{}); }, 5000);
});