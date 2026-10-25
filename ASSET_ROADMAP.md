# SPOREFALL — asset roadmap

Single checklist for every image and audio file the game uses. The visual brief
lives in [art/ASSET_PROMPT.md](art/ASSET_PROMPT.md); this file tracks what is
actually delivered, wired, and still missing.

## Status key

- `[x]` **Implemented** — file exists and is loaded by the game.
- `[~]` **Partial** — file exists, but it is a stand-in, unbound, or the wrong size.
- `[ ]` **Pending** — no usable file yet.
- `[–]` **Not a file** — generated in CSS, canvas, or Web Audio.

## Delivered assets

| Status | Asset | File | Delivered | Target | Used for |
|---|---|---|---|---|---|
| `[x]` | Interface icon sheet | `assets/icons/sheet-a.webp` | 1024 × 1024 | 2048 × 2048 | Header, stat chips, 12 colony tiers, stage sigils |
| `[x]` | Record medallions | `assets/icons/achievements-sheet.webp` | 768 × 768 | 1254 × 1254 | Record tab (20 medallions for 45 records) |
| `[x]` | Spore heart | `assets/icons/heart-0-spore.webp` | 768 × 768 | 1024 × 1024 | Spore stage orb |
| `[x]` | Grove heart | `assets/icons/heart-1-forest.webp` | 768 × 768 | 1024 × 1024 | Grove stage orb |
| `[x]` | Territory heart | `assets/icons/heart-2-country.webp` | 768 × 768 | 1024 × 1024 | Territory stage orb |
| `[x]` | Biome heart | `assets/icons/heart-3-continent.webp` | 768 × 768 | 1024 × 1024 | Biome stage orb |
| `[x]` | Maw heart | `assets/icons/heart-4-world.webp` | 1254 × 1254 | 1024 × 1024 | The Maw stage orb |
| `[x]` | Spore backdrop | `assets/icons/backdrop-0-spore.webp` | 1254 × 1254 | 2048 × 2048 | Ring behind the spore heart |
| `[x]` | Grove backdrop | `assets/icons/backdrop-1-forest.webp` | 1254 × 1254 | 2048 × 2048 | Ring behind the grove heart |
| `[x]` | Territory backdrop | `assets/icons/backdrop-2-country.webp` | 1024 × 1024 | 2048 × 2048 | Ring behind the territory heart |
| `[x]` | Biome backdrop | `assets/icons/backdrop-3-continent.webp` | 1254 × 1254 | 2048 × 2048 | Ring behind the biome heart |
| `[x]` | Maw backdrop | `assets/icons/backdrop-4-world.webp` | 1254 × 1254 | 2048 × 2048 | Ring behind The Maw |
| `[x]` | Stage art, phone cuts | `assets/icons/heart-*-phone.webp`, `backdrop-*-phone.webp` | 512² hearts, 768² backdrops | — | Same five stages below 600 px |
| `[x]` | Drifting spore, teal | `assets/icons/spore_teal.webp` | 753 × 876 | — | Catchable teal drift, pulse halo and Quiet/Chorus garden art |
| `[x]` | Drifting spore, gold | `assets/icons/spore_yellow.webp` | 753 × 876 | — | Catchable gold drift, pulse halo and Greedy/Crown garden art |
| `[x]` | Mycelium background | `assets/icons/bg-mycelium.webp` | 1254 × 1254 | 2048 × 2048 seamless | Fixed body and drift-field background |
| `[x]` | Wordmark | `assets/icons/wordmark.webp` | 1024 × 384 | 2048 × 768 | Topbar lockup |
| `[x]` | Favicon | `assets/icons/favicon.png` | 256 × 256 | 512 × 512 | Browser tab and touch icon |
| `[x]` | Soundtrack | `audio/sporefall.mp3` | 3.2 MB, 128 kbps, 44.1 kHz stereo | — | Looping music |

Notes:

- `sheet-a.webp` is a **stand-in sheet**, not the final brief. Twenty-two of its
  sixty-four cells (8 × 8) are bound in `ICON_CELLS`; most bound cells drifted
  from the requested subjects, so the bindings are approximate.
- The delivered art weighs 4.1 MB across the icon sheets, stage art, drifting
  spores, mycelium field and wordmark; audio adds 3.2 MB. The phone cuts total
  1.06 MB and replace 3.03 MB of stage art on small screens (65% smaller).
- The record sheet is wired through `ACH_SLOTS`, which describes a 1254² canvas
  with 236 px cells. The sprite positions are normalized percentages, so the
  delivered 768² sheet crops correctly despite the smaller canvas; re-export at
  1254² only to sharpen the medallions.

## P0 — graft prototype (playable, art pending)

The grafted-body prototype is implemented and wired; sites, draft cards and the
Strain map currently fall back to text glyphs. Nine images would replace them.

| Status | ID | Subject | Used in |
|---|---|---|---|
| `[ ]` | `site-heart` | A knot of hyphae around a dark core, one bright pump-point | Strain map, site picker |
| `[ ]` | `site-nerve` | A branching synapse knot with one bright reflex point | Strain map, site picker |
| `[ ]` | `site-root` | A hollow root cross-section, pale ring around a black void | Strain map, site picker |
| `[ ]` | `graft-bell` | A cap opening with the pulse, gills visible, one gold rim | Graft draft card, map |
| `[ ]` | `graft-vein` | A branching vessel held open by hyphae, borrowed blood | Graft draft card, map |
| `[ ]` | `graft-knot` | A tight tangle that reads as a thinking knot, one loose end | Graft draft card, map |
| `[ ]` | `graft-maw` | A sac or pore opening to eat cost, ringed with short threads | Graft draft card, map |
| `[ ]` | `graft-rhizome` | A black rhizomorph branching into darkness, faint gold tips | Graft draft card, map |
| `[ ]` | `graft-sclerotium` | A hard ridged rind body, seam down the middle | Graft draft card, map |

Delivery:

- Preferred: one `assets/icons/graft-sheet.webp`, 1024 × 1024, 4 × 4 grid of
  256 px cells, cells 1–9 filled row by row. Sites first, then grafts.
- Alternative: nine individual 256 × 256 transparent PNG/WebP files.
- 256 px cell, subject at most 200 px, 12 px clearance, true alpha, sRGB.
- Sites in mint `#93f2c3`; grafts in gold `#eacb85`.
- Silhouette-first: the map renders at 18–24 px and the cards at 28–42 px.
- Add a `GRAFT_ICON` map and `graftIcon()` helper; do not force these into the
  8 × 8 `ICON_CELLS` loader unless the sheet uses that grid.

## P1 — five buried hearts

| Status | Asset | File | Stage |
|---|---|---|---|
| `[x]` | Spore heart | `assets/icons/heart-0-spore.webp` | Spore |
| `[x]` | Grove heart | `assets/icons/heart-1-forest.webp` | Grove |
| `[x]` | Territory heart | `assets/icons/heart-2-country.webp` | Territory |
| `[x]` | Biome heart | `assets/icons/heart-3-continent.webp` | Biome |
| `[x]` | Maw heart | `assets/icons/heart-4-world.webp` | The Maw |

All five hero hearts are delivered and wired as `STAGES[].heart`. The world
heart keeps its 1254 × 1254 detail but is now a transparent WebP (438 KB),
so no stage hero is a large PNG. Each heart also has a 512² `-phone` cut
(281 KB for all five), swapped in below 600 px.

The stages are displayed as **Spore → Grove → Territory → Biome → The Maw**.
Their internal ids and asset filenames keep the original working names
(`spore`, `forest`, `country`, `continent`, `world`), so existing saves, icon
cells and `<picture>` sources still resolve without a migration.

## P2 — Sheet A: interface, stages, drift, tiers

Delivered as `sheet-a.webp`, 1024². Bound icons are `[x]`; cells that exist but
are not wired, or are the wrong subject, are `[~]`. The game falls back to text
glyphs for every `[~]` item.

### Header and stats

- `[x]` `res-biomass`
- `[x]` `res-spore`
- `[ ]` `stat-bps`
- `[x]` `stat-click`
- `[x]` `stat-colonies`
- `[x]` `stat-drift`

### Chrome and actions

- `[~]` `frenzy`
- `[~]` `sound-on`
- `[~]` `sound-off`
- `[~]` `menu`
- `[~]` `auto`
- `[~]` `evolve`
- `[~]` `lock`
- `[~]` `check`
- `[~]` `close`
- `[~]` `action-fruit`
- `[~]` `tab-upgrades`
- `[~]` `tab-strain`
- `[~]` `tab-spores`
- `[~]` `tab-record`
- `[~]` `drift-gold`
- `[~]` `drift-green`

Drifting spores use dedicated `spore_yellow.webp` / `spore_teal.webp` art, not
the sheet cells above.

### Stages

- `[x]` `stage-spore`
- `[x]` `stage-forest`
- `[x]` `stage-country`
- `[x]` `stage-continent`
- `[x]` `stage-world`

### Colony tiers

- `[x]` `tier-hypha`
- `[x]` `tier-pod`
- `[x]` `tier-mold`
- `[x]` `tier-mat`
- `[x]` `tier-fruit`
- `[x]` `tier-lichen`
- `[x]` `tier-root`
- `[x]` `tier-heart`
- `[x]` `tier-void`
- `[x]` `tier-eater`
- `[x]` `tier-yesterday`
- `[x]` `tier-silence`

## P3 — Sheet B: spore tree and mutations

Twenty-nine icons, none delivered. The UI currently uses text glyphs.

### Spore tree (11)

- `[ ]` `node-germination`
- `[ ]` `node-instinct`
- `[ ]` `node-recollection`
- `[ ]` `node-patience`
- `[ ]` `node-frugality`
- `[ ]` `node-momentum`
- `[ ]` `node-deeproots`
- `[ ]` `node-draft`
- `[ ]` `node-second`
- `[ ]` `node-automation`
- `[ ]` `node-overgrowth`

### Mutations (18)

- `[ ]` `mut-sweetrot`
- `[ ]` `mut-thickwalls`
- `[ ]` `mut-rotfed`
- `[ ]` `mut-feral`
- `[ ]` `mut-frantic`
- `[ ]` `mut-predatory`
- `[ ]` `mut-clonal`
- `[ ]` `mut-parasitism`
- `[ ]` `mut-mycorrhiza`
- `[ ]` `mut-communion`
- `[ ]` `mut-molt`
- `[ ]` `mut-sacrifice`
- `[ ]` `mut-dormancy`
- `[ ]` `mut-glasshouse`
- `[ ]` `mut-filigree`
- `[ ]` `mut-ancestral`
- `[ ]` `mut-hunger`
- `[ ]` `mut-focus`

Delivery: 2048 × 2048, 8 × 8 grid of 256 px cells, row-major. Spore tree in gold;
mutations take their rarity accent (common mint, uncommon pale blue, rare gold).

## P4 — Sheet C: records

| Status | Delivered medallions |
|---|---|
| `[x]` | `ach-firstclick`, `ach-click100`, `ach-click1000`, `ach-col10`, `ach-col50`, `ach-col200`, `ach-bio1e4`, `ach-bio1e8`, `ach-bio1e12`, `ach-tier5`, `ach-tier8`, `ach-tier10`, `ach-up10`, `ach-mut3`, `ach-mut8`, `ach-fruit1`, `ach-fruit5`, `ach-drift10`, `ach-tree3`, `ach-bps1e6` |

All twenty are delivered and wired. Forty-five records reuse the closest
medallion. No new record art is required unless every record gets its own icon.

## P5 — Stage backdrops (delivered)

| Status | Asset | Delivered | Stage |
|---|---|---|---|
| `[x]` | `backdrop-0-spore.webp` | 1254 × 1254, 393 KB | Spore |
| `[x]` | `backdrop-1-forest.webp` | 1254 × 1254, 640 KB | Grove |
| `[x]` | `backdrop-2-country.webp` | 1024 × 1024, 359 KB | Territory |
| `[x]` | `backdrop-3-continent.webp` | 1254 × 1254, 395 KB | Biome |
| `[x]` | `backdrop-4-world.webp` | 1254 × 1254, 283 KB | The Maw |

All five rings are wired through `STAGES[].backdrop` and fade in behind the
heart. Their transparent centre is 32–35% of the canvas rather than the brief's
46%; the heart is wider than the hole, so it hides the inner edge and the art
reads as a halo. Each stage's heart fills the centre of its ring. The continent
ring gets a small brightness lift to keep its dark coastline legible on the
night field. The rings and the world heart were converted from PNG to WebP at
quality 82, cutting the six files from 14.1 MB to 2.4 MB (83%).

Every backdrop and heart also has a `-phone.webp` cut (768 px backdrops, 512 px
hearts). A `<picture>` source swaps to them below 600 px and the preloader warms
the same variant, taking the full stage-art set from 3.03 MB to 1.06 MB (65%).

| Status | Phone cut | Size | Replaces |
|---|---|---|---|
| `[x]` | `backdrop-0-spore-phone.webp` | 768², 141 KB | 393 KB |
| `[x]` | `backdrop-1-forest-phone.webp` | 768², 222 KB | 640 KB |
| `[x]` | `backdrop-2-country-phone.webp` | 768², 182 KB | 359 KB |
| `[x]` | `backdrop-3-continent-phone.webp` | 768², 139 KB | 395 KB |
| `[x]` | `backdrop-4-world-phone.webp` | 768², 117 KB | 283 KB |
| `[x]` | `heart-0-spore-phone.webp` | 512², 58 KB | 161 KB |
| `[x]` | `heart-1-forest-phone.webp` | 512², 42 KB | 126 KB |
| `[x]` | `heart-2-country-phone.webp` | 512², 54 KB | 158 KB |
| `[x]` | `heart-3-continent-phone.webp` | 512², 58 KB | 153 KB |
| `[x]` | `heart-4-world-phone.webp` | 512², 69 KB | 438 KB |

The swap is driven by one breakpoint (`PHONE_ART_MQ`, 600 px) shared by the
`<picture>` sources and the preloader, so rotating or resizing after the stage
has painted still requests the matching cut.

## P6 — Remaining graphics and audio

- `[x]` `bg-mycelium.webp` — fixed background texture.
- `[x]` `wordmark.webp` — topbar lockup.
- `[x]` `favicon.png` — tab and touch icon.
- `[ ]` `release-strip.webp` — optional 3072 × 512, six 512 px frames.
  The current sporefall animation is CSS-generated and works without it.
- `[x]` `audio/sporefall.mp3` — looping soundtrack.
- `[x]` `spore_teal.webp`, `spore_yellow.webp` — drifting spores, with CSS
  pulse halos tinted to each asset.
- `[–]` UI sounds, fruiting sting, graft placement — synthesized by `beep()` in
  `js/game.js`; no audio files required.
- `[–]` Grain, noise, vignette, procedural heart, click effects — generated in
  CSS/canvas.
- `[–]` World condition chips, archive rows and their detail sheet, scars and the
  Splice hybrid tint — CSS. The archive detail sheet is built from the saved
  record, not art. Splice reuses `spore_yellow.webp` with a hue/saturation
  filter; no extra file is required.
- `[–]` Drift collect burst, spore pulse halos, fruiting release burst —
  DOM/CSS particles and tinted radial gradients, no sprite.
- `[–]` Onboarding coach, target outline and highlight flash — CSS only.

## Known size mismatches

| Asset | Delivered | Brief target | Action |
|---|---|---|---|
| `sheet-a.webp` | 1024² | 2048² | Works at display sizes; re-export only if the stand-ins are redrawn. |
| `achievements-sheet.webp` | 768² | 1254² | Crops verified: the sprite uses normalized percentages (`ACH_SHEET_W` / `ACH_CELL`), so the 768² sheet renders correctly. Re-export at 1254² only if sharper medallions are wanted. |
| Hearts | 768²–1254² | 1024² | Fine for current display; re-export only for sharper large screens. |
| `bg-mycelium.webp` | 1254² | 2048² seamless | Not verified seamless at the edges. |
| `wordmark.webp` | 1024 × 384 | 2048 × 768 | Fine at the current topbar width. |
| `favicon.png` | 256² | 512² | Fine at the sizes browsers use. |
| Stage backdrops | 1024²–1254² | 2048² | Fine at display size; the inner hole is hidden by the heart. |

## Roadmap order

1. **Graft pack (9 icons)** — replaces the text glyphs in the playable graft
   prototype; highest visual priority.
2. **Sheet B (29 icons)** — replaces the last large block of text glyphs.
3. **Chrome and tab icons (16)** — polish; the text fallbacks already work.
4. **Record sheet re-export** — optional sharpness pass; the 768² sheet
   already crops correctly.
5. **Release strip (1)** — optional, lowest priority.

## Acceptance checklist

- [ ] True alpha, sRGB, no checkerboard or magenta fringe.
- [ ] Icons centred, at most 200 px, 12 px clearance, no cell bleed.
- [ ] Unused cells fully transparent.
- [ ] One accent hue per asset; palette taken from `art/ASSET_PROMPT.md`.
- [ ] Silhouette reads at 18 px for site icons and 24 px for graft cards.
- [ ] No text, labels, frames, or UI chrome inside the art.
- [ ] Files registered in the matching map (`ICON_CELLS`, `ACH_SLOTS`,
  `GRAFT_ICON`, or `STAGES[].heart`).
- [ ] Browser check at 320 px, 390 px, and desktop; no horizontal overflow.
- [ ] No 404s or console errors after loading the new assets.
- [ ] Save/reload and fruiting still work; assets are not tied to save state.
