'use strict';
// Actual HTML, codec, runtime and SDK. No browser/GPU claim.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const file=path.resolve(process.argv[2]||path.join(__dirname,'../index.html')),html=fs.readFileSync(file,'utf8');
const {engine}=require('./native-engine.cjs'),{session}=require('./main-harness.cjs');
const e=engine(file,html);e.run('BloomSimulation.initialize(12345);BloomSimulation.createSession()');
assert.equal(e.run('BloomSimulation.version'),'0.1.0');
assert.equal(e.run('BloomSimulation.simulationVersion'),'budmori-0.1');
assert.equal(e.run('CONFIG.version'),'0.1');
for(const version of ['0.1.0','0.1.1','0.1.999']){e.c.qaVersion=version;assert(e.run('BUDMORI_VERSION.accepts(qaVersion)'),version)}
for(const version of ['0.0.1','0.2.0','1.1.0','0.1','0.1.00','0.1.-1','0.1.1-extra','0.1.9007199254740992',null,1]){e.c.qaVersion=version;assert.equal(e.run('BUDMORI_VERSION.accepts(qaVersion)'),false,String(version))}
const disk=e.run('BloomSimulation.disk.snapshot()'),envelope=JSON.parse(disk);
assert.equal(envelope.schema,'budmori-snapshot');assert.equal(envelope.productVersion,'0.1.0');
assert(!('formatVersion' in envelope));assert(!('simulationVersion' in envelope));
assert.equal(envelope.codec,'bloom-live-graph-v3','independent binary grammar stays pinned');
e.c.qaDisk=disk;e.run('globalThis.incumbent=state;globalThis.before=bloomAdapter.save();globalThis.savedSession=bloomSession');
const old=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/v63-compatibility.json'),'utf8')).disk;
for(const bad of [old,JSON.stringify({...envelope,schema:'bloom-snapshot-disk-v4'}),JSON.stringify({...envelope,schema:'bloom-snapshot-disk-v3'}),JSON.stringify({schema:'bloom-webgl-disk-ms-v2',live:Array.from(Buffer.from(envelope.live,'base64'))}),...['0.0.1','0.2.0','1.1.0'].map(productVersion=>JSON.stringify({...envelope,productVersion}))]){
 e.c.bad=bad;assert.equal(e.run('load(bad)'),false);assert(e.run('bloomDiskFailure.code==="UNSUPPORTED_SAVE_VERSION"&&state===incumbent&&bloomSession===savedSession'));
 assert.deepEqual(Buffer.from(e.run('bloomAdapter.save()')),Buffer.from(e.run('before')));
}
// A compatible patch is accepted by both the disk and prepared live boundary.
const patch={...envelope,productVersion:'0.1.7'};e.c.patchDisk=JSON.stringify(patch);
assert(e.run('load(patchDisk)'),'compatible patch disk loads without migration');
assert(e.run('bloomDiskFailure===null&&bloomValidate(bloomCapture())'));
assert.deepEqual(Buffer.from(e.run('bloomAdapter.save()')),Buffer.from(e.run('before')),'patch import changes no gameplay fields');
// Full preparation is detached even when current-format validation fails late.
e.run('globalThis.incumbent=state;globalThis.before=bloomAdapter.save();globalThis.savedSession=bloomSession');
const altered=JSON.parse(disk);altered.tick++;e.c.bad=JSON.stringify(altered);assert.equal(e.run('load(bad)'),false);
assert(e.run('bloomDiskFailure.code==="INVALID_SAVE"&&state===incumbent&&bloomSession===savedSession'));
assert.deepEqual(Buffer.from(e.run('bloomAdapter.save()')),Buffer.from(e.run('before')));
// A failure after preparation has started is still rejected without touching live owners.
e.run(`globalThis.originalPrepareSteps=bloomPrepareAuthoritySteps;bloomPrepareAuthoritySteps=function*(...args){for(const value of originalPrepareSteps(...args)){yield value;throw Error('Injected detached preparation failure')}}`);
assert.equal(e.run('load(qaDisk)'),false);assert(e.run('state===incumbent&&bloomSession===savedSession'));
assert.deepEqual(Buffer.from(e.run('bloomAdapter.save()')),Buffer.from(e.run('before')));
e.run('bloomPrepareAuthoritySteps=originalPrepareSteps');
// Compatible product patches must also generate identical canonical checksums.
const patchHTML=html.replace('const major=0,minor=1,patch=0,','const major=0,minor=1,patch=7,');
assert.notEqual(patchHTML,html);const peer=engine(file,patchHTML);
peer.run('BloomSimulation.initialize(12345);BloomSimulation.createSession()');
assert.equal(peer.run('BloomSimulation.version'),'0.1.7');
assert.equal(peer.run('BloomSimulation.simulationVersion'),e.run('BloomSimulation.simulationVersion'));
assert.deepEqual(Buffer.from(peer.run('bloomAdapter.save()')),Buffer.from(e.run('before')),'compatible patch peers have identical authority bytes');
assert.equal(JSON.parse(peer.run('BloomSimulation.disk.snapshot()')).productVersion,'0.1.7');
for(let i=0;i<4;i++){e.tick(1,{x:.25,y:.1,manual:true});peer.tick(1,{x:.25,y:.1,manual:true});assert.deepEqual(Buffer.from(peer.run('bloomAdapter.save()')),Buffer.from(e.run('bloomAdapter.save()')),'compatible patch future tick '+i)}
peer.run('bloomSession.close()');
e.run('bloomSession.close()');
(async()=>{
 const s=session(file,html),stored=new Map([['bloom-weapon-cards-v3',old]]),writes=[];
 s.e.c.localStorage={getItem:k=>stored.get(k)||null,setItem(k,v){writes.push([k,v]);stored.set(k,v)}};
 try{
  const init=await s.init(old);assert.equal(init.loaded,false);assert.equal(init.persistenceProtected,true);
  assert.equal((await s.read('BloomSimulation.runtime.metrics.persistenceFailure')).code,'UNSUPPORTED_SAVE_VERSION');
  assert.match(await s.read('bloomDiskNotice(false)'),/지원하지 않는 저장 버전/);
  assert.equal(await s.request('save'),false);await assert.rejects(s.request('snapshot'),/protected/);
  assert.equal(stored.get('bloom-weapon-cards-v3'),old);assert.equal(writes.length,0,'initialization/save cannot overwrite rejected bytes');
  assert.equal(await s.request('load',{disk:old}),false);assert.equal(writes.length,0);
  await s.request('reset');assert.equal((await s.request('inspect')).persistenceProtected,false);
  assert.equal(JSON.parse(stored.get('bloom-weapon-cards-v3')).productVersion,'0.1.0','explicit new game replaces old storage');
  assert.equal(await s.read('BloomSimulation.runtime.metrics.persistenceFailure'),null);
 }finally{await s.close()}
 console.log('PASS single product version/family; unsupported history rejected atomically; compatible patches accepted; old storage retained until explicit new game');
})().catch(error=>{console.error(error);process.exitCode=1});
