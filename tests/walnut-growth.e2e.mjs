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
    await locator.scrollIntoViewIfNeeded();
    await (MOBILE ? locator.tap() : locator.click());
}
async function openTree() {
    await activate(page.locator('#upgradeMenu'));
    await activate(page.locator('#menuTabAbilities'));
    await activate(page.locator('[data-ability-species="5"]'));
    await page.locator('[data-growth-tree]').waitFor();
}
const NODE = (id) => page.locator(`[data-growth-node="${id}"] button`);
async function purchase(id) {
    const BEFORE = await page.locator(`[data-growth-node="${id}"] .growth-rank`).textContent();
    assert.equal(await NODE(id).getAttribute('aria-disabled'), 'false');
    await activate(NODE(id));
    await page.waitForFunction(
        ({ id, before }) => document.querySelector(`[data-growth-node="${id}"] .growth-rank`)?.textContent !== before,
        { id, before: BEFORE },
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
    await page.waitForFunction(
        () => Object.keys(BUDMORI.sim.playerProgression.abilities['walnut-raw-guard'].nodeRanks).length === 0,
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
    const SNAPSHOT = await page.evaluate(() => JSON.stringify(BUDMORI.sim.runProgressionSnapshot));
    await openTree();
    assert.equal(await NODE('basic-2').getAttribute('aria-disabled'), 'true');
    assert.equal(await page.locator('[data-ability-action="reset"]').getAttribute('aria-disabled'), 'true');
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
