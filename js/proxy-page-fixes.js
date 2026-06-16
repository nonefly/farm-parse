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

  function run() {
    addHomeButton();
  }

  document.addEventListener('DOMContentLoaded', run);
  const observer = new MutationObserver(run);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
