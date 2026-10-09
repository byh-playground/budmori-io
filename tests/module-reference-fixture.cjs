'use strict';
// Only the immutable SDK URLs declared by the production runtime are served.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {manifest,hash}=require('./runtime-source.cjs');
const root=path.resolve(__dirname,'..');
async function install(context,html=fs.readFileSync(path.join(root,'index.html'),'utf8')){
  const config=manifest(html),seen=[];if(!config)return{requests:seen};
  for(const entry of config.modules){
    const bytes=fs.readFileSync(path.join(root,'vendor/upstream',entry.name+'.js'));
    assert.equal(bytes.length,entry.bytes);assert.equal(hash(bytes),entry.sha256);
    await context.route(entry.url,route=>{seen.push(entry.name);return route.fulfill({status:200,contentType:'text/javascript;charset=utf-8',headers:{'Access-Control-Allow-Origin':'*','Cache-Control':'public,max-age=31536000,immutable'},body:bytes})});
  }
  return{requests:seen};
}
module.exports={install};
