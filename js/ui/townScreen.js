// Town screen: scenic banner, buildings, recruitment, garrison, tavern, mage guild, market.
import { el, roman } from '../core/utils.js';
import { G, heroesOf } from '../game/state.js';
import { UNITS } from '../data/units.js';
import { FACTIONS } from '../data/factions.js';
import { BUILDINGS, BUILD_ORDER, DWELLINGS } from '../data/buildings.js';
import { RES, RES_INFO, canAfford } from '../data/resources.js';
import { SPELLS } from '../data/spells.js';
import { HEROES } from '../data/heroes.js';
import { bname, bdesc, canBuild, build, buildingCost, dwellingUnit, recruit, recruitCost, maxRecruitable, hallLevel, fortLevel, mageLevel, townIncome, growthMult } from '../game/town.js';
import { hireHero, learnGuildSpells } from '../game/actions.js';
import { createHero, maxMovement } from '../game/hero.js';
import { costRow, unitCard, resIcon, portraitImg, unitStatsHtml } from './common.js';
import { dialog, toast, numberPicker, confirm } from './dialogs.js';
import { ArmyEditor } from './heroScreen.js';
import { spellIcon, buildingIcon } from '../render/icons.js';
import { figure } from '../render/figures.js';
import { mk, poly, circle, ellipse, rrect, line, lgrad, rgrad, shade, lighten } from '../render/draw.js';
import { townSprite } from '../render/sprites.js';
import { drawTownBanner } from '../render/scenes.js';

export function openTownScreen(app, town) {
  return new Promise((resolve) => {
    const s = G.s;
    const p = s.players[town.owner];
    const root = document.getElementById('town');
    let tab = 'build';
    const editor = new ArmyEditor(() => render());
    const close = () => { app.showScreen('adventure'); resolve(); };
    const render = () => {
      root.innerHTML = '';
      const hero = town.visiting ? s.heroes[town.visiting] : null;
      const head = el('div.screen-head',
        el('button.btn.back', { onclick: close }, '‹ Kort'),
        el('h1', town.name), el('div.head-sub', `${FACTIONS[town.faction].name} · ${bname(town, 'hall' + hallLevel(town))} · ${townIncome(town)} guld/dag`));
      root.append(head);
      root.append(resourceBar(p));
      const banner = el('canvas.town-banner');
      root.append(banner);
      requestAnimationFrame(() => drawTownBanner(banner, town, fortLevel(town), mageLevel(town), dwellingUnit));
      const tabs = el('div.tabs');
      const tabDefs = [['build', 'Byg'], ['recruit', 'Hvervning'], ['army', 'Hær'], ['tavern', 'Taverne'], ['mage', 'Magi'], ['market', 'Marked']];
      for (const [id, label] of tabDefs) tabs.append(el('button.tab' + (tab === id ? '.active' : ''), { onclick: () => { tab = id; render(); } }, label));
      root.append(tabs);
      const content = el('div.tab-content');
      root.append(content);
      switch (tab) {
        case 'build': renderBuild(content); break;
        case 'recruit': renderRecruit(content, hero); break;
        case 'army': renderArmy(content, hero); break;
        case 'tavern': renderTavern(content, hero); break;
        case 'mage': renderMage(content, hero); break;
        case 'market': renderMarket(content); break;
      }
    };

    const renderBuild = (c) => {
      if (town.builtToday) c.append(el('div.notice', 'Der er allerede bygget i dag. Nye bygninger kan opføres i morgen.'));
      const list = el('div.card-list');
      for (const id of BUILD_ORDER) {
        if (id === 'hall1') continue;
        const built = town.buildings[id];
        const chk = canBuild(town, id, p.resources);
        // hide far-future buildings whose requirements are not met except next tier
        const card = el('div.card' + (built ? '.built' : chk.ok ? '.ok' : '.locked'));
        const iconSrc = id.startsWith('dw') ? figure(UNITS[dwellingUnit(town, id)], 72).toDataURL() : buildingIcon(id, town.faction, 88).toDataURL();
        card.append(el('div.card-head', el('img.card-icon', { src: iconSrc, width: 44, height: 44 }), el('div.card-title', bname(town, id) + (built ? ' ✓' : ''))));
        card.append(el('div.card-desc', bdesc(town, id)));
        if (!built) {
          card.append(costRow(buildingCost(town, id), p.resources));
          const reqs = BUILDINGS[id].req.filter((r) => !town.buildings[r]).map((r) => bname(town, r));
          if (reqs.length) card.append(el('div.card-req', 'Kræver: ' + reqs.join(', ')));
          card.append(el('button.btn.small' + (chk.ok ? '.primary' : ''), { disabled: !chk.ok, onclick: async () => {
            const r = build(town, id, p.resources);
            if (r.ok) { toast(`${bname(town, id)} er bygget!`); render(); } else toast(r.reason);
          } }, chk.ok ? 'Byg' : chk.reason));
        }
        list.append(card);
      }
      c.append(list);
    };

    const renderRecruit = (c, hero) => {
      const list = el('div.card-list');
      let any = false;
      for (const dw of DWELLINGS) {
        if (!town.buildings[dw]) continue;
        any = true;
        const unit = dwellingUnit(town, dw); const u = UNITS[unit];
        const avail = town.available[dw];
        const card = el('div.card.recruit');
        card.append(el('div.recruit-fig', unitCard(unit)));
        const text = el('div.recruit-text', el('div.card-title', `${u.plural} (${bname(town, dw)})`), el('div.sub', `Tilgængelig: ${avail} · Vækst: ${Math.round(u.growth * growthMult(town))}/uge`), costRow(u.cost, p.resources), el('div', { html: unitStatsHtml(u) }));
        card.append(text);
        const max = maxRecruitable(unit, avail, p.resources);
        card.append(el('button.btn.small' + (max > 0 ? '.primary' : ''), { disabled: max <= 0, onclick: async () => {
          const n = await numberPicker({ title: `Hyr ${u.plural}`, max, costFn: (k) => `Pris: ${RES.filter((r) => u.cost[r]).map((r) => `${u.cost[r] * k} ${RES_INFO[r].name}`).join(', ')}` });
          if (n <= 0) return;
          const target = hero ? hero.army : town.garrison;
          const got = recruit(town, dw, n, p.resources, target);
          if (got <= 0) { toast('Ingen plads i hæren – flyt eller slå flokke sammen.'); return; }
          if (hero) hero.maxMovement = maxMovement(hero);
          toast(`${got} ${u.plural} sluttede sig til ${hero ? hero.name : 'garnisonen'}.`);
          render();
        } }, 'Hyr'));
        list.append(card);
      }
      if (!any) list.append(el('div.muted', 'Ingen boliger bygget endnu.'));
      c.append(el('div.notice.small', hero ? `Nye enheder går til ${hero.name}s hær.` : 'Nye enheder går til garnisonen.'), list);
    };

    const renderArmy = (c, hero) => {
      const box = el('div');
      const armies = [{ army: town.garrison, label: 'Garnison' }];
      if (hero) armies.push({ army: hero.army, label: `${hero.name} (besøger)`, hero });
      editor.render(box, armies);
      c.append(box, el('div.muted.small', 'Tryk på en flok og derefter en plads for at flytte mellem garnison og helt. Tryk to gange for at dele.'));
      if (hero) c.append(el('button.btn', { onclick: () => app.openHero(hero).then(render) }, 'Åbn helteskærm'));
    };

    const renderTavern = (c, hero) => {
      if (!town.buildings.tavern) { c.append(el('div.muted', 'Ingen taverne.')); return; }
      c.append(el('div.notice.small', 'I tavernen kan nye helte hyres for 2500 guld. Der kan kun være én helt i byen ad gangen.'));
      if (town.tavernHero) {
        const def = HEROES[town.tavernHero];
        const fac = FACTIONS[def.faction];
        const card = el('div.card.tavern');
        card.append(portraitImg(town.tavernHero, 72));
        card.append(el('div.recruit-text', el('div.card-title', def.name), el('div.sub', `${fac.heroClasses[def.cls].name}`), el('div.lore', def.lore)));
        const can = p.resources.gold >= 2500 && !town.visiting && p.heroes.length < 8;
        card.append(el('button.btn.small' + (can ? '.primary' : ''), { disabled: !can, onclick: () => {
          const h = hireHero(town, p.id, createHero);
          if (h) { toast(`${h.name} er hyret!`); app.hud.refresh(); render(); }
        } }, town.visiting ? 'Byen er optaget' : 'Hyr (2500)'));
        c.append(card);
      } else c.append(el('div.muted', 'Ingen helte søger tjeneste i denne uge.'));
      // rumours / log
      const logBox = el('div.log');
      for (const l of s.log.slice(-6).reverse()) logBox.append(el('div.log-line', `Dag ${l.day}: ${l.text}`));
      c.append(el('h3', 'Rygter fra kroen'), logBox);
    };

    const renderMage = (c, hero) => {
      const lvl = mageLevel(town);
      if (!lvl) { c.append(el('div.muted', `Byg ${bname(town, 'mage1')} for at lære besværgelser.`)); return; }
      if (hero) { const learned = learnGuildSpells(hero, town); if (learned.length) toast(`${hero.name} lærte ${learned.length} nye besværgelser`); }
      for (let l = 1; l <= 5; l++) {
        const row = el('div.spell-row');
        const built = l <= lvl;
        c.append(el('h3', `Niveau ${l}` + (built ? '' : ' (ikke bygget)')));
        for (const id of town.spells[l]) {
          const sp = SPELLS[id];
          row.append(el('div.spell-chip' + (built ? '' : '.dim') + (hero && hero.spells.includes(id) ? '.known' : ''), { title: sp.desc, onclick: () => dialog({ title: sp.name, body: `Niveau ${sp.level} · ${sp.cost} mana\n${sp.desc}` }) }, el('img', { src: spellIcon(id, 40).toDataURL(), width: 28, height: 28 }), el('span', sp.name)));
        }
        c.append(row);
      }
      if (hero) c.append(el('div.muted.small', 'Besøgende helte lærer automatisk gildets besværgelser (kræver Visdom til niveau 3+).'));
    };

    const renderMarket = (c) => {
      if (!town.buildings.market) { c.append(el('div.muted', `Byg ${bname(town, 'market')} for at handle.`)); return; }
      const markets = heroesOf(p.id).length; // not used
      const nMarkets = p.towns.map((id) => s.map.objects[id]).filter((t) => t && t.buildings.market).length;
      const rate = (from, to) => {
        // units of `from` per 1 `to`
        const base = (from === 'gold' ? 1 : 1) ;
        const val = { gold: 1, wood: 250, ore: 250, mithril: 500, warpstone: 500, gems: 500 };
        let r = val[to] / val[from];
        r *= [0, 2.5, 2, 1.6, 1.3, 1.1][Math.min(5, nMarkets)] || 1.1;
        if (from === 'gold') return Math.ceil(r);
        return Math.max(1, Math.round(r));
      };
      let from = 'wood', to = 'gold';
      const box = el('div.market');
      const draw = () => {
        box.innerHTML = '';
        const sel = (cur, cb) => { const r = el('div.res-select'); for (const k of RES) r.append(el('button.btn.small' + (k === cur ? '.primary' : ''), { onclick: () => cb(k) }, resIcon(k, 16), ` ${p.resources[k]}`)); return r; };
        box.append(el('div', 'Giv:'), sel(from, (k) => { from = k; if (to === k) to = k === 'gold' ? 'wood' : 'gold'; draw(); }));
        box.append(el('div', 'Få:'), sel(to, (k) => { to = k; if (from === k) from = k === 'gold' ? 'wood' : 'gold'; draw(); }));
        const r = rate(from, to);
        const maxTrades = Math.floor(p.resources[from] / r);
        box.append(el('div.notice.small', `Kurs: ${r} ${RES_INFO[from].name} → 1 ${RES_INFO[to].name} (${nMarkets} marked${nMarkets > 1 ? 'er' : ''})`));
        box.append(el('button.btn.primary', { disabled: maxTrades <= 0, onclick: async () => {
          const n = await numberPicker({ title: 'Handel', body: `Hvor mange ${RES_INFO[to].name} vil du købe?`, max: maxTrades, okLabel: 'Byt', costFn: (k) => `Koster ${k * r} ${RES_INFO[from].name}` });
          if (n > 0) { p.resources[from] -= n * r; p.resources[to] += n; render(); }
        } }, 'Byt'));
      };
      draw();
      c.append(box);
    };

    render();
    app.showScreen('town');
  });
}

export function resourceBar(p) {
  const bar = el('div.res-bar');
  for (const r of RES) bar.append(el('span.res', resIcon(r, 16), String(p.resources[r])));
  return bar;
}
