import {Garden,Unit,CONFIG} from './farm-model.js';
import {createPlayerProgressionState,isValidPlayerProgressionState} from './player-progression.js';
import {BOSS_REWARD_SETTINGS} from './boss-rewards.js';

const fail=()=>{throw new TypeError('올바른 농장 진행 저장 데이터가 아닙니다.')};
const assert=value=>{if(!value)fail()};
const integer=(value,min=0,max=1e12)=>Number.isSafeInteger(value)&&value>=min&&value<=max;
const number=(value,min=0,max=1e12)=>Number.isFinite(value)&&value>=min&&value<=max;
const string=value=>typeof value==='string'&&value.trim().length>0&&value.length<256;
function keys(value,required,optional=[]){assert(value&&typeof value==='object'&&!Array.isArray(value));assert(required.every(key=>Object.hasOwn(value,key)));assert(Object.keys(value).every(key=>required.includes(key)||optional.includes(key)))}
function copyPlayer(player){return{schemaVersion:player.schemaVersion,level:player.level,experience:player.experience,availablePoints:player.availablePoints,farmUpgrades:{...player.farmUpgrades},abilities:Object.fromEntries(Object.entries(player.abilities).map(([id,build])=>[id,{rootUnlocked:build.rootUnlocked,powerLevel:build.powerLevel,gradeLevel:build.gradeLevel}])),processedBossKillReceipts:[...player.processedBossKillReceipts]}}
const rewardExtras=['acquisitionMultiplier','xpReceiptKey','xpStatus','xpAmount','levelsGained','pointsAwarded'];
function pendingReward(reward){
 const rolls=reward.drops?reward.drops.filter(drop=>drop.status==='pending').map(drop=>drop.roll):[reward.roll];
 const result={encounterId:reward.encounterId,source:reward.source,receiptKey:reward.receiptKey||`${reward.source}:${reward.encounterId}`,species:reward.species,tier:reward.tier,chance:reward.chance,rolls};
 for(const key of rewardExtras)if(reward[key]!==undefined)result[key]=reward[key];
 return result;
}
function cohortValues(unit){return [unit.species,unit.tier,unit.meals>=1,Math.max(0,unit.growthDuration-unit.growthElapsed),unit.growthDuration,unit.cooldown,unit.cooldownDuration,unit.hp<=0?unit.down:0]}
// One disk contract: progress counts and entitlements, never the live world.
// Equal species/tier/fed/timer cohorts collapse to one count. Timers pause while
// offline, matching the Farm simulation; there is no wall-clock progression.
export function captureFarmProgress(world){
 assert(world.scene==='farm');
 const groups=new Map();
 for(const unit of world.units){
  if(unit.isBattleOnlySummon||unit.countsTowardPermanentRoster===false||unit.faction!=='player')continue;
  const [species,tier,fed,growth,duration,cooldown,cooldownDuration,rest]=cohortValues(unit);
  const key=[species,tier,Number(fed),growth,growth?duration:0,cooldown,cooldown?cooldownDuration:0,rest].join(':');
  const previous=groups.get(key);if(previous){previous.count++;continue}
  const row={species,tier,count:1};if(fed)row.fed=true;if(growth>0)row.growth={remaining:growth,duration};if(cooldown>0)row.cooldown={remaining:cooldown,duration:cooldownDuration};if(rest>0)row.rest=rest;
  groups.set(key,row);
 }
 const roster=[...groups.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([,row])=>row),stage=world.farmBossProgress;
 return{seed:world.seed,rngState:world.rng.state,mode:world.mode,player:copyPlayer(world.playerProgression),roster,
  food:{count:world.food.length,remainder:world.foodTaps.remainder,produced:world.foodTaps.produced},totals:{births:world.metrics.births,merges:world.metrics.merges},
  bossStages:{currentStage:stage.currentStage,encounterSeed:stage.encounterSeed,encounterEpoch:stage.encounterEpoch,nextSelectionId:stage.nextSelectionId,selections:stage.selections.map(({stage,species,selectionId})=>({stage,species,selectionId}))},
  ledger:{boss:{nextEncounterId:world.nextBossEncounterId,settledThrough:{...world.bossRewardWatermarks},pendingRewards:world.bossRewardReceipts.filter(reward=>reward.status==='pending').map(pendingReward)},raid:{nextRunSequence:world.nextRaidRunSequence,activeRun:world.activeRaidRunSequence===null?null:{sequence:world.activeRaidRunSequence,sessionId:world.activeRaidSessionId},settledThrough:world.raidSettlementWatermark}}
 };
}
export function validateFarmProgress(data){
 keys(data,['seed','rngState','mode','player','roster','food','totals','bossStages','ledger']);assert(integer(data.seed,0,0xffffffff)&&integer(data.rngState,0,0xffffffff)&&['breed','merge'].includes(data.mode));
 const player=data.player,defaults=createPlayerProgressionState();keys(player,Object.keys(defaults));keys(player.farmUpgrades,Object.keys(defaults.farmUpgrades));keys(player.abilities,Object.keys(defaults.abilities));
 for(const build of Object.values(player.abilities))keys(build,['rootUnlocked','powerLevel','gradeLevel']);
 assert(isValidPlayerProgressionState(player)&&integer(player.level,1)&&number(player.experience)&&Array.isArray(player.processedBossKillReceipts)&&player.processedBossKillReceipts.length<=100000&&player.processedBossKillReceipts.every(string));
 assert(Array.isArray(data.roster)&&data.roster.length<=CONFIG.farm.capacity.max);let count=0;const cohorts=new Set();
 for(const row of data.roster){
  keys(row,['species','tier','count'],['fed','growth','cooldown','rest']);assert(integer(row.species,0,CONFIG.unit.speciesCount-1)&&integer(row.tier,1,CONFIG.unit.maxTier)&&integer(row.count,1,CONFIG.farm.capacity.max));count+=row.count;
  if(Object.hasOwn(row,'fed'))assert(row.fed===true);
  for(const key of ['growth','cooldown'])if(Object.hasOwn(row,key)){keys(row[key],['remaining','duration']);assert(number(row[key].remaining,Number.MIN_VALUE,100000)&&number(row[key].duration,row[key].remaining,100000))}
  if(Object.hasOwn(row,'rest'))assert(number(row.rest,Number.MIN_VALUE,CONFIG.unit.corpseRecoverySeconds));
  const signature=[row.species,row.tier,Number(!!row.fed),row.growth?.remaining||0,row.growth?.duration||0,row.cooldown?.remaining||0,row.cooldown?.duration||0,row.rest||0].join(':');assert(!cohorts.has(signature));cohorts.add(signature);
 }
 assert(count<=CONFIG.farm.capacity.max);keys(data.food,['count','remainder','produced']);assert(integer(data.food.count,0,140)&&integer(data.food.remainder,0,4)&&integer(data.food.produced));keys(data.totals,['births','merges']);assert(integer(data.totals.births)&&integer(data.totals.merges));
 const stage=data.bossStages;keys(stage,['currentStage','encounterSeed','encounterEpoch','nextSelectionId','selections']);assert(integer(stage.currentStage,1,BOSS_REWARD_SETTINGS.maxStage)&&integer(stage.encounterSeed,0,0xffffffff)&&integer(stage.encounterEpoch)&&integer(stage.nextSelectionId,1)&&Array.isArray(stage.selections)&&stage.selections.length<=BOSS_REWARD_SETTINGS.maxStage);
 const stages=new Set(),selections=new Set();for(const entry of stage.selections){keys(entry,['stage','species','selectionId']);assert(integer(entry.stage,1,BOSS_REWARD_SETTINGS.maxStage)&&integer(entry.species,0,CONFIG.unit.speciesCount-1)&&integer(entry.selectionId,1,stage.nextSelectionId-1)&&!stages.has(entry.stage)&&!selections.has(entry.selectionId));stages.add(entry.stage);selections.add(entry.selectionId)}
 const ledger=data.ledger;keys(ledger,['boss','raid']);const boss=ledger.boss,raid=ledger.raid;keys(boss,['nextEncounterId','settledThrough','pendingRewards']);keys(boss.settledThrough,['farm','raid']);keys(raid,['nextRunSequence','activeRun','settledThrough']);
 assert(integer(boss.settledThrough.farm)&&integer(boss.settledThrough.raid)&&integer(boss.nextEncounterId,boss.settledThrough.farm+1)&&integer(raid.nextRunSequence)&&integer(raid.settledThrough,boss.settledThrough.raid,raid.nextRunSequence));
 if(raid.activeRun===null)assert(raid.nextRunSequence===raid.settledThrough);
 else{keys(raid.activeRun,['sequence','sessionId']);assert(integer(raid.activeRun.sequence,1)&&raid.activeRun.sequence===raid.nextRunSequence&&raid.activeRun.sequence===raid.settledThrough+1&&string(raid.activeRun.sessionId)&&raid.activeRun.sessionId.length<=128)}
 assert(Array.isArray(boss.pendingRewards)&&boss.pendingRewards.length<=100000);const receipts=new Set(),encounters=new Set();
 for(const reward of boss.pendingRewards){
  keys(reward,['encounterId','source','receiptKey','species','tier','chance','rolls'],rewardExtras);assert(['farm','raid'].includes(reward.source)&&integer(reward.encounterId,1,boss.settledThrough[reward.source])&&string(reward.receiptKey)&&!receipts.has(reward.receiptKey)&&integer(reward.species,0,CONFIG.unit.speciesCount-1)&&integer(reward.tier,1,CONFIG.unit.maxTier)&&number(reward.chance,0,1));receipts.add(reward.receiptKey);const encounter=`${reward.source}:${reward.encounterId}`;assert(!encounters.has(encounter));encounters.add(encounter);
  assert(Array.isArray(reward.rolls)&&reward.rolls.length>0&&reward.rolls.length<=BOSS_REWARD_SETTINGS.maxStage&&reward.rolls.every(roll=>number(roll,0,1)&&roll<reward.chance));
  if(reward.acquisitionMultiplier!==undefined)assert(number(reward.acquisitionMultiplier,0,2));if(reward.xpReceiptKey!==undefined)assert(string(reward.xpReceiptKey));if(reward.xpStatus!==undefined)assert(['awarded','already-awarded','unsettled'].includes(reward.xpStatus));for(const key of ['xpAmount','levelsGained','pointsAwarded'])if(reward[key]!==undefined)assert(number(reward[key]));
 }
 return true;
}
// Deep value comparison occurs only at an actual save boundary. No JSON
// serialization, entity snapshot, or storage write is needed for equal progress.
export function sameFarmProgress(a,b){if(a===b)return true;if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;const keysA=Object.keys(a),keysB=Object.keys(b);return keysA.length===keysB.length&&keysA.every(key=>Object.hasOwn(b,key)&&sameFarmProgress(a[key],b[key]))}
function position(index,count,seed,scale){const angle=index*2.399963229728653+(seed%6283)/1000,radius=Math.sqrt((index+.5)/Math.max(1,count))*scale;return{x:Math.cos(angle)*CONFIG.farm.arena.radiusX*radius,y:Math.sin(angle)*CONFIG.farm.arena.radiusY*radius}}
export function restoreFarmProgress(data){
 validateFarmProgress(data);const world=new Garden(data.seed);world.units=[];world.food=[];world.nextId=1;world.mode=data.mode;world.playerProgression=copyPlayer(data.player);world.farmBossProgress=structuredClone(data.bossStages);Object.assign(world.metrics,data.totals);
 const count=data.roster.reduce((total,row)=>total+row.count,0);
 for(const row of data.roster)for(let i=0;i<row.count;i++){
  const point=position(world.units.length,count,data.seed,.7),unit=new Unit(world.nextId++,row.species,row.tier,point.x,point.y);unit.meals=row.fed?1:0;unit.growthDuration=row.growth?.duration||world.breedGrowthDuration();unit.growthElapsed=row.growth?row.growth.duration-row.growth.remaining:unit.growthDuration;unit.growth=Math.floor(CONFIG.farm.breeding.matureMeals*unit.growthElapsed/unit.growthDuration+1e-9);unit.cooldown=row.cooldown?.remaining||0;unit.cooldownDuration=row.cooldown?.duration||0;
  if(row.rest){unit.hp=0;unit.down=row.rest;unit.deathSplitHandled=true}
  world.units.push(unit);
 }
 for(let i=0;i<data.food.count;i++){const point=position(i,data.food.count,data.seed+103,.8);world.food.push({...point,z:0,vx:0,vy:0,vz:0,seed:i*.61803398875%1,phase:'grounded',tx:point.x,ty:point.y})}
 Object.assign(world.foodTaps,{remainder:data.food.remainder,produced:data.food.produced});
 const {boss,raid}=data.ledger;Object.assign(world,{nextBossEncounterId:boss.nextEncounterId,bossRewardWatermarks:{...boss.settledThrough},nextRaidRunSequence:raid.nextRunSequence,activeRaidRunSequence:raid.activeRun?.sequence??null,activeRaidSessionId:raid.activeRun?.sessionId??null,raidSettlementWatermark:raid.settledThrough});
 world.bossRewardReceipts=boss.pendingRewards.map(reward=>{const {rolls,...fields}=reward;return{...fields,x:0,y:0,roll:rolls[0],status:'pending',unitId:0,rollCount:rolls.length,drops:rolls.map(roll=>({roll,status:'pending',unitId:0}))}});
 world.rng=new globalThis.BloomGamekitDeterministic.SeededPRNG(data.rngState);world.reconcileMateReservations();return world;
}
