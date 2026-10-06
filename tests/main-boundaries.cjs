'use strict';
const fs=require('fs'),assert=require('assert');
const {session}=require('./main-harness.cjs');
const file=process.argv[2]||`${__dirname}/../index.html`,html=fs.readFileSync(file,'utf8').replace('/* MAIN_RUNTIME_TEST_HOOK */','globalThis.qaMarkBooted=()=>{booted=true};/* MAIN_RUNTIME_TEST_HOOK */');
(async()=>{const a=session(file,html);try{
 await a.init();await a.fixture(`for(const c of state.camps){c.enabled=false;c.spawned=true;c.regrowth=[]}for(const u of state.units){u.stun=100000;u.aggroAt=u.wanderAt=state.time+100000}const ability=abilityState();ability.xp=12;ability.level=2;ability.chosen=0;ability.draft=null;`);a.control();
 a.e.run('qaMarkBooted();view.w=view.h=2000;view.x=state.mother.x;view.y=state.mother.y;BLOOM_HEADLESS=false;bloomEventSink=()=>{}');
 await a.command({type:'tutorialAck'});let settled=false;const pending=a.request('snapshot').then(v=>{settled=true;return v});
 await a.tick();assert(!settled);assert.equal(await a.read('bloomInputPending'),1);assert(!await a.read('abilityState().draft'));assert(!a.e.run('BloomDiagnostics.fatal'));
 await a.tick();const disk=JSON.parse(await pending);assert(settled);assert.equal(await a.read('bloomInputPending'),0);assert(await a.read('!!abilityState().draft'));assert(!a.e.run('BloomDiagnostics.fatal'));assert.equal(disk.tick,await a.read('bloomTick'));
 console.log('PASS booted presentation ability prompt defers requested snapshot until follow-up SDK command settles');
 }finally{await a.close()}})().catch(error=>{console.error(error.stack);process.exitCode=1});
