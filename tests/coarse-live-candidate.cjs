'use strict';
// Experimental full-tick candidate generator. Does not modify the shipped HTML.
const {createCoarsePairEnumerator}=require('./coarse-pair-enumerator.cjs');
function candidate(source,{mode='coarse',cell=64,limit=null,exact=true,instrument=true}={}){
 const start=source.indexOf(' {let nx=0,ny=0,n=0;const air=d.layer'),end=source.indexOf('\n\n u.x=clamp',start);
 if(start<0||end<0)throw Error('Missing separation block');
 source=source.slice(0,start)+' coarseActive.add(u);'+source.slice(end);
 source=source.replace(' constrainWorld(u);\n integrateMoaImpulse(u,dt);',' if(!coarseActive.has(u)||u.x!==u.worldX||u.y!==u.worldY)constrainWorld(u);\n integrateMoaImpulse(u,dt);');
 source=source.replace('const indexes=new Map();for(const u of state.units)', 'coarseActive.clear();const indexes=new Map();for(const u of state.units)').replace('  this.projectiles(dt);','  solveCoarseSeparation(dt);this.projectiles(dt);');
 // Skip the unused fine-grid rebuild at the shared tick's pre-movement boundary.
 // All public rebuildGrid() callers still receive both indexes; the post-solver
 // refresh rebuilds the leader-contact index from corrected positions.
 source=source.replace('function rebuildGrid(){','function rebuildGrid(withCollision=true){').replace('maxTargetRadius=0;maxCollisionGround=maxCollisionAir=0;','maxTargetRadius=0;if(withCollision)maxCollisionGround=maxCollisionAir=0;')
  .replace('else collisionGrid.forEach(list=>{list.length=0});const cols=', 'else if(withCollision)collisionGrid.forEach(list=>{list.length=0});const cols=')
  .replace('const body=moaBodyRadius(u);if(unitDef(u.type)', 'if(withCollision){const body=moaBodyRadius(u);if(unitDef(u.type)')
  .replace('cl.push(u);idMap.set(u.id,u);','cl.push(u);}idMap.set(u.id,u);')
  .replace('WorldBoss.before(players,inputs,dt);rebuildGrid();','WorldBoss.before(players,inputs,dt);rebuildGrid(false);');
 source=source.replace('const travel=Math.hypot(u.x-oldX,u.y-oldY);u.moveSpeed=travel/dt;u.movePhase=(u.movePhase||0)', 'const travel=Math.hypot(u.x-oldX,u.y-oldY);let record=coarseMovement.get(u);if(!record){record={x:0,y:0,travel:0};coarseMovement.set(u,record)}record.x=u.x-oldX;record.y=u.y-oldY;record.travel=travel;u.moveSpeed=travel/dt;u.movePhase=(u.movePhase||0)');
 const code=`\nconst coarseMovement=new WeakMap(),coarseActive=new Set(),coarseEnumerator=(${createCoarsePairEnumerator.toString()})({mode:${JSON.stringify(mode)},exact:${exact},instrument:${instrument}});
 const coarseDX=[],coarseDY=[],coarseCounts=[],coarseFlags=[];
 function solveCoarseSeparation(dt){
  const started=performance.now(),result=coarseEnumerator.enumerate(state.units,moaBodyRadius,u=>unitDef(u.type).layer==='AIR'?1:0,${cell}),{pairs,bodies,stride,radii}=result,n=bodies.length;
  coarseDX.length=coarseDY.length=coarseCounts.length=coarseFlags.length=n;for(let i=0;i<n;i++)coarseFlags[i]=coarseActive.has(bodies[i]);coarseDX.fill(0);coarseDY.fill(0);coarseCounts.fill(0);
  let contacts=0;const pairStarted=performance.now();
  for(const packed of pairs){const a=Math.floor(packed/stride),b=packed-a*stride,u=bodies[a],v=bodies[b],ua=coarseFlags[a]&&coarseCounts[a]<${limit??'CONFIG.motion.separationMaxNeighbors'},va=coarseFlags[b]&&coarseCounts[b]<${limit??'CONFIG.motion.separationMaxNeighbors'};if(!ua&&!va)continue;
   let dx=u.x-v.x,dy=u.y-v.y,len2=dx*dx+dy*dy,limit=radii[a]+radii[b];if(len2>=limit*limit)continue;let len=Math.sqrt(len2);if(!len){const angle=(Math.min(u.id,v.id)+Math.max(u.id,v.id)*CONFIG.sim.goldenAngle)*CONFIG.sim.goldenAngle,sign=u.id<v.id?1:-1;dx=Math.cos(angle)*sign;dy=Math.sin(angle)*sign;len=1}
   const correction=Math.min(CONFIG.motion.collisionMaxStep,(limit-len)*CONFIG.motion.collisionResolveRate*dt),x=dx/len*correction,y=dy/len*correction;
   if(ua){coarseDX[a]+=x;coarseDY[a]+=y;coarseCounts[a]++}if(va){coarseDX[b]-=x;coarseDY[b]-=y;coarseCounts[b]++}contacts++;
  }
  const applyStarted=performance.now();for(let i=0;i<n;i++){const u=bodies[i];if(!coarseFlags[i])continue;const oldX=u.x,oldY=u.y;u.x+=coarseDX[i];u.y+=coarseDY[i];constrainWorld(u);const record=coarseMovement.get(u);if(record){const travel=Math.hypot(record.x+(u.x-oldX),record.y+(u.y-oldY)),delta=travel-record.travel;u.moveSpeed=travel/dt;u.movePhase=(u.movePhase||0)+delta/CONFIG.combat.walkStride*Math.PI*2}}
  globalThis.coarseStats={...result.metrics,pairSolverMs:applyStarted-pairStarted,applyMs:performance.now()-applyStarted,totalMs:performance.now()-started,pairs:pairs.length,contacts,active:coarseActive.size};
 }\n`;
 source=source.replaceAll('budmori-shared-ms-v3','budmori-pair-separation-v1').replaceAll('budmori-shared-v3','budmori-pair-separation-v1').replaceAll('budmori-public-active-v1','budmori-pair-active-v1').replaceAll('budmori-public-resume-v1','budmori-pair-resume-v1').replaceAll('budmori-public-v1','budmori-pair-research-v1');
 return source.replace('function nearLocal(x,y,r,team,fn){',code+'function nearLocal(x,y,r,team,fn){');
}
module.exports={candidate};
