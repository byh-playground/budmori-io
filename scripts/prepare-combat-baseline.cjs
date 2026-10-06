'use strict';
// Pinned runtime history is the executable baseline, not a copied reimplementation.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),pin=require('../combat-baseline.json');
const destination=process.env.BLOOM_COMBAT_BASELINE?path.resolve(process.env.BLOOM_COMBAT_BASELINE):path.join(root,'tests/fixtures/runtime-combat-baseline.html');
if(!fs.existsSync(destination)){
 if(process.env.BLOOM_COMBAT_BASELINE)throw Error('Explicit combat baseline file does not exist');
 const result=cp.spawnSync('git',['show',`${pin.commit}:${pin.path}`],{cwd:root,maxBuffer:8e6});
 if(result.status!==0)throw Error('Pinned runtime history is missing. Fetch full repository history, or set BLOOM_COMBAT_BASELINE to the exact pinned HTML.');
 fs.writeFileSync(destination,result.stdout);
}
const actual=crypto.createHash('sha256').update(fs.readFileSync(destination)).digest('hex');
if(actual!==pin.sha256)throw Error(`Combat baseline SHA-256 mismatch: ${actual}`);
console.log(`PASS pinned combat baseline ${pin.commit} (${actual})`);
