#!/usr/bin/env node
// Wearcycle live check: the deployed site with the test account's real data. Runs in GitHub Actions
// (.github/workflows/live-check.yml), because Claude's container cannot reach Supabase, Cloudflare or Open-Meteo and
// GitHub's runners can. tools/check.mjs stays the deterministic check (fixed clock, fixture closet, screenshots);
// this one answers "does the real thing work": the deployed files, the security headers, sign-in, real data,
// photos, weather, the service worker and the claude Edge Function.
//
//   WEARCYCLE_TEST_EMAIL=... WEARCYCLE_TEST_PASSWORD=... node tools/live-check.mjs --base-url https://preview.wearcycle.pages.dev
//     [--wait <seconds>]       how long to wait for Cloudflare to serve this checkout (default 600)
//     [--no-claude]            call the Edge Function with an unknown task instead: free, and still checks that it is
//                              deployed, accepts the sign-in, answers CORS and has its Anthropic key
//     [--engines chromium,webkit]
//
// Read-only: the test account's data is never changed. Every write to Supabase (tables, storage, auth, functions) is
// blocked and reported, except one Edge Function request: task "graphic" with a 224 x 224 JPEG (64 image tokens, at
// most 120 output tokens; under $0.002 at Claude Sonnet 5.5 list prices of $2 and $10 per million tokens, October
// 2026). It adds 1 to the account's daily "graphic" count (limit 80). The task "delete_account" is never sent.
// The repository is public, so its Actions logs are too: only counts and pass/fail are printed. No screenshots,
// piece names, email address or URL query strings (signed photo URLs carry tokens).
import { createHash } from 'node:crypto';
import { appendFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDeps } from './deps.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = n => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : undefined; };
const BASE = (opt('base-url') || '').replace(/\/$/, '');
if (!/^https?:\/\/[^/]+$/.test(BASE)) { console.error('Usage: node tools/live-check.mjs --base-url https://host'); process.exit(2); }
const WAIT_MS = Number(opt('wait') || 600) * 1000;
const ENGINES = (opt('engines') || 'chromium,webkit').split(',');
const TASK = argv.includes('--no-claude') ? 'ping' : 'graphic'; // the only tasks this script ever sends
const EMAIL = process.env.WEARCYCLE_TEST_EMAIL || '', PASS = process.env.WEARCYCLE_TEST_PASSWORD || '';

const read = f => readFileSync(path.join(REPO, f));
const CFG = read('config.js').toString();
const SB_URL = (CFG.match(/supabaseUrl:\s*'([^']+)'/) || [])[1], SB_KEY = (CFG.match(/supabaseKey:\s*'([^']+)'/) || [])[1];
const SB_HOST = new URL(SB_URL).host;
const APP_VERSION = (read('app.js').toString().match(/const APP_VERSION='([^']+)'/) || [])[1];

/* ---------- results (public log: counts and pass/fail only) ---------- */
const results = [];
const strip = s => String(s).replace(/(https?:\/\/[^\s"'<>)]+)/g, u => u.split(/[?#]/)[0]).replace(/\s+/g, ' ').slice(0, 240);
function check(name, status, detail) { results.push({ name, status, detail: strip(detail || '') }); console.log(status.padEnd(6) + ' ' + name + (detail ? ': ' + strip(detail) : '')); }
async function step(name, fn) {
  try { const r = await fn(); if (r && typeof r === 'object') check(name, r.status, r.detail); else check(name, 'PASS', r); }
  catch (e) { check(name, 'FAIL', (e && e.message || String(e)).split('\n')[0]); }
}
const settle1 = p => p.then(v => v, () => undefined); // a lost race must not become an unhandled rejection

/* ---------- 1. Cloudflare serves this checkout ---------- */
const sha = b => createHash('sha256').update(b).digest('hex');
function shellFiles() {
  const sw = read('sw.js').toString();
  return [...(sw.match(/const SHELL = \[([\s\S]*?)\];/) || [, ''])[1].matchAll(/'([^']+)'/g)].map(m => m[1]).filter(f => f !== './');
}
async function servedHash(file) {
  const r = await fetch(BASE + '/' + (file === 'index.html' ? '' : file) + '?live=' + Date.now(), { cache: 'no-store' });
  return r.ok ? sha(Buffer.from(await r.arrayBuffer())) : 'HTTP ' + r.status;
}
async function waitForDeploy() {
  const files = shellFiles(), want = Object.fromEntries(files.map(f => [f, sha(read(f))]));
  const t0 = Date.now(); let wrong = files;
  while (true) {
    wrong = [];
    for (const f of files) { let h; try { h = await servedHash(f); } catch (e) { h = 'error'; } if (h !== want[f]) wrong.push(f); }
    if (!wrong.length) return files.length + ' app files identical to this commit after ' + Math.round((Date.now() - t0) / 1000) + ' s';
    if (Date.now() - t0 > WAIT_MS) throw new Error(wrong.length + ' of ' + files.length + ' files still differ after ' + WAIT_MS / 1000 + ' s: ' + wrong.slice(0, 5).join(', '));
    await new Promise(r => setTimeout(r, 10000));
  }
}

/* ---------- 2. security headers, as written in _headers ---------- */
function headerRules(reqPath) {
  const rules = []; let cur = null;
  for (const line of read('_headers').toString().split('\n')) {
    const t = line.trim(); if (!t || t.startsWith('#')) continue;
    if (!/^\s/.test(line)) { cur = { path: t, set: {}, unset: [] }; rules.push(cur); continue; }
    if (t.startsWith('!')) cur.unset.push(t.slice(1).trim().toLowerCase());
    else { const i = t.indexOf(':'); cur.set[t.slice(0, i).trim().toLowerCase()] = t.slice(i + 1).trim(); }
  }
  const applies = p => p === reqPath || (p.endsWith('*') && reqPath.startsWith(p.slice(0, -1)));
  const set = {}, unset = new Set();
  for (const r of rules.filter(r => applies(r.path))) { Object.assign(set, r.set); r.unset.forEach(h => unset.add(h)); }
  return { set, unset };
}
async function headersCheck() {
  const res = await fetch(BASE + '/', { cache: 'no-store', redirect: 'manual' });
  const { set, unset } = headerRules('/'), bad = [];
  for (const [h, v] of Object.entries(set)) { const got = res.headers.get(h); if ((got || '').replace(/\s+/g, ' ') !== v.replace(/\s+/g, ' ')) bad.push(h + (got ? ' differs' : ' missing')); }
  for (const h of unset) if (res.headers.has(h)) bad.push(h + ' present');
  if (bad.length) throw new Error(bad.join('; '));
  return Object.keys(set).length + ' headers as in _headers, ' + unset.size + ' removed';
}
// Hosts the page may contact: the ones the Content-Security-Policy allows (connect-src and img-src).
function cspHosts() {
  const csp = headerRules('/').set['content-security-policy'] || '';
  const hosts = new Set([new URL(BASE).host]);
  for (const d of csp.split(';')) { const [name, ...src] = d.trim().split(/\s+/); if (name === 'connect-src' || name === 'img-src') src.filter(s => /^https:\/\//.test(s)).forEach(s => hosts.add(s.replace(/^https:\/\//, '').replace(/\/.*$/, ''))); }
  return hosts;
}

/* ---------- 3. browsers ---------- */
const DEVICES = {
  chromium: [{ id: 'phone-390', width: 390, height: 844, dpr: 3, touch: true }, { id: 'win-1366', width: 1366, height: 768, dpr: 1, touch: false }],
  webkit: [{ id: 'ipad-820', width: 820, height: 1180, dpr: 2, touch: true }],
};
const fnGate = { open: false };
const taskOf = req => { try { return JSON.parse(req.postData() || '{}').task; } catch { return undefined; } };
const shortPath = p => p.split('/').slice(0, 4).join('/'); // drops ids and file names
const allowedHosts = cspHosts();

// A context whose page can read but never write: anything else sent to Supabase is aborted and listed.
async function guardedContext(browser, dev, { storageState, serviceWorkers = 'block' } = {}) {
  const ctx = await browser.newContext({ viewport: { width: dev.width, height: dev.height }, deviceScaleFactor: dev.dpr, isMobile: dev.touch, hasTouch: dev.touch,
    locale: 'en-CA', timezoneId: 'America/Toronto', serviceWorkers, storageState });
  const log = { blocked: [], unexpected: new Set(), failed: [], console: [], csp: [], items: null };
  await ctx.route('**/*', route => {
    const req = route.request(), u = new URL(req.url()), m = req.method();
    if (u.host !== SB_HOST) return route.continue();
    const p = u.pathname, task = p === '/functions/v1/claude' && m === 'POST' ? taskOf(req) : undefined;
    const ok = m === 'GET' || m === 'HEAD' || m === 'OPTIONS'
      || (m === 'POST' && p === '/auth/v1/token') // sign-in and token refresh
      || (m === 'POST' && p.startsWith('/storage/v1/object/sign/')) // signed photo URLs, nothing stored
      || (fnGate.open && task === TASK && task !== 'delete_account');
    if (ok) return route.continue();
    log.blocked.push(m + ' ' + shortPath(p) + (task ? ' (task ' + task + ')' : ''));
    return route.abort('blockedbyclient');
  });
  ctx.on('request', r => { const u = r.url(); if (/^https?:/.test(u) && !allowedHosts.has(new URL(u).host)) log.unexpected.add(new URL(u).host); });
  ctx.on('requestfailed', r => { const t = (r.failure() || {}).errorText || ''; if (!/ABORTED|BLOCKED_BY_CLIENT|cancel/i.test(t)) log.failed.push(r.method() + ' ' + new URL(r.url()).host + shortPath(new URL(r.url()).pathname) + ' ' + t); });
  ctx.on('response', async r => { try { const u = new URL(r.url()); if (u.host === SB_HOST && u.pathname === '/rest/v1/items' && r.request().method() === 'GET' && log.items === null) { const j = await r.json(); if (Array.isArray(j)) log.items = j.length; } } catch {} });
  ctx.on('page', page => {
    page.on('console', m => { if (m.type() !== 'error') return; const t = m.text(); if (/Content.Security.Policy|Refused to (load|connect|execute|apply|frame)/i.test(t)) log.csp.push(t); else if (!/BLOCKED_BY_CLIENT/i.test(t)) log.console.push(t); });
    page.on('pageerror', e => log.console.push(String(e && e.message || e)));
  });
  return { ctx, log };
}
const logProblems = log => [...log.blocked.map(b => 'write blocked: ' + b), ...[...log.unexpected].map(h => 'host outside the CSP: ' + h),
  ...log.failed.map(f => 'request failed: ' + f), ...log.csp.map(c => 'CSP: ' + c), ...log.console.map(c => 'console: ' + c)];

async function settle(page) {
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.evaluate(async () => {
    const deadline = performance.now() + 10000;
    await document.fonts.ready;
    const pending = () => [...document.images].filter(i => i.getClientRects().length && i.currentSrc && !i.complete).length
      + [...document.querySelectorAll('img[data-cut]')].filter(i => !(i.src.startsWith('blob:') && i.complete) && !(typeof CUT !== 'undefined' && CUT.missing.has(i.dataset.cut))).length;
    while (pending() && performance.now() < deadline) await new Promise(r => setTimeout(r, 150));
  });
}
async function waitApp(page) {
  await page.waitForSelector('#appRoot:not([hidden])', { timeout: 30000 });
  await page.waitForFunction(() => { const f = document.querySelector('#fits'); return f && !/Loading/.test(f.textContent) && (f.querySelector('.fit.hero') || f.querySelector('.empty')); }, null, { timeout: 30000 });
  await settle(page);
}
const sheetOpen = page => page.evaluate(() => !!document.querySelector('#sheetRoot .sheet'));
async function closeSheet(page) { if (!(await sheetOpen(page))) return; await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('#sheetRoot').innerHTML, null, { timeout: 5000 }); }
async function goTab(page, tab) { await closeSheet(page); await page.click('nav.tabs button[data-tab="' + tab + '"]'); await page.waitForSelector('#tab-' + tab + ':not([hidden])'); await settle(page); }
async function openSheet(page, sel, label) { const el = await page.$(sel); if (!el) return label + ' (no control)'; await el.click(); await page.waitForSelector('#sheetRoot .sheet', { timeout: 8000 }); await closeSheet(page); return label; }
const brokenImages = page => page.evaluate(() => { const imgs = [...document.images].filter(i => i.getClientRects().length && i.getAttribute('src'));
  return { shown: imgs.length, broken: imgs.filter(i => i.complete && !i.naturalWidth).length }; });

async function signIn(browser) {
  const { ctx, log } = await guardedContext(browser, DEVICES.chromium[0]);
  const page = await ctx.newPage();
  await page.goto(BASE + '/');
  await page.waitForSelector('#g-email', { timeout: 30000 });
  if (await page.$('#g-mode-in')) await page.click('#g-mode-in');
  await page.waitForSelector('#g-in');
  await page.fill('#g-email', EMAIL); await page.fill('#g-pass', PASS); await page.click('#g-in');
  const r = await Promise.race([settle1(page.waitForSelector('#appRoot:not([hidden])', { timeout: 30000 }).then(() => 'ok')),
    settle1(page.waitForFunction(() => ((document.querySelector('#g-err') || {}).textContent || '').trim(), null, { timeout: 30000 }).then(() => 'err'))]);
  if (r !== 'ok') { const msg = r === 'err' ? await page.textContent('#g-err') : 'no answer in 30 s'; await ctx.close(); throw new Error('refused: ' + msg); }
  await waitApp(page);
  const state = await ctx.storageState(), items = log.items;
  await ctx.close();
  return { state, items, problems: logProblems(log) };
}

async function deviceChecks(browser, engine, dev, state) {
  const tag = engine + ' ' + dev.id + ': ';
  const { ctx, log } = await guardedContext(browser, dev, { storageState: state });
  const page = await ctx.newPage(); let imgs = { shown: 0, broken: 0 };
  try {
    await step(tag + 'app opens signed in', async () => { await page.goto(BASE + '/'); await waitApp(page);
      if (await sheetOpen(page)) { const h = (await page.textContent('#sheetRoot h3').catch(() => '')) || 'a sheet'; await closeSheet(page).catch(() => {}); return { status: 'REVIEW', detail: 'opened with "' + h.trim().slice(0, 40) + '" on top' }; }
      return log.items === null ? 'items not read' : log.items + ' items read from Supabase'; });
    await step(tag + 'outfits', async () => {
      // Reads the outfit screen. Tapping an occasion chip only changes this browser's local storage, never Supabase.
      const read = () => page.evaluate(() => { const e = document.querySelector('#fits .empty'); return { hero: !!document.querySelector('.fit.hero'), wear: !!document.querySelector('.fit.hero [data-wear]'), pieces: document.querySelectorAll('.fit.hero [data-swap]').length, empty: !!e, why: ((e || {}).textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200), occ: ((document.querySelector('#occChips [data-occ][aria-pressed="true"]') || {}).textContent || '').trim() }; });
      const ok = r => r.hero && r.wear && r.pieces;
      const first = await read();
      if (ok(first)) return 'outfit with ' + first.pieces + ' pieces and "Wear this" (' + first.occ + ')';
      if (!first.empty) throw new Error('no outfit and no empty state');
      // The default occasion has nothing to build from in this closet: try the other occasions so outfit building is still tested on real data.
      const ids = await page.$$eval('#occChips [data-occ]', bs => bs.filter(b => b.getAttribute('aria-pressed') !== 'true').map(b => b.dataset.occ));
      for (const id of ids) {
        await page.click('#occChips [data-occ="' + id + '"]');
        await page.waitForFunction(() => { const f = document.querySelector('#fits'); return f && (f.querySelector('.fit.hero') || f.querySelector('.empty')); }, null, { timeout: 15000 });
        const r = await read();
        if (ok(r)) return 'outfit with ' + r.pieces + ' pieces and "Wear this" on ' + r.occ + '; ' + first.occ + ' showed the empty state (' + first.why + ')';
      }
      return { status: 'REVIEW', detail: 'empty state on every occasion: ' + first.why }; });
    await step(tag + 'weather (Open-Meteo)', async () => { const l = await page.getAttribute('[data-wx="edit"]', 'aria-label').catch(() => null);
      if (l && /^Weather: .*\d/.test(l)) return 'forecast shown';
      return { status: 'REVIEW', detail: l ? 'no forecast in the label' : 'no forecast (weather off or no location for this account)' }; });
    await step(tag + 'every tab opens', async () => { for (const t of ['outfits', 'closet', 'care', 'shop']) { await goTab(page, t);
      const b = await brokenImages(page); imgs.shown += b.shown; imgs.broken += b.broken; } return 'outfits, closet, care, shop'; });
    await step(tag + 'photos and cut-outs load', async () => { if (imgs.broken) throw new Error(imgs.broken + ' of ' + imgs.shown + ' images broken'); return imgs.shown + ' images, none broken'; });
    await step(tag + 'sheets open and close', async () => {
      const done = [];
      await goTab(page, 'outfits'); done.push(await openSheet(page, '.fit.hero [data-swap]', 'piece preview'));
      await goTab(page, 'closet'); done.push(await openSheet(page, '#closetGrid .card', 'item editor'));
      done.push(await openSheet(page, '#rulesBtn', 'settings'));
      return done.join(', '); });
    await step(tag + 'no horizontal overflow', async () => { for (const t of ['outfits', 'closet', 'care', 'shop']) { await goTab(page, t);
      const o = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (o > 1) throw new Error(t + ' is ' + o + 'px too wide'); } return 'four tabs'; });
    if (engine === 'chromium' && dev.id === 'phone-390') await claudeCheck(page);
  } finally {
    const p = logProblems(log);
    check(tag + 'no blocked writes, CSP violations, failed requests or console errors', p.length ? 'FAIL' : 'PASS', p.length ? p.length + ': ' + p.slice(0, 3).join(' | ') : '');
    await ctx.close();
  }
}

/* ---------- 4. the claude Edge Function, called from the page (so CORS and the CSP are exercised too) ---------- */
async function claudeCheck(page) {
  await step('Edge Function claude (' + (TASK === 'graphic' ? 'one graphic request' : 'free ping, --no-claude') + ')', async () => {
    fnGate.open = true;
    try {
      const r = await page.evaluate(async ({ url, key, task, img }) => {
        const k = Object.keys(localStorage).find(k => /^sb-.+-auth-token$/.test(k));
        const s = k ? JSON.parse(localStorage.getItem(k)) : null, token = s && (s.access_token || (s.currentSession || {}).access_token);
        if (!token) return { error: 'no session token in the page' };
        const body = { task };
        if (task === 'graphic') {
          const bmp = await createImageBitmap(await (await fetch(img)).blob());
          const c = document.createElement('canvas'); c.width = 224; c.height = 224; c.getContext('2d').drawImage(bmp, 0, 0, 224, 224);
          body.image = c.toDataURL('image/jpeg', 0.85).split(',')[1];
        }
        const res = await fetch(url + '/functions/v1/claude', { method: 'POST', headers: { Authorization: 'Bearer ' + token, apikey: key, 'content-type': 'application/json' }, body: JSON.stringify(body) });
        let j = null; try { j = await res.json(); } catch {}
        return { status: res.status, error: j && j.error, graphic: j && j.result ? j.result.graphic : undefined, usage: j && j.usage };
      }, { url: SB_URL, key: SB_KEY, task: TASK, img: BASE + '/tools/fixtures/img/fx-01.jpg' });
      if (r.error && !r.status) throw new Error(r.error);
      if (TASK === 'ping') { if (r.status === 400 && r.error === 'unknown_task') return 'deployed, sign-in accepted, CORS answered, Anthropic key set'; throw new Error('HTTP ' + r.status + ' ' + (r.error || '')); }
      if (r.status !== 200 || typeof r.graphic !== 'boolean') throw new Error('HTTP ' + r.status + ' ' + (r.error || 'no graphic answer'));
      const u = r.usage || {}, cost = ((u.input_tokens || 0) * 2 + (u.output_tokens || 0) * 10) / 1e6;
      return 'answered (' + (u.input_tokens || '?') + ' input and ' + (u.output_tokens || '?') + ' output tokens, about $' + cost.toFixed(4) + ' at Sonnet 5.5 prices)';
    } finally { fnGate.open = false; }
  });
}

/* ---------- main ---------- */
async function main() {
  console.log('Wearcycle live check: ' + BASE + ' at ' + (process.env.GITHUB_SHA ? process.env.GITHUB_SHA.slice(0, 12) : 'a local checkout') + ', app ' + APP_VERSION);
  let deployed = false;
  await step('Cloudflare serves this commit', async () => { const d = await waitForDeploy(); deployed = true; return d; });
  if (!deployed) return finish();
  await step('Security headers on /', headersCheck);
  const { playwright: PW } = await loadDeps(['playwright']);
  const browsers = {};
  try {
    for (const e of ENGINES) browsers[e] = await PW[e].launch();
    const chrome = browsers.chromium || Object.values(browsers)[0];
    { // signed out: the sign-in screen, the version and the service worker (offline shell)
      const { ctx, log } = await guardedContext(chrome, DEVICES.chromium[0], { serviceWorkers: 'allow' });
      const page = await ctx.newPage();
      await step('Signed out: sign-in screen and version', async () => { await page.goto(BASE + '/'); await page.waitForSelector('#g-email', { timeout: 30000 });
        const txt = await page.textContent('#gate'); if (!txt.includes('Wearcycle v' + APP_VERSION)) throw new Error('version label is not v' + APP_VERSION); return 'v' + APP_VERSION; });
      await step('Service worker installs and controls the page', async () => {
        const state = await page.evaluate(() => Promise.race([
          navigator.serviceWorker.ready.then(r => r.active.state === 'activated' ? 'activated'
            : new Promise(res => r.active.addEventListener('statechange', e => { if (e.target.state === 'activated' || e.target.state === 'redundant') res(e.target.state); }))),
          new Promise(r => setTimeout(() => r('timeout'), 20000))]));
        if (state !== 'activated') throw new Error('state ' + state);
        await page.reload(); await page.waitForSelector('#g-email', { timeout: 30000 });
        if (!(await page.evaluate(() => !!navigator.serviceWorker.controller))) throw new Error('no controller after reload');
        return 'activated, controls the page after reload'; });
      const p = logProblems(log); check('Signed out: no CSP violations, failed requests or console errors', p.length ? 'FAIL' : 'PASS', p.length ? p.slice(0, 3).join(' | ') : '');
      await ctx.close();
    }
    if (!EMAIL || !PASS) { check('Sign in with the test account', 'FAIL', 'repository secrets WEARCYCLE_TEST_EMAIL and WEARCYCLE_TEST_PASSWORD are not set'); return finish(); }
    let state = null;
    await step('Sign in with the test account', async () => { const s = await signIn(chrome); state = s.state; if (s.problems.length) return { status: 'FAIL', detail: s.problems.slice(0, 3).join(' | ') }; return 'signed in' + (s.items === null ? '' : ', ' + s.items + ' items'); });
    if (!state) return finish();
    for (const e of ENGINES) for (const dev of DEVICES[e] || []) await deviceChecks(browsers[e], e, dev, state);
  } finally { for (const b of Object.values(browsers)) await b.close().catch(() => {}); }
  finish();
}

function finish() {
  const n = s => results.filter(r => r.status === s).length;
  const line = n('FAIL') ? 'FAIL' : 'PASS';
  console.log('\n' + line + ': ' + n('PASS') + ' passed, ' + n('FAIL') + ' failed, ' + n('REVIEW') + ' to review.');
  const esc = s => String(s).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
  if (process.env.GITHUB_ACTIONS) {
    results.filter(r => r.status === 'FAIL').slice(0, 10).forEach(r => console.log('::error title=Live check::' + esc(r.name + (r.detail ? ': ' + r.detail : ''))));
    console.log('::notice title=Live check ' + line + '::' + esc(results.map(r => r.status + ' ' + r.name + (r.detail ? ': ' + r.detail : '')).join('\n')));
  }
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, ['## Live check: ' + line, '', BASE + ', app ' + APP_VERSION, '',
    '| Status | Check | Detail |', '| --- | --- | --- |', ...results.map(r => '| ' + r.status + ' | ' + r.name + ' | ' + r.detail.replace(/\|/g, '/') + ' |'), ''].join('\n'));
  process.exitCode = n('FAIL') ? 1 : 0;
}

main().catch(e => { check('Live check ran to the end', 'FAIL', e && e.message || String(e)); finish(); });
