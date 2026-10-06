const fs=require('fs'),assert=require('assert'),path=require('path');
const {engine}=require('./native-engine.cjs');
const file=path.resolve(__dirname,'../index.html'),e=engine(file);
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
now=330;e.run('state.mother.attackPose=.3;state.mother.pendingMoa={left:.5,total:.5};state.time+=.1;capturePresentation()');
const attack=pose(330);e.run('CombatFeedback.clear()');const clear=pose(330);assert.equal(clear.attackPose,.3,'new attack decay snaps independently');assert.equal(clear.pendingMoa.left,.5);
console.log('PASS receipt continuity, animation-only hitstop, scalar stage reset');

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
