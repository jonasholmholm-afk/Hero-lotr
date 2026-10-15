import { G } from './state.js';
import { RNG } from '../core/rng.js';

const KEY = 'tsj_save_v1';

function encode(obj) {
  return JSON.stringify(obj, (k, v) => {
    if (v instanceof Uint8Array) return { __u8: Array.from(v) };
    if (v instanceof Int32Array) return { __i32: Array.from(v) };
    return v;
  });
}
function decode(str) {
  return JSON.parse(str, (k, v) => {
    if (v && typeof v === 'object') {
      if (v.__u8) return Uint8Array.from(v.__u8);
      if (v.__i32) return Int32Array.from(v.__i32);
    }
    return v;
  });
}
export function saveGame(slot = 'auto') {
  if (!G.s) return false;
  try {
    G.s.rngState = G.rng.state;
    G.s.savedAt = Date.now();
    localStorage.setItem(KEY + ':' + slot, encode(G.s));
    return true;
  } catch (e) { console.warn('save failed', e); return false; }
}
export function loadGame(slot = 'auto') {
  try {
    const str = localStorage.getItem(KEY + ':' + slot);
    if (!str) return null;
    const s = decode(str);
    G.s = s;
    G.rng = new RNG(1);
    G.rng.state = s.rngState || 1;
    return s;
  } catch (e) { console.warn('load failed', e); return null; }
}
export function hasSave(slot = 'auto') {
  try { return !!localStorage.getItem(KEY + ':' + slot); } catch { return false; }
}
export function saveInfo(slot = 'auto') {
  try {
    const str = localStorage.getItem(KEY + ':' + slot);
    if (!str) return null;
    const m = str.match(/"day":(\d+)/);
    const f = str.match(/"playerFaction":"(\w+)"/);
    return { day: m ? +m[1] : '?', faction: f ? f[1] : '?' };
  } catch { return null; }
}
export function deleteSave(slot = 'auto') {
  try { localStorage.removeItem(KEY + ':' + slot); } catch { /* ignore */ }
}
