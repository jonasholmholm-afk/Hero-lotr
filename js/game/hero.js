import { HEROES, LEVEL_XP, STAT_IDS } from '../data/heroes.js';
import { FACTIONS } from '../data/factions.js';
import { UNITS } from '../data/units.js';
import { SKILLS, SKILL_IDS, SKILL_WEIGHTS, skillVal } from '../data/skills.js';
import { ARTIFACTS, SLOTS } from '../data/artifacts.js';
import { SPELLS } from '../data/spells.js';
import { clamp } from '../core/utils.js';

export function createHero(s, defId, owner, rng, isStarter = false) {
  const def = HEROES[defId];
  const fac = FACTIONS[def.faction];
  const cls = fac.heroClasses[def.cls];
  const [a, d, p, k] = cls.stats;
  const hero = {
    id: s.nextHeroId++, defId, name: def.name, faction: def.faction, cls: def.cls, owner,
    x: 0, y: 0, level: 1, exp: 0,
    attack: a, defense: d, power: p, knowledge: k,
    skills: { ...def.skills },
    army: [null, null, null, null, null, null, null],
    artifacts: Object.fromEntries(SLOTS.map((sl) => [sl, null])),
    backpack: [],
    spells: [],
    mana: 0, movement: 0,
    flags: { luck: 0, morale: 0, stablesWeek: 0, visited: {} },
    inTavern: false, pendingLevels: [],
  };
  if (def.spec.type === 'stat') hero[def.spec.stat] += 1;
  if (def.cls === 'magic') {
    // Magic heroes start with a level-1 spell fitting their faction
    hero.spells.push(def.faction === 'elves' ? rng.pick(['magic_arrow', 'haste', 'bless', 'cure', 'stone_skin']) : rng.pick(['magic_arrow', 'slow', 'curse', 'bloodlust']));
  }
  // Starting army
  const u1 = fac.units[0], u2 = fac.units[1], u3 = fac.units[2];
  if (isStarter) {
    hero.army[0] = { unit: u1, count: rng.int(12, 18) };
    hero.army[1] = { unit: u2, count: rng.int(5, 8) };
    if (rng.chance(0.5)) hero.army[2] = { unit: u3, count: rng.int(2, 3) };
  } else {
    hero.army[0] = { unit: u1, count: rng.int(6, 12) };
    if (rng.chance(0.6)) hero.army[1] = { unit: u2, count: rng.int(2, 5) };
  }
  hero.mana = maxMana(hero);
  hero.movement = maxMovement(hero);
  s.heroes[hero.id] = hero;
  s.players[owner].heroes.push(hero.id);
  return hero;
}

export function placeHeroInTown(s, hero, town) {
  hero.x = town.x; hero.y = town.y;
  town.visiting = hero.id;
  hero.inTavern = false;
}

export function artifactBonus(hero, key) {
  let b = 0;
  for (const sl of SLOTS) {
    const id = hero.artifacts[sl];
    if (id && ARTIFACTS[id].bonus[key]) b += ARTIFACTS[id].bonus[key];
  }
  return b;
}
export function heroStat(hero, stat) {
  return Math.max(0, hero[stat] + artifactBonus(hero, stat));
}
export function maxMana(hero) {
  return Math.round(heroStat(hero, 'knowledge') * 10 * (1 + skillVal(hero, 'intelligence')));
}
export function slowestSpeed(hero) {
  let sp = 99;
  for (const st of hero.army) if (st) sp = Math.min(sp, UNITS[st.unit].speed);
  return sp === 99 ? 6 : sp;
}
export function maxMovement(hero) {
  const sp = slowestSpeed(hero);
  let base = 1500 + clamp(sp - 3, 0, 8) * 63;
  base *= 1 + skillVal(hero, 'logistics');
  base += artifactBonus(hero, 'movement');
  if (hero.flags.stablesWeek) base += 400;
  return Math.round(base);
}
export function sightRadius(hero) {
  return 5 + skillVal(hero, 'scouting') + artifactBonus(hero, 'scouting');
}
export function heroMorale(hero, extra = 0) {
  let m = skillVal(hero, 'leadership') + artifactBonus(hero, 'morale') + (hero.flags.morale || 0) + extra;
  // Mixed armies: units from other factions reduce morale
  const facs = new Set();
  for (const st of hero.army) if (st && UNITS[st.unit].faction !== 'neutral') facs.add(UNITS[st.unit].faction);
  if (facs.size >= 2) m -= 1;
  return clamp(m, -3, 3);
}
export function heroLuck(hero, extra = 0) {
  return clamp(skillVal(hero, 'luck') + artifactBonus(hero, 'luck') + (hero.flags.luck || 0) + extra, -3, 3);
}
export function armyValue(army) {
  let v = 0;
  for (const st of army) if (st) v += UNITS[st.unit].value * st.count;
  return v;
}
export function armyCount(army) {
  let n = 0;
  for (const st of army) if (st) n += st.count;
  return n;
}
export function armyEmpty(army) { return army.every((s) => !s || s.count <= 0); }

/** Add units to an army: merges with existing stack of same type or takes an empty slot. */
export function addUnits(army, unit, count) {
  if (count <= 0) return true;
  for (const st of army) if (st && st.unit === unit) { st.count += count; return true; }
  for (let i = 0; i < 7; i++) if (!army[i]) { army[i] = { unit, count }; return true; }
  return false;
}
export function canAddUnits(army, unit) {
  return army.some((st) => st && st.unit === unit) || army.some((st) => !st);
}

/** Experience & level-ups. Returns number of pending level-ups queued. */
export function addExp(hero, amount) {
  amount = Math.round(amount * (1 + skillVal(hero, 'learning')));
  hero.exp += amount;
  let n = 0;
  while (hero.level + 1 < LEVEL_XP.length && hero.exp >= LEVEL_XP[hero.level + 1]) {
    hero.level++;
    hero.pendingLevels.push(hero.level);
    n++;
  }
  return n;
}
export function expForNext(hero) {
  return LEVEL_XP[Math.min(hero.level + 1, LEVEL_XP.length - 1)];
}

/** Roll a level-up: picks the primary stat and offers two skill choices. */
export function rollLevelUp(hero, rng) {
  const def = HEROES[hero.defId];
  const cls = FACTIONS[hero.faction].heroClasses[hero.cls];
  const w = cls.levelUp;
  const stat = rng.weighted(STAT_IDS, (st, i) => w[STAT_IDS.indexOf(st)]);
  hero[stat] += 1;
  if (stat === 'knowledge') hero.mana = Math.min(maxMana(hero), hero.mana + 10);
  // Skill choices: prefer upgrading existing; otherwise new ones
  const owned = Object.keys(hero.skills).filter((k) => hero.skills[k] < 3);
  const unowned = SKILL_IDS.filter((k) => !hero.skills[k]);
  const choices = [];
  const weights = SKILL_WEIGHTS[hero.cls];
  if (owned.length && (unowned.length === 0 || rng.chance(0.6))) choices.push(rng.weighted(owned, (k) => weights[k] + 2));
  const canAddNew = Object.keys(hero.skills).length < 6;
  while (choices.length < 2) {
    const pool = (canAddNew ? unowned : owned).filter((k) => !choices.includes(k));
    if (!pool.length) {
      const p2 = owned.filter((k) => !choices.includes(k));
      if (!p2.length) break;
      choices.push(rng.weighted(p2, (k) => weights[k] + 1));
    } else choices.push(rng.weighted(pool, (k) => weights[k]));
  }
  return { stat, choices };
}
export function applySkill(hero, id) {
  hero.skills[id] = Math.min(3, (hero.skills[id] || 0) + 1);
}
export function skillLabel(hero, id) {
  const l = hero.skills[id] || 0;
  return `${SKILLS[id].name} (${['', 'Basis', 'Avanceret', 'Ekspert'][l]})`;
}

export function canLearnSpell(hero, spellId) {
  return SPELLS[spellId].level <= SKILLS.wisdom.vals[hero.skills.wisdom || 0];
}
export function learnSpell(hero, spellId) {
  if (hero.spells.includes(spellId)) return false;
  hero.spells.push(spellId);
  return true;
}
export function spellList(hero) { return [...new Set(hero.spells)]; }

/** Equip an artifact: returns true if equipped, false if put in backpack. */
export function giveArtifact(hero, artId) {
  const art = ARTIFACTS[artId];
  const slots = art.slot === 'misc' ? ['misc1', 'misc2'] : [art.slot];
  for (const sl of slots) if (!hero.artifacts[sl]) { hero.artifacts[sl] = artId; return true; }
  hero.backpack.push(artId);
  return false;
}
export function equipFromBackpack(hero, idx) {
  const artId = hero.backpack[idx];
  const art = ARTIFACTS[artId];
  const slots = art.slot === 'misc' ? ['misc1', 'misc2'] : [art.slot];
  let sl = slots.find((x) => !hero.artifacts[x]) || slots[0];
  const old = hero.artifacts[sl];
  hero.artifacts[sl] = artId;
  hero.backpack.splice(idx, 1);
  if (old) hero.backpack.push(old);
}
export function unequip(hero, slot) {
  if (!hero.artifacts[slot]) return;
  hero.backpack.push(hero.artifacts[slot]);
  hero.artifacts[slot] = null;
}
export function allArtifacts(hero) {
  return [...SLOTS.map((s) => hero.artifacts[s]).filter(Boolean), ...hero.backpack];
}
export function className(hero) {
  return FACTIONS[hero.faction].heroClasses[hero.cls].name;
}
export function specialtyText(hero) {
  const sp = HEROES[hero.defId].spec;
  if (sp.type === 'unit') return `${UNITS[sp.id].plural}: +1 angreb/forsvar pr. 3 niveauer, +1 hastighed`;
  if (sp.type === 'skill') return `${SKILLS[sp.id].name}: dobbelt effekt`;
  return `Magt: +1 og +5% skade fra besværgelser pr. 4 niveauer`;
}
