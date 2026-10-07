import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import native from './native-engine.cjs';
const game=native.engine(fileURLToPath(new URL('../index.html',import.meta.url)));
const budget=game.run('CONFIG.session.transitionTimeoutMs'),grace=game.run('CONFIG.session.reconnectGraceMs'),peerBudget=game.run('PublicSession.config.peerTimeoutMs');
assert.equal(budget,30000);assert(budget>=peerBudget+10000);assert.equal(grace,30000);
// Pass an immutable vendor ESM bundle; this is a simulated capability/clock test.
const { createRoomSession, profiles } = await import(pathToFileURL(resolve(process.argv[2] || fileURLToPath(new URL('../vendor/upstream/rollback-netcode.js',import.meta.url)))).href);
const encoder = new TextEncoder(), decoder = new TextDecoder();
function actor(prepared = false) {
  let state = { tick: 0, epoch: -1, players: [], value: 0, commands: [], membership: [] };
  const actor = { state: () => state, adapter: {
    save: () => encoder.encode(JSON.stringify(state)), load: b => { state = JSON.parse(decoder.decode(b)); },
    validateSnapshot: (b, { tick }) => { try { return JSON.parse(decoder.decode(b)).tick === tick; } catch { return false; } },
    applyMembership({ epoch, tick, players, joined, left }) {
      assert.equal(state.tick, tick); assert.equal(state.epoch + 1, epoch);
      state.epoch = epoch; state.players = [...players]; state.membership.push({ epoch, tick, joined, left });
    },
    step({ tick, inputs, membershipEpoch }) {
      assert.equal(state.tick, tick); assert.equal(state.epoch, membershipEpoch); assert.deepEqual(inputs.map(i => i.playerId), state.players);
      for (const frame of inputs) { state.value += frame.input[0]; for (const c of frame.commands) state.commands.push(`${frame.playerId}:${c.sequence}:${c.payload[0]}`); }
      state.tick++;
    }
  } };
  if (prepared) {
    const tokens = new WeakMap();
    const key = context => JSON.stringify(context);
    const prepare = (value, context) => {
      assert.equal(value.tick, context.tick); assert.equal(value.epoch, context.membershipEpoch);
      assert.deepEqual(value.players, context.players);
      const token = {}; tokens.set(token, { value, context: key(context) }); return token;
    };
    actor.adapter.prepareSnapshot = (data, context) => {
      const value = JSON.parse(decoder.decode(data));
      assert.deepEqual(encoder.encode(JSON.stringify(value)), data);
      return prepare(value, context);
    };
    actor.adapter.loadPreparedSnapshot = (token, context) => {
      const owned = tokens.get(token); assert(owned, 'unconsumed owned token');
      assert.equal(owned.context, key(context)); tokens.delete(token); state = owned.value;
    };
    actor.adapter.prepareMembership = (change, context) => {
      assert.equal(state.tick, change.tick); assert.equal(state.epoch + 1, change.epoch);
      const value = structuredClone(state);
      value.epoch = change.epoch; value.players = [...change.players];
      value.membership.push({ epoch: change.epoch, tick: change.tick, joined: change.joined, left: change.left });
      return { bytes: encoder.encode(JSON.stringify(value)), prepared: prepare(value, context) };
    };
  }
  if (prepared === 'jobs') {
    const deferred = work => { let n = 0, result, done = false; return {
      get done() { return done; }, get result() { return result; },
      pulse({ budgetMs }) { assert(budgetMs > 0); if (!done && ++n === 3) { result = work(); done = true; } },
      cancel() { done = true; },
    }; };
    actor.adapter.saveJob = () => deferred(() => actor.adapter.save());
    actor.adapter.prepareSnapshotJob = (data, context) => deferred(() => actor.adapter.prepareSnapshot(data, context));
    actor.adapter.prepareMembershipJob = (change, context) => {
      const before = actor.adapter.save();
      return deferred(() => { assert.deepEqual(actor.adapter.save(), before, 'world frozen through job'); return actor.adapter.prepareMembership(change, context); });
    };
  }
  return actor;
}
function network() {
  const rooms = new Map(), packets = []; let initialId;
  function pair(a, b) {
    if (rooms.get(a).transports.has(b)) return;
    const sides = new Map();
    for (const [self, remote] of [[a,b],[b,a]]) {
      const listeners = new Set(), status = new Set();
      const t = { state: 'open', send(data) { if (t.state !== 'open') return false; packets.push(() => { const other = sides.get(remote); if (other.state === 'open') for (const fn of other.listeners) fn(data.slice()); }); return true; },
        subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }, subscribeStatus(fn) { status.add(fn); return () => status.delete(fn); },
        listeners, close() { t.state = 'closed'; for (const fn of status) fn('closed'); } };
      sides.set(self, t); rooms.get(self).transports.set(remote, t);
    }
    for (const [self, remote] of [[a,b],[b,a]]) for (const fn of rooms.get(self).listeners) fn({ type: 'peer-connected', peerId: remote, transport: sides.get(self) });
  }
  function add(id, resumed = false) {
    const current = initialId && [...rooms.values()].find(r => !r.closed && r.players.includes(r.localPlayerId));
    if (!initialId) initialId = id;
    const room = { resumed, localPlayerId: id, sessionId: 'room', coordinatorId: current?.coordinatorId ?? id, players: current ? [...current.players] : [id], epoch: current?.epoch ?? 0,
      transports: new Map(), listeners: new Set(), subscribe(fn) { room.listeners.add(fn); return () => room.listeners.delete(fn); },
      async connectMesh(ids) { for (let i=0;i<ids.length;i++) for(let j=i+1;j<ids.length;j++) pair(ids[i],ids[j]); },
      setRoster({epoch,players,coordinatorId}) { room.epoch=epoch;room.players=[...players];room.coordinatorId=coordinatorId; },
      close() { room.closed=true; for(const t of room.transports.values())t.close(); } };
    rooms.set(id, room); if (current) pair(id, current.coordinatorId === id ? current.localPlayerId : current.coordinatorId); return room;
  }
  return { add, flush() { const batch=packets.splice(0); for(const fn of batch)fn(); }, reconnect(a,b) {
    for(const [self,remote] of [[a,b],[b,a]]) { rooms.get(self).transports.get(remote)?.close();rooms.get(self).transports.delete(remote); } pair(a,b);
  } };
}
const profile = { ...profiles.lockstep, baseInputDelayTicks: 2, checksumInterval: 8, stateHistorySize: 64, pacingPolicy: 'none', heartbeatMs: 10 };
async function harness(prepared = false) {
  const net=network(), sessions=[], actors=[];let now=0;
  const add=(id,resumed=false)=>{const a=actor(prepared),s=createRoomSession({ mode:'online',room:net.add(id,resumed),simulationVersion:'test',inputSize:1,adapter:a.adapter,profile,clock:()=>now,
    membership:{maxCatchupSteps:2,transitionTimeoutMs:20000,reconnectGraceMs:500}});actors.push(a);sessions.push(s);return s;};
  async function pulse(advance=true) { now+=5;net.flush(); for(const s of sessions)if(!s.closed){s.poll(now);if(advance&&!s.closed)s.advance(new Uint8Array([1]));}net.flush();await Promise.resolve(); }
  async function until(fn,limit=3000) {for(let n=0;n<limit;n++){if(fn())return;await pulse();const failed=sessions.filter(s=>s.failure);assert.deepEqual(failed.map(s=>({id:s.localPlayerId,failure:s.failure})),[]);}assert.fail('condition timeout '+JSON.stringify(sessions.map(s=>({id:s.localPlayerId,tick:s.tick,epoch:s.epoch,status:s.status,tr:s._transition&&{target:s._transition.target,prepared:[...s._transition.prepared],reached:[...s._transition.reached],installed:[...s._transition.installed],committed:[...s._transition.committed]}}))));}
  return{net,sessions,actors,add,pulse,until,advanceClock:ms=>{now+=ms;}};
}

for (const timeout of [15000, budget]) test(`bounded total transition budget ${timeout} includes held mesh`, async()=>{
 const net=network(),sessions=[];let now=0,release;
 const make=(id)=>{const a=actor('jobs'),room=net.add(id); const session=createRoomSession({mode:'online',room,simulationVersion:'test',inputSize:1,adapter:a.adapter,profile,clock:()=>now,membership:{transitionTimeoutMs:timeout,reconnectGraceMs:30000,maxCatchupSteps:2}});sessions.push(session);return session;};
 const a=make('a'); for(let i=0;i<10;i++){now+=5;a.poll();a.advance(new Uint8Array([1]));}
 const b=make('b'),connect=a.room.connectMesh;const pending=new Promise(r=>release=r);a.room.connectMesh=async ids=>{await pending;await connect(ids)};
 async function pulse(){now+=5;net.flush();for(const s of sessions){s.poll();if(!s.failure)s.advance(new Uint8Array([1]));}net.flush();await Promise.resolve();}
 for(let i=0;i<10;i++)await pulse();assert(a._transition);assert.equal(a._transition.target,null);
 now+=16000;await pulse();
 if(timeout===15000){assert.equal(a.failure?.reason,'membership deadline exceeded');assert.equal(a._transition.target,null);release();}
 else{assert.equal(a.failure,null);release();for(let i=0;i<1000&&!b.ready;i++)await pulse();assert.equal(a.failure,null);assert.equal(b.failure,null);assert(a.ready&&b.ready);assert.equal(a.players.length,2);}
 sessions.forEach(s=>s.close());
});

test('stalled mesh fails at the configured 30s total bound and late completion cannot revive it', async()=>{
 const net=network(),sessions=[];let now=0,release;
 const make=id=>{const a=actor('jobs'),room=net.add(id),session=createRoomSession({mode:'online',room,simulationVersion:'test',inputSize:1,adapter:a.adapter,profile,clock:()=>now,membership:{transitionTimeoutMs:budget,reconnectGraceMs:grace}});sessions.push(session);return session;};
 const a=make('a');for(let i=0;i<10;i++){now+=5;a.poll();a.advance(new Uint8Array([1]));}const b=make('b');
 a.room.connectMesh=()=>new Promise(r=>{release=r});
 async function pulse(){net.flush();for(const s of sessions)s.poll();net.flush();await Promise.resolve();}
 for(let i=0;i<8;i++)await pulse();assert(a._transition);const start=a._transition.startedAt;
 now=start+budget-1;await pulse();assert.equal(a.failure,null);
 now=start+budget;await pulse();assert.equal(a.failure?.reason,'membership deadline exceeded');assert.equal(a.room.closed,true);const failed=a.failure;
 release();for(let i=0;i<8;i++)await pulse();assert.equal(a.failure,failed);assert.equal(a.ready,false);sessions.forEach(s=>s.close());
});
