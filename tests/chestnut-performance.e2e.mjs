// Version-to-version rendered maximum-army regression, not a synthetic step() microbenchmark.
// The baseline is an untouched git archive. Both builds use one Chromium/SwiftShader process.
// Only the candidate's T2–T6 evolution path is researched; basic/specialty ranks remain zero.
// This intentionally measures the new T6 attack, including its damage normalization, against legacy chestnut.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const BASE_COMMIT = '5fd48cad7f6cda109e8dc8af645d7f255c8b3a8e',
    ROOT = fileURLToPath(new URL('../', import.meta.url)),
    OUTPUT = path.join(ROOT, 'tests/output/chestnut-performance'),
    STARTED = Date.now(),
    ROUNDS = 3,
    WARMUP_FRAMES = 60,
    SAMPLE_FRAMES = 120,
    MAX_P95_RATIO = 1.2,
    VIEWPORTS = [
        { name: 'desktop', width: 1100, height: 850, touch: false },
        { name: 'landscape', width: 844, height: 390, touch: true },
    ],
    TYPES = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.svg': 'image/svg+xml',
    };
assert.ok(
    process.env.CHESTNUT_PERFORMANCE_BASE_ROOT,
    'Set CHESTNUT_PERFORMANCE_BASE_ROOT to the exact archived base checkout',
);
const ROOTS = { base: fs.realpathSync(process.env.CHESTNUT_PERFORMANCE_BASE_ROOT), candidate: fs.realpathSync(ROOT) };
assert.notEqual(ROOTS.base, ROOTS.candidate, 'baseline must be a separate immutable archive');
fs.mkdirSync(OUTPUT, { recursive: true });

function digest(bytes) {
    return createHash('sha256').update(bytes).digest('hex');
}
function progress(message) {
    console.log(`[chestnut performance +${((Date.now() - STARTED) / 1000).toFixed(1)}s] ${message}`);
}
function manifest(root) {
    const HTML = fs.readFileSync(path.join(root, 'index.html'), 'utf8'),
        MATCH = HTML.match(/<script id="bloom-runtime-manifest" type="application\/json">(.*?)<\/script>/s);
    assert.ok(MATCH, 'production bootstrap manifest must exist');
    return JSON.parse(MATCH[1]);
}
function quantile(sorted, percentile) {
    return sorted[Math.ceil(sorted.length * percentile) - 1];
}
function median(values) {
    const SORTED = [...values].sort((a, b) => a - b),
        MIDDLE = Math.floor(SORTED.length / 2);
    return SORTED.length % 2 ? SORTED[MIDDLE] : (SORTED[MIDDLE - 1] + SORTED[MIDDLE]) / 2;
}
function summarize(frames) {
    const SORTED = [...frames].sort((a, b) => a - b);
    assert.equal(frames.length, SAMPLE_FRAMES);
    assert.ok(frames.every((duration) => Number.isFinite(duration) && duration > 0));
    return {
        count: frames.length,
        meanMs: frames.reduce((sum, duration) => sum + duration, 0) / frames.length,
        medianMs: median(frames),
        p95Ms: quantile(SORTED, 0.95),
        framesMs: frames,
    };
}

// Verify the archived production entry points against the exact commit, not a branch label.
// The bootstrap additionally verifies every module/vector asset against its own pinned manifest.
const BASE_FILES = {};
for (const FILE of ['index.html', 'src/bootstrap.js', 'src/game.js']) {
    const EXPECTED = execFileSync('git', ['show', `${BASE_COMMIT}:${FILE}`], { cwd: ROOT, maxBuffer: 8 * 1024 * 1024 }),
        ACTUAL = fs.readFileSync(path.join(ROOTS.base, FILE));
    assert.equal(digest(ACTUAL), digest(EXPECTED), `untouched baseline ${FILE}`);
    BASE_FILES[FILE] = digest(ACTUAL);
}
const MANIFESTS = { base: manifest(ROOTS.base), candidate: manifest(ROOTS.candidate) },
    REPORT = {
        scope: 'Paired rendered rAF intervals in one CI Chromium SwiftShader process; no hardware GPU or physical-device FPS claim.',
        baseCommit: BASE_COMMIT,
        candidateCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(),
        baseFiles: BASE_FILES,
        builds: Object.fromEntries(
            Object.entries(MANIFESTS).map(([variant, build]) => [
                variant,
                { productVersion: build.productVersion, game: build.game, gamekitCommit: build.distCommit },
            ]),
        ),
        protocol: {
            seed: 731,
            units: 200,
            chestnut: 60,
            otherSpecies: 8,
            tier: 6,
            rounds: ROUNDS,
            warmupFrames: WARMUP_FRAMES,
            sampleFrames: SAMPLE_FRAMES,
            maxMedianPairedP95Ratio: MAX_P95_RATIO,
            order: 'base/candidate, candidate/base, base/candidate per viewport',
            investmentDifference:
                'Candidate: mastery 50 with evolution-2 through evolution-6 at rank 1; base: uninvested legacy chestnut. No basic or specialty investment in either build.',
            fixture:
                'Real new-game session, startTower(1), finishMarch(), all 200 deployed in the same radial layout; normal runtime simulation, presentation, renderer and HUD remain active.',
            limitations: [
                'Deterministic setup skips marching/deployment wait, forces fighting phase, and uses a 1e12 HP boss stunned for 10000 seconds to keep the roster and encounter stable.',
                'No real boss retaliation, deaths, reward settlement, input latency, thermal behavior or hardware GPU completion timing is measured.',
                'Touch landscape is Chromium device emulation, not a physical mobile device. Software-rendered CI ratios do not establish device FPS.',
                'rAF intervals include scheduling and renderer/compositor work, not isolated JavaScript CPU time; 60 warmup plus 120 measured frames cover unequal wall/simulation durations when versions differ.',
                'Screenshots and full scene/HUD audits occur outside the measured interval. Fresh contexts isolate saves/caches; alternating paired order reduces but cannot eliminate CI noise.',
            ],
        },
        fixtures: {},
        runs: [],
        comparisons: [],
        errors: [],
        status: 'running',
    },
    SERVER = http.createServer((request, response) => {
        const URL_LOCAL = new URL(request.url, 'http://127.0.0.1'),
            MATCH = URL_LOCAL.pathname.match(/^\/(base|candidate)\/(.*)$/),
            DIRECTORY = MATCH && ROOTS[MATCH[1]],
            FILE = DIRECTORY && path.resolve(DIRECTORY, decodeURIComponent(MATCH[2]));
        if (!FILE || !FILE.startsWith(DIRECTORY + path.sep) || !fs.existsSync(FILE) || !fs.statSync(FILE).isFile()) {
            response.writeHead(404).end();
            return;
        }
        response.setHeader('content-type', TYPES[path.extname(FILE)] || 'application/octet-stream');
        response.end(fs.readFileSync(FILE));
    });
let browser;

function writeReport() {
    REPORT.elapsedMs = Date.now() - STARTED;
    fs.writeFileSync(path.join(OUTPUT, 'report.json'), JSON.stringify(REPORT, null, 2));
}

async function runScene(variant, viewport, round, origin) {
    const CONTEXT = await browser.newContext({
            viewport: { width: viewport.width, height: viewport.height },
            isMobile: viewport.touch,
            hasTouch: viewport.touch,
            deviceScaleFactor: 1,
            serviceWorkers: 'block',
        }),
        PAGE = await CONTEXT.newPage(),
        RUN = { variant, viewport: viewport.name, round, errors: [] },
        MODULES = new Map();
    REPORT.runs.push(RUN);
    PAGE.setDefaultTimeout(120000);
    PAGE.on('pageerror', (error) => RUN.errors.push(String(error)));
    PAGE.on('console', (message) => {
        if (message.text().includes('loop stopped')) {
            RUN.errors.push(message.text());
        }
    });
    for (const MODULE of MANIFESTS[variant].modules) {
        const BYTES = fs.readFileSync(path.join(ROOTS[variant], 'vendor/upstream', `${MODULE.name}.js`));
        assert.equal(digest(BYTES), MODULE.sha256, `${variant} pinned offline ${MODULE.name}`);
        MODULES.set(MODULE.url, BYTES);
    }
    // Nothing reaches an external CDN: serve each build's own pinned vendor bytes.
    await CONTEXT.route('**/*', (route) => {
        const URL_LOCAL = route.request().url();
        if (URL_LOCAL === `${origin}/favicon.ico`) {
            return route.fulfill({ status: 204 });
        }
        if (URL_LOCAL.startsWith(`${origin}/${variant}/`)) {
            return route.continue();
        }
        if (MODULES.has(URL_LOCAL)) {
            return route.fulfill({
                body: MODULES.get(URL_LOCAL),
                contentType: 'text/javascript',
                headers: { 'access-control-allow-origin': '*' },
            });
        }
        RUN.errors.push(`Unexpected network request: ${URL_LOCAL}`);
        return route.abort();
    });
    try {
        await PAGE.goto(`${origin}/${variant}/index.html`);
        await PAGE.waitForFunction(() => globalThis.BUDMORI?.renderer?.assetsReady);
        RUN.initial = await PAGE.evaluate((build) => {
            // Synchronous new-game activation and fixture construction prevent startup ticks
            // from advancing the seeded RNG before both builds have the same initial scene.
            document.getElementById('newGame').click();
            const WORLD = BUDMORI.sim,
                INVESTMENT = WORLD.playerProgression.abilities['chestnut-target-thorns'];
            if (WORLD.seed !== 731 || WORLD.simulationTick !== 0) {
                throw new Error('New game must start at seed 731, tick 0');
            }
            WORLD.resetUnits();
            WORLD.setWorkBasisPoints(0);
            if (build === 'candidate') {
                if (INVESTMENT.treeVersion !== 1) {
                    throw new Error('Candidate must contain the chestnut evolution tree');
                }
                INVESTMENT.masteryLevel = 50;
                INVESTMENT.nodeRanks = {};
                for (let tier = 2; tier <= 6; tier++) {
                    INVESTMENT.nodeRanks[`evolution-${tier}`] = 1;
                }
            } else if (INVESTMENT.treeVersion) {
                throw new Error('Base must use the legacy chestnut tree');
            }
            const PEANUT = WORLD.playerProgression.abilities['peanut-death-split'];
            if (
                build === 'base'
                    ? PEANUT.powerLevel !== 0 ||
                      PEANUT.treeVersion !== undefined ||
                      Object.values(PEANUT.branchLevels || {}).some(Boolean)
                    : PEANUT.treeVersion !== 1 || Object.keys(PEANUT.nodeRanks).length !== 0
            ) {
                throw new Error('Peanut must remain uninvested across its intended legacy-to-tree activation');
            }
            for (let index = 0; index < 200; index++) {
                const SPECIES = index < 60 ? 3 : [0, 1, 2, 4, 5, 6, 7, 8][(index - 60) % 8],
                    UNIT = WORLD.spawn(SPECIES, 6, 0, 0);
                UNIT.growth = 3;
                UNIT.growthElapsed = UNIT.growthDuration;
                UNIT.dropLanded = true;
            }
            if (!WORLD.startTower(1) || !WORLD.finishMarch()) {
                throw new Error('Real tower setup must succeed');
            }
            WORLD._benched.clear();
            WORLD._benchRevision++;
            WORLD.farmBossEvent.phase = 'fighting';
            Object.assign(WORLD.boss, { z: 0, hp: 1e12, maxHp: 1e12, stun: 10000 });
            WORLD.units.forEach((unit, index) => {
                const ANGLE = index * 2.399963229728653,
                    DISTANCE = WORLD.boss.radius + 2.8 + (index % 4) * 0.5;
                Object.assign(unit, {
                    x: Math.cos(ANGLE) * DISTANCE,
                    y: Math.sin(ANGLE) * DISTANCE,
                    z: 0,
                    dropLanded: true,
                });
            });
            WORLD._unitSpatialDirty = true;
            BUDMORI.runtime.loop.resetTiming();
            BUDMORI.runtime.paused = false;
            const GL = BUDMORI.renderer.device.gl,
                DEBUG = GL.getExtension('WEBGL_debug_renderer_info'),
                OTHER_ABILITIES = structuredClone(WORLD.runProgressionSnapshot.abilities);
            delete OTHER_ABILITIES['chestnut-target-thorns'];
            // Preserve the exact zero-investment semantics, not the intentionally changed tree representation.
            OTHER_ABILITIES['peanut-death-split'] = {
                masteryLevel: PEANUT.masteryLevel,
                masteryXp: PEANUT.masteryXp,
                investedPoints: 0,
            };
            return {
                renderer: DEBUG ? GL.getParameter(DEBUG.UNMASKED_RENDERER_WEBGL) : GL.getParameter(GL.RENDERER),
                investment: structuredClone(INVESTMENT),
                common: {
                    seed: WORLD.seed,
                    tick: WORLD.simulationTick,
                    rngState: WORLD.rng.state,
                    capacity: BUDMORI.CONFIG.farm.capacity.max,
                    scene: WORLD.scene,
                    insideTower: WORLD.insideTower,
                    towerFloor: WORLD.tower.floor,
                    towerCards: WORLD.tower.cards,
                    event: WORLD.farmBossEvent,
                    rewards: WORLD.bossRewardReceipts,
                    rewardInventory: WORLD.bossRewardInventory,
                    otherAbilities: OTHER_ABILITIES,
                    boss: Object.fromEntries(
                        ['species', 'stage', 'x', 'y', 'z', 'hp', 'maxHp', 'radius', 'attackPower', 'stun'].map(
                            (key) => [key, WORLD.boss[key]],
                        ),
                    ),
                    units: WORLD.units.map((unit) => ({
                        id: unit.id,
                        species: unit.species,
                        tier: unit.tier,
                        x: unit.x,
                        y: unit.y,
                        z: unit.z,
                        hp: unit.hp,
                        stats: WORLD.unitStatsFor(unit),
                    })),
                },
            };
        }, variant);
        assert.match(RUN.initial.renderer, /SwiftShader/i, 'comparison must use the same software renderer');
        assert.equal(RUN.initial.common.capacity, 200);
        assert.equal(RUN.initial.common.units.length, 200);
        assert.equal(RUN.initial.common.units.filter((unit) => unit.species === 3).length, 60);
        assert.equal(new Set(RUN.initial.common.units.map((unit) => unit.species)).size, 9);
        assert.ok(RUN.initial.common.units.every((unit) => unit.tier === 6));
        if (REPORT.fixtures[variant]) {
            assert.deepEqual(RUN.initial, REPORT.fixtures[variant], `${variant} deterministic fixture across rounds`);
        } else {
            REPORT.fixtures[variant] = RUN.initial;
        }
        RUN.initialFixture = variant;
        delete RUN.initial;
        if (REPORT.fixtures.base && REPORT.fixtures.candidate) {
            assert.deepEqual(
                REPORT.fixtures.candidate.common,
                REPORT.fixtures.base.common,
                'same seed/RNG, boss, rewards, other investments, stats and positions across versions',
            );
            assert.equal(REPORT.fixtures.candidate.renderer, REPORT.fixtures.base.renderer);
        }
        const SAMPLE = await PAGE.evaluate(
            async ({ warmup, count }) => {
                const FRAMES = [],
                    FORMS = new Set(),
                    READ_SCENE = () => {
                        const WORLD = BUDMORI.sim,
                            RENDERER = BUDMORI.renderer;
                        return {
                            tick: WORLD.simulationTick,
                            paused: BUDMORI.runtime.paused,
                            phase: WORLD.farmBossEvent.phase,
                            units: WORLD.units.length,
                            living: WORLD.units.filter((unit) => unit.hp > 0).length,
                            actors: RENDERER.actors.filter((actor) => actor.presentation === RENDERER.unitPresentation)
                                .length,
                            bossHp: WORLD.boss.hp,
                            rewards: WORLD.bossRewardReceipts.length,
                            width: innerWidth,
                            height: innerHeight,
                            hud: ['bossbar', 'allyHealthText', 'bossHealthText', 'fightRetreat'].map((id) => {
                                const ELEMENT = document.getElementById(id),
                                    BOX = ELEMENT.getBoundingClientRect(),
                                    STYLE = getComputedStyle(ELEMENT);
                                return {
                                    id,
                                    x: BOX.x,
                                    y: BOX.y,
                                    right: BOX.right,
                                    bottom: BOX.bottom,
                                    width: BOX.width,
                                    height: BOX.height,
                                    visible: STYLE.display !== 'none' && STYLE.visibility !== 'hidden',
                                };
                            }),
                        };
                    };
                for (let index = 0; index < warmup; index++) {
                    await new Promise(requestAnimationFrame);
                }
                const BEFORE = READ_SCENE();
                let previous = await new Promise(requestAnimationFrame);
                for (let index = 0; index < count; index++) {
                    const NOW = await new Promise(requestAnimationFrame);
                    FRAMES.push(NOW - previous);
                    // Same read-only roster scan in both versions; do not rely on one
                    // crowded unit reaching the boss. No attack outcome is injected.
                    for (const UNIT of BUDMORI.sim.units) {
                        const FORM = UNIT.ability.action?.chestnutAttack?.form;
                        if (FORM) {
                            FORMS.add(FORM);
                        }
                    }
                    previous = NOW;
                }
                const AFTER = READ_SCENE();
                // Capture only after measurement. No runtime replacement or step-loop patching.
                BUDMORI.runtime.paused = true;
                return { frames: FRAMES, before: BEFORE, after: AFTER, observedChestnutForms: [...FORMS] };
            },
            { warmup: WARMUP_FRAMES, count: SAMPLE_FRAMES },
        );
        RUN.sample = summarize(SAMPLE.frames);
        RUN.before = SAMPLE.before;
        RUN.after = SAMPLE.after;
        RUN.observedChestnutForms = SAMPLE.observedChestnutForms;
        RUN.screenshot = `${viewport.name}-round-${round}-${variant}.png`;
        // Keep completed raw samples even if a later screenshot/run hits the CI time limit.
        writeReport();
        await PAGE.screenshot({ path: path.join(OUTPUT, RUN.screenshot) });
        for (const STAGE of [RUN.before, RUN.after]) {
            assert.equal(STAGE.paused, false, 'normal runtime remains active throughout measurement');
            assert.equal(STAGE.phase, 'fighting');
            assert.equal(STAGE.units, 200, 'maximum actual field roster remains deployed');
            assert.equal(STAGE.living, 200);
            assert.equal(STAGE.actors, 200, 'all 200 unit bodies are submitted by the normal renderer');
            assert.equal(STAGE.rewards, 0, 'same unresolved encounter, no reward work');
            for (const BOX of STAGE.hud) {
                assert.ok(BOX.visible && BOX.width > 0 && BOX.height > 0, `${BOX.id} visible`);
                assert.ok(
                    BOX.x >= -1 && BOX.y >= -1 && BOX.right <= STAGE.width + 1 && BOX.bottom <= STAGE.height + 1,
                    `${BOX.id} stays inside ${viewport.name} viewport`,
                );
            }
        }
        assert.ok(RUN.after.tick > RUN.before.tick, 'normal simulation advances');
        assert.ok(RUN.after.bossHp < RUN.before.bossHp, 'actual attacks damage the boss');
        assert.deepEqual(
            RUN.observedChestnutForms,
            variant === 'candidate' ? [6] : [],
            'actual legacy/T6 attack exercised',
        );
        assert.deepEqual(RUN.errors, [], 'no browser errors or external network dependency');
        progress(
            `${viewport.name} round ${round} ${variant}: p95 ${RUN.sample.p95Ms.toFixed(1)} ms, mean ${RUN.sample.meanMs.toFixed(1)} ms`,
        );
    } finally {
        await CONTEXT.close();
    }
}

try {
    await new Promise((resolve) => SERVER.listen(0, '127.0.0.1', resolve));
    browser = await chromium.launch({
        executablePath: process.env.CHROME_PATH,
        args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    });
    REPORT.browserVersion = browser.version();
    writeReport();
    const ORIGIN = `http://127.0.0.1:${SERVER.address().port}`;
    for (const VIEWPORT of VIEWPORTS) {
        const PAIRS = [];
        for (let round = 1; round <= ROUNDS; round++) {
            for (const VARIANT of round % 2 ? ['base', 'candidate'] : ['candidate', 'base']) {
                await runScene(VARIANT, VIEWPORT, round, ORIGIN);
            }
            const RUNS = REPORT.runs.filter((run) => run.viewport === VIEWPORT.name && run.round === round),
                BASE = RUNS.find((run) => run.variant === 'base').sample,
                CANDIDATE = RUNS.find((run) => run.variant === 'candidate').sample;
            PAIRS.push({ round, p95Ratio: CANDIDATE.p95Ms / BASE.p95Ms, meanRatio: CANDIDATE.meanMs / BASE.meanMs });
        }
        const SUMMARY = { viewport: VIEWPORT, pairs: PAIRS };
        for (const VARIANT of ['base', 'candidate']) {
            const RUNS = REPORT.runs.filter((run) => run.viewport === VIEWPORT.name && run.variant === VARIANT);
            SUMMARY[VARIANT] = {
                medianRoundP95Ms: median(RUNS.map((run) => run.sample.p95Ms)),
                medianRoundMeanMs: median(RUNS.map((run) => run.sample.meanMs)),
                medianRoundMedianMs: median(RUNS.map((run) => run.sample.medianMs)),
            };
        }
        SUMMARY.medianPairedP95Ratio = median(PAIRS.map((pair) => pair.p95Ratio));
        SUMMARY.medianPairedMeanRatio = median(PAIRS.map((pair) => pair.meanRatio));
        SUMMARY.medianRoundP95Ratio = SUMMARY.candidate.medianRoundP95Ms / SUMMARY.base.medianRoundP95Ms;
        SUMMARY.passed = SUMMARY.medianPairedP95Ratio <= MAX_P95_RATIO;
        REPORT.comparisons.push(SUMMARY);
        writeReport();
        progress(
            `${VIEWPORT.name} median paired p95 ratio ${SUMMARY.medianPairedP95Ratio.toFixed(3)} (${SUMMARY.passed ? 'PASS' : 'FAIL'})`,
        );
    }
    // Complete both viewports before failing the regression gate so artifacts preserve all evidence.
    assert.ok(
        REPORT.comparisons.every((comparison) => comparison.passed),
        'Median paired p95 regressed by more than 20%; inspect raw frame distributions and paired rounds',
    );
    REPORT.passed = true;
    REPORT.status = 'passed';
} catch (error) {
    REPORT.passed = false;
    REPORT.status = 'failed';
    REPORT.errors.push(String(error.stack || error));
    throw error;
} finally {
    writeReport();
    await browser?.close();
    await new Promise((resolve) => SERVER.close(resolve));
}
