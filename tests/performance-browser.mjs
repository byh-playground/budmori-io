// Run with: xvfb-run -a node tests/performance-browser.mjs BEFORE.html AFTER.html
// Real Chromium, software WebGL and production RAF/simulation scheduling. Test
// routes only add a stopped fixture/read/clock hook; neither shipped file changes.
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const runtimeSource=require('./runtime-source.cjs'),moduleFixture=require('./module-reference-fixture.cjs'),fontFixture=require('./font-asset-fixture.cjs');
const before=process.argv[2]&&resolve(process.argv[2]),after=resolve(process.argv[3]||fileURLToPath(new URL('../index.html',import.meta.url)));
assert(before,'Pass the exact v65 Worker baseline HTML as the first argument');
const expectedBefore='50650d009c0356e79750f1dbfacd5fcf344927d0939f3972c2d564e717c57a5d';
const dense=await readFile(new URL('./dense-fixture.js',import.meta.url),'utf8');
const summaries=a=>{const s=[...a].sort((a,b)=>a-b);return{samples:s.length,p50:s[Math.ceil(s.length*.5)-1]??null,p95:s[Math.ceil(s.length*.95)-1]??null,p99:s[Math.ceil(s.length*.99)-1]??null}};
const workerBranch=`if(m.type==='__fixture'){clearTimeout(timer);bloomSession.close();manualClock=true;(0,eval)(m.source);rebuildGrid();spatialBoundary();boundary();playing=true;paused=false;modalKind='';publish(true);reply(m.id,true);return;}else if(m.type==='__read'){reply(m.id,(0,eval)(m.expression));return;}else if(m.type==='__clock'){manualClock=!!m.manual;deadline=performance.now()+1000/CONFIG.sim.tickRate;schedule();reply(m.id,true);return;}`;
function instrumentLegacyHTML(html){
 if(html.includes('globalThis.BLOOM_WORKER_AUTHORITY = true;')){
  assert(html.includes("      if (!initialized || fatal) throw new Error('Worker is not available');"));
  return html.replace("      if (!initialized || fatal) throw new Error('Worker is not available');","      if (!initialized || fatal) throw new Error('Worker is not available');\n"+workerBranch).replace('  function controls(force = false) {','  globalThis.__budmoriTest={request};\n  function controls(force = false) {').replace('  globalThis.BLOOM_WORKER_AUTHORITY = true;','  globalThis.BLOOM_WORKER_AUTHORITY = true;globalThis.BLOOM_WORKER_TEST_MODE=true;');
 }
 // The runtime owner supplies this non-shipped injection separately, preserving
 // exactly the same fixture/read/clock contract for the new main-thread runtime.
 assert(html.includes('/* MAIN_RUNTIME_TEST_HOOK */'),'Missing main-runtime test insertion boundary');
 return html.replace('/* MAIN_RUNTIME_TEST_HOOK */',require('./main-runtime-hook.cjs'));
}
const sources=await Promise.all([before,after].map(f=>readFile(f,'utf8'))),rawHashes=sources.map(s=>createHash('sha256').update(s).digest('hex'));assert.equal(rawHashes[0],expectedBefore,'Wrong before baseline');
const apps=[runtimeSource.read(before,sources[0]),runtimeSource.read(after,sources[1])];
assert(apps[1].config&&apps[1].game&&apps[1].bootstrap,'AFTER must be the authentic split runtime; inline/source fallback is not supported');
function candidate(app,index){
 if(!app.config)return{html:instrumentLegacyHTML(app.html),config:null};
 assert(app.game&&app.bootstrap,'Split runtime manifest must resolve authentic game and bootstrap sources');
 if(app.game.includes('/* MAIN_RUNTIME_TEST_HOOK */'))return runtimeSource.response(app,app.game.replace('/* MAIN_RUNTIME_TEST_HOOK */',require('./main-runtime-hook.cjs')));
 if(index===0)return runtimeSource.response(app,instrumentLegacyHTML(app.game));
 throw new Error('Current split game source is missing MAIN_RUNTIME_TEST_HOOK');
}
const candidates=apps.map(candidate),hashes=apps.map((app,index)=>app.config?.game.sha256??rawHashes[index]);
const server=createServer(runtimeSource.serve({'/before':candidates[0],'/after':candidates[1]}));
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
const report={kind:'Actual Chromium + SwiftShader WebGL; production simulation timer and RAF; not phone GPU/FPS',browser:null,inputLatencyDefinition:'DOM key timestamp to first completed rendered pose moving at least1world unit in pressed direction; monotonic performance clock; proxy, not input-to-photon',schedulerIsolation:'Foreground pages with background/occlusion throttling disabled; each prior context closed before next case',viewport:{width:720,height:1282,deviceScaleFactor:1},seed:12345,tps:20,warmupMs:2000,warmupFrames:30,warmupConsecutiveFrames:10,warmupMaxIntervalMs:250,maxWarmupWaitMs:180000,minInputWindowMs:6000,minRenderSamples:60,maxAdditionalSampleWaitMs:180000,results:[]};
try{
 browser=await chromium.launch({headless:process.env.BENCH_HEADLESS==='1',...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{}),args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding','--disable-background-timer-throttling']});report.browser=browser.version();
 // Alternate order on repeat runs to inspect thermal/load/order bias.
 for(const index of process.env.BENCH_REVERSE==='1'?[1,0]:[0,1]){
  const context=await browser.newContext({viewport:{width:720,height:1282},deviceScaleFactor:1}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await moduleFixture.install(context,candidates[index].html);await fontFixture.install(context);
  await page.addInitScript(()=>{globalThis.__bench={render:[],frames:[],longtasks:[],eventQueue:[],inputVisible:[],inputProbes:[],enabled:false,lastRAF:null};new PerformanceObserver(list=>{if(__bench.enabled)for(const e of list.getEntries())__bench.longtasks.push(e.duration)}).observe({type:'longtask',buffered:false});window.addEventListener('keydown',e=>{if(!__bench.enabled||!['KeyA','KeyD'].includes(e.code))return;__bench.eventQueue.push(performance.now()-e.timeStamp);const at=e.timeStamp,x=__bench.lastRenderedX,direction=e.code==='KeyD'?1:-1,probe={key:e.code,eventTimeMs:at,fromX:x,renderObservationMs:null,latencyMs:null};__bench.inputProbes.push(probe);function watch(){if(!__bench.enabled)return;if(__bench.lastRenderedAt>=at&&direction*(__bench.lastRenderedX-x)>=1){probe.renderObservationMs=__bench.lastRenderedAt;probe.latencyMs=__bench.lastRenderedAt-at;probe.toX=__bench.lastRenderedX;__bench.inputVisible.push(probe.latencyMs)}else requestAnimationFrame(watch)}requestAnimationFrame(watch)},true);});
  await page.bringToFront();
  await page.goto(`http://127.0.0.1:${server.address().port}/${index?'after':'before'}`,{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>globalThis.__budmoriTest&&globalThis.__army?.performance.frames>2,null,{timeout:60000});await page.bringToFront();
  await page.evaluate(async source=>__budmoriTest.request('__fixture',{source}),dense+'bloomApplyTickRate(20);clearPointNav();autoHunt.enabled=false;autoHunt.idleMs=0;while(pendingAbility()>0)weaponApplyCard(abilityState(),\'pierce\');initializeMoa();if(pendingAbility()!==0||!weaponValidateState(abilityState()))throw Error(\'Invalid earned-choice benchmark fixture\');for(const c of state.camps){c.enabled=false;c.spawned=true;c.regrowth=[]}');
  const read=expression=>page.evaluate(expression=>__budmoriTest.request('__read',{expression}),expression);
  // Let the published fixture and its viewport command settle while simulation
  // remains stopped; do not mistake a queued UI command for a render mutation.
  await page.evaluate(()=>{playing=true;paused=false;modalKind='';document.querySelector('#modal')?.classList.remove('show');advanceSimulationClock(0);return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))});
  const authorityBefore=await read('Array.from(BloomSimulation.adapter.save())');
  await page.evaluate(()=>{for(let i=0;i<12;i++)render((i+1)/12,1/60)});
  assert.deepEqual(await read('Array.from(BloomSimulation.adapter.save())'),authorityBefore,'Positive-dt render-only frames preserve canonical authority bytes');
  const initial=await read('({seed:bloomSeed,tps:CONFIG.sim.tickRate,tick:bloomTick,units:state.units.length,friendly:state.units.filter(u=>u.team==="friendly"&&u.hp>0).length})');assert.equal(initial.seed,12345);assert.equal(initial.tps,20);assert.equal(initial.friendly,155);
  // Instrument the actual simulation adapter; no fake tick loop is substituted.
  await read(`(()=>{globalThis.__benchSim={tick:[],snapshot:[]};const step=bloomAdapter.step,save=bloomAdapter.save;bloomAdapter.step=function(...args){const t=performance.now();try{return step.apply(this,args)}finally{if(__benchSim.enabled)__benchSim.tick.push({tick:bloomTick-1,ms:performance.now()-t})}};bloomAdapter.save=function(...args){const t=performance.now();try{return save.apply(this,args)}finally{if(__benchSim.enabled)__benchSim.snapshot.push({tick:bloomTick,ms:performance.now()-t})}};return true})()`);
  await page.evaluate(()=>{const original=render;render=function(...args){const t=performance.now();try{return original.apply(this,args)}finally{__bench.lastRenderedX=bloomVisualPose(state.mother,'unit',presentation.frameNow).x;__bench.lastRenderedAt=performance.now();if(__bench.enabled)__bench.render.push(performance.now()-t)}};function raf(t){if(__bench.warming){if(__bench.warmupLastRAF!==null)__bench.warmupIntervals.push(t-__bench.warmupLastRAF);else __bench.firstWarmupFrameAt=t;__bench.warmupLastRAF=t}if(__bench.enabled){if(__bench.lastRAF!==null)__bench.frames.push(t-__bench.lastRAF);__bench.lastRAF=t}requestAnimationFrame(raf)}requestAnimationFrame(raf);playing=true;paused=false;modalKind='';document.querySelector('#modal')?.classList.remove('show');advanceSimulationClock(0);});
  const warmupStarted=performance.now();
  await page.evaluate(()=>{__bench.warming=true;__bench.warmupIntervals=[];__bench.warmupLastRAF=null;__bench.warmupStarted=performance.now();__bench.warmupStartFrames=__army.performance.frames});
  await page.evaluate(()=>__budmoriTest.request('__clock',{manual:false}));
  try{await page.waitForFunction(config=>__army.performance.frames-__bench.warmupStartFrames>=config.warmupFrames&&performance.now()-__bench.warmupStarted>=config.warmupMs&&__bench.warmupIntervals.length>=config.warmupConsecutiveFrames&&__bench.warmupIntervals.slice(-config.warmupConsecutiveFrames).every(ms=>ms<=config.warmupMaxIntervalMs),report,{timeout:report.maxWarmupWaitMs})}
  catch(error){console.log('BENCHMARK_NOT_COMPARABLE '+JSON.stringify({label:index?'main-thread':'v65-worker',stage:'steady foreground warmup',wallMs:performance.now()-warmupStarted,state:await page.evaluate(()=>({frames:__army.performance.frames-__bench.warmupStartFrames,intervals:__bench.warmupIntervals,visible:document.visibilityState,fatal:BloomDiagnostics.fatal}))}));throw error}
  const warmup=await page.evaluate(()=>{__bench.warming=false;return{durationMs:performance.now()-__bench.warmupStarted,firstFrameDelayMs:__bench.firstWarmupFrameAt-__bench.warmupStarted,frames:__army.performance.frames-__bench.warmupStartFrames,intervals:__bench.warmupIntervals}});
  console.log('BENCHMARK_WARMUP '+JSON.stringify({label:index?'main-thread':'v65-worker',durationMs:warmup.durationMs,firstFrameDelayMs:warmup.firstFrameDelayMs,frames:warmup.frames,rafIntervalMs:summaries(warmup.intervals)}));
  await read('__benchSim.enabled=true');await page.evaluate(()=>{__bench.enabled=true});
  const start=await read('({tick:bloomTick,time:state.time})'),startFrames=await page.evaluate(()=>__army.performance.frames),wallStart=performance.now();
  // Real browser keyboard input while frames/ticks run, not synthetic dispatchEvent.
  for(let i=0;i<6;i++){await page.keyboard.down(i%2?'KeyA':'KeyD');await page.waitForTimeout(300);await page.keyboard.up(i%2?'KeyA':'KeyD');await page.waitForTimeout(700)}
  const progress=async()=>{const sample=await page.evaluate(()=>({render:__bench.render,raf:__bench.frames,input:__bench.inputVisible,longtasks:__bench.longtasks,actualFrames:__army.performance.frames,paused:__army.paused,playing:__army.playing,modalKind,fatal:BloomDiagnostics.fatal,visible:document.visibilityState,errors:BloomDiagnostics.snapshot().errors.map(e=>({kind:e.kind,message:e.message})).slice(-3)}));return{renderCPUms:summaries(sample.render),rafIntervalMs:summaries(sample.raf),inputToRenderPoseMs:summaries(sample.input),longTaskMs:summaries(sample.longtasks),actualFramesSinceStart:sample.actualFrames-startFrames,wallMs:performance.now()-wallStart,paused:sample.paused,playing:sample.playing,modalKind:sample.modalKind,fatal:sample.fatal,visible:sample.visible,errors:sample.errors}};
  const partial=await progress();console.log('BENCHMARK_PROGRESS '+JSON.stringify({label:index?'main-thread':'v65-worker',...partial}));assert(partial.renderCPUms.samples>0||partial.actualFramesSinceStart===0,'Render observer missed production frames');
  // Software GL can render only a handful of frames during the input window.
  // Collect a meaningful distribution rather than weakening a frame-count check.
  try{await page.waitForFunction(n=>__bench.render.length>=n,report.minRenderSamples,{timeout:report.maxAdditionalSampleWaitMs})}catch(error){console.log('BENCHMARK_INCOMPLETE '+JSON.stringify({label:index?'main-thread':'v65-worker',wallMs:performance.now()-wallStart,...(await progress())}));throw error}
  const wallMs=performance.now()-wallStart;
  await page.evaluate(()=>{__bench.enabled=false});await read('__benchSim.enabled=false');await page.evaluate(()=>__budmoriTest.request('__clock',{manual:true}));
  const measured=await page.evaluate(()=>__bench),sim=await read('__benchSim'),end=await read('({tick:bloomTick,time:state.time,units:state.units.length,friendly:state.units.filter(u=>u.team==="friendly"&&u.hp>0).length})');
  assert.equal(await page.evaluate(()=>document.querySelector('#view').dataset.rendererBackend),'WebGL');assert.equal(await page.evaluate(()=>BloomDiagnostics.fatal),false);assert.deepEqual(errors,[]);assert(measured.render.length>=report.minRenderSamples);assert(sim.tick.length>5);assert(measured.inputVisible.length>0,'Actual input must move a completed rendered pose in the requested direction');
  const result={label:index?'main-thread':'v65-worker',sourceSHA256:hashes[index],initial,warmup:{durationMs:warmup.durationMs,firstFrameDelayMs:warmup.firstFrameDelayMs,frames:warmup.frames,rafIntervalMs:summaries(warmup.intervals)},start,end,wallMs,observedTPS:(end.tick-start.tick)/(wallMs/1000),renderCPUms:summaries(measured.render),rafIntervalMs:summaries(measured.frames),longTaskMs:summaries(measured.longtasks),longTaskTotalMs:measured.longtasks.reduce((a,b)=>a+b,0),inputEventQueueMs:summaries(measured.eventQueue),inputProbes:measured.inputProbes,inputToRenderPoseMs:summaries(measured.inputVisible),simulationCoverage:{expectedTicks:end.tick-start.tick,receivedStepSamples:sim.tick.length,measuredStepSamples:sim.tick.filter(v=>v.tick>=start.tick&&v.tick<end.tick).length,receivedSnapshotSamples:sim.snapshot.length,measuredSnapshotSamples:sim.snapshot.filter(v=>v.tick>start.tick&&v.tick<=end.tick).length},simulationStepMs:summaries(sim.tick.filter(v=>v.tick>=start.tick&&v.tick<end.tick).map(v=>v.ms)),snapshotSaveMs:summaries(sim.snapshot.filter(v=>v.tick>start.tick&&v.tick<=end.tick).map(v=>v.ms))};report.results.push(result);console.log('BENCHMARK_RESULT '+JSON.stringify(result));
  // One bounded local visual capture per candidate; no paid artifact upload.
  await page.screenshot({path:`tests/benchmark-${index?'after':'before'}.png`});await context.close();assert.equal(browser.contexts().length,0,'Prior benchmark context and its Worker must be closed before next case');
 }
 assert.deepEqual(report.results[0].initial,report.results[1].initial,'Same seeded entity/TPS fixture required');
 console.log(JSON.stringify(report,null,2));await writeFile('tests/performance-browser-report.json',JSON.stringify(report,null,2)+'\n');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
