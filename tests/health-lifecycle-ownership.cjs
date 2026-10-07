'use strict';
// Actual engine/SDK adapter. An optional baseline checks complete authoritative
// bytes and journal payloads; stopped fixtures are explicit, never source edits.
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {engine}=require('./native-engine.cjs');
const target=path.resolve(process.argv[3]||process.argv[2]||path.join(__dirname,'../index.html'));
const baseline=path.resolve(process.argv[3]?process.argv[2]:target),engines=[engine(baseline),engine(target)];
let bytesChecks=0,effectChecks=0;
function both(code){for(const e of engines)e.run(`(()=>{${code}})()`)}
function same(label){const wires=engines.map(e=>Buffer.from(e.run('bloomAdapter.save()')));assert.deepEqual(wires[1],wires[0],label+' complete bytes');assert.equal(engines[1].run('JSON.stringify(bloomCurrentEffects)'),engines[0].run('JSON.stringify(bloomCurrentEffects)'),label+' full effect payloads/IDs/order');bytesChecks++;effectChecks++}
function settle(label){both('rebuildGrid();spatialBoundary()');same(label)}
function transaction(label,code){both(`bloomCurrentEffects=[];bloomEventSequence=0;bloomInTick=true;try{${code}}finally{bloomInTick=false}`);settle(label)}
function tick(label){both(`bloomAdapter.step({tick:bloomTick,tickRate:CONFIG.sim.tickRate,inputs:WorldPlayers.all().filter(p=>p.lifecycle==='active').map(p=>({playerId:p.playerId,input:bloomEncodeInput({x:0,y:0,manual:true}),commands:[]}))});qaConfirmed=Math.max(qaConfirmed,bloomTick-1);bloomCommitEffects(qaConfirmed)`);same(label)}
try{
 both(`CONFIG.session.mode='online';BloomSimulation.initialize(12345);WorldMembership.apply({epoch:0,tick:0,players:['a','b']});BloomSimulation.sessionConfig=Object.freeze({mode:'online',persistence:'none',progressionPolicy:'fresh'});
  for(const c of state.camps){c.enabled=false;c.spawned=true;c.regrowth=[]}
  for(const u of state.units){u.stun=1e6;u.aggroAt=u.wanderAt=state.time+1e6}
  for(const p of WorldPlayers.all()){const m=p.leader,t=spawn('shellbug','enemy',m.x+65,m.y,{camp:0,rarityGrade:1});t.hp=t.maxHp=1e7;t.stun=1e6;t.aggroAt=t.wanderAt=state.time+1e6;t.qaOwner=p.playerId;state.camps[0].remaining++;}
  globalThis.qaDelivered=[];globalThis.qaConfirmed=-1;bloomResetEventJournal();bloomEventSink=e=>qaDelivered.push(JSON.stringify(e));`);
 settle('two independent primary attack fixtures');
 tick('first windup');
 assert(engines[1].run(`WorldPlayers.all().every(p=>p.leader.primaryAttack.pending&&!Object.hasOwn(p.leader,'pendingMoa'))`));
 assert(engines[1].run(`WorldPlayers.get('a').leader.primaryAttack!==WorldPlayers.get('b').leader.primaryAttack&&WorldPlayers.get('a').leader.primaryAttack.pending!==WorldPlayers.get('b').leader.primaryAttack.pending`));
 both('globalThis.qaCheckpoint=bloomAdapter.save()');
 const replayEffects=[];
 for(let i=0;i<14;i++){tick('primary attack continuation '+i);replayEffects.push(engines[1].run('JSON.stringify(bloomCurrentEffects)'))}
 assert(engines[1].run(`WorldPlayers.all().every(p=>WorldPlayers.data(p).stats.attacks>0)&&qaDelivered.length>0`),'both participants fire independently');
 const delivered=engines.map(e=>e.run('qaDelivered.length'));
 both('bloomAdapter.load(qaCheckpoint)');
 for(let i=0;i<14;i++){tick('replayed primary attack '+i);assert.equal(engines[1].run('JSON.stringify(bloomCurrentEffects)'),replayEffects[i],'rollback reproduces exact journal')}
 for(let i=0;i<2;i++)assert.equal(engines[i].run('qaDelivered.length'),delivered[i],'confirmed effects delivered once despite replay');
 const current=engines[1];
 current.run(`globalThis.qaActor=WorldPlayers.get('b').leader;globalThis.qaKeys=Object.keys(qaActor).join();globalThis.qaWire=bloomAdapter.save();`);
 assert.equal(current.run(`Object.getOwnPropertyDescriptor(qaActor,'primaryAttack').enumerable`),true);
 for(const field of ['pendingMoa','moaTarget','moaCooldown','attackPose'])assert.equal(current.run(`${JSON.stringify(field)} in qaActor`),false,field+' has no runtime alias');
 assert(current.run(`Object.getPrototypeOf(qaActor.primaryAttack)===Object.prototype&&Object.getOwnPropertyDescriptor(qaActor,'primaryAttack').writable&&qaActor.tickPrimaryAttack===state.mother.tickPrimaryAttack`),'plain attack state with shared actor behavior');
 assert(current.run(`Object.keys(qaActor.primaryAttack).sort().join()===['cooldown','pending','pose','targetId'].sort().join()`),'native attack schema');
 current.run('PlayerCombat.target(WorldPlayers.get("b"),null);PlayerCombat.nearest(WorldPlayers.get("b"),100)');
 assert.deepEqual(Buffer.from(current.run('bloomAdapter.save()')),Buffer.from(current.run('qaWire')),'attack queries are readonly');
 assert.equal(current.run('Object.keys(qaActor).join()'),current.run('qaKeys'),'attack queries preserve state keys');
 transaction('healing versus ratio growth',`const p=WorldPlayers.get('b'),m=p.leader;m.hp-=23.25;applyHealing(m,m.hp+11.5);const a=WorldPlayers.data(p).campaign.abilities;a.level++;a.xp=abilityThreshold(a.level);moaSyncLevelHP(m);`);
 assert.equal(current.run(`bloomCurrentEffects.filter(e=>e.type==='healingCredit').length`),1,'ratio growth does not report healing');
 transaction('shield block and lethal wild recruitment',`const p=WorldPlayers.get('b'),m=p.leader,t=spawn('archer','enemy',m.x+45,m.y,{camp:0,rarityGrade:2});state.camps[0].remaining++;t.shield=1;t.shieldUntil=state.time+1;damage(m,t,1e9,'ranged');damage(m,t,1e9,'ranged');globalThis.qaCaptured=t.id;`);
 assert(current.run(`rarityOwnedCount(WorldPlayers.get('b').accountOwner,'archer',1)>0`));
 transaction('owned death publishes before losses and saves corpse',`const p=WorldPlayers.get('b'),a=rarityGetAccount(p.accountOwner),r=a.active[0],u=rarityBody(r);globalThis.qaCorpseUID=r.uid;die(u,null);die(u,null);`);
 assert.equal(current.run(`bloomCurrentEffects.filter(e=>e.type==='deathCapture').length`),1,'duplicate defeat does not replay death');
 transaction('owned revival retains entity and lock ownership',`const found=rarityRecord(qaCorpseUID);rarityRespawn(found.account,found.record);`);
 transaction('resident defeated reward and exact presentation order',`residentDie(residentUnit(),WorldPlayers.get('b').leader)`);
 assert(current.run(`residentState().status==='dead'&&Object.values(residentState().rewardLedger).every(e=>e.awarded)`));
 transaction('participant defeat',`PlayerLifecycle.defeat(WorldPlayers.get('b'),WorldPlayers.get('a').leader)`);
 assert(current.run(`WorldPlayers.data(WorldPlayers.get('b')).dead&&WorldPlayers.get('b').leader.primaryAttack.pending===null`));
 transaction('participant recovery',`PlayerLifecycle.recover(WorldPlayers.get('b'))`);
 assert(current.run(`!WorldPlayers.data(WorldPlayers.get('b')).dead&&WorldPlayers.get('b').leader.hp===WorldPlayers.get('b').leader.maxHp`));
 // Detach intentionally cancels both endpoint references; graceful leave only
 // expires that participant's shots and retains unrelated committed payloads.
 transaction('detach owner disposes shots, delayed events, and target refs',`const p=WorldPlayers.get('b');rarityAcquire(p.accountOwner,'swordsman',0,1);const r=rarityGetAccount(p.accountOwner).active.find(r=>r.type==='swordsman'),u=rarityBody(r),t=state.units.find(u=>u.qaOwner==='b');launchAbilityShot(t,1,{owner:u,speed:1,range:900});events.push({time:state.time+100,kind:'volley',unit:u.id,target:t.id,amount:1,splash:0,spread:0});globalThis.qaDetachedID=u.id;rarityDetach(new Set([u.id]));`);
 assert(current.run(`!state.units.some(u=>u.id===qaDetachedID)&&!projectiles.some(p=>p.u===qaDetachedID||p.target===qaDetachedID)&&!events.some(e=>e.unit===qaDetachedID||e.target===qaDetachedID)`));
 // The stopped detach fixture deliberately bypasses inventory accounting; keep
 // only the normal lifecycle policy under test, then return to valid authority.
 both(`const a=rarityGetAccount(WorldPlayers.get('b').accountOwner);a.active=a.active.filter(r=>r.entityId!==qaDetachedID);`);
 settle('detached inventory settled');
 both(`WorldMembership.apply({epoch:1,tick:bloomTick,players:['a']});`);settle('graceful participant leave');
 assert(current.run(`WorldPlayers.get('b').lifecycle==='left'&&WorldPlayers.get('b').leader.primaryAttack.pending===null&&!state.units.some(u=>u.playerId==='b')&&projectiles.filter(p=>p.playerId==='b').every(p=>p.finished)`));
 both('globalThis.qaFinalWire=bloomAdapter.save();bloomAdapter.load(qaFinalWire)');same('final restore');
 assert(current.run('bloomValidate(bloomCapture())'));
 // Native primary state is serialized; invalid namespaces, retired flat fields,
 // and method-shadowing keys are rejected before synchronous/cooperative install.
 const reserved=['moaCooldown','pendingMoa','moaTarget','attackPose','primaryAttack','initializePrimaryAttack','cancelPrimaryAttack','clearPrimaryTarget','firePrimaryAttack','tickPrimaryAttack'];
 for(const key of reserved){current.c.qaReserved=key;current.run(`globalThis.qaBad=(()=>{const c=BloomLiveCodec.decode(qaFinalWire);c.world.state.participants.a.leader[qaReserved]=true;return BloomLiveCodec.encode(c)})()`);assert.equal(current.run('bloomAdapter.validateSnapshot(qaBad)'),false,key);assert.throws(()=>current.run('bloomAdapter.prepareSnapshot(qaBad)'),/Invalid BLOOM/);assert.throws(()=>current.run('(()=>{const j=bloomAdapter.prepareSnapshotJob(qaBad);while(!j.done)j.pulse({budgetMs:0})})()'),/Invalid BLOOM/);assert.deepEqual(Buffer.from(current.run('bloomAdapter.save()')),Buffer.from(current.run('qaFinalWire')),key+' rejection preserves incumbent')}
 current.run(`globalThis.qaHeals=0;globalThis.qaOff=CombatHealth.onHealed(()=>qaHeals++);const m=state.mother;m.hp-=2;applyHealing(m,m.hp+1);qaOff();applyHealing(m,m.hp+1);`);assert.equal(current.run('qaHeals'),1,'owner occurrence subscription has explicit disposal');
 const source=fs.readFileSync(target,'utf8');
 for(const name of ['die','defeat','recover']){assert.equal((source.match(new RegExp('\\bfunction '+name+'\\(','g'))||[]).length,1,name+' stable entry');assert(!new RegExp('(?<![\\w.$])'+name+'\\s*=\\s*function\\b').test(source),name+' replaced historical layers removed')}
 assert(!/\bupdateMoa\b/.test(source),'retired single-player attack scheduler and captures removed');
 console.log(JSON.stringify({pass:true,baseline:engines[0].sha256,target:engines[1].sha256,bytesChecks,effectChecks,checks:['two independent actor attacks','native primary state and shared methods','exact health and death effects','confirmed rollback once-only','ratio/heal distinction','owned/resident/player lifecycle','detach versus leave','sync/cooperative method collisions','subscription disposal','dead chain removal']}));
}finally{both('bloomSession?.close()')}
