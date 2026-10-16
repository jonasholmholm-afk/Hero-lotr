import { el, wait } from './core/utils.js';
import { G, newGame, human } from './game/state.js';
import { startDay, checkVictory } from './game/turn.js';
import { saveGame, loadGame, deleteSave } from './game/save.js';
import { AdventureRenderer } from './render/adventure.js';
import { Hud } from './ui/hud.js';
import { GameIO } from './ui/io.js';
import { renderMenu, showHelp, stopMenuScene } from './ui/menu.js';
import { openTownScreen } from './ui/townScreen.js';
import { openHeroScreen } from './ui/heroScreen.js';
import { dialog, toast, confirm } from './ui/dialogs.js';
import { cycleAnimSpeed, animLabel } from './game/settings.js';
import { APP_VERSION } from './version.js';
import { heroesOf } from './game/state.js';
import { loadAssets } from './render/assets.js';
import { openAssetStudio } from './ui/assetStudio.js';

const app = {
  screens: ['menu', 'adventure', 'town', 'hero', 'battle', 'studio'],
  current: 'menu',
  renderer: null, hud: null, io: null, raf: 0,
  showScreen(id) {
    for (const s of this.screens) document.getElementById(s).classList.toggle('active', s === id);
    this.current = id;
    if (id !== 'menu') stopMenuScene();
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
  openStudio(from) { this.studioReturn = from; return openAssetStudio(this); },
  renderMenu() { renderMenu(this); },
  openHero(hero) { return openHeroScreen(this, hero); },
  /** Manual update check from the menus. */
  async checkUpdate() {
    const reg = this.swReg;
    if (!reg) { toast('Opdatering kræver, at spillet kører fra nettet (ikke en fil).', 2500); return; }
    toast('Søger efter ny version…', 1500);
    try { await reg.update(); } catch { toast('Kunne ikke nå serveren. Prøv igen om lidt.', 2500); return; }
    await wait(2500);
    if (reg.installing || reg.waiting) { toast('Ny version findes – henter og genstarter…', 3000, 'good'); if (reg.waiting) reg.waiting.postMessage('SKIP_WAITING'); }
    else toast(`Du har den nyeste version (${APP_VERSION}).`, 3000, 'good');
  },
  async openMenu() {
    const v = await dialog({ title: 'Menu', body: 'Spillet gemmes automatisk ved hver afsluttet tur.', buttons: [
      { label: 'Gem nu', value: 'save' }, { label: `Animationer: ${animLabel()}`, value: 'anim' }, { label: `Søg efter opdatering (${APP_VERSION})`, value: 'update' }, { label: 'Hjælp', value: 'help' }, { label: 'Grafikværksted', value: 'studio' }, { label: 'Til hovedmenu', value: 'quit', danger: true }, { label: 'Tilbage', value: null, primary: true }] });
    if (v === 'save') { saveGame(); toast('Spillet er gemt'); }
    if (v === 'update') { this.checkUpdate(); return; }
    if (v === 'anim') { cycleAnimSpeed(); toast(`Animationer: ${animLabel()}`, 1500); return this.openMenu(); }
    if (v === 'help') showHelp();
    if (v === 'studio') { await this.openStudio('adventure'); this.hud.refresh(); }
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
    const st = G.s.stats || {};
    const score = Math.max(0, (won ? 5000 : 0) + (st.won || 0) * 100 + (st.kills || 0) + (st.townsTaken || 0) * 2000 + (st.artifacts || 0) * 300 - G.s.day * 10);
    const rows = [['Dage', G.s.day], ['Slag vundet', st.won || 0], ['Slag tabt', st.lost || 0], ['Fjender fældet', st.kills || 0], ['Egne tab', st.losses || 0], ['Byer erobret', st.townsTaken || 0], ['Artefakter fundet', st.artifacts || 0], ['Væsner der sluttede sig til dig', st.joined || 0], ['Point', score]];
    const table = document.createElement('table'); table.className = 'k-table chronicle';
    for (const [k, v] of rows) { const tr = document.createElement('tr'); const a = document.createElement('td'); a.textContent = k; const b = document.createElement('td'); b.textContent = String(v); tr.append(a, b); table.append(tr); }
    const body = document.createElement('div');
    const text = document.createElement('div'); text.className = 'dialog-text';
    text.textContent = won ? `Dine fjender er knust og landet er dit. ${G.s.players[0].name} hersker nu over både skov og jern.` : 'Dit rige er faldet. Skyggen breder sig over landet…';
    body.append(text, table);
    await dialog({ title: won ? 'Sejr!' : 'Nederlag', cls: won ? 'victory' : 'defeat', closable: false, body, buttons: [{ label: 'Til hovedmenu', value: true, primary: true }] });
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
  window.addEventListener('load', async () => {
    let reg = null;
    try { reg = await navigator.serviceWorker.register('./sw.js'); } catch { return; }
    app.swReg = reg;
    // check for a new version whenever the app is opened or brought back to the front
    const check = () => reg.update().catch(() => {});
    document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
    setInterval(check, 10 * 60 * 1000);
    // when a new worker takes over, reload once so the new files are used right away
    let hadController = !!navigator.serviceWorker.controller, reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloading) { hadController = true; return; }
      reloading = true;
      if (G.s && app.current !== 'menu') saveGame();
      toast('Ny version hentet – genstarter…', 2500, 'good');
      setTimeout(() => location.reload(), 900);
    });
    reg.addEventListener('updatefound', () => { const w = reg.installing; if (w) w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) w.postMessage('SKIP_WAITING'); }); });
  });
}
// Orientation hint
function checkOrientation() { document.body.classList.toggle('portrait', window.innerHeight > window.innerWidth && window.innerWidth < 700); }
window.addEventListener('resize', checkOrientation); checkOrientation();

loadAssets().finally(() => renderMenu(app));
window.__app = app; window.__G = G;
