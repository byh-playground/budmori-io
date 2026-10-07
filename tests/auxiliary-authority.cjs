'use strict';
// Real native engine/SDK. Optional baseline compares full semantic authority;
// removed HUD mirrors are checked against the derived query independently.
const assert=require('node:assert/strict'),path=require('node:path');
const {engine}=require('./native-engine.cjs'),{sameSemantic}=require('./native-semantic.cjs');
const target=path.resolve(process.argv[2]||path.join(__dirname,'../index.html'));
const reference=process.argv[3];const engines=[engine(reference||target),engine(target)],after=engines[1];let checks=0,roundtrips=0;
function both(code){for(const e of engines)e.run(`(()=>{${code}})()`)}
function same(label){sameSemantic(engines,label);const expected=engines[0].json(`Object.fromEntries(Object.keys(state.mother.auxScheduleMs||{}).map(id=>[id,typeof weaponCooldownSeconds==='function'?weaponCooldownSeconds(state.mother,id):state.mother.auxCooldowns[id]]))`);assert.deepEqual(after.json(`Object.fromEntries(Object.keys(state.mother.auxScheduleMs||{}).map(id=>[id,weaponCooldownSeconds(state.mother,id)]))`),expected,label+' derived displayed cooldown');checks++}
function tick(label){both(`bloomAdapter.step({tick:bloomTick,tickRate:CONFIG.sim.tickRate,inputs:WorldPlayers.all().map(p=>({playerId:p.playerId,input:bloomEncodeInput({x:0,y:0,manual:true}),commands:[]}))})`);same(label)}
function restore(label){for(const e of engines){e.run('globalThis.qaSaved=bloomAdapter.save();bloomAdapter.load(qaSaved)');assert.deepEqual(Buffer.from(e.run('bloomAdapter.save()')),Buffer.from(e.run('qaSaved')),label+' exact same-build roundtrip');roundtrips++}same(label)}
try{
 for(const rate of [10,20,30]){
  both(`bloomSession?.close();bloomApplyTickRate(${rate});CONFIG.session.mode='local';BloomSimulation.initialize(12345);BloomSimulation.createSession();playing=true;paused=false;modalKind='';
   for(const c of state.camps){c.enabled=false;c.spawned=true;c.regrowth=[]}
   for(const u of state.units){u.stun=1e6;u.aggroAt=u.wanderAt=state.time+1e6}
   const m=state.mother;Object.assign(abilityState(),{ranks:{pod:1,lob:1,thorn:1,spore:1,beam:1,chain:1,breath:1},mods:{},chosen:7,level:9,xp:abilityThreshold(9),draft:null});moaSyncLevelHP(m);m.hp=m.maxHp;
   const pos=ThemedTerrain.safePoint(m.x+100,m.y,20),t=spawn('shellbug','enemy',pos.x,pos.y,{camp:0,rarityGrade:1});t.hp=t.maxHp=1e9;t.stun=1e6;t.aggroAt=t.wanderAt=state.time+1e6;state.camps[0].remaining++;globalThis.qaTarget=t.id;rebuildGrid();spatialBoundary();`);
  same(`${rate} armed`);
  for(let i=0;i<70;i++){
   tick(`${rate} all families ${i}`);
   if(i===1||i===25)restore(`${rate} scheduled/channel restore ${i}`);
   if(i===2){
    both(`const a=abilityState(),card=[...WeaponCardRegistry.values()].find(c=>c.weapon==='pod'&&c.property==='cadence');if(!card)throw Error('cadence card');weaponApplyCard(a,card.id);`);
    same(`${rate} midcooldown cadence modifier`);
   }
  }
  // Retired paid haste cannot rescale active cooldowns or mutate the preview.
  both(`economyAward(growthState(),'silver_haste',1);statPreviewGrowth(GROWTH_CARDS.find(c=>c.id==='silver_haste'));`);same(`${rate} retired paid haste and detached preview`);
  const bytes=Buffer.from(after.run('bloomAdapter.save()'));
  after.run(`for(let i=0;i<20;i++)for(const id of Object.keys(CONFIG.weaponCards.weapons))weaponCooldownSeconds(state.mother,id)`);
  assert.deepEqual(Buffer.from(after.run('bloomAdapter.save()')),bytes,'cooldown display query is pure');
  assert(after.run(`!Object.hasOwn(state.mother,'auxCooldowns')&&Object.values(state.mother.auxScheduleMs).every(t=>!Object.hasOwn(t,'displaySeconds')&&Number.isFinite(t.sampledAtMs))&&state.units.filter(u=>u.rivalLeader).every(u=>!Object.hasOwn(u.rival,'aux'))`));
  for(const mutation of ["m.auxCooldowns={pod:0}","m.auxScheduleMs.pod.displaySeconds=0","m.auxScheduleMs.pod.sampledAtMs=NaN","m.auxScheduleMs.lob=m.auxScheduleMs.pod"]){after.c.qaMutation=mutation;after.run(`globalThis.qaBad=BloomLiveCodec.decode(qaSaved);globalThis.m=qaBad.world.state.mother;eval(qaMutation);`);assert.equal(after.run('bloomValidate(qaBad)'),false,mutation)}
 }
 console.log(JSON.stringify({status:'PASS',checks,roundtrips,baseline:reference||null,scope:'all seven families, exact deadlines/effects/sprout display, active cadence upgrade, retired haste no-op/preview, pure query, rejection and snapshot continuation at 10/20/30 TPS'}));
}finally{both('bloomSession?.close()')}
