// Real food consumption -> visible growth -> first-species card -> save/reload, with both rendering backends.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const ROOT = fileURLToPath(new URL('../', import.meta.url)),
    OUTPUT = path.join(ROOT, 'tests/output/seedling-growth');
fs.mkdirSync(OUTPUT, { recursive: true });
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
async function installFaceProbe(page) {
    await page.evaluate(() => {
        if (globalThis.growthFaceProbeInstalled) {
            return;
        }
        globalThis.growthFaceProbeInstalled = true;
        const R = BUDMORI.renderer,
            P = R.unitPresentation,
            DRAW = P.drawVectorUnit,
            RENDER = R.render,
            BODY_DRAW = R.unitSprites.draw,
            ACTOR_DRAW = R.ctx.drawVectorActor,
            BODIES = new Map(),
            VALUES = (m) => [m.a, m.b, m.c, m.d, m.e, m.f],
            COMPOSE = (a, b) => [
                a[0] * b[0] + a[2] * b[1],
                a[1] * b[0] + a[3] * b[1],
                a[0] * b[2] + a[2] * b[3],
                a[1] * b[2] + a[3] * b[3],
                a[0] * b[4] + a[2] * b[5] + a[4],
                a[1] * b[4] + a[3] * b[5] + a[5],
            ],
            KEY = (unit) => `${unit.id}:${unit.generation}:${R.displayTimeMs}`;
        let frame = 0,
            nativeBody = null;
        R.render = function (...args) {
            frame++;
            BODIES.clear();
            nativeBody = null;
            return RENDER.apply(this, args);
        };
        // Bodies can be submitted in the opaque prepass, before drawVectorUnit observes the face. Record the
        // actual sprite/native submission at its own boundary, scoped to this render frame and generation.
        R.unitSprites.draw = function (prepared, options) {
            if (prepared.unit.id !== globalThis.growthSubject) {
                return BODY_DRAW.call(this, prepared, options);
            }
            const UNIT = prepared.unit,
                MODEL = BUDMORI.sim.units.find((entry) => entry.id === UNIT.id),
                BEFORE = [MODEL.height, MODEL.z],
                BODY = {
                    frame,
                    id: UNIT.id,
                    generation: UNIT.generation,
                    displayTimeMs: R.displayTimeMs,
                    matrix: COMPOSE(VALUES(R.ctx.getTransform()), options.matrix),
                },
                RESULT = BODY_DRAW.call(this, prepared, options);
            BODY.modelUnchanged = BEFORE[0] === MODEL.height && BEFORE[1] === MODEL.z;
            if (RESULT) {
                BODY.backend = 'sprite';
                BODIES.set(KEY(UNIT), BODY);
            } else {
                nativeBody = { prepared, observation: BODY };
            }
            return RESULT;
        };
        R.ctx.drawVectorActor = function (actor, options) {
            const PENDING = nativeBody;
            if (!PENDING || actor !== PENDING.prepared.player) {
                return ACTOR_DRAW.call(this, actor, options);
            }
            nativeBody = null;
            const UNIT = PENDING.prepared.unit,
                MODEL = BUDMORI.sim.units.find((entry) => entry.id === UNIT.id),
                BEFORE = [MODEL.height, MODEL.z],
                BODY = PENDING.observation;
            BODY.matrix = COMPOSE(VALUES(R.ctx.getTransform()), options.matrix);
            const RESULT = ACTOR_DRAW.call(this, actor, options);
            BODY.modelUnchanged &&= BEFORE[0] === MODEL.height && BEFORE[1] === MODEL.z;
            BODY.backend = 'vector';
            BODIES.set(KEY(UNIT), BODY);
            return RESULT;
        };
        P.drawVectorUnit = function (unit, world, point, radius, rest, hidden = false) {
            if (hidden || unit.id !== globalThis.growthSubject) {
                return DRAW.call(this, unit, world, point, radius, rest, hidden);
            }
            const MODEL = BUDMORI.sim.units.find((entry) => entry.id === unit.id),
                BEFORE = [MODEL.height, MODEL.z];
            const MATRICES = [],
                FACE_DRAW = R.unitOverlays.drawFace,
                DRAW_REGION = R.ctx.drawRegion;
            let faceMatrix,
                faceAnchor,
                submittedFace,
                faceBackend,
                faceQuads = 0,
                drawingAtlasFace = false;
            // Observe the composed transform at the official face boundary. Body/atlas internals may
            // submit other transforms before this call, so their ordinal position is not a contract.
            R.unitOverlays.drawFace = function (anchor, face, ...args) {
                faceMatrix = VALUES(R.ctx.getTransform());
                faceAnchor = anchor;
                submittedFace = face;
                drawingAtlasFace = true;
                try {
                    const USED_ATLAS = FACE_DRAW.call(this, anchor, face, ...args);
                    faceBackend = USED_ATLAS ? 'atlas' : 'paths';
                    return USED_ATLAS;
                } finally {
                    drawingAtlasFace = false;
                }
            };
            R.ctx.drawRegion = function (...args) {
                if (drawingAtlasFace) {
                    faceQuads++;
                }
                return DRAW_REGION.apply(this, args);
            };
            let result;
            try {
                result = DRAW.call(this, unit, world, point, radius, rest, hidden);
            } finally {
                R.unitOverlays.drawFace = FACE_DRAW;
                R.ctx.drawRegion = DRAW_REGION;
            }
            const ENTRY = P.preparedVisibleUnits.get(unit.id),
                BODY = BODIES.get(KEY(unit));
            BODIES.delete(KEY(unit));
            if (
                !BODY ||
                BODY.frame !== frame ||
                BODY.id !== unit.id ||
                BODY.generation !== unit.generation ||
                BODY.displayTimeMs !== R.displayTimeMs ||
                !faceMatrix ||
                submittedFace !== ENTRY.face ||
                (faceBackend === 'atlas' && faceQuads < 3)
            ) {
                throw new Error('Body/face submission observation missing');
            }
            const BODY_MATRIX = BODY.matrix;
            MATRICES.push(BODY_MATRIX, faceMatrix);
            const SCREEN = (matrix, x, y) => [
                    matrix[0] * x + matrix[2] * y + matrix[4],
                    matrix[1] * x + matrix[3] * y + matrix[5],
                ],
                ANCHORS = [faceAnchor.eyeLeft, faceAnchor.eyeRight, faceAnchor.mouth],
                SOCKETS = ['face-eye-left', 'face-eye-right', 'face-mouth'].map((name, index) => {
                    const REST = ENTRY.record.compiled.metadata.sockets[name].point,
                        ANCHOR = ANCHORS[index],
                        ACTUAL = ENTRY.player.getSocket(name);
                    if (ANCHOR.some((value, axis) => value !== REST[axis])) {
                        throw new Error('Submitted face anchor differs from the body socket');
                    }
                    return {
                        name,
                        face: SCREEN(faceMatrix, ...ANCHOR),
                        body: SCREEN(BODY_MATRIX, ACTUAL.x, ACTUAL.y),
                    };
                });
            globalThis.growthFaceProbe = {
                body: ENTRY.player.currentExpression,
                face: ENTRY.face,
                matrices: MATRICES,
                faceBackend,
                faceQuads,
                bodyBackend: BODY.backend,
                bodyFrame: BODY.frame,
                bodyGeneration: BODY.generation,
                bodyDisplayTimeMs: BODY.displayTimeMs,
                sockets: SOCKETS,
                modelUnchanged: BODY.modelUnchanged && BEFORE[0] === MODEL.height && BEFORE[1] === MODEL.z,
            };
            return result;
        };
    });
}
async function verifyFaceProbe(page, output) {
    await page.waitForFunction(() => globalThis.growthFaceProbe?.sockets.length === 3);
    const PROBE = await page.evaluate(() => globalThis.growthFaceProbe);
    assert.equal(PROBE.body, 'neutral', 'The atlas keeps a neutral body; the face is a code layer');
    assert.ok(PROBE.face, 'A current face is actually submitted');
    assert.equal(PROBE.modelUnchanged, true, 'Drawing never changes model height or z');
    assert.ok(PROBE.matrices.flat().every(Number.isFinite));
    for (const SOCKET of PROBE.sockets) {
        assert.ok(SOCKET.face.every(Number.isFinite));
        assert.ok(Math.hypot(SOCKET.face[0] - SOCKET.body[0], SOCKET.face[1] - SOCKET.body[1]) < 1e-6);
    }
    fs.writeFileSync(path.join(OUTPUT, output), JSON.stringify(PROBE, null, 2));
}
async function capture(page, filename) {
    // GPU readback can outlast a discovery toast on software rendering. Freeze only the observation;
    // freeze wall time first so the pause target cannot expire between protocol calls.
    // The monotonic clock and timer schedule are untouched until the explicit pause.
    const CAPTURE_AT = await page.evaluate(() => Date.now());
    await page.clock.setFixedTime(CAPTURE_AT);
    try {
        await page.clock.pauseAt(CAPTURE_AT);
        await page.screenshot({ path: path.join(OUTPUT, filename) });
    } finally {
        await page.clock.setSystemTime(CAPTURE_AT);
        await page.clock.resume();
    }
}
const BROWSER = await chromium.launch({
    executablePath: process.env.CHROME_PATH,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const DEADLINE = setTimeout(() => BROWSER.close(), 180000);
DEADLINE.unref();
try {
    const PAGE = await BROWSER.newPage({ viewport: { width: 1100, height: 850 }, serviceWorkers: 'block' }),
        ERRORS = [];
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
    await PAGE.clock.install();
    await PAGE.goto(`http://127.0.0.1:${SERVER.address().port}/index.html`);
    await PAGE.waitForFunction(() => globalThis.BUDMORI);
    // Blocked service workers are reported on the start screen. Waiting for that line keeps it off the farm notice,
    // which would otherwise appear mid-scene and change the timing of the discovery card.
    await PAGE.waitForFunction(() =>
        document.getElementById('appNotice').textContent.includes('service worker registration was blocked'),
    );
    await PAGE.locator('#newGame').click();
    for (const BACKEND of ['sprite', 'vector']) {
        await PAGE.evaluate((backend) => {
            BUDMORI.runtime.paused = true;
            const W = BUDMORI.sim;
            W.resetUnits();
            W.setWorkBasisPoints(0);
            W.codex.forms = [];
            W.food.length = 0;
            BUDMORI.renderer.unitArtMode = backend;
            BUDMORI.renderer.unitSprites.enabled = backend === 'sprite';
            BUDMORI.renderer.resetZoom();
            BUDMORI.renderer.zoomAt(1);
            BUDMORI.renderer.takeCameraControl();
            const U = W.spawn(0, 1, 0, 0, {
                lineage: { temperament: 0, genes: [0, 0], seedling: { fed: 0, cooldown: 0 } },
            });
            U.dropLanded = true;
            U.z = 0;
            U.vz = 0;
            globalThis.growthSubject = U.id;
            BUDMORI.runtime.capturePresentation('reset');
        }, BACKEND);
        const STAGES = [];
        let submittedBodies = 0;
        for (let meal = 0; meal <= 3; meal++) {
            await installFaceProbe(PAGE);
            const STAGE = await PAGE.evaluate(async (number) => {
                const W = BUDMORI.sim,
                    U = W.units.find((u) => u.id === globalThis.growthSubject);
                if (number) {
                    W.spawnFood(U.x, U.y, 1);
                    for (let tick = 0; tick < 600 && (U.seedling?.fed ?? 3) < number; tick++) {
                        W.step(0.05);
                    }
                    if ((U.seedling?.fed ?? 3) !== number) {
                        throw new Error(
                            'Seed did not consume the actual food ' +
                                JSON.stringify({
                                    number,
                                    seedling: U.seedling,
                                    x: U.x,
                                    y: U.y,
                                    hp: U.hp,
                                    food: W.food,
                                    time: W.time,
                                }),
                        );
                    }
                }
                const { snapshot: SNAPSHOT, restore: RESTORE } = await import('/src/model/farm-state.js');
                const RESTORED = RESTORE(SNAPSHOT(W));
                const V = RESTORED.units.find((u) => u.id === U.id);
                if (JSON.stringify(SNAPSHOT(RESTORED)) !== JSON.stringify(SNAPSHOT(W))) {
                    throw new Error('Growth effect/food runtime checkpoint mismatch');
                }
                if (number && W._foodReservations.target(U)) {
                    throw new Error('Consumed growth meal retained its food reservation');
                }
                if (U.size !== V.size || U.radius !== V.radius || U.fed !== V.fed) {
                    throw new Error('Snapshot growth mismatch');
                }
                const BEFORE = U.size;
                W.settleOffline(3600);
                if (U.size !== BEFORE) {
                    throw new Error('Offline time changed seed meal growth');
                }
                BUDMORI.runtime.capturePresentation('reset');
                const R = BUDMORI.renderer;
                R.setPan(-U.x, -0.785 * U.y - R.baseY());
                return {
                    size: U.size,
                    radius: U.radius,
                    bodyScale: U.bodyScale,
                    fed: U.fed,
                    seedling: !!U.seedling,
                    meals: U.meals,
                };
            }, meal);
            if (meal === 3) {
                const MOTION = [];
                for (const AGE of [0.2, 0.45, 0.8, 1.2]) {
                    const EXPECTED = await PAGE.evaluate(async (age) => {
                        const W = BUDMORI.sim,
                            U = W.units.find((u) => u.id === globalThis.growthSubject);
                        for (let tick = 0; tick < 40; tick++) {
                            const E = W.effects.find((e) => e.seedlingGrowth && e.unitId === U.id);
                            if (!E || E.life >= age) {
                                break;
                            }
                            W.step(0.05);
                        }
                        const E = W.effects.find((e) => e.seedlingGrowth && e.unitId === U.id);
                        const { seedlingTransformPose: POSE } =
                            await import('/src/features/seedling-growth/definition.js');
                        const P = E ? POSE(E.life) : { lift: 0, seedling: false };
                        BUDMORI.runtime.capturePresentation('reset');
                        return { active: !!E, lift: P.lift, seedling: P.seedling, modelZ: U.z };
                    }, AGE);
                    await PAGE.waitForFunction((e) => {
                        const D = BUDMORI.runtime.presentationView.units.find((u) => u.id === globalThis.growthSubject);
                        return D && D.growthActive === e.active && Math.abs(D.growthLift - e.lift) < 1e-6;
                    }, EXPECTED);
                    const ACTUAL = await PAGE.evaluate(() => {
                        const D = BUDMORI.runtime.presentationView.units.find((u) => u.id === globalThis.growthSubject);
                        const V = BUDMORI.renderer.unitPresentation.displayUnit(D);
                        return {
                            seedling: V.isSeedling,
                            z: V.z,
                            count: BUDMORI.runtime.presentationView.units.filter((u) => u.id === D.id).length,
                        };
                    });
                    assert.equal(ACTUAL.seedling, EXPECTED.seedling);
                    assert.equal(ACTUAL.count, 1);
                    assert.ok(Math.abs(ACTUAL.z - EXPECTED.modelZ - EXPECTED.lift) < 1e-6);
                    if (AGE < 1.15) {
                        assert.equal(await PAGE.locator('#seedlingReveal').isVisible(), false);
                    }
                    MOTION.push(EXPECTED.lift);
                    await capture(PAGE, `${BACKEND}-transform-${AGE}.png`);
                    await verifyFaceProbe(PAGE, `${BACKEND}-face-transform-${AGE}.json`);
                }
                assert.ok(MOTION[1] > MOTION[0] && MOTION[1] > MOTION[2] && MOTION[2] > MOTION[3]);
                await PAGE.waitForSelector('#seedlingReveal:not([hidden])');
                await capture(PAGE, `${BACKEND}-discovery.png`);
                assert.match(await PAGE.locator('#seedlingReveal').innerText(), /콩 병종 발견/);
                await PAGE.locator('#seedlingReveal button').click();
                await PAGE.locator('#seedlingReveal').waitFor({ state: 'hidden' });
            }
            STAGES.push(STAGE);
            assert.equal(STAGE.seedling, meal < 3);
            assert.equal(STAGE.fed, false, 'Adult food/breeding eligibility remains unchanged');
            if (meal) {
                assert.ok(STAGE.size > STAGES[meal - 1].size);
                assert.ok(STAGE.radius > STAGES[meal - 1].radius);
            }
            await PAGE.waitForTimeout(80);
            await PAGE.waitForFunction((seedling) => {
                const DISPLAY = BUDMORI.runtime.presentationView;
                return (
                    Math.abs(DISPLAY.time - BUDMORI.sim.time) < 1e-6 &&
                    DISPLAY.units.some((u) => u.id === globalThis.growthSubject && u.isSeedling === seedling)
                );
            }, meal < 3);
            assert.equal(
                await PAGE.evaluate(
                    () => BUDMORI.runtime.presentationView.units.find((u) => u.id === globalThis.growthSubject).fed,
                ),
                meal > 0 && meal < 3,
                'Growing portrait reads its own meal count',
            );
            await capture(PAGE, `${BACKEND}-meal-${meal}.png`);
            await verifyFaceProbe(PAGE, `${BACKEND}-face-meal-${meal}.json`);
            const SUBMISSION = await PAGE.evaluate(() => BUDMORI.renderer.unitSprites.stats());
            submittedBodies += SUBMISSION[BACKEND];
            if (BACKEND === 'vector') {
                assert.equal(SUBMISSION.sprite, 0, 'Vector test submits no sprite bodies');
            }
            if (meal === 1) {
                await PAGE.evaluate(() => BUDMORI.storage.save(BUDMORI.sim));
                await PAGE.reload();
                await PAGE.waitForFunction(
                    () => globalThis.BUDMORI && BUDMORI.sim.units.some((u) => u.seedling?.fed === 1),
                );
                const LOADED = await PAGE.evaluate((backend) => {
                    BUDMORI.runtime.paused = true;
                    const U = BUDMORI.sim.units.find((u) => u.seedling);
                    globalThis.growthSubject = U.id;
                    BUDMORI.renderer.unitArtMode = backend;
                    BUDMORI.renderer.unitSprites.enabled = backend === 'sprite';
                    BUDMORI.renderer.resetZoom();
                    BUDMORI.renderer.zoomAt(1);
                    BUDMORI.renderer.takeCameraControl();
                    return { size: U.size, radius: U.radius, fed: U.seedling.fed };
                }, BACKEND);
                assert.deepEqual(LOADED, { size: STAGE.size, radius: STAGE.radius, fed: 1 });
                assert.equal(await PAGE.locator('#seedlingReveal').isVisible(), false);
            }
        }
        assert.ok(submittedBodies > 0, `${BACKEND} body path actually submitted`);
        await PAGE.evaluate(() => {
            const W = BUDMORI.sim;
            for (let count = 0; count < 500; count++) {
                const U = W.spawn(0, 1, 2, 2, {
                    lineage: { temperament: 0, genes: [0, 0], seedling: { fed: 2, cooldown: 0 } },
                });
                W.feedSeedling(U);
                W.removeUnit(U);
            }
            const ADULT = W.spawn(8, 1, 1, 0);
            ADULT.growthElapsed = ADULT.growthDuration;
            ADULT.dropLanded = true;
            ADULT.z = 0;
            ADULT.vz = 0;
            if (ADULT.seedling || ADULT.fed) {
                throw new Error('Adult species 9 treated as growing/fed seed');
            }
            ADULT.meals = 1;
            if (!ADULT.fed) {
                throw new Error('Adult fed contract changed');
            }
            globalThis.adultSprout = ADULT.id;
            BUDMORI.runtime.capturePresentation('reset');
        });
        await PAGE.waitForTimeout(100);
        assert.equal(await PAGE.locator('#seedlingReveal').isVisible(), false, '500 known growths never queue cards');
        await PAGE.waitForFunction(() =>
            BUDMORI.runtime.presentationView.units.some(
                (u) => u.id === globalThis.adultSprout && !u.isSeedling && u.seedlingScale === 1 && u.fed,
            ),
        );
        await PAGE.evaluate(() => {
            const W = BUDMORI.sim;
            for (const SPECIES of [7, 7, 6]) {
                const U = W.spawn(SPECIES, 1, 0, 0, {
                    lineage: { temperament: 0, genes: [0, 0], seedling: { fed: 2, cooldown: 0 } },
                });
                W.feedSeedling(U);
            }
            for (let tick = 0; tick < 25; tick++) {
                W.step(0.05);
            }
            BUDMORI.runtime.capturePresentation('reset');
        });
        await PAGE.waitForSelector('#seedlingReveal[data-species="7"]:not([hidden])');
        await PAGE.setViewportSize({ width: 390, height: 844 });
        await capture(PAGE, `${BACKEND}-mobile-card.png`);
        assert.ok(
            await PAGE.locator('#seedlingReveal').evaluate(
                (root) => root.getBoundingClientRect().right <= innerWidth && root.scrollWidth <= root.clientWidth,
            ),
        );
        await PAGE.locator('#codexOpen').click();
        assert.equal(await PAGE.locator('#codexDialog').isVisible(), true, 'Discovery card never blocks playing');
        await PAGE.locator('#codexClose').click();
        await PAGE.waitForSelector('#seedlingReveal[data-species="7"]:not([hidden])');
        await PAGE.locator('#seedlingReveal button').click();
        await PAGE.waitForSelector('#seedlingReveal[data-species="6"]:not([hidden])');
        await PAGE.locator('#seedlingReveal button').click();
        await PAGE.locator('#seedlingReveal').waitFor({ state: 'hidden' });
        await PAGE.setViewportSize({ width: 1100, height: 850 });
        await PAGE.evaluate(() => BUDMORI.storage.save(BUDMORI.sim));
        await PAGE.reload();
        await PAGE.waitForFunction(
            () => globalThis.BUDMORI && BUDMORI.sim.units.some((u) => u.species === 8 && !u.seedling),
        );
        assert.equal(
            await PAGE.locator('#seedlingReveal').isVisible(),
            false,
            'Reload does not replay old discoveries',
        );
        assert.deepEqual(ERRORS, []);
        console.log(
            `PASS ${BACKEND}: actual 0/1/2/3 meals, size/radius, snapshot/offline, fed, first/known cards, reload`,
        );
    }
} finally {
    await BROWSER.close();
    SERVER.close();
}
