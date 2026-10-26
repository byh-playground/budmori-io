// Bounded model/query and native-presentation regression; no DOM or mocked health interpolation.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { FarmHudCounts } from '../src/farm-hud-counts.js';

globalThis.BloomGamekitDeterministic = await import('../vendor/upstream/deterministic.js');
globalThis.BloomGamekitWorkScheduler = await import('../vendor/upstream/work-scheduler.js');
globalThis.BloomGamekitInterpolation = await import('../vendor/upstream/interpolation.js');
globalThis.BloomGamekitSimloop = await import('../vendor/upstream/simloop.js');
const { Garden: GARDEN, CONFIG } = await import('../src/farm-model.js'),
    { FarmSession: FARM_SESSION } = await import('../src/farm-session.js'),
    { snapshot: SNAPSHOT, restore: RESTORE } = await import('../src/farm-state.js'),
    { overallXpForLevel: XP } = await import('../src/player-progression.js'),
    COUNTS = new FarmHudCounts();

function digest(world) {
    return createHash('sha256')
        .update(JSON.stringify(SNAPSHOT(world)))
        .digest('hex');
}
function assertCounts(world) {
    const BEFORE = digest(world),
        BATTLE = COUNTS.battleCounts(world),
        EXPECTED = world.handCounts;
    assert.equal(COUNTS.worldPopulation(world), world.unitCollection.items.filter((u) => !u.isBattleOnlySummon).length);
    assert.deepEqual([...BATTLE.hand], [...EXPECTED]);
    assert.equal(
        BATTLE.reserves,
        [...EXPECTED.values()].reduce((sum, count) => sum + count, 0),
    );
    assert.equal(BATTLE.fighters, world.fieldFighterCount);
    assert.equal(digest(world), BEFORE, 'HUD reads leave the authoritative snapshot unchanged');
}
function assertHealth(view) {
    const EXPECTED = { current: 0, max: 0, living: 0, total: 0 };
    for (const UNIT of view.units) {
        if (UNIT.faction === CONFIG.factions.PLAYER) {
            EXPECTED.current += Math.max(0, Math.min(UNIT.maxHp, UNIT.hp));
            EXPECTED.max += UNIT.maxHp;
            EXPECTED.living += UNIT.hp > 0 ? 1 : 0;
            EXPECTED.total++;
        }
    }
    assert.deepEqual(view.displayArmyHealth, EXPECTED, 'fused health equals the former display scan exactly');
    return view.displayArmyHealth.current;
}

for (const FRONTLINE of [100, 250, 500]) {
    const WORLD = new GARDEN(731);
    WORLD.resetUnits();
    WORLD.playerProgression.overallXp = XP(91);
    for (let index = 0; index < FRONTLINE * 2; index++) {
        const UNIT = WORLD.spawn(index % 9, 1, 0, 0);
        UNIT.growthElapsed = UNIT.growthDuration;
        UNIT.dropLanded = true;
    }
    assert.ok(WORLD.startTower(1));
    assert.ok(WORLD.finishMarch());
    for (let index = 0; index < FRONTLINE; index++) {
        assert.ok(WORLD._deployReservedUnit(index % 9, 0, 0));
    }
    assertCounts(WORLD);
    const HAND = COUNTS.battleCounts(WORLD).hand;
    for (let frame = 0; frame < 6; frame++) {
        assert.equal(
            COUNTS.battleCounts(WORLD).hand,
            HAND,
            'two consumers/RAF share one query until a dependency changes',
        );
    }
    const READ_HAND = Object.getOwnPropertyDescriptor(GARDEN.prototype, 'handCounts').get;
    let handQueries = 0;
    Object.defineProperty(WORLD, 'handCounts', {
        configurable: true,
        get() {
            handQueries++;
            return READ_HAND.call(this);
        },
    });
    for (let frame = 0; frame < 120; frame++) {
        if (frame % 3 === 0) {
            WORLD.simulationTick++;
        }
        COUNTS.battleCounts(WORLD);
        COUNTS.battleCounts(WORLD);
    }
    assert.equal(handQueries, 40, '120 RAFs at 60Hz/20TPS make 40 hand queries, not 240');
    delete WORLD.handCounts;
    const RESERVED = [...WORLD._benched][0];
    RESERVED.setHealth(0);
    assertCounts(WORLD);
    assert.notEqual(COUNTS.battleCounts(WORLD).hand, HAND, 'health signal invalidates within the same tick');
    RESERVED.revive(RESERVED.maxHp);
    assertCounts(WORLD);
    assert.ok(WORLD._deployReservedUnit(RESERVED.species, 0, 0));
    assertCounts(WORLD);
    const ORIGINAL = WORLD.units[0],
        CLONE = WORLD.createFormationClone(ORIGINAL);
    assertCounts(WORLD);
    assert.ok(WORLD.removeUnit(CLONE));
    assertCounts(WORLD);
    ORIGINAL.setBaseStats({ maxHp: ORIGINAL.maxHp * 1.5 });
    assertCounts(WORLD);
    WORLD.unitCollection.reorder(
        WORLD.roster
            .residents()
            .map((unit) => unit.id)
            .reverse(),
    );
    assertCounts(WORLD);
    const RESTORED = RESTORE(SNAPSHOT(WORLD)),
        LISTENERS = WORLD.unitCollection.onHealthChanged.listeners.size;
    assertCounts(RESTORED);
    assert.equal(
        WORLD.unitCollection.onHealthChanged.listeners.size,
        LISTENERS - 1,
        'world replacement releases the observer',
    );
    RESTORED.reset();
    assertCounts(RESTORED);
    console.log(`HUD count semantics: ${FRONTLINE} field / ${FRONTLINE} reserves passed`);
}

// Control only the wall clock, leaving the native PresentationRuntime's 50ms
// delay, schemas, state boundaries and sampled model iteration untouched.
const WORLD = new GARDEN(731);
WORLD.resetUnits();
const UNIT = WORLD.spawn(0, 1, 0, 0),
    SESSION = new FARM_SESSION(WORLD),
    ORIGIN = SESSION.presentationOriginWallMs;
let clock = ORIGIN + 50;
SESSION.captureClock = () => clock;
SESSION.frameClock = (now) => now;
SESSION.capturePresentation('reset');
UNIT.setHealth(UNIT.hp * 0.5);
clock += 50;
SESSION.capturePresentation('continuous');
const SAMPLES = [];
for (const OFFSET of [0, 10, 25, 40, 50]) {
    SAMPLES.push(assertHealth(SESSION.presentation(clock + OFFSET)));
}
assert.ok(new Set(SAMPLES).size > 2, 'health continues interpolating between ticks');
UNIT.setHealth(0);
clock += 50;
SESSION.capturePresentation('continuous');
for (const OFFSET of [0, 10, 25, 40, 50]) {
    assertHealth(SESSION.presentation(clock + OFFSET));
}
UNIT.revive(UNIT.maxHp);
clock += 50;
SESSION.capturePresentation('continuous');
for (const OFFSET of [0, 25, 50]) {
    assertHealth(SESSION.presentation(clock + OFFSET));
}
WORLD.createFormationClone(UNIT);
clock += 50;
SESSION.capturePresentation('reset');
assertHealth(SESSION.presentation(clock));
UNIT.setBaseStats({ maxHp: UNIT.maxHp * 2 });
clock += 50;
SESSION.capturePresentation('continuous');
assertHealth(SESSION.presentation(clock + 25));
const LISTENERS = COUNTS.world.unitCollection.onHealthChanged.listeners.size,
    LAST_WORLD = COUNTS.world;
COUNTS.dispose();
assert.equal(LAST_WORLD.unitCollection.onHealthChanged.listeners.size, LISTENERS - 1);
SESSION.dispose();
console.log('Native sampled HP: exact sums, interpolation, death, revival, clone and maxHp passed');
