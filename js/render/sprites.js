// Procedural sprite factory for the adventure map: terrain textures, trees,
// mountains, map objects, heroes and towns. Everything is cached.
import { mk, poly, circle, ellipse, rrect, line, lgrad, rgrad, shade, lighten, rgba, mix, art_rng } from './draw.js';
import { T, D, TERRAIN_INFO } from '../data/terrain.js';
import { RES_INFO } from '../data/resources.js';
import { Noise } from '../core/noise.js';

export const TILE = 64;
const cache = new Map();
function cached(key, fn) {
  if (!cache.has(key)) cache.set(key, fn());
  return cache.get(key);
}

// ---------------- Terrain textures ----------------
const texNoise = new Noise(991);
export function tileTexture(t, variant = 0) {
  return cached(`tile:${t}:${variant}`, () => {
    const c = mk(TILE, TILE);
    const ctx = c.getContext('2d');
    const info = TERRAIN_INFO[t];
    const base = info.base;
    const r = art_rng(t * 31 + variant * 7 + 1);
    ctx.fillStyle = base; ctx.fillRect(0, 0, TILE, TILE);
    // noise mottling
    const img = ctx.getImageData(0, 0, TILE, TILE);
    const d = img.data;
    const ox = variant * 64, oy = t * 64;
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      const n = texNoise.fbm((x + ox) / 9, (y + oy) / 9, 3) - 0.5;
      const n2 = texNoise.noise((x + ox) / 3, (y + oy) / 3) - 0.5;
      const f = 1 + n * 0.28 + n2 * 0.1;
      const i = (y * TILE + x) * 4;
      d[i] = Math.min(255, d[i] * f); d[i + 1] = Math.min(255, d[i + 1] * f); d[i + 2] = Math.min(255, d[i + 2] * f);
    }
    ctx.putImageData(img, 0, 0);
    // details per type
    switch (t) {
      case T.GRASS:
        for (let i = 0; i < 26; i++) { const x = r() * TILE, y = r() * TILE; line(ctx, x, y, x + (r() - 0.5) * 4, y - 4 - r() * 4, r() > 0.5 ? lighten(base, 0.25) : shade(base, 0.75), 1); }
        break;
      case T.DIRT:
        for (let i = 0; i < 10; i++) circle(ctx, r() * TILE, r() * TILE, 1 + r() * 1.5, r() > 0.5 ? shade(base, 0.7) : lighten(base, 0.2));
        break;
      case T.ROUGH:
        for (let i = 0; i < 7; i++) { const x = r() * TILE, y = r() * TILE; line(ctx, x, y, x + (r() - 0.5) * 12, y + (r() - 0.5) * 12, shade(base, 0.65), 1); }
        for (let i = 0; i < 8; i++) circle(ctx, r() * TILE, r() * TILE, 1.5 + r() * 2, shade(base, 0.8));
        break;
      case T.SWAMP:
        for (let i = 0; i < 4; i++) ellipse(ctx, r() * TILE, r() * TILE, 5 + r() * 8, 3 + r() * 4, 'rgba(40,70,80,0.55)');
        for (let i = 0; i < 14; i++) { const x = r() * TILE, y = r() * TILE; line(ctx, x, y, x, y - 5 - r() * 5, shade(base, 1.25), 1); }
        break;
      case T.SNOW:
        for (let i = 0; i < 5; i++) ellipse(ctx, r() * TILE, r() * TILE, 6 + r() * 10, 3 + r() * 4, 'rgba(160,190,220,0.25)');
        for (let i = 0; i < 12; i++) circle(ctx, r() * TILE, r() * TILE, 0.8, 'rgba(255,255,255,0.8)');
        break;
      case T.ASH:
        for (let i = 0; i < 6; i++) { const x = r() * TILE, y = r() * TILE; line(ctx, x, y, x + (r() - 0.5) * 14, y + (r() - 0.5) * 14, '#2a2524', 1.2); }
        for (let i = 0; i < 5; i++) circle(ctx, r() * TILE, r() * TILE, 0.9 + r(), r() > 0.5 ? '#c8502a' : '#e08040');
        break;
      case T.WATER:
        for (let i = 0; i < 6; i++) { const x = r() * TILE, y = r() * TILE; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 5, y - 2, x + 10 + r() * 6, y); ctx.strokeStyle = 'rgba(190,220,255,0.35)'; ctx.lineWidth = 1; ctx.stroke(); }
        break;
    }
    return c;
  });
}

// ---------------- Decor sprites ----------------
export function decorSprite(kind, variant = 0) {
  return cached(`decor:${kind}:${variant}`, () => {
    const r = art_rng(kind * 101 + variant * 13 + 5);
    switch (kind) {
      case D.PINE: return pine(r, '#1f5a2e', '#2f7a3e', '#4b3a22');
      case D.SNOWPINE: return pine(r, '#2a4a3a', '#3a6a4a', '#4b3a22', true);
      case D.LEAFY: return leafy(r, '#2e6b2a', '#4c9a3a', '#6b4a2a');
      case D.GOLDEN: return leafy(r, '#b8761c', '#e6b53a', '#7a5a3a', true);
      case D.DEAD: return deadTree(r);
      case D.MOUNTAIN: return mountain(r);
      case D.ROCK: return rock(r);
      case D.FLOWERS: return flowers(r);
      case D.MUSHROOM: return mushrooms(r);
      case D.STUMP: return stump(r);
      case D.REEDS: return reeds(r);
      default: return mk(1, 1);
    }
  });
}
// Sprites are anchored at bottom-centre of a tile: canvas width W, the ground line is at height - 8.
function pine(r, dark, light, trunk, snow = false) {
  const W = 56, H = 84;
  const c = mk(W, H); const ctx = c.getContext('2d');
  const cx = W / 2, gy = H - 8;
  ellipse(ctx, cx, gy, 16, 5, 'rgba(0,0,0,0.25)');
  line(ctx, cx, gy, cx, gy - 20, trunk, 5);
  const layers = 4;
  const h = 58 + r() * 12;
  for (let i = 0; i < layers; i++) {
    const y = gy - 14 - i * (h / layers) * 0.78;
    const w = 24 - i * 5 + r() * 3;
    const hh = h / layers + 8;
    poly(ctx, [[cx - w, y], [cx, y - hh], [cx + w, y]], lgrad(ctx, cx - w, 0, cx + w, 0, [[0, dark], [0.5, light], [1, dark]]));
    if (snow) poly(ctx, [[cx - w * 0.6, y - hh * 0.35], [cx, y - hh], [cx + w * 0.6, y - hh * 0.35], [cx, y - hh * 0.2]], 'rgba(235,245,255,0.85)');
  }
  return c;
}
function leafy(r, dark, light, trunk, golden = false) {
  const W = 60, H = 80;
  const c = mk(W, H); const ctx = c.getContext('2d');
  const cx = W / 2, gy = H - 8;
  ellipse(ctx, cx, gy, 17, 5, 'rgba(0,0,0,0.25)');
  line(ctx, cx, gy, cx + 2, gy - 28, trunk, 6);
  line(ctx, cx + 1, gy - 20, cx - 8, gy - 34, trunk, 3); line(ctx, cx + 1, gy - 22, cx + 10, gy - 36, trunk, 3);
  const blobs = 6 + Math.floor(r() * 3);
  for (let i = 0; i < blobs; i++) {
    const a = (i / blobs) * Math.PI * 2 + r();
    const rad = 10 + r() * 6;
    const x = cx + Math.cos(a) * (10 + r() * 6), y = gy - 44 + Math.sin(a) * (8 + r() * 5);
    circle(ctx, x, y, rad, rgrad(ctx, x - rad * 0.3, y - rad * 0.4, 1, rad, [[0, light], [1, dark]]));
  }
  circle(ctx, cx, gy - 46, 13, rgrad(ctx, cx - 4, gy - 52, 1, 14, [[0, lighten(light, 0.2)], [1, light]]));
  if (golden) for (let i = 0; i < 6; i++) circle(ctx, cx + (r() - 0.5) * 36, gy - 30 - r() * 30, 1.2, '#fff2b0');
  return c;
}
function deadTree(r) {
  const W = 56, H = 76;
  const c = mk(W, H); const ctx = c.getContext('2d');
  const cx = W / 2, gy = H - 8;
  ellipse(ctx, cx, gy, 12, 4, 'rgba(0,0,0,0.25)');
  const col = '#3d3129';
  line(ctx, cx, gy, cx + 2, gy - 34, col, 6);
  const br = (x, y, a, l, w) => { const ex = x + Math.cos(a) * l, ey = y + Math.sin(a) * l; line(ctx, x, y, ex, ey, col, w); return [ex, ey]; };
  let p = br(cx + 1, gy - 26, -Math.PI * 0.75, 18, 3.5); br(p[0], p[1], -Math.PI * 0.9, 10, 2); br(p[0], p[1], -Math.PI * 0.5, 9, 2);
  p = br(cx + 2, gy - 32, -Math.PI * 0.3, 16, 3); br(p[0], p[1], -Math.PI * 0.15, 9, 2); br(p[0], p[1], -Math.PI * 0.6, 10, 2);
  br(cx + 2, gy - 34, -Math.PI * 0.55, 14, 2.5);
  return c;
}
function mountain(r) {
  const W = 96, H = 96;
  const c = mk(W, H); const ctx = c.getContext('2d');
  const gy = H - 8;
  const peaks = 2 + Math.floor(r() * 2);
  for (let i = 0; i < peaks; i++) {
    const px = 20 + r() * 56, ph = 44 + r() * 40, pw = 26 + r() * 18;
    const base = '#6e6a66', lit = '#9a948c', dark = '#4a4644';
    poly(ctx, [[px - pw, gy], [px, gy - ph], [px + pw, gy]], dark);
    poly(ctx, [[px - pw, gy], [px, gy - ph], [px + 3, gy]], lit);
    poly(ctx, [[px, gy - ph], [px + pw, gy], [px + 6, gy]], base);
    if (ph > 60) poly(ctx, [[px - pw * 0.32, gy - ph * 0.62], [px, gy - ph], [px + pw * 0.3, gy - ph * 0.65], [px + pw * 0.12, gy - ph * 0.55], [px - pw * 0.1, gy - ph * 0.6]], '#eef4fa');
  }
  ellipse(ctx, W / 2, gy, 44, 6, 'rgba(0,0,0,0.2)');
  return c;
}
function rock(r) {
  const W = 48, H = 40; const c = mk(W, H); const ctx = c.getContext('2d');
  const gy = H - 8;
  ellipse(ctx, 24, gy, 16, 4, 'rgba(0,0,0,0.25)');
  const n = 1 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const x = 12 + r() * 24, w = 8 + r() * 10, h = 6 + r() * 8;
    poly(ctx, [[x - w, gy], [x - w * 0.7, gy - h * 0.8], [x - w * 0.1, gy - h], [x + w * 0.6, gy - h * 0.7], [x + w, gy]], lgrad(ctx, x - w, 0, x + w, 0, [[0, '#8e8a84'], [1, '#55514d']]));
  }
  return c;
}
function flowers(r) {
  const W = 40, H = 24; const c = mk(W, H); const ctx = c.getContext('2d');
  const cols = ['#f2c94c', '#e86a8a', '#f5f5f5', '#9ab8ff'];
  for (let i = 0; i < 7; i++) { const x = 4 + r() * 32, y = 6 + r() * 12; line(ctx, x, y + 4, x, y, '#3a6a2a', 1); circle(ctx, x, y, 1.8, cols[Math.floor(r() * cols.length)]); }
  return c;
}
function mushrooms(r) {
  const W = 40, H = 28; const c = mk(W, H); const ctx = c.getContext('2d');
  for (let i = 0; i < 3; i++) { const x = 8 + r() * 24, y = 12 + r() * 8, s = 3 + r() * 3; line(ctx, x, y + 4, x, y - s, '#e8dcc0', 2.5); ellipse(ctx, x, y - s, s * 1.4, s * 0.8, '#c0392b'); circle(ctx, x - s * 0.4, y - s - 1, 0.9, '#fff'); }
  return c;
}
function stump(r) {
  const W = 32, H = 28; const c = mk(W, H); const ctx = c.getContext('2d');
  rrect(ctx, 9, 10, 14, 12, 2, '#5a3a22'); ellipse(ctx, 16, 10, 7, 3.5, '#b08a5a'); ellipse(ctx, 16, 10, 4, 2, '#8a6a3a', 0, '#6a4a2a', 0.8);
  return c;
}
function reeds(r) {
  const W = 40, H = 36; const c = mk(W, H); const ctx = c.getContext('2d');
  for (let i = 0; i < 8; i++) { const x = 6 + r() * 28; line(ctx, x, 30, x + (r() - 0.5) * 6, 8 + r() * 8, '#5a7a3a', 1.2); ellipse(ctx, x + (r() - 0.5) * 6, 10 + r() * 6, 1.5, 4, '#6a4a2a'); }
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
        for (let i = 2; i >= 0; i--) { ellipse(ctx, 12, 17 - i * 3, 8, 3.2, info.dark); ellipse(ctx, 12, 16 - i * 3, 8, 3.2, i === 0 ? info.color : info.color, 0, info.dark, 0.8); }
        ellipse(ctx, 12, 10, 8, 3.2, lgrad(ctx, 4, 0, 20, 0, [[0, '#ffe59a'], [1, '#d6a52a']]), 0, info.dark, 0.8);
        break;
      case 'wood':
        for (const [x, y] of [[8, 16], [16, 16], [12, 10]]) { rrect(ctx, x - 7, y - 3, 14, 6, 2, info.dark); circle(ctx, x + 6, y, 3, '#d9b07a', '#8a5a2a', 0.8); }
        break;
      case 'ore':
        poly(ctx, [[3, 20], [7, 10], [12, 13], [16, 6], [21, 20]], lgrad(ctx, 3, 0, 21, 0, [[0, '#b7bec8'], [1, '#5a6068']]), '#3a3f45', 0.8);
        circle(ctx, 14, 14, 1.5, '#ff9f40'); circle(ctx, 9, 16, 1.2, '#ff9f40');
        break;
      case 'mithril':
        poly(ctx, [[12, 3], [20, 10], [16, 21], [8, 21], [4, 10]], lgrad(ctx, 4, 3, 20, 21, [[0, '#ffffff'], [0.5, '#bfe8ff'], [1, '#5f9fc2']]), '#3a6f8a', 0.8);
        line(ctx, 8, 9, 15, 7, 'rgba(255,255,255,0.8)', 1.5);
        break;
      case 'warpstone':
        poly(ctx, [[12, 2], [19, 9], [21, 18], [12, 22], [3, 18], [5, 9]], lgrad(ctx, 3, 2, 21, 22, [[0, '#c9ff9a'], [0.5, '#5fd63a'], [1, '#1e6e14']]), '#0f3f0a', 0.8);
        ctx.shadowColor = '#7dff5e'; ctx.shadowBlur = 4; circle(ctx, 11, 11, 2.5, '#e8ffd0'); ctx.shadowBlur = 0;
        break;
      case 'gems':
        poly(ctx, [[4, 10], [9, 4], [15, 4], [20, 10], [12, 21]], lgrad(ctx, 4, 4, 20, 21, [[0, '#ffd0fa'], [0.5, '#d94fd1'], [1, '#6a1a62']]), '#4a1045', 0.8);
        poly(ctx, [[9, 4], [12, 10], [15, 4]], 'rgba(255,255,255,0.45)');
        break;
    }
    return c;
  });
}

// ---------------- Object sprites ----------------
function flagPole(ctx, x, y, color, h = 26) {
  line(ctx, x, y, x, y - h, '#3a2a1a', 2);
  poly(ctx, [[x, y - h], [x + 14, y - h + 4], [x, y - h + 9]], color);
}
export function objectSprite(o, ownerColor) {
  const key = `obj:${o.type}:${o.res || o.unit || o.artifact || ''}:${o.faction || ''}:${ownerColor || ''}:${o.level || 0}`;
  return cached(key, () => {
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
      default: return mk(1, 1);
    }
  });
}
function mineSprite(res, ownerColor) {
  const W = 72, H = 72; const c = mk(W, H); const ctx = c.getContext('2d');
  const gy = H - 8; const info = RES_INFO[res];
  ellipse(ctx, 36, gy, 30, 7, 'rgba(0,0,0,0.25)');
  if (res === 'wood') {
    rrect(ctx, 10, gy - 30, 44, 30, 2, '#7a5a3a'); poly(ctx, [[6, gy - 30], [32, gy - 48], [58, gy - 30]], '#4a3222');
    for (let i = 0; i < 3; i++) { rrect(ctx, 56, gy - 10 + i * 0, 14, 5, 2, '#8a5a2a'); circle(ctx, 70, gy - 8 + i * 0, 2.5, '#d9b07a'); }
    rrect(ctx, 58, gy - 18, 14, 5, 2, '#8a5a2a'); circle(ctx, 72, gy - 16, 2.5, '#d9b07a');
    circle(ctx, 32, gy - 32, 7, '#b0b0b0', '#555', 1); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; poly(ctx, [[32 + Math.cos(a) * 7, gy - 32 + Math.sin(a) * 7], [32 + Math.cos(a + 0.3) * 9.5, gy - 32 + Math.sin(a + 0.3) * 9.5], [32 + Math.cos(a + 0.5) * 7, gy - 32 + Math.sin(a + 0.5) * 7]], '#b0b0b0'); }
    rrect(ctx, 26, gy - 14, 12, 14, 1, '#2a1a10');
  } else {
    // hillside with mine entrance
    poly(ctx, [[2, gy], [14, gy - 30], [36, gy - 44], [58, gy - 30], [70, gy]], lgrad(ctx, 0, gy - 44, 0, gy, [[0, '#8a8278'], [1, '#5a544c']]));
    poly(ctx, [[24, gy], [24, gy - 18], [36, gy - 26], [48, gy - 18], [48, gy]], '#1b1612');
    line(ctx, 22, gy - 18, 36, gy - 28, '#6b4a2a', 3); line(ctx, 50, gy - 18, 36, gy - 28, '#6b4a2a', 3);
    line(ctx, 22, gy - 18, 22, gy, '#6b4a2a', 3); line(ctx, 50, gy - 18, 50, gy, '#6b4a2a', 3);
    // cart with resource
    rrect(ctx, 52, gy - 10, 16, 8, 1, '#5a3a22'); circle(ctx, 56, gy - 1, 3, '#2a2a2a'); circle(ctx, 64, gy - 1, 3, '#2a2a2a');
    ctx.drawImage(resourceIcon(res, 16), 52, gy - 22);
    circle(ctx, 36, gy - 36, 7, info.color, info.dark, 1.5);
  }
  if (ownerColor) flagPole(ctx, 10, gy - 2, ownerColor, 30);
  return c;
}
function dwellingSprite(unit, ownerColor) {
  const W = 72, H = 76; const c = mk(W, H); const ctx = c.getContext('2d');
  const gy = H - 8;
  ellipse(ctx, 36, gy, 30, 7, 'rgba(0,0,0,0.25)');
  const elf = ['dryad', 'glade_guard', 'eternal_guard', 'wardancer', 'wild_rider', 'great_eagle', 'treeman'].includes(unit);
  const orc = ['goblin', 'orc_boy', 'orc_archer', 'warg_rider', 'black_orc', 'troll', 'giant'].includes(unit);
  if (elf) {
    // tree-house
    line(ctx, 36, gy, 36, gy - 40, '#6b4a2a', 10);
    circle(ctx, 36, gy - 50, 22, rgrad(ctx, 30, gy - 58, 2, 24, [[0, '#8fd36a'], [1, '#2e6b2a']]));
    rrect(ctx, 22, gy - 40, 28, 14, 4, '#d8c9a0', '#8a7a5a', 1); poly(ctx, [[18, gy - 40], [36, gy - 52], [54, gy - 40]], '#a8894a');
    rrect(ctx, 32, gy - 36, 8, 8, 2, '#ffe28a');
  } else if (orc) {
    // spiky hut
    poly(ctx, [[8, gy], [14, gy - 34], [36, gy - 48], [58, gy - 34], [64, gy]], '#4a3a30');
    poly(ctx, [[14, gy - 34], [36, gy - 48], [58, gy - 34], [36, gy - 30]], '#6a5a4a');
    rrect(ctx, 30, gy - 20, 12, 20, 2, '#1a1410');
    for (let i = 0; i < 4; i++) line(ctx, 10 + i * 16, gy, 12 + i * 16, gy - 14 - (i % 2) * 6, '#8a7a6a', 2.5);
    circle(ctx, 36, gy - 54, 5, '#e8e0c8'); circle(ctx, 34, gy - 55, 1.3, '#000'); circle(ctx, 38, gy - 55, 1.3, '#000');
  } else {
    // cave / lair
    poly(ctx, [[4, gy], [12, gy - 26], [36, gy - 40], [60, gy - 26], [68, gy]], lgrad(ctx, 0, gy - 40, 0, gy, [[0, '#7a7068'], [1, '#4a443e']]));
    ellipse(ctx, 36, gy - 4, 16, 18, '#120e0c');
    for (let i = 0; i < 3; i++) poly(ctx, [[24 + i * 10, gy - 20], [27 + i * 10, gy - 12], [30 + i * 10, gy - 20]], '#d8d0c0');
  }
  if (ownerColor) flagPole(ctx, 8, gy - 2, ownerColor, 28);
  return c;
}
function resourcePile(res) {
  const W = 48, H = 40; const c = mk(W, H); const ctx = c.getContext('2d');
  const gy = H - 8;
  ellipse(ctx, 24, gy, 16, 5, 'rgba(0,0,0,0.25)');
  if (res === 'gold') { ctx.drawImage(resourceIcon('gold', 28), 10, gy - 28); for (let i = 0; i < 5; i++) circle(ctx, 8 + i * 8, gy - 2, 3.5, '#f1c75b', '#9a7120', 0.8); }
  else if (res === 'wood') { ctx.drawImage(resourceIcon('wood', 34), 7, gy - 32); }
  else if (res === 'ore') { ctx.drawImage(resourceIcon('ore', 34), 7, gy - 32); }
  else { ctx.drawImage(resourceIcon(res, 26), 11, gy - 28); ctx.drawImage(resourceIcon(res, 16), 2, gy - 16); ctx.drawImage(resourceIcon(res, 14), 30, gy - 14); }
  return c;
}
function chestSprite() {
  const W = 44, H = 36; const c = mk(W, H); const ctx = c.getContext('2d');
  const gy = H - 8;
  ellipse(ctx, 22, gy, 15, 4, 'rgba(0,0,0,0.25)');
  rrect(ctx, 8, gy - 16, 28, 16, 2, '#6b3f1f'); rrect(ctx, 8, gy - 22, 28, 9, 4, '#8a5a2a');
  line(ctx, 8, gy - 13, 36, gy - 13, '#d9a93a', 2); line(ctx, 14, gy - 22, 14, gy, '#d9a93a', 1.5); line(ctx, 30, gy - 22, 30, gy, '#d9a93a', 1.5);
  rrect(ctx, 19, gy - 15, 6, 6, 1, '#ffd766', '#8a6a20', 1);
  return c;
}
function artifactSprite() {
  const W = 44, H = 48; const c = mk(W, H); const ctx = c.getContext('2d');
  const gy = H - 8;
  ellipse(ctx, 22, gy, 14, 4, 'rgba(0,0,0,0.25)');
  rrect(ctx, 12, gy - 10, 20, 10, 2, '#7a7068'); rrect(ctx, 14, gy - 14, 16, 4, 1, '#9a908a');
  ctx.shadowColor = '#ffe9a0'; ctx.shadowBlur = 10;
  poly(ctx, [[22, gy - 36], [30, gy - 24], [22, gy - 14], [14, gy - 24]], lgrad(ctx, 14, gy - 36, 30, gy - 14, [[0, '#fff6d0'], [0.5, '#ffd24a'], [1, '#b8781a']]));
  ctx.shadowBlur = 0;
  return c;
}
function shrineSprite() {
  const W = 56, H = 64; const c = mk(W, H); const ctx = c.getContext('2d');
  const gy = H - 8;
  ellipse(ctx, 28, gy, 22, 5, 'rgba(0,0,0,0.25)');
  rrect(ctx, 8, gy - 44, 10, 44, 2, '#8a8278'); rrect(ctx, 38, gy - 44, 10, 44, 2, '#8a8278');
  ctx.beginPath(); ctx.moveTo(6, gy - 42); ctx.quadraticCurveTo(28, gy - 66, 50, gy - 42); ctx.lineTo(50, gy - 36); ctx.quadraticCurveTo(28, gy - 58, 6, gy - 36); ctx.closePath(); ctx.fillStyle = '#9a928a'; ctx.fill();
  ctx.shadowColor = '#8fd3ff'; ctx.shadowBlur = 10; circle(ctx, 28, gy - 26, 7, '#bfe8ff'); ctx.shadowBlur = 0;
  line(ctx, 24, gy - 30, 32, gy - 22, '#2a5a8a', 1.5); line(ctx, 32, gy - 30, 24, gy - 22, '#2a5a8a', 1.5);
  return c;
}
function runestoneSprite() {
  const W = 40, H = 56; const c = mk(W, H); const ctx = c.getContext('2d');
  const gy = H - 8;
  ellipse(ctx, 20, gy, 14, 4, 'rgba(0,0,0,0.25)');
  poly(ctx, [[8, gy], [10, gy - 40], [20, gy - 48], [30, gy - 40], [32, gy]], lgrad(ctx, 8, 0, 32, 0, [[0, '#8a8278'], [1, '#5a544c']]));
  ctx.strokeStyle = '#7dd3ff'; ctx.lineWidth = 1.6; ctx.shadowColor = '#7dd3ff'; ctx.shadowBlur = 5;
  ctx.beginPath(); ctx.moveTo(16, gy - 36); ctx.lineTo(24, gy - 36); ctx.moveTo(20, gy - 36); ctx.lineTo(20, gy - 14); ctx.moveTo(14, gy - 26); ctx.lineTo(26, gy - 20); ctx.moveTo(26, gy - 26); ctx.lineTo(14, gy - 20); ctx.stroke();
  ctx.shadowBlur = 0;
  return c;
}
function wellSprite() {
  const W = 48, H = 56; const c = mk(W, H); const ctx = c.getContext('2d');
  const gy = H - 8;
  ellipse(ctx, 24, gy, 18, 5, 'rgba(0,0,0,0.25)');
  ellipse(ctx, 24, gy - 8, 16, 7, '#7a7068'); ellipse(ctx, 24, gy - 10, 12, 5, '#2a5a7a');
  rrect(ctx, 8, gy - 18, 32, 10, 2, '#8a8278'); ellipse(ctx, 24, gy - 18, 16, 6, '#a8a098');
  line(ctx, 10, gy - 18, 10, gy - 40, '#5a3a22', 3); line(ctx, 38, gy - 18, 38, gy - 40, '#5a3a22', 3);
  poly(ctx, [[4, gy - 38], [24, gy - 50], [44, gy - 38]], '#6b4a2a');
  circle(ctx, 24, gy - 30, 3, '#5a3a22');
  return c;
}
function wisdomTree() {
  const W = 80, H = 96; const c = mk(W, H); const ctx = c.getContext('2d');
  const gy = H - 8;
  ellipse(ctx, 40, gy, 26, 6, 'rgba(0,0,0,0.25)');
  line(ctx, 40, gy, 40, gy - 40, '#5a3a22', 12);
  line(ctx, 40, gy - 30, 24, gy - 50, '#5a3a22', 6); line(ctx, 40, gy - 32, 58, gy - 52, '#5a3a22', 6);
  for (const [x, y, r] of [[40, gy - 62, 24], [20, gy - 54, 15], [60, gy - 54, 15], [30, gy - 74, 14], [52, gy - 74, 14]]) circle(ctx, x, y, r, rgrad(ctx, x - 4, y - 5, 1, r, [[0, '#a8f0ff'], [1, '#3a9ac0']]));
  ctx.shadowColor = '#e8ffff'; ctx.shadowBlur = 8;
  for (let i = 0; i < 8; i++) circle(ctx, 18 + i * 6.5, gy - 60 + Math.sin(i) * 10, 1.5, '#ffffff');
  ctx.shadowBlur = 0;
  return c;
}
function stablesSprite() {
  const W = 72, H = 60; const c = mk(W, H); const ctx = c.getContext('2d');
  const gy = H - 8;
  ellipse(ctx, 36, gy, 30, 6, 'rgba(0,0,0,0.25)');
  rrect(ctx, 8, gy - 26, 56, 26, 2, '#8a5a2a'); poly(ctx, [[4, gy - 26], [36, gy - 44], [68, gy - 26]], '#5a3a22');
  rrect(ctx, 28, gy - 18, 16, 18, 2, '#2a1a10');
  for (let i = 0; i < 5; i++) line(ctx, 10 + i * 13, gy - 26, 10 + i * 13, gy, '#6b4a2a', 1.5);
  // horse head sign
  ctx.save(); ctx.translate(56, gy - 36); ctx.scale(0.5, 0.5);
  ellipse(ctx, 0, 0, 10, 7, '#e8e0d0', 0.4); poly(ctx, [[8, -4], [20, 0], [8, 5]], '#e8e0d0'); poly(ctx, [[-4, -6], [-2, -14], [2, -6]], '#e8e0d0');
  ctx.restore();
  return c;
}
function towerSprite() {
  const W = 48, H = 96; const c = mk(W, H); const ctx = c.getContext('2d');
  const gy = H - 8;
  ellipse(ctx, 24, gy, 16, 5, 'rgba(0,0,0,0.25)');
  rrect(ctx, 12, gy - 70, 24, 70, 2, lgrad(ctx, 12, 0, 36, 0, [[0, '#9a928a'], [1, '#5a544c']]));
  for (let i = 0; i < 4; i++) rrect(ctx, 10 + i * 7, gy - 78, 5, 8, 1, '#7a726a');
  rrect(ctx, 21, gy - 56, 6, 10, 3, '#1a1410'); rrect(ctx, 21, gy - 30, 6, 10, 3, '#1a1410');
  rrect(ctx, 19, gy - 14, 10, 14, 3, '#1a1410');
  flagPole(ctx, 24, gy - 78, '#c8b060', 16);
  return c;
}
function fountainSprite() {
  const W = 52, H = 52; const c = mk(W, H); const ctx = c.getContext('2d');
  const gy = H - 8;
  ellipse(ctx, 26, gy, 20, 5, 'rgba(0,0,0,0.25)');
  ellipse(ctx, 26, gy - 6, 20, 8, '#8a8278'); ellipse(ctx, 26, gy - 8, 16, 6, '#3a7aa8');
  rrect(ctx, 23, gy - 30, 6, 22, 2, '#9a928a'); ellipse(ctx, 26, gy - 30, 9, 3.5, '#a8a098');
  ctx.strokeStyle = 'rgba(180,230,255,0.9)'; ctx.lineWidth = 1.5;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(26, gy - 34); ctx.quadraticCurveTo(26 + s * 10, gy - 40, 26 + s * 14, gy - 12); ctx.stroke(); }
  ctx.shadowColor = '#ffe9a0'; ctx.shadowBlur = 6; circle(ctx, 26, gy - 36, 2.5, '#ffe9a0'); ctx.shadowBlur = 0;
  return c;
}
function campSprite() {
  const W = 64, H = 52; const c = mk(W, H); const ctx = c.getContext('2d');
  const gy = H - 8;
  ellipse(ctx, 32, gy, 26, 6, 'rgba(0,0,0,0.25)');
  poly(ctx, [[4, gy], [22, gy - 30], [40, gy]], '#c8b89a'); poly(ctx, [[22, gy - 30], [40, gy], [26, gy]], '#8a7a5a');
  line(ctx, 44, gy - 2, 56, gy - 8, '#5a3a22', 3); line(ctx, 44, gy - 8, 56, gy - 2, '#5a3a22', 3);
  ctx.shadowColor = '#ff9a40'; ctx.shadowBlur = 10;
  poly(ctx, [[46, gy - 6], [50, gy - 22], [54, gy - 6]], '#ff9a2a'); poly(ctx, [[48, gy - 6], [50, gy - 16], [52, gy - 6]], '#ffe27a');
  ctx.shadowBlur = 0;
  return c;
}
function windmillSprite() {
  const W = 64, H = 88; const c = mk(W, H); const ctx = c.getContext('2d');
  const gy = H - 8;
  ellipse(ctx, 32, gy, 20, 5, 'rgba(0,0,0,0.25)');
  poly(ctx, [[16, gy], [22, gy - 46], [42, gy - 46], [48, gy]], lgrad(ctx, 16, 0, 48, 0, [[0, '#b8a888'], [1, '#7a6a50']]));
  poly(ctx, [[18, gy - 46], [32, gy - 58], [46, gy - 46]], '#5a3a22');
  rrect(ctx, 28, gy - 14, 8, 14, 2, '#2a1a10');
  ctx.save(); ctx.translate(32, gy - 52);
  for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); rrect(ctx, -2, -30, 4, 30, 1, '#8a7a5a'); rrect(ctx, -7, -30, 12, 20, 1, 'rgba(240,235,220,0.9)', '#8a7a5a', 0.8); }
  ctx.restore(); circle(ctx, 32, gy - 52, 3, '#3a2a1a');
  return c;
}
function ruinSprite() {
  const W = 64, H = 56; const c = mk(W, H); const ctx = c.getContext('2d');
  const gy = H - 8;
  ellipse(ctx, 32, gy, 26, 6, 'rgba(0,0,0,0.25)');
  for (const [x, h] of [[12, 36], [30, 22], [48, 40]]) { rrect(ctx, x - 5, gy - h, 10, h, 2, lgrad(ctx, x - 5, 0, x + 5, 0, [[0, '#a8a098'], [1, '#6a645c']])); rrect(ctx, x - 7, gy - h - 3, 14, 4, 1, '#9a928a'); }
  line(ctx, 7, gy - 38, 44, gy - 44, '#8a8278', 5);
  poly(ctx, [[20, gy], [26, gy - 8], [34, gy - 4], [40, gy]], '#7a726a');
  for (let i = 0; i < 5; i++) line(ctx, 8 + i * 12, gy, 10 + i * 12, gy - 6 - (i % 2) * 4, '#3a6a2a', 1.5);
  return c;
}

// ---------------- Towns ----------------
export function townSprite(faction, fortLevel, ownerColor) {
  return cached(`town:${faction}:${fortLevel}:${ownerColor || ''}`, () => {
    const W = 192, H = 150; const c = mk(W, H); const ctx = c.getContext('2d');
    const gy = H - 8;
    ellipse(ctx, 96, gy, 80, 12, 'rgba(0,0,0,0.3)');
    if (faction === 'elves') {
      // Walls
      if (fortLevel > 0) {
        const wh = 14 + fortLevel * 6;
        rrect(ctx, 18, gy - wh - 8, 156, wh + 8, 6, lgrad(ctx, 0, gy - wh - 8, 0, gy, [[0, '#e8e2cc'], [1, '#a89f86']]));
        for (let i = 0; i < 9; i++) rrect(ctx, 20 + i * 17, gy - wh - 14, 9, 8, 2, '#d8d2bc');
        if (fortLevel >= 2) for (const x of [18, 160]) { rrect(ctx, x, gy - wh - 30, 14, wh + 30, 4, '#d8d2bc'); poly(ctx, [[x - 3, gy - wh - 30], [x + 7, gy - wh - 46], [x + 17, gy - wh - 30]], '#7fb07a'); }
      }
      // Great tree
      line(ctx, 96, gy - 6, 96, gy - 70, '#6b4a2a', 22);
      line(ctx, 90, gy - 50, 60, gy - 80, '#6b4a2a', 9); line(ctx, 102, gy - 56, 134, gy - 84, '#6b4a2a', 9);
      for (const [x, y, r] of [[96, gy - 100, 44], [56, gy - 86, 26], [138, gy - 90, 28], [76, gy - 118, 22], [118, gy - 120, 22]]) circle(ctx, x, y, r, rgrad(ctx, x - r * 0.3, y - r * 0.4, 2, r, [[0, '#f3d87a'], [0.6, '#d9a93a'], [1, '#8a6a2a']]));
      for (let i = 0; i < 12; i++) circle(ctx, 56 + ((i * 37) % 80), gy - 80 - ((i * 23) % 50), 1.5, '#fff5c0');
      // Platforms / halls in tree
      rrect(ctx, 70, gy - 78, 52, 16, 6, '#efe6cc', '#a89f86', 1); poly(ctx, [[66, gy - 78], [96, gy - 94], [126, gy - 78]], '#c8b070');
      rrect(ctx, 86, gy - 74, 8, 8, 2, '#ffe28a'); rrect(ctx, 100, gy - 74, 8, 8, 2, '#ffe28a');
      rrect(ctx, 40, gy - 40, 30, 28, 4, '#efe6cc', '#a89f86', 1); poly(ctx, [[36, gy - 40], [55, gy - 56], [74, gy - 40]], '#c8b070');
      rrect(ctx, 122, gy - 40, 30, 28, 4, '#efe6cc', '#a89f86', 1); poly(ctx, [[118, gy - 40], [137, gy - 56], [156, gy - 40]], '#c8b070');
      rrect(ctx, 84, gy - 26, 24, 20, 6, '#1a2a1a'); // gate
      ctx.beginPath(); ctx.arc(96, gy - 26, 12, Math.PI, 0); ctx.fillStyle = '#1a2a1a'; ctx.fill();
    } else {
      // Orc fortress: spiky palisade / black iron
      const wh = 16 + fortLevel * 8;
      const wallCol = fortLevel >= 3 ? '#2a2a30' : fortLevel >= 2 ? '#4a4040' : '#5a4a3a';
      rrect(ctx, 14, gy - wh - 8, 164, wh + 8, 3, lgrad(ctx, 0, gy - wh - 8, 0, gy, [[0, lighten(wallCol, 0.25)], [1, wallCol]]));
      for (let i = 0; i < 14; i++) poly(ctx, [[16 + i * 12, gy - wh - 8], [21 + i * 12, gy - wh - 20 - (i % 2) * 5], [26 + i * 12, gy - wh - 8]], wallCol);
      // towers
      for (const x of [26, 166]) { rrect(ctx, x - 12, gy - wh - 36, 24, wh + 36, 3, shade(wallCol, 0.9)); for (let k = 0; k < 3; k++) poly(ctx, [[x - 12 + k * 9, gy - wh - 36], [x - 8 + k * 9, gy - wh - 46], [x - 4 + k * 9, gy - wh - 36]], wallCol); }
      // keep
      rrect(ctx, 60, gy - 88, 72, 70, 4, lgrad(ctx, 60, 0, 132, 0, [[0, '#5a5048'], [1, '#2a2420']]));
      poly(ctx, [[54, gy - 88], [96, gy - 124], [138, gy - 88]], '#3a2a20');
      for (let k = 0; k < 5; k++) line(ctx, 66 + k * 15, gy - 90, 70 + k * 15, gy - 112 - (k % 2) * 8, '#1a1410', 3);
      rrect(ctx, 86, gy - 76, 20, 14, 2, '#ff8a2a'); rrect(ctx, 88, gy - 74, 16, 10, 2, '#ffd27a');
      // skull banners
      for (const x of [48, 144]) { line(ctx, x, gy - 20, x, gy - 70, '#3a2a1a', 2); poly(ctx, [[x, gy - 70], [x + 18, gy - 64], [x, gy - 50]], '#8a1a1a'); circle(ctx, x + 7, gy - 61, 3, '#e8e0c8'); }
      // gate
      rrect(ctx, 80, gy - 30, 32, 24, 3, '#120e0c'); for (let k = 0; k < 4; k++) line(ctx, 84 + k * 8, gy - 30, 84 + k * 8, gy - 6, '#3a3a3a', 1.5);
      // smoke
      for (let k = 0; k < 4; k++) circle(ctx, 110 + k * 6, gy - 128 - k * 8, 6 + k * 2, `rgba(80,80,80,${0.35 - k * 0.07})`);
    }
    if (ownerColor) { flagPole(ctx, 96, gy - (faction === 'elves' ? 94 : 124), ownerColor, 26); }
    return c;
  });
}

// ---------------- Heroes ----------------
export function heroSprite(faction, color, flip = false) {
  return cached(`hero:${faction}:${color}:${flip ? 1 : 0}`, () => {
    const W = 72, H = 80; const c = mk(W, H); const ctx = c.getContext('2d');
    ctx.save();
    if (flip) { ctx.translate(W, 0); ctx.scale(-1, 1); }
    const gy = H - 8;
    ellipse(ctx, 36, gy, 24, 6, 'rgba(0,0,0,0.3)');
    if (faction === 'elves') {
      const horse = '#e8e0d0';
      line(ctx, 22, gy - 24, 18, gy, horse, 5); line(ctx, 30, gy - 24, 28, gy, shade(horse, 0.85), 5);
      line(ctx, 44, gy - 24, 44, gy, shade(horse, 0.85), 5); line(ctx, 52, gy - 24, 58, gy, horse, 5);
      ellipse(ctx, 38, gy - 30, 22, 10, horse);
      line(ctx, 54, gy - 36, 62, gy - 54, horse, 8); ellipse(ctx, 64, gy - 58, 8, 5, horse, 0.3);
      line(ctx, 58, gy - 60, 50, gy - 50, '#d8d0b8', 3);
      ctx.beginPath(); ctx.moveTo(18, gy - 32); ctx.quadraticCurveTo(6, gy - 30, 8, gy - 14); ctx.strokeStyle = '#d8d0b8'; ctx.lineWidth = 4; ctx.stroke();
    } else {
      const wg = '#4a4a4a';
      line(ctx, 22, gy - 24, 16, gy, wg, 6); line(ctx, 30, gy - 24, 28, gy, shade(wg, 0.8), 6);
      line(ctx, 44, gy - 24, 44, gy, shade(wg, 0.8), 6); line(ctx, 52, gy - 24, 60, gy, wg, 6);
      ellipse(ctx, 38, gy - 32, 24, 12, wg);
      ellipse(ctx, 60, gy - 42, 12, 8, wg, 0.2); poly(ctx, [[68, gy - 46], [78, gy - 40], [68, gy - 35]], wg);
      poly(ctx, [[54, gy - 50], [57, gy - 60], [61, gy - 50]], wg); circle(ctx, 63, gy - 44, 2, '#ffd040');
      ctx.beginPath(); ctx.moveTo(16, gy - 34); ctx.quadraticCurveTo(2, gy - 40, 4, gy - 54); ctx.strokeStyle = wg; ctx.lineWidth = 4; ctx.stroke();
    }
    // rider
    const cloth = faction === 'elves' ? '#2f5d3a' : '#3a2a20';
    const skin = faction === 'elves' ? '#f0dcc0' : '#4f7a2a';
    line(ctx, 36, gy - 38, 34, gy - 22, cloth, 6);
    rrect(ctx, 30, gy - 58, 14, 22, 4, cloth);
    poly(ctx, [[30, gy - 58], [20, gy - 30], [32, gy - 36]], shade(cloth, 0.8));
    circle(ctx, 38, gy - 64, 6, skin);
    if (faction === 'elves') { ctx.beginPath(); ctx.arc(37, gy - 66, 6.5, Math.PI, Math.PI * 2); ctx.fillStyle = '#e8d890'; ctx.fill(); }
    else { ctx.beginPath(); ctx.arc(38, gy - 66, 6.5, Math.PI, Math.PI * 2); ctx.fillStyle = '#3a3a3a'; ctx.fill(); rrect(ctx, 41, gy - 68, 4, 8, 1, '#3a3a3a'); }
    // banner
    line(ctx, 26, gy - 40, 26, gy - 76, '#3a2a1a', 2);
    poly(ctx, [[26, gy - 76], [44, gy - 72], [26, gy - 62]], color);
    poly(ctx, [[26, gy - 76], [44, gy - 72], [26, gy - 70]], 'rgba(255,255,255,0.18)');
    // weapon
    line(ctx, 44, gy - 48, 56, gy - 60, '#c9ccd2', 3);
    ctx.restore();
    return c;
  });
}

export function monsterShadow() {
  return cached('mshadow', () => { const c = mk(48, 16); const ctx = c.getContext('2d'); ellipse(ctx, 24, 8, 22, 6, 'rgba(0,0,0,0.3)'); return c; });
}
