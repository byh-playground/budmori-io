// Paired native browser comparison. The fixture only arranges a mature roster and
// durable enemies; Garden owns deployment, movement, collisions, attacks and damage.
// Run one case per bounded invocation: node tests/scatter-command.e2e.mjs 500 1 center
// Other cases: 100/250/500 x 1/3 bosses, and 500 1 wall. Chromium SwiftShader is not device FPS.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(fileURLToPath(new URL('../', import.meta.url))),
    COUNT = Number(process.argv[2] || 500),
    BOSSES = Number(process.argv[3] || 1),
    PLACEMENT = process.argv[4] || 'center',
    CASE = `${COUNT}-${BOSSES}-${PLACEMENT}`,
    OUTPUT = path.join(ROOT, 'tests/output/scatter-command', CASE),
    HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'),
    MANIFEST = JSON.parse(
        HTML.match(/<script id="bloom-runtime-manifest" type="application\/json">(.*?)<\/script>/s)[1],
    ),
    MODULES = new Map(),
    ERRORS = [],
    REPORT = {
        status: 'running',
        case: CASE,
        renderer: 'Playwright Chromium SwiftShader; functional/render evidence, not physical mobile FPS',
        fixture: 'Seed 731; mature T1 mixed nine species, equal reserves, durable low-damage native bosses',
        samples: {},
        captures: [],
    },
    TYPES = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.svg': 'image/svg+xml',
    };
assert.ok([100, 250, 500].includes(COUNT));
assert.ok([1, 3].includes(BOSSES));
assert.ok(['center', 'wall'].includes(PLACEMENT));
fs.mkdirSync(OUTPUT, { recursive: true });
function saveReport() {
    fs.writeFileSync(path.join(OUTPUT, 'report.json'), JSON.stringify(REPORT, null, 2));
}
saveReport();
function median(values) {
    const SORTED = [...values].sort((a, b) => a - b);
    return SORTED.length ? SORTED[Math.floor(SORTED.length / 2)] : 0;
}
function hullArea(points) {
    const SORTED = [...points].sort((a, b) => a.x - b.x || a.y - b.y),
        CROSS = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x),
        LOWER = [],
        UPPER = [];
    for (const POINT of SORTED) {
        while (LOWER.length >= 2 && CROSS(LOWER.at(-2), LOWER.at(-1), POINT) <= 0) {
            LOWER.pop();
        }
        LOWER.push(POINT);
    }
    for (const POINT of SORTED.reverse()) {
        while (UPPER.length >= 2 && CROSS(UPPER.at(-2), UPPER.at(-1), POINT) <= 0) {
            UPPER.pop();
        }
        UPPER.push(POINT);
    }
    const HULL = LOWER.slice(0, -1).concat(UPPER.slice(0, -1));
    return (
        Math.abs(
            HULL.reduce((sum, point, index) => {
                const NEXT = HULL[(index + 1) % HULL.length];
                return sum + point.x * NEXT.y - point.y * NEXT.x;
            }, 0),
        ) / 2
    );
}
function density(points) {
    if (!points.length) {
        return { count: 0, nearestMedian: 0, gapMedian: 0, area80: 0, occupiedArea: 0 };
    }
    const CENTER = points.reduce(
            (sum, point) => ({ x: sum.x + point.x / points.length, y: sum.y + point.y / points.length }),
            { x: 0, y: 0 },
        ),
        CENTRAL = [...points]
            .sort((a, b) => Math.hypot(a.x - CENTER.x, a.y - CENTER.y) - Math.hypot(b.x - CENTER.x, b.y - CENTER.y))
            .slice(0, Math.ceil(points.length * 0.8)),
        NEAREST = [],
        GAPS = [];
    for (const POINT of points) {
        let nearest = Infinity;
        let gap = Infinity;
        for (const OTHER of points) {
            if (OTHER.id !== POINT.id) {
                const DISTANCE = Math.hypot(POINT.x - OTHER.x, POINT.y - OTHER.y);
                nearest = Math.min(nearest, DISTANCE);
                gap = Math.min(gap, DISTANCE - POINT.radius - OTHER.radius);
            }
        }
        NEAREST.push(nearest);
        GAPS.push(gap);
    }
    return {
        count: points.length,
        nearestMedian: median(NEAREST),
        gapMedian: median(GAPS),
        area80: hullArea(CENTRAL),
        occupiedArea: new Set(points.map((point) => `${Math.floor(point.x / 2)}:${Math.floor(point.y / 2)}`)).size * 4,
    };
}
function summarize(raw) {
    const GROUPS = raw.bosses.map((boss) => ({ id: boss.id, points: [] }));
    for (const POINT of raw.points) {
        let closest = 0;
        for (let index = 1; index < raw.bosses.length; index++) {
            const BOSS = raw.bosses[index],
                PREVIOUS = raw.bosses[closest];
            if (
                Math.hypot(POINT.x - BOSS.x, POINT.y - BOSS.y) < Math.hypot(POINT.x - PREVIOUS.x, POINT.y - PREVIOUS.y)
            ) {
                closest = index;
            }
        }
        GROUPS[closest].points.push(POINT);
    }
    return {
        ...density(raw.points),
        bosses: GROUPS.map((group) => ({ id: group.id, ...density(group.points) })),
        outside: raw.outside,
        damageBySpecies: raw.damageBySpecies,
        movedFraction: raw.movedFraction,
    };
}
const SERVER = http.createServer((request, response) => {
    const RELATIVE = new URL(request.url, 'http://localhost').pathname.replace(/^\/+/, '') || 'index.html',
        FILE = path.resolve(ROOT, RELATIVE);
    if (RELATIVE === 'favicon.ico') {
        response.writeHead(204).end();
        return;
    }
    if (!FILE.startsWith(ROOT + path.sep) || !fs.existsSync(FILE) || !fs.statSync(FILE).isFile()) {
        response.writeHead(404).end();
        return;
    }
    response.setHeader('content-type', TYPES[path.extname(FILE)] || 'application/octet-stream');
    response.end(fs.readFileSync(FILE));
});
let browser;
let page;
async function capture(file) {
    assert.equal(await page.evaluate(() => BUDMORI.runtime.paused), true);
    await page.evaluate(() => {
        BUDMORI.runtime.capturePresentation('reset');
    });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.evaluate(() => document.fonts.ready.then(() => true));
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 60_000));
    try {
        await page.screenshot({ path: path.join(OUTPUT, file), type: 'png', scale: 'css' });
        REPORT.captures.push(file);
    } finally {
        await page.clock.resume();
    }
}
try {
    for (const MODULE of MANIFEST.modules) {
        const BYTES = fs.readFileSync(path.join(ROOT, 'vendor/upstream', `${MODULE.name}.js`));
        assert.equal(createHash('sha256').update(BYTES).digest('hex'), MODULE.sha256);
        MODULES.set(MODULE.url, BYTES);
    }
    await new Promise((resolve, reject) => {
        SERVER.once('error', reject);
        SERVER.listen(0, '127.0.0.1', resolve);
    });
    const ORIGIN = `http://127.0.0.1:${SERVER.address().port}`;
    browser = await chromium.launch({
        executablePath: process.env.CHROME_PATH,
        args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    });
    REPORT.browserVersion = browser.version();
    const CONTEXT = await browser.newContext({
        viewport: { width: 1000, height: 700 },
        deviceScaleFactor: 0.75,
        serviceWorkers: 'block',
    });
    page = await CONTEXT.newPage();
    page.setDefaultTimeout(45000);
    page.on('pageerror', (error) => ERRORS.push(String(error)));
    page.on('console', (message) => {
        if (message.type() === 'error' || message.text().includes('loop stopped')) {
            ERRORS.push(message.text());
        }
    });
    await CONTEXT.route('**/*', (route) => {
        const URL = route.request().url();
        if (URL.startsWith(ORIGIN + '/')) {
            return route.continue();
        }
        if (MODULES.has(URL)) {
            return route.fulfill({
                body: MODULES.get(URL),
                contentType: 'text/javascript',
                headers: { 'access-control-allow-origin': '*' },
            });
        }
        ERRORS.push('Unexpected network request: ' + URL);
        return route.abort();
    });
    await page.clock.install();
    await page.goto(ORIGIN);
    await page.waitForFunction(() => Boolean(globalThis.BUDMORI));
    await page.locator('#newGame').click();
    REPORT.initial = await page.evaluate(
        async ({ count, bosses, placement }) => {
            const { Garden: GARDEN } = await import('./src/farm-model.js'),
                { snapshot: SNAPSHOT, restore: RESTORE } = await import('./src/farm-state.js'),
                { overallXpForLevel: XP } = await import('./src/player-progression.js'),
                WORLD = new GARDEN(731);
            BUDMORI.runtime.paused = true;
            WORLD.resetUnits();
            WORLD.playerProgression.overallXp = XP((count - 100) / 10 + 1);
            WORLD.playerProgression.towerBest = 100;
            WORLD.setWorkBasisPoints(0);
            for (let index = 0; index < count * 2; index++) {
                const UNIT = WORLD.spawn(index % 9, 1, 0, 0);
                UNIT.growthElapsed = UNIT.growthDuration;
                UNIT.dropLanded = true;
            }
            if (!WORLD.startTower(bosses === 3 ? 46 : 1) || !WORLD.finishMarch()) {
                throw new Error('The comparison fixture must enter a real tower encounter');
            }
            while (WORLD.bosses.length < bosses) {
                WORLD.joinNextBoss();
            }
            for (const BOSS of WORLD.bosses) {
                BOSS.setBaseStats({ maxHp: 1e9, attackPower: 0.01 });
                BOSS.setHealth(BOSS.maxHp);
                BOSS.z = 0;
                BOSS.dropLanded = true;
            }
            // Arrange mixed deployments through the same reserve owner used by player/auto deployment.
            for (let index = 0; index < count; index++) {
                const ANGLE = index * 2.399963229728653,
                    BOSS = WORLD.bosses[index % bosses],
                    RADIUS = BOSS.radius + 1 + Math.sqrt(index / bosses) * 0.2;
                WORLD._deployReservedUnit(
                    index % 9,
                    BOSS.x + Math.cos(ANGLE) * RADIUS,
                    BOSS.y + Math.sin(ANGLE) * RADIUS,
                );
            }
            for (const UNIT of WORLD.units) {
                UNIT.z = 0;
                UNIT.dropLanded = true;
            }
            WORLD.farmBossEvent.phase = 'fighting';
            // Establish an actually converged engage state using production movement and combat.
            for (let tick = 0; tick < 120; tick++) {
                WORLD.step(0.05);
            }
            if (placement === 'wall') {
                const SHIFT_X = 20 - WORLD.boss.x;
                for (const UNIT of [...WORLD.units, ...WORLD.bosses]) {
                    UNIT.x += SHIFT_X;
                    WORLD.boundBody(UNIT, 'farm', UNIT.radius);
                }
                WORLD._unitSpatialDirty = true;
            }
            globalThis.__scatterSnapshot = SNAPSHOT(WORLD);
            // The existing internal checkpoint validator/hydrator must also accept this state.
            globalThis.__scatterRestore = () => {
                const SESSION = BUDMORI.runtime;
                SESSION.paused = true;
                SESSION.world = RESTORE(globalThis.__scatterSnapshot);
                SESSION.bindNoticeJournal();
                SESSION.pending.length = 0;
                SESSION.capturePresentation('reset');
                SESSION.loop.resetTiming();
                return SESSION.world;
            };
            globalThis.__scatterRestore();
            return {
                snapshot: globalThis.__scatterSnapshot,
                count: WORLD.fieldFighterCount,
                bosses: WORLD.bosses.length,
            };
        },
        { count: COUNT, bosses: BOSSES, placement: PLACEMENT },
    );
    REPORT.initialHash = createHash('sha256').update(JSON.stringify(REPORT.initial.snapshot)).digest('hex');
    delete REPORT.initial.snapshot;
    assert.equal(REPORT.initial.count, COUNT);
    assert.equal(REPORT.initial.bosses, BOSSES);
    saveReport();
    await capture('initial-desktop.png');
    for (const COMMAND of ['engage', 'scatter']) {
        await page.evaluate(async () => {
            const { unitCapabilityComposition: COMPOSITION } = await import('./src/unit-abilities.js');
            const WORLD = globalThis.__scatterRestore(),
                INITIAL = new Map(WORLD.units.map((unit) => [unit.id, { x: unit.x, y: unit.y }])),
                STEP = WORLD.step,
                OBS = (globalThis.__scatterObservation = {
                    startTick: WORLD.simulationTick,
                    targetTick: WORLD.simulationTick,
                    stepMs: [],
                    damageBySpecies: {},
                    hitIds: new Set(),
                    attackStarts: 0,
                    rangeViolations: [],
                    samples: {},
                    firstMovementSeconds: null,
                });
            WORLD.onNotice.on((notice) => {
                if (notice.kind === 'boss-hit' && notice.damage > 0) {
                    OBS.damageBySpecies[notice.species] = (OBS.damageBySpecies[notice.species] || 0) + notice.damage;
                    OBS.hitIds.add(notice.unit);
                }
            });
            for (const UNIT of WORLD.units) {
                const BEGIN = UNIT.ability.begin;
                UNIT.ability.begin = function (world, target) {
                    const ENEMY = world._unitForId(target?.id),
                        DISTANCE = ENEMY ? Math.hypot(UNIT.x - ENEMY.x, UNIT.y - ENEMY.y) : null,
                        LIMIT = ENEMY
                            ? ENEMY.radius + this.attackRange(world) + COMPOSITION(UNIT.species).outerRangeSlack
                            : null,
                        PHASE = this.phase,
                        RESULT = BEGIN.call(this, world, target);
                    if (PHASE === 'idle' && this.phase !== 'idle') {
                        OBS.attackStarts++;
                        if (DISTANCE !== null && DISTANCE > LIMIT + 0.001) {
                            OBS.rangeViolations.push({
                                id: UNIT.id,
                                species: UNIT.species,
                                distance: DISTANCE,
                                limit: LIMIT,
                            });
                        }
                    }
                    return RESULT;
                };
            }
            globalThis.__scatterRead = () => {
                const POINTS = WORLD.units
                    .filter((unit) => unit.faction === 'player' && !unit.isBattleOnlySummon && unit.hp > 0)
                    .map((unit) => ({ id: unit.id, x: unit.x, y: unit.y, radius: unit.radius, species: unit.species }));
                return {
                    points: POINTS,
                    bosses: WORLD.bosses
                        .filter((boss) => boss.active && boss.hp > 0)
                        .map((boss) => ({ id: boss.id, x: boss.x, y: boss.y })),
                    outside: POINTS.filter(
                        (point) => !BUDMORI.ArenaGeometry.inside(point, 'farm', Math.max(0, point.radius - 0.01)),
                    ).length,
                    damageBySpecies: { ...OBS.damageBySpecies },
                    movedFraction:
                        POINTS.filter(
                            (point) =>
                                INITIAL.has(point.id) &&
                                Math.hypot(point.x - INITIAL.get(point.id).x, point.y - INITIAL.get(point.id).y) > 0.5,
                        ).length / POINTS.length,
                };
            };
            WORLD.step = function (dt) {
                const START = performance.now(),
                    RESULT = STEP.call(this, dt);
                OBS.stepMs.push(performance.now() - START);
                const ELAPSED = this.simulationTick - OBS.startTick;
                if (
                    OBS.firstMovementSeconds === null &&
                    ELAPSED % 2 === 0 &&
                    globalThis.__scatterRead().movedFraction >= 0.5
                ) {
                    OBS.firstMovementSeconds = ELAPSED / 20;
                }
                if (this.simulationTick >= OBS.targetTick) {
                    BUDMORI.runtime.paused = true;
                }
                return RESULT;
            };
        });
        await page.locator(`input[name="battleCommand"][value="${COMMAND}"]`).check();
        // FarmSession consumes the product input while paused, before the paired first tick.
        await page.waitForFunction((command) => BUDMORI.sim.battleCommand === command, COMMAND);
        REPORT.samples[COMMAND] = { 0: summarize(await page.evaluate(() => globalThis.__scatterRead())) };
        for (const SECONDS of [0.5, 2, 5, 10]) {
            await page.evaluate((seconds) => {
                globalThis.__scatterObservation.targetTick = globalThis.__scatterObservation.startTick + seconds * 20;
                // Advance the real model at its fixed 20 Hz, independently of
                // SwiftShader render latency. The native renderer draws the
                // resulting bodies; no movement or combat is mocked.
                while (BUDMORI.sim.simulationTick < globalThis.__scatterObservation.targetTick) {
                    BUDMORI.sim.step(0.05);
                }
                BUDMORI.runtime.capturePresentation('reset');
            }, SECONDS);
            await page.waitForFunction(
                () =>
                    BUDMORI.runtime.paused && BUDMORI.sim.simulationTick >= globalThis.__scatterObservation.targetTick,
            );
            const RAW = await page.evaluate(() => globalThis.__scatterRead());
            REPORT.samples[COMMAND][SECONDS] = summarize(RAW);
            assert.equal(RAW.outside, 0, `${COMMAND} keeps bodies inside walls at ${SECONDS}s`);
            if (SECONDS === 5 || SECONDS === 10) {
                await capture(`${COMMAND}-${SECONDS}s-desktop.png`);
            }
            saveReport();
        }
        REPORT[`${COMMAND}Observation`] = await page.evaluate(() => {
            const OBS = globalThis.__scatterObservation,
                SORTED = [...OBS.stepMs].sort((a, b) => a - b),
                RENDERER = BUDMORI.renderer;
            return {
                firstMovementSeconds: OBS.firstMovementSeconds,
                stepMedianMs: SORTED[Math.floor(SORTED.length * 0.5)],
                stepP95Ms: SORTED[Math.floor(SORTED.length * 0.95)],
                simulationSteps: OBS.stepMs.length,
                attackStarts: OBS.attackStarts,
                rangeViolations: OBS.rangeViolations,
                attackersWithDamage: OBS.hitIds.size,
                camera: { zoom: RENDERER.zoom, pan: RENDERER.pan, view: RENDERER.view, scale: RENDERER.scale },
            };
        });
    }
    assert.deepEqual(
        REPORT.engageObservation.camera,
        REPORT.scatterObservation.camera,
        'paired captures use the identical camera',
    );
    assert.deepEqual(
        REPORT.samples.engage[0],
        REPORT.samples.scatter[0],
        'paired commands start with identical bodies and damage',
    );
    REPORT.comparison = {};
    for (const SECONDS of [0.5, 2, 5, 10]) {
        const ENGAGE = REPORT.samples.engage[SECONDS],
            SCATTER = REPORT.samples.scatter[SECONDS];
        REPORT.comparison[SECONDS] = {
            nearestRatio: SCATTER.nearestMedian / ENGAGE.nearestMedian,
            area80Ratio: SCATTER.area80 / ENGAGE.area80,
            gapMedian: SCATTER.gapMedian,
        };
    }
    assert.deepEqual(REPORT.engageObservation.rangeViolations, [], 'engage uses the existing natural attack envelope');
    assert.deepEqual(
        REPORT.scatterObservation.rangeViolations,
        [],
        'scatter must not extend the natural attack envelope',
    );
    if (COUNT === 100 && BOSSES === 1 && PLACEMENT === 'center') {
        REPORT.switches = [];
        for (const COMMAND of ['retreat', 'engage', 'scatter', 'engage', 'retreat', 'scatter']) {
            await page.locator(`input[name="battleCommand"][value="${COMMAND}"]`).check();
            await page.waitForFunction((command) => BUDMORI.sim.battleCommand === command, COMMAND);
            await page.evaluate(() => {
                globalThis.__scatterObservation.targetTick = BUDMORI.sim.simulationTick + 10;
                BUDMORI.runtime.loop.resetTiming();
                BUDMORI.runtime.paused = false;
            });
            await page.waitForFunction(
                () =>
                    BUDMORI.runtime.paused && BUDMORI.sim.simulationTick >= globalThis.__scatterObservation.targetTick,
            );
            const SWITCH = await page.evaluate(() => ({
                command: BUDMORI.sim.battleCommand,
                checked: [...document.querySelectorAll('input[name="battleCommand"]')]
                    .filter((input) => input.checked)
                    .map((input) => input.value),
                field: BUDMORI.sim.fieldFighterCount,
                outside: globalThis.__scatterRead().outside,
            }));
            REPORT.switches.push(SWITCH);
            assert.deepEqual(SWITCH.checked, [COMMAND]);
            assert.equal(SWITCH.command, COMMAND);
            assert.equal(SWITCH.outside, 0);
        }
        const BEFORE_RESERVE = await page.evaluate(() => {
            const WORLD = BUDMORI.sim,
                IDS = WORLD.units.map((unit) => unit.id),
                VICTIM = WORLD.units.find((unit) => !unit.isBattleOnlySummon && unit.species !== 4);
            VICTIM.setHealth(0);
            WORLD.handleUnitDeath(VICTIM);
            globalThis.__scatterObservation.targetTick = WORLD.simulationTick + 40;
            BUDMORI.runtime.loop.resetTiming();
            BUDMORI.runtime.paused = false;
            return { ids: IDS, victim: VICTIM.id };
        });
        await page.waitForFunction(
            () => BUDMORI.runtime.paused && BUDMORI.sim.simulationTick >= globalThis.__scatterObservation.targetTick,
        );
        REPORT.reserve = await page.evaluate((before) => {
            const WORLD = BUDMORI.sim,
                NEW = WORLD.units.filter((unit) => !before.ids.includes(unit.id) && !unit.isBattleOnlySummon);
            return {
                command: WORLD.battleCommand,
                field: WORLD.fieldFighterCount,
                replacements: NEW.map((unit) => ({
                    id: unit.id,
                    landed: unit.dropLanded,
                    x: unit.x,
                    y: unit.y,
                    speed: Math.hypot(unit.vx, unit.vy),
                })),
                outside: globalThis.__scatterRead().outside,
            };
        }, BEFORE_RESERVE);
        assert.equal(REPORT.reserve.command, 'scatter');
        assert.equal(REPORT.reserve.field, COUNT);
        assert.equal(REPORT.reserve.replacements.length, 1);
        assert.equal(REPORT.reserve.replacements[0].landed, true);
        assert.equal(REPORT.reserve.outside, 0);
        await capture('reserve-scatter-desktop.png');
        // Longer native-model observation after the rendered comparison catches units
        // stranded forever by a crowded approach path. It is not an FPS measurement.
        REPORT.activity = await page.evaluate(() => {
            const WORLD = BUDMORI.sim,
                POINTS = new Map(
                    WORLD.units
                        .filter((unit) => unit.hp > 0 && !unit.isBattleOnlySummon)
                        .map((unit) => [unit.id, { x: unit.x, y: unit.y, travel: 0, attacks: 0 }]),
                ),
                OFF = WORLD.onNotice.on((notice) => {
                    if (notice.kind === 'attack-launch' && POINTS.has(notice.unit)) {
                        POINTS.get(notice.unit).attacks++;
                    }
                });
            for (let tick = 0; tick < 400; tick++) {
                WORLD.step(0.05);
                for (const UNIT of WORLD.units) {
                    const POINT = POINTS.get(UNIT.id);
                    if (POINT) {
                        POINT.travel += Math.hypot(UNIT.x - POINT.x, UNIT.y - POINT.y);
                        POINT.x = UNIT.x;
                        POINT.y = UNIT.y;
                    }
                }
            }
            OFF();
            return {
                seconds: 20,
                tracked: POINTS.size,
                inactive: [...POINTS.entries()]
                    .filter(([, point]) => point.travel < 0.5 && point.attacks === 0)
                    .map(([id, point]) => ({ id, ...point })),
                attacking: [...POINTS.values()].filter((point) => point.attacks > 0).length,
                travelling: [...POINTS.values()].filter((point) => point.travel >= 0.5).length,
            };
        });
        saveReport();
    }
    // The 500-unit map is finite. Keep thresholds explicit and report every raw metric;
    // screenshot inspection remains mandatory before claiming the visual change is clear.
    if (BOSSES === 1 && PLACEMENT === 'center') {
        for (const SECONDS of [5, 10]) {
            assert.ok(
                REPORT.comparison[SECONDS].nearestRatio >= 1.5,
                `scatter nearest distance >=1.5x engage at ${SECONDS}s`,
            );
            assert.ok(
                REPORT.comparison[SECONDS].area80Ratio >= 1.7,
                `scatter central80 area >=1.7x engage at ${SECONDS}s`,
            );
        }
    }
    assert.deepEqual(ERRORS, []);
    REPORT.status = 'passed';
} catch (error) {
    REPORT.status = 'failed';
    REPORT.error = String(error.stack || error);
    throw error;
} finally {
    REPORT.errors = ERRORS;
    saveReport();
    await browser?.close();
    await new Promise((resolve) => SERVER.close(resolve));
    console.log(
        JSON.stringify({ case: CASE, status: REPORT.status, comparison: REPORT.comparison, output: OUTPUT }, null, 2),
    );
}
