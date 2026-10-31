// Actual recipe UI, interruption and save/replay flows. No model rule fixtures are patched.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = fileURLToPath(new URL('../', import.meta.url)),
    OUT = path.join(ROOT, 'tests/output/combine-air-review'),
    BASELINE_REF = '00d64db715284c3719e5d5933ae82c0cb4dea6c5',
    BASELINE = execFileSync('git', ['show', `${BASELINE_REF}:src/model/farm-merge-breed.js`], { cwd: ROOT });
fs.mkdirSync(OUT, { recursive: true });
const SERVER = http.createServer((request, response) => {
    const FILE = path.resolve(ROOT, '.' + decodeURIComponent(request.url.split('?')[0]));
    if (!FILE.startsWith(ROOT) || !fs.existsSync(FILE) || !fs.statSync(FILE).isFile()) {
        response.writeHead(404).end();
        return;
    }
    response.setHeader(
        'content-type',
        { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }[
            path.extname(FILE)
        ] || 'application/octet-stream',
    );
    response.end(fs.readFileSync(FILE));
});
await new Promise((resolve) => SERVER.listen(0, '127.0.0.1', resolve));
const BROWSER = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ERRORS = [],
    RESULTS = [];
const DEADLINE = setTimeout(() => BROWSER.close(), 180000);
DEADLINE.unref();
try {
    async function open() {
        const PAGE = await BROWSER.newPage({ viewport: { width: 844, height: 390 }, serviceWorkers: 'block' });
        PAGE.on('pageerror', (error) => ERRORS.push(String(error)));
        await PAGE.route(/cdn\.jsdelivr\.net\/gh\/byh-playground\/bloom-gamekit@[0-9a-f]+\/(.*)/, (route) =>
            route.fulfill({
                body: fs.readFileSync(
                    path.join(
                        ROOT,
                        'vendor/upstream',
                        route
                            .request()
                            .url()
                            .match(/@[0-9a-f]+\/(.*)$/)[1],
                    ),
                ),
                contentType: 'text/javascript',
                headers: { 'access-control-allow-origin': '*' },
            }),
        );
        await PAGE.goto(`http://127.0.0.1:${SERVER.address().port}/index.html`);
        await PAGE.waitForFunction(() => globalThis.BUDMORI);
        await PAGE.locator('#newGame').click();
        return PAGE;
    }
    const PAGE = await open();
    async function setup(multiple = false) {
        return PAGE.evaluate(async (multiple) => {
            const W = BUDMORI.sim;
            BUDMORI.runtime.paused = true;
            W.cancelMergeTasks();
            W.resetUnits();
            W.setWorkBasisPoints(0);
            W.food.length = 0;
            W.effects.length = 0;
            const POSITIONS = multiple
                ? [
                      [0, 1, -5, 4],
                      [6, 1, -3, 4],
                      [0, 1, 3, 4],
                      [6, 1, 5, 4],
                      [0, 2, -9, 6],
                      [0, 2, -8, 6],
                      [0, 2, -7, 6],
                      [6, 2, -9, 7],
                      [6, 2, -8, 7],
                      [6, 2, -7, 7],
                  ]
                : [
                      [0, 1, 1, 4],
                      [6, 1, 5, 4],
                      [0, 2, -9, 6],
                      [0, 2, -8, 6],
                      [6, 2, -9, 7],
                      [6, 2, -8, 7],
                  ];
            for (const [SPECIES, TIER, X, Y] of POSITIONS) {
                const U = W.spawn(SPECIES, TIER, X, Y);
                U.growthElapsed = U.growthDuration;
                U.dropLanded = true;
                U.z = U.vz = 0;
                W.recordCodex(U);
            }
            W.setCombineSelection(0, 1);
            const { snapshot: SNAPSHOT } = await import('/src/model/farm-state.js');
            return SNAPSHOT(W);
        }, multiple);
    }
    async function render() {
        const STATE = await PAGE.evaluate(() => {
            BUDMORI.runtime.capturePresentation('reset');
            return { ids: BUDMORI.sim.units.map((u) => u.id), time: BUDMORI.sim.time };
        });
        await PAGE.waitForFunction((s) => {
            const D = BUDMORI.runtime.presentationView;
            return (
                D.units.length === s.ids.length &&
                s.ids.every((id) => D.units.some((u) => u.id === id)) &&
                Math.abs(D.time - s.time) < 1e-6
            );
        }, STATE);
        return PAGE.evaluate(async () => {
            const R = BUDMORI.renderer,
                D = BUDMORI.runtime.presentationView,
                P = R.unitPresentation.combinePresentation,
                { snapshot: SNAPSHOT } = await import('/src/model/farm-state.js'),
                BEFORE = JSON.stringify(SNAPSHOT(BUDMORI.sim));
            const ACTORS = [],
                FACES = [],
                DRAW = R.unitPresentation.draw,
                DRAW_BODY = R.unitPresentation.drawVectorUnit;
            R.unitPresentation.draw = function (unit, world) {
                ACTORS.push(unit.id);
                return DRAW.call(this, unit, world);
            };
            R.unitPresentation.drawVectorUnit = function (unit, world, point, radius, rest, hidden = false) {
                if (hidden) {
                    return DRAW_BODY.call(this, unit, world, point, radius, rest, hidden);
                }
                const MATRICES = [],
                    TRANSFORM = R.ctx.transform;
                R.ctx.transform = function (...values) {
                    MATRICES.push(values);
                    return TRANSFORM.apply(this, values);
                };
                let result;
                try {
                    result = DRAW_BODY.call(this, unit, world, point, radius, rest, hidden);
                } finally {
                    R.ctx.transform = TRANSFORM;
                }
                const ENTRY = this.preparedVisibleUnits.get(unit.id),
                    M = MATRICES[0],
                    POSE = MATRICES[1],
                    SCREEN = (matrix, x, y) => [
                        matrix[0] * x + matrix[2] * y + matrix[4],
                        matrix[1] * x + matrix[3] * y + matrix[5],
                    ],
                    ERRORS = ['face-eye-left', 'face-eye-right', 'face-mouth'].map((name) => {
                        const REST = ENTRY.record.compiled.metadata.sockets[name].point,
                            SOCKET = ENTRY.player.getSocket(name),
                            FACE = SCREEN(M, ...SCREEN(POSE, ...REST)),
                            BODY = SCREEN(M, SOCKET.x, SOCKET.y);
                        return Math.hypot(FACE[0] - BODY[0], FACE[1] - BODY[1]);
                    });
                if (
                    ENTRY.player.currentExpression !== 'neutral' ||
                    !ENTRY.face ||
                    !ERRORS.every((error) => Number.isFinite(error) && error < 1e-6)
                ) {
                    throw new Error('Code face/socket is missing or detached during combine');
                }
                FACES.push({
                    id: unit.id,
                    face: ENTRY.face,
                    socketError: Math.max(...ERRORS),
                    x: unit.x,
                    y: unit.y,
                    z: unit.z,
                });
                return result;
            };
            try {
                R.render(D, null, performance.now());
            } finally {
                R.unitPresentation.draw = DRAW;
                R.unitPresentation.drawVectorUnit = DRAW_BODY;
            }
            if (new Set(ACTORS).size !== ACTORS.length) {
                throw new Error('Duplicate unit submission');
            }
            if (ACTORS.some((id) => !D.units.some((u) => u.id === id))) {
                throw new Error('Retired actor submitted');
            }
            if (JSON.stringify(SNAPSHOT(BUDMORI.sim)) !== BEFORE) {
                throw new Error('Presentation changed authoritative model height/position/state');
            }
            const STATS = R.unitSprites.stats();
            return {
                parts: P.parts.size,
                visuals: P.visuals.size,
                actors: ACTORS.length,
                units: D.units.length,
                bodies: STATS,
                faces: FACES,
                tasks: D.mergeTasks,
            };
        });
    }
    const INITIAL = await setup();
    // The production button starts the same authoritative recipe command.
    await PAGE.evaluate(() => {
        BUDMORI.runtime.paused = false;
    });
    await PAGE.waitForFunction(() => document.getElementById('combine').dataset.availability === 'ready');
    await PAGE.locator('#combine').click();
    await PAGE.waitForFunction(() => BUDMORI.sim.mergeTasks.length === 1);
    await PAGE.evaluate(() => {
        BUDMORI.runtime.paused = true;
    });
    const UI_TASK = await PAGE.evaluate(() => BUDMORI.sim.mergeTasks[0]);
    assert.equal(UI_TASK.materialIds.length, 2);
    await render();
    console.log('PASS actual mobile combine button starts one pair');
    await setup();
    const FOOD_RELEASE = await PAGE.evaluate(() => {
        const W = BUDMORI.sim,
            MATERIALS = W.units.filter((unit) => unit.tier === 1);
        for (const UNIT of MATERIALS) {
            const FOOD = {
                x: UNIT.x,
                y: UNIT.y + 1,
                z: 0,
                vx: 0,
                vy: 0,
                vz: 0,
                seed: 0,
                phase: 'grounded',
                tx: UNIT.x,
                ty: UNIT.y + 1,
            };
            W.food.push(FOOD);
            W._trackFoodAdded(FOOD);
            W._rebuildFoodSpatialIndex();
            if (!W._foodReservations.claim(UNIT, FOOD)) {
                throw new Error('Material did not reserve nearby food');
            }
        }
        const BEFORE = W._foodReservations.byUnit.size;
        if (!W.startManualMerge(true)) {
            throw new Error('Reserved-food materials could not combine');
        }
        if (MATERIALS.some((unit) => W._foodReservations.target(unit))) {
            throw new Error('Combine retained material food ownership');
        }
        return { before: BEFORE, after: W._foodReservations.byUnit.size, food: W.food.length, units: W.units.length };
    });
    assert.deepEqual(FOOD_RELEASE, { before: 2, after: 0, food: 2, units: 6 });
    RESULTS.push({ scenario: 'material-food-reservation-release', ...FOOD_RELEASE });
    console.log('PASS material food reservation release without consumption');
    await setup();
    const JUST_GROWN = await PAGE.evaluate(() => {
        const W = BUDMORI.sim,
            OLD = W.units.find((unit) => unit.species === 0 && unit.tier === 1),
            X = OLD.x,
            Y = OLD.y;
        W.removeUnit(OLD);
        const U = W.spawn(0, 1, X, Y, {
            lineage: { temperament: 0, genes: [0, 0], seedling: { fed: 2, cooldown: 0 } },
        });
        U.dropLanded = true;
        U.z = U.vz = 0;
        W.feedSeedling(U);
        if (!W.startManualMerge(true)) {
            throw new Error('A just-grown adult could not combine');
        }
        for (let tick = 0; tick < 4; tick++) {
            W.step(0.05);
        }
        return U.id;
    });
    const GROWTH_OVERLAP = await render();
    assert.equal(GROWTH_OVERLAP.faces.filter((face) => face.id === JUST_GROWN).length, 1);
    assert.equal(
        await PAGE.evaluate((id) => BUDMORI.renderer.unitPresentation.growthDisplayUnits.has(id), JUST_GROWN),
        false,
    );
    assert.equal(
        await PAGE.evaluate((id) => {
            const D = BUDMORI.runtime.presentationView.units.find((unit) => unit.id === id);
            return BUDMORI.renderer.unitPresentation.displayUnit(D).isSeedling;
        }, JUST_GROWN),
        false,
    );
    RESULTS.push({ scenario: 'growth-interrupted-by-combine', actors: 1, oldGrowthProxy: false });
    console.log('PASS just-grown material uses one combine pose without stacked lift/old growth flash');
    for (const INTERRUPTION of ['cancel', 'remove', 'death', 'scene']) {
        await setup();
        const RESULT = await PAGE.evaluate((kind) => {
            const W = BUDMORI.sim;
            if (!W.startManualMerge(true)) {
                throw new Error('Recipe unavailable');
            }
            for (let tick = 0; tick < 6; tick++) {
                W.step(0.05);
            }
            const T = W.mergeTasks[0],
                IDS = [...T.materialIds],
                NEXT = W.nextId;
            if (kind === 'cancel') {
                W.cancelMergeTask(T);
            }
            if (kind === 'remove') {
                W.removeUnit(W.units.find((u) => u.id === IDS[0]));
            }
            if (kind === 'death') {
                W.units.find((u) => u.id === IDS[0]).hp = 0;
                W.advanceMergeTask(0.05);
            }
            if (kind === 'scene') {
                const PREVIOUS_EVENT = structuredClone(W.farmBossEvent),
                    PREVIOUS_TOWER = structuredClone(W.tower);
                if (!W.startTower()) {
                    throw new Error('Tower transition did not start');
                }
                W.advanceMergeTask(0.05);
                W.tower = PREVIOUS_TOWER;
                W.farmBossEvent = PREVIOUS_EVENT;
            }
            return {
                tasks: W.mergeTasks.length,
                count: W.units.length,
                nextUnchanged: W.nextId === NEXT,
                reserved: W.units.some((u) => W.unitCollection.reservationOwner(u)?.startsWith('merge:')),
            };
        }, INTERRUPTION);
        assert.equal(RESULT.tasks, 0);
        assert.equal(RESULT.count, INTERRUPTION === 'remove' ? 5 : 6);
        assert.equal(RESULT.nextUnchanged, true);
        assert.equal(RESULT.reserved, false);
        const DISPLAY = await render();
        assert.equal(DISPLAY.parts, 0);
        assert.equal(DISPLAY.visuals, 0);
        RESULTS.push({ scenario: INTERRUPTION, ...RESULT, ...DISPLAY });
        console.log('PASS interruption', INTERRUPTION);
    }
    await setup();
    const REMOVED_RESULT = await PAGE.evaluate(() => {
        const W = BUDMORI.sim;
        W.startManualMerge(true);
        for (let tick = 0; tick < 18; tick++) {
            W.step(0.05);
        }
        const RESULT_ID = W.mergeTasks[0].resultId;
        W.removeUnit(W.units.find((u) => u.id === RESULT_ID));
        return { count: W.units.length, tasks: W.mergeTasks.length };
    });
    assert.deepEqual(REMOVED_RESULT, { count: 4, tasks: 0 });
    const REMOVED_DISPLAY = await render();
    assert.equal(REMOVED_DISPLAY.parts, 0);
    assert.equal(REMOVED_DISPLAY.visuals, 0);
    RESULTS.push({ scenario: 'result-removed', ...REMOVED_RESULT, ...REMOVED_DISPLAY });
    for (const BACKEND of ['sprite', 'vector']) {
        await setup(true);
        await PAGE.evaluate((backend) => {
            BUDMORI.renderer.unitArtMode = backend;
            BUDMORI.renderer.unitSprites.enabled = backend === 'sprite';
            BUDMORI.sim.startManualMerge(true);
            BUDMORI.sim.startManualMerge(true);
        }, BACKEND);
        const PHASES = [];
        let phaseIndex = 0;
        for (const TICKS of [4, 10, 7, 17]) {
            await PAGE.evaluate((ticks) => {
                for (let tick = 0; tick < ticks; tick++) {
                    BUDMORI.sim.step(0.05);
                }
            }, TICKS);
            const PHASE = await render();
            assert.ok(PHASE.bodies[BACKEND] > 0, `${BACKEND} bodies actually submitted`);
            assert.ok(PHASE.faces.length > 0);
            if (BACKEND === 'vector') {
                assert.equal(PHASE.bodies.sprite, 0);
            }
            for (const TASK of PHASE.tasks) {
                if (TASK.phase === 'approach') {
                    const MATERIALS = PHASE.faces.filter((face) => TASK.materialIds.includes(face.id));
                    assert.equal(MATERIALS.length, 2);
                    assert.ok(Math.abs((MATERIALS[0].x + MATERIALS[1].x) / 2 - TASK.centerX) < 1e-6);
                    assert.ok(MATERIALS.every((face) => Math.abs(face.y - TASK.centerY) < 1e-6 && face.z > 0));
                    if (phaseIndex === 0) {
                        for (const START of TASK.startPositions) {
                            assert.ok(
                                Math.abs(MATERIALS.find((face) => face.id === START.id).x - START.x) < 1e-6,
                                'Rise happens above each original position',
                            );
                        }
                    } else {
                        assert.ok(
                            Math.abs(MATERIALS[0].x - MATERIALS[1].x) < 0.5,
                            'Both materials converge at their actual midpoint',
                        );
                    }
                }
                if (TASK.phase === 'animation') {
                    const RESULT = PHASE.faces.find((face) => face.id === TASK.resultId);
                    assert.ok(RESULT && RESULT.z > 0, 'The result appears in the air');
                    assert.ok(Math.abs(RESULT.x - TASK.centerX) < 0.5);
                }
            }
            PHASES.push(PHASE);
            await PAGE.screenshot({ path: path.join(OUT, `${BACKEND}-phase-${phaseIndex++}.png`) });
        }
        assert.equal(PHASES.at(-1).units, 8);
        assert.equal(PHASES.at(-1).parts, 0);
        RESULTS.push({ scenario: 'two-pair-visible-phases', backend: BACKEND, phases: PHASES });
        await PAGE.screenshot({ path: path.join(OUT, `${BACKEND}-landed.png`) });
    }
    console.log('PASS result removal and concurrent rise/fusion/landing submit no ghost or duplicate actor');
    await setup(true);
    const MULTIPLE = await PAGE.evaluate(async () => {
        const W = BUDMORI.sim;
        if (!W.startManualMerge(true) || !W.startManualMerge(true)) {
            throw new Error('Two pairs did not start');
        }
        const TASKS = structuredClone(W.mergeTasks);
        if (W.startManualMerge(true)) {
            throw new Error('Reserved materials reused');
        }
        const IDS = TASKS.flatMap((t) => t.materialIds);
        if (new Set(IDS).size !== 4) {
            throw new Error('Duplicate material reservation');
        }
        const { snapshot: SNAPSHOT, restore: RESTORE } = await import('/src/model/farm-state.js');
        const SAVED = SNAPSHOT(W),
            COPY = RESTORE(SAVED);
        for (let tick = 0; tick < 40; tick++) {
            W.step(0.05);
            COPY.step(0.05);
        }
        const A = SNAPSHOT(W),
            B = SNAPSHOT(COPY);
        delete A.effects;
        delete B.effects;
        if (JSON.stringify(A) !== JSON.stringify(B)) {
            throw new Error('Restored parallel flow diverged');
        }
        return {
            centers: TASKS.map((t) => [t.centerX, t.centerY]),
            count: W.units.length,
            results: W.units.filter((u) => u.species === 1).length,
            remaining: [0, 6].map((s) => W.units.filter((u) => u.species === s).length),
            tasks: W.mergeTasks.length,
        };
    });
    assert.deepEqual(MULTIPLE.centers, [
        [-4, 4],
        [4, 4],
    ]);
    assert.equal(MULTIPLE.count, 8);
    assert.equal(MULTIPLE.results, 2);
    assert.deepEqual(MULTIPLE.remaining, [3, 3]);
    assert.equal(MULTIPLE.tasks, 0);
    await render();
    RESULTS.push({ scenario: 'two-pairs-and-restore', ...MULTIPLE });
    console.log('PASS two pairs, unique reservations, restore and 10→8');
    // Both pre-commit and post-commit snapshots resume identically; a rollback never double consumes.
    const SAVE_CHECKS = await PAGE.evaluate(async (initial) => {
        const { snapshot: SNAPSHOT, restore: RESTORE } = await import('/src/model/farm-state.js');
        const RESULTS = [];
        for (const CHECKPOINT of [0.3, 0.95]) {
            const A = RESTORE(initial);
            A.startManualMerge(true);
            for (let t = 0; t < Math.round(CHECKPOINT / 0.05); t++) {
                A.step(0.05);
            }
            const SAVED = SNAPSHOT(A),
                B = RESTORE(SAVED),
                C = RESTORE(SAVED);
            for (let t = 0; t < 45; t++) {
                A.step(0.05);
                B.step(0.05);
                C.step(0.05);
            }
            const X = SNAPSHOT(A),
                Y = SNAPSHOT(B),
                Z = SNAPSHOT(C);
            delete X.effects;
            delete Y.effects;
            delete Z.effects;
            if (JSON.stringify(X) !== JSON.stringify(Y) || JSON.stringify(Y) !== JSON.stringify(Z)) {
                throw new Error('Save/rollback divergence');
            }
            RESULTS.push({
                checkpoint: CHECKPOINT,
                count: A.units.length,
                results: A.units.filter((u) => u.species === 1).length,
                remaining: [0, 6].map((s) => A.units.filter((u) => u.species === s).length),
            });
        }
        return RESULTS;
    }, INITIAL);
    for (const RESULT of SAVE_CHECKS) {
        assert.equal(RESULT.count, 5);
        assert.equal(RESULT.results, 1);
        assert.deepEqual(RESULT.remaining, [2, 2]);
    }
    RESULTS.push({ scenario: 'save-rollback', checks: SAVE_CHECKS });
    console.log('PASS approach/animation save restore, rollback and 6→5, two preserved per species');
    const DISK_CHECKS = await PAGE.evaluate(async (initial) => {
        const { restore: RESTORE } = await import('/src/model/farm-state.js');
        const {
            captureFarmProgress: CAPTURE,
            restoreFarmProgress: LOAD,
            sameFarmProgress: SAME,
        } = await import('/src/model/farm-progress.js');
        const CHECKS = [];
        for (const TICKS of [6, 19]) {
            const W = RESTORE(initial);
            W.startManualMerge(true);
            for (let tick = 0; tick < TICKS; tick++) {
                W.step(0.05);
            }
            const SAVED = CAPTURE(W),
                RELOADED = LOAD(SAVED);
            if (!SAME(SAVED, CAPTURE(RELOADED))) {
                const AFTER = CAPTURE(RELOADED);
                throw new Error(
                    'Disk progress roundtrip changed inventory: ' +
                        JSON.stringify(
                            Object.keys(SAVED)
                                .filter((key) => JSON.stringify(SAVED[key]) !== JSON.stringify(AFTER[key]))
                                .map((key) => ({ key, before: SAVED[key], after: AFTER[key] })),
                        ),
                );
            }
            CHECKS.push({
                ticks: TICKS,
                count: RELOADED.units.length,
                results: RELOADED.units.filter((u) => u.species === 1).length,
                tasks: RELOADED.mergeTasks.length,
            });
        }
        return CHECKS;
    }, INITIAL);
    assert.deepEqual(DISK_CHECKS, [
        { ticks: 6, count: 6, results: 0, tasks: 0 },
        { ticks: 19, count: 5, results: 1, tasks: 0 },
    ]);
    RESULTS.push({ scenario: 'disk-progress-contract', checks: DISK_CHECKS });
    console.log('PASS disk progress resumes before/after consumption without replaying presentation tasks');
    const BASELINE_SOURCE = BASELINE.toString('utf8').replace(
        /from '([^']+)'/g,
        (_, specifier) =>
            `from '${new URL(specifier, `http://127.0.0.1:${SERVER.address().port}/src/model/farm-merge-breed.js`).href}'`,
    );
    const AUTHORITY = await PAGE.evaluate(
        async ({ initial, source }) => {
            const { snapshot: SNAPSHOT, restore: RESTORE } = await import('/src/model/farm-state.js');
            const { Garden: GARDEN } = await import('/src/model/farm-model.js');
            const URL_LOCAL = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
            const { FARM_MERGE_BREED: ORIGINAL_MERGE_OWNER } = await import(URL_LOCAL);
            URL.revokeObjectURL(URL_LOCAL);
            const ORIGINAL_GARDEN = ORIGINAL_MERGE_OWNER(GARDEN);
            const STATES = [];
            for (const ORIGINAL of [false, true]) {
                const W = RESTORE(initial);
                // The complete unchanged merge owner overrides the candidate owner; all other model owners are shared.
                if (ORIGINAL) {
                    Object.setPrototypeOf(W, ORIGINAL_GARDEN.prototype);
                }
                W.startManualMerge(true);
                for (let tick = 0; tick < 50; tick++) {
                    W.step(0.05);
                }
                const S = SNAPSHOT(W);
                delete S.effects;
                STATES.push(S);
            }
            return STATES;
        },
        { initial: INITIAL, source: BASELINE_SOURCE },
    );
    assert.deepEqual(AUTHORITY[0], AUTHORITY[1]);
    console.log('PASS authority identical to unchanged main model (visual effects excluded)');
    assert.deepEqual(ERRORS, []);
    fs.writeFileSync(
        path.join(OUT, 'regression.json'),
        JSON.stringify(
            {
                status: 'PASS',
                results: RESULTS,
                baselineCommit: BASELINE_REF,
                baselineAuthority: 'identical except visual effects; foodRuntime included',
                errors: ERRORS,
            },
            null,
            2,
        ),
    );
} finally {
    clearTimeout(DEADLINE);
    await BROWSER.close();
    SERVER.close();
}
