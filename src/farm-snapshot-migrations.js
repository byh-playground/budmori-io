import {CONFIG} from './farm-model.js';
import {resolveUnitStats} from './unit-stats.js';
import {createPlayerProgressionState} from './player-progression.js';
import {createAbilityRuntimeSnapshot} from './ability-state.js';
import {abilityProfile,hasUnitCapability} from './unit-abilities.js';
import {createFarmBossProgress} from './farm-boss-stages.js';
import {BOSS_PATTERN_IDS} from './boss-patterns.js';
import {FACTION_CONFIG,legacyUnitFaction} from './factions.js';
import {FARM_SNAPSHOT_SHAPE,UNIT_SNAPSHOT_SHAPE,LEGACY_UNIT_DEFAULT_KEYS} from './farm-snapshot.js';
import {assertSnapshot as assert,validBattleUnitId} from './farm-snapshot-validation.js';

// The versioned save envelope admits 0.4–0.7 before reaching this boundary.
// Those releases used additive fields rather than a second schema version, so
// migration is presence-based and also accepts current in-memory checkpoints.
// Keep normalization before final serialization: cooldowns, corpse clocks,
// serials and reward watermarks may change even on a live checkpoint.
export function normalizeSnapshot(raw,{migrateLegacyRaid=false,clone=true}={}){
 // Internal checkpoint serialization can skip the copy because `snapshot()` already returned an owned plain-data graph.
 const resetLegacyCorpseTimers=!Object.hasOwn(raw,'corpseRecoveryVersion'),hasRewardWatermarks=Object.hasOwn(raw,'bossRewardWatermarks');if(clone)raw=structuredClone(raw);delete raw.progress;if(raw.speed===1||raw.speed===4)delete raw.speed;if(resetLegacyCorpseTimers)raw.corpseRecoveryVersion=1;if(!Object.hasOwn(raw,'farmBossProgress'))raw.farmBossProgress=createFarmBossProgress(raw.seed);const base=FARM_SNAPSHOT_SHAPE,fill=(v,d)=>{for(const[k,x]of Object.entries(d)){if(!Object.hasOwn(v,k))v[k]=structuredClone(x);else if(v[k]&&x&&typeof v[k]==='object'&&typeof x==='object'&&!Array.isArray(v[k])&&!Array.isArray(x))fill(v[k],x)}};
 fill(raw,base);
 // Merge tasks are transient. Discard pre-expansion pair tasks and older
 // animation records that cannot represent the material count/output actor.
 if(raw.mergeTask&&(!Array.isArray(raw.mergeTask.materialIds)||raw.mergeTask.phase==='animation'&&!Number.isSafeInteger(raw.mergeTask.resultId)))raw.mergeTask=null;
 for(const r of raw.raidRosters||[]){if(!Object.hasOwn(r,'abilitySnapshot'))r.abilitySnapshot=createAbilityRuntimeSnapshot(createPlayerProgressionState());else if(!Object.hasOwn(r.abilitySnapshot,'farmUpgrades'))r.abilitySnapshot.farmUpgrades=structuredClone(createPlayerProgressionState().farmUpgrades);if(r.abilitySnapshot?.abilities&&typeof r.abilitySnapshot.abilities==='object'&&!Array.isArray(r.abilitySnapshot.abilities))for(const [id,value] of Object.entries(base.playerProgression.abilities))if(!Object.hasOwn(r.abilitySnapshot.abilities,id))r.abilitySnapshot.abilities[id]=structuredClone(value);if(!Object.hasOwn(r,'settlementSessionId'))r.settlementSessionId='';if(!Object.hasOwn(r,'settlementRunSequence'))r.settlementRunSequence=0;if(!Object.hasOwn(r,'settlementEncounterId'))r.settlementEncounterId=0}
 for(const u of raw.units||[]){for(const key of LEGACY_UNIT_DEFAULT_KEYS)if(!Object.hasOwn(u,key))u[key]=UNIT_SNAPSHOT_SHAPE[key];if(!Object.hasOwn(u,'faction'))u.faction=legacyUnitFaction(u);
   const action=u.ability?.action;if(action&&hasUnitCapability(u.species,'repeatedStrike')){if(!Object.hasOwn(action,'peanutStrikeCount'))action.peanutStrikeCount=2;if(!Object.hasOwn(action,'peanutAttackMultiplier'))action.peanutAttackMultiplier=.5;if(!Object.hasOwn(action,'peanutSpreadRadians'))action.peanutSpreadRadians=Math.PI/12}
   if(action&&hasUnitCapability(u.species,'guard')){if(!Object.hasOwn(action,'walnutEmpowered'))action.walnutEmpowered=false;if(!Object.hasOwn(action,'walnutGuardUsed'))action.walnutGuardUsed=false}
  }
 for(const p of raw.projectiles||[]){if(!Object.hasOwn(p,'attackMultiplier'))p.attackMultiplier=abilityProfile(p.species).skillMultiplier;if(!Object.hasOwn(p,'shotIndex'))p.shotIndex=0;if(!Object.hasOwn(p,'ownerId'))p.ownerId=raw.units.find(u=>u.id===p.owner)?.ownerId||'';if(!Object.hasOwn(p,'faction'))p.faction=p.ownerId==='boss'||p.owner>=CONFIG.boss.summonIdBase?FACTION_CONFIG.ENEMY:FACTION_CONFIG.PLAYER}
 raw.projectileSerial=Math.max(Number.isSafeInteger(raw.projectileSerial)?raw.projectileSerial:0,...(raw.projectiles||[]).map(p=>Number.isSafeInteger(p?.id)?p.id:0));
 raw.raidSummonSerial=Number.isSafeInteger(raw.raidSummonSerial)?raw.raidSummonSerial:Math.max(0,...(raw.units||[]).map(u=>Number.isSafeInteger(u?.id)&&u.id>=CONFIG.raid.ids.summonBase?u.id-CONFIG.raid.ids.summonBase+1:0));
 if(raw.farmBossEvent.phase!=='idle'&&raw.farmBossEvent.encounterId===0){const encounterId=raw.nextBossEncounterId++;raw.farmBossEvent.encounterId=encounterId;raw.farmBossEvent.rewardStatus=raw.farmBossEvent.outcome==='victory'?'missed':raw.farmBossEvent.outcome==='defeat'?'none':'unresolved';raw.farmBossEvent.rewardChance=0;raw.farmBossEvent.rewardRoll=0;raw.farmBossEvent.rewardUnitId=0;if(raw.farmBossEvent.outcome==='victory')raw.bossRewardReceipts.push({encounterId,source:'farm',species:3,tier:1,x:raw.boss.x,y:raw.boss.y,chance:0,roll:0,status:'missed',unitId:0})}
 for(const r of raw.raidRosters||[])if(!Object.hasOwn(r,'lastDeploySequence'))r.lastDeploySequence=Array.isArray(r.troops)?r.troops.filter(t=>t?.deployed).length:0;
 if(!hasRewardWatermarks)for(const source of ['farm','raid'])raw.bossRewardWatermarks[source]=Math.max(0,...raw.bossRewardReceipts.filter(reward=>reward?.source===source&&Number.isSafeInteger(reward.encounterId)).map(reward=>reward.encounterId));
 raw.bossSummonSerial=Number.isSafeInteger(raw.bossSummonSerial)?raw.bossSummonSerial:Math.max(0,...(raw.units||[]).map(u=>Number.isSafeInteger(u?.id)&&u.id>=CONFIG.boss.summonIdBase?u.id-CONFIG.boss.summonIdBase:0));
 // Preserve the old terminal animation sample as immutable encounter evidence.
 if(raw.scene==='raid'&&!raw.boss.active&&Number.isFinite(raw.boss.clock)){const ended=raw.notices.findLast(e=>e.kind==='victory'||e.kind==='defeat');if(ended&&!Object.hasOwn(ended,'bossPatternElapsed'))ended.bossPatternElapsed=raw.boss.clock}
 normalizeBossPatternSnapshot(raw.boss,base.boss.patternRuntime,raw.bossSummonSerial);
 raw.nextRaidRunSequence=Math.max(raw.nextRaidRunSequence||0,raw.bossRewardWatermarks.raid||0);
 raw.raidSettlementWatermark=Math.max(raw.raidSettlementWatermark||0,raw.bossRewardWatermarks.raid||0);
 for(const u of raw.units){if(!Number.isFinite(u.cooldownDuration)||u.cooldownDuration<(Number.isFinite(u.cooldown)?u.cooldown:0))u.cooldownDuration=Math.max(0,Number.isFinite(u.cooldown)?u.cooldown:0);if(!Object.hasOwn(u,'growthElapsed')){const progress=Number.isFinite(u.growth)?Math.max(0,Math.min(CONFIG.farm.breeding.matureMeals,u.growth)):0;u.growthElapsed=u.growthDuration*progress/CONFIG.farm.breeding.matureMeals}if(u.hp<=0){if(resetLegacyCorpseTimers||!Number.isFinite(u.down)||u.down<=0)u.down=CONFIG.unit.corpseRecoverySeconds;else u.down=Math.min(CONFIG.unit.corpseRecoverySeconds,u.down)}else u.down=0}
 if(migrateLegacyRaid&&raw.scene==='raid'){raw.scene='farm';raw.running=false;raw.encounter={outcome:'idle',elapsed:0};raw.raidExpectedPlayers=['solo'];raw.raidRosters=[];raw.raidDeploymentStarted=false;raw.projectiles=[];raw.boss=structuredClone(base.boss);for(const u of raw.units){u.x=u.home?.x??u.x;u.y=u.home?.y??u.y;Object.assign(u,{z:0,vx:0,vy:0,vz:0,stun:0,down:0,hp:resolveUnitStats(u).maxHp,dropLanded:true});u.ability={phase:'idle',elapsed:0,action:null}}}
 return raw;
}
// Only the import boundary understands pre-SSOT boss mirrors. A loaded world
// and every new snapshot contain one action phase, timer, target, and hit set.
function normalizeBossPatternSnapshot(boss,baseRuntime,bossSummonSerial){
 if(Object.hasOwn(boss,'phase'))assert(['chase','windup','active','recover','resting','strike-windup','strike','sweep-windup','sweep'].includes(boss.phase));
 if(Object.hasOwn(boss,'clock'))assert(Number.isFinite(boss.clock));
 if(Object.hasOwn(boss,'targetId'))assert(Number.isFinite(boss.targetId));
 if(Object.hasOwn(boss,'attackKind'))assert(['basic','sweep',...BOSS_PATTERN_IDS].includes(boss.attackKind));
 if(Object.hasOwn(boss,'hit'))assert(Array.isArray(boss.hit)&&boss.hit.length<=CONFIG.raid.capacity.battleUnits&&boss.hit.every(id=>validBattleUnitId(id,bossSummonSerial))&&new Set(boss.hit).size===boss.hit.length);
 if(!boss.patternRuntime||boss.patternRuntime.active===undefined)boss.patternRuntime=structuredClone(baseRuntime);
 if(['strike-windup','strike','sweep-windup','sweep'].includes(boss.phase))boss.patternRuntime.active=null;
 const action=boss.patternRuntime.active;
 if(action){
  // Old saves wrote both lists. Retain their corruption check at migration,
  // rather than keeping a second runtime owner solely to compare it later.
  if(Object.hasOwn(boss,'hit'))assert(Array.isArray(action.hitIds)&&boss.hit.length===action.hitIds.length&&action.hitIds.every(id=>boss.hit.includes(id)));
 }
 for(const key of ['phase','clock','hit','targetId','attackKind'])delete boss[key];
}
