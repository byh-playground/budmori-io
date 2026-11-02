// Startup loading logic through GameKit boot: one overall bar that only rises to 100%, the game graph preloaded
// file by file (N/N) before import(), no game module requested twice or after the preload, and the failure paths.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = fileURLToPath(new URL('../', import.meta.url)),
    OUTPUT = path.join(ROOT, 'tests/output/startup-loading'),
    MANIFEST = JSON.parse(
        fs
            .readFileSync(path.join(ROOT, 'index.html'), 'utf8')
            .match(/<script id="bloom-runtime-manifest" type="application\/json">(.*?)<\/script>/s)[1],
    ),
    MODULES = new Map(
        MANIFEST.modules.map((entry) => [
            entry.url,
            fs.readFileSync(path.join(ROOT, 'vendor/upstream', entry.name + '.js')),
        ]),
    ),
    REPORT = { status: 'running', scenarios: {} },
    TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const SERVER = http.createServer((request, response) => {
    const FILE = path.resolve(ROOT, '.' + new URL(request.url, 'http://local').pathname);
    if (!FILE.startsWith(ROOT) || !fs.existsSync(FILE) || !fs.statSync(FILE).isFile()) {
        return response.writeHead(404).end();
    }
    response.setHeader('content-type', TYPES[path.extname(FILE)] || 'application/octet-stream');
    response.end(fs.readFileSync(FILE));
});
await new Promise((resolve) => SERVER.listen(0, '127.0.0.1', resolve));
const ORIGIN = `http://127.0.0.1:${SERVER.address().port}`;
const READY = () => !!globalThis.BUDMORI && !document.getElementById('bloom-module-loading');
fs.mkdirSync(OUTPUT, { recursive: true });
let browser;
try {
    browser = await chromium.launch({
        executablePath: process.env.CHROME_PATH,
        args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    });
    async function context(backend = 'vector') {
        const CONTEXT = await browser.newContext({
            locale: 'ko-KR',
            serviceWorkers: 'block',
            viewport: { width: 1100, height: 850 },
            deviceScaleFactor: 1,
        });
        await CONTEXT.route('**/*', (route) => {
            const URL_LOCAL = route.request().url();
            if (MODULES.has(URL_LOCAL)) {
                return route.fulfill({
                    body: MODULES.get(URL_LOCAL),
                    contentType: 'text/javascript',
                    headers: { 'access-control-allow-origin': '*' },
                });
            }
            return URL_LOCAL.startsWith(ORIGIN) ? route.continue() : route.abort();
        });
        if (backend === 'sprite') {
            // Exercise the optional production backend explicitly; the default stays vector.
            await CONTEXT.route('**/src/render/unit-art.js', (route) => {
                const SOURCE = fs.readFileSync(path.join(ROOT, 'src/render/unit-art.js'), 'utf8');
                assert.match(SOURCE, /UNIT_ART = 'vector'/);
                return route.fulfill({
                    contentType: 'text/javascript',
                    body: SOURCE.replace("UNIT_ART = 'vector'", "UNIT_ART = 'sprite'"),
                });
            });
        }
        await CONTEXT.addInitScript(() => {
            // Every value bindBootProgress writes (the progress attribute reflects it) and every label text.
            performance.setResourceTimingBufferSize(4000);
            globalThis.__startupProgress = [];
            new MutationObserver((records) => {
                for (const RECORD of records) {
                    if (RECORD.attributeName === 'value' && RECORD.target.id === 'bloom-loading-progress') {
                        globalThis.__startupProgress.push({
                            value: RECORD.target.value,
                            label: RECORD.target.parentElement.querySelector('#bloom-loading-label').textContent,
                        });
                    }
                }
            }).observe(document, { subtree: true, attributes: true, attributeFilter: ['value'], childList: true });
        });
        return CONTEXT;
    }
    function assertProgress(observed, name) {
        assert.ok(observed.length > 3, `${name}: progress was reported`);
        for (let index = 1; index < observed.length; index++) {
            assert.ok(observed[index].value >= observed[index - 1].value, `${name}: overall never decreases`);
        }
        assert.equal(observed.at(-1).value, 1, `${name}: overall ends at 100%`);
        assert.ok(
            observed.every((sample) => /^.+ · (\d|[1-9]\d|100)%$/.test(sample.label)),
            `${name}: label is the stage text and the overall percent`,
        );
        assert.match(observed.at(-1).label, / · 100%$/);
    }
    for (const BACKEND of ['vector', 'sprite']) {
        const CONTEXT = await context(BACKEND),
            PAGE = await CONTEXT.newPage(),
            ERRORS = [];
        PAGE.on('pageerror', (error) => ERRORS.push(String(error)));
        await PAGE.goto(`${ORIGIN}/index.html`);
        await PAGE.waitForFunction(READY, null, { timeout: 90000 });
        const DATA = await PAGE.evaluate((gameModules) => {
            const STARTUP = globalThis.BudmoriStartup.snapshot(),
                GAME_BEGAN = STARTUP.startedAtMs + STARTUP.stages.find((stage) => stage.stage === 'game').startedAtMs,
                URLS = new Set(gameModules.map((file) => new URL(file, document.baseURI).href)),
                REQUESTS = performance.getEntriesByType('resource').filter((entry) => URLS.has(entry.name));
            return {
                startup: STARTUP,
                progress: globalThis.__startupProgress,
                uniqueGameModules: URLS.size,
                requested: REQUESTS.length,
                requestedOnce: new Set(REQUESTS.map((entry) => entry.name)).size === REQUESTS.length,
                afterPreload: REQUESTS.filter((entry) => entry.startTime >= GAME_BEGAN).map((entry) => entry.name),
                backend: BUDMORI.renderer.unitArtMode,
                bakeCount: BUDMORI.unitArtDiagnostics.bakeCount,
            };
        }, MANIFEST.gameModules);
        assert.equal(DATA.startup.state, 'ready');
        assert.equal(DATA.backend, BACKEND);
        assertProgress(DATA.progress, BACKEND);
        const STAGE = (id) => DATA.startup.stages.find((stage) => stage.stage === id);
        assert.deepEqual(
            DATA.startup.stages.map((stage) => stage.stage),
            ['modules', 'vector-download', 'vectors', 'game-modules', 'game'].concat(
                BACKEND === 'sprite' ? ['atlas-plan', 'atlas'] : [],
            ),
            'stages run in order, the atlas stages only with the sprite backend',
        );
        assert.equal(STAGE('modules').completed, MANIFEST.modules.length);
        assert.equal(STAGE('vectors').completed, MANIFEST.vectorAssets.length);
        assert.equal(STAGE('game-modules').total, DATA.uniqueGameModules, 'the whole listed game graph');
        assert.equal(STAGE('game-modules').completed, DATA.uniqueGameModules, 'game-modules reaches N/N');
        assert.equal(DATA.requested, DATA.uniqueGameModules, 'every listed game module is requested');
        assert.ok(DATA.requestedOnce, 'no game module is requested twice');
        assert.deepEqual(DATA.afterPreload, [], 'import() after the preload requests no game module');
        if (BACKEND === 'sprite') {
            for (const ID of ['atlas-plan', 'atlas']) {
                assert.ok(STAGE(ID).total > 0 && STAGE(ID).completed === STAGE(ID).total, `${ID} reaches N/N`);
            }
            assert.ok(DATA.bakeCount > 0, 'the sprite fixture really baked its atlas');
            assert.ok(
                DATA.progress.some((sample) => sample.label.startsWith('애니메이션 이미지를 준비하고 있어요 · ')),
            );
        } else {
            assert.equal(DATA.bakeCount, 0, 'the default vector backend does not prepare an unused atlas');
        }
        assert.deepEqual(ERRORS, []);
        REPORT.scenarios[BACKEND] = {
            stages: DATA.startup.stages,
            samples: DATA.progress.length,
            gameModules: DATA.uniqueGameModules,
        };
        await CONTEXT.close();
    }
    // An SDK module fails: popup and the static reload link; the reload is a new realm that starts normally.
    {
        const CONTEXT = await context(),
            PAGE = await CONTEXT.newPage();
        let fail = true;
        await PAGE.route('**/camera.js', (route) =>
            fail
                ? route.fulfill({
                      status: 503,
                      body: 'startup test failure',
                      headers: { 'access-control-allow-origin': '*' },
                  })
                : route.fallback(),
        );
        await PAGE.goto(`${ORIGIN}/index.html`);
        await PAGE.locator('#bloom-error-popup').waitFor({ state: 'visible' });
        assert.match(await PAGE.locator('#bloom-error-popup').innerText(), /Module request failed: 503/);
        assert.equal(
            await PAGE.locator('#bloom-loading-label').innerText(),
            '게임을 시작하지 못했어요. 진단 정보를 복사해 알려 주세요',
        );
        assert.equal(await PAGE.locator('#newGame').isVisible(), false);
        assert.equal(await PAGE.evaluate(() => globalThis.BudmoriStartup.snapshot().state), 'error');
        await PAGE.evaluate(() => {
            globalThis.__failedAttemptMarker = 'old-attempt';
        });
        fail = false;
        await PAGE.locator('#bloom-loading-retry').focus();
        await Promise.all([PAGE.waitForNavigation({ waitUntil: 'domcontentloaded' }), PAGE.keyboard.press('Enter')]);
        await PAGE.waitForFunction(READY, null, { timeout: 90000 });
        assert.equal(await PAGE.evaluate(() => globalThis.__failedAttemptMarker), undefined, 'old realm discarded');
        REPORT.scenarios.moduleFailureRetry = 'PASS';
        await CONTEXT.close();
    }
    // A game module of the preload fails: the preload rejects after all settle and the game is never imported.
    {
        const CONTEXT = await context(),
            PAGE = await CONTEXT.newPage();
        await PAGE.route('**/src/ui/app-shell.js', (route) => route.fulfill({ status: 503, body: '' }));
        await PAGE.goto(`${ORIGIN}/index.html`);
        await PAGE.locator('#bloom-error-popup').waitFor({ state: 'visible' });
        assert.match(await PAGE.locator('#bloom-error-popup').innerText(), /module preload failed \(1\/\d+\)/);
        const STATE = await PAGE.evaluate(() => ({
            startup: globalThis.BudmoriStartup.snapshot(),
            game: !!globalThis.BUDMORI,
            retry: !document.getElementById('bloom-loading-retry').hidden,
        }));
        assert.equal(STATE.startup.state, 'error');
        assert.equal(STATE.startup.stages.at(-1).stage, 'game-modules', 'failed in the preload, before import()');
        assert.equal(STATE.game, false);
        assert.equal(STATE.retry, true);
        REPORT.scenarios.gameModuleFailure = 'PASS';
        await CONTEXT.close();
    }
    // The renderer's startup preparation fails inside the game: it stays an error and input stays blocked.
    {
        const CONTEXT = await context('sprite'),
            PAGE = await CONTEXT.newPage();
        await PAGE.route('**/src/farm-app.js', (route) =>
            route.fulfill({
                contentType: 'text/javascript',
                body: fs
                    .readFileSync(path.join(ROOT, 'src/farm-app.js'), 'utf8')
                    .replace(
                        'await RENDERER.prepareStartup({',
                        "RENDERER.unitSprites.prepareAsync = async () => { throw new Error('injected atlas preparation error'); };\nawait RENDERER.prepareStartup({",
                    ),
            }),
        );
        await PAGE.goto(`${ORIGIN}/index.html`);
        await PAGE.locator('#bloom-error-popup').waitFor({ state: 'visible' });
        assert.match(await PAGE.locator('#bloom-error-popup').innerText(), /injected atlas preparation error/);
        assert.equal(await PAGE.evaluate(() => globalThis.BudmoriStartup.snapshot().state), 'error');
        assert.equal(await PAGE.locator('#newGame').isVisible(), false);
        REPORT.scenarios.atlasPreparationFailure = 'PASS';
        await CONTEXT.close();
        const LOST = await context('sprite'),
            LOST_PAGE = await LOST.newPage();
        await LOST_PAGE.route('**/src/farm-app.js', (route) =>
            route.fulfill({
                contentType: 'text/javascript',
                body: fs.readFileSync(path.join(ROOT, 'src/farm-app.js'), 'utf8').replace(
                    'onProgress: globalThis.BudmoriStartup?.report,',
                    `onProgress: (stage, completed, total) => {
                globalThis.BudmoriStartup.report(stage, completed, total);
                if (stage === 'atlas-plan' && completed === 0) {
                    RENDERER.device.gl.getExtension('WEBGL_lose_context').loseContext();
                }
            },`,
                ),
            }),
        );
        await LOST_PAGE.goto(`${ORIGIN}/index.html`);
        await LOST_PAGE.locator('#bloom-error-popup').waitFor({ state: 'visible' });
        assert.match(await LOST_PAGE.locator('#bloom-error-popup').innerText(), /Graphics became unavailable/);
        assert.equal(await LOST_PAGE.evaluate(() => !!globalThis.BUDMORI), false, 'lost startup cannot become ready');
        REPORT.scenarios.lossDuringPreparation = 'PASS';
        await LOST.close();
    }
    // bootstrap.js itself, or the first loading module, is unavailable: the authored HTML still offers a reload.
    {
        const CONTEXT = await context(),
            PAGE = await CONTEXT.newPage();
        await PAGE.route('**/src/bootstrap.js', (route) =>
            route.fulfill({ status: 503, contentType: 'text/javascript', body: '' }),
        );
        await PAGE.goto(`${ORIGIN}/index.html`);
        await PAGE.waitForFunction(() =>
            document.getElementById('bloom-loading-label').textContent.includes('시작 파일을 불러오지'),
        );
        assert.equal(await PAGE.locator('#bloom-loading-retry').isVisible(), true);
        await CONTEXT.close();
        const GUARD = await context(),
            GUARD_PAGE = await GUARD.newPage();
        await GUARD_PAGE.route('**/src/startup-loading.js', (route) =>
            route.fulfill({ status: 503, contentType: 'text/javascript', body: '' }),
        );
        await GUARD_PAGE.goto(`${ORIGIN}/index.html`);
        assert.equal(await GUARD_PAGE.locator('#newGame').isVisible(), false);
        assert.equal(await GUARD_PAGE.locator('#bloom-loading-retry').getAttribute('href'), '');
        const RELOAD = GUARD_PAGE.waitForRequest((request) => request.isNavigationRequest());
        await GUARD_PAGE.locator('#bloom-loading-retry').click();
        await RELOAD;
        REPORT.scenarios.bootstrapAndGuardFailure = 'PASS';
        await GUARD.close();
        // The page locale awaits the verified i18n bundle: without it no message module runs, and the authored
        // HTML reload link is what remains (docs/i18n.md).
        const I18N = await context(),
            I18N_PAGE = await I18N.newPage(),
            I18N_URL = MANIFEST.modules.find((entry) => entry.name === 'i18n').url;
        await I18N_PAGE.route(I18N_URL, (route) => route.fulfill({ status: 503, body: '' }));
        const MODULE_ERROR = I18N_PAGE.waitForEvent('pageerror');
        await I18N_PAGE.goto(`${ORIGIN}/index.html`);
        assert.match(String(await MODULE_ERROR), /Module request failed: 503 \(i18n\)/);
        assert.equal(await I18N_PAGE.evaluate(() => !!globalThis.BUDMORI), false, 'no i18n, no game');
        assert.equal(await I18N_PAGE.locator('#newGame').isVisible(), false);
        assert.equal(await I18N_PAGE.locator('#bloom-loading-retry').isVisible(), true);
        REPORT.scenarios.i18nFailure = 'PASS';
        await I18N.close();
    }
    REPORT.status = 'PASS';
    console.log(JSON.stringify({ status: REPORT.status, scenarios: Object.keys(REPORT.scenarios) }));
} catch (error) {
    REPORT.status = 'FAIL';
    REPORT.error = String(error.stack || error);
    throw error;
} finally {
    fs.writeFileSync(path.join(OUTPUT, 'report.json'), JSON.stringify(REPORT, null, 2));
    await browser?.close();
    SERVER.close();
}
