'use strict';
// Continue the campaign's real saved world through both SDK modes. Transport
// delay is a test fixture; simulation, commands, canonical codec and recovery are production.
const assert=require('node:assert/strict');
const {engine,pair}=require('./native-engine.cjs');
function run({file,html,disk,check=(label,ok)=>assert(ok,label)}){
 const e=engine(file,html),others=[];
 const bytes=x=>Buffer.from(x.run('BloomSimulation.adapter.save()'));
 const normalized=x=>Buffer.from(x.run('(()=>{const c=BloomLiveCodec.decode(bloomAdapter.save());c.tick=0;return BloomLiveCodec.encode(c)})()'));
 try{
  e.c.campaignDisk=disk;e.run('BloomSimulation.initialize(12345);BloomSimulation.createSession()');
  assert(e.run('BloomSimulation.disk.load(campaignDisk)'));
  check('Default campaign session selects lockstep with explicit checkpoint cadence',e.run('bloomSession.profile.mode==="lockstep"&&bloomSession.profile.checksumInterval===CONFIG.netcode.checksumInterval'));
  const net=pair(e,{mode:'lockstep'});others.push(net.peer);
  const advance=(input={x:0,y:0,manual:true})=>{
   const owner=net.attempt(e,input),peer=net.attempt(net.peer);
   assert(['advanced','stalled'].includes(owner.status));assert.equal(peer.status,'advanced');
   if(owner.status==='stalled')assert.equal(net.attempt(e,input).status,'advanced');
   net.poll();
  };
  const before=e.json('bloomSnapshotStore.metrics()'),peerBefore=net.peer.json('bloomSnapshotStore.metrics()');
  for(let i=0;i<4;i++)advance({x:.25,y:.1,manual:true});
  check('Lockstep advancing ticks perform no prediction or per-tick snapshots before checkpoint',
   e.run('bloomSession.tick===4&&bloomSession.confirmedTick===3&&bloomSession.metrics.predictedTicks===0&&bloomSession.metrics.rollbacks===0&&bloomSession.metrics.resimulatedTicks===0')&&
   e.run('bloomSnapshotStore.metrics().captures')===before.captures&&net.peer.run('bloomSnapshotStore.metrics().captures')===peerBefore.captures);
  // An unavailable owner's command/input must wait, not execute speculatively.
  net.delay();e.run('setPermanentHuntMode(permanentHuntMode()==="hunt"?"follow":"hunt")');
  const waiting=net.peer.json('({tick:bloomTick,time:state.time,mode:permanentHuntMode(),captures:bloomSnapshotStore.metrics().captures})');
  assert.equal(net.attempt(e,{x:.6,y:0,manual:true}).status,'stalled');
  for(let i=0;i<3;i++)assert.equal(net.attempt(net.peer).status,'stalled');
  check('Missing lockstep input stalls authority and command without snapshots',
   JSON.stringify(net.peer.json('({tick:bloomTick,time:state.time,mode:permanentHuntMode(),captures:bloomSnapshotStore.metrics().captures})'))===JSON.stringify(waiting));
  assert.equal(net.attempt(e).status,'advanced');net.release();assert.equal(net.attempt(net.peer).status,'advanced');net.poll();
  check('Delayed lockstep command runs once and peers converge without rollback',net.same()&&net.peer.run('permanentHuntMode()')!==waiting.mode&&net.peer.run('bloomSession.metrics.predictedTicks===0&&bloomSession.metrics.rollbacks===0&&bloomSession.metrics.resimulatedTicks===0'));
  // Current tick is deliberately between periodic checkpoints. Explicit hash,
  // replay capture this authority on demand; recovery uses its retained checkpoint
  // and the complete confirmed-input suffix to rebuild this exact current tick.
  const hash=e.run('bloomSession.getStateHash()');
  check('On-demand lockstep state hash matches complete current canonical bytes',hash===e.run('BloomOwnedSDK.hashBytes(bloomAdapter.save())'));
  const replay=e.run('bloomSession.exportReplay()'),replayEngine=engine(file,html);others.push(replayEngine);replayEngine.c.savedReplay=replay;
  replayEngine.run('BloomSimulation.initialize(12345);BloomSimulation.ownerId="owner";BloomSimulation.multiplayer=true');
  const played=replayEngine.run('BloomOwnedSDK.playReplay({adapter:bloomAdapter,replay:savedReplay})');
  check('Non-checkpoint lockstep replay preserves future-relevant combat graph',played.hash===replay.hash&&played.tick===5&&bytes(replayEngine).equals(bytes(e)));
  net.peer.run('state.mother.hp-=1;bloomSnapshotStore.invalidate()');
  assert(net.peer.run('bloomSession.requestResync(bloomSession.tick)'));net.poll();net.poll();
  check('Non-checkpoint recovery restores complete lockstep authority',net.same()&&net.peer.run('bloomSession.metrics.recoveries')===1);
  advance({x:0,y:.35,manual:true});check('Recovered lockstep world continues deterministically',net.same());
  net.peer.run('bloomSession.close()');e.run('bloomSession.close();BloomSimulation.multiplayer=false');
  // Repeated next-session switches preserve the saved world. The selected mode
  // is not serialized and changing CONFIG must not mutate the active profile.
  const reference=engine(file,html);others.push(reference);
  reference.c.authority=Uint8Array.from(bytes(e));reference.run('BloomSimulation.initialize(12345);bloomAdapter.load(authority)');
  for(const mode of ['rollback','lockstep','rollback','lockstep']){
   const prior=e.run('bloomSession.profile.mode');e.c.nextMode=mode;e.run('CONFIG.netcode.mode=nextMode');
   check('Config '+mode+' waits for next session boundary',e.run('bloomSession.profile.mode')===prior);
   const beforeSwitch=normalized(e);e.run('BloomSimulation.createSession();playing=true;paused=false;modalKind=""');
   reference.c.nextMode=mode;reference.run('CONFIG.netcode.mode=nextMode;BloomSimulation.createSession();playing=true;paused=false;modalKind=""');
   check('Switch '+mode+' preserves canonical saved world',e.run('bloomSession.profile.mode')===mode&&normalized(e).equals(beforeSwitch));
   for(let i=0;i<3;i++){const input={x:i%2?.3:-.2,y:.1,manual:true};e.tick(1,input);reference.tick(1,input)}
   check('Switch '+mode+' preserves identical future evolution',bytes(e).equals(bytes(reference)));
  }
  e.run('globalThis.previousSession=bloomSession;CONFIG.netcode.mode="invalid"');assert.throws(()=>e.run('BloomSimulation.createSession()'),/Netcode mode/);
  check('Invalid mode cannot close or replace the active session',e.run('bloomSession===previousSession&&!bloomSession.closed'));
  e.run('CONFIG.netcode.mode="lockstep";CONFIG.netcode.checksumInterval=33');assert.throws(()=>e.run('BloomSimulation.createSession()'),/Checksum interval/);
  check('Invalid checkpoint cadence preserves the active session',e.run('bloomSession===previousSession&&!bloomSession.closed'));e.run('CONFIG.netcode.checksumInterval=30');
  const mismatched=engine(file,html);others.push(mismatched);mismatched.run('BloomSimulation.initialize(12345);BloomSimulation.createSession()');const incompatible=pair(mismatched,{mode:'lockstep',peerMode:'rollback',ready:false});others.push(incompatible.peer);
  check('Mismatched modes stop with clear refresh and same-settings diagnostics',[mismatched,incompatible.peer].every(x=>x.run('bloomSession.failure?.type==="handshake-mismatch"&&BloomDiagnostics.fatal&&BloomDiagnostics.snapshot().errors.some(e=>e.kind==="sdk.compatibility"&&e.message.includes("새로고침"))')));
  return {mode:'lockstep',checkpoints:e.run('CONFIG.netcode.checksumInterval'),stalledTick:waiting.tick,replayTick:played.tick,cacheCopies:e.run('bloomSnapshotStore.metrics().cacheCopies')};
 }finally{e.run('bloomSession?.close()');for(const peer of others)peer.run('bloomSession?.close()')}
}
module.exports={run};
if(require.main===module){const fs=require('node:fs'),file=process.argv[2]||`${__dirname}/../index.html`,e=engine(file);e.run('BloomSimulation.initialize(12345);BloomSimulation.createSession()');const disk=e.run('BloomSimulation.disk.snapshot()');e.run('bloomSession.close()');console.log(run({file,html:fs.readFileSync(file,'utf8'),disk,check(label,ok){assert(ok,label);console.log('PASS '+label)}}))}
