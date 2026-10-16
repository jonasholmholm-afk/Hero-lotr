# Egne billeder (valgfrit)

Spillet tegner al grafik selv, men hvis du lægger PNG-filer her og opretter `assets/manifest.json`,
bruges billederne automatisk i stedet. Eksempel:

```json
{ "files": ["units/dryad.png", "units/goblin.png", "terrain/grass.png", "towns/elves.png", "portraits/orion.png"] }
```

| Mappe | Filnavn | Størrelse (px) | Bemærkning |
|---|---|---|---|
| `units/` | `<enheds-id>.png` (fx `dryad`, `orc_boy`, `dragon`) | 192×192, gennemsigtig | Vender mod højre, fødder ca. 8 % over bunden |
| `heroes/` | `elves.png`, `orcs.png` | 160×180, gennemsigtig | Rytter vender mod højre, bunden = jorden |
| `portraits/` | `<helte-id>.png` (fx `legolas`, `grimgor`) | 128×128 | Kvadratisk |
| `towns/` | `elves.png`, `orcs.png` eller `elves_0..3.png` (fortniveau) | 400×320, gennemsigtig | Indgang i bund-midten |
| `objects/` | `mine_gold.png`, `mine_wood.png`, `mine_ore.png`, `mine_mithril.png`, `mine_warpstone.png`, `mine_gems.png`, `dwelling_<enheds-id>.png`, `resource_<ressource>.png`, `chest.png`, `artifact.png`, `shrine.png`, `runestone.png`, `well.png`, `tree.png`, `stables.png`, `tower.png`, `fountain.png`, `camp.png`, `windmill.png`, `ruin.png` | 160×168, gennemsigtig | Bunden = jorden |
| `decor/` | `pine`, `leafy`, `golden`, `dead`, `mountain`, `rock`, `flowers`, `mushroom`, `stump`, `reeds`, `snowpine`, `bush`, `pebbles` (`.png`, evt. `_0`..`_3` varianter) | 2× sprite-størrelsen (fx træ 136×180) | Bunden = jorden |
| `terrain/` | `water`, `grass`, `dirt`, `rough`, `swamp`, `snow`, `ash` (`.png`) | 192×192, **sømløs** (tileable) | |

Enheds-id'er: dryad, glade_guard, eternal_guard, wardancer, wild_rider, great_eagle, treeman, goblin, orc_boy, orc_archer,
warg_rider, black_orc, troll, giant, skeleton, wolf, dunlending, beastman, spider, wight, minotaur, cave_troll, dragon.
Helte-id'er: orion, ariel, drycha, naestra, legolas, haldir, thranduil, tauriel, grimgor, azhag, gorbad, azog, bolg, gothmog, lurtz, grishnakh, wurrzag.

Husk at bumpe `VERSION` i `sw.js`, når du tilføjer eller ændrer billeder.
