// Native, deterministic combat regression; no renderer, middleware or mocked movement.
// Run one bounded case: node tests/scatter-participation.test.mjs 100 (or 500).
// The 100 case also checks late summons, reserve replacement and boss changes.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';

globalThis.BloomGamekitDeterministic = await import('../vendor/upstream/deterministic.js');
globalThis.BloomGamekitWorkScheduler = await import('../vendor/upstream/work-scheduler.js');
const { Garden: GARDEN } = await import('../src/farm-model.js'),
    { snapshot: SNAPSHOT, restore: RESTORE } = await import('../src/farm-state.js'),
    { overallXpForLevel: XP } = await import('../src/player-progression.js'),
    { unitCapabilityComposition: COMPOSITION } = await import('../src/unit-abilities.js'),
    COUNT = Number(process.argv[2] || 100),
    STEP = 0.05,
    SECONDS = 120,
    WINDOW_SECONDS = 20,
    WINDOW_TICKS = WINDOW_SECONDS / STEP,
    OUTPUT = new URL('./output/scatter-participation/', import.meta.url),
    SOURCE_FILES = [
        'farm-model.js',
        'army-scatter.js',
        'farm-snapshot.js',
        'farm-snapshot-validation.js',
        'farm-snapshot-migrations.js',
    ],
    REPORT = {
        status: 'running',
        count: COUNT,
        sourceHash: sourceHash(),
        fixture:
            'Seed 731; mature T1 mixed nine species, equal reserves, durable low-damage native boss; 6s engage warmup.',
        logicalSeconds: SECONDS,
        windowSeconds: WINDOW_SECONDS,
        note: 'Actual native basic attack launches and boss-hit damage; movement is not participation. No FPS or performance claim.',
        windows: [],
    };

assert.ok([100, 500].includes(COUNT), 'Usage: node tests/scatter-participation.test.mjs 100|500');
fs.mkdirSync(OUTPUT, { recursive: true });

function hash(value) {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function sourceHash() {
    return hash(SOURCE_FILES.map((name) => fs.readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8')));
}

function saveReport() {
    fs.writeFileSync(new URL(`${COUNT}.json`, OUTPUT), `${JSON.stringify(REPORT, null, 2)}\n`);
}

function durableBoss(boss) {
    boss.setBaseStats({ maxHp: 1e9, attackPower: 0.01 });
    boss.setHealth(boss.maxHp);
    boss.z = 0;
    boss.dropLanded = true;
}

function makeFixture(count, { reserves = true, bosses = 1 } = {}) {
    const WORLD = new GARDEN(731);
    WORLD.resetUnits();
    WORLD.playerProgression.overallXp = XP(Math.max(1, (count - 100) / 10 + 1));
    WORLD.playerProgression.towerBest = 100;
    WORLD.setWorkBasisPoints(0);
    for (let index = 0; index < count * (reserves ? 2 : 1); index++) {
        const UNIT = WORLD.spawn(index % 9, 1, 0, 0);
        UNIT.growthElapsed = UNIT.growthDuration;
        UNIT.dropLanded = true;
    }
    assert.ok(WORLD.startTower(bosses === 3 ? 46 : 1));
    assert.ok(WORLD.finishMarch());
    while (WORLD.bosses.length < bosses) {
        assert.ok(WORLD.joinNextBoss());
    }
    WORLD.bosses.forEach(durableBoss);
    for (let index = 0; index < count; index++) {
        const ANGLE = index * 2.399963229728653,
            BOSS = WORLD.bosses[index % bosses],
            RADIUS = BOSS.radius + 1 + Math.sqrt(index / bosses) * 0.2;
        assert.ok(
            WORLD._deployReservedUnit(index % 9, BOSS.x + Math.cos(ANGLE) * RADIUS, BOSS.y + Math.sin(ANGLE) * RADIUS),
        );
    }
    for (const UNIT of WORLD.units) {
        UNIT.z = 0;
        UNIT.dropLanded = true;
    }
    WORLD.farmBossEvent.phase = 'fighting';
    stepUntil(WORLD, 6);
    assert.equal(WORLD.fieldFighterCount, count);
    return WORLD;
}

function stepUntil(world, seconds, done = () => false, observe = () => {}) {
    for (let tick = 0; tick < Math.round(seconds / STEP); tick++) {
        world.step(STEP);
        observe();
        if (done()) {
            return (tick + 1) * STEP;
        }
    }
    return seconds;
}

function summarize(records, windowIndex = null) {
    const VALUE = (record, key) =>
        windowIndex === null ? record[key].reduce((sum, value) => sum + value, 0) : record[key][windowIndex];
    return {
        count: records.length,
        withLaunch: records.filter((record) => VALUE(record, 'launches') > 0).length,
        withDamage: records.filter((record) => VALUE(record, 'hits') > 0).length,
        zeroLaunchIds: records.filter((record) => VALUE(record, 'launches') === 0).map((record) => record.id),
        zeroDamageIds: records.filter((record) => VALUE(record, 'hits') === 0).map((record) => record.id),
        totalLaunches: records.reduce((sum, record) => sum + VALUE(record, 'launches'), 0),
        totalDamage: records.reduce((sum, record) => sum + VALUE(record, 'damage'), 0),
    };
}

function checkpointCompatibility(data) {
    const OLD = structuredClone(data);
    for (const UNIT of [...OLD.units, ...OLD.bosses]) {
        delete UNIT.scatterAttackCount;
    }
    const RESTORED = RESTORE(OLD);
    assert.ok(
        [...RESTORED.unitCollection.items, ...RESTORED.bosses].every((unit) => unit.scatterAttackCount === 0),
        'pre-counter checkpoints default to zero',
    );
    for (const VALUE of [-1, 0.5, NaN, Infinity, null, '1', 1e12 + 1]) {
        const INVALID = structuredClone(data);
        INVALID.units[0].scatterAttackCount = VALUE;
        assert.throws(() => RESTORE(INVALID), `invalid player counter ${String(VALUE)} must be rejected`);
    }
    return {
        missingCounterDefaultsToZero: true,
        rejectedCounters: ['-1', '0.5', 'NaN', 'Infinity', 'null', '"1"', '1e12 + 1'],
    };
}

function observeAttackRanges(world) {
    const SEEN = new Set(world.units.map((unit) => unit.ability.action?.id).filter((id) => id != null)),
        RESULT = { basicStartsObserved: 0, violations: [] };
    return {
        result: RESULT,
        read() {
            for (const UNIT of world.units) {
                const ACTION = UNIT.ability.action;
                if (!ACTION || SEEN.has(ACTION.id)) {
                    continue;
                }
                SEEN.add(ACTION.id);
                // Production AttackCycle.begin records immutable actor/target origins.
                // Read them after the tick, before later aim corrections; do not wrap begin.
                const AIM = ACTION.prepareAim;
                assert.ok(AIM, 'every newly observed native basic start records its original aim');
                const DISTANCE = Math.hypot(AIM.originX - AIM.startX, AIM.originY - AIM.startY),
                    LIMIT = AIM.radius + UNIT.ability.attackRange(world) + COMPOSITION(UNIT.species).outerRangeSlack;
                RESULT.basicStartsObserved++;
                if (DISTANCE > LIMIT + 1e-9) {
                    RESULT.violations.push({
                        id: UNIT.id,
                        species: UNIT.species,
                        actionId: ACTION.id,
                        distance: DISTANCE,
                        limit: LIMIT,
                    });
                }
            }
        },
    };
}

function observeLateSummons() {
    const WORLD = makeFixture(9, { reserves: false });
    WORLD.setBattleCommand('scatter');
    stepUntil(WORLD, 5);
    const ORIGINAL = WORLD.units.find((unit) => unit.species === 1),
        PEANUT = WORLD.units.find((unit) => unit.species === 4),
        CLONE = WORLD.createFormationClone(ORIGINAL);
    PEANUT.setHealth(0);
    WORLD.handleUnitDeath(PEANUT);
    const CHILDREN = WORLD.units.filter(
            (unit) => unit.battleSummonKind === 'peanut-death-split' && unit.battleSummonParentId === PEANUT.id,
        ),
        SUMMONS = [CLONE, ...CHILDREN],
        LAUNCHED = new Set();
    assert.equal(CHILDREN.length, 2, 'native peanut death creates two late split children');
    assert.ok(
        SUMMONS.every((unit) => unit.scatterAttackCount === 0),
        'all late summon constructors initialize a valid zero counter',
    );
    const OFF = WORLD.onNotice.on((notice) => {
        const UNIT = SUMMONS.find((unit) => unit.id === notice.unit);
        if (UNIT && notice.kind === 'attack-launch' && notice.attackKind === UNIT.ability.spec.kind) {
            LAUNCHED.add(UNIT.id);
        }
    });
    const ELAPSED = stepUntil(WORLD, 40, () => LAUNCHED.size === SUMMONS.length);
    OFF();
    assert.equal(LAUNCHED.size, SUMMONS.length, 'late copy and split children must make native basic launches');
    assert.ok(
        SUMMONS.every((unit) => Number.isSafeInteger(unit.scatterAttackCount) && unit.scatterAttackCount > 0),
        'native launches retain positive integer counters',
    );
    const DATA = SNAPSHOT(WORLD),
        RESTORED = RESTORE(DATA),
        COUNTERS = SUMMONS.map((unit) => ({
            id: unit.id,
            kind: unit.battleSummonKind,
            count: unit.scatterAttackCount,
        }));
    for (const RECORD of COUNTERS) {
        assert.equal(
            RESTORED.unitCollection.items.find((unit) => unit.id === RECORD.id)?.scatterAttackCount,
            RECORD.count,
        );
    }
    stepUntil(WORLD, 2);
    stepUntil(RESTORED, 2);
    assert.equal(hash(SNAPSHOT(RESTORED)), hash(SNAPSHOT(WORLD)), 'late summon checkpoints replay exactly');
    return { elapsedSeconds: ELAPSED, counters: COUNTERS, replayMatches: true };
}

function observeReserve(world) {
    const FIELD_IDS = new Set(world.units.map((unit) => unit.id)),
        VICTIM = world.units.find((unit) => !unit.isBattleOnlySummon && unit.species !== 4),
        LAUNCHES = new Map();
    VICTIM.setHealth(0);
    world.handleUnitDeath(VICTIM);
    const OFF = world.onNotice.on((notice) => {
        if (notice.kind === 'attack-launch' && !FIELD_IDS.has(notice.unit)) {
            LAUNCHES.set(notice.unit, (LAUNCHES.get(notice.unit) || 0) + 1);
        }
    });
    let replacement = null,
        firstCounter = null,
        selected = false;
    const ELAPSED = stepUntil(
        world,
        40,
        () => replacement && LAUNCHES.has(replacement.id),
        () => {
            if (!replacement) {
                replacement = world.units.find((unit) => !FIELD_IDS.has(unit.id) && !unit.isBattleOnlySummon) || null;
                firstCounter = replacement?.scatterAttackCount ?? null;
            }
            selected ||= Boolean(replacement && world._armyAttackTurns.has(replacement));
        },
    );
    OFF();
    assert.ok(replacement, 'native auto-deployment replaces the fallen frontline unit');
    assert.equal(firstCounter, 0, 'new reserve starts with no previous attack opportunity');
    assert.ok(selected, 'rotation must admit the newly arrived reserve');
    assert.ok(LAUNCHES.has(replacement.id), 'reserve selection must lead to a real attack launch');
    assert.equal(world.battleCommand, 'scatter');
    assert.equal(world.fieldFighterCount, COUNT);
    return {
        id: replacement.id,
        elapsedSeconds: ELAPSED,
        selected,
        launches: LAUNCHES.get(replacement.id),
        counter: replacement.scatterAttackCount,
    };
}

function observeBossChange() {
    const WORLD = makeFixture(9, { reserves: false, bosses: 3 });
    WORLD.setBattleCommand('scatter');
    stepUntil(WORLD, 10);
    const OLD_BOSS = WORLD.bosses[0],
        BEFORE_TURNS = [...WORLD._armyAttackTurns].map((unit) => unit.id).sort((a, b) => a - b),
        COUNTERS = new Map(WORLD.units.map((unit) => [unit.id, unit.scatterAttackCount])),
        HITS = [];
    OLD_BOSS.setHealth(0);
    WORLD.handleUnitDeath(OLD_BOSS);
    const OFF = WORLD.onNotice.on((notice) => {
        if (notice.kind === 'boss-hit' && notice.damage > 0 && notice.targetId !== OLD_BOSS.id) {
            HITS.push({ unit: notice.unit, target: notice.targetId, damage: notice.damage });
        }
    });
    let rotated = false;
    const ELAPSED = stepUntil(
        WORLD,
        20,
        () => rotated && HITS.length > 0,
        () => {
            const TURNS = [...WORLD._armyAttackTurns].map((unit) => unit.id).sort((a, b) => a - b);
            rotated ||=
                hash(TURNS) !== hash(BEFORE_TURNS) &&
                WORLD.units.some((unit) => unit.scatterAttackCount > (COUNTERS.get(unit.id) || 0));
        },
    );
    OFF();
    assert.ok(rotated, 'attack opportunities continue rotating after the target boss dies');
    assert.ok(HITS.length > 0, 'native targeting deals damage to a remaining boss');
    assert.equal(WORLD.battleCommand, 'scatter');
    return { previousBoss: OLD_BOSS.id, elapsedSeconds: ELAPSED, rotated, hits: HITS };
}

saveReport();
try {
    const INITIAL = SNAPSHOT(makeFixture(COUNT)),
        WORLD = RESTORE(INITIAL),
        START_TICK = WORLD.simulationTick,
        RECORDS = new Map(
            WORLD.units
                .filter((unit) => unit.faction === 'player' && unit.hp > 0 && !unit.isBattleOnlySummon)
                .map((unit) => [
                    unit.id,
                    {
                        id: unit.id,
                        species: unit.species,
                        basicKind: unit.ability.spec.kind,
                        ranged: COMPOSITION(unit.species).retreatWithinRange,
                        launches: Array(6).fill(0),
                        otherLaunches: Array(6).fill(0),
                        hits: Array(6).fill(0),
                        damage: Array(6).fill(0),
                        firstLaunchSeconds: null,
                        firstDamageSeconds: null,
                        lastLaunchSeconds: null,
                        longestNoLaunchSeconds: 0,
                    },
                ]),
        ),
        RANGES = observeAttackRanges(WORLD);
    REPORT.fixtureHash = hash(INITIAL);
    REPORT.initialCount = RECORDS.size;
    REPORT.records = [...RECORDS.values()];
    REPORT.ranges = RANGES.result;
    assert.equal(RECORDS.size, COUNT);
    REPORT.compatibility = checkpointCompatibility(INITIAL);
    WORLD.setBattleCommand('scatter');
    const OFF = WORLD.onNotice.on((notice) => {
        const RECORD = RECORDS.get(notice.unit),
            WINDOW = Math.min(5, Math.floor((WORLD.simulationTick - START_TICK - 1) / WINDOW_TICKS)),
            NOW = (WORLD.simulationTick - START_TICK) * STEP;
        if (!RECORD || WINDOW < 0) {
            return;
        }
        if (notice.kind === 'attack-launch') {
            if (notice.attackKind === RECORD.basicKind) {
                RECORD.launches[WINDOW]++;
                RECORD.firstLaunchSeconds ??= NOW;
                RECORD.longestNoLaunchSeconds = Math.max(
                    RECORD.longestNoLaunchSeconds,
                    NOW - (RECORD.lastLaunchSeconds ?? 0),
                );
                RECORD.lastLaunchSeconds = NOW;
            } else {
                RECORD.otherLaunches[WINDOW]++;
            }
        }
        if (notice.kind === 'boss-hit' && notice.damage > 0) {
            RECORD.hits[WINDOW]++;
            RECORD.damage[WINDOW] += notice.damage;
            RECORD.firstDamageSeconds ??= NOW;
        }
    });
    let checkpoint = null,
        expectedReplayHash = null;
    for (let tick = 0; tick < SECONDS / STEP; tick++) {
        WORLD.step(STEP);
        RANGES.read();
        if (tick === 199) {
            checkpoint = SNAPSHOT(WORLD);
        }
        if (tick === 399) {
            expectedReplayHash = hash(SNAPSHOT(WORLD));
        }
        if ((tick + 1) % WINDOW_TICKS === 0) {
            const INDEX = (tick + 1) / WINDOW_TICKS - 1,
                ALL = [...RECORDS.values()],
                WINDOW = {
                    from: INDEX * WINDOW_SECONDS,
                    to: (INDEX + 1) * WINDOW_SECONDS,
                    all: summarize(ALL, INDEX),
                    melee: summarize(
                        ALL.filter((record) => !record.ranged),
                        INDEX,
                    ),
                    ranged: summarize(
                        ALL.filter((record) => record.ranged),
                        INDEX,
                    ),
                };
            REPORT.windows.push(WINDOW);
            saveReport();
            console.log(
                `${COUNT}: ${WINDOW.from}-${WINDOW.to}s basic launches ${WINDOW.all.withLaunch}/${COUNT}; melee damage ${WINDOW.melee.withDamage}, ranged damage ${WINDOW.ranged.withDamage}`,
            );
            assert.ok(
                WINDOW.melee.totalDamage > 0 && WINDOW.ranged.totalDamage > 0,
                'both combat groups cause actual damage in every 20s window',
            );
        }
    }
    OFF();
    const ALL = [...RECORDS.values()],
        LIVE = new Map(WORLD.unitCollection.items.map((unit) => [unit.id, unit]));
    for (const RECORD of ALL) {
        RECORD.longestNoLaunchSeconds = Math.max(
            RECORD.longestNoLaunchSeconds,
            SECONDS - (RECORD.lastLaunchSeconds ?? 0),
        );
        RECORD.aliveAtEnd = (LIVE.get(RECORD.id)?.hp ?? 0) > 0;
    }
    const SURVIVORS = ALL.filter((record) => record.aliveAtEnd);
    REPORT.total = {
        all: summarize(ALL),
        survivors: summarize(SURVIVORS),
        melee: summarize(ALL.filter((record) => !record.ranged)),
        ranged: summarize(ALL.filter((record) => record.ranged)),
        longestNoLaunchSeconds: Math.max(...SURVIVORS.map((record) => record.longestNoLaunchSeconds)),
        aliveAtEnd: SURVIVORS.length,
    };
    assert.equal(
        SURVIVORS.length,
        COUNT,
        'durable fixture must retain the original frontline for the full observation',
    );
    assert.equal(
        REPORT.total.survivors.withLaunch,
        SURVIVORS.length,
        'every surviving frontline unit makes a native basic launch',
    );
    assert.ok(
        REPORT.total.survivors.withDamage / SURVIVORS.length >= 0.95,
        'at least 95% of the surviving frontline causes actual damage; natural misses remain possible',
    );
    assert.ok(
        REPORT.total.longestNoLaunchSeconds <= 40 + 1e-9,
        'no surviving frontline unit waits over 40s between basic launches, including observation edges',
    );
    assert.ok(RANGES.result.basicStartsObserved > COUNT);
    assert.deepEqual(RANGES.result.violations, [], 'scatter keeps the production natural basic attack envelope');
    const REPLAY = RESTORE(checkpoint);
    stepUntil(REPLAY, 10);
    REPORT.checkpoint = {
        capturedAtSeconds: 10,
        comparedAtSeconds: 20,
        expected: expectedReplayHash,
        restored: hash(SNAPSHOT(REPLAY)),
    };
    assert.equal(
        REPORT.checkpoint.restored,
        REPORT.checkpoint.expected,
        'populated attack rotation checkpoint replays exactly',
    );
    saveReport();
    if (COUNT === 100) {
        REPORT.reserve = observeReserve(WORLD);
        saveReport();
        REPORT.lateSummons = observeLateSummons();
        saveReport();
        REPORT.bossChange = observeBossChange();
    }
    assert.equal(sourceHash(), REPORT.sourceHash, 'production source must remain unchanged during the test');
    REPORT.status = 'passed';
    console.log(
        JSON.stringify(
            {
                status: REPORT.status,
                count: COUNT,
                total: REPORT.total,
                checkpoint: REPORT.checkpoint,
                ranges: REPORT.ranges,
            },
            null,
            2,
        ),
    );
} catch (error) {
    REPORT.status = 'failed';
    REPORT.error = error.stack || String(error);
    throw error;
} finally {
    saveReport();
}
