// Main menu and new-game setup.
import { el } from '../core/utils.js';
import { FACTIONS } from '../data/factions.js';
import { UNITS } from '../data/units.js';
import { DIFFICULTIES, MAP_SIZES } from '../game/state.js';
import { hasSave, saveInfo } from '../game/save.js';
import { unitCard, unitStatsHtml } from './common.js';
import { dialog } from './dialogs.js';
import { townSprite } from '../render/sprites.js';
import { MenuScene } from '../render/scenes.js';
import { APP_VERSION } from '../version.js';

let scene = null, sceneRaf = 0;
function ensureScene(root) {
  let cv = document.getElementById('menu-bg');
  if (!cv) { cv = el('canvas#menu-bg'); }
  root.prepend(cv);
  if (!scene || scene.canvas !== cv) { scene = new MenuScene(cv); }
  scene.resize();
  cancelAnimationFrame(sceneRaf);
  const loop = () => { if (!document.getElementById('menu').classList.contains('active')) { sceneRaf = 0; return; } scene.draw(); sceneRaf = requestAnimationFrame(loop); };
  sceneRaf = requestAnimationFrame(loop);
}
export function stopMenuScene() { cancelAnimationFrame(sceneRaf); sceneRaf = 0; }

export function renderMenu(app) {
  const root = document.getElementById('menu');
  root.innerHTML = '';
  app.showScreen('menu');
  ensureScene(root);
  const box = el('div.menu-box');
  box.append(el('h1.title.gold-text', 'Troner af Skov & Jern'));
  box.append(el('div.ornament'));
  box.append(el('div.subtitle', 'Et strategispil i Midgård og Den Gamle Verden'));
  const si = saveInfo();
  if (hasSave() && si) box.append(el('button.btn.primary.big', { onclick: () => app.continueGame() }, `Fortsæt (Dag ${si.day}, ${FACTIONS[si.faction] ? FACTIONS[si.faction].name : ''})`));
  box.append(el('button.btn.big', { onclick: () => renderSetup(app) }, 'Nyt spil'));
  box.append(el('button.btn.big', { onclick: () => showHelp() }, 'Sådan spiller du'));
  box.append(el('button.btn.big', { onclick: () => app.openStudio('menu') }, 'Grafikværksted'));
  box.append(el('div.version', `Version ${APP_VERSION} · Skovelvere & Orker`));
  root.append(box);
}

function renderSetup(app) {
  const root = document.getElementById('menu');
  root.innerHTML = '';
  ensureScene(root);
  const state = { faction: 'elves', size: 'medium', difficulty: 'normal', seed: '' };
  const box = el('div.menu-box.wide');
  box.append(el('h2.gold-text', 'Vælg din fraktion'));
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
  const panel = el('div.menu-panel', opts);
  box.append(facRow, panel);
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
<p><b>Eventyrkortet:</b> Tryk på en helt for at vælge den. Tryk på et felt for at planlægge en rute: guld viser dagens vej, sølv de følgende dage, og mærket ved målet viser prisen i skridt. Nederst ser du heltens skridt tilbage (👣), og hvor mange der er brugt, når ruten udføres. Tryk igen for at gå. Træk for at panorere, knib for at zoome.</p>
<p><b>Byer:</b> Byg én bygning om dagen. Nye enheder vokser hver uge (dag 1). Hyr dem i Hvervning – de går til den besøgende helt eller garnisonen.</p>
<p><b>Ressourcer:</b> Guld, Tømmer og Malm til basale bygninger. Mithril, Warpsten og Ædelsten til magi og de stærkeste væsner. Erobr miner ved at besøge dem.</p>
<p><b>Kamp:</b> Foregår på et hexkort. Enheder handler efter hastighed. Tryk på et felt for at flytte, på en fjende for at angribe eller skyde. Helte kan kaste én besværgelse pr. runde. Vent, Forsvar og Auto-kamp findes i bunden. Knib eller tryk på 🔍 for at zoome ind på slagmarken, træk for at flytte udsynet.</p>
<p><b>Helte:</b> Får erfaring af kampe og stiger i niveau: +1 egenskab og en valgfri færdighed. Artefakter giver bonusser. Hastigheden af den langsomste enhed bestemmer bevægelsen pr. dag.</p>
<p><b>Monstre</b> bevogter felterne omkring sig – man kan ikke snige sig forbi. Lyt til tallene: "Flok (10-19)" fortæller cirka hvor mange de er. Står du med en langt stærkere hær, kan flokken flygte eller tilbyde at slutte sig til dig, især væsner af din egen slags. Lederskab øger chancen.</p>
<p><b>Steder på kortet:</b> Elverporte fører lynhurtigt til hinanden. Handelspladsen bytter ressourcer, Smedjen sælger ét artefakt, det Hellige Vandfald fylder mana og giver held og moral, Vejviseren afslører egnen, Sandsigerskens Bål lærer en færdighed, og Glemte Skatkamre gemmer store skatte bag stærke vagter. Opslagstavler og tavernen giver rygter om fjenden.</p>
<p><b>Uger:</b> Hver ny uge bringer en begivenhed: en væsenuge med dobbelt vækst, pest, rig høst eller karavaner. Tryk på 👑 for Rigeoversigten med helte, byer, indtægt og din krønike.</p>
<p><b>Artefaktsæt:</b> Visse artefakter hører sammen (f.eks. Erebors Arv). Bær alle dele, og helten får en ekstra bonus. Se dem på helteskærmen.</p>
<p><b>Tip:</b> Installer spillet på hjemmeskærmen via Chrome-menuen "Føj til startskærm" – så kører det i fuld skærm og offline.</p>` });
  return dialog({ title: 'Sådan spiller du', body, cls: 'help-dialog' });
}
