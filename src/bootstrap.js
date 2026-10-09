// Game-owned startup integration. Each SDK namespace is imported from the
// declared, integrity-checked, immutable ESM distribution.
const config=JSON.parse(document.getElementById('bloom-runtime-manifest').textContent);
const loading=document.createElement('div');
loading.id='bloom-module-loading';loading.setAttribute('role','status');
loading.style.cssText='position:fixed;inset:0;z-index:1000;display:grid;place-content:center;gap:16px;text-align:center;background:#183225;color:#ecf4d5;font:600 16px system-ui';
const label=document.createElement('span'),retry=document.createElement('button');
label.textContent='게임을 준비하고 있어요';retry.textContent='다시 시도';retry.hidden=true;
loading.append(label,retry);document.body.append(loading);
const ready=new Map();let pending=false,started=false;
const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
async function namespace(entry){
  if(ready.has(entry.name))return ready.get(entry.name);
  const response=await fetch(entry.url,{cache:'force-cache'});
  if(!response.ok)throw new Error('Module request failed: '+response.status);
  const bytes=await response.arrayBuffer();
  if(bytes.byteLength!==entry.bytes||await digest(bytes)!==entry.sha256)throw new Error('Module integrity failed: '+entry.name);
  const url=URL.createObjectURL(new Blob([bytes],{type:'text/javascript'}));
  try{const exports=await import(url);ready.set(entry.name,exports);return exports}
  finally{URL.revokeObjectURL(url)}
}
async function launch(){
  if(pending||started)return;pending=true;retry.hidden=true;label.textContent='게임을 준비하고 있어요';
  try{
    const modules=await Promise.all(config.modules.map(async entry=>({entry,exports:await namespace(entry)})));
    for(const {entry,exports}of modules)globalThis[entry.globalName]=exports;
    globalThis.BloomModuleReferences=Object.freeze({sourceCommit:config.sourceCommit,distCommit:config.distCommit,modules:config.modules});
    const script=document.createElement('script'),asset=config.game;
    script.src=new URL(asset.file+'?version='+asset.sha256,document.baseURI).href;
    script.integrity='sha256-'+btoa(String.fromCharCode(...Uint8Array.from(asset.sha256.match(/../g),b=>parseInt(b,16))));
    script.crossOrigin='anonymous';
    globalThis.BloomGameSourceURL=script.src;
    await new Promise((resolve,reject)=>{script.onload=resolve;script.onerror=()=>reject(new Error('Game source loading failed'));document.body.append(script)});
    started=true;loading.remove();
  }catch(error){label.textContent='게임을 준비하지 못했어요. 다시 시도해 주세요';retry.hidden=false;console.warn(error)}
  finally{pending=false}
}
retry.addEventListener('click',()=>{void launch()});
void launch();
