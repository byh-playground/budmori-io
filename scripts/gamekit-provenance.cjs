'use strict';
// Offline verification proves the checked-in cache belongs to the pinned Git
// objects and reproduces the ESM -> inline conversion. It does not contact GitHub
// or independently attest the source build. Refresh fetches immutable commits.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),cp=require('node:child_process'),os=require('node:os');
const ROOT=path.resolve(__dirname,'..');
const MODULES=Object.freeze({'presentation-events':'BloomGamekitPresentationEvents',camera:'BloomGamekitCamera','rollback-netcode':'BloomOwnedSDK',interpolation:'BloomGamekitInterpolation',hud:'BloomGamekitHud',rendering:'BloomGamekitRendering',input:'BloomGamekitInput','debug-tools':'BloomGamekitDebugTools'});
const DIST_MODULES=Object.freeze(['interpolation','rendering','input','deterministic','simloop','transport','replay','rollback','rollback-netcode','camera','presentation-events','hud','debug-tools']);
const sha=(bytes,algorithm='sha256')=>crypto.createHash(algorithm).update(bytes).digest('hex');
const objectId=(type,bytes)=>sha(Buffer.concat([Buffer.from(`${type} ${bytes.length}\0`),bytes]),'sha1');
function inline(name,bytes){
 const esbuild=require('esbuild');assert.equal(esbuild.version,'0.28.2','Pinned transform version');
 return Buffer.from(esbuild.buildSync({stdin:{contents:bytes.toString('utf8'),sourcefile:`budmori-gamekit-migration/vendor/upstream/${name}.js`,loader:'js'},bundle:true,write:false,format:'iife',globalName:MODULES[name],platform:'browser',target:'es2022',charset:'utf8',legalComments:'inline',minify:false,sourcemap:false}).outputFiles[0].contents);
}
function treeEntries(bytes){
 const result=new Map();let offset=0;
 while(offset<bytes.length){const space=bytes.indexOf(32,offset),nul=bytes.indexOf(0,space);assert(space>offset&&nul>space&&nul+21<=bytes.length,'Malformed Git tree');const mode=bytes.subarray(offset,space).toString(),name=bytes.subarray(space+1,nul).toString();assert(!result.has(name),'Duplicate Git tree entry');result.set(name,{mode,oid:bytes.subarray(nul+1,nul+21).toString('hex')});offset=nul+21;}
 return result;
}
function verify(root=ROOT){
 const lock=JSON.parse(fs.readFileSync(path.join(root,'gamekit-lock.json'))),dir=path.join(root,'vendor/upstream'),read=n=>fs.readFileSync(path.join(dir,n));
 assert.equal(lock.repository,'byh-playground/bloom-gamekit');for(const key of ['sourceCommit','distCommit'])assert.match(lock[key],/^[a-f0-9]{40}$/);
 assert.equal(lock.esbuild,'0.28.2');assert.equal(lock.modules.length,Object.keys(MODULES).length);assert.equal(new Set(lock.modules.map(m=>m.name)).size,lock.modules.length);
 const commit=read('dist-commit.raw'),source=read('source-commit.raw'),treeText=read('dist-tree.base64').toString('ascii'),tree=Buffer.from(treeText.trim(),'base64');assert.equal(tree.toString('base64')+'\n',treeText,'Canonical base64 Git tree cache');
 assert.equal(objectId('commit',commit),lock.distCommit,'Distribution commit object');assert.equal(objectId('commit',source),lock.sourceCommit,'Source commit object');
 const message=commit.toString('utf8');assert.equal(message.match(/^tree ([a-f0-9]{40})$/m)?.[1],objectId('tree',tree),'Distribution tree');
 assert.equal(message.match(/^Source-Commit: ([a-f0-9]{40})$/m)?.[1],lock.sourceCommit,'Distribution source trailer');
 assert.equal(message.match(/^Manifest-SHA256: ([a-f0-9]{64})$/m)?.[1],lock.manifestSHA256,'Distribution manifest trailer');
 const entries=treeEntries(tree),manifestBytes=read('manifest.json');
 const checkBlob=(name,bytes)=>{assert.equal(entries.get(name)?.mode,'100644',name+' must be regular file');assert.equal(objectId('blob',bytes),entries.get(name)?.oid,name+' pinned Git blob');};
 checkBlob('manifest.json',manifestBytes);assert.equal(sha(manifestBytes),lock.manifestSHA256,'Manifest SHA-256');
 const manifest=JSON.parse(manifestBytes);assert.equal(manifest.schemaVersion,1);assert.equal(manifest.modules.length,DIST_MODULES.length);assert.deepEqual(manifest.modules.map(m=>m.file),DIST_MODULES.map(n=>n+'.js'));for(const entry of manifest.modules){const bytes=read(entry.file);checkBlob(entry.file,bytes);assert.equal(sha(bytes),entry.sha256,entry.file+' manifest bytes');assert(message.split('\n').includes(`Bundle-SHA256: ${entry.file} ${entry.sha256}`),entry.file+' commit trailer');}assert.equal(new Set(manifest.modules.map(m=>m.file)).size,manifest.modules.length);
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 for(const module of lock.modules){assert(Object.hasOwn(MODULES,module.name),'Unexpected module');const filename=module.name+'.js',bytes=read(filename),entry=manifest.modules.find(m=>m.file===filename);assert(entry,filename+' missing from manifest');checkBlob(filename,bytes);assert.equal(sha(bytes),entry.sha256,filename+' manifest bytes');assert.equal(sha(bytes),module.bundleSHA256,filename+' lock bytes');assert(message.split('\n').includes(`Bundle-SHA256: ${filename} ${module.bundleSHA256}`),filename+' commit trailer');
 const begin=`/* BEGIN GAMEKIT ${module.name} */\n`,end=`/* END GAMEKIT ${module.name} */`,start=html.indexOf(begin),stop=html.indexOf(end,start);assert(start>=0&&stop>start,'Missing inline delimiters');assert.equal(html.indexOf(begin,start+begin.length),-1,'Duplicate inline module');const embedded=Buffer.from(html.slice(start+begin.length,stop));assert.equal(sha(embedded),module.inlineSHA256,module.name+' inline hash');assert(embedded.equals(inline(module.name,bytes)),module.name+' reproducible upstream transform');
 }
 return lock;
}
// Update-time command: obtain real Git objects from immutable pins, then validate
// all bundles before replacing the cache. A local upstream Git checkout is also
// accepted so maintainers can use their authenticated fetch outside this tool.
function refresh(repository,root=ROOT){
 const lock=JSON.parse(fs.readFileSync(path.join(root,'gamekit-lock.json'))),temp=fs.mkdtempSync(path.join(os.tmpdir(),'budmori-provenance-'));
 const git=(args)=>cp.execFileSync('git',args,{cwd:temp,maxBuffer:32*1024*1024,timeout:120000,env:{...process.env,GIT_TERMINAL_PROMPT:'0'}});
 try{git(['init','--bare','--quiet']);for(const pin of [lock.distCommit,lock.sourceCommit]){assert.match(pin,/^[a-f0-9]{40}$/);git(['fetch','--quiet','--no-tags','--depth=1',repository,pin]);}
 const cache=path.join(temp,'cache');fs.mkdirSync(cache);const put=(name,bytes)=>fs.writeFileSync(path.join(cache,name),bytes);
 put('dist-commit.raw',git(['cat-file','commit',lock.distCommit]));put('source-commit.raw',git(['cat-file','commit',lock.sourceCommit]));put('dist-tree.base64',git(['cat-file','tree',`${lock.distCommit}^{tree}`]).toString('base64')+'\n');
 for(const name of ['manifest.json',...DIST_MODULES.map(n=>n+'.js')])put(name,git(['show',`${lock.distCommit}:${name}`]));
 const staged=path.join(temp,'staged');fs.mkdirSync(path.join(staged,'vendor'),{recursive:true});fs.cpSync(cache,path.join(staged,'vendor/upstream'),{recursive:true});for(const name of ['index.html','gamekit-lock.json'])fs.copyFileSync(path.join(root,name),path.join(staged,name));verify(staged);
 fs.mkdirSync(path.join(root,'vendor/upstream'),{recursive:true});fs.cpSync(cache,path.join(root,'vendor/upstream'),{recursive:true});console.log('Verified immutable cache refreshed:',lock.distCommit);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
}
module.exports={verify,inline,sha,MODULES};
if(require.main===module){if(process.argv[2]==='refresh')refresh(process.argv[3]||'https://github.com/byh-playground/bloom-gamekit.git');else{const lock=verify();console.log('PASS offline pinned Git objects, manifest, all ESM bundles and reproducible inline bytes',lock.sourceCommit,lock.distCommit);}}
