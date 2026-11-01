// Browser smoke test: boots the authored ES modules in headless Chromium and walks the main flows.
// The gamekit CDN requests are answered from vendor/upstream, so it runs offline. Real-device speed is not measured.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BOSS_PATTERN_CONFIG } from '../src/boss/boss-patterns.js';
import { bossStageStats } from '../src/boss/boss-rewards.js';
import { baseUnitStatsFor, setRunStatMods } from '../src/units/unit-stats.js';
import {
    advanceSince,
    freshTowerRun,
    rollCardOffers,
    rollFloorKind,
    runStatModifiers,
} from '../src/tower/tower-run.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url)),
    PORT = 8499,
    TYPES = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.svg': 'image/svg+xml' },
    RESULTS = [];
const SERVER = http
    .createServer((request, response) => {
        let url = decodeURIComponent(request.url.split('?')[0]);
        if (url.endsWith('/')) {
            url += 'index.html';
        }
        const FILE = path.join(ROOT, url);
        if (!FILE.startsWith(ROOT) || !fs.existsSync(FILE) || fs.statSync(FILE).isDirectory()) {
            response.statusCode = 404;
            return response.end();
        }
        response.setHeader('content-type', TYPES[path.extname(FILE)] || 'application/octet-stream');
        response.end(fs.readFileSync(FILE));
    })
    .listen(PORT);
const EXECUTABLE =
    process.env.CHROME_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const BROWSER = await chromium.launch({
    executablePath: EXECUTABLE,
    args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
const PAGE = await (
        await BROWSER.newContext({ viewport: { width: 1000, height: 700 }, serviceWorkers: 'block' })
    ).newPage(),
    ERRORS = [];
PAGE.on('pageerror', (error) => ERRORS.push(String(error)));
PAGE.on('console', (message) => {
    if (message.text().includes('loop stopped')) {
        ERRORS.push(message.text().slice(0, 300));
    }
});
await PAGE.route(/cdn\.jsdelivr\.net\/gh\/byh-playground\/bloom-gamekit@[0-9a-f]+\/(.*)/, (route) => {
    const FILE = path.join(
        ROOT,
        'vendor/upstream',
        route
            .request()
            .url()
            .match(/@[0-9a-f]+\/(.*)$/)[1],
    );
    if (fs.existsSync(FILE)) {
        route.fulfill({
            body: fs.readFileSync(FILE),
            contentType: 'text/javascript',
            headers: { 'access-control-allow-origin': '*' },
        });
    } else {
        route.abort();
    }
});
async function check(name, run) {
    const STARTED = Date.now();
    try {
        await run();
        RESULTS.push({ name, ok: true, ms: Date.now() - STARTED });
    } catch (error) {
        RESULTS.push({ name, ok: false, ms: Date.now() - STARTED, error: String(error.message || error) });
    }
}
function expect(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}
function landedTroopsSnapshot() {
    const W = globalThis.BUDMORI.sim,
        TROOPS = W.units.filter((unit) => !unit.isBattleOnlySummon),
        OUT = {
            inside: W.insideTower,
            count: TROOPS.length,
            landed: TROOPS.filter((unit) => unit.dropLanded && unit.z === 0).length,
            queued: W._ejectQueue.length,
            time: W.time,
        };
    // Preserve the successful observation. A later browser call can see a new
    // eating/birth hop after everyone has already finished the tower drop.
    return !OUT.inside && OUT.count > 0 && OUT.landed === OUT.count && OUT.queued === 0 ? OUT : null;
}
const WORLD = (fn, arg) => PAGE.evaluate(fn, arg);
// Install before app timers/RAF exist; real time runs normally except the explicitly stepped help scene.
await PAGE.clock.install();
await PAGE.goto(`http://127.0.0.1:${PORT}/index.html`);
await PAGE.waitForFunction(() => !!globalThis.BUDMORI && !document.getElementById('bloom-module-loading'));

await check('retreat landing observation requires all 46 troops and survives a later hop', async () => {
    const PROBE = await BROWSER.newPage();
    try {
        await PROBE.evaluate(() => {
            globalThis.BUDMORI = {
                sim: {
                    insideTower: false,
                    _ejectQueue: [],
                    time: 10,
                    units: Array.from({ length: 46 }, (_, index) => ({
                        id: index + 1,
                        dropLanded: index !== 45,
                        z: index === 45 ? 1 : 0,
                    })),
                },
            };
        });
        expect((await PROBE.evaluate(landedTroopsSnapshot)) === null, '45 of 46 troops passed');
        const WAIT = PROBE.waitForFunction(landedTroopsSnapshot, null, { timeout: 2000 });
        await PROBE.evaluate(() => {
            Object.assign(BUDMORI.sim.units[45], { dropLanded: true, z: 0 });
        });
        const OBSERVATION = await WAIT;
        // Deliberately reproduce the state change between the old wait and
        // separate WORLD read; this hop must not replace the landed observation.
        await PROBE.evaluate(() => {
            BUDMORI.sim.time += 0.05;
            BUDMORI.sim.units[45].z = 0.1;
        });
        const OUT = await OBSERVATION.jsonValue();
        await OBSERVATION.dispose();
        expect(OUT.count === 46 && OUT.landed === 46 && OUT.time === 10, JSON.stringify(OUT));
        expect((await PROBE.evaluate(landedTroopsSnapshot)) === null, 'a new airborne troop passed');
        await PROBE.evaluate(() => {
            BUDMORI.sim.units[45].z = 0;
            BUDMORI.sim._ejectQueue.push({});
        });
        expect((await PROBE.evaluate(landedTroopsSnapshot)) === null, 'queued troops passed');
    } finally {
        await PROBE.close();
    }
});

await check('new game boots with a minimal HUD', async () => {
    await PAGE.locator('#newGame').click();
    await PAGE.waitForTimeout(2000);
    const STATE = await WORLD(() => ({
        units: BUDMORI.sim.units.length,
        scene: BUDMORI.sim.scene,
        removed: [
            'zoomIn',
            'zoomOut',
            'zoomFit',
            'pauseToggle',
            'menuHome',
            'warehouseCount',
            'raid',
            'miniMap',
            'materialCount',
            'plotBar',
            'bossEncounterScreen',
        ].filter((id) => document.getElementById(id)),
        roles: [...document.querySelectorAll('.work-hud__labels span')].map((span) => span.id),
        handles: document.querySelectorAll('.work-hud__cut').length,
        challenge: document.getElementById('bossChallenge')?.textContent.trim(),
    }));
    expect(STATE.units > 0 && STATE.scene === 'farm', 'farm did not start');
    expect(STATE.removed.length === 0, `removed controls are back: ${STATE.removed}`);
    expect(STATE.handles === 1, `the role bar needs exactly one handle, has ${STATE.handles}`);
    expect(STATE.roles.length === 2, `the role labels should have two parts, has ${STATE.roles.length}`);
    expect(STATE.challenge === '탑 오르기', `challenge button reads "${STATE.challenge}"`);
});

await check('food workers hit grain piles and food is produced', async () => {
    await WORLD(() => {
        const W = BUDMORI.sim,
            POSITIONS = new globalThis.BloomGamekitDeterministic.SeededPRNG(731);
        for (let index = 0; index < 20; index++) {
            W.spawn(
                index % 9,
                1,
                (POSITIONS.nextUint32() / 4294967296 - 0.5) * 20,
                (POSITIONS.nextUint32() / 4294967296 - 0.5) * 12,
            );
        }
        W.setWorkBasisPoints(6000);
        W._nextWorkerRefreshTick = 0;
        W.refreshWorkers();
    });
    await PAGE.waitForFunction(() => BUDMORI.sim.foodTaps.produced > 0, null, { timeout: 45000 }).catch(() => {});
    const GOT = await WORLD(() => ({
        workers: BUDMORI.sim.workerCount,
        piles: BUDMORI.sim.piles.length,
        produced: BUDMORI.sim.foodTaps.produced,
    }));
    expect(GOT.workers > 0 && GOT.piles > 0, `no workers or piles ${JSON.stringify(GOT)}`);
    expect(GOT.produced > 0, `no food produced ${JSON.stringify(GOT)}`);
    const SPREAD = await WORLD(() => {
        const W = BUDMORI.sim,
            COUNTS = new Map(W.piles.map((p) => [p, 0]));
        for (const A of W._workAssign.values()) {
            COUNTS.set(A.pile, (COUNTS.get(A.pile) || 0) + 1);
        }
        const VALUES = [...COUNTS.values()];
        return {
            workers: W.workerCount,
            assigned: W._workAssign.size,
            min: Math.min(...VALUES),
            max: Math.max(...VALUES),
        };
    });
    expect(
        SPREAD.assigned === SPREAD.workers && SPREAD.max - SPREAD.min <= 1,
        `workers uneven ${JSON.stringify(SPREAD)}`,
    );
    const NEAR = await WORLD(() => {
        const W = BUDMORI.sim;
        const FOODS = W.food.filter((f) => f.phase === 'flight' || f.phase === 'grounded');
        return FOODS.length === 0 || W.piles.length === 0
            ? null
            : Math.max(...FOODS.map((f) => Math.min(...W.piles.map((p) => Math.hypot(f.tx - p.x, f.ty - p.y)))));
    });
    // Each food lands within 3.5 (x) / 2.8 (y) of its own pile; another pile may be nearer, so the nearest-pile distance is at most that.
    expect(NEAR === null || NEAR <= 4.5, `food landed ${NEAR} from the nearest pile`);
});

await check('a full field keeps the worker share', async () => {
    const GOT = await WORLD(() => {
        const W = BUDMORI.sim;
        W.setWorkBasisPoints(5000);
        const BEFORE = W.workerCount;
        W.spawnFood(0, 0, 80);
        W._nextWorkerRefreshTick = 0;
        W.refreshWorkers();
        return { before: BEFORE, full: W.warehouseFull, after: W.workerCount };
    });
    expect(GOT.full && GOT.before === GOT.after, `a full field changed the workers ${JSON.stringify(GOT)}`);
    await WORLD(() => BUDMORI.sim.setWorkBasisPoints(0));
});

await check('breeding weights split the breeders between species', async () => {
    const GOT = await WORLD(() => {
        const W = BUDMORI.sim;
        for (let i = 0; i < 8; i++) {
            for (const SPECIES of [0, 1]) {
                const U = W.spawn(SPECIES, 1, i, SPECIES);
                U.growthElapsed = U.growthDuration;
            }
        }
        W.setWorkBasisPoints(5000);
        W.setBreedWeights([0, 1]);
        W._nextWorkerRefreshTick = 0;
        W.refreshWorkers();
        const WORKERS = (species) => W.units.filter((u) => u.species === species && W.isWorker(u)).length;
        const OUT = { pea: WORKERS(0), corn: WORKERS(1) };
        W.setBreedWeights(null);
        W.setWorkBasisPoints(0);
        return OUT;
    });
    expect(GOT.pea >= 8 && GOT.corn < GOT.pea, `weights did not apply ${JSON.stringify(GOT)}`);
});

await check('units eat, breed and the farm stays under its capacity', async () => {
    const STARTED = await WORLD(() => ({ time: BUDMORI.sim.time, tick: BUDMORI.sim.simulationTick }));
    await WORLD(() => {
        const W = BUDMORI.sim;
        for (let round = 0; round < 40; round++) {
            W.spawnFood((round % 8) - 4, Math.floor(round / 8) - 2, 1);
        }
    });
    await PAGE.waitForFunction(() => BUDMORI.sim.metrics.births > 0, null, { timeout: 60000 }).catch(() => {});
    const GOT = await WORLD(() => ({
        births: BUDMORI.sim.metrics.births,
        owned: BUDMORI.sim.ownedPopulation,
        capacity: BUDMORI.sim.capacity,
        time: BUDMORI.sim.time,
        tick: BUDMORI.sim.simulationTick,
        fed: BUDMORI.sim.units.filter((unit) => unit.fed).length,
        food: BUDMORI.sim.food.length,
    }));
    console.log(
        'OBS farm births',
        JSON.stringify({
            ...GOT,
            elapsedSimulationSeconds: GOT.time - STARTED.time,
            elapsedTicks: GOT.tick - STARTED.tick,
        }),
    );
    expect(GOT.births > 0, `no births ${JSON.stringify(GOT)}`);
    expect(GOT.owned <= GOT.capacity, `over capacity ${JSON.stringify(GOT)}`);
});

await check('challenge button starts a boss fight and retreat ends it', async () => {
    // A second species, so there is an order to set.
    await WORLD(() => {
        BUDMORI.sim.spawn(1, 1, 3, 3);
        BUDMORI.sim.spawn(1, 1, -3, 3);
    });
    await PAGE.locator('#bossChallenge').click();
    // With more than one species the climb starts from the deck dialog: swap the first two cards, then go.
    const DECK = await WORLD(() => ({
        open: !document.getElementById('deckDialog').hidden,
        cards: document.querySelectorAll('#deckCards [data-deploy]').length,
    }));
    expect(DECK.open && DECK.cards >= 2, `deck dialog not shown ${JSON.stringify(DECK)}`);
    const SWAP = await WORLD(() => {
        const CARDS = [...document.querySelectorAll('#deckCards [data-deploy]')],
            FIRST = Number(CARDS[0].dataset.deploy),
            SECOND = Number(CARDS[1].dataset.deploy);
        CARDS[0].click();
        document.querySelectorAll('#deckCards [data-deploy]')[1].click();
        return {
            FIRST,
            SECOND,
            now: [...document.querySelectorAll('#deckCards [data-deploy]')].map((c) => Number(c.dataset.deploy)),
        };
    });
    expect(SWAP.now[0] === SWAP.SECOND && SWAP.now[1] === SWAP.FIRST, `swap failed ${JSON.stringify(SWAP)}`);
    await PAGE.locator('#deckGo').click();
    const SET = await WORLD(() => BUDMORI.sim.deployOrder[0]);
    expect(SET === SWAP.SECOND, `deck order not applied (${SET})`);
    // The troops walk to the tower door first, then the floor begins inside.
    const MARCH = await WORLD(() => ({ phase: BUDMORI.sim.farmBossEvent.phase, inside: BUDMORI.sim.insideTower }));
    expect(MARCH.phase === 'marching' && !MARCH.inside, `no march at the start ${JSON.stringify(MARCH)}`);
    await PAGE.waitForFunction(() => BUDMORI.sim.insideTower && BUDMORI.sim.farmBossEvent.phase !== 'marching', null, {
        timeout: 15000,
    });
    const FIGHTING = await WORLD(() => BUDMORI.sim.farmBossEvent.phase);
    expect(FIGHTING !== 'idle', `fight did not start (${FIGHTING})`);
    const WAITING = await WORLD(() => ({
        waiting: BUDMORI.sim.reserveCounts.size,
        field: BUDMORI.sim.fieldFighterCount,
        status: document.getElementById('frontlineStatus').textContent,
    }));
    expect(WAITING.status.includes('예비대'), `frontline status not shown (${JSON.stringify(WAITING)})`);
    // Nobody is placed by hand: the whole army walks in on its own from around the hall.
    await PAGE.waitForTimeout(2500);
    const AUTO = await WORLD(() => {
        const W = BUDMORI.sim,
            FIELD = W.units.filter((u) => u.faction === 'player' && !u.isBattleOnlySummon);
        return {
            field: W.fieldFighterCount,
            waiting: [...W.reserveCounts.values()].reduce((a, b) => a + b, 0),
            sides: new Set(FIELD.map((u) => Math.sign(Math.round(u.x)) + ':' + Math.sign(Math.round(u.y)))).size,
        };
    });
    expect(AUTO.field >= 3, `army was not sent in by itself ${JSON.stringify(AUTO)}`);
    // Contact takes longer in the expanded hall. Observe actual combat rather
    // than treating a fixed delay after deployment as proof that a hit happened.
    await PAGE.waitForFunction(() => BUDMORI.combatFeel.counts.numbers > 0, null, { timeout: 15000 });
    // A hit is drawn where and when it happens (the effect's time is in the same ms as the display clock), and every
    // hit that did damage has its own number.
    const FEEL = await WORLD(() => {
        const FEEL_LOCAL = BUDMORI.combatFeel,
            NOW = BUDMORI.renderer?.displayTimeMs ?? 0;
        return {
            numbers: FEEL_LOCAL.counts.numbers,
            hits: FEEL_LOCAL.counts.hits,
            ages: FEEL_LOCAL.effects.map((effect) => NOW - effect.at),
        };
    });
    expect(FEEL.numbers > 0 && FEEL.numbers <= FEEL.hits + 5, `damage numbers ${JSON.stringify(FEEL)}`);
    expect(
        FEEL.ages.every((age) => age > -1000 && age < 1500),
        `effect times are off the display clock ${JSON.stringify(FEEL.ages)}`,
    );
    const RAGE = await WORLD(() => {
        const W = BUDMORI.sim,
            FULL = W.boss.maxHp;
        W.boss.hp = FULL;
        const EARLY = W.eligibleBossPatterns(W.livingBossTargets());
        const P1 = W.bossPhase,
            LIMIT = W.battleTimeLimit();
        W.boss.hp = FULL * 0.3;
        const P5 = W.bossPhase;
        W.boss.hp = FULL;
        const CALM = W.bossEnraged;
        W.farmBossEvent.elapsed = LIMIT + 1;
        const ANGRY = W.bossEnraged,
            PHASE = W.farmBossEvent.phase;
        W.farmBossEvent.elapsed = 0;
        return { EARLY, P1, P5, CALM, ANGRY, PHASE };
    });
    expect(RAGE.P1 === 1 && RAGE.P5 === 5, `phases ${RAGE.P1}/${RAGE.P5}`);
    expect(
        !RAGE.EARLY.some((id) => ['attack.sweep-360', 'attack.leap-slam', 'summon.mouth-t1'].includes(id)),
        `locked pattern eligible at full HP: ${RAGE.EARLY}`,
    );
    expect(!RAGE.CALM && RAGE.ANGRY && RAGE.PHASE === 'fighting', `enrage ${JSON.stringify(RAGE)}`);
    await WORLD(() => BUDMORI.sim.retreatFromFight());
    await PAGE.waitForTimeout(6000);
    const AFTER = await WORLD(() => BUDMORI.sim.farmBossEvent.phase);
    expect(AFTER === 'idle', `fight did not end (${AFTER})`);
    // The troops drop out one after another and bounce on landing: wait until every one is on the ground.
    const LANDED = await PAGE.waitForFunction(landedTroopsSnapshot, null, { timeout: 8000 });
    const OUT = await LANDED.jsonValue();
    await LANDED.dispose();
    expect(!OUT.inside && OUT.count > 0, `still inside the tower ${JSON.stringify(OUT)}`);
    expect(OUT.landed === OUT.count && OUT.queued === 0, `troops did not all land ${JSON.stringify(OUT)}`);
});

await check('tower: floors, doors, sleep, rest, mid-boss and best floor', async () => {
    await PAGE.locator('#bossChallenge').click();
    if (await PAGE.locator('#deckGo').isVisible()) {
        await PAGE.locator('#deckGo').click();
    }
    await PAGE.waitForFunction(() => BUDMORI.sim.insideTower && BUDMORI.sim.farmBossEvent.phase === 'fighting', null, {
        timeout: 15000,
    });
    const CLEAR_FLOOR = () =>
        WORLD(() => {
            const W = BUDMORI.sim;
            W.deployUnit([...W.reserveCounts.keys()][0], 0, 0);
            const FALLEN = W.units.find((u) => !u.isBattleOnlySummon && u.hp > 0);
            if (FALLEN) {
                FALLEN.hp = 0;
            }
            W.boss.hp = 0;
        });
    const REWARDS_AND_DOORS = async () => {
        await PAGE.waitForFunction(() => {
            const W = BUDMORI.sim;
            return W.tower.active && W.farmBossEvent.phase === 'idle' && W.tower.doors.length > 0;
        });
        // The product reveals earned boxes before offering the next floor. Observe that real flow;
        // a fixed post-kill delay can see valid doors while their reward dialog still owns the screen.
        await PAGE.waitForFunction(() => {
            const RECEIPT = [...BUDMORI.sim.bossRewardReceipts]
                .reverse()
                .find((reward) => ['calculating', 'ready'].includes(reward.status));
            return !RECEIPT || (RECEIPT.status === 'ready' && RECEIPT.revealedCount >= RECEIPT.boxCount);
        });
        if (await PAGE.locator('#bossRewardDialog').isVisible()) {
            try {
                await PAGE.locator('#bossRewardClose').click({ timeout: 2000 });
            } catch (error) {
                // Fully revealed rewards may auto-close between observation and the pointer click.
                // Accept that product path only when the expected next-floor panel is already visible.
                const AUTO_CLOSED = await WORLD(
                    () =>
                        document.getElementById('bossRewardDialog').hidden &&
                        !document.getElementById('towerDoors').hidden,
                );
                if (!AUTO_CLOSED) {
                    throw error;
                }
            }
        }
        await PAGE.locator('#towerDoors').waitFor({ state: 'visible' });
        // The next choice is accepted only after the boss's card draw finishes.
        await PAGE.waitForFunction(() => BUDMORI.sim.time >= (BUDMORI.sim.tower.bossCardDraw?.until || 0));
    };
    await CLEAR_FLOOR();
    await REWARDS_AND_DOORS();
    const ONE = await WORLD(() => {
        const W = BUDMORI.sim;
        return {
            active: W.tower.active,
            floor: W.tower.floor,
            doors: W.tower.doors.length,
            downed: W.tower.downed.size,
            best: W.playerProgression.towerBest,
            record: W.tower.record,
            onField: W.units.filter((u) => !u.isBattleOnlySummon).length,
            panel: !document.getElementById('towerDoors').hidden,
            rail: document.getElementById('floorNow')?.textContent || '',
        };
    });
    expect(
        ONE.active && ONE.floor === 1 && ONE.doors >= 1 && ONE.best === 1 && ONE.record,
        `floor 1 ${JSON.stringify(ONE)}`,
    );
    expect(ONE.downed === 1 && ONE.onField === 0, `downed/hand ${JSON.stringify(ONE)}`);
    expect(ONE.panel && /^1층/.test(ONE.rail), `tower UI ${JSON.stringify(ONE)}`);
    const CARD = await WORLD(() => {
        const W = BUDMORI.sim;
        W.tower.nextKind = 'power';
        W.tower.doors = [
            { type: 'stat', id: 'attack-pct', rarity: 0 },
            { type: 'skill', id: 'lightning' },
        ];
        W.chooseDoor(0);
        return {
            floor: W.tower.floor,
            kind: W.tower.kind,
            cards: W.tower.cards.length,
            doors: W.tower.doors.length,
            best: W.playerProgression.towerBest,
        };
    });
    // A strengthening floor is a floor: it counts as reached without a fight.
    expect(
        CARD.floor === 2 && CARD.kind === 'power' && CARD.cards === 1 && CARD.doors >= 1 && CARD.best === 2,
        `stat card ${JSON.stringify(CARD)}`,
    );
    const SKILL = await WORLD(() => {
        const W = BUDMORI.sim;
        const FINISH_DRAW = () => {
            for (let tick = 0; tick < 60 && W.time < (W.tower.bossCardDraw?.until || 0); tick++) {
                W.step(1 / 20);
            }
        };
        FINISH_DRAW();
        W.tower.nextKind = 'power';
        W.tower.doors = [{ type: 'skill', id: 'lightning' }];
        W.chooseDoor(0);
        const FIRST = W.tower.relics.get('lightning');
        FINISH_DRAW();
        W.tower.nextKind = 'power';
        W.tower.doors = [{ type: 'skill', id: 'lightning' }];
        W.chooseDoor(0);
        return { first: FIRST, second: W.tower.relics.get('lightning'), kind: W.tower.kind };
    });
    expect(SKILL.first === 1 && SKILL.second === 2 && SKILL.kind === 'power', `skill card ${JSON.stringify(SKILL)}`);
    const MID = await WORLD(() => {
        const W = BUDMORI.sim;
        W.tower.floor = 4;
        return {
            doors: W._rollDoors()
                .map((door) => door.kind)
                .join(),
            next: W.tower.nextKind,
        };
    });
    expect(MID.doors === 'mid' && MID.next === 'mid', `floor 5 doors: ${JSON.stringify(MID)}`);
    await PAGE.waitForFunction(() => BUDMORI.sim.time >= (BUDMORI.sim.tower.bossCardDraw?.until || 0));
    await WORLD(() => {
        const W = BUDMORI.sim;
        W.tower.floor = 2;
        W.tower.nextKind = 'battle';
        W.tower.doors = [{ type: 'fight', kind: 'battle' }];
        // A boss may legitimately acquire this card on a power floor. Keep a
        // boss skill in this fixture so role separation is always exercised.
        W.tower.bossRelics.set('giant', 1);
        W.chooseDoor(0);
    });
    await PAGE.waitForTimeout(3500);
    const SLOT = await WORLD(() => {
        const W = BUDMORI.sim;
        W.formationSkills.update(0.05);
        const KEY = (slot) => `${slot.id}:${slot.level}`;
        return {
            player: W.formationSkills.slots
                .filter((slot) => !slot.role || slot.role === 'player')
                .map(KEY)
                .sort(),
            boss: W.formationSkills.slots
                .filter((slot) => slot.role === 'boss')
                .map(KEY)
                .sort(),
            expectedBoss: [...W.tower.bossRelics].map(([id, level]) => `${id}:${level}`).sort(),
            total: W.formationSkills.slots.length,
        };
    });
    expect(SLOT.player.join() === 'lightning:2', `player relic skill in fight: ${JSON.stringify(SLOT)}`);
    expect(
        SLOT.boss.includes('giant:1') &&
            JSON.stringify(SLOT.boss) === JSON.stringify(SLOT.expectedBoss) &&
            SLOT.total === SLOT.player.length + SLOT.boss.length,
        `boss relic skills and roles in fight: ${JSON.stringify(SLOT)}`,
    );
    await CLEAR_FLOOR();
    await REWARDS_AND_DOORS();
    const THREE = await WORLD(() => ({
        floor: BUDMORI.sim.tower.floor,
        best: BUDMORI.sim.playerProgression.towerBest,
    }));
    // The test moved the floor back to 2 after the card floors had already raised the best to 4.
    expect(THREE.floor === 3 && THREE.best === 4, `floor 3 ${JSON.stringify(THREE)}`);
    const LEFT = await WORLD(() => {
        const W = BUDMORI.sim;
        W.leaveTower();
        return { active: W.tower.active, units: W.unitCollection.items.filter((u) => !u.isBattleOnlySummon).length };
    });
    expect(!LEFT.active && LEFT.units > 0, `leave ${JSON.stringify(LEFT)}`);
});

await check(
    'a seed species the farm lacks joins as a pair of seeds on its first win, even below the best floor',
    async () => {
        const R = await WORLD(async () => {
            const { Garden: GARDEN } = await import('./src/model/farm-model.js');
            const W = new GARDEN(731);
            W._flushEjected();
            for (const U of [...W.units]) {
                W.removeUnit(U);
            }
            for (let i = 0; i < 6; i++) {
                W.spawn(0, 1, i * 0.4, 0);
            }
            W.playerProgression.towerBest = 50;
            W.startTower(1);
            const TICK = () => {
                W.step(1 / 30);
                W.advanceWork(1 / 30);
            };
            for (let i = 0; i < 40; i++) {
                TICK();
            }
            W.finishMarch();
            for (let i = 0; i < 10; i++) {
                TICK();
            }
            W.boss.hp = 0;
            for (let i = 0; i < 400; i++) {
                TICK();
            }
            const RECEIPT = W.bossRewardReceipts.at(-1);
            return {
                record: W.tower.record,
                first: RECEIPT?.firstClear,
                status: RECEIPT?.status,
                bossSpecies: W.bosses[0].species,
                species: RECEIPT?.species,
                seeds: W.unitCollection.items.filter(
                    (u) => !u.isBattleOnlySummon && u.seedling?.heritage === RECEIPT?.species,
                ).length,
            };
        });
        expect(
            R.bossSpecies === 9 && R.record === false && R.first === true && R.seeds === 2,
            `first win ${JSON.stringify(R)}`,
        );
    },
);
await check('stat cards scale the base at every tier, and clearing them restores the base', async () => {
    const ATTACK = () => baseUnitStatsFor(1, 0).attackPower,
        HP = () => baseUnitStatsFor(1, 0).maxHp,
        BEFORE = [ATTACK(), HP(), baseUnitStatsFor(1, 0).armor];
    setRunStatMods(
        runStatModifiers([
            { id: 'attack-flat', rarity: 0 },
            { id: 'attack-pct', rarity: 0 },
            { id: 'attack-pct', rarity: 1 },
            { id: 'regen-pct', rarity: 0 },
            { id: 'armor-flat', rarity: 2 },
        ]),
    );
    const DURING = baseUnitStatsFor(1, 0);
    setRunStatMods({});
    expect(
        Math.abs(DURING.attackPower - BEFORE[0] * 1.1 * (1 + 0.1 + 0.16)) < 1e-9 &&
            DURING.armor === BEFORE[2] + 25 &&
            Math.abs(DURING.regen - BEFORE[1] * 0.005) < 1e-9 &&
            DURING.maxHp === BEFORE[1],
        JSON.stringify(DURING),
    );
    expect(ATTACK() === BEFORE[0] && HP() === BEFORE[1], 'cleared');
});
await check(
    'the next floor kind is drawn by weight: about one fight in five, never a long gap, never an event',
    async () => {
        let seed = 7;
        const RANDOM = () => {
                seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
                return seed / 4294967296;
            },
            COUNT = { battle: 0, power: 0, event: 0, mid: 0 };
        let since = freshTowerRun().since,
            gap = 0,
            worst = 0;
        for (let floor = 2; floor < 20000; floor++) {
            const KIND = rollFloorKind({ floor, since, random: RANDOM, midBossEvery: 5, topFloor: 1e9 });
            COUNT[KIND]++;
            since = advanceSince(since, KIND);
            gap = KIND === 'battle' || KIND === 'mid' ? 0 : gap + 1;
            worst = Math.max(worst, gap);
        }
        const SHARE = COUNT.battle / (COUNT.battle + COUNT.power);
        expect(
            SHARE > 0.17 && SHARE < 0.25 && COUNT.event === 0 && worst <= 4,
            JSON.stringify({ COUNT, SHARE, worst }),
        );
        expect(
            rollFloorKind({ floor: 61, since, random: RANDOM, midBossEvery: 5, topFloor: 61 }) === 'battle',
            'top floor',
        );
    },
);
await check('a strengthening floor offers three different cards, stat : passive : skill about 8 : 1 : 1', async () => {
    let seed = 11;
    const RANDOM = () => {
            seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
            return seed / 4294967296;
        },
        OFFER = (cards, passiveIds = ['p1', 'p2', 'p3']) =>
            rollCardOffers({
                floor: 3,
                cards,
                relics: new Map(),
                skillIds: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'],
                passiveIds,
                relicSlots: 3,
                relicMaxLevel: 5,
                random: RANDOM,
            }),
        COUNT = { stat: 0, passive: 0, skill: 0 };
    let slots = 0;
    for (let index = 0; index < 20000; index++) {
        const OFFERS = OFFER([]);
        expect(OFFERS.length === 3 && new Set(OFFERS.map((offer) => offer.id)).size === 3, JSON.stringify(OFFERS));
        for (const OFFER_CARD of OFFERS) {
            COUNT[OFFER_CARD.type]++;
            slots++;
        }
    }
    expect(
        Math.abs(COUNT.stat / slots - 0.8) < 0.03 &&
            Math.abs(COUNT.passive / slots - 0.1) < 0.03 &&
            Math.abs(COUNT.skill / slots - 0.1) < 0.03,
        JSON.stringify(COUNT),
    );
    const CAPPED = Array.from({ length: 10 }, () => ({ id: 'attack-pct', rarity: 0 }));
    expect(
        OFFER(CAPPED).every((offer) => offer.id !== 'attack-pct'),
        'a card at its cap is not offered',
    );
    expect(OFFER([], []).length === 3, 'three cards even with no passives to offer');
});

await check('upgrade menu opens on the farm panel without ability tabs', async () => {
    await WORLD(() => document.getElementById('upgradeMenu').click());
    await PAGE.waitForTimeout(800);
    const MENU = await WORLD(() => ({
        farm: !document.getElementById('farmPanel').hidden,
        abilityPanel: !!document.getElementById('abilityPanel'),
        tabs: !!document.getElementById('gameMenuTabs'),
    }));
    expect(MENU.farm && !MENU.abilityPanel && !MENU.tabs, `menu ${JSON.stringify(MENU)}`);
    await PAGE.locator('#gameMenuClose').click();
    await PAGE.waitForTimeout(300);
});

await check('progress survives a reload', async () => {
    await WORLD(() => {
        BUDMORI.sim.playerProgression.towerBest = 4;
        BUDMORI.sim.markProgressChanged();
    });
    await PAGE.waitForTimeout(3000);
    let release;
    const GATE = new Promise((resolve) => {
        release = resolve;
    });
    const HOLD = async (route) => {
        await GATE;
        return route.continue();
    };
    await PAGE.route('**/src/farm-app.js', HOLD);
    try {
        const REQUESTED = PAGE.waitForRequest('**/src/farm-app.js');
        await PAGE.reload({ waitUntil: 'commit' });
        await REQUESTED;
        // Reproduce a load longer than the old four-second assumption.
        await PAGE.waitForTimeout(4100);
        expect(await WORLD(() => !globalThis.BUDMORI), 'delayed initialization was not held');
        expect(await PAGE.locator('#bloom-module-loading').isVisible(), 'loading UI missing during reload');
        release();
        await PAGE.waitForFunction(() => !!globalThis.BUDMORI && !document.getElementById('bloom-module-loading'));
    } finally {
        release();
        await PAGE.unroute('**/src/farm-app.js', HOLD);
    }
    const STAGE = await WORLD(() => BUDMORI.sim.playerProgression.towerBest);
    expect(STAGE >= 4, `best floor after reload is ${STAGE}`);
});

await check('help cards play the real game in an isolated frame and leave the save alone', async () => {
    const BEFORE = await WORLD(() => JSON.stringify(Object.entries(localStorage).sort()));
    await PAGE.locator('#helpMenu').click();
    let frameObservation;
    try {
        await PAGE.locator('#helpTabs button').nth(1).click();
        // Boot the real iframe in real time first: accelerating its loading timeout would race network/asset work.
        await PAGE.waitForFunction(
            () => document.querySelector('#helpDemo iframe')?.contentWindow.__budmoriHelp,
            null,
            {
                timeout: 15000,
            },
        );
        const HELP_OBSERVATION = () => {
            const SNAP = document.querySelector('#helpDemo iframe')?.contentWindow.__budmoriHelp?.snapshot(),
                CAPTION = document.getElementById('helpCaption').textContent;
            return {
                step: SNAP?.step,
                state: SNAP?.state,
                caption: CAPTION,
                tabs: document.querySelectorAll('#helpTabs button').length,
                complete: SNAP?.step === 'done' && CAPTION.includes('한 등급 위가 됐어요'),
            };
        };
        await PAGE.clock.pauseAt(await WORLD(() => Date.now() + 1000));
        try {
            // Each 50ms chunk runs every scheduled native app RAF/timer. Never call world.step or skip the merge path.
            // Read caption and model snapshot in one observation, before the product's automatic replay can remount it.
            frameObservation = await WORLD(HELP_OBSERVATION);
            for (let elapsed = 0; !frameObservation.complete && elapsed < 6000; elapsed += 50) {
                await PAGE.clock.runFor(50);
                frameObservation = await WORLD(HELP_OBSERVATION);
            }
        } finally {
            await PAGE.clock.resume();
        }
        expect(
            frameObservation.complete,
            `help replay did not finish through its native clock ${JSON.stringify(frameObservation)}`,
        );
        expect(
            frameObservation.step === 'done' && frameObservation.tabs === 3,
            `help card state ${JSON.stringify(frameObservation)}`,
        );
    } finally {
        if (!PAGE.isClosed()) {
            await PAGE.clock.resume();
            if (await PAGE.locator('#gameMenuClose').isVisible()) {
                await PAGE.locator('#gameMenuClose').click();
            }
        }
    }
    expect((await PAGE.locator('#helpDemo iframe').count()) === 0, 'the help frame stays mounted after the tab closes');
    const AFTER = await WORLD(() => JSON.stringify(Object.entries(localStorage).sort()));
    const KEYS = (text) => JSON.parse(text).map(([key]) => key);
    expect(KEYS(BEFORE).join() === KEYS(AFTER).join(), 'a help frame changed the stored keys');
});

await check('a full farm keeps queued rewards and the panel shows them as one sprout count, no species', async () => {
    await WORLD(() => document.getElementById('upgradeMenu').click());
    await WORLD(() => {
        const W = BUDMORI.sim;
        window.__queueInventoryBefore = structuredClone(W.bossRewardInventory);
        window.__fillers = [];
        while (W.freeRoom() > 0) {
            window.__fillers.push(W.spawn(0, 1, 0, 0));
        }
        W.bossRewardInventory = [
            { species: 0, tier: 1, count: 3 },
            { species: 2, tier: 1, count: 5 },
        ];
        W.markProgressChanged();
    });
    let got;
    try {
        await PAGE.waitForFunction(() => document.querySelectorAll('#farmQueue .farm-queue__chip').length === 1, null, {
            timeout: 5000,
        });
        got = await WORLD(() => {
            const W = BUDMORI.sim,
                CHIPS = [...document.querySelectorAll('#farmQueue .farm-queue__chip b')].map((b) => b.textContent);
            return { free: W.freeRoom(), owned: W.ownedPopulation, capacity: W.capacity, CHIPS };
        });
    } finally {
        if (!PAGE.isClosed()) {
            // Synthetic queued counts must never leak into a later native reward settlement if this UI check fails.
            await WORLD(() => {
                const W = BUDMORI.sim;
                W.bossRewardInventory = window.__queueInventoryBefore;
                for (const UNIT of window.__fillers) {
                    W.removeUnit(UNIT);
                }
                delete window.__queueInventoryBefore;
                delete window.__fillers;
                W.markProgressChanged();
            });
            if (await PAGE.locator('#gameMenuClose').isVisible()) {
                await PAGE.locator('#gameMenuClose').click();
            }
        }
    }
    expect(got.free === 0, `room ${JSON.stringify(got)}`);
    expect(got.CHIPS.join() === '8', `queue chips ${JSON.stringify(got)}`);
});

await check('a boss attack hits everyone it reaches: 35% each and 65% shared among those hit', async () => {
    const R = await WORLD(() => {
        const W = BUDMORI.sim;
        W._flushEjected();
        for (const U of [...W.units]) {
            W.removeUnit(U);
        }
        for (let i = 0; i < 20; i++) {
            W.spawn(0, 1, i * 0.1, 0);
        }
        W.playerProgression.towerBest = 50;
        W.startTower(1);
        for (let i = 0; i < 40; i++) {
            W.step(1 / 30);
        }
        W.finishMarch();
        for (let i = 0; i < 10; i++) {
            W.step(1 / 30);
        }
        const ID = 'attack.sweep-360',
            UNITS = W.unitCollection.items.filter((u) => !u.isBattleOnlySummon && u.hp > 0).slice(0, 12),
            HIT = (units) => {
                W.boss.patternRuntime.active = { id: ID, hitIds: new Set() };
                const BEFORE = units.map((u) => {
                    u.z = 0;
                    u.dropLanded = true;
                    u.hp = u.maxHp ?? u.hp;
                    return u.hp;
                });
                for (const U of units) {
                    W.hitBossPatternUnit(U, ID, { x: U.x, y: U.y });
                }
                W._settleBossHits();
                return units.map((u, i) => BEFORE[i] - u.hp);
            };
        const ALONE = HIT(UNITS.slice(0, 1))[0],
            CROWD = HIT(UNITS);
        W.boss.patternRuntime.active = null;
        W.retreatFromFight();
        for (let i = 0; i < 60; i++) {
            W.step(1 / 30);
        }
        W._flushEjected();
        return { ALONE, CROWD };
    });
    expect(R.ALONE > 0, `a lone unit is hurt ${JSON.stringify(R)}`);
    expect(R.CROWD.length === 12 && R.CROWD.every((x) => x > 0), `everyone is hurt ${JSON.stringify(R)}`);
    // 12 hit: 35% + 65% / 12 = 40.4% of what a lone unit takes, the same for every one of them.
    expect(
        R.CROWD.every((x) => Math.abs(x - R.CROWD[0]) < 1e-6 && x < R.ALONE * 0.5 && x > R.ALONE * 0.3),
        `crowd share ${JSON.stringify(R)}`,
    );
});

await check('each element band picks its own signature skill, and element damage follows the cycle', async () => {
    const R = await WORLD(() => {
        const W = BUDMORI.sim;
        W._flushEjected();
        for (const U of [...W.units]) {
            W.removeUnit(U);
        }
        for (let i = 0; i < 6; i++) {
            W.spawn(0, 1, i * 0.5, 0);
        }
        W.playerProgression.towerBest = 50;
        W.startTower(1);
        for (let i = 0; i < 40; i++) {
            W.step(1 / 30);
        }
        W.finishMarch();
        for (let i = 0; i < 30; i++) {
            W.step(1 / 30);
        }
        const PICKS = [1, 21, 41, 61, 81].map((floor) => {
            W.tower.floor = floor;
            for (const ID of Object.keys(W.boss.patternRuntime.cooldowns)) {
                W.boss.patternRuntime.cooldowns[ID] = 0;
            }
            for (const U of W.unitCollection.items.filter((u) => !u.isBattleOnlySummon && u.hp > 0)) {
                U.x = W.boss.x + 3;
                U.y = W.boss.y;
                U.z = 0;
                U.dropLanded = true;
            }
            return W.eligibleBossPatterns(W.livingBossTargets(), null, W.boss).filter((id) =>
                id.startsWith('signature.'),
            );
        });
        // A water boss (floor 1) against a plain, a fire (beaten by water), a water (even) and a lightning (beats water) unit.
        W.tower.floor = 1;
        const ID = 'signature.water',
            LOSS = (genes) => {
                const U = W.unitCollection.items.filter((u) => !u.isBattleOnlySummon && u.hp > 0)[0];
                U.genes = genes;
                U.z = 0;
                U.dropLanded = true;
                U.hp = U.maxHp;
                W.boss.patternRuntime.active = { id: ID, hitIds: new Set() };
                const BEFORE = U.hp;
                W.hitBossPatternUnit(U, ID, { x: U.x, y: U.y });
                W._settleBossHits();
                return BEFORE - U.hp;
            },
            PLAIN = LOSS([0, 0]),
            FIRE = LOSS([1, 1]),
            WATER = LOSS([5, 5]),
            LIGHTNING = LOSS([4, 4]);
        W.boss.patternRuntime.active = null;
        W.retreatFromFight();
        for (let i = 0; i < 60; i++) {
            W.step(1 / 30);
        }
        W._flushEjected();
        return { PICKS, PLAIN, FIRE, WATER, LIGHTNING };
    });
    expect(
        JSON.stringify(R.PICKS) ===
            JSON.stringify([
                ['signature.water'],
                ['signature.grass'],
                ['signature.fire'],
                ['signature.ice'],
                ['signature.lightning'],
            ]),
        `one signature skill per band ${JSON.stringify(R.PICKS)}`,
    );
    const NEAR = (value, expected) => Math.abs(value / R.WATER - expected) < 0.06;
    expect(
        R.WATER > 0 && NEAR(R.PLAIN, 1.5) && NEAR(R.FIRE, 2) && NEAR(R.LIGHTNING, 0.5),
        `plain 150%, beaten 200%, even 100%, beating 50% ${JSON.stringify(R)}`,
    );
});

await check('each element signature skill is telegraphed and drawn with its own effect in the real game', async () => {
    const BANDS = [
        ['water', 1],
        ['grass', 21],
        ['fire', 41],
        ['ice', 61],
        ['lightning', 81],
    ];
    await WORLD(async () => {
        // Count what the renderer really draws per element, then call the original drawing.
        const MODULE = await import('/src/features/boss-patterns/signature/presentation.js');
        globalThis.__sigDraws = { telegraph: {}, effect: {} };
        const COUNT = (kind, element) => {
            globalThis.__sigDraws[kind][element] = (globalThis.__sigDraws[kind][element] ?? 0) + 1;
        };
        const TELEGRAPH = MODULE.SignaturePresentation.prototype.drawTelegraph,
            EFFECT = MODULE.SignatureEffectPresentation.prototype.draw;
        MODULE.SignaturePresentation.prototype.drawTelegraph = function (renderer, area) {
            COUNT('telegraph', this.config.element);
            return TELEGRAPH.call(this, renderer, area);
        };
        MODULE.SignatureEffectPresentation.prototype.draw = function (renderer, event, progress) {
            COUNT('effect', event.element);
            return EFFECT.call(this, renderer, event, progress);
        };
    });
    for (const [NAME, FLOOR] of BANDS) {
        const ELEMENT = BOSS_PATTERN_CONFIG[`signature.${NAME}`].element;
        await WORLD(
            ([id, band]) => {
                const W = BUDMORI.sim;
                W._flushEjected();
                for (const U of [...W.units]) {
                    W.removeUnit(U);
                }
                for (let i = 0; i < 9; i++) {
                    W.spawn(0, 3, i * 0.4, 0);
                }
                W.playerProgression.towerBest = 150;
                W.startTower(Math.min(band, 80));
                W.tower.floor = band;
                W.finishMarch();
                const BOSS = W.boss;
                BOSS.hp = BOSS.maxHp = 1e9;
                for (const U of W.units) {
                    if (U.faction !== 'enemy') {
                        U.hp = U.maxHp = 1e7;
                    }
                }
                // Only the skill under test may be chosen.
                for (const SKILL of Object.keys(BOSS.patternRuntime.cooldowns)) {
                    BOSS.patternRuntime.cooldowns[SKILL] = SKILL === `signature.${id}` ? 0 : 1e6;
                }
            },
            [NAME, FLOOR],
        );
        const STATE = () =>
            WORLD(() => ({
                scene: BUDMORI.sim.scene,
                mode: BUDMORI.sim.battleCommand,
                active: BUDMORI.sim.boss?.patternRuntime?.active?.id,
                draws: globalThis.__sigDraws,
                paused: BUDMORI.runtime?.paused,
            }));
        await PAGE.waitForFunction(
            (element) => {
                const D = globalThis.__sigDraws;
                return D.telegraph[element] > 0 && D.effect[element] > 0;
            },
            ELEMENT,
            { timeout: 20000 },
        ).catch(async (error) => {
            throw new Error(`${NAME}: ${error.message.split('\n')[0]} ${JSON.stringify(await STATE())}`);
        });
        await WORLD(() => {
            const W = BUDMORI.sim;
            W.retreatFromFight();
            for (let i = 0; i < 60; i++) {
                W.step(1 / 30);
            }
            W._flushEjected();
        });
    }
});

await check(
    'boss sweeps start at the body: both arms sweep the whole circle, the fan sweeps its sector, nothing near the body is missed',
    async () => {
        const R = await WORLD(() => {
            const W = BUDMORI.sim;
            W._flushEjected();
            for (const U of [...W.units]) {
                W.removeUnit(U);
            }
            for (let i = 0; i < 12; i++) {
                W.spawn(0, 1, i * 0.1, 0);
            }
            W.playerProgression.towerBest = 50;
            W.startTower(1);
            for (let i = 0; i < 40; i++) {
                W.step(1 / 30);
            }
            W.finishMarch();
            for (let i = 0; i < 10; i++) {
                W.step(1 / 30);
            }
            const UNITS = W.unitCollection.items.filter((u) => !u.isBattleOnlySummon).slice(0, 8),
                RUN = (id, aim) => {
                    W.boss.stun = 0;
                    W.boss.hp = W.boss.maxHp ?? W.boss.hp;
                    const RING = W.boss.radius + 0.6;
                    UNITS.forEach((u, index) => {
                        const A = (index * Math.PI) / 4;
                        W._benched.delete(u);
                        Object.assign(u, {
                            x: W.boss.x + Math.cos(A) * RING,
                            y: W.boss.y + Math.sin(A) * RING,
                            z: 0,
                            vx: 0,
                            vy: 0,
                            vz: 0,
                            hp: 1e6,
                            dropLanded: true,
                        });
                    });
                    W._unitSpatialDirty = true;
                    const ACTION = {
                        id,
                        aim,
                        phase: 'active',
                        phaseElapsed: 0,
                        hitIds: new Set(),
                        locked: true,
                    };
                    W.boss.patternRuntime.active = ACTION;
                    for (let i = 0; i < 50 && W.boss.patternRuntime.active === ACTION; i++) {
                        W.step(1 / 30);
                    }
                    return UNITS.map((u) => ACTION.hitIds.has(u.id));
                };
            const SWEEP = RUN('attack.sweep-360', 0),
                FAN = RUN('attack.fan-sweep', 0);
            W.boss.patternRuntime.active = null;
            W.retreatFromFight();
            for (let i = 0; i < 60; i++) {
                W.step(1 / 30);
            }
            W._flushEjected();
            return { SWEEP, FAN };
        });
        expect(R.SWEEP.every(Boolean), `the sweep hits all 8 around the body ${JSON.stringify(R)}`);
        // The fan covers 120 degrees round the aim: the units at 0 and +-45 degrees (indexes 0, 1, 7), not the rest.
        expect(
            R.FAN.map(Number).join('') === '11000001',
            `the fan hits its own sector, from the body out ${JSON.stringify(R)}`,
        );
    },
);

await check('a boss hit volume is its drawn body: it differs per species and is never the old fixed box', async () => {
    const GOT = await WORLD(() =>
        Array.from({ length: 9 }, (_, species) => {
            const BOSS = BUDMORI.sim.createBoss(species);
            return { species, radius: BOSS.radius, height: BOSS.height };
        }),
    );
    for (const BOSS of GOT) {
        expect(BOSS.height > 8 && BOSS.radius > 2, `species ${BOSS.species}: ${JSON.stringify(BOSS)}`);
    }
    expect(new Set(GOT.map((boss) => boss.height)).size > 4, `heights ${JSON.stringify(GOT)}`);
});

await check('boss stage stats and rewards climb linearly, with a capped compounding on hp and attack', async () => {
    const [S1, S2, S10, S30, S61] = [1, 2, 10, 30, 61].map(bossStageStats);
    expect(S1.hp === 200 && S1.attackPower === 4 && S1.xp === 20 && S1.rollBudget === 1, JSON.stringify(S1));
    expect(S2.hp > S1.hp && S2.rollBudget === 2 && S2.xp === 30, JSON.stringify(S2));
    expect(S10.rollBudget === 10 && S61.rollBudget === 61 && S61.xp === 620, JSON.stringify([S10, S61]));
    // Past the cap the growth stops, so hp is linear again and the last 31 floors only double it.
    expect(S61.hp / S30.hp < 2.2 && S61.hp < 20000, JSON.stringify([S30.hp, S61.hp]));
});

await check('passive cards: damage scale, undying once per fight, helper heals, fallen allies count', async () => {
    const R = await WORLD(() => {
        const W = BUDMORI.sim,
            T = W.tower;
        for (const U of [...W.units]) {
            W.removeUnit(U);
        }
        const A = W.spawn(0, 1, 0, 0),
            B = W.spawn(0, 1, 2, 0),
            C = W.spawn(0, 1, 40, 0);
        const SAVE = { active: T.active, passives: T.passives, fallen: T.fallen, used: T.undyingUsed };
        T.active = true;
        T.fallen = 2;
        T.undyingUsed = new Set();
        T.passives = { 'last-stand': 0.24, opening: 0.4, vengeance: 0.07, resolve: 0.15, helper: 0.5, undying: 0.25 };
        W.farmBossEvent.elapsed = 5;
        const MAX = A.maxHp;
        const FULL = W.passiveDamageScale(A, MAX, W.boss, W.boss.maxHp);
        A.hp = MAX * 0.4;
        const LOW = W.passiveDamageScale(A, MAX, W.boss, W.boss.maxHp);
        W.farmBossEvent.elapsed = 12;
        const LATE = W.passiveDamageScale(A, MAX, W.boss, W.boss.maxHp);
        const TAKEN_FULL = W.passiveReceivedScale(B),
            TAKEN_LOW = (() => {
                B.hp = MAX * 0.2;
                return W.passiveReceivedScale(B);
            })();
        C.hp = 0;
        W.passiveUndying(C);
        const SAVED = C.hp;
        C.hp = 0;
        W.passiveUndying(C);
        const SECOND = C.hp;
        B.hp = 10;
        W.passiveAllyFell(A);
        const HEALED = B.hp;
        const FALLEN = T.fallen;
        Object.assign(T, { active: SAVE.active, passives: SAVE.passives, fallen: SAVE.fallen, undyingUsed: SAVE.used });
        return { FULL, LOW, LATE, TAKEN_FULL, TAKEN_LOW, SAVED, SECOND, HEALED, FALLEN, MAX };
    });
    const NEAR = (a, b) => Math.abs(a - b) < 1e-9;
    expect(NEAR(R.FULL, 1 + 0.4 + 0.14), `opening + vengeance ${JSON.stringify(R)}`);
    // A unit's own temperament (느긋 here) adds its passive: last stand 0.15 on top of the card's 0.24.
    expect(NEAR(R.LOW, 1 + 0.4 + 0.14 + 0.24 + 0.15), `last stand ${JSON.stringify(R)}`);
    expect(NEAR(R.LATE, 1 + 0.14 + 0.24 + 0.15), `opening over ${JSON.stringify(R)}`);
    expect(R.TAKEN_FULL === 1 && NEAR(R.TAKEN_LOW, 0.85), `resolve ${JSON.stringify(R)}`);
    expect(NEAR(R.SAVED, R.MAX * 0.25) && R.SECOND === 0, `undying ${JSON.stringify(R)}`);
    expect(NEAR(R.HEALED, 10 + R.MAX * 0.5) && R.FALLEN === 3, `helper ${JSON.stringify(R)}`);
});

await check(
    'troops coming back from the tower drop out of the door in turn and scatter over the farm within 3 s',
    async () => {
        const R = await WORLD(() => {
            const W = BUDMORI.sim;
            for (const U of [...W.units]) {
                W.removeUnit(U);
            }
            for (let index = 0; index < 40; index++) {
                W.spawn(index % 4, 1, index * 0.2, 0);
            }
            const SLEEPERS = W.unitCollection.items.slice(0, 10);
            for (const U of SLEEPERS) {
                U.hp = 0;
                U.down = 5;
            }
            W.insideTower = true;
            W._leaveTowerView();
            const START = W.time,
                AFTER_ONE_SECOND = [];
            let landedAt = null,
                sleepersFell = 0;
            for (let tick = 0; tick < 150 && landedAt === null; tick++) {
                W.step(1 / 30);
                sleepersFell = Math.max(sleepersFell, SLEEPERS.filter((u) => u.z > 0.5).length);
                if (tick === 30) {
                    AFTER_ONE_SECOND.push(W.units.length, W.units.filter((u) => u.z > 0.2).length);
                }
                if (!W._ejectQueue.length && W.units.length === 40 && W.units.every((u) => u.dropLanded && u.z === 0)) {
                    landedAt = W.time - START;
                }
            }
            const XS = W.units.map((u) => u.x),
                YS = W.units.map((u) => u.y);
            return {
                landedAt,
                sleepersFell,
                released: AFTER_ONE_SECOND[0],
                airborne: AFTER_ONE_SECOND[1],
                spreadX: Math.max(...XS) - Math.min(...XS),
                spreadY: Math.max(...YS) - Math.min(...YS),
                outside: W.units.filter((u) => W.outsideFarm(u.x, u.y)).length,
            };
        });
        expect(R.landedAt !== null && R.landedAt <= 3, `landing time ${JSON.stringify(R)}`);
        expect(R.sleepersFell >= 3, `sleeping units fall too ${JSON.stringify(R)}`);
        expect(R.released > 5 && R.released < 35, `released one by one ${JSON.stringify(R)}`);
        expect(R.spreadX > 20 && R.spreadY > 14 && R.outside === 0, `scatter ${JSON.stringify(R)}`);
    },
);

await check(
    'the start-floor slider can be dragged: a click on it changes the floor the climb starts from',
    async () => {
        await WORLD(() => {
            const W = BUDMORI.sim;
            if (W.insideTower) {
                W.retreatFromFight();
            }
            W.playerProgression.towerBest = Math.max(W.playerProgression.towerBest, 12);
            W.markProgressChanged();
        });
        await PAGE.waitForFunction(() => !document.getElementById('startFloorBox').hidden, null, { timeout: 40000 });
        const BOX = await PAGE.locator('#startFloor').boundingBox();
        await PAGE.mouse.click(BOX.x + BOX.width * 0.2, BOX.y + BOX.height / 2);
        const CHOSEN = await WORLD(() => ({
            value: Number(document.getElementById('startFloor').value),
            best: BUDMORI.sim.playerProgression.towerBest,
        }));
        expect(
            CHOSEN.value >= 1 && CHOSEN.value < CHOSEN.best,
            `the slider moved off the best floor ${JSON.stringify(CHOSEN)}`,
        );
    },
);

await check('page exit saves and cancels drawing before releasing the renderer; reload resumes', async () => {
    const OUTPUT = path.join(ROOT, 'tests/output/qa-cleanup');
    fs.mkdirSync(OUTPUT, { recursive: true });
    await PAGE.screenshot({ path: path.join(OUTPUT, 'farm-before-pagehide.png') });
    await WORLD(() => {
        const RENDERER = BUDMORI.renderer,
            RENDER = RENDERER.render.bind(RENDERER),
            DISPOSE = RENDERER.dispose.bind(RENDERER);
        globalThis.__exitObservation = { disposed: 0, drawsAfterDispose: 0 };
        RENDERER.render = (...args) => {
            if (globalThis.__exitObservation.disposed) {
                globalThis.__exitObservation.drawsAfterDispose++;
            }
            return RENDER(...args);
        };
        RENDERER.dispose = () => {
            globalThis.__exitObservation.disposed++;
            return DISPOSE();
        };
        window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
    });
    await PAGE.waitForTimeout(250);
    const EXIT = await WORLD(() => ({
        ...globalThis.__exitObservation,
        sessionClosed: BUDMORI.runtime.closed,
        saved: BUDMORI.storage.exportText() !== null,
    }));
    expect(
        EXIT.sessionClosed && EXIT.saved && EXIT.disposed === 1 && EXIT.drawsAfterDispose === 0,
        `page exit ${JSON.stringify(EXIT)}`,
    );
    // A persisted page is reloaded by the production pageshow handler.
    await Promise.all([
        PAGE.waitForEvent('load'),
        WORLD(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))),
    ]);
    // Reload retains #/farm, whose native router resumes the saved garden.
    await PAGE.waitForFunction(
        () =>
            globalThis.BUDMORI &&
            document.body.dataset.home === 'false' &&
            !BUDMORI.runtime.closed &&
            BUDMORI.sim.units.length > 0,
    );
    await PAGE.setViewportSize({ width: 390, height: 844 });
    await PAGE.waitForTimeout(500);
    await PAGE.screenshot({ path: path.join(OUTPUT, 'farm-after-reload-mobile.png') });
});

await check('no page errors', async () => {
    expect(ERRORS.length === 0, ERRORS.slice(0, 3).join(' | '));
});
await BROWSER.close();
SERVER.close();
const FAILED = RESULTS.filter((result) => !result.ok);
for (const RESULT of RESULTS) {
    console.log(
        `${RESULT.ok ? 'PASS' : 'FAIL'} ${RESULT.name} (${RESULT.ms}ms)${RESULT.error ? ` - ${RESULT.error}` : ''}`,
    );
}
process.exit(FAILED.length === 0 ? 0 : 1);
