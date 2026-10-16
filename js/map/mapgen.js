import { RNG } from '../core/rng.js';
import { Noise } from '../core/noise.js';
import { T, D, DECOR_BLOCKS, TERRAIN_INFO } from '../data/terrain.js';
import { UNITS, NEUTRAL_UNITS } from '../data/units.js';
import { ARTIFACT_IDS, ARTIFACTS } from '../data/artifacts.js';
import { FACTIONS } from '../data/factions.js';
import { OBJ } from '../data/objects.js';
import { SPELL_IDS, SPELLS } from '../data/spells.js';
import { findPath } from './pathfinding.js';
import { clamp, chebyshev } from '../core/utils.js';

const TOWN_NAMES = {
  elves: ['Athel Loren', 'Caras Galadhon', 'Thranduils Haller', 'Tor Yvresse', 'Imladris', 'Lothlórien', 'Edhellond', 'Ostagar'],
  orcs: ['Gundabad', 'Sorte Klippe', 'Barad-dûr', 'Moria Port', 'Isengard', 'Dol Guldur', 'Karak Varn', 'Cirith Ungol'],
};

export function generateMap({ seed, size, factions }) {
  const rng = new RNG(seed);
  const W = size, H = size;
  const N = W * H;
  const terrain = new Uint8Array(N);
  const decor = new Uint8Array(N);
  const road = new Uint8Array(N);
  const objAt = new Int32Array(N); // object id or 0
  const objects = {};
  let nextId = 1;
  const I = (x, y) => y * W + x;
  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;

  // ---------- Towns ----------
  const m = Math.round(size * 0.2);
  const corners = [[m, m], [W - 1 - m, m], [m, H - 1 - m], [W - 1 - m, H - 1 - m]];
  const pc = rng.int(0, 3);
  const oc = 3 - pc;
  const jitter = () => rng.int(-2, 2);
  const townDefs = [
    { x: corners[pc][0] + jitter(), y: corners[pc][1] + jitter(), faction: factions[0], owner: 0 },
    { x: corners[oc][0] + jitter(), y: corners[oc][1] + jitter(), faction: factions[1], owner: 1 },
  ];
  const neutralFaction = rng.pick(['elves', 'orcs']);
  if (size >= 44) {
    townDefs.push({ x: Math.round(W / 2) + rng.int(-4, 4), y: Math.round(H / 2) + rng.int(-4, 4), faction: neutralFaction, owner: -1 });
  }
  const usedNames = {};
  const towns = townDefs.map((t) => {
    const names = TOWN_NAMES[t.faction].filter((n) => !usedNames[n]);
    const name = rng.pick(names); usedNames[name] = 1;
    return { ...t, name };
  });
  const factionTowns = towns.filter((t) => t.owner >= 0);

  // ---------- Terrain ----------
  const nH = new Noise(seed + 11), nM = new Noise(seed + 23), nMt = new Noise(seed + 37), nT = new Noise(seed + 41), nZ = new Noise(seed + 59);
  const zoneFaction = (x, y) => {
    let best = null, bd = Infinity;
    for (const t of factionTowns) {
      const d = Math.hypot(t.x - x, t.y - y);
      if (d < bd) { bd = d; best = t; }
    }
    return best.faction;
  };
  const influence = (x, y) => {
    // -1 .. 1 : +1 deep in elf land, -1 deep in orc land
    let dE = Infinity, dO = Infinity;
    for (const t of factionTowns) {
      const d = Math.hypot(t.x - x, t.y - y);
      if (t.faction === 'elves') dE = Math.min(dE, d); else dO = Math.min(dO, d);
    }
    if (dE === Infinity) return -1;
    if (dO === Infinity) return 1;
    return clamp((dO - dE) / (size * 0.55) + (nZ.fbm(x / 10, y / 10, 2) - 0.5) * 0.5, -1, 1);
  };
  const heightAt = (x, y) => {
    let h = nH.fbm(x / 11, y / 11, 4);
    for (const t of towns) {
      const d = Math.hypot(t.x - x, t.y - y);
      if (d < 7) h = Math.max(h, 0.5 + (7 - d) * 0.04);
    }
    return h;
  };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const h = heightAt(x, y);
      const mo = nM.fbm(x / 9, y / 9, 3);
      const inf = influence(x, y);
      let t;
      if (h < 0.3) t = T.WATER;
      else if (inf > 0.22) t = mo < 0.3 ? T.DIRT : T.GRASS;
      else if (inf < -0.22) t = mo < 0.5 ? T.ASH : T.ROUGH;
      else if (mo > 0.6 && h < 0.5) t = T.SWAMP;
      else if (h > 0.7) t = T.SNOW;
      else if (mo < 0.36) t = T.DIRT;
      else t = nT.noise(x / 6, y / 6) > 0.5 ? T.GRASS : T.ROUGH;
      terrain[I(x, y)] = t;
    }
  }
  // Remove tiny water puddles (1-2 tiles)
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (terrain[I(x, y)] !== T.WATER) continue;
    let c = 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (terrain[I(x + dx, y + dy)] === T.WATER) c++;
    if (c <= 1) terrain[I(x, y)] = T.GRASS;
  }

  // ---------- Decor ----------
  const nTree = new Noise(seed + 71), nRock = new Noise(seed + 83);
  const nearTown = (x, y, r) => towns.some((t) => chebyshev(t.x, t.y, x, y) <= r);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = I(x, y);
      const t = terrain[i];
      if (t === T.WATER) continue;
      const h = heightAt(x, y);
      const border = x === 0 || y === 0 || x === W - 1 || y === H - 1;
      const mt = nMt.fbm(x / 8, y / 8, 3);
      if (border || (mt > 0.66 && !nearTown(x, y, 5) && h > 0.45)) {
        decor[i] = D.MOUNTAIN; continue;
      }
      if (nearTown(x, y, 3)) continue;
      const tn = nTree.fbm(x / 5, y / 5, 2);
      const r = rng.next();
      const zf = zoneFaction(x, y);
      switch (t) {
        case T.GRASS: {
          const p = zf === 'elves' ? 0.1 + 0.42 * tn : 0.06 + 0.3 * tn;
          if (r < p) decor[i] = zf === 'elves' ? rng.weighted([D.GOLDEN, D.LEAFY, D.PINE], (d) => (d === D.GOLDEN ? 4 : d === D.LEAFY ? 4 : 2)) : rng.pick([D.LEAFY, D.LEAFY, D.PINE]);
          else if (r < p + 0.05) decor[i] = D.FLOWERS;
          else if (r < p + 0.11) decor[i] = D.BUSH;
          break;
        }
        case T.DIRT:
          if (r < 0.06 + 0.12 * tn) decor[i] = rng.pick([D.DEAD, D.LEAFY, D.PINE]);
          else if (r < 0.1 + 0.12 * tn) decor[i] = D.ROCK;
          else if (r < 0.13 + 0.12 * tn) decor[i] = D.STUMP;
          else if (r < 0.19 + 0.12 * tn) decor[i] = D.PEBBLES;
          break;
        case T.ROUGH:
          if (r < 0.1 + 0.15 * nRock.noise(x / 4, y / 4)) decor[i] = D.ROCK;
          else if (r < 0.16 + 0.1 * tn) decor[i] = D.DEAD;
          else if (r < 0.24 + 0.1 * tn) decor[i] = D.PEBBLES;
          break;
        case T.ASH:
          if (r < 0.08 + 0.12 * tn) decor[i] = D.DEAD;
          else if (r < 0.14 + 0.15 * nRock.noise(x / 4, y / 4)) decor[i] = D.ROCK;
          break;
        case T.SWAMP:
          if (r < 0.08) decor[i] = D.MUSHROOM;
          else if (r < 0.2) decor[i] = D.REEDS;
          else if (r < 0.28 + 0.1 * tn) decor[i] = rng.pick([D.DEAD, D.LEAFY]);
          break;
        case T.SNOW:
          if (r < 0.1 + 0.25 * tn) decor[i] = D.SNOWPINE;
          else if (r < 0.14 + 0.25 * tn) decor[i] = D.ROCK;
          break;
      }
    }
  }

  // ---------- Object helpers ----------
  const passable = (x, y) => inb(x, y) && TERRAIN_INFO[terrain[I(x, y)]].passable && !DECOR_BLOCKS.has(decor[I(x, y)]);
  const free = (x, y) => passable(x, y) && objAt[I(x, y)] === 0;
  const addObj = (o) => {
    o.id = nextId++;
    objects[o.id] = o;
    objAt[I(o.x, o.y)] = o.id;
    if (decor[I(o.x, o.y)] !== D.NONE) decor[I(o.x, o.y)] = D.NONE;
    return o;
  };
  const objectNear = (x, y, r) => {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (inb(x + dx, y + dy) && objAt[I(x + dx, y + dy)]) return true;
    }
    return false;
  };
  const townDist = (x, y) => Math.min(...factionTowns.map((t) => Math.hypot(t.x - x, t.y - y)));
  const findSpot = (cx, cy, rMin, rMax, tries = 200, spacing = 1) => {
    for (let k = 0; k < tries; k++) {
      const a = rng.next() * Math.PI * 2, r = rMin + rng.next() * (rMax - rMin);
      const x = Math.round(cx + Math.cos(a) * r), y = Math.round(cy + Math.sin(a) * r);
      if (!inb(x, y) || x < 2 || y < 2 || x > W - 3 || y > H - 3) continue;
      if (!free(x, y)) continue;
      if (nearTown(x, y, 3)) continue;
      if (objectNear(x, y, spacing)) continue;
      if (!passable(x, y + 1) && !passable(x - 1, y) && !passable(x + 1, y)) continue;
      return { x, y };
    }
    return null;
  };
  const anySpot = (spacing = 1, minTownDist = 4) => {
    for (let k = 0; k < 400; k++) {
      const x = rng.int(2, W - 3), y = rng.int(2, H - 3);
      if (!free(x, y) || nearTown(x, y, 3) || objectNear(x, y, spacing)) continue;
      if (townDist(x, y) < minTownDist) continue;
      return { x, y };
    }
    return null;
  };

  // Towns first
  const townIds = [];
  for (const t of towns) {
    // Flatten around town, native terrain
    const native = t.faction === 'elves' ? T.GRASS : T.ASH;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      if (!inb(t.x + dx, t.y + dy)) continue;
      const i = I(t.x + dx, t.y + dy);
      if (terrain[i] === T.WATER || Math.abs(dx) + Math.abs(dy) <= 3) terrain[i] = native;
      decor[i] = D.NONE;
    }
    const o = addObj({ type: OBJ.TOWN, x: t.x, y: t.y, faction: t.faction, owner: t.owner, name: t.name });
    for (const [dx, dy] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0]]) {
      decor[I(t.x + dx, t.y + dy)] = D.BLOCK;
    }
    townIds.push(o.id);
  }

  // ---------- Monster helpers ----------
  const monsterPool = (x, y) => {
    const zf = zoneFaction(x, y);
    const list = [...NEUTRAL_UNITS];
    if (zf === 'elves') list.push('dryad', 'glade_guard', 'eternal_guard', 'wardancer');
    else list.push('goblin', 'orc_boy', 'orc_archer', 'warg_rider');
    return list;
  };
  const makeMonster = (x, y, budget) => {
    const pool = monsterPool(x, y).filter((u) => UNITS[u].value * 2 <= budget || UNITS[u].tier === 1);
    const unit = rng.weighted(pool, (u) => (UNITS[u].tier <= 3 ? 3 : UNITS[u].tier <= 5 ? 2 : 1));
    const count = clamp(Math.round(budget / UNITS[unit].value), UNITS[unit].tier >= 6 ? 1 : 3, 150);
    return addObj({ type: OBJ.MONSTER, x, y, unit, count, maxCount: count, grown: 0 });
  };
  const budgetAt = (x, y, mult = 1) => {
    const d = townDist(x, y);
    return (220 + 70 * d + rng.int(0, 120)) * mult;
  };
  const guard = (o, mult = 1) => {
    const spots = [[0, 1], [-1, 1], [1, 1], [-1, 0], [1, 0]];
    rng.shuffle(spots);
    for (const [dx, dy] of spots) {
      const x = o.x + dx, y = o.y + dy;
      if (free(x, y) && !nearTown(x, y, 3)) {
        const mo = makeMonster(x, y, budgetAt(x, y, mult));
        mo.guards = o.id;
        o.guardedBy = mo.id;
        return mo;
      }
    }
    return null;
  };

  // ---------- Starting areas ----------
  const place = (o, pos) => (pos ? addObj({ ...o, x: pos.x, y: pos.y }) : null);
  for (const t of towns) {
    const fac = FACTIONS[t.faction];
    place({ type: OBJ.MINE, res: 'wood', owner: -1 }, findSpot(t.x, t.y, 4, 7));
    place({ type: OBJ.MINE, res: 'ore', owner: -1 }, findSpot(t.x, t.y, 4, 7));
    if (t.owner >= 0) {
      const g = place({ type: OBJ.MINE, res: 'gold', owner: -1 }, findSpot(t.x, t.y, 7, 11));
      if (g) guard(g, 0.8);
      const rr = place({ type: OBJ.MINE, res: fac.rare, owner: -1 }, findSpot(t.x, t.y, 6, 11));
      if (rr) guard(rr, 0.9);
      const d1 = place({ type: OBJ.DWELLING, unit: fac.units[0], available: UNITS[fac.units[0]].growth, owner: -1 }, findSpot(t.x, t.y, 4, 8));
      const d2 = place({ type: OBJ.DWELLING, unit: fac.units[1], available: UNITS[fac.units[1]].growth, owner: -1 }, findSpot(t.x, t.y, 6, 10));
      if (d2) guard(d2, 0.7);
      for (let k = 0; k < 3; k++) {
        const r = rng.pick(['gold', 'wood', 'ore', 'wood', 'ore']);
        place({ type: OBJ.RESOURCE, res: r, amount: r === 'gold' ? rng.int(5, 10) * 100 : rng.int(4, 8) }, findSpot(t.x, t.y, 3, 8));
      }
      place({ type: OBJ.CHEST }, findSpot(t.x, t.y, 4, 9));
    }
  }

  // ---------- Scattered mines & dwellings ----------
  const extraMines = ['wood', 'wood', 'ore', 'ore', 'gold', 'gold', 'mithril', 'mithril', 'warpstone', 'warpstone', 'gems', 'gems'];
  if (size >= 56) extraMines.push('gold', 'wood', 'ore', 'gems', 'mithril', 'warpstone');
  for (const res of extraMines) {
    const o = place({ type: OBJ.MINE, res, owner: -1 }, anySpot(1, 9));
    if (o) guard(o, res === 'gold' ? 1.1 : 1);
  }
  const neutralDw = ['wolf', 'dunlending', 'beastman', 'spider', 'wight', 'skeleton'];
  const dwCount = size >= 56 ? 6 : 4;
  for (let k = 0; k < dwCount; k++) {
    const unit = rng.pick(neutralDw);
    const o = place({ type: OBJ.DWELLING, unit, available: UNITS[unit].growth, owner: -1 }, anySpot(1, 8));
    if (o) guard(o, 0.9);
  }
  for (const f of factions) {
    const unit = FACTIONS[f].units[rng.int(2, 3)];
    const o = place({ type: OBJ.DWELLING, unit, available: UNITS[unit].growth, owner: -1 }, anySpot(1, 10));
    if (o) guard(o, 1.1);
  }

  // ---------- Resources, chests, artifacts ----------
  const resCount = Math.round(N / 42);
  for (let k = 0; k < resCount; k++) {
    const r = rng.weighted(['gold', 'wood', 'ore', 'mithril', 'warpstone', 'gems'], (x) => (x === 'gold' ? 7 : x === 'wood' || x === 'ore' ? 5 : 2.5));
    const amount = r === 'gold' ? rng.int(5, 15) * 100 : r === 'wood' || r === 'ore' ? rng.int(4, 10) : rng.int(2, 5);
    const o = place({ type: OBJ.RESOURCE, res: r, amount }, anySpot(1, 3));
    if (o && townDist(o.x, o.y) > 11 && rng.chance(0.2)) guard(o, 0.6);
  }
  for (let k = 0; k < Math.round(N / 150); k++) place({ type: OBJ.CHEST }, anySpot(1, 4));
  const artCount = size >= 56 ? 9 : size >= 44 ? 7 : 5;
  const artPool = rng.shuffle([...ARTIFACT_IDS]);
  for (let k = 0; k < artCount; k++) {
    const id = artPool[k % artPool.length];
    const o = place({ type: OBJ.ARTIFACT, artifact: id }, anySpot(1, 7));
    if (o) guard(o, 0.9 + ARTIFACTS[id].rarity * 0.4);
  }

  // ---------- Special sites ----------
  const special = [
    [OBJ.SHRINE, 3], [OBJ.RUNESTONE, 2], [OBJ.WELL, 3], [OBJ.TREE, size >= 48 ? 2 : 1], [OBJ.STABLES, 2],
    [OBJ.TOWER, 2], [OBJ.FOUNTAIN, 2], [OBJ.CAMP, 2], [OBJ.WINDMILL, 2], [OBJ.RUIN, 2],
  ];
  for (const [type, n] of special) {
    for (let k = 0; k < n; k++) {
      const o = place({ type }, anySpot(1, 4));
      if (!o) continue;
      if (type === OBJ.SHRINE) {
        const lvl = rng.pick([1, 1, 2, 2, 3]);
        o.spell = rng.pick(SPELL_IDS.filter((s) => SPELLS[s].level === lvl));
      }
      if (type === OBJ.RUIN) { o.gold = rng.int(10, 25) * 100; guard(o, 1.2); }
      if (type === OBJ.TREE) o.visited = {};
      if (type === OBJ.RUNESTONE) o.visited = {};
      if (type === OBJ.WINDMILL) o.visitedWeek = {};
      if (type === OBJ.TOWER) o.visitedBy = {};
    }
  }

  // ---------- Roaming monsters ----------
  for (let k = 0; k < Math.round(N / 75); k++) {
    const s = anySpot(1, 6);
    if (s) makeMonster(s.x, s.y, budgetAt(s.x, s.y, 0.9));
  }

  // ---------- Connectivity ----------
  const start = objects[townIds[0]];
  const carveCost = (fx, fy, tx, ty, isDest) => {
    const i = I(tx, ty);
    if (objAt[i] && !isDest) return Infinity;
    const t = terrain[i];
    let c = 1;
    if (t === T.WATER) c = 30;
    if (decor[i] === D.MOUNTAIN) c += 18;
    else if (decor[i] === D.BLOCK) return Infinity;
    else if (DECOR_BLOCKS.has(decor[i])) c += 6;
    if (tx === 0 || ty === 0 || tx === W - 1 || ty === H - 1) return Infinity;
    return c;
  };
  const reachCost = (fx, fy, tx, ty, isDest) => {
    const i = I(tx, ty);
    if (objAt[i] && !isDest) return Infinity;
    if (!passable(tx, ty)) return Infinity;
    return 1;
  };
  const neighborLand = (x, y) => {
    const counts = {};
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      if (!inb(x + dx, y + dy)) continue;
      const t = terrain[I(x + dx, y + dy)];
      if (t !== T.WATER) counts[t] = (counts[t] || 0) + 1;
    }
    let best = T.GRASS, bc = -1;
    for (const [t, c] of Object.entries(counts)) if (c > bc) { bc = c; best = +t; }
    return best;
  };
  const ids = Object.keys(objects).map(Number).sort((a, b) => (objects[a].type === OBJ.TOWN ? -1 : 1) - (objects[b].type === OBJ.TOWN ? -1 : 1));
  for (const id of ids) {
    const o = objects[id];
    if (o.id === start.id) continue;
    // Reachable without carving?
    const p0 = findPath(W, H, start.x, start.y, o.x, o.y, reachCost, 60000);
    if (p0) continue;
    const p = findPath(W, H, start.x, start.y, o.x, o.y, carveCost, 200000);
    if (!p) continue;
    for (const s of p) {
      const i = I(s.x, s.y);
      if (terrain[i] === T.WATER) terrain[i] = neighborLand(s.x, s.y);
      if (DECOR_BLOCKS.has(decor[i]) && decor[i] !== D.BLOCK) decor[i] = D.NONE;
    }
  }

  // ---------- Roads ----------
  const roadCost = (fx, fy, tx, ty, isDest) => {
    const i = I(tx, ty);
    if (!passable(tx, ty)) return Infinity;
    if (objAt[i] && !isDest) return Infinity;
    if (road[i]) return 0.5;
    return TERRAIN_INFO[terrain[i]].cost / 100;
  };
  const markRoad = (ax, ay, bx, by) => {
    const p = findPath(W, H, ax, ay, bx, by, roadCost, 100000);
    if (!p) return;
    for (const s of p) road[I(s.x, s.y)] = 1;
    road[I(ax, ay)] = 1;
  };
  const townObjs = townIds.map((id) => objects[id]);
  for (let i = 0; i < townObjs.length; i++) {
    for (let j = i + 1; j < townObjs.length; j++) markRoad(townObjs[i].x, townObjs[i].y, townObjs[j].x, townObjs[j].y);
    const near = Object.values(objects)
      .filter((o) => (o.type === OBJ.MINE || o.type === OBJ.DWELLING) && Math.hypot(o.x - townObjs[i].x, o.y - townObjs[i].y) < 12)
      .sort((a, b) => Math.hypot(a.x - townObjs[i].x, a.y - townObjs[i].y) - Math.hypot(b.x - townObjs[i].x, b.y - townObjs[i].y))
      .slice(0, 3);
    for (const o of near) markRoad(townObjs[i].x, townObjs[i].y, o.x, o.y);
  }
  // Roads under decor flowers etc: clear passable decor on roads
  for (let i = 0; i < N; i++) if (road[i] && decor[i] && !DECOR_BLOCKS.has(decor[i])) decor[i] = D.NONE;

  return { w: W, h: H, terrain, decor, road, objAt, objects, nextId, townIds, seed };
}
