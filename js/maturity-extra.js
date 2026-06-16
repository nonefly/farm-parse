const maturitySearch = {
  friends: [],
};

async function maturityApi(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function maturityEsc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function maturityFmtTime(ms) {
  if (!ms) return '-';
  return new Date(Number(ms)).toLocaleString();
}

function maturityFmtCountdown(ms) {
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
  return past ? `已过 ${text}` : text;
}

function maturityShortTime(ms) {
  if (!ms) return '-';
  const d = new Date(Number(ms));
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function maturityIsPickable(land, now = Date.now()) {
  const matureAt = Number(land?.mature_at || 0);
  const left = Number(land?.left_fruit_num || 0);
  const total = Number(land?.fruit_num || 0);
  return Number(land?.has_plant) === 1
    && matureAt > 0
    && matureAt <= now
    && Number(land?.stealable) === 1
    && total > 0
    && left > total * 0.7;
}

function plantIcon(name) {
  const n = String(name || '');
  if (/萝卜/.test(n)) return '🥕';
  if (/玉米/.test(n)) return '🌽';
  if (/番茄|西红柿/.test(n)) return '🍅';
  if (/草莓/.test(n)) return '🍓';
  if (/南瓜/.test(n)) return '🎃';
  if (/西瓜/.test(n)) return '🍉';
  if (/葡萄/.test(n)) return '🍇';
  if (/苹果/.test(n)) return '🍎';
  if (/梨/.test(n)) return '🍐';
  if (/花|玫瑰/.test(n)) return '🌸';
  return '🌱';
}

async function maturityLoadFriendIndex() {
  maturitySearch.friends = await maturityApi('/api/maturity/friends');
  return maturitySearch.friends;
}

async function maturityGetFriendDetail(gid) {
  return maturityApi(`/api/maturity/friends/${encodeURIComponent(gid)}`);
}

function copyFriendName(event, button, name) {
  event.stopPropagation();
  navigator.clipboard.writeText(name || '').then(() => {
    const oldText = button.textContent;
    button.textContent = '✓';
    button.classList.add('done');
    setTimeout(() => {
      button.textContent = oldText || '复制';
      button.classList.remove('done');
    }, 1100);
  }).catch(() => {
    button.textContent = '×';
    setTimeout(() => { button.textContent = '复制'; }, 1100);
  });
}

function friendNameCell(friend) {
  const name = friend.name || '未知';
  return `<b>${maturityEsc(name)}</b><button class="copy-name-btn" data-name="${maturityEsc(name)}" onclick="copyFriendName(event,this,this.dataset.name)" title="复制好友名称">复制</button>`;
}

function applyFriendNameSearch() {
  const input = document.getElementById('friendNameSearch');
  const hint = document.getElementById('friendNameSearchHint');
  const body = document.getElementById('friendNameSearchBody');
  if (!input || !body) return;
  const q = input.value.trim().toLowerCase();
  let rows = maturitySearch.friends.filter(f => !q || String(f.name || '').toLowerCase().includes(q));
  rows = rows.sort((a, b) => {
    const ma = Number(a.next_mature_at || 0);
    const mb = Number(b.next_mature_at || 0);
    if (!ma) return 1;
    if (!mb) return -1;
    return ma - mb;
  }).slice(0, 12);
  if (hint) hint.textContent = q ? `匹配 ${rows.length} 个好友（最多显示12条）` : `最近成熟的 ${rows.length} 个好友`;
  body.innerHTML = rows.map(f => {
    const next = Number(f.next_mature_at || 0);
    return `<tr onclick="selectFriend('${maturityEsc(f.gid)}')"><td>${friendNameCell(f)}</td><td class="dim">${maturityEsc(f.gid)}</td><td>${f.plant_total || 0}</td><td class="ready">${f.mature_pickable_total ?? f.stealable_total ?? 0}</td><td>${maturityFmtTime(next)}</td><td>${maturityFmtCountdown(next)}</td><td>${maturityFmtTime(f.last_seen_at)}</td></tr>`;
  }).join('') || '<tr><td colspan="7" class="dim">没有匹配好友</td></tr>';
}

async function searchCropByName() {
  const input = document.getElementById('cropNameSearch');
  const hint = document.getElementById('cropNameSearchHint');
  const body = document.getElementById('cropNameSearchBody');
  if (!input || !body) return;
  const q = input.value.trim().toLowerCase();
  if (!q) {
    if (hint) hint.textContent = '请输入作物名';
    body.innerHTML = '<tr><td colspan="6" class="dim">输入农作物名称后搜索</td></tr>';
    return;
  }
  if (hint) hint.textContent = '搜索中...';
  if (!maturitySearch.friends.length) await maturityLoadFriendIndex();
  const groups = new Map();
  const now = Date.now();
  for (const friend of maturitySearch.friends) {
    const detail = await maturityGetFriendDetail(friend.gid);
    for (const land of detail.lands || []) {
      if (Number(land.has_plant) !== 1) continue;
      const name = String(land.plant_name || '');
      if (!name.toLowerCase().includes(q) && !String(land.plant_id || '').includes(q)) continue;
      const key = `${friend.gid}|${name}`;
      const matureAt = Number(land.mature_at || 0);
      if (!groups.has(key)) groups.set(key, { friend, name, count: 0, landIds: [], earliest: matureAt || 0, matureCount: 0, pickableCount: 0 });
      const row = groups.get(key);
      row.count += 1;
      row.landIds.push(`#${land.land_id}`);
      if (matureAt && (!row.earliest || matureAt < row.earliest)) row.earliest = matureAt;
      if (matureAt && matureAt <= now) row.matureCount += 1;
      if (maturityIsPickable(land, now)) row.pickableCount += 1;
    }
  }
  const rows = [...groups.values()].sort((a, b) => (a.earliest || 9999999999999) - (b.earliest || 9999999999999));
  if (hint) hint.textContent = `匹配 ${rows.length} 个好友/作物组合`;
  body.innerHTML = rows.map(r => `<tr onclick="selectFriend('${maturityEsc(r.friend.gid)}')"><td>${friendNameCell(r.friend)}<br><span class="dim">${maturityEsc(r.friend.gid)}</span></td><td>${plantIcon(r.name)} ${maturityEsc(r.name)}</td><td>${maturityEsc(r.landIds.join(', '))}</td><td>${maturityShortTime(r.earliest)}</td><td class="${r.earliest && r.earliest <= now ? 'ready' : ''}">${maturityFmtCountdown(r.earliest)}</td><td>${r.pickableCount}/${r.matureCount}</td></tr>`).join('') || '<tr><td colspan="6" class="dim">没有找到该农作物</td></tr>';
}

window.addEventListener('DOMContentLoaded', async () => {
  try {
    await maturityLoadFriendIndex();
    applyFriendNameSearch();
  } catch {}
  const friendInput = document.getElementById('friendNameSearch');
  if (friendInput) friendInput.addEventListener('input', applyFriendNameSearch);
  const cropInput = document.getElementById('cropNameSearch');
  if (cropInput) cropInput.addEventListener('keydown', e => { if (e.key === 'Enter') searchCropByName(); });
});
