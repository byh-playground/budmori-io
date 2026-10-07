'use strict';
// Actual snapshot validators in one stopped shared world. Native CPU checks only.
const assert=require('node:assert/strict');
const {engine}=require('./native-engine.cjs'),{candidate}=require('./shared-harness.cjs');
const source=candidate(),e=engine(source.file,source.html);
// Historical validators use incompatible product schemas and duplicate lock fields.
// The current contract is checked against explicit expected acceptance, not that oracle.
e.run(`CONFIG.session.mode='online';BloomSimulation.initialize(12345);WorldMembership.apply({epoch:0,tick:0,players:['owner','peer']});for(const p of WorldPlayers.all()){rarityAcquire(p.accountOwner,'swordsman',2,4);for(const r of (globalThis.rarityGetAccount||rarityAccount)(p.accountOwner).active)rarityLock(r.uid,true);rarityRecall(p.accountOwner)}rebuildGrid();spatialBoundary();globalThis.qaBefore=BloomLiveCodec.encode(bloomCapture());`);
function check(mutation='',expected=true){
 e.c.qaMutation=mutation;
 const output=e.run(`(()=>{const c=BloomLiveCodec.decode(qaBefore),s=c.world.state,w=c.world,p=s.participants.peer,a=s.rarityAccounts[p.accountOwner],u=s.units.find(x=>x.playerId==='peer'),r=s.residentBoss;${mutation};let sync;try{sync=bloomValidate(c)}catch{sync=false}const job=bloomValidateJob(c),before=performance.now();let count=0,maxMs=0;while(!job.done){const start=performance.now(),step=job.pulse({budgetMs:0});if(step.done!==job.done||step.result!==job.result)throw Error('job status');maxMs=Math.max(maxMs,performance.now()-start);if(++count>1000000)throw Error('stalled validator')}return {sync,job:job.result,count,maxMs,totalMs:performance.now()-before}})()`);
 assert.equal(output.sync,expected,mutation||'valid source');assert.equal(output.job,output.sync,'sync/job parity: '+mutation);
 return output;
}
const valid=check();assert(valid.count>1,'validation actually resumes');
const invalid=[
 "c.schema='unknown'","c.tick=-1","c.seed=4294967296","c.tickRate=999","w.state=null","s.participants=null",
 "p.accountOwner=-1","p.playerId='owner'","p.navigation.world=s","p.auto=s.participants.owner.auto","p.data.campaign=s.campaign",
 "p.data.stats.attacks=-1","p.navigation.waypoints=[{x:1,y:2}]","p.hunt={next:0,candidates:[1,1],claims:{},owners:{}}",
 "p.leader.target=s.nextPlayerEntity-1","u.playerId='owner'","u.id=-99","u.hp=-1","u.maxHp+=1","u.rarityGrade=6",
 "a.active[0].uid=0","a.active[1].uid=a.active[0].uid","a.active[0].entityId=a.active[1].entityId","a.active[0].locked=0","u.rarityLocked=false",
 "a.active[0].body=u","a.active[0].respawnAt=1","a.cursor=[0]","a.level=0","a.fusionSerial=0",
 "a.lastFusion={}","a.reserve.invalid=[]","a.reserve.swordsman=[{}]","s.rarityNextUID=-1",
 "s.rarityAutoFusion={schema:1,cursor:0,lastTime:s.time+1}","s.rarityAutoFusion={schema:1,cursor:0,lastTime:0,extra:1}",
 "s.rarityRivals=null","s.campaign.openWorld.schema=-1","s.campaign.parcels[0]=false","s.campaign.huntView.halfWidth=-1",
 "u.visibleHuntReturn=1","s.wildRing={schema:2,elapsedMs:0,nextQuotaMs:0,cursor:0,culled:0,spawned:0,quotas:[-1]}",
 "r.status='unknown'","r.combatants=[1,1]","r.rewardLedger={bad:{}}","r.habitat.radius=0",
 "w.projectiles.push({residentSeed:true})","w.pointNav.waypoints=[{x:1,y:2}]","w.hunt.claims=[[1,0],[1,1]]",
 "w.grids.idMap[0][0]=-999","w.grids.gridState={}","w.grids.gridUnits=[]","w.grids.grid=[[0,[u,u]]]",
 "c.spatial.push({object:u,unit:2})","c.spatial.push({object:u,anchor:1<<25})","u.groundZ+=1","u.testZ='invalid'"
];
for(const mutation of invalid)check(mutation,false);
// These legal aliases, sparse arrays and extra scalar data were already accepted.
for(const mutation of ["a.active[0].locked=false", "p.navigation.extra={cycle:null};p.navigation.extra.cycle=p.navigation.extra", "p.data.stats.extra=0", "p.navigation.goal={x:1,y:2};p.navigation.waypoints=new Array(1);p.navigation.index=0", "w.pointNav.goal={x:1,y:2};w.pointNav.waypoints=new Array(1);w.pointNav.index=0"])check(mutation,true);
const cancel=e.run(`(()=>{const c=BloomLiveCodec.decode(qaBefore),job=bloomValidateJob(c);job.pulse({budgetMs:0});const pending=!job.done;job.cancel();const status=job.pulse();return {pending,done:job.done,cancelled:job.cancelled,result:job.result,status:status.done,unchanged:BloomOwnedSDK.hashBytes(BloomLiveCodec.encode(c))===BloomOwnedSDK.hashBytes(qaBefore)}})()`);
assert(cancel.pending&&cancel.done&&cancel.cancelled&&cancel.status&&cancel.unchanged);assert.equal(cancel.result,undefined);
assert.throws(()=>e.run('bloomValidateJob(bloomCapture()).pulse({budgetMs:-1})'),/budget/);
assert(e.run(`(()=>{const good=bloomValidateJob(BloomLiveCodec.decode(qaBefore)),bad=bloomValidateJob(null);while(!good.done||!bad.done){good.pulse({budgetMs:0});bad.pulse({budgetMs:0})}return good.result===true&&bad.result===false})()`),'interleaved jobs own traversal state');
assert.deepEqual(Buffer.from(e.run('BloomLiveCodec.encode(bloomCapture())')),Buffer.from(e.c.qaBefore),'validation/cancellation never change authority');
console.log(JSON.stringify({pass:true,sourceSHA256:source.sha256,invalidCases:invalid.length,validJob:valid,checks:['shared sync/job checks','rarity wrapper chain','ownership/private graph','grid/spatial references','resident boss and shot checks','supported sparse data','cancellation and independent jobs','no authority mutation']}));
