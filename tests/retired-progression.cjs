'use strict';
// Retired commands are rejected at the native contract, not retained as no-ops.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {engine}=require('./native-engine.cjs');
const {sameSemantic}=require('./native-semantic.cjs');
const target=path.resolve(process.argv[2]||path.join(__dirname,'../index.html'));
const reference=process.argv[3]||process.env.BLOOM_PROGRESSION_BASELINE;
const html=fs.readFileSync(target,'utf8');
for(const name of ['growthEligible','statPickWeighted','growthChoosing','permanentBusy','permanentDetach','chooseGrowth','ensureGrowthDraft','compressPermanent','unlockParcel'])assert(!new RegExp(`\\b${name}\\b`).test(html),`${name} has no retained binding or consumer`);
const engines=[engine(reference||target),engine(target)],after=engines[1];let checks=0;
const commands=[{version:1,type:'growthDraft'},{version:1,type:'growthChoice',cardId:'gold_vital',offer:0},{version:1,type:'gate',gate:0},{version:1,type:'compress',unitType:'swordsman',rank:0}];
function both(code){for(const e of engines)e.run(code)}
function same(label){sameSemantic(engines,label);checks++}
try{
 for(const rate of [10,20,30]){
  both(`bloomSession?.close();CONFIG.session.mode='online';bloomApplyTickRate(${rate});BloomSimulation.initialize(12345);WorldMembership.apply({epoch:0,tick:0,players:['a','b']});BloomSimulation.createSession({players:['a','b'],localPlayerId:'a',ownerId:'a'});playing=true;paused=false;modalKind='';`);
  same(`initialize ${rate}`);
  const before=Buffer.from(after.run('bloomAdapter.save()'));
  for(const command of commands){after.c.qaRetiredCommand=command;assert.throws(()=>after.run('BloomSimulation.encodeCommand(qaRetiredCommand)'),/Command kind/)}
  assert.deepEqual(Buffer.from(after.run('bloomAdapter.save()')),before,'rejection is read-only');
  assert(after.run("['chooseGrowth','ensureGrowthDraft','compressPermanent','unlockParcel'].every(name=>typeof globalThis[name]==='undefined'&&!Object.hasOwn(bloomCore,name))"));
  for(let i=0;i<8;i++){both(`bloomAdapter.step({tick:bloomTick,tickRate:CONFIG.sim.tickRate,inputs:['a','b'].map((playerId,index)=>({playerId,input:bloomEncodeInput({x:index?.2:.4,y:index?.4:.2,manual:true}),commands:[]}))})`);same(`${rate} active tick ${i}`)}
  both('globalThis.qaSaved=bloomAdapter.save();bloomAdapter.load(qaSaved)');same(`${rate} restore`);
  both("WorldMembership.apply({epoch:1,tick:bloomTick,players:['a','b','c']})");same(`${rate} membership`);
 }
 console.log(JSON.stringify({status:'PASS',checks,rejectedCommands:commands.length*3,baseline:reference||null,scope:'Removed bindings/listeners/captures, rejected commands, live semantic continuation, restore and admission at 10/20/30 TPS'}));
}finally{both('bloomSession?.close()')}
