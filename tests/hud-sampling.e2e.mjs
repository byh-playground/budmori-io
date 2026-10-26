// Native sampled health -> existing product sync -> actual DOM. This deliberately
// does not depend on an implementation-specific presentation aggregate/cache.
// BUDMORI_HUD_ROOT may point at another immutable checkout for the same checks.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const TEST_ROOT = fileURLToPath(new URL('../', import.meta.url)),
    ROOT = path.resolve(process.env.BUDMORI_HUD_ROOT || TEST_ROOT),
    OUTPUT = path.join(TEST_ROOT, 'tests/output/hud-sampling'),
    ACCESSOR = '\nglobalThis.__budmoriHudAccess = { sync, start };\n',
    TYPES = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.svg': 'image/svg+xml',
    },
    HASH = (value) => createHash('sha256').update(value).digest('hex'),
    HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'),
    MANIFEST = JSON.parse(
        HTML.match(/<script id="bloom-runtime-manifest" type="application\/json">(.*?)<\/script>/s)[1],
    ),
    MODULES = new Map(),
    ERRORS = [],
    REPORT = {
        status: 'running',
        startedAt: new Date().toISOString(),
        root: ROOT,
        protocol: {
            seed: 731,
            initialField: 9,
            initialReserves: 9,
            sampleOffsetsMs: [0, 10, 25, 40, 50],
            nativePresentationDelayMs: 50,
            controls:
                'Only automatic app RAF and test wall-clock functions are controlled. Native presentation schemas, sampling and product sync remain unchanged. Expected values come from the exact sampled display passed to sync.',
            limitations:
                'Functional DOM regression in desktop Chromium/SwiftShader. It is not a performance or physical mobile-device measurement.',
        },
        sourceHashes: Object.fromEntries(
            ['src/farm-app.js', 'src/farm-session.js', 'src/farm-hud-counts.js']
                .filter((file) => fs.existsSync(path.join(ROOT, file)))
                .map((file) => [file, HASH(fs.readFileSync(path.join(ROOT, file)))]),
        ),
        accessorSha256: HASH(ACCESSOR),
        errors: ERRORS,
    };
fs.mkdirSync(OUTPUT, { recursive: true });
for (const MODULE of MANIFEST.modules) {
    const BYTES = fs.readFileSync(path.join(ROOT, 'vendor/upstream', MODULE.name + '.js'));
    assert.equal(HASH(BYTES), MODULE.sha256, `pinned offline ${MODULE.name}`);
    MODULES.set(MODULE.url, BYTES);
}
const SERVER = http.createServer((request, response) => {
    const URL_LOCAL = new URL(request.url, 'http://127.0.0.1'),
        RELATIVE = decodeURIComponent(URL_LOCAL.pathname).replace(/^\/+/, '') || 'index.html',
        FILE = path.resolve(ROOT, RELATIVE);
    if (URL_LOCAL.pathname === '/favicon.ico') {
        response.writeHead(204).end();
        return;
    }
    if (!FILE.startsWith(ROOT + path.sep) || !fs.existsSync(FILE) || !fs.statSync(FILE).isFile()) {
        response.writeHead(404).end();
        return;
    }
    response.setHeader('content-type', TYPES[path.extname(FILE)] || 'application/octet-stream');
    const BYTES = fs.readFileSync(FILE);
    response.end(FILE === path.join(ROOT, 'src/farm-app.js') ? Buffer.concat([BYTES, Buffer.from(ACCESSOR)]) : BYTES);
});
let browser;
let deadline;
function save() {
    fs.writeFileSync(path.join(OUTPUT, 'report.json'), JSON.stringify(REPORT, null, 2) + '\n');
}
save();
try {
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
    deadline = setTimeout(() => {
        REPORT.deadlineExceeded = true;
        browser.close().catch(() => {});
    }, 170000);
    const CONTEXT = await browser.newContext({
            viewport: { width: 1100, height: 780 },
            deviceScaleFactor: 1,
            serviceWorkers: 'block',
        }),
        PAGE = await CONTEXT.newPage();
    PAGE.setDefaultTimeout(30000);
    PAGE.on('pageerror', (error) => ERRORS.push(String(error)));
    PAGE.on('console', (message) => {
        if (message.type() === 'error' || message.text().includes('loop stopped')) {
            ERRORS.push(message.text());
        }
    });
    await CONTEXT.route('**/*', (route) => {
        const URL_LOCAL = route.request().url();
        if (URL_LOCAL.startsWith(ORIGIN + '/')) {
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
    await PAGE.goto(`${ORIGIN}/index.html`);
    await PAGE.waitForFunction(() => Boolean(globalThis.BUDMORI && globalThis.__budmoriHudAccess));
    REPORT.result = await PAGE.evaluate(async () => {
        const { Garden: GARDEN, CONFIG } = await import('./src/farm-model.js'),
            { snapshot: SNAPSHOT, restore: RESTORE } = await import('./src/farm-state.js'),
            STAGES = [],
            CHECK = (condition, message) => {
                if (!condition) {
                    throw new Error(message);
                }
            },
            WIDTH_STYLE = document.createElement('div').style,
            OFFSETS = [0, 10, 25, 40, 50];
        let world = new GARDEN(731),
            session,
            clock;
        world.resetUnits();
        world.setWorkBasisPoints(0);
        for (let index = 0; index < 18; index++) {
            const UNIT = world.spawn(index % 9, 1, 0, 0);
            UNIT.growthElapsed = UNIT.growthDuration;
            UNIT.dropLanded = true;
        }
        CHECK(world.startTower(1) && world.finishMarch(), 'native tower fixture starts');
        for (let species = 0; species < 9; species++) {
            CHECK(world._deployReservedUnit(species, species - 4, 0), 'native field deployment succeeds');
        }
        for (const UNIT of world.units) {
            UNIT.z = 0;
            UNIT.dropLanded = true;
        }
        world.farmBossEvent.phase = 'fighting';

        const INSTALL = (next) => {
                globalThis.__budmoriHudAccess.start(next, false);
                world = next;
                session = BUDMORI.runtime;
                clock = session.presentationOriginWallMs + 100;
                // No simulation is advanced by this sampling fixture. These two
                // functions supply wall time, not replacement interpolation logic.
                session.captureClock = () => clock;
                session.frameClock = (now) => now;
            },
            SAMPLE = (name, offset) => {
                const NOW = clock + offset,
                    DISPLAY = session.presentation(NOW),
                    HEALTH = { current: 0, max: 0, living: 0, total: 0 };
                for (const UNIT of DISPLAY.units) {
                    if (UNIT.faction === CONFIG.factions.PLAYER) {
                        HEALTH.current += Math.max(0, Math.min(UNIT.maxHp, UNIT.hp));
                        HEALTH.max += UNIT.maxHp;
                        HEALTH.living += UNIT.hp > 0 ? 1 : 0;
                        HEALTH.total++;
                    }
                }
                WIDTH_STYLE.width = (HEALTH.max ? (HEALTH.current / HEALTH.max) * 100 : 0) + '%';
                const EXPECTED = {
                        now: String(HEALTH.current),
                        max: String(HEALTH.max),
                        text:
                            Math.ceil(HEALTH.current) +
                            '/' +
                            Math.ceil(HEALTH.max) +
                            ' · ' +
                            HEALTH.living +
                            '/' +
                            HEALTH.total +
                            '마리',
                        width: WIDTH_STYLE.width,
                    },
                    BEFORE = JSON.stringify(SNAPSHOT(world));
                globalThis.__budmoriHudAccess.sync(DISPLAY, NOW, []);
                const BAR = document.getElementById('allyHealth'),
                    ACTUAL = {
                        now: BAR.getAttribute('aria-valuenow'),
                        max: BAR.getAttribute('aria-valuemax'),
                        text: document.getElementById('allyHealthText').textContent,
                        width: BAR.style.width,
                    };
                CHECK(JSON.stringify(ACTUAL) === JSON.stringify(EXPECTED), `${name}/${offset}ms HP DOM mismatch`);
                CHECK(JSON.stringify(SNAPSHOT(world)) === BEFORE, `${name}/${offset}ms sync mutated authority`);
                CHECK(!document.getElementById('bossbar').hidden, `${name}/${offset}ms HP HUD is visible`);
                const POPULATION = world.unitCollection.items.filter((unit) => !unit.isBattleOnlySummon).length,
                    HAND = world.handCounts,
                    RESERVES = [...HAND.values()].reduce((sum, count) => sum + count, 0),
                    FRONTLINE = `전선 ${world.fieldFighterCount}/${world.frontlineLimit} · 예비대 ${RESERVES}`,
                    EXPECTED_HAND = world.deployOrder.filter((id) => HAND.has(id)).map((id) => [id, HAND.get(id)]),
                    ACTUAL_HAND = [...document.querySelectorAll('#handCards [data-deploy]')].map((card) => [
                        Number(card.dataset.deploy),
                        Number(card.querySelector('b').textContent.slice(1)),
                    ]);
                CHECK(document.getElementById('count').textContent === String(POPULATION), `${name} population`);
                CHECK(document.getElementById('frontlineStatus').textContent === FRONTLINE, `${name} frontline`);
                CHECK(JSON.stringify(ACTUAL_HAND) === JSON.stringify(EXPECTED_HAND), `${name} hand cards`);
                return {
                    offsetMs: offset,
                    health: HEALTH,
                    expected: EXPECTED,
                    actual: ACTUAL,
                    population: POPULATION,
                    reserves: RESERVES,
                };
            },
            STAGE = (name, change, interpolate = false) => {
                clock += 100;
                session.capturePresentation('reset');
                change();
                clock += 50;
                session.capturePresentation('continuous');
                const SAMPLES = OFFSETS.map((offset) => SAMPLE(name, offset));
                if (interpolate) {
                    CHECK(
                        new Set(SAMPLES.map((sample) => sample.actual.now)).size > 2,
                        `${name} HP interpolation remains visible`,
                    );
                }
                STAGES.push({ name, samples: SAMPLES });
            };
        INSTALL(world);
        const UNIT = world.units[0],
            RESERVE = [...world._benched][0];
        STAGE('baseline', () => {});
        STAGE('damage', () => UNIT.setHealth(UNIT.maxHp * 0.45), true);
        STAGE('healing', () => UNIT.setHealth(UNIT.maxHp * 0.8), true);
        STAGE('death', () => {
            UNIT.setHealth(0);
            world.handleUnitDeath(UNIT);
        });
        STAGE('revival', () => UNIT.revive(UNIT.maxHp));
        let clone;
        STAGE('formation-clone', () => {
            clone = world.createFormationClone(UNIT);
        });
        STAGE('maximum-health-change', () => {
            UNIT.setBaseStats({ maxHp: UNIT.maxHp * 2 });
            UNIT.setHealth(UNIT.maxHp * 0.75);
        });
        STAGE('reserve-death', () => RESERVE.setHealth(0));
        STAGE('reserve-revival', () => RESERVE.revive(RESERVE.maxHp));
        STAGE('reserve-enters-field', () => {
            CHECK(world._deployReservedUnit(RESERVE.species, 0, 0), 'reserve enters the field');
        });
        STAGE('clone-removal', () => CHECK(world.removeUnit(clone), 'clone removed'));
        STAGE('over-max-health-clamp', () => UNIT.setHealth(UNIT.maxHp + 7));
        STAGE('below-zero-health-clamp', () => UNIT.setHealth(-3));
        STAGE('revive-before-restore', () => UNIT.revive(UNIT.maxHp));
        const RESTORED = RESTORE(SNAPSHOT(world));
        INSTALL(RESTORED);
        STAGE('restored-world', () => {});
        return {
            userAgent: navigator.userAgent,
            productVersion: BUDMORI.version,
            stages: STAGES,
            checkedSamples: STAGES.reduce((total, stage) => total + stage.samples.length, 0),
        };
    });
    assert.equal(REPORT.result.stages.length, 15);
    assert.equal(REPORT.result.checkedSamples, 75);
    assert.deepEqual(ERRORS, []);
    for (const [FILE, EXPECTED] of Object.entries(REPORT.sourceHashes)) {
        assert.equal(HASH(fs.readFileSync(path.join(ROOT, FILE))), EXPECTED, `source unchanged: ${FILE}`);
    }
    REPORT.status = 'passed';
    console.log(
        `HUD native sampling passed: ${REPORT.result.stages.length} stages / ${REPORT.result.checkedSamples} samples`,
    );
} catch (error) {
    REPORT.status = 'failed';
    REPORT.failure = String(error.stack || error);
    throw error;
} finally {
    clearTimeout(deadline);
    save();
    await browser?.close();
    await new Promise((resolve) => SERVER.close(resolve));
}
