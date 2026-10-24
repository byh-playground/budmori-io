// One common boot check against the checked-in source, without generating deployment files.
// Species, migration and performance scenarios remain separate on-demand checks.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = fileURLToPath(new URL('../', import.meta.url)),
    OUTPUT = path.join(ROOT, 'tests/output/source-smoke'),
    HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'),
    MANIFEST = JSON.parse(
        HTML.match(/<script id="bloom-runtime-manifest" type="application\/json">(.*?)<\/script>/s)?.[1] || 'null',
    ),
    TYPES = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.svg': 'image/svg+xml',
    },
    MODULES = new Map(),
    REQUESTS = new Set(),
    ERRORS = [],
    REPORT = { status: 'running', startedAt: new Date().toISOString(), entry: 'src/farm-app.js' };
fs.mkdirSync(OUTPUT, { recursive: true });
fs.writeFileSync(path.join(OUTPUT, 'report.json'), JSON.stringify(REPORT, null, 2));

const SERVER = http.createServer((request, response) => {
    const URL_LOCAL = new URL(request.url, 'http://127.0.0.1'),
        RELATIVE = decodeURIComponent(URL_LOCAL.pathname).replace(/^\/+/, '') || 'index.html',
        FILE = path.resolve(ROOT, RELATIVE);
    if (URL_LOCAL.pathname === '/favicon.ico') {
        response.writeHead(204).end();
        return;
    }
    if (!FILE.startsWith(ROOT) || !fs.existsSync(FILE) || !fs.statSync(FILE).isFile()) {
        response.writeHead(404).end();
        return;
    }
    response.setHeader('content-type', TYPES[path.extname(FILE)] || 'application/octet-stream');
    response.end(fs.readFileSync(FILE));
});
let browser;
let page;
try {
    assert.equal(MANIFEST?.game?.file, 'src/farm-app.js', 'the source app is the production entry point');
    assert.match(HTML, /<script type="module" src="\.\/src\/bootstrap\.js" data-bloom-bootstrap><\/script>/);
    for (const MODULE of MANIFEST.modules) {
        const BYTES = fs.readFileSync(path.join(ROOT, 'vendor/upstream', `${MODULE.name}.js`));
        assert.equal(createHash('sha256').update(BYTES).digest('hex'), MODULE.sha256, `pinned offline ${MODULE.name}`);
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
            serviceWorkers: 'block',
        }),
        PAGE = await CONTEXT.newPage();
    page = PAGE;
    PAGE.setDefaultTimeout(45000);
    PAGE.on('pageerror', (error) => ERRORS.push(String(error)));
    PAGE.on('console', (message) => {
        if (message.type() === 'error' || message.text().includes('loop stopped')) {
            ERRORS.push(message.text());
        }
    });
    PAGE.on('response', (response) => {
        if (response.status() >= 400) {
            ERRORS.push(`HTTP ${response.status()}: ${response.url()}`);
        }
    });
    await CONTEXT.route('**/*', (route) => {
        const URL_LOCAL = route.request().url();
        REQUESTS.add(URL_LOCAL);
        if (URL_LOCAL.startsWith(`${ORIGIN}/`)) {
            return route.continue();
        }
        if (MODULES.has(URL_LOCAL)) {
            return route.fulfill({
                body: MODULES.get(URL_LOCAL),
                contentType: 'text/javascript',
                headers: { 'access-control-allow-origin': '*' },
            });
        }
        ERRORS.push(`Unexpected network request: ${URL_LOCAL}`);
        return route.abort();
    });
    await PAGE.goto(`${ORIGIN}/index.html`);
    await PAGE.waitForFunction(() => Boolean(globalThis.BUDMORI));
    await PAGE.locator('#newGame').click();
    await PAGE.waitForFunction(() => BUDMORI.sim?.scene === 'farm' && BUDMORI.sim.units.length > 0);
    await PAGE.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const STATE = await PAGE.evaluate(() => ({
        version: BUDMORI.version,
        units: BUDMORI.sim.units.length,
        canvasWidth: document.getElementById('world').width,
        canvasHeight: document.getElementById('world').height,
        loading: Boolean(document.getElementById('bloom-module-loading')),
        error: !document.getElementById('bloom-error-popup').hidden,
    }));
    assert.equal(STATE.version, MANIFEST.productVersion, 'source app version matches the manifest');
    assert.ok(STATE.canvasWidth > 0 && STATE.canvasHeight > 0, 'the production canvas is initialized');
    assert.equal(STATE.loading, false, 'startup completed');
    assert.equal(STATE.error, false, 'no startup diagnostic popup');
    assert.ok(REQUESTS.has(`${ORIGIN}/src/farm-app.js`), 'the browser loaded the native source app');
    assert.ok(![...REQUESTS].some((url) => new URL(url).pathname === '/src/game.js'), 'no generated bundle was used');
    assert.deepEqual(ERRORS, [], 'the source boot is free of page, console and network errors');
    REPORT.status = 'passed';
    REPORT.state = STATE;
    console.log(`PASS source boot: ${STATE.version}, ${STATE.units} units, native ESM, no generated bundle`);
} catch (error) {
    REPORT.status = 'failed';
    REPORT.failure = String(error.stack || error);
    throw error;
} finally {
    if (page && !page.isClosed()) {
        try {
            await page.screenshot({ path: path.join(OUTPUT, 'source-boot.png'), fullPage: true, timeout: 15000 });
            REPORT.screenshot = 'source-boot.png';
        } catch (error) {
            REPORT.screenshotError = String(error);
        }
    }
    REPORT.finishedAt = new Date().toISOString();
    REPORT.errors = ERRORS;
    REPORT.requests = [...REQUESTS];
    fs.writeFileSync(path.join(OUTPUT, 'report.json'), JSON.stringify(REPORT, null, 2));
    await browser?.close();
    await new Promise((resolve) => SERVER.close(resolve));
}
