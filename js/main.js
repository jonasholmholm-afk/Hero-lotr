import { el, wait } from './core/utils.js';
import { G, newGame, human } from './game/state.js';
import { startDay, checkVictory } from './game/turn.js';
import { saveGame, loadGame, deleteSave } from './game/save.js';
import { AdventureRenderer } from './render/adventure.js';
import { Hud } from './ui/hud.js';
import { GameIO } from './ui/io.js';
import { renderMenu, showHelp } from './ui/menu.js';
import { openTownScreen } from './ui/townScreen.js';
import { openHeroScreen } from './ui/heroScreen.js';
import { dialog, toast, confirm } from './ui/dialogs.js';
import { heroesOf } from './game/state.js';

const app = {
  screens: ['menu', 'adventure', 'town', 'hero', 'battle'],
  current: 'menu',
  renderer: null, hud: null, io: null, raf: 0,
  showScreen(id) {
    for (const s of this.screens) document.getElementById(s).classList.toggle('active', s === id);
    this.current = id;
    if (id === 'adventure' && this.renderer) requestAnimationFrame(() => this.renderer.resize());
    if (id === 'adventure') document.body.classList.remove('in-screen'); else document.body.classList.add('in-screen');
  },
  setOverlay(text) {
    const o = document.getElementById('overlay');
    this.overlayText = text;
    if (!text) { o.classList.remove('show'); return; }
    o.querySelector('.overlay-text').textContent = text;
    o.classList.add('show');
  },
  startGame(opts) {
    deleteSave();
    const s = newGame(opts);
    startDay(s.players[0]);
    this.beginSession();
    this.hud.select(heroesOf(0)[0]);
    toast('Dag 1 – din tur. Tryk på helten og derefter på kortet for at bevæge dig.', 4000);
    showHelp();
  },
  continueGame() {
    const s = loadGame();
    if (!s) { toast('Ingen gemt spil fundet'); return; }
    this.beginSession();
    const hs = heroesOf(0);
    if (hs.length) this.hud.select(hs[0]); else { const t = G.s.map.objects[human().towns[0]]; if (t) this.renderer.centerOn(t.x, t.y); }
  },
  beginSession() {
    const canvas = document.querySelector('#adventure canvas');
    this.renderer = new AdventureRenderer(canvas, G.s);
    this.hud.selected = null;
    this.showScreen('adventure');
    this.renderer.resize();
    this.hud.mount();
    this.startLoop();
    saveGame();
  },
  startLoop() {
    cancelAnimationFrame(this.raf);
    const loop = () => {
      if (G.s && this.current === 'adventure' && this.renderer) this.renderer.draw(human());
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  },
  openTown(town) { return openTownScreen(this, town); },
  openHero(hero) { return openHeroScreen(this, hero); },
  async openMenu() {
    const v = await dialog({ title: 'Menu', body: 'Spillet gemmes automatisk ved hver afsluttet tur.', buttons: [
      { label: 'Gem nu', value: 'save' }, { label: 'Hjælp', value: 'help' }, { label: 'Til hovedmenu', value: 'quit', danger: true }, { label: 'Tilbage', value: null, primary: true }] });
    if (v === 'save') { saveGame(); toast('Spillet er gemt'); }
    if (v === 'help') showHelp();
    if (v === 'quit') { const ok = await confirm('Til hovedmenu?', 'Ugemt fremskridt siden sidste tur går tabt.'); if (ok) { saveGame(); this.toMenu(); } }
  },
  toMenu() {
    cancelAnimationFrame(this.raf);
    renderMenu(this);
  },
  async checkEnd() {
    const w = checkVictory();
    if (w === null) return false;
    const won = w === 0;
    deleteSave();
    await dialog({ title: won ? 'Sejr!' : 'Nederlag', cls: won ? 'victory' : 'defeat', closable: false, body: won
      ? `Dine fjender er knust og landet er dit. ${G.s.players[0].name} hersker nu over både skov og jern.\n\nSpillet varede ${G.s.day} dage og ${G.s.stats.battles} slag.`
      : `Dit rige er faldet. Skyggen breder sig over landet…\n\nSpillet varede ${G.s.day} dage.`, buttons: [{ label: 'Til hovedmenu', value: true, primary: true }] });
    this.toMenu();
    return true;
  },
};
app.hud = new Hud(app);
app.io = new GameIO(app);

window.addEventListener('resize', () => { if (app.renderer) app.renderer.resize(); });
window.addEventListener('beforeunload', () => { if (G.s && app.current !== 'menu') saveGame(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && G.s) saveGame(); });

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
// Orientation hint
function checkOrientation() { document.body.classList.toggle('portrait', window.innerHeight > window.innerWidth && window.innerWidth < 700); }
window.addEventListener('resize', checkOrientation); checkOrientation();

renderMenu(app);
window.__app = app; window.__G = G;
