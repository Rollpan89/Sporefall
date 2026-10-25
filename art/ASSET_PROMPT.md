# SPOREFALL — image asset brief

A single brief to hand to an image model. Everything the game needs is listed:
**88 icons on three sprite sheets, 5 buried hearts as separate files, 5 stage
backdrops, a background texture, a wordmark, a favicon and a release strip.**

How to use it:

1. Paste **THE PROMPT** below, plus the sheet you want in that pass.
2. Generate **one sheet per request** — never all three at once.
3. The five hearts are separate hero assets. Generate each as its own file, four
   candidates each, and keep the stage that reads best beside its neighbours.
4. If the model ignores the grid (common), use the per-icon fallback: generate each
   icon at 512×512 on #FF00FF and pack the 2048×2048 sheet yourself
   (`magick montage icon-*.png -tile 8x8 -geometry 256x256+0+0 sheet-a.png`).
5. Most chat models return a checkerboard instead of alpha. Key out the magenta, or
   run the result through a background remover; do not accept a baked checkerboard.

---

# THE PROMPT

You are generating art for **SPOREFALL**, a quiet, dark incremental game about the
last fungus on a dead world. Read this whole brief before drawing anything. Every
asset you make must look like it came from the same hand, the same book, the same
world.

## 1. Art direction

Botanical-plate engraving meets bioluminescent decay. Fine stippled and hatched
linework over matte near-black fills, soft inner light, a single accent colour per
subject, and a great deal of empty darkness. Think an old mycological atlas
illustrated by someone who has only ever seen the fungus by its own glow.

- **Mood:** buried, patient, hungry, sacred. Quiet horror, not action horror.
- **Technique:** engraved ink linework with painted fills; visible hatching and
  stipple in the shadows; low-opacity paper grain and spore dust.
- **Light:** one soft key light from above-left; the subject also emits a weak inner
  glow from its core. No second light source, no rim light on the outside edge.
- **Form:** every subject is an organism first. Asymmetric, lumpy, grown — never a
  manufactured object, never a clean geometric primitive unless the subject is
  literally one (The Silence, the world).
- **Restraint:** 80% of each icon is near-black. The accent colour is a small
  percentage of the pixels and does the emotional work.

Do **not** use: 3D render, glossy plastic, anime, cartoon, comic outline, pixel art,
photoreal blood or viscera, human faces, hands, landscapes as wallpaper, lens flare,
rainbow palettes, neon cyberpunk, drop shadows that fall outside the subject,
mockup frames, UI chrome, signatures, or any text except the one wordmark specified.

## 2. Palette

Base range (use for all fills and shadows):

| role | hex |
|---|---|
| void | `#050908` |
| soil | `#0c1512` |
| structure | `#213229` |
| mint | `#93f2c3` |
| mint deep | `#55c997` |
| mint shadow | `#2d7d5f` |
| gold | `#eacb85` |
| rust | `#d9846b` |

Stage accents — one per evolution, never mixed within an asset:

| stage | accent | secondary |
|---|---|---|
| Spore | `#93f2c3` mint | `#55c997` |
| Grove | `#b6efad` pale leaf | `#6cc87c` |
| Territory | `#f3d9a2` amber | `#d3a45f` |
| Biome | `#a9e4ee` cold cyan | `#63b6cd` |
| The Maw | `#ddcbff` violet | `#a78ce6` |

Rarity accents for mutation and record icons: common mint `#93f2c3`, uncommon pale
blue `#8fcfe8`, rare gold `#eacb85`.

## 3. Technical rules

**Icons — three sprite sheets**

- Canvas exactly **2048 × 2048 px**, an **8 × 8 grid of 256 px cells**.
- No visible grid lines, borders, labels, numbers, captions or frames.
- Fill cells **row by row, left to right, in the numbered order given**. Index 1 is
  the top-left cell, index 9 is the first cell of row 2, index 57 the first of row 8.
- Each icon is centered in its cell, occupies **at most 200 × 200 px**, and keeps at
  least 12 px of clearance from every cell edge. Icons must not bleed between cells.
- Empty cells stay **fully transparent**.
- Uniform apparent scale and line weight across the whole sheet: a Spore Pod and a
  World-Eater Mycelium must look like objects from the same collection.
- Every icon is a **single object, straight-on orthographic view, slight top-left
  light**. Readable as a silhouette at 48 px. Avoid hairline detail under 2 px.
- **Transparency:** deliver true alpha PNG in sRGB. If your tool cannot output alpha,
  use a flat `#FF00FF` background with hard edges and no anti-aliased fringe, and say
  so. Never output a checkerboard pattern.

**Hearts — five separate files, the hero assets**

- Each heart is its own **1024 × 1024 px PNG**, transparent, not on a sheet.
- Centered circular silhouette about **780 px across** (76% of canvas), soft edge,
  nothing else in the frame: no ground, no cast shadow, no pedestal, no frame, no
  text, no border.
- Keep the outer 10% of the canvas empty.
- The game rotates a ring of thread-arms around the heart and draws its own glow —
  **do not draw arms, tendrils that leave the silhouette, or a halo ring.** Threads
  that stay inside the circular mass are good.
- All five use the **same camera, same diameter and the same silhouette logic**, so
  they read as one organism at five scales.

**Stage backdrops — five separate files**

- **2048 × 2048 px**, transparent.
- A clean **circular hole of full transparency, 46% wide, centered** (the heart sits
  there). Nothing crosses the middle.
- Radial composition around that hole, fading to zero opacity at the canvas edge.
- No text, no frame, no horizon line that runs edge to edge.

**Other files**

- Background texture: 2048 × 2048, seamless/tileable, very low contrast.
- Wordmark: 2048 × 768, transparent.
- Favicon: 512 × 512, transparent.
- Release strip: 3072 × 512, six 512 × 512 frames in a row.

## 4. Sheet A — interface, stages, drift, colony tiers

39 icons, numbered in fill order. Filenames are the fallback single-file names.

| # | id | subject |
|---|---|---|
| 1 | icon-res-biomass | A dense knot of dark organic matter the size of a fist, wet and fibrous, with a small mint light caught in its folds. |
| 2 | icon-res-spore | A single golden spore: teardrop, faint longitudinal ridges, translucent skin, one bright point inside. |
| 3 | icon-stat-bps | Three ascending organic pulses stacked like a rising heartbeat, engraved, mint at the tips. |
| 4 | icon-stat-click | A nerve knot: a small ring of hyphae with a bright touch-point in the centre, pressure lines radiating a finger's width. |
| 5 | icon-stat-colonies | Six or seven rounded nodes of different sizes joined by short threads, top-down, like a map of a small settlement. |
| 6 | icon-stat-drift | A mote with a comet tail of dust, gold, moving right. |
| 7 | icon-frenzy | A burst of straight threads radiating from one point, gold, sharp and fast. |
| 8 | icon-sound-on | A small fruiting body with three concentric arcs of sound leaving the cap, mint. |
| 9 | icon-sound-off | The same fruiting body, arcs cut and falling away, dim. |
| 10 | icon-menu | Three hyphae crossing at a single knot, one horizontal, two diagonal, like a made sign. |
| 11 | icon-auto | A closed loop of hyphae eating its own tail, with a small arrowhead; self-turning. |
| 12 | icon-evolve | A spiral of growth opening upward, each turn wider than the last, one bright tip at the top. |
| 13 | icon-lock | A closed chitin pod, ridged, seam down the middle, no keyhole — locked by being shut. |
| 14 | icon-check | A single engraved tick inside a thin ring of fossil growth, mint. |
| 15 | icon-close | Two dry twigs crossed, bound at the centre, no ring. |
| 16 | icon-action-fruit | A pod splitting at the top and releasing a cloud of tiny spores upward, gold. |
| 17 | icon-tab-upgrades | A node with two new shoots breaking from it, one longer, one shorter. |
| 18 | icon-tab-strain | A double helix of two hyphae twisting, one pale, one dark. |
| 19 | icon-tab-spores | A spore with a thin halo and a trail of dust, gold. |
| 20 | icon-tab-record | A cross-section of growth rings, fossil-dark, one ring cracked. |
| 21 | icon-stage-spore | A germinating dot with two short threads and a hairline crack in its shell. |
| 22 | icon-stage-forest | A stylized tree grown from threads: three trunks, layered canopies, roots below. |
| 23 | icon-stage-country | A country from above: a grid of fields, one river, a crossroads with a bright node at the centre. |
| 24 | icon-stage-continent | A single landmass silhouette with a ragged coastline and one inland sea. |
| 25 | icon-stage-world | A small ringed planet, continents visible, a thin band of dust around it. |
| 26 | icon-drift-gold | A golden mote, smooth, luminous, with a faint pulse ring. |
| 27 | icon-drift-green | The same mote in mint green, slightly smaller, cooler. |
| 28 | icon-tier-hypha | One pale hyphal thread, forked once near the tip, faintly luminous. |
| 29 | icon-tier-pod | A ribbed spore pod, closed, seam glowing faintly. |
| 30 | icon-tier-mold | A fuzzy decomposer rosette of mould digesting a dark crumb. |
| 31 | icon-tier-mat | A woven mat of mycelium seen from above, dense at the centre, fraying at the edge. |
| 32 | icon-tier-fruit | A luminous mushroom with clear gills, cap slightly too large for its stem. |
| 33 | icon-tier-lichen | A lichen rosette with two textures: crusty pale lobes and a darker inner scale. |
| 34 | icon-tier-root | A hollow root in cross-section: a ring of pale wood around a black void. |
| 35 | icon-tier-heart | A pulsing organ-shaped knot of hyphae wrapped around a dark core. Fungal, not anatomical, no blood. |
| 36 | icon-tier-void | A flower opening into a black void, its petals edged with tiny stars. |
| 37 | icon-tier-eater | A jagged crescent of mycelium biting into a small pale sphere, threads anchoring the bite. |
| 38 | icon-tier-yesterday | A fossilised humanoid silhouette overgrown with fungus, faceless, head bowed, more fungus than figure. |
| 39 | icon-tier-silence | A perfect dark disc with the faintest pale rim, nearly empty, one dim mote inside. |

Intended display sizes: 14–42 px in the colony list and 16 px in tabs, so silhouettes
must survive heavy downscaling.

## 5. Sheet B — spore tree and mutations

29 icons. The spore tree is gold; mutation icons take their rarity accent (common
mint 12–16, uncommon pale blue 17–23, rare gold 24–29).

| # | id | subject |
|---|---|---|
| 1 | icon-node-germination | A seed cracking open, one green shoot and one white root leaving it. |
| 2 | icon-node-instinct | A knot of nerves with a bright reflex point at its centre, like a closed eye made of threads. |
| 3 | icon-node-recollection | A spiral of hyphae with rings inside it, memory stored in the curve. |
| 4 | icon-node-patience | A stone worn into a bowl by a single slow drip; the drop is mid-fall, gold. |
| 5 | icon-node-frugality | A tight, efficient knot with only three threads leaving it, everything else folded in. |
| 6 | icon-node-momentum | A comet of threads with a long trailing tail, one bright head. |
| 7 | icon-node-deeproots | A root system descending into darkness, splitting again and again, faint light at the tips. |
| 8 | icon-node-draft | Three small pods of clearly different shapes side by side: round, tall, hollow. |
| 9 | icon-node-second | Two mushrooms, one full and one newly opening, sharing a root. |
| 10 | icon-node-automation | A ring of hyphae turning itself, with a small latch and a repeated motion arc. |
| 11 | icon-node-overgrowth | A mound of fungus bursting outward in every direction, edges fraying. |
| 12 | icon-mut-sweetrot | A slow golden droplet of rot, sweet and thick, spores suspended inside it. |
| 13 | icon-mut-thickwalls | A cell cross-section with an exaggerated thick wall, the interior small and dark. |
| 14 | icon-mut-rotfed | An overripe fruiting body split open, collapsing under its own sweetness. |
| 15 | icon-mut-feral | A hungry fungal pore opening like a mouth, ringed with short grasping threads. No teeth, no gore. |
| 16 | icon-mut-frantic | Threads growing too fast, tangling into a knot that is already out of control. |
| 17 | icon-mut-predatory | A flower with sticky tendrils curling inward, a caught mote at its centre. Pale blue. |
| 18 | icon-mut-clonal | Six identical small pods crowded shoulder to shoulder, all the same. Pale blue. |
| 19 | icon-mut-parasitism | One hypha entering a larger pale cell through a small wound, the host still round and intact. Pale blue. |
| 20 | icon-mut-mycorrhiza | Two root systems quietly interwoven, exchanging a single bright point. Pale blue. |
| 21 | icon-mut-communion | Two spores touching, sharing one halo, dust moving between them. Pale blue. |
| 22 | icon-mut-molt | A shed chitin husk, split down the back, empty and translucent. Pale blue. |
| 23 | icon-mut-sacrifice | A rust-red bloom where something has been given up; the cut is clean and old, no blood. Pale blue. |
| 24 | icon-mut-dormancy | A closed pod under frost, everything pulled inward, a thin rim of pale ice. Gold. |
| 25 | icon-mut-glasshouse | A spore sealed inside a clear crystal shell, refracted light, no way out. Gold. |
| 26 | icon-mut-filigree | Ornate chitin lace, symmetrical, grown like jewellery, impossibly fine. Gold. |
| 27 | icon-mut-ancestral | A fossil spiral with a pulse ring travelling outward from its centre. Gold. |
| 28 | icon-mut-hunger | A black hole made of threads, pulling the edges of the icon inward. Gold. |
| 29 | icon-mut-focus | One thread among many is bright gold; all the others lean toward it. Gold. |

## 6. Sheet C — records (achievements)

20 icons. All share one **medallion** format: a thin ring of hyphae, engraved, with a
single motif inside and the accent at the centre. This is the only family allowed a
shared frame — it is what makes the Record grid read as a collection.

| # | id | motif |
|---|---|---|
| 1 | icon-ach-firstclick | A single touch-ring where a thread meets a surface, one bright point. |
| 2 | icon-ach-click100 | A hundred tiny points scattered in a loose oval, all faintly lit. |
| 3 | icon-ach-click1000 | A spiral tightening until the centre is solid light. |
| 4 | icon-ach-col10 | One filament, clean, with ten small beads along it. |
| 5 | icon-ach-col50 | Seven nodes of different sizes bound into one cluster. |
| 6 | icon-ach-col200 | A landmass made of colony nodes, coastline suggested by their edge. |
| 7 | icon-ach-bio1e4 | A small mushroom breaking through a crust of ash. |
| 8 | icon-ach-bio1e8 | A mound of organic matter with roots, heavy and settled. |
| 9 | icon-ach-bio1e12 | A sphere with a clean bite taken out of it, threads still holding the bite. |
| 10 | icon-ach-tier5 | A tall stalk rising out of frame, cap at the top edge of the medallion. |
| 11 | icon-ach-tier8 | A heart-shaped knot of hyphae with a crack through it. |
| 12 | icon-ach-tier10 | A crescent bite closing around a tiny world. |
| 13 | icon-ach-up10 | Three stacked pods of increasing size, neatly balanced. |
| 14 | icon-ach-mut3 | An asymmetric three-lobed flower, each lobe a different texture. |
| 15 | icon-ach-mut8 | A double-lobed pod splitting into two unequal halves. |
| 16 | icon-ach-fruit1 | Spores falling from the top of the medallion, small and gold. |
| 17 | icon-ach-fruit5 | A loop that returns to its own beginning, arrowhead meeting tail. |
| 18 | icon-ach-drift10 | A mote caught in a spiral of wind, tail curling. |
| 19 | icon-ach-tree3 | A spiral with three growth rings, each ring a different shade. |
| 20 | icon-ach-bps1e6 | A rising column of spores, dense at the base, thinning upward. |

## 7. The five buried hearts (separate files)

Same organism, same camera, same 780 px silhouette. Each is a 1024 × 1024
transparent PNG. These are the most important assets in the set.

**heart-0-spore.png**
A fist-sized knot of pale hyphae half-buried in black ash, its centre a small
mint-white kernel of light. A few threads escape the knot but stay inside its
circular silhouette; the rest fold inward. The silhouette is imperfect, lumpy, almost shy. This is the youngest and
loneliest of the five: a thing that does not yet know what it will become.

**heart-1-forest.png**
The same knot opened into a grove. A dense ring of thin trunks and layered canopies
grown from the heart's own threads, moss filling the gaps, roots spilling below the
sphere. The core still glows at the centre, now filtered through leaves. Palette:
pale leaf-green, old wood, deep moss shadow. The sphere is busier than the spore but
still clearly one organism.

**heart-2-country.png**
The heart is a lantern of amber mycelium. Inside the sphere a miniature country is
visible: parallel field lines, one river, a crossroads, clusters of tiny warm lights
where towns would be. Chimneys and tower silhouettes push outward from within the
rim, still made of fungus. Palette: honey, bronze, soot. It should feel inhabited
and slightly wrong.

**heart-3-continent.png**
A hemisphere of ocean and land. Coastlines traced in glowing cyan mycelium, mountain
ridges like veins, a slow storm spiral over one sea, tectonic cracks running with
pale light. The core is deep, cold, and far away. Palette: cold cyan, deep navy,
glacier white.

**heart-4-world.png**
A complete violet planet. Its continents are arranged in one spiral around a bright
pole; a thin atmosphere of drifting spores wraps the sphere; a faint ring of dust
and a few stars are caught in the glassy edge. Calm, enormous, final. Palette:
violet, lavender, bone white.

## 8. Stage backdrops (separate files)

2048 × 2048, transparent, 46% transparent hole in the middle, radial, fading to
nothing at the edge. These sit behind the heart.

- **backdrop-0-spore.png** — bare ash and compacted soil, a few stones, buried
  threads and hairline cracks, very sparse. Almost nothing.
- **backdrop-1-forest.png** — a ring of trunks and canopies seen from the heart's
  height, undergrowth, falling spores, roots tying the ground together.
- **backdrop-2-country.png** — the country from above: field grids, a ring road, ten
  roads radiating outward, villages as clusters of warm lights, everything amber.
- **backdrop-3-continent.png** — one enormous landmass around the hole, ragged
  coastline, mountain ridges, an inland sea, weather fronts over the water.
- **backdrop-4-world.png** — a globe's curvature, meridians and parallels, cloud
  bands, continents under a violet atmosphere, stars beyond the limb.

## 9. Remaining graphics

- **bg-mycelium.png** — 2048 × 2048 seamless tile. A near-black field of fine
  mycelium, dust and tiny out-of-focus spores. No focal point, no bright area, no
  border, no vignette. It must sit behind text without competing.
- **wordmark.png** — 2048 × 768, transparent. The word **SPOREFALL**, all capitals,
  wide letterspacing, thin high-contrast serif with organic tapering. One or two
  hyphae thread through the letters without reducing legibility. Mint on
  transparent. No tagline, no other text, no badge.
- **favicon.png** — 512 × 512, transparent. The spore-stage heart reduced to a glyph:
  a dark circle with a mint core and two escaping threads. Must read at 32 px.
- **release-strip.png** — 3072 × 512, six 512 × 512 frames left to right, same
  framing throughout: a pod swells, splits, and throws a radial cloud of spores;
  frame 6 is mostly dissipating dust. Transparent or magenta.

## 10. Negative prompt

```
text, letters, numbers, labels, captions, watermark, signature, logo, UI panel, button, frame, border, mockup, grid lines, multiple objects per cell, cropped icon, icons touching cell edges, checkerboard transparency, white background, grey background, drop shadow outside the silhouette, glossy plastic, 3D render, cartoon, anime, comic, pixel art, neon, rainbow palette, lens flare, bloom overload, photorealistic gore, blood, viscera, human face, hands, eyes, teeth, spacecraft, terrestrial map accuracy, busy background, low contrast silhouette
```

## 11. Acceptance checklist

Before delivering, check every item:

- [ ] Alpha is real (or a clean flat magenta), never a checkerboard.
- [ ] Sheets are exactly 2048 × 2048 with 64 cells and no borders or labels.
- [ ] Icons are centered, ≤200 px, and none touches a cell edge or a neighbour.
- [ ] All unused cells are fully transparent.
- [ ] One accent hue per asset, taken from the palette table.
- [ ] Icon silhouettes read at 48 px; no hairlines under 2 px at 256 px.
- [ ] The five hearts share one silhouette, one camera and one diameter; no arms,
      no ground, no frame.
- [ ] Backdrops have a clean 46% transparent centre and fade at the edge.
- [ ] The wordmark spells SPOREFALL correctly and contains nothing else.
- [ ] Nothing in the set is glossy, cartoonish, or drawn from a different world.

## 12. Pass 1 result — corrections

The first Sheet A came back at **512 × 512** with all 39 icons in the right cells,
in the right order, on a clean 64 px pitch, with real alpha and no borders or
labels. The packing discipline worked; three things did not.

| what | measured in pass 1 | target |
|---|---|---|
| resolution | 512² sheet, 64 px cells, ~34 px of art | 2048² sheet, 256 px cells, ~200 px art |
| subjects | 1 exact match, 2 arguable, 36 wrong objects | every cell the named object |
| tone | 41% near-black, mean L 0.28, mean S 0.33, 9% bright | ≥70% near-black, L ≤ 0.22, S ≤ 0.30, ≤12% bright |

Add these two lines to every batch. The first fixes the look, the second the
subjects:

> Flatten the rendering. Matte near-black fills, visible engraved hatching and
> stipple, one small accent colour, no volumetric glow, no glass or plastic
> sheen, no pale haze around the silhouette. These should look printed on dark
> paper, not rendered in 3D.

> Draw the object named, not a neighbouring fungus. Where a subject is abstract,
> build it from the listed shapes: the menu is one horizontal hypha crossed by
> two diagonals meeting at a knot; stat-bps is three ascending pulses, not a
> ring of dots; the lock is a closed ridged pod with a seam, not a tangle of
> antlers; stat-colonies is a map of joined nodes, not a clump of mushrooms.

### 12.1 Batches

39 distinct subjects is more than one generation will hold. Generate the sheet in
six passes. Each pass keeps the 2048 × 2048 / 8 × 8 geometry, fills cells **1 to
k** only, and leaves every other cell empty; the six results pack back into one
sheet by fill order.

| pass | fills | subjects |
|---|---|---|
| A1 | 1–6 | biomass, spore, stat-bps, stat-click, stat-colonies, stat-drift |
| A2 | 1–6 | frenzy, sound-on, sound-off, menu, auto, evolve |
| A3 | 1–8 | lock, check, close, action-fruit, tabs: upgrades, strain, spores, record |
| A4 | 1–7 | the five stage sigils, drift-gold, drift-green |
| A5 | 1–6 | tier-hypha, pod, mold, mat, fruit, lichen |
| A6 | 1–6 | tier-root, heart, void, eater, yesterday, silence |

If a pass still drifts, drop to one icon per image: 512 × 512, subject centred,
flat `#FF00FF` background, and pack them afterwards (step 4 above). The eight
chrome icons in A3 are the ones to redo individually if only one pass fails —
they are the only ones whose meaning has to survive at 16 px.
