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

  function restoreOriginalLandLayout() {
    for (const meta of document.querySelectorAll('.plant-meta')) meta.remove();
    const style = document.getElementById('proxyMaturityOverlayStyle');
    if (style) style.remove();
  }

  function ensureCopyStyle() {
    if (document.getElementById('proxyCopyStyle')) return;
    const style = document.createElement('style');
    style.id = 'proxyCopyStyle';
    style.textContent = `.copy-friend-btn{border:0;background:#e5f7ec;color:#166534;border-radius:999px;padding:1px 6px;margin-left:5px;font-size:11px;font-weight:900;cursor:pointer;vertical-align:middle}.copy-friend-btn.done{background:#dcfce7;color:#15803d}`;
    document.head.appendChild(style);
  }

  function copyText(text, button) {
    navigator.clipboard.writeText(text || '').then(() => {
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

  function addFriendCopyButtons() {
    ensureCopyStyle();
    const cards = [...document.querySelectorAll('.bg-gray-50.rounded-lg.p-3')];
    for (const card of cards) {
      const label = card.querySelector('.text-xs.text-gray-500.mb-1');
      if (!label || label.textContent.trim() !== '好友') continue;
      const nameEl = card.querySelector('.text-sm.font-semibold.text-gray-700');
      if (!nameEl || nameEl.dataset.copyReady === '1') continue;
      const name = nameEl.textContent.trim();
      if (!name || name === '未知' || name === '待捕获') continue;
      const button = document.createElement('button');
      button.className = 'copy-friend-btn';
      button.type = 'button';
      button.textContent = '复制';
      button.title = '复制好友名称';
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        copyText(name, button);
      });
      nameEl.appendChild(button);
      nameEl.dataset.copyReady = '1';
    }
  }

  function run() {
    addHomeButton();
    restoreOriginalLandLayout();
    addFriendCopyButtons();
  }

  document.addEventListener('DOMContentLoaded', run);
  const observer = new MutationObserver(run);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setInterval(run, 500);
})();
