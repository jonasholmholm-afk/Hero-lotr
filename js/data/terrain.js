export const T = {
  WATER: 0, GRASS: 1, DIRT: 2, ROUGH: 3, SWAMP: 4, SNOW: 5, ASH: 6,
};
export const TERRAIN_INFO = [
  { id: 0, name: 'Vand', cost: Infinity, base: '#25507a', passable: false },
  { id: 1, name: 'Græsland', cost: 100, base: '#4f8a3a', passable: true },
  { id: 2, name: 'Jord', cost: 100, base: '#8a6a3c', passable: true },
  { id: 3, name: 'Ujævnt', cost: 125, base: '#8c7d5e', passable: true },
  { id: 4, name: 'Sump', cost: 175, base: '#4e6a3e', passable: true },
  { id: 5, name: 'Sne', cost: 150, base: '#d7e2ea', passable: true },
  { id: 6, name: 'Askeland', cost: 125, base: '#4a4544', passable: true },
];
// Native terrain gives no movement penalty for the faction.
export const NATIVE = { elves: [1], orcs: [3, 6] };

export const D = {
  NONE: 0, PINE: 1, LEAFY: 2, GOLDEN: 3, DEAD: 4, MOUNTAIN: 5, ROCK: 6,
  FLOWERS: 7, MUSHROOM: 8, BLOCK: 9, STUMP: 10, REEDS: 11, SNOWPINE: 12,
};
export const DECOR_BLOCKS = new Set([D.PINE, D.LEAFY, D.GOLDEN, D.DEAD, D.MOUNTAIN, D.ROCK, D.BLOCK, D.SNOWPINE]);
export const ROAD_COST = 65;
