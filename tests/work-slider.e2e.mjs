// Actual work split control with saved preferences for absent/insufficient species.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = process.cwd(),
    OUT = path.join(ROOT, 'tests/output/work-slider');
fs.mkdirSync(OUT, { recursive: true });
const SERVER = http.createServer((request, response) => {
    const FILE = path.join(ROOT, new URL(request.url, 'http://local').pathname);
    if (!FILE.startsWith(ROOT) || !fs.existsSync(FILE) || !fs.statSync(FILE).isFile()) {
        return response.writeHead(404).end();
    }
    response.setHeader(
        'content-type',
        { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }[
            path.extname(FILE)
        ] || 'application/octet-stream',
    );
    response.end(fs.readFileSync(FILE));
});
await new Promise((resolve) => SERVER.listen(0, '127.0.0.1', resolve));
const BROWSER = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }),
    RESULTS = [];
try {
    for (const MOBILE of [false, true]) {
        const CONTEXT = await BROWSER.newContext({
                viewport: MOBILE ? { width: 390, height: 844 } : { width: 1100, height: 850 },
                isMobile: MOBILE,
                hasTouch: MOBILE,
            }),
            PAGE = await CONTEXT.newPage(),
            ERRORS = [];
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
        await PAGE.goto(`http://127.0.0.1:${SERVER.address().port}/index.html`);
        await PAGE.waitForFunction(() => globalThis.BUDMORI);
        await PAGE.locator('#newGame').click();
        await PAGE.waitForFunction(() => document.getElementById('workCutA').value === '60');
        await PAGE.evaluate(() => {
            const W = BUDMORI.sim;
            BUDMORI.runtime.paused = true;
            W.resetUnits();
            W.food.length = 0;
            for (let i = 0; i < 5; i++) {
                const U = W.spawn(0, 1, i, 0);
                U.growthElapsed = U.growthDuration;
                U.z = U.vz = 0;
                U.dropLanded = true;
            }
            W.setBreedWeights([0, 100]);
            W.setWorkBasisPoints(5000);
            BUDMORI.renderer.takeCameraControl();
            return BUDMORI.play.set({ breedWeights: W.breedWeights, workBasisPoints: 5000 });
        });
        async function expectSplit(cut, workers) {
            await PAGE.waitForFunction(
                ({ cut, workers }) => {
                    const W = BUDMORI.sim,
                        N = document.getElementById('workCutA');
                    return (
                        Number(N.value) === cut &&
                        !N.disabled &&
                        W.workBasisPoints === (100 - cut) * 100 &&
                        W.workerCount === workers &&
                        document.getElementById('workHudFood').textContent === `먹이 ${workers}` &&
                        document.getElementById('workHudBreed').textContent === `번식 ${5 - workers}`
                    );
                },
                { cut, workers },
            );
            assert.deepEqual(
                await PAGE.evaluate(() => BUDMORI.sim.breedWeights),
                [0, 100],
                'Saved species preferences remain intact',
            );
        }
        await expectSplit(50, 2);
        await PAGE.evaluate(async () => {
            const { workersBySpecies: ALLOCATE } = await import('/src/model/farm-work.js');
            for (const LENGTHS of [
                new Map([[0, 5]]),
                new Map([
                    [0, 4],
                    [1, 1],
                ]),
                new Map([
                    [0, 2],
                    [1, 3],
                    [2, 2],
                ]),
            ]) {
                const TOTAL = [...LENGTHS.values()].reduce((sum, count) => sum + count, 0);
                for (let points = 0; points <= 10000; points += 500) {
                    const A = ALLOCATE(LENGTHS, points / 10000, [0, 100]),
                        B = ALLOCATE(LENGTHS, points / 10000, [0, 100]);
                    if (
                        [...A.values()].reduce((sum, count) => sum + count, 0) !==
                            Math.floor((TOTAL * points) / 10000 + 1e-9) ||
                        JSON.stringify([...A]) !== JSON.stringify([...B])
                    ) {
                        throw new Error('Worker quota or deterministic allocation failed');
                    }
                }
            }
        });
        const RANGE = PAGE.locator('#workCutA');
        await RANGE.focus();
        await PAGE.keyboard.press('Home');
        await expectSplit(0, 5);
        await PAGE.keyboard.press('End');
        await expectSplit(100, 0);
        await RANGE.evaluate((node) => {
            node.value = '30';
            node.dispatchEvent(new Event('change', { bubbles: true }));
        });
        await expectSplit(30, 3);
        await RANGE.evaluate((node) => {
            node.value = '50';
            node.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await expectSplit(50, 2);
        const BOX = await RANGE.boundingBox(),
            Y = BOX.y + BOX.height / 2;
        await PAGE.evaluate(() => {
            globalThis.sliderCanvasGestures = 0;
            document.getElementById('world').addEventListener('pointerdown', () => {
                globalThis.sliderCanvasGestures++;
            });
        });
        if (MOBILE) {
            const CDP = await CONTEXT.newCDPSession(PAGE);
            await CDP.send('Input.dispatchTouchEvent', {
                type: 'touchStart',
                touchPoints: [{ x: BOX.x + BOX.width / 2, y: Y }],
            });
            for (let i = 1; i <= 8; i++) {
                await CDP.send('Input.dispatchTouchEvent', {
                    type: 'touchMove',
                    touchPoints: [{ x: BOX.x + BOX.width / 2 + ((BOX.width / 2 - 1) * i) / 8, y: Y }],
                });
            }
            await CDP.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        } else {
            await PAGE.mouse.move(BOX.x + BOX.width / 2, Y);
            await PAGE.mouse.down();
            await PAGE.mouse.move(BOX.x + BOX.width - 1, Y, { steps: 8 });
            await PAGE.mouse.up();
        }
        await expectSplit(100, 0);
        assert.equal(
            await PAGE.evaluate(() => globalThis.sliderCanvasGestures),
            0,
            'Slider gestures never start the canvas camera handler',
        );
        await PAGE.evaluate(() => BUDMORI.storage.save(BUDMORI.sim));
        await PAGE.reload();
        await PAGE.waitForFunction(() => globalThis.BUDMORI && BUDMORI.sim.units.length === 5);
        if (await PAGE.locator('#continueGame').isVisible()) {
            await PAGE.locator('#continueGame').click();
        }
        await expectSplit(100, 0);
        await RANGE.focus();
        await PAGE.keyboard.press('Home');
        await expectSplit(0, 5);
        await PAGE.screenshot({ path: path.join(OUT, MOBILE ? 'mobile.png' : 'desktop.png') });
        assert.deepEqual(ERRORS, []);
        RESULTS.push({
            mobile: MOBILE,
            missingSpecies: true,
            inputChange: true,
            keyboard: true,
            drag: true,
            reload: true,
            cameraGestureNotStarted: true,
        });
        await CONTEXT.close();
    }
    fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify({ status: 'PASS', results: RESULTS }, null, 2));
    console.log(
        'PASS work slider: missing species, counts/model/position, input/change, keyboard, pointer/touch, reload, camera',
    );
} finally {
    await BROWSER.close();
    SERVER.close();
}
