import assert from "node:assert/strict";

globalThis.BloomGamekitDeterministic = await import("../vendor/upstream/deterministic.js");
const { Garden, Unit } = await import("../src/farm-model.js");
const { abilityProfile } = await import("../src/unit-abilities.js");
const { createAbilityProgressionState, purchaseAbilityNode } = await import("../src/ability-tree.js");
const { createAbilityRuntimeSnapshot } = await import("../src/ability-state.js");
const { createPlayerProgressionState, awardBossKillXp } = await import("../src/player-progression.js");
const { snapshot, restore } = await import("../src/farm-state.js");
const { getCornBurstConfig, createCornBurstShotSchedule } = await import("../src/species-abilities.js");

const farmContext = { location: "farm", inCombat: false, highestSpeciesTier: { 1: 3 } };
const aliceProgress = purchaseAbilityNode(createAbilityProgressionState({ availablePoints: 1 }), "corn-burst-fire", "root", farmContext);
assert.equal(aliceProgress.ok, true);
const progressionByOwner = new Map([
  ["alice", aliceProgress.state],
  ["bob", createAbilityProgressionState()]
]);

const world = new Garden(941);
world.units = [];
world.scene = "raid";
world.running = true;
world.projectiles = [];
world.combatLog = [];
const aliceCorn = new Unit(101, 1, 3, 0, 0);
Object.assign(aliceCorn, { ownerId: "alice", farmId: 1 });
const bobCorn = new Unit(102, 1, 3, 0, 0);
Object.assign(bobCorn, { ownerId: "bob", farmId: 2 });
world.units = [aliceCorn, bobCorn];

assert.equal(getCornBurstConfig(progressionByOwner.get(aliceCorn.ownerId), aliceCorn.tier).projectileCount, 2);
assert.equal(getCornBurstConfig(progressionByOwner.get(bobCorn.ownerId), bobCorn.tier), null,
  "a Raid ability snapshot is read per owner, not shared across all troops");

// Run the actual deterministic Garden AttackCycle for Alice's corn, and compare
// the ability's scheduled volley against its next existing attack-preparation.
const dt = 1 / 120;
const profile = abilityProfile(aliceCorn.species);
const config = getCornBurstConfig(progressionByOwner.get(aliceCorn.ownerId), aliceCorn.tier);
const schedule = createCornBurstShotSchedule(config, {
  // The lob's existing AttackCycle launches and immediately enters recovery,
  // so its post-launch active portion is zero; preserve the actual cooldown.
  activeSeconds: 0,
  recoverySeconds: profile.recovery
});
assert.equal(aliceCorn.ability.begin(world, { x: 4, y: 0 }), true);
let ticks = 0;
while (aliceCorn.ability.phase !== "idle" && ticks++ < 1000) {
  world.time += dt;
  aliceCorn.ability.update(world, dt);
}
assert.ok(ticks < 1000, "the real Garden attack cycle reaches readiness");
const firstLaunch = world.combatLog.find(event => event.kind === "launch" && event.unit === aliceCorn.id);
assert.ok(firstLaunch, "the real Garden attack cycle launches the base lob");
const nextPrepareTime = world.time;
assert.ok(schedule.at(-1).delaySeconds < nextPrepareTime - firstLaunch.time,
  "all spaced corn shots fit before the existing attack cycle is ready again");
assert.equal(aliceCorn.ability.begin(world, { x: 4, y: 0 }), true);
const preparations = world.combatLog.filter(event => event.kind === "prepare" && event.unit === aliceCorn.id);
assert.equal(preparations.length, 2);
assert.equal(preparations[1].time, nextPrepareTime);

console.log("Ability-tree Garden attack-cycle and per-owner unit checks passed.");

// The real Raid death hook creates only temporary, owner-tagged T1 pea children.
let peaOwnerWallet = awardBossKillXp(createPlayerProgressionState(), "pea-root-unlock").state;
const peaRoot = purchaseAbilityNode(peaOwnerWallet, "pea-death-split", "root", {
  location: "farm", highestSpeciesTier: { 0: 3 }
});
assert.equal(peaRoot.ok, true);
peaOwnerWallet = peaRoot.state;
const splitRaid = Garden.createRaidBattle(942, ["alice"]);
assert.equal(splitRaid.registerRaidRoster("alice", [[1, 0, 3]], createAbilityRuntimeSnapshot(peaOwnerWallet)), true);
assert.equal(splitRaid.deployNextRaidUnit("alice", 1, 0, 0), true);
const splitParent = splitRaid.units[0];
splitParent.hp = 0;
splitParent.down = 0;
splitRaid.step(dt);
const splitChildren = splitRaid.units.filter(unit => unit.isBattleOnlySummon);
assert.equal(splitChildren.length, 2, "a lethal real Garden tick creates exactly the owner's two T1 children");
assert(splitChildren.every(child => child.ownerId === "alice" && child.farmId === 1 && child.species === 0 && child.tier === 1));
assert(splitChildren.every(child => child.canSplit === false && child.countsTowardPermanentRoster === false && child.eligibleForRaidDeployment === false));
splitChildren[0].hp = 0;
splitRaid.handleUnitDeath(splitChildren[0]);
assert.equal(splitRaid.units.includes(splitChildren[0]), false, "a battle-only child disappears when it dies and cannot re-split");
assert.equal(splitRaid.units.filter(unit => unit.isBattleOnlySummon).length, 1);
assert.equal(restore(snapshot(splitRaid)).units.filter(unit => unit.isBattleOnlySummon).length, 1,
  "an in-progress Raid snapshot after a child death remains restorable");
splitRaid.finish("victory");
assert.equal(splitRaid.units.some(unit => unit.isBattleOnlySummon), false, "living split children are removed when the Raid ends");

// The snapshot walker must honor the explicitly higher battle-unit/projectile
// caps. 300 original T1 peas and 210 four-child splits produce >1,024 valid units.
let uncommonPeaWallet = createPlayerProgressionState();
for (let index = 0; index < 8; index++) uncommonPeaWallet = awardBossKillXp(uncommonPeaWallet, `pea-tier-${index}`).state;
for (const nodeId of ["root", "power-1", "power-2", "grade-1", "grade-2"]) {
  const purchase = purchaseAbilityNode(uncommonPeaWallet, "pea-death-split", nodeId, {
    location: "farm", highestSpeciesTier: { 0: 3 }
  });
  assert.equal(purchase.ok, true);
  uncommonPeaWallet = purchase.state;
}
const largeRaid = Garden.createRaidBattle(943, ["owner-a", "owner-b", "owner-c"]);
const largeRoster = Array.from({ length: 100 }, (_, index) => [index + 1, 0, 1]);
for (const ownerId of largeRaid.raidExpectedPlayers) {
  assert.equal(largeRaid.registerRaidRoster(ownerId, largeRoster, createAbilityRuntimeSnapshot(uncommonPeaWallet)), true);
}
for (const [ownerSlot, ownerId] of largeRaid.raidExpectedPlayers.entries()) {
  for (let sequence = 1; sequence <= largeRoster.length; sequence++) {
    assert.equal(largeRaid.deployNextRaidUnit(ownerId, sequence, -8 + ownerSlot * 8, 8), true, `${ownerId} deploy ${sequence}`);
  }
}
for (const parent of largeRaid.units.slice(0, 210)) {
  parent.hp = 0;
  parent.down = 0;
  assert.equal(largeRaid.handleUnitDeath(parent), true);
}
assert.equal(largeRaid.units.length, 1140);
const syntheticPath = { from: { x: 0, y: 0, z: 0 }, to: { x: 1, y: 0, z: 0 }, height: 1, duration: 1 };
largeRaid.projectiles = Array.from({ length: 1025 }, (_, index) => ({
  id: index + 1, owner: largeRaid.units[0].id, species: 0, tier: 1, path: syntheticPath,
  elapsed: 0, x: 0, y: 0, z: 0, radius: .1, height: .2, hit: false,
  attackMultiplier: 1, shotIndex: 0
}));
largeRaid.projectileSerial = largeRaid.projectiles.length;
const restoredLargeRaid = restore(snapshot(largeRaid));
assert.equal(restoredLargeRaid.units.length, 1140, "a legal split-expanded Raid roster above 1,024 units restores");
assert.equal(restoredLargeRaid.projectiles.length, 1025, "legal Raid projectile arrays above 1,024 restore");
