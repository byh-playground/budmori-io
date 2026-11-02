import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const OUTPUT_OPTION = process.argv.find((value) => value.startsWith('--output='));
const OUTPUT = OUTPUT_OPTION
    ? path.resolve(OUTPUT_OPTION.slice('--output='.length))
    : path.join(ROOT, 'tests/output/unit-sprites');
// Logic only: both production art settings render the same fixed 20-unit farm and must leave the model unchanged.
const COUNT = 20;
const FRAMES = 16;
const BACKENDS = ['vector', 'sprite'];
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
            'src/render/unit-art.js',
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
    count: COUNT,
    frames: FRAMES,
    scope: 'Real Garden/FarmSession/renderer population fixture; fixed seed/camera/clock.',
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
    for (const BACKEND of BACKENDS) {
        const CONTEXT = await browser.newContext({
            locale: 'ko-KR',
            serviceWorkers: 'block',
            viewport: { width: 1100, height: 850 },
            deviceScaleFactor: 1,
        });
        const PAGE = await CONTEXT.newPage();
        await PAGE.addInitScript(() => {
            const METER = (globalThis.__unitSpriteMeter = { loaderCalls: 0 });
            let loader;
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
        await PAGE.route('**/src/render/unit-art.js', (route) => {
            const SOURCE = fs.readFileSync(path.join(ROOT, 'src/render/unit-art.js'), 'utf8');
            assert.match(SOURCE, /UNIT_ART = 'vector'/);
            return route.fulfill({
                contentType: 'text/javascript',
                body: SOURCE.replace("UNIT_ART = 'vector'", `UNIT_ART = '${BACKEND}'`),
            });
        });
        await PAGE.goto(`http://127.0.0.1:${SERVER.address().port}/index.html`);
        await PAGE.waitForFunction(() => globalThis.BUDMORI);
        await PAGE.locator('#newGame').click();
        await PAGE.waitForFunction(() => BUDMORI.runtime.presentationView?.units.length);
        const RESULT = await PAGE.evaluate(
            async ({ count, frames, expectedBackend }) => {
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
                SESSION.pulse = function (now) {
                    CLOCK_TRACE.push({ phase: clockPhase, now, tick: WORLD.simulationTick });
                    return ORIGINAL_PULSE.call(this, now);
                };
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
                SESSION.capturePresentation('reset');
                R.resetZoom();
                R.cameraReturning = false;
                R.towerShotUntil = 0;
                const INFO = GL.getExtension('WEBGL_debug_renderer_info'),
                    GPU = GL.getParameter(INFO?.UNMASKED_RENDERER_WEBGL ?? GL.RENDERER);
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
                // Steady frames must not upload or bake images: count those calls, nothing is timed.
                const COUNTERS = { imageUploads: 0, imageBakeDraws: 0 };
                const ORIGINAL_DRAW = R.device.draw.bind(R.device),
                    ORIGINAL_UPDATE = R.device.updateTexture.bind(R.device),
                    ORIGINAL_CREATE = R.device.createTexture.bind(R.device);
                R.device.draw = (...args) => {
                    if (R.device.renderTargets.get(R.device.activeRenderTarget)?.format === 'rgba') {
                        COUNTERS.imageBakeDraws++;
                    }
                    return ORIGINAL_DRAW(...args);
                };
                R.device.updateTexture = (...args) => {
                    COUNTERS.imageUploads++;
                    return ORIGINAL_UPDATE(...args);
                };
                R.device.createTexture = (...args) => {
                    COUNTERS.imageUploads++;
                    return ORIGINAL_CREATE(...args);
                };
                let imageUploads = 0,
                    imageBakeDraws = 0;
                for (let i = 0; i < frames; i++) {
                    await NEXT();
                    COUNTERS.imageUploads = 0;
                    COUNTERS.imageBakeDraws = 0;
                    clock += 50;
                    SESSION.pulse(clock);
                    const DISPLAY = SESSION.presentation(clock);
                    R.render(DISPLAY, null, DISPLAY.displayTimeMs);
                    CHECK(GL.getError() === GL.NO_ERROR, 'frame GL error');
                    imageUploads += COUNTERS.imageUploads;
                    imageBakeDraws += COUNTERS.imageBakeDraws;
                }
                const DISPLAY = SESSION.presentation(clock),
                    BEFORE = JSON.stringify(SNAPSHOT(WORLD));
                R.render(DISPLAY, null, DISPLAY.displayTimeMs);
                CHECK(BEFORE === JSON.stringify(SNAPSHOT(WORLD)), 'render changed authoritative snapshot');
                CHECK(R.unitSprites.bakeCount === PREPARATION.bakeCount, 'ordinary frames rebaked');
                CHECK(imageUploads === 0 && imageBakeDraws === 0, 'steady image upload/bake');
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
                    final: R.unitSprites.stats(),
                    camera: { zoom: R.zoom, scale: R.scale, offset: [...R.offset], pan: { ...R.pan } },
                    authoritativeSnapshot: BEFORE,
                    renderDidNotMutate: true,
                    visibleBosses: R.displayBosses.length,
                    ownedUnits: WORLD.units.length,
                    manifest: R.unitSprites.manifest,
                    errorVisible: !document.getElementById('error').hidden,
                };
            },
            { count: COUNT, frames: FRAMES, expectedBackend: BACKEND },
        );
        assert.equal(RESULT.errorVisible, false);
        if (BACKEND === 'vector') {
            const DEPTH = await PAGE.evaluate(async () => {
                const { unitDepthBatchingScenario: SCENARIO } = await import('/tests/unit-depth-batching-scenario.js');
                return SCENARIO(BUDMORI);
            }).catch(async (error) => {
                const FAILURE = await PAGE.evaluate(() => globalThis.__unitDepthBatchingFailure);
                if (FAILURE) {
                    for (const IMAGE of FAILURE.images) {
                        for (const PHASE of ['before', 'after']) {
                            fs.writeFileSync(
                                path.join(OUTPUT, `depth-${IMAGE.name}-${PHASE}.png`),
                                Buffer.from(IMAGE[PHASE], 'base64'),
                            );
                        }
                    }
                    delete FAILURE.images;
                    fs.writeFileSync(path.join(OUTPUT, 'depth-failure.json'), JSON.stringify(FAILURE, null, 2));
                }
                throw error;
            });
            for (const IMAGE of DEPTH.images) {
                for (const PHASE of ['before', 'after']) {
                    fs.writeFileSync(
                        path.join(OUTPUT, `depth-${IMAGE.name}-${PHASE}.png`),
                        Buffer.from(IMAGE[PHASE], 'base64'),
                    );
                }
            }
            delete DEPTH.images;
            RESULT.depthBatching = DEPTH;
        }
        if (BACKEND === 'sprite') {
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
                    fs.writeFileSync(path.join(OUTPUT, 'native-repeat-failed.json'), JSON.stringify(FAILURE, null, 2));
                }
                throw error;
            });
            fs.writeFileSync(path.join(OUTPUT, 'continuous-overlap.png'), Buffer.from(CONTINUITY.image, 'base64'));
            delete CONTINUITY.image;
            RESULT.continuity = CONTINUITY;
            const VISUAL = await PAGE.evaluate(async () => {
                const { unitSpriteVisualScenario: SCENARIO } = await import('/tests/unit-sprite-visual-scenario.js');
                return SCENARIO(BUDMORI);
            });
            for (const IMAGE of VISUAL.images) {
                fs.writeFileSync(path.join(OUTPUT, IMAGE.name + '-vector.png'), Buffer.from(IMAGE.vector, 'base64'));
                fs.writeFileSync(path.join(OUTPUT, IMAGE.name + '-sprite.png'), Buffer.from(IMAGE.sprite, 'base64'));
            }
            delete VISUAL.images;
            RESULT.visual = VISUAL;
        }
        if (process.env.BUDMORI_HARDWARE_RENDERING === '1') {
            assert.doesNotMatch(RESULT.gpu, /swiftshader|software/i);
        }
        const STATE_HASH = createHash('sha256').update(RESULT.authoritativeSnapshot).digest('hex');
        fs.writeFileSync(path.join(OUTPUT, `authority-${BACKEND}.json`), RESULT.authoritativeSnapshot);
        delete RESULT.authoritativeSnapshot;
        REPORT.runs.push({ backend: BACKEND, count: COUNT, stateSha256: STATE_HASH, ...RESULT });
        fs.writeFileSync(path.join(OUTPUT, 'report.json'), JSON.stringify(REPORT, null, 2));
        assert.deepEqual(
            RESULT.clockTrace.filter((entry) => entry.phase === 'manual').map((entry) => entry.now),
            Array.from({ length: FRAMES + 1 }, (_, index) => 1000000 + index * 50),
            'Live app RAF entered the controlled fixture clock',
        );
        if (RESULT.visual) {
            assert.equal(RESULT.visual.cases.length, 46, 'Every visual contract case ran');
        }
        console.log(
            JSON.stringify({
                backend: BACKEND,
                count: COUNT,
                preparation: RESULT.preparation,
                final: RESULT.final,
            }),
        );
        await CONTEXT.close();
    }
    const [VECTOR, SPRITE] = REPORT.runs;
    assert.equal(VECTOR.stateSha256, SPRITE.stateSha256, 'Backend changed authority');
    assert.deepEqual(VECTOR.camera, SPRITE.camera, 'Backend changed camera');
    assert.deepEqual(ERRORS, []);
    REPORT.status = 'PASS';
    REPORT.errors = ERRORS;
    fs.writeFileSync(path.join(OUTPUT, 'report.json'), JSON.stringify(REPORT, null, 2));
} finally {
    await browser?.close();
    await new Promise((resolve) => SERVER.close(resolve));
}
