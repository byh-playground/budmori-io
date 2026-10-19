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
    const BUTTON = p.locator('#deploymentCards .deployment-card').first();
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
            await p.locator('#deploymentCards .deployment-card').first().getAttribute('aria-pressed'),
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
                ' deployment card: one immediate troop, 100ms holds, weakest-tier-first perimeter drops, release and cancel',
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
    await p.evaluate(async () => {
        const W = BUDMORI.sim,
            U = W.spawn(1, 3, -4, 1);
        if (!U) {
            throw Error('could not seed one rare corn for the ability menu flow');
        }
        U.growth = BUDMORI.CONFIG.farm.breeding.matureMeals;
        U.growthDuration = W.breedGrowthDuration();
        U.growthElapsed = U.growthDuration;
        const STATE = W.playerProgression,
            ABILITY_SPENT = Object.values(STATE.abilities).reduce(
                (total, ability) =>
                    total +
                    ability.powerLevel +
                    Object.values(ability.branchLevels || {}).reduce((branchTotal, level) => branchTotal + level, 0),
                0,
            ),
            UPGRADE_SPENT = Object.values(STATE.farmUpgrades).reduce((total, level) => total + level, 0),
            PLOT_SPENT =
                (STATE.farmPlots.plots.length - 1) * 2 +
                STATE.farmPlots.plots.reduce((total, plot) => total + plot.capacityLevel, 0),
            FORMATION_SPENT =
                STATE.formationSkills.slots -
                1 +
                Object.values(STATE.formationSkills.levels).reduce((total, level) => total + level, 0),
            DEPLOYMENT_SPENT = STATE.raidDeploymentCards.unlockedSlots - 1;
        STATE.level = ABILITY_SPENT + UPGRADE_SPENT + PLOT_SPENT + FORMATION_SPENT + DEPLOYMENT_SPENT + 2;
        STATE.availablePoints = 1;
        STATE.experience = 0;
        const { isValidPlayerProgressionState: IS_VALID } = await import('/src/player-progression.js');
        if (!IS_VALID(STATE)) {
            throw Error(
                'invalid ability test progression fixture ' +
                    JSON.stringify({
                        level: STATE.level,
                        availablePoints: STATE.availablePoints,
                        abilitySpent: ABILITY_SPENT,
                        upgradeSpent: UPGRADE_SPENT,
                        plotSpent: PLOT_SPENT,
                        formationSpent: FORMATION_SPENT,
                        deploymentSpent: DEPLOYMENT_SPENT,
                        farmPlots: STATE.farmPlots,
                    }),
            );
        }
    });
    await openMenuTab(p, 'abilities');
    await p.locator('[data-ability-species="1"]').click();
    const POWER = p.locator('[data-ability="corn-kernel-chain"] [data-ability-node="corn-kernel-chain:power:1"]');
    await POWER.waitFor({
        state: 'visible',
    });
    assert.equal(
        await POWER.getAttribute('aria-disabled'),
        'false',
        'the selected species ability upgrade is available',
    );
    await POWER.click();
    await p.waitForFunction(() => BUDMORI.sim.playerProgression.abilities['corn-kernel-chain'].powerLevel === 1);
    await p.waitForFunction(() => document.querySelector('#abilityPoints')?.textContent.trim() === '0');
    assert.equal(await p.evaluate(() => BUDMORI.sim.playerProgression.availablePoints), 0);
    await closeMenu(p);
    CHECK('Ability menu selects Corn, purchases its first power upgrade, and spends one shared XP point');
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
            const ARC_SHAPE_TRACE = await P.evaluate(async () => {
                const { StormCloudPresentation: CLOUD_PRESENTATION } =
                        await import('/src/features/formation-skills/storm-cloud/presentation.js'),
                    PATHS_FOR = (pulse) => {
                        const PATHS = [];
                        let activePath = null;
                        const CTX = {
                                beginPath() {
                                    activePath = [];
                                    PATHS.push(activePath);
                                },
                                moveTo(x, y) {
                                    activePath.push([x, y]);
                                },
                                lineTo(x, y) {
                                    activePath.push([x, y]);
                                },
                                stroke() {},
                            },
                            RENDERER = {
                                ctx: CTX,
                                scale: 1,
                                pixelRatio: 1,
                                project: (x, y, z) => ({ x, y: y - z }),
                                ellipse() {},
                            };
                        new CLOUD_PRESENTATION().draw(RENDERER, {
                            id: 31415,
                            x: 0,
                            y: 0,
                            z: 4,
                            targetX: 0,
                            targetY: 0,
                            targetZ: 2,
                            bodyRadius: 1,
                            age: 0.8,
                            duration: 5,
                            pulse,
                        });
                        return PATHS;
                    },
                    FIRST_ARCS = PATHS_FOR(1).filter((path) => path.length === 13),
                    NEXT_ARCS = PATHS_FOR(2).filter((path) => path.length === 13),
                    FIRST_SHAPES = [...new Set(FIRST_ARCS.map((path) => JSON.stringify(path)))],
                    NEXT_SHAPES = [...new Set(NEXT_ARCS.map((path) => JSON.stringify(path)))];
                return {
                    simultaneousArcs: FIRST_SHAPES.length,
                    attacksVary: JSON.stringify(FIRST_SHAPES) !== JSON.stringify(NEXT_SHAPES),
                };
            });
            await P.waitForTimeout(80);
            await clean(P);
            await P.screenshot({ path: path.join(OUT, 'formation-sky-beams.png') });
            assert.equal(ARC_TRACE.pulseAdvanced, true);
            assert.equal(ARC_TRACE.presentationCarriesPulse, true);
            assert.equal(ARC_TRACE.activeVisualPhase, true);
            assert.equal(ARC_SHAPE_TRACE.simultaneousArcs, 3);
            assert.equal(ARC_SHAPE_TRACE.attacksVary, true);
        }
    }
    await openMenuTab(P, 'formation');
    assert.equal(await P.locator('[data-formation-equip="giant"]').isDisabled(), true);
    const UFO_TRACE = await P.evaluate(async () => {
        const [{ UfoSkill: UFO_SKILL }, { UfoPresentation: UFO_PRESENTATION }] = await Promise.all([
                import('/src/features/formation-skills/ufo/model.js'),
                import('/src/features/formation-skills/ufo/presentation.js'),
            ]),
            TARGET = {
                id: 7,
                x: 0,
                y: 0,
                z: 0,
                height: 2.4,
                radius: 0.9,
                giantScale: 3,
                giantUntil: 0,
                hp: 100,
                faction: 'enemy',
            };
        let damageCount = 0,
            strokeCount = 0,
            ringCount = 0;
        const ELLIPSE_WIDTHS = [];
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
                ellipse(_x, _y, width) {
                    ELLIPSE_WIDTHS.push(width);
                },
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
        const LARGE_UFO_WIDTH = Math.max(...ELLIPSE_WIDTHS);
        ELLIPSE_WIDTHS.length = 0;
        PRESENTATION.draw(RENDERER, {
            ...EFFECT,
            age: 0.95,
            lastPulse: 0.8,
            bodyRadius: TARGET.radius / 2,
            beamTarget: false,
        });
        const HALF_RADIUS_UFO_WIDTH = Math.max(...ELLIPSE_WIDTHS);
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
            beamTargetZ: EFFECT.beamTargetZ,
            bodyHeight: EFFECT.bodyHeight,
            bodyRadius: EFFECT.bodyRadius,
            largeToHalfRadiusWidth: LARGE_UFO_WIDTH / HALF_RADIUS_UFO_WIDTH,
        };
    });
    assert.deepEqual(UFO_TRACE, {
        beamTargetFound: true,
        gapStrokes: 3,
        gapRings: 0,
        noTargetStrokes: 3,
        damageByStep: [0, 1, 1, 1, 1, 2],
        capturedBeamTarget: true,
        beamTargetZ: 2.4,
        bodyHeight: 2.4,
        bodyRadius: 0.9,
        largeToHalfRadiusWidth: 2,
    });
    const HAMMER_TRACE = await P.evaluate(async () => {
        const [{ HammerSkill: HAMMER_SKILL }, { HammerPresentation: HAMMER_PRESENTATION }] = await Promise.all([
                import('/src/features/formation-skills/hammer/model.js'),
                import('/src/features/formation-skills/hammer/presentation.js'),
            ]),
            TARGET = { id: 8, x: 1, y: 2, z: 0.3, height: 2.4, radius: 0.9, giantScale: 3, stun: 0 };
        let effect = null,
            damage = 0;
        const SKILL = new HAMMER_SKILL();
        SKILL.cast(
            {
                enemy: () => TARGET,
                addEffect(_id, createdEffect) {
                    effect = createdEffect;
                },
                damage(_target, amount) {
                    damage += amount;
                },
            },
            { level: 1 },
        );
        const PROJECTED = (age) => {
            let head = null;
            const CTX = {
                    globalAlpha: 1,
                    beginPath() {},
                    moveTo() {},
                    lineTo() {},
                    stroke() {},
                    fill() {},
                    roundRect(_x, y, width, height) {
                        if (!head) {
                            head = { y: y + height / 2, width };
                        }
                    },
                },
                RENDERER = {
                    ctx: CTX,
                    scale: 1,
                    pixelRatio: 1,
                    project: (x, _y, z) => ({ x, y: -z }),
                    ellipse() {},
                    ring() {},
                };
            new HAMMER_PRESENTATION().draw(RENDERER, { ...effect, age });
            return head;
        };
        return {
            bodyHeight: effect.bodyHeight,
            bodyRadius: effect.bodyRadius,
            effectZ: effect.z,
            damage,
            stun: TARGET.stun,
            start: PROJECTED(0),
            early: PROJECTED(0.2),
            middle: PROJECTED(0.3),
            late: PROJECTED(0.4),
        };
    });
    assert.equal(HAMMER_TRACE.bodyHeight, 2.4);
    assert.equal(HAMMER_TRACE.bodyRadius, 0.9);
    assert.equal(HAMMER_TRACE.effectZ, 0.3);
    assert.equal(HAMMER_TRACE.damage, 50);
    assert.equal(HAMMER_TRACE.stun, 1);
    assert(HAMMER_TRACE.start.width > 0.9 * 4, 'the giant hammer scales from the target body radius');
    assert(
        HAMMER_TRACE.start.y < HAMMER_TRACE.early.y &&
            HAMMER_TRACE.middle.y - HAMMER_TRACE.early.y < HAMMER_TRACE.late.y - HAMMER_TRACE.middle.y,
        'the hammer telegraphs above the head and accelerates into impact',
    );
    await C.close();
    CHECK(
        'Formation visuals share target body dimensions; storm arcs vary in groups, hammer descends from above the head, and damage cadence stays unchanged',
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
    await openMenuTab(P, 'farms');
    assert.equal(await P.evaluate(() => location.hash), '#/farms');
    const FARM_COPY = await P.evaluate(() => {
        const PANEL = document.querySelector('#farmPanel'),
            PLOT = document.querySelector('#farmPlotList button'),
            FEED = document.querySelector('#feed');
        return {
            text: PANEL.innerText,
            plotText: PLOT.textContent,
            plotLabel: PLOT.getAttribute('aria-label'),
            rawIdVisible: PANEL.innerText.includes('plot-1'),
            feedText: FEED.innerText,
            feedLabel: FEED.getAttribute('aria-label'),
            feedPips: FEED.querySelectorAll('.tap-pip').length,
            warehousePips: document.querySelectorAll('#warehouseProgress .tap-pip').length,
        };
    });
    assert(FARM_COPY.plotText.includes('\uB18D\uC7A5 1') && FARM_COPY.plotLabel.includes('\uB18D\uC7A5 1'));
    assert.equal(FARM_COPY.rawIdVisible, false, 'stable plot IDs stay out of visible labels');
    assert(FARM_COPY.feedText.includes('\uBA39\uC774 \uC8FC\uAE30'));
    assert(FARM_COPY.feedLabel.includes('\uD604\uC7AC \uB18D\uC7A5'));
    assert.equal(FARM_COPY.feedPips, 0, 'scatter button has no warehouse count or auto progress meter');
    assert.equal(FARM_COPY.warehousePips, 5, 'auto progress meter is shown in the warehouse');
    assert(!/Farm plots|Warehouse food|Expand current|Unlock farm|Sort by species|target share/i.test(FARM_COPY.text));
    for (const VIEWPORT of [
        { width: 320, height: 568 },
        { width: 568, height: 320 },
    ]) {
        await P.setViewportSize(VIEWPORT);
        const MENU_GEOMETRY = await P.evaluate(() => {
            const PANEL = document.querySelector('#farmPanel'),
                CLOSE = document.querySelector('#gameMenuClose'),
                CLOSE_BOX = CLOSE.getBoundingClientRect(),
                SCROLL = getComputedStyle(PANEL).overflowY;
            PANEL.scrollTop = PANEL.scrollHeight;
            return {
                isScrollablePane: SCROLL === 'auto' && PANEL.scrollHeight >= PANEL.clientHeight,
                closeVisible:
                    CLOSE.getBoundingClientRect().top >= 0 && CLOSE.getBoundingClientRect().bottom <= innerHeight,
                closeHitTarget:
                    document.elementFromPoint(
                        (CLOSE_BOX.left + CLOSE_BOX.right) / 2,
                        (CLOSE_BOX.top + CLOSE_BOX.bottom) / 2,
                    )?.id === 'gameMenuClose',
                pageOverflow:
                    document.documentElement.scrollWidth > innerWidth ||
                    document.documentElement.scrollHeight > innerHeight,
                plotActionHeight: [...document.querySelectorAll('#farmPlotList button, #farmPlotActions button')].every(
                    (button) => button.getBoundingClientRect().height >= 44,
                ),
            };
        });
        assert.deepEqual(
            MENU_GEOMETRY,
            {
                isScrollablePane: true,
                closeVisible: true,
                closeHitTarget: true,
                pageOverflow: false,
                plotActionHeight: true,
            },
            `Farm menu geometry ${VIEWPORT.width}x${VIEWPORT.height}`,
        );
    }
    await P.reload();
    await P.waitForFunction(
        () => window.BUDMORI && location.hash === '#/farms' && !document.querySelector('#gameMenuOverlay').hidden,
    );
    await P.goBack();
    await P.waitForFunction(() => location.hash === '#/growth');
    await P.goForward();
    await P.waitForFunction(() => location.hash === '#/farms' && !document.querySelector('#farmPanel').hidden);
    await P.locator('#farmPanel h2').click();
    assert.equal(
        await P.locator('#gameMenuOverlay').isVisible(),
        true,
        'clicking the panel does not trigger backdrop close',
    );
    await P.locator('#gameMenuClose').click();
    await P.waitForFunction(() => document.querySelector('#gameMenuOverlay').hidden);
    assert.equal(
        await P.evaluate(() => document.activeElement.id),
        'upgradeMenu',
        'close button restores launcher focus',
    );
    await openMenuTab(P, 'farms');
    await P.keyboard.press('Escape');
    await P.waitForFunction(() => document.querySelector('#gameMenuOverlay').hidden);
    assert.equal(await P.evaluate(() => document.activeElement.id), 'upgradeMenu', 'Escape restores launcher focus');
    await openMenuTab(P, 'farms');
    await P.locator('#gameMenuOverlay').click({ position: { x: 1, y: 1 } });
    await P.waitForFunction(() => document.querySelector('#gameMenuOverlay').hidden);
    assert.equal(
        await P.evaluate(() => document.activeElement.id),
        'upgradeMenu',
        'backdrop close restores launcher focus',
    );
    const FEED_PROBE = await P.evaluate(() => {
        const W = BUDMORI.sim,
            ORIGINAL_EVENT = W.tryStartFarmBossEvent;
        W.tryStartFarmBossEvent = () => false;
        W.food.length = 0;
        W._foodSpatialDirty = true;
        W.warehouseFood = 4;
        W.foodTaps.remainder = 3;
        const MANUAL_PROGRESS_TAP = W.tapFood('manual'),
            AFTER_REJECT = { stock: W.warehouseFood, remainder: W.foodTaps.remainder, food: W.food.length };
        W.tapFood('auto');
        W.tapFood('auto');
        const AFTER_AUTO = { stock: W.warehouseFood, remainder: W.foodTaps.remainder, food: W.food.length };
        const SCATTER_ACCEPTED = W.scatterFoodAtRandomLocation(),
            AFTER_SCATTER = { stock: W.warehouseFood, remainder: W.foodTaps.remainder, food: W.food.length };
        W.food.length = 140;
        W.warehouseFood = 2;
        const FULL_FLOOR_ACCEPTED = W.scatterFoodAtRandomLocation(),
            AFTER_FULL_FLOOR = { stock: W.warehouseFood, food: W.food.length };
        W.food.length = 0;
        W.warehouseFood = 0;
        const EMPTY_STOCK_ACCEPTED = W.scatterFoodAtRandomLocation(),
            AFTER_EMPTY_STOCK = { stock: W.warehouseFood, food: W.food.length };
        W._foodSpatialDirty = true;
        W.tryStartFarmBossEvent = ORIGINAL_EVENT;
        return {
            manualProgressTap: MANUAL_PROGRESS_TAP,
            afterReject: AFTER_REJECT,
            afterAuto: AFTER_AUTO,
            scatterAccepted: SCATTER_ACCEPTED,
            afterScatter: AFTER_SCATTER,
            fullFloorAccepted: FULL_FLOOR_ACCEPTED,
            afterFullFloor: AFTER_FULL_FLOOR,
            emptyStockAccepted: EMPTY_STOCK_ACCEPTED,
            afterEmptyStock: AFTER_EMPTY_STOCK,
        };
    });
    assert.deepEqual(
        FEED_PROBE,
        {
            manualProgressTap: false,
            afterReject: { stock: 4, remainder: 3, food: 0 },
            afterAuto: { stock: 5, remainder: 0, food: 0 },
            scatterAccepted: true,
            afterScatter: { stock: 4, remainder: 0, food: 1 },
            fullFloorAccepted: false,
            afterFullFloor: { stock: 2, food: 140 },
            emptyStockAccepted: false,
            afterEmptyStock: { stock: 0, food: 0 },
        },
        'warehouse production and manual scatter have independent accounting',
    );
    await P.evaluate(() => {
        const W = BUDMORI.sim,
            R = BUDMORI.runtime,
            PROBE = { original: R.queue, commands: [] };
        R.queue = (...args) => PROBE.commands.push(args);
        window.__farmFeedProbe = PROBE;
        W.warehouseFood = 20;
        W.food.length = 0;
        W._foodSpatialDirty = true;
    });
    await P.waitForFunction(() => !document.querySelector('#feed').disabled);
    const QUEUED_BEFORE = await P.evaluate(() => window.__farmFeedProbe.commands.length);
    await P.locator('#feed').click();
    await P.waitForFunction((count) => window.__farmFeedProbe.commands.length === count + 1, QUEUED_BEFORE);
    const QUEUED_BEFORE_HOLD = await P.evaluate(() => window.__farmFeedProbe.commands.length),
        FEED_BOX = await P.locator('#feed').boundingBox();
    await P.mouse.move(FEED_BOX.x + FEED_BOX.width / 2, FEED_BOX.y + FEED_BOX.height / 2);
    await P.mouse.down();
    await P.waitForTimeout(260);
    await P.mouse.up();
    await P.waitForFunction((count) => window.__farmFeedProbe.commands.length === count + 2, QUEUED_BEFORE_HOLD);
    const QUEUED_AFTER_HOLD = await P.evaluate(() => window.__farmFeedProbe.commands.length);
    await P.waitForTimeout(140);
    assert.equal(
        await P.evaluate(() => window.__farmFeedProbe.commands.length),
        QUEUED_AFTER_HOLD,
        'release stops repeat feeding',
    );
    const QUEUED_BEFORE_CANCEL = await P.evaluate(() => window.__farmFeedProbe.commands.length);
    await P.evaluate(() => {
        document.querySelector('#feed').addEventListener(
            'pointerdown',
            (event) => {
                window.__farmFeedPointerId = event.pointerId;
            },
            { once: true, capture: true },
        );
    });
    await P.mouse.down();
    await P.waitForTimeout(30);
    await P.evaluate(() =>
        document
            .querySelector('#feed')
            .dispatchEvent(new PointerEvent('pointercancel', { pointerId: window.__farmFeedPointerId, bubbles: true })),
    );
    await P.mouse.up();
    await P.waitForTimeout(50);
    await P.mouse.down();
    await P.waitForTimeout(30);
    await P.evaluate(() => window.dispatchEvent(new Event('blur')));
    await P.mouse.up();
    await P.waitForTimeout(150);
    assert.equal(
        await P.evaluate(() => window.__farmFeedProbe.commands.length),
        QUEUED_BEFORE_CANCEL,
        'pointercancel and blur cancel pending input',
    );
    await P.evaluate(() => {
        const { original: ORIGINAL, commands: COMMANDS } = window.__farmFeedProbe;
        BUDMORI.runtime.queue = ORIGINAL;
        delete window.__farmFeedProbe;
        if (!COMMANDS.length) {
            throw Error('feed button did not enqueue its manual requests');
        }
    });
    await P.setViewportSize({ width: 1280, height: 800 });
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
    const ABILITY_NOTE = await P.locator('.ability-tree__note').textContent();
    assert(ABILITY_NOTE.includes('Common(T1)') && !ABILITY_NOTE.includes('Rare(T3)'));
    for (const [SPECIES, ID, ROLE] of [
        [6, 'rice-low-health-harvest', '수확'],
        [7, 'wheat-command-crit', '치명타'],
        [8, 'barley-armor-break', '방어도'],
    ]) {
        await P.locator(`[data-ability-species="${SPECIES}"]`).click();
        const CARD = P.locator(`[data-ability="${ID}"]`);
        const CARD_TEXT = await CARD.textContent();
        assert(ID === 'wheat-command-crit' ? CARD_TEXT.includes('공격 속도') : CARD_TEXT.includes(ROLE));
        assert.equal(await CARD.locator(`[data-ability-node="${ID}:root"]`).count(), 0);
        await CARD.locator(`[data-ability-node="${ID}:power:1"]`).click();
        await P.waitForFunction((id) => BUDMORI.sim.playerProgression.abilities[id].powerLevel === 1, ID);
        if (ID === 'wheat-command-crit') {
            await P.waitForTimeout(220);
            const RANGE_NODE = CARD.locator(`[data-ability-node="${ID}:branch-range:1"]`);
            await RANGE_NODE.scrollIntoViewIfNeeded();
            await RANGE_NODE.click();
            await P.waitForFunction((id) => BUDMORI.sim.playerProgression.abilities[id].branchLevels.range === 1, ID);
            await P.waitForFunction(
                (id) =>
                    document
                        .querySelector(`[data-ability="${id}"] .ability-card__current-effect`)
                        ?.textContent.includes('×3'),
                ID,
            );
        }
        await P.waitForTimeout(220);
        assert((await CARD.locator('.ability-card__current-effect').textContent()).trim().length > 0);
        assert((await CARD.locator('.ability-card__grade').textContent()).includes('Common(T1)'));
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
    assert.equal(await P.locator('#menuTabDeployment').getAttribute('aria-selected'), 'true');
    await P.locator('#menuTabDeployment').press('ArrowRight');
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
    assert((await P.locator('.ability-card__current-effect').textContent()).includes('55%p'));
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
                    compact: BOX.height < 100,
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
                    compact: true,
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
async function raidHudGeometryOnly() {
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
    await P.locator('#raid').tap();
    await P.locator('#bossEncounterChallenge').tap();
    await P.waitForFunction(() => BUDMORI.sim.scene === 'raid');
    await P.evaluate(() => {
        BUDMORI.runtime.paused = true;
    });
    for (const VIEWPORT of [
        { width: 320, height: 568 },
        { width: 844, height: 390 },
    ]) {
        await P.setViewportSize(VIEWPORT);
        await P.waitForTimeout(80);
        const GEOMETRY = await P.evaluate(() => {
            const HUD = document.querySelector('.formation-dock'),
                RECT = (box) => ({ left: box.left, right: box.right, top: box.top, bottom: box.bottom }),
                INTERSECTS = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top,
                BOX = HUD.getBoundingClientRect(),
                ELEMENTS = [
                    ...document.querySelectorAll(
                        '.controls:not([hidden]), .raid-panel:not([hidden]), .utility, #bossbar:not([hidden])',
                    ),
                ]
                    .filter((element) => element.getClientRects().length)
                    .map((element) => ({
                        label: element.id || element.className,
                        rect: RECT(element.getBoundingClientRect()),
                    }));
            return {
                hud: RECT(BOX),
                intersections: ELEMENTS.filter(({ rect }) => INTERSECTS(BOX, rect)),
                elements: ELEMENTS,
            };
        });
        await P.screenshot({
            path: path.join(OUT, `raid-hud-overlap-probe-${VIEWPORT.width}x${VIEWPORT.height}.png`),
        });
        assert.deepEqual(
            GEOMETRY.intersections,
            [],
            VIEWPORT.width + 'x' + VIEWPORT.height + ' ' + JSON.stringify(GEOMETRY),
        );
    }
    await clean(P);
    await C.close();
    CHECK('Raid 320x568 skill dock does not overlap deployment or gameplay controls');
}
async function raidDeploymentCardsFlow() {
    const C = await browser.newContext({ viewport: { width: 1680, height: 893 }, hasTouch: true }),
        P = await open(C);
    await P.locator('#newGame').click();
    const SAVE_FAILURE = await P.evaluate(() => {
        const WORLD = BUDMORI.sim,
            STORAGE = BUDMORI.storage,
            KEY = 'bloom-weapon-cards-v4';
        if (!STORAGE.save(WORLD)) {
            throw Error('could not prepare the Farm checkpoint for failure diagnostics');
        }
        const RAW = localStorage.getItem(KEY),
            SAVED_PROGRESS = JSON.stringify(STORAGE.savedProgress),
            PRODUCED = WORLD.foodTaps.produced;
        STORAGE.serializeCheckpoint = () => {
            throw new TypeError('synthetic Farm encode failure');
        };
        WORLD.foodTaps.produced++;
        let saved;
        try {
            saved = STORAGE.save(WORLD);
        } finally {
            WORLD.foodTaps.produced = PRODUCED;
            delete STORAGE.serializeCheckpoint;
        }
        const DIAGNOSTIC = JSON.parse(globalThis.BloomDiagnostics.detail()).diagnostics.errors.at(-1);
        return {
            saved,
            rawPreserved: localStorage.getItem(KEY) === RAW && STORAGE.raw === RAW,
            progressPreserved: JSON.stringify(STORAGE.savedProgress) === SAVED_PROGRESS,
            error: STORAGE.error,
            diagnostic: DIAGNOSTIC,
            rawIncludedInDiagnostic: JSON.stringify(DIAGNOSTIC).includes(RAW),
        };
    });
    assert.equal(SAVE_FAILURE.saved, false, 'an encoding failure blocks the checkpoint');
    assert.equal(SAVE_FAILURE.rawPreserved, true, 'a failed checkpoint keeps the original storage string');
    assert.equal(SAVE_FAILURE.progressPreserved, true, 'a failed checkpoint keeps the last valid progress');
    assert.match(SAVE_FAILURE.error, /검증·인코딩/);
    assert.match(SAVE_FAILURE.diagnostic.message, /TypeError: synthetic Farm encode failure/);
    assert.match(SAVE_FAILURE.diagnostic.cause, /operation=progress-validate-encode/);
    assert.equal(SAVE_FAILURE.diagnostic.origin, 'farm-storage');
    assert.equal(SAVE_FAILURE.rawIncludedInDiagnostic, false, 'save contents are excluded from diagnostics');
    await P.evaluate(() => {
        const W = BUDMORI.sim;
        W.playerProgression.level = 101;
        W.playerProgression.availablePoints = 100;
        for (const [SPECIES, TIER, X, Y] of [
            [1, 1, -4, -1],
            [1, 1, -2, -1],
            [1, 2, 0, -1],
            [1, 2, 2, -1],
            [1, 3, 4, -1],
            [2, 1, -4, 1],
            [3, 1, -2, 1],
        ]) {
            if (!W.spawn(SPECIES, TIER, X, Y)) {
                throw Error('could not seed the deployment-card roster');
            }
        }
        W.markProgressChanged();
    });
    await openMenuTab(P, 'deployment');
    assert.equal(await P.locator('#deploymentSpecies0').inputValue(), '0', 'fresh saves give slot 1 to Pea');
    await P.locator('#menuTabAbilities').click();
    const ABILITY_NOTE = await P.evaluate(async () => {
        const [{ SPECIES_ABILITY_DEFINITIONS }, { SPECIES_CATALOG }] = await Promise.all([
            import('/src/ability-catalog.js'),
            import('/src/species-catalog.js'),
        ]);
        return {
            text: document.querySelector('.ability-tree__note').textContent,
            defaults: [
                ...new Set(
                    SPECIES_ABILITY_DEFINITIONS.filter((definition) => definition.defaultUnlocked).map(
                        (definition) => definition.species,
                    ),
                ),
            ].map((id) => SPECIES_CATALOG.find((species) => species.id === id).name),
            locked: [
                ...new Set(
                    SPECIES_ABILITY_DEFINITIONS.filter((definition) => !definition.defaultUnlocked).map(
                        (definition) => definition.species,
                    ),
                ),
            ].map((id) => SPECIES_CATALOG.find((species) => species.id === id).name),
        };
    });
    assert(ABILITY_NOTE.text.includes('Common(T1)'), 'the ability panel identifies the common T1 baseline');
    for (const NAME of ABILITY_NOTE.defaults) {
        assert(ABILITY_NOTE.text.includes(NAME), `default ability note includes ${NAME}`);
    }
    for (const NAME of ABILITY_NOTE.locked.filter(
        (lockedName) =>
            !ABILITY_NOTE.defaults.some(
                (defaultName) => defaultName.includes(lockedName) || lockedName.includes(defaultName),
            ),
    )) {
        assert(!ABILITY_NOTE.text.includes(NAME), `default ability note does not imply ${NAME} is free`);
    }
    await P.locator('[data-ability-species="2"]').click();
    const KIDNEY_CARD = P.locator('[data-ability="kidney-continuous-leap"]');
    assert((await KIDNEY_CARD.locator('.ability-card__grade').textContent()).includes('공통 기본 능력'));
    assert.equal(await KIDNEY_CARD.locator('[aria-label="등급 완화 노드"]').count(), 0);
    assert((await KIDNEY_CARD.locator('.ability-card__current-effect').textContent()).includes('기본 능력'));
    await P.locator('[data-ability-species="0"]').click();
    assert(
        (await P.locator('[data-ability="pea-recovery-boost"] .ability-card__grade').textContent()).includes(
            '공통 기본 능력',
        ),
    );
    assert.equal(await P.locator('[data-ability-node="pea-death-split:root"]').getAttribute('aria-disabled'), 'true');
    await P.locator('#menuTabDeployment').click();
    for (let slot = 2; slot <= 4; slot++) {
        await P.locator('[data-deployment-buy-slot]').first().click();
        await P.waitForFunction(
            (count) => BUDMORI.sim.playerProgression.raidDeploymentCards.unlockedSlots === count,
            slot,
        );
    }
    for (const [SLOT, SPECIES] of [
        [1, 1],
        [2, 2],
        [3, 3],
    ]) {
        await P.locator(`#deploymentSpecies${SLOT}`).selectOption(String(SPECIES));
        await P.waitForFunction(
            ([index, id]) => BUDMORI.sim.playerProgression.raidDeploymentCards.speciesBySlot[index] === id,
            [SLOT, SPECIES],
        );
    }
    assert.equal(
        await P.locator('#deploymentSpecies1 option[value="0"]').isDisabled(),
        true,
        'the editor blocks assigning the same species twice',
    );
    assert.equal(
        await P.evaluate(() => BUDMORI.sim.raidDeploymentCards.select(1, 0)),
        false,
        'the model also rejects a duplicated species selection',
    );
    const SAVED_CARDS = await P.evaluate(() => structuredClone(BUDMORI.sim.playerProgression.raidDeploymentCards));
    await closeMenu(P);
    await P.locator('#menuHome').click();
    await P.waitForFunction(
        () => document.querySelector('#continueGame') && !document.querySelector('#continueGame').disabled,
    );
    await P.reload();
    await P.waitForFunction(() => window.BUDMORI);
    await P.locator('#continueGame').click();
    await P.waitForFunction(
        (expected) => JSON.stringify(BUDMORI.sim.playerProgression.raidDeploymentCards) === JSON.stringify(expected),
        SAVED_CARDS,
    );
    await openMenuTab(P, 'deployment');
    const BEFORE_CARD_RESET = await P.evaluate(() => BUDMORI.sim.playerProgression.availablePoints);
    await P.locator('#progressionResetCurrent').click();
    await P.waitForFunction((points) => {
        const STATE = BUDMORI.sim.playerProgression;
        return (
            STATE.availablePoints === points + 3 &&
            STATE.raidDeploymentCards.unlockedSlots === 1 &&
            JSON.stringify(STATE.raidDeploymentCards.speciesBySlot) === '[0,null,null,null]'
        );
    }, BEFORE_CARD_RESET);
    for (let slot = 2; slot <= 4; slot++) {
        await P.locator('[data-deployment-buy-slot]').first().click();
        await P.waitForFunction(
            (count) => BUDMORI.sim.playerProgression.raidDeploymentCards.unlockedSlots === count,
            slot,
        );
    }
    for (const [SLOT, SPECIES] of [
        [1, 1],
        [2, 2],
        [3, 3],
    ]) {
        await P.locator(`#deploymentSpecies${SLOT}`).selectOption(String(SPECIES));
        await P.waitForFunction(
            ([index, id]) => BUDMORI.sim.playerProgression.raidDeploymentCards.speciesBySlot[index] === id,
            [SLOT, SPECIES],
        );
    }
    await P.evaluate(() => {
        const W = BUDMORI.sim;
        for (let slot = 1; slot < 3; slot++) {
            if (!W.formationSkills.buySlot()) {
                throw Error('could not unlock the third formation skill slot');
            }
        }
        for (const [SLOT, ID] of ['giant', 'lightning', 'meteor'].entries()) {
            if (!W.formationSkills.purchase(ID) || !W.formationSkills.equip(SLOT, ID)) {
                throw Error('could not prepare three equipped formation skills');
            }
        }
        W.markProgressChanged();
    });
    await P.locator('#gameMenuClose').click();
    await P.locator('#raid').click();
    const FARM_PROGRESS_BEFORE_RAID = await P.evaluate(() => structuredClone(BUDMORI.storage.savedProgress));
    await P.locator('#bossEncounterChallenge').click();
    await P.waitForFunction(() => BUDMORI.sim.scene === 'raid' && BUDMORI.sim.raidRosters.length === 1);
    const RAID_RESERVATION = await P.evaluate(async (beforeProgress) => {
        const { validateFarmProgress: VALIDATE_FARM_PROGRESS } = await import('/src/farm-progress.js');
        const { snapshot: SNAPSHOT, validateSnapshot: VALIDATE_SNAPSHOT } = await import('/src/farm-state.js');
        const { encodeFarmSave: ENCODE_FARM_SAVE, decodeFarmSave: DECODE_FARM_SAVE } =
            await import('/src/farm-save-codec.js');
        const PROGRESS = BUDMORI.storage.savedProgress,
            RAID = PROGRESS.ledger.raid,
            EXPECTED = structuredClone(beforeProgress);
        EXPECTED.ledger.raid = structuredClone(RAID);
        const DIFFERENCES = (left, right, path = '') => {
            if (Object.is(left, right)) {
                return [];
            }
            if (
                !left ||
                !right ||
                typeof left !== 'object' ||
                typeof right !== 'object' ||
                Array.isArray(left) !== Array.isArray(right)
            ) {
                return [{ path, before: left, after: right }];
            }
            return [...new Set([...Object.keys(left), ...Object.keys(right)])].flatMap((key) =>
                DIFFERENCES(left[key], right[key], path ? `${path}.${key}` : key),
            );
        };
        const UNEXPECTED = DIFFERENCES(EXPECTED, PROGRESS);
        VALIDATE_FARM_PROGRESS(PROGRESS);
        const SAVED = ENCODE_FARM_SAVE(BUDMORI.storage.world, PROGRESS),
            ROUNDTRIP = DECODE_FARM_SAVE(SAVED.text),
            RAID_SNAPSHOT = SNAPSHOT(BUDMORI.sim);
        VALIDATE_FARM_PROGRESS(ROUNDTRIP);
        VALIDATE_SNAPSHOT(RAID_SNAPSHOT);
        return {
            activeSequence: RAID.activeRun?.sequence,
            nextSequence: RAID.nextRunSequence,
            settledThrough: RAID.settledThrough,
            roundtripActiveRun: ROUNDTRIP.ledger.raid.activeRun,
            reservationOnlyProgressChange: UNEXPECTED.length === 0,
            reservationProgressDifferences: UNEXPECTED,
            reservationSaveGrowth: JSON.stringify(PROGRESS).length - JSON.stringify(beforeProgress).length,
            rosterAbilityVersion: RAID_SNAPSHOT.raidRosters[0].abilitySnapshot.baselineAbilityMigrationVersion,
            rosterDeploymentCards: RAID_SNAPSHOT.raidRosters[0].abilitySnapshot.raidDeploymentCards,
        };
    }, FARM_PROGRESS_BEFORE_RAID);
    assert.equal(RAID_RESERVATION.activeSequence, RAID_RESERVATION.nextSequence);
    assert.equal(RAID_RESERVATION.activeSequence, RAID_RESERVATION.settledThrough + 1);
    assert.equal(
        RAID_RESERVATION.reservationOnlyProgressChange,
        true,
        `Raid reservation changes only the active-run ledger in saved Farm progress: ${JSON.stringify(RAID_RESERVATION.reservationProgressDifferences)}`,
    );
    assert.ok(
        RAID_RESERVATION.reservationSaveGrowth > 0,
        'Raid reservation adds only its run identifier fields to the progress envelope',
    );
    assert.deepEqual(RAID_RESERVATION.roundtripActiveRun, {
        sequence: RAID_RESERVATION.activeSequence,
        sessionId: `farm-raid-${RAID_RESERVATION.activeSequence}`,
    });
    assert.equal(
        RAID_RESERVATION.rosterAbilityVersion,
        2,
        'Raid roster snapshots retain the validated migration stamp',
    );
    assert.equal(
        RAID_RESERVATION.rosterDeploymentCards.unlockedSlots,
        4,
        'Raid roster snapshots retain card investment',
    );
    await P.evaluate(() => {
        BUDMORI.runtime.paused = false;
        BUDMORI.sim.boss.hp = BUDMORI.sim.boss.maxHp = 1e9;
    });
    await P.waitForFunction(() => document.querySelectorAll('#deploymentCards [data-deploy-species]').length === 4);
    assert.deepEqual(
        await P.evaluate(() => BUDMORI.sim.raidRoster('solo').deploymentCardSpecies),
        [0, 1, 2, 3],
        'Raid freezes the four selected species in their card order',
    );
    const CORN_ENTRIES = await P.evaluate(() =>
        BUDMORI.sim
            .raidRoster('solo')
            .troops.filter((troop) => troop.species === 1)
            .map((troop) => troop.tier),
    );
    assert.deepEqual(CORN_ENTRIES, [1, 1, 2, 2, 3], 'each card retains the existing weakest-tier-first order');
    await P.locator('[data-deploy-species="1"]').click();
    await P.waitForFunction(() => BUDMORI.sim.raidRoster('solo').lastDeploySequence === 1);
    assert.deepEqual(
        await P.evaluate(() => {
            const ROSTER = BUDMORI.sim.raidRoster('solo');
            return ROSTER.troops.filter((troop) => troop.species === 1 && troop.deployed).map((troop) => troop.tier);
        }),
        [1],
        'a single tap deploys exactly one selected Corn, starting at tier 1',
    );
    await P.evaluate(() => {
        window.__deploymentCardBeforeHold = document.querySelector('[data-deploy-species="1"]');
    });
    const CORN_CARD = await P.locator('[data-deploy-species="1"]').boundingBox();
    await P.mouse.move(CORN_CARD.x + CORN_CARD.width / 2, CORN_CARD.y + CORN_CARD.height / 2);
    await P.mouse.down();
    await P.waitForTimeout(260);
    await P.mouse.up();
    await P.waitForFunction(() => BUDMORI.sim.raidRoster('solo').lastDeploySequence >= 3);
    const AFTER_HOLD = await P.evaluate(() => BUDMORI.sim.raidRoster('solo').lastDeploySequence);
    assert(AFTER_HOLD >= 3 && AFTER_HOLD <= 5, 'holding repeats deployments at the 100ms cadence');
    assert.equal(
        await P.evaluate(
            () => window.__deploymentCardBeforeHold === document.querySelector('[data-deploy-species="1"]'),
        ),
        true,
        'count refreshes preserve the held card DOM node and pointer capture',
    );
    await P.waitForTimeout(180);
    assert.equal(
        await P.evaluate(() => BUDMORI.sim.raidRoster('solo').lastDeploySequence),
        AFTER_HOLD,
        'releasing the pointer stops repeated deployment',
    );
    await P.locator('[data-deploy-species="0"]').click();
    await P.waitForFunction(
        (sequence) => BUDMORI.sim.raidRoster('solo').lastDeploySequence === sequence + 1,
        AFTER_HOLD,
    );
    assert.equal(
        await P.evaluate(
            () => BUDMORI.sim.raidRoster('solo').troops.filter((troop) => troop.species === 0 && troop.deployed).length,
        ),
        1,
        'switching cards shares one global deployment sequence',
    );
    const VIEWPORTS = [
        { width: 1680, height: 893 },
        { width: 1280, height: 800 },
        { width: 390, height: 844 },
        { width: 320, height: 568 },
        { width: 844, height: 390 },
    ];
    await P.evaluate(() => {
        BUDMORI.runtime.paused = true;
    });
    for (const VIEWPORT of VIEWPORTS) {
        await P.setViewportSize(VIEWPORT);
        const GEOMETRY = await P.evaluate(() => {
            const CARDS = document.querySelector('#deploymentCards'),
                ROW = CARDS.getBoundingClientRect(),
                SKILLS = document.querySelector('.formation-dock').getBoundingClientRect(),
                PANEL = document.querySelector('#raidControls').getBoundingClientRect(),
                BOXES = [...CARDS.querySelectorAll('.deployment-card')].map((node) => node.getBoundingClientRect()),
                OVERLAP = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
            return {
                count: BOXES.length,
                cardsInsidePanel: ROW.left >= PANEL.left && ROW.right <= PANEL.right && ROW.top >= PANEL.top,
                cardOverlap: BOXES.some((box, i) => BOXES.slice(i + 1).some((next) => OVERLAP(box, next))),
                skillsCompact: SKILLS.height < 100,
                cardsDoNotOverlapSkills: !OVERLAP(ROW, SKILLS),
                insideViewport: ROW.left >= 0 && ROW.right <= innerWidth && ROW.bottom <= innerHeight,
                noPageOverflow: document.documentElement.scrollWidth <= innerWidth,
            };
        });
        assert.deepEqual(
            GEOMETRY,
            {
                count: 4,
                cardsInsidePanel: true,
                cardOverlap: false,
                skillsCompact: true,
                cardsDoNotOverlapSkills: true,
                insideViewport: true,
                noPageOverflow: true,
            },
            'Raid cards / skill dock layout at ' + VIEWPORT.width + 'x' + VIEWPORT.height,
        );
        await P.screenshot({ path: path.join(OUT, `raid-deployment-${VIEWPORT.width}x${VIEWPORT.height}.png`) });
    }
    await P.locator('#return').click();
    await P.waitForFunction(() => BUDMORI.sim.scene === 'farm');
    await openMenuTab(P, 'deployment');
    await P.locator('#progressionResetAll').click();
    await P.waitForFunction(() => {
        const STATE = BUDMORI.sim.playerProgression;
        return (
            STATE.availablePoints === STATE.level - 1 &&
            STATE.raidDeploymentCards.unlockedSlots === 1 &&
            STATE.formationSkills.slots === 1 &&
            STATE.formationSkills.equipped.length === 0
        );
    });
    await clean(P);
    await C.close();
    CHECK(
        'Four Raid deployment cards persist and reset with refunds; unique species, weakest-tier order, single tap, hold/release, shared sequence and desktop/mobile/landscape layout',
    );
}
async function upgrades() {
    await upgradeMenuFlow();
    await formationHudFlow();
}
async function grainMechanicsFlow() {
    const C = await browser.newContext({ viewport: { width: 1280, height: 800 } }),
        P = await open(C);
    await P.locator('#newGame').click();
    const RESULT = await P.evaluate(async () => {
        const [
                { RiceCriticalModel: RICE },
                { WheatCommandModel: WHEAT },
                { BarleyArmorShredModel: BARLEY, createBarleyArmorShredBuckets: CREATE_SHRED_BUCKETS },
                { createPlayerProgressionState: CREATE_PROGRESS },
                {
                    getContinuousLeapConfig: GET_KIDNEY_LEAP,
                    getBeanSplitCount: GET_BEAN_SPLIT_COUNT,
                    getPeaRecoveryBoostConfig: GET_PEA_RECOVERY_BOOST,
                },
                { migrateBaselineAbilityInvestments: MIGRATE_BASELINE_ABILITIES },
                { abilityProfile: ABILITY_PROFILE },
                { captureFarmProgress: CAPTURE_PROGRESS, restoreFarmProgress: RESTORE_PROGRESS },
                { snapshot: SNAPSHOT, restore: RESTORE, normalizeSnapshot: NORMALIZE, validateSnapshot: VALIDATE },
                { Garden: GARDEN },
                { baseUnitStatsFor: BASE_STATS },
                {
                    purchaseAbilityNode: PURCHASE_NODE,
                    resetAbilityProgression: RESET_ABILITIES,
                    resetPlayerProgression: RESET_PLAYER_PROGRESS,
                },
            ] = await Promise.all([
                import('/src/features/abilities/rice-critical/model.js'),
                import('/src/features/abilities/wheat-command/model.js'),
                import('/src/features/abilities/barley-shred/model.js'),
                import('/src/player-progression.js'),
                import('/src/species-abilities.js'),
                import('/src/ability-state.js'),
                import('/src/unit-abilities.js'),
                import('/src/farm-progress.js'),
                import('/src/farm-state.js'),
                import('/src/farm-model.js'),
                import('/src/unit-stats.js'),
                import('/src/ability-progression.js'),
            ]),
            WHEAT_ID = 'wheat-command-crit',
            RICE_ID = 'rice-low-health-harvest',
            PROGRESSION = CREATE_PROGRESS();
        PROGRESSION.level = 2;
        PROGRESSION.availablePoints = 0;
        PROGRESSION.abilities[WHEAT_ID] = {
            rootUnlocked: false,
            powerLevel: 1,
            gradeLevel: 0,
            branchLevels: { range: 0 },
        };
        const RICE_STATE = { abilities: { [RICE_ID]: { rootUnlocked: false, powerLevel: 0, gradeLevel: 0 } } };
        const RICE_BONUS = [
            RICE.chanceBonus(RICE_STATE, 3, 100, 100),
            RICE.chanceBonus(RICE_STATE, 3, 50, 100),
            RICE.chanceBonus(RICE_STATE, 3, 1, 100),
            RICE.chanceBonus(RICE_STATE, 3, 0, 100),
            RICE.chanceBonus(RICE_STATE, 3, 0, 0),
        ];
        const BASELINE_ACCESS = {
            riceBonus: RICE.chanceBonus(RICE_STATE, 1, 50, 100),
            wheatSpeedValue: WHEAT.config(CREATE_PROGRESS(), 1)?.speedValue,
            barleyAmount: BARLEY.config(CREATE_PROGRESS(), 1)?.amount,
        };
        const W = new GARDEN(999),
            SOURCE = W.spawn(7, 3, 0, 0),
            ALLY = W.spawn(0, 1, 1, 0),
            EDGE = W.spawn(0, 1, 2.89, 0),
            OUTSIDE = W.spawn(0, 1, 2.91, 0),
            DEAD = W.spawn(0, 1, 0.25, 0);
        W.playerProgression = PROGRESSION;
        W.simulationTick = 10;
        let randomCalls = 0;
        W.random = () => (randomCalls++, 0);
        DEAD.hp = 0;
        DEAD.down = 60;
        const ACTION = { id: 1 };
        const COMMAND_CONFIG = SOURCE.ability.commandAuraConfig?.(W),
            HAS_ON_LAUNCH = typeof SOURCE.ability.onLaunch === 'function';
        W.combatEvent('launch', SOURCE, ACTION);
        W.combatEvent('launch', SOURCE, ACTION);
        const WHEAT_TRIGGER = {
            source: SOURCE.wheatCommandBuffs,
            ally: ALLY.wheatCommandBuffs,
            edge: EDGE.wheatCommandBuffs,
            outside: OUTSIDE.wheatCommandBuffs,
            dead: DEAD.wheatCommandBuffs,
            randomCalls,
            commandConfig: COMMAND_CONFIG,
            hasOnLaunch: HAS_ON_LAUNCH,
            resolved: ACTION.wheatCommandResolved,
        };
        ALLY.x = 10;
        WHEAT.refreshBuff(ALLY, 2, 20);
        WHEAT.refreshBuff(ALLY, 0, 25);
        const WHEAT_STRENGTH = {
            strongest: WHEAT.activeBuff(ALLY, 25)?.level,
            strongExpiry: ALLY.wheatCommandBuffs.find((buff) => buff.level === 2)?.expiresAtTick,
            fallsBack: WHEAT.activeBuff(ALLY, 81)?.level,
            expires: WHEAT.activeBuff(ALLY, 85),
        };
        const SHRED = { hp: 100, barleyArmorShredBuckets: CREATE_SHRED_BUCKETS() };
        BARLEY.applyHit(SHRED, 1, 10);
        const SAME_TICK = BARLEY.applyHit(SHRED, 2, 10);
        BARLEY.applyHit(SHRED, 2, 11);
        const BARLEY_TIMING = {
            sameTickTotal: SAME_TICK.total,
            totalAt60: BARLEY.total(SHRED, 60),
            armorAt60: BARLEY.effectiveArmor(SHRED, 4, 0, 60),
            totalAt70: BARLEY.total(SHRED, 70),
            totalAt71: BARLEY.total(SHRED, 71),
            slotCount: SHRED.barleyArmorShredBuckets.length,
        };
        const UPGRADE_STATE = CREATE_PROGRESS();
        UPGRADE_STATE.level = 6;
        UPGRADE_STATE.availablePoints = 5;
        const CONTEXT = { highestSpeciesTier: { 7: 3 }, location: 'farm', inCombat: false };
        let next = PURCHASE_NODE(UPGRADE_STATE, WHEAT_ID, 'power-1', CONTEXT).state;
        next = PURCHASE_NODE(next, WHEAT_ID, 'branch-range-1', CONTEXT).state;
        const RESET = RESET_ABILITIES(next, CONTEXT, 7),
            FULL_RESET = RESET_PLAYER_PROGRESS(next, { type: 'all' }, CONTEXT);
        const WHEAT_UPGRADE = {
            rangeLevel: next.abilities[WHEAT_ID].branchLevels.range,
            invested: next.availablePoints,
            refund: RESET.state.availablePoints,
            rangeAfterReset: RESET.state.abilities[WHEAT_ID].branchLevels.range,
            fullRefund: FULL_RESET.state.availablePoints,
            rangeAfterFullReset: FULL_RESET.state.abilities[WHEAT_ID].branchLevels.range,
        };
        const LEGACY_ABILITY_PLAYER = CREATE_PROGRESS();
        LEGACY_ABILITY_PLAYER.level = 6;
        LEGACY_ABILITY_PLAYER.availablePoints = 0;
        LEGACY_ABILITY_PLAYER.abilities[WHEAT_ID] = {
            rootUnlocked: true,
            powerLevel: 1,
            gradeLevel: 2,
            branchLevels: { range: 1 },
        };
        const RAW = SNAPSHOT(W);
        RAW.units[1].barleyArmorShredBuckets[22] = { expiresAtTick: 82, amount: 4 };
        let validCurrent;
        try {
            VALIDATE(RAW);
            validCurrent = true;
        } catch (error) {
            validCurrent = error.message;
        }
        const LEGACY = structuredClone(RAW);
        LEGACY.playerProgression = structuredClone(LEGACY_ABILITY_PLAYER);
        delete LEGACY.playerProgression.baselineAbilityMigrationVersion;
        delete LEGACY.simulationTick;
        for (const UNIT of LEGACY.units) {
            delete UNIT.wheatCommandBuffs;
            delete UNIT.barleyArmorShredBuckets;
        }
        delete LEGACY.boss.barleyArmorShredBuckets;
        for (const [ID, BUILD] of Object.entries(LEGACY.playerProgression.abilities)) {
            if (ID !== WHEAT_ID) {
                delete BUILD.branchLevels;
            }
        }
        const NORMALIZED = NORMALIZE(LEGACY),
            RESTORED = RESTORE(NORMALIZED),
            LEGACY_SNAPSHOT = {
                valid: VALIDATE(NORMALIZED),
                simulationTick: RESTORED.simulationTick,
                wheatRangeLevel: RESTORED.playerProgression.abilities[WHEAT_ID].branchLevels.range,
                wheatRootUnlocked: RESTORED.playerProgression.abilities[WHEAT_ID].rootUnlocked,
                wheatGradeLevel: RESTORED.playerProgression.abilities[WHEAT_ID].gradeLevel,
                wheatRefundedPoints: RESTORED.playerProgression.availablePoints,
                wheatBuffs: RESTORED.units[0].wheatCommandBuffs.length,
                shredSlots: RESTORED.units[1].barleyArmorShredBuckets.length,
            };
        const FARM_PROGRESS = CAPTURE_PROGRESS(W);
        delete FARM_PROGRESS.player.abilities[WHEAT_ID].branchLevels;
        const RESTORED_PROGRESS = RESTORE_PROGRESS(FARM_PROGRESS);
        const LEGACY_FARM_PROGRESS = structuredClone(FARM_PROGRESS);
        LEGACY_FARM_PROGRESS.player = structuredClone(LEGACY_ABILITY_PLAYER);
        delete LEGACY_FARM_PROGRESS.player.baselineAbilityMigrationVersion;
        const LEGACY_PROGRESS_FIRST = RESTORE_PROGRESS(LEGACY_FARM_PROGRESS),
            LEGACY_PROGRESS_SECOND = RESTORE_PROGRESS(CAPTURE_PROGRESS(LEGACY_PROGRESS_FIRST)),
            NO_PURCHASE_PROGRESS = structuredClone(FARM_PROGRESS);
        NO_PURCHASE_PROGRESS.player = CREATE_PROGRESS();
        NO_PURCHASE_PROGRESS.player.level = 4;
        NO_PURCHASE_PROGRESS.player.availablePoints = 3;
        delete NO_PURCHASE_PROGRESS.player.baselineAbilityMigrationVersion;
        const NO_PURCHASE_RESTORE = RESTORE_PROGRESS(NO_PURCHASE_PROGRESS);
        const COMBAT = new GARDEN(321),
            RICE_ATTACKER = COMBAT.spawn(6, 3, -8, 0),
            RICE_TARGET = COMBAT.spawn(0, 3, -6, 0);
        COMBAT.playerProgression.level = 3;
        COMBAT.playerProgression.availablePoints = 0;
        RICE_TARGET.faction = 'enemy';
        RICE_TARGET.hp = BASE_STATS(3, 0).maxHp / 2;
        COMBAT.random = () => 0;
        COMBAT.damageCombatTarget(RICE_ATTACKER, { id: 991, hit: false }, RICE_TARGET, { x: -6, y: 0, z: 0 });
        const RICE_HITS = COMBAT.notices.filter(
                (event) => event.kind === 'unit-hit' && event.sourceUnit === RICE_ATTACKER.id,
            ),
            BARLEY_ATTACKER = COMBAT.spawn(8, 3, 5, 3),
            BARLEY_TARGET = COMBAT.spawn(0, 3, 7, 3);
        BARLEY_TARGET.faction = 'enemy';
        BARLEY_TARGET.giantUntil = COMBAT.time + 1;
        COMBAT.random = () => 0.99;
        const BARLEY_ARMOR_BEFORE = COMBAT.combatTargetDefense(BARLEY_TARGET).armor,
            BARLEY_HP_BEFORE = BARLEY_TARGET.hp;
        COMBAT.damageCombatTarget(BARLEY_ATTACKER, { id: 992, hit: false }, BARLEY_TARGET, { x: 7, y: 3, z: 0 });
        const BARLEY_HITS = COMBAT.notices.filter(
                (event) => event.kind === 'unit-hit' && event.sourceUnit === BARLEY_ATTACKER.id,
            ),
            COMBAT_INTEGRATION = {
                riceCritical: RICE_HITS[0]?.critical,
                riceHitCount: RICE_HITS.length,
                barleyArmorBefore: BARLEY_ARMOR_BEFORE,
                barleyArmorAfter: COMBAT.combatTargetDefense(BARLEY_TARGET).armor,
                barleyHitDamage: BARLEY_HP_BEFORE - BARLEY_TARGET.hp,
                barleyDamageAtPreHitArmor: (BASE_STATS(3, 8).attackPower * 100) / 200,
                barleyHitCount: BARLEY_HITS.length,
                barleyApplied: COMBAT.notices.some(
                    (event) => event.kind === 'barley-shred' && event.unit === BARLEY_TARGET.id,
                ),
            };
        const RUN_ATTACK_WINDOW = (buffLevel) => {
            const ATTACK_SIM = new GARDEN(800 + (buffLevel ?? -1)),
                ATTACKER = ATTACK_SIM.spawn(5, 1, 0, 0),
                TARGET = ATTACK_SIM.spawn(0, 1, 1, 0),
                STEP = 1 / 120,
                TARGET_POINT = {
                    id: TARGET.id,
                    x: TARGET.x - (TARGET.radius + ATTACKER.radius - 0.16),
                    y: TARGET.y,
                };
            TARGET.faction = 'enemy';
            TARGET.hp = 1_000_000;
            TARGET.maxHp = TARGET.hp;
            ATTACKER.dropLanded = TARGET.dropLanded = true;
            if (buffLevel !== null) {
                WHEAT.refreshBuff(ATTACKER, buffLevel, ATTACK_SIM.simulationTick);
                ATTACKER.wheatCommandBuffs.find((buff) => buff.level === buffLevel).expiresAtTick = 10000;
            }
            const ADVANCE = () => {
                ATTACK_SIM.time += STEP;
                ATTACK_SIM.simulationTick++;
                const OLD = { x: ATTACKER.x, y: ATTACKER.y, z: ATTACKER.z },
                    BUSY = ATTACKER.ability.update(ATTACK_SIM, STEP);
                if (!BUSY && ATTACKER.ability.phase === 'idle') {
                    ATTACKER.x = ATTACKER.y = ATTACKER.vx = ATTACKER.vy = 0;
                    ATTACKER.ability.begin(ATTACK_SIM, TARGET_POINT);
                }
                ATTACKER.integrate(STEP);
                if (ATTACKER.ability.phase === 'active') {
                    ATTACKER.ability.afterMove(ATTACK_SIM, OLD);
                }
            };
            ATTACKER.ability.begin(ATTACK_SIM, TARGET_POINT);
            for (let index = 0; index < 2400; index++) {
                ADVANCE();
            }
            const EVENTS = ATTACK_SIM.combatLog.filter((event) => event.unit === ATTACKER.id),
                RECOVERY_INTERVALS = [];
            for (let index = 0; index < EVENTS.length; index++) {
                if (EVENTS[index].kind === 'recover') {
                    const NEXT_PREPARE = EVENTS.slice(index + 1).find((event) => event.kind === 'prepare');
                    if (NEXT_PREPARE) {
                        RECOVERY_INTERVALS.push(NEXT_PREPARE.time - EVENTS[index].time);
                    }
                }
            }
            return {
                hitCount: ATTACK_SIM.notices.filter(
                    (event) => event.kind === 'unit-hit' && event.sourceUnit === ATTACKER.id,
                ).length,
                recoveryIntervals: RECOVERY_INTERVALS.slice(0, 8),
            };
        };
        const RUN_PROGRESS_PRESERVATION = () => {
            const ATTACK_SIM = new GARDEN(811),
                ATTACKER = ATTACK_SIM.spawn(5, 1, 0, 0),
                TARGET = ATTACK_SIM.spawn(0, 1, 1, 0),
                STEP = 0.05,
                TARGET_POINT = {
                    id: TARGET.id,
                    x: TARGET.x - (TARGET.radius + ATTACKER.radius - 0.16),
                    y: TARGET.y,
                };
            TARGET.faction = 'enemy';
            TARGET.hp = 1_000_000;
            TARGET.maxHp = TARGET.hp;
            ATTACKER.dropLanded = TARGET.dropLanded = true;
            const ADVANCE = () => {
                ATTACK_SIM.time += STEP;
                ATTACK_SIM.simulationTick++;
                const OLD = { x: ATTACKER.x, y: ATTACKER.y, z: ATTACKER.z },
                    BUSY = ATTACKER.ability.update(ATTACK_SIM, STEP);
                if (!BUSY && ATTACKER.ability.phase === 'idle') {
                    ATTACKER.x = ATTACKER.y = ATTACKER.vx = ATTACKER.vy = 0;
                    ATTACKER.ability.begin(ATTACK_SIM, TARGET_POINT);
                }
                ATTACKER.integrate(STEP);
                if (ATTACKER.ability.phase === 'active') {
                    ATTACKER.ability.afterMove(ATTACK_SIM, OLD);
                }
            };
            ATTACKER.ability.begin(ATTACK_SIM, TARGET_POINT);
            while (ATTACKER.ability.phase !== 'recover') {
                ADVANCE();
            }
            const RECOVERY_TIME = ATTACK_SIM.combatLog.findLast(
                (event) => event.unit === ATTACKER.id && event.kind === 'recover',
            ).time;
            while (ATTACKER.ability.phase === 'recover' && ATTACKER.ability.elapsed < 0.4 - 1e-9) {
                ADVANCE();
            }
            const APPLIED_AT = ATTACK_SIM.simulationTick;
            WHEAT.refreshBuff(ATTACKER, 2, APPLIED_AT);
            ATTACKER.wheatCommandBuffs.find((buff) => buff.level === 2).expiresAtTick = APPLIED_AT + 3;
            const PREPARES_BEFORE = ATTACK_SIM.combatLog.filter(
                (event) => event.unit === ATTACKER.id && event.kind === 'prepare',
            ).length;
            for (let index = 0; index < 30; index++) {
                ADVANCE();
                if (
                    ATTACK_SIM.combatLog.filter((event) => event.unit === ATTACKER.id && event.kind === 'prepare')
                        .length > PREPARES_BEFORE
                ) {
                    break;
                }
            }
            const NEXT_PREPARE = ATTACK_SIM.combatLog.findLast(
                (event) => event.unit === ATTACKER.id && event.kind === 'prepare',
            );
            return {
                interval: NEXT_PREPARE.time - RECOVERY_TIME,
                hitCount: ATTACK_SIM.notices.filter(
                    (event) => event.kind === 'unit-hit' && event.sourceUnit === ATTACKER.id,
                ).length,
                expiredMultiplier: WHEAT.attackSpeedMultiplier(ATTACKER, ATTACK_SIM.simulationTick),
            };
        };
        const WHEAT_ATTACK_WINDOWS = [null, 0, 1, 2].map(RUN_ATTACK_WINDOW),
            WHEAT_PROGRESS_PRESERVATION = RUN_PROGRESS_PRESERVATION();
        const COMMON_WORLD = new GARDEN(4450),
            KIDNEY_T1 = COMMON_WORLD.spawn(2, 1, -3, 0),
            KIDNEY_T1_CONFIG = GET_KIDNEY_LEAP(COMMON_WORLD.playerProgression, 1),
            KIDNEY_T1_STARTED = KIDNEY_T1.specialAbility.begin(COMMON_WORLD, { id: 'boss', x: 0, y: 0 }),
            KIDNEY_T1_RUNTIME = {
                ready: KIDNEY_T1.specialAbility.phase === 'windup',
                tier: KIDNEY_T1.tier,
                cooldownTicks: KIDNEY_T1_CONFIG?.cooldownTicks,
                cooldownSecondsAt20Hz: KIDNEY_T1_CONFIG?.cooldownTicks / 20,
            },
            KIDNEY_A = COMMON_WORLD.spawn(2, 3, -1, 0),
            KIDNEY_B = COMMON_WORLD.spawn(2, 3, 1, 0),
            KIDNEY_C = COMMON_WORLD.spawn(2, 3, 3, 0);
        COMMON_WORLD.simulationTick = 10;
        KIDNEY_A.kidneyLeapReadyTick = 70;
        const KIDNEY_INDEPENDENT = {
            basicKind: ABILITY_PROFILE(2).kind,
            cooldownTicks: GET_KIDNEY_LEAP(COMMON_WORLD.playerProgression, 3)?.cooldownTicks,
            firstReady: KIDNEY_A.specialAbility.canBegin(COMMON_WORLD),
            secondReady: KIDNEY_B.specialAbility.canBegin(COMMON_WORLD),
        };
        KIDNEY_A.ability.phase = 'recover';
        KIDNEY_A.ability.elapsed = 0.42;
        KIDNEY_A.specialAbility.phase = 'active';
        KIDNEY_A.specialAbility.action = { leapCooldownResetApplied: false };
        COMMON_WORLD.random = () => 0;
        const RESET_SUCCEEDED = KIDNEY_A.specialAbility.resolveLandingEffects(COMMON_WORLD),
            RESET_TIMER = {
                phase: KIDNEY_A.ability.phase,
                elapsed: KIDNEY_A.ability.elapsed,
                readyTick: KIDNEY_A.kidneyLeapReadyTick,
                sameTickCanLeap: KIDNEY_A.specialAbility.canBegin(COMMON_WORLD),
            };
        COMMON_WORLD.simulationTick++;
        const NEXT_TICK_CAN_LEAP = KIDNEY_A.specialAbility.canBegin(COMMON_WORLD);
        KIDNEY_A.specialAbility.phase = 'windup';
        KIDNEY_A.specialAbility.action = { leapDepartureCommitted: false };
        KIDNEY_A.specialAbility.interrupt();
        const PREDEPARTURE_CANCEL = {
            phase: KIDNEY_A.specialAbility.phase,
            readyTick: KIDNEY_A.kidneyLeapReadyTick,
        };
        COMMON_WORLD.simulationTick = 20;
        KIDNEY_B.specialAbility.phase = 'windup';
        KIDNEY_B.specialAbility.action = {
            id: 1,
            targetId: 'boss',
            target: { x: 0, y: 0, z: 0, id: 'boss' },
            hit: false,
            path: null,
            leapDepartureCommitted: false,
        };
        COMMON_WORLD.combatEvent('launch', KIDNEY_B, KIDNEY_B.specialAbility.action, KIDNEY_B.specialAbility);
        KIDNEY_B.specialAbility.phase = 'active';
        KIDNEY_B.specialAbility.interrupt();
        const POSTDEPARTURE = {
            readyTick: KIDNEY_B.kidneyLeapReadyTick,
            phase: KIDNEY_B.specialAbility.phase,
            cooldownAt79: (() => {
                COMMON_WORLD.simulationTick = 79;
                return KIDNEY_B.specialAbility.canBegin(COMMON_WORLD);
            })(),
            cooldownAt80: (() => {
                KIDNEY_B.specialAbility.ready();
                COMMON_WORLD.simulationTick = 80;
                return KIDNEY_B.specialAbility.canBegin(COMMON_WORLD);
            })(),
        };
        COMMON_WORLD.simulationTick = 20;
        KIDNEY_C.kidneyLeapReadyTick = 100;
        const BASIC_DURING_LEAP_COOLDOWN = {
            specialReady: KIDNEY_C.specialAbility.canBegin(COMMON_WORLD),
            basicStarted: KIDNEY_C.ability.begin(COMMON_WORLD, { id: 'boss', x: 0, y: 0 }),
            basicKind: KIDNEY_C.ability.spec.kind,
        };

        const PEA = COMMON_WORLD.spawn(0, 1, -4, 0),
            ENEMY = COMMON_WORLD.spawn(0, 1, -2, 0),
            OTHER_PLAYER = COMMON_WORLD.spawn(0, 1, -6, 0);
        ENEMY.faction = 'enemy';
        PEA.vx = 1.25;
        PEA.knock(1, 0, 5, 2, ENEMY);
        PEA.stun = 0;
        PEA.z = 0;
        PEA.vz = 0;
        PEA.down = 0;
        PEA.landingRecovery = 0;
        PEA.dropLanded = true;
        COMMON_WORLD.simulationTick = 30;
        const ATTACK_RECOVERY_BEFORE = PEA.ability.attackRecoverySecondsFor(1);
        COMMON_WORLD.resolvePeaRecoveryBoosts([PEA]);
        COMMON_WORLD.steer(PEA, -3, 0, 0.05, 2);
        const PEA_FIRST_RECOVERY = {
            armedByEnemy: !PEA.peaRecoveryPending,
            expiresAtTick: PEA.peaRecoveryBoostExpiresAtTick,
            speedMultiplier: PEA.peaRecoveryBoostMultiplier,
            moveSpeed: Math.hypot(PEA.moveControlVx, PEA.moveControlVy),
            attackRecoveryUnchanged: PEA.ability.attackRecoverySecondsFor(1) === ATTACK_RECOVERY_BEFORE,
        };
        PEA.knock(1, 0, 5, 2, ENEMY);
        PEA.stun = 0;
        PEA.z = 0;
        PEA.vz = 0;
        PEA.down = 0;
        PEA.landingRecovery = 0;
        PEA.dropLanded = true;
        COMMON_WORLD.simulationTick = 31;
        COMMON_WORLD.resolvePeaRecoveryBoosts([PEA]);
        const PEA_REFRESHED = {
            expiresAtTick: PEA.peaRecoveryBoostExpiresAtTick,
            speedMultiplier: PEA.peaRecoveryBoostMultiplier,
        };
        COMMON_WORLD.simulationTick = 71;
        COMMON_WORLD.steer(PEA, -3, 0, 0.05, 2);
        const PEA_LAST_ACTIVE_SPEED = Math.hypot(PEA.moveControlVx, PEA.moveControlVy);
        COMMON_WORLD.simulationTick = 72;
        COMMON_WORLD.resolvePeaRecoveryBoosts([PEA]);
        COMMON_WORLD.steer(PEA, -3, 0, 0.05, 2);
        const PEA_EXPIRED_SPEED = Math.hypot(PEA.moveControlVx, PEA.moveControlVy);
        const RUN_PEA_RECOVERY = (legacySave) => {
            const WORLD = new GARDEN(4460 + Number(legacySave)),
                PROGRESS = CREATE_PROGRESS();
            if (legacySave) {
                PROGRESS.baselineAbilityMigrationVersion = 1;
            }
            const REFUND = MIGRATE_BASELINE_ABILITIES(PROGRESS);
            WORLD.playerProgression = PROGRESS;
            WORLD.setScene('raid');
            const UNIT = WORLD.spawn(0, 1, -5, 0),
                ENEMY = WORLD.spawn(1, 1, -3, 0);
            ENEMY.faction = 'enemy';
            UNIT.knock(-1, 0, 5, 2, ENEMY);
            let elapsedTicks = 0;
            for (; elapsedTicks < 180 && !UNIT.peaRecoveryBoostExpiresAtTick; elapsedTicks++) {
                WORLD.step(1 / 20);
            }
            const TRIGGER = {
                    triggeredByRealWorldStep: UNIT.peaRecoveryBoostExpiresAtTick > 0 && !UNIT.peaRecoveryPending,
                    elapsedTicks,
                    expiresAtTick: UNIT.peaRecoveryBoostExpiresAtTick,
                    multiplier: UNIT.peaRecoveryBoostMultiplier,
                    grounded: UNIT.z <= 0.1 && UNIT.dropLanded,
                    abilityIdle:
                        UNIT.ability.phase === 'idle' && (!UNIT.specialAbility || UNIT.specialAbility.phase === 'idle'),
                    migrationRefund: REFUND,
                    migrationVersion: PROGRESS.baselineAbilityMigrationVersion,
                },
                TICK = WORLD.simulationTick;
            WORLD.steer(UNIT, UNIT.x + 8, UNIT.y, 1 / 20, 2);
            const ACTIVE_SPEED = Math.hypot(UNIT.moveControlVx, UNIT.moveControlVy);
            WORLD.simulationTick = UNIT.peaRecoveryBoostExpiresAtTick + 1;
            WORLD.steer(UNIT, UNIT.x + 8, UNIT.y, 1 / 20, 2);
            const EXPIRED_SPEED = Math.hypot(UNIT.moveControlVx, UNIT.moveControlVy);
            return {
                ...TRIGGER,
                tickAtCapture: TICK,
                activeSpeed: ACTIVE_SPEED,
                expiredSpeed: EXPIRED_SPEED,
                splitCount: GET_BEAN_SPLIT_COUNT(PROGRESS, 1),
                effectiveConfig: GET_PEA_RECOVERY_BOOST(PROGRESS, 1),
            };
        };
        const PEA_REAL_RUNTIME = RUN_PEA_RECOVERY(false),
            PEA_OLD_SAVE_RUNTIME = RUN_PEA_RECOVERY(true);
        const NO_HOSTILE = COMMON_WORLD.spawn(0, 1, -8, 0);
        NO_HOSTILE.knock(1, 0, 5, 2, OTHER_PLAYER);
        const NO_HOSTILE_TRIGGER = NO_HOSTILE.peaRecoveryPending;
        const DEAD_PEA = COMMON_WORLD.spawn(0, 1, -10, 0);
        DEAD_PEA.peaRecoveryPending = true;
        DEAD_PEA.peaRecoveryBoostExpiresAtTick = 100;
        DEAD_PEA.peaRecoveryBoostMultiplier = 1.25;
        DEAD_PEA.hp = 0;
        COMMON_WORLD.handleUnitDeath(DEAD_PEA);
        const DEATH_CLEARED = {
            pending: DEAD_PEA.peaRecoveryPending,
            expiresAtTick: DEAD_PEA.peaRecoveryBoostExpiresAtTick,
            multiplier: DEAD_PEA.peaRecoveryBoostMultiplier,
        };
        const DESTROYED_PEA = COMMON_WORLD.spawn(0, 1, -12, 0);
        DESTROYED_PEA.peaRecoveryPending = true;
        DESTROYED_PEA.peaRecoveryBoostExpiresAtTick = 100;
        DESTROYED_PEA.peaRecoveryBoostMultiplier = 1.25;
        COMMON_WORLD.removeUnit(DESTROYED_PEA);
        const DESTRUCTION_CLEARED = {
            pending: DESTROYED_PEA.peaRecoveryPending,
            expiresAtTick: DESTROYED_PEA.peaRecoveryBoostExpiresAtTick,
            multiplier: DESTROYED_PEA.peaRecoveryBoostMultiplier,
        };
        const END_WORLD = new GARDEN(4452),
            END_PEA = END_WORLD.spawn(0, 1, 0, 0);
        END_PEA.peaRecoveryPending = true;
        END_PEA.peaRecoveryBoostExpiresAtTick = 100;
        END_PEA.peaRecoveryBoostMultiplier = 1.25;
        END_WORLD.farmBossEvent.phase = 'fighting';
        END_WORLD.finishFarmBossEvent('defeat');
        const COMBAT_END_CLEARED = {
            pending: END_PEA.peaRecoveryPending,
            expiresAtTick: END_PEA.peaRecoveryBoostExpiresAtTick,
            multiplier: END_PEA.peaRecoveryBoostMultiplier,
        };
        const PEA_POWER_VALUES = [0, 1, 2].map((level) => {
            const STATE = CREATE_PROGRESS();
            STATE.abilities['pea-recovery-boost'].powerLevel = level;
            return GET_PEA_RECOVERY_BOOST(STATE, 1).speedMultiplier;
        });
        const NO_FREE_SPLIT = GET_BEAN_SPLIT_COUNT(CREATE_PROGRESS(), 3);
        const LEGACY_COMMON_PROGRESS = CREATE_PROGRESS();
        LEGACY_COMMON_PROGRESS.baselineAbilityMigrationVersion = 1;
        LEGACY_COMMON_PROGRESS.level = 5;
        LEGACY_COMMON_PROGRESS.availablePoints = 0;
        LEGACY_COMMON_PROGRESS.abilities['kidney-continuous-leap'] = {
            rootUnlocked: true,
            powerLevel: 1,
            gradeLevel: 2,
        };
        const REFUND_FIRST = MIGRATE_BASELINE_ABILITIES(LEGACY_COMMON_PROGRESS),
            REFUND_SECOND = MIGRATE_BASELINE_ABILITIES(LEGACY_COMMON_PROGRESS),
            LEGACY_COMMON_REFUND = {
                first: REFUND_FIRST,
                second: REFUND_SECOND,
                availablePoints: LEGACY_COMMON_PROGRESS.availablePoints,
                rootUnlocked: LEGACY_COMMON_PROGRESS.abilities['kidney-continuous-leap'].rootUnlocked,
                gradeLevel: LEGACY_COMMON_PROGRESS.abilities['kidney-continuous-leap'].gradeLevel,
                powerLevel: LEGACY_COMMON_PROGRESS.abilities['kidney-continuous-leap'].powerLevel,
                migrationVersion: LEGACY_COMMON_PROGRESS.baselineAbilityMigrationVersion,
            };
        const KIDNEY_SAVE_WORLD = new GARDEN(4451),
            KIDNEY_SAVE_UNIT = KIDNEY_SAVE_WORLD.spawn(2, 3, 0, 0);
        KIDNEY_SAVE_WORLD.simulationTick = 12;
        KIDNEY_SAVE_WORLD.attackSerial = 1;
        KIDNEY_SAVE_UNIT.kidneyLeapReadyTick = 72;
        KIDNEY_SAVE_UNIT.kidneyLeapLastUseTick = 12;
        KIDNEY_SAVE_UNIT.specialAbility.phase = 'windup';
        KIDNEY_SAVE_UNIT.specialAbility.elapsed = 0.1;
        KIDNEY_SAVE_UNIT.specialAbility.action = {
            id: 1,
            targetId: 'boss',
            target: { x: 2, y: 0, z: 0, id: 'boss' },
            hit: false,
            path: null,
        };
        const KIDNEY_SNAPSHOT = SNAPSHOT(KIDNEY_SAVE_WORLD),
            KIDNEY_RESTORED = RESTORE(KIDNEY_SNAPSHOT).units.find((unitLocal) => unitLocal.species === 2),
            KIDNEY_RUNTIME_RESTORE = {
                valid: VALIDATE(KIDNEY_SNAPSHOT),
                phase: KIDNEY_RESTORED.specialAbility.phase,
                elapsed: KIDNEY_RESTORED.specialAbility.elapsed,
                readyTick: KIDNEY_RESTORED.kidneyLeapReadyTick,
                lastUseTick: KIDNEY_RESTORED.kidneyLeapLastUseTick,
            };
        return {
            riceBonus: RICE_BONUS,
            baselineAccess: BASELINE_ACCESS,
            wheatTrigger: WHEAT_TRIGGER,
            wheatStrength: WHEAT_STRENGTH,
            barleyTiming: BARLEY_TIMING,
            wheatUpgrade: WHEAT_UPGRADE,
            validCurrentSnapshot: validCurrent,
            legacySnapshot: LEGACY_SNAPSHOT,
            legacyProgressRange: RESTORED_PROGRESS.playerProgression.abilities[WHEAT_ID].branchLevels.range,
            legacyFarmMigration: {
                first: LEGACY_PROGRESS_FIRST.playerProgression.availablePoints,
                second: LEGACY_PROGRESS_SECOND.playerProgression.availablePoints,
                rootUnlocked: LEGACY_PROGRESS_SECOND.playerProgression.abilities[WHEAT_ID].rootUnlocked,
                gradeLevel: LEGACY_PROGRESS_SECOND.playerProgression.abilities[WHEAT_ID].gradeLevel,
                rangeLevel: LEGACY_PROGRESS_SECOND.playerProgression.abilities[WHEAT_ID].branchLevels.range,
                marker: LEGACY_PROGRESS_SECOND.playerProgression.baselineAbilityMigrationVersion,
            },
            noPurchaseRefund: NO_PURCHASE_RESTORE.playerProgression.availablePoints,
            combatIntegration: COMBAT_INTEGRATION,
            wheatAttackWindows: WHEAT_ATTACK_WINDOWS,
            wheatProgressPreservation: WHEAT_PROGRESS_PRESERVATION,
            commonAbilities: {
                kidneyCommonT1: {
                    started: KIDNEY_T1_STARTED,
                    ...KIDNEY_T1_RUNTIME,
                },
                kidneyIndependent: KIDNEY_INDEPENDENT,
                kidneyResetSucceeded: RESET_SUCCEEDED,
                kidneyResetTimer: RESET_TIMER,
                kidneyNextTickCanLeap: NEXT_TICK_CAN_LEAP,
                kidneyPredepartureCancel: PREDEPARTURE_CANCEL,
                kidneyPostdeparture: POSTDEPARTURE,
                kidneyBasicDuringCooldown: BASIC_DURING_LEAP_COOLDOWN,
                peaFirstRecovery: PEA_FIRST_RECOVERY,
                peaRefreshed: PEA_REFRESHED,
                peaLastActiveSpeed: PEA_LAST_ACTIVE_SPEED,
                peaExpiredSpeed: PEA_EXPIRED_SPEED,
                nonHostileTrigger: NO_HOSTILE_TRIGGER,
                deathCleared: DEATH_CLEARED,
                destructionCleared: DESTRUCTION_CLEARED,
                combatEndCleared: COMBAT_END_CLEARED,
                peaPowerValues: PEA_POWER_VALUES,
                peaRealRuntime: PEA_REAL_RUNTIME,
                peaOldSaveRuntime: PEA_OLD_SAVE_RUNTIME,
                freeSplitCount: NO_FREE_SPLIT,
                legacyRefund: LEGACY_COMMON_REFUND,
                kidneyRuntimeRestore: KIDNEY_RUNTIME_RESTORE,
            },
        };
    });
    assert.deepEqual(RESULT.riceBonus, [0, 0.175, 0.3465, 0, 0]);
    assert.deepEqual(RESULT.baselineAccess, { riceBonus: 0.175, wheatSpeedValue: 0.5, barleyAmount: 1 });
    assert.equal(RESULT.wheatTrigger.source.length, 1, JSON.stringify(RESULT.wheatTrigger));
    assert.equal(RESULT.wheatTrigger.ally.length, 1);
    assert.equal(RESULT.wheatTrigger.edge.length, 1);
    assert.equal(RESULT.wheatTrigger.outside.length, 0);
    assert.equal(RESULT.wheatTrigger.dead.length, 0);
    assert.equal(RESULT.wheatTrigger.randomCalls, 1);
    assert.deepEqual(RESULT.wheatStrength, { strongest: 2, strongExpiry: 80, fallsBack: 0, expires: null });
    assert.deepEqual(RESULT.barleyTiming, {
        sameTickTotal: 3,
        totalAt60: 5,
        armorAt60: 0,
        totalAt70: 2,
        totalAt71: 0,
        slotCount: 60,
    });
    assert.deepEqual(RESULT.wheatUpgrade, {
        rangeLevel: 1,
        invested: 3,
        refund: 5,
        rangeAfterReset: 0,
        fullRefund: 5,
        rangeAfterFullReset: 0,
    });
    assert.equal(RESULT.validCurrentSnapshot, true, JSON.stringify(RESULT));
    assert.deepEqual(RESULT.legacySnapshot, {
        valid: true,
        simulationTick: 0,
        wheatRangeLevel: 1,
        wheatRootUnlocked: false,
        wheatGradeLevel: 0,
        wheatRefundedPoints: 3,
        wheatBuffs: 0,
        shredSlots: 60,
    });
    assert.equal(RESULT.legacyProgressRange, 0);
    assert.deepEqual(RESULT.legacyFarmMigration, {
        first: 3,
        second: 3,
        rootUnlocked: false,
        gradeLevel: 0,
        rangeLevel: 1,
        marker: 2,
    });
    assert.equal(RESULT.noPurchaseRefund, 3);
    const EXPECTED_RECOVERIES = [1, 2 / 3, 1 / 1.75, 1 / 2.125];
    RESULT.wheatAttackWindows.forEach((window, index) => {
        assert(window.hitCount >= 5, JSON.stringify(RESULT.wheatAttackWindows));
        assert(window.recoveryIntervals.length >= 5, JSON.stringify(RESULT.wheatAttackWindows));
        assert(
            window.recoveryIntervals.every((interval) => Math.abs(interval - EXPECTED_RECOVERIES[index]) <= 0.051),
            JSON.stringify({ index, expected: EXPECTED_RECOVERIES[index], window }),
        );
    });
    assert(
        RESULT.wheatAttackWindows[0].hitCount < RESULT.wheatAttackWindows[1].hitCount &&
            RESULT.wheatAttackWindows[1].hitCount <= RESULT.wheatAttackWindows[2].hitCount &&
            RESULT.wheatAttackWindows[2].hitCount <= RESULT.wheatAttackWindows[3].hitCount,
        JSON.stringify(RESULT.wheatAttackWindows),
    );
    assert(
        RESULT.wheatProgressPreservation.interval >= 0.85 && RESULT.wheatProgressPreservation.interval <= 1,
        JSON.stringify(RESULT.wheatProgressPreservation),
    );
    assert(RESULT.wheatProgressPreservation.hitCount >= 1, JSON.stringify(RESULT.wheatProgressPreservation));
    assert.equal(RESULT.wheatProgressPreservation.expiredMultiplier, 1);
    assert.deepEqual(RESULT.commonAbilities.kidneyIndependent, {
        basicKind: 'ram',
        cooldownTicks: 60,
        firstReady: false,
        secondReady: true,
    });
    assert.deepEqual(RESULT.commonAbilities.kidneyCommonT1, {
        started: true,
        ready: true,
        tier: 1,
        cooldownTicks: 60,
        cooldownSecondsAt20Hz: 3,
    });
    assert.equal(RESULT.commonAbilities.kidneyResetSucceeded, true);
    assert.deepEqual(RESULT.commonAbilities.kidneyResetTimer, {
        phase: 'recover',
        elapsed: 0.42,
        readyTick: 10,
        sameTickCanLeap: false,
    });
    assert.equal(RESULT.commonAbilities.kidneyNextTickCanLeap, true);
    assert.deepEqual(RESULT.commonAbilities.kidneyPredepartureCancel, { phase: 'idle', readyTick: 10 });
    assert.deepEqual(RESULT.commonAbilities.kidneyPostdeparture, {
        readyTick: 80,
        phase: 'recover',
        cooldownAt79: false,
        cooldownAt80: true,
    });
    assert.deepEqual(RESULT.commonAbilities.kidneyBasicDuringCooldown, {
        specialReady: false,
        basicStarted: true,
        basicKind: 'ram',
    });
    assert.deepEqual(RESULT.commonAbilities.peaFirstRecovery, {
        armedByEnemy: true,
        expiresAtTick: 70,
        speedMultiplier: 1.25,
        moveSpeed: 2.5,
        attackRecoveryUnchanged: true,
    });
    assert.deepEqual(RESULT.commonAbilities.peaRefreshed, { expiresAtTick: 71, speedMultiplier: 1.25 });
    assert.equal(RESULT.commonAbilities.peaLastActiveSpeed, 2.5);
    assert.equal(RESULT.commonAbilities.peaExpiredSpeed, 2);
    assert.equal(RESULT.commonAbilities.nonHostileTrigger, false);
    for (const [NAME, STATE] of Object.entries({
        death: RESULT.commonAbilities.deathCleared,
        destruction: RESULT.commonAbilities.destructionCleared,
        combatEnd: RESULT.commonAbilities.combatEndCleared,
    })) {
        assert.deepEqual(STATE, { pending: false, expiresAtTick: 0, multiplier: 0 }, NAME);
    }
    assert.deepEqual(RESULT.commonAbilities.peaPowerValues, [1.25, 1.35, 1.55]);
    assert.equal(RESULT.commonAbilities.freeSplitCount, 0);
    for (const [NAME, RUN] of Object.entries({
        fresh: RESULT.commonAbilities.peaRealRuntime,
        oldSave: RESULT.commonAbilities.peaOldSaveRuntime,
    })) {
        assert.equal(RUN.triggeredByRealWorldStep, true, `${NAME} Pea reaches recovery through Garden.step()`);
        assert.equal(RUN.grounded, true, `${NAME} Pea is grounded when recovery begins`);
        assert.equal(RUN.abilityIdle, true, `${NAME} Pea has finished the interrupted attack`);
        assert.equal(RUN.expiresAtTick, RUN.tickAtCapture + 40, `${NAME} Pea boost lasts 40 logic ticks`);
        assert.equal(RUN.multiplier, 1.25, `${NAME} Common Pea gets +25% movement speed`);
        assert.equal(RUN.activeSpeed, 2.5, `${NAME} recovery steering moves at 125% of baseline`);
        assert.equal(RUN.expiredSpeed, 2, `${NAME} movement returns to baseline after the 40 tick window`);
        assert.equal(RUN.migrationRefund, 0, `${NAME} baseline migration does not refund uninvested points`);
        assert.equal(RUN.migrationVersion, 2);
        assert.equal(RUN.splitCount, 0, 'the paid Rare Pea split remains separate');
        assert.deepEqual(RUN.effectiveConfig, { durationTicks: 40, speedMultiplier: 1.25 });
    }
    assert.deepEqual(RESULT.commonAbilities.legacyRefund, {
        first: 3,
        second: 0,
        availablePoints: 3,
        rootUnlocked: false,
        gradeLevel: 0,
        powerLevel: 1,
        migrationVersion: 2,
    });
    assert.deepEqual(RESULT.commonAbilities.kidneyRuntimeRestore, {
        valid: true,
        phase: 'windup',
        elapsed: 0.1,
        readyTick: 72,
        lastUseTick: 12,
    });
    assert.deepEqual(
        {
            riceCritical: RESULT.combatIntegration.riceCritical,
            riceHitCount: RESULT.combatIntegration.riceHitCount,
            barleyArmorBefore: RESULT.combatIntegration.barleyArmorBefore,
            barleyArmorAfter: RESULT.combatIntegration.barleyArmorAfter,
            barleyHitCount: RESULT.combatIntegration.barleyHitCount,
            barleyApplied: RESULT.combatIntegration.barleyApplied,
        },
        {
            riceCritical: true,
            riceHitCount: 1,
            barleyArmorBefore: 100,
            barleyArmorAfter: 99,
            barleyHitCount: 1,
            barleyApplied: true,
        },
    );
    assert(
        Math.abs(RESULT.combatIntegration.barleyHitDamage - RESULT.combatIntegration.barleyDamageAtPreHitArmor) < 1e-9,
    );
    const ATTACK_REPORT = RESULT.wheatAttackWindows
        .map((window) => `${window.recoveryIntervals[0].toFixed(3)}s/${window.hitCount} hits`)
        .join(', ');
    await clean(P);
    await C.close();
    CHECK(
        `Rice critical, Barley shred, Common baseline saves; actual 1s-base recover-to-attack intervals (base/+50%/+75%/+112.5%): ${ATTACK_REPORT}; mixed-buff expiry interval ${RESULT.wheatProgressPreservation.interval.toFixed(3)}s (returns to 1.0x)`,
    );
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
        STATE.farmPlots.plots[0].capacityLevel = 1;
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
        return (
            STATE.farmUpgrades.food === 0 &&
            STATE.farmPlots.plots[0].capacityLevel === 0 &&
            STATE.availablePoints === 14
        );
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
    const PHYSICS_CADENCE = await P.evaluate(() => {
        const WORLD = new BUDMORI.sim.constructor(980),
            BEFORE_LOGIC = WORLD.metrics.logicTicks || 0,
            BEFORE_PHYSICS = WORLD.metrics.physicsSteps || 0;
        WORLD.step(1 / 20);
        return {
            logicTicks: WORLD.metrics.logicTicks - BEFORE_LOGIC,
            physicsSteps: WORLD.metrics.physicsSteps - BEFORE_PHYSICS,
        };
    });
    assert.deepEqual(PHYSICS_CADENCE, { logicTicks: 1, physicsSteps: 1 });
    const GIANT_PROGRESS = await P.evaluate(async () => {
        const { GiantSkill: GIANT_SKILL } = await import('/src/features/formation-skills/giant/model.js'),
            WORLD = new BUDMORI.sim.constructor(984),
            EFFECTS = [],
            SKILL = new GIANT_SKILL(),
            OWNER = {
                world: WORLD,
                allies: () => WORLD.units,
                addEffect: (_kind, effect) => EFFECTS.push({ ...effect, age: 0 }),
            };
        for (const UNIT of [...WORLD.units]) {
            WORLD.unitCollection.remove(UNIT, { markProgress: false });
        }
        WORLD.playerProgression.farmPlots.plots[0].capacityLevel = 4;
        for (let index = 0; index < 10; index++) {
            if (!WORLD.spawn(0, 1, index, 0)) {
                throw Error('failed to create Giant target fixture');
            }
        }
        const BASE = WORLD.units[0],
            BASE_STATS = { radius: BASE.radius, height: BASE.height, bodyScale: BASE.bodyScale },
            TARGETS = [];
        for (const LEVEL of [1, 2, 3, 10]) {
            for (const UNIT of WORLD.units) {
                UNIT.giantUntil = 0;
            }
            EFFECTS.length = 0;
            if (!SKILL.cast(OWNER, { level: LEVEL })) {
                throw Error('Giant cast failed at level ' + LEVEL);
            }
            TARGETS.push(WORLD.units.filter((unit) => unit.giantUntil > WORLD.time).length);
        }
        const ACTIVE = WORLD._unitForId(EFFECTS[0].unitId),
            SIZE = {
                radius: ACTIVE.radius / BASE_STATS.radius,
                height: ACTIVE.height / BASE_STATS.height,
                bodyScale: ACTIVE.bodyScale / BASE_STATS.bodyScale,
                duration: EFFECTS[0].duration,
                until: ACTIVE.giantUntil,
            };
        WORLD.time = 20;
        SKILL.update(OWNER, EFFECTS[0], 20);
        return {
            targets: TARGETS,
            size: SIZE,
            expiresAtTime20: ACTIVE.giantScale === 1 && ACTIVE.giantUntil === 0,
        };
    });
    assert.deepEqual(GIANT_PROGRESS.targets, [3, 5, 8, 8]);
    assert.deepEqual(GIANT_PROGRESS.size, { radius: 3, height: 3, bodyScale: 3, duration: 20, until: 20 });
    assert.equal(GIANT_PROGRESS.expiresAtTime20, true);
    const JACOBI_ORDERING = await P.evaluate(() => {
        const SIMULATE = (reverse) => {
            const WORLD = new BUDMORI.sim.constructor(981);
            WORLD.units = [];
            for (let index = 0; index < 6; index++) {
                const UNIT = WORLD.spawn(0, 1, 0, 0);
                UNIT.growth = BUDMORI.CONFIG.farm.breeding.matureMeals;
                UNIT.growthElapsed = UNIT.growthDuration;
                UNIT.cooldown = 0;
                UNIT.vx = UNIT.vy = 0;
            }
            if (reverse) {
                WORLD.units = [...WORLD.units].reverse();
            }
            WORLD._rebuildUnitSpatialIndex(WORLD.units);
            WORLD.resolveFarmContacts(WORLD.units, 1 / 20);
            return {
                positions: WORLD.units.map(({ id, x, y }) => ({ id, x, y })).sort((a, b) => a.id - b.id),
                iterations: WORLD.metrics.physicsSolverIterations,
            };
        };
        return { forward: SIMULATE(false), reverse: SIMULATE(true) };
    });
    assert(JACOBI_ORDERING.forward.iterations > 0, 'overlap invokes the separate contact solver counter');
    assert(
        JACOBI_ORDERING.forward.positions.every((unit, index) => {
            const OTHER = JACOBI_ORDERING.reverse.positions[index];
            return unit.id === OTHER.id && Math.hypot(unit.x - OTHER.x, unit.y - OTHER.y) < 1e-8;
        }),
        'dense overlap resolution is independent of roster iteration order',
    );
    const JACOBI_CONSTRAINTS = await P.evaluate(() => {
        const CREATE_PAIR = () => {
            const WORLD = new BUDMORI.sim.constructor(982);
            WORLD.units = [];
            const A = WORLD.spawn(0, 1, -0.2, 0),
                B = WORLD.spawn(0, 1, 0.2, 0);
            A.growth = B.growth = BUDMORI.CONFIG.farm.breeding.matureMeals;
            A.growthElapsed = A.growthDuration;
            B.growthElapsed = B.growthDuration;
            WORLD._rebuildUnitSpatialIndex(WORLD.units);
            return { world: WORLD, a: A, b: B };
        };
        const FIXED_CASE = CREATE_PAIR(),
            FIXED_POSITION = { x: FIXED_CASE.a.x, y: FIXED_CASE.a.y };
        FIXED_CASE.a.fixed = true;
        FIXED_CASE.world.resolveFarmContacts(FIXED_CASE.world.units, 1 / 20);
        const FIXED_BODY_UNCHANGED = FIXED_CASE.a.x === FIXED_POSITION.x && FIXED_CASE.a.y === FIXED_POSITION.y,
            DYNAMIC_BODY_MOVED = Math.hypot(FIXED_CASE.b.x - 0.2, FIXED_CASE.b.y) > 1e-4;
        const MASS_CASE = CREATE_PAIR();
        MASS_CASE.a.mass = 2;
        MASS_CASE.b.mass = 1;
        const BEFORE_A = { x: MASS_CASE.a.x, y: MASS_CASE.a.y },
            BEFORE_B = { x: MASS_CASE.b.x, y: MASS_CASE.b.y };
        MASS_CASE.world.resolveFarmContacts(MASS_CASE.world.units, 1 / 20);
        const DELTA_A = Math.hypot(MASS_CASE.a.x - BEFORE_A.x, MASS_CASE.a.y - BEFORE_A.y),
            DELTA_B = Math.hypot(MASS_CASE.b.x - BEFORE_B.x, MASS_CASE.b.y - BEFORE_B.y),
            SCRATCH = MASS_CASE.world._contactCorrectionX;
        MASS_CASE.world.resolveFarmContacts(MASS_CASE.world.units, 1 / 20);
        return {
            fixedBodyUnchanged: FIXED_BODY_UNCHANGED,
            dynamicBodyMoved: DYNAMIC_BODY_MOVED,
            contactPairs: FIXED_CASE.world.metrics.contacts,
            inverseMassDisplacementRatio: DELTA_B / DELTA_A,
            correctionScratchReused: SCRATCH === MASS_CASE.world._contactCorrectionX,
        };
    });
    assert.equal(JACOBI_CONSTRAINTS.fixedBodyUnchanged, true);
    assert.equal(JACOBI_CONSTRAINTS.dynamicBodyMoved, true);
    assert.equal(JACOBI_CONSTRAINTS.contactPairs, 1, 'each fixed/dynamic pair is resolved once');
    assert(
        Math.abs(JACOBI_CONSTRAINTS.inverseMassDisplacementRatio - 2) < 1e-6,
        'position corrections follow inverse mass',
    );
    assert.equal(JACOBI_CONSTRAINTS.correctionScratchReused, true);
    REPORT.physicsSolver = { ...PHYSICS_CADENCE, jacobiIterations: JACOBI_ORDERING.forward.iterations };
    const PERFORMANCE_REPRO = await P.evaluate(() => {
        const WORLD = BUDMORI.sim;
        WORLD.units = [];
        WORLD.playerProgression.farmPlots.targetBasisPoints = [10000, 0, 0, 0, 0, 0, 0, 0, 0];
        for (let index = 0; index < 41; index++) {
            const UNIT = WORLD.spawn(0, 1, ((index % 8) - 3.5) * 2.1, (Math.floor(index / 8) - 2.5) * 1.9);
            if (!UNIT) {
                throw Error('could not seed 41 cadence test residents');
            }
            UNIT.growth = BUDMORI.CONFIG.farm.breeding.matureMeals;
            UNIT.growthElapsed = UNIT.growthDuration;
            UNIT.meals = 0;
            UNIT.cooldown = UNIT.cooldownDuration = 999;
        }
        const FOOD = Array.from({ length: 140 }, (_, index) => {
            const X = ((index % 14) - 6.5) * 1.5,
                Y = (Math.floor(index / 14) - 5) * 1.4;
            return {
                x: X,
                y: Y,
                z: 0,
                vx: 0,
                vy: 0,
                vz: 0,
                seed: index,
                phase: 'grounded',
                tx: X,
                ty: Y,
            };
        });
        WORLD.activeFarmPlot.food = FOOD;
        WORLD.food = FOOD;
        WORLD._rebuildUnitSpatialIndex(WORLD.units);
        WORLD._rebuildFoodSpatialIndex();
        for (const UNIT of WORLD.units) {
            WORLD.requestGroundFoodTarget(UNIT);
        }
        if (WORLD._foodSearchScheduler.metrics.queueDepth === 0) {
            throw Error('the cadence fixture did not enqueue any eligible food searches');
        }
        BUDMORI.runtime.capturePresentation('reset');
        return { units: WORLD.units.length, food: WORLD.food.length };
    });
    assert.deepEqual(PERFORMANCE_REPRO, { units: 41, food: 140 });
    REPORT.performanceReproduction = PERFORMANCE_REPRO;
    await P.waitForTimeout(220);
    await P.evaluate(() => {
        const WORLD = BUDMORI.sim;
        WORLD.food.splice(-5);
        WORLD._rebuildFoodSpatialIndex();
        WORLD.warehouseFood = 5;
        for (const UNIT of WORLD.units) {
            WORLD.clearFoodTargetSearch(UNIT);
            WORLD.requestGroundFoodTarget(UNIT);
        }
        BUDMORI.runtime.capturePresentation('reset');
    });
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
    assert.equal(PERFORMANCE.counts.physicsSteps.total, PERFORMANCE.counts.logicTicks.total);
    assert.equal(PERFORMANCE.counts.workSchedulerTicks.total, PERFORMANCE.counts.logicTicks.total);
    assert(PERFORMANCE.counts.workSchedulerUnits.total <= PERFORMANCE.counts.logicTicks.total * 24);
    assert.equal(
        PERFORMANCE.counts.workSchedulerUnits.total,
        PERFORMANCE.counts.foodSearchCandidateChecks.total + PERFORMANCE.counts.foodSearchCellVisits.total,
    );
    assert(
        PERFORMANCE.counts.workSchedulerQueueDepth.total > 0,
        JSON.stringify({
            queued: PERFORMANCE.counts.workSchedulerJobsQueued,
            completed: PERFORMANCE.counts.workSchedulerJobsCompleted,
            waiting: PERFORMANCE.counts.workSchedulerWaitedJobs,
            queueDepth: PERFORMANCE.counts.workSchedulerQueueDepth,
            logic: PERFORMANCE.counts.logicTicks,
            foods: PERFORMANCE.counts.foodSearchCandidateChecks,
        }),
    );
    assert(PERFORMANCE.counts.workSchedulerJobsCompleted.total > 0);
    assert(PERFORMANCE.counts.workSchedulerWaitedJobs.total > 0);
    assert(PERFORMANCE.counts.workSchedulerWaitingTicks.total >= 0);
    assert(PERFORMANCE.counts.physicsSolverIterations.total >= 0);
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
    const LOAD_SETUP = await P.evaluate(() => {
        const SESSION = BUDMORI.runtime,
            WORLD = SESSION.world;
        SESSION.paused = true;
        for (const UNIT of [...WORLD.units]) {
            WORLD.unitCollection.remove(UNIT, { markProgress: false });
        }
        WORLD.playerProgression.farmPlots.plots[0].capacityLevel = 4;
        WORLD.random = () => 0.5;
        for (let index = 0; index < 41; index++) {
            const UNIT = WORLD.spawn(0, 1, ((index % 9) - 4) * 1.6, (Math.floor(index / 9) - 2) * 1.4);
            if (!UNIT) {
                throw Error('failed to create 41-unit performance fixture');
            }
            UNIT.growth = BUDMORI.CONFIG.farm.breeding.matureMeals;
            UNIT.growthElapsed = UNIT.growthDuration;
            UNIT.cooldown = UNIT.cooldownDuration = 10;
            UNIT.down = 0;
        }
        WORLD.food = [];
        for (let index = 0; index < 140; index++) {
            WORLD.spawnFood(((index % 14) - 6.5) * 0.9, (Math.floor(index / 14) - 5) * 0.7);
        }
        for (const FOOD of WORLD.food) {
            FOOD.phase = 'grounded';
            FOOD.z = 0;
            FOOD.vx = FOOD.vy = FOOD.vz = 0;
        }
        WORLD._rebuildUnitSpatialIndex();
        WORLD._rebuildFoodSpatialIndex();
        SESSION.capturePresentation('reset');
        const DETAIL = document.querySelector('#diagnosticDetail');
        DETAIL.checked = false;
        DETAIL.dispatchEvent(new Event('change', { bubbles: true }));
        DETAIL.checked = true;
        DETAIL.dispatchEvent(new Event('change', { bubbles: true }));
        SESSION.loop.resetTiming();
        SESSION.paused = false;
        return { units: WORLD.units.length, food: WORLD.food.length };
    });
    assert.deepEqual(LOAD_SETUP, { units: 41, food: 140 });
    await P.waitForTimeout(2800);
    const LOAD_PROFILE = await P.evaluate(() => {
        const METRICS = globalThis.BudmoriPerformanceDiagnostics.snapshot(),
            SUMMARY = globalThis.BudmoriPerformanceDiagnostics.summary(),
            STAGES = METRICS.stagesMs,
            AVG = (name) => STAGES[name]?.mean ?? null;
        return {
            units: BUDMORI.sim.units.length,
            food: BUDMORI.sim.food.length,
            retainedFrames: METRICS.retainedFrames,
            windowMs: METRICS.windowMs,
            logicTicks: METRICS.counts.logicTicks.total,
            physicsCalls: METRICS.counts.physicsSteps.total,
            logicTicksPerRaf: METRICS.counts.logicTicks.total / Math.max(1, METRICS.retainedFrames),
            physicsCallsPerLogicTick: METRICS.counts.physicsSteps.total / Math.max(1, METRICS.counts.logicTicks.total),
            solverIterations: METRICS.counts.physicsSolverIterations.total,
            solverIterationsPerPhysicsCall:
                METRICS.counts.physicsSolverIterations.total / Math.max(1, METRICS.counts.physicsSteps.total),
            catchupTicks: METRICS.counts.catchupTicks.total,
            captures: METRICS.counts.presentationCaptures.total,
            capturesPerFrame: METRICS.counts.presentationCaptures.total / Math.max(1, METRICS.retainedFrames),
            capturedEntitiesPerRaf: METRICS.counts.presentationEntities.total / Math.max(1, METRICS.retainedFrames),
            schedulerMaxWaitTicksPerRaf: METRICS.counts.workSchedulerMaxWaitTicks.max,
            parentSimulationMs: AVG('simulation'),
            stepLoopMs: AVG('stepLoop'),
            pulseCaptureMs: AVG('pulseCapture'),
            onAdvanceMs: AVG('onAdvance'),
            logicMs: AVG('logic'),
            physicsMs: AVG('physics'),
            snapshotPrepMs: AVG('presentationSnapshot'),
            runtimeCaptureMs: AVG('runtimeCapture'),
            renderMs: AVG('render'),
            unattributedSimulationMs: Math.max(0, AVG('simulation') - AVG('stepLoop') - AVG('pulseCapture')),
            summary: SUMMARY,
        };
    });
    assert.equal(LOAD_PROFILE.units, 41);
    assert.equal(LOAD_PROFILE.food, 140);
    assert(LOAD_PROFILE.retainedFrames > 1);
    assert.equal(LOAD_PROFILE.physicsCalls, LOAD_PROFILE.logicTicks);
    REPORT.loadReproduction = LOAD_PROFILE;
    REPORT.cadence = {
        elapsedSeconds: PERFORMANCE.windowMs / 1000,
        logicTicks: PERFORMANCE.counts.logicTicks.total,
        physicsSteps: PERFORMANCE.counts.physicsSteps.total,
        solverIterations: PERFORMANCE.counts.physicsSolverIterations.total,
        workScheduler: {
            ticks: PERFORMANCE.counts.workSchedulerTicks.total,
            units: PERFORMANCE.counts.workSchedulerUnits.total,
            candidates: PERFORMANCE.counts.foodSearchCandidateChecks.total,
            cells: PERFORMANCE.counts.foodSearchCellVisits.total,
            queued: PERFORMANCE.counts.workSchedulerJobsQueued.total,
            completed: PERFORMANCE.counts.workSchedulerJobsCompleted.total,
            waitingTicks: PERFORMANCE.counts.workSchedulerWaitingTicks.total,
            budgetExhaustions: PERFORMANCE.counts.workSchedulerBudgetExhaustions.total,
        },
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
async function mergePolicyRegression() {
    const C = await browser.newContext({ viewport: { width: 1280, height: 800 } }),
        P = await open(C);
    await P.waitForFunction(() => window.BUDMORI);
    const RESULT = await P.evaluate(async () => {
        const { GiantSkill: GIANT_SKILL } = await import('/src/features/formation-skills/giant/model.js'),
            GIANT_WORLD = new BUDMORI.sim.constructor(984),
            GIANT_EFFECTS = [],
            GIANT = new GIANT_SKILL(),
            GIANT_OWNER = {
                world: GIANT_WORLD,
                allies: () => GIANT_WORLD.units,
                addEffect: (_kind, effect) => GIANT_EFFECTS.push({ ...effect, age: 0 }),
            };
        for (const UNIT of [...GIANT_WORLD.units]) {
            GIANT_WORLD.unitCollection.remove(UNIT, { markProgress: false });
        }
        GIANT_WORLD.playerProgression.farmPlots.plots[0].capacityLevel = 4;
        for (let index = 0; index < 10; index++) {
            if (!GIANT_WORLD.spawn(0, 1, index, 0)) {
                throw Error('failed to create Giant target fixture');
            }
        }
        const BASE = GIANT_WORLD.units[0],
            BASE_STATS = { radius: BASE.radius, height: BASE.height, bodyScale: BASE.bodyScale },
            TARGETS = [];
        for (const LEVEL of [1, 2, 3, 10]) {
            for (const UNIT of GIANT_WORLD.units) {
                UNIT.giantUntil = 0;
            }
            GIANT_EFFECTS.length = 0;
            if (!GIANT.cast(GIANT_OWNER, { level: LEVEL })) {
                throw Error('Giant cast failed at level ' + LEVEL);
            }
            TARGETS.push(GIANT_WORLD.units.filter((unit) => unit.giantUntil > GIANT_WORLD.time).length);
        }
        const GIANT_ACTIVE = GIANT_WORLD._unitForId(GIANT_EFFECTS[0].unitId),
            SIZE = {
                radius: GIANT_ACTIVE.radius / BASE_STATS.radius,
                height: GIANT_ACTIVE.height / BASE_STATS.height,
                bodyScale: GIANT_ACTIVE.bodyScale / BASE_STATS.bodyScale,
                duration: GIANT_EFFECTS[0].duration,
                until: GIANT_ACTIVE.giantUntil,
            };
        GIANT_WORLD.time = 20;
        GIANT.update(GIANT_OWNER, GIANT_EFFECTS[0], 20);

        const WORLD = new BUDMORI.sim.constructor(965);
        for (const UNIT of [...WORLD.units]) {
            WORLD.unitCollection.remove(UNIT, { markProgress: false });
        }
        WORLD.playerProgression.farmPlots.plots[0].capacityLevel = 4;
        WORLD.random = () => 0.5;
        while (WORLD.units.length < 53) {
            const UNIT = WORLD.spawn(0, 1, 0, 0);
            if (!UNIT) {
                throw Error('failed to create the over-capacity merge fixture');
            }
            UNIT.growth = BUDMORI.CONFIG.farm.breeding.matureMeals;
            UNIT.growthElapsed = UNIT.growthDuration;
            UNIT.meals = 1;
            UNIT.cooldown = 0;
            UNIT.down = 0;
        }
        for (const UNIT of WORLD.units) {
            UNIT.x = UNIT.y = UNIT.z = 0;
        }
        Object.defineProperty(WORLD, 'capacity', { configurable: true, value: 50 });
        const ROSTER_BEFORE_MERGE = WORLD.units.length;
        const [A, B] = WORLD.units;
        A.mateId = B.id;
        B.mateId = A.id;
        const BREED_OWNER = WORLD.breedingReservationOwner(A, B);
        if (!WORLD.unitCollection.reserve(BREED_OWNER, [A, B])) {
            throw Error('failed to reserve the reciprocal breeding pair');
        }
        WORLD._rebuildUnitSpatialIndex();
        const AVAILABILITY = WORLD.mergeAvailability(),
            STARTED = WORLD.startManualMerge(),
            TASK = WORLD.mergeTasks[0],
            SELECTED_MATE_PAIR = TASK?.materialIds.some((id) => id === A.id || id === B.id),
            BREED_LINKS_CLEARED = A.mateId === 0 && B.mateId === 0,
            BREED_OWNER_RELEASED =
                !WORLD.unitCollection.reservationOwner(A)?.startsWith('breed:') &&
                !WORLD.unitCollection.reservationOwner(B)?.startsWith('breed:');
        if (!STARTED || !TASK) {
            throw Error('manual merge did not start above capacity');
        }
        TASK.elapsed = TASK.duration;
        const COMPLETED = WORLD.resolveMergeTaskAfterMovement();
        return {
            giantTargets: TARGETS,
            giantSize: SIZE,
            giantExpiresAt20: GIANT_ACTIVE.giantScale === 1 && GIANT_ACTIVE.giantUntil === 0,
            roster: ROSTER_BEFORE_MERGE,
            capacity: WORLD.capacity,
            availabilityCode: AVAILABILITY.code,
            started: STARTED,
            selectedMatePair: SELECTED_MATE_PAIR,
            breedLinksCleared: BREED_LINKS_CLEARED,
            breedOwnerReleased: BREED_OWNER_RELEASED,
            completed: COMPLETED,
            afterMerge: WORLD.units.length,
            minimumSpeciesCount: WORLD.units.filter((unit) => unit.species === 0).length >= 2,
        };
    });
    assert.deepEqual(RESULT.giantTargets, [3, 5, 8, 8]);
    assert.deepEqual(RESULT.giantSize, { radius: 3, height: 3, bodyScale: 3, duration: 20, until: 20 });
    assert.equal(RESULT.giantExpiresAt20, true);
    assert.equal(RESULT.roster, 53);
    assert.equal(RESULT.capacity, 50);
    assert.equal(RESULT.availabilityCode, 'ready');
    assert.equal(RESULT.started, true);
    assert.equal(RESULT.selectedMatePair, true);
    assert.equal(RESULT.breedLinksCleared, true);
    assert.equal(RESULT.breedOwnerReleased, true);
    assert.equal(RESULT.completed, true);
    assert.equal(RESULT.afterMerge, 52);
    assert.equal(RESULT.minimumSpeciesCount, true);
    CHECK(
        'Giant 3/5/8 target counts, 3× dimensions and 20s duration; 53/50 merge atomically takes over a valid breed pair',
    );
    await C.close();
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
        tabs: [...document.querySelectorAll('#gameMenuTabs [role="tab"]')].map((button) => button.id),
        roles: !!document.querySelector('#roles'),
        essentials: [
            'feed',
            'raidControls',
            'deploymentCards',
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
    assert.deepEqual(MENU_CONTRACT.tabs, [
        'menuTabFarms',
        'menuTabGrowth',
        'menuTabAbilities',
        'menuTabDeployment',
        'menuTabFormation',
    ]);
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
    await P.evaluate(() => {
        const W = BUDMORI.sim;
        window.__manualFeedEventCheck = W.tryStartFarmBossEvent;
        W.tryStartFarmBossEvent = () => false;
        W.warehouseFood = 20;
        W.food.length = 0;
        W._foodSpatialDirty = true;
    });
    await P.waitForFunction(() => !document.querySelector('#feed').disabled);
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
        BUDMORI.sim.tryStartFarmBossEvent = window.__manualFeedEventCheck;
        delete window.__manualFeedEventCheck;
    });
    const WAS_PAUSED_FOR_FEED = await P.evaluate(() => BUDMORI.runtime.paused);
    if (WAS_PAUSED_FOR_FEED) {
        await P.locator('#pause').click();
        await P.waitForFunction(() => !BUDMORI.runtime.paused);
    }
    await P.evaluate(() => {
        const W = BUDMORI.sim;
        W.food.length = 0;
        W.warehouseFood = 2;
        W._foodSpatialDirty = true;
    });
    const CANVAS_BOX = await P.locator('#world').boundingBox(),
        FOOD_CAMERA = await cameraSnapshot(P);
    await P.mouse.move(CANVAS_BOX.x + CANVAS_BOX.width / 2, CANVAS_BOX.y + CANVAS_BOX.height / 2);
    await P.mouse.down();
    await P.waitForTimeout(230);
    await P.mouse.up();
    await P.waitForFunction(() => BUDMORI.sim.food.length >= 1 && BUDMORI.sim.warehouseFood <= 1);
    assert.deepEqual(await cameraSnapshot(P), FOOD_CAMERA, 'held floor feeding stays fixed to the pointer-down point');
    if (WAS_PAUSED_FOR_FEED) {
        await P.locator('#pause').click();
        await P.waitForFunction(() => BUDMORI.runtime.paused);
    }
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
    await P.waitForFunction((before) => BUDMORI.sim.metrics.merges === before + 2, MANUAL_FUSION, {
        timeout: 15000,
    });
    await P.waitForTimeout(1000);
    assert.equal(
        await P.evaluate((before) => BUDMORI.sim.metrics.merges - before, MANUAL_FUSION),
        2,
        'each press queues exactly one fusion and both disjoint tasks may resolve together',
    );
    const MERGE_UNAVAILABLE = await P.evaluate(() => {
        const BUTTON = document.querySelector('#merge');
        return {
            disabled: BUTTON.disabled,
            label: BUTTON.getAttribute('aria-label'),
            reason: document.querySelector('#mergeNotice').textContent,
        };
    });
    assert.equal(
        await P.locator('#merge').isVisible(),
        true,
        'Farm keeps the merge button visible without a legal pair',
    );
    assert.equal(
        MERGE_UNAVAILABLE.disabled,
        true,
        'the merge button disables when the two-unit reserve prevents a merge',
    );
    assert(MERGE_UNAVAILABLE.label.includes('불가') && MERGE_UNAVAILABLE.reason.length > 0);
    const RECOVERED_MERGE_COUNT = await P.evaluate(() => {
        const W = BUDMORI.sim;
        for (let index = 0; index < 2; index++) {
            const UNIT = W.spawn(0, 2, index * 1.1 - 0.55, 1.2);
            UNIT.growth = BUDMORI.CONFIG.farm.breeding.matureMeals;
            UNIT.growthElapsed = UNIT.growthDuration;
            UNIT.meals = 1;
            UNIT.cooldown = 0;
        }
        for (const UNIT of W.units) {
            if (UNIT.species === 0 && UNIT.tier === 2) {
                UNIT.cooldown = 0;
                UNIT.growth = BUDMORI.CONFIG.farm.breeding.matureMeals;
                UNIT.growthElapsed = UNIT.growthDuration;
                UNIT.meals = 1;
            }
        }
        return W.metrics.merges;
    });
    await P.waitForFunction(() => {
        const BUTTON = document.querySelector('#merge');
        return BUTTON && !BUTTON.hidden && !BUTTON.disabled;
    });
    assert.equal(
        await P.locator('#merge').isVisible(),
        true,
        'the merge button stays visible when eligibility returns',
    );
    await P.locator('#merge').click();
    await P.waitForFunction((before) => BUDMORI.sim.metrics.merges === before + 1, RECOVERED_MERGE_COUNT, {
        timeout: 15000,
    });
    CHECK(
        'Merge button stays visible with a reason when unavailable and re-enables after new valid materials are added',
    );
    assert.equal(await P.locator('#breed').count(), 0, 'breeding has no mode switch');
    const RESERVATION_INVARIANT = await P.evaluate(async () => {
        const { snapshot: SNAPSHOT, restore: RESTORE } = await import('/src/farm-state.js'),
            { captureFarmProgress: CAPTURE_PROGRESS, validateFarmProgress: VALIDATE_PROGRESS } =
                await import('/src/farm-progress.js'),
            W = new BUDMORI.sim.constructor(1223);
        W.units = [];
        for (let index = 0; index < 6; index++) {
            const UNIT = W.spawn(0, 1, index * 1.1, 0);
            UNIT.growth = BUDMORI.CONFIG.farm.breeding.matureMeals;
            UNIT.growthElapsed = UNIT.growthDuration;
            UNIT.meals = 1;
            UNIT.cooldown = 0;
        }
        const MATE = W.findOrReserveMate(W.units[0]),
            MATE_IDS = [W.units[0].id, MATE.id],
            FIRST_START = W.startManualMerge(),
            SECOND_START = W.startManualMerge(),
            TASKS = W.mergeTasks.map((task) => [...task.materialIds]),
            TASK_OWNERS = TASKS.map((ids) => W.unitCollection.reservationOwner(ids[0])),
            MATERIAL_IDS = TASKS.flat(),
            DTO = SNAPSHOT(W);
        const MERGED_IDS = new Set(TASKS.flat()),
            BREED_PAIR_SELECTED = MATE_IDS.some((id) => MERGED_IDS.has(id)),
            BREED_RESERVATION_SAFE = MATE_IDS.every((id) => {
                const UNIT = W.units.find((unit) => unit.id === id),
                    OWNER = W.unitCollection.reservationOwner(id);
                if (BREED_PAIR_SELECTED) {
                    return UNIT?.mateId === 0 && (MERGED_IDS.has(id) ? OWNER?.startsWith('merge:') : OWNER === null);
                }
                return (
                    UNIT?.mateId === MATE_IDS.find((mateId) => mateId !== id) &&
                    OWNER ===
                        W.breedingReservationOwner(
                            W.units.find((unit) => unit.id === MATE_IDS[0]),
                            W.units.find((unit) => unit.id === MATE_IDS[1]),
                        ) &&
                    W._isValidBreedReservation(UNIT, OWNER)
                );
            });
        const RESTORED = RESTORE(DTO),
            PROGRESS = CAPTURE_PROGRESS(W);
        VALIDATE_PROGRESS(PROGRESS);
        return {
            started: FIRST_START,
            secondStart: SECOND_START,
            taskCount: TASKS.length,
            taskSizes: TASKS.map((ids) => ids.length),
            disjointTasks: new Set(MATERIAL_IDS).size === MATERIAL_IDS.length,
            breedReservationSafe: BREED_RESERVATION_SAFE,
            uniqueOwners: new Set(TASK_OWNERS).size === TASK_OWNERS.length,
            restoredTasks: RESTORED.mergeTasks.length,
            restoredSuctionState: RESTORED.mergeTasks.every(
                (task) =>
                    Number.isFinite(task.centerX) &&
                    Number.isFinite(task.centerY) &&
                    Number.isFinite(task.centerZ) &&
                    task.startPositions.length === task.materialIds.length,
            ),
            restoredReservations: RESTORED.mergeTasks.every((task) =>
                task.materialIds.every(
                    (id) =>
                        RESTORED.unitCollection.reservationOwner(id) ===
                        RESTORED.unitCollection.reservationOwner(task.materialIds[0]),
                ),
            ),
            noModeSaved: !Object.hasOwn(DTO, 'mode'),
            noModeRestored: !Object.hasOwn(RESTORED, 'mode'),
            compactProgressHasNoMode: !Object.hasOwn(PROGRESS, 'mode'),
            availabilityTracksRemainingMaterials: W.mergeAvailability().available === true,
        };
    });
    assert.deepEqual(RESERVATION_INVARIANT, {
        started: true,
        secondStart: true,
        taskCount: 2,
        taskSizes: [2, 2],
        disjointTasks: true,
        breedReservationSafe: true,
        uniqueOwners: true,
        restoredTasks: 2,
        restoredSuctionState: true,
        restoredReservations: true,
        noModeSaved: true,
        noModeRestored: true,
        compactProgressHasNoMode: true,
        availabilityTracksRemainingMaterials: true,
    });
    CHECK(
        'Concurrent fusion tasks reserve disjoint units, restore from snapshots, and keep breeding reservations separate',
    );
    await P.evaluate(() => {
        BUDMORI.sim.playerProgression.level = 10;
        BUDMORI.sim.playerProgression.availablePoints = 8;
    });
    await openMenuTab(P, 'growth');
    assert.equal(new URL(P.url()).hash, '#/growth');
    await P.locator('[data-progression-farm-node="food"]').click();
    await P.waitForFunction(() => BUDMORI.sim.playerProgression.farmUpgrades.food === 1);
    await P.locator('[data-progression-farm-node="growth"]').click();
    await P.waitForFunction(() => BUDMORI.sim.playerProgression.farmUpgrades.growth === 1);
    await openMenuTab(P, 'farms');
    await P.evaluate(() => {
        BUDMORI.sim.playerProgression.availablePoints = 6;
        BUDMORI.sim.markProgressChanged();
    });
    for (const CAPACITY of [75, 100, 150, 200]) {
        await P.locator('#farmExpand').click();
        await P.waitForFunction((value) => BUDMORI.sim.capacity === value, CAPACITY);
    }
    assert.equal(await P.evaluate(() => BUDMORI.sim.playerProgression.farmPlots.plots[0].capacityLevel), 4);
    await P.locator('#farmUnlock').click();
    await P.waitForFunction(() => BUDMORI.sim.farmPlots.size === 2);
    assert.equal(await P.evaluate(() => BUDMORI.sim.totalFarmCapacity), 250);
    await P.locator('[data-farm-plot="plot-2"]').click();
    await P.waitForFunction(() => BUDMORI.sim.activePlotId === 'plot-2');
    assert.equal(await P.evaluate(() => BUDMORI.sim.capacity), 50);
    await P.evaluate(() => {
        const INPUT = document.querySelector('[data-farm-target="1"]');
        INPUT.value = '1250';
        INPUT.dispatchEvent(new Event('input', { bubbles: true }));
        INPUT.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await P.waitForFunction(() => BUDMORI.sim.farmTargets[1] === 1250);
    assert.equal(await P.evaluate(() => BUDMORI.sim.farmTargets.reduce((sum, value) => sum + value, 0)), 10000);
    await closeMenu(P);
    CHECK(
        'Per-plot 50/75/100/150/200 capacity, two-point farm unlock, stable plot switching, and integer target-share redistribution',
    );
    const MULTIFARM_POLICY = await P.evaluate(async () => {
        const { snapshot: MAKE_SNAPSHOT, validateSnapshot: VALIDATE_SNAPSHOT } = await import('/src/farm-state.js'),
            { captureFarmProgress: CAPTURE, restoreFarmProgress: RESTORE_PROGRESS } =
                await import('/src/farm-progress.js'),
            { raidRosterEntries: RAID_ENTRIES } = await import('/src/raid-roster.js'),
            GARDEN = BUDMORI.sim.constructor,
            SWAP_WORLD = new GARDEN(9271);
        SWAP_WORLD.resetUnits();
        SWAP_WORLD.playerProgression.level = 4;
        SWAP_WORLD.playerProgression.availablePoints = 3;
        if (!SWAP_WORLD.unlockFarmPlot().ok || !SWAP_WORLD.expandFarmPlot('plot-1').ok) {
            throw Error('failed to create the two-plot exchange fixture');
        }
        SWAP_WORLD.playerProgression.farmPlots.targetBasisPoints = [10000, 0, 0, 0, 0, 0, 0, 0, 0];
        for (let index = 0; index < 75; index++) {
            if (!SWAP_WORLD.spawn(0, 1, -4 + (index % 10) * 0.8, -3 + Math.floor(index / 10) * 0.8)) {
                throw Error('failed to fill the expanded first plot');
            }
        }
        const FIRST_PARENT = SWAP_WORLD.unitCollection.unitsInPlot('plot-1')[0],
            EXCHANGE_IDS = SWAP_WORLD.unitCollection
                .unitsInPlot('plot-1')
                .filter((unit) => unit.id !== FIRST_PARENT.id)
                .slice(0, 24)
                .map((unit) => ({ unitId: unit.id, plotId: 'plot-2' }));
        if (!SWAP_WORLD.unitCollection.moveUnitsToPlots(EXCHANGE_IDS) || !SWAP_WORLD.switchFarmPlot('plot-2')) {
            throw Error('failed to prepare the cross-plot parent fixtures');
        }
        for (let index = 0; index < 25; index++) {
            if (!SWAP_WORLD.spawn(1, 1, -4 + (index % 8), -3 + Math.floor(index / 8))) {
                throw Error('failed to fill the second plot for its exchange');
            }
        }
        const SECOND_PARENT = SWAP_WORLD.unitCollection.unitsInPlot('plot-2').find((unit) => unit.species === 0);
        for (const PARENT of [FIRST_PARENT, SECOND_PARENT]) {
            PARENT.growth = BUDMORI.CONFIG.farm.breeding.matureMeals;
            PARENT.growthElapsed = PARENT.growthDuration = SWAP_WORLD.breedGrowthDuration();
            PARENT.meals = 1;
            PARENT.cooldown = 0;
        }
        const RESERVED = SWAP_WORLD.reserveCrossPlotBreed(FIRST_PARENT, SECOND_PARENT, { durationTicks: 1 }),
            PLAN = [...SWAP_WORLD._breedPlans.values()][0],
            EXCHANGED_ID = PLAN?.exchangeUnitIds[0] || 0;
        if (RESERVED) {
            SWAP_WORLD.simulationTick = PLAN.dueTick;
            SWAP_WORLD.advanceBreedPlans();
        }
        const SNAPSHOT = MAKE_SNAPSHOT(SWAP_WORLD),
            SNAPSHOT_VALID = VALIDATE_SNAPSHOT(SNAPSHOT),
            PROGRESS = CAPTURE(SWAP_WORLD),
            RESTORED = RESTORE_PROGRESS(PROGRESS),
            RAID = RAID_ENTRIES(RESTORED.roster.residents(), 100),
            RATIO_WORLD = new GARDEN(9272);
        RATIO_WORLD.resetUnits();
        const RATIO_UNITS = [
            RATIO_WORLD.spawn(0, 1, 0, 0),
            RATIO_WORLD.spawn(0, 1, 0.5, 0),
            RATIO_WORLD.spawn(1, 1, 1, 0),
            RATIO_WORLD.spawn(1, 1, 1.5, 0),
        ];
        RATIO_WORLD.playerProgression.farmPlots.targetBasisPoints = [5000, 5000, 0, 0, 0, 0, 0, 0, 0];
        const EVEN_ALLOWED = [RATIO_WORLD.canFarmPopulationAdvance(0), RATIO_WORLD.canFarmPopulationAdvance(1)];
        for (const PARENT of RATIO_UNITS.slice(0, 2)) {
            PARENT.growth = BUDMORI.CONFIG.farm.breeding.matureMeals;
            PARENT.growthElapsed = PARENT.growthDuration;
            PARENT.meals = 1;
        }
        const ACTIVE_RESERVED = RATIO_WORLD.reserveActiveBreedPair(RATIO_UNITS[0], RATIO_UNITS[1]),
            RESERVED_ALLOWED = [RATIO_WORLD.canFarmPopulationAdvance(0), RATIO_WORLD.canFarmPopulationAdvance(1)];
        const TARGET_REVISION_BEFORE = RATIO_WORLD.farmTargetRevision;
        RATIO_WORLD.setSpeciesTarget(0, 5100);
        RATIO_WORLD.setSpeciesTarget(0, 5000);
        const RESERVATION_INVALIDATED =
            RATIO_WORLD.farmTargetRevision === TARGET_REVISION_BEFORE + 2 &&
            RATIO_WORLD._activeBreedReservations.size === 0 &&
            RATIO_WORLD.unitCollection.reservationOwner(RATIO_UNITS[0]) === null &&
            RATIO_UNITS.slice(0, 2).every((unit) => unit.meals === 1);
        const EXTRA_A = RATIO_WORLD.spawn(0, 1, 2, 0);
        const THIRTY_TWO_ALLOWED = [RATIO_WORLD.canFarmPopulationAdvance(0), RATIO_WORLD.canFarmPopulationAdvance(1)];
        RATIO_WORLD.removeUnit(EXTRA_A);
        RATIO_WORLD.playerProgression.farmPlots.targetBasisPoints = [5100, 4900, 0, 0, 0, 0, 0, 0, 0];
        const FIFTY_ONE_ALLOWED = [RATIO_WORLD.canFarmPopulationAdvance(0), RATIO_WORLD.canFarmPopulationAdvance(1)];
        RATIO_WORLD.playerProgression.farmPlots.targetBasisPoints[1] = 0;
        const ZERO_ALLOWED = RATIO_WORLD.canFarmPopulationAdvance(1);

        const FORAGE_WORLD = new GARDEN(9273);
        FORAGE_WORLD.resetUnits();
        FORAGE_WORLD.playerProgression.level = 4;
        FORAGE_WORLD.playerProgression.availablePoints = 2;
        if (!FORAGE_WORLD.unlockFarmPlot().ok) {
            throw Error('failed to create the forage plot-switch fixture');
        }
        FORAGE_WORLD.playerProgression.farmPlots.targetBasisPoints = [10000, 0, 0, 0, 0, 0, 0, 0, 0];
        const INACTIVE_FORAGER = FORAGE_WORLD.spawn(0, 1, 0, 0),
            INACTIVE_FOOD = (FORAGE_WORLD.spawnFood(2, 0, 1, { allowBossEvent: false }), FORAGE_WORLD.food.at(-1));
        INACTIVE_FOOD.x = 2;
        INACTIVE_FOOD.y = 0;
        INACTIVE_FOOD.phase = 'grounded';
        INACTIVE_FOOD.z = INACTIVE_FOOD.vx = INACTIVE_FOOD.vy = INACTIVE_FOOD.vz = 0;
        FORAGE_WORLD._rebuildFoodSpatialIndex();
        FORAGE_WORLD.startForageAttempt(INACTIVE_FORAGER, 1 / 20, INACTIVE_FOOD);
        const FORAGE_DUE_TICK = INACTIVE_FORAGER.forageAttempt.dueTick;
        FORAGE_WORLD.switchFarmPlot('plot-2');
        const INACTIVE_ATTEMPT_RETAINED = INACTIVE_FORAGER.forageAttempt?.dueTick === FORAGE_DUE_TICK;
        FORAGE_WORLD.simulationTick = FORAGE_DUE_TICK;
        const INACTIVE_CONSUMED = FORAGE_WORLD.advanceInactiveForage(INACTIVE_FORAGER, 1 / 20);
        FORAGE_WORLD.switchFarmPlot('plot-1');
        const ACTIVE_FORAGER = FORAGE_WORLD.spawn(0, 1, 0, 0),
            ACTIVE_FOOD = (FORAGE_WORLD.spawnFood(3, 0, 1, { allowBossEvent: false }), FORAGE_WORLD.food.at(-1));
        ACTIVE_FORAGER.growth = BUDMORI.CONFIG.farm.breeding.matureMeals;
        ACTIVE_FORAGER.growthElapsed = ACTIVE_FORAGER.growthDuration;
        ACTIVE_FOOD.x = 3;
        ACTIVE_FOOD.y = 0;
        ACTIVE_FOOD.phase = 'grounded';
        ACTIVE_FOOD.z = ACTIVE_FOOD.vx = ACTIVE_FOOD.vy = ACTIVE_FOOD.vz = 0;
        FORAGE_WORLD._rebuildFoodSpatialIndex();
        FORAGE_WORLD.startForageAttempt(ACTIVE_FORAGER, 1 / 20, ACTIVE_FOOD);
        const ACTIVE_DUE_TICK = ACTIVE_FORAGER.forageAttempt.dueTick;
        ACTIVE_FORAGER.x = ACTIVE_FOOD.x;
        FORAGE_WORLD.simulationTick = ACTIVE_DUE_TICK - 1;
        FORAGE_WORLD.farmUnit(ACTIVE_FORAGER, 1 / 20);
        const ACTIVE_BLOCKED_BEFORE_DUE = ACTIVE_FORAGER.meals === 0 && FORAGE_WORLD.food.includes(ACTIVE_FOOD);
        FORAGE_WORLD.simulationTick = ACTIVE_DUE_TICK;
        ACTIVE_FORAGER.x = ACTIVE_FOOD.x + 1;
        FORAGE_WORLD.farmUnit(ACTIVE_FORAGER, 1 / 20);
        const ACTIVE_BLOCKED_WITHOUT_CONTACT = ACTIVE_FORAGER.meals === 0 && FORAGE_WORLD.food.includes(ACTIVE_FOOD);
        ACTIVE_FORAGER.x = ACTIVE_FOOD.x;
        FORAGE_WORLD.farmUnit(ACTIVE_FORAGER, 1 / 20);
        const ACTIVE_CONSUMED_AFTER_CONTACT = ACTIVE_FORAGER.meals === 1 && !FORAGE_WORLD.food.includes(ACTIVE_FOOD);

        const MANY_FARM_WORLD = new GARDEN(9274);
        MANY_FARM_WORLD.resetUnits();
        MANY_FARM_WORLD.playerProgression.level = 2049;
        MANY_FARM_WORLD.playerProgression.availablePoints = 2048;
        for (let index = 0; index < 1024; index++) {
            if (!MANY_FARM_WORLD.unlockFarmPlot().ok) {
                throw Error(`failed to unlock plot ${index + 2} in the no-cap snapshot fixture`);
            }
        }
        const MORE_THAN_1024_PLOTS_VALID =
            MANY_FARM_WORLD.farmPlots.size === 1025 && VALIDATE_SNAPSHOT(MAKE_SNAPSHOT(MANY_FARM_WORLD));
        return {
            exchangeReserved: RESERVED,
            exchangeCount: PLAN?.exchangeUnitIds.length || 0,
            exchangeCommitted:
                SWAP_WORLD.unitCollection.unitById(EXCHANGED_ID)?.plotId === 'plot-1' &&
                SWAP_WORLD.roster.placedPopulation('plot-2') === 50 &&
                SWAP_WORLD.ownedPopulation === 101 &&
                SWAP_WORLD._breedPlans.size === 0,
            currentPlotUnits: SWAP_WORLD.units.length,
            savedFullRoster: SNAPSHOT.units.length === 101 && SNAPSHOT.units.some((unit) => unit.plotId === 'plot-1'),
            snapshotValid: SNAPSHOT_VALID,
            restoredPlots: [...RESTORED.farmPlots.keys()],
            restoredRoster: RESTORED.ownedPopulation,
            globalRaidCandidates:
                RAID.length === 100 && RAID.some(([id]) => RESTORED.roster.residentById(id)?.plotId === 'plot-1'),
            evenAllowed: EVEN_ALLOWED,
            activeReservation: ACTIVE_RESERVED,
            reservedAllowed: RESERVED_ALLOWED,
            threeToTwoAllowed: THIRTY_TWO_ALLOWED,
            fiftyOneFortyNineAllowed: FIFTY_ONE_ALLOWED,
            zeroTargetAllowed: ZERO_ALLOWED,
            reservationInvalidatedByChangeAndRevert: RESERVATION_INVALIDATED,
            inactiveForageAttemptRetained: INACTIVE_ATTEMPT_RETAINED,
            inactiveForageConsumedAfterDue: INACTIVE_CONSUMED && INACTIVE_FORAGER.meals === 1,
            activeForageBlockedBeforeDue: ACTIVE_BLOCKED_BEFORE_DUE,
            activeForageBlockedWithoutContact: ACTIVE_BLOCKED_WITHOUT_CONTACT,
            activeForageConsumedAfterContact: ACTIVE_CONSUMED_AFTER_CONTACT,
            moreThan1024PlotsValid: MORE_THAN_1024_PLOTS_VALID,
        };
    });
    assert.deepEqual(MULTIFARM_POLICY, {
        exchangeReserved: true,
        exchangeCount: 1,
        exchangeCommitted: true,
        currentPlotUnits: 50,
        savedFullRoster: true,
        snapshotValid: true,
        restoredPlots: ['plot-1', 'plot-2'],
        restoredRoster: 101,
        globalRaidCandidates: true,
        evenAllowed: [true, true],
        activeReservation: true,
        reservedAllowed: [false, true],
        threeToTwoAllowed: [false, true],
        fiftyOneFortyNineAllowed: [true, false],
        zeroTargetAllowed: false,
        reservationInvalidatedByChangeAndRevert: true,
        inactiveForageAttemptRetained: true,
        inactiveForageConsumedAfterDue: true,
        activeForageBlockedBeforeDue: true,
        activeForageBlockedWithoutContact: true,
        activeForageConsumedAfterContact: true,
        moreThan1024PlotsValid: true,
    });
    const FARM_PERFORMANCE = await P.evaluate(async () => {
        const RUNTIME = BUDMORI.runtime,
            ORIGINAL = { world: RUNTIME.world, paused: RUNTIME.paused },
            HEAP_BEFORE = performance.memory?.usedJSHeapSize ?? null,
            RESULTS = [];
        try {
            RUNTIME.paused = true;
            for (const ACTIVE_COUNT of [50, 100, 200]) {
                const WORLD = new BUDMORI.sim.constructor(8800 + ACTIVE_COUNT),
                    PLOT_IDS = ['plot-1'];
                const UNIT_CLASS = WORLD.units[0].constructor;
                WORLD.resetUnits();
                WORLD.playerProgression.level = 99;
                WORLD.playerProgression.availablePoints = 1000;
                for (let level = 0; level < 4; level++) {
                    if (!WORLD.expandFarmPlot('plot-1').ok) {
                        throw Error('performance fixture could not expand its active plot');
                    }
                }
                for (let plotIndex = 0; plotIndex < 4; plotIndex++) {
                    const UNLOCKED = WORLD.unlockFarmPlot();
                    if (!UNLOCKED.ok) {
                        throw Error('performance fixture could not unlock an inactive plot');
                    }
                    PLOT_IDS.push(UNLOCKED.plotId);
                    for (let level = 0; level < 4; level++) {
                        if (!WORLD.expandFarmPlot(UNLOCKED.plotId).ok) {
                            throw Error('performance fixture could not expand an inactive plot');
                        }
                    }
                }
                for (const [PLOT_INDEX, PLOT_ID] of PLOT_IDS.entries()) {
                    if (WORLD.activePlotId !== PLOT_ID && !WORLD.switchFarmPlot(PLOT_ID)) {
                        throw Error('performance fixture could not switch plots');
                    }
                    const COUNT = PLOT_INDEX === 0 ? ACTIVE_COUNT : 50;
                    for (let index = 0; index < COUNT; index++) {
                        const UNIT = new UNIT_CLASS(
                            WORLD.nextId++,
                            0,
                            1,
                            ((index % 10) - 4.5) * 0.45,
                            (Math.floor(index / 10) - Math.ceil(COUNT / 10) / 2) * 0.45,
                        );
                        UNIT.plotId = PLOT_ID;
                        if (!WORLD.addUnit(UNIT)) {
                            throw Error('performance fixture could not attach a resident to its assigned plot');
                        }
                        UNIT.growth = BUDMORI.CONFIG.farm.breeding.matureMeals;
                        UNIT.growthDuration = WORLD.breedGrowthDuration();
                        UNIT.growthElapsed = UNIT.growthDuration;
                        UNIT.cooldown = UNIT.cooldownDuration = 10000;
                        UNIT.meals = PLOT_INDEX > 0 && index < 2 ? 1 : 0;
                    }
                    const PLOT = WORLD.farmPlots.get(PLOT_ID);
                    for (let index = 0; index < 12; index++) {
                        const X = ((index % 4) - 1.5) * 0.8,
                            Y = (Math.floor(index / 4) - 1) * 0.8;
                        PLOT.food.push({
                            x: X,
                            y: Y,
                            z: 0,
                            vx: 0,
                            vy: 0,
                            vz: 0,
                            seed: (index * 0.61803398875) % 1,
                            phase: 'grounded',
                            tx: X,
                            ty: Y,
                        });
                    }
                }
                if (WORLD.activePlotId !== 'plot-1' && !WORLD.switchFarmPlot('plot-1')) {
                    throw Error('performance fixture could not return to the active plot');
                }
                WORLD._foodSpatialDirty = true;
                const SUBSCRIPTIONS_BEFORE = WORLD.unitCollection.subscriptions.size,
                    PHYSICS_BEFORE = WORLD.metrics.physicsSteps || 0,
                    SAMPLES = [],
                    TICKS = 60;
                const SORTS = ['species', 'tier-high', 'tier-low'];
                for (let index = 0; index < 20; index++) {
                    const PLOT_ID = PLOT_IDS[(index % (PLOT_IDS.length - 1)) + 1];
                    if (!WORLD.switchFarmPlot(PLOT_ID)) {
                        throw Error(`performance fixture could not switch to ${PLOT_ID} from ${WORLD.activePlotId}`);
                    }
                    if (!WORLD.sortActiveFarm(SORTS[index % SORTS.length])) {
                        throw Error(
                            `performance fixture could not sort ${PLOT_ID}: ${JSON.stringify({ scene: WORLD.scene, running: WORLD.running, phase: WORLD.farmBossEvent?.phase, plans: WORLD._breedPlans.size, residents: WORLD.roster.placedPopulation(PLOT_ID) })}`,
                        );
                    }
                }
                WORLD.switchFarmPlot('plot-1');
                for (let tick = 0; tick < TICKS; tick++) {
                    const START = performance.now();
                    WORLD.step(1 / 20);
                    SAMPLES.push(performance.now() - START);
                }
                RUNTIME.world = WORLD;
                RUNTIME.capturePresentation('reset');
                await new Promise(requestAnimationFrame);
                await new Promise(requestAnimationFrame);
                const SORTED = [...SAMPLES].sort((a, b) => a - b),
                    P95_INDEX = Math.floor((SORTED.length - 1) * 0.95),
                    PHYSICS_AFTER = WORLD.metrics.physicsSteps || 0,
                    SUBSCRIPTIONS_AFTER = WORLD.unitCollection.subscriptions.size;
                RESULTS.push({
                    activeResidents: WORLD.units.length,
                    inactivePlots: PLOT_IDS.length - 1,
                    inactiveResidents: WORLD.ownedPopulation - WORLD.units.length,
                    floorFoods: [...WORLD.farmPlots.values()].reduce((sum, plot) => sum + plot.food.length, 0),
                    ticks: TICKS,
                    physicsSteps: PHYSICS_AFTER - PHYSICS_BEFORE,
                    stepCpuP95Ms: SORTED[P95_INDEX],
                    activeRenderers: BUDMORI.renderer.vectorPlayers.size,
                    subscriptionsBefore: SUBSCRIPTIONS_BEFORE,
                    subscriptionsAfter: SUBSCRIPTIONS_AFTER,
                    forageAttempts: WORLD.unitCollection.items.filter((unit) => unit.forageAttempt).length,
                    forageFoodClaims: WORLD._forageFoodClaims.size,
                    breedPlans: WORLD._breedPlans.size,
                    breedReservations: WORLD._activeBreedReservations.size,
                    mergeTasks: WORLD.mergeTasks.length,
                });
            }
            return {
                browser: navigator.userAgent,
                hardwareConcurrency: navigator.hardwareConcurrency || null,
                memoryBeforeBytes: HEAP_BEFORE,
                memoryAfterBytes: performance.memory?.usedJSHeapSize ?? null,
                scenarios: RESULTS,
            };
        } finally {
            RUNTIME.world = ORIGINAL.world;
            RUNTIME.paused = ORIGINAL.paused;
            RUNTIME.capturePresentation('reset');
        }
    });
    assert.deepEqual(
        FARM_PERFORMANCE.scenarios.map((result) => [
            result.activeResidents,
            result.inactivePlots,
            result.inactiveResidents,
            result.ticks,
            result.physicsSteps,
            result.activeRenderers,
            result.subscriptionsBefore,
            result.subscriptionsAfter,
        ]),
        [
            [50, 4, 200, 60, 60, 50, 250, 250],
            [100, 4, 200, 60, 60, 100, 300, 300],
            [200, 4, 200, 60, 60, 200, 400, 400],
        ],
        'inactive plots do not multiply active physics or renderer counts, and sorting/switching does not leak unit subscriptions',
    );
    assert(FARM_PERFORMANCE.scenarios.every((result) => Number.isFinite(result.stepCpuP95Ms)));
    REPORT.farmPerformance = FARM_PERFORMANCE;
    CHECK(
        'Exact integer target ratios, same-plot birth reservations, cross-plot exchange commits, complete farm save/restore snapshots, and global raid candidates',
    );
    await P.evaluate(() => BUDMORI.sim.cancelMergeTask());
    await P.evaluate(() => {
        const W = BUDMORI.sim;
        W.nextId = Math.max(W.nextId, 101);
        const STARTING_POPULATION = W.ownedPopulation;
        while (W.ownedPopulation < STARTING_POPULATION + 12) {
            const I = W.ownedPopulation - STARTING_POPULATION,
                U = W.spawn(I % 3, 1, -4 + (I % 4) * 2, -3 + Math.floor(I / 4) * 2);
            if (!U) {
                throw Error('could not seed high-ID farm residents');
            }
            U.growth = BUDMORI.CONFIG.farm.breeding.matureMeals;
            U.growthDuration = W.breedGrowthDuration();
            U.growthElapsed = U.growthDuration;
            U.cooldown = U.cooldownDuration = 999;
        }
        if (!W.roster.residents().some((unit) => unit.id >= 101)) {
            throw Error('high resident IDs were not allocated through the roster owner');
        }
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
    assert.match(await P.locator('#bossStageDrop').textContent(), /1.*15%/);
    await swipeEncounter(P, 'up');
    await P.waitForFunction(() => document.querySelector('#bossStageCounter')?.textContent === '2 / 61');
    assert.equal(await P.locator('#bossStageHp').textContent(), 'HP 300');
    assert.equal(await P.locator('#bossStageXp').textContent(), '+30 XP');
    assert(await P.locator('#bossStageDrop').isVisible());
    assert.match(await P.locator('#bossStageDrop').textContent(), /1.*15%/);
    assert.equal(
        await P.locator('#bossEncounterChallenge').isDisabled(),
        true,
        'the next stage is previewable but locked',
    );
    await swipeEncounter(P, 'up');
    assert.equal(
        await P.locator('#bossStageCounter').textContent(),
        '2 / 61',
        'swiping cannot preview stages beyond the next locked stage',
    );
    const REWARD_INVARIANT = await P.evaluate(async () => {
        const {
                settleBossKill: SETTLE,
                bossAcquisitionChance: ACQUISITION_CHANCE,
                bossStageStats: STAGE_STATS,
                bossRewardBoxPayouts: BOX_PAYOUTS,
                advanceBossRewardCalculations: ADVANCE,
                openAllBossRewardBoxes: OPEN_ALL,
                grantPendingBossAcquisitions: GRANT_PENDING,
            } = await import('/src/boss-rewards.js'),
            { captureFarmProgress: CAPTURE_PROGRESS, restoreFarmProgress: RESTORE_PROGRESS } =
                await import('/src/farm-progress.js');
        const COMPLETE = (world, receipt, maxUnits = 10) => {
            let ticks = 0;
            while (receipt.status === 'calculating' && ticks < 10000) {
                ADVANCE(world, { maxUnitsPerReward: maxUnits });
                ticks++;
            }
            if (receipt.status === 'calculating') {
                throw Error('boss reward calculation failed to finish');
            }
            return ticks;
        };
        const WORLD = new BUDMORI.sim.constructor(997),
            FIRST = SETTLE(WORLD, {
                encounterId: 900,
                source: 'raid',
                receiptKey: 'boss-box-xp',
                rollBudget: 1,
                xpAmount: 41,
                species: 0,
            }),
            DUPLICATE = SETTLE(WORLD, {
                encounterId: 900,
                source: 'raid',
                receiptKey: 'boss-box-xp',
                rollBudget: 1,
                xpAmount: 41,
                species: 0,
            });
        COMPLETE(WORLD, FIRST.receipt, 1);
        const BOX_WORLD = new BUDMORI.sim.constructor(123),
            BOX_REWARD = SETTLE(BOX_WORLD, { encounterId: 1, source: 'raid', rollBudget: 38, species: 2 }).receipt,
            BUDGET_ONE = new BUDMORI.sim.constructor(123),
            ONE_REWARD = SETTLE(BUDGET_ONE, { encounterId: 1, source: 'raid', rollBudget: 38, species: 2 }).receipt,
            ONE_TICKS = COMPLETE(BUDGET_ONE, ONE_REWARD, 1),
            TEN_TICKS = COMPLETE(BOX_WORLD, BOX_REWARD, 10);
        const HIGH_WORLD = new BUDMORI.sim.constructor(998);
        while (HIGH_WORLD.units.length < HIGH_WORLD.capacity) {
            HIGH_WORLD.spawn(0, 1, 0, 0);
        }
        HIGH_WORLD.nextRaidRunSequence = 903;
        HIGH_WORLD.raidSettlementWatermark = 903;
        const HIGH = SETTLE(HIGH_WORLD, {
            encounterId: 903,
            source: 'raid',
            firstClear: true,
            acquisitionMultiplier: 2,
            rollBudget: STAGE_STATS(61).rollBudget,
            species: 4,
        }).receipt;
        HIGH.chance = 0.3;
        ADVANCE(HIGH_WORLD, { maxUnitsPerReward: 1 });
        const CHECKPOINT = CAPTURE_PROGRESS(HIGH_WORLD),
            RESTORED_WORLD = RESTORE_PROGRESS(CHECKPOINT),
            RESTORED = RESTORED_WORLD.bossRewardReceipts.find((reward) => reward.encounterId === 903),
            RESUMED = RESTORED.status === 'calculating' && !!RESTORED.calculation.jobState;
        COMPLETE(RESTORED_WORLD, RESTORED, 10);
        const BEFORE_BOXES = JSON.stringify(RESTORED.boxes),
            BEFORE_ACQUIRED = RESTORED.acquiredCount;
        OPEN_ALL(RESTORED_WORLD, RESTORED.receiptKey);
        const OPENED_WITHOUT_REROLL =
            RESTORED.status === 'ready' &&
            RESTORED.revealedCount === RESTORED.boxCount &&
            RESTORED.acquiredCount === BEFORE_ACQUIRED &&
            JSON.stringify(RESTORED.boxes) === BEFORE_BOXES;
        const QUEUE_WORLD = new BUDMORI.sim.constructor(314);
        while (QUEUE_WORLD.units.length < QUEUE_WORLD.capacity) {
            QUEUE_WORLD.spawn(0, 1, 0, 0);
        }
        const QUEUED = SETTLE(QUEUE_WORLD, { encounterId: 1, source: 'raid', rollBudget: 1, species: 3 }).receipt;
        QUEUED.chance = 1;
        COMPLETE(QUEUE_WORLD, QUEUED, 10);
        const QUEUED_BEFORE_SPACE = QUEUED.queuedCount;
        QUEUE_WORLD.removeUnit(QUEUE_WORLD.units[0]);
        const RELEASED = GRANT_PENDING(QUEUE_WORLD),
            PAYOUT_TOTALS = [1, 38, 100, 101, 250, 2216].map((total) => {
                const PAYOUTS = BOX_PAYOUTS(total);
                return {
                    total,
                    boxCount: PAYOUTS.length,
                    sum: PAYOUTS.reduce((sum, value) => sum + value, 0),
                    minimum: Math.min(...PAYOUTS),
                    maximum: Math.max(...PAYOUTS),
                };
            });
        return {
            farmEventChance: ACQUISITION_CHANCE({ farmEvent: true }),
            raidFirstClearChance: ACQUISITION_CHANCE({ firstClear: true }),
            firstXp: FIRST.xpAwarded,
            duplicateXp: DUPLICATE.xpAwarded,
            duplicateStatus: DUPLICATE.receipt.xpStatus,
            rollCount: BOX_REWARD.rollCount,
            rollBudget: BOX_REWARD.rollBudget,
            tier: BOX_REWARD.tier,
            duplicateReceipt: FIRST.receipt === DUPLICATE.receipt,
            quantumEquivalent: JSON.stringify(BOX_REWARD.boxes) === JSON.stringify(ONE_REWARD.boxes),
            streamEquivalent:
                JSON.stringify(BOX_WORLD.bossRewardStreams.normal) ===
                JSON.stringify(BUDGET_ONE.bossRewardStreams.normal),
            quantumTicks: { one: ONE_TICKS, ten: TEN_TICKS },
            payouts: PAYOUT_TOTALS,
            stageFive: STAGE_STATS(5),
            high: {
                rollBudget: HIGH.rollBudget,
                boxCount: HIGH.boxCount,
                successCount: RESTORED.successCount,
                status: RESTORED.status,
                calculationResumed: RESUMED,
                checkpointProcessedTrials: CHECKPOINT.ledger.boss.pendingRewards.find(
                    (reward) => reward.encounterId === 903,
                ).calculation.jobState.processedTrials,
                openedWithoutReroll: OPENED_WITHOUT_REROLL,
            },
            queue: {
                queuedBeforeSpace: QUEUED_BEFORE_SPACE,
                releasedGrants: RELEASED.length,
                placedAfterSpace: QUEUED.placedCount,
                queuedAfterSpace: QUEUED.queuedCount,
                status: QUEUED.status,
            },
            earned: WORLD.playerProgression.processedBossKillReceipts.filter((key) => key === 'boss-box-xp').length,
        };
    });
    const {
        payouts: PAYOUT_TOTALS,
        high: HIGH_STAGE,
        queue: QUEUE_STAGE,
        quantumTicks: QUANTUM_TICKS,
        ...KNOWN_REWARDS
    } = REWARD_INVARIANT;
    assert.deepEqual(KNOWN_REWARDS, {
        farmEventChance: 0.1,
        raidFirstClearChance: 0.15,
        firstXp: 41,
        duplicateXp: 41,
        duplicateStatus: 'awarded',
        rollCount: 38,
        rollBudget: 38,
        tier: 1,
        duplicateReceipt: true,
        quantumEquivalent: true,
        streamEquivalent: true,
        earned: 1,
        stageFive: {
            stage: 5,
            hp: 1012.5,
            attackPower: 8.2944,
            xp: 101,
            rollBudget: 5,
            rolls: 5,
            boxCount: 5,
            boxPayouts: [1, 1, 1, 1, 1],
            bonusRollChance: 0,
        },
    });
    assert.deepEqual(PAYOUT_TOTALS, [
        { total: 1, boxCount: 1, sum: 1, minimum: 1, maximum: 1 },
        { total: 38, boxCount: 38, sum: 38, minimum: 1, maximum: 1 },
        { total: 100, boxCount: 100, sum: 100, minimum: 1, maximum: 1 },
        { total: 101, boxCount: 100, sum: 101, minimum: 1, maximum: 2 },
        { total: 250, boxCount: 100, sum: 250, minimum: 2, maximum: 3 },
        { total: 2216, boxCount: 100, sum: 2216, minimum: 22, maximum: 23 },
    ]);
    assert(QUANTUM_TICKS.one >= QUANTUM_TICKS.ten, 'smaller work budgets take additional logical ticks');
    assert.equal(HIGH_STAGE.rollBudget, Math.floor(Math.pow(1.5, 60)));
    assert.equal(HIGH_STAGE.boxCount, 100);
    assert(Number.isSafeInteger(HIGH_STAGE.successCount) && HIGH_STAGE.successCount <= 100);
    assert(HIGH_STAGE.calculationResumed, 'saved PRD work resumes after restore');
    assert(HIGH_STAGE.checkpointProcessedTrials > 0, 'the saved calculation contains resumable work');
    assert.equal(HIGH_STAGE.openedWithoutReroll, true, 'open-all only reveals the committed result');
    assert.equal(HIGH_STAGE.status, 'ready', 'opening boxes only changes presentation state');
    assert.equal(QUEUE_STAGE.queuedBeforeSpace, 1, 'a full Farm holds the acquired unit in the queue');
    assert.equal(QUEUE_STAGE.releasedGrants, 1);
    assert.equal(QUEUE_STAGE.placedAfterSpace, 1);
    assert.equal(QUEUE_STAGE.queuedAfterSpace, 0);
    assert.equal(QUEUE_STAGE.status, 'ready');
    CHECK(
        'Boss reward boxes split integer payouts exactly, preserve deterministic PRD work across budgets and save restore, and queue full-roster grants',
    );
    const SELECTED_STAGE2 = await P.evaluate(
        () => BUDMORI.sim.farmBossProgress.selections.find((entry) => entry.stage === 2)?.species,
    );
    await swipeEncounter(P, 'down');
    await P.waitForFunction(() => document.querySelector('#bossStageCounter')?.textContent === '1 / 61');
    await P.locator('#bossEncounterBack').click();
    assert.equal(await P.evaluate(() => BUDMORI.sim.farmBossProgress.currentStage), 1);
    await P.locator('#raid').click();
    assert.equal(
        await P.locator('#bossStageCounter').textContent(),
        '1 / 61',
        'the selected page is restored when reopening',
    );
    await swipeEncounter(P, 'up');
    await P.waitForFunction(() => document.querySelector('#bossStageCounter')?.textContent === '2 / 61');
    await swipeEncounter(P, 'up');
    assert.equal(
        await P.locator('#bossStageCounter').textContent(),
        '2 / 61',
        'the next locked stage remains the preview limit',
    );
    assert.equal(
        await P.evaluate(() => BUDMORI.sim.farmBossProgress.selections.find((entry) => entry.stage === 2)?.species),
        SELECTED_STAGE2,
        'visited boss species remains stable',
    );
    await swipeEncounter(P, 'down');
    await P.waitForFunction(() => document.querySelector('#bossStageCounter')?.textContent === '1 / 61');
    assert(
        await P.evaluate(() =>
            BUDMORI.sim.units.every((unit) => Number.isSafeInteger(unit.generation) && unit.generation > 0),
        ),
        'merge results keep positive generations before raid save',
    );
    await P.locator('#bossEncounterChallenge').click();
    await P.waitForFunction(
        () => BUDMORI.sim.scene === 'raid' || !document.querySelector('#error')?.hidden,
        {},
        { timeout: 10000 },
    );
    const RAID_START_STATE = await P.evaluate(() => ({
        scene: BUDMORI.sim.scene,
        storageError: BUDMORI.storage.error,
        storageNotice: BUDMORI.storage.notice,
        saveNotice: document.querySelector('#saveNotice')?.textContent,
    }));
    assert.equal(RAID_START_STATE.scene, 'raid', JSON.stringify(RAID_START_STATE));
    await P.waitForFunction(() => BUDMORI.sim.raidRosters.length === 1);
    assert.equal(
        await P.evaluate(() => BUDMORI.runtime.presentation(performance.now()).boss.stage),
        1,
        'the pinned FarmSession render capture carries the selected stage',
    );
    assert.equal(await P.locator('#deploymentCards').isVisible(), true, 'Raid deployment cards are available');
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
        assert(
            AFTER.commands.every((type) => type === 'scatter-food'),
            'world presses and drags queue no deployment or movement commands',
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
    const ALL_SPECIES_SWEEP = await p.evaluate(() => {
        const WORLD = new BUDMORI.sim.constructor(775),
            RENDERER = BUDMORI.renderer;
        WORLD.setScene('raid');
        WORLD.boss.hp = WORLD.boss.maxHp = 1e6;
        WORLD.boss.x = 0;
        WORLD.boss.y = 0;
        const TARGET = WORLD.units[0];
        WORLD.beginBossPattern('attack.sweep-360', TARGET);
        const ACTION = WORLD.boss.patternRuntime.active;
        ACTION.aim = 0;
        WORLD.activateBossPattern(ACTION);
        // The renderer receives the interpolated presentation view, where the
        // runtime action is projected onto these fields. Keep this direct
        // model fixture equivalent to that render input.
        WORLD.boss.patternId = ACTION.id;
        WORLD.boss.patternPhase = ACTION.phase;
        WORLD.boss.patternPhaseElapsed = 0.5;
        WORLD.boss.patternAim = ACTION.aim;
        const RENDERED = [],
            TRAIL_COUNTS = [],
            ORIGINAL_LINE = RENDERER.line.bind(RENDERER);
        let lineCount = 0;
        RENDERER.line = (...args) => {
            lineCount++;
            return ORIGINAL_LINE(...args);
        };
        for (let species = 0; species < BUDMORI.CONFIG.unit.speciesCount; species++) {
            WORLD.boss.species = species;
            const BEFORE = lineCount;
            RENDERER.render(WORLD, null, performance.now());
            RENDERED.push(species);
            TRAIL_COUNTS.push(lineCount - BEFORE);
        }
        RENDERER.line = ORIGINAL_LINE;
        return {
            rendered: RENDERED,
            weaponTrailLines: TRAIL_COUNTS,
            chestnutAssetId: RENDERER.bossSpeciesAssets.get(3).compiled.metadata.id,
            chestnutSocket: RENDERER.bossSpeciesAssets.get(3).compiled.metadata.sockets['fist-right']?.part,
            nonChestnutSockets: Array.from(RENDERER.bossSpeciesAssets.entries())
                .filter(([species]) => species !== 3)
                .map(([, record]) => record.compiled.metadata.sockets['fist-right'] || null),
        };
    });
    assert.deepEqual(
        ALL_SPECIES_SWEEP.rendered,
        Array.from({ length: 9 }, (_, index) => index),
    );
    assert.equal(ALL_SPECIES_SWEEP.chestnutAssetId, 'budmori-chestnut-boss');
    assert.equal(ALL_SPECIES_SWEEP.chestnutSocket, 'arm-right');
    assert(ALL_SPECIES_SWEEP.nonChestnutSockets.every((socket) => socket === null));
    assert(
        ALL_SPECIES_SWEEP.weaponTrailLines.every((count) => count === 2),
        'all species render only the shared two-stroke sweep marker, without a long shaft or tip',
    );
    REPORT.allSpeciesSweep = ALL_SPECIES_SWEEP;
    CHECK('All nine boss species render the shared active sweep marker without querying an asset socket');
    const SWEEP_MARKER_GEOMETRY = await p.evaluate(async () => {
        const [PRESENTATION_MODULE, PATTERN_CONFIG_MODULE] = await Promise.all([
                import('/src/features/boss-patterns/sweep-360/presentation.js'),
                import('/src/boss-patterns.js'),
            ]),
            PRESENTATION_TYPE = PRESENTATION_MODULE.CircleSweepPresentation,
            SWEEP_CONFIG = PATTERN_CONFIG_MODULE.BOSS_PATTERN_CONFIG['attack.sweep-360'],
            PRESENTATION = new PRESENTATION_TYPE(),
            BOSS = {
                x: 1,
                y: -2,
                z: 0,
                angle: 0,
                patternAim: 0,
                patternPhase: 'active',
                patternPhaseElapsed: SWEEP_CONFIG.active / 2,
            },
            RECORD = BUDMORI.renderer.bossSpeciesAssets.get(3),
            LINES = [],
            RENDERER = {
                ctx: { flush() {} },
                project: (x, y, z) => ({ x, y, z }),
                line: (...args) => LINES.push(args),
            },
            PLAYER = {
                getSocket() {
                    throw Error('The shared circle sweep must not look up an optional asset socket.');
                },
            },
            POSE = { elapsed: BOSS.patternPhaseElapsed };
        PRESENTATION.drawWeapon(RENDERER, BOSS, PLAYER, null, POSE, RECORD);
        const MARKER = LINES[0],
            MIDPOINT = {
                x: (MARKER[0].x + MARKER[1].x) / 2,
                y: (MARKER[0].y + MARKER[1].y) / 2,
            };
        return {
            lineCount: LINES.length,
            lineLength: Math.hypot(MARKER[1].x - MARKER[0].x, MARKER[1].y - MARKER[0].y),
            midpointRadius: Math.hypot(MIDPOINT.x - BOSS.x, MIDPOINT.y - BOSS.y),
            endpointRadii: MARKER.slice(0, 2).map((point) => Math.hypot(point.x - BOSS.x, point.y - BOSS.y)),
            reach: SWEEP_CONFIG.reach,
            width: SWEEP_CONFIG.width,
        };
    });
    assert.equal(SWEEP_MARKER_GEOMETRY.lineCount, 2);
    assert(
        SWEEP_MARKER_GEOMETRY.lineLength < SWEEP_MARKER_GEOMETRY.width * 1.5,
        'the marker is a short moving tangent, not a center shaft',
    );
    assert(Math.abs(SWEEP_MARKER_GEOMETRY.midpointRadius - SWEEP_MARKER_GEOMETRY.reach) < 1e-6);
    assert(
        SWEEP_MARKER_GEOMETRY.endpointRadii.every(
            (radius) =>
                radius >= SWEEP_MARKER_GEOMETRY.reach - SWEEP_MARKER_GEOMETRY.width &&
                radius <= SWEEP_MARKER_GEOMETRY.reach + SWEEP_MARKER_GEOMETRY.width,
        ),
        'the sweep marker stays inside the existing circular annulus at the actual hit radius',
    );
    REPORT.sweepMarkerGeometry = SWEEP_MARKER_GEOMETRY;
    CHECK('The active sweep marker stays on the configured hit radius and inside its circular warning ring');
    const OUTLINE_MASK = await p.evaluate(() => {
        const WORLD = new BUDMORI.sim.constructor(776),
            UNIT = WORLD.units[0],
            RENDERER = BUDMORI.renderer,
            DISPLAY_TIME = performance.now();
        UNIT.id = 2000000001;
        WORLD.units = [UNIT];
        RENDERER.render(WORLD, null, DISPLAY_TIME);
        const PLAYER = RENDERER.vectorPlayers.get(UNIT.id),
            RECORD = RENDERER.vectorAssets.get(UNIT.species),
            DRAW_OPTIONS = [],
            ORIGINAL_DRAW = PLAYER.draw,
            ORIGINAL_SET_VISIBLE = PLAYER.setPartVisible,
            ORIGINAL_SET_EXPRESSION = PLAYER.setExpression,
            PROXY = new Proxy(Object.create(null), {
                get(_target, property) {
                    if (property === 'draw') {
                        return (options) => {
                            DRAW_OPTIONS.push(options);
                            return ORIGINAL_DRAW(options);
                        };
                    }
                    if (property === 'setPartVisible') {
                        return (...args) => {
                            visibilityWrites++;
                            return ORIGINAL_SET_VISIBLE(...args);
                        };
                    }
                    if (property === 'setExpression') {
                        return (...args) => {
                            expressionWrites++;
                            return ORIGINAL_SET_EXPRESSION(...args);
                        };
                    }
                    const VALUE = Reflect.get(PLAYER, property, PLAYER);
                    return typeof VALUE === 'function' ? VALUE.bind(PLAYER) : VALUE;
                },
            });
        let visibilityWrites = 0,
            expressionWrites = 0;
        const PART_STATE = () => Array.from(RECORD.faceParts, (part) => [part, PLAYER.getPartPose(part).visible]),
            PART_TRANSFORMS = () => PLAYER.partPoses().map((pose) => Array.from(pose.transform)),
            BEFORE_STATE = PART_STATE(),
            BEFORE_TRANSFORMS = PART_TRANSFORMS(),
            EXPRESSION = PLAYER.currentExpression;
        RENDERER.vectorPlayers.set(UNIT.id, PROXY);
        RENDERER.vectorPlayerAssets.set(PROXY, RECORD);
        try {
            RENDERER.render(WORLD, null, DISPLAY_TIME);
        } finally {
            RENDERER.vectorPlayers.set(UNIT.id, PLAYER);
            RENDERER.vectorPlayerAssets.set(PLAYER, RECORD);
        }
        const OUTLINE = DRAW_OPTIONS[0],
            BODY = DRAW_OPTIONS[1];
        return {
            sameCachedFaceSet: OUTLINE?.excludeParts === RECORD.faceParts,
            excludesAuthoredFaceParts: [...(OUTLINE?.excludeParts || [])].every((part) =>
                RECORD.compiled.metadata.parts.some(
                    (metadataPart) => metadataPart.id === part && part.startsWith('face-'),
                ),
            ),
            facePartCount: RECORD.faceParts.size,
            bodyHasNoMask: !BODY?.excludeParts,
            visibilityWrites,
            expressionWrites,
            expressionUnchanged: PLAYER.currentExpression === EXPRESSION,
            faceVisibilityUnchanged: JSON.stringify(PART_STATE()) === JSON.stringify(BEFORE_STATE),
            partTransformsUnchanged: JSON.stringify(PART_TRANSFORMS()) === JSON.stringify(BEFORE_TRANSFORMS),
        };
    });
    assert(OUTLINE_MASK.sameCachedFaceSet, 'outline draw uses the per-species cached face Set');
    assert(
        OUTLINE_MASK.excludesAuthoredFaceParts && OUTLINE_MASK.facePartCount > 0,
        'outline excludes only known face-part ids',
    );
    assert(OUTLINE_MASK.bodyHasNoMask, 'normal character draw retains every expression part');
    assert.equal(OUTLINE_MASK.visibilityWrites, 0, 'outline masking never mutates per-part visibility');
    assert.equal(OUTLINE_MASK.expressionWrites, 0, 'outline masking never restores the expression after drawing');
    assert(OUTLINE_MASK.expressionUnchanged && OUTLINE_MASK.faceVisibilityUnchanged);
    assert(OUTLINE_MASK.partTransformsUnchanged, 'outline and body passes retain the same cached pose transforms');
    REPORT.outlineMask = OUTLINE_MASK;
    CHECK('Tier outline uses the cached excludeParts Set without mutating expression, visibility or pose matrices');
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
                W.playerProgression.level = 5;
                W.playerProgression.availablePoints = 4;
                for (let level = 0; level < 4; level++) {
                    if (!W.expandFarmPlot().ok) {
                        throw Error('could not expand the plot for vector seed coverage');
                    }
                }
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
                    [-4, -2, 0, 2, 4, 8].forEach((x, index) => {
                        W.units[index].x = x;
                        W.units[index].y = index % 2 ? 0.8 : -0.8;
                    });
                    W._rebuildUnitSpatialIndex();
                    if (!W.startManualMerge()) {
                        throw Error('configured five-material Mythic fusion was not selectable');
                    }
                    const IDS = [...W.mergeTask.materialIds],
                        RESULT_ID = W.nextId,
                        STARTS = W.mergeTask.startPositions.map((position) => ({ ...position }));
                    R.world = W;
                    BUDMORI.renderer.vectorPlayers.clear();
                    R.capturePresentation('reset');
                    return {
                        resultId: RESULT_ID,
                        resultTier: W.units.find((unit) => unit.id === IDS[0]).tier + 1,
                        materials: IDS.length,
                        starts: STARTS,
                        centerX: W.mergeTask.centerX,
                        centerY: W.mergeTask.centerY,
                        centerZ: W.mergeTask.centerZ,
                        delays: W.effects
                            .filter((effect) => effect.kind === 'merge-material')
                            .map((effect) => effect.delay),
                        phase: W.mergeTask.phase,
                    };
                });
                assert.equal(MERGE_SETUP.resultTier, 6, 'five T5 materials create a T6 Mythic');
                assert.equal(MERGE_SETUP.materials, 5);
                assert.equal(MERGE_SETUP.phase, 'approach');
                assert(
                    MERGE_SETUP.starts.some(
                        (position) =>
                            Math.hypot(position.x - MERGE_SETUP.centerX, position.y - MERGE_SETUP.centerY) > 1,
                    ),
                );
                assert.equal(MERGE_SETUP.delays.length, 5);
                assert(
                    MERGE_SETUP.delays[0] < MERGE_SETUP.delays[1] &&
                        MERGE_SETUP.delays[1] < MERGE_SETUP.delays[2] &&
                        MERGE_SETUP.delays[2] < MERGE_SETUP.delays[3] &&
                        MERGE_SETUP.delays[3] < MERGE_SETUP.delays[4],
                    'five suction trails are staggered in source order',
                );
                const MERGE_POLICY = await p.evaluate(() => {
                    const W = new BUDMORI.sim.constructor(965);
                    for (const UNIT of [...W.units]) {
                        W.unitCollection.remove(UNIT, { markProgress: false });
                    }
                    W.playerProgression.level = 5;
                    W.playerProgression.availablePoints = 4;
                    for (let level = 0; level < 4; level++) {
                        if (!W.expandFarmPlot().ok) {
                            throw Error('could not expand the plot for the merge policy fixture');
                        }
                    }
                    while (W.units.length < 53) {
                        const UNIT = W.spawn(0, 1, 0, 0);
                        if (!UNIT) {
                            throw Error('failed to create the over-capacity merge fixture');
                        }
                        UNIT.growth = 3;
                        UNIT.growthElapsed = UNIT.growthDuration;
                        UNIT.meals = 1;
                        UNIT.cooldown = 0;
                        UNIT.down = 0;
                    }
                    for (const UNIT of W.units) {
                        UNIT.x = 0;
                        UNIT.y = 0;
                        UNIT.z = 0;
                    }
                    Object.defineProperty(W, 'capacity', { configurable: true, value: 50 });
                    const ROSTER_BEFORE_MERGE = W.units.length;
                    const [A, B] = W.units;
                    A.mateId = B.id;
                    B.mateId = A.id;
                    const BREED_OWNER = W.breedingReservationOwner(A, B);
                    if (!W.unitCollection.reserve(BREED_OWNER, [A, B])) {
                        throw Error('failed to reserve the reciprocal breeding pair');
                    }
                    W._rebuildUnitSpatialIndex();
                    const STATUS = W.mergeAvailability(),
                        STARTED = W.startManualMerge(),
                        TASK = W.mergeTasks[0],
                        MERGE_OWNER = W.unitCollection.reservationOwner(A);
                    if (!STARTED || !TASK) {
                        throw Error('manual merge did not start above capacity');
                    }
                    TASK.elapsed = TASK.duration;
                    const COMPLETED = W.resolveMergeTaskAfterMovement();
                    return {
                        roster: ROSTER_BEFORE_MERGE,
                        capacity: W.capacity,
                        available: STATUS.available,
                        availabilityCode: STATUS.code,
                        started: STARTED,
                        completed: COMPLETED,
                        pairLinksCleared: A.mateId === 0 && B.mateId === 0,
                        reservationTakenOver: MERGE_OWNER?.startsWith('merge:') === true,
                        afterMerge: W.units.length,
                        sameSpeciesMinimum: W.units.filter((unit) => unit.species === 0).length >= 2,
                    };
                });
                assert.equal(MERGE_POLICY.roster, 53);
                assert.equal(MERGE_POLICY.capacity, 50);
                assert.equal(MERGE_POLICY.available, true);
                assert.equal(MERGE_POLICY.availabilityCode, 'ready');
                assert.equal(MERGE_POLICY.started, true);
                assert.equal(MERGE_POLICY.completed, true);
                assert.equal(MERGE_POLICY.pairLinksCleared, true);
                assert.equal(MERGE_POLICY.reservationTakenOver, true);
                assert.equal(MERGE_POLICY.afterMerge, 52);
                assert.equal(MERGE_POLICY.sameSpeciesMinimum, true);
                const PRESENTED_SEQUENCE = await p.evaluate(() => {
                    const VIEW = BUDMORI.runtime.presentation(performance.now());
                    const MATERIALS = VIEW.effects
                        .filter((effect) => effect.kind === 'merge-material')
                        .map(({ x, y, z, targetX, targetY, targetZ, delay, span, sequenceIndex, sequenceCount }) => ({
                            x,
                            y,
                            z,
                            targetX,
                            targetY,
                            targetZ,
                            delay,
                            span,
                            sequenceIndex,
                            sequenceCount,
                        }));
                    const RESULT = VIEW.effects.find((effect) => effect.kind === 'merge');
                    return {
                        materials: MATERIALS,
                        result: !!RESULT,
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
                            Number.isFinite(effect.targetZ) &&
                            Number.isFinite(effect.delay) &&
                            Number.isFinite(effect.span) &&
                            effect.span > 0 &&
                            effect.sequenceIndex === index &&
                            effect.sequenceCount === 5,
                    ),
                    'presentation preserves all five aerial suction targets, durations, and sequence indexes',
                );
                assert.equal(
                    PRESENTED_SEQUENCE.result,
                    false,
                    'the output cannot exist before all material paths reach the center',
                );
                await p.evaluate(() => new Promise(requestAnimationFrame));
                await render(p, label + '-grade-merge-cloud');
                const START_STATE = await p.evaluate(
                    (id) => ({
                        phase: BUDMORI.sim.mergeTask?.phase,
                        resultExists: BUDMORI.sim.units.some((unit) => unit.id === id),
                        cloudVisible: BUDMORI.sim.mergeTasks.length > 0,
                    }),
                    MERGE_SETUP.resultId,
                );
                assert.equal(START_STATE.phase, 'approach');
                assert.equal(START_STATE.resultExists, false, 'the result waits until the airborne suction finishes');
                assert(START_STATE.cloudVisible, 'the merge vortex appears above the selected units');
                await p.evaluate(() => {
                    for (let index = 0; index < 12; index++) {
                        BUDMORI.sim.step(1 / 20);
                    }
                    BUDMORI.runtime.capturePresentation('reset');
                });
                await render(p, label + '-grade-merge-suction');
                const MIDDLE = await p.evaluate(
                    (id) => ({
                        resultExists: BUDMORI.sim.units.some((unit) => unit.id === id),
                        phase: BUDMORI.sim.mergeTask?.phase,
                        maxHeight: Math.max(
                            ...BUDMORI.sim.mergeTask.materialIds.map(
                                (materialId) => BUDMORI.sim.units.find((unit) => unit.id === materialId).z,
                            ),
                        ),
                        distanceRemaining: BUDMORI.sim.mergeTask.materialIds.reduce((sum, materialId) => {
                            const UNIT = BUDMORI.sim.units.find((unit) => unit.id === materialId);
                            return (
                                sum +
                                Math.hypot(
                                    UNIT.x - BUDMORI.sim.mergeTask.centerX,
                                    UNIT.y - BUDMORI.sim.mergeTask.centerY,
                                )
                            );
                        }, 0),
                        startDistance: BUDMORI.sim.mergeTask.startPositions.reduce(
                            (sum, position) =>
                                sum +
                                Math.hypot(
                                    position.x - BUDMORI.sim.mergeTask.centerX,
                                    position.y - BUDMORI.sim.mergeTask.centerY,
                                ),
                            0,
                        ),
                        aiSteering: BUDMORI.sim.mergeTask.materialIds.some(
                            (materialId) => BUDMORI.sim.units.find((unit) => unit.id === materialId).moveControlActive,
                        ),
                    }),
                    MERGE_SETUP.resultId,
                );
                assert(
                    !MIDDLE.resultExists && MIDDLE.phase === 'approach' && MIDDLE.maxHeight > 0.5,
                    'reserved materials visibly rise toward the aerial point before replacement',
                );
                assert(
                    MIDDLE.distanceRemaining < MIDDLE.startDistance * 0.7,
                    'the units converge toward the cloud instead of walking into contact',
                );
                assert.equal(MIDDLE.aiSteering, false, 'normal Farm AI does not steer absorbed units');
                await p.evaluate(() => {
                    for (let index = 0; index < 4; index++) {
                        BUDMORI.sim.step(1 / 20);
                    }
                    BUDMORI.runtime.capturePresentation('reset');
                });
                const OCCLUSION = await p.evaluate(async () => {
                    const [{ FarmScenePresentation: FARM_PRESENTATION }, { mergeMaterialPosition: MATERIAL_POSITION }] =
                            await Promise.all([
                                import('/src/features/scenes/farm/presentation.js'),
                                import('/src/features/farm-modes/merge/presentation.js'),
                            ]),
                        DISPLAY = BUDMORI.runtime.presentation(performance.now()),
                        SCENE = new FARM_PRESENTATION(),
                        TASK = DISPLAY.mergeTasks[0],
                        START = TASK.startPositions[0],
                        MATERIAL = {
                            x: START.x,
                            y: START.y,
                            z: START.z,
                            targetX: TASK.centerX,
                            targetY: TASK.centerY,
                            targetZ: TASK.centerZ,
                        },
                        END = MATERIAL_POSITION(MATERIAL, 1);
                    return {
                        hiddenMaterials: SCENE.hiddenUnitIds(DISPLAY).size,
                        materialCount: TASK.materialIds.length,
                        materialEndZ: END.z,
                        frontLipZ: TASK.centerZ + 0.32,
                    };
                });
                assert.equal(
                    OCCLUSION.hiddenMaterials,
                    OCCLUSION.materialCount,
                    'all materials disappear behind the black-hole aperture at the end of suction',
                );
                assert(
                    OCCLUSION.materialEndZ < OCCLUSION.frontLipZ,
                    'the material path ends behind the front rim instead of rising in front of it',
                );
                await render(p, label + '-grade-merge-occlusion');
                await p.evaluate(() => {
                    BUDMORI.sim.step(1 / 20);
                    BUDMORI.runtime.capturePresentation('reset');
                });
                const MERGE_OUTPUT = await p.evaluate((id) => {
                    const UNIT = BUDMORI.sim.units.find((unit) => unit.id === id);
                    const TASK = BUDMORI.sim.mergeTask,
                        RESULT_TOP_POINT = BUDMORI.renderer.project(UNIT.x, UNIT.y, UNIT.z + UNIT.height),
                        HOLE_POINT = BUDMORI.renderer.project(TASK.centerX, TASK.centerY, TASK.centerZ + 0.32);
                    return (
                        UNIT && {
                            phase: BUDMORI.sim.mergeTask?.phase,
                            tier: UNIT.tier,
                            height: UNIT.height,
                            x: UNIT.x,
                            y: UNIT.y,
                            z: UNIT.z,
                            vz: UNIT.vz,
                            dropLanded: UNIT.dropLanded,
                            belowHole: RESULT_TOP_POINT.y > HOLE_POINT.y,
                        }
                    );
                }, MERGE_SETUP.resultId);
                assert.equal(MERGE_OUTPUT.tier, 6);
                assert.equal(MERGE_OUTPUT.phase, 'animation');
                assert(
                    Math.abs(MERGE_OUTPUT.z - Math.max(0, MERGE_SETUP.centerZ - MERGE_OUTPUT.height * 0.85)) < 1e-9 &&
                        MERGE_OUTPUT.z + MERGE_OUTPUT.height < MERGE_SETUP.centerZ + 0.32 &&
                        MERGE_OUTPUT.belowHole,
                    'the whole result body emerges below the shared aperture',
                );
                assert(
                    MERGE_OUTPUT.vz < 0 && !MERGE_OUTPUT.dropLanded,
                    'the result starts moving downward as it emerges',
                );
                await p.evaluate(() => new Promise(requestAnimationFrame));
                await render(p, label + '-grade-merge-pop');
                assert(
                    await p.evaluate((id) => BUDMORI.renderer.vectorPlayers.has(id), MERGE_SETUP.resultId),
                    'the aerial result is visible immediately after the pop',
                );
                await p.evaluate(() => {
                    BUDMORI.sim.step(1 / 20);
                });
                const FALLING = await p.evaluate((id) => {
                    const UNIT = BUDMORI.sim.units.find((unit) => unit.id === id);
                    return { z: UNIT.z, vz: UNIT.vz, dropLanded: UNIT.dropLanded };
                }, MERGE_SETUP.resultId);
                assert(
                    FALLING.z < MERGE_OUTPUT.z && FALLING.z > 0 && FALLING.vz < 0 && !FALLING.dropLanded,
                    'the downward emergence continues into a gravity-driven fall',
                );
                await p.evaluate(() => {
                    for (let index = 0; index < 20; index++) {
                        BUDMORI.sim.step(1 / 20);
                    }
                });
                assert.equal(
                    await p.evaluate(
                        (id) => BUDMORI.sim.units.find((unit) => unit.id === id).dropLanded,
                        MERGE_SETUP.resultId,
                    ),
                    true,
                );
                CHECK(
                    'Merge materials rise behind the aperture without AI/contact steering; the result emerges below it, falls, and lands',
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
                contactStand: W.boss.radius + U.radius,
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
            R.distance !== null && Math.abs(R.distance - (R.species === 5 ? R.contactStand : R.stand)) <= 0.65,
            'species ' + R.species + ' attacks within its configured range',
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
async function representativeAbilitiesFlow() {
    const C = await browser.newContext({ viewport: { width: 1280, height: 800 } }),
        P = await open(C);
    await P.locator('#newGame').click();
    await P.waitForFunction(() => BUDMORI.sim?.scene === 'farm');
    const RESULTS = await P.evaluate(async () => {
        const [
                {
                    SPECIES_ABILITY_DEFINITIONS: DEFINITIONS,
                    abilityFeatureFor: FEATURE_FOR,
                    abilityPresentationFor: PRESENTATION_FOR,
                },
                { createPlayerProgressionState: CREATE_PROGRESS, isValidPlayerProgressionState: VALID_PROGRESS },
                {
                    getAbilityEffects: EFFECTS_FOR,
                    canPurchaseAbilityNode: CAN_PURCHASE,
                    resetAbilityProgression: RESET_ABILITY,
                    resetPlayerProgression: RESET_PLAYER,
                },
                { renderAbilityTreeMarkup: RENDER_TREE },
                { Garden: GARDEN },
                { CornAttachmentModel: CORN },
                { snapshot: SNAPSHOT, validateSnapshot: VALIDATE_SNAPSHOT },
                { captureFarmProgress: CAPTURE_PROGRESS, restoreFarmProgress: RESTORE_PROGRESS },
                { encodeFarmSave: ENCODE_SAVE, decodeFarmSave: DECODE_SAVE, readFarmSave: READ_SAVE },
                { baseUnitStatsFor: BASE_STATS, resolveUnitStats: RESOLVE_STATS },
            ] = await Promise.all([
                import('/src/ability-catalog.js'),
                import('/src/player-progression.js'),
                import('/src/ability-progression.js'),
                import('/src/ability-tree.js'),
                import('/src/farm-model.js'),
                import('/src/features/abilities/corn-attachment/model.js'),
                import('/src/farm-state.js'),
                import('/src/farm-progress.js'),
                import('/src/farm-save-codec.js'),
                import('/src/unit-stats.js'),
            ]),
            BASE_STATE = CREATE_PROGRESS(),
            TREE = RENDER_TREE(BASE_STATE, { location: 'farm', inCombat: false }),
            BASELINE = DEFINITIONS.map((definition) => ({
                id: definition.id,
                value: EFFECTS_FOR(BASE_STATE, definition.id, 1)?.value,
                hasModel: !!FEATURE_FOR(definition.id)?.model,
                hasPresentation: !!PRESENTATION_FOR(definition.id),
                default: definition.availableByDefault && definition.minimumTier <= 1,
            })),
            ROOT_PURCHASE = CAN_PURCHASE(BASE_STATE, DEFINITIONS[0].id, 'root', {
                location: 'farm',
                inCombat: false,
            });
        if (DEFINITIONS.length !== 9 || BASELINE.some((ability) => !ability.default || ability.value === undefined)) {
            throw Error('A representative ability is missing a free Common(T1) effect.');
        }
        if (BASELINE.some((ability) => !ability.hasModel || !ability.hasPresentation)) {
            throw Error('A representative ability is missing its feature-owned model or presentation.');
        }

        const ABILITY_IDS = {
                chestnut: 'chestnut-target-thorns',
                peanut: 'peanut-death-split',
                walnut: 'walnut-raw-guard',
                corn: 'corn-kernel-chain',
            },
            RUN_THORNS = (level) => {
                const WORLD = new GARDEN(700 + level),
                    UNIT = WORLD.spawn(3, 1, -4, 0);
                WORLD.playerProgression.abilities[ABILITY_IDS.chestnut].powerLevel = level;
                UNIT.z = 0;
                UNIT.dropLanded = true;
                UNIT.ownerId = 'solo';
                UNIT.farmId = 30 + level;
                WORLD.boss.active = true;
                WORLD.simulationTick = 100;
                const CYCLE = UNIT.specialAbility,
                    TARGET = { id: 'boss', generation: WORLD.boss.generation, x: 0, y: 0 },
                    STARTED = CYCLE.begin(WORLD, TARGET),
                    SHOT_TICKS = [];
                CYCLE.update(WORLD, 1 / 120);
                if (WORLD.projectiles.length) {
                    SHOT_TICKS.push(WORLD.simulationTick);
                }
                for (let offset = 1; offset <= 6; offset++) {
                    WORLD.simulationTick = 100 + offset;
                    const BEFORE = WORLD.projectiles.length;
                    CYCLE.update(WORLD, 1 / 120);
                    if (WORLD.projectiles.length > BEFORE) {
                        SHOT_TICKS.push(WORLD.simulationTick);
                    }
                }
                WORLD.simulationTick = 159;
                const READY_BEFORE = CYCLE.canBegin(WORLD);
                WORLD.simulationTick = 160;
                return {
                    started: STARTED,
                    fanIndices: WORLD.projectiles.map((projectile) => projectile.fanIndex),
                    shotTicks: SHOT_TICKS,
                    nextThornTick: UNIT.chestnutNextThornTick,
                    readyBefore60: READY_BEFORE,
                    readyAt60: CYCLE.canBegin(WORLD),
                };
            },
            THORNS = [RUN_THORNS(0), RUN_THORNS(1), RUN_THORNS(2)],
            CANCEL_WORLD = new GARDEN(705),
            CANCEL_UNIT = CANCEL_WORLD.spawn(3, 1, -4, 0);
        CANCEL_UNIT.z = 0;
        CANCEL_UNIT.dropLanded = true;
        CANCEL_WORLD.playerProgression.abilities[ABILITY_IDS.chestnut].powerLevel = 2;
        CANCEL_WORLD.boss.active = true;
        CANCEL_WORLD.simulationTick = 200;
        CANCEL_UNIT.specialAbility.begin(CANCEL_WORLD, {
            id: 'boss',
            generation: CANCEL_WORLD.boss.generation,
            x: 0,
            y: 0,
        });
        CANCEL_UNIT.specialAbility.update(CANCEL_WORLD, 1 / 120);
        CANCEL_WORLD.boss.generation = ++CANCEL_WORLD.entityGenerationSerial;
        CANCEL_WORLD.simulationTick = 202;
        CANCEL_UNIT.specialAbility.update(CANCEL_WORLD, 1 / 120);
        const THORN_CANCELLATION = {
            count: CANCEL_WORLD.projectiles.length,
            remaining: CANCEL_UNIT.specialAbility.action?.thornShotsRemaining,
        };

        const DEATH_SPLITS = [];
        for (let level = 0; level <= 2; level++) {
            const WORLD = new GARDEN(800 + level);
            WORLD.resetUnits([]);
            WORLD.playerProgression.level = level + 1;
            WORLD.playerProgression.abilities[ABILITY_IDS.peanut].powerLevel = level;
            WORLD.farmBossEvent = {
                phase: 'fighting',
                elapsed: 0,
                outcome: 'fighting',
                encounterId: 1,
                rewardStatus: 'unresolved',
                rewardChance: 0,
                rewardRoll: 0,
                rewardUnitId: 0,
            };
            WORLD.nextBossEncounterId = 2;
            WORLD.boss.encounterId = 1;
            WORLD.boss.active = true;
            const PARENT = WORLD.spawn(4, 3, 0, 0);
            PARENT.ownerId = 'solo';
            PARENT.farmId = 11;
            PARENT.giantUntil = 100;
            PARENT.hp = 0;
            WORLD.step(1 / 120);
            const CHILDREN = WORLD.units.filter((unit) => unit.battleSummonKind === 'peanut-death-split'),
                EXPECTED_MULTIPLIER = [1, 1.5, 2.25][level];
            WORLD.handleUnitDeath(PARENT);
            const CHILDREN_AFTER_RETRY = WORLD.units.filter(
                (unit) => unit.battleSummonKind === 'peanut-death-split',
            ).length;
            VALIDATE_SNAPSHOT(SNAPSHOT(WORLD));
            const CHILD_STATS = CHILDREN[0] ? RESOLVE_STATS(CHILDREN[0]) : null;
            WORLD.finishFarmBossEvent('defeat');
            DEATH_SPLITS.push({
                count: CHILDREN.length,
                tier: CHILDREN[0]?.tier,
                multiplier: CHILDREN[0]?.permanentStatMultiplier,
                childHp: CHILDREN[0]?.hp,
                childAttack: CHILD_STATS?.attackPower,
                expectedMultiplier: EXPECTED_MULTIPLIER,
                giantInherited: !!CHILDREN[0] && CHILDREN[0].giantUntil > WORLD.time,
                retryCount: CHILDREN_AFTER_RETRY,
                cleaned: WORLD.units.every((unit) => !unit.isBattleOnlySummon),
                effect: WORLD.effects.some((effect) => effect.kind === 'peanut-split'),
            });
        }

        const WALNUT_LEVELS = [];
        for (let level = 0; level <= 2; level++) {
            const WORLD = new GARDEN(900 + level),
                WALNUT_UNIT = WORLD.spawn(5, 1, 0, 0),
                ATTACKER = WORLD.spawn(0, 1, 1, 0);
            WORLD.playerProgression.abilities[ABILITY_IDS.walnut].powerLevel = level;
            ATTACKER.faction = 'enemy';
            WORLD.simulationTick = 0;
            const STARTED = WALNUT_UNIT.ability.tryStartGuard(WORLD),
                ARMOR_DURING = WORLD.combatTargetDefense(WALNUT_UNIT).armor;
            WORLD.simulationTick = 10;
            WORLD.damageCombatTarget(ATTACKER, { id: 1, hit: false }, WALNUT_UNIT, {
                x: WALNUT_UNIT.x,
                y: WALNUT_UNIT.y,
                z: 0,
            });
            const STORED_RAW = WALNUT_UNIT.walnutStoredRawDamage,
                HP_LOSS = BASE_STATS(1, 5).maxHp - WALNUT_UNIT.hp;
            WORLD.simulationTick = 40;
            const ARMOR_AFTER = WORLD.combatTargetDefense(WALNUT_UNIT).armor,
                HAMMER = { id: 2, hit: false };
            WORLD.simulationTick = 100;
            const NEXT_GUARD_WITH_STORED = WALNUT_UNIT.ability.tryStartGuard(WORLD);
            WORLD.simulationTick = 40;
            WALNUT_UNIT.ability.action = HAMMER;
            const BOSS_HP = WORLD.boss.hp;
            WORLD.damageCombatTarget(
                WALNUT_UNIT,
                HAMMER,
                WORLD.boss,
                { x: 0, y: 0, z: 0 },
                {
                    attackContext: WORLD.createAttackContext(WALNUT_UNIT, {
                        attackKind: 'walnut-hammer',
                        criticalRoll: 1,
                    }),
                },
            );
            WALNUT_LEVELS.push({
                started: STARTED,
                armorDuring: ARMOR_DURING,
                armorAfter: ARMOR_AFTER,
                storedRaw: STORED_RAW,
                actualLossDuringGuard: HP_LOSS,
                expectedLossDuringGuard: 4 * (100 / 150),
                hammerDamage: BOSS_HP - WORLD.boss.hp,
                storedAfterHammer: WALNUT_UNIT.walnutStoredRawDamage,
                nextGuardAt100: NEXT_GUARD_WITH_STORED,
            });
        }

        const CORN_WORLD = new GARDEN(1001),
            CORN_CONFIG = CORN.config(CORN_WORLD.playerProgression, 1),
            CORN_A = CORN_WORLD.spawn(1, 1, -1, 0),
            CORN_B = CORN_WORLD.spawn(1, 1, 1, 0);
        CORN_A.permanentStatMultiplier = 1;
        CORN_B.permanentStatMultiplier = 1.5;
        const PROJECTILE_FOR = (owner) => ({
            owner: owner.id,
            ownerGeneration: owner.generation,
            cornPayload: {
                ownerId: 'solo',
                faction: 'player',
                isFormationClone: false,
                species: 1,
                tier: owner.tier,
                x: owner.x,
                y: owner.y,
                z: owner.z,
                attackerStats: RESOLVE_STATS(owner),
                attackPowerMultiplier: 1,
                buffed: false,
            },
        });
        CORN.onProjectileHit(CORN_WORLD, CORN_WORLD.boss, PROJECTILE_FOR(CORN_A), CORN_CONFIG);
        CORN_WORLD.simulationTick = 1;
        CORN.onProjectileHit(CORN_WORLD, CORN_WORLD.boss, PROJECTILE_FOR(CORN_B), CORN_CONFIG);
        const FIRST_GROUP = CORN_WORLD.cornAttachments.groups[0];
        CORN_WORLD.simulationTick = CORN_CONFIG.attachDelayTicks;
        const BOSS_HP_AT_CLOSE = CORN_WORLD.boss.hp;
        CORN.advance(CORN_WORLD);
        const FIRST_LOSS = BOSS_HP_AT_CLOSE - CORN_WORLD.boss.hp;
        CORN_WORLD.simulationTick += 1;
        CORN.onProjectileHit(CORN_WORLD, CORN_WORLD.boss, PROJECTILE_FOR(CORN_A), CORN_CONFIG);
        const GROUP_COUNT_WHILE_OVERLAPPING = CORN_WORLD.cornAttachments.groups.length;
        CORN_WORLD.simulationTick += 1;
        CORN.advance(CORN_WORLD);
        const SECOND_LOSS = BOSS_HP_AT_CLOSE - CORN_WORLD.boss.hp;
        CORN_WORLD.simulationTick = CORN_CONFIG.attachDelayTicks * 2 + 1;
        const BOSS_HP_BEFORE_OVERLAP = CORN_WORLD.boss.hp;
        CORN.advance(CORN_WORLD);
        const OVERLAP_LOSS = BOSS_HP_BEFORE_OVERLAP - CORN_WORLD.boss.hp,
            CORN_RESULT = {
                sameFirstGroup: FIRST_GROUP.attachments.length,
                ownersInFirstGroup: FIRST_GROUP.attachments.map((attachment) => attachment.ownerId),
                firstDamage: FIRST_LOSS,
                laterDamage: SECOND_LOSS,
                overlapGroups: GROUP_COUNT_WHILE_OVERLAPPING,
                overlapDamage: OVERLAP_LOSS,
                allDamageByAttachment: FIRST_LOSS + (BOSS_HP_AT_CLOSE - FIRST_LOSS - CORN_WORLD.boss.hp),
            };
        const TARGET_WORLD = new GARDEN(1002),
            TARGET = TARGET_WORLD.spawn(0, 1, 2, 2),
            TARGET_OWNER = TARGET_WORLD.spawn(1, 1, 0, 0);
        TARGET.faction = 'enemy';
        TARGET_WORLD.simulationTick = 5;
        const TARGET_GROUP = CORN.onProjectileHit(
            TARGET_WORLD,
            TARGET,
            PROJECTILE_FOR(TARGET_OWNER),
            CORN_CONFIG,
        ).groupId;
        TARGET_WORLD.removeUnit(TARGET);
        TARGET_WORLD.nextId = TARGET.id;
        const REUSED_TARGET = TARGET_WORLD.spawn(0, 1, 2, 2);
        REUSED_TARGET.faction = 'enemy';
        const REUSED_TARGET_HP = REUSED_TARGET.hp;
        TARGET_WORLD.simulationTick = 25;
        CORN.advance(TARGET_WORLD);
        const DEAD_TARGET_CANCELLED = {
            hpUnchanged: REUSED_TARGET.hp === REUSED_TARGET_HP,
            status: TARGET_WORLD.cornAttachments.groups.find((group) => group.id === TARGET_GROUP)?.status,
        };

        const SAVE_WORLD = new GARDEN(1100);
        SAVE_WORLD.playerProgression.level = 2;
        SAVE_WORLD.playerProgression.availablePoints = 0;
        SAVE_WORLD.playerProgression.abilities[ABILITY_IDS.corn].powerLevel = 1;
        if (!VALID_PROGRESS(SAVE_WORLD.playerProgression)) {
            throw Error('Current progression point invariant is invalid before saving.');
        }
        let progress = CAPTURE_PROGRESS(SAVE_WORLD);
        for (let load = 0; load < 3; load++) {
            progress = CAPTURE_PROGRESS(RESTORE_PROGRESS(progress));
        }
        const CURRENT_SAVE = ENCODE_SAVE(SAVE_WORLD, progress).text,
            DECODED = DECODE_SAVE(CURRENT_SAVE),
            SPECIES_RESET = RESET_ABILITY(SAVE_WORLD.playerProgression, { location: 'farm' }, 1),
            FULL_RESET = RESET_PLAYER(SAVE_WORLD.playerProgression, { type: 'all' }, { location: 'farm' });
        let incompatibleRejected = false;
        try {
            READ_SAVE(
                JSON.stringify({
                    schema: 'budmori-farm',
                    productVersion: JSON.parse(CURRENT_SAVE).productVersion,
                    world: {},
                }),
            );
        } catch {
            incompatibleRejected = true;
        }
        const INCOMPATIBLE_ABILITY_SAVE = JSON.parse(CURRENT_SAVE);
        delete INCOMPATIBLE_ABILITY_SAVE.progress.player.abilities[ABILITY_IDS.corn];
        let missingAbilityRejected = false;
        try {
            DECODE_SAVE(JSON.stringify(INCOMPATIBLE_ABILITY_SAVE));
        } catch {
            missingAbilityRejected = true;
        }
        return {
            abilityCount: DEFINITIONS.length,
            baseline: BASELINE,
            modelAndPresentationCount: BASELINE.filter((ability) => ability.hasModel && ability.hasPresentation).length,
            commonCards: (TREE.match(/class="ability-card__grade">Common\(T1\)<\/span>/g) || []).length,
            rootNodePresent: /data-ability-node="[^"]*:root/.test(TREE),
            rootPurchaseReason: ROOT_PURCHASE.reason,
            thornCounts: THORNS.map((result) => result.fanIndices.length),
            thornStarted: THORNS.map((result) => result.started),
            thornTicks: THORNS[2].shotTicks,
            thornReadyBefore60: THORNS[0].readyBefore60,
            thornReadyAt60: THORNS[0].readyAt60,
            thornTargetCancellation: THORN_CANCELLATION,
            deathSplits: DEATH_SPLITS,
            walnut: WALNUT_LEVELS,
            corn: CORN_RESULT,
            deadTargetCancelled: DEAD_TARGET_CANCELLED,
            save: {
                valid: VALID_PROGRESS(DECODED.player),
                currentAbilityLevel: DECODED.player.abilities[ABILITY_IDS.corn].powerLevel,
                currentAvailablePoints: DECODED.player.availablePoints,
                speciesResetRefund: SPECIES_RESET.refunded,
                speciesResetPoints: SPECIES_RESET.state.availablePoints,
                fullResetRefund: FULL_RESET.refunded,
                fullResetPoints: FULL_RESET.state.availablePoints,
                incompatibleRejected,
                missingAbilityRejected,
            },
        };
    });
    assert.equal(RESULTS.abilityCount, 9);
    assert.equal(RESULTS.modelAndPresentationCount, 9);
    assert.equal(RESULTS.commonCards, 9);
    assert.equal(RESULTS.rootNodePresent, false);
    assert.equal(RESULTS.rootPurchaseReason, 'unknown-node');
    assert.deepEqual(RESULTS.thornStarted, [true, true, true]);
    assert.deepEqual(RESULTS.thornCounts, [1, 2, 3]);
    assert.deepEqual(RESULTS.thornTicks, [100, 102, 104]);
    assert.equal(RESULTS.thornReadyBefore60, false);
    assert.equal(RESULTS.thornReadyAt60, true);
    assert.deepEqual(RESULTS.thornTargetCancellation, { count: 1, remaining: 0 });
    assert.deepEqual(
        RESULTS.deathSplits.map((split) => ({
            count: split.count,
            tier: split.tier,
            multiplier: split.multiplier,
            childHp: split.childHp,
            childAttack: split.childAttack,
            giantInherited: split.giantInherited,
            retryCount: split.retryCount,
            cleaned: split.cleaned,
            effect: split.effect,
        })),
        [1, 1.5, 2.25].map((multiplier) => ({
            count: 2,
            tier: 1,
            multiplier,
            childHp: 40 * multiplier,
            childAttack: 4 * multiplier,
            giantInherited: false,
            retryCount: 2,
            cleaned: true,
            effect: true,
        })),
    );
    for (const [INDEX, WALNUT] of RESULTS.walnut.entries()) {
        assert.equal(WALNUT.started, true);
        assert.equal(WALNUT.armorDuring, 50);
        assert.equal(WALNUT.armorAfter, 0);
        assert.equal(WALNUT.storedRaw, 4);
        assert(Math.abs(WALNUT.actualLossDuringGuard - WALNUT.expectedLossDuringGuard) < 1e-9);
        assert.equal(WALNUT.hammerDamage, [8, 10, 13][INDEX]);
        assert.equal(WALNUT.storedAfterHammer, 0);
        assert.equal(WALNUT.nextGuardAt100, false);
    }
    assert.deepEqual(RESULTS.corn.ownersInFirstGroup.length, 2);
    assert.equal(RESULTS.corn.sameFirstGroup, 2);
    assert.equal(RESULTS.corn.firstDamage, 2);
    assert.equal(RESULTS.corn.overlapGroups, 2);
    assert(RESULTS.corn.overlapDamage > 1.9 && RESULTS.corn.overlapDamage <= 2);
    assert.deepEqual(RESULTS.deadTargetCancelled, { hpUnchanged: true, status: 'cancelled' });
    assert.equal(RESULTS.save.valid, true);
    assert.equal(RESULTS.save.currentAbilityLevel, 1);
    assert.equal(RESULTS.save.currentAvailablePoints, 0);
    assert.equal(RESULTS.save.speciesResetRefund, 1);
    assert.equal(RESULTS.save.speciesResetPoints, 1);
    assert.equal(RESULTS.save.fullResetRefund, 1);
    assert.equal(RESULTS.save.fullResetPoints, 1);
    assert.equal(RESULTS.save.incompatibleRejected, true);
    assert.equal(RESULTS.save.missingAbilityRejected, true);
    await clean(P);
    CHECK(
        'All nine Common(T1) abilities render and activate without unlock nodes; current-schema load/reset preserves points',
    );
    CHECK('Chestnut thorns fire 1/2/3 at 2-tick intervals with a 60-tick cooldown and no target retargeting');
    CHECK('Peanut death splits once into T1 units at 1/1.5/2.25 scaling and battle cleanup removes them');
    CHECK('Walnut accumulates RAW damage under +50 armor and consumes 100/150/225% on the next hammer');
    CHECK('Corn attachments group multiple owners, overlap closed chains, and cancel on a reused target ID');
    await C.close();
}
async function bossRewards() {
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
    await P.waitForFunction(() => !document.getElementById('bloom-module-loading'));
    await P.locator('#newGame').click();
    await P.waitForFunction(() => BUDMORI.sim?.scene === 'farm' && BUDMORI.runtime.tick > 5);
    await P.locator('#raid').click();
    await P.waitForFunction(() => document.querySelector('#bossEncounterScreen')?.hidden === false);
    await P.locator('#bossEncounterChallenge').click();
    await P.waitForFunction(() => BUDMORI.sim?.scene === 'raid' && !!BUDMORI.sim.raidRoster('solo'));
    const RAID_RUN = await P.evaluate(() => {
        const WORLD = BUDMORI.sim,
            ROSTER = WORLD.raidRoster('solo'),
            TROOP = ROSTER.troops[0],
            SEQUENCE = ROSTER.lastDeploySequence + 1;
        if (!WORLD.deployNextRaidUnit('solo', SEQUENCE, TROOP.species)) {
            throw Error('could not deploy the first Raid casualty');
        }
        const DEPLOYED = WORLD.units.find((unit) => unit.farmId === TROOP.farmId);
        if (!DEPLOYED) {
            throw Error('deployed Raid unit is missing from the active world');
        }
        DEPLOYED.hp = 0;
        WORLD.step(1 / 120);
        WORLD.finish('victory');
        return {
            sequence: ROSTER.settlementRunSequence,
            deployed: ROSTER.troops.filter((troop) => troop.deployed).length,
            casualtyHandled: DEPLOYED.deathSplitHandled,
        };
    });
    assert.equal(RAID_RUN.deployed, 1);
    assert.equal(RAID_RUN.casualtyHandled, true);
    await P.waitForFunction(
        () =>
            BUDMORI.sim.scene === 'raid' &&
            document.querySelector('#bossRewardDialog')?.hidden === false &&
            document.querySelector('#bossRewardChest')?.getClientRects().length > 0 &&
            document.querySelector('#bossRewardBoxes')?.getClientRects().length === 0,
        {},
        { timeout: 15000 },
    );
    await P.waitForFunction(
        () => document.querySelector('#bossRewardRevealCount')?.textContent.includes('1/1'),
        {},
        { timeout: 10000 },
    );
    const RAID_RESULT = await P.evaluate(async () => {
        const { validateFarmProgress: VALIDATE_PROGRESS } = await import('/src/farm-progress.js'),
            { bossAcquisitionChance: ACQUISITION_CHANCE } = await import('/src/boss-rewards.js'),
            PROGRESS = BUDMORI.storage.savedProgress,
            REWARD = PROGRESS?.ledger?.boss?.pendingRewards?.find(
                (item) => item.source === 'raid' && item.encounterId === BUDMORI.sim.boss.encounterId,
            );
        VALIDATE_PROGRESS(PROGRESS);
        return {
            activeScene: BUDMORI.sim.scene,
            resultText: document.querySelector('#bossRewardTotals')?.textContent || '',
            receiptStatus: REWARD?.status,
            acquired: REWARD?.acquiredCount,
            queued: REWARD?.queuedCount,
            boxCount: REWARD?.boxCount,
            firstClear: REWARD?.firstClear,
            baselineChance: REWARD?.baselineChance,
            chance: REWARD?.chance,
            acquisitionMultiplier: REWARD?.acquisitionMultiplier,
            maximumFirstClearChance: ACQUISITION_CHANCE({ firstClear: true, acquisitionMultiplier: 2 }),
            highestClearedRaidStage: PROGRESS?.bossStages?.highestClearedRaidStage,
            currentStage: PROGRESS?.bossStages?.currentStage,
        };
    });
    assert.equal(RAID_RESULT.activeScene, 'raid', 'the reward finishes before returning to Farm');
    assert.equal(RAID_RESULT.receiptStatus, 'ready');
    assert.equal(RAID_RESULT.boxCount, 1);
    assert.equal(RAID_RESULT.firstClear, true);
    assert.equal(RAID_RESULT.baselineChance, 0.15);
    assert.equal(RAID_RESULT.chance, 0.15 * RAID_RESULT.acquisitionMultiplier);
    assert.equal(RAID_RESULT.maximumFirstClearChance, 0.3);
    assert.equal(RAID_RESULT.highestClearedRaidStage, 1);
    assert.equal(RAID_RESULT.currentStage, 2);
    assert.equal(typeof RAID_RESULT.acquired, 'number');
    assert.equal(typeof RAID_RESULT.queued, 'number');
    assert(!RAID_RESULT.resultText.includes('undefined'));
    await P.locator('#bossRewardClose').click();
    assert.equal(await P.locator('#bossRewardOpen').isVisible(), false, 'completed boxes cannot be reopened later');
    await P.locator('#return').click();
    await P.waitForFunction(() => BUDMORI.sim.scene === 'farm');
    await P.locator('#raid').click();
    await P.waitForFunction(() => document.querySelector('#bossEncounterScreen')?.hidden === false);
    assert.equal(
        await P.locator('#bossStageCounter').textContent(),
        '2 / 61',
        'the first clear unlocks exactly the next stage',
    );
    assert.match(await P.locator('#bossStageDrop').textContent(), /15%/);
    assert.equal(await P.locator('#bossEncounterChallenge').isDisabled(), false);
    await swipeEncounter(P, 'down');
    assert.equal(await P.locator('#bossStageCounter').textContent(), '1 / 61');
    assert.match(
        await P.locator('#bossStageDrop').textContent(),
        /5%/,
        'replaying a cleared stage returns to the regular base chance',
    );
    assert.equal(await P.locator('#bossEncounterChallenge').isDisabled(), false);
    await swipeEncounter(P, 'up');
    await swipeEncounter(P, 'up');
    assert.equal(await P.locator('#bossStageCounter').textContent(), '3 / 61');
    assert.equal(
        await P.locator('#bossEncounterChallenge').isDisabled(),
        true,
        'stages beyond the next one stay locked',
    );
    await swipeEncounter(P, 'up');
    assert.equal(
        await P.locator('#bossStageCounter').textContent(),
        '3 / 61',
        'swiping cannot create an unbounded stage preview',
    );
    const LOCKED_AND_CANCELLED = await P.evaluate(async () => {
        const { snapshot: SNAPSHOT } = await import('/src/farm-state.js'),
            {
                reserveRaidRun: RESERVE,
                settleRaidOwnerFarm: SETTLE,
                abortReservedRaidRun: ABORT,
            } = await import('/src/raid-settlement.js'),
            FARM = SNAPSHOT(BUDMORI.sim),
            RESERVED = RESERVE(FARM, { sessionId: 'boss-stage-lock-e2e' });
        let blockedStage = false;
        try {
            SETTLE(RESERVED.farm, {
                ownerId: 'solo',
                sessionId: RESERVED.sessionId,
                encounterId: RESERVED.runSequence,
                runSequence: RESERVED.runSequence,
                outcome: 'victory',
                raidWorld: { boss: { stage: 4 } },
            });
        } catch (error) {
            blockedStage = /locked/i.test(error.message);
        }
        const CANCELLED = ABORT(RESERVED.farm);
        return {
            blockedStage,
            canceled: CANCELLED.applied,
            highestAfterCancel: CANCELLED.farm.farmBossProgress.highestClearedRaidStage,
        };
    });
    assert.deepEqual(LOCKED_AND_CANCELLED, { blockedStage: true, canceled: true, highestAfterCancel: 1 });
    await swipeEncounter(P, 'down');
    assert.equal(await P.locator('#bossStageCounter').textContent(), '2 / 61');
    await P.locator('#bossEncounterChallenge').click();
    await P.waitForFunction(() => BUDMORI.sim.scene === 'raid');
    await P.evaluate(() => {
        BUDMORI.sim.running = true;
        BUDMORI.sim.finish('defeat');
    });
    await P.waitForFunction(() => BUDMORI.sim.encounter.outcome === 'defeat');
    await P.locator('#return').click();
    await P.waitForFunction(() => BUDMORI.sim.scene === 'farm');
    const AFTER_DEFEAT = await P.evaluate(() => BUDMORI.storage.savedProgress.bossStages.highestClearedRaidStage);
    assert.equal(AFTER_DEFEAT, 1, 'defeat preserves the highest cleared stage');
    await P.locator('#raid').click();
    await P.locator('#bossEncounterBack').click();
    const CREATED = await P.evaluate(async () => {
        const {
                settleBossKill: SETTLE,
                advanceBossRewardCalculations: ADVANCE,
                grantPendingBossAcquisitions: GRANT_PENDING,
            } = await import('/src/boss-rewards.js'),
            WORLD = BUDMORI.sim;
        WORLD.nextRaidRunSequence = 77;
        WORLD.raidSettlementWatermark = 77;
        const RECEIPT = SETTLE(WORLD, {
            encounterId: 77,
            source: 'raid',
            receiptKey: 'ui-boss-box-77',
            rollBudget: 17,
            species: 2,
        }).receipt;
        RECEIPT.chance = 1;
        let calculationSteps = 0;
        while (RECEIPT.status === 'calculating' && calculationSteps < 20) {
            ADVANCE(WORLD, { maxUnitsPerReward: 10 });
            calculationSteps += 1;
        }
        RECEIPT.chance = 0.05;
        GRANT_PENDING(WORLD);
        return {
            receiptKey: RECEIPT.receiptKey,
            boxCount: RECEIPT.boxCount,
            status: RECEIPT.status,
            acquiredCount: RECEIPT.acquiredCount,
            placedCount: RECEIPT.placedCount,
        };
    });
    assert.deepEqual(CREATED, {
        receiptKey: 'ui-boss-box-77',
        boxCount: 17,
        status: 'ready',
        acquiredCount: 17,
        placedCount: 17,
    });
    await P.waitForFunction(
        () =>
            document.querySelector('#bossRewardDialog')?.hidden === false &&
            document.querySelector('#bossRewardChest')?.getClientRects().length > 0 &&
            document.querySelector('#bossRewardRevealCount')?.textContent.includes('0/17'),
    );
    const CLOSED_CHEST = await P.evaluate(() => ({
        revealed: BUDMORI.sim.bossRewardReceipts.find((item) => item.receiptKey === 'ui-boss-box-77')?.revealedCount,
        hasPrize: document.querySelector('#bossRewardPrize')?.hidden === false,
        chestClosed: !document.querySelector('#bossRewardChestScene')?.classList.contains('is-lid-open'),
    }));
    assert.deepEqual(CLOSED_CHEST, { revealed: 0, hasPrize: false, chestClosed: true });
    await P.waitForFunction(() => document.querySelector('#bossRewardRevealCount')?.textContent.includes('10/17'));
    const AUTO_REVEAL = await P.evaluate(() => {
        const REWARD = BUDMORI.sim.bossRewardReceipts.find((item) => item.receiptKey === 'ui-boss-box-77');
        return {
            revealedCount: REWARD.revealedCount,
            sceneCycle: document.querySelector('#bossRewardChestScene')?.dataset.cycle,
            mobileViewport: matchMedia('(max-width: 500px)').matches,
        };
    });
    assert.equal(AUTO_REVEAL.mobileViewport, true);
    assert.equal(AUTO_REVEAL.revealedCount, 10);
    assert(['hit', 'miss'].includes(AUTO_REVEAL.sceneCycle));
    await P.locator('#bossRewardOpenAll').click();
    await P.evaluate(() => document.querySelector('#bossRewardOpenAll').click());
    await P.waitForFunction(
        () => BUDMORI.sim.bossRewardReceipts.find((item) => item.receiptKey === 'ui-boss-box-77')?.revealedCount === 17,
    );
    const OPENED = await P.evaluate(() => {
        const REWARD = BUDMORI.sim.bossRewardReceipts.find((item) => item.receiptKey === 'ui-boss-box-77');
        return {
            status: REWARD.status,
            count: REWARD.boxCount,
            revealed: REWARD.revealedCount,
            acquired: REWARD.acquiredCount,
            placed: REWARD.placedCount,
            queued: REWARD.queuedCount,
            hits: REWARD.boxes.filter((box) => box.hit).length,
            totalPayout: REWARD.boxes.reduce((sum, box) => sum + box.payout, 0),
        };
    });
    assert.deepEqual(OPENED, {
        status: 'ready',
        count: 17,
        revealed: 17,
        acquired: 17,
        placed: 17,
        queued: 0,
        hits: 17,
        totalPayout: 17,
    });
    const SETTLED_SAVE = await P.evaluate(() => {
        if (!BUDMORI.storage.save(BUDMORI.sim)) {
            throw Error(BUDMORI.storage.error || 'Could not save settled reward');
        }
        const REWARD = BUDMORI.storage.savedProgress.ledger.boss.pendingRewards.find(
            (item) => item.receiptKey === 'ui-boss-box-77',
        );
        return {
            hasBoxes: Object.hasOwn(REWARD, 'boxes'),
            hasRevealCursor: Object.hasOwn(REWARD, 'revealedCount'),
            status: REWARD.status,
            acquired: REWARD.acquiredCount,
            placed: REWARD.placedCount,
            queued: REWARD.queuedCount,
        };
    });
    assert.deepEqual(SETTLED_SAVE, {
        hasBoxes: false,
        hasRevealCursor: false,
        status: 'ready',
        acquired: 17,
        placed: 17,
        queued: 0,
    });
    await P.locator('#bossRewardClose').click();
    assert.equal(await P.locator('#bossRewardOpen').isVisible(), false);
    const SNAPSHOT_DIAGNOSTIC = await P.evaluate(async () => {
        const { snapshot: SNAPSHOT } = await import('/src/farm-state.js'),
            { validateSnapshot: VALIDATE } = await import('/src/farm-snapshot-validation.js'),
            RAW = SNAPSHOT(BUDMORI.sim),
            RECEIPTS = RAW.bossRewardReceipts.map(({ receiptKey, status, source, encounterId }) => ({
                receiptKey,
                status,
                source,
                encounterId,
            }));
        try {
            return { valid: VALIDATE(RAW), receipts: RECEIPTS };
        } catch (error) {
            return { valid: false, receipts: RECEIPTS, error: error.message };
        }
    });
    assert(SNAPSHOT_DIAGNOSTIC.valid, JSON.stringify(SNAPSHOT_DIAGNOSTIC));
    await P.reload();
    await P.waitForFunction(() => window.BUDMORI?.sim && document.querySelector('#continueGame'));
    if (await P.locator('#continueGame').isVisible()) {
        await P.locator('#continueGame').click();
    }
    await P.waitForFunction(() => document.querySelector('#startScreen')?.hidden === true);
    const RESTORED = await P.evaluate(() => {
        const REWARD = BUDMORI.sim.bossRewardReceipts.find((item) => item.receiptKey === 'ui-boss-box-77');
        return {
            status: REWARD?.status,
            revealed: REWARD?.revealedCount,
            boxes: REWARD?.boxes.length,
            acquired: REWARD?.acquiredCount,
            highestClearedRaidStage: BUDMORI.sim.farmBossProgress.highestClearedRaidStage,
            currentStage: BUDMORI.sim.farmBossProgress.currentStage,
        };
    });
    assert.deepEqual(RESTORED, {
        status: 'ready',
        revealed: 17,
        boxes: 0,
        acquired: 17,
        highestClearedRaidStage: 1,
        currentStage: 2,
    });
    const EMPTY_HUNDRED = await P.evaluate(async () => {
        const { settleBossKill: SETTLE, advanceBossRewardCalculations: ADVANCE } = await import('/src/boss-rewards.js'),
            WORLD = BUDMORI.sim;
        WORLD.nextRaidRunSequence = 78;
        WORLD.raidSettlementWatermark = 78;
        const RECEIPT = SETTLE(WORLD, {
            encounterId: 78,
            source: 'raid',
            receiptKey: 'ui-empty-box-100',
            rollBudget: 100,
            species: 2,
        }).receipt;
        RECEIPT.chance = 0;
        let steps = 0;
        while (RECEIPT.status === 'calculating' && steps < 100) {
            ADVANCE(WORLD, { maxUnitsPerReward: 10 });
            steps += 1;
        }
        if (RECEIPT.status !== 'ready') {
            throw Error('100 empty chest outcomes did not finish calculation');
        }
        RECEIPT.chance = 0.05;
        return {
            boxCount: RECEIPT.boxCount,
            hitCount: RECEIPT.boxes.filter((box) => box.hit).length,
            acquiredCount: RECEIPT.acquiredCount,
        };
    });
    assert.deepEqual(EMPTY_HUNDRED, { boxCount: 100, hitCount: 0, acquiredCount: 0 });
    await P.waitForFunction(
        () =>
            document.querySelector('#bossRewardDialog')?.hidden === false &&
            document.querySelector('#bossRewardChestScene')?.classList.contains('is-empty'),
        {},
        { timeout: 15000 },
    );
    const EMPTY_CHEST = await P.evaluate(() => ({
        isEmpty: document.querySelector('#bossRewardEmpty')?.hidden === false,
        hasPrize: document.querySelector('#bossRewardPrize')?.hidden === false,
        revealCount: BUDMORI.sim.bossRewardReceipts.find((item) => item.receiptKey === 'ui-empty-box-100')
            ?.revealedCount,
    }));
    assert.deepEqual(EMPTY_CHEST, { isEmpty: true, hasPrize: false, revealCount: 0 });
    await P.waitForFunction(() => document.querySelector('#bossRewardRevealCount')?.textContent.includes('10/100'));
    await P.locator('#bossRewardOpenAll').click();
    await P.evaluate(() => document.querySelector('#bossRewardOpenAll').click());
    const EMPTY_OPENED = await P.evaluate(() => {
        const REWARD = BUDMORI.sim.bossRewardReceipts.find((item) => item.receiptKey === 'ui-empty-box-100');
        return {
            revealed: REWARD.revealedCount,
            acquired: REWARD.acquiredCount,
            hits: REWARD.boxes.filter((box) => box.hit).length,
        };
    });
    assert.deepEqual(EMPTY_OPENED, { revealed: 100, acquired: 0, hits: 0 });
    await P.locator('#bossRewardClose').click();
    const RAID_RESERVATION_SAVE = await P.evaluate(async () => {
        const { captureFarmProgress: CAPTURE, validateFarmProgress: VALIDATE } = await import('/src/farm-progress.js');
        const { encodeFarmSave: ENCODE, decodeFarmSave: DECODE } = await import('/src/farm-save-codec.js');
        const { snapshot: SNAPSHOT, restore: RESTORE } = await import('/src/farm-state.js');
        const { reserveRaidRun: RESERVE } = await import('/src/raid-settlement.js');
        let stage = 'capture';
        try {
            const RECEIPT = BUDMORI.sim.bossRewardReceipts.find((item) => item.receiptKey === 'ui-boss-box-77');
            const PROGRESS = CAPTURE(BUDMORI.sim);
            stage = 'encode-restored-progress';
            const SAVED = ENCODE(BUDMORI.sim, PROGRESS),
                DECODED = DECODE(SAVED.text);
            VALIDATE(DECODED);
            stage = 'reserve-and-restore';
            const RESERVED = RESERVE(SNAPSHOT(BUDMORI.sim)),
                CANDIDATE = RESTORE(RESERVED.farm);
            stage = 'FarmStorage.save';
            const SAVE_OK = BUDMORI.storage.save(CANDIDATE);
            if (!SAVE_OK) {
                return { stage, error: BUDMORI.storage.error };
            }
            VALIDATE(BUDMORI.storage.savedProgress);
            VALIDATE(DECODE(BUDMORI.storage.raw));
            return {
                stage: 'saved',
                receiptStatus: RECEIPT.status,
                receiptHasRoll: Object.hasOwn(RECEIPT, 'roll'),
                activeRun: BUDMORI.storage.savedProgress.ledger.raid.activeRun,
                nextSequence: BUDMORI.storage.savedProgress.ledger.raid.nextRunSequence,
                settledThrough: BUDMORI.storage.savedProgress.ledger.raid.settledThrough,
            };
        } catch (error) {
            return { stage, error: error.message };
        }
    });
    assert.deepEqual(
        RAID_RESERVATION_SAVE,
        {
            stage: 'saved',
            receiptStatus: 'ready',
            receiptHasRoll: false,
            activeRun: {
                sequence: 79,
                sessionId: 'farm-raid-79',
            },
            nextSequence: 79,
            settledThrough: 78,
        },
        'a restored reward receipt can be encoded and the next Raid reservation can be saved',
    );
    await clean(P);
    CHECK(
        'Raid victory auto-settles and reveals before Farm return; saved receipts omit box outcomes and reveal cursors',
    );
    CHECK('Mobile reward result opens the remaining boxes without persisting presentation state');
    await C.close();
    const FARM_CONTEXT = await browser.newContext({
            viewport: { width: 390, height: 844 },
            deviceScaleFactor: 3,
            isMobile: true,
            hasTouch: true,
        }),
        FARM_PAGE = await open(FARM_CONTEXT);
    await FARM_PAGE.locator('#newGame').click();
    await FARM_PAGE.waitForFunction(() => BUDMORI.sim?.scene === 'farm' && BUDMORI.runtime.tick > 5);
    await FARM_PAGE.evaluate(() => {
        const WORLD = BUDMORI.sim;
        WORLD.playerProgression.farmBossEventStage = 8;
        WORLD.rng = new globalThis.BloomGamekitDeterministic.SeededPRNG(118);
        WORLD.foodTaps.remainder = 4;
        WORLD.foodTaps.autoClock = 0;
        WORLD.warehouseFood = 1;
        if (!WORLD.scatterFoodAtRandomLocation()) {
            throw Error('manual food did not start the farm boss event');
        }
    });
    await FARM_PAGE.waitForFunction(() => BUDMORI.sim.farmBossEvent.phase === 'fighting', {}, { timeout: 10000 });
    const FARM_SETTLEMENT = await FARM_PAGE.evaluate(async () => {
        const WORLD = BUDMORI.sim;
        BUDMORI.runtime.paused = true;
        WORLD.boss.hp = 0;
        WORLD.step(1 / 20);
        const RECEIPT = WORLD.bossRewardReceipts.find(
            (item) => item.source === 'farm' && item.encounterId === WORLD.farmBossEvent.encounterId,
        );
        if (!RECEIPT) {
            throw Error('actual farm boss death did not settle a reward receipt');
        }
        RECEIPT.chance = 1;
        const { advanceBossRewardCalculations: ADVANCE } = await import('/src/boss-rewards.js');
        let steps = 0;
        while (RECEIPT.status === 'calculating' && steps < 100) {
            ADVANCE(WORLD, { maxUnitsPerReward: 10 });
            steps += 1;
        }
        if (RECEIPT.status !== 'ready') {
            throw Error('farm boss reward calculation did not finish');
        }
        RECEIPT.chance = 0.1;
        if (!BUDMORI.storage.save(WORLD)) {
            throw Error(BUDMORI.storage.error || 'could not checkpoint the actual farm reward');
        }
        const SAVED = BUDMORI.storage.savedProgress.ledger.boss.pendingRewards.find(
            (item) => item.receiptKey === RECEIPT.receiptKey,
        );
        return {
            outcome: WORLD.farmBossEvent.outcome,
            phase: WORLD.farmBossEvent.phase,
            stage: RECEIPT.stage,
            boxCount: RECEIPT.boxCount,
            acquired: RECEIPT.acquiredCount,
            placed: RECEIPT.placedCount,
            queued: RECEIPT.queuedCount,
            storedAcquired: SAVED?.acquiredCount,
            storedQueued: SAVED?.queuedCount,
            storesBoxes: Object.hasOwn(SAVED, 'boxes'),
            storesRevealCursor: Object.hasOwn(SAVED, 'revealedCount'),
        };
    });
    assert.deepEqual(FARM_SETTLEMENT, {
        outcome: 'victory',
        phase: 'celebrating',
        stage: 8,
        boxCount: 17,
        acquired: 17,
        placed: 0,
        queued: 17,
        storedAcquired: 17,
        storedQueued: 17,
        storesBoxes: false,
        storesRevealCursor: false,
    });
    const RAW_AT_SETTLEMENT = await FARM_PAGE.evaluate(() => BUDMORI.storage.raw);
    await FARM_PAGE.waitForFunction(
        () =>
            document.querySelector('#bossRewardDialog')?.hidden === false &&
            document.querySelector('#bossRewardChest')?.getClientRects().length > 0 &&
            document.querySelector('#bossRewardRevealCount')?.textContent.includes('10/17'),
        {},
        { timeout: 10000 },
    );
    await FARM_PAGE.waitForFunction(
        () => document.querySelector('#bossRewardRevealCount')?.textContent.includes('17/17'),
        {},
        { timeout: 5000 },
    );
    const FARM_REVEAL = await FARM_PAGE.evaluate(() => ({
        totals: document.querySelector('#bossRewardTotals')?.textContent || '',
        opened: BUDMORI.sim.bossRewardReceipts.find(
            (item) => item.source === 'farm' && item.encounterId === BUDMORI.sim.farmBossEvent.encounterId,
        )?.revealedCount,
    }));
    assert.equal(FARM_REVEAL.opened, 17);
    assert(FARM_REVEAL.totals.includes('17'));
    await FARM_PAGE.locator('#bossRewardClose').click();
    await FARM_PAGE.reload();
    await FARM_PAGE.waitForFunction(() => window.BUDMORI);
    assert.equal(
        await FARM_PAGE.evaluate(() => localStorage.getItem('bloom-weapon-cards-v4')),
        RAW_AT_SETTLEMENT,
        'a valid settled payout remains byte-identical on startup before resuming play',
    );
    if (await FARM_PAGE.locator('#continueGame').isVisible()) {
        await FARM_PAGE.locator('#continueGame').tap();
    }
    await FARM_PAGE.waitForFunction(
        () => BUDMORI.sim?.scene === 'farm' && document.querySelector('#startScreen').hidden,
    );
    await FARM_PAGE.evaluate(() => {
        BUDMORI.runtime.paused = true;
    });
    await FARM_PAGE.waitForFunction(
        () => document.querySelector('#bossRewardDialog')?.hidden === false,
        {},
        { timeout: 10000 },
    );
    const FARM_RESTORED = await FARM_PAGE.evaluate(() => {
        const REWARD = BUDMORI.sim.bossRewardReceipts.find((item) => item.source === 'farm');
        return {
            acquired: REWARD?.acquiredCount,
            queued: REWARD?.queuedCount,
            boxes: REWARD?.boxes.length,
            status: REWARD?.status,
            screenTotal: document.querySelector('#bossRewardTotals')?.textContent || '',
            stored: JSON.parse(localStorage.getItem('bloom-weapon-cards-v4')).progress.ledger.boss.pendingRewards.find(
                (item) => item.source === 'farm',
            ),
        };
    });
    assert.equal(FARM_RESTORED.acquired, 17, 'the actual payout survives a reload without rerolling');
    assert.equal(FARM_RESTORED.boxes, 0, 'the restored result does not persist a chest list');
    assert.equal(FARM_RESTORED.status, 'ready');
    assert(FARM_RESTORED.screenTotal.includes('17 acquired'));
    assert.equal(Object.hasOwn(FARM_RESTORED.stored, 'revealedCount'), false);
    await clean(FARM_PAGE);
    await FARM_CONTEXT.close();
    CHECK(
        'Actual Farm boss death settles 17 rewards, reveals 10 then 7, and reload preserves totals without boxes or cursor',
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
    const C = await browser.newContext({ viewport: { width: 1280, height: 800 } }),
        P = await open(C);
    await P.locator('#newGame').click();
    await P.waitForFunction(() => BUDMORI.runtime.tick > 3);
    await goHome(P);
    const VALID = await P.evaluate(() => localStorage.getItem('bloom-weapon-cards-v4'));
    assert.equal(JSON.parse(VALID).productVersion, PRODUCT_VERSION);
    const DOWNLOAD = P.waitForEvent('download');
    await P.locator('#exportSave').click();
    const EXPORTED = await DOWNLOAD,
        EXPORTED_RAW = await readFile(await EXPORTED.path(), 'utf8');
    assert.equal(EXPORTED_RAW, VALID, 'current save export preserves the supported envelope');
    await P.locator('#saveFile').setInputFiles({
        name: 'invalid.json',
        mimeType: 'application/json',
        buffer: Buffer.from('{"progress":{}}'),
    });
    assert.equal(
        await P.evaluate(() => localStorage.getItem('bloom-weapon-cards-v4')),
        VALID,
        'invalid import cannot overwrite the current save',
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
    await P.waitForFunction(() => BUDMORI.runtime.tick > 3);
    await goHome(P);
    await P.reload();
    await P.waitForFunction(() => window.BUDMORI);
    assert.equal(
        await P.evaluate(() => localStorage.getItem('bloom-weapon-cards-v4')),
        VALID,
        'a valid current-format save is not rewritten during startup',
    );
    await P.locator('#continueGame').click();
    await P.waitForFunction(() => BUDMORI.runtime.tick > 3);
    await clean(P);
    CHECK(
        'Current-format save export/import and reload preserve supported progress; invalid imports leave it unchanged',
    );
    await C.close();
}
async function migration() {
    const C = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
    });
    await C.addInitScript((raw) => {
        localStorage.setItem('bloom-weapon-cards-v4', raw);
        localStorage.setItem(
            'bloom-weapon-cards-v3',
            JSON.stringify({ productVersion: '0.4.7', sentinel: 'untouched' }),
        );
    }, 'incompatible-prelaunch-save');
    const P = await open(C);
    await P.waitForFunction(
        () => window.BUDMORI && localStorage.getItem('bloom-weapon-cards-v4') !== 'incompatible-prelaunch-save',
    );
    const INITIAL = await P.evaluate(() => ({
        currentRaw: localStorage.getItem('bloom-weapon-cards-v4'),
        legacyRaw: localStorage.getItem('bloom-weapon-cards-v3'),
        continueDisabled: document.querySelector('#continueGame').disabled,
        legacyControls: document.querySelectorAll('#continueLegacyGame, #legacySaveNotice').length,
        notice: document.querySelector('#saveNotice').textContent,
    }));
    assert.equal(JSON.parse(INITIAL.currentRaw).productVersion, PRODUCT_VERSION);
    assert.equal(INITIAL.continueDisabled, false, 'an incompatible prelaunch save initializes a playable current farm');
    assert.equal(INITIAL.legacyControls, 0, 'legacy conversion controls are not exposed');
    assert.equal(INITIAL.legacyRaw, JSON.stringify({ productVersion: '0.4.7', sentinel: 'untouched' }));
    await P.locator('#continueGame').tap();
    await P.waitForFunction(() => BUDMORI.sim.scene === 'farm' && document.querySelector('#startScreen').hidden);
    const ROSTER = await P.evaluate(() => BUDMORI.sim.units.map((unit) => [unit.species, unit.tier]));
    assert(ROSTER.length > 0, 'the reset farm starts with its normal roster');
    await goHome(P);
    await P.reload();
    await P.waitForFunction(() => window.BUDMORI);
    assert.equal(
        await P.evaluate(() => localStorage.getItem('bloom-weapon-cards-v4')),
        INITIAL.currentRaw,
        'the new valid save remains byte-stable on reload before play resumes',
    );
    assert.equal(
        await P.evaluate(() => localStorage.getItem('bloom-weapon-cards-v3')),
        INITIAL.legacyRaw,
        'the ignored legacy key is not imported or changed',
    );
    await P.locator('#continueGame').tap();
    await P.waitForFunction(() => BUDMORI.sim.scene === 'farm');
    await clean(P);
    CHECK(
        'Incompatible prelaunch current save resets once to a fresh playable format; legacy key is ignored and untouched',
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
        W.warehouseFood = 1;
        if (!W.scatterFoodAtRandomLocation()) {
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
            rollBudget: 5,
            chance: 0.1,
            acquisitionMultiplier: 2,
        },
    );
    assert.equal(STAGE_RESULTS.stageFiveReceipt.rollCount, 5);
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
            mergePolicy: mergePolicyRegression,
            upgrades,
            grain: grainMechanicsFlow,
            reset: progressionResetFlow,
            cadence: cadenceDiagnosticsFlow,
            formation: formationBrowserUI,
            raidHud: raidHudGeometryOnly,
            raidDeploymentCards: raidDeploymentCardsFlow,
            representativeAbilities: representativeAbilitiesFlow,
            save,
            migration,
            event,
            bossRewards,
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
