export const SLOTS = ['weapon', 'shield', 'armor', 'helmet', 'cloak', 'ring', 'amulet', 'boots', 'misc1', 'misc2'];
export const SLOT_NAMES = { weapon: 'Våben', shield: 'Skjold', armor: 'Rustning', helmet: 'Hjelm', cloak: 'Kappe', ring: 'Ring', amulet: 'Amulet', boots: 'Støvler', misc1: 'Diverse', misc2: 'Diverse' };
const a = (id, o) => ({ id, rarity: 1, ...o });
export const ARTIFACTS = {
  orcrist: a('orcrist', { name: 'Orcrist, Goblinkløveren', slot: 'weapon', bonus: { attack: 3 }, rarity: 2, lore: 'Elversværdet fra Gondolin. Det lyser blåt når orker er nær.', art: { c: '#9fd0ff', g: 'sword' } }),
  glamdring: a('glamdring', { name: 'Glamdring', slot: 'weapon', bonus: { attack: 4 }, rarity: 2, lore: 'Fjendehammeren, båret af Turgon og siden af Gandalf.', art: { c: '#d0e8ff', g: 'sword' } }),
  rune_axe: a('rune_axe', { name: 'Dværgenes Runeøkse', slot: 'weapon', bonus: { attack: 2, defense: 2 }, lore: 'Smedet i Karaz-a-Karak med runer af Grimnir.', art: { c: '#d0a060', g: 'axe' } }),
  bow_galadhrim: a('bow_galadhrim', { name: 'Galadhrims Bue', slot: 'weapon', bonus: { attack: 2, power: 1 }, lore: 'En bue af mallorn-træ, strenget med elverhår.', art: { c: '#e0c080', g: 'bow' } }),
  gorks_club: a('gorks_club', { name: 'Gorks Kølle', slot: 'weapon', bonus: { attack: 5, defense: -1 }, rarity: 2, lore: 'Brutal, men kunning. Eller kunning, men brutal.', art: { c: '#a0c040', g: 'club' } }),
  shield_rohan: a('shield_rohan', { name: 'Rohans Skjold', slot: 'shield', bonus: { defense: 3 }, lore: 'Prydet med Marks hvide hest.', art: { c: '#60a060', g: 'shield' } }),
  uruk_shield: a('uruk_shield', { name: 'Uruk-skjold', slot: 'shield', bonus: { defense: 2, attack: 1 }, lore: 'Sarumans hvide hånd på sort jern.', art: { c: '#e0e0e0', g: 'shield' } }),
  mithril_shirt: a('mithril_shirt', { name: 'Mithril-brynje', slot: 'armor', bonus: { defense: 4 }, rarity: 2, lore: 'Lettere end en fjer og hårdere end dragehud.', art: { c: '#d0f0ff', g: 'armor' } }),
  black_armor: a('black_armor', { name: 'Sort Ork-rustning', slot: 'armor', bonus: { defense: 3 }, lore: 'Tung jernplade fra Grimgors egne smedjer.', art: { c: '#404040', g: 'armor' } }),
  crown_thranduil: a('crown_thranduil', { name: 'Skovkongens Krone', slot: 'helmet', bonus: { knowledge: 3 }, rarity: 2, lore: 'Grene, bær og efterårsblade – Dunkelskovs kongekrone.', art: { c: '#e0a040', g: 'crown' } }),
  iron_helm: a('iron_helm', { name: 'Uruk-hjelm', slot: 'helmet', bonus: { defense: 2 }, lore: 'Smedet i Isengards gruber.', art: { c: '#808080', g: 'helm' } }),
  iron_crown: a('iron_crown', { name: 'Jernkronen', slot: 'helmet', bonus: { power: 3, knowledge: 1 }, rarity: 2, lore: 'Azhags forbandede krone, der hvisker i mørket.', art: { c: '#606070', g: 'crown' } }),
  elven_cloak: a('elven_cloak', { name: 'Lóriens Kappe', slot: 'cloak', bonus: { defense: 2 }, lore: 'Vævet af Galadriels tjenerinder. Skjuler bæreren for fjendens blik.', art: { c: '#80a080', g: 'cloak' } }),
  wolf_pelt: a('wolf_pelt', { name: 'Vargepels', slot: 'cloak', bonus: { attack: 1, defense: 1 }, lore: 'Taget fra en ulvehøvding på Ødemarken.', art: { c: '#707070', g: 'cloak' } }),
  ring_barahir: a('ring_barahir', { name: 'Barahirs Ring', slot: 'ring', bonus: { attack: 1, defense: 1 }, lore: 'Finrods gave til Barahir. Isildurs arvingers tegn.', art: { c: '#60c060', g: 'ring' } }),
  one_ring: a('one_ring', { name: 'Den Ene Ring', slot: 'ring', bonus: { attack: 4, defense: 4, power: 4, knowledge: 4, morale: -2, luck: -2 }, rarity: 3, lore: 'Én ring til at herske over dem alle. Magten har sin pris.', art: { c: '#ffd700', g: 'ring' } }),
  evenstar: a('evenstar', { name: 'Aftenstjernen', slot: 'amulet', bonus: { power: 2, knowledge: 1 }, rarity: 2, lore: 'Arwens smykke, givet som løfte.', art: { c: '#e0f0ff', g: 'gem' } }),
  morks_tooth: a('morks_tooth', { name: 'Morks Tand', slot: 'amulet', bonus: { power: 3 }, lore: 'En tand så stor som en hånd, fuld af grøn magi.', art: { c: '#a0ff80', g: 'gem' } }),
  warpstone_amulet: a('warpstone_amulet', { name: 'Warpstens-amulet', slot: 'amulet', bonus: { knowledge: 2, power: 1 }, lore: 'Glødende, farlig og dragende.', art: { c: '#80ff40', g: 'gem' } }),
  lucky_charm: a('lucky_charm', { name: 'Ranalds Lykkeamulet', slot: 'amulet', bonus: { luck: 2 }, lore: 'Gudens smil følger bæreren.', art: { c: '#ffe080', g: 'gem' } }),
  boots_strider: a('boots_strider', { name: 'Vandrerens Støvler', slot: 'boots', bonus: { movement: 300 }, lore: 'Slidte af tusind mil over Eriador.', art: { c: '#a07040', g: 'boots' } }),
  troll_boots: a('troll_boots', { name: 'Troldeskinds-støvler', slot: 'boots', bonus: { defense: 1, movement: 150 }, lore: 'Hårde som sten, lugter som trold.', art: { c: '#708060', g: 'boots' } }),
  gondor_horn: a('gondor_horn', { name: 'Gondors Horn', slot: 'misc', bonus: { morale: 1 }, lore: 'Boromirs horn. Dets kald giver mod i de mørkeste timer.', art: { c: '#e0d0b0', g: 'horn' } }),
  waaagh_banner: a('waaagh_banner', { name: 'Waaagh!-banner', slot: 'misc', bonus: { morale: 2 }, rarity: 2, lore: 'Når banneret vajer, brøler hele horden.', art: { c: '#ff4040', g: 'banner' } }),
  phial: a('phial', { name: 'Galadriels Flakon', slot: 'misc', bonus: { power: 1, knowledge: 1, luck: 1 }, rarity: 2, lore: 'Eärendils lys, fanget i vand fra Galadriels spejl.', art: { c: '#ffffff', g: 'gem' } }),
  palantir: a('palantir', { name: 'Palantír', slot: 'misc', bonus: { knowledge: 2, scouting: 3 }, rarity: 2, lore: 'En seende sten fra Númenor. Viser fjerne lande – og fjerne øjne.', art: { c: '#404060', g: 'orb' } }),
  spellbook_saruman: a('spellbook_saruman', { name: 'Sarumans Skrifter', slot: 'misc', bonus: { power: 2 }, lore: 'Mange-farvede skrifter fuld af ringlore.', art: { c: '#c0c0ff', g: 'book' } }),
};
export const ARTIFACT_IDS = Object.keys(ARTIFACTS);
/** Sets: wearing every piece at once grants the extra bonus. */
export const ARTIFACT_SETS = {
  erebor: { name: 'Erebors Arv', items: ['orcrist', 'mithril_shirt'], bonus: { attack: 2, defense: 2 }, lore: 'Thorins gaver: sværdet fra Gondolin og brynjen fra Bjerget.' },
  light: { name: 'Lysets Vogtere', items: ['glamdring', 'phial', 'evenstar'], bonus: { power: 2, luck: 1 }, lore: 'Eärendils lys i tre skikkelser.' },
  lorien: { name: 'Lóriens Gaver', items: ['elven_cloak', 'bow_galadhrim'], bonus: { luck: 1, movement: 200 }, lore: 'Galadriels gaver til vandrerne.' },
  isengard: { name: 'Isengards Arv', items: ['uruk_shield', 'iron_helm', 'spellbook_saruman'], bonus: { power: 2, knowledge: 2 }, lore: 'Den Hvide Hånds samlede kraft.' },
  waaagh: { name: 'Gork og Morks Gunst', items: ['gorks_club', 'morks_tooth', 'waaagh_banner'], bonus: { attack: 3, morale: 1 }, lore: 'Når begge guder griner, brøler hele horden.' },
  numenor: { name: 'Númenors Arv', items: ['ring_barahir', 'gondor_horn', 'palantir'], bonus: { defense: 2, knowledge: 1, scouting: 2 }, lore: 'Kongernes arvestykker fra det sunkne rige.' },
  shadow: { name: 'Skyggens Kroner', items: ['iron_crown', 'one_ring', 'black_armor'], bonus: { power: 3, defense: 2 }, lore: 'Mørkets samlede herredømme. Prisen er høj.' },
};
export function activeSets(equipped) { return Object.values(ARTIFACT_SETS).filter((s) => s.items.every((i) => equipped.includes(i))); }
export const BONUS_NAMES = { attack: 'Angreb', defense: 'Forsvar', power: 'Magt', knowledge: 'Viden', morale: 'Moral', luck: 'Held', movement: 'Bevægelse', scouting: 'Synsvidde' };
export function bonusStr(b) {
  return Object.entries(b).map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${BONUS_NAMES[k] || k}`).join(', ');
}
