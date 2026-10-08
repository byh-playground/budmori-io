'use strict';
// 배포된 Git objects를 검증한 후 vendor/inline/lock을 함께 갱신하는 생성 도구.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),assert=require('node:assert/strict');
const {verify,inline,sha,MODULES}=require('./gamekit-provenance.cjs');
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
 const staged=path.join(taskTemp,'staged'),vendor=path.join(staged,'vendor/upstream');fs.mkdirSync(vendor,{recursive:true});
 const put=(file,bytes)=>fs.writeFileSync(path.join(vendor,file),bytes);
 put('dist-commit.raw',distBytes);put('source-commit.raw',git(['cat-file','commit',sourceCommit]));
 put('dist-tree.base64',git(['cat-file','tree',`${distCommit}^{tree}`]).toString('base64')+'\n');put('manifest.json',manifestBytes);
 for(const entry of manifest.modules) {assert.match(entry.file,/^[a-z-]+\.js$/);put(entry.file,git(['show',`${distCommit}:${entry.file}`]));}
 let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/\r\n/g,'\n');
 const lock={...previous,sourceCommit,distCommit,manifestSHA256:sha(manifestBytes),modules:[]};
 for(const name of Object.keys(MODULES)){
  const bytes=fs.readFileSync(path.join(vendor,name+'.js')),embedded=inline(name,bytes);
  const begin=`/* BEGIN GAMEKIT ${name} */\n`,end=`/* END GAMEKIT ${name} */`,start=html.indexOf(begin),stop=html.indexOf(end,start);
  assert(start>=0&&stop>start&&html.indexOf(begin,start+begin.length)===-1,'exactly one inline '+name);
  html=html.slice(0,start+begin.length)+embedded.toString('utf8')+html.slice(stop);
  lock.modules.push({name,bundleSHA256:sha(bytes),inlineSHA256:sha(embedded)});
 }
 html=html.split(previous.sourceCommit).join(sourceCommit).split(previous.distCommit).join(distCommit);
 fs.writeFileSync(path.join(staged,'index.html'),html);fs.writeFileSync(path.join(staged,'gamekit-lock.json'),JSON.stringify(lock,null,2)+'\n');
 verify(staged); // 완성한 staged 전체를 검증하기 전 작업 파일은 바꾸지 않습니다.
 for(const file of ['index.html','gamekit-lock.json'])fs.copyFileSync(path.join(staged,file),path.join(root,file));
 fs.mkdirSync(path.join(root,'vendor/upstream'),{recursive:true});
 for(const file of fs.readdirSync(vendor))fs.copyFileSync(path.join(vendor,file),path.join(root,'vendor/upstream',file));
 verify(root);console.log('PASS updated verified gamekit source',sourceCommit,'dist',distCommit);
}finally{
 // mkdtemp가 만든 전용 디렉터리만 정리합니다. 저장소·사용자 파일은 대상이 아닙니다.
 assert(path.dirname(taskTemp)===path.resolve(os.tmpdir())&&path.basename(taskTemp).startsWith('budmori-gamekit-update-'));
 fs.rmSync(taskTemp,{recursive:true,force:true});
}
