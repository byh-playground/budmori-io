const assert=require('node:assert/strict'),{engine}=require('./native-engine.cjs');
const a=engine(require('node:path').resolve(process.argv[2])),b=engine(require('node:path').resolve(process.argv[3]||require('node:path').join(__dirname,'../index.html')));
let checks=0;function same(label){assert.deepEqual(Buffer.from(b.run('BloomLiveCodec.encode(bloomCapture())')),Buffer.from(a.run('BloomLiveCodec.encode(bloomCapture())')),label);checks++}
function both(s){for(const e of [a,b])e.run(s)}
both("CONFIG.session.mode='online';BloomSimulation.initialize(12345);WorldMembership.apply({epoch:0,tick:0,players:['a','b']});BloomSimulation.createSession({players:['a','b'],localPlayerId:'a',ownerId:'a'});playing=true;paused=false;modalKind=''");same('init/admission');
both("rarityAcquire(-1,'swordsman',0,8);rarityAcquire(WorldPlayers.get('b').accountOwner,'shellbug',2,2);rebuildGrid();spatialBoundary();globalThis.rec=state.rarityAccounts['-1'].active[0];rarityLock(rec.uid,true)");same('acquire/lock');
both('rarityKillOwned(rarityBody(rec),null);rebuildGrid();spatialBoundary()');same('death');
both('globalThis.saved=bloomAdapter.save();bloomAdapter.load(saved)');same('restore');
for(let i=0;i<180;i++){for(const e of [a,b]){e.c.tickId=i;e.run("bloomAdapter.step({tick:tickId,tickRate:CONFIG.sim.tickRate,inputs:[{playerId:'a',input:bloomEncodeInput({x:1,y:0,manual:true}),commands:[]},{playerId:'b',input:bloomEncodeInput({x:0,y:1,manual:true}),commands:[]}]})")}same('tick '+i)}
both("WorldMembership.apply({epoch:1,tick:bloomTick,players:['a','b','c']})");same('late admission');
both("WorldMembership.apply({epoch:2,tick:bloomTick,players:['b','c']});WorldMembership.apply({epoch:3,tick:bloomTick,players:['a','b','c']})");same('leave/rejoin');
console.log('PASS exact before/after authority bytes at '+checks+' boundaries');
