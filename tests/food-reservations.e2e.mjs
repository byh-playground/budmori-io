// Farm food -> exclusive target -> actual meals/growth -> checkpoint and disk resume.
// The harness loads only the pinned model SDKs: no renderer, RAF or GPU benchmark.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const FOOD_BASELINE_REF = '0233b71335eacbaae2a0921ae758d40a40c4bc5f';

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
    const PAGE = await BROWSER.newPage();
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
                const FREE = W.food.find((food) => !W._foodReservations.byFood.has(food));
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
    const LARGE_ROLLBACK = await PAGE.evaluate(() => {
        const { world: WORLD, unit: UNIT, step: STEP, check: CHECK, STATE } = globalThis.foodTest,
            W = WORLD();
        for (let i = 0; i < 220; i++) {
            UNIT(W, i < 200 ? 0 : 2, ((i % 20) - 9.5) * 0.85, (Math.floor(i / 20) - 5) * 0.9, i >= 200);
        }
        for (let tick = 0; tick < 40; tick++) {
            if (tick % 2 === 0) {
                W.spawnFood(((tick % 10) - 4.5) * 1.8, 2, 1);
            }
            STEP(W);
        }
        const SAVED = STATE.snapshot(W),
            R = STATE.restore(SAVED);
        CHECK(SAVED.foodRuntime.queues.flat().length > 0, 'large checkpoint was not captured during search');
        CHECK(JSON.stringify(SAVED) === JSON.stringify(STATE.snapshot(R)), 'large immediate snapshot changed');
        for (let tick = 0; tick < 180; tick++) {
            if (tick % 3 === 0) {
                W.spawnFood(((tick % 10) - 4.5) * 1.8, -2, 1);
                R.spawnFood(((tick % 10) - 4.5) * 1.8, -2, 1);
            }
            STEP(W);
            STEP(R);
            CHECK(JSON.stringify(STATE.snapshot(W)) === JSON.stringify(STATE.snapshot(R)), 'large rollback diverged', {
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
            population: 220,
            comparedTicks: 180,
            queued: SAVED.foodRuntime.queues.flat().length,
            claims: SAVED.foodRuntime.claims.length,
            corruptionsRejected: rejected,
        };
    });
    console.log('PASS 220-unit in-progress rollback and checkpoint rejection', LARGE_ROLLBACK);
    if (process.argv.includes('--bench')) {
        const BASELINE_BYTES = execFileSync('git', ['show', `${FOOD_BASELINE_REF}:src/model/farm-food-field.js`], {
            cwd: ROOT,
        });
        const BASELINE = BASELINE_BYTES.toString('utf8').replace(
            /from '([^']+)'/g,
            (_, specifier) =>
                `from '${new URL(specifier, `http://127.0.0.1:${SERVER.address().port}/src/model/farm-food-field.js`).href}'`,
        );
        const BENCHMARK = await PAGE.evaluate(
            async ({ source, extended, fixed }) => {
                const URL_LOCAL = URL.createObjectURL(new Blob([source], { type: 'text/javascript' })),
                    OLD = await import(URL_LOCAL);
                URL.revokeObjectURL(URL_LOCAL);
                const ORIGINAL = OLD.FARM_FOOD_FIELD(globalThis.foodTest.GARDEN),
                    { check: CHECK, unit: UNIT } = globalThis.foodTest;
                let initialSignature = null;
                function run(type, scenario, candidate) {
                    const W = new type(424242);
                    W.resetUnits();
                    W.food.length = 0;
                    W.setWorkBasisPoints(0);
                    W.playerProgression.overallXp = 100;
                    const ADULTS = [],
                        SEEDS = [];
                    for (let i = 0; i < 200; i++) {
                        ADULTS.push(UNIT(W, 0, ((i % 20) - 9.5) * 0.85, Math.floor(i / 20) - 4.5, false));
                    }
                    for (let i = 0; i < 20; i++) {
                        SEEDS.push(UNIT(W, 2, ((i % 10) - 4.5) * 1.8, i < 10 ? -6 : 6, true));
                    }
                    CHECK(W.capacity === 220 && W.units.length === 220, 'benchmark capacity changed');
                    const INITIAL = JSON.stringify(globalThis.foodTest.STATE.snapshot(W));
                    if (initialSignature === null) {
                        initialSignature = INITIAL;
                    } else {
                        CHECK(INITIAL === initialSignature, 'benchmark initial model changed');
                    }
                    const FIRST_MEALS = new Map(),
                        GROWN = new Map(),
                        ADULT_FED = new Map(),
                        CONSUME = W.consumeGroundFood;
                    let consumed = 0,
                        offered = 0,
                        produced = 0,
                        maxBudget = 0,
                        maxClaimAge = 0,
                        initialAdultMeals = 0,
                        seedGrowthMeals = 0,
                        grownSeedAdultMeals = 0;
                    let firstGoalAt = null,
                        firstAllFedAt = null;
                    W.consumeGroundFood = function (food, unit) {
                        const OK = CONSUME.call(this, food, unit);
                        if (OK) {
                            consumed++;
                            if (ADULTS.includes(unit)) {
                                initialAdultMeals++;
                            } else if (SEEDS.includes(unit) && unit.seedling) {
                                seedGrowthMeals++;
                            } else if (SEEDS.includes(unit)) {
                                grownSeedAdultMeals++;
                            }
                            if (SEEDS.includes(unit) && !FIRST_MEALS.has(unit.id)) {
                                FIRST_MEALS.set(unit.id, W.time);
                            }
                            if (ADULTS.includes(unit) && !ADULT_FED.has(unit.id)) {
                                ADULT_FED.set(unit.id, W.time);
                            }
                        }
                        return OK;
                    };
                    const EVERY = scenario === 'scarce' ? 10 : 2,
                        MAX_TICKS = scenario === 'scarce' || extended || fixed ? 3600 : 1800,
                        START = performance.now();
                    let observation90 = null;
                    for (let tick = 0; tick < MAX_TICKS; tick++) {
                        if (tick % EVERY === 0) {
                            const I = offered++;
                            produced += W.spawnFood(((I % 10) - 4.5) * 1.8, ((Math.floor(I / 10) % 4) - 1.5) * 3, 1);
                        }
                        W.step(0.05);
                        const USED = W._foodSearchScheduler.metrics.lastTickUnits;
                        maxBudget = Math.max(maxBudget, USED);
                        CHECK(USED <= 24, 'benchmark exceeded search budget');
                        if (candidate) {
                            const O = W._foodReservations;
                            CHECK(O.byFood.size === O.byUnit.size, 'benchmark duplicate claim');
                            for (const CLAIM of O.byUnit.values()) {
                                maxClaimAge = Math.max(maxClaimAge, W.time - CLAIM.since);
                                CHECK(
                                    O.byFood.get(CLAIM.food) === CLAIM && W.food.includes(CLAIM.food),
                                    'benchmark stale claim',
                                );
                            }
                        }
                        for (const S of SEEDS) {
                            if (!S.seedling && !GROWN.has(S.id)) {
                                GROWN.set(S.id, W.time);
                            }
                        }
                        if (tick === 1799) {
                            observation90 = {
                                adultFed: ADULT_FED.size,
                                seedGrown: GROWN.size,
                                consumed,
                                produced,
                                initialAdultMeals,
                                seedGrowthMeals,
                                grownSeedAdultMeals,
                                foodRemaining: W.food.length,
                            };
                        }
                        if (ADULT_FED.size === 200 && GROWN.size === 20) {
                            firstGoalAt ??= W.time;
                            if (!fixed) {
                                break;
                            }
                        }
                        if (ADULTS.every((unit) => unit.fed) && SEEDS.every((unit) => !unit.seedling && unit.fed)) {
                            firstAllFedAt ??= W.time;
                        }
                    }
                    const TIMES = [...GROWN.values()].sort((a, b) => a - b),
                        RESULT = {
                            scenario,
                            adults: 200,
                            seeds: 20,
                            capacity: W.capacity,
                            elapsedSeconds: W.time,
                            offered,
                            produced,
                            consumed,
                            adultFed: ADULT_FED.size,
                            seedFirstMeals: FIRST_MEALS.size,
                            seedGrown: GROWN.size,
                            seedP95Seconds: TIMES[Math.max(0, Math.ceil(TIMES.length * 0.95) - 1)] ?? null,
                            seedLastSeconds: TIMES.at(-1) ?? null,
                            adultLastSeconds: Math.max(0, ...ADULT_FED.values()),
                            candidateChecks: W._foodSearchWork.candidateChecks,
                            cellVisits: W._foodSearchWork.cellVisits,
                            workUnits: W._foodSearchScheduler.metrics.unitsProcessed,
                            maxBudget,
                            maxClaimAge,
                            wallMs: performance.now() - START,
                            observation90,
                            initialAdultMeals,
                            seedGrowthMeals,
                            grownSeedAdultMeals,
                            foodRemaining: W.food.length,
                            firstGoalAt,
                            firstAllFedAt,
                        };
                    RESULT.consumedPerSimSecond = RESULT.consumed / RESULT.elapsedSeconds;
                    CHECK(
                        consumed === initialAdultMeals + seedGrowthMeals + grownSeedAdultMeals,
                        'meal accounting did not conserve consumption',
                    );
                    return {
                        result: RESULT,
                        signature: candidate ? JSON.stringify(globalThis.foodTest.STATE.snapshot(W)) : null,
                    };
                }
                const RESULTS = [],
                    ISSUES = [];
                let normalSignature = null;
                for (const SCENARIO of ['normal', 'scarce']) {
                    const BEFORE = run(ORIGINAL, SCENARIO, false),
                        AFTER = run(globalThis.foodTest.GARDEN, SCENARIO, true);
                    if (AFTER.result.seedGrown !== 20 || AFTER.result.adultFed !== 200) {
                        ISSUES.push({
                            scenario: SCENARIO,
                            kind: 'completion deadline missed',
                            adultFed: AFTER.result.adultFed,
                            seedGrown: AFTER.result.seedGrown,
                        });
                    }
                    CHECK(AFTER.result.maxClaimAge <= 8.051, 'candidate held distant claim too long', AFTER.result);
                    RESULTS.push({ scenario: SCENARIO, before: BEFORE.result, after: AFTER.result });
                    if (SCENARIO === 'normal') {
                        normalSignature = AFTER.signature;
                    }
                }
                const REPEAT = run(globalThis.foodTest.GARDEN, 'normal', true);
                CHECK(REPEAT.signature === normalSignature, '200-adult candidate replay was not deterministic');
                return {
                    status: ISSUES.length ? 'FAIL' : 'PASS',
                    issues: ISSUES,
                    renderer: 'none',
                    sourceBaseline: 'immutable farm-food-field owner; all other model rules shared',
                    conditions: {
                        dt: 0.05,
                        population: 220,
                        adults: 200,
                        seeds: 20,
                        normalSeconds: extended || fixed ? 180 : 90,
                        fixedHorizon: fixed,
                        initialModel: 'identical full snapshots asserted for all runs',
                        original90SecondObservationRetained: true,
                        scarceSeconds: 180,
                        normalOfferedPerSecond: 10,
                        scarceOfferedPerSecond: 2,
                        warehouseCap: globalThis.foodTest.CONFIG.farm.work.maxFood,
                        adultFoodMoveSpeed: 3.6,
                        seedMealCooldownSeconds: 5,
                        layout: 'same deterministic 10×4 food destination grid; same initial unit grid and seed',
                        workers: 0,
                        births: 'blocked by actual full capacity; no rule patch',
                    },
                    results: RESULTS,
                    normalReplay: 'identical full snapshot',
                };
            },
            {
                source: BASELINE,
                extended: process.argv.includes('--liveness'),
                fixed: process.argv.includes('--fixed-supply'),
            },
        );
        BENCHMARK.baselineCommit = FOOD_BASELINE_REF;
        BENCHMARK.baselineFoodFieldSha256 = createHash('sha256').update(BASELINE_BYTES).digest('hex');
        BENCHMARK.runtime = { node: process.version, platform: process.platform, browser: BROWSER.version() };
        BENCHMARK.candidateSourcesSha256 = Object.fromEntries(
            [
                'src/model/farm-food-field.js',
                ...['definition', 'model', 'checkpoint'].map(
                    (name) => `src/features/farm-modes/food-reservations/${name}.js`,
                ),
            ].map((file) => [
                file,
                createHash('sha256')
                    .update(fs.readFileSync(path.join(ROOT, file)))
                    .digest('hex'),
            ]),
        );
        fs.writeFileSync(
            path.join(
                OUT,
                process.argv.includes('--fixed-supply')
                    ? 'benchmark-fixed-180.json'
                    : process.argv.includes('--liveness')
                      ? 'benchmark-liveness.json'
                      : 'benchmark.json',
            ),
            JSON.stringify(BENCHMARK, null, 2),
        );
        console.log('MODEL benchmark result', JSON.stringify(BENCHMARK));
        assert.equal(
            BENCHMARK.status,
            'PASS',
            'Candidate did not satisfy benchmark completion deadlines; raw results preserved',
        );
    }
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
                largeRollback: LARGE_ROLLBACK,
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
