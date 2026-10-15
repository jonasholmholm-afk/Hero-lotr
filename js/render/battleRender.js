// Battlefield renderer with simple tweened animations.
import { BF_W, BF_H, hexCenter, hexPolygon, hexKey, pixelToHex } from '../combat/hex.js';
import { figure } from './figures.js';
import { mk, poly, circle, ellipse, rrect, line, lgrad, rgrad, rgba, shade } from './draw.js';
import { tileTexture, decorSprite } from './sprites.js';
import { T, D } from '../data/terrain.js';
import { SPELLS } from '../data/spells.js';
import { clamp } from '../core/utils.js';

export class BattleRenderer {
  constructor(canvas, battle) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.b = battle;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.anims = []; // {type, ...}
    this.floaters = [];
    this.particles = [];
    this.highlight = null; // Map of reachable keys
    this.hover = null;
    this.targetable = null; // Set of stack ids
    this.activeId = null;
    this.stackPos = new Map(); // id -> [x,y] (hex float coords during movement)
    this.flash = new Map(); // id -> time
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
    const c = mk(this.w, this.h); const ctx = c.getContext('2d');
    const t = this.b.terrain;
    const tex = tileTexture(t === T.WATER ? T.GRASS : t, 0);
    const pat = ctx.createPattern(tex, 'repeat');
    ctx.fillStyle = pat; ctx.fillRect(0, 0, this.w, this.h);
    // vignette + light
    const g = ctx.createRadialGradient(this.w / 2, this.h / 2, this.h * 0.2, this.w / 2, this.h / 2, this.w * 0.7);
    g.addColorStop(0, 'rgba(255,240,200,0.10)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, this.w, this.h);
    // hex grid
    for (let y = 0; y < BF_H; y++) for (let x = 0; x < BF_W; x++) {
      const [cx, cy] = this.center(x, y);
      poly(ctx, hexPolygon(cx, cy, this.size - 0.5), null, 'rgba(0,0,0,0.22)', 1);
    }
    // obstacles
    for (const [k, kind] of this.b.obstacles) {
      const x = k % 64, y = Math.floor(k / 64);
      const [cx, cy] = this.center(x, y);
      if (kind === 'wall') {
        const wallCol = this.b.sides[1].town && this.b.sides[1].town.faction === 'elves' ? '#d8d2bc' : '#4a4040';
        rrect(ctx, cx - this.size * 0.55, cy - this.size * 1.1, this.size * 1.1, this.size * 1.6, 3, lgrad(ctx, cx - this.size * 0.5, 0, cx + this.size * 0.5, 0, [[0, wallCol], [1, shade(wallCol, 0.6)]]), 'rgba(0,0,0,0.5)', 1);
        for (let i = 0; i < 3; i++) rrect(ctx, cx - this.size * 0.5 + i * this.size * 0.4, cy - this.size * 1.25, this.size * 0.25, this.size * 0.2, 1, wallCol);
      } else {
        const d = kind === 'tree' ? D.LEAFY : kind === 'dead' ? D.DEAD : kind === 'snowpine' ? D.SNOWPINE : D.ROCK;
        const sp = decorSprite(d, (x + y) & 3);
        const sc = this.size / 28;
        ctx.drawImage(sp, cx - sp.width * sc / 2, cy + this.size * 0.5 - sp.height * sc, sp.width * sc, sp.height * sc);
      }
    }
    this.bg = c;
    return c;
  }

  // -------- animation API --------
  pos(st) {
    const p = this.stackPos.get(st.id);
    return p || [st.x, st.y];
  }
  async animateMove(st, path, flying) {
    const start = this.pos(st);
    let from = start;
    const per = flying ? 80 : 150;
    if (flying && path.length > 1) {
      const to = path[path.length - 1];
      await this.tween(st.id, from, to, Math.max(250, path.length * 60), true);
      this.stackPos.delete(st.id);
      return;
    }
    for (const to of path) {
      await this.tween(st.id, from, to, per, false);
      from = to;
    }
    this.stackPos.delete(st.id);
  }
  tween(id, from, to, dur, arc) {
    return new Promise((resolve) => {
      const t0 = performance.now();
      this.anims.push({ id, from, to, t0, dur, arc, resolve });
    });
  }
  async animateAttack(att, def) {
    const a = this.pos(att), d = this.pos(def);
    const mid = [a[0] + (d[0] - a[0]) * 0.3, a[1] + (d[1] - a[1]) * 0.3];
    await this.tween(att.id, a, mid, 110, false);
    this.flash.set(def.id, performance.now());
    this.spawnHit(def);
    await this.tween(att.id, mid, a, 130, false);
    this.stackPos.delete(att.id);
  }
  async animateShot(att, def) {
    const [ax, ay] = this.center(...this.pos(att));
    const [dx, dy] = this.center(...this.pos(def));
    await new Promise((resolve) => this.anims.push({ proj: true, from: [ax, ay - this.size * 0.6], to: [dx, dy - this.size * 0.5], t0: performance.now(), dur: 320, resolve }));
    this.flash.set(def.id, performance.now());
    this.spawnHit(def);
  }
  async animateSpell(spellId, targets) {
    const sp = SPELLS[spellId];
    const col = sp.icon.c;
    for (const id of targets) {
      const st = this.b.getStack(id);
      const [cx, cy] = this.center(...this.pos(st));
      for (let i = 0; i < 18; i++) {
        const a = Math.random() * Math.PI * 2, sp2 = 20 + Math.random() * 60;
        this.particles.push({ x: cx, y: cy - this.size * 0.5, vx: Math.cos(a) * sp2, vy: Math.sin(a) * sp2 - 20, life: 0.7, col, r: 2 + Math.random() * 3 });
      }
      this.flash.set(id, performance.now());
    }
    this.spellFlash = { t0: performance.now(), col };
    await new Promise((r) => setTimeout(r, 450));
  }
  floater(st, text, col = '#fff') {
    const [cx, cy] = this.center(...this.pos(st));
    this.floaters.push({ x: cx, y: cy - this.size * 1.2, text, col, t0: performance.now() });
  }
  spawnHit(st) {
    const [cx, cy] = this.center(...this.pos(st));
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2, sp = 30 + Math.random() * 60;
      this.particles.push({ x: cx, y: cy - this.size * 0.5, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, life: 0.5, col: '#ff6a4a', r: 1.5 + Math.random() * 2 });
    }
  }
  async animateDeath(st) {
    this.dying = this.dying || new Map();
    this.dying.set(st.id, performance.now());
    await new Promise((r) => setTimeout(r, 350));
  }

  // -------- draw --------
  draw(dt) {
    const { ctx, b } = this;
    const now = performance.now();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.drawImage(this.background(), 0, 0);
    // progress tweens
    for (const a of this.anims) {
      if (a.proj) continue;
      const t = clamp((now - a.t0) / a.dur, 0, 1);
      const x = a.from[0] + (a.to[0] - a.from[0]) * t, y = a.from[1] + (a.to[1] - a.from[1]) * t;
      this.stackPos.set(a.id, [x, y, a.arc ? Math.sin(t * Math.PI) * 1.2 : 0]);
      if (t >= 1) { a.done = true; a.resolve(); }
    }
    this.anims = this.anims.filter((a) => !a.done);
    // highlights
    if (this.highlight) {
      for (const k of this.highlight.keys()) {
        const x = k % 64, y = Math.floor(k / 64);
        const [cx, cy] = this.center(x, y);
        poly(ctx, hexPolygon(cx, cy, this.size - 1), 'rgba(255,235,150,0.16)', 'rgba(255,235,150,0.45)', 1);
      }
    }
    if (this.hover) {
      const [cx, cy] = this.center(this.hover[0], this.hover[1]);
      poly(ctx, hexPolygon(cx, cy, this.size - 1), 'rgba(255,255,255,0.12)', '#fff', 1.5);
    }
    // stacks sorted by y
    const stacks = b.stacks.filter((s) => !s.dead || (this.dying && this.dying.has(s.id) && now - this.dying.get(s.id) < 400)).sort((p, q) => this.pos(p)[1] - this.pos(q)[1] || p.x - q.x);
    for (const st of stacks) this.drawStack(st, now);
    // projectiles
    for (const a of this.anims) {
      if (!a.proj) continue;
      const t = clamp((now - a.t0) / a.dur, 0, 1);
      const x = a.from[0] + (a.to[0] - a.from[0]) * t, y = a.from[1] + (a.to[1] - a.from[1]) * t - Math.sin(t * Math.PI) * 30;
      const ang = Math.atan2(a.to[1] - a.from[1], a.to[0] - a.from[0]);
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      line(ctx, -10, 0, 10, 0, '#e8dcc0', 2); poly(ctx, [[10, -3], [16, 0], [10, 3]], '#c9ccd2');
      ctx.restore();
      if (t >= 1) { a.done = true; a.resolve(); }
    }
    this.anims = this.anims.filter((a) => !a.done);
    // particles
    for (const p of this.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 120 * dt; p.life -= dt; circle(ctx, p.x, p.y, p.r, rgba(p.col.startsWith('#') ? p.col : '#ffffff', clamp(p.life * 2, 0, 1))); }
    this.particles = this.particles.filter((p) => p.life > 0);
    // floaters
    ctx.font = `bold ${Math.round(this.size * 0.62)}px Cinzel, Georgia, serif`; ctx.textAlign = 'center';
    for (const f of this.floaters) {
      const t = (now - f.t0) / 1100;
      if (t >= 1) { f.done = true; continue; }
      ctx.globalAlpha = 1 - t * t;
      ctx.fillStyle = '#000'; ctx.fillText(f.text, f.x + 1, f.y - t * 30 + 1);
      ctx.fillStyle = f.col; ctx.fillText(f.text, f.x, f.y - t * 30);
      ctx.globalAlpha = 1;
    }
    this.floaters = this.floaters.filter((f) => !f.done);
    if (this.spellFlash) {
      const t = (now - this.spellFlash.t0) / 400;
      if (t < 1) { ctx.fillStyle = rgba(this.spellFlash.col, 0.25 * (1 - t)); ctx.fillRect(0, 0, this.w, this.h); } else this.spellFlash = null;
    }
  }

  drawStack(st, now) {
    const { ctx, b } = this;
    const p = this.pos(st);
    const [cx, cy0] = this.center(p[0], p[1]);
    const cy = cy0 - (p[2] || 0) * this.size;
    const S = this.size * 2.9 * (0.72 + st.unit.tier * 0.06);
    const flip = st.side === 1;
    const f = figure(st.unit, 96, flip);
    const dying = this.dying && this.dying.get(st.id);
    ctx.save();
    if (dying) ctx.globalAlpha = clamp(1 - (now - dying) / 350, 0, 1);
    if (this.activeId === st.id) {
      const pulse = 0.5 + 0.5 * Math.sin(now / 180);
      poly(ctx, hexPolygon(cx, cy0, this.size - 1), rgba('#9fe0ff', 0.12 + pulse * 0.1), '#9fe0ff', 2);
    } else if (this.targetable && this.targetable.has(st.id)) {
      poly(ctx, hexPolygon(cx, cy0, this.size - 1), 'rgba(255,90,70,0.18)', '#ff5a46', 1.5);
    }
    const fl = this.flash.get(st.id);
    const flashing = fl && now - fl < 180;
    if (st.side === 0) { /* attacker */ }
    ctx.drawImage(f, cx - S / 2, cy0 + this.size * 0.55 - S * 0.92 - (p[2] || 0) * this.size, S, S);
    if (flashing) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = 0.6; ctx.fillStyle = '#fff';
      ctx.fillRect(cx - S / 2, cy0 + this.size * 0.55 - S * 0.92, S, S);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }
    // count badge
    if (!st.dead) {
      const col = st.side === 0 ? '#2d6fb3' : '#b33a2d';
      const bw = Math.max(this.size * 0.9, String(st.count).length * this.size * 0.42 + 6), bh = this.size * 0.5;
      const bx = cx + (flip ? -bw : 0) * 0 + this.size * (flip ? -0.95 : 0.1), by = cy0 + this.size * 0.35;
      rrect(ctx, bx, by, bw, bh, 3, col, 'rgba(0,0,0,0.6)', 1);
      ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.round(bh * 0.8)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(st.count), bx + bw / 2, by + bh / 2 + 1);
      ctx.textBaseline = 'alphabetic';
      // buff indicators
      let k = 0;
      for (const bf of st.buffs) {
        const sp = SPELLS[bf.id];
        const good = sp ? sp.kind === 'buff' : false;
        circle(ctx, cx - this.size * 0.7 + k * 7, cy0 - this.size * 0.85, 3, good ? '#8fe0a0' : '#e06a8f', 'rgba(0,0,0,0.6)', 1);
        k++;
      }
      if (st.defending) { ctx.fillStyle = 'rgba(200,220,255,0.9)'; ctx.font = `${Math.round(this.size * 0.5)}px sans-serif`; ctx.fillText('🛡', cx + this.size * 0.7, cy0 - this.size * 0.7); }
    }
    ctx.restore();
  }
}
