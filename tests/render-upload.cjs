'use strict';
// Production renderer upload policy with an SDK API recorder, not a GPU benchmark.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const script=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('global.BloomWebGL='));
const realm=vm.createContext({});vm.runInContext(script,realm);
const calls=[],device={createTexture(source){calls.push(['create',source]);return{}},updateTexture(...args){calls.push(['update',...args])},deleteTexture(texture){calls.push(['delete',texture])}};
const renderer=Object.create(realm.BloomWebGL.Renderer.prototype);renderer.device=device;
const source={width:516,height:666},record={source,page:null,texture:null,version:-1,used:0};
renderer._upload(record);assert.deepEqual(calls.map(c=>c[0]),['create']);assert.equal(calls[0][1],source);
renderer._upload(record);assert.equal(calls.length,1,'unchanged tile is not reuploaded');
record.version=-1;renderer._upload(record);assert.equal(calls[1][0],'update','explicit invalidation remains supported');
source.width=512;renderer._upload(record);assert.deepEqual(calls.slice(-2).map(c=>c[0]),['delete','create'],'resized assets are recreated once');
calls.length=0;const atlas={width:1024,height:1024},page={version:1,tileSize:64,columns:16,used:2};
const dynamic={source:atlas,page,texture:null,version:-1,used:0};renderer._upload(dynamic);
assert.deepEqual(calls.map(c=>c[0]),['create','update']);assert.equal(calls[0][1].data,null);
assert.deepEqual({...calls[1][3]},{x:0,y:0,width:128,height:64},'atlas initialization still uploads its used region only');
page.version++;page.used++;renderer._upload(dynamic);assert.deepEqual({...calls.at(-1)[3]},{x:128,y:0,width:64,height:64});
console.log('PASS WebGL asset upload lifecycle; invalidation/resize and sparse atlas updates remain correct');
