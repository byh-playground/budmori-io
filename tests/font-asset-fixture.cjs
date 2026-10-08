'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),lock=JSON.parse(fs.readFileSync(path.join(root,'gamekit-lock.json'),'utf8'));
assert.equal(lock.assets.length,1,'fixed shared font asset is pinned');
const asset=lock.assets[0],url=`https://cdn.jsdelivr.net/gh/byh-playground/bloom-gamekit@${lock.distCommit}/${asset.file}`;
const bytes=fs.readFileSync(path.join(root,'vendor/upstream',asset.file));
assert.equal(bytes.length,asset.bytes,'fixture bytes match pinned asset length');
async function install(context,{failFirst=false}={}){
 let requests=0;
 await context.route(url,route=>{
  requests++;
  if(failFirst&&requests===1)return route.fulfill({status:503,headers:{'Access-Control-Allow-Origin':'*','Cache-Control':'no-store'},body:'font fixture temporary failure'});
  return route.fulfill({status:200,contentType:'application/json; charset=utf-8',headers:{'Access-Control-Allow-Origin':'*','Access-Control-Expose-Headers':'*','Cache-Control':'public, max-age=31536000, immutable'},body:bytes});
 });
 return {get requests(){return requests},url,bytes:bytes.length};
}
module.exports={install,url,bytes:bytes.length};
