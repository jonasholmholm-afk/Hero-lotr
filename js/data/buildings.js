// Town buildings. Names differ per faction; mechanics are shared.
const B = (id, o) => ({ id, req: [], ...o });
const base = [
  B('hall1', { cost: {}, income: 500 }),
  B('hall2', { cost: { gold: 2500 }, req: ['tavern'], income: 1000 }),
  B('hall3', { cost: { gold: 5000, wood: 5, ore: 5 }, req: ['hall2', 'mage1', 'market'], income: 2000 }),
  B('hall4', { cost: { gold: 10000, wood: 10, ore: 10 }, req: ['hall3', 'castle'], income: 4000 }),
  B('fort', { cost: { gold: 5000, wood: 20, ore: 20 }, defense: 2, growthMult: 1 }),
  B('citadel', { cost: { gold: 2500, wood: 5, ore: 5 }, req: ['fort'], defense: 4, growthMult: 1.5 }),
  B('castle', { cost: { gold: 5000, wood: 10, ore: 10 }, req: ['citadel'], defense: 6, growthMult: 2 }),
  B('tavern', { cost: { gold: 500, wood: 5 } }),
  B('market', { cost: { gold: 500, wood: 5 } }),
  B('silo', { cost: { gold: 5000, ore: 5 }, req: ['market'] }),
  B('mage1', { cost: { gold: 2000, wood: 5, ore: 5 } }),
  B('mage2', { cost: { gold: 1000, wood: 5, ore: 5, rare: 4 }, req: ['mage1'] }),
  B('mage3', { cost: { gold: 1000, wood: 5, ore: 5, rare: 6 }, req: ['mage2'] }),
  B('mage4', { cost: { gold: 1000, wood: 5, ore: 5, rare: 8 }, req: ['mage3'] }),
  B('mage5', { cost: { gold: 1000, wood: 5, ore: 5, rare: 10 }, req: ['mage4'] }),
  B('special', { cost: { gold: 1500, wood: 5, ore: 5 }, req: ['fort'] }),
  B('dw1', { cost: { gold: 400, wood: 5 } }),
  B('dw2', { cost: { gold: 1000, wood: 5, ore: 5 }, req: ['dw1'] }),
  B('dw3', { cost: { gold: 1500, wood: 10, ore: 5 }, req: ['dw2'] }),
  B('dw4', { cost: { gold: 2000, wood: 10, ore: 10, rare: 4 }, req: ['dw2', 'fort'] }),
  B('dw5', { cost: { gold: 3000, wood: 10, ore: 15, rare: 5 }, req: ['dw3', 'dw4'] }),
  B('dw6', { cost: { gold: 4500, wood: 15, ore: 20, rare: 10 }, req: ['dw4', 'mage1'] }),
  B('dw7', { cost: { gold: 10000, wood: 30, ore: 30, rare: 20 }, req: ['dw5', 'dw6', 'mage2'] }),
];
export const BUILDINGS = Object.fromEntries(base.map((b) => [b.id, b]));
export const BUILD_ORDER = base.map((b) => b.id);
export const DWELLINGS = ['dw1', 'dw2', 'dw3', 'dw4', 'dw5', 'dw6', 'dw7'];

export const BUILDING_NAMES = {
  elves: {
    hall1: 'Rådsplads', hall2: 'Tingsted', hall3: 'Rådshal', hall4: 'Kongehal',
    fort: 'Tornhegn', citadel: 'Vogtertårne', castle: 'Ældgamle Mure',
    tavern: 'Mjødhallen', market: 'Byttemarked', silo: 'Mithril-lager',
    mage1: 'Sangtårn I', mage2: 'Sangtårn II', mage3: 'Sangtårn III', mage4: 'Sangtårn IV', mage5: 'Sangtårn V',
    special: 'Verdensrødderne',
    dw1: 'Dryadernes Lund', dw2: 'Vogterposten', dw3: 'Den Evige Hal', dw4: 'Loecs Dansplads',
    dw5: 'Den Vilde Jagts Lejr', dw6: 'Ørnereden', dw7: 'Oldskoven',
  },
  orcs: {
    hall1: 'Krigsrådet', hall2: 'Bossens Hytte', hall3: 'Warbossens Hal', hall4: 'Krigsherrens Trone',
    fort: 'Pæleværket', citadel: 'Jernporten', castle: 'Den Sorte Fæstning',
    tavern: 'Grog-hytten', market: 'Plyndrermarked', silo: 'Warpstens-lager',
    mage1: 'Shamanhulen I', mage2: 'Shamanhulen II', mage3: 'Shamanhulen III', mage4: 'Shamanhulen IV', mage5: 'Shamanhulen V',
    special: 'Krigstrommerne',
    dw1: 'Goblinhullet', dw2: 'Ork-lejren', dw3: 'Skyttehulen', dw4: 'Vargstalden',
    dw5: 'Sorte Orkers Kaserne', dw6: 'Troldebroen', dw7: 'Kæmpernes Bjerg',
  },
};
export const BUILDING_DESC = {
  hall1: 'Giver 500 guld om dagen.', hall2: 'Giver 1000 guld om dagen.', hall3: 'Giver 2000 guld om dagen.', hall4: 'Giver 4000 guld om dagen.',
  fort: 'Mure om byen. +2 forsvar til forsvarere. Kræves til højere bygninger.',
  citadel: 'Stærkere mure. +4 forsvar til forsvarere, +50% vækst.',
  castle: 'Den stærkeste befæstning. +6 forsvar, +100% vækst.',
  tavern: 'Her kan man hyre nye helte. +1 moral for byens forsvarere.',
  market: 'Byt ressourcer. Kræves for at bygge Rådshal.',
  silo: 'Giver +1 af fraktionens sjældne ressource hver dag.',
  mage1: 'Lærer besværgelser af niveau 1 til besøgende helte.',
  mage2: 'Lærer besværgelser af niveau 2.', mage3: 'Lærer besværgelser af niveau 3.',
  mage4: 'Lærer besværgelser af niveau 4.', mage5: 'Lærer besværgelser af niveau 5.',
  special: '',
};
