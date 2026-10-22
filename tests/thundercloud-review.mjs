// Temporary visual review fixture. Removed before the final merge, per project verification policy.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const ROOT = fileURLToPath(new URL('../', import.meta.url));
const OUTPUT = path.join(ROOT, 'tests/output/thundercloud');
const BASE = 'c52dccd56d884ab6d760da499996a787fcaa8607';
const TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.json': 'application/json',
};
fs.mkdirSync(OUTPUT, { recursive: true });
const OLD = new Map();
const SERVER = http.createServer((request, response) => {
    let file = decodeURIComponent(request.url.split('?')[0]);
    const BEFORE = file.startsWith('/before/');
    file = file.replace(/^\/(before|after)\//, '');
    if (file.endsWith('/')) {
        file += 'index.html';
    }
    file = file.replace(/^\//, '');
    const FULL = path.resolve(ROOT, file);
    if (!FULL.startsWith(ROOT) || !fs.existsSync(FULL) || fs.statSync(FULL).isDirectory()) {
        response.writeHead(404).end();
        return;
    }
    let body = fs.readFileSync(FULL);
    if (BEFORE && (file === 'index.html' || file.startsWith('src/'))) {
        if (!OLD.has(file)) {
            OLD.set(file, execFileSync('git', ['show', `${BASE}:${file}`]));
        }
        body = OLD.get(file);
    }
    response.setHeader('content-type', TYPES[path.extname(file)] || 'application/octet-stream');
    response.end(body);
});
await new Promise((resolve) => SERVER.listen(0, '127.0.0.1', resolve));
const BROWSER = await chromium.launch({
    args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
const RESULTS = [],
    ERRORS = [];
try {
    for (const MOBILE of [false, true]) {
        for (const VARIANT of ['before', 'after']) {
            const CONTEXT = await BROWSER.newContext({
                viewport: MOBILE ? { width: 390, height: 844 } : { width: 1100, height: 850 },
                deviceScaleFactor: 1,
            });
            await CONTEXT.addInitScript(() => {
                const RAF = window.requestAnimationFrame.bind(window);
                window.requestAnimationFrame = (callback) =>
                    RAF((time) => {
                        if (!window.qaPaused) {
                            callback(time);
                        }
                    });
            });
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
            const PAGE = await CONTEXT.newPage();
            PAGE.on('pageerror', (error) => ERRORS.push(String(error)));
            await PAGE.goto(`http://127.0.0.1:${SERVER.address().port}/${VARIANT}/index.html`);
            await PAGE.waitForFunction(() => globalThis.BUDMORI);
            await PAGE.locator('#newGame').click();
            await PAGE.waitForTimeout(300);
            await PAGE.evaluate(() => {
                window.qaPaused = true;
                const W = BUDMORI.sim;
                W.randomBossSpecies = () => 3;
                W.startTower(1);
                W.finishMarch();
                for (let i = 0; i < 90; i++) {
                    W.step(1 / 30);
                    W.advanceWork(1 / 30);
                }
                W.boss.x = 0;
                W.boss.y = 0;
                W.boss.z = 0;
                W.boss.hp = W.boss.maxHp;
                W.boss.patternRuntime.active = null;
                BUDMORI.renderer.sceneChangedAt = -1e9;
                window.qaEffect = null;
            });
            for (const CASE of [
                { name: 'boss-active', age: 1, y: 0 },
                { name: 'boss-enter', age: 0.25, y: 0 },
                { name: 'boss-exit', age: 5.75, y: 0 },
                { name: 'boss-back', age: 1.4, y: 10 },
                { name: 'small-active', age: 1, y: 0, small: true },
            ]) {
                const METRICS = await PAGE.evaluate((sample) => {
                    const W = BUDMORI.sim,
                        R = BUDMORI.renderer;
                    W.boss.y = sample.y;
                    const TARGET = sample.small ? W.units[0] : W.boss;
                    TARGET.x = 0;
                    TARGET.y = sample.y;
                    TARGET.z = 0;
                    const HEIGHT = TARGET.height,
                        RADIUS = TARGET.radius;
                    const TARGET_Z = HEIGHT + Math.max(0.12, HEIGHT * 0.06);
                    W.formationRuntime.effects.length = 0;
                    W.formationSkills.addEffect('storm-cloud', {
                        x: 0,
                        y: sample.y,
                        z: TARGET_Z + 2,
                        targetX: 0,
                        targetY: sample.y,
                        targetZ: TARGET_Z,
                        bodyHeight: HEIGHT,
                        bodyRadius: RADIUS,
                        age: sample.age,
                        duration: 5,
                        pulse: sample.age > 0.5 ? 3 : 0,
                        lastPulse: 0.9,
                    });
                    BUDMORI.runtime.capturePresentation('reset');
                    const VIEW = BUDMORI.runtime.presentation(performance.now());
                    if (sample.small) {
                        VIEW.farmBossEvent = { ...VIEW.farmBossEvent, phase: 'idle' };
                    }
                    const ELLIPSE = R.ellipse;
                    const BOX = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
                    R.ellipse = function (x, y, rx, ry, color, ...rest) {
                        if (/^rgba\((98,128,157|168,190,212),/.test(color)) {
                            BOX.left = Math.min(BOX.left, x - rx);
                            BOX.right = Math.max(BOX.right, x + rx);
                            BOX.top = Math.min(BOX.top, y - ry);
                            BOX.bottom = Math.max(BOX.bottom, y + ry);
                        }
                        return ELLIPSE.call(this, x, y, rx, ry, color, ...rest);
                    };
                    R.sceneChangedAt = -1e9;
                    R.render(VIEW, null, performance.now() + 10000);
                    R.sceneChangedAt = -1e9;
                    R.render(VIEW, null, performance.now() + 10000);
                    R.ellipse = ELLIPSE;
                    const HEAD = R.project(0, sample.y, HEIGHT);
                    return {
                        box: BOX,
                        head: HEAD,
                        gapPixels: HEAD.y - BOX.bottom,
                        width: R.canvas.width,
                        height: R.canvas.height,
                        body: { height: HEIGHT, radius: RADIUS },
                        scale: R.scale,
                        version: BUDMORI.version,
                    };
                }, CASE);
                RESULTS.push({ mobile: MOBILE, variant: VARIANT, case: CASE.name, ...METRICS });
                await PAGE.screenshot({
                    path: path.join(OUTPUT, `${MOBILE ? 'mobile' : 'desktop'}-${VARIANT}-${CASE.name}.png`),
                });
                if (VARIANT === 'after') {
                    assert(METRICS.gapPixels > 4, `${CASE.name}: cloud/head overlap ${JSON.stringify(METRICS)}`);
                    assert(METRICS.box.top >= 0, `${CASE.name}: cloud clipped at top ${JSON.stringify(METRICS)}`);
                    assert(
                        METRICS.box.left >= 0 && METRICS.box.right <= METRICS.width,
                        `${CASE.name}: cloud clipped horizontally ${JSON.stringify(METRICS)}`,
                    );
                }
            }
            await CONTEXT.close();
        }
    }
    assert.deepEqual(ERRORS, []);
} finally {
    fs.writeFileSync(path.join(OUTPUT, 'results.json'), JSON.stringify({ results: RESULTS, errors: ERRORS }, null, 2));
    console.log(JSON.stringify({ results: RESULTS, errors: ERRORS }, null, 2));
    await BROWSER.close();
    await new Promise((resolve) => SERVER.close(resolve));
}
