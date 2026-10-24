// Compact actual-source motion gate. No generated bundle, injected pose, manual
// simulation stepping. Preview observation bounds input deltas; main battle uses normal time.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { sourceGraph } from '../scripts/source-graph.mjs';
import { CHESTNUT_THORN_COLORS } from '../src/features/projectiles/spike/definition.js';
import { unitBodyDefinition } from '../src/features/unit-body/definition.js';
import {
    installChestnutMotionObserver,
    resumeChestnutMotionObservation,
    measureChestnutNativeContact,
} from './chestnut-motion-observer.mjs';

const VIEWPORT = process.argv[2] || 'desktop',
    SELECTION = process.argv[3] || 'all',
    ROOT = path.resolve(fileURLToPath(new URL('../', import.meta.url))),
    OUTPUT = path.join(ROOT, 'tests/output/chestnut-motion', VIEWPORT),
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
    REPORT = [{ kind: 'source-graph', graph: sourceGraph(ROOT) }];
assert.ok(['desktop', 'landscape'].includes(VIEWPORT));
assert.ok(['all', 'forms', 'boundaries'].includes(SELECTION));
const CASES = [
    ...(SELECTION === 'boundaries'
        ? []
        : [
              ...Array.from({ length: 6 }, (_value, index) => ({ id: `t${index + 1}`, tier: index + 1 })),
              { id: 'density', tier: 6 },
          ]),
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
    const REQUEST_PATH = decodeURIComponent(request.url.split('?')[0]),
        FILE = path.resolve(ROOT, '.' + (REQUEST_PATH === '/' ? '/index.html' : REQUEST_PATH));
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
                clock: globalThis.__chestnutPreviewClock,
                inputClock: globalThis.__chestnutInputClock,
                observer: globalThis.__chestnutMotion,
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
                    action: UNIT.ability.action?.chestnutAttack,
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
            isMobile: VIEWPORT === 'landscape',
            hasTouch: VIEWPORT === 'landscape',
            deviceScaleFactor: 1,
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
    await PAGE.addInitScript(installChestnutMotionObserver, {
        body: unitBodyDefinition(3).bounds,
        thornColors: CHESTNUT_THORN_COLORS,
    });
    for (const CASE of CASES) {
        const TIER = CASE.tier,
            LABEL = CASE.id;
        activePreview = { frame: PAGE.mainFrame(), page: PAGE, tier: TIER };
        const BOOT = await PAGE.goto(`${ORIGIN}/`);
        assert.equal(BOOT.status(), 200, 'root slash serves the authored HTML without a build');
        assert.match(BOOT.headers()['content-type'], /text\/html/);
        await PAGE.waitForFunction(() => globalThis.BUDMORI);
        await activate(PAGE.locator('#newGame'));
        if (await PAGE.locator('#newConfirm').isVisible()) {
            await activate(PAGE.locator('#confirmNew'));
        }
        await PAGE.waitForFunction(() => document.body.dataset.home === 'false');
        await activate(PAGE.locator('#upgradeMenu'));
        await activate(PAGE.locator('[data-ability-species="3"]'));
        const BEFORE = await PAGE.evaluate(() => JSON.stringify(BUDMORI.sim.playerProgression));
        await activate(PAGE.locator(`[data-chestnut-preview-tier="${TIER}"]`));
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
            'whole actual modal iframe is visible through its scroll pane',
        );
        REPORT.push({ kind: 'modal-preview-viewport', case: LABEL, ...VISIBLE });
        await previewWait(FRAME, PAGE, TIER, 'initial-scene', () => globalThis.BUDMORI?.sim?.units[0]?.species === 3);
        const URL = new globalThis.URL(FRAME.url());
        URL.searchParams.set('chestnut-case', LABEL);
        await FRAME.goto(URL.href);
        await previewWait(FRAME, PAGE, TIER, 'reloaded-scene', () => globalThis.BUDMORI?.sim?.units[0]?.species === 3);
        assert.equal(
            await FRAME.locator('#bossbar').evaluate((element) => getComputedStyle(element).display),
            'none',
            'preview HUD cannot cover the native actor',
        );
        let state;
        for (let capture = 0; ; capture++) {
            await previewWait(FRAME, PAGE, TIER, `capture-${capture}`, () => globalThis.__chestnutMotion.ready);
            state = await FRAME.evaluate(() => structuredClone(globalThis.__chestnutMotion));
            const SAMPLE = state.trace.at(-1);
            for (const MARKER of state.captures) {
                await PAGE.screenshot({ path: path.join(OUTPUT, `${LABEL}-${MARKER.label}.png`) });
            }
            assert.equal(
                await FRAME.evaluate(() => BUDMORI.sim.simulationTick),
                SAMPLE.tick,
                'PNG matches the actual paused model tick',
            );
            if (state.complete) {
                break;
            }
            await FRAME.evaluate(resumeChestnutMotionObservation);
        }
        REPORT.push(state);
        const LAST = state.trace.at(-1),
            RECORD = LAST.record,
            COUNT = [0, 1, 2, 1, 2, 2, 3][TIER] + RECORD.ranks.density;
        assert.ok(
            state.installedAt.clock.current >= state.installedAt.initialCaptureClock,
            'bounded clock starts after the raw session capture',
        );
        assert.ok(await FRAME.evaluate(() => globalThis.__chestnutPreviewClock.maxDelta <= 25));
        assert.equal(RECORD.version, 2);
        assert.deepEqual(
            state.foreignHits,
            [],
            'one basic action owns every chestnut hit, with no independent periodic stream',
        );
        assert.equal(RECORD.form, TIER);
        assert.equal(RECORD.ranks.density, LABEL === 'density' ? 5 : 0);
        assert.equal(Object.hasOwn(RECORD, 'periodic'), false, 'no independent periodic action');
        assert.equal(Object.hasOwn(RECORD.ranks, 'periodic'), false);
        assert.equal(RECORD.shots.length, COUNT);
        assert.equal(RECORD.nextShot, COUNT);
        assert.equal(LAST.units, 1, 'one real grounded body, no clones');
        assert.ok(LAST.hp < state.initialHp);
        assert.deepEqual(
            state.hits.map((hit) => hit.strikeIndex).sort((a, b) => a - b),
            Array.from({ length: COUNT }, (_value, slot) => slot),
        );
        assert.equal(new Set(state.hits.map((hit) => hit.sequence)).size, COUNT);
        assert.ok(state.hits.every((hit) => hit.attackKind === 'chestnut-spike' && hit.attackId === RECORD.id));
        assert.equal(Object.keys(state.projectiles).length, COUNT, 'every unified budget slot was rendered natively');
        assert.equal(
            new Set(state.trace.map((sample) => sample.record.id)).size,
            1,
            'windup, launch, every flight/contact, recovery share one action',
        );
        if (LABEL.endsWith('-boss')) {
            const RADII = state.fixture.bossRoster.map((boss) => boss.radius);
            assert.equal(state.geometry.bossRadius, LABEL === 'small-boss' ? Math.min(...RADII) : Math.max(...RADII));
            assert.equal(state.geometry.bossSpecies, state.fixture.selectedBoss.species);
        }
        if (LABEL === 'giant-card') {
            assert.equal(state.fixture.acquiredGiant, true);
            assert.equal(state.geometry.giantLevel, 1);
            assert.equal(state.geometry.giantActive, true);
            assert.ok(state.geometry.giantCasts.length > 0, 'real damage charged and cast the acquired giant card');
            assert.ok(state.trace.every((sample) => sample.body.giant));
        }
        const INSIDE = (box, canvas, label) => {
            assert.ok(Object.values(box).every(Number.isFinite), `${label} finite bounds`);
            assert.ok(
                box.left >= 0 && box.top >= 0 && box.right <= canvas.width && box.bottom <= canvas.height,
                `${LABEL} ${label} fits actual canvas: ${JSON.stringify({ box, canvas })}`,
            );
        };
        for (const SAMPLE of state.trace) {
            const BODY = SAMPLE.body;
            INSIDE(BODY.bounds, BODY.canvas, 'full native body');
            INSIDE(BODY.ring, BODY.canvas, 'complete ring/shadow');
            assert.ok(
                (BODY.torso.right - BODY.torso.left) / BODY.pixelRatio >= 32 &&
                    (BODY.torso.bottom - BODY.torso.top) / BODY.pixelRatio >= 32,
                'native torso remains readable',
            );
            assert.equal(BODY.position.z, 0);
            if (SAMPLE.record.launchTick !== null) {
                assert.equal(
                    SAMPLE.record.motionTick,
                    SAMPLE.tick - SAMPLE.record.launchTick,
                    'presentation follows committed motionTick, not actor phase elapsed',
                );
            }
            for (const P of SAMPLE.projectiles) {
                INSIDE(P.bounds, BODY.canvas, 'whole native spike and trail');
                assert.equal(P.actionId, RECORD.id);
                assert.equal(P.kind, 'chestnut-spike');
                assert.deepEqual(P.path.from, RECORD.origin);
                assert.deepEqual(P.path.to, RECORD.point);
                assert.ok(P.lines.length > 0, 'actual native spike lines observed');
                assert.ok(
                    P.origin.x >= BODY.bounds.left - 12 &&
                        P.origin.x <= BODY.bounds.right + 12 &&
                        P.origin.y >= BODY.bounds.top - 12 &&
                        P.origin.y <= BODY.bounds.bottom + 12,
                    'committed projectile origin meets native body',
                );
            }
        }
        for (const [SLOT, SHOT] of Object.entries(state.projectiles)) {
            assert.ok(SHOT.first.progress <= 0.25, `slot${SLOT} observed near actual emission, not only after travel`);
            assert.ok(SHOT.motion, `slot${SLOT} has actual middle-flight native motion`);
            assert.equal(SHOT.first.stage, RECORD.shots[Number(SLOT)].stage);
        }
        // A direct swept spike can collide before path progress .9. Retain its
        // last actual native draw and compare to the real swept impact point,
        // rather than inventing a nonexistent full-flight contact frame.
        for (const HIT of state.hits) {
            assert.ok(HIT.projectile && HIT.lastNative && HIT.nativeImpact);
            assert.equal(HIT.lastNative.actionId, HIT.attackId);
            assert.equal(HIT.nativeImpact.actionId, HIT.attackId);
            assert.equal(HIT.lastNative.slot, HIT.strikeIndex);
            assert.equal(HIT.nativeImpact.slot, HIT.strikeIndex);
            const CONTACT = measureChestnutNativeContact(HIT);
            assert.equal(CONTACT.renderFrame, CONTACT.nativeFrame, 'impact and native spike use the same camera frame');
            HIT.contact = CONTACT;
            assert.ok(
                CONTACT.spikeBodySegments > 0,
                'only actual shaft lines from this action/slot are contact candidates',
            );
            assert.ok(
                CONTACT.deltaTicks >= 0 && CONTACT.deltaTicks <= 1,
                'real impact follows this slot’s last native spike within one simulation tick',
            );
            assert.ok(
                CONTACT.nativeDistancePixels <= 12,
                `slot${HIT.strikeIndex} native spike-body centerline reaches actual swept contact within12px (not a tip-only claim): ${JSON.stringify(CONTACT)}`,
            );
        }
        assert.equal(
            await PAGE.evaluate(() => JSON.stringify(BUDMORI.sim.playerProgression)),
            BEFORE,
            'isolated preview never changes the farm build',
        );
        await FRAME.evaluate(resumeChestnutMotionObservation, true);
        await previewWait(
            FRAME,
            PAGE,
            TIER,
            'interruption',
            () => !!globalThis.__chestnutMotion.interruption?.settled,
            5000,
        );
        REPORT.push({
            kind: 'same-clock-interruption',
            case: LABEL,
            ...(await FRAME.evaluate(() => structuredClone(globalThis.__chestnutMotion.interruption))),
        });
        console.log(`PASS chestnut ${VIEWPORT}/${LABEL}: ${COUNT} unified slots, native body/launch/contact/recovery`);
    }
    activePreview = null;
    // Home/Continue deliberately uses an untouched normal clock, outside HELP.
    await PAGE.goto(`${ORIGIN}/`);
    await PAGE.waitForFunction(() => globalThis.BUDMORI);
    await activate(PAGE.locator('#newGame'));
    if (await PAGE.locator('#newConfirm').isVisible()) {
        await activate(PAGE.locator('#confirmNew'));
    }
    await PAGE.waitForFunction(() => document.body.dataset.home === 'false' && BUDMORI.sim.scene === 'farm');
    await PAGE.evaluate(async () => {
        const { helpSceneById: SCENE } = await import('./src/help-scenes.js'),
            WORLD = BUDMORI.sim;
        SCENE('chestnut-t6').setup(WORLD);
        globalThis.__chestnutMain = { id: null, hits: [], complete: false, checkpoint: false };
        WORLD.onNotice.on((notice) => {
            const STATE = globalThis.__chestnutMain,
                RECORD = WORLD.chestnutAttacks.find((entry) => entry.id === notice.attackId);
            if (notice.kind !== 'boss-hit' || !RECORD || STATE.complete) {
                return;
            }
            if (STATE.id === null) {
                STATE.id = RECORD.id;
                STATE.shots = structuredClone(RECORD.shots);
            }
            if (STATE.id !== RECORD.id) {
                return;
            }
            STATE.hits.push(structuredClone(notice));
            if (!STATE.checkpoint || STATE.hits.length === STATE.shots.length) {
                STATE.checkpoint = true;
                STATE.complete = STATE.hits.length === STATE.shots.length;
                BUDMORI.runtime.paused = true;
            }
        });
    });
    await PAGE.waitForFunction(() => globalThis.__chestnutMain.checkpoint && BUDMORI.runtime.paused);
    const CHECKPOINT = await PAGE.evaluate(() => {
        globalThis.__chestnutCheckpoint = { world: BUDMORI.sim, action: BUDMORI.sim.units[0].ability.action };
        return { tick: BUDMORI.sim.simulationTick, hp: BUDMORI.sim.boss.hp };
    });
    await PAGE.goBack();
    await PAGE.locator('#startScreen').waitFor({ state: 'visible' });
    assert.equal(await PAGE.evaluate(() => BUDMORI.sim.boss.hp), CHECKPOINT.hp);
    await activate(PAGE.locator('#continueGame'));
    await PAGE.waitForFunction(() => globalThis.__chestnutMain.complete && BUDMORI.runtime.paused);
    const CONTINUITY = await PAGE.evaluate(() => ({
        boundedClock: !!BUDMORI.runtime.__chestnutObservationClock,
        sameWorld: BUDMORI.sim === globalThis.__chestnutCheckpoint.world,
        sameAction: BUDMORI.sim.units[0].ability.action === globalThis.__chestnutCheckpoint.action,
        ...structuredClone(globalThis.__chestnutMain),
    }));
    assert.ok(CONTINUITY.sameWorld && CONTINUITY.sameAction);
    assert.equal(CONTINUITY.boundedClock, false);
    assert.deepEqual(
        CONTINUITY.hits.map((notice) => notice.strikeIndex).sort((a, b) => a - b),
        CONTINUITY.shots.map((shot) => shot.slot),
    );
    assert.equal(new Set(CONTINUITY.hits.map((notice) => notice.sequence)).size, CONTINUITY.shots.length);
    assert.ok(CONTINUITY.hits.every((notice) => notice.attackKind === 'chestnut-spike'));
    REPORT.push({ kind: 'normal-clock-home-continue', ...CONTINUITY });
    await PAGE.screenshot({ path: path.join(OUTPUT, 'normal-clock-home-continue.png') });
    assert.deepEqual(ERRORS, []);
    console.log(`PASS chestnut six-form unified motion (${VIEWPORT})`);
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
