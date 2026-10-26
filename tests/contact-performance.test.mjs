// Paired native model verification. Run one bounded case per process:
// node tests/contact-performance.test.mjs <immutable-baseline-root> 100|250|500 engage|scatter
// Timing excludes snapshot serialization and counting instrumentation. It is model CPU, not FPS.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url)),
    BASE = path.resolve(process.argv[2] || ''),
    COUNT = Number(process.argv[3] || 100),
    COMMAND = process.argv[4] || 'engage',
    OUTPUT = new URL('./output/contact-performance/', import.meta.url),
    ROUNDS = Number(process.env.CONTACT_ROUNDS || 3),
    TICKS = 240,
    STEP = 0.05;
assert.notEqual(BASE, path.resolve(ROOT), 'use an independent, unchanged baseline checkout');
assert.ok([100, 250, 500].includes(COUNT));
assert.ok(['engage', 'scatter'].includes(COMMAND));
globalThis.BloomGamekitDeterministic = await import('../vendor/upstream/deterministic.js');
globalThis.BloomGamekitWorkScheduler = await import('../vendor/upstream/work-scheduler.js');
async function load(root) {
    const MODULE = (file) => import(pathToFileURL(path.join(root, 'src', file)).href);
    return {
        ...(await MODULE('farm-model.js')),
        ...(await MODULE('farm-state.js')),
        ...(await MODULE('player-progression.js')),
    };
}
const API = { base: await load(BASE), candidate: await load(ROOT) },
    HASH = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex'),
    REPORT = {
        status: 'running',
        environment: { runtime: process.version, platform: process.platform, cpu: os.cpus()[0]?.model },
        protocol: {
            seed: 731,
            tps: 20,
            frontline: COUNT,
            reserves: COUNT,
            command: COMMAND,
            rounds: ROUNDS,
            ticks: TICKS,
            dense: [0, 39],
            stable: [120, 239],
            limitation:
                'Node native model CPU only; no browser, render, GPU, physical mobile or FPS claim. Durable low-damage boss keeps the benchmark encounter running.',
        },
        files: Object.fromEntries(
            Object.entries({ base: BASE, candidate: ROOT }).map(([key, root]) => [
                key,
                createHash('sha256')
                    .update(fs.readFileSync(path.join(root, 'src/farm-model.js')))
                    .digest('hex'),
            ]),
        ),
        rounds: [],
        checkpoints: [],
        instrumentation: {},
    };
fs.mkdirSync(OUTPUT, { recursive: true });
function save() {
    fs.writeFileSync(new URL(`${COUNT}-${COMMAND}.json`, OUTPUT), JSON.stringify(REPORT, null, 2));
}
function fixture(api, count = COUNT) {
    const WORLD = new api.Garden(731);
    WORLD.resetUnits();
    WORLD.playerProgression.overallXp = api.overallXpForLevel(Math.max(1, (count - 100) / 10 + 1));
    WORLD.playerProgression.towerBest = 100;
    WORLD.setWorkBasisPoints(0);
    for (let index = 0; index < count * 2; index++) {
        const UNIT = WORLD.spawn(index % 9, 1, 0, 0);
        UNIT.growthElapsed = UNIT.growthDuration;
        UNIT.dropLanded = true;
    }
    assert.ok(WORLD.startTower(1));
    assert.ok(WORLD.finishMarch());
    for (const BOSS of WORLD.bosses) {
        BOSS.setBaseStats({ maxHp: 1e9, attackPower: 0.01 });
        BOSS.setHealth(BOSS.maxHp);
        BOSS.z = 0;
        BOSS.dropLanded = true;
    }
    for (let index = 0; index < count; index++) {
        const ANGLE = index * 2.399963229728653,
            BOSS = WORLD.boss,
            RADIUS = BOSS.radius + 1 + Math.sqrt(index) * 0.2;
        assert.ok(
            WORLD._deployReservedUnit(index % 9, BOSS.x + Math.cos(ANGLE) * RADIUS, BOSS.y + Math.sin(ANGLE) * RADIUS),
        );
    }
    for (const UNIT of WORLD.units) {
        UNIT.z = 0;
        UNIT.dropLanded = true;
    }
    WORLD.farmBossEvent.phase = 'fighting';
    WORLD.setBattleCommand(COMMAND);
    assert.equal(WORLD.fieldFighterCount, count);
    return WORLD;
}
function summarize(values) {
    const SORTED = [...values].sort((a, b) => a - b),
        QUANTILE = (p) => SORTED[Math.ceil(SORTED.length * p) - 1];
    return {
        count: values.length,
        meanMs: values.reduce((a, b) => a + b, 0) / values.length,
        medianMs: QUANTILE(0.5),
        p95Ms: QUANTILE(0.95),
        p99Ms: QUANTILE(0.99),
    };
}
function observe(world) {
    const NOTICES = [],
        TURNS = [],
        OFF = world.onNotice.on((notice) => NOTICES.push(structuredClone(notice)));
    return {
        read() {
            TURNS.push([...world._armyAttackTurns].map((unit) => unit.id));
        },
        finish() {
            OFF();
            return {
                noticeHash: HASH(NOTICES),
                rotationHash: HASH(TURNS),
                launches: NOTICES.filter((notice) => notice.kind === 'attack-launch').length,
                hits: NOTICES.filter((notice) => notice.kind === 'boss-hit').length,
                damage: NOTICES.filter((notice) => notice.kind === 'boss-hit').reduce(
                    (sum, notice) => sum + (notice.damage || 0),
                    0,
                ),
            };
        },
    };
}
function instrument(world, api) {
    const COUNTS = { queries: 0, gridCandidates: 0, orderedCandidates: 0, radiusReads: 0, heightReads: 0, hypot: 0 },
        COLLECT = world._collectContactOrders,
        HYPOT = Math.hypot,
        DESCRIPTORS = new Map();
    world._collectContactOrders = function (...args) {
        const RESULT = COLLECT.apply(this, args);
        COUNTS.queries++;
        COUNTS.gridCandidates += this._contactQuery.length;
        COUNTS.orderedCandidates += RESULT.length;
        return RESULT;
    };
    for (const KEY of ['radius', 'height']) {
        const DESCRIPTOR = Object.getOwnPropertyDescriptor(api.Unit.prototype, KEY);
        DESCRIPTORS.set(KEY, DESCRIPTOR);
        Object.defineProperty(api.Unit.prototype, KEY, {
            ...DESCRIPTOR,
            get() {
                COUNTS[`${KEY}Reads`]++;
                return DESCRIPTOR.get.call(this);
            },
        });
    }
    Math.hypot = (...args) => {
        COUNTS.hypot++;
        return HYPOT(...args);
    };
    return {
        counts: COUNTS,
        restore() {
            world._collectContactOrders = COLLECT;
            Math.hypot = HYPOT;
            for (const [KEY, DESCRIPTOR] of DESCRIPTORS) {
                Object.defineProperty(api.Unit.prototype, KEY, DESCRIPTOR);
            }
        },
    };
}
function contactBoundaryCases() {
    const RECORDS = [];
    for (const PLACEMENT of [
        'tangent',
        'inside',
        'outside',
        'vertical',
        'same-point',
        'later-contact',
        'giant',
        'fixed',
    ]) {
        const VALUES = {};
        for (const [VARIANT, API_LOCAL] of Object.entries(API)) {
            const WORLD = new API_LOCAL.Garden(731);
            WORLD.resetUnits();
            const A = WORLD.spawn(0, 1, 0, 0),
                B = WORLD.spawn(2, 6, 0, 0),
                C = WORLD.spawn(7, 2, 0, 0);
            for (const UNIT of WORLD.units) {
                UNIT.growthElapsed = UNIT.growthDuration;
                UNIT.z = 0;
                UNIT.dropLanded = true;
            }
            if (PLACEMENT === 'giant') {
                B.giantUntil = 100;
                B.giantSizeMultiplier = 3;
            }
            const RADIUS = A.radius + B.radius;
            B.x =
                PLACEMENT === 'inside'
                    ? RADIUS - Number.EPSILON
                    : PLACEMENT === 'outside'
                      ? RADIUS + Number.EPSILON
                      : RADIUS;
            C.x = 10;
            A.vx = 3;
            B.vx = -3;
            if (PLACEMENT === 'vertical') {
                B.z = A.height + Number.EPSILON;
            }
            if (PLACEMENT === 'same-point') {
                B.x = 0;
            }
            if (PLACEMENT === 'fixed') {
                A.fixed = true;
                B.x = RADIUS / 2;
            }
            if (PLACEMENT === 'later-contact') {
                B.x = 0.15;
                C.x = B.x + B.radius + C.radius + 0.01;
            }
            WORLD._rebuildUnitSpatialIndex(WORLD.units);
            if (PLACEMENT === 'later-contact') {
                const DISTANCES = [],
                    COLLECT = WORLD._collectContactOrders,
                    REACH = B.radius + C.radius;
                WORLD._collectContactOrders = function (...args) {
                    if (args[0] === B) {
                        DISTANCES.push(Math.hypot(C.x - B.x, C.y - B.y));
                    }
                    return COLLECT.apply(this, args);
                };
                WORLD.solveContactSeparations(WORLD.units, STEP);
                assert.ok(
                    DISTANCES[0] > REACH && DISTANCES.slice(1).some((distance) => distance < REACH),
                    'a later Jacobi pass must discover the newly created hard contact',
                );
            } else {
                WORLD.resolveFarmContacts(WORLD.units, STEP);
            }
            VALUES[VARIANT] = HASH(API_LOCAL.snapshot(WORLD));
        }
        assert.equal(VALUES.candidate, VALUES.base, PLACEMENT);
        RECORDS.push({ placement: PLACEMENT, hash: VALUES.base });
    }
    return RECORDS;
}
try {
    REPORT.boundaries = contactBoundaryCases();
    const INITIAL = {};
    for (const [VARIANT, API_LOCAL] of Object.entries(API)) {
        INITIAL[VARIANT] = API_LOCAL.snapshot(fixture(API_LOCAL));
    }
    assert.equal(HASH(INITIAL.base), HASH(INITIAL.candidate), 'identical initial authoritative snapshot');
    REPORT.initialHash = HASH(INITIAL.base);
    for (let round = 0; round < ROUNDS; round++) {
        const RESULT = {},
            ORDER = round % 2 ? ['candidate', 'base'] : ['base', 'candidate'];
        for (const VARIANT of ORDER) {
            const API_LOCAL = API[VARIANT],
                WORLD = API_LOCAL.restore(INITIAL[VARIANT]),
                OBSERVER = observe(WORLD),
                TIMES = [],
                CHECKPOINTS = [];
            for (let tick = 0; tick < TICKS; tick++) {
                const START = performance.now();
                WORLD.step(STEP);
                TIMES.push(performance.now() - START);
                OBSERVER.read();
                if (tick % 20 === 19 || tick === TICKS - 1) {
                    CHECKPOINTS.push({ tick: tick + 1, hash: HASH(API_LOCAL.snapshot(WORLD)) });
                }
            }
            RESULT[VARIANT] = {
                dense: summarize(TIMES.slice(0, 40)),
                stable: summarize(TIMES.slice(120)),
                events: OBSERVER.finish(),
                checkpoints: CHECKPOINTS,
                framesMs: TIMES,
            };
            console.log(
                `${COUNT} ${COMMAND} round ${round + 1} ${VARIANT}: stable ${RESULT[VARIANT].stable.medianMs.toFixed(2)} / p95 ${RESULT[VARIANT].stable.p95Ms.toFixed(2)} ms`,
            );
        }
        assert.deepEqual(
            RESULT.candidate.checkpoints,
            RESULT.base.checkpoints,
            'exact native state after every 20 ticks',
        );
        assert.deepEqual(RESULT.candidate.events, RESULT.base.events, 'attack/damage notices and rotation order');
        REPORT.rounds.push({ round, order: ORDER, ...RESULT });
        save();
    }
    for (const [VARIANT, API_LOCAL] of Object.entries(API)) {
        const WORLD = API_LOCAL.restore(INITIAL[VARIANT]),
            COUNTER = instrument(WORLD, API_LOCAL);
        try {
            for (let tick = 0; tick < 40; tick++) {
                WORLD.step(STEP);
            }
        } finally {
            COUNTER.restore();
        }
        REPORT.instrumentation[VARIANT] = COUNTER.counts;
    }
    REPORT.status = 'passed';
    save();
    console.log(
        JSON.stringify({
            status: REPORT.status,
            report: fileURLToPath(new URL(`${COUNT}-${COMMAND}.json`, OUTPUT)),
            instrumentation: REPORT.instrumentation,
        }),
    );
} catch (error) {
    REPORT.status = 'failed';
    REPORT.error = String(error.stack || error);
    save();
    throw error;
}
