// Bounded model/query regression. Native HP interpolation and actual HUD values
// are checked together by hud-sampling.e2e.mjs, independently of cache internals.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { FarmHudCounts } from '../src/farm-hud-counts.js';

globalThis.BloomGamekitDeterministic = await import('../vendor/upstream/deterministic.js');
globalThis.BloomGamekitWorkScheduler = await import('../vendor/upstream/work-scheduler.js');
const { Garden: GARDEN } = await import('../src/farm-model.js'),
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

const LISTENERS = COUNTS.world.unitCollection.onHealthChanged.listeners.size,
    LAST_WORLD = COUNTS.world;
COUNTS.dispose();
assert.equal(LAST_WORLD.unitCollection.onHealthChanged.listeners.size, LISTENERS - 1);
console.log('HUD counts: read-only state, same-tick invalidation, 240-to-40 hand queries and observer cleanup passed');
