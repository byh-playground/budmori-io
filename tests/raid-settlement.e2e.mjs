import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const output=path.join(root,'tests/output');
const failures=[];
const server=createServer(async(req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1');
  if(url.pathname==='/favicon.ico'){res.writeHead(204);res.end();return}
  const file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
  if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
  try{
    const body=await readFile(file);
    const type=file.endsWith('.html')?'text/html;charset=utf-8':file.endsWith('.css')?'text/css;charset=utf-8':file.endsWith('.svg')?'image/svg+xml':'text/javascript;charset=utf-8';
    res.writeHead(200,{'Content-Type':type});res.end(body);
  }catch{res.writeHead(404);res.end()}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
let browser;
try{
  browser=await chromium.launch({channel:process.env.BUDMORI_BROWSER_CHANNEL||'chromium',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  const page=await context.newPage();
  page.on('pageerror',error=>failures.push(error.message));
  const response=await page.goto(base);
  assert.equal(response?.ok(),true,'Farm app responds from the local browser harness');
  await page.waitForFunction(()=>window.BUDMORI||!document.querySelector('#bloom-module-loading'),{},{timeout:20000});
  assert.ok(await page.evaluate(()=>!!window.BUDMORI),'Farm runtime loads before the settlement scenario');
  await page.locator('#newGame').click();
  if(await page.locator('#confirmNew').isVisible())await page.locator('#confirmNew').click();
  await page.waitForFunction(()=>BUDMORI.sim.scene==='farm'&&document.querySelector('#startScreen').hidden,{},{timeout:10000});
  await page.locator('#raid').click();
  await page.waitForFunction(()=>BUDMORI.sim.scene==='raid'&&BUDMORI.sim.raidRoster('solo'),{},{timeout:10000});

  const reservation=await page.evaluate(()=>({
    farmSession:BUDMORI.storage.world.activeRaidSessionId,
    farmSequence:BUDMORI.storage.world.activeRaidRunSequence,
    roster:BUDMORI.sim.raidRoster('solo')
  }));
  assert.equal(typeof reservation.farmSession,'string');
  assert.ok(reservation.farmSession.length>0);
  assert.equal(reservation.farmSequence,1);
  assert.equal(reservation.roster.settlementSessionId,reservation.farmSession);
  assert.equal(reservation.roster.settlementRunSequence,reservation.farmSequence);
  assert.equal(reservation.roster.settlementEncounterId,reservation.farmSequence);

  const battle=await page.evaluate(()=>{
    BUDMORI.runtime.paused=true;
    const world=BUDMORI.sim;
    if(!world.deployNextRaidUnit('solo',1,4,0))throw Error('Could not deploy the original Farm unit');
    const casualty=world.units.find(unit=>unit.ownerId==='solo');
    if(!casualty)throw Error('Deployed Farm unit is missing from the Raid');
    casualty.hp=0;
    world.encounter.outcome='victory';
    world.encounter.elapsed=1;
    world.boss.hp=0;
    world.boss.active=false;
    world.running=false;
    return {farmId:casualty.farmId,unitId:casualty.id,deployed:world.raidRoster('solo').troops.find(t=>t.farmId===casualty.farmId)?.deployed};
  });
  assert.equal(battle.deployed,true);
  await page.locator('#return').click();
  await page.waitForFunction(()=>BUDMORI.sim.scene==='farm'&&BUDMORI.sim.raidSettlementReceipts.length===1,{},{timeout:10000});

  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('bloom-weapon-cards-v4')).world);
  const settlement=saved.raidSettlementReceipts[0];
  const key=`raid:${JSON.stringify(['solo',reservation.farmSession,reservation.farmSequence])}`;
  assert.equal(saved.scene,'farm');
  assert.equal(saved.activeRaidRunSequence,null,'Farm run reservation clears only after settlement saves');
  assert.equal(saved.raidSettlementWatermark,reservation.farmSequence);
  assert.equal(settlement.key,key);
  assert.equal(settlement.outcome,'victory');
  assert.deepEqual(settlement.sleptFarmUnitIds,[battle.farmId]);
  const casualty=saved.units.find(unit=>unit.id===battle.farmId);
  assert.equal(casualty.hp,0);
  assert.equal(casualty.down,60,'the casualty returns to its Farm record with a 60-second recovery timer');
  assert.equal(saved.playerProgression.level,2);
  assert.equal(saved.playerProgression.experience,0);
  assert.equal(saved.playerProgression.availablePoints,1);
  assert.deepEqual(saved.playerProgression.processedBossKillReceipts,[key]);
  assert.equal(saved.bossRewardReceipts.length,1);
  assert.equal(saved.bossRewardReceipts[0].receiptKey,key);
  assert.equal(saved.bossRewardReceipts[0].xpAmount,100);
  assert.ok(Math.abs(saved.bossRewardReceipts[0].chance-0.3)<1e-12);
  assert.equal(saved.units.filter(unit=>unit.isBattleOnlySummon).length,0);

  // A reload has no live Raid runtime. Keep its persisted Farm reservation
  // intact until the player explicitly chooses to end that interrupted run.
  await page.locator('#raid').click();
  await page.waitForFunction(()=>BUDMORI.sim.scene==='raid'&&BUDMORI.storage.world.activeRaidRunSequence===2,{},{timeout:10000});
  const beforeReload=await page.evaluate(()=>({
    units:structuredClone(BUDMORI.storage.world.units),
    progression:structuredClone(BUDMORI.storage.world.playerProgression),
    rewards:structuredClone(BUDMORI.storage.world.bossRewardReceipts),
    sessionId:BUDMORI.storage.world.activeRaidSessionId,
    runSequence:BUDMORI.storage.world.activeRaidRunSequence
  }));
  await page.reload();
  await page.waitForFunction(()=>!!window.BUDMORI&&!document.querySelector('#bloom-module-loading'),{},{timeout:20000});
  assert.equal(await page.locator('#staleRaidNotice').isVisible(),true,'the saved active run is identified after the old Raid runtime disappears');
  assert.equal(await page.locator('#continueGame').isDisabled(),true,'Farm continuation waits for an explicit stale-run decision');
  const afterReload=await page.evaluate(()=>({
    units:BUDMORI.storage.world.units,
    progression:BUDMORI.storage.world.playerProgression,
    rewards:BUDMORI.storage.world.bossRewardReceipts,
    sessionId:BUDMORI.storage.world.activeRaidSessionId,
    runSequence:BUDMORI.storage.world.activeRaidRunSequence,
    receipts:BUDMORI.storage.world.raidSettlementReceipts
  }));
  assert.deepEqual(afterReload.units,beforeReload.units,'reload itself does not alter ownership or unit recovery');
  assert.deepEqual(afterReload.progression,beforeReload.progression,'reload itself does not award XP or points');
  assert.deepEqual(afterReload.rewards,beforeReload.rewards,'reload itself does not settle a boss reward');
  assert.equal(afterReload.sessionId,beforeReload.sessionId);
  assert.equal(afterReload.runSequence,beforeReload.runSequence);
  assert.equal(afterReload.receipts.length,1,'reload does not write an abort receipt automatically');
  assert.match(await page.locator('#staleRaidNotice').textContent(),/다른 탭에서 진행 중인 원정도 함께 종료될 수 있어요/);
  await page.locator('#abortRaidRun').click();
  await page.waitForFunction(()=>BUDMORI.storage.world.activeRaidRunSequence===null&&BUDMORI.storage.world.raidSettlementReceipts.length===2,{},{timeout:10000});
  const aborted=await page.evaluate(()=>JSON.parse(localStorage.getItem('bloom-weapon-cards-v4')).world);
  assert.equal(aborted.raidSettlementReceipts[1].outcome,'aborted');
  assert.deepEqual(aborted.raidSettlementReceipts[1].sleptFarmUnitIds,[]);
  assert.equal(aborted.raidSettlementWatermark,2);
  assert.deepEqual(aborted.units,beforeReload.units,'explicit abort preserves Farm units');
  assert.deepEqual(aborted.playerProgression,beforeReload.progression,'explicit abort grants no XP or ability points');
  assert.deepEqual(aborted.bossRewardReceipts,beforeReload.rewards,'explicit abort grants no reward');
  assert.equal(await page.locator('#continueGame').isDisabled(),false,'the Farm can be continued after recovery');
  await page.locator('#continueGame').click();
  await page.waitForFunction(()=>BUDMORI.sim.scene==='farm'&&document.querySelector('#startScreen').hidden,{},{timeout:10000});
  await page.locator('#raid').click();
  await page.waitForFunction(()=>BUDMORI.sim.scene==='raid'&&BUDMORI.storage.world.activeRaidRunSequence===3,{},{timeout:10000});
  assert.deepEqual(failures,[],'the real Farm app has no browser runtime errors during Raid settlement');
  await context.close();
  console.log(JSON.stringify({status:'PASS',farmSession:reservation.farmSession,runSequence:reservation.farmSequence,casualtyFarmId:battle.farmId,receiptKey:key,xp:100,level:saved.playerProgression.level,points:saved.playerProgression.availablePoints,interruptedRunSequence:beforeReload.runSequence,abortedRunSequence:aborted.raidSettlementWatermark,nextRunSequence:3}));
}finally{
  await browser?.close();
  server.close();
}
