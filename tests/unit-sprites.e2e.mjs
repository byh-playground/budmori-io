import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const OUTPUT = path.join(ROOT, 'tests/output/unit-sprites');
const BENCHMARK = process.argv.includes('--benchmark');
const BATTLE = process.argv.includes('--battle');
const COUNTS = BENCHMARK ? (BATTLE ? [100, 500] : [100, 500, 1000]) : [20];
const REPORT_NAME = BENCHMARK ? (BATTLE ? 'battle-benchmark.json' : 'benchmark.json') : 'report.json';
const SAMPLES = BENCHMARK ? 60 : 12;
const WARMUP = BENCHMARK ? 24 : 4;
const MANIFEST = JSON.parse(
    fs
        .readFileSync(path.join(ROOT, 'index.html'), 'utf8')
        .match(/<script id="bloom-runtime-manifest" type="application\/json">(.*?)<\/script>/s)[1],
);
const MODULES = new Map(
    MANIFEST.modules.map((entry) => [
        entry.url,
        fs.readFileSync(path.join(ROOT, 'vendor/upstream', entry.name + '.js')),
    ]),
);
const TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
};
const SERVER = http.createServer((request, response) => {
    const FILE = path.resolve(ROOT, '.' + decodeURIComponent(request.url.split('?')[0]));
    if (!FILE.startsWith(ROOT) || !fs.existsSync(FILE) || !fs.statSync(FILE).isFile()) {
        response.writeHead(request.url.includes('favicon.ico') ? 204 : 404).end();
        return;
    }
    response.setHeader('content-type', TYPES[path.extname(FILE)] || 'application/octet-stream');
    response.end(fs.readFileSync(FILE));
});
await new Promise((resolve) => SERVER.listen(0, '127.0.0.1', resolve));
const ERRORS = [];
const REPORT = {
    sourceHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(),
    sourceDirty: !!execFileSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' }).trim(),
    sdkSource: MANIFEST.sourceCommit,
    sourceHashes: Object.fromEntries(
        [
            'src/render/unit-sprite-atlas.js',
            'src/render/farm-render-units.js',
            'src/render/farm-renderer.js',
            'src/render/unit-face-overlay.js',
            'src/model/farm-config.js',
            'src/units/species-face.js',
            'src/units/species-paint.js',
            'src/ui/codex-dialog.js',
            'assets/troops/barley.svg',
            'src/features/unit-body/definition.js',
            'src/farm-app.js',
            'gamekit-lock.json',
        ].map((file) => [
            file,
            createHash('sha256')
                .update(fs.readFileSync(path.join(ROOT, file)))
                .digest('hex'),
        ]),
    ),
    warmup: WARMUP,
    samples: SAMPLES,
    scene: BATTLE ? 'tower battle' : 'farm',
    measurementBoundary:
        'FarmSession pulse + presentation + renderer; excludes app DOM/HUD/input. Instrumented RAF intervals are not an uninstrumented whole-app FPS claim.',
    scope: 'Real Garden/FarmSession/renderer population fixture; fixed seed/camera/clock. RAF interval includes browser wait; CPU and GPU are separate and never summed.',
    runs: [],
};
fs.mkdirSync(OUTPUT, { recursive: true });
let browser;
try {
    browser = await chromium.launch({
        executablePath: process.env.CHROME_PATH,
        ...(process.env.BUDMORI_HARDWARE_RENDERING === '1'
            ? { ignoreDefaultArgs: ['--enable-unsafe-swiftshader'] }
            : { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }),
    });
    REPORT.browser = browser.version();
    for (let round = 0; round < (BENCHMARK ? 2 : 1); round++) {
        for (const COUNT of COUNTS) {
            for (const BACKEND of round % 2 ? ['sprite', 'vector'] : ['vector', 'sprite']) {
                const CONTEXT = await browser.newContext({
                    viewport: { width: 1100, height: 850 },
                    deviceScaleFactor: 1,
                });
                const PAGE = await CONTEXT.newPage();
                await PAGE.addInitScript(() => {
                    const METER = (globalThis.__unitSpriteMeter = {
                        loaderCalls: 0,
                        imagePeakBytes: 0,
                        numericPeakBytes: 0,
                        totalPeakBytes: 0,
                    });
                    let rendering, loader;
                    function sample(device) {
                        let image = 0,
                            numeric = 0;
                        for (const RECORD of device.textures.values()) {
                            if (!RECORD.gpu) {
                                continue;
                            }
                            if (RECORD.format === 'rgba32f') {
                                numeric += RECORD.width * RECORD.height * 16;
                            } else {
                                image += RECORD.width * RECORD.height * (RECORD.copyFormat === 'rgb' ? 3 : 4);
                            }
                        }
                        METER.imagePeakBytes = Math.max(METER.imagePeakBytes, image);
                        METER.numericPeakBytes = Math.max(METER.numericPeakBytes, numeric);
                        METER.totalPeakBytes = Math.max(METER.totalPeakBytes, image + numeric);
                    }
                    Object.defineProperty(globalThis, 'BloomGamekitRendering', {
                        configurable: true,
                        get: () => rendering,
                        set: (exports) => {
                            const BASE = exports.WebGLDevice;
                            class MeteredDevice extends BASE {
                                createRenderTarget(...args) {
                                    const HANDLE = super.createRenderTarget(...args);
                                    sample(this);
                                    return HANDLE;
                                }
                                createTexture(...args) {
                                    const HANDLE = super.createTexture(...args);
                                    sample(this);
                                    return HANDLE;
                                }
                                createDataTexture(...args) {
                                    const HANDLE = super.createDataTexture(...args);
                                    sample(this);
                                    return HANDLE;
                                }
                            }
                            rendering = { ...exports, WebGLDevice: MeteredDevice };
                        },
                    });
                    Object.defineProperty(globalThis, 'BloomGamekitVectorAssetLoader', {
                        configurable: true,
                        get: () => loader,
                        set: (exports) => {
                            loader = {
                                ...exports,
                                createVectorAssetLoader: (...args) => {
                                    const ORIGINAL = exports.createVectorAssetLoader(...args),
                                        DESCRIPTORS = Object.getOwnPropertyDescriptors(ORIGINAL);
                                    DESCRIPTORS.load = {
                                        ...DESCRIPTORS.load,
                                        value: (...parameters) => {
                                            METER.loaderCalls++;
                                            return ORIGINAL.load(...parameters);
                                        },
                                    };
                                    return Object.freeze(Object.defineProperties({}, DESCRIPTORS));
                                },
                            };
                        },
                    });
                });
                PAGE.setDefaultTimeout(60000);
                PAGE.on('pageerror', (error) => ERRORS.push(String(error)));
                PAGE.on('console', (message) => {
                    if (message.type() === 'error') {
                        ERRORS.push(message.text());
                    }
                });
                await PAGE.route(/cdn\.jsdelivr\.net\/gh\/byh-playground\/bloom-gamekit@/, (route) => {
                    const BYTES = MODULES.get(route.request().url());
                    return BYTES
                        ? route.fulfill({
                              body: BYTES,
                              contentType: 'text/javascript',
                              headers: { 'access-control-allow-origin': '*' },
                          })
                        : route.abort();
                });
                // Exercise the production code setting itself. There is no
                // separate URL/runtime renderer switch in the product.
                await PAGE.route('**/src/model/farm-config.js', (route) => {
                    const SOURCE = fs.readFileSync(path.join(ROOT, 'src/model/farm-config.js'), 'utf8');
                    assert.match(SOURCE, /unitArt: 'vector'/);
                    return route.fulfill({
                        contentType: 'text/javascript',
                        body: SOURCE.replace("unitArt: 'vector'", `unitArt: '${BACKEND}'`),
                    });
                });
                await PAGE.goto(`http://127.0.0.1:${SERVER.address().port}/index.html`);
                await PAGE.waitForFunction(() => globalThis.BUDMORI);
                await PAGE.locator('#newGame').click();
                await PAGE.waitForFunction(() => BUDMORI.runtime.presentationView?.units.length);
                const RESULT = await PAGE.evaluate(
                    async ({ count, warmup, samples, battle, expectedBackend, auditClocks }) => {
                        const APP = BUDMORI,
                            WORLD = APP.sim,
                            SESSION = APP.runtime,
                            R = APP.renderer,
                            GL = R.device.gl,
                            RAF = window.requestAnimationFrame.bind(window),
                            NEXT = () => new Promise(RAF),
                            { snapshot: SNAPSHOT } = await import('/src/save/farm-snapshot.js'),
                            { OVERALL_PROGRESSION_SETTINGS } = await import('/src/model/player-progression.js');
                        const CHECK = (value, message) => {
                            if (!value) {
                                throw new Error(message);
                            }
                        };
                        const CLOCK_TRACE = [],
                            ORIGINAL_PULSE = SESSION.pulse;
                        let clockPhase = 'drain';
                        if (auditClocks) {
                            SESSION.pulse = function (now) {
                                CLOCK_TRACE.push({ phase: clockPhase, now, tick: WORLD.simulationTick });
                                return ORIGINAL_PULSE.call(this, now);
                            };
                        }
                        SESSION.paused = true;
                        window.requestAnimationFrame = () => 0;
                        // One real RAF drains the app callback already queued
                        // before the override. A timer can fire before that RAF
                        // on a busy renderer and mix its wall clock into manual time.
                        await NEXT();
                        clockPhase = 'setup';
                        WORLD.seed = 731;
                        WORLD.reset();
                        WORLD.resetUnits([]);
                        WORLD.playerProgression.overallXp = OVERALL_PROGRESSION_SETTINGS.maxXp;
                        const COLS = Math.ceil(Math.sqrt(count * 1.4)),
                            ROWS = Math.ceil(count / COLS);
                        for (let i = 0; i < count; i++) {
                            const UNIT = WORLD.spawn(
                                i % 10,
                                1,
                                ((i % COLS) - (COLS - 1) / 2) * 0.65,
                                (Math.floor(i / COLS) - (ROWS - 1) / 2) * 0.65,
                            );
                            CHECK(UNIT, `spawn rejected ${i}/${count}`);
                            UNIT.z = 0;
                            UNIT.vz = 0;
                            UNIT.dropLanded = true;
                        }
                        SESSION.paused = false;
                        SESSION.pausedDurationMs = 0;
                        SESSION.lastFrameClockMs = null;
                        SESSION.lastCaptureClockMs = 0;
                        SESSION.presentationOriginWallMs = 0;
                        SESSION.loop.resetTiming();
                        let clock = 1000000;
                        clockPhase = 'manual';
                        SESSION.pulse(clock);
                        if (battle) {
                            WORLD.playerProgression.towerBest = 99;
                            CHECK(WORLD.startTower(100), 'Cannot start real tower encounter');
                            // Arrange gate arrival only; deployment and combat run normally.
                            WORLD.finishMarch();
                            for (let tick = 0; tick < 80; tick++) {
                                clock += 50;
                                SESSION.pulse(clock);
                            }
                        }
                        SESSION.capturePresentation('reset');
                        R.resetZoom();
                        R.cameraReturning = false;
                        R.towerShotUntil = 0;
                        const INFO = GL.getExtension('WEBGL_debug_renderer_info'),
                            GPU = GL.getParameter(INFO?.UNMASKED_RENDERER_WEBGL ?? GL.RENDERER),
                            TIMER = GL.getExtension('EXT_disjoint_timer_query_webgl2');
                        const PREPARATION = R.unitSprites.stats();
                        CHECK(R.unitArtMode === expectedBackend, 'Production rendering code setting');
                        if (expectedBackend === 'vector') {
                            CHECK(
                                PREPARATION.bakeCount === 0 &&
                                    PREPARATION.imageBytes === 0 &&
                                    PREPARATION.manifestEntries === 0,
                                'Vector code setting prepared sprite images',
                            );
                        }
                        const LOADS_AFTER_PREPARATION = globalThis.__unitSpriteMeter.loaderCalls;
                        const COUNTERS = {
                            imageUploads: 0,
                            imageUploadBytes: 0,
                            imageBakeDraws: 0,
                            deviceDrawCpuMs: 0,
                            meshSubmitCpuMs: 0,
                        };
                        const ORIGINAL_DRAW = R.device.draw.bind(R.device),
                            ORIGINAL_UPDATE = R.device.updateTexture.bind(R.device),
                            ORIGINAL_CREATE = R.device.createTexture.bind(R.device);
                        R.device.draw = (...args) => {
                            if (R.device.renderTargets.get(R.device.activeRenderTarget)?.format === 'rgba') {
                                COUNTERS.imageBakeDraws++;
                            }
                            const START = performance.now();
                            try {
                                return ORIGINAL_DRAW(...args);
                            } finally {
                                COUNTERS.deviceDrawCpuMs += performance.now() - START;
                            }
                        };
                        R.device.updateTexture = (handle, source, options) => {
                            COUNTERS.imageUploads++;
                            COUNTERS.imageUploadBytes +=
                                (options?.width ?? source.width ?? handle.width) *
                                (options?.height ?? source.height ?? handle.height) *
                                4;
                            return ORIGINAL_UPDATE(handle, source, options);
                        };
                        R.device.createTexture = (source, options) => {
                            COUNTERS.imageUploads++;
                            COUNTERS.imageUploadBytes += source.width * source.height * 4;
                            return ORIGINAL_CREATE(source, options);
                        };
                        let submitDepth = 0;
                        for (const NAME of ['drawMesh', 'flush']) {
                            const ORIGINAL = R.ctx.meshRenderer[NAME].bind(R.ctx.meshRenderer);
                            R.ctx.meshRenderer[NAME] = (...args) => {
                                const OUTER = submitDepth++ === 0,
                                    START = performance.now();
                                try {
                                    return ORIGINAL(...args);
                                } finally {
                                    submitDepth--;
                                    if (OUTER) {
                                        COUNTERS.meshSubmitCpuMs += performance.now() - START;
                                    }
                                }
                            };
                        }
                        const FRAMES = [],
                            PENDING = [];
                        let lastRaf = null;
                        function collectQueries() {
                            const DISJOINT = TIMER && GL.getParameter(TIMER.GPU_DISJOINT_EXT);
                            for (let i = PENDING.length - 1; i >= 0; i--) {
                                const ITEM = PENDING[i];
                                if (DISJOINT || GL.getQueryParameter(ITEM.query, GL.QUERY_RESULT_AVAILABLE)) {
                                    ITEM.frame.gpuStatus = DISJOINT ? 'disjoint' : 'valid';
                                    ITEM.frame.gpuMs = DISJOINT
                                        ? null
                                        : GL.getQueryParameter(ITEM.query, GL.QUERY_RESULT) / 1e6;
                                    GL.deleteQuery(ITEM.query);
                                    PENDING.splice(i, 1);
                                }
                            }
                        }
                        const PLAYER_METRICS = () => {
                            const VALUES = { fullSampleMs: 0, partialSampleMs: 0, fullSamples: 0, partialQueries: 0 };
                            for (const PLAYER of R.vectorPlayers.values()) {
                                for (const KEY of Object.keys(VALUES)) {
                                    VALUES[KEY] += PLAYER.poseMetrics[KEY] || 0;
                                }
                            }
                            return VALUES;
                        };
                        for (let i = 0; i < warmup + samples; i++) {
                            const RAF_TIME = await NEXT();
                            collectQueries();
                            for (const KEY of Object.keys(COUNTERS)) {
                                COUNTERS[KEY] = 0;
                            }
                            clock += 50;
                            const CPU_START = performance.now();
                            SESSION.pulse(clock);
                            const PULSE_END = performance.now();
                            const DISPLAY = SESSION.presentation(clock);
                            const DISPLAY_END = performance.now();
                            const PLAYER_BEFORE = PLAYER_METRICS();
                            const QUERY = i >= warmup && TIMER ? GL.createQuery() : null;
                            if (QUERY) {
                                GL.beginQuery(TIMER.TIME_ELAPSED_EXT, QUERY);
                            }
                            const RENDER_START = performance.now();
                            R.render(DISPLAY, null, DISPLAY.displayTimeMs);
                            const RENDER_END = performance.now();
                            if (QUERY) {
                                GL.endQuery(TIMER.TIME_ELAPSED_EXT);
                            }
                            const PLAYER_AFTER = PLAYER_METRICS();
                            CHECK(GL.getError() === GL.NO_ERROR, 'frame GL error');
                            if (i >= warmup) {
                                const FRAME = {
                                    clock,
                                    cpuTotalMs: RENDER_END - CPU_START,
                                    simulationMs: PULSE_END - CPU_START,
                                    presentationMs: DISPLAY_END - PULSE_END,
                                    renderMs: RENDER_END - RENDER_START,
                                    rafIntervalMs: lastRaf === null ? null : RAF_TIME - lastRaf,
                                    ...COUNTERS,
                                    animationFullMs: PLAYER_AFTER.fullSampleMs - PLAYER_BEFORE.fullSampleMs,
                                    animationPartialMs: PLAYER_AFTER.partialSampleMs - PLAYER_BEFORE.partialSampleMs,
                                    partialQueries: PLAYER_AFTER.partialQueries - PLAYER_BEFORE.partialQueries,
                                    gpuStatus: QUERY ? 'pending' : 'unsupported',
                                    gpuMs: null,
                                    sprite: R.unitSprites.stats(),
                                    device: { ...R.device.stats },
                                    mesh: R.ctx.stats().mesh,
                                    actors: R.actors.length,
                                    culledActors: R.actors.filter((actor) => actor.culled).length,
                                    combatPhases: Object.fromEntries(
                                        ['idle', 'windup', 'active', 'recover'].map((phase) => [
                                            phase,
                                            DISPLAY.units.filter((unit) => unit.ability.phase === phase).length,
                                        ]),
                                    ),
                                    projectiles: WORLD.projectiles.length,
                                    visibleBosses: R.displayBosses.length,
                                    sourceLoaderCalls:
                                        globalThis.__unitSpriteMeter.loaderCalls - LOADS_AFTER_PREPARATION,
                                };
                                if (battle) {
                                    const HASH = await crypto.subtle.digest(
                                        'SHA-256',
                                        new TextEncoder().encode(JSON.stringify(SNAPSHOT(WORLD))),
                                    );
                                    FRAME.authoritySha256 = [...new Uint8Array(HASH)]
                                        .map((byte) => byte.toString(16).padStart(2, '0'))
                                        .join('');
                                }
                                FRAMES.push(FRAME);
                                if (QUERY) {
                                    PENDING.push({ query: QUERY, frame: FRAME });
                                }
                            }
                            lastRaf = RAF_TIME;
                        }
                        for (let poll = 0; PENDING.length && poll < 120; poll++) {
                            await NEXT();
                            collectQueries();
                        }
                        for (const ITEM of PENDING) {
                            GL.deleteQuery(ITEM.query);
                        }
                        const DISPLAY = SESSION.presentation(clock),
                            BEFORE = JSON.stringify(SNAPSHOT(WORLD));
                        R.render(DISPLAY, null, DISPLAY.displayTimeMs);
                        CHECK(BEFORE === JSON.stringify(SNAPSHOT(WORLD)), 'render changed authoritative snapshot');
                        CHECK(R.unitSprites.bakeCount === PREPARATION.bakeCount, 'ordinary frames rebaked');
                        CHECK(
                            FRAMES.every((frame) => frame.imageUploads === 0 && frame.imageBakeDraws === 0),
                            'steady image upload/bake',
                        );
                        CHECK(
                            globalThis.__unitSpriteMeter.loaderCalls === LOADS_AFTER_PREPARATION,
                            'Steady render called the SVG compile loader',
                        );
                        SESSION.pulse = ORIGINAL_PULSE;
                        return {
                            clockTrace: CLOCK_TRACE,
                            renderingCodeSetting: R.unitArtMode,
                            gpu: GPU,
                            width: R.canvas.width,
                            height: R.canvas.height,
                            dpr: devicePixelRatio,
                            preparation: PREPARATION,
                            allocationMeter: { ...globalThis.__unitSpriteMeter },
                            jsHeapBytesApprox: performance.memory?.usedJSHeapSize ?? null,
                            final: R.unitSprites.stats(),
                            camera: { zoom: R.zoom, scale: R.scale, offset: [...R.offset], pan: { ...R.pan } },
                            frames: FRAMES,
                            authoritativeSnapshot: BEFORE,
                            renderDidNotMutate: true,
                            visibleBosses: R.displayBosses.length,
                            ownedUnits: WORLD.units.length,
                            manifest: R.unitSprites.manifest,
                            errorVisible: !document.getElementById('error').hidden,
                        };
                    },
                    {
                        count: COUNT,
                        warmup: WARMUP,
                        samples: SAMPLES,
                        battle: BATTLE,
                        expectedBackend: BACKEND,
                        auditClocks: !BENCHMARK,
                    },
                );
                assert.equal(RESULT.errorVisible, false);
                if (!BENCHMARK && BACKEND === 'sprite') {
                    const CONTINUITY = await PAGE.evaluate(async () => {
                        const { unitSpriteContinuityScenario: SCENARIO } =
                            await import('/tests/unit-sprite-continuity-scenario.js');
                        return SCENARIO(BUDMORI);
                    }).catch(async (error) => {
                        const FAILURE = await PAGE.evaluate(() => globalThis.__unitSpriteContinuityFailure);
                        if (FAILURE) {
                            fs.writeFileSync(
                                path.join(OUTPUT, 'native-repeat-failed.png'),
                                Buffer.from(FAILURE.image, 'base64'),
                            );
                            delete FAILURE.image;
                            fs.writeFileSync(
                                path.join(OUTPUT, 'native-repeat-failed.json'),
                                JSON.stringify(FAILURE, null, 2),
                            );
                        }
                        throw error;
                    });
                    fs.writeFileSync(
                        path.join(OUTPUT, 'continuous-overlap.png'),
                        Buffer.from(CONTINUITY.image, 'base64'),
                    );
                    delete CONTINUITY.image;
                    RESULT.continuity = CONTINUITY;
                    const VISUAL = await PAGE.evaluate(async () => {
                        const { unitSpriteVisualScenario: SCENARIO } =
                            await import('/tests/unit-sprite-visual-scenario.js');
                        return SCENARIO(BUDMORI);
                    });
                    for (const IMAGE of VISUAL.images) {
                        fs.writeFileSync(
                            path.join(OUTPUT, IMAGE.name + '-vector.png'),
                            Buffer.from(IMAGE.vector, 'base64'),
                        );
                        fs.writeFileSync(
                            path.join(OUTPUT, IMAGE.name + '-sprite.png'),
                            Buffer.from(IMAGE.sprite, 'base64'),
                        );
                    }
                    delete VISUAL.images;
                    RESULT.visual = VISUAL;
                }
                if (process.env.BUDMORI_HARDWARE_RENDERING === '1') {
                    assert.doesNotMatch(RESULT.gpu, /swiftshader|software/i);
                }
                const STATE_HASH = createHash('sha256').update(RESULT.authoritativeSnapshot).digest('hex');
                if (!BENCHMARK) {
                    fs.writeFileSync(path.join(OUTPUT, `authority-${BACKEND}.json`), RESULT.authoritativeSnapshot);
                }
                delete RESULT.authoritativeSnapshot;
                REPORT.runs.push({ round, backend: BACKEND, count: COUNT, stateSha256: STATE_HASH, ...RESULT });
                fs.writeFileSync(path.join(OUTPUT, REPORT_NAME), JSON.stringify(REPORT, null, 2));
                if (!BENCHMARK) {
                    assert.deepEqual(
                        RESULT.clockTrace.filter((entry) => entry.phase === 'manual').map((entry) => entry.now),
                        Array.from(
                            { length: WARMUP + SAMPLES + 1 + (BATTLE ? 80 : 0) },
                            (_, index) => 1000000 + index * 50,
                        ),
                        'Live app RAF entered the controlled fixture clock',
                    );
                }
                if (RESULT.visual) {
                    assert.equal(RESULT.visual.cases.length, 46, 'Every visual contract case ran');
                }
                console.log(
                    JSON.stringify({
                        round,
                        backend: BACKEND,
                        count: COUNT,
                        preparation: RESULT.preparation,
                        final: RESULT.final,
                    }),
                );
                await CONTEXT.close();
            }
            const PAIR = REPORT.runs.filter((run) => run.round === round && run.count === COUNT);
            assert.equal(PAIR[0].stateSha256, PAIR[1].stateSha256, 'Backend changed authority');
            assert.deepEqual(PAIR[0].camera, PAIR[1].camera, 'Backend changed camera');
            if (BATTLE) {
                assert.deepEqual(
                    PAIR[0].frames.map((frame) => frame.authoritySha256),
                    PAIR[1].frames.map((frame) => frame.authoritySha256),
                    'Backend changed per-frame battle authority',
                );
            }
        }
    }
    assert.deepEqual(ERRORS, []);
    REPORT.status = 'PASS';
    REPORT.errors = ERRORS;
    fs.writeFileSync(path.join(OUTPUT, REPORT_NAME), JSON.stringify(REPORT, null, 2));
} finally {
    await browser?.close();
    await new Promise((resolve) => SERVER.close(resolve));
}
