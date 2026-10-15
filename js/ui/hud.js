// Adventure screen controller: map input, HUD panels, hero selection and movement.
import { el, ordinalDay, wait } from '../core/utils.js';
import { G, human, heroAt, objAt, heroesOf, townsOf } from '../game/state.js';
import { RES, RES_INFO } from '../data/resources.js';
import { OBJ } from '../data/objects.js';
import { UNITS } from '../data/units.js';
import { heroPath, pathDays, guardAt } from '../game/movement.js';
import { moveHeroAlong, objectName, ownerName, monsterCountText } from '../game/actions.js';
import { endTurn, incomeOf, checkVictory } from '../game/turn.js';
import { maxMovement, armyValue } from '../game/hero.js';
import { saveGame } from '../game/save.js';
import { resIcon, unitCard, emptySlot, portraitImg, statBar } from './common.js';
import { toast, dialog, confirm, info } from './dialogs.js';
import { ARTIFACTS } from '../data/artifacts.js';
import { OBJ_INFO } from '../data/objects.js';
import { townSprite } from '../render/sprites.js';
import { fortLevel } from '../game/town.js';
import { T } from '../data/terrain.js';
import { dialog as dlg } from './dialogs.js';

export class Hud {
  constructor(app) {
    this.app = app;
    this.root = document.getElementById('adventure');
    this.canvas = this.root.querySelector('canvas');
    this.selected = null;
    this.path = null;
    this.busy = false;
    this.pointers = new Map();
    this.drag = null;
    this.bindInput();
  }
  get r() { return this.app.renderer; }

  mount() {
    const root = this.root;
    root.querySelector('.hud-top').innerHTML = '';
    root.querySelector('.hud-right').innerHTML = '';
    root.querySelector('.hud-bottom').innerHTML = '';
    this.refresh();
  }

  refresh() {
    const s = G.s; if (!s) return;
    const p = human();
    const top = this.root.querySelector('.hud-top');
    top.innerHTML = '';
    const resBox = el('div.res-bar.compact');
    const inc = incomeOf(p);
    for (const r of RES) resBox.append(el('span.res', { title: `${RES_INFO[r].name} (+${inc[r]}/dag)` }, resIcon(r, 16), el('span', String(p.resources[r]))));
    top.append(resBox);
    const d = ordinalDay(s.day);
    top.append(el('div.date', `Dag ${d.d} · Uge ${d.w} · Måned ${d.m}`));
    top.append(el('button.btn.small', { onclick: () => this.openMinimap() }, '🗺'));
    top.append(el('button.btn.small', { onclick: () => this.app.openMenu() }, '☰'));
    // right column: heroes + towns
    const right = this.root.querySelector('.hud-right');
    right.innerHTML = '';
    for (const h of heroesOf(p.id)) {
      const box = el('div.hero-btn' + (this.selected === h.id ? '.active' : ''), { onclick: () => { if (this.selected === h.id) this.app.openHero(h).then(() => this.refresh()); else this.select(h); } }, portraitImg(h.defId, 40));
      box.append(el('div.move-pip', { style: { height: `${Math.round(100 * (h.movement / Math.max(1, h.maxMovement || maxMovement(h))))}%` } }));
      right.append(box);
    }
    for (const t of townsOf(p.id)) {
      const c = townSprite(t.faction, fortLevel(t), null);
      const box = el('div.town-btn', { title: t.name, onclick: () => { this.r.centerOn(t.x, t.y); this.app.openTown(t).then(() => this.refresh()); } }, el('img', { src: c.toDataURL(), draggable: false }));
      right.append(box);
    }
    // bottom: selected hero
    const bottom = this.root.querySelector('.hud-bottom');
    bottom.innerHTML = '';
    const h = this.selected ? s.heroes[this.selected] : null;
    if (h) {
      const left = el('div.sel-hero', { onclick: () => this.app.openHero(h).then(() => this.refresh()) }, portraitImg(h.defId, 44), el('div.sel-text', el('div.name', `${h.name} (${h.level})`), statBar(h.movement, Math.max(1, h.maxMovement || maxMovement(h)), 'move'), el('div.sub', `Mana ${h.mana} · ⚔${h.attack} 🛡${h.defense}`)));
      bottom.append(left);
      const slots = el('div.army-slots.mini');
      for (let i = 0; i < 7; i++) slots.append(h.army[i] ? unitCard(h.army[i].unit, h.army[i].count, { cls: 'mini' }) : emptySlot({ cls: 'mini' }));
      bottom.append(slots);
    } else bottom.append(el('div.muted', 'Vælg en helt på kortet eller i panelet til højre.'));
    const btns = el('div.hud-btns');
    btns.append(el('button.btn.small', { onclick: () => this.nextHero() }, '➜ Næste helt'));
    btns.append(el('button.btn.small.primary', { onclick: () => this.endTurn() }, '⌛ Afslut tur'));
    bottom.append(btns);
  }

  openMinimap() {
    const s = G.s, m = s.map, p = human();
    const maxW = Math.min(window.innerWidth - 60, 520), maxH = Math.min(window.innerHeight - 140, 400);
    const scale = Math.max(1, Math.floor(Math.min(maxW / m.w, maxH / m.h)));
    const cv = el('canvas.minimap', { width: m.w * scale, height: m.h * scale, style: { width: m.w * scale + 'px', height: m.h * scale + 'px' } });
    const ctx = cv.getContext('2d');
    const cols = { [T.WATER]: '#2c6088', [T.GRASS]: '#5a9a44', [T.DIRT]: '#997a4e', [T.ROUGH]: '#978a6c', [T.SWAMP]: '#587040', [T.SNOW]: '#e4ecf4', [T.ASH]: '#534d4a' };
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const i = y * m.w + x;
      if (!p.fog[i]) { ctx.fillStyle = '#07090d'; ctx.fillRect(x * scale, y * scale, scale, scale); continue; }
      ctx.fillStyle = cols[m.terrain[i]] || '#444'; ctx.fillRect(x * scale, y * scale, scale, scale);
      if (m.decor[i] && m.decor[i] !== 7 && m.decor[i] !== 8 && m.decor[i] !== 10 && m.decor[i] !== 11) { ctx.fillStyle = m.decor[i] === 5 ? '#8a847c' : 'rgba(20,60,20,0.55)'; ctx.fillRect(x * scale, y * scale, scale, scale); }
      if (m.road[i]) { ctx.fillStyle = 'rgba(150,120,80,0.8)'; ctx.fillRect(x * scale, y * scale, scale, scale); }
    }
    for (const o of Object.values(m.objects)) {
      if (!p.fog[o.y * m.w + o.x]) continue;
      let c = null, r = scale;
      if (o.type === OBJ.TOWN) { c = o.owner >= 0 ? s.players[o.owner].color : '#cccccc'; r = scale * 2.2; }
      else if (o.type === OBJ.MINE || o.type === OBJ.DWELLING) { c = o.owner >= 0 ? s.players[o.owner].color : '#e0d0a0'; r = scale * 1.3; }
      else if (o.type === OBJ.MONSTER) { c = '#ff5a46'; r = scale * 0.9; }
      else if (o.type === OBJ.ARTIFACT || o.type === OBJ.CHEST || o.type === OBJ.RESOURCE) { c = '#ffe28a'; r = scale * 0.8; }
      if (!c) continue;
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc((o.x + 0.5) * scale, (o.y + 0.5) * scale, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1; ctx.stroke();
    }
    for (const h of Object.values(s.heroes)) {
      if (h.inTavern || !p.fog[h.y * m.w + h.x]) continue;
      ctx.fillStyle = s.players[h.owner].color; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc((h.x + 0.5) * scale, (h.y + 0.5) * scale, scale * 1.8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    // viewport
    const r = this.r;
    ctx.strokeStyle = '#ffe28a'; ctx.lineWidth = 1.5;
    ctx.strokeRect(r.cam.x / 64 * scale, r.cam.y / 64 * scale, r.w / r.cam.zoom / 64 * scale, r.h / r.cam.zoom / 64 * scale);
    let closeFn = null;
    cv.addEventListener('click', (e) => {
      const rc = cv.getBoundingClientRect();
      const tx = Math.floor((e.clientX - rc.left) / scale), ty = Math.floor((e.clientY - rc.top) / scale);
      this.r.centerOn(tx, ty);
      if (closeFn) closeFn(null);
    });
    dlg({ title: 'Kort', body: el('div', { style: { width: '100%', textAlign: 'center' } }, cv, el('div.muted.small', 'Tryk på kortet for at flytte udsynet.')), buttons: [{ label: 'Luk', value: null }], init: (c) => { closeFn = c; } });
  }

  select(h, center = true) {
    this.selected = h ? h.id : null;
    this.r.selected = this.selected;
    this.path = null; this.r.path = null;
    if (h && center) this.r.centerOn(h.x, h.y);
    this.refresh();
  }
  nextHero() {
    const hs = heroesOf(0).filter((h) => h.movement > 0);
    if (!hs.length) { toast('Ingen helte har bevægelse tilbage'); return; }
    const idx = hs.findIndex((h) => h.id === this.selected);
    this.select(hs[(idx + 1) % hs.length]);
  }

  // -------- input --------
  bindInput() {
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => {
      c.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 1) this.drag = { x: e.clientX, y: e.clientY, moved: false, camX: this.r.cam.x, camY: this.r.cam.y };
      else if (this.pointers.size === 2) { const [a, b] = [...this.pointers.values()]; this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), zoom: this.r.cam.zoom, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; this.drag = null; }
    });
    c.addEventListener('pointermove', (e) => {
      if (!this.pointers.has(e.pointerId)) return;
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 2 && this.pinch) {
        const [a, b] = [...this.pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const rect = c.getBoundingClientRect();
        const mx = (a.x + b.x) / 2 - rect.left, my = (a.y + b.y) / 2 - rect.top;
        const factor = (d / this.pinch.d) * this.pinch.zoom / this.r.cam.zoom;
        this.r.zoomAt(mx, my, factor);
        this.r.cam.x -= (mx - (this.pinch.mx - rect.left)) / this.r.cam.zoom; this.r.cam.y -= (my - (this.pinch.my - rect.top)) / this.r.cam.zoom;
        this.pinch.mx = mx + rect.left; this.pinch.my = my + rect.top; this.r.clampCam();
        return;
      }
      if (this.drag) {
        const dx = e.clientX - this.drag.x, dy = e.clientY - this.drag.y;
        if (!this.drag.moved && Math.hypot(dx, dy) > 8) this.drag.moved = true;
        if (this.drag.moved) { this.r.cam.x = this.drag.camX - dx / this.r.cam.zoom; this.r.cam.y = this.drag.camY - dy / this.r.cam.zoom; this.r.clampCam(); }
      }
    });
    const up = (e) => {
      const wasTap = this.drag && !this.drag.moved && this.pointers.size === 1;
      this.pointers.delete(e.pointerId);
      if (this.pointers.size < 2) this.pinch = null;
      if (wasTap) { const rect = c.getBoundingClientRect(); this.tap(e.clientX - rect.left, e.clientY - rect.top); }
      if (this.pointers.size === 0) this.drag = null;
    };
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
    c.addEventListener('wheel', (e) => { e.preventDefault(); const rect = c.getBoundingClientRect(); this.r.zoomAt(e.clientX - rect.left, e.clientY - rect.top, e.deltaY < 0 ? 1.15 : 1 / 1.15); }, { passive: false });
  }

  tap(sx, sy) {
    if (this.busy || !G.s || G.s.current !== 0) return;
    const [tx, ty] = this.r.screenToTile(sx, sy);
    const s = G.s, m = s.map;
    if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) return;
    const p = human();
    if (!p.fog[ty * m.w + tx]) { toast('Uudforsket land'); return; }
    const h = this.selected ? s.heroes[this.selected] : null;
    const hAt = heroAt(tx, ty);
    const o = objAt(tx, ty);
    // Confirm move
    if (h && this.path && this.path.length && this.path[this.path.length - 1].x === tx && this.path[this.path.length - 1].y === ty) {
      this.moveSelected();
      return;
    }
    if (hAt && hAt.owner === 0) {
      if (h && h.id === hAt.id) {
        // tapping own selected hero: open town if standing in one, else hero screen
        if (o && o.type === OBJ.TOWN && o.owner === 0) this.app.openTown(o).then(() => this.refresh());
        else this.app.openHero(h).then(() => this.refresh());
        return;
      }
      this.select(hAt, false);
      return;
    }
    if (!h) {
      if (o && o.type === OBJ.TOWN && o.owner === 0) { this.app.openTown(o).then(() => this.refresh()); return; }
      this.describe(o, hAt);
      return;
    }
    // Plan a path
    const path = heroPath(h, tx, ty);
    if (!path || !path.length) { this.path = null; this.r.path = null; this.describe(o, hAt); if (!o && !hAt) toast('Kan ikke nå dertil'); return; }
    const days = pathDays(h, path);
    this.path = path.map((st, i) => ({ ...st, day: days[i] }));
    this.r.path = this.path;
    const cost = path[path.length - 1].g;
    let name = o ? objectName(o) : hAt ? `${hAt.name} (${s.players[hAt.owner].name})` : null;
    if (o && o.type === OBJ.MONSTER) name += ' – angrib';
    const g = !o && !hAt ? guardAt(tx, ty) : null;
    if (g) name = `Bevogtet af ${UNITS[g.unit].plural}!`;
    toast((name ? name + ' · ' : '') + (days[days.length - 1] === 0 ? 'Tryk igen for at gå' : `${days[days.length - 1] + 1} dage · tryk igen`), 2500);
  }

  describe(o, hAt) {
    if (hAt) { toast(`${hAt.name} – ${G.s.players[hAt.owner].name}, niveau ${hAt.level}`); return; }
    if (!o) return;
    let t = objectName(o);
    if (o.type === OBJ.MINE || o.type === OBJ.DWELLING || o.type === OBJ.TOWN) t += ` (${ownerName(o)})`;
    if (OBJ_INFO[o.type]) t += ` – ${OBJ_INFO[o.type].desc}`;
    if (o.type === OBJ.DWELLING) t += ` – ${o.available} tilgængelige`;
    toast(t, 3000);
  }

  async moveSelected() {
    const h = G.s.heroes[this.selected];
    if (!h || !this.path) return;
    const path = this.path;
    this.path = null; this.r.path = null;
    this.busy = true;
    try {
      const res = await moveHeroAlong(h, path, this.app.io);
      if (res === 'dead') { this.selected = null; this.r.selected = null; }
      else if (res === 'out_of_moves') toast('Ikke mere bevægelse i dag');
    } catch (e) { console.error(e); toast('Fejl: ' + e.message); }
    this.busy = false;
    if (G.s.heroes[this.selected]) this.r.selected = this.selected;
    this.refresh();
    this.r.invalidateFog();
    await this.app.checkEnd();
  }

  async endTurn() {
    if (this.busy || G.s.current !== 0) return;
    const left = heroesOf(0).filter((h) => h.movement > (h.maxMovement || 1) * 0.5);
    if (left.length) {
      const ok = await confirm('Afslut tur?', `${left.map((h) => h.name).join(', ')} kan stadig bevæge sig. Afslut alligevel?`);
      if (!ok) return;
    }
    this.busy = true;
    this.path = null; this.r.path = null;
    saveGame();
    try {
      await endTurn(this.app.io);
    } catch (e) { console.error(e); toast('Fejl i AI-tur: ' + e.message); }
    this.busy = false;
    this.r.invalidateFog();
    this.refresh();
    if (!(await this.app.checkEnd())) {
      saveGame();
      const d = ordinalDay(G.s.day);
      toast(`Dag ${d.d}, uge ${d.w}, måned ${d.m}` + (d.d === 1 ? ' – ny uge: nye rekrutter!' : ''), 2000);
      // select first hero with movement
      const hs = heroesOf(0);
      if (hs.length && !(this.selected && G.s.heroes[this.selected])) this.select(hs[0]);
    }
  }
}
