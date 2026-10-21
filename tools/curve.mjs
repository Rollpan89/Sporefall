/* Campaign pacing model for SPOREFALL.
   Simulates full runs (colonies + upgrades), fruiting, and spore-tree spending,
   so the prestige curve can be judged over many runs instead of one.

   usage: node tools/curve.mjs [--clicks] [--runs=40] [--costgrowth=1.19]
          [--spore=2:0.22]      base:exponent  (spore = base * (biomass/FRUIT_MIN)^exp)
*/
import fs from 'node:fs';
import vm from 'node:vm';

const src = fs.readFileSync(new URL('../js/data.js', import.meta.url), 'utf8');
const ctx = { Math, Array, Object, Number, JSON, console };
vm.createContext(ctx);
vm.runInContext(src + '\n;globalThis.__D={TIERS,UPGRADES,MUTATIONS,SPORE_NODES,ACHIEVEMENTS,COST_GROWTH,TIER_DWELL,MILESTONE_EVERY,CLICK_RATIO_BASE,FRUIT_MIN,SPORE_BASE,SPORE_EXP,TIER_UP_AT,TIER_UP_COST_FACTOR,ACH_BONUS};', ctx);
const D = ctx.__D;

const arg = (name, def) => {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : def;
};
const CLICKS = process.argv.includes('--clicks');
const MAX_RUNS = Number(arg('runs', 40));
const COST_GROWTH = Number(arg('costgrowth', D.COST_GROWTH));
const TIER_GAP = Number(arg('tiergap', 1));
const DWELL = Number(arg('dwell', D.TIER_DWELL));
const RUN_MIN = Number(arg('runmin', 0)); // 0 = fruit when growth stalls
if (TIER_GAP !== 1) D.TIERS.forEach((t, i) => { t.cost *= Math.pow(TIER_GAP, i); });
const TREE_COST = Number(arg('treecost', 1));
if (TREE_COST !== 1) D.SPORE_NODES.forEach(n => { n.cost *= TREE_COST; });
const [SPORE_BASE, SPORE_EXP] = arg('spore', `${D.SPORE_BASE}:${D.SPORE_EXP}`).split(':').map(Number);

const TIERS = D.TIERS, UPGRADES = D.UPGRADES, NODES = D.SPORE_NODES, ACH = D.ACHIEVEMENTS;
const FRUIT_MIN = D.FRUIT_MIN, MILESTONE = D.MILESTONE_EVERY;
const UPG_BY_ID = Object.fromEntries(UPGRADES.map(u => [u.id, u]));

/* tree level bookkeeping */
const tree = Object.fromEntries(NODES.map(n => [n.id, 0]));
const treeEff = (id, key) => {
  const node = NODES.find(n => n.id === id);
  return node ? (node.eff[key] || 0) * (tree[id] || 0) : 0;
};

const nextCost = node => Math.ceil(node.cost * Math.pow(node.grow, tree[node.id] || 0));

function treeProduction() {
  let g = 1;
  for (const n of NODES) {
    const lvl = tree[n.id] || 0;
    if (!lvl) continue;
    if (n.eff.global) g *= 1 + n.eff.global * lvl;
    if (n.eff.globalMul) g *= Math.pow(n.eff.globalMul, lvl);
  }
  return g;
}

const earned = new Set(); // achievements persist across runs

function simulateRun(fruits) {
  const S = {
    biomass: 0, total: 0, colonies: TIERS.map(() => 0), upgrades: new Set(),
    clicks: 0, bestBps: 0,
  };
  const achMul = () => 1 + D.ACH_BONUS * earned.size;
  S.colonies[0] = 5 * (tree.recollection || 0);

  const unlocked = i => {
    if (TIERS[i].unlock && !reqMet(TIERS[i].unlock)) return false;
    return i === 0 || S.colonies[i] > 0 || S.colonies[i - 1] >= DWELL;
  };
  function reqMet(req) {
    if (!req) return true;
    const totalColonies = S.colonies.reduce((a, b) => a + b, 0);
    if (req.clicks != null && S.clicks < req.clicks) return false;
    if (req.colonies != null && totalColonies < req.colonies) return false;
    if (req.total != null && S.total < req.total) return false;
    if (req.biomass != null && S.biomass < req.biomass) return false;
    if (req.bps != null && bps() < req.bps) return false;
    if (req.upgrades != null && S.upgrades.size < req.upgrades) return false;
    if (req.mutations != null) return false;
    if (req.fruits != null && fruits < req.fruits) return false;
    if (req.drifts != null) return false;
    if (req.treeLevels != null && Object.values(tree).reduce((a, b) => a + b, 0) < req.treeLevels) return false;
    if (req.bestBps != null && S.bestBps < req.bestBps) return false;
    if (req.owned && S.colonies[req.owned[0]] < req.owned[1]) return false;
    return true;
  }
  const tierMults = () => TIERS.map((_, i) => Math.pow(2, Math.floor(S.colonies[i] / MILESTONE)));
  const globalMul = () => {
    let g = achMul();
    g *= treeProduction();
    for (const id of S.upgrades) {
      const u = UPG_BY_ID[id];
      if (u.eff.globalMul) g *= u.eff.globalMul;
      if (u.eff.perOwned) g *= 1 + u.eff.perOwned.amt * S.colonies[u.eff.perOwned.tier];
    }
    return g;
  };
  const clickMul = () => {
    let c = 1 + treeEff('instinct', 'click');
    for (const id of S.upgrades) {
      const u = UPG_BY_ID[id];
      if (u.eff.clickMul) c *= u.eff.clickMul;
    }
    return c;
  };
  const costMul = () => {
    let c = Math.pow(1 - (NODES.find(n => n.id === 'frugality').eff.cost || 0), tree.frugality || 0);
    for (const id of S.upgrades) {
      const u = UPG_BY_ID[id];
      if (u.eff.costMul) c *= u.eff.costMul;
    }
    return c;
  };
  const bps = () => {
    const tm = tierMults(), g = globalMul();
    let raw = 0;
    for (let i = 0; i < TIERS.length; i++) raw += TIERS[i].prod * S.colonies[i] * tm[i];
    return raw * g;
  };
  const clickGain = () => (1 + bps() * D.CLICK_RATIO_BASE) * clickMul();
  const costAt = (i, owned) => TIERS[i].cost * costMul() * Math.pow(COST_GROWTH, owned);

  const buyUpgrades = () => {
    for (;;) {
      const avail = UPGRADES.filter(u => !S.upgrades.has(u.id) && reqMet(u.req) && u.cost <= S.biomass)
        .sort((a, b) => a.cost - b.cost);
      if (!avail.length) return;
      S.biomass -= avail[0].cost;
      S.upgrades.add(avail[0].id);
    }
  };

  const buyColonies = () => {
    for (let guard = 0; guard < 3000; guard++) {
      let did = false;
      for (let i = 0; i < TIERS.length; i++) {
        if (!unlocked(i) || S.colonies[i] > 0) continue;
        const c = costAt(i, 0);
        if (c <= S.biomass * 0.6) { S.biomass -= c; S.colonies[i] = 1; did = true; break; }
      }
      if (did) continue;

      const g = globalMul();
      let best = -1, bestScore = 0, bestCost = 0;
      for (let i = 0; i < TIERS.length; i++) {
        if (!unlocked(i) || S.colonies[i] === 0) continue;
        const before = Math.pow(2, Math.floor(S.colonies[i] / MILESTONE));
        const after = Math.pow(2, Math.floor((S.colonies[i] + 1) / MILESTONE));
        const delta = TIERS[i].prod * (after * (S.colonies[i] + 1) - before * S.colonies[i]) * g;
        const cost = costAt(i, S.colonies[i]);
        if (cost > S.biomass) continue;
        const score = delta / cost;
        if (score > bestScore) { bestScore = score; best = i; bestCost = cost; }
      }
      if (best < 0) return;
      S.biomass -= bestCost;
      S.colonies[best]++;
    }
  };

  const payout = () => (S.biomass >= FRUIT_MIN
    ? Math.max(1, Math.floor(SPORE_BASE * Math.pow(S.biomass / FRUIT_MIN, SPORE_EXP) * (1 + treeEff('deeproots', 'spore'))))
    : 0);

  const tierAt = TIERS.map(() => null);
  let t = 0, clickAccum = 0;
  const dt = 1;

  for (; t < 3 * 3600; t += dt) {
    const gain = bps() * dt;
    S.biomass += gain;
    S.total += gain;

    if (CLICKS) {
      clickAccum += dt;
      while (clickAccum >= 1) { clickAccum -= 1; const c = clickGain(); S.biomass += c; S.total += c; S.clicks++; }
    }

    for (const a of ACH) if (!earned.has(a.id) && reqMet(a.req)) earned.add(a.id);

    buyUpgrades();
    buyColonies();

    const rate = bps();
    if (rate > S.bestBps) S.bestBps = rate;

    for (let i = 0; i < TIERS.length; i++) if (tierAt[i] == null && unlocked(i)) tierAt[i] = t;

    if (process.env.TRACE && t > 0 && t % 300 === 0) {
      console.log(`    [${(t / 60).toFixed(0)}m] bio ${S.biomass.toExponential(2)} bps ${bps().toExponential(2)} cols ${S.colonies.reduce((a, b) => a + b, 0)} ups ${S.upgrades.size} treeG ${treeProduction().toFixed(2)} ach ${earned.size}`);
    }

    // fruit either at the run horizon or when waiting 3 more minutes buys < 1 spore
    if (RUN_MIN && t >= RUN_MIN * 60) break;
    const pay = payout();
    if (pay > 0) {
      const relativeGrowth = rate / Math.max(S.biomass, 1);
      if (180 * pay * SPORE_EXP * relativeGrowth < 1) break;
    }
  }

  return {
    seconds: t,
    biomass: S.biomass,
    bps: bps(),
    colonies: S.colonies.reduce((a, b) => a + b, 0),
    tiers: tierAt,
    spores: payout(),
    upgrades: S.upgrades.size,
  };

}

function spendSpores(pool, log) {
  for (;;) {
    const options = NODES
      .filter(n => (tree[n.id] || 0) < n.max)
      .map(n => ({ n, cost: nextCost(n) }))
      .filter(o => o.cost <= pool.spores)
      .sort((a, b) => a.cost - b.cost);
    if (!options.length) return;
    const pick = options[0];
    pool.spores -= pick.cost;
    tree[pick.n.id] = (tree[pick.n.id] || 0) + 1;
    if (log) log.push(`${pick.n.id}@${pick.cost}`);
  }
}

const totalLevels = () => NODES.reduce((a, n) => a + (tree[n.id] || 0), 0);
const maxLevels = NODES.reduce((a, n) => a + n.max, 0);

// A fresh, tree-less run tells us when each colony type first appears.
const first = simulateRun(0);
console.log('first run, no tree:');
console.log('  ' + first.tiers.map((s, i) => `t${i + 1} ${s == null ? '—' : (s / 60).toFixed(0) + 'm'}`).join('   '));
console.log('');

console.log(`campaign: clicks=${CLICKS ? '1/s' : 'none'}  costGrowth=${COST_GROWTH}  dwell=${DWELL}  spore=${SPORE_BASE}*ratio^${SPORE_EXP}`);
console.log('run  min   biomass      spores  held   lv    cols  bps          newest tier');
let totalSeconds = 0, sporesEarned = 0, run = 0;
const sporeBank = { spores: 0 };

for (; run < MAX_RUNS; run++) {
  const r = simulateRun(run);
  sporesEarned += r.spores;
  sporeBank.spores += r.spores;
  totalSeconds += r.seconds;

  const before = totalLevels();
  const log = [];
  spendSpores(sporeBank, log);

  const newest = r.tiers.reduce((acc, t, i) => (t != null ? i : acc), -1);
  console.log(
    `${String(run + 1).padStart(3)}  ${String(Math.round(r.seconds / 60)).padStart(3)}m  ${r.biomass.toExponential(1).padStart(10)}  ${String(r.spores).padStart(6)}  ${String(Math.round(sporeBank.spores)).padStart(4)}  ${String(totalLevels()).padStart(2)}/${maxLevels}  ${String(r.colonies).padStart(4)}  ${r.bps.toExponential(1).padStart(10)}  t${newest + 1}${log.length ? '  +' + log.length : ''}`
  );
  if (totalLevels() >= maxLevels) { run++; break; }
}

console.log(`\n${run} runs, ${(totalSeconds / 3600).toFixed(1)}h played, ${sporesEarned} spores earned, tree ${totalLevels()}/${maxLevels}`);
