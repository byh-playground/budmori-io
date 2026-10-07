'use strict';
// Alternating-order actual-engine timing, one through five human factions.
// This is native V8 CPU evidence, not browser/network/GPU or a framerate claim.
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {engine}=require('./native-engine.cjs'),{summary}=require('./netcode-benchmark.cjs'),{sameSemantic,normalize,graph}=require('./native-semantic.cjs');
const root=path.resolve(__dirname,'..'),files=[process.argv[2]||root+'/index.html',process.argv[3]||root+'/index.html'];
const restored=process.env.BLOOM_MOTION_PERF_RESTORE==='1';
const report={restored,kind:'Actual-engine paired 1–5 human gameplay-size motion ownership timings',armyPerPlayer:155,tps:10,ticks:70,warmup:20,results:[]};
for(let players=1;players<=5;players++){
 const es=files.map(file=>engine(file)),ids='abcde'.slice(0,players).split('');
 for(const e of es){e.c.qaIds=ids;e.run(`CONFIG.session.mode='online';bloomApplyTickRate(10);BloomSimulation.initialize(12345);WorldMembership.apply({epoch:0,tick:0,players:qaIds});BloomSimulation.sessionConfig={mode:'online',persistence:'none'};
 for(const p of WorldPlayers.all()){const d=WorldPlayers.data(p);let level=1;while(rarityCapacityAtLevel(level)<155)level++;d.campaign.abilities.level=level;d.campaign.abilities.xp=abilityThreshold(level);moaSyncLevelHP(p.leader);p.leader.hp=p.leader.maxHp;for(const [i,type]of ['swordsman','shellbug','dandelion','archer'].entries())rarityAcquire(p.accountOwner,type,2,38+(i<3?1:0));for(const r of (typeof rarityGetAccount==='function'?rarityGetAccount:rarityAccount)(p.accountOwner).active)rarityLock(r.uid,true);rarityRecall(p.accountOwner)}for(const c of state.camps){c.enabled=false;c.spawned=true;c.regrowth=[]}rebuildGrid();spatialBoundary();globalThis.qaFrames=WorldPlayers.all().map(p=>({playerId:p.playerId,input:bloomEncodeInput({x:.25,y:.1,manual:true}),commands:[]}));`)}
 if(restored)for(const e of es)e.run('bloomAdapter.load(bloomAdapter.save())');
 const timings=[[],[]];let boundaries=0;
 for(let i=0;i<70;i++){
  for(const n of i%2?[1,0]:[0,1]){const at=performance.now();es[n].run('bloomAdapter.step({tick:bloomTick,tickRate:CONFIG.sim.tickRate,inputs:qaFrames})');if(i>=20)timings[n].push(performance.now()-at)}
  assert.deepEqual(graph(normalize(es[0].run('bloomCurrentEffects')).value),graph(normalize(es[1].run('bloomCurrentEffects')).value),'effects '+players+'/'+i);
  if(i%20===0||i===69){sameSemantic(es,'semantic '+players+'/'+i);boundaries++}
 }
 const result={players,sources:es.map(e=>e.sha256),baselineMs:summary(timings[0]),candidateMs:summary(timings[1]),rawSamplesMs:{baseline:timings[0],candidate:timings[1]},boundaries,effectsCompared:70,valid:es.map(e=>e.run('bloomValidate(bloomCapture())'))};assert(result.valid.every(Boolean));report.results.push(result);console.log(JSON.stringify(result));
}
if(process.env.BLOOM_MOTION_PERF_REPORT)fs.writeFileSync(process.env.BLOOM_MOTION_PERF_REPORT,JSON.stringify(report,null,2)+'\n');
