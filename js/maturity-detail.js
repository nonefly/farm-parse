function injectMaturityDetailStyle() {
  if (document.getElementById('maturityDetailStyle')) return;
  const style = document.createElement('style');
  style.id = 'maturityDetailStyle';
  style.textContent = `
    .modal-overlay{background:rgba(0,0,0,.45)!important;padding:16px}
    .modal-content{max-width:980px!important;width:min(980px,96vw)!important;border-radius:18px!important;background:#fff!important;box-shadow:0 18px 50px rgba(15,23,42,.28)!important;overflow:hidden!important}
    .modal-header{padding:14px 16px!important;background:#fff!important;border-bottom:1px solid #eef2f7}.modal-header h2{font-size:18px!important;color:#111827}.modal-close{background:transparent!important;border:0!important;font-size:22px!important;color:#64748b!important}.modal-body{padding:14px!important;background:#fff}.friend-summary{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;color:#475569;font-size:13px}.summary-chip{background:#f8fafc;border:1px solid #e5e7eb;border-radius:999px;padding:5px 9px}.summary-chip b{color:#166534}.land-grid.farm-grid{display:grid;grid-template-columns:repeat(6,minmax(112px,1fr));gap:10px;padding:0}.farm-land{position:relative;min-height:128px;border:1px solid #bbf7d0;border-radius:12px;background:#f0fdf4;padding:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;overflow:hidden}.farm-land.empty{background:#f8fafc;border-color:#e5e7eb}.farm-land.ready{background:#fff7ed;border-color:#fdba74}.farm-land.pickable{background:#fef2f2;border-color:#fca5a5}.farm-land.mutant{box-shadow:0 0 0 2px rgba(250,204,21,.35) inset}.farm-plant-img{width:48px;height:48px;object-fit:contain;display:block}.farm-fallback-icon{font-size:30px;line-height:1}.farm-no{position:absolute;right:7px;top:6px;color:#64748b;font-size:11px;font-weight:700}.farm-badges{position:absolute;left:7px;top:6px;display:flex;gap:3px;flex-wrap:wrap}.farm-badge{border-radius:999px;background:#e5e7eb;color:#334155;font-size:10px;font-weight:800;padding:2px 5px}.farm-badge.red{background:#fee2e2;color:#b91c1c}.farm-badge.green{background:#dcfce7;color:#166534}.farm-badge.gold{background:#fef3c7;color:#92400e}.farm-info{text-align:center;width:100%}.farm-name{font-size:12px;font-weight:900;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}.farm-meta{font-size:11px;color:#334155;line-height:1.45;margin-top:2px}.farm-countdown{font-size:11px;color:#166534;font-weight:800;line-height:1.35}.farm-countdown.over{color:#dc2626}.farm-empty-text{font-size:12px;color:#64748b;font-weight:800}@media(max-width:920px){.land-grid.farm-grid{grid-template-columns:repeat(4,minmax(100px,1fr))}}@media(max-width:620px){.modal-overlay{padding:8px}.modal-content{width:98vw!important;max-height:92vh!important}.land-grid.farm-grid{grid-template-columns:repeat(3,minmax(86px,1fr));gap:8px}.farm-land{min-height:120px}.farm-plant-img{width:42px;height:42px}.farm-name{font-size:11px}.farm-meta,.farm-countdown{font-size:10px}}
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

function renderLandCard(land, now) {
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
  const imgHtml = img ? `<img class="farm-plant-img" src="${maturityEsc(img)}" alt="${maturityEsc(plantName)}" onerror="this.style.display='none'">` : `<div class="farm-fallback-icon">${hasPlant ? plantIcon(plantName) : '🟫'}</div>`;
  const left = Number(land.left_fruit_num || 0);
  const total = Number(land.fruit_num || 0);
  const badges = [
    pickable ? '<span class="farm-badge red">可摘</span>' : '',
    ready && !pickable ? '<span class="farm-badge red">成熟</span>' : '',
    soon ? '<span class="farm-badge gold">临近</span>' : '',
    isMutant ? '<span class="farm-badge green">变异</span>' : '',
  ].filter(Boolean).join('');

  return `<div class="${cls.join(' ')}" title="${maturityEsc(plantName)}\n成熟：${maturityEsc(maturityFmtTime(matureAt))}\n剩余：${left}/${total}">
    <div class="farm-no">#${maturityEsc(land.land_id)}</div>
    <div class="farm-badges">${badges}</div>
    ${imgHtml}
    <div class="farm-info">
      <div class="farm-name">${maturityEsc(plantName)}</div>
      ${hasPlant ? `<div class="farm-meta">熟 ${maturityEsc(shortTime(matureAt))} · 余 ${left}/${total}</div><div class="farm-countdown ${ready ? 'over' : ''}">${maturityEsc(maturityFmtCountdown(matureAt))}</div>${isMutant ? `<div class="farm-countdown">${maturityEsc(land.mutant_summary)}</div>` : ''}` : '<div class="farm-empty-text">未种植</div>'}
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
  if (modalTitle) modalTitle.textContent = `${data.friend.name || '未知'} (${data.friend.gid}) 的土地作物详情`;

  const lands = data.lands || [];
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
    modalLandGrid.innerHTML = lands.map(l => renderLandCard(l, now)).join('') || '<div class="dim">暂无土地数据</div>';
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
