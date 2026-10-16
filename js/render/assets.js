// Optional image assets that replace the procedural art.
// Sources (in priority order): images imported by the player in the in-game
// studio (stored in IndexedDB on the device) and files listed in
// assets/manifest.json. Images with a flat background (magenta etc.) are keyed
// out, auto-cropped and fitted to the slot size on import.
import { mk } from './draw.js';

const images = new Map();
const DB = 'tsj_assets', STORE = 'files';

function openDb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return resolve(null);
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}
function dbAll() {
  return openDb().then((db) => new Promise((resolve) => {
    if (!db) return resolve(new Map());
    const out = new Map();
    const tx = db.transaction(STORE, 'readonly').objectStore(STORE).openCursor();
    tx.onsuccess = (e) => { const c = e.target.result; if (c) { out.set(c.key, c.value); c.continue(); } else resolve(out); };
    tx.onerror = () => resolve(out);
  }));
}
function dbPut(key, blob) { return openDb().then((db) => new Promise((r) => { if (!db) return r(false); const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(blob, key); tx.oncomplete = () => r(true); tx.onerror = () => r(false); })); }
function dbDel(key) { return openDb().then((db) => new Promise((r) => { if (!db) return r(false); const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).delete(key); tx.oncomplete = () => r(true); tx.onerror = () => r(false); })); }
function dbClear() { return openDb().then((db) => new Promise((r) => { if (!db) return r(false); const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).clear(); tx.oncomplete = () => r(true); tx.onerror = () => r(false); })); }

function loadImage(src) {
  return new Promise((resolve) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => resolve(null); img.src = src; });
}
const userKeys = new Set();

export async function loadAssets(base = './assets/') {
  // 1) device-local imports
  const local = await dbAll();
  for (const [key, blob] of local) {
    const url = URL.createObjectURL(blob);
    const img = await loadImage(url);
    if (img) { images.set(key, img); userKeys.add(key); }
  }
  // 2) manifest files (do not override user imports)
  try {
    const res = await fetch(base + 'manifest.json', { cache: 'no-cache' });
    if (res.ok) {
      const manifest = await res.json();
      const files = Array.isArray(manifest.files) ? manifest.files : [];
      await Promise.all(files.map(async (f) => {
        const key = f.replace(/\.[a-z0-9]+$/i, '');
        if (images.has(key)) return;
        const img = await loadImage(base + f);
        if (img) images.set(key, img);
      }));
    }
  } catch { /* offline or no manifest */ }
  return images.size > 0;
}
export function hasAsset(key) { return images.has(key); }
export function isUserAsset(key) { return userKeys.has(key); }
export function assetImage(key) { return images.get(key) || null; }
export function assetKeys() { return [...images.keys()]; }
/** Returns a canvas with the image drawn to (w,h) logical size, or null. */
export function assetCanvas(key, w, h, flip = false) {
  const img = images.get(key);
  if (!img) return null;
  const c = mk(Math.round(w * 2), Math.round(h * 2)); c.lw = w; c.lh = h;
  const ctx = c.getContext('2d');
  if (flip) { ctx.translate(c.width, 0); ctx.scale(-1, 1); }
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

// ---------------- Import pipeline ----------------
/** Removes a flat background colour (sampled from the corners) via edge flood fill. */
export function chromaKey(src) {
  const w = src.width, h = src.height;
  const c = mk(w, h); const ctx = c.getContext('2d'); ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, w, h); const d = img.data;
  // already transparent? then keep as is
  let transparent = 0;
  for (let i = 3; i < d.length; i += 4 * 97) if (d[i] < 20) transparent++;
  if (transparent > 3) return c;
  const corners = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]].map(([x, y]) => { const i = (y * w + x) * 4; return [d[i], d[i + 1], d[i + 2]]; });
  const key = corners.reduce((a, b) => [a[0] + b[0] / 4, a[1] + b[1] / 4, a[2] + b[2] / 4], [0, 0, 0]);
  const dist = (i) => Math.hypot(d[i] - key[0], d[i + 1] - key[1], d[i + 2] - key[2]);
  // tolerance: tighter for very saturated keys (magenta/green), looser for white/black
  const sat = Math.max(...key) - Math.min(...key);
  const T1 = sat > 120 ? 70 : 40, T2 = sat > 120 ? 150 : 90;
  const bg = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) { stack.push(x, (h - 1) * w + x); }
  for (let y = 0; y < h; y++) { stack.push(y * w, y * w + w - 1); }
  while (stack.length) {
    const p = stack.pop();
    if (bg[p]) continue;
    if (dist(p * 4) > T2) continue;
    bg[p] = 1;
    const x = p % w, y = (p / w) | 0;
    if (x > 0) stack.push(p - 1); if (x < w - 1) stack.push(p + 1); if (y > 0) stack.push(p - w); if (y < h - 1) stack.push(p + w);
  }
  for (let p = 0; p < w * h; p++) {
    if (!bg[p]) continue;
    const i = p * 4; const dd = dist(i);
    const a = dd <= T1 ? 0 : Math.min(1, (dd - T1) / (T2 - T1));
    d[i + 3] = Math.round(a * 255);
    if (a > 0 && a < 1) { // despill: pull edge pixels away from the key colour
      d[i] = Math.round(d[i] - (key[0] - 128) * (1 - a) * 0.5); d[i + 1] = Math.round(d[i + 1] - (key[1] - 128) * (1 - a) * 0.5); d[i + 2] = Math.round(d[i + 2] - (key[2] - 128) * (1 - a) * 0.5);
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}
/** Crops to the opaque bounding box and fits into (w,h) with the bottom at `baseline` (0..1 of height). */
export function fitToSlot(src, w, h, baseline = 0.92, keying = true) {
  const out = mk(w, h); const ctx = out.getContext('2d');
  if (!keying) { // cover-fit (portraits, terrain)
    const s = Math.max(w / src.width, h / src.height);
    ctx.drawImage(src, (w - src.width * s) / 2, (h - src.height * s) / 2, src.width * s, src.height * s);
    return out;
  }
  const sctx = src.getContext ? src.getContext('2d') : null;
  let x0 = 0, y0 = 0, x1 = src.width, y1 = src.height;
  if (sctx) {
    const d = sctx.getImageData(0, 0, src.width, src.height).data;
    x0 = src.width; y0 = src.height; x1 = 0; y1 = 0;
    for (let y = 0; y < src.height; y++) for (let x = 0; x < src.width; x++) if (d[(y * src.width + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 <= x0 || y1 <= y0) { x0 = 0; y0 = 0; x1 = src.width; y1 = src.height; }
  }
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  const availH = h * baseline - 2, availW = w - 4;
  const s = Math.min(availW / bw, availH / bh);
  const dw = bw * s, dh = bh * s;
  ctx.drawImage(src, x0, y0, bw, bh, (w - dw) / 2, h * baseline - dh, dw, dh);
  return out;
}
export async function importAsset(key, file, slot) {
  const url = URL.createObjectURL(file);
  const img = await loadImage(url);
  URL.revokeObjectURL(url);
  if (!img) return false;
  const keyed = slot.keying ? chromaKey(img) : img;
  const fitted = fitToSlot(keyed, slot.size[0], slot.size[1], slot.baseline, slot.keying);
  const blob = await new Promise((r) => fitted.toBlob(r, 'image/png'));
  await dbPut(key, blob);
  const final = await loadImage(URL.createObjectURL(blob));
  images.set(key, final); userKeys.add(key);
  return true;
}
export async function removeAsset(key) {
  await dbDel(key); images.delete(key); userKeys.delete(key);
}
export async function clearUserAssets() { await dbClear(); for (const k of userKeys) images.delete(k); userKeys.clear(); }

// ---------------- ZIP export (store-only) ----------------
const crcTable = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
export async function exportZip() {
  const local = await dbAll();
  const files = [];
  for (const [key, blob] of local) files.push({ name: key + '.png', data: new Uint8Array(await blob.arrayBuffer()) });
  files.push({ name: 'manifest.json', data: new TextEncoder().encode(JSON.stringify({ files: [...local.keys()].map((k) => k + '.png') }, null, 2)) });
  const parts = [], central = []; let offset = 0;
  const enc = new TextEncoder();
  const u16 = (v) => [v & 255, (v >> 8) & 255], u32 = (v) => [v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255];
  for (const f of files) {
    const name = enc.encode(f.name); const crc = crc32(f.data);
    const local = new Uint8Array([...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(crc), ...u32(f.data.length), ...u32(f.data.length), ...u16(name.length), ...u16(0), ...name]);
    parts.push(local, f.data);
    central.push(new Uint8Array([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(crc), ...u32(f.data.length), ...u32(f.data.length), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset), ...name]));
    offset += local.length + f.data.length;
  }
  const cdSize = central.reduce((s, c) => s + c.length, 0);
  const end = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(cdSize), ...u32(offset), ...u16(0)]);
  return new Blob([...parts, ...central, end], { type: 'application/zip' });
}

// ---------------- Sheet import (several subjects in one image) ----------------
/** Splits an image with `n` subjects in a row into n cropped canvases (after chroma keying). */
export function splitSheet(img, n) {
  const keyed = chromaKey(img);
  const w = keyed.width, h = keyed.height;
  const d = keyed.getContext('2d').getImageData(0, 0, w, h).data;
  const col = new Uint32Array(w);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 40) col[x]++;
  const thr = Math.max(2, h * 0.01);
  // runs of occupied columns
  let runs = [], start = -1;
  for (let x = 0; x <= w; x++) {
    const occ = x < w && col[x] > thr;
    if (occ && start < 0) start = x;
    if (!occ && start >= 0) { runs.push([start, x - 1]); start = -1; }
  }
  // drop specks, merge runs separated by tiny gaps
  const minW = w * 0.02;
  runs = runs.filter((r) => r[1] - r[0] >= minW);
  const merged = [];
  for (const r of runs) { if (merged.length && r[0] - merged[merged.length - 1][1] < w * 0.012) merged[merged.length - 1][1] = r[1]; else merged.push([...r]); }
  runs = merged;
  while (runs.length > n) { // merge the pair with the smallest gap
    let bi = 0, bg = Infinity;
    for (let i = 0; i + 1 < runs.length; i++) { const gap = runs[i + 1][0] - runs[i][1]; if (gap < bg) { bg = gap; bi = i; } }
    runs[bi][1] = runs[bi + 1][1]; runs.splice(bi + 1, 1);
  }
  while (runs.length < n && runs.length > 0) { // split the widest run evenly
    let wi = 0; for (let i = 0; i < runs.length; i++) if (runs[i][1] - runs[i][0] > runs[wi][1] - runs[wi][0]) wi = i;
    const [a, b] = runs[wi]; const mid = Math.round((a + b) / 2);
    runs.splice(wi, 1, [a, mid], [mid + 1, b]);
  }
  if (!runs.length) { const step = w / n; for (let i = 0; i < n; i++) runs.push([Math.round(i * step), Math.round((i + 1) * step) - 1]); }
  return runs.map(([x0, x1]) => {
    let y0 = h, y1 = 0;
    for (let y = 0; y < h; y++) for (let x = x0; x <= x1; x++) if (d[(y * w + x) * 4 + 3] > 40) { if (y < y0) y0 = y; if (y > y1) y1 = y; break; }
    if (y1 < y0) { y0 = 0; y1 = h - 1; }
    const pad = 2;
    const cw = x1 - x0 + 1 + pad * 2, ch = y1 - y0 + 1 + pad * 2;
    const c = mk(cw, ch); c.getContext('2d').drawImage(keyed, x0 - pad, y0 - pad, cw, ch, 0, 0, cw, ch);
    return c;
  });
}
/** Processes a whole sheet: returns [{key, canvas}] fitted to each slot. */
export function processSheet(img, sheet) {
  const parts = splitSheet(img, sheet.slots.length);
  return sheet.slots.map((slot, i) => {
    const part = parts[i];
    let src = part;
    if (!slot.keying) { // portraits / terrain: fill transparent edge pixels with their own content (opaque crop)
      const c = mk(part.width, part.height); const x = c.getContext('2d');
      x.fillStyle = '#1a1a1a'; x.fillRect(0, 0, c.width, c.height); x.drawImage(part, 0, 0);
      src = c;
    }
    return { key: slot.key, canvas: fitToSlot(src, slot.size[0], slot.size[1], slot.baseline, slot.keying) };
  });
}
export async function importSheet(file, sheet) {
  const url = URL.createObjectURL(file);
  const img = await loadImage(url);
  URL.revokeObjectURL(url);
  if (!img) return 0;
  const results = processSheet(img, sheet);
  let n = 0;
  for (const { key, canvas } of results) {
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
    await dbPut(key, blob);
    const final = await loadImage(URL.createObjectURL(blob));
    if (final) { images.set(key, final); userKeys.add(key); n++; }
  }
  return n;
}
