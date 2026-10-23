// Returning player's fixed flow: inspect, invest, preview, reset, enter a run, and reload the farm.
// Fixtures supply an earned Lv50 save, not attack outcomes. All purchases use actual UI commands.
// Chromium SwiftShader plus pinned GameKit modules; touch emulation is not a physical-device claim.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = fileURLToPath(new URL('../', import.meta.url)),
    OUTPUT = path.join(ROOT, 'tests/output/corn-growth'),
    TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' },
    REPORT = [],
    ERRORS = [];
fs.mkdirSync(OUTPUT, { recursive: true });
const SERVER = http.createServer((request, response) => {
    const FILE = path.resolve(ROOT, '.' + decodeURIComponent(request.url.split('?')[0]));
    if (!FILE.startsWith(ROOT) || !fs.existsSync(FILE) || fs.statSync(FILE).isDirectory()) {
        response.writeHead(404).end();
        return;
    }
    response.setHeader('content-type', TYPES[path.extname(FILE)] || 'application/octet-stream');
    response.end(fs.readFileSync(FILE));
});
await new Promise((resolve) => SERVER.listen(0, '127.0.0.1', resolve));
const GAME_URL = `http://127.0.0.1:${SERVER.address().port}/index.html`,
    BROWSER = await chromium.launch({
        executablePath: process.env.CHROME_PATH,
        args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
    });

async function activate(locator, mobile) {
    await locator.scrollIntoViewIfNeeded();
    if (mobile) {
        await locator.tap();
    } else {
        await locator.click();
    }
}
async function openCorn(page, mobile) {
    await activate(page.locator('#upgradeMenu'), mobile);
    await activate(page.locator('#menuTabAbilities'), mobile);
    await activate(page.locator('[data-ability-species="1"]'), mobile);
    await page.locator('[data-growth-tree]').waitFor();
}
function node(page, id) {
    return page.locator(`[data-growth-node="${id}"] button`);
}
async function purchase(page, id, mobile) {
    const BEFORE = await page.locator(`[data-growth-node="${id}"] .growth-rank`).textContent();
    assert.equal(await node(page, id).getAttribute('aria-disabled'), 'false', `${id} is available`);
    await activate(node(page, id), mobile);
    await page.waitForFunction(
        ({ id: nodeId, before }) =>
            document.querySelector(`[data-growth-node="${nodeId}"] .growth-rank`)?.textContent !== before,
        { id, before: BEFORE },
    );
}
async function preview(page, tier, mobile) {
    const BEFORE = await page.evaluate(() => JSON.stringify(BUDMORI.sim.playerProgression));
    await activate(page.locator(`[data-corn-preview-tier="${tier}"]`), mobile);
    const HANDLE = await page.locator('.corn-evolution-preview iframe').elementHandle(),
        FRAME = await HANDLE.contentFrame();
    await FRAME.waitForFunction(
        (expected) => globalThis.BUDMORI?.sim?.projectiles?.some((shot) => shot.cornForm === expected),
        tier,
        { timeout: 18000 },
    );
    const TRACE = [];
    for (let index = 0; index < 3; index++) {
        TRACE.push(
            await FRAME.evaluate(() => ({
                tick: BUDMORI.sim.simulationTick,
                projectiles: BUDMORI.sim.projectiles.map((shot) => ({
                    id: shot.id,
                    form: shot.cornForm,
                    slot: shot.cornSlot,
                    x: shot.x,
                    y: shot.y,
                    z: shot.z,
                    elapsed: shot.elapsed,
                })),
            })),
        );
        await page
            .locator('.corn-evolution-preview iframe')
            .screenshot({ path: path.join(OUTPUT, `${mobile ? 'mobile' : 'desktop'}-t${tier}-frame${index}.png`) });
        await page.waitForTimeout(90);
    }
    assert.ok(
        TRACE.some(
            (frame, index) => index > 0 && JSON.stringify(frame.projectiles) !== JSON.stringify(TRACE[0].projectiles),
        ),
        `T${tier} actual projectiles progress between captures`,
    );
    assert.equal(
        await page.evaluate(() => JSON.stringify(BUDMORI.sim.playerProgression)),
        BEFORE,
        'isolated preview does not alter investment or XP',
    );
    assert.equal(await page.locator('.corn-evolution-preview iframe').count(), 1, 'one isolated preview at a time');
    REPORT.push({ viewport: mobile ? 'mobile' : 'desktop', tier, trace: TRACE });
}

async function captureMainCombat(page, tier, mobile) {
    // The main play session, not an iframe: reload gives each fixture a clean farm boundary.
    await page.reload();
    await page.waitForFunction(() => globalThis.BUDMORI?.sim?.scene === 'farm');
    if (await page.locator('#gameMenuPanel').isVisible()) {
        await activate(page.locator('#gameMenuClose'), mobile);
    }
    await page.evaluate(async (selectedTier) => {
        const { helpSceneById: HELP_SCENE_BY_ID } = await import('./src/help-scenes.js');
        HELP_SCENE_BY_ID(`corn-t${selectedTier}`).setup(BUDMORI.sim);
    }, tier);
    const TRACE = [];
    for (const STAGE of ['flight', 'impact', 'explosion']) {
        await page.waitForFunction(
            ({ tier: expected, stage }) => {
                const WORLD = BUDMORI.sim;
                if (stage === 'flight') {
                    return WORLD.projectiles.some(
                        (shot) => shot.cornForm === expected && shot.elapsed < shot.path.duration * 0.6,
                    );
                }
                return WORLD.cornAttachments.groups.some((group) =>
                    group.attachments.some((attachment) =>
                        stage === 'explosion' ? attachment.status === 'fading' : attachment.status !== 'fading',
                    ),
                );
            },
            { tier, stage: STAGE },
            { timeout: 15000, polling: 'raf' },
        );
        TRACE.push(
            await page.evaluate(
                (stage) => ({
                    stage,
                    tick: BUDMORI.sim.simulationTick,
                    time: BUDMORI.sim.time,
                    boss: {
                        x: BUDMORI.sim.boss.x,
                        y: BUDMORI.sim.boss.y,
                        radius: BUDMORI.sim.boss.radius,
                        hp: BUDMORI.sim.boss.hp,
                    },
                    projectiles: BUDMORI.sim.projectiles.map((shot) => ({
                        id: shot.id,
                        form: shot.cornForm,
                        slot: shot.cornSlot,
                        x: shot.x,
                        y: shot.y,
                        z: shot.z,
                        elapsed: shot.elapsed,
                    })),
                    attachments: BUDMORI.sim.cornAttachments.groups.map((group) => ({
                        id: group.id,
                        action: group.cornActionId,
                        firstAttachTick: group.firstAttachTick,
                        attachments: group.attachments.map((attachment) => ({
                            id: attachment.id,
                            status: attachment.status,
                        })),
                    })),
                }),
                STAGE,
            ),
        );
        await page.screenshot({
            path: path.join(OUTPUT, `${mobile ? 'mobile' : 'desktop'}-main-t${tier}-${STAGE}.png`),
        });
    }
    assert.ok(
        TRACE[1].tick > TRACE[0].tick && TRACE[2].tick > TRACE[1].tick,
        'main battle advances from flight through collision into the fuse explosion',
    );
    assert.ok(TRACE[2].boss.hp < TRACE[0].boss.hp, 'the actual battle damages its target');
    REPORT.push({ kind: 'main-farm-combat', viewport: mobile ? 'mobile' : 'desktop', tier, trace: TRACE });
}

try {
    for (const MOBILE of [false, true]) {
        const CONTEXT = await BROWSER.newContext({
                viewport: MOBILE ? { width: 390, height: 844 } : { width: 1100, height: 850 },
                isMobile: MOBILE,
                hasTouch: MOBILE,
                deviceScaleFactor: 1,
            }),
            PAGE = await CONTEXT.newPage();
        PAGE.setDefaultTimeout(12000);
        PAGE.on('pageerror', (error) => ERRORS.push(String(error)));
        PAGE.on('console', (message) => {
            if (message.text().includes('loop stopped')) {
                ERRORS.push(message.text());
            }
        });
        await CONTEXT.route(/cdn\.jsdelivr\.net\/gh\/byh-playground\/bloom-gamekit@[0-9a-f]+\/(.*)/, (route) => {
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
        await PAGE.goto(GAME_URL);
        await PAGE.waitForFunction(() => globalThis.BUDMORI);
        await activate(PAGE.locator('#newGame'), MOBILE);
        await openCorn(PAGE, MOBILE);
        assert.equal(await PAGE.locator('[data-growth-node]').count(), 11);
        assert.match(await PAGE.locator('[data-growth-wallet]').textContent(), /총\s*1P/);
        assert.equal(await node(PAGE, 'evolution-2').getAttribute('aria-disabled'), 'true');
        assert.match(await PAGE.locator('[data-growth-node="evolution-2"]').textContent(), /숙련 Lv.2/);
        await purchase(PAGE, 'basic-1', MOBILE);
        assert.equal(await node(PAGE, 'basic-2').getAttribute('aria-disabled'), 'true');
        await activate(PAGE.locator('[data-ability-action="reset"]'), MOBILE);
        await PAGE.waitForFunction(
            () => document.querySelector('[data-growth-node="basic-1"] .growth-rank')?.textContent === '0/10',
        );
        // Existing earned-save scenario: no investment is pre-applied. The player chooses it below.
        await PAGE.evaluate(() => {
            const WORLD = BUDMORI.sim,
                CORN = WORLD.playerProgression.abilities['corn-kernel-chain'];
            CORN.masteryLevel = 50;
            CORN.masteryXp = 125;
            WORLD.spawn(1, 6, 1, 0);
            WORLD.markProgressChanged();
            BUDMORI.storage.save(WORLD);
        });
        await activate(PAGE.locator('[data-ability-species="0"]'), MOBILE);
        assert.equal(await PAGE.locator('[data-growth-tree]').count(), 0, 'unreleased species keeps its legacy tree');
        await activate(PAGE.locator('[data-ability-species="1"]'), MOBILE);
        assert.match(await PAGE.locator('[data-growth-wallet]').textContent(), /총\s*50P/);
        assert.match(await PAGE.locator('[data-growth-form]').textContent(), /합성 등급 T6.*연구 형태 T1/s);
        assert.equal(await node(PAGE, 'evolution-3').getAttribute('aria-disabled'), 'true');
        for (let tier = 2; tier <= 6; tier++) {
            await purchase(PAGE, `evolution-${tier}`, MOBILE);
        }
        await purchase(PAGE, 'specialty-3', MOBILE);
        assert.match(await PAGE.locator('[data-growth-wallet]').textContent(), /사용\s*12P/);
        assert.match(await PAGE.locator('[data-growth-form]').textContent(), /연구 형태 T6/);
        if (MOBILE) {
            await PAGE.locator('#abilityNodes').evaluate((element) => {
                element.scrollTop = 0;
            });
            const CDP = await CONTEXT.newCDPSession(PAGE),
                BOX = await PAGE.locator('#abilityNodes').boundingBox(),
                X = BOX.x + BOX.width * 0.7,
                Y = Math.min(BOX.y + BOX.height - 30, 760);
            await CDP.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: X, y: Y }] });
            for (const DELTA of [30, 80, 140, 210]) {
                await CDP.send('Input.dispatchTouchEvent', {
                    type: 'touchMove',
                    touchPoints: [{ x: X, y: Y - DELTA }],
                });
            }
            await CDP.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
            await PAGE.waitForTimeout(150);
            assert.ok(
                await PAGE.locator('#abilityNodes').evaluate((element) => element.scrollTop > 0),
                'actual touch scroll',
            );
            assert.ok(
                await PAGE.locator('#abilityNodes').evaluate((element) => element.scrollWidth <= element.clientWidth),
                'no horizontal overflow at 390px',
            );
        }
        await PAGE.locator('[data-growth-wallet]').scrollIntoViewIfNeeded();
        await PAGE.screenshot({ path: path.join(OUTPUT, MOBILE ? 'mobile-tree.png' : 'desktop-tree.png') });
        for (const TIER of MOBILE ? [1, 5, 6] : [1, 2, 3, 4, 5, 6]) {
            await preview(PAGE, TIER, MOBILE);
        }
        await activate(PAGE.locator('[data-ability-species="0"]'), MOBILE);
        assert.equal(await PAGE.locator('.corn-evolution-preview iframe').count(), 0, 'tab change disposes preview');
        await activate(PAGE.locator('[data-ability-species="1"]'), MOBILE);
        await activate(PAGE.locator('#gameMenuClose'), MOBILE);
        await PAGE.reload();
        await PAGE.waitForFunction(() => globalThis.BUDMORI?.sim?.scene === 'farm');
        if (await PAGE.locator('#abilityPanel').isHidden()) {
            await openCorn(PAGE, MOBILE);
        } else {
            await activate(PAGE.locator('[data-ability-species="1"]'), MOBILE);
        }
        assert.match(await PAGE.locator('[data-growth-wallet]').textContent(), /사용\s*12P/);
        assert.match(await PAGE.locator('.ability-tree__progress').textContent(), /125.*누적 XP/s);
        await activate(PAGE.locator('[data-ability-action="reset"]'), MOBILE);
        await PAGE.waitForFunction(() =>
            document.querySelector('[data-growth-wallet]')?.textContent.includes('사용 0P'),
        );
        assert.match(await PAGE.locator('.ability-tree__progress').textContent(), /125.*누적 XP/s);
        await purchase(PAGE, 'basic-2', MOBILE);
        await activate(PAGE.locator('#gameMenuClose'), MOBILE);
        await activate(PAGE.locator('#bossChallenge'), MOBILE);
        if (await PAGE.locator('#deckDialog').isVisible()) {
            await activate(PAGE.locator('#deckGo'), MOBILE);
        }
        await PAGE.waitForFunction(() => BUDMORI.sim.tower.active);
        for (const PHASE of ['marching', 'fighting']) {
            await PAGE.waitForFunction((phase) => BUDMORI.sim.farmBossEvent.phase === phase, PHASE);
            await PAGE.evaluate(() => {
                globalThis.__cornRunBeforeHome = {
                    world: BUDMORI.sim,
                    snapshot: JSON.stringify(BUDMORI.sim.runProgressionSnapshot),
                    phase: BUDMORI.sim.farmBossEvent.phase,
                };
                location.hash = '#/';
            });
            await PAGE.locator('#startScreen').waitFor({ state: 'visible' });
            await activate(PAGE.locator('#continueGame'), MOBILE);
            assert.equal(
                await PAGE.evaluate(() => BUDMORI.sim === globalThis.__cornRunBeforeHome.world),
                true,
                `${PHASE} Home→Continue keeps the live memory run`,
            );
            assert.equal(
                await PAGE.evaluate(
                    () =>
                        JSON.stringify(BUDMORI.sim.runProgressionSnapshot) === globalThis.__cornRunBeforeHome.snapshot,
                ),
                true,
                'Home→Continue keeps the initial investment snapshot',
            );
            assert.equal(await PAGE.evaluate(() => BUDMORI.sim.tower.active), true);
        }
        await openCorn(PAGE, MOBILE);
        assert.equal(
            await node(PAGE, 'basic-2').getAttribute('aria-disabled'),
            'true',
            'investment locked in a live run',
        );
        assert.equal(await PAGE.locator('[data-ability-action="reset"]').getAttribute('aria-disabled'), 'true');
        await PAGE.reload();
        await PAGE.waitForFunction(() => globalThis.BUDMORI?.sim?.scene === 'farm');
        assert.equal(
            await PAGE.evaluate(() => BUDMORI.sim.tower.active),
            false,
            'disk reload returns to farm, not a new run-resume feature',
        );
        for (const TIER of [1, 5, 6]) {
            await captureMainCombat(PAGE, TIER, MOBILE);
        }
        assert.deepEqual(ERRORS, []);
        console.log(
            `PASS corn growth ${MOBILE ? 'mobile touch 390px' : 'desktop'}: locked Lv1, purchases, research, isolated real previews, scroll, reset, save/reload, live-run lock`,
        );
        await CONTEXT.close();
    }
} finally {
    fs.writeFileSync(path.join(OUTPUT, 'report.json'), JSON.stringify({ errors: ERRORS, previews: REPORT }, null, 2));
    await BROWSER.close();
    SERVER.close();
}
