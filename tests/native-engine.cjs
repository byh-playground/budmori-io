'use strict';
// ONE continuing campaign story against the actual shipped engine and embedded SDK.
// The DOM surface replays the production registered handlers; it is not a browser,
// layout, device, GPU, or visual-quality test. Fixture chapters are explicitly
// disclosed and occur only while the session is stopped, never inside a tick.
// Supplemental benchmark realm: V8's native global object, without Node VM's
// contextified global proxy. It runs the same shipped scripts and actual SDK.
const fs=require('fs'),vm=require('vm'),assert=require('assert'),crypto=require('crypto');
const CONFIG_PLACEMENT_LIMIT=160;
function surface(id=''){
 const classes=new Set();
 return {id,dataset:{},handlers:{},style:{setProperty(){}},classList:{add(...x){x.forEach(v=>classes.add(v))},remove(...x){x.forEach(v=>classes.delete(v))},contains(x){return classes.has(x)},toggle(x,on){if(on===undefined)on=!classes.has(x);on?classes.add(x):classes.delete(x);return on}},children:[],scrollTop:0,innerHTML:'',textContent:'',value:'',disabled:false,
 addEventListener(t,f,o){(this.handlers[t]??=[]).push({f,capture:o===true||!!o?.capture})},removeEventListener(){},getBoundingClientRect(){return{left:0,top:0,width:390,height:780}},setAttribute(k,v){this[k]=v},getAttribute(k){return this[k]},appendChild(x){this.children.push(x);x.parentElement=this;return x},prepend(x){this.children.unshift(x)},insertBefore(x){this.appendChild(x)},remove(){},focus(){},querySelectorAll(){return[]},querySelector(){return null},closest(selector){if(selector==='button')return this.tagName==='BUTTON'?this:null;return null},emit(t,e){for(const {f}of [...this.handlers[t]||[]].sort((a,b)=>Number(b.capture)-Number(a.capture))){f(e);if(e.stopped)break}if(!e.stopped&&typeof this['on'+t]==='function')this['on'+t](e)}};
}
function engine(file=`${__dirname}/BLOOM_LIVING_FRONTIER.html`,sourceHTML,nativeContext=null){
 const doc=surface('document'),win=surface('window'),elements=new Map();
 doc.getElementById=id=>{if(!elements.has(id)){const e=surface(id);e.parentElement=surface();elements.set(id,e)}return elements.get(id)};
 doc.createElement=tag=>Object.assign(surface(),{tagName:tag.toUpperCase()});doc.body=surface('body');doc.head=surface('head');doc.documentElement=surface('html');
 const canvas=doc.getElementById('view');
 const c=Object.assign(vm.createContext(vm.constants.DONT_CONTEXTIFY),{BLOOM_HEADLESS:true,testContext:nativeContext,devicePixelRatio:1,testCanvas:canvas,document:doc,console,TextEncoder,TextDecoder,structuredClone,performance,URL,Uint8Array,ArrayBuffer,DataView,setTimeout,clearTimeout,innerWidth:390,innerHeight:780,localStorage:{getItem(){return null},setItem(){}},requestAnimationFrame(){},matchMedia(){return{matches:false,addEventListener(){}}}});
 // The native renderer and game run in separate test realms. Share the host
 // constructor before scripts allocate arrays, preserving production instanceof
 // and vertex-layout validation for both static and dynamic mesh uploads.
 if(nativeContext)c.Float32Array=Float32Array;
 c.window=c;c.addEventListener=win.addEventListener.bind(win);let scripts=0;
 const artifact=sourceHTML??fs.readFileSync(file,'utf8'),html=require('./runtime-source.cjs').materialize(file,artifact),sha256=crypto.createHash('sha256').update(html).digest('hex');
 for(const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)){
  // Supply only missing DOM objects. Gameplay, RNG, commands, SDK, and rendering
  // guards remain production code, unchanged.
  const source=m[1].replace("const canvas=(globalThis.BLOOM_HEADLESS ? null : ($('view')))","const canvas=(globalThis.BLOOM_HEADLESS ? globalThis.testCanvas : ($('view')))").replace('return globalThis.BLOOM_HEADLESS?null:document.getElementById(id)','return document.getElementById(id)');
  vm.runInContext(nativeContext?source.replace("ctx=(globalThis.BLOOM_HEADLESS ? null : (canvas.getContext('2d',{alpha:false})))", "ctx=globalThis.testContext"):source,c,{filename:`${file}:script-${++scripts}`});
 }
 const run=(source)=>vm.runInContext(source,c),json=source=>JSON.parse(run(`JSON.stringify(${source})`));
 const click=dataset=>{const button=Object.assign(surface(),{tagName:'BUTTON',dataset});doc.emit('click',{target:button,preventDefault(){},stopImmediatePropagation(){this.stopped=true}})};
 const tick=(n=1,input={x:0,y:0,manual:true})=>{for(let i=0;i<n;i++){c.testInput=input;const result=run('BloomSimulation.session.advance(BloomSimulation.encodeInput(testInput))');assert.equal(result.status,'advanced',JSON.stringify(result));assert.equal(run('BloomSimulation.session.failure'),null)}};
 const until=(source,limit=900,label=source)=>{let n=0;while(!run(source)&&n<limit){tick();n++}assert(run(source),`Timed out after ${n} actual engine ticks: ${label}`);return n};
 const fixture=source=>{run('BloomSimulation.session?.close()');run(`(()=>{${source}})()`);run('rebuildGrid();spatialBoundary();BloomSimulation.createSession();playing=true;paused=false;modalKind="";');assert(run('BloomSimulation.adapter.validateSnapshot(BloomSimulation.adapter.save(),{tick:0})'),'fixture must be a valid production snapshot')};
 return{c,doc,canvas,run,json,click,tick,until,fixture,scripts,file,sha256,html};
}
// This synthetic SDK transport regression has one gameplay actor, solo. The
// peer endpoint supplies transport/confirmation only; real participant admission
// and multi-actor authority are exercised by shared-world.cjs.
function pair(e,{mode=e.run('CONFIG.netcode.mode'),peerMode=mode,ready=true}={}){
 const peer=engine(e.file,e.html),wire=[],held=[];assert.equal(peer.sha256,e.sha256,'artifact changed while scenario was running');let now=0,delayOwner=false;
 for(const x of [e,peer]){x.c.testClock=()=>now;x.c.testNetcodeMode=x===e?mode:peerMode;x.run('CONFIG.netcode.mode=testNetcodeMode')}
 e.run('BloomSimulation.session?.close();BloomSimulation.createSession({players:["solo","transport-peer"],localPlayerId:"solo",ownerId:"solo",clock:testClock})');
 peer.run('BloomSimulation.initialize(12345)');peer.c.initialBytes=e.run('BloomSimulation.adapter.save()');peer.run('BloomSimulation.adapter.load(initialBytes);BloomSimulation.createSession({players:["solo","transport-peer"],localPlayerId:"transport-peer",ownerId:"solo",clock:testClock});playing=true;paused=false;');
 let receiveOwner,receivePeer;
 const ownerTransport={state:'open',subscribe(f){receiveOwner=f;return()=>{}},send(bytes){(delayOwner?held:wire).push({to:'transport-peer',bytes:bytes.slice()});return true}};
 const peerTransport={state:'open',subscribe(f){receivePeer=f;return()=>{}},send(bytes){wire.push({to:'solo',bytes:bytes.slice()});return true}};
 e.c.testTransport=ownerTransport;peer.c.testTransport=peerTransport;
 e.run('BloomSimulation.session.attachTransport("transport-peer",testTransport)');peer.run('BloomSimulation.session.attachTransport("solo",testTransport)');
 function flush(){let budget=1000;while(wire.length){assert(budget-->0,'transport queue must settle');const p=wire.shift();(p.to==='solo'?receiveOwner:receivePeer)(p.bytes)}}
 flush();assert.equal(e.run('BloomSimulation.session.ready'),ready);assert.equal(peer.run('BloomSimulation.session.ready'),ready);
 function advance(input={x:0,y:0,manual:true}){now+=1000/30;e.tick(1,input);flush();peer.tick();flush();e.run('BloomSimulation.session.poll()');peer.run('BloomSimulation.session.poll()');flush()}
 return{peer,advance,flush,poll(){e.run('BloomSimulation.session.poll()');peer.run('BloomSimulation.session.poll()');flush()},attempt(x,input={x:0,y:0,manual:true}){now+=1000/e.run('CONFIG.sim.tickRate');x.c.testInput=input;const result=x.run('BloomSimulation.session.advance(BloomSimulation.encodeInput(testInput))');flush();return result},delay(){delayOwner=true},release(){delayOwner=false;wire.push(...held.splice(0));flush();e.run('BloomSimulation.session.poll()');peer.run('BloomSimulation.session.poll()');flush()},same(){return Buffer.from(e.run('BloomSimulation.adapter.save()')).equals(Buffer.from(peer.run('BloomSimulation.adapter.save()')))}};
}

module.exports={engine,pair};
