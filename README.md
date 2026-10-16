# Troner af Skov & Jern

Et turbaseret fantasy-strategispil i stil med *Heroes of Might and Magic III*, sat i et univers der
blander **Ringenes Herre (Midgård)** og **Warhammer Fantasy (Den Gamle Verden)**.

Version 1.1: **Skovelvere** (Athel Loren / Lothlórien) mod **Orker** (Mordor / de Grønne Horder) – mod én AI-modstander.

Spillet er en ren web-app (HTML5 Canvas + JavaScript, ingen build-step) lavet til Android-telefoner i liggende format.
Det kan installeres som app (PWA) og virker offline.

## Sådan spiller du på din Android-telefon

1. Læg filerne på en webserver (se *Hosting* nedenfor) – fx GitHub Pages.
2. Åbn adressen i **Chrome** på telefonen.
3. Tryk på ⋮-menuen → **Føj til startskærm** / **Installer app**.
4. Start spillet fra ikonet på hjemmeskærmen. Det kører i fuld skærm, liggende, og virker offline.

> Spillet gemmer automatisk efter hver tur (i telefonens lokale lager). Vælg **Fortsæt** i hovedmenuen.

### Hosting med GitHub Pages

Repoet indeholder alt der skal til. I GitHub: *Settings → Pages → Deploy from a branch → main / root*.
Spillet ligger derefter på `https://<brugernavn>.github.io/<repo>/`.

Lokalt kan du teste med `python3 -m http.server 8000` og åbne `http://localhost:8000/`.

## Grafik (1.1)

Al grafik er procedurel Canvas-tegning i høj opløsning (2× sprites, skarpt på telefoner):

- Sømløse terræntexturer med håndtegnede detaljer pr. felt, malede overgange med skygge, sandstrande ved søer og storskala lys/skygge.
- Træer, bjerge, klipper, miner, boliger, byer og helte med outlines, volumen, glødende vinduer, røg og flag.
- Enhedsfigurer med outline og shading; skyet, drivende tåge; atmosfæriske partikler (gyldne blade, gløder, sne, ildfluer).
- Slagmark med malet jord, slag-/skud-/besværgelseseffekter (ildkugle, lyn, kædelyn, heling, buffs), partikler og kamerarystelse, samt turrækkefølge-strimmel.
- Malet hovedmenu-scene, panoramabanner i byskærmen, minimap (🗺) og et gennemført UI-tema med guldrammer.

## Egne billeder / realistisk grafik

Al grafik er procedurel, og der er en naturlig grænse for hvor "realistisk" kodetegnet grafik kan blive.
Spillet understøtter derfor **billed-assets**: Læg PNG-filer i `assets/` og list dem i `assets/manifest.json`, så bruges de
automatisk i stedet for den tegnede grafik (enheder, helte, portrætter, byer, objekter, træer, terræn). Se `assets/README.md`
for filnavne og størrelser. Mangler et billede, falder spillet tilbage til den procedurelle tegning.

## Spillets indhold (1.0)

- **Procedurelt genererede kort** (lille/mellem/stor) med græsland, jord, sump, sne, askeland, søer, bjerge og skove.
  Elverlandet er gyldne lunde; orkernes land er aske og klipper.
- **Eventyrkort** med tåge, veje, miner (guld, tømmer, malm, mithril, warpsten, ædelsten), boliger, skattekister, artefakter,
  helligdomme, runesten, kilder, Visdommens Træ, stalde, udkigstårne, lykkebrønde, lejre, vindmøller og ruiner.
- **Monstre** der bevogter felterne omkring sig (varge, edderkopper fra Dunkelskov, gravvætter, udyrmænd, trolde, drager …).
- **Byer** med 23 bygninger: rådhus-kæde, fort/citadel/slot, taverne, marked, lager, magiergilde I–V, 7 enhedsboliger og en
  fraktionsbygning (Verdensrødderne / Krigstrommerne).
- **14 enheder pr. side** (7 pr. fraktion) + 9 neutrale, hver med evner (skytte, flyvende, stormangreb, regeneration, gift …).
- **17 helte** med portrætter, klasser (Skovvogter/Sangvæver, Warboss/Shaman), specialer, 14 færdigheder, erfaring og niveauer.
- **27 artefakter** (Orcrist, Mithril-brynje, Den Ene Ring, Gorks Kølle, Palantír …) med udstyrspladser og rygsæk.
- **20 besværgelser** i 5 niveauer (Magisk Pil, Hast, Ildkugle, Kædelyn, Genopstandelse, Gorks Fod …).
- **Taktisk hexkamp** med initiativ, gengældelse, moral, held, skud, belejring med mure, auto-kamp og flugt.
- **AI-modstander** der bygger, hyrer, udforsker, erobrer miner og angriber når den er stærk nok. Tre sværhedsgrader.
- **Gem/indlæs** (automatisk), PWA-manifest og service worker.

## Styring

- Tryk på en helt for at vælge den. Tryk på et felt for at planlægge en rute, tryk igen for at gå.
- Træk med én finger for at panorere, knib for at zoome.
- Tryk på en by i højre panel for at åbne byskærmen. Tryk på helteportrættet for helteskærmen.
- I kamp: tryk på et felt for at flytte, på en fjende for at angribe/skyde. Knapperne giver Vent, Forsvar, Besværgelse, Auto og Flygt.

## Kodestruktur

```
index.html, css/style.css, manifest.webmanifest, sw.js
js/main.js              – app-bootstrap og skærmskift
js/core/                – RNG, noise, hjælpefunktioner
js/data/                – alt spildata (fraktioner, enheder, helte, besværgelser, artefakter, bygninger, terræn)
js/map/                 – kortgenerator og A*-stifinding
js/game/                – spiltilstand, helte, byer, bevægelse, interaktioner, turflow, gem/indlæs
js/combat/              – hexgitter, kampmotor, kamp-AI, kampafvikler
js/ai/                  – eventyrkort-AI
js/render/              – procedurel grafik (sprites, figurer, portrætter, ikoner) og renderere
js/ui/                  – HUD, dialoger, by-, helte- og kampskærm, menu
```

Alt grafik tegnes procedurelt med Canvas – der er ingen billedfiler at vedligeholde, og nye enheder/bygninger kan
tilføjes alene ved at udvide datafilerne.

## Videre udvikling (idéer til 1.1+)

- Flere fraktioner (Dværge, Imperiet/Gondor, Vampyrer/Angmar, Kaos).
- Opgraderede enheder, krigsmaskiner, både og underjordiske kort.
- Flere AI-modstandere og allierede, scenarier/kampagne.
- Lydeffekter og musik.
