export const SKILL_LEVELS = ['', 'Basis', 'Avanceret', 'Ekspert'];
export const SKILLS = {
  logistics: { name: 'Logistik', vals: [0, 0.1, 0.2, 0.3], desc: (v) => `+${v * 100}% bevægelse på land.` },
  pathfinding: { name: 'Stifinder', vals: [0, 0.25, 0.5, 0.75], desc: (v) => `Terrænstraf reduceres med ${v * 100}%.` },
  scouting: { name: 'Spejder', vals: [0, 1, 2, 3], desc: (v) => `+${v} synsvidde.` },
  offense: { name: 'Angreb', vals: [0, 0.1, 0.2, 0.3], desc: (v) => `+${v * 100}% nærkampsskade.` },
  archery: { name: 'Bueskydning', vals: [0, 0.1, 0.25, 0.5], desc: (v) => `+${v * 100}% skudskade.` },
  armorer: { name: 'Rustning', vals: [0, 0.05, 0.1, 0.15], desc: (v) => `Hæren tager ${v * 100}% mindre skade.` },
  leadership: { name: 'Lederskab', vals: [0, 1, 2, 3], desc: (v) => `+${v} moral.` },
  luck: { name: 'Held', vals: [0, 1, 2, 3], desc: (v) => `+${v} held.` },
  wisdom: { name: 'Visdom', vals: [2, 3, 4, 5], desc: (v) => `Kan lære besværgelser op til niveau ${v}.` },
  mysticism: { name: 'Mystik', vals: [1, 2, 3, 4], desc: (v) => `Genvinder ${v} mana pr. dag.` },
  intelligence: { name: 'Intelligens', vals: [0, 0.25, 0.5, 1], desc: (v) => `+${v * 100}% maksimal mana.` },
  learning: { name: 'Lærdom', vals: [0, 0.05, 0.1, 0.15], desc: (v) => `+${v * 100}% erfaring.` },
  estates: { name: 'Godser', vals: [0, 125, 250, 500], desc: (v) => `+${v} guld pr. dag.` },
  sorcery: { name: 'Trolddom', vals: [0, 0.05, 0.1, 0.15], desc: (v) => `+${v * 100}% skade fra besværgelser.` },
};
export const SKILL_IDS = Object.keys(SKILLS);
export function skillVal(hero, id) {
  const lvl = (hero.skills && hero.skills[id]) || 0;
  return SKILLS[id].vals[lvl];
}
// Weighted preferences by hero class type when offering new skills on level-up.
export const SKILL_WEIGHTS = {
  might: { logistics: 5, pathfinding: 3, scouting: 3, offense: 6, archery: 4, armorer: 5, leadership: 5, luck: 4, wisdom: 2, mysticism: 1, intelligence: 1, learning: 3, estates: 3, sorcery: 1 },
  magic: { logistics: 3, pathfinding: 2, scouting: 3, offense: 2, archery: 2, armorer: 3, leadership: 3, luck: 3, wisdom: 7, mysticism: 5, intelligence: 5, learning: 3, estates: 3, sorcery: 6 },
};
