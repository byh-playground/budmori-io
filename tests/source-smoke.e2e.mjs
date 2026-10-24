// One source boot and mixed-combat smoke, without generating deployment files.
// Detailed species, migration and performance scenarios remain on-demand checks.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = fileURLToPath(new URL('../', import.meta.url)),
    OUTPUT = path.join(ROOT, 'tests/output/source-smoke'),
    HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'),
    MANIFEST = JSON.parse(
        HTML.match(/<script id="bloom-runtime-manifest" type="application\/json">(.*?)<\/script>/s)?.[1] || 'null',
    ),
    TYPES = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.svg': 'image/svg+xml',
    },
    MODULES = new Map(),
    REQUESTS = new Set(),
    ERRORS = [],
    REPORT = { status: 'running', startedAt: new Date().toISOString(), entry: 'src/farm-app.js' };
fs.mkdirSync(OUTPUT, { recursive: true });
fs.writeFileSync(path.join(OUTPUT, 'report.json'), JSON.stringify(REPORT, null, 2));

const SERVER = http.createServer((request, response) => {
    const URL_LOCAL = new URL(request.url, 'http://127.0.0.1'),
        RELATIVE = decodeURIComponent(URL_LOCAL.pathname).replace(/^\/+/, '') || 'index.html',
        FILE = path.resolve(ROOT, RELATIVE);
    if (URL_LOCAL.pathname === '/favicon.ico') {
        response.writeHead(204).end();
        return;
    }
    if (!FILE.startsWith(ROOT) || !fs.existsSync(FILE) || !fs.statSync(FILE).isFile()) {
        response.writeHead(404).end();
        return;
    }
    response.setHeader('content-type', TYPES[path.extname(FILE)] || 'application/octet-stream');
    response.end(fs.readFileSync(FILE));
});
let browser;
let page;
try {
    assert.equal(MANIFEST?.game?.file, 'src/farm-app.js', 'the source app is the production entry point');
    assert.match(HTML, /<script type="module" src="\.\/src\/bootstrap\.js" data-bloom-bootstrap><\/script>/);
    for (const MODULE of MANIFEST.modules) {
        const BYTES = fs.readFileSync(path.join(ROOT, 'vendor/upstream', `${MODULE.name}.js`));
        assert.equal(createHash('sha256').update(BYTES).digest('hex'), MODULE.sha256, `pinned offline ${MODULE.name}`);
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
    const CONTEXT = await browser.newContext({
            viewport: { width: 1000, height: 700 },
            serviceWorkers: 'block',
        }),
        PAGE = await CONTEXT.newPage();
    page = PAGE;
    PAGE.setDefaultTimeout(45000);
    PAGE.on('pageerror', (error) => ERRORS.push(String(error)));
    PAGE.on('console', (message) => {
        if (message.type() === 'error' || message.text().includes('loop stopped')) {
            ERRORS.push(message.text());
        }
    });
    PAGE.on('response', (response) => {
        if (response.status() >= 400) {
            ERRORS.push(`HTTP ${response.status()}: ${response.url()}`);
        }
    });
    await CONTEXT.route('**/*', (route) => {
        const URL_LOCAL = route.request().url();
        REQUESTS.add(URL_LOCAL);
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
        ERRORS.push(`Unexpected network request: ${URL_LOCAL}`);
        return route.abort();
    });
    await PAGE.goto(`${ORIGIN}/index.html`);
    await PAGE.waitForFunction(() => Boolean(globalThis.BUDMORI));
    await PAGE.locator('#newGame').click();
    await PAGE.waitForFunction(() => BUDMORI.sim?.scene === 'farm' && BUDMORI.sim.units.length > 0);
    await PAGE.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    // One real FarmSession encounter: normal RAF, simulation, presentation and native
    // vector draws. Only the starting roster/encounter is arranged; never step or
    // render a synthetic world, and never replace attack/clip implementations.
    await PAGE.evaluate(() => {
        const WORLD = BUDMORI.sim,
            SESSION = BUDMORI.runtime,
            RENDERER = BUDMORI.renderer,
            OBS = (globalThis.__mixedCombat = {
                startTick: WORLD.simulationTick,
                rendered: { player: [], enemy: [] },
                launches: { player: [], enemy: [] },
                attacking: [],
                wheatForms: [],
                workOverlap: {},
                enemyWheat: null,
                hits: 0,
                splitCount: 0,
                splitChildren: [],
                deathRendered: false,
                nativeDraws: 0,
            }),
            ADD = (list, value) => {
                if (!list.includes(value)) {
                    list.push(value);
                }
            };
        SESSION.paused = true;
        WORLD.resetUnits();
        WORLD.setWorkBasisPoints(0);
        for (const BUILD of Object.values(WORLD.playerProgression.abilities)) {
            if (BUILD.treeVersion === 1) {
                BUILD.masteryLevel = 50;
                BUILD.nodeRanks = Object.fromEntries(
                    Array.from({ length: 5 }, (_, index) => [`evolution-${index + 2}`, 1]),
                );
            }
        }
        const ALLIES = Array.from({ length: 9 }, (_, species) => WORLD.spawn(species, 6, 0, 0));
        ALLIES.push(WORLD.spawn(7, 1, 0, 0));
        const PEANUT = WORLD.spawn(4, 1, -10, 0);
        ALLIES.push(PEANUT);
        for (const UNIT of ALLIES) {
            UNIT.growth = 3;
            UNIT.growthElapsed = UNIT.growthDuration;
            UNIT.dropLanded = true;
        }
        if (!WORLD.startTower(1) || !WORLD.finishMarch()) {
            throw new Error('Mixed combat must start through the real tower encounter');
        }
        WORLD._benched.clear();
        WORLD._benchRevision++;
        WORLD.farmBossEvent.phase = 'fighting';
        Object.assign(WORLD.boss, { z: 0, hp: 1e9, maxHp: 1e9, stun: 60 });
        ALLIES.forEach((unit, index) => {
            const ANGLE = (index * Math.PI * 2) / (ALLIES.length - 1),
                DISTANCE = WORLD.boss.radius + 1.2 + (index % 2) * 0.8;
            Object.assign(unit, {
                x: Math.cos(ANGLE) * DISTANCE,
                y: Math.sin(ANGLE) * DISTANCE,
                z: 0,
                hp: 1e6,
                vx: 0,
                vy: 0,
                vz: 0,
                dropLanded: true,
            });
        });
        // A low-health extra peanut takes a real enemy hit and splits; the main
        // peanut remains alive long enough to prove its ordinary attacks render.
        Object.assign(PEANUT, { x: -10, y: 0, hp: 1 });
        for (let species = 0; species < 9; species++) {
            WORLD.boss.species = species;
            const ACTION = { released: 0, volleyCount: 1, aim: species, id: 'summon.mouth-t1' };
            if (!WORLD.spawnBossMouthUnit(ACTION)) {
                throw new Error(`Could not create real enemy summon for species ${species}`);
            }
            const ENEMY = WORLD.units.findLast((unit) => unit.ownerId === 'boss'),
                ANGLE = (species * Math.PI * 2) / 9,
                DISTANCE = WORLD.boss.radius + 4.5;
            Object.assign(ENEMY, {
                x: species === 0 ? -8 : Math.cos(ANGLE) * DISTANCE,
                y: species === 0 ? 0 : Math.sin(ANGLE) * DISTANCE,
                z: 0,
                vx: 0,
                vy: 0,
                vz: 0,
                hp: 1e7,
                dropLanded: true,
            });
            if (WORLD.abilityProgressionFor(ENEMY) !== null) {
                throw new Error('Boss-mouth summons must retain null player progression');
            }
        }
        WORLD.boss.species = 7;
        // Existing farm labor can overlap combat. Seed its independent fire
        // clock, then let normal work/attack ticks reach wheat windup/recovery.
        const PILES = BUDMORI.CONFIG.farm.work.pileKind;
        WORLD.piles.splice(
            0,
            WORLD.piles.length,
            ...Array.from({ length: PILES.count }, (_, index) => ({
                id: ++WORLD._pileId,
                x: 15,
                y: 8 + index * 3,
                food: PILES.amount,
                maxFood: PILES.amount,
                stack: 0,
                hitRev: 0,
                big: false,
            })),
        );
        WORLD.setWorkBasisPoints(10000);
        for (const UNIT of ALLIES.filter((unit) => unit.species === 7)) {
            WORLD._swings.set(UNIT.id, { phase: 'fire', elapsed: 0, wait: 0 });
            if (!UNIT.ability.begin(WORLD, { id: 'boss', generation: WORLD.boss.generation, x: 0, y: 0 })) {
                throw new Error('Wheat combat windup must overlap the independent labor fire clock');
            }
        }
        WORLD._unitSpatialDirty = true;
        WORLD.onNotice.on((notice) => {
            if (notice.kind === 'attack-launch') {
                const UNIT = WORLD.units.find((unit) => unit.id === notice.unit);
                if (UNIT) {
                    ADD(OBS.launches[UNIT.faction], UNIT.species);
                }
            }
            if (notice.kind === 'unit-hit' || notice.kind === 'boss-hit') {
                OBS.hits++;
            }
            if (notice.kind === 'peanut-split' && notice.unit === PEANUT.id) {
                OBS.splitCount += notice.count;
            }
        });
        const DRAW = RENDERER.unitPresentation.drawVectorUnit;
        RENDERER.unitPresentation.drawVectorUnit = function (unit, world, ...args) {
            const RESULT = DRAW.call(this, unit, world, ...args),
                CLIP = RENDERER.vectorPlayers.get(unit.id)?.currentClip,
                SWING = world.workSwingOf?.(unit.id);
            OBS.nativeDraws++;
            ADD(OBS.rendered[unit.faction], unit.species);
            if (
                unit.faction === 'player' &&
                unit.ability.phase !== 'idle' &&
                !SWING?.phase?.match(/^(windup|fire|recover)$/)
            ) {
                if (CLIP && !['idle', 'walk'].includes(CLIP)) {
                    ADD(OBS.attacking, unit.species);
                }
            }
            if (unit.species === 7 && unit.faction === 'player') {
                if (CLIP?.startsWith('fire-wheat-')) {
                    ADD(OBS.wheatForms, unit.ability.wheatForm);
                }
                if (SWING?.phase === 'fire' && ['windup', 'recover'].includes(unit.ability.wheatStage)) {
                    OBS.workOverlap[unit.ability.wheatStage] = CLIP;
                }
            }
            if (unit.species === 7 && unit.faction === 'enemy') {
                OBS.enemyWheat = { longBaton: unit.ability.wheatLongBaton, hp: unit.hp };
            }
            if (unit.id === PEANUT.id && unit.hp <= 0 && ['death', 'defeat', 'sleep'].includes(CLIP)) {
                OBS.deathRendered = true;
            }
            if (WORLD.units.find((live) => live.id === unit.id)?.battleSummonKind === 'peanut-death-split') {
                ADD(OBS.splitChildren, unit.id);
            }
            return RESULT;
        };
        SESSION.capturePresentation('reset');
        SESSION.loop.resetTiming();
        SESSION.paused = false;
    });
    await PAGE.waitForFunction(() => {
        const OBS = globalThis.__mixedCombat;
        return (
            BUDMORI.sim.simulationTick >= OBS.startTick + 80 &&
            OBS.launches.player.length === 9 &&
            OBS.launches.enemy.length > 0 &&
            OBS.attacking.length === 9 &&
            OBS.rendered.enemy.length === 9 &&
            OBS.wheatForms.length === 2 &&
            OBS.workOverlap.windup &&
            OBS.hits > 0 &&
            OBS.splitCount > 0 &&
            OBS.splitChildren.length === OBS.splitCount &&
            OBS.deathRendered
        );
    });
    REPORT.mixedCombat = await PAGE.evaluate(() => ({
        ...globalThis.__mixedCombat,
        endTick: BUDMORI.sim.simulationTick,
        units: BUDMORI.sim.units.length,
    }));
    const COMBAT = REPORT.mixedCombat;
    assert.deepEqual([...COMBAT.launches.player].sort(), [0, 1, 2, 3, 4, 5, 6, 7, 8], 'every species really attacks');
    assert.deepEqual([...COMBAT.rendered.player].sort(), [0, 1, 2, 3, 4, 5, 6, 7, 8], 'all allies use native draws');
    assert.deepEqual(
        [...COMBAT.rendered.enemy].sort(),
        [0, 1, 2, 3, 4, 5, 6, 7, 8],
        'all enemy species use native draws',
    );
    assert.deepEqual(
        [...COMBAT.wheatForms].sort(),
        [1, 6],
        'base and evolved wheat attack forms reach native rendering',
    );
    assert.equal(COMBAT.workOverlap.windup, 'fire', 'labor never selects a combat windup clip');
    assert.ok(Object.values(COMBAT.workOverlap).every((clip) => clip === 'fire'));
    assert.equal(COMBAT.enemyWheat.longBaton, false, 'null-progression enemy keeps its unresearched base baton');
    assert.ok(COMBAT.enemyWheat.hp > 0 && COMBAT.hits > 0, 'live enemies exchange actual combat damage');
    assert.ok(COMBAT.deathRendered && COMBAT.splitChildren.length > 0, 'peanut death and split children render');
    const STATE = await PAGE.evaluate(() => ({
        version: BUDMORI.version,
        units: BUDMORI.sim.units.length,
        canvasWidth: document.getElementById('world').width,
        canvasHeight: document.getElementById('world').height,
        loading: Boolean(document.getElementById('bloom-module-loading')),
        error: !document.getElementById('bloom-error-popup').hidden,
    }));
    assert.equal(STATE.version, MANIFEST.productVersion, 'source app version matches the manifest');
    assert.ok(STATE.canvasWidth > 0 && STATE.canvasHeight > 0, 'the production canvas is initialized');
    assert.equal(STATE.loading, false, 'startup completed');
    assert.equal(STATE.error, false, 'no startup diagnostic popup');
    assert.ok(REQUESTS.has(`${ORIGIN}/src/farm-app.js`), 'the browser loaded the native source app');
    assert.ok(![...REQUESTS].some((url) => new URL(url).pathname === '/src/game.js'), 'no generated bundle was used');
    assert.deepEqual(ERRORS, [], 'the source boot is free of page, console and network errors');
    REPORT.status = 'passed';
    REPORT.state = STATE;
    console.log(
        `PASS source boot + mixed combat: ${STATE.version}, ${STATE.units} units, all nine species, native ESM`,
    );
} catch (error) {
    REPORT.status = 'failed';
    REPORT.failure = String(error.stack || error);
    if (page && !page.isClosed()) {
        REPORT.mixedCombat = await page.evaluate(() => globalThis.__mixedCombat).catch(() => null);
    }
    throw error;
} finally {
    if (page && !page.isClosed()) {
        try {
            await page.screenshot({ path: path.join(OUTPUT, 'source-boot.png'), fullPage: true, timeout: 15000 });
            REPORT.screenshot = 'source-boot.png';
        } catch (error) {
            REPORT.screenshotError = String(error);
        }
    }
    REPORT.finishedAt = new Date().toISOString();
    REPORT.errors = ERRORS;
    REPORT.requests = [...REQUESTS];
    fs.writeFileSync(path.join(OUTPUT, 'report.json'), JSON.stringify(REPORT, null, 2));
    await browser?.close();
    await new Promise((resolve) => SERVER.close(resolve));
}
