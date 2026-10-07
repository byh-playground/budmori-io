'use strict';
// One continuing actual-engine/SDK story. Optional first/second HTML arguments
// compare old/new full canonical bytes and every journal payload in order.
// Stopped setup is explicit; this is native engine coverage, not browser QA.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {engine}=require('./native-engine.cjs'),root=path.resolve(__dirname,'..');
const files=[process.argv[2]||root+'/index.html',process.argv[3]||root+'/index.html'],es=files.map(f=>engine(f)),candidate=es[1];
const report={baseline:es[0].sha256,target:es[1].sha256,bytes:0,effects:0,chapters:[]};
const both=code=>es.forEach(e=>e.run(`(()=>{${code}})()`));
function same(label){assert.deepEqual(Buffer.from(es[0].run('bloomAdapter.save()')),Buffer.from(es[1].run('bloomAdapter.save()')),label+' full bytes');assert.equal(es[0].run('JSON.stringify(bloomCurrentEffects)'),es[1].run('JSON.stringify(bloomCurrentEffects)'),label+' full effects/IDs/order');report.bytes++;report.effects++}
function transaction(label,code){both(`bloomCurrentEffects=[];bloomEventSequence=0;bloomInTick=true;try{${code}}finally{bloomInTick=false}rebuildGrid();spatialBoundary()`);same(label);report.chapters.push(label)}
function tick(label){both(`bloomAdapter.step({tick:bloomTick,tickRate:CONFIG.sim.tickRate,inputs:WorldPlayers.all().filter(p=>p.lifecycle==='active').map(p=>({playerId:p.playerId,input:bloomEncodeInput({x:0,y:0,manual:true}),commands:[]}))});qaConfirmed=Math.max(qaConfirmed,bloomTick-1);bloomCommitEffects(qaConfirmed)`);same(label)}
try{
 both(`CONFIG.session.mode='online';BloomSimulation.initialize(12345);WorldMembership.apply({epoch:0,tick:0,players:['a','b']});BloomSimulation.sessionConfig={mode:'online',persistence:'none'};
 const a=WorldPlayers.get('a'),b=WorldPlayers.get('b');Object.assign(b.leader,{x:a.leader.x+80,y:a.leader.y});constrainWorld(b.leader);
 for(const c of state.camps){c.enabled=false;c.spawned=true;c.regrowth=[]}for(const u of state.units){u.stun=1e6;u.aggroAt=u.wanderAt=state.time+1e6}
 for(const p of WorldPlayers.all()){p.auto.enabled=false;const abilities=WorldPlayers.data(p).campaign.abilities;abilities.level=8;abilities.xp=abilityThreshold(8);abilities.chosen=7;for(const id of Object.keys(CONFIG.weaponCards.weapons))abilities.ranks[id]=1;moaSyncLevelHP(p.leader);p.leader.hp=p.leader.maxHp}
 for(const type of ['swordsman','shellbug','dandelion','archer'])rarityAcquire(a.accountOwner,type,4,1);rarityRecall(a.accountOwner);
 for(const u of state.units.filter(u=>u.playerId==='a')){Object.assign(u,{x:a.leader.x+30,y:a.leader.y,stun:1e6});constrainWorld(u)}
 const t=spawn('shellbug','enemy',a.leader.x+75,a.leader.y,{camp:0,rarityGrade:1});t.hp=t.maxHp=1e7;t.stun=1e6;t.aggroAt=t.wanderAt=state.time+1e6;globalThis.qaTarget=t.id;state.camps[0].remaining++;
 globalThis.qaDelivered=[];globalThis.qaConfirmed=-1;bloomResetEventJournal();bloomEventSink=e=>qaDelivered.push(JSON.stringify(e));rebuildGrid();spatialBoundary()`);same('initial world');
 candidate.run(`globalThis.qaSignals=[];globalThis.qaOffs=[BasicAttack.onReleased(u=>qaSignals.push(['basic',u.id,bloomCurrentEffects.map(e=>e.type)])),PatternAttack.onBegan(u=>qaSignals.push(['begin',u.id,bloomCurrentEffects.map(e=>e.type)])),PatternAttack.onReleased(u=>qaSignals.push(['release',u.id,bloomCurrentEffects.map(e=>e.type)])),PatternAttack.onBlasted(u=>qaSignals.push(['blast',u.id,bloomCurrentEffects.map(e=>e.type)])),ResidentRewards.onAwarded(e=>qaSignals.push(['award',e.key,bloomCurrentEffects.map(e=>e.type)])),AbilityAttack.onLaunched((p,o)=>qaSignals.push(['ability',p.shotId,o.weapon||'primary'])),CommittedProjectiles.onHit((p,t)=>qaSignals.push(['seedHit',p.seedIndex,t.id])),CommittedProjectiles.onRecallWarned(p=>qaSignals.push(['recall',p.seedIndex])),CommittedProjectiles.onReturnStarted(p=>qaSignals.push(['return',p.seedIndex])),WorldBoss.onEngaged(u=>qaSignals.push(['engaged',u.id]))];`);
 transaction('basic windup',`const u=state.units.find(u=>u.playerId==='a'&&u.type==='swordsman');attack(u,idMap.get(qaTarget));`);
 assert.equal(candidate.run(`qaSignals.filter(s=>s[0]==='basic').length`),0,'windup is not a released attack');
 transaction('basic committed contact',`const u=state.units.find(u=>u.playerId==='a'&&u.type==='swordsman'),pending=u.pendingMelee;u.pendingMelee=null;attack(u,idMap.get(qaTarget),true,pending);`);
 assert.equal(candidate.run(`qaSignals.filter(s=>s[0]==='basic').length`),1);
 transaction('other active melee and ranged handlers',`for(const type of ['shellbug','dandelion','archer']){const u=state.units.find(u=>u.playerId==='a'&&u.type===type);attack(u,idMap.get(qaTarget),true)}`);
 assert.equal(candidate.run(`qaSignals.filter(s=>s[0]==='basic').length`),4);
 transaction('pattern cast and warning',`const u=state.units.find(u=>u.playerId==='a'&&u.type==='shellbug');u.stun=0;if(!beginAttackPattern(u,idMap.get(qaTarget),'groundBlast'))throw Error('Pattern fixture cannot begin');u.stun=1e6;globalThis.qaPattern=u.id;`);
 let n=0;while(candidate.run(`idMap.get(qaPattern).attackController.phase==='windup'`)&&n++<100)transaction('pattern windup '+n,`tickAttackPattern(idMap.get(qaPattern))`);
 assert.equal(candidate.run(`qaSignals.filter(s=>s[0]==='blast').length`),1);assert.equal(candidate.run(`qaSignals.filter(s=>s[0]==='release').length`),1);
 const blastSignal=candidate.json(`qaSignals.find(s=>s[0]==='blast')`),releaseSignal=candidate.json(`qaSignals.find(s=>s[0]==='release')`);
 assert(blastSignal[2].includes('addFx'),'blast subscriber journals before later observers');assert(releaseSignal[2].includes('soundCue'),'release audio follows execution');
 transaction('landed blast idempotence',`const u=idMap.get(qaPattern);patternBlast(u,u.attackController,patternConfig('groundBlast',u))`);
 assert.equal(candidate.run(`qaSignals.filter(s=>s[0]==='blast').length`),1,'landed guard owns one blast occurrence');
 transaction('three-payload auxiliary launch',`const m=WorldPlayers.get('a').leader,spec={...weaponStats('thorn',m),count:3};launchAbilityShot(idMap.get(qaTarget),1,{owner:m,weapon:'thorn',weaponSpec:spec,secondary:true,auxiliary:true});`);
 assert.equal(candidate.run(`qaSignals.filter(s=>s[0]==='ability').length`),1,'one launch occurrence despite a three-payload volley');
 transaction('manual resident encounter entry',`const p=WorldPlayers.get('a'),m=p.leader,u=residentUnit();globalThis.qaHome={x:m.x,y:m.y};u.stun=0;Object.assign(m,{x:u.x-90,y:u.y});constrainWorld(m);p.manualThisTick=true;p.stepStart={x:m.x-1,y:m.y};WorldBoss.before(WorldPlayers.all(),[],CONFIG.sim.fixedStep);if(!beginAttackPattern(u,m,residentPatternID))throw Error('Resident pattern cannot begin');globalThis.qaResident=u.id;`);
 assert.equal(candidate.run(`qaSignals.filter(s=>s[0]==='engaged').length`),1);
 n=0;while(candidate.run(`idMap.get(qaResident).attackController.phase==='windup'`)&&n++<100)transaction('resident windup '+n,`tickAttackPattern(idMap.get(qaResident))`);
 assert(candidate.run('projectiles.filter(p=>p.residentSeed).length===3'));
 n=0;while(candidate.run('projectiles.some(p=>p.residentSeed&&!p.finished)')&&n++<120)transaction('committed outbound and recall '+n,`for(const p of projectiles)if(p.residentSeed)stepGroundArc(p,CONFIG.sim.fixedStep)`);
 assert(n<120,'resident return payloads finish');assert.equal(candidate.run(`qaSignals.filter(s=>s[0]==='recall').length`),3);assert.equal(candidate.run(`qaSignals.filter(s=>s[0]==='return').length`),3);assert(candidate.run(`qaSignals.some(s=>s[0]==='seedHit')`),'actual committed seed hit publishes after damage');
 transaction('resident reward',`residentDie(residentUnit(),WorldPlayers.get('a').leader);const p=WorldPlayers.get('a');Object.assign(p.leader,qaHome);constrainWorld(p.leader);p.manualThisTick=false;`);
 assert.equal(candidate.run(`qaSignals.filter(s=>s[0]==='award').length`),1);
 transaction('awarded ledger retry',`for(const entry of Object.values(residentState().rewardLedger))residentAward(entry)`);
 assert.equal(candidate.run(`qaSignals.filter(s=>s[0]==='award').length`),1,'award occurrence follows only first successful ledger transition');
 // Cull keeps launched independent payloads even when source/target is removed;
 // delayed attacks and owner-bound controllers do not survive recycling.
 transaction('prepare distant cull references',`const m=WorldPlayers.get('a').leader,u=spawn('archer','enemy',m.x+10,m.y,{camp:0,rarityGrade:1});state.camps[0].remaining++;globalThis.qaCull=u.id;
 const payload=launchAbilityShot(idMap.get(qaTarget),3,{owner:u,speed:1,range:900});globalThis.qaPayload=payload.shotId;
 const incoming=launchAbilityShot(u,1,{owner:m,speed:1,range:900});globalThis.qaIncoming=incoming.shotId;
 const controlled=launchAbilityShot(idMap.get(qaTarget),1,{owner:u,speed:1,range:900});controlled.patternOwned=true;globalThis.qaControlled=controlled.shotId;
 events.push({time:state.time+100,kind:'volley',unit:u.id,target:qaTarget,amount:1,splash:0,spread:0},{time:state.time+100,kind:'volley',unit:m.id,target:u.id,amount:1,splash:0,spread:0});
 m.target=u.id;m.primaryAttack.targetId=u.id;m.primaryAttack.pending={target:u.id,left:1,total:1,angle:0};autoHunt.target=u.id;
 const v=state.units.find(v=>v.playerId==='a');v.target=u.id;v.pendingMelee={target:u.id,left:1,total:1,aimX:u.x,aimY:u.y};
 const points=[{x:200,y:200},{x:4700,y:200},{x:200,y:4700},{x:4700,y:4700}],far=points.sort((x,y)=>Math.min(...worldHumanInterests().map(p=>sqdist(y,p.leader)))-Math.min(...worldHumanInterests().map(p=>sqdist(x,p.leader))))[0];Object.assign(u,far);constrainWorld(u);globalThis.qaCullBefore={culled:wildRingEnsureState().culled,hp:u.hp,dead:u.deadEffect,kills:WorldPlayers.data(WorldPlayers.get('a')).kills.slice(),ledger:JSON.stringify(residentState().rewardLedger)};`);
 both(`globalThis.qaCullRef=idMap.get(qaCull);globalThis.qaPayloadWire=JSON.stringify(projectiles.find(p=>p.shotId===qaPayload));globalThis.qaIncomingWire=JSON.stringify(projectiles.find(p=>p.shotId===qaIncoming));`);
 transaction('cull is disposal without defeat',`wildRingCull()`);
 assert(candidate.run(`!state.units.some(u=>u.id===qaCull)&&!idMap.has(qaCull)&&qaCullRef.hp===qaCullBefore.hp&&qaCullRef.deadEffect===qaCullBefore.dead`));
 assert(candidate.run(`JSON.stringify(projectiles.find(p=>p.shotId===qaPayload))===qaPayloadWire&&JSON.stringify(projectiles.find(p=>p.shotId===qaIncoming))===qaIncomingWire&&!projectiles.some(p=>p.shotId===qaControlled)`));
 assert(candidate.run(`!events.some(e=>e.unit===qaCull||e.target===qaCull)&&[...WorldPlayers.all().map(p=>p.leader),...state.units].every(u=>u.target!==qaCull&&u.primaryAttack?.targetId!==qaCull&&u.pendingMelee?.target!==qaCull&&u.primaryAttack?.pending?.target!==qaCull)&&autoHunt.target!==qaCull`));
 assert(candidate.run(`!bloomCurrentEffects.length&&JSON.stringify(WorldPlayers.data(WorldPlayers.get('a')).kills)===JSON.stringify(qaCullBefore.kills)&&JSON.stringify(residentState().rewardLedger)===qaCullBefore.ledger`),'cull has no death, kill, reward or effect occurrence');
 both('globalThis.qaSaved=bloomAdapter.save();bloomAdapter.load(qaSaved)');same('post-cull live restore');assert(candidate.run('bloomValidate(bloomCapture())'));
 // Explicit ordering and unsubscribe are confined to this owner and do not
 // allocate functions on units or copy them into snapshot state.
 candidate.run(`globalThis.qaOrder=[];globalThis.qaOffFirst=BasicAttack.onReleased(()=>qaOrder.push(1));globalThis.qaOffSecond=BasicAttack.onReleased(()=>qaOrder.push(2));`);
 transaction('subscription insertion order',`const u=state.units.find(u=>u.playerId==='a'&&u.type==='archer');attack(u,idMap.get(qaTarget),true)`);
 assert.deepEqual(candidate.json('qaOrder'),[1,2]);candidate.run('qaOffFirst();qaOffFirst();qaOrder=[]');
 transaction('unsubscribe is idempotent',`const u=state.units.find(u=>u.playerId==='a'&&u.type==='archer');attack(u,idMap.get(qaTarget),true)`);
 assert.deepEqual(candidate.json('qaOrder'),[2]);candidate.run('qaOffSecond();qaOffs.forEach(off=>off())');
 both('globalThis.qaCheckpoint=bloomAdapter.save()');const replay=[];
 for(let i=0;i<50;i++){tick('continuing combat '+i);replay.push(candidate.run('JSON.stringify(bloomCurrentEffects)'))}
 const delivered=es.map(e=>e.run('qaDelivered.length'));both('bloomAdapter.load(qaCheckpoint)');
 for(let i=0;i<50;i++){tick('replay '+i);assert.equal(candidate.run('JSON.stringify(bloomCurrentEffects)'),replay[i])}
 es.forEach((e,i)=>assert.equal(e.run('qaDelivered.length'),delivered[i],'confirmed journal delivered exactly once through rollback'));
 transaction('participant leave disposes inventory account',`WorldMembership.apply({epoch:1,tick:bloomTick,players:['a']})`);
 assert(candidate.run(`WorldPlayers.get('b').lifecycle==='left'&&!rarityGetAccount(WorldPlayers.get('b').accountOwner)`));
 both('globalThis.qaFinal=bloomAdapter.save();bloomAdapter.load(qaFinal)');same('final roundtrip');assert(candidate.run('bloomValidate(bloomCapture())'));
 assert(candidate.run("['attack','resolveBasicAttack','basicMeleeAttack','beginAttackPattern','tickAttackPattern','patternBlast','residentAward'].every(name=>typeof globalThis[name]==='function')"),'legacy global entry bindings stay callable');
 const source=fs.readFileSync(files[1],'utf8');
 for(const owner of ['BasicAttack','PatternAttack','ResidentRewards','AbilityAttack','CommittedProjectiles','WorldBoss']){const start=source.indexOf('const '+owner+'=(()=>'),end=source.indexOf('\n})();',start),body=source.slice(start,end);assert(start>=0&&end>start,owner+' actual owner');assert(!/\b(?:addFx|soundCue|bloomEmit)\(/.test(body)&&!body.includes('CombatAudio.'),owner+' publishes occurrences without presentation selection')}
 assert(!/sound(?:Launch|BeginPattern|TickPattern)\b/.test(source));assert(!/delete state\.rarityAccounts\[player\.accountOwner\]/.test(source));
 report.pass=true;console.log(JSON.stringify(report));
}finally{both('bloomSession?.close()')}
