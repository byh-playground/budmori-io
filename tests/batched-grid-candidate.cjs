'use strict';
const {candidate}=require('./coarse-live-candidate.cjs');
function batchedGridCandidate(source,cell=32){
 let html=candidate(source,{mode:'grid',cell});
 const start=html.indexOf(' function solveCoarseSeparation(dt){'),end=html.indexOf('\nfunction nearLocal(',start);
 if(start<0||end<0)throw Error('Candidate source boundary');
 const replacement=` function solveCoarseSeparation(dt){
  const started=performance.now();refreshMoaContactGrid();const built=performance.now(),bodies=state.units,n=bodies.length;
  coarseDX.length=coarseDY.length=coarseCounts.length=n;coarseDX.fill(0);coarseDY.fill(0);coarseCounts.fill(0);let contacts=0;
  for(let i=0;i<n;i++){const u=bodies[i];if(u.hp<=0||!coarseActive.has(u))continue;const air=unitDef(u.type).layer==='AIR',ur=moaBodyRadius(u);let count=0,nx=0,ny=0;
   nearLocal(u.x,u.y,ur+(air?maxCollisionAir:maxCollisionGround),null,v=>{if(count>=CONFIG.motion.separationMaxNeighbors)return false;if(v===u||(unitDef(v.type).layer==='AIR')!==air)return;let dx=u.x-v.x,dy=u.y-v.y,len2=dx*dx+dy*dy,limit=ur+moaBodyRadius(v);if(len2>=limit*limit)return;let len=Math.sqrt(len2);if(!len){const a=(Math.min(u.id,v.id)+Math.max(u.id,v.id)*CONFIG.sim.goldenAngle)*CONFIG.sim.goldenAngle,sign=u.id<v.id?1:-1;dx=Math.cos(a)*sign;dy=Math.sin(a)*sign;len=1}const correction=Math.min(CONFIG.motion.collisionMaxStep,(limit-len)*CONFIG.motion.collisionResolveRate*dt);nx+=dx/len*correction;ny+=dy/len*correction;count++;contacts++});coarseDX[i]=nx;coarseDY[i]=ny;coarseCounts[i]=count;
  }
  const applied=performance.now();for(let i=0;i<n;i++){const u=bodies[i];if(u.hp<=0||!coarseActive.has(u))continue;const oldX=u.x,oldY=u.y;u.x+=coarseDX[i];u.y+=coarseDY[i];constrainWorld(u);const record=coarseMovement.get(u);if(record){const travel=Math.hypot(record.x+(u.x-oldX),record.y+(u.y-oldY)),delta=travel-record.travel;u.moveSpeed=travel/dt;u.movePhase=(u.movePhase||0)+delta/CONFIG.combat.walkStride*Math.PI*2}}
  globalThis.coarseStats={indexMs:built-started,pairSolverMs:applied-built,applyMs:performance.now()-applied,totalMs:performance.now()-started,contacts,active:coarseActive.size};
 }\n`;
 return (html.slice(0,start)+replacement+html.slice(end)).replaceAll('budmori-pair-separation-v1','budmori-batched-grid-'+cell+'-v1').replaceAll('budmori-pair-research-v1','budmori-batched-'+cell+'-research-v1').replace('collisionCell:32,','collisionCell:'+cell+',');
}
module.exports={batchedGridCandidate};
