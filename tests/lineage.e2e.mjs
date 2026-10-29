// Fixed user flow: a seed grows by eating, a recipe is picked in the codex and combined, then everything survives a
// reload, on desktop and touch mobile. Uses the pinned vendor GameKit modules and Chromium SwiftShader.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = fileURLToPath(new URL('../', import.meta.url)),
    OUTPUT = path.join(ROOT, 'tests/output/lineage'),
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
const ROUTE = (route) => {
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
};
async function seed(page) {
    await page.evaluate(() => {
        const W = BUDMORI.sim;
        for (const UNIT of [...W.units]) {
            W.removeUnit(UNIT);
        }
        for (const SPECIES of [0, 6]) {
            for (let index = 0; index < 3; index++) {
                const UNIT = W.spawn(SPECIES, 1, index - 1, SPECIES - 3);
                UNIT.growthElapsed = UNIT.growthDuration;
                UNIT.growth = 3;
            }
        }
        W.spawn(7, 1, 0, 3, { lineage: { temperament: 2, genes: [3, 3], seedling: { fed: 0, cooldown: 0 } } });
        W.spawnFood(0, 3, 12);
        W.markProgressChanged();
    });
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
        await CONTEXT.route(/cdn\.jsdelivr\.net\/gh\/byh-playground\/bloom-gamekit@[0-9a-f]+\/(.*)/, ROUTE);
        const PRESS = (selector) => (MOBILE ? PAGE.locator(selector).tap() : PAGE.locator(selector).click());
        await PAGE.goto(GAME_URL);
        await PAGE.waitForFunction(() => globalThis.BUDMORI);
        await PAGE.locator('#newGame').click();
        await seed(PAGE);
        await PAGE.evaluate(() => {
            const W = BUDMORI.sim;
            W.setWorkBasisPoints(10000);
            const SEED = W.units.find((unit) => unit.seedling);
            // Offline settlement must not turn an unfed seed into an adult or a worker.
            const BEFORE = SEED.growthElapsed;
            W.settleOffline(3600);
            if (SEED.growthElapsed !== BEFORE || W.isWorker(SEED) || W._workAssign.has(SEED.id)) {
                throw new Error('An unfed seed grew or received offline labor');
            }
            W.setWorkBasisPoints(0);
        });
        await PAGE.waitForFunction(() => {
            const SEED = BUDMORI.sim.units.find((unit) => unit.seedling),
                R = BUDMORI.renderer,
                PLAYER = SEED && R.vectorPlayers.get(SEED.id);
            return PLAYER && R.vectorPlayerAssets.get(PLAYER).compiled.sourcePath === 'assets/troops/sprout.svg';
        });
        await PAGE.screenshot({ path: path.join(OUTPUT, MOBILE ? 'sprout-mobile.png' : 'sprout-desktop.png') });
        // With no recipe chosen the combine button opens the codex.
        await PRESS('#combine');
        assert.equal(await PAGE.locator('#codexDialog').isVisible(), true);
        await PRESS('[data-ingredient="0"] .codex-recipe[data-recipe="0"]');
        await PAGE.waitForSelector('.codex-recipe[data-recipe="0"][aria-pressed="true"]');
        await PAGE.screenshot({ path: path.join(OUTPUT, MOBILE ? 'codex-mobile.png' : 'codex-desktop.png') });
        await PRESS('#codexClose');
        await PAGE.waitForFunction(() => document.getElementById('combine').dataset.availability === 'ready');
        await PRESS('#combine');
        await PAGE.waitForFunction(() => BUDMORI.sim.units.some((unit) => unit.species === 1), null, {
            timeout: 20000,
        });
        const MADE = await PAGE.evaluate(() => ({
            merges: BUDMORI.sim.metrics.merges,
            corn: BUDMORI.sim.units.filter((unit) => unit.species === 1).length,
            recipes: BUDMORI.sim.codex.recipes,
        }));
        assert.deepEqual(MADE, { merges: 1, corn: 1, recipes: [0] }, 'one pea and one rice became one corn');
        await PAGE.evaluate(() => BUDMORI.sim.setWorkBasisPoints(10000));
        // The seed eats three meals and shows what it is.
        await PAGE.waitForFunction(
            () => {
                const W = BUDMORI.sim,
                    SEED = W.units.find((unit) => unit.seedling);
                if (SEED && (W.isWorker(SEED) || W._workAssign.has(SEED.id) || W.workOrder(SEED))) {
                    throw new Error('A growing seed received a work assignment');
                }
                return W.units.some((unit) => unit.species === 7 && !unit.seedling);
            },
            null,
            { timeout: 60000 },
        );
        await PAGE.waitForFunction(() => {
            const UNIT = BUDMORI.sim.units.find((unit) => unit.species === 7),
                R = BUDMORI.renderer,
                PLAYER = UNIT && R.vectorPlayers.get(UNIT.id);
            return PLAYER && R.vectorPlayerAssets.get(PLAYER).compiled.sourcePath === 'assets/troops/wheat.svg';
        });
        await PAGE.screenshot({ path: path.join(OUTPUT, MOBILE ? 'grown-mobile.png' : 'grown-desktop.png') });
        const WHEAT = await PAGE.evaluate(() => {
            const UNIT = BUDMORI.sim.units.find((unit) => unit.species === 7);
            return { temperament: UNIT.temperament, genes: UNIT.genes };
        });
        assert.deepEqual(WHEAT, { temperament: 2, genes: [3, 3] }, 'the seed kept the lineage it was dropped with');
        await PAGE.evaluate(() => {
            const W = BUDMORI.sim,
                WHEAT = W.units.find((unit) => unit.species === 7);
            W.setWorkBasisPoints(10000);
            if (!W.isWorker(WHEAT)) {
                throw new Error('A grown seed did not become eligible for work');
            }
            W.setWorkBasisPoints(0);
        });
        // A temperament tilts the body and carries one passive into every fight.
        const TEMPERED = await PAGE.evaluate(() => {
            const W = BUDMORI.sim,
                STURDY = W.units.find((unit) => unit.species === 0),
                ANGRY = W.units.find((unit) => unit.species === 6);
            STURDY.temperament = 0;
            const PERSISTENT_HP = STURDY.maxHp;
            STURDY.temperament = 2;
            const ANGRY_HP = STURDY.maxHp;
            STURDY.temperament = 0;
            ANGRY.temperament = 2;
            return {
                hpOrder: PERSISTENT_HP / ANGRY_HP > 1.2,
                lastStand: W.passiveState(STURDY).totals['last-stand'] > 0,
                vengeance: !W.passiveState(STURDY).totals.vengeance && W.passiveState(ANGRY).totals.vengeance > 0,
            };
        });
        assert.deepEqual(TEMPERED, { hpOrder: true, lastStand: true, vengeance: true });
        await PAGE.evaluate(() => {
            BUDMORI.storage.save(BUDMORI.sim);
        });
        await PAGE.reload();
        await PAGE.waitForFunction(() => globalThis.BUDMORI && BUDMORI.sim.codex.recipes.length === 1);
        const RESTORED = await PAGE.evaluate(() => ({
            combine: BUDMORI.sim.combine,
            colors: BUDMORI.sim.codex.colors,
            forms: BUDMORI.sim.codex.forms.length,
        }));
        assert.deepEqual(RESTORED.combine, { recipe: 0, tier: 1 });
        assert.deepEqual(RESTORED.colors, [7 * 5 + 2], 'the grown wheat shows its colour in the codex');
        await PRESS('#codexOpen');
        await PRESS('#codexTabs [data-tab="colors"]');
        assert.equal(await PAGE.locator('#codexBody .codex-icon:not(.is-unknown)').count(), 1);
        await PRESS('#codexClose');
        await PAGE.evaluate(async () => {
            const { settleBossKill: SETTLE_BOSS_KILL } = await import('./src/boss/boss-rewards.js');
            SETTLE_BOSS_KILL(BUDMORI.sim, {
                encounterId: 999,
                source: 'farm',
                stage: 1,
                species: 7,
                tier: 1,
                x: 0,
                y: 0,
                firstClear: true,
                rollBudget: 1,
            });
        });
        await PAGE.waitForSelector('#bossRewardPortrait:not([hidden])');
        assert.equal(await PAGE.locator('#bossRewardPortrait').getAttribute('src'), './assets/troops/sprout.svg');
        await PAGE.screenshot({ path: path.join(OUTPUT, MOBILE ? 'reward-mobile.png' : 'reward-desktop.png') });
        assert.deepEqual(ERRORS, []);
        console.log(
            `PASS ${MOBILE ? 'mobile touch' : 'desktop'}: codex recipe pick, combine, seed growth with lineage, reload keeps combine and codex`,
        );
        await CONTEXT.close();
    }
} finally {
    await BROWSER.close();
    SERVER.close();
}
