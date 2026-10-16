// Procedural sprite factory for the adventure map: terrain textures, trees,
// mountains, map objects, heroes and towns. Everything is cached and drawn at
// SPR× resolution (see draw.js) so it stays crisp on phones.
import { mk, mkS, poly, circle, ellipse, rrect, line, lgrad, rgrad, shade, lighten, rgba, mix, art_rng, outline, shadeSprite, softShadow, glow, blobPts, smoothPoly, SPR } from './draw.js';
import { T, D, TERRAIN_INFO } from '../data/terrain.js';
import { RES_INFO } from '../data/resources.js';
import { Noise } from '../core/noise.js';
import { assetCanvas, assetImage } from './assets.js';

export const TILE = 64;
const cache = new Map();
export function clearSpriteCache() { cache.clear(); }
function cached(key, fn) {
  if (!cache.has(key)) cache.set(key, fn());
  return cache.get(key);
}
const finish = (c, opts = {}) => { if (opts.outline !== false) outline(c, opts.color || 'rgba(12,10,8,0.7)', opts.px || 1); if (opts.shade !== false) shadeSprite(c, opts.top, opts.bottom); return c; };

// ---------------- Terrain textures ----------------
// Seamless (tileable) noise textures per terrain. Hand-drawn details are added
// per tile by drawTileDetails() so they never repeat.
const texNoise = new Noise(991), texNoise2 = new Noise(1377);
const PALETTE = {
  [T.WATER]: { a: '#1d4268', b: '#2c6088', c: '#4a86ad' },
  [T.GRASS]: { a: '#3e7a30', b: '#64a246', c: '#9ccb62' },
  [T.DIRT]: { a: '#775634', b: '#997a4e', c: '#bd9d6e' },
  [T.ROUGH]: { a: '#786a52', b: '#978a6c', c: '#b9ad92' },
  [T.SWAMP]: { a: '#3a5030', b: '#587040', c: '#80925a' },
  [T.SNOW]: { a: '#c4d4e2', b: '#e4ecf4', c: '#fbfdff' },
  [T.ASH]: { a: '#3a3534', b: '#534d4a', c: '#726b66' },
};
function tileable(nz, u, v, P, f, oct, off = 0) {
  const s = (x, y) => nz.fbm((x + off) / f, (y + off) / f, oct);
  const a = s(u, v), b = s(u - P, v), c = s(u, v - P), d = s(u - P, v - P);
  return (a * (P - u) * (P - v) + b * u * (P - v) + c * (P - u) * v + d * u * v) / (P * P);
}
const TERRAIN_KEYS = ['water', 'grass', 'dirt', 'rough', 'swamp', 'snow', 'ash'];
/** Makes a texture tileable: cross-fades it with a half-offset copy horizontally, then vertically. */
function makeSeamless(img, P) {
  const a = mk(P, P); const actx = a.getContext('2d'); actx.drawImage(img, 0, 0, P, P);
  const src = actx.getImageData(0, 0, P, P).data;
  const c = P / 2;
  const g = (i) => { const r = Math.abs(i - c) / c; const t = Math.min(1, Math.max(0, (r - 0.45) / 0.55)); return 1 - t * t * (3 - 2 * t); };
  const pass = (inp, horizontal) => {
    const out = new Uint8ClampedArray(inp.length);
    for (let y = 0; y < P; y++) for (let x = 0; x < P; x++) {
      const w = g(horizontal ? x : y);
      const sx = horizontal ? (x + c) % P : x, sy = horizontal ? y : (y + c) % P;
      const o = (y * P + x) * 4, q = (sy * P + sx) * 4;
      for (let k = 0; k < 3; k++) out[o + k] = inp[o + k] * w + inp[q + k] * (1 - w);
      out[o + 3] = 255;
    }
    return out;
  };
  const res = pass(pass(src, true), false);
  const id = actx.createImageData(P, P); id.data.set(res); actx.putImageData(id, 0, 0);
  return a;
}
/** Imported ground textures: a 4x4-tile sheet where the (seamless) texture spans 2x2 tiles.
 *  Returns null when the terrain is procedural. */
export function terrainSheet(t, px = 96) {
  const aimg = assetImage(`terrain/${TERRAIN_KEYS[t]}`);
  if (!aimg) return null;
  return cached(`tsheet:${t}:${px}`, () => {
    const P = px * 2;
    const tex = makeSeamless(aimg, P);
    const sh = mk(P * 2, P * 2); const ctx = sh.getContext('2d');
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) ctx.drawImage(tex, i * P, j * P);
    return sh;
  });
}
export function tileTexture(t, px = 96) {
  return cached(`tile:${t}:${px}`, () => {
    const aimg = assetImage(`terrain/${TERRAIN_KEYS[t]}`);
    if (aimg) { const c = mk(px, px); c.getContext('2d').drawImage(aimg, 0, 0, px, px); return c; }
    const c = mk(px, px);
    const ctx = c.getContext('2d');
    const pal = PALETTE[t];
    const img = ctx.createImageData(px, px);
    const d = img.data;
    const A = hexRgb(pal.a), B = hexRgb(pal.b), C = hexRgb(pal.c);
    const P = 64, off = t * 53;
    for (let y = 0; y < px; y++) for (let x = 0; x < px; x++) {
      const u = (x / px) * P, v = (y / px) * P;
      const n1 = tileable(texNoise, u, v, P, 18, 3, off);
      const n2 = tileable(texNoise2, u, v, P, 5, 2, off);
      let tt = n1 * 0.72 + n2 * 0.28;
      if (t === T.WATER) tt = n1 * 0.9 + n2 * 0.1;
      let col;
      if (tt < 0.5) col = lerp3(A, B, tt / 0.5); else col = lerp3(B, C, Math.min(1, (tt - 0.5) / 0.55));
      const sp = (n2 - 0.5) * (t === T.SNOW ? 8 : t === T.WATER ? 6 : 18);
      const i = (y * px + x) * 4;
      d[i] = clamp8(col[0] + sp); d[i + 1] = clamp8(col[1] + sp); d[i + 2] = clamp8(col[2] + sp); d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return c;
  });
}
/** Per-tile hand-drawn details (grass blades, pebbles, cracks…). (px,py) = tile origin, S = tile size. */
export function drawTileDetails(ctx, t, px, py, S, seed) {
  const r = art_rng(seed | 1);
  const pal = PALETTE[t];
  const s = S / 64;
  ctx.lineCap = 'round';
  switch (t) {
    case T.GRASS:
      for (let i = 0; i < 22; i++) {
        const x = px + r() * S, y = py + r() * S, h = (3 + r() * 5) * s;
        line(ctx, x, y, x + (r() - 0.5) * 3 * s, y - h, r() > 0.5 ? rgba(pal.c, 0.5) : rgba(pal.a, 0.6), 1.1 * s);
      }
      if (r() < 0.2) circle(ctx, px + r() * S, py + r() * S, 1.3 * s, r() > 0.5 ? '#f3d55b' : '#eef0f5');
      break;
    case T.DIRT:
      for (let i = 0; i < 7; i++) { const x = px + r() * S, y = py + r() * S, rr = (1 + r() * 2) * s; circle(ctx, x, y, rr, rgba(pal.a, 0.8)); circle(ctx, x - rr * 0.3, y - rr * 0.3, rr * 0.5, rgba(pal.c, 0.6)); }
      for (let i = 0; i < 2; i++) { const x = px + r() * S, y = py + r() * S; line(ctx, x, y, x + (r() - 0.5) * 16 * s, y + (r() - 0.5) * 16 * s, rgba(pal.a, 0.45), 0.8 * s); }
      break;
    case T.ROUGH:
      for (let i = 0; i < 4; i++) { const x = px + r() * S, y = py + r() * S; line(ctx, x, y, x + (r() - 0.5) * 18 * s, y + (r() - 0.5) * 18 * s, 'rgba(40,32,20,0.3)', 1 * s); }
      for (let i = 0; i < 5; i++) { const x = px + r() * S, y = py + r() * S, rr = (1.5 + r() * 2.5) * s; poly(ctx, [[x - rr, y + rr * 0.5], [x - rr * 0.4, y - rr], [x + rr * 0.8, y - rr * 0.6], [x + rr, y + rr * 0.5]], rgba(pal.c, 0.6), 'rgba(40,32,20,0.3)', 0.6 * s); }
      break;
    case T.SWAMP:
      for (let i = 0; i < 2; i++) {
        const x = px + r() * S, y = py + r() * S, rx = (6 + r() * 9) * s, ry = rx * (0.4 + r() * 0.3);
        ellipse(ctx, x, y, rx, ry, 'rgba(30,55,70,0.6)'); ellipse(ctx, x - rx * 0.2, y - ry * 0.3, rx * 0.5, ry * 0.3, 'rgba(150,200,210,0.25)');
      }
      for (let i = 0; i < 8; i++) { const x = px + r() * S, y = py + r() * S; line(ctx, x, y, x + (r() - 0.5) * 2 * s, y - (5 + r() * 6) * s, rgba(pal.c, 0.65), 1 * s); }
      break;
    case T.SNOW:
      for (let i = 0; i < 3; i++) ellipse(ctx, px + r() * S, py + r() * S, (6 + r() * 10) * s, (3 + r() * 4) * s, 'rgba(150,180,215,0.18)');
      for (let i = 0; i < 8; i++) circle(ctx, px + r() * S, py + r() * S, 0.9 * s, 'rgba(255,255,255,0.9)');
      break;
    case T.ASH:
      for (let i = 0; i < 3; i++) {
        const x = px + r() * S, y = py + r() * S, dx = (r() - 0.5) * 20 * s, dy = (r() - 0.5) * 20 * s;
        line(ctx, x, y, x + dx, y + dy, '#1c1816', 1.6 * s);
        if (r() < 0.5) line(ctx, x, y, x + dx, y + dy, 'rgba(255,110,40,0.5)', 0.7 * s);
      }
      for (let i = 0; i < 3; i++) { const x = px + r() * S, y = py + r() * S; glow(ctx, x, y, 2.5 * s, '#ff8a40', 0.45); circle(ctx, x, y, 0.8 * s, '#ffd080'); }
      break;
    case T.WATER:
      for (let i = 0; i < 3; i++) {
        const x = px + r() * S, y = py + r() * S, w = (8 + r() * 10) * s;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + w * 0.3, y - 2 * s, x + w * 0.6, y); ctx.quadraticCurveTo(x + w * 0.8, y + 1.5 * s, x + w, y);
        ctx.strokeStyle = 'rgba(200,235,255,0.22)'; ctx.lineWidth = 1 * s; ctx.stroke();
      }
      break;
  }
}
function hexRgb(h) { h = h.replace('#', ''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function lerp3(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
function clamp8(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }

// ---------------- Decor sprites ----------------
const DECOR_KEYS = { 1: 'pine', 2: 'leafy', 3: 'golden', 4: 'dead', 5: 'mountain', 6: 'rock', 7: 'flowers', 8: 'mushroom', 10: 'stump', 11: 'reeds', 12: 'snowpine', 13: 'bush', 14: 'pebbles' };
const DECOR_SIZES = { pine: [60, 92], leafy: [68, 90], golden: [68, 90], dead: [60, 86], mountain: [110, 110], rock: [52, 44], flowers: [44, 26], mushroom: [44, 30], stump: [34, 30], reeds: [44, 40], snowpine: [60, 92], bush: [46, 36], pebbles: [40, 22] };
export function decorSprite(kind, variant = 0) {
  return cached(`decor:${kind}:${variant}`, () => {
    const dk = DECOR_KEYS[kind];
    if (dk) { const a = assetCanvas(`decor/${dk}_${variant}`, ...DECOR_SIZES[dk]) || assetCanvas(`decor/${dk}`, ...DECOR_SIZES[dk]); if (a) return a; }
    const r = art_rng(kind * 101 + variant * 13 + 5);
    switch (kind) {
      case D.PINE: return pine(r, '#163f22', '#2d7a3c', '#6fbf63', '#4b3320');
      case D.SNOWPINE: return pine(r, '#1f3d33', '#3a6d55', '#7fb08f', '#4b3320', true);
      case D.LEAFY: return leafy(r, '#1f5a22', '#3f9a3a', '#8fd36a', '#5a3a1e');
      case D.GOLDEN: return leafy(r, '#8a4e12', '#d9922a', '#ffd36a', '#6a4a2a', true);
      case D.DEAD: return deadTree(r);
      case D.MOUNTAIN: return mountain(r);
      case D.ROCK: return rock(r);
      case D.FLOWERS: return flowers(r);
      case D.MUSHROOM: return mushrooms(r);
      case D.STUMP: return stump(r);
      case D.REEDS: return reeds(r);
      case D.BUSH: return bush(r);
      case D.PEBBLES: return pebbles(r);
      default: return mkS(1, 1);
    }
  });
}
// Sprites are anchored at bottom-centre of a tile: logical width lw, ground line at lh - 8.
function pine(r, dark, mid, light, trunk, snow = false) {
  const W = 60, H = 92;
  const c = mkS(W, H); const ctx = c.getContext('2d');
  const cx = W / 2, gy = H - 8;
  softShadow(ctx, cx + 4, gy, 20, 7, 0.35);
  line(ctx, cx, gy, cx, gy - 22, trunk, 6);
  line(ctx, cx - 1.5, gy, cx - 1.5, gy - 20, lighten(trunk, 0.25), 1.5);
  const layers = 4;
  const h = 60 + r() * 14;
  for (let i = 0; i < layers; i++) {
    const y = gy - 14 - i * (h / layers) * 0.76;
    const w = 25 - i * 5 + r() * 3;
    const hh = h / layers + 10;
    // jagged layer
    const pts = [[cx - w, y]];
    for (let k = 1; k < 5; k++) pts.push([cx - w + (w / 5) * k, y - (k % 2 ? 4 : 0) - r() * 3]);
    pts.push([cx, y - hh]);
    for (let k = 4; k >= 1; k--) pts.push([cx + w - (w / 5) * k, y - (k % 2 ? 4 : 0) - r() * 3]);
    pts.push([cx + w, y]);
    poly(ctx, pts, lgrad(ctx, cx - w, 0, cx + w, 0, [[0, dark], [0.45, mid], [0.6, light], [1, dark]]));
    // dark underside
    poly(ctx, [[cx - w, y], [cx, y + 3], [cx + w, y], [cx, y - 4]], rgba(dark, 0.5));
    if (snow) {
      poly(ctx, [[cx - w * 0.55, y - hh * 0.3], [cx, y - hh], [cx + w * 0.55, y - hh * 0.3], [cx + w * 0.2, y - hh * 0.28], [cx, y - hh * 0.4], [cx - w * 0.2, y - hh * 0.26]], 'rgba(238,246,255,0.95)');
    }
  }
  return finish(c, { top: 'rgba(255,255,220,0.12)' });
}
function leafy(r, dark, mid, light, trunk, golden = false) {
  const W = 68, H = 90;
  const c = mkS(W, H); const ctx = c.getContext('2d');
  const cx = W / 2, gy = H - 8;
  softShadow(ctx, cx + 5, gy, 22, 7, 0.35);
  // trunk with slight curve
  ctx.beginPath(); ctx.moveTo(cx - 4, gy); ctx.quadraticCurveTo(cx - 3, gy - 20, cx - 1, gy - 34); ctx.lineTo(cx + 3, gy - 34); ctx.quadraticCurveTo(cx + 4, gy - 20, cx + 5, gy); ctx.closePath();
  ctx.fillStyle = lgrad(ctx, cx - 4, 0, cx + 5, 0, [[0, lighten(trunk, 0.2)], [1, shade(trunk, 0.6)]]); ctx.fill();
  line(ctx, cx, gy - 24, cx - 10, gy - 38, trunk, 3.5); line(ctx, cx + 1, gy - 26, cx + 12, gy - 40, trunk, 3.5);
  // foliage: dark back blobs then lit blobs
  const blobs = [];
  const nb = 7 + Math.floor(r() * 3);
  for (let i = 0; i < nb; i++) {
    const a = (i / nb) * Math.PI * 2 + r() * 0.6;
    blobs.push([cx + Math.cos(a) * (11 + r() * 7), gy - 48 + Math.sin(a) * (9 + r() * 5), 10 + r() * 6]);
  }
  blobs.push([cx, gy - 50, 15]);
  for (const [x, y, rad] of blobs) circle(ctx, x + 1, y + 3, rad + 1, rgba(dark, 0.9));
  for (const [x, y, rad] of blobs) circle(ctx, x, y, rad, rgrad(ctx, x - rad * 0.35, y - rad * 0.45, 1, rad * 1.1, [[0, light], [0.55, mid], [1, dark]]));
  // leaf highlights
  for (let i = 0; i < 10; i++) { const x = cx + (r() - 0.5) * 34, y = gy - 44 - r() * 26; ellipse(ctx, x, y, 2.4, 1.3, rgba(light, 0.9), r() * 3); }
  if (golden) for (let i = 0; i < 8; i++) circle(ctx, cx + (r() - 0.5) * 38, gy - 32 - r() * 36, 1.1, '#fff6c8');
  return finish(c, { top: 'rgba(255,250,220,0.14)' });
}
function deadTree(r) {
  const W = 60, H = 86;
  const c = mkS(W, H); const ctx = c.getContext('2d');
  const cx = W / 2, gy = H - 8;
  softShadow(ctx, cx + 3, gy, 14, 5, 0.3);
  const col = '#3b2f27', hi = '#5a4a3e';
  const br = (x, y, a, l, w, depth) => {
    const ex = x + Math.cos(a) * l, ey = y + Math.sin(a) * l;
    line(ctx, x, y, ex, ey, col, w);
    if (depth > 0) { br(ex, ey, a - 0.5 - r() * 0.3, l * 0.62, w * 0.65, depth - 1); br(ex, ey, a + 0.4 + r() * 0.3, l * 0.6, w * 0.65, depth - 1); }
  };
  line(ctx, cx, gy, cx + 2, gy - 32, col, 7);
  line(ctx, cx - 1.5, gy, cx, gy - 30, hi, 1.5);
  br(cx + 1, gy - 24, -Math.PI * 0.72, 16, 3.5, 2);
  br(cx + 2, gy - 30, -Math.PI * 0.3, 15, 3, 2);
  br(cx + 2, gy - 32, -Math.PI * 0.52, 14, 2.5, 1);
  // a crow? small hollow
  ellipse(ctx, cx + 1, gy - 14, 2, 3, '#120e0c');
  return finish(c);
}
function mountain(r) {
  const W = 110, H = 110;
  const c = mkS(W, H); const ctx = c.getContext('2d');
  const gy = H - 8;
  softShadow(ctx, W / 2 + 6, gy, 50, 9, 0.35);
  const peaks = 2 + Math.floor(r() * 2);
  const list = [];
  for (let i = 0; i < peaks; i++) list.push({ px: 22 + r() * 66, ph: 46 + r() * 48, pw: 28 + r() * 20 });
  list.sort((a, b) => a.ph - b.ph);
  for (const { px, ph, pw } of list) {
    const lit = '#a8a39b', base = '#777169', dark = '#4e4944';
    // left lit face with ridge noise
    const ridgeL = [[px - pw, gy]];
    for (let k = 1; k < 5; k++) ridgeL.push([px - pw + (pw / 5) * k, gy - (ph / 5) * k - (r() - 0.5) * 6]);
    ridgeL.push([px, gy - ph]);
    const ridgeR = [[px, gy - ph]];
    for (let k = 1; k < 5; k++) ridgeR.push([px + (pw / 5) * k, gy - ph + (ph / 5) * k + (r() - 0.5) * 6]);
    ridgeR.push([px + pw, gy]);
    poly(ctx, [...ridgeL, [px + 4, gy]], lgrad(ctx, px - pw, gy - ph, px, gy, [[0, lit], [1, base]]));
    poly(ctx, [...ridgeR, [px + 4, gy]], lgrad(ctx, px, gy - ph, px + pw, gy, [[0, base], [1, dark]]));
    // crevices
    for (let k = 0; k < 3; k++) { const y0 = gy - ph * (0.25 + r() * 0.5); line(ctx, px + (r() - 0.5) * 6, y0, px + (r() - 0.5) * pw * 0.8, y0 + 10 + r() * 14, 'rgba(30,26,24,0.45)', 1.2); }
    if (ph > 60) {
      const sh = gy - ph;
      poly(ctx, [[px - pw * 0.34, sh + ph * 0.36], [px - pw * 0.2, sh + ph * 0.28], [px - pw * 0.08, sh + ph * 0.34], [px, sh], [px + pw * 0.1, sh + ph * 0.3], [px + pw * 0.22, sh + ph * 0.26], [px + pw * 0.32, sh + ph * 0.37], [px + pw * 0.12, sh + ph * 0.3], [px, sh + ph * 0.4], [px - pw * 0.12, sh + ph * 0.3]], lgrad(ctx, px - pw * 0.3, 0, px + pw * 0.3, 0, [[0, '#ffffff'], [1, '#c9d6e2']]));
    }
  }
  // base mist
  ctx.fillStyle = lgrad(ctx, 0, gy - 14, 0, gy, [[0, 'rgba(255,255,255,0)'], [1, 'rgba(230,236,240,0.35)']]);
  ctx.fillRect(0, gy - 14, W, 14);
  return finish(c, { top: 'rgba(255,255,255,0.1)', bottom: 'rgba(0,0,20,0.2)' });
}
function rock(r) {
  const W = 52, H = 44; const c = mkS(W, H); const ctx = c.getContext('2d');
  const gy = H - 8;
  softShadow(ctx, 27, gy, 18, 5, 0.3);
  const n = 1 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const x = 14 + r() * 24, w = 8 + r() * 11, h = 7 + r() * 9;
    const pts = [[x - w, gy], [x - w * 0.8, gy - h * 0.6], [x - w * 0.3, gy - h], [x + w * 0.3, gy - h * 0.9], [x + w * 0.8, gy - h * 0.5], [x + w, gy]];
    poly(ctx, pts, lgrad(ctx, x - w, gy - h, x + w, gy, [[0, '#a39d94'], [0.5, '#7a746c'], [1, '#4c4742']]));
    line(ctx, x - w * 0.5, gy - h * 0.5, x + w * 0.2, gy - h * 0.1, 'rgba(30,26,24,0.35)', 1);
    circle(ctx, x - w * 0.3, gy - h * 0.7, 1.5, 'rgba(255,255,255,0.35)');
  }
  for (let i = 0; i < 3; i++) line(ctx, 10 + r() * 32, gy, 12 + r() * 32, gy - 5, '#4a7a2a', 1.2);
  return finish(c);
}
function flowers(r) {
  const W = 44, H = 26; const c = mkS(W, H); const ctx = c.getContext('2d');
  const cols = ['#f2c94c', '#e86a8a', '#f5f5f5', '#9ab8ff', '#f28a3c'];
  for (let i = 0; i < 8; i++) {
    const x = 4 + r() * 36, y = 8 + r() * 12; line(ctx, x, y + 5, x + (r() - 0.5) * 2, y, '#3a6a2a', 1.2);
    const col = cols[Math.floor(r() * cols.length)];
    for (let k = 0; k < 5; k++) { const a = k * Math.PI * 2 / 5; circle(ctx, x + Math.cos(a) * 1.8, y + Math.sin(a) * 1.8, 1.3, col); }
    circle(ctx, x, y, 1, '#fff3a0');
  }
  return c;
}
function mushrooms(r) {
  const W = 44, H = 30; const c = mkS(W, H); const ctx = c.getContext('2d');
  for (let i = 0; i < 3; i++) {
    const x = 8 + r() * 28, y = 14 + r() * 8, s = 3 + r() * 3;
    softShadow(ctx, x + 1, y + 5, s * 1.6, s * 0.6, 0.3);
    line(ctx, x, y + 5, x, y - s, '#e8dcc0', 2.6);
    ellipse(ctx, x, y - s, s * 1.5, s * 0.9, rgrad(ctx, x - s * 0.4, y - s - s * 0.4, 1, s * 1.6, [[0, '#ff6a5a'], [1, '#a02a20']]));
    circle(ctx, x - s * 0.5, y - s - 1, 0.9, '#fff'); circle(ctx, x + s * 0.4, y - s + 0.5, 0.7, '#fff');
  }
  return finish(c, { shade: false });
}
function stump(r) {
  const W = 34, H = 30; const c = mkS(W, H); const ctx = c.getContext('2d');
  softShadow(ctx, 18, 23, 12, 4, 0.3);
  rrect(ctx, 9, 10, 15, 13, 2, lgrad(ctx, 9, 0, 24, 0, [[0, '#6a4a2e'], [1, '#3e2a18']]));
  ellipse(ctx, 16.5, 10, 7.5, 3.8, '#c9a46e'); ellipse(ctx, 16.5, 10, 5, 2.4, null, 0, '#8a6a3a', 0.8); ellipse(ctx, 16.5, 10, 2.5, 1.2, null, 0, '#8a6a3a', 0.8);
  return finish(c, { shade: false });
}
function bush(r) {
  const W = 46, H = 36; const c = mkS(W, H); const ctx = c.getContext('2d');
  const gy = H - 6;
  softShadow(ctx, 23, gy, 16, 4, 0.3);
  const blobs = [[23, gy - 12, 11], [12, gy - 8, 8], [34, gy - 9, 8], [18, gy - 16, 7], [29, gy - 17, 7]];
  for (const [x, y, rr] of blobs) circle(ctx, x + 1, y + 2, rr, '#1f4a22');
  for (const [x, y, rr] of blobs) circle(ctx, x, y, rr, rgrad(ctx, x - rr * 0.3, y - rr * 0.4, 1, rr, [[0, '#9ad56a'], [0.6, '#4f9a3f'], [1, '#2a6a2a']]));
  for (let i = 0; i < 5; i++) circle(ctx, 10 + r() * 26, gy - 8 - r() * 12, 1.4, r() > 0.5 ? '#e86a8a' : '#f2c94c');
  return finish(c, { shade: false });
}
function pebbles(r) {
  const W = 40, H = 22; const c = mkS(W, H); const ctx = c.getContext('2d');
  for (let i = 0; i < 6; i++) { const x = 5 + r() * 30, y = 8 + r() * 10, rr = 1.5 + r() * 2.2; ellipse(ctx, x + 0.6, y + 0.8, rr, rr * 0.7, 'rgba(0,0,0,0.3)'); ellipse(ctx, x, y, rr, rr * 0.7, lgrad(ctx, x - rr, y - rr, x + rr, y + rr, [[0, '#b3aca2'], [1, '#5e5852']])); }
  return c;
}
function reeds(r) {
  const W = 44, H = 40; const c = mkS(W, H); const ctx = c.getContext('2d');
  for (let i = 0; i < 9; i++) {
    const x = 6 + r() * 32, top = 6 + r() * 10, bend = (r() - 0.5) * 8;
    ctx.beginPath(); ctx.moveTo(x, 32); ctx.quadraticCurveTo(x + bend * 0.5, 20, x + bend, top); ctx.strokeStyle = i % 2 ? '#5a7a3a' : '#7a9a4a'; ctx.lineWidth = 1.4; ctx.stroke();
    ellipse(ctx, x + bend, top + 2, 1.6, 4.5, '#5a3a22');
  }
  return c;
}

// ---------------- Resource icons ----------------
export function resourceIcon(res, size = 24) {
  return cached(`res:${res}:${size}`, () => {
    const c = mk(size, size); const ctx = c.getContext('2d');
    ctx.scale(size / 24, size / 24);
    const info = RES_INFO[res];
    switch (res) {
      case 'gold':
        for (let i = 2; i >= 0; i--) { ellipse(ctx, 12, 17 - i * 3, 8, 3.2, info.dark); ellipse(ctx, 12, 16 - i * 3, 8, 3.2, info.color, 0, info.dark, 0.8); }
        ellipse(ctx, 12, 10, 8, 3.2, lgrad(ctx, 4, 0, 20, 0, [[0, '#ffe59a'], [1, '#d6a52a']]), 0, info.dark, 0.8);
        ellipse(ctx, 10, 9.5, 3, 1, 'rgba(255,255,255,0.5)');
        break;
      case 'wood':
        for (const [x, y] of [[8, 16], [16, 16], [12, 10]]) { rrect(ctx, x - 7, y - 3, 14, 6, 2, lgrad(ctx, 0, y - 3, 0, y + 3, [[0, '#8a5a2a'], [1, '#4a2e14']])); circle(ctx, x + 6, y, 3, '#d9b07a', '#8a5a2a', 0.8); circle(ctx, x + 6, y, 1.2, null, '#a07a4a', 0.6); }
        break;
      case 'ore':
        poly(ctx, [[3, 20], [7, 10], [12, 13], [16, 6], [21, 20]], lgrad(ctx, 3, 0, 21, 0, [[0, '#b7bec8'], [1, '#5a6068']]), '#3a3f45', 0.8);
        circle(ctx, 14, 14, 1.5, '#ff9f40'); circle(ctx, 9, 16, 1.2, '#ff9f40'); circle(ctx, 17, 11, 1, '#ffd080');
        break;
      case 'mithril':
        poly(ctx, [[12, 3], [20, 10], [16, 21], [8, 21], [4, 10]], lgrad(ctx, 4, 3, 20, 21, [[0, '#ffffff'], [0.5, '#bfe8ff'], [1, '#5f9fc2']]), '#3a6f8a', 0.8);
        line(ctx, 8, 9, 15, 7, 'rgba(255,255,255,0.9)', 1.5);
        break;
      case 'warpstone':
        poly(ctx, [[12, 2], [19, 9], [21, 18], [12, 22], [3, 18], [5, 9]], lgrad(ctx, 3, 2, 21, 22, [[0, '#c9ff9a'], [0.5, '#5fd63a'], [1, '#1e6e14']]), '#0f3f0a', 0.8);
        ctx.shadowColor = '#7dff5e'; ctx.shadowBlur = 4; circle(ctx, 11, 11, 2.5, '#e8ffd0'); ctx.shadowBlur = 0;
        break;
      case 'gems':
        poly(ctx, [[4, 10], [9, 4], [15, 4], [20, 10], [12, 21]], lgrad(ctx, 4, 4, 20, 21, [[0, '#ffd0fa'], [0.5, '#d94fd1'], [1, '#6a1a62']]), '#4a1045', 0.8);
        poly(ctx, [[9, 4], [12, 10], [15, 4]], 'rgba(255,255,255,0.5)'); line(ctx, 4, 10, 20, 10, 'rgba(255,255,255,0.35)', 0.8);
        break;
    }
    return c;
  });
}

// ---------------- Object sprites ----------------
function flagPole(ctx, x, y, color, h = 26) {
  line(ctx, x, y, x, y - h, '#2a1e14', 2.2);
  ctx.beginPath(); ctx.moveTo(x, y - h); ctx.quadraticCurveTo(x + 8, y - h + 1, x + 15, y - h + 3); ctx.quadraticCurveTo(x + 9, y - h + 6, x, y - h + 10); ctx.closePath();
  ctx.fillStyle = lgrad(ctx, x, 0, x + 15, 0, [[0, lighten(color, 0.25)], [1, shade(color, 0.75)]]); ctx.fill();
}
function window_(ctx, x, y, w, h, col = '#ffd27a') {
  glow(ctx, x + w / 2, y + h / 2, Math.max(w, h) * 1.4, col, 0.45);
  rrect(ctx, x, y, w, h, Math.min(w, h) * 0.3, lgrad(ctx, 0, y, 0, y + h, [[0, '#fff1c0'], [1, col]]));
}
function smoke(ctx, x, y, n = 4) {
  for (let k = 0; k < n; k++) circle(ctx, x + k * 4 + Math.sin(k) * 4, y - k * 9, 5 + k * 2.5, `rgba(120,120,125,${0.38 - k * 0.08})`);
}
export function objectSprite(o, ownerColor) {
  const key = `obj:${o.type}:${o.res || o.unit || o.artifact || ''}:${o.faction || ''}:${ownerColor || ''}`;
  return cached(key, () => {
    const ak = o.type === 'mine' ? `objects/mine_${o.res}` : o.type === 'dwelling' ? `objects/dwelling_${o.unit}` : o.type === 'resource' ? `objects/resource_${o.res}` : `objects/${o.type}`;
    const OBJ_SCALE = { resource: 0.5, chest: 0.55, artifact: 0.6, well: 0.85, runestone: 0.85, fountain: 0.8, camp: 0.85 };
    const asset = assetCanvas(ak, 80, 84, false, OBJ_SCALE[o.type] || 1, 0.905);
    if (asset) { if (ownerColor && (o.type === 'mine' || o.type === 'dwelling')) { const x = asset.getContext('2d'); x.setTransform(2, 0, 0, 2, 0, 0); flagPole(x, 6, asset.lh - 10, ownerColor, 32); } return asset; }
    switch (o.type) {
      case 'mine': return mineSprite(o.res, ownerColor);
      case 'dwelling': return dwellingSprite(o.unit, ownerColor);
      case 'resource': return resourcePile(o.res);
      case 'chest': return chestSprite();
      case 'artifact': return artifactSprite();
      case 'shrine': return shrineSprite();
      case 'runestone': return runestoneSprite();
      case 'well': return wellSprite();
      case 'tree': return wisdomTree();
      case 'stables': return stablesSprite();
      case 'tower': return towerSprite();
      case 'fountain': return fountainSprite();
      case 'camp': return campSprite();
      case 'windmill': return windmillSprite();
      case 'ruin': return ruinSprite();
      default: return mkS(1, 1);
    }
  });
}
function mineSprite(res, ownerColor) {
  const W = 80, H = 80; const c = mkS(W, H); const ctx = c.getContext('2d');
  const gy = H - 8; const info = RES_INFO[res];
  softShadow(ctx, 40, gy, 34, 8, 0.35);
  if (res === 'wood') {
    // sawmill: timber house with water wheel
    rrect(ctx, 12, gy - 32, 46, 32, 2, lgrad(ctx, 12, 0, 58, 0, [[0, '#8a6540'], [1, '#5a3f26']]));
    for (let i = 0; i < 5; i++) line(ctx, 13, gy - 28 + i * 6, 57, gy - 28 + i * 6, 'rgba(40,25,10,0.35)', 1);
    poly(ctx, [[8, gy - 32], [35, gy - 52], [62, gy - 32]], lgrad(ctx, 0, gy - 52, 0, gy - 32, [[0, '#6e4a2a'], [1, '#3e2a16']]));
    line(ctx, 8, gy - 32, 35, gy - 52, '#9a7a4a', 1.5); line(ctx, 62, gy - 32, 35, gy - 52, '#9a7a4a', 1.5);
    window_(ctx, 22, gy - 24, 7, 8); rrect(ctx, 38, gy - 16, 10, 16, 2, '#1e140c');
    // wheel
    circle(ctx, 66, gy - 18, 11, null, '#6a4a2a', 3); circle(ctx, 66, gy - 18, 2.5, '#3a2a1a');
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; line(ctx, 66, gy - 18, 66 + Math.cos(a) * 11, gy - 18 + Math.sin(a) * 11, '#8a6a3a', 2); }
    // log pile
    for (const [x, y] of [[8, gy - 4], [16, gy - 4], [12, gy - 10]]) { rrect(ctx, x - 6, y - 3, 12, 6, 2, '#6a4a2a'); circle(ctx, x + 6, y, 2.8, '#d9b07a', '#6a4a2a', 0.8); }
  } else {
    // hillside with timbered mine entrance and cart
    const pts = [[2, gy], [8, gy - 22], [20, gy - 36], [40, gy - 50], [58, gy - 38], [72, gy - 24], [78, gy]];
    smoothPoly(ctx, pts, lgrad(ctx, 0, gy - 50, 0, gy, [[0, '#9a9288'], [0.6, '#6e665e'], [1, '#4e4842']]));
    for (let k = 0; k < 5; k++) line(ctx, 14 + k * 12, gy - 20 - (k % 2) * 10, 20 + k * 12, gy - 8 - (k % 2) * 6, 'rgba(30,26,24,0.3)', 1.2);
    poly(ctx, [[26, gy], [26, gy - 20], [40, gy - 30], [54, gy - 20], [54, gy]], '#120d0a');
    glow(ctx, 40, gy - 10, 10, '#ff9a3a', 0.35);
    line(ctx, 24, gy - 20, 40, gy - 32, '#6b4a2a', 4); line(ctx, 56, gy - 20, 40, gy - 32, '#6b4a2a', 4);
    line(ctx, 24, gy - 20, 24, gy, '#6b4a2a', 4); line(ctx, 56, gy - 20, 56, gy, '#6b4a2a', 4);
    line(ctx, 24, gy - 10, 56, gy - 10, '#5a3a22', 2);
    // rails
    line(ctx, 30, gy, 36, gy - 8, '#8a8a8a', 1.2); line(ctx, 50, gy, 44, gy - 8, '#8a8a8a', 1.2);
    // cart with resource
    rrect(ctx, 58, gy - 12, 18, 9, 2, lgrad(ctx, 0, gy - 12, 0, gy - 3, [[0, '#6a4a2e'], [1, '#3a2616']])); circle(ctx, 62, gy - 2, 3, '#2a2a2a', '#111', 1); circle(ctx, 72, gy - 2, 3, '#2a2a2a', '#111', 1);
    ctx.drawImage(resourceIcon(res, 32), 59, gy - 26, 16, 16);
    // sign with resource emblem
    line(ctx, 14, gy, 14, gy - 26, '#4a3a2a', 2.5);
    circle(ctx, 14, gy - 32, 7.5, lgrad(ctx, 7, gy - 40, 21, gy - 24, [[0, lighten(info.color, 0.2)], [1, info.dark]]), '#2a2420', 1.2);
    circle(ctx, 12, gy - 34, 2, 'rgba(255,255,255,0.45)');
  }
  if (ownerColor) flagPole(ctx, 6, gy - 6, ownerColor, 34);
  return finish(c);
}
function dwellingSprite(unit, ownerColor) {
  const W = 80, H = 84; const c = mkS(W, H); const ctx = c.getContext('2d');
  const gy = H - 8;
  softShadow(ctx, 40, gy, 34, 8, 0.35);
  const elf = ['dryad', 'glade_guard', 'eternal_guard', 'wardancer', 'wild_rider', 'great_eagle', 'treeman'].includes(unit);
  const orc = ['goblin', 'orc_boy', 'orc_archer', 'warg_rider', 'black_orc', 'troll', 'giant'].includes(unit);
  if (elf) {
    // tree-house with spiral stair
    line(ctx, 40, gy, 40, gy - 44, lgrad(ctx, 34, 0, 46, 0, [[0, '#7a5a3a'], [1, '#4a3220']]), 12);
    for (let k = 0; k < 4; k++) line(ctx, 32 + (k % 2) * 16, gy - 8 - k * 9, 48 - (k % 2) * 16, gy - 12 - k * 9, '#c8b48a', 1.5);
    const fol = [[40, gy - 60, 24], [22, gy - 54, 14], [58, gy - 56, 15], [30, gy - 72, 13], [52, gy - 72, 13]];
    for (const [x, y, rr] of fol) circle(ctx, x + 1, y + 3, rr + 1, '#1f5a22');
    for (const [x, y, rr] of fol) circle(ctx, x, y, rr, rgrad(ctx, x - rr * 0.3, y - rr * 0.4, 1, rr, [[0, '#a4dc7a'], [0.6, '#4f9a3f'], [1, '#2a6a2a']]));
    rrect(ctx, 24, gy - 46, 32, 16, 5, lgrad(ctx, 0, gy - 46, 0, gy - 30, [[0, '#f3ead3'], [1, '#c8b890']]), '#8a7a5a', 1);
    poly(ctx, [[20, gy - 46], [40, gy - 58], [60, gy - 46]], '#b8923a');
    window_(ctx, 30, gy - 42, 6, 7); window_(ctx, 44, gy - 42, 6, 7);
    for (let i = 0; i < 4; i++) { glow(ctx, 18 + i * 15, gy - 50 + (i % 2) * 8, 4, '#ffe9a0', 0.5); circle(ctx, 18 + i * 15, gy - 50 + (i % 2) * 8, 1.2, '#fff6c8'); }
  } else if (orc) {
    // spiked hut with skull totem
    smoothPoly(ctx, [[10, gy], [12, gy - 30], [26, gy - 46], [40, gy - 52], [54, gy - 46], [68, gy - 30], [70, gy]], lgrad(ctx, 0, gy - 52, 0, gy, [[0, '#6b5a4a'], [1, '#3a2e26']]));
    for (let k = 0; k < 6; k++) line(ctx, 16 + k * 10, gy - 40 + Math.abs(k - 2.5) * 4, 18 + k * 10, gy - 2, 'rgba(20,14,10,0.35)', 1.5);
    rrect(ctx, 32, gy - 22, 16, 22, 3, '#120d0a'); glow(ctx, 40, gy - 10, 10, '#ff8a3a', 0.4);
    for (let i = 0; i < 5; i++) { const x = 8 + i * 16; line(ctx, x, gy, x + 2, gy - 16 - (i % 2) * 6, '#a08a70', 3); poly(ctx, [[x - 1, gy - 15 - (i % 2) * 6], [x + 2, gy - 22 - (i % 2) * 6], [x + 5, gy - 15 - (i % 2) * 6]], '#d8cbb0'); }
    line(ctx, 40, gy - 52, 40, gy - 66, '#3a2a1a', 2.5);
    circle(ctx, 40, gy - 70, 6, '#e8e0c8'); circle(ctx, 38, gy - 71, 1.5, '#000'); circle(ctx, 42.5, gy - 71, 1.5, '#000'); rrect(ctx, 37, gy - 66, 6, 2, 1, '#000');
    smoke(ctx, 52, gy - 50, 3);
  } else {
    // cave / lair with bones
    smoothPoly(ctx, [[4, gy], [8, gy - 24], [22, gy - 40], [40, gy - 46], [58, gy - 40], [72, gy - 24], [76, gy]], lgrad(ctx, 0, gy - 46, 0, gy, [[0, '#8a8278'], [0.6, '#5e5850'], [1, '#403b36']]));
    ellipse(ctx, 40, gy - 4, 17, 20, '#0d0a09');
    glow(ctx, 40, gy - 6, 12, '#5a8a6a', 0.25);
    for (let i = 0; i < 3; i++) poly(ctx, [[26 + i * 10, gy - 22], [29 + i * 10, gy - 12], [32 + i * 10, gy - 22]], '#d8d0c0');
    for (let i = 0; i < 3; i++) { line(ctx, 10 + i * 26, gy - 2, 16 + i * 26, gy - 4, '#e8e0d0', 2); circle(ctx, 16 + i * 26, gy - 4, 1.5, '#e8e0d0'); }
    for (let k = 0; k < 4; k++) line(ctx, 14 + k * 16, gy - 30 - (k % 2) * 6, 18 + k * 16, gy - 14, 'rgba(30,26,24,0.3)', 1.2);
  }
  if (ownerColor) flagPole(ctx, 6, gy - 4, ownerColor, 32);
  return finish(c);
}
function resourcePile(res) {
  const W = 52, H = 44; const c = mkS(W, H); const ctx = c.getContext('2d');
  const gy = H - 8;
  softShadow(ctx, 26, gy, 18, 5, 0.3);
  if (res === 'gold') {
    for (let i = 0; i < 7; i++) { const x = 8 + (i % 4) * 9 + (i >= 4 ? 4 : 0), y = gy - 2 - (i >= 4 ? 5 : 0); ellipse(ctx, x, y, 4.5, 2, '#9a7120'); ellipse(ctx, x, y - 1, 4.5, 2, lgrad(ctx, x - 4, 0, x + 4, 0, [[0, '#ffe59a'], [1, '#d6a52a']]), 0, '#8a6218', 0.6); }
    ctx.drawImage(resourceIcon('gold', 48), 14, gy - 30, 24, 24);
    glow(ctx, 26, gy - 14, 18, '#ffd860', 0.25);
  } else if (res === 'wood') { ctx.drawImage(resourceIcon('wood', 72), 8, gy - 34, 36, 36); }
  else if (res === 'ore') { ctx.drawImage(resourceIcon('ore', 72), 8, gy - 34, 36, 36); }
  else {
    glow(ctx, 26, gy - 12, 18, RES_INFO[res].color, 0.3);
    ctx.drawImage(resourceIcon(res, 56), 12, gy - 30, 28, 28); ctx.drawImage(resourceIcon(res, 36), 2, gy - 18, 18, 18); ctx.drawImage(resourceIcon(res, 32), 32, gy - 16, 16, 16);
  }
  return c;
}
function chestSprite() {
  const W = 46, H = 40; const c = mkS(W, H); const ctx = c.getContext('2d');
  const gy = H - 8;
  softShadow(ctx, 23, gy, 16, 4, 0.3);
  rrect(ctx, 8, gy - 16, 30, 16, 2, lgrad(ctx, 0, gy - 16, 0, gy, [[0, '#8a5a2a'], [1, '#4a2e14']]));
  rrect(ctx, 8, gy - 23, 30, 10, 5, lgrad(ctx, 0, gy - 23, 0, gy - 13, [[0, '#a8743a'], [1, '#6b3f1f']]));
  line(ctx, 8, gy - 13, 38, gy - 13, '#e2b64a', 2.2); line(ctx, 15, gy - 23, 15, gy, '#e2b64a', 1.8); line(ctx, 31, gy - 23, 31, gy, '#e2b64a', 1.8);
  rrect(ctx, 20, gy - 15, 6, 7, 1.5, lgrad(ctx, 0, gy - 15, 0, gy - 8, [[0, '#ffe08a'], [1, '#b8821e']]), '#6a4a10', 0.8);
  glow(ctx, 23, gy - 18, 10, '#ffe08a', 0.2);
  return finish(c);
}
function artifactSprite() {
  const W = 48, H = 54; const c = mkS(W, H); const ctx = c.getContext('2d');
  const gy = H - 8;
  softShadow(ctx, 24, gy, 15, 4, 0.3);
  rrect(ctx, 12, gy - 10, 24, 10, 2, lgrad(ctx, 12, 0, 36, 0, [[0, '#8e867e'], [1, '#5a544e']])); rrect(ctx, 15, gy - 15, 18, 5, 1.5, '#a39b93');
  glow(ctx, 24, gy - 26, 20, '#ffe9a0', 0.5);
  poly(ctx, [[24, gy - 40], [33, gy - 27], [24, gy - 15], [15, gy - 27]], lgrad(ctx, 15, gy - 40, 33, gy - 15, [[0, '#fff8dc'], [0.5, '#ffd24a'], [1, '#b8781a']]), 'rgba(90,60,10,0.6)', 1);
  poly(ctx, [[24, gy - 40], [27, gy - 30], [24, gy - 27], [21, gy - 30]], 'rgba(255,255,255,0.55)');
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; circle(ctx, 24 + Math.cos(a) * 14, gy - 27 + Math.sin(a) * 11, 1, '#fff6c8'); }
  return c;
}
function shrineSprite() {
  const W = 62, H = 72; const c = mkS(W, H); const ctx = c.getContext('2d');
  const gy = H - 8;
  softShadow(ctx, 31, gy, 24, 6, 0.3);
  const stone = lgrad(ctx, 0, gy - 50, 0, gy, [[0, '#b0a89e'], [1, '#6e6861']]);
  rrect(ctx, 9, gy - 46, 11, 46, 2, stone); rrect(ctx, 42, gy - 46, 11, 46, 2, stone);
  for (let k = 0; k < 4; k++) { line(ctx, 10, gy - 40 + k * 11, 19, gy - 40 + k * 11, 'rgba(40,36,32,0.3)', 1); line(ctx, 43, gy - 40 + k * 11, 52, gy - 40 + k * 11, 'rgba(40,36,32,0.3)', 1); }
  ctx.beginPath(); ctx.moveTo(6, gy - 44); ctx.quadraticCurveTo(31, gy - 72, 56, gy - 44); ctx.lineTo(56, gy - 36); ctx.quadraticCurveTo(31, gy - 62, 6, gy - 36); ctx.closePath(); ctx.fillStyle = '#9a928a'; ctx.fill();
  poly(ctx, [[31, gy - 70], [35, gy - 64], [31, gy - 60], [27, gy - 64]], '#d9c27a');
  glow(ctx, 31, gy - 26, 16, '#8fd3ff', 0.6);
  circle(ctx, 31, gy - 26, 7, rgrad(ctx, 29, gy - 28, 1, 8, [[0, '#ffffff'], [1, '#7fc8ff']]));
  line(ctx, 27, gy - 30, 35, gy - 22, '#2a5a8a', 1.5); line(ctx, 35, gy - 30, 27, gy - 22, '#2a5a8a', 1.5);
  return finish(c);
}
function runestoneSprite() {
  const W = 44, H = 62; const c = mkS(W, H); const ctx = c.getContext('2d');
  const gy = H - 8;
  softShadow(ctx, 22, gy, 15, 4, 0.3);
  poly(ctx, [[8, gy], [9, gy - 30], [13, gy - 46], [22, gy - 54], [31, gy - 46], [35, gy - 30], [36, gy]], lgrad(ctx, 8, 0, 36, 0, [[0, '#9a928a'], [0.5, '#7a736c'], [1, '#4e4944']]));
  for (let k = 0; k < 3; k++) line(ctx, 11 + k * 3, gy - 10 - k * 14, 16 + k * 6, gy - 2 - k * 14, 'rgba(30,26,24,0.3)', 1);
  ctx.strokeStyle = '#7dd3ff'; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.shadowColor = '#7dd3ff'; ctx.shadowBlur = 6;
  ctx.beginPath(); ctx.moveTo(17, gy - 40); ctx.lineTo(27, gy - 40); ctx.moveTo(22, gy - 40); ctx.lineTo(22, gy - 14); ctx.moveTo(15, gy - 30); ctx.lineTo(29, gy - 22); ctx.moveTo(29, gy - 30); ctx.lineTo(15, gy - 22); ctx.stroke();
  ctx.shadowBlur = 0;
  for (let i = 0; i < 3; i++) line(ctx, 6 + i * 14, gy, 8 + i * 14, gy - 6, '#4a7a2a', 1.4);
  return finish(c);
}
function wellSprite() {
  const W = 54, H = 64; const c = mkS(W, H); const ctx = c.getContext('2d');
  const gy = H - 8;
  softShadow(ctx, 27, gy, 20, 5, 0.3);
  ellipse(ctx, 27, gy - 8, 18, 8, '#6e665e'); ellipse(ctx, 27, gy - 10, 14, 6, rgrad(ctx, 27, gy - 10, 1, 14, [[0, '#6fb8e0'], [1, '#1f4a6a']]));
  ellipse(ctx, 24, gy - 11, 5, 1.5, 'rgba(255,255,255,0.45)');
  rrect(ctx, 9, gy - 20, 36, 12, 3, lgrad(ctx, 9, 0, 45, 0, [[0, '#a39b93'], [1, '#6e665e']]));
  for (let k = 0; k < 4; k++) line(ctx, 12 + k * 9, gy - 19, 12 + k * 9, gy - 9, 'rgba(40,36,32,0.3)', 1);
  ellipse(ctx, 27, gy - 20, 18, 7, '#b8b0a6');
  line(ctx, 11, gy - 20, 11, gy - 44, '#5a3a22', 3.5); line(ctx, 43, gy - 20, 43, gy - 44, '#5a3a22', 3.5);
  poly(ctx, [[4, gy - 42], [27, gy - 56], [50, gy - 42]], lgrad(ctx, 0, gy - 56, 0, gy - 42, [[0, '#8a6a3a'], [1, '#4a3220']]));
  circle(ctx, 27, gy - 33, 3, '#5a3a22'); line(ctx, 27, gy - 33, 27, gy - 14, '#8a7a5a', 1);
  rrect(ctx, 24, gy - 16, 6, 5, 1, '#6a4a2a');
  glow(ctx, 27, gy - 12, 12, '#9fd8ff', 0.3);
  return finish(c);
}
function wisdomTree() {
  const W = 90, H = 106; const c = mkS(W, H); const ctx = c.getContext('2d');
  const gy = H - 8;
  softShadow(ctx, 45, gy, 30, 7, 0.35);
  ctx.beginPath(); ctx.moveTo(36, gy); ctx.quadraticCurveTo(40, gy - 24, 42, gy - 44); ctx.lineTo(48, gy - 44); ctx.quadraticCurveTo(50, gy - 24, 54, gy); ctx.closePath();
  ctx.fillStyle = lgrad(ctx, 36, 0, 54, 0, [[0, '#7a5a3a'], [1, '#3e2a16']]); ctx.fill();
  line(ctx, 44, gy - 34, 26, gy - 56, '#5a3a22', 6); line(ctx, 46, gy - 36, 64, gy - 58, '#5a3a22', 6);
  const fol = [[45, gy - 68, 26], [22, gy - 60, 16], [68, gy - 60, 16], [33, gy - 82, 15], [57, gy - 82, 15], [45, gy - 90, 12]];
  for (const [x, y, rr] of fol) circle(ctx, x + 1, y + 3, rr + 1, '#1f4a60');
  for (const [x, y, rr] of fol) circle(ctx, x, y, rr, rgrad(ctx, x - rr * 0.3, y - rr * 0.4, 1, rr, [[0, '#c8f4ff'], [0.55, '#5fb8d8'], [1, '#2a6a8a']]));
  glow(ctx, 45, gy - 70, 40, '#9fe8ff', 0.25);
  for (let i = 0; i < 12; i++) { const x = 18 + (i * 37) % 56, y = gy - 56 - (i * 23) % 40; glow(ctx, x, y, 4, '#ffffff', 0.5); circle(ctx, x, y, 1.3, '#ffffff'); }
  return finish(c);
}
function stablesSprite() {
  const W = 84, H = 70; const c = mkS(W, H); const ctx = c.getContext('2d');
  const gy = H - 8;
  softShadow(ctx, 42, gy, 36, 7, 0.35);
  rrect(ctx, 8, gy - 28, 68, 28, 2, lgrad(ctx, 0, gy - 28, 0, gy, [[0, '#9a6a36'], [1, '#5a3a1e']]));
  for (let i = 0; i < 6; i++) line(ctx, 12 + i * 12.5, gy - 27, 12 + i * 12.5, gy, 'rgba(40,25,10,0.35)', 1.5);
  poly(ctx, [[4, gy - 28], [42, gy - 50], [80, gy - 28]], lgrad(ctx, 0, gy - 50, 0, gy - 28, [[0, '#6e4a2a'], [1, '#3e2a16']]));
  for (let k = 0; k < 4; k++) line(ctx, 10 + k * 8, gy - 31 - k * 4.5, 74 - k * 8, gy - 31 - k * 4.5, 'rgba(255,220,160,0.12)', 1);
  rrect(ctx, 32, gy - 20, 20, 20, 3, '#1e140c'); line(ctx, 32, gy - 20, 52, gy, '#5a3a1e', 1.5); line(ctx, 52, gy - 20, 32, gy, '#5a3a1e', 1.5);
  window_(ctx, 16, gy - 18, 7, 6); window_(ctx, 61, gy - 18, 7, 6);
  // horse head sign
  ctx.save(); ctx.translate(62, gy - 38); ctx.scale(0.6, 0.6);
  ellipse(ctx, 0, 0, 10, 7, '#f0e8d8', 0.4); poly(ctx, [[8, -4], [20, 0], [8, 5]], '#f0e8d8'); poly(ctx, [[-4, -6], [-2, -14], [2, -6]], '#f0e8d8'); circle(ctx, 2, -2, 1.2, '#222');
  ctx.restore();
  // hay
  ellipse(ctx, 10, gy - 2, 8, 4, '#d8b860');
  return finish(c);
}
function towerSprite() {
  const W = 54, H = 108; const c = mkS(W, H); const ctx = c.getContext('2d');
  const gy = H - 8;
  softShadow(ctx, 27, gy, 18, 5, 0.3);
  rrect(ctx, 14, gy - 78, 26, 78, 2, lgrad(ctx, 14, 0, 40, 0, [[0, '#aaa198'], [0.5, '#7e766e'], [1, '#524c47']]));
  for (let k = 0; k < 9; k++) { line(ctx, 15, gy - 70 + k * 8, 39, gy - 70 + k * 8, 'rgba(40,36,32,0.25)', 1); line(ctx, 20 + (k % 2) * 8, gy - 70 + k * 8, 20 + (k % 2) * 8, gy - 62 + k * 8, 'rgba(40,36,32,0.25)', 1); }
  rrect(ctx, 10, gy - 86, 34, 8, 1, '#8a827a'); for (let i = 0; i < 4; i++) rrect(ctx, 11 + i * 9, gy - 92, 6, 7, 1, '#8a827a');
  window_(ctx, 24, gy - 62, 6, 10, '#ffd27a'); rrect(ctx, 24, gy - 36, 6, 9, 3, '#1a1410');
  rrect(ctx, 21, gy - 14, 12, 14, 4, '#1a1410');
  flagPole(ctx, 27, gy - 92, '#c8b060', 18);
  return finish(c);
}
function fountainSprite() {
  const W = 58, H = 60; const c = mkS(W, H); const ctx = c.getContext('2d');
  const gy = H - 8;
  softShadow(ctx, 29, gy, 22, 5, 0.3);
  ellipse(ctx, 29, gy - 6, 22, 9, lgrad(ctx, 7, 0, 51, 0, [[0, '#a39b93'], [1, '#6e665e']])); ellipse(ctx, 29, gy - 8, 18, 7, rgrad(ctx, 29, gy - 8, 1, 18, [[0, '#8fd0f0'], [1, '#2a6a9a']]));
  ellipse(ctx, 24, gy - 9, 6, 1.6, 'rgba(255,255,255,0.4)');
  rrect(ctx, 26, gy - 32, 6, 24, 2, lgrad(ctx, 26, 0, 32, 0, [[0, '#b0a89e'], [1, '#7e766e']])); ellipse(ctx, 29, gy - 32, 10, 4, '#b8b0a6'); ellipse(ctx, 29, gy - 33, 8, 3, '#5fb0e0');
  ctx.strokeStyle = 'rgba(190,235,255,0.95)'; ctx.lineWidth = 1.6;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(29, gy - 36); ctx.quadraticCurveTo(29 + s * 12, gy - 44, 29 + s * 16, gy - 12); ctx.stroke(); }
  for (let i = 0; i < 6; i++) circle(ctx, 29 + (i - 2.5) * 6, gy - 14 - Math.abs(i - 2.5) * 2, 1, '#e8f8ff');
  glow(ctx, 29, gy - 38, 10, '#ffe9a0', 0.6); circle(ctx, 29, gy - 38, 2.5, '#fff6d0');
  return finish(c);
}
function campSprite() {
  const W = 70, H = 58; const c = mkS(W, H); const ctx = c.getContext('2d');
  const gy = H - 8;
  softShadow(ctx, 35, gy, 28, 6, 0.3);
  poly(ctx, [[4, gy], [24, gy - 34], [44, gy]], lgrad(ctx, 4, 0, 44, 0, [[0, '#d8c8a8'], [1, '#a8966e']])); poly(ctx, [[24, gy - 34], [44, gy], [28, gy]], '#7a6a4a');
  poly(ctx, [[24, gy - 34], [20, gy - 40], [26, gy - 36]], '#8a7a5a'); poly(ctx, [[24, gy - 34], [30, gy - 40], [26, gy - 36]], '#8a7a5a');
  line(ctx, 48, gy - 2, 62, gy - 8, '#5a3a22', 3); line(ctx, 48, gy - 8, 62, gy - 2, '#5a3a22', 3);
  for (let i = 0; i < 5; i++) circle(ctx, 46 + i * 4, gy, 2.2, '#6e665e');
  glow(ctx, 55, gy - 14, 18, '#ff9a40', 0.5);
  poly(ctx, [[50, gy - 6], [52, gy - 16], [55, gy - 26], [58, gy - 16], [60, gy - 6]], lgrad(ctx, 0, gy - 26, 0, gy - 6, [[0, '#ffe27a'], [0.5, '#ff9a2a'], [1, '#d8401a']]));
  poly(ctx, [[53, gy - 6], [55, gy - 18], [57, gy - 6]], '#fff6c8');
  smoke(ctx, 56, gy - 30, 3);
  return finish(c, { shade: false });
}
function windmillSprite() {
  const W = 72, H = 100; const c = mkS(W, H); const ctx = c.getContext('2d');
  const gy = H - 8;
  softShadow(ctx, 36, gy, 22, 5, 0.3);
  poly(ctx, [[18, gy], [24, gy - 50], [48, gy - 50], [54, gy]], lgrad(ctx, 18, 0, 54, 0, [[0, '#c8b898'], [0.5, '#a8966e'], [1, '#6e5e46']]));
  for (let k = 0; k < 6; k++) line(ctx, 22 + k * 0.9, gy - 44 + k * 8, 51 - k * 0.9, gy - 44 + k * 8, 'rgba(40,30,20,0.25)', 1);
  poly(ctx, [[20, gy - 50], [36, gy - 62], [52, gy - 50]], '#5a3a22');
  rrect(ctx, 32, gy - 16, 8, 16, 3, '#1e140c'); window_(ctx, 33, gy - 36, 6, 7);
  ctx.save(); ctx.translate(36, gy - 56);
  for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); rrect(ctx, -2, -34, 4, 34, 1, '#8a7a5a'); rrect(ctx, -8, -34, 13, 22, 1, 'rgba(245,240,225,0.92)', '#8a7a5a', 0.8); for (let k = 1; k < 4; k++) line(ctx, -8, -34 + k * 5.5, 5, -34 + k * 5.5, 'rgba(120,100,70,0.5)', 0.8); }
  ctx.restore(); circle(ctx, 36, gy - 56, 3.5, '#3a2a1a');
  return finish(c);
}
function ruinSprite() {
  const W = 70, H = 62; const c = mkS(W, H); const ctx = c.getContext('2d');
  const gy = H - 8;
  softShadow(ctx, 35, gy, 28, 6, 0.3);
  for (const [x, h] of [[14, 38], [33, 24], [52, 42]]) {
    rrect(ctx, x - 5, gy - h, 10, h, 2, lgrad(ctx, x - 5, 0, x + 5, 0, [[0, '#b0a89e'], [1, '#6e665e']]));
    for (let k = 1; k < h / 8; k++) line(ctx, x - 5, gy - h + k * 8, x + 5, gy - h + k * 8, 'rgba(40,36,32,0.3)', 1);
    rrect(ctx, x - 7, gy - h - 3, 14, 4, 1, '#9a928a');
  }
  line(ctx, 9, gy - 40, 48, gy - 46, '#8a827a', 5);
  poly(ctx, [[20, gy], [26, gy - 8], [34, gy - 4], [40, gy]], '#7a726a');
  for (let i = 0; i < 6; i++) line(ctx, 8 + i * 11, gy, 10 + i * 11, gy - 6 - (i % 2) * 4, '#3a6a2a', 1.5);
  // ivy
  for (let i = 0; i < 6; i++) circle(ctx, 50 + Math.sin(i) * 4, gy - 10 - i * 6, 2.5, '#3f8a3a');
  return finish(c);
}

// ---------------- Towns ----------------
export function townSprite(faction, fortLevel, ownerColor) {
  return cached(`town:${faction}:${fortLevel}:${ownerColor || ''}`, () => {
    const asset = assetCanvas(`towns/${faction}_${fortLevel}`, 200, 160) || assetCanvas(`towns/${faction}`, 200, 160);
    if (asset) { if (ownerColor) { const x = asset.getContext('2d'); x.setTransform(2, 0, 0, 2, 0, 0); flagPole(x, 100, 30, ownerColor, 26); } return asset; }
    const W = 200, H = 160; const c = mkS(W, H); const ctx = c.getContext('2d');
    const gy = H - 8;
    softShadow(ctx, 100, gy, 86, 14, 0.4);
    if (faction === 'elves') {
      const stone = (x0, x1) => lgrad(ctx, x0, 0, x1, 0, [[0, '#f3ecd8'], [0.5, '#ddd3b8'], [1, '#b7ad92']]);
      if (fortLevel > 0) {
        const wh = 14 + fortLevel * 7;
        rrect(ctx, 20, gy - wh - 8, 160, wh + 8, 6, lgrad(ctx, 0, gy - wh - 8, 0, gy, [[0, '#efe8d2'], [1, '#aaa088']]));
        for (let i = 0; i < 10; i++) rrect(ctx, 22 + i * 16, gy - wh - 14, 9, 8, 2, '#e4dcc4');
        for (let k = 0; k < 3; k++) line(ctx, 22, gy - wh + 2 + k * 7, 178, gy - wh + 2 + k * 7, 'rgba(90,80,60,0.18)', 1);
        if (fortLevel >= 2) for (const x of [20, 166]) { rrect(ctx, x, gy - wh - 34, 14, wh + 34, 4, stone(x, x + 14)); poly(ctx, [[x - 3, gy - wh - 34], [x + 7, gy - wh - 52], [x + 17, gy - wh - 34]], '#7fb07a'); window_(ctx, x + 4, gy - wh - 26, 5, 7, '#ffe9a0'); }
        if (fortLevel >= 3) for (const x of [60, 126]) { rrect(ctx, x, gy - wh - 26, 12, wh + 26, 4, stone(x, x + 12)); poly(ctx, [[x - 3, gy - wh - 26], [x + 6, gy - wh - 42], [x + 15, gy - wh - 26]], '#7fb07a'); }
      }
      // Great mallorn
      ctx.beginPath(); ctx.moveTo(84, gy - 4); ctx.quadraticCurveTo(90, gy - 40, 92, gy - 76); ctx.lineTo(108, gy - 76); ctx.quadraticCurveTo(110, gy - 40, 116, gy - 4); ctx.closePath();
      ctx.fillStyle = lgrad(ctx, 84, 0, 116, 0, [[0, '#8a6a46'], [0.5, '#6b4a2a'], [1, '#3e2a16']]); ctx.fill();
      line(ctx, 94, gy - 56, 56, gy - 84, '#6b4a2a', 10); line(ctx, 106, gy - 60, 146, gy - 90, '#6b4a2a', 10);
      const fol = [[100, gy - 106, 46], [56, gy - 92, 28], [146, gy - 96, 30], [78, gy - 126, 24], [124, gy - 128, 24], [100, gy - 136, 20]];
      for (const [x, y, rr] of fol) circle(ctx, x + 2, y + 4, rr + 1, '#8a4e12');
      for (const [x, y, rr] of fol) circle(ctx, x, y, rr, rgrad(ctx, x - rr * 0.3, y - rr * 0.4, 2, rr, [[0, '#fff0b0'], [0.4, '#f0c650'], [0.8, '#d9922a'], [1, '#8a4e12']]));
      for (let i = 0; i < 16; i++) { const x = 52 + ((i * 37) % 100), y = gy - 84 - ((i * 23) % 60); glow(ctx, x, y, 4, '#fff6c8', 0.6); circle(ctx, x, y, 1.3, '#fffbe0'); }
      // halls in the tree
      rrect(ctx, 72, gy - 84, 56, 18, 7, stone(72, 128), '#a89f86', 1); poly(ctx, [[68, gy - 84], [100, gy - 102], [132, gy - 84]], lgrad(ctx, 0, gy - 102, 0, gy - 84, [[0, '#d8b870'], [1, '#a8863a']]));
      window_(ctx, 86, gy - 80, 7, 9); window_(ctx, 107, gy - 80, 7, 9);
      for (const [x, w] of [[38, 34], [128, 34]]) { rrect(ctx, x, gy - 44, w, 32, 5, stone(x, x + w), '#a89f86', 1); poly(ctx, [[x - 4, gy - 44], [x + w / 2, gy - 62], [x + w + 4, gy - 44]], lgrad(ctx, 0, gy - 62, 0, gy - 44, [[0, '#d8b870'], [1, '#a8863a']])); window_(ctx, x + w / 2 - 4, gy - 38, 8, 9); line(ctx, x, gy - 30, x + w, gy - 30, 'rgba(90,80,60,0.25)', 1); }
      // gate with arch and lanterns
      ctx.beginPath(); ctx.moveTo(86, gy - 4); ctx.lineTo(86, gy - 26); ctx.arc(100, gy - 26, 14, Math.PI, 0); ctx.lineTo(114, gy - 4); ctx.closePath(); ctx.fillStyle = '#152215'; ctx.fill();
      glow(ctx, 100, gy - 18, 14, '#ffe9a0', 0.3);
      for (const x of [80, 120]) { glow(ctx, x, gy - 34, 8, '#ffe9a0', 0.7); circle(ctx, x, gy - 34, 2.5, '#fff6c8'); }
    } else {
      const wh = 18 + fortLevel * 9;
      const wallCol = fortLevel >= 3 ? '#2b2a30' : fortLevel >= 2 ? '#4a4040' : '#5e4a38';
      const wallG = (x0, x1) => lgrad(ctx, x0, 0, x1, 0, [[0, lighten(wallCol, 0.3)], [0.5, wallCol], [1, shade(wallCol, 0.6)]]);
      rrect(ctx, 14, gy - wh - 8, 172, wh + 8, 3, lgrad(ctx, 0, gy - wh - 8, 0, gy, [[0, lighten(wallCol, 0.3)], [1, shade(wallCol, 0.7)]]));
      for (let k = 0; k < 4; k++) line(ctx, 16, gy - wh + 2 + k * 8, 184, gy - wh + 2 + k * 8, 'rgba(0,0,0,0.25)', 1.2);
      for (let i = 0; i < 15; i++) poly(ctx, [[16 + i * 11.5, gy - wh - 8], [21 + i * 11.5, gy - wh - 20 - (i % 2) * 6], [26 + i * 11.5, gy - wh - 8]], shade(wallCol, 0.9));
      // iron plates
      for (let i = 0; i < 6; i++) { rrect(ctx, 24 + i * 26, gy - wh + 2, 14, 10, 1, 'rgba(0,0,0,0.18)'); circle(ctx, 26 + i * 26, gy - wh + 4, 1, '#999'); circle(ctx, 36 + i * 26, gy - wh + 10, 1, '#999'); }
      for (const x of [28, 172]) { rrect(ctx, x - 13, gy - wh - 40, 26, wh + 40, 3, wallG(x - 13, x + 13)); for (let k = 0; k < 3; k++) poly(ctx, [[x - 13 + k * 10, gy - wh - 40], [x - 8 + k * 10, gy - wh - 52], [x - 3 + k * 10, gy - wh - 40]], shade(wallCol, 0.8)); window_(ctx, x - 3, gy - wh - 30, 6, 8, '#ff9a3a'); }
      // keep
      rrect(ctx, 58, gy - 96, 84, 78, 4, lgrad(ctx, 58, 0, 142, 0, [[0, '#6a5e54'], [0.5, '#3e3630'], [1, '#231e1a']]));
      for (let k = 0; k < 7; k++) line(ctx, 60, gy - 90 + k * 11, 140, gy - 90 + k * 11, 'rgba(0,0,0,0.22)', 1);
      poly(ctx, [[52, gy - 96], [100, gy - 136], [148, gy - 96]], lgrad(ctx, 0, gy - 136, 0, gy - 96, [[0, '#4a3a2e'], [1, '#2a2018']]));
      for (let k = 0; k < 6; k++) line(ctx, 64 + k * 14, gy - 98, 68 + k * 14, gy - 120 - (k % 2) * 10, '#1a1410', 3.5);
      // forge window
      glow(ctx, 100, gy - 70, 26, '#ff8a2a', 0.45);
      rrect(ctx, 86, gy - 82, 28, 18, 3, lgrad(ctx, 0, gy - 82, 0, gy - 64, [[0, '#ffd27a'], [1, '#ff6a1a']])); for (let k = 0; k < 3; k++) line(ctx, 90 + k * 9, gy - 82, 90 + k * 9, gy - 64, '#3a2a20', 2);
      // skull banners
      for (const x of [46, 154]) { line(ctx, x, gy - 20, x, gy - 78, '#3a2a1a', 2.5); ctx.beginPath(); ctx.moveTo(x, gy - 78); ctx.quadraticCurveTo(x + 12, gy - 76, x + 22, gy - 70); ctx.quadraticCurveTo(x + 10, gy - 62, x, gy - 54); ctx.closePath(); ctx.fillStyle = lgrad(ctx, x, 0, x + 22, 0, [[0, '#9a2a1a'], [1, '#5a1010']]); ctx.fill(); circle(ctx, x + 9, gy - 67, 3.5, '#e8e0c8'); circle(ctx, x + 8, gy - 68, 1, '#000'); circle(ctx, x + 10.5, gy - 68, 1, '#000'); }
      // gate
      ctx.beginPath(); ctx.moveTo(80, gy - 4); ctx.lineTo(80, gy - 26); ctx.arc(100, gy - 26, 20, Math.PI, 0); ctx.lineTo(120, gy - 4); ctx.closePath(); ctx.fillStyle = '#0e0a08'; ctx.fill();
      for (let k = 0; k < 5; k++) line(ctx, 84 + k * 8, gy - 40, 84 + k * 8, gy - 6, '#3a3a3a', 2);
      for (let k = 0; k < 3; k++) poly(ctx, [[86 + k * 12, gy - 46], [90 + k * 12, gy - 34], [94 + k * 12, gy - 46]], '#8a8a8a');
      glow(ctx, 100, gy - 20, 14, '#ff6a2a', 0.3);
      smoke(ctx, 112, gy - 138, 5); smoke(ctx, 70, gy - 100, 3);
    }
    if (ownerColor) flagPole(ctx, 100, gy - (faction === 'elves' ? 102 : 136), ownerColor, 28);
    return finish(c, { px: 1 });
  });
}

// ---------------- Heroes ----------------
export function heroSprite(faction, color, flip = false, frame = 0) {
  return cached(`hero:${faction}:${color}:${flip ? 1 : 0}:${frame}`, () => {
    const asset = assetCanvas(`heroes/${faction}`, 80, 90, flip);
    if (asset) { const x = asset.getContext('2d'); x.setTransform(flip ? -2 : 2, 0, 0, 2, flip ? asset.width : 0, 0); flagPole(x, 27, 46, color, 28); return asset; }
    const W = 80, H = 90; const c = mkS(W, H); const ctx = c.getContext('2d');
    ctx.save();
    if (flip) { ctx.translate(W, 0); ctx.scale(-1, 1); }
    const gy = H - 8;
    softShadow(ctx, 40, gy, 28, 7, 0.4);
    const leg = (x1, y1, x2, y2, col, w) => { line(ctx, x1, y1, x2, y2, col, w); line(ctx, x2, y2, x2 + 3, y2, shade(col, 0.5), w * 0.8); };
    if (faction === 'elves') {
      const horse = '#ece6d8', dark = '#bdb4a2';
      leg(24, gy - 26, 20, gy, horse, 5.5); leg(32, gy - 26, 30, gy, dark, 5.5);
      leg(48, gy - 26, 48, gy, dark, 5.5); leg(56, gy - 26, 62, gy, horse, 5.5);
      ellipse(ctx, 40, gy - 32, 23, 11, lgrad(ctx, 0, gy - 43, 0, gy - 21, [[0, '#fbf7ee'], [1, dark]]));
      // neck & head
      ctx.beginPath(); ctx.moveTo(54, gy - 40); ctx.quadraticCurveTo(60, gy - 50, 64, gy - 60); ctx.lineTo(72, gy - 58); ctx.quadraticCurveTo(66, gy - 46, 62, gy - 34); ctx.closePath(); ctx.fillStyle = horse; ctx.fill();
      ellipse(ctx, 70, gy - 62, 9, 5.5, horse, 0.35); poly(ctx, [[76, gy - 66], [80, gy - 62], [76, gy - 60]], dark);
      poly(ctx, [[66, gy - 66], [68, gy - 73], [71, gy - 66]], horse); circle(ctx, 73, gy - 63, 1.2, '#222');
      // mane & tail
      for (let k = 0; k < 5; k++) line(ctx, 58 + k * 2.5, gy - 60 + k * 4, 54 + k * 2.5, gy - 54 + k * 4, '#d8d0b8', 2);
      ctx.beginPath(); ctx.moveTo(18, gy - 34); ctx.quadraticCurveTo(4, gy - 32, 6, gy - 12); ctx.strokeStyle = '#d8d0b8'; ctx.lineWidth = 4.5; ctx.stroke();
      // saddle cloth
      rrect(ctx, 30, gy - 40, 20, 12, 3, lgrad(ctx, 0, gy - 40, 0, gy - 28, [[0, '#3f7a4a'], [1, '#1f4a2a']]), '#d9a93a', 1);
    } else {
      const wg = '#4e4a48', dk = '#2a2626';
      leg(24, gy - 24, 16, gy, wg, 7); leg(32, gy - 24, 30, gy, dk, 7);
      leg(46, gy - 24, 46, gy, dk, 7); leg(54, gy - 24, 62, gy, wg, 7);
      ellipse(ctx, 40, gy - 33, 26, 13, lgrad(ctx, 0, gy - 46, 0, gy - 20, [[0, '#6a6462'], [1, dk]]));
      for (let k = 0; k < 6; k++) poly(ctx, [[22 + k * 6, gy - 42], [25 + k * 6, gy - 48 + (k % 2) * 2], [28 + k * 6, gy - 42]], '#3a3634');
      ellipse(ctx, 62, gy - 44, 13, 9, wg, 0.2); poly(ctx, [[70, gy - 49], [82, gy - 43], [70, gy - 37]], wg);
      for (let i = 0; i < 4; i++) poly(ctx, [[72 + i * 2.5, gy - 41], [73 + i * 2.5, gy - 36], [75 + i * 2.5, gy - 41]], '#f0f0e0');
      poly(ctx, [[56, gy - 52], [59, gy - 62], [63, gy - 52]], wg); circle(ctx, 66, gy - 46, 2.2, '#ffd040'); circle(ctx, 66.5, gy - 46, 1, '#000');
      ctx.beginPath(); ctx.moveTo(16, gy - 36); ctx.quadraticCurveTo(2, gy - 42, 4, gy - 58); ctx.strokeStyle = wg; ctx.lineWidth = 4.5; ctx.stroke();
      rrect(ctx, 30, gy - 42, 20, 12, 3, lgrad(ctx, 0, gy - 42, 0, gy - 30, [[0, '#6a3a2a'], [1, '#3a1a10']]), '#8a8a8a', 1);
    }
    // rider
    const cloth = faction === 'elves' ? '#2f6a3e' : '#3a2a20';
    const cloak = faction === 'elves' ? '#4a8a5a' : '#5a2a20';
    const skin = faction === 'elves' ? '#f0dcc0' : '#4f7a2a';
    // cloak flowing behind
    ctx.beginPath(); ctx.moveTo(34, gy - 60); ctx.quadraticCurveTo(16, gy - 50, 14, gy - 26); ctx.quadraticCurveTo(26, gy - 32, 36, gy - 38); ctx.closePath();
    ctx.fillStyle = lgrad(ctx, 14, 0, 36, 0, [[0, shade(cloak, 0.6)], [1, cloak]]); ctx.fill();
    line(ctx, 38, gy - 40, 36, gy - 24, cloth, 6); rrect(ctx, 32, gy - 28, 7, 6, 2, '#3a2a1a');
    rrect(ctx, 32, gy - 62, 16, 24, 5, lgrad(ctx, 32, 0, 48, 0, [[0, lighten(cloth, 0.2)], [1, shade(cloth, 0.7)]]));
    if (faction === 'orcs') { line(ctx, 34, gy - 52, 46, gy - 52, '#8a8a8a', 2); line(ctx, 34, gy - 46, 46, gy - 46, '#8a8a8a', 2); }
    else { line(ctx, 40, gy - 60, 40, gy - 40, '#d9a93a', 1.5); }
    circle(ctx, 41, gy - 69, 6.5, skin); circle(ctx, 43.5, gy - 70, 1, '#222');
    if (faction === 'elves') { ctx.beginPath(); ctx.arc(40, gy - 71, 7, Math.PI * 0.95, Math.PI * 2.05); ctx.fillStyle = '#efe0a0'; ctx.fill(); line(ctx, 34, gy - 70, 32, gy - 58, '#efe0a0', 3); circle(ctx, 40, gy - 76, 1.5, '#d9a93a'); }
    else { ctx.beginPath(); ctx.arc(41, gy - 71, 7.2, Math.PI, Math.PI * 2); ctx.fillStyle = lgrad(ctx, 34, 0, 48, 0, [[0, '#6a6a70'], [1, '#2a2a30']]); ctx.fill(); rrect(ctx, 44, gy - 74, 4, 9, 1, '#3a3a40'); poly(ctx, [[36, gy - 78], [38, gy - 86], [40, gy - 78]], '#9a9aa0'); poly(ctx, [[42, gy - 78], [44, gy - 86], [46, gy - 78]], '#9a9aa0'); }
    // banner with wave frames
    line(ctx, 27, gy - 44, 27, gy - 84, '#3a2a1a', 2.2);
    const wave = Math.sin(frame * Math.PI / 2) * 3;
    ctx.beginPath(); ctx.moveTo(27, gy - 84); ctx.quadraticCurveTo(38, gy - 84 + wave, 48, gy - 80 - wave); ctx.quadraticCurveTo(40, gy - 76 + wave * 0.5, 27, gy - 68); ctx.closePath();
    ctx.fillStyle = lgrad(ctx, 27, 0, 48, 0, [[0, lighten(color, 0.3)], [1, shade(color, 0.7)]]); ctx.fill();
    ctx.beginPath(); ctx.moveTo(27, gy - 84); ctx.quadraticCurveTo(38, gy - 84 + wave, 48, gy - 80 - wave); ctx.quadraticCurveTo(38, gy - 80, 27, gy - 76); ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fill();
    circle(ctx, 27, gy - 86, 2, '#d9a93a');
    // weapon
    line(ctx, 46, gy - 50, 60, gy - 64, '#d4d8de', 3); line(ctx, 46, gy - 50, 49, gy - 53, '#3a2a1a', 4);
    ctx.restore();
    return finish(c);
  });
}

export function monsterShadow() {
  return cached('mshadow', () => { const c = mkS(48, 16); const ctx = c.getContext('2d'); softShadow(ctx, 24, 8, 22, 6, 0.4); return c; });
}
