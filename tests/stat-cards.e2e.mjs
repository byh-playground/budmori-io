// Select the authored stat cards, then complete one native attack with every species at the tier-4/5 crossover.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = fileURLToPath(new URL('../', import.meta.url)),
    OUTPUT = path.join(ROOT, 'tests/output/stat-cards'),
    ERRORS = [],
    TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' },
    APPROVED = [
        ['attack-flat', ['공격력 +2', '공격력 +3.2', '공격력 +5'], [2, 3.2, 5]],
        ['attack-pct', ['공격력 +10%', '공격력 +16%', '공격력 +25%'], [0.1, 0.16, 0.25]],
        ['hp-flat', ['체력 +48', '체력 +76', '체력 +120'], [48, 76, 120]],
        ['hp-pct', ['체력 +12%', '체력 +19%', '체력 +30%'], [0.12, 0.19, 0.3]],
        ['regen-flat', ['재생 +1/초', '재생 +1.6/초', '재생 +2.5/초'], [1, 1.6, 2.5]],
        ['regen-pct', ['재생 +0.25% 체력/초', '재생 +0.4% 체력/초', '재생 +0.625% 체력/초'], [0.0025, 0.004, 0.00625]],
    ],
    REPORT = {
        status: 'running',
        seed: 731,
        dt: 0.05,
        viewport: { width: 1000, height: 760 },
        rendering: 'Chromium SwiftShader, real pinned SDK modules from vendor/upstream',
        defenseFixture:
            'Stationary targets; legal full armor penetration holds effective armor at zero, including boss lost-HP armor.',
        cards: [],
        attacks: [],
    };
fs.mkdirSync(OUTPUT, { recursive: true });
const SERVER = http.createServer((request, response) => {
    const FILE = path.resolve(ROOT, '.' + decodeURIComponent(request.url.split('?')[0]));
    if (!FILE.startsWith(ROOT) || !fs.existsSync(FILE) || !fs.statSync(FILE).isFile()) {
        response.writeHead(404).end();
        return;
    }
    response.setHeader('content-type', TYPES[path.extname(FILE)] || 'application/octet-stream');
    response.end(fs.readFileSync(FILE));
});
await new Promise((resolve) => SERVER.listen(0, '127.0.0.1', resolve));
const BROWSER = await chromium.launch({
    executablePath: process.env.CHROME_PATH,
    args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
    REPORT.browser = BROWSER.version();
    const CONTEXT = await BROWSER.newContext({ viewport: REPORT.viewport, serviceWorkers: 'block' }),
        PAGE = await CONTEXT.newPage();
    PAGE.on('pageerror', (error) => ERRORS.push(String(error)));
    await PAGE.route(/cdn\.jsdelivr\.net\/gh\/byh-playground\/bloom-gamekit@[0-9a-f]+\/(.*)/, (route) => {
        const FILE = path.join(
            ROOT,
            'vendor/upstream',
            route
                .request()
                .url()
                .match(/@[0-9a-f]+\/(.*)$/)[1],
        );
        return fs.existsSync(FILE)
            ? route.fulfill({
                  body: fs.readFileSync(FILE),
                  contentType: 'text/javascript',
                  headers: { 'access-control-allow-origin': '*' },
              })
            : route.abort();
    });
    await PAGE.goto(`http://127.0.0.1:${SERVER.address().port}/index.html`);
    await PAGE.waitForFunction(() => globalThis.BUDMORI && !document.getElementById('bloom-module-loading'));
    await PAGE.locator('#newGame').click();
    await PAGE.evaluate(() => {
        BUDMORI.runtime.paused = true;
    });
    for (const [ID, TEXTS, VALUES] of APPROVED) {
        for (let rarity = 0; rarity < 3; rarity++) {
            await PAGE.evaluate(
                ([id, level]) => {
                    const W = BUDMORI.sim,
                        T = W.tower;
                    T.active = true;
                    T.phase = 'climbing';
                    T.floor = 2;
                    T.kind = T.nextKind = 'power';
                    T.cards = [];
                    T.bossCards = [];
                    T.bossCardDraw = null;
                    T.playerPick = null;
                    T.doors = [{ type: 'stat', id, rarity: level }];
                    W.farmBossEvent.phase = 'idle';
                    W._applyRunStats();
                    W._applyBossRunStats();
                    BUDMORI.runtime.capturePresentation('reset');
                },
                [ID, rarity],
            );
            const DOOR = PAGE.locator('#doorCards [data-door="0"]');
            await PAGE.waitForFunction(
                (text) => document.querySelector('#doorCards [data-door="0"] b')?.textContent === text,
                TEXTS[rarity],
            );
            assert.equal(await DOOR.locator('b').innerText(), TEXTS[rarity], `${ID}/${rarity} offered value`);
            await DOOR.click();
            const RECEIPT = await PAGE.evaluate(() => BUDMORI.sim.tower.playerPick.receipt);
            assert.deepEqual(RECEIPT.card, {
                type: 'stat',
                id: ID,
                rarity,
                effect: {
                    stat: { attack: 'attackPower', hp: 'maxHp', regen: 'regen' }[ID.split('-')[0]],
                    mode: ID.endsWith('-flat') ? 'flat' : 'pct',
                    value: VALUES[rarity],
                },
            });
            assert.equal(RECEIPT.before.value, 0);
            assert.equal(RECEIPT.after.value, VALUES[rarity], `${ID}/${rarity} selected value`);
            REPORT.cards.push({ id: ID, rarity, text: TEXTS[rarity], receipt: RECEIPT });
        }
    }
    REPORT.attacks = await PAGE.evaluate(
        async (selectedCards) => {
            const { Garden: GARDEN } = await import('./src/model/farm-model.js'),
                { snapshot: SNAPSHOT, restore: RESTORE } = await import('./src/model/farm-state.js'),
                {
                    baseUnitStatsFor: BARE_STATS,
                    resolveUnitStats: STATS,
                    setRunStatMods: SET_RUN,
                } = await import('./src/units/unit-stats.js'),
                KEYS = [
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
                RESULTS = [];

            function play(species, tier, context, card, resume = false) {
                SET_RUN({});
                const WORLD = new GARDEN(731);
                WORLD._flushEjected();
                WORLD.resetUnits();
                const PLAYER = WORLD.spawn(context === 'boss-profile' ? 0 : species, tier, -7, 0);
                PLAYER.growth = 3;
                PLAYER.growthElapsed = PLAYER.growthDuration;
                PLAYER.temperament = context === 'attack-trait' ? 2 : 0;
                PLAYER.permanentStatMultiplier = context === 'attack-trait' ? 1.5 : 1;
                if (!WORLD.startTower(1) || !WORLD.finishMarch()) {
                    throw new Error('the stat-card attack fixture must enter a real tower encounter');
                }
                WORLD.farmBossEvent.phase = 'fighting';
                WORLD.farmBossEvent.elapsed = 0;
                WORLD._benched.clear();
                WORLD._benchRevision++;
                const BOSS = WORLD.boss;
                if (context === 'boss-profile') {
                    BOSS.controller.configureStage(1, species);
                    BOSS.setBaseStats({ attackPower: 500, maxHp: 1e9, armor: 0, regen: 0 });
                    BOSS.permanentStatMultiplier = 1.25;
                    if (card) {
                        WORLD.tower.bossCards.push({ id: card.id, rarity: card.rarity, effect: { ...card.effect } });
                    }
                } else if (card) {
                    WORLD.tower.cards.push({ id: card.id, rarity: card.rarity, effect: { ...card.effect } });
                }
                WORLD._applyRunStats();
                WORLD._applyBossRunStats();
                const ACTOR = context === 'boss-profile' ? BOSS : PLAYER,
                    TARGET = context === 'boss-profile' ? PLAYER : BOSS;
                // Keep defense constant through every multi-hit cycle. The boss otherwise gains armor as it loses HP.
                ACTOR.setStatModifiers({ ...ACTOR.statModifiers, armorPenetration: { flat: 1, pct: 0, basePct: 0 } });
                TARGET.setBaseStats({
                    maxHp: 1e9,
                    attackPower: 1,
                    armor: 0,
                    regen: 0,
                    knockbackResistance: 1,
                    statusResistance: 1,
                });
                TARGET.setStatModifiers({});
                TARGET.temperament = 0;
                TARGET.permanentStatMultiplier = 1;
                Object.assign(TARGET, {
                    hp: TARGET.maxHp,
                    stun: 1000,
                    x: context === 'boss-profile' ? 6 : 0,
                    y: 0,
                    z: 0,
                    dropLanded: true,
                    landingRecovery: 0,
                    vx: 0,
                    vy: 0,
                    vz: 0,
                });
                Object.assign(ACTOR, {
                    hp: ACTOR.maxHp,
                    x: context === 'boss-profile' ? 0 : -6,
                    y: 0,
                    z: 0,
                    dropLanded: true,
                    landingRecovery: 0,
                    stun: 0,
                    vx: 0,
                    vy: 0,
                    vz: 0,
                });
                BOSS.patternRuntime.active = null;
                WORLD._unitSpatialDirty = true;
                const SOURCE_POWER = STATS(ACTOR).attackPower,
                    TARGET_HP = TARGET.hp;
                if (
                    !ACTOR.ability.begin(WORLD, {
                        id: TARGET.id,
                        generation: TARGET.generation,
                        x: TARGET.x,
                        y: TARGET.y,
                    })
                ) {
                    throw new Error(`native attack could not begin: ${species}/${tier}/${context}`);
                }
                const RECORD = ACTOR.ability.action[KEYS[species]];
                if (!RECORD) {
                    throw new Error(`the native ${KEYS[species]} record was not prepared`);
                }
                const PROOF = structuredClone(RECORD.budgetInputs.power),
                    OBS = { launches: 0, hits: 0, damage: 0, lastHitTick: null },
                    ACTOR_ID = ACTOR.id,
                    TARGET_ID = TARGET.id;
                function listen(world, observations) {
                    return world.onNotice.on((notice) => {
                        if (notice.kind === 'attack-launch' && notice.unit === ACTOR_ID) {
                            observations.launches++;
                        }
                        if (
                            (notice.kind === 'unit-hit' &&
                                notice.sourceUnit === ACTOR_ID &&
                                notice.unit === TARGET_ID) ||
                            (notice.kind === 'boss-hit' && notice.unit === ACTOR_ID && notice.targetId === TARGET_ID)
                        ) {
                            observations.hits++;
                            observations.damage += notice.damage;
                            observations.lastHitTick = world.simulationTick;
                        }
                    });
                }
                const OFF = listen(WORLD, OBS);
                let checkpoint = null,
                    clone = null,
                    cloneActor = null,
                    cloneTarget = null,
                    cloneOff = null;
                const CLONE_OBS = { launches: 0, hits: 0, damage: 0, lastHitTick: null };
                let afterCheckpoint = null;
                for (let tick = 0; tick < 240; tick++) {
                    if (ACTOR.ability.phase === 'recover' || ACTOR.ability.phase === 'idle') {
                        ACTOR.stun = 1000;
                    }
                    WORLD.step(0.05);
                    if (clone) {
                        if (cloneActor.ability.phase === 'recover' || cloneActor.ability.phase === 'idle') {
                            cloneActor.stun = 1000;
                        }
                        clone.step(0.05);
                    }
                    // Save after launch, before every hit has settled. Delayed projectiles remain part of this first cycle.
                    if (resume && !checkpoint && RECORD.launchTick !== null && tick > 0) {
                        checkpoint = SNAPSHOT(WORLD);
                        clone = RESTORE(checkpoint);
                        cloneActor = clone._unitForId(ACTOR_ID);
                        cloneTarget = clone._unitForId(TARGET_ID);
                        cloneOff = listen(clone, CLONE_OBS);
                        afterCheckpoint = { hp: TARGET.hp, damage: OBS.damage, hits: OBS.hits };
                    }
                }
                OFF();
                cloneOff?.();
                const LIVE_PROJECTILES = WORLD.projectiles.filter(
                        (projectile) => projectile.owner === ACTOR_ID && !projectile.hit,
                    ),
                    LIVE_CORN = WORLD.cornAttachments.groups.filter((group) =>
                        group.attachments.some((entry) => entry.status === 'attached'),
                    );
                return {
                    species,
                    tier,
                    context,
                    card: card && { id: card.id, rarity: card.rarity },
                    rawBase: context === 'boss-profile' ? 500 : BARE_STATS(tier, species, false).attackPower,
                    sourcePower: SOURCE_POWER,
                    proof: PROOF,
                    recordPower: RECORD.source.attackerStats.attackPower,
                    form: RECORD.form,
                    ...OBS,
                    healthLoss: TARGET_HP - TARGET.hp,
                    lateProjectiles: LIVE_PROJECTILES.length,
                    lateAttachments: LIVE_CORN.length,
                    cornKernels: RECORD.baseKernelCount ?? null,
                    cornFlights: species === 1 ? RECORD.shots.length : null,
                    lateChestnutShots: WORLD.chestnutAttacks.filter(
                        (record) => !record.cancelled && record.nextShot < record.shots.length,
                    ).length,
                    resumed: !resume
                        ? null
                        : {
                              captured: !!checkpoint,
                              originalContinuation: afterCheckpoint && TARGET.hp - afterCheckpoint.hp,
                              restoredContinuation: afterCheckpoint && cloneTarget.hp - afterCheckpoint.hp,
                              originalDamage: afterCheckpoint && OBS.damage - afterCheckpoint.damage,
                              restoredDamage: CLONE_OBS.damage,
                              originalHits: afterCheckpoint && OBS.hits - afterCheckpoint.hits,
                              restoredHits: CLONE_OBS.hits,
                          },
                };
            }
            try {
                for (const CONTEXT of ['neutral', 'attack-trait', 'boss-profile']) {
                    for (let species = 0; species < 9; species++) {
                        for (const TIER of CONTEXT === 'boss-profile' ? [1] : [4, 5, 6]) {
                            const BASE = play(species, TIER, CONTEXT, null);
                            RESULTS.push({ ...BASE, kind: 'baseline' });
                            for (let rarity = 0; rarity < 3; rarity++) {
                                for (const ID of ['attack-flat', 'attack-pct']) {
                                    const CARD = selectedCards.find((card) => card.id === ID && card.rarity === rarity),
                                        OBS = play(
                                            species,
                                            TIER,
                                            CONTEXT,
                                            CARD,
                                            CONTEXT === 'neutral' && TIER === 5 && rarity === 0 && ID === 'attack-flat',
                                        );
                                    RESULTS.push({ ...OBS, baseline: BASE.damage, baselineHits: BASE.hits, kind: ID });
                                }
                            }
                        }
                    }
                }
                return RESULTS;
            } finally {
                SET_RUN({});
            }
        },
        REPORT.cards.map(({ receipt }) => receipt.card),
    );
    const CLOSE = (actual, expected, message) =>
        assert.ok(
            Math.abs(actual - expected) <= Math.max(1e-5, Math.abs(expected) * 1e-7),
            `${message}: actual ${actual}, expected ${expected}`,
        );
    for (const ATTACK of REPORT.attacks) {
        const LABEL = `${ATTACK.context} species ${ATTACK.species} tier ${ATTACK.tier} ${ATTACK.kind}/${ATTACK.card?.rarity ?? '-'}`;
        assert.equal(ATTACK.launches, 1, `${LABEL}: one complete attack`);
        assert.ok(ATTACK.hits > 0 && ATTACK.damage > 0, `${LABEL}: actual native hits remove health`);
        CLOSE(ATTACK.damage, ATTACK.healthLoss, `${LABEL}: observed damage is actual HP loss`);
        CLOSE(ATTACK.recordPower, ATTACK.sourcePower, `${LABEL}: capture matches the live attacker`);
        assert.ok(ATTACK.proof, `${LABEL}: reconstructible attack-power provenance`);
        assert.equal(ATTACK.lateProjectiles, 0, `${LABEL}: all launched projectiles have settled`);
        assert.equal(ATTACK.lateAttachments, 0, `${LABEL}: all attached corn kernels have settled`);
        assert.equal(ATTACK.lateChestnutShots, 0, `${LABEL}: every late chestnut shot was emitted`);
        if (ATTACK.species === 1) {
            assert.ok(
                ATTACK.hits >= ATTACK.cornKernels + ATTACK.cornFlights,
                `${LABEL}: every first-cycle corn kernel actually hits`,
            );
        }
        if (ATTACK.kind !== 'baseline') {
            assert.equal(ATTACK.hits, ATTACK.baselineHits, `${LABEL}: the whole authored attack is compared`);
            const RARITY = ATTACK.card.rarity,
                FACTOR =
                    ATTACK.kind === 'attack-flat'
                        ? 1 + [2, 3.2, 5][RARITY] / ATTACK.rawBase
                        : 1 + [0.1, 0.16, 0.25][RARITY];
            CLOSE(ATTACK.damage, ATTACK.baseline * FACTOR, `${LABEL}: approved complete-attack gain`);
        }
        if (ATTACK.resumed) {
            assert.equal(ATTACK.resumed.captured, true, `${LABEL}: save captured a launched attack`);
            CLOSE(
                ATTACK.resumed.restoredContinuation,
                ATTACK.resumed.originalContinuation,
                `${LABEL}: resumed health loss`,
            );
            CLOSE(ATTACK.resumed.restoredDamage, ATTACK.resumed.originalDamage, `${LABEL}: resumed damage`);
            assert.equal(
                ATTACK.resumed.restoredHits,
                ATTACK.resumed.originalHits,
                `${LABEL}: no replayed or missing strike`,
            );
        }
    }
    for (let species = 0; species < 9; species++) {
        for (let rarity = 0; rarity < 3; rarity++) {
            for (const TIER of [4, 5, 6]) {
                const PICK = (kind) =>
                        REPORT.attacks.find(
                            (attack) =>
                                attack.context === 'neutral' &&
                                attack.species === species &&
                                attack.tier === TIER &&
                                attack.kind === kind &&
                                attack.card?.rarity === rarity,
                        ),
                    FLAT = PICK('attack-flat'),
                    PCT = PICK('attack-pct');
                assert.ok(
                    TIER === 4 ? FLAT.damage > PCT.damage : PCT.damage > FLAT.damage,
                    `species ${species}/${rarity}: fixed wins at tier4; percentage wins at tier5/6`,
                );
            }
        }
    }
    assert.deepEqual(ERRORS, [], 'no browser errors');
    REPORT.status = 'passed';
    console.log(
        JSON.stringify({
            status: REPORT.status,
            browser: REPORT.browser,
            cards: REPORT.cards.length,
            nativeAttacks: REPORT.attacks.length,
            resumed: REPORT.attacks.filter((attack) => attack.resumed).length,
        }),
    );
} finally {
    fs.writeFileSync(path.join(OUTPUT, 'report.json'), JSON.stringify(REPORT, null, 2));
    await BROWSER.close();
    SERVER.close();
}
