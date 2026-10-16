// Game-owned startup integration. Each SDK namespace is imported from the
// declared, integrity-checked, immutable ESM distribution.
const config=JSON.parse(document.getElementById('bloom-runtime-manifest').textContent);
const loading=document.createElement('div');
loading.id='bloom-module-loading';loading.setAttribute('role','status');
loading.style.cssText='position:fixed;inset:0;z-index:1000;display:grid;place-content:center;gap:16px;text-align:center;background:#183225;color:#ecf4d5;font:600 16px system-ui';
const label=document.createElement('span'),retry=document.createElement('button');
label.textContent='게임을 준비하고 있어요';retry.textContent='다시 시도';retry.hidden=true;
loading.append(label,retry);document.body.append(loading);
const ready=new Map();let pending=false,started=false;let vectorLoader=null;
const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
async function namespace(entry){
  if(ready.has(entry.name))return ready.get(entry.name);
  const response=await fetch(entry.url,{cache:'force-cache'});
  if(!response.ok)throw new Error('Module request failed: '+response.status);
  const bytes=await response.arrayBuffer();
  if(bytes.byteLength!==entry.bytes||await digest(bytes)!==entry.sha256)throw new Error('Module integrity failed: '+entry.name);
  const url=URL.createObjectURL(new Blob([bytes],{type:'text/javascript'}));
  try{const exports=await import(url),record={exports,verifiedImportURL:url};ready.set(entry.name,record);return record}
  catch(error){URL.revokeObjectURL(url);throw error}
}
async function launch(){
  if(pending||started)return;pending=true;retry.hidden=true;label.textContent='게임을 준비하고 있어요';
  try{
    const modules=await Promise.all(config.modules.map(async entry=>({entry,record:await namespace(entry)})));
    for(const {entry,record}of modules)globalThis[entry.globalName]=record.exports;
    label.textContent='캐릭터를 준비하고 있어요';
    vectorLoader ||= globalThis.BloomGamekitVectorAssetLoader.createVectorAssetLoader({maxEntries:16});
    const troops={},bosses={};
    const records=await Promise.all(config.vectorAssets.map(async spec=>{
      const url=new URL(spec.file+'?version='+spec.sha256,document.baseURI).href;
      const compiled=await vectorLoader.load(url,{sourcePath:spec.file,expectedSha256:spec.sha256,maxBytes:spec.bytes});
      if(compiled.sourceSha256!==spec.sha256)throw new Error('Vector source integrity failed: '+spec.file);
      return {spec,compiled};
    }));
    for(const {spec,compiled} of records)(spec.kind==='troop'?troops:bosses)[spec.id]=compiled;
    globalThis.BudmoriVectorResources=Object.freeze({troops:Object.freeze(troops),bosses:Object.freeze(bosses)});
    let scope=null;
    if(config.scope){const entry={...config.scope,name:'app-simulation-scope',url:new URL(config.scope.file+'?version='+config.scope.sha256,document.baseURI).href};
      const record=await namespace(entry);globalThis.BloomSimulationScopeModule=record.exports;
      scope=Object.freeze({...entry,verifiedImportURL:record.verifiedImportURL})}
    globalThis.BloomModuleReferences=Object.freeze({sourceCommit:config.sourceCommit,distCommit:config.distCommit,scope,
      modules:Object.freeze(modules.map(({entry,record})=>Object.freeze({...entry,verifiedImportURL:record.verifiedImportURL}))),
      dispose(){for(const record of ready.values())URL.revokeObjectURL(record.verifiedImportURL);ready.clear()}});
    const script=document.createElement('script'),asset=config.game;
    script.src=new URL(asset.file+'?version='+asset.sha256,document.baseURI).href;
    script.integrity='sha256-'+btoa(String.fromCharCode(...Uint8Array.from(asset.sha256.match(/../g),b=>parseInt(b,16))));
    script.crossOrigin='anonymous';
    globalThis.BloomGameSourceURL=script.src;
    globalThis.BloomGameSourceIntegrity=script.integrity;
    await new Promise((resolve,reject)=>{script.onload=resolve;script.onerror=()=>reject(new Error('Game source loading failed'));document.body.append(script)});
    started=true;loading.remove();
  }catch(error){label.textContent='게임을 준비하지 못했어요. 다시 시도해 주세요';retry.hidden=false;console.warn(error)}
  finally{pending=false}
}
retry.addEventListener('click',()=>{void launch()});
void launch();
