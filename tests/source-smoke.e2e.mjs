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
    // Optional representative native frames; the live observations always run.
    CAPTURE_BOSS_BASICS = process.env.BUDMORI_CAPTURE_BOSS_BASICS === '1',
    CAPTURE_BOSS_SWEEP = process.env.BUDMORI_CAPTURE_BOSS_SWEEP === '1',
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
        renderEnvironment: {
            backend: 'Chromium SwiftShader',
            deviceScaleFactor: 0.75,
            purpose: 'functional and CSS-layout verification, not device performance',
        },
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
            viewport: { width: 667, height: 375 },
            deviceScaleFactor: 0.75,
            hasTouch: true,
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
        // Rendering may delay the protocol round trip beyond one second. Simulation is already paused.
        await PAGE.clock.pauseAt(await PAGE.evaluate(() => Date.now() + 60_000));
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
        const { unitMaxHpFor: MAX_HP_FOR } = await import('./src/unit-stats.js'),
            { Unit: UNIT_TYPE, bossAttackArea: BOSS_ATTACK_AREA } = await import('./src/farm-model.js');
        const WORLD = BUDMORI.sim,
            SESSION = BUDMORI.runtime,
            RENDERER = BUDMORI.renderer,
            OBS = (globalThis.__mixedCombat = {
                startTick: WORLD.simulationTick,
                rendered: { player: [], enemy: [] },
                launches: { player: [], enemy: [] },
                chestnutShots: [],
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
        OBS.unitCore = {
            validationScope:
                'live encounter identity, health and lifecycle; detailed stat/buff math is checked separately',
            sameClass: WORLD.boss instanceof UNIT_TYPE && WORLD.boss.constructor === ALLIES[0].constructor,
            sharedLookup: WORLD._unitForId(WORLD.boss.id) === WORLD.boss,
            liveHealthChanges: 0,
        };
        const OFF_BOSS_HEALTH = WORLD.boss.onHealthChanged.on(({ previousHp, hp }) => {
            if (!SESSION.paused && hp < previousHp) {
                OBS.unitCore.liveHealthChanges++;
            }
        });
        globalThis.__restoreBossUnitHealthObservation = OFF_BOSS_HEALTH;
        WORLD._benched.clear();
        WORLD._benchRevision++;
        WORLD.farmBossEvent.phase = 'fighting';
        WORLD.tower.cards.push({ id: 'regen-flat', rarity: 0 }, { id: 'regen-pct', rarity: 0 });
        WORLD._applyRunStats();
        WORLD.boss.controller.configureStage(WORLD.boss.stage, 0);
        Object.assign(WORLD.boss, { z: 0, hp: 1e9, maxHp: 1e9, stun: 0 });
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
            WORLD.boss.controller.configureStage(WORLD.boss.stage, species);
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
        WORLD.boss.controller.configureStage(WORLD.boss.stage, 0);
        Object.assign(WORLD.boss, { hp: 1e9, maxHp: 1e9 });
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
        const OFF_MIXED_HEALTH = WORLD.unitCollection.onHealthChanged.on(({ unitId, previousHp, hp }) => {
            const UNIT = ALLIES.find((unit) => unit.id === unitId);
            if (UNIT && UNIT !== PEANUT && hp > previousHp) {
                ADD(OBS.regenerated, UNIT.species);
            }
        });
        const OFF_MIXED_NOTICE = WORLD.onNotice.on((notice) => {
            if (notice.kind === 'unit-hit' && notice.attackKind === 'attack.front-slam') {
                OBS.bossSlams++;
            }
            if (notice.kind === 'attack-launch') {
                const UNIT = WORLD.units.find((unit) => unit.id === notice.unit);
                if (UNIT) {
                    ADD(OBS.launches[UNIT.faction], UNIT.species);
                    if (UNIT.species === 3 && notice.attackKind === 'chestnut-spike') {
                        const TARGET = WORLD.attackTarget(UNIT, UNIT.ability.action);
                        OBS.chestnutShots.push({
                            faction: UNIT.faction,
                            projectile: !!UNIT.ability.action?.chestnutAttack,
                            surfaceGap: TARGET ? Math.hypot(UNIT.x - TARGET.x, UNIT.y - TARGET.y) - TARGET.radius : 0,
                        });
                    }
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
            if (unit.id === OBS.attackFlow?.unitId) {
                OBS.attackFlow.nativeFrames++;
            }
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
        globalThis.__restoreMixedObservation = () => {
            RENDERER.unitPresentation.drawVectorUnit = DRAW;
            OFF_MIXED_HEALTH();
            OFF_MIXED_NOTICE();
            globalThis.__restoreMixedObservation = null;
            return RENDERER.unitPresentation.drawVectorUnit === DRAW;
        };
        const DRAW_DANGER = RENDERER.drawDanger;
        WORLD.boss.setStatModifiers({ attackArea: { flat: 0, pct: 1 } });
        globalThis.__restoreBossTelegraphObservation = () => {
            WORLD.boss.setStatModifiers({});
            RENDERER.drawDanger = DRAW_DANGER;
        };
        RENDERER.drawDanger = function (renderWorld) {
            const RESULT = DRAW_DANGER.call(this, renderWorld),
                MODEL = BOSS_ATTACK_AREA(WORLD.boss, 0, WORLD.scene);
            if (
                this.bossTelegraph &&
                renderWorld.boss.patternPhase === 'windup' &&
                MODEL?.patternId === renderWorld.boss.patternId &&
                Number.isFinite(MODEL.reach) &&
                Number.isFinite(this.bossTelegraph.reach)
            ) {
                OBS.telegraph = {
                    scalar: renderWorld.boss.attackArea,
                    pattern: MODEL.patternId,
                    reach: this.bossTelegraph.reach,
                    modelReach: MODEL.reach,
                };
                globalThis.__restoreBossTelegraphObservation();
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
            ['player', 'enemy'].every((faction) =>
                OBS.chestnutShots.some((shot) => shot.faction === faction && shot.projectile && shot.surfaceGap > 2.5),
            ) &&
            OBS.attacking.length === 9 &&
            OBS.rendered.enemy.length === 9 &&
            OBS.wheatForms.length === 2 &&
            OBS.workOverlap.windup &&
            OBS.hits > 0 &&
            OBS.bossSlams > 0 &&
            OBS.telegraph &&
            [2, 4, 8].every((species) => OBS.regenerated.includes(species)) &&
            OBS.splitCount > 0 &&
            OBS.splitChildren.length === OBS.splitCount &&
            OBS.deathRendered
        );
    });
    CHECKPOINT('nineSpeciesCombat');
    assert.ok(
        await PAGE.evaluate(() => globalThis.__mixedCombat.unitCore.liveHealthChanges > 0),
        'native mixed-combat hits emit boss health changes before the later HP fixture',
    );
    // The original full-health boss exposes its single-target front-slam special pattern.
    // After every nine-species condition is proven, arrange a crowd for one native unlocked sweep.
    if (CAPTURE_BOSS_SWEEP) {
        await PAGE.setViewportSize({ width: 1000, height: 700 });
    }
    REPORT.physicalAoeFixture = await PAGE.evaluate((capture) => {
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
        // Reuse this live encounter and its native sweep: one isolated ordinary attack
        // probes prepare/commit/recovery while a charged heal must yield to that sweep.
        const PROBE = WORLD.spawn(0, 1, -14, -8),
            TARGET = WORLD.spawn(0, 1, -12, -8),
            OBS = (globalThis.__mixedCombat.attackFlow = {
                unitId: PROBE.id,
                nativeFrames: 0,
                launches: 0,
                hits: 0,
                recovery: [],
                healing: {
                    prepared: false,
                    released: 0,
                    pendingTicks: 0,
                    pendingOnlyWhileBusy: true,
                    pendingUnspent: true,
                },
            });
        for (const UNIT of [PROBE, TARGET]) {
            UNIT.setBaseStats({ maxHp: 1e6 });
            UNIT.setStatModifiers({});
            Object.assign(UNIT, {
                hp: UNIT.maxHp,
                growth: 3,
                growthElapsed: UNIT.growthDuration,
                z: 0,
                vx: 0,
                vy: 0,
                vz: 0,
                dropLanded: true,
                landingRecovery: 0,
            });
            WORLD._benched.delete(UNIT);
        }
        TARGET.faction = 'enemy';
        TARGET.stun = 1000;
        TARGET.x = PROBE.x + TARGET.radius + PROBE.ability.attackRange(WORLD) - 0.3;
        if (!PROBE.ability.begin(WORLD, { id: TARGET.id, generation: TARGET.generation, x: TARGET.x, y: TARGET.y })) {
            throw new Error('The live prepare/commit probe must begin through its ordinary Unit attack');
        }
        const ACTION = PROBE.ability.action,
            BUDGET = JSON.stringify(ACTION.peaAttack.source),
            TARGET_HP = TARGET.hp;
        TARGET.y += 0.2;
        WORLD.formationSkills.end();
        WORLD.tower.bossRelics = new Map([['healing-rain', 1]]);
        WORLD.formationSkills.synchronize();
        const HEAL = WORLD.formationRuntime.slots.find((slot) => slot.role === 'boss' && slot.id === 'healing-rain');
        HEAL.charge = 200;
        const STEP = WORLD.step,
            PRESENTATION = BUDMORI.renderer.bossPresentation,
            DRAW = PRESENTATION.draw,
            OFF = WORLD.onNotice.on((notice) => {
                if (notice.kind === 'attack-launch' && notice.unit === PROBE.id) {
                    OBS.launches++;
                }
                if (notice.kind === 'unit-hit' && notice.sourceUnit === PROBE.id) {
                    OBS.hits++;
                }
                if (notice.kind === 'formation-cast' && notice.role === 'boss' && notice.skillId === 'healing-rain') {
                    OBS.healing.released++;
                }
            });
        WORLD.step = function (dt) {
            const ABILITY = PROBE.ability,
                RETRY_BEFORE = this.formationRuntime.bossRetrySkillId,
                BUSY_BEFORE = !!(
                    this.boss.patternRuntime.active ||
                    this.boss.ability.phase !== 'idle' ||
                    (this.boss.specialAbility && this.boss.specialAbility.phase !== 'idle') ||
                    this.boss.z > 0.1 ||
                    this.boss.landingRecovery > 0
                );
            if (
                !OBS.ccStarted &&
                ABILITY.phase === 'recover' &&
                ABILITY.attackRecoverySeconds(this) - ABILITY.elapsed <= dt + 1e-9
            ) {
                OBS.ccStarted = {
                    elapsed: ABILITY.elapsed,
                    duration: ABILITY.attackRecoverySeconds(this),
                    tick: this.simulationTick,
                };
            }
            if (OBS.ccStarted) {
                PROBE.stun = 1;
            }
            const RESULT = STEP.call(this, dt);
            if (!OBS.corrected && ACTION.prepareAim.y === TARGET.y) {
                OBS.corrected = {
                    actionStable: ABILITY.action === ACTION,
                    budgetStable: JSON.stringify(ACTION.peaAttack.source) === BUDGET,
                    movement: ACTION.prepareAim.y - ACTION.prepareAim.startY,
                };
            }
            if (!OBS.lockedAim && ACTION.prepareAim.locked) {
                OBS.lockedAim = JSON.stringify(ACTION.prepareAim);
                TARGET.y += 6;
                this._unitSpatialDirty = true;
            }
            if (OBS.ccStarted && OBS.recovery.length < 3) {
                OBS.recovery.push({
                    phase: ABILITY.phase,
                    elapsed: ABILITY.elapsed,
                    action: ABILITY.action?.id || null,
                    stun: PROBE.stun,
                });
                if (OBS.recovery.length === 3) {
                    OBS.finished = true;
                    OBS.committedAimStable = JSON.stringify(ACTION.prepareAim) === OBS.lockedAim;
                    OBS.targetHealthUnchanged = TARGET.hp === TARGET_HP;
                }
            }
            const CAST = this.formationRuntime.bossCast;
            if (!OBS.healing.prepared && CAST?.id === 'healing-rain' && CAST.phase === 'prepare') {
                OBS.healing.prepared = true;
                OBS.healing.serial = CAST.serial;
                for (const ALLY of this.formationSkills.bossContext.allies()) {
                    ALLY.setHealth(ALLY.maxHp);
                }
                OBS.healing.injuredAfterFill = this.formationSkills.bossContext.injuredAllies().length;
                if (OBS.healing.injuredAfterFill !== 0) {
                    throw new Error(
                        'The live healing invalidation fixture must leave no injured same-faction beneficiary',
                    );
                }
            }
            if (!OBS.healing.failed && this.formationRuntime.bossRetrySkillId === 'healing-rain') {
                OBS.healing.failed = {
                    tick: this.simulationTick,
                    cast: CAST,
                    charge: HEAL.charge,
                    cooldown: HEAL.cooldown,
                    effects: this.formationRuntime.effects.filter((effect) => effect.kind === 'healing-rain').length,
                };
                // Make healing eligible again before the next normal decision. It must still yield once.
                this.boss.setHealth(this.boss.maxHp * 0.3);
            } else if (OBS.healing.failed && this.simulationTick > OBS.healing.failed.tick) {
                const DECISION = {
                    tick: this.simulationTick,
                    cast: CAST?.id || null,
                    retry: this.formationRuntime.bossRetrySkillId,
                    pattern: this.boss.patternRuntime.active?.id || null,
                    pursuit: Math.hypot(this.boss.chaseVx, this.boss.chaseVy),
                    basicPhase: this.boss.ability.phase,
                    charge: HEAL.charge,
                    cooldown: HEAL.cooldown,
                };
                OBS.healing.nextTick ||= DECISION;
                if (RETRY_BEFORE === 'healing-rain' && !OBS.healing.nextDecision) {
                    if (DECISION.retry === null) {
                        // Observe the real token consumption, not the first tick of an already-busy basic action.
                        OBS.healing.nextDecision = { ...DECISION, eligible: !BUSY_BEFORE };
                    } else {
                        OBS.healing.pendingTicks++;
                        OBS.healing.pendingOnlyWhileBusy &&= BUSY_BEFORE;
                        OBS.healing.pendingUnspent &&=
                            DECISION.retry === 'healing-rain' &&
                            !CAST &&
                            HEAL.charge === 200 &&
                            HEAL.cooldown === 0 &&
                            !this.formationRuntime.effects.some((effect) => effect.kind === 'healing-rain');
                    }
                }
            }
            return RESULT;
        };
        PRESENTATION.draw = function (source, world) {
            const RESULT = DRAW.call(this, source, world),
                BOSS = world.boss;
            if (
                !OBS.sweepFrame &&
                BOSS.patternId === 'attack.sweep-360' &&
                BOSS.patternPhase === 'active' &&
                BOSS.patternPhaseElapsed >= 0.25
            ) {
                const INSTANCE = this.renderer.bossPlayers.get(BOSS.species);
                OBS.sweepFrame = {
                    sessionDto: world !== WORLD && BOSS !== WORLD.boss,
                    clip: INSTANCE.player.currentClip,
                    source: INSTANCE.record.compiled.sourcePath,
                    sameSource:
                        INSTANCE.record.compiled.sourcePath ===
                        this.renderer.vectorAssets.get(BOSS.species).compiled.sourcePath,
                    handRadius: INSTANCE.record.hands.radius,
                };
                if (capture) {
                    OBS.capturePending = true;
                    BUDMORI.runtime.paused = true;
                }
            }
            return RESULT;
        };
        globalThis.__restoreAttackFlowObservation = () => {
            WORLD.step = STEP;
            PRESENTATION.draw = DRAW;
            OFF();
            PROBE.stun = 1000;
            globalThis.__restoreAttackFlowObservation = null;
            return WORLD.step === STEP;
        };
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
    }, CAPTURE_BOSS_SWEEP);
    REPORT.physicalAoeFixture.previousCapture = {
        run: '40166029010',
        file: 'boss-special-sweep-desktop.jpg',
        captureMs: 4858,
    };
    for (;;) {
        await PAGE.waitForFunction(() => {
            const OBS = globalThis.__mixedCombat;
            return (
                OBS.attackFlow.capturePending ||
                (OBS.bossHitBatches.some((batch) => new Set(batch.targets).size > 1) &&
                    OBS.attackFlow.finished &&
                    OBS.attackFlow.healing.nextDecision &&
                    OBS.attackFlow.sweepFrame)
            );
        });
        if (!(await PAGE.evaluate(() => globalThis.__mixedCombat.attackFlow.capturePending))) {
            break;
        }
        REPORT.clock ||= { installedBeforeNavigation: true, combatResumed: true };
        await CAPTURE_FRAME('boss-special-sweep-desktop.jpg');
        await PAGE.evaluate(() => {
            globalThis.__mixedCombat.attackFlow.capturePending = false;
            BUDMORI.runtime.loop.resetTiming();
            BUDMORI.runtime.paused = false;
        });
    }
    assert.equal(await PAGE.evaluate(() => globalThis.__restoreAttackFlowObservation()), true);
    REPORT.mixedCombat = await PAGE.evaluate(() => ({
        ...globalThis.__mixedCombat,
        endTick: BUDMORI.sim.simulationTick,
        units: BUDMORI.sim.units.length,
    }));
    const COMBAT = REPORT.mixedCombat,
        FLOW = COMBAT.attackFlow;
    assert.ok(FLOW.nativeFrames > 0, 'the ordinary probe Unit reaches native presentation in the same encounter');
    assert.ok(
        FLOW.sweepFrame.sessionDto && FLOW.sweepFrame.sameSource && FLOW.sweepFrame.handRadius > 0,
        'the native special sweep uses the same body and hand rig as the shared basic attacks',
    );
    assert.ok(FLOW.corrected.actionStable && FLOW.corrected.budgetStable);
    assert.ok(
        Math.abs(FLOW.corrected.movement - 0.2) < 1e-9,
        'precommit follows a small real target reposition without restarting',
    );
    assert.ok(
        FLOW.committedAimStable && FLOW.targetHealthUnchanged,
        'postcommit dodge preserves saved aim and actually misses',
    );
    assert.equal(FLOW.launches, 1, 'CC cannot start a second ordinary attack');
    assert.equal(FLOW.hits, 0);
    assert.ok(FLOW.ccStarted.elapsed > FLOW.ccStarted.duration * 0.8, 'CC lands near the end of actual recovery');
    assert.ok(
        FLOW.recovery.every((sample) => sample.phase === 'idle' && sample.action === null && sample.stun > 0),
        'repeated CC finishes existing recovery and blocks new actions',
    );
    assert.equal(FLOW.healing.prepared, true, 'charged healing really entered preparation');
    assert.equal(FLOW.healing.injuredAfterFill, 0, 'all actual healing beneficiaries lose eligibility during prepare');
    assert.deepEqual(
        { ...FLOW.healing.failed, tick: 0 },
        { tick: 0, cast: null, charge: 200, cooldown: 0, effects: 0 },
        'eligibility loss releases the failed heal without spending or recovery',
    );
    assert.equal(FLOW.healing.released, 0);
    assert.equal(
        FLOW.healing.pendingOnlyWhileBusy,
        true,
        'the retry token is held only while the boss cannot select a new action',
    );
    assert.equal(FLOW.healing.pendingUnspent, true, 'busy ticks never spend healing charge or start cooldown/effects');
    assert.equal(FLOW.healing.nextTick.cast, null, 'the immediately following tick cannot restart the failed heal');
    assert.ok(
        FLOW.healing.nextTick.pattern ||
            FLOW.healing.nextTick.pursuit > 0 ||
            FLOW.healing.nextTick.basicPhase !== 'idle',
    );
    assert.equal(
        FLOW.healing.nextDecision.eligible,
        true,
        'the token is consumed at the next eligible selection, after the busy gate',
    );
    assert.equal(FLOW.healing.nextDecision.cast, null);
    assert.equal(FLOW.healing.nextDecision.retry, null);
    assert.equal(FLOW.healing.nextDecision.charge, 200);
    assert.equal(FLOW.healing.nextDecision.cooldown, 0);
    assert.ok(
        FLOW.healing.nextDecision.pattern ||
            FLOW.healing.nextDecision.pursuit > 0 ||
            FLOW.healing.nextDecision.basicPhase !== 'idle',
        'the failed charged slot yields a real physical attack or pursuit opportunity',
    );
    assert.equal(COMBAT.telegraph.scalar, 2, 'the real boss presentation DTO carries its common attack-area stat');
    assert.equal(
        COMBAT.telegraph.reach,
        COMBAT.telegraph.modelReach,
        'the native telegraph uses the same reach as its live model',
    );
    assert.ok(COMBAT.bossSlams > 0, 'the oversized pea boss selects and lands its front-slam special pattern');
    assert.equal(COMBAT.unitCore.sameClass, true, 'the real tower boss and ordinary troop are the same Unit class');
    assert.equal(COMBAT.unitCore.sharedLookup, true, 'boss identity resolves through the common unit lookup');
    assert.ok(COMBAT.unitCore.liveHealthChanges > 0, 'actual mixed-combat damage emits the boss Unit health signal');
    REPORT.unitCoreHealing = await PAGE.evaluate(async () => {
        const { applyHealing: HEAL } = await import('./src/unit-stats.js'),
            BOSS = BUDMORI.sim.boss,
            BEFORE = BOSS.hp,
            HEALED = HEAL(BOSS, 10);
        return { healed: HEALED, gain: BOSS.hp - BEFORE };
    });
    assert.ok(
        REPORT.unitCoreHealing.healed > 0 && REPORT.unitCoreHealing.gain === REPORT.unitCoreHealing.healed,
        'the damaged live boss recovers through common healing',
    );
    await PAGE.evaluate(() => globalThis.__restoreBossUnitHealthObservation());

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
    assert.ok(
        COMBAT.chestnutShots.every((shot) => shot.projectile) &&
            ['player', 'enemy'].every((faction) =>
                COMBAT.chestnutShots.some((shot) => shot.faction === faction && shot.surfaceGap > 2.5),
            ),
        'both researched troops and unresearched enemy chestnuts fire from outside contact range',
    );
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
    assert.equal(await PAGE.evaluate(() => globalThis.__restoreMixedObservation()), true);
    CHECKPOINT('mixedCombatAssertions');
    if (CAPTURE_BOSS_BASICS) {
        await PAGE.setViewportSize({ width: 1000, height: 700 });
    }
    // Continue the same real session with two bodies, retaining every mixed-roster
    // assertion above. One seeded automatic rotation, not nine boot/cast scenarios.
    await PAGE.evaluate(async (capture) => {
        const WORLD = BUDMORI.sim,
            SESSION = BUDMORI.runtime,
            PRESENTATION = BUDMORI.renderer.bossPresentation,
            { createBossPatternRuntime: PATTERNS } = await import('./src/boss-patterns.js'),
            OBS = (globalThis.__bossBasics = {
                order: [7, 5, 0, 1, 2, 3, 4, 6, 8],
                cases: [],
                transitions: [],
                startTick: WORLD.simulationTick,
                targetFixture: {
                    count: 2,
                    maxHp: 1e9,
                    knockbackResistance: 1,
                    purpose:
                        'avoid repeated pursuit only; unchanged native aim, collision, damage and automatic selection',
                },
                exclusive: true,
                specialLaunches: 0,
                capture,
                captured: [],
                capturePending: null,
                complete: false,
            });
        SESSION.paused = true;
        WORLD.formationSkills.end();
        WORLD.resetUnits();
        WORLD.setWorkBasisPoints(0);
        WORLD.projectiles = [];
        WORLD.effects = [];
        WORLD._bossHitBatch = [];
        WORLD.tower.relics = new Map();
        WORLD.tower.bossRelics = new Map();
        WORLD.boss.controller.configureStage(1, 0);
        // Restore the ordinary encounter input after the earlier isolated sweep fixture.
        // Never change cooldowns, selection, attack timing, RNG calls or hit settlement during this rotation.
        WORLD.boss.patternRuntime = PATTERNS();
        WORLD.rng.state = 424242;
        const TARGET = WORLD.spawn(0, 1, WORLD.boss.radius + 0.5, 0),
            MOUTH = {
                released: 0,
                volleyCount: 1,
                aim: Math.PI,
                id: 'summon.mouth-t1',
                phase: 'active',
                phaseElapsed: 0,
            };
        WORLD.boss.patternRuntime.active = MOUTH;
        if (!WORLD.spawnBossMouthUnit(MOUTH)) {
            throw new Error('The automatic boss rotation needs one real same-faction summon');
        }
        const PEER = WORLD.units.findLast((unit) => unit.ownerId === 'boss');
        for (const UNIT of [TARGET, PEER]) {
            UNIT.setBaseStats({ maxHp: 1e9, knockbackResistance: 1 });
            UNIT.setHealth(UNIT.maxHp);
            Object.assign(UNIT, {
                growth: 3,
                growthElapsed: UNIT.growthDuration,
                dropLanded: true,
                landingRecovery: 0,
            });
        }
        WORLD._benched.clear();
        WORLD._benchRevision++;
        WORLD.farmBossEvent.phase = 'fighting';
        const ARRANGE = (species) => {
                const PREVIOUS = WORLD.boss.generation,
                    PREVIOUS_CYCLE = WORLD.boss.ability;
                WORLD.boss.controller.configureStage(1, species);
                const BOSS = WORLD.boss;
                Object.assign(BOSS, {
                    active: true,
                    x: 0,
                    y: 0,
                    z: 0,
                    vx: 0,
                    vy: 0,
                    vz: 0,
                    stun: 0,
                    knockVx: 0,
                    knockVy: 0,
                });
                BOSS.setBaseStats({ maxHp: 1e9 });
                BOSS.setHealth(BOSS.maxHp);
                for (const [UNIT, DIRECTION] of [
                    [TARGET, 1],
                    [PEER, -1],
                ]) {
                    Object.assign(UNIT, {
                        x: DIRECTION * (BOSS.radius + UNIT.radius + 0.25),
                        y: 0,
                        z: 0,
                        vx: 0,
                        vy: 0,
                        vz: 0,
                        stun: 0,
                        down: 0,
                        landingRecovery: 0,
                        dropLanded: true,
                    });
                }
                const BUILD = WORLD.abilityProgressionFor(BOSS),
                    CASE = {
                        species,
                        generation: BOSS.generation,
                        startTick: WORLD.simulationTick,
                        prepared: 0,
                        launches: 0,
                        hits: 0,
                        nativeFrames: 0,
                        nativeAttackFrames: 0,
                        recovered: false,
                        maxRenderedBodyShift: 0,
                        maxBasicHeight: 0,
                        bodyRadius: BOSS.radius,
                        phases: [],
                        clips: [],
                        records: [],
                        effects: {},
                        sessionDto: true,
                        neutralBuild:
                            BUILD !== WORLD.playerProgression &&
                            Object.values(BUILD.abilities).every(
                                (entry) =>
                                    entry.treeVersion === 1 &&
                                    Object.values(entry.nodeRanks).every((rank) => rank === 0),
                            ),
                    };
                OBS.transitions.push({
                    previous: PREVIOUS,
                    generation: BOSS.generation,
                    newCycle: BOSS.ability !== PREVIOUS_CYCLE,
                    clearAction:
                        BOSS.ability.phase === 'idle' &&
                        BOSS.ability.action === null &&
                        BOSS.patternRuntime.active === null,
                });
                OBS.cases.push(CASE);
                WORLD._unitSpatialDirty = true;
            },
            ADD = (list, value) => {
                if (!list.includes(value)) {
                    list.push(value);
                }
            },
            RECORD_KEYS = [
                'peaAttack',
                'cornAttack',
                'redbeanAttack',
                'chestnutAttack',
                'peanutAttack',
                'walnutAttack',
                'riceAttack',
                'wheatAttack',
                'barleyAttack',
            ],
            READY = (sample) =>
                sample.prepared > 0 &&
                sample.launches > 0 &&
                sample.hits > 0 &&
                sample.nativeFrames > 0 &&
                sample.nativeAttackFrames > 0 &&
                sample.recovered &&
                (sample.species !== 1 || sample.effects.attachment) &&
                (sample.species !== 3 || sample.effects.thorn) &&
                (sample.species !== 5 || sample.effects.guard) &&
                (sample.species !== 7 || sample.effects.command) &&
                (sample.species !== 8 || sample.effects.shred);
        ARRANGE(OBS.order[0]);
        const STEP = WORLD.step,
            DRAW = PRESENTATION.draw,
            OFF = WORLD.onNotice.on((notice) => {
                const CASE = OBS.cases.at(-1),
                    BOSS = WORLD.boss;
                if (OBS.complete || CASE.generation !== BOSS.generation) {
                    return;
                }
                if (notice.kind === 'boss-pattern-launch') {
                    OBS.specialLaunches++;
                }
                if (notice.kind === 'attack-launch' && notice.unit === 'boss') {
                    CASE.launches++;
                }
                if (
                    notice.kind === 'unit-hit' &&
                    notice.sourceUnit === 'boss' &&
                    !notice.attackKind?.startsWith('attack.')
                ) {
                    CASE.hits++;
                    if (notice.attackKind === 'chestnut-spike') {
                        CASE.effects.thorn = true;
                    }
                }
                if (notice.kind === 'barley-shred' && notice.sourceUnit === 'boss') {
                    const UNIT = WORLD._unitForId(notice.unit);
                    CASE.effects.shred =
                        notice.amount > 0 &&
                        UNIT?.faction === 'player' &&
                        UNIT.barleyArmorShredBuckets.some(
                            (bucket) => bucket.amount > 0 && bucket.expiresAtTick > WORLD.simulationTick,
                        );
                }
                if (notice.kind === 'wheat-command' && notice.unit === 'boss') {
                    CASE.effects.command =
                        BOSS.wheatCommandBuffs.some((buff) => buff.expiresAtTick > WORLD.simulationTick) &&
                        PEER.wheatCommandBuffs.some((buff) => buff.expiresAtTick > WORLD.simulationTick);
                }
            });
        WORLD.step = function (dt) {
            const RESULT = STEP.call(this, dt),
                BOSS = this.boss,
                CASE = OBS.cases.at(-1),
                ABILITY = BOSS.ability;
            if (OBS.complete) {
                return RESULT;
            }
            OBS.exclusive &&= !(
                ABILITY.phase !== 'idle' &&
                (BOSS.patternRuntime.active || this.formationRuntime.bossCast)
            );
            if (ABILITY.phase === 'windup') {
                CASE.prepared++;
            }
            if (ABILITY.phase === 'active') {
                CASE.maxBasicHeight = Math.max(CASE.maxBasicHeight, BOSS.z);
            }
            CASE.recovered ||= ABILITY.phase === 'recover' && CASE.launches > 0;
            ADD(CASE.phases, ABILITY.phase);
            for (const KEY of RECORD_KEYS) {
                const RECORD = ABILITY.action?.[KEY];
                if (RECORD && !CASE.records.some((entry) => entry.id === RECORD.id)) {
                    CASE.records.push({
                        id: RECORD.id,
                        key: KEY,
                        tier: RECORD.tier,
                        form: RECORD.form,
                        generation: RECORD.ownerGeneration,
                    });
                }
                if (KEY === 'walnutAttack' && RECORD?.rawBudget > 0) {
                    CASE.effects.raw = { stored: RECORD.storedRaw, budget: RECORD.rawBudget };
                }
            }
            if (BOSS.species === 1) {
                CASE.effects.attachment ||= this.cornAttachments.groups.some((group) =>
                    group.attachments.some(
                        (item) =>
                            item.ownerId === 'boss' &&
                            item.ownerGeneration === BOSS.generation &&
                            item.status === 'attached',
                    ),
                );
            }
            if (BOSS.species === 5) {
                CASE.effects.guard ||= BOSS.walnutGuardUntilTick > this.simulationTick;
            }
            if (READY(CASE) && !OBS.capturePending) {
                CASE.elapsedTicks = this.simulationTick - CASE.startTick;
                if (OBS.cases.length === OBS.order.length) {
                    OBS.complete = true;
                    OBS.elapsedTicks = this.simulationTick - OBS.startTick;
                    SESSION.paused = true;
                } else {
                    ARRANGE(OBS.order[OBS.cases.length]);
                }
            }
            return RESULT;
        };
        PRESENTATION.draw = function (source, world) {
            const RESULT = DRAW.call(this, source, world),
                CASE = OBS.cases.at(-1),
                BOSS = world.boss;
            if (!OBS.complete && BOSS.generation === CASE.generation && this.basicAttackVisible(BOSS, world)) {
                CASE.nativeFrames++;
                const DISPLAY = this.attackDisplay.unit;
                CASE.maxRenderedBodyShift = Math.max(
                    CASE.maxRenderedBodyShift,
                    Math.hypot(DISPLAY.x - BOSS.x, DISPLAY.y - BOSS.y),
                );
                if (CASE.launches > 0 && BOSS.ability.phase !== 'windup') {
                    CASE.nativeAttackFrames++;
                }
                CASE.sessionDto &&= world !== WORLD && BOSS !== WORLD.boss && BOSS.ability !== WORLD.boss.ability;
                ADD(CASE.clips, this.renderer.bossPlayers.get(BOSS.species)?.player.currentClip);
                if (
                    capture &&
                    BOSS.ability.phase === 'active' &&
                    ((BOSS.species === 7 && BOSS.ability.wheatStageProgress >= 0.7) ||
                        (BOSS.species === 2 && BOSS.z > 0.3)) &&
                    !OBS.captured.includes(BOSS.species)
                ) {
                    OBS.captured.push(BOSS.species);
                    OBS.capturePending = BOSS.species;
                    SESSION.paused = true;
                }
            }
            return RESULT;
        };
        globalThis.__restoreBossBasicObservation = () => {
            WORLD.step = STEP;
            PRESENTATION.draw = DRAW;
            OFF();
            globalThis.__restoreBossBasicObservation = null;
            return WORLD.step === STEP && PRESENTATION.draw === DRAW;
        };
        SESSION.capturePresentation('reset');
        SESSION.loop.resetTiming();
        SESSION.paused = false;
    }, CAPTURE_BOSS_BASICS);
    for (;;) {
        await PAGE.waitForFunction(
            () => globalThis.__bossBasics.complete || globalThis.__bossBasics.capturePending !== null,
        );
        const CAPTURE = await PAGE.evaluate(() => globalThis.__bossBasics.capturePending);
        if (CAPTURE === null) {
            break;
        }
        REPORT.clock ||= { installedBeforeNavigation: true, combatResumed: true };
        await CAPTURE_FRAME(`boss-basic-${CAPTURE}-desktop.jpg`);
        await PAGE.evaluate(() => {
            globalThis.__bossBasics.capturePending = null;
            BUDMORI.runtime.loop.resetTiming();
            BUDMORI.runtime.paused = false;
        });
    }
    REPORT.bossBasics = await PAGE.evaluate(() => {
        const RESULT = { ...globalThis.__bossBasics, restored: globalThis.__restoreBossBasicObservation() };
        BUDMORI.runtime.paused = false;
        return RESULT;
    });
    assert.equal(
        REPORT.bossBasics.restored,
        true,
        'automatic boss observations restore native step, draw and listener',
    );
    assert.equal(REPORT.bossBasics.exclusive, true, 'basic actions never run alongside a special pattern or card cast');
    assert.ok(
        REPORT.bossBasics.specialLaunches > 0,
        'ordinary special selection remains enabled and does not starve basic attacks',
    );
    assert.deepEqual(REPORT.bossBasics.cases.map((sample) => sample.species).sort(), [0, 1, 2, 3, 4, 5, 6, 7, 8]);
    for (const SAMPLE of REPORT.bossBasics.cases) {
        assert.ok(
            SAMPLE.prepared > 0 && SAMPLE.launches > 0 && SAMPLE.hits > 0,
            `boss ${SAMPLE.species} automatically prepares, launches and hits`,
        );
        assert.ok(
            SAMPLE.nativeFrames > 0 && SAMPLE.nativeAttackFrames > 0 && SAMPLE.sessionDto,
            `boss ${SAMPLE.species} attacks through FarmSession DTO and native draw`,
        );
        assert.ok(SAMPLE.clips.length > 0 && SAMPLE.clips.every((clip) => clip && !['idle', 'walk'].includes(clip)));
        assert.ok(SAMPLE.neutralBuild, `boss ${SAMPLE.species} does not inherit researched player ranks`);
        assert.ok(
            SAMPLE.maxRenderedBodyShift <= SAMPLE.bodyRadius * 0.25,
            `boss ${SAMPLE.species} shifts its weight rather than sliding an entire body width to attack`,
        );
        if (SAMPLE.species === 2) {
            assert.ok(
                SAMPLE.maxBasicHeight > 0 && SAMPLE.maxBasicHeight <= SAMPLE.bodyRadius * 0.25,
                'the redbean basic hop stays close to the floor while retaining its actual airborne motion',
            );
        }
        assert.ok(
            SAMPLE.records.length > 0 &&
                SAMPLE.records.every(
                    (record) => record.tier === 1 && record.form === 1 && record.generation === SAMPLE.generation,
                ),
        );
    }
    assert.ok(
        REPORT.bossBasics.transitions.every(
            (transition) =>
                transition.previous !== transition.generation && transition.newCycle && transition.clearAction,
        ),
    );
    assert.ok(
        REPORT.bossBasics.cases.find((sample) => sample.species === 1).effects.attachment,
        'corn really attaches a boss-owned kernel to its opposing target',
    );
    assert.ok(
        REPORT.bossBasics.cases.find((sample) => sample.species === 3).effects.thorn,
        'chestnut really hits through its thorn projectile',
    );
    assert.ok(
        REPORT.bossBasics.cases.find((sample) => sample.species === 5).effects.guard,
        'walnut retains its ordinary guard during automatic attacks',
    );
    assert.ok(
        REPORT.bossBasics.cases.find((sample) => sample.species === 7).effects.command,
        'wheat naturally buffs itself and a same-faction mouth summon',
    );
    assert.ok(
        REPORT.bossBasics.cases.find((sample) => sample.species === 8).effects.shred,
        'barley naturally leaves live armor-shred buckets on an opponent',
    );
    assert.deepEqual(ERRORS, [], 'automatic nine-boss combat stays free of runtime errors');
    CHECKPOINT('nineBossBasicAssertions');
    await PAGE.setViewportSize({ width: 1000, height: 700 });
    await PAGE.locator('#upgradeMenu').click();
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
        REPORT.wording.push({ species: SPECIES, title: TITLE });
    }
    await PAGE.setViewportSize({ width: 390, height: 844 });
    await PAGE.locator('[data-growth-node="specialty-2"]').scrollIntoViewIfNeeded();
    assert.deepEqual(ERRORS, [], 'the representative growth menus remain free of runtime errors');
    CHECKPOINT('wordingAssertions');
    // Three real choices exercise each common card category, without replacing the roll or application code.
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
        WORLD.tower.bossCards = [];
        WORLD.tower.bossPassives = {};
        WORLD.tower.bossRelics = new Map();
        WORLD.tower.bossCardDraw = null;
        BUDMORI.runtime.paused = false;
    });
    REPORT.clock = {
        installedBeforeNavigation: true,
        controlledScope:
            'card receipt phases and already-paused render captures only; combat runs normally between checkpoints',
        combatResumed: false,
    };
    await PAGE.clock.pauseAt(await PAGE.evaluate(() => Date.now() + 1000));
    REPORT.bossCards = { draws: [] };
    const CARD_STATE = () =>
            PAGE.evaluate(async () => {
                const { runStatModifiers: MODIFIERS, passiveTotals: PASSIVES } = await import('./src/tower-run.js'),
                    WORLD = BUDMORI.sim,
                    TOWER = WORLD.tower;
                return {
                    floor: TOWER.floor,
                    serial: TOWER.bossCardDraw?.serial || 0,
                    playerCards: TOWER.cards,
                    playerModifiers: MODIFIERS(TOWER.cards),
                    cards: TOWER.bossCards,
                    relics: [...TOWER.bossRelics],
                    modifiers: MODIFIERS(TOWER.bossCards, 'boss'),
                    passives: PASSIVES(TOWER.bossCards, 'boss'),
                    attackPower: WORLD.boss.attackPower,
                };
            }),
        FEEDBACK_FRAME = () =>
            PAGE.evaluate(() => {
                const PANEL = document.getElementById('towerDoors'),
                    BANNER = document.getElementById('floorBanner'),
                    STYLE = (element, pseudo = null) => {
                        const CSS = getComputedStyle(element, pseudo);
                        return Object.fromEntries(
                            [
                                'opacity',
                                'color',
                                'webkitTextFillColor',
                                'backgroundColor',
                                'borderTopColor',
                                'borderTopWidth',
                                'outlineColor',
                                'outlineWidth',
                                'outlineStyle',
                                'outlineOffset',
                                'boxShadow',
                                'transform',
                                'filter',
                                'animationName',
                                'animationDuration',
                                'animationPlayState',
                                'transitionProperty',
                                'transitionDuration',
                                'zIndex',
                            ].map((property) => [property, CSS[property]]),
                        );
                    },
                    ANIMATIONS = (element) =>
                        element.getAnimations({ subtree: true }).map((animation) => ({
                            name: animation.animationName || animation.transitionProperty || '',
                            target: animation.effect?.target?.id || animation.effect?.target?.className || '',
                            playState: animation.playState,
                            pending: animation.pending,
                            currentTime: animation.currentTime,
                            startTime: animation.startTime,
                            timing: animation.effect?.getComputedTiming(),
                            keyframes: animation.effect?.getKeyframes(),
                        }));
                return {
                    phase: PANEL.dataset.phase,
                    owner: PANEL.dataset.owner,
                    elapsed: BUDMORI.sim.time - BUDMORI.sim.tower.bossCardDraw.startedAt,
                    title: document.getElementById('doorsTitle').textContent,
                    note: document.getElementById('doorsNote').textContent,
                    text: PANEL.innerText,
                    clocks: {
                        simulation: BUDMORI.sim.time,
                        performance: performance.now(),
                        documentTimeline: document.timeline.currentTime,
                    },
                    panel: { style: STYLE(PANEL), animations: ANIMATIONS(PANEL) },
                    floorBanner: {
                        hidden: BANNER.hidden,
                        style: STYLE(BANNER),
                        before: STYLE(BANNER, '::before'),
                        animations: ANIMATIONS(BANNER),
                    },
                    offers: [...PANEL.querySelectorAll('[data-boss-offer]')].map((offer) => ({
                        selected: offer.dataset.selected,
                        text: offer.innerText,
                        disabled: offer.disabled,
                        style: STYLE(offer),
                        titleStyle: STYLE(offer.querySelector('b')),
                        previewStyle: STYLE(offer.querySelector('small')),
                    })),
                };
            }),
        CAPTURE_FEEDBACK = async (file) => {
            // The same product UI was pixel-reviewed in PR354; keep recapture opt-in.
            if (process.env.BUDMORI_CAPTURE_CARD_FEEDBACK !== '1') {
                return;
            }
            // The existing UI clock is already stopped at a normally rendered transition frame.
            // Do not advance time, mutate the receipt, or freeze/replace the production renderer.
            const START = Date.now();
            assert.equal(REPORT.clock.combatResumed, false);
            await PAGE.screenshot({
                path: path.join(OUTPUT, file),
                type: 'jpeg',
                quality: 80,
                scale: 'css',
                fullPage: false,
            });
            REPORT.renderCaptures.push({ file, captureMs: Date.now() - START, source: 'actual card transition' });
        };
    for (const [TYPE, ID, SEED, SELECTED] of [
        ['stat', 'attack-pct', 6, 0],
        ['passive', 'opening', 314, 1],
        ['skill', 'lightning', 426, 2],
    ]) {
        if (TYPE === 'skill') {
            await PAGE.emulateMedia({ reducedMotion: 'reduce' });
        }
        await PAGE.evaluate(() => {
            BUDMORI.sim.tower.nextKind = 'power';
            BUDMORI.sim.tower.doors = [{ type: 'stat', id: 'regen-flat', rarity: 0 }];
        });
        await PAGE.clock.runFor(32);
        const BEFORE = await CARD_STATE(),
            DOOR = PAGE.locator('#doorCards [data-door="0"]:enabled');
        await DOOR.waitFor({ state: 'visible' });
        // A deterministic input seed, not a mocked card draw. No tick occurs before this native pointer click.
        await PAGE.evaluate((seed) => (BUDMORI.sim.rng.state = seed), SEED);
        await DOOR.click({ force: true });
        await PAGE.clock.runFor(64);
        await PAGE.locator('#towerDoors[data-owner="boss"][data-phase="receipt"]').waitFor({ state: 'visible' });
        const PHASES = [await FEEDBACK_FRAME()],
            APPLIED = await CARD_STATE();
        assert.match(PHASES[0].title, /내 카드/);
        assert.match(PHASES[0].text, /재생/);
        assert.equal(await PAGE.locator('#doorCards [data-door]').count(), 0, 'confirmation adds no second choice');
        await PAGE.clock.runFor(250);
        await PAGE.locator('#towerDoors[data-owner="boss"][data-phase="offers"]').waitFor({ state: 'visible' });
        PHASES.push(await FEEDBACK_FRAME());
        assert.equal(await PAGE.locator('#doorCards [data-boss-offer]').count(), 3);
        assert.equal(await PAGE.locator('#doorCards [data-selected="true"]').count(), 0);
        const OFFER = PAGE.locator('#doorCards [data-boss-offer="0"]');
        await OFFER.click({ force: true });
        await OFFER.focus();
        await PAGE.keyboard.down('Enter');
        await PAGE.keyboard.down('Enter');
        await PAGE.keyboard.up('Enter');
        assert.deepEqual(await CARD_STATE(), APPLIED, 'pointer and repeated Enter cannot apply a locked choice twice');
        const DRAW = await PAGE.evaluate(() => {
            const WORLD = BUDMORI.sim,
                RECEIPT = WORLD.tower.bossCardDraw,
                REJECTED = WORLD.chooseDoor(0) === false;
            return {
                ...RECEIPT,
                rejectedDuplicate: REJECTED,
                afterSerial: WORLD.tower.bossCardDraw.serial,
                presentation: BUDMORI.runtime.presentationView.tower.bossCardDraw,
                cards: WORLD.tower.bossCards,
                relics: [...WORLD.tower.bossRelics],
            };
        });
        assert.equal(DRAW.rejectedDuplicate, true, 'the receipt locks a repeated choice');
        assert.equal(DRAW.afterSerial, DRAW.serial, 'a repeated choice cannot apply another boss card');
        assert.equal(DRAW.offers.length, 3, 'the real draw offers three distinct common-pool candidates');
        assert.equal(new Set(DRAW.offers.map((card) => card.id)).size, 3);
        assert.equal(DRAW.selectedIndex, SELECTED);
        assert.deepEqual(DRAW.card, DRAW.offers[SELECTED]);
        assert.equal(DRAW.card.type, TYPE);
        assert.equal(DRAW.id, ID);
        assert.equal(DRAW.status, 'acquired');
        assert.equal(DRAW.level, 1);
        assert.ok(Math.abs(DRAW.until - DRAW.startedAt - 1.8) < 1e-9, 'feedback retains the 1.8-second lock');
        assert.deepEqual(DRAW.offerState, { cards: BEFORE.cards, relics: BEFORE.relics });
        assert.deepEqual(
            DRAW.presentation,
            {
                serial: DRAW.serial,
                floor: DRAW.floor,
                offers: DRAW.offers,
                offerState: DRAW.offerState,
                selectedIndex: DRAW.selectedIndex,
                card: DRAW.card,
                id: DRAW.id,
                level: DRAW.level,
                status: DRAW.status,
                player: DRAW.player,
                receipt: DRAW.receipt,
                startedAt: DRAW.startedAt,
                until: DRAW.until,
            },
            'the full model-owned receipt reaches the actual session presentation DTO',
        );
        assert.equal(
            DRAW.cards.length + DRAW.relics.length,
            REPORT.bossCards.draws.length + 1,
            'only the selected candidate is acquired',
        );
        assert.equal(APPLIED.playerCards.length, BEFORE.playerCards.length + 1, 'the player card applies once');
        assert.equal(DRAW.player.role, 'player');
        assert.equal(DRAW.player.card.id, 'regen-flat');
        assert.equal(DRAW.player.before.value, BEFORE.playerModifiers.regen?.flat || 0);
        assert.equal(DRAW.player.after.value, APPLIED.playerModifiers.regen.flat);
        assert.equal(DRAW.player.after.value - DRAW.player.before.value, 1);
        assert.equal(DRAW.receipt.role, 'boss');
        assert.deepEqual(DRAW.receipt.card, DRAW.card);
        const VALUE = (state) =>
            TYPE === 'stat'
                ? state.modifiers.attackPower?.pct || 0
                : TYPE === 'passive'
                  ? state.passives.opening || 0
                  : new Map(state.relics).get(ID) || 0;
        assert.equal(DRAW.receipt.before.value, VALUE(BEFORE));
        assert.equal(DRAW.receipt.after.value, VALUE(APPLIED));
        assert.ok(VALUE(APPLIED) > VALUE(BEFORE), 'the receipt reports an actual stat, passive or skill increase');
        if (TYPE === 'stat') {
            assert.ok(APPLIED.attackPower > BEFORE.attackPower, 'the stat receipt matches the live boss stat');
        }
        await PAGE.clock.runFor(300);
        await PAGE.locator('#towerDoors[data-owner="boss"][data-phase="selected"]').waitFor({ state: 'visible' });
        PHASES.push(await FEEDBACK_FRAME());
        assert.equal(await PAGE.locator('#doorCards [data-selected="true"]').count(), 1);
        assert.equal(
            await PAGE.locator('#doorCards [data-selected="true"]').getAttribute('data-boss-offer'),
            String(SELECTED),
        );
        await PAGE.clock.runFor(250);
        await PAGE.locator('#towerDoors[data-owner="boss"][data-phase="outcome"]').waitFor({ state: 'visible' });
        PHASES.push(await FEEDBACK_FRAME());
        assert.equal(await PAGE.locator('#doorCards [data-selected="true"]').count(), 1);
        DRAW.outcome = await PAGE.locator('#doorReceipts [data-role="boss"]').innerText();
        if (TYPE === 'skill') {
            assert.match(DRAW.outcome, /새 기술.*범위 피해 75/);
        } else {
            const FROM = Math.round(DRAW.receipt.before.value * 1000) / 10,
                TO = Math.round(DRAW.receipt.after.value * 1000) / 10;
            assert.ok(
                DRAW.outcome.includes(TYPE === 'stat' ? `+${FROM}% → +${TO}%` : `${FROM}% → ${TO}%`),
                'the UI prints the actual before/after values and units',
            );
        }
        if (TYPE === 'passive') {
            assert.match(DRAW.outcome, /전투 시작 후 10초간/);
        }
        assert.deepEqual(
            PHASES.map((phase) => phase.phase),
            ['receipt', 'offers', 'selected', 'outcome'],
        );
        assert.deepEqual(await CARD_STATE(), APPLIED, 'presentation phases never reapply either acquired card');
        DRAW.phases = PHASES;
        REPORT.bossCards.draws.push(DRAW);
        if (TYPE === 'stat') {
            // The JS clock does not drive Chromium's CSS document timeline. Observe finite native
            // animations settling without finishing/cancelling them or advancing the 1.8-second model lock.
            const START = Date.now();
            await PAGE.waitForFunction(
                () =>
                    ['towerDoors', 'floorBanner'].every((id) =>
                        document
                            .getElementById(id)
                            .getAnimations({ subtree: true })
                            .every(
                                (animation) =>
                                    !animation.pending && !['running', 'paused'].includes(animation.playState),
                            ),
                    ),
                null,
                { polling: 50, timeout: 5000 },
            );
            DRAW.settledOutcome = await FEEDBACK_FRAME();
            DRAW.cssSettlementMs = Date.now() - START;
            assert.equal(
                DRAW.settledOutcome.phase,
                'outcome',
                'native CSS settlement preserves the actual outcome phase',
            );
            assert.equal(
                DRAW.settledOutcome.elapsed,
                PHASES.at(-1).elapsed,
                'CSS settlement does not advance the model receipt',
            );
            assert.ok(DRAW.settledOutcome.elapsed < 1.8, 'the stable desktop capture remains within the original lock');
            await CAPTURE_FEEDBACK('card-choice-outcome-desktop.jpg');
        }
        if (TYPE === 'skill') {
            await PAGE.setViewportSize({ width: 844, height: 390 });
            await PAGE.clock.runFor(32);
            REPORT.bossCards.landscape = await PAGE.evaluate(() => ({
                receipt: document.getElementById('towerDoors').getBoundingClientRect().toJSON(),
                width: innerWidth,
                height: innerHeight,
                reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
                phase: document.getElementById('towerDoors').dataset.phase,
                content: [
                    ...document.querySelectorAll(
                        '#doorsTitle, #doorsNote, #doorCards .door, #doorReceipts [data-role="boss"], #towerLeave',
                    ),
                ].map((element) => ({
                    box: element.getBoundingClientRect().toJSON(),
                    fits: element.scrollWidth <= element.clientWidth && element.scrollHeight <= element.clientHeight,
                })),
                selectedMotion: getComputedStyle(document.querySelector('#doorCards [data-selected="true"]')).transform,
            }));
            const LANDSCAPE = REPORT.bossCards.landscape;
            assert.ok(
                LANDSCAPE.receipt.width > 0 &&
                    LANDSCAPE.receipt.height > 0 &&
                    LANDSCAPE.receipt.left >= 0 &&
                    LANDSCAPE.receipt.top >= 0 &&
                    LANDSCAPE.receipt.right <= LANDSCAPE.width &&
                    LANDSCAPE.receipt.bottom <= LANDSCAPE.height,
                'landscape candidate receipt remains fully inside the viewport',
            );
            assert.ok(
                LANDSCAPE.content.every(
                    ({ box, fits }) =>
                        fits &&
                        box.width > 0 &&
                        box.height > 0 &&
                        box.left >= 0 &&
                        box.top >= 0 &&
                        box.right <= LANDSCAPE.width &&
                        box.bottom <= LANDSCAPE.height,
                ),
                'landscape title, long effects, all three cards and exit control remain readable',
            );
            assert.equal(LANDSCAPE.reducedMotion, true);
            assert.equal(LANDSCAPE.selectedMotion, 'none', 'reduced motion keeps the selected card static');
            assert.equal(LANDSCAPE.phase, 'outcome', 'rotation and reduced motion preserve the readable result');
            REPORT.bossCards.landscape.previouslyReviewedCapture = {
                run: '40159742526',
                file: 'card-choice-outcome-landscape.jpg',
                scope: 'UI layout only; native canvas repaint after rotation was not verified',
            };
            await PAGE.setViewportSize({ width: 667, height: 375 });
            await PAGE.clock.runFor(32);
            REPORT.bossCards.compactLandscape = await PAGE.evaluate(() =>
                [...document.querySelectorAll('#towerDoors, #doorReceipts [data-role="boss"], #towerLeave')].map(
                    (element) => ({
                        box: element.getBoundingClientRect().toJSON(),
                        fits:
                            element.scrollWidth <= element.clientWidth && element.scrollHeight <= element.clientHeight,
                    }),
                ),
            );
            assert.ok(
                REPORT.bossCards.compactLandscape.every(
                    ({ box, fits }) =>
                        fits &&
                        box.width > 0 &&
                        box.height > 0 &&
                        box.left >= 0 &&
                        box.top >= 0 &&
                        box.right <= 667 &&
                        box.bottom <= 375,
                ),
                'the actual boss effect and exit remain readable at minimum landscape height',
            );
        }
        await PAGE.clock.runFor(1000);
        await PAGE.locator('#towerDoors[data-owner="player"]').waitFor({ state: 'visible' });
        assert.equal(
            await PAGE.evaluate(() => BUDMORI.sim.time >= BUDMORI.sim.tower.bossCardDraw.until),
            true,
            'the receipt unlocks through actual simulation ticks',
        );
        assert.deepEqual(await CARD_STATE(), APPLIED, 'automatic unlock never applies the card again');
        await PAGE.locator('#doorReceipts').waitFor({ state: 'visible' });
        DRAW.summary = await PAGE.locator('#doorReceipts').innerText();
        assert.equal(await PAGE.locator('#doorReceipts [data-role="player"]').count(), 1);
        assert.equal(await PAGE.locator('#doorReceipts [data-role="boss"]').count(), 1);
        assert.ok(
            DRAW.summary.includes(DRAW.outcome),
            'the next doors retain the exact boss result without truncating its values',
        );
        assert.equal(
            (await PAGE.locator('#doorCards [data-door]:enabled').count()) > 0,
            true,
            'next doors need no confirmation',
        );
        if (TYPE === 'skill') {
            const SUMMARY = await PAGE.locator('#towerDoors').boundingBox();
            assert.ok(
                SUMMARY &&
                    SUMMARY.x >= 0 &&
                    SUMMARY.y >= 0 &&
                    SUMMARY.x + SUMMARY.width <= 667 &&
                    SUMMARY.y + SUMMARY.height <= 375,
                'persistent next-door summaries also fit after landscape rotation',
            );
            await PAGE.setViewportSize({ width: 1000, height: 700 });
            await PAGE.emulateMedia({ reducedMotion: 'no-preference' });
            await PAGE.clock.runFor(32);
        }
        DRAW.desktopSummary = await PAGE.locator('#doorReceipts').innerText();
        assert.match(DRAW.desktopSummary, /내 카드/);
        assert.match(DRAW.desktopSummary, /보스/);
        assert.match(DRAW.desktopSummary, /재생/);
        assert.match(DRAW.desktopSummary, /→/);
    }
    await PAGE.clock.resume();
    REPORT.clock.combatResumed = true;
    CHECKPOINT('cardAssertions');

    await PAGE.evaluate(() => {
        BUDMORI.sim.tower.nextKind = 'battle';
        BUDMORI.sim.tower.doors = [{ type: 'fight', kind: 'battle' }];
    });
    await PAGE.locator('#doorCards [data-door="0"]:enabled').click();
    await PAGE.waitForFunction(() => BUDMORI.sim.formationRuntime.active);
    await PAGE.locator('#bossRelicHost [data-formation-slot="lightning"][data-acquired="new"]').waitFor({
        state: 'visible',
    });
    REPORT.bossCards.nextBattle = await PAGE.evaluate(() => ({
        cards: BUDMORI.sim.tower.bossCards,
        relics: [...BUDMORI.sim.tower.bossRelics],
        slots: BUDMORI.sim.formationRuntime.slots
            .filter((slot) => slot.role === 'boss')
            .map((slot) => [slot.id, slot.level]),
        attackPower: BUDMORI.sim.boss.attackPower,
        baseAttackPower: BUDMORI.sim.boss.statProfile.attackPower,
        opening: BUDMORI.sim.tower.bossPassives.opening,
        badge: document.querySelector('#bossRelicHost [data-formation-slot="lightning"] .formation-acquired')
            .textContent,
        skillStatus: document.querySelector('#bossRelicHost [data-formation-slot="lightning"] .formation-status')
            .textContent,
        charge: document.querySelector('#bossRelicHost [data-formation-slot="lightning"] .formation-charge i').style
            .width,
        cooldown: document
            .querySelector('#bossRelicHost [data-formation-slot="lightning"] .formation-clock')
            .style.getPropertyValue('--cooldown'),
    }));
    const LAST_DRAW = REPORT.bossCards.draws.at(-1),
        NEXT_BATTLE = REPORT.bossCards.nextBattle;
    assert.deepEqual(NEXT_BATTLE.cards, LAST_DRAW.cards, 'the next real battle retains stat and passive cards');
    assert.deepEqual(NEXT_BATTLE.relics, LAST_DRAW.relics, 'the next real battle retains the boss skill');
    assert.deepEqual(NEXT_BATTLE.slots, LAST_DRAW.relics, 'the next real battle synchronizes the acquired skill');
    assert.ok(NEXT_BATTLE.attackPower > NEXT_BATTLE.baseAttackPower, 'the acquired stat affects the live boss');
    assert.ok(NEXT_BATTLE.opening > 0, 'the acquired passive is active in the next real battle');
    assert.equal(NEXT_BATTLE.badge, '새 기술', 'the actual acquired skill is marked in the next battle');
    assert.ok(
        NEXT_BATTLE.skillStatus && NEXT_BATTLE.skillStatus !== NEXT_BATTLE.badge,
        'the acquisition badge does not replace real skill state',
    );
    assert.equal(NEXT_BATTLE.charge, '0%', 'the new badge preserves the actual initial charge display');
    assert.equal(NEXT_BATTLE.cooldown, '0deg', 'the new badge preserves the actual initial cooldown display');
    await PAGE.evaluate(() => {
        const WORLD = BUDMORI.sim,
            SCALE = WORLD.passiveDamageScale,
            OBS = (globalThis.__bossCardHit = { scale: 0, damage: 0 });
        BUDMORI.runtime.paused = true;
        WORLD.farmBossEvent.phase = 'fighting';
        WORLD.farmBossEvent.elapsed = 0;
        WORLD._benched.clear();
        WORLD._benchRevision++;
        Object.assign(WORLD.boss, { hp: WORLD.boss.maxHp, x: 0, y: 0, z: 0, stun: 0 });
        WORLD.boss.patternRuntime.active = null;
        for (const ID of Object.keys(WORLD.boss.patternRuntime.cooldowns)) {
            WORLD.boss.patternRuntime.cooldowns[ID] = ID === 'attack.front-slam' ? 0 : 1000;
        }
        for (const [INDEX, UNIT] of WORLD.units.entries()) {
            Object.assign(UNIT, {
                x: WORLD.boss.radius + UNIT.radius + 0.3,
                y: INDEX * 0.1,
                z: 0,
                stun: 1000,
                hp: 1e8,
                vx: 0,
                vy: 0,
                vz: 0,
                dropLanded: true,
            });
        }
        WORLD._unitSpatialDirty = true;
        WORLD.passiveDamageScale = function (...args) {
            const RESULT = SCALE.apply(this, args);
            if (args[0] === this.boss) {
                OBS.scale = RESULT;
            }
            return RESULT;
        };
        const OFF = WORLD.onCombatResolved.on((event) => {
            if (event.sourceActor === 'boss' && event.role === 'boss' && event.damageDealt > 0) {
                OBS.damage += event.damageDealt;
                BUDMORI.runtime.paused = true;
            }
        });
        globalThis.__restoreBossCardHit = () => {
            WORLD.passiveDamageScale = SCALE;
            OFF();
        };
        BUDMORI.runtime.capturePresentation('reset');
        BUDMORI.runtime.loop.resetTiming();
        BUDMORI.runtime.paused = false;
    });
    await PAGE.waitForFunction(() => globalThis.__bossCardHit.damage > 0);
    REPORT.bossCards.passiveHit = await PAGE.evaluate(() => {
        globalThis.__restoreBossCardHit();
        return globalThis.__bossCardHit;
    });
    assert.ok(REPORT.bossCards.passiveHit.scale > 1, 'the acquired opening passive boosts a native physical hit');
    assert.ok(REPORT.bossCards.passiveHit.damage > 0, 'the boosted physical hit actually removes target health');
    REPORT.bossCards.restart = await PAGE.evaluate(() => {
        const WORLD = BUDMORI.sim;
        BUDMORI.runtime.paused = true;
        // Arrange the between-floors boundary, then exercise the real public run lifecycle.
        WORLD.farmBossEvent.phase = 'idle';
        WORLD.boss.active = false;
        WORLD.formationSkills.end();
        const LEFT = WORLD.leaveTower(),
            STARTED = WORLD.startTower(WORLD.playerProgression.towerBest),
            EMPTY =
                WORLD.tower.bossCards.length === 0 &&
                WORLD.tower.bossRelics.size === 0 &&
                Object.keys(WORLD.tower.bossPassives).length === 0 &&
                WORLD.tower.bossCardDraw === null,
            ENTERED = STARTED && WORLD.finishMarch();
        return { left: LEFT, started: STARTED, empty: EMPTY, entered: ENTERED };
    });
    assert.deepEqual(
        REPORT.bossCards.restart,
        { left: true, started: true, empty: true, entered: true },
        'a fresh high-floor climb starts without boss cards, passives, skills or a stale receipt',
    );

    await PAGE.locator('#doorReceipts').waitFor({ state: 'hidden' });
    // Receipts were already hidden during the preceding battle. Wait for the next
    // native UI frame to observe the new tower, rather than reading the old dock DOM.
    await PAGE.waitForFunction(() =>
        [...document.querySelectorAll('.formation-acquired')].every(
            (badge) => badge.getClientRects().length === 0 || getComputedStyle(badge).visibility === 'hidden',
        ),
    );
    assert.equal(
        await PAGE.locator('.formation-acquired:visible').count(),
        0,
        'a fresh climb shows no stale acquired-skill badge',
    );
    REPORT.bossCards.restart.clearedFeedback = true;

    CHECKPOINT('nextBattleAndRestartAssertions');
    await PAGE.setViewportSize({ width: 667, height: 375 });
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
            geometry: {},
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
            const EXTRA = OBS.newSkills;
            if (EXTRA && !EXTRA.complete) {
                EXTRA.modelGiantScale = this.boss.giantScale;
                EXTRA.modelRadius = this.boss.radius;
                EXTRA.healed = Math.max(EXTRA.healed, this.boss.hp - EXTRA.initialHp);
                for (const UNIT of this.units) {
                    const BEFORE_HP = EXTRA.targetHp[UNIT.id];
                    if (UNIT.stun > 0 && UNIT.hp < BEFORE_HP) {
                        EXTRA.hammer = { id: UNIT.id, damage: BEFORE_HP - UNIT.hp, stun: UNIT.stun };
                    }
                }
                if (
                    EXTRA.healed > 0 &&
                    EXTRA.hammer &&
                    EXTRA.dtoHammerImpact &&
                    ['giant', 'healing-rain', 'hammer'].every((id) => OBS.rendered[`boss:${id}`] > 0)
                ) {
                    EXTRA.complete = true;
                    EXTRA.elapsedTicks = this.simulationTick - EXTRA.startTick;
                    BUDMORI.runtime.paused = true;
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
                    OBS.releaseCooldown = WORLD.formationRuntime.slots.find(
                        (slot) => slot.id === notice.skillId && (slot.role || 'player') === (notice.role || 'player'),
                    ).cooldown;
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
            ['giant', 'GiantPresentation'],
            ['healing-rain', 'HealingRainPresentation'],
            ['hammer', 'HammerPresentation'],
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
                const OBS = globalThis.__sharedSkills,
                    DISPLAY = args[0],
                    GEOMETRY = {
                        sessionDto: DISPLAY !== BUDMORI.sim && !BUDMORI.sim.formationRuntime.effects.includes(effect),
                        age: effect.age,
                        revision: DISPLAY.presentationRevision,
                        dimensions: Object.fromEntries(
                            [
                                'radius',
                                'bodyRadius',
                                'bodyHeight',
                                'sizeRadius',
                                'sizeHeight',
                                'visualWidth',
                                'beamWidth',
                                'cloudSize',
                                'targetRange',
                            ].map((key) => [key, effect[key] ?? 0]),
                        ),
                        groundRadii: [],
                        saucerWidth: 0,
                    },
                    GROUND = renderer.groundEllipse,
                    ELLIPSE = renderer.ellipse;
                renderer.groundEllipse = function (x, y, radius, ...rest) {
                    GEOMETRY.groundRadii.push(radius);
                    return GROUND.call(this, x, y, radius, ...rest);
                };
                renderer.ellipse = function (x, y, width, height, color, ...rest) {
                    if (color === '#718695') {
                        GEOMETRY.saucerWidth = (width * 2) / this.scale;
                    }
                    return ELLIPSE.call(this, x, y, width, height, color, ...rest);
                };
                let result;
                try {
                    result = DRAW.call(this, renderer, effect, ...args);
                } finally {
                    renderer.groundEllipse = GROUND;
                    renderer.ellipse = ELLIPSE;
                    OBS.geometry[effect.id] = GEOMETRY;
                }
                const KEY = `${effect.role}:${effect.kind}`;
                OBS.rendered[KEY] = (OBS.rendered[KEY] || 0) + 1;
                const EXTRA = OBS.newSkills;
                if (EXTRA && effect.role === 'boss') {
                    EXTRA.sessionDto = DISPLAY !== BUDMORI.sim && DISPLAY.boss !== BUDMORI.sim.boss;
                    if (effect.kind === 'giant') {
                        EXTRA.dtoGiantScale = DISPLAY.boss.giantScale;
                        EXTRA.dtoRadius = DISPLAY.boss.radius;
                    } else if (effect.kind === 'healing-rain') {
                        EXTRA.dtoInjuredBoss = DISPLAY.formationInjuredAllies.get('boss').includes(DISPLAY.boss);
                    } else if (effect.kind === 'hammer' && effect.impacted) {
                        EXTRA.dtoHammerImpact = true;
                    }
                }
                return result;
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
            const OBS = {
                    role: effect.role,
                    age: effect.age,
                    widths: [],
                    arcStrokes: 0,
                    left: Infinity,
                    right: -Infinity,
                },
                ELLIPSE = renderer.ellipse,
                STROKE = renderer.ctx.stroke;
            renderer.ellipse = function (x, y, width, ...rest) {
                OBS.widths.push(width);
                OBS.left = Math.min(OBS.left, x - width);
                OBS.right = Math.max(OBS.right, x + width);
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
                OBS.visibleWidth = (OBS.right - OBS.left) / renderer.scale;
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
            ['ufo', 10, 'critHits'],
            ['storm-cloud', 75, 'hits'],
        ]) {
            const DESKTOP =
                ROLE === 'boss' &&
                (ID === 'ufo' ||
                    (ID === 'lightning' &&
                        ['lightning', 'all'].includes(process.env.BUDMORI_CAPTURE_BOSS_SCALE ?? '')));
            if (DESKTOP) {
                await PAGE.setViewportSize({ width: 1000, height: 700 });
            }
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
                        Object.assign(UNIT, {
                            x:
                                role === 'boss'
                                    ? 8 +
                                      [0, WORLD.boss.radius * 0.8 * 0.8, WORLD.boss.radius * 0.8 + UNIT.radius + 0.75][
                                          INDEX
                                      ]
                                    : 4 + INDEX * 0.1,
                            y: 0,
                            z: 0,
                            stun: 1000,
                            vx: 0,
                            vy: 0,
                            vz: 0,
                        });
                    }
                    WORLD._unitSpatialDirty = true;
                    const SLOT = SKILLS.slots.find((slot) => (slot.role || 'player') === role),
                        OTHER = SKILLS.slots.find((slot) => slot !== SLOT),
                        KEY = role === 'boss' ? PROFILE.condition : DEFINITION.condition,
                        LIMIT = role === 'boss' ? PROFILE.required : DEFINITION.required,
                        OBS = globalThis.__sharedSkills;
                    OBS.casts = [];
                    OBS.releaseCooldown = null;
                    OBS.hits = [];
                    OBS.recoveries = {};
                    OBS.preparations = {};
                    OBS.impactFixture = null;
                    OBS.geometry = {};
                    OBS.targetFixture = WORLD.units.map((unit, index) => ({
                        id: unit.id,
                        hp: unit.hp,
                        x: unit.x,
                        y: unit.y,
                        radius: unit.radius,
                        inside: index < 2,
                    }));
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
                    return {
                        required: LIMIT,
                        condition: KEY,
                        bossRequired: PROFILE.required,
                        playerRadius: DEFINITION.aoeRadius ?? null,
                        playerBeamWidth: DEFINITION.beamWidth ?? null,
                    };
                },
                { role: ROLE, id: ID, required: REQUIRED, condition: CONDITION },
            );
            await PAGE.waitForFunction(() => globalThis.__sharedSkills.checkpoint?.reached === true);
            if (ROLE === 'boss' && ['meteor', 'meteor-shower'].includes(ID)) {
                await PAGE.evaluate((id) => {
                    const WORLD = BUDMORI.sim,
                        EFFECT = WORLD.formationRuntime.effects.find(
                            (effect) => effect.role === 'boss' && effect.kind === id,
                        ),
                        OBS = globalThis.__sharedSkills;
                    // The production launch already chose this legal landing point. Arrange only targets
                    // within that telegraphed footprint; never alter the effect, random roll or damage code.
                    OBS.impactFixture = {
                        effectId: EFFECT.id,
                        x: EFFECT.x,
                        y: EFFECT.y,
                        radius: EFFECT.radius,
                        launchAge: EFFECT.age,
                        targets: [],
                    };
                    for (const [INDEX, UNIT] of WORLD.units.entries()) {
                        Object.assign(UNIT, {
                            x: EFFECT.x + [0, EFFECT.radius * 0.8, EFFECT.radius + UNIT.radius + 0.75][INDEX],
                            y: EFFECT.y,
                            z: 0,
                            vx: 0,
                            vy: 0,
                            vz: 0,
                            stun: 1000,
                            dropLanded: true,
                        });
                        const TARGET = { id: UNIT.id, hp: UNIT.hp, x: UNIT.x, y: UNIT.y, radius: UNIT.radius };
                        if (INDEX < 2) {
                            OBS.impactFixture.targets.push(TARGET);
                        } else {
                            OBS.impactFixture.outside = TARGET;
                        }
                    }
                    WORLD._unitSpatialDirty = true;
                    OBS.checkpoint = {
                        kind: 'effect',
                        role: 'boss',
                        id,
                        age: EFFECT.fallSeconds + EFFECT.delay + 0.05,
                        reached: false,
                    };
                    BUDMORI.runtime.loop.resetTiming();
                    BUDMORI.runtime.paused = false;
                }, ID);
                await PAGE.waitForFunction(() => globalThis.__sharedSkills.checkpoint.reached);
            }
            await PAGE.evaluate(() => BUDMORI.runtime.capturePresentation('reset'));
            // Observe the actual new DTO draw instead of paying for two redundant fixed RAFs per case.
            await PAGE.waitForFunction(
                ({ role, id }) => {
                    const EFFECT = BUDMORI.sim.formationRuntime.effects.find(
                            (effect) => effect.role === role && effect.kind === id,
                        ),
                        GEOMETRY = globalThis.__sharedSkills.geometry[EFFECT?.id];
                    return (
                        GEOMETRY?.sessionDto &&
                        GEOMETRY.revision === BUDMORI.runtime.presentationRevision &&
                        Math.abs(GEOMETRY.age - EFFECT.age) < 1e-9
                    );
                },
                { role: ROLE, id: ID },
            );
            const HUD_CASE = ROLE === 'boss' && ID === 'ufo',
                // Both unchanged model-scale images are reviewed. Recapture lightning/ufo/all only on demand.
                SCALE_MODE = process.env.BUDMORI_CAPTURE_BOSS_SCALE ?? '',
                SCALE_FILE =
                    ROLE === 'boss' && ['lightning', 'ufo'].includes(ID) && [ID, 'all'].includes(SCALE_MODE)
                        ? `boss-${ID}-scale-desktop.jpg`
                        : null,
                FILE = HUD_CASE && process.env.BUDMORI_CAPTURE_SHARED_HUD === '1' ? 'boss-skills-desktop.jpg' : null,
                CAPTURE_STARTED = Date.now();
            REPORT.pendingCase = {
                role: ROLE,
                id: ID,
                stage: SCALE_FILE || FILE ? 'screenshot' : 'inspect native draw',
                elapsedMs: CAPTURE_STARTED - CASE_STARTED,
            };
            fs.writeFileSync(path.join(OUTPUT, 'report.json'), JSON.stringify(REPORT, null, 2));
            if (SCALE_FILE) {
                // Capture the already-repainted desktop combat frame before HUD viewport/menu round trips.
                await CAPTURE_FRAME(SCALE_FILE);
            }
            if (HUD_CASE) {
                // Layout-only fixture: retain the native UFO cast, add two legal idle model slots, then restore.
                REPORT.bossCards.hudFixture = await PAGE.evaluate(() => {
                    const WORLD = BUDMORI.sim,
                        RELICS = WORLD.tower.bossRelics,
                        SLOTS = WORLD.formationRuntime.slots;
                    WORLD.tower.bossRelics = new Map([...RELICS, ['lightning', 1], ['meteor', 1]]);
                    WORLD.formationRuntime.slots = [
                        ...SLOTS,
                        ...['lightning', 'meteor'].map((id) => ({
                            id,
                            ownerId: 'boss',
                            role: 'boss',
                            level: 1,
                            charge: 0,
                            cooldown: 0,
                        })),
                    ];
                    globalThis.__restoreBossHudFixture = () => {
                        WORLD.tower.bossRelics = RELICS;
                        WORLD.formationRuntime.slots = SLOTS;
                        globalThis.__restoreBossHudFixture = null;
                    };
                    BUDMORI.runtime.capturePresentation('reset');
                    return {
                        source: 'paused actual model; two idle slots added for layout only',
                        skills: [...WORLD.tower.bossRelics.keys()],
                    };
                });
                await PAGE.waitForFunction(
                    () => document.querySelectorAll('#bossRelicHost [data-formation-slot]').length === 3,
                );
                const DOCK = PAGE.locator('#bossRelicHost .formation-dock[data-role="boss"]'),
                    SLOT = DOCK.locator('[data-formation-slot="ufo"]'),
                    DETAIL = PAGE.locator('#relicDetail-boss');
                await SLOT.waitFor({ state: 'visible' });
                assert.equal(await SLOT.getAttribute('data-state'), 'cooldown');
                assert.match(await SLOT.locator('.formation-status').textContent(), /재사용 .*초/);
                REPORT.bossCards.hud = await PAGE.evaluate(() => ({
                    slot: BUDMORI.runtime.presentationView.bossSlots.find((slot) => slot.id === 'ufo'),
                    dock: document.querySelector('#bossRelicHost .formation-dock').getBoundingClientRect().toJSON(),
                    health: document.querySelector('#bossbar .track--boss').getBoundingClientRect().toJSON(),
                    allyHealth: document.querySelector('#bossbar .track--ally').getBoundingClientRect().toJSON(),
                    charge: document.querySelector('#bossRelicHost .formation-charge i').style.width,
                    cooldown: document
                        .querySelector('#bossRelicHost .formation-clock')
                        .style.getPropertyValue('--cooldown'),
                }));
                const HUD = REPORT.bossCards.hud;
                assert.ok(HUD.slot.cooldown > 0 && HUD.slot.cooldown <= 5);
                assert.equal(HUD.slot.role, 'boss', 'the boss HUD uses its actual role-filtered session slot');
                assert.equal(HUD.charge, '0%', 'charge resets visibly after release');
                assert.ok(Math.abs(parseFloat(HUD.cooldown) - (HUD.slot.cooldown / 5) * 360) < 0.01);
                for (const TRACK of [HUD.health, HUD.allyHealth]) {
                    assert.ok(
                        TRACK.width >= 200 && TRACK.height > 0,
                        'both desktop health tracks keep a readable full-width lane',
                    );
                }
                assert.ok(HUD.dock.top >= HUD.health.bottom, 'the boss skill dock sits beneath boss health');
                await PAGE.setViewportSize({ width: 844, height: 390 });
                REPORT.bossCards.combatLandscape = await PAGE.evaluate(() => ({
                    tracks: [...document.querySelectorAll('#bossbar .track')].map((track) =>
                        track.getBoundingClientRect().toJSON(),
                    ),
                    dock: document.querySelector('#bossRelicHost .formation-dock').getBoundingClientRect().toJSON(),
                    slots: [...document.querySelectorAll('#bossRelicHost [data-formation-slot]')].map((slot) => ({
                        id: slot.dataset.formationSlot,
                        box: slot.getBoundingClientRect().toJSON(),
                        unclipped: [...slot.querySelectorAll('.formation-status, .formation-lv')].every(
                            (label) =>
                                label.scrollWidth <= label.clientWidth && label.scrollHeight <= label.clientHeight,
                        ),
                    })),
                    width: innerWidth,
                    height: innerHeight,
                }));
                const MOBILE = REPORT.bossCards.combatLandscape;
                assert.equal(MOBILE.tracks.length, 2);
                assert.equal(MOBILE.slots.length, 3, 'the actual paused boss model renders three owned skills');
                assert.ok(
                    MOBILE.slots.every((slot) => slot.unclipped),
                    'all three mobile level and state labels fit',
                );
                for (const BOX of [...MOBILE.tracks, MOBILE.dock, ...MOBILE.slots.map((slot) => slot.box)]) {
                    assert.ok(
                        BOX.width > 0 &&
                            BOX.height > 0 &&
                            BOX.left >= 0 &&
                            BOX.top >= 0 &&
                            BOX.right <= MOBILE.width &&
                            BOX.bottom <= MOBILE.height,
                        'landscape health tracks and boss dock stay visible inside the viewport',
                    );
                }
                assert.ok(MOBILE.dock.top >= MOBILE.tracks[1].bottom, 'landscape boss skills remain below boss health');
                await SLOT.locator('[data-relic-detail]').tap();
                await DETAIL.waitFor({ state: 'visible' });
                assert.match(await DETAIL.locator('.relic-detail__condition').textContent(), /치명타 0 \/ 10/);
                assert.match(await DETAIL.innerText(), /5초.*자동 발동/);
                const DETAIL_BOX = await DETAIL.boundingBox();
                assert.ok(
                    DETAIL_BOX?.width > 0 &&
                        DETAIL_BOX.height > 0 &&
                        DETAIL_BOX.x >= 0 &&
                        DETAIL_BOX.y >= 0 &&
                        DETAIL_BOX.x + DETAIL_BOX.width <= 844 &&
                        DETAIL_BOX.y + DETAIL_BOX.height <= 390,
                    'the touch detail remains inside the landscape viewport',
                );
                const BOSS_BAR = await PAGE.locator('#bossbar').boundingBox();
                assert.ok(
                    BOSS_BAR && DETAIL_BOX.x + DETAIL_BOX.width <= BOSS_BAR.x,
                    'the open touch detail does not cover the three boss skills',
                );
                REPORT.bossCards.combatLandscape.detail = DETAIL_BOX;
                REPORT.bossCards.combatLandscape.previouslyReviewedCapture =
                    'CI40154278393 boss-skills-landscape-detail.jpg';
                await DETAIL.locator('.relic-detail__close').tap();
                await DETAIL.waitFor({ state: 'hidden' });
                await SLOT.locator('[data-relic-detail]').tap();
                await DETAIL.waitFor({ state: 'visible' });
                await PAGE.keyboard.press('Escape');
                await DETAIL.waitFor({ state: 'hidden' });
                await PAGE.locator('#gameMenu').click();
                await DOCK.waitFor({ state: 'hidden' });
                assert.equal(await DETAIL.isVisible(), false, 'menu navigation leaves no stale detail overlay');
                await PAGE.locator('#gameMenuClose').click();
                await DOCK.waitFor({ state: 'visible' });
                await PAGE.setViewportSize({ width: 1000, height: 700 });
                if (FILE) {
                    // Resizing clears the canvas; repaint only when an image will be read back.
                    await PAGE.evaluate(() => {
                        BUDMORI.runtime.capturePresentation('reset');
                        return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
                    });
                    await CAPTURE_FRAME(FILE);
                }
                await PAGE.evaluate(() => globalThis.__restoreBossHudFixture());
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
                        releaseCooldown: globalThis.__sharedSkills.releaseCooldown,
                        hits: globalThis.__sharedSkills.hits,
                        effect: EFFECT,
                        drawGeometry: globalThis.__sharedSkills.geometry[EFFECT.id],
                        targetFixture: globalThis.__sharedSkills.targetFixture,
                        impactFixture: globalThis.__sharedSkills.impactFixture,
                        targetBodies: WORLD.units.map((unit) => ({
                            id: unit.id,
                            x: unit.x,
                            y: unit.y,
                            radius: unit.radius,
                            hp: unit.hp,
                        })),
                        bossBody: {
                            x: WORLD.boss.x,
                            y: WORLD.boss.y,
                            radius: WORLD.boss.radius,
                            height: WORLD.boss.height,
                        },
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
            assert.equal(
                RESULT.drawGeometry.sessionDto,
                true,
                'the native renderer receives a copied production session DTO',
            );
            for (const [KEY, VALUE] of Object.entries(RESULT.drawGeometry.dimensions)) {
                assert.equal(VALUE, RESULT.effect[KEY] ?? 0, `the production DTO preserves ${ID} ${KEY}`);
            }
            if (ROLE === 'boss') {
                const DIAMETER = RESULT.bossBody.radius * 2 * 0.8,
                    RADIUS = DIAMETER / 2,
                    FIXTURE = RESULT.impactFixture,
                    INSIDE = FIXTURE ? FIXTURE.targets : RESULT.targetFixture.filter((target) => target.inside),
                    OUTSIDE = FIXTURE ? FIXTURE.outside : RESULT.targetFixture.find((target) => !target.inside);
                assert.ok(DIAMETER < RESULT.bossBody.radius * 2, 'boss attacks are slightly smaller than their caster');
                if (['lightning', 'meteor', 'meteor-shower'].includes(ID)) {
                    assert.equal(
                        RESULT.effect.radius,
                        RADIUS,
                        'the real boss impact radius follows the caster, not a tier-1 unit',
                    );
                }
                assert.equal(RESULT.effect.sizeRadius, RADIUS, 'the visual size reference uses the live boss radius');
                assert.equal(
                    RESULT.effect.sizeHeight,
                    RESULT.bossBody.height * 0.8,
                    'visual height follows the same boss size profile',
                );
                if (['lightning', 'ufo'].includes(ID)) {
                    assert.ok(
                        RESULT.drawGeometry.groundRadii.some((radius) => Math.abs(radius - RADIUS) < 1e-9),
                        'the native ground footprint draws the same radius used for damage',
                    );
                }
                if (ID === 'ufo') {
                    assert.equal(
                        RESULT.effect.beamWidth,
                        DIAMETER,
                        'the live UFO collision beam spans 80 percent of boss diameter',
                    );
                    assert.equal(RESULT.effect.visualWidth, DIAMETER);
                    assert.ok(
                        Math.abs(RESULT.drawGeometry.saucerWidth - DIAMETER) < 1e-9,
                        'the native saucer silhouette matches its boss-relative beam',
                    );
                }
                if (ID === 'storm-cloud') {
                    assert.equal(
                        RESULT.effect.visualWidth,
                        DIAMETER,
                        'the actual cloud DTO carries the caster-relative width',
                    );
                    assert.equal(RESULT.effect.targetRange, RADIUS, 'cloud reach uses the same caster-relative radius');
                    assert.ok(
                        Math.abs(RESULT.cloudDraw.visibleWidth - DIAMETER) < 1e-9,
                        'the native settled cloud is 80 percent of boss diameter',
                    );
                    assert.deepEqual(
                        RESULT.effect.targets.map((target) => target.id).sort(),
                        INSIDE.map((target) => target.id).sort(),
                        'the native cloud selects only targets inside its caster-relative reach',
                    );
                }
                assert.ok(
                    INSIDE.every((target) => RESULT.targetBodies.find((unit) => unit.id === target.id)?.hp < target.hp),
                    'native boss skill damage reaches both the center and outer footprint target',
                );
                assert.equal(
                    RESULT.targetBodies.find((unit) => unit.id === OUTSIDE.id)?.hp,
                    OUTSIDE.hp,
                    'a target beyond the actual boss footprint remains undamaged',
                );
                assert.ok(
                    INSIDE.every((target) =>
                        RESULT.hits.some((hit) => hit.kind === 'unit-hit' && hit.unit === target.id),
                    ) && !RESULT.hits.some((hit) => hit.unit === OUTSIDE.id),
                    'real hit events agree with the inside/outside health geometry',
                );
            } else {
                if (START.playerRadius !== null) {
                    assert.equal(
                        RESULT.effect.radius,
                        START.playerRadius,
                        'player impact radii retain their original skill definition',
                    );
                }
                assert.equal(
                    RESULT.effect.sizeRadius,
                    RESULT.targetBody.radius,
                    'player visual size still follows its actual target',
                );
                assert.equal(
                    RESULT.effect.sizeHeight,
                    RESULT.targetBody.height,
                    'player visual height remains unchanged',
                );
                if (ID === 'ufo') {
                    assert.equal(
                        RESULT.effect.beamWidth || 0,
                        START.playerBeamWidth,
                        'the player UFO keeps its original narrow targeting',
                    );
                    assert.ok(!RESULT.effect.visualWidth, 'the player saucer keeps its target-body rendering rule');
                }
            }
            assert.deepEqual(RESULT.casts, [{ id: ID, role: ROLE }], 'one release per cast');
            assert.equal(RESULT.otherCharge, 0, 'skill effects never recharge the opposite owner');
            assert.equal(RESULT.ownCharge, 0, 'released skills do not recharge themselves');
            assert.equal(RESULT.releaseCooldown, 5, 'both roles start the common five-second cooldown on release');
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
            if (ROLE === 'boss' && ['meteor', 'meteor-shower'].includes(ID)) {
                assert.equal(
                    RESULT.effect.id,
                    RESULT.impactFixture.effectId,
                    'the observed impact belongs to the original production launch',
                );
                assert.equal(RESULT.effect.impacted, true, 'the meteor reaches its real impact transition');
                assert.ok(
                    RESULT.effect.age >= RESULT.effect.fallSeconds + RESULT.effect.delay,
                    'damage is observed after the actual landing time',
                );
                assert.ok(
                    RESULT.impactFixture.targets.every(
                        (target) =>
                            Math.hypot(target.x - RESULT.impactFixture.x, target.y - RESULT.impactFixture.y) <=
                            RESULT.impactFixture.radius,
                    ),
                    'fixture targets begin within the original telegraphed footprint',
                );
                assert.ok(
                    RESULT.impactFixture.targets.some(
                        (target) => RESULT.targetBodies.find((unit) => unit.id === target.id)?.hp < target.hp,
                    ),
                    'native meteor impact actually reduces target health',
                );
                assert.ok(
                    RESULT.hits.some(
                        (hit) =>
                            hit.kind === 'unit-hit' &&
                            RESULT.impactFixture.targets.some((target) => target.id === hit.unit),
                    ),
                    'native meteor impact emits a real skill hit',
                );
            }
            if (ROLE === 'boss' && ['lightning', 'ufo', 'storm-cloud'].includes(ID)) {
                assert.ok(
                    RESULT.targetBodies.every(
                        (target) =>
                            Math.hypot(target.x - RESULT.bossBody.x, target.y - RESULT.bossBody.y) >
                            RESULT.bossBody.radius + target.radius,
                    ),
                    'captured targets stand outside the boss body',
                );
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
                screenshot: SCALE_FILE || FILE,
                hudScreenshot: FILE,
                elapsedMs: Date.now() - CASE_STARTED,
                screenshotMs: CAPTURE_MS,
            });
            REPORT.pendingCase = null;
            fs.writeFileSync(path.join(OUTPUT, 'report.json'), JSON.stringify(REPORT, null, 2));
            if (DESKTOP) {
                await PAGE.setViewportSize({ width: 667, height: 375 });
            }
        }
    }
    CHECKPOINT('sharedSkillsAssertions');
    await PAGE.setViewportSize({ width: 1000, height: 700 });
    // Keep the already released cloud alive while a UFO releases, then cancel a third cast.
    await PAGE.evaluate(() => {
        const WORLD = BUDMORI.sim;
        globalThis.__sharedSkills.recoveries.ufo = undefined;
        globalThis.__sharedSkills.checkpoint = { kind: 'phase', id: 'ufo', phase: 'recover', ticks: 6, reached: false };
        WORLD.tower.bossRelics = new Map([
            ['ufo', 1],
            ['lightning', 1],
            ['storm-cloud', 1],
        ]);
        WORLD.formationRuntime.slots = [
            { id: 'ufo', ownerId: 'boss', role: 'boss', level: 1, charge: 10, cooldown: 0 },
            { id: 'lightning', ownerId: 'boss', role: 'boss', level: 1, charge: 0, cooldown: 0 },
        ];
        BUDMORI.runtime.paused = false;
    });
    await PAGE.waitForFunction(() => globalThis.__sharedSkills.checkpoint.reached);
    await PAGE.locator('#bossRelicHost [data-formation-slot="ufo"][data-state="recover"]').waitFor({
        state: 'visible',
    });
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
    await PAGE.locator('#bossRelicHost [data-formation-slot="lightning"][data-state="prepare"]').waitFor({
        state: 'visible',
    });
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
    // One continuation, not another matrix: the three newly shared boss skills run together in this live battle.
    await PAGE.evaluate(() => {
        const WORLD = BUDMORI.sim,
            SKILLS = WORLD.formationSkills,
            OBS = globalThis.__sharedSkills;
        SKILLS.end();
        WORLD.projectiles = [];
        WORLD.effects = [];
        WORLD.tower.relics = new Map();
        WORLD.tower.bossRelics = new Map(['giant', 'healing-rain', 'hammer'].map((id) => [id, 1]));
        WORLD.tower.passives = {};
        Object.assign(WORLD.boss, { hp: WORLD.boss.maxHp - 250, x: 0, y: 0, z: 0, stun: 0 });
        WORLD.boss.patternRuntime.active = null;
        for (const ID of Object.keys(WORLD.boss.patternRuntime.cooldowns)) {
            WORLD.boss.patternRuntime.cooldowns[ID] = 1000;
        }
        for (const [INDEX, UNIT] of WORLD.units.entries()) {
            UNIT.maxHp = 1000;
            Object.assign(UNIT, {
                hp: 1000,
                x: 12 + INDEX,
                y: 0,
                z: 0,
                stun: 0,
                landingRecovery: 10,
                vx: 0,
                vy: 0,
                vz: 0,
                dropLanded: true,
            });
            UNIT.ability.interrupt();
        }
        WORLD._unitSpatialDirty = true;
        SKILLS.synchronize();
        OBS.casts = [];
        OBS.hits = [];
        OBS.checkpoint = null;
        OBS.newSkills = {
            startTick: WORLD.simulationTick,
            initialHp: WORLD.boss.hp,
            baseRadius: WORLD.boss.radius,
            targetHp: Object.fromEntries(WORLD.units.map((unit) => [unit.id, unit.hp])),
            initialStun: WORLD.units.map((unit) => unit.stun),
            healed: 0,
            complete: false,
        };
        WORLD.onCombatResolved.emit({ role: 'boss', damageDealt: 200 });
        WORLD.onCombatResolved.emit({ role: 'boss', damageTaken: 200 });
        WORLD.onCombatResolved.emit({ role: 'boss', sourceFaction: 'enemy', allyDeaths: 3 });
        BUDMORI.runtime.capturePresentation('reset');
        BUDMORI.runtime.loop.resetTiming();
        BUDMORI.runtime.paused = false;
    });
    await PAGE.waitForFunction(() => globalThis.__sharedSkills.newSkills.complete);
    REPORT.newBossSkills = await PAGE.evaluate(() => ({
        ...globalThis.__sharedSkills.newSkills,
        casts: globalThis.__sharedSkills.casts,
        hits: globalThis.__sharedSkills.hits,
        nativeDraws: Object.fromEntries(
            ['giant', 'healing-rain', 'hammer'].map((id) => [id, globalThis.__sharedSkills.rendered[`boss:${id}`]]),
        ),
    }));
    const NEW_SKILLS = REPORT.newBossSkills;
    assert.deepEqual(
        NEW_SKILLS.casts,
        ['giant', 'healing-rain', 'hammer'].map((id) => ({ id, role: 'boss' })),
    );
    assert.equal(NEW_SKILLS.sessionDto, true, 'new skills render the actual FarmSession DTO, not the model');
    assert.equal(NEW_SKILLS.modelGiantScale, 1.25);
    assert.equal(NEW_SKILLS.dtoGiantScale, 1.25);
    assert.ok(Math.abs(NEW_SKILLS.modelRadius / NEW_SKILLS.baseRadius - 1.25) < 1e-9);
    assert.ok(Math.abs(NEW_SKILLS.dtoRadius / NEW_SKILLS.baseRadius - 1.25) < 1e-9);
    assert.ok(NEW_SKILLS.healed > 0 && NEW_SKILLS.dtoInjuredBoss, 'native rain draws over and heals the actual boss');
    assert.ok(NEW_SKILLS.initialStun.every((stun) => stun === 0));
    assert.ok(NEW_SKILLS.hammer.damage > 0 && NEW_SKILLS.hammer.stun > 0 && NEW_SKILLS.dtoHammerImpact);
    assert.ok(
        NEW_SKILLS.hits.some((hit) => hit.unit === NEW_SKILLS.hammer.id),
        'native hammer emits the actual damaging hit',
    );
    assert.ok(Object.values(NEW_SKILLS.nativeDraws).every((count) => count > 0));
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
    // Victory celebration and fading use 0.5s each; no extra encounter or screenshots.
    const END_STARTED = Date.now();
    // Finish this same encounter through real lethal damage and normal RAF, not a direct victory call.
    await PAGE.evaluate(async () => {
        const WORLD = BUDMORI.sim,
            { applyDamage: DAMAGE } = await import('./src/unit-stats.js');
        WORLD.boss.controller.configureStage(WORLD.boss.stage, 4);
        const OLD_BOSS = WORLD.boss,
            OBS = (globalThis.__unitCoreEnd = {
                generation: OLD_BOSS.generation,
                victories: 0,
                rewards: 0,
                peanutSplits: 0,
                damage: null,
                startedTime: WORLD.time,
            });
        globalThis.__restoreUnitCoreEndObservation = WORLD.onNotice.on((notice) => {
            if (notice.kind === 'peanut-split' && notice.unit === 'boss') {
                OBS.peanutSplits++;
            }
            if (notice.kind === 'farm-boss-victory') {
                OBS.victories++;
            }
            if (notice.kind === 'farm-boss-reward') {
                OBS.rewards++;
            }
        });
        OBS.damage = DAMAGE(OLD_BOSS, OLD_BOSS.hp + 1, { armor: 0 }).actualLoss;
        BUDMORI.runtime.loop.resetTiming();
        BUDMORI.runtime.paused = false;
    });
    await PAGE.waitForFunction(
        () =>
            BUDMORI.sim.farmBossEvent.phase === 'idle' &&
            BUDMORI.sim.boss.generation !== globalThis.__unitCoreEnd.generation,
    );
    REPORT.unitCoreEnd = await PAGE.evaluate(async () => {
        const WORLD = BUDMORI.sim,
            { Unit: UNIT_TYPE } = await import('./src/farm-model.js'),
            REPEATED = WORLD.finishFarmBossEvent('victory');
        BUDMORI.runtime.paused = true;
        globalThis.__restoreUnitCoreEndObservation();
        return {
            ...globalThis.__unitCoreEnd,
            repeated: REPEATED,
            replacementUnit: WORLD.boss instanceof UNIT_TYPE && WORLD._unitForId('boss') === WORLD.boss,
            replacementGeneration: WORLD.boss.generation,
            clean:
                !WORLD.boss.active &&
                !WORLD.formationRuntime.active &&
                WORLD.formationRuntime.effects.length === 0 &&
                WORLD.formationRuntime.slots.length === 0,
            elapsedSimulationSeconds: WORLD.time - globalThis.__unitCoreEnd.startedTime,
        };
    });
    assert.ok(REPORT.unitCoreEnd.damage > 0);
    assert.equal(REPORT.unitCoreEnd.peanutSplits, 0, 'the peanut boss preserves its no-death-split encounter policy');
    assert.equal(REPORT.unitCoreEnd.victories, 1, 'real boss death settles victory once');
    assert.equal(REPORT.unitCoreEnd.rewards, 1, 'real boss death issues one reward settlement');
    assert.equal(REPORT.unitCoreEnd.repeated, false, 'a repeated finish cannot settle another victory');
    assert.equal(REPORT.unitCoreEnd.replacementUnit, true, 'encounter cleanup creates another ordinary Unit body');
    assert.notEqual(REPORT.unitCoreEnd.replacementGeneration, REPORT.unitCoreEnd.generation);
    assert.equal(REPORT.unitCoreEnd.clean, true, 'encounter cleanup removes active boss skills and effects');
    REPORT.unitCoreEnd.elapsedWallMs = Date.now() - END_STARTED;
    assert.deepEqual(ERRORS, [], 'same-Unit lifecycle remains free of runtime errors');
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
        await page
            .evaluate(() => {
                globalThis.__restoreBossTelegraphObservation?.();
                globalThis.__restoreBossUnitHealthObservation?.();
                globalThis.__restoreBossBasicObservation?.();
                globalThis.__restoreMixedObservation?.();
                globalThis.__restoreBossCardHit?.();
                globalThis.__restoreAttackFlowObservation?.();
                globalThis.__restoreBossHudFixture?.();
                globalThis.__restoreUnitCoreEndObservation?.();
            })
            .catch(() => null);
        REPORT.mixedCombat = await page.evaluate(() => globalThis.__mixedCombat).catch(() => null);
        REPORT.bossBasics = await page.evaluate(() => globalThis.__bossBasics).catch(() => null);
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
    // Assertions have finished; stop accepting work and close remaining HTTP keep-alive sockets
    // while Chromium shuts down, rather than spending the same deadline on sequential idle drains.
    const SERVER_CLOSED = new Promise((resolve) => SERVER.close(resolve));
    SERVER.closeAllConnections();
    await browser?.close();
    REPORT.cleanupBrowserClosedAt = new Date().toISOString();
    fs.writeFileSync(path.join(OUTPUT, 'report.json'), JSON.stringify(REPORT, null, 2));
    await SERVER_CLOSED;
    REPORT.cleanupFinishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(OUTPUT, 'report.json'), JSON.stringify(REPORT, null, 2));
}
