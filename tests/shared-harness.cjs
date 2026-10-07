'use strict';
// Actual HTML engine and embedded SDK; deterministic byte-transport test double.
// Does not exercise signaling, RTC, browser storage, browser refresh, or GPU.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {engine}=require('./native-engine.cjs');
function candidate(argv=process.argv.slice(2)){
 const file=path.resolve(argv.find(a=>!a.startsWith('--'))||path.join(__dirname,'../index.html'));
 let html=fs.readFileSync(file,'utf8');const option=argv.find(a=>a.startsWith('--sdk='));
 if(option){const sdk=path.resolve(option.slice(6)),built=require('esbuild').buildSync({entryPoints:[sdk],bundle:true,format:'iife',globalName:'BloomOwnedSDK',write:false,platform:'browser',target:'es2020'}).outputFiles[0].text;
  const pattern=/\/\* BEGIN GAMEKIT rollback-netcode \*\/[\s\S]*?\/\* END GAMEKIT rollback-netcode \*\//;
  assert(pattern.test(html),'candidate must contain the declared SDK bundle');html=html.replace(pattern,`/* BEGIN GAMEKIT rollback-netcode */\n${built}\n/* END GAMEKIT rollback-netcode */`);
 }
 return{file,html,sha256:crypto.createHash('sha256').update(html).digest('hex'),sdk:option?.slice(6)||'embedded'};
}
function network(){
 const rooms=new Map(),packets=[];let delivered=0;
 function emit(room,event){for(const fn of room.listeners)fn(event)}
 function disconnect(a,b){const ra=rooms.get(a),rb=rooms.get(b);ra?.transports.get(b)?.close();rb?.transports.get(a)?.close();ra?.transports.delete(b);rb?.transports.delete(a);if(ra)emit(ra,{type:'peer-disconnected',peerId:b,reason:'test-disconnect'});if(rb)emit(rb,{type:'peer-disconnected',peerId:a,reason:'test-disconnect'})}
 function pair(a,b){const ra=rooms.get(a),rb=rooms.get(b);assert(ra&&!ra.closed&&rb&&!rb.closed,`live endpoints ${a}/${b}`);if(ra.transports.get(b)?.state==='open'&&rb.transports.get(a)?.state==='open')return;
  const sides=new Map();for(const [self,remote]of[[a,b],[b,a]]){const listeners=new Set(),status=new Set(),t={state:'open',send(data){if(t.state!=='open')return false;const copy=data.slice();packets.push(()=>{const other=sides.get(remote);if(t.state==='open'&&other.state==='open'){delivered++;for(const fn of other.listeners)fn(copy.slice())}});return true},subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)},subscribeStatus(fn){status.add(fn);return()=>status.delete(fn)},listeners,close(){if(t.state==='closed')return;t.state='closed';for(const fn of status)fn('closed')}};sides.set(self,t);rooms.get(self).transports.set(remote,t)}
  for(const[self,remote]of[[a,b],[b,a]])emit(rooms.get(self),{type:'peer-connected',peerId:remote,transport:sides.get(self)});
 }
 return{rooms,add(id,resumed=false){const current=[...rooms.values()].find(r=>!r.closed&&r.localPlayerId!==id&&r.players.includes(r.localPlayerId));
   const r={resumed,localPlayerId:id,sessionId:'budmori-shared-campaign',coordinatorId:current?.coordinatorId??id,players:current?[...current.players]:[id],epoch:current?.epoch??0,transports:new Map(),listeners:new Set(),closed:false,
    subscribe(fn){r.listeners.add(fn);return()=>r.listeners.delete(fn)},async connectMesh(ids){for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++)pair(ids[i],ids[j])},setRoster({epoch,players,coordinatorId}){r.epoch=epoch;r.players=[...players];r.coordinatorId=coordinatorId},disconnect(remote){disconnect(id,remote)},close(){if(r.closed)return;r.closed=true;for(const remote of [...r.transports.keys()])disconnect(id,remote)}};
   rooms.set(id,r);if(current)pair(id,current.coordinatorId===id?current.localPlayerId:current.coordinatorId);return r},disconnect,flush(){const list=packets.splice(0);for(const f of list)f()},get delivered(){return delivered}};
}
function recording(e){
 const timeline=[{kind:'load',bytes:e.run('bloomAdapter.save()').slice()}];e.c.qaRecord=(kind,value)=>timeline.push(kind==='load'?{kind,bytes:value.slice()}:{kind,value:structuredClone(value)});
 e.run(`(()=>{const step=bloomAdapter.step,member=bloomAdapter.applyMembership,load=bloomAdapter.load,prepared=bloomAdapter.loadPreparedSnapshot;
 bloomAdapter.step=context=>{qaRecord('step',context);return step(context)};
 bloomAdapter.applyMembership=change=>{qaRecord('membership',change);return member(change)};
 bloomAdapter.load=bytes=>{qaRecord('load',bytes);return load(bytes)};
 if(prepared)bloomAdapter.loadPreparedSnapshot=(token,context)=>{const result=prepared(token,context);qaRecord('load',bloomAdapter.save());return result};})()`);return timeline;
}
function campaign(source){const net=network(),engines=[],controls=new Map();let now=0;
 function live(){return engines.filter(e=>!e.run('bloomSession.closed'))}
 function add(id,{resumed=false,fixture=''}={}){const e=engine(source.file,source.html);e.id=id;e.c.room=net.add(id,resumed);e.c.clock=()=>now;e.run(`CONFIG.session.mode='online';BloomSimulation.initialize(12345);${fixture}`);e.timeline=recording(e);e.run(`BloomSimulation.createSession({room,players:room.players,ownerId:room.coordinatorId,localPlayerId:room.localPlayerId,clock,sessionConfig:{mode:'online',persistence:'none'}});playing=true;paused=false;modalKind='';`);engines.push(e);controls.set(e,{x:0,y:0,manual:true});return e}
 function failures(){return live().map(e=>({id:e.id,...e.json('({tick:bloomTick,sdk:bloomSession.tick,epoch:state.membershipEpoch,status:bloomSession.status,failure:bloomSession.failure||null})')}))}
 async function pulse({advance=true,allowFailure=false,ms=5,target=Infinity}={}){now+=ms;net.flush();for(const e of live()){e.run('bloomSession.poll()');if(advance&&!e.run('bloomSession.closed')&&e.run('bloomTick')<target){e.c.qaInput=controls.get(e);e.run('bloomSession.advance(bloomEncodeInput(qaInput))')}if(!allowFailure)assert(!e.run('bloomSession.failure'),JSON.stringify(failures()))}net.flush();await Promise.resolve()}
 async function until(fn,{limit=1000,...options}={}){for(let i=0;i<limit;i++){if(fn())return;await pulse(options)}throw Error('shared campaign deadline: '+JSON.stringify(failures()))}
 async function settle(){assert(live().every(e=>e.run('bloomSession.ready')),'settle requires committed membership');const target=Math.max(...live().map(e=>e.run('bloomTick')));await until(()=>live().every(e=>e.run('bloomTick')===target),{target});for(let i=0;i<3;i++)await pulse({advance:false});const hashes=live().map(e=>e.run('BloomOwnedSDK.hashBytes(bloomAdapter.save())'));assert(hashes.every(h=>h===hashes[0]),'canonical hashes at one boundary: '+JSON.stringify(hashes));for(const e of live())assert(e.run('bloomAdapter.validateSnapshot(bloomAdapter.save(),{tick:bloomTick,membershipEpoch:bloomSession.epoch})'),`valid snapshot for ${e.id}: `+JSON.stringify(e.json("({players:WorldPlayers.validate(state),rarity:rarityValidateState(state),resident:residentBossValidate(state,projectiles),actors:WorldPlayers.all().map(p=>({id:p.playerId,hp:p.leader.hp,maxHp:p.leader.maxHp,abilities:WorldPlayers.data(p).campaign.abilities,growth:WorldPlayers.data(p).campaign.growthCards,nav:p.navigation,auto:p.auto}))})")));return{tick:target,hash:hashes[0]}}
 async function ticks(n){const target=Math.max(...live().map(e=>e.run('bloomTick')))+n;await until(()=>live().every(e=>e.run('bloomTick')>=target));return settle()}
 async function fixture(code){await settle();for(const e of live()){e.run(`bloomInTick=true;bloomCurrentEffects=[];try{${code};rebuildGrid();spatialBoundary();bloomSnapshotStore.invalidate()}finally{bloomInTick=false}`);assert(e.run('bloomValidate(bloomCapture())'),'fixture must validate');e.timeline.push({kind:'load',bytes:e.run('bloomAdapter.save()').slice()})}return settle()}
 function command(e,type,args={}){e.c.qaCommand={version:1,type,...args};return e.run('bloomSession.queueCommand(BloomSimulation.encodeCommand(qaCommand))')}
 function replay(e){const copy=engine(source.file,source.html);copy.run("CONFIG.session.mode='online';BloomSimulation.initialize(12345);BloomSimulation.multiplayer=true;BloomSimulation.sessionConfig={mode:'online',persistence:'none'}");let frames=0,memberships=0,loads=0;for(const item of e.timeline){if(item.kind==='load'){copy.c.qaBytes=item.bytes;copy.run('bloomAdapter.load(qaBytes)');loads++}else if(item.kind==='membership'){copy.c.qaChange=item.value;copy.run('bloomAdapter.applyMembership(qaChange)');memberships++}else{copy.c.qaFrame=structuredClone(item.value);copy.run('bloomAdapter.step(qaFrame)');frames++}}assert.deepEqual(Buffer.from(copy.run('bloomAdapter.save()')),Buffer.from(e.run('bloomAdapter.save()')),'actual adapter replay matches canonical bytes');return{frames,memberships,loads}}
 return{net,engines,controls,add,live,pulse,until,settle,ticks,fixture,command,replay,failures,close(){for(const e of live())e.run('bloomSession.close()')}};
}
module.exports={candidate,network,campaign};
