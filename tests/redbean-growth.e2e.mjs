// Returning player's fixed flow: inspect, invest, preview, reset, enter a run, and reload the farm.
// Fixtures supply an earned Lv50 save, not attack outcomes. All purchases use actual UI commands.
// Chromium SwiftShader plus pinned GameKit modules; touch emulation is not a physical-device claim.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { unitBodyDefinition } from '../src/features/unit-body/definition.cjs';

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
    console.log(`[redbean ${CASE}/${VIEWPORT} +${((Date.now() - STARTED) / 1000).toFixed(1)}s] ${step}`);
}

const ROOT = fileURLToPath(new URL('../', import.meta.url)),
    OUTPUT = path.join(ROOT, 'tests/output/redbean-growth'),
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
        args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
    });

async function activate(locator, mobile) {
    await locator.scrollIntoViewIfNeeded();
    if (mobile) {
        await locator.tap();
    } else {
        await locator.click();
    }
}
async function openRedbean(page, mobile) {
    await activate(page.locator('#upgradeMenu'), mobile);
    await activate(page.locator('#menuTabAbilities'), mobile);
    await activate(page.locator('[data-ability-species="2"]'), mobile);
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

// SwiftShader can render slower than a short landing recovery lasts. Observe the real
// main-world action at most half a 20Hz tick per frame; never inject steps,
// poses or contacts. Other user flows and benchmarks keep their normal clock.
async function limitMainMotionObservationClock(page) {
    await page.evaluate(() => {
        const SESSION = BUDMORI.runtime;
        if (!SESSION.__redbeanMotionClock) {
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
            SESSION.__redbeanMotionClock = CLOCK;
            SESSION.pulse = function (now) {
                return PULSE.call(this, CLOCK.advance(now));
            };
            SESSION.loop.resetTiming();
        }
        SESSION.__redbeanMotionClock.active = true;
    });
}

async function observeDrawnRedbean(page) {
    await page.waitForFunction((body) => {
        const UNIT = globalThis.BUDMORI?.sim?.units[0],
            PLAYER = UNIT && BUDMORI.renderer.vectorPlayers.get(UNIT.id);
        if (!PLAYER) {
            return false;
        }
        if (!BUDMORI.runtime.__redbeanClockObserver) {
            const SESSION = BUDMORI.runtime,
                PRESENT = SESSION.presentation;
            SESSION.presentation = function (now) {
                const CLOCK = this.__redbeanMotionClock?.advance(now) ?? now;
                globalThis.__redbeanInputClock = CLOCK;
                return PRESENT.call(this, CLOCK);
            };
            SESSION.__redbeanClockObserver = true;
        }
        if (!PLAYER.__redbeanCaptureWrapped) {
            const DRAW = PLAYER.draw,
                WRAPPER = Object.create(PLAYER);
            const CAPTURE_DRAW = function (options) {
                const DISPLAY = BUDMORI.runtime.presentationView?.units.find((unit) => unit.id === UNIT.id),
                    MATRIX = options.matrix,
                    [LEFT, TOP, WIDTH, HEIGHT] = BUDMORI.renderer.vectorAssets.get(2).compiled.viewBox,
                    CORNERS = [
                        [LEFT, TOP],
                        [LEFT + WIDTH, TOP],
                        [LEFT, TOP + HEIGHT],
                        [LEFT + WIDTH, TOP + HEIGHT],
                    ],
                    XS = CORNERS.map(
                        ([x, y]) => (MATRIX[0] * x + MATRIX[2] * y + MATRIX[4]) / BUDMORI.renderer.pixelRatio,
                    ),
                    YS = CORNERS.map(
                        ([x, y]) => (MATRIX[1] * x + MATRIX[3] * y + MATRIX[5]) / BUDMORI.renderer.pixelRatio,
                    );
                const TORSO = [
                        [body.left, body.top],
                        [body.right, body.top],
                        [body.left, body.bottom],
                        [body.right, body.bottom],
                    ],
                    TX = TORSO.map(
                        ([x, y]) => (MATRIX[0] * x + MATRIX[2] * y + MATRIX[4]) / BUDMORI.renderer.pixelRatio,
                    ),
                    TY = TORSO.map(
                        ([x, y]) => (MATRIX[1] * x + MATRIX[3] * y + MATRIX[5]) / BUDMORI.renderer.pixelRatio,
                    );
                globalThis.__redbeanDraw = DISPLAY
                    ? {
                          matrix: [...options.matrix],
                          torso: {
                              width: Math.max(...TX) - Math.min(...TX),
                              height: Math.max(...TY) - Math.min(...TY),
                          },
                          bounds: {
                              left: Math.min(...XS),
                              right: Math.max(...XS),
                              top: Math.min(...YS),
                              bottom: Math.max(...YS),
                          },
                          viewport: { width: innerWidth, height: innerHeight },
                          phase: DISPLAY.ability.phase,
                          elapsed: DISPLAY.ability.elapsed,
                          form: DISPLAY.ability.redbeanForm,
                          stage: DISPLAY.ability.redbeanStage,
                          progress: DISPLAY.ability.redbeanStageProgress,
                          leg: DISPLAY.ability.redbeanLeg,
                          x: DISPLAY.x,
                          y: DISPLAY.y,
                          z: DISPLAY.z,
                          at: BUDMORI.renderer.displayTimeMs,
                      }
                    : null;
                const RESULT = DRAW.call(PLAYER, options),
                    REQUEST = globalThis.__redbeanCaptureRequest,
                    DRAWN = globalThis.__redbeanDraw,
                    ACTION = UNIT.ability.action?.redbeanAttack;
                if (
                    REQUEST?.actionId != null &&
                    ACTION &&
                    REQUEST.actionId !== ACTION.id &&
                    !globalThis.__redbeanCaptureMiss
                ) {
                    globalThis.__redbeanCaptureMiss = {
                        requestedActionId: REQUEST.actionId,
                        observedActionId: ACTION.id,
                        tick: BUDMORI.sim.simulationTick,
                        request: { ...REQUEST },
                        drawn: structuredClone(DRAWN),
                    };
                }
                if (
                    REQUEST &&
                    !globalThis.__redbeanCaptured &&
                    ACTION?.form === REQUEST.tier &&
                    DRAWN?.form === REQUEST.tier &&
                    DRAWN.phase === REQUEST.phase &&
                    (REQUEST.actionId === null || REQUEST.actionId === ACTION.id) &&
                    (REQUEST.phase !== 'windup' || DRAWN.elapsed >= ACTION.windupSeconds * 0.65) &&
                    (!REQUEST.stage ||
                        (DRAWN.stage === REQUEST.stage &&
                            ACTION.launchTick !== null &&
                            (REQUEST.leg === undefined || DRAWN.leg === REQUEST.leg) &&
                            DRAWN.progress >= 0.3 &&
                            DRAWN.progress <= 0.8))
                ) {
                    const SESSION = BUDMORI.runtime;
                    SESSION.paused = true;
                    // Help uses a scaled frame clock, unlike the main battle. Freeze in
                    // that same clock domain; never change simulation phase or pose.
                    SESSION.pauseStartedAt = globalThis.__redbeanInputClock;
                    globalThis.__redbeanCaptured = {
                        actionId: ACTION.id,
                        tick: BUDMORI.sim.simulationTick,
                        drawn: structuredClone(DRAWN),
                    };
                }
                return RESULT;
            };
            // Native players are frozen. A renderer-owned forwarding adapter observes
            // the real submitted matrix without mutating that player or its animation.
            Object.defineProperty(WRAPPER, 'draw', { value: CAPTURE_DRAW });
            WRAPPER.__redbeanCaptureWrapped = true;
            BUDMORI.renderer.vectorPlayerAssets.set(WRAPPER, BUDMORI.renderer.vectorPlayerAssets.get(PLAYER));
            BUDMORI.renderer.vectorPlayers.set(UNIT.id, WRAPPER);
            if (BUDMORI.renderer.vectorPlayers.get(UNIT.id).draw !== CAPTURE_DRAW) {
                throw new Error('Draw observer was not installed');
            }
        }
        return true;
    }, unitBodyDefinition(2).bounds);
}

async function captureMotion(page, tier, label) {
    await observeDrawnRedbean(page);
    if (label === 'main') {
        await limitMainMotionObservationClock(page);
    }
    const TRACE = [];
    const LEG_COUNT = tier <= 2 ? 1 : tier === 6 ? 3 : 2;
    const STAGES = [
        { phase: 'windup', stage: null },
        ...Array.from({ length: LEG_COUNT }, (_, leg) => ({ phase: 'active', stage: 'flight', leg })),
        { phase: 'recover', stage: null },
    ];
    let actionId = null;
    await page.evaluate(
        (request) => {
            globalThis.__redbeanCaptured = null;
            globalThis.__redbeanCaptureMiss = null;
            globalThis.__redbeanCaptureRequest = request;
        },
        { tier, ...STAGES[0], actionId },
    );
    for (let index = 0; index < STAGES.length; index++) {
        const { phase: PHASE, stage: STAGE, leg: LEG } = STAGES[index];
        await page.waitForFunction(() => !!globalThis.__redbeanCaptured, null, { timeout: 18000, polling: 'raf' });
        await settleCapturedFrame(page);
        const STATE = await page.evaluate(() => {
            const WORLD = BUDMORI.sim,
                UNIT = WORLD.units[0],
                REDBEAN = UNIT.ability.action.redbeanAttack;
            return {
                tick: WORLD.simulationTick,
                phase: UNIT.ability.phase,
                elapsed: UNIT.ability.elapsed,
                redbean: structuredClone(REDBEAN),
                drawn: structuredClone(globalThis.__redbeanDraw),
                x: UNIT.x,
                y: UNIT.y,
                z: UNIT.z,
                bossHp: WORLD.boss.hp,
                unitCount: WORLD.units.length,
                projectileCount: WORLD.projectiles.length,
                distance: Math.hypot(UNIT.x - WORLD.boss.x, UNIT.y - WORLD.boss.y),
                bossRadius: WORLD.boss.radius,
            };
        });
        assert.equal(STATE.drawn.phase, PHASE, 'frozen render retains the captured phase');
        if (STAGE) {
            assert.equal(STATE.drawn.stage, STAGE, 'frozen render retains the captured stage');
        }
        if (STAGE === 'flight') {
            assert.equal(STATE.drawn.leg, LEG, 'captured the requested real flight leg');
            assert.ok(STATE.drawn.z > 0.1 && STATE.z > 0.1, 'real body collision height and drawn height are airborne');
        } else if (PHASE === 'recover') {
            assert.equal(STATE.z, 0, 'final landing is authoritative ground');
        }
        assert.equal(STATE.unitCount, 1, 'one body, no clones');
        assert.equal(STATE.projectileCount, 0, 'no projectiles');
        assert.ok(STATE.distance >= STATE.bossRadius - 0.05, 'body stays outside boss center');
        assert.ok(
            STATE.drawn.bounds.left >= 0 &&
                STATE.drawn.bounds.right <= STATE.drawn.viewport.width &&
                STATE.drawn.bounds.top >= 0 &&
                STATE.drawn.bounds.bottom <= STATE.drawn.viewport.height,
            'complete drawn redbean bounds are inside the actual canvas',
        );
        if (label === 'preview') {
            assert.ok(
                STATE.drawn.torso.width >= 32 && STATE.drawn.torso.height >= 32,
                'authored preview torso is at least 32px wide and tall, including compressed poses',
            );
        }
        TRACE.push(STATE);
        await page.screenshot({
            path: path.join(OUTPUT, `${VIEWPORT}-${label}-t${tier}-${STAGE ? `${STAGE}-${LEG}` : PHASE}.png`),
        });
        assert.equal(await page.evaluate(() => BUDMORI.sim.simulationTick), STATE.tick, 'PNG matches paused trace');
        actionId ??= STATE.redbean.id;
        await page.evaluate(
            (request) => {
                const SESSION = BUDMORI.runtime,
                    DURATION = SESSION.pausedDurationMs + globalThis.__redbeanInputClock - SESSION.pauseStartedAt;
                globalThis.__redbeanCaptureRequest = request;
                globalThis.__redbeanCaptured = null;
                SESSION.loop.resetTiming();
                SESSION.paused = false;
                SESSION.pausedDurationMs = DURATION;
            },
            index + 1 < STAGES.length ? { tier, ...STAGES[index + 1], actionId } : null,
        );
    }
    assert.ok(TRACE.at(-1).bossHp < TRACE[0].bossHp, 'real contact damages the training boss');
    assert.ok(TRACE.at(-1).tick > TRACE[0].tick, 'animation advances');
    assert.equal(new Set(TRACE.map((state) => state.redbean.id)).size, 1, 'sequential poses belong to one real attack');
    if ([2, 5, 6].includes(tier)) {
        assert.ok(
            TRACE.some((state) => state.drawn.phase === 'active' && Math.abs(state.drawn.matrix[1]) > 0.01),
            'actual flip/spin draw rotates the one body',
        );
    }
    if (tier >= 3) {
        assert.ok(
            TRACE.filter((state) => state.drawn.phase === 'active').length === LEG_COUNT,
            'every real rebound flight is observed in one action',
        );
    }
    const OBSERVATION_CLOCK = await page.evaluate(() => {
        const CLOCK = BUDMORI.runtime.__redbeanMotionClock;
        if (!CLOCK) {
            return { mode: 'production-help-clock' };
        }
        // Retain the clock origin, but stop limiting deltas after this capture.
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
    REPORT.push({ kind: label, tier, trace: TRACE, observationClock: OBSERVATION_CLOCK });
}

async function preview(page, tier, mobile) {
    const CONTROL = await page.locator(`[data-redbean-preview-tier="${tier}"]`).boundingBox();
    assert.ok(CONTROL && CONTROL.width >= 44 && CONTROL.height >= 44, 'preview control is at least44px');
    const BEFORE = await page.evaluate(() => JSON.stringify(BUDMORI.sim.playerProgression));
    await activate(page.locator(`[data-redbean-preview-tier="${tier}"]`), mobile);
    const HANDLE = await page.locator('.redbean-evolution-preview iframe').elementHandle(),
        FRAME = await HANDLE.contentFrame();
    await FRAME.waitForFunction(() => globalThis.BUDMORI?.sim?.units[0]?.species === 2);
    await revealPreview(page, FRAME, mobile);
    // Start a fresh real scenario after scrolling, which can consume its nine-second budget.
    await FRAME.goto(FRAME.url());
    await FRAME.waitForFunction(() => globalThis.BUDMORI?.sim?.units[0]?.species === 2);
    // Frame has no screenshot method: capture its owner page while retaining frame-local timing.
    FRAME.screenshot = async (options) => {
        const CANVAS = await FRAME.locator('#world').boundingBox(),
            PANE = await (await treeScrollPane(page)).boundingBox(),
            DRAWN = await FRAME.evaluate(() => globalThis.__redbeanDraw),
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
            HELP_SCENE_BY_ID(`redbean-t${selectedTier}`).setup(WORLD);
            if (!fullResearch) {
                WORLD.playerProgression.abilities['kidney-continuous-leap'].nodeRanks = {};
                WORLD.runProgressionSnapshot.abilities['kidney-continuous-leap'].nodeRanks = {};
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
                const BOX = document.getElementById(id).getBoundingClientRect();
                return { id, x: BOX.x, y: BOX.y, right: BOX.right, bottom: BOX.bottom };
            });
        return { x: POINT.x / RATIO, y: POINT.y / RATIO, width: innerWidth, height: innerHeight, hud: HUD };
    });
    assert.ok(
        FRAME.x > 0 && FRAME.x < FRAME.width && FRAME.y > 0 && FRAME.y < FRAME.height,
        'attacking body stays in viewport',
    );
    for (const BOX of FRAME.hud) {
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
            OTHERS = [0, 1, 3, 4, 5, 6, 7, 8];
        for (let index = 1; index < BUDMORI.CONFIG.farm.capacity.max; index++) {
            const SPECIES = index < 60 ? 2 : OTHERS[(index - 60) % OTHERS.length],
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

async function captureInterruptedCombo(page, mobile) {
    await setupCombat(page, 6, mobile);
    await page.waitForFunction(
        () => {
            const UNIT = BUDMORI.sim.units[0];
            if (UNIT.ability.phase !== 'active' || UNIT.ability.action?.redbeanAttack?.attack?.nextSlot !== 1) {
                return false;
            }
            BUDMORI.runtime.paused = true;
            return true;
        },
        null,
        { polling: 'raf' },
    );
    await settleCapturedFrame(page);
    const BEFORE = await page.evaluate(() => {
        globalThis.__redbeanCheckpoint = { world: BUDMORI.sim, action: BUDMORI.sim.units[0].ability.action };
        return {
            hp: BUDMORI.sim.boss.hp,
            hits: BUDMORI.sim.notices.filter(
                (event) => event.kind === 'boss-hit' && event.attackId === globalThis.__redbeanCheckpoint.action.id,
            ),
            numbers: BUDMORI.combatFeel.counts.numbers,
        };
    });
    assert.equal(BEFORE.hits.length, 1, 'checkpoint after first visible collision');
    await page.evaluate(() => {
        location.hash = '#/';
    });
    await page.locator('#startScreen').waitFor({ state: 'visible' });
    await page.waitForTimeout(250);
    assert.equal(await page.evaluate(() => BUDMORI.sim.boss.hp), BEFORE.hp, 'Home pauses the combo');
    await activate(page.locator('#continueGame'), mobile);
    await page.waitForFunction(
        () => {
            if (BUDMORI.sim.units[0].ability.phase !== 'recover' || BUDMORI.sim.units[0].ability.elapsed < 0.05) {
                return false;
            }
            BUDMORI.runtime.paused = true;
            return true;
        },
        null,
        { polling: 'raf' },
    );
    await settleCapturedFrame(page);
    const AFTER = await page.evaluate(() => ({
        sameWorld: BUDMORI.sim === globalThis.__redbeanCheckpoint.world,
        sameAction: BUDMORI.sim.units[0].ability.action === globalThis.__redbeanCheckpoint.action,
        hits: BUDMORI.sim.notices.filter(
            (event) => event.kind === 'boss-hit' && event.attackId === globalThis.__redbeanCheckpoint.action.id,
        ),
        numbers: BUDMORI.combatFeel.counts.numbers,
    }));
    assert.equal(AFTER.sameWorld, true);
    assert.equal(AFTER.sameAction, true);
    assert.equal(AFTER.hits.length, 3, 'Home→Continue completes exactly three collisions, not replayed first contact');
    assert.equal(new Set(AFTER.hits.map((event) => event.sequence)).size, 3);
    assert.equal(AFTER.numbers - BEFORE.numbers, 2, 'remaining two hits produce exactly two visible damage numbers');
    await page.screenshot({ path: path.join(OUTPUT, `${VIEWPORT}-home-continue-combo.png`) });
    REPORT.push({ kind: 'home-continue-combo', before: BEFORE, after: AFTER });
    await resumeCapturedFrame(page);
}

async function importPeaReleaseSave(page, mobile) {
    // Static source was encoded and validated by the released 0.32.0 implementation,
    // not generated by the new migration code under test.
    const FILE = path.join(ROOT, 'tests/fixtures/pea-0.32.0-redbean-legacy.json'),
        RAW = fs.readFileSync(FILE, 'utf8'),
        SOURCE = JSON.parse(RAW),
        EXPECTED_CORN = SOURCE.progress.player.abilities['corn-kernel-chain'],
        EXPECTED_PEA = SOURCE.progress.player.abilities['pea-recovery-boost'],
        EXPECTED_LEGACY_REDBEAN = SOURCE.progress.player.abilities['kidney-continuous-leap'];
    assert.equal(SOURCE.productVersion, '0.32.0');
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
    await openRedbean(page, mobile);
    assert.match(await page.locator('[data-growth-refund]').textContent(), /환급 완료/);
    assert.match(await page.locator('[data-growth-wallet]').textContent(), /총\s*50P.*사용\s*0P.*남음\s*50P/s);
    assert.match(await page.locator('.ability-tree__progress').textContent(), /17.3.*누적 XP/s);
    const READ_STATE = async () =>
        page.evaluate(() => ({
            redbean: BUDMORI.sim.playerProgression.abilities['kidney-continuous-leap'],
            corn: BUDMORI.sim.playerProgression.abilities['corn-kernel-chain'],
            pea: BUDMORI.sim.playerProgression.abilities['pea-recovery-boost'],
            source: localStorage.getItem('bloom-weapon-cards-v4:species-tree-source-v3'),
            prior: localStorage.getItem('bloom-weapon-cards-v4:species-tree-prior-source-v3'),
            imported: localStorage.getItem('bloom-weapon-cards-v4:import-source'),
        }));
    const FIRST = await READ_STATE();
    assert.deepEqual(FIRST.corn, EXPECTED_CORN, 'corn ranks, mastery, XP and archived investment remain exact');
    assert.deepEqual(FIRST.pea, EXPECTED_PEA, 'pea ranks, mastery, XP and archived investment remain exact');
    assert.deepEqual(FIRST.redbean.legacyInvestment, EXPECTED_LEGACY_REDBEAN);
    assert.deepEqual(FIRST.redbean.nodeRanks, {});
    assert.equal(FIRST.source, RAW, 'migration backup is byte-for-byte imported source');
    assert.equal(FIRST.imported, RAW);
    await page.screenshot({ path: path.join(OUTPUT, `${VIEWPORT}-import-redbean-refund.png`) });
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
            `reload ${reload}: no reredbeant refund or migration backup rotation`,
        );
    }
    REPORT.push({
        kind: 'pea-release-import',
        productVersion: SOURCE.productVersion,
        redbean: FIRST.redbean,
        corn: FIRST.corn,
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
            await importPeaReleaseSave(PAGE, MOBILE);
            assert.deepEqual(ERRORS, []);
            progress(
                'PASS literal 0.32.0 import, redbean refund, corn/pea preservation, two reloads and stable backup',
            );
            await CONTEXT.close();
            continue;
        }
        if (CASE === 'continuity') {
            await captureInterruptedCombo(PAGE, MOBILE);
            await captureCrowdedCombat(PAGE, MOBILE);
            assert.deepEqual(ERRORS, []);
            await CONTEXT.close();
            continue;
        }
        if (CASE === 'battle' || CASE === 'battle-extra') {
            for (const TIER of CASE === 'battle' ? [1, 3, 6] : [2, 4, 5]) {
                progress(`main battle T${TIER} start`);
                await captureMainCombat(PAGE, TIER, MOBILE);
                progress(`main battle T${TIER} real windup/flight/landing captured`);
            }
            assert.deepEqual(ERRORS, []);
            progress('PASS main battle capture flow');
            await CONTEXT.close();
            continue;
        }
        await openRedbean(PAGE, MOBILE);
        progress('redbean tree open');
        if (CASE.startsWith('previews-')) {
            for (const TIER of CASE === 'previews-low' ? [1, 2, 3] : [4, 5, 6]) {
                progress(`isolated preview T${TIER} start`);
                await preview(PAGE, TIER, MOBILE);
                progress(`isolated preview T${TIER} captured`);
            }
            await activate(PAGE.locator('[data-ability-species="1"]'), MOBILE);
            assert.equal(
                await PAGE.locator('.redbean-evolution-preview iframe').count(),
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
                await activate(PAGE.locator('[data-ability-species="2"]'), MOBILE);
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
                REDBEAN = WORLD.playerProgression.abilities['kidney-continuous-leap'];
            REDBEAN.masteryLevel = 50;
            REDBEAN.masteryXp = 125;
            WORLD.spawn(2, 6, 1, 0);
            WORLD.markProgressChanged();
            BUDMORI.storage.save(WORLD);
        });
        await activate(PAGE.locator('[data-ability-species="5"]'), MOBILE);
        assert.equal(await PAGE.locator('[data-growth-tree]').count(), 0, 'unreleased species keeps its legacy tree');
        await activate(PAGE.locator('[data-ability-species="2"]'), MOBILE);
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
        assert.equal(await PAGE.locator('.redbean-evolution-preview iframe').count(), 0, 'tab change disposes preview');
        await activate(PAGE.locator('[data-ability-species="2"]'), MOBILE);
        await activate(PAGE.locator('#gameMenuClose'), MOBILE);
        await PAGE.reload();
        await PAGE.waitForFunction(() => globalThis.BUDMORI?.sim?.scene === 'farm');
        if (await PAGE.locator('#abilityPanel').isHidden()) {
            await openRedbean(PAGE, MOBILE);
        } else {
            await activate(PAGE.locator('[data-ability-species="2"]'), MOBILE);
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
                globalThis.__redbeanRunBeforeHome = {
                    world: BUDMORI.sim,
                    snapshot: JSON.stringify(BUDMORI.sim.runProgressionSnapshot),
                    phase: BUDMORI.sim.farmBossEvent.phase,
                };
                location.hash = '#/';
            });
            await PAGE.locator('#startScreen').waitFor({ state: 'visible' });
            await activate(PAGE.locator('#continueGame'), MOBILE);
            assert.equal(
                await PAGE.evaluate(() => BUDMORI.sim === globalThis.__redbeanRunBeforeHome.world),
                true,
                `${PHASE} Home→Continue keeps the live memory run`,
            );
            assert.equal(
                await PAGE.evaluate(
                    () =>
                        JSON.stringify(BUDMORI.sim.runProgressionSnapshot) ===
                        globalThis.__redbeanRunBeforeHome.snapshot,
                ),
                true,
                'Home→Continue keeps the initial investment snapshot',
            );
            assert.equal(await PAGE.evaluate(() => BUDMORI.sim.tower.active), true);
        }
        await openRedbean(PAGE, MOBILE);
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
            `PASS redbean growth ${MOBILE ? 'mobile touch 390px' : 'desktop'}: locked Lv1, purchases, research, scroll, reset, save/reload, live-run lock`,
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
                            captureRequest: globalThis.__redbeanCaptureRequest || null,
                            captured: globalThis.__redbeanCaptured || null,
                            missedAction: globalThis.__redbeanCaptureMiss || null,
                            observationClock: globalThis.BUDMORI?.runtime?.__redbeanMotionClock
                                ? {
                                      active: BUDMORI.runtime.__redbeanMotionClock.active,
                                      frames: BUDMORI.runtime.__redbeanMotionClock.frames,
                                      maxInputDeltaMs: BUDMORI.runtime.__redbeanMotionClock.maxInputDeltaMs,
                                      maxForwardedDeltaMs: BUDMORI.runtime.__redbeanMotionClock.maxForwardedDeltaMs,
                                  }
                                : null,
                            drawn: globalThis.__redbeanDraw || null,
                            unit: UNIT
                                ? {
                                      id: UNIT.id,
                                      phase: UNIT.ability.phase,
                                      redbean: UNIT.ability.action?.redbeanAttack,
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
