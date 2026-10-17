import { chromium } from 'playwright';
import { build as BUILD } from 'esbuild';
import { PRODUCT_VERSION } from '../src/version.js';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const ROOT = fileURLToPath(new URL('../', import.meta.url)),
    SUITE = process.argv[2] || 'core',
    OUT = path.join(ROOT, 'tests/output');
await mkdir(OUT, {
    recursive: true,
});
const REPORT = {
    suite: SUITE,
    started: new Date().toISOString(),
    dependency: 'Actual pinned CDN ESM; no dependency interception, signaling mock or software renderer flag',
    checks: [],
    errors: [],
    renders: [],
};
const BROWSER_MODULES = new Map();
const SERVER = createServer(async (q, r) => {
    const URL_LOCAL = new URL(q.url, 'http://localhost');
    if (URL_LOCAL.pathname === '/favicon.ico') {
        r.writeHead(204);
        r.end();
        return;
    }
    const F = path.resolve(
        ROOT,
        '.' + (URL_LOCAL.pathname === '/' ? '/index.html' : decodeURIComponent(URL_LOCAL.pathname)),
    );
    if (!F.startsWith(ROOT)) {
        r.writeHead(403);
        r.end();
        return;
    }
    try {
        let body = await readFile(F);
        // Browser scenario imports use the same bundler as production, including authored CJS geometry.
        if (
            F.includes(path.sep + 'src' + path.sep) &&
            F.endsWith('.js') &&
            !['game.js', 'bootstrap.js'].includes(path.basename(F))
        ) {
            if (!BROWSER_MODULES.has(F)) {
                const RESULT = await BUILD({
                    entryPoints: [F],
                    bundle: true,
                    write: false,
                    format: 'esm',
                    platform: 'browser',
                    target: 'es2022',
                });
                BROWSER_MODULES.set(F, RESULT.outputFiles[0].contents);
            }
            body = BROWSER_MODULES.get(F);
        }
        const BODY = body;
        r.writeHead(200, {
            'Content-Type': F.endsWith('.html')
                ? 'text/html;charset=utf-8'
                : F.endsWith('.css')
                  ? 'text/css;charset=utf-8'
                  : F.endsWith('.svg')
                    ? 'image/svg+xml'
                    : F.endsWith('.json')
                      ? 'application/json'
                      : 'text/javascript;charset=utf-8',
        });
        r.end(BODY);
    } catch {
        r.writeHead(404);
        r.end();
    }
});
await new Promise((r) => SERVER.listen(0, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:' + SERVER.address().port;
let browser;
const CHECK = (text) => REPORT.checks.push(text);
async function open(context) {
    const P = await context.newPage();
    P.on('pageerror', (e) => {
        if (!REPORT.errors.length) {
            REPORT.errors.push(e.stack || e.message);
        }
    });
    await P.goto(BASE);
    await P.waitForFunction(
        () => window.BUDMORI,
        {},
        {
            timeout: 30000,
        },
    );
    return P;
}
async function clean(p) {
    assert.equal(await p.locator('#error').isVisible(), false, await p.locator('#error').textContent());
    assert.deepEqual(REPORT.errors, []);
}
async function openMenuTab(p, tab = 'play') {
    if (!(await p.locator('#gameMenuOverlay').isVisible())) {
        await p.locator('#gameMenu').click();
    }
    const BUTTON = p.locator(`[data-menu-tab="${tab}"]`);
    if ((await BUTTON.getAttribute('aria-selected')) !== 'true') {
        await BUTTON.click();
    }
}
async function closeMenu(p) {
    if (await p.locator('#gameMenuOverlay').isVisible()) {
        await p.locator('#gameMenuClose').click();
    }
}
async function goHome(p) {
    await openMenuTab(p, 'play');
    await p.locator('#menuHome').click();
}
async function render(p, label) {
    const TIMING = await p.evaluate(async () => {
        const R = BUDMORI.renderer,
            DRAW = R.render,
            SAMPLES = [];
        R.render = function (display, ...args) {
            const BY_ID = new Map(BUDMORI.sim.units.map((u) => [u.id, u]));
            SAMPLES.push({
                now: performance.now(),
                simulationTick: BUDMORI.runtime.tick,
                simulationTime: BUDMORI.sim.time,
                displayTime: display.time,
                displayTimeMs: display.displayTimeMs,
                diagnostics: display.presentationDiagnostics,
                units: display.units.slice(0, 4).map((u) => {
                    const RAW = BY_ID.get(u.id);
                    return {
                        id: u.id,
                        raw: RAW && {
                            x: RAW.x,
                            y: RAW.y,
                            z: RAW.z,
                            angle: RAW.angle,
                        },
                        display: {
                            x: u.x,
                            y: u.y,
                            z: u.z,
                            angle: u.angle,
                        },
                    };
                }),
                boss: {
                    raw: {
                        x: BUDMORI.sim.boss.x,
                        y: BUDMORI.sim.boss.y,
                        angle: BUDMORI.sim.boss.angle,
                    },
                    display: {
                        x: display.boss.x,
                        y: display.boss.y,
                        z: display.boss.z,
                        angle: display.boss.angle,
                    },
                },
            });
            if (SAMPLES.length > 180) {
                SAMPLES.shift();
            }
            return DRAW.call(this, display, ...args);
        };
        try {
            const DEADLINE = performance.now() + 5000;
            while (SAMPLES.length < 3 && performance.now() < DEADLINE) {
                await new Promise(requestAnimationFrame);
            }
        } finally {
            R.render = DRAW;
        }
        const D = SAMPLES.at(-1),
            TIMES = SAMPLES.map((s) => s.displayTimeMs).filter(Number.isFinite);
        return {
            renderMetrics: BUDMORI.renderMetrics,
            sampleCount: SAMPLES.length,
            displayTimeMonotonic: TIMES.every((t, i) => !i || t >= TIMES[i - 1]),
            latest: D,
        };
    });
    assert(TIMING.sampleCount >= 3, 'actual RAF render samples captured');
    assert(TIMING.displayTimeMonotonic, 'presentation time never runs backward');
    const D = TIMING.latest?.diagnostics;
    if (D) {
        assert(
            D.renderFraction === null || (D.renderFraction >= 0 && D.renderFraction <= 1),
            'render fraction remains clamped to the snapshot interval',
        );
        if (['pc-battle', 'mobile-battle'].includes(label) && D.previousSnapshotTimeMs !== null) {
            assert(
                D.sampleAgeMs >= 0 && D.sampleAgeMs <= D.intervalMs + 1,
                'active-battle presentation is sampled between adjacent snapshots',
            );
        }
    }
    const INFO = await p.evaluate(() => {
        const G = document.querySelector('canvas').getContext('webgl'),
            D = G.getExtension('WEBGL_debug_renderer_info');
        return {
            renderer: G.getParameter(D.UNMASKED_RENDERER_WEBGL),
            gpuError: G.getError(),
            units: BUDMORI.sim.units.length,
            hp: BUDMORI.sim.boss.hp,
            finite: BUDMORI.sim.units.every((u) => [u.x, u.y, u.z].every(Number.isFinite)),
            width: innerWidth,
            height: innerHeight,
            overflow: document.documentElement.scrollWidth > innerWidth,
        };
    });
    assert.equal(INFO.gpuError, 0);
    assert(INFO.finite && !INFO.overflow);
    REPORT.renders.push({
        label,
        ...INFO,
        timing: TIMING,
    });
    await p.screenshot({
        path: path.join(OUT, label + '.png'),
    });
}
async function worldClient(p, x, y) {
    return p.evaluate(
        ({ x, y }) => {
            const R = BUDMORI.renderer,
                PT = R.project(x, y, 0),
                B = R.canvas.getBoundingClientRect();
            return {
                x: B.left + PT.x / R.pixelRatio,
                y: B.top + PT.y / R.pixelRatio,
            };
        },
        {
            x,
            y,
        },
    );
}
async function cameraSnapshot(p) {
    return p.evaluate(() => {
        const R = BUDMORI.renderer;
        return {
            pan: R.cameraPan,
            limits: { ...R.panLimits },
            projection: R.project(0, 0),
            scale: R.scale,
            pixelRatio: R.pixelRatio,
        };
    });
}
async function holdDeployButton(p, { hold = 0, touch = false, cancel = false } = {}) {
    const BUTTON = p.locator('#deployTroops');
    await BUTTON.waitFor({
        state: 'visible',
    });
    assert(await BUTTON.isEnabled(), 'the deployment button is usable during active Raid play');
    const BOX = await BUTTON.boundingBox(),
        X = BOX.x + BOX.width / 2,
        Y = BOX.y + BOX.height / 2;
    if (touch) {
        const CDP = await p.context().newCDPSession(p);
        try {
            await CDP.send('Input.dispatchTouchEvent', {
                type: 'touchStart',
                touchPoints: [
                    {
                        id: 11,
                        x: X,
                        y: Y,
                    },
                ],
            });
            await CDP.send('Input.dispatchTouchEvent', {
                type: 'touchMove',
                touchPoints: [{ id: 11, x: X + 6, y: Y + 4 }],
            });
            if (hold) {
                await p.waitForTimeout(hold);
            }
            await CDP.send('Input.dispatchTouchEvent', {
                type: cancel ? 'touchCancel' : 'touchEnd',
                touchPoints: [],
            });
        } finally {
            await CDP.detach();
        }
    } else {
        await BUTTON.evaluate((node) =>
            node.addEventListener(
                'pointerdown',
                (event) => {
                    window.deployPointerId = event.pointerId;
                },
                {
                    once: true,
                },
            ),
        );
        await p.mouse.move(X, Y);
        await p.mouse.down();
        await p.mouse.move(X + 6, Y + 4);
        if (hold) {
            await p.waitForTimeout(hold);
        }
        if (cancel) {
            await BUTTON.evaluate((node) =>
                node.dispatchEvent(
                    new PointerEvent('pointercancel', {
                        pointerId: window.deployPointerId,
                        bubbles: true,
                    }),
                ),
            );
        }
        await p.mouse.up();
    }
}
async function buttonDeployment(p, pointerType) {
    const INITIAL = await p.evaluate(() => {
        const RUNTIME = BUDMORI.runtime,
            WORLD = RUNTIME.world;
        window.deployProbe = {
            queue: RUNTIME.queue,
            deploy: WORLD.deployNextRaidUnit,
            world: WORLD,
            submitted: [],
            created: [],
        };
        RUNTIME.queue = function (type, args) {
            const ACCEPTED = globalThis.deployProbe.queue.call(this, type, args);
            if (type === 'deploy' && ACCEPTED) {
                globalThis.deployProbe.submitted.push({
                    at: performance.now(),
                    ...args,
                });
            }
            return ACCEPTED;
        };
        WORLD.deployNextRaidUnit = function (ownerId, sequence) {
            const ACCEPTED = globalThis.deployProbe.deploy.call(this, ownerId, sequence);
            if (ACCEPTED) {
                const UNIT = this.units.at(-1);
                globalThis.deployProbe.created.push({
                    id: UNIT.id,
                    farmId: UNIT.farmId,
                    tier: UNIT.tier,
                    x: UNIT.x,
                    y: UNIT.y,
                    z: UNIT.z,
                    radius: UNIT.radius,
                    landed: UNIT.dropLanded,
                    sequence,
                });
            }
            return ACCEPTED;
        };
        return {
            remaining: WORLD.raidRemaining('solo'),
            order: WORLD.raidRoster('solo').troops.map((t) => ({
                farmId: t.farmId,
                tier: t.tier,
            })),
            dropHeight: BUDMORI.CONFIG.raid.dropHeight,
            arena: BUDMORI.CONFIG.raid.arena,
            camera: BUDMORI.renderer.cameraPan,
        };
    });
    try {
        assert(INITIAL.remaining >= 8, 'the user-flow fixture has enough Farm troops to test separate holds');
        await holdDeployButton(p, {
            touch: pointerType === 'touch',
        });
        await p.waitForFunction(() => globalThis.deployProbe.created.length === 1);
        const TAPPED = await p.evaluate(() => ({
            submitted: globalThis.deployProbe.submitted.length,
            created: globalThis.deployProbe.created.length,
            remaining: BUDMORI.sim.raidRemaining('solo'),
        }));
        assert.deepEqual(
            TAPPED,
            {
                submitted: 1,
                created: 1,
                remaining: INITIAL.remaining - 1,
            },
            'one button press immediately queues and deploys exactly one troop',
        );
        await holdDeployButton(p, {
            hold: 375,
            touch: pointerType === 'touch',
        });
        await p.waitForTimeout(100);
        const HELD = await p.evaluate(() => globalThis.deployProbe.created.length);
        assert(HELD >= 5, 'holding the button adds at least four troops at the 100ms repeat cadence');
        await p.waitForTimeout(250);
        assert.equal(
            await p.evaluate(() => globalThis.deployProbe.created.length),
            HELD,
            'releasing the button stops repeat submissions',
        );
        await holdDeployButton(p, {
            hold: 125,
            touch: pointerType === 'touch',
            cancel: true,
        });
        await p.waitForTimeout(100);
        const CANCELLED = await p.evaluate(() => globalThis.deployProbe.created.length);
        await p.waitForTimeout(250);
        assert.equal(
            await p.evaluate(() => globalThis.deployProbe.created.length),
            CANCELLED,
            'pointer cancellation stops deployment repeats',
        );
        assert.equal(
            await p.locator('#deployTroops').getAttribute('aria-pressed'),
            'false',
            'the released/cancelled button is no longer pressed',
        );
        const EVIDENCE = await p.evaluate(() => ({
            created: globalThis.deployProbe.created,
            submitted: globalThis.deployProbe.submitted,
            remaining: BUDMORI.sim.raidRemaining('solo'),
            sequence: BUDMORI.sim.raidRoster('solo').lastDeploySequence,
            camera: BUDMORI.renderer.cameraPan,
        }));
        assert.equal(
            EVIDENCE.created.length,
            EVIDENCE.submitted.length,
            'every accepted deployment command creates one unit',
        );
        assert.equal(EVIDENCE.sequence, EVIDENCE.created.length);
        assert.equal(EVIDENCE.remaining, INITIAL.remaining - EVIDENCE.created.length);
        assert.deepEqual(
            EVIDENCE.created.map((u) => u.sequence),
            EVIDENCE.created.map((_, i) => i + 1),
            'successful deployments advance one sequence at a time',
        );
        assert.deepEqual(
            EVIDENCE.created.map((u) => u.farmId),
            INITIAL.order.slice(0, EVIDENCE.created.length).map((t) => t.farmId),
            'button deployment follows the frozen weakest-tier-first roster',
        );
        assert(
            INITIAL.order.every((troop, i) => !i || troop.tier >= INITIAL.order[i - 1].tier),
            'all lower tiers precede higher tiers',
        );
        assert.equal(new Set(EVIDENCE.created.map((u) => u.id)).size, EVIDENCE.created.length);
        assert.equal(new Set(EVIDENCE.created.map((u) => u.farmId)).size, EVIDENCE.created.length);
        for (const UNIT of EVIDENCE.created) {
            const RX = INITIAL.arena.radiusX - UNIT.radius - 0.05,
                RY = INITIAL.arena.radiusY - UNIT.radius - 0.05;
            assert(
                Math.abs((UNIT.x / RX) ** 2 + (UNIT.y / RY) ** 2 - 1) < 1e-8,
                'each spawn lies on the outer map perimeter inset by its body radius',
            );
            assert.equal(UNIT.z, INITIAL.dropHeight, 'original drop height is preserved');
            assert.equal(UNIT.landed, false, 'new troops must finish the original gravity drop before acting');
        }
        assert(
            new Set(EVIDENCE.created.map((u) => `${u.x.toFixed(4)},${u.y.toFixed(4)}`)).size > 1,
            'separate deployments receive different perimeter positions',
        );
        assert.deepEqual(EVIDENCE.camera, INITIAL.camera, 'deployment button holds never pan the world');
        REPORT.deployments ??= [];
        REPORT.deployments.push({
            pointerType,
            initialRemaining: INITIAL.remaining,
            ...EVIDENCE,
        });
        CHECK(
            pointerType +
                ' dedicated button: one immediate troop, 100ms holds, weakest-tier-first perimeter drops, release and cancel',
        );
    } finally {
        await p.evaluate(() => {
            BUDMORI.runtime.queue = globalThis.deployProbe.queue;
            globalThis.deployProbe.world.deployNextRaidUnit = globalThis.deployProbe.deploy;
            delete window.deployProbe;
        });
    }
}
async function returnFromHeldInput(p, pointerType) {
    await p.evaluate(() => {
        BUDMORI.renderer.panByScreen(48, 20);
        document.querySelector('canvas').addEventListener(
            'pointerdown',
            (event) => {
                window.returnPointerId = event.pointerId;
            },
            { once: true },
        );
    });
    const POINT = await worldClient(p, 0, 0),
        CDP = pointerType === 'touch' ? await p.context().newCDPSession(p) : null;
    try {
        if (CDP) {
            await CDP.send('Input.dispatchTouchEvent', {
                type: 'touchStart',
                touchPoints: [{ id: 11, ...POINT }],
            });
        } else {
            await p.mouse.move(POINT.x, POINT.y);
            await p.mouse.down();
        }
        await p.waitForFunction(() => document.querySelector('canvas').hasPointerCapture(globalThis.returnPointerId));
        await p.locator('#return').press('Enter');
        await p.waitForFunction(() => BUDMORI.sim.scene === 'farm' && BUDMORI.renderer.scene === 'farm');
        const RETURNED = await cameraSnapshot(p);
        if (CDP) {
            await CDP.send('Input.dispatchTouchEvent', {
                type: 'touchMove',
                touchPoints: [{ id: 11, x: POINT.x + 40, y: POINT.y + 25 }],
            });
        } else {
            await p.mouse.move(POINT.x + 40, POINT.y + 25);
        }
        assert.deepEqual(
            await cameraSnapshot(p),
            RETURNED,
            'return cancels the outgoing pan before restoring the Farm',
        );
        assert.equal(
            await p.evaluate(() => document.querySelector('canvas').hasPointerCapture(globalThis.returnPointerId)),
            false,
            'Raid return releases the world pointer capture',
        );
    } finally {
        if (CDP) {
            await CDP.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
            await CDP.detach();
        } else {
            await p.mouse.up();
        }
        await p.evaluate(() => {
            delete window.returnPointerId;
        });
    }
}
async function swipeEncounter(p, direction = 'up') {
    const BOX = await p.locator('#bossEncounterCard').boundingBox();
    assert(BOX, 'encounter preview is visible');
    const X = BOX.x + BOX.width / 2,
        Y = BOX.y + BOX.height * 0.4,
        DELTA = direction === 'up' ? -100 : 100;
    await p.mouse.move(X, Y);
    await p.mouse.down();
    await p.mouse.move(X, Y + DELTA, {
        steps: 5,
    });
    await p.mouse.up();
}
async function unlockAbilityFlow(p) {
    await p.evaluate(() => {
        const W = BUDMORI.sim,
            U = W.spawn(1, 3, -4, 1);
        if (!U) {
            throw Error('could not seed one rare corn for the ability menu flow');
        }
        U.growth = BUDMORI.CONFIG.farm.breeding.matureMeals;
        U.growthDuration = W.breedGrowthDuration();
        U.growthElapsed = U.growthDuration;
        W.playerProgression.availablePoints = 1;
        W.playerProgression.abilities['corn-burst-fire'] = {
            rootUnlocked: false,
            powerLevel: 0,
            gradeLevel: 0,
        };
    });
    await openMenuTab(p, 'abilities');
    await p.locator('[data-ability-species="1"]').click();
    const ROOT = p.locator('[data-ability="corn-burst-fire"] [data-ability-node="corn-burst-fire:root"]');
    await ROOT.waitFor({
        state: 'visible',
    });
    assert.equal(await ROOT.getAttribute('aria-disabled'), 'false', 'the selected species unlock is available');
    await ROOT.click();
    await p.waitForFunction(() => BUDMORI.sim.playerProgression.abilities['corn-burst-fire'].rootUnlocked);
    await p.waitForFunction(() => document.querySelector('#abilityPoints')?.textContent.trim() === '0');
    assert.equal(await p.evaluate(() => BUDMORI.sim.playerProgression.availablePoints), 0);
    await closeMenu(p);
    CHECK('Ability menu selects Corn, unlocks its rare ability, and spends one shared XP point');
}
async function nutAttackCycles(p) {
    const RESULT = await p.evaluate(async () => {
        const GARDEN = BUDMORI.sim.constructor,
            {
                snapshot: SNAPSHOT,
                restore: RESTORE,
                validateSnapshot: VALIDATE_SNAPSHOT,
            } = await import('/src/farm-state.js');
        const TARGET_POINT = (x) => ({
            id: 'boss',
            x,
            y: 0,
        });
        const TICK = (world, unit, count, other = null) => {
            for (let i = 0; i < count; i++) {
                const DT = 1 / 120;
                unit.ability.update(world, DT);
                const OLD = {
                    x: unit.x,
                    y: unit.y,
                    z: unit.z,
                };
                unit.integrate(DT);
                unit.ability.afterMove(world, OLD);
                if (other) {
                    other.integrate(DT);
                }
                world.time += DT;
            }
        };
        const PEANUT_WORLD = new GARDEN(1204);
        PEANUT_WORLD.boss.x = 5.7;
        PEANUT_WORLD.boss.y = 0;
        PEANUT_WORLD.boss.hp = PEANUT_WORLD.boss.maxHp = 1000;
        const PEANUT = PEANUT_WORLD.spawn(4, 1, 0, 0);
        PEANUT.ability.begin(PEANUT_WORLD, TARGET_POINT(1.44));
        TICK(PEANUT_WORLD, PEANUT, 46);
        const FIRST = PEANUT_WORLD.notices.filter((event) => event.kind === 'boss-hit');
        if (
            FIRST.length !== 1 ||
            FIRST[0].strikeIndex !== 0 ||
            PEANUT.ability.action?.resolvedMask !== 1 ||
            PEANUT.ability.action?.hitMask !== 1
        ) {
            throw Error('Peanut first fixed strike slot was not recorded');
        }
        const MIDPOINT = SNAPSHOT(PEANUT_WORLD);
        if (!VALIDATE_SNAPSHOT(MIDPOINT)) {
            throw Error('Peanut mid-cycle snapshot did not validate');
        }
        const REPLAY = RESTORE(MIDPOINT);
        const REPLAY_PEANUT = REPLAY.units.find((unit) => unit.species === 4);
        TICK(PEANUT_WORLD, PEANUT, 30);
        TICK(REPLAY, REPLAY_PEANUT, 30);
        const HASHES = (world) =>
            globalThis.BloomGamekitDeterministic.hashBytes(
                globalThis.BloomGamekitDeterministic.binaryCodec.encode(SNAPSHOT(world)),
            );
        const PEANUT_HITS = PEANUT_WORLD.notices.filter((event) => event.kind === 'boss-hit');
        if (
            PEANUT_HITS.length !== 2 ||
            PEANUT_HITS[1].strikeIndex !== 1 ||
            PEANUT_HITS[0].attackId !== PEANUT_HITS[1].attackId ||
            PEANUT.ability.action?.hitMask !== 3 ||
            HASHES(PEANUT_WORLD) !== HASHES(REPLAY)
        ) {
            throw Error('Peanut slot replay or per-strike damage diverged');
        }
        const WALNUT_WORLD = new GARDEN(1205);
        WALNUT_WORLD.boss.x = 5.7;
        WALNUT_WORLD.boss.y = 0;
        WALNUT_WORLD.boss.hp = WALNUT_WORLD.boss.maxHp = 1000;
        const WALNUT = WALNUT_WORLD.spawn(5, 1, 0, 0);
        WALNUT.ability.begin(WALNUT_WORLD, TARGET_POINT(1.44));
        TICK(WALNUT_WORLD, WALNUT, 100);
        const WALNUT_HITS = WALNUT_WORLD.notices.filter((event) => event.kind === 'boss-hit');
        if (WALNUT_HITS.length !== 1 || WALNUT_HITS[0].attackKind !== 'walnut-hammer') {
            throw Error('Walnut hammer did not resolve exactly once');
        }
        const UNIT_WORLD = new GARDEN(1206),
            ATTACKER = UNIT_WORLD.spawn(4, 1, 0, 0),
            TARGET = UNIT_WORLD.spawn(5, 1, 0.5, 0);
        TARGET.faction = BUDMORI.CONFIG.factions.ENEMY;
        TARGET.ownerId = 'boss';
        TARGET.hp = 100;
        ATTACKER.ability.begin(UNIT_WORLD, {
            id: TARGET.id,
            x: TARGET.x,
            y: TARGET.y,
        });
        TICK(UNIT_WORLD, ATTACKER, 100, TARGET);
        const UNIT_HITS = UNIT_WORLD.notices.filter((event) => event.kind === 'unit-hit');
        if (
            UNIT_HITS.length !== 2 ||
            UNIT_HITS.some((event) => event.attackKind !== 'peanut-dual-strike') ||
            UNIT_HITS[0].attackId !== UNIT_HITS[1].attackId ||
            UNIT_HITS[0].strikeIndex !== 0 ||
            UNIT_HITS[1].strikeIndex !== 1 ||
            TARGET.hp >= 100
        ) {
            throw Error('Peanut did not route both strikes through the normal opposing-unit damage path');
        }
        return {
            peanutHitCount: PEANUT_HITS.length,
            peanutStrikeIndexes: PEANUT_HITS.map((event) => event.strikeIndex),
            replayMatched: true,
            walnutHitCount: WALNUT_HITS.length,
            opposingUnitHitCount: UNIT_HITS.length,
            opposingUnitDamaged: TARGET.hp < 100,
        };
    });
    assert.deepEqual(RESULT, {
        peanutHitCount: 2,
        peanutStrikeIndexes: [0, 1],
        replayMatched: true,
        walnutHitCount: 1,
        opposingUnitHitCount: 2,
        opposingUnitDamaged: true,
    });
    CHECK(
        'Peanut two-slot hits and Walnut hammer use the common damage path; a mid-cycle save/replay preserves the slot masks',
    );
}
async function formationBrowserUI() {
    const C = await browser.newContext({ viewport: { width: 1280, height: 800 } }),
        P = await open(C);
    await P.locator('#newGame').click();
    await P.evaluate(() => {
        BUDMORI.sim.playerProgression.level = 101;
        BUDMORI.sim.playerProgression.availablePoints = 100;
        BUDMORI.sim.markProgressChanged();
    });
    await P.locator('.formation-open').click();
    await P.locator('[data-formation-purchase="giant"]').click();
    await P.waitForFunction(() => BUDMORI.sim.playerProgression.formationSkills.levels.giant === 1);
    await P.locator('[data-formation-equip="giant"]').click();
    await P.waitForFunction(() => BUDMORI.sim.playerProgression.formationSkills.equipped[0] === 'giant');
    await P.locator('[data-formation-purchase="giant"]').click();
    await P.waitForFunction(() => BUDMORI.sim.playerProgression.formationSkills.levels.giant === 2);
    await P.locator('[data-formation-buy-slot]').click();
    await P.waitForFunction(() => BUDMORI.sim.playerProgression.formationSkills.slots === 2);
    await P.locator('[data-formation-buy-slot]').click();
    await P.waitForFunction(() => BUDMORI.sim.playerProgression.formationSkills.slots === 3);
    assert.equal(await P.locator('.formation-card').count(), 9);
    await P.screenshot({ path: path.join(OUT, 'formation-desktop.png') });
    await P.setViewportSize({ width: 390, height: 844 });
    assert(
        await P.evaluate(() => {
            const D = document.querySelector('.formation-dialog');
            return D.scrollWidth <= D.clientWidth + 1;
        }),
        'mobile dialog has no horizontal overflow',
    );
    await P.screenshot({ path: path.join(OUT, 'formation-mobile.png') });
    await P.locator('[data-formation-close]').click();
    await P.screenshot({ path: path.join(OUT, 'formation-mobile-slots.png') });
    await openMenuTab(P, 'play');
    await P.locator('#menuHome').click();
    await P.reload();
    await P.waitForFunction(() => window.BUDMORI);
    await P.locator('#continueGame').click();
    await P.waitForFunction(() => {
        const STATE = BUDMORI.sim.playerProgression.formationSkills;
        return STATE.slots === 3 && STATE.levels.giant === 2 && STATE.equipped[0] === 'giant';
    });
    CHECK('Formation progress survives native Home, reload and Continue without battle entities');
    await P.setViewportSize({ width: 1280, height: 800 });
    const GROUPS = [
        ['giant', 'lightning', 'meteor'],
        ['meteor-shower', 'copy', 'healing-rain'],
        ['hammer', 'ufo', 'storm-cloud'],
    ];
    for (let index = 0; index < GROUPS.length; index++) {
        await P.evaluate((ids) => {
            const W = BUDMORI.sim;
            BUDMORI.runtime.paused = true;
            W.formationSkills.end();
            W.farmBossEvent.phase = 'idle';
            W.boss.active = false;
            for (const ID of ids) {
                if (!W.playerProgression.formationSkills.levels[ID]) {
                    W.formationSkills.purchase(ID);
                }
            }
            for (let i = 0; i < 3; i++) {
                W.formationSkills.equip(i, null);
            }
            ids.forEach((id, slot) => W.formationSkills.equip(slot, id));
            W.boss.active = true;
            W.boss.hp = W.boss.maxHp = 10000;
            W.boss.x = 0;
            W.boss.y = 0;
            W.boss.z = 0;
            W.farmBossEvent.phase = 'fighting';
            W.units.forEach((unit, i) => {
                unit.x = 1 + i * 0.5;
                unit.y = 0;
                unit.hp = 20;
            });
            W.formationSkills.synchronize();
            W.onCombatResolved.emit({
                hits: 1000,
                critHits: 100,
                damageDealt: 1000,
                damageTaken: 1000,
                allyDeaths: 10,
            });
            W.formationSkills.update(0);
            W.time += 0.06;
            W.formationSkills.update(0.06);
            BUDMORI.runtime.capturePresentation('reset');
        }, GROUPS[index]);
        await P.waitForFunction(() => !document.querySelector('.formation-dialog').open);
        await P.waitForTimeout(80);
        await clean(P);
        await P.screenshot({ path: path.join(OUT, 'formation-effects-' + index + '.png') });
        if (index === 0) {
            await P.evaluate(() => {
                const W = BUDMORI.sim;
                for (let i = 0; i < 90; i++) {
                    W.time += 1 / 120;
                    W.formationSkills.update(1 / 120);
                }
                BUDMORI.runtime.capturePresentation('reset');
            });
            await P.waitForTimeout(80);
            await clean(P);
            await P.screenshot({ path: path.join(OUT, 'formation-meteor-impact.png') });
        }
        if (index === 2) {
            await P.evaluate(() => {
                const W = BUDMORI.sim;
                for (let i = 0; i < 176; i++) {
                    W.time += 1 / 120;
                    W.formationSkills.update(1 / 120);
                }
                BUDMORI.runtime.capturePresentation('reset');
            });
            await P.waitForTimeout(80);
            await clean(P);
            await P.screenshot({ path: path.join(OUT, 'formation-sky-beams.png') });
        }
    }
    await P.locator('.formation-open').click();
    assert.equal(await P.locator('[data-formation-equip="giant"]').isDisabled(), true);
    await C.close();
    CHECK(
        'Formation UI: real purchase/upgrade/equip/slot commands, 390px layout, combat lock and all nine GPU effects',
    );
}
async function core() {
    const C = await browser.newContext({
            viewport: {
                width: 1280,
                height: 800,
            },
        }),
        P = await open(C);
    await P.waitForFunction(() => !document.getElementById('bloom-module-loading'));
    assert.equal(
        await P.locator('#bloom-error-popup').isVisible(),
        false,
        'diagnostics stay hidden during normal play',
    );
    await P.evaluate(() => {
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: {
                writeText: async (text) => {
                    window.__startupDiagnostics = text;
                },
            },
        });
        window.dispatchEvent(
            new ErrorEvent('error', {
                message: 'diagnostic-probe',
                error: new Error('diagnostic-probe'),
            }),
        );
        window.BloomReportRuntimeFatal(new Error('diagnostic-probe'));
    });
    assert.equal(
        await P.locator('#bloom-error-popup').isVisible(),
        true,
        'blocking runtime failure opens the isolated diagnostic popup',
    );
    await P.locator('#bloom-diagnostic-copy').click();
    await P.waitForFunction(() => typeof window.__startupDiagnostics === 'string');
    const STARTUP_DIAGNOSTICS = JSON.parse(await P.evaluate(() => window.__startupDiagnostics));
    assert.equal(STARTUP_DIAGNOSTICS.format, 'budmori startup diagnostics v1');
    assert.equal(STARTUP_DIAGNOSTICS.app.version.split(' ')[0], PRODUCT_VERSION);
    assert(
        STARTUP_DIAGNOSTICS.diagnostics.errors.some(
            (error) => error.kind === 'global-error' && error.message === 'diagnostic-probe',
        ),
        'GameKit global diagnostics retain the startup/global error',
    );
    assert(
        STARTUP_DIAGNOSTICS.recentInputs.some(
            (input) => input.type === 'click' && input.target?.id === 'bloom-diagnostic-copy',
        ),
        'bounded input trace records the diagnostic button tap without form data',
    );
    CHECK('Startup diagnostics use the pinned GameKit error ring and copy a redacted bounded input trace');
    await P.reload();
    await P.waitForFunction(() => window.BUDMORI);
    await P.locator('#newGame').click();
    await P.evaluate(() => {
        const SEED = 4463;
        BUDMORI.sim.seed = SEED;
        BUDMORI.sim.rng = new globalThis.BloomGamekitDeterministic.SeededPRNG(SEED);
    });
    await P.waitForFunction(() => BUDMORI.runtime.tick > 5);
    assert.equal(await P.locator('#startScreen').isVisible(), false);
    await nutAttackCycles(P);
    await formationBrowserUI();
    const MENU_CONTRACT = await P.evaluate(() => ({
        utility: [...document.querySelectorAll('.utility button')].map((button) => button.id),
        label: document.querySelector('#gameMenu')?.getAttribute('aria-label'),
        tabs: [...document.querySelectorAll('#gameMenuTabs [role="tab"]')].map((button) => button.textContent.trim()),
        roles: !!document.querySelector('#roles'),
        essentials: [
            'feed',
            'raidControls',
            'deployTroops',
            'raidRemaining',
            'bossbar',
            'allyHealth',
            'bossHealth',
        ].every((id) => !!document.getElementById(id)),
    }));
    assert.deepEqual(
        MENU_CONTRACT.utility,
        ['gameMenu'],
        'only one conventional gear button remains in the utility menu',
    );
    assert.equal(MENU_CONTRACT.label, '게임 설정 열기');
    assert.deepEqual(MENU_CONTRACT.tabs, ['플레이', '성장', '특수 능력', '도움말']);
    assert.equal(MENU_CONTRACT.roles, false, 'troop-role explainer is removed from the battle map');
    assert(MENU_CONTRACT.essentials, 'feed, deploy status and both HP indicators remain available');
    const WAS_PAUSED = await P.evaluate(() => BUDMORI.runtime.paused);
    await openMenuTab(P, 'play');
    await P.screenshot({
        path: path.join(OUT, 'pc-game-menu.png'),
        animations: 'disabled',
    });
    if (!WAS_PAUSED) {
        assert.equal((await P.locator('#pause').textContent()).trim(), 'Ⅱ');
        await P.locator('#pause').click();
        await P.waitForFunction(() => BUDMORI.runtime.paused);
        assert.equal(
            await P.locator('#gameMenuOverlay').isVisible(),
            true,
            'Pause can be selected while the menu is open',
        );
        await closeMenu(P);
        assert.equal(
            await P.evaluate(() => BUDMORI.runtime.paused),
            true,
            'closing settings keeps an explicitly selected paused state',
        );
        await openMenuTab(P, 'play');
        assert.equal((await P.locator('#pause').textContent()).trim(), '▶');
        await P.locator('#pause').click();
        await P.locator('#gameMenuOverlay').waitFor({
            state: 'hidden',
        });
        assert.equal(
            await P.evaluate(() => BUDMORI.runtime.paused),
            false,
            'Continue closes the menu and resumes the Farm',
        );
    }
    await openMenuTab(P, 'help');
    await P.keyboard.press('Escape');
    await P.locator('#gameMenuOverlay').waitFor({
        state: 'hidden',
    });
    assert.equal(await P.locator('#gameMenu').getAttribute('aria-expanded'), 'false');
    assert.equal(
        await P.evaluate(() => BUDMORI.runtime.paused),
        WAS_PAUSED,
        'Escape closes the menu and restores the previous play state',
    );
    CHECK('One gear entry with four Korean tabs; Escape restores the prior play state');
    await unlockAbilityFlow(P);
    const BEFORE = await P.evaluate(() => BUDMORI.foodFeel.counts.manual),
        FEED_CAMERA = await cameraSnapshot(P),
        FEED_BOX = await P.locator('#feed').boundingBox();
    await P.mouse.move(FEED_BOX.x + FEED_BOX.width / 2, FEED_BOX.y + FEED_BOX.height / 2);
    await P.mouse.down();
    await P.mouse.move(FEED_BOX.x + FEED_BOX.width / 2 + 6, FEED_BOX.y + FEED_BOX.height / 2 + 4);
    await P.mouse.up();
    for (let i = 1; i < 15; i++) {
        await P.locator('#feed').click();
    }
    await P.waitForFunction((n) => BUDMORI.foodFeel.counts.manual === n + 15, BEFORE);
    assert.deepEqual(await cameraSnapshot(P), FEED_CAMERA, 'feeding button presses and drags never pan the world');
    CHECK('Start → farm; native manual taps delivered once per release');
    await P.waitForFunction(
        () => BUDMORI.sim.metrics.births > 0,
        {},
        {
            timeout: 12000,
        },
    );
    await P.locator('#merge').click();
    await P.waitForFunction(
        () => BUDMORI.sim.metrics.merges > 0,
        {},
        {
            timeout: 15000,
        },
    );
    CHECK('Farm breeding and same-tier merging continue without passive unit production');
    await P.evaluate(() => {
        BUDMORI.sim.playerProgression.level = 9;
        BUDMORI.sim.playerProgression.availablePoints = 7;
    });
    await openMenuTab(P, 'growth');
    assert.equal(new URL(P.url()).hash, '#/growth');
    await P.locator('[data-progression-farm-node="food"]').click();
    await P.waitForFunction(() => BUDMORI.sim.playerProgression.farmUpgrades.food === 1);
    await P.locator('[data-progression-farm-node="growth"]').click();
    await P.waitForFunction(() => BUDMORI.sim.playerProgression.farmUpgrades.growth === 1);
    for (let level = 1; level <= 5; level++) {
        await P.locator('[data-progression-farm-node="capacity"]').click();
        await P.waitForFunction((n) => BUDMORI.sim.playerProgression.farmUpgrades.capacity === n, level);
    }
    assert.equal(await P.evaluate(() => BUDMORI.sim.capacity), 100);
    await closeMenu(P);
    CHECK('Shared XP points buy normal upgrades and expand farm capacity from 50 through five levels to 100');
    await P.evaluate(() => {
        BUDMORI.sim.mode = 'breed';
    });
    await P.waitForFunction(
        () => BUDMORI.sim.mergeTask === null,
        {},
        {
            timeout: 5000,
        },
    );
    await P.evaluate(() => {
        const W = BUDMORI.sim;
        while (W.units.length < 12) {
            const I = W.units.length,
                U = W.spawn(I % 3, 1, -4 + (I % 4) * 2, -3 + Math.floor(I / 4) * 2);
            U.growth = BUDMORI.CONFIG.farm.breeding.matureMeals;
            U.growthDuration = W.breedGrowthDuration();
            U.growthElapsed = U.growthDuration;
            U.cooldown = U.cooldownDuration = 999;
        }
        W.units.forEach((u, i) => (u.id = 101 + i));
        W.nextId = 101 + W.units.length;
        if (!BUDMORI.storage.save(W)) {
            throw Error('could not save farm with lifetime-grown unit IDs: ' + BUDMORI.storage.error);
        }
    });
    // Synthetic Raid outcomes must not borrow the later real Raid reservation.
    await combatScenarios(P);
    await seedScenarios(P, 'pc');
    await panInput(P, 'mouse');
    await P.locator('#raid').click();
    assert(await P.locator('#bossEncounterScreen').isVisible(), 'Raid opens the vertical stage selector');
    assert.equal(await P.locator('#bossStageCounter').textContent(), '1 / 61');
    assert.equal(await P.locator('#bossStageHp').textContent(), 'HP 200');
    assert.equal(await P.locator('#bossStageAttack').textContent(), '공격력 4');
    assert.equal(await P.locator('#bossStageXp').textContent(), '+20 XP');
    assert.equal(await P.locator('#bossStageDrop').isVisible(), false, 'stages 1–4 have no boss-species drop rolls');
    await swipeEncounter(P, 'up');
    await P.waitForFunction(() => document.querySelector('#bossStageCounter')?.textContent === '2 / 61');
    for (let i = 0; i < 3; i++) {
        await swipeEncounter(P, 'up');
        await P.waitForFunction((n) => document.querySelector('#bossStageCounter')?.textContent === `${n} / 61`, 3 + i);
    }
    assert.equal(await P.locator('#bossStageCounter').textContent(), '5 / 61');
    assert.equal(await P.locator('#bossStageHp').textContent(), 'HP 1,013');
    assert.equal(await P.locator('#bossStageXp').textContent(), '+41 XP');
    assert(await P.locator('#bossStageDrop').isVisible());
    assert.match(await P.locator('#bossStageDrop').textContent(), /20%씩 · 1회 개별 추첨/);
    const REWARD_INVARIANT = await P.evaluate(async () => {
        const { settleBossKill: SETTLE_BOSS_KILL, bossAcquisitionChance: BOSS_ACQUISITION_CHANCE } =
                await import('/src/boss-rewards.js'),
            WORLD = new BUDMORI.sim.constructor(997);
        let zeroRollCalls = 0;
        const ZERO_OPTIONS = {
                encounterId: 900,
                source: 'raid',
                receiptKey: 'stage-zero-roll-xp',
                rollCount: 0,
                xpAmount: 41,
                species: 0,
                random: () => {
                    zeroRollCalls++;
                    return 0.1;
                },
            },
            FIRST = SETTLE_BOSS_KILL(WORLD, ZERO_OPTIONS),
            DUPLICATE = SETTLE_BOSS_KILL(WORLD, ZERO_OPTIONS),
            ROLLS = [0.1, 0.9],
            MULTI = SETTLE_BOSS_KILL(WORLD, {
                encounterId: 901,
                source: 'raid',
                receiptKey: 'stage-ten-rolls',
                rollCount: 2,
                xpAmount: 103,
                species: 2,
                random: () => ROLLS.shift(),
            });
        return {
            farmEventChance: BOSS_ACQUISITION_CHANCE({
                farmEvent: true,
            }),
            zeroRollCalls,
            firstXp: FIRST.receipt.xpAmount,
            duplicateXp: DUPLICATE.receipt.xpAmount,
            duplicateStatus: DUPLICATE.receipt.xpStatus,
            rollCount: MULTI.receipt.rollCount,
            dropStatuses: MULTI.receipt.drops.map((drop) => drop.status),
            earned: WORLD.playerProgression.processedBossKillReceipts.filter((key) => key === 'stage-zero-roll-xp')
                .length,
        };
    });
    assert.deepEqual(
        REWARD_INVARIANT,
        {
            farmEventChance: 0.4,
            zeroRollCalls: 0,
            firstXp: 41,
            duplicateXp: 41,
            duplicateStatus: 'awarded',
            rollCount: 2,
            dropStatuses: ['granted', 'missed'],
            earned: 1,
        },
        'stage XP is idempotent; independent drops and the old Farm-event bonus are preserved',
    );
    const SELECTED_STAGE5 = await P.evaluate(
        () => BUDMORI.sim.farmBossProgress.selections.find((entry) => entry.stage === 5)?.species,
    );
    await swipeEncounter(P, 'down');
    await P.waitForFunction(() => document.querySelector('#bossStageCounter')?.textContent === '4 / 61');
    await P.locator('#bossEncounterBack').click();
    assert.equal(await P.evaluate(() => BUDMORI.sim.farmBossProgress.currentStage), 4);
    await P.locator('#raid').click();
    assert.equal(
        await P.locator('#bossStageCounter').textContent(),
        '4 / 61',
        'the selected page is restored when reopening',
    );
    for (let i = 0; i < 4; i++) {
        await swipeEncounter(P, 'up');
        await P.waitForFunction((n) => document.querySelector('#bossStageCounter')?.textContent === `${n} / 61`, 5 + i);
    }
    assert.equal(
        await P.evaluate(() => BUDMORI.sim.farmBossProgress.selections.find((entry) => entry.stage === 5)?.species),
        SELECTED_STAGE5,
        'visited boss species remains stable',
    );
    for (let i = 0; i < 4; i++) {
        await swipeEncounter(P, 'down');
        await P.waitForFunction((n) => document.querySelector('#bossStageCounter')?.textContent === `${n} / 61`, 7 - i);
    }
    await P.locator('#bossEncounterChallenge').click();
    await P.waitForFunction(() => BUDMORI.sim.scene === 'raid' && BUDMORI.sim.raidRosters.length === 1);
    assert.equal(
        await P.evaluate(() => BUDMORI.runtime.presentation(performance.now()).boss.stage),
        4,
        'the pinned FarmSession render capture carries the selected stage',
    );
    assert.equal(await P.locator('#deploymentCards').count(), 0, 'troop selection cards are removed');
    await P.evaluate(() => {
        history.pushState(null, '', '#/abilities');
        dispatchEvent(new PopStateEvent('popstate'));
    });
    assert.equal(new URL(P.url()).hash, '#/raid', 'a stale/direct abilities route cannot bypass the disabled Raid tab');
    assert.equal(await P.locator('#abilityPanel').isVisible(), false);
    const ORDER = await P.evaluate(() => {
        const GARDEN = BUDMORI.sim.constructor,
            ENTRIES = BUDMORI.sim.raidRoster('solo').troops.map((t) => [t.farmId, t.species, t.tier]),
            A = GARDEN.createRaidBattle(733, ['solo']),
            B = GARDEN.createRaidBattle(733, ['solo']);
        A.registerRaidRoster('solo', ENTRIES);
        B.registerRaidRoster('solo', ENTRIES);
        return {
            first: A.raidRoster('solo').troops.map((t) => [t.farmId, t.tier]),
            second: B.raidRoster('solo').troops.map((t) => [t.farmId, t.tier]),
        };
    });
    assert.deepEqual(ORDER.first, ORDER.second, 'seed and owner reproduce the same within-tier order');
    assert(
        ORDER.first.every((entry, i) => !i || entry[1] >= ORDER.first[i - 1][1]),
        'lower tiers deploy before higher tiers',
    );
    await panInput(P, 'mouse');
    await buttonDeployment(P, 'mouse');
    await P.waitForFunction(
        () => BUDMORI.sim.units.some((u) => u.dropLanded),
        {},
        {
            timeout: 5000,
        },
    );
    await P.waitForFunction(
        () => BUDMORI.sim.boss.hp < BUDMORI.sim.boss.maxHp,
        {},
        {
            timeout: 25000,
        },
    );
    assert(
        await P.evaluate(
            () =>
                BUDMORI.sim.notices.some((e) => e.kind === 'drop-land') &&
                BUDMORI.sim.notices.some((e) => e.kind === 'boss-hit'),
        ),
    );
    CHECK('Dedicated deployment preserves gravity landing and shared automatic boss battle');
    await render(P, 'pc-battle');
    await armyScenarios(P);
    await returnFromHeldInput(P, 'mouse');
    await P.waitForFunction(() => BUDMORI.renderer.scene === 'farm');
    assert.deepEqual(
        await P.evaluate(() => BUDMORI.renderer.project(0, 0)),
        REPORT.pan.find((s) => s.pointerType === 'mouse' && s.scene === 'farm').camera.initial.projection,
        'Raid return restores the Farm camera center',
    );
    await goHome(P);
    const SAVED = await P.evaluate(() => JSON.parse(localStorage.getItem('bloom-weapon-cards-v4')));
    assert.equal(SAVED.progress.player.farmUpgrades.food, 1);
    assert(SAVED.progress.totals.merges > 0);
    await P.reload();
    await P.waitForFunction(() => window.BUDMORI);
    await P.locator('#continueGame').click();
    assert.equal(await P.evaluate(() => BUDMORI.sim.playerProgression.farmUpgrades.food), 1);
    CHECK('Boss return → home save → browser reload → continue retains army and investment');
    await openMenuTab(P, 'help');
    assert.equal(new URL(P.url()).hash, '#/help');
    await P.reload();
    await P.waitForFunction(() => window.BUDMORI);
    assert(await P.locator('#helpPanel').isVisible());
    await closeMenu(P);
    await P.goBack();
    assert(await P.locator('#helpPanel').isVisible());
    await P.goForward();
    assert.equal(await P.locator('#helpPanel').isVisible(), false);
    CHECK('Help direct route, F5, close, back and forward agree');
    await openMenuTab(P, 'growth');
    await P.evaluate(() => {
        history.pushState(null, '', '#/help');
        dispatchEvent(new PopStateEvent('popstate'));
    });
    await closeMenu(P);
    assert.equal(await P.evaluate(() => BUDMORI.runtime.paused), false);
    await P.goto('about:blank');
    await P.goBack();
    await P.waitForFunction(() => window.BUDMORI);
    if (await P.locator('#startScreen').isVisible()) {
        await P.locator('#continueGame').click();
    }
    assert.equal(await P.evaluate(() => BUDMORI.runtime.closed), false);
    CHECK('Panel-to-panel route restores prior pause; browser Back revives a live session');
    await clean(P);
    await C.close();
    const MOBILE = await browser.newContext({
            viewport: {
                width: 390,
                height: 844,
            },
            deviceScaleFactor: 2,
            hasTouch: true,
            isMobile: true,
        }),
        M = await open(MOBILE);
    await M.locator('#newGame').tap();
    const MOBILE_FEED_CAMERA = await cameraSnapshot(M);
    await M.locator('#feed').tap();
    assert.deepEqual(await cameraSnapshot(M), MOBILE_FEED_CAMERA, 'touch feeding never pans the world');
    await panInput(M, 'touch');
    await M.evaluate(() => {
        BUDMORI.runtime.paused = true;
        const W = BUDMORI.sim;
        while (W.units.length < 40) {
            const I = W.units.length;
            W.spawn(0, 1, -7 + (I % 8) * 2, -3.2 + Math.floor(I / 8) * 1.6);
        }
        W.units.forEach((u, i) => {
            u.x = -7 + (i % 8) * 2;
            u.y = -3.2 + Math.floor(i / 8) * 1.6;
            u.home = {
                x: u.x,
                y: u.y,
            };
        });
        if (!BUDMORI.storage.save(W)) {
            throw Error('could not save a valid mobile Raid roster');
        }
    });
    await M.locator('#raid').tap();
    await M.locator('#bossEncounterChallenge').tap();
    await M.waitForFunction(() => BUDMORI.sim.scene === 'raid' && BUDMORI.sim.raidRosters.length === 1);
    const MENU_BEFORE = await M.evaluate(() => ({
        units: BUDMORI.sim.units.length,
        remaining: BUDMORI.sim.raidRemaining('solo'),
    }));
    await M.locator('#gameMenu').tap();
    await M.locator('#menuTabHelp').tap();
    await M.locator('#helpPanel').waitFor({
        state: 'visible',
    });
    assert.equal(await M.locator('#menuTabGrowth').isDisabled(), true, 'farm growth is unavailable during a Raid');
    assert.equal(
        await M.locator('#menuTabAbilities').isDisabled(),
        true,
        'ability management is unavailable during a Raid',
    );
    await M.screenshot({
        path: path.join(OUT, 'mobile-game-menu.png'),
    });
    await M.touchscreen.tap(2, Math.floor((await M.evaluate(() => innerHeight)) / 2));
    await M.locator('#gameMenuOverlay').waitFor({
        state: 'hidden',
    });
    assert.deepEqual(
        await M.evaluate(() => ({
            units: BUDMORI.sim.units.length,
            remaining: BUDMORI.sim.raidRemaining('solo'),
        })),
        MENU_BEFORE,
        'tapping outside settings closes it without a pass-through Raid deployment',
    );
    await M.locator('#gameMenu').tap();
    await M.locator('#menuTabHelp').tap();
    await M.locator('#gameMenuClose').tap();
    await M.locator('#gameMenuOverlay').waitFor({
        state: 'hidden',
    });
    assert.deepEqual(
        await M.evaluate(() => ({
            units: BUDMORI.sim.units.length,
            remaining: BUDMORI.sim.raidRemaining('solo'),
        })),
        MENU_BEFORE,
        'closing settings by touch does not deploy a troop',
    );
    assert.equal(
        await M.evaluate(() => BUDMORI.sim.raidRoster('solo').troops.length),
        40,
        'mobile deployment uses only units present in the Farm',
    );
    await M.evaluate(() => (BUDMORI.runtime.paused = false));
    await panInput(M, 'touch');
    await buttonDeployment(M, 'touch');
    await M.waitForFunction(
        () => BUDMORI.sim.notices.some((e) => e.kind === 'drop-land'),
        {},
        {
            timeout: 8000,
        },
    );
    await M.waitForFunction(
        () => BUDMORI.sim.notices.some((e) => e.kind === 'boss-hit'),
        {},
        {
            timeout: 25000,
        },
    );
    await render(M, 'mobile-battle');
    await seedScenarios(M, 'mobile');
    await returnFromHeldInput(M, 'touch');
    await M.waitForFunction(() => BUDMORI.renderer.scene === 'farm');
    assert.deepEqual(
        await M.evaluate(() => BUDMORI.renderer.project(0, 0)),
        REPORT.pan.find((s) => s.pointerType === 'touch' && s.scene === 'farm').camera.initial.projection,
        'touch Raid return restores the Farm camera center',
    );
    await openMenuTab(M, 'growth');
    await render(M, 'mobile-growth');
    await closeMenu(M);
    await M.setViewportSize({
        width: 390,
        height: 568,
    });
    await openMenuTab(M, 'help');
    await render(M, 'mobile-short-help');
    await closeMenu(M);
    await clean(M);
    CHECK(
        '390px native touch with default world panning, dedicated deployment, airborne landing, growth, short viewport help and real GPU render',
    );
    await MOBILE.close();
}
async function panInput(p, pointerType) {
    await p.waitForFunction(() => !BUDMORI.runtime.pending.length);
    await p.evaluate(() => new Promise(requestAnimationFrame));
    assert.equal(
        await p.locator('#scatterMode, #panMode, #scatterHint, #worldInputControls').count(),
        0,
        'world dragging needs no mode controls or scatter hint',
    );
    const SCENE = await p.evaluate(() => BUDMORI.sim.scene),
        CENTER = await worldClient(p, -2, 0),
        END_POINT = { x: CENTER.x + 72, y: CENTER.y + 40 },
        SECONDARY = { x: CENTER.x + 35, y: CENTER.y - 45 },
        BEFORE = await p.evaluate(() => {
            const RUNTIME = BUDMORI.runtime,
                R = BUDMORI.renderer;
            window.panProbe = {
                queue: RUNTIME.queue,
                commands: [],
                pointerId: null,
            };
            RUNTIME.queue = function (type, args) {
                globalThis.panProbe.commands.push(type);
                return globalThis.panProbe.queue.call(this, type, args);
            };
            return {
                manual: BUDMORI.foodFeel.counts.manual,
                remaining: BUDMORI.sim.raidRemaining('solo'),
                arena: BUDMORI.CONFIG.farm.arena,
                view: [...R.view],
                aspect: R.aspect,
                removed:
                    !('scatter' in BUDMORI.CONFIG) &&
                    ![
                        'localScatter',
                        '_scatterStates',
                        'setLocalScatter',
                        'clearLocalScatter',
                        'scatterApplies',
                        'scatterInside',
                        'scatterSegmentBlocked',
                        'scatterBossBlocks',
                        'updateLocalScatter',
                        'limitScatterVelocity',
                    ].some((key) => key in BUDMORI.sim),
            };
        }),
        CAMERA = { initial: await cameraSnapshot(p) },
        CDP = pointerType === 'touch' ? await p.context().newCDPSession(p) : null;
    assert(BEFORE.removed, 'held local scatter has no runtime configuration, state or methods');
    assert.deepEqual(BEFORE.arena, { radiusX: 23, radiusY: 17 }, 'the enlarged Farm dimensions are retained');
    assert.deepEqual(
        BEFORE.view,
        SCENE === 'farm'
            ? BEFORE.aspect > 1.2
                ? [Math.max(12, 9 * BEFORE.aspect), 9]
                : [11.7, 11.7 / BEFORE.aspect]
            : BEFORE.aspect > 1.2
              ? [Math.max(26.5, 17 * BEFORE.aspect), 17]
              : [26.5, 26.5 / BEFORE.aspect],
        'default panning retains the authored scene zoom',
    );
    let touchActive = false;
    const START = async (point = CENTER) => {
        await p.evaluate(() => {
            document.querySelector('canvas').addEventListener(
                'pointerdown',
                (event) => {
                    globalThis.panProbe.pointerId = event.pointerId;
                },
                { once: true },
            );
        });
        if (CDP) {
            await CDP.send('Input.dispatchTouchEvent', {
                type: 'touchStart',
                touchPoints: [{ id: 11, ...point }],
            });
            touchActive = true;
        } else {
            await p.mouse.move(point.x, point.y);
            await p.mouse.down();
        }
        await p.waitForFunction(() =>
            document.querySelector('canvas').hasPointerCapture(globalThis.panProbe.pointerId),
        );
    };
    const MOVE = async (point) => {
        if (CDP) {
            await CDP.send('Input.dispatchTouchEvent', {
                type: 'touchMove',
                touchPoints: [{ id: 11, ...point }],
            });
        } else {
            await p.mouse.move(point.x, point.y);
        }
    };
    const END = async () => {
        if (CDP) {
            await CDP.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
            touchActive = false;
        } else {
            await p.mouse.up();
        }
        assert.equal(
            await p.evaluate(() => document.querySelector('canvas').hasPointerCapture(globalThis.panProbe.pointerId)),
            false,
            'released world pointer no longer captures input',
        );
    };
    const SEND_MOVE = (point) =>
        p.evaluate(
            ({ point, pointerType }) => {
                document.querySelector('canvas').dispatchEvent(
                    new PointerEvent('pointermove', {
                        pointerId: globalThis.panProbe.pointerId,
                        pointerType,
                        clientX: point.x,
                        clientY: point.y,
                        buttons: 1,
                        bubbles: true,
                    }),
                );
            },
            { point, pointerType },
        );
    const ASSERT_STOPPED = async (message) => {
        const STOPPED = await cameraSnapshot(p);
        await SEND_MOVE({ x: CENTER.x - 60, y: CENTER.y - 30 });
        assert.deepEqual(await cameraSnapshot(p), STOPPED, message);
    };
    try {
        await START();
        assert.deepEqual(await cameraSnapshot(p), CAMERA.initial, 'a world press alone does not move the camera');
        await MOVE(END_POINT);
        CAMERA.moved = await cameraSnapshot(p);
        const EXPECTED = {
            x: Math.max(
                CAMERA.initial.limits.minX,
                Math.min(
                    CAMERA.initial.limits.maxX,
                    CAMERA.initial.pan.x + (72 * CAMERA.initial.pixelRatio) / CAMERA.initial.scale,
                ),
            ),
            y: Math.max(
                CAMERA.initial.limits.minY,
                Math.min(
                    CAMERA.initial.limits.maxY,
                    CAMERA.initial.pan.y - (40 * CAMERA.initial.pixelRatio) / CAMERA.initial.scale,
                ),
            ),
        };
        const POINTER_TOLERANCE = CAMERA.initial.pixelRatio / CAMERA.initial.scale;
        assert(
            Math.abs(CAMERA.moved.pan.x - EXPECTED.x) <= POINTER_TOLERANCE,
            'horizontal pan follows pointer displacement',
        );
        assert(
            Math.abs(CAMERA.moved.pan.y - EXPECTED.y) <= POINTER_TOLERANCE,
            'vertical pan follows pointer displacement',
        );
        assert.equal(CAMERA.moved.scale, CAMERA.initial.scale, 'dragging never changes zoom');
        if (SCENE === 'farm') {
            assert.notDeepEqual(
                CAMERA.moved.projection,
                CAMERA.initial.projection,
                'one pointer immediately pans the Farm',
            );
        }
        const ROUND_TRIP = await p.evaluate(() => {
            const R = BUDMORI.renderer,
                PT = R.project(3, -2, 0),
                BOX = R.canvas.getBoundingClientRect();
            return R.screenToWorld(BOX.left + PT.x / R.pixelRatio, BOX.top + PT.y / R.pixelRatio);
        });
        assert(Math.hypot(ROUND_TRIP.x - 3, ROUND_TRIP.y + 2) < 1e-8, 'panned projection still inverts accurately');
        await render(p, pointerType + '-' + SCENE + '-pan-held');
        if (CDP) {
            await CDP.send('Input.dispatchTouchEvent', {
                type: 'touchStart',
                touchPoints: [
                    { id: 11, ...END_POINT },
                    { id: 22, ...SECONDARY },
                ],
            });
            await CDP.send('Input.dispatchTouchEvent', {
                type: 'touchMove',
                touchPoints: [
                    { id: 11, ...END_POINT },
                    { id: 22, x: SECONDARY.x + 20, y: SECONDARY.y },
                ],
            });
            assert.deepEqual(await cameraSnapshot(p), CAMERA.moved, 'a second finger cannot take over the held pan');
            await CDP.send('Input.dispatchTouchEvent', {
                type: 'touchEnd',
                touchPoints: [{ id: 22, x: SECONDARY.x + 20, y: SECONDARY.y }],
            });
            await CDP.send('Input.dispatchTouchEvent', {
                type: 'touchMove',
                touchPoints: [{ id: 22, x: SECONDARY.x + 35, y: SECONDARY.y + 10 }],
            });
            assert.deepEqual(await cameraSnapshot(p), CAMERA.moved, 'remaining touch cannot inherit the released pan');
        }
        await END();
        await ASSERT_STOPPED('release requires a fresh press before panning again');
        await p.evaluate(() => BUDMORI.renderer.resetPan());
        await START();
        await SEND_MOVE({ x: CENTER.x + 100000, y: CENTER.y + 100000 });
        const MAXIMUM = await cameraSnapshot(p);
        assert.deepEqual(
            MAXIMUM.pan,
            { x: MAXIMUM.limits.maxX, y: MAXIMUM.limits.minY },
            'large drag clamps at the far bounds',
        );
        await SEND_MOVE({ x: CENTER.x - 100000, y: CENTER.y - 100000 });
        const MINIMUM = await cameraSnapshot(p);
        assert.deepEqual(
            MINIMUM.pan,
            { x: MINIMUM.limits.minX, y: MINIMUM.limits.maxY },
            'reverse drag clamps at the opposite bounds',
        );
        assert(
            [MINIMUM.projection.x, MINIMUM.projection.y, MAXIMUM.projection.x, MAXIMUM.projection.y].every(
                Number.isFinite,
            ),
        );
        await END();
        await p.evaluate(() => BUDMORI.renderer.resetPan());
        await START();
        await MOVE(END_POINT);
        if (CDP) {
            await CDP.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
            touchActive = false;
        } else {
            await p.evaluate(() =>
                document.querySelector('canvas').dispatchEvent(
                    new PointerEvent('pointercancel', {
                        pointerId: globalThis.panProbe.pointerId,
                        bubbles: true,
                    }),
                ),
            );
        }
        await ASSERT_STOPPED('pointer cancellation discards the held pan');
        if (!CDP) {
            await p.mouse.up();
        }
        await p.evaluate(() => BUDMORI.renderer.resetPan());
        await START();
        // Commit pending native capture with a move before testing actual capture loss.
        await MOVE({ x: CENTER.x + 1, y: CENTER.y + 1 });
        await p.evaluate(() => BUDMORI.renderer.resetPan());
        await p.evaluate(() => document.querySelector('canvas').releasePointerCapture(globalThis.panProbe.pointerId));
        await MOVE(END_POINT);
        assert.deepEqual(await cameraSnapshot(p), CAMERA.initial, 'lost capture discards the held pan');
        await END();
        await START();
        await p.evaluate(() => window.dispatchEvent(new Event('blur')));
        await MOVE(END_POINT);
        assert.deepEqual(await cameraSnapshot(p), CAMERA.initial, 'window blur discards the held pan');
        await END();
        await START();
        await p.locator('#gameMenu').press('Enter');
        await p.locator('#gameMenuOverlay').waitFor({ state: 'visible' });
        await MOVE(END_POINT);
        assert.deepEqual(await cameraSnapshot(p), CAMERA.initial, 'opening settings immediately cancels panning');
        await closeMenu(p);
        await MOVE({ x: END_POINT.x - 25, y: END_POINT.y - 15 });
        assert.deepEqual(
            await cameraSnapshot(p),
            CAMERA.initial,
            'closing settings cannot restore a stale held pointer',
        );
        await END();
        assert.deepEqual(
            await cameraSnapshot(p),
            CAMERA.initial,
            'reset and released input restore the authored camera center',
        );
        const AFTER = await p.evaluate(() => ({
            commands: globalThis.panProbe.commands,
            manual: BUDMORI.foodFeel.counts.manual,
            remaining: BUDMORI.sim.raidRemaining('solo'),
            legacy: ['cast', 'moveTarget', 'aim'].some((key) => Object.hasOwn(BUDMORI.sim, key)),
        }));
        assert.deepEqual(
            AFTER.commands,
            [],
            'world presses and drags queue no deployment, feeding or movement commands',
        );
        assert.equal(AFTER.manual, BEFORE.manual, 'canvas holds never trigger manual feeding');
        assert.equal(AFTER.remaining, BEFORE.remaining, 'canvas holds never consume the Raid roster');
        assert.equal(AFTER.legacy, false);
        REPORT.pan ??= [];
        REPORT.pan.push({ pointerType, scene: SCENE, camera: CAMERA, minimum: MINIMUM, maximum: MAXIMUM });
        CHECK(
            pointerType +
                ' ' +
                SCENE +
                ' default pan: bounded camera, preserved zoom and projection, release/cancel/lost capture/blur/menu cleanup, no world deployment',
        );
    } finally {
        if (CDP) {
            if (touchActive) {
                await CDP.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
            }
            await CDP.detach();
        } else {
            await p.mouse.up();
        }
        await p.evaluate(() => {
            BUDMORI.runtime.queue = globalThis.panProbe.queue;
            BUDMORI.renderer.resetPan();
            delete window.panProbe;
        });
    }
}
async function combatScenarios(p) {
    // Initial-state fixtures exercise actual stepping and rendered outcomes, never force attack results.
    const EVIDENCE = await p.evaluate(() => {
        const GARDEN = BUDMORI.sim.constructor,
            RESULTS = [];
        for (const QUADRANT of [
            [1, 1],
            [-1, 1],
            [-1, -1],
            [1, -1],
        ]) {
            const W = new GARDEN(9137);
            W.setScene('raid');
            W.units = W.units.slice(0, 9);
            W.boss.x = 0;
            W.boss.y = 0;
            W.boss.hp = W.boss.maxHp = 1e6;
            for (const [I, U] of W.units.entries()) {
                U.x = QUADRANT[0] * (11 + I * 0.15);
                U.y = QUADRANT[1] * (8 + I * 0.1);
                U.vx = U.vy = U.vz = U.z = 0;
                U.hp = 1e5;
            }
            const BEFORE = {
                x: W.boss.x,
                y: W.boss.y,
            };
            let chased = false;
            let maxZ = 0;
            let hit = false;
            let basic = false;
            let land = false;
            let sweep = false;
            let prepared = false;
            let launched = false;
            let windupSafe = true;
            let uniqueHits = true;
            let lastSequence = 0;
            const HITS = new Set();
            for (let i = 0; i < 3600; i++) {
                const ACTION = W.boss.patternRuntime.active,
                    WINDUP = ACTION?.phase === 'windup';
                W.step(1 / 120);
                if (WINDUP && ACTION?.phase === 'windup') {
                    windupSafe &&= !W.notices.some(
                        (e) =>
                            e.sequence > lastSequence && e.kind === 'unit-hit' && e.attackKind?.startsWith('attack.'),
                    );
                }
                chased ||= (W.boss.x - BEFORE.x) * QUADRANT[0] > 0.25 && (W.boss.y - BEFORE.y) * QUADRANT[1] > 0.25;
                maxZ = Math.max(maxZ, ...W.units.map((u) => u.z));
                for (const E of W.notices) {
                    if (E.sequence <= lastSequence) {
                        continue;
                    }
                    lastSequence = E.sequence;
                    if (E.kind === 'unit-hit') {
                        hit = true;
                        if (E.attackKind === 'attack.front-slam') {
                            basic = true;
                        }
                        const KEY = E.attackId + ':' + E.unit;
                        uniqueHits &&= Number.isInteger(E.attackId) && E.attackId > 0 && !HITS.has(KEY);
                        HITS.add(KEY);
                    }
                    if (E.kind === 'unit-land') {
                        land = true;
                    }
                    if (E.kind === 'unit-hit' && ['attack.sweep-360', 'attack.fan-sweep'].includes(E.attackKind)) {
                        sweep = true;
                    }
                    if (E.kind === 'boss-pattern-prepare') {
                        prepared = true;
                    }
                    if (E.kind === 'boss-pattern-launch') {
                        launched = true;
                    }
                }
            }
            RESULTS.push({
                quadrant: QUADRANT,
                chased,
                maxZ,
                hit,
                basic,
                land,
                sweep,
                prepared,
                launched,
                windupSafe,
                uniqueHits,
                finite: W.units.every((u) => [u.x, u.y, u.z].every(Number.isFinite)),
            });
        }
        return RESULTS;
    });
    for (const E of EVIDENCE) {
        assert(E.chased, 'boss chases quadrant ' + E.quadrant);
        assert(
            E.prepared && E.launched && E.hit && E.basic && E.maxZ > 0.2 && E.land,
            'telegraph, contact, airborne and landing ' + E.quadrant,
        );
        assert(E.sweep, 'periodic sweep hits ' + E.quadrant);
        assert(E.windupSafe, 'windup cannot damage units ' + E.quadrant);
        assert(E.uniqueHits, 'one hit per attack and unit ' + E.quadrant);
        assert(E.finite);
    }
    REPORT.combat = EVIDENCE;
    CHECK('Four world quadrants: boss chase, telegraph, real contact, airborne landing and periodic sweep');
    const WALL = await p.evaluate(() => {
        const W = new BUDMORI.sim.constructor(773),
            G = BUDMORI.ArenaGeometry;
        W.setScene('raid');
        W.units = W.units.slice(0, 9);
        W.boss.x = 15;
        W.boss.y = 0;
        W.boss.hp = W.boss.maxHp = 1e6;
        const EDGE = G.clamp(
            {
                x: 100,
                y: 0,
            },
            'raid',
            1,
        );
        for (const [I, U] of W.units.entries()) {
            Object.assign(U, {
                x: EDGE.x - 0.1 * (I % 3),
                y: (I - 4) * 0.3,
                z: 0,
                vx: 0,
                vy: 0,
                vz: 0,
                hp: 1e5,
            });
        }
        let hit = false;
        let land = false;
        let bounded = true;
        for (let i = 0; i < 3600; i++) {
            W.step(1 / 120);
            hit ||= W.notices.some((e) => e.kind === 'unit-hit');
            land ||= W.notices.some((e) => e.kind === 'unit-land');
            bounded &&= W.units.every((u) => G.inside(u, 'raid')) && G.inside(W.boss, 'raid');
        }
        return {
            hit,
            land,
            bounded,
            edge: EDGE,
        };
    });
    assert(WALL.hit && WALL.land && WALL.bounded, 'wall contact remains inside world and lands');
    REPORT.wall = WALL;
    CHECK('Wall-near combat maintains world bounds through knockback and landing');
    const OUTCOMES = await p.evaluate(() => {
        const GARDEN = BUDMORI.sim.constructor;
        function run(kind) {
            const W = new GARDEN(818);
            W.setScene('raid');
            if (kind === 'victory') {
                W.boss.hp = 1;
            } else {
                for (const U of W.units) {
                    U.hp = 0;
                }
            }
            for (let i = 0; i < 2400 && W.encounter.outcome === 'fighting'; i++) {
                W.step(1 / 120);
            }
            return {
                outcome: W.encounter.outcome,
                running: W.running,
            };
        }
        return {
            victory: run('victory'),
            defeat: run('defeat'),
        };
    });
    assert.equal(OUTCOMES.victory.outcome, 'victory');
    assert.equal(OUTCOMES.defeat.outcome, 'defeat');
    assert.equal(OUTCOMES.victory.running, false);
    assert.equal(OUTCOMES.defeat.running, false);
    REPORT.outcomes = OUTCOMES;
    CHECK('Actual combat stepping resolves victory and defeat');
    for (const OUTCOME of ['victory', 'defeat']) {
        await p.evaluate((kind) => {
            const R = BUDMORI.runtime,
                W = new R.world.constructor(818);
            globalThis.beforeOutcomeWorld = R.world;
            if (kind === 'victory') {
                W.spawn(0, 1, 0, 0);
            }
            W.setScene('raid');
            if (kind === 'victory') {
                W.units = W.units.slice(0, 3);
                W.units.forEach((u, i) => {
                    u.hp = i === 2 ? 0 : 100000;
                    u.down = i === 2 ? 1 : 0;
                    u.z = u.vz = u.vx = u.vy = 0;
                    u.dropLanded = true;
                    u.seed = 1 + i * 1.7;
                });
                W.boss.hp = 1;
            } else {
                for (const U of W.units) {
                    U.hp = 0;
                }
            }
            for (let i = 0; i < 2400 && W.encounter.outcome === 'fighting'; i++) {
                W.step(1 / 120);
            }
            R.world = W;
            R.capturePresentation('reset');
        }, OUTCOME);
        await p.waitForFunction((kind) => BUDMORI.sim.encounter.outcome === kind, OUTCOME);
        await render(p, 'pc-' + OUTCOME);
        if (OUTCOME === 'victory') {
            await p.waitForFunction(() => {
                const W = BUDMORI.sim,
                    R = BUDMORI.renderer;
                return (
                    W.units
                        .filter((u) => u.hp > 0)
                        .every(
                            (u) =>
                                R.vectorPlayers.get(u.id)?.currentClip === 'victory' &&
                                R.vectorPlayers.get(u.id)?.currentExpression === 'happy',
                        ) &&
                    W.units
                        .filter((u) => u.hp <= 0)
                        .every(
                            (u) =>
                                R.vectorPlayers.get(u.id)?.currentClip === 'sleep' &&
                                R.vectorPlayers.get(u.id)?.currentExpression === 'sleep',
                        )
                );
            });
            const VICTORY = await p.evaluate(() => {
                const R = BUDMORI.renderer,
                    W = BUDMORI.sim;
                return {
                    living: W.units
                        .filter((u) => u.hp > 0)
                        .map((u) => R.vectorPlayers.get(u.id).getPartPose('body').transform),
                    dead: W.units.filter((u) => u.hp <= 0).map((u) => R.vectorPlayers.get(u.id).currentClip),
                };
            });
            assert(
                VICTORY.living.length >= 2 && new Set(VICTORY.living.map((pose) => JSON.stringify(pose))).size > 1,
                'living winners use per-unit staggered SVG bounce phases',
            );
            assert.deepEqual(VICTORY.dead, ['sleep'], 'downed troop keeps its sleep clip after victory');
            REPORT.victoryAnimation = VICTORY;
        }
        await p.locator('#return').click();
        await p.waitForFunction(() => BUDMORI.sim.scene === 'farm');
        assert(
            await p.evaluate(() => BUDMORI.sim.units.every((u) => u.hp > 0 && u.down === 0)),
            'farm return restores army after ' + OUTCOME,
        );
        await p.evaluate(() => {
            BUDMORI.runtime.world = globalThis.beforeOutcomeWorld;
            BUDMORI.runtime.capturePresentation('reset');
        });
    }
    CHECK('Victory and defeat render in product; native return restores farm army');
}
async function seedScenarios(p, label) {
    const POSES = ['idle', 'windup', 'active', 'recover'];
    const SPECIES_COUNT = await p.evaluate(() => BUDMORI.CONFIG.unit.speciesCount);
    const ASSETS = await p.evaluate(() =>
        [...BUDMORI.renderer.vectorAssets].map(([species, record]) => ({
            species,
            clips: Object.keys(record.compiled.metadata.clips),
            expressions: Object.keys(record.compiled.metadata.expressions),
        })),
    );
    assert.equal(ASSETS.length, SPECIES_COUNT, 'all registered troop species use compiled SVG assets');
    assert.deepEqual(
        ASSETS.map((a) => a.species),
        Array.from(
            {
                length: SPECIES_COUNT,
            },
            (_, index) => index,
        ),
        'every persistent species ID has one source vector asset',
    );
    assert(
        ASSETS.every(
            (a) =>
                ['idle', 'walk', 'windup', 'fire', 'recover', 'hit', 'airborne', 'landing', 'death', 'victory'].every(
                    (name) => a.clips.includes(name),
                ) &&
                ['neutral', 'happy', 'focused', 'attack', 'surprised', 'hurt', 'hungry', 'dead'].every((name) =>
                    a.expressions.includes(name),
                ),
        ),
    );
    REPORT.vectorSpecies = ASSETS;
    const VECTOR_QUALITY = await p.evaluate(() =>
        [...BUDMORI.renderer.vectorAssets].map(([species, troop]) => {
            const BOSS = BUDMORI.renderer.bossAssets.get(species === 3 ? 'chestnut' : `species-${species}`),
                QUALITY = (record) => ({
                    curveSegments: record?.compiled.compilerOptions.curveSegments,
                    strokeArcDivisions: record?.compiled.compilerOptions.strokeArcDivisions,
                });
            return {
                species,
                troop: QUALITY(troop),
                boss: QUALITY(BOSS),
                separate: !!BOSS && BOSS.compiled !== troop.compiled,
                source: BOSS?.compiled.sourcePath,
                sameSource: BOSS?.compiled.sourceSha256 === troop.compiled.sourceSha256,
            };
        }),
    );
    for (const PROFILE of VECTOR_QUALITY) {
        assert.deepEqual(
            PROFILE.troop,
            {
                curveSegments: 2,
                strokeArcDivisions: 2,
            },
            'small troop quality stays 2/2',
        );
        assert.deepEqual(
            PROFILE.boss,
            {
                curveSegments: 4,
                strokeArcDivisions: 2,
            },
            `giant species ${PROFILE.species} uses 4/2`,
        );
        assert(PROFILE.separate, 'giants cannot reuse a low-quality troop compiled record');
        if (PROFILE.species === 3) {
            assert.equal(PROFILE.source, 'assets/bosses/chestnut.svg');
        } else {
            assert(PROFILE.sameSource, 'shared giant artwork keeps the same original SVG');
        }
    }
    REPORT.vectorQuality = VECTOR_QUALITY;
    CHECK(
        'All nine giant SVGs use separate startup-compiled 4/2 meshes; troops remain 2/2 and chestnut retains its dedicated art',
    );
    await p.evaluate(() => {
        globalThis.seedOriginal = {
            world: BUDMORI.runtime.world,
            paused: BUDMORI.runtime.paused,
        };
        BUDMORI.runtime.paused = true;
    });
    try {
        for (const SCENE of ['farm', 'raid']) {
            await p.evaluate((scene) => {
                const R = BUDMORI.runtime,
                    W = new R.world.constructor(623);
                W.units = [];
                W.food = [];
                W.effects = [];
                W.projectiles = [];
                W.playerProgression.level = 6;
                W.playerProgression.farmUpgrades.capacity = 5;
                W.setScene(scene);
                W.time = 1.25;
                if (scene === 'raid') {
                    W.boss.x = 14;
                    W.boss.y = 8;
                }
                for (let species = 0; species < BUDMORI.CONFIG.unit.speciesCount; species++) {
                    for (let tier = 1; tier <= 6; tier++) {
                        const U = W.spawn(
                            species,
                            tier,
                            (tier - 3.5) * 2.3,
                            (species - (BUDMORI.CONFIG.unit.speciesCount - 1) / 2) * 2,
                        );
                        Object.assign(U, {
                            meals: 3,
                            growth: 3,
                            angle: Math.PI * 0.15,
                            z: 0,
                            vx: 0,
                            vy: 0,
                            vz: 0,
                        });
                    }
                }
                R.world = W;
                R.capturePresentation('reset');
            }, SCENE);
            for (const PHASE of POSES) {
                await p.evaluate((phase) => {
                    for (const U of BUDMORI.sim.units) {
                        U.ability.phase = phase;
                        U.ability.elapsed = phase === 'idle' ? 0 : 0.12;
                    }
                    BUDMORI.runtime.capturePresentation('reset');
                }, PHASE);
                await p.evaluate(() => new Promise(requestAnimationFrame));
                await render(p, label + '-seed-' + SCENE + '-' + PHASE);
                const NATIVE = await p.evaluate(() => ({
                    players: BUDMORI.renderer.vectorPlayers.size,
                    clips: [...BUDMORI.renderer.vectorPlayers.values()].map((v) => v.currentClip),
                    time: BUDMORI.renderer.displayTimeMs,
                }));
                assert.equal(
                    NATIVE.players,
                    SPECIES_COUNT * 6,
                    'all registered species/tier combinations render through native vector players',
                );
                assert(
                    NATIVE.clips.every(
                        (clip) =>
                            clip ===
                            {
                                idle: 'idle',
                                windup: 'windup',
                                active: 'fire',
                                recover: 'recover',
                            }[PHASE],
                    ),
                );
                assert(NATIVE.time > 0);
                const VISIBLE = await p.evaluate(() => {
                    const R = BUDMORI.renderer;
                    return BUDMORI.sim.units.map((u) => {
                        const Q = R.project(u.x, u.y, u.z),
                            D = R.pixelRatio;
                        return {
                            species: u.species,
                            tier: u.tier,
                            radius: u.radius,
                            x: Q.x / D,
                            y: Q.y / D,
                            visible: Q.x >= 0 && Q.y >= 0 && Q.x < R.canvas.width && Q.y < R.canvas.height,
                        };
                    });
                });
                assert(
                    VISIBLE.every((u) => u.visible),
                    'seed grid inside actual ' + SCENE + ' viewport',
                );
                REPORT.seedGrid ??= [];
                REPORT.seedGrid.push({
                    label,
                    scene: SCENE,
                    phase: PHASE,
                    units: VISIBLE,
                });
            }
            if (SCENE === 'farm') {
                const MERGE_SETUP = await p.evaluate(() => {
                    const R = BUDMORI.runtime,
                        W = new R.world.constructor(964);
                    W.units = [];
                    W.food = [];
                    W.effects = [];
                    W.projectiles = [];
                    W.nextId = 900000000;
                    W.mode = 'merge';
                    W.spawn(0, 5, 0, 0);
                    W.spawn(0, 5, 0.08, 0);
                    W.spawn(0, 5, 0.16, 0);
                    W.spawn(0, 5, 0.24, 0);
                    W.spawn(0, 5, 0.32, 0);
                    W.spawn(0, 5, 8, 0);
                    for (const UNIT of W.units) {
                        UNIT.growth = 3;
                        UNIT.growthElapsed = UNIT.growthDuration;
                        UNIT.meals = 1;
                        UNIT.cooldown = 0;
                        UNIT.vx = UNIT.vy = UNIT.vz = 0;
                        UNIT.z = 0;
                    }
                    W.selectMergeTask();
                    const IDS = [...W.mergeTask.materialIds];
                    IDS.map((id) => W.units.find((unit) => unit.id === id)).forEach((unit, index) => {
                        unit.x = index * 0.04;
                        unit.y = 0;
                    });
                    if (!W.resolveMergeTaskAfterMovement()) {
                        throw Error('configured five-material Mythic grade merge did not begin');
                    }
                    const OUTPUT = W.units.find((unit) => unit.tier === 6);
                    R.world = W;
                    BUDMORI.renderer.vectorPlayers.clear();
                    R.capturePresentation('reset');
                    return {
                        resultId: OUTPUT.id,
                        resultTier: OUTPUT.tier,
                        materials: IDS.length,
                        delays: W.effects
                            .filter((effect) => effect.kind === 'merge-material')
                            .map((effect) => effect.delay),
                        phase: W.mergeTask.phase,
                    };
                });
                assert.equal(MERGE_SETUP.resultTier, 6, 'five T5 materials create a T6 Mythic');
                assert.equal(MERGE_SETUP.materials, 5);
                assert.equal(MERGE_SETUP.delays.length, 5);
                assert.equal(MERGE_SETUP.phase, 'animation');
                assert(
                    MERGE_SETUP.delays[0] < MERGE_SETUP.delays[1] &&
                        MERGE_SETUP.delays[1] < MERGE_SETUP.delays[2] &&
                        MERGE_SETUP.delays[2] < MERGE_SETUP.delays[3] &&
                        MERGE_SETUP.delays[3] < MERGE_SETUP.delays[4],
                    'five merge particles are staggered in source order',
                );
                const PRESENTED_SEQUENCE = await p.evaluate(() => {
                    const VIEW = BUDMORI.runtime.presentation(performance.now());
                    const MATERIALS = VIEW.effects
                        .filter((effect) => effect.kind === 'merge-material')
                        .map(({ x, y, targetX, targetY, delay, span, sequenceIndex, sequenceCount }) => ({
                            x,
                            y,
                            targetX,
                            targetY,
                            delay,
                            span,
                            sequenceIndex,
                            sequenceCount,
                        }));
                    const RESULT = VIEW.effects.find((effect) => effect.kind === 'merge');
                    return {
                        materials: MATERIALS,
                        result: RESULT && {
                            delay: RESULT.delay,
                            span: RESULT.span,
                        },
                    };
                });
                assert.equal(
                    PRESENTED_SEQUENCE.materials.length,
                    5,
                    'all five material travel effects reach the presentation snapshot',
                );
                assert(
                    PRESENTED_SEQUENCE.materials.every(
                        (effect, index) =>
                            Number.isFinite(effect.targetX) &&
                            Number.isFinite(effect.targetY) &&
                            Number.isFinite(effect.delay) &&
                            Number.isFinite(effect.span) &&
                            effect.span > 0 &&
                            effect.sequenceIndex === index &&
                            effect.sequenceCount === 5,
                    ),
                    'presentation preserves all five material targets, durations, and sequence indexes',
                );
                assert(
                    Number.isFinite(PRESENTED_SEQUENCE.result?.delay) &&
                        Number.isFinite(PRESENTED_SEQUENCE.result?.span) &&
                        PRESENTED_SEQUENCE.result.delay > PRESENTED_SEQUENCE.materials.at(-1).delay,
                    'result burst is delayed until after all material paths',
                );
                await p.evaluate(() => new Promise(requestAnimationFrame));
                await render(p, label + '-grade-merge-start');
                const START_HIDDEN = await p.evaluate(
                    (id) => !BUDMORI.renderer.vectorPlayers.has(id),
                    MERGE_SETUP.resultId,
                );
                assert(START_HIDDEN, 'result stays hidden while material travel starts');
                await p.evaluate(() => {
                    BUDMORI.sim.step(0.3);
                    BUDMORI.runtime.capturePresentation('reset');
                });
                await render(p, label + '-grade-merge-sequence');
                const MIDDLE = await p.evaluate(
                    (id) => ({
                        hidden: !BUDMORI.renderer.vectorPlayers.has(id),
                        phase: BUDMORI.sim.mergeTask?.phase,
                        active: BUDMORI.sim.effects.filter((effect) => effect.kind === 'merge-material').length,
                    }),
                    MERGE_SETUP.resultId,
                );
                assert(
                    MIDDLE.hidden && MIDDLE.phase === 'animation' && MIDDLE.active > 0,
                    'intermediate material travel renders before the output',
                );
                await p.evaluate(() => {
                    BUDMORI.sim.step(0.6);
                    BUDMORI.runtime.capturePresentation('reset');
                });
                await render(p, label + '-grade-merge-result');
                assert(
                    await p.evaluate((id) => BUDMORI.renderer.vectorPlayers.has(id), MERGE_SETUP.resultId),
                    'result unit appears after the sequential merge animation',
                );
            }
            if (SCENE === 'raid') {
                await p.evaluate(() => {
                    for (const U of BUDMORI.sim.units) {
                        U.hp = 0;
                        U.down = 1;
                        U.ability.phase = 'recover';
                        U.z = 0;
                        U.vx = U.vy = U.vz = 0;
                    }
                    BUDMORI.runtime.capturePresentation('reset');
                });
                await p.evaluate(() => new Promise(requestAnimationFrame));
                await render(p, label + '-seed-corpses');
            }
        }
    } finally {
        await p.evaluate(() => {
            const R = BUDMORI.runtime;
            R.world = globalThis.seedOriginal.world;
            R.paused = globalThis.seedOriginal.paused;
            R.capturePresentation('reset');
        });
    }
    CHECK(
        label +
            ' ' +
            SPECIES_COUNT +
            ' registered species × tiers1–6 × four attack poses plus five-material Mythic animation',
    );
}
async function armyScenarios(p) {
    const EVIDENCE = await p.evaluate(() => {
        const GARDEN = BUDMORI.sim.constructor,
            SPECS = BUDMORI.ATTACK_TYPES;
        const TARGET = (species, x) => {
            const W = new GARDEN(501);
            W.units = [];
            W.spawn(species, 1, x, 0);
            W.setScene('raid');
            Object.assign(W.units[0], {
                x,
                y: 0,
                z: 0,
                vx: 0,
                vy: 0,
                vz: 0,
            });
            W.boss.hp = W.boss.maxHp = 1e6;
            return W;
        };
        const RANGES = [];
        for (let species = 0; species < BUDMORI.CONFIG.unit.speciesCount; species++) {
            const INITIAL = 4.4 + SPECS[species].range + 3,
                W = TARGET(species, INITIAL),
                U = W.units[0];
            let prepare = null;
            for (let i = 0; i < 1800 && !prepare; i++) {
                W.step(1 / 120);
                prepare = W.combatLog.find((e) => e.kind === 'prepare');
            }
            const DISTANCE = prepare ? Math.hypot(prepare.x - W.boss.x, prepare.y - W.boss.y) : null;
            let minDistance = Math.hypot(U.x, U.y);
            let lateral = 0;
            for (let i = 0; i < 600; i++) {
                W.step(1 / 120);
                minDistance = Math.min(minDistance, Math.hypot(U.x, U.y));
                lateral = Math.max(lateral, Math.abs(U.y));
            }
            RANGES.push({
                species,
                distance: DISTANCE,
                stand: W.boss.radius + SPECS[species].range,
                minDistance,
                lateral,
                damaged: W.boss.hp < W.boss.maxHp,
            });
        }
        const CLOSE = TARGET(1, 5.1),
            LOB = CLOSE.units[0];
        for (let i = 0; i < 1800 && !CLOSE.combatLog.some((e) => e.kind === 'prepare'); i++) {
            CLOSE.step(1 / 120);
        }
        const PREP = CLOSE.combatLog.find((e) => e.kind === 'prepare');
        const RETREAT = {
            distance: PREP ? Math.hypot(PREP.x, PREP.y) : null,
            stand: CLOSE.boss.radius + SPECS[1].range,
            x: LOB.x,
        };
        const W = new GARDEN(829);
        W.units = [];
        const DEAD = W.spawn(0, 1, 5, 0),
            ALIVE = W.spawn(1, 1, 12, 0);
        W.setScene('raid');
        Object.assign(DEAD, {
            x: 5,
            y: 0,
            hp: 8,
            z: 0,
            vx: 0,
            vy: 0,
            vz: 0,
        });
        Object.assign(ALIVE, {
            x: 12,
            y: 0,
            hp: 1e5,
            z: 0,
            vx: 0,
            vy: 0,
            vz: 0,
        });
        let airborne = false;
        let landed = false;
        for (let i = 0; i < 1800; i++) {
            W.step(1 / 120);
            if (DEAD.hp === 0 && DEAD.z > 0.1) {
                airborne = true;
            }
            if (DEAD.hp === 0 && W.notices.some((e) => e.kind === 'unit-land' && e.unit === DEAD.id)) {
                landed = true;
            }
        }
        const CORPSE = {
            dead: DEAD.hp === 0,
            airborne,
            landed,
            z: DEAD.z,
        };
        // Explicit overlap fixture: a settled corpse cannot be displaced by a boss or live unit.
        const AT = {
            x: DEAD.x,
            y: DEAD.y,
        };
        Object.assign(W.boss, {
            x: DEAD.x,
            y: DEAD.y,
        });
        Object.assign(ALIVE, {
            x: DEAD.x + 0.01,
            y: DEAD.y,
            z: 0,
            vx: 0,
            vy: 0,
            vz: 0,
        });
        for (let i = 0; i < 240; i++) {
            W.step(1 / 120);
        }
        CORPSE.drift = Math.hypot(DEAD.x - AT.x, DEAD.y - AT.y);
        W.beginBossPattern('attack.front-slam', DEAD);
        W.step(1 / 120);
        CORPSE.retargeted = W.boss.patternRuntime.active?.targetId !== DEAD.id;
        W.setScene('farm');
        CORPSE.recovered = W.units.every((u) => u.hp > 0 && u.down === 0 && u.z === 0);
        const H = new GARDEN(307);
        H.units = [];
        for (let tier = 1; tier <= 3; tier++) {
            H.spawn(tier - 1, tier, (tier - 2) * 6, 0);
        }
        H.setScene('raid');
        const MAX = H.units.reduce((n, u) => n + u.hp, 0);
        H.units[0].hp = 0;
        H.units[1].hp = 0;
        H.units[2].hp = 17;
        const BEFORE = {
                ...H.armyHealth,
            },
            COUNT = H.units.length;
        H.starter = 59.99;
        H.step(0.02);
        const AFTER = {
                ...H.armyHealth,
            },
            SPAWNED = H.units.length - COUNT;
        return {
            ranges: RANGES,
            retreat: RETREAT,
            corpse: CORPSE,
            health: {
                max: MAX,
                before: BEFORE,
                after: AFTER,
                spawned: SPAWNED,
            },
        };
    });
    for (const R of EVIDENCE.ranges) {
        assert(
            R.distance !== null && Math.abs(R.distance - R.stand) <= 0.65,
            'species ' + R.species + ' attacks within own range',
        );
        assert(R.damaged, 'species ' + R.species + ' real impact');
        assert(R.lateral < 0.15, 'species ' + R.species + ' has no forced rotating slot');
        if (R.species === 1) {
            assert(R.minDistance >= R.stand - 0.65, 'lob holds firing range');
        }
    }
    assert(
        EVIDENCE.retreat.distance !== null &&
            EVIDENCE.retreat.distance >= EVIDENCE.retreat.stand - 0.65 &&
            EVIDENCE.retreat.x > 5.1,
        'close lob retreats before firing',
    );
    const CORPSE = EVIDENCE.corpse;
    assert(
        CORPSE.dead && CORPSE.airborne && CORPSE.landed && CORPSE.z === 0,
        'lethal hit corpse completes airborne landing',
    );
    assert(CORPSE.drift < 0.05, 'settled corpse remains at landing under body overlap');
    assert(CORPSE.retargeted && CORPSE.recovered, 'corpse excluded from targets and restored on return');
    const H = EVIDENCE.health;
    assert.deepEqual(H.before, {
        current: 17,
        max: H.max,
        living: 1,
        total: 3,
    });
    assert.equal(H.after.max, H.max);
    assert.equal(H.after.current, 17);
    assert.equal(H.after.total, 3);
    assert.equal(H.after.living, 1);
    assert.equal(H.spawned, 0);
    REPORT.army = EVIDENCE;
    const WAS_PAUSED = await p.evaluate(() => {
        const R = BUDMORI.runtime,
            PAUSED = R.paused;
        R.paused = true;
        return PAUSED;
    });
    const HUD = await p.evaluate(async () => {
        const R = BUDMORI.renderer,
            DRAW = R.render;
        let display = null;
        R.render = function (view, ...args) {
            display = view;
            return DRAW.call(this, view, ...args);
        };
        try {
            await new Promise(requestAnimationFrame);
        } finally {
            R.render = DRAW;
        }
        if (!display) {
            throw Error('Rendered view was not captured');
        }
        const ARMY = display.units.reduce(
            (sum, u) => ({
                current: sum.current + Math.max(0, Math.min(u.maxHp, u.hp)),
                max: sum.max + u.maxHp,
                living: sum.living + (u.hp > 0 ? 1 : 0),
                total: sum.total + 1,
            }),
            {
                current: 0,
                max: 0,
                living: 0,
                total: 0,
            },
        );
        return {
            rawArmy: BUDMORI.sim.armyHealth,
            army: ARMY,
            boss: display.boss.hp,
            text: document.querySelector('#allyHealthText').textContent,
            bossText: document.querySelector('#bossHealthText').textContent,
            bar: document.querySelector('#allyHealth').parentElement.getBoundingClientRect().width,
            now: Number(document.querySelector('#allyHealth').getAttribute('aria-valuenow')),
            max: Number(document.querySelector('#allyHealth').getAttribute('aria-valuemax')),
        };
    });
    await p.evaluate((paused) => {
        BUDMORI.runtime.paused = paused;
    }, WAS_PAUSED);
    assert(HUD.bar > 0);
    assert.equal(HUD.now, HUD.army.current);
    assert.equal(HUD.max, HUD.army.max);
    assert(
        HUD.text.includes(String(Math.ceil(HUD.army.current))) && HUD.text.includes(String(Math.ceil(HUD.army.max))),
    );
    assert(HUD.bossText.includes(String(Math.ceil(HUD.boss))));
    CHECK(
        'Species hold actual firing range; corpses land, stay nonblocking, leave targets and recover; health HUD matches the same sampled display time, distinct from live simulation health',
    );
}
async function victory() {
    const C = await browser.newContext({
            viewport: {
                width: 390,
                height: 844,
            },
            deviceScaleFactor: 3,
            isMobile: true,
            hasTouch: true,
        }),
        P = await open(C);
    await P.locator('#newGame').tap();
    await P.evaluate(() => {
        const SEED = 4463;
        BUDMORI.sim.seed = SEED;
        BUDMORI.sim.rng = new globalThis.BloomGamekitDeterministic.SeededPRNG(SEED);
    });
    await P.waitForFunction(
        () => BUDMORI.sim.scene === 'farm' && BUDMORI.sim.units.length === 2 && BUDMORI.runtime.tick > 5,
        {},
        {
            timeout: 20000,
        },
    );
    const START = await P.evaluate(() => ({
        units: BUDMORI.sim.units.map((u) => ({
            species: u.species,
            tier: u.tier,
            mature: u.mature,
            meals: u.meals,
        })),
        width: innerWidth,
        height: innerHeight,
        overflow: document.documentElement.scrollWidth > innerWidth,
    }));
    assert.equal(START.units.length, 2);
    assert(START.units.every((u) => u.species === 0 && u.tier === 1 && u.mature && u.meals === 0));
    assert.equal(START.width, 390);
    assert.equal(START.height, 844);
    assert.equal(START.overflow, false);
    const SETUP = await P.evaluate(() => {
        const R = BUDMORI.runtime,
            W = new R.world.constructor(818);
        globalThis.beforeVictoryWorld = R.world;
        W.spawn(0, 1, 0, 0);
        W.setScene('raid');
        W.units = W.units.slice(0, 3);
        W.units.forEach((u, i) => {
            u.hp = i === 2 ? 0 : 100000;
            u.down = i === 2 ? 1 : 0;
            u.z = u.vz = u.vx = u.vy = 0;
            u.dropLanded = true;
            u.seed = 1 + i * 1.7;
        });
        const ROSTER = W.raidRoster('solo');
        ROSTER.lastDeploySequence = ROSTER.troops.filter((t) => t.deployed).length;
        W.boss.hp = 1;
        for (let i = 0; i < 2400 && W.encounter.outcome === 'fighting'; i++) {
            W.step(1 / 120);
        }
        R.world = W;
        R.capturePresentation('reset');
        return {
            outcome: W.encounter.outcome,
            remaining: W.raidRemaining('solo'),
            sequence: ROSTER.lastDeploySequence,
        };
    });
    assert.equal(SETUP.outcome, 'victory');
    assert.equal(SETUP.remaining, 0);
    assert.equal(SETUP.sequence, 3, 'the synthetic victory battle has a valid deployed roster sequence');
    await P.waitForFunction(
        () =>
            BUDMORI.sim.units
                .filter((u) => u.hp > 0)
                .every(
                    (u) =>
                        BUDMORI.renderer.vectorPlayers.get(u.id)?.currentClip === 'victory' &&
                        BUDMORI.renderer.vectorPlayers.get(u.id)?.currentExpression === 'happy',
                ) &&
            BUDMORI.sim.units
                .filter((u) => u.hp <= 0)
                .every(
                    (u) =>
                        BUDMORI.renderer.vectorPlayers.get(u.id)?.currentClip === 'death' &&
                        BUDMORI.renderer.vectorPlayers.get(u.id)?.currentExpression === 'dead',
                ),
        {},
        {
            timeout: 15000,
        },
    );
    const VICTORY = await P.evaluate(() => ({
        outcome: BUDMORI.sim.encounter.outcome,
        units: BUDMORI.sim.units.map((u) => ({
            hp: u.hp,
            clip: BUDMORI.renderer.vectorPlayers.get(u.id)?.currentClip,
            expression: BUDMORI.renderer.vectorPlayers.get(u.id)?.currentExpression,
        })),
        remainingText: document.querySelector('#raidRemaining').textContent,
        errorVisible: !document.querySelector('#error').hidden,
    }));
    assert.equal(VICTORY.outcome, 'victory');
    assert.equal(VICTORY.units.filter((u) => u.hp > 0).length, 2);
    assert.deepEqual(
        VICTORY.units.filter((u) => u.hp <= 0).map((u) => u.clip),
        ['death'],
    );
    assert(!VICTORY.remainingText.includes('NaN'));
    assert.equal(VICTORY.errorVisible, false);
    await P.screenshot({
        path: path.join(OUT, 'mobile-victory.png'),
    });
    await P.locator('#return').tap();
    await P.waitForFunction(
        () => BUDMORI.sim.scene === 'farm',
        {},
        {
            timeout: 15000,
        },
    );
    const RETURNED = await P.evaluate(() => ({
        count: BUDMORI.sim.units.length,
        alive: BUDMORI.sim.units.every((u) => u.hp > 0 && u.down === 0),
    }));
    assert.equal(RETURNED.count, 2);
    assert.equal(RETURNED.alive, true);
    await clean(P);
    await C.close();
    REPORT.victory = {
        start: START,
        setup: SETUP,
        victory: VICTORY,
        returned: RETURNED,
    };
    CHECK(
        'Mobile farm starts with two peas; victory/death animations render; battle return restores the two-unit farm',
    );
}
async function save() {
    const C = await browser.newContext({
        viewport: {
            width: 1280,
            height: 800,
        },
    });
    await C.addInitScript(() =>
        localStorage.setItem(
            'bloom-weapon-cards-v3',
            JSON.stringify({
                productVersion: '0.3.0',
                compatibility: '0.3',
                world: {
                    army: ['preserve-me'],
                    cast: null,
                    moveTarget: null,
                },
            }),
        ),
    );
    const P = await open(C),
        OLD = await P.evaluate(() => localStorage.getItem('bloom-weapon-cards-v3'));
    assert(await P.locator('#continueGame').isDisabled());
    assert((await P.locator('#saveNotice').textContent()).includes('호환'));
    await P.waitForTimeout(500);
    assert.equal(await P.evaluate(() => localStorage.getItem('bloom-weapon-cards-v3')), OLD);
    await P.goto(BASE + '/#/raid');
    await P.waitForFunction(() => window.BUDMORI);
    assert(await P.locator('#startScreen').isVisible());
    assert.equal(await P.evaluate(() => localStorage.getItem('bloom-weapon-cards-v3')), OLD);
    CHECK('Incompatible save with direct raid route redirects home and retains original bytes');
    const DOWNLOAD = P.waitForEvent('download');
    await P.locator('#exportSave').click();
    const D = await DOWNLOAD,
        RAW = await readFile(await D.path(), 'utf8');
    assert.equal(RAW, OLD);
    CHECK('Incompatible existing save is retained unchanged and exported byte-for-byte');
    await P.locator('#newGame').click();
    assert.equal(await P.evaluate(() => localStorage.getItem('bloom-weapon-cards-v3')), OLD);
    await P.locator('#cancelNew').click();
    assert.equal(await P.evaluate(() => localStorage.getItem('bloom-weapon-cards-v3')), OLD);
    await P.locator('#newGame').click();
    await P.locator('#confirmNew').click();
    await P.evaluate(() => {
        const SEED = 4463;
        BUDMORI.sim.seed = SEED;
        BUDMORI.sim.rng = new globalThis.BloomGamekitDeterministic.SeededPRNG(SEED);
    });
    await P.waitForFunction(() => BUDMORI.runtime.tick > 3);
    await goHome(P);
    const VALID = await P.evaluate(() => localStorage.getItem('bloom-weapon-cards-v4'));
    assert.equal(JSON.parse(VALID).productVersion, PRODUCT_VERSION);
    CHECK('Only explicit new-garden confirmation replaces the incompatible save');
    await P.locator('#saveFile').setInputFiles({
        name: 'invalid.json',
        mimeType: 'application/json',
        buffer: Buffer.from('{"progress":{}}'),
    });
    assert.equal(await P.evaluate(() => localStorage.getItem('bloom-weapon-cards-v4')), VALID);
    const MALFORMED = JSON.parse(VALID);
    MALFORMED.progress.roster[0].count = -1;
    await P.locator('#saveFile').setInputFiles({
        name: 'invalid-progress.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify(MALFORMED)),
    });
    assert.equal(
        await P.evaluate(() => localStorage.getItem('bloom-weapon-cards-v4')),
        VALID,
        'invalid compact progress cannot overwrite a valid save',
    );
    await P.locator('#saveFile').setInputFiles({
        name: 'valid.json',
        mimeType: 'application/json',
        buffer: Buffer.from(VALID),
    });
    await P.locator('#cancelImport').click();
    assert.equal(await P.evaluate(() => localStorage.getItem('bloom-weapon-cards-v4')), VALID);
    await P.locator('#saveFile').setInputFiles({
        name: 'valid.json',
        mimeType: 'application/json',
        buffer: Buffer.from(VALID),
    });
    await P.locator('#confirmImport').click();
    await P.locator('#continueGame').click();
    await goHome(P);
    CHECK('Compact save import/export retains the supported progress envelope');
    const BEFORE_LEGACY = await P.evaluate(() => localStorage.getItem('bloom-weapon-cards-v4')),
        PRIOR = await P.evaluate(async () => {
            const { snapshot: SNAPSHOT } = await import('/src/farm-state.js');
            const WORLD = new BUDMORI.sim.constructor(667);
            WORLD.playerProgression.level = 6;
            WORLD.playerProgression.experience = 37;
            WORLD.playerProgression.farmUpgrades.capacity = 5;
            while (WORLD.units.length < 100) {
                const UNIT = WORLD.spawn(0, 1, 0, 0);
                UNIT.growthDuration = WORLD.breedGrowthDuration();
                UNIT.growthElapsed = UNIT.growthDuration;
                UNIT.growth = BUDMORI.CONFIG.farm.breeding.matureMeals;
            }
            // Old free-capacity progression may leave an owned roster above
            // today's cap. Import must preserve it and still permit merging.
            WORLD.playerProgression.farmUpgrades.capacity = 0;
            WORLD.playerProgression.availablePoints = 5;
            return {
                schema: 'budmori-farm',
                productVersion: '0.4.0',
                world: SNAPSHOT(WORLD),
            };
        });
    await P.locator('#saveFile').setInputFiles({
        name: 'prior-0.4.0.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify(PRIOR)),
    });
    await P.locator('#cancelImport').click();
    assert.equal(
        await P.evaluate(() => localStorage.getItem('bloom-weapon-cards-v4')),
        BEFORE_LEGACY,
        'cancelled legacy migration keeps the compact source save',
    );
    await P.locator('#saveFile').setInputFiles({
        name: 'prior-0.4.0.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify(PRIOR)),
    });
    await P.locator('#confirmImport').click();
    await P.locator('#continueGame').click();
    const RESUMED = await P.evaluate(() => {
        BUDMORI.runtime.paused = true;
        return BUDMORI.sim.units.map((u) => [u.species, u.tier]);
    });
    assert.deepEqual(
        RESUMED.sort(),
        PRIOR.world.units.map((u) => [u.species, u.tier]).sort(),
        'compatible legacy import preserves the species/tier roster',
    );
    assert.equal(
        await P.evaluate(() => JSON.parse(localStorage.getItem('bloom-weapon-cards-v4')).productVersion),
        PRODUCT_VERSION,
    );
    CHECK('Compatible 0.4.0 save resumes as compact progress under ' + PRODUCT_VERSION);
    await P.evaluate(() => {
        BUDMORI.runtime.paused = false;
    });
    await P.locator('#merge').click();
    await P.waitForFunction(() => BUDMORI.sim.metrics.merges > 0);
    await goHome(P);
    const AFTER_MERGE = await P.evaluate(() => JSON.parse(localStorage.getItem('bloom-weapon-cards-v4')).progress);
    assert.equal(AFTER_MERGE.player.experience, 37);
    assert.equal(AFTER_MERGE.player.availablePoints, 5);
    assert.equal(
        AFTER_MERGE.roster.reduce((total, row) => total + row.count * [0, 1, 2, 4, 12, 48, 240][row.tier], 0),
        100,
        'merging consumes only its materials and preserves all other owned units',
    );
    await P.reload();
    await P.waitForFunction(() => window.BUDMORI);
    await P.locator('#continueGame').click();
    await P.waitForFunction(() => BUDMORI.runtime.tick > 3);
    CHECK('Above-capacity legacy roster merges, saves and continues from compact progress without losing XP or units');
    await clean(P);
    CHECK('Malformed import and cancelled compact/legacy imports preserve save; explicit valid import resumes');
    await C.close();
}
async function migration() {
    const C = await browser.newContext({
            viewport: {
                width: 390,
                height: 844,
            },
            deviceScaleFactor: 3,
            isMobile: true,
            hasTouch: true,
        }),
        P = await open(C);
    await P.evaluate(async () => {
        const { snapshot: SNAPSHOT } = await import('/src/farm-state.js'),
            OLD = {
                schema: 'budmori-farm',
                productVersion: '0.4.7',
                world: SNAPSHOT(new BUDMORI.sim.constructor()),
            };
        for (const KEY of [
            'farmBossEvent',
            'nextBossEncounterId',
            'bossRewardReceipts',
            'bossRewardWatermarks',
            'playerProgression',
        ]) {
            delete OLD.world[KEY];
        }
        const RAW = JSON.stringify(OLD);
        localStorage.setItem('bloom-weapon-cards-v3', RAW);
        localStorage.removeItem('bloom-weapon-cards-v4');
    });
    await P.reload();
    await P.waitForFunction(() => window.BUDMORI);
    const OLD = await P.evaluate(() => localStorage.getItem('bloom-weapon-cards-v3'));
    assert.equal(await P.locator('#continueGame').isDisabled(), true);
    assert.equal(await P.locator('#legacySaveNotice').isVisible(), true);
    assert.equal(await P.locator('#continueLegacyGame').isEnabled(), true);
    assert.equal(await P.evaluate(() => localStorage.getItem('bloom-weapon-cards-v4')), null);
    const OLD_UNITS = JSON.parse(OLD)
        .world.units.map((unit) => [unit.species, unit.tier])
        .sort();
    await P.locator('#continueLegacyGame').tap();
    assert.equal(await P.locator('#importConfirm').isVisible(), true);
    assert.equal(await P.evaluate(() => localStorage.getItem('bloom-weapon-cards-v3')), OLD);
    assert.equal(await P.evaluate(() => localStorage.getItem('bloom-weapon-cards-v4')), null);
    await P.locator('#cancelImport').tap();
    assert.equal(await P.evaluate(() => localStorage.getItem('bloom-weapon-cards-v4')), null);
    await P.locator('#continueLegacyGame').tap();
    await P.locator('#confirmImport').tap();
    await P.waitForFunction(() => BUDMORI.sim.scene === 'farm' && document.querySelector('#startScreen').hidden);
    assert.equal(
        await P.evaluate(() => JSON.parse(localStorage.getItem('bloom-weapon-cards-v4')).productVersion),
        PRODUCT_VERSION,
    );
    assert.equal(
        await P.evaluate(() => localStorage.getItem('bloom-weapon-cards-v3')),
        OLD,
        'the original legacy bytes remain untouched',
    );
    let roster = await P.evaluate(() => BUDMORI.sim.units.map((unit) => [unit.species, unit.tier]));
    assert.deepEqual(roster.sort(), OLD_UNITS, 'explicit legacy import preserves the species/tier roster');
    assert.equal(
        await P.evaluate(() => Object.hasOwn(JSON.parse(localStorage.getItem('bloom-weapon-cards-v4')), 'world')),
        false,
    );
    await goHome(P);
    await P.reload();
    await P.waitForFunction(() => window.BUDMORI);
    await P.locator('#continueGame').tap();
    roster = await P.evaluate(() => BUDMORI.sim.units.map((unit) => [unit.species, unit.tier]));
    assert.deepEqual(roster.sort(), OLD_UNITS);
    const IDS = await P.evaluate(() => BUDMORI.sim.units.map((unit) => unit.id));
    assert.equal(new Set(IDS).size, IDS.length, 'rehydrated runtime units have unique regenerated IDs');
    assert.equal(await P.evaluate(() => localStorage.getItem('bloom-weapon-cards-v3')), OLD);
    await clean(P);
    CHECK(
        'Mobile 0.4 save is detected without writes; explicit confirm creates compact progress; old bytes and species/tier roster survive reload',
    );
    await C.close();
}
async function event() {
    const C = await browser.newContext({
            viewport: {
                width: 390,
                height: 844,
            },
            deviceScaleFactor: 3,
            isMobile: true,
            hasTouch: true,
        }),
        P = await open(C);
    await P.locator('#newGame').tap();
    await P.waitForFunction(() => BUDMORI.runtime.tick > 5);
    const DROPPING = await P.evaluate(() => {
        const W = BUDMORI.sim;
        W.rng = new globalThis.BloomGamekitDeterministic.SeededPRNG(118);
        W.foodTaps.remainder = 4;
        W.foodTaps.autoClock = 0;
        if (!W.tapFood('manual')) {
            throw Error('manual food generation was rejected');
        }
        return {
            phase: W.farmBossEvent.phase,
            food: W.food.length,
            z: W.boss.z,
            scene: W.scene,
            running: W.running,
        };
    });
    assert.deepEqual(
        DROPPING,
        {
            phase: 'dropping',
            food: 0,
            z: 3,
            scene: 'farm',
            running: false,
        },
        'one actual generated food is replaced by a boss without entering global combat',
    );
    await P.waitForFunction(
        () => BUDMORI.sim.farmBossEvent.phase === 'fighting',
        {},
        {
            timeout: 8000,
        },
    );
    assert.equal(await P.locator('#bossbar').isVisible(), true);
    assert.equal(await P.locator('#farmControls').isVisible(), false);
    assert.equal(await P.locator('#bossHealthNote').textContent(), '보스 능력치 고정');
    await P.evaluate(() =>
        BUDMORI.sim.units.forEach((unit) => {
            unit.hp = 0;
            unit.down = 60;
        }),
    );
    await P.waitForFunction(
        () =>
            BUDMORI.sim.farmBossEvent.phase === 'celebrating' &&
            BUDMORI.renderer.bossPlayer.currentExpression === 'happy',
        {},
        {
            timeout: 8000,
        },
    );
    const CELEBRATION = await P.evaluate(() => ({
        outcome: BUDMORI.sim.farmBossEvent.outcome,
        phase: BUDMORI.sim.farmBossEvent.phase,
        clip: BUDMORI.renderer.bossPlayer.currentClip,
        expression: BUDMORI.renderer.bossPlayer.currentExpression,
        message: document.querySelector('#battleOutcome').textContent,
        scene: BUDMORI.sim.scene,
        running: BUDMORI.sim.running,
    }));
    assert.equal(CELEBRATION.outcome, 'defeat');
    assert.equal(CELEBRATION.clip, 'idle');
    assert.equal(CELEBRATION.expression, 'happy');
    assert(CELEBRATION.message.includes('다시 일어날'));
    assert.equal(CELEBRATION.scene, 'farm');
    assert.equal(CELEBRATION.running, false);
    await P.screenshot({
        path: path.join(OUT, 'mobile-farm-boss-defeat.png'),
    });
    await P.waitForFunction(
        () => BUDMORI.sim.farmBossEvent.phase === 'fading',
        {},
        {
            timeout: 5000,
        },
    );
    await P.waitForFunction(
        () => BUDMORI.sim.farmBossEvent.phase === 'idle',
        {},
        {
            timeout: 5000,
        },
    );
    const SLEEP = await P.evaluate(() => {
        BUDMORI.runtime.paused = true;
        return BUDMORI.sim.units.map((unit) => ({
            hp: unit.hp,
            down: unit.down,
        }));
    });
    assert(SLEEP.every((unit) => unit.hp === 0 && unit.down > 0 && unit.down <= 60));
    await goHome(P);
    const RAW = await P.evaluate(() => localStorage.getItem('bloom-weapon-cards-v4'));
    const SAVED = JSON.parse(RAW).progress;
    assert.equal(
        SAVED.roster.reduce((sum, entry) => sum + entry.count, 0),
        SLEEP.length,
    );
    assert(
        SAVED.roster.every((entry) => entry.rest > 0 && entry.rest <= 60),
        'remaining sleep timers are included in the compact Farm roster',
    );
    await P.reload();
    await P.waitForFunction(() => window.BUDMORI);
    await P.locator('#continueGame').tap();
    const RESTORED = await P.evaluate(() =>
        BUDMORI.sim.units.map((unit) => ({
            hp: unit.hp,
            down: unit.down,
        })),
    );
    assert(RESTORED.every((unit) => unit.hp === 0 && unit.down > 0 && unit.down <= 60));
    await clean(P);
    CHECK(
        'Mobile 1% food replacement, fixed-stat HUD, happy defeat bounce/fade, Farm-only scene, and corpse sleep save/restore',
    );
    await C.close();
}
try {
    browser = await chromium.launch({
        channel: process.env.BUDMORI_BROWSER_CHANNEL || 'msedge',
        headless: true,
        args: [
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-backgrounding-occluded-windows',
        ],
    });
    REPORT.browser = await browser.version();
    await (
        {
            core,
            save,
            migration,
            event,
            victory,
        }[SUITE] || core
    )();
    REPORT.status = 'PASS';
} catch (e) {
    REPORT.status = 'FAIL';
    REPORT.failure = e.stack;
    throw e;
} finally {
    await browser?.close();
    SERVER.close();
    await writeFile(path.join(OUT, SUITE + '-report.json'), JSON.stringify(REPORT, null, 2));
    console.log(JSON.stringify(REPORT));
}
