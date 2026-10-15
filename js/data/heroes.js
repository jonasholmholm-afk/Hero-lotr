// Hero definitions. spec: {type:'unit', id} | {type:'skill', id} | {type:'stat', stat}
const h = (id, o) => ({ id, ...o });
export const HEROES = {
  // -------- Skovelvere --------
  orion: h('orion', { name: 'Orion', faction: 'elves', cls: 'might', spec: { type: 'unit', id: 'wild_rider' }, skills: { offense: 1, logistics: 1 },
    lore: 'Skovens Konge, Kurnous avatar. Jagtens herre rider forrest i den vilde jagt.',
    portrait: { skin: '#d9b48a', hair: '#3a5a2a', style: 'antlers', bg: '#2a4a2a', eyes: '#d8ff80' } }),
  ariel: h('ariel', { name: 'Ariel', faction: 'elves', cls: 'magic', spec: { type: 'stat', stat: 'power' }, skills: { wisdom: 1, sorcery: 1 },
    lore: 'Skovens Dronning, Isha’s udvalgte. Hendes sange væver selve Athel Loren.',
    portrait: { skin: '#f0dcc0', hair: '#f3e39a', style: 'long', bg: '#3a5a3a', eyes: '#80e0a0', crown: true } }),
  drycha: h('drycha', { name: 'Drycha', faction: 'elves', cls: 'magic', spec: { type: 'unit', id: 'dryad' }, skills: { wisdom: 1, leadership: 1 },
    lore: 'Den bitre dryade, der hader alt der ikke er skov. Dryaderne følger hende blindt.',
    portrait: { skin: '#8aa070', hair: '#3a4a2a', style: 'wild', bg: '#1a2a1a', eyes: '#ffd040' } }),
  naestra: h('naestra', { name: 'Naestra', faction: 'elves', cls: 'might', spec: { type: 'unit', id: 'glade_guard' }, skills: { archery: 1, scouting: 1 },
    lore: 'Søster-tvilling, den lysende. Hendes bue har aldrig savnet sit mål.',
    portrait: { skin: '#f2dcc2', hair: '#e8e0c0', style: 'hood', bg: '#2a3a4a', eyes: '#a0c0ff' } }),
  legolas: h('legolas', { name: 'Legolas', faction: 'elves', cls: 'might', spec: { type: 'skill', id: 'archery' }, skills: { archery: 1, luck: 1 },
    lore: 'Thranduils søn, prins af Dunkelskov. Ingen bueskytte i Midgård er hurtigere.',
    portrait: { skin: '#f0d8c0', hair: '#f0e0a0', style: 'long', bg: '#2a4a3a', eyes: '#80c0ff' } }),
  haldir: h('haldir', { name: 'Haldir', faction: 'elves', cls: 'might', spec: { type: 'unit', id: 'eternal_guard' }, skills: { armorer: 1, leadership: 1 },
    lore: 'Lothlóriens grænsevogter. Han førte elverne til Helms Kløft og faldt – men ikke i denne verden.',
    portrait: { skin: '#e8d0b0', hair: '#e0d090', style: 'long', bg: '#3a3a2a', eyes: '#90b0d0', helm: true } }),
  thranduil: h('thranduil', { name: 'Thranduil', faction: 'elves', cls: 'magic', spec: { type: 'skill', id: 'leadership' }, skills: { leadership: 1, wisdom: 1 },
    lore: 'Dunkelskovs Elverkonge. Stolt, kold og med en krone af grene og bær.',
    portrait: { skin: '#f0e0d0', hair: '#f5f0d0', style: 'long', bg: '#1a2a2a', eyes: '#c0e0ff', crown: true } }),
  tauriel: h('tauriel', { name: 'Tauriel', faction: 'elves', cls: 'might', spec: { type: 'skill', id: 'logistics' }, skills: { logistics: 1, offense: 1 },
    lore: 'Vagtkaptajn i Dunkelskov. Hun jager edderkopper hvor andre elvere vender om.',
    portrait: { skin: '#f0d8c0', hair: '#b04a2a', style: 'long', bg: '#2a3a2a', eyes: '#80c080' } }),

  // -------- Orker --------
  grimgor: h('grimgor', { name: 'Grimgor Jernhud', faction: 'orcs', cls: 'might', spec: { type: 'unit', id: 'black_orc' }, skills: { offense: 2 },
    lore: 'Den største Sorte Ork nogensinde. Han lever for at slås – og vinder altid.',
    portrait: { skin: '#3f6a2a', hair: '#1a1a1a', style: 'mohawk', bg: '#3a1a10', eyes: '#ff4040', tusks: true, scar: true } }),
  azhag: h('azhag', { name: 'Azhag den Slagter', faction: 'orcs', cls: 'magic', spec: { type: 'stat', stat: 'power' }, skills: { wisdom: 1, sorcery: 1 },
    lore: 'En ork-warboss med en forbandet jernkrone, der hvisker necromantikerens hemmeligheder.',
    portrait: { skin: '#4f7a2a', hair: '#000', style: 'crown', bg: '#2a1a2a', eyes: '#c0ff40', tusks: true } }),
  gorbad: h('gorbad', { name: 'Gorbad Jernklo', faction: 'orcs', cls: 'might', spec: { type: 'skill', id: 'offense' }, skills: { offense: 1, leadership: 1 },
    lore: 'Den største Waaagh!-leder i Den Gamle Verdens historie. Han brændte selv Altdorfs porte.',
    portrait: { skin: '#5a8a2a', hair: '#2a2a2a', style: 'helm', bg: '#3a2a10', eyes: '#ffb040', tusks: true } }),
  azog: h('azog', { name: 'Azog Skænderen', faction: 'orcs', cls: 'might', spec: { type: 'unit', id: 'warg_rider' }, skills: { logistics: 1, offense: 1 },
    lore: 'Den blege ork fra Gundabad. Han red på en hvid varg og jog Thorins slægt gennem Midgård.',
    portrait: { skin: '#d0d0c8', hair: '#d0d0c8', style: 'bald', bg: '#2a2a3a', eyes: '#e0e0ff', scar: true } }),
  bolg: h('bolg', { name: 'Bolg', faction: 'orcs', cls: 'might', spec: { type: 'unit', id: 'orc_boy' }, skills: { armorer: 1, offense: 1 },
    lore: 'Azogs søn, der førte orkerne i De Fem Hæres Slag.',
    portrait: { skin: '#9a9a90', hair: '#1a1a1a', style: 'bald', bg: '#1a1a1a', eyes: '#ffa040', tusks: true, scar: true } }),
  gothmog: h('gothmog', { name: 'Gothmog', faction: 'orcs', cls: 'might', spec: { type: 'skill', id: 'leadership' }, skills: { leadership: 1, armorer: 1 },
    lore: 'Mordors løjtnant, der ledte belejringen af Minas Tirith.',
    portrait: { skin: '#9a8a70', hair: '#2a2a2a', style: 'bald', bg: '#3a2020', eyes: '#ffd080', scar: true } }),
  lurtz: h('lurtz', { name: 'Lurtz', faction: 'orcs', cls: 'might', spec: { type: 'unit', id: 'orc_archer' }, skills: { archery: 1, scouting: 1 },
    lore: 'Den første Uruk-hai, Sarumans afkom. Hans pile fældede Boromir.',
    portrait: { skin: '#4a3a2a', hair: '#1a1a1a', style: 'wild', bg: '#2a2a2a', eyes: '#ffe080' } }),
  grishnakh: h('grishnakh', { name: 'Grishnákh', faction: 'orcs', cls: 'magic', spec: { type: 'skill', id: 'logistics' }, skills: { logistics: 1, mysticism: 1 },
    lore: 'Mordors snigende udsending. Han foretrækker list frem for kamp – og kniv frem for økse.',
    portrait: { skin: '#5a6a3a', hair: '#1a1a1a', style: 'hood', bg: '#1a1a2a', eyes: '#ffff80' } }),
  wurrzag: h('wurrzag', { name: 'Wurrzag Ud Ura Zahubu', faction: 'orcs', cls: 'magic', spec: { type: 'skill', id: 'sorcery' }, skills: { sorcery: 1, wisdom: 1 },
    lore: 'Den Store Grønne Profet. Gork og Mork taler gennem hans vanvittige dans.',
    portrait: { skin: '#5a8a2a', hair: '#e0e0e0', style: 'wild', bg: '#2a3a10', eyes: '#80ff80', paint: true } }),
};
export const HERO_IDS = Object.keys(HEROES);
export const STAT_NAMES = { attack: 'Angreb', defense: 'Forsvar', power: 'Magt', knowledge: 'Viden' };
export const STAT_IDS = ['attack', 'defense', 'power', 'knowledge'];
export const LEVEL_XP = (() => {
  const a = [0, 0, 1000, 2000, 3200, 4600, 6200, 8000, 10000, 12200, 14700, 17500];
  while (a.length < 80) a.push(Math.round(a[a.length - 1] + (a[a.length - 1] - a[a.length - 2]) * 1.2));
  return a;
})();
