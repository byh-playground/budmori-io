'use strict';
// Actual interpolation timelines and read-only presentation descriptors. Native
// harness coverage, not a browser/GPU/visual-quality assertion.
const assert=require('node:assert/strict'),path=require('node:path'),{engine}=require('./native-engine.cjs');
const e=engine(path.resolve(process.argv[2]||path.join(__dirname,'../index.html')));
e.run(`globalThis.qaNow=1000;globalThis.performance={now:()=>qaNow};BloomSimulation.initialize(12345);globalThis.qaU=residentUnit();globalThis.qaC=qaU.attackController;
 qaC.pattern='coneSweep';patternPhase(qaC,'execute',400);AttackPatternController.captureOrigin(qaC,100,150,20);
 globalThis.BLOOM_HEADLESS=false;playing=true;paused=false;view.x=qaU.x;view.y=qaU.y;view.w=view.h=2000;
 resetPresentation();state.time+=.1;AttackPatternController.advance(qaC,100);AttackPatternController.captureOrigin(qaC,120,160,25);qaNow+=100;capturePresentation();
 qaNow+=50;presentation.frameSerial++;globalThis.qaPose=bloomVisualPose(qaU,'unit',presentation.receivedAt+50);globalThis.qaBytes=bloomAdapter.save();`);
assert(e.run(`(()=>{const p=qaPose.attackController;return p!==qaC&&p.timer!==qaC.timer&&p.origin!==qaC.origin&&Number.isFinite(p.timer.leftMs)&&p.timer.leftMs>=300&&p.timer.leftMs<=400&&Number.isFinite(p.origin.x)&&p.origin.x>=100&&p.origin.x<=120})()`),'clock and origin sample through actual native timelines');
assert(e.run(`(()=>{const p=qaPose.attackController;return ['remainingMs','durationMs','left','fromX','fromY','fromZ','timer.leftMs','origin.x'].every(k=>!Object.hasOwn(p,k))&&Object.hasOwn(p.timer,'leftMs')&&Object.hasOwn(p.origin,'x')})()`),'presentation consumes native nesting without scalar aliases');
e.run('qaPose.attackController.timer.leftMs=123;qaPose.attackController.origin.x=999');
assert.equal(e.run('qaC.timer.leftMs'),300);assert.equal(e.run('qaC.origin.x'),120);
assert.throws(()=>e.run('qaPose.attackController.hit.push(99)'),/Presentation cannot mutate|Presentation cannot redefine/);
assert.deepEqual(Buffer.from(e.run('bloomAdapter.save()')),Buffer.from(e.run('qaBytes')),'sampled writes cannot alter authority');
e.run(`patternPhase(qaC,'recovery',500);qaNow+=100;capturePresentation();presentation.frameSerial++;globalThis.qaReset=bloomVisualPose(qaU,'unit',presentation.receivedAt+1)`);
assert.equal(e.run('qaReset.attackController.timer.leftMs'),500,'new phase resets the nested clock sample');
console.log('PASS native attack timer/origin interpolation, phase boundary and authority isolation');
