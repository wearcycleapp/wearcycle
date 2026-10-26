#!/usr/bin/env node
// Wearcycle visual and functional check (redesign plan v2.2, Phase 2). Runs in Claude's container with Playwright.
// Test-only: never listed in sw.js, never loaded by the app.
//
//   node tools/check.mjs [--worst-case] [--compare <folder> [--exact]] [--baseline <summary.json>] [--strict]
//                        [--out <folder>] [--full-page] [--css-pixels] [--devices a,b] [--views a,b] [--no-axe] [--no-detector]
//                        [--stub-auth] [--base-url <url>]
//
// Deterministic: fixed clock (closet.json "now"), stubbed Open-Meteo (fixtures/weather.json), the fixture closet
// (fixtures/closet.json) in place of the Supabase items, wears and settings, animations off, service worker blocked.
// Every request to Supabase except sign-in is answered locally, so a run never writes to a real account.
// Sign-in uses WEARCYCLE_TEST_EMAIL / WEARCYCLE_TEST_PASSWORD from the environment. When Supabase cannot be reached
// (or the variables are unset, or --stub-auth), the sign-in request is answered with a local fake session instead,
// and the summary says so. Screenshots and reports go outside the repository (default: <tmp>/wearcycle-check/),
// except the Phase 4 baseline under docs/design/baseline/, which must be captured with --css-pixels (one pixel per CSS
// pixel, keeps it small); --compare refuses a run whose pixel scale differs from the baseline's.
// --compare uses pixelmatch at threshold 0.1, which hides small color changes (the Phase 5 --warn change was invisible
// to it). --compare <folder> --exact counts every pixel whose color differs at all, per screenshot, and fails on any.
// It needs a "before" captured by this script in the same browser build: Chromium is launched with
// --disable-partial-raster, because with partial raster two runs of unchanged code differed by up to 44 color levels
// on chip and image edges in 6 to 10 of 20 screenshots (measured 2026-10-25, Chromium 1243); without it, 4 repeat
// runs were identical to the pixel. --exact therefore ignores nothing.
// Detector: warnings and advisories are counted separately; only warnings gate (against --baseline). Elements hidden in
// the rendered screens (display: none, which includes [hidden], or visibility: hidden) are removed from the screen
// snapshots before the scan, because nobody sees them.
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDeps } from './deps.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIX = path.join(REPO, 'tools', 'fixtures');

/* ---------- options ---------- */
const argv = process.argv.slice(2);
const flag = n => argv.includes('--' + n);
const opt = n => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : undefined; };
const A = {
  worstCase: flag('worst-case'), compare: opt('compare'), exact: flag('exact'), baseline: opt('baseline'), strict: flag('strict'),
  fullPage: flag('full-page'), cssPixels: flag('css-pixels'), noAxe: flag('no-axe'), noDetector: flag('no-detector'), stubAuth: flag('stub-auth'),
  baseUrl: opt('base-url'), devices: opt('devices'), views: opt('views'),
  out: path.resolve(opt('out') || path.join(os.tmpdir(), 'wearcycle-check', flag('worst-case') ? 'worst-case' : 'run')),
};
const inside = (p, dir) => { const r = path.relative(dir, p); return r === '' || (!r.startsWith('..') && !path.isAbsolute(r)); };
const BASELINE_DIR = path.join(REPO, 'docs', 'design', 'baseline');
if (inside(A.out, REPO) && !inside(A.out, BASELINE_DIR)) {
  console.error('--out must be outside the repository (or under docs/design/baseline for Phase 4).'); process.exit(2);
}
if (A.exact && !A.compare) { console.error('--exact goes with --compare <folder>.'); process.exit(2); }
if (inside(A.out, BASELINE_DIR) && !A.cssPixels) {
  console.error('The committed baseline (docs/design/baseline) is captured with --css-pixels.'); process.exit(2);
}

/* ---------- fixtures and app facts ---------- */
const CLOSET = JSON.parse(readFileSync(path.join(FIX, 'closet.json'), 'utf8'));
const WEATHER = readFileSync(path.join(FIX, 'weather.json'), 'utf8');
const WORST = JSON.parse(readFileSync(path.join(FIX, 'worst-case.json'), 'utf8'));
const NOW = new Date(CLOSET.now);
const CFG_SRC = readFileSync(path.join(REPO, 'config.js'), 'utf8');
const SB_URL = (CFG_SRC.match(/supabaseUrl:\s*'([^']+)'/) || [])[1];
const SB_HOST = SB_URL ? new URL(SB_URL).host : 'invalid.supabase.co';

const DEVICES = [
  { id: 'phone-360', width: 360, height: 800, dpr: 3, touch: true },
  { id: 'phone-390', width: 390, height: 844, dpr: 3, touch: true },
  { id: 'phone-land', width: 844, height: 390, dpr: 3, touch: true }, // the 390x844 phone turned sideways (Phase 7)
  { id: 'ipad-820', width: 820, height: 1180, dpr: 2, touch: true },
  { id: 'ipad-1180', width: 1180, height: 820, dpr: 2, touch: true },
  { id: 'win-1366', width: 1366, height: 768, dpr: 1, touch: false },
  { id: 'win-1920', width: 1920, height: 1080, dpr: 1, touch: false },
];
const DEV = Object.fromEntries(DEVICES.map(d => [d.id, d]));
const VIEWS = ['outfits', 'closet', 'care', 'shop', 'preview', 'editor', 'settings'];
const pickList = (all, s) => s ? all.filter(x => s.split(',').includes(x.id || x)) : all;
const devices = pickList(DEVICES, A.devices), views = pickList(VIEWS, A.views);

/* ---------- results ---------- */
const R = { checks: [], captures: [], console: [], unexpectedHosts: new Set(), writes: [], functions: [], expected404: new Set(), auth: {}, snapHidden: {}, render: {}, compare: null };
// Full raster on every repaint: partial raster reuses earlier tile pixels and made repeat runs differ (see the top).
const CHROMIUM_ARGS = ['--disable-partial-raster'];
function check(name, status, detail) { R.checks.push({ name, status, detail: detail || '' }); console.log(status.padEnd(6) + ' ' + name + (detail ? ': ' + String(detail).split('\n')[0].slice(0, 220) : '')); }
async function step(name, fn) { try { const d = await fn(); check(name, 'PASS', d); } catch (e) { check(name, 'FAIL', e && e.message || String(e)); } }
const assert = (c, m) => { if (!c) throw new Error(m); };

/* ---------- local server ---------- */
function freePort() { return new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); }); }
async function startServer() {
  if (A.baseUrl) return { base: A.baseUrl.replace(/\/$/, ''), stop() {} };
  const port = await freePort();
  const proc = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1', '--directory', REPO], { stdio: 'ignore' });
  const base = 'http://127.0.0.1:' + port;
  for (let k = 0; k < 50; k++) { try { const r = await fetch(base + '/index.html'); if (r.ok) break; } catch {} await new Promise(r => setTimeout(r, 100)); }
  return { base, stop() { proc.kill(); } };
}

/* ---------- data per scenario ---------- */
function scenario(name) {
  const base = { items: CLOSET.items, wears: CLOSET.wears, settings: CLOSET.settings, missing: new Set() };
  if (!name) return base;
  const sc = WORST.scenarios[name]; let d = sc.from ? scenario(sc.from) : { ...base };
  d = { ...d, items: (sc.items || d.items).map(i => ({ ...i, body: { ...i.body } })), wears: sc.wears || d.wears, missing: new Set(d.missing) };
  for (const [id, n] of Object.entries(sc.rename || {})) { const it = d.items.find(i => i.id === id); if (it) it.body.name = n; }
  for (const id of sc.dropThumb || []) { const it = d.items.find(i => i.id === id); if (it) it.body.thumb = ''; }
  for (const id of sc.missingFiles || []) d.missing.add(id);
  if (sc.count) { const src = d.items; d.items = Array.from({ length: sc.count }, (_, k) => { const s = src[k % src.length];
    return { ...s, id: 'wc-' + String(k + 1).padStart(3, '0'), body: { ...s.body, name: s.body.name + ' ' + (k + 1) } }; }); d.wears = []; }
  return d;
}
function userTexts(data) { return data.items.map(i => String(i.body.name || '').trim()).filter(Boolean).concat([CLOSET.user.email, 'Wearcycle', (data.settings.wx || {}).label || '']).filter(Boolean); }

/* ---------- network stubs ---------- */
const json = (route, obj, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(obj) });
function b64url(o) { return Buffer.from(JSON.stringify(o)).toString('base64url'); }
function fakeSession(email) {
  const iat = Math.floor(NOW.getTime() / 1000), exp = iat + 365 * 86400;
  const user = { id: CLOSET.user.id, aud: 'authenticated', role: 'authenticated', email, email_confirmed_at: '2026-03-01T12:00:00Z',
    app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {}, created_at: '2026-03-01T12:00:00Z', updated_at: '2026-03-01T12:00:00Z' };
  const token = b64url({ alg: 'HS256', typ: 'JWT' }) + '.' + b64url({ sub: user.id, email, role: 'authenticated', aud: 'authenticated', iat, exp }) + '.fixture';
  return { access_token: token, token_type: 'bearer', expires_in: exp - iat, expires_at: exp, refresh_token: 'fixture-refresh', user };
}
function makeRouter(base, data) {
  const baseOrigin = new URL(base).origin;
  return async route => {
    const req = route.request(), u = new URL(req.url()), m = req.method();
    if (u.origin === baseOrigin) return route.continue();
    if (u.host === SB_HOST) {
      const p = u.pathname;
      if (p.startsWith('/auth/v1/')) {
        if (p === '/auth/v1/logout') return route.fulfill({ status: 204, body: '' });
        if (R.auth.mode === 'real') return route.continue();
        if (p === '/auth/v1/token') { let email = CLOSET.user.email; try { email = req.postDataJSON().email || email; } catch {} return json(route, fakeSession(email)); }
        if (p === '/auth/v1/user') return json(route, fakeSession(CLOSET.user.email).user);
        return json(route, {});
      }
      if (p.startsWith('/rest/v1/')) {
        const table = p.slice(9);
        if (m === 'GET' || m === 'HEAD') {
          if (table === 'items') return json(route, data.items.map(i => ({ id: i.id, body: i.body, updated_at: '2026-10-13T12:00:00Z' })));
          if (table === 'wears') return json(route, data.wears);
          if (table === 'settings') { const row = { body: data.settings }; return json(route, /vnd\.pgrst\.object/.test(req.headers()['accept'] || '') ? row : [row]); }
          return json(route, []);
        }
        R.writes.push(m + ' ' + table);
        if (m === 'POST' && /return=representation/.test(req.headers()['prefer'] || '')) {
          let b = []; try { b = JSON.parse(req.postData() || '[]'); } catch {}
          return json(route, (Array.isArray(b) ? b : [b]).map((r, k) => ({ id: 99000 + k, ...r })), 201);
        }
        return route.fulfill({ status: m === 'POST' ? 201 : 204, body: '' });
      }
      if (p.startsWith('/storage/v1/')) {
        const rest = decodeURIComponent(p.slice('/storage/v1/'.length));
        if (m === 'POST' && rest.startsWith('object/sign/')) return json(route, { signedURL: '/object/sign/' + rest.slice('object/sign/'.length) + '?token=fixture' });
        if (m === 'GET' || m === 'HEAD') {
          const name = path.basename(rest), id = name.replace(/(-cut)?\.[a-z]+$/, ''), file = path.join(FIX, 'img', name);
          if (!data.missing.has(id) && existsSync(file)) return route.fulfill({ status: 200, contentType: name.endsWith('.webp') ? 'image/webp' : 'image/jpeg', body: readFileSync(file) });
          R.expected404.add(req.url());
          return json(route, { statusCode: '404', error: 'not_found', message: 'Object not found' }, 404);
        }
        R.writes.push(m + ' storage'); return json(route, {});
      }
      if (p.startsWith('/functions/v1/')) { R.functions.push(p); return json(route, { error: 'stubbed by tools/check.mjs' }, 503); }
      return json(route, {}, 404);
    }
    if (u.host === 'api.open-meteo.com') return route.fulfill({ status: 200, contentType: 'application/json', body: WEATHER });
    if (u.host === 'geocoding-api.open-meteo.com' || u.host === 'api.zippopotam.us') return route.fulfill({ status: 404, body: '' });
    R.unexpectedHosts.add(u.host);
    return route.abort('blockedbyclient');
  };
}

/* ---------- browser helpers ---------- */
let PW, AxeBuilder, PNG, pixelmatch;
async function newContext(browser, base, dev, { theme = 'light', lang = 'en', data, storageState } = {}) {
  const ctx = await browser.newContext({
    viewport: { width: dev.width, height: dev.height }, deviceScaleFactor: dev.dpr, isMobile: dev.touch, hasTouch: dev.touch,
    locale: CLOSET.locale, timezoneId: CLOSET.timezone, colorScheme: theme, reducedMotion: 'reduce', serviceWorkers: 'block', storageState,
  });
  await ctx.clock.setFixedTime(NOW);
  await ctx.addInitScript(({ theme, lang }) => {
    try {
      if (sessionStorage.getItem('wc-check')) return; // only on the first load of the tab, so in-app switches survive a reload
      sessionStorage.setItem('wc-check', '1');
      localStorage.setItem('wearcycle.theme', theme); localStorage.setItem('wearcycle.lang', lang);
      localStorage.setItem('wearcycle.known', 'true'); localStorage.setItem('wardrobe.installDismissed', 'true');
      if (lang !== 'en') localStorage.setItem('wearcycle.i18nDebug', '1'); else localStorage.removeItem('wearcycle.i18nDebug');
    } catch (e) {}
  }, { theme, lang });
  await ctx.route('**/*', makeRouter(base, data));
  return ctx;
}
function watchConsole(page, where) {
  page.on('console', msg => {
    if (msg.type() !== 'error') return;
    const loc = msg.location() && msg.location().url;
    if (/Failed to load resource/.test(msg.text()) && loc && R.expected404.has(loc)) return; // a fixture photo that is missing on purpose
    R.console.push({ where: where(), text: msg.text().slice(0, 300) });
  });
  page.on('pageerror', err => R.console.push({ where: where(), text: 'Uncaught: ' + String(err && err.message || err).slice(0, 300) }));
}
async function settle(page) {
  await page.evaluate(async () => {
    const quiet = ms => new Promise(res => { let t; const done = () => { mo.disconnect(); res(); }; const mo = new MutationObserver(() => { clearTimeout(t); t = setTimeout(done, ms); });
      mo.observe(document, { subtree: true, childList: true, attributes: true, characterData: true }); t = setTimeout(done, ms); });
    const deadline = performance.now() + 9000;
    await document.fonts.ready;
    // Cut-outs arrive after the first paint: hydrateCuts (app.js) downloads each one and swaps its <img data-cut>
    // from the photo thumbnail to a blob: URL, or marks the piece missing. Wait for every slot to resolve.
    const cutsPending = () => [...document.querySelectorAll('img[data-cut]')].filter(i => !(i.src.startsWith('blob:') && i.complete)
      && !(typeof CUT !== 'undefined' && CUT.missing.has(i.dataset.cut))).length;
    while (cutsPending() && performance.now() < deadline) await new Promise(r => setTimeout(r, 100));
    let sig = '';
    for (let k = 0; k < 12 && performance.now() < deadline; k++) {
      await quiet(250);
      const imgs = [...document.images].filter(i => i.getClientRects().length);
      await Promise.all(imgs.map(i => i.complete ? null : new Promise(r => { i.addEventListener('load', r, { once: true }); i.addEventListener('error', r, { once: true }); setTimeout(r, 3000); })));
      const now = imgs.map(i => i.currentSrc.slice(0, 64) + i.complete).join('|') + document.body.innerHTML.length;
      if (now === sig) break; sig = now;
    }
    return cutsPending();
  });
}
async function waitApp(page) {
  await page.waitForSelector('#appRoot:not([hidden])', { timeout: 20000 });
  await page.waitForFunction(() => { const f = document.querySelector('#fits'); return f && !/Loading/.test(f.textContent) && (f.querySelector('.fit.hero') || f.querySelector('.empty')); }, null, { timeout: 20000 });
  await settle(page);
}
const sheetOpen = page => page.evaluate(() => !!document.querySelector('#sheetRoot .sheet'));
async function closeSheet(page) { if (!(await sheetOpen(page))) return; await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('#sheetRoot').innerHTML, null, { timeout: 5000 }); }
// Settings: the header button with the bottom bar, the rail's last button with the rail (Phase 7).
const SETTINGS_BTN = '#rulesBtn:visible, #railSettings:visible';
async function goTab(page, tab) { await closeSheet(page); await page.click('nav.tabs button[data-tab="' + tab + '"]'); await page.waitForSelector('#tab-' + tab + ':not([hidden])'); }
async function openSheetBy(page, selector) { await page.click(selector); await page.waitForSelector('#sheetRoot .sheet', { timeout: 5000 }); }

/* ---------- sign-in ---------- */
async function signIn(browser, base, data) {
  const email = process.env.WEARCYCLE_TEST_EMAIL, pass = process.env.WEARCYCLE_TEST_PASSWORD;
  R.auth = { mode: email && pass && !A.stubAuth ? 'real' : 'stub', reason: !email || !pass ? 'WEARCYCLE_TEST_EMAIL / WEARCYCLE_TEST_PASSWORD not set' : A.stubAuth ? '--stub-auth' : '' };
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctx = await newContext(browser, base, DEV['phone-390'], { data });
    const page = await ctx.newPage(); let failure = ''; const logged = R.console.length;
    watchConsole(page, () => 'sign-in');
    page.on('requestfailed', r => { if (/\/auth\/v1\/token/.test(r.url())) failure = r.failure() && r.failure().errorText || 'request failed'; });
    await page.goto(base + '/index.html');
    await page.waitForSelector('#g-email', { timeout: 15000 });
    if (await page.$('#g-mode-in')) await page.click('#g-mode-in');
    await page.fill('#g-email', R.auth.mode === 'real' ? email : CLOSET.user.email);
    await page.fill('#g-pass', R.auth.mode === 'real' ? pass : 'fixture-password');
    await page.click('#g-in');
    const ok = await page.waitForSelector('#appRoot:not([hidden])', { timeout: 15000 }).then(() => true, () => false);
    if (ok) {
      await waitApp(page);
      const state = await ctx.storageState();
      for (const o of state.origins) o.localStorage = o.localStorage.filter(kv => !/^wardrobe\.cache\.|^wearcycle\.wx$/.test(kv.name));
      await ctx.close();
      if (R.auth.mode === 'real') R.auth.reason = 'signed in to Supabase; data requests answered from the fixture closet';
      return state;
    }
    const err = (await page.textContent('#g-err').catch(() => '')) || '';
    await ctx.close();
    if (R.auth.mode !== 'real') throw new Error('Stubbed sign-in did not reach the app: ' + err);
    // The failed attempt's own console errors (the refused request) are expected; the reason below records them.
    R.console.splice(logged);
    R.auth = { mode: 'stub', reason: 'real sign-in failed (' + (failure || err.trim() || 'no response') + '); Supabase answered with a local fake session' };
    // Credentials are never printed or saved. The retry signs in as the fixture user, answered locally.
  }
}

/* ---------- per-capture measurements ---------- */
// English left in fr/ja: a visible text node the translation layer could not match (I18N.missing, enabled with
// wearcycle.i18nDebug) that reads as English: two or more English function words, or the exact text of a literal in
// the app source. Dates and places the browser formats in French, piece names and the brand are not counted.
const SOURCE = ['app.js', 'logic.js', 'index.html'].map(f => readFileSync(path.join(REPO, f), 'utf8')).join('\n');
async function pageFacts(page, lang, texts, inSheet) {
  return page.evaluate(({ lang, texts, inSheet, source }) => {
    const root = inSheet && document.querySelector('#sheetRoot .sheet') || document.body;
    const W = innerWidth, out = { overflowX: document.documentElement.scrollWidth - W, wide: [], truncated: [], userTruncated: [], spilling: [], english: [] };
    const sel = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.classList.length ? '.' + [...el.classList].slice(0, 2).join('.') : '');
    const scroller = el => { for (let p = el.parentElement; p; p = p.parentElement) { const s = getComputedStyle(p).overflowX; if (s === 'auto' || s === 'scroll') return true; } return false; };
    for (const el of document.body.querySelectorAll('*')) {
      if (!el.checkVisibility || !el.checkVisibility()) continue;
      const r = el.getBoundingClientRect(); if (!r.width) continue;
      if (out.overflowX > 1 && r.right > W + 1 && !scroller(el) && getComputedStyle(el).position !== 'fixed') out.wide.push(sel(el));
      if (!root.contains(el)) continue;
      const hasText = [...el.childNodes].some(n => n.nodeType === 3 && /\S/.test(n.nodeValue));
      if (!hasText || el.scrollWidth <= el.clientWidth + 1 || el.clientWidth === 0) continue;
      const cs = getComputedStyle(el); if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') continue;
      const t = el.textContent.trim(), cut = cs.textOverflow === 'ellipsis' || cs.webkitLineClamp !== 'none';
      // A piece name the user typed may end in an ellipsis (listed apart); app text may not, and nothing may spill.
      (cut ? (texts.includes(t) ? out.userTruncated : out.truncated) : out.spilling).push(sel(el) + ' "' + t.slice(0, 60) + '"');
    }
    out.wide = [...new Set(out.wide)].slice(0, 8);
    if (lang !== 'en') {
      const miss = window.I18N && I18N.missing; const seen = new Set();
      const FW = /^(the|of|to|with|without|and|or|is|are|was|be|your|you|this|that|it|its|not|from|by|will|can|about|then|each|when|what|how|which|has|have|do|after|before|into|until|only|more)$/i;
      const english = t => { const words = t.toLowerCase().match(/[a-z']+/g) || []; return new Set(words.filter(w => FW.test(w))).size >= 2
        || (t.length >= 4 && ["'" + t + "'", '"' + t + '"', '>' + t + '<', '`' + t + '`'].some(q => source.includes(q))); };
      if (!miss) out.english = ['(translation debug list unavailable)'];
      else {
        const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
        while ((n = w.nextNode())) {
          const el = n.parentElement; if (!el || el.closest('[data-notr],script,style,svg') || !el.checkVisibility()) continue;
          const t = n.nodeValue.trim(); if (!t || !miss.has(t) || seen.has(t)) continue;
          if (texts.some(u => t === u || t.includes(u)) || /^Wearcycle( v[\d.]+)?$/.test(t) || !english(t)) continue;
          seen.add(t);
        }
        out.english = [...seen];
      }
    }
    return out;
  }, { lang, texts, inSheet, source: SOURCE });
}
async function axe(page, sheet) {
  let b = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']);
  if (sheet) b = b.include('#sheetRoot'); // a sheet view counts only the sheet; the tab behind it has its own capture
  const res = await b.analyze();
  return res.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')
    .map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, targets: v.nodes.slice(0, 3).map(n => n.target.join(' ')) }));
}

/* ---------- views ---------- */
async function openView(page, view) {
  if (['outfits', 'closet', 'care', 'shop'].includes(view)) { await goTab(page, view); return true; }
  if (view === 'preview') { await goTab(page, 'outfits'); const s = await page.$('.fit.hero [data-swap][data-slot="top"]') || await page.$('.fit.hero [data-swap]'); if (!s) return false; await s.click(); await page.waitForSelector('#sheetRoot .sheet'); return true; }
  if (view === 'editor') { await goTab(page, 'closet'); const c = await page.$('#closetGrid .card'); if (!c) return false; await c.click(); await page.waitForSelector('#sheetRoot .sheet'); return true; }
  if (view === 'settings') { await goTab(page, 'outfits'); await openSheetBy(page, SETTINGS_BTN); return true; }
  return false;
}
async function captureSet(browser, base, state, { dev, theme, lang, data, tag, snapshots, runAxe }) {
  const ctx = await newContext(browser, base, dev, { theme, lang, data, storageState: state });
  const page = await ctx.newPage(); let where = tag;
  watchConsole(page, () => where);
  await page.goto(base + '/index.html'); await waitApp(page);
  const texts = userTexts(data);
  for (const view of views) {
    where = tag + '-' + view;
    const cap = { name: where, device: dev.id, theme, lang, view };
    try {
      if (!(await openView(page, view))) { cap.na = true; R.captures.push(cap); continue; }
      await page.evaluate(() => window.scrollTo(0, 0));
      const pending = await settle(page); if (pending) cap.cutsPending = pending; // screenshot may differ between runs
      const file = path.join(A.out, 'screens', where + '.png');
      await page.screenshot({ path: file, fullPage: A.fullPage, scale: A.cssPixels ? 'css' : 'device', animations: 'disabled', caret: 'hide' });
      const inSheet = ['preview', 'editor', 'settings'].includes(view);
      Object.assign(cap, await pageFacts(page, lang, texts, inSheet));
      if (runAxe && !A.noAxe) cap.axe = await axe(page, inSheet);
      if (snapshots) { // static copy for the detector: scripts removed, blob: images (cut-outs) inlined as data URLs,
        // hidden elements removed (only what is on screen counts)
        const { html, hidden } = await page.evaluate(() => {
          const live = [...document.images], d = document.documentElement.cloneNode(true), copies = [...d.querySelectorAll('img')];
          live.forEach((im, k) => { if (!im.currentSrc.startsWith('blob:') || !im.naturalWidth || !copies[k]) return;
            const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im, 0, 0); copies[k].src = c.toDataURL('image/webp'); });
          // Hidden: display none (styles.css makes [hidden] display:none !important), or visibility hidden with nothing
          // visible inside. The copy has the same document order as the page, so index k matches. Parts of an SVG are
          // left alone (they are drawn through their svg); a removed element takes its descendants with it.
          const liveEls = [...document.body.querySelectorAll('*')], copyEls = [...d.querySelector('body').querySelectorAll('*')];
          let hidden = 0;
          liveEls.forEach((el, k) => {
            const c = copyEls[k]; if (!c || el.ownerSVGElement || !d.contains(c)) return;
            const cs = getComputedStyle(el), invisible = cs.visibility === 'hidden' || cs.visibility === 'collapse';
            if (cs.display === 'none' || (invisible && ![...el.querySelectorAll('*')].some(x => getComputedStyle(x).visibility === 'visible'))) { c.remove(); hidden++; }
          });
          d.querySelectorAll('script').forEach(s => s.remove()); return { html: '<!doctype html>\n' + d.outerHTML, hidden }; });
        writeFileSync(path.join(A.out, 'snapshots', view + '.html'), html);
        R.snapHidden[view] = hidden;
      }
    } catch (e) { cap.error = String(e && e.message || e).split('\n')[0]; }
    R.captures.push(cap);
  }
  await ctx.close();
}

/* ---------- functional flows (phone-390, light, English) ---------- */
async function flows(browser, base, state, data) {
  const ctx = await newContext(browser, base, DEV['phone-390'], { data, storageState: state });
  const page = await ctx.newPage(); let where = 'flows';
  watchConsole(page, () => where);
  await page.goto(base + '/index.html'); await waitApp(page);

  { // Definition of done (UI_REVIEW.md): a gate like axe, compared with the baseline rather than failing the tooling.
    where = 'flows-wear-this';
    const r = await page.evaluate(() => { const b = document.querySelector('.fit.hero [data-wear]'); if (!b) return { missing: true };
      const x = b.getBoundingClientRect(); const cx = x.left + x.width / 2, cy = x.top + x.height / 2;
      const top = cy >= 0 && cy < innerHeight ? document.elementFromPoint(cx, cy) : null;
      return { top: Math.round(x.top), bottom: Math.round(x.bottom), vh: innerHeight, onTop: !!top && b.contains(top) }; });
    R.wearThis = { visible: !r.missing && r.bottom <= r.vh && r.top >= 0 && r.onTop,
      detail: r.missing ? 'no "Wear this" button on Outfits' : 'button at ' + r.top + '-' + r.bottom + 'px, viewport ' + r.vh + 'px' + (r.onTop ? '' : ', covered or off screen') };
  }
  await step('Every tab opens', async () => {
    for (const t of ['closet', 'care', 'shop', 'outfits']) {
      where = 'flows-tab-' + t; await goTab(page, t);
      const ok = await page.evaluate(t => document.querySelector('nav.tabs button[data-tab="' + t + '"]').getAttribute('aria-current') === 'page'
        && [...document.querySelectorAll('section.tab')].every(s => s.hidden === (s.id !== 'tab-' + t)), t);
      assert(ok, t + ' did not become the only visible tab');
    }
    return 'outfits, closet, care, shop';
  });
  await step('Occasion change re-renders the outfits', async () => {
    where = 'flows-occasion';
    const before = await page.evaluate(() => ({ occ: document.querySelector('#occChips [aria-pressed="true"]')?.dataset.occ, pieces: [...document.querySelectorAll('.fit.hero [data-swap]')].map(b => b.getAttribute('aria-label')).join('|') }));
    const target = before.occ === 'out' ? 'work' : 'out';
    await page.click('#occChips [data-occ="' + target + '"]'); await settle(page);
    const after = await page.evaluate(() => ({ occ: document.querySelector('#occChips [aria-pressed="true"]')?.dataset.occ, pieces: [...document.querySelectorAll('.fit.hero [data-swap]')].map(b => b.getAttribute('aria-label')).join('|') }));
    assert(after.occ === target, 'chip "' + target + '" not pressed');
    assert(after.pieces && after.pieces !== before.pieces, 'hero outfit unchanged after switching ' + before.occ + ' to ' + target);
    await page.click('#occChips [data-occ="' + before.occ + '"]'); await settle(page);
    return before.occ + ' to ' + target + ' and back';
  });
  await step('Piece preview, Swap and Back to suggestion', async () => {
    where = 'flows-swap'; await goTab(page, 'outfits');
    await page.click('.fit.hero [data-swap][data-slot="top"]'); await page.waitForSelector('#sheetRoot .sheet');
    const name1 = (await page.textContent('#sheetRoot .sheet h3')).trim();
    await page.click('#sheetRoot [data-pstep="1"]'); await page.waitForTimeout(150); await settle(page);
    const name2 = (await page.textContent('#sheetRoot .sheet h3')).trim();
    assert(name2 && name2 !== name1, 'Swap kept "' + name1 + '"');
    await closeSheet(page);
    assert(await page.$('.fit.hero [data-revert]'), 'no "Back to suggestion" after a swap');
    await page.click('.fit.hero [data-revert]'); await settle(page);
    assert(!(await page.$('.fit.hero [data-revert]')), '"Back to suggestion" did not restore the outfit');
    return '"' + name1 + '" swapped for "' + name2 + '", then restored';
  });
  await step('Each sheet opens and closes', async () => {
    const SHEETS = [
      ['Settings', null, SETTINGS_BTN], ['Adjust', 'outfits', '.fit.hero [data-act="adjust"]'], ['Outfit diary', 'outfits', '[data-act="diary"]'],
      ['Weather', 'outfits', '[data-wx="edit"]'], ['What I wore', 'outfits', '[data-act="logOther"]'], ['Piece preview', 'outfits', '.fit.hero [data-swap]'],
      ['Item editor', 'closet', '#closetGrid .card'], ['Closet stats', 'closet', '[data-act="stats"]'], ['Add clothes', 'closet', '#addBtn'],
      ['Your style', 'settings', '[data-act="styles"]'], ['How Wearcycle decides', 'settings', '[data-act="help"]'], ['Style palette', 'adjust', '[data-act="palettes"]'],
    ];
    const done = [];
    for (const [label, where_, sel] of SHEETS) {
      where = 'flows-sheet-' + label;
      await closeSheet(page);
      if (where_ === 'settings') await openSheetBy(page, SETTINGS_BTN);
      else if (where_ === 'adjust') { await goTab(page, 'outfits'); await openSheetBy(page, '.fit.hero [data-act="adjust"]'); }
      else if (where_) await goTab(page, where_);
      const el = await page.$(sel); assert(el, label + ': control ' + sel + ' not found');
      await el.click(); await page.waitForSelector('#sheetRoot .sheet', { timeout: 5000 });
      await closeSheet(page); done.push(label);
    }
    await openSheetBy(page, SETTINGS_BTN);
    const x = await page.$('#sheetRoot [data-close]'); assert(x, 'Settings has no close button');
    await x.click(); await page.waitForFunction(() => !document.querySelector('#sheetRoot').innerHTML);
    return done.length + ' sheets (Escape), plus the close button';
  });
  await step('Theme switches (Settings, Appearance)', async () => {
    where = 'flows-theme'; await closeSheet(page); await openSheetBy(page, SETTINGS_BTN);
    const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await page.click('[data-theme-set="dark"]'); await page.waitForTimeout(50);
    const dark = await bg(); assert(dark === 'rgb(18, 22, 30)', 'dark background is ' + dark);
    await page.click('[data-theme-set="light"]'); await page.waitForTimeout(50);
    const light = await bg(); assert(light === 'rgb(246, 244, 241)', 'light background is ' + light);
    await closeSheet(page); return 'dark ' + dark + ', light ' + light;
  });
  await step('Language switches (Settings, Language)', async () => {
    where = 'flows-language'; await closeSheet(page); await openSheetBy(page, SETTINGS_BTN);
    await Promise.all([page.waitForEvent('load'), page.selectOption('#langSel', 'fr')]); await waitApp(page);
    const fr = await page.evaluate(() => ({ lang: document.documentElement.lang, tab: document.querySelector('nav.tabs button[data-tab="outfits"]').textContent.trim() }));
    assert(fr.lang === 'fr' && fr.tab !== 'Outfits', 'French not applied (' + JSON.stringify(fr) + ')');
    await openSheetBy(page, SETTINGS_BTN);
    await Promise.all([page.waitForEvent('load'), page.selectOption('#langSel', 'en')]); await waitApp(page);
    const en = await page.evaluate(() => document.querySelector('nav.tabs button[data-tab="outfits"]').textContent.trim());
    assert(en === 'Outfits', 'English not restored (' + en + ')');
    return 'fr "' + fr.tab + '", back to en';
  });
  await ctx.close();
}

/* ---------- static checks ---------- */
function versionCheck() {
  const app = (readFileSync(path.join(REPO, 'app.js'), 'utf8').match(/const APP_VERSION='([^']+)'/) || [])[1];
  const sw = readFileSync(path.join(REPO, 'sw.js'), 'utf8'); const v = (sw.match(/const VERSION = 'wearcycle-v([^']+)'/) || [])[1];
  const shell = [...(sw.match(/const SHELL = \[([\s\S]*?)\];/) || [, ''])[1].matchAll(/'([^']+)'/g)].map(m => m[1]).filter(f => f !== './');
  const missing = shell.filter(f => !existsSync(path.join(REPO, f)));
  if (!app || !v || app !== v) return check('APP_VERSION equals the sw.js VERSION', 'FAIL', 'app.js ' + app + ', sw.js ' + v);
  check('APP_VERSION equals the sw.js VERSION', 'PASS', app);
  check('sw.js is non-empty and every shell file exists', missing.length || !shell.length ? 'FAIL' : 'PASS', missing.length ? 'missing: ' + missing.join(', ') : shell.length + ' files');
}
function detector() {
  const run = targets => {
    const r = spawnSync('npx', ['--yes', 'impeccable@4.5.2', 'detect', '--json', ...targets], { cwd: REPO, encoding: 'utf8', maxBuffer: 64 << 20,
      env: { ...process.env, DO_NOT_TRACK: '1', IMPECCABLE_NO_TELEMETRY: '1', IMPECCABLE_NO_UPDATE_CHECK: '1' } });
    if (r.status !== 0 && r.status !== 2) throw new Error('detector exit ' + r.status + ': ' + (r.stderr || '').slice(0, 200));
    return JSON.parse(r.stdout || '[]');
  };
  // Warnings and advisories are kept apart: only warnings gate a release (an advisory has advisory: true).
  const sum = list => {
    const rules = only => { const by = {}; for (const f of list) if (!!f.advisory === only) by[f.antipattern] = (by[f.antipattern] || 0) + 1; return by; };
    return { warnings: list.filter(f => !f.advisory).length, advisories: list.filter(f => f.advisory).length,
      warningsByRule: rules(false), advisoriesByRule: rules(true),
      findings: list.map(({ antipattern, severity, advisory, file, line, snippet }) =>
        ({ antipattern, severity, advisory: !!advisory, file: (f => path.relative(f.startsWith(A.out) ? A.out : REPO, f))(path.resolve(REPO, file || '')), line, snippet: String(snippet || '').slice(0, 200) })) }; };
  const res = {};
  // The unrendered shell: its [hidden] marks the state before the app runs (the sign-in gate and the app are both
  // hidden there, and one of them always shows), so nothing is removed from it.
  res.static = sum(run(['index.html', 'styles.css']));
  const snapDir = path.join(A.out, 'snapshots'), snaps = existsSync(snapDir) ? readdirSync(snapDir).filter(f => f.endsWith('.html')).map(f => path.join(snapDir, f)) : [];
  if (snaps.length) {
    res.snapshots = sum(run(snaps)); // the HTML only: styles.css is linked from it, not scanned twice
    res.snapshots.hiddenElementsExcluded = { ...R.snapHidden }; // per view: hidden elements removed before the scan
  }
  writeFileSync(path.join(A.out, 'detector.json'), JSON.stringify(res, null, 1));
  return res;
}
async function compareTo(folder) {
  const shots = path.join(A.out, 'screens'), base = path.resolve(folder), diffDir = path.join(A.out, 'diff'); mkdirSync(diffDir, { recursive: true });
  const baseShots = existsSync(path.join(base, 'screens')) ? path.join(base, 'screens') : base;
  const baseSummary = path.join(base, 'summary.json');
  const name = 'Pixel diff' + (A.exact ? ' (exact)' : '') + ' against ' + folder;
  R.compare = { folder, mode: A.exact ? 'exact' : 'pixelmatch 0.1', rows: [] };
  if (existsSync(baseSummary)) { // screenshots at different scales differ in size everywhere: say why instead
    const bs = JSON.parse(readFileSync(baseSummary, 'utf8')), o = bs.options || {};
    const diff = ['cssPixels', 'fullPage'].filter(k => !!o[k] !== !!A[k]);
    if (diff.length) {
      check(name, 'FAIL', 'capture options differ from the baseline: ' + diff.map(k => '--' + k.replace(/[A-Z]/g, m => '-' + m.toLowerCase()) + (o[k] ? ' (baseline has it)' : ' (baseline lacks it)')).join(', '));
      return [];
    }
    if (A.exact) { // same browser build and raster mode, or anti-aliasing noise shows up as changes
      const r = bs.render || {}, why = [];
      if (r.browser !== R.render.browser) why.push('browser ' + (r.browser || 'not recorded') + ' vs ' + R.render.browser);
      if (JSON.stringify(r.args || null) !== JSON.stringify(R.render.args)) why.push('launch flags ' + JSON.stringify(r.args || 'not recorded') + ' vs ' + JSON.stringify(R.render.args));
      if (why.length) { check(name, 'FAIL', 'the before run was captured differently (' + why.join('; ') + '): capture a new before with this script'); return []; }
    }
  } else if (A.exact) { check(name, 'FAIL', 'no summary.json in ' + folder + ': --exact needs a before captured by this script'); return []; }
  const rows = R.compare.rows; let changed = 0, missing = 0;
  for (const f of readdirSync(shots).filter(f => f.endsWith('.png')).sort()) {
    const bf = path.join(baseShots, f); if (!existsSync(bf)) { missing++; rows.push({ file: f, note: 'not in the before run' }); continue; }
    const a = PNG.sync.read(readFileSync(path.join(shots, f))), b = PNG.sync.read(readFileSync(bf));
    if (a.width !== b.width || a.height !== b.height) { changed++; rows.push({ file: f, note: 'size ' + a.width + 'x' + a.height + ' vs ' + b.width + 'x' + b.height }); continue; }
    const d = new PNG({ width: a.width, height: a.height });
    if (!A.exact) {
      const n = pixelmatch(a.data, b.data, d.data, a.width, a.height, { threshold: 0.1 });
      if (n) { changed++; rows.push({ file: f, pixels: n }); writeFileSync(path.join(diffDir, f), PNG.sync.write(d)); }
      continue;
    }
    // exact: every pixel whose color differs; the mask shows them red over a faded copy of this run
    let n = 0, max = 0, x0 = a.width, y0 = a.height, x1 = -1, y1 = -1;
    for (let y = 0; y < a.height; y++) for (let x = 0; x < a.width; x++) {
      const i = (y * a.width + x) * 4;
      const dl = Math.max(Math.abs(a.data[i] - b.data[i]), Math.abs(a.data[i + 1] - b.data[i + 1]), Math.abs(a.data[i + 2] - b.data[i + 2]), Math.abs(a.data[i + 3] - b.data[i + 3]));
      if (dl) { n++; max = Math.max(max, dl); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
        d.data[i] = 255; d.data[i + 1] = 0; d.data[i + 2] = 0; d.data[i + 3] = 255; }
      else { const g = Math.round(255 - (255 - (a.data[i] * .3 + a.data[i + 1] * .59 + a.data[i + 2] * .11)) * .15); d.data[i] = d.data[i + 1] = d.data[i + 2] = g; d.data[i + 3] = 255; }
    }
    if (n) { changed++; rows.push({ file: f, pixels: n, maxDelta: max, box: [x0, y0, x1, y1] }); writeFileSync(path.join(diffDir, f), PNG.sync.write(d)); }
  }
  const line = r => r.file + ': ' + (r.note || r.pixels + ' px' + (r.maxDelta ? ' (up to ' + r.maxDelta + ' levels, box ' + r.box.join(',') + ')' : ''));
  check(name, changed || missing ? 'FAIL' : 'PASS', changed || missing ? changed + ' changed, ' + missing + ' new: ' + rows.slice(0, 6).map(line).join('; ') + (rows.length > 6 ? '; ... (summary.md lists all)' : '') : 'all screenshots identical');
  return rows;
}

/* ---------- quality gates ---------- */
function totals(keep = () => true) {
  const caps = R.captures.filter(c => !c.na && !c.error && keep(c));
  return {
    axeSerious: caps.reduce((n, c) => n + (c.axe || []).reduce((m, v) => m + v.nodes, 0), 0),
    englishLeft: caps.reduce((n, c) => n + (c.english || []).length, 0),
    textOverflow: caps.reduce((n, c) => n + c.spilling.length + c.truncated.length, 0),
    userNamesCut: caps.reduce((n, c) => n + (c.userTruncated || []).length, 0),
  };
}
function gate(name, value, baseValue, strictZero, note) {
  if (baseValue != null) return check(name, value <= baseValue ? 'PASS' : 'FAIL', value + ' (baseline ' + baseValue + ')' + (note || ''));
  if (strictZero && A.strict) return check(name, value === 0 ? 'PASS' : 'FAIL', String(value));
  check(name, value === 0 ? 'PASS' : 'REVIEW', value + (value ? ' (no baseline yet: recorded for Phase 4)' : ''));
}

/* ---------- main ---------- */
async function main() {
  rmSync(A.out, { recursive: true, force: true });
  mkdirSync(path.join(A.out, 'screens'), { recursive: true }); mkdirSync(path.join(A.out, 'snapshots'), { recursive: true });
  for (const f of ['styles.css', 'fonts', 'icons']) cpSync(path.join(REPO, f), path.join(A.out, 'snapshots', f), { recursive: true }); // assets the snapshots link to
  ({ playwright: PW, '@axe-core/playwright': AxeBuilder, pngjs: PNG, pixelmatch } = await loadDeps());
  AxeBuilder = AxeBuilder.default || AxeBuilder.AxeBuilder || AxeBuilder; PNG = PNG.PNG || PNG; pixelmatch = pixelmatch.default || pixelmatch;
  const started = Date.now();
  console.log('Wearcycle check' + (A.worstCase ? ' (worst case)' : '') + '. Output: ' + A.out);
  versionCheck();
  const server = await startServer();
  let browser;
  try { browser = await PW.chromium.launch({ args: CHROMIUM_ARGS }); } catch (e) { server.stop(); throw e; } // else the local server keeps the run alive
  R.render = { browser: 'chromium ' + browser.version(), args: CHROMIUM_ARGS };
  try {
    const data = scenario(null);
    const state = await signIn(browser, server.base, data);
    check('Sign-in', 'PASS', R.auth.mode + ': ' + R.auth.reason);
    if (!A.worstCase) {
      await flows(browser, server.base, state, data);
      const sets = [];
      for (const dev of devices) for (const theme of ['light', 'dark']) sets.push({ dev, theme, lang: 'en' });
      if (devices.includes(DEV['phone-360'])) for (const lang of ['fr', 'ja']) sets.push({ dev: DEV['phone-360'], theme: 'light', lang });
      for (const s of sets) {
        const tag = s.dev.id + '-' + s.theme + '-' + s.lang;
        console.log('capture ' + tag);
        await captureSet(browser, server.base, state, { ...s, data, tag, runAxe: true, snapshots: s.dev.id === 'phone-390' && s.theme === 'light' });
      }
    } else {
      const plan = [['long', ['en', 'fr']], ['empty', ['en']], ['many', ['en']]];
      for (const [name, langs] of plan) {
        const d = scenario(name);
        for (const dev of devices.filter(d_ => ['phone-360', 'win-1366'].includes(d_.id))) for (const lang of langs) {
          const tag = 'wc-' + name + '-' + dev.id + '-' + lang; console.log('capture ' + tag);
          await captureSet(browser, server.base, state, { dev, theme: 'light', lang, data: d, tag, runAxe: false, snapshots: false });
        }
      }
    }
  } finally { await browser.close(); server.stop(); }

  const caps = R.captures.filter(c => !c.na);
  const errs = caps.filter(c => c.error);
  check('Every view captured', errs.length ? 'FAIL' : 'PASS', errs.length ? errs.map(c => c.name + ': ' + c.error).slice(0, 4).join('; ') : caps.length + ' screenshots' + (R.captures.length - caps.length ? ', ' + (R.captures.length - caps.length) + ' not applicable' : ''));
  const unsettled = caps.filter(c => c.cutsPending);
  check('Cut-outs loaded before each screenshot', unsettled.length ? 'REVIEW' : 'PASS', unsettled.length ? unsettled.map(c => c.name + ' (' + c.cutsPending + ')').slice(0, 5).join('; ') + ': these screenshots may differ between runs' : 'all views');
  const wide = caps.filter(c => c.overflowX > 1);
  check('No horizontal overflow', wide.length ? 'FAIL' : 'PASS', wide.length ? wide.map(c => c.name + ' +' + c.overflowX + 'px ' + c.wide.slice(0, 2).join(' ')).slice(0, 5).join('; ') : 'all views');
  check('No console errors', R.console.length ? 'FAIL' : 'PASS', R.console.length ? R.console.slice(0, 4).map(c => c.where + ': ' + c.text).join(' | ') : '');
  check('Network stays local (Supabase, Open-Meteo stubbed)', R.unexpectedHosts.size ? 'FAIL' : 'PASS', R.unexpectedHosts.size ? 'blocked: ' + [...R.unexpectedHosts].join(', ') : R.writes.length + ' writes and ' + R.functions.length + ' function calls answered locally');
  let base = null, baseDevices = null;
  if (A.baseline) { const bs = JSON.parse(readFileSync(path.resolve(A.baseline), 'utf8')); base = bs.totals || null; baseDevices = new Set((bs.captures || []).map(c => c.device)); }
  const T = totals();
  // Gate against the baseline only on the devices it has: a device added later (phone-land, Phase 7) has nothing to
  // compare with. The summary keeps the totals over every device.
  const later = baseDevices ? [...new Set(R.captures.map(c => c.device))].filter(d => !baseDevices.has(d)) : [];
  const G = later.length ? totals(c => baseDevices.has(c.device)) : T;
  const gnote = k => later.length ? '; ' + later.join(', ') + ' not in the baseline, all devices ' + T[k] : '';
  if (!A.worstCase) {
    T.wearThisVisible = R.wearThis ? R.wearThis.visible : null;
    if (R.wearThis) {
      const must = A.strict || (base && base.wearThisVisible === true);
      check('"Wear this" visible at 390x844 without scrolling', R.wearThis.visible ? 'PASS' : must ? 'FAIL' : 'REVIEW',
        R.wearThis.detail + (R.wearThis.visible || must ? '' : ' (not yet: Phase 8 target)'));
    }
    if (!A.noAxe) gate('axe-core: no serious or critical issues', G.axeSerious, base && base.axeSerious, true, gnote('axeSerious'));
    gate('No English left in French and Japanese', G.englishLeft, base && base.englishLeft, true, gnote('englishLeft'));
  }
  gate('No app text cut off or spilling (all languages)', G.textOverflow, base && base.textOverflow, false, gnote('textOverflow'));
  check('Piece names cut with an ellipsis', 'INFO', T.userNamesCut + ' (user-typed names may be truncated; listed per view in summary.json)');
  let det = null;
  if (!A.noDetector && !A.worstCase) {
    try { det = detector(); const snap = det.snapshots || { warnings: 0, advisories: 0, hiddenElementsExcluded: {} };
      T.detectorWarnings = det.static.warnings + snap.warnings; T.detectorAdvisories = det.static.advisories + snap.advisories;
      T.detectorHiddenExcluded = Object.values(snap.hiddenElementsExcluded || {}).reduce((a, b) => a + b, 0);
      const w = T.detectorWarnings + ' (index.html + styles.css ' + det.static.warnings + (det.snapshots ? ', screen snapshots ' + snap.warnings : '') + ')';
      if (base && base.detectorWarnings != null) check('Detector warnings (npx impeccable@4.5.2 detect)', T.detectorWarnings <= base.detectorWarnings ? 'PASS' : 'FAIL', w + ' (baseline ' + base.detectorWarnings + '). Rules: detector.json');
      else check('Detector warnings (npx impeccable@4.5.2 detect)', T.detectorWarnings ? 'REVIEW' : 'PASS', w + (T.detectorWarnings ? ' (no baseline yet: recorded for Phase 4)' : '') + '. Rules: detector.json');
      check('Detector advisories (recorded, not gated)', 'INFO', T.detectorAdvisories + ' (index.html + styles.css ' + det.static.advisories + (det.snapshots ? ', screen snapshots ' + snap.advisories + '; ' + T.detectorHiddenExcluded + ' hidden elements left out of the snapshots' : '') + ')');
    } catch (e) { check('Detector warnings (npx impeccable@4.5.2 detect)', 'FAIL', e.message); }
  }
  if (A.compare) await compareTo(A.compare);

  const summary = { when: new Date().toISOString(), seconds: Math.round((Date.now() - started) / 1000), options: { ...A, out: undefined }, fixedClock: CLOSET.now,
    auth: R.auth, render: R.render, totals: T, checks: R.checks, compare: R.compare, console: R.console, writesAnsweredLocally: R.writes, functionsAnsweredLocally: R.functions,
    detector: det && Object.fromEntries(Object.entries(det).map(([k, v]) => [k, { ...v, findings: undefined }])), captures: R.captures };
  writeFileSync(path.join(A.out, 'summary.json'), JSON.stringify(summary, null, 1));
  const md = ['# Wearcycle check' + (A.worstCase ? ' (worst case)' : ''), '', 'Fixed clock ' + CLOSET.now + '. Auth: ' + R.auth.mode + ' (' + R.auth.reason + '). ' + summary.seconds + ' s.', '',
    '| Status | Check | Detail |', '| --- | --- | --- |', ...R.checks.map(c => '| ' + c.status + ' | ' + c.name + ' | ' + String(c.detail).replace(/\|/g, '/').slice(0, 300) + ' |'), '',
    '## Per view', '', '| View | Overflow | App text cut | Spilling | Names cut | English left | axe serious |', '| --- | --- | --- | --- | --- | --- | --- |',
    ...caps.map(c => '| ' + c.name + ' | ' + (c.overflowX > 1 ? '+' + c.overflowX + 'px' : '') + ' | ' + (c.truncated || []).length + ' | ' + (c.spilling || []).length + ' | ' + (c.userTruncated || []).length + ' | ' + (c.english || []).length + ' | ' + (c.axe ? c.axe.reduce((m, v) => m + v.nodes, 0) : '') + ' |')];
  if (R.compare && R.compare.rows.length) md.push('', '## Pixel diff (' + R.compare.mode + ') against ' + R.compare.folder, '', 'Masks: ' + path.join(A.out, 'diff'), '',
    '| Screenshot | Changed pixels | Largest change (levels) | Box x0,y0,x1,y1 |', '| --- | --- | --- | --- |',
    ...R.compare.rows.map(r => '| ' + r.file + ' | ' + (r.note || r.pixels) + ' | ' + (r.maxDelta || '') + ' | ' + (r.box ? r.box.join(',') : '') + ' |'));
  md.push('', 'Rendered with ' + (R.render.browser || '?') + ' ' + (R.render.args || []).join(' ') + '.');
  writeFileSync(path.join(A.out, 'summary.md'), md.join('\n') + '\n');
  const fails = R.checks.filter(c => c.status === 'FAIL').length, reviews = R.checks.filter(c => c.status === 'REVIEW').length;
  console.log('\n' + (fails ? 'FAIL' : 'PASS') + ': ' + R.checks.filter(c => c.status === 'PASS').length + ' passed, ' + fails + ' failed, ' + reviews + ' to review. Report: ' + path.join(A.out, 'summary.md'));
  process.exitCode = fails ? 1 : 0;
}
main().catch(e => { console.error(e); process.exitCode = 1; });
