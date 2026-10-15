// Adventure map renderer: chunk-cached terrain, y-sorted sprites, cloudy fog of
// war, ambient particles and simple animations.
import { TILE, tileTexture, drawTileDetails, decorSprite, objectSprite, townSprite, heroSprite } from './sprites.js';
import { figure } from './figures.js';
import { mk, circle, line, rrect, ellipse, rgba, blit, glow } from './draw.js';
import { T, D, DECOR_BLOCKS, TERRAIN_INFO } from '../data/terrain.js';
import { UNITS } from '../data/units.js';
import { OBJ } from '../data/objects.js';
import { fortLevel } from '../game/town.js';
import { clamp } from '../core/utils.js';
import { Noise } from '../core/noise.js';

const CHUNK = 10; // tiles per chunk side
const MARGIN = 2; // extra tiles rendered around each chunk (cropped away when drawn)
const PRIORITY = [T.SNOW, T.SWAMP, T.ROUGH, T.ASH, T.DIRT, T.GRASS];
const PASSABLE_DECOR = new Set([D.FLOWERS, D.MUSHROOM, D.STUMP, D.REEDS]);
const worldNoise = new Noise(4242);
const MAX_CHUNKS = 24;

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
    this.minZoom = 0.45; this.maxZoom = 1.8;
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
    const pattern = (t) => patterns[t] || (patterns[t] = ctx.createPattern(tileTexture(t, texPx), 'repeat'));
    // base squares
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const t = tAt(x0 + i, y0 + j);
      if (t < 0) { ctx.fillStyle = '#07090d'; ctx.fillRect(i * TS, j * TS, TS + 1, TS + 1); continue; }
      ctx.drawImage(tileTexture(t, texPx), i * TS, j * TS, TS + 0.5, TS + 0.5);
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
      drawTileDetails(ctx, t, i * TS, j * TS, TS, hash(x, y));
    }
    // roads
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const roadAt = (x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h && m.road[y * m.w + x];
    const links = (x, y) => {
      const out = [];
      if (roadAt(x + 1, y)) out.push([1, 0]);
      if (roadAt(x, y + 1)) out.push([0, 1]);
      if (roadAt(x + 1, y + 1) && !(roadAt(x + 1, y) && roadAt(x, y + 1))) out.push([1, 1]);
      if (roadAt(x - 1, y + 1) && !(roadAt(x - 1, y) && roadAt(x, y + 1))) out.push([-1, 1]);
      return out;
    };
    for (const [w, col] of [[18, 'rgba(45,34,22,0.45)'], [12, '#8e7656'], [10, 'rgba(160,135,100,0.35)'], [3, 'rgba(225,205,170,0.22)']]) {
      ctx.strokeStyle = col; ctx.lineWidth = w * CS;
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const x = x0 + i, y = y0 + j;
        if (!roadAt(x, y)) continue;
        const cxp = i * TS + TS / 2, cyp = j * TS + TS / 2;
        const h = hash(x, y);
        const jx = ((h & 7) - 3.5) * 1.2 * CS, jy = (((h >> 3) & 7) - 3.5) * 1.2 * CS;
        for (const [dx, dy] of links(x, y)) {
          const h2 = hash(x + dx, y + dy);
          const jx2 = ((h2 & 7) - 3.5) * 1.2 * CS, jy2 = (((h2 >> 3) & 7) - 3.5) * 1.2 * CS;
          ctx.beginPath(); ctx.moveTo(cxp + jx, cyp + jy); ctx.lineTo(cxp + dx * TS + jx2, cyp + dy * TS + jy2); ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(cxp + jx, cyp + jy, w * CS / 2, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill();
      }
    }
    // road pebbles
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = x0 + i, y = y0 + j; if (!roadAt(x, y)) continue;
      const h = hash(x, y);
      for (let k = 0; k < 3; k++) { const px = i * TS + TS * 0.3 + ((h >> (k * 5)) & 15) / 15 * TS * 0.4, py = j * TS + TS * 0.3 + ((h >> (k * 5 + 2)) & 15) / 15 * TS * 0.4; circle(ctx, px, py, 1.3 * CS, 'rgba(70,55,40,0.45)'); }
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

  // ---------- Hero animation ----------
  animateHero(hero, fx, fy, tx, ty, dur) {
    this.heroAnim.set(hero.id, { fx, fy, tx, ty, t0: performance.now(), dur });
    if (tx !== fx) this.heroFacing.set(hero.id, tx < fx);
    return new Promise((r) => setTimeout(r, dur));
  }
  heroPos(h) {
    const a = this.heroAnim.get(h.id);
    if (!a) return [h.x, h.y];
    const t = clamp((performance.now() - a.t0) / a.dur, 0, 1);
    if (t >= 1) { this.heroAnim.delete(h.id); return [h.x, h.y]; }
    const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    return [a.fx + (a.tx - a.fx) * e, a.fy + (a.ty - a.fy) * e];
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
          blit(ctx, sp, x * TILE + TILE / 2 - sp.lw / 2 + (((x * 7 + y * 3) & 3) - 1.5) * 3 + sway, y * TILE + TILE - sp.lh + 6);
        }
        const oid = m.objAt[i];
        if (oid) this.drawObject(m.objects[oid], x, y, viewer);
      }
      const hs = heroByRow.get(y);
      if (hs) for (const h of hs) this.drawHero(h, viewer);
    }
    this.updateParticles(dt, viewer);
    this.drawParticles();
    ctx.restore();
    if (viewer) this.drawFog(viewer);
    // soft vignette & warm light
    const g = ctx.createRadialGradient(this.w / 2, this.h / 2, Math.min(this.w, this.h) * 0.4, this.w / 2, this.h / 2, Math.max(this.w, this.h) * 0.8);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, this.w, this.h);
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

  drawObject(o, x, y, viewer) {
    const { ctx, s } = this;
    const px = x * TILE + TILE / 2, py = y * TILE + TILE;
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
      blit(ctx, f, px - 36, py - 66 + bob, 72, 72);
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
    const frame = Math.floor(this.time * 5) & 3;
    const sp = heroSprite(h.faction, p.color, flip, frame);
    const bob = this.heroAnim.has(h.id) ? Math.sin(this.time * 18) * 2 : 0;
    blit(ctx, sp, px - sp.lw / 2, py - sp.lh + 8 + bob);
  }

  drawPath() {
    const { ctx } = this;
    for (let i = 0; i < this.path.length; i++) {
      const st = this.path[i];
      const px = st.x * TILE + TILE / 2, py = st.y * TILE + TILE / 2;
      const last = i === this.path.length - 1;
      const col = st.day === 0 ? '#ffe28a' : '#b8c0c8';
      if (last) {
        glow(ctx, px, py, 22, col, 0.35);
        ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px, py, 13, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(px, py, 15, 0, Math.PI * 2); ctx.stroke();
        if (st.day > 0) { ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Cinzel, serif'; ctx.textAlign = 'center'; ctx.fillText(String(st.day + 1), px, py + 5); }
      } else {
        const pulse = 0.5 + 0.5 * Math.sin(this.time * 6 - i * 0.6);
        circle(ctx, px, py, 4 + pulse * 1.5, col, 'rgba(0,0,0,0.55)', 1.2);
      }
    }
  }
}
