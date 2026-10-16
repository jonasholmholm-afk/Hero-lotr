// Painted backdrop scenes: main menu and town banner.
import { mk, circle, ellipse, rrect, line, lgrad, rgrad, rgba, shade, lighten, glow, poly } from './draw.js';
import { townSprite, decorSprite, terrainSheet, tileTexture } from './sprites.js';
import { D, T } from '../data/terrain.js';
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

export function drawTownBanner(canvas, town, fortLevel, mageLevel) {
  const w = canvas.clientWidth || 600, h = 190;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = w * dpr; canvas.height = h * dpr;
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  const elf = town.faction === 'elves';
  const horizon = h * 0.56;
  // sky
  ctx.fillStyle = lgrad(ctx, 0, 0, 0, horizon + 10, elf ? [[0, '#0f1c2b'], [0.55, '#4a7a86'], [0.85, '#e9cf94'], [1, '#f6e6b4']] : [[0, '#06050a'], [0.5, '#3a1410'], [0.85, '#c4541f'], [1, '#f0a04a']]);
  ctx.fillRect(0, 0, w, horizon + 10);
  // sun / forge glow with rays
  const sx = w * 0.74, sy = h * 0.3;
  ctx.save(); ctx.translate(sx, sy);
  for (let i = 0; i < 14; i++) { ctx.rotate(Math.PI / 7); poly(ctx, [[0, 0], [-7, -h], [7, -h]], elf ? 'rgba(255,240,190,0.07)' : 'rgba(255,150,80,0.07)'); }
  ctx.restore();
  glow(ctx, sx, sy, 90, elf ? '#fff1c0' : '#ff9a50', 0.55);
  circle(ctx, sx, sy, 18, rgrad(ctx, sx, sy, 2, 20, elf ? [[0, '#fffbe6'], [1, '#ffe08a']] : [[0, '#ffd9a0'], [1, '#ff7a30']]));
  // clouds / smoke
  for (let i = 0; i < 7; i++) { const x = (i * 151 + 30) % w, y = 14 + (i * 29) % 46; for (let k = 0; k < 5; k++) ellipse(ctx, x + k * 18, y + Math.sin(k * 1.7) * 4, 22 - Math.abs(k - 2) * 5, 8, elf ? 'rgba(255,255,255,0.13)' : 'rgba(60,30,25,0.4)'); }
  // distant painted mountains, hazed
  const mtn = decorSprite(D.MOUNTAIN, 0);
  const nm = Math.max(4, Math.round(w / 230));
  for (let i = 0; i < nm; i++) {
    const sc = 0.42 + ((i * 5 + town.x) % 3) * 0.12; const x = (i + 0.5) * (w / nm) + (((i * 37 + town.x * 11) % 60) - 30); const y = horizon + 6 + ((i * 3) % 3) * 3;
    if (Math.abs(x - w / 2) < 90) continue;
    ctx.globalAlpha = 0.75; ctx.drawImage(mtn, x - mtn.lw * sc / 2, y - mtn.lh * sc, mtn.lw * sc, mtn.lh * sc); ctx.globalAlpha = 1;
  }
  ctx.fillStyle = lgrad(ctx, 0, horizon - 70, 0, horizon + 8, [[0, elf ? 'rgba(190,215,230,0)' : 'rgba(120,60,40,0)'], [1, elf ? 'rgba(190,215,230,0.7)' : 'rgba(120,60,40,0.7)']]);
  ctx.fillRect(0, horizon - 70, w, 78);
  // ground from the painted terrain texture, flattened for perspective
  const gt = elf ? T.GRASS : T.ASH;
  const sheet = terrainSheet(gt, 48) || tileTexture(gt, 96);
  ctx.save(); ctx.translate(0, horizon); ctx.scale(1, 0.62);
  ctx.fillStyle = ctx.createPattern(sheet, 'repeat'); ctx.fillRect(0, 0, w, (h - horizon) / 0.62 + 4);
  ctx.restore();
  ctx.fillStyle = lgrad(ctx, 0, horizon, 0, h, [[0, elf ? 'rgba(220,230,200,0.45)' : 'rgba(90,40,30,0.5)'], [0.35, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.35)']]);
  ctx.fillRect(0, horizon, w, h - horizon);
  // painted trees in three rows, keeping the middle free for the town
  const kinds = elf ? [D.GOLDEN, D.LEAFY, D.PINE, D.LEAFY] : [D.DEAD, D.ROCK, D.DEAD, D.ROCK];
  const rows = [[0.64, 0.42, 7, 29], [0.8, 0.62, 5, 61], [1.04, 1.0, 4, 97]];
  rows.forEach(([ry, sc0, step, seed], ri) => {
    const n = Math.ceil(w / (step * 16)) + 2;
    for (let i = 0; i < n; i++) {
      const x = ((i * step * 16 + seed * (ri + 1) + town.y * 7) % (w + 120)) - 60;
      if (Math.abs(x - w / 2) < 135 + ri * 50) continue;
      const sp = decorSprite(kinds[(i + ri) % 4], (i + seed) & 3); const sc = sc0 + ((i * 7 + seed) % 3) * 0.08;
      const y = h * ry + ((i * 13) % 5) * 2;
      ctx.drawImage(sp, x - sp.lw * sc / 2, y - sp.lh * sc, sp.lw * sc, sp.lh * sc);
    }
  });
  // the town itself
  const sp = townSprite(town.faction, fortLevel, null);
  const sc = Math.min(1.05, (h * 0.9) / sp.lh);
  ellipse(ctx, w / 2, h - 9, sp.lw * sc * 0.42, 9, 'rgba(0,0,0,0.35)');
  ctx.drawImage(sp, w / 2 - sp.lw * sc / 2, h - sp.lh * sc - 3, sp.lw * sc, sp.lh * sc);
  // floating motes and vignette
  for (let i = 0; i < 26; i++) { const x = (i * 97 + 13) % w, y = (i * 53 + 7) % h; glow(ctx, x, y, 3 + (i % 3), elf ? '#ffe9a0' : '#ff9a50', 0.25); }
  ctx.fillStyle = rgrad(ctx, w / 2, h * 0.45, h * 0.3, w * 0.7, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.45)']]);
  ctx.fillRect(0, 0, w, h);
}
