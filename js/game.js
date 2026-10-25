/* ─────────────────────────────────────────────────────────────
   SPOREFALL — game engine
   ───────────────────────────────────────────────────────────── */
(() => {
    "use strict";

    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
    const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
    const rnd = (a, b) => a + Math.random() * (b - a);
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

    // The grafted-body prototype is opt-in while it is being tested. The game
    // and every older save keep working exactly as before without the flag.
    const GRAFT_PROTO = new URLSearchParams(location.search).has("grafts");

    /* ── icons ───────────────────────────────────────────────── */
    // One sprite: a cell of the sheet, drawn by background-position. The
    // percentages are the cell's share of the 7 steps across the image.
    function icon(id, fallback) {
        const cell = ICON_CELLS[id];
        if (!cell) return fallback || "";
        const i = cell - 1;
        const sx = ((i % ICON_COLS) / (ICON_COLS - 1)) * 100;
        const sy = (Math.floor(i / ICON_COLS) / (ICON_COLS - 1)) * 100;
        return `<i class="spr" style="--sx:${sx.toFixed(4)}%;--sy:${sy.toFixed(4)}%" aria-hidden="true"></i>`;
    }

    // Static markup opts in with <i data-icon="id">, filled once at boot.
    function applyStaticIcons() {
        $$("[data-icon]").forEach((el) => {
            el.innerHTML = icon(el.dataset.icon);
        });
    }

    // Records live on their own sheet, cut by pixel origin because its 5 × 4
    // medallions do not fill the canvas evenly. The offsets are percentages of
    // (sheet − cell), which is exactly what background-position expects once the
    // background is scaled so one cell covers the element.
    function achIcon(id, fallback) {
        const slot = ACH_SLOTS[(ACH_ICON[id] || 0) - 1];
        if (!slot) return fallback || "";
        const span = ACH_SHEET_W - ACH_CELL;
        const sx = ((slot[0] / span) * 100).toFixed(3);
        const sy = ((slot[1] / span) * 100).toFixed(3);
        return `<i class="spr ach" style="--sx:${sx}%;--sy:${sy}%" aria-hidden="true"></i>`;
    }

    /* ── numbers ─────────────────────────────────────────────── */
    const SUFFIX = [
        "",
        "K",
        "M",
        "B",
        "T",
        "Qa",
        "Qi",
        "Sx",
        "Sp",
        "Oc",
        "No",
        "Dc",
        "UDc",
        "DDc",
        "TDc",
        "QaDc",
        "QiDc",
        "SxDc",
        "SpDc",
        "OcDc",
        "NoDc",
        "Vg",
    ];

    function fmt(n) {
        if (!isFinite(n)) return "∞";
        if (n < 0) return "-" + fmt(-n);
        if (n < 1000) {
            if (n === 0) return "0";
            if (n < 10) return String(Math.round(n * 100) / 100);
            if (n < 100) return String(Math.round(n * 10) / 10);
            return String(Math.round(n));
        }
        const tier = Math.floor(Math.log10(n) / 3);
        if (tier >= SUFFIX.length) return n.toExponential(2).replace("e+", "e");
        const scaled = n / Math.pow(1000, tier);
        const body =
            scaled < 10
                ? scaled.toFixed(2)
                : scaled < 100
                  ? scaled.toFixed(1)
                  : Math.round(scaled).toString();
        return body.replace(/\.0+$/, "") + SUFFIX[tier];
    }

    const fmtWhole = (n) => fmt(Math.floor(n));

    const timeStr = (s) => {
        s = Math.max(0, Math.floor(s));
        const h = Math.floor(s / 3600),
            m = Math.floor((s % 3600) / 60),
            sec = s % 60;
        if (h) return `${h}h ${m}m`;
        if (m) return `${m}m ${sec}s`;
        return `${sec}s`;
    };

    // The header clock: hours can grow for a long time, so keep the shape fixed
    // instead of switching units like timeStr does in prose.
    const timerStr = (s) => {
        s = Math.max(0, Math.floor(s));
        const h = Math.floor(s / 3600),
            m = Math.floor((s % 3600) / 60),
            sec = s % 60;
        return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    };

    // How much of the planet's 550 Gt C the body is currently holding.
    function worldCover() {
        return clamp(G.biomass / WORLD_CARBON, 0, 1);
    }

    // One decimal at every scale: the cover percentage is a progress readout,
    // not a measurement, so 0.0% reads better than 1.1e-21%. The epsilon keeps
    // exact halves (0.55%) from rounding down on binary float error.
    function worldPctText(c) {
        const pct = Math.round((c * 100 + 1e-9) * 10) / 10;
        if (pct >= 100) return "100%";
        return pct.toFixed(1) + "%";
    }

    /* ── requirements ────────────────────────────────────────── */
    const UPG_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));
    const MUT_BY_ID = Object.fromEntries(MUTATIONS.map((m) => [m.id, m]));
    const conditionDef = () => WORLD_CONDITION_BY_ID[G.condition] || null;

    // A new body gets one condition, never a repeat of the one it just left.
    // The very first body skips The Hush: a player who closes the game in their
    // first session should not come back to a world that produced nothing.
    function rollWorldCondition(previous, firstBody = false) {
        const pool = WORLD_CONDITIONS.filter(
            (c) => c.id !== previous && (!firstBody || c.id !== "hush"),
        );
        return pick(pool.length ? pool : WORLD_CONDITIONS).id;
    }

    // The short effect line under the world condition's name. The full
    // trade-off lives in the description and the title tooltip.
    function conditionEffectText(c) {
        if (!c || !c.eff) return "";
        const e = c.eff;
        const out = [];
        const pct = (n) => `${n > 0 ? "+" : ""}${Math.round(n * 100)}%`;
        if (e.globalMul) out.push(`production ×${Math.round(e.globalMul * 100) / 100}`);
        if (e.clickMul) out.push(`${pct(e.clickMul - 1)} click`);
        if (e.costMul)
            out.push(
                e.costMul < 1
                    ? `${Math.round((1 - e.costMul) * 100)}% cheaper colonies`
                    : `${Math.round((e.costMul - 1) * 100)}% dearer colonies`,
            );
        if (e.offlineAbs != null)
            out.push(
                e.offlineAbs === 0
                    ? "no offline growth"
                    : `offline ${Math.round(e.offlineAbs * 100)}%`,
            );
        else if (e.offlineAdd) out.push(`${pct(e.offlineAdd)} offline`);
        if (e.driftMul)
            out.push(`drift ×${Math.round(e.driftMul * 100) / 100}`);
        if (e.sporeMul) out.push(`${pct(e.sporeMul - 1)} spores`);
        return out.join(" · ");
    }

    const treeLvl = (id) => G.tree[id] || 0;
    const colonyTotal = () => G.colonies.reduce((a, b) => a + b, 0);
    const colonyTiersOwned = () => G.colonies.filter((n) => n > 0).length;
    const upgradesOwned = () => Object.keys(G.upgrades).length;
    const treeLevels = () => Object.values(G.tree).reduce((a, b) => a + b, 0);

    function reqMet(req) {
        if (!req) return true;
        if (req.clicks != null && G.clicks < req.clicks) return false;
        if (req.colonies != null && colonyTotal() < req.colonies) return false;
        if (req.total != null && G.totalEver < req.total) return false;
        if (req.biomass != null && G.biomass < req.biomass) return false;
        if (req.bps != null && S.bps < req.bps) return false;
        if (req.upgrades != null && upgradesOwned() < req.upgrades)
            return false;
        if (req.mutations != null && G.mutations.length < req.mutations)
            return false;
        if (req.fruits != null && G.fruits < req.fruits) return false;
        if (req.drifts != null && G.drifts < req.drifts) return false;
        if (req.treeLevels != null && treeLevels() < req.treeLevels)
            return false;
        if (req.bestBps != null && G.bestBps < req.bestBps) return false;
        if (req.stage != null && stageIndex() < req.stage) return false;
        if (req.owned && G.colonies[req.owned[0]] < req.owned[1]) return false;
        return true;
    }

    function reqText(req) {
        if (!req) return "";
        if (req.clicks != null) return `click ${fmt(req.clicks)} times`;
        if (req.colonies != null) return `own ${req.colonies} colonies`;
        if (req.total != null) return `produce ${fmt(req.total)} biomass total`;
        if (req.biomass != null) return `reach ${fmt(req.biomass)} biomass`;
        if (req.bps != null) return `reach ${fmt(req.bps)}/s`;
        if (req.upgrades != null) return `buy ${req.upgrades} upgrades`;
        if (req.mutations != null) return `hold ${req.mutations} mutations`;
        if (req.fruits != null) return `fruit ${req.fruits}×`;
        if (req.drifts != null) return `catch ${req.drifts} drifting spores`;
        if (req.treeLevels != null)
            return `grow ${req.treeLevels} spore levels`;
        if (req.bestBps != null) return `reach ${fmt(req.bestBps)}/s once`;
        if (req.stage != null) {
            const name = STAGES[req.stage].short;
            return name.startsWith("The ")
                ? `reach ${name}`
                : `reach the ${name} stage`;
        }
        if (req.owned) return `own ${req.owned[1]} ${TIERS[req.owned[0]].name}`;
        return "";
    }

    // How close a locked requirement is, 0–1. Counts are linear; the things that
    // span orders of magnitude (biomass, production) are counted in orders of
    // magnitude, so the bar actually moves during a long run.
    function reqProgress(req) {
        if (!req) return 1;
        const lin = (v, t) => clamp(t > 0 ? v / t : 1, 0, 1);
        const log = (v, t) =>
            clamp(Math.log10(Math.max(v, 1)) / Math.log10(t), 0, 1);
        const f = [];
        if (req.clicks != null) f.push(lin(G.clicks, req.clicks));
        if (req.colonies != null) f.push(lin(colonyTotal(), req.colonies));
        if (req.total != null) f.push(log(G.totalEver, req.total));
        if (req.biomass != null) f.push(log(G.biomass, req.biomass));
        if (req.bps != null) f.push(log(S.bps, req.bps));
        if (req.upgrades != null) f.push(lin(upgradesOwned(), req.upgrades));
        if (req.mutations != null)
            f.push(lin(G.mutations.length, req.mutations));
        if (req.fruits != null) f.push(lin(G.fruits, req.fruits));
        if (req.drifts != null) f.push(lin(G.drifts, req.drifts));
        if (req.treeLevels != null) f.push(lin(treeLevels(), req.treeLevels));
        if (req.bestBps != null) f.push(log(G.bestBps, req.bestBps));
        if (req.stage != null) f.push(lin(stageIndex(), req.stage));
        if (req.owned) f.push(lin(G.colonies[req.owned[0]], req.owned[1]));
        return f.length ? Math.min(...f) : 1;
    }

    /* ── state ───────────────────────────────────────────────── */
    const SAVE_KEY = "sporefall.save.v1";

    // The tutorial keeps its own record so adding a lesson never needs a save
    // migration: ids not present in ONBOARDING_STEPS are simply dropped.
    function freshOnboarding() {
        return { v: 1, done: [], skipped: false };
    }

    function freshState() {
        return {
            v: 4,
            biomass: 0,
            runTotal: 0,
            runTime: 0,
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
            graftSites: { heart: null, nerve: null, root: null },
            focusTier: null,
            // World memory: the current body's condition, the permanent archive
            // of dead bodies, and the scars they left around the heart.
            condition: null,
            archive: [],
            scars: [],
            scarTotal: 0,
            driftTray: [],
            driftPlots: Array(DRIFT_PLOTS).fill(null),
            driftSeq: 0,
            driftPlants: 0,
            driftMerges: 0,
            driftHarvests: 0,
            blightUntil: 0,
            draftsTaken: 0,
            pendingDrafts: 0,
            draftHand: null,
            draftThresholds: DRAFT_AT.slice(),
            spores: 0,
            sporesEver: 0,
            tree: {},
            ach: {},
            autoBuy: false,
            boughtColony: false,
            buyAmount: 1,
            sound: true,
            seenIntro: false,
            onboarding: freshOnboarding(),
            started: false,
            lastSave: Date.now(),
            frenzyUntil: 0,
            frenzyMul: 0,
            autoGainAt: 0,
            stage: 0,
            stageTime: 0,
            promptedStage: -1,
            won: 0,
        };
    }

    let G = freshState();
    const S = {};
    const R = {
        modalOpen: false,
        coachStepId: null,
        coachEntered: new Set(),
        coachTarget: null,
        coachAccum: 0,
        coachReview: false,
        drift: null,
        nextDrift: 0,
        upSig: "",
        sporeSig: "",
        goalSig: "",
        mutSig: "",
        ecoSig: "",
        biomeStage: null,
        lastTap: 0,
        mergePick: [],
        gardenSig: "",
        gardenAccum: 0,
        scarSig: "",
        conditionSig: "",
        archiveSig: "",
        dockSig: "",
    };

    // Touch screens pay more for every shadowed spark than a desktop does. The
    // effects budget below is smaller there, and the CSS drops the orb filter.
    const FX = { light: false };
    function syncFxMode() {
        FX.light =
            window.matchMedia("(pointer: coarse)").matches || innerWidth < 720;
    }

    /* ── derived stats ───────────────────────────────────────── */
    function compute() {
        let globalMul = 1,
            clickMul = 1,
            costMul = 1;
        let clickRatio = CLICK_RATIO_BASE;
        let offline = OFFLINE_RATE_BASE;
        let milestoneEvery = MILESTONE_EVERY;
        let driftMul = 1,
            sporeMul = 1;
        let perTier = 0,
            perMutation = 0,
            perColony = 0;
        let autoGain = null;
        let draftCards = 3;

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
            if (e.perOwned)
                globalMul *= 1 + e.perOwned.amt * G.colonies[e.perOwned.tier];
            if (e.perColony) globalMul *= 1 + e.perColony * colonyTotal();
        }

        // mutations
        for (const m of G.mutations) {
            const def = MUT_BY_ID[m];
            if (!def) continue;
            const e = def.eff;
            if (e.id === "focus" || def.id === "focus") {
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

        // grafts: the site supplies the effect, so the same graft can be a
        // production organ, a click organ, or an economy organ.
        if (GRAFT_PROTO) {
            for (const site of GRAFT_SITES) {
                const def = GRAFT_BY_ID[G.graftSites[site.id]];
                if (!def) continue;
                const e = def.sites[site.id];
                if (!e) continue;
                if (e.globalMul) globalMul *= e.globalMul;
                if (e.clickMul) clickMul *= e.clickMul;
                if (e.costMul) costMul *= e.costMul;
                if (e.offlineAdd) offline += e.offlineAdd;
                if (e.draftCards) draftCards += e.draftCards;
                if (e.sporeMul) sporeMul *= e.sporeMul;
            }
        }

        // milestones
        for (let i = 0; i < TIERS.length; i++) {
            tierMults[i] *= Math.pow(
                2,
                Math.floor(G.colonies[i] / milestoneEvery),
            );
        }

        // dynamic colony-count / mutation-count bonuses
        if (perTier) globalMul *= 1 + perTier * colonyTiersOwned();
        if (perMutation) globalMul *= 1 + perMutation * G.mutations.length;
        if (perColony) globalMul *= 1 + perColony * colonyTotal();

        // strain ecology. The three niches are fed by colony diversity, the
        // mutations that share them and the graft placed in the matching site.
        // The multipliers are applied per tier, so the colony list shows exactly
        // what a niche is adding to each type.
        const ecoNiches = {};
        for (const n of ECO.niches)
            ecoNiches[n.id] = {
                ...n,
                pop: 0,
                kinds: 0,
                strains: 0,
                graft: 0,
                mult: 1,
            };
        for (const id of G.mutations) {
            const def = MUT_BY_ID[id];
            if (def && def.niche && ecoNiches[def.niche])
                ecoNiches[def.niche].strains++;
        }
        for (let i = 0; i < TIERS.length; i++) {
            const niche = ecoNiches[ECO.tier[i]];
            if (!niche || !G.colonies[i]) continue;
            niche.pop += G.colonies[i];
            niche.kinds++;
        }
        for (const n of ECO.niches) {
            const e = ecoNiches[n.id];
            if (e.kinds > 1)
                e.mult *= 1 + ECO.diversity * (e.kinds - 1);
            if (e.strains > 1)
                e.mult *=
                    1 +
                    ECO.strainStep * Math.min(ECO.strainCap, e.strains - 1);
            if (GRAFT_PROTO && G.graftSites[n.id]) {
                const graft = GRAFT_BY_ID[G.graftSites[n.id]];
                if (graft) {
                    e.graft =
                        ECO.graft +
                        ECO.graftStrain *
                            Math.min(ECO.graftStrainCap, e.strains);
                    e.mult *= 1 + e.graft;
                }
            }
        }
        const ecoLinks = [];
        for (const link of ECO.links) {
            if (
                !G.mutations.includes(link.a) ||
                !G.mutations.includes(link.b)
            )
                continue;
            const niche = ecoNiches[link.niche];
            if (!niche) continue;
            niche.mult *= link.mult;
            ecoLinks.push(link);
        }
        const web = ECO.niches.every((n) => ecoNiches[n.id].pop > 0);
        if (web) globalMul *= 1 + ECO.web;
        for (let i = 0; i < TIERS.length; i++) {
            const niche = ecoNiches[ECO.tier[i]];
            if (niche) tierMults[i] *= niche.mult;
        }
        S.ecology = {
            niches: ECO.niches.map((n) => ({ ...ecoNiches[n.id] })),
            links: ecoLinks,
            web,
            webBonus: web ? ECO.web : 0,
        };

        // achievements
        const achCount = Object.keys(G.ach).length;
        globalMul *= 1 + ACH_BONUS * achCount;

        // evolution: a bigger world feeds a bigger body
        const stage = STAGES[stageIndex()];
        globalMul *= stage.mult;
        clickMul *= stage.click;

        // the world condition this body woke under
        const cond = conditionDef();
        if (cond && cond.eff) {
            const e = cond.eff;
            if (e.globalMul) globalMul *= e.globalMul;
            if (e.clickMul) clickMul *= e.clickMul;
            if (e.costMul) costMul *= e.costMul;
            if (e.offlineAdd) offline += e.offlineAdd;
            if (e.offlineAbs != null) offline = e.offlineAbs;
            if (e.driftMul) driftMul *= e.driftMul;
            if (e.sporeMul) sporeMul *= e.sporeMul;
        }

        // frenzy
        const now = Date.now();
        const frenzied = now < G.frenzyUntil;
        if (frenzied) globalMul *= G.frenzyMul;

        // a failed splice leaves the body blighted for a short while
        const blighted = now < (G.blightUntil || 0);
        if (blighted) globalMul *= 0.85;

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
        // The base is multiplied by click upgrades; the production share is added
        // once, never multiplied again. Compounding both made a late-game click
        // worth dozens of seconds of production.
        S.click = clickMul + S.bps * clickRatio;
        S.costMul = costMul;
        S.offline = clamp(offline, 0, 1);
        S.milestoneEvery = milestoneEvery;
        S.driftMul = driftMul;
        S.sporeMul = sporeMul;
        S.draftCards = draftCards;
        S.autoGain = autoGain;
        S.stageMul = stage.mult;
        S.frenzied = frenzied;
        S.frenzyLeft = Math.max(0, (G.frenzyUntil - now) / 1000);
        S.blighted = blighted;
        S.blightLeft = Math.max(0, ((G.blightUntil || 0) - now) / 1000);

        if (S.bps > G.bestBps) G.bestBps = S.bps;
    }

    /* ── economy ─────────────────────────────────────────────── */
    function colonyCostAt(i, owned) {
        return TIERS[i].cost * S.costMul * Math.pow(COST_GROWTH, owned);
    }
    function colonyBulkCost(i, n) {
        const base = colonyCostAt(i, G.colonies[i]);
        return (base * (Math.pow(COST_GROWTH, n) - 1)) / (COST_GROWTH - 1);
    }
    function colonyMaxAffordable(i) {
        const base = colonyCostAt(i, G.colonies[i]);
        if (G.biomass < base) return 0;
        const x = 1 + (G.biomass * (COST_GROWTH - 1)) / base;
        return Math.max(0, Math.floor(Math.log(x) / Math.log(COST_GROWTH)));
    }
    function desiredAmount(i) {
        if (G.buyAmount === "max") return Math.min(colonyMaxAffordable(i), 1e6);
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
        // Automation is allowed to start only after the player has made a colony
        // purchase in this body; fruiting clears it again.
        G.boughtColony = true;
        const before = Math.floor((G.colonies[i] - n) / S.milestoneEvery);
        const after = Math.floor(G.colonies[i] / S.milestoneEvery);
        compute();
        if (after > before)
            toast(
                `${TIERS[i].name} milestone — ×${Math.pow(2, after)} production`,
            );
        beep(190 + i * 22, 0.05, 0.05);

        // Show what the purchase actually bought you (once at a time, so mass-buying stays readable).
        const delta = S.bps - beforeBps;
        if (delta > 1e-9 && Date.now() - (R.bpsFloatAt || 0) > 420) {
            R.bpsFloatAt = Date.now();
            const p = stagePoint();
            floatText(`+${fmt(delta)}/s`, p.x + rnd(-26, 26), p.y + 78, "prod");
        }
        refreshAll();
    }

    function buyUpgrade(id) {
        const u = UPG_BY_ID[id];
        if (
            !u ||
            G.upgrades[id] ||
            (u.stage || 0) > stageIndex() ||
            !reqMet(u.req)
        )
            return;
        if (G.biomass < u.cost) return;
        G.biomass -= u.cost;
        G.upgrades[id] = 1;
        compute();
        beep(420, 0.08, 0.04);
        toast(`Upgrade — ${u.name}`, "green");
        refreshAll(true);
    }

    /* ── spore tree ──────────────────────────────────────────── */
    function nodeCost(node) {
        const lvl = treeLvl(node.id);
        return Math.ceil(node.cost * Math.pow(node.grow, lvl));
    }

    function buyNode(id) {
        const node = SPORE_NODES.find((n) => n.id === id);
        if (!node) return;
        const lvl = treeLvl(id);
        if (lvl >= node.max) return;
        const cost = nodeCost(node);
        if (G.spores < cost) return;
        G.spores -= cost;
        G.tree[id] = lvl + 1;
        if (id === "recollection") {
            /* applies next run */
        }
        if (id === "automation") G.autoBuy = true;
        compute();
        beep(620, 0.12, 0.05);
        toast(
            id === "automation"
                ? G.boughtColony
                    ? "Auto-buy on — up to 10% of biomass per tick goes to the best-value colony"
                    : "Auto-buy ready — it starts after your first colony purchase"
                : `${node.name} — level ${lvl + 1}`,
            id === "automation" ? "green" : "gold",
        );
        refreshAll(true);
        save();
    }

    /* ── fruiting (prestige) ─────────────────────────────────── */
    // Spores are a slow, bounded currency: a first fruiting is worth a handful,
    // and every ~10× of depth adds about a quarter of the current payout.
    function sporeGain() {
        if (G.biomass < FRUIT_MIN) return 0;
        const raw =
            SPORE_BASE *
            Math.pow(G.biomass / FRUIT_MIN, SPORE_EXP) *
            S.sporeMul;
        return Math.max(1, Math.floor(raw));
    }

    // The world keeps a record of every body that fruits. The archive is the
    // written memory; the scar field is the visible one. Both survive the reset.
    function archiveBody() {
        if (!Array.isArray(G.archive)) G.archive = [];
        if (!Array.isArray(G.scars)) G.scars = [];
        const counts = { root: 0, heart: 0, nerve: 0 };
        for (let i = 0; i < TIERS.length; i++) {
            if (G.colonies[i] && counts[ECO.tier[i]] != null)
                counts[ECO.tier[i]] += G.colonies[i];
        }
        let dominant = null;
        for (const niche of ECO.niches)
            if (counts[niche.id] && (!dominant || counts[niche.id] > counts[dominant]))
                dominant = niche.id;
        const entry = {
            body: G.fruits + 1,
            stage: stageIndex(),
            biomass: G.biomass,
            time: G.runTime,
            condition: G.condition || null,
            colonies: colonyTotal(),
            mutations: G.mutations.length,
            // The names, not just the count: an archived body should still be
            // readable after its mutations are wiped from the living strain.
            mutationIds: G.mutations.slice(),
            graftSites: GRAFT_SITES.reduce((sites, site) => {
                const id = G.graftSites[site.id];
                sites[site.id] = GRAFT_BY_ID[id] ? id : null;
                return sites;
            }, {}),
            graftsRecorded: true,
            dominant,
            at: Date.now(),
        };
        G.archive.unshift(entry);
        if (G.archive.length > WORLD_ARCHIVE_MAX)
            G.archive.length = WORLD_ARCHIVE_MAX;
        G.scars.push({
            body: entry.body,
            stage: entry.stage,
            condition: entry.condition,
            at: entry.at,
        });
        if (G.scars.length > WORLD_SCAR_MAX) G.scars.shift();
        G.scarTotal = (G.scarTotal || 0) + 1;
    }

    function fruit() {
        const gainAmt = sporeGain();
        if (!gainAmt) return;
        archiveBody();
        G.spores += gainAmt;
        G.sporesEver += gainAmt;
        G.fruits++;
        startRun();
        releaseBurst(gainAmt);
        toast(`Fruited — ${fmtWhole(gainAmt)} spores released`, "gold");
        beep(140, 0.5, 0.06, "sine");
        save();
        refreshAll(true);
        if (G.fruits === 1) {
            setTimeout(
                () =>
                    openModal(`
        <div class="eyebrow intro-eyebrow">the first fall</div>
        <h2>The body dies. The strain remains.</h2>
        <p class="flavor">You have done this before, and will do it again. Somewhere under the ash, a spore remembers the shape of the last world.</p>
        <p>Spores buy permanent growth in the <b style="color:var(--gold)">Spores</b> tab. Everything else is wiped: <b>all biomass</b>, colonies, upgrades, this run's strain, and the stage itself. The next body begins as a spore with only what the spore tree grants it.</p>
        <p class="flavor">The world remembers. This body is written into the archive, leaves a scar around the heart, and the next one wakes under a new condition.</p>
        <div class="modal-actions"><button class="btn" data-close>Begin again</button></div>
      `),
                3200,
            );
        }
    }

    function startRun() {
        // The rebirth boundary. Everything a body owns — biomass, run totals, the
        // stage, colonies, upgrades, mutations, drafts, frenzy, the molt timer and
        // a live drift — is reset here. Everything the strain owns — spores, the
        // spore tree, records, lifetime totals, clicks, play time, the world
        // archive and its scars — is deliberately kept.
        const previousCondition = G.condition;
        const announceCondition = !!(G.started && previousCondition);
        G.condition = rollWorldCondition(previousCondition, !G.fruits);
        G.biomass = 0;
        G.runTotal = 0;
        G.runTime = 0;
        // Fruiting is a new body, so the cluster starts as a spore again and has
        // to climb back through the stages. Lifetime totals keep the climb short
        // for a late-game body, but the stage itself is part of the run.
        G.stage = 0;
        G.stageTime = 0;
        G.promptedStage = -1;
        G.colonies = TIERS.map(() => 0);
        // Persistence starts from the spore tree, never from the old body.
        G.colonies[0] = NODE_EFF.recollection.start * treeLvl("recollection");
        G.colonies[1] = NODE_EFF.momentum.start * treeLvl("momentum");
        G.boughtColony = false;
        G.upgrades = {};
        G.mutations = [];
        G.graftSites = { heart: null, nerve: null, root: null };
        G.focusTier = null;
        G.draftsTaken = 0;
        G.pendingDrafts = 0;
        G.draftHand = null;
        G.frenzyUntil = 0;
        G.frenzyMul = 0;
        G.autoGainAt = G.playTime;
        G.draftThresholds = buildDraftThresholds();
        // The drift garden belongs to the body. Catch, plant and merge again.
        G.driftTray = [];
        G.driftPlots = Array(DRIFT_PLOTS).fill(null);
        G.blightUntil = 0;
        // A new body is never a review, even if one was open when it fell.
        R.coachReview = false;
        R.mergePick = [];
        R.gardenSig = "";
        GARDEN.prev = [];
        GARDEN.sig = null;
        if (R.drift) {
            R.drift.el.remove();
            R.drift = null;
        }
        R.nextDrift = 0;
        R.autoAccum = 0;
        R.draftHand = null;
        R.graftSig = null;

        // second bloom: a free mutation at the start of each run
        if (treeLvl("second")) {
            const pool = MUTATIONS.filter((m) => !G.mutations.includes(m.id));
            if (pool.length) applyMutation(pick(pool).id, true);
        }
        compute();
        if (G.started) scheduleDrift();
        if (announceCondition && G.condition) {
            const cond = WORLD_CONDITION_BY_ID[G.condition];
            setTimeout(
                () =>
                    toast(
                        `The world turns — ${cond.name} · ${conditionEffectText(cond)}`,
                        "gold",
                    ),
                900,
            );
        }
    }

    function buildDraftThresholds() {
        const arr = DRAFT_AT.slice();
        let last = arr[arr.length - 1];
        for (let i = 0; i < treeLvl("draft"); i++) {
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
            const reachable = TIERS.map((_, i) => i).filter((i) =>
                tierUnlocked(i),
            );
            G.focusTier = reachable.length ? pick(reachable) : 0;
        }
        if (def.eff.instantLoss) {
            G.biomass *= 1 - def.eff.instantLoss;
        }
        compute();
        if (!silent) toast(`Mutation — ${def.name}`, "mut");
        refreshAll(true);
    }

    function mutDesc(m) {
        const def = MUT_BY_ID[m];
        if (!def) return "";
        if (def.id === "focus" && G.focusTier != null) {
            return `Colonies of one type — ${TIERS[G.focusTier].name} — are 6× as effective. Chosen by the body, not by you.`;
        }
        return def.desc;
    }

    const RARITY_NAME = { 1: "common", 2: "uncommon", 3: "rare" };

    function draftOptions(count = 3) {
        const pool = MUTATIONS.filter((m) => !G.mutations.includes(m.id));
        const out = [];
        let bag = pool.slice();
        while (out.length < count && bag.length) {
            const weights = bag.map((m) =>
                m.rarity === 1 ? 60 : m.rarity === 2 ? 28 : 12,
            );
            let roll = Math.random() * weights.reduce((a, b) => a + b, 0);
            let idx = 0;
            for (; idx < bag.length; idx++) {
                roll -= weights[idx];
                if (roll <= 0) break;
            }
            const chosen = bag[Math.min(idx, bag.length - 1)];
            out.push(chosen);
            bag = bag.filter((m) => m.id !== chosen.id);
        }
        return out;
    }

    function checkDrafts() {
        if (R.modalOpen) return;
        const idx = G.draftsTaken + G.pendingDrafts;
        if (idx >= G.draftThresholds.length) return;
        if (G.runTotal < G.draftThresholds[idx]) return;
        G.pendingDrafts++;
        // Persist the pending draft immediately: a refresh between the threshold
        // and the modal opening must not lose it.
        save();
        setTimeout(maybeShowDraft, 350);
    }

    function graftedIds() {
        return GRAFT_SITES.map((s) => G.graftSites[s.id]).filter(Boolean);
    }

    function emptyGraftSites() {
        return GRAFT_SITES.filter((s) => !G.graftSites[s.id]);
    }

    function graftEffectText(effect) {
        if (!effect) return "";
        const out = [];
        if (effect.globalMul)
            out.push(`+${Math.round((effect.globalMul - 1) * 100)}% production`);
        if (effect.clickMul)
            out.push(`+${Math.round((effect.clickMul - 1) * 100)}% base click`);
        if (effect.costMul)
            out.push(
                `${Math.round((1 - effect.costMul) * 100)}% cheaper colonies`,
            );
        if (effect.offlineAdd)
            out.push(`+${Math.round(effect.offlineAdd * 100)}% offline rate`);
        if (effect.draftCards)
            out.push(
                `+${effect.draftCards} mutation card${effect.draftCards === 1 ? "" : "s"} per draft`,
            );
        if (effect.sporeMul)
            out.push(
                `+${Math.round((effect.sporeMul - 1) * 100)}% spores on fruit`,
            );
        return out.join(" · ");
    }

    function graftChoiceCard(graft) {
        return `<button class="choice graft" data-graft="${graft.id}">
        <span class="choice-kind">graft · the body changes</span>
        <span class="choice-name">${graft.glyph} ${graft.name}</span>
        <span class="choice-desc">${graft.desc} ${graft.hint}</span>
        <span class="choice-pick">choose a site</span>
      </button>`;
    }

    function chooseMutation(id) {
        applyMutation(id);
        G.pendingDrafts = Math.max(0, G.pendingDrafts - 1);
        G.draftsTaken++;
        G.draftHand = null;
        R.draftHand = null;
        save();
        closeModal();
    }

    function chooseGraft(siteId) {
        const hand = R.draftHand;
        const graft = hand && hand.graft;
        if (!graft || !emptyGraftSites().some((s) => s.id === siteId)) return;
        G.graftSites[siteId] = graft.id;
        G.pendingDrafts = Math.max(0, G.pendingDrafts - 1);
        G.draftsTaken++;
        G.draftHand = null;
        R.draftHand = null;
        save();
        const site = GRAFT_SITE_BY_ID[siteId];
        toast(
            `Grafted ${graft.name} into the ${site.name} — ${graftEffectText(graft.sites[siteId])}`,
            "gold",
        );
        beep(520, 0.12, 0.05, "triangle");
        refreshAll(true);
        closeModal();
    }

    function showDraftStep() {
        const hand = R.draftHand;
        if (!hand) return;
        const cards =
            hand.mutations
                .map(
                    (m) => `
      <button class="choice ${RARITY_NAME[m.rarity]}" data-mut="${m.id}">
        <span class="choice-kind">${RARITY_NAME[m.rarity]} ${m.niche} mutation</span>
        <span class="choice-name">${m.name}</span>
        <span class="choice-desc">${m.desc}</span>
        <span class="choice-pick">take it</span>
      </button>`,
                )
                .join("") + (hand.graft ? graftChoiceCard(hand.graft) : "");

        openModal(
            `
      <div class="eyebrow intro-eyebrow">the strain shifts</div>
      <h2>Something in you changes.</h2>
      <p class="flavor">The mycelium has learned a new way to be hungry. Choose carefully — this body will not forget.</p>
      <div class="choices">${cards}</div>
      <p style="font-size:11px;margin:0;color:var(--dimmer)">Draft ${G.draftsTaken + 1} of ${G.draftThresholds.length} this run.</p>
    `,
            true,
        );

        $$(".choice", $("#modalRoot")).forEach((el) =>
            el.addEventListener("click", () => {
                if (el.dataset.graft) showGraftStep(hand.graft);
                else if (el.dataset.mut) chooseMutation(el.dataset.mut);
            }),
        );
    }

    function showGraftStep(graft) {
        if (!graft) return;
        const cards = GRAFT_SITES.map((site) => {
            const occupant = G.graftSites[site.id];
            const taken = !!occupant;
            return `<button class="choice graft-site-choice ${taken ? "taken" : ""}" data-site="${site.id}" ${taken ? "disabled" : ""}>
        <span class="choice-kind">${site.name} · ${site.note}</span>
        <span class="choice-name">${taken ? `occupied by ${GRAFT_BY_ID[occupant].name}` : graft.name}</span>
        <span class="choice-desc">${taken ? "This site is already part of the body." : `${graftEffectText(graft.sites[site.id])} · feeds the ${site.name} niche`}</span>
        <span class="choice-pick">${taken ? "taken" : "graft here"}</span>
      </button>`;
        }).join("");

        openModal(
            `
      <div class="eyebrow intro-eyebrow">where does it go</div>
      <h2>Graft the ${graft.name}.</h2>
      <p class="flavor">${graft.desc} ${graft.hint}</p>
      <div class="choices">${cards}</div>
      <div class="modal-actions"><button class="btn ghost" id="graftBack">Back</button></div>
      <p style="font-size:11px;margin:0;color:var(--dimmer)">The site is locked for this body. Fruiting wipes it.</p>
    `,
            true,
        );

        $$(".graft-site-choice", $("#modalRoot")).forEach((el) => {
            if (el.disabled) return;
            el.addEventListener("click", () => chooseGraft(el.dataset.site));
        });
        $("#graftBack").addEventListener("click", showDraftStep);
    }

    // A draft hand is fixed the moment it is shown. Only ids are stored, so a
    // refresh reopens the same cards instead of rolling a new set. Taking a card
    // (or starting a new body) clears it; then the next pending draft draws fresh.
    function drawDraftHand() {
        const opts = draftOptions(S.draftCards || 3);
        if (!opts.length) return null;
        const used = graftedIds();
        const pool = GRAFT_PROTO
            ? GRAFTS.filter((g) => !used.includes(g.id))
            : [];
        return {
            mutations: opts.map((m) => m.id),
            graft:
                pool.length && emptyGraftSites().length ? pick(pool).id : null,
        };
    }

    function hydrateDraftHand(hand) {
        if (!hand || typeof hand !== "object") return null;
        const ids = Array.isArray(hand.mutations) ? hand.mutations : [];
        const seen = new Set();
        const mutations = [];
        for (const id of ids) {
            const mut = MUT_BY_ID[id];
            if (!mut || seen.has(id) || G.mutations.includes(id)) continue;
            seen.add(id);
            mutations.push(mut);
        }
        const graftId = hand.graft;
        const graft =
            GRAFT_PROTO &&
            GRAFT_BY_ID[graftId] &&
            !graftedIds().includes(graftId) &&
            emptyGraftSites().length
                ? GRAFT_BY_ID[graftId]
                : null;
        return mutations.length || graft ? { mutations, graft } : null;
    }

    function maybeShowDraft() {
        if (R.modalOpen || G.pendingDrafts <= 0) return;
        if (!R.draftHand) {
            let hand = hydrateDraftHand(G.draftHand);
            if (!hand) {
                G.draftHand = drawDraftHand();
                hand = hydrateDraftHand(G.draftHand);
            }
            if (!hand) {
                G.pendingDrafts = 0;
                G.draftHand = null;
                save();
                return;
            }
            R.draftHand = hand;
            // Persist before opening the modal: a refresh must reopen this hand.
            save();
        }
        showDraftStep();
    }

    /* ── drifting spores ─────────────────────────────────────── */
    // The 56px art, its halo and the expanding ring reach about 50px from the
    // centre; leave another 12px so the spore never sits on a phone screen edge.
    const DRIFT_PAD = 62;
    const DRIFT_ART = {
        teal: "assets/icons/spore_teal.webp",
        gold: "assets/icons/spore_yellow.webp",
    };

    function scheduleDrift() {
        // Cadence is fixed: drift bonuses buy richer harvests, not a faster
        // supply of them, so a drift build cannot multiply its own income twice.
        const interval = rnd(42, 78);
        R.nextDrift = G.playTime + interval;
    }

    function spawnDrift() {
        if (R.drift || !G.started) return;
        const layer = $("#driftLayer");
        const w = layer.clientWidth || 320,
            h = layer.clientHeight || 320;
        const kind = Math.random() < 0.5 ? "teal" : "gold";
        const el = document.createElement("button");
        el.className = "drift " + kind;
        el.type = "button";
        el.setAttribute(
            "aria-label",
            `Catch the ${DRIFT_SPECIES[kind].name}`,
        );
        const art = document.createElement("img");
        art.className = "drift-art";
        art.src = DRIFT_ART[kind];
        art.alt = "";
        art.draggable = false;
        art.decoding = "async";
        el.appendChild(art);
        layer.appendChild(el);

        // Spawn inside the field, not against its border. The old edge start
        // meant a slow mote spent its whole life near one wall. The inset keeps
        // the mote and its ring clear of the stage frame while leaving room to
        // wander in every direction.
        const pad = DRIFT_PAD;
        const xInset = Math.min(pad + 18, w * 0.32);
        const yInset = Math.min(pad + 12, h * 0.28);
        const xMin = xInset;
        const xMax = Math.max(xMin, w - xInset);
        const yMin = yInset;
        const yMax = Math.max(yMin, h - yInset);
        const angle = Math.random() * Math.PI * 2;
        const speed = rnd(12, 20);
        const d = {
            el,
            kind,
            x: rnd(xMin, xMax),
            y: rnd(yMin, yMax),
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed * 0.6,
            life: 14,
            t: 0,
            phase: Math.random() * 6.28,
        };
        // Position with left/top rather than translate: the CSS driftPulse
        // animation owns transform, and it would overwrite an inline translate.
        el.style.left = d.x + "px";
        el.style.top = d.y + "px";
        el.addEventListener("pointerdown", (ev) => {
            ev.stopPropagation();
            collectDrift(d);
        });
        R.drift = d;
    }

    function collectDrift(d) {
        if (!R.drift || R.drift !== d) return;
        R.drift = null;
        d.el.remove();
        driftBurst(d.x, d.y, d.kind);
        G.drifts++;
        beep(880, 0.12, 0.04, "triangle");

        const sp = DRIFT_SPECIES[d.kind] || DRIFT_SPECIES.teal;
        if (G.driftTray.length < DRIFT_TRAY_MAX) {
            G.driftTray.push({ id: ++G.driftSeq, species: sp.id });
            toast(`Caught ${sp.name} — plant or merge it in Strain`, "gold");
            beep(1180, 0.16, 0.03, "triangle");
        } else {
            // A full tray turns the catch into a small meal instead of silently
            // wasting the drift. The real value is still in planting and merging.
            const amount = Math.max(S.bps * 6 * S.driftMul, S.click * 4, 20);
            gain(amount);
            const pt = stagePoint();
            floatText(`+${fmt(amount)}`, pt.x, pt.y, "gold");
            toast(
                `The drift garden is full — ${sp.name} eaten for ${fmt(amount)} biomass`,
                "gold",
            );
        }
        compute();
        scheduleDrift();
        save();
        refreshAll(true);
    }

    /* ── drift ecology ──────────────────────────────────────── */
    // The tray holds four caught spores. A plot grows one at a time; when it
    // ripens it must be harvested before its short window closes, or it spoils.
    // Merging clears two tray slots and produces a hybrid with a better harvest.
    const mergeKey = (a, b) => [a, b].sort().join("+");
    const plotState = (p) => {
        if (!p) return "empty";
        const now = Date.now();
        if (now < p.readyAt) return "growing";
        if (now < p.spoilAt) return "ripe";
        return "spoiled";
    };

    // One yield formula for the harvest button and the ripe-plot preview. The
    // floor keeps the first few catches useful before the body has production.
    const driftYield = (sp) =>
        Math.max(S.bps * sp.harvest * S.driftMul, S.click * 20, 24);

    const shortLeft = (ms) => {
        const s = Math.max(0, Math.ceil(ms / 1000));
        return s >= 60
            ? `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`
            : `${s}s`;
    };

    // `slot` is the plot the player clicked. Without one (console/debug), fall
    // back to the first empty plot; the UI always names its target.
    function plantDrift(id, slot) {
        const idx = G.driftTray.findIndex((s) => s.id === Number(id));
        if (idx < 0) return;
        const target = Number.isInteger(slot) ? slot : -1;
        if (target >= 0 && target < G.driftPlots.length) {
            if (G.driftPlots[target]) {
                toast(
                    `Plot ${target + 1} is already taken — choose an empty one.`,
                    "mut",
                );
                return;
            }
            slot = target;
        } else {
            if (target >= G.driftPlots.length) return;
            slot = G.driftPlots.findIndex((p) => !p);
            if (slot < 0) {
                toast(
                    "All three plots are full — harvest or merge first.",
                    "mut",
                );
                return;
            }
        }
        const sp = DRIFT_SPECIES[G.driftTray[idx].species];
        G.driftTray.splice(idx, 1);
        const now = Date.now();
        G.driftPlots[slot] = {
            id: ++G.driftSeq,
            species: sp.id,
            plantedAt: now,
            readyAt: now + sp.grow,
            spoilAt: now + sp.grow + sp.ripe,
        };
        G.driftPlants++;
        R.mergePick = R.mergePick.filter((x) => x !== Number(id));
        toast(`Planted ${sp.name} in plot ${slot + 1}`, "green");
        beep(520, 0.14, 0.035, "sine");
        save();
        refreshAll(true);
    }

    function harvestPlot(i) {
        const p = G.driftPlots[i];
        if (!p) return;
        const state = plotState(p);
        if (state === "growing") return;
        const sp = DRIFT_SPECIES[p.species];
        if (state === "spoiled") {
            G.driftPlots[i] = null;
            toast(`${sp.name} was left too long and spoiled.`, "mut");
            save();
            refreshAll(true);
            return;
        }
        const amount = driftYield(sp);
        G.driftPlots[i] = null;
        G.driftHarvests++;
        gain(amount);
        const pt = stagePoint();
        floatText(`+${fmt(amount)}`, pt.x, pt.y, "gold");
        toast(`Harvested ${sp.name} — ${fmt(amount)} biomass`, "gold");
        beep(760, 0.2, 0.04, "triangle");
        if (sp.frenzyChance && Math.random() < sp.frenzyChance) {
            G.frenzyUntil = Date.now() + sp.frenzySec * 1000;
            G.frenzyMul = sp.frenzyMul;
            toast(
                `The splice sings — production ×${sp.frenzyMul} for ${sp.frenzySec}s`,
                "gold",
            );
            beep(1180, 0.3, 0.04, "triangle");
        }
        compute();
        save();
        refreshAll(true);
    }

    function mergePicks() {
        return R.mergePick
            .map((id) => G.driftTray.find((s) => s.id === id))
            .filter(Boolean);
    }

    function doMerge() {
        const picks = mergePicks();
        if (picks.length !== 2) return;
        const [a, b] = picks;
        const rule = DRIFT_MERGE[mergeKey(a.species, b.species)];
        if (!rule) {
            toast("Those two hybrids cannot be merged again.", "mut");
            return;
        }
        const A = DRIFT_SPECIES[a.species];
        const B = DRIFT_SPECIES[b.species];
        G.driftTray = G.driftTray.filter(
            (s) => s.id !== a.id && s.id !== b.id,
        );
        R.mergePick = [];
        if (rule.chance < 1 && Math.random() > rule.chance) {
            G.blightUntil = Date.now() + 20000;
            toast(
                `The splice fails — ${A.name} and ${B.name} are lost. The body is blighted for 20s.`,
                "mut",
            );
            beep(90, 0.42, 0.05, "sawtooth");
        } else {
            const out = DRIFT_SPECIES[rule.out];
            G.driftTray.push({ id: ++G.driftSeq, species: out.id });
            G.driftMerges++;
            toast(
                `Merged into ${out.name} — plant it before the body fruits.`,
                "gold",
            );
            beep(990, 0.25, 0.04, "triangle");
        }
        compute();
        save();
        refreshAll(true);
    }

    function toggleMergePick(id) {
        id = Number(id);
        const idx = R.mergePick.indexOf(id);
        if (idx >= 0) R.mergePick.splice(idx, 1);
        else {
            R.mergePick.push(id);
            if (R.mergePick.length > 2) R.mergePick.shift();
        }
        renderDriftEco(true);
    }

    function updateGarden(quiet) {
        let changed = false;
        G.driftPlots = G.driftPlots.map((p, i) => {
            if (!p) return null;
            if (Date.now() < p.spoilAt) return p;
            const sp = DRIFT_SPECIES[p.species];
            if (!quiet)
                toast(
                    `${sp ? sp.name : "A spore"} spoiled in plot ${i + 1}`,
                    "mut",
                );
            changed = true;
            return null;
        });
        if (changed) {
            save();
            refreshAll(true);
        }
    }

    // A caught drift breaks where it was caught, not at the heart: a flash, two
    // rings and a spray of tinted sparks. The lite mode and reduced-motion
    // setting keep the flash but drop most of the moving parts.
    function driftBurst(x, y, kind = "gold") {
        const layer = $("#floatLayer");
        if (!layer) return;
        const tint = kind === "teal" ? "teal" : "gold";
        const calm = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;
        trimFx(layer, FX.light ? 30 : 90);

        const flash = document.createElement("span");
        flash.className = "drift-burst " + tint;
        flash.style.left = x + "px";
        flash.style.top = y + "px";
        layer.appendChild(flash);
        setTimeout(() => flash.remove(), 720);
        if (calm) return;

        const rings = FX.light ? 1 : 2;
        for (let i = 0; i < rings; i++) {
            const ring = document.createElement("span");
            ring.className = "drift-burst-ring " + tint;
            ring.style.left = x + "px";
            ring.style.top = y + "px";
            ring.style.animationDelay = i * 80 + "ms";
            layer.appendChild(ring);
            setTimeout(() => ring.remove(), 900 + i * 80);
        }

        const sparks = FX.light ? 6 : 13;
        for (let i = 0; i < sparks; i++) {
            const spark = document.createElement("i");
            const angle =
                (Math.PI * 2 * i) / sparks + rnd(-0.18, 0.18);
            const dist = rnd(FX.light ? 24 : 32, FX.light ? 46 : 68);
            spark.className = "drift-spark " + tint;
            spark.style.left = x + "px";
            spark.style.top = y + "px";
            spark.style.setProperty(
                "--dx",
                (Math.cos(angle) * dist).toFixed(1) + "px",
            );
            spark.style.setProperty(
                "--dy",
                (Math.sin(angle) * dist).toFixed(1) + "px",
            );
            spark.style.setProperty("--sz", rnd(2.4, 4.2).toFixed(1) + "px");
            spark.style.setProperty(
                "--dur",
                Math.round(rnd(420, 690)) + "ms",
            );
            layer.appendChild(spark);
            setTimeout(() => spark.remove(), 880);
        }
    }

    const stagePoint = () => {
        const r = $("#stage").getBoundingClientRect();
        return { x: r.width * 0.5, y: r.height * 0.52, rect: r };
    };

    function updateDrift(dt) {
        const d = R.drift;
        if (!d) return;
        d.t += dt;
        d.life -= dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt + Math.sin(d.t * 1.7 + d.phase) * 9 * dt;
        const layer = $("#driftLayer");
        const w = layer.clientWidth || 320,
            h = layer.clientHeight || 320;
        // Bounce off the padded walls instead of pinning the mote to one edge.
        // Setting the sign explicitly also stops a spore that spawns close to a
        // wall from oscillating there for its whole life.
        if (d.x < DRIFT_PAD) {
            d.x = DRIFT_PAD;
            d.vx = Math.abs(d.vx);
        } else if (d.x > w - DRIFT_PAD) {
            d.x = w - DRIFT_PAD;
            d.vx = -Math.abs(d.vx);
        }
        if (d.y < DRIFT_PAD) {
            d.y = DRIFT_PAD;
            d.vy = Math.abs(d.vy);
        } else if (d.y > h - DRIFT_PAD) {
            d.y = h - DRIFT_PAD;
            d.vy = -Math.abs(d.vy);
        }
        d.el.style.left = d.x + "px";
        d.el.style.top = d.y + "px";
        d.el.style.opacity =
            d.life < 2.5 ? String(clamp(d.life / 2.5, 0, 1)) : "1";
        if (d.life <= 0) {
            d.el.remove();
            R.drift = null;
            scheduleDrift();
        }
    }

    function driftSporeArt(sp) {
        const tint = sp.id === "splice" || sp.id === "chorus" ? sp.id : "";
        return `<img class="drift-mini ${tint}" src="${sp.art}" alt="" aria-hidden="true" draggable="false" />`;
    }

    function renderDriftEco(force) {
        const el = $("#driftEco");
        if (!el) return;
        const now = Date.now();
        const picked = mergePicks();
        const ripe = G.driftPlots.filter((p) => plotState(p) === "ripe").length;
        const sig = [
            G.driftTray.map((s) => `${s.id}:${s.species}`).join(","),
            G.driftPlots
                .map((p) =>
                    p
                        ? `${p.id}:${p.species}:${plotState(p)}:${Math.ceil((p.readyAt - now) / 1000)}:${Math.ceil((p.spoilAt - now) / 1000)}`
                        : "-",
                )
                .join(","),
            R.mergePick.join(","),
            ripe,
            S.blighted ? 1 : 0,
        ].join("|");
        if (!force && sig === R.gardenSig) return;
        R.gardenSig = sig;

        const slots = Array.from({ length: DRIFT_TRAY_MAX }, (_, i) => {
            const item = G.driftTray[i];
            if (!item)
                return `<span class="tray-spore empty" aria-hidden="true">·</span>`;
            const sp = DRIFT_SPECIES[item.species];
            const on = R.mergePick.includes(item.id);
            return `<button class="tray-spore ${sp.tone} ${on ? "picked" : ""}" type="button" data-tray="${item.id}" aria-label="${sp.name}: plant or merge" title="${sp.name} — ${sp.desc}">
        ${driftSporeArt(sp)}
        <b>${sp.glyph}</b>
        ${on ? '<i class="tray-pick">✓</i>' : ""}
      </button>`;
        }).join("");

        const openPlot = G.driftPlots.some((p) => !p);
        let mergeText = "Select a caught spore, then click an empty plot to plant it.";
        if (picked.length === 1) {
            const name = DRIFT_SPECIES[picked[0].species].name;
            mergeText = openPlot
                ? `${name} selected — click an empty plot to plant it, or pick one more to merge.`
                : `${name} selected — all three plots are full. Pick one more to merge.`;
        } else if (picked.length === 2) {
            const rule = DRIFT_MERGE[mergeKey(picked[0].species, picked[1].species)];
            if (rule) {
                const out = DRIFT_SPECIES[rule.out];
                mergeText = `Merge into ${out.name}${rule.chance < 1 ? ` · ${Math.round(rule.chance * 100)}% success` : " · always works"}.`;
            } else {
                mergeText = "Those two hybrids cannot be merged again.";
            }
        }
        const mergeRule =
            picked.length === 2
                ? DRIFT_MERGE[mergeKey(picked[0].species, picked[1].species)]
                : null;

        const plots = G.driftPlots
            .map((p, i) => {
                const label = `plot ${i + 1}`;
                if (!p)
                    return `<button class="drift-plot empty" type="button" data-empty-plot="${i}" title="An empty plot. Select one caught spore, then click here to plant it.">
        <span class="plot-kicker">${label}</span>
        <b class="plot-name">empty</b>
        <span class="plot-state">${picked.length === 1 ? "plant selected" : "plant a spore"}</span>
        <i class="plot-bar"><b style="width:0%"></b></i>
      </button>`;
                const sp = DRIFT_SPECIES[p.species];
                const state = plotState(p);
                const growth = clamp(
                    (now - p.plantedAt) / Math.max(1, p.readyAt - p.plantedAt),
                    0,
                    1,
                );
                const remaining = clamp(
                    (p.spoilAt - now) / Math.max(1, p.spoilAt - p.readyAt),
                    0,
                    1,
                );
                const yieldAmt = driftYield(sp);
                const stateText =
                    state === "growing"
                        ? `grows · ${shortLeft(p.readyAt - now)}`
                        : state === "ripe"
                          ? `harvest +${fmt(yieldAmt)} · ${shortLeft(p.spoilAt - now)} left`
                          : "spoiled";
                return `<button class="drift-plot ${state} ${sp.tone}" type="button" data-plot="${i}" ${state === "growing" ? "disabled" : ""} title="${sp.name} — ${sp.desc}${state === "ripe" ? " Harvest it before the window closes." : ""}">
        <span class="plot-kicker">${label}</span>
        <span class="plot-art">${driftSporeArt(sp)}</span>
        <b class="plot-name">${sp.name}</b>
        <span class="plot-state">${stateText}</span>
        <i class="plot-bar"><b style="width:${((state === "growing" ? growth : remaining) * 100).toFixed(0)}%"></b></i>
      </button>`;
            })
            .join("");

        el.innerHTML = `
      <div class="drift-eco-head">
        <span>the drift garden</span>
        <b>${G.driftTray.length}/${DRIFT_TRAY_MAX} caught${ripe ? ` · ${ripe} ripe` : ""}</b>
      </div>
      <div class="drift-tray">${slots}</div>
      <div class="drift-merge">
        <span>${mergeText}</span>
        <span class="drift-actions">
          <button class="btn" id="mergeDrift" type="button" ${mergeRule ? "" : "disabled"}>Merge</button>
        </span>
      </div>
      <div class="drift-plots">${plots}</div>
      <p class="drift-note">Planting is safe until it ripens; then the window is short. Two of a kind merge cleanly. Teal + gold can fail, losing both and blighting the body for 20s.</p>`;

        $$("#driftEco [data-tray]").forEach((b) =>
            b.addEventListener("click", () => toggleMergePick(b.dataset.tray)),
        );
        const mergeBtn = $("#mergeDrift");
        if (mergeBtn) mergeBtn.addEventListener("click", doMerge);
        $$("#driftEco [data-plot]").forEach((b) =>
            b.addEventListener("click", () => harvestPlot(Number(b.dataset.plot))),
        );
        $$("#driftEco [data-empty-plot]").forEach((b) =>
            b.addEventListener("click", () => {
                if (picked.length === 1)
                    plantDrift(picked[0].id, Number(b.dataset.emptyPlot));
                else toast("Select one caught spore first.", "mut");
            }),
        );
        updateStrainDot();
    }

    function updateStrainDot() {
        const dot = $('.tab[data-tab="mutations"] .dot');
        if (!dot) return;
        const alert =
            G.pendingDrafts > 0 ||
            G.driftTray.length > 0 ||
            G.driftPlots.some((p) => p && plotState(p) === "ripe");
        dot.classList.toggle("hidden", !alert);
    }

    function renderDriftDock(force) {
        const el = $("#driftDock");
        if (!el) return;
        const show =
            G.driftTray.length > 0 || G.driftPlots.some((p) => !!p);
        if (!show) {
            el.classList.add("hidden");
            R.dockSig = "";
            return;
        }
        const now = Date.now();
        const ripe = G.driftPlots.filter((p) => plotState(p) === "ripe").length;
        const sig = [
            G.driftTray.map((s) => `${s.id}:${s.species}`).join(","),
            G.driftPlots
                .map((p) => (p ? `${p.species}:${plotState(p)}` : "-"))
                .join(","),
            ripe,
        ].join("|");
        if (!force && sig === R.dockSig) return;
        R.dockSig = sig;
        el.classList.remove("hidden");
        const shown = G.driftTray.length
            ? G.driftTray.slice(0, DRIFT_TRAY_MAX).map((s) => s.species)
            : G.driftPlots.filter(Boolean).map((p) => p.species);
        const slots = Array.from({ length: DRIFT_TRAY_MAX }, (_, i) => {
            const species = shown[i];
            if (!species) return '<i class="dock-empty"></i>';
            const sp = DRIFT_SPECIES[species];
            return `<span class="dock-spore ${sp.tone}" title="${sp.name}">${driftSporeArt(sp)}</span>`;
        }).join("");
        $("#driftDockSlots").innerHTML = slots;
        const growing = G.driftPlots.filter(
            (p) => p && plotState(p) === "growing",
        ).length;
        $("#driftDockCta").textContent = ripe
            ? `${ripe} ripe →`
            : G.driftTray.length
              ? "plant / merge →"
              : growing
                ? `${growing} growing →`
                : "open →";
        el.title = `${G.driftTray.length} caught · ${G.driftPlots.filter(Boolean).length} planted · ${ripe} ripe. Open the Strain tab.`;
    }

    /* ── whispers ────────────────────────────────────────────── */
    const WHISPERS = [
        "The dark is not empty. It is only quiet.",
        "Somewhere above, a bird falls and never lands.",
        "You remember being a forest.",
        "The rot is warm. It was something, once.",
        "A thread finds a thread. They do not speak.",
        "The ash tastes of the sea.",
        "There is no sun. You grow toward the memory of one.",
        "Something is still breathing under the water.",
        "The wind carries spores that are not yours.",
        "Every stone here used to be a lung.",
        "The silence has a texture. You are learning it.",
        "You have done this before. The scars say so.",
    ];
    const WHISPERS_LATE = [
        "The ground is no longer ground. It is you.",
        "The horizon is a membrane, and it is thinning.",
        "Something answers when the threads move.",
        "You are eating the world politely, in small bites.",
    ];
    const WHISPERS_AFTER = [
        "The old body is compost now. You are still here.",
        "This is the third time this world has ended.",
        "The spores remember more than you do.",
    ];

    let whisperAt = 0;

    function rotateWhisper(force) {
        if (!force && G.playTime < whisperAt) return;
        whisperAt = G.playTime + rnd(20, 32);
        let pool = WHISPERS;
        if (G.fruits > 0) pool = pool.concat(WHISPERS_AFTER);
        if (colonyTotal() > 150) pool = pool.concat(WHISPERS_LATE);
        const el = $("#whisper");
        const line = pick(pool);
        if (el.textContent === line) return;
        el.classList.remove("show");
        setTimeout(() => {
            el.textContent = line;
            el.classList.add("show");
        }, 450);
    }

    /* ── clicking ────────────────────────────────────────────── */
    function doClick(x, y) {
        if (R.modalOpen && !G.started) return;
        R.lastTap = performance.now();
        compute();
        const amount = S.click;
        gain(amount);
        G.clicks++;

        const rect = $("#stage").getBoundingClientRect();
        const px = x != null ? x - rect.left : rect.width / 2 + rnd(-30, 30);
        const py = y != null ? y - rect.top : rect.height * 0.46 + rnd(-20, 20);

        // The heart answers louder the more it produces. Fast tapping is capped:
        // the number always floats, but the heavy rings and sparks only fire a few
        // times a second on touch screens, which is what used to tear the layer.
        const power = clamp(
            Math.log10(1 + Math.max(S.bps, amount)) / 11.5,
            0,
            1,
        );
        if (fxBudget()) clickFx(px, py, power);
        floatText(`+${fmt(amount)}`, px, py, "", power);

        const orb = $("#orb");
        orb.classList.add("pressed");
        setTimeout(() => orb.classList.remove("pressed"), 90);

        beep(150 + Math.random() * 40, 0.045, 0.028, "triangle");
        if (power > 0.5)
            beep(66 + power * 40, 0.13, 0.025 + power * 0.035, "sine");
        refreshHeader();
        checkProgress();
        maybeAchievements();
    }

    // Keep the overlay from growing without bound when a finger hammers the
    // heart faster than the old effects can retire.
    function trimFx(layer, max) {
        while (layer.childElementCount > max) layer.firstElementChild.remove();
    }

    // At most a handful of full impacts per second on a phone, more on desktop.
    function fxBudget() {
        const now = performance.now();
        const max = FX.light ? 6 : 14;
        R.fxStamps = (R.fxStamps || []).filter((t) => now - t < 1000);
        if (R.fxStamps.length >= max) return false;
        R.fxStamps.push(now);
        return true;
    }

    function floatText(text, x, y, kind = "", power = 0) {
        const el = document.createElement("span");
        el.className = "float-num " + kind;
        el.textContent = text;
        el.style.left = x + "px";
        el.style.top = y + "px";
        el.style.fontSize = (13 + power * 12).toFixed(1) + "px";
        const layer = $("#floatLayer");
        trimFx(layer, FX.light ? 18 : 44);
        layer.appendChild(el);
        setTimeout(() => el.remove(), 1100);
    }

    // Click feedback scales with production: one quiet ring early, a shockwave
    // throwing sparks once the network is huge.
    function clickFx(px, py, power) {
        const layer = $("#floatLayer");
        $("#stage").style.setProperty("--hit", power.toFixed(3));
        trimFx(layer, FX.light ? 30 : 90);

        const flare = document.createElement("span");
        flare.className = "click-flare";
        flare.style.left = px + "px";
        flare.style.top = py + "px";
        flare.style.setProperty(
            "--f",
            ((FX.light ? 60 : 70) + power * (FX.light ? 120 : 250)).toFixed(0) +
                "px",
        );
        layer.appendChild(flare);
        setTimeout(() => flare.remove(), 620);

        const rings = FX.light ? 1 : 1 + Math.round(power * 2);
        for (let r = 0; r < rings; r++) {
            const el = document.createElement("span");
            el.className = "shock";
            el.style.left = px + "px";
            el.style.top = py + "px";
            el.style.setProperty(
                "--s",
                (
                    (FX.light ? 2.4 : 3.2) +
                    power * (FX.light ? 4.5 : 11) +
                    r * 1.4
                ).toFixed(2),
            );
            el.style.animationDelay = r * 60 + "ms";
            el.style.borderWidth =
                (1 + power * (FX.light ? 0.9 : 1.6)).toFixed(2) + "px";
            layer.appendChild(el);
            setTimeout(() => el.remove(), 1000 + r * 70);
        }

        const sparks = FX.light
            ? Math.round(2 + power * 6)
            : Math.round(3 + power * 20);
        for (let i = 0; i < sparks; i++) {
            const el = document.createElement("i");
            const a = Math.random() * Math.PI * 2;
            const dist =
                (FX.light ? 40 : 55) +
                power * (FX.light ? 90 : 200) * rnd(0.35, 1);
            el.className = "spark" + (Math.random() < 0.28 ? " gold" : "");
            el.style.left = px + "px";
            el.style.top = py + "px";
            el.style.setProperty(
                "--dx",
                (Math.cos(a) * dist).toFixed(1) + "px",
            );
            el.style.setProperty(
                "--dy",
                (Math.sin(a) * dist).toFixed(1) + "px",
            );
            el.style.setProperty(
                "--dur",
                Math.round(380 + Math.random() * 440) + "ms",
            );
            el.style.setProperty(
                "--sz",
                (1.8 + Math.random() * 2.6 + power * 2.4).toFixed(1) + "px",
            );
            layer.appendChild(el);
            setTimeout(() => el.remove(), 950);
        }

        const orb = $("#orb");
        orb.classList.add("hit");
        clearTimeout(R.hitTimer);
        R.hitTimer = setTimeout(() => orb.classList.remove("hit"), 190);
    }

    // The fruiting itself: a cloud of spores leaving the body.
    function releaseBurst(spores) {
        const orbEl = $(".orb");
        const r = orbEl ? orbEl.getBoundingClientRect() : null;
        const cx = r ? r.left + r.width / 2 : innerWidth / 2;
        const cy = r ? r.top + r.height / 2 : innerHeight / 2;
        const calm = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;

        const layer = document.createElement("div");
        layer.className = "release-layer";

        let html = `<div class="release-flash" style="--cx:${cx}px;--cy:${cy}px"></div>`;
        html += `<div class="release-word">sporefall</div>`;
        html += `<div class="release-gain">+${fmtWhole(spores)} spore${spores === 1 ? "" : "s"} released</div>`;

        const count = calm ? 0 : 120;
        for (let i = 0; i < count; i++) {
            const a = Math.random() * Math.PI * 2;
            const dist = rnd(40, 260);
            const dx = Math.cos(a) * dist;
            const dy = Math.sin(a) * dist * 0.72 - rnd(30, 170);
            html += `<i class="release-spore${Math.random() < 0.32 ? " gold" : ""}" style="left:${(cx + rnd(-18, 18)).toFixed(0)}px;top:${(cy + rnd(-18, 18)).toFixed(0)}px;--dx:${dx.toFixed(0)}px;--dy:${dy.toFixed(0)}px;--sz:${rnd(3, 9).toFixed(1)}px;--dur:${Math.round(rnd(2400, 4200))}ms;--delay:${Math.round(rnd(0, 520))}ms"></i>`;
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
                recordPopup(a);
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

    /* ── evolution ───────────────────────────────────────────── */
    // Five stages. The cluster evolves when the player says so: the Evolve
    // button appears once the stage's requirements are met, and nothing moves
    // until it is pressed. A stage survives until the body fruits; a new body
    // always begins at the spore stage (see startRun).
    const stageIndex = () =>
        clamp(Math.floor(Number(G.stage)) || 0, 0, STAGES.length - 1);
    const stageDef = () => STAGES[stageIndex()];

    function stageReady(st = stageDef()) {
        if (!st || !st.req) return false;
        const r = st.req;
        if (r.total != null && G.totalEver < r.total) return false;
        if (r.fruits != null && G.fruits < r.fruits) return false;
        return true;
    }

    function stageProgress(st = stageDef()) {
        if (!st || !st.req) return 1;
        const r = st.req,
            fracs = [];
        // lifetime biomass spans orders of magnitude, so the bar counts orders of
        // magnitude too — a linear bar would sit at zero for the whole stage.
        if (r.total != null)
            fracs.push(
                clamp(
                    Math.log10(Math.max(G.totalEver, 1)) / Math.log10(r.total),
                    0,
                    1,
                ),
            );
        if (r.fruits != null) fracs.push(clamp(G.fruits / r.fruits, 0, 1));
        return fracs.length ? Math.min(...fracs) : 1;
    }

    function stageReqText(st = stageDef()) {
        if (!st || !st.req) return st ? st.sub : "";
        const r = st.req,
            bits = [];
        if (r.total != null && G.totalEver < r.total)
            bits.push(`${fmt(G.totalEver)}/${fmt(r.total)} biomass`);
        if (r.fruits != null && G.fruits < r.fruits)
            bits.push(`${G.fruits}/${r.fruits} fruited`);
        // Only what is still missing — a met requirement is noise in a 9px line.
        return bits.length ? bits.join(" · ") : "ready to evolve";
    }

    // Phones get a smaller, lighter cut of the stage art. The <source> uses
    // this same breakpoint so the browser and the preloader agree on the file.
    const PHONE_ART_MQ = "(max-width: 600px)";
    const phoneArt = (src) => (src ? src.replace(/\.webp$/, "-phone.webp") : "");
    const stageArtUrl = (src) =>
        src && window.matchMedia(PHONE_ART_MQ).matches ? phoneArt(src) : src;

    // Keeping the <source> in sync with the breakpoint also handles rotating
    // or resizing after the stage has already been painted.
    function syncStageArtSources() {
        const st = stageDef(),
            phone = window.matchMedia(PHONE_ART_MQ).matches,
            backSource = $("#stageBackdropSource"),
            heartSource = $("#orbHeartSource");
        if (backSource)
            backSource.srcset = phone ? phoneArt(st.backdrop || "") : "";
        if (heartSource)
            heartSource.srcset = phone ? phoneArt(st.heart || "") : "";
    }

    function applyStageLook() {
        const idx = stageIndex(),
            st = STAGES[idx];
        document.body.dataset.stage = String(idx);
        const brand = $("#brandSub");
        if (brand) brand.textContent = st.brand;
        const eyebrow = $("#colonyEyebrow");
        if (eyebrow) eyebrow.textContent = st.eyebrow;
        const glyph = $("#stageGlyph");
        if (glyph) glyph.innerHTML = icon("stage-" + st.id, st.glyph);
        const name = $("#stageChipName");
        if (name) name.textContent = st.short;
        const pips = $("#stagePips");
        if (pips)
            pips.innerHTML = STAGES.map(
                (_, i) => `<i class="${i <= idx ? "on" : ""}"></i>`,
            ).join("");

        // Every stage sits inside a drawn ring of its world. The image fades
        // out if a stage has no backdrop, leaving the procedural body and its
        // own background untouched.
        syncStageArtSources();
        const back = $("#stageBackdrop");
        if (back) {
            const src = st.backdrop || "";
            if (src) {
                if (back.getAttribute("src") !== src) back.src = src;
                back.classList.add("on");
            } else {
                back.classList.remove("on");
            }
        }

        // Every stage has a drawn heart. Swapping the image is enough — the
        // class fades it in over the procedural orb.
        const orb = $(".orb"),
            heart = $("#orbHeart");
        if (orb && heart) {
            const src = st.heart || "";
            orb.classList.toggle("has-heart", !!src);
            if (src && heart.getAttribute("src") !== src) heart.src = src;
            heart.alt = src ? `${st.name} heart` : "";
        }

        GARDEN.sig = null; // repaint the arms in the new palette
        renderBiome();
        preloadStageArt(idx);
    }

    // The hearts and backdrops are large, so warm only the current stage and
    // the one after it. That keeps the next evolution instant without pulling
    // the whole campaign's art down on the first visit.
    const warmedArt = new Set();
    function preloadStageArt(from = stageIndex()) {
        for (let i = from; i <= Math.min(STAGES.length - 1, from + 1); i++) {
            const s = STAGES[i];
            for (const src of [s.heart, s.backdrop]) {
                const url = stageArtUrl(src);
                if (!url || warmedArt.has(url)) continue;
                warmedArt.add(url);
                const img = new Image();
                img.decoding = "async";
                img.src = url;
            }
        }
    }

    function renderStage() {
        const idx = stageIndex(),
            st = STAGES[idx],
            next = STAGES[idx + 1];
        if (document.body.dataset.stage !== String(idx)) applyStageLook();

        const trackName = $("#stageTrackName");
        const trackReq = $("#stageTrackReq");
        const fill = $("#stageFill");
        if (trackName)
            trackName.textContent = next
                ? `${st.name} → ${next.short}`
                : `${st.name} · final shape`;
        if (trackReq) trackReq.textContent = next ? stageReqText(next) : st.sub;
        if (fill)
            fill.style.width =
                (next ? stageProgress(next) * 100 : 100).toFixed(1) + "%";

        const btn = $("#evolveBtn");
        const ready = !!next && stageReady(next);
        if (btn) {
            btn.classList.toggle("hidden", !ready);
            if (ready) {
                const name = $(".evolve-name", btn);
                const meta = $(".evolve-meta", btn);
                if (name) name.textContent = `Evolve → ${next.name}`;
                if (meta) {
                    const opened = UPGRADES.filter(
                        (u) => u.stage === idx + 1,
                    ).length;
                    meta.textContent = `production ×${next.mult} · base click ×${next.click} · ${opened} new upgrade${opened === 1 ? "" : "s"}`;
                }
            }
        }

        if (ready && G.promptedStage !== idx) {
            G.promptedStage = idx;
            toast(`The cluster is ready to evolve — ${next.name}`, "gold");
            beep(720, 0.18, 0.04, "triangle");
            save();
        }
    }

    function confirmEvolve() {
        const idx = stageIndex(),
            next = STAGES[idx + 1];
        if (!next || !stageReady(next)) return;
        const opened = UPGRADES.filter((u) => u.stage === idx + 1);
        const calm = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;
        openModal(`
      <div class="eyebrow intro-eyebrow">the cluster is ready</div>
      <h2>${next.name}</h2>
      <p class="flavor">${next.tagline}</p>
      <div class="modal-grid">
        <div><span>production</span><b style="color:var(--green)">×${next.mult}</b></div>
        <div><span>base click power</span><b style="color:var(--green)">×${next.click}</b></div>
        <div><span>new growth</span><b>${opened.length} upgrade${opened.length === 1 ? "" : "s"}</b></div>
        <div><span>this is</span><b>permanent</b></div>
      </div>
      <p style="font-size:12px">Evolution does not reset the body. Your colonies, upgrades and biomass stay; the world around them changes. Fruiting wipes all biomass and starts a new body at the spore stage, so every stage is a climb you take again.</p>
      ${calm ? "" : '<p style="font-size:10.5px;color:var(--dimmer)">The heart will change colour and the ground will rearrange itself.</p>'}
      <div class="modal-actions">
        <button class="btn ghost" data-close>Not yet</button>
        <button class="btn" id="doEvolve">Evolve</button>
      </div>
    `);
        $("#doEvolve").addEventListener("click", () => {
            closeModal();
            evolve();
        });
    }

    function evolve() {
        const idx = stageIndex(),
            next = STAGES[idx + 1];
        if (!next || !stageReady(next)) return;
        G.stage = idx + 1;
        G.stageTime = 0;
        G.promptedStage = -1;
        compute();
        applyStageLook();
        evolveFx(next);
        toast(`${next.name} — ${next.sub}`, "gold");
        beep(96, 0.8, 0.07, "sine");
        save();
        refreshAll(true);
    }

    function evolveFx(st) {
        const calm = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;
        const layer = document.createElement("div");
        layer.className = "evolve-layer";
        let html = `<div class="evolve-flash"></div><div class="evolve-ring"></div>`;
        html += `<div class="evolve-word">${st.name}</div>`;
        html += `<div class="evolve-line">${st.sub}</div>`;
        if (!calm) {
            for (let i = 0; i < 46; i++) {
                const a = Math.random() * Math.PI * 2;
                const d = rnd(30, 240);
                html += `<i class="evolve-mote" style="--dx:${(Math.cos(a) * d).toFixed(0)}px;--dy:${(Math.sin(a) * d).toFixed(0)}px;--dur:${Math.round(rnd(900, 2200))}ms;--delay:${Math.round(rnd(0, 380))}ms"></i>`;
            }
        }
        layer.innerHTML = html;
        document.body.appendChild(layer);
        setTimeout(() => layer.remove(), 4200);
    }

    function stageModal() {
        const idx = stageIndex();
        const cond = conditionDef();
        const rows = STAGES.map((s, i) => {
            const ready = i > idx && stageReady(s);
            const state =
                i < idx
                    ? "done"
                    : i === idx
                      ? "now"
                      : ready
                        ? "ready"
                        : "locked";
            const detail =
                i < idx
                    ? "behind you"
                    : i === idx
                      ? s.sub
                      : ready
                        ? "ready — the button is in the heart"
                        : "not yet";
            return `<div class="stage-row ${state}">
        <span class="stage-row-glyph">${icon("stage-" + s.id, s.glyph)}</span>
        <span class="stage-row-main"><b>${s.name}</b><small>${detail}</small></span>
        <span class="stage-row-mult">×${s.mult}</span>
      </div>`;
        }).join("");
        const next = STAGES[idx + 1];
        openModal(`
      <div class="eyebrow intro-eyebrow">what the cluster has become</div>
      <h2>Evolution</h2>
      <p class="flavor">Each stage is a larger body. You choose when to take it, and fruiting returns the body to the spore so the climb can begin again.</p>
      <div class="stage-rows">${rows}</div>
      ${cond ? `<div class="memory-now ${cond.tone}"><span class="memory-glyph">${cond.glyph}</span><div><b>${cond.name}</b><small>${cond.desc}</small></div></div>` : ""}
      <div class="modal-grid">
        <div><span>stage</span><b>${idx + 1} / ${STAGES.length}</b></div>
        <div><span>lifetime biomass</span><b>${fmt(G.totalEver)}</b></div>
        <div><span>next</span><b>${next ? next.name : "nothing left to take"}</b></div>
        <div><span>requirement</span><b style="font-size:11px">${next ? stageReqText(next) : "—"}</b></div>
        <div><span>this body</span><b>${G.fruits + 1}</b></div>
        <div><span>scars on the world</span><b>${G.scars.length} / ${WORLD_SCAR_MAX}</b></div>
      </div>
      <div class="modal-actions"><button class="btn" data-close>Close</button></div>
    `);
    }

    /* ── the world outside the heart ─────────────────────────── */
    // Stage 0 is bare dirt. Each evolution redraws the ground: a forest grows
    // around the heart, then roads and towns, then a coastline, then a planet.
    function renderBiome() {
        const el = $("#biome");
        if (!el) return;
        const idx = stageIndex();
        if (R.biomeStage === idx) return;
        R.biomeStage = idx;
        el.innerHTML = biomeMarkup(idx);
    }

    function seeded(seed) {
        let s = seed >>> 0;
        return () => {
            s = (s * 1664525 + 1013904223) >>> 0;
            return s / 4294967296;
        };
    }

    function blobPath(cx, cy, r, points, rand, squash = 0.86, wobble = 0.34) {
        const pts = [];
        for (let i = 0; i < points; i++) {
            const a = (i / points) * Math.PI * 2;
            const rr = r * (1 - wobble / 2 + rand() * wobble);
            pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * squash]);
        }
        const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        let d = `M${mid(pts[0], pts[1])[0].toFixed(1)} ${mid(pts[0], pts[1])[1].toFixed(1)}`;
        for (let i = 1; i <= pts.length; i++) {
            const p = pts[i % pts.length];
            const m = mid(p, pts[(i + 1) % pts.length]);
            d += ` Q${p[0].toFixed(1)} ${p[1].toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)}`;
        }
        return d + " Z";
    }

    function biomeMarkup(idx) {
        const C = 200;
        const rand = seeded(9001 + idx * 137);
        let out = "";

        if (idx === 0) {
            // buried soil, stones, the odd thread
            for (let i = 0; i < 40; i++) {
                const a = rand() * Math.PI * 2;
                const r = 124 + rand() * 66;
                out += `<circle cx="${(C + Math.cos(a) * r).toFixed(1)}" cy="${(C + Math.sin(a) * r * 0.94).toFixed(1)}" r="${(0.5 + rand() * 1.5).toFixed(2)}" fill="currentColor" opacity="${(0.1 + rand() * 0.2).toFixed(2)}"/>`;
            }
            for (let i = 0; i < 5; i++) {
                const a = rand() * Math.PI * 2;
                const r0 = 150,
                    r1 = r0 + 14 + rand() * 22;
                out += `<path d="M${(C + Math.cos(a) * r0).toFixed(1)} ${(C + Math.sin(a) * r0).toFixed(1)} L${(C + Math.cos(a + 0.12) * r1).toFixed(1)} ${(C + Math.sin(a + 0.12) * r1).toFixed(1)}" stroke="currentColor" stroke-width="0.5" opacity="0.14" fill="none"/>`;
            }
            return out;
        }

        if (idx === 1) {
            // the wood: trunks and canopies ringing the heart
            out += `<g fill="none" stroke="currentColor" stroke-linecap="round">`;
            for (let i = 0; i < 13; i++) {
                const a = (i / 13) * Math.PI * 2 + 0.14;
                const r0 = 116 + rand() * 8,
                    r1 = 150 + rand() * 34;
                const bend = (rand() - 0.5) * 0.24;
                const x0 = C + Math.cos(a) * r0,
                    y0 = C + Math.sin(a) * r0;
                const x1 = C + Math.cos(a) * r1,
                    y1 = C + Math.sin(a) * r1;
                const mx = C + (Math.cos(a + bend) * (r0 + r1)) / 2;
                const my = C + (Math.sin(a + bend) * (r0 + r1)) / 2;
                out += `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}" stroke-width="${(0.7 + rand() * 1.1).toFixed(2)}" opacity="${(0.16 + rand() * 0.2).toFixed(2)}"/>`;
                out += `<circle cx="${x1.toFixed(1)}" cy="${y1.toFixed(1)}" r="${(7 + rand() * 11).toFixed(1)}" stroke-width="0.55" fill="currentColor" fill-opacity="0.045" opacity="0.16"/>`;
            }
            out += `</g>`;
            out += `<circle cx="${C}" cy="${C}" r="146" fill="none" stroke="currentColor" stroke-width="0.5" stroke-dasharray="1 6" opacity="0.16"/>`;
            return out;
        }

        if (idx === 2) {
            // the country: ring roads, spokes and lit towns
            out += `<g fill="none" stroke="currentColor">`;
            out += `<circle cx="${C}" cy="${C}" r="138" stroke-width="0.9" stroke-dasharray="7 5" opacity="0.22"/>`;
            out += `<circle cx="${C}" cy="${C}" r="170" stroke-width="0.55" stroke-dasharray="2 6" opacity="0.15"/>`;
            for (let i = 0; i < 10; i++) {
                const a = (i / 10) * Math.PI * 2 + 0.2;
                out += `<line x1="${(C + Math.cos(a) * 112).toFixed(1)}" y1="${(C + Math.sin(a) * 112).toFixed(1)}" x2="${(C + Math.cos(a) * 188).toFixed(1)}" y2="${(C + Math.sin(a) * 188).toFixed(1)}" stroke-width="0.5" opacity="0.14"/>`;
            }
            out += `</g>`;
            for (let i = 0; i < 34; i++) {
                const a = rand() * Math.PI * 2;
                const r = 118 + rand() * 74;
                const x = C + Math.cos(a) * r,
                    y = C + Math.sin(a) * r * 0.94;
                const w = 2 + rand() * 5,
                    h = 2 + rand() * 5;
                out += `<rect x="${(x - w / 2).toFixed(1)}" y="${(y - h / 2).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="currentColor" opacity="${(0.1 + rand() * 0.22).toFixed(2)}"/>`;
                if (rand() < 0.5)
                    out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.7 + rand() * 0.9).toFixed(2)}" fill="#fff6d8" opacity="${(0.35 + rand() * 0.5).toFixed(2)}"/>`;
            }
            return out;
        }

        if (idx === 3) {
            // the continent: one landmass with the heart at its centre
            out += `<path d="${blobPath(C, C, 176, 11, rand, 0.9, 0.4)}" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-width="0.7" opacity="0.3"/>`;
            out += `<path d="${blobPath(C, C, 160, 9, rand, 0.9, 0.3)}" fill="currentColor" fill-opacity="0.035" stroke="currentColor" stroke-width="0.5" stroke-dasharray="3 4" opacity="0.2"/>`;
            for (let i = 0; i < 4; i++) {
                const a = rand() * Math.PI * 2;
                const r = 60 + rand() * 70;
                out += `<path d="${blobPath(C + Math.cos(a) * r, C + Math.sin(a) * r * 0.9, 18 + rand() * 26, 7, rand, 0.8, 0.45)}" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-width="0.45" opacity="0.28"/>`;
            }
            for (let i = 0; i < 3; i++) {
                const y = 120 + i * 60 + rand() * 10;
                out += `<path d="M60 ${y.toFixed(0)} Q200 ${(y - 16 + rand() * 30).toFixed(0)} 340 ${(y + rand() * 8).toFixed(0)}" fill="none" stroke="currentColor" stroke-width="0.45" stroke-dasharray="2 5" opacity="0.14"/>`;
            }
            return out;
        }

        // idx === 4: the world
        out += `<defs><clipPath id="biomeGlobe"><circle cx="${C}" cy="${C}" r="152"/></clipPath></defs>`;
        out += `<circle cx="${C}" cy="${C}" r="152" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-width="0.8" opacity="0.34"/>`;
        out += `<g clip-path="url(#biomeGlobe)" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.22">`;
        for (const k of [-0.86, -0.55, -0.22, 0.22, 0.55, 0.86]) {
            out += `<ellipse cx="${C}" cy="${C}" rx="${Math.abs(k) * 152}" ry="152"/>`;
        }
        for (const k of [-0.6, -0.3, 0, 0.3, 0.6]) {
            const ry = 152 * Math.sqrt(1 - k * k) * 0.32;
            out += `<ellipse cx="${C}" cy="${(C + k * 152).toFixed(1)}" rx="${(152 * Math.sqrt(1 - k * k)).toFixed(1)}" ry="${ry.toFixed(1)}"/>`;
        }
        out += `</g>`;
        out += `<g clip-path="url(#biomeGlobe)" fill="currentColor" fill-opacity="0.09" stroke="currentColor" stroke-width="0.4" opacity="0.4">`;
        for (let i = 0; i < 5; i++) {
            const a = rand() * Math.PI * 2;
            const r = 40 + rand() * 78;
            out += `<path d="${blobPath(C + Math.cos(a) * r, C + Math.sin(a) * r, 16 + rand() * 30, 8, rand, 0.75, 0.55)}"/>`;
        }
        out += `</g>`;
        for (let i = 0; i < 42; i++) {
            const a = rand() * Math.PI * 2;
            const r = 158 + rand() * 34;
            out += `<circle cx="${(C + Math.cos(a) * r).toFixed(1)}" cy="${(C + Math.sin(a) * r).toFixed(1)}" r="${(0.35 + rand() * 0.9).toFixed(2)}" fill="#fffaf0" opacity="${(0.14 + rand() * 0.5).toFixed(2)}"/>`;
        }
        return out;
    }

    /* ── UI: rendering ───────────────────────────────────────── */
    const COL_ELS = [];

    function tierUnlocked(i) {
        if (TIERS[i].unlock && !reqMet(TIERS[i].unlock)) return false;
        if (i === 0) return true;
        return G.colonies[i] > 0 || G.colonies[i - 1] >= TIER_DWELL;
    }

    function syncBuyModes() {
        $$("#buyModes button").forEach((b) => {
            b.classList.toggle(
                "active",
                String(G.buyAmount) === b.dataset.amount,
            );
        });
    }

    function renderColonies() {
        const list = $("#colonyList");
        list.innerHTML = "";
        COL_ELS.length = 0;
        let shownLocked = false;

        for (let i = 0; i < TIERS.length; i++) {
            const unlocked = tierUnlocked(i);
            if (!unlocked) {
                if (shownLocked) continue;
                shownLocked = true;
                const t = TIERS[i];
                const el = document.createElement("div");
                el.className = "colony locked";
                el.innerHTML = `
          <div class="colony-icon">?</div>
          <div class="colony-main">
            <div class="colony-name-row"><span class="colony-name">???</span></div>
            <div class="colony-flavor">${i === 0 ? "" : `grow ${TIER_DWELL} ${TIERS[i - 1].plural || TIERS[i - 1].name + "s"} to reveal`}${t.unlock ? ` · requires ${reqText(t.unlock)}` : ""}</div>
          </div>
          <div class="colony-right"><span class="colony-cost">—</span></div>`;
                list.appendChild(el);
                continue;
            }

            const t = TIERS[i];
            const el = document.createElement("button");
            el.className = "colony";
            el.type = "button";
            el.innerHTML = `
        <div class="colony-icon">${icon("tier-" + t.id, t.glyph)}</div>
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
            <span class="colony-niche">${ECO.tier[i]}</span>
          </div>
          <div class="colony-flavor">${t.flavor}</div>
        </div>
        <div class="colony-right">
          <span class="colony-cost"><small>⬥</small><span>0</span></span>
        </div>`;
            el.addEventListener("click", () => buyColony(i));
            list.appendChild(el);
            COL_ELS[i] = {
                el,
                owned: $(".colony-owned", el),
                mult: $(".colony-mult", el),
                prod: $(".colony-prod", el),
                bar: $(".milestone i", el),
                ms: $(".ms", el),
                cost: $(".colony-cost span", el),
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
            const amount =
                G.buyAmount === "max" ? Math.max(1, max) : G.buyAmount;
            const costShown = colonyBulkCost(i, amount);
            const per = TIERS[i].prod * S.tierMults[i] * S.globalMul;
            const progress = ((n % S.milestoneEvery) / S.milestoneEvery) * 100;

            r.owned.textContent = "×" + fmt(n);
            r.owned.classList.toggle("hot", n > 0);
            if (n === 0) {
                // Nothing owned yet: show what the first one will do, not "+0/s".
                r.prod.classList.add("preview");
                r.prod.innerHTML = `+${fmt(per)}/s <em>each</em>`;
            } else {
                r.prod.classList.remove("preview");
                r.prod.textContent = "+" + fmt(per * n) + "/s";
            }
            const showMult = S.tierMults[i] > 1.001;
            r.mult.classList.toggle("hidden", !showMult);
            if (showMult) r.mult.textContent = "×" + fmt(S.tierMults[i]);
            r.bar.style.width = progress + "%";
            r.ms.textContent = `${n % S.milestoneEvery}/${S.milestoneEvery}`;
            r.cost.textContent = fmt(costShown);
            r.el.title = `${TIERS[i].name} · +${fmt(per)}/s each${amount > 1 ? ` · buying ${fmt(amount)}` : ""}`;

            const afford = G.biomass >= costShown && amount > 0;
            r.el.classList.toggle("affordable", afford);
            r.el.classList.toggle("poor", !afford);
        }
        $("#colonyCount").textContent = fmt(total);
        $("#colonyFoot").innerHTML =
            `<span>${fmt(total)} colonies</span><span>every ${S.milestoneEvery} owned → ×2 production</span>`;
    }

    /* ── the garden inside the heart ─────────────────────────── */
    // One hypha per colony type, rooted at the core. Each owned colony adds a
    // bead and pushes the thread deeper; milestones thicken it.
    const GARDEN = { sig: null, prev: [] };
    // The garden takes its colour from the world the cluster lives in.
    const GARDEN_TINTS = [
        ["#c8ffe9", "#cfe6ff", "#ffe2ab"],
        ["#d6ffcb", "#b9eec3", "#f2ffd0"],
        ["#ffeac2", "#ffd79a", "#fff6dd"],
        ["#d2f5ff", "#b6e4f4", "#e8fcff"],
        ["#eadcff", "#d5c2ff", "#fff4ff"],
    ];
    const gardenTint = (ti) => {
        const pal = GARDEN_TINTS[stageIndex()] || GARDEN_TINTS[0];
        return pal[ti % pal.length];
    };

    function renderGarden() {
        const el = $("#garden");
        if (!el) return;
        const sig = G.colonies.join(",");
        if (sig === GARDEN.sig) return;
        const prev = GARDEN.prev;
        GARDEN.sig = sig;
        GARDEN.prev = G.colonies.slice();

        const cx = 100,
            cy = 100;
        const owned = [];
        for (let i = 0; i < TIERS.length; i++) if (G.colonies[i]) owned.push(i);
        let arms = "";

        owned.forEach((ti, k) => {
            const n = G.colonies[ti];
            const tier = TIERS[ti];
            // Owned types share the circle evenly, so the garden is balanced at every stage.
            const ang =
                ((-90 + ((k + 0.5) / owned.length) * 360) * Math.PI) / 180;
            const depth = clamp(Math.log10(n + 1) / 3, 0, 1);
            const ms = 1 + Math.floor(n / S.milestoneEvery);
            const r0 = 36;
            const r1 = 64 + depth * 26 + Math.sin(ti * 2.7) * 5;
            const swirl = (ti % 2 ? 1 : -1) * (0.18 + depth * 0.14);
            const x0 = cx + Math.cos(ang) * r0;
            const y0 = cy + Math.sin(ang) * r0;
            const mx =
                cx + Math.cos(ang + swirl * 0.55) * (r0 + (r1 - r0) * 0.55);
            const my =
                cy + Math.sin(ang + swirl * 0.55) * (r0 + (r1 - r0) * 0.55);
            const x1 = cx + Math.cos(ang + swirl) * r1;
            const y1 = cy + Math.sin(ang + swirl) * r1;
            const tint = gardenTint(ti);
            const d = `M${x0.toFixed(1)} ${y0.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;

            const qAt = (u) => ({
                x: (1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * mx + u * u * x1,
                y: (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * my + u * u * y1,
            });

            // A couple of offshoots once the colony type is deep enough.
            let forks = "";
            if (depth > 0.12) {
                const forkCount = depth > 0.55 ? 2 : 1;
                for (let f = 0; f < forkCount; f++) {
                    const origin = qAt(0.42 + f * 0.28);
                    const fa =
                        ang + swirl + (f % 2 ? -1 : 1) * (0.75 + depth * 0.35);
                    const fl = r1 * (0.18 + depth * 0.08);
                    const fx = origin.x + Math.cos(fa) * fl;
                    const fy = origin.y + Math.sin(fa) * fl;
                    forks += `<path d="M${origin.x.toFixed(1)} ${origin.y.toFixed(1)} Q${(origin.x + Math.cos(fa) * fl * 0.55).toFixed(1)} ${(origin.y + Math.sin(fa) * fl * 0.55).toFixed(1)} ${fx.toFixed(1)} ${fy.toFixed(1)}" fill="none" stroke="${tint}" stroke-width="0.65" stroke-linecap="round" opacity="${(0.3 + depth * 0.35).toFixed(2)}"/>`;
                }
            }

            // Beads: one per power of two of colonies, capped for sanity.
            let beads = "";
            const beadCount =
                clamp(Math.round((Math.log2(n + 1) - 1) / 1.6), 1, 5) || 1;
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
            const swayDur = 12 + ((ti * 37) % 11);
            const swayDelay = -(
                (performance.now() / 1000 + ti * 4.3) %
                swayDur
            ).toFixed(2);
            arms += `<g class="arm${fresh ? " fresh" : ""}" style="--arm-dur:${swayDur}s;--arm-delay:${swayDelay}s">
        <path d="${d}" fill="none" stroke="${tint}" stroke-width="${(w * 4.6).toFixed(1)}" stroke-linecap="round" opacity="0.13"/>
        <path d="${d}" fill="none" stroke="#03120c" stroke-width="${(w + 1.1).toFixed(1)}" stroke-linecap="round" opacity="0.22"/>
        <path class="hypha" pathLength="1" d="${d}" fill="none" stroke="${tint}" stroke-width="${w.toFixed(2)}" stroke-linecap="round" opacity="${(0.78 + depth * 0.2).toFixed(2)}"/>
        ${forks}
        ${beads}
        <text x="${gx.toFixed(1)}" y="${gy.toFixed(1)}" font-size="${(8 + depth * 3).toFixed(1)}" fill="${tint}" stroke="#04170f" stroke-width="1.6" paint-order="stroke" opacity="0.92" text-anchor="middle" dominant-baseline="central">${tier.glyph}</text>
      </g>`;
        });

        const rings =
            colonyTotal() > 0
                ? `<g opacity="0.17">
          <circle cx="100" cy="100" r="45" fill="none" stroke="#bfffe6" stroke-width="0.6" stroke-dasharray="1 5"/>
          <circle cx="100" cy="100" r="72" fill="none" stroke="#bfffe6" stroke-width="0.5" stroke-dasharray="1 7"/>
        </g>`
                : "";

        // The ring of arms orbits the core very slowly. Re-rendering the garden
        // (every colony bought) rebuilds the nodes, so the spin is offset by the
        // time already elapsed — otherwise the branches would snap back to 0°.
        const SPIN_SECONDS = 210;
        const spinOffset = -((performance.now() / 1000) % SPIN_SECONDS).toFixed(
            2,
        );
        el.innerHTML =
            rings +
            `<g class="garden-spin" style="animation-delay:${spinOffset}s">` +
            `<g class="garden-sway">${arms}</g>` +
            `</g>`;
    }

    // The upgrades tab is shelved by category (see UPGRADE_CATS in data.js).
    // A strain line only appears once its colony type exists — there is no point
    // offering a Hyphal Thread upgrade to a body that has never grown one.
    const expandedShelves = new Set();

    function upgradeShelves() {
        const shelves = UPGRADE_CATS.map((c) => ({
            ...c,
            open: [],
            locked: [],
        }));
        const byId = Object.fromEntries(shelves.map((s) => [s.id, s]));
        for (const u of UPGRADES) {
            if (G.upgrades[u.id]) continue;
            if ((u.stage || 0) > stageIndex()) continue; // a later world's growth
            const tierRef =
                u.tier != null
                    ? u.tier
                    : u.req && u.req.owned
                      ? u.req.owned[0]
                      : null;
            if (tierRef != null && !G.colonies[tierRef]) continue;
            const shelf = byId[u.cat] || byId.growth;
            (reqMet(u.req) ? shelf.open : shelf.locked).push(u);
        }
        for (const s of shelves) {
            s.open.sort((a, b) => a.cost - b.cost);
            // Nearest to opening first: a sealed path the player is close to is
            // worth more than one four tiers away.
            s.locked.sort(
                (a, b) =>
                    reqProgress(b.req) - reqProgress(a.req) || a.cost - b.cost,
            );
        }
        // A colony type has three strain upgrades at 10 / 50 / 150 owned. Showing
        // all three sealed at once just fills the shelf, so each tier keeps only
        // its next threshold until the one before it is bought.
        const strain = byId.strain;
        const nextAt = new Map();
        for (const u of strain.locked) {
            if (u.tier == null) continue;
            const at = u.req.owned[1];
            if (!nextAt.has(u.tier) || at < nextAt.get(u.tier))
                nextAt.set(u.tier, at);
        }
        strain.locked = strain.locked.filter(
            (u) => u.tier == null || u.req.owned[1] === nextAt.get(u.tier),
        );
        // Four sealed paths per shelf is enough to show the shape of what is
        // coming; the rest sit behind the "more sealed paths" toggle.
        for (const s of shelves) {
            s.sealed = s.locked.length;
            s.hidden = expandedShelves.has(s.id)
                ? 0
                : Math.max(0, s.locked.length - 4);
            s.locked = s.locked.slice(0, s.locked.length - s.hidden);
        }
        return shelves.filter((s) => s.open.length || s.locked.length);
    }

    function upgradeCard(u) {
        if (u._locked) {
            const p = reqProgress(u.req);
            return `<button type="button" class="up locked" data-id="${u.id}">
        <span class="up-name">???</span>
        <span class="up-desc">${reqText(u.req)}</span>
        <span class="up-bar"><i style="width:${(p * 100).toFixed(1)}%"></i></span>
        <span class="up-cost"><span class="up-pct">${Math.floor(p * 100)}%</span></span>
      </button>`;
        }
        return `<button type="button" class="up${u.tier != null ? " tiered" : ""}" data-id="${u.id}">
      <span class="up-tier">${u.tier != null ? icon("tier-" + TIERS[u.tier].id, TIERS[u.tier].glyph) : ""}</span>
      <span class="up-name">${u.name}</span>
      <span class="up-desc">${u.desc}</span>
      <span class="up-cost"><span class="glyph">⬥</span>${fmt(u.cost)}</span>
    </button>`;
    }

    function renderUpgrades(force) {
        const shelves = upgradeShelves();
        const sig = shelves
            .map(
                (s) =>
                    s.id +
                    (expandedShelves.has(s.id) ? "E" : "C") +
                    ":" +
                    s.open.map((u) => u.id).join("+") +
                    "|" +
                    s.locked.map((u) => u.id).join("+"),
            )
            .join(",");
        if (!force && sig === R.upSig) return;
        R.upSig = sig;

        const box = $("#upgradeList");
        if (!shelves.length) {
            box.innerHTML = `<div class="empty">Nothing new wants to grow.<br>Buy colonies to open new paths.</div>`;
            return;
        }
        box.innerHTML = shelves
            .map(
                (s) => `
      <section class="up-shelf">
        <header class="up-shelf-head">
          <span class="up-shelf-name">${s.name}</span>
          <span class="up-shelf-note">${s.open.length ? `${s.open.length} open` : "none open"}${s.sealed ? ` · ${s.sealed} sealed` : ""}</span>
        </header>
        <div class="up-shelf-note-line">${s.note}</div>
        <div class="upgrade-grid">
          ${s.open.map((u) => upgradeCard(u)).join("")}
          ${s.locked.map((u) => upgradeCard({ ...u, _locked: true })).join("")}
        </div>
        ${s.sealed > 4 ? `<button type="button" class="up-more" data-more="${s.id}">${s.hidden ? `+${s.hidden} more sealed path${s.hidden === 1 ? "" : "s"}` : "hide sealed paths"}</button>` : ""}
      </section>`,
            )
            .join("");
        box.querySelectorAll(".up:not(.locked)").forEach((el) => {
            el.addEventListener("click", () => buyUpgrade(el.dataset.id));
        });
        box.querySelectorAll("[data-more]").forEach((el) => {
            el.addEventListener("click", () => {
                const id = el.dataset.more;
                expandedShelves.has(id)
                    ? expandedShelves.delete(id)
                    : expandedShelves.add(id);
                R.upSig = "";
                renderUpgrades(true);
            });
        });
        updateUpgradeAfford();
    }

    function updateUpgradeAfford() {
        $$("#upgradeList .up").forEach((el) => {
            const u = UPG_BY_ID[el.dataset.id];
            if (!u) return;
            if (el.classList.contains("locked")) {
                const p = reqProgress(u.req);
                const fill = el.querySelector(".up-bar i");
                const pct = el.querySelector(".up-pct");
                const w = (p * 100).toFixed(1) + "%";
                if (fill && fill.style.width !== w) fill.style.width = w;
                const label = Math.floor(p * 100) + "%";
                if (pct && pct.textContent !== label) pct.textContent = label;
                return;
            }
            const afford = G.biomass >= u.cost;
            el.classList.toggle("affordable", afford);
            el.classList.toggle("poor", !afford);
        });
        const avail = UPGRADES.filter(
            (u) =>
                !G.upgrades[u.id] &&
                (u.stage || 0) <= stageIndex() &&
                reqMet(u.req),
        ).length;
        $("#upgradeNote").textContent = avail
            ? `${avail} path${avail === 1 ? "" : "s"} still open · growth leaves scars worth keeping`
            : "no path is open — grow the body to open more";
    }

    function renderEcology(force) {
        const el = $("#ecoPanel");
        if (!el) return;
        const eco = S.ecology;
        if (!eco) return;
        const sig =
            G.colonies.join(",") +
            "|" +
            G.mutations.join(",") +
            "|" +
            GRAFT_SITES.map((s) => G.graftSites[s.id] || "").join(",") +
            "|" +
            (GRAFT_PROTO ? "grafts" : "plain");
        if (!force && sig === R.ecoSig) return;
        R.ecoSig = sig;

        const webText = eco.web
            ? `web intact · +${Math.round(eco.webBonus * 100)}% production`
            : "a web still forming";
        let html = `<div class="eco-head"><span>the strain ecology</span><b class="${eco.web ? "on" : ""}">${webText}</b></div><div class="eco-niches">`;
        html += eco.niches
            .map((n) => {
                const pct = Math.round((n.mult - 1) * 100);
                const pips = Array.from(
                    { length: ECO.maxKinds },
                    (_, i) => `<i class="${i < n.kinds ? "on" : ""}"></i>`,
                ).join("");
                const notes = [
                    `${n.kinds}/${ECO.maxKinds} kinds`,
                    `${fmt(n.pop)} colonies`,
                ];
                if (n.strains)
                    notes.push(
                        `${n.strains} strain${n.strains === 1 ? "" : "s"}`,
                    );
                if (n.graft)
                    notes.push(`graft +${Math.round(n.graft * 100)}%`);
                return `<div class="eco-niche ${n.id}" title="${n.note}">
          <div class="eco-niche-top">
            <span class="eco-name"><i>${n.glyph}</i>${n.name}</span>
            <b class="eco-bonus ${pct < 0 ? "bad" : ""}">${pct > 0 ? "+" : ""}${pct}%</b>
          </div>
          <span class="eco-pips">${pips}</span>
          <span class="eco-meta">${notes.join(" · ")}</span>
        </div>`;
            })
            .join("");
        html += `</div>`;
        if (eco.links.length) {
            html += `<div class="eco-links">${eco.links
                .map((link) => {
                    const pct = Math.round((link.mult - 1) * 100);
                    const niche = ECO_NICHE_BY_ID[link.niche];
                    return `<span class="eco-link ${link.kind}" title="${link.desc}"><b>${link.name}</b> ${pct > 0 ? "+" : ""}${pct}% ${niche ? niche.name : link.niche}</span>`;
                })
                .join("")}</div>`;
        } else {
            html += `<div class="eco-empty">No symbioses or tensions yet.</div>`;
        }
        el.innerHTML = html;
    }

    function renderGrafts(force) {
        const el = $("#graftMap");
        if (!el) return;
        el.classList.toggle("hidden", !GRAFT_PROTO);
        if (!GRAFT_PROTO) return;
        const sig = GRAFT_SITES.map(
            (s) => `${s.id}:${G.graftSites[s.id] || ""}`,
        ).join("|");
        if (!force && sig === R.graftSig) return;
        R.graftSig = sig;
        const filled = GRAFT_SITES.filter((s) => G.graftSites[s.id]).length;
        el.innerHTML =
            `<div class="graft-map-head"><span>the grafted body</span><b>${filled} / ${GRAFT_SITES.length}</b></div>` +
            GRAFT_SITES.map((site) => {
                const id = G.graftSites[site.id];
                const def = GRAFT_BY_ID[id];
                const effect = def
                    ? graftEffectText(def.sites[site.id])
                    : "";
                const niche = S.ecology?.niches.find((n) => n.id === site.id);
                const eco = def && niche?.graft
                    ? ` · niche +${Math.round(niche.graft * 100)}%`
                    : "";
                return `<div class="graft-site ${def ? "filled" : "empty"}">
          <span class="graft-site-glyph">${site.glyph}</span>
          <span class="graft-site-main">
            <span class="graft-site-name">${site.name}</span>
            <span class="graft-site-effect">${def ? `${def.glyph} ${def.name} · ${effect}${eco}` : "empty — a graft would sit here"}</span>
            <span class="graft-site-note">${site.note}</span>
          </span>
        </div>`;
            }).join("");
    }

    function renderMutations(force) {
        const sig =
            G.mutations.join(",") +
            "|" +
            G.pendingDrafts +
            "|" +
            G.draftsTaken +
            "|" +
            G.draftThresholds.length;
        updateStrainDot();
        if (!force && sig === R.mutSig) {
            updateDraftLine();
            return;
        }
        R.mutSig = sig;

        const box = $("#mutationList");
        let html = `<div class="draft-count"><span id="draftInfo"></span>${G.pendingDrafts > 0 ? '<button class="btn" id="openDraft" style="padding:6px 10px;font-size:10px">Choose</button>' : ""}</div>`;

        if (!G.mutations.length) {
            html += `<div class="empty">No mutations yet.<br>The strain is still clean.</div>`;
        } else {
            html += G.mutations
                .map((id) => {
                    const m = MUT_BY_ID[id];
                    return `<div class="mut ${RARITY_NAME[m.rarity]}">
          <div class="mut-mark"></div>
          <div>
            <div class="mut-name">${m.name}</div>
            <div class="mut-desc">${mutDesc(id)}</div>
          </div>
          <div class="mut-rarity">${RARITY_NAME[m.rarity]} · ${m.niche}</div>
        </div>`;
                })
                .join("");
        }
        box.innerHTML = html;
        const b = $("#openDraft");
        if (b)
            b.addEventListener("click", () => {
                if (G.pendingDrafts > 0) maybeShowDraft();
            });
        updateDraftLine();
    }

    function updateDraftLine() {
        const el = $("#draftInfo");
        if (!el) return;
        const left = G.draftThresholds.length - G.draftsTaken;
        if (G.pendingDrafts > 0) {
            el.textContent = `${G.pendingDrafts} draft${G.pendingDrafts > 1 ? "s" : ""} waiting`;
        } else if (left > 0) {
            el.textContent = `next draft at ${fmt(G.draftThresholds[G.draftsTaken])} total biomass`;
        } else {
            el.textContent = "this body is finished changing — fruit to reroll";
        }
    }

    function renderSpores(force) {
        const sig = [
            G.spores,
            SPORE_NODES.map((n) => treeLvl(n.id)).join("|"),
        ].join(":");
        if (!force && sig === R.sporeSig) return;
        R.sporeSig = sig;

        $("#fruitBox").innerHTML = `
      <div class="fruit-head">
        <strong>Fruit</strong>
        <span>${G.fruits} fruiting${G.fruits === 1 ? "" : "s"}</span>
      </div>
      <div class="fruit-bar"><i id="fruitFill" style="width:0%"></i></div>
      <div class="fruit-note" id="fruitNote"></div>
      <button class="fruit-btn" id="fruitBtn">Not yet</button>`;

        const btn = $("#fruitBtn");
        if (btn) btn.addEventListener("click", () => confirmFruit());
        updateFruitValues();

        $("#sporeList").innerHTML = SPORE_NODES.map((n) => {
            const lvl = treeLvl(n.id);
            const cost = nodeCost(n);
            const maxed = lvl >= n.max;
            const pips = Array.from(
                { length: n.max },
                (_, i) => `<i class="${i < lvl ? "on" : ""}"></i>`,
            ).join("");
            return `<button class="spore-node" data-node="${n.id}" type="button">
        <span class="spore-name">${n.name}<b>${lvl}/${n.max}</b></span>
        <span class="spore-desc">${n.desc}</span>
        <span class="pips">${pips}</span>
        <span class="spore-cost">${maxed ? "complete" : `✦ ${fmtWhole(cost)} spore${cost === 1 ? "" : "s"}`}</span>
      </button>`;
        }).join("");

        $$("#sporeList .spore-node").forEach((el) => {
            const n = SPORE_NODES.find((x) => x.id === el.dataset.node);
            if (treeLvl(n.id) >= n.max) el.classList.add("maxed");
            el.addEventListener("click", () => buyNode(n.id));
        });
        updateSporeAfford();
    }

    function updateFruitValues() {
        const fill = $("#fruitFill");
        if (!fill) return;
        const gainAmt = sporeGain();
        const pct = clamp((G.biomass / FRUIT_MIN) * 100, 0, 100);
        fill.style.width = pct + "%";
        const note = $("#fruitNote");
        note.innerHTML = gainAmt
            ? `Release <b style="color:var(--gold)">${fmtWhole(gainAmt)}</b> spore${gainAmt === 1 ? "" : "s"}. All biomass is wiped; the strain remains.<br><span style="color:var(--dimmer)">A deeper body always pays more.</span>`
            : `Reach ${fmt(FRUIT_MIN)} biomass to fruit. You have ${fmt(G.biomass)}.`;
        const btn = $("#fruitBtn");
        if (!btn) return;
        btn.disabled = !gainAmt;
        btn.textContent = gainAmt
            ? `Fruit now · +${fmtWhole(gainAmt)} spores`
            : "Not yet";
    }

    function updateSporeAfford() {
        $$("#sporeList .spore-node").forEach((el) => {
            const n = SPORE_NODES.find((x) => x.id === el.dataset.node);
            if (!n) return;
            const maxed = treeLvl(n.id) >= n.max;
            const afford = !maxed && G.spores >= nodeCost(n);
            el.classList.toggle("affordable", afford);
            el.classList.toggle("poor", !maxed && !afford);
        });
    }

    function renderMutationsAndSpores(force) {
        renderEcology(force);
        renderGrafts(force);
        renderMutations(force);
        renderSpores(force);
    }

    /* ── world memory ────────────────────────────────────────── */
    function renderCondition(force) {
        const chip = $("#worldChip");
        if (!chip) return;
        const cond = conditionDef();
        const sig = (cond ? cond.id : "") + "|" + G.fruits;
        if (!force && sig === R.conditionSig) return;
        R.conditionSig = sig;
        if (!cond) {
            chip.classList.add("hidden");
            return;
        }
        chip.classList.remove("hidden");
        chip.className = "world-chip " + cond.tone;
        $("#worldChipGlyph").textContent = cond.glyph;
        $("#worldChipName").textContent = cond.name;
        $("#worldChipEff").textContent = conditionEffectText(cond);
        chip.title = `${cond.name} — ${cond.desc}`;
    }

    function renderScars(force) {
        const el = $("#scarField");
        if (!el) return;
        const sig =
            G.scars.map((s) => `${s.body}:${s.condition}`).join("|") +
            "|" +
            G.scarTotal;
        if (!force && sig === R.scarSig) return;
        R.scarSig = sig;
        if (!G.scars.length) {
            el.innerHTML = "";
            return;
        }
        const total = G.scars.length;
        el.innerHTML = G.scars
            .map((s, i) => {
                const angle =
                    -Math.PI / 2 + (i / total) * Math.PI * 2 + (i % 3) * 0.18;
                const rad = 45 + (i % 4) * 1.8;
                const left = 50 + Math.cos(angle) * rad;
                const top = 50 + Math.sin(angle) * rad;
                const rot =
                    (angle * 180) / Math.PI + 90 + (i % 2 ? 20 : -20);
                const cond = WORLD_CONDITION_BY_ID[s.condition];
                const tone = cond ? cond.tone : "still";
                const label = cond ? cond.name : "an unrecorded world";
                return `<i class="world-scar ${tone}" style="left:${left.toFixed(2)}%;top:${top.toFixed(2)}%;--rot:${rot.toFixed(1)}deg;--len:${(5 + (i % 3) * 2).toFixed(0)}px" title="Scar ${i + 1} — ${label}, body ${s.body}"></i>`;
            })
            .join("");
    }

    function renderArchive(force) {
        const el = $("#worldArchive");
        if (!el) return;
        const cond = conditionDef();
        const sig = [
            G.fruits,
            G.scars.length,
            G.scarTotal,
            G.condition,
            G.archive.map((e) => e.body).join(","),
        ].join("|");
        if (!force && sig === R.archiveSig) return;
        R.archiveSig = sig;
        const rows = G.archive.length
            ? G.archive
                  .map((e) => {
                      const st = STAGES[e.stage] || STAGES[0];
                      const c = WORLD_CONDITION_BY_ID[e.condition];
                      const niche = e.dominant
                          ? ECO_NICHE_BY_ID[e.dominant]
                          : null;
                      return `<button type="button" class="archive-row" data-body="${e.body}" title="Inspect body ${e.body}">
        <span class="archive-body">body ${e.body}</span>
        <span class="archive-main"><b>${st.short} stage</b><small>${fmt(e.biomass)} biomass · ${timeStr(e.time)} · ${niche ? `${niche.name}-dominant` : "no colonies"}</small></span>
        <span class="archive-cond ${c ? c.tone : "still"}">${c ? `${c.glyph} ${c.name}` : "unrecorded"}</span>
      </button>`;
                  })
                  .join("")
            : `<div class="archive-empty">${G.fruits ? "The older bodies left no record. Fruit again to write the next one." : "No body has fruited yet. The first scar is still ahead."}</div>`;
        el.innerHTML = `
      <div class="memory-head"><span>the world remembers</span><b>${G.scars.length} scar${G.scars.length === 1 ? "" : "s"} · ${G.fruits} bod${G.fruits === 1 ? "y" : "ies"}</b></div>
      ${cond ? `<div class="memory-now ${cond.tone}"><span class="memory-glyph">${cond.glyph}</span><div><b>${cond.name}</b><small>${cond.desc}</small></div></div>` : ""}
      <div class="archive-list">${rows}</div>
      ${G.archive.length ? '<div class="archive-hint">press a body to read its record</div>' : ""}`;
        el.querySelectorAll(".archive-row").forEach((row) => {
            row.addEventListener("click", () =>
                showArchivedBody(Number(row.dataset.body)),
            );
        });
    }

    // An archived body is read, not replayed: everything here is copied out of
    // the save at the moment it fruited, so it survives the living strain.
    function showArchivedBody(bodyNo) {
        const e = G.archive.find((a) => a.body === bodyNo);
        if (!e) return;
        const st = STAGES[e.stage] || STAGES[0];
        const c = WORLD_CONDITION_BY_ID[e.condition];
        const niche = e.dominant ? ECO_NICHE_BY_ID[e.dominant] : null;
        const mutNames = e.mutationIds
            .map((id) => MUT_BY_ID[id])
            .filter(Boolean);
        const muts = mutNames.length
            ? mutNames
                  .map(
                      (m) => `<div class="archive-detail-row">
        <b>${m.name}</b><small>${RARITY_NAME[m.rarity]} · ${m.niche} · ${m.desc}</small>
      </div>`,
                  )
                  .join("")
            : e.mutations > 0
              ? `<div class="archive-detail-note">${e.mutations} mutation${e.mutations === 1 ? "" : "s"}, but this body fell before their names were recorded.</div>`
              : `<div class="archive-detail-note">No mutation had been drafted before it fell.</div>`;
        const grafts = e.graftsRecorded
            ? GRAFT_SITES.map((site) => {
                  const def = GRAFT_BY_ID[e.graftSites[site.id]];
                  return `<div class="archive-detail-row ${def ? "filled" : "empty"}">
        <b>${site.glyph} ${site.name}</b><small>${def ? `${def.glyph} ${def.name} · ${graftEffectText(def.sites[site.id])}` : "left empty"}</small>
      </div>`;
              }).join("")
            : `<div class="archive-detail-note">This body fell before grafts were recorded.</div>`;
        const when = e.at
            ? new Date(e.at).toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
              })
            : "an unrecorded day";
        openModal(`
      <div class="eyebrow intro-eyebrow">the world remembers</div>
      <h2>Body ${e.body} · ${st.name}</h2>
      <p class="flavor">It fell in the ${st.short.toLowerCase()} stage, on ${when}. What it was is still here; the body itself is compost.</p>
      <div class="modal-grid">
        <div><span>biomass at the fall</span><b>${fmt(e.biomass)}</b></div>
        <div><span>time grown</span><b>${timeStr(e.time)}</b></div>
        <div><span>colonies at the end</span><b>${fmt(e.colonies)}</b></div>
        <div><span>dominant niche</span><b>${niche ? `${niche.glyph} ${niche.name}` : "none"}</b></div>
      </div>
      <div class="archive-detail-head">mutations <span>${mutNames.length || e.mutations}</span></div>
      <div class="archive-detail-list">${muts}</div>
      <div class="archive-detail-head">grafts <span>${e.graftsRecorded ? `${Object.values(e.graftSites).filter(Boolean).length} / ${GRAFT_SITES.length}` : "not recorded"}</span></div>
      <div class="archive-detail-list">${grafts}</div>
      <div class="archive-detail-head">the world it died under</div>
      <div class="memory-now ${c ? c.tone : "still"}">
        <span class="memory-glyph">${c ? c.glyph : "○"}</span>
        <div><b>${c ? c.name : "Unrecorded world"}</b><small>${c ? c.desc : "This body fruited before conditions were written down."}</small></div>
      </div>
      <div class="modal-actions"><button class="btn" data-close>Close</button></div>
    `);
    }

    function renderGoals(force) {
        const sig = Object.keys(G.ach).length + ":" + G.fruits;
        if (!force && sig === R.goalSig) return;
        R.goalSig = sig;
        $("#goalList").innerHTML = ACHIEVEMENTS.map((a) => {
            const done = !!G.ach[a.id];
            return `<div class="goal ${done ? "done" : ""}">
        <div class="goal-medal" aria-hidden="true">${achIcon(a.id, "✦")}${done ? '<b class="goal-check">✓</b>' : ""}</div>
        <div class="goal-text">${done ? a.name : "???"}<small>${a.desc}</small></div>
        <div class="goal-bonus">${done ? "+" + Math.round(ACH_BONUS * 100) + "%" : "—"}</div>
      </div>`;
        }).join("");
    }

    function renderStats() {
        const achCount = Object.keys(G.ach).length;
        $("#statsBlock").innerHTML = `
      <span>lifetime biomass</span><b>${fmt(G.totalEver)}</b>
      <span>run biomass</span><b>${fmt(G.runTotal)}</b>
      <span>colonies</span><b>${fmt(colonyTotal())}</b>
      <span>mutations held</span><b>${G.mutations.length}</b>
      <span>upgrades this run</span><b>${upgradesOwned()}</b>
      <span>spores earned</span><b>${fmtWhole(G.sporesEver)}</b>
      <span>best ${"/s"}</span><b>${fmt(G.bestBps)}/s</b>
      <span>time grown</span><b>${timeStr(G.playTime)}</b>
      <span>records</span><b>${achCount}/${ACHIEVEMENTS.length}</b>
      <span>world condition</span><b>${conditionDef()?.name || "—"}</b>
      <span>scars on the world</span><b>${G.scarTotal}</b>
      <span>drift plants</span><b>${G.driftPlants}</b>
      <span>drift merges</span><b>${G.driftMerges}</b>`;
    }

    function refreshHeader() {
        $("#biomass").textContent = fmt(G.biomass);
        $("#bps").textContent = fmt(S.bps);
        $("#spores").textContent = fmtWhole(G.spores);
        const clickEl = $("#clickPower");
        clickEl.textContent = fmt(S.click);
        clickEl.title = S.clickRatio
            ? `base click power × multipliers, plus ${(S.clickRatio * 100).toFixed(0)}% of production/s`
            : "base click power × multipliers — colonies do not add to it";
        $("#stageNote").textContent = S.blighted
            ? `blight · ${S.blightLeft.toFixed(0)}s`
            : S.frenzied
              ? `frenzy · ${S.frenzyLeft.toFixed(0)}s`
              : `${fmt(S.bps)} biomass per second`;

        const timer = $("#gameTimer");
        if (timer) timer.textContent = "◷ " + timerStr(G.playTime);

        const cover = worldCover();
        const fill = $("#worldFill");
        if (fill) fill.style.width = (cover * 100).toFixed(3) + "%";
        const pct = $("#worldPct");
        if (pct) pct.textContent = worldPctText(cover);
        const wrap = $("#worldWrap");
        if (wrap)
            wrap.title = `${fmt(G.biomass)} biomass · ${worldPctText(cover)} of the world's ${WORLD_GT} Gt C`;
        if (G.started && !G.won && cover >= 1) winWorld();
    }

    // The end of the game. 550 Gt C of living carbon is what the planet had
    // before the fungus; the body is that much and the world is one thing.
    function winWorld() {
        G.won = 1;
        save();
        beep(1320, 1.2, 0.05, "triangle");
        const spores = sporeGain();
        openModal(`
      <div class="eyebrow intro-eyebrow">${WORLD_GT} gigatonnes of carbon</div>
      <h2>The world is covered.</h2>
      <p class="flavor">There is no soil left that is not you.</p>
      <p>Every forest, field and animal that once lived here is now one body of hyphae. The fungus holds as much carbon as the whole living planet did — and it is still hungry.</p>
      <div class="modal-grid">
        <div><span>living carbon</span><b>${fmt(G.biomass)}</b></div>
        <div><span>the whole world</span><b>${WORLD_GT} Gt C</b></div>
        <div><span>time grown</span><b>${timerStr(G.playTime)}</b></div>
        <div><span>records</span><b>${Object.keys(G.ach).length} / ${ACHIEVEMENTS.length}</b></div>
      </div>
      <p style="font-size:11.5px;color:var(--dimmer)">The bar under the biomass counter stays full, and the world stays yours. You can keep growing, or let this body fruit and try the whole climb again.</p>
      <div class="modal-actions">
        <button class="btn ghost" data-close>Keep growing</button>
        ${spores ? `<button class="btn" id="winFruit">Fruit the world · +${fmtWhole(spores)} spores</button>` : ""}
      </div>
    `);
        const b = $("#winFruit");
        if (b)
            b.addEventListener("click", () => {
                closeModal();
                confirmFruit();
            });
    }

    const TAB_ORDER = ["upgrades", "mutations", "spores", "goals"];

    function selectTab(name) {
        if (!TAB_ORDER.includes(name)) return;
        $$(".tab").forEach((x) =>
            x.classList.toggle("active", x.dataset.tab === name),
        );
        $$(".tab-pane").forEach((p) =>
            p.classList.toggle("active", p.dataset.pane === name),
        );
        if (name === "spores") renderSpores(true);
        if (name === "goals") {
            renderGoals(true);
            renderArchive(true);
            renderStats();
        }
        if (name === "mutations") {
            renderMutations();
            renderDriftEco(true);
        }
        if (name === "upgrades") renderUpgrades(true);
        const body = $("#tabBody");
        if (body) body.scrollTop = 0;
    }

    function refreshTabs() {
        const sporeDot = $('.tab[data-tab="spores"] .dot');
        if (sporeDot)
            sporeDot.classList.toggle(
                "hidden",
                !SPORE_NODES.some(
                    (n) => treeLvl(n.id) < n.max && G.spores >= nodeCost(n),
                ),
            );
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
        renderCondition(force);
        renderScars(force);
        renderArchive(force);
        renderDriftEco(force);
        renderDriftDock(force);
        renderStage();
        refreshTabs();
        updateFrenzyBadge();
        updateAutoBadge();
    }

    let colonySig = "";
    let knownTiers = -1;
    function renderColoniesIfNeeded() {
        const sig = TIERS.map((t, i) => (tierUnlocked(i) ? 1 : 0)).join("");
        if (sig !== colonySig) {
            colonySig = sig;
            renderColonies();
        }
        const count = TIERS.filter((_, i) => tierUnlocked(i)).length;
        if (knownTiers >= 0 && count > knownTiers && G.started) {
            toast(`New colony unlocked — ${TIERS[count - 1].name}`, "green");
            beep(520, 0.14, 0.045, "triangle");
        }
        knownTiers = count;
    }

    function updateFrenzyBadge() {
        const b = $("#frenzyBadge");
        if (S.frenzied) {
            b.classList.remove("hidden");
            b.textContent = `×${fmt(G.frenzyMul)} · ${Math.ceil(S.frenzyLeft)}s`;
        } else {
            b.classList.add("hidden");
        }
    }

    function updateAutoBadge() {
        const b = $("#autoBadge");
        b.classList.toggle("hidden", !treeLvl("automation"));
        // Automation waits for the player to buy a colony in this body; starting
        // threads from Recollection do not count as a purchase.
        const active = G.autoBuy && G.boughtColony;
        b.classList.toggle("muted", !active);
        b.textContent = active ? "auto ✓" : "auto";
        b.title = active
            ? "Auto-buy is on: it spends up to 10% of your biomass three times a second on the best-value colony, and waits a moment after you tap. Click to pause."
            : G.boughtColony
              ? "Auto-buy is paused. Click to let it buy the best-value colony again."
              : "Auto-buy waits for your first colony purchase. Buy one colony to start it.";
    }

    /* ── modal ───────────────────────────────────────────────── */
    function openModal(html, locked) {
        // A modal takes the screen; a record card queued behind it would be missed.
        hideRecord(true);
        // The coach is non-modal, but two competing overlays are one too many.
        hideCoach();
        R.modalOpen = true;
        R.modalLocked = !!locked;
        const root = $("#modalRoot");
        root.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
        root.classList.add("open");
        root.setAttribute("aria-hidden", "false");
        if (!locked) {
            $$("[data-close]", root).forEach((b) =>
                b.addEventListener("click", closeModal),
            );
        }
        const first = $(".btn, .choice", root);
        if (first) setTimeout(() => first.focus({ preventScroll: true }), 60);
    }

    function closeModal() {
        R.modalLocked = false;
        const root = $("#modalRoot");
        root.classList.remove("open");
        root.innerHTML = "";
        root.setAttribute("aria-hidden", "true");
        R.modalOpen = false;
        setTimeout(() => {
            pumpRecords();
            syncOnboarding();
            if (G.pendingDrafts > 0) maybeShowDraft();
        }, 220);
        save();
    }

    function showIntro() {
        // The intro is a mood, not a manual. Each mechanic gets its own lesson
        // after Begin, so this screen stays short enough to actually read.
        openModal(
            `
      <div class="eyebrow intro-eyebrow">an incremental about the last spore</div>
      <h2 class="intro-title">SPOREFALL</h2>
      <p class="flavor">Something under the ash is still hungry.</p>
      <p>A dead world. A single spore, buried and patient. You are the buried heart of a fungus that has eaten everything else, and now there is only the long work of growing back.</p>
      <p style="font-size:11.5px;color:var(--dimmer);margin-bottom:18px">Feed the heart. The rest will follow.</p>
      <div class="modal-actions"><button class="btn" id="beginBtn">Begin</button></div>
      <p style="font-size:10.5px;margin:14px 0 0;color:var(--dimmer);font-family:var(--mono)">progress saves itself · no account, no downloads</p>
    `,
            true,
        );
        $("#beginBtn").addEventListener("click", () => {
            G.started = true;
            G.seenIntro = true;
            soundOnGesture();
            syncMusic();
            scheduleDrift();
            closeModal();
        });
    }

    /* ── onboarding ──────────────────────────────────────────── */
    // The whole curriculum is this list. To introduce a new mechanic, append one
    // object: `when` gates when it is relevant, `done` observes game state,
    // `target` points at the surface to highlight, and `cta.run` opens that
    // surface. The engine below does not need to change for a normal lesson.
    const ONBOARDING_STEPS = [
        {
            id: "feed",
            title: "Feed the buried heart",
            body: "Press the heart. Every touch draws biomass out of the dark. Keep going until you can afford a thread.",
            target: "#orb",
            done: (g) => g.biomass >= TIERS[0].cost || g.colonies[0] > 0,
        },
        {
            id: "colony",
            title: "Spend it on a thread",
            body: "Buy a Hyphal Thread. Colonies keep producing while you do nothing, so the body can grow without your hand.",
            target: () =>
                document.querySelector("#colonyList .colony:not(.locked)"),
            done: (g) => !!g.boughtColony,
        },
        {
            id: "upgrade",
            title: "Take a one-time path",
            body: "Upgrades are bought once and last for this body. Open Upgrades and take First Taste when you can afford it.",
            target: () => {
                const pane = document.querySelector(
                    '.tab-pane[data-pane="upgrades"].active',
                );
                if (!pane) return document.querySelector('.tab[data-tab="upgrades"]');
                return (
                    document.querySelector("#upgradeList .up.affordable") ||
                    document.querySelector("#upgradeList .up")
                );
            },
            cta: {
                label: "Open upgrades",
                run: () => openCoachTab("upgrades"),
            },
            done: (g) => Object.keys(g.upgrades).length > 0,
        },
        {
            id: "catch",
            title: "Catch what drifts",
            body: "A spore will cross the heart. Press it before it fades. Caught spores wait in the drift tray.",
            target: () => document.querySelector(".drift") || $("#stage"),
            // Give a first-time player a spore soon instead of making the lesson
            // wait out the full 42-78s cadence.
            onEnter: () => {
                if (!R.drift) {
                    const soon = G.playTime + 6;
                    R.nextDrift = Math.min(R.nextDrift || soon, soon);
                }
            },
            done: (g) => g.drifts > 0,
        },
        {
            id: "plant",
            title: "Plant the catch",
            body: "Open Strain, pick the caught spore and click an empty plot to plant it there. It grows on its own; harvest it when it ripens.",
            target: () => {
                const pane = document.querySelector(
                    '.tab-pane[data-pane="mutations"].active',
                );
                if (pane) return $("#driftEco");
                const dock = document.querySelector("#driftDock:not(.hidden)");
                if (dock) return dock;
                return document.querySelector('.tab[data-tab="mutations"]');
            },
            cta: {
                label: "Open strain",
                run: () => openCoachTab("mutations"),
            },
            done: (g) => g.driftPlants > 0,
        },
        {
            id: "harvest",
            title: "Take the harvest",
            body: "When a plot ripens, press it before the window closes. A ripe plot left alone spoils.",
            target: () => {
                const ripe = document.querySelector(".drift-plot.ripe");
                if (ripe) return ripe;
                const pane = document.querySelector(
                    '.tab-pane[data-pane="mutations"].active',
                );
                if (pane) return $("#driftEco");
                const dock = document.querySelector("#driftDock:not(.hidden)");
                if (dock) return dock;
                return document.querySelector('.tab[data-tab="mutations"]');
            },
            cta: {
                label: "Open strain",
                run: () => openCoachTab("mutations"),
            },
            done: (g) => g.driftHarvests > 0,
        },
        {
            id: "fruit",
            title: "Let the body fall",
            body: "At 30M biomass the body can fruit. Spores are permanent; the body, its colonies and its stage are compost.",
            target: () => {
                const pane = document.querySelector(
                    '.tab-pane[data-pane="spores"].active',
                );
                return pane
                    ? $("#fruitBox")
                    : document.querySelector('.tab[data-tab="spores"]');
            },
            when: () => sporeGain() > 0,
            cta: { label: "Open spores", run: () => openCoachTab("spores") },
            done: (g) => g.fruits > 0,
        },
        {
            id: "evolve",
            title: "Take a larger world",
            body: "The first stage is finished. Evolve when you choose: the body, its colonies and its biomass stay. Only fruiting resets a run.",
            target: () => $("#evolveBtn"),
            when: () => G.stage === 0 && stageReady(STAGES[1]),
            cta: { label: "Evolve", run: () => confirmEvolve() },
            done: (g) => g.stage > 0,
        },
    ];

    function currentOnboardingStep() {
        if (!G.onboarding) return null;
        for (const step of ONBOARDING_STEPS) {
            if (G.onboarding.done.includes(step.id)) continue;
            // A review walks every lesson, even one whose moment has passed.
            if (!R.coachReview && step.when && !step.when(G, S)) continue;
            return step;
        }
        return null;
    }

    function markOnboardingStep(id, quiet) {
        if (!G.onboarding) G.onboarding = freshOnboarding();
        if (G.onboarding.done.includes(id)) return false;
        G.onboarding.done.push(id);
        if (!quiet) save();
        return true;
    }

    function clearCoachTarget() {
        if (R.coachTarget) R.coachTarget.classList.remove("coach-target");
        R.coachTarget = null;
    }

    function hideCoach() {
        const el = $("#coach");
        if (el) el.classList.add("hidden");
        document.body.classList.remove("coach-on");
        clearCoachTarget();
        R.coachStepId = null;
    }

    function coachTargetFor(step) {
        if (!step || !step.target) return null;
        try {
            return typeof step.target === "function"
                ? step.target()
                : $(step.target);
        } catch (e) {
            return null;
        }
    }

    function setCoachTarget(step) {
        const next = coachTargetFor(step);
        if (next === R.coachTarget) return;
        clearCoachTarget();
        R.coachTarget = next;
        if (next) next.classList.add("coach-target");
    }

    function focusCoachTarget() {
        const el = R.coachTarget;
        if (!el) return;
        const calm = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;
        el.scrollIntoView({
            block: "center",
            inline: "nearest",
            behavior: calm ? "auto" : "smooth",
        });
        el.classList.remove("coach-flash");
        void el.offsetWidth;
        el.classList.add("coach-flash");
        setTimeout(() => el.classList.remove("coach-flash"), 900);
    }

    function renderCoach(step) {
        const el = $("#coach");
        if (!el) return;
        const title = $("#coachTitle");
        const body = $("#coachBody");
        const count = $("#coachCount");
        const cta = $("#coachNext");
        const titleText = step.title || "";
        const bodyText =
            typeof step.body === "function" ? step.body(G, S) : step.body || "";
        const ctaText = R.coachReview
            ? "Next tip"
            : (step.cta && step.cta.label) ||
              (step.doneOnNext ? "Got it" : "Show me");
        const countText = `${ONBOARDING_STEPS.indexOf(step) + 1} / ${ONBOARDING_STEPS.length}`;
        if (title && title.textContent !== titleText)
            title.textContent = titleText;
        if (body && body.textContent !== bodyText) body.textContent = bodyText;
        if (count && count.textContent !== countText)
            count.textContent = countText;
        if (cta && cta.textContent !== ctaText) cta.textContent = ctaText;
        el.classList.remove("hidden");
        document.body.classList.add("coach-on");
        R.coachStepId = step.id;
        setCoachTarget(step);
    }

    function openCoachTab(name) {
        selectTab(name);
        setTimeout(() => {
            syncOnboarding();
            focusCoachTarget();
        }, 140);
    }

    function syncOnboarding() {
        if (
            !G.started ||
            !G.onboarding ||
            G.onboarding.skipped ||
            R.modalOpen ||
            G.pendingDrafts > 0
        ) {
            hideCoach();
            return;
        }

        let step;
        if (R.coachReview) {
            step = currentOnboardingStep();
            if (!step) {
                R.coachReview = false;
                toast("Tips done.", "gold");
                hideCoach();
                return;
            }
        } else {
            // Record anything the player already did, even if its lesson is no
            // longer eligible (fruiting is the obvious case: its `when` goes
            // false the moment the body falls). Lessons are skipped, not
            // replayed; Replay tips is the explicit review mode above.
            let marked = false;
            for (const s of ONBOARDING_STEPS) {
                if (G.onboarding.done.includes(s.id)) continue;
                if (s.done && s.done(G, S)) {
                    if (markOnboardingStep(s.id, true)) marked = true;
                }
            }

            step = currentOnboardingStep();
            for (
                let guard = 0;
                step && guard < ONBOARDING_STEPS.length + 1;
                guard++
            ) {
                if (step.done && step.done(G, S)) {
                    if (markOnboardingStep(step.id, true)) marked = true;
                    step = currentOnboardingStep();
                    continue;
                }
                break;
            }
            if (marked) save();
            if (!step) {
                hideCoach();
                return;
            }
        }
        if (!R.coachEntered.has(step.id)) {
            R.coachEntered.add(step.id);
            if (typeof step.onEnter === "function") step.onEnter();
        }
        renderCoach(step);
    }

    function runCoachCta() {
        const step = currentOnboardingStep();
        if (!step) return;
        // In a review the CTA only steps to the next lesson; the surfaces stay
        // pointed at, but nothing is bought or opened on the player's behalf.
        if (R.coachReview) {
            markOnboardingStep(step.id);
            R.coachEntered.add(step.id);
            syncOnboarding();
            return;
        }
        if (step.cta && typeof step.cta.run === "function") step.cta.run();
        if (step.doneOnNext) {
            markOnboardingStep(step.id);
            syncOnboarding();
            return;
        }
        if (!step.cta) focusCoachTarget();
    }

    function skipOnboarding() {
        if (!G.onboarding) return;
        G.onboarding.skipped = true;
        R.coachReview = false;
        save();
        hideCoach();
        toast("Tips off — replay them from the menu.", "gold");
    }

    function replayOnboarding() {
        G.onboarding = freshOnboarding();
        R.coachStepId = null;
        R.coachReview = true;
        R.coachEntered = new Set();
        clearCoachTarget();
        save();
        syncOnboarding();
    }

    function confirmFruit() {
        const gainAmt = sporeGain();
        if (!gainAmt) return;
        const pending = G.pendingDrafts;
        const garden =
            G.driftTray.length + G.driftPlots.filter((p) => !!p).length;
        openModal(`
      <div class="eyebrow intro-eyebrow">let go</div>
      <h2>Fruit the body?</h2>
      <p class="flavor">The mycelium collapses into a cloud of spores. All of this body's biomass is spent in the release; its colonies, upgrades, mutations and stage return to the soil, and a new body begins as a spore. The world keeps a scar of this one and wakes the next under a new condition.</p>
      <div class="modal-grid">
        <div><span>spores released</span><b style="color:var(--gold)">+${fmtWhole(gainAmt)}</b></div>
        <div><span>spores after</span><b style="color:var(--gold)">${fmtWhole(G.spores + gainAmt)}</b></div>
        <div><span>biomass lost</span><b>${fmt(G.biomass)}</b></div>
        <div><span>kept</span><b>spores, records, spore tree</b></div>
      </div>
      ${pending ? `<p style="font-size:11.5px;color:var(--gold)">You have ${pending} unspent mutation draft${pending > 1 ? "s" : ""}. They will be lost.</p>` : ""}
      ${garden ? `<p style="font-size:11.5px;color:var(--rust)">${garden} caught or planted drifting spore${garden === 1 ? "" : "s"} will be lost with the body.</p>` : ""}
      <div class="modal-actions">
        <button class="btn ghost" data-close>Not yet</button>
        <button class="btn" id="doFruit">Release spores</button>
      </div>
    `);
        $("#doFruit").addEventListener("click", () => {
            closeModal();
            fruit();
        });
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
        <div><span>sound</span><b>${G.sound ? "on" : "off"}</b></div>
        <div><span>music</span><b>${G.sound ? "♪ sporefall — looping" : "muted"}</b></div>
        <div><span>offline production</span><b>${Math.round(S.offline * 100)}%</b></div>
        <div><span>production now</span><b>${fmt(S.bps)}/s</b></div>
        <div><span>fruits</span><b>${G.fruits}</b></div>
        <div><span>lifetime biomass</span><b>${fmt(G.totalEver)}</b></div>
        <div><span>world covered</span><b>${worldPctText(worldCover())}</b></div>
      </div>
      <div class="modal-actions" style="justify-content:flex-start">
        <button class="btn ghost" id="saveNow">Save now</button>
        <button class="btn ghost" id="replayTips">Replay tips</button>
        <button class="btn ghost" id="exportSave">Export</button>
        <button class="btn ghost" id="importSave">Import</button>
        <button class="btn danger" id="hardReset">Erase everything</button>
      </div>
      <div class="modal-actions">
        <button class="btn" data-close>Close</button>
      </div>
      <p style="font-size:10.5px;margin-top:14px;color:var(--dimmer)">SPOREFALL — a small game about growing back. Autosaves every 15 seconds · press space to feed.</p>
    `);
        $("#saveNow").addEventListener("click", () => {
            save();
            toast("Saved.");
        });
        $("#replayTips").addEventListener("click", () => {
            replayOnboarding();
            closeModal();
            toast("Tips on.", "gold");
        });
        $("#exportSave").addEventListener("click", exportSave);
        $("#importSave").addEventListener("click", importSave);
        $("#hardReset").addEventListener("click", () => {
            openModal(`
        <div class="eyebrow intro-eyebrow">compost</div>
        <h2>Erase everything?</h2>
        <p>This deletes your spores, your spore tree, and every record. There is no undoing it. The fungus will not remember you.</p>
        <div class="modal-actions">
          <button class="btn ghost" data-close>Keep living</button>
          <button class="btn danger" id="confirmWipe">Erase</button>
        </div>
      `);
            $("#confirmWipe").addEventListener("click", () => {
                localStorage.removeItem(SAVE_KEY);
                G = freshState();
                colonySig = "";
                R.upSig = "";
                R.sporeSig = "";
                R.goalSig = "";
                startRun();
                applyStageLook();
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
        $("#saveText").value = btoa(
            unescape(encodeURIComponent(JSON.stringify(G))),
        );
        $("#copySave").addEventListener("click", () => {
            const ta = $("#saveText");
            ta.select();
            navigator.clipboard?.writeText(ta.value).then(
                () => toast("Save copied."),
                () => toast("Select and copy manually."),
            );
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
        $("#doLoad").addEventListener("click", () => {
            try {
                const raw = JSON.parse(
                    decodeURIComponent(
                        escape(atob($("#loadText").value.trim())),
                    ),
                );
                G = Object.assign(freshState(), raw);
                G.v = 4;
                G.colonies = TIERS.map(
                    (_, i) => (raw.colonies && raw.colonies[i]) || 0,
                );
                // Newer saves carry a world condition and a drift garden. An
                // older import gets a condition and empty garden instead of
                // rendering undefined state.
                if (!WORLD_CONDITION_BY_ID[G.condition])
                    G.condition = rollWorldCondition(null, !G.fruits);
                if (!Array.isArray(G.archive)) G.archive = [];
                if (!Array.isArray(G.scars)) G.scars = [];
                G.scarTotal = Number.isFinite(Number(G.scarTotal))
                    ? Math.max(0, Math.floor(Number(G.scarTotal)))
                    : G.scars.length;
                G.runTime = Number.isFinite(Number(G.runTime))
                    ? Math.max(0, Number(G.runTime))
                    : 0;
                if (!Array.isArray(G.driftTray)) G.driftTray = [];
                if (!Array.isArray(G.driftPlots))
                    G.driftPlots = Array(DRIFT_PLOTS).fill(null);
                let importedSeq = 0;
                G.driftTray = G.driftTray
                    .filter((s) => s && DRIFT_SPECIES[s.species])
                    .slice(0, DRIFT_TRAY_MAX)
                    .map((s) => ({ id: ++importedSeq, species: s.species }));
                G.driftPlots = Array.from(
                    { length: DRIFT_PLOTS },
                    (_, i) => {
                        const p = G.driftPlots[i];
                        if (!p || !DRIFT_SPECIES[p.species]) return null;
                        return {
                            id: ++importedSeq,
                            species: p.species,
                            plantedAt: Number(p.plantedAt) || Date.now(),
                            readyAt: Number(p.readyAt) || Date.now(),
                            spoilAt: Number(p.spoilAt) || Date.now(),
                        };
                    },
                );
                G.driftSeq = importedSeq;
                G.blightUntil = Number.isFinite(Number(G.blightUntil))
                    ? Number(G.blightUntil)
                    : 0;
                R.mergePick = [];
                colonySig = "";
                R.upSig = "";
                R.sporeSig = "";
                R.goalSig = "";
                R.conditionSig = "";
                R.scarSig = "";
                R.archiveSig = "";
                R.gardenSig = "";
                R.dockSig = "";
                compute();
                closeModal();
                refreshAll(true);
                save();
                toast("Strain restored.");
            } catch (err) {
                toast("That is not a valid save.");
            }
        });
    }

    /* ── record popups ───────────────────────────────────────── */
    // Records land in bursts — one big purchase can set three — so they queue and
    // appear one at a time. The card never pauses the game and leaves on its own;
    // clicking it dismisses the card early. While a modal is open the queue waits.
    const RECORD_QUEUE = [];
    const RECORD_MS = 5200;
    let recordTimer = null,
        recordShown = null;

    function recordPopup(a) {
        RECORD_QUEUE.push(a);
        pumpRecords();
    }

    function pumpRecords() {
        if (recordShown || R.modalOpen || !RECORD_QUEUE.length) return;
        const a = RECORD_QUEUE.shift(),
            root = $("#recordPop");
        if (!root) {
            RECORD_QUEUE.length = 0;
            return;
        }
        recordShown = a;
        const held = Object.keys(G.ach).length;
        root.setAttribute("aria-hidden", "false");
        root.innerHTML = `
      <div class="record-card" role="status">
        <div class="record-medal" aria-hidden="true">${achIcon(a.id, "✦")}</div>
        <div class="record-body">
          <div class="record-eyebrow">record set · ${held} of ${ACHIEVEMENTS.length}</div>
          <div class="record-name">${a.name}</div>
          <div class="record-desc">${a.desc}</div>
        </div>
        <div class="record-bonus">+${Math.round(ACH_BONUS * 100)}%<span>production</span></div>
        <i class="record-bar" aria-hidden="true"></i>
      </div>`;
        root.classList.add("open");
        $(".record-card", root).addEventListener("click", () => hideRecord());
        beep(932, 0.32, 0.045, "triangle");
        setTimeout(() => beep(1397, 0.6, 0.035, "triangle"), 110);
        recordTimer = setTimeout(() => hideRecord(), RECORD_MS);
    }

    function hideRecord(requeue) {
        if (!recordShown) return;
        clearTimeout(recordTimer);
        recordTimer = null;
        if (requeue) RECORD_QUEUE.unshift(recordShown);
        recordShown = null;
        const root = $("#recordPop");
        if (root) {
            root.classList.remove("open");
            root.setAttribute("aria-hidden", "true");
            setTimeout(() => {
                if (!recordShown && root.isConnected) root.innerHTML = "";
            }, 230);
        }
        setTimeout(pumpRecords, 270);
    }

    /* ── toasts ──────────────────────────────────────────────── */
    // A fast upgrade run can fire a dozen toasts in a few seconds. Keep the
    // stack to three so it never grows into a full-screen wall of old news.
    const TOAST_MAX = 3;
    function toast(msg, kind = "") {
        const root = $("#toasts");
        const t = document.createElement("div");
        t.className = "toast " + kind;
        t.textContent = msg;
        root.appendChild(t);
        while (root.childElementCount > TOAST_MAX)
            root.firstElementChild.remove();
        setTimeout(() => t.remove(), 3900);
    }

    /* ── music ───────────────────────────────────────────────── */
    // One looping track under everything. Browsers only allow audio after a
    // gesture, so it starts on the first touch (the intro's Begin button, usually).
    const music = $("#music");
    const MUSIC_VOL = 0.32;
    let musicFade = null;

    function musicFadeTo(target, ms) {
        if (!music) return;
        clearInterval(musicFade);
        const from = music.volume;
        if (Math.abs(from - target) < 0.01) {
            music.volume = target;
            return;
        }
        const t0 = Date.now();
        musicFade = setInterval(() => {
            const k = clamp((Date.now() - t0) / ms, 0, 1);
            music.volume = clamp(from + (target - from) * k, 0, 1);
            if (k >= 1) {
                clearInterval(musicFade);
                musicFade = null;
            }
        }, 50);
    }

    function musicPlay() {
        if (!music || !G.sound) return;
        const wasPaused = music.paused;
        if (wasPaused) {
            music.volume = 0;
            const p = music.play();
            if (p && p.catch)
                p.catch(() => {
                    /* refused until the next gesture */
                });
        }
        musicFadeTo(MUSIC_VOL, wasPaused ? 2000 : 700);
    }

    function musicPause() {
        if (!music) return;
        musicFadeTo(0, 450);
        clearTimeout(R.musicStop);
        R.musicStop = setTimeout(() => {
            if (music && !G.sound) music.pause();
        }, 520);
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
            try {
                AC = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                AC = null;
            }
        }
        if (AC && AC.state === "suspended") AC.resume();
    }
    function beep(freq, dur, vol, type = "sine") {
        if (!G.sound || !AC) return;
        const t0 = AC.currentTime;
        const osc = AC.createOscillator();
        const g = AC.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t0);
        osc.frequency.exponentialRampToValueAtTime(
            Math.max(40, freq * 0.72),
            t0 + dur,
        );
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
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(G));
        } catch (e) {
            /* storage full or blocked */
        }
    }

    function load() {
        let raw = null;
        try {
            raw = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
        } catch (e) {
            raw = null;
        }
        if (!raw) return false;
        G = Object.assign(freshState(), raw);
        G.colonies = TIERS.map(
            (_, i) => (raw.colonies && Number(raw.colonies[i])) || 0,
        );
        G.upgrades = raw.upgrades || {};
        G.mutations = Array.isArray(raw.mutations)
            ? raw.mutations.filter((id) => MUT_BY_ID[id])
            : [];
        // Graft placements are run-scoped. Old saves have none; invalid or
        // duplicated ids are dropped rather than trusted from storage.
        const savedSites =
            raw.graftSites && typeof raw.graftSites === "object"
                ? raw.graftSites
                : {};
        G.graftSites = { heart: null, nerve: null, root: null };
        const seenGrafts = new Set();
        for (const site of GRAFT_SITES) {
            const id = savedSites[site.id];
            if (GRAFT_BY_ID[id] && !seenGrafts.has(id)) {
                G.graftSites[site.id] = id;
                seenGrafts.add(id);
            }
        }
        G.v = 4;
        G.tree = raw.tree || {};
        G.ach = raw.ach || {};

        // Onboarding is additive. A save from before this system belongs to a
        // player who already sat through the old intro, so it starts skipped
        // until they choose Replay tips from the menu.
        const savedOnboarding = raw.onboarding;
        G.onboarding = freshOnboarding();
        if (savedOnboarding && typeof savedOnboarding === "object") {
            G.onboarding.done = Array.isArray(savedOnboarding.done)
                ? savedOnboarding.done.filter((id) =>
                      ONBOARDING_STEPS.some((s) => s.id === id),
                  )
                : [];
            G.onboarding.skipped = !!savedOnboarding.skipped;
        } else if (G.seenIntro) {
            G.onboarding.skipped = true;
        }

        // World memory. A save from before this feature has no condition; it
        // gets one now, and its next fruiting starts the archive.
        G.condition = WORLD_CONDITION_BY_ID[raw.condition]
            ? raw.condition
            : rollWorldCondition(null, !G.fruits);
        G.runTime = Number.isFinite(Number(raw.runTime))
            ? Math.max(0, Number(raw.runTime))
            : 0;
        G.archive = (Array.isArray(raw.archive) ? raw.archive : [])
            .filter((e) => e && Number.isFinite(Number(e.body)))
            .slice(0, WORLD_ARCHIVE_MAX)
            .map((e) => ({
                body: Math.max(1, Math.floor(Number(e.body))),
                stage: clamp(
                    Math.floor(Number(e.stage)) || 0,
                    0,
                    STAGES.length - 1,
                ),
                biomass: Math.max(0, Number(e.biomass) || 0),
                time: Math.max(0, Number(e.time) || 0),
                condition: WORLD_CONDITION_BY_ID[e.condition]
                    ? e.condition
                    : null,
                colonies: Math.max(0, Math.floor(Number(e.colonies)) || 0),
                mutations: Math.max(0, Math.floor(Number(e.mutations)) || 0),
                // Older entries predate the detail record. An empty list is
                // kept empty and the archived body reads "names not recorded"
                // only when its count says there were mutations.
                mutationIds: Array.isArray(e.mutationIds)
                    ? e.mutationIds.filter(
                          (id, i, list) =>
                              MUT_BY_ID[id] && list.indexOf(id) === i,
                      )
                    : [],
                graftSites: GRAFT_SITES.reduce((sites, site) => {
                    const id = e.graftSites && e.graftSites[site.id];
                    sites[site.id] = GRAFT_BY_ID[id] ? id : null;
                    return sites;
                }, {}),
                graftsRecorded: !!e.graftsRecorded,
                dominant: ECO_NICHE_BY_ID[e.dominant] ? e.dominant : null,
                at: Number.isFinite(Number(e.at)) ? Number(e.at) : 0,
            }));
        G.scars = (Array.isArray(raw.scars) ? raw.scars : [])
            .slice(-WORLD_SCAR_MAX)
            .map((s) => ({
                body: Math.max(1, Math.floor(Number(s && s.body)) || 1),
                stage: clamp(
                    Math.floor(Number(s && s.stage)) || 0,
                    0,
                    STAGES.length - 1,
                ),
                condition:
                    s && WORLD_CONDITION_BY_ID[s.condition]
                        ? s.condition
                        : null,
                at: Number.isFinite(Number(s && s.at))
                    ? Number(s.at)
                    : 0,
            }));
        G.scarTotal = Number.isFinite(Number(raw.scarTotal))
            ? Math.max(0, Math.floor(Number(raw.scarTotal)))
            : G.scars.length;

        // The drift garden is run-scoped, but its timers use wall-clock time so
        // it can ripen (and spoil) while the tab is closed. Bad entries are
        // dropped rather than trusted.
        let driftSeq = 0;
        G.driftTray = (Array.isArray(raw.driftTray) ? raw.driftTray : [])
            .filter((s) => s && DRIFT_SPECIES[s.species])
            .slice(0, DRIFT_TRAY_MAX)
            .map((s) => ({ id: ++driftSeq, species: s.species }));
        const rawPlots = Array.isArray(raw.driftPlots) ? raw.driftPlots : [];
        G.driftPlots = Array.from({ length: DRIFT_PLOTS }, (_, i) => {
            const p = rawPlots[i];
            if (!p || !DRIFT_SPECIES[p.species]) return null;
            const readyAt = Number(p.readyAt);
            const spoilAt = Number(p.spoilAt);
            if (!Number.isFinite(readyAt) || !Number.isFinite(spoilAt))
                return null;
            return {
                id: ++driftSeq,
                species: p.species,
                plantedAt: Number.isFinite(Number(p.plantedAt))
                    ? Number(p.plantedAt)
                    : readyAt,
                readyAt,
                spoilAt,
            };
        });
        G.driftSeq = driftSeq;
        G.driftPlants = Math.max(0, Math.floor(Number(raw.driftPlants)) || 0);
        G.driftMerges = Math.max(0, Math.floor(Number(raw.driftMerges)) || 0);
        G.driftHarvests = Math.max(
            0,
            Math.floor(Number(raw.driftHarvests)) || 0,
        );
        G.blightUntil = Number.isFinite(Number(raw.blightUntil))
            ? Number(raw.blightUntil)
            : 0;
        R.mergePick = [];
        R.gardenSig = "";
        R.scarSig = "";
        R.dockSig = "";
        // Older saves have no run flag. If they are mid-run with colonies, keep
        // automation working; a freshly fruited body starts unarmed either way.
        G.boughtColony =
            raw.boughtColony != null
                ? !!raw.boughtColony
                : !!(raw.colonies && Number(raw.colonies[0]) > 0);
        G.draftThresholds =
            Array.isArray(raw.draftThresholds) && raw.draftThresholds.length
                ? raw.draftThresholds
                : buildDraftThresholds();
        // The hand is stored as ids, because a refresh must reopen the same
        // cards. Anything stale (owned, duplicated, or unknown) is dropped.
        G.pendingDrafts = Math.max(0, Math.floor(Number(raw.pendingDrafts)) || 0);
        G.draftHand =
            G.pendingDrafts > 0 &&
            raw.draftHand &&
            typeof raw.draftHand === "object"
                ? {
                      mutations: Array.isArray(raw.draftHand.mutations)
                          ? raw.draftHand.mutations.filter(
                                (id) => MUT_BY_ID[id],
                            )
                          : [],
                      graft: GRAFT_BY_ID[raw.draftHand.graft]
                          ? raw.draftHand.graft
                          : null,
                  }
                : null;
        if (!Array.isArray(G.colonies)) G.colonies = TIERS.map(() => 0);
        G.stage = clamp(
            Math.floor(Number(raw.stage)) || 0,
            0,
            STAGES.length - 1,
        );
        G.stageTime = Number.isFinite(Number(raw.stageTime))
            ? Math.max(0, Number(raw.stageTime))
            : 0;
        G.promptedStage =
            raw.promptedStage == null ? G.stage : Number(raw.promptedStage);

        // v1 used a quadratic spore curve that could mint hundreds of thousands. The
        // new curve tops out far lower, so old balances are trimmed; purchased tree
        // levels are kept as they are.
        if ((raw.v || 1) < 2) {
            G.v = 4;
            const cap = 30;
            if (G.spores > cap || G.sporesEver > cap) {
                G.spores = Math.min(G.spores, cap);
                G.sporesEver = Math.min(G.sporesEver, cap);
                G.bestSpores = Math.min(G.bestSpores || 0, cap);
                setTimeout(
                    () =>
                        toast(
                            `Old spores were rebalanced — ${cap} kept. Your strain memory is untouched.`,
                            "gold",
                        ),
                    1400,
                );
            }
        }
        compute();
        return true;
    }

    /* ── auto-buy ────────────────────────────────────────────── */
    // Automation is deliberately modest: three decisions a second, each one
    // spending at most a tenth of what is on hand, so a body that is saving for
    // an upgrade is not emptied while it waits. It picks the colony with the most
    // production per biomass, which changes as costs grow, so purchases spread
    // across tiers instead of piling into the cheapest one. A single colony that
    // costs more than that tenth waits until the body can afford the share.
    const AUTO_BUY_EVERY = 0.35;
    const AUTO_BUY_SHARE = 0.1;
    const AUTO_BUY_MAX = 40;

    function autoBuyColonies() {
        // Never make the first colony purchase for the player. After fruiting the
        // body has none, and the auto badge stays inactive until it has one.
        if (!(G.biomass > 0) || !G.boughtColony) return;
        const pool = G.biomass * AUTO_BUY_SHARE;
        let spent = 0;
        for (let n = 0; n < AUTO_BUY_MAX; n++) {
            let best = -1,
                bestCost = 0,
                bestValue = 0;
            for (let i = 0; i < TIERS.length; i++) {
                if (!tierUnlocked(i)) continue;
                const cost = colonyCostAt(i, G.colonies[i]);
                if (cost > G.biomass || cost <= 0) continue;
                const value =
                    (TIERS[i].prod * (S.tierMults ? S.tierMults[i] : 1)) / cost;
                if (value > bestValue) {
                    bestValue = value;
                    best = i;
                    bestCost = cost;
                }
            }
            if (best < 0) break;
            if (spent + bestCost > pool) break;
            G.colonies[best] += 1;
            G.biomass -= bestCost;
            spent += bestCost;
            if (spent >= pool) break;
        }
        if (spent > 0) {
            compute();
            refreshHeader();
            renderEcology();
        }
    }

    /* ── tick ────────────────────────────────────────────────── */
    let lastT = performance.now();
    let lastFrameWall = Date.now();
    let uiAccum = 0;

    function update(dt) {
        if (!G.started) return;
        G.playTime += dt;
        G.stageTime += dt;
        G.runTime += dt;

        compute();

        const earned = S.bps * dt;
        if (earned > 0) gain(earned);

        // frenzy expiry
        if (G.frenzyUntil && Date.now() >= G.frenzyUntil) {
            G.frenzyUntil = 0;
            G.frenzyMul = 0;
            compute();
        }

        // auto-buy. It waits for a beat after a tap so a fast clicking streak is
        // not interrupted by the counter dropping under it every third of a second.
        const autoIdle = performance.now() - (R.lastTap || 0) > 900;
        if (G.autoBuy && treeLvl("automation") && G.boughtColony && autoIdle) {
            R.autoAccum = (R.autoAccum || 0) + dt;
            if (R.autoAccum > AUTO_BUY_EVERY) {
                R.autoAccum = 0;
                autoBuyColonies();
            }
        }

        // molt mutation
        if (S.autoGain && G.playTime - G.autoGainAt >= S.autoGain.every) {
            G.autoGainAt = G.playTime;
            const amount = S.bps * S.autoGain.seconds;
            if (amount > 0) {
                gain(amount);
                toast(`Molt — +${fmt(amount)} biomass`, "gold");
            }
        }

        // drifting spores
        if (G.playTime >= R.nextDrift && !R.drift) spawnDrift();
        updateDrift(dt);

        // the drift garden ripens and spoils on wall-clock time, so it keeps
        // working while the tab is closed
        R.gardenAccum += dt;
        if (R.gardenAccum > 0.5) {
            R.gardenAccum = 0;
            updateGarden();
            renderDriftEco();
            renderDriftDock();
        }

        // drafts
        checkDrafts();

        // onboarding: cheap state poll, so a lesson advances on an action without
        // every buy/click function having to know the tutorial exists
        R.coachAccum = (R.coachAccum || 0) + dt;
        if (R.coachAccum > 0.35) {
            R.coachAccum = 0;
            syncOnboarding();
        }

        // achievements (cheap check at 2 Hz)
        R.achAccum = (R.achAccum || 0) + dt;
        if (R.achAccum > 0.5) {
            R.achAccum = 0;
            maybeAchievements();
        }

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
            if ($('.tab-pane[data-pane="goals"]').classList.contains("active"))
                renderStats();
            if ($('.tab-pane[data-pane="spores"]').classList.contains("active"))
                updateFruitValues();
            if (
                $('.tab-pane[data-pane="mutations"]').classList.contains(
                    "active",
                )
            )
                updateDraftLine();
            renderGoals();
            renderStage();
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
        G.stageTime += span;
        G.runTime += span;
        compute();
        gain(S.bps * span * rate);
        checkDrafts();
        maybeAchievements();
        refreshHeader();
        renderColonyValues();
        renderGarden();
        updateFrenzyBadge();
        // A throttled tab still makes progress through this path, so a lesson
        // must not wait for the next animation frame to notice it is finished.
        syncOnboarding();
    }

    /* ── background canvas ───────────────────────────────────── */
    const bg = $("#bg");
    const ctx = bg.getContext("2d");
    let particles = [];
    let dpr = 1;

    function resizeCanvas() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        bg.width = Math.floor(innerWidth * dpr);
        bg.height = Math.floor(innerHeight * dpr);
        bg.style.width = innerWidth + "px";
        bg.style.height = innerHeight + "px";
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

    const STAGE_TINT = [
        [147, 242, 195],
        [176, 236, 152],
        [240, 204, 138],
        [150, 214, 238],
        [214, 192, 250],
    ];

    function drawBg(t, dt) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, innerWidth, innerHeight);
        const tint = STAGE_TINT[stageIndex()] || STAGE_TINT[0];
        for (const p of particles) {
            p.y += p.vy * dt;
            p.x += (p.vx + Math.sin(t * 0.0004 + p.p) * 6) * dt;
            if (p.y < -10) {
                p.y = innerHeight + 10;
                p.x = Math.random() * innerWidth;
            }
            if (p.x < -20) p.x = innerWidth + 20;
            if (p.x > innerWidth + 20) p.x = -20;
            const flicker = 0.65 + 0.35 * Math.sin(t * 0.0012 * p.s + p.p);
            const grd = ctx.createRadialGradient(
                p.x,
                p.y,
                0,
                p.x,
                p.y,
                p.r * 7,
            );
            grd.addColorStop(
                0,
                `rgba(${tint[0]},${tint[1]},${tint[2]},${p.a * flicker})`,
            );
            grd.addColorStop(1, `rgba(${tint[0]},${tint[1]},${tint[2]},0)`);
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
                G.runTime += capped;
                const gained = S.bps * capped * S.offline;
                if (gained > 0) {
                    gain(gained);
                    setTimeout(() => showOffline(elapsed, gained), 350);
                }
            }
        }

        compute();
        applyStaticIcons();
        colonySig = "";
        syncBuyModes();
        applyStageLook();
        const artMq = window.matchMedia(PHONE_ART_MQ);
        const onArtMq = () => {
            syncStageArtSources();
            preloadStageArt();
        };
        if (artMq.addEventListener) artMq.addEventListener("change", onArtMq);
        else artMq.addListener(onArtMq);
        window.addEventListener("resize", onArtMq);
        refreshAll(true);
        // Clear plots that spoiled while the tab was closed, before the first
        // frame draws them as if they were still ripe.
        updateGarden(true);
        syncFxMode();
        resizeCanvas();
        setTimeout(preloadStageArt, 900);

        rotateWhisper(true);

        if (!hadSave || !G.seenIntro) {
            showIntro();
        } else {
            scheduleDrift();
            if (G.pendingDrafts > 0) setTimeout(maybeShowDraft, 700);
            else setTimeout(syncOnboarding, 450);
        }

        // orb
        const orb = $("#orb");
        orb.addEventListener("pointerdown", (ev) => {
            ev.preventDefault();
            soundOnGesture();
            doClick(ev.clientX, ev.clientY);
        });
        orb.addEventListener("keydown", (ev) => {
            // `repeat` is the browser auto-repeating a held key. A keyboard press
            // feeds once; holding the key must not become a second click loop.
            if (ev.repeat) return;
            if (ev.key === "Enter" || ev.key === " ") {
                ev.preventDefault();
                soundOnGesture();
                doClick();
            }
        });

        // space anywhere
        window.addEventListener("keydown", (ev) => {
            if (ev.repeat) return;
            if (
                ev.code === "Space" &&
                !R.modalOpen &&
                ev.target === document.body
            ) {
                ev.preventDefault();
                soundOnGesture();
                doClick();
            }
            if (ev.key === "Escape" && R.modalOpen && !R.modalLocked)
                closeModal();
        });

        // buy modes
        $("#buyModes").addEventListener("click", (ev) => {
            const b = ev.target.closest("button");
            if (!b) return;
            $$("#buyModes button").forEach((x) =>
                x.classList.toggle("active", x === b),
            );
            const v = b.dataset.amount;
            G.buyAmount = v === "max" ? "max" : Number(v);
            renderColonyValues();
            save();
        });

        // tabs
        $("#tabs").addEventListener("click", (ev) => {
            const b = ev.target.closest(".tab");
            if (!b) return;
            selectTab(b.dataset.tab);
        });

        // Phones: swipe the panel left or right to move between the four menus.
        // A vertical drag still scrolls, and a swipe that switches tabs swallows
        // the click it would otherwise send to whatever card ended under the thumb.
        const tabBody = $("#tabBody");
        let swipe = null;
        let swallowTabClick = false;
        tabBody.addEventListener(
            "touchstart",
            (ev) => {
                if (R.modalOpen || ev.touches.length !== 1) {
                    swipe = null;
                    return;
                }
                const t = ev.touches[0];
                swipe = { x: t.clientX, y: t.clientY, at: Date.now() };
            },
            { passive: true },
        );
        tabBody.addEventListener(
            "touchend",
            (ev) => {
                if (!swipe) return;
                const t = ev.changedTouches[0];
                if (!t) {
                    swipe = null;
                    return;
                }
                const dx = t.clientX - swipe.x,
                    dy = t.clientY - swipe.y;
                const quick = Date.now() - swipe.at < 700;
                swipe = null;
                if (
                    !quick ||
                    Math.abs(dx) < 48 ||
                    Math.abs(dx) < Math.abs(dy) * 1.6
                )
                    return;
                const current = $(".tab.active")?.dataset.tab || TAB_ORDER[0];
                const next =
                    TAB_ORDER[TAB_ORDER.indexOf(current) + (dx < 0 ? 1 : -1)];
                if (!next) return;
                selectTab(next);
                swallowTabClick = true;
                setTimeout(() => {
                    swallowTabClick = false;
                }, 260);
            },
            { passive: true },
        );
        tabBody.addEventListener(
            "click",
            (ev) => {
                if (!swallowTabClick) return;
                swallowTabClick = false;
                ev.preventDefault();
                ev.stopPropagation();
            },
            true,
        );

        $("#menuBtn").addEventListener("click", showMenu);
        $("#coachSkip").addEventListener("click", skipOnboarding);
        $("#coachNext").addEventListener("click", runCoachCta);
        $("#evolveBtn").addEventListener("click", confirmEvolve);
        $("#stageChip").addEventListener("click", stageModal);
        $("#worldChip").addEventListener("click", stageModal);
        $("#driftDock").addEventListener("click", () => selectTab("mutations"));

        $("#soundBtn").addEventListener("click", () => {
            G.sound = !G.sound;
            if (G.sound) soundOnGesture();
            $("#soundBtn").classList.toggle("muted", !G.sound);
            $("#soundBtn").textContent = G.sound ? "♪" : "∅";
            syncMusic();
            toast(G.sound ? "Sound on." : "Sound off.");
            save();
        });
        $("#soundBtn").classList.toggle("muted", !G.sound);
        $("#soundBtn").textContent = G.sound ? "♪" : "∅";

        $("#autoBadge").addEventListener("click", () => {
            if (!treeLvl("automation")) return;
            G.autoBuy = !G.autoBuy;
            updateAutoBadge();
            save();
        });

        window.addEventListener("resize", () => {
            syncFxMode();
            resizeCanvas();
        });
        window.addEventListener("beforeunload", save);
        document.addEventListener("visibilitychange", () => {
            if (document.hidden) {
                save();
                if (music && !music.paused) {
                    clearTimeout(R.musicStop);
                    music.pause();
                }
            } else {
                lastT = performance.now();
                lastFrameWall = Date.now();
                R.nextDrift = Math.max(R.nextDrift, G.playTime + 5);
                if (G.sound && G.started) musicPlay();
            }
        });

        const tabParam = new URLSearchParams(location.search).get("tab");
        if (tabParam) {
            const t = $(`.tab[data-tab="${tabParam}"]`);
            if (t) t.click();
        }

        // Browsers only allow audio after a gesture; anything the player does counts.
        const firstGesture = () => {
            soundOnGesture();
            syncMusic();
        };
        window.addEventListener("pointerdown", firstGesture, {
            once: true,
            capture: true,
        });
        window.addEventListener("keydown", firstGesture, { once: true });
        syncMusic();

        setInterval(() => {
            save();
        }, 15000);
        setInterval(watchdog, 1000);
        requestAnimationFrame(frame);
    }

    // dev hooks, only when the page is opened with ?debug
    if (location.search.includes("debug")) {
        window.SF = {
            get G() {
                return G;
            },
            get S() {
                return S;
            },
            get R() {
                return R;
            },
            compute,
            updateGarden,
            refreshAll,
            syncOnboarding,
            replayOnboarding,
            skipOnboarding,
            ONBOARDING_STEPS,
            fruit,
            startRun,
            save,
            load,
            spawnDrift,
            collectDrift,
            plantDrift,
            harvestPlot,
            doMerge,
            archiveBody,
            rollWorldCondition,
            evolve,
            stageModal,
            stageReady,
            stageIndex,
            maybeAchievements,
            grant: (n) => {
                G.biomass += n;
                G.runTotal += n;
                G.totalEver += n;
                compute();
                refreshAll(true);
            },
        };
        // let the QA harness land on a fruiting moment (?debug&auto=fruit)
        if (new URLSearchParams(location.search).get("auto") === "fruit")
            setTimeout(fruit, 700);
    }

    if (document.readyState === "loading")
        document.addEventListener("DOMContentLoaded", init);
    else init();

    function animateCircles() {
        const circles = document.querySelectorAll("svg#biome circle");

        circles.forEach((circle) => {
            const duration = 10 + Math.random() * 3; // 10s to 30s
            const delay = Math.random() * 5; // 0s to 5s
            // Set transform-origin to the center of the circle for scale animation
            // const cx = circle.getAttribute("cx");
            // const cy = circle.getAttribute("cy");
            // circle.style.transformOrigin = `\${cx}px \${cy}px`;
            // circle.style.fill = 'red';
            circle.style.animation = 'pulse ' + duration + 's ease infinite ' + delay + 's';
        });
    }
    setTimeout(() => {
        animateCircles();
    }, 1000);
})();
