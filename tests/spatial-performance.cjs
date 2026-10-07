'use strict';
// Alternating-order native V8 timings for exactly the same five-human fixture.
// The complete simulation rate/rules run unchanged; no renderer or transport.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const {engine}=require('./native-engine.cjs'),{summary}=require('./netcode-benchmark.cjs');
const target=path.resolve(process.argv[2]||path.join(__dirname,'../index.html'));
let baselineHTML=process.env.BLOOM_SPATIAL_BASELINE?fs.readFileSync(process.env.BLOOM_SPATIAL_BASELINE,'utf8'):cp.execFileSync('git',['show','a12b6fa005a06fb3f9b718c71c34a6e465a4f04c:index.html'],{cwd:path.join(__dirname,'..'),encoding:'utf8',maxBuffer:4*1024*1024});
const baselineDefeatFix=process.env.BLOOM_SPATIAL_BASELINE_DEFEAT_FIX==='1';
if(baselineDefeatFix){const original="if(u.attackController)cancelAttackPattern(u,'owner-dead')",fixed="if(u.attackController&&u.attackController.phase!=='standard')cancelAttackPattern(u,'owner-dead')";assert(baselineHTML.includes(original),'known baseline death guard');baselineHTML=baselineHTML.replace(original,fixed)}
const count=Number(process.env.BLOOM_SPATIAL_ARMY||1000),ticks=Number(process.env.BLOOM_SPATIAL_TICKS||80),warmup=Number(process.env.BLOOM_SPATIAL_WARMUP||20),clustered=process.env.BLOOM_SPATIAL_CLUSTER==='1';
const engines=[engine('baseline-a12b6fa.html',baselineHTML),engine(target)];
for(const e of engines)e.run(`CONFIG.session.mode='online';bloomApplyTickRate(10);BloomSimulation.initialize(12345);WorldMembership.apply({epoch:0,tick:0,players:['a','b','c','d','e']});BloomSimulation.sessionConfig={mode:'online',persistence:'none'};
for(const p of WorldPlayers.all()){const d=WorldPlayers.data(p);let level=1;while(rarityCapacityAtLevel(level)<${count})level++;d.campaign.abilities.level=level;d.campaign.abilities.xp=abilityThreshold(level);moaSyncLevelHP(p.leader);p.leader.hp=p.leader.maxHp;for(const [i,type]of ['swordsman','shellbug','dandelion','archer'].entries())rarityAcquire(p.accountOwner,type,2,Math.floor(${count}/4)+(i<${count}%4?1:0));for(const r of (globalThis.rarityGetAccount||rarityAccount)(p.accountOwner).active)rarityLock(r.uid,true);rarityRecall(p.accountOwner)}
${clustered?`const anchor={x:state.mother.x,y:state.mother.y};for(const [i,p]of WorldPlayers.all().entries()){const dx=anchor.x+(i%3)*40-p.leader.x,dy=anchor.y+Math.floor(i/3)*40-p.leader.y;p.leader.x+=dx;p.leader.y+=dy;spatialUnit(p.leader,true);for(const u of state.units)if(u.playerId===p.playerId){u.x+=dx;u.y+=dy;u.hx+=dx;u.hy+=dy;spatialUnit(u,true)}}`:''}
for(const c of state.camps){c.enabled=false;c.spawned=true;c.regrowth=[]}rebuildGrid();spatialBoundary();
globalThis.frames=WorldPlayers.all().map(p=>({playerId:p.playerId,input:bloomEncodeInput({x:.25,y:.1,manual:true}),commands:[]}));`);
const initialValid=engines.map(e=>e.run('bloomAdapter.validateSnapshot(bloomAdapter.save(),{tick:bloomTick})'));
assert(initialValid.every(Boolean),'Valid initial fixture: '+JSON.stringify(initialValid));
const timing=[[],[]],boundaries=[];
function check(i){const bytes=engines.map(e=>Buffer.from(e.run('bloomAdapter.save()')));assert(bytes[0].equals(bytes[1]),'Canonical bytes differ at tick '+i);boundaries.push({tick:i,bytes:bytes[0].length,hash:require('node:crypto').createHash('sha256').update(bytes[0]).digest('hex')})}
check(0);
for(let i=0;i<ticks;i++){
 for(const j of i%2?[1,0]:[0,1]){const start=performance.now();engines[j].run('bloomAdapter.step({tick:bloomTick,tickRate:CONFIG.sim.tickRate,inputs:frames})');if(i>=warmup)timing[j].push(performance.now()-start)}
 assert.equal(engines[0].run('JSON.stringify(bloomCurrentEffects)'),engines[1].run('JSON.stringify(bloomCurrentEffects)'),'Full effects tick '+i);
 if((i+1)%20===0||i===ticks-1)check(i+1);
}
// A 1-D SAP would conservatively enumerate every X-overlapping unit before its
// exact Y/contact check. Compare candidate counts only (not a claimed SAP timing).
const density=engines[1].json(`(()=>{
 const active=state.units.filter(u=>u.hp>0),xs=active.map(u=>u.x).sort((a,b)=>a-b),sizes=[...collisionGrid.values()].map(v=>v.length).filter(Boolean).sort((a,b)=>a-b),cs=CONFIG.sim.collisionCell;
 const lower=(x,equal)=>{let lo=0,hi=xs.length;while(lo<hi){const mid=(lo+hi)>>>1;if(xs[mid]<x||equal&&xs[mid]===x)lo=mid+1;else hi=mid}return lo};let gridCandidates=0,sapXCandidates=0;
 for(const u of active){const r=moaBodyRadius(u)+(unitDef(u.type).layer==='AIR'?maxCollisionAir:maxCollisionGround),minX=Math.max(0,Math.floor((u.x-r)/cs)),maxX=Math.min(collisionColumns-1,Math.floor((u.x+r)/cs)),minY=Math.max(0,Math.floor((u.y-r)/cs)),maxY=Math.min(collisionRows-1,Math.floor((u.y+r)/cs)),center=Math.floor(u.x/cs)+Math.floor(u.y/cs)*collisionColumns;gridCandidates+=collisionGrid.get(center)?.length||0;
 for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){const key=x+y*collisionColumns;if(key!==center)gridCandidates+=collisionGrid.get(key)?.length||0}sapXCandidates+=lower(u.x+r,true)-lower(u.x-r,false)}
 return{liveUnits:active.length,occupiedCells:sizes.length,cellSize:cs,bucketP50:sizes[Math.ceil(sizes.length*.5)-1],bucketP95:sizes[Math.ceil(sizes.length*.95)-1],bucketMax:sizes.at(-1),uncappedConservativeGridCandidates:gridCandidates,oneAxisSAPCandidates:sapXCandidates,note:'Count comparison at final boundary; real separation retains its existing early-exit and historical cell order. No SAP runtime speed claim.'};})()`);
const valid=engines.map(e=>e.run('bloomAdapter.validateSnapshot(bloomAdapter.save(),{tick:bloomTick})'));
const validation=engines.map(e=>e.json('({players:WorldPlayers.validate(state),rarity:rarityValidateState(state),resident:residentBossValidate(state,projectiles),spatialState:spatialTree(state),spatialShots:spatialTree(projectiles),marks:state.units.every(u=>validMoaRecruitMarks(u,state)),units:state.units.length,shots:projectiles.length})'));
if(!valid.every(Boolean)&&process.env.BLOOM_SPATIAL_DEBUG_SAVE)for(let i=0;i<engines.length;i++)fs.writeFileSync(process.env.BLOOM_SPATIAL_DEBUG_SAVE+'-'+i+'.bin',Buffer.from(engines[i].run('bloomAdapter.save()')));
const report={kind:'Paired actual native V8 five-human simulation, alternate order per tick',players:5,armyPerPlayer:count,clustered,baselineDefeatFix,tps:10,ticks,warmup,sourceSHA256:engines.map(e=>e.sha256),simulationStepMs:{baseline:summary(timing[0]),candidate:summary(timing[1])},p95TargetMs:80,p95TargetMet:summary(timing[1]).p95<80,boundaries,effectsCompared:ticks,density,initialValid,valid,validation};
console.log(JSON.stringify(report,null,2));if(process.env.BLOOM_SPATIAL_PERF_REPORT)fs.writeFileSync(process.env.BLOOM_SPATIAL_PERF_REPORT,JSON.stringify(report,null,2)+'\n');

assert(valid.every(Boolean),'Valid final snapshots: '+JSON.stringify(valid));
