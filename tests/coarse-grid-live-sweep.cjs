'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const {engine}=require('./native-engine.cjs'),{summary}=require('./netcode-benchmark.cjs'),{setup}=require('./coarse-fixture.cjs');
const source=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const counts=(process.env.COUNTS||'155,1000').split(',').map(Number),ticks=+(process.env.TICKS||70),warm=+(process.env.WARM||20);
const results=[];
for(const count of counts)for(const clustered of [false,true]){
 const lanes=[32,64,128,256].map(cell=>{const e=engine('grid-'+cell,source.replace('collisionCell:32,','collisionCell:'+cell+','));const fixture=setup(e,count,clustered);e.run(`globalThis.stage={grid:0,query:0,leader:0,queryCalls:0};for(const [name,key]of [['rebuildGrid','grid'],['refreshMoaContactGrid','grid'],['nearLocal','query'],['solveMoaContacts','leader']]){const f=globalThis[name];globalThis[name]=function(...args){const t=performance.now();try{return f(...args)}finally{stage[key]+=performance.now()-t;if(key==='query')stage.queryCalls++}}}`);return{cell,e,fixture,samples:[],stages:[]}});
 for(let tick=0;tick<ticks;tick++)for(const lane of tick%2?[...lanes].reverse():lanes){lane.e.run('for(const k in stage)stage[k]=0');const t=performance.now();lane.e.run('bloomAdapter.step({tick:bloomTick,tickRate:CONFIG.sim.tickRate,inputs:frames})');const elapsed=performance.now()-t;if(tick>=warm){lane.samples.push(elapsed);lane.stages.push(lane.e.json('stage'))}}
 for(const lane of lanes){const result={count,clustered,cell:lane.cell,fixture:lane.fixture,totalMs:summary(lane.samples),stage:Object.fromEntries(Object.keys(lane.stages[0]).map(k=>[k,summary(lane.stages.map(s=>s[k]))])),valid:lane.e.run('bloomAdapter.validateSnapshot(bloomAdapter.save(),{tick:bloomTick})')};assert(result.valid);results.push(result);console.error(JSON.stringify(result))}
}
fs.writeFileSync(path.join(__dirname,'coarse-grid-live-results.json'),JSON.stringify({method:'Actual five-human moving simulation, no renderer/transport. Timed stage wrappers included in all lanes. Different cell sizes change separation order/trajectories; no parity claim.',results},null,2)+'\n');
