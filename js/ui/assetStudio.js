// Grafikværksted: import your own images per slot, preview them in game size,
// copy prompts and export everything as a ZIP for the repository.
import { el } from '../core/utils.js';
import { buildCatalog, buildSheets, CATEGORIES, STYLE, NEGATIVE } from '../data/assetCatalog.js';
import { hasAsset, isUserAsset, assetImage, importAsset, importSheet, removeAsset, clearUserAssets, exportZip } from '../render/assets.js';
import { clearArtCaches } from '../render/cacheControl.js';
import { figure } from '../render/figures.js';
import { portrait } from '../render/portraits.js';
import { decorSprite, objectSprite, townSprite, heroSprite, tileTexture } from '../render/sprites.js';
import { UNITS } from '../data/units.js';
import { buildingIcon, spellIcon, artifactIcon, skillIcon } from '../render/icons.js';
import { D } from '../data/terrain.js';
import { dialog, toast, confirm } from './dialogs.js';

const DECOR_IDS = { pine: D.PINE, leafy: D.LEAFY, golden: D.GOLDEN, dead: D.DEAD, mountain: D.MOUNTAIN, rock: D.ROCK, flowers: D.FLOWERS, mushroom: D.MUSHROOM, stump: D.STUMP, reeds: D.REEDS, snowpine: D.SNOWPINE, bush: D.BUSH, pebbles: D.PEBBLES };
const TERRAIN_IDS = { water: 0, grass: 1, dirt: 2, rough: 3, swamp: 4, snow: 5, ash: 6 };

function previewCanvas(slot) {
  const [cat, id] = slot.key.split('/');
  try {
    switch (cat) {
      case 'units': return figure(UNITS[id], 96);
      case 'portraits': return portrait(id, 64);
      case 'heroes': return heroSprite(id, id === 'elves' ? '#4fbf6a' : '#d9452f');
      case 'towns': return townSprite(id, 2, null);
      case 'objects': {
        if (id.startsWith('mine_')) return objectSprite({ type: 'mine', res: id.slice(5) }, null);
        if (id.startsWith('resource_')) return objectSprite({ type: 'resource', res: id.slice(9) }, null);
        if (id.startsWith('dwelling_')) return objectSprite({ type: 'dwelling', unit: id.slice(9) }, null);
        return objectSprite({ type: id }, null);
      }
      case 'decor': return decorSprite(DECOR_IDS[id], 0);
      case 'terrain': return tileTexture(TERRAIN_IDS[id], 96);
      case 'buildings': { const fac = id.split('_')[0]; const bid = id.slice(fac.length + 1); return buildingIcon(bid === 'mage' ? 'mage1' : bid, fac, 88); }
      case 'spells': return spellIcon(id, 64);
      case 'artifacts': return artifactIcon(id, 64);
      case 'skills': return skillIcon(id, 64);
    }
  } catch (e) { console.warn(e); }
  return null;
}

export function openAssetStudio(app) {
  return new Promise((resolve) => {
    const root = document.getElementById('studio');
    const catalog = buildCatalog();
    let filter = CATEGORIES[0];
    const refreshGame = () => { clearArtCaches(); if (app.renderer) app.renderer.invalidateAll(); };
    const render = () => {
      root.innerHTML = '';
      const nUser = catalog.filter((s) => isUserAsset(s.key)).length;
      root.append(el('div.screen-head',
        el('button.btn.back', { onclick: () => { refreshGame(); app.showScreen(app.studioReturn || 'menu'); if (app.studioReturn === 'menu') app.renderMenu(); resolve(); } }, '‹ Tilbage'),
        el('h1', 'Grafikværksted'), el('div.head-sub', `${nUser} egne billeder i brug · ${catalog.length} pladser`)));
      root.append(el('div.notice', { html: `<b>Sådan gør du:</b> Kopiér prompten for en plads, lav billedet i en billed-AI (med magenta baggrund hvor det står), gem det på telefonen og tryk <b>Vælg billede</b>. Baggrunden fjernes og billedet beskæres automatisk. Billederne gemmes på denne enhed med det samme. Tryk <b>Download ZIP</b> for at få alle filer plus <code>manifest.json</code>, som lægges i <code>assets/</code> i repoet, så de følger med til andre enheder.` }));
      const tools = el('div.studio-tools');
      tools.append(el('button.btn.small', { onclick: () => copy(STYLE, 'Fælles stil kopieret') }, '📋 Kopiér fælles stil'));
      tools.append(el('button.btn.small', { onclick: () => copy(NEGATIVE, 'Negativ prompt kopieret') }, '📋 Negativ prompt'));
      tools.append(el('button.btn.small.primary', { onclick: async () => {
        const blob = await exportZip();
        const a = el('a', { href: URL.createObjectURL(blob), download: 'assets.zip' }); document.body.append(a); a.click(); a.remove();
        toast('ZIP hentes – pak den ud i assets/ i repoet');
      } }, '⬇ Download ZIP'));
      tools.append(el('button.btn.small.danger', { onclick: async () => { if (await confirm('Fjern alle egne billeder?', 'Spillet går tilbage til den tegnede grafik på denne enhed.')) { await clearUserAssets(); refreshGame(); render(); } } }, 'Nulstil alle'));
      root.append(tools);
      // sheet import (5 subjects per image)
      const sheets = buildSheets();
      const sel = el('select.sheet-select');
      for (const sh of sheets) sel.append(el('option', { value: sh.id }, `${sh.id}: ${sh.slots.map((x) => x.label).join(', ')}`));
      const sheetInput = el('input', { type: 'file', accept: 'image/*', style: { display: 'none' }, onchange: async (e) => {
        const f = e.target.files[0]; if (!f) return;
        const sh = sheets.find((x) => x.id === sel.value);
        toast('Deler arket op…', 2000);
        const n = await importSheet(f, sh);
        refreshGame(); toast(`${n} billeder importeret fra ${sh.id}`, 2000, 'good'); filter = sh.category; render();
      } });
      root.append(el('div.card.sheet-box', el('div.card-title', 'Importér ark (5 motiver pr. billede)'), el('div.muted.small', 'Vælg hvilket ark billedet svarer til, og vælg billedet. Det deles automatisk op fra venstre mod højre.'),
        el('div.studio-row', sel, el('button.btn.small.primary', { onclick: () => sheetInput.click() }, 'Vælg ark-billede'), el('button.btn.small', { onclick: () => copy(sheets.find((x) => x.id === sel.value).prompt, 'Ark-prompt kopieret') }, '📋 Ark-prompt'), sheetInput)));
      const tabs = el('div.tabs');
      for (const c of CATEGORIES) tabs.append(el('button.tab' + (filter === c ? '.active' : ''), { onclick: () => { filter = c; render(); } }, `${c} (${catalog.filter((s) => s.category === c && hasAsset(s.key)).length}/${catalog.filter((s) => s.category === c).length})`));
      root.append(tabs);
      const grid = el('div.studio-grid');
      for (const slot of catalog.filter((s) => s.category === filter)) grid.append(slotCard(slot));
      root.append(el('div.tab-content', grid));
    };
    const copy = async (text, msg) => { try { await navigator.clipboard.writeText(text); toast(msg || 'Kopieret'); } catch { dialog({ title: 'Kopiér prompt', body: el('textarea.prompt-box', { readonly: true }, text) }); } };
    const slotCard = (slot) => {
      const card = el('div.card.studio-card');
      const prev = el('div.studio-preview' + (slot.keying ? '' : '.square'));
      const own = hasAsset(slot.key);
      const img = own ? assetImage(slot.key) : previewCanvas(slot);
      if (img) { const im = el('img', { src: img.toDataURL ? img.toDataURL() : img.src, draggable: false }); prev.append(im); }
      prev.append(el('span.studio-badge' + (own ? '.own' : ''), own ? (isUserAsset(slot.key) ? 'Eget billede' : 'Fra repo') : 'Tegnet'));
      card.append(prev);
      card.append(el('div.card-title', slot.label), el('div.muted.small', `${slot.key}.png · ${slot.size[0]}×${slot.size[1]}${slot.keying ? ' · magenta baggrund' : ''}`));
      const input = el('input', { type: 'file', accept: 'image/*', style: { display: 'none' }, onchange: async (e) => {
        const f = e.target.files[0]; if (!f) return;
        toast('Behandler billede…', 1500);
        const ok = await importAsset(slot.key, f, slot);
        if (ok) { refreshGame(); toast(`${slot.label} opdateret`, 1500, 'good'); render(); } else toast('Kunne ikke læse billedet');
      } });
      const row = el('div.studio-row');
      row.append(el('button.btn.small.primary', { onclick: () => input.click() }, own ? 'Skift billede' : 'Vælg billede'));
      row.append(el('button.btn.small', { onclick: () => copy(slot.prompt, 'Prompt kopieret') }, '📋 Prompt'));
      if (isUserAsset(slot.key)) row.append(el('button.btn.small.danger', { onclick: async () => { await removeAsset(slot.key); refreshGame(); render(); } }, '✕'));
      row.append(input);
      card.append(row);
      card.append(el('details.prompt-details', el('summary', 'Vis prompt'), el('div.prompt-text', slot.prompt)));
      return card;
    };
    render();
    app.showScreen('studio');
  });
}
