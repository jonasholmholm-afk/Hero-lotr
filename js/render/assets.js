// Optional image assets. If an `assets/manifest.json` lists image files, they
// replace the procedural art automatically (see README for the naming scheme).
// Everything falls back to procedural drawing when a file is missing.
import { mk } from './draw.js';

const images = new Map();
let manifest = null;

export async function loadAssets(base = './assets/') {
  try {
    const res = await fetch(base + 'manifest.json', { cache: 'no-cache' });
    if (!res.ok) return false;
    manifest = await res.json();
  } catch { return false; }
  const files = Array.isArray(manifest.files) ? manifest.files : [];
  await Promise.all(files.map((f) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { images.set(f.replace(/\.[a-z0-9]+$/i, ''), img); resolve(); };
    img.onerror = () => resolve();
    img.src = base + f;
  })));
  return images.size > 0;
}
export function hasAsset(key) { return images.has(key); }
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
export function assetImage(key) { return images.get(key) || null; }
