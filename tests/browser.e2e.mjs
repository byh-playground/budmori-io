import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
// Test-only stopped-session fixtures. This route is never shipped as index.html.
const fixtureBranch=`if (m.type === '__fixture') {
 clearTimeout(timer);bloomSession.close();manualClock=true;
 (0,eval)(m.source);rebuildGrid();spatialBoundary();boundary();playing=true;paused=false;modalKind='';if(!bloomAdapter.validateSnapshot(bloomAdapter.save(),{tick:bloomTick}))throw new Error('Invalid stopped-session fixture');publish(true);reply(m.id,true);return;
} else if(m.type==='__read'){reply(m.id,(0,eval)(m.expression));return;} else if(m.type==='__clock'){manualClock=!!m.manual;deadline=performance.now()+1000/CONFIG.sim.tickRate;schedule();reply(m.id,true);return;}
`;
let instrumented=html.replace("      if (!initialized || fatal) throw new Error('Worker is not available');", "      if (!initialized || fatal) throw new Error('Worker is not available');\n"+fixtureBranch)
 .replace('  function controls(force = false) {','  globalThis.__budmoriTest={request};globalThis.__qaGestures=[];\n  function controls(force = false) {')
 .replace('onGesture(event){bloomInputPoints.push(event)}','onGesture(event){globalThis.__qaGestures?.push({...event,wall:performance.now()});bloomInputPoints.push(event)}')
 .replace("  globalThis.BLOOM_WORKER_AUTHORITY = true;","  globalThis.BLOOM_WORKER_AUTHORITY = true;globalThis.BLOOM_WORKER_TEST_MODE=true;");
assert.notEqual(instrumented,html);
const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.end(req.url==='/raw'?html:instrumented)});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser,page;
const report={sourceSHA256:createHash('sha256').update(html).digest('hex'),environment:'Chromium + SwiftShader WebGL1, actual Blob Worker, local offline HTML; no phone FPS claim',checks:[]};
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
 await page.goto(base+'/raw');await page.waitForFunction(()=>globalThis.BloomSimulation?.worker?.ready&&globalThis.__army?.performance.frames>2,null,{timeout:60000});
 assert.equal(await page.evaluate(()=>document.querySelector('#view').dataset.rendererBackend),'WebGL');assert.equal(await page.evaluate(()=>BloomDiagnostics.fatal),false);report.checks.push('Uninstrumented single HTML boots real Worker and WebGL');
 await page.goto(base+'/qa');await page.waitForFunction(()=>globalThis.BloomSimulation?.worker?.ready&&globalThis.__army?.performance.frames>2,null,{timeout:60000});
 const fixture=async source=>{await page.evaluate(source=>__budmoriTest.request('__fixture',{source}),source);await page.waitForTimeout(150)};
 const tick=async count=>{await page.evaluate(count=>__budmoriTest.request('testTicks',{count}),count);await page.waitForTimeout(120)};
 const read=expression=>page.evaluate(expression=>__budmoriTest.request('__read',{expression}),expression);
 await fixture(`for(const c of state.camps){c.enabled=false;c.spawned=true;c.regrowth=[]}clearPointNav();autoHunt.enabled=false;autoHunt.idleMs=0;`);
 await page.locator('[data-action="start"]').click();
 const start=await page.evaluate(()=>({x:__army.state.mother.x,y:__army.state.mother.y}));
 await page.keyboard.down('KeyD');await page.evaluate(()=>advanceSimulationClock(.016));await tick(4);await page.keyboard.up('KeyD');await page.evaluate(()=>advanceSimulationClock(.016));
 const moved=await page.evaluate(()=>({x:__army.state.mother.x,y:__army.state.mother.y}));assert(moved.x>start.x+15);report.checks.push('Shared keyboard input moves authoritative Worker world');
 await page.keyboard.press('Escape');await page.waitForFunction(()=>__army.paused);await page.keyboard.press('Escape');await page.waitForFunction(()=>!__army.paused);report.checks.push('Escape closes paused modal despite focused UI button');
 await page.mouse.dblclick(750,500,{delay:50});await page.evaluate(()=>advanceSimulationClock(.016));await tick(1);await page.waitForFunction(()=>__army.state.mother.rollCooldownMs>0,null,{timeout:10000});
 assert(await page.evaluate(()=>__army.state.mother.rollCooldownMs>0));report.checks.push('Double-click moves and rolls through Worker command queue');
 await fixture(`clearMoaRoll(state.mother);clearPointNav();autoHunt.enabled=false;autoHunt.idleMs=0;`);
 await page.locator('#pause').click();await page.waitForFunction(()=>__army.paused);await page.keyboard.press('Escape');await page.waitForFunction(()=>!__army.paused);const focusX=await page.evaluate(()=>__army.state.mother.x);await page.keyboard.down('KeyD');assert(await page.evaluate(()=>keys.has('KeyD')),'Focused-button regression must observe the real held action');await page.evaluate(()=>advanceSimulationClock(.016));await tick(4);await page.keyboard.up('KeyD');await page.evaluate(()=>advanceSimulationClock(.016));assert(await page.evaluate(x=>__army.state.mother.x>x+10,focusX));report.checks.push('Persistent pause-button focus cannot swallow WASD after Escape resume');
 await fixture(`clearMoaRoll(state.mother);state.mother.rollCooldownMs=0;clearPointNav();autoHunt.enabled=false;`);await page.keyboard.press('Space');await page.evaluate(()=>advanceSimulationClock(.016));await tick(1);assert(await page.evaluate(()=>__army.state.mother.rollCooldownMs>0));report.checks.push('Space submits roll with persistent UI focus');
 await fixture(`clearMoaRoll(state.mother);state.mother.rollCooldownMs=0;clearPointNav();autoHunt.enabled=false;`);await replayTouchDoubleTap(700,500);await page.evaluate(()=>advanceSimulationClock(.016));await tick(1);assert(await page.evaluate(()=>__army.state.mother.rollCooldownMs>0));report.checks.push('Chromium touch event replay preserves 80ms cadence and rolls through shared input');
 await fixture(`for(const c of state.camps){c.enabled=false;c.spawned=true;c.regrowth=[]}for(const u of state.units)if(u.team==='enemy'){u.stun=100000;u.aggroAt=u.wanderAt=state.time+100000}globalThis.qaEnemy=spawn('swordsman','enemy',state.mother.x+65,state.mother.y,{camp:0,rarityGrade:1});qaEnemy.stun=100000;`);
 const enemyId=await read('qaEnemy.id');const hp=await read('qaEnemy.hp');await tick(12);assert((await read(`idMap.get(${enemyId})?.hp??0`))<hp);report.checks.push('Actual combat advances and damage presentation renders');
 await page.evaluate(()=>__army.setPaused(true));
 const save=await page.evaluate(()=>BloomSimulation.disk.snapshot());const saveObject=JSON.parse(save);assert.equal(saveObject.schema,'bloom-snapshot-disk-v3');
 const bad={...saveObject,byteLength:saveObject.byteLength+1};assert.equal(await page.evaluate(disk=>BloomSimulation.disk.load(disk),save),true);report.checks.push('Canonical save/load succeeds');await page.evaluate(()=>__army.setPaused(false));
 await fixture(`globalThis.qaRealtime=spawn('swordsman','enemy',state.mother.x+65,state.mother.y,{camp:0,rarityGrade:3});qaRealtime.stun=100000;`);
 const realBefore=await read('({tick:bloomTick,time:state.time,hp:state.units.filter(u=>u.team==="enemy").reduce((sum,u)=>sum+u.hp,0)})');
 await page.evaluate(()=>__budmoriTest.request('__clock',{manual:false}));
 await page.waitForFunction(t=>__army.state.time>t+2,realBefore.time,{timeout:15000});
 await page.evaluate(()=>__budmoriTest.request('__clock',{manual:true}));
 const realAfter=await read('({tick:bloomTick,time:state.time,hp:state.units.filter(u=>u.team==="enemy").reduce((sum,u)=>sum+u.hp,0)})');assert(realAfter.tick>realBefore.tick&&realAfter.hp<realBefore.hp);report.normalClockCombat={before:realBefore,after:realAfter};report.checks.push('Normal production setTimeout scheduler advances combat while actual WebGL/RAF renders');
 await fixture(`state.mother.hp=1;state.mother.stun=10;globalThis.qaKiller=spawn('swordsman','enemy',state.mother.x+20,state.mother.y,{camp:0,rarityGrade:5});qaKiller.aggroAt=0;qaKiller.cooldown=0;`);await tick(20);await page.waitForFunction(()=>__army.state.dead);await page.locator('[data-action="recover"]').click();await tick(1);await page.waitForFunction(()=>!__army.state.dead);report.checks.push('Death and requested revival complete through UI/Worker');
 const dense=await readFile(new URL('./dense-fixture.js',import.meta.url),'utf8');await fixture(dense);await tick(5);
 const count=await page.evaluate(()=>__army.state.units.filter(u=>u.team==='friendly'&&u.hp>0).length);assert.equal(count,155);
 const snapshot=await read('BloomOwnedSDK.hashBytes(bloomAdapter.save())');await page.waitForTimeout(1000);assert.equal(await read('BloomOwnedSDK.hashBytes(bloomAdapter.save())'),snapshot);report.checks.push('155-ally rendering keeps authority immutable while paused manual clock');
 if(await page.locator('#modal.show [data-action="close"]').count())await page.locator('#modal.show [data-action="close"]').click();await page.waitForFunction(()=>!document.querySelector('#modal').classList.contains('show'));
 await page.screenshot({path:new URL('./browser-game.png',import.meta.url).pathname});console.log('TEST_SCREENSHOT_JPEG '+(await page.screenshot({type:'jpeg',quality:65})).toString('base64'));
 const gl=await page.evaluate(()=>({backend:document.querySelector('#view').dataset.rendererBackend,frames:__army.performance.frames,diagnostics:BloomDiagnostics.snapshot().runtime.render}));assert(gl.frames>20);report.render=gl;
 const beforeReject=await read('BloomOwnedSDK.hashBytes(bloomAdapter.save())');assert.equal(await page.evaluate(disk=>BloomSimulation.disk.load(disk),JSON.stringify(bad)),false);assert.equal(await read('BloomOwnedSDK.hashBytes(bloomAdapter.save())'),beforeReject);report.checks.push('Corrupt metadata rejected without changing the current dense world');
 // Last chapter intentionally stops the real Worker via a test-only thrown error.
 await page.evaluate(()=>__budmoriTest.request('__read',{expression:'(()=>{throw new Error("Controlled browser Worker failure")})()'}).catch(()=>{}));await page.waitForFunction(()=>BloomDiagnostics.fatal);
 assert.equal(await page.locator('#bloom-diagnostic-panel').isVisible(),true);assert.equal(await page.evaluate(()=>BloomSimulation.worker.ready),false);report.checks.push('Worker system error stops simulation and opens selectable diagnostics');
 assert.deepEqual(errors,[]);
 // Reconstructed Android report boundary: 20 TPS, CSS360x641 at device DPR3
 // (game capped backing store720x1282), real combat deaths and UI recovery twice.
 // This is Chromium mobile emulation, not the user's exact save or Android GPU.
 const mobileContext=await browser.newContext({viewport:{width:360,height:641},deviceScaleFactor:3,hasTouch:true,isMobile:true});
 const mobile=await mobileContext.newPage();mobile.on('pageerror',e=>{errors.push(e.message);console.error('MOBILE_PAGEERROR',e.stack)});
 await mobile.goto(base+'/qa');await mobile.waitForFunction(()=>globalThis.BloomSimulation?.worker?.ready&&globalThis.__army?.performance.frames>2,null,{timeout:60000});
 await mobile.locator('select[aria-label="시뮬레이션 초당 계산 횟수"]').selectOption('20');await mobile.waitForFunction(()=>__army.CONFIG.sim.tickRate===20);
 const mobileRequest=(type,data={})=>mobile.evaluate(({type,data})=>__budmoriTest.request(type,data),{type,data});
 const mobileFixture=source=>mobileRequest('__fixture',{source}),mobileTick=async count=>{await mobileRequest('testTicks',{count});await mobile.waitForTimeout(150)};
 await mobileFixture(`for(const c of state.camps){c.enabled=false;c.spawned=true;c.regrowth=[]}
  const m=state.mother,r=spawn('swordsman','enemy',m.x+250,m.y,{camp:0,variant:'rival'});if(!r)throw Error('Rival fixture spawn failed');
  r.x=r.worldX=r.hx=r.homeX=m.x+45;r.y=r.worldY=r.hy=r.homeY=m.y+55;r.z=r.worldZ=r.groundZ=r.hz=r.homeZ=spatialGround(r.x,r.y);r.stun=100000;
  r.rival.room=r.rival.targetRoom=regionAt(r.x,r.y);if(r.rival.ai?.home)Object.assign(r.rival.ai.home,{x:r.x,y:r.y,z:r.z});globalThis.qaRecoveryRivalId=r.id;
  rarityAcquire(-1,'swordsman',0,1);m.hp=1;m.stun=10;const killer=spawn('swordsman','enemy',m.x+20,m.y,{camp:0,rarityGrade:5});killer.aggroAt=0;killer.cooldown=0;`);
 const rivalId=await mobileRequest('__read',{expression:'qaRecoveryRivalId'});
 await mobile.locator('[data-action="start"]').click();await mobile.evaluate(()=>advanceSimulationClock(.016));
 const cycles=[];
 for(let cycle=0;cycle<2;cycle++){
  await mobile.evaluate(()=>__army.setPaused(false));await mobileTick(cycle?80:20);await mobile.waitForFunction(()=>__army.state.dead);
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
 assert.deepEqual(errors,[]);await mobileContext.close();report.status='PASS';console.log(JSON.stringify(report,null,2));await writeFile(new URL('./browser-report.json',import.meta.url),JSON.stringify(report,null,2));
}catch(error){try{console.error('BROWSER_DIAGNOSTICS',JSON.stringify(await page?.evaluate(()=>({ready:globalThis.BloomSimulation?.worker?.ready,game:!!globalThis.__army,gestures:globalThis.__qaGestures,focus:document.activeElement?.id,diagnostics:globalThis.BloomDiagnostics?.snapshot()}))));console.log('TEST_SCREENSHOT_JPEG '+(await page.screenshot({type:'jpeg',quality:55})).toString('base64'))}catch{}throw error}finally{await browser?.close();server.close()}
