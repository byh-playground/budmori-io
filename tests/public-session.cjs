'use strict';
// Native actual-engine/SDK/final-runtime lifecycle campaign. Only the public
// directory capability is controlled: synthetic in-memory rooms, no Nostr,
// WebRTC, browser credentials, browser storage integration or WebGL claim.
const assert=require('node:assert/strict');
const {candidate,network}=require('./shared-harness.cjs');
const {harness}=require('./session-runtime.cjs');
const source=candidate();
const sdkExportEnd='/* END GAMEKIT rollback-netcode */';
source.html=source.html.replace(sdkExportEnd,`${sdkExportEnd}\nBloomOwnedSDK={...BloomOwnedSDK,createNostrPublicRoom:options=>globalThis.qaPublicProvider(options)};`);
const open=[];
function storage(){const data=new Map();return{data,getItem:k=>data.get(k)??null,setItem(k,v){data.set(k,String(v))},removeItem:k=>data.delete(k)}}
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return{promise,resolve,reject}}
async function turns(n=8){for(let i=0;i<n;i++)await Promise.resolve()}
function make(){
 const a=harness(source),calls=[],tab=storage(),disk=storage();
 // Complete the native DOM sink's removal behavior for actual binding cleanup.
 // No production listener, public lifecycle or gameplay code is replaced.
 const doc=a.e.doc,actions=doc.getElementById('actions'),createElement=doc.createElement;
 doc.removeEventListener=function(type,listener,options){const capture=options===true||!!options?.capture;this.handlers[type]=(this.handlers[type]||[]).filter(h=>h.f!==listener||h.capture!==capture)};
 doc.createElement=tag=>{const node=createElement(tag);node.remove=()=>{const index=actions.children.indexOf(node);if(index!==-1)actions.children.splice(index,1)};return node};
 a.e.c.sessionStorage=tab;a.e.c.localStorage={...disk,setItem(key,value){disk.setItem(key,value);a.messages.push({type:'disk',disk:value,tick:JSON.parse(value).tick})}};
 a.e.c.qaPublicProvider=options=>{const d=deferred();calls.push({options,...d});return d.promise.then(r=>{options.signal.addEventListener('abort',()=>r.close(),{once:true});if(options.signal.aborted)r.close();return r})};
 Object.assign(a,{calls,tab,disk,start:opts=>{a.e.c.qaStartOptions=opts||{};return a.e.run('PublicSession.start(qaStartOptions)')},phase:()=>a.e.run('PublicSession.phase')});open.push(a);return a;
}
function room(net,id,resumed=false){const r=net.add(id,resumed);r.forgetCount=0;r.forgetResume=()=>{r.forgetCount++};return r}
function pass(label){console.log('PASS '+label)}
const bytes=a=>Buffer.from(a.e.run('bloomAdapter.save()'));
async function begin(a,r,options){const p=a.start(options);await turns();a.calls.at(-1).resolve(r);assert.equal(await p,true);return r}
function assertHealthy(a){assert.equal(a.e.run('BloomDiagnostics.fatal'),false);assert(!a.e.run('bloomSession.failure'))}
async function main(){
 try{
  const a=make();await a.init();await a.fixture("WorldPlayers.data(WorldPlayers.local()).minerals=731;WorldPlayers.data(WorldPlayers.local()).campaign.permanents.instructionSeen=true");a.drive(4);await a.control({paused:true,modalKind:'pause'});await a.request('save');
  const soloBytes=bytes(a),soloDisk=a.disk.getItem(a.e.run('CONFIG.saveKey')),savedWrites=a.messages.length;
  // Disk import begins a new SDK timeline. Compare every canonical byte with
  // an independent normal restore rather than requiring the old SDK tick.
  const restoredReference=make();await restoredReference.init(soloDisk);const restoredSoloBytes=bytes(restoredReference);
  // Bind the real capture listener using a native DOM surface, then restore the
  // headless presentation guard. No gameplay or lifecycle implementation patch.
  const actions=a.e.doc.getElementById('actions'),listeners=()=>a.e.doc.handlers.click?.length||0,initialListeners=listeners();
  const bind=()=>a.e.run('(()=>{BLOOM_HEADLESS=false;try{return PublicSession.bind()}finally{BLOOM_HEADLESS=true}})()');
  const unsubscribe=bind();assert.equal(bind(),unsubscribe);assert.equal(listeners(),initialListeners+1);assert.equal(actions.children.filter(e=>e.id==='publicStatus').length,1);
  const abandoned=a.start();a.e.run('PublicSession.cancel()');
  const first=a.start();a.e.click({action:'start'});a.e.click({action:'start'});await turns();
  assert.equal(await abandoned,false,'Cancellation during the solo snapshot must not start a stale discovery');
  assert.equal(a.calls.length,1);assert.equal(a.phase(),'discovering');assert.deepEqual(bytes(a),soloBytes);
  const options=a.calls[0].options;assert.equal(options.maxPlayers,5);assert.equal(options.resume.storage,a.tab);assert.equal(options.resume.key,'budmori-public-resume-v1');assert.equal(options.resume.lifetimeMs,30*60*1000);assert.equal(options.resume.reset,false);
  a.e.run('PublicSession.unbind();PublicSession.unbind()');assert.equal(listeners(),initialListeners);assert.equal(actions.children.filter(e=>e.id==='publicStatus').length,0);
  a.e.click({public:'cancel'});assert.equal(a.phase(),'discovering');assert.equal(options.signal.aborted,false);
  const rebound=bind();assert.notEqual(rebound,unsubscribe);unsubscribe();assert.equal(bind(),rebound);assert.equal(listeners(),initialListeners+1);assert.equal(actions.children.filter(e=>e.id==='publicStatus').length,1);
  a.e.click({public:'cancel'});assert.equal(options.signal.aborted,true);assert.equal(a.phase(),'idle');
  const stale=room(network(),'cancelled');a.calls[0].resolve(stale);assert.equal(await first,false);assert(stale.closed);assert.deepEqual(bytes(a),soloBytes);assert.equal(a.messages.length,savedWrites);
  pass('Repeated bind/unbind owns one label and listener; Start deduplicates and cancellation closes stale rooms without changing solo bytes');
  const failed=a.start();await turns();a.calls.at(-1).reject(new Error('synthetic discovery failure'));assert.equal(await failed,false);assert.equal(a.calls.at(-1).options.signal.aborted,true);assert.equal(a.phase(),'failed');assert.deepEqual(bytes(a),soloBytes);assert.equal(a.disk.getItem(a.e.run('CONFIG.saveKey')),soloDisk);assertHealthy(a);
  pass('Failed public discovery preserves the entire solo world and original disk');
  // Resolve a newer attempt before an earlier cancelled one.
  const older=a.start();await turns();const oldCall=a.calls.at(-1);a.e.run('PublicSession.cancel()');const newer=a.start();await turns();const newCall=a.calls.at(-1),world=network(),activeRoom=room(world,'owner');
  newCall.resolve(activeRoom);assert.equal(await newer,true);assert.equal(a.phase(),'playing');const publicAuthority=a.e.run('bloomSession');const lateRoom=room(network(),'late');oldCall.resolve(lateRoom);assert.equal(await older,false);assert(lateRoom.closed);assert.equal(a.e.run('bloomSession'),publicAuthority);assert.equal(activeRoom.closed,false);
  assert.equal(a.e.run('bloomTick'),0);assert.equal(a.e.run('state.time'),0);assert.notEqual(a.e.run('WorldPlayers.data(WorldPlayers.local()).minerals'),731);assert.equal(a.e.run('WorldPlayers.data(WorldPlayers.local()).campaign.permanents.instructionSeen'),false);assert.equal(a.e.run('WorldSpawn.layout().width'),7200);
  assert(a.e.run('view.x===WorldView.leader().x&&view.y===WorldView.leader().y'),'New public view begins at its own spawn without a cross-map camera flight');
  assert.equal(a.tab.getItem('budmori-public-active-v1'),'1');assert.equal(a.messages.length,savedWrites);assertHealthy(a);
  pass('Out-of-order results cannot replace the current room; public entry starts fresh rather than importing solo progression');
  assert.equal(a.e.run('bloomSession.membership.reconnectGraceMs'),30000);
  const countdownBytes=bytes(a);
  assert.equal(a.e.run("PublicSession.observeStatus('interrupted',0)"),30);
  assert.equal(a.e.run("BLOOM_HEADLESS=false;PublicSession.observeStatus('interrupted',15000)"),15);
  assert.match(actions.children.find(e=>e.id==='publicStatus').textContent,/15초/);
  a.e.run('BLOOM_HEADLESS=true');assert.equal(a.e.run("PublicSession.observeStatus('interrupted',30000)"),0);
  assert.equal(a.e.run("PublicSession.observeStatus('running',30001)"),null);
  assert.deepEqual(bytes(a),countdownBytes,'Reconnect countdown cannot mutate world authority');
  pass('Reconnect UI counts down the configured 30-second grace without mutating simulation');
  const liveCalls=a.calls.length;a.e.click({action:'start'});a.e.click({action:'start'});await turns();
  assert.equal(a.calls.length,liveCalls);assert.equal(a.e.run('bloomSession'),publicAuthority);assert.equal(activeRoom.closed,false);
  pass('Repeated Start after readiness resumes the same public session without another discovery');

  await a.control({paused:true,modalKind:'pause',input:{x:.5,y:.25,manual:true}});const tick=a.e.run('bloomTick');a.drive(3);assert.equal(a.e.run('bloomTick'),tick+3);assert.deepEqual(a.value('__sessionRuntimeTest.sample()'),{x:0,y:0,manual:false,suspended:true});assertHealthy(a);
  a.e.run('PlayerLifecycle.defeat(WorldPlayers.local(),null)');const death=a.e.run('state.time');a.drive(3);assert(a.e.run('state.time')>death);assert.deepEqual(a.value('__sessionRuntimeTest.sample()'),{x:0,y:0,manual:false,suspended:true});a.drive(55);assert.equal(a.messages.length,savedWrites);
  pass('Default single-player public room polls and advances during local menus and death without saving public progress');
  const oldRoom=activeRoom;const freshAttempt=a.start({fresh:true});await turns();const freshCall=a.calls.at(-1);assert.equal(freshCall.options.resume.reset,true);assert.equal(oldRoom.forgetCount,1);assert(oldRoom.closed);assert.equal(a.tab.getItem('budmori-public-active-v1'),null);const freshRoom=room(network(),'fresh');freshCall.resolve(freshRoom);assert.equal(await freshAttempt,true);assert.equal(a.e.run('bloomTick'),0);assert.equal(a.e.run('state.time'),0);assert.equal(a.e.run('WorldPlayers.data(WorldPlayers.local()).dead'),false);
  pass('New round clears the resume capability and starts a fresh world');
  assert.equal(await a.e.run('PublicSession.cancel()'),true);assert(freshRoom.closed);assert.equal(freshRoom.forgetCount,1);assert.equal(a.phase(),'idle');assert.equal(a.e.run('BloomSimulation.sessionConfig.mode'),'local');assert.equal(a.tab.getItem('budmori-public-active-v1'),null);assert.deepEqual(bytes(a),restoredSoloBytes);assert.equal(a.e.run('BloomSimulation.runtime.metrics.persistenceAvailable'),true);
  pass('Cancellation after room readiness gracefully closes the room and restores exact original solo progress');
  // A second actual runtime joins through PublicSession and waits in the SDK's
  // membership lifecycle; manual pulses and byte links drive both endpoints.
  const owner=make(),peer=make(),net=network();await owner.init();await peer.init();const ownerRoom=await begin(owner,room(net,'a'));owner.drive(5);const originalPeer=bytes(peer);
  await begin(peer,room(net,'b'));assert.equal(peer.phase(),'joining');assert.equal(peer.e.run('bloomSession.ready'),false);peer.e.run('BLOOM_HEADLESS=false;try{__sessionRuntimeTest.controls()}finally{BLOOM_HEADLESS=true}');peer.drive(3);assert.equal(peer.e.run('bloomTick'),0);assertHealthy(peer);assert.equal(peer.e.run('BloomSimulation.runtime.metrics.advanceStatus'),'joining');
  assert.equal(peer.e.run("bloomQueue('roll',{x:1,y:0})"),false);
  pass('Pre-admission viewport/input waits without queuing commands or making the SDK waiting state fatal');
  const cancelledJoin=make();await cancelledJoin.init();const beforeJoin=bytes(cancelledJoin),cancelledJoinRoom=room(net,'cancel-joining');
  await begin(cancelledJoin,cancelledJoinRoom);assert.equal(cancelledJoin.phase(),'joining');await cancelledJoin.e.run('PublicSession.cancel()');
  assert(cancelledJoinRoom.closed);assert.equal(cancelledJoinRoom.forgetCount,1);assert.equal(cancelledJoin.phase(),'idle');assert.deepEqual(bytes(cancelledJoin),beforeJoin);assertHealthy(cancelledJoin);
  pass('Cancel during pending membership retires the unadmitted session and restores solo');

  async function pump(list=[owner,peer],advance=true){net.flush();for(const p of list){if(p.e.run('bloomSession.closed'))continue;p.e.run('bloomSession.poll()');if(advance)p.drive()}net.flush();await turns(2)}
  async function until(fn,list,limit=1500){for(let i=0;i<limit;i++){if(fn())return;await pump(list)}throw Error('runtime room deadline '+JSON.stringify((list||[owner,peer]).map(p=>p.value('({phase:PublicSession.phase,tick:bloomTick,status:bloomSession.status,failure:bloomSession.failure})'))))}
  await until(()=>owner.e.run('bloomSession.ready&&bloomSession.players.length===2')&&peer.e.run('bloomSession.ready&&bloomSession.players.length===2')&&peer.phase()==='playing');
  assert.equal(peer.phase(),'playing');assertHealthy(owner);assertHealthy(peer);const target=Math.max(owner.e.run('bloomTick'),peer.e.run('bloomTick'));
  for(let i=0;i<300&&(owner.e.run('bloomTick')!==target||peer.e.run('bloomTick')!==target);i++){net.flush();for(const p of [owner,peer]){p.e.run('bloomSession.poll()');if(p.e.run('bloomTick')<target)p.drive()}net.flush();await turns(2)}assert.deepEqual(bytes(owner),bytes(peer));
  pass('Two final runtimes converge exactly after real SDK membership/bootstrap');
  // Hold the peer's loop and all queued byte deliveries. A local command may
  // not be consumed while lockstep has no confirmed remote input.
  owner.drive(8);assert.equal(owner.e.run('BloomSimulation.runtime.metrics.advanceStatus'),'stalled');
  await owner.command({type:'tutorialAck'});const blockedTick=owner.e.run('bloomTick');owner.drive(3);
  assert.equal(owner.e.run('bloomTick'),blockedTick);assert.equal(owner.e.run('bloomInputPending'),1);
  assert.equal(owner.e.run("WorldPlayers.data(WorldPlayers.get('a')).campaign.permanents.instructionSeen"),false);assertHealthy(owner);
  await until(()=>owner.e.run("WorldPlayers.data(WorldPlayers.get('a')).campaign.permanents.instructionSeen")&&peer.e.run("WorldPlayers.data(WorldPlayers.get('a')).campaign.permanents.instructionSeen"));
  assert.equal(owner.e.run('bloomInputPending'),0);assertHealthy(owner);assertHealthy(peer);
  pass('Delayed peer input stalls without fatal error or losing queued commands, then resumes');

  // Same-room resume delegates identity/authority validation to the SDK. The
  // fixture supplies the previously admitted id, never a real user credential.
  const peerProgress=peer.value("(()=>{const p=WorldPlayers.get('b');return{owner:p.accountOwner,x:p.leader.x,y:p.leader.y,minerals:WorldPlayers.data(p).minerals}})()");
  peer.e.run("bloomSession.close();PublicSession.failed(new Error('synthetic interrupted connection'))");const resume=peer.start();await turns();const resumeOptions=peer.calls.at(-1).options;assert.equal(resumeOptions.resume.reset,false);assert.equal(resumeOptions.resume.lifetimeMs,30*60*1000);const resumedRoom=room(net,'b',true);peer.calls.at(-1).resolve(resumedRoom);assert.equal(await resume,true);assert.equal(peer.phase(),'joining');
  await until(()=>owner.e.run('bloomSession.ready&&bloomSession.epoch===2')&&peer.e.run('bloomSession.ready&&bloomSession.epoch===2')&&peer.phase()==='playing');
  const resumed=peer.value("(()=>{const p=WorldPlayers.get('b');return{owner:p.accountOwner,x:p.leader.x,y:p.leader.y,minerals:WorldPlayers.data(p).minerals}})()");assert.deepEqual(resumed,peerProgress);assertHealthy(peer);
  pass('Same-room resume delegates bounded tab capability and preserves existing participant progression');
  const departing=owner.e.run('PublicSession.solo()');assert.equal(owner.calls.at(-1).options.signal.aborted,false,'Discovery abort signal must stay live until graceful room handover completes');assert.equal(ownerRoom.closed,false);let departed=false;departing.then(()=>departed=true);await until(()=>departed&&peer.e.run("bloomSession.ready&&bloomSession.players.length===1&&bloomSession.coordinatorId==='b'"));await departing;assert.equal(ownerRoom.forgetCount,1);assert.equal(owner.phase(),'idle');assert.equal(owner.e.run('BloomSimulation.sessionConfig.mode'),'local');assert.equal(peer.phase(),'playing');const remainingTick=peer.e.run('bloomTick');peer.drive(3);assert.equal(peer.e.run('bloomTick'),remainingTick+3);assertHealthy(peer);
  pass('Graceful coordinator departure restores solo while the remaining public world keeps running');
  await peer.e.run('PublicSession.solo()');assert.deepEqual(bytes(peer),originalPeer);
  const protectedUser=make();const bad='{unreadable original solo save}';protectedUser.disk.setItem(protectedUser.e.run('CONFIG.saveKey'),bad);await protectedUser.init(bad);const protect=await protectedUser.e.run('PublicSession.solo()');assert.equal(protect,false);assert.equal(protectedUser.messages.length,0);
  await begin(protectedUser,room(network(),'protected'));protectedUser.drive(55);await protectedUser.e.run('PublicSession.solo()');protectedUser.drive(55);protectedUser.e.run('__sessionRuntimeTest.pagehide()');assert.equal(await protectedUser.request('save'),false);assert.equal(protectedUser.disk.getItem(protectedUser.e.run('CONFIG.saveKey')),bad);assert.equal(protectedUser.messages.length,0);assert.equal(protectedUser.e.run('BloomSimulation.runtime.metrics.persistenceProtected'),true);
  pass('Unreadable original solo save remains protected across public entry, return, autosave and pagehide');
  // A newer public navigation must win over the asynchronous solo restoration
  // started by Cancel. Both use the real leave and startup paths.
  const race=make();await race.init();race.e.run('BLOOM_HEADLESS=false;PublicSession.bind();BLOOM_HEADLESS=true');await begin(race,room(network(),'race-old'));
  const cancelling=race.e.run('PublicSession.cancel()'),replacement=race.start({fresh:true});await turns();
  const replacementRoom=room(network(),'race-new');race.calls.at(-1).resolve(replacementRoom);
  await Promise.all([cancelling,replacement]);
  assert.equal(race.e.run('BloomSimulation.sessionConfig.mode'),'online','A superseded cancellation must not replace the newer public session');
  assert.equal(race.phase(),'playing');assert.equal(replacementRoom.closed,false);assert.equal(race.e.run('bloomSession.localPlayerId'),'race-new');
  pass('Newer public navigation wins over an older asynchronous cancel/solo restoration');
  const racingPeer=make(),raceNet=network();await racingPeer.init();
  await race.e.run('PublicSession.solo()');await begin(race,room(raceNet,'race-owner'));await begin(racingPeer,room(raceNet,'race-peer'));
  for(let i=0;i<1000&&!(race.e.run('bloomSession.ready&&bloomSession.players.length===2')&&racingPeer.e.run('bloomSession.ready&&bloomSession.players.length===2'));i++){
   raceNet.flush();for(const p of [race,racingPeer]){p.e.run('bloomSession.poll()');p.drive()}raceNet.flush();await turns(2);
  }
  assert(race.e.run('bloomSession.ready&&bloomSession.players.length===2'));
  const callCount=race.calls.length,pendingLeave=race.e.run('PublicSession.solo()'),newWorld=race.start({fresh:true}),newRoom=room(network(),'race-newest');
  for(let i=0;i<1000&&race.calls.length===callCount;i++){raceNet.flush();for(const p of [race,racingPeer]){if(p.e.run('bloomSession.closed'))continue;p.e.run('bloomSession.poll()');p.drive()}raceNet.flush();await turns(2)}
  assert.equal(race.calls.length,callCount+1,'Newest start must complete its graceful departure before discovering');race.calls.at(-1).resolve(newRoom);
  const [cancelledResult,startedResult]=await Promise.all([pendingLeave,newWorld]);assert.equal(cancelledResult,false);assert.equal(startedResult,true);
  assert.equal(race.e.run('BloomSimulation.sessionConfig.mode'),'online','A superseded multi-peer leave must not replace the newer public session');
  assert.equal(race.e.run('bloomSession.localPlayerId'),'race-newest');assert.equal(newRoom.closed,false);
  pass('New public entry wins over a superseded multi-peer graceful leave');
  const activeMarker=race.tab.getItem('budmori-public-active-v1');
  race.e.run('PublicSession.dispose();PublicSession.dispose()');
  assert(newRoom.closed);assert.equal(newRoom.forgetCount,0);assert.equal(race.phase(),'idle');assert.equal(race.tab.getItem('budmori-public-active-v1'),activeMarker);
  assert.equal(race.e.doc.getElementById('actions').children.filter(e=>e.id==='publicStatus').length,0);
  const disposal=make();await disposal.init();const disposedBytes=bytes(disposal),disposedStart=disposal.start();await turns();const disposedCall=disposal.calls.at(-1);
  disposal.e.run('PublicSession.dispose();PublicSession.dispose()');assert.equal(disposedCall.options.signal.aborted,true);const disposedRoom=room(network(),'disposed-late');disposedCall.resolve(disposedRoom);
  assert.equal(await disposedStart,false);assert(disposedRoom.closed);assert.equal(disposal.phase(),'idle');assert.deepEqual(bytes(disposal),disposedBytes);
  pass('Final disposal is idempotent, closes rooms and stale discoveries, removes bindings and preserves reload resume capability');
  console.log('PASS public lifecycle campaign '+JSON.stringify({sdk:source.sdk,packets:net.delivered}));
 }finally{for(const a of open)await a.close()}
}
main().catch(error=>{console.error(error.stack);process.exitCode=1});
