// Main menu and new-game setup.
import { el } from '../core/utils.js';
import { FACTIONS } from '../data/factions.js';
import { UNITS } from '../data/units.js';
import { DIFFICULTIES, MAP_SIZES } from '../game/state.js';
import { hasSave, saveInfo } from '../game/save.js';
import { unitCard, unitStatsHtml } from './common.js';
import { dialog } from './dialogs.js';
import { townSprite } from '../render/sprites.js';

export function renderMenu(app) {
  const root = document.getElementById('menu');
  root.innerHTML = '';
  const box = el('div.menu-box');
  box.append(el('h1.title', 'Troner af Skov & Jern'));
  box.append(el('div.subtitle', 'Et strategispil i Midgård og Den Gamle Verden'));
  const si = saveInfo();
  if (hasSave() && si) box.append(el('button.btn.primary.big', { onclick: () => app.continueGame() }, `Fortsæt (Dag ${si.day}, ${FACTIONS[si.faction] ? FACTIONS[si.faction].name : ''})`));
  box.append(el('button.btn.big', { onclick: () => renderSetup(app) }, 'Nyt spil'));
  box.append(el('button.btn.big', { onclick: () => showHelp() }, 'Sådan spiller du'));
  box.append(el('div.version', 'Version 1.0 · Skovelvere & Orker'));
  root.append(box);
  app.showScreen('menu');
}

function renderSetup(app) {
  const root = document.getElementById('menu');
  root.innerHTML = '';
  const state = { faction: 'elves', size: 'medium', difficulty: 'normal', seed: '' };
  const box = el('div.menu-box.wide');
  box.append(el('h2', 'Vælg din fraktion'));
  const facRow = el('div.faction-row');
  const render = () => {
    facRow.innerHTML = '';
    for (const id of ['elves', 'orcs']) {
      const f = FACTIONS[id];
      const card = el('div.faction-card' + (state.faction === id ? '.active' : ''), { onclick: () => { state.faction = id; render(); } });
      card.append(el('img.faction-town', { src: townSprite(id, 2, f.color).toDataURL(), draggable: false }));
      card.append(el('div.faction-name', { style: { color: f.color } }, f.name));
      card.append(el('div.faction-title', f.title));
      card.append(el('div.faction-desc', f.desc));
      const units = el('div.faction-units');
      for (const u of f.units) {
        const c = unitCard(u);
        c.addEventListener('click', (e) => { e.stopPropagation(); dialog({ title: UNITS[u].plural, body: el('div', { html: unitStatsHtml(UNITS[u]) }) }); });
        units.append(c);
      }
      card.append(units);
      facRow.append(card);
    }
    opts.innerHTML = '';
    const group = (label, keys, cur, names, cb) => {
      const g = el('div.opt-group', el('div.opt-label', label));
      const row = el('div.opt-row');
      for (const k of keys) row.append(el('button.btn.small' + (cur === k ? '.primary' : ''), { onclick: () => cb(k), title: names[k].desc || '' }, names[k].name));
      g.append(row);
      return g;
    };
    opts.append(group('Kortstørrelse', Object.keys(MAP_SIZES), state.size, MAP_SIZES, (k) => { state.size = k; render(); }));
    opts.append(group('Sværhedsgrad', Object.keys(DIFFICULTIES), state.difficulty, DIFFICULTIES, (k) => { state.difficulty = k; render(); }));
    opts.append(el('div.opt-group', el('div.opt-label', 'Kort-frø (valgfrit)'), el('input.seed', { type: 'text', placeholder: 'Tomt = tilfældigt', value: state.seed, oninput: (e) => { state.seed = e.target.value; } })));
  };
  const opts = el('div.opts');
  render();
  box.append(facRow, opts);
  const row = el('div.dialog-buttons');
  row.append(el('button.btn', { onclick: () => renderMenu(app) }, 'Tilbage'));
  row.append(el('button.btn.primary.big', { onclick: () => {
    const seed = state.seed.trim() ? hashSeed(state.seed.trim()) : undefined;
    app.startGame({ seed, size: state.size, playerFaction: state.faction, difficulty: state.difficulty });
  } }, 'Start spillet'));
  box.append(row);
  root.append(box);
}
function hashSeed(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

export function showHelp() {
  const body = el('div.help', { html: `
<p><b>Målet</b> er at erobre modstanderens by og besejre alle fjendens helte. Du taber, hvis du mister alle byer og helte – eller står uden by i 7 dage.</p>
<p><b>Eventyrkortet:</b> Tryk på en helt for at vælge den. Tryk på et felt for at planlægge en rute (prikker viser vejen, et tal viser antal dage). Tryk igen for at gå. Træk for at panorere, knib for at zoome.</p>
<p><b>Byer:</b> Byg én bygning om dagen. Nye enheder vokser hver uge (dag 1). Hyr dem i Hvervning – de går til den besøgende helt eller garnisonen.</p>
<p><b>Ressourcer:</b> Guld, Tømmer og Malm til basale bygninger. Mithril, Warpsten og Ædelsten til magi og de stærkeste væsner. Erobr miner ved at besøge dem.</p>
<p><b>Kamp:</b> Foregår på et hexkort. Enheder handler efter hastighed. Tryk på et felt for at flytte, på en fjende for at angribe eller skyde. Helte kan kaste én besværgelse pr. runde. Vent, Forsvar og Auto-kamp findes i bunden.</p>
<p><b>Helte:</b> Får erfaring af kampe og stiger i niveau: +1 egenskab og en valgfri færdighed. Artefakter giver bonusser. Hastigheden af den langsomste enhed bestemmer bevægelsen pr. dag.</p>
<p><b>Monstre</b> bevogter felterne omkring sig – man kan ikke snige sig forbi. Lyt til tallene: "Flok (10-19)" fortæller cirka hvor mange de er.</p>
<p><b>Tip:</b> Installer spillet på hjemmeskærmen via Chrome-menuen "Føj til startskærm" – så kører det i fuld skærm og offline.</p>` });
  return dialog({ title: 'Sådan spiller du', body, cls: 'help-dialog' });
}
