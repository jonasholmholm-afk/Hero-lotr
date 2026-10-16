// Rumours shown in taverns, on notice boards and in the kingdom overview.
import { G, townsOf, heroesOf } from './state.js';
import { OBJ } from '../data/objects.js';
import { ARTIFACTS } from '../data/artifacts.js';
import { UNITS } from '../data/units.js';
import { armyValue } from './hero.js';

export function dirName(dx, dy) {
  const a = (Math.atan2(dy, dx) * 180) / Math.PI;
  const dirs = ['øst', 'sydøst', 'syd', 'sydvest', 'vest', 'nordvest', 'nord', 'nordøst'];
  return dirs[Math.round(((a + 360) % 360) / 45) % 8];
}

export function rumours(p, n = 3) {
  const s = G.s; const lines = [];
  const objs = Object.values(s.map.objects);
  for (const e of s.players) {
    if (e.id === p.id || !e.alive) continue;
    const hs = heroesOf(e.id);
    lines.push(`${e.name} råder over ${hs.length} helt${hs.length === 1 ? '' : 'e'} og ${e.towns.length} by${e.towns.length === 1 ? '' : 'er'}.`);
    if (hs.length) { const st = [...hs].sort((a, b) => armyValue(b.army) - armyValue(a.army))[0]; lines.push(`${st.name} (niveau ${st.level}) siges at føre fjendens stærkeste hær.`); }
  }
  const arts = objs.filter((o) => o.type === OBJ.ARTIFACT);
  if (arts.length) lines.push(`Der ligger stadig ${arts.length} artefakt${arts.length === 1 ? '' : 'er'} gemt rundt om i landet.`);
  const home = townsOf(p.id)[0];
  if (home && arts.length) {
    const a = [...arts].sort((x, y) => Math.hypot(x.x - home.x, x.y - home.y) - Math.hypot(y.x - home.x, y.y - home.y))[0];
    lines.push(`Rygtet siger, at ${ARTIFACTS[a.artifact].name} ligger mod ${dirName(a.x - home.x, a.y - home.y)} for ${home.name}.`);
  }
  const freeMines = objs.filter((o) => o.type === OBJ.MINE && o.owner < 0).length;
  if (freeMines) lines.push(`${freeMines} mine${freeMines === 1 ? ' står' : 'r står'} stadig uden ejer.`);
  const mons = objs.filter((o) => o.type === OBJ.MONSTER);
  if (mons.length) { const big = mons.sort((a, b) => UNITS[b.unit].value * b.count - UNITS[a.unit].value * a.count)[0]; lines.push(`Den farligste flok i landet skulle være ${UNITS[big.unit].plural} ${home ? 'mod ' + dirName(big.x - home.x, big.y - home.y) : ''}.`); }
  if (objs.some((o) => o.type === OBJ.PORTAL)) lines.push('Elverporterne fører den rejsende lynhurtigt mellem fjerne egne.');
  if (s.week && s.week.kind !== 'calm') lines.push(`${s.week.name}: ${s.week.text}`);
  if (!lines.length) return ['Alt er stille.'];
  const start = s.day % lines.length;
  return Array.from({ length: Math.min(n, lines.length) }, (_, i) => lines[(start + i) % lines.length]);
}
