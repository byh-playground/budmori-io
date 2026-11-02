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
        await PAGE.clock.install();
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
                BODY_SUBMISSIONS = new Map(),
                PENDING_BODIES = new Map(),
                DRAW = R.unitPresentation.draw,
                DRAW_BODY = R.unitPresentation.drawVectorUnit,
                BODY_DRAW = R.unitSprites.draw,
                DRAW_ACTOR = R.ctx.drawVectorActor,
                VALUES = (m) => [m.a, m.b, m.c, m.d, m.e, m.f],
                COMPOSE = (a, b) => [
                    a[0] * b[0] + a[2] * b[1],
                    a[1] * b[0] + a[3] * b[1],
                    a[0] * b[2] + a[2] * b[3],
                    a[1] * b[2] + a[3] * b[3],
                    a[0] * b[4] + a[2] * b[5] + a[4],
                    a[1] * b[4] + a[3] * b[5] + a[5],
                ];
            // Body submission may precede the actor's face. Observe the actual draw options for this render,
            // independently of which pass submits them, rather than assuming both share one call stack.
            R.unitSprites.draw = function (prepared, options) {
                const MATRIX = COMPOSE(VALUES(R.ctx.getTransform()), options.matrix),
                    RESULT = BODY_DRAW.call(this, prepared, options);
                const SUBMISSION = {
                    id: prepared.unit.id,
                    matrix: MATRIX,
                    generation: prepared.unit.generation,
                    frame: R.displayTimeMs,
                };
                if (RESULT) {
                    BODY_SUBMISSIONS.set(prepared.unit.id, SUBMISSION);
                } else {
                    PENDING_BODIES.set(prepared.player, SUBMISSION);
                }
                return RESULT;
            };
            R.ctx.drawVectorActor = function (actor, options) {
                const PENDING = PENDING_BODIES.get(actor),
                    MATRIX = PENDING ? COMPOSE(VALUES(R.ctx.getTransform()), options.matrix) : null,
                    RESULT = DRAW_ACTOR.call(this, actor, options);
                if (PENDING) {
                    BODY_SUBMISSIONS.set(PENDING.id, { ...PENDING, matrix: MATRIX });
                    PENDING_BODIES.delete(actor);
                }
                return RESULT;
            };
            R.unitPresentation.draw = function (unit, world) {
                ACTORS.push(unit.id);
                return DRAW.call(this, unit, world);
            };
            R.unitPresentation.drawVectorUnit = function (unit, world, point, radius, rest, hidden = false) {
                if (hidden) {
                    return DRAW_BODY.call(this, unit, world, point, radius, rest, hidden);
                }
                const FACE_DRAW = R.unitOverlays.drawFace,
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
                    result = DRAW_BODY.call(this, unit, world, point, radius, rest, hidden);
                } finally {
                    R.unitOverlays.drawFace = FACE_DRAW;
                    R.ctx.drawRegion = DRAW_REGION;
                }
                const ENTRY = this.preparedVisibleUnits.get(unit.id),
                    BODY = BODY_SUBMISSIONS.get(unit.id),
                    BODY_CURRENT = BODY?.frame === R.displayTimeMs && BODY.generation === unit.generation,
                    BODY_MATRIX = BODY_CURRENT ? BODY.matrix : null;
                if (
                    !BODY_MATRIX ||
                    !faceMatrix ||
                    submittedFace !== ENTRY.face ||
                    (faceBackend === 'atlas' && faceQuads < 3)
                ) {
                    throw new Error('Body/face submission observation missing');
                }
                const SCREEN = (matrix, x, y) => [
                        matrix[0] * x + matrix[2] * y + matrix[4],
                        matrix[1] * x + matrix[3] * y + matrix[5],
                    ],
                    ANCHORS = [faceAnchor.eyeLeft, faceAnchor.eyeRight, faceAnchor.mouth],
                    ERRORS = ['face-eye-left', 'face-eye-right', 'face-mouth'].map((name, index) => {
                        const REST = ENTRY.record.compiled.metadata.sockets[name].point,
                            ANCHOR = ANCHORS[index],
                            SOCKET = ENTRY.player.getSocket(name);
                        if (ANCHOR.some((value, axis) => value !== REST[axis])) {
                            throw new Error('Submitted face anchor differs from the body socket');
                        }
                        const FACE = SCREEN(faceMatrix, ...ANCHOR),
                            BODY = SCREEN(BODY_MATRIX, SOCKET.x, SOCKET.y);
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
                    faceBackend,
                    faceQuads,
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
                R.unitSprites.draw = BODY_DRAW;
                R.ctx.drawVectorActor = DRAW_ACTOR;
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

    // Hold the real button while the native clock, commands and merge animations continue.
    const HOLD_PULSE_MS = 100;
    await PAGE.clock.pauseAt(await PAGE.evaluate(() => Date.now() + 1000));
    const HOLD_OBSERVER = await PAGE.evaluate(() => {
        const SESSION = BUDMORI.runtime,
            COMMAND = SESSION.command;
        globalThis.__mergeHoldObservations = [];
        SESSION.command = function (command) {
            if (command.type !== 'merge') {
                return COMMAND.call(this, command);
            }
            const BEFORE = new Set(this.world.mergeTasks),
                RESULT = COMMAND.call(this, command);
            globalThis.__mergeHoldObservations.push({
                count: command.count ?? 1,
                started: this.world.mergeTasks
                    .filter((task) => !BEFORE.has(task))
                    .map((task) => ({ ids: [...task.materialIds], tier: task.sourceTier })),
            });
            return RESULT;
        };
        globalThis.__restoreMergeHoldObserver = () => {
            SESSION.command = COMMAND;
            delete globalThis.__mergeHoldObservations;
            delete globalThis.__restoreMergeHoldObserver;
        };
        return SESSION.world.time;
    });
    async function holdRoster(count, tier = 1) {
        await PAGE.evaluate(
            ({ count, tier }) => {
                const W = BUDMORI.sim;
                BUDMORI.runtime.paused = false;
                W.cancelMergeTasks();
                W.resetUnits();
                W.setWorkBasisPoints(0);
                W.food.length = 0;
                W.effects.length = 0;
                for (let index = 0; index < count; index++) {
                    const UNIT = W.spawn(0, tier, (index % 15) * 0.55 - 4, Math.floor(index / 15) * 0.55 - 2);
                    UNIT.growthElapsed = UNIT.growthDuration;
                    UNIT.dropLanded = true;
                    UNIT.z = UNIT.vz = 0;
                }
                globalThis.__mergeHoldObservations.length = 0;
            },
            { count, tier },
        );
        await PAGE.clock.runFor(50);
        assert.equal(
            await PAGE.locator('#merge').isEnabled(),
            true,
            JSON.stringify(
                await PAGE.evaluate(() => ({
                    decision: BUDMORI.sim.mergeAvailability(),
                    time: BUDMORI.sim.time,
                    units: BUDMORI.sim.units.length,
                    disabled: document.getElementById('merge').disabled,
                })),
            ),
        );
    }
    try {
        await holdRoster(90);
        const BUTTON = PAGE.locator('#merge'),
            BOX = await BUTTON.boundingBox();
        await PAGE.mouse.move(BOX.x + BOX.width / 2, BOX.y + BOX.height / 2);
        await PAGE.mouse.down();
        const QUEUED_MOUSE = await PAGE.evaluate(() => ({
            committed: globalThis.__mergeHoldObservations.length,
            pending: BUDMORI.runtime.pending
                .filter((command) => command.type === 'merge')
                .map((command) => command.count ?? 1),
            label: document.getElementById('merge').textContent.trim(),
        }));
        assert.deepEqual(QUEUED_MOUSE.pending, [1], 'press immediately queues exactly one native intent');
        assert.equal(QUEUED_MOUSE.committed, 0, 'native logic, not the DOM handler, commits the intent');
        assert.equal(QUEUED_MOUSE.label, '합성 ×1');
        // A 20 Hz deadline is visited by the next RAF: 50 ms alone can end before that frame.
        // Observe just before the next 100 ms input pulse; keep every expected operation count unchanged.
        await PAGE.clock.runFor(HOLD_PULSE_MS - 1);
        const PULSES = [],
            EXPECTED_COUNTS = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3];
        for (let pulse = 1; pulse <= 21; pulse++) {
            if (pulse > 1) {
                await PAGE.clock.runFor(HOLD_PULSE_MS);
            }
            const OBS = await PAGE.evaluate(() => ({
                commands: structuredClone(globalThis.__mergeHoldObservations),
                label: document.getElementById('merge').textContent,
                time: BUDMORI.sim.time,
            }));
            assert.equal(OBS.commands.length, pulse, `one intent per pulse ${pulse}`);
            const EXPECTED = EXPECTED_COUNTS[pulse - 1],
                LAST = OBS.commands.at(-1);
            assert.equal(LAST.count, EXPECTED, `pulse ${pulse} requested operations`);
            assert.equal(LAST.started.length, EXPECTED, `pulse ${pulse} native reserved tasks`);
            assert.match(OBS.label, new RegExp(`×${EXPECTED}$`));
            if ([1, 10, 11, 20, 21].includes(pulse)) {
                PULSES.push({ pulse, ...LAST });
            }
        }
        const ALL_IDS = await PAGE.evaluate(() =>
            globalThis.__mergeHoldObservations.flatMap((pulse) => pulse.started.flatMap((task) => task.ids)),
        );
        assert.equal(ALL_IDS.length, 66);
        assert.equal(new Set(ALL_IDS).size, ALL_IDS.length, 'no material is reserved by two tasks');
        await PAGE.screenshot({ path: path.join(OUT, 'merge-hold-pulse21.png') });
        await PAGE.mouse.up();
        assert.equal((await BUTTON.textContent()).trim(), '합성');
        await PAGE.clock.runFor(250);
        assert.equal(await PAGE.evaluate(() => globalThis.__mergeHoldObservations.length), 21);
        const REPRESS_BOX = await BUTTON.boundingBox();
        await PAGE.mouse.move(REPRESS_BOX.x + REPRESS_BOX.width / 2, REPRESS_BOX.y + REPRESS_BOX.height / 2);
        assert.equal(await BUTTON.isEnabled(), true);
        await PAGE.mouse.down();
        assert.equal((await BUTTON.textContent()).trim(), '합성 ×1');
        await PAGE.mouse.up();
        await PAGE.clock.runFor(100);
        assert.equal(await PAGE.evaluate(() => globalThis.__mergeHoldObservations.at(-1).count), 1);
        assert.equal(await PAGE.evaluate(() => globalThis.__mergeHoldObservations.length), 22);
        assert((await PAGE.evaluate(() => BUDMORI.sim.time)) > HOLD_OBSERVER + 2);
        console.log('PASS native merge hold pulse boundaries', JSON.stringify(PULSES));

        await holdRoster(9, 3);
        await PAGE.evaluate(() => BUDMORI.runtime.queue('merge', { count: 4 }));
        // The next 20 Hz tick must first be visited by a native RAF. A single
        // 50 ms window can end between that tick's deadline and its RAF; two
        // logical ticks cover the handoff without flushing the command directly.
        // There is no held input here, so advancing does not enqueue another pulse.
        await PAGE.clock.runFor(100);
        assert.equal(await PAGE.evaluate(() => globalThis.__mergeHoldObservations.length), 1);
        const GRADE_BATCH = await PAGE.evaluate(() => globalThis.__mergeHoldObservations.at(-1));
        assert.equal(GRADE_BATCH.count, 4, 'the one queued execution requests four merges');
        assert.equal(GRADE_BATCH.started.length, 3, 'partial batch stops when materials run out');
        assert(GRADE_BATCH.started.every((task) => task.ids.length === 3 && task.tier === 3));
        assert.equal(new Set(GRADE_BATCH.started.flatMap((task) => task.ids)).size, 9);

        await holdRoster(3);
        await BUTTON.focus();
        await PAGE.keyboard.down(' ');
        await PAGE.clock.runFor(500);
        assert.equal(await PAGE.evaluate(() => globalThis.__mergeHoldObservations.length), 1);
        assert.equal((await BUTTON.textContent()).trim(), '합성', 'exhausted hold resets');
        await PAGE.keyboard.up(' ');
        await PAGE.clock.runFor(50);
        assert.equal(await PAGE.evaluate(() => globalThis.__mergeHoldObservations.length), 1, 'no key-up click');

        await holdRoster(12);
        await BUTTON.focus();
        await PAGE.keyboard.down('Enter');
        await PAGE.clock.runFor(150);
        await PAGE.keyboard.up('Enter');
        assert.equal(await PAGE.evaluate(() => globalThis.__mergeHoldObservations.length), 2);
        await PAGE.clock.runFor(250);
        assert.equal(await PAGE.evaluate(() => globalThis.__mergeHoldObservations.length), 2);
        await BUTTON.dispatchEvent('pointerdown', {
            button: 0,
            pointerId: 41,
            pointerType: 'touch',
            isPrimary: true,
        });
        await PAGE.clock.runFor(50);
        await BUTTON.dispatchEvent('pointercancel', { pointerId: 41, pointerType: 'touch', isPrimary: true });
        await PAGE.clock.runFor(250);
        assert.equal(await PAGE.evaluate(() => globalThis.__mergeHoldObservations.length), 3);
        assert.equal((await BUTTON.textContent()).trim(), '합성');
        console.log('PASS grade costs, material exhaustion, keyboard reset and touch interruption');

        // Browser-dispatched touch input exercises implicit capture; a synthetic
        // PointerEvent alone would not reproduce a finger dragging off the button.
        const TOUCH = await PAGE.context().newCDPSession(PAGE);
        let touchActive = false;
        await TOUCH.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
        try {
            await holdRoster(40);
            await PAGE.evaluate(() => {
                const BUTTON = document.getElementById('merge'),
                    LISTENERS = new AbortController();
                globalThis.__touchMergeHold = { pointerId: null, outsideCaptured: false, leaves: 0 };
                globalThis.__stopTouchMergeObservation = () => {
                    LISTENERS.abort();
                    delete globalThis.__touchMergeHold;
                    delete globalThis.__stopTouchMergeObservation;
                };
                BUTTON.addEventListener(
                    'pointerdown',
                    (event) => {
                        if (event.pointerType === 'touch') {
                            globalThis.__touchMergeHold.pointerId = event.pointerId;
                        }
                    },
                    { signal: LISTENERS.signal },
                );
                BUTTON.addEventListener(
                    'pointermove',
                    (event) => {
                        const OBS = globalThis.__touchMergeHold,
                            BOUNDS = BUTTON.getBoundingClientRect();
                        if (
                            event.pointerId === OBS.pointerId &&
                            (event.clientX < BOUNDS.left ||
                                event.clientX > BOUNDS.right ||
                                event.clientY < BOUNDS.top ||
                                event.clientY > BOUNDS.bottom)
                        ) {
                            OBS.outsideCaptured = BUTTON.hasPointerCapture(event.pointerId);
                        }
                    },
                    { signal: LISTENERS.signal },
                );
                BUTTON.addEventListener(
                    'pointerleave',
                    (event) => {
                        if (event.pointerId === globalThis.__touchMergeHold.pointerId) {
                            globalThis.__touchMergeHold.leaves++;
                        }
                    },
                    { signal: LISTENERS.signal },
                );
            });
            const START_BOX = await BUTTON.boundingBox(),
                // Cross the edge within touch slop so native panning does not cancel the pointer first.
                POINT = { x: START_BOX.x + 2, y: START_BOX.y + START_BOX.height / 2, id: 1 };
            await TOUCH.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [POINT] });
            touchActive = true;
            await PAGE.clock.runFor(11 * HOLD_PULSE_MS - 1);
            assert.equal(await PAGE.evaluate(() => globalThis.__mergeHoldObservations.length), 11);
            assert.equal(await PAGE.evaluate(() => globalThis.__mergeHoldObservations.at(-1).count), 2);
            assert.equal(
                await PAGE.evaluate(() => {
                    const BUTTON = document.getElementById('merge');
                    return BUTTON.hasPointerCapture(globalThis.__touchMergeHold.pointerId);
                }),
                true,
                'native touch has implicit pointer capture',
            );
            const LIVE_BOX = await BUTTON.boundingBox();
            await TOUCH.send('Input.dispatchTouchEvent', {
                type: 'touchMove',
                touchPoints: [{ ...POINT, x: LIVE_BOX.x - 2 }],
            });
            const DRAG = await PAGE.evaluate(() => ({
                ...globalThis.__touchMergeHold,
                captureRetained: document
                    .getElementById('merge')
                    .hasPointerCapture(globalThis.__touchMergeHold.pointerId),
                label: document.getElementById('merge').textContent.trim(),
            }));
            assert.equal(DRAG.outsideCaptured, true, 'outside move arrives at captured button');
            assert.equal(DRAG.captureRetained, true, 'ending hold does not release browser capture');
            assert.equal(DRAG.leaves, 0, 'captured touch emits no pointerleave');
            assert.equal(DRAG.label, '합성', 'drag outside resets rate immediately');
            await PAGE.clock.runFor(400);
            assert.equal(await PAGE.evaluate(() => globalThis.__mergeHoldObservations.length), 11);
            await TOUCH.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
            touchActive = false;
            const AGAIN_BOX = await BUTTON.boundingBox();
            await TOUCH.send('Input.dispatchTouchEvent', {
                type: 'touchStart',
                touchPoints: [{ x: AGAIN_BOX.x + AGAIN_BOX.width / 2, y: AGAIN_BOX.y + AGAIN_BOX.height / 2, id: 2 }],
            });
            touchActive = true;
            const OBSERVE_TOUCH = () =>
                PAGE.evaluate(() => ({
                    count: globalThis.__mergeHoldObservations.length,
                    last: structuredClone(globalThis.__mergeHoldObservations.at(-1)),
                    pending: BUDMORI.runtime.pending
                        .filter((command) => command.type === 'merge')
                        .map((command) => command.count ?? 1),
                    label: document.getElementById('merge').textContent.trim(),
                    tick: BUDMORI.runtime.tick,
                    tickRate: BUDMORI.runtime.profile.tickRate,
                    clockMs: performance.now(),
                    lastRafMs: BUDMORI.runtime.pulseTimestamp,
                    simulationTimeMs: BUDMORI.runtime.loop.simulationTimeMs,
                }));
            const QUEUED_TOUCH = await OBSERVE_TOUCH();
            assert.equal(QUEUED_TOUCH.label, '합성 ×1', 'fresh touch resets before simulation advances');
            assert.equal(QUEUED_TOUCH.count, 11, 'input uses the native command queue');
            assert.deepEqual(QUEUED_TOUCH.pending, [1], 'fresh touch queues exactly one one-merge execution');
            // Release before visiting the next tick: the intentional first pulse
            // remains valid, while no 100 ms repeat can enter the command queue.
            await TOUCH.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
            touchActive = false;
            let committedTouch = await OBSERVE_TOUCH();
            const TICK_MS = 1000 / QUEUED_TOUCH.tickRate;
            // A queued command commits when a native RAF visits its logical
            // deadline. Observe that handoff for at most two actual tick periods.
            for (let step = 0; step < 2 && committedTouch.count < 12; step++) {
                await PAGE.clock.runFor(TICK_MS);
                committedTouch = await OBSERVE_TOUCH();
            }
            assert.equal(committedTouch.count, 12, JSON.stringify(committedTouch));
            assert.equal(committedTouch.last.count, 1);
            assert.equal(committedTouch.last.started.length, 1);
            assert.deepEqual(committedTouch.pending, []);
            console.log(
                'OBS fresh touch native commit',
                JSON.stringify({ queued: QUEUED_TOUCH, committed: committedTouch }),
            );
            console.log('PASS native touch drag outside under implicit capture resets hold', JSON.stringify(DRAG));
        } finally {
            if (touchActive) {
                await TOUCH.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
            }
            await TOUCH.send('Emulation.setTouchEmulationEnabled', { enabled: false });
            await TOUCH.detach();
            await PAGE.evaluate(() => globalThis.__stopTouchMergeObservation?.());
        }
    } finally {
        await PAGE.mouse.up();
        await PAGE.keyboard.up(' ');
        await PAGE.keyboard.up('Enter');
        await PAGE.evaluate(() => {
            window.dispatchEvent(new Event('blur'));
            globalThis.__restoreMergeHoldObserver();
        });
        await PAGE.clock.resume();
    }
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
