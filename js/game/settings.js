// Player preferences that live outside the save game (persisted in localStorage).
const KEY = 'tsj_settings';
const DEFAULTS = { animSpeed: 'normal' };
export const ANIM_SPEEDS = { slow: { name: 'Langsom', mult: 0.55, icon: '🐢' }, normal: { name: 'Normal', mult: 1, icon: '▶' }, fast: { name: 'Hurtig', mult: 1.9, icon: '⏩' } };
let cache = null;
function load() { if (cache) return cache; try { cache = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { cache = { ...DEFAULTS }; } return cache; }
export function getSetting(k) { return load()[k]; }
export function setSetting(k, v) { load()[k] = v; try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* ignore */ } }
export function animMult() { const s = ANIM_SPEEDS[getSetting('animSpeed')] || ANIM_SPEEDS.normal; return s.mult; }
export function cycleAnimSpeed() { const keys = Object.keys(ANIM_SPEEDS); const i = keys.indexOf(getSetting('animSpeed')); const next = keys[(i + 1) % keys.length]; setSetting('animSpeed', next); return next; }
export function animLabel() { const s = ANIM_SPEEDS[getSetting('animSpeed')] || ANIM_SPEEDS.normal; return `${s.icon} ${s.name}`; }
