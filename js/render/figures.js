// Procedural creature figures (side view, facing right) used both on the
// adventure map and on the battlefield.
import { mk, poly, circle, ellipse, rrect, line, lgrad, shade, lighten, rgba } from './draw.js';

const cache = new Map();

/** Returns a canvas with the creature drawn, ground line at y = S*0.92 */
export function figure(unit, S = 96, flip = false) {
  const key = `${unit.id}:${S}:${flip ? 1 : 0}`;
  if (cache.has(key)) return cache.get(key);
  const c = mk(S, S);
  const ctx = c.getContext('2d');
  ctx.save();
  if (flip) { ctx.translate(S, 0); ctx.scale(-1, 1); }
  const a = unit.art;
  const sc = (a.scale || 1) * S / 96;
  ctx.translate(S / 2, S * 0.92);
  ctx.scale(sc, sc);
  // ground shadow
  ellipse(ctx, 0, 0, 26, 7, 'rgba(0,0,0,0.28)');
  const col = { cloth: a.c1, metal: a.c2, accent: a.c3, skin: a.skin || a.c3 };
  switch (a.shape) {
    case 'humanoid': humanoid(ctx, a, col); break;
    case 'skeleton': humanoid(ctx, a, { ...col, skin: a.c1, cloth: a.c1 }, true); break;
    case 'wraith': wraith(ctx, a, col); break;
    case 'dryad': dryad(ctx, a, col); break;
    case 'beast': beast(ctx, a, col, 1); break;
    case 'rider': rider(ctx, a, col); break;
    case 'eagle': eagle(ctx, a, col); break;
    case 'treeman': treeman(ctx, a, col); break;
    case 'giant': giant(ctx, a, col); break;
    case 'spider': spider(ctx, a, col); break;
    case 'dragon': dragon(ctx, a, col); break;
    default: humanoid(ctx, a, col);
  }
  ctx.restore();
  cache.set(key, c);
  return c;
}

function outline(ctx) { ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 1.2; ctx.lineJoin = 'round'; }

function weapon(ctx, kind, col, hx, hy, big = false) {
  const metal = '#c9ccd2', dark = '#5a5e66', wood = '#6b4a2a';
  ctx.save();
  ctx.translate(hx, hy);
  switch (kind) {
    case 'bow': {
      ctx.beginPath(); ctx.arc(6, 0, 22, -Math.PI / 2.2, Math.PI / 2.2);
      ctx.strokeStyle = wood; ctx.lineWidth = 3; ctx.stroke();
      line(ctx, 6 + 22 * Math.cos(-Math.PI / 2.2), 22 * Math.sin(-Math.PI / 2.2), 6 + 22 * Math.cos(Math.PI / 2.2), 22 * Math.sin(Math.PI / 2.2), '#e8e2c8', 1);
      line(ctx, -4, 0, 24, 0, '#d8c8a0', 2); poly(ctx, [[24, -3], [30, 0], [24, 3]], metal);
      break;
    }
    case 'axe': line(ctx, 0, 8, 6, -22, wood, 3.5); poly(ctx, [[6, -22], [18, -30], [20, -14], [8, -12]], metal, dark); break;
    case 'greataxe': line(ctx, -2, 12, 8, -34, wood, 4); poly(ctx, [[8, -34], [24, -44], [26, -18], [10, -20]], metal, dark); poly(ctx, [[8, -34], [-8, -44], [-10, -18], [6, -20]], metal, dark); break;
    case 'spear': line(ctx, -6, 14, 14, -40, wood, 3); poly(ctx, [[14, -40], [10, -32], [20, -34]], metal, dark); break;
    case 'sword': line(ctx, 0, 0, 16, -30, metal, 4); line(ctx, -3, -3, 7, -9, dark, 3); break;
    case 'dagger': line(ctx, 2, 0, 12, -14, metal, 3); break;
    case 'club': line(ctx, 0, 4, 12, -30, wood, 5); ellipse(ctx, 14, -34, 8, 11, shade(wood, 0.8), 0.6); break;
    case 'twinblades': line(ctx, 0, 0, 18, -24, metal, 3); line(ctx, -2, 2, -20, -22, metal, 3); break;
  }
  ctx.restore();
}

function head(ctx, x, y, r, col, a) {
  circle(ctx, x, y, r, col.skin);
  // eye
  circle(ctx, x + r * 0.45, y - r * 0.1, r * 0.14, '#111');
  if (a.tusks) { poly(ctx, [[x + r * 0.5, y + r * 0.5], [x + r * 0.7, y + r * 0.1], [x + r * 0.85, y + r * 0.55]], '#f0ead0'); }
  if (a.horns) { line(ctx, x - r * 0.5, y - r * 0.8, x - r * 1.1, y - r * 1.9, '#d8c8a0', 3); line(ctx, x + r * 0.3, y - r * 0.9, x + r * 0.9, y - r * 1.9, '#d8c8a0', 3); }
  if (a.beard) { ellipse(ctx, x + r * 0.2, y + r * 0.8, r * 0.7, r * 0.5, '#5a3a20'); }
}

function humanoid(ctx, a, col, skeleton = false) {
  const small = a.small ? 0.75 : 1;
  ctx.save(); ctx.scale(small, small);
  const cloth = col.cloth, metal = col.metal, skin = col.skin;
  // back arm
  line(ctx, -4, -42, -12, -26, skin, skeleton ? 3 : 6);
  // legs
  line(ctx, -6, -30, -9, -4, skeleton ? skin : cloth, skeleton ? 3 : 8);
  line(ctx, 5, -30, 9, -4, skeleton ? skin : cloth, skeleton ? 3 : 8);
  rrect(ctx, -14, -6, 10, 6, 2, metal); rrect(ctx, 5, -6, 10, 6, 2, metal);
  // cloak
  if (a.hood) poly(ctx, [[-8, -56], [-20, -12], [6, -16], [10, -52]], shade(cloth, 0.75));
  // torso
  rrect(ctx, -10, -56, 20, 30, 6, a.armor ? metal : cloth);
  if (a.armor) { line(ctx, -8, -46, 8, -46, shade(metal, 0.6), 1.5); line(ctx, -8, -38, 8, -38, shade(metal, 0.6), 1.5); }
  if (skeleton) { for (let i = 0; i < 4; i++) line(ctx, -8, -52 + i * 6, 8, -52 + i * 6, shade(skin, 0.6), 1.5); }
  // belt
  rrect(ctx, -10, -32, 20, 4, 1, shade(cloth, 0.5));
  // head
  head(ctx, 2, -66, 10, { skin }, a);
  // hair/helmet/hood
  if (a.hood) { ctx.beginPath(); ctx.arc(2, -68, 12, Math.PI * 0.9, Math.PI * 2.05); ctx.fillStyle = shade(cloth, 0.8); ctx.fill(); }
  else if (a.armor) { ctx.beginPath(); ctx.arc(2, -68, 11, Math.PI, Math.PI * 2); ctx.fillStyle = shade(metal, 1.2); ctx.fill(); rrect(ctx, 6, -70, 6, 10, 1, shade(metal, 1.2)); }
  else if (!skeleton && !a.horns) { ctx.beginPath(); ctx.arc(1, -69, 10.5, Math.PI * 1.05, Math.PI * 1.95); ctx.fillStyle = col.accent === skin ? '#3a2a1a' : shade(col.accent, 0.8); ctx.fill(); }
  // front arm + weapon
  line(ctx, 6, -44, 18, -32, skin, skeleton ? 3 : 6);
  if (a.shield) { ellipse(ctx, -14, -40, 8, 13, metal, 0, shade(metal, 0.5), 1.5); circle(ctx, -14, -40, 3, col.accent); }
  if (a.weapon) weapon(ctx, a.weapon, col, 18, -32);
  ctx.restore();
}

function wraith(ctx, a, col) {
  const g = lgrad(ctx, 0, -70, 0, 0, [[0, col.cloth], [1, 'rgba(20,20,40,0)']]);
  poly(ctx, [[-14, -60], [14, -60], [20, -20], [16, 0], [8, -8], [0, 0], [-8, -8], [-16, 0], [-20, -20]], g);
  ctx.beginPath(); ctx.arc(0, -64, 14, Math.PI * 0.8, Math.PI * 2.2); ctx.fillStyle = shade(col.cloth, 0.8); ctx.fill();
  circle(ctx, -4, -62, 2.5, col.accent); circle(ctx, 5, -62, 2.5, col.accent);
  ctx.shadowColor = col.accent; ctx.shadowBlur = 8; circle(ctx, -4, -62, 1.5, '#fff'); circle(ctx, 5, -62, 1.5, '#fff'); ctx.shadowBlur = 0;
  line(ctx, 8, -40, 24, -30, col.metal, 5); line(ctx, 24, -30, 32, -50, '#9ab', 3);
}

function dryad(ctx, a, col) {
  line(ctx, -5, -30, -8, -2, col.cloth, 6); line(ctx, 5, -30, 10, -2, col.cloth, 6);
  rrect(ctx, -8, -56, 16, 30, 7, col.cloth);
  for (let i = 0; i < 3; i++) line(ctx, -6 + i * 5, -52, -4 + i * 5, -30, shade(col.cloth, 0.7), 1);
  line(ctx, -6, -46, -24, -60, col.cloth, 4); line(ctx, -24, -60, -30, -70, col.cloth, 2); line(ctx, -24, -60, -32, -56, col.cloth, 2);
  line(ctx, 6, -46, 22, -36, col.cloth, 4); line(ctx, 22, -36, 30, -30, col.cloth, 2);
  circle(ctx, 0, -66, 9, col.cloth);
  for (let i = 0; i < 7; i++) { const an = -Math.PI * 0.9 + i * 0.3; ellipse(ctx, Math.cos(an) * 10, -66 + Math.sin(an) * 10 - 2, 7, 3.5, i % 2 ? col.metal : col.accent, an); }
  circle(ctx, 4, -67, 1.6, '#ffe'); 
}

function beast(ctx, a, col, scale = 1) {
  ctx.save(); ctx.scale(scale, scale);
  // legs
  line(ctx, -16, -22, -20, -2, col.cloth, 6); line(ctx, -8, -22, -6, -2, col.metal, 6);
  line(ctx, 10, -22, 8, -2, col.metal, 6); line(ctx, 18, -22, 22, -2, col.cloth, 6);
  // body
  ellipse(ctx, 0, -28, 26, 12, col.cloth, -0.05);
  ellipse(ctx, -4, -24, 20, 7, shade(col.cloth, 0.85), 0);
  // tail
  ctx.beginPath(); ctx.moveTo(-24, -30); ctx.quadraticCurveTo(-40, -36, -38, -50); ctx.strokeStyle = col.cloth; ctx.lineWidth = 5; ctx.stroke();
  // head
  ellipse(ctx, 26, -36, 12, 9, col.cloth, 0.2);
  poly(ctx, [[34, -40], [46, -36], [34, -30]], col.cloth);
  poly(ctx, [[18, -44], [22, -56], [27, -44]], col.cloth); poly(ctx, [[26, -45], [31, -56], [34, -44]], col.cloth);
  circle(ctx, 30, -38, 2, col.accent);
  circle(ctx, 45, -35, 1.5, '#111');
  ctx.restore();
}

function stag(ctx, col) {
  const body = col.cloth;
  line(ctx, -18, -30, -22, -2, body, 5); line(ctx, -8, -30, -6, -2, shade(body, 0.8), 5);
  line(ctx, 12, -30, 10, -2, shade(body, 0.8), 5); line(ctx, 20, -30, 26, -2, body, 5);
  ellipse(ctx, 0, -38, 28, 12, body);
  line(ctx, 22, -44, 34, -66, body, 8);
  ellipse(ctx, 36, -70, 9, 6, body, 0.3);
  circle(ctx, 40, -72, 1.4, '#111');
  const ant = '#e8d8b0';
  line(ctx, 32, -76, 24, -92, ant, 2.5); line(ctx, 28, -84, 20, -88, ant, 2); line(ctx, 26, -88, 30, -98, ant, 2);
  line(ctx, 36, -77, 40, -94, ant, 2.5); line(ctx, 38, -86, 46, -90, ant, 2); line(ctx, 39, -90, 36, -100, ant, 2);
}
function warg(ctx, col) {
  const body = col.metal;
  line(ctx, -18, -28, -24, -2, body, 7); line(ctx, -8, -28, -6, -2, shade(body, 0.8), 7);
  line(ctx, 12, -28, 10, -2, shade(body, 0.8), 7); line(ctx, 20, -28, 28, -2, body, 7);
  ellipse(ctx, 0, -36, 30, 14, body);
  ctx.beginPath(); ctx.moveTo(-28, -38); ctx.quadraticCurveTo(-44, -44, -42, -58); ctx.strokeStyle = body; ctx.lineWidth = 5; ctx.stroke();
  ellipse(ctx, 30, -46, 14, 10, body, 0.2); poly(ctx, [[40, -50], [54, -44], [40, -38]], body);
  poly(ctx, [[22, -54], [26, -66], [31, -54]], body);
  circle(ctx, 34, -48, 2.2, '#ffd040'); circle(ctx, 52, -43, 1.6, '#111');
  for (let i = 0; i < 3; i++) poly(ctx, [[42 + i * 4, -42], [43 + i * 4, -37], [45 + i * 4, -42]], '#f0f0e0');
}
function rider(ctx, a, col) {
  if (a.mount === 'stag') stag(ctx, col); else warg(ctx, col);
  ctx.save(); ctx.translate(-2, -36); ctx.scale(0.72, 0.72);
  humanoid(ctx, { ...a, shape: 'humanoid' }, { ...col, cloth: a.mount === 'stag' ? col.metal : col.cloth });
  ctx.restore();
}

function eagle(ctx, a, col) {
  const f = col.cloth, light = col.metal;
  // wings
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(0, -50);
    ctx.quadraticCurveTo(s * 30, -90, s * 56, -78);
    ctx.quadraticCurveTo(s * 44, -62, s * 50, -50);
    ctx.quadraticCurveTo(s * 34, -48, s * 42, -36);
    ctx.quadraticCurveTo(s * 20, -40, 0, -36); ctx.closePath();
    ctx.fillStyle = s < 0 ? shade(f, 0.8) : f; ctx.fill();
    for (let i = 0; i < 4; i++) line(ctx, s * (14 + i * 9), -56 + i * 2, s * (18 + i * 9), -76 + i * 1, shade(f, 0.65), 1);
  }
  ellipse(ctx, 0, -44, 11, 18, f);
  poly(ctx, [[-8, -30], [0, -14], [8, -30]], shade(f, 0.7));
  circle(ctx, 2, -64, 8, light);
  poly(ctx, [[8, -66], [18, -62], [8, -59]], col.accent);
  circle(ctx, 5, -66, 1.6, '#111');
  line(ctx, -4, -28, -8, -14, col.accent, 2.5); line(ctx, 4, -28, 8, -14, col.accent, 2.5);
}

function treeman(ctx, a, col) {
  const bark = col.cloth, leaf = col.metal, leaf2 = col.accent;
  line(ctx, -10, -30, -18, -2, bark, 9); line(ctx, 8, -30, 16, -2, bark, 9);
  line(ctx, -18, -2, -26, 2, bark, 5); line(ctx, 16, -2, 26, 2, bark, 5);
  rrect(ctx, -16, -70, 32, 44, 10, bark);
  for (let i = 0; i < 5; i++) line(ctx, -12 + i * 6, -66, -10 + i * 6, -30, shade(bark, 0.7), 1.2);
  line(ctx, -14, -60, -40, -78, bark, 7); line(ctx, -40, -78, -48, -92, bark, 4); line(ctx, -40, -78, -52, -74, bark, 3);
  line(ctx, 14, -58, 36, -44, bark, 7); line(ctx, 36, -44, 46, -36, bark, 4);
  circle(ctx, -4, -56, 2.5, '#ffd97a'); circle(ctx, 6, -56, 2.5, '#ffd97a');
  ctx.beginPath(); ctx.moveTo(-6, -46); ctx.quadraticCurveTo(1, -42, 8, -46); ctx.strokeStyle = shade(bark, 0.5); ctx.lineWidth = 2; ctx.stroke();
  for (const [x, y, r] of [[-14, -82, 16], [10, -86, 18], [-2, -96, 14], [-28, -92, 12], [-48, -96, 9]]) circle(ctx, x, y, r, leaf);
  for (const [x, y, r] of [[-10, -86, 8], [14, -92, 9], [-30, -96, 6], [0, -100, 6]]) circle(ctx, x, y, r, leaf2);
}

function giant(ctx, a, col) {
  ctx.save(); ctx.scale(1.35, 1.35);
  const skin = col.skin === col.accent ? col.cloth : col.skin;
  const body = col.cloth;
  line(ctx, -8, -30, -12, -2, body, 10); line(ctx, 8, -30, 14, -2, body, 10);
  rrect(ctx, -14, -58, 28, 32, 9, body);
  rrect(ctx, -14, -36, 28, 10, 2, col.metal);
  line(ctx, -8, -50, -22, -30, body, 8);
  head(ctx, 2, -66, 9, { skin: body }, a);
  line(ctx, 8, -50, 22, -36, body, 8);
  weapon(ctx, a.weapon || 'club', col, 22, -36, true);
  ctx.restore();
}

function spider(ctx, a, col) {
  const b = col.cloth;
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
    const bx = s * 6, by = -28 + i * 2;
    const mx = s * (16 + i * 4), my = -44 + i * 6, ex = s * (26 + i * 6), ey = -2;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(mx, my); ctx.lineTo(ex, ey); ctx.strokeStyle = b; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke();
  }
  ellipse(ctx, -12, -28, 20, 14, b);
  ellipse(ctx, -12, -28, 10, 6, col.metal, 0.3);
  ellipse(ctx, 12, -26, 11, 9, shade(b, 1.2));
  circle(ctx, 18, -30, 2, col.accent); circle(ctx, 22, -27, 2, col.accent); circle(ctx, 15, -25, 1.5, col.accent);
  poly(ctx, [[20, -20], [26, -14], [22, -16]], col.metal); poly(ctx, [[14, -19], [10, -12], [15, -15]], col.metal);
}

function dragon(ctx, a, col) {
  const b = col.cloth, d = col.metal, acc = col.accent;
  // wing
  ctx.beginPath(); ctx.moveTo(-6, -50); ctx.quadraticCurveTo(-30, -100, -60, -86); ctx.lineTo(-50, -66); ctx.lineTo(-40, -74); ctx.lineTo(-32, -58); ctx.lineTo(-20, -64); ctx.lineTo(-12, -48); ctx.closePath();
  ctx.fillStyle = d; ctx.fill();
  line(ctx, -14, -30, -20, -2, b, 8); line(ctx, 10, -30, 14, -2, b, 8);
  ctx.beginPath(); ctx.moveTo(-30, -36); ctx.quadraticCurveTo(-54, -34, -58, -12); ctx.strokeStyle = b; ctx.lineWidth = 7; ctx.stroke();
  ellipse(ctx, -4, -40, 30, 16, b);
  ellipse(ctx, -4, -34, 22, 7, acc, 0);
  ctx.beginPath(); ctx.moveTo(18, -48); ctx.quadraticCurveTo(34, -60, 36, -80); ctx.strokeStyle = b; ctx.lineWidth = 10; ctx.stroke();
  ellipse(ctx, 40, -84, 13, 8, b, 0.1);
  poly(ctx, [[50, -88], [64, -82], [50, -78]], b);
  line(ctx, 34, -90, 28, -102, d, 3); line(ctx, 42, -92, 42, -104, d, 3);
  circle(ctx, 46, -86, 2, acc);
  for (let i = 0; i < 5; i++) poly(ctx, [[-20 + i * 9, -52 - (i % 2) * 2], [-16 + i * 9, -62], [-12 + i * 9, -52]], d);
}
