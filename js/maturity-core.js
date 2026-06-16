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
  const s = await api('/api/maturity/status');
  schedulerEnabled = !!s.scheduler?.enabled;
  document.getElementById('streamState').textContent = s.streamConnected ? '已连接' : '未连接';
  document.getElementById('streamState').className = s.streamConnected ? 'value ok' : 'value ready';
  document.getElementById('lastFriend').textContent = s.lastPersistedFriend ? `${s.lastPersistedFriend.name} (${s.lastPersistedFriend.gid})` : '--';
  document.getElementById('schedulerBtn').textContent = schedulerEnabled ? '关闭调度' : '开启调度';
  document.getElementById('schedulerBtn').className = schedulerEnabled ? 'btn warn' : 'btn primary';
}
async function toggleScheduler() {
  await api('/api/maturity/scheduler/toggle', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ enabled: !schedulerEnabled }) });
  await loadStatus();
}
async function loadFriends() {
  const friends = await api('/api/maturity/friends');
  document.getElementById('friendCount').textContent = friends.length;
  const body = document.getElementById('friendsBody');
  body.innerHTML = friends.map(f => {
    const next = Number(f.next_mature_at || 0);
    return `<tr class="${selectedGid === String(f.gid) ? 'selected' : ''}" onclick="selectFriend('${esc(f.gid)}')"><td><b>${esc(f.name || '未知')}</b></td><td class="dim">${esc(f.gid)}</td><td>${f.land_total || 0}</td><td>${f.plant_total || 0}</td><td class="ready">${f.stealable_total || 0}</td><td>${f.mature_total || 0}</td><td>${fmtTime(next)}</td><td>${fmtCountdown(next)}</td><td>${fmtAge(f.last_seen_at)}</td></tr>`;
  }).join('') || '<tr><td colspan="9" class="dim">等待抓包数据...</td></tr>';
}
async function loadTasks() {
  const tasks = await api('/api/maturity/tasks?status=active&limit=100');
  document.getElementById('taskCount').textContent = tasks.length;
  document.getElementById('taskHint').textContent = tasks[0] ? `最近：${fmtCountdown(tasks[0].mature_at)}` : '暂无任务';
  document.getElementById('tasksBody').innerHTML = tasks.map(t => `<tr><td><span class="pill">${esc(t.status)}</span></td><td><b>${esc(t.friend_name || '未知')}</b></td><td class="dim">${esc(t.friend_gid)}</td><td>#${t.land_id}</td><td>${esc(t.plant_name || t.plant_id)}</td><td>${fmtTime(t.mature_at)}</td><td class="${Number(t.mature_at) <= Date.now() ? 'ready' : ''}">${fmtCountdown(t.mature_at)}</td><td><button class="btn" onclick="markTask(${t.id}, 'harvested')">标记已摘</button> <button class="btn" onclick="markTask(${t.id}, 'skipped')">跳过</button></td></tr>`).join('') || '<tr><td colspan="8" class="dim">暂无活跃任务</td></tr>';
}
async function markTask(id, status) {
  await api(`/api/maturity/tasks/${id}/mark`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status, message:'manual mark from dashboard' }) });
  await refreshAll();
}
async function selectFriend(gid) {
  selectedGid = String(gid);
  const data = await api(`/api/maturity/friends/${encodeURIComponent(gid)}`);
  document.getElementById('landsPanel').style.display = 'block';
  document.getElementById('landsTitle').textContent = `${data.friend.name || '未知'} (${data.friend.gid}) 的土地`;
  document.getElementById('profileHint').textContent = data.profile && Object.keys(data.profile).length ? '已记录点击位置' : '未记录点击位置';
  const lands = data.lands || [];
  document.getElementById('landsGrid').innerHTML = lands.map(l => {
    const cls = Number(l.mature_at) <= Date.now() && Number(l.mature_at) > 0 ? 'land ready' : Number(l.mature_at) - Date.now() < 10 * 60 * 1000 ? 'land soon' : 'land';
    return `<div class="${cls}"><div class="no">#${l.land_id}</div><div class="name">${esc(l.has_plant ? l.plant_name : '空地')}</div><div class="time">阶段：${esc(l.phase_name || l.phase)}<br>成熟：${fmtTime(l.mature_at)}<br>倒计时：${fmtCountdown(l.mature_at)}<br>可摘：${l.stealable ? '是' : '否'} ${l.mutant_summary ? '<br><span class="mutant">变异：'+esc(l.mutant_summary)+'</span>' : ''}</div></div>`;
  }).join('') || '<div class="dim">暂无土地数据</div>';
  await loadFriends();
}
async function loadLogs() {
  const logs = await api('/api/maturity/logs?limit=80');
  document.getElementById('logs').innerHTML = logs.map(l => `[${new Date(Number(l.created_at)).toLocaleTimeString()}] ${esc(l.level)} ${esc(l.message)}`).join('<br>') || '--';
}
async function refreshAll() {
  await Promise.all([loadStatus(), loadFriends(), loadTasks(), loadLogs()]);
  if (selectedGid) selectFriend(selectedGid).catch(()=>{});
}
window.addEventListener('DOMContentLoaded', () => {
  refreshAll().catch(err => alert(err.message));
  setInterval(() => { loadStatus().catch(()=>{}); loadTasks().catch(()=>{}); }, 5000);
});
