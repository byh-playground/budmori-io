'use strict';
// Read-only comparison of two shipped-script realms. Fixtures are installed only
// between stopped SDK sessions; every subsequent step is a real SDK tick.
// campaign.cjs uses the same candidate twice after the intentional shared-world
// migration. Historical direct combat probes live in combat-observations.cjs.
const assert=require('assert'),fs=require('fs');
const {engine}=require('./native-engine.cjs');
async function run({baseline=`${__dirname}/../composition-baseline.html`,target=`${__dirname}/../index.html`,disk=null,reportPath=null}={}){
const engines=[engine(baseline),engine(target)];
const report={baseline,target,baselineSHA:engines[0].sha256,targetSHA:engines[1].sha256,resumedFromCheckpoint:disk!==null,comparison:engines[0].sha256===engines[1].sha256?'same-artifact deterministic continuation':'cross-artifact canonical parity',checks:0,effectChecks:0,chapters:[]};
let failure=null;
function same(label){
 const bytes=engines.map(e=>Buffer.from(e.run('BloomSimulation.adapter.save()')));
 assert(bytes[0].equals(bytes[1]),`Canonical authority diverged: ${label}`);
 assert.equal(engines[0].run('JSON.stringify(bloomCurrentEffects)'),engines[1].run('JSON.stringify(bloomCurrentEffects)'),`Full presentation events diverged: ${label}`);
 report.effectChecks++;
 report.checks++;
}
function initialize(seed){
 for(const e of engines){
  e.run(`BloomSimulation.session?.close();BloomSimulation.initialize(${seed});BloomSimulation.createSession();playing=true;paused=false;modalKind="";`);
  if(disk!==null){e.c.qaCheckpointDisk=disk;assert(e.run('BloomSimulation.disk.load(qaCheckpointDisk)'),'Campaign checkpoint imports');e.run('playing=true;paused=false;modalKind="";');}
 }
 same(disk===null?'initialization':'continuing campaign checkpoint');
 report.initialWorldTime=engines[0].run('state.time');
}
function fixture(source){for(const e of engines)e.fixture(source);same('fixture')}
function transaction(label,source){
 fixture(`
  const oldTick=bloomInTick,oldEffects=bloomCurrentEffects,oldSequence=bloomEventSequence;
  bloomInTick=true;bloomCurrentEffects=[];bloomEventSequence=0;
  const check=(condition,message)=>{if(!condition)throw Error(message)};
  try{
   ${source}
   globalThis.qaTransactionEffects=JSON.stringify(bloomCurrentEffects);
  }finally{bloomInTick=oldTick;bloomCurrentEffects=oldEffects;bloomEventSequence=oldSequence}
 `);
 assert.equal(engines[0].run('qaTransactionEffects'),engines[1].run('qaTransactionEffects'),`Transaction presentation events diverged: ${label}`);
 assert.deepEqual(engines[0].json('qaTransactionCoverage'),engines[1].json('qaTransactionCoverage'),`Transaction observations diverged: ${label}`);
 report.effectChecks++;
 report.chapters.push({label,transaction:true,events:engines[0].run('JSON.parse(qaTransactionEffects).length'),...engines[0].json('qaTransactionCoverage')});
}
function advance(count,label,input){
 const phases=new Set();let rivalTicks=0,residentTicks=0;
 for(let i=0;i<count;i++){
  for(const e of engines)e.tick(1,input?.(i)||{x:0,y:0,manual:true});
  same(label+' tick '+(i+1));
  const seen=engines[0].json('({phases:state.units.filter(u=>u.hp>0&&u.attackController).map(u=>u.attackController.phase),rival:state.units.some(u=>u.hp>0&&u.rivalOwner),resident:residentState()?.status})');
  seen.phases.forEach(p=>phases.add(p));if(seen.rival)rivalTicks++;if(seen.resident==='engaged')residentTicks++;
 }
 report.chapters.push({label,ticks:count,phases:[...phases],rivalTicks,residentTicks});
}
try{
 initialize(12345);
 if(disk!==null)transaction('Continue existing campaign checkpoint',`
  const recovered=state.dead;if(recovered)check(typeof PlayerLifecycle==='undefined'?recover():PlayerLifecycle.recover(WorldPlayers.byAccount(-1)),'Checkpoint recovery');
  globalThis.qaTransactionCoverage={recovered,time:state.time};
 `);
 advance(180,'Natural movement and wild activation',i=>({x:i%60<30?.7:-.4,y:i%90<45?.25:-.25,manual:true}));
 fixture(`
  if(state.dead)PlayerLifecycle.recover(WorldPlayers.byAccount(-1));
  for(const c of state.camps){c.enabled=false;c.spawned=true;c.regrowth=(c.regrowth||[]).filter(q=>q.rarityReviveOwner)}
  for(const u of state.units)if(!residentIs(u)){u.stun=1e6;u.cooldown=1e6;u.target=0}
  const m=state.mother,p=ThemedTerrain.safePoint(1800,1800,moaBodyRadius(m));SpatialPosition.constrain(m,p.x,p.y);resetMoaBody(m);spatialUnit(m,true);
  m.hp=m.maxHp;
  for(const type of friendlyTypes)rarityAcquire(-1,type,3,1);
  const t=spawn('shellbug','enemy',m.x+150,m.y,{camp:0,rarityGrade:3});t.hp=t.maxHp=1000000;t.aggroAt=0;t.wanderAt=state.time+1000;t.target=-1;state.camps[0].remaining++;
  let r=state.units.find(u=>u.rivalLeader&&u.hp>0),rivalPath='existing';
  if(!r){
   // Continue a saved rival's real lifecycle before introducing another leader.
   const reservation=Object.values(state.rarityRivals||{}).sort((a,b)=>a.body.id-b.body.id)[0];
   if(reservation){reservation.respawnAt=state.time;rarityRivalTick(0);r=idMap.get(reservation.body.id);rivalPath='revived'}
  }
  if(!r?.rivalLeader||r.hp<=0){
   // A fixed camp/coordinate pair is not a valid spawn contract: the final
   // wild ring also enforces the checkpoint's viewport, biome, and spacing.
   // Use the production point search and spawn APIs across the existing camps.
   r=null;rivalPath='spawned';rebuildGrid();
   for(const c of state.camps){
    const member=c.members.find(q=>q.count>0&&!q.boss);if(!member)continue;
    const slot={type:member.type,boss:false,variant:'rival'};
    for(let attempt=0;attempt<4&&!r;attempt++){
     const point=regrowSpot(c,slot);if(!point)continue;
     const candidate=spawn(slot.type,'enemy',point.x,point.y,{camp:c.id,variant:'rival'});
     if(candidate?.rivalLeader&&candidate.hp>0){r=candidate;c.remaining++;}
    }
    if(r)break;
   }
  }
  if(!r?.rivalLeader)throw Error('No valid production rival spawn/respawn point for continuing checkpoint');
  r.aggroAt=0;r.stun=0;r.cooldown=0;
  globalThis.qaRivalFixture={path:rivalPath,id:r.id,camp:r.camp};
  rarityAcquire(r.id,'archer',3,1);rarityAcquire(r.id,'dandelion',3,1);
  rebuildGrid();for(const u of state.units)if(u.rarityUID&&u.team==='friendly'){u.target=t.id;u.cooldown=0;u.query=0}
 `);
 assert.deepEqual(engines[0].json('qaRivalFixture'),engines[1].json('qaRivalFixture'));
 advance(240,'Ordinary, rarity special, rival leader and rival recruit');
 Object.assign(report.chapters[report.chapters.length-1],{rivalFixture:engines[0].json('qaRivalFixture')});
 transaction('Legacy definition capabilities, shields, gates, healing and rarity capture',`
  const recovered=state.dead;if(recovered)check(typeof PlayerLifecycle==='undefined'?recover():PlayerLifecycle.recover(WorldPlayers.byAccount(-1)),'Continuing story recovers through the current recovery path');const m=state.mother;m.hp=m.maxHp;
  for(const u of state.units)if(!residentIs(u)){u.stun=1e6;u.cooldown=1e6;u.target=0}
  state.upgrades.ability=1;
  const t=spawn('shellbug','enemy',m.x+50,m.y,{camp:0,rarityGrade:1});t.hp=t.maxHp=10000000;t.stun=1e6;t.aggroAt=0;t.wanderAt=state.time+1000;
  const types=['rootstalker','medic','siege','skirmisher','sporemoth','pikeman','shellbug','tank','chainflower','rocket','pillbug'],attacks=[];
  for(const type of types){
   const u=spawn(type,'friendly',m.x+10,m.y,{rarityGrade:0});u.target=t.id;u.angle=0;u.cooldown=0;u.stun=0;rebuildGrid();
   const before={hp:t.hp,shots:projectiles.length,events:events.length,attacks:state.stats.attacks};
   attack(u,t);const pending=!!u.pendingMelee;
   if(pending){const p=u.pendingMelee;u.pendingMelee=null;attack(u,t,true,p)}
   if(type==='medic')for(let i=0;i<6;i++)attack(u,t,true,{aimX:t.x,aimY:t.y});
   attacks.push({type,pending,hpLoss:before.hp-t.hp,shots:projectiles.length-before.shots,scheduled:events.length-before.events,attackCount:state.stats.attacks-before.attacks,selfDestroyed:u.hp===0});
   if(u.hp>0){u.stun=1e6;u.cooldown=1e6;u.target=0}
  }
  const blockedBefore=state.stats.shieldsBlocked,hp=t.hp;
  // The shield belongs to this NPC. Current participant-owned statistics must
  // leave the primary player's counter unchanged; historical world counters
  // credited it once. This is the only permitted local expectation difference.
  const participantStats=typeof recordCombatStat==='function',expectedShieldCredit=participantStats?0:1;
  if(participantStats)check(WorldPlayers.forEntity(t)===null,'Shield fixture has no participant owner');
  t.shield=1;t.shieldUntil=state.time+10;damage(m,t,100,'ranged');
  check(t.hp===hp&&t.shield===0,'Active shield consumes exactly one block without HP loss');
  check(state.stats.shieldsBlocked===blockedBefore+expectedShieldCredit,'NPC shield attribution follows the explicit counter policy');
  const mBefore=m.hp;if(m.roll)m.roll.invulnerability.leftMs=100;else m.rollInvulnerableMs=100;damage(t,m,100,'melee');check(m.hp===mBefore,'Roll immunity gate');if(m.roll)m.roll.invulnerability.leftMs=0;else m.rollInvulnerableMs=0;
  const friendly=state.units.find(u=>u.hp>0&&u.team==='friendly');const sameHP=friendly.hp;damage(m,friendly,100,'melee');check(friendly.hp===sameHP,'Faction damage gate');
  const boss=residentUnit(),bossHP=boss.hp;damage(m,boss,100,'ranged');check(boss.hp===bossHP,'Dormant resident gate');
  const armors=[];for(const type of ['shellbug','tank']){
   const a=spawn(type,'friendly',m.x+20,m.y,{rarityGrade:0});a.still=10;a.stun=1e6;const oldHP=a.hp;damage(t,a,80,'ranged');armors.push({type,loss:oldHP-a.hp});
  }
  m.hp=Math.max(1,m.hp-25);const healing=applyHealing(m,Math.min(m.maxHp,m.hp+13));check(healing>0,'Actual healing emits credit');
  const beforeOwned=rarityOwnedCount(-1,'archer',1),beforeConverted=state.stats.converted||0;
  const capture=spawn('archer','enemy',m.x+30,m.y,{camp:0,rarityGrade:2});capture.hp=1;state.camps[0].remaining++;rebuildGrid();damage(m,capture,1000000,'ranged');
  check(capture.hp===0&&capture.deadEffect&&rarityOwnedCount(-1,'archer',1)===beforeOwned+1,'Current death path credits captured rarity');
  // Exercise the current lifecycle entry. The retired captured pre-rarity
  // adapter is not gameplay and must not resurrect an extra death explosion.
  m.shield=0;if(m.roll)m.roll.invulnerability.leftMs=0;else m.rollInvulnerableMs=0;m.hp=m.maxHp;
  const bomb=spawn('pillbug','enemy',m.x+15,m.y,{camp:-1,rarityGrade:0});bomb.hp=0;const beforeExplosion=m.hp;rebuildGrid();die(bomb,m);
  check(bomb.deadEffect&&m.hp===beforeExplosion,'Current death does not add a retired postmortem blast');
  globalThis.qaTransactionCoverage={recovered,types:attacks,armors,shieldBlocks:state.stats.shieldsBlocked-blockedBefore,expectedShieldCredit,healing,captured:rarityOwnedCount(-1,'archer',1)-beforeOwned,converted:(state.stats.converted||0)-beforeConverted,postmortemDamage:beforeExplosion-m.hp};
  globalThis.qaFeedbackTarget=t.id;
 `);
 // Exercise immediate health/hitfeel without enabling rendering or touching a GPU.
 fixture(`
  const m=state.mother,t=idMap.get(qaFeedbackTarget);view.x=m.x;view.y=m.y;view.w=view.h=2000;
  const oldTick=bloomInTick;bloomInTick=false;
  try{
   const before=t.hp,numbers=hitfeel.numbers.length;damage(m,t,37,'melee');
   if(!(t.hp<before))throw Error('Non-tick damage was not resolved');
   globalThis.qaImmediateFeedback={hpLoss:before-t.hp,numbers:hitfeel.numbers.length-numbers,last:hitfeel.numbers.slice(-1).map(n=>({lane:n.lane,amount:n.amount,blocked:n.blocked,text:n.text})),bars:[...healthJuice.bars].map(([u,b])=>({id:u.id,hp:b.hp,target:b.target}))};
  }finally{bloomInTick=oldTick}
 `);
 assert.deepEqual(engines[0].json('qaImmediateFeedback'),engines[1].json('qaImmediateFeedback'));
 assert(engines[0].run('qaImmediateFeedback.numbers>0'),'Non-tick hit feedback exercised');
 report.chapters.push({label:'Non-tick headless-safe health/hit feedback',...engines[0].json('qaImmediateFeedback')});
 transaction('Special completion, interruption, and grounded jump landing',`
  const m=state.mother,t=idMap.get(qaFeedbackTarget),p=ThemedTerrain.safePoint(m.x+15,m.y,25);
  const u=spawn('dandelion','friendly',p.x,p.y,{rarityGrade:3});u.stun=0;u.target=t.id;u.query=0;if(typeof UnitMovement==='undefined'){u.returning=false;u.order='follow'}else{UnitMovement.returnHome(u,false);UnitMovement.command(u,'follow')};rebuildGrid();
  const patterns=[];
  for(const id of ['dash','groundBlast','arcing','coneSweep','ringShockwave','jumpSlam']){
   SpatialPosition.constrain(u,p.x,p.y);resetMoaBody(u);spatialUnit(u,true);u.attackController=createAttackController();u.target=t.id;if(typeof UnitMovement==='undefined'){u.order='follow';u.returning=false}else{UnitMovement.command(u,'follow');UnitMovement.returnHome(u,false)};
   check(beginAttackPattern(u,t,id),'Pattern begins: '+id);
   let ticks=0;while(u.attackController.phase!=='standard'&&ticks++<300)tickAttackPattern(u);
   check(u.attackController.phase==='standard','Pattern completes: '+id);
   if(id==='jumpSlam')check(u.airHeight===u.attackController.baseAir&&u.z===u.groundZ+u.airHeight&&u.attackController.landed,'Completed jump grounded and hit once');
   patterns.push({id,ticks,landed:u.attackController.landed,phase:u.attackController.phase});
  }
  SpatialPosition.constrain(u,p.x,p.y);resetMoaBody(u);spatialUnit(u,true);u.attackController=createAttackController();u.target=t.id;
  check(beginAttackPattern(u,t,'jumpSlam'),'Interrupted jump begins');let ticks=0;while(u.attackController.phase==='windup'&&ticks++<100)tickAttackPattern(u);tickAttackPattern(u);
  check(u.airHeight>u.attackController.baseAir,'Interrupted jump reached airborne phase');cancelAttackPattern(u,'parity-interruption');
  check(u.attackController.phase==='recovery'&&u.airHeight===u.attackController.baseAir&&u.z===u.groundZ+u.airHeight,'Cancelled jump settles to ground');
  const cancelledJump={phase:u.attackController.phase,airHeight:u.airHeight,baseAir:u.attackController.baseAir,grounded:u.z===u.groundZ+u.airHeight};
  SpatialPosition.constrain(u,p.x,p.y);resetMoaBody(u);spatialUnit(u,true);u.attackController=createAttackController();u.target=t.id;
  check(beginAttackPattern(u,t,'jumpSlam'),'Terrain-blocked jump begins');ticks=0;while(u.attackController.phase==='windup'&&ticks++<100)tickAttackPattern(u);tickAttackPattern(u);
  const c=u.attackController;if(typeof AttackPatternController==='undefined'){c.previousRemainingMs=c.remainingMs;c.remainingMs=0;c.left=0}else AttackPatternController.advance(c,c.remainingMs);
  const terrainRejected=patternMove(u,c,-100,-100)===false;
  check(terrainRejected&&c.phase==='recovery'&&u.airHeight===c.baseAir&&u.z===u.groundZ+u.airHeight,'Blocked landing cancels and grounds jump');
  globalThis.qaTransactionCoverage={patterns,cancelledJump,terrainRejected,terrainCancelledPhase:c.phase};
  u.stun=1e6;
 `);
 fixture(`
  for(const c of state.camps){c.enabled=false;c.spawned=true;c.regrowth=[]}
  for(const u of state.units)if(!residentIs(u)){u.stun=1e6;u.cooldown=1e6;u.target=0}
  const m=state.mother,h=residentHabitat(),p=ThemedTerrain.safePoint(h.x-100,h.y,moaBodyRadius(m));SpatialPosition.constrain(m,p.x,p.y);resetMoaBody(m);spatialUnit(m,true);
  m.hp=m.maxHp;
  const r=residentState();r.manualThisTick=true;r.stepStart={x:m.x-1,y:m.y};if(!residentTryEntry())throw Error('Resident fixture failed to engage');
 `);
 advance(180,'Resident engagement and committed seed lifecycle');
 transaction('Resident return cancels owned seeds and clears targets',`
  if(state.dead)check(typeof PlayerLifecycle==='undefined'?recover():PlayerLifecycle.recover(WorldPlayers.byAccount(-1)),'Recover before resident return chapter');
  const m=state.mother,h=residentHabitat(),r=residentState(),u=residentUnit();check(!!u,'Resident survives story');
  // The imported campaign may retain AUTO or an owner-bound stun/knockback
  // weapon. Put the owner back beside the living boss and release the boss's
  // stun before deliberately starting this stopped-session cleanup fixture.
  const nearBoss=ThemedTerrain.safePoint(u.x-45,u.y,moaBodyRadius(m));SpatialPosition.constrain(m,nearBoss.x,nearBoss.y);m.hp=m.maxHp;resetMoaBody(m);spatialUnit(m,true);u.stun=0;
  if(r.status!=='engaged'){r.status='dormant';r.manualThisTick=true;r.stepStart={x:m.x-1,y:m.y};check(residentTryEntry(),'Resident re-engages')}
  u.attackController=createAttackController();check(beginAttackPattern(u,m,residentPatternID),'Resident seed cast begins: '+JSON.stringify({status:r.status,stun:u.stun,inside:residentInside(m),canFight:residentCanFight(u,m),wall:wallClear(u,m)}));let ticks=0;while(u.attackController.phase==='windup'&&ticks++<100)tickAttackPattern(u);
  const active=projectiles.filter(p=>p.residentSeed&&!p.finished).length;check(active>0,'Resident seeds active before return');
  m.primaryAttack.targetId=u.id;m.primaryAttack.pending={target:u.id,left:.1,total:.1,ranged:true,angle:0};residentReturn('parity-owner-outside');
  check(r.status==='returning'&&projectiles.filter(p=>p.residentSeed&&!p.finished).length===0&&!m.primaryAttack.targetId&&!m.primaryAttack.pending,'Resident return cancels seeds and targets');
  globalThis.qaTransactionCoverage={activeSeedsBefore:active,activeSeedsAfter:projectiles.filter(p=>p.residentSeed&&!p.finished).length,status:r.status,reason:r.reason};
 `);
 advance(30,'Resident return settles and removes finished seeds');
 assert(report.chapters.some(c=>c.rivalTicks>0),'Rival path exercised');
 assert(report.chapters.some(c=>c.patterns?.some(p=>p.id==='jumpSlam'&&p.landed)),'Shared special completion exercised');
 assert(report.chapters.some(c=>c.residentTicks>0),'Resident path exercised');
 report.status='PASS';
}catch(error){report.status='FAIL';report.error=error.stack;failure=error}
finally{for(const e of engines)e.run('BloomSimulation.session?.close()');if(reportPath)fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');}
if(failure){failure.parityReport=report;throw failure}
return report;
}
module.exports={run};
if(require.main===module)run({baseline:process.argv[2]||`${__dirname}/../composition-baseline.html`,target:process.argv[3]||`${__dirname}/unit-update-private.html`,reportPath:process.env.BLOOM_UNIT_PARITY_REPORT||`${__dirname}/unit-update-parity-results.json`}).then(report=>console.log(JSON.stringify(report,null,2))).catch(error=>{process.exitCode=1;console.error(JSON.stringify(error.parityReport||{status:'FAIL',error:error.stack},null,2));});
