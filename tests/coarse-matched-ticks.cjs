'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const {engine}=require('./native-engine.cjs'),{summary}=require('./netcode-benchmark.cjs'),{setup}=require('./coarse-fixture.cjs'),{candidate}=require('./coarse-live-candidate.cjs'),{batchedGridCandidate}=require('./batched-grid-candidate.cjs');
const source=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),count=+(process.env.COUNT||1000);
const configs=[{name:'baseline'}, {name:'batched-grid-32',mode:'query',cell:32}, {name:'global-sap',mode:'global',cell:64}, {name:'coarse-sap-64',mode:'coarse',cell:64}, {name:'coarse-sap-128',mode:'coarse',cell:128}, {name:'coarse-sap-256',mode:'coarse',cell:256}];
const worlds=configs.map(c=>{const html=c.name==='baseline'?source:c.mode==='query'?batchedGridCandidate(source,c.cell):candidate(source,{...c,instrument:false,exact:false});const e=engine(c.name,html);setup(e,count,false);return{...c,e,samples:[],finalHash:[],phase:[]}});
const timeline=engine('timeline',source);setup(timeline,count,false);const samples=[];
for(let tick=0;tick<80;tick++){
 timeline.run('bloomAdapter.step({tick:bloomTick,tickRate:CONFIG.sim.tickRate,inputs:frames})');
 if(tick<20||tick%3!==0)continue;
 const bytes=timeline.run('bloomAdapter.save()'),counts=timeline.json('({tick:bloomTick,units:state.units.length})');
 for(const w of tick%2?[...worlds].reverse():worlds){w.e.c.benchBytes=bytes;w.e.run('bloomAdapter.load(benchBytes)');const t=performance.now();w.e.run('bloomAdapter.step({tick:bloomTick,tickRate:CONFIG.sim.tickRate,inputs:frames})');w.samples.push(performance.now()-t);w.finalHash.push(w.e.run('BloomOwnedSDK.hashBytes(bloomAdapter.save())'));if(w.mode)w.phase.push(w.e.json('coarseStats'));assert(w.e.run('bloomAdapter.validateSnapshot(bloomAdapter.save(),{tick:bloomTick})'))}
 samples.push(counts);console.error(JSON.stringify({tick,measured:samples.length}));
}
// Every pair algorithm has identical sorted exact contacts and must solve identically.
for(const w of worlds.filter(w=>['global','coarse'].includes(w.mode)))assert.deepEqual(w.finalHash,worlds.find(w=>w.mode==='global').finalHash,'Pair algorithm changes authority');
const results=worlds.map(w=>({name:w.name,count,sourceSHA:w.e.sha256,totalMs:summary(w.samples),phaseMs:w.phase.length?summary(w.phase.map(s=>s.totalMs)):null,hashes:w.finalHash,raw:w.samples}));
const report={method:'Actual whole adapter ticks from identical moving baseline snapshots. Restore/setup/save/validation excluded from timing; all in-tick grid/movement/solver/terrain stages included. Instrumentation inside pair enumeration disabled. All pair lanes assert identical resulting authority. Native CPU, no browser/network/device claim.',snapshots:samples,results};console.log(JSON.stringify(report,null,2));fs.writeFileSync(process.env.REPORT||path.join(__dirname,'coarse-matched-ticks-results.json'),JSON.stringify(report,null,2)+'\n');
