(function installProxyPageFixes() {
  function addHomeButton() {
    const actions = document.querySelector('.actions');
    if (!actions || document.getElementById('homeButton')) return;
    const link = document.createElement('a');
    link.id = 'homeButton';
    link.className = 'btn';
    link.href = '/';
    link.textContent = '🏠 主页';
    actions.insertBefore(link, actions.firstChild);
  }

  function addReadableStyle() {
    if (document.getElementById('proxyPageFixStyle')) return;
    const style = document.createElement('style');
    style.id = 'proxyPageFixStyle';
    style.textContent = `
      .land-cell { min-height: 96px; isolation: isolate; }
      .land-cell .plant-img {
        position: absolute !important;
        inset: 8% !important;
        width: 84% !important;
        height: 84% !important;
        max-width: none !important;
        max-height: none !important;
        object-fit: contain !important;
        opacity: .20 !important;
        filter: blur(1.3px) saturate(.75) contrast(.95) !important;
        z-index: 0 !important;
        pointer-events: none !important;
      }
      .land-cell .plant-icon,
      .land-cell .plant-name,
      .land-cell .plant-phase,
      .land-cell .mutant-tags,
      .land-cell .plant-meta,
      .land-cell .mutant-badge,
      .land-cell .land-no {
        position: relative;
        z-index: 1;
      }
      .land-cell .plant-name,
      .land-cell .plant-phase,
      .land-cell .mutant-type-tag,
      .land-cell .plant-meta {
        background: rgba(255,255,255,.88) !important;
        color: #111827 !important;
        border-radius: 6px !important;
        padding: 1px 4px !important;
        text-shadow: 0 1px 1px rgba(255,255,255,.9) !important;
        box-shadow: 0 1px 3px rgba(15,23,42,.10) !important;
      }
      .land-cell .plant-name { font-size: 10px !important; max-width: 96% !important; }
      .land-cell .plant-phase { font-size: 8px !important; }
      .land-cell .plant-meta { font-size: 8px !important; line-height: 1.25 !important; font-weight: 900 !important; margin-top: 2px !important; }
      .land-cell.mutant-dark .plant-name,
      .land-cell.mutant-dark .plant-phase,
      .land-cell.mutant-dark .mutant-type-tag,
      .land-cell.mutant-dark .plant-meta {
        background: rgba(255,255,255,.90) !important;
        color: #111827 !important;
      }
    `;
    document.head.appendChild(style);
  }

  function removeDuplicateHarvestLine() {
    for (const meta of document.querySelectorAll('.plant-meta')) {
      if (meta.dataset.cleaned === '1') continue;
      meta.innerHTML = meta.innerHTML.replace(/<br>\s*收:[^<]*/g, '');
      meta.dataset.cleaned = '1';
    }
  }

  function run() {
    addHomeButton();
    addReadableStyle();
    removeDuplicateHarvestLine();
  }

  document.addEventListener('DOMContentLoaded', run);
  const observer = new MutationObserver(run);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setInterval(run, 800);
})();
