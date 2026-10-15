// Spell definitions. power = hero spell power.
const s = (id, o) => ({ id, ...o });
export const SPELLS = {
  magic_arrow: s('magic_arrow', { name: 'Magisk Pil', level: 1, cost: 5, target: 'enemy', kind: 'damage', dmg: (p) => 10 + 10 * p,
    desc: 'En pil af rent lys rammer én fjendtlig flok.', icon: { c: '#8fd3ff', g: 'arrow' } }),
  haste: s('haste', { name: 'Hast', level: 1, cost: 6, target: 'ally', kind: 'buff', effect: { speed: 3 }, duration: (p) => Math.max(1, p),
    desc: '+3 hastighed til én egen flok.', icon: { c: '#9fe0ff', g: 'wind' } }),
  slow: s('slow', { name: 'Langsom', level: 1, cost: 6, target: 'enemy', kind: 'debuff', effect: { speed: -3 }, duration: (p) => Math.max(1, p),
    desc: '-3 hastighed til én fjendtlig flok (min. 1).', icon: { c: '#a08060', g: 'chain' } }),
  bless: s('bless', { name: 'Velsignelse', level: 1, cost: 5, target: 'ally', kind: 'buff', effect: { dmgMode: 'max' }, duration: (p) => Math.max(1, p),
    desc: 'Egen flok gør altid maksimal skade.', icon: { c: '#ffe080', g: 'sun' } }),
  curse: s('curse', { name: 'Forbandelse', level: 1, cost: 6, target: 'enemy', kind: 'debuff', effect: { dmgMode: 'min' }, duration: (p) => Math.max(1, p),
    desc: 'Fjendtlig flok gør altid minimal skade.', icon: { c: '#b060e0', g: 'skull' } }),
  stone_skin: s('stone_skin', { name: 'Stenhud', level: 1, cost: 5, target: 'ally', kind: 'buff', effect: { defense: 3 }, duration: (p) => Math.max(1, p),
    desc: '+3 forsvar til én egen flok.', icon: { c: '#b0a890', g: 'shield' } }),
  cure: s('cure', { name: 'Helbred', level: 1, cost: 6, target: 'ally', kind: 'heal', heal: (p) => 10 + 5 * p, cleanse: true,
    desc: 'Heler den øverste enhed og fjerner forbandelser.', icon: { c: '#a0ffb0', g: 'leaf' } }),

  fireball: s('fireball', { name: 'Ildkugle', level: 2, cost: 15, target: 'enemy', kind: 'damage', area: 1, dmg: (p) => 15 + 10 * p,
    desc: 'Rammer målet og alle tilstødende felter.', icon: { c: '#ff8040', g: 'fire' } }),
  weakness: s('weakness', { name: 'Svaghed', level: 2, cost: 8, target: 'enemy', kind: 'debuff', effect: { attack: -3 }, duration: (p) => Math.max(1, p),
    desc: '-3 angreb til én fjendtlig flok.', icon: { c: '#8080a0', g: 'down' } }),
  bloodlust: s('bloodlust', { name: 'Blodtørst', level: 2, cost: 5, target: 'ally', kind: 'buff', effect: { attack: 3 }, duration: (p) => Math.max(1, p),
    desc: '+3 angreb til én egen flok.', icon: { c: '#ff5050', g: 'up' } }),
  shield: s('shield', { name: 'Skjold', level: 2, cost: 5, target: 'ally', kind: 'buff', effect: { meleeReduce: 0.15 }, duration: (p) => Math.max(1, p),
    desc: 'Egen flok tager 15% mindre nærkampsskade.', icon: { c: '#c0c0e0', g: 'shield' } }),
  air_shield: s('air_shield', { name: 'Luftskjold', level: 2, cost: 12, target: 'ally', kind: 'buff', effect: { rangedReduce: 0.25 }, duration: (p) => Math.max(1, p),
    desc: 'Egen flok tager 25% mindre skudskade.', icon: { c: '#d0f0ff', g: 'wind' } }),

  lightning: s('lightning', { name: 'Lynslag', level: 3, cost: 10, target: 'enemy', kind: 'damage', dmg: (p) => 25 + 25 * p,
    desc: 'Et lyn fra himlen rammer én fjendtlig flok.', icon: { c: '#ffff80', g: 'bolt' } }),
  mass_slow: s('mass_slow', { name: 'Mudderets Greb', level: 3, cost: 16, target: 'all_enemies', kind: 'debuff', effect: { speed: -3 }, duration: (p) => Math.max(1, p),
    desc: '-3 hastighed til alle fjender.', icon: { c: '#806040', g: 'chain' } }),
  mass_haste: s('mass_haste', { name: 'Vindens Vinger', level: 3, cost: 16, target: 'all_allies', kind: 'buff', effect: { speed: 3 }, duration: (p) => Math.max(1, p),
    desc: '+3 hastighed til hele hæren.', icon: { c: '#c0f0ff', g: 'wind' } }),

  chain_lightning: s('chain_lightning', { name: 'Kædelyn', level: 4, cost: 24, target: 'enemy', kind: 'damage', chain: 3, dmg: (p) => 25 + 40 * p,
    desc: 'Rammer målet og springer til 3 nærmeste flokke med halv skade.', icon: { c: '#e0ff80', g: 'bolt' } }),
  resurrect: s('resurrect', { name: 'Genopstandelse', level: 4, cost: 20, target: 'ally', kind: 'resurrect', heal: (p) => 40 * p,
    desc: 'Genopliver faldne i egen flok.', icon: { c: '#ffffff', g: 'sun' } }),
  mass_bless: s('mass_bless', { name: 'Lorens Velsignelse', level: 4, cost: 18, target: 'all_allies', kind: 'buff', effect: { dmgMode: 'max' }, duration: (p) => Math.max(1, p),
    desc: 'Hele hæren gør maksimal skade.', icon: { c: '#ffe8a0', g: 'sun' } }),

  meteor: s('meteor', { name: 'Gorks Fod', level: 5, cost: 30, target: 'enemy', kind: 'damage', area: 1, dmg: (p) => 25 + 50 * p,
    desc: 'En enorm fod fra himlen knuser målet og omgivelserne.', icon: { c: '#ff6030', g: 'fire' } }),
  mass_curse: s('mass_curse', { name: 'Morks Forbandelse', level: 5, cost: 24, target: 'all_enemies', kind: 'debuff', effect: { attack: -3, dmgMode: 'min' }, duration: (p) => Math.max(1, p),
    desc: 'Alle fjender gør minimal skade og mister 3 angreb.', icon: { c: '#a040c0', g: 'skull' } }),
};
export const SPELL_IDS = Object.keys(SPELLS);
export function spellsOfLevel(l) { return SPELL_IDS.filter((id) => SPELLS[id].level === l); }
export const GUILD_SLOTS = [0, 3, 3, 2, 2, 1];
