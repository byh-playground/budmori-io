'use strict';
function setup(e,count=1000,clustered=false){
 e.run(`CONFIG.session.mode='online';bloomApplyTickRate(10);BloomSimulation.initialize(12345);WorldMembership.apply({epoch:0,tick:0,players:['a','b','c','d','e']});BloomSimulation.sessionConfig={mode:'online',persistence:'none'};
 for(const p of WorldPlayers.all()){const d=WorldPlayers.data(p);let level=1;while(rarityCapacityAtLevel(level)<${count})level++;d.campaign.abilities.level=level;d.campaign.abilities.xp=abilityThreshold(level);moaSyncLevelHP(p.leader);p.leader.hp=p.leader.maxHp;for(const [i,type]of ['swordsman','shellbug','dandelion','archer'].entries())rarityAcquire(p.accountOwner,type,2,Math.floor(${count}/4)+(i<${count}%4?1:0));for(const r of rarityAccount(p.accountOwner).active)rarityLock(r.uid,true);rarityRecall(p.accountOwner)}
 ${clustered?`{const anchor={x:state.mother.x,y:state.mother.y};for(const [i,p]of WorldPlayers.all().entries()){const dx=anchor.x+(i%3)*40-p.leader.x,dy=anchor.y+Math.floor(i/3)*40-p.leader.y;p.leader.x+=dx;p.leader.y+=dy;spatialUnit(p.leader,true);for(const u of state.units)if(u.playerId===p.playerId){u.x+=dx;u.y+=dy;u.hx+=dx;u.hy+=dy;spatialUnit(u,true)}}}`:''}
 for(const c of state.camps){c.enabled=false;c.spawned=true;c.regrowth=[]}rebuildGrid();spatialBoundary();
 globalThis.frames=WorldPlayers.all().map(p=>({playerId:p.playerId,input:bloomEncodeInput({x:.25,y:.1,manual:true}),commands:[]}));`);
 return e.json(`(()=>{const radii=state.units.filter(u=>u.hp>0).map(moaBodyRadius).sort((a,b)=>a-b),occupancy=[...collisionGrid.values()].map(a=>a.length).filter(Boolean).sort((a,b)=>a-b);return{units:radii.length,radii:{min:radii[0],median:radii[Math.floor(radii.length/2)],max:radii.at(-1)},cell:CONFIG.sim.collisionCell,occupancy:{cells:occupancy.length,p50:occupancy[Math.floor(occupancy.length/2)],max:occupancy.at(-1)}}})()`);
}
module.exports={setup};
