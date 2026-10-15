import { G, objAt, heroAt } from './state.js';
import { TERRAIN_INFO, DECOR_BLOCKS, NATIVE, ROAD_COST } from '../data/terrain.js';
import { OBJ } from '../data/objects.js';
import { skillVal } from '../data/skills.js';
import { findPath } from '../map/pathfinding.js';

export function tileIndex(x, y) { return y * G.s.map.w + x; }
export function inMap(x, y) { const m = G.s.map; return x >= 0 && y >= 0 && x < m.w && y < m.h; }
export function isPassableTerrain(x, y) {
  const m = G.s.map;
  if (!inMap(x, y)) return false;
  const i = tileIndex(x, y);
  return TERRAIN_INFO[m.terrain[i]].passable && !DECOR_BLOCKS.has(m.decor[i]);
}

/** Monster guarding the tile (x,y) – i.e. a monster adjacent to it. */
export function guardAt(x, y, excludeId = 0) {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const o = objAt(x + dx, y + dy);
    if (o && o.type === OBJ.MONSTER && o.id !== excludeId) return o;
  }
  return null;
}
/** All monsters guarding tile (x,y). */
export function guardsAt(x, y) {
  const out = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const o = objAt(x + dx, y + dy);
    if (o && o.type === OBJ.MONSTER) out.push(o);
  }
  return out;
}

export function terrainCost(hero, x, y) {
  const m = G.s.map;
  const i = tileIndex(x, y);
  if (m.road[i]) return ROAD_COST;
  const t = m.terrain[i];
  if (NATIVE[hero.faction].includes(t)) return 100;
  const base = TERRAIN_INFO[t].cost;
  return Math.round(100 + (base - 100) * (1 - skillVal(hero, 'pathfinding')));
}

/** Step-cost function used for hero pathfinding. */
export function heroStepCost(hero, allowGuardId = 0) {
  const s = G.s;
  return (fx, fy, tx, ty, isDest) => {
    if (!isPassableTerrain(tx, ty)) return Infinity;
    const o = objAt(tx, ty);
    if (o && !isDest) return Infinity; // objects block passage
    const h = heroAt(tx, ty);
    if (h && h.id !== hero.id) {
      if (!isDest) return Infinity;
      if (h.owner === hero.owner) return Infinity; // cannot stack own heroes
    }
    // Guarded tiles only as destination (entering them means a fight) – unless the
    // only guard is the monster we are deliberately attacking.
    if (!isDest) { const gs = guardsAt(tx, ty); if (gs.some((g) => g.id !== allowGuardId)) return Infinity; }
    // Own/visiting town tile passable only as dest
    return terrainCost(hero, tx, ty);
  };
}

export function heroPath(hero, tx, ty) {
  const m = G.s.map;
  if (!inMap(tx, ty)) return null;
  if (hero.x === tx && hero.y === ty) return null;
  const o = objAt(tx, ty);
  const allow = o && o.type === OBJ.MONSTER ? o.id : 0;
  return findPath(m.w, m.h, hero.x, hero.y, tx, ty, heroStepCost(hero, allow), 40000);
}

/** Splits a path into per-day segments given remaining movement. Returns array of day indices per step. */
export function pathDays(hero, path) {
  const days = [];
  let mp = hero.movement;
  let day = 0;
  const max = Math.max(1, hero.maxMovement || hero.movement || 1);
  let prevG = 0;
  for (const st of path) {
    const c = st.g - prevG; prevG = st.g;
    if (c > mp) { day++; mp = max; }
    mp -= c;
    days.push(day);
  }
  return days;
}
