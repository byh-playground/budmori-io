'use strict';
// Cross-artifact query order and continuing simulation parity. Actual shipped
// HTML/SDK, native V8 without rendering, transport, or device/FPS claims.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const {engine}=require('./native-engine.cjs');
const baselineHTML=process.env.BLOOM_SPATIAL_BASELINE?fs.readFileSync(process.env.BLOOM_SPATIAL_BASELINE,'utf8'):cp.execFileSync('git',['show','a12b6fa005a06fb3f9b718c71c34a6e465a4f04c:index.html'],{cwd:path.join(__dirname,'..'),encoding:'utf8',maxBuffer:4*1024*1024});
const target=path.resolve(process.argv[2]||path.join(__dirname,'../index.html'));
const engines=[engine('baseline-a12b6fa.html',baselineHTML),engine(target)];
const report={kind:'Actual native engine cross-artifact canonical and ordered-query parity',baselineSHA256:engines[0].sha256,targetSHA256:engines[1].sha256,queries:0,boundaries:0,effects:0,chapters:[]};
function run(source){for(const e of engines)e.run(source)}
function same(label){const bytes=engines.map(e=>Buffer.from(e.run('bloomAdapter.save()')));assert(bytes[0].equals(bytes[1]),'Canonical bytes differ: '+label);assert.equal(engines[0].run('JSON.stringify(bloomCurrentEffects)'),engines[1].run('JSON.stringify(bloomCurrentEffects)'),'Effects differ: '+label);report.boundaries++;}
function query(source,label){const values=engines.map(e=>e.json(source));assert.deepEqual(values[0],values[1],label);report.queries++;return values[0]}
run('BloomSimulation.initialize(12345)');
query(`(()=>{const m=state.mother,result=[];for(const inner of [false,true]){result.push(visibleHuntBounds(m,inner));const leaked=visibleHuntBounds(m,inner);leaked.left=-1e12;result.push(visibleHuntBounds(m,inner))}m.x+=17;m.y+=13;result.push(visibleHuntBounds(m));const a=state.campaign.huntView;for(const key of ['halfWidth','halfHeight','insetX','insetY','huntInset']){a[key]+=3;result.push(visibleHuntBounds(m,true))}return result})()`,'Bounds ownership, motion and in-place viewport invalidation');
query(`(()=>{const u={id:123,type:'swordsman',x:100,y:100,hx:90,hy:90,homeX:70,homeY:70,worldX:100,worldY:100,attackController:{x:80,y:80,fromX:60,fromY:60}},out=[];for(let i=0;i<4;i++){if(i===1){u.x+=8;u.y+=9;u.hx+=4;u.homeY+=6;u.attackController.x+=5;u.attackController.fromY+=7}if(i===2){u.z+=20;u.airHeight+=2;u.attackController.z=undefined}spatialUnit(u,i!==3);out.push(JSON.stringify({u,unit:spatialUnits.get(u),anchors:spatialAnchors.get(u),controller:spatialAnchors.get(u.attackController)}))}return out})()`,'Spatial field and WeakMap record parity across movement and explicit Z changes');
run(`BloomSimulation.initialize(12345);state.units=[];
for(let i=0;i<180;i++){const u={id:i+1,type:'swordsman',team:i%3?'friendly':'enemy',hp:i%11?10:0,x:96+(i%15)*8,y:96+Math.floor(i/15)*8,hx:96+(i%15)*8,hy:96+Math.floor(i/15)*8,rarityGrade:i%3};state.units.push(u)}
state.units.push({id:181,type:'swordsman',team:'friendly',hp:10,x:0,y:0},{id:182,type:'swordsman',team:'enemy',hp:10,x:CONFIG.world.zoneWidth*CONFIG.zones.length,y:CONFIG.world.height});rebuildGrid();`);
for(const kind of ['near','nearLocal'])for(const team of [null,'friendly','enemy'])for(const [x,y,r]of [[128,128,0],[128,128,32],[128,128,32-Number.EPSILON*32],[128,128,90],[0,0,100],[-32,-32,100],[21600,3600,64]])for(const cap of [0,1,7])query(`(()=>{const ids=[];${kind}(${x},${y},${r},${JSON.stringify(team)},u=>{ids.push(u.id);if(${cap}&&ids.length>=${cap})return false});return ids})()`,`${kind} order/filter/cutoff ${team}/${x}/${y}/${r}/${cap}`);
// Query reads current coordinates within historical buckets, including callback
// mutations and center-first traversal. A different broadphase must keep this.
query(`(()=>{const ids=[];nearLocal(128,128,90,null,u=>{ids.push(u.id);if(ids.length===1){state.units[1].x=5000;state.units[2].hp=0;state.units[3].x=128;state.units[3].y=128}});return ids})()`,'Callback mutations');
run('state.units[20].x=300;state.units[20].y=300');
query('(()=>{const ids=[];nearLocal(300,300,300,null,u=>ids.push(u.id));return ids})()','Moved unit retains historical bucket');
run('refreshMoaContactGrid();{const u=state.units[20],key=Math.floor(u.x/CONFIG.sim.collisionCell)+Math.floor(u.y/CONFIG.sim.collisionCell)*collisionColumns;u.x=128;u.y=128;reindexMoaContact(u,key)}');
query('(()=>{const ids=[];nearLocal(128,128,150,null,u=>ids.push(u.id));return ids})()','Contact reindex preserves splice/append order');
query('([...collisionGrid].map(([k,list])=>[k,list.map(u=>u.id)]))','Grid map insertion order including empty buckets');
report.chapters.push('Query boundaries, center-first order, exact cutoff, early exit, live mutations, stale buckets, contact reindex');
// Continue actual shared state through movement, recall, graph replacement and
// restore; compare complete canonical bytes after every input boundary.
for(const count of [10,155]){
 run(`CONFIG.session.mode='online';bloomApplyTickRate(10);BloomSimulation.initialize(12345);WorldMembership.apply({epoch:0,tick:0,players:['a','b','c','d','e']});BloomSimulation.sessionConfig={mode:'online',persistence:'none'};
 for(const p of WorldPlayers.all()){const d=WorldPlayers.data(p);let level=1;while(rarityCapacityAtLevel(level)<${count})level++;d.campaign.abilities.level=level;d.campaign.abilities.xp=abilityThreshold(level);moaSyncLevelHP(p.leader);p.leader.hp=p.leader.maxHp;for(const [i,type]of ['swordsman','shellbug','dandelion','archer'].entries())rarityAcquire(p.accountOwner,type,2,Math.floor(${count}/4)+(i<${count}%4?1:0));for(const r of rarityAccount(p.accountOwner).active)rarityLock(r.uid,true);rarityRecall(p.accountOwner)}
 for(const c of state.camps){c.enabled=false;c.spawned=true;c.regrowth=[]}rebuildGrid();spatialBoundary();`);
 same(count+' initial');
 for(let i=0;i<60;i++){
  if(i===20){run('globalThis.spatialCheckpoint=bloomAdapter.save();bloomAdapter.load(spatialCheckpoint)');same(count+' restored');}
  if(i===40){run('for(const p of WorldPlayers.all())rarityRecall(p.accountOwner);rebuildGrid();spatialBoundary()');same(count+' recall');}
  run(`bloomAdapter.step({tick:bloomTick,tickRate:CONFIG.sim.tickRate,inputs:WorldPlayers.all().map(p=>({playerId:p.playerId,input:bloomEncodeInput({x:${i%20<10?.25:-.25},y:${i%30<15?.1:-.1},manual:true}),commands:[]}))})`);same(count+' tick '+i);report.effects++;
 }
 for(const e of engines)assert(e.run('bloomAdapter.validateSnapshot(bloomAdapter.save(),{tick:bloomTick})'),'Valid final snapshot');
 report.chapters.push({players:5,armyPerPlayer:count,ticks:60,restore:true,recall:true});
}
console.log(JSON.stringify(report,null,2));if(process.env.BLOOM_SPATIAL_PARITY_REPORT)fs.writeFileSync(process.env.BLOOM_SPATIAL_PARITY_REPORT,JSON.stringify(report,null,2)+'\n');
