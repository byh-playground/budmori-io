'use strict';
// Usage: node tests/shared-validation.cjs [candidate.html] [--sdk=/path/to/rollback-netcode.js]
// The optional SDK override is local-only, bundled in memory; no pin/cache edits.
const fs=require('fs'),assert=require('assert');
const {engine}=require('./native-engine.cjs');
const {candidate}=require('./shared-harness.cjs'),source=candidate();
const e=engine(source.file,source.html);
// Production validator, no validator reinjection. All mutations below are negative test fixtures.
function check(label){assert.equal(e.run('worldPlayersValidate(state)'),true,label);console.log('PASS valid',label)}
e.run(`BloomSimulation.initialize(12345);`);check('legacy unbound');e.run('globalThis.savedLegacy=bloomAdapter.save()');
e.run(`WorldPlayers.bindInitial('solo');`);check('bound local');
e.run(`CONFIG.session.mode='online';BloomSimulation.initialize(12345);WorldMembership.apply({epoch:0,tick:0,players:['owner','peer','third','fourth','fifth']});bloomInTick=true;bloomCurrentEffects=[];`);check('5 participant admission');
e.run(`for(const p of WorldPlayers.all())rarityAcquire(p.accountOwner,'swordsman',1,1);`);check('5 owned armies');
e.run(`for(let i=0;i<30;i++)WorldSimulation.step(CONFIG.sim.fixedStep,new Map(WorldPlayers.all().map(p=>[p.playerId,{x:0,y:0,manual:true}])));`);check('30 simulated ticks');
e.run(`const peer=WorldPlayers.get('peer');peer.data.campaign.abilities.xp=abilityThreshold(4);peer.data.campaign.abilities.level=4;moaSyncLevelHP(peer.leader);PlayerProgression.abilityDraft(peer);`);check('peer ability draft');
e.run(`PlayerProgression.abilityChoice(peer,peer.data.campaign.abilities.draft.ids[0],peer.data.campaign.abilities.chosen);`);check('peer ability choice');
e.run(`PlayerController.point(peer,Math.round((peer.leader.x+100)*CONFIG.pointMove.quantum),Math.round(peer.leader.y*CONFIG.pointMove.quantum),true);`);check('peer navigation and roll');
e.run(`PlayerLifecycle.defeat(peer,null);`);check('peer defeated');
e.run(`PlayerLifecycle.recover(peer);`);check('peer recovered');
e.run(`const corpse=state.units.find(u=>u.playerId==='peer');rarityKillOwned(corpse,null);`);check('owned troop corpse');
e.run(`globalThis.savedValid=BloomLiveCodec.encode(bloomCapture());`);
const negatives=[
 ['empty table','s.participants={}'],
 ['null table','s.participants=null'],
 ['key id mismatch','p.playerId="wrong"'],
 ['account positive','p.accountOwner=10'],
 ['duplicate account','p.accountOwner=-1'],
 ['invalid lifecycle','p.lifecycle="rogue"'],
 ['future admission','p.admission=s.membershipEpoch+1'],
 ['bad next id','s.nextPlayerEntity=-2'],
 ['bad membership epoch','s.membershipEpoch=1.1'],
 ['missing primary','delete s.participants.owner'],
 ['primary not root mother','s.participants.owner.leader={...s.mother}'],
 ['secondary null data','p.data=null'],
 ['secondary world data','p.data=s'],
 ['secondary mother detached','p.data.mother={...p.leader}'],
 ['duplicate leader player id','p.leader.playerId="owner"'],
 ['human as rival','p.leader.rivalLeader=true'],
 ['bad leader hp','p.leader.hp=-5'],
 ['dead hp inconsistency','p.data.dead=true'],
 ['hp exceeds max','p.leader.hp=p.leader.maxHp+1'],
 ['wrong level max hp','p.leader.maxHp+=1'],
 ['nonfinite x','p.leader.x=Infinity'],
 ['invalid ability level','p.data.campaign.abilities.level=-5'],
 ['invalid ability ledger','p.data.campaign.abilities.chosen+=1'],
 ['invalid growth ledger','p.data.campaign.growthCards.choices+=1'],
 ['missing stats','delete p.data.stats'],
 ['missing stat','delete p.data.stats.attacks'],
 ['negative wallet','p.data.minerals=-1'],
 ['bad collection owner value','p.data.campaign.collection.swordsman=-1'],
 ['bad hunt view','p.data.campaign.huntView.halfWidth=-1'],
 ['bad mode','p.data.campaign.permanents.mode="attack"'],
 ['missing nav','delete p.navigation'],
 ['nav index out of range','p.navigation={goal:{x:1,y:2},waypoints:[],index:0,stuckMs:0,best:1}'],
 ['nav path with absent goal','p.navigation.waypoints=[{x:1,y:2}]'],
 ['negative nav time','p.navigation.stuckMs=-1'],
 ['bad auto timer','p.auto.idleMs=-1'],
 ['unknown auto target','p.auto.target=-99'],
 ['bad automatic flag','p.auto.enabled="yes"'],
 ['bad leader target','p.leader.moaTarget=-99'],
 ['bad pending attack','p.leader.pendingMoa={target:0,ranged:true,left:1,total:1,angle:0}'],
 ['unknown channel weapon','p.leader.gearChannels={fake:1}'],
 ['bad auxiliary time','p.leader.auxCooldowns={beam:-1}'],
 ['bad scheduled timer','p.leader.auxScheduleMs={beam:{nextFireMs:Infinity,displaySeconds:0,readyIdle:false}}'],
 ['cross-player progression alias','p.data.campaign=s.participants.third.data.campaign'],
 ['cross-player controller alias','p.auto=s.participants.third.auto'],
 ['world object smuggled into controller','p.navigation.world=s'],
 ['cross-player unit','s.units.find(u=>u.playerId==="third").playerId="peer"'],
 ['ownerless friendly','delete s.units.find(u=>u.playerId==="third").playerId'],
 ['friendly unit rival flag','s.units.find(u=>u.playerId==="third").rivalOwner=10'],
 ['negative unit entity','s.units.find(u=>u.playerId==="third").id=-99'],
 ['missing rarity account','delete s.rarityAccounts[String(p.accountOwner)]'],
 ['unknown negative rarity account','s.rarityAccounts["-99"]={owner:-99,active:[]}'],
 ['cross-player corpse','s.rarityAccounts[String(p.accountOwner)].active.find(r=>r.body).body.playerId="third"']
];
for(const [label,code]of negatives){const result=e.run(`(()=>{const before=BloomOwnedSDK.hashBytes(bloomAdapter.save()),c=BloomLiveCodec.decode(savedValid),s=c.world.state,p=s.participants.peer;${code};const players=WorldPlayers.validate(s),snapshot=bloomValidate(c);let rejected=false;try{const bytes=BloomLiveCodec.encode(c);if(bloomAdapter.validateSnapshot(bytes))throw new Error('validator accepted corruption');try{bloomAdapter.load(bytes)}catch{rejected=true}}catch(error){if(error.message==='validator accepted corruption')throw error;rejected=true}return{players,snapshot,rejected,unchanged:before===BloomOwnedSDK.hashBytes(bloomAdapter.save())}})()`);assert.equal(result.players,false,label);assert.equal(result.snapshot,false,label+' full snapshot');assert(result.rejected,label+' invalid load rejected');assert(result.unchanged,label+' invalid load is atomic');}
console.log(`PASS ${negatives.length} negative shared-state cases`);
// Schema pairing belongs in bloomValidate, because state does not contain it.
const paired=e.run(`(()=>{const c=BloomLiveCodec.decode(savedValid),old=BloomLiveCodec.decode(savedLegacy);const fresh=bloomValidate(c),legacy=bloomValidate(old);c.schema='bloom-webgl-live-ms-v2';const mismatch=bloomValidate(c);old.schema='bloom-webgl-shared-ms-v3';return{fresh,mismatch,legacy,missing:bloomValidate(old)}})()`);
assert.equal(paired.fresh,true);assert.equal(paired.mismatch,false);assert.equal(paired.legacy,true);assert.equal(paired.missing,false);console.log('PASS explicit schema pairing');
// Legacy -> shared schema migration is semantic, not unchanged bytes. Read the
// committed original save, then assert all earned player progression survives
// production load and local-session binding. Membership necessarily adds fields.
const legacy=JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'fixtures/v63-compatibility.json'),'utf8'));
const migrate=engine(source.file,source.html);migrate.c.qaDisk=legacy.disk;
migrate.run(`CONFIG.session.mode='local';BloomSimulation.initialize(12345);`);
assert.equal(migrate.run('load(qaDisk)'),true,'original v63 fixture imports');
const projection=`(()=>{const d=state;return{time:d.time,minerals:d.minerals,gas:d.gas,upgrades:d.upgrades,unlocked:d.unlocked,cards:d.cards,kills:d.kills,deaths:d.deaths,stats:d.stats,abilities:d.campaign.abilities,growth:d.campaign.growthCards,collection:d.campaign.collection,permanents:d.campaign.permanents,rarity:d.rarityAccounts,mother:{hp:d.mother.hp,maxHp:d.mother.maxHp,x:d.mother.x,y:d.mother.y}}})()`;
const beforeMigration=migrate.json(projection);
migrate.c.qaOriginalBytes=Uint8Array.from(Buffer.from(JSON.parse(legacy.disk).live,'base64'));migrate.run('globalThis.qaOriginal=BloomLiveCodec.decode(qaOriginalBytes).world.state');
assert.deepEqual(beforeMigration,migrate.json(projection.replace('const d=state','const d=qaOriginal')),'production import preserves original recorded progression');
migrate.run("BloomSimulation.createSession({sessionConfig:{mode:'local',persistence:'solo'}})");
// Friendly bodies acquire their new owner tag while all earned values survive.
const afterMigration=migrate.json(projection);
for(const accounts of [beforeMigration.rarity,afterMigration.rarity])for(const account of Object.values(accounts))for(const record of account.active||[])if(record.body)delete record.body.playerId;
assert.deepEqual(afterMigration,beforeMigration,'all earned progression and combat wounds survive shared binding');
assert(migrate.run("WorldPlayers.local().playerId==='solo'&&WorldPlayers.local().leader===state.mother"));
assert(migrate.run('bloomAdapter.validateSnapshot(bloomAdapter.save(),{tick:0})'));
migrate.run('bloomSession.close()');console.log('PASS original v63 progression survives production load and shared-session binding');
// Continuing the valid five-player state stresses ownership validation during
// real combat/auxiliary weapon state changes, rather than only static examples.
e.run(`bloomInTick=false;CONFIG.session.mode='online';BloomSimulation.initialize(12345);WorldMembership.apply({epoch:0,tick:0,players:['owner','peer','third','fourth','fifth']});bloomInTick=true;bloomCurrentEffects=[];
for(const p of WorldPlayers.all()){const a=WorldPlayers.data(p).campaign.abilities;a.xp=abilityThreshold(8);a.level=8;a.chosen=7;for(const id of Object.keys(CONFIG.weaponCards.weapons))a.ranks[id]=1;moaSyncLevelHP(p.leader);rarityAcquire(p.accountOwner,'archer',1,2);const t=spawn('swordsman','enemy',p.leader.x+100,p.leader.y,{rarityGrade:3});t.aggroAt=0;}`);
assert(e.run('bloomValidate(bloomCapture())'));
for(let i=0;i<200;i++){e.run(`WorldSimulation.step(CONFIG.sim.fixedStep,new Map(WorldPlayers.all().filter(p=>p.lifecycle==='active').map(p=>[p.playerId,{x:0,y:0,manual:true}])));`);if(i%10===0)assert(e.run('bloomValidate(bloomCapture())'),`shared combat validator at tick ${i}`)}
e.run('bloomInTick=false');console.log('PASS 200 actual shared-world combat ticks with five armies and seven auxiliary weapon families');
// Real special/NPC target selection uses the separate negative leader IDs too.
const targeted=engine(source.file,source.html);
targeted.run(`CONFIG.session.mode='online';BloomSimulation.initialize(12345);WorldMembership.apply({epoch:0,tick:0,players:['a','b']});BloomSimulation.sessionConfig={mode:'online',persistence:'none'};bloomInTick=true;bloomCurrentEffects=[];
 const a=WorldPlayers.get('a'),b=WorldPlayers.get('b');Object.assign(b.leader,{x:a.leader.x+120,y:a.leader.y});constrainWorld(b.leader);rarityAcquire(a.accountOwner,'swordsman',3,1);const troop=state.units.find(u=>u.playerId==='a');troop.x=a.leader.x+40;troop.y=a.leader.y;troop.query=0;troop.target=b.leader.id;rebuildGrid();spatialBoundary();globalThis.started=beginAttackPattern(troop,b.leader,'dash');globalThis.specialTroop=troop;
 const npc=spawn('swordsman','enemy',a.leader.x+220,a.leader.y,{camp:0,variant:'rival'});if(!npc.rivalLeader)throw Error('Expected real rival fixture');rarityRivalAI(npc).targetId=b.leader.id;rarityRivalAI(npc).avoidId=b.leader.id;globalThis.targetingNPC=npc;rebuildGrid();spatialBoundary();`);
assert(targeted.run('started'),'actual special begins against secondary human');
assert(targeted.run('specialTroop.attackController.targetId===-2'));
assert(targeted.run('bloomAdapter.validateSnapshot(bloomAdapter.save(),{tick:bloomTick})'),'secondary target checkpoint validates');
const goodTarget=Buffer.from(targeted.run('bloomAdapter.save()'));targeted.c.targetBytes=new Uint8Array(goodTarget);targeted.run('bloomAdapter.load(targetBytes)');assert.deepEqual(Buffer.from(targeted.run('bloomAdapter.save()')),goodTarget);
for(const field of ['special','npc']){targeted.c.targetBytes=new Uint8Array(goodTarget);const invalid=targeted.run(`(()=>{const c=BloomLiveCodec.decode(targetBytes),s=c.world.state;if(${JSON.stringify(field)}==='special')s.units.find(u=>u.playerId==='a').attackController.targetId=s.nextPlayerEntity-1;else s.units.find(u=>u.rivalLeader).rival.ai.targetId=s.nextPlayerEntity-1;return BloomLiveCodec.encode(c)})()`);targeted.c.badTarget=invalid;assert.equal(targeted.run('bloomAdapter.validateSnapshot(badTarget,{tick:bloomTick})'),false,'unallocated negative '+field+' target rejected');}
for(let i=0;i<20;i++){targeted.run(`bloomAdapter.step({tick:bloomTick,tickRate:CONFIG.sim.tickRate,inputs:WorldPlayers.all().map(p=>({playerId:p.playerId,input:bloomEncodeInput({x:0,y:0,manual:true}),commands:[]}))})`);assert(targeted.run('bloomAdapter.validateSnapshot(bloomAdapter.save(),{tick:bloomTick})'));}
console.log('PASS actual special and NPC targeting secondary humans survive checkpoints and future ticks; unallocated targets rejected');
// Actor-owned combat counters and upgrade reads. The fixture uses real combat,
// support and auxiliary entrypoints, then validates and replays the saved graph.
const ownership=engine(source.file,source.html);
ownership.run(`CONFIG.session.mode='online';BloomSimulation.initialize(31415);WorldMembership.apply({epoch:0,tick:0,players:['owner','peer']});BloomSimulation.sessionConfig={mode:'online',persistence:'none'};bloomInTick=true;bloomCurrentEffects=[];
 const owner=WorldPlayers.get('owner'),peer=WorldPlayers.get('peer');
 for(const c of state.camps){c.enabled=false;c.spawned=true;c.regrowth=[]}
 const peerData=WorldPlayers.data(peer),ownerData=WorldPlayers.data(owner);
 ownerData.upgrades.ability=0;peerData.upgrades.ability=2;
 const center=ThemedTerrain.safePoint(peer.leader.x+40,peer.leader.y,20);
 function actor(type,playerId,offset=0){const u=spawn(type,playerId?'friendly':'enemy',center.x+offset,center.y,{...(playerId?{playerId}:{}),rarityGrade:0});u.stun=0;u.cooldown=0;u.aggroAt=u.wanderAt=state.time+1e6;return u}
 const archer=actor('archer','peer'),target=actor('shellbug',null,40);target.hp=target.maxHp=1e6;
 const counter=()=>WorldPlayers.all().map(p=>({...WorldPlayers.data(p).stats}));
 globalThis.combatOwnership={};let before=counter();rebuildGrid();attack(archer,target);combatOwnership.basic={before,after:counter()};
 archer.pendingMelee=null;before=counter();attack(target,archer);combatOwnership.npc={before,after:counter()};target.pendingMelee=null;
 before=counter();peer.leader.shield=1;peer.leader.shieldUntil=state.time+1;damage(target,peer.leader,10);combatOwnership.shield={before,after:counter(),left:peer.leader.shield};
 before=counter();target.shield=1;target.shieldUntil=state.time+1;damage(archer,target,10,'ranged');combatOwnership.npcShield={before,after:counter(),left:target.shield};
 const air=actor('flowerbee',null,45);air.hp=air.maxHp=1e6;before=counter();damage(archer,air,10,'ranged');combatOwnership.air={before,after:counter()};
 const medic=actor('medic','peer',-10);peer.leader.hp-=20;before=counter();support(medic,CONFIG.sim.fixedStep);combatOwnership.heal={before,after:counter(),amount:unitDef('medic').healAmount*(1+peerData.upgrades.ability*CONFIG.economy.abilityPerLevel)};
 const siege=actor('siege','peer');before=counter();basicRangedAttack(siege,target,unitDef('siege'),5,1,null);combatOwnership.siege={before,after:counter(),knock:projectiles.at(-1).knock,expectedKnock:unitDef('siege').impactKnockbackDistance};
 const chain=actor('chainflower','peer');before=counter();basicChainAttack(chain,target,{...unitDef('chainflower'),chainBounces:0},5,1,null);combatOwnership.chain={before,after:counter()};
 const a=peerData.campaign.abilities;a.xp=abilityThreshold(2);a.level=2;a.chosen=1;a.ranks.pod=1;moaSyncLevelHP(peer.leader);peer.leader.auxCooldowns={pod:0};peer.leader.auxScheduleMs={};before=counter();weaponUpdateAux(peer.leader,CONFIG.sim.fixedStep,target);combatOwnership.aux={before,after:counter()};
 const ownerSkirmisher=actor('skirmisher','owner'),peerSkirmisher=actor('skirmisher','peer'),wildSiege=actor('siege',null);
 combatOwnership.upgrade={owner:knockbackProjectileModifiers(ownerSkirmisher).knock,peer:knockbackProjectileModifiers(peerSkirmisher).knock,wild:deployedProjectileModifiers(wildSiege,unitDef('siege')).knock,expected:CONFIG.combat.meleeKnockback};
 state.rng=1;const ownerShock=shockProjectileModifiers(ownerSkirmisher,unitDef('medic'));state.rng=1;const peerShock=shockProjectileModifiers(medic,unitDef('medic'));combatOwnership.shock={owner:ownerShock,peer:peerShock,expected:unitDef('medic').basicAttack.variants[0].attack};
 ownerData.upgrades.ability=7;peerData.upgrades.ability=0;
 combatOwnership.upgradeAfterSwap={owner:knockbackProjectileModifiers(ownerSkirmisher).knock,peer:knockbackProjectileModifiers(peerSkirmisher).knock,wild:deployedProjectileModifiers(wildSiege,unitDef('siege')).knock};
 // Explicit defender attribution: the attacker's/root upgrade cannot protect a peer tank.
 const tank=actor('tank','peer'),d=unitDef('tank');combatOwnership.mitigation={without:upgradedRangedMitigation(100,ownerSkirmisher,tank,d,true)};peerData.upgrades.ability=1;combatOwnership.mitigation.with=upgradedRangedMitigation(100,ownerSkirmisher,tank,d,true);combatOwnership.mitigation.expected=100*d.abilityRangedReduction/d.rangedReduction;
 for(const u of state.units){u.stun=1e6;u.pendingMelee=null;u.cooldown=1e6}rebuildGrid();spatialBoundary();bloomInTick=false;`);
const attribution=ownership.json('combatOwnership');
function onlyPeer(label,key,amount){const x=attribution[label];assert.deepEqual(x.after[0],x.before[0],label+' cannot write the primary participant');const expected={...x.before[1],[key]:x.before[1][key]+amount};assert.deepEqual(x.after[1],expected,label+' accrues only to its owning participant')}
onlyPeer('basic','attacks',1);onlyPeer('shield','shieldsBlocked',1);onlyPeer('air','airHits',1);onlyPeer('heal','healing',attribution.heal.amount);onlyPeer('siege','deployShots',1);onlyPeer('chain','chainHits',1);onlyPeer('aux','attacks',1);
for(const label of ['npc','npcShield'])assert.deepEqual(attribution[label].after,attribution[label].before,label+' has no participant statistics owner');
assert.equal(attribution.shield.left,0);assert.equal(attribution.npcShield.left,0);assert.equal(attribution.siege.knock,attribution.siege.expectedKnock);
assert.deepEqual(attribution.shock.owner,{arc:0,knock:0});assert.deepEqual(attribution.shock.peer,{arc:attribution.shock.expected.arcHeight,knock:attribution.shock.expected.knockbackDistance});
assert.deepEqual(attribution.upgrade,{owner:0,peer:attribution.upgrade.expected,wild:0,expected:attribution.upgrade.expected});
assert.deepEqual(attribution.upgradeAfterSwap,{owner:attribution.upgrade.expected,peer:0,wild:0});
assert.equal(attribution.mitigation.without,100);assert.equal(attribution.mitigation.with,attribution.mitigation.expected);
assert(ownership.run('bloomAdapter.validateSnapshot(bloomAdapter.save(),{tick:bloomTick})'),'correctly attributed counters preserve the snapshot contract');
const ownershipRestore=engine(source.file,source.html),checkpoint=ownership.run('bloomAdapter.save()');ownershipRestore.c.checkpoint=checkpoint;ownershipRestore.run("CONFIG.session.mode='online';BloomSimulation.initialize(31415);BloomSimulation.sessionConfig={mode:'online',persistence:'none'};bloomAdapter.load(checkpoint)");
for(let i=0;i<5;i++)for(const x of [ownership,ownershipRestore])x.run("bloomAdapter.step({tick:bloomTick,tickRate:CONFIG.sim.tickRate,inputs:WorldPlayers.all().map(p=>({playerId:p.playerId,input:bloomEncodeInput({x:0,y:0,manual:true}),commands:[]}))})");
assert.deepEqual(Buffer.from(ownership.run('bloomAdapter.save()')),Buffer.from(ownershipRestore.run('bloomAdapter.save()')),'owner-attributed stats and upgrades survive restore and future input');
console.log('PASS basic/support/shield/air/chain/siege/auxiliary ownership, NPC isolation, asymmetric upgrade reads, and restored continuation');
