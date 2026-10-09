'use strict';
// Offline verification proves the checked-in cache belongs to the pinned Git
// objects and checks the immutable ESM references. It does not contact GitHub
// or independently attest the source build. Refresh fetches immutable commits.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),cp=require('node:child_process'),os=require('node:os');
const ROOT=path.resolve(__dirname,'..');
const MODULES=Object.freeze({'presentation-events':'BloomGamekitPresentationEvents',camera:'BloomGamekitCamera','rollback-netcode':'BloomOwnedSDK',interpolation:'BloomGamekitInterpolation',hud:'BloomGamekitHud',rendering:'BloomGamekitRendering',input:'BloomGamekitInput','debug-tools':'BloomGamekitDebugTools',simloop:'BloomGamekitSimloop'});
const DIST_MODULES=Object.freeze(['interpolation','rendering','input','deterministic','simloop','transport','replay','rollback','rollback-netcode','camera','presentation-events','hud','debug-tools']);
const DIST_ASSETS=Object.freeze([Object.freeze({file:'assets/fonts/noto-sans-kr-700-v1.json',version:'noto-sans-kr-700-v1'})]);
const sha=(bytes,algorithm='sha256')=>crypto.createHash(algorithm).update(bytes).digest('hex');
const objectId=(type,bytes)=>sha(Buffer.concat([Buffer.from(`${type} ${bytes.length}\0`),bytes]),'sha1');
function exactKeys(value,keys){return value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key))}
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
 const lock=JSON.parse(fs.readFileSync(path.join(root,'gamekit-lock.json'))),dir=path.join(root,'vendor/upstream'),read=n=>fs.readFileSync(path.join(dir,...n.split('/')));
 assert.equal(lock.schemaVersion,3,'external ESM reference lock schema');assert.equal(lock.repository,'byh-playground/bloom-gamekit');for(const key of ['sourceCommit','distCommit'])assert.match(lock[key],/^[a-f0-9]{40}$/);
 assert.equal(lock.esbuild,'0.28.2');assert.equal(lock.modules.length,Object.keys(MODULES).length);assert.equal(new Set(lock.modules.map(m=>m.name)).size,lock.modules.length);
 assert.deepEqual(lock.assets?.map(({file,version,bytes,sha256})=>({file,version,bytes,sha256})),lock.assets,'Pinned font asset metadata is required');assert.equal(lock.assets.length,DIST_ASSETS.length);
 const commit=read('dist-commit.raw'),source=read('source-commit.raw'),treeText=read('dist-tree.base64').toString('ascii').replace(/\r\n/g,'\n'),tree=Buffer.from(treeText.trim(),'base64');assert.equal(tree.toString('base64')+'\n',treeText,'Canonical base64 Git tree cache');
 assert.equal(objectId('commit',commit),lock.distCommit,'Distribution commit object');assert.equal(objectId('commit',source),lock.sourceCommit,'Source commit object');
 const message=commit.toString('utf8');assert.equal(message.match(/^tree ([a-f0-9]{40})$/m)?.[1],objectId('tree',tree),'Distribution tree');
 assert.equal(message.match(/^Source-Commit: ([a-f0-9]{40})$/m)?.[1],lock.sourceCommit,'Distribution source trailer');
 assert.equal(message.match(/^Manifest-SHA256: ([a-f0-9]{64})$/m)?.[1],lock.manifestSHA256,'Distribution manifest trailer');
 const entries=treeEntries(tree),manifestBytes=read('manifest.json');
 const checkBlob=(name,bytes)=>{assert.equal(entries.get(name)?.mode,'100644',name+' must be regular file');assert.equal(objectId('blob',bytes),entries.get(name)?.oid,name+' pinned Git blob');};
 checkBlob('manifest.json',manifestBytes);assert.equal(sha(manifestBytes),lock.manifestSHA256,'Manifest SHA-256');
 const manifest=JSON.parse(manifestBytes);assert.deepEqual(Object.keys(manifest),['schemaVersion','modules','assets']);assert.equal(manifest.schemaVersion,2);assert.equal(manifest.modules.length,DIST_MODULES.length);assert.deepEqual(manifest.modules.map(m=>m.file),DIST_MODULES.map(n=>n+'.js'));for(const entry of manifest.modules){assert(exactKeys(entry,['file','sha256']),'Bundle manifest schema');const bytes=read(entry.file);checkBlob(entry.file,bytes);assert.equal(sha(bytes),entry.sha256,entry.file+' manifest bytes');assert(message.split('\n').includes(`Bundle-SHA256: ${entry.file} ${entry.sha256}`),entry.file+' commit trailer');}assert.equal(new Set(manifest.modules.map(m=>m.file)).size,manifest.modules.length);
 assert.equal(manifest.assets.length,DIST_ASSETS.length);assert.deepEqual(manifest.assets.map(({file,version})=>({file,version})),DIST_ASSETS);
 const assetsTree=Buffer.from(read('assets-tree.base64').toString('ascii').trim(),'base64'),fontsTree=Buffer.from(read('assets-fonts-tree.base64').toString('ascii').trim(),'base64');
 assert.equal(entries.get('assets')?.mode,'40000','assets subtree');assert.equal(entries.get('assets')?.oid,objectId('tree',assetsTree),'assets subtree object');
 const assetEntries=treeEntries(assetsTree);assert.equal(assetEntries.get('fonts')?.mode,'40000','font directory');assert.equal(assetEntries.get('fonts')?.oid,objectId('tree',fontsTree),'font subtree object');
 const fontEntries=treeEntries(fontsTree);
 for(const [index,entry] of manifest.assets.entries()){
  assert(exactKeys(entry,['file','version','bytes','sha256']),'Font asset manifest schema');assert.equal(entry.file,DIST_ASSETS[index].file);assert.equal(entry.version,DIST_ASSETS[index].version);assert(Number.isSafeInteger(entry.bytes)&&entry.bytes>0);assert.match(entry.sha256,/^[a-f0-9]{64}$/);
  const file=entry.file.split('/').at(-1),bytes=read(entry.file),blob=fontEntries.get(file);assert.equal(blob?.mode,'100644',entry.file+' must be a regular file');assert.equal(objectId('blob',bytes),blob.oid,entry.file+' pinned Git blob');assert.equal(bytes.length,entry.bytes,entry.file+' manifest byte count');assert.equal(sha(bytes),entry.sha256,entry.file+' manifest bytes');
  assert(message.split('\n').includes(`Asset-SHA256: ${entry.file} ${entry.sha256}`),entry.file+' commit hash trailer');assert(message.split('\n').includes(`Asset-Bytes: ${entry.file} ${entry.bytes}`),entry.file+' commit byte trailer');
 }
 assert.deepEqual(lock.assets,manifest.assets,'game lock font assets match pinned manifest');assert.equal(Buffer.from(JSON.stringify(manifest,null,2)+'\n').equals(manifestBytes),true,'canonical pinned manifest');
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/\r\n/g,'\n');
 const runtime=JSON.parse(html.match(/<script id="bloom-runtime-manifest" type="application\/json">([\s\S]*?)<\/script>/)?.[1]||'null');
 assert(runtime&&runtime.schemaVersion===1,'runtime manifest required');assert.equal(runtime.sourceCommit,lock.sourceCommit);assert.equal(runtime.distCommit,lock.distCommit);assert.equal(runtime.modules.length,lock.modules.length);
 for(const module of lock.modules){assert(Object.hasOwn(MODULES,module.name),'Unexpected module');const filename=module.name+'.js',bytes=read(filename),entry=manifest.modules.find(m=>m.file===filename);assert(entry,filename+' missing from manifest');checkBlob(filename,bytes);assert.equal(sha(bytes),entry.sha256,filename+' manifest bytes');assert.equal(sha(bytes),module.bundleSHA256,filename+' lock bytes');assert(message.split('\n').includes(`Bundle-SHA256: ${filename} ${module.bundleSHA256}`),filename+' commit trailer');
 const reference=runtime.modules.find(m=>m.name===module.name);assert(reference,module.name+' runtime reference');assert.equal(reference.globalName,MODULES[module.name]);assert.equal(reference.url,`https://cdn.jsdelivr.net/gh/byh-playground/bloom-gamekit@${lock.distCommit}/${filename}`);assert.equal(reference.sha256,module.bundleSHA256);assert.equal(reference.bytes,bytes.length);assert(!Object.hasOwn(module,'inlineSHA256'),'inline SDK copy metadata removed');
 }
 assert(!html.includes('BEGIN GAMEKIT'),'HTML must reference modules, not include their bodies');
 for(const name of ['game','bootstrap']){const spec=runtime[name];assert.equal(spec.file,`src/${name==='game'?'game':'bootstrap'}.js`);const source=fs.readFileSync(path.join(root,spec.file));assert.equal(source.length,spec.bytes,spec.file+' byte count');assert.equal(sha(source),spec.sha256,spec.file+' SHA256');assert(!source.toString().includes('BEGIN GAMEKIT'),'Game source must not carry a module body');}
 const bootstrapSRI='sha256-'+Buffer.from(runtime.bootstrap.sha256,'hex').toString('base64');assert(html.includes(`integrity="${bootstrapSRI}"`),'bootstrap integrity attribute');
 if(runtime.scope){assert.equal(runtime.scope.file,'src/scope.js');const bytes=fs.readFileSync(path.join(root,runtime.scope.file));assert.equal(bytes.length,runtime.scope.bytes);assert.equal(sha(bytes),runtime.scope.sha256);}
 return lock;
}
// Update-time command: obtain real Git objects from immutable pins, then validate
// all bundles before replacing the cache. A local upstream Git checkout is also
// accepted so maintainers can use their authenticated fetch outside this tool.
function refresh(repository,root=ROOT){
 const lock=JSON.parse(fs.readFileSync(path.join(root,'gamekit-lock.json'))),temp=fs.mkdtempSync(path.join(os.tmpdir(),'budmori-provenance-'));
 const git=(args)=>cp.execFileSync('git',args,{cwd:temp,maxBuffer:32*1024*1024,timeout:120000,env:{...process.env,GIT_TERMINAL_PROMPT:'0'}});
 try{git(['init','--bare','--quiet']);for(const pin of [lock.distCommit,lock.sourceCommit]){assert.match(pin,/^[a-f0-9]{40}$/);git(['fetch','--quiet','--no-tags','--depth=1',repository,pin]);}
 const cache=path.join(temp,'cache');fs.mkdirSync(cache);const put=(name,bytes)=>{const target=path.join(cache,...name.split('/'));fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes)};
 put('dist-commit.raw',git(['cat-file','commit',lock.distCommit]));put('source-commit.raw',git(['cat-file','commit',lock.sourceCommit]));put('dist-tree.base64',git(['cat-file','tree',`${lock.distCommit}^{tree}`]).toString('base64')+'\n');
 for(const name of ['manifest.json',...DIST_MODULES.map(n=>n+'.js'),...DIST_ASSETS.map(a=>a.file)])put(name,git(['show',`${lock.distCommit}:${name}`]));
 put('assets-tree.base64',git(['cat-file','tree',`${lock.distCommit}:assets`]).toString('base64')+'\n');put('assets-fonts-tree.base64',git(['cat-file','tree',`${lock.distCommit}:assets/fonts`]).toString('base64')+'\n');
 const staged=path.join(temp,'staged');fs.mkdirSync(path.join(staged,'vendor'),{recursive:true});fs.cpSync(cache,path.join(staged,'vendor/upstream'),{recursive:true});for(const name of ['index.html','gamekit-lock.json'])fs.copyFileSync(path.join(root,name),path.join(staged,name));fs.cpSync(path.join(root,'src'),path.join(staged,'src'),{recursive:true});verify(staged);
 fs.mkdirSync(path.join(root,'vendor/upstream'),{recursive:true});fs.cpSync(cache,path.join(root,'vendor/upstream'),{recursive:true});console.log('Verified immutable cache refreshed:',lock.distCommit);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
}
module.exports={verify,inline,sha,MODULES,DIST_ASSETS};
if(require.main===module){if(process.argv[2]==='refresh')refresh(process.argv[3]||'https://github.com/byh-playground/bloom-gamekit.git');else{const lock=verify();console.log('PASS pinned Git objects, manifest, immutable ESM references and runtime source integrity',lock.sourceCommit,lock.distCommit);}}
