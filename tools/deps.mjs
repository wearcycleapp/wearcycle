// Test-only packages for tools/check.mjs and tools/fixtures/make-images.mjs.
// They are installed outside the repository (never in the app, never listed in sw.js):
// WEARCYCLE_CHECK_DEPS, or ~/.cache/wearcycle-check-deps by default.
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import os from 'node:os';
import path from 'node:path';

// Exact versions, each released at least two weeks before they were pinned (2026-10-19).
// playwright 1.56.0 matched the Chromium build preinstalled in Claude's container (/opt/pw-browsers) until 2026-10-25,
// when the container image shipped chromium-1243 (Playwright 1.63.0) and the 1194 download was refused.
// WEARCYCLE_PLAYWRIGHT overrides the version for a run (e.g. 1.63.0); the GitHub live check keeps the pinned one.
export const PINNED = {
  'playwright': process.env.WEARCYCLE_PLAYWRIGHT || '1.56.0',
  '@axe-core/playwright': '4.13.0',
  'pngjs': '7.0.0',
  'pixelmatch': '7.2.0',
};

export function depsDir() {
  return process.env.WEARCYCLE_CHECK_DEPS || path.join(os.homedir(), '.cache', 'wearcycle-check-deps');
}

function installedVersion(dir, name) {
  try { return JSON.parse(readFileSync(path.join(dir, 'node_modules', name, 'package.json'), 'utf8')).version; }
  catch { return null; }
}

/** Installs any missing or mismatched package into depsDir(), then loads them. */
export async function loadDeps(names = Object.keys(PINNED)) {
  const dir = depsDir();
  const want = names.filter(n => installedVersion(dir, n) !== PINNED[n]);
  if (want.length) {
    mkdirSync(dir, { recursive: true });
    const pkg = path.join(dir, 'package.json');
    if (!existsSync(pkg)) writeFileSync(pkg, '{ "private": true, "description": "Wearcycle check tooling (test only)" }\n');
    console.log('Installing test tools into ' + dir + ': ' + want.map(n => n + '@' + PINNED[n]).join(', '));
    execFileSync('npm', ['install', '--no-audit', '--no-fund', '--save-exact', '--prefix', dir, ...want.map(n => n + '@' + PINNED[n])], {
      stdio: 'inherit',
      env: { ...process.env, PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1', DISABLE_TELEMETRY: '1', DO_NOT_TRACK: '1' },
    });
  }
  const req = createRequire(path.join(dir, 'package.json'));
  const out = {};
  for (const n of names) {
    try { out[n] = req(n); }
    catch (e) {
      if (e.code !== 'ERR_REQUIRE_ESM') throw e;
      out[n] = await import(pathToFileURL(req.resolve(n)).href);
    }
  }
  return out;
}
