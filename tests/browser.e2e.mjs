import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
// Test-only stopped-session fixtures. This route is never shipped as index.html.
const fixtureBranch=`if (m.type === '__fixture') {
 clearTimeout(timer);bloomSession.close();manualClock=true;
 (0,eval)(m.source);rebuildGrid();spatialBoundary();boundary();playing=true;paused=false;modalKind='';publish(true);reply(m.id,true);return;
} else if(m.type==='__read'){reply(m.id,(0,eval)(m.expression));return;}
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
 const base=`http://127.0.0.1:${server.address().port}`;
 await page.goto(base+'/raw');await page.waitForFunction(()=>globalThis.BloomSimulation?.worker?.ready&&globalThis.__army?.performance.frames>2,null,{timeout:60000});
 assert.equal(await page.evaluate(()=>document.querySelector('#view').dataset.rendererBackend),'WebGL');assert.equal(await page.evaluate(()=>BloomDiagnostics.fatal),false);report.checks.push('Uninstrumented single HTML boots real Worker and WebGL');
 await page.goto(base+'/qa');await page.waitForFunction(()=>globalThis.BloomSimulation?.worker?.ready&&globalThis.__army?.performance.frames>2,null,{timeout:60000});
 await page.locator('[data-action="start"]').click();
 const start=await page.evaluate(()=>({x:__army.state.mother.x,y:__army.state.mother.y}));
 await page.keyboard.down('KeyD');await page.waitForTimeout(650);await page.keyboard.up('KeyD');
 const moved=await page.evaluate(()=>({x:__army.state.mother.x,y:__army.state.mother.y}));assert(moved.x>start.x+15);report.checks.push('Shared keyboard input moves authoritative Worker world');
 await page.keyboard.press('Escape');await page.waitForFunction(()=>__army.paused);await page.keyboard.press('Escape');await page.waitForFunction(()=>!__army.paused);report.checks.push('Escape closes paused modal despite focused UI button');
 await page.mouse.dblclick(750,500,{delay:50});await page.waitForFunction(()=>__army.state.mother.rollCooldownMs>0,null,{timeout:10000});
 assert(await page.evaluate(()=>__army.state.mother.rollCooldownMs>0));report.checks.push('Double-click moves and rolls through Worker command queue');
 await page.locator('#pause').click();await page.waitForFunction(()=>__army.paused);await page.keyboard.press('Escape');await page.waitForFunction(()=>!__army.paused);const focusX=await page.evaluate(()=>__army.state.mother.x);await page.keyboard.down('KeyD');await page.waitForTimeout(650);await page.keyboard.up('KeyD');assert(await page.evaluate(x=>__army.state.mother.x>x+10,focusX));report.checks.push('Persistent pause-button focus cannot swallow WASD after Escape resume');
 const fixture=async source=>{await page.evaluate(source=>__budmoriTest.request('__fixture',{source}),source);await page.waitForTimeout(150)};
 const tick=async count=>{await page.evaluate(count=>__budmoriTest.request('testTicks',{count}),count);await page.waitForTimeout(120)};
 const read=expression=>page.evaluate(expression=>__budmoriTest.request('__read',{expression}),expression);
 await fixture(`for(const c of state.camps){c.enabled=false;c.spawned=true;c.regrowth=[]}for(const u of state.units)if(u.team==='enemy'){u.stun=100000;u.aggroAt=u.wanderAt=state.time+100000}globalThis.qaEnemy=spawn('swordsman','enemy',state.mother.x+65,state.mother.y,{camp:0,rarityGrade:1});qaEnemy.stun=100000;`);
 const enemyId=await read('qaEnemy.id');const hp=await read('qaEnemy.hp');await tick(12);assert((await read(`idMap.get(${enemyId})?.hp??0`))<hp);report.checks.push('Actual combat advances and damage presentation renders');
 await page.evaluate(()=>__army.setPaused(true));
 const save=await page.evaluate(()=>BloomSimulation.disk.snapshot());const saveObject=JSON.parse(save);assert.equal(saveObject.schema,'bloom-snapshot-disk-v3');
 const bad={...saveObject,byteLength:saveObject.byteLength+1};assert.equal(await page.evaluate(disk=>BloomSimulation.disk.load(disk),JSON.stringify(bad)),false);assert.equal(await page.evaluate(disk=>BloomSimulation.disk.load(disk),save),true);report.checks.push('Canonical save/load succeeds; corrupt metadata rejected');await page.evaluate(()=>__army.setPaused(false));
 await fixture(`state.mother.hp=1;state.mother.stun=10;globalThis.qaKiller=spawn('swordsman','enemy',state.mother.x+20,state.mother.y,{camp:0,rarityGrade:5});qaKiller.aggroAt=0;qaKiller.cooldown=0;`);await tick(20);await page.waitForFunction(()=>__army.state.dead);await page.locator('[data-action="recover"]').click();await tick(1);await page.waitForFunction(()=>!__army.state.dead);report.checks.push('Death and requested revival complete through UI/Worker');
 const dense=await readFile(new URL('./dense-fixture.js',import.meta.url),'utf8');await fixture(dense);await tick(5);
 const count=await page.evaluate(()=>__army.state.units.filter(u=>u.team==='friendly'&&u.hp>0).length);assert.equal(count,155);
 const snapshot=await read('BloomOwnedSDK.hashBytes(bloomAdapter.save())');await page.waitForTimeout(1000);assert.equal(await read('BloomOwnedSDK.hashBytes(bloomAdapter.save())'),snapshot);report.checks.push('155-ally rendering keeps authority immutable while paused manual clock');
 await page.screenshot({path:new URL('./browser-game.png',import.meta.url).pathname});console.log('TEST_SCREENSHOT_JPEG '+(await page.screenshot({type:'jpeg',quality:65})).toString('base64'));
 const gl=await page.evaluate(()=>({backend:document.querySelector('#view').dataset.rendererBackend,frames:__army.performance.frames,diagnostics:BloomDiagnostics.snapshot().runtime.render}));assert(gl.frames>20);report.render=gl;
 // Last chapter intentionally stops the real Worker via a test-only thrown error.
 await page.evaluate(()=>__budmoriTest.request('__read',{expression:'(()=>{throw new Error("Controlled browser Worker failure")})()'}).catch(()=>{}));await page.waitForFunction(()=>BloomDiagnostics.fatal);
 assert.equal(await page.locator('#bloom-diagnostic-panel').isVisible(),true);assert.equal(await page.evaluate(()=>BloomSimulation.worker.ready),false);report.checks.push('Worker system error stops simulation and opens selectable diagnostics');
 assert.deepEqual(errors,[]);report.status='PASS';console.log(JSON.stringify(report,null,2));await writeFile(new URL('./browser-report.json',import.meta.url),JSON.stringify(report,null,2));
}catch(error){try{console.error('BROWSER_DIAGNOSTICS',JSON.stringify(await page?.evaluate(()=>({ready:globalThis.BloomSimulation?.worker?.ready,game:!!globalThis.__army,gestures:globalThis.__qaGestures,focus:document.activeElement?.id,diagnostics:globalThis.BloomDiagnostics?.snapshot()}))));console.log('TEST_SCREENSHOT_JPEG '+(await page.screenshot({type:'jpeg',quality:55})).toString('base64'))}catch{}throw error}finally{await browser?.close();server.close()}
