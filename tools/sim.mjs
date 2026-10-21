/* Headless pacing check for SPOREFALL.
   Mirrors the multiplier/cost math in js/game.js and simulates a greedy optimiser.
   Usage: node tools/sim.mjs [--clicks]
*/
import fs from 'node:fs';
import vm from 'node:vm';

const src = fs.readFileSync(new URL('../js/data.js', import.meta.url), 'utf8');
const ctx = { Math, Array, Object, Number, JSON, console };
vm.createContext(ctx);
vm.runInContext(src + '\n;globalThis.__D={TIERS,UPGRADES,MUTATIONS,SPORE_NODES,ACHIEVEMENTS,COST_GROWTH,MILESTONE_EVERY,CLICK_RATIO_BASE,OFFLINE_RATE_BASE,FRUIT_MIN,SPORE_BASE,SPORE_EXP,TIER_UP_AT,TIER_UP_COST_FACTOR};', ctx);
const D = ctx.__D;
const { TIERS, UPGRADES, COST_GROWTH, MILESTONE_EVERY, CLICK_RATIO_BASE, FRUIT_MIN, SPORE_BASE, SPORE_EXP } = D;
// mirror sporeGain() in js/game.js
const sporeGain = biomass => (biomass >= FRUIT_MIN ? Math.max(1, Math.floor(SPORE_BASE * Math.pow(biomass / FRUIT_MIN, SPORE_EXP))) : 0);

const CLICKS = process.argv.includes('--clicks');

function simulate({ seconds = 7200, dt = 0.25, verbose = true } = {}) {
  const S = {
    biomass: 0, total: 0, colonies: TIERS.map(() => 0), upgrades: new Set(),
    clicks: 0, ach: 0,
  };
  const marks = {};
  const targets = [1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11, 1e12];
  let t = 0;
  let clickAccum = 0;

  const globalMul = () => {
    let g = 1 + 0.02 * S.ach;
    for (const id of S.upgrades) {
      const u = UPGRADES.find(x => x.id === id);
      if (u.eff.globalMul) g *= u.eff.globalMul;
      if (u.eff.perOwned) g *= 1 + u.eff.perOwned.amt * S.colonies[u.eff.perOwned.tier];
    }
    return g;
  };
  const clickMul = () => {
    let c = 1;
    for (const id of S.upgrades) {
      const u = UPGRADES.find(x => x.id === id);
      if (u.eff.clickMul) c *= u.eff.clickMul;
    }
    return c;
  };
  const costMul = () => {
    let c = 1;
    for (const id of S.upgrades) {
      const u = UPGRADES.find(x => x.id === id);
      if (u.eff.costMul) c *= u.eff.costMul;
    }
    return c;
  };
  const tierMults = () => TIERS.map((_, i) => Math.pow(2, Math.floor(S.colonies[i] / MILESTONE_EVERY)));
  const bps = () => {
    const tm = tierMults(), g = globalMul();
    let raw = 0;
    for (let i = 0; i < TIERS.length; i++) raw += TIERS[i].prod * S.colonies[i] * tm[i];
    return raw * g;
  };
  const clickGain = () => (1 + bps() * CLICK_RATIO_BASE) * clickMul();
  const costAt = (i, owned) => TIERS[i].cost * costMul() * Math.pow(COST_GROWTH, owned);
  const unlocked = i => {
    if (TIERS[i].unlock && !reqMet(TIERS[i].unlock)) return false;
    return i === 0 || S.colonies[i] > 0 || S.colonies[i - 1] > 0;
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
    if (req.fruits != null) return false;
    if (req.drifts != null) return false;
    if (req.treeLevels != null) return false;
    if (req.bestBps != null) return false;
    if (req.owned && S.colonies[req.owned[0]] < req.owned[1]) return false;
    return true;
  }

  const buyAvailableUpgrades = () => {
    let bought = false;
    for (;;) {
      const avail = UPGRADES.filter(u => !S.upgrades.has(u.id) && reqMet(u.req) && u.cost <= S.biomass)
        .sort((a, b) => a.cost - b.cost);
      if (!avail.length) break;
      const u = avail[0];
      S.biomass -= u.cost;
      S.upgrades.add(u.id);
      bought = true;
    }
    return bought;
  };

  const buyColonies = () => {
    for (let guard = 0; guard < 4000; guard++) {
      // unlock gate: buy one of a freshly visible tier
      let did = false;
      for (let i = 0; i < TIERS.length; i++) {
        if (!unlocked(i)) continue;
        if (S.colonies[i] === 0) {
          const c = costAt(i, 0);
          if (c <= S.biomass * 0.6) {
            S.biomass -= c;
            S.colonies[i] += 1;
            did = true;
            break;
          }
        }
      }
      if (did) continue;

      // best marginal production per biomass
      const g = globalMul();
      let best = -1, bestScore = 0, bestCost = 0;
      for (let i = 0; i < TIERS.length; i++) {
        if (!unlocked(i) || S.colonies[i] === 0) continue;
        const before = Math.pow(2, Math.floor(S.colonies[i] / MILESTONE_EVERY));
        const after = Math.pow(2, Math.floor((S.colonies[i] + 1) / MILESTONE_EVERY));
        // marginal production across the whole tier when a milestone hits, else single unit
        const delta = TIERS[i].prod * (after * (S.colonies[i] + 1) - before * S.colonies[i]) * g;
        const cost = costAt(i, S.colonies[i]);
        if (cost > S.biomass) continue;
        const score = delta / cost;
        if (score > bestScore) { bestScore = score; best = i; bestCost = cost; }
      }
      if (best < 0) break;
      S.biomass -= bestCost;
      S.colonies[best] += 1;
    }
  };

  while (t < seconds) {
    t += dt;
    const gain = bps() * dt;
    S.biomass += gain;
    S.total += gain;

    if (CLICKS) {
      clickAccum += dt;
      while (clickAccum >= 1) {
        clickAccum -= 1;
        const c = clickGain();
        S.biomass += c; S.total += c; S.clicks++;
      }
    }

    // achievements
    for (const a of D.ACHIEVEMENTS) {
      if (S.ach >= D.ACHIEVEMENTS.length) break;
      if (reqMet(a.req)) S.ach++;
    }

    buyAvailableUpgrades();
    buyColonies();

    for (const target of targets) {
      if (!marks[target] && S.total >= target) {
        marks[target] = { t, bps: bps(), cols: S.colonies.reduce((a, b) => a + b, 0), ups: S.upgrades.size };
      }
    }

    if (verbose && Math.abs(t % 300) < dt && t > 0) {
      console.log(`  [${(t / 60).toFixed(0)}m] bps ${bps().toExponential(2)}  total ${S.total.toExponential(2)}  held ${S.biomass.toExponential(2)}  tier counts ${S.colonies.join('/')}`);
    }
  }

  if (verbose) {
    console.log(`greedy ${CLICKS ? 'with 1 click/s' : 'idle only'}, dt=${dt}s`);
    for (const target of targets) {
      const m = marks[target];
      if (!m) { console.log(`${String(target).padEnd(10)} not reached in ${seconds}s`); continue; }
      console.log(`${String(target).padEnd(10)} at ${(m.t / 60).toFixed(1)} min   bps ${m.bps.toExponential(2)}   colonies ${m.cols}   upgrades ${m.ups}`);
    }
    const bal = S.biomass;
    console.log(`final biomass ${bal.toExponential(2)} after ${(seconds / 60).toFixed(0)} min → ${sporeGain(bal)} spores if fruited`);
    const curve = [3e7, 3e8, 3e9, 3e10, 3e11, 3e12, 3e14, 3e16, 3e18, 3e20];
    console.log('spore payout by body depth: ' + curve.map(b => `${b.toExponential(0)}=${sporeGain(b)}`).join('  '));
  }
  return { marks, S };
}

simulate({ seconds: 60 * 60 });
