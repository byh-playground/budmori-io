// Compact actual-source motion gate. No generated bundle, injected pose, manual
// simulation stepping. Preview observation bounds input deltas; main battle uses normal time.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const VIEWPORT = process.argv[2] || 'desktop',
    ROOT = fileURLToPath(new URL('../', import.meta.url)),
    OUTPUT = path.join(ROOT, 'tests/output/walnut-motion', VIEWPORT),
    SIZE = VIEWPORT === 'landscape' ? { width: 844, height: 390 } : { width: 1100, height: 850 },
    HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'),
    MANIFEST = JSON.parse(
        HTML.match(/<script id="bloom-runtime-manifest" type="application\/json">(.*?)<\/script>/s)[1],
    ),
    MODULES = new Map(
        MANIFEST.modules.map((item) => [
            item.url,
            fs.readFileSync(path.join(ROOT, 'vendor/upstream', item.name + '.js')),
        ]),
    ),
    TYPES = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.svg': 'image/svg+xml',
    },
    ERRORS = [],
    REPORT = [];
assert.ok(['desktop', 'landscape'].includes(VIEWPORT));
fs.mkdirSync(OUTPUT, { recursive: true });
const SERVER = http.createServer((request, response) => {
    const FILE = path.resolve(ROOT, '.' + decodeURIComponent(request.url.split('?')[0]));
    if (!FILE.startsWith(ROOT + path.sep) || !fs.existsSync(FILE) || !fs.statSync(FILE).isFile()) {
        response.writeHead(request.url.includes('favicon.ico') ? 204 : 404).end();
        return;
    }
    response.setHeader('content-type', TYPES[path.extname(FILE)] || 'application/octet-stream');
    response.end(fs.readFileSync(FILE));
});
await new Promise((resolve) => SERVER.listen(0, '127.0.0.1', resolve));
let browser;
try {
    browser = await chromium.launch({
        executablePath: process.env.CHROME_PATH,
        args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    });
    const CONTEXT = await browser.newContext({
            viewport: SIZE,
            hasTouch: VIEWPORT === 'landscape',
            serviceWorkers: 'block',
        }),
        PAGE = await CONTEXT.newPage(),
        ORIGIN = `http://127.0.0.1:${SERVER.address().port}`;
    PAGE.on('pageerror', (error) => ERRORS.push(String(error)));
    PAGE.on('console', (message) => {
        if (message.type() === 'error') {
            ERRORS.push(message.text());
        }
    });
    await CONTEXT.route('**/*', (route) => {
        const URL_LOCAL = route.request().url();
        if (URL_LOCAL.startsWith(ORIGIN + '/')) {
            return route.continue();
        }
        if (MODULES.has(URL_LOCAL)) {
            return route.fulfill({
                body: MODULES.get(URL_LOCAL),
                contentType: 'text/javascript',
                headers: { 'access-control-allow-origin': '*' },
            });
        }
        ERRORS.push('Unexpected network request: ' + URL_LOCAL);
        return route.abort();
    });
    for (let tier = 1; tier <= 6; tier++) {
        await PAGE.goto(`${ORIGIN}/index.html?help=walnut-t${tier}`);
        await PAGE.waitForFunction(() => globalThis.BUDMORI?.renderer?.vectorPlayers.size > 0);
        await PAGE.evaluate(() => {
            const RENDERER = BUDMORI.renderer,
                RENDER = RENDERER.render,
                WORLD = BUDMORI.sim,
                UNIT = WORLD.units[0],
                SESSION = BUDMORI.runtime,
                PRESENT = SESSION.presentation,
                PULSE = SESSION.pulse,
                CLOCK = {
                    last: null,
                    current: null,
                    maxDelta: 0,
                    advance(now) {
                        if (this.last === null) {
                            this.current = now;
                        } else if (now !== this.last) {
                            const DELTA = Math.min(25, Math.max(0, now - this.last));
                            this.current += DELTA;
                            this.maxDelta = Math.max(this.maxDelta, DELTA);
                        }
                        this.last = now;
                        return this.current;
                    },
                };
            SESSION.__walnutObservationClock = CLOCK;
            SESSION.pulse = function (now) {
                return PULSE.call(this, CLOCK.advance(now));
            };
            SESSION.presentation = function (now) {
                const INPUT = CLOCK.advance(now);
                globalThis.__walnutInputClock = INPUT;
                return PRESENT.call(this, INPUT);
            };
            SESSION.loop.resetTiming();
            globalThis.__walnutMotion = {
                stages: {},
                guardHammer: false,
                captures: 0,
                ready: false,
                actionId: null,
                request: { phase: 'windup' },
                trace: [],
                initialHp: WORLD.boss.hp,
            };
            RENDERER.render = function (...args) {
                const RESULT = RENDER.apply(this, args),
                    STATE = globalThis.__walnutMotion,
                    DISPLAY = BUDMORI.runtime.presentationView?.units.find((unit) => unit.id === UNIT.id),
                    PLAYER = this.vectorPlayers.get(UNIT.id),
                    A = DISPLAY?.ability,
                    RECORD = UNIT.ability.action?.walnutAttack;
                if (!PLAYER || !A?.walnutForm || !RECORD || RECORD.id !== A.walnutActionId) {
                    return RESULT;
                }
                if (STATE.actionId === null && A.phase === 'windup' && DISPLAY.walnutGuarding) {
                    STATE.actionId = RECORD.id;
                    STATE.expected = RECORD.shots.map((shot) => shot.stage);
                    STATE.form = RECORD.form;
                    STATE.initialHp = WORLD.boss.hp;
                }
                if (STATE.actionId !== RECORD.id || STATE.ready || !STATE.request) {
                    return RESULT;
                }
                const HAMMER = PLAYER.getPartPose('hammer'),
                    REQUEST = STATE.request,
                    MATCH =
                        A.phase === REQUEST.phase &&
                        (A.phase !== 'active' || (A.walnutSlot === REQUEST.slot && A.walnutStageProgress >= 0.3));
                if (DISPLAY.walnutGuarding && A.phase === 'active' && HAMMER.visible) {
                    STATE.guardHammer = true;
                }
                if (MATCH) {
                    const SAMPLE = {
                        phase: A.phase,
                        stage: A.walnutStage,
                        slot: A.walnutSlot,
                        progress: A.walnutStageProgress,
                        clip: PLAYER.currentClip,
                        time: PLAYER.currentTimeMs,
                        pose: { x: HAMMER.x, y: HAMMER.y, rotation: HAMMER.rotation },
                        hammerVisible: HAMMER.visible,
                        recordId: RECORD.id,
                        displayId: A.walnutActionId,
                        point: [A.walnutPointX, A.walnutPointY],
                        actualPoint: [RECORD.point.x, RECORD.point.y],
                        impactLife: A.walnutImpactLife,
                    };
                    STATE.trace.push(SAMPLE);
                    STATE.units = WORLD.units.length;
                    STATE.projectiles = WORLD.projectiles.length;
                    STATE.bossHp = WORLD.boss.hp;
                    STATE.hits = WORLD.notices
                        .filter((notice) => notice.kind === 'boss-hit' && notice.attackId === RECORD.id)
                        .map((notice) => ({ sequence: notice.sequence, slot: notice.strikeIndex }));
                    STATE.ready = true;
                    STATE.tick = WORLD.simulationTick;
                    BUDMORI.runtime.paused = true;
                    BUDMORI.runtime.pauseStartedAt = globalThis.__walnutInputClock;
                }
                return RESULT;
            };
        });
        let state;
        for (let capture = 0; ; capture++) {
            await PAGE.waitForFunction(() => globalThis.__walnutMotion.ready, null, { timeout: 30000 });
            state = await PAGE.evaluate(() => structuredClone(globalThis.__walnutMotion));
            const SAMPLE = state.trace.at(-1);
            await PAGE.screenshot({ path: path.join(OUTPUT, `t${tier}-${SAMPLE.phase}-${SAMPLE.slot}.png`) });
            assert.equal(await PAGE.evaluate(() => BUDMORI.sim.simulationTick), state.tick);
            if (SAMPLE.phase === 'recover') {
                break;
            }
            const NEXT = capture < state.expected.length ? { phase: 'active', slot: capture } : { phase: 'recover' };
            await PAGE.evaluate((request) => {
                const SESSION = BUDMORI.runtime,
                    DURATION = SESSION.pausedDurationMs + globalThis.__walnutInputClock - SESSION.pauseStartedAt;
                globalThis.__walnutMotion.request = request;
                globalThis.__walnutMotion.ready = false;
                SESSION.paused = false;
                SESSION.pausedDurationMs = DURATION;
                SESSION.loop.resetTiming();
            }, NEXT);
        }
        assert.ok(await PAGE.evaluate(() => BUDMORI.runtime.__walnutObservationClock.maxDelta <= 25));
        REPORT.push(state);
        assert.equal(state.form, tier);
        assert.equal(state.units, 1);
        assert.equal(state.projectiles, 0);
        assert.ok(state.guardHammer, 'guard preserves the attacking hammer');
        assert.ok(state.bossHp < state.initialHp);
        assert.deepEqual(
            state.hits.map((hit) => hit.slot),
            state.expected.map((_stage, index) => index),
        );
        assert.equal(new Set(state.hits.map((hit) => hit.sequence)).size, state.expected.length);
        assert.equal(
            new Set(state.trace.map((sample) => sample.recordId)).size,
            1,
            'windup, every slot and recovery belong to one action',
        );
        assert.deepEqual(
            state.trace.filter((sample) => sample.phase === 'active').map((sample) => sample.stage),
            state.expected,
        );
        for (const SAMPLE of state.trace) {
            assert.ok(SAMPLE.hammerVisible);
            assert.equal(SAMPLE.recordId, SAMPLE.displayId);
            assert.deepEqual(SAMPLE.point, SAMPLE.actualPoint);
            if (SAMPLE.phase === 'active') {
                assert.ok(Math.abs(SAMPLE.time - SAMPLE.progress * 1000) < 1e-5);
                assert.match(SAMPLE.clip, /fire-walnut-/);
            }
        }
        // Interrupt the real action while paused, then resume the ordinary clock.
        await PAGE.evaluate(() => {
            const SESSION = BUDMORI.runtime,
                DURATION = SESSION.pausedDurationMs + globalThis.__walnutInputClock - SESSION.pauseStartedAt;
            BUDMORI.sim.units[0].ability.interrupt();
            BUDMORI.sim.units[0].stun = 0.5;
            SESSION.paused = false;
            SESSION.pausedDurationMs = DURATION;
            SESSION.loop.resetTiming();
        });
        await PAGE.waitForFunction(() => !BUDMORI.runtime.presentationView.units[0].ability.walnutForm, null, {
            timeout: 5000,
        });
        assert.equal(
            await PAGE.evaluate(() => BUDMORI.runtime.presentationView.units[0].ability.walnutImpactLife),
            0,
            'interruption clears pending contact presentation',
        );
    }
    // Main-world continuity uses the real browser Back/Home route and Continue
    // control. Combat fixtures choose a scenario, never inject hits or poses.
    await PAGE.goto(`${ORIGIN}/index.html`);
    await PAGE.waitForFunction(() => globalThis.BUDMORI);
    await (VIEWPORT === 'landscape' ? PAGE.locator('#newGame').tap() : PAGE.locator('#newGame').click());
    await PAGE.evaluate(async () => {
        const { helpSceneById: HELP_SCENE_BY_ID } = await import('./src/help-scenes.js'),
            WORLD = BUDMORI.sim;
        HELP_SCENE_BY_ID('walnut-t6').setup(WORLD);
        globalThis.__walnutMain = { id: null, hits: [], complete: false, incoming: [], rawHits: [], reserved: null };
        WORLD.onNotice.on((notice) => {
            const STATE = globalThis.__walnutMain,
                UNIT = WORLD.units[0],
                RECORD = UNIT.ability.action?.walnutAttack;
            if (notice.kind !== 'boss-hit' || !RECORD || notice.attackId !== RECORD.id) {
                return;
            }
            if (!STATE.complete) {
                if (STATE.id === null && notice.strikeIndex === 0) {
                    STATE.id = RECORD.id;
                }
                if (STATE.id !== RECORD.id) {
                    return;
                }
                STATE.hits.push(structuredClone(notice));
                if (STATE.hits.length === 1 || STATE.hits.length === 4) {
                    STATE.complete = STATE.hits.length === 4;
                    BUDMORI.runtime.paused = true;
                }
            } else if (RECORD.rawBudget > 0) {
                if (notice.strikeIndex === 0 && STATE.reserved?.id !== RECORD.id) {
                    STATE.reserved = structuredClone(RECORD);
                    STATE.rawHits = [];
                }
                if (STATE.reserved?.id === RECORD.id) {
                    STATE.rawHits.push(structuredClone(notice));
                }
                if (STATE.rawHits.length === 4) {
                    BUDMORI.runtime.paused = true;
                }
            }
        });
    });
    await PAGE.waitForFunction(() => globalThis.__walnutMain.hits.length === 1 && BUDMORI.runtime.paused);
    const CHECKPOINT = await PAGE.evaluate(() => {
        globalThis.__walnutCheckpoint = { world: BUDMORI.sim, action: BUDMORI.sim.units[0].ability.action };
        return { tick: BUDMORI.sim.simulationTick, hp: BUDMORI.sim.boss.hp };
    });
    await PAGE.goBack();
    await PAGE.locator('#startScreen').waitFor({ state: 'visible' });
    assert.equal(await PAGE.evaluate(() => BUDMORI.sim.boss.hp), CHECKPOINT.hp);
    await (VIEWPORT === 'landscape' ? PAGE.locator('#continueGame').tap() : PAGE.locator('#continueGame').click());
    await PAGE.waitForFunction(() => globalThis.__walnutMain.complete && BUDMORI.runtime.paused);
    const CONTINUITY = await PAGE.evaluate(() => ({
        boundedClock: !!BUDMORI.runtime.__walnutObservationClock,
        sameWorld: BUDMORI.sim === globalThis.__walnutCheckpoint.world,
        sameAction: BUDMORI.sim.units[0].ability.action === globalThis.__walnutCheckpoint.action,
        hits: structuredClone(globalThis.__walnutMain.hits),
    }));
    assert.ok(CONTINUITY.sameWorld && CONTINUITY.sameAction);
    assert.equal(CONTINUITY.boundedClock, false, 'main Home/Continue and RAW use the normal production clock');
    assert.deepEqual(
        CONTINUITY.hits.map((notice) => notice.strikeIndex),
        [0, 1, 2, 3],
    );
    assert.equal(new Set(CONTINUITY.hits.map((notice) => notice.sequence)).size, 4);
    REPORT.push({ kind: 'main-home-continue', ...CONTINUITY });
    await PAGE.screenshot({ path: path.join(OUTPUT, 'main-home-continue.png') });
    // Enable the actual boss AI. Observe and forward the existing pre-armor
    // receiver unchanged; only real boss collisions can grow the RAW ledger.
    await PAGE.evaluate(() => {
        const WORLD = BUDMORI.sim,
            UNIT = WORLD.units[0],
            RECEIVE = UNIT.ability.receiveRawDamage;
        UNIT.ability.receiveRawDamage = function (world, rawDamage, ...rest) {
            const BEFORE = UNIT.walnutStoredRawDamage,
                RESULT = RECEIVE.call(this, world, rawDamage, ...rest),
                AFTER = UNIT.walnutStoredRawDamage;
            if (AFTER > BEFORE) {
                globalThis.__walnutMain.incoming.push({
                    tick: world.simulationTick,
                    rawDamage,
                    before: BEFORE,
                    after: AFTER,
                    sourceBoss: rest[0] === world.boss,
                });
            }
            return RESULT;
        };
        WORLD.configureBossStage(1, 0);
        Object.assign(WORLD.boss, { z: 0, hp: 1e10, maxHp: 1e10, stun: 0 });
        BUDMORI.runtime.paused = false;
    });
    await PAGE.waitForFunction(() => globalThis.__walnutMain.rawHits.length === 4 && BUDMORI.runtime.paused, null, {
        timeout: 90000,
    });
    const RAW = await PAGE.evaluate(() => structuredClone(globalThis.__walnutMain));
    assert.ok(RAW.incoming.length > 0);
    assert.ok(
        RAW.incoming.every((hit) => hit.sourceBoss && Math.abs(hit.after - hit.before - hit.rawDamage) < 1e-8),
        'allocated pre-armor boss RAW enters storage exactly once',
    );
    assert.ok(RAW.reserved.storedRaw > 0);
    assert.equal(
        RAW.reserved.rawBudget,
        Math.min(RAW.reserved.storedRaw * (1 + 0.25 * RAW.reserved.ranks.conversion), RAW.reserved.attackPower * 3),
    );
    assert.deepEqual(
        RAW.rawHits.map((notice) => notice.strikeIndex),
        [0, 1, 2, 3],
    );
    REPORT.push({ kind: 'natural-boss-raw', incoming: RAW.incoming, reserved: RAW.reserved, hits: RAW.rawHits });
    await PAGE.screenshot({ path: path.join(OUTPUT, 'main-natural-raw.png') });
    assert.deepEqual(ERRORS, []);
    console.log(`PASS walnut six-form actual native motion (${VIEWPORT})`);
} finally {
    fs.writeFileSync(path.join(OUTPUT, 'report.json'), JSON.stringify({ forms: REPORT, errors: ERRORS }, null, 2));
    await browser?.close();
    await new Promise((resolve) => SERVER.close(resolve));
}
