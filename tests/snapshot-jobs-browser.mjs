import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),runtimeSource=require('./runtime-source.cjs'),moduleFixture=require('./module-reference-fixture.cjs'),fontFixture=require('./font-asset-fixture.cjs');
const file=resolve(process.argv[2]||fileURLToPath(new URL('../index.html',import.meta.url))),source=runtimeSource.read(file,await readFile(file,'utf8'));
assert(source.config&&source.game&&source.bootstrap,'Snapshot benchmark requires authentic split runtime sources; legacy/inline fallback is not supported');
const candidate=runtimeSource.response(source);
// This benchmark isolates main-thread snapshot scheduling in real Chromium.
// It deliberately omits rendering; the separate five-tab suite exercises real
// WebGL + WebRTC. No FPS, mobile performance or public-network claim is made.
const server=createServer(runtimeSource.serve({'/':candidate}));
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
const report={sourceSHA256:source.config.game.sha256,bootstrapSHA256:source.config.bootstrap.sha256,sdk:source.config.distCommit,environment:'Real Chromium, authentic split game/bootstrap and ESM modules, headless authority, no benchmark rendering or transport; 5×1000 declared fixture',status:'RUNNING'};
try{
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{}),args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext(),page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));await moduleFixture.install(context,candidate.html);await fontFixture.install(context);await page.addInitScript(()=>{globalThis.BLOOM_HEADLESS=true});await page.goto(`http://127.0.0.1:${server.address().port}`,{waitUntil:'domcontentloaded'});
 report.jobs=await page.evaluate(async()=>{
  bloomSession?.close();CONFIG.session.mode='online';bloomApplyTickRate(10);BloomSimulation.initialize(12345);WorldMembership.apply({epoch:0,tick:0,players:['a','b','c','d','e']});
  for(const p of WorldPlayers.all()){const d=WorldPlayers.data(p);let level=1;while(rarityCapacityAtLevel(level)<1000)level++;d.campaign.abilities.level=level;d.campaign.abilities.xp=abilityThreshold(level);moaSyncLevelHP(p.leader);p.leader.hp=p.leader.maxHp;for(const type of ['swordsman','shellbug','dandelion','archer'])rarityAcquire(p.accountOwner,type,2,250);for(const r of (globalThis.rarityGetAccount||rarityAccount)(p.accountOwner).active)rarityLock(r.uid,true);rarityRecall(p.accountOwner)}rebuildGrid();spatialBoundary();
  const wait=()=>new Promise(resolve=>setTimeout(resolve,0));let heartbeat=0;const timer=setInterval(()=>heartbeat++,0),longTasks=[];const observer=new PerformanceObserver(list=>{for(const e of list.getEntries())longTasks.push({start:e.startTime,duration:e.duration})});observer.observe({type:'longtask'});
  async function drain(label,job){await wait();const start=performance.now(),pulses=[],beforeHeartbeat=heartbeat;while(!job.done){const before=performance.now();job.pulse({budgetMs:8});pulses.push(performance.now()-before);if(pulses.length>10000)throw Error('Unbounded '+label);await wait()}const end=performance.now();await wait();return{label,bytes:job.result?.length,elapsedMs:end-start,cpuMs:pulses.reduce((a,b)=>a+b,0),pulses:pulses.length,maxPulseMs:Math.max(...pulses),heartbeatYields:heartbeat-beforeHeartbeat,longTasks:longTasks.filter(row=>row.start>=start&&row.start<end),result:job.result}}
  try{
   const save=await drain('save 5×1000',bloomAdapter.saveJob()),saved=save.result;delete save.result;
   const expected={tick:0,membershipEpoch:0,simulationVersion:BloomSimulation.simulationVersion,tickRate:10,seed:12345,players:['a','b','c','d','e']};
   const prepare=await drain('validate canonical 5×1000',bloomAdapter.prepareSnapshotJob(saved,expected));bloomAdapter.loadPreparedSnapshot(prepare.result,expected);delete prepare.result;
   const same=bloomAdapter.save();if(same.length!==saved.length||same.some((v,i)=>v!==saved[i]))throw Error('Prepared install differs from canonical source');
   WorldMembership.apply({epoch:1,tick:0,players:['a','b','c','d'],left:['e'],coordinatorId:'a'});
   const prior=bloomAdapter.save(),change={epoch:2,tick:0,players:['a','b','c','d','f'],joined:['f'],left:[],coordinatorId:'a'},context={...expected,membershipEpoch:2,players:change.players};
   const membership=await drain('admit fifth to 4×1000',bloomAdapter.prepareMembershipJob(change,context)),result=membership.result;delete membership.result;
   const unchanged=bloomAdapter.save();if(unchanged.length!==prior.length||unchanged.some((v,i)=>v!==prior[i]))throw Error('Staging changed incumbent');
   bloomAdapter.loadPreparedSnapshot(result.prepared,context);const committed=bloomAdapter.save();if(committed.length!==result.bytes.length||committed.some((v,i)=>v!==result.bytes[i]))throw Error('Membership commit differs from prepared bytes');
   for(const job of [save,prepare,membership])if(job.pulses<2||job.heartbeatYields<2)throw Error('Job did not yield to browser heartbeat');
   return {snapshotBytes:saved.length,membershipBytes:result.bytes.length,save,prepare,membership,canonicalParity:true};
  }finally{clearInterval(timer);observer.disconnect()}
 });
 assert.deepEqual(errors,[]);report.status='PASS';console.log(JSON.stringify(report));
}catch(error){report.status='FAIL';report.error=error.stack;throw error}
finally{await writeFile(new URL('./snapshot-jobs-browser-report.json',import.meta.url),JSON.stringify(report,null,2)+'\n');await browser?.close();await new Promise(resolve=>server.close(resolve))}
