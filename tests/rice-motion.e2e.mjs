// Compact actual-source motion gate. No generated bundle, injected pose, manual
// simulation stepping. Preview observation bounds input deltas; main battle uses normal time.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const VIEWPORT = process.argv[2] || 'desktop',
    ROOT = path.resolve(fileURLToPath(new URL('../', import.meta.url))),
    OUTPUT = path.join(ROOT, 'tests/output/rice-motion', VIEWPORT),
    SIZE = VIEWPORT === 'landscape' ? { width: 844, height: 390 } : { width: 1100, height: 850 },
    HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'),
    MANIFEST = JSON.parse(
        HTML.match(/<script id="bloom-runtime-manifest" type="application\/json">(.*?)<\/script>/s)[1],
    ),
    MODULES = new Map(
        MANIFEST.modules.map((item) => [
            item.url,
            fs.readFileSync(path.join(ROOT, 'vendor/upstream', item.name + '.js')),
        ]),
    ),
    TYPES = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.svg': 'image/svg+xml',
    },
    ERRORS = [],
    REPORT = [];
assert.ok(['desktop', 'landscape'].includes(VIEWPORT));
fs.mkdirSync(OUTPUT, { recursive: true });
const SERVER = http.createServer((request, response) => {
    const FILE = path.resolve(ROOT, '.' + decodeURIComponent(request.url.split('?')[0]));
    if (!FILE.startsWith(ROOT + path.sep) || !fs.existsSync(FILE) || !fs.statSync(FILE).isFile()) {
        response.writeHead(request.url.includes('favicon.ico') ? 204 : 404).end();
        return;
    }
    response.setHeader('content-type', TYPES[path.extname(FILE)] || 'application/octet-stream');
    response.end(fs.readFileSync(FILE));
});
await new Promise((resolve) => SERVER.listen(0, '127.0.0.1', resolve));
async function activate(locator) {
    await (VIEWPORT === 'landscape' ? locator.tap() : locator.click());
}
// Preserve the failing iframe state before browser teardown, including waits
// before observer installation. Diagnostics never mutate simulation or pose.
async function previewWait(frame, page, tier, label, predicate, timeout = 30000) {
    try {
        await frame.waitForFunction(predicate, null, { timeout });
    } catch (error) {
        await previewFailure(frame, page, tier, label, error);
        throw error;
    }
}
async function previewFailure(frame, page, tier, label, error) {
    const FAILURE = { kind: 'preview-wait-failure', tier, label, error: String(error), url: frame.url() };
    try {
        FAILURE.live = await frame.evaluate(() => {
            const APP = globalThis.BUDMORI,
                WORLD = APP?.sim,
                UNIT = WORLD?.units[0],
                SESSION = APP?.runtime,
                DISPLAY = SESSION?.presentationView?.units.find((unit) => unit.id === UNIT?.id);
            return {
                sceneId: new URLSearchParams(location.search).get('help'),
                help: globalThis.__budmoriHelp?.snapshot(),
                hidden: document.hidden,
                home: document.body.dataset.home,
                simulationTick: WORLD?.simulationTick,
                scene: WORLD?.scene,
                eventPhase: WORLD?.farmBossEvent?.phase,
                paused: SESSION?.paused,
                pauseStartedAt: SESSION?.pauseStartedAt,
                pausedDurationMs: SESSION?.pausedDurationMs,
                clock: globalThis.__ricePreviewClock,
                inputClock: globalThis.__riceInputClock,
                observer: globalThis.__riceMotion,
                playerIds: [...(APP?.renderer?.vectorPlayers.keys() || [])],
                unit: UNIT && {
                    id: UNIT.id,
                    species: UNIT.species,
                    hp: UNIT.hp,
                    stun: UNIT.stun,
                    x: UNIT.x,
                    y: UNIT.y,
                    z: UNIT.z,
                    phase: UNIT.ability.phase,
                    action: UNIT.ability.action?.riceAttack,
                },
                display: DISPLAY && { id: DISPLAY.id, ability: DISPLAY.ability },
            };
        });
    } catch (diagnosticError) {
        FAILURE.diagnosticError = String(diagnosticError);
    }
    for (const [NAME, TARGET] of [
        ['modal', page],
        ['iframe', frame.locator('body')],
    ]) {
        try {
            await TARGET.screenshot({
                path: path.join(OUTPUT, `t${tier}-${label}-failure-${NAME}.png`),
                timeout: 5000,
            });
        } catch (screenshotError) {
            FAILURE[`${NAME}ScreenshotError`] = String(screenshotError);
        }
    }
    REPORT.push(FAILURE);
}

let browser, activePreview;
try {
    browser = await chromium.launch({
        executablePath: process.env.CHROME_PATH,
        args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    });
    const CONTEXT = await browser.newContext({
            viewport: SIZE,
            hasTouch: VIEWPORT === 'landscape',
            serviceWorkers: 'block',
        }),
        PAGE = await CONTEXT.newPage(),
        ORIGIN = `http://127.0.0.1:${SERVER.address().port}`;
    PAGE.on('pageerror', (error) => ERRORS.push(String(error)));
    PAGE.on('console', (message) => {
        if (message.type() === 'error') {
            ERRORS.push(message.text());
        }
    });
    await CONTEXT.route('**/*', (route) => {
        const URL_LOCAL = route.request().url();
        if (URL_LOCAL.startsWith(ORIGIN + '/')) {
            return route.continue();
        }
        if (MODULES.has(URL_LOCAL)) {
            return route.fulfill({
                body: MODULES.get(URL_LOCAL),
                contentType: 'text/javascript',
                headers: { 'access-control-allow-origin': '*' },
            });
        }
        ERRORS.push('Unexpected network request: ' + URL_LOCAL);
        return route.abort();
    });
    await PAGE.addInitScript(() => {
        if (!new URLSearchParams(location.search).has('help')) {
            return;
        }
        function installObserver() {
            const RENDERER = BUDMORI.renderer,
                RENDER = RENDERER.render,
                WORLD = BUDMORI.sim,
                UNIT = WORLD.units[0],
                SESSION = BUDMORI.runtime,
                PRESENT = SESSION.presentation;
            // One bounded RAF input reaches HELP.clock, scenario.pulse, session
            // pulse and presentation. Never rescale only one consumer downstream.
            SESSION.__riceObservationClock = globalThis.__ricePreviewClock;
            SESSION.presentation = function (now) {
                globalThis.__riceInputClock = now;
                return PRESENT.call(this, now);
            };
            SESSION.loop.resetTiming();
            globalThis.__riceMotion = {
                stages: {},
                renderCalls: 0,
                installedAt: {
                    tick: WORLD.simulationTick,
                    phase: UNIT.ability.phase,
                    clock: { ...globalThis.__ricePreviewClock },
                    playerCount: RENDERER.vectorPlayers.size,
                    initialCaptureClock: SESSION.lastCaptureClockMs,
                },
                rejected: { noPlayer: 0, noRecord: 0, displayMismatch: 0 },
                captures: 0,
                ready: false,
                actionId: null,
                request: { phase: 'windup' },
                trace: [],
                initialHp: WORLD.boss.hp,
            };
            const NATIVE_FRAMES = new WeakMap();
            import('./src/features/unit-attacks/rice/presentation.js').then(
                ({ RiceAttackPresentation: presentation }) => {
                    const CONTACT = presentation.prototype.drawContact;
                    presentation.prototype.drawContact = function (renderer, unit, player, matrix) {
                        const RESULT = CONTACT.call(this, renderer, unit, player, matrix),
                            TIP = player.getSocket('weapon-tip'),
                            GROUND = player.getSocket('ground');
                        // This callback receives the exact matrix immediately after
                        // the live native player.draw, not a reconstructed expected pose.
                        NATIVE_FRAMES.set(player, {
                            tip: {
                                x: matrix[0] * TIP.x + matrix[2] * TIP.y + matrix[4],
                                y: matrix[1] * TIP.x + matrix[3] * TIP.y + matrix[5],
                            },
                            ground: {
                                x: matrix[0] * GROUND.x + matrix[2] * GROUND.y + matrix[4],
                                y: matrix[1] * GROUND.x + matrix[3] * GROUND.y + matrix[5],
                            },
                            root: renderer.project(unit.x, unit.y, 0),
                            displayPosition: { x: unit.x, y: unit.y },
                            matrix: [...matrix],
                        });
                        return RESULT;
                    };
                },
            );
            RENDERER.render = function (...args) {
                const RESULT = RENDER.apply(this, args),
                    STATE = globalThis.__riceMotion,
                    DISPLAY = BUDMORI.runtime.presentationView?.units.find((unit) => unit.id === UNIT.id),
                    PLAYER = this.vectorPlayers.get(UNIT.id),
                    A = DISPLAY?.ability,
                    RECORD = UNIT.ability.action?.riceAttack;
                STATE.renderCalls++;
                STATE.sameUnitReference = WORLD.units[0] === UNIT;
                STATE.sameWorldReference = BUDMORI.sim === WORLD;
                STATE.lastRender = {
                    tick: WORLD.simulationTick,
                    unitId: UNIT.id,
                    phase: A?.phase,
                    recordId: RECORD?.id,
                    displayId: A?.riceActionId,
                    player: !!PLAYER,
                    clock: globalThis.__riceInputClock,
                };
                if (!PLAYER) {
                    STATE.rejected.noPlayer++;
                }
                if (!RECORD) {
                    STATE.rejected.noRecord++;
                }
                if (!A?.riceForm || RECORD?.id !== A?.riceActionId) {
                    STATE.rejected.displayMismatch++;
                }
                if (!NATIVE_FRAMES.has(PLAYER) || !A?.riceForm || !RECORD || RECORD.id !== A.riceActionId) {
                    return RESULT;
                }
                if (STATE.actionId === null && A.phase === 'windup') {
                    STATE.actionId = RECORD.id;
                    STATE.expected = RECORD.shots.map((shot) => shot.stage);
                    STATE.form = RECORD.form;
                    STATE.initialHp = WORLD.boss.hp;
                }
                if (STATE.actionId !== RECORD.id || STATE.ready || !STATE.request) {
                    return RESULT;
                }
                const SICKLE = PLAYER.getPartPose('sickle'),
                    REQUEST = STATE.request,
                    MATCH =
                        A.phase === REQUEST.phase &&
                        (A.phase !== 'active' ||
                            (A.riceSlot === REQUEST.slot &&
                                A.riceStageProgress >= (REQUEST.moment === 'contact' ? 0.9 : 0.3)));
                if (MATCH) {
                    const SAMPLE = {
                        phase: A.phase,
                        moment: REQUEST.moment || A.phase,
                        nativeTip: NATIVE_FRAMES.get(PLAYER).tip,
                        nativeGround: NATIVE_FRAMES.get(PLAYER).ground,
                        groundRoot: NATIVE_FRAMES.get(PLAYER).root,
                        displayPosition: NATIVE_FRAMES.get(PLAYER).displayPosition,
                        sourcePosition: { x: UNIT.x, y: UNIT.y },
                        authoritativeSlotTick: RECORD.launchTick + (RECORD.shots[A.riceSlot]?.tick || 0),
                        worldTick: WORLD.simulationTick,
                        nativeMatrix: NATIVE_FRAMES.get(PLAYER).matrix,
                        contactPoint: this.project(A.ricePointX, A.ricePointY, 0),
                        shotDeltaMs:
                            A.phase === 'active' ? (A.elapsed * 20 - RECORD.shots[A.riceSlot].tick) * 50 : null,
                        stage: A.riceStage,
                        slot: A.riceSlot,
                        progress: A.riceStageProgress,
                        clip: PLAYER.currentClip,
                        time: PLAYER.currentTimeMs,
                        pose: { x: SICKLE.x, y: SICKLE.y, rotation: SICKLE.rotation },
                        sickleVisible: SICKLE.visible,
                        recordId: RECORD.id,
                        displayId: A.riceActionId,
                        point: [A.ricePointX, A.ricePointY],
                        actualPoint: [RECORD.point.x, RECORD.point.y],
                    };
                    STATE.trace.push(SAMPLE);
                    STATE.units = WORLD.units.length;
                    STATE.projectiles = WORLD.projectiles.length;
                    STATE.bossHp = WORLD.boss.hp;
                    STATE.hits = WORLD.notices
                        .filter((notice) => notice.kind === 'boss-hit' && notice.attackId === RECORD.id)
                        .map((notice) => ({ sequence: notice.sequence, slot: notice.strikeIndex }));
                    STATE.ready = true;
                    STATE.tick = WORLD.simulationTick;
                    BUDMORI.runtime.paused = true;
                    BUDMORI.runtime.pauseStartedAt = globalThis.__riceInputClock;
                }
                return RESULT;
            };
        }
        const REQUEST = globalThis.requestAnimationFrame.bind(globalThis),
            CLOCK = { last: null, current: null, maxDelta: 0 };
        globalThis.__ricePreviewClock = CLOCK;
        globalThis.requestAnimationFrame = (callback) =>
            REQUEST((now) => {
                // Loader/UI RAFs can run long before FarmSession's initial raw
                // performance.now() capture. Do not accumulate scaled-time debt
                // before the app exists: that would hide its first attack.
                if (!globalThis.BUDMORI) {
                    callback(now);
                    return;
                }
                if (CLOCK.last === null) {
                    // RAF timestamps may precede work performed in this frame.
                    // Start no earlier than the constructor's raw capture, then
                    // forward the same bounded domain through every HELP consumer.
                    CLOCK.current = Math.max(now, performance.now());
                } else if (CLOCK.last !== now) {
                    const DELTA = globalThis.BUDMORI?.runtime?.paused ? 0 : Math.min(25, Math.max(0, now - CLOCK.last));
                    CLOCK.current += DELTA;
                    CLOCK.maxDelta = Math.max(CLOCK.maxDelta, DELTA);
                }
                CLOCK.last = now;
                // The app publishes BUDMORI synchronously before its first RAF.
                // Hook before that first render, not after SVG readiness polling.
                if (globalThis.BUDMORI && !globalThis.__riceMotion) {
                    installObserver();
                }
                callback(CLOCK.current);
            });
    });
    for (let tier = 1; tier <= 6; tier++) {
        activePreview = { frame: PAGE.mainFrame(), page: PAGE, tier };
        await PAGE.goto(`${ORIGIN}/index.html`);
        await PAGE.waitForFunction(() => globalThis.BUDMORI);
        await activate(PAGE.locator('#newGame'));
        if (await PAGE.locator('#newConfirm').isVisible()) {
            await activate(PAGE.locator('#confirmNew'));
        }
        await PAGE.waitForFunction(() => document.body.dataset.home === 'false');
        await activate(PAGE.locator('#upgradeMenu'));
        await activate(PAGE.locator('[data-ability-species="6"]'));
        await activate(PAGE.locator(`[data-rice-preview-tier="${tier}"]`));
        const HOST = PAGE.locator('.growth-evolution-preview iframe');
        await HOST.scrollIntoViewIfNeeded();
        const HANDLE = await HOST.elementHandle(),
            FRAME = await HANDLE.contentFrame(),
            VISIBLE = await HOST.evaluate((element) => {
                const BOX = element.getBoundingClientRect(),
                    PANE = document
                        .getElementById(
                            getComputedStyle(document.getElementById('abilityPanel')).overflowY === 'auto'
                                ? 'abilityPanel'
                                : 'abilityNodes',
                        )
                        .getBoundingClientRect();
                return {
                    height: BOX.height,
                    visibleHeight: Math.min(innerHeight, PANE.bottom, BOX.bottom) - Math.max(0, PANE.top, BOX.top),
                };
            });
        activePreview.frame = FRAME;
        assert.ok(
            VISIBLE.height >= 160 && VISIBLE.visibleHeight >= VISIBLE.height - 3,
            'actual modal iframe is fully visible through its scroll pane',
        );
        REPORT.push({ kind: 'modal-preview-viewport', tier, ...VISIBLE });
        await previewWait(FRAME, PAGE, tier, 'initial-scene', () => globalThis.BUDMORI?.sim?.units[0]?.species === 6);
        await FRAME.goto(FRAME.url());
        // Install observation before asynchronous SVG players finish loading.
        await previewWait(FRAME, PAGE, tier, 'reloaded-scene', () => globalThis.BUDMORI?.sim?.units[0]?.species === 6);
        assert.equal(await FRAME.locator('#bossbar').evaluate((element) => getComputedStyle(element).display), 'none');

        let state;
        for (let capture = 0; ; capture++) {
            await previewWait(FRAME, PAGE, tier, `capture-${capture}`, () => globalThis.__riceMotion.ready);
            state = await FRAME.evaluate(() => structuredClone(globalThis.__riceMotion));
            const SAMPLE = state.trace.at(-1);
            await PAGE.screenshot({
                path: path.join(
                    OUTPUT,
                    `t${tier}-${SAMPLE.moment === 'contact' ? 'contact' : SAMPLE.phase}-${SAMPLE.slot}.png`,
                ),
            });
            assert.equal(await FRAME.evaluate(() => BUDMORI.sim.simulationTick), state.tick);
            if (SAMPLE.phase === 'recover') {
                break;
            }
            const NEXT =
                SAMPLE.phase === 'windup'
                    ? { phase: 'active', slot: 0, moment: 'early' }
                    : SAMPLE.moment === 'early'
                      ? { phase: 'active', slot: SAMPLE.slot, moment: 'contact' }
                      : SAMPLE.slot + 1 < state.expected.length
                        ? { phase: 'active', slot: SAMPLE.slot + 1, moment: 'early' }
                        : { phase: 'recover' };
            await FRAME.evaluate((request) => {
                const SESSION = BUDMORI.runtime,
                    DURATION = SESSION.pausedDurationMs + globalThis.__riceInputClock - SESSION.pauseStartedAt;
                globalThis.__riceMotion.request = request;
                globalThis.__riceMotion.ready = false;
                SESSION.paused = false;
                SESSION.pausedDurationMs = DURATION;
                SESSION.loop.resetTiming();
            }, NEXT);
        }
        assert.ok(await FRAME.evaluate(() => BUDMORI.runtime.__riceObservationClock.maxDelta <= 25));
        REPORT.push(state);
        assert.ok(
            state.installedAt.clock.current >= state.installedAt.initialCaptureClock,
            'first bounded input must not precede the session constructor capture',
        );
        assert.equal(state.form, tier);
        assert.equal(state.units, 1);
        assert.equal(state.projectiles, 0);
        assert.ok(state.bossHp < state.initialHp);
        assert.deepEqual(
            state.hits.map((hit) => hit.slot),
            state.expected.map((_stage, index) => index),
        );
        assert.equal(new Set(state.hits.map((hit) => hit.sequence)).size, state.expected.length);
        assert.equal(
            new Set(state.trace.map((sample) => sample.recordId)).size,
            1,
            'windup, every slot and recovery belong to one action',
        );
        assert.deepEqual(
            state.trace
                .filter((sample) => sample.phase === 'active' && sample.moment === 'early')
                .map((sample) => sample.stage),
            state.expected,
        );
        assert.equal(
            new Set(
                state.trace
                    .filter((sample) => sample.phase === 'active' && sample.moment === 'early')
                    .map((sample) => JSON.stringify(sample.pose)),
            ).size,
            state.expected.length,
            'each slot has a distinct actual sickle pose',
        );
        for (const SAMPLE of state.trace) {
            assert.ok(SAMPLE.sickleVisible);
            assert.equal(SAMPLE.recordId, SAMPLE.displayId);
            assert.deepEqual(SAMPLE.point, SAMPLE.actualPoint);
            if (SAMPLE.moment === 'contact') {
                const DISTANCE = Math.hypot(
                    SAMPLE.nativeTip.x - SAMPLE.contactPoint.x,
                    SAMPLE.nativeTip.y - SAMPLE.contactPoint.y,
                );
                assert.ok(
                    SAMPLE.shotDeltaMs >= -50 && SAMPLE.shotDeltaMs <= 50,
                    'contact observed within one native simulation frame of its real slot',
                );
                assert.ok(DISTANCE <= 12, `native tip reaches committed contact: ${DISTANCE.toFixed(3)}px`);
            }
            if (SAMPLE.phase === 'active') {
                assert.ok(Math.abs(SAMPLE.time - SAMPLE.progress * 1000) < 1e-5);
                assert.match(SAMPLE.clip, /fire-rice-/);
            }
        }
        // Interrupt the real action while paused, then resume the ordinary clock.
        await FRAME.evaluate(() => {
            const SESSION = BUDMORI.runtime,
                DURATION = SESSION.pausedDurationMs + globalThis.__riceInputClock - SESSION.pauseStartedAt;
            BUDMORI.sim.units[0].ability.interrupt();
            BUDMORI.sim.units[0].stun = 0.5;
            SESSION.paused = false;
            SESSION.pausedDurationMs = DURATION;
            SESSION.loop.resetTiming();
        });
        await previewWait(
            FRAME,
            PAGE,
            tier,
            'interruption',
            () => !BUDMORI.runtime.presentationView.units[0].ability.riceForm,
            5000,
        );
    }
    activePreview = null;
    // Main-world continuity uses the real browser Back/Home route and Continue
    // control. Combat fixtures choose a scenario, never inject hits or poses.
    await PAGE.goto(`${ORIGIN}/index.html`);
    await PAGE.waitForFunction(() => globalThis.BUDMORI);
    await (VIEWPORT === 'landscape' ? PAGE.locator('#newGame').tap() : PAGE.locator('#newGame').click());
    if (await PAGE.locator('#newConfirm').isVisible()) {
        await (VIEWPORT === 'landscape' ? PAGE.locator('#confirmNew').tap() : PAGE.locator('#confirmNew').click());
    }
    await PAGE.waitForFunction(() => document.body.dataset.home === 'false' && BUDMORI.sim.scene === 'farm');
    await PAGE.evaluate(async () => {
        const { helpSceneById: HELP_SCENE_BY_ID } = await import('./src/help-scenes.js'),
            WORLD = BUDMORI.sim;
        HELP_SCENE_BY_ID('rice-t6').setup(WORLD);
        globalThis.__riceMain = { id: null, hits: [], complete: false };
        WORLD.onNotice.on((notice) => {
            const STATE = globalThis.__riceMain,
                UNIT = WORLD.units[0],
                RECORD = UNIT.ability.action?.riceAttack;
            if (notice.kind !== 'boss-hit' || !RECORD || notice.attackId !== RECORD.id) {
                return;
            }
            if (!STATE.complete) {
                if (STATE.id === null && notice.strikeIndex === 0) {
                    STATE.id = RECORD.id;
                }
                if (STATE.id !== RECORD.id) {
                    return;
                }
                STATE.hits.push(structuredClone(notice));
                if (STATE.hits.length === 1 || STATE.hits.length === 4) {
                    STATE.complete = STATE.hits.length === 4;
                    BUDMORI.runtime.paused = true;
                }
            }
        });
    });
    await PAGE.waitForFunction(() => globalThis.__riceMain.hits.length === 1 && BUDMORI.runtime.paused);
    const CHECKPOINT = await PAGE.evaluate(() => {
        globalThis.__riceCheckpoint = { world: BUDMORI.sim, action: BUDMORI.sim.units[0].ability.action };
        return { tick: BUDMORI.sim.simulationTick, hp: BUDMORI.sim.boss.hp };
    });
    await PAGE.goBack();
    await PAGE.locator('#startScreen').waitFor({ state: 'visible' });
    assert.equal(await PAGE.evaluate(() => BUDMORI.sim.boss.hp), CHECKPOINT.hp);
    await (VIEWPORT === 'landscape' ? PAGE.locator('#continueGame').tap() : PAGE.locator('#continueGame').click());
    await PAGE.waitForFunction(() => globalThis.__riceMain.complete && BUDMORI.runtime.paused);
    const CONTINUITY = await PAGE.evaluate(() => ({
        boundedClock: !!BUDMORI.runtime.__riceObservationClock,
        sameWorld: BUDMORI.sim === globalThis.__riceCheckpoint.world,
        sameAction: BUDMORI.sim.units[0].ability.action === globalThis.__riceCheckpoint.action,
        hits: structuredClone(globalThis.__riceMain.hits),
    }));
    assert.ok(CONTINUITY.sameWorld && CONTINUITY.sameAction);
    assert.equal(CONTINUITY.boundedClock, false, 'main Home/Continue uses the normal production clock');
    assert.deepEqual(
        CONTINUITY.hits.map((notice) => notice.strikeIndex),
        [0, 1, 2, 3],
    );
    assert.equal(new Set(CONTINUITY.hits.map((notice) => notice.sequence)).size, 4);
    REPORT.push({ kind: 'main-home-continue', ...CONTINUITY });
    await PAGE.screenshot({ path: path.join(OUTPUT, 'main-home-continue.png') });
    assert.deepEqual(ERRORS, []);
    console.log(`PASS rice six-form actual native motion (${VIEWPORT})`);
} catch (error) {
    if (
        activePreview &&
        !REPORT.some((entry) => entry.kind === 'preview-wait-failure' && entry.tier === activePreview.tier)
    ) {
        await previewFailure(activePreview.frame, activePreview.page, activePreview.tier, 'preview-operation', error);
    }
    throw error;
} finally {
    fs.writeFileSync(path.join(OUTPUT, 'report.json'), JSON.stringify({ forms: REPORT, errors: ERRORS }, null, 2));
    await browser?.close();
    await new Promise((resolve) => SERVER.close(resolve));
}
