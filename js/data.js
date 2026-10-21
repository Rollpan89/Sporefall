/* ─────────────────────────────────────────────────────────────
   SPOREFALL — content data
   Tiers, upgrades, mutations, spore tree, achievements.
   ───────────────────────────────────────────────────────────── */

const COST_GROWTH = 1.19;
// How many of a colony you need before the next tier reveals itself. A dwell
// stops the tier list from cascading open the moment you can afford one copy.
const TIER_DWELL = 5;
const MILESTONE_EVERY = 25;
// Clicks are worth click power and nothing else: colonies no longer inflate the
// figure in the chip. The "clicks also grant x% of production" upgrades add
// their share explicitly, on top of this.
const CLICK_RATIO_BASE = 0;
const OFFLINE_RATE_BASE = 0.4;
const FRUIT_MIN = 3e7;
const SPORE_BASE = 2;      // spores for a fruit at exactly FRUIT_MIN
const SPORE_EXP = 0.22;    // payout grows as (biomass / FRUIT_MIN) ^ SPORE_EXP

const TIERS = [
  { id: 'hypha',   name: 'Hyphal Thread',        plural: 'Hyphal Threads',        glyph: '✧', cost: 15,      prod: 0.3,     flavor: 'A filament of want, threading the dark.' },
  { id: 'pod',     name: 'Spore Pod',            plural: 'Spore Pods',            glyph: '❖', cost: 100,     prod: 3,       flavor: 'Something waits inside, folded tight.' },
  { id: 'mold',    name: 'Decomposer Mold',      plural: 'Decomposer Mold',       glyph: '❋', cost: 1100,    prod: 24,       flavor: 'It eats the dead and calls it growth.' },
  { id: 'mat',     name: 'Mycelial Mat',         plural: 'Mycelial Mats',         glyph: '◈', cost: 12000,   prod: 141,      flavor: 'A nervous system the size of a field.' },
  { id: 'fruit',   name: 'Fruiting Body',        plural: 'Fruiting Bodies',       glyph: '✿', cost: 130000,  prod: 780,     flavor: 'A lung, offered to the sky.' },
  { id: 'lichen',  name: 'Symbiotic Lichen',     plural: 'Symbiotic Lichen',      glyph: '❉', cost: 1.4e6,   prod: 4200,    flavor: 'It learns to be two things at once.' },
  { id: 'root',    name: 'Hollow Root',          plural: 'Hollow Roots',          glyph: '⌾', cost: 2e7,     prod: 23400,    flavor: 'It drinks from a river that dried up aeons ago.' },
  { id: 'heart',   name: 'Corrupted Heart',      plural: 'Corrupted Hearts',      glyph: '❂', cost: 3.3e8,   prod: 132000,   flavor: 'Still beating. Nothing remembers whose.' },
  { id: 'void',    name: 'Void Bloom',           plural: 'Void Blooms',           glyph: '✵', cost: 5.1e9,   prod: 780000,  flavor: 'A flower that opens into the space between stars.' },
  { id: 'eater',   name: 'World-Eater Mycelium', plural: 'World-Eater Mycelium',  glyph: '⟁', cost: 7.5e10,  prod: 4.8e6,   flavor: 'The world is a rind. It is peeling it.' },
  { id: 'yesterday', name: "Yesterday's God",    plural: "Yesterday's Gods",      glyph: '☾', cost: 2e12,    prod: 3.3e7,   flavor: 'You. Before you were scattered.', unlock: { fruits: 1 } },
  { id: 'silence', name: 'The Silence',          plural: 'The Silences',          glyph: '○', cost: 5e14,    prod: 2.4e8,     flavor: 'It has no flavour. It has no name. It is enough.', unlock: { fruits: 3 } },
];

const TIER_UP_NAMES = [
  ['Woven Strands', 'Root Memory', 'The Long Nerve'],
  ['Thick Casings', 'Pressurised', 'A Thousand Doors'],
  ['Acid Bath', 'Feast Cycle', 'Nothing Wasted'],
  ['Wide Weave', 'Signal Lattice', 'Field Mind'],
  ['Windcatchers', 'Tall Stalks', 'Cathedral of Caps'],
  ['Two Become One', 'Shared Metabolism', 'Perfect Union'],
  ['Deeper Vaults', 'Dry Rivers', 'The Underwater'],
  ['Aortic Knots', 'Borrowed Rhythm', 'The Second Beat'],
  ['Starlight Cap', 'Event Horizon', 'Bloom Between Worlds'],
  ['Rind Cracker', 'Continental Bite', 'The Final Meal'],
  ['Remembered Hands', 'Borrowed Body', 'The Old Shape'],
  ['Quiet', 'Hush', 'Nothing'],
];
const TIER_UP_AT = [10, 50, 150];
const TIER_UP_COST_FACTOR = [10, 120, 2000];

/* ── one-time upgrades ──────────────────────────────────────── */
const UPGRADES = [
  { id: 'firstfeed', name: 'First Taste', desc: 'The heart learns your hand. Click power ×2.', cost: 25, req: { clicks: 10 }, eff: { clickMul: 2 } },
  { id: 'hungry', name: 'Hungry Filaments', desc: 'Click power ×3.', cost: 600, req: { clicks: 50 }, eff: { clickMul: 3 } },
  { id: 'damp', name: 'Damp Fungus', desc: 'All production ×1.2.', cost: 250, req: { colonies: 8 }, eff: { globalMul: 1.2 } },
  { id: 'knot', name: 'Nerve Knot', desc: 'Click power ×2.', cost: 400, req: { clicks: 30 }, eff: { clickMul: 2 } },
  { id: 'count', name: 'Spore Count', desc: 'All production ×1.25.', cost: 2500, req: { total: 2000 }, eff: { globalMul: 1.25 } },
  { id: 'greedy', name: 'Greedy Weave', desc: 'Colonies cost 5% less.', cost: 9000, req: { colonies: 40 }, eff: { costMul: 0.95 } },
  { id: 'cycle', name: 'Vicious Cycle', desc: 'All production ×1.25.', cost: 900, req: { total: 500 }, eff: { globalMul: 1.25 } },
  { id: 'dark', name: 'Deep Darkness', desc: 'All production ×1.3.', cost: 6000, req: { colonies: 25 }, eff: { globalMul: 1.3 } },
  { id: 'wind', name: 'Spore Wind', desc: 'Click power ×2. All production ×1.15.', cost: 60000, req: { upgrades: 6 }, eff: { clickMul: 2, globalMul: 1.15 } },
  { id: 'restless', name: 'Restless Flesh', desc: 'All production ×1.35.', cost: 150000, req: { total: 200000 }, eff: { globalMul: 1.35 } },
  { id: 'tremor', name: 'Subterranean Tremor', desc: 'All production ×1.35.', cost: 400000, req: { bps: 500 }, eff: { globalMul: 1.35 } },
  { id: 'season', name: 'Fruiting Season', desc: 'All production ×1.5.', cost: 2e6, req: { biomass: 1e6 }, eff: { globalMul: 1.5 } },
  { id: 'fieldmind', name: 'Field Mind', desc: 'All production ×1.6.', cost: 1.2e7, req: { colonies: 100 }, eff: { globalMul: 1.6 } },
  { id: 'nerve', name: 'Nerve Net', desc: 'Clicks also grant 4% of your production per second.', cost: 2.5e7, req: { clicks: 200 }, eff: { clickRatioAdd: 0.04 } },
  { id: 'choir', name: 'Hollow Choir', desc: 'All production ×2.', cost: 6e7, req: { mutations: 4 }, eff: { globalMul: 2 } },
  { id: 'surrender', name: 'Surrender', desc: 'Click power ×5. Clicks grant +3% of production/s.', cost: 1.5e8, req: { clicks: 500 }, eff: { clickMul: 5, clickRatioAdd: 0.03 } },
  { id: 'gold', name: 'Golden Mycelium', desc: 'All production ×1.8.', cost: 5e8, req: { drifts: 5 }, eff: { globalMul: 1.8 } },
  { id: 'rot', name: 'Rot Economy', desc: 'Colonies cost 10% less.', cost: 2.5e8, req: { upgrades: 15 }, eff: { costMul: 0.9 } },
  { id: 'appetite', name: 'Endless Appetite', desc: 'All production ×2.', cost: 4e9, req: { colonies: 200 }, eff: { globalMul: 2 } },
  { id: 'mitosis', name: 'Mitosis', desc: 'All production ×1.75.', cost: 3e9, req: { colonies: 150 }, eff: { globalMul: 1.75 } },
  { id: 'myco', name: 'Mycorrhiza', desc: 'All production ×1.4. Colonies cost 5% less.', cost: 5e10, req: { owned: [5, 25] }, eff: { globalMul: 1.4, costMul: 0.95 } },
  { id: 'wholehand', name: 'The Whole Hand', desc: 'Clicks grant an extra 8% of production per second.', cost: 2e10, req: { clicks: 750 }, eff: { clickRatioAdd: 0.08 } },
  { id: 'bulk', name: 'Bulk Digestion', desc: 'Colonies cost 8% less.', cost: 1e10, req: { colonies: 250 }, eff: { costMul: 0.92 } },
  { id: 'fifth', name: 'The Fifth Direction', desc: 'All production ×3.', cost: 8e11, req: { total: 1e12 }, eff: { globalMul: 3 } },
  { id: 'recursion', name: 'Recursive Rot', desc: 'All production ×2.2.', cost: 5e12, req: { fruits: 1 }, eff: { globalMul: 2.2 } },
  { id: 'eternal', name: 'Eternal Fruiting', desc: 'All production ×2.5.', cost: 1e13, req: { fruits: 3 }, eff: { globalMul: 2.5 } },
  { id: 'rootnet', name: 'Root Network', desc: '+0.2% production per Hyphal Thread owned.', cost: 3000, req: { owned: [0, 25] }, eff: { perOwned: { tier: 0, amt: 0.002 } } },
  { id: 'podsignal', name: 'Pod Signal', desc: '+0.12% production per Spore Pod owned.', cost: 14000, req: { owned: [1, 25] }, eff: { perOwned: { tier: 1, amt: 0.0012 } } },
  { id: 'moldchorus', name: 'Mold Chorus', desc: '+0.1% production per Decomposer Mold owned.', cost: 160000, req: { owned: [2, 25] }, eff: { perOwned: { tier: 2, amt: 0.001 } } },
];

/* build the per-tier ×2 upgrades */
for (let i = 0; i < TIERS.length; i++) {
  for (let k = 0; k < TIER_UP_AT.length; k++) {
    const t = TIERS[i];
    UPGRADES.push({
      id: `t${i}-${k}`,
      name: (TIER_UP_NAMES[i] && TIER_UP_NAMES[i][k]) || `${t.name} ${k + 1}`,
      desc: `${t.plural || t.name + 's'} are twice as effective.`,
      cost: t.cost * TIER_UP_COST_FACTOR[k],
      req: { owned: [i, TIER_UP_AT[k]] },
      eff: { tierMul: [i, 2] },
      tier: i,
    });
  }
}

/* ── mutations (drafted during a run) ───────────────────────── */
const MUTATIONS = [
  { id: 'sweetrot',   name: 'Sweetrot',            rarity: 1, desc: 'All production ×1.3. The rot tastes of sugar.', eff: { globalMul: 1.3 } },
  { id: 'thickwalls', name: 'Thick Walls',         rarity: 1, desc: 'Colonies cost 15% less.', eff: { costMul: 0.85 } },
  { id: 'rotfed',     name: 'Rotfed',              rarity: 1, desc: 'All production ×1.45. Colonies cost 10% more.', eff: { globalMul: 1.45, costMul: 1.1 } },
  { id: 'feral',      name: 'Feral Hunger',        rarity: 1, desc: 'Click power ×10. Colonies cost 10% more.', eff: { clickMul: 10, costMul: 1.1 } },
  { id: 'frantic',    name: 'Frantic Growth',      rarity: 1, desc: 'All production ×1.35. Offline growth falls to 10%.', eff: { globalMul: 1.35, offlineAbs: 0.1 } },
  { id: 'predatory',  name: 'Predatory Bloom',     rarity: 2, desc: 'All production ×1.5. Click power ×3.', eff: { globalMul: 1.5, clickMul: 3 } },
  { id: 'clonal',     name: 'Clonal Riot',         rarity: 2, desc: 'All production ×1.9. Colonies cost 25% more.', eff: { globalMul: 1.9, costMul: 1.25 } },
  { id: 'parasitism', name: 'Parasitism',          rarity: 2, desc: '+4% production for every colony type you own.', eff: { perTier: 0.04 } },
  { id: 'mycorrhiza', name: 'Quiet Mycorrhiza',    rarity: 2, desc: '+0.3% production per colony owned.', eff: { perColony: 0.003 } },
  { id: 'communion',  name: 'Spore Communion',     rarity: 2, desc: 'Drifting spores appear twice as often and reward double.', eff: { driftMul: 2 } },
  { id: 'molt',       name: 'Molt',                rarity: 2, desc: 'Every 90 seconds, instantly gain 30 seconds of production.', eff: { autoGain: { every: 90, seconds: 30 } } },
  { id: 'sacrifice',  name: 'Blood Rot',           rarity: 2, desc: 'Lose 25% of your biomass now. All production ×1.8.', eff: { globalMul: 1.8, instantLoss: 0.25 } },
  { id: 'dormancy',   name: 'Dormancy',            rarity: 3, desc: 'Offline production rises to 100%. Online production ×0.8.', eff: { offlineAbs: 1, globalMul: 0.8 } },
  { id: 'glasshouse', name: 'Glasshouse',          rarity: 3, desc: 'All production ×2.2. No offline production at all.', eff: { globalMul: 2.2, offlineAbs: 0 } },
  { id: 'filigree',   name: 'Chitin Filigree',     rarity: 3, desc: 'Colony milestones arrive every 20 owned instead of 25.', eff: { milestoneEvery: 20 } },
  { id: 'ancestral',  name: 'Ancestral Pulse',     rarity: 3, desc: '+8% production for every mutation you hold.', eff: { perMutation: 0.08 } },
  { id: 'hunger',     name: 'The Hunger',          rarity: 3, desc: 'All production ×2. Colonies cost 40% more.', eff: { globalMul: 2, costMul: 1.4 } },
  { id: 'focus',      name: 'Singular Devotion',   rarity: 3, desc: 'One colony type becomes 6× as effective. Chosen at random.', eff: { tierFocus: true } },
];

const DRAFT_AT = [1500, 4e4, 8e5, 1.5e7, 2e8, 3e9, 5e10];

/* ── permanent spore tree ───────────────────────────────────── */
// Spore prices are deliberately steep at the first level of every node: a single
// fruiting should buy one choice, not unlock the whole tree.
const SPORE_NODES = [
  { id: 'germination', name: 'Germination',  max: 10, cost: 10, grow: 1.55, desc: '+15% all production per level.', eff: { global: 0.15 } },
  { id: 'instinct',    name: 'Instinct',     max: 10, cost: 3,  grow: 1.7,  desc: '+25% click power per level.', eff: { click: 0.25 } },
  { id: 'recollection',name: 'Recollection', max: 6,  cost: 16, grow: 1.8,  desc: 'Each run begins with 5 Hyphal Threads per level.', eff: { start: 5 } },
  { id: 'patience',    name: 'Patience',     max: 8,  cost: 11, grow: 1.6,  desc: '+8% offline production per level.', eff: { offline: 0.08 } },
  { id: 'frugality',   name: 'Frugality',    max: 8,  cost: 11, grow: 1.65, desc: 'Colonies cost 3% less per level.', eff: { cost: 0.03 } },
  { id: 'momentum',    name: 'Momentum',     max: 5,  cost: 18, grow: 1.8,  desc: 'Keep 3% of your biomass when fruiting, per level.', eff: { keep: 0.03 } },
  { id: 'deeproots',   name: 'Deep Roots',   max: 5,  cost: 20, grow: 1.9,  desc: '+8% spores gained when fruiting, per level.', eff: { spore: 0.08 } },
  { id: 'draft',       name: 'Many Shapes',  max: 2,  cost: 40, grow: 3.0,  desc: '+1 mutation draft per run.', eff: { drafts: 1 } },
  { id: 'second',      name: 'Second Bloom', max: 1,  cost: 72, grow: 1,    desc: 'Begin each run with a free random mutation.', eff: { freeMut: 1 } },
  { id: 'automation',  name: 'Automation',   max: 1,  cost: 100, grow: 1,   desc: 'Unlock auto-buy for colonies.', eff: { auto: 1 } },
  { id: 'overgrowth',  name: 'Overgrowth',   max: 1,  cost: 160, grow: 1,   desc: 'All production ×1.5, forever.', eff: { globalMul: 1.5 } },
];

const NODE_BY_ID = {};
const NODE_EFF = {};
for (const n of SPORE_NODES) { NODE_BY_ID[n.id] = n; NODE_EFF[n.id] = n.eff; }

/* ── achievements ───────────────────────────────────────────── */
const ACHIEVEMENTS = [
  { id: 'firstclick', name: 'First Contact',   desc: 'Touch the buried heart.', req: { clicks: 1 } },
  { id: 'click100',   name: 'A Hundred Touches', desc: 'Click 100 times.', req: { clicks: 100 } },
  { id: 'click1000',  name: 'Obsession',       desc: 'Click 1,000 times.', req: { clicks: 1000 } },
  { id: 'col10',      name: 'A Thread',        desc: 'Own 10 colonies.', req: { colonies: 10 } },
  { id: 'col50',      name: 'A Body',          desc: 'Own 50 colonies.', req: { colonies: 50 } },
  { id: 'col200',     name: 'A Continent',     desc: 'Own 200 colonies.', req: { colonies: 200 } },
  { id: 'bio1e4',     name: 'First Bloom',     desc: 'Produce 10,000 biomass in total.', req: { total: 1e4 } },
  { id: 'bio1e8',     name: 'Rot Empire',      desc: 'Produce 100,000,000 biomass in total.', req: { total: 1e8 } },
  { id: 'bio1e12',    name: 'World Eater',     desc: 'Produce 1 trillion biomass in total.', req: { total: 1e12 } },
  { id: 'tier5',      name: 'Skyward',         desc: 'Grow a Fruiting Body.', req: { owned: [4, 1] } },
  { id: 'tier8',      name: 'Corruption',      desc: 'Grow a Corrupted Heart.', req: { owned: [7, 1] } },
  { id: 'tier10',     name: 'The Last Meal',   desc: 'Grow World-Eater Mycelium.', req: { owned: [9, 1] } },
  { id: 'up10',       name: 'Collector',       desc: 'Buy 10 upgrades in one run.', req: { upgrades: 10 } },
  { id: 'mut3',       name: 'Strange Bloom',   desc: 'Hold 3 mutations at once.', req: { mutations: 3 } },
  { id: 'mut8',       name: 'Something New',   desc: 'Hold 8 mutations at once.', req: { mutations: 8 } },
  { id: 'fruit1',     name: 'Sporefall',       desc: 'Fruit once.', req: { fruits: 1 } },
  { id: 'fruit5',     name: 'Recurrence',      desc: 'Fruit five times.', req: { fruits: 5 } },
  { id: 'drift10',    name: 'Windcatcher',     desc: 'Catch 10 drifting spores.', req: { drifts: 10 } },
  { id: 'tree3',      name: 'Genetic Memory',  desc: 'Own 3 levels of the spore tree.', req: { treeLevels: 3 } },
  { id: 'bps1e6',     name: 'Unstoppable',     desc: 'Reach 1,000,000 biomass per second.', req: { bestBps: 1e6 } },
];

const ACH_BONUS = 0.02;
