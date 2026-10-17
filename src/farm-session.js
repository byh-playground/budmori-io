import {Garden,CONFIG,bindPresentationClock} from './farm-model.js';
import {baseUnitStatsFor} from './unit-stats.js';

const {PresentationRuntime,RenderObject}=globalThis.BloomGamekitInterpolation;
const R=RenderObject;
const PRESENTATION_STEP_MS=50;
const LOCAL_PROFILE=Object.freeze({tickRate:20,maxCatchupSteps:4});
const LOCAL_INPUT=new Uint8Array(0);
const ADVANCED=Object.freeze({status:'advanced'});
const CLOSED=Object.freeze({status:'closed'});

class UnitRender extends RenderObject {
 static renderSchema=Object.freeze({
  id:R.STEP,x:R.POSITION_X,y:R.POSITION_Y,z:R.POSITION_Z,angle:R.ANGLE,
  vx:R.LINEAR,vy:R.LINEAR,hp:R.LINEAR,down:R.LINEAR,stun:R.LINEAR,flash:R.LINEAR,bounce:R.LINEAR,
  'ability.phase':R.STATE_KEY,'ability.elapsed':R.LINEAR,'ability.peanutStrikeCount':R.STEP,walnutGuarding:R.STEP,
  cooldown:R.LINEAR,cooldownDuration:R.STEP,meals:R.STEP,
  species:R.STEP,tier:R.STEP,seed:R.STEP,size:R.LINEAR,radius:R.LINEAR,maxHp:R.STEP,fed:R.STEP,ownerId:R.STATE_KEY,faction:R.STEP,farmId:R.STEP,dropLanded:R.STEP,buffed:R.STEP,isBattleOnlySummon:R.STEP
 });
 constructor(){super();this.ability={}}
 update(u,world){
  this.id=u.id;this.x=u.x;this.y=u.y;this.z=u.z;this.angle=u.angle;this.vx=u.vx;this.vy=u.vy;this.hp=u.hp;this.down=u.down;this.stun=u.stun;this.flash=u.flash;this.bounce=u.bounce;
  this.ability.phase=u.ability.phase;this.ability.elapsed=u.ability.elapsed;this.ability.peanutStrikeCount=u.ability.action?.peanutStrikeCount||2;
  this.walnutGuarding=!!world.walnutGuardConfigFor(u);this.cooldown=u.cooldown;this.cooldownDuration=u.cooldownDuration;this.meals=u.meals;this.species=u.species;this.tier=u.tier;this.seed=u.seed;this.size=u.size;this.radius=u.radius;
  this.maxHp=baseUnitStatsFor(u.tier,u.species).maxHp;this.fed=u.fed;this.ownerId=u.ownerId;this.faction=u.faction;this.farmId=u.farmId;this.dropLanded=u.dropLanded;this.buffed=world.time<(world.raidRoster(u.ownerId)?.buffUntil||0);this.isBattleOnlySummon=u.isBattleOnlySummon;
 }
}

class BossRender extends RenderObject {
 static renderSchema=Object.freeze({
  x:R.POSITION_X,y:R.POSITION_Y,z:R.POSITION_Z,angle:R.ANGLE,startAngle:R.ANGLE,
  phase:R.STATE_KEY,clock:R.LINEAR,travel:R.LINEAR,hp:R.LINEAR,maxHp:R.STEP,radius:R.STEP,height:R.STEP,flash:R.LINEAR,species:R.STEP,
  patternId:R.STATE_KEY,patternPhase:R.STATE_KEY,patternPhaseElapsed:R.LINEAR,patternAim:R.ANGLE,patternLocked:R.STEP,patternTargetId:R.STEP,
  patternTargetX:R.STEP,patternTargetY:R.STEP,patternTargetZ:R.STEP,stage:R.STEP,
  patternStartX:R.STEP,patternStartY:R.STEP,patternStartZ:R.STEP,
  patternVolleyCount:R.STEP,patternReleased:R.STEP,patternTraveled:R.LINEAR,
  summonMouthX:R.STEP,summonMouthY:R.STEP,summonMouthZ:R.STEP
 });
 update(b,world){const action=b.patternRuntime.active,event=world.farmBossEvent,target=action?.target||null,start=action?.start||null,mouth=b.summonMouth||{},ended=world.scene==='raid'&&!b.active?world.notices.findLast(e=>e.kind==='victory'||e.kind==='defeat'):null;
  this.x=b.x;this.y=b.y;this.z=b.z;this.angle=b.angle;this.startAngle=b.startAngle;this.phase=action?.phase||(!b.active||event?.phase==='dropping'?'resting':'chase');this.clock=action?.phaseElapsed??(event.phase==='celebrating'||event.phase==='fading'?event.elapsed:ended?.bossPatternElapsed||0);this.travel=b.travel||0;this.hp=b.hp;this.maxHp=b.maxHp;this.radius=b.radius;this.height=b.height;this.flash=b.flash;this.species=b.species??3;this.stage=b.stage??0;this.patternId=action?.id||'';this.patternPhase=action?.phase||'idle';this.patternPhaseElapsed=action?.phaseElapsed||0;this.patternAim=action?.aim??b.angle;this.patternLocked=!!action?.locked;this.patternTargetId=action?.targetId||0;this.patternTargetX=target?.x??b.x;this.patternTargetY=target?.y??b.y;this.patternTargetZ=target?.z??0;this.patternStartX=start?.x??b.x;this.patternStartY=start?.y??b.y;this.patternStartZ=start?.z??b.z;this.patternVolleyCount=action?.volleyCount||0;this.patternReleased=action?.released||0;this.patternTraveled=action?.traveled||0;this.summonMouthX=mouth.x??b.x;this.summonMouthY=mouth.y??b.y;this.summonMouthZ=mouth.z??b.z;
 }
}

class FoodRender extends RenderObject {
 static renderSchema=Object.freeze({
  x:R.POSITION_X,y:R.POSITION_Y,z:R.POSITION_Z,vx:R.LINEAR,vy:R.LINEAR,vz:R.LINEAR,
  phase:R.STATE_KEY,tx:R.STEP,ty:R.STEP,seed:R.STEP
 });
 update(f){this.x=f.x;this.y=f.y;this.z=f.z;this.vx=f.vx;this.vy=f.vy;this.vz=f.vz;this.phase=f.phase;this.tx=f.tx??0;this.ty=f.ty??0;this.seed=f.seed??0}
}

class ProjectileRender extends RenderObject {
 static renderSchema=Object.freeze({
  id:R.STEP,x:R.POSITION_X,y:R.POSITION_Y,z:R.POSITION_Z,elapsed:R.LINEAR,
  owner:R.STEP,species:R.STEP,tier:R.STEP,radius:R.STEP,height:R.STEP,
  projectileKind:R.STATE_KEY,isPopcorn:R.STEP,landed:R.STEP,exploded:R.STEP,
  fuseRemaining:R.LINEAR,explosionLife:R.LINEAR,shotIndex:R.STEP,fanIndex:R.STEP,
  'popcornConfig.radius':R.STEP,
  'path.from.x':R.STEP,'path.from.y':R.STEP,'path.from.z':R.STEP,
  'path.to.x':R.STEP,'path.to.y':R.STEP,'path.to.z':R.STEP,
  'path.height':R.STEP,'path.duration':R.STEP
 });
 constructor(){super();this.popcornConfig={};this.path={from:{},to:{}}}
 update(p){
  this.id=p.id;this.x=p.x;this.y=p.y;this.z=p.z;this.elapsed=p.elapsed;this.owner=p.owner;this.species=p.species;this.tier=p.tier;this.radius=p.radius;this.height=p.height;
  this.projectileKind=p.projectileKind||'';this.isPopcorn=!!p.isPopcorn;this.landed=!!p.landed;this.exploded=!!p.exploded;this.fuseRemaining=p.fuseRemaining||0;
  this.explosionLife=p.explosionLife||0;this.shotIndex=p.shotIndex||0;this.fanIndex=p.fanIndex||0;this.popcornConfig.radius=p.popcornConfig?.radius||0;
  this.path.from.x=p.path.from.x;this.path.from.y=p.path.from.y;this.path.from.z=p.path.from.z;
  this.path.to.x=p.path.to.x;this.path.to.y=p.path.to.y;this.path.to.z=p.path.to.z;this.path.height=p.path.height;this.path.duration=p.path.duration;
 }
}

class EffectRender extends RenderObject {
 static renderSchema=Object.freeze({x:R.POSITION_X,y:R.POSITION_Y,z:R.POSITION_Z,life:R.LINEAR,kind:R.STATE_KEY,radius:R.STEP,duration:R.STEP,owner:R.STEP});
 update(e){this.x=e.x;this.y=e.y;this.z=e.z;this.life=e.life;this.kind=e.kind;this.radius=e.radius||0;this.duration=e.duration||0;this.owner=e.owner||0}
}

class DelayedEffectRender extends EffectRender {
 static renderSchema=Object.freeze({...EffectRender.renderSchema,delay:R.STEP,span:R.STEP});
 update(e){super.update(e);this.delay=e.delay;this.span=e.span}
}

class MergeMaterialRender extends DelayedEffectRender {
 static renderSchema=Object.freeze({...DelayedEffectRender.renderSchema,targetX:R.STEP,targetY:R.STEP,sequenceIndex:R.STEP,sequenceCount:R.STEP});
 update(e){super.update(e);this.targetX=e.targetX;this.targetY=e.targetY;this.sequenceIndex=e.sequenceIndex;this.sequenceCount=e.sequenceCount}
}

class GameClockRender extends RenderObject {
 static renderSchema=Object.freeze({gameTimeMs:R.LINEAR});
 constructor(gameTimeMs){super();this.gameTimeMs=gameTimeMs}
}

export class FarmSession{
 constructor(world=new Garden(),{onError=console.error,onWorldStep=()=>{}}={}){
  this.world=world;this.onWorldStep=onWorldStep;this.tick=0;this.presentationTick=0;this.profile=LOCAL_PROFILE;this.pace=1;this.closed=false;this._paused=false;this.pauseStartedAt=null;this.pausedDurationMs=0;this.pending=[];this.localPlayerId='solo';this.localDeploySequence=world.raidRoster(this.localPlayerId)?.lastDeploySequence||0;
  this.presentationRevision=0;this.presentationSequence=0;this.pendingPresentationMode=null;this.presentationRuntime=new PresentationRuntime({stepMs:PRESENTATION_STEP_MS,delayMs:PRESENTATION_STEP_MS,snapDistance:12});
  this.presentationAdapters=new WeakMap();this.captureEntities=[];this.clockEntity={id:'clock',generation:0,source:new GameClockRender(0)};
  this.presentationIds=new WeakMap();this.nextPresentationId=1;this.previousCaptureTimeMs=null;this.latestCaptureTimeMs=0;this.presentationOriginWallMs=null;this.lastFrameClockMs=null;this.lastCaptureClockMs=0;this.pulseTimestamp=null;
  // FarmSession owns local command order; the shared loop owns timing/backlog.
  // No room, transport, rollback history or input-submission pipeline is created.
  this.loop=globalThis.BloomGamekitSimloop.createLoop({session:this,getInput:()=>LOCAL_INPUT,onError,onBacklogDrop:()=>{this.pendingPresentationMode='reset'},
   onAdvance:result=>{if(this.pendingPresentationMode)this.capturePresentation(this.pendingPresentationMode);else if(result.status==='advanced'&&!this.paused)this.capturePresentation('continuous')}});
  this.capturePresentation('reset');
 }
 // Required by the shared loop; a local session has no incoming work to poll.
 poll(){}
 queue(type,args={}){if(this.closed||this.pending.length>=64)return false;this.pending.push(structuredClone({type,...args}));return true}
 deployNext(x,y){const w=this.world,roster=w.scene==='raid'&&w.raidRoster(this.localPlayerId);if(!roster||!Number.isFinite(x)||!Number.isFinite(y))return false;this.localDeploySequence=Math.max(this.localDeploySequence,roster.lastDeploySequence);if(this.localDeploySequence-roster.lastDeploySequence>=w.raidRemaining(this.localPlayerId))return false;const sequence=this.localDeploySequence+1;if(!this.queue('deploy',{sequence,x,y}))return false;this.localDeploySequence=sequence;return true}
 advance(){
  if(this.closed)return CLOSED;
  const commandChangedWorld=this.applyPendingCommands(32);
  if(this.paused){this.tick++;if(commandChangedWorld)this.onWorldStep(this.world);return ADVANCED}
  const w=this.world,startTime=w.time,loopStart=this.loop?.simulationTimeMs,startClock=this.adjustedWallTime(Number.isFinite(loopStart)?loopStart:this.pulseTimestamp??globalThis.performance.now()),presentationStartMs=Math.max(0,startClock-(this.presentationOriginWallMs??startClock));bindPresentationClock(w,time=>(presentationStartMs+(time-startTime)*1000)/1000);
  if(w.scene==='farm')w.advanceAutoTaps(.05);for(let i=0;i<6;i++)w.step(CONFIG.physics.fixedStep);this.tick++;this.presentationTick++;this.onWorldStep(w);return ADVANCED;
 }
 applyPendingCommands(limit){
  if(!this.pending.length)return false;
  let changed=false;for(const command of this.pending.splice(0,limit)){try{changed=this.command(command)||changed}catch{/* Reject invalid local intent without blocking later commands. */}}return changed;
 }
 flushQueuedCommands(){if(this.closed||this.world.scene!=='farm')return false;const changed=this.applyPendingCommands(this.pending.length);if(changed)this.onWorldStep(this.world);return changed}
 command(c,ownerId=this.localPlayerId){const w=this.world;
  switch(c.type){
   case 'feed':return w.scene==='farm'&&w.tapFood('manual');
   case 'mode':if(w.scene==='farm'&&['breed','merge'].includes(c.value)){const changed=w.mode!==c.value||c.value!=='merge'&&w.mergeTask!==null;if(c.value!=='merge')w.mergeTask=null;w.mode=c.value;return changed}return false;
   case 'progression-invest':if(w.scene==='farm'&&typeof c.nodeId==='string'&&c.nodeId.length<64){if(c.scope==='farm')return w.investFarmUpgrade(c.nodeId).ok;if(c.scope==='ability'&&typeof c.abilityId==='string'&&c.abilityId.length<64)return w.investAbilityNode(c.abilityId,c.nodeId).ok}return false;
   case 'ability-reset':return w.scene==='farm'&&w.resetAbilityTree().ok;
   case 'register-roster':return Array.isArray(c.entries)&&w.registerRaidRoster(ownerId,c.entries,c.abilitySnapshot,c.settlement||null);
   case 'deploy':return Number.isSafeInteger(c.sequence)&&Number.isFinite(c.x)&&Number.isFinite(c.y)&&w.deployNextRaidUnit(ownerId,c.sequence,c.x,c.y);
   case 'buff':return w.useRaidBuff(ownerId);
  }
  return false;
 }
 presentationIdentity(kind,source){let id=this.presentationIds.get(source);if(!id){id=this.nextPresentationId++;this.presentationIds.set(source,id)}return kind+':'+id}
 // GameKit capture copies declared fields synchronously. Reuse only its input
 // adapters, keyed weakly by the live actor; captured history stays SDK-owned.
 presentationEntity(id,source,Type){
  let entity=this.presentationAdapters.get(source);
  if(!entity||entity.source.constructor!==Type){entity={id,generation:0,source:new Type()};this.presentationAdapters.set(source,entity)}
  entity.id=id;entity.source.update(source,this.world);return entity;
 }
 get paused(){return this._paused}
 set paused(value){value=!!value;if(value===this._paused)return;const now=globalThis.performance.now();if(value)this.pauseStartedAt=now;else if(this.pauseStartedAt!==null){this.pausedDurationMs+=now-this.pauseStartedAt;this.pauseStartedAt=null}this._paused=value}
 adjustedWallTime(now){return now-this.pausedDurationMs-(this._paused&&this.pauseStartedAt!==null?now-this.pauseStartedAt:0)}
 capturePresentation(mode='continuous'){
  if(mode!=='continuous'&&this.presentationSequence>0)this.presentationRevision++;
  const world=this.world,receiptNowMs=this.captureClock(),timeMs=this.presentationOriginWallMs===null?0:Math.max(this.latestCaptureTimeMs,receiptNowMs-this.presentationOriginWallMs),entities=this.captureEntities;entities.length=0;
  if(this.presentationOriginWallMs===null)this.presentationOriginWallMs=receiptNowMs;
  for(const u of world.units)entities.push(this.presentationEntity('unit:'+u.id,u,UnitRender));
  entities.push(this.presentationEntity('boss',world.boss,BossRender));
  for(const f of world.food)entities.push(this.presentationEntity(this.presentationIdentity('food',f),f,FoodRender));
  for(const p of world.projectiles)entities.push(this.presentationEntity('projectile:'+p.id,p,ProjectileRender));
  for(const e of world.effects){
   const Type=e.kind==='merge-material'?MergeMaterialRender:Number.isFinite(e.delay)&&Number.isFinite(e.span)?DelayedEffectRender:EffectRender;
   entities.push(this.presentationEntity(this.presentationIdentity('effect',e),e,Type));
  }
  this.clockEntity.source.gameTimeMs=world.time*1000;entities.push(this.clockEntity);
  const captureMode=mode==='continuous'?'continuous':mode==='load'?'load':mode==='rollback'?'rollback':'reset';
  if(captureMode==='continuous')this.previousCaptureTimeMs=this.latestCaptureTimeMs;else this.previousCaptureTimeMs=null;
  const accepted=this.presentationRuntime.capture({revision:this.presentationRevision,sequence:++this.presentationSequence,timeMs,mode:captureMode,entities},receiptNowMs);
  if(accepted){this.latestCaptureTimeMs=timeMs;this.lastCaptureClockMs=receiptNowMs;this.pendingPresentationMode=null}
  return accepted;
 }
 captureClock(){
  const now=this.pulseTimestamp??globalThis.performance.now(),boundary=this.loop?.simulationTimeMs;
  const candidate=this.adjustedWallTime(Number.isFinite(boundary)?boundary:now);
  const receipt=Math.max(candidate,this.lastCaptureClockMs,this.lastFrameClockMs??0);this.lastCaptureClockMs=receipt;return receipt;
 }
 frameClock(now){
  const clock=Math.max(this.lastFrameClockMs??0,this.lastCaptureClockMs,this.adjustedWallTime(now));
  this.lastFrameClockMs=clock;return clock;
 }
 presentation(now){
  const frame=this.presentationRuntime.frame(this.frameClock(now)),world=this.world;
  if(!this.presentationView||Object.getPrototypeOf(this.presentationView)!==world){
   const view=this.presentationView=Object.assign(Object.create(world),{units:[],food:[],projectiles:[],effects:[],presentationDiagnostics:{}});
   // Only consume these models synchronously in this frame. GameKit owns and
   // reuses their fields; the app reuses the collection containers, not snapshots.
   this.collectPresentationModel=(model,id)=>{
    if(id.startsWith('unit:'))view.units.push(model);
    else if(id.startsWith('food:'))view.food.push(model);
    else if(id.startsWith('projectile:'))view.projectiles.push(model);
    else if(id.startsWith('effect:'))view.effects.push(model);
   };
  }
  const view=this.presentationView;
  view.units.length=0;view.food.length=0;view.projectiles.length=0;view.effects.length=0;
  frame.forEach(this.collectPresentationModel);
  view.time=(frame.sample('clock',0)?.gameTimeMs??world.time*1000)/1000;view.boss=frame.sample('boss',0)||this.presentationEntity('boss',world.boss,BossRender).source;
  view.displayTimeMs=frame.timeMs;view.presentationRevision=this.presentationRevision;
  const previous=this.previousCaptureTimeMs,latest=this.latestCaptureTimeMs,span=latest-previous,diagnostics=view.presentationDiagnostics;
  diagnostics.timeMs=frame.timeMs;diagnostics.latestSnapshotTimeMs=latest;diagnostics.previousSnapshotTimeMs=previous;diagnostics.intervalMs=span;
  diagnostics.sampleAgeMs=latest-frame.timeMs;diagnostics.renderFraction=previous===null||span<=0?null:Math.max(0,Math.min(1,(frame.timeMs-previous)/span));
  diagnostics.captureSequence=this.presentationSequence;diagnostics.revision=this.presentationRevision;this.latestPresentationDiagnostics=diagnostics;
  return view;
 }
 pulse(now){this.pulseTimestamp=now;this.loop.pulse(now,{render:false})}
 dispose(){this.closed=true;this.loop.stop();this.pending.length=0;this.captureEntities.length=0;this.presentationAdapters=new WeakMap()}
}
