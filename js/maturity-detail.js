function injectMaturityDetailStyle() {
  if (document.getElementById('maturityDetailStyle')) return;
  const style = document.createElement('style');
  style.id = 'maturityDetailStyle';
  style.textContent = `
    .land{min-height:132px}.land.mutant{background:linear-gradient(135deg,#fef3c7,#fff7ed);border-color:#f59e0b}.plant-icon{font-size:24px;margin-top:10px}.tags{display:flex;gap:4px;flex-wrap:wrap;margin-top:6px}.tags span{font-size:10px;border-radius:999px;background:#e5e7eb;color:#374151;padding:2px 6px;font-weight:800}.tags .tag-red{background:#fee2e2;color:#b91c1c}.tags .tag-green{background:#dcfce7;color:#166534}.friend-summary{padding:12px 16px;border-bottom:1px solid #eef2f7;color:#475569;font-size:13px;line-height:1.7}.friend-summary b{color:#111827}`;
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

function closeFriendModal() {
  const modal = document.getElementById('friendModal');
  if (modal) modal.style.display = 'none';
}

async function renderEnhancedFriendDetail(gid) {
  injectMaturityDetailStyle();
  try {
    const data = await maturityGetFriendDetail(gid);
    const modal = document.getElementById('friendModal');
    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) modalTitle.textContent = `${data.friend.name || '未知'} (${data.friend.gid}) 的土地作物详情`;

    const lands = data.lands || [];
    const now = Date.now();
    const plantTotal = lands.filter(l => Number(l.has_plant) === 1).length;
    const readyTotal = lands.filter(l => Number(l.mature_at || 0) > 0 && Number(l.mature_at) <= now).length;
    const harvestableTotal = lands.filter(l => isLandHarvestable(l, now)).length;
    const modalLandSummary = document.getElementById('modalLandSummary');
    if (modalLandSummary) modalLandSummary.innerHTML = `作物 <b>${plantTotal}</b> 块，已成熟 <b>${readyTotal}</b> 块，成熟可摘 <b>${harvestableTotal}</b> 块，最近抓包：${maturityFmtTime(data.friend.last_seen_at)}`;

    const modalLandGrid = document.getElementById('modalLandGrid');
    if (modalLandGrid) {
      modalLandGrid.innerHTML = lands.map(l => {
        const matureAt = Number(l.mature_at || 0);
        const ready = matureAt > 0 && matureAt <= now;
        const harvestable = isLandHarvestable(l, now);
        const soon = matureAt > now && matureAt - now < 10 * 60 * 1000;
        const hasPlant = Number(l.has_plant) === 1;
        const cls = ready ? 'land ready' : soon ? 'land soon' : l.mutant_summary ? 'land mutant' : 'land';
        return `<div class="${cls}"><div class="no">#${l.land_id}</div><div class="plant-icon">${hasPlant ? plantIcon(l.plant_name) : '🟫'}</div><div class="name">${maturityEsc(hasPlant ? l.plant_name : '空地')}</div><div class="tags"><span>${maturityEsc(l.phase_name || l.phase || '-')}</span>${harvestable ? '<span class="tag-red">成熟可摘</span>' : ''}${ready ? '<span class="tag-red">已成熟</span>' : ''}${l.mutant_summary ? '<span class="tag-green">变异</span>' : ''}</div><div class="time">成熟：${maturityFmtTime(matureAt)}<br>倒计时：${maturityFmtCountdown(matureAt)}<br>剩余果实：${l.left_fruit_num || 0}/${l.fruit_num || 0}${l.mutant_summary ? '<br><span class="mutant">变异：'+maturityEsc(l.mutant_summary)+'</span>' : ''}</div></div>`;
      }).join('') || '<div class="dim">暂无土地数据</div>';
    }

    if (modal) modal.style.display = 'flex';
  } catch {}
}

window.addEventListener('DOMContentLoaded', () => {
  injectMaturityDetailStyle();
  window.selectFriend = async function(gid) {
    try {
      await renderEnhancedFriendDetail(gid);
    } catch (err) {
      alert(err.message || String(err));
    }
  };
});
