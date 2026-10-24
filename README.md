# SPOREFALL

A browser incremental about the last spore of a fungus waking beneath a dead world.

No build step, no dependencies, no network requests. Open `index.html` and play.

```
python -m http.server 4173      # then http://127.0.0.1:4173
```

Progress autosaves to `localStorage` every 15 seconds, including offline production
(40% rate, capped at 8 hours) when you come back.

The soundtrack (`audio/sporefall.mp3`, 3:28, 128 kbps) loops under the game at 32% volume. It
starts on your first interaction — browsers refuse audio before a gesture — follows
the ♪ toggle, and pauses while the tab is hidden.

## The loop

| | |
|---|---|
| **Feed** | Click the buried heart (or press space). A click is worth its base click power plus whatever share of production the click upgrades add; colonies do not otherwise inflate it. The share is added once, never multiplied by the base, so clicks stay flat as production grows. |
| **Grow** | Spend biomass on colonies. Every 25 of one type doubles that type's output. Own 5 of a type and the next one reveals itself. |
| **Learn** | One-time upgrades appear as colonies and records accumulate. They are filed under The Hand, Growth, Strains and Economy, and every sealed path shows a bar toward the requirement that opens it. |
| **Mutate** | At biomass thresholds you draft one of three mutations. Every common and uncommon one carries a cost — less production, dearer colonies, worse offline growth, weaker clicks. Rare mutations are the only free lunches. They die with the body. |
| **Drift** | Golden spores cross the heart every minute or so. Catch them for a burst, a windfall, or a 20-second frenzy. |
| **Fruit** | At 30M biomass, collapse into spores. All biomass is wiped and colonies, upgrades, mutations and the stage reset; spores, records and the spore tree remain. |
| **Evolve** | When a stage is finished with you, take a larger world. The Evolve button appears under the heart; nothing moves until you press it. |
| **Cover** | The planet's living carbon is 550 Gt C. The body covers all of it at **1No** biomass (1e30); the game ends there, once. The bar under the biomass counter tracks the percentage. |

The header also carries the game clock: hours since the first spore, banked while the
tab is closed. On a phone, swipe the side panel left or right to move between
Upgrades, Strain, Spores and Record instead of tapping the tabs.

Records are permanent: 45 of them, covering the body, every colony type, every stage,
clicks, fruiting and the deepest orders of biomass. Each one adds 2% production and
announces itself in a card under the header, which stacks if several land at once.
The Record tab shows each one's engraved medallion, dimmed until it is earned; twenty
medallions cover all forty-five records, so related ones share a drawing.

Spores buy the permanent tree: production, click power, offline patience, cheaper
colonies, a starting Spore Pod in each new body, extra drafts, auto-buy, and a final ×1.5.
*Automation* adds an `auto` badge beside the stage chip. Once the body has bought
a colony, it spends up to a tenth of its biomass about three times a second on
whichever unlocked colony gives the most production for its cost, pausing for a beat
after each tap so the counter does not fall under a fast clicking streak. Click the
badge to pause it. A new body must buy a colony before auto-buy starts, even if
Recollection grants starting threads.
Two late colony types only appear after you have fruited, so repeated fruiting is the
long game.

Spores are deliberately scarce: a fruiting at the 30M threshold pays **2**, a
40-minute first run pays **9**, 3B pays 5, 3T pays 25, 3Qi pays 526. The payout
follows `2 × (biomass / 30M)^0.22`, so every run is worth more than the last
without ever exploding into millions.

Tree prices are set so one fruiting buys *one* choice, not a shopping spree: the
cheapest level costs 3, the first level of every node costs 461 in total, and the
whole tree costs 6085. `tools/curve.mjs` simulates the full campaign and lands at
**~65 runs / 195 hours of play** to max the tree — longer than the earlier 31-run
model, because clicks now draw only the production share their upgrades explicitly
grant, instead of all colony output. That figure is the spore stage only: evolution bonuses shorten the
rest of the campaign as it opens up (`--stage=1` gives ~31 runs, `--stage=4` ~6, both
upper bounds because the model applies the stage from run one).

## Evolution

The cluster does not stay a cluster. Once the body has grown deep enough the heart
offers a larger world, and the player decides when to take it — the button waits under
the orb until pressed.

| stage | requirement | standing bonus | the world outside |
|---|---|---|---|
| **Spore** | where you start | ×1 | bare soil, stones, buried threads |
| **Forest** | 300M lifetime biomass | ×1.8 production, ×1.25 base click | trunks and canopies ring the heart |
| **Country** | 200B lifetime · 1 fruiting | ×3.5, ×1.6 base click | ring roads, spokes, lit towns |
| **Continent** | 20T lifetime · 3 fruitings | ×7, ×2.2 base click | one landmass with coastlines |
| **World** | 2Qa lifetime · 5 fruitings | ×14, ×3 base click | a globe with meridians and stars |

Stages belong to the body: **fruiting wipes the biomass and returns the cluster to the
spore stage**, and the climb is taken again, with the same lifetime gates (a deep body
re-evolves quickly).
The gate is biomass, not a clock: nothing counts while the game is closed, and
an hour of idling and ten minutes of hard buying open the same door. Each evolution repaints
the palette, the background spores, the colony panel's eyebrow and the SVG world behind
the heart. The forest, country and continent stages also swap the orb for their own
drawn heart (`assets/icons/heart-*.webp`); the spore and world bodies keep the
procedural one. Each stage opens two new upgrades tied to that scale of life
(*Canopy Reach* and *Rootstock* in the forest, *Roadworks* and *National Harvest* in the
country, *Tectonic Bloom* and *Oceanic Spread* on the continent, *Atmospheric Spores*
and *The Sole Living Thing* in the world). Stage upgrades are bought again each run
like every other upgrade; the stage bonus lasts until the next fruiting.

## Files

```
index.html          shell + markup
css/style.css       visual system, animation, responsive layout
audio/sporefall.mp3 looping soundtrack
assets/icons/sheet-a.webp interface icon sheet: 8 × 8 cells, mapped in js/data.js
assets/icons/heart-*.webp the drawn heart for the spore, forest, country and continent stages
assets/icons/achievements-sheet.webp 20 record medallions on a 1254² sheet, mapped in js/data.js
assets/icons/bg-mycelium.webp  still mycelium field behind the drifting spores
assets/icons/wordmark.webp  the SPOREFALL lockup, cropped into the topbar
assets/icons/favicon.png    tab and touch icon
js/data.js          all content: tiers, upgrades, mutations, stages, spore tree, records
js/game.js          engine: economy, rendering, drafts, prestige, saves, audio, canvas
tools/sim.mjs       headless pacing simulation (node tools/sim.mjs --clicks)
tools/curve.mjs     campaign model: runs, fruiting, tree spending (node tools/curve.mjs --clicks)
tools/seed.html     QA seed: writes a mid-game save and opens the game
screenshots/        captured views
```

## Balance

`tools/sim.mjs` runs a greedy player (buy cheapest worthwhile colony and every
affordable upgrade) against the same formulas as the game, and reports when each
order of magnitude of lifetime biomass is reached. It is how `COST_GROWTH` (1.19),
tier output and the fruit threshold were tuned. Current curve, with one click per
second:

```
1e5 ~10.8 min   1e8 ~27.6 min   1e12 beyond a 60-minute body
tiers (first run, 1 click/s): t1 0m  t2 1m  t3 5m  t4 11m  t5 17m
t6 24m  t7 33m   (t8+ needs a longer or second body)
spores: 30M=2   3B=5   3T=25   3Qi=526
campaign: ~65 runs / 195h ... tree maxed at run 65 (spore stage only)
```

## Debug hooks

- `?debug` exposes `window.SF` (`G`, `S`, `refreshAll`, `grant`, `fruit`, `startRun`, `evolve`).
- `?tab=spores|mutations|goals|upgrades` deep-links a side panel.
- `tools/seed.html?tab=spores` is used for reproducible screenshots;
  `?fresh` starts clean, `?fruit=3e9` lands on a fruiting, `?draft` on a draft,
  `?all` is a full late-game body, `?win` a body already past 550 Gt C (the ending
  fires on load), `?legacy` writes a v1 save to test migration,
  `?stage=2` seeds a country-stage body, `?ready=2` seeds one that can evolve now.
- `SF.G.biomass = WORLD_CARBON` (1e30) in the console triggers the ending;
  `WORLD_CARBON` in `js/data.js` is the single number that moves the finish line.
- `tools/curve.mjs --clicks --runmin=40` follows the whole campaign. Flags:
  `--dwell`, `--costgrowth`, `--tiergap`, `--treecost`, `--spore=base:exp`,
  `--stage=0..4` (apply that stage's bonus and upgrades to every run).
