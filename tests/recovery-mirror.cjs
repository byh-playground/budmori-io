'use strict';
// Actual main-thread authority, stopped fixtures, then production SDK combat.
// Same IDs across recovery/load/reset must not retain stale presentation refs.
const fs=require('fs'),assert=require('assert');
const file=process.argv[2]||`${__dirname}/../index.html`,html=fs.readFileSync(file,'utf8');
const {session}=require('./main-harness.cjs');
(async()=>{const a=session(file,html,{tickRate:20});try{
 await a.init();await a.fixture(`for(const c of state.camps){c.enabled=false;c.spawned=true;c.regrowth=[]}
  globalThis.qaRival=spawn('swordsman','enemy',state.mother.x+250,state.mother.y,{camp:0,variant:'rival'});qaRival.stun=100000;
  rarityAcquire(-1,'swordsman',0,1);state.mother.hp=1;state.mother.stun=10;
  globalThis.qaKiller=spawn('swordsman','enemy',state.mother.x+20,state.mother.y,{camp:0,rarityGrade:5});qaKiller.aggroAt=0;qaKiller.cooldown=0;`);
 const id=await a.read('qaRival.id');let previous;
 for(let cycle=0;cycle<2;cycle++){
  a.control();await a.tick(cycle?80:20);assert(await a.read('state.dead'),'production combat must kill Moa');
  previous=a.mirror.state.units.find(u=>u.id===id);assert(previous.rival?.abilities);
  a.control({paused:true,modalKind:'defeat'});await a.command({type:'recover'});await a.tick();
  const current=a.mirror.state.units.find(u=>u.id===id);assert(current.rival?.abilities);assert.notStrictEqual(current,previous);assert(!await a.read('state.dead'));
  a.e.run('view.w=view.h=2000;view.x=state.mother.x;view.y=state.mother.y;BLOOM_HEADLESS=false;resetPresentation();presentation.active=true;presentation.frameNow=performance.now();presentation.frameSerial++;');
  assert(a.e.run(`Number.isFinite(presentationPose(idMap.get(${id})).x)&&presentationPose(idMap.get(${id})).rival.abilities.level>=0`));a.e.run('BLOOM_HEADLESS=true');
 }
 const oldState=a.mirror.state,oldUnit=a.mirror.state.units.find(u=>u.id===id),disk=await a.request('snapshot');
 assert(await a.request('load',{disk}));assert.notStrictEqual(a.mirror.state,oldState);assert.notStrictEqual(a.mirror.state.units.find(u=>u.id===id),oldUnit);assert(a.mirror.state.units.find(u=>u.id===id).rival.abilities);
 await a.request('reset');assert(!a.mirror.state.units.some(u=>u.id===id&&u.rivalLeader));
 await a.fixture(`const m=state.mother,u=spawn('swordsman','enemy',m.x+45,m.y+55,{camp:0,rarityGrade:1});u.stun=100000;globalThis.qaReusedId=u.id;`);
 assert.equal(await a.read('qaReusedId'),id);assert(!a.mirror.state.units.find(u=>u.id===id).rival);
 console.log('PASS actual 20TPS combat/death/recovery twice, readonly visual descriptors, save/load identity and same-ID new-game lifecycle');
 }finally{await a.close()}})().catch(e=>{console.error(e.stack);process.exitCode=1});
