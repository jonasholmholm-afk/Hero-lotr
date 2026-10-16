// Catalogue of every image slot the game can use, with a generation prompt
// per slot. Pure data: used by the in-game asset studio and by the script that
// writes assets/PROMPTS.md.
import { UNITS } from './units.js';
import { HEROES, HERO_IDS } from './heroes.js';
import { FACTIONS } from './factions.js';
import { RES_INFO, MINE_NAMES } from './resources.js';
import { OBJ_INFO } from './objects.js';

export const STYLE = 'Hand-painted fantasy game art in the style of Heroes of Might and Magic III and classic Warhammer Fantasy illustrations. Detailed, semi-realistic, painterly, rich colours, dramatic soft light from the upper left, crisp silhouette, high detail. No text, no watermark, no frame.';
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
const DECOR_PROMPT = {
  pine: 'a tall dark green pine tree', leafy: 'a round leafy green oak tree', golden: 'a mallorn tree with golden autumn leaves and a silver trunk',
  dead: 'a dead leafless twisted tree', mountain: 'a rocky grey mountain with a snow cap', rock: 'a cluster of grey boulders',
  flowers: 'a small patch of wildflowers', mushroom: 'a few red-capped mushrooms', stump: 'a tree stump',
  reeds: 'a tuft of swamp reeds and cattails', snowpine: 'a snow-covered pine tree', bush: 'a round green bush with berries', pebbles: 'a few small grey pebbles',
};
const DECOR_SIZES = { pine: [60, 92], leafy: [68, 90], golden: [68, 90], dead: [60, 86], mountain: [110, 110], rock: [52, 44], flowers: [44, 26], mushroom: [44, 30], stump: [34, 30], reeds: [44, 40], snowpine: [60, 92], bush: [46, 36], pebbles: [40, 22] };
const TERRAIN_PROMPT = { water: 'deep blue lake water with gentle ripples', grass: 'lush green grass meadow', dirt: 'brown earth path with pebbles', rough: 'rough dry stony ground', swamp: 'murky swamp ground with puddles and moss', snow: 'fresh white snow', ash: 'dark volcanic ash ground with glowing cracks' };

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
    const label = k.startsWith('mine_') ? MINE_NAMES[k.slice(5)] : k.startsWith('resource_') ? RES_INFO[k.slice(9)].name : (OBJ_INFO[k] ? OBJ_INFO[k].name : k);
    out.push(slot(`objects/${k}`, 'Objekter', label, [160, 168], `${STYLE} Small map object for a strategy game: ${p}. Front-side view from slightly above, whole object visible, base at the bottom. ${ISOLATED}`, { baseline: 0.905, subject: p }));
  }
  for (const [k, p] of Object.entries(DECOR_PROMPT)) {
    const sz = DECOR_SIZES[k];
    out.push(slot(`decor/${k}`, 'Natur', k, [sz[0] * 2, sz[1] * 2], `${STYLE} Map decoration for a strategy game: ${p}. Front-side view from slightly above, base at the bottom. ${ISOLATED}`, { baseline: (sz[1] - 8) / sz[1], subject: p }));
  }
  for (const [k, p] of Object.entries(TERRAIN_PROMPT)) {
    out.push(slot(`terrain/${k}`, 'Terræn', k, [192, 192], `${STYLE} Seamless tileable top-down ground texture: ${p}. Even lighting, no objects, no shadows, repeating pattern that tiles perfectly.`, { keying: false, baseline: 1, subject: p }));
  }
  return out;
}
export const CATEGORIES = ['Enheder', 'Portrætter', 'Helte på kortet', 'Byer', 'Objekter', 'Natur', 'Terræn'];

/** Groups the slots into sheets of up to 5 subjects, each with one prompt. */
export function buildSheets() {
  const cat = buildCatalog();
  const sheets = [];
  const layoutFor = (category) => {
    if (category === 'Portrætter') return 'Five separate square head-and-shoulders portraits arranged in one horizontal row, left to right, same size, each portrait has its own painted background inside its square, with a clear flat magenta (#FF00FF) gap between the squares and a magenta margin around the whole image.';
    if (category === 'Terræn') return 'Five separate square seamless top-down ground texture swatches arranged in one horizontal row, left to right, same size, even lighting, no objects, with a clear flat magenta (#FF00FF) gap between the squares and a magenta margin around the whole image.';
    if (category === 'Byer' || category === 'Helte på kortet') return 'Separate subjects arranged in one horizontal row, left to right, evenly spaced, NOT overlapping, each fully visible, front view, bases aligned at the same ground line, on a flat solid magenta (#FF00FF) background with no ground and no shadows on the background.';
    return 'Separate figures standing in one horizontal row, left to right, evenly spaced, NOT overlapping, each fully visible from head to feet, side view facing right, same scale, feet aligned at the same ground line, on a flat solid magenta (#FF00FF) background with no ground and no shadows on the background.';
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
    const SLUG = { 'Enheder': 'enheder', 'Portrætter': 'portraetter', 'Objekter': 'objekter', 'Natur': 'natur', 'Terræn': 'terraen', 'Byer': 'byer' };
    const id = `${SLUG[g.category]}-${counters[g.category]}`;
    const n = g.slots.length;
    const subjects = g.slots.map((s, i) => `${i + 1}) ${s.subject}`).join('; ');
    const prompt = `${STYLE} One wide image (aspect ratio about 5:2) containing exactly ${n} subjects. ${layoutFor(g.category)} From left to right: ${subjects}. No text, no numbers, no labels.`;
    sheets.push({ id, category: g.category, slots: g.slots, prompt, n });
  }
  return sheets;
}
