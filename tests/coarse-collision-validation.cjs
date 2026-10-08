'use strict';
// Focused actual-HTML/native-V8 regressions. No browser, network, FPS, or
// historical-position parity claim. Synthetic probes are explicitly isolated
// from the valid five-player canonical-continuation chapter.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {engine}=require('./native-engine.cjs'),{setup}=require('./coarse-fixture.cjs');
const args=process.argv.slice(2),file=path.resolve(args.find(a=>!a.startsWith('--'))||path.join(__dirname,'../index.html'));
const inputHTML=fs.readFileSync(file,'utf8');let html=inputHTML;
if(args.includes('--experimental'))html=require('./coarse-live-candidate.cjs').candidate(html,{mode:'coarse',cell:64});
const report={kind:'Actual engine coarse collision correctness',file,experimental:args.includes('--experimental'),boundaries:0,effectComparisons:0,chapters:[]};
function realm(label){const e=engine(file+':'+label,html);assert(e.run("typeof solveCoarseSeparation==='function'&&typeof coarseActive!=='undefined'"),'Candidate must expose solveCoarseSeparation/coarseActive (or use --experimental with unmodified index.html)');return e;}
function same(es,label){const bytes=es.map(e=>Buffer.from(e.run('bloomAdapter.save()')));for(let i=1;i<es.length;i++){assert(bytes[0].equals(bytes[i]),'Canonical bytes: '+label);assert.equal(es[0].run('JSON.stringify(bloomCurrentEffects)'),es[i].run('JSON.stringify(bloomCurrentEffects)'),'Effects: '+label);report.effectComparisons++;}report.boundaries++;}
function tick(e,i){e.run(`bloomAdapter.step({tick:bloomTick,tickRate:CONFIG.sim.tickRate,inputs:WorldPlayers.all().map(p=>({playerId:p.playerId,input:bloomEncodeInput({x:${i%12<6?.3:-.2},y:${i%16<8?.1:-.1},manual:true}),commands:[]}))})`);}
function collisionChecks(){
const peers=[realm('warm-a'),realm('warm-b'),realm('cold-load')];
for(const e of peers)setup(e,12,true);
report.sourceSHA256=peers[0].sha256;
for(let i=0;i<10;i++){tick(peers[0],i);tick(peers[1],i);same(peers.slice(0,2),'initial warm '+i);}
const checkpoint=peers[0].run('bloomAdapter.save()');
for(const e of peers.slice(1)){e.c.qaBytes=checkpoint;e.run('bloomAdapter.load(qaBytes)');}
// No effect comparison at load: effect queues are intentionally cleared there.
assert(Buffer.from(peers[2].run('bloomAdapter.save()')).equals(Buffer.from(checkpoint)),'Cold restore canonical boundary');
for(let i=0;i<24;i++){for(const e of peers)tick(e,i+10);same(peers,'warm/reused-load/cold-load '+i);}
// Restore an earlier graph into a cache containing future records and order.
for(const e of peers){e.c.qaBytes=checkpoint;e.run('bloomAdapter.load(qaBytes)');}
for(let i=0;i<12;i++){for(const e of peers)tick(e,i+10);same(peers,'rollback replay '+i);}
for(const e of peers)assert(e.run('bloomAdapter.validateSnapshot(bloomAdapter.save(),{tick:bloomTick})'),'Final real-world snapshot validates');
report.chapters.push({name:'Five-player deterministic continuation',armyPerPlayer:12,warmTicks:10,continuationTicks:24,rollbackReplayTicks:12,cacheCases:['independently warmed','warmed then graph replacement','cold snapshot load','future cache then rollback']});

const e=realm('isolated-probes');e.run('BloomSimulation.initialize(12345)');
e.c.qaAssert=(condition,message)=>assert(condition,message);
e.run(`
 globalThis.qaOrigin=ThemedTerrain.safePoint(CONFIG.openWorld.initialSpawn.x+130,CONFIG.openWorld.initialSpawn.y+90,100);
 globalThis.qaReset=()=>{state.units=[];coarseActive.clear();qaPlace(state.mother,qaOrigin.x,qaOrigin.y-80,0);rebuildGrid()};
 globalThis.qaPlace=(u,x,y,air=spatialAir(u))=>{Object.assign(u,{x,y,worldX:x,worldY:y,hx:x,hy:y,homeX:x,homeY:y,groundZ:spatialGround(x,y),airHeight:air,z:spatialGround(x,y)+air});spatialUnits.delete(u);spatialUnit(u,true);return u};
 globalThis.qaBody=(type='swordsman',dx=0,dy=0,team='friendly')=>{const u=spawn(type,team,qaOrigin.x+dx,qaOrigin.y+dy,{rarityGrade:0,camp:team==='enemy'?0:-1});qaAssert(!!u,'probe spawn');Object.assign(u,{rarityGrade:0,cooldown:1000,query:1000,target:0,stun:0,undeploy:0,impactVX:0,impactVY:0,pendingMelee:null,order:'follow',returning:false,aggroAt:0,wanderAt:1000});return qaPlace(u,qaOrigin.x+dx,qaOrigin.y+dy)};
 globalThis.qaPose=u=>[u.x,u.y,u.z,u.groundZ,u.airHeight];
 globalThis.qaFinite=u=>['x','y','worldX','worldY','z','groundZ','airHeight'].every(k=>Number.isFinite(u[k]));
 globalThis.qaSpatial=u=>qaFinite(u)&&u.x===u.worldX&&u.y===u.worldY&&Math.abs(u.z-u.groundZ-u.airHeight)<1e-9&&Math.abs(u.groundZ-spatialGround(u.x,u.y))<1e-9;
`);
function probe(name,source){const result=e.json(`(()=>{${source}})()`);report.chapters.push({name,...result});return result;}
probe('Live body, layer and directed eligibility',`
 const rows=[];
 for(const scenario of ['both','one','neither','dead','mixed','air','airborneGround']){
  qaReset();const u=qaBody(scenario==='air'?'flowerbee':'swordsman'),v=qaBody(['mixed','air'].includes(scenario)?'flowerbee':'swordsman',2);
  if(scenario==='airborneGround')qaPlace(v,v.x,v.y,90);
  if(scenario==='dead')v.hp=0;
  if(scenario!=='neither')coarseActive.add(u);
  if(!['one','neither'].includes(scenario))coarseActive.add(v);
  const up=qaPose(u),vp=qaPose(v),rng=state.rng;solveCoarseSeparation(.1);
  const movedU=u.x!==up[0]||u.y!==up[1],movedV=v.x!==vp[0]||v.y!==vp[1],contact=!['neither','dead','mixed'].includes(scenario);
  qaAssert(movedU===contact,'active endpoint '+scenario);qaAssert(movedV===(contact&&scenario!=='one'),'other endpoint '+scenario);
  qaAssert(qaSpatial(u)&&qaSpatial(v),'spatial invariant '+scenario);qaAssert(u.airHeight===up[4]&&v.airHeight===vp[4],'air height retained '+scenario);qaAssert(state.rng===rng,'collision consumes no gameplay RNG');rows.push({scenario,movedU,movedV});
 }
 return{rows};
`);
probe('Stable-ID coincident contacts and unchanged neighbor8',`
 qaReset();const units=Array.from({length:12},()=>qaBody()),before=units.map(u=>({id:u.id,x:u.x,y:u.y,r:moaBodyRadius(u)})),expected=new Map(before.map(u=>[u.id,{x:0,y:0,n:0}]));
 for(let a=0;a<before.length;a++)for(let b=a+1;b<before.length;b++){
  const u=before[a],v=before[b],ua=expected.get(u.id),va=expected.get(v.id),angle=(u.id+v.id*CONFIG.sim.goldenAngle)*CONFIG.sim.goldenAngle,c=Math.min(CONFIG.motion.collisionMaxStep,(u.r+v.r-1)*CONFIG.motion.collisionResolveRate*.1),dx=Math.cos(angle)*c,dy=Math.sin(angle)*c;
  if(ua.n<CONFIG.motion.separationMaxNeighbors){ua.x+=dx;ua.y+=dy;ua.n++}if(va.n<CONFIG.motion.separationMaxNeighbors){va.x-=dx;va.y-=dy;va.n++}
 }
 for(const u of units)coarseActive.add(u);solveCoarseSeparation(.1);
 for(const u of units){const p=before.find(v=>v.id===u.id),v=expected.get(u.id);qaAssert(Math.abs(u.x-p.x-v.x)<1e-9&&Math.abs(u.y-p.y-v.y)<1e-9,'directed neighbor cap for '+u.id);qaAssert(qaSpatial(u),'coincident finite position')}
 const first=units.map(qaPose);for(let i=0;i<units.length;i++)qaPlace(units[i],before[i].x,before[i].y);state.units.reverse();solveCoarseSeparation(.1);
 qaAssert(JSON.stringify(first)===JSON.stringify(units.map(qaPose)),'input order and reused cache cannot change solver result');
 return{bodies:units.length,completePairs:units.length*(units.length-1)/2,neighbors:CONFIG.motion.separationMaxNeighbors,reversedInput:true};
`);
probe('Ordinary branch marker and special-controller exclusion',`
 const rows=[];
 for(const scenario of ['ordinary','stunned','stunExpires','undeploy','pendingMelee','specialWindup','specialExecute','specialRecovery']){
  qaReset();const u=qaBody(),v=qaBody('swordsman',25,0,'enemy');rebuildGrid();
  if(scenario==='stunned')u.stun=.5;if(scenario==='stunExpires')u.stun=.05;if(scenario==='undeploy')u.undeploy=.5;
  if(scenario==='pendingMelee'){u.target=v.id;u.pendingMelee={target:v.id,left:1,total:1};qaAssert(canTarget(u,v),'pending target fixture')}
  if(scenario.startsWith('special')){u.rarityGrade=2;u.target=v.id;u.attackController=createAttackController();qaAssert(beginAttackPattern(u,v,'coneSweep'),'start real special '+JSON.stringify({can:canTarget(u,v),special:rarityHasSpecial(u),start:patternCanStart(u,v,'coneSweep'),u:{id:u.id,hp:u.hp,order:u.order,returning:u.returning,grade:rarityGrade(u)},v:{hp:v.hp,id:v.id},d:dist(u,v)}));if(scenario==='specialRecovery')patternPhase(u.attackController,'recovery',1000);if(scenario==='specialExecute')patternPhase(u.attackController,'execute',1000)}
  updateUnit(u,.1,0);const active=coarseActive.has(u),expected=['ordinary','stunExpires','specialRecovery'].includes(scenario);
  qaAssert(active===expected,'branch eligibility '+scenario);rows.push({scenario,active});
 }
 return{rows};
`);
probe('Sleeping wild behavior remains an inactive obstacle',`
 qaReset();const room=regionAt(state.mother.x,state.mother.y),p=CONFIG.openWorld.regionSpawns.find(p=>regionAt(p.x,p.y)!==room&&dist(p,state.mother)>CONFIG.campaign.hunting.leashRadius),u=qaBody('swordsman',0,0,'enemy');qaAssert(!!p,'remote wild fixture');
 qaPlace(u,p.x,p.y);u.camp=state.camps.find(c=>c.ground===regionAt(p.x,p.y))?.id??-1;u.cooldown=123;u.combat=state.time;u.wanderAt=state.time+1000;rebuildGrid();updateUnit(u,.1,0);
 qaAssert(!coarseActive.has(u)&&u.cooldown===123,'sleeping wild must not tick status or join ordinary solver');return{statusUnchanged:true};
`);
probe('Later stun does not rewrite branch-time eligibility',`
 qaReset();const u=qaBody(),v=qaBody('swordsman',2);rebuildGrid();updateUnit(u,.1,0);qaAssert(coarseActive.has(u),'ordinary actor reached marker');
 qaPlace(u,qaOrigin.x,qaOrigin.y);qaPlace(v,qaOrigin.x+2,qaOrigin.y);u.stun=1;const old=u.x;solveCoarseSeparation(.1);
 qaAssert(u.x!==old,'later stun must not undo already-earned separation');return{lateStun:true};
`);
probe('Terrain-constrained correction and airborne support',`
 const kinds=['edge','root','water','cliff'],rows=[];
 for(const kind of kinds){
  qaReset();const u=qaBody(),v=qaBody(),r=moaBodyRadius(u),shapes=kind==='edge'?[{kind,points:ThemedTerrain.outer}]:ThemedTerrain.shapes.filter(s=>s.kind===kind);let found=null;
  for(const s of shapes){for(let i=0;i<s.points.length;i++){
   const a=s.points[i],b=s.points[(i+1)%s.points.length],mx=(a.x+b.x)/2,my=(a.y+b.y)/2,p=ThemedTerrain.safePoint(mx,my,r+.2),d=Math.hypot(p.x-mx,p.y-my);if(d<r||d>r+3)continue;
   const nx=(p.x-mx)/d,ny=(p.y-my)/d,q={x:p.x+nx*r,y:p.y+ny*r};if(ThemedTerrain.bodyClear(u,p.x,p.y,r)&&ThemedTerrain.bodyClear(v,q.x,q.y,r)){found={p,q,nx,ny};break}
  }if(found)break}
  qaAssert(!!found,'terrain edge fixture '+kind);qaPlace(u,found.p.x,found.p.y);qaPlace(v,found.q.x,found.q.y);coarseActive.add(u);const old=qaPose(u);
  for(let i=0;i<8;i++){solveCoarseSeparation(.1);qaAssert(ThemedTerrain.bodyClear(u,u.x,u.y,r),'no terrain penetration '+kind);qaAssert(qaSpatial(u),'terrain spatial invariant '+kind)}
  qaAssert(Math.hypot(u.x-old[0],u.y-old[1])<CONFIG.motion.collisionMaxStep,'terrain blocked the inward correction '+kind);rows.push({kind,clear:true});
 }
 // Elevated ground units retain their height above the new support after XY separation.
 qaReset();const u=qaBody(),v=qaBody('swordsman',2);qaPlace(u,u.x,u.y,75);coarseActive.add(u);const oldX=u.x;solveCoarseSeparation(.1);qaAssert(u.x!==oldX&&u.airHeight===75&&qaSpatial(u),'airborne terrain rebase');
 return{rows,elevatedGroundHeight:75};
`);
probe('Elevated AIR body is not projected out of water',`
 qaReset();const u=qaBody('flowerbee'),v=qaBody('flowerbee'),s=ThemedTerrain.shapes.find(s=>s.kind==='water'&&ThemedTerrain.inside(s.points,s.cx,s.cy));qaAssert(!!s,'water interior fixture');
 qaPlace(u,s.cx,s.cy,100);qaPlace(v,s.cx+2,s.cy,100);qaAssert(ThemedTerrain.bodyClear(u,u.x,u.y,moaBodyRadius(u)),'air can occupy water');coarseActive.add(u);solveCoarseSeparation(.1);
 qaAssert(Math.hypot(u.x-s.cx,u.y-s.cy)<=CONFIG.motion.collisionMaxStep+1e-8,'air clearance must not use ground safePoint');qaAssert(u.airHeight===100&&qaSpatial(u),'air-over-water spatial invariant');return{airHeight:100};
`);
probe('Eligible zero-contact final terrain settlement',`
 qaReset();const u=qaBody();coarseActive.add(u);u.x+=.25;solveCoarseSeparation(.1);qaAssert(qaSpatial(u),'Every eligible body must be constrained even without contacts');
 return{contacts:0,spatialRebased:true};
`);
}


// Compatibility checks exercise the real final runtime, SDK session options,
// prepared boundary, disk importer, diagnostics and PublicSession.start path.
// The public discovery capability is stopped before any network action; its
// constructor arguments are observed, never replaced with fake acceptance.
async function compatibilityChecks(source,label){
 const {session}=require('./main-harness.cjs');
 const a=session(file+':compat-'+label,source),e=a.e,removed=[];
 e.c.AbortController=AbortController;
 e.c.sessionStorage={getItem(){return null},setItem(){},removeItem(key){removed.push(key)}};
 try{
  await a.init();
  const current=e.run('BloomSimulation.version');
  assert.match(current,/^budmori-(pair-separation-v1|batched-grid-\d+-v1)$/,'New simulation identity');
  for(const retired of ['budmori-shared-ms-v3','budmori-shared-v3','budmori-public-active-v1','budmori-public-resume-v1','budmori-public-v1'])assert(!source.includes(retired),'Retired identity remains in '+label+': '+retired);
  assert.equal(e.run('bloomSession.simulationVersion'),current,'Actual SDK session identity');
  assert.equal(e.run('BloomDiagnostics.snapshot().runtime.engine.simulationVersion'),current,'Diagnostic/runtime identity');
  e.run(`globalThis.qaVersionContext={tick:bloomTick,membershipEpoch:state.membershipEpoch,simulationVersion:BloomSimulation.version,tickRate:CONFIG.sim.tickRate,seed:bloomSeed,players:WorldPlayers.all().filter(p=>p.lifecycle==='active').map(p=>p.playerId)};globalThis.qaVersionBytes=bloomAdapter.save();`);
  assert.throws(()=>e.run("bloomAdapter.prepareSnapshot(qaVersionBytes,{...qaVersionContext,simulationVersion:'budmori-shared-ms-v3'})"),/Prepared snapshot boundary/,'Old SDK identity rejected by real prepareSnapshot');
  assert.equal(e.run("bloomAdapter.validateSnapshot(qaVersionBytes,{...qaVersionContext,simulationVersion:'budmori-shared-ms-v3'})"),false,'Old context validation rejects');
  e.c.qaOtherVersion=current==='budmori-pair-separation-v1'?'budmori-batched-grid-32-v1':'budmori-pair-separation-v1';
  assert.throws(()=>e.run('bloomAdapter.prepareSnapshot(qaVersionBytes,{...qaVersionContext,simulationVersion:qaOtherVersion})'),/Prepared snapshot boundary/,'Different collision algorithm identity rejects');
  e.run('globalThis.qaCurrentPrepared=bloomAdapter.prepareSnapshot(qaVersionBytes,qaVersionContext);bloomAdapter.loadPreparedSnapshot(qaCurrentPrepared,qaVersionContext)');
  assert(Buffer.from(e.run('bloomAdapter.save()')).equals(Buffer.from(e.run('qaVersionBytes'))),'Current-version prepare/install preserves canonical bytes');
  const disk=await a.request('snapshot'),envelope=JSON.parse(disk);
  assert.equal(envelope.schema,'bloom-snapshot-disk-v4');assert.equal(envelope.formatVersion,4);assert.equal(envelope.simulationVersion,'bloom-webgl-shared-ms-v3');assert.equal(envelope.codec,'bloom-live-graph-v3');
  e.c.qaDisk=disk;
  assert.equal(e.run('BloomLiveCodec.decode(bloomSnapshotStore.read(JSON.parse(qaDisk))).schema'),'bloom-webgl-shared-ms-v3','Graph schema intentionally unchanged');
  const hp=e.run('state.mother.hp'),time=e.run('state.time');e.run('state.mother.hp-=1;bloomSnapshotStore.invalidate()');
  assert.equal(await a.request('load',{disk}),true,'Actual ordinary disk import succeeds');assert.equal(e.run('state.mother.hp'),hp);assert.equal(e.run('state.time'),time);
  assert(e.run('bloomAdapter.validateSnapshot(bloomAdapter.save(),{tick:bloomTick,simulationVersion:BloomSimulation.version})'),'Disk roundtrip validates under new simulation identity');
  e.run(`BloomOwnedSDK={...BloomOwnedSDK,createNostrPublicRoom:options=>{globalThis.qaDiscoveryOptions=options;return Promise.reject(new Error('Compatibility probe stops before network'))}}`);
  assert.equal(await e.run('PublicSession.start({fresh:true})'),false,'Discovery intentionally stops without entering any room');
  const publicOptions=e.json('({namespace:qaDiscoveryOptions.namespace,simulationVersion:qaDiscoveryOptions.simulationVersion,resumeKey:qaDiscoveryOptions.resume.key,tickRate:CONFIG.sim.tickRate,checksum:CONFIG.netcode.checksumInterval})');
  const cell=/^budmori-batched-grid-(\d+)-v1$/.exec(current)?.[1],namespace=cell?'budmori-batched-'+cell+'-research-v1':'budmori-pair-research-v1';
  assert.equal(publicOptions.namespace,namespace,'Actual public directory namespace');assert.equal(e.run('PublicSession.config.namespace'),namespace);
  assert.equal(publicOptions.simulationVersion,current+'-'+publicOptions.tickRate+'-'+publicOptions.checksum,'Actual public discovery version includes negotiated settings');
  assert.equal(publicOptions.resumeKey,'budmori-pair-resume-v1','Experimental resume key is isolated from shipped key');
  assert(removed.includes('budmori-pair-active-v1'),'Actual fresh-public flow uses experimental active flag');
  assert(!removed.includes('budmori-public-active-v1'),'Shipped public active flag untouched');
  return{label,sourceSHA256:require('node:crypto').createHash('sha256').update(source).digest('hex'),simulationVersion:current,sdk:true,preparedOldRejected:true,preparedCurrentAccepted:true,diskRoundtrip:true,diskSchema:envelope.schema,graphSchema:envelope.simulationVersion,namespace:publicOptions.namespace,publicVersion:publicOptions.simulationVersion,resumeKey:publicOptions.resumeKey};
 }finally{await a.close()}
}
(async()=>{
 if(!args.includes('--compatibility-only'))collisionChecks();
 const compatibility=[await compatibilityChecks(html,'candidate')];
 // Generator checks are possible when the supplied file still has the original
 // separation block. Already-generated HTML still receives every API check above.
 if(inputHTML.includes(' {let nx=0,ny=0,n=0;const air=d.layer')){
  const {batchedGridCandidate}=require('./batched-grid-candidate.cjs');
  for(const cell of [32,64])compatibility.push(await compatibilityChecks(batchedGridCandidate(inputHTML,cell),'batched-'+cell));
  assert.notEqual(compatibility.at(-1).simulationVersion,compatibility.at(-2).simulationVersion,'Different batched cells cannot share simulation identity');
 }
 report.compatibility=compatibility;console.log(JSON.stringify(report,null,2));
})().catch(error=>{console.error(error.stack);process.exitCode=1});
