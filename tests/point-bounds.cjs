'use strict';
// Actual command codec, controller and SDK. Multiplayer transport is in-memory;
// browser/RTC coverage remains in the continuous browser campaign.
const assert=require('node:assert/strict'),path=require('node:path');
const {engine}=require('./native-engine.cjs'),{candidate,campaign}=require('./shared-harness.cjs');
function checkCodec(e){
 const {w,h,q}=e.json('({w:CONFIG.openWorld.width,h:CONFIG.openWorld.height,q:CONFIG.pointMove.quantum})');
 const points=[[0,0],[w,0],[0,h],[w,h],[-w,-h]];
 for(const [x,y]of points){e.c.qaPoint={version:1,type:'point',x:x*q,y:y*q,roll:false};assert(e.run('BloomSimulation.encodeCommand(qaPoint).length')>0)}
 for(const [x,y]of [[w*q+1,0],[-w*q-1,0],[0,h*q+1],[0,-h*q-1],[Number.MAX_SAFE_INTEGER+1,0],[NaN,0],[0,Infinity],[.5,0]]){e.c.qaPoint={version:1,type:'point',x,y,roll:false};assert.throws(()=>e.run('BloomSimulation.encodeCommand(qaPoint)'),/Point destination/)}
 return points.map(([x,y])=>({x:x*q,y:y*q,roll:false}));
}
function expected(e,point,id){e.c.qaPoint=point;e.c.qaOwner=id;return e.json('(()=>{const p=WorldPlayers.get(qaOwner);return openWorldPoint(qaPoint.x/CONFIG.pointMove.quantum,qaPoint.y/CONFIG.pointMove.quantum,moaBodyRadius(p.leader))})()')}
function reachedOrDirected(e,id,target){e.c.qaOwner=id;const p=e.json('(()=>{const p=WorldPlayers.get(qaOwner);return{goal:p.navigation.goal,x:p.leader.x,y:p.leader.y,auto:p.auto.enabled}})()');assert.equal(p.auto,false);if(p.goal){assert.equal(p.goal.x,target.x);assert.equal(p.goal.y,target.y)}else assert(Math.hypot(p.x-target.x,p.y-target.y)<=10);}
(async()=>{
 const solo=engine(path.join(__dirname,'../index.html'));solo.run("BloomSimulation.initialize(12345);BloomSimulation.createSession();playing=true;paused=false;modalKind=''");
 for(const point of checkCodec(solo)){const target=expected(solo,point,'solo');solo.c.qaPoint={version:1,type:'point',...point};solo.run('bloomSession.queueCommand(BloomSimulation.encodeCommand(qaPoint))');solo.tick(2,{x:0,y:0,manual:false});reachedOrDirected(solo,'solo',target)}solo.run('bloomSession.close()');
 const world=campaign(candidate());try{
  const host=world.add('host'),peer=world.add('peer');await world.until(()=>world.live().every(e=>e.run('bloomSession.ready')));await world.settle();
  for(const e of [host,peer])world.controls.set(e,{x:0,y:0,manual:false});
  const points=checkCodec(host);checkCodec(peer);
  // Find genuinely walkable terrain beyond the retired 6250-unit bound.
  const edge=host.json('(()=>{for(let y=100;y<CONFIG.openWorld.height;y+=50)for(let x=6300;x<CONFIG.openWorld.width;x+=50)if(ThemedTerrain.walkable(x,y,60))return{x:x*CONFIG.pointMove.quantum,y:y*CONFIG.pointMove.quantum,roll:false};throw Error("No far-edge land")})()');
  points.push(edge);
  for(const actor of [host,peer])for(const point of points){const target=expected(actor,point,actor.id);world.command(actor,'point',point);await world.ticks(4);for(const e of world.live())reachedOrDirected(e,actor.id,target)}
  assert(host.run('bloomAdapter.validateSnapshot(bloomAdapter.save(),{tick:bloomTick,membershipEpoch:bloomSession.epoch})'));
 }finally{world.close()}
 console.log('PASS local and remote point commands at every world corner and far-edge land; signed projection retained; oversized/unsafe values rejected');
})().catch(e=>{console.error(e.stack);process.exitCode=1});
