import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import runtimeHook from './main-runtime-hook.cjs';
import sharedHarness from './shared-harness.cjs';
// Optional --sdk is bundled in this test response only, never into index.html.
const source=sharedHarness.candidate();
const html=source.html;
// Test-only stopped-session fixtures. This route is never shipped as index.html.
let instrumented=html.replace('/* MAIN_RUNTIME_TEST_HOOK */',runtimeHook+';globalThis.__qaGestures=[];')
 .replace('onGesture(event){bloomInputPoints.push(event)}','onGesture(event){globalThis.__qaGestures?.push({...event,wall:performance.now()});bloomInputPoints.push(event)}');
assert.notEqual(instrumented,html);
const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.end(req.url==='/raw'?html:instrumented)});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser,page;
const report={sourceSHA256:createHash('sha256').update(html).digest('hex'),sdk:source.sdk,environment:'Chromium + SwiftShader WebGL1, main-thread SDK authority, explicit solo mode; no phone FPS claim',checks:[]};
try{
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{}),args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 page=await browser.newPage({viewport:{width:1000,height:800},hasTouch:true,deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('PAGEERROR',e.stack)});page.on('console',m=>{if(m.type()==='error')console.error('PAGECONSOLE',m.text())});
 const cdp=await page.context().newCDPSession(page);
 async function replayTouchDoubleTap(x,y){
  // Real Chromium touch -> PointerEvents with authored input times. Software GPU
  // stalls may delay delivery; they must not rewrite the 80ms fixture cadence.
  const at=await page.evaluate(()=>Date.now()/1000);
  for(const [type,offset]of [['touchStart',0],['touchEnd',.02],['touchStart',.08],['touchEnd',.10]])await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchStart'?[{id:1,x,y}]:[],timestamp:at+offset});
  const pair=await page.evaluate(()=>__qaGestures.filter(e=>e.pointerType==='touch').slice(-2));
  assert.equal(pair.length,2);assert.equal(pair[0].type,'tap');assert.equal(pair[1].type,'doubleTap');
  const observed=pair[1].timeMs-pair[0].timeMs;assert(Math.abs(observed-80)<2,'DOM PointerEvent timestamps must preserve authored touch cadence');
  report.touchReplay={expectedUpGapMs:80,observedUpGapMs:observed,deliveryGapMs:pair[1].wall-pair[0].wall};
 }
 const base=`http://127.0.0.1:${server.address().port}`;
 await page.goto(base+'/raw');await page.waitForFunction(()=>globalThis.BloomSimulation?.runtime?.ready&&globalThis.__army?.performance.frames>2,null,{timeout:60000});
 assert.equal(await page.evaluate(()=>document.querySelector('#view').dataset.rendererBackend),'WebGL');assert.equal(await page.evaluate(()=>BloomDiagnostics.fatal),false);report.checks.push('Uninstrumented single HTML boots main-thread SDK and WebGL');
 await page.goto(base+'/qa');await page.waitForFunction(()=>globalThis.BloomSimulation?.runtime?.ready&&globalThis.__army?.performance.frames>2,null,{timeout:60000});
 const fixture=async source=>{await page.evaluate(source=>__budmoriTest.request('__fixture',{source}),source);await page.waitForTimeout(150)};
 const tick=async count=>{await page.evaluate(count=>__budmoriTest.request('testTicks',{count}),count);await page.waitForTimeout(120)};
 const read=expression=>page.evaluate(expression=>__budmoriTest.request('__read',{expression}),expression);
 // Start now selects public matchmaking. This campaign explicitly selects solo
 // before stopped-session fixtures, and never contacts a public relay.
 await page.locator('[data-public="solo"]').click();
 await page.waitForFunction(()=>BloomSimulation.sessionConfig.mode==='local'&&!__army.paused&&PublicSession.phase==='idle');
 await page.locator('#pause').waitFor({state:'visible'});assert.equal(await page.evaluate(()=>document.body.classList.contains('intro')),false,'solo entry leaves the intro HUD state');
 await fixture(`for(const c of state.camps){c.enabled=false;c.spawned=true;c.regrowth=[]}clearPointNav();autoHunt.enabled=false;autoHunt.idleMs=0;`);
 const start=await page.evaluate(()=>({x:__army.state.mother.x,y:__army.state.mother.y}));
 await page.keyboard.down('KeyD');await page.evaluate(()=>advanceSimulationClock(.016));await tick(4);await page.keyboard.up('KeyD');await page.evaluate(()=>advanceSimulationClock(.016));
 const moved=await page.evaluate(()=>({x:__army.state.mother.x,y:__army.state.mother.y}));assert(moved.x>start.x+15);report.checks.push('Shared keyboard input moves authoritative world');
 await page.keyboard.press('Escape');await page.waitForFunction(()=>__army.paused);await page.keyboard.press('Escape');await page.waitForFunction(()=>!__army.paused);report.checks.push('Escape closes paused modal despite focused UI button');
 await page.mouse.dblclick(750,500,{delay:50});await page.evaluate(()=>advanceSimulationClock(.016));await tick(1);await page.waitForFunction(()=>__army.state.mother.rollCooldownMs>0,null,{timeout:10000});
 assert(await page.evaluate(()=>__army.state.mother.rollCooldownMs>0));report.checks.push('Double-click moves and rolls through SDK command queue');
 await fixture(`clearMoaRoll(state.mother);clearPointNav();autoHunt.enabled=false;autoHunt.idleMs=0;`);
 await page.locator('#pause').click();await page.waitForFunction(()=>__army.paused);await page.keyboard.press('Escape');await page.waitForFunction(()=>!__army.paused);const focusX=await page.evaluate(()=>__army.state.mother.x);await page.keyboard.down('KeyD');assert(await page.evaluate(()=>keys.has('KeyD')),'Focused-button regression must observe the real held action');await page.evaluate(()=>advanceSimulationClock(.016));await tick(4);await page.keyboard.up('KeyD');await page.evaluate(()=>advanceSimulationClock(.016));assert(await page.evaluate(x=>__army.state.mother.x>x+10,focusX));report.checks.push('Persistent pause-button focus cannot swallow WASD after Escape resume');
 await fixture(`clearMoaRoll(state.mother);state.mother.rollCooldownMs=0;clearPointNav();autoHunt.enabled=false;`);await page.keyboard.press('Space');await page.evaluate(()=>advanceSimulationClock(.016));await tick(1);assert(await page.evaluate(()=>__army.state.mother.rollCooldownMs>0));report.checks.push('Space submits roll with persistent UI focus');
 await fixture(`clearMoaRoll(state.mother);state.mother.rollCooldownMs=0;clearPointNav();autoHunt.enabled=false;`);await replayTouchDoubleTap(700,500);await page.evaluate(()=>advanceSimulationClock(.016));await tick(1);assert(await page.evaluate(()=>__army.state.mother.rollCooldownMs>0));report.checks.push('Chromium touch event replay preserves 80ms cadence and rolls through shared input');
 await fixture(`for(const c of state.camps){c.enabled=false;c.spawned=true;c.regrowth=[]}for(const u of state.units)if(u.team==='enemy'){u.stun=100000;u.aggroAt=u.wanderAt=state.time+100000}globalThis.qaEnemy=spawn('swordsman','enemy',state.mother.x+65,state.mother.y,{camp:0,rarityGrade:1});qaEnemy.stun=100000;`);
 const enemyId=await read('qaEnemy.id');const hp=await read('qaEnemy.hp');await tick(12);assert((await read(`idMap.get(${enemyId})?.hp??0`))<hp);report.checks.push('Actual combat advances and damage presentation renders');
 await fixture(`const m=state.mother;Object.assign(abilityState(),{ranks:{pod:1,lob:1,thorn:1,spore:1,beam:1,chain:1,breath:1},mods:{},chosen:7,level:8,xp:abilityThreshold(8),draft:null});moaSyncLevelHP(m);m.hp=m.maxHp*.6;m.auxCooldowns={};clearPointNav();autoHunt.enabled=false;for(const u of state.units)if(u.team==='enemy'){u.hp=u.maxHp=1e7;u.stun=100000}let r=state.units.find(u=>u.rivalLeader&&u.hp>0);for(let attempt=0;!r&&attempt<20;attempt++)r=spawn('swordsman','enemy',m.x+250,m.y,{camp:0,variant:'rival'});if(!r)throw Error('No valid rival fixture position');r.stun=100000;const p=ThemedTerrain.safePoint(m.x+110,m.y,20),t=spawn('shellbug','enemy',p.x,p.y,{camp:0,rarityGrade:1});t.hp=t.maxHp=1e7;t.stun=100000;state.camps[0].remaining++;`);
 await tick(2);assert(await read('projectiles.some(p=>p.weapon==="beam")&&projectiles.some(p=>p.weapon==="breath")&&state.units.some(u=>u.rivalLeader)&&state.mother.hp<state.mother.maxHp'));
 const activeRenderHash=await read('BloomOwnedSDK.hashBytes(bloomAdapter.save())');
 await page.evaluate(()=>new Promise(resolve=>{let remaining=12;function next(){if(--remaining===0)resolve();else requestAnimationFrame(next)}requestAnimationFrame(next)}));
 assert.equal(await read('BloomOwnedSDK.hashBytes(bloomAdapter.save())'),activeRenderHash);assert.equal(await page.evaluate(()=>BloomDiagnostics.fatal),false);report.checks.push('Positive-dt render frames with live beam/breath, rival and partial HP leave fresh canonical authority unchanged');
 await page.evaluate(()=>__army.setPaused(true));
 const save=await page.evaluate(()=>BloomSimulation.disk.snapshot());const saveObject=JSON.parse(save);assert.equal(saveObject.schema,'bloom-snapshot-disk-v4');assert.equal(saveObject.formatVersion,4);assert.equal(saveObject.simulationVersion,'bloom-webgl-shared-ms-v3');assert.equal(saveObject.codec,'bloom-live-graph-v3');assert.equal(await read('BloomLiveCodec.decode(bloomAdapter.save()).schema'),'bloom-webgl-shared-ms-v3');
 assert.equal(await read('bloomSession.profile.mode'),'lockstep');
 const normalizedHash='(()=>{const c=BloomLiveCodec.decode(bloomAdapter.save());c.tick=0;return BloomOwnedSDK.hashBytes(BloomLiveCodec.encode(c))})()';
 const savedHash=await read(normalizedHash);
 for(const mode of ['rollback','lockstep','rollback','lockstep']){
  const previous=await read('bloomSession.profile.mode');await read(`CONFIG.netcode.mode=${JSON.stringify(mode)}`);
  assert.equal(await read('bloomSession.profile.mode'),previous,'Config only affects a new session');
  assert.equal(await page.evaluate(disk=>BloomSimulation.disk.load(disk),save),true);
  assert.equal(await read('bloomSession.profile.mode'),mode);assert.equal(await read(normalizedHash),savedHash);
  const before=await read('bloomSnapshotStore.metrics().captures');await tick(2);
  if(mode==='lockstep')assert.equal(await read('bloomSnapshotStore.metrics().captures'),before,'Settled lockstep ticks do not serialize every tick');
  assert.equal(await page.evaluate(()=>BloomDiagnostics.fatal),false);
 }
 report.checks.push('Real browser repeated rollback/lockstep next-session switches retain canonical save; lockstep skips per-tick serialization');
 const bad={...saveObject,byteLength:saveObject.byteLength+1};assert.equal(await page.evaluate(disk=>BloomSimulation.disk.load(disk),save),true);report.checks.push('Canonical save/load succeeds');await page.evaluate(()=>__army.setPaused(false));
 await fixture(`globalThis.qaRealtime=spawn('swordsman','enemy',state.mother.x+65,state.mother.y,{camp:0,rarityGrade:3});qaRealtime.stun=100000;`);
 const realBefore=await read('({tick:bloomTick,time:state.time,hp:state.units.filter(u=>u.team==="enemy").reduce((sum,u)=>sum+u.hp,0)})');
 await page.evaluate(()=>__budmoriTest.request('__clock',{manual:false}));
 await page.waitForFunction(t=>__army.state.time>t+2,realBefore.time,{timeout:15000});
 await page.evaluate(()=>__budmoriTest.request('__clock',{manual:true}));
 const realAfter=await read('({tick:bloomTick,time:state.time,hp:state.units.filter(u=>u.team==="enemy").reduce((sum,u)=>sum+u.hp,0)})');assert(realAfter.tick>realBefore.tick&&realAfter.hp<realBefore.hp);report.normalClockCombat={before:realBefore,after:realAfter};report.checks.push('Normal production setTimeout scheduler advances combat while actual WebGL/RAF renders');
 await fixture(`state.mother.hp=1;state.mother.stun=10;globalThis.qaKiller=spawn('swordsman','enemy',state.mother.x+20,state.mother.y,{camp:0,rarityGrade:5});qaKiller.aggroAt=0;qaKiller.cooldown=0;`);await tick(20);await page.waitForFunction(()=>__army.state.dead);await page.locator('[data-action="recover"]').click();await tick(1);await page.waitForFunction(()=>!__army.state.dead);report.checks.push('Death and requested revival complete through UI/SDK');
 const dense=await readFile(new URL('./dense-fixture.js',import.meta.url),'utf8');await fixture(dense);await tick(5);
 const count=await page.evaluate(()=>__army.state.units.filter(u=>u.team==='friendly'&&u.hp>0).length);assert.equal(count,155);
 const snapshot=await read('BloomOwnedSDK.hashBytes(bloomAdapter.save())');await page.waitForTimeout(1000);assert.equal(await read('BloomOwnedSDK.hashBytes(bloomAdapter.save())'),snapshot);report.checks.push('155-ally rendering keeps authority immutable while paused manual clock');
 if(await page.locator('#modal.show [data-action="close"]').count())await page.locator('#modal.show [data-action="close"]').click();await page.waitForFunction(()=>!document.querySelector('#modal').classList.contains('show'));
 await page.screenshot({path:new URL('./browser-game.png',import.meta.url).pathname});console.log('TEST_SCREENSHOT_JPEG '+(await page.screenshot({type:'jpeg',quality:65})).toString('base64'));
 const gl=await page.evaluate(()=>({backend:document.querySelector('#view').dataset.rendererBackend,frames:__army.performance.frames,diagnostics:BloomDiagnostics.snapshot().runtime.render}));assert(gl.frames>20);report.render=gl;
 const beforeReject=await read('BloomOwnedSDK.hashBytes(bloomAdapter.save())');assert.equal(await page.evaluate(disk=>BloomSimulation.disk.load(disk),JSON.stringify(bad)),false);assert.equal(await read('BloomOwnedSDK.hashBytes(bloomAdapter.save())'),beforeReject);report.checks.push('Corrupt metadata rejected without changing the current dense world');
 // Last chapter intentionally stops the main-thread SDK via a test-only thrown error.
 await page.evaluate(()=>__budmoriTest.request('__read',{expression:'(()=>{BloomDiagnostics.report(new Error("Controlled browser simulation failure"),{kind:"test.main",fatal:true});return true})()'}).catch(()=>{}));await page.waitForFunction(()=>BloomDiagnostics.fatal);
 assert.equal(await page.locator('#bloom-diagnostic-panel').isVisible(),true);assert.equal(await page.evaluate(()=>BloomSimulation.runtime.ready),false);report.checks.push('Main-thread fatal error stops simulation and opens selectable diagnostics');
 assert.deepEqual(errors,[]);
 // Reconstructed Android report boundary: 20 TPS, CSS360x641 at device DPR3
 // (game capped backing store720x1282), real combat deaths and UI recovery twice.
 // This is Chromium mobile emulation, not the user's exact save or Android GPU.
 const mobileContext=await browser.newContext({viewport:{width:360,height:641},deviceScaleFactor:3,hasTouch:true,isMobile:true});
 const mobile=await mobileContext.newPage();page=mobile;mobile.on('pageerror',e=>{errors.push(e.message);console.error('MOBILE_PAGEERROR',e.stack)});
 await mobile.goto(base+'/qa');await mobile.waitForFunction(()=>globalThis.BloomSimulation?.runtime?.ready&&globalThis.__army?.performance.frames>2,null,{timeout:60000});
 await mobile.locator('select[aria-label="시뮬레이션 초당 계산 횟수"]').selectOption('20');await mobile.waitForFunction(()=>__army.CONFIG.sim.tickRate===20);
 const mobileRequest=(type,data={})=>mobile.evaluate(({type,data})=>__budmoriTest.request(type,data),{type,data});
 const mobileFixture=source=>mobileRequest('__fixture',{source}),mobileTick=async count=>{await mobileRequest('testTicks',{count});await mobile.waitForTimeout(150)};
 await mobile.locator('[data-public="solo"]').click();await mobile.waitForFunction(()=>BloomSimulation.sessionConfig.mode==='local'&&!__army.paused&&PublicSession.phase==='idle');
 await mobileFixture(`for(const c of state.camps){c.enabled=false;c.spawned=true;c.regrowth=[]}
  const m=state.mother,r=spawn('swordsman','enemy',m.x+250,m.y,{camp:0,variant:'rival'});if(!r)throw Error('Rival fixture spawn failed');
  r.x=r.worldX=r.hx=r.homeX=m.x+45;r.y=r.worldY=r.hy=r.homeY=m.y+55;r.z=r.worldZ=r.groundZ=r.hz=r.homeZ=spatialGround(r.x,r.y);r.stun=100000;
  r.rival.room=r.rival.targetRoom=regionAt(r.x,r.y);if(r.rival.ai?.home)Object.assign(r.rival.ai.home,{x:r.x,y:r.y,z:r.z});globalThis.qaRecoveryRivalId=r.id;
  rarityAcquire(-1,'swordsman',0,1);m.hp=1;m.stun=10;const killer=spawn('swordsman','enemy',m.x+20,m.y,{camp:0,rarityGrade:5});killer.aggroAt=0;killer.cooldown=0;`);
 const rivalId=await mobileRequest('__read',{expression:'qaRecoveryRivalId'});
 await mobile.evaluate(()=>advanceSimulationClock(.016));
 const cycles=[];
 for(let cycle=0;cycle<2;cycle++){
  await mobile.evaluate(()=>__army.setPaused(false));
  // Opposing real keyboard inputs produce neutral manual intent, preventing
  // auto-hunt steering from evading this deliberately lethal test encounter.
  await mobile.keyboard.down('KeyW');await mobile.keyboard.down('KeyS');await mobile.evaluate(()=>advanceSimulationClock(.016));
  // Attack selection and windups vary by the game's seed. Observe actual death
  // in bounded combat batches instead of assuming the native seed's first1s hit.
  for(let batch=0;batch<8&&!await mobile.evaluate(()=>__army.state.dead);batch++)await mobileTick(20);
  await mobile.keyboard.up('KeyW');await mobile.keyboard.up('KeyS');
  console.log('MOBILE_RECOVERY_CYCLE',JSON.stringify({cycle,main:await mobile.evaluate(()=>({hp:__army.state.mother.hp,dead:__army.state.dead,paused:__army.paused,modal:modalKind,frame:__army.performance.frames})),worker:await mobileRequest('inspect')}));
  await mobile.waitForFunction(()=>__army.state.dead);
  const frames=await mobile.evaluate(()=>__army.performance.frames);await mobile.locator('[data-action="recover"]').click();
  if(cycle===0)await mobile.evaluate(()=>__army.setPaused(true)); // queue during paused UI transition, same SDK recovery command
  await mobileTick(1);await mobile.waitForFunction(({id,frames})=>!__army.state.dead&&!BloomDiagnostics.fatal&&__army.performance.frames>frames+2&&projectionQueue.some(q=>q.source.id===id),{id:rivalId,frames},{timeout:30000});
  const actor=await mobile.evaluate(id=>{const r=__army.state.units.find(u=>u.id===id);return{leader:r.rivalLeader,level:r.rival.abilities.level,owned:!!r.rival,frame:__army.performance.frames}},rivalId);
  assert.equal(actor.leader,true);assert.equal(actor.owned,true);assert.equal(actor.level,await mobileRequest('__read',{expression:`idMap.get(${rivalId}).rival.abilities.level`}));cycles.push(actor);
 }
 await mobile.evaluate(()=>__army.setPaused(true));const recoveredDisk=await mobile.evaluate(()=>BloomSimulation.disk.snapshot());
 await mobile.evaluate(id=>{globalThis.__oldRecoveryActor=__army.state.units.find(u=>u.id===id)},rivalId);
 assert.equal(await mobile.evaluate(disk=>BloomSimulation.disk.load(disk),recoveredDisk),true);
 assert(await mobile.evaluate(id=>{const r=__army.state.units.find(u=>u.id===id);return r!==__oldRecoveryActor&&!!r.rival.abilities},rivalId));
 await mobile.screenshot({path:new URL('./mobile-recovery.png',import.meta.url).pathname});console.log('TEST_RECOVERY_SCREENSHOT_JPEG '+(await mobile.screenshot({type:'jpeg',quality:65})).toString('base64'));
 await mobileRequest('reset');assert(await mobile.evaluate(id=>!__army.state.units.some(u=>u.id===id&&u.rivalLeader),rivalId));
 await mobileFixture(`for(const c of state.camps){c.enabled=false;c.spawned=true;c.regrowth=[]}const m=state.mother,u=spawn('swordsman','enemy',m.x+45,m.y+55,{camp:0,rarityGrade:1});u.stun=100000;globalThis.qaReusedId=u.id;`);
 await mobileTick(1);assert.equal(await mobileRequest('__read',{expression:'qaReusedId'}),rivalId);assert(await mobile.evaluate(id=>{const u=__army.state.units.find(u=>u.id===id);return !u.rivalLeader&&!u.rival&&!BloomDiagnostics.fatal},rivalId));
 const dimensions=await mobile.evaluate(()=>({width:document.querySelector('#view').width,height:document.querySelector('#view').height,dpr:devicePixelRatio,tps:__army.CONFIG.sim.tickRate}));assert.deepEqual(dimensions,{width:720,height:1282,dpr:3,tps:20});
 report.recoveryMirror={reconstructed:true,exactUserSave:false,dimensions,cycles,loadFreshIdentity:true,resetIdReuseSafe:true};report.checks.push('20TPS mobile-sized real combat/recover twice preserves rival metadata; load/reset/same-ID role reuse remain safe');
 const lifecycle=await mobile.evaluate(()=>{
  const runtime=BloomSimulation.runtime,session=BloomSimulation.session;
  const sameOwner=bloomMainRuntime()===runtime;boot();
  const sameSession=BloomSimulation.session===session,labels=document.querySelectorAll('#publicStatus').length;
  runtime.close();runtime.close();
  document.querySelector('#view').dispatchEvent(new Event('webglcontextlost'));
  boot();
  return{sameOwner,sameSession,labels,remainingLabels:document.querySelectorAll('#publicStatus').length,ready:runtime.ready,closed:session.closed,fatal:BloomDiagnostics.fatal};
 });
 assert.deepEqual(lifecycle,{sameOwner:true,sameSession:true,labels:1,remainingLabels:0,ready:false,closed:true,fatal:false});
 report.checks.push('Repeated boot/runtime access retains one owner; final close removes public UI and WebGL lifecycle subscriptions without restarting');
 assert.deepEqual(errors,[]);await mobileContext.close();report.status='PASS';console.log(JSON.stringify(report,null,2));await writeFile(new URL('./browser-report.json',import.meta.url),JSON.stringify(report,null,2));
}catch(error){try{await page?.screenshot({path:new URL('./browser-failure.png',import.meta.url).pathname});report.status='FAIL';report.error=String(error);await writeFile(new URL('./browser-report.json',import.meta.url),JSON.stringify(report,null,2));console.error('BROWSER_DIAGNOSTICS',JSON.stringify(await page?.evaluate(()=>({ready:globalThis.BloomSimulation?.runtime?.ready,game:!!globalThis.__army,gestures:globalThis.__qaGestures,focus:document.activeElement?.id,diagnostics:globalThis.BloomDiagnostics?.snapshot()}))));console.log('TEST_SCREENSHOT_JPEG '+(await page.screenshot({type:'jpeg',quality:55})).toString('base64'))}catch{}throw error}finally{await browser?.close();server.close()}
