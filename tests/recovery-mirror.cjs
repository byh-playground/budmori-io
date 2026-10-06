'use strict';
// One continuing campaign through actual worker_threads and the shipped SDK.
// The Worker bridge and engine are extracted from the target HTML, never a loose
// implementation file. Test-only fixture hooks run between stopped SDK sessions.
// No browser, GPU, visual quality, storage quota, or device-FPS claim is made.
const fs=require('fs'),vm=require('vm'),assert=require('assert'),crypto=require('crypto'),{Worker}=require('worker_threads');
const file=process.argv[2]||`${__dirname}/../index.html`;
const output=process.env.BLOOM_SAVE_REPORT||`${__dirname}/v63-save-e2e-results.json`;
const html=fs.readFileSync(file,'utf8');
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const bridges=scripts.filter(s=>s.includes('function bloomWorkerDOMBootstrap()'));
assert.equal(bridges.length,1,'Exactly one shipped Worker bridge');
const bridge=bridges[0],bridgeIndex=scripts.indexOf(bridge),ctx=vm.createContext({BLOOM_HEADLESS:true,console});
vm.runInContext(bridge,ctx);ctx.sources=scripts.slice(0,bridgeIndex);
const get=name=>vm.runInContext(name+'.toString()',ctx);
const source=`const{parentPort}=require('worker_threads');globalThis.postMessage=m=>parentPort.postMessage(m);globalThis.BLOOM_WORKER_TEST_MODE=true;\n(${get('bloomWorkerDOMBootstrap')})();\n`+vm.runInContext('bloomWorkerEngineSource(sources)',ctx)+`\n(${get('bloomWorkerRuntime')})();
parentPort.on('message',data=>{
 try{
  if(data.type==='__read'){parentPort.postMessage({type:'reply',id:data.id,value:eval(data.expression)});return}
  if(data.type==='__fixture'){
   if(bloomInTick)throw Error('Fixture may not run inside a tick');bloomSession.close();
   eval('(()=>{'+data.source+'})()');rebuildGrid();spatialBoundary();bloomStartDriver();playing=true;paused=true;modalKind='pause';
   if(!bloomAdapter.validateSnapshot(bloomAdapter.save(),{tick:bloomTick}))throw Error('Invalid production checkpoint');
   parentPort.postMessage({type:'reply',id:data.id,value:true});return;
  }
  if(data.type==='__breakSession'){bloomStartDriver=()=>{bloomSession.close();throw Error('Controlled session recreation failure')};parentPort.postMessage({type:'reply',id:data.id,value:true});return}
  globalThis.onmessage({data});
 }catch(error){parentPort.postMessage({type:'reply',id:data.id,error:error.stack})}
});`;
const allWorkers=[];
function session(){
 const worker=new Worker(source,{eval:true}),pending=new Map(),messages=[];let id=0,mirror=null,readyResolve,readyReject;
 const ready=new Promise((resolve,reject)=>{readyResolve=resolve;readyReject=reject});
 worker.on('error',error=>{readyReject(error);for(const p of pending.values()){clearTimeout(p.timer);p.reject(error)}pending.clear()});
 worker.on('message',m=>{messages.push(m);if(m.type==='worker-ready')readyResolve();if(m.type==='reply'){const p=pending.get(m.id);if(p){clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(new Error(m.error)):p.resolve(m.value)}}if(m.type==='view'){ctx.packet=m;ctx.mirror=mirror;mirror=vm.runInContext('bloomApplyViewPacket(packet,mirror)',ctx);worker.postMessage({type:'ack',epoch:m.epoch,sequence:m.sequence,tick:m.tick})}});
 const request=(type,data={})=>new Promise((resolve,reject)=>{const n=++id,timer=setTimeout(()=>{pending.delete(n);reject(new Error('Worker timed out: '+type))},30000);pending.set(n,{resolve,reject,timer});worker.postMessage({type,...data,id:n})});
 const s={worker,messages,request,get mirror(){return mirror},async init(disk){await ready;return request('init',{tickRate:20,manualClock:true,seed:12345,disk})},control(p={}){worker.postMessage({type:'control',playing:true,paused:false,modalKind:'',input:{x:0,y:0,manual:true},...p})},read(expression){return request('__read',{expression})},fixture(source){return request('__fixture',{source})},tick(count=1){return request('testTicks',{count})},command(command){return request('command',{command})},close(){for(const p of pending.values())clearTimeout(p.timer);return worker.terminate()}};
 allWorkers.push(s);return s;
}

(async()=>{const a=session();try{
 await a.init();
 await a.fixture(`for(const c of state.camps){c.enabled=false;c.spawned=true;c.regrowth=[]}
  globalThis.qaRival=spawn('swordsman','enemy',state.mother.x+250,state.mother.y,{camp:0,variant:'rival'});qaRival.stun=100000;
  rarityAcquire(-1,'swordsman',0,1);state.mother.hp=1;state.mother.stun=10;
  globalThis.qaKiller=spawn('swordsman','enemy',state.mother.x+20,state.mother.y,{camp:0,rarityGrade:5});qaKiller.aggroAt=0;qaKiller.cooldown=0;`);
 a.control();await a.tick(20);
 const id=await a.read('qaRival.id');assert(await a.read('state.dead'),'production combat must kill Moa');
 const before=a.mirror.state.units.find(u=>u.id===id);assert(before.rival?.abilities,'rival published before recovery');
 a.control({paused:true,modalKind:'defeat'});await a.command({type:'recover'});await a.tick(1);
 const authority=await a.read(`({rival:!!idMap.get(${id}).rival,level:idMap.get(${id}).rival.abilities.level,dead:state.dead,tick:bloomTick})`);
 const mirror=a.mirror.state.units.find(u=>u.id===id),packet=a.messages.filter(m=>m.type==='view').at(-1),delta=packet.updates.find(u=>u.key==='u:'+id);
 console.log(JSON.stringify({authority,mirror:{rival:!!mirror.rival,leader:mirror.rivalLeader},replacementKeys:delta?.replaced,changedKeys:Object.keys(delta?.changes||{})},null,2));
 assert(mirror.rival?.abilities,'Recovery must preserve unchanged replacement rival metadata in the render mirror');
 console.log('PASS actual20TPS death -> SDK recovery keeps rival ability metadata');
 const firstRival=mirror.rival;
 a.control();await a.tick(80);assert(await a.read('state.dead'),'second production combat death');
 a.control({paused:true,modalKind:'defeat'});await a.command({type:'recover'});await a.tick(1);
 const second=a.mirror.state.units.find(u=>u.id===id);assert(second.rival?.abilities);assert.notStrictEqual(second.rival,firstRival,'recovery replacement identity is preserved even when contents are equal');
 console.log('PASS second combat death/recovery preserves fresh rival identity and complete value');
 const disk=await a.request('snapshot'),oldMirror=a.mirror,oldUnit=second;
 assert(await a.request('load',{disk}));assert.notStrictEqual(a.mirror,oldMirror);assert.notStrictEqual(a.mirror.state.units.find(u=>u.id===id),oldUnit);assert(a.mirror.state.units.find(u=>u.id===id).rival.abilities);
 console.log('PASS disk restore replaces mirror generation without stale same-id actors');
 await a.request('reset');assert(!a.mirror.state.units.some(u=>u.id===id&&u.rivalLeader),'new game removes prior rival identity');
 console.log('PASS new-game reset removes obsolete rival ownership');
 // Exercise the exact publisher for equal-object/array replacement without any
 // other scalar changes. These operations used to disappear or erase the field.
 const pub=vm.createContext({});const runtime=get('bloomWorkerRuntime'),start=runtime.indexOf('  function fieldDelta('),end=runtime.indexOf('  function metadataDelta()',start);
 vm.runInContext('const entityCache=new Map(),nestedRefs=new Map();'+runtime.slice(start,end),pub);
 pub.object={id:2,rival:{abilities:{level:3}},pendingMelee:{left:1,total:1},links:[{x:2}]};vm.runInContext("fieldDelta('u:2',object)",pub);
 pub.object={id:2,rival:{abilities:{level:3}},pendingMelee:{left:1,total:1},links:[{x:2}]};const delta2=vm.runInContext("fieldDelta('u:2',object)",pub);assert(delta2);assert.deepEqual(Array.from(delta2.replaced),['rival','pendingMelee','links']);for(const key of delta2.replaced)assert(Object.hasOwn(delta2.changes,key));
 console.log('PASS equal nested object/array replacement emits both identity and payload without scalar changes');
 }finally{for(const worker of allWorkers)await worker.close()}})().catch(e=>{console.error(e.stack);process.exitCode=1});
