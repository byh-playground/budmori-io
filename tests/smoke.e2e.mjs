// Browser smoke test: boots the built game in headless Chromium and walks the main flows.
// The gamekit CDN requests are answered from vendor/upstream, so it runs offline. Real-device speed is not measured.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
        roles: [...document.querySelectorAll('.work-hud__bar span')].map((span) => span.id),
        handles: document.querySelectorAll('.work-hud__cut').length,
        challenge: document.getElementById('bossChallenge')?.textContent.trim(),
    }));
    expect(STATE.units > 0 && STATE.scene === 'farm', 'farm did not start');
    expect(STATE.removed.length === 0, `removed controls are back: ${STATE.removed}`);
    expect(STATE.handles === 1, `the role bar needs exactly one handle, has ${STATE.handles}`);
    expect(STATE.roles.length === 2, `the role bar should have two parts, has ${STATE.roles.length}`);
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
});

await check('units eat, breed and the farm stays under its capacity', async () => {
    await WORLD(() => {
        const W = BUDMORI.sim;
        for (let round = 0; round < 40; round++) {
            W.scatterFoodAtRandomLocation();
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
    await PAGE.locator('#bossChallenge').click();
    await PAGE.waitForTimeout(4000);
    const FIGHTING = await WORLD(() => BUDMORI.sim.farmBossEvent.phase);
    expect(FIGHTING !== 'idle', `fight did not start (${FIGHTING})`);
    const HAND = await WORLD(() => ({
        cards: document.querySelectorAll('#hand [data-deploy]').length,
        hidden: document.getElementById('hand').hidden,
        waiting: BUDMORI.sim.handCounts.size,
        onField: BUDMORI.sim.fieldFighterCount,
    }));
    expect(!HAND.hidden && HAND.cards > 0 && HAND.waiting === HAND.cards, `hand not shown (${JSON.stringify(HAND)})`);
    expect(HAND.onField === 0, `units should start benched (${HAND.onField} on field)`);
    const BOX = await PAGE.locator('#world').boundingBox();
    await PAGE.mouse.click(BOX.x + BOX.width / 2, BOX.y + BOX.height * 0.55);
    await PAGE.waitForTimeout(1500);
    const DEPLOYED = await WORLD(() => BUDMORI.sim.fieldFighterCount);
    expect(DEPLOYED >= 1, `tap did not deploy a unit (${DEPLOYED})`);
    const CAP = await WORLD(() => {
        for (let i = 0; i < 3; i++) {
            BUDMORI.sim.deployUnit([...BUDMORI.sim.handCounts.keys()][0], 0, 0);
        }
        return BUDMORI.sim.fieldFighterCount;
    });
    expect(CAP <= DEPLOYED + 1, `cooldown ignored (${DEPLOYED} -> ${CAP})`);
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
});

await check('tower: floors, doors, sleep, rest, mid-boss and best floor', async () => {
    await PAGE.locator('#bossChallenge').click();
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
            rail: document.querySelectorAll('#towerRail li').length,
        };
    });
    expect(
        ONE.active && ONE.floor === 1 && ONE.doors >= 1 && ONE.best === 1 && ONE.record,
        `floor 1 ${JSON.stringify(ONE)}`,
    );
    expect(ONE.sleepers === 1 && ONE.onField === 0, `sleep/hand ${JSON.stringify(ONE)}`);
    expect(ONE.panel && ONE.rail >= 3, `tower UI ${JSON.stringify(ONE)}`);
    const REST = await WORLD(() => {
        const W = BUDMORI.sim;
        W.tower.doors = ['rest', 'battle'];
        W.chooseDoor(0);
        return {
            floor: W.tower.floor,
            sleepers: W.tower.sleepUntil.size,
            kind: W.tower.kind,
            doors: W.tower.doors.length,
        };
    });
    expect(
        REST.floor === 2 && REST.sleepers === 0 && REST.kind === 'rest' && REST.doors >= 1,
        `rest ${JSON.stringify(REST)}`,
    );
    const MID = await WORLD(() => {
        const W = BUDMORI.sim;
        W.tower.floor = 4;
        return W._rollDoors().join();
    });
    expect(MID === 'mid', `floor 5 doors: ${MID}`);
    await WORLD(() => {
        const W = BUDMORI.sim;
        W.tower.floor = 2;
        W.tower.doors = ['battle'];
        W.chooseDoor(0);
    });
    await PAGE.waitForTimeout(3500);
    await CLEAR_FLOOR();
    await PAGE.waitForTimeout(3500);
    const THREE = await WORLD(() => ({
        floor: BUDMORI.sim.tower.floor,
        best: BUDMORI.sim.playerProgression.towerBest,
    }));
    expect(THREE.floor === 3 && THREE.best === 3, `floor 3 ${JSON.stringify(THREE)}`);
    const LEFT = await WORLD(() => {
        const W = BUDMORI.sim;
        W.leaveTower();
        return { active: W.tower.active, units: W.units.filter((u) => !u.isBattleOnlySummon).length };
    });
    expect(!LEFT.active && LEFT.units > 0, `leave ${JSON.stringify(LEFT)}`);
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
