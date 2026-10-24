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
    REPORT = {
        status: 'running',
        startedAt: new Date().toISOString(),
        entry: 'src/farm-app.js',
        chapters: {},
        renderCaptures: [],
    },
    CHECKPOINT = (name) => {
        REPORT.chapters[name] = Date.now() - Date.parse(REPORT.startedAt);
        fs.writeFileSync(path.join(OUTPUT, 'report.json'), JSON.stringify(REPORT, null, 2));
    };
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
    const CAPTURE_FRAME = async (file) => {
        const START = Date.now();
        assert.equal(
            await PAGE.evaluate(() => BUDMORI.runtime.paused),
            true,
            'capture only freezes an already-paused observed frame',
        );
        await PAGE.evaluate(() => document.fonts.ready.then(() => true));
        const FONT_READY = Date.now();
        // Simulation is already paused at an observed native frame. Stop only further RAF submissions
        // while Chromium reads it back, rather than competing with continuous software WebGL draws.
        await PAGE.clock.pauseAt(await PAGE.evaluate(() => Date.now() + 1000));
        const PAUSED = Date.now();
        REPORT.clock.combatResumed = false;
        try {
            await PAGE.screenshot({
                path: path.join(OUTPUT, file),
                type: 'jpeg',
                quality: 80,
                scale: 'css',
                fullPage: false,
            });
        } finally {
            REPORT.renderCaptures.push({
                file,
                fontReadyMs: FONT_READY - START,
                pauseMs: PAUSED - FONT_READY,
                captureMs: Date.now() - PAUSED,
                clockResumed: false,
            });
            await PAGE.clock.resume();
            REPORT.renderCaptures.at(-1).clockResumed = true;
            REPORT.clock.combatResumed = true;
        }
    };
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
    // Install before application timers exist; it runs normally except for receipt screenshot checkpoints.
    await PAGE.clock.install();
    await PAGE.goto(`${ORIGIN}/index.html`);
    await PAGE.waitForFunction(() => Boolean(globalThis.BUDMORI));
    await PAGE.locator('#newGame').click();
    await PAGE.waitForFunction(() => BUDMORI.sim?.scene === 'farm' && BUDMORI.sim.units.length > 0);
    await PAGE.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    CHECKPOINT('sourceBoot');
    // One real FarmSession encounter: normal RAF, simulation, presentation and native
    // vector draws. Only the starting roster/encounter is arranged; never step or
    // render a synthetic world, and never replace attack/clip implementations.
    await PAGE.evaluate(async () => {
        const { unitMaxHpFor: MAX_HP_FOR } = await import('./src/unit-stats.js');
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
                bossSlams: 0,
                bossHitBatches: [],
                regenerated: [],
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
                BUILD.nodeRanks = {
                    ...Object.fromEntries(Array.from({ length: 5 }, (_, index) => [`evolution-${index + 2}`, 1])),
                    'basic-2': 10,
                };
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
        WORLD.tower.cards.push({ id: 'regen-flat', rarity: 0 }, { id: 'regen-pct', rarity: 0 });
        WORLD._applyRunStats();
        Object.assign(WORLD.boss, { species: 0, z: 0, hp: 1e9, maxHp: 1e9, stun: 0 });
        ALLIES.forEach((unit, index) => {
            const ANGLE = (index * Math.PI * 2) / (ALLIES.length - 1),
                DISTANCE = WORLD.boss.radius + 1.2 + (index % 2) * 0.8;
            Object.assign(unit, {
                x: Math.cos(ANGLE) * DISTANCE,
                y: Math.sin(ANGLE) * DISTANCE,
                z: 0,
                hp: [2, 4, 8].includes(unit.species) ? MAX_HP_FOR(unit) - 1 : 1e6,
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
            const ACTION = {
                released: 0,
                volleyCount: 1,
                aim: species,
                id: 'summon.mouth-t1',
                phase: 'active',
                phaseElapsed: 0,
            };
            WORLD.boss.patternRuntime.active = ACTION;
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
        WORLD.boss.species = 0;
        WORLD.boss.patternRuntime.active = null;
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
        WORLD.unitCollection.onHealthChanged.on(({ unitId, previousHp, hp }) => {
            const UNIT = ALLIES.find((unit) => unit.id === unitId);
            if (UNIT && UNIT !== PEANUT && hp > previousHp) {
                ADD(OBS.regenerated, UNIT.species);
            }
        });
        WORLD.onNotice.on((notice) => {
            if (notice.kind === 'unit-hit' && notice.attackKind === 'attack.front-slam') {
                OBS.bossSlams++;
            }
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
        // Observe each real physical attack settlement without supplying hits or changing damage.
        const SETTLE_BOSS_HITS = WORLD._settleBossHits;
        globalThis.__restoreBossHitObservation = () => {
            WORLD._settleBossHits = SETTLE_BOSS_HITS;
            return WORLD._settleBossHits === SETTLE_BOSS_HITS;
        };
        WORLD._settleBossHits = function (...args) {
            const TARGETS = this._bossHitBatch.filter((hit) => !hit.unit.isFormationClone).map((hit) => hit.unit.id),
                BATCH = { targets: TARGETS, events: [], damageTaken: 0 },
                OFF = this.onCombatResolved.on((event) => {
                    if (event.role === 'boss' && event.sourceActor === 'boss') {
                        BATCH.events.push({
                            hits: event.hits,
                            damageDealt: event.damageDealt,
                            sourceFaction: event.sourceFaction,
                            targetFaction: event.targetFaction,
                        });
                    } else if ((event.role || 'player') === 'player' && !event.excluded) {
                        BATCH.damageTaken += event.damageTaken || 0;
                    }
                });
            try {
                return SETTLE_BOSS_HITS.apply(this, args);
            } finally {
                OFF();
                if (TARGETS.length) {
                    OBS.bossHitBatches.push(BATCH);
                }
            }
        };
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
            OBS.bossSlams > 0 &&
            [2, 4, 8].every((species) => OBS.regenerated.includes(species)) &&
            OBS.splitCount > 0 &&
            OBS.splitChildren.length === OBS.splitCount &&
            OBS.deathRendered
        );
    });
    CHECKPOINT('nineSpeciesCombat');
    // The original full-health boss only unlocks its single-target basic attack.
    // After every nine-species condition is proven, arrange a crowd for one native unlocked sweep.
    REPORT.physicalAoeFixture = await PAGE.evaluate(() => {
        const WORLD = BUDMORI.sim;
        BUDMORI.runtime.paused = true;
        WORLD.setWorkBasisPoints(0);
        WORLD.projectiles = [];
        WORLD._bossHitBatch = [];
        for (const [INDEX, UNIT] of WORLD.units.entries()) {
            Object.assign(UNIT, { x: INDEX % 2 ? -18 : 18, y: 10, z: 0, vx: 0, vy: 0, vz: 0, stun: 1000 });
        }
        Object.assign(WORLD.boss, { x: 0, y: 0, z: 0, hp: 3e8, maxHp: 1e9, stun: 0, knockVx: 0, knockVy: 0 });
        WORLD.boss.patternRuntime.active = null;
        for (const ID of Object.keys(WORLD.boss.patternRuntime.cooldowns)) {
            WORLD.boss.patternRuntime.cooldowns[ID] = ID === 'attack.sweep-360' ? 0 : 1000;
        }
        const TARGETS = [];
        for (let index = 0; index < 4; index++) {
            const ANGLE = (index < 2 ? 0 : Math.PI) + (index % 2) * 0.12,
                UNIT = WORLD.spawn(0, 1, 0, 0),
                DISTANCE = WORLD.boss.radius + UNIT.radius + 0.4;
            Object.assign(UNIT, {
                x: Math.cos(ANGLE) * DISTANCE,
                y: Math.sin(ANGLE) * DISTANCE,
                z: 0,
                vx: 0,
                vy: 0,
                vz: 0,
                hp: 1e6,
                dropLanded: true,
                stun: 1000,
            });
            WORLD._benched.delete(UNIT);
            TARGETS.push(UNIT.id);
        }
        WORLD._benchRevision++;
        WORLD._unitSpatialDirty = true;
        BUDMORI.runtime.capturePresentation('reset');
        BUDMORI.runtime.loop.resetTiming();
        BUDMORI.runtime.paused = false;
        return {
            targetIds: TARGETS,
            bossHpRatio: WORLD.bossHpRatio,
            pattern: 'attack.sweep-360',
            chargeSource: 'native physical settlement; no injected combat events',
        };
    });
    await PAGE.waitForFunction(() =>
        globalThis.__mixedCombat.bossHitBatches.some((batch) => new Set(batch.targets).size > 1),
    );
    REPORT.mixedCombat = await PAGE.evaluate(() => ({
        ...globalThis.__mixedCombat,
        endTick: BUDMORI.sim.simulationTick,
        units: BUDMORI.sim.units.length,
    }));
    const COMBAT = REPORT.mixedCombat;
    assert.ok(COMBAT.bossSlams > 0, 'the oversized pea boss selects and lands its basic attack');
    assert.ok(
        COMBAT.bossHitBatches.some((batch) => new Set(batch.targets).size > 1),
        'a real boss attack settles multiple distinct targets',
    );
    for (const BATCH of COMBAT.bossHitBatches) {
        assert.equal(
            BATCH.events.length,
            BATCH.targets.length,
            'each actual eligible target emits one boss contribution',
        );
        assert.equal(
            BATCH.events.reduce((sum, event) => sum + event.hits, 0),
            BATCH.targets.length,
            'N actual targets contribute exactly N hits',
        );
        assert.ok(
            BATCH.events.every((event) => event.sourceFaction === 'enemy' && event.targetFaction === 'player'),
            'physical boss contributions preserve actor faction isolation',
        );
        assert.ok(
            Math.abs(BATCH.events.reduce((sum, event) => sum + event.damageDealt, 0) - BATCH.damageTaken) < 1e-6,
            'boss damageDealt is the actual incoming health loss, not attack power',
        );
    }

    assert.ok(
        [2, 4, 8].every((species) => COMBAT.regenerated.includes(species)),
        'grown allies really regenerate',
    );
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
    // A small real-UI copy check after the unchanged combat assertions, not a form matrix.
    REPORT.bossHitObservationRestored = await PAGE.evaluate(() => globalThis.__restoreBossHitObservation());
    assert.equal(REPORT.bossHitObservationRestored, true);
    CHECKPOINT('mixedCombatAssertions');
    await PAGE.locator('#upgradeMenu').click();
    await PAGE.locator('#menuTabAbilities').click();
    REPORT.wording = [];
    for (const [SPECIES, TITLE] of [
        [0, '연속 박치기'],
        [8, '도리깨 공격과 방어 깨기'],
        [5, '방어와 망치 반격'],
    ]) {
        await PAGE.locator(`[data-ability-species="${SPECIES}"]`).click();
        const CARD = PAGE.locator('[data-growth-tree]');
        await CARD.waitFor();
        assert.equal(await CARD.locator('h3').textContent(), TITLE);
        const TEXT = await CARD.innerText();
        assert.doesNotMatch(TEXT, /RAW|예산|슬롯|스윕|공속|후딜|런/);
        if (SPECIES === 5) {
            assert.match(TEXT, /기본 공격 총피해의 3배/);
        }
        await CARD.locator('h3').scrollIntoViewIfNeeded();
        REPORT.wording.push({ species: SPECIES, title: TITLE });
    }
    await PAGE.setViewportSize({ width: 390, height: 844 });
    await PAGE.locator('[data-growth-node="specialty-2"]').scrollIntoViewIfNeeded();
    assert.deepEqual(ERRORS, [], 'the representative growth menus remain free of runtime errors');
    CHECKPOINT('wordingAssertions');
    // One real door interaction, then a bounded upgrade/exhaustion continuation.
    await PAGE.locator('#gameMenuClose').click();
    await PAGE.setViewportSize({ width: 1000, height: 700 });
    await PAGE.evaluate(() => {
        const WORLD = BUDMORI.sim;
        WORLD.formationSkills.end();
        WORLD.resetUnits(
            WORLD.units
                .filter((unit) => unit.faction === 'player' && !unit.isBattleOnlySummon && unit.hp > 0)
                .slice(0, 3),
        );
        WORLD.projectiles = [];
        WORLD.effects = [];
        WORLD.farmBossEvent.phase = 'idle';
        WORLD.boss.active = false;
        WORLD.tower.bossRelics = new Map();
        WORLD.tower.bossCardDraw = null;
        BUDMORI.runtime.paused = false;
        WORLD.tower.nextKind = 'power';
        WORLD.tower.doors = [{ type: 'stat', id: 'regen-flat', rarity: 0 }];
    });
    // Freeze before clicking, not after spotting a short-lived phase. Real screenshots can take >1s.
    REPORT.clock = {
        installedBeforeNavigation: true,
        controlledScope:
            'card receipt phases and already-paused render captures only; combat runs normally between checkpoints',
        combatResumed: false,
    };
    await PAGE.clock.pauseAt(await PAGE.evaluate(() => Date.now() + 1000));
    await PAGE.clock.runFor(32);
    // Clock is paused, so bypass only RAF-based stability waiting; this is still a real pointer click.
    await PAGE.locator('#doorCards [data-door="0"]:enabled').waitFor({ state: 'visible' });
    await PAGE.locator('#doorCards [data-door="0"]:enabled').click({ force: true });
    await PAGE.clock.runFor(64);
    await PAGE.locator('#bossCardDraw[data-phase="player"]').waitFor({ state: 'visible' });
    REPORT.bossCards = await PAGE.evaluate(() => {
        const WORLD = BUDMORI.sim,
            SERIAL = WORLD.tower.bossCardDraw.serial,
            REJECTED = WORLD.chooseDoor(0) === false;
        return { rejectedDuplicate: REJECTED, serial: SERIAL, afterSerial: WORLD.tower.bossCardDraw.serial };
    });
    assert.equal(REPORT.bossCards.rejectedDuplicate, true);
    assert.equal(REPORT.bossCards.afterSerial, REPORT.bossCards.serial);
    await PAGE.clock.runFor(400);
    await PAGE.locator('#bossCardDraw[data-phase="boss"]').waitFor({ state: 'visible' });
    await PAGE.clock.runFor(1000);
    await PAGE.locator('#bossCardDraw').waitFor({ state: 'hidden' });
    await PAGE.evaluate(() => {
        const WORLD = BUDMORI.sim;
        WORLD.tower.bossCardDraw = null;
        WORLD.tower.bossRelics = new Map([
            ['lightning', 5],
            ['ufo', 5],
            ['storm-cloud', 4],
        ]);
        WORLD.tower.doors = [{ type: 'stat', id: 'regen-flat', rarity: 0 }];
    });
    await PAGE.clock.runFor(32);
    await PAGE.locator('#doorCards [data-door="0"]:enabled').waitFor({ state: 'visible' });
    await PAGE.locator('#doorCards [data-door="0"]:enabled').click({ force: true });
    await PAGE.clock.runFor(400);
    await PAGE.locator('#bossCardDraw[data-phase="boss"]').waitFor({ state: 'visible' });
    const UPGRADE = await PAGE.evaluate(() => ({
        draw: BUDMORI.sim.tower.bossCardDraw,
        deck: [...BUDMORI.sim.tower.bossRelics],
    }));
    assert.equal(UPGRADE.deck.length, 3, 'a full boss deck never receives a fourth kind');
    assert.equal(UPGRADE.draw.id, 'storm-cloud');
    assert.equal(UPGRADE.draw.level, 5);
    assert.equal(UPGRADE.draw.status, 'upgraded');
    await PAGE.setViewportSize({ width: 844, height: 390 });
    await PAGE.clock.runFor(32);
    REPORT.bossCards.landscape = await PAGE.evaluate(() => ({
        receipt: document.getElementById('bossCardDraw').getBoundingClientRect().toJSON(),
        width: innerWidth,
        height: innerHeight,
    }));
    const LANDSCAPE = REPORT.bossCards.landscape;
    assert.ok(
        LANDSCAPE.receipt.width > 0 &&
            LANDSCAPE.receipt.height > 0 &&
            LANDSCAPE.receipt.left >= 0 &&
            LANDSCAPE.receipt.top >= 0 &&
            LANDSCAPE.receipt.right <= LANDSCAPE.width &&
            LANDSCAPE.receipt.bottom <= LANDSCAPE.height,
        'landscape card receipt remains fully inside the viewport',
    );
    REPORT.bossCards.landscape.previouslyReviewedCapture = 'CI722 boss-card-landscape.png';
    await PAGE.setViewportSize({ width: 1000, height: 700 });
    await PAGE.clock.runFor(1000);
    await PAGE.locator('#bossCardDraw').waitFor({ state: 'hidden' });
    await PAGE.evaluate(() => {
        BUDMORI.sim.tower.doors = [{ type: 'stat', id: 'regen-flat', rarity: 0 }];
    });
    await PAGE.clock.runFor(32);
    await PAGE.locator('#doorCards [data-door="0"]:enabled').waitFor({ state: 'visible' });
    await PAGE.locator('#doorCards [data-door="0"]:enabled').click({ force: true });
    await PAGE.clock.runFor(400);
    await PAGE.locator('#bossCardDraw[data-phase="maxed"]').waitFor({ state: 'visible' });
    await PAGE.clock.runFor(1000);
    assert.equal(
        await PAGE.evaluate(() => BUDMORI.sim.time >= BUDMORI.sim.tower.bossCardDraw.until),
        true,
        'receipt lock expires through normal simulation ticks',
    );
    await PAGE.locator('#doorCards button:enabled').first().waitFor({ state: 'visible' });
    assert.equal((await PAGE.locator('#doorCards button:enabled').count()) > 0, true, 'maxed cards do not halt play');
    REPORT.bossCards.upgrade = UPGRADE;
    REPORT.bossCards.maxed = await PAGE.evaluate(() => BUDMORI.sim.tower.bossCardDraw.status);
    assert.equal(REPORT.bossCards.maxed, 'maxed');
    await PAGE.locator('#bossCardDraw').waitFor({ state: 'hidden' });

    await PAGE.clock.resume();
    REPORT.clock.combatResumed = true;
    CHECKPOINT('cardAssertions');

    await PAGE.evaluate(() => {
        BUDMORI.sim.tower.nextKind = 'battle';
        BUDMORI.sim.tower.doors = [{ type: 'fight', kind: 'battle' }];
    });
    await PAGE.locator('#doorCards [data-door="0"]:enabled').click();
    await PAGE.waitForFunction(() => BUDMORI.sim.formationRuntime.active);
    REPORT.bossCards.nextBattle = await PAGE.evaluate(() => ({
        relics: [...BUDMORI.sim.tower.bossRelics],
        slots: BUDMORI.sim.formationRuntime.slots
            .filter((slot) => slot.role === 'boss')
            .map((slot) => [slot.id, slot.level]),
    }));
    assert.deepEqual(REPORT.bossCards.nextBattle.relics, UPGRADE.deck, 'next real battle retains the boss deck');
    assert.deepEqual(
        REPORT.bossCards.nextBattle.slots,
        UPGRADE.deck,
        'next real battle synchronizes all owned boss skills',
    );
    REPORT.bossCards.restart = await PAGE.evaluate(() => {
        const WORLD = BUDMORI.sim;
        BUDMORI.runtime.paused = true;
        // Arrange the between-floors boundary, then exercise the real public run lifecycle.
        WORLD.farmBossEvent.phase = 'idle';
        WORLD.boss.active = false;
        WORLD.formationSkills.end();
        const LEFT = WORLD.leaveTower(),
            STARTED = WORLD.startTower(WORLD.playerProgression.towerBest),
            EMPTY = WORLD.tower.bossRelics.size === 0 && WORLD.tower.bossCardDraw === null,
            ENTERED = STARTED && WORLD.finishMarch();
        return { left: LEFT, started: STARTED, empty: EMPTY, entered: ENTERED };
    });
    assert.deepEqual(
        REPORT.bossCards.restart,
        { left: true, started: true, empty: true, entered: true },
        'a fresh high-floor climb starts with an empty boss deck',
    );

    CHECKPOINT('nextBattleAndRestartAssertions');
    // Controlled encounter fixtures, but real RAF simulation, model casts and native rendering.
    // Models are untouched; draw instrumentation below delegates to the native implementation.
    // Screenshots need human pixel review.
    await PAGE.evaluate(() => {
        const WORLD = BUDMORI.sim;
        BUDMORI.runtime.paused = true;
        WORLD.resetUnits();
        WORLD.setWorkBasisPoints(0);
        WORLD.tower.doors = [];
        WORLD.projectiles = [];
        WORLD.tower.bossCardDraw = null;
        WORLD.effects = [];
        WORLD._bossHitBatch = [];
        WORLD.tower.cards = [];
        WORLD._applyRunStats();
        WORLD.farmBossEvent.phase = 'fighting';
        Object.assign(WORLD.boss, { active: true, hp: 1e9, maxHp: 1e9, x: 0, y: 0, z: 0, stun: 0 });
        for (let index = 0; index < 3; index++) {
            const UNIT = WORLD.spawn(0, 1, 4 + index * 0.1, 0);
            Object.assign(UNIT, {
                hp: 1e8,
                z: 0,
                vx: 0,
                vy: 0,
                vz: 0,
                dropLanded: true,
                stun: 1000,
                growth: 3,
                growthDuration: 1,
                growthElapsed: 1,
            });
        }
        WORLD._benched.clear();
        WORLD._benchRevision++;
        WORLD._unitSpatialDirty = true;
        globalThis.__sharedSkillRestores = [];
        globalThis.__sharedSkills = {
            casts: [],
            hits: [],
            rendered: {},
            recoveries: {},
            preparations: {},
            checkpoint: null,
        };
        // Browser polls can skip an entire short recovery during catch-up. Observe every native step.
        const STEP = WORLD.step;
        WORLD.step = function (dt) {
            const BEFORE = { x: this.boss.x, y: this.boss.y, serial: this.formationRuntime.bossCast?.serial },
                RESULT = STEP.call(this, dt),
                CAST = this.formationRuntime.bossCast,
                OBS = globalThis.__sharedSkills;
            if (CAST && ['prepare', 'recover'].includes(CAST.phase) && BEFORE.serial === CAST.serial) {
                const RECORDS = CAST.phase === 'prepare' ? OBS.preparations : OBS.recoveries,
                    RECORD = (RECORDS[CAST.id] ||= {
                        ticks: 0,
                        x: BEFORE.x,
                        y: BEFORE.y,
                        stationary: true,
                        patternsStopped: true,
                        noEarlyEffect: true,
                    });
                RECORD.ticks++;
                RECORD.stationary &&= this.boss.x === BEFORE.x && this.boss.y === BEFORE.y;
                RECORD.patternsStopped &&=
                    this.boss.patternRuntime.active === null && this.boss.chaseVx === 0 && this.boss.chaseVy === 0;
                if (CAST.phase === 'prepare') {
                    RECORD.noEarlyEffect &&= !this.formationRuntime.effects.some(
                        (effect) => effect.role === 'boss' && effect.kind === CAST.id,
                    );
                }
            }
            const REQUEST = OBS.checkpoint;
            if (REQUEST && !REQUEST.reached) {
                const EFFECT =
                        REQUEST.kind === 'effect' &&
                        this.formationRuntime.effects.find(
                            (effect) => effect.role === REQUEST.role && effect.kind === REQUEST.id,
                        ),
                    PHASE_RECORD =
                        REQUEST.phase === 'prepare' ? OBS.preparations[REQUEST.id] : OBS.recoveries[REQUEST.id],
                    REACHED =
                        REQUEST.kind === 'effect'
                            ? EFFECT && EFFECT.age + 1e-9 >= REQUEST.age
                            : REQUEST.kind === 'phase'
                              ? CAST?.id === REQUEST.id &&
                                CAST.phase === REQUEST.phase &&
                                PHASE_RECORD?.ticks >= REQUEST.ticks
                              : this.simulationTick >= REQUEST.tick;
                if (REACHED) {
                    REQUEST.reached = true;
                    REQUEST.observedTick = this.simulationTick;
                    REQUEST.effectId = EFFECT?.id || null;
                    REQUEST.observedAge = EFFECT?.age ?? null;
                    BUDMORI.runtime.paused = true;
                }
            }
            return RESULT;
        };
        globalThis.__sharedSkillRestores.push(() => {
            WORLD.step = STEP;
            return WORLD.step === STEP;
        });
        const LISTENER_COUNT = WORLD.onNotice.listeners.size,
            OFF = WORLD.onNotice.on((notice) => {
                const OBS = globalThis.__sharedSkills;
                if (notice.kind === 'formation-cast') {
                    OBS.casts.push({ id: notice.skillId, role: notice.role || 'player' });
                }
                if (notice.attackKind === 'skill' && ['unit-hit', 'boss-hit'].includes(notice.kind)) {
                    OBS.hits.push({ unit: notice.unit, kind: notice.kind });
                }
            });
        globalThis.__sharedSkillRestores.push(() => {
            OFF();
            return WORLD.onNotice.listeners.size === LISTENER_COUNT;
        });
    });
    await PAGE.evaluate(async () => {
        // Observe every actual role/skill native draw even when its redundant PNG is omitted.
        for (const [ID, NAME] of [
            ['lightning', 'LightningPresentation'],
            ['meteor', 'MeteorPresentation'],
            ['meteor-shower', 'MeteorShowerPresentation'],
            ['ufo', 'UfoPresentation'],
            ['storm-cloud', 'StormCloudPresentation'],
        ]) {
            const MODULE = await import(`./src/features/formation-skills/${ID}/presentation.js`),
                TYPE = MODULE[NAME],
                DRAW = TYPE.prototype.draw,
                OWN_DRAW = Object.getOwnPropertyDescriptor(TYPE.prototype, 'draw');
            globalThis.__sharedSkillRestores.push(() => {
                if (OWN_DRAW) {
                    Object.defineProperty(TYPE.prototype, 'draw', OWN_DRAW);
                } else {
                    delete TYPE.prototype.draw;
                }
                return true;
            });
            TYPE.prototype.draw = function (renderer, effect, ...args) {
                const RESULT = DRAW.call(this, renderer, effect, ...args),
                    KEY = `${effect.role}:${effect.kind}`,
                    OBS = globalThis.__sharedSkills;
                OBS.rendered[KEY] = (OBS.rendered[KEY] || 0) + 1;
                return RESULT;
            };
        }
        const { StormCloudPresentation: CLOUD } =
                await import('./src/features/formation-skills/storm-cloud/presentation.js'),
            DRAW = CLOUD.prototype.draw;
        globalThis.__sharedSkillRestores.push(() => {
            CLOUD.prototype.draw = DRAW;
            return CLOUD.prototype.draw === DRAW;
        });
        CLOUD.prototype.draw = function (renderer, effect, ...args) {
            const OBS = { role: effect.role, age: effect.age, widths: [], arcStrokes: 0 },
                ELLIPSE = renderer.ellipse,
                STROKE = renderer.ctx.stroke;
            renderer.ellipse = function (x, y, width, ...rest) {
                OBS.widths.push(width);
                return ELLIPSE.call(this, x, y, width, ...rest);
            };
            renderer.ctx.stroke = function (...strokeArgs) {
                if (this.strokeStyle === '#f3fdff') {
                    OBS.arcStrokes++;
                }
                return STROKE.apply(this, strokeArgs);
            };
            try {
                return DRAW.call(this, renderer, effect, ...args);
            } finally {
                renderer.ellipse = ELLIPSE;
                renderer.ctx.stroke = STROKE;
                globalThis.__sharedSkills.cloudDraw = OBS;
            }
        };
    });
    REPORT.sharedSkills = [];
    for (const ROLE of ['player', 'boss']) {
        for (const [ID, REQUIRED, CONDITION] of [
            ['lightning', 50, 'hits'],
            ['meteor', 500, 'damageDealt'],
            ['meteor-shower', 100, 'hits'],
            ['ufo', 10, 'hits'],
            ['storm-cloud', 75, 'hits'],
        ]) {
            const CASE_STARTED = Date.now();
            REPORT.pendingCase = { role: ROLE, id: ID, stage: 'simulate', startedAt: new Date().toISOString() };
            fs.writeFileSync(path.join(OUTPUT, 'report.json'), JSON.stringify(REPORT, null, 2));
            const START = await PAGE.evaluate(
                async ({ role, id, required, condition }) => {
                    const WORLD = BUDMORI.sim,
                        SKILLS = WORLD.formationSkills,
                        { DEFINITION } = await import(`./src/features/formation-skills/${id}/definition.js`),
                        PROFILE = { ...DEFINITION, ...DEFINITION.boss };
                    if (PROFILE.required !== required || PROFILE.condition !== condition) {
                        throw new Error(`Unexpected boss condition: ${id}`);
                    }
                    SKILLS.end();
                    WORLD.tower.relics = new Map([[id, 1]]);
                    WORLD.tower.bossRelics = new Map([[id, 1]]);
                    SKILLS.synchronize();
                    Object.assign(WORLD.boss, {
                        x: 0,
                        y: 0,
                        z: 0,
                        stun: role === 'player' ? 1000 : 0,
                        knockVx: 0,
                        knockVy: 0,
                    });
                    WORLD.boss.patternRuntime.active = null;
                    for (const KEY of Object.keys(WORLD.boss.patternRuntime.cooldowns)) {
                        WORLD.boss.patternRuntime.cooldowns[KEY] = 1000;
                    }
                    for (const [INDEX, UNIT] of WORLD.units.entries()) {
                        Object.assign(UNIT, { x: 4 + INDEX * 0.1, y: 0, z: 0, stun: 1000, vx: 0, vy: 0, vz: 0 });
                    }
                    WORLD._unitSpatialDirty = true;
                    const SLOT = SKILLS.slots.find((slot) => (slot.role || 'player') === role),
                        OTHER = SKILLS.slots.find((slot) => slot !== SLOT),
                        KEY = role === 'boss' ? PROFILE.condition : DEFINITION.condition,
                        LIMIT = role === 'boss' ? PROFILE.required : DEFINITION.required,
                        OBS = globalThis.__sharedSkills;
                    OBS.casts = [];
                    OBS.hits = [];
                    OBS.recoveries = {};
                    OBS.preparations = {};
                    OBS.checkpoint = {
                        kind: 'effect',
                        role,
                        id,
                        age:
                            id === 'lightning'
                                ? role === 'boss'
                                    ? 0.8
                                    : 0.1
                                : ['ufo', 'storm-cloud'].includes(id)
                                  ? 0.9
                                  : 0.25,
                        reached: false,
                    };
                    WORLD.onCombatResolved.emit({ role, [KEY]: LIMIT - 1 });
                    if (SLOT.charge !== LIMIT - 1 || OTHER.charge !== 0) {
                        throw new Error('Combat contribution crossed roles or the exact threshold');
                    }
                    WORLD.onCombatResolved.emit({ role, [KEY]: 1 });
                    if (SLOT.charge !== LIMIT || OTHER.charge !== 0) {
                        throw new Error('Threshold was not reached exactly');
                    }
                    BUDMORI.runtime.capturePresentation('reset');
                    BUDMORI.runtime.loop.resetTiming();
                    BUDMORI.runtime.paused = false;
                    return { required: LIMIT, condition: KEY, bossRequired: PROFILE.required };
                },
                { role: ROLE, id: ID, required: REQUIRED, condition: CONDITION },
            );
            await PAGE.waitForFunction(() => globalThis.__sharedSkills.checkpoint?.reached === true);
            await PAGE.evaluate(() => {
                // Copy the actual paused model into the production session DTO; normal RAF draws it.
                BUDMORI.runtime.capturePresentation('reset');
                return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            });
            const FILE =
                    ROLE === 'boss' && ['ufo', 'storm-cloud'].includes(ID) ? `shared-skills-${ROLE}-${ID}.jpg` : null,
                CAPTURE_STARTED = Date.now();
            REPORT.pendingCase = {
                role: ROLE,
                id: ID,
                stage: FILE ? 'screenshot' : 'inspect native draw',
                elapsedMs: CAPTURE_STARTED - CASE_STARTED,
            };
            fs.writeFileSync(path.join(OUTPUT, 'report.json'), JSON.stringify(REPORT, null, 2));
            if (FILE) {
                await CAPTURE_FRAME(FILE);
            }
            const CAPTURE_MS = Date.now() - CAPTURE_STARTED;
            const RESULT = await PAGE.evaluate(
                ({ role, id }) => {
                    const WORLD = BUDMORI.sim,
                        EFFECT = WORLD.formationRuntime.effects.find(
                            (effect) => effect.role === role && effect.kind === id,
                        ),
                        OTHER = WORLD.formationRuntime.slots.find((slot) => (slot.role || 'player') !== role);
                    return {
                        nativeDraws: globalThis.__sharedSkills.rendered[`${role}:${id}`] || 0,
                        cloudDraw: globalThis.__sharedSkills.cloudDraw,
                        casts: globalThis.__sharedSkills.casts,
                        hits: globalThis.__sharedSkills.hits,
                        effect: EFFECT,
                        otherCharge: OTHER.charge,
                        ownCharge: WORLD.formationRuntime.slots.find((slot) => slot !== OTHER).charge,
                        targetBody:
                            role === 'player'
                                ? { radius: WORLD.boss.radius, height: WORLD.boss.height }
                                : { radius: WORLD.units[0].radius, height: WORLD.units[0].height },
                        preparation: globalThis.__sharedSkills.preparations[id] || null,
                        checkpoint: globalThis.__sharedSkills.checkpoint,
                        recovery: globalThis.__sharedSkills.recoveries[id] || null,
                        bossCast: WORLD.formationRuntime.bossCast,
                        pattern: WORLD.boss.patternRuntime.active,
                    };
                },
                { role: ROLE, id: ID },
            );
            assert.ok(RESULT.nativeDraws > 0, 'every role and skill reaches its actual native presentation');
            assert.deepEqual(RESULT.casts, [{ id: ID, role: ROLE }], 'one release per cast');
            assert.equal(RESULT.otherCharge, 0, 'skill effects never recharge the opposite owner');
            assert.equal(RESULT.ownCharge, 0, 'released skills do not recharge themselves');
            if (['lightning', 'ufo', 'storm-cloud'].includes(ID)) {
                assert.equal(
                    RESULT.effect.bodyRadius,
                    RESULT.targetBody.radius,
                    'effect uses the actual target body radius',
                );
                if (ROLE === 'boss') {
                    assert.ok(
                        new Set(RESULT.hits.map((hit) => hit.unit)).size >= 2,
                        'boss effect actually damages multiple units',
                    );
                }
            }
            if (ROLE === 'boss') {
                assert.ok(RESULT.preparation?.ticks >= 5, 'prepare is observed for at least five actual ticks');
                assert.equal(RESULT.preparation.stationary, true, 'prepare stops voluntary motion');
                assert.equal(RESULT.preparation.patternsStopped, true, 'prepare suppresses physical patterns');
                assert.equal(RESULT.preparation.noEarlyEffect, true, 'prepare never releases effects early');
                assert.ok(
                    RESULT.recovery?.ticks >= 3,
                    'each released skill traverses recovery on multiple actual simulation ticks',
                );
                assert.equal(
                    RESULT.recovery.stationary,
                    true,
                    'recovery stops voluntary motion throughout the observed native ticks',
                );
                assert.equal(
                    RESULT.recovery.patternsStopped,
                    true,
                    'recovery suppresses physical patterns throughout the observed native ticks',
                );
            }
            if (ID === 'storm-cloud') {
                assert.equal(RESULT.cloudDraw.role, ROLE);
                assert.ok(
                    RESULT.cloudDraw.widths.some((width) => width > 1),
                    'real session DTO renders a visible cloud',
                );
                assert.ok(
                    RESULT.cloudDraw.arcStrokes >= 3,
                    'real session DTO renders cloud arcs, including player fallback',
                );
            }
            REPORT.sharedSkills.push({
                role: ROLE,
                id: ID,
                ...START,
                ...RESULT,
                screenshot: FILE,
                elapsedMs: Date.now() - CASE_STARTED,
                screenshotMs: CAPTURE_MS,
            });
            REPORT.pendingCase = null;
            fs.writeFileSync(path.join(OUTPUT, 'report.json'), JSON.stringify(REPORT, null, 2));
        }
    }
    CHECKPOINT('sharedSkillsAssertions');
    // Keep the already released cloud alive while a UFO releases, then cancel a third cast.
    await PAGE.evaluate(() => {
        const WORLD = BUDMORI.sim;
        globalThis.__sharedSkills.recoveries.ufo = undefined;
        globalThis.__sharedSkills.checkpoint = { kind: 'phase', id: 'ufo', phase: 'recover', ticks: 6, reached: false };
        WORLD.formationRuntime.slots = [
            { id: 'ufo', ownerId: 'boss', role: 'boss', level: 1, charge: 10, cooldown: 0 },
            { id: 'lightning', ownerId: 'boss', role: 'boss', level: 1, charge: 0, cooldown: 0 },
        ];
        BUDMORI.runtime.paused = false;
    });
    await PAGE.waitForFunction(() => globalThis.__sharedSkills.checkpoint.reached);
    const RECOVERY = await PAGE.evaluate(() => globalThis.__sharedSkills.recoveries.ufo);
    assert.ok(RECOVERY.ticks >= 6, 'recovery remains stopped for five ticks after its first observed tick');
    assert.equal(RECOVERY.stationary, true, 'recovery stops voluntary motion');
    assert.equal(RECOVERY.patternsStopped, true, 'recovery stops physical patterns');
    await PAGE.evaluate(() => {
        BUDMORI.sim.formationRuntime.slots.find((slot) => slot.id === 'lightning').charge = 50;
        globalThis.__sharedSkills.preparations.lightning = undefined;
        globalThis.__sharedSkills.checkpoint = {
            kind: 'phase',
            id: 'lightning',
            phase: 'prepare',
            ticks: 1,
            reached: false,
        };
        BUDMORI.runtime.loop.resetTiming();
        BUDMORI.runtime.paused = false;
    });
    await PAGE.waitForFunction(() => globalThis.__sharedSkills.checkpoint.reached);
    const CANCEL = await PAGE.evaluate(() => {
        const WORLD = BUDMORI.sim,
            EFFECTS = WORLD.formationRuntime.effects.filter((effect) => ['ufo', 'storm-cloud'].includes(effect.kind));
        WORLD.boss.stun = 3;
        globalThis.__sharedSkills.checkpoint = { kind: 'tick', tick: WORLD.simulationTick + 50, reached: false };
        BUDMORI.runtime.loop.resetTiming();
        BUDMORI.runtime.paused = false;
        return {
            tick: WORLD.simulationTick,
            effects: EFFECTS.map((effect) => ({ id: effect.id, age: effect.age, pulse: effect.pulse })),
        };
    });
    assert.equal(CANCEL.effects.length, 2, 'both released persistent effects are present');
    await PAGE.waitForFunction(() => globalThis.__sharedSkills.checkpoint.reached);
    REPORT.castCancellation = await PAGE.evaluate(() => ({
        cast: BUDMORI.sim.formationRuntime.bossCast,
        effects: BUDMORI.sim.formationRuntime.effects,
        casts: globalThis.__sharedSkills.casts,
    }));
    assert.equal(REPORT.castCancellation.cast, null, 'stun cancels the pending release');
    assert.equal(
        REPORT.castCancellation.casts.some((cast) => cast.id === 'lightning'),
        false,
        'cancelled prepare emits no cast',
    );
    assert.equal(
        REPORT.castCancellation.effects.some((effect) => effect.kind === 'lightning'),
        false,
        'cancelled prepare emits no effect',
    );
    for (const BEFORE of CANCEL.effects) {
        const AFTER = REPORT.castCancellation.effects.find((effect) => effect.id === BEFORE.id);
        assert.ok(
            AFTER && AFTER.age > BEFORE.age && AFTER.pulse > BEFORE.pulse,
            'released UFO/cloud keep ticking through another prepare and stun',
        );
    }
    REPORT.bossSkillDefense = await PAGE.evaluate(() => {
        const WORLD = BUDMORI.sim,
            UNIT = WORLD.units.find((unit) => unit.faction === 'player' && !unit.isBattleOnlySummon);
        BUDMORI.runtime.paused = true;
        WORLD.tower.passives.undying = 0.05;
        WORLD.tower.undyingUsed.delete(UNIT.id);
        UNIT.hp = 1;
        WORLD.formationSkills.bossContext.damage(UNIT, 1000000);
        return { hp: UNIT.hp, protected: WORLD.tower.undyingUsed.has(UNIT.id) };
    });
    assert.ok(
        REPORT.bossSkillDefense.hp > 0 && REPORT.bossSkillDefense.protected,
        'boss skills preserve the existing undying defense',
    );
    assert.deepEqual(ERRORS, [], 'card and shared-skill scenarios remain free of runtime errors');
    REPORT.instrumentationRestored = await PAGE.evaluate(() =>
        globalThis.__sharedSkillRestores
            .splice(0)
            .reverse()
            .map((restore) => restore())
            .every(Boolean),
    );
    assert.equal(
        REPORT.instrumentationRestored,
        true,
        'native step, presentation methods and observation listener are restored',
    );
    CHECKPOINT('cancellationAndDefenseAssertions');
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
        REPORT.bossHitObservationRestored = await page
            .evaluate(() => globalThis.__restoreBossHitObservation?.() ?? true)
            .catch(() => false);
        REPORT.failureSnapshot = await page
            .evaluate(() => ({
                observation: globalThis.__sharedSkills,
                paused: BUDMORI.runtime.paused,
                tick: BUDMORI.sim.simulationTick,
                cast: BUDMORI.sim.formationRuntime.bossCast,
                slots: BUDMORI.sim.formationRuntime.slots,
                effects: BUDMORI.sim.formationRuntime.effects,
            }))
            .catch(() => null);
        REPORT.instrumentationRestored = await page
            .evaluate(() =>
                (globalThis.__sharedSkillRestores || [])
                    .splice(0)
                    .reverse()
                    .map((restore) => restore())
                    .every(Boolean),
            )
            .catch(() => false);
    }
    throw error;
} finally {
    if (REPORT.status !== 'passed' && page && !page.isClosed()) {
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
