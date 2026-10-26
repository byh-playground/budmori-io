// Fixed user flow: max-size frontline commands, finite reinforcements, and a saved summit.
// The fixture provides a mature 1,000-unit roster and durable targets. Movement,
// deployment, encounter transitions, input, native SVG rendering and storage run normally.
// Chromium SwiftShader verifies functionality/layout, not real-device performance.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(fileURLToPath(new URL('../', import.meta.url))),
    OUTPUT = path.join(ROOT, 'tests/output/tower-army'),
    HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'),
    MANIFEST = JSON.parse(
        HTML.match(/<script id="bloom-runtime-manifest" type="application\/json">(.*?)<\/script>/s)[1],
    ),
    MODULES = new Map(),
    ERRORS = [],
    REPORT = {
        status: 'running',
        renderer: 'Chromium SwiftShader',
        captures: [],
        stages: {},
        fixture: '1,000 mature T1 units, high-HP low-damage bosses; native simulation and render',
    },
    TYPES = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.svg': 'image/svg+xml',
    };
fs.mkdirSync(OUTPUT, { recursive: true });
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
    await page.evaluate(() => {
        BUDMORI.runtime.paused = true;
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
async function resume() {
    await page.evaluate(() => {
        BUDMORI.runtime.loop.resetTiming();
        BUDMORI.runtime.paused = false;
    });
}
async function ticks(count) {
    const START = await page.evaluate(() => BUDMORI.sim.simulationTick);
    await page.waitForFunction((target) => BUDMORI.sim.simulationTick >= target, START + count);
}
async function defeatVisibleBosses() {
    return page.evaluate(() => {
        const WORLD = BUDMORI.sim,
            COUNT = WORLD.bossEncounter.nextIndex;
        for (const BOSS of WORLD.bosses) {
            if (BOSS.active && BOSS.hp > 0) {
                BOSS.setHealth(0);
            }
        }
        return COUNT;
    });
}
async function openAndCloseReward() {
    await page.locator('#bossRewardDialog').waitFor({ state: 'visible' });
    await page.waitForFunction(
        () =>
            !document.querySelector('#bossRewardClose').hidden ||
            (!document.querySelector('#bossRewardOpenAll').hidden &&
                !document.querySelector('#bossRewardOpenAll').disabled),
    );
    if (await page.locator('#bossRewardOpenAll').isVisible()) {
        try {
            await page.locator('#bossRewardOpenAll').click({ timeout: 2000 });
        } catch (error) {
            // The normal automatic reveal can finish between the readiness check and click.
            if (!(await page.locator('#bossRewardClose').isVisible())) {
                throw error;
            }
        }
    }
    await page.locator('#bossRewardClose').click();
    await page.locator('#bossRewardDialog').waitFor({ state: 'hidden' });
    return page.evaluate(() => {
        const RECEIPT = BUDMORI.sim.bossRewardReceipts.at(-1);
        return {
            key: RECEIPT.receiptKey,
            status: RECEIPT.status,
            revealed: RECEIPT.revealedCount,
            boxes: RECEIPT.boxCount,
            acquired: RECEIPT.acquiredCount,
            xp: RECEIPT.xpAmount,
        };
    });
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
    await page.evaluate(async () => {
        const WORLD = BUDMORI.sim,
            { overallXpForLevel: XP_FOR_LEVEL } = await import('./src/model/player-progression.js');
        BUDMORI.runtime.paused = true;
        WORLD.resetUnits();
        WORLD.playerProgression.overallXp = XP_FOR_LEVEL(41);
        WORLD.playerProgression.towerBest = 100;
        WORLD.setWorkBasisPoints(0);
        for (let index = 0; index < 1000; index++) {
            const UNIT = WORLD.spawn(index % 9, 1, 0, 0);
            UNIT.growthElapsed = UNIT.growthDuration;
            UNIT.dropLanded = true;
        }
        const DRAW = BUDMORI.renderer.unitPresentation.draw;
        globalThis.__towerRenderedIds = new Set();
        BUDMORI.renderer.unitPresentation.draw = function (unit, world) {
            if (
                world.tower.active &&
                world.farmBossEvent.phase === 'fighting' &&
                unit.faction === 'player' &&
                !unit.isBattleOnlySummon
            ) {
                globalThis.__towerRenderedIds.add(unit.id);
            }
            return DRAW.call(this, unit, world);
        };
        globalThis.__restoreTowerDraw = () => {
            BUDMORI.renderer.unitPresentation.draw = DRAW;
        };
        WORLD.markProgressChanged();
    });
    await page.waitForFunction(() => document.querySelector('#startFloor').max === '80');
    assert.match(await page.locator('#startFloorValue').innerText(), /80/);
    assert.equal(await page.locator('#count').innerText(), '1000', 'the farm header counts owned regular troops');
    await page.locator('#bossChallenge').click();
    await page.locator('#deckGo').click();
    await page.evaluate(() => {
        const WORLD = BUDMORI.sim;
        // Arrange arrival at the gate, not deployment: the following 500 births use the normal batch loop.
        WORLD.finishMarch();
        WORLD.boss.setBaseStats({ maxHp: 1e9, attackPower: 0.01 });
        WORLD.boss.setHealth(WORLD.boss.maxHp);
        globalThis.__towerDeploymentStart = WORLD.simulationTick;
        globalThis.__towerRenderedIds.clear();
        const STEP = WORLD.step;
        WORLD.step = function (dt) {
            const RESULT = STEP.call(this, dt);
            if (this.fieldFighterCount === 500) {
                globalThis.__towerDeploymentEnd = this.simulationTick;
                this.step = STEP;
            }
            return RESULT;
        };
    });
    await page.waitForFunction(
        () => BUDMORI.sim.fieldFighterCount === 500 && globalThis.__towerRenderedIds.size >= 500,
    );
    REPORT.stages.deployment = await page.evaluate(() => ({
        field: BUDMORI.sim.fieldFighterCount,
        cap: BUDMORI.sim.frontlineLimit,
        owned: Number(document.querySelector('#count').textContent),
        reserves: [...BUDMORI.sim.handCounts.values()].reduce((sum, count) => sum + count, 0),
        rendered: globalThis.__towerRenderedIds.size,
        elapsed: (globalThis.__towerDeploymentEnd - globalThis.__towerDeploymentStart) / 20,
        mode: BUDMORI.sim.battleCommand,
    }));
    assert.equal(REPORT.stages.deployment.cap, 500);
    assert.equal(REPORT.stages.deployment.owned, 1000, 'benching must not shrink the owned-population header');
    assert.equal(REPORT.stages.deployment.reserves, 500);
    assert.equal(REPORT.stages.deployment.mode, 'engage');
    // Native post-step observation includes the boss drop but excludes browser polling/render latency.
    assert.ok(REPORT.stages.deployment.elapsed < 5, 'a 500-unit frontline must not take 50 seconds');
    await capture('500-frontline-engage-desktop.png');
    await resume();
    await ticks(80);
    await page.waitForFunction(() => BUDMORI.sim.boss.hp < BUDMORI.sim.boss.maxHp);
    await page.setViewportSize({ width: 667, height: 375 });
    await capture('500-frontline-engage-converged-landscape.png');
    REPORT.stages.landscapeLayout = await page.evaluate(() => {
        const BOX = (selector) => {
            const RECT = document.querySelector(selector).getBoundingClientRect();
            return { x: RECT.x, y: RECT.y, width: RECT.width, height: RECT.height, bottom: RECT.bottom };
        };
        return {
            viewportHeight: innerHeight,
            commands: BOX('#battleCommands'),
            hand: BOX('#hand'),
            boss: BOX('#bossbar'),
            combatDamage: BUDMORI.sim.boss.maxHp - BUDMORI.sim.boss.hp,
        };
    });
    assert.ok(REPORT.stages.landscapeLayout.commands.y >= 280, 'commands stay at the landscape bottom edge');
    assert.ok(REPORT.stages.landscapeLayout.hand.height <= 44, 'reserve priority remains a slim tappable strip');
    assert.ok(REPORT.stages.landscapeLayout.boss.bottom < REPORT.stages.landscapeLayout.commands.y);
    assert.ok(REPORT.stages.landscapeLayout.combatDamage > 0, 'the frame follows actual combat convergence');
    await page.setViewportSize({ width: 1000, height: 700 });
    await resume();
    await page.locator('input[name="battleCommand"][value="scatter"]').check();
    await page.waitForFunction(() => BUDMORI.sim.battleCommand === 'scatter');
    await ticks(12);
    await capture('500-frontline-scatter-desktop.png');
    await page.setViewportSize({ width: 667, height: 375 });
    await capture('500-frontline-scatter-landscape.png');
    await resume();
    await page.locator('input[name="battleCommand"][value="retreat"]').check();
    await page.waitForFunction(() => BUDMORI.sim.battleCommand === 'retreat');
    const BEFORE = await page.evaluate(() =>
        BUDMORI.sim.units
            .filter((unit) => unit.faction === 'player' && !unit.isBattleOnlySummon)
            .slice(0, 30)
            .map((unit) => ({ id: unit.id, x: unit.x, y: unit.y })),
    );
    await ticks(18);
    REPORT.stages.retreat = await page.evaluate((before) => {
        const WORLD = BUDMORI.sim;
        return {
            mode: WORLD.battleCommand,
            owned: Number(document.querySelector('#count').textContent),
            moved: before.filter((point) => {
                const UNIT = WORLD.units.find((unit) => unit.id === point.id);
                return UNIT && Math.hypot(UNIT.x - point.x, UNIT.y - point.y) > 0.05;
            }).length,
            selected: [...document.querySelectorAll('input[name="battleCommand"]')]
                .filter((input) => input.checked)
                .map((input) => input.value),
        };
    }, BEFORE);
    assert.equal(REPORT.stages.retreat.mode, 'retreat');
    assert.equal(REPORT.stages.retreat.owned, 1000, 'command switches preserve the owned-population header');
    assert.ok(REPORT.stages.retreat.moved > 0, 'retreat must move actual frontline bodies');
    assert.deepEqual(REPORT.stages.retreat.selected, ['retreat']);
    await capture('500-frontline-retreat-landscape.png');
    await page.setViewportSize({ width: 390, height: 844 });
    await capture('500-frontline-retreat-mobile.png');
    await resume();
    await page.locator('input[name="battleCommand"][value="engage"]').check();
    await page.waitForFunction(() => BUDMORI.sim.battleCommand === 'engage');
    await page.evaluate(() => {
        const WORLD = BUDMORI.sim,
            UNIT = WORLD.units.find(
                (unit) => unit.faction === 'player' && !unit.isBattleOnlySummon && unit.species !== 4,
            );
        UNIT.setHealth(0);
        WORLD.handleUnitDeath(UNIT);
        WORLD.bossEncounter.nextJoinAt = WORLD.bossEncounter.elapsed + 0.1;
    });
    await page.waitForFunction(
        () =>
            BUDMORI.sim.fieldFighterCount === 500 &&
            BUDMORI.sim.bosses.filter((boss) => boss.hp > 0).length >= 2 &&
            BUDMORI.runtime.presentationView.bosses.length >= 2 &&
            BUDMORI.sim.bosses
                .filter((boss) => boss.hp > 0)
                .every((boss) => BUDMORI.renderer.bossPlayers.has(boss.id + ':' + boss.generation)),
    );
    REPORT.stages.reinforcements = await page.evaluate(() => ({
        field: BUDMORI.sim.fieldFighterCount,
        reserves: [...BUDMORI.sim.handCounts.values()].reduce((sum, count) => sum + count, 0),
        liveBosses: BUDMORI.sim.bosses.filter((boss) => boss.hp > 0).length,
        renderedBosses: BUDMORI.runtime.presentationView.bosses.length,
        players: BUDMORI.renderer.bossPlayers.size,
    }));
    assert.equal(REPORT.stages.reinforcements.reserves, 499);
    assert.ok(REPORT.stages.reinforcements.renderedBosses >= 2);
    assert.ok(REPORT.stages.reinforcements.players >= 2);
    await page.setViewportSize({ width: 1000, height: 700 });
    await capture('overlapping-bosses-desktop.png');
    // Let each real floor-transition fade finish before freezing its native frame.
    REPORT.stages.themes = [];
    for (const [FLOOR, NAME] of [
        [1, 'entrance'],
        [21, 'garden'],
        [41, 'armory'],
        [61, 'royal'],
        [81, 'terrace'],
    ]) {
        await page.evaluate((floor) => {
            BUDMORI.sim.tower.floor = floor;
        }, FLOOR);
        await resume();
        await page.waitForFunction(
            (floor) =>
                BUDMORI.renderer.sceneKey === `in${floor}` &&
                BUDMORI.renderer.displayTimeMs - BUDMORI.renderer.sceneChangedAt >= 700,
            FLOOR,
        );
        await capture(`theme-${NAME}.png`);
        const FRAME = await page.evaluate(() => ({
            floor: BUDMORI.sim.tower.floor,
            fadeAgeMs: BUDMORI.renderer.displayTimeMs - BUDMORI.renderer.sceneChangedAt,
            units: BUDMORI.runtime.presentationView.units.length,
            bosses: BUDMORI.runtime.presentationView.bosses.length,
        }));
        assert.ok(FRAME.fadeAgeMs >= 700 && FRAME.units >= 500 && FRAME.bosses >= 2);
        REPORT.stages.themes.push(FRAME);
    }
    await page.evaluate(() => {
        BUDMORI.sim.tower.floor = 80;
    });
    const XP_BEFORE = await page.evaluate(() => BUDMORI.sim.playerProgression.overallXp);
    await resume();
    for (let index = 0; index < 4; index++) {
        if (await page.evaluate(() => BUDMORI.sim.farmBossEvent.phase !== 'fighting')) {
            break;
        }
        const JOINED = await defeatVisibleBosses();
        await page.waitForFunction(
            (joined) => BUDMORI.sim.farmBossEvent.phase !== 'fighting' || BUDMORI.sim.bossEncounter.nextIndex > joined,
            JOINED,
        );
    }
    await page.waitForFunction(() => BUDMORI.sim.farmBossEvent.phase === 'idle' && BUDMORI.sim.tower.doors.length > 0);
    REPORT.stages.floorReward = await page.evaluate(() => {
        const WORLD = BUDMORI.sim,
            XP = WORLD.playerProgression.overallXp,
            DUPLICATE = WORLD.finishFarmBossEvent('victory');
        return { xp: XP, afterRetry: WORLD.playerProgression.overallXp, retryAccepted: DUPLICATE };
    });
    assert.ok(REPORT.stages.floorReward.xp > XP_BEFORE);
    assert.equal(REPORT.stages.floorReward.afterRetry, REPORT.stages.floorReward.xp);
    assert.equal(REPORT.stages.floorReward.retryAccepted, false);
    await openAndCloseReward();
    REPORT.stages.floorReward.boxesClosedThroughUi = true;
    await page.evaluate(() => {
        // Arrange the last door of an otherwise completed climb. The actual door,
        // finite roster, final guardian, reward, skip and reload remain product paths.
        const WORLD = BUDMORI.sim;
        WORLD.tower.floor = 99;
        WORLD.tower.nextKind = 'mid';
        WORLD.tower.doors = [{ type: 'fight', kind: 'mid' }];
    });
    await page.locator('#doorCards [data-door="0"]').click();
    await page.waitForFunction(() => BUDMORI.sim.tower.floor === 100 && BUDMORI.sim.farmBossEvent.phase === 'fighting');
    for (let index = 0; index < 6; index++) {
        if (await page.evaluate(() => BUDMORI.sim.bosses.some((boss) => boss.isFinalBoss && boss.hp > 0))) {
            break;
        }
        const JOINED = await defeatVisibleBosses();
        await page.waitForFunction((joined) => BUDMORI.sim.bossEncounter.nextIndex > joined, JOINED);
    }
    assert.equal(
        await page.evaluate(() => BUDMORI.sim.bosses.filter((boss) => boss.hp > 0).every((boss) => boss.isFinalBoss)),
        true,
    );
    await page.waitForFunction(() => {
        const FINAL = BUDMORI.sim.bosses.find((boss) => boss.isFinalBoss && boss.hp > 0);
        return (
            FINAL?.dropLanded &&
            BUDMORI.runtime.presentationView.bosses.some((boss) => boss.id === FINAL.id && boss.dropLanded) &&
            BUDMORI.renderer.bossPlayers.has(FINAL.id + ':' + FINAL.generation)
        );
    });
    await capture('final-guardian-desktop.png');
    await resume();
    await defeatVisibleBosses();
    await page.waitForFunction(
        () =>
            BUDMORI.sim.tower.phase === 'summit' &&
            BUDMORI.sim.tower.summitElapsed >= 1.5 &&
            !document.querySelector('#towerSummit').hidden,
    );
    await capture('summit-desktop.png');
    REPORT.stages.summit = await page.evaluate(() => ({
        xp: BUDMORI.sim.playerProgression.overallXp,
        savedXp: BUDMORI.storage.savedProgress?.player.overallXp,
        phase: BUDMORI.sim.tower.phase,
        visible: !document.querySelector('#towerSummit').hidden,
        rewardDialogHidden: document.querySelector('#bossRewardDialog').hidden,
        normalHeaderHidden: getComputedStyle(document.querySelector('body > header')).display === 'none',
        normalOutcomeHidden: getComputedStyle(document.querySelector('#battleOutcome')).display === 'none',
    }));
    assert.equal(REPORT.stages.summit.savedXp, REPORT.stages.summit.xp, 'final permanent XP is saved before Skip');
    assert.equal(REPORT.stages.summit.visible, true);
    assert.equal(REPORT.stages.summit.normalHeaderHidden, true);
    assert.equal(REPORT.stages.summit.normalOutcomeHidden, true);
    assert.equal(REPORT.stages.summit.rewardDialogHidden, true, 'the chest dialog must not cover the summit');
    await page.setViewportSize({ width: 667, height: 375 });
    await capture('summit-landscape.png');
    assert.equal(
        await page.evaluate(() => getComputedStyle(document.querySelector('.tower-summit__footer > small')).display),
        'none',
    );
    await resume();
    await page.locator('#summitSkip').click();
    await page.waitForFunction(() => !BUDMORI.sim.tower.active && document.querySelector('#towerSummit').hidden);
    assert.equal(await page.evaluate(() => BUDMORI.sim.playerProgression.overallXp), REPORT.stages.summit.xp);
    REPORT.stages.finalReward = await openAndCloseReward();
    assert.equal(REPORT.stages.finalReward.status, 'ready');
    assert.equal(REPORT.stages.finalReward.revealed, REPORT.stages.finalReward.boxes);
    await page.waitForFunction((receipt) => {
        const SAVED = BUDMORI.storage.savedProgress?.ledger.boss.pendingRewards.find(
            (entry) => entry.receiptKey === receipt.key,
        );
        return SAVED?.status === 'ready' && SAVED.acquiredCount === receipt.acquired;
    }, REPORT.stages.finalReward);
    await page.reload();
    await page.waitForFunction(() => Boolean(globalThis.BUDMORI));
    // #/farm restores the saved farm during boot; the home route uses Continue.
    if (await page.evaluate(() => document.body.matches('[data-home="true"]'))) {
        await page.locator('#continueGame').click();
    }
    await page.waitForFunction(() => !document.body.matches('[data-home="true"]'));
    REPORT.stages.reload = await page.evaluate(() => ({
        xp: BUDMORI.sim.playerProgression.overallXp,
        towerActive: BUDMORI.sim.tower.active,
        farm: BUDMORI.sim.farmBossEvent.phase,
        cap: BUDMORI.sim.capacity,
        rewards: BUDMORI.sim.bossRewardReceipts.map((receipt) => ({
            key: receipt.receiptKey,
            status: receipt.status,
            revealed: receipt.revealedCount,
            boxes: receipt.boxCount,
            acquired: receipt.acquiredCount,
            xp: receipt.xpAmount,
        })),
    }));
    assert.equal(REPORT.stages.reload.xp, REPORT.stages.summit.xp);
    assert.equal(REPORT.stages.reload.towerActive, false);
    assert.equal(REPORT.stages.reload.farm, 'idle');
    assert.equal(REPORT.stages.reload.cap, 1000);
    assert.deepEqual(
        REPORT.stages.reload.rewards.filter((receipt) => receipt.key === REPORT.stages.finalReward.key),
        [REPORT.stages.finalReward],
        'reload restores the one resolved final receipt, without re-rolling or duplicating it',
    );
    assert.deepEqual(ERRORS, []);
    REPORT.status = 'passed';
} catch (error) {
    REPORT.status = 'failed';
    REPORT.error = String(error.stack || error);
    throw error;
} finally {
    REPORT.errors = ERRORS;
    fs.writeFileSync(path.join(OUTPUT, 'report.json'), JSON.stringify(REPORT, null, 2));
    await browser?.close();
    SERVER.close();
}
