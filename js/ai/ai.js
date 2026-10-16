import { G, obj, objAt, heroAt, townsOf, heroesOf, player } from '../game/state.js';
import { OBJ } from '../data/objects.js';
import { UNITS } from '../data/units.js';
import { FACTIONS } from '../data/factions.js';
import { DWELLINGS } from '../data/buildings.js';
import { canBuild, build, recruit, dwellingUnit, maxRecruitable, hasGarrison, fortLevel } from '../game/town.js';
import { armyValue, addUnits, canAddUnits, maxMovement, createHero, armyEmpty } from '../game/hero.js';
import { heroPath, guardAt } from '../game/movement.js';
import { moveHeroAlong, hireHero, recruitExternal, learnGuildSpells } from '../game/actions.js';
import { isRevealed } from '../game/fog.js';
import { MINE_INCOME } from '../data/resources.js';

const BUILD_PRIORITY = ['dw3', 'hall2', 'market', 'fort', 'dw4', 'mage1', 'citadel', 'hall3', 'dw5', 'dw6', 'castle', 'silo', 'hall4', 'dw7', 'mage2', 'special', 'mage3', 'mage4', 'mage5'];

function strengthOfObj(o) {
  if (o.type === OBJ.MONSTER) return UNITS[o.unit].value * o.count;
  return 0;
}
function heroStrength(h) { return armyValue(h.army) * (1 + h.level * 0.04); }

function nearestEnemyHeroDist(p, x, y) {
  let d = Infinity;
  for (const h of Object.values(G.s.heroes)) if (h.owner !== p.id && h.owner >= 0) d = Math.min(d, Math.max(Math.abs(h.x - x), Math.abs(h.y - y)));
  return d;
}

export async function runAITurn(p, io) {
  const s = G.s;
  // 1. Towns: recruit & build
  for (const t of townsOf(p.id)) manageTown(p, t);
  // 2. Hire a hero if we have few
  if (p.heroes.length < 2 || (p.heroes.length < 4 && p.resources.gold > 6000)) {
    for (const t of townsOf(p.id)) {
      if (t.tavernHero && !t.visiting && p.resources.gold >= 2500 + (p.heroes.length ? 1500 : 0)) {
        const h = hireHero(t, p.id, createHero);
        if (h) { takeGarrison(p, t, h); break; }
      }
    }
  }
  // 3. Move heroes
  for (const h of heroesOf(p.id)) {
    let guard = 0;
    while (h.movement > 60 && guard++ < 12 && s.heroes[h.id]) {
      const moved = await aiMoveHero(p, h, io);
      if (!moved) break;
    }
    if (!s.heroes[h.id]) continue;
    const t = objAt(h.x, h.y);
    if (t && t.type === OBJ.TOWN && t.owner === p.id) { takeGarrison(p, t, h); manageTown(p, t, h); }
  }
  // 4. Recruit leftovers into garrisons once more (new gold)
  for (const t of townsOf(p.id)) recruitAll(p, t, null, p.heroes.length === 0 ? 2600 : 0);
}

function manageTown(p, t, visitingHero = null) {
  const s = G.s;
  const weekDay = ((s.day - 1) % 7) + 1;
  // Build first (one per day) keeping a reserve for recruiting later in the week
  for (const id of BUILD_PRIORITY) {
    if (t.buildings[id]) continue;
    const c = canBuild(t, id, p.resources);
    if (c.ok) { build(t, id, p.resources); break; }
    // if the top priority is just unaffordable, try the next ones but not forever
  }
  const heroReserve = p.heroes.length === 0 ? 2600 : 0;
  recruitAll(p, t, visitingHero, (weekDay >= 6 ? 0 : 1500) + heroReserve);
}

function recruitAll(p, t, hero, reserve) {
  const target = hero ? hero.army : t.garrison;
  for (let i = DWELLINGS.length - 1; i >= 0; i--) {
    const dw = DWELLINGS[i];
    if (!t.buildings[dw] || t.available[dw] <= 0) continue;
    const unit = dwellingUnit(t, dw);
    const res = { ...p.resources, gold: Math.max(0, p.resources.gold - reserve) };
    let n = maxRecruitable(unit, t.available[dw], res);
    if (n <= 0) continue;
    if (!canAddUnits(target, unit)) {
      // merge smallest stack into another? skip
      continue;
    }
    recruit(t, dw, n, p.resources, target);
  }
  if (hero) hero.maxMovement = maxMovement(hero);
}

function takeGarrison(p, t, h) {
  // Hero takes garrison unless an enemy is close to the town
  const enemyNear = nearestEnemyHeroDist(p, t.x, t.y) <= 6;
  if (enemyNear && heroStrength(h) < armyValue(t.garrison) * 2) return;
  for (let i = 0; i < 7; i++) {
    const st = t.garrison[i];
    if (!st) continue;
    if (addUnits(h.army, st.unit, st.count)) t.garrison[i] = null;
  }
  h.maxMovement = maxMovement(h);
  learnGuildSpells(h, t);
}

function targetValue(p, h, o, strength) {
  const s = G.s;
  const hv = strength;
  switch (o.type) {
    case OBJ.RESOURCE: return o.res === 'gold' ? o.amount * 1.2 : o.res === 'wood' || o.res === 'ore' ? o.amount * 180 : o.amount * 350;
    case OBJ.CHEST: return 1800;
    case OBJ.ARTIFACT: return 3500;
    case OBJ.MINE: return o.owner === p.id ? 0 : o.res === 'gold' ? 7000 : o.res === 'wood' || o.res === 'ore' ? 2800 : 3200;
    case OBJ.DWELLING: {
      const u = UNITS[o.unit];
      const n = Math.min(o.available, Math.floor(p.resources.gold / u.cost.gold));
      if (n <= 0 || !canAddUnits(h.army, o.unit)) return o.owner === p.id ? 0 : 400;
      return n * u.value * 1.5 + (o.owner === p.id ? 0 : 400);
    }
    case OBJ.MONSTER: {
      const sv = strengthOfObj(o);
      if (hv < sv * 1.6) return 0;
      let v = sv * 0.6 + 300;
      if (o.guards && s.map.objects[o.guards]) v += targetValue(p, h, s.map.objects[o.guards], strength) * 0.8;
      return v;
    }
    case OBJ.TOWN: {
      if (o.owner === p.id) {
        // go home when weak or to collect troops
        const gv = armyValue(o.garrison);
        let v = 0;
        for (const dw of DWELLINGS) if (o.buildings[dw] && o.available[dw] > 0) v += UNITS[dwellingUnit(o, dw)].value * Math.min(o.available[dw], 10);
        v += gv;
        return v > hv * 0.3 ? Math.min(v, 6000) : 0;
      }
      const defenders = o.visiting && s.heroes[o.visiting] ? heroStrength(s.heroes[o.visiting]) + armyValue(o.garrison) * 0.5 : armyValue(o.garrison);
      const fortMult = 1 + fortLevel(o) * 0.25;
      if (hv < defenders * 1.4 * fortMult + 200) return 0;
      return 20000 + (o.owner >= 0 ? 10000 : 0);
    }
    case OBJ.RUNESTONE: return o.visited[h.id] ? 0 : 1200;
    case OBJ.TREE: return o.visited[h.id] || p.resources.gold < 4000 ? 0 : 1800;
    case OBJ.SHRINE: return h.spells.includes(o.spell) ? 0 : h.cls === 'magic' ? 900 : 300;
    case OBJ.WELL: return h.mana < 10 && h.cls === 'magic' ? 600 : 0;
    case OBJ.RUIN: return o.gold > 0 ? o.gold : 0;
    case OBJ.STABLES: return h.flags.stablesWeek ? 0 : 500;
    case OBJ.TOWER: return 300;
    case OBJ.FOUNTAIN: return h.flags.luck ? 0 : 250;
    case OBJ.CAMP: return h.flags.morale ? 0 : 250;
    case OBJ.WINDMILL: return 500;
    case OBJ.SMITHY: return o.artifact && p.resources.gold >= 6000 ? 1500 : 0;
    case OBJ.WATERFALL: return h.flags.waterfallWeek ? 0 : (h.mana < 10 && h.cls === 'magic' ? 700 : 250);
    case OBJ.SIGNPOST: return 150;
    case OBJ.WITCH: return o.visited[h.id] ? 0 : 900;
    case OBJ.GATE: return o.looted ? 0 : 6000;
    default: return 0;
  }
}

async function aiMoveHero(p, h, io) {
  const s = G.s;
  const strength = heroStrength(h);
  const maxMove = Math.max(1, h.maxMovement || maxMovement(h));
  const cands = [];
  for (const o of Object.values(s.map.objects)) {
    if (!isRevealed(s, p, o.x, o.y)) continue;
    const dx = Math.abs(o.x - h.x), dy = Math.abs(o.y - h.y);
    const d = Math.max(dx, dy);
    if (d > 28) continue;
    if (o.x === h.x && o.y === h.y) continue;
    let v = targetValue(p, h, o, strength);
    if (v <= 0) continue;
    // Guarded objects: value only if the guard is beatable
    if (o.guardedBy && s.map.objects[o.guardedBy]) {
      const g = s.map.objects[o.guardedBy];
      if (strength < strengthOfObj(g) * 1.6) continue;
    }
    cands.push({ o, v, d });
  }
  // Enemy heroes
  for (const e of Object.values(s.heroes)) {
    if (e.owner === p.id || e.inTavern) continue;
    if (!isRevealed(s, p, e.x, e.y)) continue;
    const es = heroStrength(e);
    const d = Math.max(Math.abs(e.x - h.x), Math.abs(e.y - h.y));
    if (strength > es * 1.4 + 100 && d <= 20) cands.push({ hero: e, v: 6000 + es * 0.5, d });
  }
  cands.sort((a, b) => b.v / (a.d + 2) - a.v / (b.d + 2));
  let best = null, bestScore = 0;
  let checked = 0;
  for (const c of cands) {
    if (checked++ > 14) break;
    const tx = c.o ? c.o.x : c.hero.x, ty = c.o ? c.o.y : c.hero.y;
    const path = heroPath(h, tx, ty);
    if (!path || !path.length) continue;
    const cost = path[path.length - 1].g;
    const days = cost / maxMove;
    const score = c.v / Math.pow(days + 0.6, 1.6);
    if (score > bestScore) { bestScore = score; best = { path, c }; }
  }
  if (!best) {
    // Explore: move towards the nearest unexplored area
    const t = exploreTarget(p, h);
    if (!t) return false;
    const path = heroPath(h, t.x, t.y);
    if (!path || !path.length) return false;
    best = { path, c: { v: 1 } };
  }
  const before = h.movement;
  const r = await moveHeroAlong(h, best.path, io);
  if (r === 'dead') return false;
  if (h.movement >= before - 1) return false;
  return true;
}

function exploreTarget(p, h) {
  const s = G.s, m = s.map;
  let best = null, bd = Infinity;
  for (let k = 0; k < 60; k++) {
    const x = G.rng.int(1, m.w - 2), y = G.rng.int(1, m.h - 2);
    if (p.fog[y * m.w + x]) continue;
    const d = Math.max(Math.abs(x - h.x), Math.abs(y - h.y));
    if (d < bd && d > 3) { bd = d; best = { x, y }; }
  }
  if (!best) return null;
  // Step toward it: pick a revealed passable tile near the frontier
  const dx = Math.sign(best.x - h.x), dy = Math.sign(best.y - h.y);
  for (let k = 8; k >= 2; k--) {
    const x = h.x + dx * k, y = h.y + dy * k;
    if (x < 1 || y < 1 || x >= m.w - 1 || y >= m.h - 1) continue;
    if (!objAt(x, y) && !heroAt(x, y)) return { x, y };
  }
  return null;
}

/** AI choices for the io layer */
export const aiChoices = {
  recruit(hero, o) { recruitExternal(hero, o, o.available); },
};
