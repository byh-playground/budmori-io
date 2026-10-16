import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url)),out=path.join(root,'tests/output');
await mkdir(out,{recursive:true});
const server=createServer(async(q,r)=>{
  const url=new URL(q.url,'http://localhost');
  if(url.pathname==='/favicon.ico'){r.writeHead(204);r.end();return}
  const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));
  if(!file.startsWith(root)){r.writeHead(403);r.end();return}
  try{const body=await readFile(file);r.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html;charset=utf-8':file.endsWith('.json')?'application/json':'text/javascript;charset=utf-8'});r.end(body)}catch{r.writeHead(404);r.end()}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const report={suite:'farm-recovery-indicators',started:new Date().toISOString(),status:'running',browser:null,errors:[],layers:[],screenshots:[]};
let browser,context;
try{
  browser=await chromium.launch({channel:process.env.BUDMORI_BROWSER_CHANNEL||'chromium',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
  report.browser=await browser.version();
  context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  report.viewport={width:390,height:844,deviceScaleFactor:2,isMobile:true};
  const page=await context.newPage();page.on('pageerror',error=>report.errors.push(error.message));
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.waitForFunction(()=>window.BUDMORI,{},{timeout:30000});
  await page.locator('#newGame').click();
  await page.waitForFunction(()=>BUDMORI.runtime.tick>5,{},{timeout:8000});

  const fixture=await page.evaluate(()=>{
    const world=BUDMORI.sim,renderer=BUDMORI.renderer;
    const sleeper=world.units[0],breeder=world.units[1],foreground=world.spawn(1,1,.25,-.22);
    world.units=[sleeper,breeder,foreground];world.food=[];world.effects=[];world.projectiles=[];world.scene='farm';world.mode='breed';
    for(const unit of world.units){
      Object.assign(unit,{z:0,vx:0,vy:0,vz:0,stun:0,bounce:0,dropLanded:true,down:0,cooldown:0,cooldownDuration:0,meals:1});
      unit.ability.phase='idle';unit.ability.elapsed=0;unit.ability.action=null;
    }
    Object.assign(sleeper,{x:-2,y:.12,hp:0,down:60,deathSplitHandled:true});
    Object.assign(breeder,{x:.12,y:.26,meals:0,cooldown:3,cooldownDuration:10,ability:{...breeder.ability,phase:'recover',elapsed:.12,action:null}});
    Object.assign(foreground,{x:.2,y:-.22,meals:1,cooldown:0,cooldownDuration:0,ability:{...foreground.ability,phase:'recover',elapsed:.2,action:null}});
    BUDMORI.runtime.paused=true;BUDMORI.runtime.capturePresentation('reset');
    return {sleeperId:sleeper.id,breederId:breeder.id,foregroundId:foreground.id,scene:world.scene,renderer:renderer.canvas.dataset.rendererBackend};
  });
  assert.equal(fixture.scene,'farm');assert.ok(fixture.sleeperId!==fixture.breederId);

  const depth=await page.evaluate(({breederId,foregroundId})=>{
    const renderer=BUDMORI.renderer,world=BUDMORI.sim,calls=[];
    const layer=renderer.drawUnitRingLayer,unit=renderer.drawUnit,badge=renderer.drawSleepBadge;
    renderer.drawUnitRingLayer=function(u,effects,side){if(u.id===breederId)calls.push(`breeder:${side}:${effects.length}`);return layer.call(this,u,effects,side)};
    renderer.drawUnit=function(u,sim){if(u.id===breederId)calls.push('breeder:unit');if(u.id===foregroundId)calls.push('foreground:unit');return unit.call(this,u,sim)};
    renderer.drawSleepBadge=function(u,sim,pose){if(u.id===world.units[0].id)calls.push(`sleeper:badge:${Math.ceil(u.down)}`);return badge.call(this,u,sim,pose)};
    try{renderer.render(world,null,1000)}finally{renderer.drawUnitRingLayer=layer;renderer.drawUnit=unit;renderer.drawSleepBadge=badge}
    return {calls,backend:renderer.canvas.dataset.rendererBackend};
  },{breederId:fixture.breederId,foregroundId:fixture.foregroundId});
  const order=depth.calls;
  assert(order.indexOf('breeder:rear:1')<order.indexOf('breeder:unit'),'rear arc is submitted before its unit body');
  assert(order.indexOf('breeder:unit')<order.indexOf('breeder:front:1'),'front arc is submitted after its unit body');
  assert(order.indexOf('breeder:front:1')<order.indexOf('foreground:unit'),'the foreground unit can occlude the rear unit’s front arc');
  assert(order.includes('sleeper:badge:60'),'the sleeping unit draws its 60-second badge');
  report.layers=order;report.renderer=depth.backend;

  const canvas=page.locator('#world');
  async function capture(label,down,hp=0){
    const diagnostic=await page.evaluate(({sleeperId,down,hp})=>{
      const world=BUDMORI.sim,renderer=BUDMORI.renderer,unit=world.units.find(entry=>entry.id===sleeperId);
      unit.down=down;unit.hp=hp;
      const accepted=BUDMORI.runtime.capturePresentation('reset');
      const display=BUDMORI.runtime.presentation(performance.now()),shown=display.units.find(entry=>entry.id===sleeperId);
      const calls=[],draw=renderer.drawSleepBadge;
      renderer.drawSleepBadge=function(u,sim,pose){if(u.id===sleeperId)calls.push({down:u.down,hp:u.hp,scene:sim.scene,seconds:Math.ceil(u.down),pose:{x:pose.p.x,y:pose.p.y,r:pose.r}});return draw.call(this,u,sim,pose)};
      try{renderer.render(display,null,1000)}finally{renderer.drawSleepBadge=draw}
      const bounds=renderer.canvas.getBoundingClientRect(),d=renderer.pixelRatio,pose=calls[0]?.pose;
      const centerX=pose?bounds.left+pose.x/d:0,centerY=pose?bounds.top+(pose.y-pose.r*1.92)/d:0;
      const clip={x:Math.max(0,centerX-27),y:Math.max(0,centerY-11),width:54,height:22};
      return {accepted,raw:{hp:unit.hp,down:unit.down,x:unit.x,y:unit.y,z:unit.z},presentation:shown&&{hp:shown.hp,down:shown.down,x:shown.x,y:shown.y,z:shown.z},scene:display.scene,displayTimeMs:display.displayTimeMs,badgeCalls:calls,clip};
    },{sleeperId:fixture.sleeperId,down,hp});
    const full=path.join(out,`farm-recovery-indicators-${label}.png`),badge=path.join(out,`farm-recovery-indicators-${label}-badge.png`);
    await canvas.screenshot({path:full});
    await page.screenshot({path:badge,clip:diagnostic.clip});
    report.screenshots.push({label,remainingSeconds:down,hp,canvas:path.basename(full),badge:path.basename(badge),clip:diagnostic.clip,diagnostic});
    return readFile(badge);
  }
  const badge60=await capture('60s',60,0);
  const badge30=await capture('30s',30,0);
  const badge0=await capture('recovered',0,1);
  assert.notDeepEqual(badge60,badge30,'the screenshot timer badge visibly changes from 60 to 30 seconds');
  assert.notDeepEqual(badge30,badge0,'the screenshot badge disappears when the Farm unit recovers');
  assert.deepEqual(report.errors,[]);
  report.status='PASS';
}catch(error){report.status='FAIL';report.failure=error.stack;throw error}
finally{
  await context?.close();await browser?.close();server.close();
  await writeFile(path.join(out,'farm-recovery-indicators-report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
}
