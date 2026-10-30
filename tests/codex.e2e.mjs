// User flow: find uses for a discovered ingredient, select a recipe/tier, then reopen after reload.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = fileURLToPath(new URL('../', import.meta.url)),
    OUTPUT = path.join(ROOT, 'tests/output/codex'),
    ERRORS = [];
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
const BROWSER = await chromium.launch({ executablePath: process.env.CHROME_PATH });
const DEADLINE = setTimeout(() => BROWSER.close(), 180000);
DEADLINE.unref();
try {
    for (const [NAME, VIEWPORT] of Object.entries({
        desktop: { width: 1100, height: 850 },
        mobile: { width: 390, height: 844 },
        landscape: { width: 844, height: 390 },
    })) {
        const CONTEXT = await BROWSER.newContext({
                viewport: VIEWPORT,
                isMobile: NAME !== 'desktop',
                hasTouch: NAME !== 'desktop',
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
            BUDMORI.runtime.paused = true;
            const W = BUDMORI.sim;
            W.resetUnits();
            W.codex = { forms: [], colors: [], recipes: [] };
            W.markProgressChanged();
        });
        await PAGE.locator('#codexOpen').click();
        assert.match(await PAGE.locator('#codexBody').innerText(), /병종을 발견하면/);
        assert.match(await PAGE.locator('#codexBody').innerText(), /번식을 위해 최소 2마리를 남겨요\(전체 등급 합산\)/);
        assert.match(await PAGE.locator('#codexBody').innerText(), /같은 등급의 성체를 각 병종에서 1마리씩 조합/);
        assert.doesNotMatch(await PAGE.locator('#codexBody').innerText(), /각각 3마리/);
        assert.equal(await PAGE.locator('.codex-uses').count(), 0);
        await PAGE.locator('#codexClose').click();
        await PAGE.evaluate(() => {
            const W = BUDMORI.sim;
            W.codex.forms = [0];
            W.markProgressChanged();
        });
        await PAGE.locator('#codexOpen').click();
        const PEA = PAGE.locator('[data-ingredient="0"]'),
            FIRST = PEA.locator('[data-recipe="0"]');
        assert.equal(await PAGE.locator('.codex-uses').count(), 1);
        assert.equal(await PEA.locator('.codex-recipe').count(), 4);
        assert.match(await PEA.locator('h3').innerText(), /현재 보유 0마리/);
        assert.equal(await FIRST.locator('.codex-icon:not(.is-unknown)').count(), 1);
        assert.equal(await FIRST.locator('.codex-icon.is-unknown').count(), 2);
        assert.match(await FIRST.innerText(), /조합 미확인/);
        await PAGE.screenshot({ path: path.join(OUTPUT, `${NAME}-partial.png`) });
        await FIRST.click();
        await PAGE.locator('#codexClose').click();
        await PAGE.evaluate(() => {
            BUDMORI.runtime.paused = false;
        });
        await PAGE.waitForFunction(
            () => document.getElementById('combine').dataset.availability === 'no-eligible-materials',
        );
        assert.match(
            await PAGE.locator('#combine').getAttribute('aria-label'),
            /번식을 위해 각 병종을 최소 2마리\(전체 등급 합산\) 남기고/,
        );
        assert.match(await PAGE.locator('#combine').getAttribute('aria-label'), /같은 등급의 성체를 각 1마리씩/);
        assert.doesNotMatch(await PAGE.locator('#combine').getAttribute('aria-label'), /각 병종이 3마리씩/);
        await PAGE.evaluate(() => {
            BUDMORI.runtime.paused = true;
            BUDMORI.sim.combine = { recipe: -1, tier: 1 };
            BUDMORI.sim.codex.forms = [0, 5];
        });
        await PAGE.locator('#codexOpen').click();
        assert.equal(await FIRST.locator('.codex-icon:not(.is-unknown)').count(), 2);
        assert.equal(await FIRST.locator('.codex-icon.is-unknown').count(), 1);
        await PAGE.locator('#codexClose').click();
        await PAGE.evaluate(() => {
            const W = BUDMORI.sim;
            for (const SPECIES of [0, 6]) {
                for (const TIER of [1, 2]) {
                    // The selected T1 only needs one adult; two T2 residents preserve the species for breeding.
                    for (let count = 0; count < (TIER === 1 ? 1 : 2); count++) {
                        const UNIT = W.spawn(SPECIES, TIER, count, SPECIES - 3);
                        Object.assign(UNIT, {
                            growth: 3,
                            growthElapsed: UNIT.growthDuration,
                            dropLanded: true,
                            z: 0,
                            vz: 0,
                        });
                    }
                }
            }
            W.spawn(0, 1, 0, 0, { lineage: { temperament: 0, genes: [0, 0], seedling: { fed: 0, cooldown: 0 } } });
            W.codex.forms = [0, 5, 30, 40];
            W.codex.recipes = [0];
            W.markProgressChanged();
        });
        await PAGE.locator('#codexOpen').click();
        assert.match(await PEA.locator('h3').innerText(), /현재 보유 3마리/);
        assert.equal(await FIRST.locator('.codex-icon:not(.is-unknown)').count(), 3);
        assert.match(await FIRST.innerText(), /조합 발견/);
        assert.match(await PAGE.locator('[data-ingredient="1"]').innerText(), /재료로 쓰는 조합은 없어요/);
        assert.match(await PAGE.locator('[data-ingredient="8"]').innerText(), /현재 보유 0마리/);
        await PAGE.evaluate(() => {
            BUDMORI.runtime.paused = false;
        });
        await FIRST.click();
        await PAGE.waitForSelector('[data-ingredient="0"] [data-recipe="0"][aria-pressed="true"]');
        await PAGE.locator('#codexClose').click();
        await PAGE.waitForFunction(() => document.getElementById('combine').dataset.availability === 'ready');
        await PAGE.locator('#codexOpen').click();
        await PEA.locator('[data-tier="2"]').click();
        await PAGE.waitForSelector('[data-ingredient="0"] [data-tier="2"][aria-pressed="true"]');
        assert.equal(await PAGE.locator('[data-recipe="0"][aria-pressed="true"]').count(), 2);
        await PAGE.evaluate(() => {
            BUDMORI.runtime.paused = true;
        });
        const FITS = await PAGE.locator('#codexBody').evaluate(
            (body) =>
                body.scrollWidth <= body.clientWidth &&
                [...body.querySelectorAll('.codex-recipe')].every((row) => row.scrollWidth <= row.clientWidth),
        );
        assert.ok(FITS, `${NAME}: recipe rows fit without horizontal overflow`);
        await PAGE.screenshot({ path: path.join(OUTPUT, `${NAME}-discovered.png`) });
        await PAGE.locator('#codexClose').click();
        await PAGE.evaluate(() => BUDMORI.storage.save(BUDMORI.sim));
        await PAGE.reload();
        await PAGE.waitForFunction(() => globalThis.BUDMORI && BUDMORI.sim.combine.tier === 2);
        await PAGE.locator('#codexOpen').click();
        assert.match(await PAGE.locator('[data-ingredient="8"]').innerText(), /현재 보유 0마리/);
        assert.equal(await PAGE.locator('[data-recipe="0"][aria-pressed="true"]').count(), 2);
        assert.deepEqual(ERRORS, []);
        console.log(`PASS ${NAME}: per-ingredient discovery, ownership, recipe/tier selection, reload, layout`);
        await CONTEXT.close();
    }
} finally {
    await BROWSER.close();
    SERVER.close();
}
