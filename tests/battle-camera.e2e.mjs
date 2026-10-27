// User flow: enter a populated tower, inspect it with native pointer/touch input,
// use command/menu UI, and return to the unchanged outdoor farm.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = fileURLToPath(new URL('../', import.meta.url)),
    KIND = process.argv[2] || 'desktop',
    SIZES = {
        desktop: { width: 1280, height: 800 },
        portrait: { width: 390, height: 844 },
        landscape: { width: 844, height: 390 },
    },
    SIZE = SIZES[KIND],
    OUTPUT = path.join(ROOT, 'tests/output/battle-camera', KIND),
    MANIFEST = JSON.parse(
        fs
            .readFileSync(path.join(ROOT, 'index.html'), 'utf8')
            .match(/<script id="bloom-runtime-manifest" type="application\/json">(.*?)<\/script>/s)[1],
    ),
    MODULES = new Map(),
    ERRORS = [],
    REPORT = {
        status: 'running',
        viewport: KIND,
        captures: [],
        checks: [],
        render: 'Chrome/Chromium SwiftShader; not physical mobile FPS',
    },
    TYPES = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.svg': 'image/svg+xml',
        '.json': 'application/json',
    };
assert.ok(SIZE, 'desktop, portrait or landscape');
fs.mkdirSync(OUTPUT, { recursive: true });
const DEADLINE = setTimeout(() => {
    console.error('Camera flow exceeded 180 seconds');
    process.exit(1);
}, 180000);
const SERVER = http.createServer((req, res) => {
    const URL_LOCAL = new URL(req.url, 'http://localhost');
    const FILE = path.resolve(
        ROOT,
        '.' +
            (new URL(req.url, 'http://localhost').pathname === '/'
                ? '/index.html'
                : new URL(req.url, 'http://localhost').pathname),
    );
    if (!FILE.startsWith(ROOT) || !fs.existsSync(FILE) || !fs.statSync(FILE).isFile()) {
        res.writeHead(req.url === '/favicon.ico' ? 204 : 404).end();
        return;
    }
    res.setHeader('content-type', TYPES[path.extname(FILE)] || 'application/octet-stream');
    let bytes = fs.readFileSync(FILE);
    if (URL_LOCAL.searchParams.has('unculled-test') && FILE === path.resolve(ROOT, 'src/render/farm-renderer.js')) {
        // Reference only the visibility decision; keep native players and every
        // draw implementation identical to the frame under test.
        const IMPORT = "import { unitCullingEnabled, unitMayBeVisible } from './farm-render-visibility.js';",
            SOURCE = bytes.toString('utf8');
        assert.equal(SOURCE.split(IMPORT).length, 2);
        bytes = Buffer.from(
            SOURCE.replace(IMPORT, 'const unitCullingEnabled = () => false, unitMayBeVisible = () => true;'),
        );
    }
    res.end(bytes);
});
let browser;
let page;
async function camera(x = SIZE.width / 2, y = SIZE.height / 2) {
    return page.evaluate(
        ({ x, y }) => {
            const R = BUDMORI.renderer;
            return {
                zoom: R.zoom,
                pan: R.cameraPan,
                anchor: R.screenToWorld(x, y),
                limits: R.panLimits,
                manual: R.manualCamera,
            };
        },
        { x, y },
    );
}
function near(a, b, message) {
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 0.02, message + ': ' + JSON.stringify({ a, b }));
}
async function state() {
    return page.evaluate(async () => {
        const { snapshot: SNAPSHOT } = await import('./src/model/farm-state.js');
        return JSON.stringify(SNAPSHOT(BUDMORI.sim));
    });
}
async function freeze() {
    await page.evaluate(() => {
        BUDMORI.runtime.paused = true;
    });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 60000));
    await page.evaluate(() => {
        BUDMORI.runtime.paused = false;
        BUDMORI.runtime.loop.resetTiming();
    });
    await page.clock.runFor(20);
}
async function resume() {
    await page.clock.resume();
    await page.evaluate(() => {
        BUDMORI.runtime.loop.resetTiming();
    });
}
async function gestureOrigin() {
    return page.evaluate(() => {
        for (const Y of [0.45, 0.25, 0.15]) {
            for (const X of [0.4, 0.2, 0.1]) {
                const POINT = { x: Math.round(innerWidth * X), y: Math.round(innerHeight * Y) };
                if (
                    [
                        [0, 0],
                        [110, 20],
                        [60, -20],
                    ].every(([dx, dy]) => document.elementFromPoint(POINT.x + dx, POINT.y + dy)?.id === 'world')
                ) {
                    return POINT;
                }
            }
        }
        throw new Error('No unobstructed canvas gesture origin');
    });
}
async function gestureFlow(initial) {
    const { x: CX, y: CY } = await gestureOrigin();
    if (KIND === 'desktop') {
        const ANCHOR = (await camera(CX, CY)).anchor;
        await page.mouse.move(CX, CY);
        await page.mouse.wheel(0, -250);
        await page.waitForFunction((zoom) => BUDMORI.renderer.zoom !== zoom, initial.zoom);
        near((await camera(CX, CY)).anchor, ANCHOR, 'wheel preserves cursor world point');
        const PRE_PAN = (await camera(CX, CY)).anchor;
        await page.mouse.down();
        await page.mouse.move(CX + 70, CY + 35, { steps: 6 });
        await page.mouse.up();
        near((await camera(CX + 70, CY + 35)).anchor, PRE_PAN, 'drag follows grabbed ground');
        REPORT.checks.push('native mouse drag + cursor-anchored wheel');
    } else {
        const CDP = await page.context().newCDPSession(page),
            TOUCH = async (type, points) => {
                await CDP.send('Input.dispatchTouchEvent', {
                    type,
                    touchPoints: points.map(([id, x, y]) => ({ id, x, y, radiusX: 1, radiusY: 1, force: 1 })),
                });
                // Native input is coalesced on the real compositor clock, independently
                // of the frozen JavaScript clock used to compare identical world ticks.
                await new Promise((resolve) => setTimeout(resolve, 100));
            };
        const ANCHOR = (await camera(CX, CY)).anchor;
        await TOUCH('touchStart', [[1, CX, CY]]);
        await TOUCH('touchMove', [[1, CX + 30, CY + 20]]);
        near((await camera(CX + 30, CY + 20)).anchor, ANCHOR, 'one finger pan');
        await TOUCH('touchStart', [
            [1, CX + 30, CY + 20],
            [2, CX + 110, CY + 20],
        ]);
        const MID = (await camera(CX + 70, CY + 20)).anchor;
        await TOUCH('touchMove', [
            [1, CX + 10, CY + 40],
            [2, CX + 150, CY + 40],
        ]);
        near((await camera(CX + 80, CY + 40)).anchor, MID, 'pinch anchors old midpoint at moved midpoint');
        const PINCHED = await camera();
        await TOUCH('touchMove', [
            [1, CX + 20, CY + 50],
            [2, CX + 160, CY + 50],
        ]);
        assert.ok(
            Math.abs((await camera()).zoom - PINCHED.zoom) < 1e-8,
            'constant-distance two finger drag keeps zoom',
        );
        await TOUCH('touchStart', [
            [1, CX + 20, CY + 50],
            [2, CX + 160, CY + 50],
            [3, CX + 60, CY - 20],
        ]);
        const THREE = await camera();
        await TOUCH('touchEnd', [[1, CX + 20, CY + 50]]);
        assert.deepEqual(await camera(), THREE, 'three-to-two rebase has no jump');
        await TOUCH('touchEnd', [[2, CX + 160, CY + 50]]);
        const ONE = (await camera(CX + 60, CY - 20)).anchor;
        await TOUCH('touchMove', [[3, CX + 80, CY - 10]]);
        near((await camera(CX + 80, CY - 10)).anchor, ONE, 'two-to-one continues panning');
        await TOUCH('touchCancel', []);
        const CANCELLED = await camera();
        await TOUCH('touchStart', [[4, CX, CY]]);
        await TOUCH('touchEnd', []);
        assert.deepEqual(await camera(), CANCELLED, 'cancel and fresh tap cannot jump');
        REPORT.checks.push('native CDP touch 1/2/3 transitions, midpoint pinch, two-finger pan and touchCancel');
    }
}
async function capture(name) {
    const DRAW = await page.evaluate(async () => {
        const { bossVectorScale: BOSS_SCALE } = await import('./src/vector-sockets.js'),
            { Diorama: UNCULLED } = await import('./src/render/farm-renderer.js?unculled-test'),
            { snapshot: SNAPSHOT } = await import('./src/model/farm-state.js'),
            R = BUDMORI.renderer,
            DISPLAY = R.cameraWorld,
            BEFORE = JSON.stringify(SNAPSHOT(BUDMORI.sim)),
            NATIVE = R.unitPresentation.drawVectorUnit,
            DIRECT = R.directCamera,
            READ = () => {
                const GL = R.device.gl,
                    PIXELS = new Uint8Array(GL.drawingBufferWidth * GL.drawingBufferHeight * 4);
                GL.readPixels(0, 0, GL.drawingBufferWidth, GL.drawingBufferHeight, GL.RGBA, GL.UNSIGNED_BYTE, PIXELS);
                return PIXELS;
            },
            CAMERA = () =>
                JSON.stringify({ zoom: R.zoom, pan: R.cameraPan, scale: R.scale, offset: R.offset, view: R.view }),
            COUNT_DIFFERENT_PIXELS = (a, b) => {
                let count = 0;
                for (let i = 0; i < a.length; i += 4) {
                    if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2] || a[i + 3] !== b[i + 3]) {
                        count++;
                    }
                }
                return count;
            };
        let nativeIds = [];
        let renderEvidence;
        R.unitPresentation.drawVectorUnit = function (unit, ...args) {
            // hidden=true observes clip transitions without native art submission.
            if (!args[4]) {
                nativeIds.push(unit.id);
            }
            return NATIVE.call(this, unit, ...args);
        };
        try {
            R.render(DISPLAY, null, DISPLAY.displayTimeMs);
            const PIXELS = READ(),
                ACTUAL_IDS = [...nativeIds].sort((a, b) => a - b),
                HIDDEN = R.scenePresentation.hiddenUnitIds(DISPLAY),
                VISIBLE_IDS = (R.unitCullingActive === false ? DISPLAY.units : R.visibleUnits)
                    .filter((unit) => !HIDDEN.has(unit.id))
                    .map((unit) => unit.id)
                    .sort((a, b) => a - b),
                CAMERA_BEFORE = CAMERA(),
                CLOCKS = [...R.vectorPlayers].map(([id, player]) => ({
                    id,
                    player,
                    clip: player.currentClip,
                    time: player.currentTimeMs,
                }));
            R.directCamera = () => {};
            nativeIds = [];
            UNCULLED.prototype.render.call(R, DISPLAY, null, DISPLAY.displayTimeMs);
            const UNCULLED_PIXELS = READ(),
                UNCULLED_DRAWS = nativeIds.length;
            // Prove that shots meant to show troops contain actual native body
            // pixels, not merely terrain/shadows or dispatched empty actors.
            R.unitPresentation.drawVectorUnit = () => true;
            R.render(DISPLAY, null, DISPLAY.displayTimeMs);
            const WITHOUT_BODIES = READ();
            R.unitPresentation.drawVectorUnit = NATIVE;
            R.render(DISPLAY, null, DISPLAY.displayTimeMs);
            const RESTORED = READ();
            // The reference deliberately seeks hidden players. Restore their
            // prior sampled time; clip start clocks are never reset by the test.
            for (const CLOCK of CLOCKS) {
                if (CLOCK.player.currentTimeMs !== CLOCK.time) {
                    CLOCK.player.seek(CLOCK.time);
                }
            }
            renderEvidence = {
                nativeIds: ACTUAL_IDS,
                visibleIds: VISIBLE_IDS,
                unculledDraws: UNCULLED_DRAWS,
                unculledDifferentPixels: COUNT_DIFFERENT_PIXELS(PIXELS, UNCULLED_PIXELS),
                nativeBodyPixels: COUNT_DIFFERENT_PIXELS(PIXELS, WITHOUT_BODIES),
                restoredDifferentPixels: COUNT_DIFFERENT_PIXELS(PIXELS, RESTORED),
                cameraUnchanged: CAMERA() === CAMERA_BEFORE,
                stateUnchanged: JSON.stringify(SNAPSHOT(BUDMORI.sim)) === BEFORE,
                clocksUnchanged: CLOCKS.every(
                    ({ id, player, clip, time }) =>
                        R.vectorPlayers.get(id) === player &&
                        player.currentClip === clip &&
                        player.currentTimeMs === time,
                ),
            };
        } finally {
            R.unitPresentation.drawVectorUnit = NATIVE;
            R.directCamera = DIRECT;
        }
        return {
            ...renderEvidence,
            tick: BUDMORI.sim.simulationTick,
            actors: R.actors.length,
            troops: DISPLAY.units.length,
            fadeMs: DISPLAY.displayTimeMs - R.sceneChangedAt,
            zoom: R.zoom,
            pan: R.cameraPan,
            bosses: DISPLAY.bosses
                .filter((boss) => boss.active && boss.hp > 0)
                .map((boss) => {
                    const RECORD = R.bossSpeciesAssets.get(boss.species);
                    return {
                        species: boss.species,
                        x: boss.x,
                        y: boss.y,
                        z: boss.z,
                        height: boss.height,
                        phase: boss.patternPhase,
                        top:
                            R.project(boss.x, boss.y, boss.z).y -
                            (RECORD.anchors.ground.y - RECORD.compiled.viewBox[1]) * BOSS_SCALE(boss) * R.scale,
                    };
                }),
        };
    });
    REPORT.captures.push({ name, ...DRAW });
    assert.ok(
        DRAW.fadeMs >= 700 && DRAW.troops >= 100 && DRAW.unculledDraws >= 100,
        'capture retains the populated fixture after scene fade',
    );
    assert.deepEqual(DRAW.nativeIds, DRAW.visibleIds, 'every admitted troop submits its native body exactly once');
    assert.equal(DRAW.unculledDifferentPixels, 0, 'same snapshot/camera has exactly the unculled native framebuffer');
    assert.equal(DRAW.restoredDifferentPixels, 0, 'reference inspection restores the captured native framebuffer');
    assert.ok(
        DRAW.cameraUnchanged && DRAW.stateUnchanged && DRAW.clocksUnchanged,
        'reference render preserves camera, authoritative snapshot and native player clocks',
    );
    if (name.endsWith('default')) {
        assert.ok(
            DRAW.nativeIds.length > 0 && DRAW.nativeBodyPixels > 0,
            'default view contains actual native troop art',
        );
    }
    if (name === 'default') {
        assert.ok(
            DRAW.bosses.every((boss) => boss.top >= 0),
            'default view preserves boss headroom',
        );
    }
    await page.screenshot({ path: path.join(OUTPUT, name + '.png'), scale: 'css' });
}
try {
    for (const MODULE of MANIFEST.modules) {
        const BYTES = fs.readFileSync(path.join(ROOT, 'vendor/upstream', MODULE.name + '.js'));
        assert.equal(createHash('sha256').update(BYTES).digest('hex'), MODULE.sha256);
        MODULES.set(MODULE.url, BYTES);
    }
    await new Promise((resolve) => SERVER.listen(0, '127.0.0.1', resolve));
    const ORIGIN = `http://127.0.0.1:${SERVER.address().port}`;
    browser = await chromium.launch({
        executablePath: process.env.CHROME_PATH,
        args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    });
    REPORT.browser = browser.version();
    const CONTEXT = await browser.newContext({
        viewport: SIZE,
        hasTouch: KIND !== 'desktop',
        isMobile: KIND !== 'desktop',
        deviceScaleFactor: 1,
    });
    await CONTEXT.route('**/*', (route) => {
        const URL = route.request().url();
        if (URL.startsWith(ORIGIN)) {
            return route.continue();
        }
        if (MODULES.has(URL)) {
            return route.fulfill({
                body: MODULES.get(URL),
                contentType: 'text/javascript',
                headers: { 'access-control-allow-origin': '*' },
            });
        }
        return route.abort();
    });
    page = await CONTEXT.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', (error) => ERRORS.push(String(error)));
    page.on('console', (message) => {
        if (message.type() === 'error') {
            ERRORS.push(message.text());
        }
    });
    await page.clock.install();
    await page.goto(ORIGIN);
    await page.waitForFunction(() => !!globalThis.BUDMORI);
    await page.evaluate(() => {
        globalThis.__cameraEvents = [];
        for (const TYPE of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'lostpointercapture']) {
            document.addEventListener(
                TYPE,
                (event) => {
                    globalThis.__cameraEvents.push({
                        type: event.type,
                        id: event.pointerId,
                        x: event.clientX,
                        y: event.clientY,
                        button: event.button,
                        target: event.target.id || event.target.tagName,
                    });
                    if (globalThis.__cameraEvents.length > 30) {
                        globalThis.__cameraEvents.shift();
                    }
                },
                true,
            );
        }
    });
    await page.locator('#newGame').click();
    await page.evaluate(async () => {
        const W = BUDMORI.sim,
            { overallXpForLevel: XP } = await import('./src/model/player-progression.js');
        W.resetUnits();
        W.playerProgression.overallXp = XP(41);
        W.playerProgression.towerBest = 100;
        W.setWorkBasisPoints(0);
        for (let i = 0; i < 200; i++) {
            const U = W.spawn(i % 9, 1, ((i % 40) - 19.5) * 1.05, (Math.floor(i / 40) - 12) * 1.1);
            U.growthElapsed = U.growthDuration;
            U.dropLanded = true;
        }
        W.markProgressChanged();
    });
    await page.waitForFunction(
        () => BUDMORI.renderer.cameraWorld.units.length === 200 && !BUDMORI.renderer.cameraDirected,
    );
    await freeze();
    const FARM_STATE = await state(),
        FARM_CAMERA = await camera();
    await capture('farm-default');
    await gestureFlow(FARM_CAMERA);
    await capture('farm-manual');
    assert.equal(await state(), FARM_STATE, 'farm gestures preserve full checkpoint');
    await resume();
    REPORT.checks.push('farm shares the same native gestures and state isolation');
    await page.evaluate(() => {
        const W = BUDMORI.sim;
        // 500 frontline + 100 reserves; the separate tower-army flow covers a full 1,000 roster.
        for (let i = 200; i < 600; i++) {
            const U = W.spawn(i % 9, 1, ((i % 40) - 19.5) * 1.05, (Math.floor(i / 40) - 12) * 1.1);
            U.growthElapsed = U.growthDuration;
            U.dropLanded = true;
        }
    });
    await page.locator('#bossChallenge').click();
    await page.locator('#deckGo').click();
    await page.evaluate(() => {
        const W = BUDMORI.sim;
        W.finishMarch();
        W.boss.setBaseStats({ maxHp: 1e9, attackPower: 0.01 });
        W.boss.setHealth(W.boss.maxHp);
    });
    await page.waitForFunction(
        () =>
            BUDMORI.sim.fieldFighterCount === 500 &&
            BUDMORI.renderer.displayTimeMs - BUDMORI.renderer.sceneChangedAt > 1000,
        null,
        { timeout: 45000 },
    );
    await page.waitForFunction(() => BUDMORI.sim.boss.hp < BUDMORI.sim.boss.maxHp, null, { timeout: 45000 });
    await freeze();
    const BEFORE = await state(),
        INITIAL = await camera(),
        { x: CX, y: CY } = await gestureOrigin();
    await capture('default');
    await gestureFlow(INITIAL);
    await capture('manual');
    assert.equal(await state(), BEFORE, 'gestures and rerender do not alter a single world/checkpoint field');
    REPORT.checks.push('same-tick full snapshot unchanged; real actor render before/after');
    const ROUNDTRIP = await page.evaluate(() => {
        const R = BUDMORI.renderer,
            RECT = R.canvas.getBoundingClientRect();
        return [
            [0, 0],
            [30, 22],
            [-30, -22],
        ].map(([x, y]) => {
            const P = R.project(x, y),
                W = R.screenToWorld(RECT.left + P.x / R.pixelRatio, RECT.top + P.y / R.pixelRatio);
            return Math.hypot(W.x - x, W.y - y);
        });
    });
    assert.ok(ROUNDTRIP.every((error) => error < 1e-8));
    const WHEEL_MODES = await page.evaluate(() => {
        const R = BUDMORI.renderer,
            C = R.canvas,
            RECT = C.getBoundingClientRect();
        return [0, 1, 2].map((deltaMode) => {
            R.resetZoom();
            C.dispatchEvent(
                new WheelEvent('wheel', {
                    deltaY: deltaMode === 0 ? -100 : deltaMode === 1 ? -100 / 16 : -100 / RECT.height,
                    deltaMode,
                    clientX: RECT.width / 2,
                    clientY: RECT.height / 2,
                    cancelable: true,
                }),
            );
            return R.zoom;
        });
    });
    assert.ok(Math.max(...WHEEL_MODES) - Math.min(...WHEEL_MODES) < 1e-8);
    // Test the public input edge, not an internal zoom setter.
    await page.mouse.move(CX, CY);
    await page.mouse.wheel(0, -100000);
    await page.waitForFunction(() => BUDMORI.renderer.zoom === 1.8);
    await page.mouse.wheel(0, 100000);
    await page.waitForFunction(() => Math.abs(BUDMORI.renderer.zoom - BUDMORI.renderer.minimumZoom()) < 1e-8);
    await page.mouse.down();
    await page.mouse.move(SIZE.width - 5, SIZE.height - 5);
    await page.mouse.up();
    const LIMITED = await camera();
    assert.ok(
        LIMITED.pan.x >= LIMITED.limits.minX &&
            LIMITED.pan.x <= LIMITED.limits.maxX &&
            LIMITED.pan.y >= LIMITED.limits.minY &&
            LIMITED.pan.y <= LIMITED.limits.maxY,
    );
    REPORT.checks.push('projection inverse, pixel/line/page wheel units, zoom/pan limits');
    await page.mouse.move(CX, CY);
    await page.mouse.wheel(0, -100);
    await page.waitForFunction(() => BUDMORI.renderer.manualCamera);
    const CENTER = (await camera()).anchor;
    const ROTATED = KIND === 'portrait' ? SIZES.landscape : SIZES.portrait;
    await page.mouse.down();
    await page.setViewportSize(ROTATED);
    await page.waitForFunction((width) => BUDMORI.renderer.canvas.width === width, ROTATED.width);
    near((await camera(ROTATED.width / 2, ROTATED.height / 2)).anchor, CENTER, 'resize preserves center world point');
    const RESIZED = await camera();
    await page.mouse.move(ROTATED.width / 3, ROTATED.height / 3);
    await page.mouse.up();
    assert.deepEqual(await camera(), RESIZED, 'resize releases a captured drag');
    await page.setViewportSize(SIZE);
    await page.waitForFunction((width) => BUDMORI.renderer.canvas.width === width, SIZE.width);
    REPORT.checks.push('native viewport resize/rotation preserves center and releases captured drag');
    await page.locator('input[name="battleCommand"][value="scatter"]').check();
    await resume();
    await page.waitForFunction(() => BUDMORI.sim.battleCommand === 'scatter');
    await page.locator('#upgradeMenu').click();
    const MENU_CAMERA = await camera();
    await page.mouse.move(CX, CY);
    await page.mouse.wheel(0, -200);
    assert.deepEqual(await camera(), MENU_CAMERA, 'scrollable upgrade UI does not zoom world');
    await page.locator('#gameMenuClose').click();
    await page.mouse.move(CX, CY);
    await page.mouse.down();
    await page.evaluate(() => {
        const W = BUDMORI.sim;
        while (W.joinNextBoss()) {
            /* Arrange the full encounter before the real death/settlement flow. */
        }
        for (const BOSS of W.bosses) {
            BOSS.setHealth(0);
        }
    });
    await page.locator('#bossRewardDialog').waitFor({ state: 'visible' });
    const REWARD_CAMERA = await camera();
    await page.mouse.move(CX + 45, CY + 30);
    await page.mouse.up();
    await page.mouse.wheel(0, -100);
    assert.deepEqual(await camera(), REWARD_CAMERA, 'automatic reward cancels a captured drag');
    REPORT.checks.push('radio command, upgrade scroll and automatic reward interrupt gestures');
    assert.deepEqual(ERRORS, []);
    REPORT.status = 'passed';
} catch (error) {
    REPORT.status = 'failed';
    REPORT.error = String(error.stack || error);
    REPORT.failureState = await page
        ?.evaluate(() => ({
            scene: globalThis.BUDMORI?.sim.scene,
            hidden: document.hidden,
            events: globalThis.__cameraEvents,
            fatal: document.querySelector('#error')?.textContent,
            phase: globalThis.BUDMORI?.sim.farmBossEvent.phase,
            camera: globalThis.BUDMORI && {
                directed: BUDMORI.renderer.cameraDirected,
                returning: BUDMORI.renderer.cameraReturning,
                until: BUDMORI.renderer.towerShotUntil,
                zoom: BUDMORI.renderer.zoom,
                pan: BUDMORI.renderer.pan,
                key: BUDMORI.renderer.sceneKey,
                units: BUDMORI.renderer.cameraWorld.units.length,
                tick: BUDMORI.sim.simulationTick,
                paused: BUDMORI.runtime.paused,
                now: performance.now(),
            },
        }))
        .catch(() => null);
    if (page) {
        await page.screenshot({ path: path.join(OUTPUT, 'failure.png') }).catch(() => {});
    }
    throw error;
} finally {
    REPORT.errors = ERRORS;
    fs.writeFileSync(path.join(OUTPUT, 'report.json'), JSON.stringify(REPORT, null, 2) + '\n');
    await browser?.close();
    SERVER.close();
    clearTimeout(DEADLINE);
    console.log(JSON.stringify(REPORT));
}
