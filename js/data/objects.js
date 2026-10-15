// Adventure-map object types.
export const OBJ = {
  TOWN: 'town', MINE: 'mine', DWELLING: 'dwelling', RESOURCE: 'resource', CHEST: 'chest',
  ARTIFACT: 'artifact', MONSTER: 'monster', SHRINE: 'shrine', RUNESTONE: 'runestone',
  WELL: 'well', TREE: 'tree', STABLES: 'stables', TOWER: 'tower', FOUNTAIN: 'fountain',
  CAMP: 'camp', WINDMILL: 'windmill', RUIN: 'ruin',
};
export const OBJ_INFO = {
  shrine: { name: 'Gammel Helligdom', desc: 'Lærer en besværgelse til en besøgende helt.' },
  runestone: { name: 'Runesten', desc: 'Giver 1000 erfaring første gang en helt besøger den.' },
  well: { name: 'Hellig Kilde', desc: 'Genopfylder heltens mana.' },
  tree: { name: 'Visdommens Træ', desc: 'Hæver en helt et niveau (koster 2000 guld). Én gang pr. helt.' },
  stables: { name: 'Rohirrims Stald', desc: '+400 bevægelse resten af ugen.' },
  tower: { name: 'Udkigstårn', desc: 'Afslører et stort område af kortet.' },
  fountain: { name: 'Lykkebrønd', desc: '+1 held i næste kamp.' },
  camp: { name: 'Vandrerlejr', desc: '+1 moral i næste kamp.' },
  windmill: { name: 'Vindmølle', desc: 'Giver en sjælden ressource én gang om ugen.' },
  ruin: { name: 'Forladt Ruin', desc: 'Bevogtet skat.' },
  chest: { name: 'Skattekiste', desc: 'Vælg guld eller erfaring.' },
};
