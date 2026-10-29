// Fixed user flow: select a species, allocate, equalize, then reopen/reload on desktop and touch mobile.
// Uses the pinned vendor GameKit modules and Chromium SwiftShader, not live CDN or physical devices.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = fileURLToPath(new URL('../', import.meta.url)),
    OUTPUT = path.join(ROOT, 'tests/output/breed-allocation'),
    TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' },
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
async function readShares(page) {
    return page.locator('[data-breed-percent]').evaluateAll((nodes) => nodes.map((node) => parseInt(node.textContent)));
}
async function expectShares(page, expected) {
    assert.deepEqual(await readShares(page), expected);
    assert.equal(
        expected.reduce((sum, share) => sum + share, 0),
        100,
    );
}
async function setShare(page, value) {
    await page.locator('#speciesBreedShare').evaluate((node, next) => {
        node.value = String(next);
        node.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);
}
async function openFarm(page) {
    await page.locator('#upgradeMenu').click();
}
async function weights(page) {
    return page.evaluate(() => localStorage.getItem('budmori.breed.weights'));
}
async function seed(page, saved) {
    await page.evaluate((savedWeights) => {
        const W = BUDMORI.sim;
        for (const UNIT of [...W.units]) {
            W.removeUnit(UNIT);
        }
        for (const SPECIES of [0, 2, 5]) {
            for (let index = 0; index < 8; index++) {
                W.spawn(SPECIES, 1, index, SPECIES);
            }
        }
        W.setBreedWeights(savedWeights);
        localStorage.setItem('budmori.breed.weights', JSON.stringify(savedWeights));
        W.markProgressChanged();
        BUDMORI.storage.save(W);
    }, saved);
}
try {
    for (const MOBILE of [false, true]) {
        const CONTEXT = await BROWSER.newContext({
                viewport: MOBILE ? { width: 390, height: 844 } : { width: 1100, height: 850 },
                isMobile: MOBILE,
                hasTouch: MOBILE,
                deviceScaleFactor: 1,
            }),
            PAGE = await CONTEXT.newPage();
        PAGE.on('pageerror', (error) => ERRORS.push(String(error)));
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
        await PAGE.locator('#newGame').click();
        await openFarm(PAGE);
        assert.equal(await PAGE.locator('#speciesBreedShare').isDisabled(), true);
        await seed(PAGE, [7, 0, 2, 0, 0, 1]);
        await PAGE.waitForFunction(() => document.querySelectorAll('[data-breed-species]').length === 3);
        await expectShares(PAGE, [70, 20, 10]);
        const SAVED = await weights(PAGE);
        await setShare(PAGE, 70);
        assert.equal(await weights(PAGE), SAVED, 'no-op input must preserve raw saved weights');
        await PAGE.locator('[data-breed-species="2"]').click();
        await PAGE.locator('[data-breed-species="0"]').click();
        assert.equal(await weights(PAGE), SAVED, 'selection must not save/reset');
        await setShare(PAGE, 40);
        await expectShares(PAGE, [40, 40, 20]);
        for (const VALUE of [99, 100, 0, 50, 99, 100, 40]) {
            await setShare(PAGE, VALUE);
            assert.equal(
                (await readShares(PAGE)).reduce((a, b) => a + b, 0),
                100,
            );
        }
        await expectShares(PAGE, [40, 40, 20]);
        await PAGE.locator('#speciesBreedMore').click();
        await expectShares(PAGE, [41, 39, 20]);
        await PAGE.locator('#speciesBreedLess').click();
        await expectShares(PAGE, [40, 40, 20]);
        await PAGE.locator('[data-breed-species="5"]').click();
        await setShare(PAGE, 60);
        await expectShares(PAGE, [20, 20, 60]);
        await PAGE.locator('#speciesBreedEqual').click();
        await expectShares(PAGE, [34, 33, 33]);
        await PAGE.locator('#speciesBreedShare').press('End');
        await expectShares(PAGE, [0, 0, 100]);
        assert.equal(await PAGE.locator('#speciesBreedMore').isDisabled(), true);
        await PAGE.locator('#gameMenuClose').click();
        await openFarm(PAGE);
        await expectShares(PAGE, [0, 0, 100]);
        await PAGE.reload();
        await PAGE.waitForFunction(() => globalThis.BUDMORI && !document.getElementById('farmPanel').hidden);
        await expectShares(PAGE, [0, 0, 100]);
        await PAGE.locator('[data-breed-species="5"]').click();
        await setShare(PAGE, 60);
        await expectShares(PAGE, [20, 20, 60]);
        await PAGE.locator('#speciesBreedShare').press('Home');
        await expectShares(PAGE, [50, 50, 0]);
        assert.equal(await PAGE.locator('#speciesBreedLess').isDisabled(), true);
        await PAGE.locator('#speciesBreedShare').press('ArrowRight');
        await expectShares(PAGE, [50, 49, 1]);
        // Repeated actual pointer drags use the same baseline, including an endpoint and return.
        const RANGE = PAGE.locator('#speciesBreedShare');
        await RANGE.scrollIntoViewIfNeeded();
        const BOX = await RANGE.boundingBox();
        if (MOBILE) {
            const CDP = await CONTEXT.newCDPSession(PAGE);
            for (const FRACTION of [0.2, 0.8, 0.4]) {
                await CDP.send('Input.dispatchTouchEvent', {
                    type: 'touchStart',
                    touchPoints: [{ x: BOX.x + BOX.width / 2, y: BOX.y + BOX.height / 2 }],
                });
                await CDP.send('Input.dispatchTouchEvent', {
                    type: 'touchMove',
                    touchPoints: [{ x: BOX.x + BOX.width * FRACTION, y: BOX.y + BOX.height / 2 }],
                });
                await CDP.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
                assert.equal(
                    (await readShares(PAGE)).reduce((a, b) => a + b, 0),
                    100,
                );
            }
            const TOUCH_VALUE = Number(await RANGE.inputValue());
            assert.ok(TOUCH_VALUE >= 30 && TOUCH_VALUE <= 45, `touch slider changed to ${TOUCH_VALUE}`);
            await PAGE.locator('[data-breed-species="2"]').tap();
            assert.equal(await PAGE.locator('[data-breed-species="2"]').getAttribute('aria-pressed'), 'true');
            // Add all species, then drag the chips vertically: pane scrolls without editing weights.
            await PAGE.evaluate(() => {
                for (const SPECIES of [1, 3, 4, 6, 7, 8]) {
                    BUDMORI.sim.spawn(SPECIES, 1, 0, 0);
                }
                BUDMORI.sim.markProgressChanged();
            });
            await PAGE.waitForFunction(() => document.querySelectorAll('[data-breed-species]').length === 9);
            await PAGE.setViewportSize({ width: 320, height: 568 });
            await PAGE.locator('#farmPanel').evaluate((panel) => {
                panel.scrollTop = 0;
            });
            const CHIP_BOX = await PAGE.locator('[data-breed-species="0"]').boundingBox(),
                BEFORE_SCROLL = await weights(PAGE),
                X = CHIP_BOX.x + CHIP_BOX.width / 2,
                Y = CHIP_BOX.y + CHIP_BOX.height / 2;
            await CDP.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: X, y: Y }] });
            for (const DELTA of [20, 60, 120]) {
                await CDP.send('Input.dispatchTouchEvent', {
                    type: 'touchMove',
                    touchPoints: [{ x: X, y: Y - DELTA }],
                });
            }
            await CDP.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
            await PAGE.waitForTimeout(150);
            assert.ok(
                await PAGE.locator('#farmPanel').evaluate((panel) => panel.scrollTop > 0),
                'touch gesture scrolls pane',
            );
            assert.equal(await weights(PAGE), BEFORE_SCROLL, 'scroll does not edit weights');
            assert.equal(
                await PAGE.locator('#farmPanel').evaluate((panel) => panel.scrollWidth <= panel.clientWidth),
                true,
                'no mobile horizontal overflow',
            );
            await PAGE.setViewportSize({ width: 390, height: 844 });
            await PAGE.locator('#speciesBreedEqual').click();
            await expectShares(PAGE, [12, 11, 11, 11, 11, 11, 11, 11, 11]);
        } else {
            await PAGE.mouse.move(BOX.x + BOX.width / 2, BOX.y + BOX.height / 2);
            await PAGE.mouse.down();
            await PAGE.mouse.move(BOX.x + BOX.width - 1, BOX.y + BOX.height / 2, { steps: 8 });
            await PAGE.mouse.move(BOX.x + BOX.width * 0.4, BOX.y + BOX.height / 2, { steps: 8 });
            await PAGE.mouse.up();
            assert.equal(
                (await readShares(PAGE)).reduce((a, b) => a + b, 0),
                100,
            );
        }
        await PAGE.locator('#farmPanel').evaluate((panel) => {
            panel.scrollTop = 0;
        });
        await PAGE.screenshot({ path: path.join(OUTPUT, MOBILE ? 'mobile.png' : 'desktop.png') });
        assert.deepEqual(ERRORS, []);
        console.log(
            `PASS ${MOBILE ? 'mobile touch 390/320px' : 'desktop keyboard/pointer'}: selection, saved zero weights, proportional repeated edits, equal, endpoints, reload${MOBILE ? ', touch drag, scroll, all nine species' : ''}`,
        );
        await CONTEXT.close();
    }
} finally {
    await BROWSER.close();
    SERVER.close();
}
