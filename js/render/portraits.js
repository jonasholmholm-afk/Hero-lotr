// Procedural hero portraits.
import { mk, poly, circle, ellipse, rrect, line, lgrad, rgrad, shade, lighten, rgba } from './draw.js';
import { HEROES } from '../data/heroes.js';
import { FACTIONS } from '../data/factions.js';

const cache = new Map();
export function portrait(defId, size = 64) {
  const key = `${defId}:${size}`;
  if (cache.has(key)) return cache.get(key);
  const def = HEROES[defId];
  const p = def.portrait;
  const c = mk(size, size); const ctx = c.getContext('2d');
  ctx.scale(size / 64, size / 64);
  // background
  ctx.fillStyle = rgrad(ctx, 32, 24, 4, 48, [[0, lighten(p.bg, 0.25)], [1, shade(p.bg, 0.6)]]);
  ctx.fillRect(0, 0, 64, 64);
  const fac = FACTIONS[def.faction];
  // shoulders / cloak
  const cloak = def.faction === 'elves' ? '#2f5d3a' : '#3a2a20';
  ctx.beginPath(); ctx.moveTo(4, 64); ctx.quadraticCurveTo(10, 44, 32, 42); ctx.quadraticCurveTo(54, 44, 60, 64); ctx.closePath();
  ctx.fillStyle = lgrad(ctx, 0, 42, 0, 64, [[0, lighten(cloak, 0.2)], [1, shade(cloak, 0.6)]]); ctx.fill();
  if (p.style === 'helm' || def.cls === 'might') { rrect(ctx, 14, 46, 36, 6, 2, shade(fac.color2 || '#888', 0.9)); }
  // neck
  rrect(ctx, 26, 36, 12, 10, 3, shade(p.skin, 0.8));
  // hair back
  if (p.style === 'long' || p.style === 'wild') {
    ctx.beginPath(); ctx.moveTo(16, 24); ctx.quadraticCurveTo(12, 50, 18, 56); ctx.lineTo(46, 56); ctx.quadraticCurveTo(52, 50, 48, 24); ctx.closePath();
    ctx.fillStyle = p.style === 'wild' ? shade(p.hair, 0.9) : p.hair; ctx.fill();
    if (p.style === 'wild') for (let i = 0; i < 6; i++) line(ctx, 18 + i * 6, 22, 12 + i * 8, 6 + (i % 2) * 6, p.hair, 3);
  }
  // face
  ctx.beginPath(); ctx.ellipse(32, 26, 12, 15, 0, 0, Math.PI * 2);
  ctx.fillStyle = lgrad(ctx, 20, 12, 44, 40, [[0, lighten(p.skin, 0.15)], [1, shade(p.skin, 0.75)]]); ctx.fill();
  // ears (elves pointy)
  if (def.faction === 'elves') { poly(ctx, [[20, 24], [14, 18], [21, 30]], p.skin); poly(ctx, [[44, 24], [50, 18], [43, 30]], p.skin); }
  else { ellipse(ctx, 20, 26, 3, 4, p.skin); ellipse(ctx, 44, 26, 3, 4, p.skin); }
  // eyes
  const ey = 25;
  ellipse(ctx, 27, ey, 3, 1.8, '#f0f0f0'); ellipse(ctx, 37, ey, 3, 1.8, '#f0f0f0');
  circle(ctx, 27.5, ey, 1.5, p.eyes); circle(ctx, 37.5, ey, 1.5, p.eyes);
  circle(ctx, 27.5, ey, 0.7, '#000'); circle(ctx, 37.5, ey, 0.7, '#000');
  // brows
  line(ctx, 23, ey - 4, 30, ey - 5, shade(p.hair, 0.6), 1.5); line(ctx, 34, ey - 5, 41, ey - 4, shade(p.hair, 0.6), 1.5);
  // nose & mouth
  line(ctx, 32, 27, 31, 32, shade(p.skin, 0.65), 1.2);
  line(ctx, 28, 36, 36, 36, shade(p.skin, 0.55), 1.4);
  if (p.tusks) { poly(ctx, [[27, 37], [26, 32], [29, 36]], '#f0ead0'); poly(ctx, [[37, 37], [38, 32], [35, 36]], '#f0ead0'); }
  if (p.scar) line(ctx, 38, 18, 42, 32, '#8a3a3a', 1.5);
  if (p.paint) { line(ctx, 22, 20, 42, 20, '#e8e8e8', 2); line(ctx, 32, 14, 32, 34, '#e8e8e8', 2); }
  // hair / head
  switch (p.style) {
    case 'long': ctx.beginPath(); ctx.moveTo(18, 24); ctx.quadraticCurveTo(20, 6, 32, 8); ctx.quadraticCurveTo(44, 6, 46, 24); ctx.quadraticCurveTo(40, 14, 32, 16); ctx.quadraticCurveTo(24, 14, 18, 24); ctx.closePath(); ctx.fillStyle = p.hair; ctx.fill(); break;
    case 'wild': ctx.beginPath(); ctx.moveTo(18, 22); ctx.quadraticCurveTo(22, 4, 32, 8); ctx.quadraticCurveTo(44, 4, 46, 22); ctx.quadraticCurveTo(40, 14, 32, 16); ctx.quadraticCurveTo(24, 14, 18, 22); ctx.closePath(); ctx.fillStyle = p.hair; ctx.fill(); break;
    case 'hood': ctx.beginPath(); ctx.moveTo(14, 34); ctx.quadraticCurveTo(14, 4, 32, 4); ctx.quadraticCurveTo(50, 4, 50, 34); ctx.lineTo(46, 34); ctx.quadraticCurveTo(46, 12, 32, 12); ctx.quadraticCurveTo(18, 12, 18, 34); ctx.closePath(); ctx.fillStyle = shade(cloak, 0.8); ctx.fill(); break;
    case 'mohawk': for (let i = 0; i < 5; i++) poly(ctx, [[26 + i * 3, 12], [27 + i * 3, 2 - (i === 2 ? 2 : 0)], [29 + i * 3, 12]], p.hair); break;
    case 'helm': ctx.beginPath(); ctx.arc(32, 20, 14, Math.PI, Math.PI * 2); ctx.fillStyle = lgrad(ctx, 18, 6, 46, 20, [[0, '#9aa0a8'], [1, '#4a5058']]); ctx.fill(); rrect(ctx, 30, 18, 4, 12, 1, '#4a5058'); break;
    case 'crown': ctx.beginPath(); ctx.arc(32, 20, 13, Math.PI, Math.PI * 2); ctx.fillStyle = p.hair; ctx.fill(); for (let i = 0; i < 5; i++) poly(ctx, [[20 + i * 6, 12], [23 + i * 6, 2], [26 + i * 6, 12]], def.faction === 'elves' ? '#d9a93a' : '#6a6a70'); rrect(ctx, 20, 10, 24, 4, 1, def.faction === 'elves' ? '#d9a93a' : '#6a6a70'); break;
    case 'antlers': ctx.beginPath(); ctx.arc(32, 20, 13, Math.PI, Math.PI * 2); ctx.fillStyle = p.hair; ctx.fill(); for (const s of [-1, 1]) { line(ctx, 32 + s * 8, 12, 32 + s * 14, 0, '#d8c8a0', 2.5); line(ctx, 32 + s * 11, 6, 32 + s * 18, 4, '#d8c8a0', 2); line(ctx, 32 + s * 12, 4, 32 + s * 10, -2, '#d8c8a0', 2); } break;
    case 'bald': default: ctx.beginPath(); ctx.arc(32, 20, 12.5, Math.PI * 1.05, Math.PI * 1.95); ctx.fillStyle = p.style === 'bald' ? shade(p.skin, 0.9) : p.hair; ctx.fill(); break;
  }
  // frame
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, 62, 62);
  cache.set(key, c);
  return c;
}
