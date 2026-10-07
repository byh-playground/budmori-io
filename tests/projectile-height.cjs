'use strict';
// Actual shipped engine. Supplemental deterministic regression, not browser/RTC QA.
const assert=require('node:assert/strict'),path=require('node:path');
const {engine}=require(path.join(process.cwd(),'tests/native-engine.cjs'));
const file=path.resolve(process.argv[2]||'index.html');let tested=0;
for(const tps of [10,20,30])for(let direction=0;direction<8;direction++){
 const e=engine(file);e.c.qaAngle=direction*Math.PI/4;e.c.qaTPS=tps;
 e.run(`CONFIG.session.mode='online';bloomApplyTickRate(qaTPS);bloomInitialize(12345);WorldMembership.apply({epoch:0,tick:0,players:['a','b','c','d','e']});BloomSimulation.sessionConfig={mode:'online'};
 for(const c of state.camps){c.enabled=false;c.spawned=true;c.regrowth=[]};for(const p of WorldPlayers.all())p.auto.enabled=false;
 globalThis.qaShots=[];globalThis.qaTravel={};const original=launchAbilityShot;launchAbilityShot=function(...args){const p=original(...args);qaShots.push(p);return p};
 for(const p of WorldPlayers.all()){const m=p.leader,q=ThemedTerrain.safePoint(m.x+160*Math.cos(qaAngle),m.y+160*Math.sin(qaAngle),20),t=spawn('shellbug','enemy',q.x,q.y,{camp:0,rarityGrade:1});t.hp=t.maxHp=1e7;t.stun=1e6;t.aggroAt=t.wanderAt=state.time+1e6;t.qaOwner=p.playerId;state.camps[0].remaining++};rebuildGrid();spatialBoundary();`);
 for(let tick=0;tick<60;tick++)e.run(`bloomAdapter.step({tick:bloomTick,tickRate:qaTPS,inputs:WorldPlayers.all().map(p=>({playerId:p.playerId,input:bloomEncodeInput({x:0,y:0,manual:true}),commands:[]}))});for(const p of projectiles)qaTravel[p.u]=Math.max(qaTravel[p.u]||0,p.progress||0)`);
 for(const row of e.json(`WorldPlayers.all().map(p=>({owner:p.playerId,attacks:WorldPlayers.data(p).stats.attacks,distance:qaTravel[p.leader.id]||0,damage:1e7-state.units.find(u=>u.qaOwner===p.playerId).hp}))`)){
  assert(row.attacks>0,'attack commits');assert(row.distance>50,`TPS ${tps}, region ${row.owner}, direction ${direction}: physical flight missing ${JSON.stringify(row)}`);assert(row.damage>0,`TPS ${tps}, region ${row.owner}, direction ${direction}: no hit damage`);tested++;
 }
 assert(e.run('bloomAdapter.validateSnapshot(bloomAdapter.save(),{tick:bloomTick})'),'valid post-combat snapshot');
}
for(const family of ['primary','pod','archer']){
 const e=engine(file);e.c.qaType=family;
 e.run(`CONFIG.session.mode='online';bloomInitialize(12345);WorldMembership.apply({epoch:0,tick:0,players:['a','b','c','d','e']});globalThis.qaM=WorldPlayers.get('e').leader;const q=ThemedTerrain.safePoint(qaM.x-160,qaM.y,20);globalThis.qaT=spawn('shellbug','enemy',q.x,q.y,{camp:0,rarityGrade:1});qaT.hp=qaT.maxHp=1e7;rebuildGrid();spatialBoundary();projectiles=[];if(qaType==='archer'){const u=spawn('archer','friendly',qaM.x,qaM.y,{playerId:'e',factionId:factionId(qaM)});projectile(u,qaT,14)}else launchAbilityShot(qaT,14,{owner:qaM,homing:true,range:235,...(qaType==='primary'?{}:{weapon:qaType})});globalThis.qaShot=projectiles.at(-1);globalThis.qaMax=0;`);
 for(let i=0;i<90;i++)e.run('WorldSimulation.projectiles(1/30);spatialTick();qaMax=Math.max(qaMax,qaShot.progress||0)');
 assert(e.run('qaMax>50'),family+' must travel');assert(e.run('qaT.hp<qaT.maxHp'),family+' must damage');tested++;
}
console.log('PASS '+tested+' primary/auxiliary/army terrain flight and actual damage checks; native engine only');
