// Performance bench: a fixed farm or tower army, measured the same way every time, with before/after code served in
// alternating rounds so a busy machine slows both sides alike: node tests/tools/farm-bench.mjs [options]
//   --mode logic|frame        logic: fixed 20 Hz Garden.step ticks with the frame loop paused (SwiftShader, no
//                             drawing), per-stage ms per tick from the game's own profiler marks.
//                             frame: the real page on the real GPU, RAF running, the in-game diagnostics (FPS,
//                             simulation, capture, interpolation, WebGL submit) over --seconds.
//   --units 1000              army size (species 0..8 and tiers 1..3 in turn, seeded positions)
//   --scene farm|tower        tower starts --floor and walks straight into the fight
//   --floor 30                tower floor   --ticks 200   logic ticks measured (after 40 warm-up ticks)
//   --seconds 8               frame mode measuring window (after 3 s warm-up)
//   --rounds 3                alternating rounds per root
//   --root <dir>[,<dir>]      code to serve (default this checkout); two roots compare before,after
//   --profile 20              also print the top N functions by self time (CPU profile of the measured window)
//   --hash                    logic mode: pin performance.now to a call counter (time-budgeted work becomes
//                             deterministic) and print a hash of every unit's state; equal hashes = same simulation
// Not part of npm run check (PM-014): timing depends on the machine and its load.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ARGS = Object.fromEntries(
    process.argv
        .slice(2)
        .join(' ')
        .split(/\s*--/)
        .filter(Boolean)
        .map((pair) => pair.split(/\s+/)),
);
const MODE = ARGS.mode ?? 'logic',
    UNITS = Number(ARGS.units ?? 1000),
    SCENE = ARGS.scene ?? 'farm',
    FLOOR = Number(ARGS.floor ?? 30),
    TICKS = Number(ARGS.ticks ?? 200),
    SECONDS = Number(ARGS.seconds ?? 8),
    ROUNDS = Number(ARGS.rounds ?? 3),
    PROFILE = Number(ARGS.profile ?? 0),
    HASH = 'hash' in ARGS,
    ROOTS = (ARGS.root ?? fileURLToPath(new URL('../../', import.meta.url)))
        .split(',')
        .map((root) => path.resolve(root));
const TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.json': 'application/json',
};

async function serve(root) {
    const HTML = fs.readFileSync(path.join(root, 'index.html'), 'utf8'),
        MANIFEST = JSON.parse(
            HTML.match(/<script id="bloom-runtime-manifest" type="application\/json">(.*?)<\/script>/s)[1],
        ),
        MODULES = new Map(
            MANIFEST.modules.map((module) => [
                module.url,
                fs.readFileSync(path.join(root, 'vendor/upstream', module.name + '.js')),
            ]),
        ),
        SERVER = http.createServer((request, response) => {
            const FILE = path.resolve(root, '.' + decodeURIComponent(request.url.split('?')[0]));
            if (!FILE.startsWith(root) || !fs.existsSync(FILE) || !fs.statSync(FILE).isFile()) {
                response.writeHead(404).end();
                return;
            }
            response.setHeader('content-type', TYPES[path.extname(FILE)] || 'application/octet-stream');
            response.end(fs.readFileSync(FILE));
        });
    await new Promise((resolve) => SERVER.listen(0, '127.0.0.1', resolve));
    return { root, modules: MODULES, server: SERVER, url: `http://127.0.0.1:${SERVER.address().port}/index.html` };
}

// One page per round: fresh JIT state, same army, same seed.
async function round(browser, site) {
    const PAGE = await browser.newPage({ viewport: { width: 1100, height: 850 } });
    PAGE.on('pageerror', (error) => console.error('pageerror', String(error)));
    if (HASH) {
        await PAGE.addInitScript(() => {
            const NOW = performance.now.bind(performance);
            let pinned = null;
            globalThis.__pinClock = () => (pinned = NOW());
            performance.now = () => (pinned === null ? NOW() : (pinned += 0.001));
        });
    }
    await PAGE.route(/cdn\.jsdelivr\.net\/gh\/byh-playground\/bloom-gamekit@/, (route) => {
        const BODY = site.modules.get(route.request().url());
        return BODY
            ? route.fulfill({
                  body: BODY,
                  contentType: 'text/javascript',
                  headers: { 'access-control-allow-origin': '*' },
              })
            : route.abort();
    });
    const LOAD_START = Date.now();
    await PAGE.goto(site.url);
    await PAGE.waitForFunction(() => globalThis.BUDMORI && !document.getElementById('bloom-module-loading'), null, {
        timeout: 180_000,
    });
    const LOAD_MS = Date.now() - LOAD_START;
    if (HASH) {
        // No wall-clock frames from here: the farm starts and the army forms in the same state every run.
        await PAGE.evaluate(() => {
            globalThis.requestAnimationFrame = () => 0;
        });
        await PAGE.waitForTimeout(100);
    }
    await PAGE.locator('#newGame').click();
    await PAGE.waitForFunction(() => BUDMORI.sim.scene === 'farm');
    await PAGE.evaluate(
        async ({ units, scene, floor }) => {
            const W = BUDMORI.sim,
                { overallXpForLevel: XP_FOR_LEVEL } = await import('/src/model/player-progression.js');
            BUDMORI.runtime.paused = true;
            W.resetUnits();
            W.playerProgression.overallXp = XP_FOR_LEVEL(41);
            W.playerProgression.towerBest = 100;
            W.setWorkBasisPoints(0);
            W.rng.state = 731;
            let seed = 12345;
            const RANDOM = () => (seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296;
            for (let index = 0; index < units; index++) {
                const UNIT = W.spawn(index % 9, 1 + (index % 3), (RANDOM() - 0.5) * 30, (RANDOM() - 0.5) * 20);
                UNIT.growthElapsed = UNIT.growthDuration;
                UNIT.dropLanded = true;
                UNIT.z = 0;
            }
            if (scene === 'tower') {
                W.startTower(floor);
                W.finishMarch();
            }
        },
        { units: UNITS, scene: SCENE, floor: FLOOR },
    );
    const RESULT = MODE === 'frame' ? await frame(PAGE) : await logic(PAGE);
    await PAGE.close();
    return { loadMs: LOAD_MS, ...RESULT };
}

async function startProfile(page) {
    if (!PROFILE) {
        return null;
    }
    const CDP = await page.context().newCDPSession(page);
    await CDP.send('Profiler.enable');
    await CDP.send('Profiler.setSamplingInterval', { interval: 200 });
    await CDP.send('Profiler.start');
    return CDP;
}
// Top functions by self time over the profiled window.
async function stopProfile(cdp) {
    if (!cdp) {
        return undefined;
    }
    const { profile: PROFILE_DATA } = await cdp.send('Profiler.stop'),
        NODES = new Map(PROFILE_DATA.nodes.map((node) => [node.id, node])),
        SELF = new Map();
    PROFILE_DATA.samples.forEach((id, index) => {
        const FRAME = NODES.get(id).callFrame,
            KEY = `${FRAME.functionName || '(anonymous)'} ${FRAME.url.split('/').at(-1)}:${FRAME.lineNumber + 1}`;
        SELF.set(KEY, (SELF.get(KEY) || 0) + (PROFILE_DATA.timeDeltas[index] || 0));
    });
    const TOTAL = [...SELF.values()].reduce((sum, value) => sum + value, 0),
        FILES = new Map();
    for (const [KEY, VALUE] of SELF) {
        const FILE = KEY.split(' ').at(-1).replace(/:\d+$/, '');
        FILES.set(FILE, (FILES.get(FILE) || 0) + VALUE);
    }
    const LINES = (map, limit) =>
        [...map]
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([key, value]) => `${((100 * value) / TOTAL).toFixed(1)}% ${key}`);
    // GameKit modules load from blob URLs: a file line reads as its blob id, named by the functions listed above.
    return [...LINES(SELF, PROFILE), '-- by file', ...LINES(FILES, 12)];
}

async function logic(page) {
    const RUN = page.evaluate(async (ticks) => {
        const W = BUDMORI.sim,
            TICK = 1 / 20,
            STAGES = Object.create(null),
            STEP = () => {
                if (W.scene === 'farm' && !W.tower.active) {
                    const START = performance.now();
                    W.advanceWork(TICK);
                    STAGES.autoTaps = (STAGES.autoTaps || 0) + performance.now() - START;
                }
                W.step(TICK);
            };
        globalThis.__pinClock?.();
        for (let n = 0; n < 40; n++) {
            STEP();
        }
        for (const KEY of Object.keys(STAGES)) {
            delete STAGES[KEY];
        }
        globalThis.__benchReady = true;
        await new Promise((resolve) => (globalThis.__benchGo = resolve));
        // Same marks the in-game diagnostics read (src/core/performance-diagnostics.js), summed over the run. Set
        // after the wait: every frame callback installs the page's own profiler, and the ticks below run without one.
        W.profiler = {
            start: () => performance.now(),
            end: (name, start) => (STAGES[name] = (STAGES[name] || 0) + performance.now() - start),
            count() {},
            maximum() {},
        };
        const START = performance.now();
        for (let n = 0; n < ticks; n++) {
            STEP();
        }
        const ELAPSED = performance.now() - START;
        W.profiler = null;
        const STATE = globalThis.__pinClock
            ? W.units
                  .map((unit) => [unit.id, unit.x, unit.y, unit.z, unit.vx, unit.vy, unit.hp, unit.stun].join(':'))
                  .join('|')
            : '';
        const DIGEST = STATE
            ? [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(STATE)))]
            : [];
        return {
            hash: DIGEST.slice(0, 8)
                .map((byte) => byte.toString(16).padStart(2, '0'))
                .join(''),
            tickMs: ELAPSED / ticks,
            stages: Object.fromEntries(Object.entries(STAGES).map(([name, ms]) => [name, ms / ticks])),
            // Code under test may leave notes here while investigating; printed with the round.
            debug: globalThis.__benchDebug ?? null,
            alive: W.units.filter((unit) => unit.hp > 0).length,
            fight: W.farmBossEvent.phase,
        };
    }, TICKS);
    await page.waitForFunction(() => globalThis.__benchReady, null, { timeout: 0 });
    const CDP = await startProfile(page);
    await page.evaluate(() => globalThis.__benchGo());
    const RESULT = await RUN;
    RESULT.profile = await stopProfile(CDP);
    return RESULT;
}

async function frame(page) {
    await page.evaluate(() => {
        BUDMORI.runtime.paused = false;
    });
    await page.waitForTimeout(3000);
    await page.evaluate(() => {
        const CHECK = document.getElementById('diagnosticDetail');
        CHECK.checked = true;
        CHECK.dispatchEvent(new Event('change'));
    });
    const CDP = await startProfile(page);
    await page.waitForTimeout(SECONDS * 1000);
    const PROFILE_LINES = await stopProfile(CDP);
    const RESULT = await page.evaluate(() => {
        const SNAPSHOT = globalThis.BudmoriPerformanceDiagnostics.snapshot();
        return {
            fps: SNAPSHOT.fps,
            intervalMs: SNAPSHOT.intervalMs,
            stages: Object.fromEntries(Object.entries(SNAPSHOT.stagesMs).map(([name, value]) => [name, value.mean])),
            stagesP95: Object.fromEntries(Object.entries(SNAPSHOT.stagesMs).map(([name, value]) => [name, value.p95])),
            summary: globalThis.BudmoriPerformanceDiagnostics.summary(),
        };
    });
    RESULT.profile = PROFILE_LINES;
    return RESULT;
}

const SITES = await Promise.all(ROOTS.map(serve)),
    BROWSER = await chromium.launch(
        MODE === 'frame'
            ? {
                  headless: true,
                  ignoreDefaultArgs: ['--enable-unsafe-swiftshader'],
                  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'],
              }
            : { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
    ),
    RESULTS = SITES.map(() => []);
for (let index = 0; index < ROUNDS; index++) {
    for (let site = 0; site < SITES.length; site++) {
        // Alternate the starting side so warm-up and drift do not favour one root.
        const AT = index % 2 ? SITES.length - 1 - site : site,
            RESULT = await round(BROWSER, SITES[AT]);
        RESULTS[AT].push(RESULT);
        console.log(
            `round ${index + 1} ${path.basename(SITES[AT].root)}: ` +
                (MODE === 'frame'
                    ? `fps ${RESULT.fps?.toFixed(1)} · sim ${RESULT.stages.simulation?.toFixed(1)} · render ${RESULT.stages.render?.toFixed(1)} ms`
                    : `tick ${RESULT.tickMs.toFixed(2)} ms · alive ${RESULT.alive} · ${RESULT.fight}` +
                      (RESULT.hash ? ` · hash ${RESULT.hash}` : '')) +
                ` · load ${RESULT.loadMs} ms`,
        );
        if (RESULT.debug) {
            console.log('  debug ' + JSON.stringify(RESULT.debug));
        }
        for (const LINE of RESULT.profile ?? []) {
            console.log('  ' + LINE);
        }
    }
}
const MEDIAN = (values) => {
    const SORTED = values.filter(Number.isFinite).sort((a, b) => a - b);
    return SORTED.length ? SORTED[Math.floor(SORTED.length / 2)] : NaN;
};
const NAMES = [...new Set(RESULTS.flat().flatMap((result) => Object.keys(result.stages)))]
    .map((name) => [name, MEDIAN(RESULTS[0].map((result) => result.stages[name]))])
    .filter(([, value]) => value >= 0.05)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);
const ROWS = [
    MODE === 'frame' ? ['fps', (result) => result.fps] : ['tick', (result) => result.tickMs],
    ['load', (result) => result.loadMs],
    ...NAMES.map((name) => [name, (result) => result.stages[name]]),
];
console.log(
    `\n${MODE} · ${SCENE}${SCENE === 'tower' ? ' ' + FLOOR : ''} · ${UNITS} units · median of ${ROUNDS} (ms)\n` +
        ['stage'.padEnd(22), ...SITES.map((site) => path.basename(site.root).padStart(12))].join('') +
        (SITES.length === 2 ? '      Δ' : ''),
);
for (const [NAME, READ] of ROWS) {
    const VALUES = RESULTS.map((results) => MEDIAN(results.map(READ)));
    console.log(
        [NAME.padEnd(22), ...VALUES.map((value) => value.toFixed(NAME === 'load' ? 0 : 2).padStart(12))].join('') +
            (SITES.length === 2 && VALUES[0] ? `  ${(((VALUES[1] - VALUES[0]) / VALUES[0]) * 100).toFixed(0)}%` : ''),
    );
}
await BROWSER.close();
for (const SITE of SITES) {
    SITE.server.close();
}
