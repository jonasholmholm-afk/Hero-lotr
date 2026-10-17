// Adventure map renderer: chunk-cached terrain, y-sorted sprites, cloudy fog of
// war, ambient particles and simple animations.
import { TILE, tileTexture, terrainSheet, drawTileDetails, decorSprite, objectSprite, townSprite, heroSprite } from './sprites.js';
import { figure } from './figures.js';
import { mk, circle, line, rrect, ellipse, rgba, blit, glow } from './draw.js';
import { T, D, DECOR_BLOCKS, TERRAIN_INFO } from '../data/terrain.js';
import { UNITS } from '../data/units.js';
import { OBJ } from '../data/objects.js';
import { fortLevel } from '../game/town.js';
import { clamp, fmtMove } from '../core/utils.js';
import { getSetting } from '../game/settings.js';
import { Noise } from '../core/noise.js';

const CHUNK = 10; // tiles per chunk side
const MARGIN = 2; // extra tiles rendered around each chunk (cropped away when drawn)
const PRIORITY = [T.SNOW, T.SWAMP, T.ROUGH, T.ASH, T.DIRT, T.GRASS];
const PASSABLE_DECOR = new Set([D.FLOWERS, D.MUSHROOM, D.STUMP, D.REEDS, D.BUSH, D.PEBBLES]);
const worldNoise = new Noise(4242);
const MAX_CHUNKS = 24;
const silCache = new WeakMap();
function silhouette(sp) {
  let c = silCache.get(sp);
  if (c) return c;
  c = mk(sp.width, sp.height); c.lw = sp.lw; c.lh = sp.lh;
  const x = c.getContext('2d');
  x.drawImage(sp, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height);
  silCache.set(sp, c);
  return c;
}

export class AdventureRenderer {
  constructor(canvas, state) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.s = state;
    this.cam = { x: 0, y: 0, zoom: 1 };
    this.chunks = new Map();
    this.fogMask = null;
    this.fogDirty = true;
    this.selected = null;
    this.path = null;
    this.heroAnim = new Map();
    this.heroFacing = new Map();
    this.particles = [];
    this.time = 0;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.CS = Math.min(1.5, this.dpr); // chunk render scale
    this.minZoom = 0.45; this.maxZoom = 3.2;
    this.highlight = getSetting('highlight') === true;
    this.fogTex = this.makeFogTexture();
    this.resize();
  }
  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.w = Math.max(1, Math.round(r.width));
    this.h = Math.max(1, Math.round(r.height));
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.fogView = null;
  }
  invalidateAll() { this.chunks.clear(); this.fogDirty = true; }
  invalidateFog() { this.fogDirty = true; }
  invalidateTile(x, y) { this.chunks.delete(`${Math.floor(x / CHUNK)},${Math.floor(y / CHUNK)}`); }

  // ---------- Camera ----------
  centerOn(tx, ty) {
    this.cam.x = (tx + 0.5) * TILE - this.w / 2 / this.cam.zoom;
    this.cam.y = (ty + 0.5) * TILE - this.h / 2 / this.cam.zoom;
    this.clampCam();
  }
  clampCam() {
    const m = this.s.map;
    const vw = this.w / this.cam.zoom, vh = this.h / this.cam.zoom;
    this.cam.x = clamp(this.cam.x, -TILE, m.w * TILE - vw + TILE);
    this.cam.y = clamp(this.cam.y, -TILE, m.h * TILE - vh + TILE);
    if (m.w * TILE < vw) this.cam.x = (m.w * TILE - vw) / 2;
    if (m.h * TILE < vh) this.cam.y = (m.h * TILE - vh) / 2;
  }
  screenToWorld(sx, sy) { return [sx / this.cam.zoom + this.cam.x, sy / this.cam.zoom + this.cam.y]; }
  screenToTile(sx, sy) { const [wx, wy] = this.screenToWorld(sx, sy); return [Math.floor(wx / TILE), Math.floor(wy / TILE)]; }
  worldToScreen(wx, wy) { return [(wx - this.cam.x) * this.cam.zoom, (wy - this.cam.y) * this.cam.zoom]; }
  zoomAt(sx, sy, factor) {
    const [wx, wy] = this.screenToWorld(sx, sy);
    this.cam.zoom = clamp(this.cam.zoom * factor, this.minZoom, this.maxZoom);
    this.cam.x = wx - sx / this.cam.zoom;
    this.cam.y = wy - sy / this.cam.zoom;
    this.clampCam();
  }

  // ---------- Chunk rendering ----------
  chunk(cx, cy) {
    const key = `${cx},${cy}`;
    let c = this.chunks.get(key);
    if (c) { this.chunks.delete(key); this.chunks.set(key, c); return c; }
    if (this.chunks.size >= MAX_CHUNKS) this.chunks.delete(this.chunks.keys().next().value);
    const m = this.s.map;
    const CS = this.CS, TS = TILE * CS, texPx = Math.round(TS);
    const n = CHUNK + MARGIN * 2;
    c = mk(Math.round(n * TS), Math.round(n * TS));
    c.lw = n * TILE; c.lh = n * TILE; c.TS = TS;
    const ctx = c.getContext('2d');
    const x0 = cx * CHUNK - MARGIN, y0 = cy * CHUNK - MARGIN;
    const tAt = (x, y) => (x < 0 || y < 0 || x >= m.w || y >= m.h ? -1 : m.terrain[y * m.w + x]);
    const hash = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;
    const patterns = {};
    const sheets = {};
    const sheet = (t) => (t in sheets ? sheets[t] : (sheets[t] = terrainSheet(t, texPx)));
    const pattern = (t) => {
      if (patterns[t]) return patterns[t];
      const sh = sheet(t);
      const p = ctx.createPattern(sh || tileTexture(t, texPx), 'repeat');
      // align the 4x4-tile sheet with world tile coordinates
      if (sh && p.setTransform) p.setTransform(new DOMMatrix().translate(-(x0 & 3) * TS, -(y0 & 3) * TS).scale(TS / texPx));
      return (patterns[t] = p);
    };
    // base squares
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = x0 + i, y = y0 + j; const t = tAt(x, y);
      if (t < 0) { ctx.fillStyle = '#07090d'; ctx.fillRect(i * TS, j * TS, TS + 1, TS + 1); continue; }
      const sh = sheet(t);
      if (sh) ctx.drawImage(sh, (x & 3) * texPx, (y & 3) * texPx, texPx, texPx, i * TS, j * TS, TS + 0.5, TS + 0.5);
      else ctx.drawImage(tileTexture(t, texPx), i * TS, j * TS, TS + 0.5, TS + 0.5);
    }
    const blobPath = (i, j, h, r1, r2) => {
      const cxp = i * TS + TS / 2, cyp = j * TS + TS / 2;
      ctx.beginPath();
      ctx.arc(cxp + ((h & 7) - 3.5) * 1.5 * CS, cyp + (((h >> 3) & 7) - 3.5) * 1.5 * CS, TS * r1, 0, Math.PI * 2);
      ctx.arc(cxp + ((h >> 6 & 7) - 3.5) * 4 * CS, cyp + (((h >> 9) & 7) - 3.5) * 4 * CS, TS * r2, 0, Math.PI * 2);
    };
    // shoreline rims
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = x0 + i, y = y0 + j; const t = tAt(x, y);
      if (t <= 0) continue;
      let nearWater = false;
      for (let dy = -1; dy <= 1 && !nearWater; dy++) for (let dx = -1; dx <= 1; dx++) if (tAt(x + dx, y + dy) === T.WATER) { nearWater = true; break; }
      if (!nearWater) continue;
      const h = hash(x, y);
      ctx.fillStyle = 'rgba(160,210,235,0.3)'; blobPath(i, j, h, 0.8, 0.68); ctx.fill();
      ctx.fillStyle = t === T.SNOW ? 'rgba(205,225,240,0.95)' : t === T.SWAMP ? 'rgba(96,116,74,0.95)' : 'rgba(214,198,156,0.95)';
      blobPath(i, j, h, 0.72, 0.6); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; blobPath(i, j, h, 0.74, 0.62); ctx.fill();
    }
    // organic blobs in priority order: shadows, then highlight rims, then fills
    const edgeTiles = (pt) => {
      const out = [];
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const x = x0 + i, y = y0 + j; if (tAt(x, y) !== pt) continue;
        let interior = true;
        for (let dy = -1; dy <= 1 && interior; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && tAt(x + dx, y + dy) !== pt) { interior = false; break; }
        if (!interior) out.push([i, j, hash(x, y)]);
      }
      return out;
    };
    for (const pt of PRIORITY) {
      const tiles = edgeTiles(pt);
      if (!tiles.length) continue;
      ctx.save(); ctx.translate(2 * CS, 3 * CS); ctx.fillStyle = 'rgba(0,0,0,0.22)';
      for (const [i, j, h] of tiles) { blobPath(i, j, h, 0.62, 0.5); ctx.fill(); }
      ctx.restore();
      ctx.save(); ctx.fillStyle = 'rgba(255,255,230,0.09)';
      for (const [i, j, h] of tiles) { blobPath(i, j, h, 0.65, 0.53); ctx.fill(); }
      ctx.restore();
      // fill every tile of this terrain (also interior ones) so shadows never show inside
      ctx.save(); ctx.fillStyle = pattern(pt);
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const x = x0 + i, y = y0 + j; if (tAt(x, y) !== pt) continue;
        blobPath(i, j, hash(x, y), 0.62, 0.5); ctx.fill();
        ctx.fillRect(i * TS + TS * 0.2, j * TS + TS * 0.2, TS * 0.6, TS * 0.6);
      }
      ctx.restore();
    }
    // per-tile hand-drawn details (never repeat)
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = x0 + i, y = y0 + j; const t = tAt(x, y);
      if (t < 0) continue;
      if (!sheet(t)) drawTileDetails(ctx, t, i * TS, j * TS, TS, hash(x, y));
    }
    // roads: each tile draws its own half-segments as smooth curves through a jittered centre
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const roadAt = (x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h && m.road[y * m.w + x];
    const allLinks = (x, y) => {
      const out = [];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        if (!roadAt(x + dx, y + dy)) continue;
        if (dx && dy && roadAt(x + dx, y) && roadAt(x, y + dy)) continue; // diagonal already covered by the two orthogonals
        out.push([dx, dy]);
      }
      return out;
    };
    const jit = (x, y) => { const h = hash(x, y); return [((h & 7) - 3.5) * 0.9 * CS, (((h >> 3) & 7) - 3.5) * 0.9 * CS]; };
    const roadPath = new Path2D();
    const roadTiles = [];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = x0 + i, y = y0 + j;
      if (!roadAt(x, y)) continue;
      const [jx, jy] = jit(x, y);
      const cxp = i * TS + TS / 2 + jx, cyp = j * TS + TS / 2 + jy;
      const L = allLinks(x, y);
      const mids = L.map(([dx, dy]) => { const [jx2, jy2] = jit(x + dx, y + dy); return [(cxp + i * TS + TS / 2 + dx * TS + jx2) / 2, (cyp + j * TS + TS / 2 + dy * TS + jy2) / 2]; });
      roadTiles.push([cxp, cyp, mids.length]);
      if (mids.length === 2) { roadPath.moveTo(mids[0][0], mids[0][1]); roadPath.quadraticCurveTo(cxp, cyp, mids[1][0], mids[1][1]); }
      else if (mids.length === 1) { roadPath.moveTo(cxp, cyp); roadPath.lineTo(mids[0][0], mids[0][1]); }
      else if (mids.length >= 3) {
        // pair opposite-ish links into smooth curves, remaining ones as spokes
        const used = new Set();
        for (let a = 0; a < mids.length; a++) {
          if (used.has(a)) continue;
          let best = -1, bd = -2;
          for (let b2 = a + 1; b2 < mids.length; b2++) { if (used.has(b2)) continue; const d = -(L[a][0] * L[b2][0] + L[a][1] * L[b2][1]) / (Math.hypot(...L[a]) * Math.hypot(...L[b2])); if (d > bd) { bd = d; best = b2; } }
          if (best >= 0 && bd > 0.3) { used.add(a); used.add(best); roadPath.moveTo(mids[a][0], mids[a][1]); roadPath.quadraticCurveTo(cxp, cyp, mids[best][0], mids[best][1]); }
          else { used.add(a); roadPath.moveTo(cxp, cyp); roadPath.lineTo(mids[a][0], mids[a][1]); }
        }
      } else { roadPath.moveTo(cxp, cyp); roadPath.lineTo(cxp + 0.1, cyp); }
    }
    if (roadTiles.length) {
      // trodden earth that fades into the ground: no hard edges, low contrast
      const W = 8.5 * CS;
      const dirt = pattern(T.DIRT);
      const stroke = (style, w, alpha = 1) => { ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = style; ctx.lineWidth = w; ctx.stroke(roadPath); ctx.restore(); };
      stroke(dirt, W + 6 * CS, 0.16);                 // feathered verge
      stroke(dirt, W + 3 * CS, 0.22);
      stroke(dirt, W, 0.55);                          // packed earth
      stroke('rgba(120,96,64,1)', W, 0.16);           // a little warmth
      stroke('rgba(60,45,30,1)', W * 0.5, 0.14);      // faint wheel ruts
      stroke(dirt, W * 0.5 - 2.4 * CS, 0.35);
      stroke('rgba(255,240,210,1)', W * 0.5 - 2.4 * CS, 0.06);
      // sparse pebbles and grass creeping in from the sides
      for (const [cxp, cyp] of roadTiles) {
        const h = hash(Math.round(cxp), Math.round(cyp));
        for (let k = 0; k < 3; k++) {
          const a = ((h >> (k * 4)) & 15) / 15 * Math.PI * 2, r = W * 0.3 + ((h >> (k * 3 + 1)) & 3) * CS;
          const px = cxp + Math.cos(a) * r, py = cyp + Math.sin(a) * r * 0.9;
          if (k === 0) circle(ctx, px, py, 1.1 * CS, 'rgba(90,72,50,0.35)');
          else circle(ctx, px, py, 1.4 * CS, 'rgba(96,128,52,0.28)');
        }
      }
    }
    // large-scale tonal variation (hills & light) to break up the tile grid
    {
      const lo = mk(n * 4, n * 4);
      const lctx = lo.getContext('2d');
      const img = lctx.createImageData(n * 4, n * 4);
      for (let j = 0; j < n * 4; j++) for (let i = 0; i < n * 4; i++) {
        const v = worldNoise.fbm((x0 + i / 4) / 5, (y0 + j / 4) / 5, 2);
        const k = (j * n * 4 + i) * 4;
        const dark = v < 0.5;
        img.data[k] = dark ? 0 : 255; img.data[k + 1] = dark ? 0 : 240; img.data[k + 2] = dark ? 10 : 200;
        img.data[k + 3] = Math.round(Math.abs(v - 0.5) * 2 * 80);
      }
      lctx.putImageData(img, 0, 0);
      ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.imageSmoothingEnabled = true;
      ctx.drawImage(lo, 0, 0, n * TS, n * TS);
      ctx.restore();
    }
    // passable decor baked in
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = x0 + i, y = y0 + j;
      if (x < 0 || y < 0 || x >= m.w || y >= m.h) continue;
      const d = m.decor[y * m.w + x];
      if (!d || !PASSABLE_DECOR.has(d)) continue;
      const sp = decorSprite(d, (x * 3 + y * 5) & 3);
      ctx.drawImage(sp, (i * TILE + TILE / 2 - sp.lw / 2) * CS, (j * TILE + TILE - sp.lh + 4) * CS, sp.lw * CS, sp.lh * CS);
    }
    this.chunks.set(key, c);
    return c;
  }

  // ---------- Fog ----------
  makeFogTexture() {
    const S = 256; const c = mk(S, S); const ctx = c.getContext('2d');
    const img = ctx.createImageData(S, S); const nz = new Noise(777);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      // tileable-ish by blending across the seam
      const v = nz.fbm(x / 40, y / 40, 4) * 0.7 + nz.fbm((S - x) / 40, (S - y) / 40, 4) * 0.3;
      const i = (y * S + x) * 4;
      const l = 6 + v * 26;
      img.data[i] = l; img.data[i + 1] = l + 3; img.data[i + 2] = l + 10; img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }
  fogMaskCanvas(p) {
    const m = this.s.map;
    const R = 2; // mask pixels per tile
    if (!this.fogMask) this.fogMask = mk(m.w * R, m.h * R);
    const ctx = this.fogMask.getContext('2d');
    const img = ctx.createImageData(m.w * R, m.h * R);
    const d = img.data;
    for (let y = 0; y < m.h * R; y++) for (let x = 0; x < m.w * R; x++) {
      const tx = Math.floor(x / R), ty = Math.floor(y / R);
      const seen = p.fog[ty * m.w + tx];
      const i = (y * m.w * R + x) * 4;
      d[i] = 0; d[i + 1] = 0; d[i + 2] = 0; d[i + 3] = seen ? 0 : 255;
    }
    ctx.putImageData(img, 0, 0);
    return this.fogMask;
  }
  /** Full-map cloudy fog composite, rebuilt only when exploration changes. */
  fogComposite(p) {
    const m = this.s.map;
    const R = 10; // pixels per tile
    if (!this.fogComp) this.fogComp = mk(m.w * R, m.h * R);
    if (this.fogDirty) {
      const fc = this.fogComp.getContext('2d');
      fc.setTransform(1, 0, 0, 1, 0, 0);
      fc.globalCompositeOperation = 'source-over';
      fc.clearRect(0, 0, this.fogComp.width, this.fogComp.height);
      const pat = fc.createPattern(this.fogTex, 'repeat');
      fc.save(); fc.scale(R / 32, R / 32); fc.fillStyle = pat; fc.fillRect(0, 0, m.w * 32, m.h * 32); fc.restore();
      fc.globalCompositeOperation = 'destination-in';
      fc.imageSmoothingEnabled = true;
      fc.drawImage(this.fogMaskCanvas(p), 0, 0, m.w * R, m.h * R);
      fc.globalCompositeOperation = 'source-over';
      this.fogDirty = false;
    }
    return { c: this.fogComp, R };
  }
  drawFog(p) {
    const { ctx, cam } = this;
    const { c, R } = this.fogComposite(p);
    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    const k = R / TILE;
    ctx.drawImage(c, cam.x * k, cam.y * k, (this.w / cam.zoom) * k, (this.h / cam.zoom) * k, 0, 0, this.w, this.h);
    ctx.restore();
  }

  /** Directional cast shadow (sun top-left) for a sprite whose base is at (bx, by). */
  castShadow(sp, bx, by, alpha = 0.3, len = 0.42) {
    const { ctx } = this;
    const sil = silhouette(sp);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.transform(1, 0, -0.75, -len, bx, by);
    ctx.drawImage(sil, -sp.lw / 2, -(sp.lh - 8), sp.lw, sp.lh);
    ctx.restore();
  }
  drawCloudShadows() {
    const { ctx, cam } = this; const m = this.s.map;
    const W = m.w * TILE, H = m.h * TILE; const t = this.time;
    ctx.save(); ctx.globalCompositeOperation = 'multiply';
    for (let k = 0; k < 5; k++) {
      const sp = 9 + k * 2.3;
      const x = ((k * 1370 + t * sp) % (W + 1200)) - 600;
      const y = ((k * 890 + t * sp * 0.35) % (H + 800)) - 400;
      const rx = 260 + k * 70, ry = 150 + k * 40;
      if (x + rx < cam.x || x - rx > cam.x + this.w / cam.zoom || y + ry < cam.y || y - ry > cam.y + this.h / cam.zoom) continue;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
      g.addColorStop(0, 'rgba(150,158,175,1)'); g.addColorStop(0.55, 'rgba(190,196,208,1)'); g.addColorStop(1, 'rgba(255,255,255,1)');
      ctx.fillStyle = g;
      ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx); ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    ctx.restore();
  }
  updateBirds(dt) {
    const { cam } = this;
    if (!this.flock && Math.random() < dt / 18) {
      const dir = Math.random() < 0.5 ? 1 : -1;
      const y0 = cam.y + 40 + Math.random() * (this.h / cam.zoom * 0.6);
      this.flock = { x: dir > 0 ? cam.x - 200 : cam.x + this.w / cam.zoom + 200, y: y0, dir, n: 5 + Math.floor(Math.random() * 5), t: 0, speed: 90 + Math.random() * 40 };
    }
    if (this.flock) {
      const f = this.flock; f.t += dt; f.x += f.dir * f.speed * dt; f.y += Math.sin(f.t * 0.7) * 6 * dt;
      if (f.t > 40 || f.x < cam.x - 600 || f.x > cam.x + this.w / cam.zoom + 600) this.flock = null;
    }
  }
  drawBirds() {
    const f = this.flock; if (!f) return;
    const { ctx } = this;
    ctx.strokeStyle = 'rgba(20,18,16,0.85)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    for (let i = 0; i < f.n; i++) {
      const k = i - (f.n - 1) / 2;
      const bx = f.x - f.dir * Math.abs(k) * 16, by = f.y + Math.abs(k) * 9 + Math.sin(f.t * 3 + i) * 2;
      const flap = Math.sin(f.t * 9 + i * 1.3) * 3;
      ctx.beginPath(); ctx.moveTo(bx - 6, by - flap); ctx.quadraticCurveTo(bx - 2, by + 1, bx, by); ctx.quadraticCurveTo(bx + 2, by + 1, bx + 6, by - flap); ctx.stroke();
      // ground shadow of the bird far below
      ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.beginPath(); ctx.ellipse(bx + 40, by + 90, 5, 2, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ---------- Hero animation ----------
  /** mode: 'single' (ease in+out), 'first' (ease in), 'mid' (constant speed), 'last' (ease out). */
  animateHero(hero, fx, fy, tx, ty, dur, mode = 'single') {
    this.heroAnim.set(hero.id, { fx, fy, tx, ty, t0: performance.now(), dur, mode, lastDust: 0 });
    if (tx !== fx) this.heroFacing.set(hero.id, tx < fx);
    return new Promise((r) => setTimeout(r, dur));
  }
  heroPos(h) {
    const a = this.heroAnim.get(h.id);
    if (!a) return [h.x, h.y];
    const t = clamp((performance.now() - a.t0) / a.dur, 0, 1);
    if (t >= 1) { this.heroAnim.delete(h.id); return [h.x, h.y]; }
    let e = t;
    if (a.mode === 'single') e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    else if (a.mode === 'first') e = t * t * (2 - t) * 0.5 + t * 0.5;
    else if (a.mode === 'last') e = 1 - (1 - t) * (1 - t) * 0.6 - (1 - t) * 0.4;
    return [a.fx + (a.tx - a.fx) * e, a.fy + (a.ty - a.fy) * e, t];
  }
  /** Dust kicked up by a riding hero. */
  spawnDust(x, y, dir) {
    this.dust = this.dust || [];
    for (let k = 0; k < 3; k++) this.dust.push({ x: x - dir * (4 + k * 4) + (Math.random() - 0.5) * 6, y: y + (Math.random() - 0.5) * 4, r: 3 + Math.random() * 3, vx: -dir * (10 + Math.random() * 14), vy: -6 - Math.random() * 8, age: 0, life: 0.5 + Math.random() * 0.25 });
  }
  drawDust(dt) {
    if (!this.dust || !this.dust.length) return;
    const { ctx } = this;
    for (const d of this.dust) {
      d.age += dt; d.x += d.vx * dt; d.y += d.vy * dt; d.vx *= 0.96;
      const t = d.age / d.life; if (t >= 1) { d.dead = true; continue; }
      ctx.fillStyle = `rgba(214,196,160,${0.45 * (1 - t)})`;
      ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r * (1 + t * 1.6), d.r * (0.7 + t * 0.9), 0, 0, Math.PI * 2); ctx.fill();
    }
    this.dust = this.dust.filter((d) => !d.dead);
  }

  // ---------- Ambient particles ----------
  updateParticles(dt, viewer) {
    const m = this.s.map; const cam = this.cam;
    const cx = Math.floor((cam.x + this.w / 2 / cam.zoom) / TILE), cy = Math.floor((cam.y + this.h / 2 / cam.zoom) / TILE);
    const t = cx >= 0 && cy >= 0 && cx < m.w && cy < m.h ? m.terrain[cy * m.w + cx] : T.GRASS;
    let kind = 'leaf';
    if (t === T.ASH || t === T.ROUGH) kind = 'ember'; else if (t === T.SNOW) kind = 'snow'; else if (t === T.SWAMP) kind = 'firefly';
    const want = kind === 'snow' ? 70 : 28;
    while (this.particles.length < want) {
      const x = cam.x + Math.random() * this.w / cam.zoom, y = cam.y + Math.random() * this.h / cam.zoom;
      this.particles.push({ x, y, kind, life: 4 + Math.random() * 6, age: Math.random() * 4, vx: (Math.random() - 0.5) * 12, vy: kind === 'ember' ? -14 - Math.random() * 16 : kind === 'snow' ? 18 + Math.random() * 14 : 6 + Math.random() * 8, ph: Math.random() * 6.28, r: 1 + Math.random() * 1.6 });
    }
    for (const p of this.particles) {
      p.age += dt; p.x += (p.vx + Math.sin(this.time * 1.5 + p.ph) * 10) * dt; p.y += p.vy * dt;
      if (p.kind === 'firefly') { p.x += Math.cos(this.time + p.ph) * 20 * dt; p.y += Math.sin(this.time * 1.3 + p.ph) * 20 * dt - p.vy * dt; }
      const inView = p.x > cam.x - 20 && p.x < cam.x + this.w / cam.zoom + 20 && p.y > cam.y - 20 && p.y < cam.y + this.h / cam.zoom + 20;
      if (p.age > p.life || !inView || p.kind !== kind) p.dead = true;
    }
    this.particles = this.particles.filter((p) => !p.dead);
  }
  drawParticles() {
    const { ctx } = this;
    for (const p of this.particles) {
      const a = Math.min(1, p.age * 2, (p.life - p.age) * 2);
      if (p.kind === 'leaf') { ctx.fillStyle = rgba('#ffd36a', 0.8 * a); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(this.time * 2 + p.ph); ctx.beginPath(); ctx.ellipse(0, 0, p.r * 2.2, p.r * 1.1, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
      else if (p.kind === 'ember') { glow(ctx, p.x, p.y, p.r * 4, '#ff8a3a', 0.35 * a); circle(ctx, p.x, p.y, p.r * 0.9, rgba('#ffd27a', a)); }
      else if (p.kind === 'snow') circle(ctx, p.x, p.y, p.r, rgba('#ffffff', 0.85 * a));
      else { const f = 0.5 + 0.5 * Math.sin(this.time * 4 + p.ph); glow(ctx, p.x, p.y, 6, '#c8ff80', 0.5 * a * f); circle(ctx, p.x, p.y, 1.2, rgba('#eaffb0', a * f)); }
    }
  }

  // ---------- Main draw ----------
  draw(viewer, opts = {}) {
    const { ctx, cam, s } = this;
    const m = s.map;
    const now = performance.now() / 1000;
    const dt = Math.min(0.05, now - (this.lastTime || now)); this.lastTime = now;
    this.time = now;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#07090d'; ctx.fillRect(0, 0, this.w, this.h);
    ctx.save();
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);
    ctx.imageSmoothingEnabled = true;
    const vx0 = Math.floor(cam.x / TILE) - 1, vy0 = Math.floor(cam.y / TILE) - 1;
    const vx1 = Math.ceil((cam.x + this.w / cam.zoom) / TILE) + 1, vy1 = Math.ceil((cam.y + this.h / cam.zoom) / TILE) + 2;
    const cx0 = Math.floor(vx0 / CHUNK), cy0 = Math.floor(vy0 / CHUNK), cx1 = Math.floor(vx1 / CHUNK), cy1 = Math.floor(vy1 / CHUNK);
    for (let cy = Math.max(0, cy0); cy <= cy1 && cy * CHUNK < m.h; cy++) for (let cx = Math.max(0, cx0); cx <= cx1 && cx * CHUNK < m.w; cx++) {
      const c = this.chunk(cx, cy);
      const m0 = MARGIN * c.TS, sz = CHUNK * c.TS, b = 2, bw = b / this.CS;
      ctx.drawImage(c, m0 - b, m0 - b, sz + 2 * b, sz + 2 * b, cx * CHUNK * TILE - bw, cy * CHUNK * TILE - bw, CHUNK * TILE + 2 * bw, CHUNK * TILE + 2 * bw);
    }
    this.drawWater(vx0, vy0, vx1, vy1);
    if (this.path) this.drawPath();
    // cast shadows pass (under all sprites)
    for (let y = Math.max(0, vy0); y <= Math.min(m.h - 1, vy1); y++) {
      for (let x = Math.max(0, vx0); x <= Math.min(m.w - 1, vx1); x++) {
        const i = y * m.w + x;
        const d = m.decor[i];
        if (d && DECOR_BLOCKS.has(d) && d !== D.BLOCK) {
          const sp = decorSprite(d, (x * 3 + y * 5) & 3);
          const off = (((x * 7 + y * 3) & 3) - 1.5) * 3;
          this.castShadow(sp, x * TILE + TILE / 2 + off, y * TILE + TILE - 2, d === D.MOUNTAIN ? 0.22 : 0.3, d === D.MOUNTAIN ? 0.3 : 0.42);
        }
        const oid = m.objAt[i];
        if (oid) {
          const o = m.objects[oid];
          if (o.type === OBJ.TOWN) { const sp = townSprite(o.faction, fortLevel(o), null); this.castShadow(sp, x * TILE + TILE / 2, y * TILE + TILE, 0.25, 0.3); }
          else if (o.type !== OBJ.MONSTER) { const sp = objectSprite(o, null); this.castShadow(sp, x * TILE + TILE / 2, y * TILE + TILE, 0.28, 0.38); }
        }
      }
    }
    this.drawDust(dt);
    // sprites sorted by row
    const heroes = Object.values(s.heroes).filter((h) => !h.inTavern);
    const heroByRow = new Map();
    for (const h of heroes) { const [, py] = this.heroPos(h); const row = Math.round(py); if (!heroByRow.has(row)) heroByRow.set(row, []); heroByRow.get(row).push(h); }
    for (let y = Math.max(0, vy0); y <= Math.min(m.h - 1, vy1); y++) {
      for (let x = Math.max(0, vx0); x <= Math.min(m.w - 1, vx1); x++) {
        const i = y * m.w + x;
        const d = m.decor[i];
        if (d && DECOR_BLOCKS.has(d) && d !== D.BLOCK) {
          const sp = decorSprite(d, (x * 3 + y * 5) & 3);
          const sway = (d === D.MOUNTAIN || d === D.ROCK) ? 0 : Math.sin(now * 1.2 + x * 0.7 + y * 0.3) * 1.2;
          if (this.highlight) ctx.globalAlpha = 0.62;
          blit(ctx, sp, x * TILE + TILE / 2 - sp.lw / 2 + (((x * 7 + y * 3) & 3) - 1.5) * 3 + sway, y * TILE + TILE - sp.lh + 6);
          ctx.globalAlpha = 1;
        }
        const oid = m.objAt[i];
        if (oid) this.drawObject(m.objects[oid], x, y, viewer);
      }
      const hs = heroByRow.get(y);
      if (hs) for (const h of hs) this.drawHero(h, viewer);
    }
    this.drawCloudShadows();
    this.updateBirds(dt); this.drawBirds();
    this.updateParticles(dt, viewer);
    this.drawParticles();
    ctx.restore();
    if (viewer) this.drawFog(viewer);
    // soft vignette & warm light
    const g = ctx.createRadialGradient(this.w / 2, this.h / 2, Math.min(this.w, this.h) * 0.4, this.w / 2, this.h / 2, Math.max(this.w, this.h) * 0.8);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, this.w, this.h);
    // route labels on top of fog and vignette
    if (this.path) { ctx.save(); ctx.scale(cam.zoom, cam.zoom); ctx.translate(-cam.x, -cam.y); this.drawPathLabels(); ctx.restore(); }
  }

  drawWater(vx0, vy0, vx1, vy1) {
    const { ctx, s } = this; const m = s.map;
    const t = this.time;
    for (let y = Math.max(0, vy0); y <= Math.min(m.h - 1, vy1); y++) for (let x = Math.max(0, vx0); x <= Math.min(m.w - 1, vx1); x++) {
      if (m.terrain[y * m.w + x] !== T.WATER) continue;
      const ph = (x * 1.7 + y * 2.3);
      for (let k = 0; k < 2; k++) {
        const ox = Math.sin(t * 1.1 + ph + k * 2) * 9, oy = Math.cos(t * 0.8 + ph * 1.3 + k) * 6;
        const a = 0.08 + 0.06 * Math.sin(t * 2 + ph + k);
        ctx.fillStyle = `rgba(210,240,255,${a})`;
        ctx.beginPath(); ctx.ellipse(x * TILE + 32 + ox + k * 14, y * TILE + 32 + oy - k * 10, 12, 2.5, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  /** Soft light on the ground under things the player can use, and a marker in highlight mode. */
  objectCue(o, px, py, w) {
    const { ctx } = this;
    const mon = o.type === OBJ.MONSTER;
    const col = mon ? '#ff6a4a' : '#ffe6a8';
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 2.2 + (o.x * 7 + o.y * 3) % 10);
    ctx.save();
    ctx.globalAlpha = (this.highlight ? 0.42 : 0.22) + pulse * 0.06;
    const g = ctx.createRadialGradient(px, py - 4, 2, px, py - 4, w * 0.6);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(px, py - 4, w * 0.6, w * 0.26, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  objectMarker(o, px, top) {
    const { ctx } = this;
    const mon = o.type === OBJ.MONSTER;
    const pickup = o.type === OBJ.RESOURCE || o.type === OBJ.CHEST || o.type === OBJ.ARTIFACT;
    const claim = (o.type === OBJ.MINE || o.type === OBJ.DWELLING) && o.owner !== 0;
    const bob = Math.sin(this.time * 3 + o.x) * 2;
    const y = top - 10 + bob;
    const col = mon ? '#ff5a46' : pickup ? '#ffd872' : claim ? '#8fe0a0' : '#9fd3ff';
    glow(ctx, px, y, 16, col, 0.45);
    ctx.beginPath(); ctx.moveTo(px, y - 9); ctx.lineTo(px + 7.5, y); ctx.lineTo(px, y + 9); ctx.lineTo(px - 7.5, y); ctx.closePath();
    ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 1.2; ctx.stroke();
  }
  drawObject(o, x, y, viewer) {
    const { ctx, s } = this;
    const px = x * TILE + TILE / 2, py = y * TILE + TILE;
    if (o.type !== OBJ.TOWN) this.objectCue(o, px, py, o.type === OBJ.MONSTER ? 60 : 72);
    if (o.type === OBJ.TOWN) {
      const col = o.owner >= 0 ? s.players[o.owner].color : null;
      const sp = townSprite(o.faction, fortLevel(o), col);
      blit(ctx, sp, px - sp.lw / 2, py - sp.lh + 8);
      return;
    }
    if (o.type === OBJ.MONSTER) {
      const u = UNITS[o.unit];
      const f = figure(u, 72, false);
      const bob = Math.sin(this.time * 2 + x) * 1.5;
      // a few figures hint at the size of the band
      const n = u.tier >= 6 ? 1 : o.count >= 20 ? 3 : o.count >= 6 ? 2 : 1;
      const spots = n === 1 ? [[0, 0, 1]] : n === 2 ? [[-9, -6, 0.82], [8, 2, 0.86]] : [[-12, -8, 0.74], [10, -6, 0.74], [-1, 3, 0.78]];
      for (const [ox, oy, sc] of spots) { const s2 = 72 * sc; blit(ctx, f, px + ox - s2 / 2, py + oy + 6 - s2 * 0.92 + bob, s2, s2); }
      if (this.highlight) this.objectMarker(o, px, py - 64);
      return;
    }
    const col = o.owner >= 0 ? s.players[o.owner].color : null;
    const sp = objectSprite(o, col);
    blit(ctx, sp, px - sp.lw / 2, py - sp.lh + 8);
    if (o.type === OBJ.ARTIFACT || o.type === OBJ.CHEST) {
      const pulse = 0.5 + 0.5 * Math.sin(this.time * 3 + x);
      glow(ctx, px, py - 20, 22 + pulse * 6, o.type === OBJ.ARTIFACT ? '#ffe9a0' : '#ffd27a', 0.18 + pulse * 0.12);
    }
    if (o.type === OBJ.CAMP) { const f = 0.6 + 0.4 * Math.sin(this.time * 9 + x); glow(ctx, px + 20, py - 22, 26, '#ff9a40', 0.25 * f); }
    if (o.type === OBJ.SHRINE || o.type === OBJ.TREE || o.type === OBJ.RUNESTONE) { const f = 0.5 + 0.5 * Math.sin(this.time * 2 + y); glow(ctx, px, py - 30, 30, '#8fd3ff', 0.12 * f); }
    if (this.highlight) this.objectMarker(o, px, py - sp.lh + 8);
  }

  drawHero(h, viewer) {
    const { ctx, s } = this;
    const [hx, hy] = this.heroPos(h);
    const px = hx * TILE + TILE / 2, py = hy * TILE + TILE;
    const p = s.players[h.owner];
    const flip = this.heroFacing.get(h.id) || false;
    if (this.selected === h.id) {
      const pulse = 0.5 + 0.5 * Math.sin(this.time * 4);
      glow(ctx, px, py - 6, 34 + pulse * 4, '#ffe28a', 0.28 + pulse * 0.1);
      ctx.strokeStyle = `rgba(255,230,120,${0.6 + pulse * 0.35})`; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(px, py - 5, 27 + pulse * 2, 9 + pulse, 0, 0, Math.PI * 2); ctx.stroke();
    }
    const frame = Math.floor(this.time * 3.5) & 3;
    const sp = heroSprite(h.faction, p.color, flip, frame);
    const anim = this.heroAnim.get(h.id);
    const t = anim ? (hy === h.y && hx === h.x ? 1 : (this.heroPos(h)[2] || 0)) : 0;
    const dir = flip ? -1 : 1;
    if (anim) {
      // gallop: two strides per tile, lean into the ride, dust behind the hooves
      const stride = Math.sin(t * Math.PI * 4);
      const bob = -Math.abs(stride) * 5;
      const rot = stride * 0.06 * dir;
      const sy = 1 + Math.abs(stride) * 0.04, sx = 1 - Math.abs(stride) * 0.03;
      const now = performance.now();
      if (now - anim.lastDust > 85 && t > 0.05 && t < 0.95) { anim.lastDust = now; this.spawnDust(px - dir * sp.lw * 0.3, py + 4, dir); }
      ctx.fillStyle = `rgba(0,0,0,${0.3 + bob * 0.02})`;
      ctx.beginPath(); ctx.ellipse(px, py + 4, sp.lw * 0.36 * (1 + bob * 0.015), 7 * (1 + bob * 0.02), 0, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.translate(px, py + 8); ctx.rotate(rot); ctx.scale(sx, sy);
      blit(ctx, sp, -sp.lw / 2, -sp.lh + bob);
      ctx.restore();
    } else {
      const breathe = Math.sin(this.time * 1.6 + h.id) * 0.6;
      blit(ctx, sp, px - sp.lw / 2, py - sp.lh + 8 + breathe);
    }
  }

  // ---------- Planned route ----------
  pathPoints() {
    const path = this.path; if (!path || !path.length) return null;
    const h = this.selected ? this.s.heroes[this.selected] : null;
    const pts = [];
    if (h) { const [hx, hy] = this.heroPos(h); pts.push({ x: hx * TILE + TILE / 2, y: hy * TILE + TILE / 2 + 6, day: 0, g: 0 }); }
    for (const st of path) pts.push({ x: st.x * TILE + TILE / 2, y: st.y * TILE + TILE / 2 + 6, day: st.day, g: st.g });
    return pts;
  }
  drawPath() {
    const { ctx } = this;
    const pts = this.pathPoints(); if (!pts || pts.length < 2) return;
    const t = this.time;
    const GOLD = '#ffd872', GOLD_D = '#6e4f12', SILV = '#bfcbd8', SILV_D = '#3a4654';
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const trace = () => { ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y); };
    // soft dark ribbon under the route
    trace(); ctx.strokeStyle = 'rgba(0,0,0,0.38)'; ctx.lineWidth = 11; ctx.stroke();
    // coloured segments: gold for today, silver for later days
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i]; const today = b.day === 0;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = today ? GOLD_D : SILV_D; ctx.lineWidth = 6.5; ctx.stroke();
      ctx.globalAlpha = today ? 0.95 : 0.75; ctx.strokeStyle = today ? GOLD : SILV; ctx.lineWidth = 3.4; ctx.stroke(); ctx.globalAlpha = 1;
    }
    // flowing light along the route
    trace(); ctx.setLineDash([5, 19]); ctx.lineDashOffset = -t * 36; ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
    // chevrons on every step, pointing onwards
    for (let i = 1; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const wave = 0.65 + 0.35 * Math.sin(t * 5 - i * 0.9);
      ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(ang); ctx.globalAlpha = wave;
      ctx.beginPath(); ctx.moveTo(-4.5, -6.5); ctx.lineTo(3.5, 0); ctx.lineTo(-4.5, 6.5);
      ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.lineWidth = 5; ctx.stroke();
      ctx.strokeStyle = a.day === 0 ? '#fff4c8' : '#eef2f7'; ctx.lineWidth = 2.2; ctx.stroke();
      ctx.restore();
    }
    // destination: ring + cross
    const L = pts[pts.length - 1]; const today = L.day === 0; const col = today ? GOLD : SILV;
    const pulse = 0.5 + 0.5 * Math.sin(t * 4);
    glow(ctx, L.x, L.y, 26 + pulse * 5, col, 0.32);
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 6.5; ctx.beginPath(); ctx.arc(L.x, L.y, 13.5, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.stroke();
    const r = 6;
    ctx.beginPath(); ctx.moveTo(L.x - r, L.y - r); ctx.lineTo(L.x + r, L.y + r); ctx.moveTo(L.x + r, L.y - r); ctx.lineTo(L.x - r, L.y + r);
    ctx.strokeStyle = 'rgba(0,0,0,0.65)'; ctx.lineWidth = 5.5; ctx.stroke();
    ctx.strokeStyle = today ? '#fff4c8' : '#eef2f7'; ctx.lineWidth = 2.6; ctx.stroke();
    ctx.restore();
  }
  /** Labels drawn above sprites: step cost at the destination and day markers along the way. */
  drawPathLabels() {
    const { ctx } = this;
    const pts = this.pathPoints(); if (!pts || pts.length < 2) return;
    for (let i = 1; i < pts.length - 1; i++) if (pts[i].day !== pts[i - 1].day) this.dayBadge(pts[i].x, pts[i].y, pts[i].day + 1);
    const L = pts[pts.length - 1]; const today = L.day === 0;
    const label = today ? `${fmtMove(L.g)} skridt` : `${L.day + 1}. dag · ${fmtMove(L.g)} skridt`;
    // keep the label inside the visible map
    const halfW = 70 / this.cam.zoom, left = this.cam.x + halfW + 4, right = this.cam.x + this.w / this.cam.zoom - halfW - 4;
    this.badge(clamp(L.x, left, right), Math.max(this.cam.y + 16 / this.cam.zoom, L.y - 31), label, today ? '#ffd872' : '#bfcbd8');
  }
  badge(x, y, text, col) {
    const { ctx } = this;
    ctx.font = 'bold 12px Cinzel, Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(text).width + 18, h = 21;
    rrect(ctx, x - w / 2 + 1, y - h / 2 + 2, w, h, 7, 'rgba(0,0,0,0.45)');
    rrect(ctx, x - w / 2, y - h / 2, w, h, 7, 'rgba(12,14,20,0.9)', col, 1.2);
    ctx.fillStyle = col; ctx.fillText(text, x, y + 1);
    ctx.textBaseline = 'alphabetic';
  }
  dayBadge(x, y, n) {
    const { ctx } = this;
    circle(ctx, x, y - 17, 9.5, 'rgba(12,14,20,0.92)', '#bfcbd8', 1.3);
    ctx.font = 'bold 11px Cinzel, Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#eef2f7'; ctx.fillText(String(n), x, y - 16);
    ctx.textBaseline = 'alphabetic';
  }
}
