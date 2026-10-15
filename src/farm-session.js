import {Garden,CONFIG,ArenaGeometry} from './farm-model.js';
import {snapshot,restore} from './farm-state.js';
import {COMPATIBILITY} from './version.js';
const {binaryCodec:codec}=globalThis.BloomGamekitDeterministic;
const point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Math.abs(p.x)<100&&Math.abs(p.y)<100;
export class FarmSession{
 constructor(world=new Garden(),{room=null,onError=console.error,onEvent=()=>{}}={}){
  this.world=world;this.previous=null;this.renderAt=0;this.tick=0;this.epoch=0;this.players=[];this.speed=1;this.paused=false;this.pending=[];this.room=room;this.localPlayerId=room?.localPlayerId||'solo';
  const adapter={save:()=>codec.encode(this.capture()),load:bytes=>this.load(codec.decode(bytes)),validateSnapshot:(bytes,context={})=>{try{this.validate(codec.decode(bytes),context);return true}catch{return false}},applyMembership:change=>{this.epoch=change.epoch;this.players=[...change.players];if(this.world.cast&&!this.players.includes(this.world.cast.owner))this.world.cancelCharge()},step:ctx=>this.step(ctx)};
  this.session=globalThis.BloomGamekitRollback.createRoomSession({adapter,players:room?.players||['solo'],localPlayerId:this.localPlayerId,sessionId:room?.sessionId||'budmori-solo',simulationVersion:'budmori-farm-'+COMPATIBILITY,seed:world.seed,inputSize:1,mode:room?'online':'local',room:room||undefined,profile:{...globalThis.BloomGamekitRollback.profiles.action,mode:'lockstep',tickRate:20,baseInputDelayTicks:room?2:0,minInputDelayTicks:room?2:0,maxInputDelayTicks:room?2:0,adaptiveInputDelay:false,pacingPolicy:'none',checksumInterval:20,stateHistorySize:32,maxSnapshotBytes:8388608},membership:{maxPlayers:5,transitionTimeoutMs:30000,reconnectGraceMs:10000,maxCatchupSteps:4},onEvent});
  this.loop=globalThis.BloomGamekitSimloop.createLoop({session:this.session,getInput:()=>({input:new Uint8Array(1),commands:(this.session.ready?this.pending.splice(0,32):[]).map(payload=>({payload})),predict:false}),canAdvance:()=>true,canObserveInput:()=>!this.session.closed&&!this.session.failure,onError});
 }
 capture(){return {tick:this.tick,epoch:this.epoch,players:this.players,speed:this.speed,world:snapshot(this.world)}}
 validate(s,ctx={}){if(!Number.isSafeInteger(s.tick)||s.tick<0||!Number.isSafeInteger(s.epoch)||s.epoch<0||!Array.isArray(s.players)||s.players.length>5||s.players.some(p=>typeof p!=='string')||![1,4].includes(s.speed)||ctx.tick!==undefined&&s.tick!==ctx.tick||ctx.membershipEpoch!==undefined&&s.epoch!==ctx.membershipEpoch)throw Error('Invalid farm snapshot');return restore(s.world)}
 load(s){this.previous=null;this.world=this.validate(s);this.tick=s.tick;this.epoch=s.epoch;this.players=[...s.players];this.speed=s.speed}
 queue(type,args={}){if(!this.session.ready||this.pending.length>=64)return false;this.pending.push(codec.encode({type,...args}));return true}
 step({tick,inputs}){
  for(const f of inputs){if(!this.players.includes(f.playerId))continue;for(const c of f.commands){try{this.command(codec.decode(c.payload),f.playerId)}catch{/* Reject malformed remote intent without changing the world. */}}}
  if(this.paused&&!this.room){this.tick=tick+1;return}
  const w=this.world;this.previous=new Map(w.units.map(u=>[u.id,{x:u.x,y:u.y,z:u.z,angle:u.angle}]));this.renderAt=performance.now();if(w.cast){w.cast.elapsed+=.05;if(w.cast.elapsed>6)w.cancelCharge()}
  w.advanceAutoTaps(.05);for(let i=0;i<6*this.speed;i++)w.step(CONFIG.fixedStep);this.tick=tick+1;
 }
 command(c,owner){const w=this.world;
  switch(c.type){
   case 'feed':w.tapFood('manual');break;
   case 'mode':if(['breed','merge'].includes(c.value))w.mode=c.value;break;
   case 'scene':if(['farm','raid'].includes(c.value))w.setScene(c.value);break;
   case 'speed':if([1,4].includes(c.value))this.speed=c.value;break;
   case 'invest':if(typeof c.id==='string')w.progress.invest(c.id);break;
   case 'move':if(w.scene==='raid'&&point(c.point)&&ArenaGeometry.inside(c.point))w.command(c.point.x,c.point.y);break;
   case 'charge':if(!w.cast&&point(c.origin)&&ArenaGeometry.inside(c.origin)&&Array.isArray(c.ids)){const eligible=new Set(w.chargeMembers(c.origin.x,c.origin.y));const ids=[...new Set(c.ids)].filter(id=>eligible.has(id));if(w.beginCharge(c.origin,w.progress.controlRadius,ids,c.pointerType==='touch'?'touch':'mouse'))w.cast.owner=owner}break;
   case 'aim':if(w.cast?.owner===owner&&point(c.point))w.aimCharge(c.point);break;
   case 'release':if(w.cast?.owner===owner&&point(c.point)){w.aimCharge(c.point);if(ArenaGeometry.inside(c.point))w.releaseCharge();else w.cancelCharge()}break;
   case 'cancel':if(w.cast?.owner===owner)w.cancelCharge();break;
  }
 }
 presentation(now){
  const w=this.world;if(!this.previous||this.paused)return w;const alpha=Math.max(0,Math.min(1,(now-this.renderAt)/50));
  const view=Object.create(w);view.units=w.units.map(u=>{const p=this.previous.get(u.id);if(!p)return u;const shown=Object.create(Object.getPrototypeOf(u));Object.assign(shown,u,{x:p.x+(u.x-p.x)*alpha,y:p.y+(u.y-p.y)*alpha,z:p.z+(u.z-p.z)*alpha});return shown});return view;
 }
 pulse(now){this.loop.pulse(now,{render:false})}
 dispose(){this.loop.stop();this.session.close();this.pending=[]}
}
