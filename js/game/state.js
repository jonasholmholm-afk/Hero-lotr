import { RNG, hashStr } from '../core/rng.js';
import { generateMap } from '../map/mapgen.js';
import { FACTIONS, PLAYER_COLORS } from '../data/factions.js';
import { HEROES, HERO_IDS } from '../data/heroes.js';
import { OBJ } from '../data/objects.js';
import { createHero, placeHeroInTown } from './hero.js';
import { initTown } from './town.js';
import { revealAround } from './fog.js';

// The single mutable game state. Kept as plain data so that it serialises.
export const G = { s: null, rng: null };

export const DIFFICULTIES = {
  easy: { name: 'Let', desc: 'Du starter med ekstra ressourcer. AI’en er forsigtig.', player: { gold: 20000, wood: 30, ore: 30, rare: 10 }, ai: { gold: 7500, wood: 10, ore: 10, rare: 3 }, aiGrowth: 0.8, aiIncome: 0.8 },
  normal: { name: 'Normal', desc: 'Lige vilkår.', player: { gold: 12000, wood: 20, ore: 20, rare: 5 }, ai: { gold: 12000, wood: 20, ore: 20, rare: 5 }, aiGrowth: 1, aiIncome: 1 },
  hard: { name: 'Hård', desc: 'AI’en får bonus på ressourcer og vækst.', player: { gold: 10000, wood: 15, ore: 15, rare: 3 }, ai: { gold: 20000, wood: 40, ore: 40, rare: 12 }, aiGrowth: 1.3, aiIncome: 1.4 },
};
export const MAP_SIZES = { small: { name: 'Lille', size: 36 }, medium: { name: 'Mellem', size: 48 }, large: { name: 'Stor', size: 64 } };

export function newGame({ seed, size = 'medium', playerFaction = 'elves', difficulty = 'normal', playerName = 'Spiller' }) {
  seed = seed ?? (Date.now() & 0x7fffffff);
  const rng = new RNG(seed ^ 0x5bd1e995);
  const aiFaction = playerFaction === 'elves' ? 'orcs' : 'elves';
  const diff = DIFFICULTIES[difficulty];
  const map = generateMap({ seed, size: MAP_SIZES[size].size, factions: [playerFaction, aiFaction] });
  const N = map.w * map.h;

  const mkPlayer = (id, faction, isAI, bonus, name) => ({
    id, faction, isAI, name, color: FACTIONS[faction].color,
    resources: { gold: bonus.gold, wood: bonus.wood, ore: bonus.ore, mithril: bonus.rare, warpstone: bonus.rare, gems: bonus.rare },
    fog: new Uint8Array(N), heroes: [], towns: [], daysWithoutTown: 0, alive: true,
    tavernPool: [],
  });
  const s = {
    version: 1, seed, day: 1, current: 0, difficulty, winner: null,
    map, players: [
      mkPlayer(0, playerFaction, false, diff.player, playerName),
      mkPlayer(1, aiFaction, true, diff.ai, FACTIONS[aiFaction].name + ' (AI)'),
    ],
    heroes: {}, nextHeroId: 1, log: [], rngState: 0, stats: { battles: 0, daysPlayed: 0 },
    options: { animSpeed: 1 },
  };
  G.s = s; G.rng = rng;

  // Towns
  for (const id of map.townIds) {
    const t = map.objects[id];
    initTown(t, rng);
    if (t.owner >= 0) s.players[t.owner].towns.push(t.id);
  }
  // Starting heroes + tavern pools
  const pool = { elves: HERO_IDS.filter((h) => HEROES[h].faction === 'elves'), orcs: HERO_IDS.filter((h) => HEROES[h].faction === 'orcs') };
  for (const p of s.players) {
    const list = rng.shuffle([...pool[p.faction]]);
    const town = map.objects[p.towns[0]];
    const hero = createHero(s, list[0], p.id, rng, true);
    placeHeroInTown(s, hero, town);
    p.tavernPool = list.slice(1);
    town.tavernHero = p.tavernPool.shift();
    revealAround(s, p, town.x, town.y, 6);
    revealAround(s, p, hero.x, hero.y, 5);
  }
  s.rngState = rng.state;
  return s;
}

export function player(id) { return G.s.players[id]; }
export function cur() { return G.s.players[G.s.current]; }
export function human() { return G.s.players[0]; }
export function obj(id) { return G.s.map.objects[id]; }
export function objAt(x, y) {
  const m = G.s.map;
  if (x < 0 || y < 0 || x >= m.w || y >= m.h) return null;
  const id = m.objAt[y * m.w + x];
  return id ? m.objects[id] : null;
}
export function heroAt(x, y) {
  for (const h of Object.values(G.s.heroes)) if (h.x === x && h.y === y && !h.inTavern) return h;
  return null;
}
export function removeObj(o) {
  const m = G.s.map;
  if (m.objAt[o.y * m.w + o.x] === o.id) m.objAt[o.y * m.w + o.x] = 0;
  if (o.guardedBy && m.objects[o.guardedBy]) delete m.objects[o.guardedBy].guards;
  delete m.objects[o.id];
}
export function townsOf(pid) { return G.s.players[pid].towns.map((id) => G.s.map.objects[id]).filter(Boolean); }
export function heroesOf(pid) { return G.s.players[pid].heroes.map((id) => G.s.heroes[id]).filter(Boolean); }
export function log(text, pid = null) {
  G.s.log.push({ day: G.s.day, text, pid });
  if (G.s.log.length > 200) G.s.log.shift();
}
