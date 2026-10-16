import { UNITS, hasAbility } from '../data/units.js';
import { SPELLS } from '../data/spells.js';
import { HEROES } from '../data/heroes.js';
import { heroStat, heroMorale, heroLuck } from '../game/hero.js';
import { skillVal } from '../data/skills.js';
import { BF_W, BF_H, hexKey, neighbors, hexDist, inField } from './hex.js';
import { clamp } from '../core/utils.js';

const ROW_TEMPLATES = {
  1: [4], 2: [2, 6], 3: [1, 4, 7], 4: [1, 3, 5, 7], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8], 7: [0, 1, 3, 4, 5, 7, 8],
};

export class Battle {
  /**
   * sides: [{hero, army, owner, name}, {hero, army, owner, name, town}]
   */
  constructor({ attacker, defender, rng, siegeLevel = 0, terrain = 1, defBonus = 0, defMorale = 0 }) {
    this.rng = rng;
    this.sides = [attacker, defender];
    this.siegeLevel = siegeLevel;
    this.terrain = terrain;
    this.round = 0;
    this.stacks = [];
    this.obstacles = new Map(); // key -> 'rock'|'tree'|'wall'
    this.events = [];
    this.finished = false;
    this.winner = null;
    this.fled = null;
    this.queue = [];
    this.waitQueue = [];
    this.current = null;
    this.extraTurn = null;
    this.heroes = [this.heroInfo(attacker, 0, 0, 0), this.heroInfo(defender, 1, defBonus, defMorale)];
    this.setupStacks();
    this.setupObstacles();
  }

  heroInfo(side, idx, defBonus, moraleBonus) {
    const h = side.hero;
    if (!h) return { hero: null, attack: 0, defense: defBonus, power: 0, knowledge: 0, mana: 0, morale: moraleBonus, luck: 0, spellCast: false, spec: null, level: 0, skills: {} };
    const def = HEROES[h.defId];
    return {
      hero: h, attack: heroStat(h, 'attack'), defense: heroStat(h, 'defense') + defBonus,
      power: heroStat(h, 'power') + (def.spec.type === 'stat' ? Math.floor(h.level / 4) : 0),
      knowledge: heroStat(h, 'knowledge'), mana: h.mana,
      morale: heroMorale(h, moraleBonus), luck: heroLuck(h), spellCast: false,
      spec: def.spec, level: h.level, skills: h.skills, spells: h.spells,
    };
  }

  skill(side, id) { return skillVal({ skills: this.heroes[side].skills }, id) * (this.heroes[side].spec && this.heroes[side].spec.type === 'skill' && this.heroes[side].spec.id === id ? 2 : 1); }

  setupStacks() {
    let id = 1;
    for (let side = 0; side < 2; side++) {
      const army = this.sides[side].army;
      const slots = [];
      for (let i = 0; i < 7; i++) if (army[i] && army[i].count > 0) slots.push(i);
      const rows = ROW_TEMPLATES[Math.max(1, Math.min(7, slots.length))];
      slots.forEach((slot, k) => {
        const st = army[slot];
        const unit = UNITS[st.unit];
        const x = side === 0 ? 0 : BF_W - 1;
        this.stacks.push({
          id: id++, side, slot, unitId: st.unit, unit, count: st.count, startCount: st.count, hp: unit.hp,
          x, y: rows[k], buffs: [], shots: unit.shots, defending: false, waited: false, acted: false,
          retaliated: false, dead: false, killed: 0,
        });
      });
    }
  }

  setupObstacles() {
    const r = this.rng;
    const n = r.int(2, 5);
    for (let k = 0; k < n; k++) {
      const x = r.int(3, BF_W - 4), y = r.int(0, BF_H - 1);
      if (this.siegeLevel && x >= 8) continue;
      const kind = r.pick(this.terrain === 6 || this.terrain === 3 ? ['rock', 'rock', 'dead'] : this.terrain === 5 ? ['rock', 'snowpine'] : ['tree', 'rock', 'tree']);
      this.obstacles.set(hexKey(x, y), kind);
      if (r.chance(0.4)) {
        const nb = neighbors(x, y).filter(([a]) => a >= 3 && a <= BF_W - 4);
        if (nb.length) { const [a, b] = r.pick(nb); this.obstacles.set(hexKey(a, b), kind); }
      }
    }
    if (this.siegeLevel) {
      const wx = BF_W - 4;
      for (let y = 0; y < BF_H; y++) {
        if (y === 4 || y === 1 || y === 7) continue; // gate + two breaches
        this.obstacles.set(hexKey(wx, y), 'wall');
      }
    }
  }

  // ---------- Queries ----------
  stackAt(x, y) { return this.stacks.find((s) => !s.dead && s.x === x && s.y === y) || null; }
  alive(side) { return this.stacks.filter((s) => !s.dead && s.side === side); }
  getStack(id) { return this.stacks.find((s) => s.id === id); }
  buffVal(st, key) { let v = 0; for (const b of st.buffs) if (b.effect[key]) v += b.effect[key]; return v; }
  dmgMode(st) { for (const b of st.buffs) if (b.effect.dmgMode) return b.effect.dmgMode; return null; }
  speed(st) {
    let sp = st.unit.speed + this.buffVal(st, 'speed');
    const h = this.heroes[st.side];
    if (h.spec && h.spec.type === 'unit' && h.spec.id === st.unitId) sp += 1;
    return Math.max(1, sp);
  }
  attackOf(st) {
    const h = this.heroes[st.side];
    let a = st.unit.attack + h.attack + this.buffVal(st, 'attack');
    if (h.spec && h.spec.type === 'unit' && h.spec.id === st.unitId) a += Math.floor(h.level / 3);
    return Math.max(0, a);
  }
  defenseOf(st) {
    const h = this.heroes[st.side];
    let d = st.unit.defense + h.defense + this.buffVal(st, 'defense');
    if (h.spec && h.spec.type === 'unit' && h.spec.id === st.unitId) d += Math.floor(h.level / 3);
    if (st.defending) d += Math.round(st.unit.defense * (hasAbility(st.unit, 'bulwark') ? 0.5 : 0.2));
    return Math.max(0, d);
  }
  isRanged(st) { return hasAbility(st.unit, 'ranged') && st.shots > 0; }
  isFlying(st) { return hasAbility(st.unit, 'flying'); }
  enemyAdjacent(st) {
    return neighbors(st.x, st.y).some(([x, y]) => { const o = this.stackAt(x, y); return o && o.side !== st.side; });
  }
  canShoot(st) { return this.isRanged(st) && !this.enemyAdjacent(st); }

  /** BFS reachability: returns Map key -> {x,y,dist,path} */
  reachable(st) {
    const res = new Map();
    const sp = this.speed(st);
    const fly = this.isFlying(st);
    const start = hexKey(st.x, st.y);
    const dist = new Map([[start, 0]]);
    const prev = new Map();
    const q = [[st.x, st.y]];
    while (q.length) {
      const [x, y] = q.shift();
      const d = dist.get(hexKey(x, y));
      if (d >= sp) continue;
      for (const [nx, ny] of neighbors(x, y)) {
        const k = hexKey(nx, ny);
        if (dist.has(k)) continue;
        const occ = this.stackAt(nx, ny);
        const obs = this.obstacles.has(k);
        if (!fly && (occ || obs)) continue; // walkers can't pass through units or obstacles
        dist.set(k, d + 1);
        prev.set(k, hexKey(x, y));
        q.push([nx, ny]);
      }
    }
    for (const [k, d] of dist) {
      if (k === start) continue;
      const x = k % 64, y = Math.floor(k / 64);
      if (this.stackAt(x, y) || this.obstacles.has(k)) continue; // can't end here
      const path = [];
      let c = k;
      while (c !== start) { path.push([c % 64, Math.floor(c / 64)]); c = prev.get(c); }
      path.reverse();
      res.set(k, { x, y, dist: d, path });
    }
    return res;
  }

  /** Hexes from which `st` could melee `target`: adjacent to target and reachable (or current). */
  attackPositions(st, target, reach) {
    const out = [];
    for (const [x, y] of neighbors(target.x, target.y)) {
      const k = hexKey(x, y);
      if (x === st.x && y === st.y) out.push({ x, y, dist: 0, path: [] });
      else if (reach.has(k)) out.push(reach.get(k));
    }
    return out.sort((a, b) => a.dist - b.dist);
  }

  // ---------- Turn flow ----------
  start() {
    this.newRound();
  }
  newRound() {
    this.round++;
    this.events.push({ type: 'round', n: this.round });
    for (const st of this.stacks) {
      if (st.dead) continue;
      st.acted = false; st.waited = false; st.retaliated = false;
      if (st.defending && !st.waited) st.defending = false;
      st.buffs = st.buffs.filter((b) => --b.rounds > 0);
      if (hasAbility(st.unit, 'regenerate') && st.hp < st.unit.hp) {
        this.events.push({ type: 'regen', id: st.id, amount: st.unit.hp - st.hp });
        st.hp = st.unit.hp;
      }
    }
    for (const h of this.heroes) h.spellCast = false;
    this.queue = this.alive(0).concat(this.alive(1)).sort((a, b) => this.speed(b) - this.speed(a) || a.side - b.side || a.slot - b.slot);
    this.waitQueue = [];
    this.current = null;
  }
  /** Returns the stack whose turn it is (handles morale). May end the battle. */
  nextTurn() {
    if (this.finished) return null;
    for (;;) {
      if (this.extraTurn) { this.current = this.extraTurn; this.extraTurn = null; return this.current; }
      let st = this.queue.shift();
      if (!st) st = this.waitQueue.shift();
      if (!st) { this.newRound(); if (this.finished) return null; continue; }
      if (st.dead) continue;
      // Bad morale check
      const morale = this.moraleOf(st);
      if (morale < 0 && !hasAbility(st.unit, 'undead') && !hasAbility(st.unit, 'steadfast') && this.rng.chance(-morale / 12)) {
        this.events.push({ type: 'morale', id: st.id, good: false });
        st.acted = true;
        continue;
      }
      this.current = st;
      return st;
    }
  }
  moraleOf(st) {
    if (hasAbility(st.unit, 'undead')) return 0;
    let m = this.heroes[st.side].morale;
    // Units of foreign faction in a hero army
    return clamp(m, -3, 3);
  }
  luckOf(st) { return this.heroes[st.side].luck; }

  endAction(st) {
    st.acted = true;
    this.checkEnd();
    if (this.finished) return;
    const morale = this.moraleOf(st);
    if (morale > 0 && !st.hadMorale && this.rng.chance(morale / 24)) {
      st.hadMorale = true;
      this.events.push({ type: 'morale', id: st.id, good: true });
      this.extraTurn = st;
    } else st.hadMorale = false;
  }
  checkEnd() {
    const a = this.alive(0).length, d = this.alive(1).length;
    if (a === 0 || d === 0) {
      this.finished = true;
      this.winner = a === 0 ? 1 : 0;
      this.events.push({ type: 'end', winner: this.winner });
    }
  }

  // ---------- Damage ----------
  computeDamage(att, def, { ranged = false, chargeDist = 0, retaliation = false } = {}) {
    const r = this.rng;
    const mode = this.dmgMode(att);
    let total = 0;
    const n = Math.min(att.count, 10);
    for (let i = 0; i < n; i++) {
      total += mode === 'max' ? att.unit.dmg[1] : mode === 'min' ? att.unit.dmg[0] : r.int(att.unit.dmg[0], att.unit.dmg[1]);
    }
    total = total * att.count / n;
    const A = this.attackOf(att), Dd = this.defenseOf(def);
    let mult = A >= Dd ? 1 + 0.05 * Math.min(A - Dd, 60) : 1 - 0.025 * Math.min(Dd - A, 28);
    const sideA = att.side;
    if (ranged) mult *= 1 + this.skill(sideA, 'archery');
    else mult *= 1 + this.skill(sideA, 'offense');
    mult *= 1 - this.skill(def.side, 'armorer');
    if (ranged) {
      if (hexDist(att.x, att.y, def.x, def.y) > 7) mult *= 0.5;
      if (hasAbility(def.unit, 'bark')) mult *= 0.75;
      mult *= 1 - this.buffVal(def, 'rangedReduce');
      if (this.siegeLevel && def.side === 1 && def.x >= BF_W - 4 && !this.isFlying(att)) mult *= 0.7;
    } else {
      mult *= 1 - this.buffVal(def, 'meleeReduce');
      if (hasAbility(att.unit, 'ranged')) mult *= 0.5; // shooters in melee
      if (hasAbility(att.unit, 'charge')) mult *= 1 + Math.min(0.5, chargeDist * 0.1);
      if (retaliation && hasAbility(def.unit, 'crush')) mult *= 0.5;
    }
    let luck = false;
    if (!retaliation) {
      const l = this.luckOf(att);
      if (l > 0 && r.chance(l / 24)) { luck = true; mult *= 2; }
      else if (l < 0 && r.chance(-l / 24)) { luck = -1; mult *= 0.5; }
    }
    return { dmg: Math.max(1, Math.floor(total * mult)), luck };
  }

  applyDamage(target, dmg) {
    let kills = 0;
    if (dmg >= target.hp) {
      dmg -= target.hp; kills = 1;
      kills += Math.floor(dmg / target.unit.hp);
      if (kills >= target.count) { kills = target.count; target.count = 0; target.hp = 0; target.dead = true; }
      else { target.count -= kills; target.hp = target.unit.hp - (dmg % target.unit.hp); }
    } else target.hp -= dmg;
    target.killed += kills;
    return kills;
  }

  // ---------- Actions ----------
  actMove(st, x, y) {
    const reach = this.reachable(st);
    const r = reach.get(hexKey(x, y));
    if (!r) return false;
    this.events.push({ type: 'move', id: st.id, from: [st.x, st.y], path: r.path, flying: this.isFlying(st) });
    st.x = x; st.y = y;
    st.movedDist = r.dist;
    this.endAction(st);
    return true;
  }

  actAttack(st, targetId, viaX, viaY) {
    const target = this.getStack(targetId);
    if (!target || target.dead || target.side === st.side) return false;
    const reach = this.reachable(st);
    let dist = 0;
    if (viaX === undefined || (viaX === st.x && viaY === st.y)) {
      if (hexDist(st.x, st.y, target.x, target.y) !== 1) {
        const pos = this.attackPositions(st, target, reach);
        if (!pos.length) return false;
        viaX = pos[0].x; viaY = pos[0].y;
      } else { viaX = st.x; viaY = st.y; }
    }
    if (viaX !== st.x || viaY !== st.y) {
      const r = reach.get(hexKey(viaX, viaY));
      if (!r || hexDist(viaX, viaY, target.x, target.y) !== 1) return false;
      this.events.push({ type: 'move', id: st.id, from: [st.x, st.y], path: r.path, flying: this.isFlying(st) });
      st.x = viaX; st.y = viaY; dist = r.dist;
    }
    this.melee(st, target, dist, false);
    // Breath attack hits the hex behind the target
    if (hasAbility(st.unit, 'breath') && !target.dead) {
      const bx = target.x + (target.x - st.x), by = target.y + (target.y - st.y);
      const behind = inField(bx, by) ? this.stackAt(bx, by) : null;
      if (behind && behind.side !== st.side) this.melee(st, behind, 0, false, true);
    }
    if (!target.dead && !st.dead && !target.retaliated && !hasAbility(st.unit, 'no_retaliation')) {
      target.retaliated = true;
      this.melee(target, st, 0, true);
    }
    this.endAction(st);
    return true;
  }

  melee(att, def, dist, retaliation, isBreath = false) {
    const { dmg, luck } = this.computeDamage(att, def, { chargeDist: dist, retaliation });
    const kills = this.applyDamage(def, dmg);
    this.events.push({ type: 'melee', id: att.id, target: def.id, dmg, kills, luck, retaliation, breath: isBreath });
    if (hasAbility(att.unit, 'poison') && !def.dead) this.addBuff(def, 'poison', { defense: -2 }, 3);
    if (def.dead) this.events.push({ type: 'death', id: def.id });
  }

  actShoot(st, targetId) {
    const target = this.getStack(targetId);
    if (!target || target.dead || target.side === st.side || !this.canShoot(st)) return false;
    st.shots--;
    const { dmg, luck } = this.computeDamage(st, target, { ranged: true });
    const kills = this.applyDamage(target, dmg);
    this.events.push({ type: 'shoot', id: st.id, target: target.id, dmg, kills, luck, far: hexDist(st.x, st.y, target.x, target.y) > 7 });
    if (target.dead) this.events.push({ type: 'death', id: target.id });
    this.endAction(st);
    return true;
  }

  actWait(st) {
    if (st.waited) return false;
    st.waited = true;
    this.waitQueue.unshift(st);
    this.waitQueue.sort((a, b) => this.speed(a) - this.speed(b));
    this.events.push({ type: 'wait', id: st.id });
    this.current = null;
    return true;
  }

  actDefend(st) {
    st.defending = true;
    this.events.push({ type: 'defend', id: st.id });
    this.endAction(st);
    return true;
  }

  addBuff(st, id, effect, rounds) {
    st.buffs = st.buffs.filter((b) => b.id !== id);
    st.buffs.push({ id, effect, rounds: rounds + 1 });
  }

  canCast(side, spellId) {
    const h = this.heroes[side];
    if (!h.hero || h.spellCast) return false;
    const sp = SPELLS[spellId];
    if (!sp || !h.spells.includes(spellId)) return false;
    return h.mana >= sp.cost;
  }

  /** Cast a spell. target: stack id (for single-target) or null for mass spells. */
  castSpell(side, spellId, targetId = null) {
    if (!this.canCast(side, spellId)) return false;
    const sp = SPELLS[spellId];
    const h = this.heroes[side];
    const p = h.power;
    const sorcery = 1 + this.skill(side, 'sorcery') + (h.spec && h.spec.type === 'stat' ? Math.floor(h.level / 4) * 0.05 : 0);
    let targets = [];
    const enemies = this.alive(1 - side), allies = this.alive(side);
    if (sp.target === 'all_enemies') targets = enemies;
    else if (sp.target === 'all_allies') targets = allies;
    else {
      const t = this.getStack(targetId);
      if (!t || t.dead) return false;
      if (sp.target === 'enemy' && t.side === side) return false;
      if (sp.target === 'ally' && t.side !== side) return false;
      targets = [t];
      if (sp.area) {
        for (const [x, y] of neighbors(t.x, t.y)) { const o = this.stackAt(x, y); if (o && !targets.includes(o)) targets.push(o); }
      }
      if (sp.chain) {
        const others = this.stacks.filter((s) => !s.dead && s !== t).sort((a, b) => hexDist(a.x, a.y, t.x, t.y) - hexDist(b.x, b.y, t.x, t.y));
        targets.push(...others.slice(0, sp.chain));
      }
    }
    h.mana -= sp.cost; h.spellCast = true;
    const ev = { type: 'spell', spell: spellId, side, targets: [], primary: targetId };
    targets.forEach((t, i) => {
      const te = { id: t.id, dmg: 0, kills: 0, healed: 0, resurrected: 0 };
      if (sp.kind === 'damage') {
        let d = Math.round(sp.dmg(p) * sorcery);
        if (sp.chain && i > 0) d = Math.round(d / Math.pow(2, i));
        if (sp.area && i > 0) d = Math.round(d * 0.5);
        te.dmg = d; te.kills = this.applyDamage(t, d);
      } else if (sp.kind === 'buff' || sp.kind === 'debuff') {
        this.addBuff(t, spellId, sp.effect, sp.duration(p));
        if (sp.effect.speed && sp.effect.speed < 0) { /* min speed 1 handled in speed() */ }
      } else if (sp.kind === 'heal') {
        const amount = Math.round(sp.heal(p) * sorcery);
        const before = t.hp;
        t.hp = Math.min(t.unit.hp, t.hp + amount);
        te.healed = t.hp - before;
        if (sp.cleanse) t.buffs = t.buffs.filter((b) => !(SPELLS[b.id] && SPELLS[b.id].kind === 'debuff') && b.id !== 'poison');
      } else if (sp.kind === 'resurrect') {
        let pool = Math.round(sp.heal(p) * sorcery);
        const maxCount = t.startCount;
        const missingTop = t.unit.hp - t.hp;
        const heal = Math.min(pool, missingTop); t.hp += heal; pool -= heal; te.healed = heal;
        while (pool >= t.unit.hp && t.count < maxCount) { t.count++; pool -= t.unit.hp; te.resurrected++; }
      }
      ev.targets.push(te);
    });
    this.events.push(ev);
    for (const t of targets) if (t.dead) this.events.push({ type: 'death', id: t.id });
    this.checkEnd();
    return true;
  }

  flee(side) {
    this.finished = true;
    this.winner = 1 - side;
    this.fled = side;
    this.events.push({ type: 'flee', side });
  }

  takeEvents() { const e = this.events; this.events = []; return e; }

  /** Summary used after the battle. */
  result() {
    const casualties = [{}, {}];
    const killedHp = [0, 0];
    for (const st of this.stacks) {
      const lost = st.startCount - st.count;
      if (lost > 0) casualties[st.side][st.unitId] = (casualties[st.side][st.unitId] || 0) + lost;
      killedHp[1 - st.side] += lost * st.unit.hp;
    }
    return { winner: this.winner, fled: this.fled, casualties, exp: killedHp, rounds: this.round };
  }
}
