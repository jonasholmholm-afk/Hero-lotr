// Creature definitions. Stats loosely follow the HoMM3 scale.
// value: rough AI fight value used for map balancing and AI decisions.
const u = (id, o) => ({ id, plural: o.name, abilities: [], shots: 0, ...o });

export const UNITS = {
  // ---------------- Skovelvere ----------------
  dryad: u('dryad', {
    name: 'Dryade', plural: 'Dryader', faction: 'elves', tier: 1,
    attack: 4, defense: 5, dmg: [1, 3], hp: 8, speed: 5, growth: 12,
    cost: { gold: 50 }, value: 60,
    lore: 'Skovens ånder, vækket af Athel Lorens ældgamle sange. Svage alene – farlige i flok.',
    art: { shape: 'dryad', c1: '#3f7d3a', c2: '#8fd07a', c3: '#f1f7c8' },
  }),
  glade_guard: u('glade_guard', {
    name: 'Lysningsvogter', plural: 'Lysningsvogtere', faction: 'elves', tier: 2,
    attack: 6, defense: 3, dmg: [2, 4], hp: 10, speed: 6, growth: 9, shots: 24,
    abilities: ['ranged'], cost: { gold: 120 }, value: 130,
    lore: 'Elverbueskytter fra lysningerne. Deres pile finder vej gennem selv den tætteste rustning.',
    art: { shape: 'humanoid', weapon: 'bow', hood: true, c1: '#2f5d3a', c2: '#cdb46e', c3: '#f5e7b9' },
  }),
  eternal_guard: u('eternal_guard', {
    name: 'Evig Garde', plural: 'Evige Gardere', faction: 'elves', tier: 3,
    attack: 8, defense: 10, dmg: [3, 5], hp: 25, speed: 5, growth: 7,
    abilities: ['bulwark'], cost: { gold: 200 }, value: 240,
    lore: 'Spydvogtere der har svoret aldrig at vige. Når de forsvarer, står de som gamle ege.',
    art: { shape: 'humanoid', weapon: 'spear', shield: true, c1: '#2a4f6e', c2: '#d8c37a', c3: '#efe3b5' },
  }),
  wardancer: u('wardancer', {
    name: 'Krigsdanser', plural: 'Krigsdansere', faction: 'elves', tier: 4,
    attack: 11, defense: 8, dmg: [5, 9], hp: 35, speed: 8, growth: 5,
    abilities: ['no_retaliation'], cost: { gold: 350 }, value: 450,
    lore: 'Loecs udvalgte. De danser gennem fjendens rækker, og ingen når at slå igen.',
    art: { shape: 'humanoid', weapon: 'twinblades', c1: '#6b3f8c', c2: '#e2b9ff', c3: '#f6e6c0' },
  }),
  wild_rider: u('wild_rider', {
    name: 'Vild Rytter', plural: 'Vilde Ryttere', faction: 'elves', tier: 5,
    attack: 14, defense: 10, dmg: [10, 16], hp: 55, speed: 10, growth: 4,
    abilities: ['charge'], cost: { gold: 600 }, value: 850,
    lore: 'Kurnous jægere på hjorteryg. Jo længere angrebsløb, desto hårdere rammer de.',
    art: { shape: 'rider', mount: 'stag', weapon: 'spear', c1: '#7a5a2e', c2: '#3b6e3a', c3: '#e9d89a' },
  }),
  great_eagle: u('great_eagle', {
    name: 'Storørn', plural: 'Storørne', faction: 'elves', tier: 6,
    attack: 16, defense: 13, dmg: [15, 25], hp: 90, speed: 13, growth: 3,
    abilities: ['flying'], cost: { gold: 1000, gems: 1 }, value: 1600,
    lore: 'Manwës ørne fra Tågebjergene. De flyver over enhver hindring og slår til fra himlen.',
    art: { shape: 'eagle', c1: '#6e4a2a', c2: '#e9d9b8', c3: '#f3b43f' },
  }),
  treeman: u('treeman', {
    name: 'Ent', plural: 'Enter', faction: 'elves', tier: 7,
    attack: 22, defense: 24, dmg: [30, 50], hp: 220, speed: 5, growth: 2,
    abilities: ['bark'], cost: { gold: 3000, mithril: 2 }, value: 4500,
    lore: 'Skovens hyrder, ældre end kongeriger. Pile sidder fast i deres bark; intet standser deres vrede.',
    art: { shape: 'treeman', c1: '#5a3d22', c2: '#4b8a3b', c3: '#9ad56a' },
  }),

  // ---------------- Orker ----------------
  goblin: u('goblin', {
    name: 'Goblin', plural: 'Gobliner', faction: 'orcs', tier: 1,
    attack: 4, defense: 2, dmg: [1, 2], hp: 5, speed: 6, growth: 15,
    cost: { gold: 40 }, value: 45,
    lore: 'Små, onde og mange. Gobliner fra Tågebjergenes huler sværmer over alt hvad de møder.',
    art: { shape: 'humanoid', weapon: 'dagger', small: true, c1: '#4a3a2a', c2: '#3c3c3c', c3: '#cfe06a', skin: '#7fa33a' },
  }),
  orc_boy: u('orc_boy', {
    name: 'Ork-dreng', plural: 'Ork-drenge', faction: 'orcs', tier: 2,
    attack: 7, defense: 4, dmg: [2, 5], hp: 15, speed: 5, growth: 9,
    cost: { gold: 110 }, value: 140,
    lore: 'Mordors fodsoldater. Grove økser, groft humør, og altid på udkig efter slagsmål.',
    art: { shape: 'humanoid', weapon: 'axe', c1: '#5a4a3a', c2: '#6a6a60', c3: '#d7e37a', skin: '#4f7a2a' },
  }),
  orc_archer: u('orc_archer', {
    name: 'Ork-bueskytte', plural: 'Ork-bueskytter', faction: 'orcs', tier: 3,
    attack: 7, defense: 5, dmg: [3, 6], hp: 18, speed: 5, growth: 7, shots: 12,
    abilities: ['ranged'], cost: { gold: 180 }, value: 230,
    lore: 'Uruk-skytter fra Isengard. Ikke præcise, men deres sorte pile er mange og tunge.',
    art: { shape: 'humanoid', weapon: 'bow', c1: '#2a2a2a', c2: '#4a4a4a', c3: '#cfd07a', skin: '#3f5a26' },
  }),
  warg_rider: u('warg_rider', {
    name: 'Varg-rytter', plural: 'Varg-ryttere', faction: 'orcs', tier: 4,
    attack: 11, defense: 7, dmg: [6, 10], hp: 40, speed: 10, growth: 5,
    cost: { gold: 300 }, value: 460,
    lore: 'Gobliner på vargeryg. Hurtige som vinden over sletten og hensynsløse i angrebet.',
    art: { shape: 'rider', mount: 'warg', weapon: 'spear', c1: '#3a3a3a', c2: '#5c4a3a', c3: '#e2e07a', skin: '#7fa33a' },
  }),
  black_orc: u('black_orc', {
    name: 'Sort Ork', plural: 'Sorte Orker', faction: 'orcs', tier: 5,
    attack: 14, defense: 12, dmg: [10, 15], hp: 60, speed: 6, growth: 4,
    abilities: ['steadfast'], cost: { gold: 500 }, value: 820,
    lore: 'Uruk-hai og Sorte Orker – avlet til krig. De frygter intet og viger aldrig.',
    art: { shape: 'humanoid', weapon: 'greataxe', armor: true, c1: '#1e1e1e', c2: '#3a3a3a', c3: '#e0d2a0', skin: '#2f4a22' },
  }),
  troll: u('troll', {
    name: 'Trold', plural: 'Trolde', faction: 'orcs', tier: 6,
    attack: 17, defense: 11, dmg: [15, 30], hp: 110, speed: 7, growth: 3,
    abilities: ['regenerate'], cost: { gold: 1000, warpstone: 1 }, value: 1550,
    lore: 'Hule- og bjergtrolde fra Mordor. Deres kød heler mens man ser på det.',
    art: { shape: 'giant', weapon: 'club', c1: '#6a7a68', c2: '#3a3a30', c3: '#d6d6c0', scale: 0.85 },
  }),
  giant: u('giant', {
    name: 'Kæmpe', plural: 'Kæmper', faction: 'orcs', tier: 7,
    attack: 22, defense: 16, dmg: [40, 60], hp: 250, speed: 6, growth: 2,
    abilities: ['crush'], cost: { gold: 3000, warpstone: 2 }, value: 4600,
    lore: 'Bjergkæmper, lokket i krig med løfter om kød og plyndring. Et slag fælder en hel række.',
    art: { shape: 'giant', weapon: 'club', c1: '#b48a6a', c2: '#5a3f2a', c3: '#e6d3b0', scale: 1.05 },
  }),

  // ---------------- Neutrale ----------------
  skeleton: u('skeleton', {
    name: 'Skelet', plural: 'Skeletter', faction: 'neutral', tier: 1,
    attack: 5, defense: 4, dmg: [1, 3], hp: 6, speed: 4, growth: 12,
    abilities: ['undead'], cost: { gold: 60 }, value: 70,
    lore: 'Faldne krigere fra Gravhøjene, vækket af gammelt mørke.',
    art: { shape: 'skeleton', weapon: 'sword', c1: '#d9d4c2', c2: '#6a6a60', c3: '#8ab0ff' },
  }),
  wolf: u('wolf', {
    name: 'Varg', plural: 'Varge', faction: 'neutral', tier: 2,
    attack: 8, defense: 3, dmg: [2, 4], hp: 12, speed: 8, growth: 10,
    cost: { gold: 100 }, value: 130,
    lore: 'Store ulve fra Ødemarken, der jager i flok om natten.',
    art: { shape: 'beast', c1: '#5a5a5a', c2: '#2a2a2a', c3: '#f0d040' },
  }),
  dunlending: u('dunlending', {
    name: 'Dunlænding', plural: 'Dunlændinge', faction: 'neutral', tier: 2,
    attack: 7, defense: 5, dmg: [2, 5], hp: 16, speed: 5, growth: 8,
    cost: { gold: 110 }, value: 150,
    lore: 'Vilde mænd fra Dunland. Banditter, der plyndrer vejene.',
    art: { shape: 'humanoid', weapon: 'axe', beard: true, c1: '#7a4a2a', c2: '#4a3a2a', c3: '#e0c0a0' },
  }),
  beastman: u('beastman', {
    name: 'Udyrmand', plural: 'Udyrmænd', faction: 'neutral', tier: 3,
    attack: 9, defense: 6, dmg: [4, 7], hp: 24, speed: 6, growth: 6,
    cost: { gold: 200 }, value: 260,
    lore: 'Kaos’ børn med horn og hove, der bor i de mørke skove.',
    art: { shape: 'humanoid', weapon: 'axe', horns: true, c1: '#3a2a20', c2: '#5a4a3a', c3: '#d0b090', skin: '#6a4a3a' },
  }),
  spider: u('spider', {
    name: 'Kæmpeedderkop', plural: 'Kæmpeedderkopper', faction: 'neutral', tier: 3,
    attack: 10, defense: 6, dmg: [3, 8], hp: 22, speed: 7, growth: 6,
    abilities: ['poison'], cost: { gold: 220 }, value: 280,
    lore: 'Dunkelskovs afkom af Ungoliant. Deres bid svækker byttet.',
    art: { shape: 'spider', c1: '#2a2a30', c2: '#5a1a1a', c3: '#ff5050' },
  }),
  wight: u('wight', {
    name: 'Gravvætte', plural: 'Gravvætter', faction: 'neutral', tier: 4,
    attack: 12, defense: 10, dmg: [6, 10], hp: 40, speed: 6, growth: 4,
    abilities: ['undead'], cost: { gold: 380 }, value: 500,
    lore: 'Angmars ånder i gravhøjene. Deres kolde hænder dræner livet.',
    art: { shape: 'wraith', c1: '#3a3a4a', c2: '#1a1a2a', c3: '#8ff0ff' },
  }),
  minotaur: u('minotaur', {
    name: 'Minotaur', plural: 'Minotaurer', faction: 'neutral', tier: 5,
    attack: 15, defense: 11, dmg: [12, 18], hp: 65, speed: 7, growth: 3,
    cost: { gold: 650 }, value: 950,
    lore: 'Udyrmændenes høvdinge. Tyrehoved, krigsøkse og blodtørst.',
    art: { shape: 'giant', weapon: 'greataxe', horns: true, c1: '#5a3a2a', c2: '#2a1a10', c3: '#f0c070', scale: 0.8 },
  }),
  cave_troll: u('cave_troll', {
    name: 'Huletrold', plural: 'Huletrolde', faction: 'neutral', tier: 6,
    attack: 18, defense: 13, dmg: [20, 35], hp: 130, speed: 6, growth: 2,
    abilities: ['regenerate'], cost: { gold: 1200 }, value: 1800,
    lore: 'Morias trolde. Blinde i dagslys, dødelige i mørket.',
    art: { shape: 'giant', weapon: 'club', c1: '#7a8a8a', c2: '#3a3a40', c3: '#e0e0e0', scale: 0.9 },
  }),
  dragon: u('dragon', {
    name: 'Drage', plural: 'Drager', faction: 'neutral', tier: 7,
    attack: 26, defense: 22, dmg: [40, 70], hp: 300, speed: 12, growth: 1,
    abilities: ['flying', 'breath'], cost: { gold: 5000, gems: 3 }, value: 7000,
    lore: 'Smaugs slægt fra de Grå Bjerge. Ild, vinger og grådighed.',
    art: { shape: 'dragon', c1: '#8a2a1a', c2: '#3a1010', c3: '#ffb040' },
  }),
};

export const NEUTRAL_UNITS = ['skeleton', 'wolf', 'dunlending', 'beastman', 'spider', 'wight', 'minotaur', 'cave_troll', 'dragon'];
export const ABILITY_INFO = {
  ranged: { name: 'Skytte', desc: 'Kan skyde på afstand. Halv skade i nærkamp og på lang afstand.' },
  flying: { name: 'Flyvende', desc: 'Flyver over forhindringer og mure.' },
  no_retaliation: { name: 'Ingen gengældelse', desc: 'Fjenden slår ikke igen efter angreb.' },
  charge: { name: 'Stormangreb', desc: '+10% skade pr. felt bevæget før angrebet (op til +50%).' },
  bulwark: { name: 'Skjoldmur', desc: '+50% forsvar når enheden forsvarer.' },
  bark: { name: 'Bark', desc: 'Tager 25% mindre skade fra skud.' },
  steadfast: { name: 'Urokkelig', desc: 'Påvirkes aldrig af dårlig moral.' },
  regenerate: { name: 'Regeneration', desc: 'Den øverste enhed heles helt i starten af hver runde.' },
  crush: { name: 'Knusende slag', desc: 'Fjenden kan ikke gengælde med fuld kraft (-50%).' },
  undead: { name: 'Udød', desc: 'Påvirkes ikke af moral.' },
  poison: { name: 'Gift', desc: 'Angrebet giver -2 forsvar til målet i 3 runder.' },
  breath: { name: 'Ildånde', desc: 'Angrebet rammer også feltet bag målet.' },
};
export function hasAbility(unit, a) { return unit.abilities.includes(a); }
