import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import sharedHarness from './shared-harness.cjs';
import fontAssets from './font-asset-fixture.cjs';
import moduleReferences from './module-reference-fixture.cjs';
import runtimeSources from './runtime-source.cjs';
import {exerciseInputPreviewFlow,assertInputPreviewCleared} from './input-preview-flow.mjs';

// Usage: node tests/multiplayer-browser.e2e.mjs [candidate.html]
// The candidate remains the shipped one-file game. Only this server response gets
// a local relay capability and a declared initial-world fixture. The SDK signs
// and verifies real Nostr events, and native Chromium RTCPeerConnections carry all
// game inputs, admission snapshots, and catch-up. No mock peer/byte transport,
// public relay, STUN service, user identity, or real account credential is used.
const runStarted=performance.now();
const source=sharedHarness.candidate(),namespace='budmori-browser-'+randomUUID(),headed=process.env.BUDMORI_HEADED==='1'||process.platform==='win32'&&process.env.BUDMORI_HEADED!=='0';
const rollbackCandidatePath=process.env.BUDMORI_ROLLBACK_NETCODE_CANDIDATE,rollbackCandidateBytes=rollbackCandidatePath?await readFile(rollbackCandidatePath):null;
if(rollbackCandidateBytes){const config=runtimeSources.manifest(source.html),entry=config?.modules.find(module=>module.name==='rollback-netcode');if(!entry)throw new Error('Rollback module is missing from the runtime manifest');const sha256=runtimeSources.hash(rollbackCandidateBytes);entry.bytes=rollbackCandidateBytes.length;entry.sha256=sha256;entry.url=`https://rollback-netcode-candidate.invalid/${sha256}/rollback-netcode.js`;source.html=source.html.replace(/<script id="bloom-runtime-manifest" type="application\/json">[\s\S]*?<\/script>/,'<script id="bloom-runtime-manifest" type="application/json">'+JSON.stringify(config)+'</script>')}
const loadUnits=Number(process.env.BUDMORI_LOAD_UNITS||0);
if(!Number.isSafeInteger(loadUnits)||loadUnits<0||loadUnits>1000)throw new Error('BUDMORI_LOAD_UNITS must be 0..1000');
const loadProfile=process.env.BUDMORI_LOAD_PROFILE==='1';
const loadPreview=process.env.BUDMORI_LOAD_PREVIEW||'on';
if(!['on','off'].includes(loadPreview)||loadPreview==='off'&&!loadUnits)throw new Error('BUDMORI_LOAD_PREVIEW must be on|off and off requires BUDMORI_LOAD_UNITS');
const report={status:'RUNNING',sourceSHA256:source.sha256,sdk:source.sdk,
 environment:`${headed?'Headed':'Headless'} Chromium / SwiftShader WebGL; two independent tabs; native tab visibility; signed local Nostr relay over BroadcastChannel; real WebRTC data channels; production 500ms serialized signaling + SDK timer + RAF; fixtureUnits=${loadUnits}; preview=${loadPreview}`,
 limitations:['Local signaling fixture does not validate public relay availability, NAT traversal, Internet latency, mobile hardware, or device FPS.','Declared fixtures grant the first player resources/army and an elevated slow admission projectile, then place a durable encounter on each participant’s first ordinary step after admission; production spawning/culling and attack/flight logic are unchanged.'],checks:[],checkpoints:[],screenshots:[],timings:[]};
if(rollbackCandidateBytes)report.candidateRollbackNetcode={path:rollbackCandidatePath,bytes:rollbackCandidateBytes.length,sha256:runtimeSources.hash(rollbackCandidateBytes),published:false};
const fixture=String.raw`
// Test-server injection only. Do not copy this block into the shipped HTML.
(()=>{
 const sdk=BloomOwnedSDK,qa=globalThis.__sharedBrowser={rooms:[],signalers:[],events:[],wanted:new Set(),checkpoints:new Map(),lastInputs:[],relay:{published:0,delivered:0}};
 ${loadPreview==='off'?"const previewPrototype=sdk.LocalInputPreview?.prototype,enablePreview=previewPrototype?.setEnabled;if(typeof enablePreview!=='function')throw Error('LocalInputPreview.setEnabled is required');previewPrototype.setEnabled=function(){return enablePreview.call(this,false)};":''}
 ${loadUnits?"qa.loopSamples=[];let sampledTicks=-1;qa.sampleLoop=setInterval(()=>{const metrics=BloomSimulation.runtime?.metrics;if(!metrics||metrics.ticks===sampledTicks)return;sampledTicks=metrics.ticks;qa.loopSamples.push({tick:BloomSimulation.tick,tickMs:metrics.tickMs,presentationMs:metrics.presentationMs});if(qa.loopSamples.length>240)qa.loopSamples.shift()},25);":''}
 // Local latency fixture: withhold actual outgoing RTC packets, then deliver
 // through the original native channel. Simulation/poll/RAF continue normally.
 const nativeSend=RTCDataChannel.prototype.send;qa.heldRTC=[];qa.holdRTC=false;
 RTCDataChannel.prototype.send=function(data){const packet=data instanceof ArrayBuffer?new Uint8Array(data):ArrayBuffer.isView(data)?new Uint8Array(data.buffer,data.byteOffset,data.byteLength):null;
  // Fixed published wire header: MAGIC 0x314b4252, INPUT type 2. Keep CLOCK,
  // heartbeat and room control flowing so this models input latency, not loss.
  if(qa.holdRTC&&packet?.length>=12&&new DataView(packet.buffer,packet.byteOffset,packet.byteLength).getUint32(0,true)===0x314b4252&&packet[5]===2){const bytes=packet.slice();qa.heldRTC.push(()=>nativeSend.call(this,bytes));return}return nativeSend.call(this,data)};
 qa.releaseRTC=()=>{qa.holdRTC=false;for(const send of qa.heldRTC.splice(0))send()};
 class LocalRelay extends EventTarget{
  constructor(){super();this.readyState=0;this.subscriptions=new Map();this.bus=new BroadcastChannel(${JSON.stringify(namespace)});
   this.bus.onmessage=({data:event})=>{if(this.readyState!==1)return;for(const[id,filter]of this.subscriptions){if(filter.kinds?.includes(event.kind)&&filter['#d']?.includes(event.tags.find(t=>t[0]==='d')?.[1])){qa.relay.delivered++;this.deliver(['EVENT',id,event])}}};
   queueMicrotask(()=>{if(this.readyState===0){this.readyState=1;this.dispatchEvent(new Event('open'))}});
  }
  deliver(value){if(this.readyState===1)this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify(value)}))}
  send(text){if(this.readyState!==1)throw Error('Closed local relay');const[type,...args]=JSON.parse(text);
   if(type==='REQ'){this.subscriptions.set(args[0],args[1]);queueMicrotask(()=>this.deliver(['EOSE',args[0]]));return}
   if(type==='CLOSE'){this.subscriptions.delete(args[0]);return}
   if(type!=='EVENT')throw Error('Unexpected local relay operation '+type);
   const event=args[0];if(!/^[0-9a-f]{64}$/.test(event.id)||!/^[0-9a-f]{128}$/.test(event.sig))throw Error('Fixture must relay signed Nostr events');
   qa.relay.published++;this.bus.postMessage(event);queueMicrotask(()=>this.deliver(['OK',event.id,true,'']));
  }
  close(){if(this.readyState===3)return;this.readyState=3;this.subscriptions.clear();this.bus.close();this.dispatchEvent(new Event('close'))}
 }
 BloomOwnedSDK={...sdk,async createNostrPublicRoom(options){
  const room=await sdk.createNostrPublicRoom({...options,namespace:${JSON.stringify(namespace)},rtcConfig:{iceServers:[]},
   signalerFactory:async opts=>{const signaler=await sdk.createNostrSignaler({...opts,relays:['wss://fixture.invalid'],WebSocketImpl:LocalRelay});qa.signalers.push(signaler);return signaler},
   peerFactory:opts=>sdk.createWebRTCPeer({...opts,rtcConfig:{iceServers:[]}})});
  qa.rooms.push(room);return room;
 },createRoomSession(options){const session=sdk.createRoomSession({...options,onEvent:event=>{if(['membership-preparing','membership-committed','membership-failed','membership-connect-failed','partition-failed','transport-failed'].includes(event.type))qa.events.push({...event,atMs:Math.round(performance.now())});options.onEvent?.(event)}}),poll=session.poll.bind(session);qa.transitions=[];let previous='',lastAt=0;session.poll=function(...args){const result=poll(...args),tr=session._transition;if(tr||session.failure){const metrics=session.metrics,row={atMs:Math.round(performance.now()),stage:!tr?session.status:tr.replay?'replay':tr.stageJob?'prepare':tr.applied?'commit':tr.preparedState?'hash':tr.installSent?'install':tr.target!==null?'barrier':'mesh-prepare',epoch:session.epoch,elapsedMs:tr?Math.round(session.clock()-tr.startedAt):null,mesh:session.room.transports.size,expected:session.players.length-1,prepared:tr?.prepared.size,reached:tr?.reached.size,installed:tr?.installed.size,committed:tr?.committed.size,target:tr?.target,postBytes:tr?.postState?.length||0,replayTicks:metrics.bootstrapTicks,receivedBytes:metrics.receivedControlBytes,queuedBytes:metrics.controlQueuedBytes,maxBoundaryTaskMs:metrics.maxBoundaryTaskMs,failure:session.failure?.type||null},signature=JSON.stringify({...row,atMs:0,elapsedMs:0});if(signature!==previous||row.atMs-lastAt>=1000){qa.transitions.push(row);if(qa.transitions.length>48)qa.transitions.shift();previous=signature;lastAt=row.atMs}}return result};return session}};
 const apply=bloomAdapter.applyMembership,step=bloomAdapter.step;
 bloomAdapter.applyMembership=function(change){const result=apply(change);
  // This executes before the first SDK core captures its initial checkpoint.
  // Late joins/refresh load that actual snapshot; no joining actor gets the grant.
  if(CONFIG.session.mode==='online'&&change.reason==='initial'&&change.epoch===0){
   for(const camp of state.camps){camp.enabled=false;camp.spawned=true;camp.regrowth=[]}
   for(const unit of state.units)if(unit.team==='enemy'){unit.stun=1e6;unit.aggroAt=unit.wanderAt=state.time+1e6}
   const player=WorldPlayers.get(change.players[0]),data=WorldPlayers.data(player),m=player.leader;
   data.minerals=1234;Object.assign(data.campaign.abilities,{level:3,xp:abilityThreshold(3),chosen:2,ranks:{pod:1,lob:1},mods:{},draft:null});moaSyncLevelHP(m);m.hp=m.maxHp*.6;player.auto.enabled=false;
   rarityAcquire(player.accountOwner,'archer',1,2,m.x,m.y);
   const point=ThemedTerrain.safePoint(m.x-160,m.y,20),target=spawn('shellbug','enemy',point.x,point.y,{camp:0,rarityGrade:1});
   if(!target)throw Error('Initial durable encounter has no safe position');
   target.hp=target.maxHp=1e7;target.stun=1e6;target.aggroAt=target.wanderAt=state.time+1e6;target.qaDurable=true;target.qaRegion=player.startRegion;state.camps[0].remaining++;
   const types=['swordsman','shellbug','dandelion','archer'];for(let i=0;i<${loadUnits};i++){const angle=i*2.399963229728653,distance=40+Math.sqrt(i)*3,unit=spawn(types[i%types.length],'friendly',m.x+Math.cos(angle)*distance,m.y+Math.sin(angle)*distance,{rarityGrade:1});if(!unit)throw Error('Multiplayer load fixture spawn failed at '+i);unit.ownerId=BloomSimulation.ownerId;unit.stun=1e6;unit.aggroAt=unit.wanderAt=state.time+1e6}
   damage(m,target,17,'ranged');const flight=launchAbilityShot(target,11,{owner:m,start:{x:m.x-200,y:m.y-200,z:spatialHeight(m)+160},speed:1,range:1800,homing:true});flight.qaAdmissionFlight=true;
   rebuildGrid();spatialBoundary();bloomSnapshotStore.invalidate();
  }return result;
 };
 qa.combat=new Map();
 const observeImpact=impact;impact=function(shot){const target=idMap.get(shot.target),before=target?.hp,owner=WorldPlayers.all().find(p=>p.leader.id===shot.u),result=observeImpact(shot);if(owner&&shot.abilityShot&&!shot.weapon&&!shot.secondary&&!shot.qaAdmissionFlight&&Number.isFinite(before)){const stats=qa.combat.get(owner.playerId)||{samples:0,maxDistance:0,primaryDamage:0};stats.primaryDamage+=(before-(target?.hp??before));qa.combat.set(owner.playerId,stats)}return result};
 bloomAdapter.step=function(frame){
  // Declare each encounter at the first ordinary simulation step after its
  // participant arrives. Preplacing far-away ordinary enemies is invalid:
  // production WildSpawnRing correctly culls them before a late join occurs.
  let added=false;for(const player of WorldPlayers.all()){if(state.units.some(u=>u.qaRegion===player.startRegion))continue;const m=player.leader,point=ThemedTerrain.safePoint(m.x-160,m.y,20),target=spawn('shellbug','enemy',point.x,point.y,{camp:0,rarityGrade:1});target.hp=target.maxHp=1e7;target.stun=1e6;target.aggroAt=target.wanderAt=state.time+1e6;target.qaRegion=player.startRegion;state.camps[0].remaining++;added=true;}if(added){rebuildGrid();spatialBoundary();bloomSnapshotStore.invalidate();}
  const result=step(frame);
  for(const player of WorldPlayers.all()){const stats=qa.combat.get(player.playerId)||{samples:0,maxDistance:0,primaryDamage:0};for(const shot of projectiles){if(shot.u!==player.leader.id||shot.qaAdmissionFlight||!shot.abilityShot||shot.weapon||shot.secondary)continue;stats.samples++;stats.maxDistance=Math.max(stats.maxDistance,Math.hypot(shot.x-shot.startX,shot.y-shot.startY));}qa.combat.set(player.playerId,stats);}qa.lastInputs=frame.inputs.map(input=>({playerId:input.playerId,...bloomDecodeInput(input.input)}));
  if(qa.wanted.delete(bloomTick)){const bytes=bloomAdapter.save();qa.checkpoints.set(bloomTick,{tick:bloomTick,epoch:state.membershipEpoch,bytes:Array.from(bytes),hash:sdk.hashBytes(bytes),schema:BloomLiveCodec.decode(bytes).schema});while(qa.checkpoints.size>4)qa.checkpoints.delete(qa.checkpoints.keys().next().value)}return result;
 };
 qa.inspect=()=>{
  const session=BloomSimulation.session,local=WorldPlayers.local(),stats=local?currentMoaStats():null;
  return{phase:PublicSession.phase,tick:BloomSimulation.tick,time:state.time,sessionId:session.sessionId,localId:session.localPlayerId,coordinator:session.coordinatorId,epoch:session.epoch,roster:[...session.players],ready:session.ready,closed:session.closed,status:session.status,failure:session.failure??null,
   transitionHistory:qa.transitions,connection:PublicSession.inspect(),metrics:session.metrics,mode:BloomSimulation.sessionConfig.mode,netcodeMode:session.profile.mode,persistence:BloomSimulation.runtime.metrics.persistenceAvailable,paused,modal:modalKind,frames:__army.performance.frames,performance:{render:{...__army.performance,...ctx.stats()},terrain:{...ThemedTerrain.stats,cacheSize:themedTileCache.size},unitCount:state.units.length,view:{...view},canvas:{width:canvas.width,height:canvas.height},boot:globalThis.__qaBootTimeline,uploads:globalThis.__qaRenderUploads,visibility:{state:document.visibilityState,hidden:document.hidden,focused:document.hasFocus()}},backend:document.querySelector('#view').dataset.rendererBackend,fatal:BloomDiagnostics.fatal,diagnostics:BloomDiagnostics.fatal?BloomDiagnostics.snapshot():undefined,
   localView:local?{id:WorldView.player().playerId,leader:WorldView.leader().id,hudLeader:healthJuice.hud?.source?.id,level:stats.level,hp:stats.hp,army:ruiSummary().total}:null,
   players:WorldPlayers.all().map(p=>({id:p.playerId,owner:p.accountOwner,lifecycle:p.lifecycle,x:p.leader.x,y:p.leader.y,hp:p.leader.hp,level:WorldPlayers.data(p).campaign.abilities.level,chosen:WorldPlayers.data(p).campaign.abilities.chosen,minerals:WorldPlayers.data(p).minerals,army:rarityOwnedCount(p.accountOwner)})),
    combat:WorldPlayers.all().map(p=>({id:p.playerId,region:p.startRegion,...qa.combat.get(p.playerId),damage:state.units.filter(u=>u.qaRegion===p.startRegion).reduce((sum,u)=>sum+u.maxHp-u.hp,0)})),
    loopMetrics:BloomSimulation.runtime.metrics,preview:(()=>{const p=BloomSimulation.runtime.preview;return{phase:p.phase,enabled:p.enabled,error:p.error,captureMs:p.captureMs,captureBytes:p.captureBytes,scope:p.scope,capability:p.capability}})(),
   durable:state.units.filter(u=>u.qaDurable).map(u=>({id:u.id,hp:u.hp,maxHp:u.maxHp})),projectiles:projectiles.length,admissionFlights:projectiles.filter(p=>p.qaAdmissionFlight).map(p=>p.shotId),input:qa.lastInputs,events:qa.events.slice(-20)};
 };
})();`;
const app=runtimeSources.read(source.file,source.html);
assert(app.game.includes('/* MAIN_RUNTIME_TEST_HOOK */'),'Runtime fixture hook is required');
// Observe actual static/atlas upload durations, including the first boot frame.
const uploadProbe=`;(()=>{globalThis.__qaRenderUploads=[];const record=row=>{row.frame=globalThis.__army?.performance?.frames||0;__qaRenderUploads.push(row);if(__qaRenderUploads.length>80)__qaRenderUploads.shift()};const p=BloomGamekitRendering.WebGLDevice.prototype,upload=p.uploadVertices,texture=p.createTexture,target=p.createRenderTarget;p.uploadVertices=function(handle,data){const start=performance.now(),result=upload.call(this,handle,data),ms=performance.now()-start;record({kind:'vertex-buffer',bytes:data.byteLength,ms});return result};p.createTexture=function(source,options){const handle=texture.call(this,source,options),bytes=(source.width||0)*(source.height||0)*((options?.format==='luminance')?1:4);record({kind:'texture',width:source.width,height:source.height,bytes});return handle};p.createRenderTarget=function(width,height,options){const handle=target.call(this,width,height,options);record({kind:'render-target',width,height,bytes:width*height*4});return handle}})();`;
const game=app.game.replace('/* MAIN_RUNTIME_TEST_HOOK */',()=>uploadProbe+fixture);
assert.notEqual(game,app.game);
const instrumented=runtimeSources.response(app,game);
report.gameSourceSHA256=createHash('sha256').update(app.game).digest('hex');
report.testResponseSHA256=createHash('sha256').update(instrumented.html+game).digest('hex');
const server=createServer(runtimeSources.serve({'/public':instrumented}));
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`,pages=[],errors=[],unexpectedNetwork=[];
let browser,context;
const lastKnownStates=new Map();
let loadCpuProfiler=null;
function timing(stage,status,data={}){const row={at:new Date().toISOString(),elapsedMs:Math.round(performance.now()-runStarted),stage,status,...data};report.timings.push(row);const log={...row,pages:row.pages?.map(p=>({page:p.page,phase:p.phase,tick:p.tick,ready:p.ready,roster:p.roster,frames:p.performance.render.frames}))};console.log('BROWSER_STAGE '+JSON.stringify(log));return row}
async function bounded(promise,timeoutMs,label){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(label+' exceeded '+timeoutMs+'ms observation deadline')),timeoutMs)})])}finally{clearTimeout(timer)}}
const evaluate=(page,fn,arg,label='evaluate',timeoutMs=10000)=>bounded(page.evaluate(fn,arg),timeoutMs,'page '+(pages.indexOf(page)+1)+' '+label);
const read=async page=>{const state=await evaluate(page,()=>__sharedBrowser.inspect());lastKnownStates.set(page,state);return state};
const readWithTimeout=async(page,timeoutMs)=>{const state=await evaluate(page,()=>__sharedBrowser.inspect(),undefined,'read state',timeoutMs);lastKnownStates.set(page,state);return state};
const phaseSummary=state=>({phase:state.phase,mode:state.mode,tick:state.tick,ready:state.ready,roster:state.roster.length,performance:state.performance});
async function phase(label,operation){const start=performance.now();timing(label,'begin');try{const result=await operation();timing(label,'complete',{durationMs:Math.round(performance.now()-start)});return result}catch(error){timing(label,'failed',{durationMs:Math.round(performance.now()-start),error:error.message});throw error}}
async function samplePhase(label,active){const states=await Promise.all(active.map(read));timing(label,'state',{pages:states.map((state,index)=>({page:pages.indexOf(active[index])+1,...phaseSummary(state)}))});return states}
const player=(state,id)=>{const found=state.players.find(p=>p.id===id);assert(found,'Missing participant '+id);return found};
const record=(label,data)=>{report.checks.push(label);console.log('PASS '+label+' '+JSON.stringify({at:new Date().toISOString(),elapsedMs:Math.round(performance.now()-runStarted),...(data?{details:data}:{})}))};
function profileSummary(values){if(!values.length)return{count:0,p50Ms:0,p95Ms:0,maxMs:0};const sorted=[...values].sort((a,b)=>a-b);return{count:values.length,p50Ms:Math.round(sorted[Math.floor((sorted.length-1)*.5)]*100)/100,p95Ms:Math.round(sorted[Math.floor((sorted.length-1)*.95)]*100)/100,maxMs:Math.round(sorted.at(-1)*100)/100}}
async function until(predicate,label,timeoutMs=60000){
 const end=Date.now()+timeoutMs;
 for(;;){
  const remaining=end-Date.now();if(remaining<=0)throw Error(label+' timed out');
  const matches=await bounded(Promise.resolve().then(predicate),remaining,label);
  assert.deepEqual(errors,[],'Browser page/console errors');assert.deepEqual(unexpectedNetwork,[],'Fixture attempted external networking');
  if(matches)return;
  await new Promise(resolve=>setTimeout(resolve,Math.min(100,Math.max(0,end-Date.now()))));
 }
}
async function addPage(){
 const number=pages.length+1,page=await phase('page '+number+' create',()=>context.newPage());pages.push(page);await page.bringToFront();
 page.on('pageerror',error=>errors.push({page:number,type:'pageerror',message:error.message}));
 page.on('console',message=>{if(message.text().startsWith('ASSET_UPLOAD '))console.log('PAGE '+number+' '+message.text());if(message.type()==='error')errors.push({page:number,type:'console',message:message.text()})});
 await phase('page '+number+' navigation/load',()=>page.goto(base+'/public',{waitUntil:'domcontentloaded',timeout:120000}));
 await phase('page '+number+' boot/first WebGL frames',()=>page.waitForFunction(()=>globalThis.BloomSimulation?.runtime?.ready&&globalThis.__army?.performance.frames>2,null,{timeout:60000}));
 assert.equal(await evaluate(page,()=>typeof BloomOwnedSDK.createNostrPublicRoom),'function','Pinned SDK must include public-room API');
 assert.equal((await read(page)).backend,'WebGL');await samplePhase('page '+number+' booted',[page]);return page;
}
async function ready(active,count=active.length,whileJoining){
 await phase('ready '+count+' participants',()=>until(async()=>{
  const states=await Promise.all(active.map(read));
  for(const state of states){assert(!state.fatal&&!state.failure,JSON.stringify(state));assert.notEqual(state.phase,'failed',JSON.stringify(state))}
  const committed=states.every(state=>state.phase==='playing'&&state.ready&&state.roster.length===count)&&new Set(states.map(state=>state.sessionId)).size===1;
  if(!committed)await whileJoining?.(states);return committed;
 },count+' participants commit the same room'));
 await samplePhase('ready '+count+' participants',active);
}
async function ticks(active,count){const target=Math.max(...(await Promise.all(active.map(read))).map(s=>s.tick))+count;await phase('production ticks reach '+target,()=>until(async()=>(await Promise.all(active.map(read))).every(s=>s.tick>=target&&!s.failure),'production ticks reach '+target));return target}
async function checkpoint(active,label){
 await ready(active);
 // Observe future completed boundaries. The test never pauses, advances, edits,
 // or replaces a running session to make peer states appear equal.
 const target=Math.max(...(await Promise.all(active.map(read))).map(s=>s.tick))+20;
 await Promise.all(active.map(page=>evaluate(page,t=>{if(BloomSimulation.tick>=t)throw Error('Capture target was missed');__sharedBrowser.wanted.add(t)},target)));
 await until(async()=>(await Promise.all(active.map(page=>evaluate(page,t=>__sharedBrowser.checkpoints.has(t),target)))).every(Boolean),'capture '+label);
 const captured=await Promise.all(active.map(page=>evaluate(page,t=>__sharedBrowser.checkpoints.get(t),target)));
 assert.equal(new Set(captured.map(s=>s.epoch)).size,1,'Checkpoint membership epochs');
 for(const state of captured){assert.equal(state.schema,'budmori-world');assert.deepEqual(Buffer.from(state.bytes),Buffer.from(captured[0].bytes),'Full canonical bytes differ at '+label)}
 report.checkpoints.push({label,tick:target,epoch:captured[0].epoch,players:active.length,hash:captured[0].hash,bytes:captured[0].bytes.length});
}
async function transitionCheckpoint(label,active){
 const states=await Promise.all(active.map(read));report.transitionCheckpoints??=[];
 for(const state of states){assert.equal(state.connection.transitionTimeoutMs,30000);for(const sample of state.transitionHistory||[])assert(sample.elapsedMs===null||sample.elapsedMs<30000,'Successful transition stays inside configured total deadline');}
 report.transitionCheckpoints.push({label,pages:states.map((state,index)=>({page:pages.indexOf(active[index])+1,budgetMs:state.connection.transitionTimeoutMs,history:state.transitionHistory,events:state.events,metrics:state.metrics}))});
}
async function screenshot(page,name,timeout){const path=fileURLToPath(new URL('./'+name,import.meta.url));await phase('screenshot '+name,()=>page.screenshot({path,...(timeout?{timeout}:{})}));report.screenshots.push(name)}
// Real tab focus can invoke the game's ordinary blur-to-pause behavior.
// Resume through visible UI rather than changing simulation/presentation flags.
async function focusAndResume(page){
 await page.bringToFront();const state=await read(page);
 if(state.modal==='pause')await page.locator('#sheet .primary[data-action="close"]').click();
 else assert.equal(state.modal,'','Unexpected dialog while resuming a player');
 await until(async()=>{const s=await read(page);return !s.paused&&!s.modal},'focused player resumes through UI');
}
async function openPause(page){
 await page.bringToFront();const state=await read(page);
 if(!state.modal)await page.locator('#pause').click();
 else assert.equal(state.modal,'pause','Unexpected dialog before pause menu');
 await until(async()=>(await read(page)).modal==='pause','visible pause menu');
}
async function startPublic(page){const number=pages.indexOf(page)+1;await phase('page '+number+' Public Start click',()=>page.locator('[data-action="start"]').click());}
try{
 // Preserve native window visibility/occlusion: disabling it masks the real
 // minimized-window event we need to verify. Background timers still run.
 browser=await phase('Chromium launch',()=>chromium.launch({headless:!headed,timeout:120000,...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{}),args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding']}));
 context=await phase('browser context',()=>browser.newContext({viewport:{width:720,height:640},deviceScaleFactor:1}));
 await context.addInitScript(()=>{const timeline=globalThis.__qaBootTimeline={createdMs:performance.now(),events:[]};for(const type of ['DOMContentLoaded','load'])addEventListener(type,()=>timeline.events.push({type,elapsedMs:performance.now()-timeline.createdMs}),{once:true})});
 await context.route('**/*',route=>{if(new URL(route.request().url()).origin===base)return route.continue();unexpectedNetwork.push(route.request().url());return route.abort()});
 report.fontAssetFixture=await fontAssets.install(context);
 await moduleReferences.install(context,source.html,rollbackCandidateBytes?{'rollback-netcode':rollbackCandidateBytes}:{});
 await context.routeWebSocket('**/*',socket=>{unexpectedNetwork.push(socket.url());return socket.close()});
 const host=await addPage();
 const soloBefore=await evaluate(host,()=>localStorage.getItem(CONFIG.saveKey));
 await startPublic(host);await ready([host]);await ticks([host],4);
 const initial=await read(host),hostId=initial.localId;
 assert.equal(initial.mode,'online');assert.equal(initial.persistence,false);assert.equal(initial.roster.length,1);assert(initial.time>0);
 assert.equal(await evaluate(host,()=>localStorage.getItem(CONFIG.saveKey)),soloBefore,'Public Start must not overwrite the solo save');
 assert.equal(await evaluate(host,()=>PublicSession.inspect().inputBufferMs),100);
 assert.equal(initial.admissionFlights.length,1);
 assert(initial.durable.length===1&&initial.durable[0].hp<initial.durable[0].maxHp&&initial.projectiles>0);
 record('Public Start creates a ticking one-player world with fresh public identity and 100ms input buffer');
 await host.keyboard.down('KeyD');await ticks([host],4);
 const moving=await read(host);assert(player(moving,hostId).x>player(initial,hostId).x+1,'Host real keyboard movement '+JSON.stringify(await evaluate(host,()=>({held:[...keys],target:document.activeElement?.id,advance:BloomSimulation.runtime.metrics.advanceStatus,frames:__army.performance.frames,latest:BloomSimulation.session.localInputState.capture?.input&&bloomDecodeInput(BloomSimulation.session.localInputState.capture.input)}))));await host.keyboard.up('KeyD');
 const guest=await addPage();await startPublic(guest);
 await guest.locator('[data-public="cancel"]').click();await guest.locator('[data-action="start"]').waitFor({state:'visible'});await startPublic(guest);
 record('Actual Cancel followed by Start abandons the previous discovery and can join normally');
 // Opening a tab can release held actions on blur. Reapply genuine keyboard
 // input during the asynchronous public discovery/admission window.
 await focusAndResume(host);let admissionKey='KeyD';const admissionOrigin=player(moving,hostId).x,admissionRange=[admissionOrigin,admissionOrigin];await host.keyboard.down(admissionKey);
 // Continue genuine movement while joining, reversing near the encounter.
 // Otherwise a slow handshake legitimately takes the host out of the spawn
 // ring and the production game retires the supposedly "durable" fixture.
 await focusAndResume(host);await host.keyboard.up(admissionKey);await host.keyboard.down(admissionKey);
 try{await ready([host,guest],2,async states=>{const x=player(states[0],hostId).x;admissionRange[0]=Math.min(admissionRange[0],x);admissionRange[1]=Math.max(admissionRange[1],x);const next=x>admissionOrigin+60?'KeyA':x<admissionOrigin-60?'KeyD':admissionKey;if(next!==admissionKey){await host.keyboard.up(admissionKey);admissionKey=next;await host.keyboard.down(admissionKey)}})}finally{await host.keyboard.up(admissionKey)}
 await host.keyboard.down('KeyD');
 await ticks([host,guest],3);await host.keyboard.up('KeyD');
 const pair=await Promise.all([host,guest].map(read)),guestId=pair[1].localId;
 assert.notEqual(hostId,guestId);assert.equal(pair[0].sessionId,initial.sessionId);assert(pair[0].tick>moving.tick&&pair[0].time>moving.time);assert(admissionRange[1]-admissionRange[0]>10,'Host keeps visibly moving across late admission');
 assert.notEqual(player(pair[0],hostId).owner,player(pair[0],guestId).owner);
 assert(Math.hypot(player(pair[0],hostId).x-player(pair[0],guestId).x,player(pair[0],hostId).y-player(pair[0],guestId).y)>1500,'Distinct public start regions');
 assert.equal(pair[0].durable[0].id,initial.durable[0].id);assert(pair[0].durable[0].hp<=initial.durable[0].hp);assert.deepEqual(pair[0].admissionFlights,initial.admissionFlights,'The specific slow physical flight survives late admission');
 assert.equal(player(pair[0],guestId).level,1);assert.equal(player(pair[0],guestId).army,0);
 record('Second browser tab joins while the first moves and combat remains in flight');
 if(loadUnits){
  const holdMs=Number(process.env.BUDMORI_LOAD_HOLD_MS||8000);assert(Number.isSafeInteger(holdMs)&&holdMs>=1000&&holdMs<=30000,'BUDMORI_LOAD_HOLD_MS must be 1000..30000');
   const before=await Promise.all([host,guest].map(read)),checkpointTick=Math.max(...before.map(state=>state.tick))+8,started=performance.now();
   await Promise.all([host,guest].map(page=>evaluate(page,tick=>{if(BloomSimulation.tick>=tick)throw Error('Load checkpoint target was missed');__sharedBrowser.wanted.add(tick)},checkpointTick,'arm loaded checkpoint',30000)));
   if(loadProfile){await evaluate(host,()=>BloomDiagnostics.setProfiler(true),undefined,'enable render-stage profiler',30000);loadCpuProfiler=await context.newCDPSession(host);await loadCpuProfiler.send('Profiler.enable');await loadCpuProfiler.send('Profiler.setSamplingInterval',{interval:1000});await loadCpuProfiler.send('Profiler.start')}
  await host.keyboard.down('KeyD');await guest.keyboard.down('KeyS');await new Promise(resolve=>setTimeout(resolve,holdMs));await host.keyboard.up('KeyD');await guest.keyboard.up('KeyS');
   const elapsedMs=performance.now()-started,observations=await Promise.all([host,guest].map(async page=>{const observedAt=performance.now(),state=await readWithTimeout(page,30000);return{state,observationMs:Math.round(performance.now()-observedAt)}})),after=observations.map(row=>row.state);
   let diagnostics=null;if(loadCpuProfiler){const {profile}=await loadCpuProfiler.send('Profiler.stop');await loadCpuProfiler.detach();loadCpuProfiler=null;const samples=new Map(),nodes=new Map(profile.nodes.map(node=>[node.id,node]));for(let i=0;i<profile.samples.length;i++){const id=profile.samples[i],delta=profile.timeDeltas?.[i]??1000;samples.set(id,(samples.get(id)||0)+delta)}const topCpu=[...samples].map(([id,us])=>{const callFrame=nodes.get(id)?.callFrame||{};let url=callFrame.url||'';try{url=new URL(url).pathname}catch{}return{function:callFrame.functionName||'(anonymous)',url,line:callFrame.lineNumber??null,selfMs:Math.round(us/1000*100)/100}}).sort((a,b)=>b.selfMs-a.selfMs).slice(0,25);const profiler=await evaluate(host,()=>{const data=BloomDiagnostics.snapshot().runtime.profiler;BloomDiagnostics.setProfiler(false);return data.summary},undefined,'read render-stage profile',30000);diagnostics={scope:'Host-page Chromium V8 CPU sampling plus in-game render-stage profiler; diagnostic overhead applies, not used as speed score',sampleCount:profile.samples.length,topCpu,renderStages:profiler}}
  for(let i=0;i<2;i++){const state=after[i];assert(!state.fatal&&!state.failure,JSON.stringify(state));assert.equal(state.roster.length,2);assert.equal(state.backend,'WebGL');assert(state.tick>before[i].tick);assert(state.frames>before[i].frames)}
  assert(after.every(state=>state.input.some(input=>input.playerId===hostId)&&state.input.some(input=>input.playerId===guestId)),'Both peers continue submitting actual inputs under load');
    const targetTPS=await evaluate(host,()=>BloomSimulation.tickRate);
    const checkpoints=await Promise.all([host,guest].map(page=>evaluate(page,tick=>__sharedBrowser.checkpoints.get(tick)||null,checkpointTick,'read loaded checkpoint',30000)));assert(checkpoints.every(Boolean),'Both peers must capture the same loaded-world checkpoint');for(const checkpoint of checkpoints){assert.equal(checkpoint.tick,checkpointTick);assert.equal(checkpoint.schema,'budmori-world')}assert.deepEqual(Buffer.from(checkpoints[0].bytes),Buffer.from(checkpoints[1].bytes),'Loaded-world peers diverged at the measured checkpoint');
    const loopTraces=await Promise.all([host,guest].map(page=>evaluate(page,()=>__sharedBrowser.loopSamples.slice(),undefined,'read tick timings',30000)));
    const loopWork=loopTraces.map((samples,index)=>{const selected=samples.filter(sample=>sample.tick>before[index].tick&&sample.tick<=after[index].tick);return{page:index+1,samples:selected.length,tick:profileSummary(selected.map(sample=>sample.tickMs)),presentation:profileSummary(selected.map(sample=>sample.presentationMs))}});
    const previewDeltas=after.map((state,index)=>{const old=before[index].preview||{},newer=state.preview||{},oldScope=old.scope||{},newScope=newer.scope||{},oldCapability=old.capability||{},newCapability=newer.capability||{};return{page:index+1,captureMs:Math.round(((newer.captureMs||0)-(old.captureMs||0))*100)/100,captureBytes:(newer.captureBytes||0)-(old.captureBytes||0),installs:(newScope.installs||0)-(oldScope.installs||0),installMs:Math.round(((newScope.installMs||0)-(oldScope.installMs||0))*100)/100,restoreReuses:(newScope.restoreReuses||0)-(oldScope.restoreReuses||0),steps:(newScope.steps||0)-(oldScope.steps||0),stepMs:Math.round(((newScope.stepMs||0)-(oldScope.stepMs||0))*100)/100,corrections:(newCapability.corrections||0)-(oldCapability.corrections||0),correctionMs:Math.round(((newCapability.correctionMs||0)-(oldCapability.correctionMs||0))*100)/100,confirmedAdvances:(newCapability.confirmedAdvances||0)-(oldCapability.confirmedAdvances||0)}});
    report.checkpoints.push({label:'loaded-two-player-world',tick:checkpointTick,epoch:checkpoints[0].epoch,players:2,hash:checkpoints[0].hash,bytes:checkpoints[0].bytes.length});
    report.multiplayerLoad={units:loadUnits,previewMode:loadPreview,holdMs,elapsedMs:Math.round(elapsedMs),mode:after[0].netcodeMode,targetTPS,performanceStatus:after.every((state,index)=>(state.tick-before[index].tick)*1000/elapsedMs>=targetTPS)?'MEETS_TARGET':'BELOW_TARGET',checkpoint:{tick:checkpointTick,hash:checkpoints[0].hash,bytes:checkpoints[0].bytes.length},peers:after.map((state,index)=>({page:index+1,ticks:state.tick-before[index].tick,frames:state.frames-before[index].frames,effectiveTPS:Math.round((state.tick-before[index].tick)*1000/elapsedMs*100)/100,effectiveFPS:Math.round((state.frames-before[index].frames)*1000/elapsedMs*100)/100,renderCpuMs:Math.round((state.performance.render.renderMs-before[index].performance.render.renderMs)*100)/100,renderCpuMsPerFrame:state.frames===before[index].frames?null:Math.round((state.performance.render.renderMs-before[index].performance.render.renderMs)/(state.frames-before[index].frames)*100)/100,observationMs:observations[index].observationMs,unitCount:state.performance.unitCount,fatal:state.fatal})),loopWork,previewDeltas,preview:after.map(state=>state.preview),...(diagnostics?{diagnostics}:{})};
   const transport=await Promise.all([host,guest].map(page=>evaluate(page,async()=>{const room=__sharedBrowser.rooms.at(-1),connections=[];for(const[id,pc]of room.peerConnections){const channels=[];(await pc.getStats()).forEach(row=>{if(row.type==='data-channel')channels.push({label:row.label,state:row.state,bytesSent:row.bytesSent,bytesReceived:row.bytesReceived})});connections.push({id,native:pc instanceof RTCPeerConnection,state:pc.connectionState,channels})}return connections},undefined,'loaded RTC stats',30000)));
  assert.equal(transport.reduce((sum,connections)=>sum+connections.length,0),2);for(const connections of transport)for(const pc of connections){assert(pc.native&&pc.state==='connected');assert(pc.channels.some(channel=>channel.bytesSent>0&&channel.bytesReceived>0))}
  report.multiplayerLoad.transport=transport;record('Real two-peer RTC loaded-world soak preserves live inputs and canonical checkpoint equality',report.multiplayerLoad);report.status='PASS';
 }else{
 await checkpoint([host,guest],'late-join-two');
 await focusAndResume(guest);
 await evaluate(host,()=>{__sharedBrowser.holdRTC=true});
 try{
  report.inputPreviewWaiting=await exerciseInputPreviewFlow(guest,{waiting:true,release:()=>evaluate(host,()=>__sharedBrowser.releaseRTC())});
 }finally{await evaluate(host,()=>__sharedBrowser.releaseRTC())}
 record('Real RTC input wait preserves authority while local preview responds and commands confirm once');
 await checkpoint([host,guest],'input-preview-after-rtc-delay');
 if(headed){
  await focusAndResume(host);await host.keyboard.down('KeyD');await ticks([host,guest],2);
  const nativeWindow=await context.newCDPSession(host),windowInfo=await nativeWindow.send('Browser.getWindowForTarget');
  try{
   // Playwright's default focused/active emulation masks native visibility.
   // Turn off that override, then let actual minimization deliver the event.
   await nativeWindow.send('Emulation.setFocusEmulationEnabled',{enabled:false});
   await nativeWindow.send('Browser.setWindowBounds',{windowId:windowInfo.windowId,bounds:{windowState:'minimized'}});
   report.nativeMinimize=await nativeWindow.send('Browser.getWindowBounds',{windowId:windowInfo.windowId});
   await until(async()=>await evaluate(host,()=>(document.hidden||!document.hasFocus())&&paused),'Native window minimization blurs local controls',5000);
   await assertInputPreviewCleared(host);await ticks([host,guest],4);
   const inactive=await read(host),inactiveInput=inactive.input.find(input=>input.playerId===hostId);
   assert(inactiveInput?.suspended&&inactiveInput.x===0&&inactiveInput.y===0,'Native hidden window releases cached held movement while the public world keeps ticking');
   report.inactiveWindow={windowId:windowInfo.windowId,visibility:inactive.performance.visibility,tick:inactive.tick,input:inactiveInput};
  }finally{await nativeWindow.send('Browser.setWindowBounds',{windowId:windowInfo.windowId,bounds:{windowState:windowInfo.bounds.windowState}});await nativeWindow.send('Emulation.setFocusEmulationEnabled',{enabled:true});await nativeWindow.detach();await host.keyboard.up('KeyD')}
  await focusAndResume(host);record('Native window minimization clears cached held input and preview while the public world continues');
 }else report.limitations.push('Native minimized-window visibility is not exercised in explicit headless mode.');
  if(!loadUnits){
  // Optional real-clock soak beyond the reported ~94s renderer failure. Keep
  // ordinary SDK timers/RAF and check both peers, without advancing test clocks.
 const soakMs=Number(process.env.BUDMORI_TWO_PLAYER_SOAK_MS||0);
 assert(Number.isFinite(soakMs)&&soakMs>=0,'BUDMORI_TWO_PLAYER_SOAK_MS must be nonnegative');
 if(soakMs){
  const before=await Promise.all([host,guest].map(read)),started=performance.now();
  await until(async()=>{const states=await Promise.all([host,guest].map(read));for(const state of states){assert(!state.fatal&&!state.failure,JSON.stringify(state));assert.equal(state.roster.length,2);assert.equal(state.backend,'WebGL')}return performance.now()-started>=soakMs},'two-player WebGL soak',soakMs+20000);
  const after=await Promise.all([host,guest].map(read));for(let i=0;i<2;i++){assert(after[i].tick>before[i].tick);assert(after[i].frames>before[i].frames)}
  report.twoPlayerSoak={elapsedMs:Math.round(performance.now()-started),peers:after.map((s,i)=>({ticks:s.tick-before[i].tick,frames:s.frames-before[i].frames,render:s.performance.render}))};
  record('Two-player WebGL rendering and simulation continue through real-clock soak',report.twoPlayerSoak);await checkpoint([host,guest],'two-player-soak');
  }
 for(const [page,id,label]of [[guest,guestId,'two-player-guest'],[host,hostId,'two-player-coordinator']]){const before=await read(page);await page.reload({waitUntil:'load'});await page.waitForFunction(()=>globalThis.__sharedBrowser?.inspect&&globalThis.BloomSimulation?.runtime?.ready,undefined,{timeout:15000});await ready([host,guest]);await ticks([host,guest],4);const after=await read(page);assert.equal(after.localId,id);assert.equal(after.sessionId,before.sessionId);assert.equal(after.roster.length,2);await checkpoint([host,guest],label+'-refresh');await transitionCheckpoint(label,[host,guest]);}
 record('Two-player guest and coordinator reload both preserve identity and resume through the production-paced handshake');
 for(const state of await Promise.all([host,guest].map(read))){const own=player(state,state.localId);assert.equal(state.localView.id,state.localId);assert.equal(state.localView.leader,own.owner);assert.equal(state.localView.hudLeader,state.localView.leader);assert.equal(state.localView.level,own.level);assert.equal(state.localView.hp,own.hp);assert.equal(state.localView.army,own.army)}
 assert.notEqual(pair[0].localView.level,pair[1].localView.level);
 await openPause(host);await host.locator('[data-moa-stats]').click();
 await openPause(guest);await guest.locator('[data-moa-stats]').click();
 assert.match(await host.locator('#sheet').innerText(),/레벨\s*3/);assert.match(await guest.locator('#sheet').innerText(),/레벨\s*1/);
 await screenshot(host,'multiplayer-host-hud.png');await screenshot(guest,'multiplayer-guest-hud.png');
 record('Each real DOM stats panel and WebGL HUD selects its own leader, HP, progression, and army');
 await guest.keyboard.press('Escape');await guest.waitForFunction(()=>!document.querySelector('#modal').classList.contains('show'));
 await host.keyboard.down('KeyD');await guest.keyboard.down('KeyS');await ticks([host,guest],4);
 const menuBefore=await read(host);await ticks([host,guest],8);const menuAfter=await read(host);
 const neutral=menuAfter.input.find(input=>input.playerId===hostId);assert(neutral?.suspended&&neutral.x===0&&neutral.y===0,'Menu input must be neutral even while a key is held');
 assert(menuAfter.time>menuBefore.time);assert(player(menuAfter,guestId).y>player(menuBefore,guestId).y+1,'Other player moves while host menu is open');
 assert(menuAfter.projectiles>0);assert.equal(menuAfter.modal,'moaStats');
 await host.keyboard.up('KeyD');await guest.keyboard.up('KeyS');await host.bringToFront();await host.locator('#sheet .primary[data-action="close"]').click();await host.locator('#modal.show').waitFor({state:'hidden'});
 record('Host menu neutralizes only its own input; other movement and shared combat continue');
 // One stable two-player journey: admission, combat, both reloads, then leave.
 // Peer-count cross products and repeated five-peer reloads are not retained.
 await focusAndResume(host);
 const encounter=await evaluate(host,()=>{const p=WorldPlayers.local(),target=state.units.find(u=>u.qaRegion===p.startRegion);if(!target)throw Error('Durable user encounter was retired');return{x:target.x,y:target.y}}),returnKeys=new Set();
 try{await until(async()=>{const p=player(await read(host),hostId),dx=encounter.x-p.x,dy=encounter.y-p.y;if(Math.hypot(dx,dy)<180)return true;const wanted=new Set([...(Math.abs(dx)>80?[dx>0?'KeyD':'KeyA']:[]),...(Math.abs(dy)>80?[dy>0?'KeyS':'KeyW']:[])]);for(const k of [...returnKeys])if(!wanted.has(k)){await host.keyboard.up(k);returnKeys.delete(k)}for(const k of wanted)if(!returnKeys.has(k)){await host.keyboard.down(k);returnKeys.add(k)}return false},'Host walks back into combat through real input',10000)}finally{for(const k of returnKeys)await host.keyboard.up(k)}
 await until(async()=>(await Promise.all(pages.map(read))).every(s=>s.combat.length===2&&s.combat.every(c=>c.samples>0&&c.maxDistance>50&&c.primaryDamage>0&&c.damage>0)),'Natural primary shots travel and damage at both start regions',15000);
 report.combat=await Promise.all(pages.map(async page=>(await read(page)).combat));
 record('Real timer-driven combat at both start regions creates physical flights beyond 50 units and damages targets on both peers');
 await checkpoint(pages,'two-player-world');
 const pairViews=await Promise.all(pages.map(read));assert.equal(new Set(pairViews.map(s=>s.localId)).size,2);
 for(const state of pairViews){assert.equal(state.backend,'WebGL');assert(state.frames>10);assert.equal(state.localView.id,state.localId);assert.equal(state.localView.hudLeader,state.localView.leader)}
 await screenshot(host,'multiplayer-two-player-world.png');
 const transport=await Promise.all(pages.map(page=>evaluate(page,async()=>{
  const room=__sharedBrowser.rooms.at(-1),connections=[];
  for(const [id,pc]of room.peerConnections){const rows=[];(await pc.getStats()).forEach(row=>{if(row.type==='data-channel')rows.push({label:row.label,state:row.state,bytesSent:row.bytesSent,bytesReceived:row.bytesReceived})});connections.push({id,native:pc instanceof RTCPeerConnection,state:pc.connectionState,channels:rows})}
  return{connections,relay:__sharedBrowser.relay,verification:__sharedBrowser.signalers.map(s=>s.metrics)};
 })));
 assert.equal(transport.reduce((sum,p)=>sum+p.connections.length,0),2,'Two-player real RTC has one bidirectional link');
 for(const page of transport){assert(page.relay.published>0&&page.relay.delivered>0);assert(page.verification.some(v=>v.verified>0),'SDK verifies signed Nostr events');for(const pc of page.connections){assert(pc.native&&pc.state==='connected');assert(pc.channels.some(channel=>channel.bytesSent>0&&channel.bytesReceived>0),'Real RTC data flows both ways')}}
 report.transport=transport;record('Two WebGL tabs share canonical bytes over a real RTC link with verified Nostr signatures');
 // The actual public-menu button owns graceful departure and solo restoration.
 await openPause(host);
 await host.locator('[data-public="solo"]').click();
 const remaining=pages.slice(1);
 await until(async()=>{const states=await Promise.all(remaining.map(read));return new Set(states.map(s=>s.coordinator)).size===1&&states.every(s=>s.ready&&s.sessionId===initial.sessionId&&s.roster.length===1&&!s.roster.includes(hostId)&&s.coordinator!==hostId)},'Graceful coordinator succession');
 await host.waitForFunction(()=>PublicSession.phase==='idle'&&BloomSimulation.sessionConfig.mode==='local'&&!__army.paused);
 assert.equal(await evaluate(host,()=>PublicSession.phase),'idle');
 assert.equal(await evaluate(host,()=>sessionStorage.getItem('budmori-public-active-v1')),null);
 assert.equal(await evaluate(host,()=>Object.keys(sessionStorage).filter(key=>key.startsWith('budmori-public-resume-v1')).length),0,'Explicit leave must forget room credentials');
 await ticks(remaining,10);await checkpoint(remaining,'coordinator-left');
 const successor=await read(guest);assert.equal(player(successor,hostId).lifecycle,'left');
  await screenshot(guest,'multiplayer-successor-world.png');record('Graceful coordinator leave forgets resume data and remaining players keep the same ticking world');
  }
  }
 assert.deepEqual(errors,[]);assert.deepEqual(unexpectedNetwork,[]);report.status='PASS';
}catch(error){
 report.status='FAIL';report.failure=error.stack||String(error);process.exitCode=1;console.error(error);
 // State observations are independent of GPU/compositor screenshots. Preserve
 // the last successful sample even when the renderer cannot answer JavaScript.
 report.lastStates=await Promise.all(pages.map(async(page,index)=>{try{return{page:index+1,current:await read(page)}}catch(error){return{page:index+1,unavailable:error.message,lastKnown:lastKnownStates.get(page)??null}}}));
 console.error('BROWSER_FAILURE_STATES '+JSON.stringify(report.lastStates.map(p=>({page:p.page,unavailable:p.unavailable,current:p.current?{phase:p.current.phase,tick:p.current.tick,status:p.current.status,failure:p.current.failure,paused:p.current.paused,modal:p.current.modal}:undefined}))));
 await writeFile(new URL('./multiplayer-browser-report.json',import.meta.url),JSON.stringify(report,null,2));
 report.failedScreenshots=await Promise.all(pages.map(async(page,index)=>{try{await screenshot(page,`multiplayer-failure-${index+1}.png`,5000);return null}catch(error){return{page:index+1,error:error.message}}}));
}finally{
 report.browserErrors=errors;report.unexpectedNetwork=unexpectedNetwork;
 report.elapsedMs=Math.round(performance.now()-runStarted);
 await writeFile(new URL('./multiplayer-browser-report.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,failure:report.failure,elapsedMs:report.elapsedMs,checks:report.checks,checkpoints:report.checkpoints,report:'tests/multiplayer-browser-report.json'}));
 await context?.close();await browser?.close();await new Promise(resolve=>server.close(resolve));
}
