// Small glyph icons for spells, artifacts and skills.
import { mk, poly, circle, ellipse, rrect, line, lgrad, rgrad, shade, lighten, rgba } from './draw.js';
import { SPELLS } from '../data/spells.js';
import { ARTIFACTS } from '../data/artifacts.js';
import { assetCanvas } from './assets.js';
import { roman } from '../core/utils.js';

/** Mage guild levels share one painted icon; the level is stamped on. */
export const buildingIconKey = (id) => (id.startsWith('mage') ? 'mage' : id);

const cache = new Map();
export function clearIconCache() { cache.clear(); }

function glyph(ctx, g, col, S) {
  const c = S / 2;
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = S * 0.08; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const u = S / 32;
  switch (g) {
    case 'arrow': line(ctx, 8 * u, 24 * u, 24 * u, 8 * u, col, 2.5 * u); poly(ctx, [[24 * u, 8 * u], [16 * u, 10 * u], [22 * u, 16 * u]], col); break;
    case 'wind': for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(6 * u, (10 + i * 6) * u); ctx.quadraticCurveTo(18 * u, (6 + i * 6) * u, 26 * u, (12 + i * 6) * u); ctx.stroke(); } break;
    case 'chain': for (let i = 0; i < 3; i++) ellipse(ctx, (10 + i * 6) * u, (12 + i * 4) * u, 4 * u, 2.5 * u, null, 0.6, col, 2 * u); break;
    case 'sun': circle(ctx, c, c, 6 * u, col); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; line(ctx, c + Math.cos(a) * 9 * u, c + Math.sin(a) * 9 * u, c + Math.cos(a) * 13 * u, c + Math.sin(a) * 13 * u, col, 2 * u); } break;
    case 'skull': circle(ctx, c, 13 * u, 8 * u, col); rrect(ctx, 12 * u, 19 * u, 8 * u, 6 * u, 2 * u, col); circle(ctx, 13 * u, 12 * u, 2.2 * u, '#000'); circle(ctx, 19 * u, 12 * u, 2.2 * u, '#000'); break;
    case 'shield': poly(ctx, [[8 * u, 6 * u], [24 * u, 6 * u], [24 * u, 18 * u], [16 * u, 27 * u], [8 * u, 18 * u]], col); break;
    case 'leaf': ctx.beginPath(); ctx.moveTo(8 * u, 26 * u); ctx.quadraticCurveTo(6 * u, 8 * u, 26 * u, 6 * u); ctx.quadraticCurveTo(26 * u, 24 * u, 8 * u, 26 * u); ctx.fill(); line(ctx, 10 * u, 24 * u, 22 * u, 10 * u, '#000', 1.2 * u); break;
    case 'fire': ctx.beginPath(); ctx.moveTo(16 * u, 4 * u); ctx.quadraticCurveTo(28 * u, 16 * u, 20 * u, 28 * u); ctx.quadraticCurveTo(12 * u, 28 * u, 10 * u, 20 * u); ctx.quadraticCurveTo(8 * u, 14 * u, 14 * u, 12 * u); ctx.quadraticCurveTo(12 * u, 18 * u, 16 * u, 18 * u); ctx.quadraticCurveTo(20 * u, 14 * u, 16 * u, 4 * u); ctx.fill(); break;
    case 'down': line(ctx, c, 6 * u, c, 24 * u, col, 3 * u); poly(ctx, [[8 * u, 18 * u], [c, 28 * u], [24 * u, 18 * u]], col); break;
    case 'up': line(ctx, c, 26 * u, c, 8 * u, col, 3 * u); poly(ctx, [[8 * u, 14 * u], [c, 4 * u], [24 * u, 14 * u]], col); break;
    case 'bolt': poly(ctx, [[18 * u, 3 * u], [8 * u, 18 * u], [15 * u, 18 * u], [12 * u, 29 * u], [24 * u, 13 * u], [17 * u, 13 * u]], col); break;
    case 'sword': line(ctx, 8 * u, 24 * u, 24 * u, 8 * u, col, 3 * u); line(ctx, 8 * u, 16 * u, 16 * u, 24 * u, col, 2.5 * u); break;
    case 'axe': line(ctx, 8 * u, 26 * u, 20 * u, 8 * u, '#8a6a4a', 2.5 * u); poly(ctx, [[18 * u, 6 * u], [28 * u, 10 * u], [24 * u, 18 * u], [16 * u, 12 * u]], col); break;
    case 'bow': ctx.beginPath(); ctx.arc(14 * u, 16 * u, 10 * u, -Math.PI / 2.2, Math.PI / 2.2); ctx.stroke(); line(ctx, 14 * u + 10 * u * Math.cos(-Math.PI / 2.2), 16 * u + 10 * u * Math.sin(-Math.PI / 2.2), 14 * u + 10 * u * Math.cos(Math.PI / 2.2), 16 * u + 10 * u * Math.sin(Math.PI / 2.2), col, 1 * u); break;
    case 'club': line(ctx, 8 * u, 26 * u, 20 * u, 10 * u, '#8a6a4a', 3 * u); ellipse(ctx, 22 * u, 8 * u, 5 * u, 7 * u, col, 0.6); break;
    case 'armor': poly(ctx, [[8 * u, 8 * u], [12 * u, 5 * u], [20 * u, 5 * u], [24 * u, 8 * u], [26 * u, 16 * u], [22 * u, 27 * u], [10 * u, 27 * u], [6 * u, 16 * u]], col); break;
    case 'crown': poly(ctx, [[6 * u, 24 * u], [6 * u, 10 * u], [12 * u, 16 * u], [16 * u, 6 * u], [20 * u, 16 * u], [26 * u, 10 * u], [26 * u, 24 * u]], col); break;
    case 'helm': ctx.beginPath(); ctx.arc(c, 16 * u, 10 * u, Math.PI, 0); ctx.lineTo(26 * u, 24 * u); ctx.lineTo(6 * u, 24 * u); ctx.closePath(); ctx.fill(); rrect(ctx, 14 * u, 14 * u, 4 * u, 10 * u, 1, '#000'); break;
    case 'cloak': ctx.beginPath(); ctx.moveTo(16 * u, 4 * u); ctx.quadraticCurveTo(4 * u, 14 * u, 8 * u, 28 * u); ctx.lineTo(24 * u, 28 * u); ctx.quadraticCurveTo(28 * u, 14 * u, 16 * u, 4 * u); ctx.fill(); break;
    case 'ring': circle(ctx, c, c, 8 * u, null, col, 3.5 * u); circle(ctx, c, 8 * u, 2.5 * u, '#fff'); break;
    case 'gem': poly(ctx, [[8 * u, 12 * u], [12 * u, 6 * u], [20 * u, 6 * u], [24 * u, 12 * u], [16 * u, 27 * u]], col); poly(ctx, [[12 * u, 6 * u], [16 * u, 12 * u], [20 * u, 6 * u]], 'rgba(255,255,255,0.5)'); break;
    case 'boots': poly(ctx, [[10 * u, 6 * u], [18 * u, 6 * u], [18 * u, 18 * u], [26 * u, 22 * u], [26 * u, 26 * u], [8 * u, 26 * u]], col); break;
    case 'horn': ctx.beginPath(); ctx.moveTo(6 * u, 10 * u); ctx.quadraticCurveTo(14 * u, 30 * u, 28 * u, 20 * u); ctx.lineTo(26 * u, 14 * u); ctx.quadraticCurveTo(14 * u, 20 * u, 10 * u, 6 * u); ctx.closePath(); ctx.fill(); break;
    case 'banner': line(ctx, 8 * u, 28 * u, 8 * u, 4 * u, '#8a6a4a', 2 * u); poly(ctx, [[8 * u, 4 * u], [26 * u, 8 * u], [8 * u, 16 * u]], col); break;
    case 'orb': circle(ctx, c, c, 9 * u, rgrad(ctx, c - 3 * u, c - 3 * u, 1, 10 * u, [[0, '#fff'], [0.3, col], [1, shade(col, 0.5)]])); break;
    case 'book': rrect(ctx, 7 * u, 6 * u, 18 * u, 22 * u, 2 * u, col); line(ctx, 16 * u, 8 * u, 16 * u, 26 * u, '#000', 1 * u); break;
    default: circle(ctx, c, c, 8 * u, col);
  }
}

export function spellIcon(id, S = 40) {
  const key = `sp:${id}:${S}`;
  if (cache.has(key)) return cache.get(key);
  const sp = SPELLS[id];
  const ak = assetCanvas(`spells/${id}`, S, S);
  if (ak) { cache.set(key, ak); return ak; }
  const c = mk(S, S); const ctx = c.getContext('2d');
  rrect(ctx, 1, 1, S - 2, S - 2, S * 0.18, rgrad(ctx, S / 2, S / 2, 2, S * 0.7, [[0, shade(sp.icon.c, 0.45)], [1, '#0b0e14']]), rgba(sp.icon.c, 0.7), 1.5);
  ctx.shadowColor = sp.icon.c; ctx.shadowBlur = S * 0.15;
  glyph(ctx, sp.icon.g, sp.icon.c, S);
  cache.set(key, c);
  return c;
}
export function artifactIcon(id, S = 40) {
  const key = `art:${id}:${S}`;
  if (cache.has(key)) return cache.get(key);
  const a = ARTIFACTS[id];
  const c = mk(S, S); const ctx = c.getContext('2d');
  const border = a.rarity >= 3 ? '#ffd700' : a.rarity === 2 ? '#c0a0ff' : '#a0a0a0';
  rrect(ctx, 1, 1, S - 2, S - 2, S * 0.15, rgrad(ctx, S / 2, S / 2, 2, S * 0.7, [[0, '#2a2a36'], [1, '#0b0e14']]), border, 1.5);
  ctx.shadowColor = a.art.c; ctx.shadowBlur = S * 0.12;
  glyph(ctx, a.art.g, a.art.c, S);
  cache.set(key, c);
  return c;
}
export function skillIcon(id, S = 40) {
  const key = `sk:${id}:${S}`;
  if (cache.has(key)) return cache.get(key);
  const map = { logistics: ['boots', '#d0a060'], pathfinding: ['leaf', '#80c060'], scouting: ['orb', '#80c0ff'], offense: ['sword', '#ff8060'], archery: ['bow', '#e0c080'], armorer: ['armor', '#a0a8b8'], leadership: ['banner', '#ffd060'], luck: ['sun', '#ffe080'], wisdom: ['book', '#c0a0ff'], mysticism: ['orb', '#a080ff'], intelligence: ['gem', '#80e0ff'], learning: ['book', '#80ff80'], estates: ['crown', '#ffd700'], sorcery: ['fire', '#ff60a0'] };
  const [g, col] = map[id] || ['orb', '#fff'];
  const c = mk(S, S); const ctx = c.getContext('2d');
  rrect(ctx, 1, 1, S - 2, S - 2, S * 0.15, rgrad(ctx, S / 2, S / 2, 2, S * 0.7, [[0, shade(col, 0.4)], [1, '#0b0e14']]), rgba(col, 0.6), 1.5);
  glyph(ctx, g, col, S);
  cache.set(key, c);
  return c;
}
export function buildingIcon(id, faction, S = 44) {
  const key = `b:${id}:${faction}:${S}`;
  if (cache.has(key)) return cache.get(key);
  const elf = faction === 'elves';
  const ak = assetCanvas(`buildings/${faction}_${buildingIconKey(id)}`, S, S, false, 0.96, 0.96);
  if (ak) {
    if (id.startsWith('mage')) { const x = ak.getContext('2d'); x.setTransform(2, 0, 0, 2, 0, 0); x.font = `bold ${Math.round(S * 0.3)}px Cinzel, Georgia, serif`; x.textAlign = 'right'; x.lineWidth = 3; x.strokeStyle = 'rgba(0,0,0,0.85)'; x.fillStyle = '#ffe9a0'; x.strokeText(roman(+id.slice(4)), S - 3, S - 4); x.fillText(roman(+id.slice(4)), S - 3, S - 4); }
    cache.set(key, ak); return ak;
  }
  const c = mk(S, S); const ctx = c.getContext('2d');
  const u = S / 32;
  const stone = elf ? '#e8e0c8' : '#5a5048', roof = elf ? '#d9a93a' : '#3a2a20', dark = elf ? '#a89f86' : '#2a2420';
  rrect(ctx, 1, 1, S - 2, S - 2, S * 0.15, rgrad(ctx, S / 2, S / 2, 2, S * 0.7, [[0, elf ? '#2e4a34' : '#3a2420'], [1, '#0b0e14']]), 'rgba(227,197,106,0.55)', 1.5);
  const house = (x, w, h, spire) => { rrect(ctx, x, 26 * u - h, w, h, 1.5 * u, lgrad(ctx, x, 0, x + w, 0, [[0, lighten(stone, 0.15)], [1, shade(stone, 0.6)]])); poly(ctx, [[x - 2 * u, 26 * u - h], [x + w / 2, 26 * u - h - (spire ? 11 : 6) * u], [x + w + 2 * u, 26 * u - h]], roof); rrect(ctx, x + w / 2 - 1.5 * u, 26 * u - 4 * u, 3 * u, 4 * u, u, '#ffd27a'); };
  switch (true) {
    case id.startsWith('hall'): { const lvl = +id[4]; house(8 * u, 16 * u, (8 + lvl * 2.5) * u, lvl >= 3); if (lvl >= 2) { line(ctx, 16 * u, 26 * u - (8 + lvl * 2.5) * u - 6 * u, 16 * u, 6 * u, '#3a2a1a', u); poly(ctx, [[16 * u, 6 * u], [22 * u, 8 * u], [16 * u, 10 * u]], elf ? '#4fbf6a' : '#d9452f'); } break; }
    case id === 'fort' || id === 'citadel' || id === 'castle': { const h = id === 'fort' ? 9 : id === 'citadel' ? 12 : 15; rrect(ctx, 5 * u, 26 * u - h * u, 22 * u, h * u, u, lgrad(ctx, 0, 0, 32 * u, 0, [[0, lighten(stone, 0.1)], [1, shade(stone, 0.55)]])); for (let i = 0; i < 4; i++) rrect(ctx, (6 + i * 5.5) * u, 26 * u - h * u - 3 * u, 3 * u, 3.5 * u, 0.5 * u, stone); if (id !== 'fort') { rrect(ctx, 3 * u, 26 * u - (h + 5) * u, 6 * u, (h + 5) * u, u, dark); rrect(ctx, 23 * u, 26 * u - (h + 5) * u, 6 * u, (h + 5) * u, u, dark); } rrect(ctx, 13 * u, 18 * u, 6 * u, 8 * u, 2 * u, '#1a1410'); break; }
    case id === 'tavern': { house(7 * u, 18 * u, 11 * u, false); rrect(ctx, 20 * u, 8 * u, 7 * u, 8 * u, u, '#d9a93a'); rrect(ctx, 21 * u, 7 * u, 5 * u, 2 * u, u, '#fff6d0'); break; }
    case id === 'market': { poly(ctx, [[4 * u, 14 * u], [16 * u, 6 * u], [28 * u, 14 * u]], lgrad(ctx, 0, 6 * u, 0, 14 * u, [[0, '#e86a4a'], [1, '#a83a2a']])); for (let i = 0; i < 4; i++) line(ctx, (7 + i * 6) * u, 14 * u, (7 + i * 6) * u, 8 * u, 'rgba(255,255,255,0.3)', u); rrect(ctx, 6 * u, 14 * u, 20 * u, 10 * u, u, '#8a5a2a'); circle(ctx, 11 * u, 19 * u, 2.2 * u, '#f1c75b'); circle(ctx, 17 * u, 19 * u, 2.2 * u, '#8a8f98'); circle(ctx, 22 * u, 19 * u, 2.2 * u, '#d94fd1'); break; }
    case id === 'silo': { rrect(ctx, 9 * u, 9 * u, 14 * u, 17 * u, 3 * u, lgrad(ctx, 9 * u, 0, 23 * u, 0, [[0, '#9a7a4a'], [1, '#4a3220']])); ellipse(ctx, 16 * u, 9 * u, 7 * u, 2.5 * u, '#b08a5a'); for (let i = 0; i < 3; i++) line(ctx, 9 * u, (13 + i * 5) * u, 23 * u, (13 + i * 5) * u, '#2a1a10', u); break; }
    case id.startsWith('mage'): { const lvl = +id[4]; rrect(ctx, 11 * u, 26 * u - (12 + lvl * 2) * u, 10 * u, (12 + lvl * 2) * u, u, lgrad(ctx, 11 * u, 0, 21 * u, 0, [[0, elf ? '#dfe6ff' : '#7a5a8a'], [1, elf ? '#8a96c0' : '#3a2a4a']])); poly(ctx, [[9 * u, 26 * u - (12 + lvl * 2) * u], [16 * u, 26 * u - (12 + lvl * 2) * u - 8 * u], [23 * u, 26 * u - (12 + lvl * 2) * u]], elf ? '#6a8ad0' : '#2a1a3a'); ctx.shadowColor = '#9fe0ff'; ctx.shadowBlur = 6 * u; circle(ctx, 16 * u, 26 * u - (12 + lvl * 2) * u - 10 * u, 2 * u, '#dff6ff'); ctx.shadowBlur = 0; for (let i = 0; i < lvl; i++) rrect(ctx, 14.5 * u, (23 - i * 3.2) * u, 3 * u, 2 * u, 0.5 * u, '#ffe28a'); break; }
    case id === 'special': { if (elf) { line(ctx, 16 * u, 26 * u, 16 * u, 12 * u, '#6b4a2a', 3 * u); for (const [x, y, r] of [[16, 10, 7], [9, 13, 5], [23, 13, 5]]) circle(ctx, x * u, y * u, r * u, rgrad(ctx, x * u - 2 * u, y * u - 2 * u, 1, r * u, [[0, '#fff0b0'], [1, '#d9922a']])); } else { ellipse(ctx, 16 * u, 18 * u, 10 * u, 5 * u, '#8a5a2a'); rrect(ctx, 6 * u, 18 * u, 20 * u, 8 * u, u, '#5a3a22'); ellipse(ctx, 16 * u, 18 * u, 9 * u, 4 * u, '#d8c0a0'); line(ctx, 10 * u, 8 * u, 15 * u, 16 * u, '#e8e0c8', 1.5 * u); line(ctx, 23 * u, 7 * u, 18 * u, 16 * u, '#e8e0c8', 1.5 * u); } break; }
  }
  cache.set(key, c);
  return c;
}
export function statIcon(stat, S = 24) {
  const key = `st:${stat}:${S}`;
  if (cache.has(key)) return cache.get(key);
  const map = { attack: ['sword', '#ff8060'], defense: ['shield', '#80b0ff'], power: ['fire', '#ff60c0'], knowledge: ['book', '#c0a0ff'], mana: ['orb', '#80c0ff'], move: ['boots', '#d0a060'], morale: ['banner', '#ffd060'], luck: ['sun', '#ffe080'], exp: ['gem', '#80e0ff'] };
  const [g, col] = map[stat] || ['orb', '#fff'];
  const c = mk(S, S); const ctx = c.getContext('2d');
  glyph(ctx, g, col, S);
  cache.set(key, c);
  return c;
}
export function toDataURL(canvas) { return canvas.toDataURL(); }
