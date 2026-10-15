import { el } from '../core/utils.js';
import { RES, RES_INFO, costStr } from '../data/resources.js';
import { resourceIcon } from '../render/sprites.js';
import { figure } from '../render/figures.js';
import { UNITS, ABILITY_INFO } from '../data/units.js';
import { portrait } from '../render/portraits.js';

export function resIcon(res, size = 18) {
  const c = resourceIcon(res, size * 2);
  const img = el('img.res-icon', { src: c.toDataURL(), width: size, height: size, alt: RES_INFO[res].name });
  return img;
}
export function costRow(cost, res = null) {
  const row = el('span.cost-row');
  for (const r of RES) {
    if (!cost[r]) continue;
    const ok = !res || (res[r] || 0) >= cost[r];
    row.append(el('span.cost-item' + (ok ? '' : '.missing'), resIcon(r, 16), String(cost[r])));
  }
  return row;
}
export function unitCard(unitId, count = null, opts = {}) {
  const u = UNITS[unitId];
  const f = figure(u, 96);
  const card = el('div.unit-slot' + (opts.cls ? '.' + opts.cls : ''), { title: u.name });
  card.append(el('img.unit-fig', { src: f.toDataURL(), draggable: false }));
  if (count !== null) card.append(el('span.unit-count', String(count)));
  return card;
}
export function emptySlot(opts = {}) {
  return el('div.unit-slot.empty' + (opts.cls ? '.' + opts.cls : ''));
}
export function portraitImg(defId, size = 48) {
  return el('img.portrait', { src: portrait(defId, 64).toDataURL(), width: size, height: size, draggable: false });
}
export function unitStatsHtml(u) {
  const ab = u.abilities.map((a) => `<span class="ability" title="${ABILITY_INFO[a].desc}">${ABILITY_INFO[a].name}</span>`).join(' ');
  return `<div class="unit-stats">
    <span>⚔ ${u.attack}</span><span>🛡 ${u.defense}</span><span>💥 ${u.dmg[0]}–${u.dmg[1]}</span>
    <span>❤ ${u.hp}</span><span>➶ ${u.speed}</span>${u.shots ? `<span>🏹 ${u.shots}</span>` : ''}
  </div>${ab ? `<div class="abilities">${ab}</div>` : ''}<div class="lore">${u.lore}</div>`;
}
export function statBar(cur, max, cls = '') {
  const pct = max > 0 ? Math.max(0, Math.min(100, (cur / max) * 100)) : 0;
  return el('div.bar.' + cls, el('div.bar-fill', { style: { width: pct + '%' } }));
}
