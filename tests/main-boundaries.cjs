'use strict';
const fs=require('fs'),assert=require('assert');
const {session}=require('./main-harness.cjs');
const file=process.argv[2]||`${__dirname}/../index.html`,html=fs.readFileSync(file,'utf8').replace('/* MAIN_RUNTIME_TEST_HOOK */','globalThis.qaMarkBooted=()=>{ui.phase=uiPhase.ready};/* MAIN_RUNTIME_TEST_HOOK */');
async function bootLifecycle(){
 // Supply missing native DOM/media/Canvas sinks while running the real ordered
 // boot. Drawing remains headless; this is not layout, WebGL or browser QA.
 const source=html.replace("const compactHUDMedia=(globalThis.BLOOM_HEADLESS ? null : (matchMedia('(max-width:799px)')))","const compactHUDMedia=matchMedia('(max-width:799px)')").replace("const compactHUDStyle=(globalThis.BLOOM_HEADLESS ? null : (document.createElement('style')))","const compactHUDStyle=document.createElement('style')");
 const a=session(file,source),{e}=a,doc=e.doc,get=doc.getElementById,create=doc.createElement,nodes=[],observers=[],frames=new Map();let frameId=0;
 const context=new Proxy({},{get:(o,k)=>o[k]??(()=>{}),set(o,k,v){o[k]=v;return true}});
 function wrap(node){
  if(node.qaOwned)return node;node.qaOwned=true;node.ownerDocument=doc;nodes.push(node);
  node.removeEventListener=function(type,listener,options){const capture=options===true||!!options?.capture;this.handlers[type]=(this.handlers[type]||[]).filter(h=>h.f!==listener||h.capture!==capture)};
  node.remove=()=>{node.qaRemoved=true};node.getContext=()=>context;return node;
 }
 doc.getElementById=id=>wrap(get(id));doc.createElement=tag=>wrap(create(tag));wrap(doc);wrap(e.canvas);
 e.c.addEventListener=(...args)=>doc.addEventListener(...args);e.c.removeEventListener=(...args)=>doc.removeEventListener(...args);
 const media=e.run('compactHUDMedia');let mediaBound=0;media.addEventListener=()=>mediaBound++;media.removeEventListener=()=>mediaBound--;
 e.c.requestAnimationFrame=fn=>{const id=++frameId;frames.set(id,fn);return id};e.c.cancelAnimationFrame=id=>frames.delete(id);
 e.c.MutationObserver=e.c.ResizeObserver=class{constructor(){this.disconnected=false;observers.push(this)}observe(){}disconnect(){this.disconnected=true}};
 const listeners=()=>nodes.reduce((n,node)=>n+Object.values(node.handlers).reduce((sum,items)=>sum+items.length,0),0);
 try{
  await a.request('init',{tickRate:10,seed:0x6d2b79f5});const initial=Buffer.from(e.run('bloomAdapter.save()'));e.run('boot()');
  assert.equal(e.run('BloomDiagnostics.fatal'),false);assert.deepEqual(Buffer.from(e.run('bloomAdapter.save()')),initial,'UI initialization cannot alter canonical authority');
  assert(e.run('GameUI.active&&__army.CONFIG===CONFIG&&typeof __army.getHealthJuice==="function"&&typeof __army.weaponStepAdapter==="function"'));
  const authority=e.run('bloomSession'),count=listeners(),exports=e.json('Object.keys(__army)'),lateFrame=[...frames.values()][0];
  assert.equal(e.run('boot();GameUI.mount()'),false);assert.equal(e.run('bloomSession'),authority);assert.equal(listeners(),count);assert.deepEqual(e.json('Object.keys(__army)'),exports);assert.equal(frames.size,1);
  await a.close();await a.close();lateFrame(100);
  assert.equal(listeners(),0);assert.equal(mediaBound,0);assert.equal(frames.size,0);assert(observers.every(o=>o.disconnected));assert.equal(e.run('bloomDeviceInput'),null);assert.equal(e.run('GameUI.active'),false);
  assert.equal(doc.getElementById('pause').onclick,undefined);assert.equal(doc.getElementById('sheet').innerHTML,'');assert(nodes.filter(n=>n.tagName==='SPAN'&&(n.id==='autoHuntButton'||n.id==='rollStatus')).every(n=>n.qaRemoved));
  assert.deepEqual(Buffer.from(e.run('bloomAdapter.save()')),initial);assert.equal(e.run('boot();GameUI.mount()'),false);assert.equal(listeners(),0);
  console.log('PASS ordered boot preserves canonical initialization; repeat boot is inert and close releases listeners, RAF, DOM input, observers and view controls');
 }finally{await a.close()}
}
(async()=>{const a=session(file,html);try{
 await a.init();await a.fixture(`for(const c of state.camps){c.enabled=false;c.spawned=true;c.regrowth=[]}for(const u of state.units){u.stun=100000;u.aggroAt=u.wanderAt=state.time+100000}const ability=abilityState();ability.xp=12;ability.level=2;ability.chosen=0;ability.draft=null;moaSyncLevelHP(state.mother);state.mother.hp=state.mother.maxHp;`);a.control();
 a.e.run('qaMarkBooted();view.w=view.h=2000;view.x=state.mother.x;view.y=state.mother.y;BLOOM_HEADLESS=false;bloomEventSink=()=>{}');
 await a.command({type:'tutorialAck'});let settled=false;const pending=a.request('snapshot').then(v=>{settled=true;return v});
 await a.tick();assert(!settled);assert.equal(await a.read('bloomInputPending'),1);assert(!await a.read('abilityState().draft'));assert(!a.e.run('BloomDiagnostics.fatal'));
 await a.tick();const disk=JSON.parse(await pending);assert(settled);assert.equal(await a.read('bloomInputPending'),0);assert(await a.read('!!abilityState().draft'));assert(!a.e.run('BloomDiagnostics.fatal'));assert.equal(disk.tick,await a.read('bloomTick'));
 console.log('PASS booted presentation ability prompt defers requested snapshot until follow-up SDK command settles');
 }finally{await a.close()}await bootLifecycle()})().catch(error=>{console.error(error.stack);process.exitCode=1});
