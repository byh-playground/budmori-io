import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

const root=fileURLToPath(new URL('../',import.meta.url)),out=path.join(root,'tests/output');
await mkdir(out,{recursive:true});
const server=createServer(async(q,r)=>{const url=new URL(q.url,'http://localhost');if(url.pathname==='/favicon.ico'){r.writeHead(204);r.end();return}const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));if(!file.startsWith(root)){r.writeHead(403);r.end();return}try{const body=await readFile(file);r.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html;charset=utf-8':file.endsWith('.json')?'application/json':'text/javascript;charset=utf-8'});r.end(body)}catch{r.writeHead(404);r.end()}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const report={suite:'boss-visual',started:new Date().toISOString(),errors:[],viewports:[],status:'running'};let browser;
try{
  browser=await chromium.launch({channel:'msedge',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});report.browser=await browser.version();
  for(const viewport of [{name:'pc',width:1280,height:800},{name:'mobile-landscape',width:844,height:390}]){
    const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},recordVideo:{dir:out,size:{width:viewport.width,height:viewport.height}}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.BUDMORI,{},{timeout:30000});await page.locator('#newGame').click();await page.waitForFunction(()=>BUDMORI.sim.scene==='farm'&&document.querySelector('#startScreen').hidden,{},{timeout:8000});
    const fixture=await page.evaluate(()=>{
      const renderer=BUDMORI.renderer,Garden=BUDMORI.sim.constructor,world=Garden.createRaidBattle(904,['solo']);
      const units=[world.spawn(0,1,-6,4),world.spawn(1,1,0,-4),world.spawn(2,1,6,3)];
      for(const unit of units){Object.assign(unit,{ownerId:'solo',dropLanded:true,z:0,vz:0,down:0,stun:0,flash:0});unit.ability.phase='idle';unit.ability.elapsed=0;unit.ability.action=null}
      world.running=true;world.encounter={outcome:'fighting',elapsed:0};world.boss.phase='resting';world.boss.x=0;world.boss.y=0;world.boss.z=0;
      BUDMORI.runtime.world=world;BUDMORI.runtime.speed=1;BUDMORI.runtime.paused=true;BUDMORI.runtime.capturePresentation('reset');
      window.__bossOrigins=[];const originalWeapon=renderer.drawBossWeapon.bind(renderer);
      renderer.drawBossWeapon=function(w,player,matrix){if(w.boss.phase==='strike'||w.boss.phase==='sweep'){const socket=player.getSocket('fist-right');window.__bossOrigins.push({socket:{...socket},screen:{x:matrix[0]*socket.x+matrix[4],y:matrix[3]*socket.y+matrix[5]}})}return originalWeapon(w,player,matrix)};
      window.__actorOrder=[];const originalUnit=renderer.drawUnit.bind(renderer),originalBoss=renderer.drawBoss.bind(renderer);
      renderer.drawUnit=function(u,w){if(w.scene==='raid')window.__actorOrder.push({kind:'unit',id:u.id,y:u.y});return originalUnit(u,w)};
      renderer.drawBoss=function(w){window.__actorOrder.push({kind:'boss',id:0,y:w.boss.y});return originalBoss(w)};
      return{asset:renderer.bossAssets.get('chestnut').compiled.metadata.id,units:units.map(u=>u.id),scene:world.scene};
    });
    assert.equal(fixture.asset,'budmori-chestnut-boss');assert.equal(fixture.scene,'raid');
    const captures=[];
    async function state(name,setup){
      const model=await page.evaluate(setup);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.waitForTimeout(220);
      const frame=await page.evaluate(()=>({phase:BUDMORI.runtime.presentation(performance.now()).boss.phase,clip:BUDMORI.renderer.bossPlayer?.currentClip,expression:BUDMORI.renderer.bossPlayer?.currentExpression,origin:window.__bossOrigins.at(-1)||null,units:BUDMORI.runtime.presentation(performance.now()).units.map(u=>({id:u.id,hp:u.hp,z:u.z,vz:u.vz,bounce:u.bounce,clip:BUDMORI.renderer.vectorPlayers.get(u.id)?.currentClip})),bossHp:BUDMORI.sim.boss.hp,errors:[]}));
      frame.expected=model||{};frame.name=name;frame.viewport=viewport.name;frame.drawOrder=await page.evaluate(()=>window.__actorOrder.slice(-4));
      const file=path.join(out,`boss-${viewport.name}-${name}.png`);await page.screenshot({path:file});const canvasFile=path.join(out,`boss-${viewport.name}-${name}-canvas.png`);await page.locator('#world').screenshot({path:canvasFile});captures.push({name,file,canvasFile,frame});
    }
    await state('origin',()=>{const w=BUDMORI.sim;w.boss.x=0;w.boss.y=0;w.boss.z=0;w.boss.hp=w.boss.maxHp;w.boss.flash=0;w.boss.phase='resting';w.boss.clock=0;w.units[0].x=-6;w.units[0].y=4;w.units[1].x=0;w.units[1].y=-4;w.units[2].x=6;w.units[2].y=3;BUDMORI.runtime.capturePresentation('reset');return{expectedClip:'idle',expectedExpression:'neutral',originGround:true}});
    await state('hit-right',()=>{const b=BUDMORI.sim.boss;b.phase='strike';b.clock=.12;b.angle=0;b.flash=0;BUDMORI.runtime.capturePresentation('reset');return{expectedClip:'strike',expectedExpression:'attack',direction:'right'}});
    await state('hit-left',()=>{const b=BUDMORI.sim.boss;b.phase='strike';b.clock=.12;b.angle=Math.PI;b.flash=0;BUDMORI.runtime.capturePresentation('reset');return{expectedClip:'strike',expectedExpression:'attack',direction:'left'}});
    await state('sweep',()=>{const b=BUDMORI.sim.boss;b.phase='sweep';b.startAngle=-Math.PI/2;b.clock=.35;b.angle=b.startAngle+2*Math.PI*b.clock*1000/BUDMORI.CONFIG.raid.sweepDuration;b.flash=0;BUDMORI.runtime.capturePresentation('reset');return{expectedClip:'sweep',expectedExpression:'attack',startAngle:b.startAngle}});
    await state('damage',()=>{const w=BUDMORI.sim,unit=w.units[0],before=w.boss.hp;w.boss.phase='chase';w.boss.clock=0;w.boss.flash=0;const hit=w.damageBoss(unit,{hit:false,id:77},{x:-w.boss.radius,y:0,z:1});BUDMORI.runtime.capturePresentation('reset');return{expectedClip:'hit',expectedExpression:'hurt',damage:before-w.boss.hp,damageAccepted:hit}});
    await state('airborne',()=>{const w=BUDMORI.sim,b=w.boss,u=w.units[1];u.x=6.15;u.y=0;u.z=0;u.vz=0;u.hp=40;u.stun=0;u.bounce=0;b.phase='strike';b.clock=.12;b.angle=0;const from=w.bossWeaponPoint('strike',.48),to=w.bossWeaponPoint('strike',.52),before=u.hp;w.hitBossWeapon(from,to,'basic');u.stun=0;u.integrate(1/60);u.integrate(1/60);BUDMORI.runtime.capturePresentation('reset');return{expectedClip:'strike',hit:u.hp<before,unitDamage:before-u.hp,airborne:u.z>.1,unitId:u.id}});
    await state('landing',()=>{const u=BUDMORI.sim.units[1];u.stun=0;for(let i=0;i<240;i++){u.integrate(1/120);if(u.z===0&&u.bounce>.04)break}BUDMORI.runtime.capturePresentation('reset');return{unitId:u.id,landed:u.z===0&&u.bounce>.04,landingPose:u.bounce>.04,expectedUnitClip:'landing'}});
    await state('depth-order',()=>{const w=BUDMORI.sim;w.boss.x=0;w.boss.y=0;w.boss.z=0;w.boss.phase='resting';w.units[0].x=0;w.units[0].y=5;w.units[1].x=0;w.units[1].y=-5;w.units[2].x=7;w.units[2].y=2;w.units.forEach(u=>{u.z=0;u.vz=0;u.hp=40;u.down=0;u.stun=0;u.bounce=0});window.__actorOrder.length=0;BUDMORI.runtime.capturePresentation('reset');return{expectedOrder:'positive world y behind; boss origin; negative world y foreground'}});
    await page.waitForTimeout(250);report.viewports.push({name:viewport.name,width:viewport.width,height:viewport.height,captures});report.errors.push(...errors.map(message=>`${viewport.name}: ${message}`));
    const video=page.video();await context.close();const videoFile=path.join(out,`boss-${viewport.name}.webm`);await video.saveAs(videoFile);report.viewports.at(-1).video=videoFile;
  }
  const pc=report.viewports.find(v=>v.name==='pc'),mobile=report.viewports.find(v=>v.name==='mobile-landscape');
  for(const viewport of [pc,mobile]){
    const find=name=>viewport.captures.find(c=>c.name===name).frame;
    assert.equal(find('origin').clip,'idle');assert.equal(find('origin').expression,'neutral');assert.equal(find('hit-right').clip,'strike');assert.equal(find('hit-left').clip,'strike');assert(find('hit-right').origin&&find('hit-left').origin,'Both attack directions must render from the transformed fist socket');assert.equal(find('sweep').clip,'sweep');assert.equal(find('damage').expected.damageAccepted,true);assert(find('damage').expected.damage>0);assert.equal(find('damage').clip,'hit');assert(find('airborne').expected.hit&&find('airborne').expected.unitDamage>0&&find('airborne').expected.airborne);assert(find('landing').expected.landed&&find('landing').expected.landingPose);const order=find('depth-order').drawOrder;assert.deepEqual(order.map(a=>a.kind),['unit','unit','boss','unit']);assert(order[0].y>order[1].y&&order[1].y>0&&order[2].kind==='boss'&&order[3].y<0,'Depth ordering should render far troops, then the boss, then near troops');
  }
  assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(error){report.status='FAIL';report.failure=error.stack;throw error}
finally{await browser?.close();server.close();await writeFile(path.join(out,'boss-visual-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report))}
