// Returning player's fixed flow: inspect, invest, preview, reset, enter a run, and reload the farm.
// Fixtures supply an earned Lv50 save, not attack outcomes. All purchases use actual UI commands.
// Chromium SwiftShader plus pinned GameKit modules; touch emulation is not a physical-device claim.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const CASE = process.argv[2] || 'ui',
    VIEWPORT = process.argv[3] || 'desktop',
    VIEWPORT_SIZE =
        VIEWPORT === 'landscape'
            ? { width: 844, height: 390 }
            : VIEWPORT === 'mobile'
              ? { width: 390, height: 844 }
              : { width: 1100, height: 850 },
    STARTED = Date.now();
assert.ok(['ui', 'previews', 'battle', 'migration'].includes(CASE), 'case must be ui, previews, battle, or migration');
assert.ok(['desktop', 'mobile', 'landscape'].includes(VIEWPORT), 'viewport must be desktop, mobile, or landscape');

function progress(step) {
    console.log(`[pea ${CASE}/${VIEWPORT} +${((Date.now() - STARTED) / 1000).toFixed(1)}s] ${step}`);
}

const ROOT = fileURLToPath(new URL('../', import.meta.url)),
    OUTPUT = path.join(ROOT, 'tests/output/pea-growth'),
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
async function openPea(page, mobile) {
    await activate(page.locator('#upgradeMenu'), mobile);
    await activate(page.locator('#menuTabAbilities'), mobile);
    await activate(page.locator('[data-ability-species="0"]'), mobile);
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
async function settleCapturedFrame(frame) {
    await frame.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function resumeCapturedFrame(frame) {
    await frame.evaluate(() => {
        BUDMORI.runtime.loop.resetTiming();
        BUDMORI.runtime.paused = false;
    });
}

async function captureMotion(page, tier, label) {
    const TRACE = [];
    const STAGES = [
        { phase: 'windup', stage: null },
        ...([3, 5, 6].includes(tier)
            ? [{ phase: 'active', stage: 'rebound' }, ...(tier === 6 ? [{ phase: 'active', stage: 'charge' }] : [])]
            : [{ phase: 'active', stage: null }]),
        { phase: 'recover', stage: null },
    ];
    for (const { phase: PHASE, stage: STAGE } of STAGES) {
        await page.waitForFunction(
            ({ tier: expected, phase, stage }) => {
                const UNIT = globalThis.BUDMORI?.sim?.units[0];
                if (UNIT?.ability.action?.peaAttack?.form !== expected || UNIT.ability.phase !== phase) {
                    return false;
                }
                const PEA = UNIT.ability.action.peaAttack;
                if (phase === 'windup' && UNIT.ability.elapsed < PEA.windupSeconds * 0.65) {
                    return false;
                }
                if (stage && (PEA.stage !== stage || PEA.contactTick === null || PEA.stageProgress <= 0)) {
                    return false;
                }
                BUDMORI.runtime.paused = true;
                return true;
            },
            { tier, phase: PHASE, stage: STAGE },
            { timeout: 18000, polling: 'raf' },
        );
        await settleCapturedFrame(page);
        const STATE = await page.evaluate(() => {
            const WORLD = BUDMORI.sim,
                UNIT = WORLD.units[0],
                PEA = UNIT.ability.action.peaAttack;
            return {
                tick: WORLD.simulationTick,
                phase: UNIT.ability.phase,
                elapsed: UNIT.ability.elapsed,
                pea: structuredClone(PEA),
                x: UNIT.x,
                y: UNIT.y,
                z: UNIT.z,
                bossHp: WORLD.boss.hp,
                unitCount: WORLD.units.length,
                projectileCount: WORLD.projectiles.length,
                distance: Math.hypot(UNIT.x - WORLD.boss.x, UNIT.y - WORLD.boss.y),
                bossRadius: WORLD.boss.radius,
            };
        });
        assert.equal(STATE.z, 0, 'pea attacks stay grounded');
        assert.equal(STATE.unitCount, 1, 'one body, no clones');
        assert.equal(STATE.projectileCount, 0, 'no projectiles');
        assert.ok(STATE.distance >= STATE.bossRadius - 0.05, 'body stays outside boss center');
        TRACE.push(STATE);
        await page.screenshot({ path: path.join(OUTPUT, `${VIEWPORT}-${label}-t${tier}-${STAGE || PHASE}.png`) });
        assert.equal(await page.evaluate(() => BUDMORI.sim.simulationTick), STATE.tick, 'PNG matches paused trace');
        await resumeCapturedFrame(page);
    }
    assert.ok(TRACE.at(-1).bossHp < TRACE[0].bossHp, 'real contact damages the training boss');
    assert.ok(TRACE.at(-1).tick > TRACE[0].tick, 'animation advances');
    REPORT.push({ kind: label, tier, trace: TRACE });
}

async function preview(page, tier, mobile) {
    const BEFORE = await page.evaluate(() => JSON.stringify(BUDMORI.sim.playerProgression));
    await activate(page.locator(`[data-pea-preview-tier="${tier}"]`), mobile);
    const HANDLE = await page.locator('.pea-evolution-preview iframe').elementHandle(),
        FRAME = await HANDLE.contentFrame();
    await FRAME.waitForFunction(() => globalThis.BUDMORI?.sim?.units[0]?.species === 0);
    // Frame has no screenshot method: capture its owner page while retaining frame-local timing.
    FRAME.screenshot = (options) => page.screenshot(options);
    await captureMotion(FRAME, tier, 'preview');
    assert.equal(
        await page.evaluate(() => JSON.stringify(BUDMORI.sim.playerProgression)),
        BEFORE,
        'isolated preview never modifies farm progression',
    );
}

async function setupCombat(page, tier, mobile, researched = true) {
    await page.reload();
    await page.waitForFunction(() => globalThis.BUDMORI?.sim?.scene === 'farm');
    if (await page.locator('#gameMenuPanel').isVisible()) {
        await activate(page.locator('#gameMenuClose'), mobile);
    }
    await page.evaluate(
        async ({ tier: selectedTier, researched: fullResearch }) => {
            const { helpSceneById: HELP_SCENE_BY_ID } = await import('./src/help-scenes.js'),
                WORLD = BUDMORI.sim;
            HELP_SCENE_BY_ID(`pea-t${selectedTier}`).setup(WORLD);
            if (!fullResearch) {
                WORLD.playerProgression.abilities['pea-recovery-boost'].nodeRanks = {};
                WORLD.runProgressionSnapshot.abilities['pea-recovery-boost'].nodeRanks = {};
            }
            WORLD.configureBossStage(1, 6);
            Object.assign(WORLD.boss, { z: 0, hp: 1e10, maxHp: 1e10, stun: 10000 });
            WORLD.units[0].x = -(WORLD.boss.radius + 1.45);
            WORLD._unitSpatialDirty = true;
        },
        { tier, researched },
    );
}

async function assertCombatFraming(page) {
    const FRAME = await page.evaluate(() => {
        const RENDERER = BUDMORI.renderer,
            UNIT = BUDMORI.sim.units[0],
            POINT = RENDERER.project(UNIT.x, UNIT.y, UNIT.z),
            RATIO = RENDERER.pixelRatio,
            HUD = ['bossbar', 'allyHealthText', 'bossHealthText', 'fightRetreat'].map((id) => {
                const BOX = document.getElementById(id).getBoundingClientRect();
                return { id, x: BOX.x, y: BOX.y, right: BOX.right, bottom: BOX.bottom };
            });
        return { x: POINT.x / RATIO, y: POINT.y / RATIO, width: innerWidth, height: innerHeight, hud: HUD };
    });
    assert.ok(
        FRAME.x > 0 && FRAME.x < FRAME.width && FRAME.y > 0 && FRAME.y < FRAME.height,
        'attacking body stays in viewport',
    );
    for (const BOX of FRAME.hud) {
        assert.ok(
            BOX.x >= -1 && BOX.right <= FRAME.width + 1 && BOX.y >= -1 && BOX.bottom <= FRAME.height + 1,
            `${BOX.id} readable in ${VIEWPORT}`,
        );
    }
    return FRAME;
}

async function captureMainCombat(page, tier, mobile) {
    await setupCombat(page, tier, mobile);
    await captureMotion(page, tier, 'main');
    REPORT.at(-1).framing = await assertCombatFraming(page);
}

async function sampleCrowdedFrames(page, mobile, researched) {
    await setupCombat(page, 6, mobile, researched);
    const INITIAL = await page.evaluate((fullResearch) => {
        const WORLD = BUDMORI.sim,
            LIMIT = BUDMORI.CONFIG.farm.capacity.max;
        for (let index = 1; index < LIMIT; index++) {
            const SPECIES = index < 60 ? 0 : 1 + ((index - 60) % 8),
                ANGLE = index * 2.399963229728653,
                DISTANCE = WORLD.boss.radius + 2.8 + (index % 4) * 0.5,
                UNIT = WORLD.spawn(SPECIES, 6, Math.cos(ANGLE) * DISTANCE, Math.sin(ANGLE) * DISTANCE);
            UNIT.growth = 3;
            UNIT.growthElapsed = UNIT.growthDuration;
            UNIT.z = 0;
            UNIT.dropLanded = true;
        }
        WORLD._benched.clear();
        WORLD._benchRevision++;
        WORLD._unitSpatialDirty = true;
        return { count: WORLD.units.length, limit: LIMIT, researched: fullResearch };
    }, researched);
    assert.equal(INITIAL.limit, 200);
    assert.equal(INITIAL.count, 200, 'actual maximum mixed army');
    const FRAMES = await page.evaluate(async () => {
        const TIMES = [];
        let previous = await new Promise(requestAnimationFrame);
        for (let index = 0; index < 180; index++) {
            const NOW = await new Promise(requestAnimationFrame);
            if (index >= 60) {
                TIMES.push(NOW - previous);
            }
            previous = NOW;
        }
        return TIMES.sort((a, b) => a - b);
    });
    await page.screenshot({
        path: path.join(OUTPUT, `${VIEWPORT}-mixed200-${researched ? 'evolved' : 'baseline'}.png`),
    });
    return { initial: INITIAL, p95: FRAMES[Math.ceil(FRAMES.length * 0.95) - 1], frames: FRAMES };
}

async function captureInterruptedCombo(page, mobile) {
    await setupCombat(page, 6, mobile);
    await page.waitForFunction(
        () => {
            const UNIT = BUDMORI.sim.units[0];
            if (
                UNIT.ability.phase !== 'active' ||
                UNIT.ability.action?.peaAttack?.contactTick == null ||
                BUDMORI.sim.simulationTick <= UNIT.ability.action.peaAttack.contactTick
            ) {
                return false;
            }
            BUDMORI.runtime.paused = true;
            return true;
        },
        null,
        { polling: 'raf' },
    );
    await settleCapturedFrame(page);
    const BEFORE = await page.evaluate(() => {
        globalThis.__peaCheckpoint = { world: BUDMORI.sim, action: BUDMORI.sim.units[0].ability.action };
        return {
            hp: BUDMORI.sim.boss.hp,
            hits: BUDMORI.sim.notices.filter(
                (event) => event.kind === 'boss-hit' && event.attackId === globalThis.__peaCheckpoint.action.id,
            ),
            numbers: BUDMORI.combatFeel.counts.numbers,
        };
    });
    assert.equal(BEFORE.hits.length, 1, 'checkpoint after first visible collision');
    await page.evaluate(() => {
        location.hash = '#/';
    });
    await page.locator('#startScreen').waitFor({ state: 'visible' });
    await page.waitForTimeout(250);
    assert.equal(await page.evaluate(() => BUDMORI.sim.boss.hp), BEFORE.hp, 'Home pauses the combo');
    await activate(page.locator('#continueGame'), mobile);
    await page.waitForFunction(
        () => {
            if (BUDMORI.sim.units[0].ability.phase !== 'recover' || BUDMORI.sim.units[0].ability.elapsed < 0.05) {
                return false;
            }
            BUDMORI.runtime.paused = true;
            return true;
        },
        null,
        { polling: 'raf' },
    );
    await settleCapturedFrame(page);
    const AFTER = await page.evaluate(() => ({
        sameWorld: BUDMORI.sim === globalThis.__peaCheckpoint.world,
        sameAction: BUDMORI.sim.units[0].ability.action === globalThis.__peaCheckpoint.action,
        hits: BUDMORI.sim.notices.filter(
            (event) => event.kind === 'boss-hit' && event.attackId === globalThis.__peaCheckpoint.action.id,
        ),
        numbers: BUDMORI.combatFeel.counts.numbers,
    }));
    assert.equal(AFTER.sameWorld, true);
    assert.equal(AFTER.sameAction, true);
    assert.equal(AFTER.hits.length, 3, 'Home→Continue completes exactly three collisions, not replayed first contact');
    assert.equal(new Set(AFTER.hits.map((event) => event.sequence)).size, 3);
    assert.equal(AFTER.numbers - BEFORE.numbers, 2, 'remaining two hits produce exactly two visible damage numbers');
    await page.screenshot({ path: path.join(OUTPUT, `${VIEWPORT}-home-continue-combo.png`) });
    REPORT.push({ kind: 'home-continue-combo', before: BEFORE, after: AFTER });
    await resumeCapturedFrame(page);
}

async function importCornReleaseSave(page, mobile) {
    // Static source was encoded and validated by the released 0.31.0 implementation,
    // not generated by the new migration code under test.
    const FILE = path.join(ROOT, 'tests/fixtures/corn-0.31.0-pea-legacy.json'),
        RAW = fs.readFileSync(FILE, 'utf8'),
        SOURCE = JSON.parse(RAW),
        EXPECTED_CORN = SOURCE.progress.player.abilities['corn-kernel-chain'],
        EXPECTED_LEGACY_PEA = SOURCE.progress.player.abilities['pea-recovery-boost'];
    assert.equal(SOURCE.productVersion, '0.31.0');
    await page.evaluate(() => {
        location.hash = '#/';
    });
    await page.locator('#startScreen').waitFor({ state: 'visible' });
    const CHOOSER_PROMISE = page.waitForEvent('filechooser');
    await activate(page.locator('#importSave'), mobile);
    await (await CHOOSER_PROMISE).setFiles(FILE);
    await page.locator('#importConfirm').waitFor({ state: 'visible' });
    await activate(page.locator('#confirmImport'), mobile);
    await page.locator('#importConfirm').waitFor({ state: 'hidden' });
    await activate(page.locator('#continueGame'), mobile);
    await openPea(page, mobile);
    assert.match(await page.locator('[data-growth-refund]').textContent(), /환급 완료/);
    assert.match(await page.locator('[data-growth-wallet]').textContent(), /총\s*50P.*사용\s*0P.*남음\s*50P/s);
    assert.match(await page.locator('.ability-tree__progress').textContent(), /123.3.*누적 XP/s);
    const READ_STATE = async () =>
        page.evaluate(() => ({
            pea: BUDMORI.sim.playerProgression.abilities['pea-recovery-boost'],
            corn: BUDMORI.sim.playerProgression.abilities['corn-kernel-chain'],
            source: localStorage.getItem('bloom-weapon-cards-v4:species-tree-source-v3'),
            prior: localStorage.getItem('bloom-weapon-cards-v4:species-tree-prior-source-v3'),
            imported: localStorage.getItem('bloom-weapon-cards-v4:import-source'),
        }));
    const FIRST = await READ_STATE();
    assert.deepEqual(FIRST.corn, EXPECTED_CORN, 'corn ranks, mastery, XP and archived investment remain exact');
    assert.deepEqual(FIRST.pea.legacyInvestment, EXPECTED_LEGACY_PEA);
    assert.deepEqual(FIRST.pea.nodeRanks, {});
    assert.equal(FIRST.source, RAW, 'migration backup is byte-for-byte imported source');
    assert.equal(FIRST.imported, RAW);
    await page.screenshot({ path: path.join(OUTPUT, `${VIEWPORT}-import-pea-refund.png`) });
    await activate(page.locator('[data-ability-species="1"]'), mobile);
    assert.match(await page.locator('[data-growth-node="basic-1"] .growth-rank').textContent(), /4\/10/);
    assert.match(await page.locator('[data-growth-node="specialty-2"] .growth-rank').textContent(), /3\/5/);
    await activate(page.locator('#gameMenuClose'), mobile);
    for (let reload = 1; reload <= 2; reload++) {
        await page.reload();
        await page.waitForFunction(() => globalThis.BUDMORI?.sim?.scene === 'farm');
        assert.deepEqual(await READ_STATE(), FIRST, `reload ${reload}: no repeat refund or migration backup rotation`);
    }
    REPORT.push({
        kind: 'corn-release-import',
        productVersion: SOURCE.productVersion,
        pea: FIRST.pea,
        corn: FIRST.corn,
        reloads: 2,
    });
}

async function captureCrowdedCombat(page, mobile) {
    const BASELINE = await sampleCrowdedFrames(page, mobile, false),
        EVOLVED = await sampleCrowdedFrames(page, mobile, true),
        RATIO = EVOLVED.p95 / BASELINE.p95;
    REPORT.push({ kind: 'maximum-mixed-performance', baseline: BASELINE, evolved: EVOLVED, ratio: RATIO });
    assert.ok(RATIO <= 1.2, `200-unit p95 regressed by ${((RATIO - 1) * 100).toFixed(1)}%; investigate >20%`);
}

try {
    for (const MOBILE of [VIEWPORT !== 'desktop']) {
        const CONTEXT = await BROWSER.newContext({
                viewport: VIEWPORT_SIZE,
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
        progress('new farm ready');
        if (CASE === 'migration') {
            await importCornReleaseSave(PAGE, MOBILE);
            assert.deepEqual(ERRORS, []);
            progress('PASS literal 0.31.0 import, species refund, corn preservation, two reloads and stable backup');
            await CONTEXT.close();
            continue;
        }
        if (CASE === 'battle') {
            for (const TIER of [1, 3, 6, 2, 4, 5]) {
                progress(`main battle T${TIER} start`);
                await captureMainCombat(PAGE, TIER, MOBILE);
                progress(`main battle T${TIER} grounded windup/contact/recovery captured`);
            }
            await captureInterruptedCombo(PAGE, MOBILE);
            await captureCrowdedCombat(PAGE, MOBILE);
            assert.deepEqual(ERRORS, []);
            progress('PASS main battle capture flow');
            await CONTEXT.close();
            continue;
        }
        await openPea(PAGE, MOBILE);
        progress('pea tree open');
        if (CASE === 'previews') {
            for (const TIER of [1, 2, 3, 4, 5, 6]) {
                progress(`isolated preview T${TIER} start`);
                await preview(PAGE, TIER, MOBILE);
                progress(`isolated preview T${TIER} captured`);
            }
            await activate(PAGE.locator('[data-ability-species="1"]'), MOBILE);
            assert.equal(await PAGE.locator('.pea-evolution-preview iframe').count(), 0, 'tab change disposes preview');
            assert.deepEqual(ERRORS, []);
            progress('PASS isolated preview flow');
            await CONTEXT.close();
            continue;
        }
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
        progress('Lv1 purchase, locks and reset verified');
        // Existing earned-save scenario: no investment is pre-applied. The player chooses it below.
        await PAGE.evaluate(() => {
            const WORLD = BUDMORI.sim,
                PEA = WORLD.playerProgression.abilities['pea-recovery-boost'];
            PEA.masteryLevel = 50;
            PEA.masteryXp = 125;
            WORLD.spawn(0, 6, 1, 0);
            WORLD.markProgressChanged();
            BUDMORI.storage.save(WORLD);
        });
        await activate(PAGE.locator('[data-ability-species="2"]'), MOBILE);
        assert.equal(await PAGE.locator('[data-growth-tree]').count(), 0, 'unreleased species keeps its legacy tree');
        await activate(PAGE.locator('[data-ability-species="0"]'), MOBILE);
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
                Y = Math.min(BOX.y + BOX.height - 30, VIEWPORT_SIZE.height - 30);
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
                'no horizontal overflow in touch viewport',
            );
        }
        await PAGE.locator('[data-growth-wallet]').scrollIntoViewIfNeeded();
        await PAGE.screenshot({ path: path.join(OUTPUT, `${VIEWPORT}-tree.png`) });
        progress('Lv50 evolution/specialty purchases and scrolling verified');
        await activate(PAGE.locator('[data-ability-species="1"]'), MOBILE);
        assert.equal(await PAGE.locator('.pea-evolution-preview iframe').count(), 0, 'tab change disposes preview');
        await activate(PAGE.locator('[data-ability-species="0"]'), MOBILE);
        await activate(PAGE.locator('#gameMenuClose'), MOBILE);
        await PAGE.reload();
        await PAGE.waitForFunction(() => globalThis.BUDMORI?.sim?.scene === 'farm');
        if (await PAGE.locator('#abilityPanel').isHidden()) {
            await openPea(PAGE, MOBILE);
        } else {
            await activate(PAGE.locator('[data-ability-species="0"]'), MOBILE);
        }
        assert.match(await PAGE.locator('[data-growth-wallet]').textContent(), /사용\s*12P/);
        assert.match(await PAGE.locator('.ability-tree__progress').textContent(), /125.*누적 XP/s);
        await activate(PAGE.locator('[data-ability-action="reset"]'), MOBILE);
        await PAGE.waitForFunction(() =>
            document.querySelector('[data-growth-wallet]')?.textContent.includes('사용 0P'),
        );
        assert.match(await PAGE.locator('.ability-tree__progress').textContent(), /125.*누적 XP/s);
        progress('save/reload and free reset preserve mastery');
        await purchase(PAGE, 'basic-2', MOBILE);
        await activate(PAGE.locator('#gameMenuClose'), MOBILE);
        await activate(PAGE.locator('#bossChallenge'), MOBILE);
        if (await PAGE.locator('#deckDialog').isVisible()) {
            await activate(PAGE.locator('#deckGo'), MOBILE);
        }
        await PAGE.waitForFunction(() => BUDMORI.sim.tower.active);
        for (const PHASE of ['marching', 'fighting']) {
            progress(`waiting for ${PHASE}`);
            await PAGE.waitForFunction((phase) => BUDMORI.sim.farmBossEvent.phase === phase, PHASE);
            progress(`${PHASE} Home→Continue start`);
            await PAGE.evaluate(() => {
                globalThis.__peaRunBeforeHome = {
                    world: BUDMORI.sim,
                    snapshot: JSON.stringify(BUDMORI.sim.runProgressionSnapshot),
                    phase: BUDMORI.sim.farmBossEvent.phase,
                };
                location.hash = '#/';
            });
            await PAGE.locator('#startScreen').waitFor({ state: 'visible' });
            await activate(PAGE.locator('#continueGame'), MOBILE);
            assert.equal(
                await PAGE.evaluate(() => BUDMORI.sim === globalThis.__peaRunBeforeHome.world),
                true,
                `${PHASE} Home→Continue keeps the live memory run`,
            );
            assert.equal(
                await PAGE.evaluate(
                    () => JSON.stringify(BUDMORI.sim.runProgressionSnapshot) === globalThis.__peaRunBeforeHome.snapshot,
                ),
                true,
                'Home→Continue keeps the initial investment snapshot',
            );
            assert.equal(await PAGE.evaluate(() => BUDMORI.sim.tower.active), true);
        }
        await openPea(PAGE, MOBILE);
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
        progress('Home/Continue, live-run locks and disk farm return verified');
        assert.deepEqual(ERRORS, []);
        console.log(
            `PASS pea growth ${MOBILE ? 'mobile touch 390px' : 'desktop'}: locked Lv1, purchases, research, scroll, reset, save/reload, live-run lock`,
        );
        await CONTEXT.close();
    }
} finally {
    fs.writeFileSync(
        path.join(OUTPUT, `report-${CASE}-${VIEWPORT}.json`),
        JSON.stringify(
            {
                case: CASE,
                viewport: VIEWPORT,
                viewportSize: VIEWPORT_SIZE,
                elapsedMs: Date.now() - STARTED,
                errors: ERRORS,
                captures: REPORT,
            },
            null,
            2,
        ),
    );
    await BROWSER.close();
    SERVER.close();
}
