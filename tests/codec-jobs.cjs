'use strict';
// The actual game codec and live capture, with native V8 timing only. These are
// CPU/event-loop slices, not browser rendering or mobile frame-rate claims.
const assert=require('node:assert/strict'),{performance}=require('node:perf_hooks');
const {engine}=require('./native-engine.cjs'),{candidate}=require('./shared-harness.cjs');
const source=candidate(),e=engine(source.file,source.html),codec=e.c.BloomLiveCodec;
const bytes=value=>Buffer.from(value);
function drain(job,budgetMs=8){let pulses=0,longest=0;const start=performance.now();while(!job.done){const before=performance.now(),status=job.pulse({budgetMs});longest=Math.max(longest,performance.now()-before);assert.equal(status.done,job.done);assert.equal(status.result,job.result);pulses++;assert(pulses<10000000,'job must terminate')}return{result:job.result,pulses,longestMs:longest,totalMs:performance.now()-start}}
function encode(value,budget=0){return drain(codec.encodeJob(value),budget)}
function decode(value,budget=0){return drain(codec.decodeJob(value),budget)}
function equal(actual,expected,label){assert.deepEqual(bytes(actual),bytes(expected),label)}
// The graph has data-only properties, null prototypes, holes, odd index keys,
// numbers using each canonical tag, shared typed arrays, cycles and Unicode.
e.run(`globalThis.qaGraph=(()=>{const root={a:undefined,n:null,booleans:[false,true],numbers:[0,-0,1,-1,32767,-32768,32768,-32769,1.5,Number.MAX_VALUE,Number.MIN_VALUE],unicode:'한글 😀 \\u0000 \\ud800',empty:'',none:Object.create(null),holes:new Array(12),bytes:new Uint8Array([0,255,127])};root.none.zero=0;root.holes[2]=root;root.holes[8]=undefined;root.holes.extra=root.bytes;Object.defineProperty(root,'__proto__',{value:root.none,enumerable:true});root.self=root;root.same=root.bytes;root.none['4294967294']='index';root.none['4294967295']='text';root.none['01']='leading';return root})()`);
const fixture=e.c.qaGraph,wire=codec.encode(fixture),encoded=encode(fixture),decoded=decode(wire);
assert(encoded.pulses>1&&decoded.pulses>1,'zero-budget pulses must really yield');equal(encoded.result,wire,'sync/job byte parity');equal(codec.encode(decoded.result),wire,'job decoded graph canonical byte parity');
assert.strictEqual(decoded.result.self,decoded.result);assert.strictEqual(decoded.result.holes[2],decoded.result);assert.strictEqual(decoded.result.same,decoded.result.bytes);assert.strictEqual(decoded.result.holes.extra,decoded.result.bytes);assert.equal(Object.getPrototypeOf(decoded.result.none),null);assert.strictEqual(decoded.result.__proto__,decoded.result.none);assert(!Object.hasOwn(decoded.result.holes,0));assert(Object.hasOwn(decoded.result.holes,8));assert(Object.is(decoded.result.numbers[1],-0));
// Composite capabilities retain dependency identity through ordinary subclasses.
assert(e.run(`(()=>{const composed=mixin(Rollable,Base=>class extends Base{}),T=mixin(Object,composed,Rollable);class U extends T{}return mixin(U,Rollable)===U})()`),'composition and subclassing deduplicate Rollable by factory identity');
assert(e.run(`(()=>{let hostCalls=0,wrapperCalls=0;const marker={};class Host{constructor(...args){hostCalls++;this.args=args;this.hp=10;this.stun=0}}const wrapper=Base=>class extends Base{constructor(...args){super(...args);wrapperCalls++}},composed=mixin(Rollable,wrapper),Actor=mixin(Host,composed,Rollable),actor=new Actor('leader',marker,17);return hostCalls===1&&wrapperCalls===1&&actor instanceof Host&&actor.args.length===3&&actor.args[0]==='leader'&&actor.args[1]===marker&&actor.args[2]===17&&typeof actor.startRoll==='function'&&actor.roll.cooldown.leftMs===0&&mixin(Actor,Rollable)===Actor})()`),'composition forwards every host argument through super exactly once');
// Native actor own-state serialization preserves aliases, cycles and odd keys.
e.run(`globalThis.qaActorGraph=(()=>{const leader=Object.assign(new MoaActor(),{id:-1,type:'mother',before:undefined,after:'tail'}),group={hit:false};leader.roll.cooldown.leftMs=100;leader.roll.leftMs=50;leader.roll.invulnerability.leftMs=25;leader.roll.progress=.5;leader.roll.direction.x=1;leader.group=group;leader.self=leader;Object.defineProperty(leader,'__proto__',{value:group,enumerable:true,writable:true,configurable:true});return {leader,same:leader,nested:{mother:leader},group}})();globalThis.qaActorWire=BloomLiveCodec.encode(qaActorGraph);globalThis.qaActorKeys=Object.keys(qaActorGraph.leader);`);
const actorWire=e.c.qaActorWire;
assert(e.run('MoaActor.is(qaActorGraph.leader)&&qaActorGraph.leader===qaActorGraph.same&&qaActorGraph.leader===qaActorGraph.nested.mother'));
equal(encode(e.c.qaActorGraph).result,actorWire,'cooperative native actor byte parity');
const actorDecoded=decode(actorWire).result;
assert.strictEqual(actorDecoded.leader,actorDecoded.same);assert.strictEqual(actorDecoded.leader,actorDecoded.nested.mother);assert.strictEqual(actorDecoded.leader.self,actorDecoded.leader);assert.strictEqual(actorDecoded.leader.group,actorDecoded.group);assert.strictEqual(actorDecoded.leader.__proto__,actorDecoded.group);
assert.deepEqual(Array.from(Object.keys(actorDecoded.leader)),Array.from(e.c.qaActorKeys),'native own-state order stable');
assert(Object.hasOwn(actorDecoded.leader,'roll'));assert(!Object.hasOwn(actorDecoded.leader,'rollLastX'));assert(Object.hasOwn(actorDecoded.leader,'before'));
e.run('globalThis.qaActorExpected=BloomLiveCodec.decode(qaActorWire);MoaActor.hydrate(qaActorExpected.leader);qaActorExpected.leader.roll.cooldown.leftMs=77;qaActorGraph.leader.roll.cooldown.leftMs=77');
equal(codec.encode(e.c.qaActorGraph),codec.encode(e.c.qaActorExpected),'hydrated native actor exact bytes');
equal(encode(e.c.qaActorGraph).result,codec.encode(e.c.qaActorExpected),'cooperative hydrated native actor exact bytes');
assert.throws(()=>e.run('BloomLiveCodec.encode(new (class ForeignActor {})())'),/plain or actor capsule records/,'unknown prototypes remain forbidden');
assert.throws(()=>e.run("MoaActor.hydrate({id:-2,type:'mother',rollCooldownMs:0})"),/Invalid native actor/,'no legacy actor import path');
// Strings span multiple encode/UTF-8 decode chunks, including split surrogate
// pairs and split multibyte sequences. No intermediate chunk changes the wire.
e.run(`globalThis.qaLarge={text:'a'.repeat(4095)+'😀한글'.repeat(15000)+'\\ud800',typed:new Uint8Array(250000)};for(let i=0;i<qaLarge.typed.length;i++)qaLarge.typed[i]=i%251;qaLarge.repeat=qaLarge.text;qaLarge.shared=qaLarge.typed`);
const largeWire=codec.encode(e.c.qaLarge),largeEncode=encode(e.c.qaLarge),largeDecode=decode(largeWire);
equal(largeEncode.result,largeWire,'large text/bytes encoding parity');equal(codec.encode(largeDecode.result),largeWire,'large text/bytes decode parity');assert.strictEqual(largeDecode.result.shared,largeDecode.result.typed);
// Jobs interleave safely with each other and with the synchronous scratch codec.
const interleaved=[codec.encodeJob(fixture),codec.encodeJob(e.c.qaLarge),codec.decodeJob(wire),codec.decodeJob(largeWire)];
while(interleaved.some(job=>!job.done)){for(const job of interleaved)job.pulse({budgetMs:0});codec.encode(fixture)}
equal(interleaved[0].result,wire,'interleaved first bytes');equal(interleaved[1].result,largeWire,'interleaved second bytes');equal(codec.encode(interleaved[2].result),wire,'interleaved first decode');equal(codec.encode(interleaved[3].result),largeWire,'interleaved second decode');
for(const job of [codec.encodeJob(e.c.qaLarge),codec.decodeJob(largeWire)]){job.pulse({budgetMs:0});assert(!job.done);job.cancel();assert(job.done&&job.cancelled);assert.equal(job.result,undefined);assert.equal(job.pulse().done,true);job.cancel()}
assert.throws(()=>codec.encodeJob(fixture).pulse({budgetMs:NaN}),/job budget/);
// The sync parser is the compatibility oracle, including canonical rejection.
const malformed=['424c4733040000000000000000','424c47330c0000','424c47330802000000020000000000000001000000310001000000010000003000','424c47330802000000020000000000000001000000300501000000010000007802000000010000003105030000000100000078','424c4733050000000003000000efbbbf','424c4733050000000002000000c080','424c47330600000000','424c47330a0100000000000000080000005f5f70726f746f5f5f00'];
// The final fixture is a valid own __proto__ key and verifies that the rejection
// differential also accepts canonical unusual data.
let rejected=0,accepted=0;
function differential(input){let sync,job,a,b;try{sync=codec.decode(input)}catch(error){a=error}try{job=decode(input,0).result}catch(error){b=error}assert.equal(!!a,!!b,'sync/job malformed rejection parity');if(a)rejected++;else{accepted++;equal(codec.encode(job),codec.encode(sync),'accepted mutation canonical parity')}}
for(const hex of malformed)differential(Uint8Array.from(Buffer.from(hex,'hex')));
for(let i=0;i<wire.length;i++){differential(wire.subarray(0,i));const bad=wire.slice();bad[i]^=255;differential(bad)}
const appended=new Uint8Array(wire.length+1);appended.set(wire);differential(appended);
const bomText=new Uint8Array(17013);new DataView(bomText.buffer).setUint32(0,0x33474c42,true);bomText[4]=5;new DataView(bomText.buffer).setUint32(9,17000,true);bomText.fill(65,13);bomText.set([239,187,191],13);differential(bomText);
assert.throws(()=>decode(new Uint8Array(8388609)),/capsule bytes/);
assert.throws(()=>encode(new Uint8Array(8388608),8),/capsule bytes/);
e.run(`globalThis.qaDeep={};{let x=qaDeep;for(let i=0;i<256;i++){x.child={};x=x.child}}`);const deepWire=codec.encode(e.c.qaDeep);assert.throws(()=>codec.decode(deepWire),/capsule depth/);assert.throws(()=>decode(deepWire),/capsule depth/);assert.throws(()=>encode(e.c.qaDeep),/capsule depth/);
function header(tag,...values){const data=new Uint8Array(5+4*values.length),view=new DataView(data.buffer);view.setUint32(0,0x33474c42,true);data[4]=tag;values.forEach((value,index)=>view.setUint32(5+index*4,value,true));return data}
for(const bad of [header(8,1000001,0),header(10,1000001)]){assert.throws(()=>codec.decode(bad));assert.throws(()=>decode(bad))}
e.run(`globalThis.qaTooLong=new Array(1000001)`);assert.throws(()=>encode(e.c.qaTooLong),/array length/);
// Exact maximum-depth acceptance, including its scalar leaf.
e.run(`globalThis.qaAtDepth={};{let x=qaAtDepth;for(let i=0;i<254;i++){x.child={};x=x.child}x.leaf=0}`);const atDepthWire=codec.encode(e.c.qaAtDepth);equal(encode(e.c.qaAtDepth).result,atDepthWire,'maximum permitted depth encode');equal(codec.encode(decode(atDepthWire).result),atDepthWire,'maximum permitted depth decode');
// The byte ownership contract is input-only: decoded typed arrays are independent.
const typedWire=codec.encode(new Uint8Array([1,2,3])),typedJob=codec.decodeJob(typedWire);assert.equal(typedJob.done,false);const typed=drain(typedJob).result;typedWire.fill(0);equal(typed,new Uint8Array([1,2,3]),'decoded bytes do not alias owned input');
const failing=codec.decodeJob(new Uint8Array([0]));assert.throws(()=>failing.pulse(),/truncated/);assert(failing.done);assert.equal(failing.result,undefined);assert.throws(()=>failing.pulse(),/truncated/);
// Use the same actual shared world as the large bootstrap path, with no reduced
// troop cap/rate. Jobs only read while this stopped boundary is held by the test.
e.run(`CONFIG.session.mode='online';BloomSimulation.initialize(12345);WorldMembership.apply({epoch:0,tick:0,players:['a','b','c','d','e']});for(const p of WorldPlayers.all()){const d=WorldPlayers.data(p);let level=1;while(rarityCapacityAtLevel(level)<1000)level++;d.campaign.abilities.level=level;d.campaign.abilities.xp=abilityThreshold(level);moaSyncLevelHP(p.leader);p.leader.hp=p.leader.maxHp;for(const type of ['swordsman','shellbug','dandelion','archer'])rarityAcquire(p.accountOwner,type,2,250);for(const r of (globalThis.rarityGetAccount||rarityAccount)(p.accountOwner).active)rarityLock(r.uid,true);rarityRecall(p.accountOwner)}rebuildGrid();spatialBoundary();globalThis.qaSyncRoot=bloomCapture(true);globalThis.qaJobRoot=bloomCapture(true);globalThis.qaSpatial={units:spatialUnits,anchors:spatialAnchors};`);
const started=performance.now(),liveWire=codec.encode(e.c.qaSyncRoot,e.c.qaSpatial),syncMs=performance.now()-started;
assert(liveWire.length>4*1024*1024,'actual large world must exceed 4 MiB');
const liveEncoded=drain(codec.encodeJob(e.c.qaJobRoot,e.c.qaSpatial));equal(liveEncoded.result,liveWire,'actual 5 x 1000 world exact encoded bytes');
const liveDecoded=drain(codec.decodeJob(liveWire));equal(codec.encode(liveDecoded.result),liveWire,'actual 5 x 1000 world exact decoded bytes');
assert(liveEncoded.pulses>1&&liveDecoded.pulses>1,'large world work split across pulses');assert(e.run('bloomValidate(qaSyncRoot)'),'unchanged source boundary validates');
// A wide graph reaches the node cap without crossing the depth or byte caps.
e.run(`globalThis.qaNodes=Array.from({length:199999},()=>({}))`);const nodesWire=codec.encode(e.c.qaNodes);equal(encode(e.c.qaNodes,8).result,nodesWire,'exact node-budget encoding');equal(codec.encode(decode(nodesWire,8).result),nodesWire,'exact node-budget decoding');
e.run(`qaNodes.push({})`);assert.throws(()=>codec.encode(e.c.qaNodes),/node budget/);assert.throws(()=>encode(e.c.qaNodes,8),/node budget/);
const extraNode=Buffer.alloc(19);extraNode.writeUInt32LE(199999,0);extraNode.writeUInt32LE(6,4);extraNode.write('199999',8);extraNode[14]=10;const excessNodes=Uint8Array.from(Buffer.concat([Buffer.from(nodesWire),extraNode]));const excessView=new DataView(excessNodes.buffer);excessView.setUint32(5,200000,true);excessView.setUint32(9,200000,true);assert.throws(()=>codec.decode(excessNodes),/capsule node/);assert.throws(()=>decode(excessNodes,8),/capsule node/);
const summary={pass:true,sourceSHA256:source.sha256,malformedDifferential:{rejected,accepted},graph:{bytes:liveWire.length,synchronousEncodeMs:syncMs,encode:{pulses:liveEncoded.pulses,longestMs:liveEncoded.longestMs,totalMs:liveEncoded.totalMs},decode:{pulses:liveDecoded.pulses,longestMs:liveDecoded.longestMs,totalMs:liveDecoded.totalMs}},checks:['canonical bytes and malformed acceptance parity','cycles/shared refs/null prototypes/holes/own __proto__','chunked UTF-8 and byte arrays','interleaved independent jobs and sync scratch','cancellation and budgets','actual 5 x 1000 world/spatial capture']};
console.log(JSON.stringify(summary));

assert.throws(()=>e.run("mixin(Object,Rollable,Base=>class extends Base{startRoll(){return false}})"),/Conflicting mixin method/,'distinct capability cannot silently override another public method');
assert(e.run("(()=>{let count=0;const make=()=>Base=>class extends Base{constructor(...args){super(...args);count++}};const A=make(),B=make();new (mixin(Object,A,B))();return count===2})()"),'same-name distinct factory identities are not deduplicated');

assert(e.run("(()=>{const A=Base=>class extends Base{constructor(...args){super(...args);this.once=(this.once||0)+1}};const Together=mixin(A);const Base=mixin(Object,A);return mixin(Base,Together)===Base&&new (mixin(Object,A,Together))().once===1})()"),'fully deduplicated composite may return its existing host unchanged');

assert.throws(()=>e.run('new (mixin(Object,Rollable))().startRoll({x:1,y:0},100)'),/Rollable requires/,'real host requirements fail at capability use boundary');
assert(e.run("(()=>{const calls=[];class Host{step(){calls.push('host')}}const Lifecycle=Base=>class extends Base{static mixinOverrides=['step'];step(){super.step();calls.push('capability')}};new (mixin(Host,Lifecycle))().step();return calls.join()==='host,capability'})()"),'explicit lifecycle override keeps an ordered super chain');
assert.throws(()=>e.run("(()=>{const actor=new (mixin(Object,Rollable))();Object.assign(actor,{hp:1,x:0,y:0,size:Infinity,type:'mother'});actor.startRoll({x:1,y:0},100)})()"),/Rollable requires/,'geometry host rejects nonfinite body size');
