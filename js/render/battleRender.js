// Battlefield renderer: painted ground, hex grid, hi-res creature figures,
// tweened movement, projectiles, spell effects, particles and camera shake.
import { BF_W, BF_H, hexCenter, hexPolygon, hexKey, pixelToHex } from '../combat/hex.js';
import { figure } from './figures.js';
import { mk, poly, circle, ellipse, rrect, line, lgrad, rgrad, rgba, shade, lighten, blit, glow, softShadow } from './draw.js';
import { tileTexture, drawTileDetails, decorSprite } from './sprites.js';
import { T, D } from '../data/terrain.js';
import { SPELLS } from '../data/spells.js';
import { clamp } from '../core/utils.js';

const silCache = new WeakMap();
function whiteSilhouette(f) {
  let c = silCache.get(f);
  if (c) return c;
  c = mk(f.width, f.height); c.lw = f.lw; c.lh = f.lh;
  const x = c.getContext('2d');
  x.drawImage(f, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
  silCache.set(f, c);
  return c;
}

export class BattleRenderer {
  constructor(canvas, battle) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.b = battle;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.anims = [];
    this.floaters = [];
    this.particles = [];
    this.fx = [];
    this.highlight = null;
    this.hover = null;
    this.targetable = null;
    this.activeId = null;
    this.stackPos = new Map();
    this.flash = new Map();
    this.shake = 0;
    this.bg = null;
    this.resize();
  }
  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.w = Math.max(1, Math.round(r.width)); this.h = Math.max(1, Math.round(r.height));
    this.canvas.width = Math.round(this.w * this.dpr); this.canvas.height = Math.round(this.h * this.dpr);
    const sizeW = this.w / ((BF_W + 0.5) * Math.sqrt(3)) * 0.98;
    const sizeH = (this.h - 24) / (1.5 * (BF_H - 1) + 2) * 0.98;
    this.size = Math.min(sizeW, sizeH);
    const fieldW = Math.sqrt(3) * this.size * (BF_W + 0.5);
    const fieldH = this.size * (1.5 * (BF_H - 1) + 2);
    this.ox = (this.w - fieldW) / 2; this.oy = (this.h - fieldH) / 2 + 6;
    this.bg = null;
  }
  center(x, y) { return hexCenter(x, y, this.size, this.ox, this.oy); }
  hexAt(sx, sy) { return pixelToHex(sx, sy, this.size, this.ox, this.oy); }

  background() {
    if (this.bg) return this.bg;
    const c = mk(Math.round(this.w * this.dpr), Math.round(this.h * this.dpr)); const ctx = c.getContext('2d');
    ctx.scale(this.dpr, this.dpr);
    const t = this.b.terrain === T.WATER ? T.GRASS : this.b.terrain;
    const tex = tileTexture(t, 96);
    const pat = ctx.createPattern(tex, 'repeat');
    ctx.fillStyle = pat; ctx.fillRect(0, 0, this.w, this.h);
    // hand-drawn details across the field
    const cell = 110;
    for (let y = -1; y < this.h / cell + 1; y++) for (let x = -1; x < this.w / cell + 1; x++) drawTileDetails(ctx, t, x * cell, y * cell, cell, (x * 7919 + y * 104729 + 17) >>> 0);
    // large-scale light & shade
    const g = ctx.createRadialGradient(this.w / 2, this.h * 0.45, this.h * 0.15, this.w / 2, this.h / 2, this.w * 0.75);
    g.addColorStop(0, 'rgba(255,240,200,0.14)'); g.addColorStop(0.6, 'rgba(0,0,0,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, this.w, this.h);
    // ambient scatter decor outside the field
    const seedR = (k) => { let s = (k * 2654435761) >>> 0; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return (s % 10000) / 10000; }; };
    const rr = seedR(this.b.round + 11);
    const kinds = t === T.ASH || t === T.ROUGH ? [D.ROCK, D.DEAD] : t === T.SNOW ? [D.SNOWPINE, D.ROCK] : t === T.SWAMP ? [D.DEAD, D.MUSHROOM, D.REEDS] : [D.LEAFY, D.PINE, D.FLOWERS, D.GOLDEN];
    for (let i = 0; i < 10; i++) {
      const left = rr() < 0.5;
      const x = left ? rr() * (this.ox - 20) : this.w - rr() * (this.ox - 20);
      const y = 40 + rr() * (this.h - 60);
      const sp = decorSprite(kinds[Math.floor(rr() * kinds.length)], i & 3);
      const sc = 0.7 + rr() * 0.4;
      ctx.globalAlpha = 0.85; ctx.drawImage(sp, x - sp.lw * sc / 2, y - sp.lh * sc, sp.lw * sc, sp.lh * sc); ctx.globalAlpha = 1;
    }
    // field plate: subtle darker area under the hexes
    const fx0 = this.ox - this.size * 0.2, fy0 = this.oy - this.size * 0.3;
    const fw = Math.sqrt(3) * this.size * (BF_W + 0.5) + this.size * 0.4, fh = this.size * (1.5 * (BF_H - 1) + 2) + this.size * 0.6;
    rrect(ctx, fx0, fy0, fw, fh, this.size, 'rgba(0,0,0,0.12)');
    // hex grid
    for (let y = 0; y < BF_H; y++) for (let x = 0; x < BF_W; x++) {
      const [cx, cy] = this.center(x, y);
      poly(ctx, hexPolygon(cx, cy, this.size - 0.6), null, 'rgba(10,8,6,0.28)', 1);
      poly(ctx, hexPolygon(cx, cy, this.size - 2.2), null, 'rgba(255,245,220,0.07)', 1);
    }
    // obstacles
    for (const [k, kind] of this.b.obstacles) {
      const x = k % 64, y = Math.floor(k / 64);
      const [cx, cy] = this.center(x, y);
      if (kind === 'wall') {
        const elf = this.b.sides[1].town && this.b.sides[1].town.faction === 'elves';
        const wallCol = elf ? '#ddd3b8' : '#4a4040';
        softShadow(ctx, cx + 4, cy + this.size * 0.5, this.size * 0.8, this.size * 0.25, 0.4);
        rrect(ctx, cx - this.size * 0.58, cy - this.size * 1.15, this.size * 1.16, this.size * 1.7, 3, lgrad(ctx, cx - this.size * 0.5, 0, cx + this.size * 0.5, 0, [[0, lighten(wallCol, 0.25)], [0.5, wallCol], [1, shade(wallCol, 0.55)]]), 'rgba(0,0,0,0.6)', 1.2);
        for (let i = 0; i < 3; i++) rrect(ctx, cx - this.size * 0.52 + i * this.size * 0.4, cy - this.size * 1.3, this.size * 0.26, this.size * 0.2, 1, wallCol, 'rgba(0,0,0,0.5)', 1);
        for (let i = 0; i < 4; i++) line(ctx, cx - this.size * 0.5, cy - this.size * 0.9 + i * this.size * 0.35, cx + this.size * 0.5, cy - this.size * 0.9 + i * this.size * 0.35, 'rgba(0,0,0,0.2)', 1);
      } else {
        const d = kind === 'tree' ? D.LEAFY : kind === 'dead' ? D.DEAD : kind === 'snowpine' ? D.SNOWPINE : D.ROCK;
        const sp = decorSprite(d, (x + y) & 3);
        const sc = this.size / 26;
        ctx.drawImage(sp, cx - sp.lw * sc / 2, cy + this.size * 0.5 - sp.lh * sc, sp.lw * sc, sp.lh * sc);
      }
    }
    this.bg = c;
    return c;
  }

  // -------- animation API --------
  pos(st) { return this.stackPos.get(st.id) || [st.x, st.y]; }
  async animateMove(st, path, flying) {
    let from = this.pos(st);
    if (flying && path.length > 1) {
      const to = path[path.length - 1];
      await this.tween(st.id, from, to, Math.max(260, path.length * 70), true);
      this.stackPos.delete(st.id);
      return;
    }
    for (const to of path) {
      await this.tween(st.id, from, to, 140, false);
      this.dust(to);
      from = to;
    }
    this.stackPos.delete(st.id);
  }
  tween(id, from, to, dur, arc) {
    return new Promise((resolve) => this.anims.push({ id, from, to, t0: performance.now(), dur, arc, resolve }));
  }
  dust(hex) {
    const [cx, cy] = this.center(hex[0], hex[1]);
    for (let i = 0; i < 4; i++) this.particles.push({ x: cx + (Math.random() - 0.5) * 10, y: cy + this.size * 0.4, vx: (Math.random() - 0.5) * 30, vy: -10 - Math.random() * 15, life: 0.4, col: '#c8b89a', r: 2 + Math.random() * 2, grav: -20 });
  }
  async animateAttack(att, def) {
    const a = this.pos(att), d = this.pos(def);
    const mid = [a[0] + (d[0] - a[0]) * 0.35, a[1] + (d[1] - a[1]) * 0.35];
    await this.tween(att.id, a, mid, 110, false);
    this.flash.set(def.id, performance.now());
    this.spawnHit(def);
    this.fx.push({ type: 'slash', id: def.id, t0: performance.now(), dir: Math.atan2(d[1] - a[1], (d[0] - a[0]) * 1.2) });
    await this.tween(att.id, mid, a, 140, false);
    this.stackPos.delete(att.id);
  }
  async animateShot(att, def) {
    const [ax, ay] = this.center(...this.pos(att));
    const [dx, dy] = this.center(...this.pos(def));
    await new Promise((resolve) => this.anims.push({ proj: true, from: [ax, ay - this.size * 0.7], to: [dx, dy - this.size * 0.5], t0: performance.now(), dur: 340, resolve, trail: [] }));
    this.flash.set(def.id, performance.now());
    this.spawnHit(def);
  }
  async animateSpell(spellId, targets, side) {
    const sp = SPELLS[spellId];
    const col = sp.icon.c, g = sp.icon.g;
    const now = performance.now();
    const centers = targets.map((id) => this.center(...this.pos(this.b.getStack(id))));
    if (g === 'bolt') {
      centers.forEach(([cx, cy], i) => this.fx.push({ type: 'bolt', x: cx, y: cy - this.size * 0.4, t0: now + i * 90, col }));
      if (sp.chain) for (let i = 1; i < centers.length; i++) this.fx.push({ type: 'arc', from: centers[i - 1], to: centers[i], t0: now + i * 90, col });
      this.shake = Math.max(this.shake, 6);
    } else if (g === 'fire') {
      const [cx, cy] = centers[0];
      this.fx.push({ type: 'meteor', x: cx, y: cy, t0: now, col });
      centers.forEach(([x, y]) => this.fx.push({ type: 'ring', x, y: y - this.size * 0.3, t0: now + 380, col: '#ff7a2a', r: this.size * 1.3 }));
      this.shake = Math.max(this.shake, 9);
    } else if (g === 'sun') {
      centers.forEach(([x, y]) => this.fx.push({ type: 'rays', x, y: y - this.size * 0.5, t0: now, col }));
    } else if (g === 'leaf') {
      centers.forEach(([x, y]) => { for (let i = 0; i < 16; i++) this.particles.push({ x: x + (Math.random() - 0.5) * this.size, y: y + this.size * 0.3, vx: (Math.random() - 0.5) * 12, vy: -25 - Math.random() * 30, life: 0.9, col: '#8fe0a0', r: 2 + Math.random() * 2, grav: 0, glow: true }); });
    } else if (g === 'wind') {
      centers.forEach(([x, y]) => this.fx.push({ type: 'swirl', x, y: y - this.size * 0.4, t0: now, col }));
    } else if (g === 'skull' || g === 'chain' || g === 'down') {
      centers.forEach(([x, y]) => this.fx.push({ type: 'mist', x, y: y - this.size * 0.3, t0: now, col }));
    } else if (g === 'shield' || g === 'up') {
      centers.forEach(([x, y]) => this.fx.push({ type: 'ring', x, y: y - this.size * 0.4, t0: now, col, r: this.size * 1.1, thick: true }));
    } else {
      centers.forEach(([x, y]) => this.fx.push({ type: 'ring', x, y: y - this.size * 0.3, t0: now, col, r: this.size }));
    }
    for (const id of targets) this.flash.set(id, now + (g === 'fire' ? 380 : 120));
    this.spellFlash = { t0: now, col };
    await new Promise((r) => setTimeout(r, g === 'fire' ? 800 : 520));
  }
  floater(st, text, col = '#fff') {
    const [cx, cy] = this.center(...this.pos(st));
    this.floaters.push({ x: cx + (Math.random() - 0.5) * 10, y: cy - this.size * 1.3, text, col, t0: performance.now() });
  }
  spawnHit(st) {
    const [cx, cy] = this.center(...this.pos(st));
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2, sp = 30 + Math.random() * 70;
      this.particles.push({ x: cx, y: cy - this.size * 0.5, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, life: 0.5, col: Math.random() < 0.5 ? '#ff6a4a' : '#ffd080', r: 1.5 + Math.random() * 2, grav: 160 });
    }
    this.shake = Math.max(this.shake, 3);
  }
  async animateDeath(st) {
    this.dying = this.dying || new Map();
    this.dying.set(st.id, performance.now());
    const [cx, cy] = this.center(...this.pos(st));
    for (let i = 0; i < 10; i++) this.particles.push({ x: cx + (Math.random() - 0.5) * this.size, y: cy, vx: (Math.random() - 0.5) * 20, vy: -20 - Math.random() * 20, life: 0.8, col: '#777', r: 3 + Math.random() * 3, grav: -10 });
    await new Promise((r) => setTimeout(r, 380));
  }

  // -------- draw --------
  draw(dt) {
    const { ctx, b } = this;
    const now = performance.now();
    const sh = this.shake > 0.3 ? this.shake : 0;
    const shx = sh ? (Math.random() - 0.5) * sh : 0, shy = sh ? (Math.random() - 0.5) * sh : 0;
    this.shake *= Math.pow(0.02, dt);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, shx * this.dpr, shy * this.dpr);
    ctx.drawImage(this.background(), 0, 0, this.w, this.h);
    for (const a of this.anims) {
      if (a.proj) continue;
      const t = clamp((now - a.t0) / a.dur, 0, 1);
      const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      const x = a.from[0] + (a.to[0] - a.from[0]) * e, y = a.from[1] + (a.to[1] - a.from[1]) * e;
      this.stackPos.set(a.id, [x, y, a.arc ? Math.sin(t * Math.PI) * 1.3 : Math.abs(Math.sin(t * Math.PI * 2)) * 0.12]);
      if (t >= 1) { a.done = true; a.resolve(); }
    }
    this.anims = this.anims.filter((a) => !a.done);
    // highlights
    if (this.highlight) {
      for (const k of this.highlight.keys()) {
        const x = k % 64, y = Math.floor(k / 64);
        const [cx, cy] = this.center(x, y);
        poly(ctx, hexPolygon(cx, cy, this.size - 1.5), 'rgba(255,230,140,0.17)', 'rgba(255,230,140,0.55)', 1.2);
      }
    }
    if (this.hover) {
      const [cx, cy] = this.center(this.hover[0], this.hover[1]);
      poly(ctx, hexPolygon(cx, cy, this.size - 1.5), 'rgba(255,255,255,0.12)', '#fff', 1.5);
    }
    // ground fx (rings, mist) below units
    this.drawFx(now, 'below');
    const stacks = b.stacks.filter((s) => !s.dead || (this.dying && this.dying.has(s.id) && now - this.dying.get(s.id) < 420)).sort((p, q) => this.pos(p)[1] - this.pos(q)[1] || p.x - q.x);
    for (const st of stacks) this.drawStack(st, now);
    // projectiles
    for (const a of this.anims) {
      if (!a.proj) continue;
      const t = clamp((now - a.t0) / a.dur, 0, 1);
      const x = a.from[0] + (a.to[0] - a.from[0]) * t, y = a.from[1] + (a.to[1] - a.from[1]) * t - Math.sin(t * Math.PI) * 34;
      a.trail.push([x, y]); if (a.trail.length > 8) a.trail.shift();
      a.trail.forEach(([tx, ty], i) => circle(ctx, tx, ty, 1 + i * 0.3, rgba('#ffffff', i / 8 * 0.5)));
      const nx = a.from[0] + (a.to[0] - a.from[0]) * Math.min(1, t + 0.02), ny = a.from[1] + (a.to[1] - a.from[1]) * Math.min(1, t + 0.02) - Math.sin(Math.min(1, t + 0.02) * Math.PI) * 34;
      const ang = Math.atan2(ny - y, nx - x);
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      line(ctx, -11, 0, 11, 0, '#e8dcc0', 2.2); poly(ctx, [[11, -3.5], [18, 0], [11, 3.5]], '#d4d8de', '#333', 0.8); poly(ctx, [[-11, -3], [-7, 0], [-11, 3], [-14, 0]], '#c8c0b0');
      ctx.restore();
      if (t >= 1) { a.done = true; a.resolve(); }
    }
    this.anims = this.anims.filter((a) => !a.done);
    this.drawFx(now, 'above');
    // ambient drift (leaves / embers / snow)
    if (this.particles.filter((q) => q.ambient).length < 14 && Math.random() < 0.3) {
      const t = this.b.terrain;
      const kind = t === T.ASH || t === T.ROUGH ? 'ember' : t === T.SNOW ? 'snow' : 'leaf';
      this.particles.push({ ambient: true, kind, x: Math.random() * this.w, y: kind === 'ember' ? this.h + 5 : -5, vx: 10 + Math.random() * 15, vy: kind === 'ember' ? -18 - Math.random() * 12 : 14 + Math.random() * 12, life: 9, col: kind === 'ember' ? '#ff9a3a' : kind === 'snow' ? '#ffffff' : '#ffd36a', r: kind === 'snow' ? 1.6 : 2.2, grav: 0, glow: kind === 'ember' });
    }
    // particles
    for (const p of this.particles) {
      if (p.ambient) { p.x += Math.sin(now / 700 + p.y * 0.01) * 20 * dt; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.grav === undefined ? 120 : p.grav) * dt; p.life -= dt;
      const a = clamp(p.life * 2, 0, 1);
      if (p.glow) glow(ctx, p.x, p.y, p.r * 3, p.col, a * 0.6);
      circle(ctx, p.x, p.y, p.r, rgba(p.col, a));
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    // floaters
    ctx.font = `bold ${Math.round(this.size * 0.62)}px Cinzel, Georgia, serif`; ctx.textAlign = 'center';
    for (const f of this.floaters) {
      const t = (now - f.t0) / 1200;
      if (t >= 1) { f.done = true; continue; }
      const y = f.y - (1 - Math.pow(1 - t, 2)) * 36;
      ctx.globalAlpha = 1 - t * t;
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.strokeText(f.text, f.x, y);
      ctx.fillStyle = f.col; ctx.fillText(f.text, f.x, y);
      ctx.globalAlpha = 1;
    }
    this.floaters = this.floaters.filter((f) => !f.done);
    if (this.spellFlash) {
      const t = (now - this.spellFlash.t0) / 450;
      if (t < 1) { ctx.fillStyle = rgba(this.spellFlash.col, 0.22 * (1 - t)); ctx.fillRect(-20, -20, this.w + 40, this.h + 40); } else this.spellFlash = null;
    }
  }

  drawFx(now, layer) {
    const { ctx } = this;
    for (const f of this.fx) {
      const age = (now - f.t0) / 1000;
      if (age < 0) continue;
      switch (f.type) {
        case 'ring': {
          if (layer !== 'below') break;
          const d = 0.55; if (age > d) { f.done = true; break; }
          const t = age / d; const r = f.r * (0.3 + t * 0.9);
          ctx.strokeStyle = rgba(f.col, (1 - t) * 0.9); ctx.lineWidth = (f.thick ? 5 : 3) * (1 - t * 0.6);
          ctx.beginPath(); ctx.ellipse(f.x, f.y + this.size * 0.4, r, r * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
          glow(ctx, f.x, f.y, r, f.col, (1 - t) * 0.35);
          break;
        }
        case 'slash': {
          if (layer !== 'above') break;
          const d = 0.22; if (age > d) { f.done = true; break; }
          const st = this.b.getStack(f.id); const [cx, cy] = this.center(...this.pos(st));
          const t = age / d;
          ctx.save(); ctx.translate(cx, cy - this.size * 0.5); ctx.rotate(f.dir - 0.6 + t * 1.6);
          ctx.strokeStyle = rgba('#ffffff', 0.9 * (1 - t)); ctx.lineWidth = 3; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.arc(0, 0, this.size * 0.7, -0.9, 0.9); ctx.stroke();
          ctx.strokeStyle = rgba('#ff5a3a', 0.6 * (1 - t)); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, this.size * 0.55, -0.8, 0.8); ctx.stroke();
          ctx.restore();
          break;
        }
        case 'bolt': {
          if (layer !== 'above') break;
          const d = 0.35; if (age > d) { f.done = true; break; }
          const t = age / d;
          ctx.save(); ctx.strokeStyle = rgba('#ffffff', 1 - t); ctx.lineWidth = 3; ctx.shadowColor = f.col; ctx.shadowBlur = 14; ctx.lineJoin = 'round';
          ctx.beginPath(); ctx.moveTo(f.x + 40, -10);
          let x = f.x + 40, y = -10; const segs = 7;
          for (let i = 1; i <= segs; i++) { const ny = -10 + (f.y + 10) * (i / segs); const nx = f.x + (40 * (1 - i / segs)) + (i < segs ? (Math.sin(i * 7.3 + f.t0) * 16) : 0); ctx.lineTo(nx, ny); x = nx; y = ny; }
          ctx.stroke(); ctx.strokeStyle = rgba(f.col, 1 - t); ctx.lineWidth = 1.2; ctx.stroke();
          ctx.restore();
          glow(ctx, f.x, f.y, this.size * 1.2, f.col, (1 - t) * 0.6);
          break;
        }
        case 'arc': {
          if (layer !== 'above') break;
          const d = 0.3; if (age > d) { f.done = true; break; }
          const t = age / d;
          ctx.save(); ctx.strokeStyle = rgba('#ffffff', 1 - t); ctx.lineWidth = 2.5; ctx.shadowColor = f.col; ctx.shadowBlur = 10;
          ctx.beginPath(); ctx.moveTo(f.from[0], f.from[1] - this.size * 0.5);
          for (let i = 1; i <= 6; i++) { const k = i / 6; ctx.lineTo(f.from[0] + (f.to[0] - f.from[0]) * k + (i < 6 ? Math.sin(i * 5.1 + f.t0) * 10 : 0), f.from[1] - this.size * 0.5 + (f.to[1] - f.from[1]) * k + (i < 6 ? Math.cos(i * 3.7) * 8 : 0)); }
          ctx.stroke(); ctx.restore();
          break;
        }
        case 'meteor': {
          if (layer !== 'above') break;
          const d = 0.4; if (age > d) { f.done = true; break; }
          const t = age / d;
          const x = f.x + 160 * (1 - t), y = -40 + (f.y + 40) * t;
          glow(ctx, x, y, this.size * 1.4, '#ff8a2a', 0.7);
          circle(ctx, x, y, this.size * 0.45, rgrad(ctx, x - 3, y - 3, 1, this.size * 0.5, [[0, '#fff3c0'], [0.5, '#ff9a3a'], [1, '#b03010']]));
          for (let i = 1; i < 6; i++) circle(ctx, x + i * 9, y - i * 5, this.size * 0.35 * (1 - i / 7), rgba('#ff7a2a', 0.5 * (1 - i / 6)));
          if (t > 0.95 && !f.boom) { f.boom = true; for (let i = 0; i < 40; i++) { const a = Math.random() * Math.PI * 2, sp = 40 + Math.random() * 120; this.particles.push({ x: f.x, y: f.y - this.size * 0.3, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: 0.6 + Math.random() * 0.4, col: Math.random() < 0.5 ? '#ff8a2a' : '#ffd060', r: 2 + Math.random() * 3, grav: 140, glow: true }); } }
          break;
        }
        case 'rays': {
          if (layer !== 'above') break;
          const d = 0.6; if (age > d) { f.done = true; break; }
          const t = age / d;
          ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(t * 1.2);
          for (let i = 0; i < 10; i++) { ctx.rotate(Math.PI / 5); poly(ctx, [[0, 0], [-4, -this.size * 1.6 * Math.sin(t * Math.PI)], [4, -this.size * 1.6 * Math.sin(t * Math.PI)]], rgba(f.col, 0.45)); }
          ctx.restore(); glow(ctx, f.x, f.y, this.size * 1.2, f.col, (1 - t) * 0.5);
          break;
        }
        case 'swirl': {
          if (layer !== 'above') break;
          const d = 0.6; if (age > d) { f.done = true; break; }
          const t = age / d;
          ctx.save(); ctx.strokeStyle = rgba(f.col, 0.8 * (1 - t)); ctx.lineWidth = 2.5; ctx.lineCap = 'round';
          for (let k = 0; k < 3; k++) { ctx.beginPath(); const a0 = t * 9 + k * 2.1; ctx.ellipse(f.x, f.y, this.size * (0.5 + t * 0.6), this.size * (0.25 + t * 0.3), 0, a0, a0 + 1.6); ctx.stroke(); }
          ctx.restore();
          break;
        }
        case 'mist': {
          if (layer !== 'below') break;
          const d = 0.8; if (age > d) { f.done = true; break; }
          const t = age / d;
          for (let k = 0; k < 5; k++) { const a = k * 1.3 + t * 2; circle(ctx, f.x + Math.cos(a) * this.size * 0.5 * t, f.y + Math.sin(a) * this.size * 0.25 * t - t * 20, this.size * (0.3 + t * 0.3), rgba(f.col, 0.28 * (1 - t))); }
          break;
        }
      }
    }
    this.fx = this.fx.filter((f) => !f.done);
  }

  drawStack(st, now) {
    const { ctx, b } = this;
    const p = this.pos(st);
    const [cx, cy0] = this.center(p[0], p[1]);
    const idle = this.stackPos.has(st.id) || st.dead ? 0 : Math.sin(now / 420 + st.id * 1.7) * this.size * 0.02;
    const lift = (p[2] || 0) * this.size + idle;
    const S = this.size * 2.9 * (0.72 + st.unit.tier * 0.06);
    const flip = st.side === 1;
    const f = figure(st.unit, 96, flip);
    const dying = this.dying && this.dying.get(st.id);
    ctx.save();
    if (dying) { const t = clamp((now - dying) / 380, 0, 1); ctx.globalAlpha = 1 - t; ctx.translate(0, t * this.size * 0.3); }
    if (this.activeId === st.id) {
      const pulse = 0.5 + 0.5 * Math.sin(now / 180);
      glow(ctx, cx, cy0, this.size * 1.2, '#9fe0ff', 0.25 + pulse * 0.15);
      poly(ctx, hexPolygon(cx, cy0, this.size - 1.5), rgba('#9fe0ff', 0.14 + pulse * 0.1), '#bfeaff', 2);
    } else if (this.targetable && this.targetable.has(st.id)) {
      const pulse = 0.5 + 0.5 * Math.sin(now / 220);
      poly(ctx, hexPolygon(cx, cy0, this.size - 1.5), rgba('#ff5a46', 0.14 + pulse * 0.08), '#ff6a56', 1.6);
    }
    const fl = this.flash.get(st.id);
    const flashing = fl && now - fl > 0 && now - fl < 160;
    const fy = cy0 + this.size * 0.55 - S * 0.92 - lift;
    blit(ctx, f, cx - S / 2, fy, S, S);
    if (flashing) {
      ctx.save(); ctx.globalAlpha = 0.6;
      blit(ctx, whiteSilhouette(f), cx - S / 2, fy, S, S);
      ctx.restore();
    }
    if (!st.dead) {
      const col = st.side === 0 ? '#2d6fb3' : '#b33a2d';
      const txt = String(st.count);
      ctx.font = `bold ${Math.round(this.size * 0.42)}px Cinzel, serif`;
      const bw = Math.max(this.size * 0.8, ctx.measureText(txt).width + 10), bh = this.size * 0.48;
      const bx = cx + this.size * (flip ? -0.95 : 0.15), by = cy0 + this.size * 0.36;
      rrect(ctx, bx + 1, by + 2, bw, bh, 4, 'rgba(0,0,0,0.5)');
      rrect(ctx, bx, by, bw, bh, 4, lgrad(ctx, 0, by, 0, by + bh, [[0, lighten(col, 0.25)], [1, shade(col, 0.7)]]), 'rgba(255,230,160,0.7)', 1);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(txt, bx + bw / 2, by + bh / 2 + 1);
      ctx.textBaseline = 'alphabetic';
      let k = 0;
      for (const bf of st.buffs) {
        const sp = SPELLS[bf.id];
        const good = sp ? sp.kind === 'buff' : false;
        circle(ctx, cx - this.size * 0.7 + k * 8, cy0 - this.size * 0.9, 3.2, good ? '#8fe0a0' : '#e06a8f', 'rgba(0,0,0,0.7)', 1);
        k++;
      }
      if (st.defending) { glow(ctx, cx + this.size * 0.7, cy0 - this.size * 0.7, 8, '#9fd3ff', 0.6); ctx.fillStyle = 'rgba(220,235,255,0.95)'; ctx.font = `${Math.round(this.size * 0.5)}px sans-serif`; ctx.fillText('🛡', cx + this.size * 0.7, cy0 - this.size * 0.55); }
    }
    ctx.restore();
  }
}
