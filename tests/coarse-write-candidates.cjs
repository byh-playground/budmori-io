'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {candidate}=require('./coarse-live-candidate.cjs'),{batchedGridCandidate}=require('./batched-grid-candidate.cjs');
const source=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),dir=path.join(__dirname,'collision-artifacts');fs.mkdirSync(dir,{recursive:true});
const candidates={'coarse-128.html':candidate(source,{mode:'coarse',cell:128,exact:false,instrument:false}),'batched-grid-32.html':batchedGridCandidate(source,32)},manifest={baselineSHA256:crypto.createHash('sha256').update(source).digest('hex'),candidates:{}};
for(const [name,html]of Object.entries(candidates)){fs.writeFileSync(path.join(dir,name),html);manifest.candidates[name]={sha256:crypto.createHash('sha256').update(html).digest('hex'),bytes:Buffer.byteLength(html)}}
fs.writeFileSync(path.join(dir,'candidate-manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify(manifest));
