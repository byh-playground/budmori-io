import {Garden,CONFIG,TREE_NODES,ArenaGeometry,ATTACK_TYPES,Ballistics} from './farm-model.js';
import {Diorama} from './farm-renderer.js';
import {FarmSession} from './farm-session.js';
import {FarmStorage} from './farm-storage.js';
import {FarmAutosave} from './farm-autosave.js';
import {snapshot,restore} from './farm-state.js';
import {PRODUCT_VERSION} from './version.js';
import {FoodFeel} from './food-feel.js';
import {CombatFeel} from './combat-feel.js';
import {raidRosterEntries,hasRaidRosterEntries} from './raid-roster.js';
import {createAbilityRuntimeSnapshot} from './ability-state.js';
import {renderAbilityTreeMarkup} from './ability-tree.js';
import {abortReservedRaidRun,reserveRaidRun,settleRaidOwnerFarm} from './raid-settlement.js';
import {settleBossKill} from './boss-rewards.js';
const $=id=>document.getElementById(id),storage=new FarmStorage();
let networkTimer=null,observedWorld=null;
let imported=null,importedLegacy=false;
let active=null,home=true,attempt=null,room=null,solo=null,personalGarden=null,noticeSequence=0,treePause=false,abilityPause=false,dropPointer=null,dropTimer=null;
const renderer=new Diorama($('world'));
const measuredFrames=[];let lastFrameTimestamp=null,frameCount=0;
function measureFrame(now){if(lastFrameTimestamp!==null){measuredFrames.push(now-lastFrameTimestamp);if(measuredFrames.length>240)measuredFrames.shift()}lastFrameTimestamp=now;frameCount++}
function frameRate(){const sorted=[...measuredFrames].sort((a,b)=>a-b),sum=measuredFrames.reduce((a,b)=>a+b,0);return{frames:frameCount,fps:sum?measuredFrames.length*1000/sum:0,frametimeMs:{p50:sorted[Math.floor((sorted.length-1)*.5)]||0,p95:sorted[Math.floor((sorted.length-1)*.95)]||0,max:Math.max(0,...measuredFrames)}}}
const fail=error=>{$('error').hidden=false;$('error').textContent='정원을 진행하지 못했어요. '+error.message;console.error(error);if(active&&!room)active.paused=true};
function writeCheckpoint(world=personalGarden){if(!world)return false;const ok=storage.save(world);$('saveNotice').textContent=ok?'':storage.error;$('treeStorage').hidden=ok;return ok}
const autosave=new FarmAutosave(()=>writeCheckpoint());
function saveImmediate(world=personalGarden){const ok=writeCheckpoint(world);if(ok)autosave.reset();return ok}
function markPersistentChange(world){if(world===personalGarden)autosave.markDirty()}
function persist(){if(active?.world===personalGarden&&!room)active.flushQueuedCommands();return autosave.flush()}
const foodFeel=new FoodFeel(requestFeed);
const combatFeel=new CombatFeel(foodFeel);
function requestFeed(){if(!home&&active&&!active.paused){foodFeel.unlock();active.queue('feed')}}
function install(world,options={}){clearInterval(networkTimer);active?.dispose();active=new FarmSession(world,{...options,onError:fail,onWorldStep:markPersistentChange});noticeSequence=world.eventSequence;observedWorld=world;if(options.room)networkTimer=setInterval(()=>active.pulse(performance.now()),50);return active}
install(new Garden());active.paused=true;
function refreshStart(){
 if(room||attempt){$('newConfirm').hidden=true;$('importConfirm').hidden=true;imported=null}
 const hasReservedRaid=storage.hasReservedRaid,liveRaid=active?.world?.scene==='raid'||!!room,staleRaid=hasReservedRaid&&!liveRaid;
 $('continueGame').disabled=!storage.hasWorld||staleRaid;$('staleRaidNotice').hidden=!staleRaid||!!attempt;$('onlineGame').disabled=hasReservedRaid;$('continueLegacyGame').disabled=!!room||!!attempt||!storage.legacyCompatible;$('legacySaveNotice').hidden=!storage.legacyCompatible;$('exportSave').disabled=!(storage.raw||storage.legacyRaw);
 $('saveNotice').textContent=storage.error;$('newGame').hidden=!!room;
 $('continueGame').hidden=!!room;$('onlineGame').hidden=!!room||!!attempt;
 $('cancelOnline').hidden=!attempt;$('leaveOnline').hidden=!room;
 $('importSave').disabled=!!room||!!attempt;$('newGame').disabled=!!attempt;
}
function setHome(value,push=true){
 if(value)persist();home=value;document.body.dataset.home=String(value);$('startScreen').hidden=!value;
 if(!room)active.paused=value;
 $('treePanel').hidden=true;$('helpPanel').hidden=true;$('abilityPanel').hidden=true;
 if(push)history.pushState(null,'',value?'#/':active.world.scene==='raid'?'#/raid':'#/farm');
 refreshStart();if(value)$('continueGame').focus();
}
function start(world,push=true){autosave.reset();foodFeel.unlock();personalGarden=world;install(world);setHome(false,push)}
function reservePersonalRaidRun(sessionId=null){let reserved;try{reserved=reserveRaidRun(snapshot(personalGarden),{sessionId})}catch(error){fail(error);return null}const candidate=restore(reserved.farm);if(!saveImmediate(candidate)){fail(Error(storage.error||'농장 원정 예약을 저장하지 못했어요.'));return null}personalGarden=storage.world;return reserved}
function localSettlementRoster(world,ownerId,run){
 const current=world.raidRosters?.find(roster=>roster.ownerId===ownerId);if(current){if(current.settlementRunSequence!==run.runSequence||current.settlementSessionId!==run.sessionId||current.settlementEncounterId!==run.runSequence)throw Error('레이드 명단의 정산 예약이 개인 농장 저장과 일치하지 않아요.');return world}
 const entries=raidRosterEntries(personalGarden.units,CONFIG.maxRaidPlayerUnits).map(([farmId,species,tier])=>({farmId,species,tier,deployed:false}));
 const view=snapshot(world);view.raidExpectedPlayers=[...new Set([...view.raidExpectedPlayers,ownerId])];view.raidRosters.push({ownerId,troops:entries,abilitySnapshot:createAbilityRuntimeSnapshot(personalGarden.playerProgression),settlementSessionId:run.sessionId,settlementRunSequence:run.runSequence,settlementEncounterId:run.runSequence,lastDeploySequence:0,buffUntil:0,buffReadyAt:0});return view;
}
function persistRaidSettlement(raidWorld,ownerId){
 const farmRun={sessionId:personalGarden.activeRaidSessionId,runSequence:personalGarden.activeRaidRunSequence};if(!farmRun.sessionId||!farmRun.runSequence)return false;
 const outcome=['victory','defeat'].includes(raidWorld.encounter?.outcome)?raidWorld.encounter.outcome:'aborted';
 const prepare=base=>settleRaidOwnerFarm(snapshot(base),{ownerId,sessionId:farmRun.sessionId,encounterId:farmRun.runSequence,runSequence:farmRun.runSequence,outcome,raidWorld,completedAtMs:Date.now(),settleVictory:({farm,receiptKey,deploymentMultiplier})=>{
   const garden=restore(farm),resolved=settleBossKill(garden,{encounterId:farmRun.runSequence,source:'raid',receiptKey,acquisitionMultiplier:deploymentMultiplier,species:3,tier:1,x:raidWorld.boss.x,y:raidWorld.boss.y});
   const reward=resolved.receipt;return{farm:snapshot(garden),summary:{acquisition:{status:reward.status,chance:reward.chance,roll:reward.roll,unitId:reward.unitId,receiptKey:reward.receiptKey},xp:{status:reward.xpStatus,amount:reward.xpAmount,levelsGained:reward.levelsGained,pointsAwarded:reward.pointsAwarded,receiptKey:reward.xpReceiptKey}}};
 }});
 let settled=prepare(personalGarden),candidate=restore(settled.farm);
 if(!saveImmediate(candidate)){
   if(!storage.refresh())throw Error(storage.error||'최신 농장 저장을 다시 읽지 못했어요.');
   settled=prepare(storage.world);candidate=restore(settled.farm);
   if(!saveImmediate(candidate))throw Error(storage.error||'전투 결과 저장에 실패했어요.');
 }
 personalGarden=storage.world;return settled;
}
function beginRaid(push=true){if(room||!personalGarden||active.world.scene==='raid'||personalGarden.activeRaidRunSequence!==null||personalGarden.farmBossEvent?.phase!=='idle'||!raidRosterEntries(personalGarden.units,1).length)return;if(!persist())return;const reserved=reservePersonalRaidRun();if(!reserved)return;renderer.dropTarget=null;const battle=Garden.createRaidBattle((personalGarden.seed+Math.floor(performance.now()))>>>0,['solo']);install(battle);active.queue('register-roster',{entries:raidRosterEntries(personalGarden.units,CONFIG.maxRaidPlayerUnits),abilitySnapshot:createAbilityRuntimeSnapshot(personalGarden.playerProgression),settlement:{sessionId:reserved.sessionId,runSequence:reserved.runSequence,encounterId:reserved.runSequence}});setHome(false,push)}
async function returnToFarm(push=true){
 stopDrop();if(!personalGarden)return;
 const raidWorld=active?.world?.scene==='raid'?snapshot(active.world):null;
 if(raidWorld&&personalGarden.activeRaidRunSequence!==null){
  const ownerId=active.localPlayerId,run={sessionId:personalGarden.activeRaidSessionId,runSequence:personalGarden.activeRaidRunSequence};
  try{persistRaidSettlement(localSettlementRoster(raidWorld,ownerId,run),ownerId)}catch(error){fail(error);return false}
 }
 if(room){const leaving=room;try{await active.session.leave()}catch{}active.dispose();leaving.close();room=null;solo=null}
 renderer.dropTarget=null;install(personalGarden);setHome(false,push);return true;
}
$('continueGame').onclick=()=>{if(room||active?.world?.scene==='raid'){setHome(false);return}if(storage.world&&storage.world.activeRaidRunSequence===null)start(restore(snapshot(storage.world)))};
$('abortRaidRun').onclick=()=>{
 if(room||active?.world?.scene==='raid')return;
 const world=storage.world;if(!world||world.activeRaidRunSequence===null)return refreshStart();
 try{
  const result=abortReservedRaidRun(snapshot(world),{completedAtMs:Date.now()});if(!result.applied)return refreshStart();
  if(!saveImmediate(restore(result.farm))){$('saveNotice').textContent=storage.error;return}
  personalGarden=storage.world;refreshStart();$('saveNotice').textContent='이전 원정을 보상 없이 종료했어요. 병력과 성장 포인트는 그대로예요.';
 }catch(error){fail(error)}
};
$('newGame').onclick=()=>{
 // Overwriting an existing save is a separate, explicit user action.
 if((storage.raw||storage.legacyRaw)&&!$('newConfirm').hidden)return;
 if(storage.raw||storage.legacyRaw){$('newConfirmText').textContent=storage.raw?'현재 0.5 정원을 새 정원으로 바꿀까요? 필요한 저장은 먼저 내보내 주세요.':'새 0.5 정원을 시작할까요? 기존 원본 저장은 별도 키에 그대로 남아요.';$('newConfirm').hidden=false;return}
 const world=new Garden();if(storage.replace(world)){autosave.reset();start(world)}else refreshStart();
};
$('confirmNew').onclick=()=>{if(room||attempt)return;const world=new Garden();if(storage.replace(world)){autosave.reset();$('newConfirm').hidden=true;start(world)}else refreshStart()};
$('cancelNew').onclick=()=>{$('newConfirm').hidden=true};
$('home').onclick=()=>setHome(true);
$('exportSave').onclick=()=>{const raw=storage.raw||storage.legacyRaw;if(!raw)return;const url=URL.createObjectURL(new Blob([raw],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='budmori-save-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
$('importSave').onclick=()=>$('saveFile').click();
$('continueLegacyGame').onclick=async()=>{if(room||attempt||!storage.legacyRaw)return;try{const {validateSave}=await import('./farm-storage.js');validateSave(storage.legacyRaw);imported=storage.legacyRaw;importedLegacy=true;$('importConfirmText').textContent='0.4 원본 저장은 그대로 두고, 새 0.5 저장 키에 복사해 이어갈까요?';$('confirmImport').textContent='원본을 보존하고 이어가기';$('importConfirm').hidden=false}catch(e){$('saveNotice').textContent=e.message}};

$('saveFile').onchange=async()=>{const file=$('saveFile').files[0];if(!file)return;try{if(file.size>2*1024*1024)throw Error('저장 파일이 너무 큽니다.');const text=await file.text();const {validateSave}=await import('./farm-storage.js');validateSave(text);imported=text;importedLegacy=false;$('importConfirmText').textContent='선택한 파일로 개인 저장을 바꿀까요?';$('confirmImport').textContent='이 저장 불러오기';$('importConfirm').hidden=false}catch(e){$('saveNotice').textContent=e.message}finally{$('saveFile').value=''}};
$('cancelImport').onclick=()=>{imported=null;importedLegacy=false;$('importConfirm').hidden=true};
 $('confirmImport').onclick=()=>{if(room||attempt)return;try{if(imported){const legacy=importedLegacy,world=storage.import(imported);autosave.reset();if(legacy)start(world)}imported=null;importedLegacy=false;$('importConfirm').hidden=true;refreshStart()}catch(e){$('saveNotice').textContent=e.message}};
$('onlineGame').onclick=async()=>{
 if(attempt||room)return;if(!persist())return;personalGarden=restore(snapshot(storage.world||personalGarden||active.world));if(personalGarden.activeRaidRunSequence!==null){$('sessionNotice').textContent='이전 원정 기록을 먼저 종료하고 다시 연결해 주세요.';return}solo=restore(snapshot(personalGarden));const controller=attempt=new AbortController();refreshStart();$('sessionNotice').textContent='함께할 정원을 찾고 있어요…';
 try{
  const next=await BloomGamekitTransport.createNostrPublicRoom({namespace:'budmori-public-v1',simulationVersion:'budmori-farm-'+PRODUCT_VERSION,maxPlayers:CONFIG.maxRaidPlayers,discoveryMs:1500,totalTimeoutMs:60000,peerTimeoutMs:20000,signal:controller.signal,onStatus:e=>{if(attempt===controller)$('sessionNotice').textContent=({discovering:'함께할 정원을 찾고 있어요…',hosting:'새 정원을 열고 있어요…',joining:'정원에 연결하고 있어요…'})[e.type]||'함께할 정원을 준비하고 있어요…'}});
  if(controller.signal.aborted){next.close();return}const reserved=reservePersonalRaidRun(next.sessionId);if(!reserved){next.close();return}room=next;const battle=Garden.createRaidBattle(BloomGamekitDeterministic.hashBytes(new TextEncoder().encode(next.sessionId)),next.players);install(battle,{room:next});active.queue('register-roster',{entries:raidRosterEntries(personalGarden.units),abilitySnapshot:createAbilityRuntimeSnapshot(personalGarden.playerProgression),settlement:{sessionId:reserved.sessionId,runSequence:reserved.runSequence,encounterId:reserved.runSequence}});$('sessionNotice').textContent='함께 가꾸는 정원 · 개인 저장은 보존됩니다.';setHome(false);
 }catch(e){if(!controller.signal.aborted)$('sessionNotice').textContent='연결하지 못했어요. '+e.message}
 finally{if(attempt===controller)attempt=null;refreshStart()}
};
$('cancelOnline').onclick=()=>{attempt?.abort();attempt=null;$('sessionNotice').textContent='연결을 취소했어요.';refreshStart()};
$('leaveOnline').onclick=async()=>{if(!room)return;$('leaveOnline').disabled=true;try{if(await returnToFarm(false))setHome(true)}finally{$('leaveOnline').disabled=false}};
$('farm').onclick=()=>returnToFarm();$('raid').onclick=()=>beginRaid();$('return').onclick=()=>returnToFarm();
for(const value of ['breed','merge'])$(value).onclick=()=>active.queue('mode',{value});
$('feed').addEventListener('keydown',e=>{if(e.repeat&&['Enter',' '].includes(e.key))e.preventDefault()});
$('feed').onclick=e=>{if(e.detail===0&&!e.pointerType)requestFeed()};
$('speed').onclick=()=>active.queue('speed',{value:active.speed===1?4:1});
$('pause').onclick=()=>{if(room)return;active.paused=!active.paused;if(active.paused)persist()};
function drawTree(){
 const p=(personalGarden||active.world).progress,labels={eat:'식사',birth:'번식',merge:'합체',hit:'보스 타격'};
 $('treeNodes').innerHTML=TREE_NODES.filter(n=>!n.hidden).map(n=>{const l=p.levels[n.id],goal=n.goal*(l+1),parent=TREE_NODES.find(v=>v.id===n.parent);return `<article class="tree-node" data-ready="${p.ready(n)}"><div class="node-heading"><span class="node-icon" aria-hidden="true">${n.icon}</span><h3>${n.name}</h3><span>${l}/4</span></div><p>${n.description}</p><div class="node-values">${n.value(l)}${l<4?` <span>→ ${n.value(l+1)}</span>`:''}</div><progress max="${goal}" value="${Math.min(goal,p.records[n.metric])}"></progress><small>${l===4?'완료':`${labels[n.metric]} ${p.records[n.metric]}/${goal}${parent&&!p.levels[parent.id]?` · ${parent.name} 1 필요`:''}`}</small><button data-invest="${n.id}" ${p.ready(n)?'':'disabled'}>${l===4?'✓':'+'}<span class="sr-only">${n.name} 투자</span></button></article>`}).join('');
}
function drawAbilityTree(){
 const w=personalGarden||active.world,inCombat=w.running||w.farmBossEvent?.phase!=='idle';
 const selectedSpecies=Number($('abilityPanel').dataset.selectedSpecies||0);
 $('abilityPoints').textContent=String(w.playerProgression.availablePoints);
 for(const button of $('abilitySpeciesTabs').querySelectorAll('[data-ability-species]'))button.setAttribute('aria-pressed',String(Number(button.dataset.abilitySpecies)===selectedSpecies));
 $('abilityNodes').innerHTML=renderAbilityTreeMarkup(w.playerProgression,{highestSpeciesTier:w.highestSpeciesTiers(),location:w.scene,inCombat,selectedSpecies});
}
function panel(id,open,push=true){
 if(open){if($('treePanel').hidden&&$('helpPanel').hidden&&$('abilityPanel').hidden)treePause=active.paused;if(!room){active.paused=true;persist()}$('treePanel').hidden=id!=='treePanel';$('helpPanel').hidden=id!=='helpPanel';$('abilityPanel').hidden=true;if(id==='treePanel')drawTree();$(id).querySelector('button').focus()}
 else{$(id).hidden=true;if(!room&&$('treePanel').hidden&&$('helpPanel').hidden&&$('abilityPanel').hidden)active.paused=treePause;$(id==='treePanel'?'tree':'help').focus()}
 $('tree').setAttribute('aria-expanded',!$('treePanel').hidden);$('help').setAttribute('aria-expanded',!$('helpPanel').hidden);$('abilities').setAttribute('aria-expanded',!$('abilityPanel').hidden);
 if(push)history.pushState(null,'',open?id==='treePanel'?'#/growth':'#/help':active.world.scene==='raid'?'#/raid':'#/farm');
}
function showAbilityPanel(open,push=true){
 if(open){if(active.world.scene==='raid')return;if($('treePanel').hidden&&$('helpPanel').hidden&&$('abilityPanel').hidden)abilityPause=active.paused;if(!room){active.paused=true;persist()}$('treePanel').hidden=true;$('helpPanel').hidden=true;$('abilityPanel').hidden=false;drawAbilityTree();$('abilityClose').focus()}
 else{$('abilityPanel').hidden=true;if(!room)active.paused=abilityPause;$('abilities').focus()}
 $('abilities').setAttribute('aria-expanded',!$('abilityPanel').hidden);$('tree').setAttribute('aria-expanded',!$('treePanel').hidden);$('help').setAttribute('aria-expanded',!$('helpPanel').hidden);
 if(push)history.pushState(null,'',open?'#/abilities':active.world.scene==='raid'?'#/raid':'#/farm');
}
$('tree').onclick=()=>panel('treePanel',true);$('treeClose').onclick=()=>panel('treePanel',false);$('help').onclick=()=>panel('helpPanel',$('helpPanel').hidden);$('closeHelp').onclick=()=>panel('helpPanel',false);
$('treeNodes').onclick=e=>{const b=e.target.closest('[data-invest]');if(b){active.queue('invest',{id:b.dataset.invest});setTimeout(drawTree,180)}};
$('abilities').onclick=()=>showAbilityPanel(true);$('abilityClose').onclick=()=>showAbilityPanel(false);
$('abilitySpeciesTabs').onclick=e=>{const button=e.target.closest('[data-ability-species]');if(!button)return;$('abilityPanel').dataset.selectedSpecies=button.dataset.abilitySpecies;drawAbilityTree()};
$('abilityNodes').onclick=e=>{const button=e.target.closest('button[data-ability-action],button[data-ability-node]');if(!button||button.getAttribute('aria-disabled')==='true')return;if(button.dataset.abilityAction==='reset')active.queue('ability-reset');else if(button.dataset.abilityNode){const [abilityId,kind,level]=button.dataset.abilityNode.split(':');const nodeId=kind==='root'?'root':`${kind}-${level}`;active.queue('ability-invest',{abilityId,nodeId})}setTimeout(drawAbilityTree,180)};
$('treePanel').onkeydown=e=>{if(e.key==='Tab'){const f=[...$('treePanel').querySelectorAll('button:not(:disabled)')],i=f.indexOf(document.activeElement);if(e.shiftKey&&i<=0||!e.shiftKey&&i===f.length-1){e.preventDefault();f[e.shiftKey?f.length-1:0].focus()}}};
$('abilityPanel').onkeydown=e=>{if(e.key==='Tab'){const f=[...$('abilityPanel').querySelectorAll('button:not([aria-disabled="true"])')],i=f.indexOf(document.activeElement);if(e.shiftKey&&i<=0||!e.shiftKey&&i===f.length-1){e.preventDefault();f[e.shiftKey?f.length-1:0].focus()}}};
const canvas=$('world');
function deploymentHud(){const w=active.world,raid=w.scene==='raid',roster=w.raidRoster(active.localPlayerId),registered=w.raidRosters.length,expected=w.raidExpectedPlayers.length,remaining=roster?w.raidRemaining(active.localPlayerId):personalGarden?.units.length||0,queued=roster?Math.max(0,active.localDeploySequence-roster.lastDeploySequence):0;
 $('raidRemaining').textContent=room&&active.players.length<2?'동료가 들어오기를 기다리는 중…':!roster||registered<expected?`병력 명단 동기화 중 · ${registered}/${expected}명`:`남은 병력 ${Math.max(0,remaining-queued)} · 전장을 탭해 투입 · 누르고 있으면 100ms마다 한 마리`;
 const own=w.raidRoster(active.localPlayerId),cooldown=own?Math.max(0,own.buffReadyAt-w.time):0;$('buff').disabled=!raid||!w.running||!own||cooldown>0;$('buff').textContent=cooldown>0?`강화 ${cooldown.toFixed(1)}초`:'팀 강화';
}
function deployAt(p){if(home||active.world.scene!=='raid'||room&&active.players.length<2||!active.world.raidExpectedPlayers.every(id=>active.world.raidRoster(id)))return false;const valid=ArenaGeometry.inside(p,'raid',.5);renderer.dropTarget={...p,valid};return valid&&active.deployNext(Math.round(p.x*100)/100,Math.round(p.y*100)/100)}
function updateDropPointer(e){if(!dropPointer||e.pointerId!==dropPointer.id)return;const p=renderer.screenToWorld(e.clientX,e.clientY);dropPointer.x=Math.round(p.x*100)/100;dropPointer.y=Math.round(p.y*100)/100;renderer.dropTarget={x:dropPointer.x,y:dropPointer.y,valid:ArenaGeometry.inside(p,'raid',.5)}}
function stopDrop(e){if(e&&dropPointer&&e.pointerId!==dropPointer.id)return;const id=dropPointer?.id;dropPointer=null;if(dropTimer!==null)clearInterval(dropTimer);dropTimer=null;if(id!==undefined&&canvas.hasPointerCapture?.(id))canvas.releasePointerCapture(id)}
canvas.addEventListener('pointerdown',e=>{foodFeel.unlock();if(home||active.world.scene!=='raid'||dropPointer)return;const p=renderer.screenToWorld(e.clientX,e.clientY);if(!ArenaGeometry.inside(p,'raid',.5)){renderer.dropTarget={...p,valid:false};return}canvas.setPointerCapture?.(e.pointerId);dropPointer={id:e.pointerId,x:Math.round(p.x*100)/100,y:Math.round(p.y*100)/100};deployAt(dropPointer);dropTimer=setInterval(()=>{if(dropPointer)deployAt(dropPointer)},100);e.preventDefault()});
canvas.addEventListener('pointermove',updateDropPointer);canvas.addEventListener('pointerup',e=>stopDrop(e));canvas.addEventListener('pointercancel',e=>stopDrop(e));canvas.addEventListener('lostpointercapture',e=>stopDrop(e));
window.addEventListener('pointerup',e=>stopDrop(e),true);window.addEventListener('pointercancel',e=>stopDrop(e),true);
$('buff').onclick=()=>active.queue('buff');
window.addEventListener('blur',()=>{stopDrop();persist()});document.addEventListener('visibilitychange',()=>{if(document.hidden){stopDrop();persist();active.loop.resetTiming()}});
window.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('treePanel').hidden)panel('treePanel',false);else if(!$('helpPanel').hidden)panel('helpPanel',false);else if(!$('abilityPanel').hidden)showAbilityPanel(false)}});
window.addEventListener('pageshow',e=>{if(e.persisted)location.reload()});
window.addEventListener('resize',()=>renderer.resize());window.addEventListener('pagehide',()=>{persist();clearInterval(networkTimer);attempt?.abort();room?.close();active.dispose();renderer.dispose()});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();persist();fail(Error('그래픽 연결이 끊겼어요. 새로고침해 다시 이어가 주세요.'))});
function route(){const r=location.hash;if(r==='#/'||!r){setHome(true,false);return}if(!room&&storage.hasReservedRaid){setHome(true,false);history.replaceState(null,'','#/');return}if(home){if(!room&&storage.error&&!storage.hasWorld){setHome(true,false);history.replaceState(null,'','#/');return}if(room)setHome(false,false);else if(storage.hasWorld)start(restore(snapshot(storage.world)),false);else start(new Garden(),false)}if(r==='#/help'||r==='#/growth')panel(r==='#/help'?'helpPanel':'treePanel',true,false);else if(r==='#/abilities')showAbilityPanel(true,false);else{if(!$('treePanel').hidden)panel('treePanel',false,false);if(!$('helpPanel').hidden)panel('helpPanel',false,false);if(!$('abilityPanel').hidden){$('abilityPanel').hidden=true;if(!room)active.paused=abilityPause}$('abilities').setAttribute('aria-expanded','false');if(r==='#/raid'){if(!room&&personalGarden?.farmBossEvent?.phase!=='idle'){history.replaceState(null,'','#/farm')}else if(!room)beginRaid(false)}else if(r==='#/farm'&&active.world.scene==='raid'&&!room)returnToFarm(false)}}
window.addEventListener('popstate',route);
function sync(display,now){
 const w=active.world,raid=display.scene==='raid',farmEvent=display.farmBossEvent,farmEventActive=!raid&&farmEvent?.phase!=='idle',battleHud=raid||farmEventActive,hasReadyTroops=personalGarden?hasRaidRosterEntries(personalGarden.units):false,rewardWorld=personalGarden||w,pendingRewardCount=rewardWorld.bossRewardReceipts.filter(reward=>reward.status==='pending').length;for(const [id,value]of [['farm',!raid],['raid',raid],['breed',w.mode==='breed'],['merge',w.mode==='merge']])$(id).setAttribute('aria-pressed',value);
 $('farmControls').hidden=raid||farmEventActive||home;$('raidControls').hidden=!raid||home;$('bossbar').hidden=!battleHud||home;$('roles').hidden=!battleHud||home;$('raid').disabled=farmEventActive;
 $('count').textContent=raid?(w.raidRoster(active.localPlayerId)?.troops.length??personalGarden?.units.length??0):display.units.filter(unit=>!unit.isBattleOnlySummon).length;$('capacity').textContent=personalGarden?.capacity??CONFIG.cap;$('starter').textContent=raid?`${w.units.length} deployed in raid`:pendingRewardCount?'밤톨 보상 대기 · 공간이 생기면 합류해요':!hasReadyTroops?'모두 휴식 중 · 회복까지 기다려 주세요':w.units.filter(unit=>!unit.isBattleOnlySummon).length>=w.capacity?'정원이 가득 찼어요':'번식으로 식구를 늘려요';
 const army=display.units.reduce((sum,u)=>({current:sum.current+Math.max(0,Math.min(u.maxHp,u.hp)),max:sum.max+u.maxHp,living:sum.living+(u.hp>0?1:0),total:sum.total+1}),{current:0,max:0,living:0,total:0});
 $('allyHealth').style.width=(army.max?army.current/army.max*100:0)+'%';
 $('allyHealthText').textContent=Math.ceil(army.current)+' / '+Math.ceil(army.max)+' HP · '+army.living+'/'+army.total+' 생존';
 const boss=display.boss,battleOutcome=raid?w.encounter.outcome:farmEvent?.outcome;
 $('bossHealthText').textContent=Math.ceil(boss.hp)+' / '+boss.maxHp+' HP';$('bossHealthNote').textContent=farmEventActive?'보스 능력치 고정':'전사자 포함 최대 HP · 증원 시 함께 증가';
 for(const [id,value,max]of [['allyHealth',army.current,army.max],['bossHealth',boss.hp,boss.maxHp]]){const el=$(id);el.setAttribute('aria-valuenow',value);el.setAttribute('aria-valuemax',max)}
 $('bossHealth').style.width=boss.maxHp?boss.hp/boss.maxHp*100+'%':'0%';$('battleOutcome').textContent=raid?(battleOutcome==='victory'?'승리 · 모두 정원으로 돌아갈 수 있어요':battleOutcome==='defeat'?'휴식이 필요해요 · 정원에서 다시 준비해요':''):(battleOutcome==='victory'?farmEvent.rewardStatus==='granted'?'보스가 쓰러졌어요 · 밤톨이 합류했어요':farmEvent.rewardStatus==='pending'?'밤톨 획득 대기 · 공간이 생기면 합류해요':'보스가 쓰러졌어요':battleOutcome==='defeat'?'동료들이 다시 일어날 때까지 기다려요':'');$('battleOutcome').hidden=home||!battleHud||battleOutcome==='fighting'||battleOutcome==='idle';$('speed').textContent=active.speed+'×';$('pause').disabled=!!room;$('tree').disabled=raid||farmEventActive;$('abilities').disabled=raid||!personalGarden;$('raid').disabled=farmEventActive||(!raid&&!hasReadyTroops);$('pause').textContent=active.paused?'▶':'Ⅱ';
 $('feed').setAttribute('aria-label',`먹이 탭, 5회 중 ${w.foodTaps.remainder}회`);$('feed').dataset.state=w.food.length>=140?'full':'ready';$('feed').dataset.produced=now<foodFeel.completeUntil;
 for(let i=0;i<5;i++)foodFeel.pips[i].classList.toggle('filled',now<foodFeel.completeUntil||i<w.foodTaps.remainder);
 if(observedWorld!==w){observedWorld=w;noticeSequence=w.eventSequence}
 for(const e of w.notices)if(e.sequence>noticeSequence){if(e.kind==='food-tap')foodFeel.tap(e.source,e.completed,e.remainder);else foodFeel.event(e.kind)}noticeSequence=w.eventSequence;foodFeel.frame(now);
 deploymentHud();$('connection').hidden=!room;$('connection').textContent=room?active.session.failure?'연결이 끊겼어요 · 시작 화면에서 나갈 수 있어요':`함께 ${active.players.length}명 · ${active.session.ready?'연결됨':'동기화 중'}`:'';
}
function frame(now){measureFrame(now);if(room||!home&&!document.hidden)active.pulse(now);const display=active.presentation(now);combatFeel.observe(active.world,display.displayTimeMs,display.presentationRevision);renderer.render(display,combatFeel,display.displayTimeMs);sync(display,now);requestAnimationFrame(frame)}
 $('productVersion').textContent=PRODUCT_VERSION;$('startVersion').textContent=PRODUCT_VERSION+' · 여섯 등급과 합체 확장';
setHome(true,false);if(location.hash&&location.hash!=='#/')route();requestAnimationFrame(frame);
// Read-only diagnostics for support and browser scenarios. Commands use the product session.
globalThis.BUDMORI={get sim(){return active.world},get runtime(){return active},get room(){return room},get renderMetrics(){return frameRate()},get presentationDiagnostics(){return active.latestPresentationDiagnostics},renderer,storage,foodFeel,combatFeel,CONFIG,ATTACK_TYPES,Ballistics,ArenaGeometry,version:PRODUCT_VERSION};
