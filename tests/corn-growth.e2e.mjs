// Returning player's fixed flow: inspect, invest, preview, reset, enter a run, and reload the farm.
// Fixtures supply an earned Lv50 save, not attack outcomes. All purchases use actual UI commands.
// Chromium SwiftShader plus pinned GameKit modules; touch emulation is not a physical-device claim.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const CASE = process.argv[2] || 'ui',
    VIEWPORT = process.argv[3] || 'desktop',
    VIEWPORT_SIZE =
        VIEWPORT === 'landscape'
            ? { width: 844, height: 390 }
            : VIEWPORT === 'mobile'
              ? { width: 390, height: 844 }
              : { width: 1100, height: 850 },
    STARTED = Date.now();
assert.ok(['ui', 'previews', 'battle'].includes(CASE), 'case must be ui, previews, or battle');
assert.ok(['desktop', 'mobile', 'landscape'].includes(VIEWPORT), 'viewport must be desktop, mobile, or landscape');
assert.ok(VIEWPORT !== 'landscape' || CASE === 'battle', 'landscape is the focused combat readability flow');
function progress(step) {
    console.log(`[corn ${CASE}/${VIEWPORT} +${((Date.now() - STARTED) / 1000).toFixed(1)}s] ${step}`);
}

const ROOT = fileURLToPath(new URL('../', import.meta.url)),
    OUTPUT = path.join(ROOT, 'tests/output/corn-growth'),
    TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' },
    REPORT = [],
    ERRORS = [];
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
async function openCorn(page, mobile) {
    await activate(page.locator('#upgradeMenu'), mobile);
    await activate(page.locator('#menuTabAbilities'), mobile);
    await activate(page.locator('[data-ability-species="1"]'), mobile);
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

async function preview(page, tier, mobile) {
    const BEFORE = await page.evaluate(() => JSON.stringify(BUDMORI.sim.playerProgression));
    await activate(page.locator(`[data-corn-preview-tier="${tier}"]`), mobile);
    const HANDLE = await page.locator('.corn-evolution-preview iframe').elementHandle(),
        FRAME = await HANDLE.contentFrame();
    const TRACE = [];
    let projectileId = null;
    for (let index = 0; index < 3; index++) {
        const MATCH = await FRAME.waitForFunction(
            ({ expected, fraction, id }) => {
                const SHOT = globalThis.BUDMORI?.sim?.projectiles?.find(
                    (shot) =>
                        shot.cornForm === expected &&
                        (id === null || shot.id === id) &&
                        shot.elapsed >= shot.path.duration * fraction &&
                        shot.elapsed < shot.path.duration,
                );
                if (!SHOT) {
                    return false;
                }
                BUDMORI.runtime.paused = true;
                return SHOT.id;
            },
            { expected: tier, fraction: [0.1, 0.4, 0.7][index], id: projectileId },
            { timeout: 18000, polling: 'raf' },
        );
        projectileId = await MATCH.jsonValue();
        await settleCapturedFrame(FRAME);
        TRACE.push(
            await FRAME.evaluate(() => ({
                tick: BUDMORI.sim.simulationTick,
                projectiles: BUDMORI.sim.projectiles.map((shot) => ({
                    id: shot.id,
                    form: shot.cornForm,
                    slot: shot.cornSlot,
                    x: shot.x,
                    y: shot.y,
                    z: shot.z,
                    elapsed: shot.elapsed,
                })),
            })),
        );
        await page
            .locator('.corn-evolution-preview iframe')
            .screenshot({ path: path.join(OUTPUT, `${VIEWPORT}-t${tier}-frame${index}.png`) });
        assert.equal(
            await FRAME.evaluate(() => BUDMORI.sim.simulationTick),
            TRACE[index].tick,
            'preview PNG and trace keep the same paused tick',
        );
        await resumeCapturedFrame(FRAME);
    }
    assert.ok(
        TRACE.some(
            (frame, index) => index > 0 && JSON.stringify(frame.projectiles) !== JSON.stringify(TRACE[0].projectiles),
        ),
        `T${tier} actual projectiles progress between captures`,
    );
    assert.equal(
        await page.evaluate(() => JSON.stringify(BUDMORI.sim.playerProgression)),
        BEFORE,
        'isolated preview does not alter investment or XP',
    );
    assert.equal(await page.locator('.corn-evolution-preview iframe').count(), 1, 'one isolated preview at a time');
    REPORT.push({ viewport: VIEWPORT, viewportSize: VIEWPORT_SIZE, tier, trace: TRACE });
}

async function assertCombatFraming(page) {
    const GEOMETRY = await page.evaluate(() => {
        const RENDERER = BUDMORI.renderer,
            CORN = BUDMORI.sim.projectiles
                .filter((shot) => shot.cornForm >= 3)
                .map((shot) => {
                    const SIZE = shot.cornForm >= 5 ? 3.8 : shot.cornForm === 4 ? 2.8 : 1.6,
                        PATH = shot.path,
                        SIDE = SIZE * 0.9 + 0.5,
                        TOP = RENDERER.project(
                            0,
                            Math.max(PATH.from.y, PATH.to.y),
                            Math.max(PATH.from.z, 0) + PATH.height + SIZE * 2.1,
                        );
                    return {
                        id: shot.id,
                        left: RENDERER.project(Math.min(PATH.from.x, PATH.to.x) - SIDE, 0, 0).x,
                        right: RENDERER.project(Math.max(PATH.from.x, PATH.to.x) + SIDE, 0, 0).x,
                        top: TOP.y,
                    };
                }),
            HUD = ['bossbar', 'allyHealthText', 'bossName', 'bossHealthText', 'bossHealthNote', 'fightRetreat'].map(
                (id) => {
                    const ELEMENT = document.getElementById(id),
                        BOX = ELEMENT.getBoundingClientRect(),
                        RANGE = document.createRange();
                    RANGE.selectNodeContents(ELEMENT);
                    const TEXT = RANGE.getBoundingClientRect();
                    return {
                        id,
                        left: Math.min(BOX.left, TEXT.width ? TEXT.left : BOX.left),
                        right: Math.max(BOX.right, TEXT.right),
                        top: BOX.top,
                        bottom: BOX.bottom,
                    };
                },
            );
        return {
            width: innerWidth,
            height: innerHeight,
            canvasWidth: RENDERER.canvas.width,
            corn: CORN,
            hud: HUD,
            zoom: RENDERER.zoom,
            scale: RENDERER.scale,
            pan: RENDERER.cameraPan,
            bounds: RENDERER.hallEffectBounds,
        };
    });
    assert.ok(
        [GEOMETRY.zoom, GEOMETRY.scale].every(Number.isFinite) &&
            (!GEOMETRY.corn.length || Object.values(GEOMETRY.bounds).every(Number.isFinite)),
        `finite accumulated camera bounds: ${JSON.stringify(GEOMETRY.bounds)}`,
    );
    for (const CORN of GEOMETRY.corn) {
        assert.ok(
            [CORN.top, CORN.left, CORN.right].every(Number.isFinite),
            `finite projected projectile bounds: ${JSON.stringify(CORN)}`,
        );
        assert.ok(
            CORN.top >= -1 && CORN.left >= -1 && CORN.right <= GEOMETRY.canvasWidth + 1,
            `full projectile path, cob and tail fit: ${JSON.stringify({ corn: CORN, camera: GEOMETRY })}`,
        );
    }
    if (VIEWPORT === 'landscape') {
        for (const ITEM of GEOMETRY.hud) {
            assert.ok(
                ITEM.left >= -1 &&
                    ITEM.right <= GEOMETRY.width + 1 &&
                    ITEM.top >= -1 &&
                    ITEM.bottom <= GEOMETRY.height + 1,
                `landscape HUD text and control fit: ${JSON.stringify(ITEM)}`,
            );
        }
    }
    return GEOMETRY;
}

async function captureMainCombat(page, tier, mobile) {
    // The main play session, not an iframe: reload gives each fixture a clean farm boundary.
    // Runtime targeting and ability.begin/update launch shots; no target/path is injected.
    await page.reload();
    await page.waitForFunction(() => globalThis.BUDMORI?.sim?.scene === 'farm');
    if (await page.locator('#gameMenuPanel').isVisible()) {
        await activate(page.locator('#gameMenuClose'), mobile);
    }
    await page.evaluate(async (selectedTier) => {
        const { helpSceneById: HELP_SCENE_BY_ID } = await import('./src/ui/help-scenes.js');
        const WORLD = BUDMORI.sim;
        HELP_SCENE_BY_ID(`corn-t${selectedTier}`).setup(WORLD);
        // One fixed giant across tiers/viewports makes silhouette and camera comparisons meaningful.
        WORLD.boss.controller.configureStage(1, 6);
        Object.assign(WORLD.boss, { z: 0, hp: 1e7, maxHp: 1e7, stun: 60 });
        WORLD.units[0].x = -(WORLD.boss.radius + 4.1 + (selectedTier - 1) * 0.12);
        WORLD._unitSpatialDirty = true;
    }, tier);
    const TRACE = [];
    for (const STAGE of ['flight', 'impact', 'explosion']) {
        await page.waitForFunction(
            ({ tier: expected, stage }) => {
                const WORLD = BUDMORI.sim;
                const READY =
                    stage === 'flight'
                        ? WORLD.projectiles.some(
                              (shot) =>
                                  shot.cornForm === expected &&
                                  shot.elapsed >= shot.path.duration * 0.1 &&
                                  shot.elapsed < shot.path.duration * 0.6,
                          )
                        : WORLD.cornAttachments.groups.some((group) =>
                              group.attachments.some((attachment) =>
                                  stage === 'explosion'
                                      ? attachment.status === 'fading'
                                      : attachment.status !== 'fading',
                              ),
                          );
                if (READY) {
                    BUDMORI.runtime.paused = true;
                }
                return READY;
            },
            { tier, stage: STAGE },
            { timeout: 15000, polling: 'raf' },
        );
        await settleCapturedFrame(page);
        if (STAGE === 'flight' && tier >= 5) {
            assert.ok(
                await page.evaluate(() =>
                    BUDMORI.sim.projectiles.every((shot) => shot.path.from.z > BUDMORI.sim.boss.height + 4),
                ),
                'meteor paths start clearly above the actual giant body',
            );
            if (tier === 6) {
                assert.equal(
                    await page.evaluate(() => new Set(BUDMORI.sim.projectiles.map((shot) => shot.path.from.x)).size),
                    3,
                    'three distinct sky launch positions',
                );
            }
        }
        TRACE.push(
            await page.evaluate(
                (stage) => ({
                    stage,
                    tick: BUDMORI.sim.simulationTick,
                    time: BUDMORI.sim.time,
                    boss: {
                        x: BUDMORI.sim.boss.x,
                        y: BUDMORI.sim.boss.y,
                        radius: BUDMORI.sim.boss.radius,
                        height: BUDMORI.sim.boss.height,
                        species: BUDMORI.sim.boss.species,
                        hp: BUDMORI.sim.boss.hp,
                    },
                    projectiles: BUDMORI.sim.projectiles.map((shot) => ({
                        id: shot.id,
                        form: shot.cornForm,
                        slot: shot.cornSlot,
                        x: shot.x,
                        y: shot.y,
                        z: shot.z,
                        elapsed: shot.elapsed,
                    })),
                    attachments: BUDMORI.sim.cornAttachments.groups.map((group) => ({
                        id: group.id,
                        action: group.cornActionId,
                        firstAttachTick: group.firstAttachTick,
                        attachments: group.attachments.map((attachment) => ({
                            id: attachment.id,
                            status: attachment.status,
                        })),
                    })),
                }),
                STAGE,
            ),
        );
        TRACE.at(-1).framing = await assertCombatFraming(page);
        if (STAGE === 'flight' && tier === 6) {
            const MANUAL = await page.evaluate(async () => {
                const R = BUDMORI.renderer,
                    { snapshot: SNAPSHOT } = await import('./src/model/farm-state.js'),
                    BEFORE = JSON.stringify(SNAPSHOT(BUDMORI.sim)),
                    DISPLAY = R.cameraWorld;
                R.takeCameraControl();
                R.zoomAt(1.6);
                R.panByScreen(35, 20);
                const EXPECTED = { zoom: R.zoom, pan: R.cameraPan };
                R.render(DISPLAY, null, DISPLAY.displayTimeMs);
                const AFTER = { zoom: R.zoom, pan: R.cameraPan };
                R.resetZoom();
                R.render(DISPLAY, null, DISPLAY.displayTimeMs);
                return {
                    expected: EXPECTED,
                    after: AFTER,
                    unchanged: BEFORE === JSON.stringify(SNAPSHOT(BUDMORI.sim)),
                };
            });
            assert.deepEqual(MANUAL.after, MANUAL.expected, 'manual framing stays fixed during meteor flight');
            assert.ok(MANUAL.unchanged, 'camera and reset preserve the complete paused world');
            TRACE.at(-1).resetFraming = await assertCombatFraming(page);
        }
        await page.screenshot({
            path: path.join(OUTPUT, `${VIEWPORT}-main-t${tier}-${STAGE}.png`),
        });
        assert.equal(
            await page.evaluate(() => BUDMORI.sim.simulationTick),
            TRACE.at(-1).tick,
            'main battle PNG and trace keep the same paused tick',
        );
        await resumeCapturedFrame(page);
    }
    assert.ok(
        TRACE[1].tick > TRACE[0].tick && TRACE[2].tick > TRACE[1].tick,
        'main battle advances from flight through collision into the fuse explosion',
    );
    assert.ok(TRACE[2].boss.hp < TRACE[0].boss.hp, 'the actual battle damages its target');
    REPORT.push({ kind: 'main-farm-combat', viewport: VIEWPORT, viewportSize: VIEWPORT_SIZE, tier, trace: TRACE });
}

async function captureCrowdedCombat(page, mobile) {
    await page.reload();
    await page.waitForFunction(() => globalThis.BUDMORI?.sim?.scene === 'farm');
    if (await page.locator('#gameMenuPanel').isVisible()) {
        await activate(page.locator('#gameMenuClose'), mobile);
    }
    const INITIAL = await page.evaluate(async () => {
        const { helpSceneById: HELP_SCENE_BY_ID } = await import('./src/ui/help-scenes.js'),
            { overallXpForLevel: XP_FOR_LEVEL } = await import('./src/model/player-progression.js');
        const WORLD = BUDMORI.sim;
        WORLD.playerProgression.overallXp = XP_FOR_LEVEL(41);
        HELP_SCENE_BY_ID('corn-t6').setup(WORLD);
        const LIMIT = WORLD.frontlineLimit;
        WORLD.boss.controller.configureStage(1, 6);
        Object.assign(WORLD.boss, { z: 0, hp: 1e10, maxHp: 1e10, stun: 0 });
        for (let index = 1; index < LIMIT; index++) {
            const SPECIES = index < 60 ? 1 : [0, 2, 3, 4, 5, 6, 7, 8][(index - 60) % 8],
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
        return { limit: LIMIT, count: WORLD.units.filter((unit) => !unit.isBattleOnlySummon).length };
    });
    assert.equal(INITIAL.limit, 500, 'fixture follows the actual maximum frontline');
    assert.equal(INITIAL.count, INITIAL.limit, 'maximum mixed army really spawned');
    let overlap = true;
    try {
        await page.waitForFunction(
            () => {
                const WORLD = BUDMORI.sim,
                    READY =
                        WORLD.boss.patternRuntime?.active?.phase === 'windup' &&
                        WORLD.boss.patternRuntime?.active &&
                        WORLD.projectiles.some((shot) => shot.cornForm >= 5);
                if (READY) {
                    BUDMORI.runtime.paused = true;
                }
                return !!READY;
            },
            null,
            { timeout: 20000, polling: 'raf' },
        );
    } catch (error) {
        if (error.name !== 'TimeoutError') {
            throw error;
        }
        overlap = false;
        await page.evaluate(() => {
            BUDMORI.runtime.paused = true;
        });
    }
    await settleCapturedFrame(page);
    const STATE = await page.evaluate(() => ({
        tick: BUDMORI.sim.simulationTick,
        units: BUDMORI.sim.units.length,
        living: BUDMORI.sim.units.filter((unit) => unit.hp > 0).length,
        phase: BUDMORI.sim.boss.patternRuntime?.active?.phase || 'idle',
        pattern: BUDMORI.sim.boss.patternRuntime?.active?.id || null,
        projectileCount: BUDMORI.sim.projectiles.length,
        meteorCount: BUDMORI.sim.projectiles.filter((shot) => shot.cornForm >= 5).length,
        renderDiagnostics: BUDMORI.presentationDiagnostics,
    }));
    STATE.framing = await assertCombatFraming(page);
    await page.screenshot({
        path: path.join(OUTPUT, `${VIEWPORT}-main-crowded-${overlap ? 'windup-meteors' : 'no-overlap'}.png`),
    });
    assert.equal(await page.evaluate(() => BUDMORI.sim.simulationTick), STATE.tick);
    REPORT.push({
        kind: 'maximum-mixed-combat',
        viewport: VIEWPORT,
        viewportSize: VIEWPORT_SIZE,
        initial: INITIAL,
        overlap,
        state: STATE,
    });
    progress(
        overlap
            ? '500 mixed army: real boss windup and meteors captured'
            : '500 mixed army: no windup/meteor overlap observed within 20s; current state captured',
    );
    await resumeCapturedFrame(page);
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
        if (CASE === 'battle') {
            for (const TIER of [1, 5, 6]) {
                progress(`main battle T${TIER} start`);
                await captureMainCombat(PAGE, TIER, MOBILE);
                progress(`main battle T${TIER} flight/impact/explosion captured`);
            }
            await captureCrowdedCombat(PAGE, MOBILE);
            assert.deepEqual(ERRORS, []);
            progress('PASS main battle capture flow');
            await CONTEXT.close();
            continue;
        }
        await openCorn(PAGE, MOBILE);
        progress('corn tree open');
        if (CASE === 'previews') {
            for (const TIER of MOBILE ? [1, 5, 6] : [1, 2, 3, 4, 5, 6]) {
                progress(`isolated preview T${TIER} start`);
                await preview(PAGE, TIER, MOBILE);
                progress(`isolated preview T${TIER} captured`);
            }
            await activate(PAGE.locator('[data-ability-species="0"]'), MOBILE);
            assert.equal(
                await PAGE.locator('.corn-evolution-preview iframe').count(),
                0,
                'tab change disposes preview',
            );
            assert.deepEqual(ERRORS, []);
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
                CORN = WORLD.playerProgression.abilities['corn-kernel-chain'];
            CORN.masteryLevel = 50;
            CORN.masteryXp = 125;
            WORLD.spawn(1, 6, 1, 0);
            WORLD.markProgressChanged();
            BUDMORI.storage.save(WORLD);
        });
        await activate(PAGE.locator('[data-ability-species="5"]'), MOBILE);
        assert.equal(await PAGE.locator('[data-growth-tree]').count(), 0, 'unreleased species keeps its legacy tree');
        await activate(PAGE.locator('[data-ability-species="1"]'), MOBILE);
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
            await PAGE.locator('#abilityNodes').evaluate((element) => {
                element.scrollTop = 0;
            });
            const CDP = await CONTEXT.newCDPSession(PAGE),
                BOX = await PAGE.locator('#abilityNodes').boundingBox(),
                X = BOX.x + BOX.width * 0.7,
                Y = Math.min(BOX.y + BOX.height - 30, 760);
            await CDP.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: X, y: Y }] });
            for (const DELTA of [30, 80, 140, 210]) {
                await CDP.send('Input.dispatchTouchEvent', {
                    type: 'touchMove',
                    touchPoints: [{ x: X, y: Y - DELTA }],
                });
            }
            await CDP.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
            await PAGE.waitForTimeout(150);
            assert.ok(
                await PAGE.locator('#abilityNodes').evaluate((element) => element.scrollTop > 0),
                'actual touch scroll',
            );
            assert.ok(
                await PAGE.locator('#abilityNodes').evaluate((element) => element.scrollWidth <= element.clientWidth),
                'no horizontal overflow at 390px',
            );
        }
        await PAGE.locator('[data-growth-wallet]').scrollIntoViewIfNeeded();
        await PAGE.screenshot({ path: path.join(OUTPUT, `${VIEWPORT}-tree.png`) });
        progress('Lv50 evolution/specialty purchases and scrolling verified');
        await activate(PAGE.locator('[data-ability-species="0"]'), MOBILE);
        assert.equal(await PAGE.locator('.corn-evolution-preview iframe').count(), 0, 'tab change disposes preview');
        await activate(PAGE.locator('[data-ability-species="1"]'), MOBILE);
        await activate(PAGE.locator('#gameMenuClose'), MOBILE);
        await PAGE.reload();
        await PAGE.waitForFunction(() => globalThis.BUDMORI?.sim?.scene === 'farm');
        if (await PAGE.locator('#abilityPanel').isHidden()) {
            await openCorn(PAGE, MOBILE);
        } else {
            await activate(PAGE.locator('[data-ability-species="1"]'), MOBILE);
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
                globalThis.__cornRunBeforeHome = {
                    world: BUDMORI.sim,
                    snapshot: JSON.stringify(BUDMORI.sim.runProgressionSnapshot),
                    phase: BUDMORI.sim.farmBossEvent.phase,
                };
                location.hash = '#/';
            });
            await PAGE.locator('#startScreen').waitFor({ state: 'visible' });
            await activate(PAGE.locator('#continueGame'), MOBILE);
            assert.equal(
                await PAGE.evaluate(() => BUDMORI.sim === globalThis.__cornRunBeforeHome.world),
                true,
                `${PHASE} Home→Continue keeps the live memory run`,
            );
            assert.equal(
                await PAGE.evaluate(
                    () =>
                        JSON.stringify(BUDMORI.sim.runProgressionSnapshot) === globalThis.__cornRunBeforeHome.snapshot,
                ),
                true,
                'Home→Continue keeps the initial investment snapshot',
            );
            assert.equal(await PAGE.evaluate(() => BUDMORI.sim.tower.active), true);
        }
        await openCorn(PAGE, MOBILE);
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
            `PASS corn growth ${MOBILE ? 'mobile touch 390px' : 'desktop'}: locked Lv1, purchases, research, scroll, reset, save/reload, live-run lock`,
        );
        await CONTEXT.close();
    }
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
