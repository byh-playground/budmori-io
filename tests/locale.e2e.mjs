// User flow: an English browser gets English screens, switches to Korean in settings and keeps the farm,
// and cannot switch during a tower run (the run lives only in page memory). Contract: docs/i18n.md.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('../', import.meta.url));
const TYPES = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.svg': 'image/svg+xml' };
const SERVER = http.createServer((request, response) => {
    const URL_PATH = new URL(request.url, 'http://local').pathname;
    const FILE = path.join(ROOT, URL_PATH.endsWith('/') ? URL_PATH + 'index.html' : URL_PATH);
    if (!FILE.startsWith(ROOT) || !fs.existsSync(FILE) || !fs.statSync(FILE).isFile()) {
        response.writeHead(404).end();
        return;
    }
    response.setHeader('content-type', TYPES[path.extname(FILE)] || 'application/octet-stream');
    response.end(fs.readFileSync(FILE));
});
await new Promise((resolve) => SERVER.listen(0, '127.0.0.1', resolve));
const TEST_URL = `http://127.0.0.1:${SERVER.address().port}/`;
const BROWSER = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ERRORS = [];
// Hangul in text the player can currently see (hidden dialogs and noscript excluded).
const VISIBLE_HANGUL = () =>
    [...document.body.querySelectorAll('*')]
        .filter((element) => element.checkVisibility() && element.tagName !== 'NOSCRIPT')
        .flatMap((element) => [...element.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE))
        .map((node) => node.textContent.trim())
        .filter((text) => /[가-힣]/u.test(text));
async function ready(page) {
    await page.waitForFunction(() => globalThis.BUDMORI && !document.getElementById('bloom-module-loading'));
}
try {
    const CONTEXT = await BROWSER.newContext({
        locale: 'en-US',
        viewport: { width: 1280, height: 720 },
        serviceWorkers: 'block',
        reducedMotion: 'reduce',
    });
    const PAGE = await CONTEXT.newPage();
    PAGE.on('pageerror', (error) => ERRORS.push(String(error)));
    await PAGE.route(/cdn\.jsdelivr\.net\/gh\/byh-playground\/bloom-gamekit@[0-9a-f]+\/(.*)/, (route) =>
        route.fulfill({
            body: fs.readFileSync(
                path.join(
                    ROOT,
                    'vendor/upstream',
                    route
                        .request()
                        .url()
                        .match(/@[0-9a-f]+\/(.*)$/)[1],
                ),
            ),
            contentType: 'text/javascript',
            headers: { 'access-control-allow-origin': '*' },
        }),
    );

    // 1. English browser → English home and farm.
    await PAGE.goto(TEST_URL);
    await ready(PAGE);
    assert.equal(await PAGE.evaluate(() => document.documentElement.lang), 'en');
    assert.deepEqual(await PAGE.evaluate(VISIBLE_HANGUL), [], 'home screen shows no Korean');
    await PAGE.locator('#newGame').click();
    await PAGE.waitForFunction(() => document.body.dataset.home === 'false');
    await PAGE.locator('#gameMenu').click();
    assert.deepEqual(await PAGE.evaluate(VISIBLE_HANGUL), [], 'farm and settings show no Korean');
    assert.equal(await PAGE.locator('#languageChoices [data-locale="en"]').getAttribute('aria-pressed'), 'true');

    // 2. Counterexample: during a tower run the switch is refused and the page stays.
    await PAGE.evaluate(() => BUDMORI.sim.startTower(1));
    await PAGE.locator('#languageChoices [data-locale="ko"]').click();
    assert.match(await PAGE.locator('#languageNotice').textContent(), /tower run/u);
    assert.equal(await PAGE.evaluate(() => document.documentElement.lang), 'en');
    await PAGE.evaluate(() => BUDMORI.sim.leaveTower());
    assert.equal(await PAGE.evaluate(() => BUDMORI.sim.tower.active), false, 'test left the tower');

    // 3. Switching to Korean reloads into Korean and keeps the farm; the choice survives a plain reload.
    const TROOPS = await PAGE.evaluate(() => BUDMORI.sim.units.length);
    await Promise.all([PAGE.waitForURL(/[?&]lang=ko/u), PAGE.locator('#languageChoices [data-locale="ko"]').click()]);
    await ready(PAGE);
    assert.equal(await PAGE.evaluate(() => document.documentElement.lang), 'ko');
    assert.equal(await PAGE.locator('#continueGame').textContent(), '농장 이어가기');
    await PAGE.goto(TEST_URL);
    await ready(PAGE);
    assert.equal(await PAGE.evaluate(() => document.documentElement.lang), 'ko', 'saved choice beats en-US');
    await PAGE.locator('#continueGame').click();
    await PAGE.waitForFunction(() => document.body.dataset.home === 'false');
    assert.equal(await PAGE.evaluate(() => BUDMORI.sim.units.length), TROOPS, 'farm kept across the switch');
    assert.deepEqual(ERRORS, []);
    console.log('locale flow: PASS');
} finally {
    await BROWSER.close();
    SERVER.close();
}
