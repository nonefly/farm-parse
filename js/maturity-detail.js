function injectMaturityDetailStyle() {
  if (document.getElementById('maturityDetailStyle')) return;
  const style = document.createElement('style');
  style.id = 'maturityDetailStyle';
  style.textContent = `
    .modal-overlay{background:rgba(0,0,0,.45)!important;padding:16px}
    .modal-content{max-width:980px!important;width:min(980px,96vw)!important;border-radius:18px!important;background:#fff!important;box-shadow:0 18px 50px rgba(15,23,42,.28)!important;overflow:hidden!important}.modal-header{padding:14px 16px!important;background:#fff!important;border-bottom:1px solid #eef2f7}.modal-header h2{font-size:18px!important;color:#111827}.modal-close{background:transparent!important;border:0!important;font-size:22px!important;color:#64748b!important}.modal-body{padding:14px!important;background:#fff}.friend-summary{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;color:#475569;font-size:13px}.summary-chip{background:#f8fafc;border:1px solid #e5e7eb;border-radius:999px;padding:5px 9px}.summary-chip b{color:#166534}.modal-land-title{font-size:14px;font-weight:800;color:#475569;margin:4px 0 10px;display:flex;align-items:center;gap:6px}.land-grid.farm-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;margin-top:6px;padding:0}.farm-land{aspect-ratio:1/1;border-radius:14px;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:5px 3px;border:1.5px solid #e2e8f0;background:#fefce8;transition:all .05s linear;overflow:hidden;cursor:pointer}.farm-land.empty{border-color:#bbf7d0;background:#fefce8}.farm-land.locked{border-color:#cbd5e1;background:#f8fafc}.farm-land.ready{border-color:#f97316;background:linear-gradient(145deg,#fff7ed,#ffedd5)}.farm-land.pickable{border-color:#ef4444;background:#fef2f2}.farm-land.mutant{animation:softGlow 1.8s ease-in-out infinite}.farm-land.mutant{border-color:#eab308}@keyframes softGlow{0%,100%{box-shadow:0 0 5px rgba(250,204,21,.4)}50%{box-shadow:0 0 12px rgba(245,158,11,.6)}}.farm-plant-img{max-width:80%;max-height:45%;width:auto;height:auto;object-fit:contain;display:block;margin:0 auto;flex:1 1 auto;min-height:0}.farm-fallback-icon{font-size:22px;line-height:1;margin-bottom:2px}.farm-no{position:absolute;top:3px;left:4px;font-size:8px;font-weight:700;background:rgba(255,248,200,.7);padding:1px 4px;border-radius:20px;font-family:monospace;color:#64748b}.farm-badges{position:absolute;top:3px;right:4px;display:flex;gap:2px;justify-content:flex-end;max-width:60px;flex-wrap:wrap}.farm-badge{font-size:7px;font-weight:700;padding:1px 5px;border-radius:30px;background:rgba(0,0,0,.08);color:#2d3e50}.farm-badge.red{background:#fee2e2;color:#b91c1c}.farm-badge.green{background:#dcfce7;color:#166534}.farm-badge.gold{background:#fef3c7;color:#92400e}.farm-info{text-align:center;width:100%;min-width:0}.farm-name{font-size:10px;font-weight:800;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;display:block;padding:0 2px 1px}.farm-meta{font-size:8px;color:#4b5563;margin-top:1px;font-weight:700;line-height:1.25}.farm-meta div{white-space:nowrap}.farm-countdown{font-size:8px;color:#166534;font-weight:700;line-height:1.2;white-space:nowrap}.farm-countdown.over{color:#dc2626}.farm-empty-text{font-size:10px;color:#92400e;font-weight:700}.farm-land.locked .farm-empty-text{color:#94a3b8}@media(max-width:920px){.land-grid.farm-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}@media(max-width:620px){.modal-overlay{padding:8px}.modal-content{width:98vw!important;max-height:92vh!important}.land-grid.farm-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.farm-meta,.farm-countdown{font-size:7px}}
  `;
  document.head.appendChild(style);
}

function isLandHarvestable(land, now = Date.now()) {
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

function getProxyGridLandIds() {
  const ids = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 5; col >= 0; col--) {
      ids.push(col * 4 + row + 1);
    }
  }
  return ids;
}

function shortTime(ms) {
  if (!ms) return '-';
  const d = new Date(Number(ms));
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function getPlantImage(name) {
  const file = window.plantImageMap && window.plantImageMap[name];
  return file ? `/img/plant/${file}` : '';
}

function renderSummaryChip(label, value) {
  return `<span class="summary-chip">${label} <b>${value}</b></span>`;
}

function renderLandCard(land, now, displayLandId) {
  if (!land) {
    return `<div class="farm-land locked"><div class="farm-no">#${displayLandId}</div><div class="farm-empty-text">--</div></div>`;
  }
  const matureAt = Number(land.mature_at || 0);
  const ready = matureAt > 0 && matureAt <= now;
  const pickable = isLandHarvestable(land, now);
  const soon = matureAt > now && matureAt - now < 10 * 60 * 1000;
  const hasPlant = Number(land.has_plant) === 1;
  const isMutant = !!land.mutant_summary;
  const cls = ['farm-land'];
  if (!hasPlant) cls.push('empty');
  if (ready) cls.push('ready');
  if (pickable) cls.push('pickable');
  if (soon) cls.push('soon');
  if (isMutant) cls.push('mutant');

  const plantName = hasPlant ? String(land.plant_name || '未知作物') : '空地';
  const img = hasPlant ? getPlantImage(plantName) : '';
  const imgHtml = img ? `<img class="farm-plant-img" src="${maturityEsc(img)}" alt="${maturityEsc(plantName)}" onerror="this.style.display='none'">` : `<div class="farm-fallback-icon">${hasPlant ? plantIcon(plantName) : ''}</div>`;
  const left = Number(land.left_fruit_num || 0);
  const total = Number(land.fruit_num || 0);
  const badges = [
    pickable ? '<span class="farm-badge red">可摘</span>' : '',
    ready && !pickable ? '<span class="farm-badge red">成熟</span>' : '',
    soon ? '<span class="farm-badge gold">临近</span>' : '',
    isMutant ? '<span class="farm-badge green">变异</span>' : '',
  ].filter(Boolean).join('');

  return `<div class="${cls.join(' ')}" title="土地${displayLandId}: ${maturityEsc(plantName)}\n成熟：${maturityEsc(maturityFmtTime(matureAt))}\n剩余：${left}/${total}">
    <div class="farm-no">#${displayLandId}</div>
    <div class="farm-badges">${badges}</div>
    ${hasPlant ? imgHtml : '<div class="farm-empty-text">空</div>'}
    <div class="farm-info">
      <div class="farm-name">${maturityEsc(plantName)}</div>
      ${hasPlant ? `<div class="farm-meta"><div>成熟 ${maturityEsc(shortTime(matureAt))}</div><div>计时 ${maturityEsc(maturityFmtCountdown(matureAt))}</div><div>可摘 ${left}/${total}</div></div>${isMutant ? `<div class="farm-countdown">${maturityEsc(land.mutant_summary)}</div>` : ''}` : ''}
    </div>
  </div>`;
}

function closeFriendModal() {
  const modal = document.getElementById('friendModal');
  if (modal) modal.style.display = 'none';
}

async function renderEnhancedFriendDetail(gid) {
  injectMaturityDetailStyle();
  const data = await maturityGetFriendDetail(gid);
  const modal = document.getElementById('friendModal');
  const modalTitle = document.getElementById('modalTitle');
  if (modalTitle) {
    const friendName = data.friend.name || '未知';
    modalTitle.innerHTML = `${maturityEsc(friendName)} (${maturityEsc(data.friend.gid)}) 的土地作物详情 <button class="copy-name-btn" data-name="${maturityEsc(friendName)}" onclick="copyFriendName(event,this,this.dataset.name)" title="复制好友名称">复制</button>`;
  }

  const lands = data.lands || [];
  const landById = new Map(lands.map(l => [Number(l.land_id), l]));
  const now = Date.now();
  const plantTotal = lands.filter(l => Number(l.has_plant) === 1).length;
  const readyTotal = lands.filter(l => Number(l.mature_at || 0) > 0 && Number(l.mature_at) <= now).length;
  const harvestableTotal = lands.filter(l => isLandHarvestable(l, now)).length;
  const mutantTotal = lands.filter(l => l.mutant_summary).length;
  const nextMature = lands.map(l => Number(l.mature_at || 0)).filter(ms => ms > now).sort((a, b) => a - b)[0] || 0;

  const modalLandSummary = document.getElementById('modalLandSummary');
  if (modalLandSummary) {
    modalLandSummary.innerHTML = [
      renderSummaryChip('土地', lands.length),
      renderSummaryChip('作物', plantTotal),
      renderSummaryChip('已成熟', readyTotal),
      renderSummaryChip('成熟可摘', harvestableTotal),
      renderSummaryChip('变异', mutantTotal),
      renderSummaryChip('下次成熟', nextMature ? shortTime(nextMature) : '-'),
      `<span class="summary-chip">最近抓包 <b>${maturityEsc(maturityFmtTime(data.friend.last_seen_at))}</b></span>`,
    ].join('');
  }

  const modalLandGrid = document.getElementById('modalLandGrid');
  if (modalLandGrid) {
    modalLandGrid.className = 'land-grid farm-grid';
    const orderedIds = getProxyGridLandIds();
    modalLandGrid.innerHTML = `<div class="modal-land-title" style="grid-column:1/-1"><span>🏙</span> 农场土地 (4x6)</div>` + orderedIds.map(id => renderLandCard(landById.get(id), now, id)).join('');
  }

  if (modal) modal.style.display = 'flex';
}

window.addEventListener('DOMContentLoaded', () => {
  injectMaturityDetailStyle();
  window.closeFriendModal = closeFriendModal;
  window.selectFriend = async function(gid) {
    try {
      selectedGid = String(gid);
      await renderEnhancedFriendDetail(gid);
    } catch (err) {
      alert(err.message || String(err));
    }
  };
});
