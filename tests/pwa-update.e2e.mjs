// Real generated workers and the complete game: discovery, saved updates, refusal and browser return.
import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import fs from 'node:fs';
import { cp, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { chromium } from 'playwright';

const ROOT = fileURLToPath(new URL('../', import.meta.url)),
    OUTPUT = path.join(ROOT, 'tests/output/pwa-update'),
    FIXTURE = await mkdtemp(path.join(os.tmpdir(), 'budmori-pwa-flow-')),
    RUN = promisify(execFile),
    REVISIONS = ['one', 'two', 'three'],
    SITES = new Map(),
    SDK = new Map(),
    REQUESTS = [],
    ERRORS = [],
    TYPES = {
        '.js': 'text/javascript',
        '.html': 'text/html',
        '.css': 'text/css',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.webmanifest': 'application/manifest+json',
    },
    REPORT = {
        status: 'running',
        browserMode: 'Headed Chromium on a display (Linux CI uses Xvfb); real tab visibility events.',
        seed: 731,
        viewport: [1000, 760],
        scope: '/budmori-io/',
        worker: 'Unmodified production-generated service workers; native Chromium registration, CacheStorage and activation.',
        storage:
            'Real validation/localStorage/IndexedDB; quota failure is native. Only the in-flight-save case delays FarmStorage.save before delegating to its original implementation.',
        cases: [],
    };
await mkdir(OUTPUT, { recursive: true });
const MANIFEST = JSON.parse(
    (await readFile(path.join(ROOT, 'index.html'), 'utf8')).match(
        /<script id="bloom-runtime-manifest" type="application\/json">(.*?)<\/script>/s,
    )[1],
);
REPORT.sdkDist = MANIFEST.distCommit;
REPORT.productVersion = MANIFEST.productVersion;
for (const MODULE of MANIFEST.modules) {
    SDK.set(MODULE.url, await readFile(path.join(ROOT, 'vendor/upstream', MODULE.name + '.js')));
}
let deployed = 'one',
    sdkRequests = 0,
    browser = null,
    nativeProcess = null,
    nativeExit = null;
const SERVER = http.createServer((request, response) => {
    const NAME = new URL(request.url, 'http://local').pathname;
    if (NAME === '/observer.html') {
        response
            .writeHead(200, { 'content-type': 'text/html', 'cache-control': 'no-store' })
            .end('<!doctype html><title>Observer outside the game service-worker scope</title>');
        return;
    }
    if (!NAME.startsWith('/budmori-io/')) {
        response.writeHead(404).end();
        return;
    }
    const RELATIVE = decodeURIComponent(NAME.slice('/budmori-io/'.length)) || 'index.html',
        SITE = SITES.get(deployed),
        FILE = path.resolve(SITE.path, RELATIVE);
    if (!FILE.startsWith(SITE.path + '/') || !fs.existsSync(FILE) || !fs.statSync(FILE).isFile()) {
        response.writeHead(404).end();
        return;
    }
    if (RELATIVE === 'sw.js') {
        REQUESTS.push({ revision: deployed, file: RELATIVE });
    }
    response.writeHead(200, {
        'content-type': TYPES[path.extname(FILE)] || 'application/octet-stream',
        'cache-control': 'no-store',
    });
    response.end(fs.readFileSync(FILE));
});
async function prepare() {
    // Keep the real PWA build options in scripts/pwa.mjs. Only this benign export changes between deployments.
    for (const REVISION of REVISIONS) {
        const SITE = path.join(FIXTURE, REVISION);
        await mkdir(SITE);
        for (const NAME of [
            'index.html',
            'src',
            'assets',
            'pwa',
            'sw.js',
            'manifest.webmanifest',
            'vendor',
            'scripts',
            'gamekit-lock.json',
        ]) {
            await cp(path.join(ROOT, NAME), path.join(SITE, NAME), { recursive: true });
        }
        await symlink(path.join(ROOT, 'node_modules'), path.join(SITE, 'node_modules'), 'dir');
        await writeFile(
            path.join(SITE, 'src/version.js'),
            (await readFile(path.join(SITE, 'src/version.js'), 'utf8')) +
                `\nexport const PWA_TEST_REVISION = '${REVISION}';\n`,
        );
        await RUN(process.execPath, ['scripts/pwa.mjs'], { cwd: SITE, timeout: 45000 });
        const WORKER = await readFile(path.join(SITE, 'sw.js'), 'utf8'),
            VERSION = WORKER.match(/"version": "([a-f0-9]{16})"/)[1];
        SITES.set(REVISION, { path: SITE, cache: `bloom-pwa:/budmori-io/:${VERSION}` });
    }
    REPORT.caches = Object.fromEntries([...SITES].map(([revision, site]) => [revision, site.cache]));
}
async function boot(page, url) {
    if (url) {
        await page.goto(url);
    }
    await page.waitForFunction(() => globalThis.BUDMORI && !document.getElementById('bloom-module-loading'));
}
async function revision(page) {
    return page.evaluate(() => import('./src/version.js').then((module) => module.PWA_TEST_REVISION));
}
async function saved(observer) {
    return observer.evaluate(() => {
        const RAW = localStorage.getItem('budmori-farm'),
            RECORD = JSON.parse(RAW),
            FARM = RECORD?.farm,
            BOSS = FARM?.ledger.boss,
            OWNED = FARM?.roster.reduce((sum, row) => sum + row.residentIds.length, 0) || 0,
            QUEUED = BOSS?.queuedRewards.reduce((sum, group) => sum + group.count, 0) || 0;
        return {
            raw: RAW,
            schema: RECORD?.schema,
            keys: Object.keys(localStorage).sort(),
            sentinel: localStorage.getItem('qa:pwa-sentinel'),
            xp: FARM?.player.overallXp,
            best: FARM?.player.towerBest,
            totalRights: OWNED + QUEUED,
            claims: BOSS?.pendingRewards.map((claim) => [claim.receiptKey, claim.acquiredCount]),
        };
    });
}
async function seed(page) {
    await page.locator('#newGame').click();
    await page.evaluate(async () => {
        const W = BUDMORI.sim,
            { settleBossKill: SETTLE, revealBossReward: REVEAL } = await import('./src/boss/boss-rewards.js');
        BUDMORI.runtime.paused = true;
        W._flushEjected();
        W.resetUnits();
        for (const [INDEX, SPECIES] of [0, 2, 6].entries()) {
            const UNIT = W.spawn(SPECIES, 1, INDEX * 2 - 2, 0);
            UNIT.growth = 3;
            UNIT.growthElapsed = UNIT.growthDuration;
        }
        W.setWorkBasisPoints(0);
        W.playerProgression.overallXp = 777;
        W.playerProgression.towerBest = 40;
        W.bossRewardRngState = 36;
        const CLAIM = SETTLE(W, {
            encounterId: W.nextBossEncounterId++,
            source: 'farm',
            stage: 40,
            species: 2,
            kindReward: 3,
            record: false,
        }).receipt;
        REVEAL(W, CLAIM.receiptKey);
        W.markProgressChanged();
        if (!(await BUDMORI.storage.save(W))) {
            throw new Error('the actual farm seed save failed');
        }
        localStorage.setItem('qa:pwa-sentinel', 'seed-731-preserve');
        await new Promise((resolve, reject) => {
            const OPEN = indexedDB.open('qa-native-pwa-save', 1);
            OPEN.onupgradeneeded = () => OPEN.result.createObjectStore('rights');
            OPEN.onerror = () => reject(OPEN.error);
            OPEN.onsuccess = () => {
                const DB = OPEN.result,
                    TX = DB.transaction('rights', 'readwrite');
                TX.objectStore('rights').put({ seed: 731, acquired: 24 }, 'claim');
                TX.oncomplete = () => {
                    DB.close();
                    resolve();
                };
                TX.onerror = () => reject(TX.error);
            };
        });
        BUDMORI.runtime.paused = false;
    });
}
async function dbValue(observer) {
    return observer.evaluate(
        () =>
            new Promise((resolve, reject) => {
                const OPEN = indexedDB.open('qa-native-pwa-save', 1);
                OPEN.onerror = () => reject(OPEN.error);
                OPEN.onsuccess = () => {
                    const DB = OPEN.result,
                        READ = DB.transaction('rights').objectStore('rights').get('claim');
                    READ.onsuccess = () => {
                        resolve(READ.result);
                        DB.close();
                    };
                    READ.onerror = () => reject(READ.error);
                };
            }),
    );
}
// waitForFunction's predicate is synchronous; await native asynchronous queries explicitly in Node.
async function poll(page, query, arg, label) {
    const START = Date.now();
    let latest = null;
    while (Date.now() - START < 30000) {
        try {
            latest = await page.evaluate(query, arg);
            if (latest.ready) {
                return latest;
            }
        } catch (error) {
            if (!/Execution context was destroyed|Cannot find context|navigation/.test(error.message)) {
                throw error;
            }
        }
        await page.waitForTimeout(50);
    }
    throw new Error(`${label}: ${JSON.stringify(latest)}`);
}
async function waitInstalled(page, target) {
    return poll(
        page,
        async ({ cache, marker }) => {
            const R = await navigator.serviceWorker.getRegistration();
            let text = '';
            if (await caches.has(cache)) {
                const RESPONSE = await (await caches.open(cache)).match(new URL('./src/version.js', location.href));
                if (RESPONSE) {
                    text = await RESPONSE.text();
                }
            }
            return {
                ready:
                    R?.waiting?.state === 'installed' &&
                    !R.installing &&
                    text.includes(`PWA_TEST_REVISION = '${marker}'`),
                document: performance.timeOrigin,
                controller: navigator.serviceWorker.controller?.scriptURL,
                active: R?.active?.state,
                waiting: R?.waiting?.state,
                installing: R?.installing?.state,
                caches: await caches.keys(),
                cachedVersion: text,
            };
        },
        { cache: SITES.get(target).cache, marker: target },
        `waiting worker ${target}`,
    );
}
async function settings(page) {
    await page.locator('#gameMenu').click();
    await page.locator('#settingsCheckUpdate').waitFor({ state: 'visible' });
}
async function discover(page, target) {
    deployed = target;
    await settings(page);
    await page.locator('#settingsCheckUpdate').click();
    await waitInstalled(page, target);
    assert.equal(await page.locator('#settingsCheckUpdate').innerText(), '최신 버전 업데이트');
    assert.equal(await page.locator('#gameMenu').getAttribute('data-update-ready'), 'true');
    assert.equal(await page.locator('#appUpdateBanner').count(), 0, 'there is no update banner');
    assert.notEqual(
        await page.locator('#gameMenu').evaluate((button) => getComputedStyle(button, '::after').content),
        'none',
        'the native settings pseudo-element exposes its update badge',
    );
}
function preserve(actual, initial, { xp = initial.xp, totalRights = initial.totalRights } = {}) {
    assert.equal(actual.sentinel, 'seed-731-preserve');
    assert.equal(actual.xp, xp);
    assert.equal(actual.best, initial.best);
    assert.equal(actual.totalRights, totalRights);
    assert.deepEqual(actual.claims, initial.claims);
    assert.ok(
        initial.keys.every((key) => actual.keys.includes(key)),
        'all original storage keys survive activation',
    );
}
async function updated(page, target) {
    const OBSERVATION = await poll(
        page,
        async (expected) => {
            const REVISION = (await import('./src/version.js')).PWA_TEST_REVISION,
                R = await navigator.serviceWorker.getRegistration();
            return {
                ready:
                    !!globalThis.BUDMORI && !document.getElementById('bloom-module-loading') && REVISION === expected,
                document: performance.timeOrigin,
                url: location.href,
                revision: REVISION,
                product: document.getElementById('productVersion')?.textContent,
                controller: navigator.serviceWorker.controller?.scriptURL,
                active: R?.active?.state,
                waiting: R?.waiting?.state || null,
                installing: R?.installing?.state || null,
                caches: await caches.keys(),
            };
        },
        target,
        `activated document ${target}`,
    );
    REPORT.activations ??= [];
    REPORT.activations.push(OBSERVATION);
    await boot(page);
    assert.equal(await revision(page), target);
    assert.equal(
        await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.waiting || null),
        null,
    );
}

async function nativeVisibilityContext() {
    await browser.close();
    browser = null;
    const PROFILE = path.join(FIXTURE, 'native-chrome');
    await mkdir(PROFILE);
    // Playwright normally forces all tabs visible. Its public noDefaults CDP option removes
    // that automation override only in the default context, preserving native tab events.
    nativeProcess = spawn(
        process.env.CHROME_PATH || chromium.executablePath(),
        [
            '--no-sandbox',
            '--remote-debugging-port=0',
            '--user-data-dir=' + PROFILE,
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-background-networking',
            '--use-angle=swiftshader',
            '--enable-unsafe-swiftshader',
            'about:blank',
        ],
        { stdio: ['ignore', 'ignore', 'pipe'] },
    );
    REPORT.nativeBrowserStderr = '';
    nativeProcess.stderr.on('data', (chunk) => {
        REPORT.nativeBrowserStderr = (REPORT.nativeBrowserStderr + chunk).slice(-12000);
    });
    nativeExit = new Promise((resolve, reject) => {
        nativeProcess.once('exit', resolve);
        nativeProcess.once('error', reject);
    });
    let port;
    for (let attempt = 0; attempt < 200; attempt++) {
        try {
            port = (await readFile(path.join(PROFILE, 'DevToolsActivePort'), 'utf8')).split('\n')[0];
            break;
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
            if (nativeProcess.exitCode !== null) {
                throw new Error('Native Chromium exited before CDP was ready', { cause: error });
            }
            await new Promise((resolve) => setTimeout(resolve, 50));
        }
    }
    assert.ok(port, 'native headed Chromium exposes its real CDP endpoint');
    browser = await chromium.connectOverCDP('http://127.0.0.1:' + port, { noDefaults: true });
    REPORT.nativeVisibilityEnvironment = {
        browser: browser.version(),
        connection: 'Public connectOverCDP({noDefaults:true}), default context, headed Chromium',
        events: 'Native bringToFront tab transitions; no visibility event or service-worker mocks',
    };
    return browser.contexts()[0];
}

try {
    await prepare();
    await new Promise((resolve) => SERVER.listen(0, '127.0.0.1', resolve));
    const ORIGIN = `http://127.0.0.1:${SERVER.address().port}`,
        GAME = ORIGIN + '/budmori-io/';
    browser = await chromium.launch({
        headless: false,
        executablePath: process.env.CHROME_PATH,
        args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
    });
    REPORT.browser = browser.version();
    for (const NAME of ['startup', 'playing', 'quota-refusal', 'in-flight-save', 'native-return']) {
        deployed = 'one';
        const CASE = { name: NAME, status: 'running' },
            CONTEXT =
                NAME === 'native-return'
                    ? await nativeVisibilityContext()
                    : await browser.newContext({
                          serviceWorkers: 'allow',
                          viewport: { width: 1000, height: 760 },
                      });
        REPORT.cases.push(CASE);
        await writeFile(path.join(OUTPUT, 'report.json'), JSON.stringify(REPORT, null, 2));
        console.log(JSON.stringify({ scenario: NAME, status: 'running' }));
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
        await PAGE.setViewportSize({ width: 1000, height: 760 });
        CASE.viewport = PAGE.viewportSize();
        PAGE.on('pageerror', (error) => ERRORS.push({ scenario: NAME, error: String(error) }));
        await boot(PAGE, GAME);
        await PAGE.waitForFunction(() => !!navigator.serviceWorker.controller);
        assert.equal(await revision(PAGE), 'one');
        await seed(PAGE);
        const INITIAL = await saved(OBSERVER);
        assert.equal(INITIAL.totalRights, 27);
        assert.deepEqual(INITIAL.claims, [['farm:1', 24]]);
        CASE.initial = INITIAL;
        if (NAME === 'startup') {
            assert.equal(await PAGE.evaluate(() => location.hash), '#/farm');
            deployed = 'two';
            await PAGE.reload();
            await updated(PAGE, 'two');
            CASE.result = await saved(OBSERVER);
            preserve(CASE.result, INITIAL);
            assert.equal(
                await PAGE.evaluate(() => location.hash),
                '#/farm',
                'the fresh page updates before resuming its farm route',
            );
            CASE.refreshAppliedBeforePlay = true;
        } else if (NAME === 'native-return') {
            await CONTEXT.setOffline(true);
            const SDK_BEFORE = sdkRequests;
            await PAGE.reload();
            await boot(PAGE);
            assert.equal(await revision(PAGE), 'one');
            assert.equal(sdkRequests, SDK_BEFORE, 'the offline boot reads native precached SDK files');
            await PAGE.evaluate(() => {
                window.__nativePwaReturn = { online: 0, visibility: [] };
                window.addEventListener('online', () => window.__nativePwaReturn.online++);
                document.addEventListener('visibilitychange', () =>
                    window.__nativePwaReturn.visibility.push(document.visibilityState),
                );
            });
            deployed = 'two';
            await CONTEXT.setOffline(false);
            await waitInstalled(PAGE, 'two');
            assert.equal(await revision(PAGE), 'one', 'reconnection does not replace a running farm');
            assert.ok(
                await PAGE.evaluate(() => window.__nativePwaReturn.online > 0),
                'the browser emits a real online event',
            );
            await OBSERVER.bringToFront();
            await PAGE.waitForFunction(() => document.hidden);
            const REQUESTS_BEFORE = REQUESTS.length;
            deployed = 'three';
            await PAGE.bringToFront();
            await PAGE.waitForFunction(() => !document.hidden);
            await waitInstalled(PAGE, 'three');
            assert.ok(REQUESTS.length > REQUESTS_BEFORE, 'returning to the real tab checks the deployed worker');
            CASE.returnEvents = await PAGE.evaluate(() => window.__nativePwaReturn);
            assert.ok(
                CASE.returnEvents.visibility.includes('hidden') && CASE.returnEvents.visibility.includes('visible'),
            );
            await settings(PAGE);
            assert.equal(await PAGE.locator('#settingsCheckUpdate').innerText(), '최신 버전 업데이트');
            await PAGE.locator('#settingsCheckUpdate').click();
            await updated(PAGE, 'three');
            CASE.result = await saved(OBSERVER);
            preserve(CASE.result, INITIAL);
        } else {
            await discover(PAGE, 'two');
            assert.equal(await revision(PAGE), 'one', 'a running in-memory farm keeps the installed update waiting');
            if (NAME === 'quota-refusal') {
                CASE.originalRaw = (await saved(OBSERVER)).raw;
                CASE.pausedBefore = await PAGE.evaluate(() => BUDMORI.runtime.paused);
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
                    const W = BUDMORI.sim;
                    W.playerProgression.overallXp = 8888;
                    W.spawn(8, 1, 0, 0);
                    W.markProgressChanged();
                });
                await PAGE.locator('#settingsCheckUpdate').click();
                await PAGE.waitForFunction(() =>
                    document.getElementById('settingsAppNotice').textContent.includes('업데이트를 멈췄어요'),
                );
                assert.equal(await revision(PAGE), 'one');
                await waitInstalled(PAGE, 'two');
                assert.equal(await PAGE.locator('#appUpdateProgress').evaluate((dialog) => dialog.open), false);
                assert.equal(
                    await PAGE.evaluate(() => BUDMORI.runtime.paused),
                    CASE.pausedBefore,
                    'refusal restores the previous pause state',
                );
                assert.equal(
                    (await saved(OBSERVER)).raw,
                    CASE.originalRaw,
                    'quota failure preserves the exact saved farm',
                );
                CASE.nativeQuotaRefused = true;
                await PAGE.evaluate(() => localStorage.removeItem('qa:quota-fill'));
                await PAGE.locator('#settingsCheckUpdate').click();
                await updated(PAGE, 'two');
                CASE.result = await saved(OBSERVER);
                preserve(CASE.result, INITIAL, { xp: 8888, totalRights: 28 });
            } else if (NAME === 'in-flight-save') {
                await PAGE.evaluate(() => {
                    const STORAGE = BUDMORI.storage,
                        NATIVE = STORAGE.save.bind(STORAGE),
                        STATE = (window.__pendingPwaSave = { calls: 0, completed: 0 });
                    const GATE = new Promise((resolve) => {
                        STATE.release = resolve;
                    });
                    STORAGE.save = async (...args) => {
                        STATE.calls++;
                        await GATE;
                        const OK = await NATIVE(...args);
                        STATE.completed++;
                        return OK;
                    };
                    BUDMORI.sim.playerProgression.overallXp = 800;
                    BUDMORI.sim.markProgressChanged();
                });
                await PAGE.waitForFunction(() => window.__pendingPwaSave.calls === 1);
                await PAGE.evaluate(() => {
                    BUDMORI.sim.playerProgression.overallXp = 801;
                    BUDMORI.sim.markProgressChanged();
                });
                await PAGE.locator('#settingsCheckUpdate').click();
                await PAGE.locator('#appUpdateProgress').waitFor({ state: 'visible' });
                assert.equal(
                    await PAGE.locator('#appUpdateProgress').evaluate((dialog) => dialog.matches(':modal')),
                    true,
                );
                assert.equal(await PAGE.evaluate(() => BUDMORI.runtime.paused), true);
                assert.equal(await PAGE.evaluate(() => window.__pendingPwaSave.completed), 0);
                assert.equal(await revision(PAGE), 'one', 'activation waits for the already-running save');
                await waitInstalled(PAGE, 'two');
                await PAGE.keyboard.press('Escape');
                assert.equal(await PAGE.locator('#appUpdateProgress').evaluate((dialog) => dialog.open), true);
                await assert.rejects(
                    PAGE.locator('#gameMenuClose').click({ timeout: 300 }),
                    /Timeout/,
                    'the native modal blocks underlying pointer input',
                );
                assert.equal(
                    await PAGE.evaluate(() => {
                        document.getElementById('gameMenuClose').focus();
                        return document.activeElement === document.getElementById('gameMenuClose');
                    }),
                    false,
                    'the native modal blocks focusing underlying input',
                );
                await PAGE.goBack();
                assert.equal(
                    await PAGE.locator('#appUpdateProgress').evaluate((dialog) => dialog.open),
                    true,
                    'native history navigation keeps the update modal open',
                );
                assert.equal(
                    await PAGE.evaluate(() => BUDMORI.runtime.paused),
                    true,
                    'native popstate cannot resume the farm while its save is pending',
                );
                CASE.pendingSaveObserved = true;
                CASE.nativeModalBlockedInput = true;
                CASE.nativePopstateStayedPaused = true;
                await PAGE.evaluate(() => window.__pendingPwaSave.release());
                await updated(PAGE, 'two');
                CASE.result = await saved(OBSERVER);
                preserve(CASE.result, INITIAL, { xp: 801 });
            } else {
                await PAGE.locator('#settingsCheckUpdate').click();
                await updated(PAGE, 'two');
                CASE.result = await saved(OBSERVER);
                preserve(CASE.result, INITIAL);
            }
        }
        assert.deepEqual(await dbValue(OBSERVER), { seed: 731, acquired: 24 });
        CASE.indexedDbPreserved = true;
        CASE.status = 'passed';
        if (NAME !== 'native-return') {
            await CONTEXT.close();
        }
        console.log(JSON.stringify({ scenario: NAME, status: CASE.status }));
    }
    assert.deepEqual(ERRORS, [], 'native PWA flows have no page errors');
    REPORT.status = 'passed';
    console.log(
        JSON.stringify({
            status: REPORT.status,
            browser: REPORT.browser,
            sdkDist: REPORT.sdkDist,
            cases: REPORT.cases.map((test) => ({ name: test.name, status: test.status })),
        }),
    );
} catch (error) {
    REPORT.status = 'failed';
    REPORT.error = String(error.stack || error);
    throw error;
} finally {
    REPORT.workerRequests = REQUESTS;
    REPORT.errors = ERRORS;
    await writeFile(path.join(OUTPUT, 'report.json'), JSON.stringify(REPORT, null, 2));
    await browser?.close();
    if (nativeProcess) {
        nativeProcess.kill('SIGTERM');
        const FORCE = setTimeout(() => nativeProcess.kill('SIGKILL'), 3000);
        await nativeExit;
        clearTimeout(FORCE);
    }
    SERVER.close();
    await rm(FIXTURE, { recursive: true, force: true });
}
