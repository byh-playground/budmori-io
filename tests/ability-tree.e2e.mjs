import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir, readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const output=path.join(root,'tests/output');
const screenshot=path.join(output,'ability-tree.png');
const abilityIds=[
  'pea-death-split',
  'corn-burst-fire',
  'corn-popcorn-chain',
  'chestnut-spike-fan',
  'kidney-continuous-leap',
  'kidney-landing-shockwave'
];
const speciesForAbility={
  'pea-death-split':0,
  'corn-burst-fire':1,
  'corn-popcorn-chain':1,
  'kidney-continuous-leap':2,
  'kidney-landing-shockwave':2,
  'chestnut-spike-fan':3
};
const browserErrors=[];
const browserWarnings=[];
const failedRequests=[];
const pageErrors=[];
const server=createServer(async(req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1');
  if(url.pathname==='/favicon.ico'){res.writeHead(204);res.end();return}
  const file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
  if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
  try{
    const body=await readFile(file);
    const type=file.endsWith('.html')?'text/html;charset=utf-8':file.endsWith('.css')?'text/css;charset=utf-8':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.json')?'application/json':'text/javascript;charset=utf-8';
    res.writeHead(200,{'Content-Type':type});res.end(body);
  }catch{res.writeHead(404);res.end()}
});

await mkdir(output,{recursive:true});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
let browser;
let context;
try{
  const launchOptions={
    channel:process.env.BUDMORI_BROWSER_CHANNEL||'chromium',
    headless:true,
    args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']
  };
  if(process.env.BUDMORI_CHROMIUM_EXECUTABLE_PATH)launchOptions.executablePath=process.env.BUDMORI_CHROMIUM_EXECUTABLE_PATH;
  browser=await chromium.launch(launchOptions);
  context=await browser.newContext({viewport:{width:1440,height:1100}});
  const page=await context.newPage();
  page.on('pageerror',error=>pageErrors.push(error.message));
  page.on('console',message=>{
    if(message.type()==='error')browserErrors.push(message.text());
    if(message.type()==='warning')browserWarnings.push(message.text());
  });
  page.on('requestfailed',request=>failedRequests.push(`${request.url()} · ${request.failure()?.errorText||'request failed'}`));
  await page.addInitScript(()=>{
    window.__abilityTreeWebglLost=false;
    window.addEventListener('webglcontextlost',event=>{if(event.target?.id==='world')window.__abilityTreeWebglLost=true},true);
  });
  const response=await page.goto(base);
  assert.equal(response?.ok(),true,'Farm app responds over the deterministic local HTTP harness');
  await page.waitForFunction(()=>window.BUDMORI||document.querySelector('#bloom-module-loading button:not([hidden])')||!document.querySelector('#bloom-module-loading'),{},{timeout:20000});
  const startup=await page.evaluate(()=>({ready:!!window.BUDMORI,message:document.querySelector('#bloom-module-loading span')?.textContent||''}));
  assert.equal(startup.ready,true,`Farm runtime failed before exposing BUDMORI; status=${startup.message}; page errors=${pageErrors.join(' | ')}; warnings=${browserWarnings.join(' | ')}; failed requests=${failedRequests.join(' | ')}`);
  assert.equal(await page.locator('#error').isVisible(),false,'Farm app has no startup error');
  await page.locator('#newGame').click();
  await page.waitForFunction(()=>BUDMORI.sim.scene==='farm'&&BUDMORI.runtime.tick>3,{},{timeout:10000});

  // Seed only the deterministic fixture: one Rare unit of each species and a
  // valid shared wallet. All investments below go through the actual Farm UI.
  await page.evaluate(ids=>{
    const world=BUDMORI.sim;
    BUDMORI.runtime.paused=true;
    world.units[0].species=0;world.units[0].tier=3;
    world.units[1].species=1;world.units[1].tier=3;
    for(const species of [2,3]){
      const unit=world.spawn(species,3,-4+species*2,0);
      if(!unit)throw Error('Could not seed Rare species '+species);
    }
    for(const unit of world.units){unit.growthDuration=0;unit.growthElapsed=0;unit.growth=3;unit.cooldown=999}
    const prior=world.playerProgression;
    world.playerProgression={
      ...prior,
      level:13,
      experience:0,
      availablePoints:12,
      abilities:Object.fromEntries(ids.map(id=>[id,{rootUnlocked:false,powerLevel:0,gradeLevel:0}])),
      processedBossKillReceipts:[]
    };
  },abilityIds);

  await page.locator('#abilities').click();
  assert.equal(new URL(page.url()).hash,'#/abilities','Farm toolbar opens the ability tree route');
  assert.equal(await page.locator('#abilityPanel').isVisible(),true,'ability tree dialog is visible');
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('#abilityPanel')).zIndex==='31');
  assert.equal(await page.locator('#abilityPanel').evaluate(el=>getComputedStyle(el).position),'fixed','the ability panel stylesheet is loaded above the Farm canvas');
  assert.equal(await page.locator('[data-ability-species]').count(),4,'Farm tree offers a selector for all four species');
  assert.equal(await page.locator('[data-ability]').count(),1,'Farm tree shows only the selected species abilities');
  for(const id of abilityIds){
    const species=speciesForAbility[id];
    await page.locator(`[data-ability-species="${species}"]`).click();
    await page.waitForFunction(value=>[...document.querySelectorAll('[data-ability]')].every(card=>Number(card.dataset.species)===value),species,{timeout:8000});
    const card=page.locator(`[data-ability="${id}"]`);
    assert.equal(await card.count(),1,`Farm UI renders ${id}`);
    const rootNode=card.locator(`[data-ability-node="${id}:root"]`);
    assert.equal(await rootNode.getAttribute('aria-disabled'),'false',`${id} Rare root is available with a seeded T3 specimen`);
  }
  assert.equal((await page.locator('#abilityPoints').textContent()).trim(),'12','shared wallet displays the seeded 12 points in the fixed panel header');

  for(const id of abilityIds){
    await page.locator(`[data-ability-species="${speciesForAbility[id]}"]`).click();
    await page.waitForFunction(value=>[...document.querySelectorAll('[data-ability]')].every(card=>Number(card.dataset.species)===value),speciesForAbility[id],{timeout:8000});
    const card=page.locator(`[data-ability="${id}"]`);
    await card.locator(`[data-ability-node="${id}:root"]`).click();
    await page.waitForFunction(id=>BUDMORI.sim.playerProgression.abilities[id].rootUnlocked,id,{timeout:8000});
    const power=card.locator(`[data-ability-node="${id}:power:1"]`);
    await page.waitForFunction(id=>{
      const node=document.querySelector(`[data-ability-node="${id}:power:1"]`);
      return BUDMORI.sim.playerProgression.abilities[id].rootUnlocked&&node?.getAttribute('aria-disabled')==='false';
    },id,{timeout:8000});
    await power.click();
    await page.waitForFunction(id=>BUDMORI.sim.playerProgression.abilities[id].powerLevel===1,id,{timeout:8000});
  }
  await page.waitForFunction(()=>document.querySelector('#abilityPoints')?.textContent.trim()==='0');
  for(const id of abilityIds){
    await page.locator(`[data-ability-species="${speciesForAbility[id]}"]`).click();
    const card=page.locator(`[data-ability="${id}"]`);
    await card.waitFor();
    assert.equal(await card.locator(`[data-ability-node="${id}:root"]`).getAttribute('aria-disabled'),'true',`${id} root reports purchased in Farm UI`);
    assert.equal(await card.locator(`[data-ability-node="${id}:power:1"]`).getAttribute('aria-disabled'),'true',`${id} first power node reports purchased in Farm UI`);
  }
  await page.evaluate(()=>new Promise(requestAnimationFrame));
  await page.screenshot({path:screenshot,fullPage:true,animations:'disabled'});

  const runtime=await page.evaluate(ids=>{
    const farm=BUDMORI.sim;
    const Garden=farm.constructor;
    const Unit=farm.units[0].constructor;
    const progression=structuredClone(farm.playerProgression);
    const snapshot={schemaVersion:progression.schemaVersion,level:progression.level,availablePoints:progression.availablePoints,abilities:progression.abilities};
    const battle=Garden.createRaidBattle(8217,['solo']);
    battle.running=true;battle.boss.active=true;battle.boss.phase='chase';battle.nextId=100;
    const entries=[[1,0,3],[2,1,3],[3,2,3],[4,3,3]];
    if(!battle.registerRaidRoster('solo',entries,snapshot))throw Error('Garden rejected the actual Farm ability snapshot');
    const units=entries.map(([farmId,species,tier],index)=>{
      const unit=new Unit(11+index,species,tier,species===1?-15:species===2?7:species===3?12:0,0);
      Object.assign(unit,{ownerId:'solo',farmId,dropLanded:true,growthDuration:0,growthElapsed:0,growth:3});
      return unit;
    });
    const [pea,corn,kidney,chestnut]=units;
    battle.units=units;
    const results={snapshotAccepted:true};

    pea.hp=0;
    if(!battle.handleUnitDeath(pea))throw Error('Farm ability snapshot did not activate pea death split');
    const summons=battle.units.filter(unit=>unit.isBattleOnlySummon);
    if(summons.length!==3||summons.some(unit=>unit.species!==0||unit.tier!==1||unit.countsTowardPermanentRoster))throw Error('Pea split did not create three temporary T1 peas');
    results.peaDeathSplit={summons:summons.length,kind:summons[0].battleSummonKind};

    const dt=1/120;
    if(!corn.ability.begin(battle,{x:-11,y:0}))throw Error('Corn attack cycle did not begin');
    let cornTicks=0;
    while(battle.projectiles.filter(projectile=>projectile.owner===corn.id).length<3&&cornTicks++<500){battle.time+=dt;corn.ability.update(battle,dt)}
    const cornShots=battle.projectiles.filter(projectile=>projectile.owner===corn.id);
    if(cornShots.length!==3||cornShots.map(projectile=>projectile.shotIndex).join(',')!=='0,1,2'||cornShots.some(projectile=>Math.abs(projectile.attackMultiplier-.8)>1e-9))throw Error('Corn burst did not fire its three spaced power-1 shots through AttackCycle');
    results.cornBurst={shots:cornShots.length,indices:cornShots.map(projectile=>projectile.shotIndex),attackMultiplier:cornShots[0].attackMultiplier};

    cornShots[0].landed=true;cornShots[0].x=30;cornShots[0].y=30;cornShots[0].fuseRemaining=1;
    cornShots[1].landed=true;cornShots[1].x=30.05;cornShots[1].y=30;cornShots[1].fuseRemaining=1;
    battle.updateProjectiles(dt);
    const chain=battle.notices.filter(event=>event.kind==='popcorn-explosion'&&event.unit===corn.id);
    if(chain.length!==2||!cornShots[0].exploded||!cornShots[1].exploded)throw Error('Touching popcorn kernels did not trigger the real Garden chain explosion');
    results.cornPopcornChain={explosions:chain.length,radius:cornShots[0].popcornConfig.radius,damageMultiplier:cornShots[0].popcornConfig.damageMultiplier};

    chestnut.chestnutBasicCycles=3;
    if(!chestnut.ability.begin(battle,{x:16,y:0}))throw Error('Chestnut attack cycle did not begin');
    let chestnutTicks=0;
    while(!battle.combatLog.some(event=>event.kind==='launch'&&event.unit===chestnut.id)&&chestnutTicks++<120){battle.time+=dt;chestnut.ability.update(battle,dt)}
    const spikes=battle.projectiles.filter(projectile=>projectile.owner===chestnut.id&&projectile.projectileKind==='chestnut-spike');
    if(spikes.length!==5||spikes.some((projectile,index)=>projectile.fanIndex!==index||projectile.attackMultiplier!==.5))throw Error('Chestnut launch hook did not create the five power-1 fan spikes');
    results.chestnutSpikeFan={spikes:spikes.length,fanIndices:spikes.map(projectile=>projectile.fanIndex)};

    battle.boss.x=0;battle.boss.y=0;battle.boss.hp=2400;battle.boss.maxHp=2400;
    kidney.x=5;kidney.y=0;kidney.z=0;kidney.hp=100;kidney.down=0;kidney.stun=0;
    battle.random=()=>0;
    if(!kidney.ability.begin(battle,{x:3,y:0}))throw Error('Kidney leap attack cycle did not begin');
    const action=kidney.ability.action;
    action.path=BUDMORI.Ballistics.create(kidney,action.target,'leap');
    kidney.ability.phase='active';kidney.ability.elapsed=action.path.duration;
    kidney.x=action.target.x;kidney.y=action.target.y;kidney.z=0;
    const hpBefore=battle.boss.hp;
    kidney.ability.afterMove(battle,{x:5,y:0,z:0});
    const shockwave=battle.notices.find(event=>event.kind==='kidney-shockwave'&&event.unit===kidney.id);
    const reset=battle.notices.find(event=>event.kind==='leap-cooldown-reset'&&event.unit===kidney.id);
    if(!shockwave||shockwave.damageMultiplier!==1.5||Math.abs(shockwave.radius-3.75)>1e-9||!reset||kidney.ability.phase!=='idle'||battle.boss.hp>=hpBefore)throw Error('Kidney landing hook did not trigger the power-1 shockwave and deterministic cooldown reset');
    results.kidneyLanding={shockwaveRadius:shockwave.radius,damageMultiplier:shockwave.damageMultiplier,cooldownReset:true,bossDamaged:true};

    return {ids,pointsSpent:progression.availablePoints===0,results};
  },abilityIds);
  assert.deepEqual(runtime.ids,abilityIds,'runtime fixture covers all six approved abilities');
  assert.equal(runtime.pointsSpent,true,'all six UI roots and six power nodes spent the shared wallet');
  assert.equal(runtime.results.snapshotAccepted,true,'actual Farm build registers as a Garden raid runtime snapshot');
  assert.equal(runtime.results.peaDeathSplit.summons,3,'pea death-split runs in actual Garden combat');
  assert.equal(runtime.results.cornBurst.shots,3,'corn burst runs through the actual Garden AttackCycle');
  assert.equal(runtime.results.cornPopcornChain.explosions,2,'corn popcorn detonations chain through the actual Garden projectile update');
  assert.equal(runtime.results.chestnutSpikeFan.spikes,5,'chestnut fan fires through the actual Garden attack-launch hook');
  assert.equal(runtime.results.kidneyLanding.cooldownReset,true,'kidney leap reset and landing shockwave run through the actual Garden landing hook');

  const browserState=await page.evaluate(()=>{
    const canvas=document.querySelector('#world');
    const gl=canvas?.getContext('webgl');
    return {webgl:!!gl,webglError:gl?.getError()??null,contextLost:!!window.__abilityTreeWebglLost};
  });
  assert.equal(browserState.webgl,true,'actual Farm canvas has a WebGL context');
  assert.equal(browserState.webglError,0,'actual WebGL context reports no GL error');
  assert.equal(browserState.contextLost,false,'Farm canvas never lost its WebGL context');
  assert.equal(await page.locator('#error').isVisible(),false,'Farm app has no rendered error state');
  assert.deepEqual(pageErrors,[],'Chromium reports no uncaught page errors');
  assert.deepEqual(browserErrors,[],'Chromium reports no console errors');
  await page.setViewportSize({width:390,height:844});
  await page.locator('[data-ability-species="1"]').click();
  await page.waitForFunction(()=>document.querySelectorAll('[data-ability]').length===2&&[...document.querySelectorAll('[data-ability]')].every(card=>card.dataset.species==='1'));
  assert.equal(await page.locator('[data-ability="corn-burst-fire"] h3').textContent(),'옥수수 알갱이 연사','cards use their actual ability names');
  assert.equal(await page.locator('[data-ability="corn-popcorn-chain"] h3').textContent(),'팝콘 연쇄 폭발','Corn shows both abilities without listing unrelated species');
  assert.equal(await page.locator('[data-ability-node="corn-burst-fire:root"] .ability-node__title').textContent(),'능력 해금');
  assert.equal(await page.locator('[data-ability-node="corn-burst-fire:power:1"] .ability-node__title').textContent(),'3발 연사');
  const mobileBefore=await page.evaluate(()=>{
    const panel=document.querySelector('#abilityPanel'),heading=panel.querySelector('.ability-panel__heading'),content=document.querySelector('#abilityNodes'),close=document.querySelector('#abilityClose'),rect=el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom}};
    content.scrollTop=0;
    return{viewport:[innerWidth,innerHeight],body:[document.documentElement.scrollHeight,document.documentElement.clientHeight,document.body.scrollHeight,document.body.clientHeight],panel:rect(panel),heading:rect(heading),content:rect(content),contentScroll:[content.scrollHeight,content.clientHeight],close:rect(close)};
  });
  assert.deepEqual(mobileBefore.viewport,[390,844]);
  assert(mobileBefore.body.every(value=>value<=844),'mobile page and body do not scroll outside the ability panel');
  assert(mobileBefore.contentScroll[0]>mobileBefore.contentScroll[1],'selected species content scrolls inside its panel');
  assert(mobileBefore.close.y>=0&&mobileBefore.close.bottom<=844,'close control remains visible in the fixed panel header');
  await page.locator('#abilityNodes').evaluate(el=>{el.scrollTop=el.scrollHeight});
  const mobileAfter=await page.evaluate(()=>{
    const panel=document.querySelector('#abilityPanel'),heading=panel.querySelector('.ability-panel__heading'),content=document.querySelector('#abilityNodes'),close=document.querySelector('#abilityClose'),rect=el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom}};
    return{heading:rect(heading),close:rect(close),scrollTop:content.scrollTop,content:rect(content)};
  });
  assert(mobileAfter.scrollTop>0,'swiping/scrolling moves the ability list');
  assert.equal(mobileAfter.heading.y,mobileBefore.heading.y,'species selector and points stay fixed while the list scrolls');
  assert.equal(mobileAfter.close.y,mobileBefore.close.y,'close button stays fixed while the list scrolls');
  assert.equal(mobileAfter.content.y,mobileBefore.content.y,'scroll is confined to the list, not the page');
  await page.locator('#abilityNodes').evaluate(el=>{el.scrollTop=0});
  await page.evaluate(()=>new Promise(requestAnimationFrame));
  const mobileScreenshot=path.join(output,'ability-tree-mobile.png');
  await page.screenshot({path:mobileScreenshot,fullPage:false,animations:'disabled'});
  console.log(JSON.stringify({status:'PASS',browser:await browser.version(),coverage:runtime.results,screenshot:'tests/output/ability-tree.png',mobileScreenshot:'tests/output/ability-tree-mobile.png',mobileLayout:{viewport:mobileBefore.viewport,panelHeight:mobileBefore.panel.height,innerScroll:mobileBefore.contentScroll[0]>mobileBefore.contentScroll[1],closeVisible:mobileBefore.close.y>=0&&mobileBefore.close.bottom<=844}}));
}catch(error){
  console.error(error.stack||error);
  console.error(JSON.stringify({pageErrors,browserErrors,browserWarnings,failedRequests}));
  process.exitCode=1;
}finally{
  await context?.close();
  await browser?.close();
  server.close();
}
