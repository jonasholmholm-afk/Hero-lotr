import { Battle } from './battle.js';
import { decideAction, decideSpell } from './battleAI.js';

/**
 * Runs a battle to completion. `io` provides:
 *   isHuman(side) -> bool
 *   begin(battle), play(events), playerAction(battle, stack) -> action, end(battle, result)
 * The null io (for AI vs AI / AI vs neutral) runs instantly.
 */
export async function runBattle(setup, io) {
  const b = new Battle(setup);
  b.start();
  if (io.begin) await io.begin(b);
  let guard = 0;
  while (!b.finished && guard++ < 2000) {
    const st = b.nextTurn();
    if (io.play) await io.play(b.takeEvents());
    if (!st || b.finished) break;
    let act;
    if (io.isHuman(st.side)) {
      act = await io.playerAction(b, st);
    } else {
      const sp = decideSpell(b, st.side);
      if (sp) {
        b.castSpell(st.side, sp.spell, sp.target);
        if (io.play) await io.play(b.takeEvents());
        if (b.finished) break;
      }
      act = decideAction(b, st);
    }
    applyAction(b, st, act);
    if (io.play) await io.play(b.takeEvents());
  }
  if (!b.finished) { b.finished = true; b.winner = 1; }
  const res = b.result();
  if (io.end) await io.end(b, res);
  return { battle: b, res };
}

export function applyAction(b, st, act) {
  if (!act) return b.actDefend(st);
  switch (act.type) {
    case 'move': return b.actMove(st, act.x, act.y) || b.actDefend(st);
    case 'attack': return b.actAttack(st, act.target, act.x, act.y) || b.actDefend(st);
    case 'shoot': return b.actShoot(st, act.target) || b.actDefend(st);
    case 'wait': return b.actWait(st) || b.actDefend(st);
    case 'flee': return b.flee(st.side);
    default: return b.actDefend(st);
  }
}

export const silentIO = { isHuman: () => false };
