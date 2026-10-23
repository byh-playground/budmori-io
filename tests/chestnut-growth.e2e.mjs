// Returning player's fixed flow: inspect, invest, preview, reset, enter a run, and reload the farm.
// Fixtures supply an earned Lv50 save, not attack outcomes. All purchases use actual UI commands.
// Chromium SwiftShader plus pinned GameKit modules; touch emulation is not a physical-device claim.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { buildSync } from 'esbuild';
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
    console.log(`[chestnut ${CASE}/${VIEWPORT} +${((Date.now() - STARTED) / 1000).toFixed(1)}s] ${step}`);
}

const ROOT = fileURLToPath(new URL('../', import.meta.url)),
    OUTPUT = path.join(ROOT, 'tests/output/chestnut-growth'),
    TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' },
    REPORT = [],
    ERRORS = [],
    // The production sampler imports CommonJS-backed model dependencies. Serve
    // that exact source through the same bundler used by the product, rather
    // than asking Chromium to evaluate raw .cjs or copying its geometry here.
    GEOMETRY_MODULE = buildSync({
        entryPoints: [path.join(ROOT, 'src/features/projectiles/spike/presentation.js')],
        bundle: true,
        format: 'esm',
        platform: 'browser',
        write: false,
        logLevel: 'silent',
    }).outputFiles[0].contents;
let activePage = null;
fs.mkdirSync(OUTPUT, { recursive: true });
const SERVER = http.createServer((request, response) => {
    if (request.url.split('?')[0] === '/__test__/chestnut-presentation.js') {
        response.setHeader('content-type', 'text/javascript');
        response.end(GEOMETRY_MODULE);
        return;
    }
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
async function openChestnut(page, mobile) {
    await activate(page.locator('#upgradeMenu'), mobile);
    await activate(page.locator('#menuTabAbilities'), mobile);
    await activate(page.locator('[data-ability-species="3"]'), mobile);
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
        if (!SESSION.__chestnutMotionClock) {
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
            SESSION.__chestnutMotionClock = CLOCK;
            SESSION.pulse = function (now) {
                return PULSE.call(this, CLOCK.advance(now));
            };
            SESSION.loop.resetTiming();
        }
        SESSION.__chestnutMotionClock.active = true;
    });
}

async function observeDrawnChestnut(page) {
    await page.waitForFunction((body) => {
        const UNIT = globalThis.BUDMORI?.sim?.units[0],
            RENDERER = globalThis.BUDMORI?.renderer,
            PLAYER = UNIT && RENDERER.vectorPlayers.get(UNIT.id);
        if (!PLAYER) {
            return false;
        }
        if (!BUDMORI.runtime.__chestnutClockObserver) {
            const SESSION = BUDMORI.runtime,
                PRESENT = SESSION.presentation;
            SESSION.presentation = function (now) {
                const CLOCK = this.__chestnutMotionClock?.advance(now) ?? now;
                globalThis.__chestnutInputClock = CLOCK;
                return PRESENT.call(this, CLOCK);
            };
            SESSION.__chestnutClockObserver = true;
        }
        const CHECK_CAPTURE = (projectile = null) => {
            const REQUEST = globalThis.__chestnutCaptureRequest,
                ACTION = UNIT.ability.action?.chestnutAttack;
            if (!REQUEST || globalThis.__chestnutCaptured || !ACTION) {
                return;
            }
            if (REQUEST.actionId !== null && REQUEST.actionId !== ACTION.id) {
                globalThis.__chestnutCaptureMiss ??= {
                    requestedActionId: REQUEST.actionId,
                    observedActionId: ACTION.id,
                    tick: BUDMORI.sim.simulationTick,
                };
                return;
            }
            if (ACTION.form !== REQUEST.tier) {
                return;
            }
            const DRAWN = globalThis.__chestnutDraw;
            let matches = false;
            if (REQUEST.phase === 'windup') {
                matches =
                    DRAWN?.phase === 'windup' &&
                    DRAWN.form === REQUEST.tier &&
                    DRAWN.elapsed >= ACTION.windupSeconds * 0.65;
            } else if (REQUEST.phase === 'projectile') {
                matches =
                    projectile?.actionId === ACTION.id &&
                    projectile.slot === REQUEST.slot &&
                    projectile.progress >= 0.3 &&
                    projectile.progress <= 0.7;
            } else if (REQUEST.phase === 'recover') {
                matches =
                    DRAWN?.phase === 'recover' &&
                    DRAWN.form === REQUEST.tier &&
                    ACTION.nextShot === ACTION.shots.length &&
                    !BUDMORI.sim.projectiles.some((shot) => !shot.hit && shot.chestnutActionId === ACTION.id) &&
                    ACTION.attack?.hits.every((hits) => hits.length === 1);
            }
            if (matches) {
                const SESSION = BUDMORI.runtime;
                SESSION.paused = true;
                SESSION.pauseStartedAt = globalThis.__chestnutInputClock;
                globalThis.__chestnutCaptured = {
                    actionId: ACTION.id,
                    tick: BUDMORI.sim.simulationTick,
                    projectileId: projectile?.id ?? null,
                };
            }
        };
        if (!PLAYER.__chestnutCaptureWrapped) {
            const DRAW = PLAYER.draw,
                WRAPPER = Object.create(PLAYER);
            const CAPTURE_DRAW = function (options) {
                const DISPLAY = BUDMORI.runtime.presentationView?.units.find((unit) => unit.id === UNIT.id),
                    MATRIX = options.matrix,
                    [LEFT, TOP, WIDTH, HEIGHT] = RENDERER.vectorAssets.get(3).compiled.viewBox,
                    BOUNDS = (left, top, right, bottom) => {
                        const POINTS = [
                            [left, top],
                            [right, top],
                            [left, bottom],
                            [right, bottom],
                        ].map(([x, y]) => ({
                            x: (MATRIX[0] * x + MATRIX[2] * y + MATRIX[4]) / RENDERER.pixelRatio,
                            y: (MATRIX[1] * x + MATRIX[3] * y + MATRIX[5]) / RENDERER.pixelRatio,
                        }));
                        return {
                            left: Math.min(...POINTS.map((p) => p.x)),
                            right: Math.max(...POINTS.map((p) => p.x)),
                            top: Math.min(...POINTS.map((p) => p.y)),
                            bottom: Math.max(...POINTS.map((p) => p.y)),
                        };
                    },
                    TORSO = BOUNDS(body.left, body.top, body.right, body.bottom);
                globalThis.__chestnutDraw = DISPLAY
                    ? {
                          matrix: [...MATRIX],
                          torso: { width: TORSO.right - TORSO.left, height: TORSO.bottom - TORSO.top },
                          bounds: BOUNDS(LEFT, TOP, LEFT + WIDTH, TOP + HEIGHT),
                          viewport: { width: innerWidth, height: innerHeight },
                          phase: DISPLAY.ability.phase,
                          elapsed: DISPLAY.ability.elapsed,
                          form: DISPLAY.ability.chestnutForm,
                          stage: DISPLAY.ability.chestnutStage,
                          progress: DISPLAY.ability.chestnutStageProgress,
                          slot: DISPLAY.ability.chestnutSlot,
                          x: DISPLAY.x,
                          y: DISPLAY.y,
                          z: DISPLAY.z,
                          at: RENDERER.displayTimeMs,
                      }
                    : null;
                const RESULT = DRAW.call(PLAYER, options);
                CHECK_CAPTURE();
                return RESULT;
            };
            Object.defineProperty(WRAPPER, 'draw', { value: CAPTURE_DRAW });
            WRAPPER.__chestnutCaptureWrapped = true;
            RENDERER.vectorPlayerAssets.set(WRAPPER, RENDERER.vectorPlayerAssets.get(PLAYER));
            RENDERER.vectorPlayers.set(UNIT.id, WRAPPER);
        }
        if (!RENDERER.projectilePresentation.__chestnutCaptureWrapped) {
            const PRESENTATION = RENDERER.projectilePresentation,
                DRAW = PRESENTATION.draw;
            globalThis.__chestnutProjectileDraws = {};
            PRESENTATION.draw = function (shot, ...args) {
                if (!shot.chestnutActionId) {
                    return DRAW.call(this, shot, ...args);
                }
                const LINES = [],
                    ELLIPSES = [],
                    LINE = RENDERER.line,
                    ELLIPSE = RENDERER.ellipse;
                // Forward the native renderer calls unchanged; these observations are not a second renderer.
                RENDERER.line = function (a, b, width, color) {
                    LINES.push({ a: { ...a }, b: { ...b }, width: width * this.scale });
                    return LINE.call(this, a, b, width, color);
                };
                RENDERER.ellipse = function (x, y, rx, ry, color, angle = 0) {
                    ELLIPSES.push({ x, y, rx, ry, angle });
                    return ELLIPSE.call(this, x, y, rx, ry, color, angle);
                };
                let result;
                try {
                    result = DRAW.call(this, shot, ...args);
                } finally {
                    RENDERER.line = LINE;
                    RENDERER.ellipse = ELLIPSE;
                }
                const POINTS = [];
                for (const LINE_LOCAL of LINES) {
                    for (const POINT of [LINE_LOCAL.a, LINE_LOCAL.b]) {
                        POINTS.push(
                            { x: POINT.x - LINE_LOCAL.width / 2, y: POINT.y - LINE_LOCAL.width / 2 },
                            { x: POINT.x + LINE_LOCAL.width / 2, y: POINT.y + LINE_LOCAL.width / 2 },
                        );
                    }
                }
                for (const SHAPE of ELLIPSES) {
                    const RX = Math.hypot(SHAPE.rx * Math.cos(SHAPE.angle), SHAPE.ry * Math.sin(SHAPE.angle)),
                        RY = Math.hypot(SHAPE.rx * Math.sin(SHAPE.angle), SHAPE.ry * Math.cos(SHAPE.angle));
                    POINTS.push({ x: SHAPE.x - RX, y: SHAPE.y - RY }, { x: SHAPE.x + RX, y: SHAPE.y + RY });
                }
                const DATA = {
                    id: shot.id,
                    actionId: shot.chestnutActionId,
                    slot: shot.chestnutSlot,
                    form: shot.chestnutForm,
                    stage: shot.chestnutStage,
                    progress: shot.elapsed / shot.path.duration,
                    path: structuredClone(shot.path),
                    at: RENDERER.displayTimeMs,
                    lines: LINES,
                    ellipses: ELLIPSES,
                    bounds: {
                        left: Math.min(...POINTS.map((p) => p.x)) / RENDERER.pixelRatio,
                        right: Math.max(...POINTS.map((p) => p.x)) / RENDERER.pixelRatio,
                        top: Math.min(...POINTS.map((p) => p.y)) / RENDERER.pixelRatio,
                        bottom: Math.max(...POINTS.map((p) => p.y)) / RENDERER.pixelRatio,
                    },
                };
                globalThis.__chestnutProjectileDraws[shot.id] = DATA;
                CHECK_CAPTURE(DATA);
                return result;
            };
            PRESENTATION.__chestnutCaptureWrapped = true;
        }
        return true;
    }, unitBodyDefinition(3).bounds);
}

async function assertProjectileFraming(page, projectile) {
    const GEOMETRY = await page.evaluate(async (drawn) => {
        const { sampleChestnutShards: SAMPLE } = await import('/__test__/chestnut-presentation.js'),
            RENDERER = BUDMORI.renderer,
            SHOT = { path: drawn.path, chestnutStage: drawn.stage },
            PROJECT = (point) => RENDERER.project(point.x, point.y, point.z),
            HEADS = SAMPLE(SHOT, drawn.progress),
            TAILS = SAMPLE(SHOT, drawn.progress - 0.06 / SHOT.path.duration),
            EXPECTED_LINES = HEADS.flatMap((head, index) => [
                { a: PROJECT(TAILS[index]), b: PROJECT(head), width: 0.045 * RENDERER.scale },
                {
                    a: PROJECT(head),
                    b: PROJECT({
                        x: head.x + Math.cos(head.angle) * head.length,
                        y: head.y + Math.sin(head.angle) * head.length,
                        z: head.z,
                    }),
                    width: head.width * RENDERER.scale,
                },
            ]),
            POINTS = [];
        // The production shard sampler is the authority for the whole fixed path,
        // including divergent/convergent wings and the trailing sample, not a fake preview.
        for (let index = 0; index <= 32; index++) {
            const Q = index / 32;
            for (const SHARD of [...SAMPLE(SHOT, Q), ...SAMPLE(SHOT, Q - 0.06 / SHOT.path.duration)]) {
                for (const POINT of [
                    SHARD,
                    {
                        x: SHARD.x + Math.cos(SHARD.angle) * SHARD.length,
                        y: SHARD.y + Math.sin(SHARD.angle) * SHARD.length,
                        z: SHARD.z,
                    },
                ]) {
                    const P = PROJECT(POINT),
                        MARGIN = RENDERER.scale * Math.max(SHARD.width / 2, 0.045);
                    POINTS.push(
                        { x: (P.x - MARGIN) / RENDERER.pixelRatio, y: (P.y - MARGIN) / RENDERER.pixelRatio },
                        { x: (P.x + MARGIN) / RENDERER.pixelRatio, y: (P.y + MARGIN) / RENDERER.pixelRatio },
                    );
                }
            }
        }
        return {
            expectedLines: EXPECTED_LINES,
            actualLines: drawn.lines,
            shards: HEADS.length,
            bounds: {
                left: Math.min(...POINTS.map((p) => p.x)),
                right: Math.max(...POINTS.map((p) => p.x)),
                top: Math.min(...POINTS.map((p) => p.y)),
                bottom: Math.max(...POINTS.map((p) => p.y)),
            },
            viewport: { width: innerWidth, height: innerHeight },
            zoom: RENDERER.zoom,
            scale: RENDERER.scale,
        };
    }, projectile);
    assert.equal(
        GEOMETRY.actualLines.length,
        GEOMETRY.expectedLines.length,
        'all native shard/tail line calls accounted for',
    );
    for (let index = 0; index < GEOMETRY.expectedLines.length; index++) {
        const EXPECTED = GEOMETRY.expectedLines[index],
            ACTUAL = GEOMETRY.actualLines[index];
        for (const POINT of ['a', 'b']) {
            for (const AXIS of ['x', 'y']) {
                assert.ok(
                    Math.abs(EXPECTED[POINT][AXIS] - ACTUAL[POINT][AXIS]) < 1e-6,
                    'native draw follows actual production shard trajectory',
                );
            }
        }
        assert.equal(ACTUAL.width, EXPECTED.width);
    }
    assert.equal(
        GEOMETRY.shards,
        ['fan', 'spread'].includes(projectile.stage) ? 5 : projectile.stage === 'converge' ? 2 : 1,
        'stage silhouette uses bounded visual shards, not extra damage slots',
    );
    assert.ok(
        [GEOMETRY.zoom, GEOMETRY.scale, ...Object.values(GEOMETRY.bounds)].every(Number.isFinite),
        'finite camera and full future path/tail geometry',
    );
    assert.ok(
        GEOMETRY.bounds.left >= 0 &&
            GEOMETRY.bounds.right <= GEOMETRY.viewport.width &&
            GEOMETRY.bounds.top >= 0 &&
            GEOMETRY.bounds.bottom <= GEOMETRY.viewport.height,
        'full launch-to-impact shard paths, tips and tails fit actual canvas',
    );
    return GEOMETRY;
}

async function captureMotion(page, tier, label) {
    await observeDrawnChestnut(page);
    if (label === 'main') {
        await limitMainMotionObservationClock(page);
    }
    const TRACE = [],
        SLOT_COUNT = [0, 1, 2, 1, 2, 2, 3][tier],
        STAGES = [
            { phase: 'windup' },
            ...Array.from({ length: SLOT_COUNT }, (_, slot) => ({ phase: 'projectile', slot })),
            { phase: 'recover' },
        ];
    let actionId = null;
    await page.evaluate(
        (request) => {
            globalThis.__chestnutCaptured = null;
            globalThis.__chestnutCaptureMiss = null;
            globalThis.__chestnutCaptureRequest = request;
        },
        { tier, ...STAGES[0], actionId },
    );
    for (let index = 0; index < STAGES.length; index++) {
        const REQUEST = STAGES[index];
        await page.waitForFunction(() => !!globalThis.__chestnutCaptured, null, { timeout: 18000, polling: 'raf' });
        await settleCapturedFrame(page);
        const STATE = await page.evaluate(() => {
            const WORLD = BUDMORI.sim,
                UNIT = WORLD.units[0],
                CAPTURE = globalThis.__chestnutCaptured;
            return {
                tick: WORLD.simulationTick,
                phase: UNIT.ability.phase,
                elapsed: UNIT.ability.elapsed,
                chestnut: structuredClone(UNIT.ability.action.chestnutAttack),
                drawn: structuredClone(globalThis.__chestnutDraw),
                projectile:
                    CAPTURE.projectileId === null
                        ? null
                        : structuredClone(globalThis.__chestnutProjectileDraws[CAPTURE.projectileId]),
                hits: WORLD.notices.filter((e) => e.kind === 'boss-hit' && e.attackId === CAPTURE.actionId),
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
        if (REQUEST.phase !== 'projectile') {
            assert.equal(STATE.drawn.phase, REQUEST.phase, 'native render retains captured phase');
        }
        assert.equal(STATE.unitCount, 1, 'one body, no clones');
        assert.equal(STATE.z, 0, 'spike attacks leave the actual body grounded');
        assert.ok(STATE.distance >= STATE.bossRadius - 0.05, 'body remains outside boss center');
        assert.ok(Object.values(STATE.drawn.bounds).every(Number.isFinite), 'finite native body bounds');
        assert.ok(
            STATE.drawn.bounds.left >= 0 &&
                STATE.drawn.bounds.right <= STATE.drawn.viewport.width &&
                STATE.drawn.bounds.top >= 0 &&
                STATE.drawn.bounds.bottom <= STATE.drawn.viewport.height,
            'whole native body fits canvas',
        );
        if (label === 'preview') {
            assert.ok(
                STATE.drawn.torso.width >= 32 && STATE.drawn.torso.height >= 32,
                'preview actual torso stays at least32px',
            );
        }
        if (REQUEST.phase === 'projectile') {
            assert.equal(STATE.projectile.actionId, STATE.chestnut.id);
            assert.equal(STATE.projectile.slot, REQUEST.slot, 'requested budgeted slot is drawn');
            assert.equal(STATE.projectile.stage, STATE.chestnut.shots[REQUEST.slot].stage);
            assert.ok(STATE.projectile.lines.length > 0, 'native spike and tail geometry was actually drawn');
            assert.ok(Object.values(STATE.projectile.bounds).every(Number.isFinite), 'finite native spike/tail bounds');
            assert.ok(
                STATE.projectile.bounds.left >= 0 &&
                    STATE.projectile.bounds.right <= STATE.drawn.viewport.width &&
                    STATE.projectile.bounds.top >= 0 &&
                    STATE.projectile.bounds.bottom <= STATE.drawn.viewport.height,
                'whole native spike/tail fits canvas',
            );
            STATE.projectileFraming = await assertProjectileFraming(page, STATE.projectile);
            for (const POINT of [STATE.projectile.path.from, STATE.projectile.path.to]) {
                assert.ok(
                    ['x', 'y', 'z'].every((key) => Number.isFinite(POINT[key])),
                    'explicit finite path endpoints including z',
                );
            }
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
        actionId ??= STATE.chestnut.id;
        await page.evaluate(
            (request) => {
                const SESSION = BUDMORI.runtime,
                    DURATION = SESSION.pausedDurationMs + globalThis.__chestnutInputClock - SESSION.pauseStartedAt;
                globalThis.__chestnutCaptureRequest = request;
                globalThis.__chestnutCaptured = null;
                SESSION.loop.resetTiming();
                SESSION.paused = false;
                SESSION.pausedDurationMs = DURATION;
            },
            index + 1 < STAGES.length ? { tier, ...STAGES[index + 1], actionId } : null,
        );
    }
    assert.equal(
        new Set(TRACE.map((state) => state.chestnut.id)).size,
        1,
        'all poses and launches are the same real action',
    );
    assert.ok(TRACE.at(-1).bossHp < TRACE[0].bossHp, 'real projectiles damage training boss');
    assert.equal(
        TRACE.at(-1).hits.length,
        SLOT_COUNT,
        'each budgeted basic slot hits the boss once, separate periodic IDs excluded',
    );
    assert.equal(new Set(TRACE.at(-1).hits.map((hit) => hit.sequence)).size, SLOT_COUNT);
    const OBSERVATION_CLOCK = await page.evaluate(() => {
        const CLOCK = BUDMORI.runtime.__chestnutMotionClock;
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
    REPORT.push({ kind: label, tier, trace: TRACE, observationClock: OBSERVATION_CLOCK });
}

async function preview(page, tier, mobile) {
    const CONTROL = await page.locator(`[data-chestnut-preview-tier="${tier}"]`).boundingBox();
    assert.ok(CONTROL && CONTROL.width >= 44 && CONTROL.height >= 44, 'preview control is at least44px');
    const BEFORE = await page.evaluate(() => JSON.stringify(BUDMORI.sim.playerProgression));
    await activate(page.locator(`[data-chestnut-preview-tier="${tier}"]`), mobile);
    const HANDLE = await page.locator('.chestnut-evolution-preview iframe').elementHandle(),
        FRAME = await HANDLE.contentFrame();
    await FRAME.waitForFunction(() => globalThis.BUDMORI?.sim?.units[0]?.species === 3);
    await revealPreview(page, FRAME, mobile);
    // Start a fresh real scenario after scrolling, which can consume its nine-second budget.
    await FRAME.goto(FRAME.url());
    await FRAME.waitForFunction(() => globalThis.BUDMORI?.sim?.units[0]?.species === 3);
    assert.equal(
        await FRAME.locator('#bossbar').evaluate((element) => getComputedStyle(element).display),
        'none',
        'isolated attack preview hides its boss HUD so it cannot cover the actual body',
    );
    // Frame has no screenshot method: capture its owner page while retaining frame-local timing.
    FRAME.screenshot = async (options) => {
        const CANVAS = await FRAME.locator('#world').boundingBox(),
            PANE = await (await treeScrollPane(page)).boundingBox(),
            DRAWN = await FRAME.evaluate(() => globalThis.__chestnutDraw),
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
            HELP_SCENE_BY_ID(`chestnut-t${selectedTier}`).setup(WORLD);
            if (!fullResearch) {
                WORLD.playerProgression.abilities['chestnut-target-thorns'].nodeRanks = {};
                WORLD.runProgressionSnapshot.abilities['chestnut-target-thorns'].nodeRanks = {};
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
            OTHERS = [0, 1, 2, 4, 5, 6, 7, 8];
        for (let index = 1; index < BUDMORI.CONFIG.farm.capacity.max; index++) {
            const SPECIES = index < 60 ? 3 : OTHERS[(index - 60) % OTHERS.length],
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
        globalThis.__chestnutSplitEvents = [];
        globalThis.__chestnutSplitOff = WORLD.onNotice.on((notice) => {
            if (notice.kind === 'peanut-split') {
                globalThis.__chestnutSplitEvents.push(structuredClone(notice));
            }
        });
        // A newborn only enters presentation after the committed model tick is
        // captured. Pausing inside its notice would freeze the older entity set.
        // Forward the real native draw, then pause on the first frame that drew
        // every actual child. Neither model timing nor the frozen player changes.
        const PRESENTATION = BUDMORI.renderer.unitPresentation,
            DRAW = PRESENTATION.draw;
        globalThis.__chestnutSplitDraw = { frame: null, ids: [], children: [], complete: false };
        PRESENTATION.draw = function (unit, view) {
            const RESULT = DRAW.call(this, unit, view),
                STATE = globalThis.__chestnutSplitDraw,
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
                globalThis.__chestnutSplitEvents.length > 0 &&
                CHILDREN.length >= 2 &&
                CHILDREN.every((child) => STATE.ids.includes(child.id))
            ) {
                STATE.complete = true;
                BUDMORI.runtime.paused = true;
            }
            return RESULT;
        };
        globalThis.__chestnutSplitDrawOff = () => {
            PRESENTATION.draw = DRAW;
        };
        return {
            count: WORLD.units.length,
            tick: WORLD.simulationTick,
            peanuts: WORLD.units.filter((unit) => unit.species === 4).map((unit) => unit.id),
        };
    });
    assert.equal(INITIAL.count, 200);
    await page.waitForFunction(() => globalThis.__chestnutSplitDraw.complete && BUDMORI.runtime.paused);
    await settleCapturedFrame(page);
    const SPLIT = await page.evaluate(() => ({
        tick: BUDMORI.sim.simulationTick,
        events: globalThis.__chestnutSplitEvents,
        nativeDraw: globalThis.__chestnutSplitDraw,
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
        globalThis.__chestnutSplitOff();
        globalThis.__chestnutSplitDrawOff();
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
    // Subscribe to committed combat notices at normal speed. Only the ordinary pause
    // input changes; no clocks, attack state, movement, damage or model steps are replaced.
    await page.evaluate(() => {
        const WORLD = BUDMORI.sim;
        globalThis.__chestnutContinuity = { actionId: null, hits: [], complete: false };
        globalThis.__chestnutContinuityOff = WORLD.onNotice.on((notice) => {
            if (notice.kind !== 'boss-hit') {
                return;
            }
            const STATE = globalThis.__chestnutContinuity,
                RECORD = WORLD.chestnutAttacks.find((record) => record.id === notice.attackId);
            if (!RECORD || RECORD.periodic || RECORD.form !== 6) {
                return;
            }
            STATE.actionId ??= RECORD.id;
            if (notice.attackId !== STATE.actionId) {
                return;
            }
            STATE.hits.push(structuredClone(notice));
            if (STATE.hits.length === 1 || STATE.hits.length === 3) {
                BUDMORI.runtime.paused = true;
                STATE.complete = STATE.hits.length === 3;
            }
        });
    });
    await page.waitForFunction(() => globalThis.__chestnutContinuity.hits.length === 1 && BUDMORI.runtime.paused);
    await settleCapturedFrame(page);
    const BEFORE = await page.evaluate(() => {
        globalThis.__chestnutCheckpoint = { world: BUDMORI.sim, action: BUDMORI.sim.units[0].ability.action };
        return {
            hp: BUDMORI.sim.boss.hp,
            hits: BUDMORI.sim.notices.filter(
                (event) => event.kind === 'boss-hit' && event.attackId === globalThis.__chestnutCheckpoint.action.id,
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
    await page.waitForFunction(() => globalThis.__chestnutContinuity.complete && BUDMORI.runtime.paused);
    await settleCapturedFrame(page);
    const AFTER = await page.evaluate(() => ({
        sameWorld: BUDMORI.sim === globalThis.__chestnutCheckpoint.world,
        sameAction: BUDMORI.sim.units[0].ability.action === globalThis.__chestnutCheckpoint.action,
        hits: BUDMORI.sim.notices.filter(
            (event) => event.kind === 'boss-hit' && event.attackId === globalThis.__chestnutCheckpoint.action.id,
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
    await page.evaluate(() => globalThis.__chestnutContinuityOff());
    await resumeCapturedFrame(page);
}

async function importRedbeanReleaseSave(page, mobile) {
    // Static source was encoded and validated by the released 0.33.0 implementation,
    // not generated by the new migration code under test.
    const FILE = path.join(ROOT, 'tests/fixtures/redbean-0.33.0-chestnut-legacy.json'),
        RAW = fs.readFileSync(FILE, 'utf8'),
        SOURCE = JSON.parse(RAW),
        EXPECTED_CORN = SOURCE.progress.player.abilities['corn-kernel-chain'],
        EXPECTED_PEA = SOURCE.progress.player.abilities['pea-recovery-boost'],
        EXPECTED_REDBEAN = SOURCE.progress.player.abilities['kidney-continuous-leap'],
        EXPECTED_LEGACY_CHESTNUT = SOURCE.progress.player.abilities['chestnut-target-thorns'];
    assert.equal(SOURCE.productVersion, '0.33.0');
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
    await openChestnut(page, mobile);
    assert.match(await page.locator('[data-growth-refund]').textContent(), /환급 완료/);
    assert.match(await page.locator('[data-growth-wallet]').textContent(), /총\s*50P.*사용\s*0P.*남음\s*50P/s);
    assert.match(await page.locator('.ability-tree__progress').textContent(), /17.3.*누적 XP/s);
    const READ_STATE = async () =>
        page.evaluate(() => ({
            chestnut: BUDMORI.sim.playerProgression.abilities['chestnut-target-thorns'],
            corn: BUDMORI.sim.playerProgression.abilities['corn-kernel-chain'],
            pea: BUDMORI.sim.playerProgression.abilities['pea-recovery-boost'],
            redbean: BUDMORI.sim.playerProgression.abilities['kidney-continuous-leap'],
            source: localStorage.getItem('bloom-weapon-cards-v4:species-tree-source-v3'),
            prior: localStorage.getItem('bloom-weapon-cards-v4:species-tree-prior-source-v3'),
            imported: localStorage.getItem('bloom-weapon-cards-v4:import-source'),
        }));
    const FIRST = await READ_STATE();
    assert.deepEqual(FIRST.corn, EXPECTED_CORN, 'corn ranks, mastery, XP and archived investment remain exact');
    assert.deepEqual(FIRST.pea, EXPECTED_PEA, 'pea ranks, mastery, XP and archived investment remain exact');
    assert.deepEqual(FIRST.redbean, EXPECTED_REDBEAN, 'redbean ranks, mastery, XP and archive remain exact');
    assert.deepEqual(FIRST.chestnut.legacyInvestment, EXPECTED_LEGACY_CHESTNUT);
    assert.deepEqual(FIRST.chestnut.nodeRanks, {});
    assert.equal(FIRST.source, RAW, 'migration backup is byte-for-byte imported source');
    assert.equal(FIRST.imported, RAW);
    await page.screenshot({ path: path.join(OUTPUT, `${VIEWPORT}-import-chestnut-refund.png`) });
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
        kind: 'redbean-release-import',
        productVersion: SOURCE.productVersion,
        chestnut: FIRST.chestnut,
        corn: FIRST.corn,
        pea: FIRST.pea,
        redbean: FIRST.redbean,
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
            await importRedbeanReleaseSave(PAGE, MOBILE);
            assert.deepEqual(ERRORS, []);
            progress(
                'PASS literal 0.33.0 import, chestnut refund, corn/pea/redbean preservation, two reloads and stable backup',
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
                progress(`main battle T${TIER} real windup/slot flights/recovery captured`);
            }
            assert.deepEqual(ERRORS, []);
            progress('PASS main battle capture flow');
            await CONTEXT.close();
            continue;
        }
        await openChestnut(PAGE, MOBILE);
        progress('chestnut tree open');
        if (CASE.startsWith('previews-')) {
            for (const TIER of CASE === 'previews-low' ? [1, 2, 3] : [4, 5, 6]) {
                progress(`isolated preview T${TIER} start`);
                await preview(PAGE, TIER, MOBILE);
                progress(`isolated preview T${TIER} captured`);
            }
            await activate(PAGE.locator('[data-ability-species="1"]'), MOBILE);
            assert.equal(
                await PAGE.locator('.chestnut-evolution-preview iframe').count(),
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
                await activate(PAGE.locator('[data-ability-species="3"]'), MOBILE);
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
                CHESTNUT = WORLD.playerProgression.abilities['chestnut-target-thorns'];
            CHESTNUT.masteryLevel = 50;
            CHESTNUT.masteryXp = 125;
            WORLD.spawn(3, 6, 1, 0);
            WORLD.markProgressChanged();
            BUDMORI.storage.save(WORLD);
        });
        await activate(PAGE.locator('[data-ability-species="4"]'), MOBILE);
        assert.equal(await PAGE.locator('[data-growth-tree]').count(), 0, 'unreleased species keeps its legacy tree');
        await activate(PAGE.locator('[data-ability-species="3"]'), MOBILE);
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
        assert.equal(
            await PAGE.locator('.chestnut-evolution-preview iframe').count(),
            0,
            'tab change disposes preview',
        );
        await activate(PAGE.locator('[data-ability-species="3"]'), MOBILE);
        await activate(PAGE.locator('#gameMenuClose'), MOBILE);
        await PAGE.reload();
        await PAGE.waitForFunction(() => globalThis.BUDMORI?.sim?.scene === 'farm');
        if (await PAGE.locator('#abilityPanel').isHidden()) {
            await openChestnut(PAGE, MOBILE);
        } else {
            await activate(PAGE.locator('[data-ability-species="3"]'), MOBILE);
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
                globalThis.__chestnutRunBeforeHome = {
                    world: BUDMORI.sim,
                    snapshot: JSON.stringify(BUDMORI.sim.runProgressionSnapshot),
                    phase: BUDMORI.sim.farmBossEvent.phase,
                };
                location.hash = '#/';
            });
            await PAGE.locator('#startScreen').waitFor({ state: 'visible' });
            await activate(PAGE.locator('#continueGame'), MOBILE);
            assert.equal(
                await PAGE.evaluate(() => BUDMORI.sim === globalThis.__chestnutRunBeforeHome.world),
                true,
                `${PHASE} Home→Continue keeps the live memory run`,
            );
            assert.equal(
                await PAGE.evaluate(
                    () =>
                        JSON.stringify(BUDMORI.sim.runProgressionSnapshot) ===
                        globalThis.__chestnutRunBeforeHome.snapshot,
                ),
                true,
                'Home→Continue keeps the initial investment snapshot',
            );
            assert.equal(await PAGE.evaluate(() => BUDMORI.sim.tower.active), true);
        }
        await openChestnut(PAGE, MOBILE);
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
            `PASS chestnut growth ${MOBILE ? 'mobile touch 390px' : 'desktop'}: locked Lv1, purchases, research, scroll, reset, save/reload, live-run lock`,
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
                            captureRequest: globalThis.__chestnutCaptureRequest || null,
                            captured: globalThis.__chestnutCaptured || null,
                            missedAction: globalThis.__chestnutCaptureMiss || null,
                            observationClock: globalThis.BUDMORI?.runtime?.__chestnutMotionClock
                                ? {
                                      active: BUDMORI.runtime.__chestnutMotionClock.active,
                                      frames: BUDMORI.runtime.__chestnutMotionClock.frames,
                                      maxInputDeltaMs: BUDMORI.runtime.__chestnutMotionClock.maxInputDeltaMs,
                                      maxForwardedDeltaMs: BUDMORI.runtime.__chestnutMotionClock.maxForwardedDeltaMs,
                                  }
                                : null,
                            drawn: globalThis.__chestnutDraw || null,
                            unit: UNIT
                                ? {
                                      id: UNIT.id,
                                      phase: UNIT.ability.phase,
                                      chestnut: UNIT.ability.action?.chestnutAttack,
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
