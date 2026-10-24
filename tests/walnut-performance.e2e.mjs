// Opt-in rendered benchmark. No bundling, manual step loop, reduced army, or discarded outliers.
// Supply an untouched git archive of BASE_COMMIT through WALNUT_PERFORMANCE_BASE_ROOT.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { sourceGraph } from '../scripts/source-graph.mjs';

const SPECIES = process.env.PERFORMANCE_SPECIES || 'walnut',
    SETTINGS = {
        chestnut: {
            id: 3,
            ability: 'chestnut-target-thorns',
            base: '23f65b0232472435ac8ca18bc362ebc1308a65ca',
            equalTree: true,
        },
        wheat: { id: 7, ability: 'wheat-command-crit', base: '76edf4868031f3b2e09f6c64c32c94a4ada745e8' },
        rice: { id: 6, ability: 'rice-low-health-harvest', base: '7fac7631be682d3750beeab16981fccd83898195' },
        walnut: { id: 5, ability: 'walnut-raw-guard', base: 'bde28685e3ef0dc15934cde9d41a6b9b5e42ec7f' },
    };
assert.ok(Object.hasOwn(SETTINGS, SPECIES), 'Choose chestnut, wheat, rice or walnut performance');
const SPECIES_ID = SETTINGS[SPECIES].id,
    ABILITY_ID = SETTINGS[SPECIES].ability;
const ROOT = fileURLToPath(new URL('../', import.meta.url)),
    BASE_COMMIT = SETTINGS[SPECIES].base,
    OUTPUT = path.join(ROOT, `tests/output/${SPECIES}-performance`),
    HASH = (bytes) => createHash('sha256').update(bytes).digest('hex'),
    MEDIAN = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)],
    P95 = (values) => [...values].sort((a, b) => a - b)[Math.ceil(values.length * 0.95) - 1],
    TYPES = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.svg': 'image/svg+xml',
        '.json': 'application/json',
    };
assert.ok(process.env.WALNUT_PERFORMANCE_BASE_ROOT, 'Set WALNUT_PERFORMANCE_BASE_ROOT to the exact baseline archive');
const ROOTS = { base: fs.realpathSync(process.env.WALNUT_PERFORMANCE_BASE_ROOT), candidate: fs.realpathSync(ROOT) },
    GRAPHS = Object.fromEntries(Object.entries(ROOTS).map(([key, root]) => [key, sourceGraph(root)])),
    MANIFESTS = Object.fromEntries(
        Object.entries(ROOTS).map(([key, root]) => [
            key,
            JSON.parse(
                fs
                    .readFileSync(path.join(root, 'index.html'), 'utf8')
                    .match(/<script id="bloom-runtime-manifest" type="application\/json">(.*?)<\/script>/s)[1],
            ),
        ]),
    ),
    REPORT = {
        status: 'running',
        baseCommit: BASE_COMMIT,
        sourceGraphs: GRAPHS,
        scope: 'One Chromium process, real production simulation and render. SwiftShader/touch emulation, not hardware or physical-device FPS.',
        protocol: {
            units: 200,
            species: SPECIES_ID,
            tier: 6,
            seed: 731,
            rounds: 3,
            warmupFrames: 60,
            sampleFrames: 120,
            p95Limit: 1.2,
            order: 'base/candidate, candidate/base, base/candidate',
            fixture: `Stationary 1e12 HP boss stunned for10000s, all200 T6 ${SPECIES} bodies deployed in identical radial layout. ${SETTINGS[SPECIES].equalTree ? 'Both arms have identical T2–T6 research and density rank5; no other investments.' : 'Candidate only has T2–T6 research; no basic/specialty investments.'} No incoming RAW in this isolated maximum-army rendering fixture.`,
            timing: 'rAF intervals retain all120 raw samples. CPU uses the production detailed profiler last30 completed frames, not the whole rAF window; nested stages are not added. Equal frame windows may cover different wall/simulation durations.',
        },
        runs: [],
        summaries: [],
    };
assert.notEqual(ROOTS.base, ROOTS.candidate);
for (const ENTRY of GRAPHS.base.files) {
    const EXPECTED = execFileSync('git', ['show', `${BASE_COMMIT}:${ENTRY.file}`], {
        cwd: ROOT,
        maxBuffer: 16 * 1024 * 1024,
    });
    assert.equal(ENTRY.sha256, HASH(EXPECTED), `exact baseline source ${ENTRY.file}`);
}
for (const [VARIANT, MANIFEST] of Object.entries(MANIFESTS)) {
    assert.equal(MANIFEST.game.file, 'src/farm-app.js');
    for (const MODULE of MANIFEST.modules) {
        assert.equal(
            HASH(fs.readFileSync(path.join(ROOTS[VARIANT], 'vendor/upstream', `${MODULE.name}.js`))),
            MODULE.sha256,
        );
    }
}
fs.mkdirSync(OUTPUT, { recursive: true });
function saveReport() {
    fs.writeFileSync(path.join(OUTPUT, 'report.json'), JSON.stringify(REPORT, null, 2));
}
const SERVER = http.createServer((request, response) => {
    const MATCH = new URL(request.url, 'http://localhost').pathname.match(/^\/(base|candidate)\/(.*)$/),
        DIRECTORY = MATCH && ROOTS[MATCH[1]],
        FILE = DIRECTORY && path.resolve(DIRECTORY, decodeURIComponent(MATCH[2]));
    if (!FILE || !FILE.startsWith(DIRECTORY + path.sep) || !fs.existsSync(FILE) || !fs.statSync(FILE).isFile()) {
        response.writeHead(404).end();
        return;
    }
    const BYTES = fs.readFileSync(FILE),
        ENTRY = GRAPHS[MATCH[1]].files.find((entry) => entry.file === MATCH[2]);
    if (ENTRY && HASH(BYTES) !== ENTRY.sha256) {
        response.writeHead(409).end();
        return;
    }
    response.setHeader('content-type', TYPES[path.extname(FILE)] || 'application/octet-stream');
    response.end(BYTES);
});
let browser;
async function run(variant, viewport, round, origin) {
    const RUN = { variant, viewport: viewport.name, round, errors: [] },
        CONTEXT = await browser.newContext({
            viewport: { width: viewport.width, height: viewport.height },
            isMobile: viewport.touch,
            hasTouch: viewport.touch,
            deviceScaleFactor: 1,
            serviceWorkers: 'block',
        }),
        PAGE = await CONTEXT.newPage();
    REPORT.runs.push(RUN);
    saveReport();
    PAGE.setDefaultTimeout(90000);
    PAGE.on('pageerror', (error) => RUN.errors.push(String(error)));
    const MODULES = new Map(
        MANIFESTS[variant].modules.map((module) => [
            module.url,
            fs.readFileSync(path.join(ROOTS[variant], 'vendor/upstream', `${module.name}.js`)),
        ]),
    );
    await CONTEXT.route('**/*', (route) => {
        const URL = route.request().url();
        if (URL.endsWith('/favicon.ico')) {
            return route.fulfill({ status: 204 });
        }
        if (URL.startsWith(`${origin}/${variant}/`)) {
            return route.continue();
        }
        if (MODULES.has(URL)) {
            return route.fulfill({
                body: MODULES.get(URL),
                contentType: 'text/javascript',
                headers: { 'access-control-allow-origin': '*' },
            });
        }
        RUN.errors.push(`Unexpected network: ${URL}`);
        return route.abort();
    });
    try {
        await PAGE.goto(`${origin}/${variant}/index.html`);
        await PAGE.waitForFunction(() => globalThis.BUDMORI?.renderer?.assetsReady);
        RUN.initial = await PAGE.evaluate(
            ({ build, speciesId, abilityId, equalTree }) => {
                document.getElementById('newGame').click();
                const WORLD = BUDMORI.sim,
                    INVESTMENT = WORLD.playerProgression.abilities[abilityId];
                if (WORLD.seed !== 731 || WORLD.simulationTick !== 0) {
                    throw Error('New game seed/tick mismatch');
                }
                WORLD.resetUnits();
                WORLD.setWorkBasisPoints(0);
                if (build === 'candidate' || equalTree) {
                    if (INVESTMENT.treeVersion !== 1) {
                        throw Error('Candidate tree not active');
                    }
                    INVESTMENT.masteryLevel = 50;
                    INVESTMENT.nodeRanks = Object.fromEntries([2, 3, 4, 5, 6].map((tier) => [`evolution-${tier}`, 1]));
                    if (equalTree) {
                        INVESTMENT.nodeRanks['specialty-1'] = 5;
                    }
                } else if (INVESTMENT.treeVersion) {
                    throw Error('Baseline is not legacy selected species');
                }
                for (let index = 0; index < 200; index++) {
                    const UNIT = WORLD.spawn(speciesId, 6, 0, 0);
                    UNIT.growth = 3;
                    UNIT.growthElapsed = UNIT.growthDuration;
                    UNIT.dropLanded = true;
                }
                if (!WORLD.startTower(1) || !WORLD.finishMarch()) {
                    throw Error('Tower setup failed');
                }
                WORLD._benched.clear();
                WORLD._benchRevision++;
                WORLD.farmBossEvent.phase = 'fighting';
                Object.assign(WORLD.boss, { z: 0, hp: 1e12, maxHp: 1e12, stun: 10000 });
                WORLD.units.forEach((unit, index) => {
                    const ANGLE = index * 2.399963229728653,
                        DISTANCE = WORLD.boss.radius + 1 + (index % 4) * 0.5;
                    Object.assign(unit, {
                        x: Math.cos(ANGLE) * DISTANCE,
                        y: Math.sin(ANGLE) * DISTANCE,
                        z: 0,
                        dropLanded: true,
                    });
                });
                WORLD._unitSpatialDirty = true;
                globalThis.__walnutPerformanceActivity = { hits: 0, damage: 0 };
                WORLD.onCombatResolved.on((event) => {
                    globalThis.__walnutPerformanceActivity.hits += event.hits || 0;
                    globalThis.__walnutPerformanceActivity.damage += event.damageDealt || 0;
                });
                const DETAIL = document.getElementById('diagnosticDetail');
                DETAIL.checked = true;
                DETAIL.dispatchEvent(new Event('change', { bubbles: true }));
                return {
                    seed: WORLD.seed,
                    units: WORLD.units.map((unit) => ({
                        species: unit.species,
                        tier: unit.tier,
                        x: unit.x,
                        y: unit.y,
                    })),
                    build: structuredClone(INVESTMENT),
                };
            },
            { build: variant, speciesId: SPECIES_ID, abilityId: ABILITY_ID, equalTree: !!SETTINGS[SPECIES].equalTree },
        );
        RUN.measurement = await PAGE.evaluate(async () => {
            const FRAMES = [],
                FORMS = new Set(),
                READ = () => ({
                    tick: BUDMORI.sim.simulationTick,
                    units: BUDMORI.sim.units.length,
                    living: BUDMORI.sim.units.filter((unit) => unit.hp > 0).length,
                    actors: BUDMORI.renderer.actors.filter(
                        (actor) => actor.presentation === BUDMORI.renderer.unitPresentation,
                    ).length,
                    phase: BUDMORI.sim.farmBossEvent.phase,
                    paused: BUDMORI.runtime.paused,
                    bossHp: BUDMORI.sim.boss.hp,
                    activity: { ...globalThis.__walnutPerformanceActivity },
                });
            for (let index = 0; index < 60; index++) {
                await new Promise(requestAnimationFrame);
            }
            const BEFORE = READ();
            let previous = await new Promise(requestAnimationFrame);
            for (let index = 0; index < 120; index++) {
                const NOW = await new Promise(requestAnimationFrame);
                FRAMES.push(NOW - previous);
                previous = NOW;
                for (const UNIT of BUDMORI.sim.units) {
                    const FORM = (
                        UNIT.ability.action?.chestnutAttack ||
                        UNIT.ability.action?.wheatAttack ||
                        UNIT.ability.action?.riceAttack ||
                        UNIT.ability.action?.walnutAttack
                    )?.form;
                    if (FORM) {
                        FORMS.add(FORM);
                    }
                }
            }
            return {
                framesMs: FRAMES,
                before: BEFORE,
                after: READ(),
                forms: [...FORMS],
                diagnostics: globalThis.BudmoriPerformanceDiagnostics.snapshot(),
            };
        });
        saveReport();
        const SAMPLE = RUN.measurement,
            CPU = SAMPLE.diagnostics.frames.map((frame) => frame.stagesMs.simulation);
        assert.equal(SAMPLE.framesMs.length, 120);
        assert.ok(SAMPLE.framesMs.every((value) => Number.isFinite(value) && value > 0));
        assert.equal(SAMPLE.diagnostics.detailed, true);
        assert.equal(CPU.length, 30);
        assert.ok(CPU.every((value) => Number.isFinite(value) && value >= 0));
        assert.ok(CPU.some((value) => value > 0));
        RUN.frameP95Ms = P95(SAMPLE.framesMs);
        RUN.simulationP95Ms = P95(CPU);
        for (const STATE of [SAMPLE.before, SAMPLE.after]) {
            assert.equal(STATE.units, 200);
            assert.equal(STATE.living, 200);
            assert.equal(STATE.actors, 200);
            assert.equal(STATE.paused, false);
            assert.equal(STATE.phase, 'fighting');
        }
        assert.ok(SAMPLE.after.tick > SAMPLE.before.tick);
        assert.ok(SAMPLE.after.activity.hits > SAMPLE.before.activity.hits);
        assert.ok(SAMPLE.after.bossHp < SAMPLE.before.bossHp);
        if (variant === 'candidate') {
            assert.ok(SAMPLE.forms.includes(6));
        }
        assert.deepEqual(RUN.errors, []);
        RUN.status = 'passed';
        await PAGE.screenshot({ path: path.join(OUTPUT, `${viewport.name}-${round}-${variant}.png`) });
    } finally {
        saveReport();
        await CONTEXT.close();
    }
}
try {
    await new Promise((resolve, reject) => {
        SERVER.once('error', reject);
        SERVER.listen(0, '127.0.0.1', resolve);
    });
    browser = await chromium.launch({
        executablePath: process.env.CHROME_PATH,
        args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    });
    REPORT.browser = browser.version();
    for (const VIEWPORT of [
        { name: 'desktop', width: 1100, height: 850, touch: false },
        { name: 'landscape', width: 844, height: 390, touch: true },
    ]) {
        const PAIRS = [];
        for (let round = 0; round < 3; round++) {
            for (const VARIANT of round % 2 ? ['candidate', 'base'] : ['base', 'candidate']) {
                await run(VARIANT, VIEWPORT, round, `http://127.0.0.1:${SERVER.address().port}`);
            }
            const PAIR = REPORT.runs.filter((entry) => entry.viewport === VIEWPORT.name && entry.round === round),
                BASE = PAIR.find((entry) => entry.variant === 'base'),
                CANDIDATE = PAIR.find((entry) => entry.variant === 'candidate');
            assert.deepEqual(CANDIDATE.initial.units, BASE.initial.units);
            if (SETTINGS[SPECIES].equalTree) {
                assert.deepEqual(CANDIDATE.initial.build, BASE.initial.build);
            }
            PAIRS.push({
                round,
                frameRatio: CANDIDATE.frameP95Ms / BASE.frameP95Ms,
                simulationRatio: CANDIDATE.simulationP95Ms / BASE.simulationP95Ms,
            });
        }
        REPORT.summaries.push({
            viewport: VIEWPORT.name,
            pairs: PAIRS,
            medianFrameRatio: MEDIAN(PAIRS.map((pair) => pair.frameRatio)),
            medianSimulationRatio: MEDIAN(PAIRS.map((pair) => pair.simulationRatio)),
        });
        saveReport();
    }
    assert.ok(
        REPORT.summaries.every((summary) => summary.medianFrameRatio <= 1.2 && summary.medianSimulationRatio <= 1.2),
        'Median paired frame or simulation p95 exceeds20%; retain all samples and investigate',
    );
    REPORT.status = 'passed';
} catch (error) {
    REPORT.status = 'failed';
    REPORT.error = String(error);
    throw error;
} finally {
    saveReport();
    await browser?.close();
    SERVER.close();
}
