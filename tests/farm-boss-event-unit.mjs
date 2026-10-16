import assert from 'node:assert/strict';

globalThis.BloomGamekitDeterministic = await import('../vendor/upstream/deterministic.js');
const {Garden, CONFIG} = await import('../src/farm-model.js');
const {snapshot, restore} = await import('../src/farm-state.js');
const {BOSS_REWARD_SETTINGS, bossAcquisitionChance, resolveBossAcquisition, settleBossKill} = await import('../src/boss-rewards.js');
const {UNIT_ABILITY_PROFILES} = await import('../src/unit-abilities.js');
const {raidRosterEntries} = await import('../src/raid-roster.js');

function advance(world, seconds, step = .01) {
  const count = Math.round(seconds / step);
  for (let i = 0; i < count; i++) world.step(step);
}

// Farm event payout uses the existing common chance once, with only the Farm multiplier.
assert.equal(BOSS_REWARD_SETTINGS.acquisitionChance, .2);
assert.equal(BOSS_REWARD_SETTINGS.farmEventAcquisitionMultiplier, 2);
assert.equal(bossAcquisitionChance(), .2);
assert.equal(bossAcquisitionChance({farmEvent: true}), .4);
assert.equal(bossAcquisitionChance({farmEvent: true, deploymentBonus: 50}), .4, 'deployment bonuses do not stack');
assert.equal(UNIT_ABILITY_PROFILES[3].kind, 'punch', 'Chestnut basic ability is its two-arm melee attack');
const xpCurve = new Garden(300);
settleBossKill(xpCurve,{encounterId:1,source:'farm',random:()=>.99});
assert.deepEqual([xpCurve.playerProgression.level,xpCurve.playerProgression.experience,xpCurve.playerProgression.availablePoints],[2,0,1]);
settleBossKill(xpCurve,{encounterId:2,source:'farm',random:()=>.99});
assert.deepEqual([xpCurve.playerProgression.level,xpCurve.playerProgression.experience,xpCurve.playerProgression.availablePoints],[2,100,1]);
settleBossKill(xpCurve,{encounterId:3,source:'farm',random:()=>.99});
assert.deepEqual([xpCurve.playerProgression.level,xpCurve.playerProgression.experience,xpCurve.playerProgression.availablePoints],[3,80,2],'next level uses the geometric 120 XP threshold and carries the remainder');

// Every generated food uses the same 1% replacement roll; existing bosses leave normal food.
assert.equal(CONFIG.farmBossEvent.spawnChance, .01);
assert.equal(CONFIG.farmBossEvent.fadeSeconds, .5);
assert.equal(CONFIG.farmBossEvent.celebrationSeconds, 1);
const event = new Garden(301);
event.random = () => 0;
event.scatter(1, 2);
assert.equal(event.food.length, 0, 'a successful event replaces its food');
assert.equal(event.farmBossEvent.phase, 'dropping');
assert.equal(event.boss.active, true);
assert.equal(event.boss.z, CONFIG.raid.dropHeight, 'boss begins above the target');
assert.equal(event.senseEnemy(event.units[0]), null, 'Farm units do not engage while the boss is dropping');
event.farmBossEvent.phase = 'fighting';
assert.equal(event.senseEnemy(event.units[0]), event.boss, 'Farm units engage after the landing transition');
event.farmBossEvent.phase = 'dropping';
assert.deepEqual([event.boss.hp, event.boss.maxHp, event.boss.radius, event.boss.height], [2400, 2400, CONFIG.raid.bossRadius, CONFIG.raid.bossHeight]);
assert.equal(restore(snapshot(event)).farmBossEvent.phase, 'dropping', 'an active event resumes from its saved phase');
event.scatter(1, 2);
assert.equal(event.food.length, 1, 'an already-present boss does not replace later food');
assert.equal(event.farmBossEvent.phase, 'dropping', 'a second boss cannot stack');

const threshold = new Garden(302);
threshold.random = () => CONFIG.farmBossEvent.spawnChance;
threshold.scatter(0, 0);
assert.equal(threshold.boss.active, false, 'the 1% threshold itself fails');
assert.equal(threshold.food.length, 1);
const ordinaryCrowd = new Garden(303);
for (let i = 0; i < 20; i++) ordinaryCrowd.spawn(i % 3, 1, i / 2, 0);
ordinaryCrowd.random = () => 0;
ordinaryCrowd.scatter(0, 0);
assert.deepEqual([ordinaryCrowd.boss.hp, ordinaryCrowd.boss.maxHp, ordinaryCrowd.boss.radius, ordinaryCrowd.boss.height], [event.boss.hp, event.boss.maxHp, event.boss.radius, event.boss.height], 'army size never scales event boss stats');

// Manual and automatic food generation share the same replacement path.
const manual = new Garden(304);
manual.random = () => 0;
manual.foodTaps.remainder = 4;
manual.tapFood('manual');
assert.equal(manual.foodTaps.produced, 1);
assert.equal(manual.farmBossEvent.phase, 'dropping');
assert.equal(manual.food.length, 0);
const automatic = new Garden(305);
automatic.random = () => 0;
for (let i = 0; i < 25; i++) automatic.advanceAutoTaps(.1);
assert.equal(automatic.foodTaps.produced, 1);
assert.equal(automatic.farmBossEvent.phase, 'dropping');
assert.equal(automatic.food.length, 0);

// A downed army loses locally; the event celebrates, fades, and returns to idle without raid state.
const defeat = new Garden(306);
defeat.units.forEach(unit => { unit.hp = 0; unit.down = CONFIG.corpseRecoverySeconds; });
defeat.random = () => 0;
defeat.scatter(0, 0);
assert.equal(defeat.scene, 'farm');
assert.equal(defeat.running, false, 'event does not set a global combat flag');
for (let i = 0; i < 100 && defeat.farmBossEvent.phase !== 'celebrating'; i++) defeat.step(.01);
assert.equal(defeat.farmBossEvent.phase, 'celebrating');
assert.equal(defeat.farmBossEvent.outcome, 'defeat');
assert.equal(defeat.boss.active, false);
assert.equal(restore(snapshot(defeat)).farmBossEvent.outcome, 'defeat', 'defeat celebration survives a save');
advance(defeat, CONFIG.farmBossEvent.celebrationSeconds);
assert.equal(defeat.farmBossEvent.phase, 'fading');
advance(defeat, CONFIG.farmBossEvent.fadeSeconds);
assert.equal(defeat.farmBossEvent.phase, 'idle');
assert.equal(defeat.boss.active, false);

// Defeating the boss takes the existing death path and fades out in the same Farm scene.
const victory = new Garden(307);
victory.random = () => 0;
victory.scatter(0, 0);
victory.farmBossEvent.phase = 'fighting';
victory.boss.z = 0;
victory.boss.hp = 0;
victory.step(.01);
assert.equal(victory.farmBossEvent.phase, 'celebrating');
assert.equal(victory.farmBossEvent.outcome, 'victory');
assert.equal(victory.boss.active, false);
assert.equal(restore(snapshot(victory)).farmBossEvent.outcome, 'victory', 'victory animation survives a save');
const chestnutReward = victory.units.find(unit => unit.species === 3);
assert(chestnutReward, 'a successful Farm reward roll grants the ordinary Chestnut troop');
assert.equal(chestnutReward.tier, 1);
assert.equal(chestnutReward.hp, 40, 'Chestnut reward uses shared ordinary T1 stats');
assert(victory.notices.some(notice => notice.kind === 'farm-boss-reward' && notice.acquired && notice.chance === .4));
assert.equal(victory.playerProgression.level,2,'a first boss kill reaches the first level');
assert.equal(victory.playerProgression.experience,0,'XP beyond the threshold carries forward');
assert.equal(victory.playerProgression.availablePoints,1,'level-up awards one shared point');
assert.equal(victory.playerProgression.processedBossKillReceipts[0],'farm:'+victory.farmBossEvent.encounterId);
assert.equal(victory.bossRewardReceipts[0].xpStatus,'awarded');
const victorySave = restore(snapshot(victory));
let duplicateRolls = 0;
const repeatedDecision = resolveBossAcquisition(victorySave,{encounterId:victorySave.farmBossEvent.encounterId,source:'farm',random:()=>{duplicateRolls++;return 0}});
assert.equal(repeatedDecision.status,'granted');
assert.equal(duplicateRolls,0,'a saved encounter receipt prevents rerolling after reload');
assert.equal(victorySave.units.filter(unit => unit.species === 3).length,1,'a restored granted reward is never duplicated');
const duplicateXp = settleBossKill(victorySave,{encounterId:victorySave.farmBossEvent.encounterId,source:'farm',random:()=>{duplicateRolls++;return .99}});
assert.equal(duplicateXp.awarded,false,'the persisted kill receipt prevents duplicate XP after reload');
assert.equal(victorySave.playerProgression.level,2);
assert.equal(victorySave.playerProgression.availablePoints,1);
assert.equal(duplicateRolls,0);
const raidRewardWorld = new Garden(315);
let raidGrantCalls = 0;
const raidReceipt = resolveBossAcquisition(raidRewardWorld,{encounterId:1,source:'raid',species:3,tier:1,random:()=>0,grantUnit:reward=>{raidGrantCalls++;return{id:2000001,species:reward.species,tier:reward.tier}}});
assert.equal(raidReceipt.status,'granted','the shared reward helper accepts a Raid-specific grant path');
assert.equal(raidGrantCalls,1);
const settledHistory = new Garden(316);
for(let encounterId=1;encounterId<=130;encounterId++)resolveBossAcquisition(settledHistory,{encounterId,source:'farm',random:()=>.99});
assert.equal(settledHistory.bossRewardReceipts.length,128,'only recent settled receipts need to be retained');
assert.equal(settledHistory.bossRewardWatermarks.farm,130);
assert.throws(()=>resolveBossAcquisition(settledHistory,{encounterId:1,source:'farm',random:()=>0}),/stale boss encounter/i,'a pruned encounter ID cannot be rolled again');
const longPending = new Garden(317);
longPending.nextBossEncounterId = 1026;
longPending.bossRewardWatermarks.farm = 1025;
longPending.bossRewardReceipts = Array.from({length:1025},(_,index)=>({encounterId:index+1,source:'farm',species:3,tier:1,x:0,y:0,chance:.4,roll:.01,status:'pending',unitId:0}));
assert.equal(restore(snapshot(longPending)).bossRewardReceipts.length,1025,'more than 1024 pending acquisitions remain saveable');
const invalidGrantedReceipt = new Garden(318);
invalidGrantedReceipt.nextBossEncounterId = 2;
invalidGrantedReceipt.bossRewardWatermarks.farm = 1;
invalidGrantedReceipt.bossRewardReceipts = [{encounterId:1,source:'farm',species:3,tier:1,x:0,y:0,chance:.4,roll:.01,status:'granted',unitId:999}];
assert.throws(()=>restore(snapshot(invalidGrantedReceipt)),/저장 데이터/,'a claimed Farm reward ID must belong to the saved allocation history');
const missedReward = new Garden(313);
missedReward.random = () => .4;
missedReward.nextBossEncounterId = 2;
missedReward.farmBossEvent = {phase:'fighting',elapsed:0,outcome:'fighting',encounterId:1,rewardStatus:'unresolved',rewardChance:0,rewardRoll:0,rewardUnitId:0};
missedReward.boss.active = true;
missedReward.boss.hp = 0;
missedReward.finishFarmBossEvent('victory');
assert(!missedReward.units.some(unit => unit.species === 3), 'the exact 40% roll boundary is not an acquisition');
assert(missedReward.notices.some(notice => notice.kind === 'farm-boss-reward' && !notice.acquired));
assert.equal(missedReward.playerProgression.experience,0,'a kill that misses its troop acquisition still earns XP');
assert.equal(missedReward.playerProgression.availablePoints,1);
// Full capacity keeps a successful acquisition pending until one slot is freed.
const queuedReward = new Garden(314);
queuedReward.progress.levels.capacity = 4;
while (queuedReward.units.length < queuedReward.capacity) queuedReward.spawn(0,1,0,0);
queuedReward.nextBossEncounterId = 2;
queuedReward.farmBossEvent = {phase:'fighting',elapsed:0,outcome:'fighting',encounterId:1,rewardStatus:'unresolved',rewardChance:0,rewardRoll:0,rewardUnitId:0};
queuedReward.boss.active = true;
queuedReward.boss.hp = 0;
queuedReward.random = () => 0;
queuedReward.finishFarmBossEvent('victory');
assert.equal(queuedReward.units.length,queuedReward.capacity);
assert.equal(queuedReward.farmBossEvent.rewardStatus,'pending');
const queuedReload=restore(snapshot(queuedReward));
assert.equal(queuedReload.bossRewardReceipts[0].status,'pending','pending reward persists across reload');
let pendingDuplicateRolls=0;
resolveBossAcquisition(queuedReload,{encounterId:1,source:'farm',random:()=>{pendingDuplicateRolls++;return .99}});
assert.equal(pendingDuplicateRolls,0,'a pending receipt also prevents rerolls after reload');
queuedReload.units.pop();
queuedReload.step(.01);
assert.equal(queuedReload.units.length,queuedReload.capacity);
assert.equal(queuedReload.units.filter(unit => unit.species === 3).length,1,'pending reward is delivered exactly once when room opens');
assert.equal(queuedReload.bossRewardReceipts[0].status,'granted');
const deliveredReload=restore(snapshot(queuedReload));
resolveBossAcquisition(deliveredReload,{encounterId:1,source:'farm',random:()=>0});
assert.equal(deliveredReload.units.filter(unit => unit.species === 3).length,1,'reload after delivery does not duplicate the Chestnut');
advance(victory, CONFIG.farmBossEvent.fadeSeconds * 2);
assert.equal(victory.farmBossEvent.phase, 'idle');

// Corpses cannot breed/merge, and merger pathfinding ignores them.
const breeding = new Garden(308);
const [deadMate, liveMate] = breeding.units;
deadMate.hp = 0;
deadMate.down = CONFIG.corpseRecoverySeconds;
assert.equal(breeding.pair(deadMate, liveMate), false);
const merging = new Garden(309);
merging.mode = 'merge';
const [merger, corpse] = merging.units;
merger.x = 0; merger.y = 0; merger.vx = merger.vy = 0;
corpse.x = -.2; corpse.y = 0; corpse.hp = 0; corpse.down = CONFIG.corpseRecoverySeconds;
const livingPeer = merging.spawn(merger.species, merger.tier, 6, 0);
livingPeer.growthDuration = CONFIG.breedGrowthSeconds;
livingPeer.growthElapsed = livingPeer.growthDuration;
merging.farmUnit(merger, .1);
assert(merger.vx > 0, 'a merger follows the living peer rather than the closer corpse');
assert.equal(merging.pair(merger, corpse), false);
assert.equal(merging.canMergePair(merger, livingPeer), true, 'a sleeping owned unit counts toward species protection');

// Raid rosters exclude sleepers; their source Farm units remain untouched.
const raidCandidates = new Garden(312);
raidCandidates.units[0].hp = 0;
raidCandidates.units[0].down = CONFIG.corpseRecoverySeconds;
const sleepingId = raidCandidates.units[0].id;
const raidEntries = raidRosterEntries(raidCandidates.units);
assert.equal(raidEntries.length, raidCandidates.units.length - 1);
assert(!raidEntries.some(([id]) => id === sleepingId));
assert.equal(raidCandidates.units.find(unit => unit.id === sleepingId).down, CONFIG.corpseRecoverySeconds, 'filtering does not heal or remove the source corpse');

// Timer is simulation-time based and save/restore preserves valid remaining time.
const recovery = new Garden(310);
const downed = recovery.units[0];
recovery.units = [downed];
downed.hp = 0;
downed.down = CONFIG.corpseRecoverySeconds;
advance(recovery, 12.5);
assert(Math.abs(downed.down - 47.5) < 1e-9);
const save = snapshot(recovery);
assert.equal(save.corpseRecoveryVersion, 1);
const restored = restore(save);
assert(Math.abs(restored.units[0].down - 47.5) < 1e-9, 'load does not restart the full 60-second timer');
advance(restored, 47.5);
assert(restored.units[0].hp > 0, 'corpse recovers after 60 simulation seconds total');
assert.equal(restored.units[0].down, 0);

// Older saves had no recovery-timer version and start the new full one-minute sleep once.
const legacy = snapshot(recovery);
delete legacy.corpseRecoveryVersion;
legacy.units[0].down = 1;
const migrated = restore(legacy);
assert.equal(migrated.corpseRecoveryVersion, 1);
assert.equal(migrated.units[0].down, CONFIG.corpseRecoverySeconds);
const unsupported = snapshot(recovery);
unsupported.corpseRecoveryVersion = 2;
assert.throws(() => restore(unsupported), TypeError, 'a future timer version must not be silently downgraded');
const impossibleFarmBoss = snapshot(new Garden(311));
impossibleFarmBoss.boss.active = true;
assert.throws(() => restore(impossibleFarmBoss), TypeError, 'an idle Farm boss cannot bypass the event state machine');

console.log('farm boss event and corpse unit checks passed');
