// Actual Chromium/WebGL mode costs at identical deterministic tick inputs. Manual
// SDK boundaries isolate costs; normal timer/input/RAF behavior has browser.e2e.mjs.
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import runtimeHook from './main-runtime-hook.cjs';
import bench from './netcode-benchmark.cjs';
const html=await readFile(process.argv[2]||new URL('../index.html',import.meta.url),'utf8');
const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.end(html.replace('/* MAIN_RUNTIME_TEST_HOOK */',runtimeHook))});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
const report={kind:'Chromium + SwiftShader, actual engine/SDK and WebGL draw calls, manual deterministic tick inputs; not production FPS or phone GPU',sourceSHA256:createHash('sha256').update(html).digest('hex'),seed:12345,tps:20,friendly:155,scope:'Same authority, commands and 100 inputs in both modes; 20 warmup + 80 measured ticks. One explicit actual render after each measured tick. Separate step/snapshot/advance/render CPU durations. WebGL completion is not synchronized.',excluded:'Constructor/fixture/warmup/final verification captures and runtime disk autosave are outside measurement. This is not the production timer or input latency benchmark.',copyMetric:'Disk cache copies only; excludes codec/SDK copies and JS allocations.',results:[]};
try{
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{}),args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding','--disable-background-timer-throttling']});report.browser=browser.version();
 for(const mode of ['rollback','lockstep']){
  const context=await browser.newContext({viewport:{width:720,height:1282},deviceScaleFactor:1}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.bringToFront();
  await page.goto(`http://127.0.0.1:${server.address().port}`,{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>globalThis.BloomSimulation?.runtime?.ready&&globalThis.__army?.performance.frames>2,null,{timeout:60000});await page.bringToFront();
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
  const row={mode,initial,final,actualRAFFrames:await page.evaluate(start=>__army.performance.frames-start,startFrames),measuredStartTick:21,measuredEndTick:101,checksumInterval:30,...bench.summarize(raw),diskCacheCopies:after.cacheCopies-before.cacheCopies,diskCacheCopyBytes:after.cacheCopyBytes-before.cacheCopyBytes};report.results.push(row);console.log(JSON.stringify(row));await page.evaluate(()=>BloomSimulation.runtime.close());await context.close();assert.equal(browser.contexts().length,0,'Prior benchmark context must close before the next mode');
 }
 assert.deepEqual(report.results[0].initial,report.results[1].initial,'Identical starting world');assert.deepEqual(report.results[0].final,report.results[1].final,'Identical future world');report.status='PASS';
 await writeFile(new URL('./lockstep-browser-performance.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
}finally{await browser?.close();await new Promise(r=>server.close(r))}
