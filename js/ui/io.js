// Routes game-logic callbacks to the UI for the human player and to automatic
// choices for the AI.
import { G, human } from '../game/state.js';
import { recruitExternal } from '../game/actions.js';
import { SKILLS, SKILL_LEVELS, SKILL_WEIGHTS } from '../data/skills.js';
import { UNITS } from '../data/units.js';
import { RES_INFO } from '../data/resources.js';
import { ARTIFACTS, bonusStr } from '../data/artifacts.js';
import { SPELLS } from '../data/spells.js';
import { STAT_NAMES } from '../data/heroes.js';
import { el, wait } from '../core/utils.js';
import { dialog, info, choose, toast, numberPicker } from './dialogs.js';
import { BattleScreen } from './battleScreen.js';
import { silentIO } from '../combat/runner.js';
import { skillIcon, artifactIcon, spellIcon } from '../render/icons.js';
import { unitCard, costRow, portraitImg } from './common.js';
import { isRevealed } from '../game/fog.js';
import { RES } from '../data/resources.js';
import { tradeRate } from '../game/town.js';
import { resIcon } from './common.js';
import { OBJ } from '../data/objects.js';

export class GameIO {
  constructor(app) { this.app = app; }
  // When window.__autoPlay is set (soak testing / demo mode) the human side is driven automatically.
  isHuman(hero) { return hero && !G.s.players[hero.owner].isAI && !window.__autoPlay; }
  visible(x, y) { return isRevealed(G.s, human(), x, y); }

  async msg(hero, title, text, extra = {}) {
    if (!this.isHuman(hero)) return;
    let icon = null;
    if (extra.artifact) icon = el('img', { src: artifactIcon(extra.artifact, 64).toDataURL(), width: 56, height: 56 });
    if (extra.spell) icon = el('img', { src: spellIcon(extra.spell, 64).toDataURL(), width: 56, height: 56 });
    if (extra.skill) icon = el('img', { src: skillIcon(extra.skill, 64).toDataURL(), width: 56, height: 56 });
    await info(title, text, icon);
    this.app.hud.refresh();
  }
  async pickup(hero, text, res) {
    if (!this.isHuman(hero)) return;
    toast(`+ ${text}`, 1800, 'good');
    this.app.hud.refresh();
    await wait(150);
  }
  async choice(hero, title, text, options, aiPick) {
    if (!this.isHuman(hero)) return aiPick();
    return await choose(title, text, options);
  }
  async recruitDialog(hero, o) {
    const u = UNITS[o.unit];
    if (!this.isHuman(hero)) { recruitExternal(hero, o, o.available); return; }
    const p = G.s.players[hero.owner];
    let max = o.available;
    for (const r of Object.keys(u.cost)) max = Math.min(max, Math.floor((p.resources[r] || 0) / u.cost[r]));
    if (max <= 0) { await info(`${u.plural}s bolig`, `${o.available} ${u.plural} vil slutte sig til dig, men du har ikke råd (${Object.entries(u.cost).map(([r, c]) => `${c} ${RES_INFO[r].name}`).join(', ')} pr. stk).`); return; }
    const n = await numberPicker({ title: `Hyr ${u.plural}`, body: `${o.available} ${u.plural} tilbyder deres tjeneste.<br>${u.lore}`, max, costFn: (k) => `Pris: ${Object.entries(u.cost).map(([r, c]) => `${c * k} ${RES_INFO[r].name}`).join(', ')}` });
    if (n > 0) {
      const got = recruitExternal(hero, o, n);
      if (got > 0) toast(`${got} ${u.plural} sluttede sig til ${hero.name}`, 2000, 'good');
      else toast('Ingen plads i hæren');
    }
    this.app.hud.refresh();
  }
  async teleport(hero) {
    if (!this.isHuman(hero)) return;
    this.app.renderer.centerOn(hero.x, hero.y);
    this.app.renderer.invalidateFog();
    await wait(250);
  }
  /** Travelling merchant: trade resources at the rate of (own markets + 1). */
  async trade(hero) {
    if (!this.isHuman(hero)) return;
    const p = G.s.players[hero.owner];
    const nMarkets = Math.max(2, p.towns.map((id) => G.s.map.objects[id]).filter((t) => t && t.buildings.market).length + 1);
    let from = 'wood', to = 'gold';
    const box = el('div.market');
    let closeFn = null;
    const draw = () => {
      box.innerHTML = '';
      const sel = (cur, cb) => { const r = el('div.res-select'); for (const k of RES) r.append(el('button.btn.small' + (k === cur ? '.primary' : ''), { onclick: () => cb(k) }, resIcon(k, 16), ` ${p.resources[k]}`)); return r; };
      box.append(el('div', 'Giv:'), sel(from, (k) => { from = k; if (to === k) to = k === 'gold' ? 'wood' : 'gold'; draw(); }));
      box.append(el('div', 'Få:'), sel(to, (k) => { to = k; if (from === k) from = k === 'gold' ? 'wood' : 'gold'; draw(); }));
      const r = tradeRate(from, to, nMarkets);
      const maxTrades = Math.floor(p.resources[from] / r);
      box.append(el('div.notice.small', `Købmandens kurs: ${r} ${RES_INFO[from].name} → 1 ${RES_INFO[to].name}`));
      box.append(el('button.btn.primary', { disabled: maxTrades <= 0, onclick: async () => {
        const n = await numberPicker({ title: 'Handel', body: `Hvor mange ${RES_INFO[to].name} vil du købe?`, max: maxTrades, okLabel: 'Byt', costFn: (k) => `Koster ${k * r} ${RES_INFO[from].name}` });
        if (n > 0) { p.resources[from] -= n * r; p.resources[to] += n; toast(`Byttede ${n * r} ${RES_INFO[from].name} til ${n} ${RES_INFO[to].name}`, 1800, 'good'); }
        draw();
      } }, 'Byt'));
    };
    draw();
    await dialog({ title: 'Handelsplads', body: el('div', el('div.dialog-text', 'En omrejsende købmand slår sin bod op og tilbyder at bytte varer.'), box), buttons: [{ label: 'Farvel', value: null }], init: (c) => { closeFn = c; } });
    this.app.hud.refresh();
  }
  async enterTown(hero, town) {
    if (!this.isHuman(hero)) return;
    await this.app.openTown(town);
    this.app.hud.refresh();
  }
  async levelUp(hero, lvl, roll) {
    if (!this.isHuman(hero)) {
      const w = SKILL_WEIGHTS[hero.cls];
      return roll.choices.slice().sort((a, b) => (w[b] + (hero.skills[b] ? 3 : 0)) - (w[a] + (hero.skills[a] ? 3 : 0)))[0];
    }
    const body = el('div.levelup');
    body.append(el('div.dialog-text', `${hero.name} når niveau ${lvl}!\n+1 ${STAT_NAMES[roll.stat]}.\n\nVælg en færdighed:`));
    const row = el('div.choice-row');
    let close = null;
    for (const id of roll.choices) {
      const next = (hero.skills[id] || 0) + 1;
      row.append(el('div.choice-card', { onclick: () => close(id) },
        el('img', { src: skillIcon(id, 64).toDataURL(), width: 48, height: 48 }),
        el('div.name', `${SKILLS[id].name}`), el('div.sub', SKILL_LEVELS[next]), el('div.sub.small', SKILLS[id].desc(SKILLS[id].vals[next]))));
    }
    body.append(row);
    const v = await dialog({ title: 'Nyt niveau!', body, buttons: [], closable: false, init: (c) => { close = c; } });
    this.app.hud.refresh();
    return v;
  }
  battleIO(setup) {
    const humanInvolved = setup.attacker.owner === 0 || setup.defender.owner === 0;
    if (!humanInvolved) return silentIO;
    // Hide the "AI is thinking" overlay while the player fights
    this.savedOverlay = this.app.overlayText || null;
    this.app.setOverlay(null);
    this.currentBattle = new BattleScreen(this.app, setup);
    return this.currentBattle;
  }
  restoreOverlay() {
    if (this.savedOverlay && G.s.current !== 0) this.app.setOverlay(this.savedOverlay);
    this.savedOverlay = null;
  }
  async battleResult(hero, enemy, res, battle, attackerWon) {
    const humanInvolved = battle.sides[0].owner === 0 || battle.sides[1].owner === 0;
    if (!humanInvolved) return;
    if (window.__autoPlay) {
      if (this.currentBattle) { this.currentBattle.close(); this.currentBattle = null; }
      this.app.showScreen('adventure'); this.app.hud.refresh(); this.app.renderer.invalidateFog();
      this.restoreOverlay();
      return;
    }
    const humanSide = battle.sides[0].owner === 0 ? 0 : 1;
    const won = res.winner === humanSide;
    const body = el('div.result');
    const cas = (side) => {
      const list = el('div.cas-row');
      const c = res.casualties[side];
      if (!Object.keys(c).length) list.append(el('span.muted', 'Ingen tab'));
      for (const [u, n] of Object.entries(c)) list.append(unitCard(u, n, { cls: 'mini' }));
      return list;
    };
    body.append(el('h3', battle.sides[0].name), cas(0), el('h3', battle.sides[1].name), cas(1));
    if (won) body.append(el('div.dialog-text', `Erfaring: +${res.exp[humanSide]}`));
    if (res.fled !== null && res.fled !== undefined) body.append(el('div.dialog-text', res.fled === humanSide ? 'Din helt flygtede.' : 'Fjenden flygtede.'));
    await dialog({ title: won ? 'Sejr!' : 'Nederlag', body, cls: won ? 'victory' : 'defeat', buttons: [{ label: 'Fortsæt', value: true, primary: true }], closable: true });
    if (this.currentBattle) { this.currentBattle.close(); this.currentBattle = null; }
    this.app.showScreen('adventure');
    this.app.hud.refresh();
    this.app.renderer.invalidateFog();
    this.restoreOverlay();
  }
  async step(hero, st, i, path, prev) {
    const r = this.app.renderer;
    if (this.isHuman(hero)) {
      r.invalidateFog();
      const mode = path.length === 1 ? 'single' : i === 0 ? 'first' : i === path.length - 1 ? 'last' : 'mid';
      await r.animateHero(hero, prev.x, prev.y, st.x, st.y, mode === 'mid' ? 260 : 320, mode);
      const [sx, sy] = r.worldToScreen((hero.x + 0.5) * 64, (hero.y + 0.5) * 64);
      if (sx < 80 || sy < 80 || sx > r.w - 80 || sy > r.h - 140) r.centerOn(hero.x, hero.y);
      return;
    }
    if (this.visible(st.x, st.y) || this.visible(prev.x, prev.y)) {
      r.centerOn(hero.x, hero.y);
      const mode = path.length === 1 ? 'single' : i === 0 ? 'first' : i === path.length - 1 ? 'last' : 'mid';
      await r.animateHero(hero, prev.x, prev.y, st.x, st.y, mode === 'mid' ? 190 : 230, mode);
    }
  }
  async aiTurnStart(p) {
    this.app.setOverlay(`${p.name} tænker…`);
    await wait(50);
  }
  async aiTurnEnd(p) { this.app.setOverlay(null); }
}
