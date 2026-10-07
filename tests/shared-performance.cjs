'use strict';
// CPU-only actual shared simulation. No browser, network transport, GPU or FPS claim.
const {engine}=require('./native-engine.cjs'),{summary}=require('./netcode-benchmark.cjs');
const path=require('node:path');
const report={kind:'Native V8 actual shared adapter, five human factions, no renderer/transport',results:[]};
for(const count of [10,155,1000]){
 const e=engine(path.resolve(process.argv[2]||path.join(__dirname,'../index.html')));
 e.run(`CONFIG.session.mode='online';bloomApplyTickRate(10);BloomSimulation.initialize(12345);WorldMembership.apply({epoch:0,tick:0,players:['a','b','c','d','e']});BloomSimulation.sessionConfig={mode:'online',persistence:'none'};
 for(const p of WorldPlayers.all()){const d=WorldPlayers.data(p);let level=1;while(rarityCapacityAtLevel(level)<${count})level++;d.campaign.abilities.level=level;d.campaign.abilities.xp=abilityThreshold(level);moaSyncLevelHP(p.leader);p.leader.hp=p.leader.maxHp;for(const [i,type]of ['swordsman','shellbug','dandelion','archer'].entries())rarityAcquire(p.accountOwner,type,2,Math.floor(${count}/4)+(i<${count}%4?1:0));for(const r of rarityAccount(p.accountOwner).active)rarityLock(r.uid,true);rarityRecall(p.accountOwner)}
 for(const c of state.camps){c.enabled=false;c.spawned=true;c.regrowth=[]}rebuildGrid();spatialBoundary();
 globalThis.frames=WorldPlayers.all().map(p=>({playerId:p.playerId,input:bloomEncodeInput({x:.25,y:.1,manual:true}),commands:[]}));`);
 const advance=[],capture=[];let bytes=0;
 for(let i=0;i<60;i++){const before=performance.now();e.run('bloomAdapter.step({tick:bloomTick,tickRate:CONFIG.sim.tickRate,inputs:frames})');const after=performance.now();if(i>=10)advance.push(after-before);if(i%10===0){const start=performance.now();bytes=e.run('bloomAdapter.save().length');capture.push(performance.now()-start)}}
 const result={players:5,armyPerPlayer:count,totalArmy:count*5,tps:10,sourceSHA256:e.sha256,simulationStepMs:summary(advance),snapshotMs:summary(capture),snapshotBytes:bytes,valid:e.run('bloomAdapter.validateSnapshot(bloomAdapter.save(),{tick:bloomTick})')};if(!result.valid)throw Error('Invalid measured state');report.results.push(result);console.log(JSON.stringify(result));
}
if(process.env.BLOOM_SHARED_PERF_REPORT)require('node:fs').writeFileSync(process.env.BLOOM_SHARED_PERF_REPORT,JSON.stringify(report,null,2)+'\n');
