import { hexKey, hexDist, neighbors } from './hex.js';
import { SPELLS } from '../data/spells.js';
import { hasAbility } from '../data/units.js';

// Expected damage estimate without randomness (average roll, no luck)
function expectedDamage(b, att, def, ranged) {
  const avg = (att.unit.dmg[0] + att.unit.dmg[1]) / 2;
  const A = b.attackOf(att), D = b.defenseOf(def);
  let mult = A >= D ? 1 + 0.05 * Math.min(A - D, 60) : 1 - 0.025 * Math.min(D - A, 28);
  if (ranged) { if (hexDist(att.x, att.y, def.x, def.y) > 7) mult *= 0.5; if (hasAbility(def.unit, 'bark')) mult *= 0.75; }
  else if (hasAbility(att.unit, 'ranged')) mult *= 0.5;
  return avg * att.count * mult;
}
function killValue(b, att, def, ranged) {
  const dmg = expectedDamage(b, att, def, ranged);
  const total = (def.count - 1) * def.unit.hp + def.hp;
  const frac = Math.min(1, dmg / total);
  let v = frac * def.count * def.unit.value;
  if (frac >= 1) v *= 1.3; // bonus for wiping a stack
  if (hasAbility(def.unit, 'ranged') && def.shots > 0) v *= 1.3;
  return v;
}
function threat(b, st) { return st.count * st.unit.value; }

export function decideAction(b, st) {
  const enemies = b.alive(1 - st.side);
  if (!enemies.length) return { type: 'defend' };
  // Shooters
  if (b.canShoot(st)) {
    let best = null, bv = -1;
    for (const e of enemies) {
      const v = killValue(b, st, e, true) / (hexDist(st.x, st.y, e.x, e.y) > 7 ? 1.2 : 1);
      if (v > bv) { bv = v; best = e; }
    }
    return { type: 'shoot', target: best.id };
  }
  const reach = b.reachable(st);
  let best = null, bv = -Infinity;
  for (const e of enemies) {
    const positions = b.attackPositions(st, e, reach);
    if (!positions.length) continue;
    const pos = positions[0];
    let v = killValue(b, st, e, false);
    // expected retaliation
    if (!hasAbility(st.unit, 'no_retaliation') && !e.retaliated) {
      const retDmg = expectedDamage(b, e, st, false);
      v -= Math.min(1, retDmg / ((st.count - 1) * st.unit.hp + st.hp)) * st.count * st.unit.value * 0.6;
    }
    if (hasAbility(st.unit, 'charge')) v *= 1 + Math.min(0.5, pos.dist * 0.1);
    // prefer staying put (no wasted movement) slightly
    v -= pos.dist * 2;
    if (v > bv) { bv = v; best = { type: 'attack', target: e.id, x: pos.x, y: pos.y }; }
  }
  if (best && (bv > 0 || reach.size === 0 || b.isRanged(st))) return best;
  if (best && bv > -threat(b, st) * 0.3) return best;
  // Shooter with enemy adjacent but no good melee: still attack adjacent
  // Otherwise move towards the most valuable/closest enemy
  let target = null, tv = -Infinity;
  for (const e of enemies) {
    const d = hexDist(st.x, st.y, e.x, e.y);
    const v = (hasAbility(e.unit, 'ranged') ? 1.5 : 1) * threat(b, e) / (d + 1) ;
    if (v > tv) { tv = v; target = e; }
  }
  // If the enemy is weak relative to us and we're waiting shooters, wait instead
  if (!st.waited && b.alive(st.side).some((s) => s !== st && b.isRanged(s)) && enemies.every((e) => hexDist(st.x, st.y, e.x, e.y) > b.speed(st) + 1) && b.round <= 2) {
    // Hold position near shooters in the first rounds if enemy must come to us
    const enemyFast = enemies.some((e) => b.speed(e) >= b.speed(st));
    if (enemyFast) return { type: 'defend' };
  }
  let bestHex = null, bd = Infinity;
  for (const r of reach.values()) {
    const d = hexDist(r.x, r.y, target.x, target.y);
    if (d < bd || (d === bd && r.dist < bestHex.dist)) { bd = d; bestHex = r; }
  }
  if (bestHex && bd < hexDist(st.x, st.y, target.x, target.y)) return { type: 'move', x: bestHex.x, y: bestHex.y };
  if (best) return best;
  return { type: 'defend' };
}

/** Choose a spell for the AI hero of `side`, or null. */
export function decideSpell(b, side) {
  const h = b.heroes[side];
  if (!h.hero || h.spellCast) return null;
  const enemies = b.alive(1 - side), allies = b.alive(side);
  if (!enemies.length || !allies.length) return null;
  let best = null, bv = 0;
  for (const id of h.spells) {
    const sp = SPELLS[id];
    if (!b.canCast(side, id)) continue;
    if (sp.kind === 'damage') {
      const p = h.power;
      const d = sp.dmg(p);
      for (const e of enemies) {
        let v = 0;
        const targets = [e];
        if (sp.area) for (const [x, y] of neighbors(e.x, e.y)) { const o = b.stackAt(x, y); if (o) targets.push(o); }
        targets.forEach((t, i) => {
          const dd = i === 0 ? d : d * 0.5;
          const frac = Math.min(1, dd / ((t.count - 1) * t.unit.hp + t.hp));
          v += frac * t.count * t.unit.value * (t.side === side ? -1.5 : 1);
        });
        if (sp.chain) v *= 1.4;
        v /= Math.sqrt(sp.cost);
        if (v > bv) { bv = v; best = { spell: id, target: e.id }; }
      }
    } else if (sp.kind === 'buff') {
      const big = allies.slice().sort((a, c) => threat(b, c) - threat(b, a))[0];
      let v = threat(b, big) * 0.12 / Math.sqrt(sp.cost);
      if (sp.target === 'all_allies') v = allies.reduce((s, a) => s + threat(b, a), 0) * 0.1 / Math.sqrt(sp.cost);
      if (sp.effect.speed && b.round > 2) v *= 0.4;
      if (v > bv) { bv = v; best = { spell: id, target: sp.target === 'all_allies' ? null : big.id }; }
    } else if (sp.kind === 'debuff') {
      const big = enemies.slice().sort((a, c) => threat(b, c) - threat(b, a))[0];
      let v = threat(b, big) * 0.12 / Math.sqrt(sp.cost);
      if (sp.target === 'all_enemies') v = enemies.reduce((s, a) => s + threat(b, a), 0) * 0.1 / Math.sqrt(sp.cost);
      if (v > bv) { bv = v; best = { spell: id, target: sp.target === 'all_enemies' ? null : big.id }; }
    } else if (sp.kind === 'heal' || sp.kind === 'resurrect') {
      const hurt = allies.filter((a) => a.startCount > a.count || a.hp < a.unit.hp).sort((a, c) => threat(b, c) - threat(b, a))[0];
      if (!hurt) continue;
      const v = (sp.kind === 'resurrect' ? Math.min(sp.heal(h.power) / hurt.unit.hp, hurt.startCount - hurt.count) * hurt.unit.value : hurt.unit.value * 0.5) / Math.sqrt(sp.cost);
      if (v > bv) { bv = v; best = { spell: id, target: hurt.id }; }
    }
  }
  // Only cast when it is worth it relative to the battle
  const total = enemies.reduce((s, e) => s + threat(b, e), 0) + allies.reduce((s, e) => s + threat(b, e), 0);
  if (best && bv > total * 0.004) return best;
  return null;
}
