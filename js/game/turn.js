import { G, player, townsOf, heroesOf, log } from './state.js';
import { OBJ } from '../data/objects.js';
import { MINE_INCOME } from '../data/resources.js';
import { UNITS } from '../data/units.js';
import { DIFFICULTIES } from './state.js';
import { dailyIncome, weeklyGrowth, mageLevel, dwellingUnit, growthMult } from './town.js';
import { DWELLINGS } from '../data/buildings.js';
import { RARE } from '../data/resources.js';
import { maxMovement, maxMana } from './hero.js';
import { skillVal } from '../data/skills.js';
import { weekOf } from './actions.js';
import { runAITurn } from '../ai/ai.js';

export function isNewWeek(day) { return day > 1 && (day - 1) % 7 === 0; }

/** Compute the daily income summary for a player (used by HUD tooltip too). */
export function incomeOf(p) {
  const s = G.s;
  const diff = DIFFICULTIES[s.difficulty];
  const mult = p.isAI ? diff.aiIncome : 1;
  const inc = { gold: 0, wood: 0, ore: 0, mithril: 0, warpstone: 0, gems: 0 };
  for (const t of townsOf(p.id)) {
    const i = dailyIncome(t, mult);
    for (const k in i) inc[k] += i[k];
  }
  for (const o of Object.values(s.map.objects)) {
    if (o.type === OBJ.MINE && o.owner === p.id) inc[o.res] += Math.round(MINE_INCOME[o.res] * (o.res === 'gold' ? mult : 1));
  }
  for (const h of heroesOf(p.id)) inc.gold += skillVal(h, 'estates');
  return inc;
}

/** Rolls the event of a new week. */
export function rollWeekEvent(n) {
  const rng = G.rng;
  const r = rng.int(0, 99);
  if (r < 45) {
    const pool = Object.keys(UNITS).filter((u) => UNITS[u].tier <= 5);
    const unit = rng.pick(pool);
    return { n, kind: 'creature', unit, name: `Ugen for ${UNITS[unit].plural}`, text: `${UNITS[unit].plural} strømmer til: alle deres boliger giver dobbelt vækst i denne uge.` };
  }
  if (r < 55) return { n, kind: 'plague', name: 'Pestuge', text: 'Sygdom hærger. Væksten i alle byer er halveret i denne uge.' };
  if (r < 70) return { n, kind: 'harvest', name: 'Høstuge', text: 'Rig høst over hele landet: alle riger modtager 1500 guld.' };
  if (r < 82) return { n, kind: 'trade', name: 'Karavaneuge', text: 'Karavaner fra fjerne lande: alle riger modtager 2 af hver sjælden ressource.' };
  return { n, kind: 'calm', name: 'Stille uge', text: 'Intet særligt sker. Bønderne pløjer, og krigerne sliber deres klinger.' };
}

export function startDay(p) {
  const s = G.s;
  const diff = DIFFICULTIES[s.difficulty];
  const inc = incomeOf(p);
  for (const k in inc) p.resources[k] += inc[k];
  const newWeek = isNewWeek(s.day);
  for (const t of townsOf(p.id)) {
    t.builtToday = false;
    if (newWeek) {
      const wk = s.week || { kind: 'calm' };
      weeklyGrowth(t, (p.isAI ? diff.aiGrowth : 1) * (wk.kind === 'plague' ? 0.5 : 1));
      if (wk.kind === 'creature') for (const dw of DWELLINGS) if (t.buildings[dw] && dwellingUnit(t, dw) === wk.unit) t.available[dw] += Math.round(UNITS[wk.unit].growth * growthMult(t));
      if (!t.tavernHero && p.tavernPool.length) t.tavernHero = p.tavernPool.shift();
    }
  }
  if (newWeek && s.week) {
    if (s.week.kind === 'harvest') p.resources.gold += 1500;
    if (s.week.kind === 'trade') for (const r of RARE) p.resources[r] += 2;
  }
  for (const h of heroesOf(p.id)) {
    if (newWeek && h.flags.stablesWeek && h.flags.stablesWeek !== weekOf(s.day)) h.flags.stablesWeek = 0;
    h.maxMovement = maxMovement(h);
    h.movement = h.maxMovement;
    const mm = maxMana(h);
    const inTown = townsOf(p.id).find((t) => t.visiting === h.id);
    if (inTown && mageLevel(inTown) > 0) h.mana = mm;
    else h.mana = Math.min(mm, h.mana + skillVal(h, 'mysticism'));
  }
  if (p.towns.length === 0) p.daysWithoutTown++; else p.daysWithoutTown = 0;
}

/** Things that happen once per day globally (before player 0's turn). */
export function startGlobalDay() {
  const s = G.s;
  if (!isNewWeek(s.day)) return;
  s.week = rollWeekEvent(weekOf(s.day));
  log(`Uge ${s.week.n}: ${s.week.name}. ${s.week.text}`);
  for (const o of Object.values(s.map.objects)) {
    if (o.type === OBJ.DWELLING) o.available += UNITS[o.unit].growth * (s.week.kind === 'creature' && s.week.unit === o.unit ? 2 : 1);
    if (o.type === OBJ.MONSTER) { o.count = Math.round(o.count * 1.1); }
  }
}

export function checkVictory() {
  const s = G.s;
  if (s.winner !== null) return s.winner;
  for (const p of s.players) {
    if (!p.alive) continue;
    if ((p.towns.length === 0 && p.heroes.length === 0) || p.daysWithoutTown >= 7) {
      p.alive = false;
      log(`${p.name} er besejret!`, p.id);
    }
  }
  const alive = s.players.filter((p) => p.alive);
  if (alive.length === 1) s.winner = alive[0].id;
  return s.winner;
}

/** End the current player's turn and advance (running AI turns). io handles UI. */
export async function endTurn(io) {
  const s = G.s;
  if (checkVictory() !== null) return;
  for (;;) {
    s.current = (s.current + 1) % s.players.length;
    if (s.current === 0) {
      s.day++;
      s.stats.daysPlayed = s.day;
      startGlobalDay();
    }
    const p = s.players[s.current];
    if (!p.alive) { if (s.current === 0) { checkVictory(); return; } continue; }
    startDay(p);
    if (checkVictory() !== null) return;
    if (p.isAI) {
      if (io.aiTurnStart) await io.aiTurnStart(p);
      await runAITurn(p, io);
      if (io.aiTurnEnd) await io.aiTurnEnd(p);
      if (checkVictory() !== null) return;
      continue;
    }
    return; // human player's turn
  }
}
