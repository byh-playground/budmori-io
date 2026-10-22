// Browser smoke test: boots the built game in headless Chromium and walks the main flows.
// The gamekit CDN requests are answered from vendor/upstream, so it runs offline. Real-device speed is not measured.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bossStageStats } from '../src/boss-rewards.js';
import { baseUnitStatsFor, setRunStatMods } from '../src/unit-stats.js';
import { advanceSince, freshTowerRun, rollCardOffers, rollFloorKind, runStatModifiers } from '../src/tower-run.js';

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
const PAGE = await (await BROWSER.newContext({ viewport: { width: 1000, height: 700 } })).newPage(),
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
const WORLD = (fn, arg) => PAGE.evaluate(fn, arg);
await PAGE.goto(`http://127.0.0.1:${PORT}/index.html`);
await PAGE.waitForTimeout(2500);

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
        const W = BUDMORI.sim;
        for (let index = 0; index < 20; index++) {
            W.spawn(index % 9, 1, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 12);
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
    }));
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
    await PAGE.waitForTimeout(1500);
    const FIGHTING = await WORLD(() => BUDMORI.sim.farmBossEvent.phase);
    expect(FIGHTING !== 'idle', `fight did not start (${FIGHTING})`);
    const HAND = await WORLD(() => ({
        cards: document.querySelectorAll('#hand [data-deploy]').length,
        hidden: document.getElementById('hand').hidden,
        waiting: BUDMORI.sim.handCounts.size,
        field: BUDMORI.sim.fieldFighterCount,
    }));
    expect(!HAND.hidden && HAND.cards > 0, `deploy order not shown (${JSON.stringify(HAND)})`);
    // Nobody is placed by hand: the whole army walks in on its own, one unit per 0.1 s, from all around the hall.
    await PAGE.waitForTimeout(2500);
    const AUTO = await WORLD(() => {
        const W = BUDMORI.sim,
            FIELD = W.units.filter((u) => u.faction === 'player' && !u.isBattleOnlySummon);
        return {
            field: W.fieldFighterCount,
            waiting: [...W.handCounts.values()].reduce((a, b) => a + b, 0),
            sides: new Set(FIELD.map((u) => Math.sign(Math.round(u.x)) + ':' + Math.sign(Math.round(u.y)))).size,
        };
    });
    expect(AUTO.field >= 3, `army was not sent in by itself ${JSON.stringify(AUTO)}`);
    // Tapping a species card puts that species at the front of the order.
    const FIRST = await WORLD(() => {
        const BUTTONS = [...document.querySelectorAll('#hand [data-deploy]')],
            LAST = BUTTONS[BUTTONS.length - 1];
        LAST.click();
        return Number(LAST.dataset.deploy);
    });
    await PAGE.waitForTimeout(400);
    const ORDER = await WORLD(() => BUDMORI.sim.deployOrder[0]);
    expect(ORDER === FIRST, `tapped card did not move to the front (${ORDER} vs ${FIRST})`);
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
    const OUT = await WORLD(() => {
        const W = BUDMORI.sim,
            LIVING = W.units.filter((u) => !u.isBattleOnlySummon);
        return {
            inside: W.insideTower,
            count: LIVING.length,
            nearDoor: LIVING.filter((u) => u.y > W.towerGate.y - 8).length,
        };
    });
    expect(!OUT.inside && OUT.count > 0, `still inside the tower ${JSON.stringify(OUT)}`);
    expect(OUT.nearDoor > 0, `troops did not come out of the door ${JSON.stringify(OUT)}`);
});

await check('tower: floors, doors, sleep, rest, mid-boss and best floor', async () => {
    await PAGE.locator('#bossChallenge').click();
    if (await PAGE.locator('#deckGo').isVisible()) {
        await PAGE.locator('#deckGo').click();
    }
    await PAGE.waitForFunction(() => BUDMORI.sim.insideTower && BUDMORI.sim.farmBossEvent.phase !== 'marching', null, {
        timeout: 15000,
    });
    await PAGE.waitForTimeout(3500);
    const CLEAR_FLOOR = () =>
        WORLD(() => {
            const W = BUDMORI.sim;
            W.deployUnit([...W.handCounts.keys()][0], 0, 0);
            const FALLEN = W.units.find((u) => !u.isBattleOnlySummon && u.hp > 0);
            if (FALLEN) {
                FALLEN.hp = 0;
            }
            W.boss.hp = 0;
        });
    await CLEAR_FLOOR();
    await PAGE.waitForTimeout(3500);
    const ONE = await WORLD(() => {
        const W = BUDMORI.sim;
        return {
            active: W.tower.active,
            floor: W.tower.floor,
            doors: W.tower.doors.length,
            sleepers: W.tower.sleepUntil.size,
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
    expect(ONE.sleepers === 1 && ONE.onField === 0, `sleep/hand ${JSON.stringify(ONE)}`);
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
        W.tower.nextKind = 'power';
        W.tower.doors = [{ type: 'skill', id: 'lightning' }];
        W.chooseDoor(0);
        const FIRST = W.tower.relics.get('lightning');
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
    await WORLD(() => {
        const W = BUDMORI.sim;
        W.tower.floor = 2;
        W.tower.nextKind = 'battle';
        W.tower.doors = [{ type: 'fight', kind: 'battle' }];
        W.chooseDoor(0);
    });
    await PAGE.waitForTimeout(3500);
    const SLOT = await WORLD(() => {
        const W = BUDMORI.sim;
        W.formationSkills.update(0.05);
        return W.formationSkills.slots.map((x) => `${x.id}:${x.level}`).join();
    });
    expect(SLOT === 'lightning:2', `relic skill in fight: ${SLOT}`);
    await CLEAR_FLOOR();
    await PAGE.waitForTimeout(3500);
    const THREE = await WORLD(() => ({
        floor: BUDMORI.sim.tower.floor,
        best: BUDMORI.sim.playerProgression.towerBest,
    }));
    // The test moved the floor back to 2 after the card floors had already raised the best to 4.
    expect(THREE.floor === 3 && THREE.best === 4, `floor 3 ${JSON.stringify(THREE)}`);
    const LEFT = await WORLD(() => {
        const W = BUDMORI.sim;
        W.leaveTower();
        return { active: W.tower.active, units: W.units.filter((u) => !u.isBattleOnlySummon).length };
    });
    expect(!LEFT.active && LEFT.units > 0, `leave ${JSON.stringify(LEFT)}`);
});

await check('a species the farm lacks joins as a pair on its first win, even below the best floor', async () => {
    const R = await WORLD(async () => {
        const W = BUDMORI.sim;
        for (const U of [...W.units]) {
            W.removeUnit(U);
        }
        for (let i = 0; i < 6; i++) {
            W.spawn(0, 1, i * 0.4, 0);
        }
        W.randomBossSpecies = () => 3;
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
            species3: W.unitCollection.items.filter((u) => !u.isBattleOnlySummon && u.species === 3).length,
            xp: RECEIPT?.xpAmount,
        };
    });
    expect(R.record === false && R.first === true && R.species3 === 2 && R.xp > 0, `first win ${JSON.stringify(R)}`);
});
await check(
    'a boss win feeds only its species mastery; points stay with that species and a reset keeps them',
    async () => {
        const R = await WORLD(() => {
            const W = BUDMORI.sim;
            const SNAP = () =>
                JSON.stringify(
                    Object.entries(W.playerProgression.abilities).map(([id, a]) => [id, a.masteryLevel, a.masteryXp]),
                );
            for (const U of [...W.units]) {
                W.removeUnit(U);
            }
            for (let i = 0; i < 6; i++) {
                W.spawn(0, 1, i * 0.4, 0);
            }
            W.randomBossSpecies = () => 3;
            W.playerProgression.towerBest = 50;
            // Earlier fights in this run already fed mastery; start from empty xp so a level-up cannot wrap the count.
            for (const ABILITY of Object.values(W.playerProgression.abilities)) {
                ABILITY.masteryXp = 0;
            }
            const BEFORE = JSON.parse(SNAP());
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
            for (let i = 0; i < 200; i++) {
                TICK();
            }
            const AFTER = JSON.parse(SNAP());
            const CHANGED = AFTER.filter((row, i) => row[1] !== BEFORE[i][1] || row[2] !== BEFORE[i][2]);
            const ID = CHANGED[0]?.[0];
            const OTHER = AFTER.find((row) => row[0] !== ID)[0];
            W.leaveTower();
            W.playerProgression.abilities[ID].masteryLevel = 3;
            const OWN = W.investAbilityNode(ID, 'power-1').ok;
            const OTHERS = W.investAbilityNode(OTHER, 'power-1');
            const RESET = W.resetProgression({ type: 'abilities' });
            const KEPT = W.playerProgression.abilities[ID];
            return {
                changed: CHANGED.length,
                gained: CHANGED[0] ? CHANGED[0][2] - BEFORE.find((row) => row[0] === ID)[2] : 0,
                own: OWN,
                other: OTHERS.reason,
                reset: RESET.ok,
                keptLevel: KEPT.masteryLevel,
                power: KEPT.powerLevel,
            };
        });
        expect(
            R.changed === 1 && R.gained === 20 && R.own === true && R.other === 'insufficient-points',
            `mastery ${JSON.stringify(R)}`,
        );
        expect(R.reset === true && R.keptLevel === 3 && R.power === 0, `mastery reset ${JSON.stringify(R)}`);
    },
);
await check(
    'stat cards are (base + flat) x (1 + pct) for every unit, and clearing them restores the base',
    async () => {
        const ATTACK = () => baseUnitStatsFor(1, 0).attackPower,
            HP = () => baseUnitStatsFor(1, 0).maxHp,
            BEFORE = [ATTACK(), HP()];
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
            Math.abs(DURING.attackPower - (4 + 2) * (1 + 0.1 + 0.16)) < 1e-9 &&
                DURING.armor === 25 &&
                Math.abs(DURING.regen - 40 * 0.005) < 1e-9 &&
                DURING.maxHp === 40,
            JSON.stringify(DURING),
        );
        expect(ATTACK() === BEFORE[0] && HP() === BEFORE[1], 'cleared');
    },
);
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

await check('upgrade menu opens on the species abilities without the old stat tab', async () => {
    // The reward dialog can open late and cover the menu button, so close it by script first.
    await PAGE.waitForTimeout(1500);
    for (let attempt = 0; attempt < 4; attempt++) {
        await WORLD(() => {
            document.getElementById('bossRewardOpenAll')?.click();
            document.getElementById('bossRewardClose')?.click();
        });
        await PAGE.waitForTimeout(400);
    }
    await WORLD(() => document.getElementById('upgradeMenu').click());
    await PAGE.waitForTimeout(800);
    const MENU = await WORLD(() => ({
        abilities: !document.getElementById('abilityPanel').hidden,
        growthTab: !!document.getElementById('menuTabGrowth'),
        tabs: document.querySelectorAll('#gameMenuTabs [role="tab"]').length,
    }));
    expect(MENU.abilities && !MENU.growthTab && MENU.tabs === 2, `menu ${JSON.stringify(MENU)}`);
    await PAGE.locator('#gameMenuClose').click();
    await PAGE.waitForTimeout(300);
});

await check('progress survives a reload', async () => {
    await WORLD(() => {
        BUDMORI.sim.playerProgression.towerBest = 4;
        BUDMORI.sim.markProgressChanged();
    });
    await PAGE.waitForTimeout(3000);
    await PAGE.reload();
    await PAGE.waitForTimeout(4000);
    const STAGE = await WORLD(() => BUDMORI.sim.playerProgression.towerBest);
    expect(STAGE >= 4, `best floor after reload is ${STAGE}`);
});

await check('help cards play the real game in an isolated frame and leave the save alone', async () => {
    const BEFORE = await WORLD(() => JSON.stringify(Object.entries(localStorage).sort()));
    await PAGE.locator('#helpMenu').click();
    await PAGE.locator('#helpNext').click();
    await PAGE.waitForFunction(
        () => document.getElementById('helpCaption').textContent.includes('한 등급 위가 됐어요'),
        null,
        { timeout: 60000 },
    );
    const FRAME = await WORLD(() => {
        const SNAP = document.querySelector('#helpDemo iframe').contentWindow.__budmoriHelp.snapshot();
        return { step: SNAP.step, dots: document.querySelectorAll('#helpDots button').length };
    });
    expect(FRAME.step === 'done' && FRAME.dots === 3, `help card state ${JSON.stringify(FRAME)}`);
    await PAGE.locator('#gameMenuClose').click();
    expect((await PAGE.locator('#helpDemo iframe').count()) === 0, 'the help frame stays mounted after the tab closes');
    const AFTER = await WORLD(() => JSON.stringify(Object.entries(localStorage).sort()));
    const KEYS = (text) => JSON.parse(text).map(([key]) => key);
    expect(KEYS(BEFORE).join() === KEYS(AFTER).join(), 'a help frame changed the stored keys');
});

await check('a full farm keeps queued rewards and the panel names their species', async () => {
    await WORLD(() => document.getElementById('upgradeMenu').click());
    await PAGE.locator('#menuTabFarms').click();
    await WORLD(() => {
        const W = BUDMORI.sim;
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
    await PAGE.waitForFunction(() => document.querySelectorAll('#farmQueue .farm-queue__chip').length === 2, null, {
        timeout: 5000,
    });
    const GOT = await WORLD(() => {
        const W = BUDMORI.sim,
            CHIPS = [...document.querySelectorAll('#farmQueue .farm-queue__chip b')].map((b) => b.textContent),
            FULL = { free: W.freeRoom(), owned: W.ownedPopulation, capacity: W.capacity };
        W.bossRewardInventory = [];
        for (const UNIT of window.__fillers) {
            W.removeUnit(UNIT);
        }
        W.markProgressChanged();
        return { ...FULL, CHIPS };
    });
    await PAGE.locator('#gameMenuClose').click();
    expect(GOT.free === 0, `room ${JSON.stringify(GOT)}`);
    expect(GOT.CHIPS.join() === '3,5', `queue chips ${JSON.stringify(GOT)}`);
});

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
