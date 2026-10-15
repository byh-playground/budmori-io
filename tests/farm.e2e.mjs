import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../',import.meta.url)),suite=process.argv[2]||'core',out=path.join(root,'tests/output');
await mkdir(out,{recursive:true});
const report={suite,started:new Date().toISOString(),dependency:'Actual pinned CDN ESM; no dependency interception, signaling mock or software renderer flag',checks:[],errors:[],renders:[]};
const server=createServer(async(q,r)=>{const url=new URL(q.url,'http://localhost');if(url.pathname==='/favicon.ico'){r.writeHead(204);r.end();return}const f=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));if(!f.startsWith(root)){r.writeHead(403);r.end();return}try{const body=await readFile(f);r.writeHead(200,{'Content-Type':f.endsWith('.html')?'text/html;charset=utf-8':f.endsWith('.json')?'application/json':'text/javascript;charset=utf-8'});r.end(body)}catch{r.writeHead(404);r.end()}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
let browser;
const check=text=>report.checks.push(text);
async function open(context){const p=await context.newPage();p.on('pageerror',e=>report.errors.push(e.message));await p.goto(base);await p.waitForFunction(()=>window.BUDMORI,{},{timeout:30000});return p}
async function clean(p){assert.equal(await p.locator('#error').isVisible(),false,await p.locator('#error').textContent());assert.deepEqual(report.errors,[])}
async function render(p,label){const info=await p.evaluate(()=>{const g=document.querySelector('canvas').getContext('webgl'),d=g.getExtension('WEBGL_debug_renderer_info');return{renderer:g.getParameter(d.UNMASKED_RENDERER_WEBGL),gpuError:g.getError(),units:BUDMORI.sim.units.length,hp:BUDMORI.sim.boss.hp,finite:BUDMORI.sim.units.every(u=>[u.x,u.y,u.z].every(Number.isFinite)),width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth}});assert.equal(info.gpuError,0);assert(info.finite&&!info.overflow);report.renders.push({label,...info});await p.screenshot({path:path.join(out,label+'.png')})}
async function core(){
 const c=await browser.newContext({viewport:{width:1280,height:800}}),p=await open(c);
 await p.locator('#newGame').click();await p.waitForFunction(()=>BUDMORI.runtime.tick>5);assert.equal(await p.locator('#startScreen').isVisible(),false);
 const before=await p.evaluate(()=>BUDMORI.foodFeel.counts.manual);for(let i=0;i<15;i++)await p.locator('#feed').click();await p.waitForFunction(n=>BUDMORI.foodFeel.counts.manual===n+15,before);check('Start → farm; native manual taps delivered once per release');
 await p.waitForFunction(()=>BUDMORI.sim.metrics.births>0,{},{timeout:12000});await p.locator('#merge').click();await p.waitForFunction(()=>BUDMORI.sim.metrics.merges>0,{},{timeout:15000});check('Farm production, same-species breeding and same-tier merging through normal play');
 for(let i=0;i<35;i++)await p.locator('#feed').click();await p.waitForFunction(()=>BUDMORI.sim.progress.records.eat>=8,{},{timeout:12000});await p.locator('#tree').click();assert.equal(new URL(p.url()).hash,'#/growth');await p.locator('[data-invest="production"]').click();await p.waitForFunction(()=>BUDMORI.sim.progress.levels.production===1);await p.locator('#treeClose').click();check('Activity record → growth investment → close and resume');
 await p.locator('#raid').click();await p.waitForFunction(()=>BUDMORI.sim.scene==='raid'&&BUDMORI.sim.running);await p.waitForFunction(()=>new Set(BUDMORI.sim.combatLog.filter(e=>e.kind==='damage').map(e=>e.species)).size===3,{},{timeout:20000});check('Boss starts immediately; all three automatic attack types cause actual impact damage');
 await passiveInput(p,'mouse');await render(p,'pc-battle');await combatScenarios(p);await armyScenarios(p);await seedScenarios(p,'pc');
 await p.locator('#return').click();await p.waitForFunction(()=>BUDMORI.sim.scene==='farm');await p.locator('#home').click();const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('bloom-weapon-cards-v3')));assert.equal(saved.world.progress.levels.production,1);assert(saved.world.metrics.merges>0);await p.reload();await p.waitForFunction(()=>window.BUDMORI);await p.locator('#continueGame').click();assert.equal(await p.evaluate(()=>BUDMORI.sim.progress.levels.production),1);check('Boss return → home save → browser reload → continue retains army and investment');
 await p.locator('#help').click();assert.equal(new URL(p.url()).hash,'#/help');await p.reload();await p.waitForFunction(()=>window.BUDMORI);assert(await p.locator('#helpPanel').isVisible());await p.locator('#closeHelp').click();await p.goBack();assert(await p.locator('#helpPanel').isVisible());await p.goForward();assert.equal(await p.locator('#helpPanel').isVisible(),false);check('Help direct route, F5, close, back and forward agree');await p.locator('#tree').click();await p.evaluate(()=>{history.pushState(null,'','#/help');dispatchEvent(new PopStateEvent('popstate'))});await p.locator('#closeHelp').click();assert.equal(await p.evaluate(()=>BUDMORI.runtime.paused),false);await p.goto('about:blank');await p.goBack();await p.waitForFunction(()=>window.BUDMORI);if(await p.locator('#startScreen').isVisible())await p.locator('#continueGame').click();assert.equal(await p.evaluate(()=>BUDMORI.runtime.session.closed),false);check('Panel-to-panel route restores prior pause; browser Back revives a live session');await clean(p);await c.close();
 const mobile=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true,isMobile:true}),m=await open(mobile);await m.locator('#newGame').tap();await m.locator('#feed').tap();await m.locator('#raid').tap();await m.waitForFunction(()=>BUDMORI.sim.scene==='raid');await passiveInput(m,'touch');await m.waitForFunction(()=>BUDMORI.sim.notices.some(h=>h.kind==='unit-hit'&&BUDMORI.sim.notices.some(l=>l.kind==='unit-land'&&l.unit===h.unit&&l.sequence>h.sequence)),{},{timeout:20000});await render(m,'mobile-battle');await seedScenarios(m,'mobile');await m.locator('#tree').tap();await render(m,'mobile-growth');await m.locator('#treeClose').tap();await m.setViewportSize({width:390,height:568});await m.locator('#help').tap();await render(m,'mobile-short-help');await clean(m);check('390px native touch with no manual command, airborne landing, growth, short viewport help and real GPU render');await mobile.close();
}
async function passiveInput(p,pointerType){
 const canvas=p.locator('canvas'),box=await canvas.boundingBox(),x=box.x+box.width*.3,y=box.y+box.height*.55;
 // Observe the active input path while autonomous simulation keeps running.
 await p.evaluate(()=>{const r=BUDMORI.runtime;globalThis.passiveCommands=[];globalThis.passiveQueue=r.queue;r.queue=function(type,args){passiveCommands.push(type);return passiveQueue.call(this,type,args)};});
 if(pointerType==='touch'){const cdp=await p.context().newCDPSession(p);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await p.waitForTimeout(300);await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+60,y:y-40}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
 else{await p.mouse.move(x,y);await p.mouse.down();await p.waitForTimeout(300);await p.mouse.move(x+90,y-60,{steps:5});await p.mouse.up();await p.mouse.click(x,y);}
 assert.deepEqual(await p.evaluate(()=>passiveCommands),[]);
 assert.equal(await p.evaluate(()=>{const w=BUDMORI.sim;return ['cast','moveTarget','aim'].some(k=>Object.hasOwn(w,k))}),false);
 await p.evaluate(()=>{BUDMORI.runtime.queue=passiveQueue});
 check(pointerType+' arena click and drag create no command or manual-control state');
}
async function combatScenarios(p){
 // Initial-state fixtures exercise actual stepping and rendered outcomes, never force attack results.
 const evidence=await p.evaluate(()=>{
  const Garden=BUDMORI.sim.constructor,results=[];
  for(const quadrant of [[1,1],[-1,1],[-1,-1],[1,-1]]){
   const w=new Garden(9137);w.setScene('raid');w.units=w.units.slice(0,9);w.boss.x=0;w.boss.y=0;w.boss.hp=w.boss.maxHp=1e6;
   for(const [i,u]of w.units.entries()){u.x=quadrant[0]*(11+i*.15);u.y=quadrant[1]*(8+i*.1);u.vx=u.vy=u.vz=u.z=0;u.hp=1e5;}
   const before={x:w.boss.x,y:w.boss.y};let chased=false,maxZ=0,hit=false,basic=false,land=false,sweep=false,prepared=false,launched=false,windupSafe=true,uniqueHits=true,lastSequence=0;const hits=new Set();
   for(let i=0;i<3600;i++){
    const windup=w.boss.phase.endsWith('windup'),health=new Map(w.units.map(u=>[u.id,u.hp]));w.step(1/120);
    if(windup)windupSafe &&= w.units.every(u=>!health.has(u.id)||u.hp===health.get(u.id));
    chased ||= (w.boss.x-before.x)*quadrant[0]>.25&&(w.boss.y-before.y)*quadrant[1]>.25;maxZ=Math.max(maxZ,...w.units.map(u=>u.z));
    for(const e of w.notices){if(e.sequence<=lastSequence)continue;lastSequence=e.sequence;if(e.kind==='unit-hit'){hit=true;if(e.attackKind==='basic')basic=true;const key=e.attackId+':'+e.unit;uniqueHits &&= Number.isInteger(e.attackId)&&e.attackId>0&&!hits.has(key);hits.add(key);}if(e.kind==='unit-land')land=true;if(e.kind==='unit-hit'&&e.attackKind==='sweep')sweep=true;if(e.kind==='boss-prepare')prepared=true;if(e.kind==='boss-launch')launched=true;}
   }
   results.push({quadrant,chased,maxZ,hit,basic,land,sweep,prepared,launched,windupSafe,uniqueHits,finite:w.units.every(u=>[u.x,u.y,u.z].every(Number.isFinite))});
  }
  return results;
 });
 for(const e of evidence){assert(e.chased,'boss chases quadrant '+e.quadrant);assert(e.prepared&&e.launched&&e.hit&&e.basic&&e.maxZ>.2&&e.land,'telegraph, contact, airborne and landing '+e.quadrant);assert(e.sweep,'periodic sweep hits '+e.quadrant);assert(e.windupSafe,'windup cannot damage units '+e.quadrant);assert(e.uniqueHits,'one hit per attack and unit '+e.quadrant);assert(e.finite);}
 report.combat=evidence;check('Four world quadrants: boss chase, telegraph, real contact, airborne landing and periodic sweep');
 const wall=await p.evaluate(()=>{
  const w=new BUDMORI.sim.constructor(773),g=BUDMORI.ArenaGeometry;w.setScene('raid');w.units=w.units.slice(0,9);w.boss.x=15;w.boss.y=0;w.boss.hp=w.boss.maxHp=1e6;
  const edge=g.clamp({x:100,y:0},'raid',1);for(const[i,u]of w.units.entries()){Object.assign(u,{x:edge.x-.1*(i%3),y:(i-4)*.3,z:0,vx:0,vy:0,vz:0,hp:1e5})}
  let hit=false,land=false,bounded=true;for(let i=0;i<3600;i++){w.step(1/120);hit ||= w.notices.some(e=>e.kind==='unit-hit');land ||= w.notices.some(e=>e.kind==='unit-land');bounded &&= w.units.every(u=>g.inside(u,'raid'))&&g.inside(w.boss,'raid');}
  return {hit,land,bounded,edge};
 });
 assert(wall.hit&&wall.land&&wall.bounded,'wall contact remains inside world and lands');report.wall=wall;check('Wall-near combat maintains world bounds through knockback and landing');
 const outcomes=await p.evaluate(()=>{
  const Garden=BUDMORI.sim.constructor;
  function run(kind){const w=new Garden(818);w.setScene('raid');if(kind==='victory')w.boss.hp=1;else for(const u of w.units)u.hp=0;for(let i=0;i<2400&&w.encounter.outcome==='fighting';i++)w.step(1/120);return {outcome:w.encounter.outcome,running:w.running};}
  return {victory:run('victory'),defeat:run('defeat')};
 });
 assert.equal(outcomes.victory.outcome,'victory');assert.equal(outcomes.defeat.outcome,'defeat');assert.equal(outcomes.victory.running,false);assert.equal(outcomes.defeat.running,false);report.outcomes=outcomes;check('Actual combat stepping resolves victory and defeat');
 for(const outcome of ['victory','defeat']){
  await p.evaluate(kind=>{const r=BUDMORI.runtime,w=new r.world.constructor(818);globalThis.beforeOutcomeWorld=r.world;w.setScene('raid');if(kind==='victory')w.boss.hp=1;else for(const u of w.units)u.hp=0;for(let i=0;i<2400&&w.encounter.outcome==='fighting';i++)w.step(1/120);r.world=w;r.previous=null;},outcome);
  await p.waitForFunction(kind=>BUDMORI.sim.encounter.outcome===kind,outcome);await render(p,'pc-'+outcome);await p.locator('#return').click();await p.waitForFunction(()=>BUDMORI.sim.scene==='farm');
  assert(await p.evaluate(()=>BUDMORI.sim.units.every(u=>u.hp>0&&u.down===0)),'farm return restores army after '+outcome);
  await p.evaluate(()=>{BUDMORI.runtime.world=beforeOutcomeWorld;BUDMORI.runtime.previous=null});
 }
 check('Victory and defeat render in product; native return restores farm army');
}
async function seedScenarios(p,label){
 const poses=['idle','windup','active','recover'];
 const signatures=await p.evaluate(()=>{
  const art=BUDMORI.SeedArt,w=new BUDMORI.sim.constructor(623),u=w.units[0],signatures=[];
  for(let species=0;species<3;species++)for(let tier=1;tier<=4;tier++){
   u.species=species;u.tier=tier;u.meals=3;const values=[];
   for(const phase of ['idle','windup','active','recover']){u.ability.phase=phase;u.ability.elapsed=phase==='idle'?0:.12;const pose=art.pose(u,1.25,0);if(![pose.sx,pose.sy,pose.tilt,pose.open].every(Number.isFinite))throw Error('Non-finite seed pose');values.push(JSON.stringify([pose.sx,pose.sy,pose.tilt,pose.open]));}
   if(new Set(values).size<3)throw Error('Seed preparation/contact/recovery poses indistinguishable');signatures.push({species,tier,distinct:new Set(values).size});
  }
  u.hp=0;u.down=1;if(!art.pose(u,1.25,0).dead)throw Error('Dead seed pose missing');return signatures;
 });
 report.seedPoses=signatures;
 await p.evaluate(()=>{globalThis.seedOriginal={world:BUDMORI.runtime.world,paused:BUDMORI.runtime.paused};BUDMORI.runtime.paused=true;});
 try{
  for(const scene of ['farm','raid']){
   await p.evaluate(scene=>{const r=BUDMORI.runtime,w=new r.world.constructor(623);w.units=[];w.food=[];w.effects=[];w.projectiles=[];w.setScene(scene);w.time=1.25;w.boss.phase='resting';if(scene==='raid'){w.boss.x=14;w.boss.y=8;}
    for(let species=0;species<3;species++)for(let tier=1;tier<=4;tier++){const u=w.spawn(species,tier,(tier-2.5)*3.4,(species-1)*3);Object.assign(u,{meals:3,growth:3,angle:Math.PI*.15,z:0,vx:0,vy:0,vz:0});}
    r.world=w;r.previous=null;
   },scene);
   for(const phase of poses){
    await p.evaluate(phase=>{for(const u of BUDMORI.sim.units){u.ability.phase=phase;u.ability.elapsed=phase==='idle'?0:.12;}},phase);
    await p.evaluate(()=>new Promise(requestAnimationFrame));await render(p,label+'-seed-'+scene+'-'+phase);
    const visible=await p.evaluate(()=>{const r=BUDMORI.renderer;return BUDMORI.sim.units.map(u=>{const q=r.project(u.x,u.y,u.z),d=r.pixelRatio;return {species:u.species,tier:u.tier,radius:u.radius,x:q.x/d,y:q.y/d,visible:q.x>=0&&q.y>=0&&q.x<r.canvas.width&&q.y<r.canvas.height};});});
    assert(visible.every(u=>u.visible),'seed grid inside actual '+scene+' viewport');report.seedGrid??=[];report.seedGrid.push({label,scene,phase,units:visible});
   }
   if(scene==='raid'){
    await p.evaluate(()=>{for(const u of BUDMORI.sim.units){u.hp=0;u.down=1;u.ability.phase='recover';u.z=0;u.vx=u.vy=u.vz=0;}});await p.evaluate(()=>new Promise(requestAnimationFrame));await render(p,label+'-seed-corpses');
   }
  }
 }finally{await p.evaluate(()=>{const r=BUDMORI.runtime;r.world=seedOriginal.world;r.paused=seedOriginal.paused;r.previous=null;});}
 check(label+' three seed species × tiers1–4 × four attack poses at real farm/raid camera sizes');
}
async function armyScenarios(p){
 const evidence=await p.evaluate(()=>{
  const Garden=BUDMORI.sim.constructor,specs=BUDMORI.ATTACK_TYPES;
  const target=(species,x)=>{const w=new Garden(501);w.units=[];w.spawn(species,1,x,0);w.setScene('raid');Object.assign(w.units[0],{x,y:0,z:0,vx:0,vy:0,vz:0});w.boss.phase='resting';w.boss.hp=w.boss.maxHp=1e6;return w;};
  const ranges=[];
  for(let species=0;species<3;species++){
   const initial=4.4+specs[species].stand+3,w=target(species,initial),u=w.units[0];let prepare=null;
   for(let i=0;i<1800&&!prepare;i++){w.step(1/120);prepare=w.combatLog.find(e=>e.kind==='prepare');}
   const distance=prepare?Math.hypot(prepare.x-w.boss.x,prepare.y-w.boss.y):null;let minDistance=Math.hypot(u.x,u.y),lateral=0;
   for(let i=0;i<600;i++){w.step(1/120);minDistance=Math.min(minDistance,Math.hypot(u.x,u.y));lateral=Math.max(lateral,Math.abs(u.y));}
   ranges.push({species,distance,stand:w.boss.radius+specs[species].stand,minDistance,lateral,damaged:w.boss.hp<w.boss.maxHp});
  }
  const close=target(1,5.1),lob=close.units[0];for(let i=0;i<1800&&!close.combatLog.some(e=>e.kind==='prepare');i++)close.step(1/120);const prep=close.combatLog.find(e=>e.kind==='prepare');
  const retreat={distance:prep?Math.hypot(prep.x,prep.y):null,stand:close.boss.radius+specs[1].stand,x:lob.x};
  const w=new Garden(829);w.units=[];const dead=w.spawn(0,1,5,0),alive=w.spawn(1,1,12,0);w.setScene('raid');Object.assign(dead,{x:5,y:0,hp:8,z:0,vx:0,vy:0,vz:0});Object.assign(alive,{x:12,y:0,hp:1e5,z:0,vx:0,vy:0,vz:0});w.boss.targetId=dead.id;
  let airborne=false,landed=false;for(let i=0;i<1800;i++){w.step(1/120);if(dead.hp===0&&dead.z>.1)airborne=true;if(dead.hp===0&&w.notices.some(e=>e.kind==='unit-land'&&e.unit===dead.id))landed=true;}
  const corpse={dead:dead.hp===0,airborne,landed,z:dead.z};
  // Explicit overlap fixture: a settled corpse cannot be displaced by a boss or live unit.
  const at={x:dead.x,y:dead.y};Object.assign(w.boss,{x:dead.x,y:dead.y,phase:'resting'});Object.assign(alive,{x:dead.x+.01,y:dead.y,z:0,vx:0,vy:0,vz:0});for(let i=0;i<240;i++)w.step(1/120);corpse.drift=Math.hypot(dead.x-at.x,dead.y-at.y);
  w.boss.phase='chase';w.boss.targetId=dead.id;w.step(1/120);corpse.retargeted=w.boss.targetId!==dead.id;
  w.setScene('farm');corpse.recovered=w.units.every(u=>u.hp>0&&u.down===0&&u.z===0);
  const h=new Garden(307);h.units=[];for(let tier=1;tier<=3;tier++)h.spawn(tier-1,tier,(tier-2)*6,0);h.setScene('raid');h.boss.phase='resting';const max=h.units.reduce((n,u)=>n+u.hp,0);h.units[0].hp=0;h.units[1].hp=0;h.units[2].hp=17;const before={...h.armyHealth};h.starter=59.99;h.step(.02);const after={...h.armyHealth},added=h.units.at(-1).hp;
  return {ranges,retreat,corpse,health:{max,before,after,added}};
 });
 for(const r of evidence.ranges){assert(r.distance!==null&&Math.abs(r.distance-r.stand)<=.65,'species '+r.species+' attacks within own range');assert(r.damaged,'species '+r.species+' real impact');assert(r.lateral<.15,'species '+r.species+' has no forced rotating slot');if(r.species===1)assert(r.minDistance>=r.stand-.65,'lob holds firing range');}
 assert(evidence.retreat.distance!==null&&evidence.retreat.distance>=evidence.retreat.stand-.65&&evidence.retreat.x>5.1,'close lob retreats before firing');
 const corpse=evidence.corpse;assert(corpse.dead&&corpse.airborne&&corpse.landed&&corpse.z===0,'lethal hit corpse completes airborne landing');assert(corpse.drift<.05,'settled corpse remains at landing under body overlap');assert(corpse.retargeted&&corpse.recovered,'corpse excluded from targets and restored on return');
 const h=evidence.health;assert.deepEqual(h.before,{current:17,max:h.max,living:1,total:3});assert.equal(h.after.max,h.max+h.added);assert.equal(h.after.current,17+h.added);assert.equal(h.after.total,4);assert.equal(h.after.living,2);report.army=evidence;
 const wasPaused=await p.evaluate(()=>{const r=BUDMORI.runtime,paused=r.paused;r.paused=true;return paused;});await p.evaluate(()=>new Promise(requestAnimationFrame));
 const hud=await p.evaluate(()=>({army:BUDMORI.sim.armyHealth,boss:BUDMORI.sim.boss.hp,text:document.querySelector('#allyHealthText').textContent,bossText:document.querySelector('#bossHealthText').textContent,bar:document.querySelector('#allyHealth').parentElement.getBoundingClientRect().width,now:Number(document.querySelector('#allyHealth').getAttribute('aria-valuenow')),max:Number(document.querySelector('#allyHealth').getAttribute('aria-valuemax'))}));
 await p.evaluate(paused=>{BUDMORI.runtime.paused=paused},wasPaused);assert(hud.bar>0);assert.equal(hud.now,hud.army.current);assert.equal(hud.max,hud.army.max);assert(hud.text.includes(String(Math.ceil(hud.army.current)))&&hud.text.includes(String(Math.ceil(hud.army.max))));assert(hud.bossText.includes(String(Math.ceil(hud.boss))));check('Species hold actual firing range; corpses land, stay nonblocking, leave targets and recover; aggregateHP retains dead denominator and adds reinforcements');
}

async function save(){
 const c=await browser.newContext({viewport:{width:1280,height:800}});await c.addInitScript(()=>localStorage.setItem('bloom-weapon-cards-v3',JSON.stringify({productVersion:'0.3.0',compatibility:'0.3',world:{army:['preserve-me'],cast:null,moveTarget:null}} )));const p=await open(c),old=await p.evaluate(()=>localStorage.getItem('bloom-weapon-cards-v3'));assert(await p.locator('#continueGame').isDisabled());assert((await p.locator('#saveNotice').textContent()).includes('호환'));await p.waitForTimeout(500);assert.equal(await p.evaluate(()=>localStorage.getItem('bloom-weapon-cards-v3')),old);
 await p.goto(base+'/#/raid');await p.waitForFunction(()=>window.BUDMORI);assert(await p.locator('#startScreen').isVisible());assert.equal(await p.evaluate(()=>localStorage.getItem('bloom-weapon-cards-v3')),old);check('Incompatible save with direct raid route redirects home and retains original bytes');
 const download=p.waitForEvent('download');await p.locator('#exportSave').click();const d=await download,raw=await readFile(await d.path(),'utf8');assert.equal(raw,old);check('Incompatible existing save is retained unchanged and exported byte-for-byte');
 await p.locator('#newGame').click();assert.equal(await p.evaluate(()=>localStorage.getItem('bloom-weapon-cards-v3')),old);await p.locator('#cancelNew').click();assert.equal(await p.evaluate(()=>localStorage.getItem('bloom-weapon-cards-v3')),old);await p.locator('#newGame').click();await p.locator('#confirmNew').click();await p.waitForFunction(()=>BUDMORI.runtime.tick>3);await p.locator('#home').click();const valid=await p.evaluate(()=>localStorage.getItem('bloom-weapon-cards-v3'));assert.equal(JSON.parse(valid).productVersion,'0.4.1');check('Only explicit new-garden confirmation replaces the incompatible save');
 await p.locator('#saveFile').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"world":{}}')});assert.equal(await p.evaluate(()=>localStorage.getItem('bloom-weapon-cards-v3')),valid);await p.locator('#saveFile').setInputFiles({name:'valid.json',mimeType:'application/json',buffer:Buffer.from(valid)});await p.locator('#cancelImport').click();assert.equal(await p.evaluate(()=>localStorage.getItem('bloom-weapon-cards-v3')),valid);await p.locator('#saveFile').setInputFiles({name:'valid.json',mimeType:'application/json',buffer:Buffer.from(valid)});await p.locator('#confirmImport').click();await p.locator('#continueGame').click();await p.locator('#home').click();const prior=JSON.parse(valid);prior.productVersion='0.4.0';await p.locator('#saveFile').setInputFiles({name:'prior-0.4.0.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(prior))});await p.locator('#confirmImport').click();await p.locator('#continueGame').click();assert.equal(await p.evaluate(()=>BUDMORI.sim.units.length),prior.world.units.length);check('Compatible 0.4.0 save resumes directly under 0.4.1');await clean(p);check('Malformed import and cancelled import preserve save; explicit valid import resumes');await c.close();
}
async function network(){
 const c=await browser.newContext({viewport:{width:1280,height:800}}),a=await open(c);const sockets=[];c.on('page',p=>p.on('websocket',ws=>sockets.push(ws.url())));a.on('websocket',ws=>sockets.push(ws.url()));
 await a.locator('#newGame').click();await a.locator('#home').click();const solo=await a.evaluate(()=>localStorage.getItem('bloom-weapon-cards-v3'));
 await a.locator('#onlineGame').click();await a.waitForFunction(()=>BUDMORI.room&&BUDMORI.runtime.session.ready,{},{timeout:65000});const b=await open(c);await b.locator('#onlineGame').click();await Promise.all([a,b].map(p=>p.waitForFunction(()=>BUDMORI.runtime.players.length===2&&BUDMORI.runtime.session.ready,{},{timeout:65000})));await Promise.all([a,b].map(clean));check('Real public Nostr signaling → native RTC peer/data channel → two-player admission');
 report.network=sockets;report.membership=await Promise.all([a,b].map(p=>p.evaluate(()=>({session:BUDMORI.runtime.session.sessionId,local:BUDMORI.runtime.localPlayerId,players:BUDMORI.runtime.players,epoch:BUDMORI.runtime.epoch,peers:BUDMORI.room.transports.size}))));assert.equal(report.membership[0].session,report.membership[1].session);assert.notEqual(report.membership[0].local,report.membership[1].local);assert.equal(report.membership[0].peers,1);
 await b.locator('#raid').click();await Promise.all([a,b].map(p=>p.waitForFunction(()=>BUDMORI.sim.scene==='raid'&&BUDMORI.sim.boss.hp<BUDMORI.sim.boss.maxHp,{},{timeout:20000})));check('Guest scene input crosses RTC; shared automatic combat applies damage');
 // Membership is checked at the authoritative input boundary before command dispatch.
 const rejected=await a.evaluate(()=>{const r=BUDMORI.runtime,saved=r.capture(),before=r.world.foodTaps.revision,command=r.command;r.command=function(c,owner){globalThis.unknownDispatched=true;return command.call(this,c,owner)};globalThis.unknownDispatched=false;try{r.step({tick:r.tick,inputs:[{playerId:'not-an-admitted-member',commands:[{payload:BloomGamekitDeterministic.binaryCodec.encode({type:'scene',value:'farm'})}]}]});return !unknownDispatched&&r.world.scene==='raid'&&r.world.foodTaps.revision>=before}finally{r.command=command;r.load(saved)}});
 assert(rejected);check('Unknown member intent rejected before authoritative command dispatch');
 await b.locator('#return').click();await Promise.all([a,b].map(p=>p.waitForFunction(()=>BUDMORI.sim.scene==='farm')));const fed=await a.evaluate(()=>BUDMORI.sim.eventSequence);await b.locator('#feed').click();await a.waitForFunction(n=>BUDMORI.sim.notices.some(e=>e.kind==='food-tap'&&e.source==='manual'&&e.sequence>n),fed);await b.locator('#raid').click();await Promise.all([a,b].map(p=>p.waitForFunction(()=>BUDMORI.sim.scene==='raid')));check('Guest return, food tap and raid commands apply across actual RTC');

 const tick=await a.evaluate(()=>BUDMORI.runtime.tick+20);await Promise.all([a,b].map(p=>p.evaluate(target=>{globalThis.farmCheckpoints={};const r=BUDMORI.runtime,step=r.step.bind(r);r.step=f=>{step(f);if(r.tick>=target&&r.tick<target+12)farmCheckpoints[r.tick]=BloomGamekitDeterministic.hashBytes(BloomGamekitDeterministic.binaryCodec.encode(r.capture()))}},tick)));await a.waitForFunction(()=>Object.keys(farmCheckpoints).length>=8,{},{timeout:10000});const hashes=await Promise.all([a,b].map(p=>p.evaluate(()=>farmCheckpoints))),same=Object.keys(hashes[0]).filter(t=>t in hashes[1]);assert(same.length>=3);for(const t of same)assert.equal(hashes[0][t],hashes[1][t]);report.hashes=hashes;check('Equal authoritative state hashes at '+same.length+' committed RTC ticks');
 await a.locator('#home').click();await a.goBack();await a.waitForFunction(()=>document.querySelector('#startScreen').hidden);assert.equal(await a.evaluate(()=>BUDMORI.runtime.players.length),2);await a.locator('#home').click();assert.equal(await a.evaluate(()=>localStorage.getItem('bloom-weapon-cards-v3')),solo);await a.locator('#leaveOnline').click();await a.waitForFunction(()=>!BUDMORI.room);assert.equal(await a.evaluate(()=>localStorage.getItem('bloom-weapon-cards-v3')),solo);await b.waitForFunction(()=>BUDMORI.runtime.players.length===1&&BUDMORI.runtime.session.ready,{},{timeout:15000});await b.locator('#home').click();await b.locator('#leaveOnline').click();await Promise.all([a,b].map(clean));check('Graceful host leave commits remaining roster; online play preserves solo save');await c.close();
}
try{browser=await chromium.launch({channel:'msedge',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});report.browser=await browser.version();await ({core,save,network}[suite]||core)();report.status='PASS'}catch(e){report.status='FAIL';report.failure=e.stack;throw e}finally{await browser?.close();server.close();await writeFile(path.join(out,suite+'-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report))}
