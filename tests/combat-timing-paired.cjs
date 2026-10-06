'use strict';
// Matched worlds interleaved in one process, alternating per-tick order to
// reduce host-load drift. Shared heap/JIT; not browser/device measurements.
const assert=require('node:assert/strict'),path=require('node:path');
const {engine}=require('./native-engine.cjs');
const files=process.argv.slice(2).map(p=>path.resolve(p));assert.equal(files.length,2);
const worlds=files.map(file=>engine(file));
for(const e of worlds)e.fixture(`BloomSimulation.initialize(12345);const count=CONFIG.rarity.capacityMax;let level=1;while(rarityCapacityAtLevel(level)<count)level++;abilityState().level=level;abilityState().xp=abilityThreshold(level);moaSyncLevelHP(state.mother);state.mother.hp=state.mother.maxHp;for(const [i,type]of ['swordsman','shellbug','dandelion','archer'].entries())rarityAcquire(-1,type,2,Math.floor(count/4)+(i<count%4?1:0));for(const r of rarityAccount(-1).active)rarityLock(r.uid,true);rarityRecall(-1);bloomApplyTickRate(30);for(const c of state.camps){c.enabled=false;c.spawned=true;c.regrowth=[]}`);
const samples=[[],[]];
for(let tick=0;tick<230;tick++){
 for(const index of tick%2?[1,0]:[0,1]){const start=performance.now();worlds[index].tick();const elapsed=performance.now()-start;if(tick>=30)samples[index].push(elapsed)}
 if(tick%20===0||tick===229)assert(Buffer.from(worlds[0].run('BloomSimulation.adapter.save()')).equals(Buffer.from(worlds[1].run('BloomSimulation.adapter.save()'))));
}
const summary=s=>{const a=[...s].sort((a,b)=>a-b),q=p=>a[Math.ceil(a.length*p)-1];return{samples:a.length,p50:q(.5),p95:q(.95),p99:q(.99)}};
const report={method:'Actual SDK1000-body30TPS worlds in separate native V8 realms,30 warmup ticks+200 measured ticks each, alternating execution order each tick. Same process shares heap/JIT pressure; no rendering/browser/device claim.',before:{sha256:worlds[0].sha256,timing:summary(samples[0])},after:{sha256:worlds[1].sha256,timing:summary(samples[1])},finalHash:worlds[0].run('BloomOwnedSDK.hashBytes(BloomSimulation.adapter.save())'),raw:samples};
for(const e of worlds)e.run('bloomSession.close()');console.log(JSON.stringify(report,null,2));
