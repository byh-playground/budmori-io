// Returning player's fixed flow: inspect, invest, preview, reset, enter a run, and reload the farm.
// Fixtures supply an earned Lv50 save, not attack outcomes. All purchases use actual UI commands.
// Chromium SwiftShader plus pinned GameKit modules; touch emulation is not a physical-device claim.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { unitBodyDefinition } from '../src/features/unit-body/definition.js';

const CASE = process.argv[2] || 'ui',
    VIEWPORT = process.argv[3] || 'desktop',
    VIEWPORT_SIZE =
        VIEWPORT === 'landscape'
            ? { width: 844, height: 390 }
            : VIEWPORT === 'mobile'
              ? { width: 390, height: 844 }
              : { width: 1100, height: 850 },
    STARTED = Date.now();
assert.ok(
    ['ui', 'previews-low', 'previews-high', 'battle', 'battle-extra', 'continuity', 'migration'].includes(CASE),
    'case must name a fixed growth, preview, battle, continuity, or migration flow',
);
assert.ok(['desktop', 'mobile', 'landscape'].includes(VIEWPORT), 'viewport must be desktop, mobile, or landscape');

function progress(step) {
    console.log(`[peanut ${CASE}/${VIEWPORT} +${((Date.now() - STARTED) / 1000).toFixed(1)}s] ${step}`);
}

const ROOT = fileURLToPath(new URL('../', import.meta.url)),
    OUTPUT = path.join(ROOT, 'tests/output/peanut-growth'),
    TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' },
    REPORT = [],
    ERRORS = [];
let activePage = null;
fs.mkdirSync(OUTPUT, { recursive: true });
const SERVER = http.createServer((request, response) => {
    const FILE = path.resolve(ROOT, '.' + decodeURIComponent(request.url.split('?')[0]));
    if (!FILE.startsWith(ROOT) || !fs.existsSync(FILE) || fs.statSync(FILE).isDirectory()) {
        response.writeHead(404).end();
        return;
    }
    response.setHeader('content-type', TYPES[path.extname(FILE)] || 'application/octet-stream');
    response.end(fs.readFileSync(FILE));
});
await new Promise((resolve) => SERVER.listen(0, '127.0.0.1', resolve));
const GAME_URL = `http://127.0.0.1:${SERVER.address().port}/index.html`,
    BROWSER = await chromium.launch({
        executablePath: process.env.CHROME_PATH,
        args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
    });

async function activate(locator, mobile) {
    await locator.scrollIntoViewIfNeeded();
    if (mobile) {
        await locator.tap();
    } else {
        await locator.click();
    }
}
async function openPeanut(page, mobile) {
    await activate(page.locator('#upgradeMenu'), mobile);
    await activate(page.locator('#menuTabAbilities'), mobile);
    await activate(page.locator('[data-ability-species="4"]'), mobile);
    await page.locator('[data-growth-tree]').waitFor();
}
function node(page, id) {
    return page.locator(`[data-growth-node="${id}"] button`);
}
async function purchase(page, id, mobile) {
    const BEFORE = await page.locator(`[data-growth-node="${id}"] .growth-rank`).textContent();
    assert.equal(await node(page, id).getAttribute('aria-disabled'), 'false', `${id} is available`);
    await activate(node(page, id), mobile);
    await page.waitForFunction(
        ({ id: nodeId, before }) =>
            document.querySelector(`[data-growth-node="${nodeId}"] .growth-rank`)?.textContent !== before,
        { id, before: BEFORE },
    );
}
async function settleCapturedFrame(frame) {
    await frame.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function resumeCapturedFrame(frame) {
    await frame.evaluate(() => {
        BUDMORI.runtime.loop.resetTiming();
        BUDMORI.runtime.paused = false;
    });
}

async function treeScrollPane(page) {
    const SELECTOR = await page.evaluate(() =>
        getComputedStyle(document.getElementById('abilityPanel')).overflowY === 'auto'
            ? '#abilityPanel'
            : '#abilityNodes',
    );
    return page.locator(SELECTOR);
}

async function swipeTree(page, upward = true, distance = Infinity) {
    const PANE = await treeScrollPane(page),
        GEOMETRY = await PANE.evaluate((element) => {
            const BOX = element.getBoundingClientRect(),
                TOP = Math.max(0, BOX.top),
                BOTTOM = Math.min(innerHeight, BOX.bottom),
                HEIGHT = BOTTOM - TOP,
                INSET = Math.min(8, HEIGHT * 0.1),
                X = Math.max(0, BOX.left) + 3;
            return {
                top: TOP,
                bottom: BOTTOM,
                height: HEIGHT,
                x: X,
                startY: BOTTOM - INSET,
                endY: TOP + INSET,
                hitInside: element.contains(document.elementFromPoint(X, BOTTOM - INSET)),
                clientHeight: element.clientHeight,
                scrollHeight: element.scrollHeight,
                scrollTop: element.scrollTop,
            };
        }),
        CDP = await page.context().newCDPSession(page);
    assert.ok(GEOMETRY.height > 24, 'a visible scroll pane permits a touch gesture');
    assert.equal(GEOMETRY.hitInside, true, 'swipe begins in the scroll pane gutter, outside embedded frames');
    const START = upward ? GEOMETRY.startY : GEOMETRY.endY,
        END = START + (upward ? -1 : 1) * Math.min(distance, GEOMETRY.startY - GEOMETRY.endY);
    await CDP.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: GEOMETRY.x, y: START }] });
    for (let step = 1; step <= 8; step++) {
        await page.waitForTimeout(20);
        await CDP.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x: GEOMETRY.x, y: START + ((END - START) * step) / 8 }],
        });
    }
    await page.waitForTimeout(120);
    await CDP.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await CDP.detach();
    await page.waitForTimeout(120);
    return GEOMETRY;
}

async function revealPreview(page, frame, mobile) {
    const HOST = page.locator('.growth-evolution-preview iframe'),
        PANE = await treeScrollPane(page);
    if (!mobile) {
        await HOST.scrollIntoViewIfNeeded();
    }
    const LIMIT = await PANE.evaluate(
        (element) => Math.ceil(element.scrollHeight / Math.max(24, element.clientHeight * 0.6)) + 3,
    );
    for (let attempt = 0; attempt < LIMIT; attempt++) {
        const BOX = await HOST.boundingBox(),
            SCROLL = await PANE.boundingBox(),
            TOP = Math.max(0, SCROLL.y),
            BOTTOM = Math.min(VIEWPORT_SIZE.height, SCROLL.y + SCROLL.height),
            VISIBLE = Math.min(BOTTOM, BOX.y + BOX.height) - Math.max(TOP, BOX.y);
        REPORT.push({ kind: 'preview-scroll-attempt', attempt, iframe: BOX, pane: SCROLL, visibleHeight: VISIBLE });
        if (VISIBLE >= BOX.height - 3) {
            assert.ok(VISIBLE >= 160, 'at least160px of actual preview canvas is visible');
            const CANVAS = await frame.locator('#world').boundingBox();
            assert.ok(CANVAS && CANVAS.width > 100 && CANVAS.height >= 160, 'real canvas has readable dimensions');
            REPORT.push({
                kind: 'preview-access',
                viewport: VIEWPORT,
                iframe: BOX,
                pane: SCROLL,
                canvas: CANVAS,
                visibleHeight: VISIBLE,
            });
            return;
        }
        if (mobile) {
            const DELTA = BOX.y + BOX.height / 2 - (TOP + BOTTOM) / 2;
            await swipeTree(page, DELTA > 0, Math.max(24, Math.abs(DELTA) + 12));
        } else {
            await page.mouse.move(SCROLL.x + 3, SCROLL.y + SCROLL.height / 2);
            await page.mouse.wheel(0, BOX.y + BOX.height > BOTTOM ? 100 : -100);
            await page.waitForTimeout(150);
        }
    }
    throw new Error('Actual scrolling could not expose the full preview canvas within the viewport');
}

// SwiftShader can render slower than a short projectile/recovery lasts. Observe the real
// main-world action at most half a 20Hz tick per frame; never inject steps,
// poses or contacts. Other user flows and benchmarks keep their normal clock.
async function limitMainMotionObservationClock(page) {
    await page.evaluate(() => {
        const SESSION = BUDMORI.runtime;
        if (!SESSION.__peanutMotionClock) {
            const CLOCK = {
                    active: true,
                    lastInput: null,
                    current: null,
                    maxInputDeltaMs: 0,
                    maxForwardedDeltaMs: 0,
                    frames: 0,
                    advance(now) {
                        if (this.lastInput === null) {
                            this.current = now;
                        } else if (now !== this.lastInput) {
                            const DELTA = Math.max(0, now - this.lastInput),
                                FORWARDED = this.active ? Math.min(25, DELTA) : DELTA;
                            this.current += FORWARDED;
                            if (this.active) {
                                this.maxInputDeltaMs = Math.max(this.maxInputDeltaMs, DELTA);
                                this.maxForwardedDeltaMs = Math.max(this.maxForwardedDeltaMs, FORWARDED);
                                this.frames++;
                            }
                        }
                        this.lastInput = now;
                        return this.current;
                    },
                },
                PULSE = SESSION.pulse;
            SESSION.__peanutMotionClock = CLOCK;
            SESSION.pulse = function (now) {
                return PULSE.call(this, CLOCK.advance(now));
            };
            SESSION.loop.resetTiming();
        }
        SESSION.__peanutMotionClock.active = true;
    });
}

async function observeDrawnPeanut(page) {
    await page.waitForFunction((body) => {
        const UNIT = globalThis.BUDMORI?.sim?.units[0],
            RENDERER = globalThis.BUDMORI?.renderer,
            PLAYER = UNIT && RENDERER.vectorPlayers.get(UNIT.id);
        if (!PLAYER) {
            return false;
        }
        if (!BUDMORI.runtime.__peanutClockObserver) {
            const SESSION = BUDMORI.runtime,
                PRESENT = SESSION.presentation;
            SESSION.presentation = function (now) {
                const CLOCK = this.__peanutMotionClock?.advance(now) ?? now;
                globalThis.__peanutInputClock = CLOCK;
                return PRESENT.call(this, CLOCK);
            };
            SESSION.__peanutClockObserver = true;
        }
        if (PLAYER.__peanutCaptureWrapped) {
            return true;
        }
        const DRAW = PLAYER.draw,
            WRAPPER = Object.create(PLAYER),
            COMPILED = RENDERER.vectorAssets.get(4).compiled,
            TRANSFORM = (matrix, x, y) => ({
                x: matrix[0] * x + matrix[2] * y + matrix[4],
                y: matrix[1] * x + matrix[3] * y + matrix[5],
            }),
            BOUNDS = (points) => ({
                left: Math.min(...points.map((point) => point.x)),
                right: Math.max(...points.map((point) => point.x)),
                top: Math.min(...points.map((point) => point.y)),
                bottom: Math.max(...points.map((point) => point.y)),
            });
        globalThis.__peanutMotionEnvelopes = {};
        Object.defineProperty(WRAPPER, 'draw', {
            value(options) {
                // Forward the immutable native player unchanged. Read the exact
                // authored mesh, native part transforms and submitted body matrix,
                // rather than inventing extra actors or a second pose generator.
                const DISPLAY = BUDMORI.runtime.presentationView?.units.find((unit) => unit.id === UNIT.id),
                    POSES = PLAYER.partPoses(),
                    VERTICES = COMPILED.geometry.vertices,
                    MATRIX = options.matrix,
                    PIXEL = (point) => {
                        const P = TRANSFORM(MATRIX, point.x, point.y);
                        return { x: P.x / RENDERER.pixelRatio, y: P.y / RENDERER.pixelRatio };
                    },
                    POINTS = [],
                    PART_POINTS = {};
                for (let offset = 0; offset < VERTICES.length; offset += COMPILED.geometry.strideFloats) {
                    const PART_INDEX = VERTICES[offset + 10],
                        POSE = POSES[PART_INDEX];
                    if (!POSE.visible || POSE.opacity <= 0) {
                        continue;
                    }
                    const X =
                            VERTICES[offset] +
                            VERTICES[offset + 6] * POSE.morph[0] +
                            VERTICES[offset + 8] * POSE.morph[1],
                        Y =
                            VERTICES[offset + 1] +
                            VERTICES[offset + 7] * POSE.morph[0] +
                            VERTICES[offset + 9] * POSE.morph[1],
                        POINT = PIXEL(TRANSFORM(POSE.transform, X, Y)),
                        NAME = COMPILED.metadata.parts[PART_INDEX].id;
                    POINTS.push(POINT);
                    (PART_POINTS[NAME] ??= []).push(POINT);
                }
                const BODY = PLAYER.getPartPose('body'),
                    TORSO = BOUNDS(
                        [
                            [body.left, body.top],
                            [body.right, body.top],
                            [body.left, body.bottom],
                            [body.right, body.bottom],
                        ].map(([x, y]) => PIXEL(TRANSFORM(BODY.transform, x, y))),
                    ),
                    RESULT = DRAW.call(PLAYER, options),
                    ACTION = UNIT.ability.action?.peanutAttack,
                    DATA = DISPLAY
                        ? {
                              matrix: [...MATRIX],
                              clip: PLAYER.currentClip,
                              nativeTimeMs: PLAYER.currentTimeMs,
                              sourceSha256: COMPILED.sourceSha256,
                              vertices: POINTS.length,
                              bounds: BOUNDS(POINTS),
                              partBounds: Object.fromEntries(
                                  Object.entries(PART_POINTS).map(([name, points]) => [name, BOUNDS(points)]),
                              ),
                              torso: { width: TORSO.right - TORSO.left, height: TORSO.bottom - TORSO.top },
                              kernels: Object.fromEntries(
                                  ['left', 'right'].map((side) => [
                                      side,
                                      {
                                          pose: PLAYER.getPartPose(`kernel-${side}`),
                                          socket: PIXEL(PLAYER.getSocket(`kernel-${side}-center`)),
                                      },
                                  ]),
                              ),
                              shell: PLAYER.getPartPose('shell-base'),
                              viewport: { width: innerWidth, height: innerHeight },
                              actionId: DISPLAY.ability.peanutActionId,
                              phase: DISPLAY.ability.phase,
                              elapsed: DISPLAY.ability.elapsed,
                              form: DISPLAY.ability.peanutForm,
                              stage: DISPLAY.ability.peanutStage,
                              progress: DISPLAY.ability.peanutStageProgress,
                              slot: DISPLAY.ability.peanutSlot,
                              x: DISPLAY.x,
                              y: DISPLAY.y,
                              z: DISPLAY.z,
                              at: RENDERER.displayTimeMs,
                          }
                        : null;
                globalThis.__peanutDraw = DATA;
                if (ACTION && DATA && ACTION.id === DATA.actionId) {
                    const ENVELOPE = (globalThis.__peanutMotionEnvelopes[ACTION.id] ??= {
                        ...DATA.bounds,
                        draws: 0,
                        samples: [],
                    });
                    for (const KEY of ['left', 'top']) {
                        ENVELOPE[KEY] = Math.min(ENVELOPE[KEY], DATA.bounds[KEY]);
                    }
                    for (const KEY of ['right', 'bottom']) {
                        ENVELOPE[KEY] = Math.max(ENVELOPE[KEY], DATA.bounds[KEY]);
                    }
                    ENVELOPE.draws++;
                    if (DATA.phase === 'active') {
                        ENVELOPE.samples.push({
                            actionId: DATA.actionId,
                            slot: DATA.slot,
                            stage: DATA.stage,
                            elapsed: DATA.elapsed,
                            nativeTimeMs: DATA.nativeTimeMs,
                            left: {
                                x: DATA.kernels.left.pose.x,
                                y: DATA.kernels.left.pose.y,
                                rotation: DATA.kernels.left.pose.rotation,
                            },
                            right: {
                                x: DATA.kernels.right.pose.x,
                                y: DATA.kernels.right.pose.y,
                                rotation: DATA.kernels.right.pose.rotation,
                            },
                        });
                    }
                }
                const REQUEST = globalThis.__peanutCaptureRequest;
                if (!REQUEST || globalThis.__peanutCaptured || !ACTION || !DATA) {
                    return RESULT;
                }
                if (REQUEST.actionId !== null && REQUEST.actionId !== ACTION.id) {
                    globalThis.__peanutCaptureMiss ??= {
                        requestedActionId: REQUEST.actionId,
                        observedActionId: ACTION.id,
                        tick: BUDMORI.sim.simulationTick,
                    };
                    return RESULT;
                }
                if (ACTION.form !== REQUEST.tier || DATA.actionId !== ACTION.id || DATA.phase !== REQUEST.phase) {
                    return RESULT;
                }
                const MATCHES =
                    REQUEST.phase === 'windup'
                        ? DATA.elapsed >= ACTION.windupSeconds * 0.65
                        : REQUEST.phase === 'active'
                          ? DATA.slot === REQUEST.slot && DATA.progress >= 0.3 && DATA.progress <= 0.7
                          : DATA.elapsed >= 0.75 && ACTION.attack.hits.every((hits) => hits.length === 1);
                if (MATCHES) {
                    const SESSION = BUDMORI.runtime;
                    SESSION.paused = true;
                    SESSION.pauseStartedAt = globalThis.__peanutInputClock;
                    globalThis.__peanutCaptured = { actionId: ACTION.id, tick: BUDMORI.sim.simulationTick };
                }
                return RESULT;
            },
        });
        WRAPPER.__peanutCaptureWrapped = true;
        RENDERER.vectorPlayerAssets.set(WRAPPER, RENDERER.vectorPlayerAssets.get(PLAYER));
        RENDERER.vectorPlayers.set(UNIT.id, WRAPPER);
        return true;
    }, unitBodyDefinition(4).bounds);
}

async function captureMotion(page, tier, label) {
    await observeDrawnPeanut(page);
    if (label === 'main') {
        await limitMainMotionObservationClock(page);
    }
    const TRACE = [],
        CAPTURE = { kind: label, tier, trace: TRACE, observationClock: null },
        WEIGHTS = [
            [],
            [0.5, 0.5],
            [0.45, 0.55],
            [0.3, 0.3, 0.4],
            [0.25, 0.25, 0.5],
            [0.2, 0.2, 0.3, 0.3],
            [0.15, 0.15, 0.2, 0.2, 0.3],
        ][tier],
        STAGES = [{ phase: 'windup' }, ...WEIGHTS.map((_, slot) => ({ phase: 'active', slot })), { phase: 'recover' }];
    let actionId = null;
    // Retain the real drawn poses even if a later trajectory assertion fails.
    REPORT.push(CAPTURE);
    await page.evaluate(
        (request) => {
            globalThis.__peanutCaptured = null;
            globalThis.__peanutCaptureMiss = null;
            globalThis.__peanutCaptureRequest = request;
        },
        { tier, ...STAGES[0], actionId },
    );
    for (let index = 0; index < STAGES.length; index++) {
        const REQUEST = STAGES[index];
        await page.waitForFunction(() => !!globalThis.__peanutCaptured, null, { timeout: 18000, polling: 'raf' });
        await settleCapturedFrame(page);
        const STATE = await page.evaluate(() => {
            const WORLD = BUDMORI.sim,
                UNIT = WORLD.units[0],
                ACTION = UNIT.ability.action.peanutAttack;
            return {
                tick: WORLD.simulationTick,
                peanut: structuredClone(ACTION),
                drawn: structuredClone(globalThis.__peanutDraw),
                envelope: structuredClone(globalThis.__peanutMotionEnvelopes[ACTION.id]),
                hits: WORLD.notices.filter((event) => event.kind === 'boss-hit' && event.attackId === ACTION.id),
                bossHp: WORLD.boss.hp,
                unitCount: WORLD.units.length,
                projectileCount: WORLD.projectiles.length,
                actors: BUDMORI.renderer.actors
                    .filter((actor) => actor.presentation === BUDMORI.renderer.unitPresentation)
                    .map((actor) => actor.id),
                unitId: UNIT.id,
                z: UNIT.z,
                distance: Math.hypot(UNIT.x - WORLD.boss.x, UNIT.y - WORLD.boss.y),
                bossRadius: WORLD.boss.radius,
            };
        });
        assert.equal(STATE.drawn.phase, REQUEST.phase, 'native render retains captured phase');
        assert.equal(STATE.drawn.actionId, STATE.peanut.id, 'native pose belongs to the observed live action');
        if (REQUEST.phase === 'windup' || REQUEST.phase === 'active') {
            assert.ok(
                Math.abs(STATE.drawn.nativeTimeMs - STATE.drawn.elapsed * 1000) < 1e-6,
                'authored native clip uses the actual action phase clock, including paused frames',
            );
        }
        assert.equal(STATE.unitCount, 1, 'the two kernels remain one unit and one HP owner');
        assert.deepEqual(
            STATE.actors,
            [STATE.unitId],
            'exactly one actual body is submitted, never fake kernel actors',
        );
        assert.equal(STATE.projectileCount, 0, 'kernel cooperation never spawns a projectile');
        assert.equal(STATE.z, 0, 'the single body stays grounded');
        assert.ok(STATE.distance >= STATE.bossRadius - 0.05, 'body stays outside boss center');
        assert.ok(STATE.drawn.vertices > 0, 'actual native source mesh vertices were drawn');
        for (const BOUNDS of [STATE.drawn.bounds, STATE.envelope]) {
            assert.ok(
                ['left', 'top', 'right', 'bottom'].every((key) => Number.isFinite(BOUNDS[key])),
                'finite whole native artwork',
            );
            assert.ok(
                BOUNDS.left >= 0 &&
                    BOUNDS.right <= STATE.drawn.viewport.width &&
                    BOUNDS.top >= 0 &&
                    BOUNDS.bottom <= STATE.drawn.viewport.height,
                'every observed source kernel/shell/face trajectory fits the actual canvas',
            );
        }
        if (label === 'preview') {
            assert.ok(
                STATE.drawn.torso.width >= 32 && STATE.drawn.torso.height >= 32,
                'actual preview torso remains at least32px',
            );
        }
        if (REQUEST.phase === 'active') {
            assert.equal(STATE.drawn.slot, REQUEST.slot);
            assert.equal(STATE.drawn.stage, STATE.peanut.shots[REQUEST.slot].stage);
            assert.equal(STATE.drawn.clip, `fire-t${tier}`, 'native authored clip distinguishes this researched form');
            for (const KERNEL of Object.values(STATE.drawn.kernels)) {
                assert.equal(KERNEL.pose.visible, true);
                assert.ok(KERNEL.pose.opacity > 0.9, 'both real source kernels are visible');
                assert.ok([...KERNEL.pose.transform, ...Object.values(KERNEL.socket)].every(Number.isFinite));
            }
        } else if (REQUEST.phase === 'windup') {
            assert.equal(STATE.drawn.clip, `windup-t${tier}`);
        }
        TRACE.push(STATE);
        await page.screenshot({
            path: path.join(
                OUTPUT,
                `${VIEWPORT}-${label}-t${tier}-${REQUEST.phase}${REQUEST.slot === undefined ? '' : `-${REQUEST.slot}`}.png`,
            ),
        });
        assert.equal(
            await page.evaluate(() => BUDMORI.sim.simulationTick),
            STATE.tick,
            'PNG matches paused model tick',
        );
        actionId ??= STATE.peanut.id;
        await page.evaluate(
            (request) => {
                const SESSION = BUDMORI.runtime,
                    DURATION = SESSION.pausedDurationMs + globalThis.__peanutInputClock - SESSION.pauseStartedAt;
                globalThis.__peanutCaptureRequest = request;
                globalThis.__peanutCaptured = null;
                SESSION.loop.resetTiming();
                SESSION.paused = false;
                SESSION.pausedDurationMs = DURATION;
            },
            index + 1 < STAGES.length ? { tier, ...STAGES[index + 1], actionId } : null,
        );
    }
    assert.equal(
        new Set(TRACE.map((state) => state.peanut.id)).size,
        1,
        'every pose and collision is the same real action',
    );
    assert.ok(TRACE.at(-1).bossHp < TRACE[0].bossHp, 'real kernel contacts damage the boss');
    assert.equal(TRACE.at(-1).hits.length, WEIGHTS.length, 'each budgeted contact hits once');
    assert.equal(new Set(TRACE.at(-1).hits.map((hit) => hit.sequence)).size, WEIGHTS.length);
    assert.deepEqual(
        TRACE[0].peanut.shots.map((shot) => shot.weight),
        WEIGHTS,
        'observed attack has the requested contact budget',
    );
    const MOTION = TRACE.at(-1).envelope.samples,
        EXPECTED_STAGES = [
            [],
            ['tap-left', 'tap-right'],
            ['spread-left', 'spread-right'],
            ['cross-left', 'cross-right', 'cross-left'],
            ['close-left', 'close-right', 'central'],
            ['sweep-left', 'sweep-right', 'close-left', 'close-right'],
            ['spread-left', 'spread-right', 'sweep-left', 'sweep-right', 'central'],
        ][tier];
    assert.deepEqual(
        TRACE.filter((state) => state.drawn.phase === 'active').map((state) => state.drawn.stage),
        EXPECTED_STAGES,
    );
    for (const [SLOT, STAGE] of EXPECTED_STAGES.entries()) {
        const SAMPLES = MOTION.filter((sample) => sample.slot === SLOT),
            SIDE = STAGE.endsWith('right') ? 'right' : 'left';
        assert.ok(
            SAMPLES.length > 0 && SAMPLES.some((sample) => Math.hypot(sample[SIDE].x, sample[SIDE].y) > 1),
            'the actual source kernel moves during this contact',
        );
        if (STAGE.startsWith('sweep')) {
            assert.ok(
                SAMPLES.some((sample) => sample[SIDE].x < -1) && SAMPLES.some((sample) => sample[SIDE].x > 1),
                'native semicircle traverses both sides, not a renamed straight tap',
            );
        } else if (STAGE.startsWith('spread')) {
            assert.ok(
                SAMPLES.some((sample) => (SIDE === 'left' ? -1 : 1) * sample[SIDE].x > 20),
                'native spreading is visibly wider than the T1 tap',
            );
        } else if (STAGE.startsWith('cross')) {
            assert.ok(
                SAMPLES.some((sample) => (SIDE === 'left' ? 1 : -1) * sample[SIDE].x > 1),
                'native cross goes inward across the owner',
            );
        } else if (STAGE === 'central') {
            assert.ok(
                SAMPLES.some(
                    (sample) => sample.left.y < -10 && sample.right.y < -10 && sample.left.x > 0 && sample.right.x < 0,
                ),
                'central finish brings both native kernels inward together',
            );
        }
    }
    const OBSERVATION_CLOCK = await page.evaluate(() => {
        const CLOCK = BUDMORI.runtime.__peanutMotionClock;
        if (!CLOCK) {
            return { mode: 'production-help-clock' };
        }
        CLOCK.active = false;
        return {
            mode: 'bounded-main-motion-observation',
            maxDeltaMs: 25,
            frames: CLOCK.frames,
            maxInputDeltaMs: CLOCK.maxInputDeltaMs,
            maxForwardedDeltaMs: CLOCK.maxForwardedDeltaMs,
            limitation: 'Slowed actual model/render observation, not normal-speed or device performance evidence.',
        };
    });
    if (label === 'main') {
        assert.ok(OBSERVATION_CLOCK.maxForwardedDeltaMs <= 25);
    }
    CAPTURE.observationClock = OBSERVATION_CLOCK;
}

async function preview(page, tier, mobile) {
    const CONTROL = await page.locator(`[data-peanut-preview-tier="${tier}"]`).boundingBox();
    assert.ok(CONTROL && CONTROL.width >= 44 && CONTROL.height >= 44, 'preview control is at least44px');
    const BEFORE = await page.evaluate(() => JSON.stringify(BUDMORI.sim.playerProgression));
    await activate(page.locator(`[data-peanut-preview-tier="${tier}"]`), mobile);
    const HANDLE = await page.locator('.peanut-evolution-preview iframe').elementHandle(),
        FRAME = await HANDLE.contentFrame();
    await FRAME.waitForFunction(() => globalThis.BUDMORI?.sim?.units[0]?.species === 4);
    await revealPreview(page, FRAME, mobile);
    // Start a fresh real scenario after scrolling, which can consume its nine-second budget.
    await FRAME.goto(FRAME.url());
    await FRAME.waitForFunction(() => globalThis.BUDMORI?.sim?.units[0]?.species === 4);
    assert.equal(
        await FRAME.locator('#bossbar').evaluate((element) => getComputedStyle(element).display),
        'none',
        'isolated attack preview hides its boss HUD so it cannot cover the actual body',
    );
    // Frame has no screenshot method: capture its owner page while retaining frame-local timing.
    FRAME.screenshot = async (options) => {
        const CANVAS = await FRAME.locator('#world').boundingBox(),
            PANE = await (await treeScrollPane(page)).boundingBox(),
            DRAWN = await FRAME.evaluate(() => globalThis.__peanutDraw),
            BOUNDS = DRAWN.bounds;
        assert.ok(
            CANVAS.y + BOUNDS.top >= Math.max(0, PANE.y) &&
                CANVAS.y + BOUNDS.bottom <= Math.min(VIEWPORT_SIZE.height, PANE.y + PANE.height) &&
                CANVAS.x + BOUNDS.left >= 0 &&
                CANVAS.x + BOUNDS.right <= VIEWPORT_SIZE.width,
            'drawn actor is visible through owner-page clipping, not hidden below the pane',
        );
        await page.screenshot(options);
    };
    await captureMotion(FRAME, tier, 'preview');
    assert.equal(
        await page.evaluate(() => JSON.stringify(BUDMORI.sim.playerProgression)),
        BEFORE,
        'isolated preview never modifies farm progression',
    );
}

async function setupCombat(page, tier, mobile, researched = true) {
    await page.reload();
    await page.waitForFunction(() => globalThis.BUDMORI?.sim?.scene === 'farm');
    if (await page.locator('#gameMenuPanel').isVisible()) {
        await activate(page.locator('#gameMenuClose'), mobile);
    }
    await page.evaluate(
        async ({ tier: selectedTier, researched: fullResearch }) => {
            const { helpSceneById: HELP_SCENE_BY_ID } = await import('./src/help-scenes.js'),
                WORLD = BUDMORI.sim;
            HELP_SCENE_BY_ID(`peanut-t${selectedTier}`).setup(WORLD);
            if (!fullResearch) {
                WORLD.playerProgression.abilities['peanut-death-split'].nodeRanks = {};
                WORLD.runProgressionSnapshot.abilities['peanut-death-split'].nodeRanks = {};
            }
            WORLD.configureBossStage(1, 6);
            Object.assign(WORLD.boss, { z: 0, hp: 1e10, maxHp: 1e10, stun: 10000 });
            WORLD.units[0].x = -(WORLD.boss.radius + 1.45);
            WORLD._unitSpatialDirty = true;
        },
        { tier, researched },
    );
}

async function assertCombatFraming(page) {
    const FRAME = await page.evaluate(() => {
        const RENDERER = BUDMORI.renderer,
            UNIT = BUDMORI.sim.units[0],
            POINT = RENDERER.project(UNIT.x, UNIT.y, UNIT.z),
            RATIO = RENDERER.pixelRatio,
            HUD = ['bossbar', 'allyHealthText', 'bossHealthText', 'fightRetreat'].map((id) => {
                const ELEMENT = document.getElementById(id),
                    BOX = ELEMENT.getBoundingClientRect(),
                    STYLE = getComputedStyle(ELEMENT);
                return {
                    id,
                    x: BOX.x,
                    y: BOX.y,
                    right: BOX.right,
                    bottom: BOX.bottom,
                    visible:
                        STYLE.display !== 'none' && STYLE.visibility !== 'hidden' && BOX.width > 0 && BOX.height > 0,
                };
            });
        return { x: POINT.x / RATIO, y: POINT.y / RATIO, width: innerWidth, height: innerHeight, hud: HUD };
    });
    assert.ok(
        FRAME.x > 0 && FRAME.x < FRAME.width && FRAME.y > 0 && FRAME.y < FRAME.height,
        'attacking body stays in viewport',
    );
    for (const BOX of FRAME.hud) {
        assert.equal(BOX.visible, true, `${BOX.id} remains visible in actual gameplay`);
        assert.ok(
            BOX.x >= -1 && BOX.right <= FRAME.width + 1 && BOX.y >= -1 && BOX.bottom <= FRAME.height + 1,
            `${BOX.id} readable in ${VIEWPORT}`,
        );
    }
    return FRAME;
}

async function captureMainCombat(page, tier, mobile) {
    await setupCombat(page, tier, mobile);
    await captureMotion(page, tier, 'main');
    REPORT.at(-1).framing = await assertCombatFraming(page);
}

async function captureCrowdedCombat(page, mobile) {
    await setupCombat(page, 6, mobile);
    const BEFORE = await page.evaluate(() => {
        const WORLD = BUDMORI.sim,
            OTHERS = [0, 1, 2, 3, 5, 6, 7, 8];
        for (let index = 1; index < BUDMORI.CONFIG.farm.capacity.max; index++) {
            const SPECIES = index < 60 ? 4 : OTHERS[(index - 60) % OTHERS.length],
                ANGLE = index * 2.399963229728653,
                DISTANCE = WORLD.boss.radius + 2.8 + (index % 4) * 0.5,
                UNIT = WORLD.spawn(SPECIES, 6, Math.cos(ANGLE) * DISTANCE, Math.sin(ANGLE) * DISTANCE);
            UNIT.growth = 3;
            UNIT.growthElapsed = UNIT.growthDuration;
            UNIT.z = 0;
            UNIT.dropLanded = true;
        }
        WORLD._benched.clear();
        WORLD._benchRevision++;
        WORLD._unitSpatialDirty = true;
        return { hp: WORLD.boss.hp, tick: WORLD.simulationTick };
    });
    await page.waitForFunction(
        (before) => BUDMORI.sim.simulationTick >= before.tick + 40 && BUDMORI.sim.boss.hp < before.hp,
        BEFORE,
    );
    const AFTER = await page.evaluate(() => ({
        count: BUDMORI.sim.units.length,
        species: [...new Set(BUDMORI.sim.units.map((unit) => unit.species))],
        actors: BUDMORI.renderer.actors.filter((actor) => actor.presentation === BUDMORI.renderer.unitPresentation)
            .length,
        hp: BUDMORI.sim.boss.hp,
    }));
    assert.equal(AFTER.count, 200);
    assert.equal(AFTER.actors, 200);
    assert.equal(AFTER.species.length, 9);
    await page.screenshot({ path: path.join(OUTPUT, `${VIEWPORT}-mixed200.png`) });
    REPORT.push({ kind: 'maximum-mixed-play', before: BEFORE, after: AFTER });
    // Leave/re-enter the same real battle; no benchmark runs inside this fixed flow.
    await page.evaluate(() => {
        location.hash = '#/';
    });
    await page.locator('#startScreen').waitFor({ state: 'visible' });
    await activate(page.locator('#continueGame'), mobile);
    assert.equal(await page.evaluate(() => BUDMORI.sim.units.length), 200);
}

async function capturePeanutSplit(page, mobile) {
    const INITIAL = await page.evaluate(() => {
        const WORLD = BUDMORI.sim;
        WORLD.configureBossStage(1, 0);
        Object.assign(WORLD.boss, { z: 0, hp: 1e10, maxHp: 1e10, stun: 0 });
        WORLD.units.forEach((unit, index) => {
            const ANGLE = index * 2.399963229728653,
                DISTANCE = WORLD.boss.radius + (unit.species === 4 ? 0.5 : 3.5);
            Object.assign(unit, {
                x: Math.cos(ANGLE) * DISTANCE,
                y: Math.sin(ANGLE) * DISTANCE,
                z: 0,
                dropLanded: true,
            });
            if (unit.species === 4) {
                unit.hp = 1;
            }
        });
        WORLD._unitSpatialDirty = true;
        globalThis.__peanutSplitEvents = [];
        globalThis.__peanutSplitOff = WORLD.onNotice.on((notice) => {
            if (notice.kind === 'peanut-split') {
                globalThis.__peanutSplitEvents.push(structuredClone(notice));
            }
        });
        // A newborn only enters presentation after the committed model tick is
        // captured. Pausing inside its notice would freeze the older entity set.
        // Forward the real native draw, then pause on the first frame that drew
        // every actual child. Neither model timing nor the frozen player changes.
        const PRESENTATION = BUDMORI.renderer.unitPresentation,
            DRAW = PRESENTATION.draw;
        globalThis.__peanutSplitDraw = { frame: null, ids: [], children: [], complete: false };
        PRESENTATION.draw = function (unit, view) {
            const RESULT = DRAW.call(this, unit, view),
                STATE = globalThis.__peanutSplitDraw,
                FRAME = BUDMORI.renderer.displayTimeMs;
            if (STATE.frame !== FRAME) {
                STATE.frame = FRAME;
                STATE.ids = [];
                STATE.children = [];
            }
            STATE.ids.push(unit.id);
            const SOURCE = WORLD.units.find((child) => child.id === unit.id);
            if (unit.isBattleOnlySummon && SOURCE) {
                const ENTITY = BUDMORI.runtime.presentationAdapters.get(SOURCE);
                STATE.children.push({
                    id: unit.id,
                    generation: SOURCE.generation,
                    presentationId: ENTITY?.id,
                    presentationGeneration: ENTITY?.generation,
                    frame: FRAME,
                });
            }
            const CHILDREN = WORLD.units.filter((child) => child.isBattleOnlySummon);
            if (
                globalThis.__peanutSplitEvents.length > 0 &&
                CHILDREN.length >= 2 &&
                CHILDREN.every((child) => STATE.ids.includes(child.id))
            ) {
                STATE.complete = true;
                BUDMORI.runtime.paused = true;
            }
            return RESULT;
        };
        globalThis.__peanutSplitDrawOff = () => {
            PRESENTATION.draw = DRAW;
        };
        return {
            count: WORLD.units.length,
            tick: WORLD.simulationTick,
            peanuts: WORLD.units.filter((unit) => unit.species === 4).map((unit) => unit.id),
        };
    });
    assert.equal(INITIAL.count, 200);
    await page.waitForFunction(() => globalThis.__peanutSplitDraw.complete && BUDMORI.runtime.paused);
    await settleCapturedFrame(page);
    const SPLIT = await page.evaluate(() => ({
        tick: BUDMORI.sim.simulationTick,
        events: globalThis.__peanutSplitEvents,
        nativeDraw: globalThis.__peanutSplitDraw,
        count: BUDMORI.sim.units.length,
        children: BUDMORI.sim.units
            .filter((unit) => unit.isBattleOnlySummon)
            .map((unit) => ({
                id: unit.id,
                generation: unit.generation,
                tier: unit.tier,
                species: unit.species,
                parent: unit.battleSummonParentId,
                canSplit: unit.canSplit,
                permanent: unit.countsTowardPermanentRoster,
                breeding: unit.breedingEligible,
                merge: unit.mergeEligible,
            })),
        // Diorama releases actor.source after each native draw. The submitted
        // actor ID is retained for the frame; filtering null sources would hide
        // correctly rendered children rather than inspect them.
        actors: BUDMORI.renderer.actors
            .filter((actor) => actor.presentation === BUDMORI.renderer.unitPresentation)
            .map((actor) => actor.id),
    }));
    assert.ok(SPLIT.tick > INITIAL.tick, 'normal boss AI advanced before real split');
    assert.ok(SPLIT.children.length >= 2, 'actual boss damage triggered death-split children');
    assert.equal(SPLIT.count, 200 + SPLIT.children.length);
    for (const EVENT of SPLIT.events) {
        assert.ok(INITIAL.peanuts.includes(EVENT.unit));
        assert.equal(EVENT.count, 2);
        assert.equal(
            SPLIT.children.filter((unit) => unit.parent === EVENT.unit).length,
            2,
            'exactly two children per actual parent death',
        );
    }
    for (const CHILD of SPLIT.children) {
        assert.equal(CHILD.species, 4);
        assert.equal(CHILD.tier, 1);
        assert.equal(CHILD.canSplit, false);
        assert.equal(CHILD.permanent, false);
        assert.equal(CHILD.breeding, false);
        assert.equal(CHILD.merge, false);
        assert.ok(SPLIT.actors.includes(CHILD.id), 'native renderer submits actual split child');
        assert.ok(SPLIT.nativeDraw.ids.includes(CHILD.id), 'actual split child completed native draw in this frame');
        const DRAW = SPLIT.nativeDraw.children.find((child) => child.id === CHILD.id);
        assert.equal(DRAW.generation, CHILD.generation);
        assert.match(DRAW.presentationId, /^unit:/);
        assert.equal(DRAW.frame, SPLIT.nativeDraw.frame);
    }
    await assertCombatFraming(page);
    await page.screenshot({ path: path.join(OUTPUT, `${VIEWPORT}-mixed200-peanut-splits.png`) });
    REPORT.push({
        kind: 'maximum-army-real-peanut-split',
        fixture:
            '200 real units; low-HP peanuts and unstunned boss AI. No damage, death, split or model-step call injected.',
        initial: INITIAL,
        split: SPLIT,
    });
    await page.evaluate(() => {
        globalThis.__peanutSplitOff();
        globalThis.__peanutSplitDrawOff();
    });
    await resumeCapturedFrame(page);
    await activate(page.locator('#fightRetreat'), mobile);
    await page.waitForFunction(() => BUDMORI.sim.scene === 'farm' && !BUDMORI.sim.tower.active);
    assert.equal(
        await page.evaluate(() => BUDMORI.sim.units.filter((unit) => unit.isBattleOnlySummon).length),
        0,
        'real retreat removes battle-only children',
    );
}

async function captureInterruptedCombo(page, mobile) {
    await setupCombat(page, 6, mobile);
    await observeDrawnPeanut(page);
    // Subscribe to committed combat notices at normal speed. Only the ordinary pause
    // input changes; no clocks, attack state, movement, damage or model steps are replaced.
    await page.evaluate(() => {
        const WORLD = BUDMORI.sim;
        globalThis.__peanutContinuity = { actionId: null, hits: [], complete: false };
        globalThis.__peanutContinuityOff = WORLD.onNotice.on((notice) => {
            if (notice.kind !== 'boss-hit') {
                return;
            }
            const STATE = globalThis.__peanutContinuity,
                RECORD = WORLD.units[0].ability.action?.peanutAttack;
            if (!RECORD || RECORD.id !== notice.attackId || RECORD.form !== 6) {
                return;
            }
            if (STATE.actionId === null) {
                // Native-player readiness can finish after an action has started.
                // Select a complete action's actual first contact, not merely the
                // first notice delivered after this observer subscribed.
                const FIRST_HIT = WORLD.notices.find(
                    (event) => event.kind === 'boss-hit' && event.attackId === RECORD.id && event.unit === notice.unit,
                );
                if (notice.strikeIndex !== 0 || FIRST_HIT?.sequence !== notice.sequence) {
                    return;
                }
                STATE.actionId = RECORD.id;
            }
            if (notice.attackId !== STATE.actionId) {
                return;
            }
            STATE.hits.push(structuredClone(notice));
            if (STATE.hits.length === 1 || STATE.hits.length === 5) {
                BUDMORI.runtime.paused = true;
                STATE.complete = STATE.hits.length === 5;
            }
        });
    });
    await page.waitForFunction(() => globalThis.__peanutContinuity.hits.length === 1 && BUDMORI.runtime.paused);
    await settleCapturedFrame(page);
    const BEFORE = await page.evaluate(() => {
        globalThis.__peanutCheckpoint = { world: BUDMORI.sim, action: BUDMORI.sim.units[0].ability.action };
        return {
            hp: BUDMORI.sim.boss.hp,
            hits: BUDMORI.sim.notices.filter(
                (event) => event.kind === 'boss-hit' && event.attackId === globalThis.__peanutCheckpoint.action.id,
            ),
            numbers: BUDMORI.combatFeel.counts.numbers,
        };
    });
    assert.equal(BEFORE.hits.length, 1, 'checkpoint after first visible collision');
    assert.equal(BEFORE.hits[0].strikeIndex, 0, 'checkpoint begins with the complete action first slot');
    await page.evaluate(() => {
        location.hash = '#/';
    });
    await page.locator('#startScreen').waitFor({ state: 'visible' });
    await page.waitForTimeout(250);
    assert.equal(await page.evaluate(() => BUDMORI.sim.boss.hp), BEFORE.hp, 'Home pauses the combo');
    await activate(page.locator('#continueGame'), mobile);
    await page.waitForFunction(() => globalThis.__peanutContinuity.complete && BUDMORI.runtime.paused);
    await settleCapturedFrame(page);
    const AFTER = await page.evaluate(() => ({
        sameWorld: BUDMORI.sim === globalThis.__peanutCheckpoint.world,
        sameAction: BUDMORI.sim.units[0].ability.action === globalThis.__peanutCheckpoint.action,
        hits: BUDMORI.sim.notices.filter(
            (event) => event.kind === 'boss-hit' && event.attackId === globalThis.__peanutCheckpoint.action.id,
        ),
        numbers: BUDMORI.combatFeel.counts.numbers,
        nativeSamples: structuredClone(
            globalThis.__peanutMotionEnvelopes[globalThis.__peanutCheckpoint.action.id]?.samples || [],
        ),
        boundedClock: !!BUDMORI.runtime.__peanutMotionClock,
    }));
    assert.equal(AFTER.sameWorld, true);
    assert.equal(AFTER.sameAction, true);
    assert.equal(AFTER.hits.length, 5, 'Home→Continue completes exactly five collisions, not replayed first contact');
    assert.equal(new Set(AFTER.hits.map((event) => event.sequence)).size, 5);
    assert.equal(AFTER.numbers - BEFORE.numbers, 4, 'remaining four hits produce exactly four visible damage numbers');
    assert.equal(AFTER.boundedClock, false, 'Home/Continue observes the unchanged normal production clock');
    assert.ok(new Set(AFTER.nativeSamples.map((sample) => sample.elapsed)).size > 1, 'normal-speed native motion drew');
    assert.ok(
        AFTER.nativeSamples.every(
            (sample) =>
                sample.actionId === AFTER.hits[0].attackId &&
                Math.abs(sample.nativeTimeMs - sample.elapsed * 1000) < 1e-6,
        ),
        'normal-speed Home/Continue retains the same action and native phase clock',
    );
    await page.screenshot({ path: path.join(OUTPUT, `${VIEWPORT}-home-continue-combo.png`) });
    REPORT.push({ kind: 'home-continue-combo', before: BEFORE, after: AFTER });
    await page.evaluate(() => globalThis.__peanutContinuityOff());
    await resumeCapturedFrame(page);
}

async function importChestnutReleaseSave(page, mobile) {
    // Static source was encoded and validated by the released 0.34.0 implementation,
    // not generated by the new migration code under test.
    const FILE = path.join(ROOT, 'tests/fixtures/chestnut-0.34.0-peanut-legacy.json'),
        RAW = fs.readFileSync(FILE, 'utf8'),
        SOURCE = JSON.parse(RAW),
        EXPECTED_CORN = SOURCE.progress.player.abilities['corn-kernel-chain'],
        EXPECTED_PEA = SOURCE.progress.player.abilities['pea-recovery-boost'],
        EXPECTED_REDBEAN = SOURCE.progress.player.abilities['kidney-continuous-leap'],
        EXPECTED_CHESTNUT = SOURCE.progress.player.abilities['chestnut-target-thorns'],
        EXPECTED_LEGACY_PEANUT = SOURCE.progress.player.abilities['peanut-death-split'];
    assert.equal(SOURCE.productVersion, '0.34.0');
    await page.evaluate(() => {
        location.hash = '#/';
    });
    await page.locator('#startScreen').waitFor({ state: 'visible' });
    const CHOOSER_PROMISE = page.waitForEvent('filechooser');
    await activate(page.locator('#importSave'), mobile);
    await (await CHOOSER_PROMISE).setFiles(FILE);
    await page.locator('#importConfirm').waitFor({ state: 'visible' });
    await activate(page.locator('#confirmImport'), mobile);
    await page.locator('#importConfirm').waitFor({ state: 'hidden' });
    await activate(page.locator('#continueGame'), mobile);
    await openPeanut(page, mobile);
    assert.match(await page.locator('[data-growth-refund]').textContent(), /환급 완료/);
    assert.match(await page.locator('[data-growth-wallet]').textContent(), /총\s*50P.*사용\s*0P.*남음\s*50P/s);
    assert.match(await page.locator('.ability-tree__progress').textContent(), /17.3.*누적 XP/s);
    const READ_STATE = async () =>
        page.evaluate(() => ({
            peanut: BUDMORI.sim.playerProgression.abilities['peanut-death-split'],
            corn: BUDMORI.sim.playerProgression.abilities['corn-kernel-chain'],
            pea: BUDMORI.sim.playerProgression.abilities['pea-recovery-boost'],
            redbean: BUDMORI.sim.playerProgression.abilities['kidney-continuous-leap'],
            chestnut: BUDMORI.sim.playerProgression.abilities['chestnut-target-thorns'],
            source: localStorage.getItem('bloom-weapon-cards-v4:species-tree-source-v3'),
            prior: localStorage.getItem('bloom-weapon-cards-v4:species-tree-prior-source-v3'),
            imported: localStorage.getItem('bloom-weapon-cards-v4:import-source'),
        }));
    const FIRST = await READ_STATE();
    assert.deepEqual(FIRST.corn, EXPECTED_CORN, 'corn ranks, mastery, XP and archived investment remain exact');
    assert.deepEqual(FIRST.pea, EXPECTED_PEA, 'pea ranks, mastery, XP and archived investment remain exact');
    assert.deepEqual(FIRST.redbean, EXPECTED_REDBEAN, 'redbean ranks, mastery, XP and archive remain exact');
    assert.deepEqual(FIRST.chestnut, EXPECTED_CHESTNUT, 'chestnut ranks, mastery, XP and archive remain exact');
    assert.deepEqual(FIRST.peanut.legacyInvestment, EXPECTED_LEGACY_PEANUT);
    assert.deepEqual(FIRST.peanut.nodeRanks, {});
    assert.equal(FIRST.source, RAW, 'migration backup is byte-for-byte imported source');
    assert.equal(FIRST.imported, RAW);
    await page.screenshot({ path: path.join(OUTPUT, `${VIEWPORT}-import-peanut-refund.png`) });
    await activate(page.locator('[data-ability-species="1"]'), mobile);
    assert.match(await page.locator('[data-growth-node="basic-1"] .growth-rank').textContent(), /4\/10/);
    assert.match(await page.locator('[data-growth-node="specialty-2"] .growth-rank').textContent(), /3\/5/);
    await activate(page.locator('#gameMenuClose'), mobile);
    for (let reload = 1; reload <= 2; reload++) {
        await page.reload();
        await page.waitForFunction(() => globalThis.BUDMORI?.sim?.scene === 'farm');
        assert.deepEqual(
            await READ_STATE(),
            FIRST,
            `reload ${reload}: no repeated refund or migration backup rotation`,
        );
    }
    REPORT.push({
        kind: 'chestnut-release-import',
        productVersion: SOURCE.productVersion,
        peanut: FIRST.peanut,
        corn: FIRST.corn,
        pea: FIRST.pea,
        redbean: FIRST.redbean,
        chestnut: FIRST.chestnut,
        reloads: 2,
    });
}

try {
    for (const MOBILE of [VIEWPORT !== 'desktop']) {
        const CONTEXT = await BROWSER.newContext({
                viewport: VIEWPORT_SIZE,
                isMobile: MOBILE,
                hasTouch: MOBILE,
                deviceScaleFactor: 1,
            }),
            PAGE = await CONTEXT.newPage();
        activePage = PAGE;
        PAGE.setDefaultTimeout(12000);
        PAGE.on('pageerror', (error) => ERRORS.push(String(error)));
        PAGE.on('console', (message) => {
            if (message.text().includes('loop stopped')) {
                ERRORS.push(message.text());
            }
        });
        await CONTEXT.route(/cdn\.jsdelivr\.net\/gh\/byh-playground\/bloom-gamekit@[0-9a-f]+\/(.*)/, (route) => {
            const FILE = path.join(
                ROOT,
                'vendor/upstream',
                route
                    .request()
                    .url()
                    .match(/@[0-9a-f]+\/(.*)$/)[1],
            );
            return fs.existsSync(FILE)
                ? route.fulfill({
                      body: fs.readFileSync(FILE),
                      contentType: 'text/javascript',
                      headers: { 'access-control-allow-origin': '*' },
                  })
                : route.abort();
        });
        await PAGE.goto(GAME_URL);
        await PAGE.waitForFunction(() => globalThis.BUDMORI);
        await activate(PAGE.locator('#newGame'), MOBILE);
        progress('new farm ready');
        if (CASE === 'migration') {
            await importChestnutReleaseSave(PAGE, MOBILE);
            assert.deepEqual(ERRORS, []);
            progress(
                'PASS literal 0.34.0 import, peanut refund, corn/pea/redbean/chestnut preservation, two reloads and stable backup',
            );
            await CONTEXT.close();
            continue;
        }
        if (CASE === 'continuity') {
            await captureInterruptedCombo(PAGE, MOBILE);
            await captureCrowdedCombat(PAGE, MOBILE);
            await capturePeanutSplit(PAGE, MOBILE);
            assert.deepEqual(ERRORS, []);
            await CONTEXT.close();
            continue;
        }
        if (CASE === 'battle' || CASE === 'battle-extra') {
            for (const TIER of CASE === 'battle' ? [1, 3, 6] : [2, 4, 5]) {
                progress(`main battle T${TIER} start`);
                await captureMainCombat(PAGE, TIER, MOBILE);
                progress(`main battle T${TIER} real windup/kernel contacts/recovery captured`);
            }
            assert.deepEqual(ERRORS, []);
            progress('PASS main battle capture flow');
            await CONTEXT.close();
            continue;
        }
        await openPeanut(PAGE, MOBILE);
        progress('peanut tree open');
        if (CASE.startsWith('previews-')) {
            for (const TIER of CASE === 'previews-low' ? [1, 2, 3] : [4, 5, 6]) {
                progress(`isolated preview T${TIER} start`);
                await preview(PAGE, TIER, MOBILE);
                progress(`isolated preview T${TIER} captured`);
            }
            await activate(PAGE.locator('[data-ability-species="1"]'), MOBILE);
            assert.equal(
                await PAGE.locator('.peanut-evolution-preview iframe').count(),
                0,
                'tab change disposes preview',
            );
            assert.deepEqual(ERRORS, []);
            if (VIEWPORT === 'landscape') {
                await activate(PAGE.locator('[data-corn-preview-tier="3"]'), MOBILE);
                const HANDLE = await PAGE.locator('.corn-evolution-preview iframe').elementHandle(),
                    FRAME = await HANDLE.contentFrame();
                await FRAME.waitForFunction(() => globalThis.BUDMORI?.sim?.units[0]?.species === 1);
                await revealPreview(PAGE, FRAME, MOBILE);
                await PAGE.screenshot({ path: path.join(OUTPUT, 'landscape-corn-preview-access.png') });
                await activate(PAGE.locator('[data-ability-species="4"]'), MOBILE);
                assert.equal(
                    await PAGE.locator('.corn-evolution-preview iframe').count(),
                    0,
                    'corn preview still disposes on tab change',
                );
            }
            progress('PASS isolated preview flow');
            await CONTEXT.close();
            continue;
        }
        assert.equal(await PAGE.locator('[data-growth-node]').count(), 11);
        assert.match(await PAGE.locator('[data-growth-wallet]').textContent(), /총\s*1P/);
        assert.equal(await node(PAGE, 'evolution-2').getAttribute('aria-disabled'), 'true');
        assert.match(await PAGE.locator('[data-growth-node="evolution-2"]').textContent(), /숙련 Lv.2/);
        await purchase(PAGE, 'basic-1', MOBILE);
        assert.equal(await node(PAGE, 'basic-2').getAttribute('aria-disabled'), 'true');
        await activate(PAGE.locator('[data-ability-action="reset"]'), MOBILE);
        await PAGE.waitForFunction(
            () => document.querySelector('[data-growth-node="basic-1"] .growth-rank')?.textContent === '0/10',
        );
        progress('Lv1 purchase, locks and reset verified');
        // Existing earned-save scenario: no investment is pre-applied. The player chooses it below.
        await PAGE.evaluate(() => {
            const WORLD = BUDMORI.sim,
                PEANUT = WORLD.playerProgression.abilities['peanut-death-split'];
            PEANUT.masteryLevel = 50;
            PEANUT.masteryXp = 125;
            WORLD.spawn(4, 6, 1, 0);
            WORLD.markProgressChanged();
            BUDMORI.storage.save(WORLD);
        });
        await activate(PAGE.locator('[data-ability-species="6"]'), MOBILE);
        assert.equal(await PAGE.locator('[data-growth-tree]').count(), 0, 'unreleased species keeps its legacy tree');
        await activate(PAGE.locator('[data-ability-species="4"]'), MOBILE);
        assert.match(await PAGE.locator('[data-growth-wallet]').textContent(), /총\s*50P/);
        assert.match(await PAGE.locator('[data-growth-form]').textContent(), /합성 등급 T6.*연구 형태 T1/s);
        assert.equal(await node(PAGE, 'evolution-3').getAttribute('aria-disabled'), 'true');
        for (let tier = 2; tier <= 6; tier++) {
            await purchase(PAGE, `evolution-${tier}`, MOBILE);
        }
        await purchase(PAGE, 'specialty-3', MOBILE);
        assert.match(await PAGE.locator('[data-growth-wallet]').textContent(), /사용\s*12P/);
        assert.match(await PAGE.locator('[data-growth-form]').textContent(), /연구 형태 T6/);
        if (MOBILE) {
            const PANE = await treeScrollPane(PAGE);
            await PANE.evaluate((element) => {
                element.scrollTop = 0;
            });
            await settleCapturedFrame(PAGE);
            const GEOMETRY = await swipeTree(PAGE);
            REPORT.push({ kind: 'touch-scroll-geometry', viewport: VIEWPORT, ...GEOMETRY });
            const SCROLLED = await PANE.evaluate((element) => element.scrollTop);
            REPORT.at(-1).afterScrollTop = SCROLLED;
            assert.ok(SCROLLED > 0, 'actual touch scroll');
            assert.ok(
                await PAGE.locator('#abilityNodes').evaluate((element) => element.scrollWidth <= element.clientWidth),
                'no horizontal overflow in touch viewport',
            );
        }
        await PAGE.locator('[data-growth-wallet]').scrollIntoViewIfNeeded();
        await PAGE.screenshot({ path: path.join(OUTPUT, `${VIEWPORT}-tree.png`) });
        progress('Lv50 evolution/specialty purchases and scrolling verified');
        await activate(PAGE.locator('[data-ability-species="1"]'), MOBILE);
        assert.equal(await PAGE.locator('.peanut-evolution-preview iframe').count(), 0, 'tab change disposes preview');
        await activate(PAGE.locator('[data-ability-species="4"]'), MOBILE);
        await activate(PAGE.locator('#gameMenuClose'), MOBILE);
        await PAGE.reload();
        await PAGE.waitForFunction(() => globalThis.BUDMORI?.sim?.scene === 'farm');
        if (await PAGE.locator('#abilityPanel').isHidden()) {
            await openPeanut(PAGE, MOBILE);
        } else {
            await activate(PAGE.locator('[data-ability-species="4"]'), MOBILE);
        }
        assert.match(await PAGE.locator('[data-growth-wallet]').textContent(), /사용\s*12P/);
        assert.match(await PAGE.locator('.ability-tree__progress').textContent(), /125.*누적 XP/s);
        await activate(PAGE.locator('[data-ability-action="reset"]'), MOBILE);
        await PAGE.waitForFunction(() =>
            document.querySelector('[data-growth-wallet]')?.textContent.includes('사용 0P'),
        );
        assert.match(await PAGE.locator('.ability-tree__progress').textContent(), /125.*누적 XP/s);
        progress('save/reload and free reset preserve mastery');
        await purchase(PAGE, 'basic-2', MOBILE);
        await activate(PAGE.locator('#gameMenuClose'), MOBILE);
        await activate(PAGE.locator('#bossChallenge'), MOBILE);
        if (await PAGE.locator('#deckDialog').isVisible()) {
            await activate(PAGE.locator('#deckGo'), MOBILE);
        }
        await PAGE.waitForFunction(() => BUDMORI.sim.tower.active);
        for (const PHASE of ['marching', 'fighting']) {
            progress(`waiting for ${PHASE}`);
            await PAGE.waitForFunction((phase) => BUDMORI.sim.farmBossEvent.phase === phase, PHASE);
            progress(`${PHASE} Home→Continue start`);
            await PAGE.evaluate(() => {
                globalThis.__peanutRunBeforeHome = {
                    world: BUDMORI.sim,
                    snapshot: JSON.stringify(BUDMORI.sim.runProgressionSnapshot),
                    phase: BUDMORI.sim.farmBossEvent.phase,
                };
                location.hash = '#/';
            });
            await PAGE.locator('#startScreen').waitFor({ state: 'visible' });
            await activate(PAGE.locator('#continueGame'), MOBILE);
            assert.equal(
                await PAGE.evaluate(() => BUDMORI.sim === globalThis.__peanutRunBeforeHome.world),
                true,
                `${PHASE} Home→Continue keeps the live memory run`,
            );
            assert.equal(
                await PAGE.evaluate(
                    () =>
                        JSON.stringify(BUDMORI.sim.runProgressionSnapshot) ===
                        globalThis.__peanutRunBeforeHome.snapshot,
                ),
                true,
                'Home→Continue keeps the initial investment snapshot',
            );
            assert.equal(await PAGE.evaluate(() => BUDMORI.sim.tower.active), true);
        }
        await openPeanut(PAGE, MOBILE);
        assert.equal(
            await node(PAGE, 'basic-2').getAttribute('aria-disabled'),
            'true',
            'investment locked in a live run',
        );
        assert.equal(await PAGE.locator('[data-ability-action="reset"]').getAttribute('aria-disabled'), 'true');
        await PAGE.reload();
        await PAGE.waitForFunction(() => globalThis.BUDMORI?.sim?.scene === 'farm');
        assert.equal(
            await PAGE.evaluate(() => BUDMORI.sim.tower.active),
            false,
            'disk reload returns to farm, not a new run-resume feature',
        );
        progress('Home/Continue, live-run locks and disk farm return verified');
        assert.deepEqual(ERRORS, []);
        console.log(
            `PASS peanut growth ${MOBILE ? 'mobile touch 390px' : 'desktop'}: locked Lv1, purchases, research, scroll, reset, save/reload, live-run lock`,
        );
        await CONTEXT.close();
    }
} catch (error) {
    if (activePage && !activePage.isClosed()) {
        try {
            await activePage.screenshot({ path: path.join(OUTPUT, `failure-${CASE}-${VIEWPORT}.png`) });
            const FRAMES = [];
            for (const FRAME of activePage.frames()) {
                FRAMES.push(
                    await FRAME.evaluate(() => {
                        const UNIT = globalThis.BUDMORI?.sim?.units[0],
                            DISPLAY = globalThis.BUDMORI?.runtime?.presentationView?.units[0],
                            RECT = (selector) => {
                                const ELEMENT = document.querySelector(selector);
                                if (!ELEMENT) {
                                    return null;
                                }
                                const BOX = ELEMENT.getBoundingClientRect();
                                return {
                                    x: BOX.x,
                                    y: BOX.y,
                                    width: BOX.width,
                                    height: BOX.height,
                                    scrollTop: ELEMENT.scrollTop,
                                    scrollHeight: ELEMENT.scrollHeight,
                                    overflowY: getComputedStyle(ELEMENT).overflowY,
                                };
                            };
                        return {
                            url: location.href,
                            help: globalThis.__budmoriHelp?.snapshot() || null,
                            captureRequest: globalThis.__peanutCaptureRequest || null,
                            captured: globalThis.__peanutCaptured || null,
                            missedAction: globalThis.__peanutCaptureMiss || null,
                            observationClock: globalThis.BUDMORI?.runtime?.__peanutMotionClock
                                ? {
                                      active: BUDMORI.runtime.__peanutMotionClock.active,
                                      frames: BUDMORI.runtime.__peanutMotionClock.frames,
                                      maxInputDeltaMs: BUDMORI.runtime.__peanutMotionClock.maxInputDeltaMs,
                                      maxForwardedDeltaMs: BUDMORI.runtime.__peanutMotionClock.maxForwardedDeltaMs,
                                  }
                                : null,
                            drawn: globalThis.__peanutDraw || null,
                            unit: UNIT
                                ? {
                                      id: UNIT.id,
                                      phase: UNIT.ability.phase,
                                      peanut: UNIT.ability.action?.peanutAttack,
                                  }
                                : null,
                            display: DISPLAY ? { id: DISPLAY.id, ability: { ...DISPLAY.ability } } : null,
                            pane: RECT('#abilityPanel'),
                            nodes: RECT('#abilityNodes'),
                            iframe: RECT('.growth-evolution-preview iframe'),
                            canvas: RECT('#world'),
                        };
                    }),
                );
            }
            REPORT.push({ kind: 'failure-diagnostics', message: String(error), frames: FRAMES });
        } catch (diagnosticError) {
            REPORT.push({
                kind: 'failure-diagnostics-error',
                message: String(diagnosticError),
                original: String(error),
            });
        }
    }
    throw error;
} finally {
    fs.writeFileSync(
        path.join(OUTPUT, `report-${CASE}-${VIEWPORT}.json`),
        JSON.stringify(
            {
                browserVersion: BROWSER.version(),
                browserOverride: !!process.env.CHROME_PATH,
                case: CASE,
                viewport: VIEWPORT,
                viewportSize: VIEWPORT_SIZE,
                elapsedMs: Date.now() - STARTED,
                errors: ERRORS,
                captures: REPORT,
            },
            null,
            2,
        ),
    );
    await BROWSER.close();
    SERVER.close();
}
