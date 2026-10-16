import { BUILDINGS, BUILDING_NAMES, BUILDING_DESC, DWELLINGS, BUILD_ORDER } from '../data/buildings.js';
import { FACTIONS } from '../data/factions.js';
import { UNITS } from '../data/units.js';
import { SPELLS, SPELL_IDS, GUILD_SLOTS } from '../data/spells.js';
import { RES, canAfford, pay, mulCost } from '../data/resources.js';
import { addUnits, canAddUnits } from './hero.js';

export function initTown(t, rng) {
  t.buildings = { hall1: true, tavern: true, dw1: true, dw2: true };
  t.builtToday = false;
  t.available = {};
  t.garrison = [null, null, null, null, null, null, null];
  t.visiting = null;
  t.tavernHero = null;
  t.spells = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  const fac = FACTIONS[t.faction];
  // Mage guild spell selection decided at creation (faction flavoured)
  const pref = t.faction === 'elves'
    ? { haste: 3, bless: 3, cure: 3, stone_skin: 2, magic_arrow: 2, air_shield: 2, shield: 2, mass_haste: 3, mass_bless: 3, resurrect: 3, lightning: 2, chain_lightning: 1 }
    : { slow: 3, curse: 3, magic_arrow: 2, bloodlust: 3, weakness: 3, fireball: 3, lightning: 3, mass_slow: 3, chain_lightning: 3, meteor: 3, mass_curse: 3 };
  for (let l = 1; l <= 5; l++) {
    const pool = SPELL_IDS.filter((id) => SPELLS[id].level === l);
    const chosen = [];
    while (chosen.length < GUILD_SLOTS[l] && pool.length) {
      const pick = rng.weighted(pool.filter((p) => !chosen.includes(p)), (p) => (pref[p] || 1));
      chosen.push(pick);
      if (chosen.length === pool.length) break;
    }
    t.spells[l] = chosen;
  }
  for (const dw of DWELLINGS) {
    const unit = fac.units[DWELLINGS.indexOf(dw)];
    t.available[dw] = t.buildings[dw] ? UNITS[unit].growth : 0;
  }
  if (t.owner < 0) {
    // Neutral town garrison
    t.garrison[0] = { unit: fac.units[0], count: rng.int(20, 40) };
    t.garrison[1] = { unit: fac.units[1], count: rng.int(10, 18) };
    t.garrison[2] = { unit: fac.units[2], count: rng.int(5, 8) };
  }
}
export function bname(t, id) { return BUILDING_NAMES[t.faction][id]; }
export function bdesc(t, id) {
  if (id === 'special') return FACTIONS[t.faction].specialDesc;
  if (id.startsWith('dw')) {
    const u = UNITS[dwellingUnit(t, id)];
    return `Her hverves ${u.plural}. Vækst: ${u.growth} pr. uge.`;
  }
  return BUILDING_DESC[id];
}
export function dwellingUnit(t, dw) {
  return FACTIONS[t.faction].units[DWELLINGS.indexOf(dw)];
}
export function buildingCost(t, id) {
  const c = { ...BUILDINGS[id].cost };
  if (c.rare) { c[FACTIONS[t.faction].rare] = c.rare; delete c.rare; }
  return c;
}
export function hallLevel(t) {
  return t.buildings.hall4 ? 4 : t.buildings.hall3 ? 3 : t.buildings.hall2 ? 2 : 1;
}
export function fortLevel(t) {
  return t.buildings.castle ? 3 : t.buildings.citadel ? 2 : t.buildings.fort ? 1 : 0;
}
export function mageLevel(t) {
  for (let l = 5; l >= 1; l--) if (t.buildings['mage' + l]) return l;
  return 0;
}
export function townIncome(t) {
  return [500, 1000, 2000, 4000][hallLevel(t) - 1];
}
export function townDefenseBonus(t) {
  return [0, 2, 4, 6][fortLevel(t)];
}
export function growthMult(t) {
  return [1, 1, 1.5, 2][fortLevel(t)];
}
export function canBuild(t, id, res) {
  const b = BUILDINGS[id];
  if (!b) return { ok: false, reason: 'Ukendt bygning' };
  if (t.buildings[id]) return { ok: false, reason: 'Allerede bygget' };
  if (t.builtToday) return { ok: false, reason: 'Der kan kun bygges én bygning om dagen' };
  // Hall chain: hall3 implies hall2 etc – handled by req
  for (const r of b.req) if (!t.buildings[r]) return { ok: false, reason: `Kræver ${bname(t, r)}` };
  if (!canAfford(res, buildingCost(t, id))) return { ok: false, reason: 'Ikke nok ressourcer' };
  return { ok: true };
}
export function build(t, id, res) {
  const c = canBuild(t, id, res);
  if (!c.ok) return c;
  pay(res, buildingCost(t, id));
  t.buildings[id] = true;
  t.builtToday = true;
  if (id.startsWith('dw')) t.available[id] = UNITS[dwellingUnit(t, id)].growth;
  return { ok: true };
}
export function buildableList(t) {
  return BUILD_ORDER.filter((id) => !t.buildings[id] && !(id === 'hall1'));
}
export function recruitCost(unit, n) { return mulCost(UNITS[unit].cost, n); }
export function maxRecruitable(unit, available, res) {
  let n = available;
  for (const r of RES) if (UNITS[unit].cost[r]) n = Math.min(n, Math.floor((res[r] || 0) / UNITS[unit].cost[r]));
  return Math.max(0, n);
}
/** Recruit into town garrison or visiting hero (target army). */
export function recruit(t, dw, n, res, targetArmy) {
  const unit = dwellingUnit(t, dw);
  n = Math.min(n, maxRecruitable(unit, t.available[dw], res));
  if (n <= 0) return 0;
  if (!canAddUnits(targetArmy, unit)) return 0;
  pay(res, recruitCost(unit, n));
  t.available[dw] -= n;
  addUnits(targetArmy, unit, n);
  return n;
}
export function weeklyGrowth(t, mult = 1) {
  for (const dw of DWELLINGS) {
    if (!t.buildings[dw]) continue;
    const u = UNITS[dwellingUnit(t, dw)];
    t.available[dw] += Math.round(u.growth * growthMult(t) * mult);
  }
}
export function dailyIncome(t, mult = 1) {
  const inc = { gold: Math.round(townIncome(t) * mult) };
  if (t.buildings.silo) inc[FACTIONS[t.faction].rare] = 1;
  return inc;
}
export function townArmyForDefense(t, heroes) {
  // Visiting hero defends with his army; otherwise garrison
  if (t.visiting && heroes[t.visiting]) return { hero: heroes[t.visiting], army: heroes[t.visiting].army };
  return { hero: null, army: t.garrison };
}
/** Units of `from` needed for 1 `to`, given the number of markets the player controls. */
export function tradeRate(from, to, nMarkets) {
  const val = { gold: 1, wood: 250, ore: 250, mithril: 500, warpstone: 500, gems: 500 };
  let r = val[to] / val[from];
  r *= [0, 2.5, 2, 1.6, 1.3, 1.1][Math.min(5, nMarkets)] || 1.1;
  if (from === 'gold') return Math.ceil(r);
  return Math.max(1, Math.round(r));
}
export function hasGarrison(t) { return t.garrison.some((s) => s && s.count > 0); }
