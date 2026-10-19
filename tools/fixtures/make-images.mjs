// Draws the synthetic garment pictures for the sample closet (tools/fixtures/closet.json):
// "photos" of each piece lying on a bed or floor, the 256px thumbnails the app stores, and transparent
// cut-outs. They are sample data, drawn in Chromium's canvas; no real photos are used.
// Run in Claude's container:  node tools/fixtures/make-images.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDeps } from '../deps.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const closetPath = path.join(here, 'closet.json');
const imgDir = path.join(here, 'img');
const closet = JSON.parse(readFileSync(closetPath, 'utf8'));

// Same color values as logic.js COLORS.
const HEX = { black: '#1c1d20', white: '#f6f6f3', grey: '#8b9097', navy: '#1f2e57', beige: '#d8c6a3', khaki: '#b3a477', brown: '#6a4a2e',
  denim: '#4b6589', olive: '#5d6a38', red: '#b9322e', burgundy: '#6e1f2f', pink: '#e29ab0', orange: '#d6742a', yellow: '#e0be42',
  green: '#3e8a4d', teal: '#2e8987', lightblue: '#9bbfe5', blue: '#3566c4', purple: '#6a4a9c' };

const specs = closet.items.filter(i => i.img && i.img.kind !== 'none').map(i => ({
  id: i.id, cat: i.body.cat, pattern: i.body.pattern || '', bg: i.img.bg || 'bed', cut: i.img.kind === 'cut',
  colors: (i.body.colors || []).map(c => HEX[c] || '#8b9097'),
}));

const { playwright } = await loadDeps(['playwright']);
const browser = await playwright.chromium.launch();
const page = await browser.newPage();
const results = await page.evaluate((specs) => {
  // Shapes on a 48-unit grid (the app's own glyph outlines, plus a scarf).
  const SHAPES = {
    top: { d: 'M17 7 8 12l3 8 4-2v22h18V18l4 2 3-8-9-5c-1 3-4 5-7 5s-6-2-7-5Z', lines: 'M24 12v28M15 18v20M33 18v20' },
    bottom: { d: 'M14 6h20l2 36h-9l-3-23-3 23h-9L14 6Z', lines: 'M14 10h20M24 10v8M17 10l1 6M31 10l-1 6' },
    outerwear: { d: 'M17 5 9 9 5 38h6l3-15v21h20V23l3 15h6l-4-29-8-4-7 10-7-10Z', lines: 'M17 5l3 12 4-2M31 5l-3 12-4-2M24 15v29' },
    shoes: { d: 'M5 32c0-7 2-13 4-15h8c0 4 4 7 9 8l12 3c4 1 5 5 5 7H5v-3Z', lines: 'M5 32h38M12 20l3 4M15 19l3 5M18 21l3 3', sole: 'M5 32h38v3H5Z' },
    belt: { d: 'M3 21a2 2 0 0 1 2-2h38a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z', lines: 'M17 16h11v16H17ZM33 24h1M37 24h1M41 24h1' },
    other: { d: 'M13 5h10v24l4 15h-9l-4-13ZM23 5h12v8H23Z', lines: 'M14 38h11M15 41h11' },
  };
  function hash(s) { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let s = seed || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; }; }
  function shade(hex, k) { const n = parseInt(hex.slice(1), 16); const f = c => Math.max(0, Math.min(255, Math.round(c + (k > 0 ? (255 - c) * k : c * k))));
    return 'rgb(' + f(n >> 16 & 255) + ',' + f(n >> 8 & 255) + ',' + f(n & 255) + ')'; }
  function background(g, S, kind, R) {
    if (kind === 'floor') {
      g.fillStyle = '#b48a5f'; g.fillRect(0, 0, S, S);
      const w = S / 5;
      for (let k = 0; k < 6; k++) { g.fillStyle = shade('#b48a5f', (R() - 0.5) * 0.25); g.fillRect(k * w, 0, w - 2, S); g.fillStyle = 'rgba(60,35,15,.35)'; g.fillRect(k * w - 2, 0, 2, S); }
      for (let n = 0; n < 900; n++) { g.fillStyle = 'rgba(70,40,15,' + (R() * 0.12) + ')'; const x = R() * S; g.fillRect(x, R() * S, 1, 10 + R() * 50); }
    } else {
      g.fillStyle = '#d9dde3'; g.fillRect(0, 0, S, S);
      for (let n = 0; n < 7000; n++) { g.fillStyle = (R() > 0.5 ? 'rgba(255,255,255,' : 'rgba(80,90,105,') + (R() * 0.12) + ')'; g.fillRect(R() * S, R() * S, 1 + R() * 2, 1); }
      for (let k = 0; k < 5; k++) { const y = R() * S; const gr = g.createLinearGradient(0, y - 30, 0, y + 30); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, 'rgba(60,70,85,.10)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, y - 30, S, 60); }
    }
    const v = g.createRadialGradient(S / 2, S / 2, S * 0.2, S / 2, S / 2, S * 0.75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.22)');
    g.fillStyle = v; g.fillRect(0, 0, S, S);
  }
  function garment(g, S, sp, R, withShadow) {
    const sh = SHAPES[sp.cat] || SHAPES.other; const base = sp.colors[0] || '#8b9097';
    const path = new Path2D(sh.d); const scale = S * 0.74 / 48;
    g.save(); g.translate(S / 2, S / 2); g.rotate((R() - 0.5) * 0.12); g.scale(scale, scale); g.translate(-24, -24);
    if (withShadow) { g.shadowColor = 'rgba(30,20,10,.38)'; g.shadowBlur = 26; g.shadowOffsetY = 10; }
    g.fillStyle = base; g.fill(path); g.shadowColor = 'transparent';
    g.save(); g.clip(path);
    if (sp.pattern === 'stripe' && sp.colors[1]) { g.fillStyle = sp.colors[1]; for (let y = 4; y < 46; y += 3.2) g.fillRect(0, y, 48, 1.5); }
    if (sp.cat === 'shoes' && sp.colors[1]) { g.fillStyle = sp.colors[1]; g.fill(new Path2D(sh.sole)); }
    const gr = g.createLinearGradient(6, 4, 42, 44); gr.addColorStop(0, 'rgba(255,255,255,.22)'); gr.addColorStop(0.55, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,.28)');
    g.fillStyle = gr; g.fillRect(0, 0, 48, 48);
    for (let n = 0; n < 2600; n++) { g.fillStyle = (R() > 0.5 ? 'rgba(255,255,255,' : 'rgba(0,0,0,') + (R() * 0.10) + ')'; g.fillRect(R() * 48, R() * 48, 0.18 + R() * 0.3, 0.12); }
    g.strokeStyle = 'rgba(0,0,0,.10)'; g.lineWidth = 1.1; g.lineCap = 'round';
    for (let k = 0; k < 4; k++) { g.beginPath(); const x = 12 + R() * 24, y = 10 + R() * 26; g.moveTo(x, y); g.quadraticCurveTo(x + (R() - 0.5) * 10, y + 4, x + (R() - 0.5) * 6, y + 8 + R() * 6); g.stroke(); }
    g.restore();
    g.strokeStyle = shade(base, -0.35); g.lineWidth = 0.55; g.stroke(path);
    if (sh.lines) { g.strokeStyle = shade(base, -0.3); g.lineWidth = 0.45; g.stroke(new Path2D(sh.lines)); }
    g.restore();
  }
  const out = [];
  for (const sp of specs) {
    const S = 560, R = rng(hash(sp.id));
    const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
    background(g, S, sp.bg, R); garment(g, S, sp, rng(hash(sp.id + 'g')), true);
    const t = document.createElement('canvas'); t.width = t.height = 256; t.getContext('2d').drawImage(c, 0, 0, 256, 256);
    const item = { id: sp.id, photo: c.toDataURL('image/jpeg', 0.8), thumb: t.toDataURL('image/jpeg', 0.72) };
    if (sp.cut) { const k = document.createElement('canvas'); k.width = k.height = S; garment(k.getContext('2d'), S, sp, rng(hash(sp.id + 'g')), false); item.cut = k.toDataURL('image/webp', 0.86); }
    out.push(item);
  }
  return out;
}, specs);
await browser.close();

mkdirSync(imgDir, { recursive: true });
const b64 = u => Buffer.from(u.split(',')[1], 'base64');
let bytes = 0;
for (const r of results) {
  const item = closet.items.find(i => i.id === r.id);
  writeFileSync(path.join(imgDir, r.id + '.jpg'), b64(r.photo)); bytes += b64(r.photo).length;
  if (r.cut) { writeFileSync(path.join(imgDir, r.id + '-cut.webp'), b64(r.cut)); bytes += b64(r.cut).length; }
  item.body.thumb = r.thumb;
}
writeFileSync(closetPath, JSON.stringify(closet, null, 1) + '\n');
console.log('Wrote ' + results.length + ' photos and ' + results.filter(r => r.cut).length + ' cut-outs (' + Math.round(bytes / 1024) + ' KB) to ' + imgDir);
