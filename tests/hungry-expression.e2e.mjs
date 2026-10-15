import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

const root=fileURLToPath(new URL('../',import.meta.url)),out=path.join(root,'tests/output');
await mkdir(out,{recursive:true});
const stage=process.argv[2]||'after';
assert(['before','after'].includes(stage),'Pass before or after to label mobile screenshots');
const sources=JSON.parse(await readFile(path.join(root,'scripts/vector-assets-sources.json'),'utf8'));
for(const source of sources.assets){
  const svg=await readFile(path.join(root,source.file),'utf8'),group=svg.match(/<g id="face-hungry">([\s\S]*?)<\/g>/)?.[1]||'';
  assert(group,`${source.file} must author hungry geometry in the SVG`);
  assert.equal((group.match(/id="face-hungry-brow-(?:left|right)"/g)||[]).length,2,`${source.file} needs two soft hungry brows`);
  assert.equal((group.match(/id="face-hungry-eye-glint-(?:left|right)"/g)||[]).length,2,`${source.file} needs lively eye highlights`);
  assert(/id="face-hungry-eye-left"[^>]*fill="#[a-f0-9]{6}"/.test(group)&&/id="face-hungry-eye-right"[^>]*fill="#[a-f0-9]{6}"/.test(group),`${source.file} hungry eyes must remain filled and focused`);
  assert(/<path id="face-hungry-mouth"/.test(group)&&!/<ellipse id="face-hungry-mouth"/.test(group),`${source.file} hungry mouth must stay small and closed`);
}
const server=createServer(async(q,r)=>{
  const url=new URL(q.url,'http://localhost');
  if(url.pathname==='/favicon.ico'){r.writeHead(204);r.end();return}
  const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));
  if(!file.startsWith(root)){r.writeHead(403);r.end();return}
  try{const body=await readFile(file);r.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html;charset=utf-8':file.endsWith('.json')?'application/json':'text/javascript;charset=utf-8'});r.end(body)}catch{r.writeHead(404);r.end()}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const report={suite:'hungry-expression',stage,started:new Date().toISOString(),browser:null,errors:[],tracking:[],status:'running'};
let browser,context;
try{
  browser=await chromium.launch({channel:'msedge',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
  report.browser=await browser.version();
  context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const page=await context.newPage();page.on('pageerror',error=>report.errors.push(error.message));
  await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.BUDMORI,{},{timeout:30000});
  await page.locator('#newGame').click();await page.waitForFunction(()=>BUDMORI.runtime.tick>5,{},{timeout:8000});
  const ids=await page.evaluate(()=>{
    const world=BUDMORI.sim,session=BUDMORI.runtime,units=[0,1,2].map(species=>world.units.find(unit=>unit.species===species));
    if(units.some(unit=>!unit))throw Error('Initial garden must contain each troop species');
    world.units=units;world.food=[];world.effects=[];world.mode='breed';
    for(let i=0;i<units.length;i++){
      const u=units[i];Object.assign(u,{x:(i-1)*3,y:0,z:0,vx:0,vy:0,vz:0,stun:0,down:0,meals:0,growth:0,age:0,cooldown:30,home:{x:(i-1)*3,y:0}});
      u.ability.phase='idle';u.ability.elapsed=0;u.ability.action=null;
    }
    session.paused=true;session.capturePresentation('reset');return units.map(unit=>unit.id);
  });
  await page.waitForFunction(ids=>ids.every(id=>BUDMORI.renderer.vectorPlayers.get(id)?.currentExpression==='hungry'),ids,{timeout:5000});
  report.mobile={viewport:{width:390,height:844,dpr:2},scene:await page.evaluate(()=>BUDMORI.sim.scene),units:await page.evaluate(()=>BUDMORI.sim.units.map(u=>({id:u.id,species:u.species,fed:u.fed,expression:BUDMORI.renderer.vectorPlayers.get(u.id)?.currentExpression}))),cssCanvas:await page.locator('#world').boundingBox()};
  assert.equal(report.mobile.scene,'farm');assert.deepEqual(report.mobile.units.map(u=>u.species),[0,1,2]);assert(report.mobile.units.every(u=>!u.fed&&u.expression==='hungry'));
  const beforeBase='hungry-expression-'+stage+'-mobile';
  await page.screenshot({path:path.join(out,beforeBase+'.png')});await page.screenshot({clip:{x:120,y:360,width:150,height:120},path:path.join(out,beforeBase+'-faces.png')});

  await page.locator('#speed').click();await page.waitForFunction(()=>BUDMORI.runtime.speed===4,{},{timeout:5000});
  for(let targetIndex=0;targetIndex<ids.length;targetIndex++){
    const targetId=ids[targetIndex];
    await page.evaluate(({targetId,targetIndex})=>{
      const world=BUDMORI.sim;
      world.food=[];world.effects=[];world.units.forEach((unit,index)=>{unit.meals=index===targetIndex?0:3;unit.growth=unit.meals;unit.stun=0;unit.down=0;unit.z=unit.vz=unit.vx=unit.vy=0;unit.cooldown=30;unit.ability.phase='idle';unit.ability.elapsed=0;unit.ability.action=null});
      world.mode='breed';BUDMORI.runtime.paused=false;BUDMORI.runtime.capturePresentation('reset');
    },{targetId,targetIndex});
    for(let meal=1;meal<=3;meal++){
      const before=await page.evaluate(({targetId})=>({meals:BUDMORI.sim.units.find(u=>u.id===targetId).meals,produced:BUDMORI.sim.foodTaps.produced}),{targetId});
      for(let tap=0;tap<5;tap++)await page.locator('#feed').click();
      await page.waitForFunction(({produced})=>BUDMORI.sim.foodTaps.produced>=produced+1,{produced:before.produced},{timeout:8000});
      await page.waitForFunction(()=>BUDMORI.sim.food.some(food=>food.phase==='grounded'),{},{timeout:8000});
      await page.evaluate(({targetId})=>{
        const unit=BUDMORI.sim.units.find(u=>u.id===targetId),food=BUDMORI.sim.food.find(f=>f.phase==='grounded');
        if(!food)throw Error('Grounded food disappeared before tracking fixture was positioned');
        unit.x=Math.max(-9,food.x-1);unit.y=food.y;unit.home={x:unit.x,y:unit.y};unit.vx=unit.vy=0;
      },{targetId});
      await page.waitForFunction(({targetId})=>{
        const unit=BUDMORI.sim.units.find(u=>u.id===targetId),food=BUDMORI.sim.food.find(f=>f.phase==='grounded');
        return !!food&&(food.x-unit.x)*unit.vx+(food.y-unit.y)*unit.vy>.03;
      },{targetId},{timeout:5000});
      const tracking=await page.evaluate(({targetId})=>{const u=BUDMORI.sim.units.find(v=>v.id===targetId),f=BUDMORI.sim.food.find(v=>v.phase==='grounded');return{species:u.species,mealsAtTrack:u.meals,distance:Math.hypot(f.x-u.x,f.y-u.y),velocityDot:(f.x-u.x)*u.vx+(f.y-u.y)*u.vy}}, {targetId});
      await page.waitForFunction(({targetId,meals})=>BUDMORI.sim.units.find(u=>u.id===targetId).meals>=meals,{targetId,meals:before.meals+1},{timeout:8000});
      await page.waitForFunction(({targetId})=>BUDMORI.sim.units.find(u=>u.id===targetId).z===0,{targetId},{timeout:5000});
      const after=await page.evaluate(({targetId})=>{const u=BUDMORI.sim.units.find(v=>v.id===targetId),player=BUDMORI.renderer.vectorPlayers.get(targetId);return{species:u.species,meals:u.meals,fed:u.fed,expression:player?.currentExpression,eatEvents:BUDMORI.sim.events.filter(e=>e==='eat').length}}, {targetId});
      report.tracking.push({expectedMeal:before.meals+1,...tracking,...after});assert.equal(after.meals,before.meals+1,`Species ${after.species} should consume its food`);
    }
    await page.waitForFunction(({targetId})=>{
      const u=BUDMORI.sim.units.find(v=>v.id===targetId),player=BUDMORI.renderer.vectorPlayers.get(targetId);
      return u.fed&&u.z===0&&player?.currentExpression==='neutral';
    },{targetId},{timeout:6000});
  }
  report.satisfiedUnits=await page.evaluate(ids=>ids.map(id=>{const u=BUDMORI.sim.units.find(unit=>unit.id===id);return{id:u?.id,species:u?.species,fed:u?.fed,meals:u?.meals,expression:BUDMORI.renderer.vectorPlayers.get(id)?.currentExpression}}),ids);
  assert(report.satisfiedUnits.every(u=>u.fed&&u.meals>=3&&u.expression==='neutral'));
  await page.screenshot({path:path.join(out,'hungry-expression-satisfied-mobile.png')});await page.screenshot({clip:{x:120,y:360,width:150,height:120},path:path.join(out,'hungry-expression-satisfied-mobile-faces.png')});
  assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(error){report.status='FAIL';report.failure=error.stack;throw error}
finally{await context?.close();await browser?.close();server.close();await writeFile(path.join(out,'hungry-expression-'+stage+'-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report))}
