import assert from 'node:assert/strict';
import {
  RAID_SLEEP_SECONDS,
  abortReservedRaidRun,
  raidDeadFarmUnitIds,
  raidDeploymentRewardMultiplier,
  raidSettlementKey,
  reserveRaidRun,
  settleRaidOwnerFarm
} from '../src/raid-settlement.js';

const makeFarm = (ownerId, count = 2) => ({
  ownerId,
  units: Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    species: index % 2,
    tier: index === 1 ? 2 : 1,
    hp: 25 + index,
    down: 0
  })),
  playerProgression: { level: 1, experience: 0, availablePoints: 0 },
  bossRewardReceipts: [],
  nextRaidRunSequence: 0,
  activeRaidRunSequence: null,
  activeRaidSessionId: null,
  raidSettlementWatermark: 0,
  raidSettlementReceipts: []
});
const makeRaidWorld = (ownerId, farm, { casualties = [], deployedFarmIds = farm.units.map(unit => unit.id), summons = [] } = {}) => ({
  raidRosters: [{
    ownerId,
    troops: farm.units.map(unit => ({ farmId: unit.id, species: unit.species, tier: unit.tier, deployed: deployedFarmIds.includes(unit.id) }))
  }],
  units: farm.units.filter(unit => deployedFarmIds.includes(unit.id)).map(unit => ({
    id: 1000000 + unit.id,
    ownerId,
    farmId: unit.id,
    species: unit.species,
    tier: unit.tier,
    hp: casualties.includes(unit.id) ? 0 : 20
  })).concat(summons)
});

// The proposed multiplier uses the eligible owner roster from encounter start
// and cumulative unique original troop deployments (not currently living count).
assert.equal(raidDeploymentRewardMultiplier({ availableAtStart: 10, originalUnitsDeployed: 10 }), 1);
assert.equal(raidDeploymentRewardMultiplier({ availableAtStart: 10, originalUnitsDeployed: 5 }), 1.5);
assert.equal(raidDeploymentRewardMultiplier({ availableAtStart: 10, originalUnitsDeployed: 1 }), 1.9);
assert.equal(raidDeploymentRewardMultiplier({ availableAtStart: 1, originalUnitsDeployed: 0 }), 0);
assert.equal(raidDeploymentRewardMultiplier({ availableAtStart: 0, originalUnitsDeployed: 0 }), 0);
assert.throws(() => raidDeploymentRewardMultiplier({ availableAtStart: 3, originalUnitsDeployed: 4 }), TypeError);
assert.throws(() => raidDeploymentRewardMultiplier({ availableAtStart: -1, originalUnitsDeployed: 0 }), TypeError);

// Receipt keys remain stable per owner/session/encounter and resist delimiter collisions.
const key = raidSettlementKey({ ownerId: 'alice:raid', sessionId: 's:1', encounterId: 7 });
assert.equal(key, raidSettlementKey({ ownerId: 'alice:raid', sessionId: 's:1', encounterId: 7 }));
assert.notEqual(key, raidSettlementKey({ ownerId: 'alice', sessionId: 'raid:s:1', encounterId: 7 }));
assert.notEqual(key, raidSettlementKey({ ownerId: 'alice:raid', sessionId: 's:1', encounterId: 8 }));

// Pea death-split children are temporary owner copies, not original Farm units.
const peaFarm = { ownerId: 'pea-owner', units: [{ id: 1, species: 0, tier: 3, hp: 30, down: 0 }] };
const splitWorld = {
  raidRosters: [{ ownerId: 'pea-owner', troops: [{ farmId: 1, species: 0, tier: 3, deployed: true }] }],
  units: [
    { id: 1000001, ownerId: 'pea-owner', farmId: 1, species: 0, tier: 3, hp: 0 },
    ...[1000002, 1000003].map(id => ({
      id, ownerId: 'pea-owner', farmId: 1, species: 0, tier: 1, hp: 5,
      isBattleOnlySummon: true, battleSummonKind: 'pea-death-split', battleSummonParentId: 1000001,
      canSplit: false, countsTowardPermanentRoster: false, eligibleForRaidDeployment: false,
      breedingEligible: false, mergeEligible: false, usesPersistentSleep: false
    }))
  ]
};
assert.deepEqual(raidDeadFarmUnitIds(splitWorld, 'pea-owner'), [1], 'split children are excluded from Farm casualties');
const invalidSplit = structuredClone(splitWorld);
invalidSplit.units[1].battleSummonParentId = 999;
assert.throws(() => raidDeadFarmUnitIds(invalidSplit, 'pea-owner'), /origin marker/);

// Victory sleeps only the owner's dead roster units and calls the shared reward
// seam once with the same stable owner-scoped key.
const original = makeFarm('alice', 4);
const reserved = reserveRaidRun(original, { sessionId: 'room-abc' });
assert.equal(reserved.runSequence, 1);
assert.equal(reserved.resumed, false);
const reconnect = reserveRaidRun(reserved.farm);
assert.equal(reconnect.runSequence, 1);
assert.equal(reconnect.sessionId, 'room-abc');
assert.equal(reconnect.resumed, true);
assert.throws(() => reserveRaidRun(reserved.farm, { sessionId: 'another-room' }), /different active Raid/);

// A browser reload loses the Raid runtime but leaves the earlier Farm
// reservation. Explicitly abandoning it changes only the settlement ledger.
const interruptedFarm = makeFarm('alice', 2);
interruptedFarm.playerProgression.experience = 37;
const interrupted = reserveRaidRun(interruptedFarm, { sessionId: 'interrupted-room' });
const interruptedUnits = structuredClone(interrupted.farm.units);
const interruptedProgression = structuredClone(interrupted.farm.playerProgression);
const interruptedRewards = structuredClone(interrupted.farm.bossRewardReceipts);
const interruptedResult = abortReservedRaidRun(interrupted.farm, { completedAtMs: 1234 });
assert.equal(interruptedResult.applied, true);
assert.equal(interruptedResult.receipt.outcome, 'aborted');
assert.equal(interruptedResult.receipt.ownerId, 'recovery-abort');
assert.deepEqual(interruptedResult.receipt.sleptFarmUnitIds, []);
assert.equal(interruptedResult.farm.activeRaidRunSequence, null);
assert.equal(interruptedResult.farm.activeRaidSessionId, null);
assert.equal(interruptedResult.farm.raidSettlementWatermark, interrupted.runSequence);
assert.deepEqual(interruptedResult.farm.units, interruptedUnits, 'abandonment does not change any Farm units');
assert.deepEqual(interruptedResult.farm.playerProgression, interruptedProgression, 'abandonment grants no XP or points');
assert.deepEqual(interruptedResult.farm.bossRewardReceipts, interruptedRewards, 'abandonment grants no boss reward');
let staleRewardCalls = 0;
const staleReturn = settleRaidOwnerFarm(interruptedResult.farm, {
  ownerId: 'alice', sessionId: interrupted.sessionId, encounterId: interrupted.runSequence,
  runSequence: interrupted.runSequence, outcome: 'victory',
  raidWorld: makeRaidWorld('alice', interrupted.farm, { casualties: [1] }),
  settleVictory: () => { staleRewardCalls++; throw new Error('stale victory cannot award'); }
});
assert.equal(staleReturn.applied, false, 'a still-running old tab cannot settle after explicit abandonment');
assert.equal(staleRewardCalls, 0);
assert.deepEqual(staleReturn.farm.units, interruptedUnits);
const newAfterAbandon = reserveRaidRun(interruptedResult.farm, { sessionId: 'new-room' });
assert.equal(newAfterAbandon.runSequence, interrupted.runSequence + 1, 'a new run can start after the abort receipt advances the watermark');
let rewardCalls = 0;
const victory = settleRaidOwnerFarm(reserved.farm, {
  ownerId: 'alice', sessionId: 'room-abc', encounterId: 4, runSequence: reserved.runSequence, outcome: 'victory',
  raidWorld: makeRaidWorld('alice', reserved.farm, { deployedFarmIds: [1, 2], casualties: [2] }),
  completedAtMs: 9000,
  settleVictory: context => {
    rewardCalls++;
    assert.notEqual(context.farm, original, 'reward resolver receives the private clone');
    assert.equal(context.ownerId, 'alice');
    assert.equal(context.sessionId, 'room-abc');
    assert.equal(context.encounterId, 4);
    assert.equal(context.receiptKey, raidSettlementKey({ ownerId: 'alice', sessionId: 'room-abc', encounterId: 4 }));
    assert.equal(context.source, 'raid');
    assert.equal(context.deploymentMultiplier, 1.5);
    return { farm: context.farm, summary: { acquisition: { status: 'pending' }, xp: { awarded: true, amount: 100 } } };
  }
});
assert.equal(victory.applied, true);
assert.equal(rewardCalls, 1);
assert.deepEqual(original.units.map(unit => [unit.hp, unit.down]), [[25, 0], [26, 0], [27, 0], [28, 0]], 'input Farm stays unchanged');
assert.deepEqual(victory.farm.units.map(unit => [unit.id, unit.hp, unit.down]), [
  [1, 25, 0], [2, 0, RAID_SLEEP_SECONDS], [3, 27, 0], [4, 28, 0]
]);
assert.deepEqual(victory.receipt.sleptFarmUnitIds, [2]);
assert.equal(victory.receipt.availableAtStart, 4);
assert.equal(victory.receipt.originalUnitsDeployed, 2);
assert.equal(victory.receipt.deploymentMultiplier, 1.5);
assert.deepEqual(victory.receipt.reward, { acquisition: { status: 'pending' }, xp: { awarded: true, amount: 100 } });
assert.equal(victory.farm.units.length, 4, 'defeated units remain owned');
assert.equal(victory.farm.nextRaidRunSequence, 1);
assert.equal(victory.farm.activeRaidRunSequence, null);
assert.equal(victory.farm.raidSettlementWatermark, 1);

// A duplicate after persisting/reloading returns the recorded result and does
// not apply a second loss list or call the reward/progression seam again.
const reloadedFarm = structuredClone(victory.farm);
const duplicate = settleRaidOwnerFarm(reloadedFarm, {
  ownerId: 'alice', sessionId: 'room-abc', encounterId: 4, runSequence: 1, outcome: 'victory',
  raidWorld: null,
  settleVictory: () => { rewardCalls++; throw new Error('duplicate reward was attempted'); }
});
assert.equal(duplicate.applied, false);
assert.deepEqual(duplicate.farm, reloadedFarm, 'duplicate result preserves persisted Farm state');
assert.equal(duplicate.farm.units[0].hp, 25, 'new/rollback death data is ignored after settlement');
assert.equal(duplicate.farm.units[1].down, RAID_SLEEP_SECONDS);
assert.deepEqual(duplicate.receipt, victory.receipt);
assert.equal(rewardCalls, 1);

// A losing/aborted attempt keeps owned units and applies their death sleep, but
// never invokes loot or XP. No input counts are required for a loss.
for (const outcome of ['defeat', 'aborted']) {
  let calls = 0;
  const farm = makeFarm(`owner-${outcome}`);
  const run = reserveRaidRun(farm, { sessionId: `room-${outcome}` });
  const result = settleRaidOwnerFarm(run.farm, {
    ownerId: `owner-${outcome}`, sessionId: `room-${outcome}`, encounterId: 1, runSequence: run.runSequence,
    outcome, raidWorld: makeRaidWorld(`owner-${outcome}`, run.farm, { casualties: [1] }), settleVictory: () => { calls++; }
  });
  assert.equal(calls, 0);
  assert.equal(result.receipt.reward, null);
  assert.equal(result.receipt.deploymentMultiplier, 0);
  assert.equal(result.farm.units.length, farm.units.length);
  assert.equal(result.farm.units[0].hp, 0);
  assert.equal(result.farm.units[0].down, 60);
  assert.equal(result.farm.units[1].hp, 26);
}

// An empty deployment cannot earn a boss reward, even on a victory event.
let zeroDeploymentCalls = 0;
const emptyFarm = makeFarm('empty', 4);
const emptyRun = reserveRaidRun(emptyFarm, { sessionId: 'room-empty' });
const zeroDeployment = settleRaidOwnerFarm(emptyRun.farm, {
  ownerId: 'empty', sessionId: 'room-empty', encounterId: 1, runSequence: emptyRun.runSequence, outcome: 'victory',
  raidWorld: makeRaidWorld('empty', emptyRun.farm, { deployedFarmIds: [] }),
  settleVictory: () => { zeroDeploymentCalls++; }
});
assert.equal(zeroDeploymentCalls, 0);
assert.equal(zeroDeployment.receipt.deploymentMultiplier, 0);
assert.equal(zeroDeployment.receipt.reward, null);

const noResolverFarm = makeFarm('no-resolver');
const noResolverRun = reserveRaidRun(noResolverFarm, { sessionId: 'room-no-resolver' });
assert.throws(() => settleRaidOwnerFarm(noResolverRun.farm, {
  ownerId: 'no-resolver', sessionId: 'room-no-resolver', encounterId: 1,
  runSequence: noResolverRun.runSequence, outcome: 'victory',
  raidWorld: makeRaidWorld('no-resolver', noResolverRun.farm)
}), /needs the common reward/);
assert.equal(noResolverRun.farm.activeRaidRunSequence, noResolverRun.runSequence,
  'a missing resolver cannot turn an unawarded victory into a settled receipt');

const badResolverFarm = makeFarm('bad-resolver');
const badResolverRun = reserveRaidRun(badResolverFarm, { sessionId: 'room-bad-resolver' });
assert.throws(() => settleRaidOwnerFarm(badResolverRun.farm, {
  ownerId: 'bad-resolver', sessionId: 'room-bad-resolver', encounterId: 1,
  runSequence: badResolverRun.runSequence, outcome: 'victory',
  raidWorld: makeRaidWorld('bad-resolver', badResolverRun.farm, { casualties: [1] }),
  settleVictory: () => ({ farm: makeRaidWorld('bad-resolver', badResolverRun.farm), summary: null })
}), /different owner Farm|preserve the owner’s Farm roster/);
assert.throws(() => settleRaidOwnerFarm(badResolverRun.farm, {
  ownerId: 'bad-resolver', sessionId: 'room-bad-resolver', encounterId: 2,
  runSequence: badResolverRun.runSequence, outcome: 'victory',
  raidWorld: makeRaidWorld('bad-resolver', badResolverRun.farm, { casualties: [1] }),
  settleVictory: context => {
    context.farm.units[0].down = 0;
    return { farm: context.farm, summary: null };
  }
}), /preserve the owner Farm’s casualty sleep/);

// Farm IDs may overlap between peers; a settlement affects only the Farm passed
// for that specific verified owner.
const aliceFarm = makeFarm('alice');
const bobFarm = makeFarm('bob');
const sharedRaidWorld = {
  raidRosters: [
    { ownerId: 'alice', troops: [{ farmId: 1, species: 0, tier: 1, deployed: true }] },
    { ownerId: 'bob', troops: [{ farmId: 1, species: 0, tier: 1, deployed: true }] }
  ],
  units: [
    { id: 1000001, ownerId: 'alice', farmId: 1, species: 0, tier: 1, hp: 0 },
    { id: 2000001, ownerId: 'bob', farmId: 1, species: 0, tier: 1, hp: 0 }
  ]
};
assert.deepEqual(raidDeadFarmUnitIds(sharedRaidWorld, 'alice'), [1]);
assert.deepEqual(raidDeadFarmUnitIds(sharedRaidWorld, 'bob'), [1]);
const aliceRun = reserveRaidRun(aliceFarm, { sessionId: 'shared-room' });
const aliceResult = settleRaidOwnerFarm(aliceRun.farm, {
  ownerId: 'alice', sessionId: 'shared-room', encounterId: 9, runSequence: aliceRun.runSequence,
  outcome: 'defeat', raidWorld: sharedRaidWorld
});
assert.equal(aliceResult.farm.units[0].down, 60);
assert.equal(bobFarm.units[0].hp, 25);
assert.equal(bobFarm.raidSettlementReceipts.length, 0);

// The bounded receipt window retains exact-once protection with a durable
// monotonic watermark after detail records are pruned.
let ledgerFarm = makeFarm('ledger', 0);
for (let index = 1; index <= 130; index++) {
  const run = reserveRaidRun(ledgerFarm, { sessionId: `ledger-room-${index}` });
  const settled = settleRaidOwnerFarm(run.farm, {
    ownerId: 'ledger', sessionId: run.sessionId, encounterId: 1, runSequence: run.runSequence,
    outcome: 'aborted', raidWorld: makeRaidWorld('ledger', run.farm)
  });
  ledgerFarm = settled.farm;
}
assert.equal(ledgerFarm.raidSettlementReceipts.length, 128);
assert.equal(ledgerFarm.raidSettlementWatermark, 130);
const prunedRetry = settleRaidOwnerFarm(ledgerFarm, {
  ownerId: 'ledger', sessionId: 'ledger-room-1', encounterId: 1, runSequence: 1,
  outcome: 'aborted', raidWorld: null
});
assert.equal(prunedRetry.applied, false);
assert.equal(prunedRetry.receipt.status, 'compacted');
assert.equal(prunedRetry.farm, ledgerFarm);

const malformedFarmRun = reserveRaidRun(makeFarm('alice'), { sessionId: 'room-malformed' });
assert.throws(() => settleRaidOwnerFarm(malformedFarmRun.farm, {
  ownerId: 'alice', sessionId: 'room-malformed', encounterId: 1, outcome: 'defeat',
  runSequence: malformedFarmRun.runSequence,
  raidWorld: { raidRosters: [{ ownerId: 'alice', troops: [{ farmId: 1, species: 0, tier: 1, deployed: true }] }],
    units: [{ id: 1, ownerId: 'alice', farmId: 999, species: 0, tier: 1, hp: 0 }] }
}), /does not match/);
const mismatchFarm = makeFarm('alice');
mismatchFarm.units[0].species = 2;
const mismatchWorld = makeRaidWorld('alice', makeFarm('alice'));
const mismatchRun = reserveRaidRun(mismatchFarm, { sessionId: 'room-mismatch' });
assert.throws(() => settleRaidOwnerFarm(mismatchRun.farm, {
  ownerId: 'alice', sessionId: 'room-mismatch', encounterId: 1, runSequence: mismatchRun.runSequence,
  outcome: 'defeat', raidWorld: mismatchWorld
}), /no longer matches/);
assert.throws(() => settleRaidOwnerFarm(makeFarm('alice'), {
  ownerId: 'alice', sessionId: 'room', encounterId: 1, runSequence: 1, outcome: 'timeout', raidWorld: makeRaidWorld('alice', makeFarm('alice'))
}), /outcome/);
assert.throws(() => raidDeadFarmUnitIds(makeRaidWorld('alice', makeFarm('alice')), 'carol'), /exactly one roster/);

console.log('Raid owner settlement tests passed');
