'use strict';
// Import official Git data responses when git fetch is unavailable. No response
// is trusted until its reconstructed Git object ID equals the immutable pin.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const file=process.argv[2];assert(file,'Pass JSON with dist, source, tree and manifest official API responses');const data=JSON.parse(fs.readFileSync(file)),dir=path.dirname(file);
const oid=(type,b)=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`${type} ${b.length}\0`),b])).digest('hex');
function commit(c){
 const v=c.verification;let candidates=[];
 if(v?.payload&&v.signature){const at=v.payload.indexOf('\n\n'),sig='gpgsig '+v.signature.trimEnd().replace(/\n/g,'\n ');for(const ending of ['', '\n', '\n '])candidates.push(v.payload.slice(0,at)+'\n'+sig+ending+v.payload.slice(at));}
 else{const identity=p=>`${p.name} <${p.email}> ${Date.parse(p.date)/1000}`;for(const tz of ['+0000','+0900'])for(const ending of ['\n',''])candidates.push(`tree ${c.tree.sha}\n${c.parents.map(p=>'parent '+p.sha+'\n').join('')}author ${identity(c.author)} ${tz}\ncommitter ${identity(c.committer)} ${tz}\n\n${c.message}${ending}`);}
 const bytes=candidates.map(x=>Buffer.from(x)).find(b=>oid('commit',b)===c.sha);assert(bytes,'Cannot reconstruct exact Git commit '+c.sha);return bytes;
}
assert.equal(data.tree.truncated,false);const tree=Buffer.concat(data.tree.tree.map(e=>{assert.equal(e.type,'blob');assert.equal(e.mode,'100644');assert(!/[\0/]/.test(e.path));return Buffer.concat([Buffer.from(e.mode+' '+e.path+'\0'),Buffer.from(e.sha,'hex')])}));assert.equal(oid('tree',tree),data.tree.sha);assert.equal(data.dist.tree.sha,data.tree.sha);
const distBytes=commit(data.dist),sourceBytes=commit(data.source);
fs.writeFileSync(path.join(dir,'dist-commit.raw'),distBytes);fs.writeFileSync(path.join(dir,'source-commit.raw'),sourceBytes);fs.writeFileSync(path.join(dir,'dist-tree.base64'),tree.toString('base64')+'\n');fs.writeFileSync(path.join(dir,'manifest.json'),data.manifest);console.log('Reconstructed exact pinned Git source, distribution, tree objects');
