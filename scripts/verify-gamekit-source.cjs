'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {verify,DIST_ASSETS}=require('./gamekit-provenance.cjs');
const root=path.resolve(__dirname,'..'),lock=verify();
const game=fs.readFileSync(path.join(root,'src/game.js'),'utf8');
assert(!game.includes('bloom-world-glyph-atlas'),'game cannot embed a private font payload');
const match=game.match(/const BLOOM_FONT_ASSET_SOURCE=Object\.freeze\(\{url:("(?:[^"\\]|\\.)*"),version:("(?:[^"\\]|\\.)*"),sha256:("(?:[^"\\]|\\.)*"),bytes:(\d+)\}\);/);
assert(match,'immutable font source declaration');
const source={url:JSON.parse(match[1]),version:JSON.parse(match[2]),sha256:JSON.parse(match[3]),bytes:Number(match[4])};
assert.equal(lock.assets.length,DIST_ASSETS.length);
for(const asset of lock.assets){
  assert(DIST_ASSETS.some(a=>a.file===asset.file&&a.version===asset.version),'supported font asset');
  assert.equal(source.url,`https://cdn.jsdelivr.net/gh/byh-playground/bloom-gamekit@${lock.distCommit}/${asset.file}`);
  assert.equal(source.version,lock.distCommit);assert.equal(source.sha256,asset.sha256);assert.equal(source.bytes,asset.bytes);
}
console.log('PASS pinned Git provenance, real ESM references, game source integrity and common font asset');
