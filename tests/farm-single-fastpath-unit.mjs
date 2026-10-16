import assert from 'node:assert/strict';

globalThis.BloomGamekitDeterministic = await import('../vendor/upstream/deterministic.js');
globalThis.BloomGamekitInterpolation = await import('../vendor/upstream/interpolation.js');
globalThis.BloomGamekitRollback = await import('../vendor/upstream/rollback.js');
globalThis.BloomGamekitSimloop = await import('../vendor/upstream/simloop.js');

const { Garden } = await import('../src/farm-model.js');
const { FarmSession } = await import('../src/farm-session.js');

const capture = FarmSession.prototype.capture;
let captureCalls = 0;
FarmSession.prototype.capture = function (...args) { captureCalls++; return capture.apply(this, args); };
const solo = new FarmSession(new Garden(8101));
try {
  assert.equal(solo.session.mode, 'local');
  assert.equal(solo.session.localFastPath, true, 'solo Farm opts into local lockstep fast path');
  assert.equal(captureCalls, 0, 'SDK startup does not invoke the Farm save adapter');
  assert.equal(solo.session.metrics.snapshotSaves, 0, 'SDK does not serialize a Farm snapshot at startup');
  assert.equal(solo.session.metrics.stateHashComputations, 0, 'solo Farm has no network state hash');
  assert.equal(solo.session.metrics.serializedSnapshotBytes, 0);
  assert.equal(solo.session.metrics.hashedStateBytes, 0);
  assert.equal(solo.session.metrics.retainedSnapshotBytes, 0, 'solo Farm retains no SDK snapshot history');

  const speed = BloomGamekitDeterministic.binaryCodec.encode({ type: 'speed', value: 4 });
  solo.session.queueCommand(speed);
  assert.equal(solo.session.advance(new Uint8Array(1)).status, 'advanced');
  assert.equal(solo.speed, 4, 'Farm command handler still applies the queued command');
  assert.equal(solo.tick, 1, 'the shared Farm simulation step advances one Garden tick');
  assert.equal(solo.session.localInputState.executedCommandSequence, 1);
  assert.equal(captureCalls, 0, 'normal solo ticks do not invoke the Farm save adapter');
  assert.equal(solo.session.metrics.snapshotSaves, 0, 'normal solo ticks still skip SDK snapshots');
  assert.equal(solo.session.metrics.stateHashComputations, 0);
  assert.equal(solo.session.metrics.serializedSnapshotBytes, 0);
  assert.equal(solo.session.metrics.retainedSnapshotBytes, 0);

  const saved = solo.capture();
  assert.equal(captureCalls, 1, 'explicit user save still calls Farm capture');
  assert.equal(saved.tick, 1, 'the game-owned manual save captures the completed boundary');
  assert.equal(solo.session.getStateHash(), undefined, 'no SDK hash is synthesized from the manual save');
  solo.load(saved);
  assert.deepEqual(solo.capture(), saved, 'Farm manual save/load remains canonical');
  assert.equal(captureCalls, 2, 'only explicit saves call Farm capture');

  const sameInput = new FarmSession(new Garden(8101));
  try {
    sameInput.session.queueCommand(speed);
    assert.equal(sameInput.session.advance(new Uint8Array(1)).status, 'advanced');
    assert.deepEqual(sameInput.capture(), saved, 'same seed and input produce the same Garden state');
  } finally { sameInput.dispose(); }
} finally { solo.dispose(); FarmSession.prototype.capture = capture; }

const room = { players: ['solo'], localPlayerId: 'solo', sessionId: 'farm-online-config', coordinatorId: 'solo', epoch: 0,
  transports: new Map(), subscribe() { return () => {}; }, connectMesh() {}, setRoster() {}, close() {} };
const online = new FarmSession(new Garden(8102), { room });
try {
  assert.equal(online.session.mode, 'online');
  assert.equal(online.session.localFastPath, false, 'online Farm retains the regular SDK path');
  assert.equal(online.session.metrics.snapshotSaves, 1, 'online startup retains its initial network snapshot');
} finally { online.dispose(); }

console.log('Farm local fast-path and explicit persistence unit checks passed');
