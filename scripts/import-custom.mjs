// Splits a sheet image into named asset slots (for images that do not match a catalogue sheet).
// Usage: node scripts/import-custom.mjs <image.png> <key1,key2,-,key4> [--preview out.png]   ('-' skips a column)
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { createServer } from 'http';
import { extname, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [imagePath, keyList, ...rest] = process.argv.slice(2);
if (!imagePath || !keyList) { console.error('Usage: node scripts/import-custom.mjs <image> <key1,key2,-,...> [--preview out.png]'); process.exit(1); }
const previewIdx = rest.indexOf('--preview'); const previewPath = previewIdx >= 0 ? rest[previewIdx + 1] : null;
const keys = keyList.split(',');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = createServer((req, res) => {
  const p = join(root, decodeURIComponent(req.url.split('?')[0]) === '/' ? '/index.html' : decodeURIComponent(req.url.split('?')[0]));
  if (!existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' }); res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const b64 = readFileSync(imagePath).toString('base64');
const dataUrl = `data:image/png;base64,${b64}`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 600 } });
page.on('pageerror', (e) => console.error('PAGEERROR', e.message));
await page.goto(`http://localhost:${port}/index.html`);
await page.waitForTimeout(300);
const result = await page.evaluate(async ([keys, dataUrl]) => {
  const { buildCatalog } = await import('./js/data/assetCatalog.js');
  const { processSheet } = await import('./js/render/assets.js');
  const cat = buildCatalog();
  const slots = keys.map((k) => (k === '-' ? { key: '-', size: [64, 64], baseline: 0.9, keying: true, label: '(spring over)' } : cat.find((s) => s.key === k)));
  const missing = keys.filter((k, i) => !slots[i]);
  if (missing.length) return { error: 'Unknown keys: ' + missing.join(', ') };
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dataUrl; });
  const out = processSheet(img, { slots }).filter((o) => o.key !== '-');
  const pw = out.reduce((s, o) => s + o.canvas.width + 10, 10), ph = Math.max(...out.map((o) => o.canvas.height)) + 20;
  const pc = document.createElement('canvas'); pc.width = pw; pc.height = ph; const x = pc.getContext('2d');
  x.fillStyle = '#334'; x.fillRect(0, 0, pw, ph); let px = 10;
  for (const o of out) { x.drawImage(o.canvas, px, 10); x.strokeStyle = '#ff0'; x.strokeRect(px, 10, o.canvas.width, o.canvas.height); px += o.canvas.width + 10; }
  return { files: out.map((o) => ({ key: o.key, data: o.canvas.toDataURL('image/png') })), preview: pc.toDataURL('image/png') };
}, [keys, dataUrl]);
await browser.close(); server.close();
if (result.error) { console.error(result.error); process.exit(1); }
const manifestPath = join(root, 'assets', 'manifest.json');
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : { files: [] };
for (const f of result.files) {
  const rel = f.key + '.png'; const abs = join(root, 'assets', rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, Buffer.from(f.data.split(',')[1], 'base64'));
  if (!manifest.files.includes(rel)) manifest.files.push(rel);
  console.log('wrote assets/' + rel);
}
manifest.files.sort();
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
if (previewPath) writeFileSync(previewPath, Buffer.from(result.preview.split(',')[1], 'base64'));
console.log('done');
