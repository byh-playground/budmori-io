'use strict';
// Sanity-check the browser's declared encounters with sequential late joins.
// Native V8 fixture validation only; this does not replace normal-clock browser QA.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {engine}=require('./native-engine.cjs');
const source=fs.readFileSync(path.join(__dirname,'multiplayer-browser.e2e.mjs'),'utf8'),marker='const fixture=String.raw`';
const fixture=source.slice(source.indexOf(marker)+marker.length,source.indexOf('`;\nassert(source.html.includes')).replaceAll('${JSON.stringify(namespace)}','"native-fixture-inspection"');
const e=engine(path.resolve(process.argv[2]||path.join(__dirname,'../index.html')));e.c.EventTarget=EventTarget;e.run(fixture);
e.run("CONFIG.session.mode='online';bloomInitialize(12345);bloomAdapter.applyMembership({epoch:0,tick:0,players:['a'],joined:['a'],left:[],coordinatorId:'a',reason:'initial'});BloomSimulation.sessionConfig={mode:'online'}");
for(let count=1;count<=5;count++){
 if(count>1){e.c.qaPlayers=['a','b','c','d','e'].slice(0,count);e.run("bloomAdapter.applyMembership({epoch:state.membershipEpoch+1,tick:bloomTick,players:qaPlayers,joined:[qaPlayers.at(-1)],left:[],coordinatorId:'a',reason:'join'})")}
 for(let tick=0;tick<100;tick++)e.run("bloomAdapter.step({tick:bloomTick,tickRate:10,inputs:WorldPlayers.all().map(p=>({playerId:p.playerId,input:bloomEncodeInput({x:0,y:0,manual:false}),commands:[]}))})");
 const result=e.json("WorldPlayers.all().map(p=>({id:p.playerId,targets:state.units.filter(u=>u.qaRegion===p.startRegion).length,...__sharedBrowser.combat.get(p.playerId)}))");
 for(const player of result){assert.equal(player.targets,1,'One live encounter per present region');assert(player.samples>0&&player.maxDistance>50&&player.primaryDamage>0,JSON.stringify(player))}
 assert(e.run('bloomAdapter.validateSnapshot(bloomAdapter.save(),{tick:bloomTick})'));
}
console.log('PASS browser encounter fixture remains valid across sequential late admission and production culling');
