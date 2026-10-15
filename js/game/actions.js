import { G, obj, objAt, heroAt, removeObj, player, log } from './state.js';
import { OBJ, OBJ_INFO } from '../data/objects.js';
import { UNITS } from '../data/units.js';
import { RES_INFO, MINE_NAMES, RARE, addRes, canAfford, pay, mulCost } from '../data/resources.js';
import { ARTIFACTS } from '../data/artifacts.js';
import { SPELLS } from '../data/spells.js';
import { FACTIONS } from '../data/factions.js';
import { HEROES } from '../data/heroes.js';
import { addExp, rollLevelUp, applySkill, giveArtifact, learnSpell, canLearnSpell, maxMana, addUnits, canAddUnits, armyValue, armyEmpty, maxMovement, sightRadius, allArtifacts } from './hero.js';
import { revealAround } from './fog.js';
import { heroStepCost, guardAt, terrainCost, tileIndex } from './movement.js';
import { townDefenseBonus, fortLevel, hasGarrison, mageLevel } from './town.js';
import { runBattle } from '../combat/runner.js';
import { DIRS8 } from '../core/utils.js';

export function monsterCountText(n) {
  if (n < 5) return 'Få (1-4)';
  if (n < 10) return 'Flere (5-9)';
  if (n < 20) return 'Flok (10-19)';
  if (n < 50) return 'Mange (20-49)';
  if (n < 100) return 'Horde (50-99)';
  if (n < 250) return 'Myldrende (100-249)';
  if (n < 500) return 'Sværm (250-499)';
  return 'Legion (500+)';
}
export function objectName(o) {
  switch (o.type) {
    case OBJ.TOWN: return o.name;
    case OBJ.MINE: return MINE_NAMES[o.res];
    case OBJ.DWELLING: return `${UNITS[o.unit].plural}s bolig`;
    case OBJ.RESOURCE: return RES_INFO[o.res].name;
    case OBJ.ARTIFACT: return ARTIFACTS[o.artifact].name;
    case OBJ.MONSTER: return `${UNITS[o.unit].plural} – ${monsterCountText(o.count)}`;
    default: return OBJ_INFO[o.type] ? OBJ_INFO[o.type].name : o.type;
  }
}
export function ownerName(o) {
  if (o.owner === undefined || o.owner < 0) return 'Ingen ejer';
  return G.s.players[o.owner].name;
}

/** Process pending level-ups for a hero. */
export async function processLevelUps(hero, io) {
  while (hero.pendingLevels.length) {
    const lvl = hero.pendingLevels.shift();
    const roll = rollLevelUp(hero, G.rng);
    let choice = null;
    if (roll.choices.length) choice = await io.levelUp(hero, lvl, roll);
    if (choice) applySkill(hero, choice);
    hero.maxMovement = maxMovement(hero);
  }
}

/** Move a hero along a path (array of {x,y,g}). Handles interactions at the destination. */
export async function moveHeroAlong(hero, path, io) {
  const s = G.s;
  const p = player(hero.owner);
  let prevG = 0;
  for (let i = 0; i < path.length; i++) {
    const st = path[i];
    const cost = st.g - prevG;
    if (cost > hero.movement + 0.001) { hero.path = path.slice(i); return 'out_of_moves'; }
    const isDest = i === path.length - 1;
    const target = objAt(st.x, st.y);
    const other = heroAt(st.x, st.y);
    // Combat targets: we stop adjacent and fight
    if (isDest && target && target.type === OBJ.MONSTER) {
      hero.movement = Math.max(0, Math.round(hero.movement - cost));
      hero.path = null;
      const r = await fightMonster(hero, target, io);
      return r;
    }
    if (isDest && other && other.owner !== hero.owner) {
      hero.movement = Math.max(0, Math.round(hero.movement - cost));
      hero.path = null;
      return await fightHero(hero, other, io);
    }
    if (isDest && target && target.type === OBJ.TOWN && target.owner !== hero.owner) {
      hero.movement = Math.max(0, Math.round(hero.movement - cost));
      hero.path = null;
      return await attackTown(hero, target, io);
    }
    // Leave town if we were visiting
    leaveTile(hero);
    hero.movement = Math.max(0, Math.round(hero.movement - cost));
    const prev = { x: hero.x, y: hero.y };
    hero.x = st.x; hero.y = st.y;
    prevG = st.g;
    revealAround(s, p, hero.x, hero.y, sightRadius(hero));
    if (io.step) await io.step(hero, st, i, path, prev);
    // Guard check: stepping onto a guarded tile triggers combat
    const g = guardAt(hero.x, hero.y);
    if (g) {
      hero.path = null;
      const r = await fightMonster(hero, g, io);
      if (r !== 'won') return r;
      if (!isDest) continue;
    }
    if (target) {
      const r = await interact(hero, target, io);
      if (r === 'dead') return 'dead';
    }
  }
  hero.path = null;
  return 'arrived';
}

export function leaveTile(hero) {
  const o = objAt(hero.x, hero.y);
  if (o && o.type === OBJ.TOWN && o.visiting === hero.id) o.visiting = null;
}

export async function interact(hero, o, io) {
  const s = G.s;
  const p = player(hero.owner);
  const res = p.resources;
  switch (o.type) {
    case OBJ.RESOURCE: {
      addRes(res, { [o.res]: o.amount });
      removeObj(o);
      await io.pickup(hero, `${o.amount} ${RES_INFO[o.res].name}`, o.res);
      return;
    }
    case OBJ.CHEST: {
      const gold = G.rng.pick([1000, 1500, 2000]);
      const exp = gold - 500;
      const c = await io.choice(hero, 'Skattekiste', `Du finder en kiste med skatte fra en glemt tid. Tag ${gold} guld, eller del den ud til folket for ${exp} erfaring?`, [`${gold} guld`, `${exp} erfaring`], () => (hero.level < 6 ? 1 : 0));
      removeObj(o);
      if (c === 0) res.gold += gold; else { addExp(hero, exp); await processLevelUps(hero, io); }
      return;
    }
    case OBJ.ARTIFACT: {
      const art = ARTIFACTS[o.artifact];
      giveArtifact(hero, o.artifact);
      removeObj(o);
      await io.msg(hero, art.name, `${art.lore}\n\n${hero.name} tager ${art.name}.`, { artifact: o.artifact });
      return;
    }
    case OBJ.MINE: {
      if (o.owner !== hero.owner) {
        const old = o.owner;
        o.owner = hero.owner;
        await io.pickup(hero, `${MINE_NAMES[o.res]} erobret`, o.res);
        log(`${hero.name} erobrede ${MINE_NAMES[o.res]}.`, hero.owner);
      }
      return;
    }
    case OBJ.DWELLING: {
      const u = UNITS[o.unit];
      if (o.owner !== hero.owner) o.owner = hero.owner;
      if (o.available <= 0) { await io.msg(hero, objectName(o), `Ingen ${u.plural} er klar til at slutte sig til dig i denne uge.`); return; }
      await io.recruitDialog(hero, o);
      return;
    }
    case OBJ.TOWN: {
      if (o.owner === hero.owner) {
        o.visiting = hero.id;
        hero.flags.visitedTownDay = s.day;
        // Mage guild teaches spells
        learnGuildSpells(hero, o);
        if (o.buildings.special) {
          hero.flags[FACTIONS[o.faction].specialKey] = 1;
        }
        await io.enterTown(hero, o);
      }
      return;
    }
    case OBJ.SHRINE: {
      const sp = SPELLS[o.spell];
      if (hero.spells.includes(o.spell)) { await io.msg(hero, OBJ_INFO.shrine.name, `Helligdommens vogter hvisker "${sp.name}" – men ${hero.name} kender allerede den besværgelse.`); return; }
      if (!canLearnSpell(hero, o.spell)) { await io.msg(hero, OBJ_INFO.shrine.name, `Helligdommen lærer "${sp.name}" (niveau ${sp.level}), men ${hero.name} mangler Visdom til at forstå den.`); return; }
      learnSpell(hero, o.spell);
      await io.msg(hero, OBJ_INFO.shrine.name, `${hero.name} lærer besværgelsen "${sp.name}".`, { spell: o.spell });
      return;
    }
    case OBJ.RUNESTONE: {
      if (o.visited[hero.id]) { await io.msg(hero, OBJ_INFO.runestone.name, 'Runerne har intet nyt at fortælle.'); return; }
      o.visited[hero.id] = 1;
      addExp(hero, 1000);
      await io.msg(hero, OBJ_INFO.runestone.name, `${hero.name} tyder runerne og får 1000 erfaring.`);
      await processLevelUps(hero, io);
      return;
    }
    case OBJ.WELL: {
      const mm = maxMana(hero);
      if (hero.mana >= mm) { await io.msg(hero, OBJ_INFO.well.name, 'Kildens vand er klart, men helten er allerede fuld af kraft.'); return; }
      hero.mana = mm;
      await io.msg(hero, OBJ_INFO.well.name, `${hero.name} drikker af kilden og genvinder al sin mana.`);
      return;
    }
    case OBJ.TREE: {
      if (o.visited[hero.id]) { await io.msg(hero, OBJ_INFO.tree.name, 'Træet har allerede delt sin visdom med denne helt.'); return; }
      const cost = 2000;
      const c = await io.choice(hero, OBJ_INFO.tree.name, `Det ældgamle træ tilbyder sin visdom for ${cost} guld. ${hero.name} vil stige et niveau.`, [`Betal ${cost} guld`, 'Nej tak'], () => (res.gold >= cost ? 0 : 1));
      if (c === 0) {
        if (res.gold < cost) { await io.msg(hero, OBJ_INFO.tree.name, 'Ikke nok guld.'); return; }
        res.gold -= cost; o.visited[hero.id] = 1;
        const { LEVEL_XP } = await import('../data/heroes.js');
        addExp(hero, Math.max(0, LEVEL_XP[hero.level + 1] - hero.exp));
        await processLevelUps(hero, io);
      }
      return;
    }
    case OBJ.STABLES: {
      if (hero.flags.stablesWeek === weekOf(s.day)) { await io.msg(hero, OBJ_INFO.stables.name, 'Hestene er allerede udhvilede.'); return; }
      hero.flags.stablesWeek = weekOf(s.day);
      hero.movement += 400;
      hero.maxMovement = maxMovement(hero);
      await io.msg(hero, OBJ_INFO.stables.name, `Rohirrims heste bærer ${hero.name} hurtigere frem: +400 bevægelse resten af ugen.`);
      return;
    }
    case OBJ.TOWER: {
      revealAround(s, p, o.x, o.y, 14);
      await io.msg(hero, OBJ_INFO.tower.name, 'Fra tårnets top ser helten vidt ud over landet.');
      return;
    }
    case OBJ.FOUNTAIN: {
      hero.flags.luck = 1;
      await io.msg(hero, OBJ_INFO.fountain.name, `${hero.name} kaster en mønt i brønden. +1 held i næste kamp.`);
      return;
    }
    case OBJ.CAMP: {
      hero.flags.morale = 1;
      await io.msg(hero, OBJ_INFO.camp.name, `Hæren hviler ved bålet og hører gamle sange. +1 moral i næste kamp.`);
      return;
    }
    case OBJ.WINDMILL: {
      const wk = weekOf(s.day);
      if (o.visitedWeek[hero.owner] === wk) { await io.msg(hero, OBJ_INFO.windmill.name, 'Mølleren har intet mere at give denne uge.'); return; }
      o.visitedWeek[hero.owner] = wk;
      const r = G.rng.pick(RARE);
      const n = G.rng.int(3, 6);
      addRes(res, { [r]: n });
      await io.pickup(hero, `${n} ${RES_INFO[r].name} fra møllen`, r);
      return;
    }
    case OBJ.RUIN: {
      if (o.gold > 0) {
        res.gold += o.gold;
        await io.pickup(hero, `${o.gold} guld fundet i ruinen`, 'gold');
        o.gold = 0;
      } else await io.msg(hero, OBJ_INFO.ruin.name, 'Ruinen er allerede plyndret.');
      return;
    }
  }
}

export function weekOf(day) { return Math.floor((day - 1) / 7) + 1; }

export function learnGuildSpells(hero, town) {
  const lvl = mageLevel(town);
  const learned = [];
  for (let l = 1; l <= lvl; l++) for (const sp of town.spells[l]) {
    if (!hero.spells.includes(sp) && canLearnSpell(hero, sp)) { hero.spells.push(sp); learned.push(sp); }
  }
  if (lvl > 0) hero.mana = Math.max(hero.mana, maxMana(hero));
  return learned;
}

// ---------------- Battles ----------------
function terrainAt(x, y) { return G.s.map.terrain[tileIndex(x, y)]; }

export async function fightMonster(hero, mon, io) {
  const s = G.s;
  const army = [{ unit: mon.unit, count: mon.count }, null, null, null, null, null, null];
  // Split big stacks into several for a better battle
  const n = mon.count;
  if (n >= 10) {
    const parts = Math.min(5, Math.max(2, Math.floor(n / 8)));
    const per = Math.floor(n / parts);
    for (let i = 0; i < parts; i++) army[i] = { unit: mon.unit, count: per + (i === 0 ? n - per * parts : 0) };
  }
  const setup = {
    attacker: { hero, army: hero.army, owner: hero.owner, name: hero.name },
    defender: { hero: null, army, owner: -1, name: UNITS[mon.unit].plural },
    rng: G.rng, terrain: terrainAt(hero.x, hero.y),
  };
  const { res, battle } = await runBattle(setup, io.battleIO(setup));
  s.stats.battles++;
  syncArmy(hero.army, battle, 0);
  hero.mana = battle.heroes[0].mana;
  hero.flags.luck = 0; hero.flags.morale = 0;
  if (res.winner === 0) {
    removeObj(mon);
    addExp(hero, res.exp[0]);
    await io.battleResult(hero, null, res, battle, true);
    await processLevelUps(hero, io);
    return 'won';
  }
  // Monster survives with remaining count
  const left = battle.alive(1).reduce((a, st) => a + st.count, 0);
  mon.count = Math.max(1, left);
  await io.battleResult(hero, null, res, battle, false);
  defeatHero(hero, null);
  return 'dead';
}

export async function fightHero(hero, enemy, io) {
  const s = G.s;
  const town = objAt(enemy.x, enemy.y);
  const siege = town && town.type === OBJ.TOWN && town.owner === enemy.owner ? fortLevel(town) : 0;
  const setup = {
    attacker: { hero, army: hero.army, owner: hero.owner, name: hero.name },
    defender: { hero: enemy, army: enemy.army, owner: enemy.owner, name: enemy.name, town: siege ? town : null },
    rng: G.rng, terrain: terrainAt(enemy.x, enemy.y), siegeLevel: siege,
    defBonus: siege ? townDefenseBonus(town) : 0, defMorale: town && town.type === OBJ.TOWN && town.buildings.tavern && siege ? 1 : 0,
  };
  const { res, battle } = await runBattle(setup, io.battleIO(setup));
  s.stats.battles++;
  syncArmy(hero.army, battle, 0);
  syncArmy(enemy.army, battle, 1);
  hero.mana = battle.heroes[0].mana; enemy.mana = battle.heroes[1].mana;
  hero.flags.luck = 0; hero.flags.morale = 0;
  if (res.winner === 0) {
    addExp(hero, res.exp[0]);
    await io.battleResult(hero, enemy, res, battle, true);
    defeatHero(enemy, hero);
    if (town && town.type === OBJ.TOWN && town.owner === enemy.owner) {
      // Town falls too if no garrison remains
      if (!hasGarrison(town)) captureTown(town, hero.owner);
      else return await attackTown(hero, town, io);
    }
    await processLevelUps(hero, io);
    return 'won';
  }
  addExp(enemy, res.exp[1]);
  await io.battleResult(hero, enemy, res, battle, false);
  defeatHero(hero, enemy);
  await processLevelUps(enemy, io);
  return 'dead';
}

export async function attackTown(hero, town, io) {
  const s = G.s;
  const visiting = town.visiting ? s.heroes[town.visiting] : null;
  if (visiting && visiting.owner === town.owner) return await fightHero(hero, visiting, io);
  if (!hasGarrison(town)) {
    captureTown(town, hero.owner);
    await io.msg(hero, town.name, `${town.name} er ubevogtet. ${hero.name} rider ind gennem portene og tager byen!`);
    hero.x = town.x; hero.y = town.y; town.visiting = hero.id;
    return 'won';
  }
  const siege = fortLevel(town);
  const setup = {
    attacker: { hero, army: hero.army, owner: hero.owner, name: hero.name },
    defender: { hero: null, army: town.garrison, owner: town.owner, name: town.name + ' (garnison)', town },
    rng: G.rng, terrain: terrainAt(town.x, town.y), siegeLevel: siege,
    defBonus: townDefenseBonus(town), defMorale: town.buildings.tavern ? 1 : 0,
  };
  const { res, battle } = await runBattle(setup, io.battleIO(setup));
  s.stats.battles++;
  syncArmy(hero.army, battle, 0);
  syncArmy(town.garrison, battle, 1);
  hero.mana = battle.heroes[0].mana;
  hero.flags.luck = 0; hero.flags.morale = 0;
  if (res.winner === 0) {
    addExp(hero, res.exp[0]);
    await io.battleResult(hero, null, res, battle, true);
    captureTown(town, hero.owner);
    hero.x = town.x; hero.y = town.y; town.visiting = hero.id;
    await processLevelUps(hero, io);
    return 'won';
  }
  await io.battleResult(hero, null, res, battle, false);
  defeatHero(hero, null);
  return 'dead';
}

export function syncArmy(army, battle, side) {
  for (const st of battle.stacks) {
    if (st.side !== side) continue;
    if (!army[st.slot]) continue;
    if (st.count <= 0) army[st.slot] = null; else army[st.slot].count = st.count;
  }
}

export function defeatHero(hero, winner) {
  const s = G.s;
  const p = s.players[hero.owner];
  leaveTile(hero);
  // Artifacts go to the victor
  if (winner) for (const a of allArtifacts(hero)) giveArtifact(winner, a);
  p.heroes = p.heroes.filter((id) => id !== hero.id);
  delete s.heroes[hero.id];
  p.tavernPool.push(hero.defId);
  log(`${hero.name} blev besejret.`, hero.owner);
}

export function captureTown(town, newOwner) {
  const s = G.s;
  if (town.owner >= 0) {
    const old = s.players[town.owner];
    old.towns = old.towns.filter((id) => id !== town.id);
  }
  town.owner = newOwner;
  town.visiting = null;
  s.players[newOwner].towns.push(town.id);
  s.players[newOwner].daysWithoutTown = 0;
  revealAround(s, s.players[newOwner], town.x, town.y, 7);
  log(`${town.name} blev erobret af ${s.players[newOwner].name}.`, newOwner);
}

/** Hire a hero from a town's tavern. */
export function hireHero(town, pid, createHeroFn) {
  const s = G.s;
  const p = s.players[pid];
  if (!town.tavernHero || p.resources.gold < 2500) return null;
  if (town.visiting) return null;
  if (p.heroes.length >= 8) return null;
  p.resources.gold -= 2500;
  const hero = createHeroFn(s, town.tavernHero, pid, G.rng, false);
  hero.x = town.x; hero.y = town.y; town.visiting = hero.id;
  town.tavernHero = p.tavernPool.length ? p.tavernPool.shift() : null;
  hero.movement = maxMovement(hero); hero.maxMovement = hero.movement;
  revealAround(s, p, hero.x, hero.y, sightRadius(hero));
  learnGuildSpells(hero, town);
  return hero;
}

/** Recruit from an external dwelling into a hero's army. */
export function recruitExternal(hero, o, n) {
  const p = player(hero.owner);
  const u = UNITS[o.unit];
  n = Math.min(n, o.available);
  while (n > 0 && !canAfford(p.resources, mulCost(u.cost, n))) n--;
  if (n <= 0 || !canAddUnits(hero.army, o.unit)) return 0;
  pay(p.resources, mulCost(u.cost, n));
  o.available -= n;
  addUnits(hero.army, o.unit, n);
  hero.maxMovement = maxMovement(hero);
  return n;
}
