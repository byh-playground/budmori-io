import {Garden,CONFIG,TREE_NODES,ArenaGeometry,ATTACK_TYPES,Ballistics} from './farm-model.js';
import {SeedArt} from './seed-art.js';
import {Diorama} from './farm-renderer.js';
import {FarmSession} from './farm-session.js';
import {FarmStorage} from './farm-storage.js';
import {snapshot,restore} from './farm-state.js';
import {PRODUCT_VERSION} from './version.js';
import {FoodFeel} from './food-feel.js';
import {CombatFeel} from './combat-feel.js';
const $=id=>document.getElementById(id),storage=new FarmStorage();
let networkTimer=null,observedWorld=null;
let imported=null;
let active=null,home=true,attempt=null,room=null,solo=null,personalGarden=null,noticeSequence=0,lastSave=0,treePause=false,dropPointer=null,dropTimer=null;
const renderer=new Diorama($('world'));
const measuredFrames=[];let lastFrameTimestamp=null,frameCount=0;
function measureFrame(now){if(lastFrameTimestamp!==null){measuredFrames.push(now-lastFrameTimestamp);if(measuredFrames.length>240)measuredFrames.shift()}lastFrameTimestamp=now;frameCount++}
function frameRate(){const sorted=[...measuredFrames].sort((a,b)=>a-b),sum=measuredFrames.reduce((a,b)=>a+b,0);return{frames:frameCount,fps:sum?measuredFrames.length*1000/sum:0,frametimeMs:{p50:sorted[Math.floor((sorted.length-1)*.5)]||0,p95:sorted[Math.floor((sorted.length-1)*.95)]||0,max:Math.max(0,...measuredFrames)}}}
const fail=error=>{$('error').hidden=false;$('error').textContent='정원을 진행하지 못했어요. '+error.message;console.error(error);if(active&&!room)active.paused=true};
const foodFeel=new FoodFeel(requestFeed);
const combatFeel=new CombatFeel(foodFeel);
function requestFeed(){if(!home&&active&&!active.paused){foodFeel.unlock();active.queue('feed')}}
function install(world,options={}){clearInterval(networkTimer);active?.dispose();active=new FarmSession(world,{...options,onError:fail});noticeSequence=world.eventSequence;observedWorld=world;if(options.room)networkTimer=setInterval(()=>active.pulse(performance.now()),50);return active}
install(new Garden());active.paused=true;
function persist(){if(personalGarden){const ok=storage.save(personalGarden);$('saveNotice').textContent=ok?'':storage.error;$('treeStorage').hidden=ok}}
function refreshStart(){
 if(room||attempt){$('newConfirm').hidden=true;$('importConfirm').hidden=true;imported=null}
 $('continueGame').disabled=!storage.world;$('exportSave').disabled=!storage.raw;
 $('saveNotice').textContent=storage.error;$('newGame').hidden=!!room;
 $('continueGame').hidden=!!room;$('onlineGame').hidden=!!room||!!attempt;
 $('cancelOnline').hidden=!attempt;$('leaveOnline').hidden=!room;
 $('importSave').disabled=!!room||!!attempt;$('newGame').disabled=!!attempt;
}
function setHome(value,push=true){
 if(value)persist();home=value;document.body.dataset.home=String(value);$('startScreen').hidden=!value;
 if(!room)active.paused=value;
 $('treePanel').hidden=true;$('helpPanel').hidden=true;
 if(push)history.pushState(null,'',value?'#/':active.world.scene==='raid'?'#/raid':'#/farm');
 refreshStart();if(value)$('continueGame').focus();
}
function start(world,push=true){foodFeel.unlock();personalGarden=world;install(world);setHome(false,push)}
function beginRaid(push=true){if(room||!personalGarden||active.world.scene==='raid')return;persist();renderer.dropTarget=null;const battle=Garden.createRaidBattle((personalGarden.seed+Math.floor(performance.now()))>>>0,['solo']);install(battle);active.queue('register-roster',{entries:personalGarden.units.slice(0,CONFIG.maxRaidPlayerUnits).map(u=>[u.id,u.species,u.tier])});setHome(false,push)}
async function returnToFarm(push=true){stopDrop();if(room){const leaving=room;try{await active.session.leave()}catch{}active.dispose();leaving.close();room=null;solo=null}if(!personalGarden)return;renderer.dropTarget=null;install(personalGarden);setHome(false,push)}
$('continueGame').onclick=()=>{if(storage.world)start(restore(snapshot(storage.world)))};
$('newGame').onclick=()=>{
 // Overwriting an existing save is a separate, explicit user action.
 if(storage.raw&&!$('newConfirm').hidden)return;
 if(storage.raw){$('newConfirm').hidden=false;return}
 const world=new Garden();storage.replace(world);start(world);
};
$('confirmNew').onclick=()=>{if(room||attempt)return;const world=new Garden();if(storage.replace(world)){$('newConfirm').hidden=true;start(world)}else refreshStart()};
$('cancelNew').onclick=()=>{$('newConfirm').hidden=true};
$('home').onclick=()=>setHome(true);
$('exportSave').onclick=()=>{if(!storage.raw)return;const url=URL.createObjectURL(new Blob([storage.raw],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='budmori-save-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
$('importSave').onclick=()=>$('saveFile').click();

$('saveFile').onchange=async()=>{const file=$('saveFile').files[0];if(!file)return;try{if(file.size>2*1024*1024)throw Error('저장 파일이 너무 큽니다.');const text=await file.text();const {parseSave}=await import('./farm-storage.js');parseSave(text);imported=text;$('importConfirm').hidden=false}catch(e){$('saveNotice').textContent=e.message}finally{$('saveFile').value=''}};
$('cancelImport').onclick=()=>{imported=null;$('importConfirm').hidden=true};
$('confirmImport').onclick=()=>{if(room||attempt)return;try{if(imported)storage.import(imported);imported=null;$('importConfirm').hidden=true;refreshStart()}catch(e){$('saveNotice').textContent=e.message}};
$('onlineGame').onclick=async()=>{
 if(attempt||room)return;personalGarden=restore(snapshot(storage.world||personalGarden||active.world));persist();solo=restore(snapshot(personalGarden));const controller=attempt=new AbortController();refreshStart();$('sessionNotice').textContent='함께할 정원을 찾고 있어요…';
 try{
  const next=await BloomGamekitTransport.createNostrPublicRoom({namespace:'budmori-public-v1',simulationVersion:'budmori-farm-'+PRODUCT_VERSION,maxPlayers:CONFIG.maxRaidPlayers,discoveryMs:1500,totalTimeoutMs:60000,peerTimeoutMs:20000,signal:controller.signal,onStatus:e=>{if(attempt===controller)$('sessionNotice').textContent=({discovering:'함께할 정원을 찾고 있어요…',hosting:'새 정원을 열고 있어요…',joining:'정원에 연결하고 있어요…'})[e.type]||'함께할 정원을 준비하고 있어요…'}});
  if(controller.signal.aborted){next.close();return}room=next;const battle=Garden.createRaidBattle(BloomGamekitDeterministic.hashBytes(new TextEncoder().encode(next.sessionId)),next.players);install(battle,{room:next});active.queue('register-roster',{entries:personalGarden.units.slice(0,CONFIG.maxRaidPlayerUnits).map(u=>[u.id,u.species,u.tier])});$('sessionNotice').textContent='함께 가꾸는 정원 · 개인 저장은 보존됩니다.';setHome(false);
 }catch(e){if(!controller.signal.aborted)$('sessionNotice').textContent='연결하지 못했어요. '+e.message}
 finally{if(attempt===controller)attempt=null;refreshStart()}
};
$('cancelOnline').onclick=()=>{attempt?.abort();attempt=null;$('sessionNotice').textContent='연결을 취소했어요.';refreshStart()};
$('leaveOnline').onclick=async()=>{if(!room)return;$('leaveOnline').disabled=true;try{await returnToFarm(false);setHome(true)}finally{$('leaveOnline').disabled=false}};
$('farm').onclick=()=>returnToFarm();$('raid').onclick=()=>beginRaid();$('return').onclick=()=>returnToFarm();
for(const value of ['breed','merge'])$(value).onclick=()=>active.queue('mode',{value});
$('feed').addEventListener('keydown',e=>{if(e.repeat&&['Enter',' '].includes(e.key))e.preventDefault()});
$('feed').onclick=e=>{if(e.detail===0&&!e.pointerType)requestFeed()};
$('speed').onclick=()=>active.queue('speed',{value:active.speed===1?4:1});
$('pause').onclick=()=>{if(room)return;active.paused=!active.paused};
function drawTree(){
 const p=(personalGarden||active.world).progress,labels={eat:'식사',birth:'번식',merge:'합체',hit:'보스 타격'};
 $('treeNodes').innerHTML=TREE_NODES.map(n=>{const l=p.levels[n.id],goal=n.goal*(l+1),parent=TREE_NODES.find(v=>v.id===n.parent);return `<article class="tree-node" data-ready="${p.ready(n)}"><div class="node-heading"><span class="node-icon" aria-hidden="true">${n.icon}</span><h3>${n.name}</h3><span>${l}/4</span></div><p>${n.description}</p><div class="node-values">${n.value(l)}${l<4?` <span>→ ${n.value(l+1)}</span>`:''}</div><progress max="${goal}" value="${Math.min(goal,p.records[n.metric])}"></progress><small>${l===4?'완료':`${labels[n.metric]} ${p.records[n.metric]}/${goal}${parent&&!p.levels[parent.id]?` · ${parent.name} 1 필요`:''}`}</small><button data-invest="${n.id}" ${p.ready(n)?'':'disabled'}>${l===4?'✓':'+'}<span class="sr-only">${n.name} 투자</span></button></article>`}).join('');
}
function panel(id,open,push=true){
 if(open){if($('treePanel').hidden&&$('helpPanel').hidden)treePause=active.paused;if(!room)active.paused=true;$('treePanel').hidden=id!=='treePanel';$('helpPanel').hidden=id!=='helpPanel';if(id==='treePanel')drawTree();$(id).querySelector('button').focus()}
 else{$(id).hidden=true;if(!room)active.paused=treePause;$(id==='treePanel'?'tree':'help').focus()}
 $('tree').setAttribute('aria-expanded',!$('treePanel').hidden);$('help').setAttribute('aria-expanded',!$('helpPanel').hidden);
 if(push)history.pushState(null,'',open?id==='treePanel'?'#/growth':'#/help':active.world.scene==='raid'?'#/raid':'#/farm');
}
$('tree').onclick=()=>panel('treePanel',true);$('treeClose').onclick=()=>panel('treePanel',false);$('help').onclick=()=>panel('helpPanel',$('helpPanel').hidden);$('closeHelp').onclick=()=>panel('helpPanel',false);
$('treeNodes').onclick=e=>{const b=e.target.closest('[data-invest]');if(b){active.queue('invest',{id:b.dataset.invest});setTimeout(drawTree,180)}};
$('treePanel').onkeydown=e=>{if(e.key==='Tab'){const f=[...$('treePanel').querySelectorAll('button:not(:disabled)')],i=f.indexOf(document.activeElement);if(e.shiftKey&&i<=0||!e.shiftKey&&i===f.length-1){e.preventDefault();f[e.shiftKey?f.length-1:0].focus()}}};
const canvas=$('world');
function deploymentHud(){const w=active.world,raid=w.scene==='raid',roster=w.raidRoster(active.localPlayerId),registered=w.raidRosters.length,expected=w.raidExpectedPlayers.length,remaining=roster?w.raidRemaining(active.localPlayerId):personalGarden?.units.length||0,queued=roster?Math.max(0,active.localDeploySequence-roster.lastDeploySequence):0;
 $('raidRemaining').textContent=room&&active.players.length<2?'동료가 들어오기를 기다리는 중…':!roster||registered<expected?`병력 명단 동기화 중 · ${registered}/${expected}명`:`남은 병력 ${Math.max(0,remaining-queued)} · 전장을 탭해 투입 · 누르고 있으면 250ms마다 한 마리`;
 const own=w.raidRoster(active.localPlayerId),cooldown=own?Math.max(0,own.buffReadyAt-w.time):0;$('buff').disabled=!raid||!w.running||!own||cooldown>0;$('buff').textContent=cooldown>0?`강화 ${cooldown.toFixed(1)}초`:'팀 강화';
}
function deployAt(p){if(home||active.world.scene!=='raid'||room&&active.players.length<2||!active.world.raidExpectedPlayers.every(id=>active.world.raidRoster(id)))return false;const valid=ArenaGeometry.inside(p,'raid',.5);renderer.dropTarget={...p,valid};return valid&&active.deployNext(Math.round(p.x*100)/100,Math.round(p.y*100)/100)}
function stopDrop(e){if(e&&dropPointer&&e.pointerId!==dropPointer.id)return;if(dropTimer!==null)clearInterval(dropTimer);dropTimer=null;if(dropPointer&&canvas.hasPointerCapture?.(dropPointer.id))canvas.releasePointerCapture(dropPointer.id);dropPointer=null}
canvas.addEventListener('pointerdown',e=>{foodFeel.unlock();if(home||active.world.scene!=='raid')return;canvas.setPointerCapture?.(e.pointerId);const p=renderer.screenToWorld(e.clientX,e.clientY);if(!ArenaGeometry.inside(p,'raid',.5)){renderer.dropTarget={...p,valid:false};return}dropPointer={id:e.pointerId,x:Math.round(p.x*100)/100,y:Math.round(p.y*100)/100};deployAt(dropPointer);dropTimer=setInterval(()=>{if(dropPointer)deployAt(dropPointer)},250);e.preventDefault()});
canvas.addEventListener('pointerup',e=>stopDrop(e));canvas.addEventListener('pointercancel',e=>stopDrop(e));canvas.addEventListener('lostpointercapture',e=>stopDrop(e));
window.addEventListener('pointerup',e=>stopDrop(e),true);window.addEventListener('pointercancel',e=>stopDrop(e),true);
$('buff').onclick=()=>active.queue('buff');
window.addEventListener('blur',()=>{stopDrop();persist()});document.addEventListener('visibilitychange',()=>{if(document.hidden){stopDrop();persist();active.loop.resetTiming()}});
window.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('treePanel').hidden)panel('treePanel',false);else if(!$('helpPanel').hidden)panel('helpPanel',false)}});
window.addEventListener('pageshow',e=>{if(e.persisted)location.reload()});
window.addEventListener('resize',()=>renderer.resize());window.addEventListener('pagehide',()=>{persist();clearInterval(networkTimer);attempt?.abort();room?.close();active.dispose();renderer.dispose()});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();persist();fail(Error('그래픽 연결이 끊겼어요. 새로고침해 다시 이어가 주세요.'))});
function route(){const r=location.hash;if(r==='#/'||!r){setHome(true,false);return}if(home){if(!room&&storage.error&&!storage.world){setHome(true,false);history.replaceState(null,'','#/');return}if(room)setHome(false,false);else if(storage.world)start(restore(snapshot(storage.world)),false);else start(new Garden(),false)}if(r==='#/help'||r==='#/growth')panel(r==='#/help'?'helpPanel':'treePanel',true,false);else{if(!$('treePanel').hidden)panel('treePanel',false,false);if(!$('helpPanel').hidden)panel('helpPanel',false,false);if(r==='#/raid'){if(!room)beginRaid(false)}else if(r==='#/farm'&&active.world.scene==='raid'&&!room)returnToFarm(false)}}
window.addEventListener('popstate',route);
function sync(display,now){
 const w=active.world,raid=display.scene==='raid';for(const [id,value]of [['farm',!raid],['raid',raid],['breed',w.mode==='breed'],['merge',w.mode==='merge']])$(id).setAttribute('aria-pressed',value);
 $('farmControls').hidden=raid||home;$('raidControls').hidden=!raid||home;$('bossbar').hidden=!raid||home;$('roles').hidden=!raid||home;
 $('count').textContent=raid?(w.raidRoster(active.localPlayerId)?.troops.length??personalGarden?.units.length??0):display.units.length;$('capacity').textContent=personalGarden?.capacity??CONFIG.cap;$('starter').textContent=raid?`${w.units.length} deployed in raid`:w.units.length>=w.capacity?'정원이 가득 찼어요':`다음 씨앗까지 ${Math.ceil(CONFIG.starterSeconds/w.progress.rate('production')-w.starter)}초`;
 const army=display.units.reduce((sum,u)=>({current:sum.current+Math.max(0,Math.min(u.maxHp,u.hp)),max:sum.max+u.maxHp,living:sum.living+(u.hp>0?1:0),total:sum.total+1}),{current:0,max:0,living:0,total:0});
 $('allyHealth').style.width=(army.max?army.current/army.max*100:0)+'%';
 $('allyHealthText').textContent=Math.ceil(army.current)+' / '+Math.ceil(army.max)+' HP · '+army.living+'/'+army.total+' 생존';
 const boss=display.boss,battleOutcome=w.encounter.outcome;
  $('bossHealthText').textContent=Math.ceil(boss.hp)+' / '+boss.maxHp+' HP';
 for(const [id,value,max]of [['allyHealth',army.current,army.max],['bossHealth',boss.hp,boss.maxHp]]){const el=$(id);el.setAttribute('aria-valuenow',value);el.setAttribute('aria-valuemax',max)}
 $('bossHealth').style.width=boss.maxHp?boss.hp/boss.maxHp*100+'%':'0%';$('battleOutcome').textContent=battleOutcome==='victory'?'승리 · 모두 정원으로 돌아갈 수 있어요':battleOutcome==='defeat'?'휴식이 필요해요 · 정원에서 다시 준비해요':'';$('battleOutcome').hidden=home||!raid||battleOutcome==='fighting';$('speed').textContent=active.speed+'×';$('pause').disabled=!!room;$('tree').disabled=raid;$('pause').textContent=active.paused?'▶':'Ⅱ';
 $('feed').setAttribute('aria-label',`먹이 탭, 5회 중 ${w.foodTaps.remainder}회`);$('feed').dataset.state=w.food.length>=140?'full':'ready';$('feed').dataset.produced=now<foodFeel.completeUntil;
 for(let i=0;i<5;i++)foodFeel.pips[i].classList.toggle('filled',now<foodFeel.completeUntil||i<w.foodTaps.remainder);
 if(observedWorld!==w){observedWorld=w;noticeSequence=w.eventSequence}
 for(const e of w.notices)if(e.sequence>noticeSequence){if(e.kind==='food-tap')foodFeel.tap(e.source,e.completed,e.remainder);else foodFeel.event(e.kind)}noticeSequence=w.eventSequence;foodFeel.frame(now);
 deploymentHud();$('connection').hidden=!room;$('connection').textContent=room?active.session.failure?'연결이 끊겼어요 · 시작 화면에서 나갈 수 있어요':`함께 ${active.players.length}명 · ${active.session.ready?'연결됨':'동기화 중'}`:'';
 if(now-lastSave>3000){lastSave=now;persist()}
}
function frame(now){measureFrame(now);if(room||!home&&!document.hidden)active.pulse(now);const display=active.presentation(now);combatFeel.observe(active.world,display.displayTimeMs,display.presentationRevision);renderer.render(display,combatFeel,display.displayTimeMs);sync(display,now);requestAnimationFrame(frame)}
$('productVersion').textContent=PRODUCT_VERSION;$('startVersion').textContent=PRODUCT_VERSION+' · 농장과 거대 보스';
setHome(true,false);if(location.hash&&location.hash!=='#/')route();requestAnimationFrame(frame);
// Read-only diagnostics for support and browser scenarios. Commands use the product session.
globalThis.BUDMORI={SeedArt,get sim(){return active.world},get runtime(){return active},get room(){return room},get renderMetrics(){return frameRate()},get presentationDiagnostics(){return active.latestPresentationDiagnostics},renderer,storage,foodFeel,combatFeel,CONFIG,ATTACK_TYPES,Ballistics,ArenaGeometry,version:PRODUCT_VERSION};
