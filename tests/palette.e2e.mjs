// Authored SVG palette -> codex -> live farm -> tower boss; local pinned CDN bytes, no product test hooks.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = fileURLToPath(new URL('../', import.meta.url)),
    OUTPUT = path.join(ROOT, 'tests/output/palette'),
    ERRORS = [],
    REPORT = {
        status: 'running',
        scope: 'Chromium SwiftShader functional pixels and CPU submission observations; not hardware/mobile FPS',
        views: [],
    };
fs.mkdirSync(OUTPUT, { recursive: true });
const SERVER = http.createServer((request, response) => {
    const FILE = path.resolve(ROOT, '.' + decodeURIComponent(request.url.split('?')[0]));
    if (!FILE.startsWith(ROOT) || !fs.existsSync(FILE) || fs.statSync(FILE).isDirectory()) {
        response.writeHead(404).end();
        return;
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
const BROWSER = await chromium.launch({
    executablePath: process.env.CHROME_PATH,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const DEADLINE = setTimeout(() => BROWSER.close(), 180000);
DEADLINE.unref();
try {
    for (const MOBILE of [false, true]) {
        const CONTEXT = await BROWSER.newContext({
                viewport: MOBILE ? { width: 390, height: 844 } : { width: 1100, height: 850 },
                hasTouch: MOBILE,
                isMobile: MOBILE,
                deviceScaleFactor: 1,
            }),
            PAGE = await CONTEXT.newPage();
        PAGE.on('pageerror', (error) => ERRORS.push(String(error)));
        await CONTEXT.route(/cdn\.jsdelivr\.net\/gh\/byh-playground\/bloom-gamekit@[0-9a-f]+\/(.*)/, (route) =>
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
        await PAGE.evaluate(() => {
            const W = BUDMORI.sim;
            BUDMORI.runtime.paused = true;
            W.resetUnits();
            W.setWorkBasisPoints(0);
            for (let species = 0; species < 10; species++) {
                for (let element = 1; element <= 5; element++) {
                    const U = W.spawn(
                        species,
                        1,
                        ((species % 5) - 2) * 1.3,
                        (Math.floor(species / 5) * 5 + element - 5) * 0.7,
                        { lineage: { temperament: species % 5, genes: [element, element] } },
                    );
                    Object.assign(U, { growth: 3, growthElapsed: U.growthDuration, z: 0, vz: 0, dropLanded: true });
                }
            }
            W.codex.colors = Array.from({ length: 50 }, (_, index) => index);
            W.markProgressChanged();
            const R = BUDMORI.renderer,
                DRAW = R.meshes.drawMesh.bind(R.meshes);
            globalThis.__paintAudit = { colours: new Set(), tagged: 0, plain: 0, disable: false };
            R.meshes.drawMesh = (mesh, options) => {
                const A = globalThis.__paintAudit;
                if (options.paintRegions) {
                    A.tagged++;
                    A.colours.add(JSON.stringify(options.paintRegions));
                } else {
                    A.plain++;
                }
                return DRAW(mesh, A.disable ? { ...options, paintRegions: null } : options);
            };
            BUDMORI.runtime.paused = false;
        });
        await PAGE.waitForFunction(
            () => globalThis.__paintAudit.colours.size === 5 && globalThis.__paintAudit.tagged >= 50,
        );
        const ENV = await PAGE.evaluate(() => {
            const GL = BUDMORI.renderer.device.gl,
                DEBUG = GL.getExtension('WEBGL_debug_renderer_info');
            return {
                renderer: DEBUG ? GL.getParameter(DEBUG.UNMASKED_RENDERER_WEBGL) : GL.getParameter(GL.RENDERER),
                pose: BUDMORI.poseDiagnostics,
                units: BUDMORI.sim.units.length,
            };
        });
        await PAGE.screenshot({ path: path.join(OUTPUT, MOBILE ? 'farm-mobile.png' : 'farm-desktop.png') });
        await PAGE.locator('#codexOpen').click();
        await PAGE.locator('#codexTabs [data-tab="colors"]').click();
        assert.equal(await PAGE.locator('#codexBody .codex-icon:not(.is-unknown)').count(), 50);
        assert.equal(await PAGE.locator('#codexBody .face-overlay').count(), 0, 'No duplicate face overlay');
        assert.equal(await PAGE.locator('#codexBody .codex-icon[src^="data:image/svg+xml"]').count(), 50);
        await PAGE.screenshot({ path: path.join(OUTPUT, MOBILE ? 'codex-mobile.png' : 'codex-desktop.png') });
        await PAGE.locator('#codexClose').click();
        const COST = await PAGE.evaluate(() => {
            BUDMORI.runtime.paused = true;
            const R = BUDMORI.renderer,
                A = globalThis.__paintAudit,
                W = R.cameraWorld;
            function sample(disable) {
                A.disable = disable;
                const SAMPLES = [];
                for (let frame = 0; frame < 12; frame++) {
                    const START = performance.now();
                    R.render(W, null, R.displayTimeMs);
                    SAMPLES.push({ cpuMs: performance.now() - START, draws: R.device.stats.drawCalls });
                }
                return {
                    cpuMs: SAMPLES.slice(2).reduce((sum, s) => sum + s.cpuMs, 0) / 10,
                    draws: SAMPLES.at(-1).draws,
                };
            }
            const ORIGINAL = sample(true),
                PALETTE = sample(false);
            return {
                units: W.units.length,
                original: ORIGINAL,
                palette: PALETTE,
                drawDelta: PALETTE.draws - ORIGINAL.draws,
            };
        });
        await PAGE.evaluate(() => {
            const W = BUDMORI.sim;
            if (!W.startTower(1) || !W.finishMarch()) {
                throw new Error('Real tower encounter did not start');
            }
            W.farmBossEvent.phase = 'fighting';
            Object.assign(W.boss, { z: 0, dropLanded: true, hp: 1e9, maxHp: 1e9 });
            BUDMORI.runtime.paused = false;
        });
        await PAGE.evaluate(async () => {
            const { towerElement: TOWER_ELEMENT } = await import('../src/tower/tower-theme.js');
            const { elementPaintRegions: ELEMENT_PAINT } = await import('../src/units/species-paint.js');
            const W = BUDMORI.sim,
                R = BUDMORI.renderer,
                DRAW = R.meshes.drawMesh.bind(R.meshes);
            globalThis.__bossPaint = null;
            globalThis.__expectedBossPaint = ELEMENT_PAINT(TOWER_ELEMENT(W.tower.floor));
            R.meshes.drawMesh = (mesh, options) => {
                if (mesh === R.bossPlayerAsset?.asset.mesh) {
                    globalThis.__bossPaint = options.paintRegions;
                }
                return DRAW(mesh, options);
            };
        });
        await PAGE.waitForFunction(
            () =>
                globalThis.__bossPaint &&
                JSON.stringify(globalThis.__bossPaint) === JSON.stringify(globalThis.__expectedBossPaint),
        );
        const BOSS = await PAGE.evaluate(() => ({
            floor: BUDMORI.sim.tower.floor,
            palette: globalThis.__bossPaint,
            source: BUDMORI.renderer.bossPlayerAsset.compiled.sourcePath,
        }));
        await PAGE.screenshot({ path: path.join(OUTPUT, MOBILE ? 'tower-mobile.png' : 'tower-desktop.png') });
        REPORT.views.push({ mobileTouchEmulation: MOBILE, environment: ENV, cost: COST, boss: BOSS });
        await CONTEXT.close();
    }
    assert.deepEqual(ERRORS, []);
    REPORT.status = 'PASS';
    console.log(JSON.stringify(REPORT));
} finally {
    clearTimeout(DEADLINE);
    REPORT.errors = ERRORS;
    fs.writeFileSync(path.join(OUTPUT, 'report.json'), JSON.stringify(REPORT, null, 2));
    await BROWSER.close();
    SERVER.close();
}
