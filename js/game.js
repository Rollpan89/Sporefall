/* ─────────────────────────────────────────────────────────────
   SPOREFALL — game engine
   ───────────────────────────────────────────────────────────── */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  /* ── numbers ─────────────────────────────────────────────── */
  const SUFFIX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc',
    'UDc', 'DDc', 'TDc', 'QaDc', 'QiDc', 'SxDc', 'SpDc', 'OcDc', 'NoDc', 'Vg'];

  function fmt(n) {
    if (!isFinite(n)) return '∞';
    if (n < 0) return '-' + fmt(-n);
    if (n < 1000) {
      if (n === 0) return '0';
      if (n < 10) return String(Math.round(n * 100) / 100);
      if (n < 100) return String(Math.round(n * 10) / 10);
      return String(Math.round(n));
    }
    const tier = Math.floor(Math.log10(n) / 3);
    if (tier >= SUFFIX.length) return n.toExponential(2).replace('e+', 'e');
    const scaled = n / Math.pow(1000, tier);
    const body = scaled < 10 ? scaled.toFixed(2) : scaled < 100 ? scaled.toFixed(1) : Math.round(scaled).toString();
    return body.replace(/\.0+$/, '') + SUFFIX[tier];
  }

  const fmtWhole = n => fmt(Math.floor(n));

  const timeStr = s => {
    s = Math.max(0, Math.floor(s));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (h) return `${h}h ${m}m`;
    if (m) return `${m}m ${sec}s`;
    return `${sec}s`;
  };

  /* ── requirements ────────────────────────────────────────── */
  const UPG_BY_ID = Object.fromEntries(UPGRADES.map(u => [u.id, u]));
  const MUT_BY_ID = Object.fromEntries(MUTATIONS.map(m => [m.id, m]));

  const treeLvl = id => G.tree[id] || 0;
  const colonyTotal = () => G.colonies.reduce((a, b) => a + b, 0);
  const colonyTiersOwned = () => G.colonies.filter(n => n > 0).length;
  const upgradesOwned = () => Object.keys(G.upgrades).length;
  const treeLevels = () => Object.values(G.tree).reduce((a, b) => a + b, 0);

  function reqMet(req) {
    if (!req) return true;
    if (req.clicks != null && G.clicks < req.clicks) return false;
    if (req.colonies != null && colonyTotal() < req.colonies) return false;
    if (req.total != null && G.totalEver < req.total) return false;
    if (req.biomass != null && G.biomass < req.biomass) return false;
    if (req.bps != null && S.bps < req.bps) return false;
    if (req.upgrades != null && upgradesOwned() < req.upgrades) return false;
    if (req.mutations != null && G.mutations.length < req.mutations) return false;
    if (req.fruits != null && G.fruits < req.fruits) return false;
    if (req.drifts != null && G.drifts < req.drifts) return false;
    if (req.treeLevels != null && treeLevels() < req.treeLevels) return false;
    if (req.bestBps != null && G.bestBps < req.bestBps) return false;
    if (req.owned && G.colonies[req.owned[0]] < req.owned[1]) return false;
    return true;
  }

  function reqText(req) {
    if (!req) return '';
    if (req.clicks != null) return `click ${fmt(req.clicks)} times`;
    if (req.colonies != null) return `own ${req.colonies} colonies`;
    if (req.total != null) return `produce ${fmt(req.total)} biomass total`;
    if (req.biomass != null) return `reach ${fmt(req.biomass)} biomass`;
    if (req.bps != null) return `reach ${fmt(req.bps)}/s`;
    if (req.upgrades != null) return `buy ${req.upgrades} upgrades`;
    if (req.mutations != null) return `hold ${req.mutations} mutations`;
    if (req.fruits != null) return `fruit ${req.fruits}×`;
    if (req.drifts != null) return `catch ${req.drifts} drifting spores`;
    if (req.treeLevels != null) return `grow ${req.treeLevels} spore levels`;
    if (req.bestBps != null) return `reach ${fmt(req.bestBps)}/s once`;
    if (req.owned) return `own ${req.owned[1]} ${TIERS[req.owned[0]].name}`;
    return '';
  }

  /* ── state ───────────────────────────────────────────────── */
  const SAVE_KEY = 'sporefall.save.v1';

  function freshState() {
    return {
      v: 2,
      biomass: 0,
      runTotal: 0,
      totalEver: 0,
      clicks: 0,
      drifts: 0,
      fruits: 0,
      bestBps: 0,
      bestSpores: 0,
      playTime: 0,
      colonies: TIERS.map(() => 0),
      upgrades: {},
      mutations: [],
      focusTier: null,
      draftsTaken: 0,
      pendingDrafts: 0,
      draftThresholds: DRAFT_AT.slice(),
      spores: 0,
      sporesEver: 0,
      tree: {},
      ach: {},
      autoBuy: false,
      buyAmount: 1,
      sound: true,
      seenIntro: false,
      started: false,
      lastSave: Date.now(),
      frenzyUntil: 0,
      frenzyMul: 0,
      autoGainAt: 0,
    };
  }

  let G = freshState();
  const S = {};
  const R = { modalOpen: false, drift: null, nextDrift: 0, upSig: '', sporeSig: '', goalSig: '', mutSig: '' };

  /* ── derived stats ───────────────────────────────────────── */
  function compute() {
    let globalMul = 1, clickMul = 1, costMul = 1;
    let clickRatio = CLICK_RATIO_BASE;
    let offline = OFFLINE_RATE_BASE;
    let milestoneEvery = MILESTONE_EVERY;
    let driftMul = 1, sporeMul = 1;
    let perTier = 0, perMutation = 0, perColony = 0;
    let autoGain = null;

    const tierMults = TIERS.map(() => 1);

    // permanent spore tree — every number lives in data.js so tuning one
    // place tunes both the game and the balance sim
    for (const node of SPORE_NODES) {
      const lvl = treeLvl(node.id);
      if (!lvl) continue;
      const e = node.eff;
      if (e.global) globalMul *= 1 + e.global * lvl;
      if (e.globalMul) globalMul *= Math.pow(e.globalMul, lvl);
      if (e.click) clickMul *= 1 + e.click * lvl;
      if (e.offline) offline += e.offline * lvl;
      if (e.cost) costMul *= Math.pow(1 - e.cost, lvl);
      if (e.spore) sporeMul *= 1 + e.spore * lvl;
    }

    // one-time upgrades
    for (const id in G.upgrades) {
      const u = UPG_BY_ID[id];
      if (!u) continue;
      const e = u.eff;
      if (e.globalMul) globalMul *= e.globalMul;
      if (e.clickMul) clickMul *= e.clickMul;
      if (e.costMul) costMul *= e.costMul;
      if (e.clickRatioAdd) clickRatio += e.clickRatioAdd;
      if (e.tierMul) tierMults[e.tierMul[0]] *= e.tierMul[1];
      if (e.perOwned) globalMul *= 1 + e.perOwned.amt * G.colonies[e.perOwned.tier];
    }

    // mutations
    for (const m of G.mutations) {
      const def = MUT_BY_ID[m];
      if (!def) continue;
      const e = def.eff;
      if (e.id === 'focus' || def.id === 'focus') {
        if (G.focusTier != null) tierMults[G.focusTier] *= 6;
      }
      if (e.globalMul) globalMul *= e.globalMul;
      if (e.clickMul) clickMul *= e.clickMul;
      if (e.costMul) costMul *= e.costMul;
      if (e.offlineAbs != null) offline = e.offlineAbs;
      if (e.milestoneEvery) milestoneEvery = e.milestoneEvery;
      if (e.driftMul) driftMul *= e.driftMul;
      if (e.perTier) perTier += e.perTier;
      if (e.perMutation) perMutation += e.perMutation;
      if (e.perColony) perColony += e.perColony;
      if (e.autoGain) autoGain = e.autoGain;
    }

    // milestones
    for (let i = 0; i < TIERS.length; i++) {
      tierMults[i] *= Math.pow(2, Math.floor(G.colonies[i] / milestoneEvery));
    }

    // dynamic colony-count / mutation-count bonuses
    if (perTier) globalMul *= 1 + perTier * colonyTiersOwned();
    if (perMutation) globalMul *= 1 + perMutation * G.mutations.length;
    if (perColony) globalMul *= 1 + perColony * colonyTotal();

    // achievements
    const achCount = Object.keys(G.ach).length;
    globalMul *= 1 + ACH_BONUS * achCount;

    // frenzy
    const now = Date.now();
    const frenzied = now < G.frenzyUntil;
    if (frenzied) globalMul *= G.frenzyMul;

    let rawBps = 0;
    for (let i = 0; i < TIERS.length; i++) {
      if (!G.colonies[i]) continue;
      rawBps += TIERS[i].prod * G.colonies[i] * tierMults[i];
    }

    S.tierMults = tierMults;
    S.rawBps = rawBps;
    S.globalMul = globalMul;
    S.bps = rawBps * globalMul;
    S.clickRatio = clickRatio;
    S.click = (1 + S.bps * clickRatio) * clickMul;
    S.costMul = costMul;
    S.offline = clamp(offline, 0, 1);
    S.milestoneEvery = milestoneEvery;
    S.driftMul = driftMul;
    S.sporeMul = sporeMul;
    S.autoGain = autoGain;
    S.frenzied = frenzied;
    S.frenzyLeft = Math.max(0, (G.frenzyUntil - now) / 1000);

    if (S.bps > G.bestBps) G.bestBps = S.bps;
  }

  /* ── economy ─────────────────────────────────────────────── */
  function colonyCostAt(i, owned) {
    return TIERS[i].cost * S.costMul * Math.pow(COST_GROWTH, owned);
  }
  function colonyBulkCost(i, n) {
    const base = colonyCostAt(i, G.colonies[i]);
    return base * (Math.pow(COST_GROWTH, n) - 1) / (COST_GROWTH - 1);
  }
  function colonyMaxAffordable(i) {
    const base = colonyCostAt(i, G.colonies[i]);
    if (G.biomass < base) return 0;
    const x = 1 + G.biomass * (COST_GROWTH - 1) / base;
    return Math.max(0, Math.floor(Math.log(x) / Math.log(COST_GROWTH)));
  }
  function desiredAmount(i) {
    if (G.buyAmount === 'max') return Math.min(colonyMaxAffordable(i), 1e6);
    // Coerce: a save with a string amount ("1") would otherwise concatenate
    // instead of adding when the colony count is incremented.
    const n = Math.floor(Number(G.buyAmount));
    return Number.isFinite(n) && n > 0 ? n : 1;
  }

  function gain(amount) {
    if (!(amount > 0)) return;
    G.biomass += amount;
    G.runTotal += amount;
    G.totalEver += amount;
  }

  function buyColony(i) {
    const n = desiredAmount(i);
    if (n <= 0) return;
    const cost = colonyBulkCost(i, n);
    if (!isFinite(cost) || cost > G.biomass || G.biomass < 0) return;
    compute();
    const beforeBps = S.bps;
    G.biomass -= cost;
    G.colonies[i] += n;
    const before = Math.floor((G.colonies[i] - n) / S.milestoneEvery);
    const after = Math.floor(G.colonies[i] / S.milestoneEvery);
    compute();
    if (after > before) toast(`${TIERS[i].name} milestone — ×${Math.pow(2, after)} production`);
    beep(190 + i * 22, 0.05, 0.05);

    // Show what the purchase actually bought you (once at a time, so mass-buying stays readable).
    const delta = S.bps - beforeBps;
    if (delta > 1e-9 && Date.now() - (R.bpsFloatAt || 0) > 420) {
      R.bpsFloatAt = Date.now();
      const p = stagePoint();
      floatText(`+${fmt(delta)}/s`, p.x + rnd(-26, 26), p.y + 78, 'prod');
    }
    refreshAll();
  }

  function buyUpgrade(id) {
    const u = UPG_BY_ID[id];
    if (!u || G.upgrades[id] || !reqMet(u.req)) return;
    if (G.biomass < u.cost) return;
    G.biomass -= u.cost;
    G.upgrades[id] = 1;
    compute();
    beep(420, 0.08, 0.04);
    toast(`Upgrade — ${u.name}`, 'green');
    refreshAll(true);
  }

  /* ── spore tree ──────────────────────────────────────────── */
  function nodeCost(node) {
    const lvl = treeLvl(node.id);
    return Math.ceil(node.cost * Math.pow(node.grow, lvl));
  }

  function buyNode(id) {
    const node = SPORE_NODES.find(n => n.id === id);
    if (!node) return;
    const lvl = treeLvl(id);
    if (lvl >= node.max) return;
    const cost = nodeCost(node);
    if (G.spores < cost) return;
    G.spores -= cost;
    G.tree[id] = lvl + 1;
    if (id === 'recollection') { /* applies next run */ }
    if (id === 'automation') G.autoBuy = true;
    compute();
    beep(620, 0.12, 0.05);
    toast(`${node.name} — level ${lvl + 1}`, 'gold');
    refreshAll(true);
    save();
  }

  /* ── fruiting (prestige) ─────────────────────────────────── */
  // Spores are a slow, bounded currency: a first fruiting is worth a handful,
  // and every ~10× of depth adds about a quarter of the current payout.
  function sporeGain() {
    if (G.biomass < FRUIT_MIN) return 0;
    const raw = SPORE_BASE * Math.pow(G.biomass / FRUIT_MIN, SPORE_EXP) * S.sporeMul;
    return Math.max(1, Math.floor(raw));
  }

  function fruit() {
    const gainAmt = sporeGain();
    if (!gainAmt) return;
    G.spores += gainAmt;
    G.sporesEver += gainAmt;
    G.fruits++;
    const keep = G.biomass * NODE_EFF.momentum.keep * treeLvl('momentum');
    startRun(keep);
    releaseBurst(gainAmt);
    toast(`Fruited — ${fmtWhole(gainAmt)} spores released`, 'gold');
    beep(140, 0.5, 0.06, 'sine');
    save();
    refreshAll(true);
    if (G.fruits === 1) {
      setTimeout(() => openModal(`
        <div class="eyebrow intro-eyebrow">the first fall</div>
        <h2>The body dies. The strain remains.</h2>
        <p class="flavor">You have done this before, and will do it again. Somewhere under the ash, a spore remembers the shape of the last world.</p>
        <p>Spores buy permanent growth in the <b style="color:var(--gold)">Spores</b> tab — production, offline patience, cheaper colonies, extra mutations. Everything else resets: colonies, upgrades, and this run's strain.</p>
        <div class="modal-actions"><button class="btn" data-close>Begin again</button></div>
      `), 3200);
    }
  }

  function startRun(keepBiomass = 0) {
    G.biomass = keepBiomass;
    G.runTotal = 0;
    G.colonies = TIERS.map(() => 0);
    G.colonies[0] = NODE_EFF.recollection.start * treeLvl('recollection');
    G.upgrades = {};
    G.mutations = [];
    G.focusTier = null;
    G.draftsTaken = 0;
    G.pendingDrafts = 0;
    G.frenzyUntil = 0;
    G.frenzyMul = 0;
    G.autoGainAt = G.playTime;
    G.draftThresholds = buildDraftThresholds();
    GARDEN.prev = [];
    GARDEN.sig = null;

    // second bloom: a free mutation at the start of each run
    if (treeLvl('second')) {
      const pool = MUTATIONS.filter(m => !G.mutations.includes(m.id));
      if (pool.length) applyMutation(pick(pool).id, true);
    }
    compute();
  }

  function buildDraftThresholds() {
    const arr = DRAFT_AT.slice();
    let last = arr[arr.length - 1];
    for (let i = 0; i < treeLvl('draft'); i++) {
      last *= 1000;
      arr.push(last);
    }
    return arr;
  }

  /* ── mutations ───────────────────────────────────────────── */
  function applyMutation(id, silent) {
    if (G.mutations.includes(id)) return;
    const def = MUT_BY_ID[id];
    if (!def) return;
    G.mutations.push(id);
    if (def.eff.tierFocus && G.focusTier == null) {
      const reachable = TIERS.map((_, i) => i).filter(i => tierUnlocked(i));
      G.focusTier = reachable.length ? pick(reachable) : 0;
    }
    if (def.eff.instantLoss) {
      G.biomass *= 1 - def.eff.instantLoss;
    }
    compute();
    if (!silent) toast(`Mutation — ${def.name}`, 'mut');
    refreshAll(true);
  }

  function mutDesc(m) {
    const def = MUT_BY_ID[m];
    if (!def) return '';
    if (def.id === 'focus' && G.focusTier != null) {
      return `Colonies of one type — ${TIERS[G.focusTier].name} — are 6× as effective. Chosen by the body, not by you.`;
    }
    return def.desc;
  }

  const RARITY_NAME = { 1: 'common', 2: 'uncommon', 3: 'rare' };

  function draftOptions() {
    const pool = MUTATIONS.filter(m => !G.mutations.includes(m.id));
    const out = [];
    let bag = pool.slice();
    while (out.length < 3 && bag.length) {
      const weights = bag.map(m => (m.rarity === 1 ? 60 : m.rarity === 2 ? 28 : 12));
      let roll = Math.random() * weights.reduce((a, b) => a + b, 0);
      let idx = 0;
      for (; idx < bag.length; idx++) { roll -= weights[idx]; if (roll <= 0) break; }
      const chosen = bag[Math.min(idx, bag.length - 1)];
      out.push(chosen);
      bag = bag.filter(m => m.id !== chosen.id);
    }
    return out;
  }

  function checkDrafts() {
    if (R.modalOpen) return;
    const idx = G.draftsTaken + G.pendingDrafts;
    if (idx >= G.draftThresholds.length) return;
    if (G.runTotal < G.draftThresholds[idx]) return;
    G.pendingDrafts++;
    setTimeout(maybeShowDraft, 350);
  }

  function maybeShowDraft() {
    if (R.modalOpen || G.pendingDrafts <= 0) return;
    const opts = draftOptions();
    if (!opts.length) { G.pendingDrafts = 0; return; }
    R.modalOpen = true;
    const cards = opts.map(m => `
      <button class="choice ${RARITY_NAME[m.rarity]}" data-mut="${m.id}">
        <span class="choice-kind">${RARITY_NAME[m.rarity]} mutation</span>
        <span class="choice-name">${m.name}</span>
        <span class="choice-desc">${m.desc}</span>
        <span class="choice-pick">take it</span>
      </button>`).join('');

    openModal(`
      <div class="eyebrow intro-eyebrow">the strain shifts</div>
      <h2>Something in you changes.</h2>
      <p class="flavor">The mycelium has learned a new way to be hungry. Choose carefully — this body will not forget.</p>
      <div class="choices">${cards}</div>
      <p style="font-size:11px;margin:0;color:var(--dimmer)">Draft ${G.draftsTaken + 1} of ${G.draftThresholds.length} this run.</p>
    `, true);

    $$('.choice').forEach(el => el.addEventListener('click', () => {
      applyMutation(el.dataset.mut);
      G.pendingDrafts = Math.max(0, G.pendingDrafts - 1);
      G.draftsTaken++;
      closeModal();
    }));
  }

  /* ── drifting spores ─────────────────────────────────────── */
  function scheduleDrift() {
    const interval = rnd(46, 88) / Math.max(1, S.driftMul);
    R.nextDrift = G.playTime + interval;
  }

  function spawnDrift() {
    if (R.drift || !G.started) return;
    const layer = $('#driftLayer');
    const w = layer.clientWidth || 320, h = layer.clientHeight || 320;
    const el = document.createElement('button');
    el.className = 'drift' + (Math.random() < 0.34 ? ' green' : '');
    el.type = 'button';
    el.setAttribute('aria-label', 'Catch the drifting spore');
    layer.appendChild(el);

    const pad = 34;
    const fromLeft = Math.random() < 0.5;
    const d = {
      el,
      x: fromLeft ? pad : w - pad,
      y: rnd(pad + 10, h - pad - 10),
      vx: (fromLeft ? 1 : -1) * rnd(9, 15),
      vy: rnd(-4, 4),
      life: 14,
      t: 0,
      phase: Math.random() * 6.28,
    };
    el.style.left = '0px';
    el.style.top = '0px';
    el.style.transform = `translate(${d.x}px, ${d.y}px)`;
    el.addEventListener('pointerdown', ev => {
      ev.stopPropagation();
      collectDrift(d);
    });
    R.drift = d;
  }

  function collectDrift(d) {
    if (!R.drift || R.drift !== d) return;
    const bonus = S.driftMul;
    R.drift = null;
    d.el.remove();
    G.drifts++;
    beep(880, 0.12, 0.04, 'triangle');

    const roll = Math.random();
    if (roll < 0.5) {
      const amount = Math.max(S.bps * 25 * bonus, S.click * 10);
      gain(amount);
      floatText(`+${fmt(amount)}`, stagePoint().x, stagePoint().y, 'gold');
      toast(`Drift caught — ${fmt(amount)} biomass`, 'gold');
    } else if (roll < 0.85) {
      G.frenzyUntil = Date.now() + 20000;
      G.frenzyMul = 7 * bonus;
      toast(`Frenzy — production ×${fmt(G.frenzyMul)} for 20s`, 'gold');
    } else {
      const amount = Math.max(S.bps * 120 * bonus, S.click * 40);
      gain(amount);
      floatText(`+${fmt(amount)}`, stagePoint().x, stagePoint().y, 'gold');
      toast(`Windfall — ${fmt(amount)} biomass`, 'gold');
    }
    compute();
    scheduleDrift();
    refreshAll(true);
  }

  const stagePoint = () => {
    const r = $('#stage').getBoundingClientRect();
    return { x: r.width * 0.5, y: r.height * 0.52, rect: r };
  };

  function updateDrift(dt) {
    const d = R.drift;
    if (!d) return;
    d.t += dt;
    d.life -= dt;
    d.x += d.vx * dt;
    d.y += Math.sin(d.t * 1.7 + d.phase) * 9 * dt;
    const layer = $('#driftLayer');
    const w = layer.clientWidth || 320, h = layer.clientHeight || 320;
    if (d.x < 24 || d.x > w - 24) d.vx *= -1;
    d.x = clamp(d.x, 24, w - 24);
    d.y = clamp(d.y, 24, h - 24);
    d.el.style.transform = `translate(${d.x}px, ${d.y}px)`;
    d.el.style.opacity = d.life < 2.5 ? String(clamp(d.life / 2.5, 0, 1)) : '1';
    if (d.life <= 0) {
      d.el.remove();
      R.drift = null;
      scheduleDrift();
    }
  }

  /* ── whispers ────────────────────────────────────────────── */
  const WHISPERS = [
    'The dark is not empty. It is only quiet.',
    'Somewhere above, a bird falls and never lands.',
    'You remember being a forest.',
    'The rot is warm. It was something, once.',
    'A thread finds a thread. They do not speak.',
    'The ash tastes of the sea.',
    'There is no sun. You grow toward the memory of one.',
    'Something is still breathing under the water.',
    'The wind carries spores that are not yours.',
    'Every stone here used to be a lung.',
    'The silence has a texture. You are learning it.',
    'You have done this before. The scars say so.',
  ];
  const WHISPERS_LATE = [
    'The ground is no longer ground. It is you.',
    'The horizon is a membrane, and it is thinning.',
    'Something answers when the threads move.',
    'You are eating the world politely, in small bites.',
  ];
  const WHISPERS_AFTER = [
    'The old body is compost now. You are still here.',
    'This is the third time this world has ended.',
    'The spores remember more than you do.',
  ];

  let whisperAt = 0;

  function rotateWhisper(force) {
    if (!force && G.playTime < whisperAt) return;
    whisperAt = G.playTime + rnd(20, 32);
    let pool = WHISPERS;
    if (G.fruits > 0) pool = pool.concat(WHISPERS_AFTER);
    if (colonyTotal() > 150) pool = pool.concat(WHISPERS_LATE);
    const el = $('#whisper');
    const line = pick(pool);
    if (el.textContent === line) return;
    el.classList.remove('show');
    setTimeout(() => {
      el.textContent = line;
      el.classList.add('show');
    }, 450);
  }

  /* ── clicking ────────────────────────────────────────────── */
  function doClick(x, y) {
    if (R.modalOpen && !G.started) return;
    compute();
    const amount = S.click;
    gain(amount);
    G.clicks++;

    const rect = $('#stage').getBoundingClientRect();
    const px = x != null ? x - rect.left : rect.width / 2 + rnd(-30, 30);
    const py = y != null ? y - rect.top : rect.height * 0.46 + rnd(-20, 20);

    // The heart answers louder the more it produces.
    const power = clamp(Math.log10(1 + Math.max(S.bps, amount)) / 11.5, 0, 1);
    clickFx(px, py, power);
    floatText(`+${fmt(amount)}`, px, py, '', power);

    const orb = $('#orb');
    orb.classList.add('pressed');
    setTimeout(() => orb.classList.remove('pressed'), 90);

    beep(150 + Math.random() * 40, 0.045, 0.028, 'triangle');
    if (power > 0.5) beep(66 + power * 40, 0.13, 0.025 + power * 0.035, 'sine');
    refreshHeader();
    checkProgress();
    maybeAchievements();
  }

  function floatText(text, x, y, kind = '', power = 0) {
    const el = document.createElement('span');
    el.className = 'float-num ' + kind;
    el.textContent = text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.fontSize = (13 + power * 12).toFixed(1) + 'px';
    $('#floatLayer').appendChild(el);
    setTimeout(() => el.remove(), 1100);
  }

  // Click feedback scales with production: one quiet ring early, a shockwave
  // throwing sparks once the network is huge.
  function clickFx(px, py, power) {
    const layer = $('#floatLayer');
    $('#stage').style.setProperty('--hit', power.toFixed(3));

    const flare = document.createElement('span');
    flare.className = 'click-flare';
    flare.style.left = px + 'px';
    flare.style.top = py + 'px';
    flare.style.setProperty('--f', (70 + power * 250).toFixed(0) + 'px');
    layer.appendChild(flare);
    setTimeout(() => flare.remove(), 620);

    const rings = 1 + Math.round(power * 2);
    for (let r = 0; r < rings; r++) {
      const el = document.createElement('span');
      el.className = 'shock';
      el.style.left = px + 'px';
      el.style.top = py + 'px';
      el.style.setProperty('--s', (3.2 + power * 11 + r * 1.4).toFixed(2));
      el.style.animationDelay = r * 60 + 'ms';
      el.style.borderWidth = (1 + power * 1.6).toFixed(2) + 'px';
      layer.appendChild(el);
      setTimeout(() => el.remove(), 1000 + r * 70);
    }

    const sparks = Math.round(3 + power * 20);
    for (let i = 0; i < sparks; i++) {
      const el = document.createElement('i');
      const a = Math.random() * Math.PI * 2;
      const dist = 55 + power * 200 * rnd(0.35, 1);
      el.className = 'spark' + (Math.random() < 0.28 ? ' gold' : '');
      el.style.left = px + 'px';
      el.style.top = py + 'px';
      el.style.setProperty('--dx', (Math.cos(a) * dist).toFixed(1) + 'px');
      el.style.setProperty('--dy', (Math.sin(a) * dist).toFixed(1) + 'px');
      el.style.setProperty('--dur', Math.round(380 + Math.random() * 440) + 'ms');
      el.style.setProperty('--sz', (1.8 + Math.random() * 2.6 + power * 2.4).toFixed(2) + 'px');
      layer.appendChild(el);
      setTimeout(() => el.remove(), 950);
    }

    const orb = $('#orb');
    orb.classList.add('hit');
    clearTimeout(R.hitTimer);
    R.hitTimer = setTimeout(() => orb.classList.remove('hit'), 190);
  }

  // The fruiting itself: a cloud of spores leaving the body.
  function releaseBurst(spores) {
    const orbEl = $('.orb');
    const r = orbEl ? orbEl.getBoundingClientRect() : null;
    const cx = r ? r.left + r.width / 2 : innerWidth / 2;
    const cy = r ? r.top + r.height / 2 : innerHeight / 2;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const layer = document.createElement('div');
    layer.className = 'release-layer';

    let html = `<div class="release-flash" style="--cx:${cx}px;--cy:${cy}px"></div>`;
    html += `<div class="release-word">sporefall</div>`;
    html += `<div class="release-gain">+${fmtWhole(spores)} spore${spores === 1 ? '' : 's'} released</div>`;

    const count = calm ? 0 : 120;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const dist = rnd(40, 260);
      const dx = Math.cos(a) * dist;
      const dy = Math.sin(a) * dist * 0.72 - rnd(30, 170);
      html += `<i class="release-spore${Math.random() < 0.32 ? ' gold' : ''}" style="left:${(cx + rnd(-18, 18)).toFixed(0)}px;top:${(cy + rnd(-18, 18)).toFixed(0)}px;--dx:${dx.toFixed(0)}px;--dy:${dy.toFixed(0)}px;--sz:${rnd(3, 9).toFixed(1)}px;--dur:${Math.round(rnd(2400, 4200))}ms;--delay:${Math.round(rnd(0, 520))}ms"></i>`;
    }
    layer.innerHTML = html;
    document.body.appendChild(layer);
    setTimeout(() => layer.remove(), 5000);
  }

  /* ── achievements / progress ─────────────────────────────── */
  function maybeAchievements() {
    let got = false;
    for (const a of ACHIEVEMENTS) {
      if (G.ach[a.id]) continue;
      if (reqMet(a.req)) {
        G.ach[a.id] = 1;
        toast(`Record — ${a.name} · +2% production`, 'gold');
        got = true;
      }
    }
    if (got) {
      compute();
      refreshAll(true);
    }
  }

  function checkProgress() {
    // draft triggers
    checkDrafts();
    // drift scheduling is handled by the tick
  }

  /* ── UI: rendering ───────────────────────────────────────── */
  const COL_ELS = [];

  function tierUnlocked(i) {
    if (TIERS[i].unlock && !reqMet(TIERS[i].unlock)) return false;
    if (i === 0) return true;
    return G.colonies[i] > 0 || G.colonies[i - 1] >= TIER_DWELL;
  }

  function syncBuyModes() {
    $$('#buyModes button').forEach(b => {
      b.classList.toggle('active', String(G.buyAmount) === b.dataset.amount);
    });
  }

  function renderColonies() {
    const list = $('#colonyList');
    list.innerHTML = '';
    COL_ELS.length = 0;
    let shownLocked = false;

    for (let i = 0; i < TIERS.length; i++) {
      const unlocked = tierUnlocked(i);
      if (!unlocked) {
        if (shownLocked) continue;
        shownLocked = true;
        const t = TIERS[i];
        const el = document.createElement('div');
        el.className = 'colony locked';
        el.innerHTML = `
          <div class="colony-icon">?</div>
          <div class="colony-main">
            <div class="colony-name-row"><span class="colony-name">???</span></div>
            <div class="colony-flavor">${i === 0 ? '' : `grow ${TIER_DWELL} ${TIERS[i - 1].plural || TIERS[i - 1].name + 's'} to reveal`}${t.unlock ? ` · requires ${reqText(t.unlock)}` : ''}</div>
          </div>
          <div class="colony-right"><span class="colony-cost">—</span></div>`;
        list.appendChild(el);
        continue;
      }

      const t = TIERS[i];
      const el = document.createElement('button');
      el.className = 'colony';
      el.type = 'button';
      el.innerHTML = `
        <div class="colony-icon">${t.glyph}</div>
        <div class="colony-main">
          <div class="colony-name-row">
            <span class="colony-name">${t.name}</span>
            <span class="colony-owned">×0</span>
            <span class="colony-mult hidden"></span>
          </div>
          <div class="colony-meta">
            <span class="colony-prod">+0/s</span>
            <span class="milestone"><i style="width:0%"></i></span>
            <span class="ms">0/25</span>
          </div>
          <div class="colony-flavor">${t.flavor}</div>
        </div>
        <div class="colony-right">
          <span class="colony-cost"><small>⬥</small><span>0</span></span>
        </div>`;
      el.addEventListener('click', () => buyColony(i));
      list.appendChild(el);
      COL_ELS[i] = {
        el,
        owned: $('.colony-owned', el),
        mult: $('.colony-mult', el),
        prod: $('.colony-prod', el),
        bar: $('.milestone i', el),
        ms: $('.ms', el),
        cost: $('.colony-cost span', el),
      };
    }
  }

  function renderColonyValues() {
    let total = 0;
    for (let i = 0; i < TIERS.length; i++) {
      const r = COL_ELS[i];
      if (!r) continue;
      const n = G.colonies[i];
      total += n;
      const max = colonyMaxAffordable(i);
      const amount = G.buyAmount === 'max' ? Math.max(1, max) : G.buyAmount;
      const costShown = colonyBulkCost(i, amount);
      const per = TIERS[i].prod * S.tierMults[i] * S.globalMul;
      const progress = (n % S.milestoneEvery) / S.milestoneEvery * 100;

      r.owned.textContent = '×' + fmt(n);
      r.owned.classList.toggle('hot', n > 0);
      if (n === 0) {
        // Nothing owned yet: show what the first one will do, not "+0/s".
        r.prod.classList.add('preview');
        r.prod.innerHTML = `+${fmt(per)}/s <em>each</em>`;
      } else {
        r.prod.classList.remove('preview');
        r.prod.textContent = '+' + fmt(per * n) + '/s';
      }
      const showMult = S.tierMults[i] > 1.001;
      r.mult.classList.toggle('hidden', !showMult);
      if (showMult) r.mult.textContent = '×' + fmt(S.tierMults[i]);
      r.bar.style.width = progress + '%';
      r.ms.textContent = `${n % S.milestoneEvery}/${S.milestoneEvery}`;
      r.cost.textContent = fmt(costShown);
      r.el.title = `${TIERS[i].name} · +${fmt(per)}/s each${amount > 1 ? ` · buying ${fmt(amount)}` : ''}`;

      const afford = G.biomass >= costShown && amount > 0;
      r.el.classList.toggle('affordable', afford);
      r.el.classList.toggle('poor', !afford);
    }
    $('#colonyCount').textContent = fmt(total);
    $('#colonyFoot').innerHTML = `<span>${fmt(total)} colonies</span><span>every ${S.milestoneEvery} owned → ×2 production</span>`;
  }

  /* ── the garden inside the heart ─────────────────────────── */
  // One hypha per colony type, rooted at the core. Each owned colony adds a
  // bead and pushes the thread deeper; milestones thicken it.
  const GARDEN = { sig: null, prev: [] };
  const GARDEN_TINT = ['#c8ffe9', '#cfe6ff', '#ffe2ab'];

  function renderGarden() {
    const el = $('#garden');
    if (!el) return;
    const sig = G.colonies.join(',');
    if (sig === GARDEN.sig) return;
    const prev = GARDEN.prev;
    GARDEN.sig = sig;
    GARDEN.prev = G.colonies.slice();

    const cx = 100, cy = 100;
    const owned = [];
    for (let i = 0; i < TIERS.length; i++) if (G.colonies[i]) owned.push(i);
    let arms = '';

    owned.forEach((ti, k) => {
      const n = G.colonies[ti];
      const tier = TIERS[ti];
      // Owned types share the circle evenly, so the garden is balanced at every stage.
      const ang = (-90 + ((k + 0.5) / owned.length) * 360) * Math.PI / 180;
      const depth = clamp(Math.log10(n + 1) / 3, 0, 1);
      const ms = 1 + Math.floor(n / S.milestoneEvery);
      const r0 = 36;
      const r1 = 64 + depth * 26 + Math.sin(ti * 2.7) * 5;
      const swirl = (ti % 2 ? 1 : -1) * (0.18 + depth * 0.14);
      const x0 = cx + Math.cos(ang) * r0;
      const y0 = cy + Math.sin(ang) * r0;
      const mx = cx + Math.cos(ang + swirl * 0.55) * (r0 + (r1 - r0) * 0.55);
      const my = cy + Math.sin(ang + swirl * 0.55) * (r0 + (r1 - r0) * 0.55);
      const x1 = cx + Math.cos(ang + swirl) * r1;
      const y1 = cy + Math.sin(ang + swirl) * r1;
      const tint = GARDEN_TINT[ti % GARDEN_TINT.length];
      const d = `M${x0.toFixed(1)} ${y0.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;

      const qAt = u => ({
        x: (1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * mx + u * u * x1,
        y: (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * my + u * u * y1,
      });

      // A couple of offshoots once the colony type is deep enough.
      let forks = '';
      if (depth > 0.12) {
        const forkCount = depth > 0.55 ? 2 : 1;
        for (let f = 0; f < forkCount; f++) {
          const origin = qAt(0.42 + f * 0.28);
          const fa = ang + swirl + (f % 2 ? -1 : 1) * (0.75 + depth * 0.35);
          const fl = r1 * (0.18 + depth * 0.08);
          const fx = origin.x + Math.cos(fa) * fl;
          const fy = origin.y + Math.sin(fa) * fl;
          forks += `<path d="M${origin.x.toFixed(1)} ${origin.y.toFixed(1)} Q${(origin.x + Math.cos(fa) * fl * 0.55).toFixed(1)} ${(origin.y + Math.sin(fa) * fl * 0.55).toFixed(1)} ${fx.toFixed(1)} ${fy.toFixed(1)}" fill="none" stroke="${tint}" stroke-width="0.65" stroke-linecap="round" opacity="${(0.3 + depth * 0.35).toFixed(2)}"/>`;
        }
      }

      // Beads: one per power of two of colonies, capped for sanity.
      let beads = '';
      const beadCount = clamp(Math.round((Math.log2(n + 1) - 1) / 1.6), 1, 5) || 1;
      for (let b = 1; b <= beadCount + 1; b++) {
        const u = (b / (beadCount + 1.6)) * 0.94;
        const p = qAt(u);
        beads += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${(1.35 + Math.min(ms, 6) * 0.2).toFixed(2)}" fill="${tint}" stroke="#04170f" stroke-width="0.4" opacity="${(0.6 + b * 0.08).toFixed(2)}"/>`;
      }

      const tip = Math.min(r1 + 5, 96);
      const gx = cx + Math.cos(ang + swirl) * tip;
      const gy = cy + Math.sin(ang + swirl) * tip;
      const fresh = (prev[ti] || 0) < n;
      const w = 1.25 + Math.min(ms, 6) * 0.2;
      // phase the arm's sway from the clock, so a rebuild does not reset it
      const swayDur = 12 + (ti * 37) % 11;
      const swayDelay = -((performance.now() / 1000 + ti * 4.3) % swayDur).toFixed(2);
      arms += `<g class="arm${fresh ? ' fresh' : ''}" style="--arm-dur:${swayDur}s;--arm-delay:${swayDelay}s">
        <path d="${d}" fill="none" stroke="${tint}" stroke-width="${(w * 4.6).toFixed(1)}" stroke-linecap="round" opacity="0.13"/>
        <path d="${d}" fill="none" stroke="#03120c" stroke-width="${(w + 1.1).toFixed(1)}" stroke-linecap="round" opacity="0.22"/>
        <path class="hypha" pathLength="1" d="${d}" fill="none" stroke="${tint}" stroke-width="${w.toFixed(2)}" stroke-linecap="round" opacity="${(0.78 + depth * 0.2).toFixed(2)}"/>
        ${forks}
        ${beads}
        <text x="${gx.toFixed(1)}" y="${gy.toFixed(1)}" font-size="${(8 + depth * 3).toFixed(1)}" fill="${tint}" stroke="#04170f" stroke-width="1.6" paint-order="stroke" opacity="0.92" text-anchor="middle" dominant-baseline="central">${tier.glyph}</text>
      </g>`;
    });

    const rings = colonyTotal() > 0
      ? `<g opacity="0.17">
          <circle cx="100" cy="100" r="45" fill="none" stroke="#bfffe6" stroke-width="0.6" stroke-dasharray="1 5"/>
          <circle cx="100" cy="100" r="72" fill="none" stroke="#bfffe6" stroke-width="0.5" stroke-dasharray="1 7"/>
        </g>`
      : '';

    // The ring of arms orbits the core very slowly. Re-rendering the garden
    // (every colony bought) rebuilds the nodes, so the spin is offset by the
    // time already elapsed — otherwise the branches would snap back to 0°.
    const SPIN_SECONDS = 210;
    const spinOffset = -((performance.now() / 1000) % SPIN_SECONDS).toFixed(2);
    el.innerHTML = rings +
      `<g class="garden-spin" style="animation-delay:${spinOffset}s">` +
        `<g class="garden-sway">${arms}</g>` +
      `</g>`;
  }

  function upgradeVisibleList() {
    const avail = [], locked = [];
    for (const u of UPGRADES) {
      if (G.upgrades[u.id]) continue;
      if (reqMet(u.req)) avail.push(u);
      else locked.push(u);
    }
    avail.sort((a, b) => a.cost - b.cost);
    locked.sort((a, b) => a.cost - b.cost);
    return avail.concat(locked.slice(0, 3).map(u => Object.assign({}, u, { _locked: true })));
  }

  function renderUpgrades(force) {
    const list = upgradeVisibleList();
    const sig = list.map(u => u.id + (u._locked ? 'L' : 'A')).join(',');
    if (!force && sig === R.upSig) return;
    R.upSig = sig;

    const box = $('#upgradeList');
    box.innerHTML = '';
    if (!list.length) {
      box.innerHTML = `<div class="empty" style="grid-column:1/-1">Nothing new wants to grow.<br>Buy colonies to open new paths.</div>`;
      return;
    }
    for (const u of list) {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'up' + (u._locked ? ' locked' : '') + (u.tier != null ? ' tiered' : '');
      el.dataset.id = u.id;
      el.innerHTML = `
        <span class="up-tier">${u.tier != null ? TIERS[u.tier].glyph : ''}</span>
        <span class="up-name">${u._locked ? '???' : u.name}</span>
        <span class="up-desc">${u._locked ? reqText(u.req) : u.desc}</span>
        <span class="up-cost">${u._locked ? 'locked' : `<span class="glyph">⬥</span>${fmt(u.cost)}`}</span>`;
      if (!u._locked) el.addEventListener('click', () => buyUpgrade(u.id));
      box.appendChild(el);
    }
    updateUpgradeAfford();
  }

  function updateUpgradeAfford() {
    $$('#upgradeList .up').forEach(el => {
      const u = UPG_BY_ID[el.dataset.id];
      if (!u || el.classList.contains('locked')) return;
      const afford = G.biomass >= u.cost;
      el.classList.toggle('affordable', afford);
      el.classList.toggle('poor', !afford);
    });
    const avail = UPGRADES.filter(u => !G.upgrades[u.id] && reqMet(u.req)).length;
    $('#upgradeNote').textContent = avail
      ? `${avail} path${avail === 1 ? '' : 's'} still open · growth leaves scars worth keeping`
      : 'no path is open — grow the body to open more';
  }

  function renderMutations(force) {
    const sig = G.mutations.join(',') + '|' + G.pendingDrafts + '|' + G.draftsTaken + '|' + G.draftThresholds.length;
    const dot = $('.tab[data-tab="mutations"] .dot');
    if (dot) dot.classList.toggle('hidden', G.pendingDrafts === 0);
    if (!force && sig === R.mutSig) { updateDraftLine(); return; }
    R.mutSig = sig;

    const box = $('#mutationList');
    let html = `<div class="draft-count"><span id="draftInfo"></span>${G.pendingDrafts > 0 ? '<button class="btn" id="openDraft" style="padding:6px 10px;font-size:10px">Choose</button>' : ''}</div>`;

    if (!G.mutations.length) {
      html += `<div class="empty">No mutations yet.<br>The strain is still clean.</div>`;
    } else {
      html += G.mutations.map(id => {
        const m = MUT_BY_ID[id];
        return `<div class="mut ${RARITY_NAME[m.rarity]}">
          <div class="mut-mark"></div>
          <div>
            <div class="mut-name">${m.name}</div>
            <div class="mut-desc">${mutDesc(id)}</div>
          </div>
          <div class="mut-rarity">${RARITY_NAME[m.rarity]}</div>
        </div>`;
      }).join('');
    }
    box.innerHTML = html;
    const b = $('#openDraft');
    if (b) b.addEventListener('click', () => { if (G.pendingDrafts > 0) maybeShowDraft(); });
    updateDraftLine();
  }

  function updateDraftLine() {
    const el = $('#draftInfo');
    if (!el) return;
    const left = G.draftThresholds.length - G.draftsTaken;
    if (G.pendingDrafts > 0) {
      el.textContent = `${G.pendingDrafts} draft${G.pendingDrafts > 1 ? 's' : ''} waiting`;
    } else if (left > 0) {
      el.textContent = `next draft at ${fmt(G.draftThresholds[G.draftsTaken])} total biomass`;
    } else {
      el.textContent = 'this body is finished changing — fruit to reroll';
    }
  }

  function renderSpores(force) {
    const sig = [G.spores, SPORE_NODES.map(n => treeLvl(n.id)).join('|')].join(':');
    if (!force && sig === R.sporeSig) return;
    R.sporeSig = sig;

    $('#fruitBox').innerHTML = `
      <div class="fruit-head">
        <strong>Fruit</strong>
        <span>${G.fruits} fruiting${G.fruits === 1 ? '' : 's'}</span>
      </div>
      <div class="fruit-bar"><i id="fruitFill" style="width:0%"></i></div>
      <div class="fruit-note" id="fruitNote"></div>
      <button class="fruit-btn" id="fruitBtn">Not yet</button>`;

    const btn = $('#fruitBtn');
    if (btn) btn.addEventListener('click', () => confirmFruit());
    updateFruitValues();

    $('#sporeList').innerHTML = SPORE_NODES.map(n => {
      const lvl = treeLvl(n.id);
      const cost = nodeCost(n);
      const maxed = lvl >= n.max;
      const pips = Array.from({ length: n.max }, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('');
      return `<button class="spore-node" data-node="${n.id}" type="button">
        <span class="spore-name">${n.name}<b>${lvl}/${n.max}</b></span>
        <span class="spore-desc">${n.desc}</span>
        <span class="pips">${pips}</span>
        <span class="spore-cost">${maxed ? 'complete' : `✦ ${fmtWhole(cost)} spore${cost === 1 ? '' : 's'}`}</span>
      </button>`;
    }).join('');

    $$('#sporeList .spore-node').forEach(el => {
      const n = SPORE_NODES.find(x => x.id === el.dataset.node);
      if (treeLvl(n.id) >= n.max) el.classList.add('maxed');
      el.addEventListener('click', () => buyNode(n.id));
    });
    updateSporeAfford();
  }

  function updateFruitValues() {
    const fill = $('#fruitFill');
    if (!fill) return;
    const gainAmt = sporeGain();
    const pct = clamp(G.biomass / FRUIT_MIN * 100, 0, 100);
    fill.style.width = pct + '%';
    const note = $('#fruitNote');
    note.innerHTML = gainAmt
      ? `Release <b style="color:var(--gold)">${fmtWhole(gainAmt)}</b> spore${gainAmt === 1 ? '' : 's'}. The body resets; the strain does not.<br><span style="color:var(--dimmer)">A deeper body always pays more.</span>`
      : `Reach ${fmt(FRUIT_MIN)} biomass to fruit. You have ${fmt(G.biomass)}.`;
    const btn = $('#fruitBtn');
    if (!btn) return;
    btn.disabled = !gainAmt;
    btn.textContent = gainAmt ? `Fruit now · +${fmtWhole(gainAmt)} spores` : 'Not yet';
  }

  function updateSporeAfford() {
    $$('#sporeList .spore-node').forEach(el => {
      const n = SPORE_NODES.find(x => x.id === el.dataset.node);
      if (!n) return;
      const maxed = treeLvl(n.id) >= n.max;
      const afford = !maxed && G.spores >= nodeCost(n);
      el.classList.toggle('affordable', afford);
      el.classList.toggle('poor', !maxed && !afford);
    });
  }

  function renderMutationsAndSpores(force) {
    renderMutations(force);
    renderSpores(force);
  }

  function renderGoals(force) {
    const sig = Object.keys(G.ach).length + ':' + G.fruits;
    if (!force && sig === R.goalSig) return;
    R.goalSig = sig;
    $('#goalList').innerHTML = ACHIEVEMENTS.map(a => {
      const done = !!G.ach[a.id];
      return `<div class="goal ${done ? 'done' : ''}">
        <div class="goal-tick">${done ? '✓' : ''}</div>
        <div class="goal-text">${done ? a.name : '???'}<small>${a.desc}</small></div>
        <div class="goal-bonus">${done ? '+' + Math.round(ACH_BONUS * 100) + '%' : '—'}</div>
      </div>`;
    }).join('');
  }

  function renderStats() {
    const achCount = Object.keys(G.ach).length;
    $('#statsBlock').innerHTML = `
      <span>lifetime biomass</span><b>${fmt(G.totalEver)}</b>
      <span>run biomass</span><b>${fmt(G.runTotal)}</b>
      <span>colonies</span><b>${fmt(colonyTotal())}</b>
      <span>mutations held</span><b>${G.mutations.length}</b>
      <span>upgrades this run</span><b>${upgradesOwned()}</b>
      <span>spores earned</span><b>${fmtWhole(G.sporesEver)}</b>
      <span>best ${'/s'}</span><b>${fmt(G.bestBps)}/s</b>
      <span>time grown</span><b>${timeStr(G.playTime)}</b>
      <span>records</span><b>${achCount}/${ACHIEVEMENTS.length}</b>`;
  }

  function refreshHeader() {
    $('#biomass').textContent = fmt(G.biomass);
    $('#bps').textContent = fmt(S.bps);
    $('#spores').textContent = fmtWhole(G.spores);
    const clickEl = $('#clickPower');
    clickEl.textContent = fmt(S.click);
    clickEl.title = S.clickRatio
      ? `click power × multipliers, plus ${(S.clickRatio * 100).toFixed(0)}% of production/s`
      : 'click power × multipliers — colonies do not add to it';
    $('#stageNote').textContent = S.frenzied
      ? `frenzy · ${S.frenzyLeft.toFixed(0)}s`
      : `${fmt(S.bps)} biomass per second`;
  }

  function refreshTabs() {
    const sporeDot = $('.tab[data-tab="spores"] .dot');
    if (sporeDot) sporeDot.classList.toggle('hidden', !SPORE_NODES.some(n => treeLvl(n.id) < n.max && G.spores >= nodeCost(n)));
  }

  function refreshAll(force) {
    compute();
    refreshHeader();
    renderColoniesIfNeeded();
    renderColonyValues();
    renderGarden();
    renderUpgrades(force);
    renderMutationsAndSpores(force);
    renderGoals(force);
    renderStats();
    refreshTabs();
    updateFrenzyBadge();
    updateAutoBadge();
  }

  let colonySig = '';
  let knownTiers = -1;
  function renderColoniesIfNeeded() {
    const sig = TIERS.map((t, i) => (tierUnlocked(i) ? 1 : 0)).join('');
    if (sig !== colonySig) {
      colonySig = sig;
      renderColonies();
    }
    const count = TIERS.filter((_, i) => tierUnlocked(i)).length;
    if (knownTiers >= 0 && count > knownTiers && G.started) {
      toast(`New colony unlocked — ${TIERS[count - 1].name}`, 'green');
      beep(520, 0.14, 0.045, 'triangle');
    }
    knownTiers = count;
  }

  function updateFrenzyBadge() {
    const b = $('#frenzyBadge');
    if (S.frenzied) {
      b.classList.remove('hidden');
      b.textContent = `×${fmt(G.frenzyMul)} · ${Math.ceil(S.frenzyLeft)}s`;
    } else {
      b.classList.add('hidden');
    }
  }

  function updateAutoBadge() {
    const b = $('#autoBadge');
    b.classList.toggle('hidden', !treeLvl('automation'));
    b.classList.toggle('muted', !G.autoBuy);
    b.textContent = G.autoBuy ? 'auto ✓' : 'auto';
  }

  /* ── modal ───────────────────────────────────────────────── */
  function openModal(html, locked) {
    R.modalOpen = true;
    R.modalLocked = !!locked;
    const root = $('#modalRoot');
    root.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
    root.classList.add('open');
    root.setAttribute('aria-hidden', 'false');
    if (!locked) {
      $$('[data-close]', root).forEach(b => b.addEventListener('click', closeModal));
    }
    const first = $('.btn, .choice', root);
    if (first) setTimeout(() => first.focus({ preventScroll: true }), 60);
  }

  function closeModal() {
    R.modalLocked = false;
    const root = $('#modalRoot');
    root.classList.remove('open');
    root.innerHTML = '';
    root.setAttribute('aria-hidden', 'true');
    R.modalOpen = false;
    setTimeout(() => {
      if (G.pendingDrafts > 0) maybeShowDraft();
    }, 220);
    save();
  }

  function showIntro() {
    openModal(`
      <div class="eyebrow intro-eyebrow">an incremental about the last spore</div>
      <h2 class="intro-title">SPOREFALL</h2>
      <p class="flavor">Something under the ash is still hungry.</p>
      <p>A dead world. A single spore, buried and patient. You are the buried heart of a fungus that has eaten everything else, and now there is only the long work of growing back.</p>
      <div class="intro-rules">
        <div class="rule"><b>FEED</b><span>Touch the heart. Every touch draws biomass out of the dark.</span></div>
        <div class="rule"><b>GROW</b><span>Spend biomass on colonies. They feed you while you are not looking.</span></div>
        <div class="rule"><b>DRIFT</b><span>Golden spores drift past the heart. Catch them for surges and frenzies.</span></div>
        <div class="rule"><b>FRUIT</b><span>When the body is full, release spores. Lose everything. Keep what you learned.</span></div>
      </div>
      <div class="modal-actions"><button class="btn" data-close>Begin</button></div>
      <p style="font-size:10.5px;margin:14px 0 0;color:var(--dimmer);font-family:var(--mono)">progress saves itself · no account, no downloads</p>
    `);
    $('#modalRoot .btn').addEventListener('click', () => {
      G.started = true;
      G.seenIntro = true;
      soundOnGesture();
      syncMusic();
      scheduleDrift();
    });
  }

  function confirmFruit() {
    const gainAmt = sporeGain();
    if (!gainAmt) return;
    const pending = G.pendingDrafts;
    openModal(`
      <div class="eyebrow intro-eyebrow">let go</div>
      <h2>Fruit the body?</h2>
      <p class="flavor">The mycelium will collapse into a cloud of spores. Everything you built in this body — colonies, upgrades, mutations — returns to the soil.</p>
      <div class="modal-grid">
        <div><span>spores released</span><b style="color:var(--gold)">+${fmtWhole(gainAmt)}</b></div>
        <div><span>spores after</span><b style="color:var(--gold)">${fmtWhole(G.spores + gainAmt)}</b></div>
        <div><span>biomass lost</span><b>${fmt(G.biomass)}</b></div>
        <div><span>kept</span><b>spores, records, strain memory</b></div>
      </div>
      ${pending ? `<p style="font-size:11.5px;color:var(--gold)">You have ${pending} unspent mutation draft${pending > 1 ? 's' : ''}. They will be lost.</p>` : ''}
      <div class="modal-actions">
        <button class="btn ghost" data-close>Not yet</button>
        <button class="btn" id="doFruit">Release spores</button>
      </div>
    `);
    $('#doFruit').addEventListener('click', () => { closeModal(); fruit(); });
  }

  function showOffline(elapsed, gained) {
    openModal(`
      <div class="eyebrow intro-eyebrow">the body kept working</div>
      <h2>You were away ${timeStr(elapsed)}.</h2>
      <p class="flavor">The network does not sleep. It only waits for you to notice.</p>
      <div class="modal-grid">
        <div><span>biomass gathered</span><b style="color:var(--green)">+${fmt(gained)}</b></div>
        <div><span>offline efficiency</span><b>${Math.round(S.offline * 100)}%</b></div>
      </div>
      <div class="modal-actions"><button class="btn" data-close>Good</button></div>
    `);
  }

  function showMenu() {
    openModal(`
      <div class="eyebrow intro-eyebrow">the body</div>
      <h2>Options</h2>
      <p class="flavor">Every ending is compost.</p>
      <div class="modal-grid">
        <div><span>save file</span><b>local, this browser</b></div>
        <div><span>sound</span><b>${G.sound ? 'on' : 'off'}</b></div>
        <div><span>music</span><b>${G.sound ? '♪ sporefall — looping' : 'muted'}</b></div>
        <div><span>offline production</span><b>${Math.round(S.offline * 100)}%</b></div>
        <div><span>production now</span><b>${fmt(S.bps)}/s</b></div>
        <div><span>fruits</span><b>${G.fruits}</b></div>
        <div><span>lifetime biomass</span><b>${fmt(G.totalEver)}</b></div>
      </div>
      <div class="modal-actions" style="justify-content:flex-start">
        <button class="btn ghost" id="saveNow">Save now</button>
        <button class="btn ghost" id="exportSave">Export</button>
        <button class="btn ghost" id="importSave">Import</button>
        <button class="btn danger" id="hardReset">Erase everything</button>
      </div>
      <p style="font-size:10.5px;margin-top:14px;color:var(--dimmer)">SPOREFALL — a small game about growing back. Autosaves every 15 seconds · press space to feed.</p>
    `);
    $('#saveNow').addEventListener('click', () => { save(); toast('Saved.'); });
    $('#exportSave').addEventListener('click', exportSave);
    $('#importSave').addEventListener('click', importSave);
    $('#hardReset').addEventListener('click', () => {
      openModal(`
        <div class="eyebrow intro-eyebrow">compost</div>
        <h2>Erase everything?</h2>
        <p>This deletes your spores, your spore tree, and every record. There is no undoing it. The fungus will not remember you.</p>
        <div class="modal-actions">
          <button class="btn ghost" data-close>Keep living</button>
          <button class="btn danger" id="confirmWipe">Erase</button>
        </div>
      `);
      $('#confirmWipe').addEventListener('click', () => {
        localStorage.removeItem(SAVE_KEY);
        G = freshState();
        colonySig = '';
        R.upSig = '';
        R.sporeSig = '';
        R.goalSig = '';
        startRun();
        closeModal();
        refreshAll(true);
        showIntro();
      });
    });
  }

  function exportSave() {
    save();
    openModal(`
      <div class="eyebrow intro-eyebrow">carry the strain</div>
      <h2>Export</h2>
      <p>Copy this and keep it somewhere. Paste it back with Import on any browser.</p>
      <textarea id="saveText" style="width:100%;height:140px;background:#08110d;border:1px solid var(--line);color:var(--dim);border-radius:8px;padding:10px;font-family:var(--mono);font-size:10px;resize:vertical" readonly></textarea>
      <div class="modal-actions">
        <button class="btn ghost" data-close>Close</button>
        <button class="btn" id="copySave">Copy</button>
      </div>
    `);
    $('#saveText').value = btoa(unescape(encodeURIComponent(JSON.stringify(G))));
    $('#copySave').addEventListener('click', () => {
      const ta = $('#saveText');
      ta.select();
      navigator.clipboard?.writeText(ta.value).then(() => toast('Save copied.'), () => toast('Select and copy manually.'));
    });
  }

  function importSave() {
    openModal(`
      <div class="eyebrow intro-eyebrow">carry the strain</div>
      <h2>Import</h2>
      <p>Paste an exported save. This overwrites the current strain.</p>
      <textarea id="loadText" placeholder="paste here" style="width:100%;height:140px;background:#08110d;border:1px solid var(--line);color:var(--text);border-radius:8px;padding:10px;font-family:var(--mono);font-size:10px;resize:vertical"></textarea>
      <div class="modal-actions">
        <button class="btn ghost" data-close>Cancel</button>
        <button class="btn" id="doLoad">Load</button>
      </div>
    `);
    $('#doLoad').addEventListener('click', () => {
      try {
        const raw = JSON.parse(decodeURIComponent(escape(atob($('#loadText').value.trim()))));
        G = Object.assign(freshState(), raw);
        G.colonies = TIERS.map((_, i) => (raw.colonies && raw.colonies[i]) || 0);
        colonySig = '';
        R.upSig = '';
        R.sporeSig = '';
        R.goalSig = '';
        compute();
        closeModal();
        refreshAll(true);
        save();
        toast('Strain restored.');
      } catch (err) {
        toast('That is not a valid save.');
      }
    });
  }

  /* ── toasts ──────────────────────────────────────────────── */
  function toast(msg, kind = '') {
    const t = document.createElement('div');
    t.className = 'toast ' + kind;
    t.textContent = msg;
    $('#toasts').appendChild(t);
    setTimeout(() => t.remove(), 3900);
  }

  /* ── music ───────────────────────────────────────────────── */
  // One looping track under everything. Browsers only allow audio after a
  // gesture, so it starts on the first touch (the intro's Begin button, usually).
  const music = $('#music');
  const MUSIC_VOL = 0.32;
  let musicFade = null;

  function musicFadeTo(target, ms) {
    if (!music) return;
    clearInterval(musicFade);
    const from = music.volume;
    if (Math.abs(from - target) < 0.01) { music.volume = target; return; }
    const t0 = Date.now();
    musicFade = setInterval(() => {
      const k = clamp((Date.now() - t0) / ms, 0, 1);
      music.volume = clamp(from + (target - from) * k, 0, 1);
      if (k >= 1) { clearInterval(musicFade); musicFade = null; }
    }, 50);
  }

  function musicPlay() {
    if (!music || !G.sound) return;
    const wasPaused = music.paused;
    if (wasPaused) {
      music.volume = 0;
      const p = music.play();
      if (p && p.catch) p.catch(() => { /* refused until the next gesture */ });
    }
    musicFadeTo(MUSIC_VOL, wasPaused ? 2000 : 700);
  }

  function musicPause() {
    if (!music) return;
    musicFadeTo(0, 450);
    clearTimeout(R.musicStop);
    R.musicStop = setTimeout(() => { if (music && !G.sound) music.pause(); }, 520);
  }

  function syncMusic() {
    if (!music) return;
    if (G.sound && G.started) {
      clearTimeout(R.musicStop);
      musicPlay();
    } else {
      musicPause();
    }
  }

  /* ── audio ───────────────────────────────────────────────── */
  let AC = null;
  function soundOnGesture() {
    if (!G.sound) return;
    if (!AC) {
      try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; }
    }
    if (AC && AC.state === 'suspended') AC.resume();
  }
  function beep(freq, dur, vol, type = 'sine') {
    if (!G.sound || !AC) return;
    const t0 = AC.currentTime;
    const osc = AC.createOscillator();
    const g = AC.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.72), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(AC.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /* ── save / load ─────────────────────────────────────────── */
  function save() {
    G.lastSave = Date.now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); } catch (e) { /* storage full or blocked */ }
  }

  function load() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { raw = null; }
    if (!raw) return false;
    G = Object.assign(freshState(), raw);
    G.colonies = TIERS.map((_, i) => (raw.colonies && Number(raw.colonies[i])) || 0);
    G.upgrades = raw.upgrades || {};
    G.mutations = Array.isArray(raw.mutations) ? raw.mutations.filter(id => MUT_BY_ID[id]) : [];
    G.tree = raw.tree || {};
    G.ach = raw.ach || {};
    G.draftThresholds = Array.isArray(raw.draftThresholds) && raw.draftThresholds.length
      ? raw.draftThresholds : buildDraftThresholds();
    if (!Array.isArray(G.colonies)) G.colonies = TIERS.map(() => 0);

    // v1 used a quadratic spore curve that could mint hundreds of thousands. The
    // new curve tops out far lower, so old balances are trimmed; purchased tree
    // levels are kept as they are.
    if ((raw.v || 1) < 2) {
      G.v = 2;
      const cap = 30;
      if (G.spores > cap || G.sporesEver > cap) {
        G.spores = Math.min(G.spores, cap);
        G.sporesEver = Math.min(G.sporesEver, cap);
        G.bestSpores = Math.min(G.bestSpores || 0, cap);
        setTimeout(() => toast(`Old spores were rebalanced — ${cap} kept. Your strain memory is untouched.`, 'gold'), 1400);
      }
    }
    compute();
    return true;
  }

  /* ── tick ────────────────────────────────────────────────── */
  let lastT = performance.now();
  let lastFrameWall = Date.now();
  let uiAccum = 0;

  function update(dt) {
    if (!G.started) return;
    G.playTime += dt;

    compute();

    const earned = S.bps * dt;
    if (earned > 0) gain(earned);

    // frenzy expiry
    if (G.frenzyUntil && Date.now() >= G.frenzyUntil) {
      G.frenzyUntil = 0;
      G.frenzyMul = 0;
      compute();
    }

    // auto-buy
    if (G.autoBuy && treeLvl('automation')) {
      R.autoAccum = (R.autoAccum || 0) + dt;
      if (R.autoAccum > 0.35) {
        R.autoAccum = 0;
        let best = -1, bestCost = Infinity;
        for (let i = 0; i < TIERS.length; i++) {
          if (!tierUnlocked(i)) continue;
          const c = colonyCostAt(i, G.colonies[i]);
          if (c <= G.biomass && c < bestCost) { bestCost = c; best = i; }
        }
        if (best >= 0) {
          const saveAmount = G.buyAmount;
          G.buyAmount = 1;
          G.colonies[best] += 1;
          G.biomass -= bestCost;
          G.buyAmount = saveAmount;
          compute();
        }
      }
    }

    // molt mutation
    if (S.autoGain && G.playTime - G.autoGainAt >= S.autoGain.every) {
      G.autoGainAt = G.playTime;
      const amount = S.bps * S.autoGain.seconds;
      if (amount > 0) {
        gain(amount);
        toast(`Molt — +${fmt(amount)} biomass`, 'gold');
      }
    }

    // drifting spores
    if (G.playTime >= R.nextDrift && !R.drift) spawnDrift();
    updateDrift(dt);

    // drafts
    checkDrafts();

    // achievements (cheap check at 2 Hz)
    R.achAccum = (R.achAccum || 0) + dt;
    if (R.achAccum > 0.5) { R.achAccum = 0; maybeAchievements(); }

    // periodic UI
    uiAccum += dt;
    if (uiAccum > 0.1) {
      uiAccum = 0;
      refreshHeader();
      renderColonyValues();
      renderGarden();
      renderUpgrades();
      updateUpgradeAfford();
      updateSporeAfford();
      updateFrenzyBadge();
      if ($('.tab-pane[data-pane="goals"]').classList.contains('active')) renderStats();
      if ($('.tab-pane[data-pane="spores"]').classList.contains('active')) updateFruitValues();
      if ($('.tab-pane[data-pane="mutations"]').classList.contains('active')) updateDraftLine();
      renderGoals();
      refreshTabs();
      rotateWhisper();
    }
  }

  function frame(t) {
    const dt = Math.min((t - lastT) / 1000, 0.5);
    lastT = t;
    lastFrameWall = Date.now();
    update(dt);
    drawBg(t, dt);
    requestAnimationFrame(frame);
  }

  // If the tab stops producing frames (backgrounded, throttled, locked screen),
  // bank the elapsed time so an open game never silently stops growing.
  function watchdog() {
    if (!G.started) return;
    const now = Date.now();
    const away = (now - lastFrameWall) / 1000;
    if (away < 2) return;
    lastFrameWall = now;
    const span = Math.min(away, 8 * 3600);
    const rate = away < 30 ? 1 : S.offline;
    G.playTime += span;
    compute();
    gain(S.bps * span * rate);
    checkDrafts();
    maybeAchievements();
    refreshHeader();
    renderColonyValues();
    renderGarden();
    updateFrenzyBadge();
  }

  /* ── background canvas ───────────────────────────────────── */
  const bg = $('#bg');
  const ctx = bg.getContext('2d');
  let particles = [];
  let dpr = 1;

  function resizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    bg.width = Math.floor(innerWidth * dpr);
    bg.height = Math.floor(innerHeight * dpr);
    bg.style.width = innerWidth + 'px';
    bg.style.height = innerHeight + 'px';
    const count = Math.round(clamp(innerWidth / 26, 20, 58));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      r: rnd(0.6, 2.1),
      vy: rnd(-6, -1.2),
      vx: rnd(-3, 3),
      a: rnd(0.08, 0.42),
      p: Math.random() * 6.28,
      s: rnd(0.4, 1.6),
    }));
  }

  function drawBg(t, dt) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of particles) {
      p.y += p.vy * dt;
      p.x += (p.vx + Math.sin(t * 0.0004 + p.p) * 6) * dt;
      if (p.y < -10) { p.y = innerHeight + 10; p.x = Math.random() * innerWidth; }
      if (p.x < -20) p.x = innerWidth + 20;
      if (p.x > innerWidth + 20) p.x = -20;
      const flicker = 0.65 + 0.35 * Math.sin(t * 0.0012 * p.s + p.p);
      const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 7);
      grd.addColorStop(0, `rgba(147,242,195,${p.a * flicker})`);
      grd.addColorStop(1, 'rgba(147,242,195,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 7, 0, 6.2832);
      ctx.fill();
    }
  }

  /* ── wiring ──────────────────────────────────────────────── */
  function init() {
    const hadSave = load();
    if (!hadSave) startRun();
    if (hadSave) {
      // offline progress
      const elapsed = (Date.now() - (G.lastSave || Date.now())) / 1000;
      if (G.started && elapsed > 60) {
        compute();
        const capped = Math.min(elapsed, 8 * 3600);
        const gained = S.bps * capped * S.offline;
        if (gained > 0) {
          gain(gained);
          setTimeout(() => showOffline(elapsed, gained), 350);
        }
      }
    }

    compute();
    colonySig = '';
    syncBuyModes();
    refreshAll(true);
    resizeCanvas();

    rotateWhisper(true);

    if (!hadSave || !G.seenIntro) {
      showIntro();
    } else {
      scheduleDrift();
      if (G.pendingDrafts > 0) setTimeout(maybeShowDraft, 700);
    }



    // orb
    const orb = $('#orb');
    orb.addEventListener('pointerdown', ev => {
      ev.preventDefault();
      soundOnGesture();
      doClick(ev.clientX, ev.clientY);
    });
    orb.addEventListener('keydown', ev => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        soundOnGesture();
        doClick();
      }
    });

    // space anywhere
    window.addEventListener('keydown', ev => {
      if (ev.code === 'Space' && !R.modalOpen && ev.target === document.body) {
        ev.preventDefault();
        soundOnGesture();
        doClick();
      }
      if (ev.key === 'Escape' && R.modalOpen && !R.modalLocked) closeModal();
    });

    // buy modes
    $('#buyModes').addEventListener('click', ev => {
      const b = ev.target.closest('button');
      if (!b) return;
      $$('#buyModes button').forEach(x => x.classList.toggle('active', x === b));
      const v = b.dataset.amount;
      G.buyAmount = v === 'max' ? 'max' : Number(v);
      renderColonyValues();
      save();
    });

    // tabs
    $('#tabs').addEventListener('click', ev => {
      const b = ev.target.closest('.tab');
      if (!b) return;
      const name = b.dataset.tab;
      $$('.tab').forEach(x => x.classList.toggle('active', x === b));
      $$('.tab-pane').forEach(p => p.classList.toggle('active', p.dataset.pane === name));
      if (name === 'spores') { renderSpores(true); }
      if (name === 'goals') { renderGoals(true); renderStats(); }
      if (name === 'mutations') renderMutations();
      if (name === 'upgrades') renderUpgrades(true);
    });

    $('#menuBtn').addEventListener('click', showMenu);

    $('#soundBtn').addEventListener('click', () => {
      G.sound = !G.sound;
      if (G.sound) soundOnGesture();
      $('#soundBtn').classList.toggle('muted', !G.sound);
      $('#soundBtn').textContent = G.sound ? '♪' : '∅';
      syncMusic();
      toast(G.sound ? 'Sound on.' : 'Sound off.');
      save();
    });
    $('#soundBtn').classList.toggle('muted', !G.sound);
    $('#soundBtn').textContent = G.sound ? '♪' : '∅';

    $('#autoBadge').addEventListener('click', () => {
      if (!treeLvl('automation')) return;
      G.autoBuy = !G.autoBuy;
      updateAutoBadge();
      save();
    });

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('beforeunload', save);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        save();
        if (music && !music.paused) { clearTimeout(R.musicStop); music.pause(); }
      } else {
        lastT = performance.now();
        lastFrameWall = Date.now();
        R.nextDrift = Math.max(R.nextDrift, G.playTime + 5);
        if (G.sound && G.started) musicPlay();
      }
    });

    const tabParam = new URLSearchParams(location.search).get('tab');
    if (tabParam) {
      const t = $(`.tab[data-tab="${tabParam}"]`);
      if (t) t.click();
    }

    // Browsers only allow audio after a gesture; anything the player does counts.
    const firstGesture = () => { soundOnGesture(); syncMusic(); };
    window.addEventListener('pointerdown', firstGesture, { once: true, capture: true });
    window.addEventListener('keydown', firstGesture, { once: true });
    syncMusic();

    setInterval(() => { save(); }, 15000);
    setInterval(watchdog, 1000);
    requestAnimationFrame(frame);
  }

  // dev hooks, only when the page is opened with ?debug
  if (location.search.includes('debug')) {
    window.SF = {
      get G() { return G; },
      get S() { return S; },
      compute, refreshAll, fruit, startRun, save, spawnDrift, collectDrift,
      grant: n => { G.biomass += n; G.runTotal += n; G.totalEver += n; compute(); refreshAll(true); },
    };
    // let the QA harness land on a fruiting moment (?debug&auto=fruit)
    if (new URLSearchParams(location.search).get('auto') === 'fruit') setTimeout(fruit, 700);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
