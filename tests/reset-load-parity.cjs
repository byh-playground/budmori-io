'use strict';
// Real embedded engine/SDK in isolated native V8 realms. No browser or GPU claim.
const assert=require('assert'),fs=require('fs'),{engine}=require('./native-engine.cjs');
const candidate=process.argv[2]||`${__dirname}/../index.html`,reference=process.argv[3]||process.env.BLOOM_RESET_BASELINE;
assert(reference,'Supply a reviewed same-product-family HTML with BLOOM_RESET_BASELINE or argv[3]');
const before=engine(reference),after=engine(candidate);let checks=0;
function both(code){for(const e of [before,after])e.run(code)}
function same(label){
 const bytes=e=>Buffer.from(e.run('BloomSimulation.adapter.save()'));
 assert.deepStrictEqual(bytes(after),bytes(before),`${label}: canonical bytes/key order/RNG/alias graph`);
 assert.equal(after.run('JSON.stringify(bloomCapture())'),before.run('JSON.stringify(bloomCapture())'),`${label}: full capture`);
 assert.equal(after.run('BloomSimulation.disk.snapshot()'),before.run('BloomSimulation.disk.snapshot()'),`${label}: disk envelope/export order`);checks++;
}
try{
 both('Date.now=()=>1700000000000;');
 for(const rate of [10,20,30])for(const seed of [0,1,12345,0xffffffff]){
  both(`bloomSession?.close();bloomApplyTickRate(${rate});BloomSimulation.initialize(${seed});BloomSimulation.createSession();playing=true;paused=false;modalKind='';`);same(`initialize ${rate}/${seed}`);
  for(let i=0;i<8;i++){both(`BloomSimulation.session.advance(BloomSimulation.encodeInput({x:.4,y:.2,manual:true}))`);same(`move ${rate}/${seed}/${i}`)}
  both('BloomSimulation.session.close();defeat();');same(`defeat ${rate}/${seed}`);
  both('PlayerLifecycle.recover(WorldPlayers.byAccount(-1));');same(`recover ${rate}/${seed}`);
  both('globalThis.savedDisk=BloomSimulation.disk.snapshot();');
  both('if(!load(savedDisk))throw new Error("disk rejected");');same(`disk load ${rate}/${seed}`);
  both('reset();');same(`repeat reset ${rate}/${seed}`);
 }
 const disk=JSON.parse(fs.readFileSync(`${__dirname}/fixtures/v63-compatibility.json`,'utf8')).disk;
 for(const e of [before,after]){e.c.legacyDisk=disk;e.run('if(load(legacyDisk))throw new Error("legacy accepted")')}
 same('unsupported v63 rejection');
 both('globalThis.rejectedBefore=BloomOwnedSDK.hashBytes(bloomAdapter.save());if(load("{bad"))throw new Error("invalid accepted");if(BloomOwnedSDK.hashBytes(bloomAdapter.save())!==rejectedBefore)throw new Error("reject mutated authority");');same('invalid import atomicity');
 console.log(JSON.stringify({status:'PASS',checks,scope:'Exact reset, movement, defeat/recover, disk/export and unsupported-version rejection parity; native engine, not browser'}));
}finally{both('bloomSession?.close()')}
