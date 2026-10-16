import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

const root=fileURLToPath(new URL('../',import.meta.url)),out=path.join(root,'tests/output');
await mkdir(out,{recursive:true});
const server=createServer(async(q,r)=>{const url=new URL(q.url,'http://localhost');if(url.pathname==='/favicon.ico'){r.writeHead(204);r.end();return}const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));if(!file.startsWith(root)){r.writeHead(403);r.end();return}try{const body=await readFile(file);r.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html;charset=utf-8':file.endsWith('.json')?'application/json':'text/javascript;charset=utf-8'});r.end(body)}catch{r.writeHead(404);r.end()}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const report={suite:'cold-boss-startup',errors:[],status:'running'};let browser;
try{
  browser=await chromium.launch({channel:'msedge',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/#/raid');
  await page.waitForFunction(()=>window.BUDMORI?.sim?.scene==='raid'&&BUDMORI.sim.raidRosters.length===1&&!BUDMORI.sim.running,{},{timeout:30000});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  report.idleBossFlush=await page.evaluate(()=>{
    const r=BUDMORI.renderer,flush=r.ctx.flush,draw=r.drawBoss;let drewBoss=false,flushesAfterBoss=0;
    r.drawBoss=function(...args){drewBoss=true;return draw.apply(this,args)};
    r.ctx.flush=function(...args){if(drewBoss)flushesAfterBoss++;return flush.apply(this,args)};
    try{r.render(BUDMORI.runtime.presentation(performance.now()),null,performance.now())}
    finally{r.drawBoss=draw;r.ctx.flush=flush}
    return{drewBoss,flushesAfterBoss,unitCount:BUDMORI.sim.units.length};
  });
  assert(report.idleBossFlush.drewBoss&&report.idleBossFlush.flushesAfterBoss>0,'cold idle boss vector geometry is flushed even with no troop actors');
  const state=()=>page.evaluate(()=>{
    const renderer=BUDMORI.renderer,world=BUDMORI.sim,player=renderer.bossPlayer;
    return {scene:world.scene,running:world.running,phase:world.boss.phase,clip:player?.currentClip,expression:player?.currentExpression,assetsReady:renderer.assetsReady,prewarm:renderer.prewarmStats,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},canvas:{width:renderer.canvas.width,height:renderer.canvas.height,rect:renderer.canvas.getBoundingClientRect().toJSON()},playerKeys:Object.keys(player||{}),currentPose:player?.currentPose&&Object.keys(player.currentPose),errors:[]};
  });
  report.first=await state();
  await page.screenshot({path:path.join(out,'cold-boss-mobile-first.png')});
  await page.waitForTimeout(2500);
  report.idle=await state();
  await page.screenshot({path:path.join(out,'cold-boss-mobile-idle.png')});
  assert.equal(report.first.scene,'raid');assert.equal(report.first.running,false);assert.equal(report.first.phase,'resting');
  assert.equal(report.idle.scene,'raid');assert.equal(report.idle.running,false);assert.equal(report.idle.phase,'resting');
  assert.equal(report.first.clip,'idle');assert.equal(report.idle.clip,'idle');assert.deepEqual(report.errors,[]);
  await context.close();report.status='PASS';
}catch(error){report.status='FAIL';report.failure=error.stack;throw error}
finally{await browser?.close();server.close();console.log(JSON.stringify(report))}
