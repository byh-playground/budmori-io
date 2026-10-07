'use strict';
// Actual shipped HTML/SDK, native nested-state bytes and effect-journal parity.
// An explicit baseline HTML path makes this a cross-artifact regression. The
// default runs the same ownership/lifecycle assertions in two independent realms.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {engine}=require('./native-engine.cjs');
const root=path.resolve(__dirname,'..'),files=[process.argv[2]||root+'/index.html',process.argv[3]||root+'/index.html'],es=files.map(file=>engine(file));
const report={sources:es.map(e=>e.sha256),boundaries:0,effectChecks:0,assertions:0,chapters:[],weapons:[]};
const both=code=>es.forEach(e=>e.run(code));
function same(label){assert.deepEqual(Buffer.from(es[0].run('bloomAdapter.save()')),Buffer.from(es[1].run('bloomAdapter.save()')),label+' canonical graph');assert.equal(es[0].run('JSON.stringify(bloomCurrentEffects)'),es[1].run('JSON.stringify(bloomCurrentEffects)'),label+' effects');report.boundaries++;report.effectChecks++}
function check(code,label){assert(es[1].run(code),label);report.assertions++}
function restored(label,prepared=false){const bytes=es[0].run('bloomAdapter.save()');for(const e of es){e.c.qaBytes=bytes.slice();e.run(prepared?'BloomPreparedSnapshots.install(BloomPreparedSnapshots.prepare(qaBytes,{tick:bloomTick}),{tick:bloomTick})':'bloomAdapter.load(qaBytes)')}same(label);check('WorldPlayers.all().every(p=>motionStateValid(p.leader)&&!!p.leader.spatial&&!!p.leader.impact&&!!p.leader.body&&p.leader===idMap.get(p.leader.id))',label+' owner types and graph identities')}
try{
 both(`CONFIG.session.mode='online';BloomSimulation.initialize(12345);WorldMembership.apply({epoch:0,tick:0,players:['a','b','c','d','e']});BloomSimulation.sessionConfig={mode:'online',persistence:'none'};
 for(const c of state.camps){c.enabled=false;c.spawned=true;c.regrowth=[]}
 for(const p of WorldPlayers.all()){p.auto.enabled=false;const a=WorldPlayers.data(p).campaign.abilities;a.level=8;a.xp=abilityThreshold(8);a.chosen=7;for(const id of Object.keys(CONFIG.weaponCards.weapons))a.ranks[id]=1;moaSyncLevelHP(p.leader);p.leader.hp=p.leader.maxHp;rarityAcquire(p.accountOwner,'archer',1,2);const q=ThemedTerrain.safePoint(p.leader.x+105,p.leader.y,20),t=spawn('swordsman','enemy',q.x,q.y,{camp:0,rarityGrade:3});t.hp=t.maxHp=1e7;t.stun=1e6;t.aggroAt=t.wanderAt=state.time+1e6;state.camps[0].remaining++}rebuildGrid();spatialBoundary();`);
 same('five-player combat fixture');
 // Repeated resets replace native sprout state and recreate only active mounts.
 for(let i=0;i<3;i++){
  both(`launchAbilityShot({id:0,x:state.mother.x+100,y:state.mother.y,z:state.mother.z,hp:100,size:10},1,{weapon:'pod',owner:state.mother});resetSproutPresentation()`);
  same('launched sprout presentation reset '+i);
  check("state.mother.sprout.mounts.pod.kick===0&&!Object.hasOwn(state.mother,'sproutAim_pod')&&Number.isFinite(state.mother.sprout.mounts.pod.aim)",'mount reset owns kick and aim without scalar aliases');
 }

 check("WorldPlayers.all().every(p=>['spatial','impact','body','sprout'].every(k=>Object.keys(p.leader).includes(k)&&Object.getPrototypeOf(p.leader[k])===Object.prototype))",'native owner namespaces are enumerable plain state');
 check("WorldPlayers.all().every(p=>['impactVX','impactVY','bodyContact','bodyLeanX','bodyLeanY'].every(k=>{const d=Object.getOwnPropertyDescriptor(p.leader,k);return !d}))",'legacy motion scalar aliases are absent');
 check("(()=>{const [a,b]=WorldPlayers.all().map(p=>p.leader);return a.spatial!==b.spatial&&a.impact.velocity!==b.impact.velocity&&a.body.lean!==b.body.lean&&a.sprout.mounts!==b.sprout.mounts})()",'independent actor owners');
 // A tentative XY move must retain the old collision sweep origin until commit.
 both('globalThis.qaSpatialBefore={x:state.mother.x,checkpointX:state.mother.spatial.constrained.x};state.mother.x+=3');
 check('state.mother.x===qaSpatialBefore.x+3&&state.mother.spatial.constrained.x===qaSpatialBefore.checkpointX','tentative position and constrained checkpoint remain distinct');
 both('constrainWorld(state.mother);spatialUnit(state.mother,true)');same('constrained checkpoint');
 const weapons=new Set();
 for(let i=0;i<240;i++){
  if(i===20||i===85)both('for(const p of WorldPlayers.all()){addMoaImpulse(p.leader,91,-43);noteMoaContact(.6,.8,7,p.leader)}');
  if(i===45)restored('live rollback');
  if(i===95)restored('prepared snapshot',true);
  if(i===130){both(`const p=WorldPlayers.get('a'),u=state.units.find(u=>u.playerId==='a');if(u){rarityLock(u.rarityUID,true);bloomInTick=true;bloomCurrentEffects=[];try{rarityKillOwned(u,null)}finally{bloomInTick=false}}`);same('sleeping inventory body');check("Object.values(state.rarityAccounts).flatMap(a=>a.active).filter(r=>r.body).every(r=>motionStateValid(r.body)&&!!r.body.spatial)",'sleeping body owns spatial state');restored('sleeping body restore')}
  if(i===169){both(`WorldMembership.apply({epoch:1,tick:bloomTick,players:['a','b','c','d']})`);same('departed participant')}
  if(i===170){both(`WorldMembership.apply({epoch:2,tick:bloomTick,players:['a','b','c','d','f']})`);same('membership template hydration');check("motionStateValid(WorldPlayers.get('f').leader)&&!!WorldPlayers.get('f').leader.spatial&&!!WorldPlayers.get('f').leader.sprout",'new member owns geometry and sparse mounts')}
  both(`bloomAdapter.step({tick:bloomTick,tickRate:CONFIG.sim.tickRate,inputs:WorldPlayers.all().filter(p=>p.lifecycle==='active').map(p=>({playerId:p.playerId,input:bloomEncodeInput({x:${i%80<10?.1:0},y:${i%60<8?-.1:0},manual:true}),commands:[]}))})`);same('combat '+i);
  for(const weapon of es[1].json('projectiles.map(p=>p.weapon).filter(Boolean)'))weapons.add(weapon);
 }
 report.weapons=[...weapons].sort();assert.deepEqual(report.weapons,['beam','breath','chain','lob','pod','spore','thorn']);
 check('bloomValidate(bloomCapture())','final snapshot validation');
 check("WorldPlayers.all().every(p=>!Object.keys(p.leader).some(k=>/^sprout(Aim|Kick|Charge|Own|Recoil|SeedKind)/.test(k)))",'legacy mount aliases are absent');
 check(`(()=>{const a={id:1,type:'swordsman',team:'friendly',x:3,y:4};ImpactMotion.reset(a);BodyContact.reset(a);SproutState.syncMount(a,'beam',0,1,0,.4);SpatialPosition.constrain(a,3,4);spatialTree(a,true);spatialRebaseTerrain(a);const copy=BloomLiveCodec.decode(BloomLiveCodec.encode(a));return JSON.stringify(copy)===JSON.stringify(a)&&!Object.hasOwn(a.impact.velocity,'z')&&!Object.hasOwn(a.body.lean,'z')&&copy.sprout.mounts.beam.aim===.4&&motionStateValid(copy)})()`,'native graph persists owner state and direction vectors are never terrain points');
 const candidate=es[1];
 // Corrupt imports are rejected before installation for every actual actor kind.
 candidate.run('globalThis.qaValid=bloomAdapter.save()');
 for(const target of ['c.world.state.mother','c.world.state.units[0]'])for(const owner of ['spatial','impact','body','sprout']){
  candidate.c.qaTarget=target;candidate.c.qaOwner=owner;
  assert(candidate.run(`(()=>{const before=BloomOwnedSDK.hashBytes(bloomAdapter.save()),c=BloomLiveCodec.decode(qaValid);${target}[qaOwner]={};const valid=bloomValidate(c);let rejected=false;try{bloomAdapter.load(BloomLiveCodec.encode(c))}catch{rejected=true}return !valid&&rejected&&before===BloomOwnedSDK.hashBytes(bloomAdapter.save())})()`),target+' collision '+owner);report.assertions++;
 }
 // Sampled nested animation branches are presentation-owned; authority stays read-only.
 candidate.run('playing=true;paused=false;BLOOM_HEADLESS=false;view.x=state.mother.x;view.y=state.mother.y;view.w=view.h=2000;resetPresentation();presentation.active=true;presentation.frameNow=performance.now();presentation.frameSerial++;globalThis.qaPose=presentationPose(state.mother)');
 const before=Buffer.from(candidate.run('bloomAdapter.save()'));
 candidate.run('qaPose.sprout.mounts.beam.aim=.37');
 assert.throws(()=>candidate.run('qaPose.impact.velocity.x=99'),/Presentation cannot mutate/);
 candidate.run('qaPose.body.lean.x=.25');
 assert.throws(()=>candidate.run('qaPose.spatial.constrained.x=99'),/Presentation cannot mutate/);
 candidate.run("globalThis.qaVisualChecks=[MoaArt.muzzle(qaPose,'beam'),MoaArt.muzzle({x:10,y:20,size:30,hp:1},'beam'),MoaArt.muzzle({x:10,y:20,z:7,size:30,hp:0,sprout:{aim:.2,mounts:{beam:{aim:.2}}}},'beam')];");
 check('qaVisualChecks.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.z))','sampled/plain intro/death geometry stays finite');
 assert.deepEqual(Buffer.from(candidate.run('bloomAdapter.save()')),before,'render reads and independent scalar pose writes do not change authority');
 report.chapters=['native state serialization without aliases','independent 5-player owners','tentative/constrained geometry','240 actual combat ticks and all 7 weapon families','impulse/contact decay and collisions','live/prepared restores and sleeping inventory body','membership template hydration','namespace collision rejection','read-only sampled and non-player render records'];
 report.status='PASS';
}catch(error){report.status='FAIL';report.error=error.stack;process.exitCode=1}
finally{for(const e of es)e.run('bloomSession?.close()');console.log(JSON.stringify(report,null,2));if(process.env.BLOOM_MOTION_REPORT)fs.writeFileSync(process.env.BLOOM_MOTION_REPORT,JSON.stringify(report,null,2)+'\n')}
