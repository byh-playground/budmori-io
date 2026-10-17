import {Garden,CONFIG,ArenaGeometry,ATTACK_TYPES,Ballistics} from './farm-model.js';
import {Diorama} from './farm-renderer.js';
import {FarmSession} from './farm-session.js';
import {FarmStorage,saveHasLegacyFarmProgress} from './farm-storage.js';
import {FarmAutosave} from './farm-autosave.js';
import {snapshot,restore} from './farm-state.js';
import {PRODUCT_VERSION} from './version.js';
import {FoodFeel} from './food-feel.js';
import {CombatFeel} from './combat-feel.js';
import {raidRosterEntries,hasRaidRosterEntries} from './raid-roster.js';
import {createAbilityRuntimeSnapshot} from './ability-state.js';
import {renderAbilityTreeMarkup,renderFarmUpgradeTreeMarkup} from './ability-tree.js';
import {abortReservedRaidRun,reserveRaidRun,settleRaidOwnerFarm,raidDeploymentRewardMultiplier} from './raid-settlement.js';
import {BOSS_REWARD_SETTINGS,bossAcquisitionChance,bossStageStats,settleBossKill} from './boss-rewards.js';
import {selectFarmBossStage} from './farm-boss-stages.js';
import {speciesById} from './species-catalog.js';
const $=id=>document.getElementById(id),storage=new FarmStorage();
let networkTimer=null,observedWorld=null;
let imported=null,importedLegacy=false;
let active=null,home=true,attempt=null,room=null,solo=null,personalGarden=null,noticeSequence=0,menuOpen=false,menuTab='play',menuWasPaused=true,menuPauseChanged=false,menuAutoPaused=false,dropPointer=null,dropTimer=null,bossEncounterOpen=false,bossSwipe=null,bossPauseBeforeOpen=null;
const renderer=new Diorama($('world'));
const measuredFrames=[];let lastFrameTimestamp=null,frameCount=0;
function measureFrame(now){if(lastFrameTimestamp!==null){measuredFrames.push(now-lastFrameTimestamp);if(measuredFrames.length>240)measuredFrames.shift()}lastFrameTimestamp=now;frameCount++}
function frameRate(){const sorted=[...measuredFrames].sort((a,b)=>a-b),sum=measuredFrames.reduce((a,b)=>a+b,0);return{frames:frameCount,fps:sum?measuredFrames.length*1000/sum:0,frametimeMs:{p50:sorted[Math.floor((sorted.length-1)*.5)]||0,p95:sorted[Math.floor((sorted.length-1)*.95)]||0,max:Math.max(0,...measuredFrames)}}}
const fail=error=>{$('error').hidden=false;$('error').textContent='정원을 진행하지 못했어요. '+error.message;console.error(error);if(active&&!room)active.paused=true};
const bossPreviewSources=new Map(),bossPreviewVersions=new WeakMap();
function bossPreviewSource(asset){
 if(bossPreviewSources.has(asset)){const cached=bossPreviewSources.get(asset);bossPreviewSources.delete(asset);bossPreviewSources.set(asset,cached);return cached}
 const source=fetch(new URL(asset,document.baseURI),{credentials:'same-origin'}).then(response=>{if(!response.ok)throw Error(`Boss preview source failed: ${response.status}`);return response.text()});
 bossPreviewSources.set(asset,source);if(bossPreviewSources.size>16)bossPreviewSources.delete(bossPreviewSources.keys().next().value);
 source.catch(()=>{if(bossPreviewSources.get(asset)===source)bossPreviewSources.delete(asset)});
 return source;
}
async function createNeutralBossPreview(species,asset){
 const compiled=globalThis.BudmoriVectorResources?.troops?.[species],expressions=compiled?.metadata?.expressions,neutral=expressions?.neutral;
 if(!neutral)throw Error(`Species ${species} is missing the neutral GameKit expression`);
 const documentSvg=new DOMParser().parseFromString(await bossPreviewSource(`./assets/troops/${asset}`),'image/svg+xml');
 if(documentSvg.getElementsByTagName('parsererror').length||documentSvg.documentElement.localName!=='svg')throw Error(`Invalid SVG preview source: ${asset}`);
 const svg=documentSvg.documentElement,nodesById=new Map([...svg.querySelectorAll('[id]')].map(node=>[node.getAttribute('id'),node]));
 const expressionParts=new Set(Object.values(expressions).flatMap(variant=>[...variant.show,...variant.hide])),visible=new Set(neutral.show);
 for(const id of neutral.hide)visible.delete(id);
 for(const id of expressionParts){const node=nodesById.get(id);if(!node)throw Error(`SVG preview is missing GameKit expression part: ${id}`);node.style.setProperty('display',visible.has(id)?'inline':'none')}
 return document.importNode(svg,true);
}
async function renderNeutralBossPreview(target,species,asset,label=''){
 const version=(bossPreviewVersions.get(target)||0)+1;bossPreviewVersions.set(target,version);target.setAttribute('aria-busy','true');
 try{
  const svg=await createNeutralBossPreview(species,asset);
  if(bossPreviewVersions.get(target)!==version||!target.isConnected)return;
  svg.id=target.id;svg.setAttribute('class',target.getAttribute('class')||'');svg.removeAttribute('hidden');svg.setAttribute('aria-busy','false');
  if(label){svg.setAttribute('role','img');svg.setAttribute('aria-label',label)}else{svg.setAttribute('aria-hidden','true');svg.removeAttribute('role');svg.removeAttribute('aria-label')}
  target.replaceWith(svg);bossPreviewVersions.set(svg,version);
 }catch(error){if(bossPreviewVersions.get(target)!==version)return;target.hidden=true;target.setAttribute('aria-busy','false');console.error('Unable to render neutral boss preview',error)}
}
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
function showBossEncounterMessage(text){const message=$('bossEncounterMessage');message.textContent=text;message.hidden=!text;if(text){clearTimeout(showBossEncounterMessage.timer);showBossEncounterMessage.timer=setTimeout(()=>{message.hidden=true},1800)}}
function renderBossEncounterStage(stage){
 if(!personalGarden||room||active?.world?.scene==='raid')return null;
 const progress=personalGarden.farmBossProgress,wasSelected=progress.selections.some(entry=>entry.stage===stage),previousStage=progress.currentStage;
 const selection=selectFarmBossStage(progress,stage);
 if(!wasSelected||previousStage!==stage)saveImmediate(personalGarden);
 const species=selection.species,catalogEntry=speciesById(species),name=catalogEntry.name,rolls=selection.rolls;
 $('bossStageCounter').textContent=`${selection.stage} / ${BOSS_REWARD_SETTINGS.maxStage}`;
 $('bossStageLabel').textContent=`STAGE ${selection.stage}`;
 renderNeutralBossPreview($('bossPreview'),species,catalogEntry.asset,`${name} 보스 미리보기`);
 $('bossStageName').textContent=`${name} 보스`;
 $('bossStageHp').textContent=`HP ${Math.round(selection.hp).toLocaleString('ko-KR')}`;
 $('bossStageAttack').textContent=`공격력 ${Number(selection.attackPower.toPrecision(3)).toLocaleString('ko-KR')}`;
 $('bossStageXp').textContent=`+${selection.xp.toLocaleString('ko-KR')} XP`;
 $('bossStageDrop').hidden=rolls===0;$('bossStageDrop').replaceChildren();
 if(rolls>0){const icon=document.createElement('img');icon.draggable=false;const label=document.createElement('span'),title=document.createElement('strong'),details=document.createElement('small');title.textContent=`${name} 보스 종`;details.textContent=`${Math.round(BOSS_REWARD_SETTINGS.acquisitionChance*100)}%씩 · ${rolls}회 개별 추첨 · 성공마다 T1 1마리`;label.append(title,details);$('bossStageDrop').append(icon,label);renderNeutralBossPreview(icon,species,catalogEntry.asset);$('bossStageNotice').textContent='';}
 else $('bossStageNotice').textContent='보스 종 보상은 없어요 · 5스테이지부터 1회 추첨';
 $('bossEncounterChallenge').disabled=!hasRaidRosterEntries(personalGarden.units)||personalGarden.farmBossEvent?.phase!=='idle'||personalGarden.activeRaidRunSequence!==null;
 $('bossEncounterChallenge').title=$('bossEncounterChallenge').disabled?'전투를 시작하려면 투입 가능한 병력과 정원 상태가 필요해요.':'';
 return selection;
}
function openBossEncounter(push=true){
 if(room||attempt||active?.world?.scene==='raid')return false;
 if(!personalGarden){if(storage.world&&storage.world.activeRaidRunSequence===null)start(restore(snapshot(storage.world)),false);else return false}
 if(personalGarden.farmBossEvent?.phase!=='idle'||personalGarden.activeRaidRunSequence!==null)return false;
 if(!persist())return false;
 if(menuOpen)closeMenu(false);
 bossPauseBeforeOpen=active?.paused??true;if(active&&!bossPauseBeforeOpen){active.paused=true;active.loop.resetTiming()}bossEncounterOpen=true;document.body.dataset.bossScreen='true';$('bossEncounterScreen').hidden=false;
 renderBossEncounterStage(personalGarden.farmBossProgress.currentStage);
 if(push)history.pushState(null,'','#/boss');
 $('bossEncounterBack').focus();return true;
}
function closeBossEncounter(push=true){if(!bossEncounterOpen)return;bossEncounterOpen=false;document.body.dataset.bossScreen='false';$('bossEncounterScreen').hidden=true;bossSwipe=null;for(const id of ['bossPreview']){const preview=$(id);if(preview){bossPreviewVersions.set(preview,(bossPreviewVersions.get(preview)||0)+1);preview.hidden=true}}if(active&&bossPauseBeforeOpen!==null){active.paused=bossPauseBeforeOpen;bossPauseBeforeOpen=null;active.loop.resetTiming()}if(push)history.pushState(null,'','#/farm')}
function refreshStart(){
 if(room||attempt){$('newConfirm').hidden=true;$('importConfirm').hidden=true;imported=null}
 const hasReservedRaid=storage.hasReservedRaid,liveRaid=active?.world?.scene==='raid'||!!room,staleRaid=hasReservedRaid&&!liveRaid;
 $('continueGame').disabled=!storage.hasWorld||staleRaid;$('startBossEncounter').disabled=!storage.hasWorld||staleRaid||!!room||!!attempt;$('staleRaidNotice').hidden=!staleRaid||!!attempt;$('onlineGame').disabled=hasReservedRaid;$('continueLegacyGame').disabled=!!room||!!attempt||!storage.legacyCompatible;$('legacySaveNotice').hidden=!storage.legacyCompatible;$('exportSave').disabled=!(storage.raw||storage.legacyRaw);$('exportLegacySave').hidden=!storage.legacyBackup;$('exportLegacySave').disabled=!storage.legacyBackup;
 $('saveNotice').textContent=[storage.migrationNotice,storage.error].filter(Boolean).join(' ');$('newGame').hidden=!!room;
 $('continueGame').hidden=!!room;$('onlineGame').hidden=!!room||!!attempt;
 $('cancelOnline').hidden=!attempt;$('leaveOnline').hidden=!room;
 $('importSave').disabled=!!room||!!attempt;$('newGame').disabled=!!attempt;
}
function setHome(value,push=true){
 if(value){persist();if(menuOpen)closeMenu(false);if(bossEncounterOpen)closeBossEncounter(false)}home=value;document.body.dataset.home=String(value);$('startScreen').hidden=!value;
 if(!room)active.paused=value;
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
   const garden=restore(farm),stage=raidWorld.boss.stage||0,stageReward=stage?bossStageStats(stage):null,resolved=settleBossKill(garden,{encounterId:farmRun.runSequence,source:'raid',receiptKey,acquisitionMultiplier:deploymentMultiplier,rollCount:stageReward?.rolls??1,xpAmount:stageReward?.xp,species:raidWorld.boss.species??3,tier:1,x:raidWorld.boss.x,y:raidWorld.boss.y});
   const reward=resolved.receipt;return{farm:snapshot(garden),summary:{stage,acquisition:{status:reward.status,chance:reward.chance,roll:reward.roll,rollCount:reward.rollCount,rolls:reward.drops,unitId:reward.unitId,receiptKey:reward.receiptKey},xp:{status:reward.xpStatus,amount:reward.xpAmount,levelsGained:reward.levelsGained,pointsAwarded:reward.pointsAwarded,receiptKey:reward.xpReceiptKey}}};
 }});
 let settled=prepare(personalGarden),candidate=restore(settled.farm);
 if(!saveImmediate(candidate)){
   if(!storage.refresh())throw Error(storage.error||'최신 농장 저장을 다시 읽지 못했어요.');
   settled=prepare(storage.world);candidate=restore(settled.farm);
   if(!saveImmediate(candidate))throw Error(storage.error||'전투 결과 저장에 실패했어요.');
 }
 personalGarden=storage.world;return settled;
}
function beginRaid(push=true){if(room||!personalGarden||active.world.scene==='raid'||personalGarden.activeRaidRunSequence!==null||personalGarden.farmBossEvent?.phase!=='idle'||!raidRosterEntries(personalGarden.units,1).length)return;if(!persist())return;const bossStage=renderBossEncounterStage(personalGarden.farmBossProgress.currentStage);if(!bossStage||!persist())return;const reserved=reservePersonalRaidRun();if(!reserved)return;renderer.dropTarget=null;closeBossEncounter(false);const battle=Garden.createRaidBattle((personalGarden.seed+Math.floor(performance.now()))>>>0,['solo'],bossStage);install(battle);active.queue('register-roster',{entries:raidRosterEntries(personalGarden.units,CONFIG.maxRaidPlayerUnits),abilitySnapshot:createAbilityRuntimeSnapshot(personalGarden.playerProgression),settlement:{sessionId:reserved.sessionId,runSequence:reserved.runSequence,encounterId:reserved.runSequence}});setHome(false,push)}
async function returnToFarm(push=true){
 stopDrop();if(bossEncounterOpen)closeBossEncounter(false);if(!personalGarden)return;
 const raidWorld=active?.world?.scene==='raid'?snapshot(active.world):null;
 if(raidWorld&&personalGarden.activeRaidRunSequence!==null){
  const ownerId=active.localPlayerId,run={sessionId:personalGarden.activeRaidSessionId,runSequence:personalGarden.activeRaidRunSequence};
  try{persistRaidSettlement(localSettlementRoster(raidWorld,ownerId,run),ownerId)}catch(error){fail(error);return false}
 }
 if(room){const leaving=room;try{await active.session.leave()}catch{}active.dispose();leaving.close();room=null;solo=null}
 renderer.dropTarget=null;install(personalGarden);setHome(false,push);return true;
}
$('continueGame').onclick=()=>{if(room||active?.world?.scene==='raid'){setHome(false);return}if(storage.world&&storage.world.activeRaidRunSequence===null)start(restore(snapshot(storage.world)))};
$('startBossEncounter').onclick=()=>{if(room||attempt||!storage.world||storage.world.activeRaidRunSequence!==null)return;start(restore(snapshot(storage.world)),false);openBossEncounter()};
$('menuBossEncounter').onclick=()=>{closeMenu(false);openBossEncounter()};
$('bossEncounterBack').onclick=()=>closeBossEncounter();
$('bossEncounterChallenge').onclick=()=>{if($('bossEncounterChallenge').disabled)return;closeBossEncounter(false);beginRaid(true)};
$('bossEncounterScreen').addEventListener('pointerdown',e=>{
 if(!bossEncounterOpen||e.button>0||e.target.closest('button'))return;
 const viewport=$('bossEncounterViewport'),card=$('bossEncounterCard');bossSwipe={pointerId:e.pointerId,y:e.clientY};card.style.transition='none';viewport.setPointerCapture?.(e.pointerId);e.preventDefault();
});
$('bossEncounterScreen').addEventListener('pointermove',e=>{if(!bossSwipe||e.pointerId!==bossSwipe.pointerId)return;const delta=Math.max(-120,Math.min(120,e.clientY-bossSwipe.y));$('bossEncounterCard').style.transform=`translateY(${delta*.55}px)`;e.preventDefault()});
$('bossEncounterScreen').addEventListener('pointerup',e=>{
 if(!bossSwipe||e.pointerId!==bossSwipe.pointerId)return;
 const delta=e.clientY-bossSwipe.y,card=$('bossEncounterCard');bossSwipe=null;if(Math.abs(delta)<42){card.style.transition='transform .18s ease-out';card.style.transform='translateY(0)';setTimeout(()=>{card.style.transition='';card.style.transform=''},200);return}
 const current=personalGarden?.farmBossProgress?.currentStage||1,next=delta<0?Math.min(BOSS_REWARD_SETTINGS.maxStage,current+1):Math.max(1,current-1);
 if(next===current){showBossEncounterMessage(delta<0?`현재 스테이지 상한 ${BOSS_REWARD_SETTINGS.maxStage}예요`:'첫 스테이지예요');return}
 card.style.transform='';card.style.transition='';card.style.animation='none';void card.offsetWidth;card.style.animation='';renderBossEncounterStage(next);
});
$('bossEncounterScreen').addEventListener('pointercancel',e=>{if(bossSwipe?.pointerId===e.pointerId){bossSwipe=null;const card=$('bossEncounterCard');card.style.transition='transform .18s ease-out';card.style.transform='translateY(0)';setTimeout(()=>{card.style.transition='';card.style.transform=''},200)}});
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
$('exportSave').onclick=()=>{const raw=storage.raw||storage.legacyRaw;if(!raw)return;const url=URL.createObjectURL(new Blob([raw],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='budmori-save-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
$('exportLegacySave').onclick=()=>{const raw=storage.legacyBackup?.raw;if(!raw)return;const url=URL.createObjectURL(new Blob([raw],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='budmori-legacy-save-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
$('importSave').onclick=()=>$('saveFile').click();
$('continueLegacyGame').onclick=async()=>{if(room||attempt||!storage.legacyRaw)return;try{const {validateSave}=await import('./farm-storage.js');validateSave(storage.legacyRaw);imported=storage.legacyRaw;importedLegacy=true;$('importConfirmText').textContent=saveHasLegacyFarmProgress(storage.legacyRaw)?'이전 활동 기반 강화는 종료되고 경험치 포인트로 통합돼요. 기존 무료 강화는 초기화되고, 원본을 먼저 백업합니다. 이어갈까요?':'0.4 원본 저장은 그대로 두고 새 저장 키에 복사해 이어갈까요?';$('confirmImport').textContent='원본을 보존하고 이어가기';$('importConfirm').hidden=false}catch(e){$('saveNotice').textContent=e.message}};

$('saveFile').onchange=async()=>{const file=$('saveFile').files[0];if(!file)return;try{if(file.size>2*1024*1024)throw Error('저장 파일이 너무 큽니다.');const text=await file.text();const {validateSave}=await import('./farm-storage.js');validateSave(text);imported=text;importedLegacy=false;$('importConfirmText').textContent=saveHasLegacyFarmProgress(text)?'이전 활동 기반 강화는 종료되고 경험치 포인트로 통합돼요. 기존 무료 강화는 초기화됩니다. 원본을 먼저 백업한 뒤 이 저장을 불러올까요?':'선택한 파일로 개인 저장을 바꿀까요?';$('confirmImport').textContent='이 저장 불러오기';$('importConfirm').hidden=false}catch(e){$('saveNotice').textContent=e.message}finally{$('saveFile').value=''}};
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
$('farm').onclick=()=>returnToFarm();$('raid').onclick=()=>openBossEncounter();$('return').onclick=()=>returnToFarm();
for(const value of ['breed','merge'])$(value).onclick=()=>active.queue('mode',{value});
$('feed').addEventListener('keydown',e=>{if(e.repeat&&['Enter',' '].includes(e.key))e.preventDefault()});
$('feed').onclick=e=>{if(e.detail===0&&!e.pointerType)requestFeed()};
$('speed').onclick=()=>active.queue('speed',{value:active.speed===1?4:1});
$('pause').onclick=()=>{if(room)return;menuPauseChanged=true;active.paused=!active.paused;if(active.paused)persist();else if(menuOpen)closeMenu()};
function drawTree(){
 const w=personalGarden||active.world,inCombat=w.running||w.farmBossEvent?.phase!=='idle';
 $('treeNodes').innerHTML=renderFarmUpgradeTreeMarkup(w.playerProgression,{location:w.scene,inCombat});
}
function drawAbilityTree(){
 const w=personalGarden||active.world,inCombat=w.running||w.farmBossEvent?.phase!=='idle';
 const selectedSpecies=Number($('abilityPanel').dataset.selectedSpecies||0);
 $('abilityPoints').textContent=String(w.playerProgression.availablePoints);
 for(const button of $('abilitySpeciesTabs').querySelectorAll('[data-ability-species]'))button.setAttribute('aria-pressed',String(Number(button.dataset.abilitySpecies)===selectedSpecies));
 $('abilityNodes').innerHTML=renderAbilityTreeMarkup(w.playerProgression,{highestSpeciesTier:w.highestSpeciesTiers(),location:w.scene,inCombat,selectedSpecies});
}
const menuRoutes={play:'#/menu',growth:'#/growth',abilities:'#/abilities',help:'#/help'};
const routeMenuTab=route=>route==='#/growth'?'growth':route==='#/abilities'?'abilities':route==='#/help'?'help':'play';
function applyMenuTab(tab){
 menuTab=tab;
 for(const button of $('gameMenuTabs').querySelectorAll('[data-menu-tab]')){
  const selected=button.dataset.menuTab===tab;
  button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;
 }
 for(const [name,id] of [['play','menuPlayPanel'],['growth','treePanel'],['abilities','abilityPanel'],['help','helpPanel']])$(id).hidden=name!==tab;
 if(tab==='growth')drawTree();else if(tab==='abilities')drawAbilityTree();
}
function syncMenuPause(tab){
 if(room)return;
 if(tab==='play'){
  if(menuAutoPaused&&!menuPauseChanged)active.paused=menuWasPaused;
  menuAutoPaused=false;
  return;
 }
 if(!menuAutoPaused)menuWasPaused=active.paused;
 menuAutoPaused=true;
 if(!active.paused){active.paused=true;persist()}
}
function openMenu(tab='play',push=true){
 if(!menuOpen){menuWasPaused=active.paused;menuPauseChanged=false;menuAutoPaused=false;menuOpen=true;$('gameMenuOverlay').hidden=false;$('gameMenu').setAttribute('aria-expanded','true')}
 syncMenuPause(tab);
 applyMenuTab(tab);
 if(push)history.pushState(null,'',menuRoutes[tab]||menuRoutes.play);
 $('gameMenuTabs').querySelector(`[data-menu-tab="${tab}"]`)?.focus();
}
function switchMenuTab(tab,push=true){
 if(!['play','growth','abilities','help'].includes(tab))return;
 if(!menuOpen){openMenu(tab,push);return}
 if(menuTab===tab)return;
 syncMenuPause(tab);
 applyMenuTab(tab);
 if(push)history.pushState(null,'',menuRoutes[tab]);
}
function closeMenu(push=true){
 if(!menuOpen)return;
 menuOpen=false;$('gameMenuOverlay').hidden=true;$('gameMenu').setAttribute('aria-expanded','false');
 if(!room&&menuAutoPaused&&!menuPauseChanged)active.paused=menuWasPaused;
 menuPauseChanged=false;menuAutoPaused=false;
 if(push)history.pushState(null,'',active.world.scene==='raid'?'#/raid':'#/farm');
 $('gameMenu').focus();
}
$('gameMenu').onclick=()=>menuOpen?closeMenu():openMenu();
$('gameMenuClose').onclick=()=>closeMenu();
$('menuHome').onclick=()=>{closeMenu(false);setHome(true)};
$('gameMenuTabs').onclick=e=>{const button=e.target.closest('[data-menu-tab]');if(button&&!button.disabled)switchMenuTab(button.dataset.menuTab)};
$('gameMenuTabs').onkeydown=e=>{
 const buttons=[...$('gameMenuTabs').querySelectorAll('[role="tab"]:not(:disabled)')],index=buttons.indexOf(document.activeElement);
 let next=index;
 if(e.key==='ArrowRight')next=(index+1)%buttons.length;else if(e.key==='ArrowLeft')next=(index-1+buttons.length)%buttons.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=buttons.length-1;else return;
 e.preventDefault();buttons[next]?.focus();if(buttons[next])switchMenuTab(buttons[next].dataset.menuTab);
};
const gameMenuOverlay=$('gameMenuOverlay'),closeMenuFromBackdrop=e=>{if(e.target===gameMenuOverlay)closeMenu()};
gameMenuOverlay.addEventListener('pointerdown',closeMenuFromBackdrop);
gameMenuOverlay.addEventListener('click',closeMenuFromBackdrop);
$('treeNodes').onclick=e=>{const b=e.target.closest('[data-progression-farm-node]');if(b){active.queue('progression-invest',{scope:'farm',nodeId:b.dataset.progressionFarmNode});setTimeout(drawTree,180)}};
$('abilitySpeciesTabs').onclick=e=>{const button=e.target.closest('[data-ability-species]');if(!button)return;$('abilityPanel').dataset.selectedSpecies=button.dataset.abilitySpecies;drawAbilityTree()};
$('abilityNodes').onclick=e=>{const button=e.target.closest('button[data-ability-action],button[data-ability-node]');if(!button||button.getAttribute('aria-disabled')==='true')return;if(button.dataset.abilityAction==='reset')active.queue('ability-reset');else if(button.dataset.abilityNode){const [abilityId,kind,level]=button.dataset.abilityNode.split(':');const nodeId=kind==='root'?'root':`${kind}-${level}`;active.queue('progression-invest',{scope:'ability',abilityId,nodeId})}setTimeout(drawAbilityTree,180)};
function focusableMenuButtons(){return[...$('gameMenuPanel').querySelectorAll('button:not(:disabled):not([aria-disabled="true"])')].filter(button=>button.getClientRects().length>0)}
$('gameMenuPanel').onkeydown=e=>{
 if(e.key==='Escape'){e.preventDefault();closeMenu();return}
 if(e.key!=='Tab')return;
 const buttons=focusableMenuButtons();if(!buttons.length)return;
 const first=buttons[0],last=buttons.at(-1);
 if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
 else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
};
const canvas=$('world');
function deploymentHud(){const w=active.world,raid=w.scene==='raid',roster=w.raidRoster(active.localPlayerId),registered=w.raidRosters.length,expected=w.raidExpectedPlayers.length,remaining=roster?w.raidRemaining(active.localPlayerId):personalGarden?.units.length||0,queued=roster?Math.max(0,active.localDeploySequence-roster.lastDeploySequence):0;
 $('raidRemaining').textContent=room&&active.players.length<2?'동료가 들어오기를 기다리는 중…':!roster||registered<expected?`병력 명단 동기화 중 · ${registered}/${expected}명`:`남은 병력 ${Math.max(0,remaining-queued)} · 전장을 탭해 투입 · 누르고 있으면 100ms마다 한 마리`;
 const own=w.raidRoster(active.localPlayerId),cooldown=own?Math.max(0,own.buffReadyAt-w.time):0;$('buff').disabled=!raid||!w.running||!own||cooldown>0;$('buff').textContent=cooldown>0?`강화 ${cooldown.toFixed(1)}초`:'팀 강화';
 const stage=w.boss.stage||0;if(stage){const stageReward=bossStageStats(stage),multiplier=raidDeploymentRewardMultiplier({availableAtStart:own?.troops.length||0,originalUnitsDeployed:own?.troops.filter(t=>t.deployed).length||0}),chance=Math.round(bossAcquisitionChance({acquisitionMultiplier:multiplier})*100);$('raidRewardChance').textContent=stageReward.rolls?`보스 종 ${chance}%씩 · ${stageReward.rolls}회 개별 추첨`:'보스 종 추첨 없음';}else $('raidRewardChance').textContent='';
}
function deployAt(p){if(home||active.world.scene!=='raid'||room&&active.players.length<2||!active.world.raidExpectedPlayers.every(id=>active.world.raidRoster(id)))return false;const valid=ArenaGeometry.inside(p,'raid',.5);renderer.dropTarget={...p,valid};return valid&&active.deployNext(Math.round(p.x*100)/100,Math.round(p.y*100)/100)}
function updateDropPointer(e){if(!dropPointer||e.pointerId!==dropPointer.id)return;const p=renderer.screenToWorld(e.clientX,e.clientY);dropPointer.x=Math.round(p.x*100)/100;dropPointer.y=Math.round(p.y*100)/100;renderer.dropTarget={x:dropPointer.x,y:dropPointer.y,valid:ArenaGeometry.inside(p,'raid',.5)}}
function stopDrop(e){if(e&&dropPointer&&e.pointerId!==dropPointer.id)return;const id=dropPointer?.id;dropPointer=null;if(dropTimer!==null)clearInterval(dropTimer);dropTimer=null;if(id!==undefined&&canvas.hasPointerCapture?.(id))canvas.releasePointerCapture(id)}
canvas.addEventListener('pointerdown',e=>{foodFeel.unlock();if(home||active.world.scene!=='raid'||dropPointer)return;const p=renderer.screenToWorld(e.clientX,e.clientY);if(!ArenaGeometry.inside(p,'raid',.5)){renderer.dropTarget={...p,valid:false};return}canvas.setPointerCapture?.(e.pointerId);dropPointer={id:e.pointerId,x:Math.round(p.x*100)/100,y:Math.round(p.y*100)/100};deployAt(dropPointer);dropTimer=setInterval(()=>{if(dropPointer)deployAt(dropPointer)},100);e.preventDefault()});
canvas.addEventListener('pointermove',updateDropPointer);canvas.addEventListener('pointerup',e=>stopDrop(e));canvas.addEventListener('pointercancel',e=>stopDrop(e));canvas.addEventListener('lostpointercapture',e=>stopDrop(e));
window.addEventListener('pointerup',e=>stopDrop(e),true);window.addEventListener('pointercancel',e=>stopDrop(e),true);
$('buff').onclick=()=>active.queue('buff');
window.addEventListener('blur',()=>{stopDrop();persist()});document.addEventListener('visibilitychange',()=>{if(document.hidden){stopDrop();persist();active.loop.resetTiming()}});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&bossEncounterOpen){e.preventDefault();closeBossEncounter()}else if(e.key==='Escape'&&menuOpen){e.preventDefault();closeMenu()}else if(bossEncounterOpen&&(e.key==='ArrowUp'||e.key==='ArrowDown')){e.preventDefault();const current=personalGarden?.farmBossProgress?.currentStage||1,next=e.key==='ArrowUp'?Math.min(BOSS_REWARD_SETTINGS.maxStage,current+1):Math.max(1,current-1);renderBossEncounterStage(next)}});
window.addEventListener('pageshow',e=>{if(e.persisted)location.reload()});
window.addEventListener('resize',()=>renderer.resize());window.addEventListener('pagehide',()=>{persist();clearInterval(networkTimer);attempt?.abort();room?.close();active.dispose();renderer.dispose()});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();persist();fail(Error('그래픽 연결이 끊겼어요. 새로고침해 다시 이어가 주세요.'))});
function route(){
 const r=location.hash;
 if(r==='#/'||!r){if(menuOpen)closeMenu(false);setHome(true,false);return}
 if(!room&&storage.hasReservedRaid&&active.world.scene!=='raid'){if(menuOpen)closeMenu(false);setHome(true,false);history.replaceState(null,'','#/');return}
 if(home){if(!room&&storage.error&&!storage.hasWorld){setHome(true,false);history.replaceState(null,'','#/');return}if(room)setHome(false,false);else if(storage.hasWorld)start(restore(snapshot(storage.world)),false);else start(new Garden(),false)}
 if(r==='#/boss'){if(!openBossEncounter(false))history.replaceState(null,'','#/farm');return}
 if(r==='#/help'||r==='#/growth'||r==='#/abilities'||r==='#/menu'){
  const raid=active.world.scene==='raid',farmEventActive=!raid&&personalGarden?.farmBossEvent?.phase!=='idle';
  const restricted=r==='#/growth'&&(raid||farmEventActive)||r==='#/abilities'&&(raid||!personalGarden);
  if(restricted){if(menuOpen)closeMenu(false);history.replaceState(null,'',raid?'#/raid':'#/farm');return}
  openMenu(routeMenuTab(r),false);return
 }
 if(menuOpen)closeMenu(false);if(bossEncounterOpen&&r!=='#/boss')closeBossEncounter(false);
 if(r==='#/raid'){if(!room&&personalGarden?.farmBossEvent?.phase!=='idle'){history.replaceState(null,'','#/farm')}else if(!room)openBossEncounter(false)}else if(r==='#/farm'&&active.world.scene==='raid'&&!room)returnToFarm(false)
}
window.addEventListener('popstate',route);
function sync(display,now){
 const w=active.world,raid=display.scene==='raid',farmEvent=display.farmBossEvent,farmEventActive=!raid&&farmEvent?.phase!=='idle',battleHud=raid||farmEventActive,hasReadyTroops=personalGarden?hasRaidRosterEntries(personalGarden.units):false,rewardWorld=personalGarden||w,pendingRewardCount=rewardWorld.bossRewardReceipts.filter(reward=>reward.status==='pending').length;for(const [id,value]of [['farm',!raid&&!bossEncounterOpen],['raid',raid||bossEncounterOpen],['breed',w.mode==='breed'],['merge',w.mode==='merge']])$(id).setAttribute('aria-pressed',value);
 $('bossEncounterScreen').hidden=home||!bossEncounterOpen;$('farmControls').hidden=raid||farmEventActive||home||bossEncounterOpen;$('raidControls').hidden=!raid||home;$('bossbar').hidden=!battleHud||home;$('raid').disabled=farmEventActive;
 $('count').textContent=raid?(w.raidRoster(active.localPlayerId)?.troops.length??personalGarden?.units.length??0):display.units.filter(unit=>!unit.isBattleOnlySummon).length;$('capacity').textContent=personalGarden?.capacity??CONFIG.cap;$('starter').textContent=raid?`${w.units.length} deployed in raid`:pendingRewardCount?'밤톨 보상 대기 · 공간이 생기면 합류해요':!hasReadyTroops?'모두 휴식 중 · 회복까지 기다려 주세요':w.units.filter(unit=>!unit.isBattleOnlySummon).length>=w.capacity?'정원이 가득 찼어요':'번식으로 식구를 늘려요';
 const army=display.units.filter(u=>u.faction===CONFIG.factions.PLAYER).reduce((sum,u)=>({current:sum.current+Math.max(0,Math.min(u.maxHp,u.hp)),max:sum.max+u.maxHp,living:sum.living+(u.hp>0?1:0),total:sum.total+1}),{current:0,max:0,living:0,total:0});
 $('allyHealth').style.width=(army.max?army.current/army.max*100:0)+'%';
 $('allyHealthText').textContent=Math.ceil(army.current)+' / '+Math.ceil(army.max)+' HP · '+army.living+'/'+army.total+' 생존';
const boss=display.boss,battleOutcome=raid?w.encounter.outcome:farmEvent?.outcome,settledReward=raid&&personalGarden?.raidSettlementReceipts?.find(receipt=>receipt.runSequence===personalGarden.activeRaidRunSequence)?.reward,stageName=raid&&boss.stage?`STAGE ${boss.stage}`:'',speciesName=speciesById(boss.species).name;
 $('bossHealthText').textContent=Math.ceil(boss.hp)+' / '+boss.maxHp+' HP';$('bossHealthNote').textContent=farmEventActive?'보스 능력치 고정':'전사자 포함 최대 HP';
 for(const [id,value,max]of [['allyHealth',army.current,army.max],['bossHealth',boss.hp,boss.maxHp]]){const el=$(id);el.setAttribute('aria-valuenow',value);el.setAttribute('aria-valuemax',max)}
 $('bossHealth').style.width=boss.maxHp?boss.hp/boss.maxHp*100+'%':'0%';$('battleOutcome').textContent=raid?(battleOutcome==='victory'?`${stageName} 승리 · ${settledReward?.xp?.amount??bossStageStats(boss.stage||1).xp} XP${settledReward?.acquisition?.rollCount?` · 보스 종 ${settledReward.acquisition.rolls?.filter(drop=>drop.status==='granted').length||0}/${settledReward.acquisition.rollCount}회 성공`:settledReward?' · 보스 종 추첨 없음':bossStageStats(boss.stage||1).rolls?' · 정원 복귀 후 보상 정산':' · 보스 종 추첨 없음'} · 모두 정원으로 돌아갈 수 있어요`:battleOutcome==='defeat'?`${stageName} 패배 · 휴식이 필요해요 · 정원에서 다시 준비해요`:''):(battleOutcome==='victory'?farmEvent.rewardStatus==='granted'?`보스가 쓰러졌어요 · ${speciesName}이(가) 합류했어요`:farmEvent.rewardStatus==='pending'?`${speciesName} 획득 대기 · 공간이 생기면 합류해요`:'보스가 쓰러졌어요':battleOutcome==='defeat'?'동료들이 다시 일어날 때까지 기다려요':'');$('battleOutcome').hidden=home||!battleHud||battleOutcome==='fighting'||battleOutcome==='idle';$('speed').textContent=active.speed+'×';$('pause').disabled=!!room;$('bossEncounterChallenge').disabled=!personalGarden||!hasReadyTroops||farmEventActive||personalGarden?.activeRaidRunSequence!==null||room; $('menuTabGrowth').disabled=raid||farmEventActive||bossEncounterOpen;$('menuTabAbilities').disabled=raid||!personalGarden;$('raid').disabled=raid||farmEventActive||room||!personalGarden;$('pause').textContent=active.paused?'▶':'Ⅱ';
 $('feed').setAttribute('aria-label',`먹이 탭, 5회 중 ${w.foodTaps.remainder}회`);$('feed').dataset.state=w.food.length>=140?'full':'ready';$('feed').dataset.produced=now<foodFeel.completeUntil;
 for(let i=0;i<5;i++)foodFeel.pips[i].classList.toggle('filled',now<foodFeel.completeUntil||i<w.foodTaps.remainder);
 if(observedWorld!==w){observedWorld=w;noticeSequence=w.eventSequence}
 for(const e of w.notices)if(e.sequence>noticeSequence){if(e.kind==='food-tap')foodFeel.tap(e.source,e.completed,e.remainder);else foodFeel.event(e.kind)}noticeSequence=w.eventSequence;foodFeel.frame(now);
 deploymentHud();$('connection').hidden=!room;$('connection').textContent=room?active.session.failure?'연결이 끊겼어요 · 시작 화면에서 나갈 수 있어요':`함께 ${active.players.length}명 · ${active.session.ready?'연결됨':'동기화 중'}`:'';
}
function frame(now){try{measureFrame(now);if(room||!home&&!document.hidden)active.pulse(now);const display=active.presentation(now);combatFeel.observe(active.world,display.displayTimeMs,display.presentationRevision);renderer.render(display,combatFeel,display.displayTimeMs);sync(display,now);requestAnimationFrame(frame)}catch(error){if(typeof globalThis.BloomReportRuntimeFatal==='function')globalThis.BloomReportRuntimeFatal(error);else console.error('Farm render loop stopped',error)}}
 $('productVersion').textContent=PRODUCT_VERSION;$('startVersion').textContent=PRODUCT_VERSION+' · 여섯 등급과 합체 확장';
setHome(true,false);if(location.hash&&location.hash!=='#/')route();requestAnimationFrame(frame);
// Read-only diagnostics for support and browser scenarios. Commands use the product session.
globalThis.BUDMORI={get sim(){return active.world},get runtime(){return active},get room(){return room},get renderMetrics(){return frameRate()},get presentationDiagnostics(){return active.latestPresentationDiagnostics},renderer,storage,foodFeel,combatFeel,CONFIG,ATTACK_TYPES,Ballistics,ArenaGeometry,version:PRODUCT_VERSION};
