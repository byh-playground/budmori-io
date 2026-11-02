// The reload-only PWA contract with the real game and the generated sw.js: a reload opens the deployed version, an
// offline reload runs the last one, "새 버전 확인" saves then reloads, and a refused save keeps the page and the save.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = fileURLToPath(new URL('../', import.meta.url)),
    OUTPUT = path.join(ROOT, 'tests/output/pwa-update'),
    SDK = new Map(),
    ERRORS = [],
    TYPES = {
        '.js': 'text/javascript',
        '.html': 'text/html',
        '.css': 'text/css',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.webmanifest': 'application/manifest+json',
    },
    REPORT = { status: 'running', scope: '/budmori-io/', cases: [] };
await mkdir(OUTPUT, { recursive: true });
const MANIFEST = JSON.parse(
    (await readFile(path.join(ROOT, 'index.html'), 'utf8')).match(
        /<script id="bloom-runtime-manifest" type="application\/json">(.*?)<\/script>/s,
    )[1],
);
REPORT.sdkDist = MANIFEST.distCommit;
for (const MODULE of MANIFEST.modules) {
    SDK.set(MODULE.url, await readFile(path.join(ROOT, 'vendor/upstream', MODULE.name + '.js')));
}
const VERSION_SOURCE = await readFile(path.join(ROOT, 'src/version.js'), 'utf8');
// One deployment differs from another only by this export of src/version.js; everything else is the repository.
let deployed = 'one',
    sdkRequests = 0,
    browser = null;
const SERVER = http.createServer((request, response) => {
    const NAME = new URL(request.url, 'http://local').pathname;
    if (NAME === '/observer.html') {
        response
            .writeHead(200, { 'content-type': 'text/html', 'cache-control': 'no-store' })
            .end('<!doctype html><title>Observer outside the game service-worker scope</title>');
        return;
    }
    const RELATIVE = NAME.startsWith('/budmori-io/')
            ? decodeURIComponent(NAME.slice('/budmori-io/'.length)) || 'index.html'
            : null,
        FILE = RELATIVE && path.resolve(ROOT, RELATIVE);
    if (!FILE?.startsWith(ROOT) || !fs.existsSync(FILE) || !fs.statSync(FILE).isFile()) {
        response.writeHead(404).end();
        return;
    }
    response.writeHead(200, {
        'content-type': TYPES[path.extname(FILE)] || 'application/octet-stream',
        // GitHub Pages caches for 10 minutes; the worker must still open the deployed files on reload.
        'cache-control': 'max-age=600',
    });
    response.end(
        RELATIVE === 'src/version.js'
            ? VERSION_SOURCE + `\nexport const PWA_TEST_REVISION = '${deployed}';\n`
            : fs.readFileSync(FILE),
    );
});
async function boot(page) {
    await page.waitForFunction(() => globalThis.BUDMORI && !document.getElementById('bloom-module-loading'));
}
async function revision(page) {
    return page.evaluate(() => import('./src/version.js').then((module) => module.PWA_TEST_REVISION));
}
async function saved(observer) {
    return observer.evaluate(() => {
        const RAW = localStorage.getItem('budmori-farm'),
            FARM = JSON.parse(RAW)?.farm,
            BOSS = FARM?.ledger.boss;
        return {
            raw: RAW,
            sentinel: localStorage.getItem('qa:pwa-sentinel'),
            xp: FARM?.player.overallXp,
            best: FARM?.player.towerBest,
            claims: BOSS?.pendingRewards.map((claim) => [claim.receiptKey, claim.acquiredCount]),
        };
    });
}
// A farm with real progress, a pending boss reward and an unrelated key, all through the game's own save.
async function seed(page) {
    await page.locator('#newGame').click();
    await page.evaluate(async () => {
        const W = BUDMORI.sim,
            { settleBossKill: SETTLE } = await import('./src/boss/boss-rewards.js');
        W.playerProgression.overallXp = 777;
        W.playerProgression.towerBest = 40;
        SETTLE(W, {
            encounterId: W.nextBossEncounterId++,
            source: 'farm',
            stage: 40,
            species: 2,
            kindReward: 1.2,
            record: false,
        });
        W.markProgressChanged();
        if (!(await BUDMORI.storage.save(W))) {
            throw new Error('the actual farm seed save failed');
        }
        localStorage.setItem('qa:pwa-sentinel', 'seed-731-preserve');
    });
}
function preserve(actual, initial, xp = initial.xp) {
    assert.equal(actual.sentinel, 'seed-731-preserve');
    assert.equal(actual.xp, xp);
    assert.equal(actual.best, initial.best);
    assert.deepEqual(actual.claims, initial.claims);
}
async function openSettings(page) {
    await page.locator('#gameMenu').click();
    await page.locator('#settingsCheckUpdate').waitFor({ state: 'visible' });
}
async function step(name, run) {
    const CASE = { name, status: 'running' };
    REPORT.cases.push(CASE);
    Object.assign(CASE, (await run()) || {}, { status: 'passed' });
    console.log(JSON.stringify({ scenario: name, status: CASE.status }));
}

try {
    await new Promise((resolve) => SERVER.listen(0, '127.0.0.1', resolve));
    const ORIGIN = `http://127.0.0.1:${SERVER.address().port}`;
    browser = await chromium.launch({
        executablePath: process.env.CHROME_PATH,
        args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    });
    REPORT.browser = browser.version();
    const CONTEXT = await browser.newContext({
        locale: 'ko-KR',
        serviceWorkers: 'allow',
        viewport: { width: 1000, height: 760 },
    });
    await CONTEXT.route('https://cdn.jsdelivr.net/gh/byh-playground/bloom-gamekit@**', (route) => {
        const BYTES = SDK.get(route.request().url());
        sdkRequests++;
        return BYTES
            ? route.fulfill({
                  body: BYTES,
                  contentType: 'text/javascript',
                  headers: { 'access-control-allow-origin': '*' },
              })
            : route.abort();
    });
    const OBSERVER = await CONTEXT.newPage();
    await OBSERVER.goto(ORIGIN + '/observer.html');
    const PAGE = await CONTEXT.newPage();
    PAGE.on('pageerror', (error) => ERRORS.push(String(error)));
    await PAGE.goto(ORIGIN + '/budmori-io/');
    await boot(PAGE);
    await PAGE.waitForFunction(() => !!navigator.serviceWorker.controller);
    assert.equal(await revision(PAGE), 'one');
    await seed(PAGE);
    const INITIAL = await saved(OBSERVER);
    assert.equal(INITIAL.xp, 777);
    assert.equal(INITIAL.claims.length, 1);

    await step('reload-opens-deployed-version', async () => {
        deployed = 'two';
        await PAGE.reload();
        await boot(PAGE);
        assert.equal(await revision(PAGE), 'two', 'one reload opens the deployed version');
        preserve(await saved(OBSERVER), INITIAL);
        assert.equal(
            await PAGE.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting),
            false,
            'no worker waits for activation',
        );
    });
    await step('offline-reload-runs-last-version', async () => {
        deployed = 'three';
        await CONTEXT.setOffline(true);
        const SDK_BEFORE = sdkRequests;
        await PAGE.reload();
        await boot(PAGE);
        assert.equal(await revision(PAGE), 'two', 'offline opens the last version it read');
        assert.equal(sdkRequests, SDK_BEFORE, 'the pinned GameKit files come from the worker cache');
        await CONTEXT.setOffline(false);
        deployed = 'two';
    });
    await step('quota-refuses-reload-and-keeps-save', async () => {
        const ORIGINAL = (await saved(OBSERVER)).raw,
            DOCUMENT = await PAGE.evaluate(() => performance.timeOrigin);
        await PAGE.evaluate(() => {
            let filler = '',
                size = 256 * 1024;
            while (size >= 1) {
                try {
                    localStorage.setItem('qa:quota-fill', filler + 'x'.repeat(size));
                    filler += 'x'.repeat(size);
                } catch (error) {
                    if (error.name !== 'QuotaExceededError') {
                        throw error;
                    }
                    size = Math.floor(size / 2);
                }
            }
            // A longer record than the saved one, so writing it really needs the space that is gone.
            BUDMORI.sim.playerProgression.overallXp = 8888;
            BUDMORI.sim.spawn(8, 1, 0, 0);
            BUDMORI.sim.markProgressChanged();
        });
        deployed = 'three';
        await openSettings(PAGE);
        await PAGE.locator('#settingsCheckUpdate').click();
        await PAGE.waitForFunction(() =>
            document.getElementById('settingsAppNotice').textContent.includes('저장하지 못해 새로고침하지 않았어요'),
        );
        assert.equal(await PAGE.evaluate(() => performance.timeOrigin), DOCUMENT, 'the page was not reloaded');
        assert.equal(await revision(PAGE), 'two');
        assert.equal((await saved(OBSERVER)).raw, ORIGINAL, 'quota failure preserves the exact saved farm');
        assert.equal(await PAGE.locator('#settingsCheckUpdate').isEnabled(), true, 'the check can be tried again');
        await PAGE.evaluate(() => localStorage.removeItem('qa:quota-fill'));
    });
    await step('check-saves-then-reloads', async () => {
        await PAGE.evaluate(() => {
            BUDMORI.sim.playerProgression.overallXp = 9999;
            BUDMORI.sim.markProgressChanged();
        });
        await Promise.all([
            PAGE.waitForNavigation({ waitUntil: 'domcontentloaded' }),
            PAGE.locator('#settingsCheckUpdate').click(),
        ]);
        await boot(PAGE);
        assert.equal(await revision(PAGE), 'three', 'the reload opens the deployed version');
        preserve(await saved(OBSERVER), INITIAL, 9999);
    });
    assert.deepEqual(ERRORS, [], 'PWA flows have no page errors');
    REPORT.status = 'passed';
    console.log(JSON.stringify({ status: REPORT.status, browser: REPORT.browser, sdkDist: REPORT.sdkDist }));
} catch (error) {
    REPORT.status = 'failed';
    REPORT.error = String(error.stack || error);
    throw error;
} finally {
    REPORT.errors = ERRORS;
    await writeFile(path.join(OUTPUT, 'report.json'), JSON.stringify(REPORT, null, 2));
    await browser?.close();
    SERVER.close();
}
