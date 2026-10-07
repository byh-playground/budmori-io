'use strict';
// Actual native snapshot boundary: malformed components and semantic-owner aliases
// must fail both preparation paths without touching incumbent references or bytes.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=process.env.BUDMORI_ROOT||path.resolve(__dirname,'..'),file=path.resolve(process.argv[2]||root+'/index.html'),html=fs.readFileSync(file,'utf8');
const {engine}=require(root+'/tests/native-engine.cjs');const e=engine(file,html);
e.run(`CONFIG.session.mode='online';BloomSimulation.initialize(12345);WorldMembership.apply({epoch:0,tick:0,players:['a','b']});rarityAcquire(-1,'swordsman',3,2);rarityRecall(-1);globalThis.rival=spawn('swordsman','enemy',state.mother.x+220,state.mother.y,{camp:0,variant:'rival'});rebuildGrid();spatialBoundary();globalThis.base=bloomAdapter.save();globalThis.incumbent=state;`);
assert(e.run('bloomAdapter.validateSnapshot(base)'),'baseline validity');
const tests=[
 ['roll clocks','m.roll.invulnerability=m.roll.cooldown'],['roll direction','m.roll.lastDirection=m.roll.direction'],['primary clocks','m.primaryAttack.pose=m.primaryAttack.cooldown'],['impact/body vector','m.body.lean=m.impact.velocity'],
 ['roll array','m.roll=Object.assign([],m.roll)'],['direction array','m.roll.direction=Object.assign([],{x:0,y:0})'],['cooldown array','m.roll.cooldown=Object.assign([],{leftMs:0})'],
 ['retired rollRemainingMs','m.rollRemainingMs=1000'],['retired impactVX','m.impactVX=100'],['retired bodyLeanX','m.bodyLeanX=1'],['retired sproutAim_beam','m.sproutAim_beam=.2'],
 ['method shadow startRoll','m.startRoll=0'],['method shadow tickPrimaryAttack','m.tickPrimaryAttack=0'],['method shadow resetRoll','m.resetRoll=0'],
 ['cross leaders impact','other.impact=m.impact'],['leader/unit impact','u.impact=m.impact'],['unit/unit impact','u.impact=v.impact={velocity:{x:0,y:0}}'],['unit/unit movement','u.movement=v.movement'],
 ['leader/unit spatial','u.spatial=m.spatial'],['unit/unit deployment','u.movement.deployment=v.movement.deployment'],['unit/unit controller timer','u.attackController.timer=v.attackController.timer'],['unit/unit controller origin','u.attackController.origin=v.attackController.origin'],
 ['unit/unit controller cooldowns','u.attackController.cooldownsMs=v.attackController.cooldownsMs'],['unit/unit controller hit','u.attackController.hit=v.attackController.hit'],
 ['rival home/steer','r.rival.ai.steer=r.rival.ai.home'],['rival home/controller origin','r.rival.ai.home=u.attackController.origin'],
 ['same actor sprout mounts','m.sprout.mounts.lob=m.sprout.mounts.pod'],['null roll prototype','m.roll=Object.assign(Object.create(null),m.roll)'],['null clock prototype','m.roll.cooldown=Object.assign(Object.create(null),m.roll.cooldown)']
];
const results=[];
for(const [label,mutation]of tests){e.c.mutation=mutation;const result=e.run(`(()=>{const c=BloomLiveCodec.decode(base),m=c.world.state.mother,other=c.world.state.participants.b.leader,[u,v]=c.world.state.units.filter(u=>u.attackController),r=c.world.state.units.find(u=>u.rivalLeader);eval(mutation);const bytes=BloomLiveCodec.encode(c),out={validated:bloomAdapter.validateSnapshot(bytes)};try{bloomAdapter.prepareSnapshot(bytes);out.sync='accepted'}catch(error){out.sync='rejected'}try{const job=bloomAdapter.prepareSnapshotJob(bytes);while(!job.done)job.pulse({budgetMs:0});out.job='accepted'}catch(error){out.job='rejected'}return out})()`);assert(e.run('state===incumbent'),'reference changed '+label);assert.deepEqual(Buffer.from(e.run('bloomAdapter.save()')),Buffer.from(e.run('base')),'bytes changed '+label);results.push({label,...result});assert.equal(result.validated,false,label+' validation rejects malformed native ownership');assert.equal(result.sync,'rejected',label+' synchronous preparation rejects');assert.equal(result.job,'rejected',label+' cooperative preparation rejects');console.log('PASS',label);}
console.log(JSON.stringify({file,sha256:crypto.createHash('sha256').update(html).digest('hex'),cases:results.length,rejected:results.filter(r=>!r.validated&&r.sync==='rejected'&&r.job==='rejected').length,accepted:results.filter(r=>r.validated),incumbentUnchanged:true},null,2));
