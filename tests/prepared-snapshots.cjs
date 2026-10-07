'use strict';
const assert=require('node:assert/strict'),{engine}=require('./native-engine.cjs'),{candidate}=require('./shared-harness.cjs');
const source=candidate(),e=engine(source.file,source.html);
e.run(`CONFIG.session.mode='online';BloomSimulation.initialize(12345);WorldMembership.apply({epoch:0,tick:0,players:['a','b','c','d']});for(const p of WorldPlayers.all())rarityAcquire(p.accountOwner,'swordsman',1,10);rebuildGrid();spatialBoundary();globalThis.before=bloomAdapter.save();globalThis.originalState=state;globalThis.originalGrid=grid;globalThis.originalUnits=state.units;globalThis.originalSpatial=spatialUnits;globalThis.originalRoll=state.mother.roll;globalThis.originalDirection=state.mother.roll.direction;globalThis.qaContext={tick:0,membershipEpoch:1,simulationVersion:BloomSimulation.simulationVersion,tickRate:10,seed:12345,players:['a','b','c','d','e']};globalThis.change={epoch:1,tick:0,players:qaContext.players,joined:['e'],left:[],coordinatorId:'a'};`);
e.run('globalThis.prepared=bloomAdapter.prepareMembership(change,qaContext)');
assert(e.run('state===originalState&&grid===originalGrid&&state.units===originalUnits&&spatialUnits===originalSpatial'),'exact incumbent references restored');
assert.deepEqual(Buffer.from(e.run('bloomAdapter.save()')),Buffer.from(e.run('before')),'stage cannot alter incumbent bytes');
assert(e.run('state.mother.roll===originalRoll&&state.mother.roll.direction===originalDirection'),'stage preserves exact incumbent capability references');

e.run('WorldMembership.apply(change);globalThis.reference=bloomAdapter.save();bloomAdapter.load(before);bloomAdapter.loadPreparedSnapshot(prepared.prepared,qaContext)');
assert.deepEqual(Buffer.from(e.run('bloomAdapter.save()')),Buffer.from(e.run('reference')),'prepared membership equals legacy mutation');
assert.throws(()=>e.run('bloomAdapter.loadPreparedSnapshot(prepared.prepared,qaContext)'),/consumed/);
e.run('globalThis.wire=bloomAdapter.save();globalThis.token=bloomAdapter.prepareSnapshot(wire,qaContext);wire.fill(0)');
assert.throws(()=>e.run('bloomAdapter.loadPreparedSnapshot(token,{...qaContext,tick:1})'),/boundary/);
assert.throws(()=>e.run('bloomAdapter.loadPreparedSnapshot(token,{})'),/boundary/);
e.run('bloomAdapter.loadPreparedSnapshot(token,qaContext)');
assert.deepEqual(Buffer.from(e.run('bloomAdapter.save()')),Buffer.from(e.run('reference')),'source-byte mutation cannot change owned token');
assert.throws(()=>e.run('bloomAdapter.prepareSnapshot(wire,qaContext)'),/graph version/);
// Every decoder rejection must be enforced before authority installation.
function decode(hex){e.c.bad=Uint8Array.from(Buffer.from(hex,'hex'));return()=>e.run('BloomLiveCodec.decode(bad)')}
assert.throws(decode('424c4733040000000000000000'),/canonical number/); // float +0
assert.throws(decode('424c47330c0000'),/canonical zero/);
assert.throws(decode('424c47330802000000020000000000000001000000310001000000010000003000'),/canonical property order/);
assert.throws(decode('424c47330802000000020000000000000001000000300501000000010000007802000000010000003105030000000100000078'),/canonical string reference/);
console.log(JSON.stringify({pass:true,sourceSHA256:source.sha256,checks:['exact membership graph/bytes parity','unchanged incumbent refs','single-use opaque tokens','context binding','owned bytes','canonical numeric/string/property encodings']}));
function drain(expression){let maxMs=0,count=0;e.run(`globalThis.qaJob=${expression}`);while(!e.run('qaJob.done')){const start=performance.now();e.run('qaJob.pulse({budgetMs:1})');maxMs=Math.max(maxMs,performance.now()-start);assert(++count<10000,'bounded job termination')}return {count,maxMs}}
e.run('bloomAdapter.load(before)');const jobMembership=drain('bloomAdapter.prepareMembershipJob(change,qaContext)');
assert.deepEqual(Buffer.from(e.run('bloomAdapter.save()')),Buffer.from(e.run('before')),'cooperative stage leaves incumbent unchanged');
assert.deepEqual(Buffer.from(e.run('qaJob.result.bytes')),Buffer.from(e.run('reference')),'job member bytes equal sync/legacy');
e.run('bloomAdapter.loadPreparedSnapshot(qaJob.result.prepared,qaContext)');
const jobSave=drain('bloomAdapter.saveJob()');assert.deepEqual(Buffer.from(e.run('qaJob.result')),Buffer.from(e.run('reference')));
e.run('globalThis.qaJobBytes=qaJob.result');const jobPrepare=drain('bloomAdapter.prepareSnapshotJob(qaJobBytes,qaContext)');e.run('bloomAdapter.loadPreparedSnapshot(qaJob.result,qaContext)');assert.deepEqual(Buffer.from(e.run('bloomAdapter.save()')),Buffer.from(e.run('reference')));
e.run('globalThis.qaJob=bloomAdapter.saveJob();qaJob.pulse({budgetMs:.01});bloomSnapshotStore.invalidate()');assert.throws(()=>e.run('qaJob.pulse()'),/boundary changed/);
e.run('globalThis.qaJob=bloomAdapter.prepareSnapshotJob(reference,qaContext);qaJob.cancel()');assert.throws(()=>e.run('qaJob.pulse()'),/Canceled/);
e.run('bloomAdapter.load(before);globalThis.qaJob=bloomAdapter.prepareMembershipJob(change,qaContext);qaJob.pulse({budgetMs:.01});qaJob.cancel()');assert.deepEqual(Buffer.from(e.run('bloomAdapter.save()')),Buffer.from(e.run('before')),'cancel does not mutate authority');
console.log(JSON.stringify({cooperative:true,jobMembership,jobSave,jobPrepare,checks:['same bytes across all paths','frozen boundary','cancel releases without state mutation']}));
// Graph canonicality alone is insufficient: installed authority re-creates
// wrappers and compacts spatial caches. Reject every noncanonical installation.
const authorityMutations=[
 ['expanded unit',`const r=c.spatial.find(r=>r.unit===1);if(!r)throw Error('unit fixture');r.unit={x:r.object.x,y:r.object.y,z:r.object.z}`],
 ['spatial order','c.spatial.reverse()'],
 ['duplicate spatial','c.spatial.push(c.spatial[0])'],
 ['expanded anchor',`const r=c.spatial.find(r=>Number.isInteger(r.anchor));if(!r)throw Error('anchor fixture');r.anchor=bloomExpandSpatialAnchor(r.object,r.anchor)`],
 ['root extension','c.extra=true'],['world extension','c.world.extra=true'],['hunt extension','c.world.hunt.extra=true'],['grid extension','c.world.grids.extra=true'],
 ['grid wrapper alias','c.world.state.extra=c.world.grids'],['auto wrapper alias','c.world.state.extra=c.world.auto']
];
for(const [label,mutation]of authorityMutations){e.run(`globalThis.qaBad=(()=>{const c=BloomLiveCodec.decode(reference);${mutation};return BloomLiveCodec.encode(c)})()`);assert.equal(e.run('bloomAdapter.validateSnapshot(qaBad,qaContext)'),false,label);assert.throws(()=>e.run('bloomAdapter.prepareSnapshot(qaBad,qaContext)'),/Noncanonical installed authority/,label);assert.throws(()=>drain('bloomAdapter.prepareSnapshotJob(qaBad,qaContext)'),/Noncanonical installed authority/,label);assert(Buffer.from(e.run('bloomAdapter.save()')).equals(Buffer.from(e.run('before'))),label+' cannot alter incumbent')}
console.log('PASS ten authority-normalization adversarial fixtures reject synchronously and cooperatively without changing incumbent');

// Each prepared capability owns its detached graph. Installing and then changing
// one graph cannot change another token, even when both came from the same bytes.
e.run('bloomAdapter.load(reference);globalThis.qaOwnedSync=bloomAdapter.prepareSnapshot(reference,qaContext)');
drain('bloomAdapter.prepareSnapshotJob(reference,qaContext)');
e.run('globalThis.qaOwnedCooperative=qaJob.result;state.mother.roll.cooldown.leftMs=999;state.mother.roll.direction.x=.25');
e.run('bloomAdapter.loadPreparedSnapshot(qaOwnedSync,qaContext)');
assert.deepEqual(Buffer.from(e.run('bloomAdapter.save()')),Buffer.from(e.run('reference')),'prepared sync token does not borrow incumbent capability');
e.run('state.mother.roll.cooldown.leftMs=555;state.mother.roll.direction.y=.75;bloomAdapter.loadPreparedSnapshot(qaOwnedCooperative,qaContext)');
assert.deepEqual(Buffer.from(e.run('bloomAdapter.save()')),Buffer.from(e.run('reference')),'prepared cooperative token does not borrow another installed token');
assert(e.run(`WorldPlayers.all().every(p=>MoaActor.is(p.leader)&&(!p.data||p.data.mother===p.leader)&&idMap.get(p.leader.id)===p.leader)&&state.mother===WorldPlayers.byAccount(-1).leader`),'all installed aliases refer to hydrated actors');
assert(e.run('Object.isFrozen(qaOwnedSync)&&Object.isFrozen(qaOwnedCooperative)'),'prepared capabilities remain frozen');
assert.throws(()=>e.run('bloomAdapter.loadPreparedSnapshot(qaOwnedCooperative,qaContext)'),/consumed/);
console.log('PASS actor hydration preserves all aliases and detached prepared graph ownership');

// Native actors use the canonical plain-record tag before prototype hydration.
e.run(`globalThis.qaNullLeaderWire=(()=>{const c=BloomLiveCodec.decode(reference);Object.setPrototypeOf(c.world.state.mother,null);return BloomLiveCodec.encode(c)})()`);
assert.equal(e.run('bloomAdapter.validateSnapshot(qaNullLeaderWire,qaContext)'),false);
assert.throws(()=>e.run('bloomAdapter.prepareSnapshot(qaNullLeaderWire,qaContext)'),/Invalid BLOOM live snapshot/);
assert.throws(()=>drain('bloomAdapter.prepareSnapshotJob(qaNullLeaderWire,qaContext)'),/Invalid BLOOM live snapshot/);
console.log('PASS noncanonical actor prototype rejected; generic null records remain supported by codec');

// Runtime capability state is not accepted as extra wire data. Reject it before
// installation instead of silently dropping/replacing an attacker-supplied key.
e.run(`globalThis.qaOwnRollBad=(()=>{const c=BloomLiveCodec.decode(reference);c.world.state.participants.b.leader.roll={direction:{x:1,y:0},remainingMs:100};return BloomLiveCodec.encode(c)})();globalThis.qaOwnRollBefore=bloomAdapter.save()`);
assert.equal(e.run('bloomAdapter.validateSnapshot(qaOwnRollBad,qaContext)'),false,'plain own runtime roll field rejected');
assert.throws(()=>e.run('bloomAdapter.prepareSnapshot(qaOwnRollBad,qaContext)'),/Invalid BLOOM live snapshot/);
assert.throws(()=>drain('bloomAdapter.prepareSnapshotJob(qaOwnRollBad,qaContext)'),/Invalid BLOOM live snapshot/);
assert.deepEqual(Buffer.from(e.run('bloomAdapter.save()')),Buffer.from(e.run('qaOwnRollBefore')),'runtime roll field rejection leaves incumbent unchanged');
console.log('PASS plain runtime capability field rejected synchronously and cooperatively');

// Native state is complete; missing capability leaves are rejected, not migrated.
for(const field of ['progress','leftMs','direction','cooldown','invulnerability']){
 e.run(`globalThis.qaMissingPose=(()=>{const c=BloomLiveCodec.decode(reference);delete c.world.state.mother.roll[${JSON.stringify(field)}];return BloomLiveCodec.encode(c)})()`);
 assert.equal(e.run('bloomAdapter.validateSnapshot(qaMissingPose,qaContext)'),false,field);
 assert.throws(()=>e.run('bloomAdapter.prepareSnapshot(qaMissingPose,qaContext)'),/Invalid BLOOM live snapshot/);
 assert.throws(()=>drain('bloomAdapter.prepareSnapshotJob(qaMissingPose,qaContext)'),/Invalid BLOOM live snapshot/);
}
console.log('PASS incomplete native capability state rejected without migration');

// The same capability-key exclusion also applies to pre-session native snapshots
// with no participants table; otherwise hydrate would rewrite accepted bytes.
const unbound=engine(source.file,source.html);
unbound.run(`BloomSimulation.initialize(12345);globalThis.qaUnboundBefore=bloomAdapter.save();globalThis.qaUnboundBad=(()=>{const c=BloomLiveCodec.decode(qaUnboundBefore);c.world.state.mother.roll={bad:true};return BloomLiveCodec.encode(c)})()`);
assert.equal(unbound.run('bloomAdapter.validateSnapshot(qaUnboundBad)'),false,'unbound plain runtime roll key rejected');
assert.throws(()=>unbound.run('bloomAdapter.prepareSnapshot(qaUnboundBad)'),/Invalid BLOOM live snapshot/);
assert.throws(()=>unbound.run('(()=>{const job=bloomAdapter.prepareSnapshotJob(qaUnboundBad);while(!job.done)job.pulse({budgetMs:0})})()'),/Invalid BLOOM live snapshot/);
assert.deepEqual(Buffer.from(unbound.run('bloomAdapter.save()')),Buffer.from(unbound.run('qaUnboundBefore')),'unbound rejection leaves incumbent unchanged');
console.log('PASS unbound malformed capability field rejected before hydration');

// Wire records must never shadow the capability's actual prototype methods.
// Derive the list from Rollable so future method additions receive coverage.
let reservedMethodCases=0;
for(const [schema,runtime] of [['shared',e],['unbound',unbound]]){
 const methods=Array.from(runtime.run(`Object.getOwnPropertyNames(Object.getPrototypeOf(MoaActor.prototype)).filter(key=>key!=='constructor'&&typeof Object.getOwnPropertyDescriptor(Object.getPrototypeOf(MoaActor.prototype),key).value==='function')`));
 assert(methods.length>0,'actual Rollable prototype methods discovered');
 runtime.run('globalThis.qaReservedBefore=bloomAdapter.save();globalThis.qaReservedState=state;globalThis.qaReservedActor=state.mother;globalThis.qaReservedRoll=state.mother.roll;globalThis.qaReservedGrid=grid;globalThis.qaReservedSpatial=spatialUnits');
 assert(runtime.run('bloomAdapter.validateSnapshot(qaReservedBefore)'),schema+' starting capsule remains valid');
 for(const method of methods){
  const label=schema+' reserved actor method '+method;
  runtime.run(`globalThis.qaReservedBad=(()=>{const c=BloomLiveCodec.decode(qaReservedBefore);c.world.state.mother[${JSON.stringify(method)}]=0;return BloomLiveCodec.encode(c)})()`);
  assert.equal(runtime.run('bloomAdapter.validateSnapshot(qaReservedBad)'),false,label+' rejected by validation');
  assert.throws(()=>runtime.run('bloomAdapter.prepareSnapshot(qaReservedBad)'),/Invalid BLOOM live snapshot/,label+' rejected synchronously');
  assert.throws(()=>runtime.run('(()=>{const job=bloomAdapter.prepareSnapshotJob(qaReservedBad);while(!job.done)job.pulse({budgetMs:0})})()'),/Invalid BLOOM live snapshot/,label+' rejected cooperatively');
  assert(runtime.run('state===qaReservedState&&state.mother===qaReservedActor&&state.mother.roll===qaReservedRoll&&grid===qaReservedGrid&&spatialUnits===qaReservedSpatial'),label+' preserves incumbent references');
  assert.deepEqual(Buffer.from(runtime.run('bloomAdapter.save()')),Buffer.from(runtime.run('qaReservedBefore')),label+' preserves incumbent bytes');
  reservedMethodCases++;
 }
}
console.log('PASS '+reservedMethodCases+' shared/unbound reserved-method collisions rejected without changing authority');
