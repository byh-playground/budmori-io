'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {verify}=require('../scripts/gamekit-provenance.cjs');
const lock=verify(),html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
assert(!/<script[^>]+src=/i.test(html),'Offline HTML cannot depend on external scripts');
const frontend=html.slice(html.indexOf('* BLOOM mandatory world renderer'),html.indexOf('global.BloomWebGL='));
assert(frontend.includes('this.device.draw(')&&!frontend.includes('gl.drawArrays(')&&!frontend.includes('gl.texImage2D('),'game frontend delegates GPU ownership');
console.log('PASS 13 pinned upstream Git blobs + immutable manifest;',lock.modules.length,'reproducible inline transforms; offline cache consistency, not independent source-build attestation');
