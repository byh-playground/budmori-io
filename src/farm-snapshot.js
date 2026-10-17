// Storage-owned fallback values for the supported additive 0.4–0.7 formats.
// These are not live entity defaults. Changing a runtime constructor must not
// change either the save field set or how an older save fills missing fields.
export const UNIT_SNAPSHOT_SHAPE = {
  x:0,y:0,z:0,vx:0,vy:0,vz:0,angle:0,stun:0,flash:0,bounce:0,
  ability:{phase:'idle',elapsed:0,action:null},id:1,species:0,tier:1,faction:'player',
  meals:0,growth:0,growthElapsed:0,growthDuration:5,age:0,cooldown:0,
  cooldownDuration:0,mateId:0,perceptionRange:18,home:{x:0,y:0},hp:40,down:0,
  seed:2.39996,ownerId:'',farmId:0,dropLanded:true,isBattleOnlySummon:false,
  battleSummonKind:'',battleSummonParentId:0,battleSummonEncounterId:0,
  countsTowardPermanentRoster:true,eligibleForRaidDeployment:true,
  breedingEligible:true,mergeEligible:true,canSplit:true,splitUsedThisBattle:false,
  deathSplitHandled:false,usesPersistentSleep:true,lifetime:'',chestnutBasicCycles:0,
  landingRecovery:0,walnutEmpoweredNextBasic:false,wheatCommandUntil:0,
  wheatCommandCritBonus:0,barleyArmorBreakUntil:0,barleyArmorBreakReduction:0
};

const legacyStarter = (id,x,y) => ({...UNIT_SNAPSHOT_SHAPE,
  id,x,y,home:{x,y},seed:id*2.39996,growth:3,growthElapsed:5,
  ability:{phase:'idle',elapsed:0,action:null}
});
const patternValues=value=>Object.fromEntries([
  'attack.sweep-360','attack.front-slam','attack.charge','attack.leap-slam',
  'attack.fan-sweep','summon.mouth-t1'
].map(id=>[id,value]));
const abilityInvestments=()=>Object.fromEntries([
  'pea-death-split','corn-burst-fire','corn-popcorn-chain','chestnut-spike-fan',
  'kidney-continuous-leap','kidney-landing-shockwave','peanut-separated-assault',
  'walnut-guard-slam','rice-low-health-harvest','wheat-command-crit','barley-armor-break'
].map(id=>[id,{rootUnlocked:false,powerLevel:0,gradeLevel:0}]));

export const FARM_SNAPSHOT_SHAPE = {
  seed:731,
  notices:[],
  eventSequence:0,
  mergeTask:null,
  corpseRecoveryVersion:1,
  rng:{"state":3031296687},
  units:[legacyStarter(1,1.7868577390909195,-0.7556014072615653),legacyStarter(2,-1.5288560669869184,-0.5486694728024304)],
  food:[],
  effects:[],
  events:[],
  time:0,
  nextId:3,
  nextBossEncounterId:1,
  bossRewardReceipts:[],
  bossRewardWatermarks:{"farm":0,"raid":0},
  nextRaidRunSequence:0,
  activeRaidRunSequence:null,
  activeRaidSessionId:null,
  raidSettlementWatermark:0,
  raidSettlementReceipts:[],
  playerProgression:{schemaVersion:1,availablePoints:0,farmUpgrades:{food:0,growth:0,breed:0,merge:0,capacity:0},abilities:abilityInvestments(),level:1,experience:0,processedBossKillReceipts:[]},
  starter:0,
  foodTaps:{"remainder":0,"autoClock":0,"produced":0,"revision":0},
  projectiles:[],
  attackSerial:0,
  projectileSerial:0,
  raidSummonSerial:0,
  bossSummonSerial:0,
  combatLog:[],
  farmBossProgress:{currentStage:1,encounterSeed:2738959287,encounterEpoch:0,nextSelectionId:1,selections:[]},
  mode:"breed",
  scene:"farm",
  running:false,
  encounter:{"outcome":"idle","elapsed":0},
  farmBossEvent:{"phase":"idle","elapsed":0,"outcome":"idle","encounterId":0,"rewardStatus":"none","rewardChance":0,"rewardRoll":0,"rewardUnitId":0},
  boss:{"x":0,"y":0,"faction":"enemy","z":0,"radius":4.4,"height":5.2,"hp":2000,"maxHp":2000,"species":3,"attackPower":4,"stage":0,"moveSpeed":2.65,"encounterId":0,"active":false,"angle":0,"facing":0,"flash":0,"swings":0,"basicCount":0,"attackId":0,"sweepClock":0,"startAngle":0,"travel":0,"patternRuntime":{weights:patternValues(1),cooldowns:patternValues(0),active:null,encounterElapsed:0},"airborneRecovery":0,"barleyArmorBreakUntil":0,"barleyArmorBreakReduction":0,"summonMouth":{"x":0,"y":0,"z":0}},
  raidExpectedPlayers:["solo"],
  raidRosters:[],
  raidDeploymentStarted:false,
  metrics:{"births":0,"merges":0,"directHits":0,"contacts":0,"landings":0,"basicHits":0,"sweepHits":0},
};

// Only these later-added Unit fields have a constant legacy fallback. Required
// original fields still fail validation instead of being silently fabricated.
export const LEGACY_UNIT_DEFAULT_KEYS = Object.freeze([
  'walnutEmpoweredNextBasic','wheatCommandUntil','wheatCommandCritBonus',
  'barleyArmorBreakUntil','barleyArmorBreakReduction','isBattleOnlySummon',
  'battleSummonKind','battleSummonParentId','battleSummonEncounterId',
  'countsTowardPermanentRoster','eligibleForRaidDeployment','breedingEligible',
  'mergeEligible','canSplit','splitUsedThisBattle','deathSplitHandled',
  'usesPersistentSleep','lifetime','chestnutBasicCycles','landingRecovery',
  'growthDuration','mateId','perceptionRange','ownerId','farmId','dropLanded'
]);

// A recipe selects persisted fields even when an entity gains enumerable
// caches, backreferences, or rendering helpers. Nullable/optional records and
// arrays have explicit recipes too; no runtime object is JSON-stringified.
const fields = (names, nested={}) => ({...Object.fromEntries(names.split(' ').filter(Boolean).map(key=>[key,true])),...nested});
function shapeFields(shape, nested={}) {
  return Object.fromEntries(Object.entries(shape).map(([key,value])=>[key,
    nested[key] ?? (Array.isArray(value)?[true]:value&&typeof value==='object'?shapeFields(value):true)
  ]));
}
const point=fields('x y z id');
const path=fields('height duration',{from:point,to:point});
const popcorn=fields('species fuseSeconds chainOnPopcornContact triggersOncePerProjectile eachTargetAtMostOncePerProjectile damageMultiplier radiusBaseRangeFraction radiusMultiplier radius');
const attack=fields('id targetId hit resolvedMask hitMask peanutStrikeCount peanutAttackMultiplier peanutSpreadRadians walnutEmpowered walnutGuardUsed',{
  target:point,path,pendingShots:[fields('shotIndex delaySeconds attackMultiplier')],projectileAbility:{popcorn}
});
const unit=shapeFields(UNIT_SNAPSHOT_SHAPE,{ability:{phase:true,elapsed:true,action:attack}});
const bossAction=fields('id phase phaseElapsed targetId aim locked traveled volleyCount released nextRelease',{
  target:point,start:point,path,hitIds:[true],landingPoints:[point]
});
const boss=shapeFields(FARM_SNAPSHOT_SHAPE.boss,{
  patternRuntime:shapeFields(FARM_SNAPSHOT_SHAPE.boss.patternRuntime,{active:bossAction})
});
const drop=fields('roll status unitId');
const reward=fields('encounterId source receiptKey acquisitionMultiplier species tier x y chance roll status unitId rollCount xpReceiptKey xpStatus xpAmount levelsGained pointsAwarded',{drops:[drop]});
// Events, notices, effects and log entries are value payloads, not entities.
// Their APIs and settlement summaries accept extensible JSON records. Keep
// that explicit open contract, including old keys, without opening entity,
// ability or projectile field selection to future runtime caches.
const jsonPayload=Symbol('json-payload');
const settlement=fields('key ownerId sessionId encounterId runSequence outcome status completedAtMs availableAtStart originalUnitsDeployed deploymentMultiplier',{
  sleptFarmUnitIds:[true],reward:jsonPayload
});
const progression=shapeFields(FARM_SNAPSHOT_SHAPE.playerProgression);
const runtimeProgression=fields('schemaVersion level availablePoints',{
  farmUpgrades:progression.farmUpgrades,abilities:progression.abilities
});
const roster=fields('ownerId settlementSessionId settlementRunSequence settlementEncounterId lastDeploySequence buffUntil buffReadyAt',{
  troops:[fields('farmId species tier deployed')],abilitySnapshot:runtimeProgression
});
const projectile=fields('id owner targetId faction ownerId species tier elapsed x y z radius height hit attackMultiplier shotIndex projectileKind fanIndex isPopcorn landed exploded fuseRemaining explosionLife',{
  path,popcornConfig:popcorn,damagedTargetIds:[true]
});
const SNAPSHOT_FIELDS=shapeFields(FARM_SNAPSHOT_SHAPE,{
  units:[unit],boss,playerProgression:progression,raidRosters:[roster],
  projectiles:[projectile],bossRewardReceipts:[reward],raidSettlementReceipts:[settlement],
  food:[fields('x y z vx vy vz seed phase tx ty')],
  events:[jsonPayload],effects:[jsonPayload],notices:[jsonPayload],combatLog:[jsonPayload],
  farmBossProgress:shapeFields(FARM_SNAPSHOT_SHAPE.farmBossProgress,{selections:[fields('stage species selectionId')]}),
  mergeTask:fields('phase aId bId elapsed duration resultId sourceSpecies sourceTier',{materialIds:[true]})
});
function copyJsonPayload(value,depth=0) {
  if(depth>=18)throw new TypeError('올바른 농장 저장 데이터가 아닙니다.');
  if(value===null||typeof value==='string'||typeof value==='boolean')return value;
  if(typeof value==='number')return Number.isFinite(value)?(value===0?0:value):null;
  if(Array.isArray(value))return Array.from(value,item=>item===undefined?null:copyJsonPayload(item,depth+1));
  if(!value||typeof value!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new TypeError('올바른 농장 저장 데이터가 아닙니다.');
  return Object.fromEntries(Object.entries(value).filter(([,item])=>item!==undefined).map(([key,item])=>[key,copyJsonPayload(item,depth+1)]));
}
function copyFields(value,recipe) {
  if(value===null)return null;
  if(recipe===jsonPayload)return copyJsonPayload(value);
  if(recipe===true){
    if(typeof value==='number')return Number.isFinite(value)?(value===0?0:value):null;
    if(typeof value==='string'||typeof value==='boolean')return value;
    throw new TypeError('올바른 농장 저장 데이터가 아닙니다.');
  }
  if(Array.isArray(recipe)){
    if(!Array.isArray(value)&&!(value instanceof Set))throw new TypeError('올바른 농장 저장 데이터가 아닙니다.');
    return Array.from(value,item=>copyFields(item,recipe[0]));
  }
  if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError('올바른 농장 저장 데이터가 아닙니다.');
  const result={};
  for(const [key,child] of Object.entries(recipe))if(Object.hasOwn(value,key)&&value[key]!==undefined)result[key]=copyFields(value[key],child);
  return result;
}
export function snapshot(world){return copyFields(world,SNAPSHOT_FIELDS)}
