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
    OUTPUT = path.join(ROOT, 'tests/output/walnut-growth'),
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
        if (!FILE.startsWith(ROOT) || !fs.existsSync(FILE) || !fs.statSync(FILE).isFile()) {
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
    await activate(page.locator('[data-ability-species="5"]'));
    await page.locator('[data-growth-tree]').waitFor();
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
        (nodeId) => BUDMORI.sim.playerProgression.abilities['walnut-raw-guard'].nodeRanks[nodeId] || 0,
        id,
    );
    // A queued reset/purchase can update the model before the panel redraws.
    // Require agreement before clicking, then require exactly one rank in both owners.
    await page.waitForFunction(
        ({ id, rank }) => {
            const LABEL = document.querySelector(`[data-growth-node="${id}"] .growth-rank`)?.textContent;
            return (
                (BUDMORI.sim.playerProgression.abilities['walnut-raw-guard'].nodeRanks[id] || 0) === rank &&
                LABEL?.split('/')[0] === String(rank) &&
                document.querySelector(`[data-growth-node="${id}"] button`)?.getAttribute('aria-disabled') === 'false'
            );
        },
        { id, rank: BEFORE },
    );
    await activate(NODE(id));
    await settleAbilityRedraw();
    await page.waitForFunction(
        ({ id, rank }) =>
            BUDMORI.sim.playerProgression.abilities['walnut-raw-guard'].nodeRanks[id] === rank &&
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
    await activate(page.locator('#newGame'));
    await openTree();
    assert.equal(await page.locator('[data-growth-node]').count(), 11);
    assert.equal(await page.locator('[data-walnut-preview-tier]').count(), 6);
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
            BUILD = WORLD.playerProgression.abilities['walnut-raw-guard'];
        BUILD.masteryLevel = 50;
        BUILD.masteryXp = 125;
        WORLD.spawn(5, 6, 1, 0);
        WORLD.markProgressChanged();
        BUDMORI.storage.save(WORLD);
    });
    await activate(page.locator('[data-ability-species="6"]'));
    assert.equal(await page.locator('[data-growth-tree]').count(), 0, 'rice retains legacy UI');
    await activate(page.locator('[data-ability-species="5"]'));
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
        structuredClone(BUDMORI.sim.playerProgression.abilities['walnut-raw-guard']),
    );
    await page.reload();
    await page.waitForFunction(() => globalThis.BUDMORI?.sim?.scene === 'farm');
    assert.deepEqual(await page.evaluate(() => BUDMORI.sim.playerProgression.abilities['walnut-raw-guard']), BEFORE);
    await openTree();
    await activate(page.locator('[data-ability-action="reset"]'));
    await settleAbilityRedraw();
    await page.waitForFunction(
        () =>
            Object.keys(BUDMORI.sim.playerProgression.abilities['walnut-raw-guard'].nodeRanks).length === 0 &&
            document.querySelector('[data-growth-node="basic-2"] .growth-rank')?.textContent === '0/10' &&
            [...document.querySelectorAll('[data-growth-node] .growth-rank')].every(
                (label) => label.textContent.split('/')[0] === '0',
            ),
    );
    assert.equal(await page.evaluate(() => BUDMORI.sim.playerProgression.abilities['walnut-raw-guard'].masteryXp), 125);
    await purchase('basic-2');
    REPORT.checks.push('Lv50 evolution/specialty/HP purchase, legacy rice, save/reload and mastery-preserving reset');
    await activate(page.locator('#gameMenuClose'));
    await activate(page.locator('#bossChallenge'));
    if (await page.locator('#deckDialog').isVisible()) {
        await activate(page.locator('#deckGo'));
    }
    await page.waitForFunction(() => BUDMORI.sim.tower.active);
    const SNAPSHOT = await page.evaluate(() => JSON.stringify(BUDMORI.sim.runProgressionSnapshot)),
        RUN_BUILD = await page.evaluate(() =>
            structuredClone(BUDMORI.sim.playerProgression.abilities['walnut-raw-guard']),
        );
    await openTree();
    const TAB_DISABLED = await page.locator('#menuTabAbilities').isDisabled();
    assert.equal(await page.locator('#menuTabAbilities').getAttribute('aria-selected'), 'true');
    assert.equal(await NODE('basic-2').getAttribute('aria-disabled'), 'true');
    assert.equal(await page.locator('[data-ability-action="reset"]').getAttribute('aria-disabled'), 'true');
    assert.deepEqual(
        await page.evaluate(() => BUDMORI.sim.playerProgression.abilities['walnut-raw-guard']),
        RUN_BUILD,
        'opening the real locked upgrade menu cannot change live investment',
    );
    REPORT.runMenu = { abilitiesTabDisabled: TAB_DISABLED, selected: true, purchaseLocked: true, resetLocked: true };
    assert.equal(await page.evaluate(() => JSON.stringify(BUDMORI.sim.runProgressionSnapshot)), SNAPSHOT);
    await page.reload();
    await page.waitForFunction(() => globalThis.BUDMORI?.sim?.scene === 'farm');
    assert.equal(await page.evaluate(() => BUDMORI.sim.tower.active), false);
    REPORT.checks.push('live-run purchase/reset locks, fixed investment snapshot, disk reload returns to farm');
    assert.deepEqual(ERRORS, []);
    REPORT.status = 'passed';
    console.log(`PASS walnut growth ${VIEWPORT}: ${REPORT.checks.join('; ')}`);
} catch (error) {
    REPORT.status = 'failed';
    REPORT.error = String(error);
    if (page) {
        await page.screenshot({ path: path.join(OUTPUT, `${VIEWPORT}-failure.png`) }).catch(() => {});
    }
    throw error;
} finally {
    REPORT.errors = ERRORS;
    fs.writeFileSync(path.join(OUTPUT, `${VIEWPORT}-report.json`), JSON.stringify(REPORT, null, 2));
    await browser?.close();
    SERVER.close();
}
