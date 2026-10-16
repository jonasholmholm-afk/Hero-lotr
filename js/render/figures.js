// Procedural creature figures (side view, facing right). Drawn in a 96-unit
// space with the feet at (0,0); rendered at 2× and finished with an outline,
// a volume gradient and a soft ground shadow.
import { mk, mkS, poly, circle, ellipse, rrect, line, lgrad, rgrad, shade, lighten, rgba, outline, shadeSprite, softShadow, smoothPoly } from './draw.js';
import { assetCanvas } from './assets.js';

const cache = new Map();
const vol = (ctx, x0, y0, x1, y1, c) => lgrad(ctx, x0, y0, x1, y1, [[0, lighten(c, 0.3)], [0.5, c], [1, shade(c, 0.6)]]);
const volR = (ctx, x, y, r, c) => rgrad(ctx, x - r * 0.35, y - r * 0.4, 1, r * 1.25, [[0, lighten(c, 0.3)], [0.6, c], [1, shade(c, 0.6)]]);
const metalG = (ctx, x0, y0, x1, y1) => lgrad(ctx, x0, y0, x1, y1, [[0, '#f4f6f9'], [0.4, '#b9bec6'], [0.55, '#7d838c'], [1, '#d4d8de']]);
const WOOD = '#6b4a2a';

export function figure(unit, S = 96, flip = false) {
  const key = `${unit.id}:${S}:${flip ? 1 : 0}`;
  if (cache.has(key)) return cache.get(key);
  const asset = assetCanvas(`units/${unit.id}`, S, S, flip);
  if (asset) { cache.set(key, asset); return asset; }
  const c = mkS(S, S);
  const ctx = c.getContext('2d');
  ctx.save();
  if (flip) { ctx.translate(S, 0); ctx.scale(-1, 1); }
  const a = unit.art;
  const sc = (a.scale || 1) * S / 96;
  ctx.translate(S / 2, S * 0.92);
  ctx.scale(sc, sc);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const col = { cloth: a.c1, metal: a.c2, accent: a.c3, skin: a.skin || a.c3 };
  const info = { elf: unit.faction === 'elves', orc: unit.faction === 'orcs' };
  switch (a.shape) {
    case 'humanoid': humanoid(ctx, a, col, info); break;
    case 'skeleton': skeleton(ctx, a, col); break;
    case 'wraith': wraith(ctx, a, col); break;
    case 'dryad': dryad(ctx, a, col); break;
    case 'beast': beast(ctx, a, col); break;
    case 'rider': rider(ctx, a, col, info); break;
    case 'eagle': eagle(ctx, a, col); break;
    case 'treeman': treeman(ctx, a, col); break;
    case 'giant': giant(ctx, a, col); break;
    case 'spider': spider(ctx, a, col); break;
    case 'dragon': dragon(ctx, a, col); break;
    default: humanoid(ctx, a, col, info);
  }
  ctx.restore();
  outline(c, 'rgba(14,10,8,0.82)', 1);
  shadeSprite(c, 'rgba(255,245,225,0.16)', 'rgba(0,0,20,0.3)');
  const out = mkS(S, S); const octx = out.getContext('2d');
  softShadow(octx, S / 2, S * 0.92, S * 0.3 * (a.scale || 1), S * 0.08 * (a.scale || 1), 0.42);
  octx.drawImage(c, 0, 0, S, S);
  cache.set(key, out);
  return out;
}

// ---------- shared parts ----------
function limb(ctx, x1, y1, x2, y2, w, col) {
  line(ctx, x1, y1, x2, y2, shade(col, 0.72), w);
  const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  line(ctx, x1 + nx * w * 0.18, y1 + ny * w * 0.18, x2 + nx * w * 0.18, y2 + ny * w * 0.18, lighten(col, 0.12), w * 0.5);
}
function boot(ctx, x, y, dir, col) {
  rrect(ctx, x - 5, y - 7, 10 + dir * 3, 7, 2.5, vol(ctx, x - 5, 0, x + 8, 0, col));
  rrect(ctx, x - 5, y - 1.5, 10 + dir * 3, 2, 1, shade(col, 0.45));
}
function weapon(ctx, kind, hx, hy, big = false) {
  const metal = metalG(ctx, hx - 12, hy - 44, hx + 24, hy + 4), dark = '#3f434b';
  const wood = lgrad(ctx, hx - 4, 0, hx + 8, 0, [[0, '#8a6238'], [1, '#4a2e14']]);
  ctx.save(); ctx.translate(hx, hy);
  switch (kind) {
    case 'bow': {
      ctx.beginPath(); ctx.arc(4, 0, 24, -Math.PI / 2.1, Math.PI / 2.1); ctx.strokeStyle = wood; ctx.lineWidth = 3.4; ctx.stroke();
      ctx.beginPath(); ctx.arc(4, 0, 24, -Math.PI / 2.1, Math.PI / 2.1); ctx.strokeStyle = 'rgba(255,230,180,0.35)'; ctx.lineWidth = 1; ctx.stroke();
      const ax = 4 + 24 * Math.cos(Math.PI / 2.1), ay = 24 * Math.sin(Math.PI / 2.1);
      line(ctx, ax, -ay, -6, 0, '#efe6d0', 1); line(ctx, -6, 0, ax, ay, '#efe6d0', 1);
      line(ctx, -8, 0, 26, 0, '#d8c8a0', 2); poly(ctx, [[26, -3], [32, 0], [26, 3]], metal); poly(ctx, [[-8, -3], [-4, 0], [-8, 3], [-11, 0]], '#c8c0b0');
      break;
    }
    case 'axe': line(ctx, -2, 10, 8, -26, wood, 4); poly(ctx, [[7, -27], [20, -36], [24, -18], [10, -16]], metal, dark, 0.8); line(ctx, 10, -30, 20, -22, 'rgba(255,255,255,0.35)', 1.2); break;
    case 'greataxe': line(ctx, -4, 14, 10, -38, wood, 4.5); poly(ctx, [[10, -38], [28, -50], [30, -20], [12, -22]], metal, dark, 0.8); poly(ctx, [[10, -38], [-8, -50], [-10, -20], [8, -22]], metal, dark, 0.8); circle(ctx, 10, -38, 3, '#d9a93a'); break;
    case 'spear': line(ctx, -8, 16, 16, -44, wood, 3.2); poly(ctx, [[16, -44], [10, -34], [15, -36], [21, -34]], metal, dark, 0.8); line(ctx, 11, -36, 6, -30, '#c0392b', 1.6); line(ctx, 11, -36, 9, -28, '#c0392b', 1.6); break;
    case 'sword': line(ctx, 2, -2, 20, -34, metal, 4.5); line(ctx, 3, -4, 19, -32, 'rgba(255,255,255,0.45)', 1); line(ctx, -4, -6, 10, -12, '#d9a93a', 3); circle(ctx, -2, 2, 2.2, '#d9a93a'); break;
    case 'dagger': line(ctx, 2, 0, 13, -15, metal, 3.2); line(ctx, -1, -3, 5, -6, '#d9a93a', 2); break;
    case 'club': line(ctx, 0, 4, 12, -30, wood, 5); ellipse(ctx, 14, -35, 8, 12, lgrad(ctx, 6, 0, 22, 0, [[0, '#8a6a4a'], [1, '#3a2614']]), 0.6); for (let i = 0; i < 4; i++) circle(ctx, 11 + (i % 2) * 6, -42 + i * 5, 1.4, '#c9ccd2'); break;
    case 'twinblades': line(ctx, 0, 0, 20, -26, metal, 3.2); line(ctx, -2, 2, -22, -24, metal, 3.2); line(ctx, -3, -2, 3, -2, '#d9a93a', 2.5); break;
  }
  ctx.restore();
}
function shield(ctx, x, y, col, emblem) {
  ctx.beginPath(); ctx.moveTo(x - 9, y - 14); ctx.lineTo(x + 9, y - 14); ctx.quadraticCurveTo(x + 10, y + 4, x, y + 14); ctx.quadraticCurveTo(x - 10, y + 4, x - 9, y - 14); ctx.closePath();
  ctx.fillStyle = vol(ctx, x - 9, 0, x + 9, 0, col.metal); ctx.fill(); ctx.strokeStyle = '#d9a93a'; ctx.lineWidth = 1.5; ctx.stroke();
  circle(ctx, x, y - 2, 3.5, emblem || col.accent); line(ctx, x, y - 12, x, y + 10, 'rgba(255,255,255,0.25)', 1);
}
function face(ctx, x, y, r, col, a, info) {
  // head
  ellipse(ctx, x, y, r, r * 1.08, volR(ctx, x, y, r, col.skin));
  // ear
  if (info && info.elf) poly(ctx, [[x - r * 0.7, y - r * 0.1], [x - r * 1.7, y - r * 0.9], [x - r * 0.6, y + r * 0.35]], col.skin);
  else ellipse(ctx, x - r * 0.85, y + r * 0.05, r * 0.25, r * 0.35, shade(col.skin, 0.9));
  // eye & brow
  ellipse(ctx, x + r * 0.42, y - r * 0.08, r * 0.26, r * 0.18, '#f3f1ea');
  circle(ctx, x + r * 0.48, y - r * 0.08, r * 0.12, '#1a1410');
  line(ctx, x + r * 0.15, y - r * 0.4, x + r * 0.7, y - r * 0.42, shade(col.skin, 0.45), r * 0.14);
  // nose & mouth
  line(ctx, x + r * 0.85, y + r * 0.05, x + r * 0.95, y + r * 0.3, shade(col.skin, 0.6), r * 0.12);
  line(ctx, x + r * 0.45, y + r * 0.55, x + r * 0.8, y + r * 0.5, shade(col.skin, 0.5), r * 0.1);
  if (a.tusks || (info && info.orc && !a.small && a.weapon !== 'bow')) { poly(ctx, [[x + r * 0.45, y + r * 0.6], [x + r * 0.55, y + r * 0.1], [x + r * 0.7, y + r * 0.62]], '#f0ead0'); poly(ctx, [[x + r * 0.8, y + r * 0.55], [x + r * 0.9, y + r * 0.1], [x + r * 1.0, y + r * 0.58]], '#f0ead0'); }
  if (a.horns) { for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + s * r * 0.4, y - r * 0.8); ctx.quadraticCurveTo(x + s * r * 1.3, y - r * 1.4, x + s * r * 1.1, y - r * 2.2); ctx.strokeStyle = '#d8c8a0'; ctx.lineWidth = r * 0.35; ctx.stroke(); } }
  if (a.beard) { ctx.beginPath(); ctx.moveTo(x - r * 0.2, y + r * 0.3); ctx.quadraticCurveTo(x + r * 0.3, y + r * 1.9, x + r * 0.9, y + r * 0.4); ctx.closePath(); ctx.fillStyle = '#5a3a20'; ctx.fill(); }
}
function hair(ctx, x, y, r, style, col, cloth, metal) {
  switch (style) {
    case 'hood': ctx.beginPath(); ctx.moveTo(x - r * 1.3, y + r * 0.5); ctx.quadraticCurveTo(x - r * 1.4, y - r * 1.6, x + r * 0.2, y - r * 1.5); ctx.quadraticCurveTo(x + r * 1.1, y - r * 1.4, x + r * 1.0, y - r * 0.3); ctx.quadraticCurveTo(x + r * 0.6, y - r * 1.0, x - r * 0.2, y - r * 0.9); ctx.quadraticCurveTo(x - r * 0.9, y - r * 0.8, x - r * 1.0, y + r * 0.5); ctx.closePath(); ctx.fillStyle = vol(ctx, x - r, 0, x + r, 0, shade(cloth, 0.85)); ctx.fill(); break;
    case 'helm': ctx.beginPath(); ctx.arc(x, y - r * 0.1, r * 1.15, Math.PI, Math.PI * 2); ctx.lineTo(x + r * 1.15, y + r * 0.3); ctx.lineTo(x - r * 1.15, y + r * 0.3); ctx.closePath(); ctx.fillStyle = metalG(ctx, x - r, y - r, x + r, y + r); ctx.fill(); rrect(ctx, x + r * 0.6, y - r * 0.2, r * 0.5, r * 1.2, r * 0.2, '#4a5058'); line(ctx, x - r * 1.1, y + r * 0.3, x + r * 1.1, y + r * 0.3, '#2a2e34', 1); break;
    case 'spikehelm': ctx.beginPath(); ctx.arc(x, y - r * 0.1, r * 1.15, Math.PI, Math.PI * 2); ctx.lineTo(x + r * 1.15, y + r * 0.4); ctx.lineTo(x - r * 1.15, y + r * 0.4); ctx.closePath(); ctx.fillStyle = lgrad(ctx, x - r, 0, x + r, 0, [[0, '#6a6a70'], [1, '#2a2a30']]); ctx.fill(); poly(ctx, [[x - r * 0.6, y - r * 1.1], [x - r * 0.3, y - r * 2.1], [x, y - r * 1.2]], '#9a9aa0'); poly(ctx, [[x + r * 0.2, y - r * 1.15], [x + r * 0.5, y - r * 2.0], [x + r * 0.8, y - r * 1.0]], '#9a9aa0'); break;
    case 'long': ctx.beginPath(); ctx.moveTo(x - r * 1.1, y + r * 1.2); ctx.quadraticCurveTo(x - r * 1.4, y - r * 1.2, x, y - r * 1.25); ctx.quadraticCurveTo(x + r * 1.2, y - r * 1.2, x + r * 1.0, y - r * 0.3); ctx.quadraticCurveTo(x + r * 0.5, y - r * 0.9, x - r * 0.1, y - r * 0.75); ctx.quadraticCurveTo(x - r * 0.7, y - r * 0.6, x - r * 0.6, y + r * 1.2); ctx.closePath(); ctx.fillStyle = vol(ctx, x - r, 0, x + r, 0, col); ctx.fill(); line(ctx, x - r * 0.4, y - r * 1.0, x - r * 0.8, y + r * 0.6, lighten(col, 0.35), 1.2); break;
    case 'mohawk': for (let i = 0; i < 5; i++) poly(ctx, [[x - r * 0.9 + i * r * 0.4, y - r * 0.9], [x - r * 0.75 + i * r * 0.4, y - r * 2.0 - (i === 2 ? r * 0.4 : 0)], [x - r * 0.5 + i * r * 0.4, y - r * 0.9]], col); break;
    case 'bald': break;
    case 'topknot': ctx.beginPath(); ctx.arc(x, y - r * 0.2, r * 1.02, Math.PI * 1.05, Math.PI * 1.95); ctx.fillStyle = col; ctx.fill(); circle(ctx, x - r * 0.2, y - r * 1.3, r * 0.4, col); break;
    default: ctx.beginPath(); ctx.arc(x - r * 0.05, y - r * 0.15, r * 1.05, Math.PI * 1.02, Math.PI * 1.98); ctx.fillStyle = vol(ctx, x - r, 0, x + r, 0, col); ctx.fill(); line(ctx, x - r * 0.6, y - r * 0.9, x + r * 0.2, y - r * 1.05, lighten(col, 0.35), 1.2);
  }
}

// ---------- shapes ----------
function humanoid(ctx, a, col, info) {
  const small = a.small ? 0.74 : 1;
  ctx.save(); ctx.scale(small, small);
  const { cloth, metal, skin } = col;
  const hairCol = a.hair || (info.elf ? '#e8d890' : info.orc ? '#1a1a1a' : '#4a3020');
  const style = a.hood ? 'hood' : a.armor ? (info.orc ? 'spikehelm' : 'helm') : a.helm ? 'helm' : a.hairStyle || (info.elf ? 'long' : info.orc ? 'topknot' : 'short');
  // cloak behind
  if (a.hood || a.cloak) { ctx.beginPath(); ctx.moveTo(-8, -58); ctx.quadraticCurveTo(-22, -40, -18, -8); ctx.lineTo(4, -14); ctx.quadraticCurveTo(10, -40, 9, -56); ctx.closePath(); ctx.fillStyle = vol(ctx, -22, 0, 10, 0, shade(cloth, 0.8)); ctx.fill(); }
  // quiver for archers
  if (a.weapon === 'bow') { ctx.save(); ctx.translate(-9, -46); ctx.rotate(0.35); rrect(ctx, -4, -4, 8, 26, 3, '#5a3a22'); for (let i = 0; i < 3; i++) { line(ctx, -2 + i * 2, -4, -2 + i * 2, -12, '#d8c8a0', 1.2); poly(ctx, [[-3.5 + i * 2, -12], [-2 + i * 2, -16], [-0.5 + i * 2, -12]], '#c0392b'); } ctx.restore(); }
  // back arm
  limb(ctx, -5, -46, -13, -30, 6, skin);
  // legs
  limb(ctx, -5, -32, -8, -8, 8.5, cloth); limb(ctx, 5, -32, 9, -8, 8.5, cloth);
  boot(ctx, -8, -1, -1, metal === '#3c3c3c' ? '#3a2a1a' : shade(metal, 0.9)); boot(ctx, 9, -1, 1, metal === '#3c3c3c' ? '#3a2a1a' : shade(metal, 0.9));
  // torso: shoulders wider than waist
  ctx.beginPath(); ctx.moveTo(-13, -58); ctx.quadraticCurveTo(0, -62, 13, -58); ctx.lineTo(11, -34); ctx.lineTo(-11, -34); ctx.closePath();
  ctx.fillStyle = a.armor ? metalG(ctx, -13, -60, 13, -30) : vol(ctx, -13, 0, 13, 0, cloth); ctx.fill();
  // tunic skirt
  poly(ctx, [[-11, -34], [11, -34], [13, -22], [-13, -22]], a.armor ? vol(ctx, -13, 0, 13, 0, shade(cloth, 0.9)) : vol(ctx, -13, 0, 13, 0, shade(cloth, 0.85)));
  if (a.armor) { for (let i = 0; i < 3; i++) line(ctx, -10, -52 + i * 7, 10, -52 + i * 7, '#4a5058', 1.4); circle(ctx, 0, -48, 2.4, '#d9a93a'); circle(ctx, -12, -57, 5, vol(ctx, -17, 0, -7, 0, metal)); circle(ctx, 12, -57, 5, vol(ctx, 7, 0, 17, 0, metal)); }
  else { line(ctx, 0, -58, 0, -36, shade(cloth, 0.55), 1.3); line(ctx, -9, -54, -2, -59, lighten(cloth, 0.4), 1.4); line(ctx, 9, -54, 2, -59, lighten(cloth, 0.4), 1.4); for (let i = 0; i < 4; i++) line(ctx, -10 + i * 7, -22, -10 + i * 7, -27, shade(cloth, 0.6), 1); }
  // belt
  rrect(ctx, -11, -35, 22, 4.5, 1.5, shade(cloth, 0.4)); rrect(ctx, -2.5, -36, 5, 6, 1.2, '#d9a93a');
  // neck + head
  rrect(ctx, -3, -64, 7, 8, 2, shade(skin, 0.8));
  face(ctx, 1, -70, 9, col, a, info);
  hair(ctx, 1, -70, 9, style, hairCol, cloth, metal);
  // front arm + hand
  limb(ctx, 7, -50, 18, -36, 6.5, skin); circle(ctx, 19, -35, 3.5, skin);
  if (a.shield) shield(ctx, -16, -42, col);
  if (a.weapon) weapon(ctx, a.weapon, 19, -35);
  ctx.restore();
}

function skeleton(ctx, a, col) {
  const bone = '#ddd7c4';
  limb(ctx, -5, -46, -13, -30, 3.2, bone);
  limb(ctx, -5, -32, -8, -4, 3.5, bone); limb(ctx, 5, -32, 9, -4, 3.5, bone);
  circle(ctx, -8, -3, 2.5, bone); circle(ctx, 9, -3, 2.5, bone);
  // ribcage
  rrect(ctx, -3, -58, 6, 26, 3, bone);
  for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-1, -56 + i * 5); ctx.quadraticCurveTo(-12, -54 + i * 5, -9, -48 + i * 5); ctx.strokeStyle = bone; ctx.lineWidth = 2; ctx.stroke(); ctx.beginPath(); ctx.moveTo(1, -56 + i * 5); ctx.quadraticCurveTo(12, -54 + i * 5, 9, -48 + i * 5); ctx.stroke(); }
  rrect(ctx, -9, -36, 18, 5, 2, bone);
  // skull
  ellipse(ctx, 1, -68, 9, 9.5, volR(ctx, 1, -68, 9, bone));
  rrect(ctx, -3, -62, 10, 6, 2, shade(bone, 0.9));
  ctx.shadowColor = col.accent; ctx.shadowBlur = 6; circle(ctx, 5, -70, 2.4, '#111'); circle(ctx, 5, -70, 1.2, col.accent); ctx.shadowBlur = 0;
  for (let i = 0; i < 3; i++) line(ctx, 1 + i * 2.5, -60, 1 + i * 2.5, -57, '#999', 1);
  // rusty sword & arm
  limb(ctx, 7, -50, 18, -36, 3.2, bone); circle(ctx, 19, -35, 2.5, bone);
  weapon(ctx, 'sword', 19, -35);
  // tattered cloth
  poly(ctx, [[-10, -40], [8, -40], [6, -20], [2, -28], [-2, -18], [-6, -26], [-10, -22]], 'rgba(60,50,70,0.8)');
}

function wraith(ctx, a, col) {
  const g = lgrad(ctx, 0, -72, 0, 4, [[0, lighten(col.cloth, 0.2)], [0.6, col.cloth], [1, 'rgba(20,20,40,0)']]);
  ctx.beginPath(); ctx.moveTo(-16, -62); ctx.quadraticCurveTo(0, -70, 16, -62); ctx.quadraticCurveTo(22, -30, 18, 0); ctx.lineTo(12, -10); ctx.lineTo(6, 2); ctx.lineTo(0, -8); ctx.lineTo(-6, 2); ctx.lineTo(-12, -10); ctx.lineTo(-18, 0); ctx.quadraticCurveTo(-22, -30, -16, -62); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
  for (let i = 0; i < 4; i++) line(ctx, -10 + i * 6, -50, -12 + i * 6, -14, 'rgba(0,0,0,0.25)', 1.5);
  ctx.beginPath(); ctx.arc(0, -66, 15, Math.PI * 0.85, Math.PI * 2.15); ctx.fillStyle = vol(ctx, -15, 0, 15, 0, shade(col.cloth, 0.8)); ctx.fill();
  ellipse(ctx, 1, -62, 9, 7, '#06060c');
  ctx.shadowColor = col.accent; ctx.shadowBlur = 10; circle(ctx, -3, -63, 2.4, col.accent); circle(ctx, 5, -63, 2.4, col.accent); circle(ctx, -3, -63, 1, '#fff'); circle(ctx, 5, -63, 1, '#fff'); ctx.shadowBlur = 0;
  // ghostly arm with blade
  limb(ctx, 8, -44, 24, -34, 5, col.metal);
  line(ctx, 24, -34, 34, -56, lgrad(ctx, 24, -34, 34, -56, [[0, '#9ab'], [1, rgba(col.accent, 0.9)]]), 3.2);
  // cold mist at the base
  for (let i = 0; i < 5; i++) circle(ctx, -14 + i * 7, -2 + (i % 2) * 3, 5, rgba(col.accent, 0.12));
}

function dryad(ctx, a, col) {
  const bark = col.cloth;
  limb(ctx, -5, -30, -9, -2, 6, bark); limb(ctx, 5, -30, 10, -2, 6, bark);
  for (let i = 0; i < 3; i++) line(ctx, -9 + i * 2, -2, -12 + i * 5, 2, bark, 2);
  ctx.beginPath(); ctx.moveTo(-9, -58); ctx.quadraticCurveTo(0, -62, 9, -58); ctx.lineTo(8, -32); ctx.quadraticCurveTo(0, -28, -8, -32); ctx.closePath(); ctx.fillStyle = vol(ctx, -9, 0, 9, 0, bark); ctx.fill();
  for (let i = 0; i < 3; i++) line(ctx, -6 + i * 5, -54, -4 + i * 5, -34, shade(bark, 0.65), 1.1);
  // branch arms
  ctx.beginPath(); ctx.moveTo(-7, -50); ctx.quadraticCurveTo(-20, -56, -26, -66); ctx.strokeStyle = bark; ctx.lineWidth = 4; ctx.stroke();
  line(ctx, -26, -66, -32, -74, bark, 2.2); line(ctx, -26, -66, -34, -62, bark, 2.2);
  ctx.beginPath(); ctx.moveTo(7, -48); ctx.quadraticCurveTo(18, -44, 26, -34); ctx.strokeStyle = bark; ctx.lineWidth = 4; ctx.stroke();
  line(ctx, 26, -34, 34, -30, bark, 2.2); line(ctx, 26, -34, 30, -26, bark, 2.2);
  // head with leafy crown
  face(ctx, 1, -68, 8.5, { skin: lighten(bark, 0.2) }, {}, {});
  for (let i = 0; i < 9; i++) { const an = -Math.PI * 0.95 + i * 0.24; ellipse(ctx, 1 + Math.cos(an) * 10, -68 + Math.sin(an) * 10 - 2, 7.5, 3.6, i % 2 ? col.metal : col.accent, an); }
  for (let i = 0; i < 4; i++) circle(ctx, -30 + i * 20, -70 + (i % 2) * 36, 2, '#ff9ac0');
  ctx.shadowColor = '#d8ffb0'; ctx.shadowBlur = 6; circle(ctx, 5, -69, 1.6, '#eaffd0'); ctx.shadowBlur = 0;
}

function beastBody(ctx, col, scale, mane = false) {
  ctx.save(); ctx.scale(scale, scale);
  const b = col.cloth, d = col.metal;
  // back legs
  limb(ctx, -16, -24, -22, -2, 6.5, d); limb(ctx, 12, -24, 10, -2, 6.5, d);
  for (const x of [-22, 10]) { ellipse(ctx, x + 1, -1, 4, 2.2, shade(d, 0.6)); }
  // body
  ctx.beginPath(); ctx.moveTo(-26, -30); ctx.quadraticCurveTo(-10, -44, 14, -40); ctx.quadraticCurveTo(28, -38, 30, -28); ctx.quadraticCurveTo(24, -16, 2, -18); ctx.quadraticCurveTo(-18, -18, -26, -30); ctx.closePath();
  ctx.fillStyle = lgrad(ctx, 0, -44, 0, -16, [[0, lighten(b, 0.3)], [0.5, b], [1, shade(b, 0.55)]]); ctx.fill();
  ellipse(ctx, -2, -22, 18, 6, shade(b, 0.8), 0);
  for (let k = 0; k < 7; k++) line(ctx, -20 + k * 6, -40 + Math.sin(k) * 2, -23 + k * 6, -33, lighten(b, 0.35), 1.3);
  // front legs
  limb(ctx, -8, -24, -6, -2, 6.5, b); limb(ctx, 20, -26, 24, -2, 6.5, b);
  for (const x of [-6, 24]) { ellipse(ctx, x + 1, -1, 4, 2.2, shade(b, 0.6)); }
  // tail
  ctx.beginPath(); ctx.moveTo(-24, -32); ctx.quadraticCurveTo(-40, -36, -40, -52); ctx.strokeStyle = b; ctx.lineWidth = 5.5; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-28, -34); ctx.quadraticCurveTo(-39, -38, -39, -48); ctx.strokeStyle = lighten(b, 0.3); ctx.lineWidth = 1.5; ctx.stroke();
  // head
  ctx.beginPath(); ctx.moveTo(18, -40); ctx.quadraticCurveTo(30, -52, 40, -44); ctx.lineTo(50, -38); ctx.quadraticCurveTo(44, -32, 36, -30); ctx.quadraticCurveTo(26, -30, 18, -36); ctx.closePath(); ctx.fillStyle = vol(ctx, 18, -52, 50, -30, b); ctx.fill();
  poly(ctx, [[22, -48], [25, -60], [31, -47]], b); poly(ctx, [[29, -49], [34, -60], [38, -46]], b);
  poly(ctx, [[24, -48], [26, -56], [29, -48]], lighten(b, 0.4)); poly(ctx, [[31, -48], [34, -56], [36, -47]], lighten(b, 0.4));
  circle(ctx, 50, -37, 1.8, '#111');
  ctx.shadowColor = col.accent; ctx.shadowBlur = 5; circle(ctx, 33, -43, 2.6, col.accent); circle(ctx, 33.6, -43.6, 1, '#fff'); ctx.shadowBlur = 0;
  for (let i = 0; i < 3; i++) poly(ctx, [[38 + i * 3.5, -33], [39 + i * 3.5, -29], [41 + i * 3.5, -33]], '#f0f0e0');
  line(ctx, 44, -34, 50, -36, '#c0392b', 1.2);
  ctx.restore();
}
function beast(ctx, a, col) { beastBody(ctx, col, 1); }

function stag(ctx, col) {
  const body = col.cloth, light = lighten(body, 0.35);
  limb(ctx, -18, -32, -22, -2, 5, body); limb(ctx, -8, -32, -6, -2, 5, shade(body, 0.85));
  limb(ctx, 12, -32, 10, -2, 5, shade(body, 0.85)); limb(ctx, 20, -32, 26, -2, 5, body);
  ctx.beginPath(); ctx.ellipse(0, -40, 28, 13, 0, 0, Math.PI * 2); ctx.fillStyle = lgrad(ctx, 0, -53, 0, -27, [[0, light], [0.5, body], [1, shade(body, 0.55)]]); ctx.fill();
  ellipse(ctx, -2, -32, 20, 5, lighten(body, 0.2));
  for (let i = 0; i < 8; i++) circle(ctx, -16 + i * 4.5, -44 + (i % 2) * 3, 1.3, 'rgba(255,255,255,0.45)');
  ctx.beginPath(); ctx.moveTo(22, -46); ctx.quadraticCurveTo(28, -56, 34, -68); ctx.lineTo(44, -64); ctx.quadraticCurveTo(36, -52, 32, -38); ctx.closePath(); ctx.fillStyle = body; ctx.fill();
  ellipse(ctx, 40, -72, 10, 6, vol(ctx, 30, -78, 50, -66, body), 0.3); poly(ctx, [[48, -75], [54, -71], [47, -68]], shade(body, 0.8));
  circle(ctx, 44, -74, 1.5, '#111'); poly(ctx, [[33, -78], [35, -86], [39, -78]], body);
  const ant = '#e8d8b0';
  ctx.strokeStyle = ant; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(36 + s * 3, -80); ctx.quadraticCurveTo(36 + s * 10, -92, 30 + s * 14, -100); ctx.stroke(); ctx.beginPath(); ctx.moveTo(36 + s * 7, -88); ctx.lineTo(36 + s * 16, -92); ctx.stroke(); ctx.beginPath(); ctx.moveTo(34 + s * 10, -94); ctx.lineTo(38 + s * 12, -104); ctx.stroke(); }
}
function rider(ctx, a, col, info) {
  if (a.mount === 'stag') stag(ctx, col); else beastBody(ctx, { cloth: col.metal, metal: shade(col.metal, 0.8), accent: '#ffd040' }, 1.15);
  // saddle
  rrect(ctx, -12, -46, 22, 8, 3, a.mount === 'stag' ? '#3b6e3a' : '#5a2a1a', '#d9a93a', 1);
  ctx.save(); ctx.translate(-2, -42); ctx.scale(0.7, 0.7);
  humanoid(ctx, { ...a, shape: 'humanoid', weapon: a.weapon || 'spear', cloak: a.mount === 'stag' }, { ...col, cloth: a.mount === 'stag' ? col.metal : col.cloth }, info);
  ctx.restore();
}

function eagle(ctx, a, col) {
  const f = col.cloth, light = col.metal;
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(0, -52);
    ctx.quadraticCurveTo(s * 26, -96, s * 60, -84);
    ctx.lineTo(s * 56, -74); ctx.lineTo(s * 50, -78); ctx.lineTo(s * 50, -66); ctx.lineTo(s * 42, -70); ctx.lineTo(s * 44, -56); ctx.lineTo(s * 34, -60); ctx.lineTo(s * 34, -46); ctx.lineTo(s * 22, -48);
    ctx.quadraticCurveTo(s * 10, -42, 0, -38); ctx.closePath();
    ctx.fillStyle = lgrad(ctx, 0, -96, 0, -38, [[0, lighten(f, 0.3)], [1, shade(f, s < 0 ? 0.5 : 0.75)]]); ctx.fill();
    for (let i = 0; i < 5; i++) line(ctx, s * (10 + i * 10), -60 + i * 2, s * (16 + i * 10), -82 + i * 2, shade(f, 0.6), 1.2);
  }
  ellipse(ctx, 0, -46, 12, 19, vol(ctx, -12, 0, 12, 0, f));
  poly(ctx, [[-10, -30], [-4, -12], [0, -16], [4, -12], [10, -30]], shade(f, 0.7));
  for (let i = 0; i < 5; i++) ellipse(ctx, -6 + i * 3, -52 + Math.abs(i - 2) * 2, 1.6, 3, lighten(f, 0.2), 0);
  circle(ctx, 2, -68, 9, volR(ctx, 2, -68, 9, light));
  poly(ctx, [[9, -70], [20, -65], [9, -61]], lgrad(ctx, 9, 0, 20, 0, [[0, '#ffd27a'], [1, '#c8861a']]));
  circle(ctx, 5, -70, 2.2, '#111'); circle(ctx, 5.6, -70.6, 0.8, '#fff');
  line(ctx, -5, -28, -9, -12, col.accent, 3); line(ctx, 5, -28, 9, -12, col.accent, 3);
  for (const x of [-9, 9]) for (let k = -1; k <= 1; k++) line(ctx, x, -12, x + k * 4, -6, col.accent, 2);
}

function treeman(ctx, a, col) {
  const bark = col.cloth, leaf = col.metal, leaf2 = col.accent;
  limb(ctx, -10, -30, -18, -2, 10, bark); limb(ctx, 8, -30, 16, -2, 10, bark);
  for (const [x, d] of [[-18, -1], [16, 1]]) { line(ctx, x, -2, x + d * 10, 2, bark, 5); line(ctx, x, -2, x + d * 4, 4, bark, 4); line(ctx, x, -2, x - d * 4, 3, bark, 3.5); }
  ctx.beginPath(); ctx.moveTo(-17, -72); ctx.quadraticCurveTo(0, -78, 17, -72); ctx.quadraticCurveTo(20, -50, 15, -26); ctx.lineTo(-15, -26); ctx.quadraticCurveTo(-20, -50, -17, -72); ctx.closePath();
  ctx.fillStyle = vol(ctx, -17, 0, 17, 0, bark); ctx.fill();
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-13 + i * 5, -70); ctx.quadraticCurveTo(-11 + i * 5 + Math.sin(i) * 3, -50, -12 + i * 5, -28); ctx.strokeStyle = shade(bark, 0.65); ctx.lineWidth = 1.3; ctx.stroke(); }
  // arms (branches)
  ctx.beginPath(); ctx.moveTo(-15, -62); ctx.quadraticCurveTo(-30, -70, -42, -82); ctx.strokeStyle = bark; ctx.lineWidth = 8; ctx.stroke();
  line(ctx, -42, -82, -50, -96, bark, 4.5); line(ctx, -42, -82, -54, -78, bark, 3.5); line(ctx, -50, -96, -56, -100, bark, 2.5);
  ctx.beginPath(); ctx.moveTo(15, -60); ctx.quadraticCurveTo(28, -54, 38, -44); ctx.strokeStyle = bark; ctx.lineWidth = 8; ctx.stroke();
  line(ctx, 38, -44, 48, -36, bark, 4.5); line(ctx, 38, -44, 46, -50, bark, 3.5);
  // face
  ctx.shadowColor = '#ffd97a'; ctx.shadowBlur = 8; circle(ctx, -5, -58, 2.8, '#ffe59a'); circle(ctx, 6, -58, 2.8, '#ffe59a'); ctx.shadowBlur = 0;
  ctx.beginPath(); ctx.moveTo(-7, -46); ctx.quadraticCurveTo(0, -41, 8, -46); ctx.strokeStyle = shade(bark, 0.45); ctx.lineWidth = 2.4; ctx.stroke();
  line(ctx, -9, -63, -2, -61, shade(bark, 0.5), 2); line(ctx, 3, -61, 10, -63, shade(bark, 0.5), 2);
  // canopy
  const fol = [[-14, -84, 17], [12, -88, 19], [-2, -98, 15], [-30, -94, 13], [-50, -98, 10], [24, -100, 11]];
  for (const [x, y, r] of fol) circle(ctx, x + 1, y + 3, r + 1, shade(leaf, 0.6));
  for (const [x, y, r] of fol) circle(ctx, x, y, r, volR(ctx, x, y, r, leaf));
  for (let k = 0; k < 12; k++) ellipse(ctx, -48 + k * 7, -92 - (k % 3) * 7, 2.8, 1.4, leaf2, k * 0.6);
}

function giant(ctx, a, col) {
  ctx.save(); ctx.scale(1.35, 1.35);
  const body = col.cloth;
  limb(ctx, -8, -30, -13, -4, 11, body); limb(ctx, 8, -30, 14, -4, 11, body);
  rrect(ctx, -19, -6, 12, 6, 2.5, shade(body, 0.6)); rrect(ctx, 8, -6, 12, 6, 2.5, shade(body, 0.6));
  ctx.beginPath(); ctx.moveTo(-17, -58); ctx.quadraticCurveTo(0, -64, 17, -58); ctx.lineTo(14, -28); ctx.lineTo(-14, -28); ctx.closePath();
  ctx.fillStyle = vol(ctx, -17, 0, 17, 0, body); ctx.fill();
  ellipse(ctx, -6, -48, 5.5, 7, lighten(body, 0.12)); ellipse(ctx, 6, -48, 5.5, 7, lighten(body, 0.12)); line(ctx, 0, -42, 0, -32, shade(body, 0.7), 1.2);
  // loincloth / belt
  poly(ctx, [[-14, -32], [14, -32], [15, -18], [8, -22], [0, -16], [-8, -22], [-15, -18]], vol(ctx, -15, 0, 15, 0, col.metal));
  rrect(ctx, -14, -34, 28, 5, 1.5, '#5a3a22'); circle(ctx, 0, -31.5, 3, '#d9a93a');
  limb(ctx, -10, -52, -22, -34, 9, body); circle(ctx, -23, -32, 5, body);
  face(ctx, 2, -67, 9.5, { skin: body }, a, {});
  if (!a.horns) { ctx.beginPath(); ctx.arc(2, -70, 9.5, Math.PI * 1.1, Math.PI * 1.9); ctx.fillStyle = '#2a2420'; ctx.fill(); }
  limb(ctx, 10, -52, 23, -36, 9, body); circle(ctx, 24, -34, 5, body);
  weapon(ctx, a.weapon || 'club', 24, -34, true);
  ctx.restore();
}

function spider(ctx, a, col) {
  const b = col.cloth;
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
    const bx = s * 6, by = -28 + i * 2;
    const mx = s * (16 + i * 4), my = -46 + i * 6, ex = s * (28 + i * 6), ey = -2;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(mx, my); ctx.lineTo(ex, ey); ctx.strokeStyle = b; ctx.lineWidth = 3.2; ctx.lineJoin = 'round'; ctx.stroke();
    circle(ctx, mx, my, 2.2, shade(b, 1.3));
    ctx.beginPath(); ctx.moveTo(bx, by - 1); ctx.lineTo(mx, my - 1); ctx.strokeStyle = lighten(b, 0.4); ctx.lineWidth = 1; ctx.stroke();
  }
  ellipse(ctx, -12, -28, 20, 14, rgrad(ctx, -18, -36, 2, 24, [[0, lighten(b, 0.4)], [0.5, b], [1, shade(b, 0.5)]]));
  ellipse(ctx, -12, -28, 10, 6, col.metal, 0.3); line(ctx, -16, -30, -8, -26, col.accent, 1.5); line(ctx, -8, -30, -16, -26, col.accent, 1.5);
  ellipse(ctx, -18, -34, 5, 2.5, 'rgba(255,255,255,0.25)', -0.4);
  ellipse(ctx, 12, -26, 11, 9, volR(ctx, 12, -26, 11, lighten(b, 0.15)));
  ctx.shadowColor = col.accent; ctx.shadowBlur = 5;
  for (const [x, y, r] of [[18, -31, 2.4], [22.5, -27.5, 2.4], [15, -25.5, 1.6], [20, -22, 1.4]]) circle(ctx, x, y, r, col.accent);
  ctx.shadowBlur = 0;
  poly(ctx, [[20, -19], [27, -12], [23, -15]], col.metal); poly(ctx, [[14, -18], [10, -11], [15, -14]], col.metal);
  // hairs
  for (let i = 0; i < 6; i++) line(ctx, -26 + i * 5, -40, -28 + i * 5, -44, b, 1);
}

function dragon(ctx, a, col) {
  const b = col.cloth, d = col.metal, acc = col.accent;
  // far wing
  ctx.beginPath(); ctx.moveTo(-6, -52); ctx.quadraticCurveTo(-30, -104, -64, -90); ctx.lineTo(-54, -70); ctx.lineTo(-44, -78); ctx.lineTo(-34, -60); ctx.lineTo(-22, -66); ctx.lineTo(-12, -48); ctx.closePath();
  ctx.fillStyle = lgrad(ctx, -64, -104, 0, -40, [[0, lighten(d, 0.3)], [1, shade(d, 0.55)]]); ctx.fill();
  for (let k = 0; k < 4; k++) line(ctx, -6, -52, -24 - k * 10, -66 - k * 8, shade(d, 0.45), 1.6);
  // legs
  limb(ctx, -14, -32, -22, -2, 9, b); limb(ctx, 10, -32, 14, -2, 9, b);
  for (const x of [-22, 14]) for (let k = -1; k <= 1; k++) line(ctx, x, -2, x + 4 + k * 4, 2, '#e8e0c8', 2.2);
  // tail
  ctx.beginPath(); ctx.moveTo(-30, -36); ctx.quadraticCurveTo(-56, -34, -60, -12); ctx.strokeStyle = b; ctx.lineWidth = 8; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-30, -36); ctx.quadraticCurveTo(-56, -34, -60, -12); ctx.strokeStyle = lighten(b, 0.25); ctx.lineWidth = 2; ctx.stroke();
  poly(ctx, [[-60, -12], [-70, -6], [-58, -4]], d);
  // body
  ctx.beginPath(); ctx.ellipse(-4, -40, 30, 16, 0, 0, Math.PI * 2); ctx.fillStyle = lgrad(ctx, 0, -56, 0, -24, [[0, lighten(b, 0.35)], [0.6, b], [1, shade(b, 0.5)]]); ctx.fill();
  for (let k = 0; k < 9; k++) ellipse(ctx, -26 + k * 6, -44 + (k % 2) * 3, 3.2, 2.2, shade(b, 0.7), 0);
  ellipse(ctx, -2, -32, 22, 7, vol(ctx, -24, 0, 20, 0, acc), 0);
  for (let k = 0; k < 6; k++) line(ctx, -20 + k * 7, -34, -20 + k * 7, -28, shade(acc, 0.7), 1);
  // neck & head
  ctx.beginPath(); ctx.moveTo(18, -50); ctx.quadraticCurveTo(34, -62, 36, -84); ctx.strokeStyle = b; ctx.lineWidth = 11; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(18, -52); ctx.quadraticCurveTo(32, -62, 34, -82); ctx.strokeStyle = lighten(b, 0.25); ctx.lineWidth = 2.5; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(28, -92); ctx.quadraticCurveTo(44, -98, 62, -86); ctx.quadraticCurveTo(54, -78, 40, -78); ctx.quadraticCurveTo(28, -80, 28, -92); ctx.closePath(); ctx.fillStyle = vol(ctx, 28, -98, 62, -78, b); ctx.fill();
  line(ctx, 34, -94, 28, -108, d, 3.5); line(ctx, 42, -96, 44, -110, d, 3.5);
  ctx.shadowColor = acc; ctx.shadowBlur = 6; circle(ctx, 44, -89, 2.6, acc); circle(ctx, 45, -89.5, 1, '#111'); ctx.shadowBlur = 0;
  for (let i = 0; i < 4; i++) poly(ctx, [[48 + i * 3.5, -80], [49 + i * 3.5, -76], [51 + i * 3.5, -80]], '#f0ead0');
  circle(ctx, 60, -86, 1.2, '#111');
  // back spikes
  for (let i = 0; i < 6; i++) poly(ctx, [[-24 + i * 9, -52 - (i % 2) * 2], [-19 + i * 9, -64], [-14 + i * 9, -52]], vol(ctx, -24 + i * 9, 0, -14 + i * 9, 0, d));
  // near wing
  ctx.beginPath(); ctx.moveTo(4, -54); ctx.quadraticCurveTo(10, -100, -30, -112); ctx.lineTo(-22, -92); ctx.lineTo(-12, -96); ctx.lineTo(-8, -78); ctx.lineTo(2, -82); ctx.lineTo(6, -66); ctx.closePath();
  ctx.fillStyle = lgrad(ctx, -30, -112, 10, -50, [[0, lighten(d, 0.4)], [1, shade(d, 0.6)]]); ctx.fill();
  for (let k = 0; k < 3; k++) line(ctx, 4, -54, -12 - k * 8, -86 - k * 8, shade(d, 0.45), 1.6);
}
