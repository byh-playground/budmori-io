'use strict';
// Shipped HTML and embedded SDK in independent V8 realms. All stopped fixtures
// call real creation/ownership/lifecycle APIs. No source replacement or mock
// simulation is used; this does not claim browser/GPU coverage.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {engine}=require('./native-engine.cjs');
const {sameSemantic,normalize,graph}=require('./native-semantic.cjs');
const root=path.resolve(__dirname,'..'),files=[process.argv[2]||root+'/index.html',process.argv[3]||root+'/index.html'],es=files.map(file=>engine(file));
const crossArtifact=es[0].sha256!==es[1].sha256;
const report={sources:es.map(e=>e.sha256),semanticChecks:0,bytesChecks:0,effectChecks:0,spawnChecks:0,continuousTicks:0,chapters:[]};
const both=code=>es.forEach(e=>e.run(`(()=>{${code}})()`));
function same(label){if(crossArtifact){sameSemantic(es,label);report.semanticChecks++}else{assert.deepEqual(Buffer.from(es[0].run('bloomAdapter.save()')),Buffer.from(es[1].run('bloomAdapter.save()')),label+' full bytes/key order/RNG/alias graph');assert.equal(es[0].run('JSON.stringify(bloomCurrentEffects)'),es[1].run('JSON.stringify(bloomCurrentEffects)'),label+' full effect payload/order/IDs');report.bytesChecks++}report.effectChecks++}
function create(code,label){both(`globalThis.qaSpawn=${code};`);if(crossArtifact)assert.deepEqual(graph(normalize(es[0].run('qaSpawn')).value),graph(normalize(es[1].run('qaSpawn')).value),label+' semantic actor state');else assert.equal(es[0].run('JSON.stringify(qaSpawn)'),es[1].run('JSON.stringify(qaSpawn)'),label+' actor fields/order');same(label);report.spawnChecks++}
function restore(label,prepared=false){both('globalThis.qaWire=bloomAdapter.save()');both(prepared?'BloomPreparedSnapshots.install(BloomPreparedSnapshots.prepare(qaWire,{tick:bloomTick}),{tick:bloomTick})':'bloomAdapter.load(qaWire)');same(label)}
function transaction(code,label){both(`bloomInTick=true;bloomCurrentEffects=[];bloomEventSequence=0;try{${code}}finally{bloomInTick=false}rebuildGrid();spatialBoundary();`);same(label)}
function tick(label){both(`bloomAdapter.step({tick:bloomTick,tickRate:CONFIG.sim.tickRate,inputs:WorldPlayers.all().filter(p=>p.lifecycle==='active').map(p=>({playerId:p.playerId,input:bloomEncodeInput({x:0,y:0,manual:true}),commands:[]}))})`);same(label);report.continuousTicks++}
try{
 const source=fs.readFileSync(files[1],'utf8');
 assert.equal((source.match(/^function spawn\(/gm)||[]).length,1,'one stable spawn entry');
 assert(!/^spawn\s*=\s*function/gm.test(source),'no global spawn overrides');
 assert(!/\b(?:\w+Core|core|rarityLegacy)\.spawn\b/.test(source),'no captured spawn delegate');
 assert(!/\braritySpawnRaw\b/.test(source),'inventory uses explicit body creation');
 assert(source.includes('const UnitSpawn=Object.freeze({'),'concrete construction owner');
 for(const capture of source.matchAll(/const (\w+Core|core|rarityLegacy)=\{([^\n]*?)\};/g))assert(!/(?:^|,)\s*spawn\s*(?:,|$)/.test(capture[2]),capture[1]+' has no retained spawn');
 assert(source.includes('const u = UnitSpawn.createBody(type,'),'inventory enters before record/grade installation');
 both("Date.now=()=>1700000000000;BloomSimulation.initialize(12345);");
 const species=es[1].json('Object.keys(CONFIG.units)');
 // Every configured species, grade and base role gets a fresh real body. Reset
 // between species bounds memory while preserving all 24 spawns in each world.
 for(const type of species){
  both('BloomSimulation.initialize(12345)');same('species reset '+type);
  for(let grade=0;grade<6;grade++)for(const role of ['wild','elite','boss','friendly']){
   const opts={zone:0,camp:0,rarityGrade:grade,hpScale:1.37,attackScale:1.23,recruitHpScale:1.11,recruitAttackScale:1.17,captureWeight:2};
   if(role==='elite')opts.variant='elite';if(role==='boss'){opts.boss=true;opts.elite=true}
   create(`spawn(${JSON.stringify(type)},${JSON.stringify(role==='friendly'?'friendly':'enemy')},2480,2460,${JSON.stringify(opts)})`,type+'/'+grade+'/'+role);
   assert(es[1].run('qaSpawn&&qaSpawn===idMap.get(qaSpawn.id)&&state.units.includes(qaSpawn)&&UnitMovement.is(qaSpawn)&&motionStateValid(qaSpawn)&&!!qaSpawn.spatial'),'live actor registration/owners');
  }
 }
 report.chapters.push(species.length+' species × 6 grades × 4 roles');
 both('BloomSimulation.initialize(23456)');
 // Spatial inference, option mutation, grade sampling, boundary relocation and
 // null/error ordering are checked before fixtures introduce any manual fields.
 for(const opts of [{},{rarityGrade:null},{rarityGrade:3,airHeight:13},{rarityGrade:2,z:79},{rarityGrade:4,groundZ:55,airHeight:24,z:79},{rarityGrade:1,hz:27,homeZ:29}]){
  both(`globalThis.qaOptions=${JSON.stringify({zone:0,camp:0,...opts})}`);
  create('spawn("sporefly","enemy",-80,4800,qaOptions)','spatial '+JSON.stringify(opts));
  assert.equal(es[0].run('JSON.stringify(qaOptions)'),es[1].run('JSON.stringify(qaOptions)'),'spawn options mutation retained');
 }
 for(const expression of ['spawn("unknown","enemy",10,20,{})','spawn("archer","enemy",10,20,{z:NaN})','spawn("archer","enemy",10,20,{z:10,groundZ:2,airHeight:9})']){
  both(`globalThis.qaError=null;try{globalThis.qaInvalid=${expression}}catch(e){qaError=e.name+': '+e.message}`);
  assert.equal(es[0].run('qaError'),es[1].run('qaError'),'same rejected precondition');same('null/error '+expression);
 }
 // An inferred elite reservation is looked up after all pre-placement stages.
 both(`BloomSimulation.initialize(12345);const p=ThemedTerrain.safePoint(2470,2460,CONFIG.units.archer.size+4);state.camps[0].regrowth=[{type:'archer',boss:false,variant:'elite',cued:true,point:p,reservationId:71}];globalThis.qaPoint=p;`);
 create('spawn("archer","enemy",qaPoint.x,qaPoint.y,{zone:0,camp:0,rarityGrade:3})','inferred elite reservation');
 assert(es[1].run('qaSpawn.variant==="elite"'),'reservation promotes elite');
 both(`BloomSimulation.initialize(12345);const q={type:'archer',boss:false,variant:'rival',cued:true,reservationId:79};const p=regrowSpot(state.camps[0],q);if(!p)throw Error('reservation placement failed');q.point=p;state.camps[0].regrowth=[q];globalThis.qaPoint=p;`);
 create('spawn("archer","enemy",qaPoint.x,qaPoint.y,{zone:0,camp:0,rarityGrade:3})','inferred rival reservation');
 assert(es[1].run('qaSpawn.rivalLeader&&qaSpawn.rivalReservation===79'),'reservation creates linked rival');
 report.chapters.push('height options, relocation, grade RNG, invalid-input ordering and elite/rival reservations');
 // A real rival placement search both relocates an invalid initial point and
 // consumes its existing RNG. The actual resulting reservation is then reused.
 both(`BloomSimulation.initialize(12345);globalThis.qaRival=spawn('swordsman','enemy',state.mother.x,state.mother.y,{camp:0,variant:'rival',rarityGrade:2});if(!qaRival)throw Error('rival placement fixture failed');state.camps[0].remaining++;rebuildGrid();spatialBoundary();`);same('rival placement search');
 assert(es[1].run('qaRival.rivalLeader&&qaRival.rival.ai&&rarityGetAccount(qaRival.id)'),'rival owners initialize');
 // Inventory creation deliberately enters before environmental grade RNG and
 // outer normalization. Real acquisition covers all four recruitable species.
 for(let grade=0;grade<6;grade++)for(const type of es[1].json('friendlyTypes')){
  both(`rarityAcquire(-1,${JSON.stringify(type)},${grade},1);rarityAcquire(qaRival.id,${JSON.stringify(type)},${grade},1);`);same('human/NPC inventory '+type+'/'+grade);
 }
 restore('owned armies live restore');
 both('globalThis.qaRival=state.units.find(u=>u.rivalLeader)');
 transaction(`const record=rarityGetAccount(-1).active[0];globalThis.qaSleepingUID=record.uid;rarityLock(record.uid,true);rarityKillOwned(rarityBody(record),null);`,'locked human body sleeps');
 restore('sleeping body prepared restore',true);
 both(`globalThis.qaBeforeRevive={rng:state.rng,id:state.nextId};const found=rarityRecord(qaSleepingUID);globalThis.qaSleepingBody=found.record.body;rarityRespawn(found.account,found.record);`);same('same human body revives');
 assert(es[1].run('state.rng===qaBeforeRevive.rng&&state.nextId===qaBeforeRevive.id&&idMap.get(qaSleepingBody.id)===qaSleepingBody'),'revival reuses body and no RNG/ID');
 transaction(`const u=state.units.find(u=>u.rivalLeader);globalThis.qaRivalID=u.id;die(u,null);`,'rival leader sleeps with army');
 restore('sleeping rival restore');
 both(`const saved=state.rarityRivals[qaRivalID];saved.respawnAt=state.time;rarityRivalTick(0);`);same('same rival leader revives');
 assert(es[1].run('idMap.get(qaRivalID).hp>0&&!state.rarityRivals[qaRivalID]'),'rival revival finishes');
 transaction(`residentDie(residentUnit(),state.mother)`,'resident defeat');
 both('residentSpawn();rebuildGrid();spatialBoundary()');same('resident replacement generation');
 assert(es[1].run('residentState().generation===2&&residentUnit().attackController'),'resident construction and controller');
 report.chapters.push('rival search, human/NPC inventory grades, locked sleeping body, rival/resident revival');
 // Dense rejection uses actual bodies covering the whole annulus. The search
 // cannot allocate a body, but must preserve its consumed grade/search RNG.
 both(`BloomSimulation.initialize(98765);for(let x=1400;x<=3400;x+=80)for(let y=1400;y<=3400;y+=80)spawn('archer','enemy',x,y,{zone:0,camp:0,rarityGrade:1});rebuildGrid();globalThis.qaDenseId=state.nextId;`);same('dense 676-body world');
 create('spawn("swordsman","enemy",state.mother.x,state.mother.y,{camp:0,variant:"rival"})','dense rejected rival');
 assert(es[1].run('qaSpawn===null&&state.nextId===qaDenseId'),'rejected placement allocates no entity');
 create('spawn("swordsman","enemy",state.mother.x,state.mother.y,{camp:0,variant:"rival",z:NaN})','rejected placement precedes height validation');
 assert(es[1].run('qaSpawn===null&&state.nextId===qaDenseId'),'failed faction placement never reaches height validation');
 report.chapters.push('dense full-annulus placement failure and precondition ordering');
 // One continuous actual shared world; naturally scheduled regrowth creates new
 // encounters while checkpoint imports, membership and defeat/recovery happen.
 both(`CONFIG.session.mode='online';BloomSimulation.initialize(12345);WorldMembership.apply({epoch:0,tick:0,players:['a','b','c']});BloomSimulation.sessionConfig=Object.freeze({mode:'online',persistence:'none',progressionPolicy:'fresh'});for(const p of WorldPlayers.all()){p.auto.enabled=false;rarityAcquire(p.accountOwner,'archer',2,2);}`);same('continuous shared world starts');
 const startIds=es[1].run('state.nextId');
 for(let i=0;i<240;i++){
  if(i===30)restore('continuous live checkpoint');
  if(i===60){both('globalThis.qaDisk=BloomSimulation.disk.snapshot();if(!BloomSimulation.disk.load(qaDisk))throw Error("disk rejected")');same('continuous disk restore')}
  if(i===90)restore('continuous prepared checkpoint',true);
  if(i===115)transaction('PlayerLifecycle.defeat(WorldPlayers.get("b"),null)','continuous participant defeat');
  if(i===120)transaction('PlayerLifecycle.recover(WorldPlayers.get("b"))','continuous participant recovery');
  if(i===150){both('WorldMembership.apply({epoch:1,tick:bloomTick,players:["a","b"]})');same('continuous member leave')}
  if(i===151){both('WorldMembership.apply({epoch:2,tick:bloomTick,players:["a","b","d"]})');same('continuous new member admission')}
  if(i===180){both('WorldMembership.apply({epoch:3,tick:bloomTick,players:["a","b","c","d"]})');same('continuous member readmission')}
  tick('continuous '+i);
 }
 assert(es[1].run('state.nextId')>startIds+20,'real scheduled world spawns progressed');
 assert(es[1].run('bloomValidate(bloomCapture())'),'final world valid');
 assert(es[1].run('WorldPlayers.all().every(p=>p.leader instanceof MoaActor&&motionStateValid(p.leader)&&!!p.leader.spatial&&p.leader===idMap.get(p.leader.id))'),'admitted leaders keep intrinsic owners/aliases');
 restore('final continued world restore');
 report.chapters.push('240 continuous shared-world ticks, natural regrowth, live/disk/prepared restore, defeat/recover, admission/readmission');
 report.status='PASS';
}catch(error){report.status='FAIL';report.error=error.stack;process.exitCode=1}
finally{both('bloomSession?.close()');console.log(JSON.stringify(report,null,2));if(process.env.BLOOM_SPAWN_REPORT)fs.writeFileSync(process.env.BLOOM_SPAWN_REPORT,JSON.stringify(report,null,2)+'\n')}
