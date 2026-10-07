'use strict';
// Actual world/codec/SDK, stopped-boundary death fixture. No browser claim.
const assert=require('node:assert/strict'),path=require('node:path'),{engine}=require('./native-engine.cjs');
const file=path.resolve(process.argv[2]||path.join(__dirname,'../index.html'));
const e=engine(file);
e.run(`CONFIG.session.mode='online';BloomSimulation.initialize(12345);WorldMembership.apply({epoch:0,tick:0,players:['a','b','c','d','e']});bloomInTick=true;bloomCurrentEffects=[];
for(const c of state.camps){c.enabled=false;c.spawned=true;c.regrowth=[]}for(const u of state.units){u.stun=1e6;u.aggroAt=u.wanderAt=state.time+1e6}
globalThis.qaInputs=new Map(WorldPlayers.all().map(p=>[p.playerId,{x:0,y:0,manual:true}]));globalThis.qaRecoveries=[];PlayerLifecycle.onRecovered(p=>qaRecoveries.push(p.playerId));
PlayerLifecycle.defeat(WorldPlayers.get('a'));`);
const advance=n=>e.run(`for(let i=0;i<${n};i++)WorldSimulation.step(CONFIG.sim.fixedStep,qaInputs);spatialBoundary();bloomSnapshotStore.invalidate()`);
advance(10);e.run(`PlayerLifecycle.defeat(WorldPlayers.get('b'));`);advance(5);
assert.equal(e.run("Math.round(PlayerLifecycle.remainingMs(WorldPlayers.get('a')))"),1500);
assert.equal(e.run("Math.round(PlayerLifecycle.remainingMs(WorldPlayers.get('b')))"),2500);
const mid=Buffer.from(e.run('bloomAdapter.save()'));assert(e.run('bloomValidate(bloomCapture())'));
advance(14);assert(e.run("WorldPlayers.data(WorldPlayers.get('a')).dead"));
advance(1);assert.deepEqual(e.json('qaRecoveries'),['a']);assert(e.run("WorldPlayers.data(WorldPlayers.get('b')).dead"));
advance(10);assert.deepEqual(e.json('qaRecoveries'),['a','b']);
assert(e.run("['c','d','e'].every(id=>!WorldPlayers.data(WorldPlayers.get(id)).dead&&WorldPlayers.data(WorldPlayers.get(id)).deaths===0)"));
const end=Buffer.from(e.run('bloomAdapter.save()'));e.c.qaMid=Uint8Array.from(mid);e.run('bloomAdapter.load(qaMid);qaRecoveries=[]');advance(25);
assert.deepEqual(Buffer.from(e.run('bloomAdapter.save()')),end,'mid-timer restore has identical future world and RNG');assert.deepEqual(e.json('qaRecoveries'),['a','b']);advance(5);assert.deepEqual(e.json('qaRecoveries'),['a','b'],'no duplicate revival');
assert.equal(e.run('BLOOM_TIME.troopReviveMs'),5000);
console.log('PASS five-player independent 3000ms automatic revival, exact mid-timer restore, no duplicate recovery, unchanged troop timer');
