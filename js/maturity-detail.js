function injectMaturityDetailStyle() {
  if (document.getElementById('maturityDetailStyle')) return;
  const style = document.createElement('style');
  style.id = 'maturityDetailStyle';
  style.textContent = `
    .modal-overlay{backdrop-filter:blur(4px);background:rgba(15,23,42,.52)!important;padding:18px}
    .modal-content{max-width:1120px!important;width:min(1120px,96vw)!important;border-radius:28px!important;border:1px solid rgba(255,255,255,.7);box-shadow:0 28px 80px rgba(15,23,42,.35)!important;overflow:hidden!important;background:linear-gradient(180deg,#ffffff,#f8fafc)!important}
    .modal-header{background:linear-gradient(135deg,#ecfdf5,#ffffff);padding:16px 20px!important}.modal-header h2{font-size:20px!important;color:#14532d}.modal-close{border-radius:999px!important;background:#f1f5f9!important}.modal-body{padding:16px!important;background:#f8fafc}.friend-summary{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:0 0 14px!important;border:0!important;color:#475569!important}.friend-summary .summary-chip{border-radius:999px;background:#fff;border:1px solid #e2e8f0;padding:7px 11px;font-size:13px;box-shadow:0 2px 8px rgba(15,23,42,.04)}.friend-summary b{color:#14532d}.farm-stage{border-radius:24px;padding:16px;background:linear-gradient(135deg,#dcfce7,#bbf7d0 44%,#a7f3d0);border:1px solid #86efac;box-shadow:inset 0 2px 12px rgba(22,101,52,.08)}.land-grid.farm-grid{display:grid;grid-template-columns:repeat(6,minmax(86px,1fr));gap:12px;padding:0}.farm-land{position:relative;min-height:154px;aspect-ratio:1/1.25;border-radius:18px;overflow:hidden;border:1px solid rgba(120,53,15,.22);background:linear-gradient(160deg,#92400e,#b45309 42%,#7c2d12);box-shadow:0 8px 16px rgba(15,23,42,.12),inset 0 1px 0 rgba(255,255,255,.25);isolation:isolate}.farm-land::before{content:'';position:absolute;inset:8px;border-radius:14px;background:repeating-linear-gradient(135deg,rgba(255,255,255,.18) 0 8px,rgba(0,0,0,.05) 8px 16px),linear-gradient(135deg,#d97706,#92400e);opacity:.52;z-index:0}.farm-land.empty{background:linear-gradient(145deg,#e2e8f0,#cbd5e1);border-color:#cbd5e1}.farm-land.soon{border-color:#f59e0b;box-shadow:0 0 0 2px rgba(245,158,11,.18),0 10px 20px rgba(146,64,14,.16)}.farm-land.ready,.farm-land.pickable{border-color:#ef4444;box-shadow:0 0 0 2px rgba(239,68,68,.18),0 12px 24px rgba(127,29,29,.18)}.farm-land.mutant{border-color:#facc15;box-shadow:0 0 0 2px rgba(250,204,21,.26),0 12px 24px rgba(146,64,14,.20)}.farm-land.pickable{animation:farmPulse 1.8s ease-in-out infinite}@keyframes farmPulse{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}.farm-plant-img{position:absolute;left:50%;top:42%;transform:translate(-50%,-50%);width:76%;height:76%;object-fit:contain;z-index:1;filter:drop-shadow(0 8px 10px rgba(0,0,0,.22));pointer-events:none}.farm-land.empty .farm-plant-img{display:none}.farm-fallback-icon{position:absolute;left:50%;top:42%;transform:translate(-50%,-50%);font-size:36px;z-index:1}.farm-no{position:absolute;left:8px;top:8px;z-index:3;border-radius:999px;background:rgba(15,23,42,.76);color:#fff;font-size:11px;font-weight:900;padding:3px 8px}.farm-badges{position:absolute;right:7px;top:7px;z-index:3;display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end;max-width:76px}.farm-badge{border-radius:999px;background:rgba(255,255,255,.92);font-size:10px;font-weight:900;padding:3px 6px;color:#334155;box-shadow:0 1px 4px rgba(15,23,42,.14)}.farm-badge.red{background:#fee2e2;color:#b91c1c}.farm-badge.green{background:#dcfce7;color:#166534}.farm-badge.gold{background:#fef3c7;color:#92400e}.farm-info{position:absolute;left:7px;right:7px;bottom:7px;z-index:4;border-radius:14px;background:rgba(255,255,255,.92);backdrop-filter:blur(6px);padding:7px 8px;box-shadow:0 6px 14px rgba(15,23,42,.16);border:1px solid rgba(255,255,255,.72)}.farm-name{font-size:12px;font-weight:950;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.farm-meta{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:5px}.farm-meta span{font-size:10px;font-weight:800;color:#475569;background:#f8fafc;border-radius:8px;padding:3px 4px;white-space:nowrap;text-align:center}.farm-countdown{margin-top:4px;font-size:10px;font-weight:900;color:#166534;text-align:center}.farm-countdown.over{color:#dc2626}.farm-empty-text{font-size:12px;font-weight:900;color:#475569;text-align:center}@media(max-width:920px){.land-grid.farm-grid{grid-template-columns:repeat(4,minmax(76px,1fr))}.farm-land{min-height:142px}}@media(max-width:620px){.modal-overlay{padding:8px}.modal-content{width:98vw!important;max-height:92vh!important}.land-grid.farm-grid{grid-template-columns:repeat(3,minmax(74px,1fr));gap:8px}.farm-land{min-height:132px}.farm-meta{grid-template-columns:1fr}.farm-meta span{font-size:9px}.farm-name{font-size:11px}}
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
  const countdown = maturityFmtCountdown(matureAt);
  const phase = maturityEsc(land.phase_name || land.phase || '-');
  const left = Number(land.left_fruit_num || 0);
  const total = Number(land.fruit_num || 0);
  const badges = [
    pickable ? '<span class="farm-badge red">可摘</span>' : '',
    ready && !pickable ? '<span class="farm-badge red">成熟</span>' : '',
    soon ? '<span class="farm-badge gold">临近</span>' : '',
    isMutant ? '<span class="farm-badge green">变异</span>' : '',
  ].filter(Boolean).join('');

  return `<div class="${cls.join(' ')}" title="${maturityEsc(plantName)}\n成熟：${maturityEsc(maturityFmtTime(matureAt))}\n剩余：${left}/${total}\n阶段：${phase}">
    <div class="farm-no">#${maturityEsc(land.land_id)}</div>
    <div class="farm-badges">${badges}</div>
    ${imgHtml}
    <div class="farm-info">
      <div class="farm-name">${maturityEsc(plantName)}</div>
      ${hasPlant ? `<div class="farm-meta"><span>熟 ${maturityEsc(shortTime(matureAt))}</span><span>余 ${left}/${total}</span></div><div class="farm-countdown ${ready ? 'over' : ''}">${maturityEsc(countdown)}</div>${isMutant ? `<div class="farm-countdown">${maturityEsc(land.mutant_summary)}</div>` : ''}` : '<div class="farm-empty-text">未种植</div>'}
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
  if (modalTitle) modalTitle.innerHTML = `<span style="cursor:pointer" onclick="copyToClipboard('${maturityEsc(data.friend.name || '')}');this.style.color='#16a34a';setTimeout(()=>this.style.color='',1500)">${maturityEsc(data.friend.name || '未知')}</span> (${data.friend.gid}) 的土地作物详情`;

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
    modalLandGrid.innerHTML = `<div class="farm-stage" style="display:contents">${lands.map(l => renderLandCard(l, now)).join('')}</div>` || '<div class="dim">暂无土地数据</div>';
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
