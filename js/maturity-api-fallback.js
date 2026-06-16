(function installMaturityApiFallback() {
  const originalFetch = window.fetch.bind(window);
  const fallbackBase = `${location.protocol}//${location.hostname}:8790`;

  function isMaturityApi(input) {
    const url = typeof input === 'string' ? input : input && input.url;
    return typeof url === 'string' && url.startsWith('/api/maturity/');
  }

  window.fetch = async function patchedFetch(input, init) {
    if (!isMaturityApi(input)) return originalFetch(input, init);

    const first = await originalFetch(input, init).catch(error => ({ ok: false, status: 0, __error: error }));
    if (first && first.ok) return first;
    if (first && first.status && first.status !== 404) return first;

    const path = typeof input === 'string' ? input : input.url;
    const fallbackUrl = `${fallbackBase}${path}`;
    return originalFetch(fallbackUrl, init);
  };
})();
