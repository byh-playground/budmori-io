import assert from 'node:assert/strict';
globalThis.BloomGamekitDeterministic = await import('../vendor/upstream/deterministic.js');

const { Garden, CONFIG } = await import('../src/farm-model.js');
const { snapshot, restore } = await import('../src/farm-state.js');
const { settleBossKill } = await import('../src/boss-rewards.js');
const { raidSettlementKey, reserveRaidRun, settleRaidOwnerFarm } = await import('../src/raid-settlement.js');
const { createAbilityRuntimeSnapshot } = await import('../src/ability-state.js');

// Exercise a real Garden snapshot through the same reservation, deterministic
// roster, battle casualty, reward/progression, and save-validator path used by
// the Farm app. The Raid's temporary IDs never become Farm roster entries.
const farm = new Garden(129);
const eligibleEntries = farm.units.map(unit => [unit.id, unit.species, unit.tier]);
const reserved = reserveRaidRun(snapshot(farm));
const reservedGarden = restore(reserved.farm);
assert.equal(reservedGarden.activeRaidRunSequence, reserved.runSequence);

const raid = Garden.createRaidBattle(903, ['solo']);
assert.equal(raid.registerRaidRoster(
  'solo', eligibleEntries, createAbilityRuntimeSnapshot(reservedGarden.playerProgression),
  { sessionId: reserved.sessionId, runSequence: reserved.runSequence, encounterId: reserved.runSequence }
), true);
assert.equal(restore(snapshot(raid)).raidRoster('solo').settlementSessionId, reserved.sessionId,
  'the owner-scoped Farm run key survives deterministic Raid snapshots');
assert.equal(raid.deployNextRaidUnit('solo', 1, -4, 2), true);
const deployed = raid.units[0];
assert.equal(deployed.farmId, raid.raidRoster('solo').troops[0].farmId);
deployed.hp = 0;

const rewardKey = raidSettlementKey({ ownerId: 'solo', sessionId: reserved.sessionId, encounterId: reserved.runSequence });
const result = settleRaidOwnerFarm(snapshot(reservedGarden), {
  ownerId: 'solo',
  sessionId: reserved.sessionId,
  encounterId: reserved.runSequence,
  runSequence: reserved.runSequence,
  outcome: 'victory',
  raidWorld: snapshot(raid),
  completedAtMs: 1000,
  settleVictory: ({ farm: privateFarm, receiptKey, deploymentMultiplier }) => {
    assert.equal(receiptKey, rewardKey);
    assert.equal(deploymentMultiplier, 1.5, 'one of two eligible originals deployed');
    const garden = restore(privateFarm);
    const resolved = settleBossKill(garden, {
      encounterId: reserved.runSequence,
      source: 'raid',
      receiptKey,
      acquisitionMultiplier: deploymentMultiplier,
      random: () => 0,
      species: 3,
      tier: 1,
      x: 0,
      y: 0
    });
    return {
      farm: snapshot(garden),
      summary: {
        acquisition: { status: resolved.receipt.status, chance: resolved.receipt.chance, receiptKey: resolved.receipt.receiptKey },
        xp: { status: resolved.receipt.xpStatus, amount: resolved.receipt.xpAmount, receiptKey: resolved.receipt.xpReceiptKey }
      }
    };
  }
});

const saved = restore(result.farm);
assert.equal(result.applied, true);
assert.deepEqual(result.receipt.sleptFarmUnitIds, [deployed.farmId]);
assert.equal(saved.units.find(unit => unit.id === deployed.farmId).down, 60,
  'Raid casualty returns to the original Farm unit and starts its recovery timer');
assert.equal(saved.playerProgression.level, 2, 'one 100 XP Raid boss kill reaches level 2');
assert.equal(saved.playerProgression.availablePoints, 1, 'the Raid award carries its shared ability point into the Farm wallet');
assert.deepEqual(saved.playerProgression.processedBossKillReceipts, [rewardKey]);
assert.equal(saved.bossRewardReceipts[0].receiptKey, rewardKey);
assert.ok(Math.abs(saved.bossRewardReceipts[0].chance - 0.3) < 1e-12, 'deployment scaling affects acquisition chance only');
assert.equal(saved.bossRewardReceipts[0].xpAmount, 100, 'deployment scaling never changes the XP award');
assert.equal(saved.raidSettlementReceipts[0].key, rewardKey);
assert.equal(saved.activeRaidRunSequence, null);
assert.equal(saved.raidSettlementWatermark, reserved.runSequence);

// A 0.5 save predating the settlement ledger still migrates from the common
// Raid reward watermark without changing Farm ownership or inventing a run.
const legacy = snapshot(new Garden(130));
for (const key of ['nextRaidRunSequence', 'activeRaidRunSequence', 'activeRaidSessionId', 'raidSettlementWatermark', 'raidSettlementReceipts']) {
  delete legacy[key];
}
const migrated = restore(legacy);
assert.equal(migrated.nextRaidRunSequence, migrated.bossRewardWatermarks.raid);
assert.equal(migrated.raidSettlementWatermark, migrated.bossRewardWatermarks.raid);
assert.equal(migrated.activeRaidRunSequence, null);
assert.deepEqual(migrated.raidSettlementReceipts, []);

console.log('Raid settlement Farm model, wallet, and save integration checks passed');
