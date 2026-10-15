export const RES = ['gold', 'wood', 'ore', 'mithril', 'warpstone', 'gems'];
export const RARE = ['mithril', 'warpstone', 'gems'];
export const RES_INFO = {
  gold: { name: 'Guld', color: '#f1c75b', dark: '#9a7120' },
  wood: { name: 'Tømmer', color: '#a9743f', dark: '#5c3a1a' },
  ore: { name: 'Malm', color: '#9aa3ad', dark: '#4e555e' },
  mithril: { name: 'Mithril', color: '#c7ecff', dark: '#5f9fc2' },
  warpstone: { name: 'Warpsten', color: '#7dff5e', dark: '#2a8f1b' },
  gems: { name: 'Ædelsten', color: '#e86ad8', dark: '#8c2f82' },
};
export const MINE_NAMES = {
  gold: 'Guldmine', wood: 'Savværk', ore: 'Malmmine',
  mithril: 'Mithril-mine', warpstone: 'Warpstensbrud', gems: 'Ædelstensmine',
};
export const MINE_INCOME = { gold: 1000, wood: 2, ore: 2, mithril: 1, warpstone: 1, gems: 1 };

export function costStr(cost) {
  return RES.filter((r) => cost[r]).map((r) => `${cost[r]} ${RES_INFO[r].name}`).join(', ');
}
export function canAfford(res, cost) {
  return RES.every((r) => (res[r] || 0) >= (cost[r] || 0));
}
export function pay(res, cost) {
  for (const r of RES) if (cost[r]) res[r] -= cost[r];
}
export function addRes(res, cost, mult = 1) {
  for (const r of RES) if (cost[r]) res[r] = (res[r] || 0) + cost[r] * mult;
}
export function mulCost(cost, n) {
  const o = {};
  for (const r of RES) if (cost[r]) o[r] = cost[r] * n;
  return o;
}
