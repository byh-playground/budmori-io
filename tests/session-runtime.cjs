'use strict';
// Actual HTML engine, SDK and final runtime. Native DOM/storage sinks and manual
// loop pulses are fixtures; this is not browser, WebGL, relay or RTC validation.
const assert=require('node:assert/strict');
const {session}=require('./main-harness.cjs');
const {candidate,network}=require('./shared-harness.cjs');
const hook=`globalThis.__sessionRuntimeTest={
 drive(count=1){bloomLoop.resetTiming();bloomLoop.pulse(0);for(let i=1;i<=count;i++)bloomLoop.pulse(i*1000/CONFIG.sim.tickRate);return {tick:bloomTick,time:state.time,active:active(),status:metrics.advanceStatus}},
 sample:()=>bloomDecodeInput(sampleInput()),pagehide,controls,
 waiting(status){return afterAdvance({status},performance.now())},
 get pending(){return bloomInputPending}
};/* MAIN_RUNTIME_TEST_HOOK */`;
function harness(source=candidate()){
 const a=session(source.file,source.html.replace('/* MAIN_RUNTIME_TEST_HOOK */',hook));
 a.e.c.AbortController=AbortController;
 a.value=expression=>a.e.json(expression);
 a.drive=(n=1)=>a.e.run(`__sessionRuntimeTest.drive(${n})`);
 return a;
}
const online={mode:'online',persistence:'none'},local={mode:'local',persistence:'solo'};
function fresh(a,config){a.e.c.qaSessionConfig=config;a.e.c.qaRoom=config.mode==='online'?network().add('solo'):null;return a.e.run("CONFIG.session.mode=qaSessionConfig.mode;CONFIG.session.persistence=qaSessionConfig.persistence;bloomInitialize(bloomSeed);BloomSimulation.runtime.replaceSession({sessionConfig:qaSessionConfig,room:qaRoom})")}
function pass(name){console.log('PASS '+name)}
async function main(){
 const source=candidate(),open=[];const make=()=>{const a=harness(source);open.push(a);return a};
 try{
  const a=make();await a.init();await a.fixture(`for(const c of state.camps){c.enabled=false;c.spawned=true;c.regrowth=[]}for(const u of state.units)if(u.team==='enemy'){u.stun=1e6;u.aggroAt=u.wanderAt=state.time+1e6}clearPointNav();bloomCore.setAutoHunt(false);`);
  await a.control({input:{x:.5,y:0,manual:true}});a.drive(3);
  assert.equal(a.e.run('bloomTick'),3);await a.control({paused:true,modalKind:'pause'});
  const paused=a.value('({tick:bloomTick,time:state.time})');a.drive(3);
  assert.deepEqual(a.value('({tick:bloomTick,time:state.time})'),paused);
  assert.deepEqual(a.value('__sessionRuntimeTest.sample()'),{x:0,y:0,manual:false,suspended:true});
  pass('Solo pause stops the actual SDK loop and releases local input');
  assert.equal(await a.request('save'),true);const soloDisk=await a.request('snapshot'),writes=a.messages.length;
  a.e.run('__sessionRuntimeTest.pagehide()');assert.equal(a.messages.length,writes+1);
  const authority=a.e.run('bloomSession'),bytes=Buffer.from(a.e.run('bloomAdapter.save()'));
  assert.throws(()=>a.e.run("BloomSimulation.runtime.replaceSession({sessionConfig:{mode:'online',persistence:'none'}})"),/Adopt the active room session/);
  assert.equal(a.e.run('bloomSession'),authority);assert.deepEqual(Buffer.from(a.e.run('bloomAdapter.save()')),bytes);
  pass('Invalid tick-preserving replacement rejects without retiring the active authority');
  fresh(a,online);assert.equal(a.e.run('bloomTick'),0);assert.equal(a.e.run('state.time'),0);
  assert.equal(a.e.run('BloomSimulation.runtime.metrics.persistenceAvailable'),false);
  const publicWrites=a.messages.length,encodes=a.e.run('bloomSnapshotStore.metrics().diskEncodes');
  a.drive(3);assert.equal(a.e.run('bloomTick'),3);assert(a.e.run('state.time')>0);
  assert.deepEqual(a.value('__sessionRuntimeTest.sample()'),{x:0,y:0,manual:false,suspended:true});
  assert.equal(a.e.run('BloomDiagnostics.fatal'),false);pass('Fresh one-person public world advances through a local menu');
  await a.control({input:{x:.5,y:0,manual:true}});assert.equal(a.e.run('__sessionRuntimeTest.sample().suspended'),false);
  // A stopped-boundary death fixture checks scheduling, not combat resolution.
  a.e.run('WorldPlayers.data(WorldPlayers.local()).dead=true;WorldPlayers.local().leader.hp=0');
  const deathTime=a.e.run('state.time');a.drive(3);assert(a.e.run('state.time')>deathTime);
  assert.deepEqual(a.value('__sessionRuntimeTest.sample()'),{x:0,y:0,manual:false,suspended:true});
  pass('Local death supplies neutral input without freezing the public world');
  a.drive(55);assert.equal(await a.request('save'),false);assert.equal(a.e.run('save()'),false);
  await assert.rejects(a.request('snapshot'),/Local saves are unavailable/);a.e.run('__sessionRuntimeTest.pagehide()');
  assert.equal(a.e.run('reset()'),false);assert.equal(await a.request('load',{disk:soloDisk}),false);
  await assert.rejects(a.request('rate',{tickRate:20}),/paused single-player/);
  assert.equal(a.messages.length,publicWrites);assert.equal(a.e.run('bloomSnapshotStore.metrics().diskEncodes'),encodes);
  pass('Public autosave/manual/export/pagehide/reset/load/TPS never overwrite solo storage');
  for(const status of ['synchronizing','held','stalled','recovering','resimulating','interrupted','disconnected','joining','membership','catching-up']){
   a.e.c.waitStatus=status;assert.equal(a.e.run('__sessionRuntimeTest.waiting(waitStatus)'),false);
  }
  assert.equal(a.e.run('BloomDiagnostics.fatal'),false);assert.throws(()=>a.e.run('__sessionRuntimeTest.waiting("unknown")'),/SDK failed to advance/);
  fresh(a,local);assert.equal(await a.request('save'),false);a.e.run('__sessionRuntimeTest.pagehide()');assert.equal(a.messages.length,publicWrites);
  pass('Mode replacement cannot promote public progress to a solo save');
  assert.equal(await a.request('load',{disk:soloDisk}),true);await a.control({paused:true,modalKind:'pause'});assert.equal(await a.request('save'),true);
  assert.equal(a.e.run('state.time'),JSON.parse(soloDisk).worldTime);assert.equal(a.e.run('BloomSimulation.runtime.metrics.persistenceAvailable'),true);
  pass('Explicit solo restore resumes the original saved world');
  const rejected=make(),boot=await rejected.init('{invalid save}');assert(boot.persistenceProtected);
  await rejected.control();rejected.drive(55);assert.equal(await rejected.request('save'),false);
  rejected.e.run('__sessionRuntimeTest.pagehide()');assert.equal(rejected.messages.length,0);
  await assert.rejects(rejected.request('snapshot'),/Original rejected save protected/);
  assert.equal(await rejected.request('load',{disk:soloDisk}),true);assert.equal(await rejected.request('save'),true);
  pass('Failed solo import protection survives autosave/pagehide until explicit valid restore');
  const viewport=make();await viewport.init();fresh(viewport,online);
  viewport.e.run(`WorldMembership.apply({epoch:1,tick:bloomTick,players:['solo','peer']});WorldPlayers.setLocalPlayerId('peer');
   globalThis.qaViewportOwner=null;const originalViewport=visibleHuntFromViewport;visibleHuntFromViewport=(w,h,owner)=>{qaViewportOwner=owner;return originalViewport(w,h,owner)};
   BLOOM_HEADLESS=false;__sessionRuntimeTest.controls();BLOOM_HEADLESS=true;`);
  assert.equal(viewport.e.run('qaViewportOwner.id'),-2);
  pass('Final runtime publishes viewport bounds using the local participant camera scale');
  console.log('PASS continuous actual-engine session runtime campaign '+JSON.stringify({sha256:source.sha256,sdk:source.sdk}));
 }finally{for(const a of open)await a.close()}
}
module.exports={harness,hook};
if(require.main===module)main().catch(error=>{console.error(error.stack);process.exitCode=1});
