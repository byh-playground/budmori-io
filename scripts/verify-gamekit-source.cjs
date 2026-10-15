'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {verify,DIST_ASSETS}=require('./gamekit-provenance.cjs');
const root=path.resolve(__dirname,'..'),lock=verify();
console.log('PASS pinned Git provenance, immutable ESM references and runtime asset integrity',lock.distCommit);
