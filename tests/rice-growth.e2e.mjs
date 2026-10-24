// One focused real-input growth flow; motion/combat validation is separate, not a copied matrix.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = fileURLToPath(new URL('../', import.meta.url)),
    VIEWPORT = process.argv[2] || 'desktop',
    MOBILE = VIEWPORT !== 'desktop',
    SIZE =
        VIEWPORT === 'mobile'
            ? { width: 390, height: 844 }
            : VIEWPORT === 'landscape'
              ? { width: 844, height: 390 }
              : { width: 1100, height: 850 },
    OUTPUT = path.join(ROOT, 'tests/output/rice-growth'),
    TYPES = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.svg': 'image/svg+xml',
    },
    MANIFEST = JSON.parse(
        fs
            .readFileSync(path.join(ROOT, 'index.html'), 'utf8')
            .match(/<script id="bloom-runtime-manifest" type="application\/json">(.*?)<\/script>/s)[1],
    ),
    MODULES = new Map(
        MANIFEST.modules.map((entry) => [
            entry.url,
            fs.readFileSync(path.join(ROOT, 'vendor/upstream', `${entry.name}.js`)),
        ]),
    ),
    ERRORS = [],
    REPORT = { status: 'running', viewport: VIEWPORT, checks: [] },
    SERVER = http.createServer((request, response) => {
        const FILE = path.resolve(ROOT, '.' + decodeURIComponent(request.url.split('?')[0]));
        if (!FILE.startsWith(path.resolve(ROOT) + path.sep) || !fs.existsSync(FILE) || !fs.statSync(FILE).isFile()) {
            response.writeHead(404).end();
            return;
        }
        response.setHeader('content-type', TYPES[path.extname(FILE)] || 'application/octet-stream');
        response.end(fs.readFileSync(FILE));
    });
assert.ok(['desktop', 'mobile', 'landscape'].includes(VIEWPORT));
fs.mkdirSync(OUTPUT, { recursive: true });
let browser, page;
async function activate(locator) {
    await (MOBILE ? locator.tap() : locator.click());
}
async function openTree() {
    if (!(await page.locator('#gameMenuOverlay').isVisible())) {
        await activate(page.locator('#upgradeMenu'));
    }
    // upgradeMenu already opens the abilities panel, including its locked run view.
    // Do not click the redundant tab: it may be disabled while the panel is selected.
    assert.equal(await page.locator('#menuTabAbilities').getAttribute('aria-selected'), 'true');
    assert.equal(await page.locator('#abilityPanel').isVisible(), true);
    await activate(page.locator('[data-ability-species="6"]'));
    await page.locator('[data-growth-tree]').waitFor();
}
async function installInputDiagnostics() {
    await page.evaluate(() => {
        const EVENTS = [],
            READ = () => {
                const RUNTIME = globalThis.BUDMORI?.runtime,
                    WORLD = globalThis.BUDMORI?.sim;
                return {
                    time: performance.now(),
                    tick: WORLD?.simulationTick,
                    runtimeTick: RUNTIME?.tick,
                    paused: RUNTIME?.paused,
                    closed: RUNTIME?.closed,
                    scene: WORLD?.scene,
                    selectedSpecies: document.getElementById('abilityPanel')?.dataset.selectedSpecies,
                    abilityClickHandler: typeof document.getElementById('abilityNodes')?.onclick,
                    animations: document.getAnimations().map((animation) => ({
                        state: animation.playState,
                        time: animation.currentTime,
                        target: animation.effect?.target?.id,
                    })),
                    build: structuredClone(WORLD?.playerProgression?.abilities?.['rice-low-health-harvest']),
                    pending: structuredClone(RUNTIME?.pending || []),
                    wallet: document.querySelector('[data-growth-wallet]')?.textContent,
                    nodes: [...document.querySelectorAll('[data-growth-node]')].map((node) => ({
                        id: node.dataset.growthNode,
                        rank: node.querySelector('.growth-rank')?.textContent,
                        disabled: node.querySelector('button')?.getAttribute('aria-disabled'),
                    })),
                };
            },
            RECORD = (kind, detail = {}) => {
                EVENTS.push({ kind, ...detail, state: READ() });
                if (EVENTS.length > 120) {
                    EVENTS.shift();
                }
            };
        globalThis.__riceUiProbe = { events: EVENTS, read: READ, record: RECORD };
        for (const TYPE of ['pointerdown', 'pointerup', 'click']) {
            for (const CAPTURE of [true, false]) {
                document.addEventListener(
                    TYPE,
                    (event) => {
                        const TARGET = event.target,
                            BUTTON = TARGET.closest?.('button'),
                            HIT = document.elementFromPoint(event.clientX, event.clientY);
                        RECORD(`${TYPE}:${CAPTURE ? 'capture' : 'bubble'}`, {
                            targetTag: TARGET.tagName,
                            targetId: TARGET.id,
                            buttonId: BUTTON?.id,
                            node: BUTTON?.dataset.abilityNode,
                            action: BUTTON?.dataset.abilityAction,
                            targetConnected: TARGET.isConnected,
                            buttonBox: BUTTON?.getBoundingClientRect().toJSON(),
                            handlerInPath: event.composedPath().includes(document.getElementById('abilityNodes')),
                            buttonDisabled: BUTTON?.getAttribute('aria-disabled'),
                            hitTag: HIT?.tagName,
                            hitId: HIT?.id,
                            trusted: event.isTrusted,
                            prevented: event.defaultPrevented,
                            x: event.clientX,
                            y: event.clientY,
                        });
                    },
                    { capture: CAPTURE, passive: true },
                );
            }
        }
        new MutationObserver(() => RECORD('ability-dom-replaced')).observe(document.getElementById('abilityNodes'), {
            childList: true,
            subtree: true,
        });
    });
}
async function observeCommandResults() {
    await page.evaluate(() => {
        const RUNTIME = BUDMORI.runtime,
            ORIGINAL = RUNTIME.command;
        // Observe the existing command outcome without changing, retrying or adding any command.
        RUNTIME.command = function (...args) {
            const RESULT = ORIGINAL.apply(this, args);
            if (args[0]?.type?.startsWith('progression-')) {
                globalThis.__riceUiProbe.record('command-result', {
                    command: structuredClone(args[0]),
                    result: RESULT,
                });
            }
            return RESULT;
        };
    });
}
async function settleAbilityRedraw() {
    // The real ability handler schedules a full panel replacement after180ms.
    // Let that existing callback and its paint finish before another actual input.
    await page.evaluate(async () => {
        await new Promise((resolve) => setTimeout(resolve, 220));
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
}
const NODE = (id) => page.locator(`[data-growth-node="${id}"] button`);
async function purchase(id) {
    const BEFORE = await page.evaluate(
        (nodeId) => BUDMORI.sim.playerProgression.abilities['rice-low-health-harvest'].nodeRanks[nodeId] || 0,
        id,
    );
    // A queued reset/purchase can update the model before the panel redraws.
    // Require agreement before clicking, then require exactly one rank in both owners.
    await page.waitForFunction(
        ({ id, rank }) => {
            const LABEL = document.querySelector(`[data-growth-node="${id}"] .growth-rank`)?.textContent;
            return (
                (BUDMORI.sim.playerProgression.abilities['rice-low-health-harvest'].nodeRanks[id] || 0) === rank &&
                LABEL?.split('/')[0] === String(rank) &&
                document.querySelector(`[data-growth-node="${id}"] button`)?.getAttribute('aria-disabled') === 'false'
            );
        },
        { id, rank: BEFORE },
    );
    await page.evaluate(
        ({ id, rank }) => globalThis.__riceUiProbe.record('purchase-before-input', { id, expectedRank: rank }),
        { id, rank: BEFORE + 1 },
    );
    await activate(NODE(id));
    await settleAbilityRedraw();
    await page.evaluate((nodeId) => globalThis.__riceUiProbe.record('purchase-after-redraw', { id: nodeId }), id);
    await page.waitForFunction(
        ({ id, rank }) =>
            BUDMORI.sim.playerProgression.abilities['rice-low-health-harvest'].nodeRanks[id] === rank &&
            document.querySelector(`[data-growth-node="${id}"] .growth-rank`)?.textContent?.split('/')[0] ===
                String(rank),
        { id, rank: BEFORE + 1 },
    );
}
try {
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
        viewport: SIZE,
        isMobile: MOBILE,
        hasTouch: MOBILE,
        deviceScaleFactor: 1,
        serviceWorkers: 'block',
    });
    page = await CONTEXT.newPage();
    page.setDefaultTimeout(20000);
    page.on('pageerror', (error) => ERRORS.push(String(error)));
    page.on('console', (message) => {
        if (message.text().includes('loop stopped')) {
            ERRORS.push(message.text());
        }
    });
    await CONTEXT.route('**/*', (route) => {
        const URL = route.request().url();
        if (URL.startsWith(`${ORIGIN}/`)) {
            return route.continue();
        }
        if (MODULES.has(URL)) {
            return route.fulfill({
                body: MODULES.get(URL),
                contentType: 'text/javascript',
                headers: { 'access-control-allow-origin': '*' },
            });
        }
        ERRORS.push(`Unexpected network: ${URL}`);
        return route.abort();
    });
    await page.goto(`${ORIGIN}/index.html`);
    await page.waitForFunction(() => globalThis.BUDMORI);
    await installInputDiagnostics();
    await activate(page.locator('#newGame'));
    await observeCommandResults();
    await openTree();
    assert.equal(await page.locator('[data-growth-node]').count(), 11);
    assert.equal(await page.locator('[data-rice-preview-tier]').count(), 6);
    assert.match(await page.locator('[data-growth-wallet]').textContent(), /총\s*1P/);
    assert.equal(await NODE('evolution-2').getAttribute('aria-disabled'), 'true');
    await purchase('basic-1');
    assert.equal(await NODE('basic-2').getAttribute('aria-disabled'), 'true');
    await activate(page.locator('[data-ability-action="reset"]'));
    await settleAbilityRedraw();
    await page.waitForFunction(
        () => document.querySelector('[data-growth-node="basic-1"] .growth-rank')?.textContent === '0/10',
    );
    REPORT.checks.push('Lv1 budget, research lock, purchase and free reset');
    // Supply earned progress, not purchases or attack results. All investments below use real inputs.
    await page.evaluate(() => {
        const WORLD = BUDMORI.sim,
            BUILD = WORLD.playerProgression.abilities['rice-low-health-harvest'];
        BUILD.masteryLevel = 50;
        BUILD.masteryXp = 125;
        WORLD.spawn(6, 6, 1, 0);
        WORLD.markProgressChanged();
        BUDMORI.storage.save(WORLD);
    });
    await activate(page.locator('[data-ability-species="7"]'));
    assert.equal(await page.locator('[data-growth-tree]').count(), 0, 'wheat retains legacy UI');
    await activate(page.locator('[data-ability-species="6"]'));
    assert.equal(await NODE('evolution-3').getAttribute('aria-disabled'), 'true');
    for (let tier = 2; tier <= 6; tier++) {
        await purchase(`evolution-${tier}`);
    }
    await purchase('specialty-2');
    await purchase('basic-2');
    assert.match(await page.locator('[data-growth-wallet]').textContent(), /사용\s*13P/);
    assert.match(await page.locator('[data-growth-form]').textContent(), /연구 형태 T6/);
    await page.locator('[data-growth-wallet]').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(OUTPUT, `${VIEWPORT}-tree.png`) });
    const BEFORE = await page.evaluate(() =>
        structuredClone(BUDMORI.sim.playerProgression.abilities['rice-low-health-harvest']),
    );
    await page.reload();
    await page.waitForFunction(() => globalThis.BUDMORI?.sim?.scene === 'farm');
    await installInputDiagnostics();
    await observeCommandResults();
    assert.deepEqual(
        await page.evaluate(() => BUDMORI.sim.playerProgression.abilities['rice-low-health-harvest']),
        BEFORE,
    );
    await openTree();
    await activate(page.locator('[data-ability-action="reset"]'));
    await settleAbilityRedraw();
    await page.waitForFunction(
        () =>
            Object.keys(BUDMORI.sim.playerProgression.abilities['rice-low-health-harvest'].nodeRanks).length === 0 &&
            document.querySelector('[data-growth-node="basic-2"] .growth-rank')?.textContent === '0/10' &&
            [...document.querySelectorAll('[data-growth-node] .growth-rank')].every(
                (label) => label.textContent.split('/')[0] === '0',
            ),
    );
    assert.equal(
        await page.evaluate(() => BUDMORI.sim.playerProgression.abilities['rice-low-health-harvest'].masteryXp),
        125,
    );
    await purchase('basic-2');
    REPORT.checks.push('Lv50 evolution/specialty/HP purchase, legacy wheat, save/reload and mastery-preserving reset');
    await activate(page.locator('#gameMenuClose'));
    await activate(page.locator('#bossChallenge'));
    if (await page.locator('#deckDialog').isVisible()) {
        await activate(page.locator('#deckGo'));
    }
    await page.waitForFunction(() => BUDMORI.sim.tower.active);
    const SNAPSHOT = await page.evaluate(() => JSON.stringify(BUDMORI.sim.runProgressionSnapshot)),
        RUN_BUILD = await page.evaluate(() =>
            structuredClone(BUDMORI.sim.playerProgression.abilities['rice-low-health-harvest']),
        );
    await openTree();
    const TAB_DISABLED = await page.locator('#menuTabAbilities').isDisabled();
    assert.equal(await page.locator('#menuTabAbilities').getAttribute('aria-selected'), 'true');
    assert.equal(await NODE('basic-2').getAttribute('aria-disabled'), 'true');
    assert.equal(await page.locator('[data-ability-action="reset"]').getAttribute('aria-disabled'), 'true');
    assert.deepEqual(
        await page.evaluate(() => BUDMORI.sim.playerProgression.abilities['rice-low-health-harvest']),
        RUN_BUILD,
        'opening the real locked upgrade menu cannot change live investment',
    );
    REPORT.runMenu = { abilitiesTabDisabled: TAB_DISABLED, selected: true, purchaseLocked: true, resetLocked: true };
    assert.equal(await page.evaluate(() => JSON.stringify(BUDMORI.sim.runProgressionSnapshot)), SNAPSHOT);
    await page.reload();
    await page.waitForFunction(() => globalThis.BUDMORI?.sim?.scene === 'farm');
    await installInputDiagnostics();
    await observeCommandResults();
    assert.equal(await page.evaluate(() => BUDMORI.sim.tower.active), false);
    REPORT.checks.push('live-run purchase/reset locks, fixed investment snapshot, disk reload returns to farm');
    // Released 7fac763 (0.36.0) encoded and validated this literal fixture.
    // Exercise the user's import confirmation, not a migration-only helper.
    const FILE = path.join(ROOT, 'tests/fixtures/walnut-0.36.0-rice-legacy.json'),
        RAW = fs.readFileSync(FILE, 'utf8'),
        SOURCE = JSON.parse(RAW);
    assert.equal(SOURCE.productVersion, '0.36.0');
    await page.evaluate(() => {
        location.hash = '#/';
    });
    await page.locator('#startScreen').waitFor({ state: 'visible' });
    const CHOOSER = page.waitForEvent('filechooser');
    await activate(page.locator('#importSave'));
    await (await CHOOSER).setFiles(FILE);
    await page.locator('#importConfirm').waitFor({ state: 'visible' });
    await activate(page.locator('#confirmImport'));
    await page.locator('#importConfirm').waitFor({ state: 'hidden' });
    await activate(page.locator('#continueGame'));
    await openTree();
    assert.match(await page.locator('[data-growth-refund]').textContent(), /환급 완료/);
    assert.match(await page.locator('[data-growth-wallet]').textContent(), /총\s*50P.*사용\s*0P.*남음\s*50P/s);
    const READ_IMPORT = () =>
        page.evaluate(() => ({
            player: structuredClone(BUDMORI.sim.playerProgression),
            source: localStorage.getItem('bloom-weapon-cards-v4:species-tree-source-v3'),
            imported: localStorage.getItem('bloom-weapon-cards-v4:import-source'),
        }));
    const IMPORTED = await READ_IMPORT(),
        RICE = IMPORTED.player.abilities['rice-low-health-harvest'];
    assert.deepEqual(RICE.legacyInvestment, SOURCE.progress.player.abilities['rice-low-health-harvest']);
    assert.deepEqual(RICE.nodeRanks, {});
    assert.equal(RICE.masteryXp, 17.25);
    assert.equal(IMPORTED.source, RAW);
    assert.equal(IMPORTED.imported, RAW);
    for (const [ID, INVESTMENT] of Object.entries(SOURCE.progress.player.abilities)) {
        if (ID !== 'rice-low-health-harvest') {
            assert.deepEqual(IMPORTED.player.abilities[ID], INVESTMENT, `${ID} survives rice migration exactly`);
        }
    }
    await page.screenshot({ path: path.join(OUTPUT, `${VIEWPORT}-migration.png`) });
    for (let reload = 0; reload < 2; reload++) {
        await page.reload();
        await page.waitForFunction(() => globalThis.BUDMORI?.sim?.scene === 'farm');
        assert.deepEqual(await READ_IMPORT(), IMPORTED, 'reload does not duplicate refund or alter other species');
    }
    REPORT.checks.push('released save import, refund, exact source backup, other species preserved and repeat reload');
    assert.deepEqual(ERRORS, []);
    REPORT.status = 'passed';
    console.log(`PASS rice growth ${VIEWPORT}: ${REPORT.checks.join('; ')}`);
} catch (error) {
    REPORT.status = 'failed';
    REPORT.error = String(error);
    if (page) {
        REPORT.inputDiagnostics = await page
            .evaluate(() => ({
                state: globalThis.__riceUiProbe?.read(),
                events: globalThis.__riceUiProbe?.events,
            }))
            .catch((diagnosticError) => ({ error: String(diagnosticError) }));
        await page.screenshot({ path: path.join(OUTPUT, `${VIEWPORT}-failure.png`) }).catch(() => {});
    }
    throw error;
} finally {
    REPORT.errors = ERRORS;
    fs.writeFileSync(path.join(OUTPUT, `${VIEWPORT}-report.json`), JSON.stringify(REPORT, null, 2));
    await browser?.close();
    SERVER.close();
}
