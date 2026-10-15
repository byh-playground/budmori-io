import {Garden,CONFIG,TREE_NODES,ArenaGeometry,ATTACK_TYPES,Ballistics} from './farm-model.js';
import {Diorama} from './farm-renderer.js';
import {FarmSession} from './farm-session.js';
import {FarmStorage} from './farm-storage.js';
import {snapshot,restore} from './farm-state.js';
import {PRODUCT_VERSION,COMPATIBILITY} from './version.js';
import {FoodFeel} from './food-feel.js';
const $=id=>document.getElementById(id),storage=new FarmStorage();
let networkTimer=null,observedWorld=null;
let imported=null;
let active=null,home=true,attempt=null,room=null,solo=null,noticeSequence=0,lastSave=0,treePause=false,gesture=null;
const renderer=new Diorama($('world'));
const fail=error=>{$('error').hidden=false;$('error').textContent='정원을 진행하지 못했어요. '+error.message;console.error(error);if(active&&!room)active.paused=true};
const foodFeel=new FoodFeel(requestFeed);
function requestFeed(){if(!home&&active&&!active.paused){foodFeel.unlock();active.queue('feed')}}
function install(world,options={}){clearInterval(networkTimer);active?.dispose();active=new FarmSession(world,{...options,onError:fail});noticeSequence=world.eventSequence;observedWorld=world;if(options.room)networkTimer=setInterval(()=>active.pulse(performance.now()),50);return active}
install(new Garden());active.paused=true;
function persist(){if(active&&!room&&!home){const ok=storage.save(active.world);$('saveNotice').textContent=ok?'':storage.error;$('treeStorage').hidden=ok} }
function refreshStart(){
 if(room||attempt){$('newConfirm').hidden=true;$('importConfirm').hidden=true;imported=null}
 $('continueGame').disabled=!storage.world;$('exportSave').disabled=!storage.raw;
 $('saveNotice').textContent=storage.error;$('newGame').hidden=!!room;
 $('continueGame').hidden=!!room;$('onlineGame').hidden=!!room||!!attempt;
 $('cancelOnline').hidden=!attempt;$('leaveOnline').hidden=!room;
 $('importSave').disabled=!!room||!!attempt;$('newGame').disabled=!!attempt;
}
function setHome(value,push=true){
 cancelGesture();if(value)persist();home=value;document.body.dataset.home=String(value);$('startScreen').hidden=!value;
 if(!room)active.paused=value;
 $('treePanel').hidden=true;$('helpPanel').hidden=true;
 if(push)history.pushState(null,'',value?'#/':active.world.scene==='raid'?'#/raid':'#/farm');
 refreshStart();if(value)$('continueGame').focus();
}
function start(world,push=true){install(world);setHome(false,push)}
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
 if(attempt||room)return;persist();solo=restore(snapshot(storage.world||active.world));const controller=attempt=new AbortController();refreshStart();$('sessionNotice').textContent='함께할 정원을 찾고 있어요…';
 try{
  const next=await BloomGamekitTransport.createNostrPublicRoom({namespace:'budmori-public-v1',simulationVersion:'budmori-farm-'+COMPATIBILITY,maxPlayers:5,discoveryMs:1500,totalTimeoutMs:60000,peerTimeoutMs:20000,signal:controller.signal,onStatus:e=>{if(attempt===controller)$('sessionNotice').textContent=({discovering:'함께할 정원을 찾고 있어요…',hosting:'새 정원을 열고 있어요…',joining:'정원에 연결하고 있어요…'})[e.type]||'함께할 정원을 준비하고 있어요…'}});
  if(controller.signal.aborted){next.close();return}room=next;install(new Garden(BloomGamekitDeterministic.hashBytes(new TextEncoder().encode(next.sessionId))),{room:next});$('sessionNotice').textContent='함께 가꾸는 정원 · 개인 저장은 보존됩니다.';setHome(false);
 }catch(e){if(!controller.signal.aborted)$('sessionNotice').textContent='연결하지 못했어요. '+e.message}
 finally{if(attempt===controller)attempt=null;refreshStart()}
};
$('cancelOnline').onclick=()=>{attempt?.abort();attempt=null;$('sessionNotice').textContent='연결을 취소했어요.';refreshStart()};
$('leaveOnline').onclick=async()=>{
 if(!room)return;const leaving=room;$('leaveOnline').disabled=true;
 try{await active.session.leave()}catch{}finally{active.dispose();leaving.close();room=null;install(solo||new Garden());solo=null;$('sessionNotice').textContent='개인 정원으로 돌아왔어요.';$('leaveOnline').disabled=false;setHome(true)}
};
function scene(value,push=true){cancelGesture();active.queue('scene',{value});if(push)history.pushState(null,'',value==='raid'?'#/raid':'#/farm')}
$('farm').onclick=()=>scene('farm');$('raid').onclick=()=>scene('raid');$('return').onclick=()=>scene('farm');
for(const value of ['breed','merge'])$(value).onclick=()=>active.queue('mode',{value});
$('feed').addEventListener('keydown',e=>{if(e.repeat&&['Enter',' '].includes(e.key))e.preventDefault()});
$('feed').onclick=e=>{if(e.detail===0&&!e.pointerType)requestFeed()};
$('speed').onclick=()=>active.queue('speed',{value:active.speed===1?4:1});
$('pause').onclick=()=>{if(room)return;cancelGesture();active.paused=!active.paused};
function drawTree(){
 const p=active.world.progress,labels={eat:'식사',birth:'번식',merge:'합체',hit:'보스 타격'};
 $('treeNodes').innerHTML=TREE_NODES.map(n=>{const l=p.levels[n.id],goal=n.goal*(l+1),parent=TREE_NODES.find(v=>v.id===n.parent);return `<article class="tree-node" data-ready="${p.ready(n)}"><div class="node-heading"><span class="node-icon" aria-hidden="true">${n.icon}</span><h3>${n.name}</h3><span>${l}/4</span></div><p>${n.description}</p><div class="node-values">${n.value(l)}${l<4?` <span>→ ${n.value(l+1)}</span>`:''}</div><progress max="${goal}" value="${Math.min(goal,p.records[n.metric])}"></progress><small>${l===4?'완료':`${labels[n.metric]} ${p.records[n.metric]}/${goal}${parent&&!p.levels[parent.id]?` · ${parent.name} 1 필요`:''}`}</small><button data-invest="${n.id}" ${p.ready(n)?'':'disabled'}>${l===4?'✓':'+'}<span class="sr-only">${n.name} 투자</span></button></article>`}).join('');
}
function panel(id,open,push=true){
 cancelGesture();if(open){if($('treePanel').hidden&&$('helpPanel').hidden)treePause=active.paused;if(!room)active.paused=true;$('treePanel').hidden=id!=='treePanel';$('helpPanel').hidden=id!=='helpPanel';if(id==='treePanel')drawTree();$(id).querySelector('button').focus()}
 else{$(id).hidden=true;if(!room)active.paused=treePause;$(id==='treePanel'?'tree':'help').focus()}
 $('tree').setAttribute('aria-expanded',!$('treePanel').hidden);$('help').setAttribute('aria-expanded',!$('helpPanel').hidden);
 if(push)history.pushState(null,'',open?id==='treePanel'?'#/growth':'#/help':active.world.scene==='raid'?'#/raid':'#/farm');
}
$('tree').onclick=()=>panel('treePanel',true);$('treeClose').onclick=()=>panel('treePanel',false);$('help').onclick=()=>panel('helpPanel',$('helpPanel').hidden);$('closeHelp').onclick=()=>panel('helpPanel',false);
$('treeNodes').onclick=e=>{const b=e.target.closest('[data-invest]');if(b){active.queue('invest',{id:b.dataset.invest});setTimeout(drawTree,180)}};
$('treePanel').onkeydown=e=>{if(e.key==='Tab'){const f=[...$('treePanel').querySelectorAll('button:not(:disabled)')],i=f.indexOf(document.activeElement);if(e.shiftKey&&i<=0||!e.shiftKey&&i===f.length-1){e.preventDefault();f[e.shiftKey?f.length-1:0].focus()}}};
const canvas=$('world');
function cancelGesture(){if(gesture){clearTimeout(gesture.timer);const id=gesture.id;gesture=null;if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id)}active?.queue('cancel')}
function arm(g){if(g!==gesture||g.held||active.paused||home)return;clearTimeout(g.timer);g.held=true;active.queue('charge',{origin:g.origin,ids:g.ids,pointerType:g.pointerType});active.queue('aim',{point:g.aim})}
canvas.addEventListener('pointerdown',e=>{
 const w=active.world;if(e.button!==0||gesture||home||active.paused||w.scene!=='raid'||!w.running||!$('treePanel').hidden||!$('helpPanel').hidden)return;
 const p=renderer.groundPoint(e.clientX,e.clientY);if(!ArenaGeometry.inside(p))return;e.preventDefault();foodFeel.unlock();canvas.setPointerCapture(e.pointerId);
 const g=gesture={id:e.pointerId,x:e.clientX,y:e.clientY,origin:p,aim:p,ids:w.chargeMembers(p.x,p.y),pointerType:e.pointerType,held:false,timer:0};g.timer=setTimeout(()=>arm(g),250);
});
canvas.addEventListener('pointermove',e=>{if(e.pointerId!==gesture?.id)return;e.preventDefault();const g=gesture;g.aim=renderer.groundPoint(e.clientX,e.clientY);if(Math.hypot(e.clientX-g.x,e.clientY-g.y)>10)arm(g);if(g.held)active.queue('aim',{point:g.aim})});
canvas.addEventListener('pointerup',e=>{
 if(e.pointerId!==gesture?.id)return;const g=gesture,p=renderer.groundPoint(e.clientX,e.clientY);g.aim=p;if(Math.hypot(e.clientX-g.x,e.clientY-g.y)>10)arm(g);clearTimeout(g.timer);gesture=null;
 if(g.held)active.queue('release',{point:p});else if(ArenaGeometry.inside(p))active.queue('move',{point:p});
 if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
});
canvas.addEventListener('pointercancel',cancelGesture);canvas.addEventListener('lostpointercapture',cancelGesture);
window.addEventListener('blur',()=>{cancelGesture();persist()});document.addEventListener('visibilitychange',()=>{cancelGesture();if(document.hidden){persist();active.loop.resetTiming()}});
for(const b of document.querySelectorAll('button'))b.addEventListener('pointerdown',cancelGesture);
window.addEventListener('keydown',e=>{if(e.key==='Escape'){cancelGesture();if(!$('treePanel').hidden)panel('treePanel',false);else if(!$('helpPanel').hidden)panel('helpPanel',false)}});
window.addEventListener('pageshow',e=>{if(e.persisted)location.reload()});
window.addEventListener('resize',()=>renderer.resize());window.addEventListener('pagehide',()=>{persist();clearInterval(networkTimer);attempt?.abort();room?.close();active.dispose()});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();persist();fail(Error('그래픽 연결이 끊겼어요. 새로고침해 다시 이어가 주세요.'))});
function route(){const r=location.hash;if(r==='#/'||!r){setHome(true,false);return}if(home){if(room)setHome(false,false);else if(storage.world)start(restore(snapshot(storage.world)),false);else{install(new Garden());home=false;document.body.dataset.home='false';$('startScreen').hidden=true}}if(r==='#/help'||r==='#/growth')panel(r==='#/help'?'helpPanel':'treePanel',true,false);else{if(!$('treePanel').hidden)panel('treePanel',false,false);if(!$('helpPanel').hidden)panel('helpPanel',false,false);scene(r==='#/raid'?'raid':'farm',false)}}
window.addEventListener('popstate',route);
function sync(now){
 const w=active.world,raid=w.scene==='raid';for(const [id,value]of [['farm',!raid],['raid',raid],['breed',w.mode==='breed'],['merge',w.mode==='merge']])$(id).setAttribute('aria-pressed',value);
 $('farmControls').hidden=raid||home;$('raidControls').hidden=!raid||home;$('bossbar').hidden=!raid||home;$('roles').hidden=!raid||home;
 $('count').textContent=w.units.length;$('starter').textContent=w.units.length>=CONFIG.cap?'정원이 가득해요':`새싹까지 ${Math.ceil(CONFIG.starterSeconds/w.progress.rate('production')-w.starter)}초`;
 $('bossHealth').style.width=w.boss.hp/w.boss.maxHp*100+'%';$('speed').textContent=active.speed+'×';$('pause').disabled=!!room;$('pause').textContent=active.paused?'▶':'Ⅱ';
 $('feed').setAttribute('aria-label',`먹이 탭, 5회 중 ${w.foodTaps.remainder}회`);$('feed').dataset.state=w.food.length>=140?'full':'ready';$('feed').dataset.produced=now<foodFeel.completeUntil;
 for(let i=0;i<5;i++)foodFeel.pips[i].classList.toggle('filled',now<foodFeel.completeUntil||i<w.foodTaps.remainder);
 if(observedWorld!==w){observedWorld=w;noticeSequence=w.eventSequence}
 for(const e of w.notices)if(e.sequence>noticeSequence){if(e.kind==='food-tap')foodFeel.tap(e.source,e.completed,e.remainder);else foodFeel.event(e.kind)}noticeSequence=w.eventSequence;foodFeel.frame(now);
 $('connection').hidden=!room;$('connection').textContent=room?active.session.failure?'연결이 끊겼어요 · 시작 화면에서 나갈 수 있어요':`함께 ${active.players.length}명 · ${active.session.ready?'연결됨':'동기화 중'}`:'';
 if(now-lastSave>3000){lastSave=now;persist()}
}
function frame(now){if(room||!home&&!document.hidden)active.pulse(now);renderer.render(active.presentation(now));sync(now);requestAnimationFrame(frame)}
$('productVersion').textContent=PRODUCT_VERSION;$('startVersion').textContent=PRODUCT_VERSION+' · 농장과 거대 보스';
setHome(true,false);if(location.hash&&location.hash!=='#/')route();requestAnimationFrame(frame);
// Read-only diagnostics for support and browser scenarios. Commands use the product session.
globalThis.BUDMORI={get sim(){return active.world},get runtime(){return active},get room(){return room},renderer,storage,foodFeel,ATTACK_TYPES,Ballistics,ArenaGeometry,version:PRODUCT_VERSION};
