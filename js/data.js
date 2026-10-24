/* ─────────────────────────────────────────────────────────────
   SPOREFALL — content data
   Tiers, upgrades, mutations, spore tree, achievements.
   ───────────────────────────────────────────────────────────── */

const COST_GROWTH = 1.19;
// How many of a colony you need before the next tier reveals itself. A dwell
// stops the tier list from cascading open the moment you can afford one copy.
const TIER_DWELL = 5;
const MILESTONE_EVERY = 25;
// Click power is a base multiplied by click upgrades, plus a small share of
// production. The share is added, not multiplied by those upgrades: compounding
// the two made a late-game click worth dozens of seconds of production.
const CLICK_RATIO_BASE = 0;
const OFFLINE_RATE_BASE = 0.4;
// The world's living carbon is about 550 Gt C (Bar-On, Phillips & Milo, 2018)
// = 5.5e11 tonnes. A body holding 1No of biomass (1e30, the game's nonillion)
// has replaced every living thing on the planet, so that is the end of the
// game. Change this one number to move the finish line.
const WORLD_CARBON = 1e30;
const WORLD_GT = 550;
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

/* ── evolution ──────────────────────────────────────────────── */
// Five stages. `req` is what the Evolve button waits for: lifetime biomass,
// and sometimes fruitings. Nothing waits on a clock — a body that grows fast
// evolves fast, whether it took an hour or a week. `mult` / `click` are the
// stage's bonus for the current body, and each stage opens its own upgrades
// (see `stage` on UPGRADES). Fruiting returns the body to the spore stage.
const STAGES = [
  {
    id: 'spore', name: 'Spore Stage', short: 'Spore', glyph: '✧',
    eyebrow: 'the body', sub: 'a local cluster in the dark',
    brand: 'a dead world, waking',
    mult: 1, click: 1, req: null,
    heart: 'assets/icons/heart-0-spore.webp',
    tagline: 'A local cluster of hyphae, expanding through soil and rot.',
  },
  {
    id: 'forest', name: 'Forest Stage', short: 'Forest', glyph: '❦',
    eyebrow: 'the grove', sub: 'the cluster has become a wood',
    brand: 'the canopy answers',
    mult: 1.8, click: 1.25,
    heart: 'assets/icons/heart-1-forest.webp',
    req: { total: 3e8 },
    tagline: 'The cluster pushes through soil, takes the trees, and grows inside the animals that shelter under them.',
  },
  {
    id: 'country', name: 'Country Stage', short: 'Country', glyph: '⌗',
    eyebrow: 'the country', sub: 'one body, many hands',
    brand: 'the country is one body',
    mult: 3.5, click: 1.6,
    heart: 'assets/icons/heart-2-country.webp',
    req: { total: 2e11, fruits: 1 },
    tagline: 'Roads, fields, towns. The cluster learns to grow itself into people and call it a nation.',
  },
  {
    id: 'continent', name: 'Continent Stage', short: 'Continent', glyph: '⏣',
    eyebrow: 'the continent', sub: 'the land is one mouth',
    brand: 'the land is one mouth',
    mult: 7, click: 2.2,
    heart: 'assets/icons/heart-3-continent.webp',
    req: { total: 2e13, fruits: 3 },
    tagline: 'Coastlines dissolve. Every river runs into the same throat, and the throat is yours.',
  },
  {
    id: 'world', name: 'World Stage', short: 'World', glyph: '◉',
    eyebrow: 'the world', sub: 'the sole living thing',
    brand: 'the world is one thing',
    mult: 14, click: 3,
    // heart: 'assets/icons/heart-3-world.png',
    req: { total: 2e15, fruits: 5 },
    tagline: 'Nothing else is left alive to compete with. Only weather, and you.',
  },
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
  { id: 'firstfeed', name: 'First Taste', desc: 'The heart learns your hand. Base click power ×2.', cost: 25, req: { clicks: 10 }, eff: { clickMul: 2 } },
  { id: 'hungry', name: 'Hungry Filaments', desc: 'Base click power ×3.', cost: 600, req: { clicks: 50 }, eff: { clickMul: 3 } },
  { id: 'damp', name: 'Damp Fungus', desc: 'All production ×1.2.', cost: 250, req: { colonies: 8 }, eff: { globalMul: 1.2 } },
  { id: 'knot', name: 'Nerve Knot', desc: 'Base click power ×2.', cost: 400, req: { clicks: 30 }, eff: { clickMul: 2 } },
  { id: 'count', name: 'Spore Count', desc: 'All production ×1.25.', cost: 2500, req: { total: 2000 }, eff: { globalMul: 1.25 } },
  { id: 'greedy', name: 'Greedy Weave', desc: 'Colonies cost 5% less.', cost: 9000, req: { colonies: 40 }, eff: { costMul: 0.95 } },
  { id: 'cycle', name: 'Vicious Cycle', desc: 'All production ×1.25.', cost: 900, req: { total: 500 }, eff: { globalMul: 1.25 } },
  { id: 'dark', name: 'Deep Darkness', desc: 'All production ×1.3.', cost: 6000, req: { colonies: 25 }, eff: { globalMul: 1.3 } },
  { id: 'wind', name: 'Spore Wind', desc: 'Base click power ×2. All production ×1.15.', cost: 60000, req: { upgrades: 6 }, eff: { clickMul: 2, globalMul: 1.15 } },
  { id: 'restless', name: 'Restless Flesh', desc: 'All production ×1.35.', cost: 150000, req: { total: 200000 }, eff: { globalMul: 1.35 } },
  { id: 'tremor', name: 'Subterranean Tremor', desc: 'All production ×1.35.', cost: 400000, req: { bps: 500 }, eff: { globalMul: 1.35 } },
  { id: 'season', name: 'Fruiting Season', desc: 'All production ×1.5.', cost: 2e6, req: { biomass: 1e6 }, eff: { globalMul: 1.5 } },
  { id: 'fieldmind', name: 'Field Mind', desc: 'All production ×1.6.', cost: 1.2e7, req: { colonies: 100 }, eff: { globalMul: 1.6 } },
  { id: 'nerve', name: 'Nerve Net', desc: 'Clicks also grant 1% of your production per second.', cost: 2.5e7, req: { clicks: 200 }, eff: { clickRatioAdd: 0.01 } },
  { id: 'choir', name: 'Hollow Choir', desc: 'All production ×2.', cost: 6e7, req: { mutations: 4 }, eff: { globalMul: 2 } },
  { id: 'surrender', name: 'Surrender', desc: 'Base click power ×5. Clicks grant +1% of production/s.', cost: 1.5e8, req: { clicks: 500 }, eff: { clickMul: 5, clickRatioAdd: 0.01 } },
  { id: 'gold', name: 'Golden Mycelium', desc: 'All production ×1.8.', cost: 5e8, req: { drifts: 5 }, eff: { globalMul: 1.8 } },
  { id: 'rot', name: 'Rot Economy', desc: 'Colonies cost 10% less.', cost: 2.5e8, req: { upgrades: 15 }, eff: { costMul: 0.9 } },
  { id: 'appetite', name: 'Endless Appetite', desc: 'All production ×2.', cost: 4e9, req: { colonies: 200 }, eff: { globalMul: 2 } },
  { id: 'mitosis', name: 'Mitosis', desc: 'All production ×1.75.', cost: 3e9, req: { colonies: 150 }, eff: { globalMul: 1.75 } },
  { id: 'myco', name: 'Mycorrhiza', desc: 'All production ×1.4. Colonies cost 5% less.', cost: 5e10, req: { owned: [5, 25] }, eff: { globalMul: 1.4, costMul: 0.95 } },
  { id: 'wholehand', name: 'The Whole Hand', desc: 'Clicks grant an extra 4% of production per second.', cost: 2e10, req: { clicks: 750 }, eff: { clickRatioAdd: 0.04 } },
  { id: 'bulk', name: 'Bulk Digestion', desc: 'Colonies cost 8% less.', cost: 1e10, req: { colonies: 250 }, eff: { costMul: 0.92 } },
  { id: 'fifth', name: 'The Fifth Direction', desc: 'All production ×3.', cost: 8e11, req: { total: 1e12 }, eff: { globalMul: 3 } },
  { id: 'recursion', name: 'Recursive Rot', desc: 'All production ×2.2.', cost: 5e12, req: { fruits: 1 }, eff: { globalMul: 2.2 } },
  { id: 'eternal', name: 'Eternal Fruiting', desc: 'All production ×2.5.', cost: 1e13, req: { fruits: 3 }, eff: { globalMul: 2.5 } },
  { id: 'rootnet', name: 'Root Network', desc: '+0.2% production per Hyphal Thread owned.', cost: 3000, req: { owned: [0, 25] }, eff: { perOwned: { tier: 0, amt: 0.002 } } },
  { id: 'podsignal', name: 'Pod Signal', desc: '+0.12% production per Spore Pod owned.', cost: 14000, req: { owned: [1, 25] }, eff: { perOwned: { tier: 1, amt: 0.0012 } } },
  { id: 'moldchorus', name: 'Mold Chorus', desc: '+0.1% production per Decomposer Mold owned.', cost: 160000, req: { owned: [2, 25] }, eff: { perOwned: { tier: 2, amt: 0.001 } } },

  // Stage upgrades: hidden until the body has evolved far enough. Each stage
  // of the world opens two more ways to grow.
  { id: 'canopy', name: 'Canopy Reach', desc: 'All production ×2. The cluster finds the light.', cost: 2.5e9, stage: 1, eff: { globalMul: 2 } },
  { id: 'rootstock', name: 'Rootstock', desc: 'Colonies cost 12% less. The forest holds its own weight.', cost: 9e9, stage: 1, eff: { costMul: 0.88 } },

  { id: 'roadworks', name: 'Roadworks', desc: 'All production ×2.5. Every road is a hypha now.', cost: 1.6e12, stage: 2, eff: { globalMul: 2.5 } },
  { id: 'harvest', name: 'National Harvest', desc: '+0.25% production per colony owned.', cost: 4e12, stage: 2, eff: { perColony: 0.0025 } },

  { id: 'tectonic', name: 'Tectonic Bloom', desc: 'All production ×3. The plates move when you breathe.', cost: 2.5e14, stage: 3, eff: { globalMul: 3 } },
  { id: 'ocean', name: 'Oceanic Spread', desc: 'All production ×1.3. Colonies cost 15% less.', cost: 9e14, stage: 3, eff: { globalMul: 1.3, costMul: 0.85 } },

  { id: 'atmosphere', name: 'Atmospheric Spores', desc: 'All production ×4. The air itself is a colony.', cost: 3e16, stage: 4, eff: { globalMul: 4 } },
  { id: 'sole', name: 'The Sole Living Thing', desc: 'All production ×2. Base click power ×3. Nothing else is left to feed on.', cost: 2e17, stage: 4, eff: { globalMul: 2, clickMul: 3 } },
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

/* ── upgrade shelves ────────────────────────────────────────── */
// The upgrades tab is sorted onto four shelves so a long run does not read as
// one undifferentiated pile. Tier upgrades and per-owned bonuses go to
// Strains; everything else is filed by what it actually pays for.
const UPGRADE_CATS = [
  { id: 'hand',   name: 'The Hand', note: 'what one touch is worth' },
  { id: 'growth', name: 'Growth',   note: 'the standing yield of the body' },
  { id: 'strain', name: 'Strains',  note: 'one colony type made stronger' },
  { id: 'frugal', name: 'Economy',  note: 'what it costs to spread' },
];
const UPGRADE_CAT = {
  firstfeed: 'hand', hungry: 'hand', knot: 'hand', wind: 'hand',
  nerve: 'hand', surrender: 'hand', wholehand: 'hand',
  greedy: 'frugal', rot: 'frugal', bulk: 'frugal', rootstock: 'frugal',
  rootnet: 'strain', podsignal: 'strain', moldchorus: 'strain',
};
for (const u of UPGRADES) {
  u.cat = u.cat || UPGRADE_CAT[u.id] || (u.tier != null ? 'strain' : 'growth');
}

/* ── mutations (drafted during a run) ───────────────────────── */
const MUTATIONS = [
  // Every common and uncommon mutation carries a real cost, so a draft is a
  // trade-off instead of a free buff. Rare mutations are the untarnished ones.
  { id: 'sweetrot',   name: 'Sweetrot',            rarity: 1, desc: 'All production ×1.3. The sugar is expensive: colonies cost 8% more.', eff: { globalMul: 1.3, costMul: 1.08 } },
  { id: 'thickwalls', name: 'Thick Walls',         rarity: 1, desc: 'Colonies cost 15% less. All production ×0.9.', eff: { costMul: 0.85, globalMul: 0.9 } },
  { id: 'rotfed',     name: 'Rotfed',              rarity: 1, desc: 'All production ×1.45. Colonies cost 10% more.', eff: { globalMul: 1.45, costMul: 1.1 } },
  { id: 'feral',      name: 'Feral Hunger',        rarity: 1, desc: 'Base click power ×10. Colonies cost 10% more.', eff: { clickMul: 10, costMul: 1.1 } },
  { id: 'frantic',    name: 'Frantic Growth',      rarity: 1, desc: 'All production ×1.35. Offline growth falls to 10%.', eff: { globalMul: 1.35, offlineAbs: 0.1 } },
  { id: 'predatory',  name: 'Predatory Bloom',     rarity: 2, desc: 'All production ×1.5. Base click power ×3. Offline growth falls to 15%.', eff: { globalMul: 1.5, clickMul: 3, offlineAbs: 0.15 } },
  { id: 'clonal',     name: 'Clonal Riot',         rarity: 2, desc: 'All production ×1.9. Colonies cost 25% more.', eff: { globalMul: 1.9, costMul: 1.25 } },
  { id: 'parasitism', name: 'Parasitism',          rarity: 2, desc: '+4% production for every colony type you own. Base click power ×0.6.', eff: { perTier: 0.04, clickMul: 0.6 } },
  { id: 'mycorrhiza', name: 'Quiet Mycorrhiza',    rarity: 2, desc: '+0.3% production per colony owned. Offline growth falls to 20%.', eff: { perColony: 0.003, offlineAbs: 0.2 } },
  { id: 'communion',  name: 'Spore Communion',     rarity: 2, desc: 'Drifting spores appear twice as often and reward double. All production ×0.94.', eff: { driftMul: 2, globalMul: 0.94 } },
  { id: 'molt',       name: 'Molt',                rarity: 2, desc: 'Every 90 seconds, instantly gain 30 seconds of production. All production ×0.9.', eff: { autoGain: { every: 90, seconds: 30 }, globalMul: 0.9 } },
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
  { id: 'instinct',    name: 'Instinct',     max: 10, cost: 3,  grow: 1.65, desc: '+25% base click power per level.', eff: { click: 0.25 } },
  { id: 'recollection',name: 'Recollection', max: 6,  cost: 16, grow: 1.8,  desc: 'Each run begins with 5 Hyphal Threads per level.', eff: { start: 5 } },
  { id: 'patience',    name: 'Patience',     max: 8,  cost: 11, grow: 1.6,  desc: '+8% offline production per level.', eff: { offline: 0.08 } },
  { id: 'frugality',   name: 'Frugality',    max: 8,  cost: 11, grow: 1.65, desc: 'Colonies cost 3% less per level.', eff: { cost: 0.03 } },
  { id: 'momentum',    name: 'Momentum',     max: 5,  cost: 18, grow: 1.8,  desc: 'Begin each new body with 1 Spore Pod per level.', eff: { start: 1 } },
  { id: 'deeproots',   name: 'Deep Roots',   max: 5,  cost: 20, grow: 1.9,  desc: '+8% spores gained when fruiting, per level.', eff: { spore: 0.08 } },
  { id: 'draft',       name: 'Many Shapes',  max: 2,  cost: 40, grow: 3.0,  desc: '+1 mutation draft per run.', eff: { drafts: 1 } },
  { id: 'second',      name: 'Second Bloom', max: 1,  cost: 72, grow: 1,    desc: 'Begin each run with a free random mutation.', eff: { freeMut: 1 } },
  { id: 'automation',  name: 'Automation',   max: 1,  cost: 100, grow: 1,   desc: 'Unlock auto-buy: once you have bought a colony, it spends up to 10% of your biomass about three times a second on the colony with the best production for its cost, pausing briefly after you tap. It starts on; click the auto badge to pause it.', eff: { auto: 1 } },
  { id: 'overgrowth',  name: 'Overgrowth',   max: 1,  cost: 160, grow: 1,   desc: 'All production ×1.5, forever.', eff: { globalMul: 1.5 } },
];

const NODE_BY_ID = {};
const NODE_EFF = {};
for (const n of SPORE_NODES) { NODE_BY_ID[n.id] = n; NODE_EFF[n.id] = n.eff; }

/* ── achievements ───────────────────────────────────────────── */
const ACHIEVEMENTS = [
  // ── the shape of the body ──
  { id: 'firstclick', name: 'First Contact',   desc: 'Touch the buried heart.', req: { clicks: 1 } },
  { id: 'click100',   name: 'A Hundred Touches', desc: 'Click 100 times.', req: { clicks: 100 } },
  { id: 'click1000',  name: 'Obsession',       desc: 'Click 1,000 times.', req: { clicks: 1000 } },
  { id: 'click5000',  name: 'Compulsion',      desc: 'Click 5,000 times.', req: { clicks: 5000 } },
  { id: 'col10',      name: 'A Thread',        desc: 'Own 10 colonies.', req: { colonies: 10 } },
  { id: 'col50',      name: 'A Body',          desc: 'Own 50 colonies.', req: { colonies: 50 } },
  { id: 'col200',     name: 'A Continent',     desc: 'Own 200 colonies.', req: { colonies: 200 } },
  { id: 'col500',     name: 'A Biome',         desc: 'Own 500 colonies.', req: { colonies: 500 } },
  { id: 'col1000',    name: 'The Whole Ground', desc: 'Own 1,000 colonies.', req: { colonies: 1000 } },

  // ── the stages ──
  { id: 'stage1',     name: 'Into the Wood',   desc: 'Reach the Forest Stage.', req: { stage: 1 } },
  { id: 'stage2',     name: 'One Body, Many Hands', desc: 'Reach the Country Stage.', req: { stage: 2 } },
  { id: 'stage3',     name: 'One Mouth',       desc: 'Reach the Continent Stage.', req: { stage: 3 } },
  { id: 'stage4',     name: 'The Sole Living Thing', desc: 'Reach the World Stage.', req: { stage: 4 } },

  // ── every colony type, in order ──
  { id: 'tier1',      name: 'Needlepoint',     desc: 'Grow a Spore Pod.', req: { owned: [1, 1] } },
  { id: 'tier2',      name: 'Fold',            desc: 'Grow a Decomposer Mold.', req: { owned: [2, 1] } },
  { id: 'tier3',      name: 'Nervous Ground',  desc: 'Grow a Mycelial Mat.', req: { owned: [3, 1] } },
  { id: 'tier5',      name: 'Skyward',         desc: 'Grow a Fruiting Body.', req: { owned: [4, 1] } },
  { id: 'tier6',      name: 'Two Become One',  desc: 'Grow Symbiotic Lichen.', req: { owned: [5, 1] } },
  { id: 'tier7',      name: 'Dry River',       desc: 'Grow a Hollow Root.', req: { owned: [6, 1] } },
  { id: 'tier8',      name: 'Corruption',      desc: 'Grow a Corrupted Heart.', req: { owned: [7, 1] } },
  { id: 'tier9',      name: 'Between Worlds',  desc: 'Grow a Void Bloom.', req: { owned: [8, 1] } },
  { id: 'tier10',     name: 'The Last Meal',   desc: 'Grow World-Eater Mycelium.', req: { owned: [9, 1] } },
  { id: 'tier11',     name: "Someone's Hands", desc: "Grow Yesterday's God.", req: { owned: [10, 1] } },
  { id: 'tier12',     name: 'Nothing at All',  desc: 'Grow The Silence.', req: { owned: [11, 1] } },

  // ── the deeper record ──
  { id: 'bio1e4',     name: 'First Bloom',     desc: 'Produce 10,000 biomass in total.', req: { total: 1e4 } },
  { id: 'bio1e8',     name: 'Rot Empire',      desc: 'Produce 100,000,000 biomass in total.', req: { total: 1e8 } },
  { id: 'bio1e12',    name: 'World Eater',     desc: 'Produce 1 trillion biomass in total.', req: { total: 1e12 } },
  { id: 'bio1e16',    name: 'The Long Rot',    desc: 'Produce 10 quadrillion biomass in total.', req: { total: 1e16 } },
  { id: 'bio1e20',    name: 'Entropy',         desc: 'Produce 100 quintillion biomass in total.', req: { total: 1e20 } },
  { id: 'up10',       name: 'Collector',       desc: 'Buy 10 upgrades in one run.', req: { upgrades: 10 } },
  { id: 'up25',       name: 'Complete Set',    desc: 'Buy 25 upgrades in one run.', req: { upgrades: 25 } },
  { id: 'mut3',       name: 'Strange Bloom',   desc: 'Hold 3 mutations at once.', req: { mutations: 3 } },
  { id: 'mut5',       name: 'Chimera',         desc: 'Hold 5 mutations at once.', req: { mutations: 5 } },
  { id: 'mut8',       name: 'Something New',   desc: 'Hold 8 mutations at once.', req: { mutations: 8 } },
  { id: 'fruit1',     name: 'Sporefall',       desc: 'Fruit once.', req: { fruits: 1 } },
  { id: 'fruit5',     name: 'Recurrence',      desc: 'Fruit five times.', req: { fruits: 5 } },
  { id: 'fruit10',    name: 'Perpetual',       desc: 'Fruit ten times.', req: { fruits: 10 } },
  { id: 'fruit25',    name: 'Cycle Without End', desc: 'Fruit twenty-five times.', req: { fruits: 25 } },
  { id: 'drift10',    name: 'Windcatcher',     desc: 'Catch 10 drifting spores.', req: { drifts: 10 } },
  { id: 'drift50',    name: 'Windward',        desc: 'Catch 50 drifting spores.', req: { drifts: 50 } },
  { id: 'tree3',      name: 'Genetic Memory',  desc: 'Own 3 levels of the spore tree.', req: { treeLevels: 3 } },
  { id: 'tree15',     name: 'Deep Memory',     desc: 'Own 15 levels of the spore tree.', req: { treeLevels: 15 } },
  { id: 'bps1e6',     name: 'Unstoppable',     desc: 'Reach 1,000,000 biomass per second.', req: { bestBps: 1e6 } },
  { id: 'bps1e9',     name: 'A Billion a Second', desc: 'Reach 1 billion biomass per second.', req: { bestBps: 1e9 } },
  { id: 'bps1e12',    name: 'Runaway',         desc: 'Reach 1 trillion biomass per second.', req: { bestBps: 1e12 } },
];

const ACH_BONUS = 0.02;

/* ── record medallions ────────────────────────────────────────
   A second sheet: twenty engraved medallions on a transparent 1254²
   canvas, 236 px each in a 5 × 4 block with uneven margins. Cells are
   addressed by their crop origin, not by a fraction of the sheet.
   Sheet order: touch, spore cloud, spiral, threaded beads, cluster,
   landmass, mushroom, roots, bitten orb, stalk, heart, crescent,
   stacked pods, three-lobed leaf, split pod, sporefall, loop, vortex,
   three rings, rising column. Later records reuse the closest one. */
const ACH_SHEET_W = 1254;
const ACH_CELL = 236;
const ACH_SLOTS = [
  [13.5, 109.5], [264, 109.5], [508.5, 109.5], [756, 109.5], [1004, 109.5],
  [13.5, 369.5], [264, 369.5], [508.5, 369.5], [756, 369.5], [1004, 369.5],
  [13.5, 636],   [264, 636],   [508.5, 636],   [756, 636],   [1004, 636],
  [13.5, 896.5], [264, 896.5], [508.5, 896.5], [756, 896.5], [1004, 896.5],
];
const ACH_ICON = {
  firstclick: 1,  click100: 2,  click1000: 3, click5000: 3,
  col10: 4,       col50: 5,     col200: 6,     col500: 6,  col1000: 12,
  stage1: 10,     stage2: 7,    stage3: 6,     stage4: 12,
  tier1: 15,      tier2: 14,    tier3: 5,      tier5: 10,  tier6: 14,
  tier7: 8,       tier8: 11,    tier9: 18,     tier10: 12, tier11: 13,
  tier12: 19,
  bio1e4: 7,      bio1e8: 8,    bio1e12: 9,    bio1e16: 9, bio1e20: 3,
  up10: 13,       up25: 13,     mut3: 14,      mut5: 15,   mut8: 15,
  fruit1: 16,     fruit5: 17,   fruit10: 17,   fruit25: 17,
  drift10: 18,    drift50: 18,  tree3: 19,     tree15: 19,
  bps1e6: 20,     bps1e9: 20,   bps1e12: 20,
};

/* ── icon sheet ─────────────────────────────────────────────────
   One 2048² sheet of 8 × 8 cells, 256px each. Numbering is 1-based,
   left to right, top to bottom — the order the sheet was drawn in.
   These are hand-picked stand-ins: the sheet's subjects drifted away
   from the brief, so most cells show something other than the game
   part they are attached to. Every surface falls back to its text
   glyph when an id is missing here, so deleting a line is safe. */
const ICON_SHEET = 'assets/icons/sheet-a.webp';
const ICON_COLS = 8;
const ICON_CELLS = {
  // header
  'res-biomass': 1,   'res-spore': 12,
  // stage stat chips
  'stat-click': 4,    'stat-colonies': 5,   'stat-drift': 6,
  // colony tiers, in escalation order
  'tier-hypha': 16,   'tier-pod': 13,      'tier-mold': 20,
  'tier-mat': 3,      'tier-fruit': 8,     'tier-lichen': 10,
  'tier-root': 7,     'tier-heart': 2,     'tier-void': 26,
  'tier-eater': 15,   'tier-yesterday': 17, 'tier-silence': 19,
  // evolution
  'stage-spore': 21,  'stage-forest': 22,  'stage-country': 23,
  'stage-continent': 24, 'stage-world': 25,
};
