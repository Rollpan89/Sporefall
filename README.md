# SPOREFALL

A browser incremental about the last spore of a fungus waking beneath a dead world.

No build step, no dependencies, no network requests. Open `index.html` and play.

```
python -m http.server 4173      # then http://127.0.0.1:4173
```

Progress autosaves to `localStorage` every 15 seconds, including offline production
(40% rate, capped at 8 hours) when you come back.

The soundtrack (`audio/sporefall.mp3`, 3:28) loops under the game at 32% volume. It
starts on your first interaction — browsers refuse audio before a gesture — follows
the ♪ toggle, and pauses while the tab is hidden.

## The loop

| | |
|---|---|
| **Feed** | Click the buried heart (or press space). A click is worth exactly the click power in the chip — colonies do not add to it, until an upgrade that says so does. |
| **Grow** | Spend biomass on colonies. Every 25 of one type doubles that type's output. Own 5 of a type and the next one reveals itself. |
| **Learn** | One-time upgrades appear as colonies and records accumulate; some multiply a whole colony type, some feed on how many you own. |
| **Mutate** | At biomass thresholds you draft one of three mutations — real trade-offs, not pure upgrades. They die with the body. |
| **Drift** | Golden spores cross the heart every minute or so. Catch them for a burst, a windfall, or a 20-second frenzy. |
| **Fruit** | At 30M biomass, collapse into spores. Colonies, upgrades and mutations reset; spores, records and strain memory remain. |

Spores buy the permanent tree: production, click power, offline patience, cheaper
colonies, keeping biomass through a fruit, extra drafts, auto-buy, and a final ×1.5.
Two late colony types only appear after you have fruited, so repeated fruiting is the
long game.

Spores are deliberately scarce: a fruiting at the 30M threshold pays **2**, a
40-minute first run pays **9**, 3B pays 5, 3T pays 25, 3Qi pays 526. The payout
follows `2 × (biomass / 30M)^0.22`, so every run is worth more than the last
without ever exploding into millions.

Tree prices are set so one fruiting buys *one* choice, not a shopping spree: the
cheapest level costs 3, the first level of every node costs 461 in total, andthe whole tree costs 6085. `tools/curve.mjs` simulates the full campaign and lands at
**~65 runs / 195 hours of play** to max the tree — longer than the earlier 31-run
model, because a click is now worth only click power instead of also drawing on
colony output.

## Files

```
index.html          shell + markup
css/style.css       visual system, animation, responsive layout
audio/sporefall.mp3 looping soundtrack
js/data.js          all content: tiers, upgrades, mutations, spore tree, records
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
campaign: ~65 runs / 195h ... tree maxed at run 65
```

## Debug hooks

- `?debug` exposes `window.SF` (`G`, `S`, `refreshAll`, `grant`, `fruit`, `startRun`).
- `?tab=spores|mutations|goals|upgrades` deep-links a side panel.
- `tools/seed.html?tab=spores` is used for reproducible screenshots;
  `?fresh` starts clean, `?fruit=3e9` lands on a fruiting, `?draft` on a draft,
  `?all` is a full late-game body, `?legacy` writes a v1 save to test migration.
- `tools/curve.mjs --clicks --runmin=40` follows the whole campaign. Flags:
  `--dwell`, `--costgrowth`, `--tiergap`, `--treecost`, `--spore=base:exp`.
