'use strict';
// Native exact-state parity by default; BLOOM_SPATIAL_BASELINE explicitly opts
// into cross-artifact semantic parity for an incompatible old snapshot schema.
// Ordered queries and continuing simulation use the actual shipped
// HTML/SDK, native V8 without rendering, transport, or device/FPS claims.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {engine}=require('./native-engine.cjs');
const {sameSemantic}=require('./native-semantic.cjs');
const target=path.resolve(process.argv[2]||path.join(__dirname,'../index.html'));
const baseline=process.env.BLOOM_SPATIAL_BASELINE?path.resolve(process.env.BLOOM_SPATIAL_BASELINE):target;
const engines=[engine(baseline),engine(target)],crossArtifact=engines[0].sha256!==engines[1].sha256;
const report={kind:crossArtifact?'Actual engine cross-artifact semantic spatial and ordered-query parity':'Actual native engine exact-state spatial and ordered-query parity',baselineSHA256:engines[0].sha256,targetSHA256:engines[1].sha256,queries:0,boundaries:0,effects:0,exactRestores:0,chapters:[]};
function run(source){for(const e of engines)e.run(source)}
function same(label){if(crossArtifact)sameSemantic(engines,label);else{assert.deepEqual(Buffer.from(engines[0].run('bloomAdapter.save()')),Buffer.from(engines[1].run('bloomAdapter.save()')),label+' native canonical graph');assert.equal(engines[0].run('JSON.stringify(bloomCurrentEffects)'),engines[1].run('JSON.stringify(bloomCurrentEffects)'),label+' effects')}report.boundaries++;}
function restoreExactly(label){for(const e of engines){const before=Buffer.from(e.run('bloomAdapter.save()'));e.c.spatialCheckpoint=Uint8Array.from(before);e.run('bloomAdapter.load(spatialCheckpoint)');assert.deepEqual(Buffer.from(e.run('bloomAdapter.save()')),before,label+' same-schema canonical restore');report.exactRestores++;}same(label)}
function query(source,label){const values=engines.map(e=>e.json(source));assert.deepEqual(values[0],values[1],label);report.queries++;return values[0]}
run('BloomSimulation.initialize(12345)');
query(`(()=>{const m=state.mother,result=[];for(const inner of [false,true]){result.push(visibleHuntBounds(m,inner));const leaked=visibleHuntBounds(m,inner);leaked.left=-1e12;result.push(visibleHuntBounds(m,inner))}m.x+=17;m.y+=13;result.push(visibleHuntBounds(m));const a=state.campaign.huntView;for(const key of ['halfWidth','halfHeight','insetX','insetY','huntInset']){a[key]+=3;result.push(visibleHuntBounds(m,true))}return result})()`,'Bounds ownership, motion and in-place viewport invalidation');
// Construct the real controller in each runtime. Only the test's spatial
// command dispatch differs across schemas. Both actors/controllers come from
// production spawn; legacy fields are never added to a native fixture.
query(`(()=>{const u=spawn('siege','friendly',100,100,{rarityGrade:3}),c=u.attackController,out=[],native=typeof SpatialPosition!=='undefined'&&typeof SpatialPosition.constrain==='function';u.hx=90;u.hy=90;u.homeX=70;u.homeY=70;
 if(native)SpatialPosition.constrain(u,100,100);else{u.x=u.worldX=100;u.y=u.worldY=100}
 c.x=80;c.y=80;if(native)AttackPatternController.captureOrigin(c,60,60,spatialGround(60,60));else{c.fromX=60;c.fromY=60;c.fromZ=spatialGround(60,60)}
 for(let i=0;i<4;i++){
  if(i===1){u.x+=8;u.y+=9;u.hx+=4;u.homeY+=6;c.x+=5;if(native)c.origin.y+=7;else c.fromY+=7}
  if(i===2){u.z+=20;u.airHeight+=2;c.z=undefined}
  spatialUnit(u,i!==3);
  const origin=native?c.origin:{x:c.fromX,y:c.fromY,z:c.fromZ},checkpoint=native?u.spatial.constrained:{x:u.worldX,y:u.worldY,z:u.worldZ},ca=spatialAnchors.get(c),oa=native?spatialAnchors.get(c.origin):null,g={};
  for(const key of ['x','y','z','groundZ','airHeight','hx','hy','hz','homeX','homeY','homeZ'])g[key]=u[key];
  out.push({geometry:g,constrained:{...checkpoint},unit:{...spatialUnits.get(u)},anchors:JSON.parse(JSON.stringify(spatialAnchors.get(u))),controller:{x:c.x,y:c.y,z:c.z,origin:{...origin}},controllerAnchor:ca?.z&&{...ca.z},originAnchor:oa?.z?{...oa.z}:ca?.fromZ&&{...ca.fromZ}});
 }
 return out})()`,'Native controller geometry and spatial-cache semantics across movement and explicit Z changes');
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
// restore; compare complete semantic graphs, IDs, RNG and spatial metadata.
// Each engine restores only its own format, with exact same-format bytes.
for(const count of [10,155]){
 run(`CONFIG.session.mode='online';bloomApplyTickRate(10);BloomSimulation.initialize(12345);WorldMembership.apply({epoch:0,tick:0,players:['a','b','c','d','e']});BloomSimulation.sessionConfig={mode:'online',persistence:'none'};
 for(const p of WorldPlayers.all()){const d=WorldPlayers.data(p);let level=1;while(rarityCapacityAtLevel(level)<${count})level++;d.campaign.abilities.level=level;d.campaign.abilities.xp=abilityThreshold(level);moaSyncLevelHP(p.leader);p.leader.hp=p.leader.maxHp;for(const [i,type]of ['swordsman','shellbug','dandelion','archer'].entries())rarityAcquire(p.accountOwner,type,2,Math.floor(${count}/4)+(i<${count}%4?1:0));for(const r of (globalThis.rarityGetAccount||rarityAccount)(p.accountOwner).active)rarityLock(r.uid,true);rarityRecall(p.accountOwner)}
 for(const c of state.camps){c.enabled=false;c.spawned=true;c.regrowth=[]}rebuildGrid();spatialBoundary();`);
 same(count+' initial');
 for(let i=0;i<60;i++){
  if(i===20)restoreExactly(count+' restored');
  if(i===40){run('for(const p of WorldPlayers.all())rarityRecall(p.accountOwner);rebuildGrid();spatialBoundary()');same(count+' recall');}
  run(`bloomAdapter.step({tick:bloomTick,tickRate:CONFIG.sim.tickRate,inputs:WorldPlayers.all().map(p=>({playerId:p.playerId,input:bloomEncodeInput({x:${i%20<10?.25:-.25},y:${i%30<15?.1:-.1},manual:true}),commands:[]}))})`);same(count+' tick '+i);report.effects++;
 }
 for(const e of engines)assert(e.run('bloomAdapter.validateSnapshot(bloomAdapter.save(),{tick:bloomTick})'),'Valid final snapshot');
 report.chapters.push({players:5,armyPerPlayer:count,ticks:60,exactSameSchemaRestore:true,comparison:crossArtifact?'semantic graph':'exact canonical graph',recall:true});
}
for(const e of engines)e.run('bloomSession?.close()');
console.log(JSON.stringify(report,null,2));if(process.env.BLOOM_SPATIAL_PARITY_REPORT)fs.writeFileSync(process.env.BLOOM_SPATIAL_PARITY_REPORT,JSON.stringify(report,null,2)+'\n');
