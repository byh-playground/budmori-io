// Farm food -> exclusive target -> actual meals/growth -> checkpoint and disk resume.
// The harness loads only the pinned model SDKs: no renderer, RAF or GPU.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = fileURLToPath(new URL('../', import.meta.url)),
    OUT = path.join(ROOT, 'tests/output/food-reservations');
fs.mkdirSync(OUT, { recursive: true });
const SERVER = http.createServer((request, response) => {
    if (request.url === '/model-harness.html') {
        response.setHeader('content-type', 'text/html');
        response.end('<!doctype html><title>Farm model integration</title>');
        return;
    }
    const FILE = path.resolve(ROOT, '.' + decodeURIComponent(request.url.split('?')[0]));
    if (!FILE.startsWith(ROOT) || !fs.existsSync(FILE) || !fs.statSync(FILE).isFile()) {
        response.writeHead(404).end();
        return;
    }
    response.setHeader(
        'content-type',
        { '.js': 'text/javascript', '.svg': 'image/svg+xml' }[path.extname(FILE)] || 'application/octet-stream',
    );
    response.end(fs.readFileSync(FILE));
});
await new Promise((resolve) => SERVER.listen(0, '127.0.0.1', resolve));
const BROWSER = await chromium.launch(),
    ERRORS = [];
try {
    const PAGE = await BROWSER.newPage({ locale: 'ko-KR', viewport: { width: 1280, height: 720 } });
    PAGE.on('pageerror', (error) => ERRORS.push(String(error)));
    await PAGE.goto(`http://127.0.0.1:${SERVER.address().port}/model-harness.html`);
    await PAGE.evaluate(async () => {
        globalThis.BloomGamekitDeterministic = await import('/vendor/upstream/deterministic.js');
        globalThis.BloomGamekitWorkScheduler = await import('/vendor/upstream/work-scheduler.js');
        const { Garden: GARDEN, CONFIG } = await import('/src/model/farm-model.js'),
            STATE = await import('/src/model/farm-state.js'),
            PROGRESS = await import('/src/model/farm-progress.js');
        globalThis.foodTest = { GARDEN, CONFIG, STATE, PROGRESS };
        globalThis.foodTest.check = (condition, message, detail = {}) => {
            if (!condition) {
                throw new Error(message + ' ' + JSON.stringify(detail));
            }
        };
        globalThis.foodTest.world = () => {
            const W = new GARDEN(424242);
            W.resetUnits();
            W.food.length = 0;
            W.setWorkBasisPoints(0);
            W.playerProgression.overallXp = 100;
            return W;
        };
        globalThis.foodTest.unit = (world, species, x, y, seedling = false) => {
            const W = world;
            const U = W.spawn(
                species,
                1,
                x,
                y,
                seedling ? { lineage: { temperament: 0, genes: [0, 0], seedling: { fed: 0, cooldown: 0 } } } : {},
            );
            globalThis.foodTest.check(U, 'spawn failed');
            U.growthElapsed = seedling ? 0 : U.growthDuration;
            U.z = U.vz = 0;
            U.dropLanded = true;
            if (!seedling) {
                W.recordCodex(U);
            }
            return U;
        };
        globalThis.foodTest.food = (world, x, y) => {
            const W = world;
            const F = { x, y, z: 0, vx: 0, vy: 0, vz: 0, seed: W.food.length * 0.01, phase: 'grounded', tx: x, ty: y };
            W.food.push(F);
            W._trackFoodAdded(F);
            return F;
        };
        globalThis.foodTest.step = (world, count = 1) => {
            const W = world;
            for (let tick = 0; tick < count; tick++) {
                W.step(0.05);
                globalThis.foodTest.check(W._foodSearchScheduler.metrics.lastTickUnits <= 24, 'scheduler exceeded 24');
                const O = W._foodReservations;
                globalThis.foodTest.check(O.byUnit.size === O.byFood.size, 'claim cardinality mismatch');
                for (const [U, C] of O.byUnit) {
                    globalThis.foodTest.check(
                        C.unit === U && O.byFood.get(C.food) === C && W.units.includes(U) && W.food.includes(C.food),
                        'claim lost its owner',
                    );
                }
            }
        };
    });
    const DISTRIBUTION = await PAGE.evaluate(async () => {
        const { world: WORLD, unit: UNIT, food: FOOD, step: STEP, check: CHECK, STATE } = globalThis.foodTest;
        const W = WORLD(),
            A = UNIT(W, 0, 0, 0),
            S = UNIT(W, 2, 8, 0, true);
        const F = FOOD(W, 0, 0);
        STEP(W);
        CHECK(!A.fed && W.food.includes(F), 'adult consumed next seed meal during queued search');
        CHECK(
            W._foodReservations.protectedFoods.size + Number(!!W._foodReservations.target(S)) === 1,
            'next meal was not protected',
        );
        FOOD(W, 0.1, 0);
        STEP(W);
        CHECK(A.fed, 'adult did not eat nearby surplus');
        // A cooldown ending on this tick must protect the seed despite adult-first update order.
        const C = WORLD(),
            CA = UNIT(C, 0, 0, 0),
            CS = UNIT(C, 2, 5, 0, true);
        CS.seedling.cooldown = 0.05;
        FOOD(C, 0, 0);
        STEP(C);
        CHECK(!CA.fed && CS.seedling.cooldown === 0, 'cooldown boundary lost protection');
        // Arrived adult owner wins; a distant owner yields to a closer resident.
        for (const ARRIVED of [true, false]) {
            const T = WORLD(),
                OWNER = UNIT(T, 0, ARRIVED ? 0.3 : 6, 0),
                NEAR = UNIT(T, 6, 0, 0);
            const MEAL = FOOD(T, 0, 0);
            T._rebuildFoodSpatialIndex();
            CHECK(T._foodReservations.claim(OWNER, MEAL), 'adult lease failed');
            STEP(T);
            CHECK(ARRIVED ? OWNER.fed && !NEAR.fed : NEAR.fed && !OWNER.fed, 'adult arrival priority failed');
            CHECK(!T._foodReservations.target(OWNER) && !T._foodSearchStates.has(OWNER), 'old search survived pickup');
        }
        // One resident may eat only once even when several foods overlap.
        const T = WORLD(),
            U = UNIT(T, 2, 0, 0, true);
        FOOD(T, 0, 0);
        FOOD(T, 0, 0);
        FOOD(T, 0, 0);
        STEP(T);
        CHECK(U.seedling.fed === 1 && T.food.length === 2, 'more than one meal in a tick');
        // A delivery is counted immediately, while flight/bounce has not ARRIVED yet.
        const D = WORLD(),
            D1 = UNIT(D, 2, -20, 14, true),
            D2 = UNIT(D, 2, 20, 14, true);
        D._foodReservations.prepareProtection();
        D.spawnFood(12, 8, 3, { automatic: true, from: { x: 0, y: 0, z: 0.9 } });
        CHECK(D._foodReservations.byUnit.size === 2, 'flight delivery did not cover exactly one meal per seed');
        CHECK(D.food[0].tx === D1.x && D.food[1].tx === D2.x && D.food[2].tx === 12, 'delivery distribution changed');
        const SNAP = STATE.snapshot(D),
            RESTORED = STATE.restore(SNAP);
        CHECK(JSON.stringify(STATE.snapshot(RESTORED)) === JSON.stringify(SNAP), 'flight checkpoint roundtrip changed');
        for (let i = 0; i < 40; i++) {
            STEP(D);
            STEP(RESTORED);
            CHECK(
                JSON.stringify(STATE.snapshot(D)) === JSON.stringify(STATE.snapshot(RESTORED)),
                'flight rollback diverged',
            );
        }
        const LEGACY = structuredClone(SNAP);
        delete LEGACY.foodRuntime.protectedFoods;
        for (const CLAIM of LEGACY.foodRuntime.claims) {
            delete CLAIM.grounded;
        }
        const LEGACY_WORLD = STATE.restore(LEGACY);
        STEP(LEGACY_WORLD);
        CHECK(LEGACY_WORLD.units.length === 2, 'compatible checkpoint lost residents');
        const MANUAL = WORLD();
        UNIT(MANUAL, 2, -5, 0, true);
        MANUAL.spawnFood(20, 14);
        CHECK(MANUAL.food[0].tx === 20 && MANUAL.food[0].ty === 14, 'manual click moved to seed');
        const E = WORLD(),
            DEAD = UNIT(E, 2, 0, 0, true);
        E._foodReservations.prepareProtection();
        E.spawnFood(0, 0, 1, { automatic: true });
        E.removeUnit(DEAD);
        STEP(E);
        CHECK(E._foodReservations.byUnit.size === 0, 'removed delivery recipient retained food');
        return {
            queuedProtection: true,
            cooldownBoundary: true,
            adultArrival: true,
            oneMeal: true,
            flightRollbackTicks: 40,
            manualClick: true,
        };
    });
    console.log('PASS next seed meal / nearby adult pickup / flight delivery / rollback', DISTRIBUTION);
    const AUTOMATIC = await PAGE.evaluate(async () => {
        globalThis.BloomGamekitInterpolation = await import('/vendor/upstream/interpolation.js');
        globalThis.BloomGamekitSimloop = await import('/vendor/upstream/simloop.js');
        const { FarmSession: FARM_SESSION } = await import('/src/app/farm-session.js');
        const { world: WORLD, unit: UNIT, check: CHECK } = globalThis.foodTest;
        const W = WORLD();
        for (let i = 0; i < 10; i++) {
            UNIT(W, 0, i * 0.2, 0);
        }
        const SEEDS = [UNIT(W, 2, -5, 0, true), UNIT(W, 2, 0, 0, true), UNIT(W, 2, 5, 0, true)];
        W.setWorkBasisPoints(10000);
        const SESSION = new FARM_SESSION(W, { now: () => 0 });
        let deliveries = 0,
            produced = 0,
            maxClaims = 0;
        const SPAWN = W.spawnFood;
        W.spawnFood = function (x, y, count, options) {
            CHECK(options?.automatic, 'test used manual supply');
            const BEFORE = new Set(this.food),
                N = SPAWN.call(this, x, y, count, options);
            produced += N;
            for (const F of this.food) {
                if (!BEFORE.has(F)) {
                    const U = this._foodReservations.byFood.get(F)?.unit;
                    if (U) {
                        deliveries++;
                        CHECK(Math.hypot(F.tx - U.x, F.ty - U.y) < 1e-9, 'automatic landing is not near recipient');
                    }
                }
            }
            return N;
        };
        let tick = 0;
        for (; tick < 1200 && SEEDS.some((u) => u.seedling); tick++) {
            SESSION.advance();
            maxClaims = Math.max(maxClaims, W._foodReservations.byUnit.size);
            CHECK(W._foodSearchScheduler.metrics.lastTickUnits <= 24, 'automatic flow exceeded scheduler budget');
        }
        CHECK(
            SEEDS.every((u) => !u.seedling),
            'actual workers did not grow all seeds',
            { tick, deliveries, produced, meals: SEEDS.map((u) => u.seedling?.fed) },
        );
        CHECK(
            deliveries >= 3 && produced >= 9 && W.foodTaps.produced >= 9,
            'actual impact production path was bypassed',
        );
        return {
            workers: 10,
            piles: W.piles.length,
            actualProduced: produced,
            productionCounter: W.foodTaps.produced,
            deliveries,
            growthSeconds: W.time,
            maxClaims,
        };
    });
    console.log('PASS FarmSession.advance -> advanceWork -> automatic delivery -> three meals', AUTOMATIC);
    const PILES = await PAGE.evaluate(async () => {
        const { overallXpForLevel: XP } = await import('/src/model/player-progression.js');
        const { world: WORLD, unit: UNIT, check: CHECK, CONFIG } = globalThis.foodTest,
            RESULTS = [];
        for (const COUNT of [0, 10, 50, 100, 200, 900]) {
            const W = WORLD();
            W.playerProgression.overallXp = XP(50);
            for (let i = 0; i < COUNT; i++) {
                UNIT(W, 0, (i % 40) - 20, Math.floor(i / 40) - 10);
            }
            W.setWorkBasisPoints(10000);
            const POSITIONS = JSON.stringify(W.piles.map((p) => [p.x, p.y]));
            W.refreshWorkers();
            CHECK(POSITIONS === JSON.stringify(W.piles.map((p) => [p.x, p.y])), 'worker refresh moved piles');
            let gap = Infinity;
            for (let i = 0; i < W.piles.length; i++) {
                for (let j = i + 1; j < W.piles.length; j++) {
                    gap = Math.min(gap, Math.hypot(W.piles[i].x - W.piles[j].x, W.piles[i].y - W.piles[j].y));
                }
            }
            CHECK(
                gap + 1e-9 >= CONFIG.farm.work.pileGap && CONFIG.farm.work.pileGap >= CONFIG.farm.work.pileWidth * 3,
                'pile spacing shrank',
            );
            const COUNTS = W.piles.map((p) => [...W._workAssign.values()].filter((a) => a.pile === p).length);
            CHECK(!COUNTS.length || Math.max(...COUNTS) - Math.min(...COUNTS) <= 1, 'workers not balanced');
            CHECK(
                W._workAssign.size === COUNT && Math.abs(W.workFoodPerMinute - (COUNT * 60) / 8) < 1e-9,
                'actual worker rate omitted',
            );
            CHECK(W.piles.length <= Math.ceil(COUNT / 20), 'pile COUNT exceeded target');
            if (COUNT <= 200) {
                CHECK(W.piles.length === Math.ceil(COUNT / 20), 'normal worker COUNT lost piles');
            }
            RESULTS.push({
                workers: COUNT,
                target: Math.ceil(COUNT / 20),
                piles: W.piles.length,
                minGap: Number.isFinite(gap) ? gap : null,
                perMinute: W.workFoodPerMinute,
            });
        }
        return RESULTS;
    });
    console.log('PASS worker counts / pile spacing / stable placement / actual rates', PILES);
    const OWNERSHIP = await PAGE.evaluate(() => {
        const { world: WORLD, unit: UNIT, food: FOOD, step: STEP, check: CHECK } = globalThis.foodTest,
            W = WORLD();
        const A = UNIT(W, 0, 0, 0),
            B = UNIT(W, 6, 0, 0.1),
            S = UNIT(W, 2, 0, -0.1, true),
            F = FOOD(W, 5, 0);
        FOOD(W, 6, 0);
        FOOD(W, 7, 0);
        // Adult IDs/requests precede the seed; priority must not come from insertion order.
        for (let tick = 0; tick < 40 && W._foodReservations.byUnit.size < 3; tick++) {
            STEP(W);
        }
        const O = W._foodReservations;
        CHECK(O.byUnit.size === 3, 'three exclusive targets were not assigned', { claims: O.byUnit.size });
        CHECK([...O.byFood.values()][0].unit === S && O.target(S) === F, 'seed was not first for nearest food');
        const TARGET = O.target(A);
        FOOD(W, A.x + 0.2, A.y);
        CHECK(W.requestGroundFoodTarget(A) === TARGET, 'valid target changed to newer food');
        CHECK(!W.consumeGroundFood(F, A) && !W.consumeGroundFood(F), 'another/anonymous consumer stole reserved food');
        CHECK(W.consumeGroundFood(F, S) && !O.target(S), 'owner could not consume/release');
        W.clearFoodTargetSearch(S);
        W.clearFoodTargetSearch(A);
        CHECK(!O.target(A), 'explicit cancel kept claim');
        W.removeUnit(B);
        CHECK(!O.target(B), 'removed unit retained claim');
        return {
            seedFirst: true,
            distinctTargets: 3,
            foreignConsumptionRejected: true,
            keepTarget: true,
            claimsAfterCleanup: O.byUnit.size,
        };
    });
    console.log('PASS food priority/ownership/valid target/consume/cancel/remove', OWNERSHIP);
    const LIFECYCLE = await PAGE.evaluate(() => {
        const { world: WORLD, unit: UNIT, food: FOOD, step: STEP, check: CHECK } = globalThis.foodTest;
        function reserved() {
            const W = WORLD(),
                U = UNIT(W, 0, 0, 0);
            FOOD(W, 8, 0);
            for (let t = 0; t < 20 && !W._foodReservations.target(U); t++) {
                STEP(W);
            }
            CHECK(W._foodReservations.target(U), 'no reservation');
            return { W, U };
        }
        const RESULTS = [];
        for (const KIND of ['death', 'food-removed', 'worker', 'scene', 'growth']) {
            let world, subject;
            if (KIND === 'growth') {
                world = WORLD();
                subject = UNIT(world, 0, 0, 0, true);
                const W = world,
                    U = subject;
                FOOD(W, 8, 0);
                for (let t = 0; t < 20 && !W._foodReservations.target(U); t++) {
                    STEP(W);
                }
            } else {
                ({ W: world, U: subject } = reserved());
            }
            const W = world,
                U = subject;
            if (KIND === 'death') {
                U.hp = 0;
                W.handleUnitDeath(U);
            }
            if (KIND === 'food-removed') {
                W.food.length = 0;
                STEP(W);
            }
            if (KIND === 'worker') {
                W.setWorkBasisPoints(10000);
            }
            if (KIND === 'scene') {
                W.startTower();
                STEP(W);
            }
            if (KIND === 'growth') {
                U.seedling.fed = 2;
                W.feedSeedling(U);
                CHECK(!U.seedling, 'growth did not finish');
            }
            CHECK(!W._foodReservations.target(U), 'lifecycle retained claim', { KIND });
            RESULTS.push(KIND);
        }
        const W = WORLD(),
            UNITS = [];
        for (const [S, X, Y] of [
            [0, 0, 0],
            [6, 3, 0],
            [0, -8, 6],
            [0, -7, 6],
            [6, -8, 7],
            [6, -7, 7],
        ]) {
            UNITS.push(UNIT(W, S, X, Y));
        }
        FOOD(W, 9, 0);
        FOOD(W, 10, 0);
        for (let t = 0; t < 20 && !W._foodReservations.byUnit.size; t++) {
            STEP(W);
        }
        W.setCombineSelection(0, 1);
        CHECK(W.startManualMerge(true), 'merge did not reserve materials');
        const IDS = W.mergeTasks[0].materialIds;
        CHECK(
            IDS.every((id) => !W._foodReservations.target(W.units.find((u) => u.id === id))),
            'merge retained a food claim',
        );
        RESULTS.push('merge');
        return RESULTS;
    });
    console.log('PASS lifecycle', LIFECYCLE);
    const GROWTH = await PAGE.evaluate(() => {
        const { world: WORLD, unit: UNIT, step: STEP, check: CHECK } = globalThis.foodTest,
            W = WORLD(),
            S = UNIT(W, 0, 0, 0, true),
            OBS = [];
        let previous = 0;
        for (let tick = 0; tick < 1200 && S.seedling; tick++) {
            if (tick % 10 === 0) {
                W.spawnFood(S.x, S.y, 1);
            }
            STEP(W);
            const FED = S.seedling?.fed ?? 3;
            if (FED !== previous) {
                OBS.push(FED);
                previous = FED;
            }
        }
        CHECK(!S.seedling && OBS.join(',') === '1,2,3', 'actual three meals did not mature seed', {
            OBS,
            time: W.time,
        });
        return { meals: OBS, time: W.time, remainingClaim: !!W._foodReservations.target(S) };
    });
    assert.equal(GROWTH.remainingClaim, false);
    console.log('PASS actual flight food/3 meals/growth', GROWTH);
    const CHECKPOINTS = await PAGE.evaluate(() => {
        const { world: WORLD, unit: UNIT, food: FOOD, step: STEP, check: CHECK, STATE, PROGRESS } = globalThis.foodTest,
            RESULTS = [];
        for (const PHASE of ['searching', 'ready', 'moving', 'tombstones']) {
            const W = WORLD();
            for (let i = 0; i < 12; i++) {
                UNIT(W, i % 2 ? 6 : 0, -3 + i * 0.5, 0, i >= 10);
            }
            for (let i = 0; i < 10; i++) {
                FOOD(W, 5 + i * 0.3, 2);
            }
            STEP(W);
            if (PHASE === 'searching') {
                STEP(W);
                CHECK(
                    [...W._foodSearchStates.values()].some(
                        (state) =>
                            state.status === 'searching' &&
                            (state.ringCellIndex > 0 || state.bucketIndex > 0 || state.fallbackIndex > 0),
                    ),
                    'checkpoint did not interrupt actual search work',
                );
            }
            if (PHASE !== 'searching') {
                for (let t = 0; t < 100 && !W._foodReservations.byUnit.size; t++) {
                    STEP(W);
                }
            }
            if (PHASE === 'moving') {
                STEP(W, 4);
            }
            if (PHASE === 'tombstones') {
                const FREE = W.food.find(
                    (food) => !W._foodReservations.byFood.has(food) && !W._foodReservations.protectedFoods.has(food),
                );
                CHECK(W.consumeGroundFood(FREE), 'could not remove pending snapshot slot');
            }
            const SAVED = STATE.snapshot(W),
                R = STATE.restore(SAVED);
            if (PHASE === 'tombstones') {
                CHECK(
                    SAVED.foodRuntime.snapshots.some((snapshot) => snapshot.foods.includes(null)),
                    'no consumed snapshot tombstone captured',
                );
            }
            CHECK(JSON.stringify(SAVED) === JSON.stringify(STATE.snapshot(R)), 'immediate checkpoint changed', {
                PHASE,
            });
            for (let tick = 0; tick < 180; tick++) {
                if (tick % 17 === 0) {
                    W.spawnFood(1, 1, 1);
                    R.spawnFood(1, 1, 1);
                }
                STEP(W);
                STEP(R);
                CHECK(JSON.stringify(STATE.snapshot(W)) === JSON.stringify(STATE.snapshot(R)), 'rollback diverged', {
                    PHASE,
                    tick,
                });
            }
            RESULTS.push({
                phase: PHASE,
                states: SAVED.foodRuntime.states.length,
                queued: SAVED.foodRuntime.queues.flat().length,
                claims: SAVED.foodRuntime.claims.length,
            });
            const DISK = PROGRESS.captureFarmProgress(W),
                L = PROGRESS.restoreFarmProgress(DISK);
            CHECK(
                !Object.hasOwn(DISK, 'foodRuntime') && !L._foodReservations.byUnit.size && !L._foodSearchStates.size,
                'disk restored live targets',
            );
            CHECK(PROGRESS.sameFarmProgress(DISK, PROGRESS.captureFarmProgress(L)), 'disk progress changed');
        }
        return RESULTS;
    });
    console.log('PASS exact pending/ready/moving rollback and disk contract', CHECKPOINTS);
    const LIMITS = await PAGE.evaluate(() => {
        const { world: WORLD, unit: UNIT, food: FOOD, step: STEP, check: CHECK, CONFIG } = globalThis.foodTest;
        const W = WORLD(),
            U = UNIT(W, 0, CONFIG.farm.arena.radiusX - 0.5, 0),
            F = FOOD(W, CONFIG.farm.arena.radiusX + 3, 0);
        for (let tick = 0; tick < 30 && !W._foodReservations.target(U); tick++) {
            STEP(W);
        }
        CHECK(W._foodReservations.target(U) === F, 'unreachable fixture did not acquire its near target');
        const SINCE = W._foodReservations.byUnit.get(U).since;
        let released = false;
        for (let tick = 0; tick < 200; tick++) {
            STEP(W);
            const CLAIM = W._foodReservations.byUnit.get(U);
            if (!CLAIM || CLAIM.since !== SINCE) {
                released = true;
                break;
            }
        }
        CHECK(released && W.time - SINCE < 8.1, 'stalled boundary target remained locked', { time: W.time, SINCE });
        W.food.length = 0;
        STEP(W);
        FOOD(W, U.x - 0.5, U.y);
        for (let tick = 0; tick < 80 && !U.fed; tick++) {
            STEP(W);
        }
        CHECK(U.fed, 'unit starved after a stalled target was released');
        const V = WORLD(),
            A = UNIT(V, 0, 0, 0),
            FAR = FOOD(V, 50, 0);
        CHECK(!V._foodReservations.claim(A, FAR), 'far food was reserved beyond travel budget');
        const Q = WORLD(),
            B = UNIT(Q, 0, 0, 0);
        FOOD(Q, 8, 0);
        Q.requestGroundFoodTarget(B);
        B.cooldown = 1;
        STEP(Q);
        CHECK(!Q._foodSearchStates.has(B), 'ineligible pending search survived');
        return {
            stalledReleased: true,
            wait: W.time - SINCE,
            recoveredAdultFed: U.fed,
            farClaimRejected: true,
            invalidSearchWork: Q._foodSearchScheduler.metrics.lastTickUnits,
        };
    });
    console.log('PASS stalled release, adult recovery and far travel limit', LIMITS);
    const CACHE = await PAGE.evaluate(() => {
        const { world: WORLD, unit: UNIT, food: FOOD, step: STEP, check: CHECK } = globalThis.foodTest,
            W = WORLD(),
            A = UNIT(W, 0, -20, -10),
            F = FOOD(W, 20, 10);
        FOOD(W, 20, 11);
        for (let tick = 0; tick < 50 && W._foodSearchStates.get(A)?.status !== 'empty'; tick++) {
            STEP(W);
        }
        CHECK(W._foodSearchStates.get(A)?.status === 'empty', 'negative search fixture did not complete');
        const SEQUENCE = W._foodSearchJobSequence,
            AVAILABILITY = W._foodReservations.availabilityRevision,
            B = UNIT(W, 6, 17, 10);
        CHECK(W._foodReservations.claim(B, F), 'second unit could not claim');
        W.requestGroundFoodTarget(A);
        CHECK(
            W._foodSearchJobSequence === SEQUENCE && W._foodReservations.availabilityRevision === AVAILABILITY,
            'new claim restarted a negative search',
        );
        W.clearFoodTargetSearch(B);
        W.requestGroundFoodTarget(A);
        CHECK(W._foodSearchJobSequence > SEQUENCE, 'release did not wake negative search');
        const Z = WORLD(),
            C = UNIT(Z, 0, 0, 0),
            D = UNIT(Z, 6, 1, 0),
            ONLY = FOOD(Z, 5, 0);
        Z._rebuildFoodSpatialIndex();
        CHECK(Z._foodReservations.claim(C, ONLY), 'no-free-food fixture claim failed');
        Z.requestGroundFoodTarget(D);
        CHECK(!Z._foodSearchStates.has(D), 'no-free-food request created a job');
        return { claimDoesNotWake: true, releaseWakes: true, noFreeFoodSkipsSearch: true };
    });
    console.log('PASS negative cache availability and no-free-food fast path', CACHE);
    const ROLLBACK = await PAGE.evaluate(() => {
        const { world: WORLD, unit: UNIT, step: STEP, check: CHECK, STATE } = globalThis.foodTest,
            W = WORLD(),
            POPULATION = 12;
        // Enough eaters that some wait in a search queue while others hold claims at the checkpoint.
        for (let i = 0; i < POPULATION; i++) {
            UNIT(
                W,
                i < POPULATION - 2 ? 0 : 2,
                ((i % 4) - 1.5) * 0.85,
                (Math.floor(i / 4) - 1.5) * 0.9,
                i >= POPULATION - 2,
            );
        }
        for (let tick = 0; tick < 40; tick++) {
            if (tick % 2 === 0) {
                W.spawnFood(((tick % 10) - 4.5) * 1.8, 2, 1);
            }
            STEP(W);
        }
        const SAVED = STATE.snapshot(W),
            R = STATE.restore(SAVED);
        CHECK(SAVED.foodRuntime.queues.flat().length > 0, 'checkpoint was not captured during search');
        CHECK(JSON.stringify(SAVED) === JSON.stringify(STATE.snapshot(R)), 'immediate snapshot changed');
        for (let tick = 0; tick < 180; tick++) {
            if (tick % 3 === 0) {
                W.spawnFood(((tick % 10) - 4.5) * 1.8, -2, 1);
                R.spawnFood(((tick % 10) - 4.5) * 1.8, -2, 1);
            }
            STEP(W);
            STEP(R);
            CHECK(JSON.stringify(STATE.snapshot(W)) === JSON.stringify(STATE.snapshot(R)), 'rollback diverged', {
                tick,
            });
        }
        let rejected = 0;
        for (const KIND of ['duplicate-queue', 'bad-food-index', 'oversized-cursor', 'duplicate-cell-food']) {
            const BAD = structuredClone(SAVED);
            if (KIND === 'duplicate-queue') {
                const QUEUE = BAD.foodRuntime.queues.find((queue) => queue.length);
                QUEUE.push(QUEUE[0]);
            } else if (KIND === 'bad-food-index') {
                BAD.foodRuntime.snapshots[BAD.foodRuntime.current].foods[0] = BAD.food.length;
            } else if (KIND === 'oversized-cursor') {
                BAD.foodRuntime.states[0].values.ring = 1000000;
            } else {
                const CELL = BAD.foodRuntime.snapshots[BAD.foodRuntime.current].cells[0];
                CELL[1].push(CELL[1][0]);
            }
            try {
                STATE.restore(BAD);
            } catch (error) {
                CHECK(error instanceof TypeError, 'unexpected checkpoint rejection');
                rejected++;
            }
        }
        CHECK(rejected === 4, 'corrupt checkpoint was accepted');
        return {
            population: POPULATION,
            comparedTicks: 180,
            queued: SAVED.foodRuntime.queues.flat().length,
            claims: SAVED.foodRuntime.claims.length,
            corruptionsRejected: rejected,
        };
    });
    console.log('PASS in-progress rollback and checkpoint rejection', ROLLBACK);
    assert.deepEqual(ERRORS, []);
    fs.writeFileSync(
        path.join(OUT, 'functional.json'),
        JSON.stringify(
            {
                status: 'PASS',
                ownership: OWNERSHIP,
                lifecycle: LIFECYCLE,
                growth: GROWTH,
                checkpoints: CHECKPOINTS,
                limits: LIMITS,
                cache: CACHE,
                rollback: ROLLBACK,
                errors: ERRORS,
            },
            null,
            2,
        ),
    );
} finally {
    await BROWSER.close();
    SERVER.close();
}
