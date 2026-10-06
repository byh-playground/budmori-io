'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const root=require('node:path').resolve(__dirname,'..');
const {engine}=require(root+'/tests/native-engine.cjs');
const e=engine(root+'/index.html');
e.run(`CONFIG.session.mode='online';BloomSimulation.initialize(12345);WorldMembership.apply({epoch:0,tick:0,players:['owner','peer','third']});bloomInTick=true;bloomCurrentEffects=[];
 const peer=WorldPlayers.get('peer'),third=WorldPlayers.get('third');
 rarityAcquire(peer.accountOwner,'swordsman',0,1);`);
assert(e.run(`bloomCurrentEffects.some(e=>e.type==='soundCue'&&e.playerId==='peer'&&e.args[0].kind==='recruit'&&e.args[0].id===peer.leader.id)`),'nonprimary recruit cue');
e.run(`bloomCurrentEffects=[];soundCue('roll',peer.leader);soundCue('roll',third.leader);`);
assert.deepEqual(e.json(`bloomCurrentEffects.filter(e=>e.type==='soundCue').map(e=>[e.playerId,e.args[0].kind,e.args[0].id])`),[['peer','roll',-2],['third','roll',-3]]);
function cuePass(local) {
 e.c.qaLocal=local;
 return e.json(`(()=>{WorldPlayers.setLocalPlayerId(qaLocal);bloomCurrentEffects=[];bloomEventSequence=0;
  for(let i=0;i<200;i++)soundCue('launch',{id:1000+i,type:'archer',team:'friendly',playerId:'owner',x:state.mother.x+i,y:state.mother.y,z:0},{family:'seed'});
  soundCue('launch',peer.leader,{family:'seed'});soundCue('launch',third.leader,{family:'seed'});
  return bloomCurrentEffects})()`);
}
const a=cuePass('owner'),b=cuePass('peer');assert.deepEqual(a,b,'local view must not change canonical event selection');
assert(a.some(e=>e.playerId==='peer'&&e.args[0].id===-2),'peer own launch preserved');
assert(a.some(e=>e.playerId==='third'&&e.args[0].id===-3),'third own launch preserved');
assert(a.length<=3*3,'bounded by active participants times three lanes per kind/family');
// A local confirmation filters the already-targeted events, with no real audio.
e.run(`bloomInTick=false;BLOOM_HEADLESS=false;WorldPlayers.setLocalPlayerId('peer');globalThis.qaAudio=[];CombatAudio.route=e=>qaAudio.push(e);for(const e of bloomCurrentEffects)bloomDeliverPresentationEvent(e);`);
assert(e.run(`qaAudio.every(e=>e.playerId==='peer')`),'only local cue set delivered');
assert(e.run(`qaAudio.some(e=>e.args[0].id===-2)`),'peer hears own selected launch');
console.log('PASS nonprimary recruit/roll/launch, bounded cue selection, view-independent events, recipient-local delivery');
