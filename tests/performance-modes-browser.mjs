// Actual Chromium/WebGL mode costs at identical deterministic tick inputs. Manual
// SDK boundaries isolate costs; normal timer/input/RAF behavior has browser.e2e.mjs.
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import runtimeHook from './main-runtime-hook.cjs';
import bench from './netcode-benchmark.cjs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),runtimeSource=require('./runtime-source.cjs'),moduleFixture=require('./module-reference-fixture.cjs'),fontFixture=require('./font-asset-fixture.cjs');
const file=resolve(process.argv[2]||fileURLToPath(new URL('../index.html',import.meta.url))),app=runtimeSource.read(file,await readFile(file,'utf8'));
assert(app.config&&app.game&&app.bootstrap,'Performance mode benchmark requires authentic split game/bootstrap sources');
assert(app.game.includes('/* MAIN_RUNTIME_TEST_HOOK */'),'Current src/game.js must expose its test-only fixture boundary');
const candidate=runtimeSource.response(app,app.game.replace('/* MAIN_RUNTIME_TEST_HOOK */',runtimeHook));
const server=createServer(runtimeSource.serve({'/':candidate}));
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
const report={kind:'Chromium + SwiftShader, actual split game/SDK sources and WebGL draws, manual deterministic tick inputs; not production FPS or phone GPU',sourceSHA256:app.config.game.sha256,bootstrapSHA256:app.config.bootstrap.sha256,sdkDistCommit:app.config.distCommit,seed:12345,tps:20,friendly:155,scope:'Same authority, commands and 100 inputs in both modes; 20 warmup + 80 measured ticks. One explicit actual render after each measured tick. Input preview is disabled to isolate netcode costs. Separate step/snapshot/advance/render CPU durations. WebGL completion is not synchronized.',excluded:'Constructor/fixture/warmup/final verification captures, input-preview work and runtime disk autosave are outside measurement. This is not the production timer, real network delay, or input latency benchmark.',copyMetric:'Disk cache copies only; excludes codec/SDK copies and JS allocations.',results:[]};
try{
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{}),args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding','--disable-background-timer-throttling']});report.browser=browser.version();
 for(const mode of ['rollback','lockstep']){
  const context=await browser.newContext({viewport:{width:720,height:1282},deviceScaleFactor:1}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await moduleFixture.install(context,candidate.html);await fontFixture.install(context);
  await page.bringToFront();
  await page.goto(`http://127.0.0.1:${server.address().port}`,{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>globalThis.BloomSimulation?.runtime?.ready&&globalThis.__army?.performance.frames>2,null,{timeout:60000});await page.bringToFront();
  await page.evaluate(()=>{const prototype=BloomOwnedSDK.LocalInputPreview.prototype,setEnabled=prototype.setEnabled;prototype.setEnabled=function(){return setEnabled.call(this,false)}});
  await page.evaluate(source=>__budmoriTest.request('__fixture',{source}),bench.fixture(155,20,mode));
  const read=expression=>page.evaluate(expression=>__budmoriTest.request('__read',{expression}),expression);
  // Settle the one viewport command identically before the measured input trace.
  await page.evaluate(()=>{playing=true;paused=false;modalKind='';document.querySelector('#modal')?.classList.remove('show');advanceSimulationClock(0)});
  await page.evaluate(()=>__budmoriTest.request('testTicks',{count:1}));
  await read(bench.instrument);
  const initial=await read('({seed:bloomSeed,tps:CONFIG.sim.tickRate,units:state.units.length,friendly:state.units.filter(u=>u.team==="friendly"&&u.hp>0).length,hash:BloomOwnedSDK.hashBytes(bloomAdapter.save())})');assert.equal(initial.friendly,155);
  for(let i=0;i<20;i++)await read(bench.advance(i));
  const before=await read('bloomSnapshotStore.metrics()'),startFrames=await page.evaluate(()=>__army.performance.frames);await read('__modeBench.enabled=true');
  for(let i=20;i<100;i++){
   await read(bench.advance(i));
   await page.evaluate(()=>{bloomInputPending=0;bloomPresent(bloomSession.confirmedTick);capturePresentation();const start=performance.now();render(1,1/20);__modeBench.render.push(performance.now()-start)});
  }
  await read('__modeBench.enabled=false');const after=await read('bloomSnapshotStore.metrics()'),raw=await read('__modeBench');
  assert.equal(raw.snapshot.length,mode==='rollback'?80:3,'Lockstep snapshots only at checksum boundaries');
  const final=await read('({tick:bloomTick,time:state.time,hash:BloomOwnedSDK.hashBytes(bloomAdapter.save())})');
  assert.equal(await page.evaluate(()=>BloomDiagnostics.fatal),false);assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>document.querySelector('#view').dataset.rendererBackend),'WebGL');
  const previewState=await read('({phase:BloomSimulation.runtime.preview.phase,enabled:BloomSimulation.runtime.preview.enabled,error:BloomSimulation.runtime.preview.error})');assert.equal(previewState.enabled,false,'Input preview must be disabled to isolate netcode costs');assert.notEqual(previewState.phase,'failed','Netcode benchmark runtime must remain healthy');
  const row={mode,initial,final,previewState,actualRAFFrames:await page.evaluate(start=>__army.performance.frames-start,startFrames),measuredStartTick:21,measuredEndTick:101,checksumInterval:30,...bench.summarize(raw),diskCacheCopies:after.cacheCopies-before.cacheCopies,diskCacheCopyBytes:after.cacheCopyBytes-before.cacheCopyBytes};report.results.push(row);console.log(JSON.stringify(row));await page.evaluate(()=>BloomSimulation.runtime.close());await context.close();assert.equal(browser.contexts().length,0,'Prior benchmark context must close before the next mode');
 }
 assert.deepEqual(report.results[0].initial,report.results[1].initial,'Identical starting world');assert.deepEqual(report.results[0].final,report.results[1].final,'Identical future world');report.status='PASS';
 await writeFile(new URL('./lockstep-browser-performance.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
}finally{await browser?.close();await new Promise(r=>server.close(r))}
