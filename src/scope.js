// One isolated realm executes the same verified first-party game source. This file owns
// realm lifetime and typed-array boundaries; all game rules remain in game.js.
export async function createSimulationScope({sourceURL,sourceIntegrity,references,template=document.body}={}) {
 if(!sourceURL||!sourceIntegrity||!references?.modules?.length||references.modules.some(entry=>!entry.verifiedImportURL))throw new TypeError('Verified game/module source descriptors required');
 const iframe=document.createElement('iframe');iframe.hidden=true;iframe.setAttribute('aria-hidden','true');document.body.append(iframe);
 const realm=iframe.contentWindow,doc=realm.document;
 doc.open();doc.write('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>');doc.close();
 const body=template.cloneNode(true);for(const node of body.querySelectorAll('script,iframe'))node.remove();
 for(const node of [...body.childNodes])doc.body.append(doc.importNode(node,true));
 realm.BLOOM_HEADLESS=true;realm.BLOOM_SIMULATION_SCOPE=true;
 const modules=doc.createElement('script');modules.type='module';
 modules.textContent=references.modules.map((entry,i)=>`import * as m${i} from ${JSON.stringify(entry.verifiedImportURL)};globalThis[${JSON.stringify(entry.globalName)}]=m${i};`).join('\n')+'\nglobalThis.BloomScopeModulesReady=true;globalThis.BloomScopeResolve();';
 let error=null;const listen=e=>{error=e.error||new Error(e.message||'Simulation scope error')};realm.addEventListener('error',listen);
 try {
  await new Promise((resolve,reject)=>{realm.BloomScopeResolve=resolve;modules.onerror=()=>reject(new Error('Simulation scope SDK import failed'));doc.body.append(modules)});delete realm.BloomScopeResolve;
  const script=doc.createElement('script');script.src=sourceURL;if(sourceIntegrity){script.integrity=sourceIntegrity;script.crossOrigin='anonymous'}
  await new Promise((resolve,reject)=>{script.onload=resolve;script.onerror=()=>reject(error||new Error('Simulation scope game source failed'));doc.body.append(script)});
  if(error)throw error;if(!realm.BloomSimulationScope?.ready)throw new Error('Simulation-only source bridge unavailable');
 }catch(error){iframe.remove();throw error}
 const bridge=realm.BloomSimulationScope,metrics={installs:0,installMs:0,snapshotBytes:0,steps:0,stepMs:0,modelMs:0,modelBytes:0};
 let context=null,disposed=false;
 const nativeBytes=bytes=>realm.Uint8Array.from(bytes);
 const live=()=>{if(disposed)throw new Error('Simulation scope disposed')};
 return {
  get ready(){return !disposed},get metrics(){return {...metrics}},
  get initialized(){return !disposed&&metrics.installs>0},
  configure(metadata){live();context={...metadata}},
  install(bytes,metadata){live();const started=performance.now();context={...metadata};bridge.install(nativeBytes(bytes),context);metrics.installMs+=performance.now()-started;metrics.snapshotBytes+=bytes.byteLength;metrics.installs++;},
  restore(bytes){live();if(!context)throw new Error('Scope requires a confirmed checkpoint');const started=performance.now();bridge.install(nativeBytes(bytes),context);metrics.installMs+=performance.now()-started;metrics.installs++;},
  step(input,metadata){live();const started=performance.now();bridge.step(nativeBytes(input),{...metadata,commands:(metadata.commands||[]).map(command=>({...command,payload:nativeBytes(command.payload)}))});metrics.stepMs+=performance.now()-started;metrics.steps++;},
  models(ids){live();const started=performance.now(),models=structuredClone(bridge.models(ids));metrics.modelMs+=performance.now()-started;metrics.modelBytes+=JSON.stringify(models).length*2;return models;},
  inspect(){live();return structuredClone(bridge.inspect());},
  dispose(){if(disposed)return;disposed=true;bridge.dispose();realm.removeEventListener('error',listen);iframe.remove();context=null;}
 };
}
