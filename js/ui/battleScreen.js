// Interactive battle screen: implements the battle io used by the runner.
import { el, wait } from '../core/utils.js';
import { G } from '../game/state.js';
import { BattleRenderer } from '../render/battleRender.js';
import { hexKey, hexDist, neighbors } from '../combat/hex.js';
import { decideAction } from '../combat/battleAI.js';
import { SPELLS } from '../data/spells.js';
import { UNITS, ABILITY_INFO } from '../data/units.js';
import { spellIcon } from '../render/icons.js';
import { portraitImg, unitStatsHtml } from './common.js';
import { figure } from '../render/figures.js';
import { dialog, toast, info } from './dialogs.js';
import { HEROES } from '../data/heroes.js';

export class BattleScreen {
  constructor(app, setup) {
    this.app = app; this.setup = setup;
    this.humanSides = [0, 1].filter((i) => setup[i === 0 ? 'attacker' : 'defender'].owner === 0);
    this.auto = !!window.__autoPlay;
    this.root = document.getElementById('battle');
    this.canvas = this.root.querySelector('canvas');
    this.speed = 1;
  }
  isHuman(side) { return this.humanSides.includes(side) && !this.auto; }

  async begin(b) {
    this.b = b;
    this.app.showScreen('battle');
    this.r = new BattleRenderer(this.canvas, b);
    this.buildUI();
    this.running = true;
    let last = performance.now();
    const loop = (t) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      this.r.draw(dt);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
    this.onResize = () => this.r.resize();
    window.addEventListener('resize', this.onResize);
    await wait(300);
  }

  buildUI() {
    const b = this.b;
    const top = this.root.querySelector('.battle-top');
    top.innerHTML = '';
    const side = (i) => {
      const sd = b.sides[i]; const h = b.heroes[i];
      const box = el('div.battle-side' + (i === 1 ? '.right' : ''));
      if (sd.hero) {
        box.append(portraitImg(sd.hero.defId, 40));
        box.append(el('div.battle-side-info', el('div.name', sd.hero.name), el('div.sub', `⚔${h.attack} 🛡${h.defense} ✨${h.power} 📖${h.knowledge}`), el('div.sub.mana', `Mana ${h.mana}`)));
      } else box.append(el('div.battle-side-info', el('div.name', sd.name)));
      return box;
    };
    top.append(side(0), el('div.battle-mid', el('div.battle-round', 'Runde 1'), el('div.turn-order')), side(1));
    const bar = this.root.querySelector('.battle-bar');
    bar.innerHTML = '';
    this.btns = {
      spell: el('button.btn.icon', { onclick: () => this.openSpellbook() }, '✨ Besværgelse'),
      wait: el('button.btn.icon', { onclick: () => this.resolveAction({ type: 'wait' }) }, '⏳ Vent'),
      defend: el('button.btn.icon', { onclick: () => this.resolveAction({ type: 'defend' }) }, '🛡 Forsvar'),
      auto: el('button.btn.icon', { onclick: () => this.toggleAuto() }, '⚙ Auto'),
      flee: el('button.btn.icon.danger', { onclick: () => this.flee() }, '🏃 Flygt'),
    };
    bar.append(this.btns.spell, this.btns.wait, this.btns.defend, this.btns.auto, this.btns.flee);
    this.info = this.root.querySelector('.battle-info');
    this.bindInput();
    let zb = this.root.querySelector('.battle-zoom');
    if (!zb) { zb = el('button.btn.small.battle-zoom', { title: 'Zoom' }); this.root.append(zb); }
    zb.textContent = '🔍'; zb.onclick = () => this.cycleZoom();
  }
  // Pinch to zoom, drag to pan, mouse wheel on desktop; a plain tap still acts.
  bindInput() {
    const c = this.canvas;
    this.pointers = new Map(); this.drag = null; this.pinch = null;
    c.onpointerdown = (e) => {
      c.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 1) this.drag = { x: e.clientX, y: e.clientY, moved: false };
      else if (this.pointers.size === 2) { const [a, b] = [...this.pointers.values()]; this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; this.drag = null; }
    };
    c.onpointermove = (e) => {
      if (!this.pointers.has(e.pointerId)) { this.r.hover = this.r.hexAt(...this.evPos(e)); return; }
      const prev = this.pointers.get(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 2 && this.pinch) {
        const [a, b] = [...this.pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const rect = c.getBoundingClientRect();
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        this.r.zoomAt(mx - rect.left, my - rect.top, d / Math.max(1, this.pinch.d));
        this.r.panBy(mx - this.pinch.mx, my - this.pinch.my);
        this.pinch = { d, mx, my };
        return;
      }
      if (this.drag) {
        const dx = e.clientX - this.drag.x, dy = e.clientY - this.drag.y;
        if (!this.drag.moved && Math.hypot(dx, dy) > 10) this.drag.moved = true;
        if (this.drag.moved) this.r.panBy(e.clientX - prev.x, e.clientY - prev.y);
        this.r.hover = this.r.hexAt(...this.evPos(e));
      }
    };
    const up = (e) => {
      const wasTap = this.drag && !this.drag.moved && this.pointers.size === 1;
      this.pointers.delete(e.pointerId);
      if (this.pointers.size < 2) this.pinch = null;
      if (this.pointers.size === 0) this.drag = null;
      if (wasTap) this.onTap(e);
    };
    c.onpointerup = up; c.onpointercancel = up;
    c.onwheel = (e) => { e.preventDefault(); const [x, y] = this.evPos(e); this.r.zoomAt(x, y, e.deltaY < 0 ? 1.15 : 1 / 1.15); };
  }
  cycleZoom() {
    const levels = [1, 1.6, 2.2];
    const cur = this.r.view.zoom;
    const next = levels.find((z) => z > cur + 0.05) || 1;
    const st = this.pending ? this.pending.st : this.b.current;
    const [cx, cy] = st && !st.dead ? this.r.center(...this.r.pos(st)) : [this.r.w / 2, this.r.h / 2];
    this.r.setZoom(next, cx, cy);
  }
  evPos(e) { const r = this.canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  updateOrder() {
    const b = this.b;
    const box = this.root.querySelector('.turn-order'); if (!box) return;
    box.innerHTML = '';
    const list = [];
    if (b.current && !b.current.dead) list.push(b.current);
    for (const st of b.queue) if (!st.dead && !list.includes(st)) list.push(st);
    for (const st of b.waitQueue) if (!st.dead && !list.includes(st)) list.push(st);
    for (const st of list.slice(0, 9)) {
      const f = figure(st.unit, 48, st.side === 1);
      box.append(el('div.turn-chip' + (st.side === 0 ? '.a' : '.d') + (st === b.current ? '.now' : ''), el('img', { src: f.toDataURL(), width: 26, height: 26 }), el('span', String(st.count))));
    }
  }
  updateTop() {
    const b = this.b;
    this.root.querySelector('.battle-round').textContent = `Runde ${b.round}`;
    this.updateOrder();
    const manas = this.root.querySelectorAll('.mana');
    [0, 1].forEach((i) => { if (b.sides[i].hero && manas[i]) manas[i].textContent = `Mana ${b.heroes[i].mana}`; });
  }

  async play(events) {
    const b = this.b, r = this.r;
    for (const ev of events) {
      switch (ev.type) {
        case 'round': this.updateTop(); if (ev.n > 1) toast(`Runde ${ev.n}`, 900); break;
        case 'move': { const st = b.getStack(ev.id); this.updateOrder(); await r.animateMove(st, ev.path, ev.flying); break; }
        case 'melee': {
          const a = b.getStack(ev.id), d = b.getStack(ev.target);
          await r.animateAttack(a, d);
          r.floater(d, `-${ev.dmg}` + (ev.luck === true ? ' ✦' : ''), ev.luck === true ? '#ffe066' : '#ff8a6a');
          if (ev.kills) r.floater(d, `${ev.kills} faldt`, '#ff5a46');
          await wait(450 / this.speed);
          break;
        }
        case 'shoot': {
          const a = b.getStack(ev.id), d = b.getStack(ev.target);
          await r.animateShot(a, d);
          r.floater(d, `-${ev.dmg}` + (ev.luck === true ? ' ✦' : ''), ev.luck === true ? '#ffe066' : '#ff8a6a');
          if (ev.kills) r.floater(d, `${ev.kills} faldt`, '#ff5a46');
          await wait(450 / this.speed);
          break;
        }
        case 'death': { await r.animateDeath(b.getStack(ev.id)); break; }
        case 'spell': {
          const sp = SPELLS[ev.spell];
          toast(`${b.sides[ev.side].name} kaster ${sp.name}`, 1200);
          await r.animateSpell(ev.spell, ev.targets.map((t) => t.id));
          for (const t of ev.targets) {
            const st = b.getStack(t.id);
            if (t.dmg) r.floater(st, `-${t.dmg}`, '#c0a0ff');
            if (t.kills) r.floater(st, `${t.kills} faldt`, '#ff5a46');
            if (t.healed) r.floater(st, `+${t.healed}`, '#8fe0a0');
            if (t.resurrected) r.floater(st, `+${t.resurrected} genoplivet`, '#8fe0a0');
          }
          this.updateTop();
          await wait(500 / this.speed);
          break;
        }
        case 'morale': { const st = b.getStack(ev.id); r.floater(st, ev.good ? 'Høj moral!' : 'Lav moral…', ev.good ? '#ffe066' : '#9aa0a6'); await wait(600 / this.speed); break; }
        case 'wait': case 'defend': { const st = b.getStack(ev.id); r.floater(st, ev.type === 'wait' ? 'venter' : 'forsvarer', '#cfd8e3'); await wait(320); break; }
        case 'regen': { const st = b.getStack(ev.id); r.floater(st, `+${ev.amount}`, '#8fe0a0'); break; }
        case 'flee': toast('Helten flygter fra slagmarken!', 1500); break;
        case 'end': break;
      }
    }
  }

  playerAction(b, st) {
    return new Promise((resolve) => {
      this.pending = { st, resolve };
      this.updateOrder();
      this.r.activeId = st.id;
      this.r.highlight = b.reachable(st);
      this.reach = this.r.highlight;
      const canShoot = b.canShoot(st);
      const targets = new Set();
      for (const e of b.alive(1 - st.side)) {
        if (canShoot || b.attackPositions(st, e, this.reach).length) targets.add(e.id);
      }
      this.r.targetable = targets;
      this.btns.wait.disabled = st.waited;
      this.btns.spell.disabled = !b.heroes[st.side].hero || b.heroes[st.side].spellCast;
      this.setInfo(st, canShoot);
      this.castMode = null;
    });
  }
  setInfo(st, canShoot) {
    const u = st.unit;
    this.info.innerHTML = `<b>${u.plural}</b> ×${st.count} · ⚔${this.b.attackOf(st)} 🛡${this.b.defenseOf(st)} ➶${this.b.speed(st)}${u.shots ? ` 🏹${st.shots}` : ''}${canShoot ? ' · <i>kan skyde</i>' : ''}`;
  }
  resolveAction(act) {
    if (!this.pending) return;
    const { resolve } = this.pending;
    this.pending = null;
    this.r.highlight = null; this.r.targetable = null; this.r.activeId = null;
    this.info.innerHTML = '';
    resolve(act);
  }
  onTap(e) {
    if (!this.pending) {
      const hx = this.r.hexAt(...this.evPos(e));
      if (hx) { const st = this.b.stackAt(hx[0], hx[1]); if (st) this.showStackInfo(st); }
      return;
    }
    const b = this.b, st = this.pending.st;
    const hx = this.r.hexAt(...this.evPos(e));
    if (!hx) return;
    const target = b.stackAt(hx[0], hx[1]);
    if (this.castMode) {
      const sp = SPELLS[this.castMode];
      if (!target) { toast('Vælg en flok som mål'); return; }
      const ok = b.castSpell(st.side, this.castMode, target.id);
      this.castMode = null;
      if (!ok) { toast('Ugyldigt mål'); return; }
      this.play(b.takeEvents()).then(() => { if (b.finished) this.resolveAction({ type: 'defend' }); else { this.btns.spell.disabled = true; } });
      return;
    }
    if (target && target.side !== st.side) {
      if (b.canShoot(st)) { this.resolveAction({ type: 'shoot', target: target.id }); return; }
      const pos = b.attackPositions(st, target, this.reach);
      if (!pos.length) { this.showStackInfo(target); return; }
      // choose the attack position closest to the tap point among the nearest by path
      const [px, py] = this.r.toWorld(...this.evPos(e));
      const minDist = pos[0].dist;
      const cands = pos.filter((p) => p.dist <= minDist + 1);
      cands.sort((a, c) => { const [ax, ay] = this.r.center(a.x, a.y); const [cx, cy] = this.r.center(c.x, c.y); return Math.hypot(ax - px, ay - py) - Math.hypot(cx - px, cy - py); });
      const p = cands[0];
      this.resolveAction({ type: 'attack', target: target.id, x: p.x, y: p.y });
      return;
    }
    if (target && target.side === st.side) { this.showStackInfo(target); return; }
    const k = hexKey(hx[0], hx[1]);
    if (this.reach.has(k)) { this.resolveAction({ type: 'move', x: hx[0], y: hx[1] }); return; }
  }
  showStackInfo(st) {
    const u = st.unit;
    const body = el('div', { html: unitStatsHtml(u) });
    const buffs = st.buffs.map((bf) => (SPELLS[bf.id] ? SPELLS[bf.id].name : 'Gift') + ` (${bf.rounds - 1} runder)`).join(', ');
    dialog({ title: `${u.plural} ×${st.count}`, body: el('div', el('div.dialog-text', `Angreb ${this.b.attackOf(st)} · Forsvar ${this.b.defenseOf(st)} · Hastighed ${this.b.speed(st)} · Liv ${st.hp}/${u.hp}` + (buffs ? `\nEffekter: ${buffs}` : '')), body) });
  }
  openSpellbook() {
    if (!this.pending) return;
    const b = this.b, st = this.pending.st, h = b.heroes[st.side];
    if (!h.hero) return;
    const list = el('div.spell-list');
    const spells = [...new Set(h.spells)].sort((a, c) => SPELLS[a].level - SPELLS[c].level);
    if (!spells.length) list.append(el('div.dialog-text', 'Helten kender ingen besværgelser.'));
    let closeFn = null;
    for (const id of spells) {
      const sp = SPELLS[id];
      const can = b.canCast(st.side, id);
      const card = el('div.spell-card' + (can ? '' : '.disabled'), { onclick: () => { if (!can) return; closeFn('cast:' + id); } },
        el('img', { src: spellIcon(id, 48).toDataURL(), width: 40, height: 40 }),
        el('div.spell-text', el('div.name', `${sp.name} (${sp.cost} mana)`), el('div.sub', sp.desc)));
      list.append(card);
    }
    const handle = (v) => {
      if (!v || !String(v).startsWith('cast:')) return;
      const id = v.slice(5); const sp = SPELLS[id];
      if (sp.target === 'all_enemies' || sp.target === 'all_allies') {
        b.castSpell(st.side, id, null);
        this.play(b.takeEvents()).then(() => { if (b.finished) this.resolveAction({ type: 'defend' }); else this.btns.spell.disabled = true; });
      } else {
        this.castMode = id;
        toast(`Vælg et mål for ${sp.name}`, 2000);
      }
    };
    dialog({ title: `Besværgelser – ${h.hero.name} (${h.mana} mana)`, body: list, buttons: [{ label: 'Luk', value: null }], init: (close) => { closeFn = close; } }).then(handle);
  }
  toggleAuto() {
    this.auto = true;
    this.btns.auto.disabled = true;
    toast('Automatisk kamp slået til', 1200);
    if (this.pending) {
      const act = decideAction(this.b, this.pending.st);
      this.resolveAction(act);
    }
  }
  async flee() {
    if (!this.pending) return;
    const st = this.pending.st;
    if (this.b.siegeLevel && st.side === 1) { toast('Man kan ikke flygte fra sin egen by'); return; }
    const ok = await dialog({ title: 'Flygt?', body: 'Helten flygter og mister hele hæren, men kan hyres igen i en taverne.', buttons: [{ label: 'Flygt', value: true, danger: true }, { label: 'Bliv og kæmp', value: false, primary: true }] });
    if (ok && this.pending) this.resolveAction({ type: 'flee' });
  }
  async end(b, res) {
    await wait(400);
  }
  close() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
  }
}
