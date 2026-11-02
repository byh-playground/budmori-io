// User flow: start -> settings -> home -> resume, history, overwrite cancellation and reload.
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
try {
    for (const [WIDTH, HEIGHT] of [
        [1280, 720],
        [390, 844],
        [667, 375],
    ]) {
        const CONTEXT = await BROWSER.newContext({
            viewport: { width: WIDTH, height: HEIGHT },
            isMobile: WIDTH === 390,
            hasTouch: WIDTH === 390,
            deviceScaleFactor: 1,
            serviceWorkers: 'block',
            reducedMotion: 'reduce',
        });
        const PAGE = await CONTEXT.newPage(),
            PRESS = (locator) => (WIDTH === 390 ? locator.tap() : locator.click());
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
        await PAGE.goto(TEST_URL);
        await PAGE.waitForFunction(() => globalThis.BUDMORI && !document.getElementById('bloom-module-loading'));
        assert.equal(await PAGE.locator('#continueGame').isVisible(), false);
        assert.equal(await PAGE.locator('#newGame').isEnabled(), true);
        assert.equal(
            await PAGE.locator('.home-mori').evaluateAll((images) =>
                images.every((img) => img.complete && img.naturalWidth > 0),
            ),
            true,
        );
        assert.equal(await PAGE.locator('#startScreen').evaluate((el) => el.scrollWidth <= innerWidth), true);
        const START = await PAGE.locator('#newGame').boundingBox();
        assert(START.y >= 0 && START.y + START.height <= HEIGHT, 'start is visible without scrolling');
        await PRESS(PAGE.locator('#newGame'));
        await PAGE.waitForFunction(() => document.body.dataset.home === 'false');
        await PAGE.evaluate(() => {
            globalThis.__homeFlowWorld = BUDMORI.sim;
            BUDMORI.sim.playerProgression.towerBest = 40;
            BUDMORI.sim.markProgressChanged();
        });
        await PRESS(PAGE.locator('#gameMenu'));
        await PRESS(PAGE.locator('#returnHome'));
        assert.equal(new globalThis.URL(PAGE.url()).hash, '#/');
        assert.equal(await PAGE.locator('#gameMenuOverlay').isVisible(), false);
        assert.match(await PAGE.locator('#homeProgress').textContent(), /최고 40층/);
        assert.equal(await PAGE.evaluate(() => BUDMORI.runtime.paused), true);
        const TIME = await PAGE.evaluate(() => {
            globalThis.__homeRender = BUDMORI.renderer.render;
            globalThis.__homeRenderCalls = 0;
            BUDMORI.renderer.render = function (...args) {
                globalThis.__homeRenderCalls++;
                return globalThis.__homeRender.apply(this, args);
            };
            return BUDMORI.sim.time;
        });
        await PAGE.waitForTimeout(150);
        assert.equal(await PAGE.evaluate(() => BUDMORI.sim.time), TIME, 'home pauses logic');
        assert.equal(
            await PAGE.evaluate(() => globalThis.__homeRenderCalls),
            0,
            'the opaque home never draws the hidden army',
        );
        await PAGE.evaluate(() => {
            BUDMORI.renderer.render = globalThis.__homeRender;
        });
        await PRESS(PAGE.locator('#newGame'));
        assert.equal(await PAGE.locator('#newConfirm').isVisible(), true);
        await PRESS(PAGE.locator('#cancelNew'));
        if (WIDTH === 1280) {
            await PAGE.evaluate(() => BUDMORI.play.set({ lastSeenMs: Date.now() - 120000 }));
        }
        await PRESS(PAGE.locator('#continueGame'));
        if (WIDTH === 1280) {
            assert.match(await PAGE.locator('#offlineNotice').textContent(), /2분 동안 자리를 비웠어요/);
            assert.equal(
                await PAGE.locator('#offlineNotice').isVisible(),
                true,
                'farm continuation retains idle settlement',
            );
        }
        assert.equal(
            await PAGE.evaluate(() => BUDMORI.sim === globalThis.__homeFlowWorld),
            true,
            'farm resumes the same live session',
        );
        await PRESS(PAGE.locator('#gameMenu'));
        await PRESS(PAGE.locator('#returnHome'));
        await PAGE.goBack();
        await PAGE.waitForFunction(() => !document.getElementById('gameMenuOverlay').hidden);
        assert.equal(new globalThis.URL(PAGE.url()).hash, '#/menu');
        await PAGE.goForward();
        await PAGE.waitForFunction(() => !document.getElementById('startScreen').hidden);
        await PAGE.waitForFunction(
            () => JSON.parse(localStorage.getItem('budmori-farm'))?.farm?.player.towerBest === 40,
        );
        await PAGE.reload();
        await PAGE.waitForFunction(() => globalThis.BUDMORI && !document.getElementById('bloom-module-loading'));
        assert.equal(await PAGE.locator('#startScreen').isVisible(), true);
        assert.match(await PAGE.locator('#homeProgress').textContent(), /최고 40층/);
        await PRESS(PAGE.locator('.home-save-tools > summary'));
        const DOWNLOAD = PAGE.waitForEvent('download');
        await PRESS(PAGE.locator('#exportSave'));
        assert((await DOWNLOAD).suggestedFilename().endsWith('.json'));
        await PRESS(PAGE.locator('#continueGame'));
        assert.equal(await PAGE.evaluate(() => BUDMORI.sim.playerProgression.towerBest), 40);
        if (WIDTH === 1280) {
            await PRESS(PAGE.locator('#bossChallenge'));
            if (await PAGE.locator('#deckGo').isVisible()) {
                await PRESS(PAGE.locator('#deckGo'));
            }
            await PAGE.waitForFunction(() => BUDMORI.sim.tower.active);
            await PAGE.evaluate(() => {
                globalThis.__homeFlowClimb = BUDMORI.sim;
            });
            await PRESS(PAGE.locator('#gameMenu'));
            await PRESS(PAGE.locator('#returnHome'));
            assert.equal(await PAGE.locator('#continueGame').textContent(), '도전 이어가기');
            await PRESS(PAGE.locator('#continueGame'));
            assert.equal(
                await PAGE.evaluate(() => BUDMORI.sim === globalThis.__homeFlowClimb && BUDMORI.sim.tower.active),
                true,
                'home never recreates the climb',
            );
        }
        console.log(
            `PASS home ${WIDTH}x${HEIGHT}: start, return, pause, cancel replacement, resume identity, history, export and reload`,
        );
        await CONTEXT.close();
    }
    assert.deepEqual(ERRORS, []);
} finally {
    await BROWSER.close();
    await new Promise((resolve) => SERVER.close(resolve));
}
