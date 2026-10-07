const fs=require('fs'),assert=require('assert'),path=require('path');
const {engine}=require('./native-engine.cjs');
const file=path.resolve(process.argv[2]||path.join(__dirname,'../index.html')),e=engine(file);
e.run('BloomSimulation.initialize(12345);playing=true;paused=false;modalKind="";view.x=state.mother.x;view.y=state.mother.y;view.w=2000;view.h=2000;');
let now=100;e.c.performance={now:()=>now};
e.run('BLOOM_HEADLESS=false;resetPresentation();');
const x=e.run('state.mother.x');
now=200;e.run('state.mother.x+=100;state.time+=.1;capturePresentation();');
function pose(t){now=t;e.run('presentation.frameNow=performance.now();presentation.frameSerial++;presentation.active=true');return e.json('({...presentationPose(state.mother)})')}
assert.equal(pose(250).x,x+50);
now=275;e.run('state.mother.x+=100;state.time+=.1;capturePresentation();');
assert.equal(pose(275).x,x+75,'retarget begins at receipt-time curve, not last RAF');
assert.equal(pose(300).x,x+106.25);
const before=pose(310);e.run('CombatFeedback.time=1;CombatFeedback.hit(state.mother,20,false,false,{kind:"melee"});');
const hit=pose(310);assert.equal(hit.x,before.x,'hitstop cannot snap XYZ to new authoritative target');
assert(pose(320).x>hit.x,'hitstop continues spatial interpolation');
now=330;e.run('state.mother.primaryAttack.pose.leftSeconds=.3;state.mother.primaryAttack.pending={left:.5,total:.5};state.time+=.1;capturePresentation()');
const attack=pose(330);e.run('CombatFeedback.clear()');const clear=pose(330);assert.equal(clear.primaryAttack.pose.leftSeconds,.3,'new attack decay snaps independently');assert.equal(clear.primaryAttack.pending.left,.5);
// Pending component identity resets its timer without snapping the body curve.
const nextBefore=pose(350);now=350;e.run('state.mother.primaryAttack.pending={left:.4,total:.4};state.time+=.1;capturePresentation()');
const nextAttack=pose(350);assert.equal(nextAttack.x,nextBefore.x);assert.equal(nextAttack.primaryAttack.pending.left,.4);
assert(e.run('!Object.hasOwn(presentationPose(state.mother),"attackPose")'),'leaders do not acquire a flat render attack alias');
e.run('globalThis.qaPrimaryPose=presentationPose(state.mother);globalThis.qaPrimaryHold=CombatFeedback.copy(qaPrimaryPose)');
assert.equal(e.run('qaPrimaryHold.primaryAttack.pending.left'),.4);
assert.throws(()=>e.run('qaPrimaryPose.primaryAttack.cooldown.leftSeconds=999'),/Presentation cannot mutate/);
e.run('qaPrimaryPose.primaryAttack.pending.left=.123');assert.equal(e.run('state.mother.primaryAttack.pending.left'),.4);
e.run('CombatFeedback.records.set(state.mother.id,{holdUntil:100,pose:qaPrimaryHold});CombatFeedback.time=1;state.mother.cancelPrimaryAttack();capturePresentation();presentation.frameSerial++');
assert.equal(pose(350).primaryAttack.pending,null,'held pending animation cannot resurrect a cancelled primary attack');
e.run('CombatFeedback.clear()');
console.log('PASS receipt continuity, native primary animation-only hitstop, scalar stage reset and cancellation');

e.run("presentation.active=false;healingCredit({id:999999,type:'swordsman',team:'friendly',x:state.mother.x,y:state.mother.y,z:state.mother.z,size:18},5)");
assert(e.run("Number.isFinite(projectionBodyPose({type:'swordsman',x:10,y:20,z:0}).x)"));
console.log('PASS delayed healing for a removed actor has a finite frozen XYZ anchor');
// Main-thread render poses must not expose writable nested authority aliases.
e.run('presentation.active=true;state.mother.qaVisual={nested:{value:7},list:[1,2]};capturePresentation();presentation.frameNow=performance.now();presentation.frameSerial++;');
assert.throws(()=>e.run('presentationPose(state.mother).qaVisual.nested.value=99'),/Presentation cannot mutate/);
assert.throws(()=>e.run('presentationPose(state.mother).qaVisual.list.push(3)'),/Presentation cannot mutate/);
assert.equal(e.run('state.mother.qaVisual.nested.value'),7);
e.run('presentationPose(state.mother).x=123');assert.notEqual(e.run('state.mother.x'),123);
console.log('PASS readonly nested visual descriptors and separately writable scalar pose');
// WorldUI.anchor receives an already sampled actor pose while hitstop is active.
e.run('delete state.mother.qaVisual;presentation.active=true;capturePresentation();presentation.frameSerial++;globalThis.qaSampled=presentationPose(state.mother);CombatFeedback.records.set(state.mother.id,{holdUntil:100,pose:{movePhase:2}});CombatFeedback.time=1;');
assert(e.run('presentationPose(qaSampled)===qaSampled'));
assert(e.run('Number.isFinite(WorldUI.anchor(qaSampled).x)'));
console.log('PASS recursive world-UI pose lookup retains presentation-owned identity during hitstop');
// Roll capability participates in the actual nested interpolation/hitstop path.
e.run('CombatFeedback.clear();state.mother.startRoll({x:1,y:0},1000);state.mother.moveRoll(.1);state.time+=.1;capturePresentation();presentation.frameNow=performance.now();presentation.frameSerial++;globalThis.qaRollPose=presentationPose(state.mother);globalThis.qaHeldRoll=CombatFeedback.copy(qaRollPose);');
assert(e.run('qaHeldRoll.roll.leftMs>0&&qaHeldRoll.roll.direction.x===1&&Number.isFinite(MoaRollVisual.angle({roll:qaHeldRoll.roll}))&&Number.isFinite(MoaRollVisual.squash({roll:qaHeldRoll.roll}))'));
assert.throws(()=>e.run('qaHeldRoll.roll.direction.x=0'),/Presentation cannot mutate/);
assert.equal(e.run('MoaRollVisual.squash({type:"mother",hp:0})'),1);
assert.equal(e.run('MoaRollVisual.squash({rivalLeader:true})'),1);
e.run('bloomInTick=true;bloomCurrentEffects=[];emitMoaRollTrail(state.mother);bloomInTick=false;emitMoaRollTrail(bloomCurrentEffects[0].args[0]);');
assert(e.run('moaRollFX.pool.some(p=>p.at===state.time&&p.dx===1)'));
console.log('PASS roll interpolation/hitstop, noncapable visual records and queued trail projection');

// Native motion state remains compatible with recursive readonly proxies.
e.run("globalThis.qaOwned=spawn('siege','friendly',state.mother.x+30,state.mother.y,{rarityGrade:3});globalThis.qaOwnedView=bloomVisualReadonly(qaOwned)");
assert(e.run('Number.isFinite(qaOwnedView.attackController.timer.leftMs)&&qaOwnedView.movement.homePhase==="active"'));
assert.throws(()=>e.run('qaOwnedView.attackController.timer.leftMs=1'),/Presentation cannot mutate/);
assert.throws(()=>e.run('qaOwnedView.movement.intent="return"'),/Presentation cannot mutate/);
assert.equal(e.run('bloomVisualReadonly(state.mother).spatial.constrained.x'),e.run('state.mother.spatial.constrained.x'));
assert(e.run('!Object.hasOwn(state.mother.spatial,"actor")'));
assert.throws(()=>e.run('bloomVisualReadonly(state.mother).spatial.constrained.x=0'),/Presentation cannot mutate/);
console.log('PASS native motion state obeys readonly proxy invariants');

// Nested track samples and hitstop copies never alias authoritative state.
now=1000;e.run('CombatFeedback.clear();SproutState.state(state.mother).aim=0;BodyContact.set(state.mother,0,0,0);state.time+=.1;resetPresentation();');
now=1100;e.run('state.mother.sprout.aim=.8;state.mother.body.lean.x=.6;state.time+=.1;capturePresentation();');
const nested=pose(1150);assert.equal(nested.sprout.aim,.4);assert.equal(nested.body.lean.x,.3);
e.run('globalThis.qaNested=presentationPose(state.mother);globalThis.qaHeldNested=CombatFeedback.copy(qaNested);qaHeldNested.sprout.aim=.2;qaHeldNested.body.lean.x=.1;');
assert.equal(e.run('state.mother.sprout.aim'),.8);assert.equal(e.run('state.mother.body.lean.x'),.6);
e.run('globalThis.qaOldSprout=state.mother.sprout;resetSproutPresentation();presentation.frameSerial++;globalThis.qaResetSprout=presentationPose(state.mother).sprout;');
assert(e.run('state.mother.sprout!==qaOldSprout&&qaResetSprout!==state.mother.sprout&&qaResetSprout.mounts.pod!==state.mother.sprout.mounts.pod'));
console.log('PASS native nested interpolation, hitstop copies, and reset identities');
