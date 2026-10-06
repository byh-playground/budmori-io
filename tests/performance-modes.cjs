'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const {engine}=require('./native-engine.cjs'),bench=require('./netcode-benchmark.cjs');
const file=process.argv[2]||`${__dirname}/../index.html`,html=fs.readFileSync(file,'utf8');
const report={kind:'Native V8 actual engine and SDK, mock DOM, no renderer; not browser/device FPS',scope:'Paired alternating mode order each tick, identical seed/entities/inputs/TPS. Advance includes serialization only when mode requests it; separate step/snapshot samples. No forced per-tick save/hash reads.',excluded:'Constructor/fixture/warmup and final verification saves are outside measurement. Direct SDK advances do not include runtime disk autosave, network delay or render scheduling.',copyMetric:'Disk cache copies only. Codec/SDK copies and all JS allocations are not counted.',results:[]};
for(const [scenario,count,tps]of [['sparse',10,10],['dense',155,20],['maximum',1000,30]]){
 const engines=['rollback','lockstep'].map(mode=>{const e=engine(file,html);e.fixture(bench.fixture(count,tps,mode));e.run(bench.instrument);return e});
 try{
  const initial=engines.map(e=>e.json('({seed:bloomSeed,tps:CONFIG.sim.tickRate,units:state.units.length,friendly:state.units.filter(u=>u.team==="friendly"&&u.hp>0).length,hash:BloomOwnedSDK.hashBytes(bloomAdapter.save())})'));
  assert.deepEqual(initial[0],initial[1]);assert.equal(initial[0].friendly,count);
  for(let i=0;i<20;i++)for(const e of i%2?engines:[...engines].reverse())e.run(bench.advance(i));
  const before=engines.map(e=>e.json('bloomSnapshotStore.metrics()'));
  engines.forEach(e=>e.run('__modeBench.enabled=true'));
  for(let i=20;i<100;i++)for(const e of i%2?engines:[...engines].reverse())e.run(bench.advance(i));
  engines.forEach(e=>e.run('__modeBench.enabled=false'));
  const after=engines.map(e=>e.json('bloomSnapshotStore.metrics()'));
  const bytes=engines.map(e=>Buffer.from(e.run('bloomAdapter.save()')));assert(bytes[0].equals(bytes[1]),scenario+' identical complete final authority');
  for(let index=0;index<engines.length;index++){
   const e=engines[index],raw=e.json('__modeBench');assert.equal(raw.snapshot.length,index===0?80:3,'Only rollback saves each tick; lockstep saves at 30/60/90');
   const row={scenario,mode:e.run('bloomSession.profile.mode'),sourceSHA256:e.sha256,initial:initial[index],measuredTicks:80,measuredStartTick:20,measuredEndTick:100,checksumInterval:e.run('bloomSession.profile.checksumInterval'),...bench.summarize(raw),diskCacheCopies:after[index].cacheCopies-before[index].cacheCopies,diskCacheCopyBytes:after[index].cacheCopyBytes-before[index].cacheCopyBytes,final:e.json('({tick:bloomTick,time:state.time,hash:BloomOwnedSDK.hashBytes(bloomAdapter.save())})')};
   report.results.push(row);console.log(JSON.stringify(row));
  }
 }finally{engines.forEach(e=>e.run('bloomSession.close()'))}
}
fs.writeFileSync(`${__dirname}/lockstep-performance.json`,JSON.stringify(report,null,2)+'\n');
