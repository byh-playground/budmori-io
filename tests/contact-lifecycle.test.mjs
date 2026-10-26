// Exact baseline/candidate state after native deaths, reinforcements, split/clone,
// scatter rotation, checkpoint replay, floor settlement and a new floor.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { captureContactInputs, verifyContactInputs } from './contact-test-provenance.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url)),
    BASE = path.resolve(process.argv[2] || ''),
    COUNT = Number(process.argv[3] || 100),
    STARTED = Date.now(),
    OUTPUT = new URL('./output/contact-performance/', import.meta.url),
    // Restoring corn payloads changes object insertion order, not any value.
    // Canonicalize object keys only; array/pair/rotation order remains authoritative.
    HASH = (value) =>
        createHash('sha256')
            .update(
                JSON.stringify(value, (_key, entry) =>
                    entry && typeof entry === 'object' && !Array.isArray(entry)
                        ? Object.fromEntries(
                              Object.keys(entry)
                                  .sort()
                                  .map((key) => [key, entry[key]]),
                          )
                        : entry,
                ),
            )
            .digest('hex');
assert.notEqual(BASE, path.resolve(ROOT));
assert.ok([100, 250, 500].includes(COUNT));
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
    RESULTS = {},
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
        count: COUNT,
        fixture:
            'Seed731,20TPS,mixed9T1,100/250/500 frontline plus equal reserves; same forced deaths drive native lifecycle.',
    };
fs.mkdirSync(OUTPUT, { recursive: true });
function run(api) {
    const WORLD = new api.Garden(731),
        CHECKPOINTS = [],
        NOTICES = [],
        ROTATIONS = [];
    WORLD.resetUnits();
    WORLD.playerProgression.overallXp = api.overallXpForLevel(Math.max(1, (COUNT - 100) / 10 + 1));
    WORLD.playerProgression.towerBest = 100;
    WORLD.setWorkBasisPoints(0);
    for (let index = 0; index < COUNT * 2; index++) {
        const UNIT = WORLD.spawn(index % 9, 1, 0, 0);
        UNIT.growthElapsed = UNIT.growthDuration;
        UNIT.dropLanded = true;
    }
    assert.ok(WORLD.startTower(1));
    assert.ok(WORLD.finishMarch());
    for (let index = 0; index < COUNT; index++) {
        const ANGLE = index * 2.399963229728653,
            RADIUS = WORLD.boss.radius + 1 + Math.sqrt(index) * 0.2;
        assert.ok(
            WORLD._deployReservedUnit(
                index % 9,
                WORLD.boss.x + Math.cos(ANGLE) * RADIUS,
                WORLD.boss.y + Math.sin(ANGLE) * RADIUS,
            ),
        );
    }
    for (const UNIT of WORLD.units) {
        UNIT.z = 0;
        UNIT.dropLanded = true;
    }
    WORLD.boss.setBaseStats({ maxHp: 1e9, attackPower: 0.01 });
    WORLD.boss.setHealth(WORLD.boss.maxHp);
    WORLD.boss.z = 0;
    WORLD.boss.dropLanded = true;
    WORLD.farmBossEvent.phase = 'fighting';
    WORLD.setBattleCommand('scatter');
    const OFF = WORLD.onNotice.on((notice) => NOTICES.push(structuredClone(notice))),
        CHECKPOINT = (label) =>
            CHECKPOINTS.push({ label, tick: WORLD.simulationTick, hash: HASH(api.snapshot(WORLD)) }),
        STEP = (ticks) => {
            for (let index = 0; index < ticks; index++) {
                WORLD.step(0.05);
                ROTATIONS.push([...WORLD._armyAttackTurns].map((unit) => unit.id));
                if (WORLD.simulationTick % 20 === 0) {
                    CHECKPOINT('tick');
                }
            }
        };
    STEP(120);
    CHECKPOINT('before-death');
    const IDS = new Set(WORLD.units.map((unit) => unit.id)),
        PARENT = WORLD.units.find((unit) => unit.species === 1 && unit.hp > 0),
        PEANUT = WORLD.units.find((unit) => unit.species === 4 && unit.hp > 0),
        VICTIM = WORLD.units.find((unit) => unit.species === 0 && unit.hp > 0),
        CLONE = WORLD.createFormationClone(PARENT);
    assert.ok(CLONE?.isFormationClone);
    PEANUT.setHealth(0);
    WORLD.handleUnitDeath(PEANUT);
    VICTIM.setHealth(0);
    WORLD.handleUnitDeath(VICTIM);
    const CHILDREN = WORLD.units.filter((unit) => unit.battleSummonParentId === PEANUT.id);
    assert.equal(CHILDREN.length, 2);
    CHECKPOINT('clone-split-death');
    STEP(240);
    const REPLACEMENT_IDS = WORLD.units
        .filter((unit) => !IDS.has(unit.id) && !unit.isBattleOnlySummon)
        .map((unit) => unit.id);
    assert.ok(REPLACEMENT_IDS.length >= 1, 'native reserve deployment replaces a fallen resident');
    const RESTORED = api.restore(api.snapshot(WORLD));
    for (let index = 0; index < 40; index++) {
        WORLD.step(0.05);
        RESTORED.step(0.05);
    }
    // Preserve the replay assertion below. Retain both inputs on failure so an
    // unchanged-baseline failure can be diagnosed without weakening the check.
    if (HASH(api.snapshot(WORLD)) !== HASH(api.snapshot(RESTORED))) {
        fs.writeFileSync(new URL(`${COUNT}-replay-world.json`, OUTPUT), JSON.stringify(api.snapshot(WORLD)));
        fs.writeFileSync(new URL(`${COUNT}-replay-restored.json`, OUTPUT), JSON.stringify(api.snapshot(RESTORED)));
    }
    assert.deepEqual(api.snapshot(WORLD), api.snapshot(RESTORED), 'mid-combat checkpoint values and array order');
    assert.equal(HASH(api.snapshot(WORLD)), HASH(api.snapshot(RESTORED)), 'mid-combat checkpoint continuation');
    CHECKPOINT('restored-continuation');
    let settlementTicks = 0;
    while (WORLD.farmBossEvent.phase !== 'idle' && settlementTicks++ < 240) {
        for (const BOSS of WORLD.bosses) {
            if (BOSS.active && BOSS.hp > 0) {
                BOSS.setHealth(0);
            }
        }
        STEP(1);
    }
    assert.equal(WORLD.farmBossEvent.phase, 'idle', 'native floor settlement completes');
    CHECKPOINT('floor-reward');
    const OLD_FLOOR = WORLD.tower.floor;
    assert.ok(WORLD.chooseDoor(0));
    assert.equal(WORLD.tower.floor, OLD_FLOOR + 1);
    CHECKPOINT('floor-transition');
    STEP(40);
    CHECKPOINT('after-transition');
    OFF();
    return {
        checkpoints: CHECKPOINTS,
        noticeHash: HASH(NOTICES),
        rotationHash: HASH(ROTATIONS),
        metrics: WORLD.metrics,
        cloneId: CLONE.id,
        childIds: CHILDREN.map((unit) => unit.id),
        replacementIds: REPLACEMENT_IDS,
        launches: NOTICES.filter((notice) => notice.kind === 'attack-launch').length,
        hits: NOTICES.filter((notice) => notice.kind === 'boss-hit').length,
        rewards: WORLD.bossRewardReceipts.map((receipt) => ({
            receiptKey: receipt.receiptKey,
            status: receipt.status,
            acquired: receipt.acquiredCount,
            xp: receipt.xpAmount,
        })),
        finalHash: HASH(api.snapshot(WORLD)),
    };
}
try {
    for (const [VARIANT, API] of Object.entries(APIS)) {
        RESULTS[VARIANT] = run(API);
        console.log(`${VARIANT} lifecycle done`);
    }
    assert.deepEqual(
        RESULTS.candidate,
        RESULTS.base,
        'exact state, attacks, damage, reinforcements, rotation and floor rewards',
    );
    verifyContactInputs(READ_INPUTS, BASE, ROOT, import.meta.url);
    REPORT.status = 'passed';
    REPORT.result = RESULTS.candidate;
} catch (error) {
    REPORT.status = 'failed';
    REPORT.error = String(error.stack || error);
    throw error;
} finally {
    REPORT.elapsedMs = Date.now() - STARTED;
    fs.writeFileSync(new URL(`${COUNT}-lifecycle.json`, OUTPUT), JSON.stringify(REPORT, null, 2));
}
console.log(
    JSON.stringify({ status: REPORT.status, finalHash: REPORT.result.finalHash, metrics: REPORT.result.metrics }),
);
