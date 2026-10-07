'use strict';
// Validates the browser campaign's declared slow-flight fixture against actual
// physics in all five spawn regions. No collision or lifetime behavior is mocked.
const assert=require('node:assert/strict'),path=require('node:path'),{engine}=require('./native-engine.cjs');
const ids=new Map();for(let i=0;ids.size<5;i++){const id='fixture-'+i;let h=2166136261;for(const c of id)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;if(!ids.has(h%5))ids.set(h%5,id)}
const regions=new Set();
for(const id of ids.values()){
 const e=engine(path.join(__dirname,'../index.html'));e.c.qaId=id;
 e.run(`CONFIG.session.mode='online';bloomApplyTickRate(10);bloomInitialize(12345);WorldMembership.apply({epoch:0,tick:0,players:[qaId]});BloomSimulation.sessionConfig={mode:'online'};
 const player=WorldPlayers.all()[0],m=player.leader;player.auto.enabled=false;Object.assign(WorldPlayers.data(player).campaign.abilities,{level:3,xp:abilityThreshold(3),chosen:2,ranks:{pod:1,lob:1},mods:{},draft:null});moaSyncLevelHP(m);m.hp=m.maxHp*.6;rarityAcquire(player.accountOwner,'archer',1,2,m.x,m.y);
 for(const c of state.camps){c.enabled=false;c.spawned=true;c.regrowth=[]}const point=ThemedTerrain.safePoint(m.x+160,m.y,20),target=spawn('shellbug','enemy',point.x,point.y,{camp:0,rarityGrade:1});target.hp=target.maxHp=1e7;target.stun=1e6;target.aggroAt=target.wanderAt=state.time+1e6;state.camps[0].remaining++;damage(m,target,17,'ranged');
 const flight=launchAbilityShot(target,11,{owner:m,start:{x:m.x-200,y:m.y-200,z:spatialHeight(m)+160},speed:1,range:1800,homing:true});globalThis.flightId=flight.shotId;rebuildGrid();spatialBoundary();globalThis.frameInputs=[{playerId:qaId,input:bloomEncodeInput({x:1,y:0,manual:true}),commands:[]}];`);
 regions.add(e.run('WorldPlayers.all()[0].startRegion'));
 for(let i=0;i<150;i++){if(i===30)e.run('frameInputs[0].input=bloomEncodeInput({x:0,y:0,manual:true})');e.run('bloomAdapter.step({tick:bloomTick,tickRate:10,inputs:frameInputs})')}
 assert(e.run('projectiles.some(p=>p.shotId===flightId)'),id+' physical flight survives normal movement/combat');
 assert(e.run('bloomAdapter.validateSnapshot(bloomAdapter.save(),{tick:bloomTick})'));
}
assert.equal(regions.size,5);console.log('PASS browser slow-flight fixture survives actual terrain physics in all five start regions');
