'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const {engine}=require('./native-engine.cjs'),e=engine(path.resolve(process.argv[2]||path.join(__dirname,'../index.html')));
e.run(`CONFIG.session.mode='online';BloomSimulation.initialize(12345);WorldMembership.apply({epoch:0,tick:0,players:['a','b']});
 globalThis.qaU=spawn('siege','friendly',state.mother.x+40,state.mother.y,{rarityGrade:3});
 globalThis.qaV=spawn('siege','friendly',state.mother.x+80,state.mother.y,{rarityGrade:3});rebuildGrid();spatialBoundary();
 globalThis.qaC=qaU.attackController;globalThis.qaD=qaV.attackController;`);
const plain=expr=>assert(e.run(`(()=>{const value=${expr};return Object.getPrototypeOf(value)===Object.prototype&&Object.values(Object.getOwnPropertyDescriptors(value)).every(d=>Object.hasOwn(d,'value'))})()`),'plain native state: '+expr);
for(const expr of ['qaU.movement','qaU.movement.deployment','qaU.movement.causes','qaC','qaC.timer','qaC.origin'])plain(expr);
assert(e.run('UnitMovement.is(qaU)&&AttackPatternController.is(qaC)'),'spawn registers native owners');
assert(e.run('qaU.movement!==qaV.movement&&qaU.movement.deployment!==qaV.movement.deployment&&qaC.timer!==qaD.timer&&qaC.origin!==qaD.origin'),'independent instance state');
assert(e.run(`['order','returning','visibleHuntReturn','deployed','undeploy'].every(k=>!Object.hasOwn(qaU,k))&&!Object.hasOwn(qaU.movement,'mode')`),'no movement compatibility fields');
assert(e.run(`['remainingMs','durationMs','previousRemainingMs','left','fromX','fromY','fromZ','schema'].every(k=>!Object.hasOwn(qaC,k))`),'no controller compatibility fields or private version counter');
assert(e.run(`['timer','origin'].every(k=>Object.getOwnPropertyDescriptor(qaC,k).enumerable)`),'native ownership is the saved schema');
e.run('globalThis.qaOther=JSON.stringify(qaD);AttackPatternController.advance(qaC,125)');
assert.equal(e.run('qaC.timer.leftMs'),2075);assert.equal(e.run('qaC.timer.previousLeftMs'),2200);assert.equal(e.run('JSON.stringify(qaD)'),e.run('qaOther'));
e.run('qaC.cooldownsMs.dash=1200;AttackPatternController.rescale(qaC,.5)');assert.equal(e.run('qaC.timer.leftMs'),1037.5);assert.equal(e.run('qaC.cooldownsMs.dash'),600);
e.run(`patternPhase(qaC,'windup',500);qaC.pattern='dash';AttackPatternController.rescale(qaC,.5)`);assert.equal(e.run('qaC.timer.leftMs'),500);assert.equal(e.run('qaC.cooldownsMs.dash'),300);
assert(e.run(`BLOOM_TPS_OPTIONS.every(rate=>{const c=createAttackController(1000);for(let i=0;i<rate;i++)AttackPatternController.advance(c,1000/rate);return c.timer.leftMs===0})`),'same expiry at every supported TPS');
e.run('AttackPatternController.captureOrigin(qaC,20,30,40);AttackPatternController.supportOrigin(qaC,50)');assert.deepEqual(e.json('qaC.origin'),{x:20,y:30,z:50});
e.run(`UnitMovement.command(qaU,'return');UnitMovement.returnHome(qaU,false);UnitMovement.visibility(qaU,true)`);
assert(e.run(`UnitMovement.isReturning(qaU)&&qaU.movement.homePhase==='active'&&qaU.movement.causes.visibility`),'recall is independent from protected return and visibility cause');
e.run(`UnitMovement.returnHome(qaU,true);UnitMovement.command(qaU,'follow')`);assert(e.run(`UnitMovement.isReturning(qaU)&&qaU.movement.homePhase==='return'`));
e.run('UnitMovement.returnHome(qaU,false)');assert(e.run('!UnitMovement.isReturning(qaU)&&qaU.movement.causes.visibility'));
assert.throws(()=>e.run(`UnitMovement.command(qaU,'unknown')`),/Movement command/);
e.run('UnitMovement.deploy(qaU,.2)');assert.deepEqual(e.json('qaU.movement.deployment'),{phase:'deploying',seconds:.2});
e.run(`UnitMovement.deploy(qaU,unitDef('siege').deployment.deployMs/1000)`);assert.equal(e.run('qaU.movement.deployment.phase'),'deployed');
assert(e.run('UnitMovement.blocksTravel(qaU)'));assert.deepEqual(e.json('qaU.movement.deployment'),{phase:'packing',seconds:e.run("unitDef('siege').deployment.undeployMs/1000")});
assert.throws(()=>e.run('UnitMovement.deploy(qaU,.1)'),/packing/);
assert(e.run(`UnitMovement.tickPacking(qaU,unitDef('siege').deployment.undeployMs/1000)`));assert.deepEqual(e.json('qaU.movement.deployment'),{phase:'packed',seconds:0});assert(!e.run('UnitMovement.blocksTravel(qaU)'));
assert.deepEqual(e.json('qaV.movement.deployment'),{phase:'packed',seconds:0});
assert.throws(()=>e.run(`UnitMovement.hydrate({type:'siege',deployed:1,undeploy:1})`),/Invalid movement/);
assert.throws(()=>e.run(`AttackPatternController.hydrate({phase:'standard',remainingMs:1000,durationMs:1000,left:1,fromX:0,fromY:0,fromZ:0})`),/Invalid attack/);
// One continuing actual-engine world covers native live/prepared/cooperative
// restoration and detached inventory bodies, with same-version byte stability.
e.run(`BloomSimulation.initialize(12345);WorldMembership.apply({epoch:0,tick:0,players:['a','b']});rarityAcquire(-1,'swordsman',3,2);rarityRecall(-1);rebuildGrid();spatialBoundary();globalThis.qaBefore=bloomAdapter.save()`);
const owners=()=>assert(e.run(`state.units.every(u=>UnitMovement.is(u)&&(!u.attackController||AttackPatternController.is(u.attackController)))&&Object.values(state.rarityAccounts).every(a=>a.active.every(r=>!r.body||UnitMovement.is(r.body)))`),'active and detached owners restored');
const same=bytes=>assert.deepEqual(Buffer.from(e.run('bloomAdapter.save()')),Buffer.from(e.run(bytes)));
e.run('for(const u of state.units){UnitMovement.isReturning(u);if(u.attackController){void u.attackController.timer.leftMs;void u.attackController.origin.z}}');same('qaBefore');
for(const mode of ['live','sync','job']){e.c.qaMode=mode;e.run(`if(qaMode==='live')bloomAdapter.load(qaBefore);else{const token=qaMode==='sync'?bloomAdapter.prepareSnapshot(qaBefore):(()=>{const j=bloomAdapter.prepareSnapshotJob(qaBefore);while(!j.done)j.pulse({budgetMs:0});return j.result})();bloomAdapter.loadPreparedSnapshot(token)}`);owners();same('qaBefore')}
e.run(`globalThis.qaPrepared=bloomAdapter.prepareMembership({epoch:1,tick:0,players:['a','b','c'],joined:['c'],left:[],coordinatorId:'a'});bloomAdapter.loadPreparedSnapshot(qaPrepared.prepared)`);owners();
for(const mutation of [`u.deployed=1`,`u.order='return'`,`u.returning=false`,`u.movement={}`,`u.movement.deployment={phase:'packed',seconds:1}`,`u.movement.deployment={phase:'packing',seconds:-1}`,`u.movement.causes.visibility=1`,`u.attackController.timer={leftMs:0}`,`u.attackController.origin={x:0}`,`u.attackController.left=1`,`u.attackController.timer.previousLeftMs=-1`]){
 e.c.qaMutation=mutation;e.run(`globalThis.qaInvalid=(()=>{const c=BloomLiveCodec.decode(bloomAdapter.save()),u=c.world.state.units.find(u=>u.attackController);eval(qaMutation);return BloomLiveCodec.encode(c)})()`);assert.equal(e.run('bloomAdapter.validateSnapshot(qaInvalid)'),false,mutation);
}
e.run(`const u=state.units.find(u=>u.rarityUID);rarityKillOwned(u,null);rebuildGrid();spatialBoundary();globalThis.qaDead=bloomAdapter.save();bloomAdapter.load(qaDead)`);owners();same('qaDead');
// Rival memory exists without an attack controller and preserves native identity.
e.run(`BloomSimulation.initialize(12345);WorldMembership.apply({epoch:0,tick:0,players:['a','b']});globalThis.qaRival=spawn('swordsman','enemy',state.mother.x+220,state.mother.y,{camp:0,variant:'rival'});globalThis.qaAI=rarityRivalAI(qaRival);globalThis.qaOtherAI=RivalDecision.hydrate(JSON.parse(JSON.stringify(qaAI)));RivalDecision.observeTarget(qaAI,WorldPlayers.get('b').leader,state.time);RivalDecision.avoidTarget(qaAI,WorldPlayers.get('b').leader.id,state.time+6);rebuildGrid();spatialBoundary()`);
for(const expr of ['qaAI','qaAI.target','qaAI.progress','qaAI.avoid'])plain(expr);
assert(e.run('RivalDecision.is(qaAI)&&!qaRival.attackController&&qaAI.target!==qaOtherAI.target&&qaAI.avoid!==qaOtherAI.avoid'));
assert(e.run(`['targetId','targetHP','progressAt','avoidId','avoidUntil','schema'].every(k=>!Object.hasOwn(qaAI,k))`));
e.run('globalThis.qaDecisionBytes=bloomAdapter.save();RivalDecision.avoids(qaAI,qaAI.target.id,state.time);rarityRivalAI(qaRival)');same('qaDecisionBytes');
e.run('bloomAdapter.load(qaDecisionBytes);globalThis.qaAI=state.units.find(u=>u.rivalLeader).rival.ai');assert(e.run('RivalDecision.is(qaAI)&&qaAI.target.id===WorldPlayers.get("b").leader.id&&qaAI.avoid.id===qaAI.target.id'));same('qaDecisionBytes');
for(const mutation of ['a.target={}','a.progress.atSeconds=-1','a.avoid.untilSeconds=-1','a.targetId=0','a.avoidId=0']){e.c.qaMutation=mutation;e.run('globalThis.qaBadDecision=(()=>{const c=BloomLiveCodec.decode(qaDecisionBytes),a=c.world.state.units.find(u=>u.rivalLeader).rival.ai;eval(qaMutation);return BloomLiveCodec.encode(c)})()');assert.equal(e.run('bloomAdapter.validateSnapshot(qaBadDecision)'),false,mutation)}
console.log(JSON.stringify({pass:true,sourceSHA256:e.sha256,checks:['native plain ownership with no compatibility aliases','independent clock/origin/deployment/rival memory','shared behavior and TPS/haste semantics','pure queries','live/prepared/cooperative/member hydration','same-version byte stability','malformed and legacy shape rejection','detached inventory bodies']}));
