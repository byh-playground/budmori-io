'use strict';
// 검증한 배포 Git objects와 실제 ESM 참조/게임 원본 무결성을 함께 갱신합니다.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),assert=require('node:assert/strict');
const {verify,sha,MODULES,DIST_ASSETS}=require('./gamekit-provenance.cjs');
const {prepareRuntime}=require('./update-runtime-manifest.cjs');
const root=path.resolve(__dirname,'..'),repository=process.argv[2]||'https://github.com/byh-playground/bloom-gamekit.git',ref=process.argv[3]||'refs/heads/dist';
const previous=JSON.parse(fs.readFileSync(path.join(root,'gamekit-lock.json'),'utf8'));
const taskTemp=fs.mkdtempSync(path.join(os.tmpdir(),'budmori-gamekit-update-'));
const git=args=>cp.execFileSync('git',args,{cwd:taskTemp,maxBuffer:64*1024*1024,timeout:120000,env:{...process.env,GIT_TERMINAL_PROMPT:'0'}});
try{
 git(['init','--bare','--quiet']);git(['fetch','--quiet','--no-tags','--depth=1',repository,ref]);
 const distCommit=git(['rev-parse','FETCH_HEAD']).toString().trim(),distBytes=git(['cat-file','commit',distCommit]);
 const sourceCommit=distBytes.toString('utf8').match(/^Source-Commit: ([a-f0-9]{40})$/m)?.[1];assert(sourceCommit,'dist requires verified Source-Commit trailer');
 git(['fetch','--quiet','--no-tags','--depth=1',repository,sourceCommit]);
 const manifestBytes=git(['show',`${distCommit}:manifest.json`]),manifest=JSON.parse(manifestBytes);
 assert.deepEqual(Object.keys(manifest),['schemaVersion','modules','assets'],'manifest keys');assert.equal(manifest.schemaVersion,2,'font assets require manifest schema 2');
 assert.deepEqual(manifest.modules.map(m=>m.file),['interpolation.js','rendering.js','input.js','deterministic.js','simloop.js','transport.js','replay.js','rollback.js','rollback-netcode.js','camera.js','presentation-events.js','hud.js','debug-tools.js'],'fixed distribution module order');
 assert.deepEqual(manifest.assets.map(({file,version})=>({file,version})),DIST_ASSETS,'fixed font asset inventory');
 assert.equal(Buffer.from(JSON.stringify(manifest,null,2)+'\n').equals(manifestBytes),true,'canonical distribution manifest');
 const staged=path.join(taskTemp,'staged'),vendor=path.join(staged,'vendor/upstream');fs.mkdirSync(vendor,{recursive:true});
 const put=(file,bytes)=>{const target=path.join(vendor,...file.split('/'));fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes)};
 put('dist-commit.raw',distBytes);put('source-commit.raw',git(['cat-file','commit',sourceCommit]));
 put('dist-tree.base64',git(['cat-file','tree',`${distCommit}^{tree}`]).toString('base64')+'\n');put('manifest.json',manifestBytes);
 put('assets-tree.base64',git(['cat-file','tree',`${distCommit}:assets`]).toString('base64')+'\n');put('assets-fonts-tree.base64',git(['cat-file','tree',`${distCommit}:assets/fonts`]).toString('base64')+'\n');
 for(const entry of manifest.modules) {assert.match(entry.file,/^[a-z-]+\.js$/);put(entry.file,git(['show',`${distCommit}:${entry.file}`]));}
 for(const entry of manifest.assets){assert(DIST_ASSETS.some(asset=>asset.file===entry.file&&asset.version===entry.version),'asset path/version must be explicitly supported');assert(Number.isSafeInteger(entry.bytes)&&entry.bytes>0&&/^[a-f0-9]{64}$/.test(entry.sha256),'asset size/hash');put(entry.file,git(['show',`${distCommit}:${entry.file}`]));}
 let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/\r\n/g,'\n');
 const lock={...previous,schemaVersion:3,sourceCommit,distCommit,manifestSHA256:sha(manifestBytes),assets:manifest.assets,modules:[]};
 for(const name of Object.keys(MODULES)){
  const bytes=fs.readFileSync(path.join(vendor,name+'.js'));
  lock.modules.push({name,bundleSHA256:sha(bytes)});
 }
 html=html.split(previous.sourceCommit).join(sourceCommit).split(previous.distCommit).join(distCommit);
 let game=fs.readFileSync(path.join(root,'src/game.js'),'utf8').replace(/\r\n/g,'\n').split(previous.sourceCommit).join(sourceCommit).split(previous.distCommit).join(distCommit);
 const sourceStart='/* BEGIN BLOOM FONT ASSET SOURCE */',sourceEnd='/* END BLOOM FONT ASSET SOURCE */',sourceFrom=game.indexOf(sourceStart),sourceTo=game.indexOf(sourceEnd,sourceFrom);
 assert(sourceFrom>=0&&sourceTo>sourceFrom&&game.indexOf(sourceStart,sourceFrom+sourceStart.length)===-1,'one explicit font asset source marker pair');
 const asset=manifest.assets[0],fontSource=`const BLOOM_FONT_ASSET_SOURCE=Object.freeze({url:${JSON.stringify(`https://cdn.jsdelivr.net/gh/byh-playground/bloom-gamekit@${distCommit}/${asset.file}`)},version:${JSON.stringify(distCommit)},sha256:${JSON.stringify(asset.sha256)},bytes:${asset.bytes}});`;
 game=game.slice(0,sourceFrom+sourceStart.length)+'\n'+fontSource+'\n'+game.slice(sourceTo);
 fs.writeFileSync(path.join(staged,'index.html'),html);fs.writeFileSync(path.join(staged,'gamekit-lock.json'),JSON.stringify(lock,null,2)+'\n');
 fs.mkdirSync(path.join(staged,'src'),{recursive:true});fs.writeFileSync(path.join(staged,'src/game.js'),game);fs.copyFileSync(path.join(root,'src/bootstrap.js'),path.join(staged,'src/bootstrap.js'));
 if(fs.existsSync(path.join(root,'src/scope.js')))fs.copyFileSync(path.join(root,'src/scope.js'),path.join(staged,'src/scope.js'));
 prepareRuntime(staged);
 verify(staged); // 완성한 staged 전체를 검증하기 전 작업 파일은 바꾸지 않습니다.
 for(const file of ['index.html','gamekit-lock.json'])fs.copyFileSync(path.join(staged,file),path.join(root,file));
 fs.copyFileSync(path.join(staged,'src/game.js'),path.join(root,'src/game.js'));
 fs.mkdirSync(path.join(root,'vendor/upstream'),{recursive:true});
 fs.cpSync(vendor,path.join(root,'vendor/upstream'),{recursive:true,force:true}); // Merge new fixed assets; preserve unrelated source archive/user files.
 verify(root);console.log('PASS updated verified gamekit source',sourceCommit,'dist',distCommit);
}finally{
 // mkdtemp가 만든 전용 디렉터리만 정리합니다. 저장소·사용자 파일은 대상이 아닙니다.
 assert(path.dirname(taskTemp)===path.resolve(os.tmpdir())&&path.basename(taskTemp).startsWith('budmori-gamekit-update-'));
 fs.rmSync(taskTemp,{recursive:true,force:true});
}
