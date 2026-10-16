// Procedural hero portraits (64-unit space, rasterised at 2×).
import { mk, mkS, poly, circle, ellipse, rrect, line, lgrad, rgrad, shade, lighten, rgba, glow } from './draw.js';
import { HEROES } from '../data/heroes.js';
import { FACTIONS } from '../data/factions.js';
import { assetCanvas } from './assets.js';

const cache = new Map();
export function clearPortraitCache() { cache.clear(); }
export function portrait(defId, size = 64) {
  const key = `${defId}:${size}`;
  if (cache.has(key)) return cache.get(key);
  const asset = assetCanvas(`portraits/${defId}`, size, size);
  if (asset) { cache.set(key, asset); return asset; }
  const def = HEROES[defId];
  const p = def.portrait;
  const c = mkS(size, size); const ctx = c.getContext('2d');
  ctx.scale(size / 64, size / 64);
  const elf = def.faction === 'elves';
  // ---- background scene ----
  ctx.fillStyle = rgrad(ctx, 32, 22, 4, 52, [[0, lighten(p.bg, 0.35)], [1, shade(p.bg, 0.5)]]);
  ctx.fillRect(0, 0, 64, 64);
  if (elf) {
    for (let i = 0; i < 9; i++) { const x = (i * 23) % 64, y = (i * 17) % 40; glow(ctx, x, y, 7 + (i % 3) * 3, '#ffe9a0', 0.35); }
    ctx.save(); ctx.globalAlpha = 0.12; ctx.fillStyle = '#fff6c8'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(10 + i * 14, -4); ctx.lineTo(18 + i * 14, -4); ctx.lineTo(4 + i * 14 + 30, 64); ctx.lineTo(-4 + i * 14 + 30, 64); ctx.closePath(); ctx.fill(); } ctx.restore();
  } else {
    for (let i = 0; i < 7; i++) { const x = (i * 29) % 64, y = 10 + (i * 19) % 40; glow(ctx, x, y, 4 + (i % 3) * 2, '#ff8a3a', 0.5); circle(ctx, x, y, 0.9, '#ffd080'); }
    for (let k = 0; k < 4; k++) circle(ctx, 48 + k * 3, 30 - k * 9, 7 + k * 2, `rgba(60,50,50,${0.25 - k * 0.05})`);
  }
  // ---- shoulders / clothing ----
  const cloak = elf ? '#2f5d3a' : '#3a2a20';
  ctx.beginPath(); ctx.moveTo(2, 64); ctx.quadraticCurveTo(8, 42, 32, 41); ctx.quadraticCurveTo(56, 42, 62, 64); ctx.closePath();
  ctx.fillStyle = lgrad(ctx, 0, 41, 0, 64, [[0, lighten(cloak, 0.3)], [1, shade(cloak, 0.5)]]); ctx.fill();
  if (def.cls === 'might') {
    // pauldrons
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(32 + s * 20, 52, 11, 7, s * 0.4, 0, Math.PI * 2); ctx.fillStyle = lgrad(ctx, 32 + s * 30, 44, 32 + s * 10, 60, [[0, elf ? '#e8e0c0' : '#8a8a90'], [1, elf ? '#8a7a4a' : '#2a2a30']]); ctx.fill(); line(ctx, 32 + s * 12, 50, 32 + s * 28, 54, elf ? '#d9a93a' : '#4a4a50', 1.2); }
    rrect(ctx, 22, 48, 20, 16, 3, lgrad(ctx, 22, 0, 42, 0, [[0, elf ? '#c8c0a0' : '#5a5a60'], [1, elf ? '#7a7050' : '#1a1a20']]));
    line(ctx, 32, 48, 32, 64, elf ? '#d9a93a' : '#8a8a90', 1.2);
  } else {
    // robe with gold trim and clasp
    line(ctx, 14, 64, 32, 44, elf ? '#d9a93a' : '#c8a060', 1.5); line(ctx, 50, 64, 32, 44, elf ? '#d9a93a' : '#c8a060', 1.5);
    circle(ctx, 32, 47, 2.6, rgrad(ctx, 31, 46, 0.5, 3, [[0, '#fff'], [1, elf ? '#7fc8ff' : '#80ff40']]));
  }
  // ---- neck ----
  rrect(ctx, 26, 35, 12, 11, 3, lgrad(ctx, 0, 35, 0, 46, [[0, shade(p.skin, 0.75)], [1, shade(p.skin, 0.55)]]));
  // ---- hair back ----
  const longHair = p.style === 'long' || p.style === 'wild' || p.style === 'crown' || p.style === 'antlers';
  if (longHair) {
    ctx.beginPath(); ctx.moveTo(17, 22); ctx.quadraticCurveTo(12, 50, 18, 58); ctx.lineTo(46, 58); ctx.quadraticCurveTo(52, 50, 47, 22); ctx.closePath();
    ctx.fillStyle = lgrad(ctx, 17, 0, 47, 0, [[0, shade(p.hair, 0.6)], [0.4, p.hair], [1, shade(p.hair, 0.65)]]); ctx.fill();
    for (let i = 0; i < 6; i++) line(ctx, 19 + i * 5, 26, 18 + i * 5, 54, i % 2 ? shade(p.hair, 0.6) : lighten(p.hair, 0.15), 1);
    if (p.style === 'wild') for (let i = 0; i < 7; i++) line(ctx, 17 + i * 5, 22, 10 + i * 7, 5 + (i % 2) * 6, p.hair, 3);
  }
  // ---- face ----
  ctx.beginPath(); ctx.moveTo(20, 24); ctx.quadraticCurveTo(20, 8, 32, 8); ctx.quadraticCurveTo(44, 8, 44, 24); ctx.quadraticCurveTo(44, 36, 32, 41); ctx.quadraticCurveTo(20, 36, 20, 24); ctx.closePath();
  ctx.fillStyle = rgrad(ctx, 28, 20, 2, 26, [[0, lighten(p.skin, 0.18)], [0.6, p.skin], [1, shade(p.skin, 0.72)]]); ctx.fill();
  // cheek & jaw shading
  ctx.fillStyle = rgba(shade(p.skin, 0.6), 0.28); ctx.beginPath(); ctx.ellipse(40, 29, 5, 7, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = rgba('#ff8a8a', elf ? 0.12 : 0.05); ctx.beginPath(); ctx.ellipse(26, 29, 4, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  // ears
  if (elf) { poly(ctx, [[20.5, 24], [13, 17], [21, 30]], p.skin); poly(ctx, [[43.5, 24], [51, 17], [43, 30]], p.skin); line(ctx, 15, 18, 20, 26, shade(p.skin, 0.7), 0.8); line(ctx, 49, 18, 44, 26, shade(p.skin, 0.7), 0.8); }
  else { ellipse(ctx, 20, 26, 3, 4.5, p.skin); ellipse(ctx, 44, 26, 3, 4.5, p.skin); ellipse(ctx, 20.5, 26, 1.3, 2.4, shade(p.skin, 0.75)); ellipse(ctx, 43.5, 26, 1.3, 2.4, shade(p.skin, 0.75)); }
  // eyes
  const ey = 25;
  for (const x of [27, 37]) {
    ellipse(ctx, x, ey, 3.4, 2.1, '#f3f1ea');
    circle(ctx, x + 0.4, ey, 1.9, rgrad(ctx, x, ey - 0.5, 0.2, 2, [[0, lighten(p.eyes, 0.4)], [1, shade(p.eyes, 0.6)]]));
    circle(ctx, x + 0.4, ey, 0.9, '#000'); circle(ctx, x - 0.4, ey - 0.7, 0.55, '#fff');
    line(ctx, x - 3.4, ey - 0.6, x + 3.4, ey - 0.6, shade(p.skin, 0.5), 0.9); // eyelid
    line(ctx, x - 3.8, ey - 3.6, x + 3.8, ey - 4.2 + (x > 32 ? 0.6 : 0), shade(p.hair, 0.55), 1.6); // brow
  }
  // nose
  line(ctx, 32, 27, 30.5, 32.5, shade(p.skin, 0.7), 1.1); ellipse(ctx, 31.5, 33.2, 2.6, 1.3, shade(p.skin, 0.8));
  circle(ctx, 29.8, 33.5, 0.7, shade(p.skin, 0.6)); circle(ctx, 33.4, 33.5, 0.7, shade(p.skin, 0.6));
  // mouth
  line(ctx, 27.5, 37, 36.5, 37, shade(p.skin, 0.5), 1.4); line(ctx, 28.5, 38.3, 35.5, 38.3, rgba(shade(p.skin, 0.7), 0.6), 0.8);
  if (p.tusks) { poly(ctx, [[27.5, 38], [26.5, 33], [29.5, 37]], '#f0ead0'); poly(ctx, [[36.5, 38], [37.5, 33], [34.5, 37]], '#f0ead0'); }
  if (p.scar) { line(ctx, 38, 17, 42, 32, '#8a3a3a', 1.6); for (let i = 0; i < 3; i++) line(ctx, 37 + i * 1.5, 21 + i * 4, 41 + i * 1.5, 20 + i * 4, '#8a3a3a', 0.8); }
  if (p.paint) { line(ctx, 22, 20, 42, 20, '#e8e8e8', 2); line(ctx, 32, 12, 32, 36, '#e8e8e8', 2); line(ctx, 24, 30, 30, 32, '#e8e8e8', 1.5); line(ctx, 34, 32, 40, 30, '#e8e8e8', 1.5); }
  // ---- hair / headgear ----
  const hairTop = (pathFn, col) => { ctx.beginPath(); pathFn(); ctx.closePath(); ctx.fillStyle = lgrad(ctx, 18, 6, 46, 24, [[0, lighten(col, 0.3)], [0.5, col], [1, shade(col, 0.6)]]); ctx.fill(); };
  switch (p.style) {
    case 'long': case 'crown': case 'antlers':
      hairTop(() => { ctx.moveTo(18, 24); ctx.quadraticCurveTo(19, 5, 32, 7); ctx.quadraticCurveTo(45, 5, 46, 24); ctx.quadraticCurveTo(41, 13, 32, 15); ctx.quadraticCurveTo(23, 13, 18, 24); }, p.hair);
      for (let i = 0; i < 5; i++) line(ctx, 22 + i * 5, 9 + Math.abs(i - 2) * 1.5, 20 + i * 5.5, 20, lighten(p.hair, 0.3), 0.8);
      break;
    case 'wild':
      hairTop(() => { ctx.moveTo(18, 22); ctx.quadraticCurveTo(22, 2, 32, 7); ctx.quadraticCurveTo(44, 2, 46, 22); ctx.quadraticCurveTo(40, 13, 32, 15); ctx.quadraticCurveTo(24, 13, 18, 22); }, p.hair);
      break;
    case 'hood':
      ctx.beginPath(); ctx.moveTo(12, 38); ctx.quadraticCurveTo(12, 2, 32, 2); ctx.quadraticCurveTo(52, 2, 52, 38); ctx.lineTo(47, 38); ctx.quadraticCurveTo(47, 11, 32, 11); ctx.quadraticCurveTo(17, 11, 17, 38); ctx.closePath();
      ctx.fillStyle = lgrad(ctx, 12, 0, 52, 0, [[0, shade(cloak, 0.5)], [0.5, lighten(cloak, 0.1)], [1, shade(cloak, 0.45)]]); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.moveTo(17, 14); ctx.quadraticCurveTo(32, 6, 47, 14); ctx.lineTo(47, 22); ctx.quadraticCurveTo(32, 14, 17, 22); ctx.closePath(); ctx.fill();
      break;
    case 'mohawk': for (let i = 0; i < 6; i++) poly(ctx, [[25 + i * 2.8, 12], [26.5 + i * 2.8, 1 - (i === 2 || i === 3 ? 2 : 0)], [28 + i * 2.8, 12]], i % 2 ? shade(p.hair, 1.4) : p.hair); hairTop(() => { ctx.moveTo(22, 18); ctx.quadraticCurveTo(32, 9, 42, 18); ctx.quadraticCurveTo(32, 14, 22, 18); }, shade(p.skin, 0.8)); break;
    case 'helm':
      ctx.beginPath(); ctx.arc(32, 20, 14.5, Math.PI, Math.PI * 2); ctx.lineTo(46.5, 24); ctx.lineTo(17.5, 24); ctx.closePath(); ctx.fillStyle = lgrad(ctx, 18, 6, 46, 24, [[0, '#d8dde4'], [0.45, '#8a929c'], [1, '#3a4048']]); ctx.fill();
      rrect(ctx, 30, 18, 4, 14, 1.5, '#4a5058'); line(ctx, 18, 24, 46, 24, '#d9a93a', 1.2); poly(ctx, [[32, 6], [36, -2], [40, 7]], '#d9a93a');
      break;
    case 'crown': break;
    case 'bald': default:
      if (p.style !== 'bald') hairTop(() => { ctx.moveTo(19, 22); ctx.quadraticCurveTo(21, 7, 32, 8); ctx.quadraticCurveTo(43, 7, 45, 22); ctx.quadraticCurveTo(40, 14, 32, 15); ctx.quadraticCurveTo(24, 14, 19, 22); }, p.hair);
      else { ctx.fillStyle = rgba('#fff', 0.12); ctx.beginPath(); ctx.ellipse(29, 12, 6, 3, -0.4, 0, Math.PI * 2); ctx.fill(); }
  }
  if (p.style === 'antlers') for (const s of [-1, 1]) { ctx.strokeStyle = '#d8c8a0'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(32 + s * 8, 12); ctx.quadraticCurveTo(32 + s * 14, 4, 32 + s * 13, -3); ctx.stroke(); ctx.beginPath(); ctx.moveTo(32 + s * 11, 6); ctx.lineTo(32 + s * 18, 3); ctx.stroke(); ctx.beginPath(); ctx.moveTo(32 + s * 12, 2); ctx.lineTo(32 + s * 10, -4); ctx.stroke(); }
  if (p.crown || p.style === 'crown') {
    const gold = elf ? '#d9a93a' : '#6a6a70';
    if (p.style === 'crown') hairTop(() => { ctx.moveTo(19, 22); ctx.quadraticCurveTo(21, 8, 32, 9); ctx.quadraticCurveTo(43, 8, 45, 22); ctx.quadraticCurveTo(40, 15, 32, 16); ctx.quadraticCurveTo(24, 15, 19, 22); }, p.hair);
    for (let i = 0; i < 5; i++) poly(ctx, [[21 + i * 5.5, 13], [23.5 + i * 5.5, 4 - (i === 2 ? 3 : 0)], [26 + i * 5.5, 13]], lgrad(ctx, 0, 1, 0, 13, [[0, lighten(gold, 0.4)], [1, shade(gold, 0.7)]]));
    rrect(ctx, 20, 11, 24, 4, 1, lgrad(ctx, 0, 11, 0, 15, [[0, lighten(gold, 0.3)], [1, shade(gold, 0.6)]]));
    if (elf) for (let i = 0; i < 4; i++) circle(ctx, 23 + i * 6, 7.5, 1.2, '#c0392b'); else for (let i = 0; i < 4; i++) circle(ctx, 23 + i * 6, 8, 1.1, '#80ff40');
  }
  if (p.helm && p.style !== 'helm') { ctx.beginPath(); ctx.arc(32, 19, 14, Math.PI, Math.PI * 2); ctx.fillStyle = lgrad(ctx, 18, 6, 46, 20, [[0, '#d8d0b0'], [1, '#6a6450']]); ctx.fill(); rrect(ctx, 18, 17, 28, 4, 1, '#8a8470'); poly(ctx, [[32, 5], [36, 0], [40, 6]], '#d9a93a'); }
  // ---- vignette & frame ----
  ctx.fillStyle = rgrad(ctx, 32, 28, 20, 48, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.55)']]); ctx.fillRect(0, 0, 64, 64);
  ctx.strokeStyle = 'rgba(227,197,106,0.6)'; ctx.lineWidth = 1.5; ctx.strokeRect(1.5, 1.5, 61, 61);
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1; ctx.strokeRect(3, 3, 58, 58);
  cache.set(key, c);
  return c;
}
