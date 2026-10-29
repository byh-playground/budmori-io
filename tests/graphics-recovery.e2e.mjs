// Browser contract for the real application's WebGL loss/recovery flow.
// Run: node tests/graphics-recovery.e2e.mjs
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const MANIFEST = JSON.parse(
    HTML.match(/<script id="bloom-runtime-manifest" type="application\/json">(.*?)<\/script>/s)?.[1] || 'null',
);
const TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
};
const HARDWARE = process.env.BUDMORI_HARDWARE_RENDERING === '1';
const MODULES = new Map();
const ERRORS = [];
const OUTPUT = path.join(ROOT, 'tests/output/graphics-recovery');
const DIRTY_FILES = execFileSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' })
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
const REPORT = {
    status: 'running',
    startedAt: new Date().toISOString(),
    sourceHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(),
    sourceDirty: DIRTY_FILES.length > 0,
    dirtyFiles: DIRTY_FILES,
    sdkSourceCommit: MANIFEST.sourceCommit,
    renderer: null,
    scenarios: {},
    errors: ERRORS,
};
const SHA = (bytes) => createHash('sha256').update(bytes).digest('hex');

assert.equal(MANIFEST?.game?.file, 'src/farm-app.js');
assert.match(HTML, /<script type="module" src="\.\/src\/bootstrap\.js" data-bloom-bootstrap><\/script>/);
for (const MODULE of MANIFEST.modules) {
    const BYTES = fs.readFileSync(path.join(ROOT, 'vendor/upstream', `${MODULE.name}.js`));
    assert.equal(SHA(BYTES), MODULE.sha256, `pinned SDK ${MODULE.name}`);
    assert.equal(BYTES.length, MODULE.bytes, `pinned SDK length ${MODULE.name}`);
    MODULES.set(MODULE.url, BYTES);
}
const SERVER = http.createServer((request, response) => {
    const PATHNAME = new URL(request.url, 'http://127.0.0.1').pathname;
    if (PATHNAME === '/favicon.ico') {
        response.writeHead(204).end();
        return;
    }
    const FILE = path.resolve(ROOT, decodeURIComponent(PATHNAME).replace(/^\/+/, '') || 'index.html');
    if (!FILE.startsWith(ROOT + path.sep) || !fs.existsSync(FILE) || !fs.statSync(FILE).isFile()) {
        return response.writeHead(404).end();
    }
    response.setHeader('content-type', TYPES[path.extname(FILE)] || 'application/octet-stream');
    response.end(fs.readFileSync(FILE));
});

let browser;
try {
    await new Promise((resolve, reject) => {
        SERVER.once('error', reject);
        SERVER.listen(0, '127.0.0.1', resolve);
    });
    const ORIGIN = `http://127.0.0.1:${SERVER.address().port}`;
    browser = await chromium.launch({
        executablePath: process.env.CHROME_PATH,
        ...(HARDWARE
            ? {
                  ignoreDefaultArgs: ['--enable-unsafe-swiftshader'],
                  args: ['--disable-software-rasterizer', '--use-angle=d3d11'],
              }
            : { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }),
    });

    async function openFarm(label, query = '') {
        const CONTEXT = await browser.newContext({
            viewport: { width: 667, height: 375 },
            deviceScaleFactor: 0.75,
            serviceWorkers: 'block',
        });
        const PAGE = await CONTEXT.newPage();
        PAGE.setDefaultTimeout(30000);
        const LOCAL_ERRORS = [];
        PAGE.on('pageerror', (error) => {
            LOCAL_ERRORS.push(`pageerror: ${error}`);
            ERRORS.push(`${label}: pageerror: ${error}`);
        });
        PAGE.on('console', (message) => {
            if (message.type() === 'error') {
                LOCAL_ERRORS.push(`console: ${message.text()}`);
                ERRORS.push(`${label}: console: ${message.text()}`);
            }
        });
        await CONTEXT.route('**/*', (route) => {
            const URL_LOCAL = route.request().url();
            if (URL_LOCAL.startsWith(`${ORIGIN}/`)) {
                return route.continue();
            }
            if (MODULES.has(URL_LOCAL)) {
                return route.fulfill({
                    body: MODULES.get(URL_LOCAL),
                    contentType: 'text/javascript',
                    headers: { 'access-control-allow-origin': '*' },
                });
            }
            LOCAL_ERRORS.push(`Unexpected network: ${URL_LOCAL}`);
            ERRORS.push(`${label}: Unexpected network: ${URL_LOCAL}`);
            return route.abort();
        });
        await PAGE.goto(`${ORIGIN}/index.html${query}`);
        await PAGE.waitForFunction(() => Boolean(globalThis.BUDMORI));
        if (!query) {
            await PAGE.locator('#newGame').click();
        }
        await PAGE.waitForFunction(() => BUDMORI.sim?.scene === 'farm' && BUDMORI.sim.units.length > 0);
        await PAGE.evaluate(
            () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
        );
        const DEVICE_NAME = await PAGE.evaluate(() => {
            const GL = BUDMORI.renderer.device.gl;
            assertWebgl2(GL);
            const DEBUG = GL.getExtension('WEBGL_debug_renderer_info');
            return DEBUG ? GL.getParameter(DEBUG.UNMASKED_RENDERER_WEBGL) : GL.getParameter(GL.RENDERER);
            function assertWebgl2(candidate) {
                if (!(candidate instanceof WebGL2RenderingContext)) {
                    throw new Error('Expected WebGL2');
                }
            }
        });
        if (HARDWARE) {
            assert.doesNotMatch(DEVICE_NAME, /swiftshader|software/i);
        }
        REPORT.renderer ||= DEVICE_NAME;
        await PAGE.evaluate(() => {
            const RENDERER = BUDMORI.renderer,
                RUNTIME = BUDMORI.runtime;
            const OBSERVATION = (globalThis.__graphicsRecovery = {
                renders: 0,
                pulses: 0,
                session: RUNTIME,
                renderer: RENDERER,
                extension: RENDERER.device.gl.getExtension('WEBGL_lose_context'),
            });
            const ORIGINAL_RENDER = RENDERER.render;
            RENDERER.render = function (...args) {
                OBSERVATION.renders++;
                return ORIGINAL_RENDER.apply(this, args);
            };
            const ORIGINAL_PULSE = RUNTIME.pulse;
            RUNTIME.pulse = function (...args) {
                OBSERVATION.pulses++;
                return ORIGINAL_PULSE.apply(this, args);
            };
        });
        const STATE = () =>
            PAGE.evaluate(() => {
                const OBS = globalThis.__graphicsRecovery,
                    RUNTIME = BUDMORI.runtime,
                    GL = BUDMORI.renderer.device.gl,
                    VIEWPORT_DIMS = GL.getParameter(GL.MAX_VIEWPORT_DIMS),
                    CLOCK_INPUT = RUNTIME.now();
                return {
                    sameSession: OBS.session === RUNTIME,
                    sameRenderer: OBS.renderer === BUDMORI.renderer,
                    paused: RUNTIME.paused,
                    tick: BUDMORI.sim.simulationTick,
                    time: BUDMORI.sim.time,
                    clockInput: CLOCK_INPUT,
                    adjusted: RUNTIME.adjustedWallTime(CLOCK_INPUT),
                    frameClock: RUNTIME.lastFrameClockMs,
                    captures: RUNTIME.presentationSequence,
                    renders: OBS.renders,
                    pulses: OBS.pulses,
                    deviceState: BUDMORI.renderer.device.state,
                    contextState: BUDMORI.renderer.ctx.state,
                    glContextLost: GL.isContextLost(),
                    maxViewportDims: VIEWPORT_DIMS && [...VIEWPORT_DIMS],
                    menuOpen: !document.getElementById('gameMenuOverlay').hidden,
                    errorVisible: !document.getElementById('error').hidden,
                    errorText: document.getElementById('error').textContent,
                    fatalPopupVisible: !document.getElementById('bloom-error-popup').hidden,
                    fatalErrors: [...(OBS.fatalErrors ?? [])],
                    suspended: RUNTIME.clockSuspendedAtMs !== null,
                    stats: { ...BUDMORI.renderer.device.stats },
                    pose: BUDMORI.renderer.ctx.stats().mesh?.poses ?? null,
                    sprites: BUDMORI.renderer.unitSprites.stats(),
                    helpTick: globalThis.__budmoriHelp?.snapshot().tick ?? null,
                };
            });
        // Install listener and trigger in the same browser task: no event can be missed.
        const LOSE = () =>
            PAGE.evaluate(
                () =>
                    new Promise((resolve, reject) => {
                        const CANVAS = BUDMORI.renderer.canvas;
                        const EXTENSION = globalThis.__graphicsRecovery.extension;
                        if (!EXTENSION) {
                            reject(new Error('WEBGL_lose_context unavailable'));
                            return;
                        }
                        const TIMEOUT = setTimeout(() => reject(new Error('loss timed out')), 10000);
                        CANVAS.addEventListener(
                            'webglcontextlost',
                            () => {
                                clearTimeout(TIMEOUT);
                                resolve();
                            },
                            { once: true },
                        );
                        EXTENSION.loseContext();
                    }),
            );
        const RESTORE = () =>
            PAGE.evaluate(
                () =>
                    new Promise((resolve, reject) => {
                        const CANVAS = BUDMORI.renderer.canvas;
                        const EXTENSION = globalThis.__graphicsRecovery.extension;
                        const TIMEOUT = setTimeout(() => reject(new Error('restore timed out')), 10000);
                        CANVAS.addEventListener(
                            'webglcontextrestored',
                            () => {
                                clearTimeout(TIMEOUT);
                                resolve();
                            },
                            { once: true },
                        );
                        EXTENSION.restoreContext();
                    }),
            );
        return {
            label,
            page: PAGE,
            context: CONTEXT,
            state: STATE,
            lose: LOSE,
            restore: RESTORE,
            errors: LOCAL_ERRORS,
        };
    }

    async function assertFrozen(before, after, label) {
        assert.equal(after.sameSession, true, `${label}: session identity`);
        assert.equal(after.sameRenderer, true, `${label}: renderer identity`);
        assert.equal(after.tick, before.tick, `${label}: simulation tick while lost`);
        assert.equal(after.time, before.time, `${label}: simulation time while lost`);
        assert.equal(after.frameClock, before.frameClock, `${label}: presentation clock while lost`);
        assert.equal(after.captures, before.captures, `${label}: presentation captures while lost`);
        assert.equal(after.renders, before.renders, `${label}: no draws while lost`);
        assert(Math.abs(after.adjusted - before.adjusted) < 10, `${label}: adjusted clock froze`);
        assert.equal(after.errorVisible, true, `${label}: recovery notice remains visible while lost`);
        assert.equal(after.errorText, before.errorText, `${label}: recovery notice is stable`);
        assert.equal(after.suspended, true, `${label}: clock remains suspended`);
        assert.equal(after.paused, before.paused, `${label}: pause state preserved`);
    }

    async function cycle(farm, label) {
        const PRE = await farm.state();
        await farm.lose();
        const LOST = await farm.state();
        assert.equal(LOST.deviceState, 'lost', `${label}: device lost`);
        await farm.page.waitForTimeout(275);
        const HELD = await farm.state();
        await assertFrozen(LOST, HELD, label);
        await farm.page.evaluate(() => BUDMORI.runtime.pulse(performance.now()));
        const EXPLICIT_PULSE = await farm.state();
        assert.equal(EXPLICIT_PULSE.tick, HELD.tick, `${label}: direct pulse cannot advance suspended runtime`);
        assert.equal(EXPLICIT_PULSE.time, HELD.time, `${label}: direct pulse cannot advance world`);
        await farm.restore();
        await farm.page.waitForFunction(
            (prior) =>
                BUDMORI.runtime.clockSuspendedAtMs === null &&
                BUDMORI.renderer.device.state === 'ready' &&
                globalThis.__graphicsRecovery.renders > prior,
            LOST.renders,
        );
        const RESTORED = await farm.state();
        assert.equal(RESTORED.sameSession, true, `${label}: session not replaced`);
        assert.equal(RESTORED.paused, PRE.paused, `${label}: pause state after restore`);
        assert.equal(RESTORED.menuOpen, PRE.menuOpen, `${label}: menu after restore`);
        assert.equal(RESTORED.errorVisible, false, `${label}: no error after restore`);
        assert.equal(RESTORED.suspended, false, `${label}: clock resumes after restore`);
        assert(
            RESTORED.adjusted - HELD.adjusted < 120,
            `${label}: no lost-duration clock catch-up (${HELD.adjusted} → ${RESTORED.adjusted})`,
        );
        await farm.page
            .waitForFunction((prior) => globalThis.__graphicsRecovery.renders > prior, RESTORED.renders, {
                timeout: 3000,
            })
            .catch(async (error) => {
                console.error(`${label} post-restore state`, await farm.state(), farm.errors);
                throw error;
            });
        const ACTIVE = await farm.state();
        assert(
            ACTIVE.sprites.sprite > 0 || ACTIVE.pose.gpuDrawInstances > 0 || !budmoriGpuSupported(ACTIVE),
            `${label}: prepared sprite or supported native pose draws restored`,
        );
        if (PRE.paused) {
            await farm.page.waitForTimeout(250);
            const STILL_PAUSED = await farm.state();
            assert.equal(STILL_PAUSED.tick, ACTIVE.tick, `${label}: paused world stays frozen`);
            assert.equal(STILL_PAUSED.time, ACTIVE.time, `${label}: paused simulation time stays frozen`);
        } else {
            await farm.page.waitForFunction((tick) => BUDMORI.sim.simulationTick > tick, RESTORED.tick, {
                timeout: 3000,
            });
            const ADVANCED = await farm.state();
            assert(ADVANCED.tick - RESTORED.tick < 8, `${label}: recovery does not replay lost time`);
        }
        return { pre: PRE, lost: LOST, held: HELD, restored: RESTORED, active: ACTIVE };
    }
    function budmoriGpuSupported(state) {
        return state.pose?.gpuUnavailableReason === null;
    }

    const RUNNING = await openFarm('running');
    try {
        assert.equal((await RUNNING.state()).paused, false);
        const FIRST = await cycle(RUNNING, 'running cycle 1');
        const SECOND = await cycle(RUNNING, 'running cycle 2');
        assert.equal(
            FIRST.active.stats.gpuBufferBytes,
            SECOND.active.stats.gpuBufferBytes,
            'repeated restoration retains stable buffer bytes',
        );
        assert.equal(
            FIRST.active.stats.gpuTextureBytes,
            SECOND.active.stats.gpuTextureBytes,
            'repeated restoration retains stable texture bytes',
        );
        assert.equal(
            FIRST.active.stats.gpuRenderTargetBytes,
            SECOND.active.stats.gpuRenderTargetBytes,
            'repeated restoration retains stable target bytes',
        );
        REPORT.scenarios.running = { first: FIRST, second: SECOND };
        assert.deepEqual(RUNNING.errors, [], 'running errors');
    } finally {
        await RUNNING.context.close();
    }

    const MID_DRAW = await openFarm('mid-draw-loss');
    try {
        const BEFORE = await MID_DRAW.state();
        await MID_DRAW.page.evaluate(
            () =>
                new Promise((resolve, reject) => {
                    const RENDERER = BUDMORI.renderer,
                        DEVICE = RENDERER.device,
                        ORIGINAL_DRAW = DEVICE.draw,
                        EXTENSION = globalThis.__graphicsRecovery.extension,
                        TIMEOUT = setTimeout(() => reject(new Error('mid-draw loss event timed out')), 10000);
                    RENDERER.canvas.addEventListener(
                        'webglcontextlost',
                        () => {
                            clearTimeout(TIMEOUT);
                            resolve();
                        },
                        { once: true },
                    );
                    DEVICE.draw = function () {
                        DEVICE.draw = ORIGINAL_DRAW;
                        EXTENSION.loseContext();
                        throw new Error('Injected draw context loss');
                    };
                }),
        );
        await MID_DRAW.page.waitForFunction(
            () => BUDMORI.runtime.clockSuspendedAtMs !== null && BUDMORI.renderer.device.state === 'lost',
        );
        const LOST = await MID_DRAW.state();
        assert.equal(LOST.errorVisible, true);
        await MID_DRAW.page.waitForTimeout(275);
        const HELD = await MID_DRAW.state();
        await assertFrozen(LOST, HELD, 'mid-draw context loss');
        await MID_DRAW.restore();
        await MID_DRAW.page.waitForFunction(
            (draws) => BUDMORI.runtime.clockSuspendedAtMs === null && globalThis.__graphicsRecovery.renders > draws,
            LOST.renders,
        );
        const RESTORED = await MID_DRAW.state();
        assert.equal(RESTORED.errorVisible, false);
        assert.equal(RESTORED.contextState, 'ready');
        await MID_DRAW.page.waitForFunction((tick) => BUDMORI.sim.simulationTick > tick, RESTORED.tick, {
            timeout: 3000,
        });
        const ACTIVE = await MID_DRAW.state();
        assert(ACTIVE.renders > LOST.renders, 'meter and render state recovered after a partial draw');
        assert.equal(ACTIVE.sameSession, true);
        assert.deepEqual(MID_DRAW.errors, [], 'mid-draw loss is handled without a fatal console error');
        REPORT.scenarios.midDraw = { before: BEFORE, lost: LOST, held: HELD, restored: RESTORED, active: ACTIVE };
    } finally {
        await MID_DRAW.context.close();
    }

    const NORMAL_ERROR = await openFarm('normal-render-error');
    try {
        const BEFORE = await NORMAL_ERROR.state();
        await NORMAL_ERROR.page.evaluate(() => {
            const OBS = globalThis.__graphicsRecovery,
                DEVICE = BUDMORI.renderer.device,
                ORIGINAL_DRAW = DEVICE.draw,
                ORIGINAL_FATAL = globalThis.BloomReportRuntimeFatal;
            OBS.fatalErrors = [];
            globalThis.BloomReportRuntimeFatal = (error) => {
                OBS.fatalErrors.push(String(error));
                ORIGINAL_FATAL(error);
            };
            DEVICE.draw = function () {
                DEVICE.draw = ORIGINAL_DRAW;
                throw new Error('Injected normal render error');
            };
        });
        await NORMAL_ERROR.page.waitForFunction(() => globalThis.__graphicsRecovery.fatalErrors.length === 1);
        const FAILED = await NORMAL_ERROR.state();
        assert.equal(FAILED.glContextLost, false, 'ordinary render error retains valid GL context');
        assert.equal(FAILED.suspended, false, 'ordinary render error does not enter graphics recovery');
        assert.equal(FAILED.deviceState, 'ready');
        assert.equal(FAILED.errorVisible, false, 'no graphics recovery notice is shown');
        assert.equal(FAILED.fatalPopupVisible, true, 'normal fatal popup is shown');
        assert.match(FAILED.fatalErrors[0], /Injected normal render error/);
        await NORMAL_ERROR.page.waitForTimeout(275);
        const LATER = await NORMAL_ERROR.state();
        assert.equal(LATER.renders, FAILED.renders, 'ordinary fatal error stops the RAF loop');
        assert.equal(LATER.tick, FAILED.tick, 'ordinary fatal error does not silently resume simulation');
        assert.equal(NORMAL_ERROR.errors.length, 1, 'only expected normal-fatal console output');
        assert.match(NORMAL_ERROR.errors[0], /Farm render loop stopped.*Injected normal render error/);
        REPORT.scenarios.normalRenderError = {
            before: BEFORE,
            failed: FAILED,
            later: LATER,
            expectedError: NORMAL_ERROR.errors[0],
        };
    } finally {
        await NORMAL_ERROR.context.close();
    }

    const HELP = await openFarm('help', '?help=pea-t1');
    try {
        const BEFORE = await HELP.state();
        assert.equal(BEFORE.paused, false, 'help scenario starts active');
        assert(Number.isFinite(BEFORE.helpTick), 'real help scenario clock is available');
        const RESULT = await cycle(HELP, 'scaled help clock');
        await HELP.page.waitForFunction(
            (tick) => globalThis.__budmoriHelp.snapshot().tick > tick,
            RESULT.restored.helpTick,
            { timeout: 3000 },
        );
        const AFTER = await HELP.state();
        assert(
            AFTER.helpTick > RESULT.restored.helpTick,
            'help scenario resumes its scaled clock promptly after restoration',
        );
        REPORT.scenarios.help = { before: BEFORE, ...RESULT, after: AFTER };
        assert.deepEqual(HELP.errors, [], 'help errors');
    } finally {
        await HELP.context.close();
    }

    const HELP_PAUSE = await openFarm('help-pause-during-loss', '?help=pea-t1');
    try {
        const BEFORE = await HELP_PAUSE.state();
        assert(
            BEFORE.frameClock - BEFORE.adjusted < 120,
            'Initial prepared help clock cannot lag its captured session clock',
        );
        assert.equal(BEFORE.paused, false);
        await HELP_PAUSE.lose();
        const LOST = await HELP_PAUSE.state();
        await HELP_PAUSE.page.evaluate(() => {
            BUDMORI.runtime.paused = true;
        });
        await HELP_PAUSE.page.waitForTimeout(275);
        const HELD = await HELP_PAUSE.state();
        assert.equal(HELD.paused, true);
        assert.equal(HELD.tick, LOST.tick);
        assert.equal(HELD.helpTick, LOST.helpTick);
        await HELP_PAUSE.restore();
        await HELP_PAUSE.page.waitForFunction(() => BUDMORI.runtime.clockSuspendedAtMs === null);
        const RESTORED = await HELP_PAUSE.state();
        assert.equal(RESTORED.paused, true, 'scaled help session remains paused after restoration');
        await HELP_PAUSE.page.waitForTimeout(250);
        const STILL_PAUSED = await HELP_PAUSE.state();
        assert.equal(STILL_PAUSED.tick, RESTORED.tick);
        await HELP_PAUSE.page.evaluate(() => {
            BUDMORI.runtime.paused = false;
        });
        await HELP_PAUSE.page.waitForFunction((prior) => BUDMORI.sim.simulationTick > prior, STILL_PAUSED.tick, {
            timeout: 3000,
        });
        await HELP_PAUSE.page.waitForFunction(
            (prior) => globalThis.__budmoriHelp.snapshot().tick > prior,
            STILL_PAUSED.helpTick,
            { timeout: 3000 },
        );
        await HELP_PAUSE.page.waitForFunction(
            (prior) => BUDMORI.runtime.lastFrameClockMs > prior,
            STILL_PAUSED.frameClock,
            { timeout: 3000 },
        );
        const ACTIVE = await HELP_PAUSE.state();
        assert(
            ACTIVE.frameClock > STILL_PAUSED.frameClock,
            `scaled help presentation clock advances after unpause (${STILL_PAUSED.frameClock} → ${ACTIVE.frameClock})`,
        );
        assert.equal(ACTIVE.fatalPopupVisible, false);
        assert.deepEqual(HELP_PAUSE.errors, [], 'help pause errors');
        REPORT.scenarios.helpPauseDuringLoss = {
            before: BEFORE,
            lost: LOST,
            held: HELD,
            restored: RESTORED,
            stillPaused: STILL_PAUSED,
            active: ACTIVE,
        };
    } finally {
        await HELP_PAUSE.context.close();
    }

    const PAUSED = await openFarm('paused');
    try {
        await PAUSED.page.evaluate(() => {
            BUDMORI.runtime.paused = true;
        });
        const RESULT = await cycle(PAUSED, 'paused');
        assert.equal(RESULT.active.paused, true);
        REPORT.scenarios.paused = RESULT;
        assert.deepEqual(PAUSED.errors, [], 'paused errors');
    } finally {
        await PAUSED.context.close();
    }

    const MENU = await openFarm('menu');
    try {
        await MENU.page.locator('#upgradeMenu').click();
        const BEFORE = await MENU.state();
        assert.equal(BEFORE.menuOpen, true);
        assert.equal(BEFORE.paused, true, 'ability menu auto-pauses');
        const RESULT = await cycle(MENU, 'ability menu');
        assert.equal(RESULT.active.menuOpen, true);
        assert.equal(RESULT.active.paused, true);
        REPORT.scenarios.menu = RESULT;
        assert.deepEqual(MENU.errors, [], 'menu errors');
    } finally {
        await MENU.context.close();
    }

    const PAUSE_DURING_LOSS = await openFarm('pause-during-loss');
    try {
        assert.equal((await PAUSE_DURING_LOSS.state()).paused, false);
        await PAUSE_DURING_LOSS.lose();
        const LOST = await PAUSE_DURING_LOSS.state();
        await PAUSE_DURING_LOSS.page.evaluate(() => {
            BUDMORI.runtime.paused = true;
        });
        await PAUSE_DURING_LOSS.page.waitForTimeout(275);
        const HELD = await PAUSE_DURING_LOSS.state();
        assert.equal(HELD.paused, true);
        assert.equal(HELD.tick, LOST.tick);
        assert.equal(HELD.time, LOST.time);
        await PAUSE_DURING_LOSS.restore();
        await PAUSE_DURING_LOSS.page.waitForFunction(() => BUDMORI.runtime.clockSuspendedAtMs === null);
        const RESTORED = await PAUSE_DURING_LOSS.state();
        assert.equal(RESTORED.paused, true, 'pause choice made during loss is preserved');
        assert.equal(RESTORED.errorVisible, false);
        await PAUSE_DURING_LOSS.page.waitForTimeout(250);
        const LATER = await PAUSE_DURING_LOSS.state();
        assert.equal(LATER.tick, RESTORED.tick);
        assert.equal(LATER.time, RESTORED.time);
        REPORT.scenarios.pauseDuringLoss = { lost: LOST, held: HELD, restored: RESTORED, later: LATER };
        assert.deepEqual(PAUSE_DURING_LOSS.errors, [], 'pause-during-loss errors');
    } finally {
        await PAUSE_DURING_LOSS.context.close();
    }

    const PAGEHIDE = await openFarm('pagehide');
    try {
        await PAGEHIDE.lose();
        await PAGEHIDE.page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
        const DISPOSED = await PAGEHIDE.state();
        assert.equal(DISPOSED.deviceState, 'disposed', 'pagehide disposes device');
        assert.equal(DISPOSED.contextState, 'disposed', 'pagehide disposes vector context');
        for (const KEY of [
            'gpuBufferBytes',
            'gpuTextureBytes',
            'gpuRenderTargetBytes',
            'bufferCount',
            'textureCount',
            'renderTargetCount',
        ]) {
            assert.equal(DISPOSED.stats[KEY], 0, `pagehide disposed ${KEY}`);
        }
        await PAGEHIDE.page.evaluate(() => {
            try {
                globalThis.__graphicsRecovery.extension.restoreContext();
            } catch {
                // A disposed context can reject the extension call. Dispatch the
                // late browser event explicitly to test the app's stale guard.
            }
            BUDMORI.renderer.canvas.dispatchEvent(new Event('webglcontextrestored'));
        });
        await PAGEHIDE.page.waitForTimeout(275);
        const AFTER = await PAGEHIDE.state();
        assert.equal(AFTER.renders, DISPOSED.renders, 'pagehide must not restart RAF renders');
        assert.equal(AFTER.tick, DISPOSED.tick, 'pagehide must not resume simulation');
        assert.equal(AFTER.suspended, false, 'disposed session clears suspended clock');
        REPORT.scenarios.pagehide = { disposed: DISPOSED, after: AFTER };
        assert.deepEqual(PAGEHIDE.errors, [], 'pagehide errors');
    } finally {
        await PAGEHIDE.context.close();
    }

    const FAILURE = await openFarm('failure');
    try {
        await FAILURE.lose();
        await FAILURE.page.waitForTimeout(275);
        const HELD = await FAILURE.state();
        await FAILURE.page.evaluate(() => {
            // Registered after the app listener. The app queues its check as a
            // timer; this listener runs after SDK restoration, before that check.
            BUDMORI.renderer.canvas.addEventListener(
                'webglcontextrestored',
                () => {
                    BUDMORI.renderer.ctx.state = 'failed';
                },
                { once: true },
            );
        });
        await FAILURE.restore();
        await FAILURE.page.waitForFunction(
            (notice) => BUDMORI.runtime.paused && document.getElementById('error').textContent !== notice,
            HELD.errorText,
        );
        const FAILED = await FAILURE.state();
        assert.equal(FAILED.contextState, 'failed');
        assert.equal(FAILED.paused, true, 'failed restore leaves the session paused');
        assert.equal(FAILED.suspended, true, 'failed restore keeps the clock suspended');
        assert.equal(FAILED.errorVisible, true, 'failed restore displays a fatal error');
        await FAILURE.page.waitForTimeout(275);
        const LATER = await FAILURE.state();
        assert.equal(LATER.renders, FAILED.renders, 'failed restore never restarts rendering');
        assert.equal(LATER.tick, FAILED.tick, 'failed restore never resumes simulation');
        assert.equal(LATER.adjusted, FAILED.adjusted, 'failed restore holds the clock');
        assert.equal(FAILURE.errors.length, 1, 'only the expected fatal console error');
        assert.match(FAILURE.errors[0], /^console: Error:/);
        await FAILURE.page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
        const DISPOSED = await FAILURE.state();
        assert.equal(DISPOSED.deviceState, 'disposed');
        assert.equal(DISPOSED.contextState, 'disposed');
        for (const KEY of [
            'gpuBufferBytes',
            'gpuTextureBytes',
            'gpuRenderTargetBytes',
            'bufferCount',
            'textureCount',
            'renderTargetCount',
        ]) {
            assert.equal(DISPOSED.stats[KEY], 0, `failed recovery disposal ${KEY}`);
        }
        await FAILURE.page.evaluate(() => BUDMORI.renderer.canvas.dispatchEvent(new Event('webglcontextrestored')));
        await FAILURE.page.waitForTimeout(100);
        assert.equal((await FAILURE.state()).renders, DISPOSED.renders, 'late event cannot revive failed page');
        REPORT.scenarios.failure = {
            held: HELD,
            failed: FAILED,
            later: LATER,
            disposed: DISPOSED,
            expectedError: FAILURE.errors[0],
        };
    } finally {
        await FAILURE.context.close();
    }

    REPORT.status = 'passed';
    console.log(
        JSON.stringify(
            {
                status: REPORT.status,
                renderer: REPORT.renderer,
                sdkSourceCommit: REPORT.sdkSourceCommit,
                scenarios: Object.keys(REPORT.scenarios),
            },
            null,
            2,
        ),
    );
} catch (error) {
    REPORT.status = 'failed';
    REPORT.failure = { message: String(error), stack: error?.stack ?? null };
    throw error;
} finally {
    await browser?.close();
    await new Promise((resolve) => SERVER.close(resolve));
    REPORT.finishedAt = new Date().toISOString();
    fs.mkdirSync(OUTPUT, { recursive: true });
    fs.writeFileSync(path.join(OUTPUT, 'report.json'), JSON.stringify(REPORT, null, 2));
}
