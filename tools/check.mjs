#!/usr/bin/env node
// Wearcycle visual and functional check (redesign plan v2.2, Phase 2). Runs in Claude's container with Playwright.
// Test-only: never listed in sw.js, never loaded by the app.
//
//   node tools/check.mjs [--worst-case] [--compare <folder> [--exact]] [--baseline <summary.json>] [--strict]
//                        [--out <folder>] [--full-page] [--css-pixels] [--devices a,b] [--views a,b] [--no-axe] [--no-detector]
//                        [--stub-auth] [--base-url <url>] [--no-rest]
//
// --views takes the views below and the groups signed-out, pages, sheets, layers, camera and share (default: everything).
// What users see (owner, Phase 14 step 0): the first screen of each view as before, then what lies below it: name--full.png
// for a tab or page (scrolled through first, so lazy pictures load), name--2.png, --3... for a sheet that scrolls (--no-rest
// leaves these out). The camera uses Chromium's fake capture device with one still frame written by this script, so it is
// deterministic; the device's default test pattern moves. Share images are the canvas's own 1080x1920 PNG.
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
  fullPage: flag('full-page'), cssPixels: flag('css-pixels'), noAxe: flag('no-axe'), noDetector: flag('no-detector'), stubAuth: flag('stub-auth'), noRest: flag('no-rest'),
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
const GROUPS = ['signed-out', 'pages', 'sheets', 'layers', 'camera', 'share'];
const groups = A.views ? GROUPS.filter(g => A.views.split(',').includes(g)) : GROUPS;
const LANGS = ['en', 'es', 'fr', 'tl', 'hi', 'ja', 'ko'];

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
  d = { ...d, items: (sc.items || d.items).map(i => ({ ...i, body: { ...i.body } })), wears: sc.wears || d.wears, settings: { ...d.settings, ...(sc.settings || {}) }, missing: new Set(d.missing) };
  for (const [id, n] of Object.entries(sc.rename || {})) { const it = d.items.find(i => i.id === id); if (it) it.body.name = n; }
  if (sc.keep) d.items = d.items.filter(i => sc.keep.includes(i.id)); // Phase 10: only these pieces
  for (const [id, f] of Object.entries(sc.patch || {})) { const it = d.items.find(i => i.id === id); if (it) Object.assign(it.body, f); } // a few fields per piece
  if (sc.addWears) d.wears = d.wears.concat(sc.addWears); // logged outfits on top of the base ones
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
          const name = path.basename(rest), id = name.replace(/(-cut|-1024)?\.[a-z]+$/, ''), file = path.join(FIX, 'img', name);
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
async function newContext(browser, base, dev, { theme = 'light', lang = 'en', data, storageState, known = true, clock = NOW } = {}) {
  const ctx = await browser.newContext({
    viewport: { width: dev.width, height: dev.height }, deviceScaleFactor: dev.dpr, isMobile: dev.touch, hasTouch: dev.touch,
    locale: CLOSET.locale, timezoneId: CLOSET.timezone, colorScheme: theme, reducedMotion: 'reduce', serviceWorkers: 'block', storageState,
  });
  await ctx.clock.setFixedTime(clock);
  await ctx.addInitScript(({ theme, lang, known }) => {
    try {
      if (sessionStorage.getItem('wc-check')) return; // only on the first load of the tab, so in-app switches survive a reload
      sessionStorage.setItem('wc-check', '1');
      localStorage.setItem('wearcycle.theme', theme); localStorage.setItem('wearcycle.lang', lang);
      if (known) localStorage.setItem('wearcycle.known', 'true'); else localStorage.removeItem('wearcycle.known');
      localStorage.setItem('wardrobe.installDismissed', 'true');
      if (lang !== 'en') localStorage.setItem('wearcycle.i18nDebug', '1'); else localStorage.removeItem('wearcycle.i18nDebug');
    } catch (e) {}
  }, { theme, lang, known });
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
async function goTab(page, tab) { await closeSheet(page); await page.click('nav.tabs button[data-tab="' + tab + '"]'); await page.waitForSelector('#tab-' + tab + ':not([hidden])');
  // Care fills in "Not getting picked" just after it is drawn (v1.66.1): wait for its "Checking" line to go.
  if (tab === 'care') await page.waitForFunction(() => !document.querySelector('#careBody [role=status]'), null, { timeout: 30000 }); }
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
const SOURCE = ['app.js', 'logic.js', 'index.html', 'privacy.html', 'whats-new.html'].map(f => readFileSync(path.join(REPO, f), 'utf8')).join('\n');
// Color keys (logic.js COLORS) that are not English words: on screen they must show as their name (owner, 2026-11-07:
// "(lightblue)"). Worked out from COLORS itself, not from COLOR_NAME, so the check also bites on code without that table.
const COLOR_WORDS = ['black', 'white', 'grey', 'navy', 'beige', 'khaki', 'brown', 'denim', 'olive', 'red', 'burgundy', 'pink', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple'];
const RAW_COLORS = [...((readFileSync(path.join(REPO, 'logic.js'), 'utf8').match(/const COLORS=\{([\s\S]*?)\};/) || [])[1] || '').matchAll(/(\w+):\{hex/g)].map(m => m[1]).filter(k => !COLOR_WORDS.includes(k));
const RAW_COLOR_RE = RAW_COLORS.length ? new RegExp('\\b(' + RAW_COLORS.join('|') + ')\\b', 'i') : null;
async function pageFacts(page, lang, texts, inSheet) { // inSheet: true for the open sheet, or the selector of a layer
  return page.evaluate(({ lang, texts, inSheet, source, rawColors }) => {
    const root = inSheet && document.querySelector(inSheet === true ? '#sheetRoot .sheet' : inSheet) || document.body;
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
    // A color key shown as text or read out by a screen reader (the person's own names are left out).
    if (rawColors.length) { const re = new RegExp('\\b(' + rawColors.join('|') + ')\\b', 'i'), keys = new Set();
      for (const el of root.querySelectorAll('*')) { if (!el.checkVisibility || !el.checkVisibility() || el.closest('[data-notr],script,style')) continue;
        for (const n of el.childNodes) if (n.nodeType === 3 && re.test(n.nodeValue) && !texts.some(u => n.nodeValue.includes(u))) keys.add('"' + n.nodeValue.trim().slice(0, 50) + '"');
        for (const a of ['aria-label', 'title']) { const v = el.getAttribute(a); if (v && re.test(v) && !texts.some(u => v.includes(u))) keys.add(a + ' "' + v.slice(0, 50) + '"'); } }
      out.colorKeys = [...keys].slice(0, 6); }
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
  }, { lang, texts, inSheet, source: SOURCE, rawColors: RAW_COLORS });
}
async function axe(page, sheet) {
  let b = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']);
  if (sheet) b = b.include(sheet === true ? '#sheetRoot' : sheet); // a sheet or layer view counts only itself; the tab behind it has its own capture
  const res = await b.analyze();
  return res.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')
    .map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, targets: v.nodes.slice(0, 3).map(n => n.target.join(' ')) }));
}

/* ---------- pictures and "Wear this" (same measure in tools/live-check.mjs) ---------- */
// Pictures in the first screen of the open tab, or of the open sheet when sheet is true (Phase 9): how many are drawn
// larger than their file (one file pixel over more than 1.1 device pixels looks soft; the 256px thumbnails at a large
// size do), and where "Wear this" sits.
const PICTURES = sheet => {
  const dpr = devicePixelRatio, out = { shown: 0, upscaled: 0, worst: 0 };
  for (const i of document.querySelectorAll(sheet ? '#sheetRoot .sheet img' : 'section.tab:not([hidden]) img')) {
    const r = i.getBoundingClientRect(); if (!r.width || !r.height || r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= innerWidth || !i.naturalWidth || !i.checkVisibility() || i.closest('[inert]')) continue; // off screen sideways or on another page
    const cs = getComputedStyle(i), px = v => parseFloat(v) || 0;
    const w = r.width - px(cs.paddingLeft) - px(cs.paddingRight) - px(cs.borderLeftWidth) - px(cs.borderRightWidth);
    const h = r.height - px(cs.paddingTop) - px(cs.paddingBottom) - px(cs.borderTopWidth) - px(cs.borderBottomWidth);
    const sx = w / i.naturalWidth, sy = h / i.naturalHeight, fit = cs.objectFit;
    const k = (fit === 'contain' || fit === 'scale-down' ? Math.min(sx, sy) : Math.max(sx, sy)) * dpr;
    out.shown++; if (k > 1.1) out.upscaled++; out.worst = Math.max(out.worst, Math.round(k * 10) / 10);
  }
  const b = document.querySelector('.fit.hero [data-wear]');
  if (b) { const r = b.getBoundingClientRect(), cx = r.left + r.width / 2; // its top and bottom edges must both be uncovered
    const on = y => { const e = y >= 0 && y < innerHeight ? document.elementFromPoint(cx, y) : null; return !!e && b.contains(e); };
    out.wear = { top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight, visible: r.top >= 0 && r.bottom <= innerHeight && on(r.top + 2) && on(r.bottom - 2) }; }
  return out;
};
// Image bytes over the network: <img> requests and Supabase Storage downloads (photos, cut-outs). Thumbnails are data:
// URLs inside the items rows, so they are not counted here.
function countImageBytes(page) {
  const net = { bytes: 0, files: 0 };
  page.on('requestfinished', req => { let u; try { u = new URL(req.url()); } catch { return; } if (!/^https?:$/.test(u.protocol)) return;
    if (!(req.resourceType() === 'image' || (u.host === SB_HOST && req.method() === 'GET' && u.pathname.startsWith('/storage/v1/object/')))) return;
    req.sizes().then(z => { net.bytes += z.responseBodySize; net.files++; }).catch(() => {}); });
  return net;
}
// "Wear this" at every size in docs/design/SCREENS.md (Chosen direction and Outfits), plus phones turned sideways.
const WEAR_SIZES = [[360, 800, 3, 1, 1], [390, 844, 3, 1, 1], [412, 915, 3, 1, 1], [744, 1133, 2, 1, 1], [820, 1180, 2, 1, 1], [1024, 1366, 2, 1, 1],
  [1133, 744, 2, 1, 1], [1180, 820, 2, 1, 1], [1366, 1024, 1, 0, 1], [1366, 768, 1, 0, 1], [1366, 630, 1, 0, 1], [1536, 864, 1, 0, 1], [1920, 1080, 1, 0, 1],
  [844, 390, 3, 1, 0], [915, 412, 3, 1, 0]]; // width, height, pixel ratio, touch, required
async function wearSizes(browser, base, state, data) {
  R.wearSizes = [];
  for (const [w, h, dpr, touch, req] of WEAR_SIZES) {
    const dev = { id: w + 'x' + h, width: w, height: h, dpr, touch: !!touch };
    const ctx = await newContext(browser, base, dev, { data, storageState: state }); const page = await ctx.newPage();
    watchConsole(page, () => 'wear-' + dev.id);
    try { await page.goto(base + '/index.html'); await waitApp(page);
      const p = await page.evaluate(PICTURES); R.wearSizes.push({ size: dev.id, required: !!req, ...(p.wear || { visible: false, missing: true }), shown: p.shown, upscaled: p.upscaled, worst: p.worst });
    } finally { await ctx.close(); }
  }
}

// Busy morning (owner, 2026-10-26): the fixture clock moved to closet.json "busyMorning", when Halloween and Diwali are
// both within two weeks, the holiday bar is on and the laundry question is due (a piece in the wash since Oct 11).
// "Wear this" must stay fully visible at 390x844 and 1366x630; 360x800 and 820x1180 are reported.
const BUSY_SIZES = [[390, 844, 3, 1, 1], [1366, 630, 1, 0, 1], [360, 800, 3, 1, 0], [820, 1180, 2, 1, 0]];
async function busyMorning(browser, base, state, data) {
  R.busy = []; if (!CLOSET.busyMorning) return;
  for (const [w, h, dpr, touch, req] of BUSY_SIZES) {
    const dev = { id: w + 'x' + h, width: w, height: h, dpr, touch: !!touch };
    const ctx = await newContext(browser, base, dev, { data, storageState: state }); await ctx.clock.setFixedTime(new Date(CLOSET.busyMorning));
    const page = await ctx.newPage(); watchConsole(page, () => 'busy-' + dev.id);
    try { await page.goto(base + '/index.html'); await waitApp(page);
      const s = await page.evaluate(() => ({ holidays: holidaysSoon(14).length, bar: !!holidayNow(), wash: !!washCard() }));
      const p = await page.evaluate(PICTURES);
      R.busy.push({ size: dev.id, required: !!req, busy: s.holidays >= 2 && s.bar && s.wash, state: s, ...(p.wear || { visible: false, missing: true }) });
    } finally { await ctx.close(); }
  }
}

/* ---------- views ---------- */
async function openView(page, view) {
  if (['outfits', 'closet', 'care', 'shop'].includes(view)) { await goTab(page, view); return true; }
  if (view === 'preview') { await goTab(page, 'outfits'); const s = await page.$('.fit.hero [data-swap][data-slot="top"]') || await page.$('.fit.hero [data-swap]'); if (!s) return false; await s.click(); await page.waitForSelector('#sheetRoot .sheet'); return true; }
  if (view === 'editor') { await goTab(page, 'closet'); const c = await page.$('#closetGrid [data-edit]'); if (!c) return false; await c.click(); await page.waitForSelector('#sheetRoot .sheet'); return true; }
  if (view === 'settings') { await goTab(page, 'outfits'); await openSheetBy(page, SETTINGS_BTN); return true; }
  return false;
}
async function captureSet(browser, base, state, { dev, theme, lang, data, tag, snapshots, runAxe }) {
  const ctx = await newContext(browser, base, dev, { theme, lang, data, storageState: state });
  const page = await ctx.newPage(); let where = tag;
  watchConsole(page, () => where);
  const net = countImageBytes(page);
  await page.goto(base + '/index.html'); await waitApp(page);
  const texts = userTexts(data);
  let seen = { bytes: 0, files: 0 };
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
      cap.pictures = await page.evaluate(PICTURES, inSheet); delete cap.pictures.wear;
      cap.img = { kb: Math.round((net.bytes - seen.bytes) / 1024), files: net.files - seen.files }; seen = { ...net }; // the first view includes the app opening
      if (runAxe && !A.noAxe) cap.axe = await axe(page, inSheet);
      if (snapshots) await snapshot(page, view);
    } catch (e) { cap.error = String(e && e.message || e).split('\n')[0]; }
    R.captures.push(cap);
  }
  // Below the first screen, in a second pass: scrolling through loads pictures and moves layers, which changed later first
  // screens by up to 17 levels when it ran between them (16 of 112, measured against a run without it).
  for (const view of views) {
    where = tag + '-' + view; const cap = R.captures.find(c => c.name === where);
    if (!cap || cap.na || cap.error) continue;
    try { await openView(page, view); await page.evaluate(() => window.scrollTo(0, 0)); await settle(page);
      cap.rest = await captureRest(page, where, ['preview', 'editor', 'settings'].includes(view) ? 'sheet' : 'page');
    } catch (e) { cap.error = 'below the first screen: ' + String(e && e.message || e).split('\n')[0]; }
  }
  await ctx.close();
}

// Static copy for the detector: scripts removed, blob: images (cut-outs) inlined as data URLs, hidden elements removed
// (only what is on screen counts).
async function snapshot(page, view) {
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

/* ---------- the rest of what users see (owner, Phase 14 step 0) ---------- */
const PROPER_NAMES = ['Supabase, Inc.', 'Cloudflare, Inc.', 'Google (Gmail)', 'Open-Meteo', 'Open-Meteo.com', 'Zippopotam.us', 'wearcycle.app@gmail.com']; // not English left to translate
const shotOpts = () => ({ scale: A.cssPixels ? 'css' : 'device', animations: 'disabled', caret: 'hide' });
// Below the first screen: the page once, whole (scrolled through first, so pictures that load near the screen are there);
// a sheet, which scrolls on its own, one screen at a time (88px overlap, so a line cut by the sticky buttons shows whole).
async function captureRest(page, where, kind) {
  if (A.noRest || A.fullPage) return 0;
  const file = s => path.join(A.out, 'screens', where + '--' + s + '.png');
  if (kind === 'sheet') {
    let n = 1;
    while (n < 12) {
      const moved = await page.evaluate(() => { const s = document.querySelector('#sheetRoot .sheet'); if (!s || s.scrollTop + s.clientHeight >= s.scrollHeight - 1) return false; s.scrollTop += s.clientHeight - 88; return true; });
      if (!moved) break;
      n++; await settle(page); await page.screenshot({ path: file(n), ...shotOpts() });
    }
    await page.evaluate(() => { const s = document.querySelector('#sheetRoot .sheet'); if (s) s.scrollTop = 0; });
    return n - 1;
  }
  const h = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  if (h <= 1) return 0;
  await page.evaluate(async () => { const end = document.documentElement.scrollHeight; for (let y = 0; y < end; y += Math.round(innerHeight * .8)) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } });
  await settle(page); await page.evaluate(() => scrollTo(0, 0)); await settle(page);
  await page.screenshot({ path: file('full'), fullPage: true, ...shotOpts() });
  return 1;
}
async function capturedView(page, cap, { where, lang, texts, inSheet, rest, runAxe, snap }) {
  const pending = await settle(page); if (pending) cap.cutsPending = pending;
  await page.screenshot({ path: path.join(A.out, 'screens', where + '.png'), fullPage: A.fullPage, ...shotOpts() });
  Object.assign(cap, await pageFacts(page, lang, texts, inSheet));
  cap.english = (cap.english || []).filter(t => !PROPER_NAMES.includes(t));
  if (inSheet === true) { cap.pictures = await page.evaluate(PICTURES, true); delete cap.pictures.wear; }
  if (runAxe && !A.noAxe) cap.axe = await axe(page, inSheet);
  if (snap) await snapshot(page, cap.view);
  cap.rest = rest ? await captureRest(page, where, rest) : 0;
}
// Each sheet the app can open that the views above do not capture: [view, tab first, expression that opens it, shown only if].
const SHEET_VIEWS = [
  ['language', 'outfits', 'openLangs()'], ['reminders', 'outfits', 'openReminders()'], ['adjust', 'outfits', 'openAdjust()'],
  ['style-today', 'outfits', 'openStyleMenu()', '!!document.querySelector(".stylebtn")?.checkVisibility()'],
  ['diary', 'outfits', 'DI=null,openDiary()'], ['weather', 'outfits', 'openWxSheet()'], ['what-i-wore', 'outfits', 'openLog()'],
  ['add-clothes', 'closet', 'openAddMenu()'], ['new-item', 'closet', 'openEditor()'], ['stats', 'closet', 'openStats()'],
  ['duplicates', 'closet', '(S.dups=[{a:byId("fx-01"),b:byId("fx-02"),h:2,c:3}],openDups())'],
  ['what-is-this', 'closet', 'QD.it=null,openQuick(["fx-03"])'],
  ['condition-check', 'care', 'openCheck("fx-11")'], ['decide', 'care', 'openDecide("fx-02")'],
  ['share-list', 'shop', 'openWishlist()'], ['saved-idea', 'shop', 'openIdea("idea-1")'],
  ['have-one', 'shop', '(()=>{const k=S.settings.style.pick[0],e=styleEss(k,allItems().filter(isActive)).find(x=>!x.have);openEss(k,e.label);})()'],
  ['your-style', 'outfits', 'openStyles()'], ['style-palette', 'outfits', 'openPalettes()'], ['custom-palette', 'outfits', 'openPaletteCustom()'],
  ['inspiration', 'outfits', 'openInspo()'],
  ['inspiration-result', 'outfits', 'INSPO={look:{label:"Smart casual Friday",base:["classic"],pieces:["Navy blazer","White oxford shirt","Khaki chinos","Brown loafers","Silk pocket square"],colors:["navy","white","khaki"],summary:"A relaxed blazer look for the end of the week."},saved:null},openInspoResult()'],
  ['help', 'outfits', 'openHelp()'], ['delete-data', 'outfits', 'openWipe()'], ['change-password', 'outfits', 'askNewPassword(true)'], ['new-password', 'outfits', 'askNewPassword(false)'],
  ['consent', 'outfits', '(S.settings.consent=null,localStorage.removeItem("wearcycle.consent"),privacyCheck())'],
];
// The still frame for Chromium's fake camera: a dark garment on a light floor (a bright frame, so the app adds no "dark photo" toast).
function fakeCameraArgs() {
  const W = 1280, H = 960, y = Buffer.alloc(W * H, 226), u = Buffer.alloc(W * H / 4, 122), v = Buffer.alloc(W * H / 4, 134);
  const garment = (x, yy) => { const nx = x / W - .5, ny = yy / H; return (ny > .22 && ny < .82 && Math.abs(nx) < .17) || (ny > .22 && ny < .45 && Math.abs(nx) < .31 && (ny - .22) > (Math.abs(nx) - .17) * .4); };
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (garment(i, j)) y[j * W + i] = 58;
  for (let j = 0; j < H / 2; j++) for (let i = 0; i < W / 2; i++) if (garment(i * 2, j * 2)) { u[j * W / 2 + i] = 146; v[j * W / 2 + i] = 118; }
  const file = path.join(A.out, 'fake-camera.y4m');
  writeFileSync(file, Buffer.concat([Buffer.from('YUV4MPEG2 W' + W + ' H' + H + ' F30:1 Ip A1:1 C420\nFRAME\n'), y, u, v]));
  return ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-file-for-fake-video-capture=' + file];
}
async function captureAdded(browser, camBrowser, base, state, { dev, theme, lang, tag, runAxe, snapshots, only, longNames }) {
  const on = g => groups.includes(g) && (!only || only.includes(g));
  const texts0 = userTexts(scenario(null));
  const record = async (page, setWhere, view, inSheet, rest, open, texts = texts0, snap = snapshots) => {
    const where = tag + '-' + view, cap = { name: where, device: dev.id, theme, lang, view }; setWhere(where);
    try {
      if ((await open()) === false) { cap.na = true; R.captures.push(cap); return; }
      await capturedView(page, cap, { where, lang, texts, inSheet, rest, runAxe, snap });
    } catch (e) { cap.error = String(e && e.message || e).split('\n')[0]; }
    R.captures.push(cap);
  };
  const session = async (b, opts, run) => {
    const ctx = await newContext(b, base, dev, { theme, lang, ...opts }); const page = await ctx.newPage(); let w = tag;
    watchConsole(page, () => w); try { await run(page, x => { w = x; }); } finally { await ctx.close(); }
  };
  if (on('signed-out')) await session(browser, { data: scenario(null), known: false }, async (page, sw) => {
    await page.goto(base + '/index.html'); await page.waitForSelector('#g-email', { timeout: 15000 });
    await record(page, sw, 'signup', null, 'page', () => {});
    await record(page, sw, 'signin', null, 'page', () => page.click('#g-mode-in'));
    await record(page, sw, 'signin-error', null, 'page', () => page.click('#g-in'));
    await record(page, sw, 'reset', null, 'page', () => page.click('#g-forgot'));
  });
  if (on('pages')) await session(browser, { data: scenario(null) }, async (page, sw) => {
    for (const [view, file] of [['privacy', 'privacy.html'], ['whats-new', 'whats-new.html']])
      await record(page, sw, view, null, 'page', async () => { await page.goto(base + '/' + file); await page.waitForLoadState('load'); });
  });
  if (on('sheets') || on('layers')) {
    const data = scenario('sheets');
    if (longNames) for (const [id, n] of Object.entries(WORST.scenarios.long.rename || {})) { const it = data.items.find(i => i.id === id); if (it) it.body.name = n; }
    const texts = userTexts(data);
    await session(browser, { data, storageState: state, clock: new Date(CLOSET.busyMorning) }, async (page, sw) => {
      await page.goto(base + '/index.html'); await waitApp(page);
      if (on('sheets')) for (const [view, tab, expr, cond] of SHEET_VIEWS) {
        await record(page, sw, 'sheet-' + view, true, 'sheet', async () => {
          await closeSheet(page); await goTab(page, tab); await page.evaluate(() => window.scrollTo(0, 0));
          if (cond && !(await page.evaluate(cond))) return false;
          await page.evaluate('void (' + expr + ')'); await page.waitForSelector('#sheetRoot .sheet', { timeout: 5000 });
        }, texts);
      }
      await closeSheet(page);
      if (on('layers')) {
        const shut = async () => { await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('#viewRoot').innerHTML, null, { timeout: 5000 }); };
        await goTab(page, 'closet');
        await record(page, sw, 'viewer-photo', '#viewRoot', null, async () => { await page.evaluate(() => { openViewer('fx-01'); }); await page.waitForFunction(() => { const i = document.querySelector('#vImg'); return i && i.complete && i.naturalWidth; }, null, { timeout: 8000 }); }, texts);
        await record(page, sw, 'viewer-cut', '#viewRoot', null, async () => { await page.click('#viewRoot [data-vmode="cut"]'); await page.waitForFunction(() => { const i = document.querySelector('#vImg'); return i && i.classList.contains('cut') && i.complete && i.naturalWidth; }, null, { timeout: 8000 }); }, texts);
        await shut();
        await record(page, sw, 'job', '#jobRoot', null, async () => { await page.evaluate(() => job('Adding 12 of 40 · Reading the photo · Making the cut-out · Saving to your closet', 30)); }, texts);
        await page.evaluate(() => job(''));
        await record(page, sw, 'toast', '#toastRoot', null, async () => { await page.evaluate(() => toast('Done. Open any piece in Closet to add more details, like dress level and condition.', 0)); }, texts);
        await page.evaluate(() => { document.querySelector('#toastRoot').innerHTML = ''; });
      }
    });
  }
  if (on('camera') && camBrowser) await session(camBrowser, { data: scenario(null), storageState: state }, async (page, sw) => {
    await page.goto(base + '/index.html'); await waitApp(page);
    const live = async () => {
      await page.waitForFunction(() => { const v = document.querySelector('#camVideo'); return v && v.videoWidth > 0 && v.currentTime > 0; }, null, { timeout: 10000 });
      await page.waitForFunction(() => { const c = typeof CAM !== 'undefined' && CAM; return c && (c.torchOk || c.torchMaybe); }, null, { timeout: 3000 }).catch(() => {}); // the flashlight button appears after the track is asked
    };
    await record(page, sw, 'camera-tips', '#camRoot', null, async () => { await page.evaluate(() => { openCamera('batch'); }); await page.waitForSelector('#camRoot .camtips'); });
    await record(page, sw, 'camera-live', '#camRoot', null, async () => { await page.click('#camRoot [data-cam="tipsok"]'); await live(); });
    await record(page, sw, 'camera-photo-taken', '#camRoot', null, async () => { await page.click('#camRoot [data-cam="shoot"]'); await page.waitForSelector('#camRoot .camdone.ready'); });
    await record(page, sw, 'camera-delete-question', '#camRoot', null, async () => { await page.click('#camRoot [data-cam="cancel"]'); await page.waitForSelector('#camRoot .camask'); });
    await page.click('#camRoot [data-cam="discard"]'); await page.waitForFunction(() => !document.querySelector('#camRoot').innerHTML);
    await record(page, sw, 'camera-one-piece', '#camRoot', null, async () => { await page.evaluate(() => { openCamera('single'); }); await page.waitForSelector('#camVideo'); await live(); });
    await record(page, sw, 'camera-blocked', '#camRoot', null, async () => { await page.evaluate(() => { stopStream(); cameraFallback('Camera access is blocked. Allow it in Chrome: tap the icon left of the address, then Permissions, then Camera.'); }); });
    await page.evaluate(() => closeCamera([]));
  });
}
// The share image in every language and occasion: the canvas's PNG (saved for every language, with and without cut-outs,
// on the first occasion, and for French and Hindi on every occasion) and every text it draws, measured against the canvas.
async function captureShare(browser, base, state) {
  R.share = []; R.shareSent = [];
  const withCut = scenario(null), noCut = { ...withCut, items: withCut.items.map(i => { const body = { ...i.body }; delete body.cut; return { ...i, body }; }) };
  const long = scenario('long'), dev = DEV['win-1366'], enDrawn = {};
  for (const lang of LANGS) for (const [variant, data] of [['cutouts', withCut], ['no-cutouts', noCut], ['long-names', long]]) {
    console.log('share ' + lang + ' ' + variant);
    const ctx = await newContext(browser, base, dev, { lang, data, storageState: state }); const page = await ctx.newPage();
    watchConsole(page, () => 'share-' + lang + '-' + variant);
    try {
      await page.goto(base + '/index.html'); await waitApp(page);
      await page.evaluate(() => { const P = CanvasRenderingContext2D.prototype, o = P.fillText; window.__drawn = [];
        const di = P.drawImage; window.__pics = [];
        P.drawImage = function (im, x, y, w, h) { if (w && im.naturalWidth > 0 && this.canvas.width === 1080) window.__pics.push(Math.round(Math.max(w / im.naturalWidth, h / im.naturalHeight) * 10) / 10); return di.apply(this, arguments); };
        P.fillText = function (s, x, y, m) { const w = this.measureText(s).width, l = this.textAlign === 'center' ? x - w / 2 : this.textAlign === 'right' || this.textAlign === 'end' ? x - w : x; window.__drawn.push({ s: String(s), left: Math.round(l), right: Math.round(l + w), W: this.canvas.width, y: Math.round(y - this.measureText(s).actualBoundingBoxAscent) }); return o.call(this, s, x, y, m); }; });
      const occs = await page.evaluate(() => [...document.querySelectorAll('#occChips [data-occ]')].map(b => b.dataset.occ));
      const first = await page.evaluate(() => document.querySelector('#occChips [aria-pressed="true"]')?.dataset.occ);
      // What the phone's share menu receives (headless Chromium has none, so the images below come through the download):
      // the picture and its title only, no message (owner, 2026-11-07: WhatsApp drew "Picked with Wearcycle" over the picture).
      if (variant === 'cutouts' && first) R.shareSent.push({ lang, ...await page.evaluate(async () => { let got = null; const had = Object.getOwnPropertyNames(navigator);
        navigator.canShare = () => true; navigator.share = async d => { got = d; };
        try { await shareOutfit(); } finally { if (!had.includes('canShare')) delete navigator.canShare; if (!had.includes('share')) delete navigator.share; }
        return got ? { keys: Object.keys(got).sort(), title: got.title, files: [...(got.files || [])].map(f => f.type + ' ' + f.name) } : { keys: [], files: [] }; }) });
      for (const occ of [first, ...occs.filter(o => o !== first)]) {
        const name = lang + '-' + occ + '-' + variant, row = { name, lang, occ, variant, over: [] };
        try {
          await page.click('#occChips [data-occ="' + occ + '"]'); await settle(page);
          if (!(await page.evaluate(() => !!S.fits[S.sel]))) { row.na = true; continue; }
          await page.evaluate(() => { window.__drawn.length = 0; window.__pics.length = 0; });
          const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }), page.evaluate(() => { shareOutfit(); })]);
          const keep = occ === first || (variant !== 'no-cutouts' && ['fr', 'hi'].includes(lang));
          if (keep) { row.file = 'share-' + name + '.png'; await dl.saveAs(path.join(A.out, 'screens', row.file)); } else await dl.delete();
          const drawn = await page.evaluate(() => window.__drawn);
          row.over = drawn.filter(t => t.right > t.W || t.left < 0).map(t => ({ s: t.s, by: Math.max(t.right - t.W, -t.left) }));
          row.rawColor = RAW_COLOR_RE ? drawn.filter(t => RAW_COLOR_RE.test(t.s)).map(t => t.s) : [];
          row.pics = await page.evaluate(() => window.__pics);
          row.top = Math.min(...drawn.map(t => t.y)); // social apps draw their controls over about the top 14% (269px of 1920)
          // Text that stays English in another language: the same string as in the English image of this occasion and closet
          // (piece names are the person's; the wordmark and names, whole or wrapped, are left out).
          const key = occ + '|' + variant, own = data.items.map(i => String(i.body.name || '').trim().replace(/\s+/g, ' ')); if (lang === 'en') enDrawn[key] = drawn.map(t => t.s);
          else { const dict = lang === 'en' ? '' : readFileSync(path.join(REPO, 'i18n', lang + '.js'), 'utf8').toLowerCase(); // a word the dictionary keeps the same ("Formal" in Spanish) is translated
            row.english = [...new Set(drawn.map(t => t.s))].filter(t => (enDrawn[key] || []).includes(t) && /[A-Za-z]{3}/.test(t) && t !== 'WEARCYCLE' && !own.some(n => n.includes(t.replace(/[…-]$/, ''))) && !dict.includes(': "' + t.toLowerCase() + '"')); }
        } catch (e) { row.error = String(e && e.message || e).split('\n')[0]; }
        finally { if (!row.na) R.share.push(row); }
      }
    } finally { await ctx.close(); }
  }
}

// break-ui for the share image (--worst-case): outfits the fixture does not rank, drawn with the app's own shareImage,
// because the picture has no scrolling to hide behind. Each must stay inside the picture and keep its pictures a usable size.
const SHARE_SHAPES = {
  'one-piece': "({onepiece:{...byId('fx-01'),cat:'onepiece',name:'Robe longue en lin lavé à manches courtes et ceinture nouée, coupe évasée',cut:''},shoes:byId('fx-18'),acc:[]})",
  'single-piece': "({top:byId('fx-03'),acc:[]})",
  'four-main-six-small': "({outer:{...byId('fx-15'),name:'Manteau de laine bouilli à double boutonnage, doublure satinée, col montant'},top:{...byId('fx-01'),name:'हल्के नीले रंग की सूती शर्ट, लंबी आस्तीन, ऑफ़िस और त्योहारों के लिए'},under:byId('fx-06'),bottom:{...byId('fx-10'),name:'Pantalon chino bleu marine en sergé de coton stretch, coupe droite ajustée'},shoes:{...byId('fx-18'),name:'Chaussures de ville en cuir noir à bout fleuri'},acc:['fx-22','fx-23','fx-24','fx-25','fx-19'].map(byId)})",
  'hard-names': "({top:{...byId('fx-03'),name:'Pneumonoultramicroscopicsilicovolcanoconiosisextraordinairementlong'},bottom:{...byId('fx-10'),name:'👩🏽‍💻👩🏽‍💻👩🏽‍💻👩🏽‍💻👩🏽‍💻👩🏽‍💻👩🏽‍💻👩🏽‍💻👩🏽‍💻👩🏽‍💻👩🏽‍💻👩🏽‍💻👩🏽‍💻👩🏽‍💻👩🏽‍💻👩🏽‍💻👩🏽‍💻👩🏽‍💻'},shoes:{...byId('fx-18'),name:'日本語の長い名前の白いレザースニーカーとても長い名前のスニーカーです本当に長い'},acc:[{...byId('fx-22'),name:''},{...byId('fx-23'),name:'J'}]})",
  // The owner's shared picture, 2026-11-07 (WhatsApp screenshot): 4 main pieces and 6 small ones, his names.
  'owner-2026-11-07': "({outer:{...byId('fx-15'),name:'Hooded Wool Duffle Coat'},top:{...byId('fx-01'),name:'Blue Plaid Flannel Shirt'},under:{...byId('fx-06'),name:'True Classic white round neck t-shirt'},bottom:{...byId('fx-10'),name:'Blue Straight Jeans'},shoes:{...byId('fx-18'),name:'White Low-Top Sneakers'},acc:[{...byId('fx-22'),name:'Black Leather Belt'},{...byId('fx-23'),name:'Silver Chronograph Watch'},{...byId('fx-24'),name:'Black Sling Bag'},{...byId('fx-25'),name:'Grey Pom Beanie'},{...byId('fx-19'),name:'Black Wool Scarf'}]})",
  // His second picture, 2026-11-07 (after v1.66.3): "Grey / Quarter-Zip / Rates…" and "(lightblue)". His piece names (the
  // quarter-zip's full name confirmed by the owner afterwards); the tee is light blue, the only accent color.
  'owner-2026-11-07b': "({outer:{...byId('fx-15'),name:'Hooded Wool Duffle Coat',colors:['brown']},top:{...byId('fx-01'),name:'Grey Quarter-Zip Rates Sweatshirt',colors:['grey']},under:{...byId('fx-06'),name:'Blue Crew Neck Tee',colors:['lightblue']},bottom:{...byId('fx-10'),name:'Blue Straight Jeans',colors:['denim']},shoes:{...byId('fx-18'),name:'White Low-Top Sneakers'},acc:[{...byId('fx-22'),name:'Black Leather Belt'},{...byId('fx-23'),name:'Silver Chronograph Watch'},{...byId('fx-24'),name:'Black Sling Bag'},{...byId('fx-25'),name:'Grey Pom Beanie'},{...byId('fx-19'),name:'Black Wool Scarf'}]})",
  'missing-files': "({top:{...byId('fx-01'),id:'gone-1',cut:'gone-1-cut.webp',photo:'gone-1.jpg',med:'gone-1-1024.jpg',thumb:''},bottom:{...byId('fx-10'),id:'gone-2',cut:'',photo:'gone-2.jpg',med:'gone-2-1024.jpg'},acc:[]})",
};
async function shareWorst(browser, base, state) {
  R.shareWorst = []; const dev = DEV['win-1366'], data = scenario(null); data.missing = new Set(['gone-1', 'gone-2']);
  for (const lang of ['en', 'fr', 'hi', 'ja']) {
    const ctx = await newContext(browser, base, dev, { lang, data, storageState: state }); const page = await ctx.newPage();
    watchConsole(page, () => 'share-worst-' + lang);
    try {
      await page.goto(base + '/index.html'); await waitApp(page);
      await page.evaluate(() => { const P = CanvasRenderingContext2D.prototype, f = P.fillText, d = P.drawImage; window.__t = []; window.__p = [];
        P.fillText = function (s, x, y, m) { const r = this.measureText(s); window.__t.push({ s: String(s), l: Math.round(x), r: Math.round(x + r.width), y: Math.round(y), W: this.canvas.width }); return f.call(this, s, x, y, m); };
        P.drawImage = function (im, x, y, w, h) { if (w && this.canvas.width === 1080) { window.__p.push(Math.round(Math.max(w, h))); window.__boxes.push([Math.round(y), Math.round(y + h)]); } return d.apply(this, arguments); };
        window.__boxes = []; window.__cells = []; const rr = P.roundRect; P.roundRect = function (x, y, w, h) { if (this.canvas.width === 1080) window.__cells.push([Math.round(y), Math.round(y + h)]); return rr.apply(this, arguments); };
        // Where the outfit sits in its area, and every break inside a word (only scripts without spaces may break without a hyphen).
        const kit = window.shareKit; window.shareKit = async function (g, o, top, bottom) { window.__cells.length = 0; const end = await kit.apply(this, arguments); window.__area = { top, bottom, start: Math.min(...window.__cells.map(c => c[0])), end }; return end; };
        const sl = window.shareLines; window.__splits = []; window.shareLines = function (g, text) { const out = sl.apply(this, arguments), src = String(text).trim().replace(/\s+/g, ' ');
          let pos = 0; out.slice(0, -1).forEach(l => { let s = l.replace(/…$/, ''), hy = s.endsWith('-'); const at = src.indexOf(s, pos); if (at < 0 && hy) { s = s.slice(0, -1); } const i = src.indexOf(s, pos); if (i < 0) return; pos = i + s.length;
            if (src[pos] && src[pos] !== ' ' && !hy && !/-$/.test(s) && /\p{L}\p{M}*$/u.test(s) && /^\p{L}/u.test(src.slice(pos)) && !/[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/.test(s.slice(-1) + src[pos])) window.__splits.push(s.slice(-10) + '|' + src.slice(pos, pos + 6)); if (src[pos] === ' ') pos++; }); return out; }; });
      for (const [shape, expr] of Object.entries(SHARE_SHAPES)) {
        const name = lang + '-' + shape, row = { name };
        try {
          const b64 = await page.evaluate('(async () => { window.__t.length = 0; window.__p.length = 0; window.__boxes.length = 0; window.__splits.length = 0; const blob = await shareImage(' + expr + '); const u = new Uint8Array(await blob.arrayBuffer()); let s = ""; for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768)); return btoa(s); })()');
          writeFileSync(path.join(A.out, 'screens', 'share-wc-' + name + '.png'), Buffer.from(b64, 'base64'));
          const m = await page.evaluate(() => ({ t: window.__t, p: window.__p, b: window.__boxes, a: window.__area, splits: window.__splits }));
          row.above = m.a.start - m.a.top; row.below = m.a.bottom - m.a.end; row.midWord = m.splits;
          row.off = m.t.filter(t => t.r > t.W || t.l < 0).map(t => t.s.slice(0, 40)); row.low = m.t.filter(t => t.y > 1660 && t.s !== 'WEARCYCLE').map(t => t.s.slice(0, 40));
          // Lines on one baseline must not run into each other (a kind or name wider than its column).
          row.overlap = m.t.flatMap((a, i) => m.t.slice(i + 1).filter(b => Math.abs(a.y - b.y) < 10 && a.l < b.r && b.l < a.r).map(b => a.s.slice(0, 24) + ' / ' + b.s.slice(0, 24)));
          row.minPic = Math.min(...m.p.filter(h => h !== 72)); // the larger side of each drawn picture; the logo is 72px
          row.cut = m.t.filter(t => t.s.endsWith('…')).map(t => t.s); row.rawColor = RAW_COLOR_RE ? m.t.filter(t => RAW_COLOR_RE.test(t.s)).map(t => t.s) : [];
          row.lightBlue = /\blight blue\b/.test(m.t.map(t => t.s).join(' '));
        } catch (e) { row.error = String(e && e.message || e).split('\n')[0]; }
        R.shareWorst.push(row);
      }
    } finally { await ctx.close(); }
  }
  // A failure must not leave "Preparing the image…" on screen.
  const ctx = await newContext(browser, base, dev, { data, storageState: state }); const page = await ctx.newPage();
  try { await page.goto(base + '/index.html'); await waitApp(page);
    await page.evaluate(() => { HTMLCanvasElement.prototype.toBlob = function () { throw new Error('tainted'); }; shareOutfit(); });
    await page.waitForFunction(() => !/Preparing/.test(document.querySelector('#toastRoot').textContent) && document.querySelector('#toastRoot').textContent.trim(), null, { timeout: 15000 }).catch(() => {});
    R.shareFail = await page.evaluate(() => document.querySelector('#toastRoot').textContent.trim());
  } finally { await ctx.close(); }
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
      const x = b.getBoundingClientRect(), cx = x.left + x.width / 2; // top and bottom edges both uncovered (the bar sits over the page)
      const on = y => { const e = y >= 0 && y < innerHeight ? document.elementFromPoint(cx, y) : null; return !!e && b.contains(e); };
      return { top: Math.round(x.top), bottom: Math.round(x.bottom), vh: innerHeight, onTop: on(x.top + 2) && on(x.bottom - 2) }; });
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
  const SHEET_A11Y = [];
  await step('Each sheet opens and closes', async () => {
    const SHEETS = [
      ['Settings', null, SETTINGS_BTN], ['Adjust', 'outfits', '.fit.hero [data-act="adjust"]'], ['Outfit diary', 'outfits', '[data-act="diary"]'],
      ['Weather', 'outfits', '[data-wx="edit"]'], ['What I wore', 'outfits', '[data-act="logOther"]'], ['Piece preview', 'outfits', '.fit.hero [data-swap]'],
      ['Item editor', 'closet', '#closetGrid [data-edit]'], ['Closet stats', 'closet', '[data-act="stats"]'], ['Add clothes', 'closet', '#addBtn'],
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
      // Phase 12: every sheet is a named dialog that takes focus, keeps the page behind inert, has 16px fields (iOS Safari
      // zooms into smaller ones) and a 44px close button; Escape gives focus back outside the sheet.
      const f = await page.evaluate(() => { const d = document.querySelector('#sheetRoot [role=dialog]'), id = d && d.getAttribute('aria-labelledby');
        const name = id && document.getElementById(id) ? document.getElementById(id).textContent.trim() : '';
        const fields = [...d.querySelectorAll('input,select,textarea')].filter(e => e.checkVisibility && e.checkVisibility() && !['checkbox', 'radio', 'hidden', 'file', 'range'].includes(e.type));
        const x = d.querySelector('[data-close]'), xr = x && x.getBoundingClientRect();
        return { name, focus: d.contains(document.activeElement), inert: !!document.querySelector('#appRoot')?.inert,
          small: fields.filter(e => parseFloat(getComputedStyle(e).fontSize) < 16).map(e => e.id || e.type), close: xr ? Math.round(Math.min(xr.width, xr.height)) : 0 }; });
      const bad = [!f.name && 'no name', !f.focus && 'focus outside', !f.inert && 'page behind not inert', f.small.length && 'fields under 16px: ' + f.small.join(' '), f.close < 44 && 'close button ' + f.close + 'px'].filter(Boolean);
      await closeSheet(page);
      const back = await page.evaluate(() => document.activeElement !== document.body && !document.activeElement.closest('#sheetRoot'));
      if (!back) bad.push('focus not returned after Escape');
      if (bad.length) SHEET_A11Y.push(label + ': ' + bad.join(', '));
      done.push(label);
    }
    await openSheetBy(page, SETTINGS_BTN);
    const x = await page.$('#sheetRoot [data-close]'); assert(x, 'Settings has no close button');
    await x.click(); await page.waitForFunction(() => !document.querySelector('#sheetRoot').innerHTML);
    return done.length + ' sheets (Escape), plus the close button';
  });
  check('Sheets: named, focus inside, 16px fields, 44px close, focus back after Escape (Phase 12)', SHEET_A11Y.length ? 'FAIL' : 'PASS', SHEET_A11Y.length ? SHEET_A11Y.slice(0, 4).join('; ') : '12 sheets');
  // Phase 13: the zoom viewer opened from the keyboard takes focus, keeps the page behind inert, has 44px controls and a
  // readable Photo / Cut-out switch, and gives focus back on Escape; a toast shows above it; the job bar never cuts its text.
  await step('Layers: zoom viewer, toast above it, job bar text (Phase 13)', async () => {
    where = 'flows-layers'; await closeSheet(page); await goTab(page, 'care');
    const pic = await page.$('#careBody .cpic.zoomable'); assert(pic, 'no zoomable picture in Care');
    await pic.focus(); await page.keyboard.press('Enter'); await page.waitForSelector('#viewRoot .viewer', { timeout: 5000 }); await page.waitForTimeout(300);
    const v = await page.evaluate(() => { const r = document.querySelector('#viewRoot'), small = [...r.querySelectorAll('button,input')].filter(e => { const b = e.getBoundingClientRect(); return b.width && b.height < 44; }).map(e => e.getAttribute('aria-label') || e.textContent.trim());
      const lum = c => { const m = c.match(/[\d.]+/g).map(Number).slice(0, 3).map(x => { x /= 255; return x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }); return .2126 * m[0] + .7152 * m[1] + .0722 * m[2]; };
      const bgOf = e => { let n = e; while (n) { const c = getComputedStyle(n).backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c; n = n.parentElement; } return 'rgb(255,255,255)'; };
      const seg = [...r.querySelectorAll('[data-vmode]')].map(b => { const a = lum(getComputedStyle(b).color), c = lum(bgOf(b)); return (Math.max(a, c) + .05) / (Math.min(a, c) + .05); });
      return { focus: r.contains(document.activeElement), inert: !!document.querySelector('#appRoot').inert, small, seg: seg.length ? Math.min(...seg) : null }; });
    await page.evaluate(() => toast('Layer check')); await page.waitForTimeout(250);
    const toastOn = await page.evaluate(() => { const t = document.querySelector('#toastRoot .toast'); if (!t) return false; const b = t.getBoundingClientRect(); return t.contains(document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2)); });
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    const back = await page.evaluate(() => !document.querySelector('#viewRoot').innerHTML && !!document.activeElement.closest('.cpic') && !document.querySelector('#appRoot').inert);
    if (v.seg == null) { // the switch shows only for a piece with both a photo and a cut-out: open one of those
      await page.evaluate(() => { const it = allItems().find(i => i.photo && i.cut); if (it) openViewer(it.id); }); await page.waitForTimeout(500);
      v.seg = await page.evaluate(() => { const r = document.querySelector('#viewRoot'); const lum = c => { const m = c.match(/[\d.]+/g).map(Number).slice(0, 3).map(x => { x /= 255; return x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }); return .2126 * m[0] + .7152 * m[1] + .0722 * m[2]; };
        const bgOf = e => { let n = e; while (n) { const c = getComputedStyle(n).backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c; n = n.parentElement; } return 'rgb(255,255,255)'; };
        const seg = [...r.querySelectorAll('[data-vmode]')].map(b => { const a = lum(getComputedStyle(b).color), c = lum(bgOf(b)); return (Math.max(a, c) + .05) / (Math.min(a, c) + .05); });
        return seg.length ? Math.min(...seg) : null; });
      await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
    await page.evaluate(() => { document.querySelector('#toastRoot').innerHTML = ''; job('Adding 12 of 40 · Reading the photo · Making the cut-out · Saving to your closet', 30); }); await page.waitForTimeout(150);
    const jobCut = await page.evaluate(() => { const t = document.querySelector('.jobbar .jt'); return t.scrollWidth > t.clientWidth + 1 || t.scrollHeight > t.clientHeight + 1; });
    await page.evaluate(() => job(''));
    const bad = [!v.focus && 'viewer focus outside', !v.inert && 'page behind the viewer not inert', v.small.length && 'viewer controls under 44px: ' + v.small.join(', '), v.seg != null && v.seg < 4.5 && 'Photo / Cut-out ' + v.seg.toFixed(2) + ':1',
      !toastOn && 'toast hidden under the viewer', !back && 'focus not back on the picture after Escape', jobCut && 'job bar text cut'].filter(Boolean);
    assert(!bad.length, bad.join('; '));
    return 'viewer focus, inert page, 44px controls, switch ' + (v.seg ? v.seg.toFixed(1) + ':1' : 'n/a') + ', toast above, focus back; job text whole';
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
// Colors outside styles.css (DESIGN.md, the Colors Outside CSS Rule): every copy must equal the tokens.
function colorsCheck() {
  const css = readFileSync(path.join(REPO, 'styles.css'), 'utf8'), rd = f => readFileSync(path.join(REPO, f), 'utf8');
  const block = sel => { const i = css.indexOf(sel); return i < 0 ? '' : css.slice(i, css.indexOf('}', i)); };
  const tok = (b, n) => (b.match(new RegExp('--' + n + ':\\s*(#[0-9a-fA-F]{3,8})')) || [])[1]?.toLowerCase();
  const L = block(':root{'), D = block(':root[data-theme="dark"]'), bad = [];
  const want = (where, got, exp) => { if (String(got).toLowerCase() !== String(exp).toLowerCase()) bad.push(where + ' ' + got + ', tokens ' + exp); };
  if (!tok(L, 'bg') || !tok(D, 'bg')) bad.push('tokens not found in styles.css');
  const metas = f => [...rd(f).matchAll(/name="theme-color" content="(#[0-9a-fA-F]+)" media="\(prefers-color-scheme: (light|dark)\)"/g)].map(m => [m[2], m[1]]);
  for (const f of ['index.html', 'privacy.html', 'whats-new.html']) { const m = metas(f); if (m.length !== 2) bad.push(f + ': ' + m.length + ' theme-color metas');
    for (const [k, v] of m) want(f + ' meta ' + k, v, tok(k === 'light' ? L : D, 'bg')); }
  for (const f of ['theme.js', 'app.js']) { const m = rd(f).match(/dark'?\?'(#[0-9a-fA-F]{6})':'(#[0-9a-fA-F]{6})'/); if (!m) bad.push(f + ': theme colors not found'); else { want(f + ' dark', m[1], tok(D, 'bg')); want(f + ' light', m[2], tok(L, 'bg')); } }
  const man = JSON.parse(rd('manifest.webmanifest')); want('manifest theme_color', man.theme_color, tok(L, 'ink')); want('manifest background_color', man.background_color, tok(L, 'ink'));
  for (const f of ['privacy.html', 'whats-new.html']) { const s = rd(f), lt = s.slice(s.indexOf(':root{'), s.indexOf('}', s.indexOf(':root{'))), dk = s.slice(s.indexOf(':root[data-theme="dark"]{'), s.indexOf('}', s.indexOf(':root[data-theme="dark"]{')));
    for (const n of ['bg', 'ink', 'muted', 'line']) { want(f + ' --' + n, tok(lt, n), tok(L, n)); want(f + ' dark --' + n, tok(dk, n), tok(D, n)); } }
  const sh = (rd('app.js').match(/const SHARE=\{([^}]*)\}/) || [])[1] || ''; const val = n => (sh.match(new RegExp('\\b' + n + ":'(#[0-9a-fA-F]{6})'")) || [])[1];
  for (const [k, n, b] of [['bg', 'bg', L], ['ink', 'ink', L], ['muted', 'muted', L], ['onInk', 'bg', L], ['mutedOnInk', 'muted', D], ['c1', 'canvas-1', L], ['c2', 'canvas-2', L]]) want('share image ' + k, val(k), tok(b, n));
  check('Colors outside styles.css match the tokens', bad.length ? 'FAIL' : 'PASS', bad.length ? bad.slice(0, 5).join('; ') : "theme-color metas (3 pages), theme.js, app.js, manifest, privacy and What's new, share image");
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
  versionCheck(); colorsCheck();
  const server = await startServer();
  let browser;
  try { browser = await PW.chromium.launch({ args: CHROMIUM_ARGS }); } catch (e) { server.stop(); throw e; } // else the local server keeps the run alive
  let camBrowser = null; // only the camera views run with the fake capture device, so the other screenshots keep their launch flags
  if (groups.includes('camera') && !A.worstCase) camBrowser = await PW.chromium.launch({ args: [...CHROMIUM_ARGS, ...fakeCameraArgs()] });
  R.render = { browser: 'chromium ' + browser.version(), args: CHROMIUM_ARGS };
  try {
    const data = scenario(null);
    const state = await signIn(browser, server.base, data);
    check('Sign-in', 'PASS', R.auth.mode + ': ' + R.auth.reason);
    if (!A.worstCase) {
      await flows(browser, server.base, state, data);
      if (views.includes('outfits')) { await wearSizes(browser, server.base, state, data); await busyMorning(browser, server.base, state, data); }
      const sets = [];
      for (const dev of devices) for (const theme of ['light', 'dark']) sets.push({ dev, theme, lang: 'en' });
      if (devices.includes(DEV['phone-360'])) for (const lang of ['fr', 'ja']) sets.push({ dev: DEV['phone-360'], theme: 'light', lang });
      for (const s of sets) {
        const tag = s.dev.id + '-' + s.theme + '-' + s.lang;
        console.log('capture ' + tag);
        await captureSet(browser, server.base, state, { ...s, data, tag, runAxe: true, snapshots: s.dev.id === 'phone-390' && s.theme === 'light' });
        await captureAdded(browser, camBrowser, server.base, state, { ...s, tag, runAxe: true, snapshots: s.dev.id === 'phone-390' && s.theme === 'light' });
      }
      if (groups.includes('share')) await captureShare(browser, server.base, state);
    } else {
      if (groups.includes('share')) await shareWorst(browser, server.base, state);
      const plan = [['long', ['en', 'fr']], ['empty', ['en']], ['many', ['en']], ['care', ['en', 'fr']], ['calm', ['en']]];
      for (const [name, langs] of plan) {
        const d = scenario(name);
        for (const dev of devices.filter(d_ => ['phone-360', 'win-1366'].includes(d_.id))) for (const lang of langs) {
          const tag = 'wc-' + name + '-' + dev.id + '-' + lang; console.log('capture ' + tag);
          await captureSet(browser, server.base, state, { dev, theme: 'light', lang, data: d, tag, runAxe: false, snapshots: false });
          if (name === 'long') await captureAdded(browser, null, server.base, state, { dev, theme: 'light', lang, tag, runAxe: false, snapshots: false, only: ['sheets', 'layers'], longNames: true });
        }
      }
    }
  } finally { await browser.close(); if (camBrowser) await camBrowser.close(); server.stop(); }

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
  // The views added in Phase 14 step 0 have their own lines below: the baseline does not have them.
  const oldView = c => VIEWS.includes(c.view), T0 = totals(oldView), TA = totals(c => !oldView(c));
  const G = later.length ? totals(c => oldView(c) && baseDevices.has(c.device)) : T0;
  const gnote = k => later.length ? '; ' + later.join(', ') + ' not in the baseline, all devices ' + T0[k] : '';
  if (!A.worstCase) {
    T.wearThisVisible = R.wearThis ? R.wearThis.visible : null;
    if (R.wearThis) {
      // Required since Phase 8 (v1.53.0): Outfits is built for it (docs/design/SCREENS.md, Outfits).
      check('"Wear this" visible at 390x844 without scrolling', R.wearThis.visible ? 'PASS' : 'FAIL', R.wearThis.detail);
    }
    if (!A.noAxe) gate('axe-core: no serious or critical issues', G.axeSerious, base && base.axeSerious, true, gnote('axeSerious'));
    gate('No English left in French and Japanese', G.englishLeft, base && base.englishLeft, true, gnote('englishLeft'));
  }
  gate('No app text cut off or spilling (all languages)', G.textOverflow, base && base.textOverflow, false, gnote('textOverflow'));
  { const all = R.captures.filter(c => !c.na && !c.error), raw = all.filter(c => (c.colorKeys || []).length);
    check('Color names shown as words, not keys (' + RAW_COLORS.join(', ') + ')', raw.length ? 'FAIL' : 'PASS', raw.length ? raw.length + ' views: ' + raw.slice(0, 4).map(c => c.view + ' ' + c.colorKeys[0]).join('; ') : all.length + ' views'); }
  if (R.captures.some(c => !oldView(c))) { // no baseline for these: anything found shows as REVIEW, with where in summary.md
    const where = f => [...new Set(caps.filter(c => !oldView(c) && f(c)).map(c => c.view))].slice(0, 8).join(', ');
    if (!A.noAxe && !A.worstCase) gate('Added views: axe-core, serious or critical nodes', TA.axeSerious, null, false, '');
    if (!A.noAxe && !A.worstCase && TA.axeSerious) check('Added views with axe-core findings', 'INFO', where(c => (c.axe || []).length));
    if (!A.worstCase) gate('Added views: English left in French and Japanese', TA.englishLeft, null, false, '');
    if (TA.englishLeft) check('Added views with English left', 'INFO', where(c => (c.english || []).length));
    gate('Added views: app text cut off or spilling', TA.textOverflow, null, false, '');
    if (TA.textOverflow) check('Added views with text cut or spilling', 'INFO', where(c => (c.spilling || []).length + (c.truncated || []).length));
    check('Added views', 'INFO', caps.filter(c => !oldView(c)).length + ' first screens; below the first screen, all views: ' + caps.reduce((n, c) => n + (c.rest || 0), 0) + ' more');
  }
  if (R.shareWorst) {
    const bad = R.shareWorst.filter(x => x.error || x.off.length || x.low.length || x.overlap.length || x.minPic < 70);
    check('Share image, worst case: stays inside the picture, no overlapping lines, pictures at least 70px', bad.length ? 'FAIL' : 'PASS', bad.length ? bad.slice(0, 4).map(x => x.name + ' ' + (x.error || JSON.stringify({ off: x.off, low: x.low, overlap: x.overlap, minPic: x.minPic }))).join('; ') : R.shareWorst.length + ' images; smallest picture ' + Math.min(...R.shareWorst.map(x => x.minPic)) + 'px');
    const split = R.shareWorst.filter(x => (x.midWord || []).length), off = R.shareWorst.filter(x => Math.abs(x.above - x.below) > 2 && x.below > 2);
    check('Share image, worst case: a word broken inside has a hyphen (scripts with spaces)', split.length ? 'FAIL' : 'PASS', split.length ? split.slice(0, 4).map(x => x.name + ' ' + x.midWord.slice(0, 2).join(', ')).join('; ') : '');
    check('Share image, worst case: room left over is shared above and below the outfit', off.length ? 'FAIL' : 'PASS', off.length ? off.slice(0, 4).map(x => x.name + ' above ' + x.above + ', below ' + x.below).join('; ') : 'largest band ' + Math.max(...R.shareWorst.map(x => Math.max(x.above, x.below))) + 'px');
    { const own = R.shareWorst.filter(x => /^[a-z]+-owner-/.test(x.name)), cut = own.filter(x => (x.cut || []).length);
      check("Share image, worst case: the owner's outfits keep every name whole (4 lines)", cut.length || !own.length ? 'FAIL' : 'PASS', cut.length ? cut.slice(0, 4).map(x => x.name + ' "' + x.cut[0] + '"').join('; ') : own.length + ' images'); }
    { const raw = R.shareWorst.filter(x => (x.rawColor || []).length), lb = R.shareWorst.find(x => x.name === 'en-owner-2026-11-07b');
      check('Share image, worst case: color names as words ("light blue")', raw.length || !lb || !lb.lightBlue ? 'FAIL' : 'PASS', raw.length ? raw.slice(0, 4).map(x => x.name + ' "' + x.rawColor[0] + '"').join('; ') : lb && lb.lightBlue ? 'en-owner-2026-11-07b says light blue' : 'en-owner-2026-11-07b: light blue not drawn'); }
    check('Share image: a failure says so', R.shareFail === 'Could not make the image.' ? 'PASS' : 'FAIL', R.shareFail);
  }
  if (R.shareSent) {
    const bad = R.shareSent.filter(x => x.keys.join() !== 'files,title' || x.files.length !== 1 || !/^image\/png wearcycle-outfit\.png$/.test(x.files[0]) || !x.title);
    check('Share image: the share menu gets the picture and its title, no message', bad.length || !R.shareSent.length ? 'FAIL' : 'PASS', bad.length ? bad.map(x => x.lang + ' ' + JSON.stringify({ keys: x.keys, title: x.title, files: x.files })).slice(0, 4).join('; ') : R.shareSent.length + ' languages: ' + R.shareSent.map(x => x.lang + ' "' + x.title + '"').join(', '));
  }
  if (R.share) {
    const over = R.share.filter(x => x.over.length), saved = R.share.filter(x => x.file);
    check('Share image: drawn in every language and occasion', R.share.some(x => x.error) ? 'FAIL' : 'PASS', R.share.length + ' images, ' + saved.length + ' saved; ' + R.share.filter(x => x.error).map(x => x.name + ' ' + x.error).slice(0, 3).join('; '));
    { const pics = R.share.flatMap(x => x.pics || []), top = Math.min(...R.share.map(x => x.top ?? 9999));
      check('Share image: pictures and first line', 'INFO', pics.length + ' pictures, ' + pics.filter(k => k > 1.1).length + ' drawn larger than 1.1x their file (up to ' + Math.max(0, ...pics) + 'x); highest text starts at ' + top + 'px (social apps cover about the top 269px)'); }
    { const eng = R.share.filter(x => (x.english || []).length); check('Share image: no English left in other languages', eng.length ? 'REVIEW' : 'PASS', eng.length ? eng.length + ': ' + eng.slice(0, 4).map(x => x.name + ' "' + x.english[0].slice(0, 40) + '"').join('; ') : 'every kind, occasion and palette line translated');
      const high = R.share.filter(x => x.top < 269); check('Share image: text starts below the area social apps cover (269px)', high.length ? 'FAIL' : 'PASS', high.length ? high.length + ' images, highest ' + Math.min(...high.map(x => x.top)) + 'px' : ''); }
    { const raw = R.share.filter(x => (x.rawColor || []).length); check('Share image: color names as words, not keys', raw.length ? 'FAIL' : 'PASS', raw.length ? raw.length + ' images: ' + raw.slice(0, 4).map(x => x.name + ' "' + x.rawColor[0] + '"').join('; ') : R.share.length + ' images'); }
    check('Share image: all text inside the picture', over.length ? 'FAIL' : 'PASS', over.length ? over.length + ' of ' + R.share.length + ': ' + over.slice(0, 4).map(x => x.name + ' "' + x.over[0].s.slice(0, 40) + '" +' + x.over[0].by + 'px').join('; ') : R.share.length + ' images');
  }
  check('Piece names cut with an ellipsis', 'INFO', T.userNamesCut + ' (user-typed names may be truncated; listed per view in summary.json)');
  if (R.wearSizes) {
    const req = R.wearSizes.filter(x => x.required), miss = req.filter(x => !x.visible), at = x => x.missing ? 'no button' : x.top + '-' + x.bottom + ' of ' + x.vh;
    T.wearThisSizes = req.length - miss.length + ' of ' + req.length;
    check('"Wear this" visible without scrolling at the ' + req.length + ' sizes in SCREENS.md', miss.length ? 'FAIL' : 'PASS',
      T.wearThisSizes + (miss.length ? '; not at ' + miss.map(x => x.size + ' (' + at(x) + ')').join(', ') : ''));
    check('"Wear this" on phones turned sideways', 'INFO', R.wearSizes.filter(x => !x.required).map(x => x.size + ' ' + (x.visible ? 'visible (' + at(x) + ')' : at(x))).join('; '));
  }
  if (R.busy && R.busy.length) {
    const at = x => x.missing ? 'no button' : (x.visible ? 'visible ' : 'not visible ') + x.top + '-' + x.bottom + ' of ' + x.vh;
    const off = R.busy.filter(x => !x.busy), req = R.busy.filter(x => x.required), miss = req.filter(x => !x.visible);
    check('Busy morning reached (two holidays, the holiday bar, a laundry reminder)', off.length ? 'FAIL' : 'PASS',
      off.length ? off.map(x => x.size + ' ' + JSON.stringify(x.state)).join('; ') : R.busy.length + ' sizes at ' + CLOSET.busyMorning);
    check('"Wear this" visible on a busy morning at ' + req.map(x => x.size).join(' and '), miss.length || off.length ? 'FAIL' : 'PASS', req.map(x => x.size + ' ' + at(x)).join('; '));
    check('"Wear this" on a busy morning, other sizes', 'INFO', R.busy.filter(x => !x.required).map(x => x.size + ' ' + at(x)).join('; '));
  }
  const first = caps.filter(c => c.theme === 'light' && c.lang === 'en');
  const picLine = c => c.device + ' ' + c.pictures.upscaled + ' of ' + c.pictures.shown + (c.pictures.upscaled ? ' (up to ' + c.pictures.worst + 'x)' : '');
  const pics = first.filter(c => c.view === 'outfits' && c.pictures);
  if (pics.length) check('Outfits: pictures drawn larger than their file (first screen)', 'INFO', pics.map(picLine).join('; '));
  for (const v of ['closet', 'preview', 'editor']) { const pv = first.filter(c => c.view === v && c.pictures); // Phase 9: Closet and the garment sheets
    if (pv.length) check(v[0].toUpperCase() + v.slice(1) + ': pictures drawn larger than their file (first screen)', 'INFO', pv.map(picLine).join('; ')); }
  const devs = [...new Set(first.filter(c => c.img).map(c => c.device))];
  if (devs.length) check('Image bytes per screen (fixture images, first open)', 'INFO', devs.map(d => d + ' ' + ['outfits', 'closet', 'care', 'shop'].map(v => { const c = first.find(x => x.device === d && x.view === v && x.img); return c ? v + ' ' + c.img.kb + ' KB/' + c.img.files : ''; }).filter(Boolean).join(', ')).join('; '));
  let det = null;
  if (!A.noDetector && !A.worstCase) {
    try { det = detector(); const snap = det.snapshots || { warnings: 0, advisories: 0, hiddenElementsExcluded: {} };
      const addedW = (snap.findings || []).filter(f => !f.advisory && !VIEWS.includes(path.basename(f.file || '', '.html')));
      T.detectorWarningsAdded = addedW.length; // the added views' snapshots: their own line, the baseline does not have them
      T.detectorWarnings = det.static.warnings + snap.warnings - addedW.length; T.detectorAdvisories = det.static.advisories + snap.advisories;
      T.detectorHiddenExcluded = Object.values(snap.hiddenElementsExcluded || {}).reduce((a, b) => a + b, 0);
      const w = T.detectorWarnings + ' (index.html + styles.css ' + det.static.warnings + (det.snapshots ? ', screen snapshots ' + (snap.warnings - addedW.length) : '') + ')';
      if (R.captures.some(c => !VIEWS.includes(c.view))) check('Added views: detector warnings', addedW.length ? 'REVIEW' : 'PASS', addedW.length + (addedW.length ? ': ' + [...new Set(addedW.map(f => f.antipattern + ' ' + path.basename(f.file, '.html')))].slice(0, 6).join(', ') : ''));
      if (base && base.detectorWarnings != null) check('Detector warnings (npx impeccable@4.5.2 detect)', T.detectorWarnings <= base.detectorWarnings ? 'PASS' : 'FAIL', w + ' (baseline ' + base.detectorWarnings + '). Rules: detector.json');
      else check('Detector warnings (npx impeccable@4.5.2 detect)', T.detectorWarnings ? 'REVIEW' : 'PASS', w + (T.detectorWarnings ? ' (no baseline yet: recorded for Phase 4)' : '') + '. Rules: detector.json');
      check('Detector advisories (recorded, not gated)', 'INFO', T.detectorAdvisories + ' (index.html + styles.css ' + det.static.advisories + (det.snapshots ? ', screen snapshots ' + snap.advisories + '; ' + T.detectorHiddenExcluded + ' hidden elements left out of the snapshots' : '') + ')');
    } catch (e) { check('Detector warnings (npx impeccable@4.5.2 detect)', 'FAIL', e.message); }
  }
  if (A.compare) await compareTo(A.compare);

  const summary = { when: new Date().toISOString(), seconds: Math.round((Date.now() - started) / 1000), options: { ...A, out: undefined }, fixedClock: CLOSET.now,
    auth: R.auth, render: R.render, totals: T, share: R.share, shareSent: R.shareSent, shareWorst: R.shareWorst, checks: R.checks, compare: R.compare, wearSizes: R.wearSizes, busyMorning: R.busy, console: R.console, writesAnsweredLocally: R.writes, functionsAnsweredLocally: R.functions,
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
