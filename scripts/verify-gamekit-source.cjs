'use strict';

const { verify: VERIFY } = require('./gamekit-provenance.cjs');
const LOCK = VERIFY();
console.log('PASS pinned Git provenance, immutable ESM references and runtime asset integrity', LOCK.distCommit);
