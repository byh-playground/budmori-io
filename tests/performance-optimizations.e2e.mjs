// Paired CPU measurements in one real browser process. One bounded case per invocation:
// BUDMORI_PERF_BASE_ROOT=/immutable/archive node tests/performance-optimizations.e2e.mjs render 500 settled offscreen
// Modes: model, ui, render, hidden. Counts: 100, 250, 500. Phases: dense, settled. Views: default, offscreen.
// Native app RAF is suspended for this harness; these are operation CPU costs, not RAF/device FPS.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = fileURLToPath(new URL('../', import.meta.url)),
    BASE_COMMIT = '881fd7c9b97efc00ca2e2a46c1ee5b069f7ccdfe',
    MODE = process.argv[2] || 'render',
    COUNT = Number(process.argv[3] || 500),
    PHASE = process.argv[4] || 'settled',
    VIEW = process.argv[5] || (MODE === 'render' || MODE === 'hidden' ? 'offscreen' : 'default'),
    ROUNDS = Number(process.env.BUDMORI_PERF_ROUNDS || 2),
    SAMPLES = Number(
        process.env.BUDMORI_PERF_SAMPLES ||
            (MODE === 'hidden'
                ? 40
                : MODE === 'render'
                  ? 80
                  : MODE === 'model'
                    ? PHASE === 'dense'
                        ? 40
                        : 120
                    : PHASE === 'dense'
                      ? 120
                      : 180),
    ),
    WARMUP = MODE === 'render' ? 12 : MODE === 'ui' && PHASE === 'settled' ? 60 : 0,
    CASE = `${MODE}-${COUNT}-${PHASE}-${VIEW}`,
    OUTPUT_NAME = process.env.BUDMORI_PERF_OUTPUT_DIR || 'performance-optimizations',
    OUTPUT = path.join(ROOT, 'tests/output', OUTPUT_NAME, CASE),
    ROOTS = { base: path.resolve(process.env.BUDMORI_PERF_BASE_ROOT || '../baseline'), candidate: path.resolve(ROOT) },
    TYPES = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.svg': 'image/svg+xml',
    },
    ACCESSOR = '\nglobalThis.__budmoriPerfAccess = { sync, start };\n',
    MODULES = new Map(),
    ERRORS = [],
    STARTED = Date.now(),
    REPORT = {
        status: 'running',
        startedAt: new Date().toISOString(),
        baseCommit: BASE_COMMIT,
        candidateHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(),
        candidateUncommittedSourceFiles: execFileSync('git', ['diff', '--name-only', '--', 'src'], {
            cwd: ROOT,
            encoding: 'utf8',
        })
            .trim()
            .split('\n')
            .filter(Boolean),
        case: CASE,
        protocol: {
            mode: MODE,
            count: COUNT,
            reserves: COUNT,
            totalOwned: COUNT * 2,
            seed: 731,
            tps: 20,
            phase: PHASE,
            view: MODE === 'render' || MODE === 'hidden' ? VIEW : null,
            rounds: ROUNDS,
            samples: SAMPLES,
            warmup: WARMUP,
            order: 'base/candidate then candidate/base, fresh context per run, same browser process',
            fixture:
                'Mature T1 mixed nine species. Production reserve deployment; durable low-damage native boss. Dense begins at tick 0; settled begins after 120 native ticks. Native scatter command for model/UI.',
            controls:
                'Same source bootstrap, pinned SDK and native functions. A test-only appended accessor exposes existing sync/start without replacing their implementations. Only the app automatic RAF is suspended; model and UI clocks are driven explicitly.',
            limitations: [
                'Operation CPU measurements exclude the browser compositor and GPU completion. No FPS claim.',
                'Windows desktop Chromium with SwiftShader; no physical mobile-device measurement.',
                'Render repeats one identical presentation snapshot, logical render clock and camera, including native seek/draw. Each sample waits for RAF outside the timer to avoid a tight-loop submission backlog; camera boundary and moving-animation coverage is separate.',
                'UI reports native presentation and sync separately and their combined CPU, excluding relic docks; 60 Hz calls with native session pulses at the same synthetic wall-clock sequence. Work moved from sync into presentation remains in the combined result.',
                'Heap used before/after is a noisy retained-heap delta, not an allocation or GC count. GC pause duration is not measured.',
                'Method counters are enabled only in a separate untimed observation pass to keep their overhead out of timing samples.',
                'Hidden mode is an untimed integration observation: each native 20 Hz session tick is followed by native offscreen rendering, and attacks/damage are matched to units whose draw was actually omitted in that frame.',
                'candidateHead names the repository HEAD; sourceTrees pins every actually loaded source file, including any uncommitted source change.',
            ],
        },
        runs: [],
        comparisons: [],
        errors: ERRORS,
    };
assert.ok(['model', 'ui', 'render', 'hidden'].includes(MODE));
assert.ok([100, 250, 500].includes(COUNT));
assert.ok(['dense', 'settled'].includes(PHASE));
assert.ok(['default', 'offscreen'].includes(VIEW));
assert.ok(MODE !== 'hidden' || VIEW === 'offscreen');
assert.match(OUTPUT_NAME, /^[a-z0-9-]+$/);
assert.ok(Number.isInteger(ROUNDS) && ROUNDS > 0 && ROUNDS <= 3);
assert.notEqual(ROOTS.base, ROOTS.candidate);
fs.mkdirSync(OUTPUT, { recursive: true });
const HASH = (value) =>
    createHash('sha256')
        .update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value))
        .digest('hex');
function save() {
    REPORT.elapsedMs = Date.now() - STARTED;
    fs.writeFileSync(path.join(OUTPUT, 'report.json'), JSON.stringify(REPORT, null, 2) + '\n');
}
function summary(values) {
    const SORTED = [...values].sort((a, b) => a - b),
        Q = (p) => SORTED[Math.max(0, Math.ceil(SORTED.length * p) - 1)];
    return {
        count: values.length,
        meanMs: values.reduce((a, b) => a + b, 0) / values.length,
        medianMs: Q(0.5),
        p95Ms: Q(0.95),
        p99Ms: Q(0.99),
        maxMs: Q(1),
    };
}
function sourceFiles(root) {
    const FILES = [];
    const VISIT = (directory) => {
        for (const ENTRY of fs.readdirSync(directory, { withFileTypes: true })) {
            const FILE = path.join(directory, ENTRY.name);
            if (ENTRY.isDirectory()) {
                VISIT(FILE);
            } else if (ENTRY.isFile() && ENTRY.name.endsWith('.js')) {
                FILES.push([path.relative(root, FILE).replaceAll(path.sep, '/'), HASH(fs.readFileSync(FILE))]);
            }
        }
    };
    VISIT(path.join(root, 'src'));
    return FILES.sort((a, b) => a[0].localeCompare(b[0]));
}
// Verify the baseline files actually match the pinned main commit, not a mutable branch label.
for (const FILE of [
    'index.html',
    'src/farm-app.js',
    'src/farm-model.js',
    'src/farm-renderer.js',
    'src/farm-render-units.js',
]) {
    assert.equal(
        HASH(fs.readFileSync(path.join(ROOTS.base, FILE))),
        HASH(execFileSync('git', ['show', `${BASE_COMMIT}:${FILE}`], { cwd: ROOT, maxBuffer: 8 * 1024 * 1024 })),
        `immutable baseline ${FILE}`,
    );
}
REPORT.sourceHashes = Object.fromEntries(
    Object.entries(ROOTS).map(([name, root]) => [
        name,
        Object.fromEntries(
            ['src/farm-app.js', 'src/farm-model.js', 'src/farm-renderer.js', 'src/farm-render-units.js'].map((file) => [
                file,
                HASH(fs.readFileSync(path.join(root, file))),
            ]),
        ),
    ]),
);
REPORT.testAccessorSha256 = HASH(ACCESSOR);
REPORT.sourceTrees = Object.fromEntries(Object.entries(ROOTS).map(([name, root]) => [name, sourceFiles(root)]));
REPORT.harnessSha256 = HASH(fs.readFileSync(fileURLToPath(import.meta.url)));
for (const DIRECTORY of Object.values(ROOTS)) {
    const HTML = fs.readFileSync(path.join(DIRECTORY, 'index.html'), 'utf8'),
        MANIFEST = JSON.parse(
            HTML.match(/<script id="bloom-runtime-manifest" type="application\/json">(.*?)<\/script>/s)[1],
        );
    for (const MODULE of MANIFEST.modules) {
        const BYTES = fs.readFileSync(path.join(DIRECTORY, 'vendor/upstream', MODULE.name + '.js'));
        assert.equal(HASH(BYTES), MODULE.sha256);
        MODULES.set(MODULE.url, BYTES);
    }
}
const SERVER = http.createServer((request, response) => {
    const URL_LOCAL = new URL(request.url, 'http://localhost'),
        MATCH = URL_LOCAL.pathname.match(/^\/(base|candidate)\/(.*)$/),
        DIRECTORY = MATCH && ROOTS[MATCH[1]],
        FILE = DIRECTORY && path.resolve(DIRECTORY, decodeURIComponent(MATCH[2] || 'index.html'));
    if (URL_LOCAL.pathname.endsWith('/favicon.ico')) {
        return response.writeHead(204).end();
    }
    if (!FILE || !FILE.startsWith(DIRECTORY + path.sep) || !fs.existsSync(FILE) || !fs.statSync(FILE).isFile()) {
        return response.writeHead(404).end();
    }
    response.setHeader('content-type', TYPES[path.extname(FILE)] || 'application/octet-stream');
    let bytes = fs.readFileSync(FILE);
    if (FILE === path.join(DIRECTORY, 'src/farm-app.js')) {
        bytes = Buffer.concat([bytes, Buffer.from(ACCESSOR)]);
    }
    response.end(bytes);
});
let browser;
let deadline;
async function run(variant, round, origin) {
    assert.deepEqual(
        sourceFiles(ROOTS[variant]),
        REPORT.sourceTrees[variant],
        'source files must remain fixed throughout paired measurement',
    );
    const CONTEXT = await browser.newContext({
            viewport: { width: 1100, height: 780 },
            deviceScaleFactor: 1,
            serviceWorkers: 'block',
        }),
        PAGE = await CONTEXT.newPage();
    PAGE.setDefaultTimeout(30000);
    PAGE.on('pageerror', (error) => ERRORS.push(`${variant}: ${error}`));
    PAGE.on('console', (message) => {
        if (message.type() === 'error' || message.text().includes('loop stopped')) {
            ERRORS.push(`${variant}: ${message.text()}`);
        }
    });
    await CONTEXT.route('**/*', (route) => {
        const URL_LOCAL = route.request().url();
        if (URL_LOCAL.startsWith(origin + '/')) {
            return route.continue();
        }
        if (MODULES.has(URL_LOCAL)) {
            return route.fulfill({
                body: MODULES.get(URL_LOCAL),
                contentType: 'text/javascript',
                headers: { 'access-control-allow-origin': '*' },
            });
        }
        ERRORS.push(`Unexpected network: ${URL_LOCAL}`);
        return route.abort();
    });
    await PAGE.addInitScript(() => {
        const RAF = globalThis.requestAnimationFrame.bind(globalThis);
        globalThis.requestAnimationFrame = (callback) => (callback.name === 'frame' ? 0 : RAF(callback));
    });
    await PAGE.goto(`${origin}/${variant}/index.html`);
    await PAGE.waitForFunction(() => Boolean(globalThis.BUDMORI && globalThis.__budmoriPerfAccess));
    const RESULT = await PAGE.evaluate(
        async ({ count, phase, mode, view, samples, warmup }) => {
            const { Garden: GARDEN } = await import('./src/farm-model.js'),
                { snapshot: SNAPSHOT } = await import('./src/farm-state.js'),
                { overallXpForLevel: XP } = await import('./src/player-progression.js'),
                WORLD = new GARDEN(731),
                SHA = async (value) =>
                    Array.from(
                        new Uint8Array(
                            await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value))),
                        ),
                        (byte) => byte.toString(16).padStart(2, '0'),
                    ).join('');
            WORLD.resetUnits();
            WORLD.playerProgression.overallXp = XP((count - 100) / 10 + 1);
            WORLD.playerProgression.towerBest = 100;
            WORLD.setWorkBasisPoints(0);
            for (let index = 0; index < count * 2; index++) {
                const UNIT = WORLD.spawn(index % 9, 1, 0, 0);
                UNIT.growthElapsed = UNIT.growthDuration;
                UNIT.dropLanded = true;
            }
            if (!WORLD.startTower(1) || !WORLD.finishMarch()) {
                throw new Error('native tower fixture did not start');
            }
            for (const BOSS of WORLD.bosses) {
                BOSS.setBaseStats({ maxHp: 1e9, attackPower: 0.01 });
                BOSS.setHealth(BOSS.maxHp);
                BOSS.z = 0;
                BOSS.dropLanded = true;
            }
            for (let index = 0; index < count; index++) {
                const ANGLE = index * 2.399963229728653,
                    RADIUS = WORLD.boss.radius + 1 + Math.sqrt(index) * 0.2;
                if (
                    !WORLD._deployReservedUnit(
                        index % 9,
                        WORLD.boss.x + Math.cos(ANGLE) * RADIUS,
                        WORLD.boss.y + Math.sin(ANGLE) * RADIUS,
                    )
                ) {
                    throw new Error('native reserve deployment failed');
                }
            }
            for (const UNIT of WORLD.units) {
                UNIT.z = 0;
                UNIT.dropLanded = true;
            }
            WORLD.farmBossEvent.phase = 'fighting';
            WORLD.setBattleCommand('scatter');
            if (phase === 'settled') {
                for (let index = 0; index < 120; index++) {
                    WORLD.step(0.05);
                }
            }
            const INITIAL = await SHA(SNAPSHOT(WORLD)),
                RAW = [],
                CHECKPOINTS = [],
                NOTICES = [],
                HEAP_BEFORE = performance.memory?.usedJSHeapSize ?? null,
                RESULT_LOCAL = {
                    initialHash: INITIAL,
                    initialTick: WORLD.simulationTick,
                    field: WORLD.fieldFighterCount,
                    reserve: WORLD._benched.size,
                    rawMs: RAW,
                    checkpoints: CHECKPOINTS,
                    counts: {},
                    rawPresentationMs: [],
                    rawPresentationAndUiMs: [],
                    heapBeforeBytes: HEAP_BEFORE,
                };
            WORLD.onNotice.on((notice) => {
                if (notice.kind === 'attack-launch' || notice.kind === 'boss-hit') {
                    NOTICES.push(notice);
                }
            });
            if (mode === 'model') {
                for (let index = 0; index < samples; index++) {
                    const START = performance.now();
                    WORLD.step(0.05);
                    RAW.push(performance.now() - START);
                    if ((index + 1) % 20 === 0) {
                        CHECKPOINTS.push({ tick: WORLD.simulationTick, hash: await SHA(SNAPSHOT(WORLD)) });
                    }
                }
            } else {
                globalThis.__budmoriPerfAccess.start(WORLD, false);
                const SESSION = BUDMORI.runtime,
                    RENDERER = BUDMORI.renderer;
                // Integer 17/16/17 ms boundaries avoid run-specific floating-point
                // cancellation from a different performance.now() epoch per page.
                const START_WALL = Math.ceil(performance.now()) + 100;
                SESSION.pulse(START_WALL);
                if (mode === 'hidden') {
                    const PLAYER_IDS = new Set(
                            WORLD.units.filter((unit) => unit.faction === 'player').map((unit) => unit.id),
                        ),
                        DRAW = RENDERER.unitPresentation.draw,
                        DRAWN = new Set(),
                        CULLED_IDS = new Set(),
                        TICK_NOTICES = [],
                        OBSERVATION = {
                            ticks: samples,
                            renderCalls: 0,
                            unitFramesCulled: 0,
                            attackLaunchesWhileCulled: 0,
                            damageEventsWhileCulled: 0,
                            damageWhileCulled: 0,
                        },
                        OFF = WORLD.onNotice.on((notice) => {
                            if (
                                PLAYER_IDS.has(notice.unit) &&
                                (notice.kind === 'attack-launch' || notice.kind === 'boss-hit')
                            ) {
                                TICK_NOTICES.push(notice);
                            }
                        });
                    let display = SESSION.presentation(START_WALL);
                    RENDERER.render(display, null, WORLD.time * 1000 + 1000);
                    RENDERER.resetZoom();
                    RENDERER.takeCameraControl();
                    RENDERER.zoomAt(1.8 / RENDERER.zoom);
                    RENDERER.setPan(RENDERER.panLimits.maxX, RENDERER.panLimits.maxY);
                    RENDERER.unitPresentation.draw = function (unit, ...args) {
                        DRAWN.add(unit.id);
                        return DRAW.call(this, unit, ...args);
                    };
                    try {
                        for (let index = 0; index < samples; index++) {
                            TICK_NOTICES.length = 0;
                            DRAWN.clear();
                            const NOW = START_WALL + (index + 1) * 50;
                            SESSION.pulse(NOW);
                            display = SESSION.presentation(NOW);
                            RENDERER.render(display, null, WORLD.time * 1000 + 1000);
                            OBSERVATION.renderCalls++;
                            const CULLED = new Set(
                                display.units
                                    .filter((unit) => PLAYER_IDS.has(unit.id) && !DRAWN.has(unit.id))
                                    .map((unit) => unit.id),
                            );
                            OBSERVATION.unitFramesCulled += CULLED.size;
                            for (const ID of CULLED) {
                                CULLED_IDS.add(ID);
                            }
                            for (const NOTICE of TICK_NOTICES) {
                                if (!CULLED.has(NOTICE.unit)) {
                                    continue;
                                }
                                if (NOTICE.kind === 'attack-launch') {
                                    OBSERVATION.attackLaunchesWhileCulled++;
                                } else if (NOTICE.damage > 0) {
                                    OBSERVATION.damageEventsWhileCulled++;
                                    OBSERVATION.damageWhileCulled += NOTICE.damage;
                                }
                            }
                            if ((index + 1) % 10 === 0) {
                                CHECKPOINTS.push({ tick: WORLD.simulationTick, hash: await SHA(SNAPSHOT(WORLD)) });
                            }
                        }
                    } finally {
                        RENDERER.unitPresentation.draw = DRAW;
                        OFF();
                    }
                    OBSERVATION.distinctCulledUnits = CULLED_IDS.size;
                    RESULT_LOCAL.hiddenCombat = OBSERVATION;
                    RESULT_LOCAL.camera = {
                        zoom: RENDERER.zoom,
                        pan: RENDERER.cameraPan,
                        scale: RENDERER.scale,
                        view: [...RENDERER.view],
                        offset: [...RENDERER.offset],
                    };
                } else if (mode === 'ui') {
                    for (let index = 0; index < warmup + samples; index++) {
                        if (index === warmup) {
                            RESULT_LOCAL.measuredStartTick = WORLD.simulationTick;
                        }
                        const NOW = START_WALL + Math.round((index + 1) * (1000 / 60));
                        SESSION.pulse(NOW);
                        const PRESENTATION_START = performance.now(),
                            DISPLAY = SESSION.presentation(NOW),
                            START = performance.now();
                        globalThis.__budmoriPerfAccess.sync(DISPLAY, NOW, []);
                        const END = performance.now();
                        if (index >= warmup) {
                            RAW.push(END - START);
                            RESULT_LOCAL.rawPresentationMs.push(START - PRESENTATION_START);
                            RESULT_LOCAL.rawPresentationAndUiMs.push(END - PRESENTATION_START);
                        }
                        if (index >= warmup && (index + 1 - warmup) % 60 === 0) {
                            CHECKPOINTS.push({ tick: WORLD.simulationTick, hash: await SHA(SNAPSHOT(WORLD)) });
                        }
                    }
                    RESULT_LOCAL.measuredEndTick = WORLD.simulationTick;
                    // Count queries first on unchanged frames, then over another
                    // 60 Hz / 20 TPS second, both outside the timed interval.
                    let owner = WORLD;
                    while (!Object.hasOwn(owner, 'handCounts')) {
                        owner = Object.getPrototypeOf(owner);
                    }
                    const HAND = Object.getOwnPropertyDescriptor(owner, 'handCounts').get;
                    let handCalls = 0,
                        benchEntriesVisited = 0,
                        uiHandCalls = 0,
                        uiBenchEntriesVisited = 0,
                        observingUi = false;
                    Object.defineProperty(WORLD, 'handCounts', {
                        configurable: true,
                        get() {
                            handCalls++;
                            benchEntriesVisited += this._benched.size;
                            if (observingUi) {
                                uiHandCalls++;
                                uiBenchEntriesVisited += this._benched.size;
                            }
                            return HAND.call(this);
                        },
                    });
                    const DISPLAY = SESSION.presentation(START_WALL + Math.round((warmup + samples) * (1000 / 60)));
                    for (let index = 0; index < 60; index++) {
                        globalThis.__budmoriPerfAccess.sync(
                            DISPLAY,
                            START_WALL + (warmup + samples + index) * (1000 / 60),
                            [],
                        );
                    }
                    const UNCHANGED_CALLS = handCalls,
                        OBSERVED_TICK = WORLD.simulationTick;
                    handCalls = 0;
                    benchEntriesVisited = 0;
                    for (let index = 0; index < 60; index++) {
                        const NOW = START_WALL + Math.round((warmup + samples + index + 1) * (1000 / 60));
                        SESSION.pulse(NOW);
                        observingUi = true;
                        globalThis.__budmoriPerfAccess.sync(SESSION.presentation(NOW), NOW, []);
                        observingUi = false;
                    }
                    delete WORLD.handCounts;
                    RESULT_LOCAL.counts = {
                        observedSyncCalls: 60,
                        handCountsCalls: handCalls,
                        uiHandCountsCalls: uiHandCalls,
                        nativeTickHandCountsCalls: handCalls - uiHandCalls,
                        observedTicks: WORLD.simulationTick - OBSERVED_TICK,
                        unchangedSyncCalls: 60,
                        unchangedHandCountsCalls: UNCHANGED_CALLS,
                        // The unchanged native getter constructs one result Map
                        // and visits every bench Set entry on each invocation.
                        handResultMapsCreated: handCalls,
                        handBenchEntriesVisited: benchEntriesVisited,
                        uiHandResultMapsCreated: uiHandCalls,
                        uiHandBenchEntriesVisited: uiBenchEntriesVisited,
                        reserveLength: WORLD._benched.size,
                    };
                    RESULT_LOCAL.hud = {
                        count: document.getElementById('count').textContent,
                        capacity: document.getElementById('capacity').textContent,
                        allyHealthNow: document.getElementById('allyHealth').getAttribute('aria-valuenow'),
                        allyHealthMax: document.getElementById('allyHealth').getAttribute('aria-valuemax'),
                        allyHealthWidth: document.getElementById('allyHealth').style.width,
                        hand: document.getElementById('hand')?.textContent ?? null,
                    };
                } else {
                    SESSION.paused = true;
                    const DISPLAY = SESSION.presentation(START_WALL),
                        FIXED_NOW = WORLD.time * 1000 + 1000;
                    RESULT_LOCAL.renderClockMs = FIXED_NOW;
                    RESULT_LOCAL.displayTime = DISPLAY.time;
                    RENDERER.render(DISPLAY, null, FIXED_NOW);
                    RENDERER.resetZoom();
                    RENDERER.takeCameraControl();
                    if (view === 'offscreen') {
                        RENDERER.zoomAt(1.8 / RENDERER.zoom);
                        RENDERER.setPan(RENDERER.panLimits.maxX, RENDERER.panLimits.maxY);
                    }
                    const BEFORE = await SHA(SNAPSHOT(WORLD));
                    for (let index = 0; index < warmup + samples; index++) {
                        await new Promise(requestAnimationFrame);
                        const START = performance.now();
                        RENDERER.render(DISPLAY, null, FIXED_NOW);
                        if (index >= warmup) {
                            RAW.push(performance.now() - START);
                        }
                    }
                    const DRAW = RENDERER.unitPresentation.draw,
                        PROJECTILE = RENDERER.projectilePresentation.draw;
                    let unitDraws = 0,
                        projectileDraws = 0;
                    RENDERER.unitPresentation.draw = function (...args) {
                        unitDraws++;
                        return DRAW.apply(this, args);
                    };
                    RENDERER.projectilePresentation.draw = function (...args) {
                        projectileDraws++;
                        return PROJECTILE.apply(this, args);
                    };
                    RENDERER.render(DISPLAY, null, FIXED_NOW);
                    RENDERER.unitPresentation.draw = DRAW;
                    RENDERER.projectilePresentation.draw = PROJECTILE;
                    RESULT_LOCAL.counts = {
                        unitDraws,
                        projectileDraws,
                        displayUnits: DISPLAY.units.length,
                        displayProjectiles: DISPLAY.projectiles.length,
                        ...RENDERER.device.stats,
                    };
                    RESULT_LOCAL.camera = {
                        zoom: RENDERER.zoom,
                        pan: RENDERER.cameraPan,
                        scale: RENDERER.scale,
                        view: [...RENDERER.view],
                        offset: [...RENDERER.offset],
                        width: RENDERER.canvas.width,
                        height: RENDERER.canvas.height,
                    };
                    const GL = RENDERER.device.gl,
                        PIXELS = new Uint8Array(GL.drawingBufferWidth * GL.drawingBufferHeight * 4),
                        EXT = GL.getExtension('WEBGL_debug_renderer_info');
                    GL.readPixels(
                        0,
                        0,
                        GL.drawingBufferWidth,
                        GL.drawingBufferHeight,
                        GL.RGBA,
                        GL.UNSIGNED_BYTE,
                        PIXELS,
                    );
                    RESULT_LOCAL.pixelHash = Array.from(
                        new Uint8Array(await crypto.subtle.digest('SHA-256', PIXELS)),
                        (byte) => byte.toString(16).padStart(2, '0'),
                    ).join('');
                    RESULT_LOCAL.gpu = EXT
                        ? GL.getParameter(EXT.UNMASKED_RENDERER_WEBGL)
                        : GL.getParameter(GL.RENDERER);
                    RESULT_LOCAL.renderAuthorityUnchanged = BEFORE === (await SHA(SNAPSHOT(WORLD)));
                }
            }
            RESULT_LOCAL.finalHash = await SHA(SNAPSHOT(WORLD));
            RESULT_LOCAL.finalTick = WORLD.simulationTick;
            RESULT_LOCAL.noticeHash = await SHA(NOTICES);
            RESULT_LOCAL.attackLaunches = NOTICES.filter((notice) => notice.kind === 'attack-launch').length;
            RESULT_LOCAL.damageEvents = NOTICES.filter((notice) => notice.kind === 'boss-hit').length;
            RESULT_LOCAL.damage = NOTICES.filter((notice) => notice.kind === 'boss-hit').reduce(
                (sum, notice) => sum + (notice.damage || 0),
                0,
            );
            RESULT_LOCAL.rotation = WORLD.units.map((unit) => [unit.id, unit.scatterAttackCount]);
            RESULT_LOCAL.heapAfterBytes = performance.memory?.usedJSHeapSize ?? null;
            RESULT_LOCAL.userAgent = navigator.userAgent;
            RESULT_LOCAL.productVersion = BUDMORI.version;
            return RESULT_LOCAL;
        },
        { count: COUNT, phase: PHASE, mode: MODE, view: VIEW, samples: SAMPLES, warmup: WARMUP },
    );
    RESULT.variant = variant;
    RESULT.round = round;
    RESULT.cpu = MODE === 'hidden' ? null : summary(RESULT.rawMs);
    if (MODE === 'ui') {
        RESULT.presentationCpu = summary(RESULT.rawPresentationMs);
        RESULT.presentationAndUiCpu = summary(RESULT.rawPresentationAndUiMs);
    }
    RESULT.rotationHash = HASH(RESULT.rotation);
    delete RESULT.rotation;
    if (MODE === 'render') {
        assert.equal(RESULT.renderAuthorityUnchanged, true, 'render must not mutate authority');
    }
    assert.equal(RESULT.field, COUNT);
    assert.equal(RESULT.reserve, COUNT);
    if (MODE !== 'hidden') {
        assert.equal(RESULT.rawMs.length, SAMPLES);
    }
    REPORT.runs.push(RESULT);
    if (MODE === 'hidden') {
        console.log(
            `${CASE} round ${round} ${variant}: ${RESULT.hiddenCombat.distinctCulledUnits} culled units, ${RESULT.hiddenCombat.attackLaunchesWhileCulled} launches / ${RESULT.hiddenCombat.damageEventsWhileCulled} hits while culled`,
        );
    } else {
        console.log(
            `${CASE} round ${round} ${variant}: CPU median/p95/p99 ${RESULT.cpu.medianMs.toFixed(3)}/${RESULT.cpu.p95Ms.toFixed(3)}/${RESULT.cpu.p99Ms.toFixed(3)} ms`,
        );
    }
    save();
    await CONTEXT.close();
}
save();
try {
    await new Promise((resolve, reject) => {
        SERVER.once('error', reject);
        SERVER.listen(0, '127.0.0.1', resolve);
    });
    browser = await chromium.launch({
        executablePath: process.env.CHROME_PATH,
        args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-precise-memory-info'],
    });
    REPORT.browserVersion = browser.version();
    deadline = setTimeout(() => {
        REPORT.deadlineExceeded = true;
        browser.close().catch(() => {});
    }, 170000);
    const ORIGIN = `http://127.0.0.1:${SERVER.address().port}`;
    for (let round = 0; round < ROUNDS; round++) {
        for (const VARIANT of round % 2 ? ['candidate', 'base'] : ['base', 'candidate']) {
            await run(VARIANT, round, ORIGIN);
        }
        const BASE = REPORT.runs.find((run) => run.round === round && run.variant === 'base'),
            CANDIDATE = REPORT.runs.find((run) => run.round === round && run.variant === 'candidate');
        for (const KEY of ['initialHash', 'finalHash', 'noticeHash', 'rotationHash']) {
            assert.equal(CANDIDATE[KEY], BASE[KEY], `round ${round} exact ${KEY}`);
        }
        assert.deepEqual(CANDIDATE.checkpoints, BASE.checkpoints, 'native checkpoint sequence must match exactly');
        if (MODE === 'render') {
            assert.deepEqual(CANDIDATE.camera, BASE.camera, 'render camera must match');
            assert.equal(CANDIDATE.pixelHash, BASE.pixelHash, 'same snapshot/camera framebuffer must match exactly');
        }
        if (MODE === 'ui') {
            assert.deepEqual(CANDIDATE.hud, BASE.hud, 'native final HUD values must match');
        }
        if (MODE === 'hidden') {
            assert.deepEqual(CANDIDATE.camera, BASE.camera, 'integrated hidden combat uses the same camera');
            assert.ok(CANDIDATE.hiddenCombat.unitFramesCulled > 0, 'native rendering must actually omit hidden units');
            assert.ok(
                CANDIDATE.hiddenCombat.attackLaunchesWhileCulled > 0,
                'omitted units must continue native attacks',
            );
            assert.ok(
                CANDIDATE.hiddenCombat.damageEventsWhileCulled > 0,
                'omitted units must continue dealing native damage',
            );
        }
        REPORT.comparisons.push({
            round,
            exactAuthority: true,
            exactNotices: true,
            exactCheckpoints: true,
            exactRotation: true,
            exactPixels: MODE === 'render',
            ratios:
                MODE === 'hidden'
                    ? null
                    : Object.fromEntries(
                          ['medianMs', 'p95Ms', 'p99Ms', 'meanMs'].map((key) => [
                              key,
                              CANDIDATE.cpu[key] / BASE.cpu[key],
                          ]),
                      ),
            presentationRatios:
                MODE === 'ui'
                    ? Object.fromEntries(
                          ['medianMs', 'p95Ms', 'p99Ms', 'meanMs'].map((key) => [
                              key,
                              CANDIDATE.presentationCpu[key] / BASE.presentationCpu[key],
                          ]),
                      )
                    : null,
            presentationAndUiRatios:
                MODE === 'ui'
                    ? Object.fromEntries(
                          ['medianMs', 'p95Ms', 'p99Ms', 'meanMs'].map((key) => [
                              key,
                              CANDIDATE.presentationAndUiCpu[key] / BASE.presentationAndUiCpu[key],
                          ]),
                      )
                    : null,
        });
        save();
    }
    assert.deepEqual(ERRORS, []);
    REPORT.status = 'passed';
} catch (error) {
    REPORT.status = 'failed';
    REPORT.failure = String(error.stack || error);
    throw error;
} finally {
    clearTimeout(deadline);
    save();
    await browser?.close();
    SERVER.close();
}
