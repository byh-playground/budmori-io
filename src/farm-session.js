import {Garden,CONFIG,bindPresentationClock} from './farm-model.js';
import {resolveUnitStats} from './unit-stats.js';
import {snapshot,restore} from './farm-state.js';
import {PRODUCT_VERSION} from './version.js';

const {binaryCodec:codec}=globalThis.BloomGamekitDeterministic;
const {PresentationRuntime,RenderObject}=globalThis.BloomGamekitInterpolation;
const R=RenderObject;
const PRESENTATION_STEP_MS=50;

class UnitRender extends RenderObject {
 static renderSchema=Object.freeze({
  x:R.POSITION_X,y:R.POSITION_Y,z:R.POSITION_Z,angle:R.ANGLE,
  vx:R.LINEAR,vy:R.LINEAR,hp:R.LINEAR,down:R.LINEAR,stun:R.LINEAR,flash:R.LINEAR,bounce:R.LINEAR,
  'ability.phase':R.STATE_KEY,'ability.elapsed':R.LINEAR,
  cooldown:R.LINEAR,cooldownDuration:R.STEP,
  species:R.STEP,tier:R.STEP,seed:R.STEP,size:R.LINEAR,radius:R.LINEAR,maxHp:R.STEP,fed:R.STEP,ownerId:R.STATE_KEY,farmId:R.STEP,dropLanded:R.STEP,buffed:R.STEP,isBattleOnlySummon:R.STEP
 });
 constructor(u,world){
  super();Object.assign(this,{x:u.x,y:u.y,z:u.z,angle:u.angle,vx:u.vx,vy:u.vy,hp:u.hp,down:u.down,stun:u.stun,flash:u.flash,bounce:u.bounce,
   ability:{phase:u.ability.phase,elapsed:u.ability.elapsed},cooldown:u.cooldown,cooldownDuration:u.cooldownDuration,species:u.species,tier:u.tier,seed:u.seed,size:u.size,radius:u.radius,
   maxHp:resolveUnitStats(u).maxHp,fed:u.fed,ownerId:u.ownerId,farmId:u.farmId,dropLanded:u.dropLanded,buffed:world.time<(world.raidRoster(u.ownerId)?.buffUntil||0),isBattleOnlySummon:u.isBattleOnlySummon});
 }
}

class BossRender extends RenderObject {
 static renderSchema=Object.freeze({
  x:R.POSITION_X,y:R.POSITION_Y,z:R.POSITION_Z,angle:R.ANGLE,startAngle:R.ANGLE,
  phase:R.STATE_KEY,clock:R.LINEAR,travel:R.LINEAR,hp:R.LINEAR,maxHp:R.STEP,radius:R.STEP,height:R.STEP,flash:R.LINEAR
 });
 constructor(b){super();Object.assign(this,{x:b.x,y:b.y,z:b.z,angle:b.angle,startAngle:b.startAngle,phase:b.phase,clock:b.clock,travel:b.travel||0,hp:b.hp,maxHp:b.maxHp,radius:b.radius,height:b.height,flash:b.flash})}
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

class GameClockRender extends RenderObject {
 static renderSchema=Object.freeze({gameTimeMs:R.LINEAR});
 constructor(gameTimeMs){super();this.gameTimeMs=gameTimeMs}
}

export class FarmSession{
 constructor(world=new Garden(),{room=null,onError=console.error,onEvent=()=>{}}={}){
  this.world=world;this.tick=0;this.presentationTick=0;this.epoch=0;this.players=[...(room?.players||['solo'])];this.speed=1;this._paused=false;this.pauseStartedAt=null;this.pausedDurationMs=0;this.pending=[];this.room=room;this.localPlayerId=room?.localPlayerId||'solo';this.localDeploySequence=world.raidRoster(this.localPlayerId)?.lastDeploySequence||0;
  this.presentationRevision=0;this.presentationSequence=0;this.pendingPresentationMode=null;this.presentationRuntime=new PresentationRuntime({stepMs:PRESENTATION_STEP_MS,delayMs:PRESENTATION_STEP_MS,snapDistance:12});
  this.presentationIds=new WeakMap();this.nextPresentationId=1;this.previousCaptureTimeMs=null;this.latestCaptureTimeMs=0;this.presentationOriginWallMs=null;this.lastFrameClockMs=null;this.lastCaptureClockMs=0;this.pulseTimestamp=null;
  const adapter={save:()=>codec.encode(this.capture()),load:bytes=>this.load(codec.decode(bytes)),validateSnapshot:(bytes,context={})=>{try{this.validate(codec.decode(bytes),context);return true}catch{return false}},applyMembership:change=>{this.epoch=change.epoch;this.players=[...change.players];if(this.world.scene==='raid')this.world.setRaidPlayers(this.players);this.pendingPresentationMode='reset'},step:ctx=>this.step(ctx)};
  const emitEvent=event=>{
   if(event.type==='rollback'||event.type==='reconciled')this.pendingPresentationMode='rollback';
   else if(event.type==='membership-committed')this.pendingPresentationMode='reset';
   else if(event.type==='recovered'){this.pendingPresentationMode='load';this.capturePresentation('load')}
   onEvent(event);
  };
  this.session=globalThis.BloomGamekitRollback.createRoomSession({adapter,players:room?.players||['solo'],localPlayerId:this.localPlayerId,sessionId:room?.sessionId||'budmori-solo',simulationVersion:'budmori-farm-'+PRODUCT_VERSION,seed:world.seed,inputSize:1,mode:room?'online':'local',room:room||undefined,profile:{...globalThis.BloomGamekitRollback.profiles.action,mode:'lockstep',tickRate:20,baseInputDelayTicks:room?2:0,minInputDelayTicks:room?2:0,maxInputDelayTicks:room?2:0,adaptiveInputDelay:false,pacingPolicy:'none',checksumInterval:20,stateHistorySize:32,maxSnapshotBytes:8388608},membership:{maxPlayers:CONFIG.maxRaidPlayers,transitionTimeoutMs:30000,reconnectGraceMs:10000,maxCatchupSteps:4},onEvent:emitEvent});
  this.loop=globalThis.BloomGamekitSimloop.createLoop({session:this.session,getInput:()=>({input:new Uint8Array(1),commands:(this.session.ready?this.pending.splice(0,32):[]).map(payload=>({payload})),predict:false}),canAdvance:()=>true,canObserveInput:()=>!this.session.closed&&!this.session.failure,onError,onBacklogDrop:()=>{this.pendingPresentationMode='reset'},
   onAdvance:result=>{if(this.session.resimulating)return;if(this.pendingPresentationMode)this.capturePresentation(this.pendingPresentationMode);else if(result.status==='advanced'&&!this.paused)this.capturePresentation('continuous')}});
  this.capturePresentation('reset');
 }
 capture(){return {tick:this.tick,epoch:this.epoch,players:this.players,speed:this.speed,world:snapshot(this.world)}}
 validate(s,ctx={}){if(!Number.isSafeInteger(s.tick)||s.tick<0||!Number.isSafeInteger(s.epoch)||s.epoch<0||!Array.isArray(s.players)||s.players.length>CONFIG.maxRaidPlayers||s.players.some(p=>typeof p!=='string')||![1,4].includes(s.speed)||ctx.tick!==undefined&&s.tick!==ctx.tick||ctx.membershipEpoch!==undefined&&s.epoch!==ctx.membershipEpoch)throw Error('Invalid farm snapshot');return restore(s.world)}
 load(s){this.world=this.validate(s);this.tick=s.tick;this.epoch=s.epoch;this.players=[...s.players];this.speed=s.speed;this.presentationIds=new WeakMap();this.nextPresentationId=1;bindPresentationClock(this.world,null);this.pendingPresentationMode='load'}
 queue(type,args={}){if(this.session.closed||this.pending.length>=64)return false;this.pending.push(codec.encode({type,...args}));return true}
 deployNext(x,y){const w=this.world,roster=w.scene==='raid'&&w.raidRoster(this.localPlayerId);if(!roster||!Number.isFinite(x)||!Number.isFinite(y))return false;this.localDeploySequence=Math.max(this.localDeploySequence,roster.lastDeploySequence);if(this.localDeploySequence-roster.lastDeploySequence>=w.raidRemaining(this.localPlayerId))return false;const sequence=this.localDeploySequence+1;if(!this.queue('deploy',{sequence,x,y}))return false;this.localDeploySequence=sequence;return true}
 step({tick,inputs}){
  for(const f of inputs){if(!this.players.includes(f.playerId))continue;for(const c of f.commands){try{this.command(codec.decode(c.payload),f.playerId)}catch{/* Reject malformed remote intent without changing the world. */}}}
  if(this.paused&&!this.room){this.tick=tick+1;return}
  const w=this.world,startTime=w.time,speed=this.speed,loopStart=this.loop?.simulationTimeMs,startClock=this.adjustedWallTime(Number.isFinite(loopStart)?loopStart:this.pulseTimestamp??globalThis.performance.now()),presentationStartMs=Math.max(0,startClock-(this.presentationOriginWallMs??startClock));bindPresentationClock(w,time=>(presentationStartMs+(time-startTime)*1000/speed)/1000);
  if(w.scene==='farm')w.advanceAutoTaps(.05);for(let i=0;i<6*speed;i++)w.step(CONFIG.fixedStep);this.tick=tick+1;if(!this.session.resimulating)this.presentationTick++;
 }
 command(c,ownerId=this.localPlayerId){const w=this.world;
  switch(c.type){
   case 'feed':if(w.scene==='farm')w.tapFood('manual');break;
   case 'mode':if(w.scene==='farm'&&['breed','merge'].includes(c.value)){if(c.value!=='merge')w.mergeTask=null;w.mode=c.value}break;
   case 'speed':if([1,4].includes(c.value))this.speed=c.value;break;
   case 'invest':if(typeof c.id==='string'&&w.scene==='farm')w.progress.invest(c.id);break;
   case 'ability-invest':if(w.scene==='farm'&&typeof c.abilityId==='string'&&typeof c.nodeId==='string'&&c.abilityId.length<64&&c.nodeId.length<32)w.investAbilityNode(c.abilityId,c.nodeId);break;
   case 'ability-reset':if(w.scene==='farm')w.resetAbilityTree();break;
   case 'register-roster':if(Array.isArray(c.entries))w.registerRaidRoster(ownerId,c.entries,c.abilitySnapshot,c.settlement||null);break;
   case 'deploy':if(Number.isSafeInteger(c.sequence)&&Number.isFinite(c.x)&&Number.isFinite(c.y))w.deployNextRaidUnit(ownerId,c.sequence,c.x,c.y);break;
   case 'buff':w.useRaidBuff(ownerId);break;
  }
 }
 presentationIdentity(kind,source){let id=this.presentationIds.get(source);if(!id){id=this.nextPresentationId++;this.presentationIds.set(source,id)}return kind+':'+id}
 get paused(){return this._paused}
 set paused(value){value=!!value;if(value===this._paused)return;const now=globalThis.performance.now();if(value)this.pauseStartedAt=now;else if(this.pauseStartedAt!==null){this.pausedDurationMs+=now-this.pauseStartedAt;this.pauseStartedAt=null}this._paused=value}
 adjustedWallTime(now){return now-this.pausedDurationMs-(this._paused&&!this.room&&this.pauseStartedAt!==null?now-this.pauseStartedAt:0)}
 capturePresentation(mode='continuous'){
  if(mode!=='continuous'&&this.presentationSequence>0)this.presentationRevision++;
  const world=this.world,receiptNowMs=this.captureClock(),timeMs=this.presentationOriginWallMs===null?0:Math.max(this.latestCaptureTimeMs,receiptNowMs-this.presentationOriginWallMs),entities=[];
  if(this.presentationOriginWallMs===null)this.presentationOriginWallMs=receiptNowMs;
  for(const u of world.units)entities.push({id:'unit:'+u.id,generation:0,source:new UnitRender(u,world)});
  entities.push({id:'boss',generation:0,source:new BossRender(world.boss)});
  for(const f of world.food)entities.push({id:this.presentationIdentity('food',f),generation:0,source:new FoodRender(f)});
  for(const p of world.projectiles)entities.push({id:'projectile:'+p.id,generation:0,source:new ProjectileRender(p)});
  for(const e of world.effects)entities.push({id:this.presentationIdentity('effect',e),generation:0,source:new EffectRender(e)});
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
 dispose(){this.loop.stop();this.session.close();this.pending=[]}
}
