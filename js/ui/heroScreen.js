// Hero overview: stats, skills, army management, artifacts, spells.
import { el, fmtMove } from '../core/utils.js';
import { G } from '../game/state.js';
import { UNITS } from '../data/units.js';
import { SKILLS, SKILL_LEVELS } from '../data/skills.js';
import { ARTIFACTS, SLOTS, SLOT_NAMES, bonusStr } from '../data/artifacts.js';
import { SPELLS } from '../data/spells.js';
import { HEROES, STAT_NAMES, STAT_IDS } from '../data/heroes.js';
import { heroStat, maxMana, maxMovement, expForNext, className, specialtyText, heroMorale, heroLuck, equipFromBackpack, unequip } from '../game/hero.js';
import { portraitImg, unitCard, emptySlot, unitStatsHtml, statBar } from './common.js';
import { skillIcon, artifactIcon, spellIcon } from '../render/icons.js';
import { dialog, toast, numberPicker } from './dialogs.js';

/** Army slot interaction shared by hero and town screens.
 *  armies: array of {army, label}. Tap a stack, then tap another slot to move/merge/swap. */
export class ArmyEditor {
  constructor(onChange) { this.sel = null; this.onChange = onChange; }
  render(container, armies, opts = {}) {
    container.innerHTML = '';
    this.armies = armies;
    for (let ai = 0; ai < armies.length; ai++) {
      const { army, label, locked } = armies[ai];
      const row = el('div.army-row');
      if (label) row.append(el('div.army-label', label));
      const slots = el('div.army-slots');
      for (let i = 0; i < 7; i++) {
        const st = army[i];
        const slot = st ? unitCard(st.unit, st.count) : emptySlot();
        if (this.sel && this.sel.ai === ai && this.sel.i === i) slot.classList.add('selected');
        if (!locked) slot.addEventListener('click', () => this.tap(ai, i));
        slots.append(slot);
      }
      row.append(slots);
      container.append(row);
    }
  }
  tap(ai, i) {
    const army = this.armies[ai].army;
    if (!this.sel) {
      if (!army[i]) return;
      this.sel = { ai, i };
      this.onChange();
      return;
    }
    const src = this.armies[this.sel.ai].army, si = this.sel.i;
    if (this.sel.ai === ai && si === i) {
      // same slot: offer split / info
      const st = army[i];
      this.sel = null;
      this.onChange();
      this.slotMenu(ai, i, st);
      return;
    }
    const a = src[si], b = army[i];
    if (!a) { this.sel = null; this.onChange(); return; }
    if (!b) { army[i] = a; src[si] = null; }
    else if (b.unit === a.unit) { b.count += a.count; src[si] = null; }
    else { army[i] = a; src[si] = b; }
    // Never leave a hero army empty
    for (const { army: ar, hero } of this.armies) if (hero && ar.every((s) => !s)) {
      // undo
      if (!b) { src[si] = a; army[i] = null; } else if (b.unit === a.unit) { b.count -= a.count; src[si] = a; } else { army[i] = b; src[si] = a; }
      toast('En helt kan ikke stå uden hær');
    }
    this.sel = null;
    this.onChange();
  }
  async slotMenu(ai, i, st) {
    const u = UNITS[st.unit];
    const body = el('div', { html: unitStatsHtml(u) });
    const canSplit = st.count > 1 && this.armies.some(({ army }) => army.some((s) => !s));
    const v = await dialog({ title: `${u.plural} ×${st.count}`, body, buttons: [canSplit ? { label: 'Del flokken', value: 'split' } : null, { label: 'Luk', value: null }].filter(Boolean) });
    if (v === 'split') {
      const n = await numberPicker({ title: 'Del flokken', body: `Hvor mange ${u.plural} skal flyttes til en tom plads?`, max: st.count - 1, okLabel: 'Del' });
      if (n > 0) {
        for (const { army } of this.armies) {
          const e = army.findIndex((s) => !s);
          if (e >= 0) { army[e] = { unit: st.unit, count: n }; st.count -= n; break; }
        }
        this.onChange();
      }
    }
  }
}

export function openHeroScreen(app, hero) {
  return new Promise((resolve) => {
    const root = document.getElementById('hero');
    root.innerHTML = '';
    const def = HEROES[hero.defId];
    const editor = new ArmyEditor(() => render());
    const render = () => {
      root.innerHTML = '';
      const head = el('div.screen-head',
        el('button.btn.back', { onclick: () => { app.showScreen('adventure'); resolve(); } }, '‹ Tilbage'),
        el('h1', hero.name), el('div.head-sub', `${className(hero)} · Niveau ${hero.level}`));
      root.append(head);
      const body = el('div.hero-body');
      // Left: portrait + stats
      const left = el('div.hero-col');
      left.append(el('div.hero-portrait-box', portraitImg(hero.defId, 96)));
      const stats = el('div.stat-grid');
      for (const st of STAT_IDS) stats.append(el('div.stat', el('div.stat-name', STAT_NAMES[st]), el('div.stat-val', String(heroStat(hero, st)))));
      left.append(stats);
      left.append(el('div.hero-meta',
        el('div', `Erfaring: ${hero.exp} / ${expForNext(hero)}`), statBar(hero.exp, expForNext(hero), 'exp'),
        el('div', `Mana: ${hero.mana} / ${maxMana(hero)}`), statBar(hero.mana, maxMana(hero), 'mana'),
        el('div', `Bevægelse: ${fmtMove(hero.movement)} / ${fmtMove(hero.maxMovement || maxMovement(hero))} skridt`), statBar(hero.movement, hero.maxMovement || maxMovement(hero), 'move'),
        el('div', `Moral: ${fmtMod(heroMorale(hero))} · Held: ${fmtMod(heroLuck(hero))}`),
        el('div.spec', `Speciale: ${specialtyText(hero)}`),
        el('div.lore', def.lore)));
      body.append(left);
      // Middle: skills + army + spells
      const mid = el('div.hero-col.wide');
      const skills = el('div.skill-grid');
      const ids = Object.keys(hero.skills);
      if (!ids.length) skills.append(el('div.muted', 'Ingen færdigheder endnu.'));
      for (const id of ids) {
        const lvl = hero.skills[id];
        skills.append(el('div.skill', { title: SKILLS[id].desc(SKILLS[id].vals[lvl]) }, el('img', { src: skillIcon(id, 48).toDataURL(), width: 36, height: 36 }), el('div.skill-text', el('div.name', SKILLS[id].name), el('div.sub', SKILL_LEVELS[lvl]), el('div.sub.small', SKILLS[id].desc(SKILLS[id].vals[lvl])))));
      }
      mid.append(el('h3', 'Færdigheder'), skills);
      mid.append(el('h3', 'Hær'));
      const armyBox = el('div');
      editor.render(armyBox, [{ army: hero.army, hero }]);
      mid.append(armyBox, el('div.muted.small', 'Tryk på en flok og derefter en anden plads for at flytte eller bytte. Tryk to gange på samme flok for at dele.'));
      const spells = el('div.spell-row');
      if (!hero.spells.length) spells.append(el('div.muted', 'Ingen besværgelser.'));
      for (const id of hero.spells) {
        const sp = SPELLS[id];
        spells.append(el('div.spell-chip', { title: sp.desc, onclick: () => dialog({ title: sp.name, body: `Niveau ${sp.level} · ${sp.cost} mana\n${sp.desc}` }) }, el('img', { src: spellIcon(id, 40).toDataURL(), width: 28, height: 28 }), el('span', sp.name)));
      }
      mid.append(el('h3', 'Besværgelser'), spells);
      body.append(mid);
      // Right: artifacts
      const right = el('div.hero-col');
      right.append(el('h3', 'Artefakter'));
      const slots = el('div.art-grid');
      for (const sl of SLOTS) {
        const id = hero.artifacts[sl];
        const box = el('div.art-slot' + (id ? '' : '.empty'), { title: id ? ARTIFACTS[id].name : SLOT_NAMES[sl] });
        if (id) {
          box.append(el('img', { src: artifactIcon(id, 48).toDataURL(), width: 40, height: 40 }));
          box.addEventListener('click', async () => {
            const a = ARTIFACTS[id];
            const v = await dialog({ title: a.name, body: `${bonusStr(a.bonus)}\n\n${a.lore}`, buttons: [{ label: 'Læg i rygsæk', value: 'un' }, { label: 'Luk', value: null }] });
            if (v === 'un') { unequip(hero, sl); render(); }
          });
        } else box.append(el('span.slot-name', SLOT_NAMES[sl]));
        slots.append(box);
      }
      right.append(slots, el('h3', 'Rygsæk'));
      const bp = el('div.art-grid');
      if (!hero.backpack.length) bp.append(el('div.muted', 'Tom.'));
      hero.backpack.forEach((id, idx) => {
        const a = ARTIFACTS[id];
        bp.append(el('div.art-slot', { title: a.name, onclick: async () => {
          const v = await dialog({ title: a.name, body: `${bonusStr(a.bonus)}\n\n${a.lore}`, buttons: [{ label: 'Tag på', value: 'eq', primary: true }, { label: 'Luk', value: null }] });
          if (v === 'eq') { equipFromBackpack(hero, idx); render(); }
        } }, el('img', { src: artifactIcon(id, 48).toDataURL(), width: 40, height: 40 })));
      });
      right.append(bp);
      body.append(right);
      root.append(body);
      hero.maxMovement = maxMovement(hero);
    };
    render();
    app.showScreen('hero');
  });
}
function fmtMod(v) { return (v > 0 ? '+' : '') + v; }
