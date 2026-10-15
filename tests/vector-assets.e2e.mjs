import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync} from 'node:fs';

const root=fileURLToPath(new URL('../',import.meta.url)),out=path.join(root,'tests/output');
await mkdir(out,{recursive:true});
const requiredClips=['idle','walk','windup','fire','recover','hit','airborne','landing','death'];
const requiredExpressions=['neutral','happy','focused','attack','surprised','hurt','hungry','dead'];
const requiredBossClips=['idle','walk','windup','strike','sweep','recover','hit','death'],requiredBossExpressions=['neutral','focused','attack','hurt','dead'];
const sourceConfig=JSON.parse(await readFile(path.join(root,'scripts/vector-assets-sources.json'),'utf8'));
assert.equal(existsSync(path.join(root,'scripts/vector-assets-motion.json')),false,'SVG motion sidecar must be removed');
const authoredAssets=[];
for(const source of sourceConfig.assets){
  const sourceBytes=await readFile(path.join(root,source.file)),sourceText=sourceBytes.toString('utf8');
  const metadata=JSON.parse(sourceText.match(/<metadata id="vector-asset">([\s\S]*?)<\/metadata>/)?.[1]||'null');
  assert.deepEqual(Object.keys(metadata.clips),requiredClips,`${source.file} must author all GameKit clips in SVG metadata`);
  assert.deepEqual(Object.keys(metadata.expressions),requiredExpressions,`${source.file} must author all face states in SVG metadata`);
  for(const name of requiredExpressions)assert(new RegExp(`<g id="face-${name}">`).test(sourceText),`${source.file} is missing authored SVG face geometry for ${name}`);
  authoredAssets.push({species:source.species,sourceSha256:createHash('sha256').update(sourceBytes).digest('hex'),parts:metadata.parts.length});
}
assert.deepEqual(sourceConfig.bosses.map(b=>b.id),['chestnut']);
const bossSource=sourceConfig.bosses[0],bossBytes=await readFile(path.join(root,bossSource.file)),bossText=bossBytes.toString('utf8'),bossMetadata=JSON.parse(bossText.match(/<metadata id="vector-asset">([\s\S]*?)<\/metadata>/)?.[1]||'null');
assert.deepEqual(Object.keys(bossMetadata.clips),requiredBossClips);assert.deepEqual(Object.keys(bossMetadata.expressions),requiredBossExpressions);
for(const name of requiredBossExpressions)assert(new RegExp(`<g id="face-${name}">`).test(bossText),`${bossSource.file} is missing its authored ${name} face`);
for(const name of ['ground','shoulder-left','shoulder-right','fist-left','fist-right'])assert(bossMetadata.sockets[name],`${bossSource.file} must author ${name} socket`);
assert.equal(bossMetadata.parts.some(p=>p.id==='arm-left'),true);assert.equal(bossMetadata.parts.some(p=>p.id==='arm-right'),true);
const authoredBoss={id:bossSource.id,sourceSha256:createHash('sha256').update(bossBytes).digest('hex'),parts:bossMetadata.parts.length};
const server=createServer(async(q,r)=>{
  const url=new URL(q.url,'http://localhost');
  if(url.pathname==='/favicon.ico'){r.writeHead(204);r.end();return}
  const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));
  if(!file.startsWith(root)){r.writeHead(403);r.end();return}
  try{const body=await readFile(file);r.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html;charset=utf-8':file.endsWith('.json')?'application/json':'text/javascript;charset=utf-8'});r.end(body)}catch{r.writeHead(404);r.end()}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const report={suite:'vector-assets',started:new Date().toISOString(),errors:[]};let browser;
try{
  browser=await chromium.launch({channel:'msedge',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
  report.browser=await browser.version();
  const context=await browser.newContext({viewport:{width:1280,height:800}}),page=await context.newPage();
  page.on('pageerror',error=>report.errors.push(error.message));
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.waitForFunction(()=>window.BUDMORI,{},{timeout:30000});
  const vector=await page.evaluate(async()=>{
    const renderer=BUDMORI.renderer,ids=[0,1,2];
    if(renderer.vectorAssets.size!==3)throw Error('Three compiled SVG vector assets are not active');
    for(const species of ids){
      const record=renderer.vectorAssets.get(species),metadata=record.compiled.metadata,viewBox=record.compiled.viewBox;
      if(!record.asset||record.asset.disposed)throw Error('Missing retained GameKit vector mesh for species '+species);
      if(viewBox[0]!==0||viewBox[1]!==0)throw Error('GameKit compile did not retain the crop-local origin');
      if(metadata.presentation)throw Error('Compiled runtime must not synthesize separate presentation metadata');
      const player=record.asset.createPlayer({clip:'idle',startedAtMs:0});
      const expected=metadata.sockets.mouth.point,actual=player.getSocket('mouth');
      if(Math.hypot(actual.x-expected[0],actual.y-expected[1])>1e-6)throw Error('SVG mouth socket moved before parent transforms');
      for(const clip of Object.keys(metadata.clips)){player.play(clip,0);player.seek(metadata.clips[clip].durationMs*.5);if(player.currentClip!==clip)throw Error('GameKit native clip failed to play: '+clip);if(!Number.isFinite(player.getPartPose('body').transform[0]))throw Error('GameKit clip produced a non-finite pose: '+clip)}
      for(const expression of Object.keys(metadata.expressions)){player.setExpression(expression);if(player.currentExpression!==expression)throw Error('GameKit native expression failed: '+expression)}
      player.play('idle',0);player.seek(0);
      const pivot=metadata.parts.find(part=>part.id==='body').pivot,angle=.2;
      player.setBasePose('body',{rotation:angle});
      const transformed=player.getSocket('mouth'),dx=expected[0]-pivot[0],dy=expected[1]-pivot[1];
      const rotated={x:pivot[0]+dx*Math.cos(angle)-dy*Math.sin(angle),y:pivot[1]+dx*Math.sin(angle)+dy*Math.cos(angle)};
      if(Math.hypot(transformed.x-rotated.x,transformed.y-rotated.y)>1e-5)throw Error('GameKit parent part transform did not reach nested socket');
      player.dispose();
    }
    const Garden=BUDMORI.sim.constructor,owner='visual-check',world=Garden.createRaidBattle(304,['visual-check']);
    const entries=ids.map((species)=>[species+1,species,4]);
    if(!world.registerRaidRoster(owner,entries))throw Error('Visual roster registration failed');
    const points=[[-8,3],[0,-9],[8,3]];
    for(let i=0;i<ids.length;i++)if(!world.deployNextRaidUnit(owner,i+1,points[i][0],points[i][1]))throw Error('Vector troop drop failed: '+i);
    for(const unit of world.units){unit.dropLanded=true;unit.z=unit.vz=0;unit.vx=unit.vy=0;unit.ability.phase='idle';unit.ability.elapsed=0}
    const bySpecies=[...world.units].sort((a,b)=>a.species-b.species);
    bySpecies[0].ability.phase='windup';bySpecies[0].ability.elapsed=.14;
    bySpecies[1].ability.phase='active';bySpecies[1].ability.elapsed=.15;
    bySpecies[2].z=1.2;bySpecies[2].stun=.2;
    world.boss.phase='resting';world.boss.x=0;world.boss.y=-1;world.boss.hp=world.boss.maxHp=2400;
    BUDMORI.runtime.world=world;BUDMORI.runtime.speed=1;BUDMORI.runtime.paused=true;BUDMORI.runtime.capturePresentation('reset');
    const boss=renderer.bossAssets.get('chestnut'),metadata=boss.compiled.metadata,player=boss.asset.createPlayer({clip:'idle',startedAtMs:0}),before=player.getSocket('fist-right');player.setBasePose('arm-right',{rotation:.32});const after=player.getSocket('fist-right'),origin=player.getSocket('ground');if(Math.hypot(after.x-before.x,after.y-before.y)<1)throw Error('Chestnut arm socket must follow its authored arm transform');for(const clip of Object.keys(metadata.clips)){player.play(clip,0);player.seek(metadata.clips[clip].durationMs*.5);if(player.currentClip!==clip)throw Error('Chestnut GameKit clip failed: '+clip)}for(const expression of Object.keys(metadata.expressions)){player.setExpression(expression);if(player.currentExpression!==expression)throw Error('Chestnut GameKit expression failed: '+expression)}player.dispose();
    return{assets:[...renderer.vectorAssets].map(([species,record])=>({species,id:record.compiled.metadata.id,sourceSha256:record.compiled.sourceSha256,viewBox:record.compiled.viewBox,parts:record.compiled.geometry.partCount,vertices:record.compiled.geometry.vertices.length/11,clips:Object.keys(record.compiled.metadata.clips),expressions:Object.keys(record.compiled.metadata.expressions)})),boss:{id:boss.compiled.metadata.id,sourceSha256:boss.compiled.sourceSha256,parts:boss.compiled.geometry.partCount,vertices:boss.compiled.geometry.vertices.length/11,clips:Object.keys(metadata.clips),expressions:Object.keys(metadata.expressions),socketMotion:{before,after,ground:origin},activePlayer:renderer.bossPlayer?.currentClip},sockets:ids.map(species=>({species,mouth:BUDMORI.renderer.vectorAssets.get(species).compiled.metadata.sockets.mouth.point})),rendererBackend:renderer.canvas.dataset.rendererBackend};
  });
  for(const asset of vector.assets){assert.deepEqual(asset.clips,requiredClips);for(const expression of requiredExpressions)assert(asset.expressions.includes(expression),`${asset.id} is missing the ${expression} face expression`);const source=authoredAssets.find(entry=>entry.species===asset.species);assert.equal(asset.sourceSha256,source.sourceSha256,`${asset.id} runtime metadata must hash its exact SVG source`);assert.equal(asset.parts,source.parts)}
  assert.equal(vector.boss.id,'budmori-chestnut-boss');assert.deepEqual(vector.boss.clips,requiredBossClips);assert.deepEqual(vector.boss.expressions,requiredBossExpressions);assert.equal(vector.boss.sourceSha256,authoredBoss.sourceSha256);assert.equal(vector.boss.parts,authoredBoss.parts);assert(vector.boss.socketMotion.after.x!==vector.boss.socketMotion.before.x||vector.boss.socketMotion.after.y!==vector.boss.socketMotion.before.y);
  report.assets=vector.assets;report.socketTransformCheck='PASS authored socket stays crop-local and follows the body part pivot';report.backend=vector.rendererBackend;
  await page.waitForFunction(()=>BUDMORI.renderer.vectorPlayers.size===3&&BUDMORI.renderer.bossPlayer?.currentClip==='idle',{},{timeout:5000}).catch(async error=>{
    const debug=await page.evaluate(()=>({scene:BUDMORI.sim.scene,worldUnits:BUDMORI.sim.units.map(u=>({id:u.id,species:u.species,ownerId:u.ownerId})),runtimeWorld:BUDMORI.runtime.world.scene,presentation:BUDMORI.runtime.presentation(performance.now()).units.map(u=>({id:u.id,species:u.species,ownerId:u.ownerId})),players:BUDMORI.renderer.vectorPlayers.size}));
    throw new Error(error.message+'; renderer state '+JSON.stringify(debug));
  });
  await page.evaluate(()=>new Promise(requestAnimationFrame));
  await page.waitForTimeout(340);
  const first=await page.evaluate(()=>{const renderer=BUDMORI.renderer,units=[...BUDMORI.sim.units].sort((a,b)=>a.species-b.species),players=units.map(unit=>renderer.vectorPlayers.get(unit.id));const before=players[1].getSocket('mouth');players[0].setBasePose('body',{rotation:.17});const after=players[1].getSocket('mouth');players[0].setBasePose('body',{rotation:0});const playerIsolation=Math.hypot(before.x-after.x,before.y-after.y)<1e-8;const states=players.map((player,index)=>({motion:['windup','fire','airborne'][index],clip:player.currentClip,expression:player.currentExpression,body:player.getPartPose('body')}));return{players:players.length,assets:renderer.vectorAssets.size,mesh:renderer.stats?.mesh||null,time:renderer.displayTimeMs,allPlayersSeekSharedTime:players.every(player=>player.currentTimeMs===renderer.displayTimeMs),playerIsolation,states}});
  assert.equal(first.players,3);assert.equal(first.assets,3);assert(first.allPlayersSeekSharedTime);assert(first.mesh?.draws>0);assert(first.playerIsolation);assert.deepEqual(first.states.map(state=>state.motion),['windup','fire','airborne']);assert.deepEqual(first.states.map(state=>state.clip),['windup','fire','airborne']);assert.deepEqual(first.states.map(state=>state.expression),['focused','attack','hurt']);assert(new Set(first.states.map(state=>state.body.transform.map(v=>Number(v.toFixed(3))).join(':'))).size>1);report.singleFrame=first;
  await page.evaluate(()=>{document.body.dataset.home='false';document.querySelector('#startScreen').hidden=true});
  await page.evaluate(()=>new Promise(requestAnimationFrame));
  await page.screenshot({path:path.join(out,'troop-vector-desktop.png')});
  await page.locator('#world').screenshot({path:path.join(out,'troop-vector-desktop-canvas.png')});
  await page.evaluate(()=>{for(const unit of BUDMORI.sim.units)unit.hp=0;BUDMORI.runtime.capturePresentation('reset')});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  report.deathVectorExpression=await page.evaluate(()=>({deadUnits:BUDMORI.runtime.presentation(performance.now()).units.filter(u=>u.hp<=0).length,assets:BUDMORI.renderer.vectorAssets.size,players:[...BUDMORI.renderer.vectorPlayers.values()].map(player=>({clip:player.currentClip,expression:player.currentExpression}))}));
  assert.equal(report.deathVectorExpression.deadUnits,3);assert.equal(report.deathVectorExpression.assets,3);assert(report.deathVectorExpression.players.every(player=>player.clip==='death'&&player.expression==='dead'));
  await page.screenshot({path:path.join(out,'troop-vector-death.png')});
  await page.setViewportSize({width:844,height:390});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const landscape=await page.evaluate(()=>({width:innerWidth,height:innerHeight,canvas:{width:BUDMORI.renderer.canvas.width,height:BUDMORI.renderer.canvas.height},view:BUDMORI.renderer.view,units:BUDMORI.sim.units.length,players:BUDMORI.renderer.vectorPlayers.size,mesh:BUDMORI.renderer.stats?.mesh||null}));
  assert.equal(landscape.width,844);assert.equal(landscape.height,390);assert.equal(landscape.units,3);assert.equal(landscape.players,3);report.landscape=landscape;
  await page.screenshot({path:path.join(out,'troop-vector-mobile-landscape.png')});
  await page.locator('#world').screenshot({path:path.join(out,'troop-vector-mobile-landscape-canvas.png')});
  assert.deepEqual(report.errors,[]);report.status='PASS';await context.close();
}catch(error){report.status='FAIL';report.failure=error.stack;throw error}
finally{await browser?.close();server.close();await writeFile(path.join(out,'vector-assets-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report))}
