'use strict';
const assert=require('node:assert/strict'),{engine}=require('./native-engine.cjs'),{candidate}=require('./shared-harness.cjs');
const source=candidate(),e=engine(source.file,source.html);
e.run(`CONFIG.session.mode='online';BloomSimulation.initialize(12345);WorldMembership.apply({epoch:0,tick:0,players:['a','b','c','d']});for(const p of WorldPlayers.all())rarityAcquire(p.accountOwner,'swordsman',1,10);rebuildGrid();spatialBoundary();globalThis.before=bloomAdapter.save();globalThis.originalState=state;globalThis.originalGrid=grid;globalThis.originalUnits=state.units;globalThis.originalSpatial=spatialUnits;globalThis.qaContext={tick:0,membershipEpoch:1,simulationVersion:'budmori-shared-ms-v3',tickRate:10,seed:12345,players:['a','b','c','d','e']};globalThis.change={epoch:1,tick:0,players:qaContext.players,joined:['e'],left:[],coordinatorId:'a'};`);
e.run('globalThis.prepared=bloomAdapter.prepareMembership(change,qaContext)');
assert(e.run('state===originalState&&grid===originalGrid&&state.units===originalUnits&&spatialUnits===originalSpatial'),'exact incumbent references restored');
assert.deepEqual(Buffer.from(e.run('bloomAdapter.save()')),Buffer.from(e.run('before')),'stage cannot alter incumbent bytes');
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
