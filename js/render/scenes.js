// Painted backdrop scenes: main menu and town banner.
import { mk, circle, ellipse, rrect, line, lgrad, rgrad, rgba, shade, lighten, glow, poly } from './draw.js';
import { townSprite, decorSprite } from './sprites.js';
import { D } from '../data/terrain.js';
import { Noise } from '../core/noise.js';
import { UNITS } from '../data/units.js';
import { roman } from '../core/utils.js';

const nz = new Noise(515);

function hills(ctx, w, h, baseY, amp, col, seed, step = 12) {
  ctx.beginPath(); ctx.moveTo(0, h);
  for (let x = 0; x <= w + step; x += step) ctx.lineTo(x, baseY + (nz.fbm(x / 160 + seed, seed, 3) - 0.5) * amp * 2);
  ctx.lineTo(w, h); ctx.closePath(); ctx.fillStyle = col; ctx.fill();
}
function mountains(ctx, w, baseY, hgt, col, snow, seed) {
  ctx.beginPath(); ctx.moveTo(0, baseY);
  const pts = [];
  for (let x = 0; x <= w + 40; x += 40) { const y = baseY - Math.abs(nz.fbm(x / 120 + seed, seed * 3, 2) - 0.2) * hgt * 2 - 10; pts.push([x, y]); ctx.lineTo(x, y); }
  ctx.lineTo(w, baseY + 40); ctx.lineTo(0, baseY + 40); ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  if (snow) for (const [x, y] of pts) if (y < baseY - hgt * 0.9) poly(ctx, [[x - 14, y + 16], [x, y], [x + 14, y + 16], [x + 6, y + 12], [x, y + 18], [x - 6, y + 12]], snow);
}

export class MenuScene {
  constructor(canvas) { this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.static = null; this.t0 = performance.now(); this.leaves = []; }
  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.w = Math.max(1, Math.round(r.width)); this.h = Math.max(1, Math.round(r.height));
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = this.w * this.dpr; this.canvas.height = this.h * this.dpr;
    this.static = null;
  }
  paintStatic() {
    const w = this.w, h = this.h;
    const c = mk(w * this.dpr, h * this.dpr); const ctx = c.getContext('2d'); ctx.scale(this.dpr, this.dpr);
    // sky: left dawn-green over Loren, right smouldering red over Mordor
    ctx.fillStyle = lgrad(ctx, 0, 0, 0, h, [[0, '#070a12'], [0.45, '#17212a'], [0.75, '#2d3b33'], [1, '#1a2419']]); ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = lgrad(ctx, 0, 0, w, 0, [[0, 'rgba(60,110,70,0.35)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(150,50,20,0.4)']]); ctx.fillRect(0, 0, w, h);
    // stars
    for (let i = 0; i < 140; i++) { const x = (i * 7919) % w, y = ((i * 104729) % Math.round(h * 0.6)); circle(ctx, x, y, 0.6 + (i % 3) * 0.4, `rgba(255,245,220,${0.35 + (i % 5) * 0.12})`); }
    // moon
    glow(ctx, w * 0.62, h * 0.2, 90, '#cfe3ff', 0.35);
    circle(ctx, w * 0.62, h * 0.2, 26, rgrad(ctx, w * 0.62 - 8, h * 0.2 - 8, 2, 30, [[0, '#ffffff'], [0.7, '#dbe8f5'], [1, '#aac2da']]));
    for (const [dx, dy, r] of [[-8, 4, 5], [6, -7, 4], [9, 8, 3], [-2, -11, 2.5]]) circle(ctx, w * 0.62 + dx, h * 0.2 + dy, r, 'rgba(150,175,200,0.45)');
    // far mountains
    mountains(ctx, w, h * 0.66, h * 0.26, '#1a2430', '#5f7187', 1.3);
    mountains(ctx, w, h * 0.72, h * 0.2, '#131b25', null, 2.7);
    // Mordor side: fortress silhouette & fire glow
    glow(ctx, w * 0.86, h * 0.7, 140, '#ff6a2a', 0.35);
    const orc = townSprite('orcs', 3, null);
    ctx.drawImage(orc, w * 0.86 - orc.lw * 0.9 / 2, h * 0.76 - orc.lh * 0.9, orc.lw * 0.9, orc.lh * 0.9);
    // hills
    hills(ctx, w, h, h * 0.78, 12, '#1f2e22', 3.1);
    hills(ctx, w, h, h * 0.85, 10, '#27402a', 5.2);
    // Loren side: golden trees
    const gold = [D.GOLDEN, D.GOLDEN, D.LEAFY];
    for (let i = 0; i < 9; i++) { const sp = decorSprite(gold[i % 3], i & 3); const sc = 0.9 + ((i * 13) % 5) * 0.12; const x = w * 0.04 + i * w * 0.045 + ((i * 29) % 17); const y = h * (0.78 + ((i * 7) % 4) * 0.03); ctx.drawImage(sp, x - sp.lw * sc / 2, y - sp.lh * sc, sp.lw * sc, sp.lh * sc); }
    const elf = townSprite('elves', 2, null);
    ctx.drawImage(elf, w * 0.16 - elf.lw * 0.8 / 2, h * 0.8 - elf.lh * 0.8, elf.lw * 0.8, elf.lh * 0.8);
    glow(ctx, w * 0.16, h * 0.62, 120, '#ffe6a0', 0.25);
    // dead trees right
    for (let i = 0; i < 5; i++) { const sp = decorSprite(D.DEAD, i & 3); const x = w * 0.72 + i * w * 0.06; ctx.drawImage(sp, x - sp.lw / 2, h * 0.86 - sp.lh, sp.lw, sp.lh); }
    hills(ctx, w, h, h * 0.92, 8, '#182b1c', 8.8);
    // vignette
    const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, w * 0.75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.7)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    return c;
  }
  draw() {
    if (!this.static) this.static = this.paintStatic();
    const { ctx, w, h } = this; const t = (performance.now() - this.t0) / 1000;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.drawImage(this.static, 0, 0, w, h);
    // drifting mist bands
    for (let k = 0; k < 3; k++) {
      const y = h * (0.7 + k * 0.08), sp = 8 + k * 5, a = 0.12 - k * 0.03;
      ctx.fillStyle = rgba('#cfe0e8', a);
      for (let i = -1; i < 5; i++) { const x = ((i * w * 0.3 + t * sp) % (w * 1.3)) - w * 0.15; ellipse(ctx, x, y + Math.sin(t * 0.3 + i) * 4, w * 0.2, 14 + k * 6, rgba('#cfe0e8', a)); }
    }
    // leaves & embers
    if (this.leaves.length < 40) this.leaves.push({ x: Math.random() * w, y: -10, vx: 10 + Math.random() * 20, vy: 15 + Math.random() * 20, ph: Math.random() * 6, ember: Math.random() > 0.55, life: 0 });
    for (const p of this.leaves) {
      p.life += 1 / 60; p.x += (p.vx + Math.sin(t + p.ph) * 12) / 60; p.y += (p.ember ? -p.vy : p.vy) / 60;
      if (p.ember && p.life < 0.01) { p.x = w * 0.7 + Math.random() * w * 0.3; p.y = h * 0.8; }
      if (p.ember) { glow(ctx, p.x, p.y, 5, '#ff8a3a', 0.4); circle(ctx, p.x, p.y, 1.2, '#ffd080'); }
      else { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(t * 2 + p.ph); ctx.fillStyle = 'rgba(255,211,106,0.85)'; ctx.beginPath(); ctx.ellipse(0, 0, 4, 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
      if (p.y > h + 10 || p.y < -20 || p.x > w + 20) { p.x = Math.random() * w; p.y = p.ember ? h * 0.8 : -10; p.life = 0; }
    }
  }
}

export function drawTownBanner(canvas, town, fortLevel, mageLevel, dwellingUnit) {
  const w = canvas.clientWidth || 600, h = 160;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = w * dpr; canvas.height = h * dpr;
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  const elf = town.faction === 'elves';
  ctx.fillStyle = lgrad(ctx, 0, 0, 0, h, elf ? [[0, '#14262a'], [0.45, '#4f7a62'], [0.8, '#d9c27a'], [1, '#e8d79a']] : [[0, '#0e0808'], [0.45, '#5a2418'], [0.8, '#c8612a'], [1, '#e08a3a']]);
  ctx.fillRect(0, 0, w, h);
  // sun with rays
  const sx = w * 0.78, sy = h * 0.34;
  ctx.save(); ctx.translate(sx, sy);
  for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); poly(ctx, [[0, 0], [-6, -h * 0.9], [6, -h * 0.9]], elf ? 'rgba(255,240,190,0.08)' : 'rgba(255,160,90,0.08)'); }
  ctx.restore();
  glow(ctx, sx, sy, 60, elf ? '#fff1c0' : '#ffb080', 0.6);
  circle(ctx, sx, sy, 20, rgrad(ctx, sx, sy, 2, 22, elf ? [[0, '#fffbe6'], [1, '#ffe08a']] : [[0, '#ffd9a0'], [1, '#ff8a40']]));
  // clouds
  for (let i = 0; i < 5; i++) { const x = (i * 137 + 40) % w, y = 20 + (i * 23) % 40; for (let k = 0; k < 4; k++) ellipse(ctx, x + k * 16, y + Math.sin(k) * 3, 18 - Math.abs(k - 1.5) * 4, 7, elf ? 'rgba(255,255,255,0.14)' : 'rgba(80,50,40,0.35)'); }
  // far mountains & hills
  mountains(ctx, w, h * 0.66, h * 0.28, elf ? '#3a5a62' : '#2a1a1a', elf ? '#d6e6ee' : null, town.x * 0.01 + 1);
  hills(ctx, w, h, h * 0.68, 12, elf ? '#2e5a3a' : '#2c2220', town.y * 0.02 + 2);
  hills(ctx, w, h, h * 0.78, 10, elf ? '#3f7a46' : '#3a2e28', town.y * 0.02 + 4);
  hills(ctx, w, h, h * 0.88, 8, elf ? '#4f8a3a' : '#4a4544', town.y * 0.02 + 6);
  // trees scattered
  const kinds = elf ? [D.GOLDEN, D.LEAFY, D.PINE] : [D.DEAD, D.ROCK, D.DEAD];
  for (let i = 0; i < 14; i++) { const sp = decorSprite(kinds[i % 3], i & 3); const sc = 0.45 + ((i * 7) % 4) * 0.12; const x = ((i * 97 + 20) % w); if (Math.abs(x - w / 2) < 110) continue; const y = h * (0.74 + ((i * 11) % 5) * 0.035); ctx.drawImage(sp, x - sp.lw * sc / 2, y - sp.lh * sc, sp.lw * sc, sp.lh * sc); }
  // town
  const sp = townSprite(town.faction, fortLevel, null);
  const sc = 0.82;
  ctx.drawImage(sp, w / 2 - sp.lw * sc / 2, h - sp.lh * sc + 6, sp.lw * sc, sp.lh * sc);
  // buildings as little houses along the foreground
  const b = town.buildings;
  let x = 34;
  const house = (label, hgt, col, spire = false) => {
    rrect(ctx, x + 2, h - 16 - hgt + 3, 34, hgt, 3, 'rgba(0,0,0,0.3)');
    rrect(ctx, x, h - 18 - hgt, 34, hgt, 3, lgrad(ctx, x, 0, x + 34, 0, [[0, lighten(col, 0.2)], [1, shade(col, 0.6)]]), 'rgba(0,0,0,0.5)', 1);
    if (spire) poly(ctx, [[x - 2, h - 18 - hgt], [x + 17, h - 18 - hgt - 26], [x + 36, h - 18 - hgt]], shade(col, 0.55), 'rgba(0,0,0,0.5)', 1);
    else poly(ctx, [[x - 4, h - 18 - hgt], [x + 17, h - 18 - hgt - 14], [x + 38, h - 18 - hgt]], shade(col, 0.6), 'rgba(0,0,0,0.5)', 1);
    glow(ctx, x + 17, h - 28, 10, '#ffd27a', 0.5); rrect(ctx, x + 13, h - 32, 8, 10, 2, '#ffe28a');
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = '9px Cinzel, serif'; ctx.textAlign = 'center'; ctx.shadowColor = '#000'; ctx.shadowBlur = 3; ctx.fillText(label, x + 17, h - 6); ctx.shadowBlur = 0;
    x += 48;
  };
  const col = elf ? '#e8e0c8' : '#5a4a3a';
  if (b.tavern) house('Taverne', 26, col);
  if (b.market) house('Marked', 22, col);
  if (mageLevel) house(`Magi ${roman(mageLevel)}`, 30 + mageLevel * 8, elf ? '#cfd8ff' : '#6a4a6a', true);
  if (b.silo) house('Lager', 24, col);
  if (b.special) house('Special', 28, elf ? '#9ad56a' : '#8a2a2a');
  x = w - 50;
  for (let i = 6; i >= 0; i--) {
    const dw = 'dw' + (i + 1); if (!b[dw]) continue;
    const hgt = 16 + i * 3;
    rrect(ctx, x + 2, h - 16 - hgt + 3, 28, hgt, 3, 'rgba(0,0,0,0.3)');
    rrect(ctx, x, h - 18 - hgt, 28, hgt, 3, lgrad(ctx, x, 0, x + 28, 0, [[0, elf ? '#b8d8a0' : '#4a4a4a'], [1, elf ? '#7a9a60' : '#2a2a2a']]), 'rgba(0,0,0,0.5)', 1);
    poly(ctx, [[x - 3, h - 18 - hgt], [x + 14, h - 18 - hgt - 10], [x + 31, h - 18 - hgt]], elf ? '#6a8a50' : '#1a1a1a', 'rgba(0,0,0,0.5)', 1);
    glow(ctx, x + 14, h - 26, 8, '#ffd27a', 0.4); rrect(ctx, x + 11, h - 29, 6, 7, 2, '#ffe28a');
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = '9px Cinzel, serif'; ctx.textAlign = 'center'; ctx.shadowColor = '#000'; ctx.shadowBlur = 3; ctx.fillText(roman(i + 1), x + 14, h - 6); ctx.shadowBlur = 0;
    x -= 36;
  }
  // foreground path
  ctx.strokeStyle = 'rgba(120,95,60,0.55)'; ctx.lineWidth = 10; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(w / 2, h - 6); ctx.quadraticCurveTo(w / 2 + 30, h + 10, w / 2 + 120, h + 6); ctx.stroke();
  // vignette
  const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, w * 0.7); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}
