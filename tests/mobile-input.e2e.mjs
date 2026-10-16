import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {mkdir,readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

const root=fileURLToPath(new URL('../',import.meta.url));
const server=createServer(async(q,r)=>{const url=new URL(q.url,'http://localhost');if(url.pathname==='/favicon.ico'){r.writeHead(204);r.end();return}const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));if(!file.startsWith(root)){r.writeHead(403);r.end();return}try{const body=await readFile(file);r.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html;charset=utf-8':file.endsWith('.json')?'application/json':'text/javascript;charset=utf-8'});r.end(body)}catch{r.writeHead(404);r.end()}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const report={suite:'mobile-input',errors:[],status:'running'};let browser;
try{
  browser=await chromium.launch({channel:process.env.BUDMORI_BROWSER_CHANNEL||'msedge',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  await context.addInitScript(()=>{
    window.__deploymentIntervals=[];let nextFakeInterval=-1;const originalSet=window.setInterval,originalClear=window.clearInterval;
    window.setInterval=function(callback,delay,...args){
      if(delay===100){const interval={id:nextFakeInterval--,delay,active:true,fire:()=>callback(...args)};window.__deploymentIntervals.push(interval);return interval.id}
      const id=originalSet.call(this,callback,delay,...args);window.__deploymentIntervals.push({id,delay,active:true,fire:null});return id;
    };
    window.clearInterval=function(id){const interval=window.__deploymentIntervals.find(item=>item.id===id);if(interval&&id<0){interval.active=false;return}return originalClear.call(this,id)};
  });
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/#/raid');
  await page.waitForFunction(()=>window.BUDMORI?.sim?.scene==='raid'&&BUDMORI.sim.raidRoster('solo')&&!BUDMORI.sim.running,{},{timeout:30000});
  await page.evaluate(()=>BUDMORI.runtime.paused=true);
  report.styles=await page.evaluate(()=>{const button=getComputedStyle(document.querySelector('button'));return{tapHighlight:button.webkitTapHighlightColor,buttonTouchAction:button.touchAction,canvasTouchAction:getComputedStyle(document.querySelector('canvas')).touchAction,bodyOverflow:getComputedStyle(document.body).overflow}});
  assert(['rgba(0, 0, 0, 0)','transparent'].includes(report.styles.tapHighlight),'mobile button tap highlight is transparent');
  assert.equal(report.styles.buttonTouchAction,'manipulation');assert.equal(report.styles.canvasTouchAction,'none');
  await page.locator('#gameMenu').tap();await page.locator('#menuTabHelp').tap();await page.locator('#helpPanel').waitFor({state:'visible'});report.helpText=await page.locator('#helpPanel').innerText();
  assert(report.helpText.includes('100ms')&&report.helpText.includes('포인터')&&report.helpText.includes('드래그'),'raid help explains the faster repeat cadence and draggable deployment location');
  await page.locator('#gameMenuClose').tap();await page.locator('#gameMenuOverlay').waitFor({state:'hidden'});
  await page.screenshot({path:path.join(root,'tests/output/mobile-input.png')});
  await page.evaluate(()=>{const troops=BUDMORI.sim.raidRoster('solo').troops,used=new Set(troops.map(t=>t.farmId));let farmId=Math.max(0,...used)+1;while(troops.length<4){while(used.has(farmId))farmId++;troops.push({farmId,species:0,tier:1,deployed:false});used.add(farmId++)}});
  const before=await page.evaluate(()=>({units:BUDMORI.sim.units.length,roster:BUDMORI.sim.raidRoster('solo').troops.length,remaining:BUDMORI.sim.raidRemaining('solo'),intervals:window.__deploymentIntervals.length}));
  async function screenPoint(x,y){return page.evaluate(({x,y})=>{const r=BUDMORI.renderer,p=r.project(x,y,0),b=r.canvas.getBoundingClientRect();return{x:b.left+p.x/r.pixelRatio,y:b.top+p.y/r.pixelRatio}},{x,y})}
  const first=await screenPoint(-4,5),middle=await screenPoint(-2,7),last=await screenPoint(1,6),other=await screenPoint(10,-1),cdp=await context.newCDPSession(page);
  await page.evaluate(()=>{const r=BUDMORI.runtime,deploy=r.deployNext.bind(r),canvas=BUDMORI.renderer.canvas;window.__deployCalls=[];window.__pointerEvents=[];r.deployNext=(...args)=>{window.__deployCalls.push(performance.now());return deploy(...args)};canvas.addEventListener('pointerdown',e=>window.__pointerDownAt=performance.now(),true);for(const type of ['pointerdown','pointermove'])canvas.addEventListener(type,e=>window.__pointerEvents.push({type,x:e.clientX,y:e.clientY}));});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:11,x:first.x,y:first.y}]});
  report.immediateDropMs=await page.evaluate(()=>window.__deployCalls[0]-window.__pointerDownAt);
  assert(report.immediateDropMs<100,'pointer-down submits the first troop before the repeat interval fires');
  await page.waitForFunction(()=>window.__pointerEvents.some(e=>e.type==='pointerdown'),{},{timeout:3000});
  await page.waitForTimeout(10);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:11,x:first.x,y:first.y},{id:22,x:other.x,y:other.y}]});
  await page.waitForFunction(()=>window.__pointerEvents.filter(e=>e.type==='pointerdown').length===2,{},{timeout:3000});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:11,x:middle.x,y:middle.y},{id:22,x:other.x,y:other.y}]});
  await page.waitForFunction(({x,y})=>{const e=window.__pointerEvents.at(-1);return e?.type==='pointermove'&&Math.hypot(e.x-x,e.y-y)<1},{x:middle.x,y:middle.y},{timeout:3000});
  await page.evaluate(start=>{const repeat=window.__deploymentIntervals.slice(start).find(item=>item.delay===100);if(!repeat)throw Error('100ms deployment interval was not registered');repeat.fire()},before.intervals);
  await page.waitForFunction(n=>BUDMORI.sim.units.length===n+2,before.units,{timeout:3000});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:11,x:last.x,y:last.y},{id:22,x:other.x,y:other.y}]});
  await page.waitForFunction(({x,y})=>{const e=window.__pointerEvents.at(-1);return e?.type==='pointermove'&&Math.hypot(e.x-x,e.y-y)<1},{x:last.x,y:last.y},{timeout:3000});
  await page.evaluate(start=>window.__deploymentIntervals.slice(start).find(item=>item.delay===100).fire(),before.intervals);
  await page.waitForFunction(n=>BUDMORI.sim.units.length===n+3,before.units,{timeout:3000});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.evaluate(start=>window.__deploymentIntervals.slice(start).find(item=>item.delay===100).fire(),before.intervals);
  await page.waitForTimeout(220);await cdp.detach();
  report.deployment=await page.evaluate(start=>{const w=BUDMORI.sim,r=w.raidRoster('solo');return{units:w.units.map(u=>({id:u.id,farmId:u.farmId,x:u.x,y:u.y})),deployed:r.troops.filter(t=>t.deployed).length,sequence:r.lastDeploySequence,remaining:w.raidRemaining('solo'),intervals:window.__deploymentIntervals.slice(start).map(({id,delay,active})=>({id,delay,active}))}},before.intervals);
  assert.equal(report.deployment.units.length,3,'touch-down deploys immediately and held touch repeats twice');
  assert(report.deployment.intervals.some(i=>i.delay===100),'deployment repeat requests a 100ms interval');
  assert(report.deployment.intervals.filter(i=>i.delay===100).every(i=>!i.active),'touch release cancels the repeat interval');
  assert.equal(report.deployment.deployed,3);assert.equal(report.deployment.sequence,3);assert.equal(report.deployment.remaining,before.remaining-3);
  assert.equal(new Set(report.deployment.units.map(u=>u.id)).size,3);assert.equal(new Set(report.deployment.units.map(u=>u.farmId)).size,3);
  const close=(a,b)=>Math.hypot(a.x-b[0],a.y-b[1])<.08;
  assert(close(report.deployment.units[0],[-4,5])&&close(report.deployment.units[1],[-2,7])&&close(report.deployment.units[2],[1,6]),'repeat deployment uses the current primary pointer location and ignores second touch');
  await context.close();
   const farmContext=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true}),farmPage=await farmContext.newPage();farmPage.on('pageerror',e=>report.errors.push(e.message));
   await farmPage.goto('http://127.0.0.1:'+server.address().port+'/');await farmPage.waitForFunction(()=>window.BUDMORI);await farmPage.locator('#newGame').tap();await farmPage.waitForFunction(()=>BUDMORI.runtime.tick>5&&BUDMORI.sim.scene==='farm');
   report.farmStart=await farmPage.evaluate(()=>({units:BUDMORI.sim.units.map(u=>({species:u.species,tier:u.tier,mature:u.mature,meals:u.meals})),width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth}));
   assert.equal(report.farmStart.units.length,2,'the mobile new-garden screen begins with two peas');assert(report.farmStart.units.every(u=>u.species===0&&u.tier===1&&u.mature&&u.meals===0));assert(!report.farmStart.overflow);await farmPage.screenshot({path:path.join(root,'tests/output/mobile-farm-start.png')});assert.equal(await farmPage.locator('#error').isVisible(),false);await farmContext.close();
  const focusContext=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true}),focusPage=await focusContext.newPage();
  await focusPage.goto('http://127.0.0.1:'+server.address().port+'/');await focusPage.waitForFunction(()=>window.BUDMORI);await focusPage.keyboard.press('Tab');
  report.keyboardFocus=await focusPage.evaluate(()=>({tag:document.activeElement.tagName,visible:document.activeElement.matches(':focus-visible'),outline:getComputedStyle(document.activeElement).outline}));
  assert.equal(report.keyboardFocus.tag,'BUTTON');assert(report.keyboardFocus.visible,'keyboard navigation retains :focus-visible');assert(report.keyboardFocus.outline.includes('171, 99, 60'));
  await focusContext.close();report.status='PASS';
}catch(error){report.status='FAIL';report.failure=error.stack;throw error}
finally{await browser?.close();server.close();console.log(JSON.stringify(report))}
