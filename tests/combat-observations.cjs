'use strict';
// The historical engine cannot import shared-world v3 capsules. Compare only
// direct combat capabilities on an identical stopped encounter. Full world
// scheduling, actor ownership and imported continuation have separate tests.
const assert=require('node:assert/strict');
const {engine}=require('./native-engine.cjs');
function run({baseline,target}={}){
 const engines=[engine(baseline),engine(target)],report={status:'RUNNING',baseline,target,baselineSHA:engines[0].sha256,targetSHA:engines[1].sha256,scope:'Direct combat observations with explicit participant-stat attribution correction; no historical world-byte or scheduler parity claim.',checks:[],ownershipMetadata:0,statisticsCorrections:[]};
 // The new explicit ownership fields are intentionally absent from historical
 // payloads. Check their actual values before removing only those new fields.
 function observation(e){const o=e.json('qaCombatObservation');function visit(p){if(!p||typeof p!=='object')return;for(const [key,value]of Object.entries(p)){if(key==='playerId'||key==='factionId'){assert.equal(value,key==='playerId'?'solo':'player:solo');delete p[key];report.ownershipMetadata++}else visit(value)}}visit(o);return o}
 const participantStatistics=engines.map(e=>e.run('typeof recordCombatStat==="function"'));let npcShieldBlocks=0;
 function transaction(label,source,{npcShields=0}={}){
  for(const e of engines)e.fixture(`
   const oldTick=bloomInTick;bloomInTick=true;bloomCurrentEffects=[];bloomEventSequence=0;
   const participantStatistics=typeof recordCombatStat==='function';
   const check=(value,message)=>{if(!value)throw Error(message)};
   try{${source};globalThis.qaCombatObservation={coverage:globalThis.qaCoverage,rng:state.rng,stats:structuredClone(state.stats),shots:structuredClone(projectiles),events:structuredClone(events),effects:structuredClone(bloomCurrentEffects)}}finally{bloomInTick=oldTick}
  `);
  npcShieldBlocks+=npcShields;const historical=observation(engines[0]),current=observation(engines[1]);
  const shieldDelta=(Number(participantStatistics[0])-Number(participantStatistics[1]))*npcShieldBlocks;
  assert.equal(current.stats.shieldsBlocked,historical.stats.shieldsBlocked+shieldDelta,'NPC shield blocks do not belong to the primary participant');
  if(shieldDelta){report.statisticsCorrections.push({label,key:'shieldsBlocked',expectedDifference:shieldDelta});historical.stats.shieldsBlocked+=shieldDelta}
  assert.deepEqual(current,historical,label);report.checks.push(label);
 }
 try{
  for(const e of engines){e.run('BloomSimulation.initialize(12345);BloomSimulation.createSession();playing=true;paused=false;modalKind=""');e.fixture(`for(const c of state.camps){c.enabled=false;c.spawned=true;c.regrowth=[]}const m=state.mother;state.rng=100000;globalThis.qaCombatTarget=spawn('shellbug','enemy',m.x+50,m.y,{camp:0,rarityGrade:1});qaCombatTarget.hp=qaCombatTarget.maxHp=10000000;qaCombatTarget.stun=1e6;qaCombatTarget.aggroAt=0;`)}
  transaction('Species capabilities, attack ordering, damage, projectile payloads and complete effects',`
   const m=state.mother,t=qaCombatTarget,attacks=[];
   for(const type of ['rootstalker','medic','siege','skirmisher','sporemoth','pikeman','shellbug','tank','chainflower','rocket','pillbug']){
    const u=spawn(type,'friendly',m.x+10,m.y,{rarityGrade:0});u.target=t.id;u.angle=0;u.cooldown=0;u.stun=0;rebuildGrid();
    const before={hp:t.hp,shots:projectiles.length,events:events.length,attacks:state.stats.attacks};attack(u,t);const pending=!!u.pendingMelee;
    if(pending){const p=u.pendingMelee;u.pendingMelee=null;attack(u,t,true,p)}if(type==='medic')for(let i=0;i<6;i++)attack(u,t,true,{aimX:t.x,aimY:t.y});
    attacks.push({type,pending,hpLoss:before.hp-t.hp,shots:projectiles.length-before.shots,scheduled:events.length-before.events,attackCount:state.stats.attacks-before.attacks,selfDestroyed:u.hp===0});if(u.hp>0){u.stun=1e6;u.cooldown=1e6;u.target=0}
   }
   qaCoverage={attacks};
  `);
  transaction('Shield, roll immunity, friendly-fire gate, mitigation and healing',`
   const m=state.mother,t=qaCombatTarget,hp=t.hp,blocked=state.stats.shieldsBlocked;t.shield=1;t.shieldUntil=state.time+10;damage(m,t,100,'ranged');check(t.hp===hp&&t.shield===0&&state.stats.shieldsBlocked===blocked+(participantStatistics?0:1),'Shield consumption and NPC statistic ownership');
   const mHP=m.hp;m.rollInvulnerableMs=100;damage(t,m,100,'melee');check(m.hp===mHP,'Roll immunity');m.rollInvulnerableMs=0;
   const friendly=state.units.find(u=>u.hp>0&&u.team==='friendly'),friendHP=friendly.hp;damage(m,friendly,100,'melee');check(friendly.hp===friendHP,'Friendly-fire gate');
   const armors=[];for(const type of ['shellbug','tank']){const a=spawn(type,'friendly',m.x+20,m.y,{rarityGrade:0});a.still=10;a.stun=1e6;const before=a.hp;damage(t,a,80,'ranged');armors.push({type,loss:before-a.hp})}
   m.hp=Math.max(1,m.hp-25);const healing=applyHealing(m,Math.min(m.maxHp,m.hp+13));check(healing>0,'Healing applied');qaCoverage={armors,healing,shieldConsumed:t.shield===0};
  `,{npcShields:1});
  transaction('Six special lifecycles, completed and cancelled grounded jump',`
   const m=state.mother,t=qaCombatTarget,p=ThemedTerrain.safePoint(m.x+15,m.y,25),u=spawn('dandelion','friendly',p.x,p.y,{rarityGrade:3});u.stun=0;u.target=t.id;u.query=0;u.returning=false;u.order='follow';rebuildGrid();const patterns=[];
   for(const id of ['dash','groundBlast','arcing','coneSweep','ringShockwave','jumpSlam']){
    u.x=u.worldX=p.x;u.y=u.worldY=p.y;resetMoaBody(u);spatialUnit(u,true);u.attackController=createAttackController();u.target=t.id;u.order='follow';u.returning=false;
    check(beginAttackPattern(u,t,id),'Pattern begins: '+id);let ticks=0;while(u.attackController.phase!=='standard'&&ticks++<300)tickAttackPattern(u);check(u.attackController.phase==='standard','Pattern completes: '+id);
    if(id==='jumpSlam')check(u.airHeight===u.attackController.baseAir&&u.z===u.groundZ+u.airHeight&&u.attackController.landed,'Completed jump grounded');patterns.push({id,ticks,landed:u.attackController.landed,phase:u.attackController.phase});
   }
   u.x=u.worldX=p.x;u.y=u.worldY=p.y;resetMoaBody(u);spatialUnit(u,true);u.attackController=createAttackController();u.target=t.id;
   check(beginAttackPattern(u,t,'jumpSlam'),'Interrupted jump begins');let ticks=0;while(u.attackController.phase==='windup'&&ticks++<100)tickAttackPattern(u);tickAttackPattern(u);check(u.airHeight>u.attackController.baseAir,'Jump airborne');cancelAttackPattern(u,'pure-combat-interruption');
   check(u.attackController.phase==='recovery'&&u.airHeight===u.attackController.baseAir&&u.z===u.groundZ+u.airHeight,'Cancelled jump grounded');qaCoverage={patterns,cancelled:{phase:u.attackController.phase,airHeight:u.airHeight,baseAir:u.attackController.baseAir,grounded:u.z===u.groundZ+u.airHeight}};
  `);
  transaction('Committed postmortem splash preserves leader damage after attacker death',`
   const m=state.mother;m.hp=m.maxHp;m.shield=0;m.rollInvulnerableMs=0;
   const bomb=spawn('pillbug','enemy',m.x+15,m.y,{camp:-1,rarityGrade:0});bomb.hp=0;const before=m.hp;rebuildGrid();core.die(bomb,m);
   check(bomb.deadEffect&&m.hp<before,'Dead attacker splash reaches the living leader');qaCoverage={before,after:m.hp,postmortemDamage:before-m.hp,deadEffect:bomb.deadEffect};
  `);
  report.status='PASS';return report;
 }finally{for(const e of engines)e.run('bloomSession?.close()')}
}
module.exports={run};
if(require.main===module){try{console.log(JSON.stringify(run({baseline:process.argv[2]||`${__dirname}/fixtures/runtime-combat-baseline.html`,target:process.argv[3]||`${__dirname}/../index.html`}),null,2))}catch(error){console.error(error.stack);process.exitCode=1}}
