// Compact actual-source motion gate. No generated bundle, injected pose, manual
// simulation stepping. Preview observation bounds input deltas; main battle uses normal time.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const SPECIES = process.env.MOTION_SPECIES || 'wheat';
assert.ok(['wheat', 'barley'].includes(SPECIES));
const SPEC = {
    key: SPECIES,
    species: SPECIES === 'barley' ? 8 : 7,
    part: SPECIES === 'barley' ? 'flail' : 'command-baton',
    presentation: SPECIES === 'barley' ? 'BarleyAttackPresentation' : 'WheatAttackPresentation',
};
const VIEWPORT = process.argv[2] || 'desktop',
    SELECTION = process.argv[3] || 'all',
    ROOT = path.resolve(fileURLToPath(new URL('../', import.meta.url))),
    OUTPUT = path.join(ROOT, `tests/output/${SPEC.key}-motion`, VIEWPORT),
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
assert.ok(['all', 'forms', 'boundaries'].includes(SELECTION));
const CASES = [
    ...(SELECTION === 'boundaries'
        ? []
        : Array.from({ length: 6 }, (_value, index) => ({ id: `t${index + 1}`, tier: index + 1 }))),
    ...(SELECTION === 'forms'
        ? []
        : [
              { id: 'small-boss', tier: 1 },
              { id: 'large-boss', tier: 6 },
              { id: 'giant-card', tier: 6 },
          ]),
];
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
                clock: globalThis.__wheatPreviewClock,
                inputClock: globalThis.__wheatInputClock,
                observer: globalThis.__wheatMotion,
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
                    action: UNIT.ability.action?.[globalThis.__motionKey('Attack')],
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
    await PAGE.addInitScript((spec) => {
        globalThis.__motionSpec = spec;
        globalThis.__motionKey = (suffix) => spec.key + suffix;
        if (!new URLSearchParams(location.search).has('help')) {
            return;
        }
        // Launch may retime the real finite schedule after a successful command.
        // A shared tick has one visible first stage; a final active-boundary tick
        // is the exact first recovery pose. Every authoritative hit is still checked.
        function committedObservationPlan(record) {
            const ALL_SHOTS = record.shots.map((shot) => ({ ...shot })),
                GROUPS = [];
            for (const SHOT of ALL_SHOTS) {
                const LAST = GROUPS.at(-1);
                if (LAST?.tick === SHOT.tick) {
                    LAST.shots.push(SHOT);
                } else {
                    GROUPS.push({ tick: SHOT.tick, shots: [SHOT] });
                }
            }
            const VISIBLE = GROUPS.map((group) => {
                const RECOVERY = group.tick >= record.durationSeconds * 20 - 1e-9,
                    SHOT = RECOVERY ? group.shots.at(-1) : group.shots[0];
                return {
                    tick: group.tick,
                    slot: SHOT.slot,
                    stage: SHOT.stage,
                    phase: RECOVERY ? 'recover' : 'active',
                    slots: group.shots.map((shot) => shot.slot),
                    stages: group.shots.map((shot) => shot.stage),
                };
            });
            return {
                allShots: ALL_SHOTS,
                visible: VISIBLE,
                mergedGroups: VISIBLE.filter((group) => group.slots.length > 1),
                capturePlan: [
                    ...VISIBLE.flatMap((group) =>
                        group.phase === 'active'
                            ? [
                                  { ...group, moment: 'early' },
                                  { ...group, moment: 'contact' },
                              ]
                            : [{ ...group, moment: 'contact', recoveryContact: true }],
                    ),
                    ...(VISIBLE.at(-1).phase === 'recover'
                        ? []
                        : [{ phase: 'recover', moment: 'recover', slot: ALL_SHOTS.at(-1).slot }]),
                ],
            };
        }
        function installObserver() {
            const RENDERER = BUDMORI.renderer,
                RENDER = RENDERER.render,
                WORLD = BUDMORI.sim,
                UNIT = WORLD.units[0],
                SESSION = BUDMORI.runtime,
                PRESENT = SESSION.presentation;
            const CASE =
                    new URLSearchParams(location.search).get(globalThis.__motionSpec.key + '-case') || `t${UNIT.tier}`,
                FIXTURE = { case: CASE, changedBoss: false, acquiredGiant: false };
            if (CASE === 'small-boss' || CASE === 'large-boss') {
                // Use the actual factory to find current roster extrema; no fake
                // radius, hitbox or pose is assigned to the selected boss.
                FIXTURE.bossRoster = Array.from({ length: BUDMORI.CONFIG.unit.speciesCount }, (_value, species) => {
                    WORLD.configureBossStage(1, species);
                    return { species, radius: WORLD.boss.radius, height: WORLD.boss.height };
                });
                const SORTED = [...FIXTURE.bossRoster].sort((a, b) => a.radius - b.radius),
                    CHOSEN = CASE === 'small-boss' ? SORTED[0] : SORTED.at(-1);
                WORLD.configureBossStage(1, CHOSEN.species);
                Object.assign(WORLD.boss, { z: 0, hp: 1e7, maxHp: 1e7, stun: 60 });
                UNIT.x = -(WORLD.boss.radius + 1.35);
                UNIT.y = 0;
                WORLD._unitSpatialDirty = true;
                FIXTURE.changedBoss = true;
                FIXTURE.selectedBoss = CHOSEN;
            }
            if (CASE === 'giant-card') {
                // Select a real skill-card offer through the production run-card
                // application route. Charge and cast must come from real damage.
                WORLD.farmBossEvent.phase = 'idle';
                WORLD.tower.nextKind = 'power';
                WORLD.tower.doors = [{ type: 'skill', id: 'giant' }];
                FIXTURE.acquiredGiant = WORLD.chooseDoor(0);
                if (!FIXTURE.acquiredGiant || WORLD.tower.relics.get('giant') !== 1) {
                    throw new Error('The actual giant skill-card acquisition failed');
                }
                WORLD.farmBossEvent.phase = 'fighting';
                WORLD.farmBossEvent.elapsed = 0;
            }
            // One bounded RAF input reaches HELP.clock, scenario.pulse, session
            // pulse and presentation. Never rescale only one consumer downstream.
            SESSION.__wheatObservationClock = globalThis.__wheatPreviewClock;
            SESSION.presentation = function (now) {
                globalThis.__wheatInputClock = now;
                return PRESENT.call(this, now);
            };
            SESSION.loop.resetTiming();
            globalThis.__wheatMotion = {
                stages: {},
                fixture: FIXTURE,
                renderCalls: 0,
                installedAt: {
                    tick: WORLD.simulationTick,
                    phase: UNIT.ability.phase,
                    clock: { ...globalThis.__wheatPreviewClock },
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
            let trackedRecord = null;
            import(`./src/features/unit-attacks/${globalThis.__motionSpec.key}/presentation.js`).then((module) => {
                const PRESENTATION = module[globalThis.__motionSpec.presentation];
                const CONTACT = PRESENTATION.prototype.drawContact;
                PRESENTATION.prototype.drawContact = function (renderer, unit, player, matrix) {
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
                        footprint: {
                            radiusX: Math.max(unit.size * 0.66 * 1.12, unit.radius + 0.1) * renderer.scale,
                            radiusY: Math.max(unit.size * 0.66 * 1.12, unit.radius + 0.1) * renderer.scale * 0.62,
                            stroke: 0.06 * renderer.scale,
                        },
                        canvas: { width: renderer.canvas.width, height: renderer.canvas.height },
                        drawScale: Math.abs(matrix[0]),
                        authoredScale: unit.bodyScale * renderer.scale,
                        minimumScale: (2 * renderer.minimumUnitPixels() * (unit.giantUntil > WORLD.time ? 3 : 1)) / 350,
                        giantEndedAt: unit.giantEndedAt,
                        matrix: [...matrix],
                    });
                    return RESULT;
                };
            });
            RENDERER.render = function (...args) {
                const RESULT = RENDER.apply(this, args),
                    STATE = globalThis.__wheatMotion,
                    DISPLAY = BUDMORI.runtime.presentationView?.units.find((unit) => unit.id === UNIT.id),
                    PLAYER = this.vectorPlayers.get(UNIT.id),
                    A = DISPLAY?.ability,
                    LIVE_RECORD = UNIT.ability.action?.[globalThis.__motionKey('Attack')],
                    // The interpolated final recovery can outlive the model's
                    // action by one tick. Retain only this observed real record.
                    RECORD =
                        LIVE_RECORD?.id === A?.[globalThis.__motionKey('ActionId')]
                            ? LIVE_RECORD
                            : trackedRecord?.id === A?.[globalThis.__motionKey('ActionId')]
                              ? trackedRecord
                              : null;
                STATE.renderCalls++;
                if (STATE.interruption && !STATE.interruption.settled) {
                    const ROOT = this.unitPresentation.displayUnit(DISPLAY),
                        OFFSET = Math.hypot(ROOT.x - DISPLAY.x, ROOT.y - DISPLAY.y),
                        CHECK = {
                            tick: WORLD.simulationTick,
                            captureSequence: SESSION.presentationSequence,
                            displayTimeMs: this.displayTimeMs,
                            clock: globalThis.__wheatInputClock,
                            sourceAction: !!UNIT.ability.action,
                            displayForm: A?.[globalThis.__motionKey('Form')],
                            groundOffset: OFFSET,
                            paused: SESSION.paused,
                        };
                    STATE.interruption.last = CHECK;
                    if (
                        !CHECK.sourceAction &&
                        !CHECK.displayForm &&
                        !CHECK.paused &&
                        CHECK.tick >= STATE.interruption.startTick + 2 &&
                        CHECK.captureSequence >= STATE.interruption.startCapture + 2 &&
                        OFFSET < 1e-9
                    ) {
                        STATE.interruption.settled = CHECK;
                    }
                }
                STATE.sameUnitReference = WORLD.units[0] === UNIT;
                STATE.sameWorldReference = BUDMORI.sim === WORLD;
                STATE.lastRender = {
                    tick: WORLD.simulationTick,
                    unitId: UNIT.id,
                    phase: A?.phase,
                    recordId: RECORD?.id,
                    displayId: A?.[globalThis.__motionKey('ActionId')],
                    player: !!PLAYER,
                    clock: globalThis.__wheatInputClock,
                };
                if (!PLAYER) {
                    STATE.rejected.noPlayer++;
                }
                if (!RECORD) {
                    STATE.rejected.noRecord++;
                }
                if (!A?.[globalThis.__motionKey('Form')] || RECORD?.id !== A?.[globalThis.__motionKey('ActionId')]) {
                    STATE.rejected.displayMismatch++;
                }
                if (
                    !NATIVE_FRAMES.has(PLAYER) ||
                    !A?.[globalThis.__motionKey('Form')] ||
                    !RECORD ||
                    RECORD.id !== A[globalThis.__motionKey('ActionId')]
                ) {
                    return RESULT;
                }
                if (
                    STATE.actionId === null &&
                    A.phase === 'windup' &&
                    (CASE !== 'giant-card' || (UNIT.giantUntil > WORLD.time && DISPLAY.giantUntil > WORLD.time))
                ) {
                    STATE.actionId = RECORD.id;
                    trackedRecord = RECORD;
                    STATE.expected = RECORD.shots.map((shot) => shot.stage);
                    STATE.form = RECORD.form;
                    STATE.geometry = {
                        bossSpecies: WORLD.boss.species,
                        bossRadius: WORLD.boss.radius,
                        bossHeight: WORLD.boss.height,
                        unitRadius: UNIT.radius,
                        bodyScale: UNIT.bodyScale,
                        sourceTier: UNIT.tier,
                        surfaceGap: Math.hypot(UNIT.x - WORLD.boss.x, UNIT.y - WORLD.boss.y) - WORLD.boss.radius,
                        contactDistance: Math.hypot(RECORD.point.x - RECORD.origin.x, RECORD.point.y - RECORD.origin.y),
                        giantUntil: UNIT.giantUntil,
                        giantActive: UNIT.giantUntil > WORLD.time,
                        giantLevel: WORLD.tower.relics.get('giant') || 0,
                        giantCasts: WORLD.notices
                            .filter((notice) => notice.kind === 'formation-cast' && notice.skillId === 'giant')
                            .map((notice) => ({ ...notice })),
                    };
                    STATE.initialHp = WORLD.boss.hp;
                }
                if (STATE.actionId !== RECORD.id || STATE.ready || !STATE.request) {
                    return RESULT;
                }
                if (!STATE.capturePlan && RECORD.launchTick !== null) {
                    Object.assign(STATE, committedObservationPlan(RECORD));
                    STATE.committedLaunchTick = RECORD.launchTick;
                    STATE.committedDurationTicks = RECORD.durationSeconds * 20;
                }
                const BATON = PLAYER.getPartPose(globalThis.__motionSpec.part),
                    PLAN_INDEX = STATE.request.phase === 'sequence' ? STATE.request.index : -1,
                    REQUEST = PLAN_INDEX >= 0 ? STATE.capturePlan?.[PLAN_INDEX] : STATE.request;
                if (!REQUEST) {
                    return RESULT;
                }
                const MATCH =
                    A.phase === REQUEST.phase &&
                    (REQUEST.recoveryContact
                        ? A.elapsed === 0 && PLAYER.currentTimeMs === 0
                        : A.phase !== 'active' ||
                          (A[globalThis.__motionKey('Slot')] === REQUEST.slot &&
                              A[globalThis.__motionKey('StageProgress')] >=
                                  (REQUEST.moment === 'contact' ? 0.9 : 0.3)));
                if (MATCH) {
                    // One actual short-stage frame may already meet both thresholds.
                    // Record that fact instead of demanding a later duplicate frame.
                    const EARLY_CONTACT =
                            REQUEST.moment === 'early' &&
                            A.phase === 'active' &&
                            A[globalThis.__motionKey('StageProgress')] >= 0.9,
                        SLOT = REQUEST.slot ?? A[globalThis.__motionKey('Slot')],
                        SHOT_TICK = RECORD.shots[SLOT]?.tick || 0,
                        START_TICK = SLOT > 0 ? RECORD.shots[SLOT - 1].tick : 0,
                        COMMITTED_TICK = REQUEST.recoveryContact
                            ? RECORD.motionTick
                            : START_TICK + A[globalThis.__motionKey('StageProgress')] * (SHOT_TICK - START_TICK);
                    const SAMPLE = {
                        phase: A.phase,
                        moment: EARLY_CONTACT ? 'contact' : REQUEST.moment || A.phase,
                        sameFrameEarlyContact: EARLY_CONTACT,
                        planIndex: PLAN_INDEX + (EARLY_CONTACT ? 1 : 0),
                        recoveryContact: !!REQUEST.recoveryContact,
                        nativeTip: NATIVE_FRAMES.get(PLAYER).tip,
                        nativeGround: NATIVE_FRAMES.get(PLAYER).ground,
                        groundRoot: NATIVE_FRAMES.get(PLAYER).root,
                        footprint: NATIVE_FRAMES.get(PLAYER).footprint,
                        canvas: NATIVE_FRAMES.get(PLAYER).canvas,
                        drawScale: NATIVE_FRAMES.get(PLAYER).drawScale,
                        authoredScale: NATIVE_FRAMES.get(PLAYER).authoredScale,
                        minimumScale: NATIVE_FRAMES.get(PLAYER).minimumScale,
                        giantEndedAt: NATIVE_FRAMES.get(PLAYER).giantEndedAt,
                        displayPosition: NATIVE_FRAMES.get(PLAYER).displayPosition,
                        sourcePosition: { x: UNIT.x, y: UNIT.y },
                        authoritativeSlotTick: RECORD.launchTick + SHOT_TICK,
                        worldTick: WORLD.simulationTick,
                        bossRadius: WORLD.boss.radius,
                        unitRadius: UNIT.radius,
                        bodyScale: UNIT.bodyScale,
                        giantActive: UNIT.giantUntil > WORLD.time,
                        displayGiantActive: DISPLAY.giantUntil > WORLD.time,
                        nativeMatrix: NATIVE_FRAMES.get(PLAYER).matrix,
                        contactPoint: this.project(
                            A[globalThis.__motionKey('PointX')],
                            A[globalThis.__motionKey('PointY')],
                            0,
                        ),
                        committedTick: A.phase === 'active' || REQUEST.recoveryContact ? COMMITTED_TICK : null,
                        rawElapsedTick: A.elapsed * 20,
                        worldSlotTickDelta: WORLD.simulationTick - (RECORD.launchTick + SHOT_TICK),
                        shotDeltaMs: REQUEST.recoveryContact
                            ? (WORLD.simulationTick - RECORD.launchTick - SHOT_TICK) * 50
                            : A.phase === 'active'
                              ? (COMMITTED_TICK - SHOT_TICK) * 50
                              : null,
                        stage: REQUEST.recoveryContact ? REQUEST.stage : A[globalThis.__motionKey('Stage')],
                        slot: SLOT,
                        progress: A[globalThis.__motionKey('StageProgress')],
                        clip: PLAYER.currentClip,
                        time: PLAYER.currentTimeMs,
                        pose: { x: BATON.x, y: BATON.y, rotation: BATON.rotation },
                        batonVisible: BATON.visible,
                        recordId: RECORD.id,
                        displayId: A[globalThis.__motionKey('ActionId')],
                        point: [A[globalThis.__motionKey('PointX')], A[globalThis.__motionKey('PointY')]],
                        actualPoint: [RECORD.point.x, RECORD.point.y],
                    };
                    SAMPLE.socketDistancePixels = Math.hypot(
                        SAMPLE.nativeTip.x - SAMPLE.contactPoint.x,
                        SAMPLE.nativeTip.y - SAMPLE.contactPoint.y,
                    );
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
                    BUDMORI.runtime.pauseStartedAt = globalThis.__wheatInputClock;
                }
                return RESULT;
            };
        }
        const REQUEST = globalThis.requestAnimationFrame.bind(globalThis),
            CLOCK = { last: null, current: null, maxDelta: 0, bounded: true };
        globalThis.__wheatPreviewClock = CLOCK;
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
                    // Committed motionTick snapshots retain each endpoint for a
                    // 50ms interval. At HELP0.6, a25ms input advances at most15ms,
                    // preserving contact samples without slowing every frame5x.
                    const DELTA = globalThis.BUDMORI?.runtime?.paused
                        ? 0
                        : Math.min(CLOCK.bounded ? 25 : Infinity, Math.max(0, now - CLOCK.last));
                    CLOCK.current += DELTA;
                    CLOCK.maxDelta = Math.max(CLOCK.maxDelta, DELTA);
                }
                CLOCK.last = now;
                // The app publishes BUDMORI synchronously before its first RAF.
                // Hook before that first render, not after SVG readiness polling.
                if (globalThis.BUDMORI && !globalThis.__wheatMotion) {
                    installObserver();
                }
                callback(CLOCK.current);
            });
    }, SPEC);
    for (const CASE of CASES) {
        const TIER = CASE.tier,
            LABEL = CASE.id;
        activePreview = { frame: PAGE.mainFrame(), page: PAGE, tier: TIER };
        await PAGE.goto(`${ORIGIN}/index.html`);
        await PAGE.waitForFunction(() => globalThis.BUDMORI);
        await activate(PAGE.locator('#newGame'));
        if (await PAGE.locator('#newConfirm').isVisible()) {
            await activate(PAGE.locator('#confirmNew'));
        }
        await PAGE.waitForFunction(() => document.body.dataset.home === 'false');
        await activate(PAGE.locator('#upgradeMenu'));
        await activate(PAGE.locator(`[data-ability-species="${SPEC.species}"]`));
        await activate(PAGE.locator(`[data-${SPEC.key}-preview-tier="${TIER}"]`));
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
        REPORT.push({ kind: 'modal-preview-viewport', tier: TIER, ...VISIBLE });
        await previewWait(
            FRAME,
            PAGE,
            TIER,
            'initial-scene',
            () => globalThis.BUDMORI?.sim?.units[0]?.species === globalThis.__motionSpec.species,
        );
        const PREVIEW_URL = new URL(FRAME.url());
        PREVIEW_URL.searchParams.set(SPEC.key + '-case', LABEL);
        await FRAME.goto(PREVIEW_URL.href);
        // Install observation before asynchronous SVG players finish loading.
        await previewWait(
            FRAME,
            PAGE,
            TIER,
            'reloaded-scene',
            () => globalThis.BUDMORI?.sim?.units[0]?.species === globalThis.__motionSpec.species,
        );
        assert.equal(await FRAME.locator('#bossbar').evaluate((element) => getComputedStyle(element).display), 'none');

        let state;
        for (let capture = 0; ; capture++) {
            await previewWait(FRAME, PAGE, TIER, `capture-${capture}`, () => globalThis.__wheatMotion.ready);
            state = await FRAME.evaluate(() => structuredClone(globalThis.__wheatMotion));
            const SAMPLE = state.trace.at(-1);
            await PAGE.screenshot({
                path: path.join(
                    OUTPUT,
                    `${LABEL}-${SAMPLE.moment === 'contact' ? 'contact' : SAMPLE.phase}-${SAMPLE.slot}.png`,
                ),
            });
            assert.equal(await FRAME.evaluate(() => BUDMORI.sim.simulationTick), state.tick);
            if (SAMPLE.sameFrameEarlyContact || SAMPLE.recoveryContact) {
                // This is deliberately the same frozen native frame, not an
                // invented earlier pose or a second observed hit.
                await PAGE.screenshot({ path: path.join(OUTPUT, `${LABEL}-${SAMPLE.phase}-${SAMPLE.slot}.png`) });
            }
            if (SAMPLE.phase === 'recover') {
                break;
            }
            const NEXT = { phase: 'sequence', index: SAMPLE.planIndex + 1 };
            await FRAME.evaluate((request) => {
                const SESSION = BUDMORI.runtime,
                    DURATION = SESSION.pausedDurationMs + globalThis.__wheatInputClock - SESSION.pauseStartedAt;
                globalThis.__wheatMotion.request = request;
                globalThis.__wheatMotion.ready = false;
                SESSION.paused = false;
                SESSION.pausedDurationMs = DURATION;
                SESSION.loop.resetTiming();
            }, NEXT);
        }
        assert.ok(await FRAME.evaluate(() => BUDMORI.runtime.__wheatObservationClock.maxDelta <= 25));
        REPORT.push(state);
        assert.ok(
            state.installedAt.clock.current >= state.installedAt.initialCaptureClock,
            'first bounded input must not precede the session constructor capture',
        );
        assert.equal(state.form, TIER);
        assert.equal(state.fixture.case, LABEL);
        if (LABEL === 'small-boss' || LABEL === 'large-boss') {
            assert.equal(state.fixture.changedBoss, true);
            const RADII = state.fixture.bossRoster.map((boss) => boss.radius);
            assert.equal(state.geometry.bossRadius, LABEL === 'small-boss' ? Math.min(...RADII) : Math.max(...RADII));
            assert.equal(state.geometry.bossSpecies, state.fixture.selectedBoss.species);
        }
        if (LABEL === 'giant-card') {
            assert.equal(state.fixture.acquiredGiant, true);
            assert.equal(state.geometry.giantLevel, 1);
            assert.equal(state.geometry.giantActive, true);
            assert.ok(state.geometry.giantCasts.length > 0, 'actual combat charged and cast the acquired giant card');
            assert.ok(state.trace.every((sample) => sample.giantActive && sample.displayGiantActive));
        }
        assert.equal(state.units, 1);
        assert.equal(state.projectiles, 0);
        assert.ok(state.bossHp < state.initialHp);
        assert.deepEqual(
            state.hits.map((hit) => hit.slot),
            state.allShots.map((shot) => shot.slot),
        );
        assert.equal(new Set(state.hits.map((hit) => hit.sequence)).size, state.allShots.length);
        assert.deepEqual(
            state.allShots.map((shot) => shot.stage),
            state.expected,
        );
        assert.deepEqual(
            state.visible.flatMap((group) => group.slots),
            state.allShots.map((shot) => shot.slot),
        );
        assert.deepEqual(
            state.trace.filter((sample) => sample.moment === 'contact').map((sample) => sample.slot),
            state.visible.map((group) => group.slot),
            'each distinct committed hit tick has a native active or exact recovery contact',
        );
        assert.deepEqual(
            state.trace.filter((sample) => sample.moment === 'contact').map((sample) => sample.stage),
            state.visible.map((group) => group.stage),
        );
        assert.equal(
            new Set(state.trace.map((sample) => sample.recordId)).size,
            1,
            'windup, every slot and recovery belong to one action',
        );
        assert.deepEqual(
            state.trace
                .filter(
                    (sample) =>
                        sample.phase === 'active' && (sample.moment === 'early' || sample.sameFrameEarlyContact),
                )
                .map((sample) => sample.stage),
            state.visible.filter((group) => group.phase === 'active').map((group) => group.stage),
        );
        assert.equal(
            new Set(
                state.trace
                    .filter(
                        (sample) =>
                            sample.phase === 'active' && (sample.moment === 'early' || sample.sameFrameEarlyContact),
                    )
                    .map((sample) => JSON.stringify(sample.pose)),
            ).size,
            state.visible.filter((group) => group.phase === 'active').length,
            'each observable active stage has a distinct actual weapon pose',
        );
        for (const SAMPLE of state.trace) {
            const FOOT = SAMPLE.footprint,
                ROOT = SAMPLE.groundRoot;
            assert.ok(
                SAMPLE.authoredScale >= SAMPLE.minimumScale - 1e-9,
                'HELP envelope fit includes the actual giant/minimum pixel clamp',
            );
            assert.ok(
                ROOT.x - FOOT.radiusX - FOOT.stroke >= 0 && ROOT.x + FOOT.radiusX + FOOT.stroke <= SAMPLE.canvas.width,
                'whole foot ring remains inside the actual iframe width',
            );
            assert.ok(
                ROOT.y - FOOT.radiusY - FOOT.stroke >= 0 && ROOT.y + FOOT.radiusY + FOOT.stroke <= SAMPLE.canvas.height,
                'whole foot ring/shadow remains inside the actual iframe height',
            );
            assert.ok(
                SAMPLE.nativeTip.x >= 0 &&
                    SAMPLE.nativeTip.x <= SAMPLE.canvas.width &&
                    SAMPLE.nativeTip.y >= 0 &&
                    SAMPLE.nativeTip.y <= SAMPLE.canvas.height,
                'native weapon endpoint stays inside the actual iframe',
            );
            assert.ok(SAMPLE.batonVisible);
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
            if (SAMPLE.recoveryContact) {
                assert.equal(SAMPLE.phase, 'recover');
                assert.equal(SAMPLE.time, 0, 'final contact is the exact native first recovery pose');
                assert.equal(SAMPLE.committedTick, state.allShots.at(-1).tick);
                assert.ok(Math.abs(SAMPLE.worldSlotTickDelta) <= 1);
                assert.equal(SAMPLE.clip, `recover-${SPEC.key}-${state.allShots.at(-1).stage}`);
            }
            if (SAMPLE.phase === 'active') {
                assert.ok(Math.abs(SAMPLE.time - SAMPLE.progress * 1000) < 1e-5);
                assert.ok(SAMPLE.clip.startsWith(`fire-${SPEC.key}-`));
            }
        }
        // Interrupt the real action while paused, then resume the ordinary clock.
        await FRAME.evaluate(() => {
            const SESSION = BUDMORI.runtime,
                DURATION = SESSION.pausedDurationMs + globalThis.__wheatInputClock - SESSION.pauseStartedAt;
            const STATE = globalThis.__wheatMotion;
            STATE.request = null;
            STATE.ready = false;
            STATE.interruption = {
                startTick: BUDMORI.sim.simulationTick,
                startCapture: SESSION.presentationSequence,
                startClock: globalThis.__wheatInputClock,
                startRafClock: globalThis.__wheatPreviewClock.current,
            };
            // Narrow slot observation is complete. Keep the clock origin and
            // restore ordinary RAF deltas so five wall seconds do not mean only
            // ~100ms of simulation on a loaded runner. No tick/pose/reset bypass.
            globalThis.__wheatPreviewClock.bounded = false;
            BUDMORI.sim.units[0].ability.interrupt();
            BUDMORI.sim.units[0].stun = 0.5;
            SESSION.paused = false;
            SESSION.pausedDurationMs = DURATION;
            SESSION.loop.resetTiming();
        });
        await previewWait(
            FRAME,
            PAGE,
            TIER,
            'interruption',
            () => !!globalThis.__wheatMotion.interruption?.settled,
            5000,
        );
        REPORT.push({
            kind: 'interruption-settled',
            case: LABEL,
            ...(await FRAME.evaluate(() => structuredClone(globalThis.__wheatMotion.interruption))),
        });
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
        HELP_SCENE_BY_ID(globalThis.__motionSpec.key + '-t6').setup(WORLD);
        globalThis.__wheatMain = { id: null, hits: [], complete: false };
        WORLD.onNotice.on((notice) => {
            const STATE = globalThis.__wheatMain,
                UNIT = WORLD.units[0],
                RECORD = UNIT.ability.action?.[globalThis.__motionKey('Attack')];
            if (notice.kind !== 'boss-hit' || !RECORD || notice.attackId !== RECORD.id) {
                return;
            }
            if (!STATE.complete) {
                if (STATE.id === null && notice.strikeIndex === 0) {
                    STATE.id = RECORD.id;
                    STATE.firstTickSlots = RECORD.shots.filter((shot) => shot.tick === RECORD.shots[0].tick).length;
                    STATE.allShots = RECORD.shots.map((shot) => ({ ...shot }));
                }
                if (STATE.id !== RECORD.id) {
                    return;
                }
                STATE.hits.push(structuredClone(notice));
                if (STATE.hits.length === STATE.firstTickSlots || STATE.hits.length === 4) {
                    STATE.complete = STATE.hits.length === 4;
                    BUDMORI.runtime.paused = true;
                }
            }
        });
    });
    await PAGE.waitForFunction(
        () => globalThis.__wheatMain.hits.length === globalThis.__wheatMain.firstTickSlots && BUDMORI.runtime.paused,
    );
    const CHECKPOINT = await PAGE.evaluate(() => {
        globalThis.__wheatCheckpoint = { world: BUDMORI.sim, action: BUDMORI.sim.units[0].ability.action };
        return { tick: BUDMORI.sim.simulationTick, hp: BUDMORI.sim.boss.hp };
    });
    await PAGE.goBack();
    await PAGE.locator('#startScreen').waitFor({ state: 'visible' });
    assert.equal(await PAGE.evaluate(() => BUDMORI.sim.boss.hp), CHECKPOINT.hp);
    await (VIEWPORT === 'landscape' ? PAGE.locator('#continueGame').tap() : PAGE.locator('#continueGame').click());
    await PAGE.waitForFunction(() => globalThis.__wheatMain.complete && BUDMORI.runtime.paused);
    const CONTINUITY = await PAGE.evaluate(() => ({
        boundedClock: !!BUDMORI.runtime.__wheatObservationClock,
        sameWorld: BUDMORI.sim === globalThis.__wheatCheckpoint.world,
        sameAction: BUDMORI.sim.units[0].ability.action === globalThis.__wheatCheckpoint.action,
        hits: structuredClone(globalThis.__wheatMain.hits),
        allShots: structuredClone(globalThis.__wheatMain.allShots),
        firstTickSlots: globalThis.__wheatMain.firstTickSlots,
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
    console.log(`PASS ${SPEC.key} six-form actual native motion (${VIEWPORT})`);
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
