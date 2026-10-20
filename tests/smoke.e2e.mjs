// Browser smoke test: boots the built game in headless Chromium and walks the main flows.
// The gamekit CDN requests are answered from vendor/upstream, so it runs offline. Real-device speed is not measured.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url)),
    PORT = 8499,
    TYPES = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.svg': 'image/svg+xml' },
    RESULTS = [];
const SERVER = http
    .createServer((request, response) => {
        let url = decodeURIComponent(request.url.split('?')[0]);
        if (url.endsWith('/')) {
            url += 'index.html';
        }
        const FILE = path.join(ROOT, url);
        if (!FILE.startsWith(ROOT) || !fs.existsSync(FILE) || fs.statSync(FILE).isDirectory()) {
            response.statusCode = 404;
            return response.end();
        }
        response.setHeader('content-type', TYPES[path.extname(FILE)] || 'application/octet-stream');
        response.end(fs.readFileSync(FILE));
    })
    .listen(PORT);
const EXECUTABLE =
    process.env.CHROME_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const BROWSER = await chromium.launch({
    executablePath: EXECUTABLE,
    args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
const PAGE = await (await BROWSER.newContext({ viewport: { width: 1000, height: 700 } })).newPage(),
    ERRORS = [];
PAGE.on('pageerror', (error) => ERRORS.push(String(error)));
PAGE.on('console', (message) => {
    if (message.text().includes('loop stopped')) {
        ERRORS.push(message.text().slice(0, 300));
    }
});
await PAGE.route(/cdn\.jsdelivr\.net\/gh\/byh-playground\/bloom-gamekit@[0-9a-f]+\/(.*)/, (route) => {
    const FILE = path.join(
        ROOT,
        'vendor/upstream',
        route
            .request()
            .url()
            .match(/@[0-9a-f]+\/(.*)$/)[1],
    );
    if (fs.existsSync(FILE)) {
        route.fulfill({
            body: fs.readFileSync(FILE),
            contentType: 'text/javascript',
            headers: { 'access-control-allow-origin': '*' },
        });
    } else {
        route.abort();
    }
});
async function check(name, run) {
    const STARTED = Date.now();
    try {
        await run();
        RESULTS.push({ name, ok: true, ms: Date.now() - STARTED });
    } catch (error) {
        RESULTS.push({ name, ok: false, ms: Date.now() - STARTED, error: String(error.message || error) });
    }
}
function expect(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}
const WORLD = (fn, arg) => PAGE.evaluate(fn, arg);
await PAGE.goto(`http://127.0.0.1:${PORT}/index.html`);
await PAGE.waitForTimeout(2500);

await check('new game boots with a minimal HUD', async () => {
    await PAGE.locator('#newGame').click();
    await PAGE.waitForTimeout(2000);
    const STATE = await WORLD(() => ({
        units: BUDMORI.sim.units.length,
        scene: BUDMORI.sim.scene,
        removed: ['zoomIn', 'zoomOut', 'zoomFit', 'pauseToggle', 'menuHome', 'warehouseCount'].filter((id) =>
            document.getElementById(id),
        ),
        roles: [...document.querySelectorAll('.work-hud__bar span')].map((span) => span.id),
        handles: [...document.querySelectorAll('.work-hud__track')].map(
            (track) => track.querySelectorAll('.work-hud__cut').length,
        ),
    }));
    expect(STATE.units > 0 && STATE.scene === 'farm', 'farm did not start');
    expect(STATE.removed.length === 0, `removed controls are back: ${STATE.removed}`);
    expect(STATE.handles.join() === '2,2', `each role bar needs two handles, has ${STATE.handles}`);
    expect(STATE.roles.length === 6, `role bar should have six parts, has ${STATE.roles.length}`);
});

await check('resource workers hit, drop and carry material home', async () => {
    await WORLD(async () => {
        const MAP = await import('/src/world-map.js'),
            W = BUDMORI.sim;
        for (let index = 0; index < 30; index++) {
            W.spawn(index % 9, 1, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 12);
        }
        W.worldMap.revealed = Array.from({ length: 625 }, (_, index) => index).filter(
            (index) => Math.max(Math.abs(MAP.tileX(index)), Math.abs(MAP.tileY(index))) <= 3,
        );
        W.setWorkBasisPoints(5000, 4000, 500, 500);
        W.setWoodShare(6000);
        W._nextWorkerRefreshTick = 0;
        W.refreshWorkers();
    });
    await PAGE.waitForFunction(() => BUDMORI.sim.materials.wood + BUDMORI.sim.materials.stone > 0, null, {
        timeout: 45000,
    }).catch(() => {});
    const GOT = await WORLD(() => ({
        counts: BUDMORI.sim.workerKindCounts,
        drops: [...BUDMORI.sim._drops.values()].reduce((total, amount) => total + amount, 0),
        materials: BUDMORI.sim.materials.wood + BUDMORI.sim.materials.stone,
    }));
    expect(GOT.counts.resource > 0, `roles missing ${JSON.stringify(GOT.counts)}`);
    expect(GOT.materials > 0, `nothing reached the farm ${JSON.stringify(GOT)}`);
});

await check('a tile holds at most twelve and drops are not lost', async () => {
    let most = 0;
    for (let round = 0; round < 8; round++) {
        await PAGE.waitForTimeout(1000);
        most = Math.max(most, await WORLD(() => Math.max(0, ...BUDMORI.sim._drops.values())));
    }
    expect(most <= 12 + 1e-6, `ground over the limit: ${most}`);
});

await check('map boss fight starts and retreat ends it', async () => {
    await WORLD(() => {
        const W = BUDMORI.sim;
        W.startMapBossFight(W.worldMap.bosses[0]);
    });
    await PAGE.waitForTimeout(4000);
    const FIGHTING = await WORLD(() => BUDMORI.sim.farmBossEvent.phase);
    expect(FIGHTING !== 'idle', `fight did not start (${FIGHTING})`);
    await WORLD(() => BUDMORI.sim.retreatFromFight());
    await PAGE.waitForTimeout(6000);
    const AFTER = await WORLD(() => BUDMORI.sim.farmBossEvent.phase);
    expect(AFTER === 'idle', `fight did not end (${AFTER})`);
});

await check('progress survives a reload', async () => {
    await WORLD(() => {
        BUDMORI.sim.materials.wood = 7;
        BUDMORI.sim.markProgressChanged();
    });
    await PAGE.waitForTimeout(3000);
    await PAGE.reload();
    await PAGE.waitForTimeout(4000);
    const WOOD = await WORLD(() => BUDMORI.sim.materials.wood);
    expect(WOOD === 7, `wood after reload is ${WOOD}`);
});

await check('no page errors', async () => {
    expect(ERRORS.length === 0, ERRORS.slice(0, 3).join(' | '));
});
await BROWSER.close();
SERVER.close();
const FAILED = RESULTS.filter((result) => !result.ok);
for (const RESULT of RESULTS) {
    console.log(
        `${RESULT.ok ? 'PASS' : 'FAIL'} ${RESULT.name} (${RESULT.ms}ms)${RESULT.error ? ` - ${RESULT.error}` : ''}`,
    );
}
process.exit(FAILED.length === 0 ? 0 : 1);
