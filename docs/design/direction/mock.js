/* Phase 6 direction mockups: view, theme and language switches. Mockup-only; the app never loads this file.
   ?theme=light|dark (default: the device setting), ?lang=fr|ja (labels from i18n/fr.js and ja.js), #outfits|#closet|#care */
(function () {
  const q = new URLSearchParams(location.search);
  const theme = q.get('theme'), lang = q.get('lang') || 'en';
  if (theme === 'dark' || theme === 'light') document.documentElement.setAttribute('data-theme', theme);

  // Strings copied from the app's dictionaries (i18n/fr.js, i18n/ja.js); new mockup copy is marked "new" and stays English.
  const T = {
    fr: { 'Work': 'Travail', 'Going out': 'Sorties', 'Formal': 'Habillé', 'Sport': 'Sport', 'Home': 'Maison', 'Chores': 'Corvées',
      'Wear this': 'Porter cette tenue', 'Outfits': 'Tenues', 'Closet': 'Garde-robe', 'Care': 'Entretien', 'Shop': 'Achats',
      'Add clothes': 'Ajouter des vêtements', 'Excellent match': 'Excellent agencement', 'Fair match': 'Agencement passable',
      'Good morning': 'Bonjour', 'Wednesday': 'Mercredi', 'Why this outfit?': 'Pourquoi cette tenue?', 'In the wash': 'Au lavage',
      'Good': 'Bon', 'Like new': 'Comme neuf', 'Worn': 'Usé', 'Fixed': 'Réparé', 'Find a tailor': 'Trouver un tailleur', 'Open': 'Ouvrir',
      'Today’s pick': 'Choix du jour', 'More options': 'Plus d’options', 'New ideas': 'Nouvelles idées', 'All my styles': 'Tous mes styles',
      'Rotate': 'Alterner', 'Style': 'Style', 'Minimal': 'Minimaliste', 'Classic': 'Classique', 'Stats': 'Stats',
      'Care & donate': 'Entretien et dons', 'To repair': 'À réparer', 'All': 'Tout', 'Top': 'Haut', 'Bottom': 'Bas', 'Shoes': 'Chaussures',
      'Outerwear': 'Manteaux et vestes', 'Adjust': 'Ajuster', 'Outfit diary': 'Journal des tenues', 'Share this outfit': 'Partager cette tenue' },
    ja: { 'Work': '仕事', 'Going out': 'お出かけ', 'Formal': 'フォーマル', 'Sport': 'スポーツ', 'Home': '家', 'Chores': '家事',
      'Wear this': 'これを着る', 'Outfits': 'コーデ', 'Closet': 'クローゼット', 'Care': 'ケア', 'Shop': '買い物', 'Add clothes': '服を追加',
      'Excellent match': '相性抜群', 'Fair match': '相性まずまず', 'Good morning': 'おはようございます', 'Wednesday': '水曜日',
      'Why this outfit?': 'このコーデの理由は？', 'In the wash': '洗濯中', 'Good': '良好', 'Fixed': '修理済み', 'Find a tailor': 'お直し店を探す',
      'Open': '開く', 'Today’s pick': '今日のおすすめ', 'More options': 'その他のオプション', 'New ideas': '新しいアイデア',
      'All my styles': '自分のスタイルすべて', 'Rotate': '日替わり', 'Style': 'スタイル', 'Minimal': 'ミニマル', 'Classic': 'クラシック',
      'Stats': '統計', 'Care & donate': 'ケアと寄付', 'To repair': '要修理', 'All': 'すべて', 'Top': 'トップス', 'Bottom': 'ボトムス',
      'Shoes': '靴', 'Outerwear': 'アウター', 'Adjust': '調整', 'Outfit diary': 'コーデ日記', 'Share this outfit': 'このコーデを共有' } };
  if (T[lang]) {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-t]').forEach(el => { const v = T[lang][el.getAttribute('data-t')]; if (v) el.textContent = v; });
    document.querySelectorAll('[data-tl]').forEach(el => { const v = T[lang][el.getAttribute('data-tl')]; if (v) el.setAttribute('aria-label', v); });
  }

  // views
  const views = ['outfits', 'closet', 'care', 'shop'];
  function show() {
    const v = views.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'outfits';
    document.body.dataset.view = v;
    document.querySelectorAll('nav.tabs [data-tab]').forEach(b => { if (b.dataset.tab === v) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  }
  document.querySelectorAll('nav.tabs [data-tab]').forEach(b => b.addEventListener('click', () => { location.hash = b.dataset.tab; window.scrollTo(0, 0); }));
  addEventListener('hashchange', () => { show(); links(); }); show();

  // selection groups (occasion, style, category): the state changes; the content is fixed sample data
  document.querySelectorAll('[data-group]').forEach(g => g.addEventListener('click', e => {
    const b = e.target.closest('[data-pick]'); if (!b || !g.contains(b)) return;
    g.querySelectorAll('[data-pick]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    const label = document.querySelector('[data-menu-label]');
    if (g.hasAttribute('data-menu-list') && label) { label.textContent = b.querySelector('.m-optl').textContent; closeMenu(); }
  }));

  // occasion menu (direction C)
  const tog = document.querySelector('[data-menu-toggle]'), list = document.querySelector('[data-menu-list]');
  function closeMenu() { if (tog) { tog.setAttribute('aria-expanded', 'false'); list.hidden = true; } }
  if (tog) {
    tog.addEventListener('click', () => { const open = tog.getAttribute('aria-expanded') !== 'true'; tog.setAttribute('aria-expanded', String(open)); list.hidden = !open; if (open) (list.querySelector('[aria-pressed="true"]') || list.querySelector('button')).focus(); });
    addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
    addEventListener('click', e => { if (!e.target.closest('[data-menu-toggle],[data-menu-list]')) closeMenu(); });
  }

  // look rail (direction B): pager follows the page in view; arrows step it
  document.querySelectorAll('[data-rail]').forEach(rail => {
    const pages = [...rail.children], dots = document.querySelectorAll('[data-dot]'), count = document.querySelector('[data-count]');
    const cur = () => { const r = rail.getBoundingClientRect(); let best = 0, bd = 1e9; pages.forEach((p, k) => { const d = Math.abs(p.getBoundingClientRect().left - r.left); if (d < bd) { bd = d; best = k; } }); return best; };
    const sync = () => { const k = cur(); dots.forEach((d, i) => { if (i === k) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); }); if (count) count.textContent = (k + 1) + ' of ' + pages.length; };
    rail.addEventListener('scroll', () => { clearTimeout(rail.t); rail.t = setTimeout(sync, 60); }, { passive: true });
    const go = k => { k = (k + pages.length) % pages.length; rail.scrollTo({ left: pages[k].offsetLeft - pages[0].offsetLeft, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); };
    dots.forEach((d, i) => d.addEventListener('click', () => go(i)));
    document.querySelectorAll('[data-step]').forEach(b => b.addEventListener('click', () => go(cur() + Number(b.dataset.step))));
    rail.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { go(cur() + 1); e.preventDefault(); } if (e.key === 'ArrowLeft') { go(cur() - 1); e.preventDefault(); } });
    sync();
  });

  // footer switches keep the other parameters and the screen
  function links() { document.querySelectorAll('[data-set]').forEach(a => {
    const [k, v] = a.dataset.set.split('='); const p = new URLSearchParams(location.search);
    if (v === 'auto' || v === 'en') p.delete(k); else p.set(k, v);
    a.href = location.pathname + (p.toString() ? '?' + p : '') + location.hash;
    const now = q.get(k) || (k === 'theme' ? 'auto' : 'en'); if (now === v) a.setAttribute('aria-current', 'true');
  }); }
  links();
})();
