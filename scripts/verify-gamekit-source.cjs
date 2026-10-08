'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {verify,DIST_ASSETS}=require('./gamekit-provenance.cjs');
const lock=verify(),html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
assert(!/<script[^>]+src=/i.test(html),'Offline HTML cannot depend on external scripts');
const start=html.indexOf('const {WebGLDevice,VectorRenderer,GlyphAtlas,FontAssetLoader}=global.BloomGamekitRendering;'),end=html.indexOf('global.BloomWebGL=');
assert(start>=0&&end>start,'game renderer adapter markers');
const frontend=html.slice(start,end);
assert(frontend.includes('new WebGLDevice(')&&frontend.includes('new VectorRenderer(')&&frontend.includes('FontAssetLoader')&&frontend.includes('GlyphAtlas')&&!frontend.includes('new GlyphAtlas(')&&!frontend.includes('gl.drawArrays(')&&!frontend.includes('gl.texImage2D('),'game frontend uses pinned common rendering APIs and delegates font asset ownership to the common loader');
assert(!frontend.includes('decodeMask(')&&!html.includes('bloom-world-glyph-atlas'),'game does not embed a private font asset or decoder');
assert(html.includes('new globalThis.BloomGamekitRendering.FontAssetLoader(')&&html.includes('BLOOM_FONT_ASSET_SOURCE'),'game loads a pinned common font asset before mount');
assert(!frontend.includes('getContext(\'2d\')')&&!frontend.includes('drawImage('),'world renderer has no Canvas2D or raster-image fallback');
const sourceMatch=html.match(/const BLOOM_FONT_ASSET_SOURCE=Object\.freeze\(\{url:("(?:[^"\\]|\\.)*"),version:("(?:[^"\\]|\\.)*"),sha256:("(?:[^"\\]|\\.)*"),bytes:(\d+)\}\);/);
assert(sourceMatch,'Pinned font source is generated into the standalone HTML');
const source={url:JSON.parse(sourceMatch[1]),version:JSON.parse(sourceMatch[2]),sha256:JSON.parse(sourceMatch[3]),bytes:Number(sourceMatch[4])};
assert.equal(lock.assets.length,DIST_ASSETS.length);
for(const asset of lock.assets){
 const spec=DIST_ASSETS.find(candidate=>candidate.file===asset.file&&candidate.version===asset.version);
 assert(spec,'Only the fixed shared font asset path is supported');
 assert.equal(source.url,`https://cdn.jsdelivr.net/gh/byh-playground/bloom-gamekit@${lock.distCommit}/${asset.file}`,'font URL is pinned to immutable dist commit');
 assert.equal(source.version,lock.distCommit);assert.equal(source.sha256,asset.sha256);assert.equal(source.bytes,asset.bytes);
 assert.equal(fs.statSync(path.join(__dirname,'../vendor/upstream',asset.file)).size,asset.bytes);
}
assert(!fs.existsSync(path.join(__dirname,'assets/world-glyph-atlas.json'))&&!fs.existsSync(path.join(__dirname,'generate-glyph-atlas.mjs')),'Budmori project-specific glyph data/generator removed');
console.log('PASS pinned GameKit source/dist bundles, canonical manifest, immutable font asset URL/hash/size, no game-local font payload');
