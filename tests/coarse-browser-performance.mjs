// Serial real Chromium comparison of complete game ticks, including collision,
// terrain, AI and all other adapter stages. Renderer CPU is measured separately.
// Manual deterministic input boundaries; this is not device FPS or normal RAF.
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import runtimeHook from './main-runtime-hook.cjs';
import coarse from './coarse-live-candidate.cjs';
import batched from './batched-grid-candidate.cjs';
import fixture from './coarse-fixture.cjs';
import stats from './netcode-benchmark.cjs';
const baseline=await readFile(new URL('../index.html',import.meta.url),'utf8');
const configs=[{name:'baseline'}, {name:'batched-grid-32',mode:'query',cell:32}, {name:'global-sap',mode:'global',cell:128}, ...[32,64,128,256].map(cell=>({name:'coarse-sap-'+cell,mode:'coarse',cell}))];
const variants=new Map(configs.map(c=>[c.name,c.name==='baseline'?baseline:c.mode==='query'?batched.batchedGridCandidate(baseline,c.cell):coarse.candidate(baseline,{...c,exact:false,instrument:false})]));
const server=createServer((req,res)=>{const html=variants.get(req.url.slice(1));if(!html){res.writeHead(404);return res.end()}res.setHeader('Content-Type','text/html;charset=utf-8');res.end(html.replace('/* MAIN_RUNTIME_TEST_HOOK */',runtimeHook))});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
const report={kind:'Real Chromium/SwiftShader full adapter tick + renderer CPU, five human factions, serial isolated pages',limitations:['Manual fixed-input tick boundaries, not a normal gameplay RAF/FPS measure.','Render measures CPU command submission, not GPU completion.','New solver trajectories intentionally differ. Live counts are retained to avoid mistaking deaths for speedup.','All seven variants use the actual game and SDK; only candidate HTML generated in this test server changes solver. Production index.html remains unchanged.'],results:[]};
const counts=(process.env.COARSE_COUNTS||'10,155,1000').split(',').map(Number),repeats=+(process.env.COARSE_REPEATS||2),ticks=+(process.env.COARSE_TICKS||65),warm=+(process.env.COARSE_WARM||15);
try{
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{}),args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding','--disable-background-timer-throttling']});report.browser=browser.version();
 for(let repeat=0;repeat<repeats;repeat++)for(const count of counts)for(const config of repeat%2?[...configs].reverse():configs){
  const context=await browser.newContext({viewport:{width:960,height:720},deviceScaleFactor:1}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/${config.name}`,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>globalThis.BloomSimulation?.runtime?.ready&&globalThis.__army?.performance.frames>2,null,{timeout:120000});
  let fixtureSource='';fixture.setup({run(s){fixtureSource=s},json(){return null}},count,false);
  await page.evaluate(source=>__budmoriTest.request('__fixture',{source}),fixtureSource);
  const read=expression=>page.evaluate(expression=>__budmoriTest.request('__read',{expression}),expression);
  const initial=await read('({tick:bloomTick,units:state.units.length,humans:WorldPlayers.all().length,version:BloomSimulation.version})');assert.equal(initial.humans,5);assert.equal(initial.units,count*5+1);
  const tickMs=[],renderMs=[],combinedMs=[],population=[];
  for(let tick=0;tick<ticks;tick++){
   const sample=await read(`(()=>{const begin=performance.now();bloomAdapter.step({tick:bloomTick,tickRate:CONFIG.sim.tickRate,inputs:frames});const stepped=performance.now();bloomInputPending=0;bloomPresent(bloomTick);capturePresentation();render(1,1/10);const done=performance.now();return{tick:bloomTick,stepMs:stepped-begin,renderMs:done-stepped,totalMs:done-begin,units:state.units.length,heap:performance.memory?.usedJSHeapSize??null}})()`);
   if(tick>=warm){tickMs.push(sample.stepMs);renderMs.push(sample.renderMs);combinedMs.push(sample.totalMs);population.push({tick:sample.tick,units:sample.units,heap:sample.heap})}
  }
  const final=await read('({tick:bloomTick,units:state.units.length,valid:bloomAdapter.validateSnapshot(bloomAdapter.save(),{tick:bloomTick}),hash:BloomOwnedSDK.hashBytes(bloomAdapter.save())})');assert(final.valid);assert.equal(final.units,count*5+1);assert.deepEqual(errors,[]);assert.equal(await read('BloomDiagnostics.fatal'),false);
  const result={repeat:repeat+1,...config,count,sourceSHA256:createHash('sha256').update(variants.get(config.name)).digest('hex'),initial,final,stepMs:stats.summary(tickMs),renderMs:stats.summary(renderMs),combinedMs:stats.summary(combinedMs),population,raw:{tickMs,renderMs,combinedMs}};
  report.results.push(result);console.log(JSON.stringify({...result,raw:undefined,population:undefined}));await context.close();assert.equal(browser.contexts().length,0);
 }
 // All unique-pair algorithms differ only in broadphase strategy, not physics.
 for(const count of counts)for(let repeat=1;repeat<=repeats;repeat++){const pair=report.results.filter(r=>r.count===count&&r.repeat===repeat&&['global','coarse'].includes(r.mode));assert(pair.every(r=>r.final.hash===pair[0].final.hash),'Broadphase changes final authority')}
 report.status='PASS';await mkdir(new URL('./collision-artifacts/',import.meta.url),{recursive:true});await writeFile(new URL('./collision-artifacts/browser-performance-report.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
