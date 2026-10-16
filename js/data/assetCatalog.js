// Catalogue of every image slot the game can use, with a generation prompt
// per slot. Pure data: used by the in-game asset studio and by the script that
// writes assets/PROMPTS.md.
import { UNITS } from './units.js';
import { HEROES, HERO_IDS } from './heroes.js';
import { FACTIONS } from './factions.js';
import { RES_INFO, MINE_NAMES } from './resources.js';
import { OBJ_INFO } from './objects.js';
import { BUILDING_NAMES } from './buildings.js';
import { SPELLS } from './spells.js';

export const STYLE = 'Hand-painted fantasy game art in the style of Heroes of Might and Magic III and Warhammer Fantasy illustrations: detailed, semi-realistic, painterly, rich colours, soft light from the upper left, crisp silhouettes.';
export const ISOLATED = 'Single subject, centred, isolated on a flat solid magenta (#FF00FF) background, no ground, no shadow on the background.';
export const NEGATIVE = 'text, watermark, signature, frame, border, blurry, low detail, cropped, multiple subjects, photo, 3d render';

const UNIT_PROMPT = {
  dryad: 'a dryad of Athel Loren, a slender female forest spirit made of living bark and leaves, thorny arms, glowing eyes',
  glade_guard: 'a wood elf glade guard archer in green and gold hooded cloak, longbow drawn, leather armour, quiver',
  eternal_guard: 'a wood elf eternal guard with a long spear and ornate shield, blue-green scale armour, gold trim',
  wardancer: 'a wood elf wardancer with twin curved blades, bare arms with tattoos, purple and white silk, acrobatic stance',
  wild_rider: 'a wood elf wild rider mounted on a great stag with huge antlers, carrying a spear, autumn colours',
  great_eagle: 'a giant golden eagle of the Misty Mountains with spread wings, fierce, majestic',
  treeman: 'an ancient treeman ent, a towering walking oak with a wise face, moss, branches as arms, autumn canopy',
  goblin: 'a small sneaky goblin with green skin, big ears, rusty dagger, ragged dark clothes',
  orc_boy: 'a brutish orc warrior of Mordor with green skin, crude axe, scrap iron armour, snarling',
  orc_archer: 'an Uruk-hai archer with dark skin, heavy black bow, white hand emblem, iron helmet',
  warg_rider: 'a goblin rider mounted on a snarling grey warg, spear raised, saddle of hides',
  black_orc: 'a huge black orc in heavy black plate armour, massive two-handed axe, tusks, red eyes',
  troll: 'a hulking mountain troll of Mordor with grey-green hide, crude club, chains, stooped posture',
  giant: 'an enormous giant with ragged furs, a tree-trunk club, long matted beard, stone age look',
  skeleton: 'a skeleton warrior from the Barrow-downs, rusted sword, tattered shroud, cold blue glowing eyes',
  wolf: 'a huge wild warg wolf with grey fur, bared fangs, yellow eyes, prowling',
  dunlending: 'a wild bearded man of Dunland, fur cloak, iron axe, round shield, barbarian',
  beastman: 'a horned beastman of Chaos, goat legs, hooves, brown fur, crude axe',
  spider: 'a giant spider of Mirkwood, black hairy body, red eyes, dripping fangs',
  wight: 'a barrow-wight, a ghostly hooded wraith with glowing pale blue eyes and a cold grey blade, floating',
  minotaur: 'a massive minotaur with a bull head, horns, great axe, dark fur, bloodshot eyes',
  cave_troll: 'a cave troll from Moria with pale grey skin, stone club, chains, small blind eyes',
  dragon: 'a red fire dragon of the Grey Mountains, wings spread, horned head, scales, smoke from nostrils',
};
const HERO_PROMPT = {
  orion: 'Orion, the wood elf King in the Woods, antlered crown, green skin tones, wild dark green hair, fierce green eyes',
  ariel: 'Ariel, queen of the wood elves, radiant pale skin, long golden hair, delicate golden crown, serene',
  drycha: 'Drycha, a bitter dryad sorceress, bark-like green skin, wild dark hair with twigs, yellow glowing eyes',
  naestra: 'Naestra, a pale wood elf huntress, silver-white hair, hooded cloak, piercing blue eyes',
  legolas: 'Legolas, a young blond wood elf prince, long straight blond hair, blue eyes, green cloak',
  haldir: 'Haldir, a stern wood elf marchwarden, long pale blond hair, elven helm, grey-blue eyes',
  thranduil: 'Thranduil, the proud Elvenking, platinum blond hair, crown of twigs and berries, icy blue eyes',
  tauriel: 'Tauriel, a wood elf captain, long red hair, green eyes, leather armour',
  grimgor: 'Grimgor Ironhide, a huge black orc warlord, iron eyepatch, black mohawk, tusks, scarred green face',
  azhag: 'Azhag the Slaughterer, an orc warlord wearing a cursed black iron crown, glowing green eyes, tusks',
  gorbad: 'Gorbad Ironclaw, an orc warboss in a horned iron helmet, scarred, tusks, orange eyes',
  azog: 'Azog the Defiler, a huge pale white orc, bald, scarred chest and face, cold pale eyes',
  bolg: 'Bolg, a grey-skinned orc chieftain, bald with metal plates nailed to his head, tusks, scars',
  gothmog: 'Gothmog, a deformed orc lieutenant of Mordor, swollen pale face, no hair, cunning eyes',
  lurtz: 'Lurtz, the first Uruk-hai, dark reddish skin, long black hair, white hand print on his face',
  grishnakh: 'Grishnakh, a sly hooded orc spy, narrow yellow eyes, crooked teeth, dark hood',
  wurrzag: 'Wurrzag, an orc shaman painted in white tribal paint, wild white hair, bone necklace, mad green eyes',
};
const OBJ_PROMPT = {
  mine_gold: 'a small gold mine entrance in a hillside with timber supports and a mine cart full of gold',
  mine_wood: 'a sawmill: a timber house with a water wheel and a pile of logs',
  mine_ore: 'an ore mine entrance in a rocky hillside with timber supports and a cart of iron ore',
  mine_mithril: 'a mithril mine entrance in a rocky hillside with a cart of glowing silver-blue mithril crystals',
  mine_warpstone: 'a warpstone quarry entrance with a cart of glowing sickly green crystals',
  mine_gems: 'a gem mine entrance in a hillside with a cart of pink gems',
  resource_gold: 'a small pile of gold coins',
  resource_wood: 'a small stack of cut logs',
  resource_ore: 'a small pile of iron ore rocks',
  resource_mithril: 'a cluster of glowing silver-blue mithril crystals',
  resource_warpstone: 'a cluster of glowing green warpstone shards',
  resource_gems: 'a cluster of pink gems',
  chest: 'a wooden treasure chest with gold trim and a glowing lock',
  artifact: 'a glowing golden artifact gem floating above a small stone pedestal',
  shrine: 'an ancient stone shrine arch with a glowing blue rune',
  runestone: 'a tall standing stone carved with glowing blue runes',
  well: 'an old stone well with a wooden roof and glowing blue water',
  tree: 'a magical tree of wisdom with glowing pale blue leaves and floating lights',
  stables: 'a wooden horse stable of Rohan with a horse-head sign',
  tower: 'a tall stone watchtower with a flag',
  fountain: 'a small stone fountain with a golden glowing light',
  camp: 'a travellers camp with a tent and a campfire',
  windmill: 'a wooden windmill with cloth sails',
  ruin: 'ruined ancient stone columns overgrown with ivy',
};
const DECOR_LABEL = { pine: 'Gran', leafy: 'Løvtræ', golden: 'Gyldent træ', dead: 'Dødt træ', mountain: 'Bjerg', rock: 'Klipper', flowers: 'Blomster', mushroom: 'Svampe', stump: 'Træstub', reeds: 'Siv', snowpine: 'Snegran', bush: 'Busk', pebbles: 'Småsten' };
const TERRAIN_LABEL = { water: 'Vand', grass: 'Græs', dirt: 'Jord', rough: 'Ujævnt', swamp: 'Sump', snow: 'Sne', ash: 'Aske' };
const DECOR_PROMPT = {
  pine: 'a tall dark green pine tree', leafy: 'a round leafy green oak tree', golden: 'a mallorn tree with golden autumn leaves and a silver trunk',
  dead: 'a dead leafless twisted tree', mountain: 'a rocky grey mountain with a snow cap', rock: 'a cluster of grey boulders',
  flowers: 'a small patch of wildflowers', mushroom: 'a few red-capped mushrooms', stump: 'a tree stump',
  reeds: 'a tuft of swamp reeds and cattails', snowpine: 'a snow-covered pine tree', bush: 'a round green bush with berries', pebbles: 'a few small grey pebbles',
};
const DECOR_SIZES = { pine: [60, 92], leafy: [68, 90], golden: [68, 90], dead: [60, 86], mountain: [110, 110], rock: [52, 44], flowers: [44, 26], mushroom: [44, 30], stump: [34, 30], reeds: [44, 40], snowpine: [60, 92], bush: [46, 36], pebbles: [40, 22] };
const TERRAIN_PROMPT = { water: 'deep blue lake water with gentle ripples', grass: 'lush green grass meadow', dirt: 'brown earth path with pebbles', rough: 'rough dry stony ground', swamp: 'murky swamp ground with puddles and moss', snow: 'fresh white snow', ash: 'dark volcanic ash ground with glowing cracks' };

const BUILDING_PROMPT = {
  elves: {
    hall2: 'a wood elf town hall: an elegant open-air council ring of white stone and living wood under golden leaves',
    hall3: 'a grand wood elf council hall of white stone and silver-barked wood with tall arched windows and a golden roof',
    hall4: "a majestic elven king's hall grown into a giant golden mallorn tree, white spires, green banners",
    fort: 'a wall of living thorn hedge and wooden palisade with elven watch platforms',
    citadel: 'tall slender elven watchtowers of white stone joined by living-wood walls',
    castle: 'ancient massive elven walls of pale stone overgrown with golden ivy, with a great carved gate',
    tavern: 'a cosy elven mead hall of carved wood with lanterns, barrels and a warm glowing doorway',
    market: 'a wood elf market with stalls of silk, baskets of fruit and hanging lanterns under a tree',
    silo: 'an elven storehouse of white stone with glowing silver-blue mithril ingots stacked inside',
    mage: 'a tall elven song tower of white stone spiralling around a tree, glowing blue runes and floating lights',
    special: 'the world roots: giant glowing tree roots rising from the ground around a mossy altar',
  },
  orcs: {
    hall2: 'an orc boss hut of hides, bones and scrap iron with a crude throne and skull trophies',
    hall3: 'a big orc warboss hall of black timber and iron plates with giant tusks at the entrance',
    hall4: "an orc warlord's iron throne on a mound of skulls under black spiked banners and fire",
    fort: 'a crude orc palisade of sharpened stakes, hides and skulls',
    citadel: 'a heavy iron gate in a black stone wall with spiked towers and torches',
    castle: 'a huge black iron fortress wall with chains, spikes, glowing furnaces and skull banners',
    tavern: 'an orc grog hut of timber and hides with big barrels, a fire pit and gnawed bones',
    market: 'an orc plunder market with piles of looted goods, cages, crates and a crude tent',
    silo: 'an iron-bound orc storehouse with glowing green warpstone shards in cages',
    mage: 'an orc shaman cave with a bone totem, glowing green runes, skulls and green magical smoke',
    special: 'giant orc war drums made of hide and bone with glowing runes and red banners',
  },
};
const SPELL_PROMPT = {
  magic_arrow: 'a glowing blue magical arrow of light shooting forward',
  haste: 'a winged boot surrounded by golden speed lines',
  slow: 'an hourglass dripping with heavy grey mud and chains',
  bless: 'a radiant golden sun with gentle rays over a small sprig of leaves',
  curse: 'a cracked black skull with purple smoke',
  stone_skin: 'a stone fist covered in grey rock plates',
  cure: 'a glowing green leaf with a drop of healing light',
  fireball: 'a roaring ball of fire with a smoking trail',
  weakness: 'a broken rusty sword in grey sickly mist',
  bloodlust: 'a red snarling face with glowing red eyes',
  shield: 'a round elven shield of gold and green glowing with protection',
  air_shield: 'a swirling dome of wind deflecting arrows',
  lightning: 'a bright white lightning bolt striking down from dark clouds',
  mass_slow: 'many grey hands of mud reaching up from a swamp',
  mass_haste: 'a swirl of golden wind with many flying leaves',
  chain_lightning: 'branching chains of lightning jumping between three points',
  resurrect: 'a pale ghostly figure rising in a column of golden light',
  mass_bless: 'a golden tree of life radiating light in all directions',
  meteor: 'a giant green orc foot stamping down from the sky with fire and cracks',
  mass_curse: 'a sinister green orc god face with glowing eyes and black smoke',
};

const slot = (key, category, label, size, prompt, opts = {}) => ({ key, category, label, size, prompt, baseline: 0.92, keying: true, subject: '', ...opts });

export function buildCatalog() {
  const out = [];
  for (const id of Object.keys(UNITS)) {
    const u = UNITS[id];
    out.push(slot(`units/${id}`, 'Enheder', u.plural, [192, 192], `${STYLE} Full body creature sprite for a strategy game: ${UNIT_PROMPT[id] || u.lore}. Side view facing right, standing idle pose, whole figure visible, feet at the bottom. ${ISOLATED}`, { baseline: 0.92, subject: UNIT_PROMPT[id] || u.lore }));
  }
  for (const id of HERO_IDS) {
    const h = HEROES[id]; const elf = h.faction === 'elves';
    out.push(slot(`portraits/${id}`, 'Portrætter', h.name, [128, 128], `${STYLE} Head-and-shoulders character portrait: ${HERO_PROMPT[id] || h.lore}. ${elf ? 'Wearing green and gold elven armour or robes, background of a golden autumn forest with soft light rays.' : 'Wearing black iron armour or furs, background of a dark smoky fortress with embers.'} Square composition, face turned slightly to the left, looking at the viewer.`, { keying: false, baseline: 1, subject: `${HERO_PROMPT[id] || h.lore}, ${elf ? 'green and gold elven attire, golden forest background' : 'black iron armour or furs, dark smoky fortress background'}` }));
  }
  out.push(slot('heroes/elves', 'Helte på kortet', 'Elverhelt til hest', [160, 180], `${STYLE} A wood elf hero in green cloak riding a white elven horse, holding a tall banner pole, side view facing right, whole mount visible, hooves at the bottom. ${ISOLATED}`, { baseline: 0.91, subject: 'a wood elf hero in green cloak riding a white elven horse, holding a tall banner pole' }));
  out.push(slot('heroes/orcs', 'Helte på kortet', 'Orkhelt på varg', [160, 180], `${STYLE} An orc warlord in black iron armour riding a huge grey warg, holding a tall banner pole, side view facing right, whole mount visible, paws at the bottom. ${ISOLATED}`, { baseline: 0.91, subject: 'an orc warlord in black iron armour riding a huge grey warg, holding a tall banner pole' }));
  out.push(slot('towns/elves', 'Byer', 'Elverby', [400, 320], `${STYLE} A wood elf city built around a giant golden mallorn tree with white elegant halls, lanterns, a gate arch at the bottom centre, front view, whole town visible. ${ISOLATED}`, { baseline: 0.95, subject: 'a wood elf city built around a giant golden mallorn tree with white elegant halls, lanterns and a gate arch at the bottom centre' }));
  out.push(slot('towns/orcs', 'Byer', 'Orkfæstning', [400, 320], `${STYLE} A brutal orc fortress of black iron and spiked timber with a glowing forge, skull banners, smoke, a heavy gate at the bottom centre, front view, whole fortress visible. ${ISOLATED}`, { baseline: 0.95, subject: 'a brutal orc fortress of black iron and spiked timber with a glowing forge, skull banners, smoke and a heavy gate at the bottom centre' }));
  for (const [k, p] of Object.entries(OBJ_PROMPT)) {
    const label = k.startsWith('mine_') ? MINE_NAMES[k.slice(5)] : k.startsWith('resource_') ? RES_INFO[k.slice(9)].name : k === 'artifact' ? 'Artefakt' : (OBJ_INFO[k] ? OBJ_INFO[k].name : k);
    out.push(slot(`objects/${k}`, 'Objekter', label, [160, 168], `${STYLE} Small map object for a strategy game: ${p}. Front-side view from slightly above, whole object visible, base at the bottom. ${ISOLATED}`, { baseline: 0.905, subject: p }));
  }
  for (const [k, p] of Object.entries(DECOR_PROMPT)) {
    const sz = DECOR_SIZES[k];
    out.push(slot(`decor/${k}`, 'Natur', DECOR_LABEL[k], [sz[0] * 2, sz[1] * 2], `${STYLE} Map decoration for a strategy game: ${p}. Front-side view from slightly above, base at the bottom. ${ISOLATED}`, { baseline: (sz[1] - 8) / sz[1], subject: p }));
  }
  for (const [k, p] of Object.entries(TERRAIN_PROMPT)) {
    out.push(slot(`terrain/${k}`, 'Terræn', TERRAIN_LABEL[k], [192, 192], `${STYLE} Seamless tileable top-down ground texture: ${p}. Even lighting, no objects, no shadows, repeating pattern that tiles perfectly.`, { keying: false, baseline: 1, subject: p }));
  }
  for (const fac of ['elves', 'orcs']) for (const [k, p] of Object.entries(BUILDING_PROMPT[fac])) {
    const nm = BUILDING_NAMES[fac][k === 'mage' ? 'mage1' : k].replace(/ I$/, '');
    out.push(slot(`buildings/${fac}_${k}`, 'Bygninger', `${nm} (${FACTIONS[fac].name})`, [128, 128], `${STYLE} Building icon for a strategy game town screen: ${p}. Front view from slightly above, whole building visible, base at the bottom. ${ISOLATED}`, { baseline: 0.95, subject: p }));
  }
  for (const [k, p] of Object.entries(SPELL_PROMPT)) {
    out.push(slot(`spells/${k}`, 'Besværgelser', SPELLS[k].name, [96, 96], `${STYLE} Square spell icon: ${p}, painted on a dark background with a soft glow, centred, filling the square.`, { keying: false, baseline: 1, subject: p }));
  }
  return out;
}
export const CATEGORIES = ['Enheder', 'Portrætter', 'Helte på kortet', 'Byer', 'Objekter', 'Natur', 'Terræn', 'Bygninger', 'Besværgelser'];

/** Groups the slots into sheets of up to 5 subjects, each with one prompt. */
export function buildSheets() {
  const cat = buildCatalog();
  const sheets = [];
  const WORDS = ['', 'One', 'Two', 'Three', 'Four', 'Five'];
  const layoutFor = (category, n) => {
    const N = WORDS[n] || n;
    if (category === 'Portrætter') return `${N} separate square head-and-shoulders portraits in one horizontal row, left to right, same size, each portrait with its own painted background inside its square, separated by clear flat magenta (#FF00FF) gaps and surrounded by a magenta margin.`;
    if (category === 'Besværgelser') return `${N} separate square spell icons in one horizontal row, left to right, same size, each icon a single glowing magical symbol painted on its own dark background inside its square, separated by clear flat magenta (#FF00FF) gaps and surrounded by a magenta margin.`;
    if (category === 'Terræn') return `${N} separate square seamless top-down ground texture swatches in one horizontal row, left to right, same size, even lighting, no objects, separated by clear flat magenta (#FF00FF) gaps and surrounded by a magenta margin.`;
    if (category === 'Byer') return `${N} separate subjects in one horizontal row, left to right, evenly spaced, not overlapping, each fully visible, front view, bases on the same ground line, on a flat solid magenta (#FF00FF) background, no ground, no cast shadows.`;
    if (category === 'Objekter' || category === 'Natur' || category === 'Bygninger') return `${N} separate objects in one horizontal row, left to right, evenly spaced, not overlapping, each fully visible, front view from slightly above, bases on the same ground line, on a flat solid magenta (#FF00FF) background, no ground, no cast shadows.`;
    return `${N} separate creatures standing in one horizontal row, left to right, evenly spaced, not overlapping, each fully visible from head to feet, side view facing right, same scale, feet on the same ground line, on a flat solid magenta (#FF00FF) background, no ground, no cast shadows.`;
  };
  const groups = [];
  for (const c of CATEGORIES) {
    if (c === 'Byer' || c === 'Helte på kortet') continue;
    const list = cat.filter((s) => s.category === c);
    for (let i = 0; i < list.length; i += 5) groups.push({ category: c, slots: list.slice(i, i + 5) });
  }
  groups.push({ category: 'Byer', slots: cat.filter((s) => s.category === 'Byer' || s.category === 'Helte på kortet') });
  let counters = {};
  for (const g of groups) {
    counters[g.category] = (counters[g.category] || 0) + 1;
    const SLUG = { 'Enheder': 'enheder', 'Portrætter': 'portraetter', 'Objekter': 'objekter', 'Natur': 'natur', 'Terræn': 'terraen', 'Byer': 'byer', 'Bygninger': 'bygninger', 'Besværgelser': 'besvaergelser' };
    const id = `${SLUG[g.category]}-${counters[g.category]}`;
    const n = g.slots.length;
    const subjects = g.slots.map((s, i) => `${i + 1}) ${s.subject}`).join('; ');
    const prompt = `${STYLE} One wide image (about 5:2). ${layoutFor(g.category, n)} From left to right: ${subjects}. No text, numbers, labels, frames or watermarks.`;
    sheets.push({ id, category: g.category, slots: g.slots, prompt, n });
  }
  return sheets;
}
