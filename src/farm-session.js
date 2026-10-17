import {Garden,CONFIG,bindPresentationClock} from './farm-model.js';
import {resolveUnitStats} from './unit-stats.js';

const {PresentationRuntime,RenderObject}=globalThis.BloomGamekitInterpolation;
const R=RenderObject;
const PRESENTATION_STEP_MS=50;
const LOCAL_PROFILE=Object.freeze({tickRate:20,maxCatchupSteps:4});
const LOCAL_INPUT=new Uint8Array(0);
const ADVANCED=Object.freeze({status:'advanced'});
const CLOSED=Object.freeze({status:'closed'});

class UnitRender extends RenderObject {
 static renderSchema=Object.freeze({
  x:R.POSITION_X,y:R.POSITION_Y,z:R.POSITION_Z,angle:R.ANGLE,
  vx:R.LINEAR,vy:R.LINEAR,hp:R.LINEAR,down:R.LINEAR,stun:R.LINEAR,flash:R.LINEAR,bounce:R.LINEAR,
  'ability.phase':R.STATE_KEY,'ability.elapsed':R.LINEAR,
  cooldown:R.LINEAR,cooldownDuration:R.STEP,meals:R.STEP,
  species:R.STEP,tier:R.STEP,seed:R.STEP,size:R.LINEAR,radius:R.LINEAR,maxHp:R.STEP,fed:R.STEP,ownerId:R.STATE_KEY,faction:R.STEP,farmId:R.STEP,dropLanded:R.STEP,buffed:R.STEP,isBattleOnlySummon:R.STEP
 });
 constructor(u,world){
  super();Object.assign(this,{x:u.x,y:u.y,z:u.z,angle:u.angle,vx:u.vx,vy:u.vy,hp:u.hp,down:u.down,stun:u.stun,flash:u.flash,bounce:u.bounce,
   ability:{phase:u.ability.phase,elapsed:u.ability.elapsed},cooldown:u.cooldown,cooldownDuration:u.cooldownDuration,meals:u.meals,species:u.species,tier:u.tier,seed:u.seed,size:u.size,radius:u.radius,
   maxHp:resolveUnitStats(u).maxHp,fed:u.fed,ownerId:u.ownerId,faction:u.faction,farmId:u.farmId,dropLanded:u.dropLanded,buffed:world.time<(world.raidRoster(u.ownerId)?.buffUntil||0),isBattleOnlySummon:u.isBattleOnlySummon});
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
 constructor(b){super();const action=b.patternRuntime?.active||null,target=action?.target||null,start=action?.start||null,mouth=b.summonMouth||{};Object.assign(this,{
  x:b.x,y:b.y,z:b.z,angle:b.angle,startAngle:b.startAngle,phase:b.phase,clock:b.clock,travel:b.travel||0,hp:b.hp,maxHp:b.maxHp,radius:b.radius,height:b.height,flash:b.flash,species:b.species??3,stage:b.stage??0,
  patternId:action?.id||'',patternPhase:action?.phase||'idle',patternPhaseElapsed:action?.phaseElapsed||0,patternAim:action?.aim??b.angle,patternLocked:!!action?.locked,patternTargetId:action?.targetId||0,
  patternTargetX:target?.x??b.x,patternTargetY:target?.y??b.y,patternTargetZ:target?.z??0,
  patternStartX:start?.x??b.x,patternStartY:start?.y??b.y,patternStartZ:start?.z??b.z,
  patternVolleyCount:action?.volleyCount||0,patternReleased:action?.released||0,patternTraveled:action?.traveled||0,
  summonMouthX:mouth.x??b.x,summonMouthY:mouth.y??b.y,summonMouthZ:mouth.z??b.z
 })}
}

class FoodRender extends RenderObject {
 static renderSchema=Object.freeze({
  x:R.POSITION_X,y:R.POSITION_Y,z:R.POSITION_Z,vx:R.LINEAR,vy:R.LINEAR,vz:R.LINEAR,
  phase:R.STATE_KEY,tx:R.STEP,ty:R.STEP,seed:R.STEP
 });
 constructor(f){super();Object.assign(this,{x:f.x,y:f.y,z:f.z,vx:f.vx,vy:f.vy,vz:f.vz,phase:f.phase,tx:f.tx??0,ty:f.ty??0,seed:f.seed??0})}
}

class ProjectileRender extends RenderObject {
 static renderSchema=Object.freeze({
  x:R.POSITION_X,y:R.POSITION_Y,z:R.POSITION_Z,elapsed:R.LINEAR,
  owner:R.STEP,species:R.STEP,tier:R.STEP,radius:R.STEP,height:R.STEP,
  projectileKind:R.STATE_KEY,isPopcorn:R.STEP,landed:R.STEP,exploded:R.STEP,
  fuseRemaining:R.LINEAR,explosionLife:R.LINEAR,shotIndex:R.STEP,fanIndex:R.STEP,
  'popcornConfig.radius':R.STEP,
  'path.from.x':R.STEP,'path.from.y':R.STEP,'path.from.z':R.STEP,
  'path.to.x':R.STEP,'path.to.y':R.STEP,'path.to.z':R.STEP,
  'path.height':R.STEP,'path.duration':R.STEP
 });
 constructor(p){super();Object.assign(this,{x:p.x,y:p.y,z:p.z,elapsed:p.elapsed,owner:p.owner,species:p.species,tier:p.tier,radius:p.radius,height:p.height,
  projectileKind:p.projectileKind||'',isPopcorn:!!p.isPopcorn,landed:!!p.landed,exploded:!!p.exploded,fuseRemaining:p.fuseRemaining||0,
  explosionLife:p.explosionLife||0,shotIndex:p.shotIndex||0,fanIndex:p.fanIndex||0,popcornConfig:{radius:p.popcornConfig?.radius||0},
  path:{from:{...p.path.from},to:{...p.path.to},height:p.path.height,duration:p.path.duration}})}
}

class EffectRender extends RenderObject {
 static renderSchema=Object.freeze({x:R.POSITION_X,y:R.POSITION_Y,z:R.POSITION_Z,life:R.LINEAR,kind:R.STATE_KEY,radius:R.STEP,duration:R.STEP,owner:R.STEP});
 constructor(e){super();Object.assign(this,{x:e.x,y:e.y,z:e.z,life:e.life,kind:e.kind,radius:e.radius||0,duration:e.duration||0,owner:e.owner||0})}
}

class DelayedEffectRender extends EffectRender {
 static renderSchema=Object.freeze({...EffectRender.renderSchema,delay:R.STEP,span:R.STEP});
 constructor(e){super(e);Object.assign(this,{delay:e.delay,span:e.span})}
}

class MergeMaterialRender extends DelayedEffectRender {
 static renderSchema=Object.freeze({...DelayedEffectRender.renderSchema,targetX:R.STEP,targetY:R.STEP,sequenceIndex:R.STEP,sequenceCount:R.STEP});
 constructor(e){super(e);Object.assign(this,{targetX:e.targetX,targetY:e.targetY,sequenceIndex:e.sequenceIndex,sequenceCount:e.sequenceCount})}
}

class GameClockRender extends RenderObject {
 static renderSchema=Object.freeze({gameTimeMs:R.LINEAR});
 constructor(gameTimeMs){super();this.gameTimeMs=gameTimeMs}
}

export class FarmSession{
 constructor(world=new Garden(),{onError=console.error,onWorldStep=()=>{}}={}){
  this.world=world;this.onWorldStep=onWorldStep;this.tick=0;this.presentationTick=0;this.profile=LOCAL_PROFILE;this.pace=1;this.closed=false;this.speed=1;this._paused=false;this.pauseStartedAt=null;this.pausedDurationMs=0;this.pending=[];this.localPlayerId='solo';this.localDeploySequence=world.raidRoster(this.localPlayerId)?.lastDeploySequence||0;
  this.presentationRevision=0;this.presentationSequence=0;this.pendingPresentationMode=null;this.presentationRuntime=new PresentationRuntime({stepMs:PRESENTATION_STEP_MS,delayMs:PRESENTATION_STEP_MS,snapDistance:12});
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
  const w=this.world,startTime=w.time,speed=this.speed,loopStart=this.loop?.simulationTimeMs,startClock=this.adjustedWallTime(Number.isFinite(loopStart)?loopStart:this.pulseTimestamp??globalThis.performance.now()),presentationStartMs=Math.max(0,startClock-(this.presentationOriginWallMs??startClock));bindPresentationClock(w,time=>(presentationStartMs+(time-startTime)*1000/speed)/1000);
  if(w.scene==='farm')w.advanceAutoTaps(.05);for(let i=0;i<6*speed;i++)w.step(CONFIG.fixedStep);this.tick++;this.presentationTick++;this.onWorldStep(w);return ADVANCED;
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
   case 'speed':if([1,4].includes(c.value))this.speed=c.value;return false;
   case 'progression-invest':if(w.scene==='farm'&&typeof c.nodeId==='string'&&c.nodeId.length<64){if(c.scope==='farm')return w.investFarmUpgrade(c.nodeId).ok;if(c.scope==='ability'&&typeof c.abilityId==='string'&&c.abilityId.length<64)return w.investAbilityNode(c.abilityId,c.nodeId).ok}return false;
   case 'ability-reset':return w.scene==='farm'&&w.resetAbilityTree().ok;
   case 'register-roster':return Array.isArray(c.entries)&&w.registerRaidRoster(ownerId,c.entries,c.abilitySnapshot,c.settlement||null);
   case 'deploy':return Number.isSafeInteger(c.sequence)&&Number.isFinite(c.x)&&Number.isFinite(c.y)&&w.deployNextRaidUnit(ownerId,c.sequence,c.x,c.y);
   case 'buff':return w.useRaidBuff(ownerId);
  }
  return false;
 }
 presentationIdentity(kind,source){let id=this.presentationIds.get(source);if(!id){id=this.nextPresentationId++;this.presentationIds.set(source,id)}return kind+':'+id}
 get paused(){return this._paused}
 set paused(value){value=!!value;if(value===this._paused)return;const now=globalThis.performance.now();if(value)this.pauseStartedAt=now;else if(this.pauseStartedAt!==null){this.pausedDurationMs+=now-this.pauseStartedAt;this.pauseStartedAt=null}this._paused=value}
 adjustedWallTime(now){return now-this.pausedDurationMs-(this._paused&&this.pauseStartedAt!==null?now-this.pauseStartedAt:0)}
 capturePresentation(mode='continuous'){
  if(mode!=='continuous'&&this.presentationSequence>0)this.presentationRevision++;
  const world=this.world,receiptNowMs=this.captureClock(),timeMs=this.presentationOriginWallMs===null?0:Math.max(this.latestCaptureTimeMs,receiptNowMs-this.presentationOriginWallMs),entities=[];
  if(this.presentationOriginWallMs===null)this.presentationOriginWallMs=receiptNowMs;
  for(const u of world.units)entities.push({id:'unit:'+u.id,generation:0,source:new UnitRender(u,world)});
  entities.push({id:'boss',generation:0,source:new BossRender(world.boss)});
  for(const f of world.food)entities.push({id:this.presentationIdentity('food',f),generation:0,source:new FoodRender(f)});
  for(const p of world.projectiles)entities.push({id:'projectile:'+p.id,generation:0,source:new ProjectileRender(p)});
  for(const e of world.effects){
   const source=e.kind==='merge-material'?new MergeMaterialRender(e):Number.isFinite(e.delay)&&Number.isFinite(e.span)?new DelayedEffectRender(e):new EffectRender(e);
   entities.push({id:this.presentationIdentity('effect',e),generation:0,source});
  }
  entities.push({id:'clock',generation:0,source:new GameClockRender(world.time*1000)});
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
  const frame=this.presentationRuntime.frame(this.frameClock(now)),world=this.world,view=Object.create(world),units=[],food=[],projectiles=[],effects=[];
  frame.forEach((model,id)=>{
   if(id.startsWith('unit:'))units.push(Object.assign({id:Number(id.slice(5))},model));
   else if(id.startsWith('food:'))food.push(model);
   else if(id.startsWith('projectile:'))projectiles.push(Object.assign({id:Number(id.slice(11))},model));
   else if(id.startsWith('effect:'))effects.push(model);
  });
  view.time=(frame.sample('clock',0)?.gameTimeMs??world.time*1000)/1000;view.units=units;view.boss=frame.sample('boss',0)||new BossRender(world.boss);view.food=food;view.projectiles=projectiles;view.effects=effects;
  view.displayTimeMs=frame.timeMs;view.presentationRevision=this.presentationRevision;
  const previous=this.previousCaptureTimeMs,latest=this.latestCaptureTimeMs,span=latest-previous;
  view.presentationDiagnostics={timeMs:frame.timeMs,latestSnapshotTimeMs:latest,previousSnapshotTimeMs:previous,intervalMs:span,
   sampleAgeMs:latest-frame.timeMs,renderFraction:previous===null||span<=0?null:Math.max(0,Math.min(1,(frame.timeMs-previous)/span)),captureSequence:this.presentationSequence,revision:this.presentationRevision};
  this.latestPresentationDiagnostics=view.presentationDiagnostics;
  return view;
 }
 pulse(now){this.pulseTimestamp=now;this.loop.pulse(now,{render:false})}
 dispose(){this.closed=true;this.loop.stop();this.pending.length=0}
}
