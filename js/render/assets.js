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
/** Rasterises an imported asset into a 2x sprite; `scale` shrinks it around the baseline (small creatures). */
export function assetCanvas(key, w, h, flip = false, scale = 1, baseline = 0.92) {
  const img = images.get(key);
  if (!img) return null;
  const c = mk(Math.round(w * 2), Math.round(h * 2)); c.lw = w; c.lh = h;
  const ctx = c.getContext('2d');
  if (flip) { ctx.translate(c.width, 0); ctx.scale(-1, 1); }
  const dw = c.width * scale, dh = c.height * scale;
  ctx.drawImage(img, (c.width - dw) / 2, c.height * baseline * (1 - scale), dw, dh);
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
  // enclosed pockets of pure key colour (between a bow and its string, under a mount) are seeded too
  const T0 = T1 * 0.6;
  for (let p = 0; p < w * h; p++) if (dist(p * 4) <= T0) stack.push(p);
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
  // coarse occupancy grid (about 500 cells wide), dilated by one cell so a hand still connects to the bow it holds
  const cs = Math.max(1, Math.round(w / 500));
  const gw = Math.ceil(w / cs), gh = Math.ceil(h / cs);
  const occ = new Uint8Array(gw * gh);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 40) occ[((y / cs) | 0) * gw + ((x / cs) | 0)] = 1;
  const dil = new Uint8Array(gw * gh);
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
    if (!occ[gy * gw + gx]) continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = gx + dx, yy = gy + dy; if (xx >= 0 && yy >= 0 && xx < gw && yy < gh) dil[yy * gw + xx] = 1;
    }
  }
  // connected components (8-connected) on the dilated grid
  const label = new Int32Array(gw * gh).fill(-1);
  const comps = [];
  for (let p0 = 0; p0 < gw * gh; p0++) {
    if (!dil[p0] || label[p0] >= 0) continue;
    const id = comps.length; const comp = { id, x0: gw, x1: 0, y0: gh, y1: 0, area: 0 };
    const stack = [p0]; label[p0] = id;
    while (stack.length) {
      const p = stack.pop(); const x = p % gw, y = (p / gw) | 0;
      comp.area += occ[p]; if (x < comp.x0) comp.x0 = x; if (x > comp.x1) comp.x1 = x; if (y < comp.y0) comp.y0 = y; if (y > comp.y1) comp.y1 = y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= gw || yy >= gh) continue;
        const q = yy * gw + xx; if (dil[q] && label[q] < 0) { label[q] = id; stack.push(q); }
      }
    }
    comps.push(comp);
  }
  const bySize = comps.filter((c) => c.area > gw * gh * 0.0004).sort((a, b) => b.area - a.area);
  if (!bySize.length) {
    const step = w / n;
    return Array.from({ length: n }, (_, i) => { const c = mk(Math.round(step), h); c.getContext('2d').drawImage(keyed, -Math.round(i * step), 0); return c; });
  }
  // anchors: the n biggest figures; split the widest one at its thinnest column if two figures touch
  let anchors = bySize.filter((c) => c.area >= bySize[0].area * 0.08).slice(0, n).map((c) => ({ ...c, members: [c.id] }));
  const colOcc = new Uint32Array(gw);
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) colOcc[gx] += occ[gy * gw + gx];
  while (anchors.length < n) {
    anchors.sort((a, b) => (b.x1 - b.x0) - (a.x1 - a.x0));
    const a = anchors[0]; const span = a.x1 - a.x0; if (span < 6) break;
    let best = -1, bv = Infinity;
    for (let x = a.x0 + Math.round(span * 0.3); x <= a.x1 - Math.round(span * 0.3); x++) if (colOcc[x] < bv) { bv = colOcc[x]; best = x; }
    anchors.splice(0, 1, { ...a, x1: best, members: a.members, split: true }, { ...a, x0: best + 1, members: a.members, split: true });
  }
  anchors.sort((a, b) => (a.x0 + a.x1) - (b.x0 + b.x1));
  // every other component joins the horizontally nearest anchor
  const used = new Set(anchors.flatMap((a) => a.members));
  for (const c of comps) {
    if (used.has(c.id)) continue;
    let bi = 0, bd = Infinity;
    anchors.forEach((a, i) => { const gap = Math.max(0, a.x0 - c.x1, c.x0 - a.x1); const vg = Math.max(0, a.y0 - c.y1, c.y0 - a.y1); const dd = gap * 2 + vg; if (dd < bd) { bd = dd; bi = i; } });
    const a = anchors[bi]; a.members.push(c.id);
    a.x0 = Math.min(a.x0, c.x0); a.x1 = Math.max(a.x1, c.x1); a.y0 = Math.min(a.y0, c.y0); a.y1 = Math.max(a.y1, c.y1);
  }
  return anchors.map((a) => {
    const pad = 2;
    const px0 = Math.max(0, a.x0 * cs - pad), px1 = Math.min(w - 1, (a.x1 + 1) * cs - 1 + pad);
    const py0 = Math.max(0, a.y0 * cs - pad), py1 = Math.min(h - 1, (a.y1 + 1) * cs - 1 + pad);
    const cw = px1 - px0 + 1, ch = py1 - py0 + 1;
    const c = mk(cw, ch); const cctx = c.getContext('2d');
    cctx.drawImage(keyed, px0, py0, cw, ch, 0, 0, cw, ch);
    // mask out pixels that belong to a neighbouring figure
    const mine = new Set(a.members);
    const im = cctx.getImageData(0, 0, cw, ch); const md = im.data;
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const gx = ((px0 + x) / cs) | 0, gy = ((py0 + y) / cs) | 0;
      const l = label[gy * gw + gx];
      const outside = l < 0 || !mine.has(l) || (a.split && (gx < a.x0 || gx > a.x1));
      if (outside) md[(y * cw + x) * 4 + 3] = 0;
    }
    cctx.putImageData(im, 0, 0);
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
