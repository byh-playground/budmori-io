import {chromium} from 'playwright';
import {PRODUCT_VERSION} from '../src/version.js';
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
async function open(context){const p=await context.newPage();p.on('pageerror',e=>{if(!report.errors.length)report.errors.push(e.stack||e.message)});await p.goto(base);await p.waitForFunction(()=>window.BUDMORI,{},{timeout:30000});return p}
async function clean(p){assert.equal(await p.locator('#error').isVisible(),false,await p.locator('#error').textContent());assert.deepEqual(report.errors,[])}
async function openMenuTab(p,tab='play'){if(!(await p.locator('#gameMenuOverlay').isVisible()))await p.locator('#gameMenu').click();const button=p.locator(`[data-menu-tab=\"${tab}\"]`);if(await button.getAttribute('aria-selected')!=='true')await button.click()}
async function closeMenu(p){if(await p.locator('#gameMenuOverlay').isVisible())await p.locator('#gameMenuClose').click()}
async function goHome(p){await openMenuTab(p,'play');await p.locator('#menuHome').click()}
async function render(p,label){
 const timing=await p.evaluate(async()=>{
  const r=BUDMORI.renderer,draw=r.render,samples=[];
  r.render=function(display,...args){
   const byId=new Map(BUDMORI.sim.units.map(u=>[u.id,u]));
   samples.push({now:performance.now(),simulationTick:BUDMORI.runtime.tick,simulationTime:BUDMORI.sim.time,displayTime:display.time,displayTimeMs:display.displayTimeMs,diagnostics:display.presentationDiagnostics,
    units:display.units.slice(0,4).map(u=>{const raw=byId.get(u.id);return{id:u.id,raw:raw&&{x:raw.x,y:raw.y,z:raw.z,angle:raw.angle},display:{x:u.x,y:u.y,z:u.z,angle:u.angle}}}),
    boss:{raw:{x:BUDMORI.sim.boss.x,y:BUDMORI.sim.boss.y,angle:BUDMORI.sim.boss.angle},display:{x:display.boss.x,y:display.boss.y,z:display.boss.z,angle:display.boss.angle}}});
   if(samples.length>180)samples.shift();return draw.call(this,display,...args)
  };
  try{const deadline=performance.now()+5000;while(samples.length<3&&performance.now()<deadline)await new Promise(requestAnimationFrame)}finally{r.render=draw}
  const d=samples.at(-1),times=samples.map(s=>s.displayTimeMs).filter(Number.isFinite);
  return{renderMetrics:BUDMORI.renderMetrics,sampleCount:samples.length,displayTimeMonotonic:times.every((t,i)=>!i||t>=times[i-1]),latest:d}
 });
 assert(timing.sampleCount>=3,'actual RAF render samples captured');assert(timing.displayTimeMonotonic,'presentation time never runs backward');
 const d=timing.latest?.diagnostics;if(d){assert(d.renderFraction===null||d.renderFraction>=0&&d.renderFraction<=1,'render fraction remains clamped to the snapshot interval');if(['pc-battle','mobile-battle'].includes(label)&&d.previousSnapshotTimeMs!==null)assert(d.sampleAgeMs>=0&&d.sampleAgeMs<=d.intervalMs+1,'active-battle presentation is sampled between adjacent snapshots')}
 const info=await p.evaluate(()=>{const g=document.querySelector('canvas').getContext('webgl'),d=g.getExtension('WEBGL_debug_renderer_info');return{renderer:g.getParameter(d.UNMASKED_RENDERER_WEBGL),gpuError:g.getError(),units:BUDMORI.sim.units.length,hp:BUDMORI.sim.boss.hp,finite:BUDMORI.sim.units.every(u=>[u.x,u.y,u.z].every(Number.isFinite)),width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth}});
 assert.equal(info.gpuError,0);assert(info.finite&&!info.overflow);report.renders.push({label,...info,timing});await p.screenshot({path:path.join(out,label+'.png')})
}
async function worldClient(p,x,y){return p.evaluate(({x,y})=>{const r=BUDMORI.renderer,pt=r.project(x,y,0),b=r.canvas.getBoundingClientRect();return{x:b.left+pt.x/r.pixelRatio,y:b.top+pt.y/r.pixelRatio}}, {x,y})}
async function holdDeployButton(p,{hold=0,touch=false,cancel=false}={}){
 const button=p.locator('#deployTroops');await button.waitFor({state:'visible'});assert(await button.isEnabled(),'the deployment button is usable during active Raid play');const box=await button.boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;
 if(touch){const cdp=await p.context().newCDPSession(p);try{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:11,x,y}]});if(hold)await p.waitForTimeout(hold);await cdp.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});}finally{await cdp.detach()}}
 else{await button.evaluate(node=>node.addEventListener('pointerdown',event=>{window.deployPointerId=event.pointerId},{once:true}));await p.mouse.move(x,y);await p.mouse.down();if(hold)await p.waitForTimeout(hold);if(cancel)await button.evaluate(node=>node.dispatchEvent(new PointerEvent('pointercancel',{pointerId:window.deployPointerId,bubbles:true})));await p.mouse.up()}
}
async function buttonDeployment(p,pointerType){
 const initial=await p.evaluate(()=>{
  const runtime=BUDMORI.runtime,world=runtime.world;
  window.deployProbe={queue:runtime.queue,deploy:world.deployNextRaidUnit,world,submitted:[],created:[]};
  runtime.queue=function(type,args){const accepted=deployProbe.queue.call(this,type,args);if(type==='deploy'&&accepted)deployProbe.submitted.push({at:performance.now(),...args});return accepted};
  world.deployNextRaidUnit=function(ownerId,sequence){const accepted=deployProbe.deploy.call(this,ownerId,sequence);if(accepted){const unit=this.units.at(-1);deployProbe.created.push({id:unit.id,farmId:unit.farmId,tier:unit.tier,x:unit.x,y:unit.y,z:unit.z,radius:unit.radius,landed:unit.dropLanded,sequence})}return accepted};
  return{remaining:world.raidRemaining('solo'),order:world.raidRoster('solo').troops.map(t=>({farmId:t.farmId,tier:t.tier})),dropHeight:BUDMORI.CONFIG.raid.dropHeight,arena:BUDMORI.CONFIG.raid.arena};
 });
 try{
  assert(initial.remaining>=8,'the user-flow fixture has enough Farm troops to test separate holds');
  await holdDeployButton(p,{touch:pointerType==='touch'});await p.waitForFunction(()=>deployProbe.created.length===1);
  const tapped=await p.evaluate(()=>({submitted:deployProbe.submitted.length,created:deployProbe.created.length,remaining:BUDMORI.sim.raidRemaining('solo')}));
  assert.deepEqual(tapped,{submitted:1,created:1,remaining:initial.remaining-1},'one button press immediately queues and deploys exactly one troop');
  await holdDeployButton(p,{hold:375,touch:pointerType==='touch'});await p.waitForTimeout(100);
  const held=await p.evaluate(()=>deployProbe.created.length);assert(held>=5,'holding the button adds at least four troops at the 100ms repeat cadence');
  await p.waitForTimeout(250);assert.equal(await p.evaluate(()=>deployProbe.created.length),held,'releasing the button stops repeat submissions');
  await holdDeployButton(p,{hold:125,touch:pointerType==='touch',cancel:true});await p.waitForTimeout(100);const cancelled=await p.evaluate(()=>deployProbe.created.length);
  await p.waitForTimeout(250);assert.equal(await p.evaluate(()=>deployProbe.created.length),cancelled,'pointer cancellation stops deployment repeats');
  assert.equal(await p.locator('#deployTroops').getAttribute('aria-pressed'),'false','the released/cancelled button is no longer pressed');
  const evidence=await p.evaluate(()=>({created:deployProbe.created,submitted:deployProbe.submitted,remaining:BUDMORI.sim.raidRemaining('solo'),sequence:BUDMORI.sim.raidRoster('solo').lastDeploySequence,scatter:BUDMORI.sim.localScatter.active}));
  assert.equal(evidence.created.length,evidence.submitted.length,'every accepted deployment command creates one unit');assert.equal(evidence.sequence,evidence.created.length);assert.equal(evidence.remaining,initial.remaining-evidence.created.length);
  assert.deepEqual(evidence.created.map(u=>u.sequence),evidence.created.map((_,i)=>i+1),'successful deployments advance one sequence at a time');
  assert.deepEqual(evidence.created.map(u=>u.farmId),initial.order.slice(0,evidence.created.length).map(t=>t.farmId),'button deployment follows the frozen weakest-tier-first roster');
  assert(initial.order.every((troop,i)=>!i||troop.tier>=initial.order[i-1].tier),'all lower tiers precede higher tiers');
  assert.equal(new Set(evidence.created.map(u=>u.id)).size,evidence.created.length);assert.equal(new Set(evidence.created.map(u=>u.farmId)).size,evidence.created.length);
  for(const unit of evidence.created){const rx=initial.arena.radiusX-unit.radius-.05,ry=initial.arena.radiusY-unit.radius-.05;assert(Math.abs((unit.x/rx)**2+(unit.y/ry)**2-1)<1e-8,'each spawn lies on the outer map perimeter inset by its body radius');assert.equal(unit.z,initial.dropHeight,'original drop height is preserved');assert.equal(unit.landed,false,'new troops must finish the original gravity drop before acting')}
  assert(new Set(evidence.created.map(u=>`${u.x.toFixed(4)},${u.y.toFixed(4)}`)).size>1,'separate deployments receive different perimeter positions');assert.equal(evidence.scatter,false,'pressing the deployment control does not create a canvas circle');
  report.deployments??=[];report.deployments.push({pointerType,initialRemaining:initial.remaining,...evidence});check(pointerType+' dedicated button: one immediate troop, 100ms holds, weakest-tier-first perimeter drops, release and cancel');
 }finally{await p.evaluate(()=>{BUDMORI.runtime.queue=deployProbe.queue;deployProbe.world.deployNextRaidUnit=deployProbe.deploy;delete window.deployProbe})}
}
async function returnFromHeldInput(p,pointerType){
 await p.evaluate(()=>{window.returnInputWorld=BUDMORI.sim;BUDMORI.renderer.panByScreen(48,20)});
 const point=await worldClient(p,0,0),cdp=pointerType==='touch'?await p.context().newCDPSession(p):null;
 try{
  if(cdp)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:11,...point}]});else{await p.mouse.move(point.x,point.y);await p.mouse.down()}
  await p.waitForFunction(()=>BUDMORI.sim.localScatter.active);await p.locator('#return').press('Enter');await p.waitForFunction(()=>BUDMORI.sim.scene==='farm');
  assert.equal(await p.evaluate(()=>returnInputWorld.localScatter.active||BUDMORI.sim.localScatter.active),false,'return cancels the outgoing hold and restores an inactive Farm');
 }finally{if(cdp){await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach()}else await p.mouse.up();await p.evaluate(()=>{delete window.returnInputWorld})}
}
async function swipeEncounter(p,direction='up'){
 const box=await p.locator('#bossEncounterCard').boundingBox();assert(box,'encounter preview is visible');const x=box.x+box.width/2,y=box.y+box.height*.4,delta=direction==='up'?-100:100;
 await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x,y+delta,{steps:5});await p.mouse.up();
}
async function unlockAbilityFlow(p){
 await p.evaluate(()=>{const w=BUDMORI.sim,u=w.spawn(1,3,-4,1);if(!u)throw Error('could not seed one rare corn for the ability menu flow');u.growth=BUDMORI.CONFIG.farm.breeding.matureMeals;u.growthDuration=w.breedGrowthDuration();u.growthElapsed=u.growthDuration;w.playerProgression.availablePoints=1;w.playerProgression.abilities['corn-burst-fire']={rootUnlocked:false,powerLevel:0,gradeLevel:0}});
 await openMenuTab(p,'abilities');await p.locator('[data-ability-species="1"]').click();
 const root=p.locator('[data-ability="corn-burst-fire"] [data-ability-node="corn-burst-fire:root"]');await root.waitFor({state:'visible'});assert.equal(await root.getAttribute('aria-disabled'),'false','the selected species unlock is available');
 await root.click();await p.waitForFunction(()=>BUDMORI.sim.playerProgression.abilities['corn-burst-fire'].rootUnlocked);await p.waitForFunction(()=>document.querySelector('#abilityPoints')?.textContent.trim()==='0');
 assert.equal(await p.evaluate(()=>BUDMORI.sim.playerProgression.availablePoints),0);await closeMenu(p);check('Ability menu selects Corn, unlocks its rare ability, and spends one shared XP point');
}
async function nutAttackCycles(p){
 const result=await p.evaluate(async()=>{
  const Garden=BUDMORI.sim.constructor,{snapshot,restore,validateSnapshot}=await import('/src/farm-state.js');
  const targetPoint=x=>({id:'boss',x,y:0});
  const tick=(world,unit,count,other=null)=>{for(let i=0;i<count;i++){const dt=1/120;unit.ability.update(world,dt);const old={x:unit.x,y:unit.y,z:unit.z};unit.integrate(dt);unit.ability.afterMove(world,old);if(other)other.integrate(dt);world.time+=dt}};
  const peanutWorld=new Garden(1204);peanutWorld.boss.x=5.7;peanutWorld.boss.y=0;peanutWorld.boss.hp=peanutWorld.boss.maxHp=1000;
  const peanut=peanutWorld.spawn(4,1,0,0);peanut.ability.begin(peanutWorld,targetPoint(1.44));tick(peanutWorld,peanut,46);
  const first=peanutWorld.notices.filter(event=>event.kind==='boss-hit');
  if(first.length!==1||first[0].strikeIndex!==0||peanut.ability.action?.resolvedMask!==1||peanut.ability.action?.hitMask!==1)throw Error('Peanut first fixed strike slot was not recorded');
  const midpoint=snapshot(peanutWorld);if(!validateSnapshot(midpoint))throw Error('Peanut mid-cycle snapshot did not validate');const replay=restore(midpoint);
  const replayPeanut=replay.units.find(unit=>unit.species===4);tick(peanutWorld,peanut,30);tick(replay,replayPeanut,30);
  const hashes=world=>BloomGamekitDeterministic.hashBytes(BloomGamekitDeterministic.binaryCodec.encode(snapshot(world)));
  const peanutHits=peanutWorld.notices.filter(event=>event.kind==='boss-hit');
  if(peanutHits.length!==2||peanutHits[1].strikeIndex!==1||peanutHits[0].attackId!==peanutHits[1].attackId||peanut.ability.action?.hitMask!==3||hashes(peanutWorld)!==hashes(replay))throw Error('Peanut slot replay or per-strike damage diverged');
  const walnutWorld=new Garden(1205);walnutWorld.boss.x=5.7;walnutWorld.boss.y=0;walnutWorld.boss.hp=walnutWorld.boss.maxHp=1000;
  const walnut=walnutWorld.spawn(5,1,0,0);walnut.ability.begin(walnutWorld,targetPoint(1.44));tick(walnutWorld,walnut,100);
  const walnutHits=walnutWorld.notices.filter(event=>event.kind==='boss-hit');
  if(walnutHits.length!==1||walnutHits[0].attackKind!=='walnut-hammer')throw Error('Walnut hammer did not resolve exactly once');
  const unitWorld=new Garden(1206),attacker=unitWorld.spawn(4,1,0,0),target=unitWorld.spawn(5,1,.5,0);target.faction=BUDMORI.CONFIG.factions.ENEMY;target.ownerId='boss';target.hp=100;
  attacker.ability.begin(unitWorld,{id:target.id,x:target.x,y:target.y});tick(unitWorld,attacker,100,target);
  const unitHits=unitWorld.notices.filter(event=>event.kind==='unit-hit');
  if(unitHits.length!==2||unitHits.some(event=>event.attackKind!=='peanut-dual-strike')||unitHits[0].attackId!==unitHits[1].attackId||unitHits[0].strikeIndex!==0||unitHits[1].strikeIndex!==1||target.hp>=100)throw Error('Peanut did not route both strikes through the normal opposing-unit damage path');
  return{peanutHitCount:peanutHits.length,peanutStrikeIndexes:peanutHits.map(event=>event.strikeIndex),replayMatched:true,walnutHitCount:walnutHits.length,opposingUnitHitCount:unitHits.length,opposingUnitDamaged:target.hp<100};
 });
 assert.deepEqual(result,{peanutHitCount:2,peanutStrikeIndexes:[0,1],replayMatched:true,walnutHitCount:1,opposingUnitHitCount:2,opposingUnitDamaged:true});
 check('Peanut two-slot hits and Walnut hammer use the common damage path; a mid-cycle save/replay preserves the slot masks');
}
async function core(){
 const c=await browser.newContext({viewport:{width:1280,height:800}}),p=await open(c);
 await p.waitForFunction(()=>!document.getElementById('bloom-module-loading'));
 assert.equal(await p.locator('#bloom-error-popup').isVisible(),false,'diagnostics stay hidden during normal play');
 await p.evaluate(()=>{
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__startupDiagnostics=text}}});
  window.dispatchEvent(new ErrorEvent('error',{message:'diagnostic-probe',error:new Error('diagnostic-probe')}));
  window.BloomReportRuntimeFatal(new Error('diagnostic-probe'));
 });
 assert.equal(await p.locator('#bloom-error-popup').isVisible(),true,'blocking runtime failure opens the isolated diagnostic popup');
 await p.locator('#bloom-diagnostic-copy').click();await p.waitForFunction(()=>typeof window.__startupDiagnostics==='string');
 const startupDiagnostics=JSON.parse(await p.evaluate(()=>window.__startupDiagnostics));
 assert.equal(startupDiagnostics.format,'budmori startup diagnostics v1');assert.equal(startupDiagnostics.app.version.split(' ')[0],PRODUCT_VERSION);
 assert(startupDiagnostics.diagnostics.errors.some(error=>error.kind==='global-error'&&error.message==='diagnostic-probe'),'GameKit global diagnostics retain the startup/global error');
 assert(startupDiagnostics.recentInputs.some(input=>input.type==='click'&&input.target?.id==='bloom-diagnostic-copy'),'bounded input trace records the diagnostic button tap without form data');
 check('Startup diagnostics use the pinned GameKit error ring and copy a redacted bounded input trace');
 await p.locator('#newGame').click();await p.evaluate(()=>{const seed=4463;BUDMORI.sim.seed=seed;BUDMORI.sim.rng=new BloomGamekitDeterministic.SeededPRNG(seed)});await p.waitForFunction(()=>BUDMORI.runtime.tick>5);assert.equal(await p.locator('#startScreen').isVisible(),false);await nutAttackCycles(p);
 const menuContract=await p.evaluate(()=>({utility:[...document.querySelectorAll('.utility button')].map(button=>button.id),label:document.querySelector('#gameMenu')?.getAttribute('aria-label'),tabs:[...document.querySelectorAll('#gameMenuTabs [role="tab"]')].map(button=>button.textContent.trim()),roles:!!document.querySelector('#roles'),essentials:['feed','raidControls','deployTroops','scatterMode','panMode','raidRemaining','bossbar','allyHealth','bossHealth'].every(id=>!!document.getElementById(id))}));
 assert.deepEqual(menuContract.utility,['gameMenu'],'only one conventional gear button remains in the utility menu');assert.equal(menuContract.label,'게임 설정 열기');assert.deepEqual(menuContract.tabs,['플레이','성장','특수 능력','도움말']);assert.equal(menuContract.roles,false,'troop-role explainer is removed from the battle map');assert(menuContract.essentials,'feed, deploy status and both HP indicators remain available');
 const wasPaused=await p.evaluate(()=>BUDMORI.runtime.paused);await openMenuTab(p,'play');await p.screenshot({path:path.join(out,'pc-game-menu.png'),animations:'disabled'});if(!wasPaused){assert.equal((await p.locator('#pause').textContent()).trim(),'일시 정지');await p.locator('#pause').click();await p.waitForFunction(()=>BUDMORI.runtime.paused);assert.equal(await p.locator('#gameMenuOverlay').isVisible(),true,'Pause can be selected while the menu is open');await closeMenu(p);assert.equal(await p.evaluate(()=>BUDMORI.runtime.paused),true,'closing settings keeps an explicitly selected paused state');await openMenuTab(p,'play');assert.equal((await p.locator('#pause').textContent()).trim(),'계속하기');await p.locator('#pause').click();await p.locator('#gameMenuOverlay').waitFor({state:'hidden'});assert.equal(await p.evaluate(()=>BUDMORI.runtime.paused),false,'Continue closes the menu and resumes the Farm')}await openMenuTab(p,'help');await p.keyboard.press('Escape');await p.locator('#gameMenuOverlay').waitFor({state:'hidden'});assert.equal(await p.locator('#gameMenu').getAttribute('aria-expanded'),'false');assert.equal(await p.evaluate(()=>BUDMORI.runtime.paused),wasPaused,'Escape closes the menu and restores the previous play state');
 check('One gear entry with four Korean tabs; Escape restores the prior play state');
 await unlockAbilityFlow(p);
 const before=await p.evaluate(()=>BUDMORI.foodFeel.counts.manual);for(let i=0;i<15;i++)await p.locator('#feed').click();await p.waitForFunction(n=>BUDMORI.foodFeel.counts.manual===n+15,before);check('Start → farm; native manual taps delivered once per release');
 await p.waitForFunction(()=>BUDMORI.sim.metrics.births>0,{},{timeout:12000});await p.locator('#merge').click();await p.waitForFunction(()=>BUDMORI.sim.metrics.merges>0,{},{timeout:15000});check('Farm breeding and same-tier merging continue without passive unit production');
 await p.evaluate(()=>{BUDMORI.sim.playerProgression.level=8;BUDMORI.sim.playerProgression.availablePoints=7});await openMenuTab(p,'growth');assert.equal(new URL(p.url()).hash,'#/growth');await p.locator('[data-progression-farm-node="food"]').click();await p.waitForFunction(()=>BUDMORI.sim.playerProgression.farmUpgrades.food===1);await p.locator('[data-progression-farm-node="growth"]').click();await p.waitForFunction(()=>BUDMORI.sim.playerProgression.farmUpgrades.growth===1);for(let level=1;level<=5;level++){await p.locator('[data-progression-farm-node="capacity"]').click();await p.waitForFunction(n=>BUDMORI.sim.playerProgression.farmUpgrades.capacity===n,level)}assert.equal(await p.evaluate(()=>BUDMORI.sim.capacity),100);await closeMenu(p);check('Shared XP points buy normal upgrades and expand farm capacity from 50 through five levels to 100');await p.evaluate(()=>{BUDMORI.sim.mode='breed'});await p.waitForFunction(()=>BUDMORI.sim.mergeTask===null,{},{timeout:5000});await p.evaluate(()=>{const w=BUDMORI.sim;while(w.units.length<12){const i=w.units.length,u=w.spawn(i%3,1,-4+(i%4)*2,-3+Math.floor(i/4)*2);u.growth=BUDMORI.CONFIG.farm.breeding.matureMeals;u.growthDuration=w.breedGrowthDuration();u.growthElapsed=u.growthDuration;u.cooldown=999}w.units.forEach((u,i)=>u.id=101+i);w.nextId=101+w.units.length;if(!BUDMORI.storage.save(w))throw Error('could not save farm with lifetime-grown unit IDs: '+BUDMORI.storage.error)});
 // Synthetic Raid outcomes must not borrow the later real Raid reservation.
 await combatScenarios(p);await seedScenarios(p,'pc');
 await scatterInput(p,'mouse');await p.locator('#raid').click();assert(await p.locator('#bossEncounterScreen').isVisible(),'Raid opens the vertical stage selector');assert.equal(await p.locator('#bossStageCounter').textContent(),'1 / 61');assert.equal(await p.locator('#bossStageHp').textContent(),'HP 200');assert.equal(await p.locator('#bossStageAttack').textContent(),'공격력 4');assert.equal(await p.locator('#bossStageXp').textContent(),'+20 XP');assert.equal(await p.locator('#bossStageDrop').isVisible(),false,'stages 1–4 have no boss-species drop rolls');await swipeEncounter(p,'up');await p.waitForFunction(()=>document.querySelector('#bossStageCounter')?.textContent==='2 / 61');for(let i=0;i<3;i++){await swipeEncounter(p,'up');await p.waitForFunction(n=>document.querySelector('#bossStageCounter')?.textContent===`${n} / 61`,3+i)}assert.equal(await p.locator('#bossStageCounter').textContent(),'5 / 61');assert.equal(await p.locator('#bossStageHp').textContent(),'HP 1,013');assert.equal(await p.locator('#bossStageXp').textContent(),'+41 XP');assert(await p.locator('#bossStageDrop').isVisible());assert.match(await p.locator('#bossStageDrop').textContent(),/20%씩 · 1회 개별 추첨/);const rewardInvariant=await p.evaluate(async()=>{const{settleBossKill,bossAcquisitionChance}=await import('/src/boss-rewards.js'),world=new BUDMORI.sim.constructor(997);let zeroRollCalls=0;const zeroOptions={encounterId:900,source:'raid',receiptKey:'stage-zero-roll-xp',rollCount:0,xpAmount:41,species:0,random:()=>{zeroRollCalls++;return .1}},first=settleBossKill(world,zeroOptions),duplicate=settleBossKill(world,zeroOptions),rolls=[.1,.9],multi=settleBossKill(world,{encounterId:901,source:'raid',receiptKey:'stage-ten-rolls',rollCount:2,xpAmount:103,species:2,random:()=>rolls.shift()});return{farmEventChance:bossAcquisitionChance({farmEvent:true}),zeroRollCalls,firstXp:first.receipt.xpAmount,duplicateXp:duplicate.receipt.xpAmount,duplicateStatus:duplicate.receipt.xpStatus,rollCount:multi.receipt.rollCount,dropStatuses:multi.receipt.drops.map(drop=>drop.status),earned:world.playerProgression.processedBossKillReceipts.filter(key=>key==='stage-zero-roll-xp').length}});assert.deepEqual(rewardInvariant,{farmEventChance:.4,zeroRollCalls:0,firstXp:41,duplicateXp:41,duplicateStatus:'awarded',rollCount:2,dropStatuses:['granted','missed'],earned:1},'stage XP is idempotent; independent drops and the old Farm-event bonus are preserved');const selectedStage5=await p.evaluate(()=>BUDMORI.sim.farmBossProgress.selections.find(entry=>entry.stage===5)?.species);await swipeEncounter(p,'down');await p.waitForFunction(()=>document.querySelector('#bossStageCounter')?.textContent==='4 / 61');await p.locator('#bossEncounterBack').click();assert.equal(await p.evaluate(()=>BUDMORI.sim.farmBossProgress.currentStage),4);await p.locator('#raid').click();assert.equal(await p.locator('#bossStageCounter').textContent(),'4 / 61','the selected page is restored when reopening');for(let i=0;i<4;i++){await swipeEncounter(p,'up');await p.waitForFunction(n=>document.querySelector('#bossStageCounter')?.textContent===`${n} / 61`,5+i)}assert.equal(await p.evaluate(()=>BUDMORI.sim.farmBossProgress.selections.find(entry=>entry.stage===5)?.species),selectedStage5,'visited boss species remains stable');for(let i=0;i<4;i++){await swipeEncounter(p,'down');await p.waitForFunction(n=>document.querySelector('#bossStageCounter')?.textContent===`${n} / 61`,7-i)}await p.locator('#bossEncounterChallenge').click();await p.waitForFunction(()=>BUDMORI.sim.scene==='raid'&&BUDMORI.sim.raidRosters.length===1);assert.equal(await p.evaluate(()=>BUDMORI.runtime.presentation(performance.now()).boss.stage),4,'the pinned FarmSession render capture carries the selected stage');assert.equal(await p.locator('#deploymentCards').count(),0,'troop selection cards are removed');await p.evaluate(()=>{history.pushState(null,'','#/abilities');dispatchEvent(new PopStateEvent('popstate'))});assert.equal(new URL(p.url()).hash,'#/raid','a stale/direct abilities route cannot bypass the disabled Raid tab');assert.equal(await p.locator('#abilityPanel').isVisible(),false);const order=await p.evaluate(()=>{const Garden=BUDMORI.sim.constructor,entries=BUDMORI.sim.raidRoster('solo').troops.map(t=>[t.farmId,t.species,t.tier]),a=Garden.createRaidBattle(733,['solo']),b=Garden.createRaidBattle(733,['solo']);a.registerRaidRoster('solo',entries);b.registerRaidRoster('solo',entries);return{first:a.raidRoster('solo').troops.map(t=>[t.farmId,t.tier]),second:b.raidRoster('solo').troops.map(t=>[t.farmId,t.tier])}});assert.deepEqual(order.first,order.second,'seed and owner reproduce the same within-tier order');assert(order.first.every((entry,i)=>!i||entry[1]>=order.first[i-1][1]),'lower tiers deploy before higher tiers');
 await scatterInput(p,'mouse');await buttonDeployment(p,'mouse');
 await p.waitForFunction(()=>BUDMORI.sim.units.some(u=>u.dropLanded),{},{timeout:5000});await p.waitForFunction(()=>BUDMORI.sim.boss.hp<BUDMORI.sim.boss.maxHp,{},{timeout:25000});assert(await p.evaluate(()=>BUDMORI.sim.notices.some(e=>e.kind==='drop-land')&&BUDMORI.sim.notices.some(e=>e.kind==='boss-hit')));check('Dedicated deployment preserves gravity landing and shared automatic boss battle');
 await render(p,'pc-battle');await armyScenarios(p);
 await returnFromHeldInput(p,'mouse');assert.equal(await p.evaluate(()=>BUDMORI.sim.localScatter.active),false,'Raid return leaves no held circle in the Farm');await p.waitForFunction(()=>BUDMORI.renderer.scene==='farm');assert.deepEqual(await p.evaluate(()=>BUDMORI.renderer.project(0,0)),report.scatter.find(s=>s.pointerType==='mouse'&&s.scene==='farm').camera.initial,'Raid return restores the Farm camera center');await goHome(p);const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('bloom-weapon-cards-v4')));assert.equal(saved.world.playerProgression.farmUpgrades.food,1);assert(saved.world.metrics.merges>0);await p.reload();await p.waitForFunction(()=>window.BUDMORI);await p.locator('#continueGame').click();assert.equal(await p.evaluate(()=>BUDMORI.sim.playerProgression.farmUpgrades.food),1);check('Boss return → home save → browser reload → continue retains army and investment');
 await openMenuTab(p,'help');assert.equal(new URL(p.url()).hash,'#/help');await p.reload();await p.waitForFunction(()=>window.BUDMORI);assert(await p.locator('#helpPanel').isVisible());await closeMenu(p);await p.goBack();assert(await p.locator('#helpPanel').isVisible());await p.goForward();assert.equal(await p.locator('#helpPanel').isVisible(),false);check('Help direct route, F5, close, back and forward agree');await openMenuTab(p,'growth');await p.evaluate(()=>{history.pushState(null,'','#/help');dispatchEvent(new PopStateEvent('popstate'))});await closeMenu(p);assert.equal(await p.evaluate(()=>BUDMORI.runtime.paused),false);await p.goto('about:blank');await p.goBack();await p.waitForFunction(()=>window.BUDMORI);if(await p.locator('#startScreen').isVisible())await p.locator('#continueGame').click();assert.equal(await p.evaluate(()=>BUDMORI.runtime.closed),false);check('Panel-to-panel route restores prior pause; browser Back revives a live session');await clean(p);await c.close();
 const mobile=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true,isMobile:true}),m=await open(mobile);await m.locator('#newGame').tap();await m.locator('#feed').tap();await scatterInput(m,'touch');await m.evaluate(()=>{BUDMORI.runtime.paused=true;const w=BUDMORI.sim;while(w.units.length<40){const i=w.units.length;w.spawn(0,1,-7+(i%8)*2,-3.2+Math.floor(i/8)*1.6)}w.units.forEach((u,i)=>{u.x=-7+(i%8)*2;u.y=-3.2+Math.floor(i/8)*1.6;u.home={x:u.x,y:u.y}});if(!BUDMORI.storage.save(w))throw Error('could not save a valid mobile Raid roster')});await m.locator('#raid').tap();await m.locator('#bossEncounterChallenge').tap();await m.waitForFunction(()=>BUDMORI.sim.scene==='raid'&&BUDMORI.sim.raidRosters.length===1);const menuBefore=await m.evaluate(()=>({units:BUDMORI.sim.units.length,remaining:BUDMORI.sim.raidRemaining('solo')}));await m.locator('#gameMenu').tap();await m.locator('#menuTabHelp').tap();await m.locator('#helpPanel').waitFor({state:'visible'});assert.equal(await m.locator('#menuTabGrowth').isDisabled(),true,'farm growth is unavailable during a Raid');assert.equal(await m.locator('#menuTabAbilities').isDisabled(),true,'ability management is unavailable during a Raid');await m.screenshot({path:path.join(out,'mobile-game-menu.png')});await m.touchscreen.tap(2,Math.floor((await m.evaluate(()=>innerHeight))/2));await m.locator('#gameMenuOverlay').waitFor({state:'hidden'});assert.deepEqual(await m.evaluate(()=>({units:BUDMORI.sim.units.length,remaining:BUDMORI.sim.raidRemaining('solo')})),menuBefore,'tapping outside settings closes it without a pass-through Raid deployment');await m.locator('#gameMenu').tap();await m.locator('#menuTabHelp').tap();await m.locator('#gameMenuClose').tap();await m.locator('#gameMenuOverlay').waitFor({state:'hidden'});assert.deepEqual(await m.evaluate(()=>({units:BUDMORI.sim.units.length,remaining:BUDMORI.sim.raidRemaining('solo')})),menuBefore,'closing settings by touch does not deploy a troop');assert.equal(await m.evaluate(()=>BUDMORI.sim.raidRoster('solo').troops.length),40,'mobile deployment uses only units present in the Farm');await m.evaluate(()=>BUDMORI.runtime.paused=false);await scatterInput(m,'touch');await buttonDeployment(m,'touch');await m.waitForFunction(()=>BUDMORI.sim.notices.some(e=>e.kind==='drop-land'),{},{timeout:8000});await m.waitForFunction(()=>BUDMORI.sim.notices.some(e=>e.kind==='boss-hit'),{},{timeout:25000});await render(m,'mobile-battle');await seedScenarios(m,'mobile');await returnFromHeldInput(m,'touch');assert.equal(await m.evaluate(()=>BUDMORI.sim.localScatter.active),false,'touch Raid return leaves no held circle in the Farm');await m.waitForFunction(()=>BUDMORI.renderer.scene==='farm');assert.deepEqual(await m.evaluate(()=>BUDMORI.renderer.project(0,0)),report.scatter.find(s=>s.pointerType==='touch'&&s.scene==='farm').camera.initial,'touch Raid return restores the Farm camera center');await openMenuTab(m,'growth');await render(m,'mobile-growth');await closeMenu(m);await m.setViewportSize({width:390,height:568});await openMenuTab(m,'help');await render(m,'mobile-short-help');await closeMenu(m);await clean(m);check('390px native touch with held local scatter, dedicated deployment, airborne landing, growth, short viewport help and real GPU render');await mobile.close();
}
async function scatterInput(p,pointerType){
 await p.waitForFunction(()=>!BUDMORI.runtime.pending.length);await p.evaluate(()=>new Promise(requestAnimationFrame));assert.equal(await p.locator('#scatterMode').getAttribute('aria-pressed'),'true','single-pointer scatter is the selected default mode');
 const scene=await p.evaluate(()=>BUDMORI.sim.scene),center=await worldClient(p,-2,0),near=await worldClient(p,-1.9,0),middle=await worldClient(p,.2,0),far=await worldClient(p,4,0),secondary=await worldClient(p,3,-2);
 const before=await p.evaluate(()=>{const runtime=BUDMORI.runtime;window.scatterProbe={queue:runtime.queue,commands:[],pointerId:null};runtime.queue=function(type,args){scatterProbe.commands.push(type);return scatterProbe.queue.call(this,type,args)};document.querySelector('canvas').addEventListener('pointerdown',event=>{scatterProbe.pointerId=event.pointerId},{once:true});return{manual:BUDMORI.foodFeel.counts.manual,remaining:BUDMORI.sim.raidRemaining('solo'),min:BUDMORI.CONFIG.scatter.minRadius,max:BUDMORI.CONFIG.scatter.maxRadius}});
 assert(Math.abs(before.min-1.22)<1e-8&&Math.abs(before.max-3.05)<1e-8,'held-circle size is clamped to the approved 1.22–3.05 world-unit range');
 const cdp=pointerType==='touch'?await p.context().newCDPSession(p):null;let touchActive=false;
 const start=async()=>{if(cdp){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:11,...center}]});touchActive=true}else{await p.mouse.move(center.x,center.y);await p.mouse.down()}await p.waitForFunction(()=>BUDMORI.sim.localScatter.active)};
 const move=async(point,extra=false)=>{if(cdp)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:11,...point},...(extra?[{id:22,...secondary}]:[])]});else await p.mouse.move(point.x,point.y)};
 const end=async()=>{if(cdp){await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});touchActive=false}else await p.mouse.up();await p.waitForFunction(()=>!BUDMORI.sim.localScatter.active)};
 const state=()=>p.evaluate(()=>({...BUDMORI.sim.localScatter}));
 try{
  await start();const initial=await state();assert.equal(initial.radius,before.min);assert(Math.hypot(initial.x+2,initial.y)<.08,'the circle starts at the actual canvas press');
  await move(near);assert.equal((await state()).radius,before.min,'a short drag retains the minimum radius');
  if(cdp){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:11,...near},{id:22,...secondary}]});const extra=await state();assert.equal(extra.x,initial.x);assert.equal(extra.y,initial.y);assert.equal(extra.generation,initial.generation,'a second finger cannot own or recreate the circle')}
  await move(middle,!!cdp);const expanded=await state();assert(Math.abs(expanded.radius-2.2)<.1,'drag distance grows the radius in world units');
  await move(far,!!cdp);const maximum=await state();assert.equal(maximum.x,initial.x,'dragging keeps the initial center fixed');assert.equal(maximum.y,initial.y);assert.equal(maximum.radius,before.max,'a long drag clamps at the maximum radius');assert(Math.abs(Math.hypot(maximum.handleX-maximum.x,maximum.handleY-maximum.y)-before.max)<.01,'the drag handle stays on the clamped edge');
  await render(p,pointerType+'-'+scene+'-scatter-held');
  if(cdp){await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[{id:22,...secondary}]});await p.waitForFunction(()=>!BUDMORI.sim.localScatter.active);await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:22,x:secondary.x+12,y:secondary.y}]});assert.equal((await state()).active,false,'remaining secondary touch cannot take over after the owner releases')}
  await end();
  await start();if(cdp){await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});touchActive=false}else await p.evaluate(()=>document.querySelector('canvas').dispatchEvent(new PointerEvent('pointercancel',{pointerId:scatterProbe.pointerId,bubbles:true})));
  await p.waitForFunction(()=>!BUDMORI.sim.localScatter.active);if(!cdp)await p.mouse.up();
  if(!cdp){
   await start();await p.evaluate(()=>document.querySelector('canvas').releasePointerCapture(scatterProbe.pointerId));await p.mouse.move(near.x,near.y);await p.waitForFunction(()=>!BUDMORI.sim.localScatter.active);await p.mouse.up();
   await start();await p.evaluate(()=>window.dispatchEvent(new Event('blur')));await p.waitForFunction(()=>!BUDMORI.sim.localScatter.active);await p.mouse.up();
   await start();await p.locator('#gameMenu').press('Enter');await p.locator('#gameMenuOverlay').waitFor({state:'visible'});assert.equal((await state()).active,false,'opening settings immediately clears the held circle');await p.mouse.up();await closeMenu(p);assert.equal((await state()).active,false,'closing settings does not restore a stale hold');
  }
  await start();await p.locator('#panMode').press('Enter');assert.equal((await state()).active,false,'changing to view movement clears the current scatter gesture');await end();assert.equal(await p.locator('#panMode').getAttribute('aria-pressed'),'true');assert.equal(await p.locator('#scatterMode').getAttribute('aria-pressed'),'false');
  const camera=await p.evaluate(()=>({initial:BUDMORI.renderer.project(0,0),scale:BUDMORI.renderer.scale})),panEnd={x:center.x+72,y:center.y+40};
  if(cdp){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:11,...center}]});touchActive=true;await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:11,...panEnd}]})}else{await p.mouse.move(center.x,center.y);await p.mouse.down();await p.mouse.move(panEnd.x,panEnd.y,{steps:4})}
  camera.moved=await p.evaluate(()=>BUDMORI.renderer.project(0,0));const pan=await p.evaluate(()=>({position:BUDMORI.renderer.cameraPan,limits:BUDMORI.renderer.panLimits}));assert(pan.position.x>=pan.limits.minX&&pan.position.x<=pan.limits.maxX&&pan.position.y>=pan.limits.minY&&pan.position.y<=pan.limits.maxY,'dragged camera stays within the content bounds');assert([camera.moved.x,camera.moved.y].every(Number.isFinite),'view dragging keeps projection finite');if(scene==='farm')assert(Math.hypot(camera.moved.x-camera.initial.x,camera.moved.y-camera.initial.y)>1,'view mode actually pans the expanded Farm');assert.equal(await p.evaluate(()=>BUDMORI.renderer.scale),camera.scale,'panning preserves the authored scene zoom');assert.equal((await state()).active,false,'view movement never creates a scatter circle');
  await p.locator('#scatterMode').press('Enter');assert.equal(await p.locator('#scatterMode').getAttribute('aria-pressed'),'true');await move({x:panEnd.x+20,y:panEnd.y+10});assert.deepEqual(await p.evaluate(()=>BUDMORI.renderer.project(0,0)),camera.moved,'changing back to scatter cancels the prior pan pointer');assert.equal((await state()).active,false,'switching modes requires a fresh press before scattering');await end();
  await p.evaluate(()=>BUDMORI.renderer.resetPan());assert.deepEqual(await p.evaluate(()=>BUDMORI.renderer.project(0,0)),camera.initial,'resetPan restores the authored center');
  const after=await p.evaluate(()=>({commands:scatterProbe.commands,manual:BUDMORI.foodFeel.counts.manual,remaining:BUDMORI.sim.raidRemaining('solo'),legacy:['cast','moveTarget','aim'].some(k=>Object.hasOwn(BUDMORI.sim,k))}));
  assert.deepEqual(after.commands,[],'the local circle does not queue deployment, feeding, or persistent movement commands');assert.equal(after.manual,before.manual,'canvas holds never trigger manual feeding');assert.equal(after.remaining,before.remaining,'canvas holds do not consume the Raid roster');assert.equal(after.legacy,false);
  report.scatter??=[];report.scatter.push({pointerType,scene,initial,expanded,maximum,camera});check(pointerType+' '+scene+' held circle and view modes: fixed center, clamped drag radius, unchanged zoom, mode-switch cleanup, release and cancellation'+(!cdp?', lost capture, blur and menu clearing':''));
 }finally{if(cdp){if(touchActive)await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await cdp.detach()}else await p.mouse.up();await p.evaluate(()=>{BUDMORI.runtime.queue=scatterProbe.queue;delete window.scatterProbe})}
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
    const action=w.boss.patternRuntime.active,windup=action?.phase==='windup';w.step(1/120);
    if(windup&&action?.phase==='windup')windupSafe &&= !w.notices.some(e=>e.sequence>lastSequence&&e.kind==='unit-hit'&&e.attackKind?.startsWith('attack.'));
    chased ||= (w.boss.x-before.x)*quadrant[0]>.25&&(w.boss.y-before.y)*quadrant[1]>.25;maxZ=Math.max(maxZ,...w.units.map(u=>u.z));
    for(const e of w.notices){if(e.sequence<=lastSequence)continue;lastSequence=e.sequence;if(e.kind==='unit-hit'){hit=true;if(e.attackKind==='attack.front-slam')basic=true;const key=e.attackId+':'+e.unit;uniqueHits &&= Number.isInteger(e.attackId)&&e.attackId>0&&!hits.has(key);hits.add(key);}if(e.kind==='unit-land')land=true;if(e.kind==='unit-hit'&&['attack.sweep-360','attack.fan-sweep'].includes(e.attackKind))sweep=true;if(e.kind==='boss-pattern-prepare')prepared=true;if(e.kind==='boss-pattern-launch')launched=true;}
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
  await p.evaluate(kind=>{const r=BUDMORI.runtime,w=new r.world.constructor(818);globalThis.beforeOutcomeWorld=r.world;if(kind==='victory')w.spawn(0,1,0,0);w.setScene('raid');if(kind==='victory'){w.units=w.units.slice(0,3);w.units.forEach((u,i)=>{u.hp=i===2?0:100000;u.down=i===2?1:0;u.z=u.vz=u.vx=u.vy=0;u.dropLanded=true;u.seed=1+i*1.7});w.boss.hp=1}else for(const u of w.units)u.hp=0;for(let i=0;i<2400&&w.encounter.outcome==='fighting';i++)w.step(1/120);r.world=w;r.capturePresentation('reset');},outcome);
  await p.waitForFunction(kind=>BUDMORI.sim.encounter.outcome===kind,outcome);await render(p,'pc-'+outcome);if(outcome==='victory'){await p.waitForFunction(()=>{const w=BUDMORI.sim,r=BUDMORI.renderer;return w.units.filter(u=>u.hp>0).every(u=>r.vectorPlayers.get(u.id)?.currentClip==='victory'&&r.vectorPlayers.get(u.id)?.currentExpression==='happy')&&w.units.filter(u=>u.hp<=0).every(u=>r.vectorPlayers.get(u.id)?.currentClip==='death'&&r.vectorPlayers.get(u.id)?.currentExpression==='dead')});const victory=await p.evaluate(()=>{const r=BUDMORI.renderer,w=BUDMORI.sim;return{living:w.units.filter(u=>u.hp>0).map(u=>r.vectorPlayers.get(u.id).getPartPose('body').transform),dead:w.units.filter(u=>u.hp<=0).map(u=>r.vectorPlayers.get(u.id).currentClip)}});assert(victory.living.length>=2&&new Set(victory.living.map(pose=>JSON.stringify(pose))).size>1,'living winners use per-unit staggered SVG bounce phases');assert.deepEqual(victory.dead,['death'],'dead troop keeps its death clip after victory');report.victoryAnimation=victory}await p.locator('#return').click();await p.waitForFunction(()=>BUDMORI.sim.scene==='farm');
  assert(await p.evaluate(()=>BUDMORI.sim.units.every(u=>u.hp>0&&u.down===0)),'farm return restores army after '+outcome);
  await p.evaluate(()=>{BUDMORI.runtime.world=beforeOutcomeWorld;BUDMORI.runtime.capturePresentation('reset')});
 }
 check('Victory and defeat render in product; native return restores farm army');
}
async function seedScenarios(p,label){
 const poses=['idle','windup','active','recover'];
 const speciesCount=await p.evaluate(()=>BUDMORI.CONFIG.unit.speciesCount);
 const assets=await p.evaluate(()=>[...BUDMORI.renderer.vectorAssets].map(([species,record])=>({species,clips:Object.keys(record.compiled.metadata.clips),expressions:Object.keys(record.compiled.metadata.expressions)})));
 assert.equal(assets.length,speciesCount,'all registered troop species use compiled SVG assets');assert.deepEqual(assets.map(a=>a.species),Array.from({length:speciesCount},(_,index)=>index),'every persistent species ID has one source vector asset');assert(assets.every(a=>['idle','walk','windup','fire','recover','hit','airborne','landing','death','victory'].every(name=>a.clips.includes(name))&&['neutral','happy','focused','attack','surprised','hurt','hungry','dead'].every(name=>a.expressions.includes(name))));
 report.vectorSpecies=assets;
 const vectorQuality=await p.evaluate(()=>[...BUDMORI.renderer.vectorAssets].map(([species,troop])=>{
  const boss=BUDMORI.renderer.bossAssets.get(species===3?'chestnut':`species-${species}`),quality=record=>({curveSegments:record?.compiled.compilerOptions.curveSegments,strokeArcDivisions:record?.compiled.compilerOptions.strokeArcDivisions});
  return{species,troop:quality(troop),boss:quality(boss),separate:!!boss&&boss.compiled!==troop.compiled,source:boss?.compiled.sourcePath,sameSource:boss?.compiled.sourceSha256===troop.compiled.sourceSha256};
 }));
 for(const profile of vectorQuality){assert.deepEqual(profile.troop,{curveSegments:2,strokeArcDivisions:2},'small troop quality stays 2/2');assert.deepEqual(profile.boss,{curveSegments:4,strokeArcDivisions:2},`giant species ${profile.species} uses 4/2`);assert(profile.separate,'giants cannot reuse a low-quality troop compiled record');if(profile.species===3)assert.equal(profile.source,'assets/bosses/chestnut.svg');else assert(profile.sameSource,'shared giant artwork keeps the same original SVG');}
 report.vectorQuality=vectorQuality;check('All nine giant SVGs use separate startup-compiled 4/2 meshes; troops remain 2/2 and chestnut retains its dedicated art');
 await p.evaluate(()=>{globalThis.seedOriginal={world:BUDMORI.runtime.world,paused:BUDMORI.runtime.paused};BUDMORI.runtime.paused=true;});
 try{
  for(const scene of ['farm','raid']){
   await p.evaluate(scene=>{const r=BUDMORI.runtime,w=new r.world.constructor(623);w.units=[];w.food=[];w.effects=[];w.projectiles=[];w.setScene(scene);w.time=1.25;if(scene==='raid'){w.boss.x=14;w.boss.y=8;}
    for(let species=0;species<BUDMORI.CONFIG.unit.speciesCount;species++)for(let tier=1;tier<=6;tier++){const u=w.spawn(species,tier,(tier-3.5)*2.3,(species-(BUDMORI.CONFIG.unit.speciesCount-1)/2)*2);Object.assign(u,{meals:3,growth:3,angle:Math.PI*.15,z:0,vx:0,vy:0,vz:0});}
    r.world=w;r.capturePresentation('reset');
   },scene);
   for(const phase of poses){
    await p.evaluate(phase=>{for(const u of BUDMORI.sim.units){u.ability.phase=phase;u.ability.elapsed=phase==='idle'?0:.12;}BUDMORI.runtime.capturePresentation('reset')},phase);
    await p.evaluate(()=>new Promise(requestAnimationFrame));await render(p,label+'-seed-'+scene+'-'+phase);const native=await p.evaluate(()=>({players:BUDMORI.renderer.vectorPlayers.size,clips:[...BUDMORI.renderer.vectorPlayers.values()].map(v=>v.currentClip),time:BUDMORI.renderer.displayTimeMs}));assert.equal(native.players,speciesCount*6,'all registered species/tier combinations render through native vector players');assert(native.clips.every(clip=>clip===({idle:'idle',windup:'windup',active:'fire',recover:'recover'})[phase]));assert(native.time>0);
    const visible=await p.evaluate(()=>{const r=BUDMORI.renderer;return BUDMORI.sim.units.map(u=>{const q=r.project(u.x,u.y,u.z),d=r.pixelRatio;return {species:u.species,tier:u.tier,radius:u.radius,x:q.x/d,y:q.y/d,visible:q.x>=0&&q.y>=0&&q.x<r.canvas.width&&q.y<r.canvas.height};});});
    assert(visible.every(u=>u.visible),'seed grid inside actual '+scene+' viewport');report.seedGrid??=[];report.seedGrid.push({label,scene,phase,units:visible});
   }
   if(scene==='farm'){
    const mergeSetup=await p.evaluate(()=>{const r=BUDMORI.runtime,w=new r.world.constructor(964);w.units=[];w.food=[];w.effects=[];w.projectiles=[];w.nextId=900000000;w.mode='merge';
     w.spawn(0,5,0,0);w.spawn(0,5,.08,0);w.spawn(0,5,.16,0);w.spawn(0,5,.24,0);w.spawn(0,5,.32,0);w.spawn(0,5,8,0);
     for(const unit of w.units){unit.growth=3;unit.growthElapsed=unit.growthDuration;unit.meals=1;unit.cooldown=0;unit.vx=unit.vy=unit.vz=0;unit.z=0;}
     w.selectMergeTask();const ids=[...w.mergeTask.materialIds];ids.map(id=>w.units.find(unit=>unit.id===id)).forEach((unit,index)=>{unit.x=index*.04;unit.y=0});
     if(!w.resolveMergeTaskAfterMovement())throw Error('configured five-material Mythic grade merge did not begin');
     const output=w.units.find(unit=>unit.tier===6);
     r.world=w;BUDMORI.renderer.vectorPlayers.clear();r.capturePresentation('reset');return{resultId:output.id,resultTier:output.tier,materials:ids.length,delays:w.effects.filter(effect=>effect.kind==='merge-material').map(effect=>effect.delay),phase:w.mergeTask.phase};
    });
    assert.equal(mergeSetup.resultTier,6,'five T5 materials create a T6 Mythic');assert.equal(mergeSetup.materials,5);assert.equal(mergeSetup.delays.length,5);assert.equal(mergeSetup.phase,'animation');assert(mergeSetup.delays[0]<mergeSetup.delays[1]&&mergeSetup.delays[1]<mergeSetup.delays[2]&&mergeSetup.delays[2]<mergeSetup.delays[3]&&mergeSetup.delays[3]<mergeSetup.delays[4],'five merge particles are staggered in source order');
    const presentedSequence=await p.evaluate(()=>{
     const view=BUDMORI.runtime.presentation(performance.now());
     const materials=view.effects.filter(effect=>effect.kind==='merge-material').map(({x,y,targetX,targetY,delay,span,sequenceIndex,sequenceCount})=>({x,y,targetX,targetY,delay,span,sequenceIndex,sequenceCount}));
     const result=view.effects.find(effect=>effect.kind==='merge');
     return{materials,result:result&&{delay:result.delay,span:result.span}};
    });
    assert.equal(presentedSequence.materials.length,5,'all five material travel effects reach the presentation snapshot');
    assert(presentedSequence.materials.every((effect,index)=>Number.isFinite(effect.targetX)&&Number.isFinite(effect.targetY)&&Number.isFinite(effect.delay)&&Number.isFinite(effect.span)&&effect.span>0&&effect.sequenceIndex===index&&effect.sequenceCount===5),'presentation preserves all five material targets, durations, and sequence indexes');
    assert(Number.isFinite(presentedSequence.result?.delay)&&Number.isFinite(presentedSequence.result?.span)&&presentedSequence.result.delay>presentedSequence.materials.at(-1).delay,'result burst is delayed until after all material paths');
    await p.evaluate(()=>new Promise(requestAnimationFrame));await render(p,label+'-grade-merge-start');
    const startHidden=await p.evaluate(id=>!BUDMORI.renderer.vectorPlayers.has(id),mergeSetup.resultId);assert(startHidden,'result stays hidden while material travel starts');
    await p.evaluate(()=>{BUDMORI.sim.step(.3);BUDMORI.runtime.capturePresentation('reset')});await render(p,label+'-grade-merge-sequence');
    const middle=await p.evaluate(id=>({hidden:!BUDMORI.renderer.vectorPlayers.has(id),phase:BUDMORI.sim.mergeTask?.phase,active:BUDMORI.sim.effects.filter(effect=>effect.kind==='merge-material').length}),mergeSetup.resultId);
    assert(middle.hidden&&middle.phase==='animation'&&middle.active>0,'intermediate material travel renders before the output');
    await p.evaluate(()=>{BUDMORI.sim.step(.6);BUDMORI.runtime.capturePresentation('reset')});await render(p,label+'-grade-merge-result');
    assert(await p.evaluate(id=>BUDMORI.renderer.vectorPlayers.has(id),mergeSetup.resultId),'result unit appears after the sequential merge animation');
   }
   if(scene==='raid'){
    await p.evaluate(()=>{for(const u of BUDMORI.sim.units){u.hp=0;u.down=1;u.ability.phase='recover';u.z=0;u.vx=u.vy=u.vz=0;}BUDMORI.runtime.capturePresentation('reset')});await p.evaluate(()=>new Promise(requestAnimationFrame));await render(p,label+'-seed-corpses');
   }
  }
 }finally{await p.evaluate(()=>{const r=BUDMORI.runtime;r.world=seedOriginal.world;r.paused=seedOriginal.paused;r.capturePresentation('reset');});}
 check(label+' '+speciesCount+' registered species × tiers1–6 × four attack poses plus five-material Mythic animation');
}
async function armyScenarios(p){
 const evidence=await p.evaluate(()=>{
  const Garden=BUDMORI.sim.constructor,specs=BUDMORI.ATTACK_TYPES;
  const target=(species,x)=>{const w=new Garden(501);w.units=[];w.spawn(species,1,x,0);w.setScene('raid');Object.assign(w.units[0],{x,y:0,z:0,vx:0,vy:0,vz:0});w.boss.hp=w.boss.maxHp=1e6;return w;};
  const ranges=[];
  for(let species=0;species<BUDMORI.CONFIG.unit.speciesCount;species++){
   const initial=4.4+specs[species].range+3,w=target(species,initial),u=w.units[0];let prepare=null;
   for(let i=0;i<1800&&!prepare;i++){w.step(1/120);prepare=w.combatLog.find(e=>e.kind==='prepare');}
   const distance=prepare?Math.hypot(prepare.x-w.boss.x,prepare.y-w.boss.y):null;let minDistance=Math.hypot(u.x,u.y),lateral=0;
   for(let i=0;i<600;i++){w.step(1/120);minDistance=Math.min(minDistance,Math.hypot(u.x,u.y));lateral=Math.max(lateral,Math.abs(u.y));}
   ranges.push({species,distance,stand:w.boss.radius+specs[species].range,minDistance,lateral,damaged:w.boss.hp<w.boss.maxHp});
  }
  const close=target(1,5.1),lob=close.units[0];for(let i=0;i<1800&&!close.combatLog.some(e=>e.kind==='prepare');i++)close.step(1/120);const prep=close.combatLog.find(e=>e.kind==='prepare');
  const retreat={distance:prep?Math.hypot(prep.x,prep.y):null,stand:close.boss.radius+specs[1].range,x:lob.x};
  const w=new Garden(829);w.units=[];const dead=w.spawn(0,1,5,0),alive=w.spawn(1,1,12,0);w.setScene('raid');Object.assign(dead,{x:5,y:0,hp:8,z:0,vx:0,vy:0,vz:0});Object.assign(alive,{x:12,y:0,hp:1e5,z:0,vx:0,vy:0,vz:0});
  let airborne=false,landed=false;for(let i=0;i<1800;i++){w.step(1/120);if(dead.hp===0&&dead.z>.1)airborne=true;if(dead.hp===0&&w.notices.some(e=>e.kind==='unit-land'&&e.unit===dead.id))landed=true;}
  const corpse={dead:dead.hp===0,airborne,landed,z:dead.z};
  // Explicit overlap fixture: a settled corpse cannot be displaced by a boss or live unit.
  const at={x:dead.x,y:dead.y};Object.assign(w.boss,{x:dead.x,y:dead.y});Object.assign(alive,{x:dead.x+.01,y:dead.y,z:0,vx:0,vy:0,vz:0});for(let i=0;i<240;i++)w.step(1/120);corpse.drift=Math.hypot(dead.x-at.x,dead.y-at.y);
  w.beginBossPattern('attack.front-slam',dead);w.step(1/120);corpse.retargeted=w.boss.patternRuntime.active?.targetId!==dead.id;
  w.setScene('farm');corpse.recovered=w.units.every(u=>u.hp>0&&u.down===0&&u.z===0);
  const h=new Garden(307);h.units=[];for(let tier=1;tier<=3;tier++)h.spawn(tier-1,tier,(tier-2)*6,0);h.setScene('raid');const max=h.units.reduce((n,u)=>n+u.hp,0);h.units[0].hp=0;h.units[1].hp=0;h.units[2].hp=17;const before={...h.armyHealth},count=h.units.length;h.starter=59.99;h.step(.02);const after={...h.armyHealth},spawned=h.units.length-count;
  return {ranges,retreat,corpse,health:{max,before,after,spawned}};
 });
 for(const r of evidence.ranges){assert(r.distance!==null&&Math.abs(r.distance-r.stand)<=.65,'species '+r.species+' attacks within own range');assert(r.damaged,'species '+r.species+' real impact');assert(r.lateral<.15,'species '+r.species+' has no forced rotating slot');if(r.species===1)assert(r.minDistance>=r.stand-.65,'lob holds firing range');}
 assert(evidence.retreat.distance!==null&&evidence.retreat.distance>=evidence.retreat.stand-.65&&evidence.retreat.x>5.1,'close lob retreats before firing');
 const corpse=evidence.corpse;assert(corpse.dead&&corpse.airborne&&corpse.landed&&corpse.z===0,'lethal hit corpse completes airborne landing');assert(corpse.drift<.05,'settled corpse remains at landing under body overlap');assert(corpse.retargeted&&corpse.recovered,'corpse excluded from targets and restored on return');
 const h=evidence.health;assert.deepEqual(h.before,{current:17,max:h.max,living:1,total:3});assert.equal(h.after.max,h.max);assert.equal(h.after.current,17);assert.equal(h.after.total,3);assert.equal(h.after.living,1);assert.equal(h.spawned,0);report.army=evidence;
  const wasPaused=await p.evaluate(()=>{const r=BUDMORI.runtime,paused=r.paused;r.paused=true;return paused;});
  const hud=await p.evaluate(async()=>{
   const r=BUDMORI.renderer,draw=r.render;let display=null;r.render=function(view,...args){display=view;return draw.call(this,view,...args)};
   try{await new Promise(requestAnimationFrame)}finally{r.render=draw}
   if(!display)throw Error('Rendered view was not captured');
   const army=display.units.reduce((sum,u)=>({current:sum.current+Math.max(0,Math.min(u.maxHp,u.hp)),max:sum.max+u.maxHp,living:sum.living+(u.hp>0?1:0),total:sum.total+1}),{current:0,max:0,living:0,total:0});
   return{rawArmy:BUDMORI.sim.armyHealth,army,boss:display.boss.hp,text:document.querySelector('#allyHealthText').textContent,bossText:document.querySelector('#bossHealthText').textContent,bar:document.querySelector('#allyHealth').parentElement.getBoundingClientRect().width,now:Number(document.querySelector('#allyHealth').getAttribute('aria-valuenow')),max:Number(document.querySelector('#allyHealth').getAttribute('aria-valuemax'))};
  });
 await p.evaluate(paused=>{BUDMORI.runtime.paused=paused},wasPaused);assert(hud.bar>0);assert.equal(hud.now,hud.army.current);assert.equal(hud.max,hud.army.max);assert(hud.text.includes(String(Math.ceil(hud.army.current)))&&hud.text.includes(String(Math.ceil(hud.army.max))));assert(hud.bossText.includes(String(Math.ceil(hud.boss))));check('Species hold actual firing range; corpses land, stay nonblocking, leave targets and recover; health HUD matches the same sampled display time, distinct from live simulation health');
}

async function victory(){
 const c=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true}),p=await open(c);
 await p.locator('#newGame').tap();await p.evaluate(()=>{const seed=4463;BUDMORI.sim.seed=seed;BUDMORI.sim.rng=new BloomGamekitDeterministic.SeededPRNG(seed)});await p.waitForFunction(()=>BUDMORI.sim.scene==='farm'&&BUDMORI.sim.units.length===2&&BUDMORI.runtime.tick>5,{},{timeout:20000});
 const start=await p.evaluate(()=>({units:BUDMORI.sim.units.map(u=>({species:u.species,tier:u.tier,mature:u.mature,meals:u.meals})),width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth}));
 assert.equal(start.units.length,2);assert(start.units.every(u=>u.species===0&&u.tier===1&&u.mature&&u.meals===0));assert.equal(start.width,390);assert.equal(start.height,844);assert.equal(start.overflow,false);
 const setup=await p.evaluate(()=>{const r=BUDMORI.runtime,w=new r.world.constructor(818);globalThis.beforeVictoryWorld=r.world;w.spawn(0,1,0,0);w.setScene('raid');w.units=w.units.slice(0,3);w.units.forEach((u,i)=>{u.hp=i===2?0:100000;u.down=i===2?1:0;u.z=u.vz=u.vx=u.vy=0;u.dropLanded=true;u.seed=1+i*1.7});const roster=w.raidRoster('solo');roster.lastDeploySequence=roster.troops.filter(t=>t.deployed).length;w.boss.hp=1;for(let i=0;i<2400&&w.encounter.outcome==='fighting';i++)w.step(1/120);r.world=w;r.capturePresentation('reset');return{outcome:w.encounter.outcome,remaining:w.raidRemaining('solo'),sequence:roster.lastDeploySequence}});
 assert.equal(setup.outcome,'victory');assert.equal(setup.remaining,0);assert.equal(setup.sequence,3,'the synthetic victory battle has a valid deployed roster sequence');
 await p.waitForFunction(()=>BUDMORI.sim.units.filter(u=>u.hp>0).every(u=>BUDMORI.renderer.vectorPlayers.get(u.id)?.currentClip==='victory'&&BUDMORI.renderer.vectorPlayers.get(u.id)?.currentExpression==='happy')&&BUDMORI.sim.units.filter(u=>u.hp<=0).every(u=>BUDMORI.renderer.vectorPlayers.get(u.id)?.currentClip==='death'&&BUDMORI.renderer.vectorPlayers.get(u.id)?.currentExpression==='dead'),{},{timeout:15000});
 const victory=await p.evaluate(()=>({outcome:BUDMORI.sim.encounter.outcome,units:BUDMORI.sim.units.map(u=>({hp:u.hp,clip:BUDMORI.renderer.vectorPlayers.get(u.id)?.currentClip,expression:BUDMORI.renderer.vectorPlayers.get(u.id)?.currentExpression})),remainingText:document.querySelector('#raidRemaining').textContent,errorVisible:!document.querySelector('#error').hidden}));
 assert.equal(victory.outcome,'victory');assert.equal(victory.units.filter(u=>u.hp>0).length,2);assert.deepEqual(victory.units.filter(u=>u.hp<=0).map(u=>u.clip),['death']);assert(!victory.remainingText.includes('NaN'));assert.equal(victory.errorVisible,false);await p.screenshot({path:path.join(out,'mobile-victory.png')});
 await p.locator('#return').tap();await p.waitForFunction(()=>BUDMORI.sim.scene==='farm',{},{timeout:15000});const returned=await p.evaluate(()=>({count:BUDMORI.sim.units.length,alive:BUDMORI.sim.units.every(u=>u.hp>0&&u.down===0)}));assert.equal(returned.count,2);assert.equal(returned.alive,true);await clean(p);await c.close();report.victory={start,setup,victory,returned};check('Mobile farm starts with two peas; victory/death animations render; battle return restores the two-unit farm');
}
async function save(){
 const c=await browser.newContext({viewport:{width:1280,height:800}});await c.addInitScript(()=>localStorage.setItem('bloom-weapon-cards-v3',JSON.stringify({productVersion:'0.3.0',compatibility:'0.3',world:{army:['preserve-me'],cast:null,moveTarget:null}} )));const p=await open(c),old=await p.evaluate(()=>localStorage.getItem('bloom-weapon-cards-v3'));assert(await p.locator('#continueGame').isDisabled());assert((await p.locator('#saveNotice').textContent()).includes('호환'));await p.waitForTimeout(500);assert.equal(await p.evaluate(()=>localStorage.getItem('bloom-weapon-cards-v3')),old);
 await p.goto(base+'/#/raid');await p.waitForFunction(()=>window.BUDMORI);assert(await p.locator('#startScreen').isVisible());assert.equal(await p.evaluate(()=>localStorage.getItem('bloom-weapon-cards-v3')),old);check('Incompatible save with direct raid route redirects home and retains original bytes');
 const download=p.waitForEvent('download');await p.locator('#exportSave').click();const d=await download,raw=await readFile(await d.path(),'utf8');assert.equal(raw,old);check('Incompatible existing save is retained unchanged and exported byte-for-byte');
 await p.locator('#newGame').click();assert.equal(await p.evaluate(()=>localStorage.getItem('bloom-weapon-cards-v3')),old);await p.locator('#cancelNew').click();assert.equal(await p.evaluate(()=>localStorage.getItem('bloom-weapon-cards-v3')),old);await p.locator('#newGame').click();await p.locator('#confirmNew').click();await p.evaluate(()=>{const seed=4463;BUDMORI.sim.seed=seed;BUDMORI.sim.rng=new BloomGamekitDeterministic.SeededPRNG(seed)});await p.waitForFunction(()=>BUDMORI.runtime.tick>3);await goHome(p);const valid=await p.evaluate(()=>localStorage.getItem('bloom-weapon-cards-v4'));assert.equal(JSON.parse(valid).productVersion,PRODUCT_VERSION);check('Only explicit new-garden confirmation replaces the incompatible save');
  await p.locator('#saveFile').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"world":{}}')});assert.equal(await p.evaluate(()=>localStorage.getItem('bloom-weapon-cards-v4')),valid);await p.locator('#saveFile').setInputFiles({name:'valid.json',mimeType:'application/json',buffer:Buffer.from(valid)});await p.locator('#cancelImport').click();assert.equal(await p.evaluate(()=>localStorage.getItem('bloom-weapon-cards-v4')),valid);await p.locator('#saveFile').setInputFiles({name:'valid.json',mimeType:'application/json',buffer:Buffer.from(valid)});await p.locator('#confirmImport').click();await p.locator('#continueGame').click();await goHome(p);const prior=JSON.parse(valid);prior.productVersion='0.4.0';await p.locator('#saveFile').setInputFiles({name:'prior-0.4.0.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(prior))});await p.locator('#confirmImport').click();await p.locator('#continueGame').click();const resumedIds=await p.evaluate(()=>BUDMORI.sim.units.map(u=>u.id));assert(prior.world.units.every(u=>resumedIds.includes(u.id)),'compatible legacy import must preserve every saved troop');assert(resumedIds.length>=prior.world.units.length,'normal farm progression may add troops while a save resumes');check('Compatible 0.4.0 save resumes directly under '+PRODUCT_VERSION);await clean(p);check('Malformed import and cancelled import preserve save; explicit valid import resumes');await c.close();
}
async function migration(){
 const c=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true}),p=await open(c);
 await p.evaluate(()=>{const old=JSON.parse(BUDMORI.storage.encode(new BUDMORI.sim.constructor()));old.productVersion='0.4.7';for(const key of ['farmBossEvent','nextBossEncounterId','bossRewardReceipts','bossRewardWatermarks','playerProgression'])delete old.world[key];const raw=JSON.stringify(old);localStorage.setItem('bloom-weapon-cards-v3',raw);localStorage.removeItem('bloom-weapon-cards-v4')});
 await p.reload();await p.waitForFunction(()=>window.BUDMORI);const old=await p.evaluate(()=>localStorage.getItem('bloom-weapon-cards-v3'));
 assert.equal(await p.locator('#continueGame').isDisabled(),true);assert.equal(await p.locator('#legacySaveNotice').isVisible(),true);assert.equal(await p.locator('#continueLegacyGame').isEnabled(),true);assert.equal(await p.evaluate(()=>localStorage.getItem('bloom-weapon-cards-v4')),null);
 const oldUnits=JSON.parse(old).world.units.map(unit=>unit.id);await p.locator('#continueLegacyGame').tap();assert.equal(await p.locator('#importConfirm').isVisible(),true);assert.equal(await p.evaluate(()=>localStorage.getItem('bloom-weapon-cards-v3')),old);assert.equal(await p.evaluate(()=>localStorage.getItem('bloom-weapon-cards-v4')),null);
 await p.locator('#cancelImport').tap();assert.equal(await p.evaluate(()=>localStorage.getItem('bloom-weapon-cards-v4')),null);await p.locator('#continueLegacyGame').tap();await p.locator('#confirmImport').tap();await p.waitForFunction(()=>BUDMORI.sim.scene==='farm'&&document.querySelector('#startScreen').hidden);
 assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('bloom-weapon-cards-v4')).productVersion),PRODUCT_VERSION);assert.equal(await p.evaluate(()=>localStorage.getItem('bloom-weapon-cards-v3')),old,'the original legacy bytes remain untouched');
 let ids=await p.evaluate(()=>BUDMORI.sim.units.map(unit=>unit.id));assert(oldUnits.every(id=>ids.includes(id)),'explicit legacy import preserves all saved unit IDs');await goHome(p);await p.reload();await p.waitForFunction(()=>window.BUDMORI);await p.locator('#continueGame').tap();ids=await p.evaluate(()=>BUDMORI.sim.units.map(unit=>unit.id));assert(oldUnits.every(id=>ids.includes(id)));assert.equal(new Set(ids).size,ids.length);await clean(p);check('Mobile 0.4 save is detected without writes; explicit confirm copies to isolated 0.5 key; old bytes and unit IDs survive reload');await c.close();
}
async function event(){
 const c=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true}),p=await open(c);
 await p.locator('#newGame').tap();await p.waitForFunction(()=>BUDMORI.runtime.tick>5);
 const dropping=await p.evaluate(()=>{const w=BUDMORI.sim;w.rng=new BloomGamekitDeterministic.SeededPRNG(118);w.foodTaps.remainder=4;w.foodTaps.autoClock=0;if(!w.tapFood('manual'))throw Error('manual food generation was rejected');return {phase:w.farmBossEvent.phase,food:w.food.length,z:w.boss.z,scene:w.scene,running:w.running}});assert.deepEqual(dropping,{phase:'dropping',food:0,z:3,scene:'farm',running:false},'one actual generated food is replaced by a boss without entering global combat');
 await p.waitForFunction(()=>BUDMORI.sim.farmBossEvent.phase==='fighting',{},{timeout:8000});assert.equal(await p.locator('#bossbar').isVisible(),true);assert.equal(await p.locator('#farmControls').isVisible(),false);assert.equal(await p.locator('#bossHealthNote').textContent(),'보스 능력치 고정');
 await p.evaluate(()=>BUDMORI.sim.units.forEach(unit=>{unit.hp=0;unit.down=60}));await p.waitForFunction(()=>BUDMORI.sim.farmBossEvent.phase==='celebrating'&&BUDMORI.renderer.bossPlayer.currentExpression==='happy',{},{timeout:8000});
 const celebration=await p.evaluate(()=>({outcome:BUDMORI.sim.farmBossEvent.outcome,phase:BUDMORI.sim.farmBossEvent.phase,clip:BUDMORI.renderer.bossPlayer.currentClip,expression:BUDMORI.renderer.bossPlayer.currentExpression,message:document.querySelector('#battleOutcome').textContent,scene:BUDMORI.sim.scene,running:BUDMORI.sim.running}));assert.equal(celebration.outcome,'defeat');assert.equal(celebration.clip,'idle');assert.equal(celebration.expression,'happy');assert(celebration.message.includes('다시 일어날'));assert.equal(celebration.scene,'farm');assert.equal(celebration.running,false);await p.screenshot({path:path.join(out,'mobile-farm-boss-defeat.png')});
 await p.waitForFunction(()=>BUDMORI.sim.farmBossEvent.phase==='fading',{},{timeout:5000});await p.waitForFunction(()=>BUDMORI.sim.farmBossEvent.phase==='idle',{},{timeout:5000});
 const sleep=await p.evaluate(()=>{BUDMORI.runtime.paused=true;return BUDMORI.sim.units.map(unit=>({hp:unit.hp,down:unit.down}))});assert(sleep.every(unit=>unit.hp===0&&unit.down>0&&unit.down<=60));await goHome(p);const raw=await p.evaluate(()=>localStorage.getItem('bloom-weapon-cards-v4'));const saved=JSON.parse(raw).world;assert(saved.units.every(unit=>unit.hp===0&&unit.down>0&&unit.down<=60),'sleep timers are included in the saved Farm roster');
 await p.reload();await p.waitForFunction(()=>window.BUDMORI);await p.locator('#continueGame').tap();const restored=await p.evaluate(()=>BUDMORI.sim.units.map(unit=>({hp:unit.hp,down:unit.down})));assert(restored.every(unit=>unit.hp===0&&unit.down>0&&unit.down<=60));await clean(p);check('Mobile 1% food replacement, fixed-stat HUD, happy defeat bounce/fade, Farm-only scene, and corpse sleep save/restore');await c.close();
}
try{browser=await chromium.launch({channel:process.env.BUDMORI_BROWSER_CHANNEL||'msedge',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});report.browser=await browser.version();await ({core,save,migration,event,victory}[suite]||core)();report.status='PASS'}catch(e){report.status='FAIL';report.failure=e.stack;throw e}finally{await browser?.close();server.close();await writeFile(path.join(out,suite+'-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report))}



