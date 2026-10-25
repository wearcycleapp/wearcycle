// Index page of the Phase 6 direction mockups: ?theme=light|dark sets the page theme, the screenshots and the links.
(function () {
  const q = new URLSearchParams(location.search), th = q.get('theme') === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', th);
  document.querySelectorAll('[data-theme-set]').forEach(a => { if (a.dataset.themeSet === th) a.setAttribute('aria-current', 'true'); });
  document.querySelectorAll('img[data-shot]').forEach(i => { i.src = i.dataset.shot + '-' + th + '.webp'; i.alt += th === 'dark' ? ', dark' : ', light'; });
  document.querySelectorAll('a[data-view-link]').forEach(a => { const [p, h] = a.getAttribute('href').split('#'); a.href = p + '?theme=' + th + '#' + h; });
})();
