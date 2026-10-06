'use strict';
// Complement to the real-browser run: actual game/SDK in native V8 with mock
// DOM and no rendering. These numbers are not browser frame or device FPS data.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {engine}=require('./native-engine.cjs');
const percentile=(a,p)=>{const s=[...a].sort((a,b)=>a-b);return s[Math.ceil(s.length*p)-1]};
const summary=a=>({samples:a.length,p50:percentile(a,.5),p95:percentile(a,.95),p99:percentile(a,.99)});
const file=path.resolve(process.argv[2]||path.join(__dirname,'../index.html')),e=engine(file);
const scenario=process.argv[3]||'dense';assert(['sparse','dense','maximum'].includes(scenario));
const requested=scenario==='sparse'?10:scenario==='dense'?155:e.run('CONFIG.rarity.capacityMax'),tps=scenario==='sparse'?10:scenario==='dense'?20:30;
e.fixture(`BloomSimulation.initialize(12345);let level=1;while(rarityCapacityAtLevel(level)<${requested})level++;abilityState().level=level;abilityState().xp=abilityThreshold(level);moaSyncLevelHP(state.mother);state.mother.hp=state.mother.maxHp;const types=['swordsman','shellbug','dandelion','archer'];for(let i=0;i<types.length;i++)rarityAcquire(-1,types[i],2,Math.floor(${requested}/4)+(i<${requested}%4?1:0));for(const r of rarityAccount(-1).active)rarityLock(r.uid,true);rarityRecall(-1);bloomApplyTickRate(${tps});for(const c of state.camps){c.enabled=false;c.spawned=true;c.regrowth=[]}`);
const initial=e.json('({seed:bloomSeed,tps:CONFIG.sim.tickRate,units:state.units.length,friendly:state.units.filter(u=>u.team==="friendly"&&u.hp>0).length,tick:bloomTick})');assert.equal(initial.friendly,requested);assert.equal(initial.tps,tps);
const tick=[],snapshot=[];
for(let i=0;i<120;i++){const start=performance.now();e.tick();const after=performance.now();e.run('BloomSimulation.adapter.save()');const end=performance.now();if(i>=20){tick.push(after-start);snapshot.push(end-after)}}
const result={kind:'Actual game + SDK, native V8, mock DOM, no renderer; NOT browser or phone performance',sourceSHA256:e.sha256,scenario,initial,sessionAdvanceMs:summary(tick),snapshotReadMs:summary(snapshot),final:e.json('({tick:bloomTick,time:state.time,units:state.units.length,hash:BloomOwnedSDK.hashBytes(BloomSimulation.adapter.save())})')};
e.run('BloomSimulation.session.close()');console.log(JSON.stringify(result,null,2));
