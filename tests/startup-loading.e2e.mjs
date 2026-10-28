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
    REPORT = {
        status: 'running',
        scenarios: {},
        environment: 'local pinned sources; stage wall times include cooperative paint yields, not CDN speed',
    },
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
fs.mkdirSync(OUTPUT, { recursive: true });
let browser;
try {
    browser = await chromium.launch({
        executablePath: process.env.CHROME_PATH,
        ...(process.env.BUDMORI_HARDWARE_RENDERING === '1'
            ? {
                  ignoreDefaultArgs: ['--enable-unsafe-swiftshader'],
                  args: ['--use-angle=d3d11', '--disable-software-rasterizer'],
              }
            : { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }),
    });
    async function context(options = {}) {
        const CONTEXT = await browser.newContext({
            viewport: { width: 1100, height: 850 },
            deviceScaleFactor: 1,
            ...options,
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
        return CONTEXT;
    }
    for (const [NAME, OPTIONS] of [
        ['desktop', {}],
        ['mobile-landscape', { viewport: { width: 740, height: 360 }, isMobile: true, hasTouch: true }],
    ]) {
        const CONTEXT = await context(OPTIONS),
            PAGE = await CONTEXT.newPage(),
            ERRORS = [];
        PAGE.on('pageerror', (error) => ERRORS.push(String(error)));
        await PAGE.addInitScript(() => {
            globalThis.__startupFrames = [];
            const OBSERVE = () => {
                const PROGRESS = document.getElementById('bloom-loading-progress');
                if (PROGRESS && globalThis.__startupFrames.length < 1000) {
                    globalThis.__startupFrames.push({
                        label: document.getElementById('bloom-loading-label').textContent,
                        value: PROGRESS.getAttribute('value'),
                        max: PROGRESS.max,
                    });
                }
                if (!globalThis.BUDMORI) {
                    requestAnimationFrame(OBSERVE);
                }
            };
            requestAnimationFrame(OBSERVE);
        });
        let release;
        const GATE = new Promise((resolve) => {
            release = resolve;
        });
        await PAGE.route('**/src/bootstrap.js', async (route) => {
            await GATE;
            return route.continue();
        });
        await PAGE.goto(`${ORIGIN}/index.html`, { waitUntil: 'commit' });
        await PAGE.locator('#bloom-module-loading').waitFor({ state: 'visible' });
        assert.equal(await PAGE.locator('#newGame').isVisible(), false, 'menu input hidden before bootstrap');
        assert.equal(await PAGE.evaluate(() => !!globalThis.BudmoriStartup), false, 'first UI is authored HTML');
        await PAGE.keyboard.press('Tab');
        assert.notEqual(await PAGE.evaluate(() => document.activeElement?.id), 'newGame');
        await PAGE.screenshot({ path: path.join(OUTPUT, `${NAME}-initial.png`) });
        release();
        if (NAME === 'desktop') {
            await PAGE.waitForFunction(() => {
                const PROGRESS = document.getElementById('bloom-loading-progress');
                return (
                    document.getElementById('bloom-loading-label')?.textContent.includes('이미지') &&
                    Number(PROGRESS?.getAttribute('value')) > 0
                );
            });
            await PAGE.setViewportSize({ width: 1000, height: 700 });
        }
        await PAGE.waitForFunction(
            () => !!globalThis.BUDMORI && !document.getElementById('bloom-module-loading'),
            null,
            { timeout: 90000 },
        );
        const DATA = await PAGE.evaluate(() => {
            const GL = BUDMORI.renderer.device.gl,
                EXT = GL.getExtension('WEBGL_debug_renderer_info');
            return {
                startup: globalThis.BudmoriStartup.snapshot(),
                art: BUDMORI.unitArtDiagnostics,
                gpu: GL.getParameter(EXT?.UNMASKED_RENDERER_WEBGL ?? GL.RENDERER),
                frames: globalThis.__startupFrames,
                busy: document.body.hasAttribute('data-startup'),
                canvasSize: [BUDMORI.renderer.canvas.width, BUDMORI.renderer.canvas.height],
                expectedSize: [
                    Math.round(innerWidth * BUDMORI.renderer.pixelRatio),
                    Math.round(innerHeight * BUDMORI.renderer.pixelRatio),
                ],
                cpuMs: BUDMORI.renderer.unitSprites.preparationCpuMs,
                preparationWallMs: BUDMORI.renderer.startupPreparationWallMs,
            };
        });
        assert.equal(DATA.startup.state, 'ready');
        assert.equal(DATA.busy, false);
        assert.deepEqual(
            DATA.canvasSize,
            DATA.expectedSize,
            'resize during preparation reaches the first visible frame',
        );
        const PARTIAL = DATA.frames.filter(
            (frame) => frame.label.includes('이미지') && Number(frame.value) > 0 && Number(frame.value) < frame.max,
        );
        assert.ok(
            new Set(PARTIAL.map((frame) => frame.value)).size >= 2,
            'atlas progress painted on multiple real RAF frames',
        );
        assert.ok(DATA.preparationWallMs >= DATA.cpuMs, 'CPU excludes cooperative waiting');
        assert.ok(DATA.art.bakeCount > 0);
        if (OPTIONS.hasTouch) {
            await PAGE.tap('#newGame');
        } else {
            await PAGE.locator('#newGame').focus();
            await PAGE.keyboard.press('Enter');
        }
        await PAGE.waitForFunction(() => BUDMORI.runtime?.presentationView?.units.length > 0);
        const BEFORE = await PAGE.evaluate(() => ({
            bake: BUDMORI.unitArtDiagnostics.bakeCount,
            image: BUDMORI.renderer.device.stats.imageTexUploadCount,
            preparationCpuMs: BUDMORI.unitArtDiagnostics.preparationCpuMs,
            time: BUDMORI.sim.time,
        }));
        await PAGE.evaluate(
            () =>
                new Promise((resolve) => {
                    let frames = 0;
                    const TICK = () => (++frames === 12 ? resolve() : requestAnimationFrame(TICK));
                    requestAnimationFrame(TICK);
                }),
        );
        const AFTER = await PAGE.evaluate(() => ({
            bake: BUDMORI.unitArtDiagnostics.bakeCount,
            image: BUDMORI.renderer.device.stats.imageTexUploadCount,
            preparationCpuMs: BUDMORI.unitArtDiagnostics.preparationCpuMs,
            time: BUDMORI.sim.time,
        }));
        assert.equal(AFTER.bake, BEFORE.bake);
        assert.equal(typeof BEFORE.image, 'number');
        assert.equal(AFTER.image, BEFORE.image, 'normal frames upload no new images');
        assert.equal(AFTER.preparationCpuMs, BEFORE.preparationCpuMs, 'no-op frames do not accumulate preparation CPU');
        assert.ok(AFTER.time > BEFORE.time, 'game resumes after startup');
        assert.deepEqual(ERRORS, []);
        REPORT.scenarios[NAME] = { ...DATA, steady: { before: BEFORE, after: AFTER } };
        await PAGE.screenshot({ path: path.join(OUTPUT, `${NAME}-ready.png`) });
        await CONTEXT.close();
    }
    const CONTEXT = await context(),
        PAGE = await CONTEXT.newPage();
    let fail = true;
    let releaseOldInput;
    let oldInputEntered;
    let delayFirstInput = true;
    const OLD_INPUT_RELEASED = new Promise((resolve) => {
        releaseOldInput = resolve;
    });
    const OLD_INPUT_SEEN = new Promise((resolve) => {
        oldInputEntered = resolve;
    });
    await PAGE.route('**/input.js', async (route) => {
        if (delayFirstInput) {
            delayFirstInput = false;
            oldInputEntered();
            await OLD_INPUT_RELEASED;
            if (route.request().failure()) {
                return;
            }
        }
        return route.fallback();
    });
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
    assert.equal(await PAGE.locator('#newGame').isVisible(), false);
    await OLD_INPUT_SEEN;
    await PAGE.evaluate(() => {
        globalThis.__failedAttemptMarker = 'old-attempt';
    });
    fail = false;
    // The background HTML link is keyboard reachable even while the dialog
    // covers it. Every retry must replace the realm, including this route.
    await PAGE.locator('#bloom-loading-retry').focus();
    await Promise.all([PAGE.waitForNavigation({ waitUntil: 'domcontentloaded' }), PAGE.keyboard.press('Enter')]);
    releaseOldInput();
    await PAGE.waitForFunction(() => !!globalThis.BUDMORI && !document.getElementById('bloom-module-loading'), null, {
        timeout: 90000,
    });
    assert.equal(await PAGE.evaluate(() => globalThis.__failedAttemptMarker), undefined, 'old retry realm discarded');
    const MODULE_STAGE = await PAGE.evaluate(() =>
        globalThis.BudmoriStartup.snapshot().stages.find((stage) => stage.stage === 'modules'),
    );
    assert.equal(MODULE_STAGE.completed, MANIFEST.modules.length);
    assert.equal(MODULE_STAGE.total, MANIFEST.modules.length);
    REPORT.scenarios.moduleFailureRetry =
        'PASS: failed Promise.all with pending input, keyboard HTML retry reloads, old realm discarded, exact module count';
    await CONTEXT.close();
    const FAILED_ATLAS = await context(),
        ATLAS_PAGE = await FAILED_ATLAS.newPage();
    await ATLAS_PAGE.route('**/src/farm-app.js', (route) =>
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
    await ATLAS_PAGE.goto(`${ORIGIN}/index.html`);
    await ATLAS_PAGE.locator('#bloom-error-popup').waitFor({ state: 'visible' });
    assert.match(await ATLAS_PAGE.locator('#bloom-error-popup').innerText(), /injected atlas preparation error/);
    assert.equal(await ATLAS_PAGE.evaluate(() => globalThis.BudmoriStartup.snapshot().state), 'error');
    assert.equal(await ATLAS_PAGE.locator('#newGame').isVisible(), false);
    REPORT.scenarios.atlasPreparationFailure =
        'PASS: rejected preparation remains an error, input blocked, reload offered';
    await FAILED_ATLAS.close();
    const LOST_CONTEXT = await context(),
        LOST_PAGE = await LOST_CONTEXT.newPage();
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
    REPORT.scenarios.lossDuringPreparation = 'PASS: actual WEBGL_lose_context during preparation requires reload';
    await LOST_CONTEXT.close();
    const FAILED_BOOT = await context(),
        FAILED_PAGE = await FAILED_BOOT.newPage();
    await FAILED_PAGE.route('**/src/bootstrap.js', (route) =>
        route.fulfill({ status: 503, contentType: 'text/javascript', body: '' }),
    );
    await FAILED_PAGE.goto(`${ORIGIN}/index.html`);
    await FAILED_PAGE.waitForFunction(() =>
        document.getElementById('bloom-loading-label').textContent.includes('시작 파일을 불러오지'),
    );
    assert.equal(await FAILED_PAGE.locator('#bloom-loading-retry').isVisible(), true);
    REPORT.scenarios.bootstrapFailure = 'PASS: initial HTML surfaces module-load failure and reload action';
    await FAILED_BOOT.close();
    const FAILED_GUARD = await context(),
        GUARD_PAGE = await FAILED_GUARD.newPage();
    await GUARD_PAGE.route('**/src/startup-loading.js', (route) =>
        route.fulfill({ status: 503, contentType: 'text/javascript', body: '' }),
    );
    await GUARD_PAGE.goto(`${ORIGIN}/index.html`);
    assert.equal(await GUARD_PAGE.locator('#newGame').isVisible(), false);
    assert.equal(await GUARD_PAGE.locator('#bloom-loading-retry').getAttribute('href'), '');
    const RELOAD = GUARD_PAGE.waitForRequest((request) => request.isNavigationRequest());
    await GUARD_PAGE.locator('#bloom-loading-retry').click();
    await RELOAD;
    REPORT.scenarios.guardModuleFailure = 'PASS: static HTML reload works even when the loading module is unavailable';
    await FAILED_GUARD.close();
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
