// Service worker: cache-first for app files so the game works offline once installed.
const VERSION = 'tsj-v1.2.0';
const FILES = [
  './', './index.html', './manifest.webmanifest', './css/style.css', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png',
  './js/main.js',
  './js/core/rng.js', './js/core/noise.js', './js/core/utils.js',
  './js/data/resources.js', './js/data/terrain.js', './js/data/factions.js', './js/data/units.js', './js/data/skills.js', './js/data/heroes.js', './js/data/spells.js', './js/data/artifacts.js', './js/data/buildings.js', './js/data/objects.js',
  './js/map/pathfinding.js', './js/map/mapgen.js',
  './js/game/state.js', './js/game/fog.js', './js/game/hero.js', './js/game/town.js', './js/game/movement.js', './js/game/actions.js', './js/game/turn.js', './js/game/save.js',
  './js/combat/hex.js', './js/combat/battle.js', './js/combat/battleAI.js', './js/combat/runner.js',
  './js/ai/ai.js',
  './js/render/draw.js', './js/render/figures.js', './js/render/sprites.js', './js/render/portraits.js', './js/render/icons.js', './js/render/adventure.js', './js/render/battleRender.js', './js/render/scenes.js', './js/render/assets.js',
  './js/ui/dialogs.js', './js/ui/common.js', './js/ui/battleScreen.js', './js/ui/heroScreen.js', './js/ui/townScreen.js', './js/ui/hud.js', './js/ui/io.js', './js/ui/menu.js',
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) {
    // fonts etc: network first, fall back to cache
    e.respondWith(fetch(e.request).then((r) => { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request).then((cached) => cached || fetch(e.request).then((r) => { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); return r; })));
});
