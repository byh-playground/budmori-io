import assert from 'node:assert/strict';

globalThis.BloomGamekitDeterministic = await import('../vendor/upstream/deterministic.js');
globalThis.BloomGamekitInterpolation = await import('../vendor/upstream/interpolation.js');
globalThis.BloomGamekitRollback = await import('../vendor/upstream/rollback.js');
globalThis.BloomGamekitSimloop = await import('../vendor/upstream/simloop.js');

const {FarmAutosave,FARM_AUTOSAVE_DEBOUNCE_MS,FARM_AUTOSAVE_MAX_WAIT_MS} = await import('../src/farm-autosave.js');
const {Garden} = await import('../src/farm-model.js');
const {FarmSession} = await import('../src/farm-session.js');
const {awardBossKillXp} = await import('../src/player-progression.js');
const {snapshot,restore,normalizeSnapshot,validateSnapshot} = await import('../src/farm-state.js');
const {FarmStorage,validateSave} = await import('../src/farm-storage.js');

class FakeClock {
  now = 0;
  nextId = 0;
  jobs = new Map();
  setTimer = (fn, delay) => {
    const id = ++this.nextId;
    this.jobs.set(id, {at: this.now + delay, fn});
    return id;
  };
  clearTimer = id => this.jobs.delete(id);
  advance(ms) {
    const end = this.now + ms;
    while (true) {
      const next = [...this.jobs].sort((a, b) => a[1].at - b[1].at)[0];
      if (!next || next[1].at > end) break;
      this.now = next[1].at;
      this.jobs.delete(next[0]);
      next[1].fn();
    }
    this.now = end;
  }
}

const clock = new FakeClock();
const writes = [];
const autosave = new FarmAutosave(() => { writes.push(clock.now); return true; }, {
  now: () => clock.now,
  setTimer: clock.setTimer,
  clearTimer: clock.clearTimer
});
assert.equal(FARM_AUTOSAVE_DEBOUNCE_MS, 1000);
assert.equal(FARM_AUTOSAVE_MAX_WAIT_MS, 10000);
assert.equal(autosave.flush(), true);
clock.advance(30000);
assert.deepEqual(writes, [], 'a clean paused/home world never writes');
autosave.markDirty();
clock.advance(400);
autosave.markDirty();
clock.advance(999);
assert.deepEqual(writes, [], 'the debounce coalesces adjacent changes');
clock.advance(1);
assert.deepEqual(writes, [31400], 'one checkpoint follows the final change after the debounce');
autosave.markDirty();
for (let elapsed = 0; elapsed < FARM_AUTOSAVE_MAX_WAIT_MS; elapsed += 500) {
  clock.advance(500);
  autosave.markDirty();
}
assert.deepEqual(writes, [31400, 41400], 'continuous changes cannot starve the max-wait checkpoint');
clock.advance(FARM_AUTOSAVE_DEBOUNCE_MS);
assert.deepEqual(writes, [31400, 41400, 42400], 'a later quiet interval gets one trailing checkpoint');

// A failed checkpoint stays dirty and can be retried by a later change or explicit flush.
let attempts = 0;
const retryClock = new FakeClock();
const retry = new FarmAutosave(() => ++attempts > 1, {
  now: () => retryClock.now,
  setTimer: retryClock.setTimer,
  clearTimer: retryClock.clearTimer
});
retry.markDirty();
retryClock.advance(FARM_AUTOSAVE_DEBOUNCE_MS);
assert.equal(attempts, 1);
assert.equal(retry.dirty, true);
assert.equal(retry.flush(), true);
assert.equal(attempts, 2);
assert.equal(retry.dirty, false);

// The browser timer globals are receiver-sensitive; defaults must call them via globalThis.
const originalSetTimeout = globalThis.setTimeout;
const originalClearTimeout = globalThis.clearTimeout;
const timerReceivers = [];
let browserTimerId = 0;
globalThis.setTimeout = function (fn, delay) {
  assert.equal(this, globalThis, 'default setTimeout preserves its browser-global receiver');
  timerReceivers.push(['set', delay]);
  return ++browserTimerId;
};
globalThis.clearTimeout = function (id) {
  assert.equal(this, globalThis, 'default clearTimeout preserves its browser-global receiver');
  timerReceivers.push(['clear', id]);
};
try {
  const browserTimers = new FarmAutosave(() => true, {now: () => 0});
  browserTimers.markDirty();
  assert.equal(browserTimers.flush(), true);
  assert.deepEqual(timerReceivers, [['set', FARM_AUTOSAVE_DEBOUNCE_MS], ['clear', browserTimerId]]);
} finally {
  globalThis.setTimeout = originalSetTimeout;
  globalThis.clearTimeout = originalClearTimeout;
}

// Changes made by commands while paused still mark authoritative Farm state dirty.
const commandChanges = [];
const session = new FarmSession(new Garden(9201), {onWorldStep: world => commandChanges.push(world)});
try {
  session.paused = true;
  const mode = globalThis.BloomGamekitDeterministic.binaryCodec.encode({type: 'mode', value: 'merge'});
  session.step({tick: 0, inputs: [{playerId: 'solo', commands: [{payload: mode}]}]});
  assert.equal(session.world.mode, 'merge');
  assert.deepEqual(commandChanges, [session.world], 'a paused command marks its mutation');

  const feed = globalThis.BloomGamekitDeterministic.binaryCodec.encode({type: 'feed'});
  session.step({tick: 1, inputs: [{playerId: 'solo', commands: [{payload: feed}]}]});
  assert.equal(session.world.foodTaps.remainder, 1, 'a paused manual feed still applies');
  assert.equal(commandChanges.length, 2, 'a paused feed mutation marks the save dirty');
  session.world.playerProgression = awardBossKillXp(session.world.playerProgression, 'autosave:farm-upgrade').state;
  session.world.playerProgression = awardBossKillXp(session.world.playerProgression, 'autosave:ability-upgrade').state;
  session.world.playerProgression = awardBossKillXp(session.world.playerProgression, 'autosave:ability-upgrade-extra').state;
  const investFarm = globalThis.BloomGamekitDeterministic.binaryCodec.encode({type: 'progression-invest', scope: 'farm', nodeId: 'food'});
  session.step({tick: 2, inputs: [{playerId: 'solo', commands: [{payload: investFarm}]}]});
  assert.equal(session.world.playerProgression.farmUpgrades.food, 1, 'a paused shared-wallet farm investment still applies');
  assert.equal(commandChanges.length, 3, 'a successful paused investment marks the save dirty');
  session.world.spawn(0, 3, 0, 0); // The pea ability root requires an available T3 species.
  const investAbility = globalThis.BloomGamekitDeterministic.binaryCodec.encode({type: 'progression-invest', scope: 'ability', abilityId: 'pea-death-split', nodeId: 'root'});
  session.step({tick: 3, inputs: [{playerId: 'solo', commands: [{payload: investAbility}]}]});
  assert.equal(session.world.playerProgression.abilities['pea-death-split'].rootUnlocked, true, 'a paused ability purchase uses the same XP wallet');
  assert.equal(commandChanges.length, 4, 'a successful paused ability purchase marks the save dirty');
  const failedInvest = globalThis.BloomGamekitDeterministic.binaryCodec.encode({type: 'progression-invest', scope: 'farm', nodeId: 'growth'});
  session.step({tick: 4, inputs: [{playerId: 'solo', commands: [{payload: failedInvest}]}]});
  assert.equal(session.world.playerProgression.farmUpgrades.growth, 0, 'an unaffordable paused investment is rejected');
  assert.equal(commandChanges.length, 4, 'a failed purchase does not mark the save dirty');

  session.queue('mode', {value: 'breed'});
  assert.equal(session.flushQueuedCommands(), true, 'lifecycle flush applies a queued command before persisting');
  assert.equal(session.world.mode, 'breed');
  assert.equal(commandChanges.length, 5);
} finally {
  session.dispose();
}
const fastChanges = [];
const fourX = new FarmSession(new Garden(9206), {onWorldStep: world => fastChanges.push(world.time)});
try {
  fourX.speed = 4;
  fourX.step({tick: 0, inputs: []});
  assert.equal(fourX.tick, 1, '4× speed still advances one lockstep tick per step call');
  assert.equal(fastChanges.length, 1, '4× speed marks one completed step dirty, not one callback per substep');
  assert.ok(Math.abs(fourX.world.time - 0.2) < 1e-12, 'autosave notification does not alter the existing 4× simulation-time policy');
} finally {
  fourX.dispose();
}

// Saved bytes remain isolated from future live-world changes; hydrate only at read/load.
class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}
globalThis.localStorage = new MemoryStorage();
const storage = new FarmStorage();
const liveWorld = new Garden(9202);
assert.equal(typeof storage.encode(new Garden(9208)), 'string', 'the existing encode(world) JSON-string API remains compatible');
assert.equal(storage.replace(liveWorld), true);
const savedText = storage.raw;
const savedStarter = storage.savedSnapshot.starter;
assert.equal(storage._world, null, 'writing a checkpoint does not hydrate a Garden just to verify it');
assert.equal(storage.hasWorld, true);
assert.equal(storage.hasReservedRaid, false);
assert.equal(storage._world, null, 'start-screen metadata reads do not hydrate the saved Garden');
liveWorld.starter++;
assert.equal(storage.raw, savedText, 'post-save live changes cannot leak into persisted bytes');
assert.equal(storage.savedSnapshot.starter, savedStarter, 'the in-memory saved snapshot is detached from the live Garden');
const normalizableWorld = new Garden(9210);
normalizableWorld.units[0].cooldown = 999;
const normalizableCheckpoint = storage.serializeCheckpoint(normalizableWorld);
assert.equal(normalizableCheckpoint.data.units[0].cooldownDuration, 999,
  'checkpoint normalization preserves the prior save contract without hydrating a Garden');
assert.equal(normalizableWorld.units[0].cooldownDuration, 0,
  'normalizing a detached checkpoint never changes the live Garden');
assert.equal(validateSave(savedText), true, 'the save validator can validate without returning a hydrated Garden');
const tooLarge = new Garden(9209);
tooLarge.notices = Array.from({length:1024}, () => Array(10).fill('x'.repeat(255)));
assert.throws(() => storage.serializeCheckpoint(tooLarge), /저장 파일이 너무 큽니다/,
  'a checkpoint cannot write data that the existing read-size limit rejects');
const rawBeforeFailure = storage.raw;
assert.equal(storage.save(tooLarge), false, 'an oversized checkpoint fails closed');
assert.equal(storage.raw, rawBeforeFailure);
assert.equal(localStorage.getItem('bloom-weapon-cards-v4'), rawBeforeFailure, 'failed save leaves original bytes untouched');
assert.throws(() => storage.import('x'.repeat(2 * 1024 * 1024 + 1)), /저장 파일이 너무 큽니다/);
assert.equal(storage.raw, rawBeforeFailure);
assert.equal(localStorage.getItem('bloom-weapon-cards-v4'), rawBeforeFailure, 'failed import leaves original bytes untouched');
assert.throws(() => validateSnapshot({...snapshot(new Garden(9203)), unknownField: true}), /올바른 농장 저장 데이터/,
  'strict validation continues to reject unknown root keys');
const badNumber = snapshot(new Garden(9204));
badNumber.boss.hp = Infinity;
assert.throws(() => validateSnapshot(badNumber), /올바른 농장 저장 데이터/,
  'strict validation continues to reject non-finite values');
const loadedWorld = storage.world;
assert.equal(loadedWorld.starter, savedStarter, 'lazy load returns the exact saved checkpoint');
loadedWorld.starter++;
assert.equal(storage.savedSnapshot.starter, savedStarter, 'hydrated Garden changes also cannot mutate the saved checkpoint');

const legacyWorld = snapshot(new Garden(9205));
for (const key of ['farmBossEvent', 'nextBossEncounterId', 'bossRewardReceipts', 'bossRewardWatermarks']) delete legacyWorld[key];
const legacyText = JSON.stringify({schema:'budmori-farm', productVersion:'0.4.7', world:legacyWorld});
assert.equal(validateSave(legacyText), true, 'legacy migration and validation remain available before explicit import');
const legacyRaidWorld = snapshot(new Garden(9211));
legacyRaidWorld.scene = 'raid';
legacyRaidWorld.running = true;
const migratedLegacyRaid = normalizeSnapshot(legacyRaidWorld, {migrateLegacyRaid:true});
assert.equal(legacyRaidWorld.scene, 'raid', 'default normalization still preserves its caller input');
migratedLegacyRaid.boss.hp = 1;
const secondLegacyRaid = normalizeSnapshot(legacyRaidWorld, {migrateLegacyRaid:true});
assert.equal(secondLegacyRaid.boss.hp, 2400, 'legacy migration clones the cached boss template instead of exposing it');

const cycleRoundTrip = restore(snapshot(new Garden(9207)));
assert.equal(cycleRoundTrip.boss.hit instanceof Set, true, 'saved Set state is restored as a Set');
assert.equal(cycleRoundTrip.units[0].ability.owner, cycleRoundTrip.units[0], 'AttackCycle owner cycles are rehydrated against the live Unit');

console.log('Farm autosave, command dirtiness, and detached checkpoint checks passed');
