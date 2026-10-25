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
| **Feed** | Click the buried heart (or press space — one press, one feed; holding the key does not repeat). A click is worth its base click power plus whatever share of production the click upgrades add; colonies do not otherwise inflate it. The share is added once, never multiplied by the base, so clicks stay flat as production grows. |
| **Grow** | Spend biomass on colonies. Every 25 of one type doubles that type's output. Own 5 of a type and the next one reveals itself. |
| **Learn** | One-time upgrades appear as colonies and records accumulate. They are filed under The Hand, Growth, Strains and Economy, and every sealed path shows a bar toward the requirement that opens it. |
| **Mutate** | At biomass thresholds you draft one of three mutations. Every common and uncommon one carries a cost — less production, dearer colonies, worse offline growth, weaker clicks. Rare mutations are the only free lunches. They die with the body. |
| **Graft** | *Prototype (`?grafts`).* A draft hand can also include one graft. Choose it, then place it in the Heart, Nerve or Root; the site decides whether it feeds production, clicks and drafts, or economy and offline patience. The site is locked for the body and wiped at fruiting. |
| **Drift** | Teal and gold spores cross the heart every minute or so. Catch them into a four-slot tray, then plant or merge them in the Strain tab. A ripe plot must be harvested before it spoils. |
| **Fruit** | At 30M biomass, collapse into spores. All biomass is wiped and colonies, upgrades, mutations and the stage reset; spores, records, the spore tree, the world archive and its scars remain. The next body wakes under a new world condition. |
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

The grafted-body prototype lives behind `?grafts`. It adds three sites (Heart, Nerve,
Root) and six grafts (Bell, Vein, Knot, Maw, Rhizome, Sclerotium) to the top of the
Strain tab. Each graft has a different effect in each site, so the draft becomes a
placement decision rather than only a stat pick. Without the flag the game and older
saves behave exactly as before.

The Strain tab also maps the body as a small ecology. Every colony tier belongs to
one of three niches — Root, Heart or Nerve. A niche gains +5% output for each extra
colony type living in it, and up to +12% from mutations that share its niche. Eight
named relationships fire when both strains are held: five symbioses lift a niche and
three tensions pull one down. A graft in a site feeds that niche by +10%, plus +4%
for each aligned mutation. When all three niches hold colonies, the whole body gains
+5% production. The ecology is run-scoped; fruiting clears it with the rest of the
body. The pacing simulators model colonies and upgrades only, not these composition
bonuses, world conditions or the drift garden.

### World memory

Fruiting is not only a reset. Every body that fruits is written into a permanent
archive in the Record tab: its stage, biomass, time grown, colonies, dominant
niche, every mutation it held, the graft in each of the three sites, and the
condition it died under. Press an archived row to read that body in full — the
mutation names and what each cost it, which graft sat where and what that
placement did, and the world it fell under. The record is copied at the moment of
fruiting, so it survives the reset that wipes the living body. Bodies archived
before the detail record existed still show their totals and note that their
mutation names were not written down. The same entry becomes a visible scar on the
stage, so a long-lived strain accumulates a ring of marks around the heart. The
archive keeps the last 24 bodies and the stage shows the last 12 scars.

Each new body wakes under exactly one **world condition**, chosen at random and
never a repeat of the one before. Conditions trade something away:

| condition | effect |
|---|---|
| Ashfall | colonies 8% cheaper · click power ×0.8 |
| The Hush | production ×1.2 · no offline growth |
| Thaw | offline +35% · production ×0.9 |
| Spore Wind | drift rewards ×1.5 · production ×0.93 |
| Rich Rot | fruit pays +20% spores · production ×0.92 |
| Fever Dream | production ×1.35 · colonies 10% costlier |
| Still Air | production ×1.08 · drift rewards ×0.85 |

The condition chip under the stage track names the current world and shows its
main effect; clicking it opens the Evolution ledger, which also reports the body
number and the scars so far. Conditions and scars survive fruiting; the drift
garden does not.

### Drift ecology

A caught drift no longer pays out where it lands. It fills one of four tray slots,
and the thin dock under the stage links to the Strain tab. A caught spore can be:

- **Planted** in whichever empty plot you click. It grows for 20–40 seconds, then ripens. A
  ripe plot has a short harvest window — 12–70 seconds depending on the species —
  and spoils if left. A base spore pays 9–11 seconds of current production, and
  a managed merge line about 14.6 seconds per catch — enough to matter, not enough
  to replace colonies. Drift bonuses scale the harvest.
- **Merged** with one other tray spore. Two Quiet Spores make a Chorus Spore; two
  Greedy Spores make a Crown Spore. Quiet + Greedy makes a Splice Spore with a 65%
  success chance. A failed splice loses both and blights the body for 20 seconds
  (−15% production). Hybrids can be planted but not merged again.

The species differ in timing and payoff: Quiet is slow and safe, Greedy is fast and
spoils quickly, Chorus is the long safe harvest, Crown is the biggest and shortest
window, and Splice can trigger a short frenzy. Catching with a full tray converts
the spore into a small instant meal instead of wasting it. Drifts arrive every
42–78 seconds; bonuses change what a harvest pays, never how often it arrives, so
the garden cannot speed its own supply. Fruiting clears the tray and the plots, so
harvest before the fall.

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

Tree prices are set so one fruiting buys only the cheapest step, not a shopping
spree: the cheapest level costs 5, the first level of every node costs 1,145 in
total, and the whole tree costs 9,499. Automation is the deliberate exception at
**600** — six times its earlier price — so auto-buy is a campaign goal rather
than an early purchase. `tools/curve.mjs` simulates the full campaign and lands at
**~75 runs / 225 hours of play** to max the tree — longer than the earlier 31-run
model, because clicks now draw only the production share their upgrades explicitly
grant, instead of all colony output. That figure is the spore stage only: evolution bonuses shorten the
rest of the campaign as it opens up (`--stage=1` gives ~42 runs, `--stage=4` ~7, both
upper bounds because the model applies the stage from run one).

## Onboarding

New players get one lesson at a time in a small card at the bottom of the screen:
feed the heart, buy a thread, take an upgrade, catch a drift, plant it, harvest it,
let the body fruit, take a larger world. Each lesson highlights its own surface
without an overlay, so the page stays playable. `skip tips` turns them off, and
Options → Replay tips walks every lesson again — including the ones already
demonstrated — with a *Next tip* button instead of game actions.

The curriculum is a single array, `ONBOARDING_STEPS` in `js/game.js`. Adding a
mechanic means appending one object — the engine is not touched:

```js
{
  id: "graft",                      // unique; stored in the save's done list
  title: "Wear another body",
  body: "A draft hand can contain a graft. Place it in a site.",
  target: () => $("#graftSites"),    // element to outline; re-resolved every sync
  when: () => G.draftsTaken > 0,    // optional: is this lesson relevant yet?
  done: (g) => !!g.graftSites.heart, // observed by polling; no buy code changes
  cta: { label: "Open strain", run: () => openCoachTab("mutations") },
  onEnter: () => {},                // optional, once per step per session
}
```

The engine polls game state four times a second, so lessons advance on actions
without hooks in the click or buy handlers. Steps already satisfied are marked done
but never replayed — including a lesson whose `when` has gone false by the time it is
recorded, such as fruiting. Saves made before onboarding existed start skipped and
can replay it from the menu.

## Evolution

The cluster does not stay a cluster. Once the body has grown deep enough the heart
offers a larger world, and the player decides when to take it — the button waits under
the orb until pressed.

| stage | requirement | standing bonus | the world outside |
|---|---|---|---|
| **Spore** | where you start | ×1 | bare soil, stones, buried threads |
| **Grove** | 300M lifetime biomass | ×1.8 production, ×1.25 base click | trunks and canopies ring the heart |
| **Territory** | 200B lifetime · 1 fruiting | ×3.5, ×1.6 base click | ring roads, spokes, lit towns |
| **Biome** | 20T lifetime · 3 fruitings | ×7, ×2.2 base click | one landmass with coastlines |
| **The Maw** | 2Qa lifetime · 5 fruitings | ×14, ×3 base click | a globe with meridians and stars |

Stages belong to the body: **fruiting wipes the biomass and returns the cluster to the
spore stage**, and the climb is taken again, with the same lifetime gates (a deep body
re-evolves quickly).
The gate is biomass, not a clock: nothing counts while the game is closed, and
an hour of idling and ten minutes of hard buying open the same door. Each evolution repaints
the palette, the background spores, the colony panel's eyebrow and the SVG world behind
the heart. Every stage swaps the orb for its own drawn heart
(`assets/icons/heart-*`). Each stage opens two new upgrades tied to that scale of life
(*Canopy Reach* and *Rootstock* in the grove, *Roadworks* and *National Harvest* in the
territory, *Tectonic Bloom* and *Oceanic Spread* in the biome, *Atmospheric Spores*
and *The Sole Living Thing* at the Maw). Stage upgrades are bought again each run
like every other upgrade; the stage bonus lasts until the next fruiting.

## Files

```
index.html          shell + markup
css/style.css       visual system, animation, responsive layout
audio/sporefall.mp3 looping soundtrack
assets/icons/sheet-a.webp interface icon sheet: 8 × 8 cells, mapped in js/data.js
assets/icons/heart-*       the drawn heart for every stage
assets/icons/backdrop-*.webp world ring behind the heart (one for every stage)
assets/icons/*-phone.webp    768 px backdrop and 512 px heart cuts served below 600 px
assets/icons/spore_teal.webp, spore_yellow.webp  drifting spores with matching pulse halos
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
campaign: ~75 runs / 225h ... tree maxed at run 75 (spore stage only)
```

## Debug hooks

- `?debug` exposes `window.SF` (`G`, `S`, `R`, `refreshAll`, `grant`, `fruit`, `startRun`, `load`, `evolve`, `spawnDrift`, `collectDrift`, `plantDrift`, `harvestPlot`, `doMerge`, `updateGarden`, `archiveBody`, `syncOnboarding`, `replayOnboarding`, `skipOnboarding`, `ONBOARDING_STEPS`).
- `?grafts` enables the grafted-body prototype; `tools/seed.html?grafts&draft`
  starts at the first draft with all three sites empty, while `tools/seed.html?grafts`
  seeds a body with Bell in the Heart and Knot in the Nerve.
- `?tab=spores|mutations|goals|upgrades` deep-links a side panel.
- `tools/seed.html?tab=spores` is used for reproducible screenshots;
  `?fresh` starts clean, `?fruit=3e9` lands on a fruiting, `?draft` on a draft,
  `?all` is a full late-game body, `?win` a body already past 550 Gt C (the ending
  fires on load), `?legacy` writes a v1 save to test migration,
  `?stage=2` seeds a territory-stage body, `?ready=2` seeds one that can evolve now.
- `SF.G.biomass = WORLD_CARBON` (1e30) in the console triggers the ending;
  `WORLD_CARBON` in `js/data.js` is the single number that moves the finish line.
- `tools/curve.mjs --clicks --runmin=40` follows the whole campaign. Flags:
  `--dwell`, `--costgrowth`, `--tiergap`, `--treecost`, `--spore=base:exp`,
  `--stage=0..4` (apply that stage's bonus and upgrades to every run).
