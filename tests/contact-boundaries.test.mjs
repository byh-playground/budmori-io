// Bounded supplemental native regression, independent of the paired timing cases.
// node tests/contact-boundaries.test.mjs <immutable-baseline-root> 250 wall
// node tests/contact-boundaries.test.mjs <immutable-baseline-root> 500 corner
// Three native bosses in the expanded tower arena; engage for 20 ticks, then retreat.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { captureContactInputs, verifyContactInputs } from './contact-test-provenance.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url)),
    BASE = path.resolve(process.argv[2] || ''),
    COUNT = Number(process.argv[3] || 250),
    LAYOUT = process.argv[4] || 'wall',
    TICKS = 80,
    STARTED = Date.now(),
    OUTPUT = new URL('./output/contact-performance/', import.meta.url),
    HASH = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
assert.notEqual(BASE, path.resolve(ROOT), 'baseline must remain an independent checkout');
assert.ok([100, 250, 500].includes(COUNT));
assert.ok(['wall', 'corner'].includes(LAYOUT));

const READ_INPUTS = captureContactInputs(BASE, ROOT, import.meta.url);
globalThis.BloomGamekitDeterministic = await import('../vendor/upstream/deterministic.js');
globalThis.BloomGamekitWorkScheduler = await import('../vendor/upstream/work-scheduler.js');
async function load(root) {
    const MODULE = (name) => import(pathToFileURL(path.join(root, 'src', name)).href);
    return {
        ...(await MODULE('model/farm-model.js')),
        ...(await MODULE('model/farm-state.js')),
        ...(await MODULE('model/player-progression.js')),
    };
}
const APIS = { base: await load(BASE), candidate: await load(ROOT) },
    REPORT = {
        status: 'running',
        startedAt: new Date(STARTED).toISOString(),
        environment: {
            node: process.version,
            platform: process.platform,
            release: os.release(),
            arch: process.arch,
            cpu: os.cpus()[0]?.model,
        },
        command: [process.execPath, ...process.argv.slice(1)],
        readInputs: READ_INPUTS,
        protocol: {
            seed: 731,
            tps: 20,
            count: COUNT,
            reserves: COUNT,
            layout: LAYOUT,
            floor: 46,
            bosses: 3,
            ticks: TICKS,
            input: 'engage at tick 0; retreat immediately before tick 21',
            scope: 'Native model correctness and contact order, not performance or FPS.',
        },
        results: {},
    };
fs.mkdirSync(OUTPUT, { recursive: true });

function fixture(api) {
    const WORLD = new api.Garden(731);
    WORLD.resetUnits();
    WORLD.playerProgression.overallXp = api.overallXpForLevel(Math.max(1, (COUNT - 100) / 10 + 1));
    WORLD.playerProgression.towerBest = 100;
    WORLD.setWorkBasisPoints(0);
    for (let index = 0; index < COUNT * 2; index++) {
        const UNIT = WORLD.spawn(index % 9, 1, 0, 0);
        UNIT.growthElapsed = UNIT.growthDuration;
        UNIT.dropLanded = true;
    }
    assert.ok(WORLD.startTower(46));
    assert.ok(WORLD.finishMarch());
    while (WORLD.bosses.length < 3) {
        assert.ok(WORLD.joinNextBoss());
    }
    const ARENA = api.ArenaGeometry.arena(WORLD);
    assert.ok(ARENA.radiusX > api.CONFIG.farm.arena.radiusX);
    assert.ok(ARENA.radiusY > api.CONFIG.farm.arena.radiusY);
    for (let index = 0; index < WORLD.bosses.length; index++) {
        const BOSS = WORLD.bosses[index];
        BOSS.setBaseStats({ maxHp: 1e9, attackPower: 0.01 });
        BOSS.setHealth(BOSS.maxHp);
        BOSS.x = -ARENA.radiusX + BOSS.radius + (LAYOUT === 'corner' ? 4 + index : 3);
        BOSS.y = LAYOUT === 'corner' ? -ARENA.radiusY + BOSS.radius + 3 + index * 1.8 : -8 + index * 8;
        BOSS.z = 0;
        BOSS.dropLanded = true;
    }
    for (let index = 0; index < COUNT; index++) {
        const X = -ARENA.radiusX + 0.6 + (index % 7) * 0.3,
            Y =
                LAYOUT === 'corner'
                    ? -ARENA.radiusY + 0.6 + (Math.floor(index / 7) % 18) * 0.3
                    : -10 + (Math.floor(index / 7) % 36) * 0.55;
        assert.ok(WORLD._deployReservedUnit(index % 9, X, Y));
    }
    for (const UNIT of WORLD.units) {
        UNIT.z = 0;
        UNIT.dropLanded = true;
        // Outward motion exercises the actual wall clamp on the first native step.
        UNIT.vx = -2;
        UNIT.vy = LAYOUT === 'corner' ? -2 : 0;
    }
    WORLD.farmBossEvent.phase = 'fighting';
    assert.ok(WORLD.setBattleCommand('engage'));
    assert.equal(WORLD.fieldFighterCount, COUNT);
    assert.ok(WORLD.units.some((unit) => Math.abs(unit.x) > api.CONFIG.farm.arena.radiusX));
    return WORLD;
}

// Read-only witnesses distinguish raw AABB candidates from contributing pairs.
// Accepted order is compared exactly; removed zero-contribution candidates are
// expected to differ. No candidate is inserted, removed or reordered by this probe.
function observeContacts(world) {
    const RESOLVE = world.resolveFarmContacts,
        SOLVE = world.solveContactSeparations,
        COLLECT = world._collectContactOrders,
        BOUND = world.boundBody,
        LEGACY = world.battleContacts,
        TRACE = createHash('sha256'),
        COUNTS = {
            farmPasses: 0,
            solverPasses: 0,
            legacyBattlePasses: 0,
            queries: 0,
            rawCandidates: 0,
            sortedCandidates: 0,
            contributingPairs: 0,
            impulsePairs: 0,
            newHardContactsAfterFirstPass: 0,
            wallClamps: 0,
        };
    let units = [],
        bodies = [],
        stage = 'idle',
        iteration = -1,
        seenHardPairs = new Set();
    world.resolveFarmContacts = function (actors, ...args) {
        units = actors;
        bodies = actors.map((unit) => ({
            radius: unit.radius,
            height: unit.height,
            inverseMass:
                unit.fixed === true
                    ? 0
                    : (Number.isFinite(unit.mass) ? unit.mass : 1) > 0
                      ? 1 / (Number.isFinite(unit.mass) ? unit.mass : 1)
                      : 0,
        }));
        stage = 'impulse';
        COUNTS.farmPasses++;
        try {
            return RESOLVE.call(this, actors, ...args);
        } finally {
            stage = 'idle';
        }
    };
    world.solveContactSeparations = function (...args) {
        stage = 'solver';
        iteration = -1;
        seenHardPairs = new Set();
        COUNTS.solverPasses++;
        return SOLVE.apply(this, args);
    };
    world._collectContactOrders = function (...args) {
        const RESULT = COLLECT.apply(this, args),
            UNIT = args[0],
            I = this._unitStepOrder.get(UNIT),
            ACCEPTED = [];
        assert.notEqual(stage, 'idle', 'tower contacts must use the actual farm contact path');
        if (stage === 'solver' && I === 0) {
            iteration++;
        }
        COUNTS.queries++;
        COUNTS.rawCandidates += this._contactQuery.length;
        COUNTS.sortedCandidates += RESULT.length;
        for (let index = 0; index < RESULT.length; index++) {
            const J = RESULT[index],
                OTHER = units[J],
                BODY_A = bodies[I],
                BODY_B = bodies[J];
            assert.ok(index === 0 || RESULT[index - 1] < J, 'native pair order remains strictly increasing');
            if (
                this.isMergeTaskMaterial(UNIT) ||
                this.isMergeTaskMaterial(OTHER) ||
                UNIT.z > OTHER.z + BODY_B.height ||
                OTHER.z > UNIT.z + BODY_A.height
            ) {
                continue;
            }
            const RADIUS = BODY_A.radius + BODY_B.radius,
                DISTANCE = Math.hypot(OTHER.x - UNIT.x, OTHER.y - UNIT.y),
                HARD = DISTANCE < RADIUS,
                SOFT =
                    stage === 'solver' &&
                    UNIT.z < 0.1 &&
                    OTHER.z < 0.1 &&
                    UNIT.ability.phase === 'idle' &&
                    OTHER.ability.phase === 'idle' &&
                    DISTANCE < RADIUS + 0.22;
            if ((!HARD && !SOFT) || (stage === 'solver' && BODY_A.inverseMass + BODY_B.inverseMass <= 0)) {
                continue;
            }
            ACCEPTED.push(J);
            COUNTS.contributingPairs++;
            if (stage === 'impulse') {
                COUNTS.impulsePairs++;
            } else if (HARD) {
                const KEY = `${I}:${J}`;
                if (iteration > 0 && !seenHardPairs.has(KEY)) {
                    COUNTS.newHardContactsAfterFirstPass++;
                }
                seenHardPairs.add(KEY);
            }
        }
        TRACE.update(JSON.stringify([this.simulationTick, stage, iteration, I, ACCEPTED]));
        return RESULT;
    };
    world.boundBody = function (body, ...args) {
        const X = body.x,
            Y = body.y,
            RESULT = BOUND.call(this, body, ...args);
        if (X !== body.x || Y !== body.y) {
            COUNTS.wallClamps++;
        }
        return RESULT;
    };
    world.battleContacts = function (...args) {
        COUNTS.legacyBattlePasses++;
        return LEGACY.apply(this, args);
    };
    return { counts: COUNTS, finish: () => TRACE.digest('hex') };
}

function run(api) {
    const WORLD = fixture(api),
        INITIAL = api.snapshot(WORLD),
        OBSERVER = observeContacts(WORLD),
        NOTICES = [],
        CHECKPOINTS = [],
        OFF = WORLD.onNotice.on((notice) => NOTICES.push(structuredClone(notice)));
    for (let tick = 0; tick < TICKS; tick++) {
        assert.ok(Date.now() - STARTED < 170000, 'one bounded case must finish below three minutes');
        if (tick === 20) {
            assert.ok(WORLD.setBattleCommand('retreat'));
        }
        WORLD.step(0.05);
        CHECKPOINTS.push(HASH(api.snapshot(WORLD)));
    }
    OFF();
    assert.equal(WORLD.battleCommand, 'retreat');
    assert.equal(WORLD.bosses.length, 3);
    assert.ok(WORLD.bosses.every((boss) => boss.active && boss.hp > 0));
    assert.equal(OBSERVER.counts.farmPasses, TICKS);
    assert.equal(OBSERVER.counts.solverPasses, TICKS);
    assert.equal(OBSERVER.counts.legacyBattlePasses, 0);
    assert.ok(OBSERVER.counts.wallClamps > 0, 'the expanded arena wall must actually clamp moving bodies');
    assert.ok(OBSERVER.counts.impulsePairs > 0, 'the native impulse path must encounter real overlaps');
    assert.ok(OBSERVER.counts.newHardContactsAfterFirstPass > 0, 'later Jacobi passes must discover new hard contacts');
    return {
        initial: INITIAL,
        final: api.snapshot(WORLD),
        evidence: {
            initialHash: HASH(INITIAL),
            finalHash: HASH(api.snapshot(WORLD)),
            checkpoints: CHECKPOINTS,
            noticesHash: HASH(NOTICES),
            contributingOrderHash: OBSERVER.finish(),
            launches: NOTICES.filter((notice) => notice.kind === 'attack-launch').length,
            hits: NOTICES.filter((notice) => notice.kind === 'boss-hit').length,
            metrics: WORLD.metrics,
        },
        counts: OBSERVER.counts,
    };
}

try {
    const BASE_RESULT = run(APIS.base),
        CANDIDATE = run(APIS.candidate);
    assert.deepEqual(CANDIDATE.initial, BASE_RESULT.initial, 'identical input, three native bosses and expanded arena');
    assert.deepEqual(CANDIDATE.final, BASE_RESULT.final, 'all final authoritative values and array order');
    assert.deepEqual(
        CANDIDATE.evidence,
        BASE_RESULT.evidence,
        'every native tick, notices, metrics and contributing pair order',
    );
    for (const KEY of Object.keys(BASE_RESULT.counts)) {
        if (KEY !== 'sortedCandidates') {
            assert.equal(CANDIDATE.counts[KEY], BASE_RESULT.counts[KEY], KEY);
        }
    }
    assert.ok(CANDIDATE.counts.sortedCandidates < BASE_RESULT.counts.sortedCandidates);
    verifyContactInputs(READ_INPUTS, BASE, ROOT, import.meta.url);
    REPORT.results = { evidence: CANDIDATE.evidence, base: BASE_RESULT.counts, candidate: CANDIDATE.counts };
    REPORT.status = 'passed';
} catch (error) {
    REPORT.status = 'failed';
    REPORT.error = String(error.stack || error);
    throw error;
} finally {
    REPORT.elapsedMs = Date.now() - STARTED;
    fs.writeFileSync(new URL(`${COUNT}-${LAYOUT}-boundaries.json`, OUTPUT), JSON.stringify(REPORT, null, 2));
}
console.log(JSON.stringify(REPORT));
