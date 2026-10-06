'use strict';
// Optional native allocation sampling, separate from timing measurements.
// Samples include collected objects; estimates are not exact malloc counters.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),inspector=require('node:inspector');
const {engine}=require('./native-engine.cjs');
if(!global.gc)throw Error('Run with node --expose-gc');
const files=process.argv.slice(2).map(p=>path.resolve(p));assert.equal(files.length,2,'Supply baseline and target HTML');
const profiler=new inspector.Session();profiler.connect();
const post=(name,args={})=>new Promise((resolve,reject)=>profiler.post(name,args,(error,result)=>error?reject(error):resolve(result)));
async function measure(file){
 const e=engine(file);e.fixture(`BloomSimulation.initialize(12345);let level=1;while(rarityCapacityAtLevel(level)<155)level++;abilityState().level=level;abilityState().xp=abilityThreshold(level);moaSyncLevelHP(state.mother);state.mother.hp=state.mother.maxHp;for(const [i,type]of ['swordsman','shellbug','dandelion','archer'].entries())rarityAcquire(-1,type,2,38+(i<3?1:0));for(const r of rarityAccount(-1).active)rarityLock(r.uid,true);rarityRecall(-1);bloomApplyTickRate(20);for(const c of state.camps){c.enabled=false;c.spawned=true;c.regrowth=[]}`);
 e.tick(20);global.gc();
 const retainedBefore=process.memoryUsage().heapUsed;
 await post('HeapProfiler.startSampling',{samplingInterval:16384,includeObjectsCollectedByMajorGC:true,includeObjectsCollectedByMinorGC:true});
 e.tick(100);const {profile}=await post('HeapProfiler.stopSampling');
 global.gc();const retainedAfter=process.memoryUsage().heapUsed;
 let estimatedBytes=0;const stack=[profile.head];while(stack.length){const node=stack.pop();estimatedBytes+=node.selfSize;stack.push(...node.children)}
 const result={sourceSHA256:e.sha256,ticks:100,estimatedAllocatedBytes:estimatedBytes,estimatedAllocatedBytesPerTick:estimatedBytes/100,retainedHeapDeltaBytes:retainedAfter-retainedBefore,final:e.json('({hash:BloomOwnedSDK.hashBytes(BloomSimulation.adapter.save()),tick:bloomTick,units:state.units.length})')};e.run('bloomSession.close()');return result;
}
(async()=>{const pairs=[];for(let repeat=0;repeat<3;repeat++){const pair={repeat:repeat+1};for(const index of repeat%2?[1,0]:[0,1])pair[index?'after':'before']=await measure(files[index]);assert.deepEqual(pair.before.final,pair.after.final,'same final authority');pairs.push(pair)}console.log(JSON.stringify({method:'V8 HeapProfiler sampling at16KiB, including collected objects;100 actual SDK ticks at20TPS with155 owned units; three alternating serial pairs. Native/mock DOM, no rendering. Retained heap also includes profiler report objects.',node:process.version,pairs},null,2));})().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>profiler.disconnect());
