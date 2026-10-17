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
    OUT = process.env.BUDMORI_TEST_OUTPUT || path.join(ROOT, 'tests/output');
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
    assert.equal(
        await p.locator('#bloom-error-popup').isVisible(),
        false,
        await p.evaluate(() => globalThis.BloomDiagnostics?.summary() || 'No diagnostic available'),
    );
    assert.deepEqual(REPORT.errors, []);
}
async function openMenuTab(p, tab = 'play') {
    const ENTRY = tab === 'play' ? '#gameMenu' : tab === 'help' ? '#helpMenu' : '#upgradeMenu';
    await closeMenu(p);
    await p.locator(ENTRY).click();
    if (!['play', 'help', 'growth'].includes(tab)) {
        await p.locator(`[data-menu-tab="${tab}"]`).click();
    }
}
async function closeMenu(p) {
    if (await p.locator('#gameMenuOverlay').isVisible()) {
        await p.locator('#gameMenuClose').click();
    }
}
async function goHome(p) {
    await closeMenu(p);
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
        W.playerProgression.level = 2;
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
    const C = await browser.newContext({ viewport: { width: 1280, height: 800 }, hasTouch: true }),
        P = await open(C);
    await P.locator('#newGame').click();
    await P.evaluate(() => {
        BUDMORI.sim.playerProgression.level = 101;
        BUDMORI.sim.playerProgression.availablePoints = 100;
        BUDMORI.sim.markProgressChanged();
    });
    await openMenuTab(P, 'formation');
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
            const D = document.querySelector('#formationPanel');
            return D.scrollWidth <= D.clientWidth + 1;
        }),
        'mobile dialog has no horizontal overflow',
    );
    await P.screenshot({ path: path.join(OUT, 'formation-mobile.png') });
    await closeMenu(P);
    await P.screenshot({ path: path.join(OUT, 'formation-mobile-slots.png') });
    await closeMenu(P);
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
        await closeMenu(P);
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
            const ARC_TRACE = await P.evaluate(() => {
                const W = BUDMORI.sim;
                for (let i = 0; i < 176; i++) {
                    W.time += 1 / 120;
                    W.formationSkills.update(1 / 120);
                }
                BUDMORI.runtime.capturePresentation('reset');
                let display = BUDMORI.runtime.presentation(performance.now());
                const MODEL_CLOUD = W.formationRuntime.effects.find((effect) => effect.kind === 'storm-cloud');

                BUDMORI.renderer.render(display, BUDMORI.combatFeel, display.displayTimeMs);
                const FIRST_PULSE = MODEL_CLOUD.pulse;
                W.time += 0.2;
                W.formationSkills.update(0.2);
                BUDMORI.runtime.capturePresentation('reset');
                display = BUDMORI.runtime.presentation(performance.now());
                const NEXT_MODEL_CLOUD = W.formationRuntime.effects.find((effect) => effect.kind === 'storm-cloud');
                const CLOUD_RENDER = display.formationEffects.find((effect) => effect.id === NEXT_MODEL_CLOUD.id);
                BUDMORI.renderer.render(display, BUDMORI.combatFeel, display.displayTimeMs);
                return {
                    pulseAdvanced: NEXT_MODEL_CLOUD.pulse > FIRST_PULSE,
                    presentationCarriesPulse: CLOUD_RENDER.pulse === NEXT_MODEL_CLOUD.pulse,
                    activeVisualPhase: CLOUD_RENDER.pulse > 0 && CLOUD_RENDER.age > 0.5,
                };
            });
            await P.waitForTimeout(80);
            await clean(P);
            await P.screenshot({ path: path.join(OUT, 'formation-sky-beams.png') });
            assert.equal(ARC_TRACE.pulseAdvanced, true);
            assert.equal(ARC_TRACE.presentationCarriesPulse, true);
            assert.equal(ARC_TRACE.activeVisualPhase, true);
        }
    }
    await openMenuTab(P, 'formation');
    assert.equal(await P.locator('[data-formation-equip="giant"]').isDisabled(), true);
    const UFO_TRACE = await P.evaluate(async () => {
        const [{ UfoSkill: UFO_SKILL }, { UfoPresentation: UFO_PRESENTATION }] = await Promise.all([
                import('/src/features/formation-skills/ufo/model.js'),
                import('/src/features/formation-skills/ufo/presentation.js'),
            ]),
            TARGET = { id: 7, x: 0, y: 0, z: 0, height: 2, giantUntil: 0, hp: 100, faction: 'enemy' };
        let damageCount = 0,
            strokeCount = 0,
            ringCount = 0;
        const OWNER = {
                world: { boss: TARGET, time: 0 },
                target: () => TARGET,
                enemy: () => TARGET,
                targetId: () => 'boss',
                separateAir() {},
                verticalTarget: () => TARGET,
                damage() {
                    damageCount++;
                },
            },
            SKILL = new UFO_SKILL(),
            EFFECT = {
                age: 0.8,
                duration: 5,
                x: 0,
                y: 0,
                z: 2,
                targetId: 'boss',
                pulse: 1,
                lastPulse: 0.7,
                targetX: 0,
                targetY: 0,
                targetZ: 0,
                beamTarget: false,
                beamTargetZ: 0,
            };
        SKILL.update(OWNER, EFFECT, 0.01);
        const CTX = {
                globalAlpha: 1,
                beginPath() {},
                moveTo() {},
                lineTo() {},
                stroke() {
                    strokeCount++;
                },
            },
            RENDERER = {
                ctx: CTX,
                scale: 1,
                pixelRatio: 1,
                project: (x, y) => ({ x, y }),
                ellipse() {},
                ring() {
                    ringCount++;
                },
            },
            PRESENTATION = new UFO_PRESENTATION();
        PRESENTATION.draw(RENDERER, { ...EFFECT, age: 0.95, lastPulse: 0.8, beamTarget: true });
        const GAP_STROKES = strokeCount,
            GAP_RINGS = ringCount;
        PRESENTATION.draw(RENDERER, { ...EFFECT, age: 0.95, lastPulse: 0.8, beamTarget: false });
        const NO_TARGET_STROKES = strokeCount;
        const CADENCE_EFFECT = { ...EFFECT, age: 0.8, pulse: 1, lastPulse: 0.7 },
            DAMAGE_BY_STEP = [];
        for (let i = 0; i < 6; i++) {
            SKILL.update(OWNER, CADENCE_EFFECT, 0.05);
            DAMAGE_BY_STEP.push(damageCount);
        }
        const WORLD = BUDMORI.sim,
            ORIGINAL_EFFECTS = WORLD.formationRuntime.effects,
            CAPTURE_EFFECT = {
                ...EFFECT,
                id: 987654,
                kind: 'ufo',
                age: 0.95,
                lastPulse: 0.8,
                beamTarget: true,
            };
        WORLD.formationRuntime.effects = [CAPTURE_EFFECT];
        let capturedBeamTarget;
        try {
            BUDMORI.runtime.capturePresentation('reset');
            capturedBeamTarget = BUDMORI.runtime
                .presentation(performance.now())
                .formationEffects.find((effect) => effect.id === CAPTURE_EFFECT.id)?.beamTarget;
        } finally {
            WORLD.formationRuntime.effects = ORIGINAL_EFFECTS;
            BUDMORI.runtime.capturePresentation('reset');
        }
        return {
            beamTargetFound: EFFECT.beamTarget,
            gapStrokes: GAP_STROKES,
            gapRings: GAP_RINGS,
            noTargetStrokes: NO_TARGET_STROKES,
            damageByStep: DAMAGE_BY_STEP,
            capturedBeamTarget,
        };
    });
    assert.deepEqual(UFO_TRACE, {
        beamTargetFound: true,
        gapStrokes: 3,
        gapRings: 0,
        noTargetStrokes: 3,
        damageByStep: [0, 1, 1, 1, 1, 2],
        capturedBeamTarget: true,
    });
    await C.close();
    CHECK(
        'Formation UI and all nine effects; UFO beam stays visible between pulses, schema captures its target, and damage remains on the 0.2s pulse',
    );
}
async function upgradeMenuFlow() {
    const C = await browser.newContext({ viewport: { width: 1280, height: 800 } }),
        P = await open(C);
    await P.locator('#newGame').click();
    await openMenuTab(P, 'play');
    assert.equal(await P.locator('#gameMenuTitle').textContent(), '설정');
    assert.equal(await P.locator('#gameMenuTabs').isVisible(), false);
    assert.equal(await P.locator('#menuPlayPanel button').count(), 3);
    await P.locator('#sound').click();
    await P.locator('#sound').click();
    await closeMenu(P);
    await P.evaluate(() => {
        const W = BUDMORI.sim;
        W.playerProgression.level = 101;
        W.playerProgression.availablePoints = 100;
        for (const SPECIES of [6, 7, 8]) {
            W.spawn(SPECIES, 3, 0, 0);
        }
        W.markProgressChanged();
    });
    await openMenuTab(P, 'abilities');
    for (const [SPECIES, ID, ROLE] of [
        [6, 'rice-low-health-harvest', '수확'],
        [7, 'wheat-command-crit', '치명타'],
        [8, 'barley-armor-break', '방어도'],
    ]) {
        await P.locator(`[data-ability-species="${SPECIES}"]`).click();
        const CARD = P.locator(`[data-ability="${ID}"]`);
        assert((await CARD.textContent()).includes(ROLE));
        await CARD.locator(`[data-ability-node="${ID}:root"]`).click();
        await P.waitForFunction((id) => BUDMORI.sim.playerProgression.abilities[id].rootUnlocked, ID);
        await CARD.locator(`[data-ability-node="${ID}:power:1"]`).click();
        await P.waitForFunction((id) => BUDMORI.sim.playerProgression.abilities[id].powerLevel === 1, ID);
        await P.waitForTimeout(220);
        assert((await CARD.locator('.ability-card__current-effect').textContent()).includes('현재 효과'));
        assert((await CARD.locator('.ability-card__grade').textContent()).includes('Rare'));
        await P.locator('#abilityNodes').evaluate((element) => {
            element.scrollTop = 0;
        });
        await P.screenshot({ path: path.join(OUT, 'upgrade-species-' + SPECIES + '.png') });
    }
    await P.setViewportSize({ width: 390, height: 844 });
    await openMenuTab(P, 'formation');
    await P.locator('[data-formation-purchase="giant"]').click();
    await P.waitForFunction(() => BUDMORI.sim.playerProgression.formationSkills.levels.giant === 1);
    await P.locator('[data-formation-equip="giant"]').click();
    await P.waitForFunction(() => BUDMORI.sim.playerProgression.formationSkills.equipped[0] === 'giant');
    assert.equal(await P.locator('.formation-open, .formation-dialog').count(), 0);
    assert(await P.locator('#formationPanel').evaluate((element) => element.scrollWidth <= element.clientWidth + 1));
    await P.locator('[data-skill="storm-cloud"]').scrollIntoViewIfNeeded();
    await P.screenshot({ path: path.join(OUT, 'upgrade-mobile-formation.png') });
    await P.locator('#menuTabGrowth').click();
    await P.locator('#menuTabAbilities').click();
    await P.locator('#menuTabAbilities').press('ArrowRight');
    assert.equal(await P.locator('#menuTabFormation').getAttribute('aria-selected'), 'true');
    await closeMenu(P);
    assert.equal(await P.locator('.formation-slot').count(), 1);
    await P.evaluate(() => {
        BUDMORI.sim.farmBossEvent.phase = 'fighting';
    });
    await openMenuTab(P, 'formation');
    assert.equal(await P.locator('[data-formation-unequip="0"]').isDisabled(), true);
    assert.equal(await P.locator('[data-formation-purchase="giant"]').isDisabled(), true);
    await P.locator('#menuTabAbilities').click();
    assert.equal(await P.locator('[data-ability-node][aria-disabled="false"]').count(), 0);
    assert.equal(await P.locator('#menuTabGrowth').isDisabled(), true);
    await closeMenu(P);
    await P.evaluate(() => {
        BUDMORI.sim.farmBossEvent.phase = 'idle';
    });
    await P.screenshot({ path: path.join(OUT, 'upgrade-mobile-toolbar.png') });
    await P.locator('#menuHome').click();
    await P.reload();
    await P.waitForFunction(() => window.BUDMORI);
    await P.locator('#continueGame').click();
    await openMenuTab(P, 'abilities');
    await P.locator('[data-ability-species="6"]').click();
    assert((await P.locator('.ability-card__current-effect').textContent()).includes('1.75'));
    await clean(P);
    await C.close();
    CHECK(
        'Separate settings and upgrades; Rice/Wheat/Barley real investments, current effects, mobile tabs/scroll, combat lock and reload',
    );
}
async function formationHudFlow() {
    const C = await browser.newContext({ viewport: { width: 1280, height: 800 }, hasTouch: true }),
        P = await open(C);
    await P.locator('#newGame').click();
    await P.evaluate(() => {
        BUDMORI.sim.playerProgression.level = 101;
        BUDMORI.sim.playerProgression.availablePoints = 100;
        BUDMORI.sim.markProgressChanged();
    });
    await openMenuTab(P, 'formation');
    for (const [INDEX, ID] of ['giant', 'lightning', 'meteor'].entries()) {
        if (INDEX > 0) {
            await P.locator('[data-formation-buy-slot]').click();
            await P.waitForFunction(
                (count) => BUDMORI.sim.playerProgression.formationSkills.slots === count,
                INDEX + 1,
            );
        }
        await P.locator(`[data-formation-purchase="${ID}"]`).click();
        await P.waitForFunction((id) => BUDMORI.sim.playerProgression.formationSkills.levels[id] === 1, ID);
        await P.locator(`[data-formation-equip="${ID}"]`).click();
        await P.waitForFunction((id) => BUDMORI.sim.playerProgression.formationSkills.equipped.includes(id), ID);
    }
    await closeMenu(P);
    const VIEWPORTS = [
        { width: 1280, height: 800 },
        { width: 390, height: 844 },
        { width: 320, height: 568 },
        { width: 844, height: 390 },
    ];
    const VERIFY_HUD = async (scene) => {
        for (const VIEWPORT of VIEWPORTS) {
            await P.setViewportSize(VIEWPORT);
            await P.waitForTimeout(80);
            const GEOMETRY = await P.evaluate(() => {
                const HUD = document.querySelector('.formation-dock'),
                    BOX = HUD.getBoundingClientRect(),
                    INTERSECTS = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top,
                    OBSTACLES = [
                        ...document.querySelectorAll(
                            '.controls:not([hidden]), .raid-panel:not([hidden]), .utility, #bossbar:not([hidden])',
                        ),
                    ]
                        .filter((element) => element.getClientRects().length)
                        .map((element) => element.getBoundingClientRect());
                return {
                    centered: Math.abs((BOX.left + BOX.right) / 2 - innerWidth / 2) < 1,
                    inside: BOX.left >= 0 && BOX.right <= innerWidth && BOX.top >= 0 && BOX.bottom <= innerHeight,
                    overlaps: OBSTACLES.some((box) => INTERSECTS(BOX, box)),
                    controlsInside: OBSTACLES.every((box) => box.left >= 0 && box.right <= innerWidth),
                    readable: [...HUD.querySelectorAll('small b, small span')].every(
                        (element) => element.scrollWidth <= element.clientWidth + 1,
                    ),
                    inputPasses:
                        document.elementFromPoint((BOX.left + BOX.right) / 2, (BOX.top + BOX.bottom) / 2)?.id ===
                        'world',
                    pageOverflow: document.documentElement.scrollWidth > innerWidth,
                };
            });
            assert.deepEqual(
                GEOMETRY,
                {
                    centered: true,
                    inside: true,
                    overlaps: false,
                    controlsInside: true,
                    readable: true,
                    inputPasses: true,
                    pageOverflow: false,
                },
                scene + ' HUD ' + VIEWPORT.width + 'x' + VIEWPORT.height,
            );
            await P.screenshot({ path: path.join(OUT, 'formation-hud-' + scene + '-' + VIEWPORT.width + '.png') });
        }
    };
    await P.evaluate(() => {
        BUDMORI.runtime.paused = true;
        BUDMORI.sim.farmBossEvent.phase = 'fighting';
        BUDMORI.sim.boss.active = true;
    });
    await VERIFY_HUD('farm-event');
    await P.evaluate(() => {
        BUDMORI.sim.farmBossEvent.phase = 'idle';
        BUDMORI.sim.boss.active = false;
        BUDMORI.runtime.paused = false;
    });
    await P.setViewportSize({ width: 390, height: 844 });
    const BOX = await P.locator('.formation-dock').boundingBox(),
        BEFORE = await cameraSnapshot(P);
    await P.mouse.move(BOX.x + BOX.width / 2, BOX.y + BOX.height / 2);
    await P.mouse.down();
    await P.mouse.move(BOX.x + BOX.width / 2 + 40, BOX.y + BOX.height / 2 - 30, { steps: 3 });
    await P.mouse.up();
    assert.notDeepEqual((await cameraSnapshot(P)).pan, BEFORE.pan, 'HUD does not intercept native map drag');
    await P.locator('#raid').tap();
    await P.locator('#bossEncounterChallenge').tap();
    await P.waitForFunction(() => BUDMORI.sim.scene === 'raid');
    await P.evaluate(() => {
        BUDMORI.runtime.paused = true;
    });
    await VERIFY_HUD('raid');
    await clean(P);
    await C.close();
    CHECK(
        'Three skill slots stay centered and separate from actions in Farm events/Raid at desktop, 390px, 320px and landscape; native map drag passes through HUD',
    );
}
async function upgrades() {
    await upgradeMenuFlow();
    await formationHudFlow();
}
async function progressionResetFlow() {
    const C = await browser.newContext({ viewport: { width: 1280, height: 800 } }),
        P = await open(C);
    await P.locator('#newGame').click();
    await openMenuTab(P, 'growth');
    await P.evaluate(() => {
        const WORLD = BUDMORI.sim,
            STATE = WORLD.playerProgression;
        STATE.level = 15;
        STATE.availablePoints = 14;
        STATE.farmUpgrades.food = 2;
        STATE.farmUpgrades.capacity = 1;
        STATE.availablePoints -= 3;
        WORLD.markProgressChanged();
    });
    await P.locator('#menuTabAbilities').click();
    await P.locator('#menuTabGrowth').click();
    assert.equal(await P.locator('#progressionResetCurrent').isEnabled(), true);
    const GROWTH_RESET_LABEL = await P.locator('#progressionResetCurrent').textContent();
    assert(GROWTH_RESET_LABEL.includes('3P'), GROWTH_RESET_LABEL);
    await P.locator('#progressionResetCurrent').click();
    await P.waitForFunction(() => {
        const STATE = BUDMORI.sim.playerProgression;
        return STATE.farmUpgrades.food === 0 && STATE.farmUpgrades.capacity === 0 && STATE.availablePoints === 14;
    });
    await P.waitForFunction(() => document.querySelector('#progressionResetCurrent').disabled);
    assert.equal(await P.locator('#progressionResetCurrent').isDisabled(), true);

    await P.locator('#menuTabAbilities').click();
    await P.locator('[data-ability-species="0"]').click();
    const ABILITY_0 = await P.locator('[data-species="0"]').first().getAttribute('data-ability');
    await P.locator('[data-ability-species="1"]').click();
    const ABILITY_1 = await P.locator('[data-species="1"]').first().getAttribute('data-ability');
    await P.evaluate(
        ([id0, id1]) => {
            const WORLD = BUDMORI.sim,
                STATE = WORLD.playerProgression;
            STATE.abilities[id0] = { rootUnlocked: true, powerLevel: 1, gradeLevel: 0 };
            STATE.abilities[id1] = { rootUnlocked: true, powerLevel: 0, gradeLevel: 0 };
            STATE.availablePoints -= 3;
            WORLD.markProgressChanged();
        },
        [ABILITY_0, ABILITY_1],
    );
    await P.locator('[data-ability-species="0"]').click();
    assert.equal(await P.locator('#progressionResetCurrent').isHidden(), true);
    assert.equal(await P.locator('[data-ability-action="reset"]').getAttribute('aria-disabled'), 'false');
    await P.locator('[data-ability-action="reset"]').click();
    await P.waitForFunction(
        ([id0, id1]) => {
            const STATE = BUDMORI.sim.playerProgression;
            return (
                STATE.availablePoints === 13 &&
                !STATE.abilities[id0].rootUnlocked &&
                STATE.abilities[id0].powerLevel === 0 &&
                STATE.abilities[id1].rootUnlocked
            );
        },
        [ABILITY_0, ABILITY_1],
    );

    await P.evaluate(() => {
        const WORLD = BUDMORI.sim,
            STATE = WORLD.playerProgression;
        STATE.farmUpgrades.growth = 1;
        STATE.availablePoints -= 1;
        STATE.formationSkills.slots = 3;
        STATE.formationSkills.levels.giant = 2;
        STATE.formationSkills.equipped = ['giant'];
        STATE.availablePoints -= 4;
        WORLD.markProgressChanged();
    });
    await P.locator('#menuTabFormation').click();
    assert.equal(await P.locator('#progressionResetAll').isEnabled(), true);
    assert((await P.locator('#progressionResetAll').textContent()).includes('6P'));
    await P.locator('#progressionResetAll').click();
    assert.equal(
        await P.evaluate(() => BUDMORI.runtime.queue('progression-reset', { scope: { type: 'all' } })),
        true,
        'a repeated reset request is accepted by the queue but cannot refund the same investment twice',
    );
    await P.waitForFunction(() => {
        const STATE = BUDMORI.sim.playerProgression;
        return (
            STATE.level === 15 &&
            STATE.availablePoints === 14 &&
            Object.values(STATE.farmUpgrades).every((level) => level === 0) &&
            Object.values(STATE.abilities).every(
                (ability) => !ability.rootUnlocked && ability.powerLevel === 0 && ability.gradeLevel === 0,
            ) &&
            STATE.formationSkills.slots === 1 &&
            STATE.formationSkills.equipped.length === 0 &&
            Object.values(STATE.formationSkills.levels).every((level) => level === 0)
        );
    });

    await P.evaluate(() => {
        const WORLD = BUDMORI.sim,
            STATE = WORLD.playerProgression;
        STATE.formationSkills.slots = 2;
        STATE.formationSkills.levels.ufo = 2;
        STATE.formationSkills.equipped = ['ufo'];
        STATE.availablePoints -= 3;
        WORLD.markProgressChanged();
    });
    await P.locator('#menuTabGrowth').click();
    await P.locator('#menuTabFormation').click();
    assert.equal(await P.locator('#progressionResetCurrent').isEnabled(), true);
    assert((await P.locator('#progressionResetCurrent').textContent()).includes('3P'));
    await P.locator('#progressionResetCurrent').click();
    await P.waitForFunction(() => {
        const STATE = BUDMORI.sim.playerProgression;
        return (
            STATE.availablePoints === 14 &&
            STATE.formationSkills.slots === 1 &&
            STATE.formationSkills.equipped.length === 0 &&
            Object.values(STATE.formationSkills.levels).every((level) => level === 0)
        );
    });
    await P.waitForFunction(() => document.querySelector('#progressionResetAll').disabled);
    assert.equal(await P.locator('#progressionResetAll').isDisabled(), true);
    await clean(P);
    await C.close();
    CHECK(
        'Current growth, species, and formation resets refund only scoped investments; full reset restores all levels/slots/equipment and rejects duplicate refunds',
    );
}
async function cadenceDiagnosticsFlow() {
    const C = await browser.newContext({
            viewport: { width: 390, height: 844 },
            permissions: ['clipboard-read', 'clipboard-write'],
        }),
        P = await open(C);
    await P.locator('#newGame').click();
    await openMenuTab(P, 'play');
    await P.locator('#copyDiagnostics').click();
    const BASIC = await P.evaluate(() => navigator.clipboard.readText());
    assert(BASIC.includes('GPU 시간 미측정') && BASIC.includes('상세 꺼짐') && BASIC.includes('미측정'));
    assert(!BASIC.trim().startsWith('{') && BASIC.split('\n').length <= 20);
    await P.locator('#diagnosticDetail').check();
    await closeMenu(P);
    const CATCHUP_PAIR = await P.evaluate(() => {
        const SESSION = BUDMORI.runtime,
            START = Math.max(performance.now(), SESSION.lastFrameClockMs || 0),
            END = START + 200,
            CAPTURED = [],
            ORIGINAL_CAPTURE = SESSION.capturePresentation;
        SESSION.capturePresentation = function (mode) {
            const ACCEPTED = ORIGINAL_CAPTURE.call(this, mode);
            CAPTURED.push({ timeMs: this.latestCaptureTimeMs, x: this.world.units[0]?.x });
            return ACCEPTED;
        };
        try {
            SESSION.loop.resetTiming();
            SESSION.pulse(START);
            const START_TICK = SESSION.tick,
                START_CAPTURE = SESSION.presentationSequence,
                START_TIME = SESSION.world.time;
            SESSION.pulse(END);
            const FRAME = SESSION.presentation(END),
                DIAGNOSTICS = FRAME.presentationDiagnostics,
                UNIT = FRAME.units.find((unit) => unit.id === SESSION.world.units[0]?.id);
            return {
                ticks: SESSION.tick - START_TICK,
                captures: SESSION.presentationSequence - START_CAPTURE,
                simulationSeconds: SESSION.world.time - START_TIME,
                intervalMs: DIAGNOSTICS.intervalMs,
                sampleAgeMs: DIAGNOSTICS.sampleAgeMs,
                renderFraction: DIAGNOSTICS.renderFraction,
                previousSnapshotX: CAPTURED[0]?.x,
                currentSnapshotX: CAPTURED[1]?.x,
                presentedX: UNIT?.x,
            };
        } finally {
            SESSION.capturePresentation = ORIGINAL_CAPTURE;
            SESSION.loop.resetTiming();
        }
    });
    assert.equal(CATCHUP_PAIR.ticks, 4, 'controlled 200ms pulse advances four 20Hz logic ticks');
    assert.equal(CATCHUP_PAIR.captures, 2, 'catch-up captures the penultimate and current states');
    assert(Math.abs(CATCHUP_PAIR.simulationSeconds - 0.2) < 1e-8, 'all four logical steps remain simulated');
    assert(
        Math.abs(CATCHUP_PAIR.intervalMs - 50) < 1e-4,
        'captured states retain their actual 50ms simulation interval: ' + JSON.stringify(CATCHUP_PAIR),
    );
    assert(Math.abs(CATCHUP_PAIR.sampleAgeMs - 50) < 1e-4, 'presentation keeps the configured one-tick delay');
    assert(Math.abs(CATCHUP_PAIR.renderFraction) < 1e-6, 'delayed presentation samples the captured previous endpoint');
    assert(
        Math.abs(CATCHUP_PAIR.presentedX - CATCHUP_PAIR.previousSnapshotX) < 1e-6,
        'the rendered unit position is the preserved penultimate snapshot',
    );
    await P.waitForTimeout(220);
    const BEFORE = await P.evaluate(() => ({ time: BUDMORI.sim.time, ticks: BUDMORI.sim.metrics.logicTicks }));
    for (let index = 0; index < 5; index++) {
        await P.locator('#feed').click();
    }
    await P.waitForFunction((tick) => BUDMORI.sim.metrics.logicTicks >= tick + 30, BEFORE.ticks);
    await P.evaluate(() => {
        const END = performance.now() + 260;
        while (performance.now() < END) {
            // A stalled tab must expose bounded catchup, never repeat a whole world per physics step.
        }
    });
    await P.waitForTimeout(100);
    await P.evaluate(() => {
        const END = performance.now() + 460;
        while (performance.now() < END) {
            // A gap beyond the module backlog limit is dropped and reported.
        }
    });
    await P.waitForTimeout(100);
    await P.locator('#pause').click();
    const AFTER = await P.evaluate(() => ({ time: BUDMORI.sim.time, ticks: BUDMORI.sim.metrics.logicTicks }));
    assert(
        Math.abs(AFTER.time - BEFORE.time - (AFTER.ticks - BEFORE.ticks) * 0.05) < 1e-8,
        'logical ticks preserve full elapsed seconds',
    );
    await openMenuTab(P, 'play');
    await P.locator('#copyDiagnostics').click();
    const SUMMARY = await P.evaluate(() => navigator.clipboard.readText());
    assert(
        SUMMARY.includes('상세 켜짐') &&
            SUMMARY.includes('논리') &&
            SUMMARY.includes('물리') &&
            SUMMARY.includes('fill 재테셀'),
    );
    await P.locator('summary').filter({ hasText: '상세 진단 옵션' }).click();
    await P.locator('#exportDiagnostics').click();
    const DETAIL = JSON.parse(await P.locator('#settingsDiagnosticText').inputValue()),
        PERFORMANCE = DETAIL.performance;
    assert.equal(PERFORMANCE.format, 'bloom numeric frame metrics v1');
    assert.equal(PERFORMANCE.gpuMs, null);
    assert(PERFORMANCE.retainedFrames <= 240 && PERFORMANCE.windowMs > 1000);
    assert(PERFORMANCE.counts.logicTicks.total >= 20);
    assert(PERFORMANCE.counts.logicTicks.total <= Math.ceil((PERFORMANCE.windowMs / 1000) * 20) + 3);
    assert(PERFORMANCE.counts.physicsSteps.total >= PERFORMANCE.counts.logicTicks.total * 3);
    assert(PERFORMANCE.counts.catchupTicks.total > 0 && PERFORMANCE.counts.backlogDrops.total > 0);
    assert(
        PERFORMANCE.counts.presentationCaptures.total < PERFORMANCE.counts.logicTicks.total,
        'catch-up capture retains delayed-render endpoints instead of every intermediate tick',
    );
    assert.equal(
        PERFORMANCE.counts.backlogDrops.total,
        PERFORMANCE.counts.clockGapDrops.total + PERFORMANCE.counts.dropPolicyDrops.total,
        'SDK drop events are counted once under their exact reason',
    );
    assert(
        Math.abs(
            PERFORMANCE.counts.backlogDroppedMs.total -
                PERFORMANCE.counts.clockGapDroppedMs.total -
                PERFORMANCE.counts.dropPolicyDroppedMs.total,
        ) < 1e-6,
        'SDK dropped time is not mixed with input clamp or overflow time',
    );
    assert(
        Math.abs(
            PERFORMANCE.counts.backlogClippedMs.total -
                PERFORMANCE.counts.inputDtClampedMs.total -
                PERFORMANCE.counts.backlogOverflowMs.total,
        ) < 1e-6,
        'input clamp and backlog overflow are each counted once',
    );
    assert(PERFORMANCE.counts.drawCalls.total > 0 && PERFORMANCE.counts.bufferUploads.total > 0);
    assert(PERFORMANCE.stagesMs.render.max > 0 && PERFORMANCE.stagesMs.ai.total >= 0);
    assert(SUMMARY.split('\n').length <= 20);
    REPORT.cadence = {
        elapsedSeconds: AFTER.time - BEFORE.time,
        logicTicks: AFTER.ticks - BEFORE.ticks,
        physicsSteps: PERFORMANCE.counts.physicsSteps.total,
        windowMs: PERFORMANCE.windowMs,
        summary: SUMMARY,
    };
    await P.screenshot({ path: path.join(OUT, 'cadence-diagnostics-mobile.png') });
    await clean(P);
    await C.close();
    CHECK(
        'Settings short diagnostic copy through real browser clipboard; opt-in detailed numeric window, 20Hz time preservation and actual WebGL counters',
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
    const SHORT_DIAGNOSTICS = await P.evaluate(() => window.__startupDiagnostics);
    assert(SHORT_DIAGNOSTICS.includes('diagnostic-probe'));
    assert(!SHORT_DIAGNOSTICS.trim().startsWith('{'));
    const STARTUP_DIAGNOSTICS = await P.evaluate(() => JSON.parse(globalThis.BloomDiagnostics.detail()));
    assert.equal(STARTUP_DIAGNOSTICS.format, 'budmori startup diagnostics v2');
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
    await cadenceDiagnosticsFlow();
    await upgrades();
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
        ['gameMenu', 'upgradeMenu', 'helpMenu', 'pause', 'menuHome'],
        'settings, upgrades and gameplay navigation have distinct controls',
    );
    assert.equal(MENU_CONTRACT.label, '게임 설정 열기');
    assert.deepEqual(MENU_CONTRACT.tabs, ['공통 스탯', '병종 특성', '편성 스킬']);
    assert.equal(MENU_CONTRACT.roles, false, 'troop-role explainer is removed from the battle map');
    assert(MENU_CONTRACT.essentials, 'feed, deploy status and both HP indicators remain available');
    const WAS_PAUSED = await P.evaluate(() => BUDMORI.runtime.paused);
    await openMenuTab(P, 'play');
    await P.screenshot({
        path: path.join(OUT, 'pc-game-menu.png'),
        animations: 'disabled',
    });
    await closeMenu(P);
    if (!WAS_PAUSED) {
        assert.equal((await P.locator('#pause').textContent()).trim(), 'Ⅱ');
        await P.locator('#pause').click();
        await P.waitForFunction(() => BUDMORI.runtime.paused);
        assert.equal(await P.locator('#gameMenuOverlay').isVisible(), false, 'Pause is a separate gameplay control');
        await closeMenu(P);
        assert.equal(
            await P.evaluate(() => BUDMORI.runtime.paused),
            true,
            'closing settings keeps an explicitly selected paused state',
        );
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
    CHECK('Separate settings/upgrades, three upgrade tabs; Escape restores the prior play state');
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
    await P.evaluate(() => {
        const W = BUDMORI.sim,
            STARTERS = W.units.filter((unit) => unit.species === 0 && unit.tier === 1);
        W.food.length = 0;
        for (const UNIT of STARTERS) {
            UNIT.meals = 0;
            UNIT.cooldown = 0;
            W.food.push({
                x: UNIT.x,
                y: UNIT.y,
                z: 0,
                vx: 0,
                vy: 0,
                vz: 0,
                seed: 0.5,
                phase: 'grounded',
                tx: UNIT.x,
                ty: UNIT.y,
            });
        }
        W._foodSpatialDirty = true;
    });
    assert.deepEqual(await cameraSnapshot(P), FEED_CAMERA, 'feeding button presses and drags never pan the world');
    CHECK('Start → farm; native manual taps delivered once per release');
    await P.waitForFunction(
        () => BUDMORI.sim.metrics.births > 0,
        {},
        {
            timeout: 12000,
        },
    );
    const MANUAL_FUSION = await P.evaluate(() => {
        const W = BUDMORI.sim;
        W.units = [];
        for (let index = 0; index < 4; index++) {
            const UNIT = W.spawn(0, 1, index * 0.08, 0);
            UNIT.growth = BUDMORI.CONFIG.farm.breeding.matureMeals;
            UNIT.growthElapsed = UNIT.growthDuration;
            UNIT.meals = 0;
            UNIT.cooldown = 0;
            UNIT.vx = UNIT.vy = UNIT.vz = 0;
        }
        BUDMORI.runtime.capturePresentation('reset');
        return W.metrics.merges;
    });
    await P.waitForFunction(() => !document.querySelector('#merge')?.disabled);
    await P.evaluate(() => {
        const BUTTON = document.querySelector('#merge');
        BUTTON.click();
        BUTTON.click();
    });
    await P.waitForFunction((before) => BUDMORI.sim.metrics.merges === before + 1, MANUAL_FUSION, {
        timeout: 15000,
    });
    await P.waitForTimeout(1000);
    assert.equal(
        await P.evaluate((before) => BUDMORI.sim.metrics.merges - before, MANUAL_FUSION),
        1,
        'one double-click queues one fusion operation and no automatic follow-up',
    );
    assert.equal(await P.locator('#breed').count(), 0, 'breeding has no mode switch');
    const RESERVATION_INVARIANT = await P.evaluate(async () => {
        const { snapshot: SNAPSHOT, restore: RESTORE } = await import('/src/farm-state.js'),
            { captureFarmProgress: CAPTURE_PROGRESS, validateFarmProgress: VALIDATE_PROGRESS } =
                await import('/src/farm-progress.js'),
            W = new BUDMORI.sim.constructor(1223);
        W.units = [];
        for (let index = 0; index < 4; index++) {
            const UNIT = W.spawn(0, 1, index * 1.1, 0);
            UNIT.growth = BUDMORI.CONFIG.farm.breeding.matureMeals;
            UNIT.growthElapsed = UNIT.growthDuration;
            UNIT.meals = 1;
            UNIT.cooldown = 0;
        }
        const MATE = W.findOrReserveMate(W.units[0]),
            MATE_IDS = [W.units[0].id, MATE.id],
            STARTED = W.startManualMerge(),
            MATERIAL_IDS = [...W.mergeTask.materialIds],
            FIRST_OWNER = W.unitCollection.reservationOwner(MATERIAL_IDS[0]),
            SECOND_OWNER = W.unitCollection.reservationOwner(MATERIAL_IDS[1]),
            DTO = SNAPSHOT(W),
            LEGACY_DTO = { ...DTO, mode: 'merge' },
            RESTORED = RESTORE(LEGACY_DTO),
            PROGRESS = CAPTURE_PROGRESS(W);
        VALIDATE_PROGRESS({ ...PROGRESS, mode: 'merge' });
        return {
            started: STARTED,
            secondStart: W.startManualMerge(),
            taskSize: MATERIAL_IDS.length,
            noMateOverlap: MATERIAL_IDS.every((id) => !MATE_IDS.includes(id)),
            oneOwner: FIRST_OWNER && FIRST_OWNER === SECOND_OWNER,
            noModeSaved: !Object.hasOwn(DTO, 'mode'),
            legacyModeIgnored: !Object.hasOwn(RESTORED, 'mode'),
            compactProgressHasNoMode: !Object.hasOwn(PROGRESS, 'mode'),
            unavailableReason: W.mergeAvailability().reason,
        };
    });
    assert.deepEqual(RESERVATION_INVARIANT, {
        started: true,
        secondStart: false,
        taskSize: 2,
        noMateOverlap: true,
        oneOwner: true,
        noModeSaved: true,
        legacyModeIgnored: true,
        compactProgressHasNoMode: true,
        unavailableReason: '합성이 진행 중이에요.',
    });
    CHECK('Breeding remains automatic; one fusion button action starts exactly one operation');
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
    await P.evaluate(() => BUDMORI.sim.cancelMergeTask());
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
    assert.equal(await P.locator('#bossStageDrop').isVisible(), true, 'stage 1 has one boss-species draw');
    assert.match(await P.locator('#bossStageDrop').textContent(), /1회 · 추첨당 2%/);
    await swipeEncounter(P, 'up');
    await P.waitForFunction(() => document.querySelector('#bossStageCounter')?.textContent === '2 / 61');
    for (let i = 0; i < 3; i++) {
        await swipeEncounter(P, 'up');
        await P.waitForFunction((n) => document.querySelector('#bossStageCounter')?.textContent === `${n} / 61`, 3 + i);
    }
    assert.equal(await P.locator('#bossStageCounter').textContent(), '5 / 61');
    assert.equal(await P.locator('#bossStageHp').textContent(), 'HP 1,013');
    assert.equal(await P.locator('#bossStageXp').textContent(), '+101 XP');
    assert(await P.locator('#bossStageDrop').isVisible());
    assert.match(await P.locator('#bossStageDrop').textContent(), /5회 \+ 6\.25% 확률로 1회 추가 · 추첨당 2%/);
    const REWARD_INVARIANT = await P.evaluate(async () => {
        const {
                settleBossKill: SETTLE_BOSS_KILL,
                bossAcquisitionChance: BOSS_ACQUISITION_CHANCE,
                bossStageStats: BOSS_STAGE_STATS,
                grantPendingBossAcquisitions: GRANT_PENDING,
            } = await import('/src/boss-rewards.js'),
            { sampleBinomial: SAMPLE_BINOMIAL } = await import('/src/binomial-sampler.js'),
            { captureFarmProgress: CAPTURE_PROGRESS, restoreFarmProgress: RESTORE_PROGRESS } =
                await import('/src/farm-progress.js'),
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
            ROLLS = [0.1, 0.99],
            MULTI = SETTLE_BOSS_KILL(WORLD, {
                encounterId: 901,
                source: 'raid',
                receiptKey: 'stage-ten-rolls',
                rollBudget: 2,
                xpAmount: 103,
                species: 2,
                random: () => ROLLS.shift(),
            });
        let fractionalIndex = 0;
        const FRACTIONAL = SETTLE_BOSS_KILL(WORLD, {
                encounterId: 902,
                source: 'raid',
                rollBudget: 1.5,
                species: 1,
                random: () => [0.5, 0, 0][fractionalIndex++],
            }),
            HIGH_WORLD = new BUDMORI.sim.constructor(998);
        while (HIGH_WORLD.units.length < HIGH_WORLD.capacity) {
            HIGH_WORLD.spawn(0, 1, 0, 0);
        }
        const HIGH_START = performance.now(),
            HIGH = SETTLE_BOSS_KILL(HIGH_WORLD, {
                encounterId: 903,
                source: 'raid',
                rollBudget: BOSS_STAGE_STATS(61).rollBudget,
                species: 4,
            }),
            HIGH_DURATION_MS = performance.now() - HIGH_START;
        // Model the Raid settlement transaction before validating this Farm snapshot.
        HIGH_WORLD.nextRaidRunSequence = 903;
        HIGH_WORLD.raidSettlementWatermark = 903;
        const SAVED_PROGRESS = CAPTURE_PROGRESS(HIGH_WORLD),
            RESTORED_WORLD = RESTORE_PROGRESS(SAVED_PROGRESS),
            RESTORED_RECEIPT = RESTORED_WORLD.bossRewardReceipts.find((reward) => reward.encounterId === 903);
        RESTORED_WORLD.removeUnit(RESTORED_WORLD.units[0]);
        const RELEASED = GRANT_PENDING(RESTORED_WORLD),
            RESUMED_RECEIPT = RESTORED_WORLD.bossRewardReceipts.find((reward) => reward.encounterId === 903);
        let samplerState = 777,
            samplerTotal = 0,
            samplerSquares = 0;
        const SAMPLE_RANDOM = () => {
            samplerState = (Math.imul(samplerState, 1664525) + 1013904223) >>> 0;
            return samplerState / 4294967296;
        };
        for (let index = 0; index < 8000; index++) {
            const COUNT = SAMPLE_BINOMIAL(1000, 0.02, SAMPLE_RANDOM);
            samplerTotal += COUNT;
            samplerSquares += COUNT * COUNT;
        }
        return {
            farmEventChance: BOSS_ACQUISITION_CHANCE({
                farmEvent: true,
            }),
            zeroRollCalls,
            firstXp: FIRST.receipt.xpAmount,
            duplicateXp: DUPLICATE.receipt.xpAmount,
            duplicateStatus: DUPLICATE.receipt.xpStatus,
            rollCount: MULTI.receipt.rollCount,
            successCount: MULTI.receipt.successCount,
            grantedCount: MULTI.receipt.grantedCount,
            tier: MULTI.receipt.tier,
            fractional: {
                rollBudget: FRACTIONAL.receipt.rollBudget,
                bonusRollChance: FRACTIONAL.receipt.bonusRollChance,
                rollCount: FRACTIONAL.receipt.rollCount,
                successCount: FRACTIONAL.receipt.successCount,
                tier: FRACTIONAL.receipt.tier,
            },
            stageFive: BOSS_STAGE_STATS(5),
            high: {
                rollBudget: HIGH.receipt.rollBudget,
                successCount: HIGH.receipt.successCount,
                grantedCount: HIGH.receipt.grantedCount,
                status: HIGH.receipt.status,
                durationMs: HIGH_DURATION_MS,
                restoredSuccessCount: RESTORED_RECEIPT.successCount,
                restoredGrantedCount: SAVED_PROGRESS.ledger.boss.pendingRewards.find(
                    (reward) => reward.encounterId === 903,
                ).grantedCount,
                releasedGrants: RELEASED.length,
                resumedGrantedCount: RESUMED_RECEIPT.grantedCount,
                resumedPending: RESUMED_RECEIPT.status === 'pending',
            },
            samplerMean: samplerTotal / 8000,
            samplerVariance: samplerSquares / 8000 - (samplerTotal / 8000) ** 2,
            earned: WORLD.playerProgression.processedBossKillReceipts.filter((key) => key === 'stage-zero-roll-xp')
                .length,
        };
    });
    const {
        high: HIGH_STAGE,
        samplerMean: SAMPLER_MEAN,
        samplerVariance: SAMPLER_VARIANCE,
        ...KNOWN_REWARDS
    } = REWARD_INVARIANT;
    assert.deepEqual(KNOWN_REWARDS, {
        farmEventChance: 0.04,
        zeroRollCalls: 0,
        firstXp: 41,
        duplicateXp: 41,
        duplicateStatus: 'awarded',
        rollCount: 2,
        successCount: 1,
        grantedCount: 1,
        tier: 1,
        fractional: {
            rollBudget: 1.5,
            bonusRollChance: 0.5,
            rollCount: 2,
            successCount: 1,
            tier: 1,
        },
        stageFive: {
            stage: 5,
            hp: 1012.5,
            attackPower: 8.2944,
            xp: 101,
            rollBudget: 5.0625,
            rolls: 5,
            bonusRollChance: 0.0625,
        },
        earned: 1,
    });
    assert.equal(HIGH_STAGE.rollBudget, Math.pow(1.5, 60));
    assert(Number.isSafeInteger(HIGH_STAGE.successCount) && HIGH_STAGE.successCount > 1000);
    assert.equal(HIGH_STAGE.grantedCount, 0, 'full roster keeps each high-stage success pending');
    assert.equal(HIGH_STAGE.status, 'pending');
    assert(HIGH_STAGE.durationMs < 2000, 'the maximum stage does not iterate over billions of draws');
    assert.equal(HIGH_STAGE.restoredSuccessCount, HIGH_STAGE.successCount);
    assert.equal(HIGH_STAGE.restoredGrantedCount, 0);
    assert.equal(HIGH_STAGE.releasedGrants, 1);
    assert.equal(HIGH_STAGE.resumedGrantedCount, 1);
    assert.equal(HIGH_STAGE.resumedPending, true);
    assert(Math.abs(SAMPLER_MEAN - 20) < 0.5, 'binomial sampling mean matches n × p');
    assert(Math.abs(SAMPLER_VARIANCE - 19.6) < 2, 'binomial sampling variance matches n × p × (1 − p)');
    CHECK(
        'Boss rewards use geometric draw budgets, fractional rolls, a 2%/4% independent chance, and resumable T1 grants',
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
    await openMenuTab(M, 'help');
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
    await openMenuTab(M, 'help');
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
    const SWEEP = await p.evaluate(async () => {
        const { bossDangerContour: BOSS_DANGER_CONTOUR } = await import('/src/attack-telegraph.js'),
            W = new BUDMORI.sim.constructor(774);
        W.setScene('raid');
        W.units = W.units.slice(0, 2);
        const [CENTER, RING] = W.units;
        W.boss.x = 0;
        W.boss.y = 0;
        W.boss.hp = W.boss.maxHp = 1e6;
        Object.assign(CENTER, {
            x: 0,
            y: 0,
            z: 0,
            vx: 0,
            vy: 0,
            vz: 0,
            hp: 10000,
            stun: 100,
            dropLanded: true,
        });
        Object.assign(RING, {
            x: 6.5,
            y: 0,
            z: 0,
            vx: 0,
            vy: 0,
            vz: 0,
            hp: 10000,
            stun: 100,
            dropLanded: true,
        });
        W._rebuildUnitSpatialIndex();
        W.beginBossPattern('attack.sweep-360', RING);
        const ACTION = W.boss.patternRuntime.active;
        ACTION.aim = 0;
        W.activateBossPattern(ACTION);
        const IMMEDIATE_HITS = ACTION.hitIds.size,
            INITIAL_CENTER_HP = CENTER.hp,
            INITIAL_RING_HP = RING.hp,
            AREA = W.bossAttackArea(0),
            CONTOUR = new Float64Array(512),
            COUNT = BOSS_DANGER_CONTOUR(AREA, CONTOUR),
            RADII = Array.from({ length: COUNT }, (_, index) =>
                Math.hypot(CONTOUR[index * 2] - AREA.x, CONTOUR[index * 2 + 1] - AREA.y),
            ),
            CONTAINS = (x, y) => {
                let inside = false;
                for (let i = 0, j = COUNT - 1; i < COUNT; j = i++) {
                    const XI = CONTOUR[i * 2],
                        YI = CONTOUR[i * 2 + 1],
                        XJ = CONTOUR[j * 2],
                        YJ = CONTOUR[j * 2 + 1];
                    if (YI > y !== YJ > y && x < ((XJ - XI) * (y - YI)) / (YJ - YI) + XI) {
                        inside = !inside;
                    }
                }
                return inside;
            },
            CENTER_IN_TELEGRAPH = CONTAINS(AREA.x, AREA.y),
            RING_IN_TELEGRAPH = CONTAINS(AREA.x + AREA.reach * Math.cos(0.4), AREA.y + AREA.reach * Math.sin(0.4));
        let activeSteps = 0;
        while (ACTION.phase === 'active' && activeSteps < 64) {
            W.step(1 / 60);
            activeSteps++;
        }
        return {
            phase: ACTION.phase,
            activeDuration: activeSteps / 60,
            immediateHits: IMMEDIATE_HITS,
            centerHpLoss: INITIAL_CENTER_HP - CENTER.hp,
            ringHpLoss: INITIAL_RING_HP - RING.hp,
            centerHit: ACTION.hitIds.has(CENTER.id),
            ringHit: ACTION.hitIds.has(RING.id),
            centerInTelegraph: CENTER_IN_TELEGRAPH,
            ringInTelegraph: RING_IN_TELEGRAPH,
            minTelegraphRadius: Math.min(...RADII),
            maxTelegraphRadius: Math.max(...RADII),
            reach: AREA.reach,
            width: AREA.width,
            sweepHits: W.metrics.sweepHits,
        };
    });
    assert.equal(SWEEP.immediateHits, 0, 'sweep does not hit the entire disk at activation');
    assert.equal(SWEEP.centerHit, false, 'the sweep leaves the safe interior clear');
    assert(SWEEP.ringHit && SWEEP.ringHpLoss > 0, 'the moving weapon capsule hits the outer ring');
    assert.equal(SWEEP.phase, 'recover', 'the 1.05 second physical sweep enters recovery after one full turn');
    assert(Math.abs(SWEEP.activeDuration - 1.05) < 1e-9, 'the full circle takes the configured 1.05 seconds');
    assert.equal(SWEEP.reach, 6.5, 'the weapon tip follows the authored radius');
    assert.equal(SWEEP.width, 0.85, 'the weapon uses the authored capsule radius');
    assert.equal(SWEEP.sweepHits, 1, 'the passing weapon damages a target no more than once per activation');
    assert.equal(SWEEP.centerInTelegraph, false, 'the warning contour excludes the boss-centered disk');
    assert.equal(SWEEP.ringInTelegraph, true, 'the warning contour covers the weapon radius');
    assert(
        Math.abs(SWEEP.minTelegraphRadius - (SWEEP.reach - SWEEP.width)) < 1e-6 &&
            Math.abs(SWEEP.maxTelegraphRadius - (SWEEP.reach + SWEEP.width)) < 1e-6,
        'the telegraph contour is a thin annulus around the weapon path',
    );
    REPORT.sweep360 = SWEEP;
    CHECK('Chestnut 360 sweep: delayed capsule hits the ring once; safe interior and annular telegraph stay clear');
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
                assert(Number.isFinite(NATIVE.time) && NATIVE.time >= -50);
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
                    if (!W.startManualMerge()) {
                        throw Error('configured five-material Mythic fusion was not selectable');
                    }
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
    assert((await P.locator('#bossName').textContent()).includes('EVENT STAGE 1'));
    assert.equal(await P.locator('#bossbar').isVisible(), true);
    assert.equal(await P.locator('#farmControls').isVisible(), false);
    assert.equal(await P.locator('#bossHealthNote').textContent(), '상대 능력치 고정');
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
    assert.equal(await P.evaluate(() => BUDMORI.sim.playerProgression.farmBossEventStage), 1);
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
    const STAGE_RESULTS = await P.evaluate(async () => {
        const W = BUDMORI.sim,
            { captureFarmProgress: CAPTURE_FARM_PROGRESS, restoreFarmProgress: RESTORE_FARM_PROGRESS } =
                await import('/src/farm-progress.js'),
            LEGACY_PROGRESS = CAPTURE_FARM_PROGRESS(W);
        delete LEGACY_PROGRESS.player.farmBossEventStage;
        const LEGACY_STAGE = RESTORE_FARM_PROGRESS(LEGACY_PROGRESS).playerProgression.farmBossEventStage;
        W.random = () => 0;
        W.playerProgression.farmBossEventStage = 1;
        const FIRST_STARTED = W.tryStartFarmBossEvent(0, 0),
            FIRST_BOSS_STAGE = W.boss.stage;
        W.farmBossEvent.phase = 'fighting';
        W.boss.hp = 0;
        const FIRST_VICTORY = W.finishFarmBossEvent('victory'),
            FIRST_NEXT_STAGE = W.playerProgression.farmBossEventStage,
            DUPLICATE_VICTORY = W.finishFarmBossEvent('victory');
        W.farmBossEvent = {
            phase: 'idle',
            elapsed: 0,
            outcome: 'idle',
            encounterId: 0,
            rewardStatus: 'none',
            rewardChance: 0,
            rewardRoll: 0,
            rewardUnitId: 0,
        };
        W.boss.active = false;
        W.playerProgression.farmBossEventStage = 5;
        const STAGE_FIVE_STARTED = W.tryStartFarmBossEvent(0, 0),
            STAGE_FIVE_BOSS = {
                stage: W.boss.stage,
                hp: W.boss.maxHp,
                attackPower: W.boss.attackPower,
            };
        W.farmBossEvent.phase = 'fighting';
        W.boss.hp = 0;
        const STAGE_FIVE_VICTORY = W.finishFarmBossEvent('victory'),
            STAGE_FIVE_RECEIPT = W.bossRewardReceipts.at(-1);
        delete W.random;
        return {
            legacyStage: LEGACY_STAGE,
            firstStarted: FIRST_STARTED,
            firstBossStage: FIRST_BOSS_STAGE,
            firstVictory: FIRST_VICTORY,
            firstNextStage: FIRST_NEXT_STAGE,
            duplicateVictory: DUPLICATE_VICTORY,
            stageFiveStarted: STAGE_FIVE_STARTED,
            stageFiveBoss: STAGE_FIVE_BOSS,
            stageFiveVictory: STAGE_FIVE_VICTORY,
            stageSix: W.playerProgression.farmBossEventStage,
            stageFiveReceipt: {
                tier: STAGE_FIVE_RECEIPT.tier,
                rollBudget: STAGE_FIVE_RECEIPT.rollBudget,
                rollCount: STAGE_FIVE_RECEIPT.rollCount,
                chance: STAGE_FIVE_RECEIPT.chance,
                acquisitionMultiplier: STAGE_FIVE_RECEIPT.acquisitionMultiplier,
            },
        };
    });
    assert.equal(STAGE_RESULTS.legacyStage, 1);
    assert.equal(STAGE_RESULTS.firstStarted, true);
    assert.equal(STAGE_RESULTS.firstBossStage, 1);
    assert.equal(STAGE_RESULTS.firstVictory, true);
    assert.equal(STAGE_RESULTS.firstNextStage, 2);
    assert.equal(STAGE_RESULTS.duplicateVictory, false);
    assert.equal(STAGE_RESULTS.stageFiveStarted, true);
    assert.equal(STAGE_RESULTS.stageFiveBoss.stage, 5);
    assert.equal(STAGE_RESULTS.stageFiveBoss.hp, 200 * 1.5 ** 4);
    assert.equal(STAGE_RESULTS.stageFiveBoss.attackPower, 4 * 1.2 ** 4);
    assert.equal(STAGE_RESULTS.stageFiveVictory, true);
    assert.equal(STAGE_RESULTS.stageSix, 6);
    assert.deepEqual(
        {
            tier: STAGE_RESULTS.stageFiveReceipt.tier,
            rollBudget: STAGE_RESULTS.stageFiveReceipt.rollBudget,
            chance: STAGE_RESULTS.stageFiveReceipt.chance,
            acquisitionMultiplier: STAGE_RESULTS.stageFiveReceipt.acquisitionMultiplier,
        },
        {
            tier: 1,
            rollBudget: 5.0625,
            chance: 0.04,
            acquisitionMultiplier: 2,
        },
    );
    assert([5, 6].includes(STAGE_RESULTS.stageFiveReceipt.rollCount));
    await goHome(P);
    const STAGE_SAVE = JSON.parse(await P.evaluate(() => localStorage.getItem('bloom-weapon-cards-v4'))).progress;
    assert.equal(STAGE_SAVE.player.farmBossEventStage, 6);
    await clean(P);
    CHECK(
        'Mobile 1% event spawn, stage HUD/scale/rewards, victory idempotency, legacy stage default, and progression save',
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
            upgrades,
            reset: progressionResetFlow,
            cadence: cadenceDiagnosticsFlow,
            formation: formationBrowserUI,
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
