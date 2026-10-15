// Adventure map renderer: chunk-cached terrain, y-sorted sprites, fog of war.
import { TILE, tileTexture, decorSprite, objectSprite, townSprite, heroSprite, monsterShadow } from './sprites.js';
import { figure } from './figures.js';
import { mk, circle, line, rrect, ellipse, rgba } from './draw.js';
import { T, D, DECOR_BLOCKS, TERRAIN_INFO } from '../data/terrain.js';
import { UNITS } from '../data/units.js';
import { OBJ } from '../data/objects.js';
import { fortLevel } from '../game/town.js';
import { clamp } from '../core/utils.js';
import { Noise } from '../core/noise.js';
const worldNoise = new Noise(4242);

const CHUNK = 12; // tiles per chunk side
const PRIORITY = [T.WATER, T.SNOW, T.SWAMP, T.ROUGH, T.ASH, T.DIRT, T.GRASS];
const PASSABLE_DECOR = new Set([D.FLOWERS, D.MUSHROOM, D.STUMP, D.REEDS]);

export class AdventureRenderer {
  constructor(canvas, state) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.s = state;
    this.cam = { x: 0, y: 0, zoom: 1 };
    this.chunks = new Map();
    this.fogCanvas = null;
    this.fogDirty = true;
    this.selected = null; // hero id
    this.path = null; // [{x,y,day}]
    this.heroAnim = new Map(); // heroId -> {fx,fy,tx,ty,t0,dur,flip}
    this.heroFacing = new Map();
    this.time = 0;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.minZoom = 0.45; this.maxZoom = 1.8;
    this.resize();
  }
  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.w = Math.max(1, Math.round(r.width));
    this.h = Math.max(1, Math.round(r.height));
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
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
  screenToTile(sx, sy) {
    const [wx, wy] = this.screenToWorld(sx, sy);
    return [Math.floor(wx / TILE), Math.floor(wy / TILE)];
  }
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
    if (c) return c;
    const m = this.s.map;
    const size = CHUNK * TILE;
    c = mk(size + TILE * 2, size + TILE * 2); // 1 tile margin for blob overlap
    const ctx = c.getContext('2d');
    const x0 = cx * CHUNK - 1, y0 = cy * CHUNK - 1;
    const tAt = (x, y) => (x < 0 || y < 0 || x >= m.w || y >= m.h ? -1 : m.terrain[y * m.w + x]);
    const n = CHUNK + 2;
    // base squares
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const t = tAt(x0 + i, y0 + j);
      if (t < 0) { ctx.fillStyle = '#07090d'; ctx.fillRect(i * TILE, j * TILE, TILE, TILE); continue; }
      const v = ((x0 + i) * 7 + (y0 + j) * 13) & 3;
      ctx.drawImage(tileTexture(t, v), i * TILE, j * TILE);
    }
    // shoreline: sandy rim under land tiles that border water
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = x0 + i, y = y0 + j;
      const t = tAt(x, y);
      if (t <= 0) continue;
      const nearWater = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]].some(([dx, dy]) => tAt(x + dx, y + dy) === T.WATER);
      if (!nearWater) continue;
      const h = ((x * 73856093) ^ (y * 19349663)) >>> 0;
      const cxp = i * TILE + TILE / 2, cyp = j * TILE + TILE / 2;
      ctx.fillStyle = t === T.SNOW ? 'rgba(200,220,235,0.9)' : t === T.SWAMP ? 'rgba(90,110,70,0.9)' : 'rgba(205,190,150,0.9)';
      ctx.beginPath();
      ctx.arc(cxp + ((h & 7) - 3.5) * 1.5, cyp + (((h >> 3) & 7) - 3.5) * 1.5, TILE * 0.74, 0, Math.PI * 2);
      ctx.arc(cxp + ((h >> 6 & 7) - 3.5) * 4, cyp + (((h >> 9) & 7) - 3.5) * 4, TILE * 0.62, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(120,170,200,0.35)';
      ctx.beginPath();
      ctx.arc(cxp + ((h & 7) - 3.5) * 1.5, cyp + (((h >> 3) & 7) - 3.5) * 1.5, TILE * 0.84, 0, Math.PI * 2);
      ctx.fill();
    }
    // organic blobs in priority order
    for (const pt of PRIORITY) {
      if (pt === T.WATER) continue;
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const x = x0 + i, y = y0 + j;
        const t = tAt(x, y);
        if (t !== pt) continue;
        // skip interior tiles (all 8-neighbours same) for speed
        let interior = true;
        for (let dy = -1; dy <= 1 && interior; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && tAt(x + dx, y + dy) !== t) { interior = false; break; }
        if (interior) continue;
        const v = (x * 7 + y * 13) & 3;
        const pat = ctx.createPattern(tileTexture(t, v), 'repeat');
        const h = ((x * 73856093) ^ (y * 19349663)) >>> 0;
        const cxp = i * TILE + TILE / 2, cyp = j * TILE + TILE / 2;
        ctx.save();
        ctx.translate(i * TILE, j * TILE); ctx.fillStyle = pat; ctx.translate(-i * TILE, -j * TILE);
        ctx.beginPath();
        ctx.arc(cxp + ((h & 7) - 3.5) * 1.5, cyp + (((h >> 3) & 7) - 3.5) * 1.5, TILE * 0.62, 0, Math.PI * 2);
        ctx.arc(cxp + ((h >> 6 & 7) - 3.5) * 4, cyp + (((h >> 9) & 7) - 3.5) * 4, TILE * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
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
    for (const [w, col] of [[17, 'rgba(50,38,24,0.5)'], [11, '#8d7556'], [4, 'rgba(215,195,160,0.22)']]) {
      ctx.strokeStyle = col; ctx.lineWidth = w;
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const x = x0 + i, y = y0 + j;
        if (!roadAt(x, y)) continue;
        const cxp = i * TILE + TILE / 2, cyp = j * TILE + TILE / 2;
        const ls = links(x, y);
        for (const [dx, dy] of ls) { ctx.beginPath(); ctx.moveTo(cxp, cyp); ctx.lineTo(cxp + dx * TILE, cyp + dy * TILE); ctx.stroke(); }
        ctx.beginPath(); ctx.arc(cxp, cyp, w / 2, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill();
      }
    }
    // large-scale tonal variation to break up the tile grid
    {
      const lo = mk(n * 4, n * 4);
      const lctx = lo.getContext('2d');
      const img = lctx.createImageData(n * 4, n * 4);
      for (let j = 0; j < n * 4; j++) for (let i = 0; i < n * 4; i++) {
        const v = worldNoise.fbm((x0 + i / 4) / 5, (y0 + j / 4) / 5, 2);
        const k = (j * n * 4 + i) * 4;
        const dark = v < 0.5;
        img.data[k] = dark ? 0 : 255; img.data[k + 1] = dark ? 0 : 240; img.data[k + 2] = dark ? 10 : 200;
        img.data[k + 3] = Math.round(Math.abs(v - 0.5) * 2 * 70);
      }
      lctx.putImageData(img, 0, 0);
      ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.imageSmoothingEnabled = true;
      ctx.drawImage(lo, 0, 0, n * TILE, n * TILE);
      ctx.restore();
    }
    // passable decor baked in
    for (let j = 1; j < n - 1; j++) for (let i = 1; i < n - 1; i++) {
      const x = x0 + i, y = y0 + j;
      if (x < 0 || y < 0 || x >= m.w || y >= m.h) continue;
      const d = m.decor[y * m.w + x];
      if (!d || !PASSABLE_DECOR.has(d)) continue;
      const sp = decorSprite(d, (x * 3 + y * 5) & 3);
      ctx.drawImage(sp, i * TILE + TILE / 2 - sp.width / 2, j * TILE + TILE - sp.height + 4);
    }
    this.chunks.set(key, c);
    return c;
  }

  fogLayer(p) {
    const m = this.s.map;
    if (!this.fogCanvas) this.fogCanvas = mk(m.w, m.h);
    if (this.fogDirty) {
      const ctx = this.fogCanvas.getContext('2d');
      const img = ctx.createImageData(m.w, m.h);
      const d = img.data;
      for (let i = 0; i < m.w * m.h; i++) {
        const seen = p.fog[i];
        d[i * 4] = 7; d[i * 4 + 1] = 9; d[i * 4 + 2] = 13; d[i * 4 + 3] = seen ? 0 : 255;
      }
      ctx.putImageData(img, 0, 0);
      this.fogDirty = false;
    }
    return this.fogCanvas;
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

  // ---------- Main draw ----------
  draw(viewer, opts = {}) {
    const { ctx, cam, s } = this;
    const m = s.map;
    this.time = performance.now() / 1000;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#07090d'; ctx.fillRect(0, 0, this.w, this.h);
    ctx.save();
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);
    ctx.imageSmoothingEnabled = true;
    const vx0 = Math.floor(cam.x / TILE) - 1, vy0 = Math.floor(cam.y / TILE) - 1;
    const vx1 = Math.ceil((cam.x + this.w / cam.zoom) / TILE) + 1, vy1 = Math.ceil((cam.y + this.h / cam.zoom) / TILE) + 2;
    // chunks
    const cx0 = Math.floor(vx0 / CHUNK), cy0 = Math.floor(vy0 / CHUNK), cx1 = Math.floor(vx1 / CHUNK), cy1 = Math.floor(vy1 / CHUNK);
    for (let cy = Math.max(0, cy0); cy <= cy1 && cy * CHUNK < m.h; cy++) for (let cx = Math.max(0, cx0); cx <= cx1 && cx * CHUNK < m.w; cx++) {
      const c = this.chunk(cx, cy);
      ctx.drawImage(c, (cx * CHUNK - 1) * TILE, (cy * CHUNK - 1) * TILE);
    }
    // water shimmer (subtle animated highlights)
    this.drawWaterShimmer(vx0, vy0, vx1, vy1);
    // path
    if (this.path) this.drawPath();
    // sprites sorted by row: decor, objects, heroes
    const heroes = Object.values(s.heroes).filter((h) => !h.inTavern);
    const heroByRow = new Map();
    for (const h of heroes) { const [, py] = this.heroPos(h); const row = Math.round(py); if (!heroByRow.has(row)) heroByRow.set(row, []); heroByRow.get(row).push(h); }
    for (let y = Math.max(0, vy0); y <= Math.min(m.h - 1, vy1); y++) {
      for (let x = Math.max(0, vx0); x <= Math.min(m.w - 1, vx1); x++) {
        const i = y * m.w + x;
        const d = m.decor[i];
        if (d && DECOR_BLOCKS.has(d) && d !== D.BLOCK) {
          const sp = decorSprite(d, (x * 3 + y * 5) & 3);
          ctx.drawImage(sp, x * TILE + TILE / 2 - sp.width / 2 + (((x * 7 + y * 3) & 3) - 1.5) * 3, y * TILE + TILE - sp.height + 6);
        }
        const oid = m.objAt[i];
        if (oid) this.drawObject(m.objects[oid], x, y, viewer);
      }
      const hs = heroByRow.get(y);
      if (hs) for (const h of hs) this.drawHero(h, viewer);
    }
    // fog
    if (viewer) {
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(this.fogLayer(viewer), 0, 0, m.w, m.h, 0, 0, m.w * TILE, m.h * TILE);
      ctx.imageSmoothingEnabled = true;
    }
    // map border vignette
    ctx.restore();
    const g = ctx.createRadialGradient(this.w / 2, this.h / 2, Math.min(this.w, this.h) * 0.45, this.w / 2, this.h / 2, Math.max(this.w, this.h) * 0.8);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, this.w, this.h);
  }

  drawWaterShimmer(vx0, vy0, vx1, vy1) {
    const { ctx, s } = this; const m = s.map;
    const t = this.time;
    ctx.fillStyle = 'rgba(200,230,255,0.10)';
    for (let y = Math.max(0, vy0); y <= Math.min(m.h - 1, vy1); y++) for (let x = Math.max(0, vx0); x <= Math.min(m.w - 1, vx1); x++) {
      if (m.terrain[y * m.w + x] !== T.WATER) continue;
      const ph = (x * 1.7 + y * 2.3);
      const ox = Math.sin(t * 1.2 + ph) * 8, oy = Math.cos(t * 0.9 + ph * 1.3) * 5;
      ctx.beginPath(); ctx.ellipse(x * TILE + 32 + ox, y * TILE + 32 + oy, 10, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  drawObject(o, x, y, viewer) {
    const { ctx, s } = this;
    const px = x * TILE + TILE / 2, py = y * TILE + TILE;
    if (o.type === OBJ.TOWN) {
      const col = o.owner >= 0 ? s.players[o.owner].color : null;
      const sp = townSprite(o.faction, fortLevel(o), col);
      ctx.drawImage(sp, px - sp.width / 2, py - sp.height + 8);
      return;
    }
    if (o.type === OBJ.MONSTER) {
      const u = UNITS[o.unit];
      const sh = monsterShadow();
      const f = figure(u, 72, false);
      const bob = Math.sin(this.time * 2 + x) * 1.5;
      ctx.drawImage(f, px - 36, py - 66 + bob);
      return;
    }
    const col = o.owner >= 0 ? s.players[o.owner].color : null;
    const sp = objectSprite(o, col);
    ctx.drawImage(sp, px - sp.width / 2, py - sp.height + 8);
  }

  drawHero(h, viewer) {
    const { ctx, s } = this;
    const [hx, hy] = this.heroPos(h);
    const px = hx * TILE + TILE / 2, py = hy * TILE + TILE;
    const p = s.players[h.owner];
    const flip = this.heroFacing.get(h.id) || false;
    if (this.selected === h.id) {
      const pulse = 0.5 + 0.5 * Math.sin(this.time * 4);
      ctx.strokeStyle = `rgba(255,230,120,${0.5 + pulse * 0.4})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(px, py - 6, 26 + pulse * 2, 9 + pulse, 0, 0, Math.PI * 2); ctx.stroke();
    }
    const sp = heroSprite(h.faction, p.color, flip);
    const bob = this.heroAnim.has(h.id) ? Math.sin(this.time * 18) * 2 : 0;
    ctx.drawImage(sp, px - sp.width / 2, py - sp.height + 8 + bob);
  }

  drawPath() {
    const { ctx } = this;
    for (let i = 0; i < this.path.length; i++) {
      const st = this.path[i];
      const px = st.x * TILE + TILE / 2, py = st.y * TILE + TILE / 2;
      const last = i === this.path.length - 1;
      const col = st.day === 0 ? '#ffe28a' : '#9aa0a6';
      if (last) {
        ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px, py, 12, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = rgba(col === '#ffe28a' ? '#ffe28a' : '#9aa0a6', 0.35); ctx.fill();
        if (st.day > 0) { ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(String(st.day + 1), px, py + 5); }
      } else {
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.stroke();
      }
    }
  }
}
