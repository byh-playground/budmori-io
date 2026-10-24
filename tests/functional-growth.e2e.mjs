// Focused source-only browser integration. Not a six-tier motion/performance matrix.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { sourceGraph } from '../scripts/source-graph.mjs';
import { PRODUCT_VERSION } from '../src/version.js';

const ROOT = path.resolve(fileURLToPath(new URL('../', import.meta.url))),
    VIEWPORT = process.argv[2] || 'desktop',
    TOUCH = VIEWPORT === 'landscape',
    OUTPUT = path.join(ROOT, 'tests/output/functional-growth', VIEWPORT),
    GRAPH = sourceGraph(ROOT),
    MANIFEST = JSON.parse(
        fs
            .readFileSync(path.join(ROOT, 'index.html'), 'utf8')
            .match(/<script id="bloom-runtime-manifest" type="application\/json">(.*?)<\/script>/s)[1],
    ),
    HASH = (bytes) => createHash('sha256').update(bytes).digest('hex'),
    SDK = new Map(
        MANIFEST.modules.map((entry) => {
            const BYTES = fs.readFileSync(path.join(ROOT, 'vendor/upstream', `${entry.name}.js`));
            assert.equal(HASH(BYTES), entry.sha256);
            assert.ok(entry.url.includes(`@${MANIFEST.distCommit}/`));
            return [entry.url, BYTES];
        }),
    ),
    TYPES = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.svg': 'image/svg+xml',
    },
    ERRORS = [],
    REQUESTS = [],
    REPORT = {
        status: 'running',
        viewport: VIEWPORT,
        productVersion: PRODUCT_VERSION,
        sourceGraph: GRAPH.sha256,
        sdk: GRAPH.sdk,
        checks: [],
        combat: [],
        ui: [],
        fixtures:
            'Earned mastery supplied; all purchased ranks use trusted UI input. Combat setup chooses one live unit/position and stationary high-HP boss. Peanut lethal damage and walnut receiveRawDamage are explicitly controlled fixtures, not boss-AI coverage. No poses, hit flags, clocks, or attack results are fabricated.',
    },
    CASES = [
        [1, 'corn-kernel-chain', 'corn'],
        [4, 'peanut-death-split', 'peanut'],
        [5, 'walnut-raw-guard', 'walnut'],
    ],
    SERVER = http.createServer((request, response) => {
        const URL_PATH = decodeURIComponent(request.url.split('?')[0]);
        if (URL_PATH === '/favicon.ico') {
            response.writeHead(204).end();
            return;
        }
        const FILE = path.resolve(ROOT, '.' + URL_PATH);
        if (!FILE.startsWith(ROOT + path.sep) || !fs.existsSync(FILE) || !fs.statSync(FILE).isFile()) {
            response.writeHead(404).end();
            return;
        }
        response.setHeader('content-type', TYPES[path.extname(FILE)] || 'application/octet-stream');
        response.end(fs.readFileSync(FILE));
    });
assert.ok(['desktop', 'landscape'].includes(VIEWPORT));
assert.equal(MANIFEST.productVersion, PRODUCT_VERSION);
fs.mkdirSync(OUTPUT, { recursive: true });
fs.writeFileSync(path.join(OUTPUT, 'source-graph.json'), JSON.stringify(GRAPH, null, 2));
let browser, page;
const ACTIVATE = (locator) => (TOUCH ? locator.tap() : locator.click());
const NODE = (id) => page.locator(`[data-growth-node="${id}"] button`);
async function openTree(species) {
    if (!(await page.locator('#gameMenuOverlay').isVisible())) {
        await ACTIVATE(page.locator('#upgradeMenu'));
    }
    await ACTIVATE(page.locator(`[data-ability-species="${species}"]`));
    await page.locator('[data-growth-tree]').waitFor();
}
async function purchase(ability, id) {
    const BEFORE = await page.evaluate(
        ({ ability, id }) => BUDMORI.sim.playerProgression.abilities[ability].nodeRanks[id] || 0,
        { ability, id },
    );
    await page.waitForFunction(
        ({ ability, id, rank }) =>
            (BUDMORI.sim.playerProgression.abilities[ability].nodeRanks[id] || 0) === rank &&
            document.querySelector(`[data-growth-node="${id}"] .growth-rank`)?.textContent?.split('/')[0] ===
                String(rank) &&
            document.querySelector(`[data-growth-node="${id}"] button`)?.getAttribute('aria-disabled') === 'false',
        { ability, id, rank: BEFORE },
    );
    await ACTIVATE(NODE(id));
    // Real onProgressChanged command completion and DOM agreement, never a timed click retry.
    await page.waitForFunction(
        ({ ability, id, rank }) =>
            BUDMORI.sim.playerProgression.abilities[ability].nodeRanks[id] === rank &&
            document.querySelector(`[data-growth-node="${id}"] .growth-rank`)?.textContent?.split('/')[0] ===
                String(rank),
        { ability, id, rank: BEFORE + 1 },
    );
}
async function reset(ability) {
    await ACTIVATE(page.locator('[data-ability-action="reset"]'));
    await page.waitForFunction(
        (ability) =>
            Object.values(BUDMORI.sim.playerProgression.abilities[ability].nodeRanks).every((rank) => rank === 0) &&
            [...document.querySelectorAll('[data-growth-node] .growth-rank')].every(
                (label) => label.textContent.split('/')[0] === '0',
            ),
        ability,
    );
}
async function reloadFarm() {
    await page.reload();
    await page.waitForFunction(() => globalThis.BUDMORI?.sim?.scene === 'farm');
}
async function combat(species, ability, name) {
    await page.evaluate(
        ({ species }) => {
            const W = BUDMORI.sim;
            W.resetUnits();
            W.setWorkBasisPoints(0);
            const U = W.spawn(species, 3, -7, 0);
            U.growth = 3;
            U.growthElapsed = U.growthDuration;
            U.dropLanded = true;
            if (!W.startTower(1)) {
                throw new Error('Controlled encounter did not start');
            }
            W.finishMarch();
            W._benched.clear();
            W._benchRevision++;
            W.farmBossEvent.phase = 'fighting';
            W.farmBossEvent.elapsed = 0;
            Object.assign(W.boss, { z: 0, hp: 1e9, maxHp: 1e9, stun: 1000 });
            Object.assign(U, { x: -(W.boss.radius + (species === 1 ? 4.1 : 1.45)), y: 0, z: 0, dropLanded: true });
            W._unitSpatialDirty = true;
            const P = (globalThis.__functional = {
                world: W,
                unit: U,
                id: null,
                record: null,
                hits: [],
                children: [],
                stored: null,
                injected: false,
                checkpoint: false,
                complete: false,
            });
            const HIT = W.damageCombatTarget;
            W.damageCombatTarget = function (source, action, target, point, options) {
                const RECORD =
                    species === 1
                        ? this.cornAttachments.actions.find((r) => r.id === action.id) ||
                          (P.id === action.id ? P.record : null)
                        : species === 4
                          ? source.ability.action?.peanutAttack
                          : source.ability.action?.walnutAttack;
                const ELIGIBLE =
                    RECORD && (species !== 4 || source.isBattleOnlySummon) && (species !== 5 || RECORD.storedRaw > 0);
                if (ELIGIBLE && P.id === null) {
                    P.id = RECORD.id;
                    P.record = structuredClone(RECORD);
                    P.action = action;
                }
                const RESULT = HIT.call(this, source, action, target, point, options);
                if (ELIGIBLE && (species === 4 || action.id === P.id)) {
                    const C = options.attackContext;
                    P.hits.push({
                        id: action.id,
                        owner: source.id,
                        kind: C.kind,
                        multiplier: C.damageMultiplier,
                        raw: C.rawDamageBonus || 0,
                        direct:
                            C.attackerStats.attackPower *
                            C.attackPowerMultiplier *
                            C.damageMultiplier *
                            C.sourceDamageScale,
                    });
                    if (species === 1 && !P.checkpoint) {
                        P.checkpoint = true;
                        BUDMORI.runtime.paused = true;
                    }
                    const DONE =
                        species === 1
                            ? P.hits.filter((hit) => hit.kind === 'corn-attachment-explosion').length ===
                              RECORD.terminalIndex + 1
                            : species === 4
                              ? P.children.length === 2 &&
                                P.children.every((child) => P.hits.filter((hit) => hit.owner === child.id).length === 2)
                              : P.hits.length === RECORD.shots.length;
                    if (DONE) {
                        P.complete = true;
                        BUDMORI.runtime.paused = true;
                    }
                }
                return RESULT;
            };
            const STEP = W.step;
            W.step = function (...args) {
                const RESULT = STEP.apply(this, args);
                if (species === 4 && !P.injected && U.ability.action?.peanutAttack) {
                    P.injected = true;
                    U.hp = 0;
                    this.handleUnitDeath(U);
                    P.children = this.units.filter((child) => child.isBattleOnlySummon);
                }
                if (species === 5 && !P.injected && U.walnutGuardUntilTick > this.simulationTick) {
                    P.injected = true;
                    U.ability.receiveRawDamage(this, 10000);
                    P.stored = U.walnutStoredRawDamage;
                }
                return RESULT;
            };
        },
        { species },
    );
    if (species === 1) {
        await page.waitForFunction(() => globalThis.__functional.checkpoint && BUDMORI.runtime.paused);
        const CHECKPOINT = await page.evaluate(() => ({ tick: BUDMORI.sim.simulationTick, hp: BUDMORI.sim.boss.hp }));
        await page.goBack();
        await page.locator('#startScreen').waitFor({ state: 'visible' });
        assert.deepEqual(
            await page.evaluate(() => ({ tick: BUDMORI.sim.simulationTick, hp: BUDMORI.sim.boss.hp })),
            CHECKPOINT,
        );
        await ACTIVATE(page.locator('#continueGame'));
    }
    await page.waitForFunction(() => globalThis.__functional.complete && BUDMORI.runtime.paused, null, {
        timeout: 30000,
    });
    const RESULT = await page.evaluate(() => {
        const P = globalThis.__functional;
        return {
            sameWorld: P.world === BUDMORI.sim,
            sameAction: P.action === P.unit.ability.action,
            record: P.record,
            hits: P.hits,
            stored: P.stored,
            remaining: P.unit.walnutStoredRawDamage,
            children: P.children.map((u) => ({
                tier: u.tier,
                power: u.peanutInheritedPowerRank,
                speed: u.peanutInheritedSpeedRank,
                healthMultiplier: u.growthMaxHpMultiplier,
                permanentMultiplier: u.permanentStatMultiplier,
                record: structuredClone(u.ability.action?.peanutAttack),
            })),
        };
    });
    assert.ok(RESULT.sameWorld);
    assert.ok(
        RESULT.hits.every(
            (hit) => Number.isFinite(hit.direct) && Number.isFinite(hit.raw) && Number.isFinite(hit.multiplier),
        ),
    );
    if (species === 1) {
        const R = RESULT.record;
        assert.equal(R.version, 2);
        assert.ok(Math.abs(R.directMultiplier / (1.6 * R.budgetInputs.gradeMultiplier) - 1.3) < 1e-9);
        assert.ok(Math.abs(R.attachmentMultiplier / (0.5 * R.budgetInputs.gradeMultiplier) - 1.3) < 1e-9);
        assert.ok(
            Math.abs(
                RESULT.hits.filter((h) => h.kind === 'lob').reduce((sum, h) => sum + h.multiplier, 0) -
                    R.directMultiplier,
            ) < 1e-9,
        );
        assert.equal(RESULT.hits.filter((h) => h.kind === 'corn-attachment-explosion').length, R.terminalIndex + 1);
        assert.ok(
            Math.abs(
                RESULT.hits
                    .filter((h) => h.kind === 'corn-attachment-explosion')
                    .reduce((sum, hit) => sum + hit.multiplier, 0) - R.attachmentMultiplier,
            ) < 1e-9,
        );
        REPORT.checks.push(
            'Corn UI b1=10 reaches actual direct and attachment records at 1.3x; same-world Home/Continue finite attachment budget',
        );
    } else if (species === 4) {
        assert.equal(RESULT.children.length, 2);
        for (const CHILD of RESULT.children) {
            assert.equal(CHILD.tier, 1);
            assert.equal(CHILD.power, 10);
            assert.equal(CHILD.speed, 10);
            assert.equal(CHILD.healthMultiplier, 1);
            assert.equal(CHILD.record.multiplier, 1.3);
            assert.equal(CHILD.record.speed, 1.2);
            assert.deepEqual(CHILD.record.ranks, { power: 10, range: 0, finish: 0 });
        }
        REPORT.checks.push(
            'Peanut controlled lethal fixture creates two real T1 children; actual child hits inherit purchased b1/b3 only',
        );
    } else {
        const R = RESULT.record,
            D =
                R.source.attackerStats.attackPower *
                R.source.attackPowerMultiplier *
                R.multiplier *
                R.source.sourceDamageScale;
        assert.equal(RESULT.stored, 10000);
        assert.equal(R.storedRaw, 10000);
        assert.equal(RESULT.remaining, 0);
        assert.ok(Math.abs(R.rawBudget - 3 * D) < 1e-9);
        assert.ok(Math.abs(RESULT.hits.reduce((sum, h) => sum + h.raw, 0) - R.rawBudget) < 1e-9);
        assert.ok(Math.abs(RESULT.hits.reduce((sum, h) => sum + h.direct, 0) - D) < 1e-9);
        REPORT.checks.push(
            'Walnut controlled pre-armor RAW enters active guard storage before consumption; actual hammer budget exactly cap3D',
        );
    }
    REPORT.combat.push({ species: name, ...RESULT });
    await page.screenshot({ path: path.join(OUTPUT, `${name}-combat.png`) });
    await openTree(species);
    const SNAPSHOT = await page.evaluate(() => JSON.stringify(BUDMORI.sim.runProgressionSnapshot));
    assert.equal(await NODE('basic-1').getAttribute('aria-disabled'), 'true');
    assert.equal(await page.locator('[data-ability-action="reset"]').getAttribute('aria-disabled'), 'true');
    assert.equal(await page.evaluate(() => JSON.stringify(BUDMORI.sim.runProgressionSnapshot)), SNAPSHOT);
    await page.screenshot({ path: path.join(OUTPUT, `${name}-locked.png`) });
    await reloadFarm();
    assert.equal(await page.evaluate(() => BUDMORI.sim.tower.active), false);
    assert.equal(
        await page.evaluate((id) => BUDMORI.sim.playerProgression.abilities[id].nodeRanks['basic-1'], ability),
        10,
    );
}
try {
    await new Promise((resolve, reject) => {
        SERVER.once('error', reject);
        SERVER.listen(0, '127.0.0.1', resolve);
    });
    const ORIGIN = `http://127.0.0.1:${SERVER.address().port}`;
    // Fetch every original graph member before browser execution, checking bytes and MIME.
    for (const ENTRY of GRAPH.files) {
        const RESPONSE = await fetch(`${ORIGIN}/${ENTRY.file}`);
        assert.equal(RESPONSE.status, 200, ENTRY.file);
        assert.equal(HASH(Buffer.from(await RESPONSE.arrayBuffer())), ENTRY.sha256, ENTRY.file);
        if (TYPES[path.extname(ENTRY.file)]) {
            assert.match(
                RESPONSE.headers.get('content-type'),
                new RegExp(TYPES[path.extname(ENTRY.file)].replace('+', '\\+')),
            );
        }
    }
    browser = await chromium.launch({
        executablePath: process.env.CHROME_PATH,
        args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    });
    const CONTEXT = await browser.newContext({
        viewport: TOUCH ? { width: 844, height: 390 } : { width: 1100, height: 850 },
        isMobile: TOUCH,
        hasTouch: TOUCH,
        deviceScaleFactor: 1,
        serviceWorkers: 'block',
    });
    await CONTEXT.route('**/*', (route) => {
        const URL = route.request().url();
        if (URL.startsWith(`${ORIGIN}/`)) {
            return route.continue();
        }
        if (SDK.has(URL)) {
            return route.fulfill({
                body: SDK.get(URL),
                contentType: 'text/javascript',
                headers: { 'access-control-allow-origin': '*' },
            });
        }
        ERRORS.push(`Unexpected network ${URL}`);
        return route.abort();
    });
    page = await CONTEXT.newPage();
    page.setDefaultTimeout(20000);
    page.on('pageerror', (e) => ERRORS.push(String(e)));
    page.on('console', (m) => {
        if (m.type() === 'error' || m.text().includes('loop stopped')) {
            ERRORS.push(m.text());
        }
    });
    page.on('response', (r) => {
        REQUESTS.push({ url: r.url(), status: r.status() });
        if (r.status() >= 400) {
            ERRORS.push(`HTTP ${r.status()} ${r.url()}`);
        }
    });
    await page.goto(`${ORIGIN}/index.html`);
    await page.waitForFunction(() => globalThis.BUDMORI);
    assert.equal(await page.locator('#productVersion').textContent(), PRODUCT_VERSION);
    await ACTIVATE(page.locator('#newGame'));
    await page.waitForFunction(() => document.body.dataset.home === 'false');
    for (const [SPECIES, ABILITY, NAME] of CASES) {
        await openTree(SPECIES);
        await purchase(ABILITY, 'basic-1');
        await reset(ABILITY);
        await page.evaluate((ability) => {
            const W = BUDMORI.sim,
                B = W.playerProgression.abilities[ability];
            B.masteryLevel = 50;
            B.masteryXp = 125;
            W.markProgressChanged();
            BUDMORI.storage.save(W);
        }, ABILITY);
        await purchase(ABILITY, 'evolution-2');
        await purchase(ABILITY, 'evolution-3');
        for (let i = 0; i < 10; i++) {
            await purchase(ABILITY, 'basic-1');
        }
        if (SPECIES === 4) {
            for (let i = 0; i < 10; i++) {
                await purchase(ABILITY, 'basic-3');
            }
            await purchase(ABILITY, 'basic-2');
            await purchase(ABILITY, 'specialty-1');
            await purchase(ABILITY, 'specialty-2');
        }
        if (SPECIES === 5) {
            for (let i = 0; i < 5; i++) {
                await purchase(ABILITY, 'specialty-2');
            }
        }
        const BEFORE = await page.evaluate(
            (ability) => structuredClone(BUDMORI.sim.playerProgression.abilities[ability]),
            ABILITY,
        );
        REPORT.ui.push({
            species: NAME,
            build: BEFORE,
            wallet: await page.locator('[data-growth-wallet]').textContent(),
            tree: await page.locator('[data-growth-tree]').innerText(),
        });
        await page.screenshot({ path: path.join(OUTPUT, `${NAME}-tree.png`) });
        await reloadFarm();
        assert.deepEqual(
            await page.evaluate((ability) => BUDMORI.sim.playerProgression.abilities[ability], ABILITY),
            BEFORE,
        );
        await openTree(SPECIES);
        await reset(ABILITY);
        assert.equal(
            await page.evaluate((ability) => BUDMORI.sim.playerProgression.abilities[ability].masteryXp, ABILITY),
            125,
        );
        // Rebuy the exact same legal investment through the UI after its refund.
        for (const [ID, RANK] of Object.entries(BEFORE.nodeRanks)) {
            for (let i = 0; i < RANK; i++) {
                await purchase(ABILITY, ID);
            }
        }
        await ACTIVATE(page.locator('#gameMenuClose'));
        REPORT.checks.push(`${NAME}: actual purchase/refund, XP and all ranks survive reload, exact UI reinvestment`);
        await combat(SPECIES, ABILITY, NAME);
    }
    assert.deepEqual(ERRORS, []);
    for (const URL of SDK.keys()) {
        assert.ok(
            REQUESTS.some((request) => request.url === URL && request.status === 200),
            `Pinned SDK actually requested: ${URL}`,
        );
    }
    assert.equal(sourceGraph(ROOT).sha256, GRAPH.sha256, 'source did not change while verifying');
    REPORT.status = 'passed';
    console.log(`PASS functional growth ${VIEWPORT}`);
} catch (error) {
    REPORT.status = 'failed';
    REPORT.error = String(error);
    if (page) {
        REPORT.probe = await page
            .evaluate(() => ({
                functional: globalThis.__functional
                    ? {
                          record: globalThis.__functional.record,
                          hits: globalThis.__functional.hits,
                          stored: globalThis.__functional.stored,
                          children: globalThis.__functional.children.length,
                          injected: globalThis.__functional.injected,
                      }
                    : null,
                scene: globalThis.BUDMORI?.sim?.scene,
                paused: globalThis.BUDMORI?.runtime?.paused,
            }))
            .catch(() => null);
        await page.screenshot({ path: path.join(OUTPUT, 'failure.png') }).catch(() => {});
    }
    throw error;
} finally {
    REPORT.errors = ERRORS;
    REPORT.requests = REQUESTS;
    fs.writeFileSync(path.join(OUTPUT, 'report.json'), JSON.stringify(REPORT, null, 2));
    await browser?.close();
    SERVER.close();
}
