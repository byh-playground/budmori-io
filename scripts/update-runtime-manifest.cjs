'use strict';
// Deterministic asset manifest generation; no source bundle is copied to HTML.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
function prepareRuntime(root=path.resolve(__dirname,'..')){
const lock=JSON.parse(fs.readFileSync(path.join(root,'gamekit-lock.json'),'utf8'));
const namespaces={'input':'BloomGamekitInput','interpolation':'BloomGamekitInterpolation','camera':'BloomGamekitCamera','hud':'BloomGamekitHud','presentation-events':'BloomGamekitPresentationEvents','debug-tools':'BloomGamekitDebugTools','rendering':'BloomGamekitRendering','rollback-netcode':'BloomOwnedSDK','simloop':'BloomGamekitSimloop'};
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const modules=Object.entries(namespaces).map(([name,globalName])=>{
  const bytes=fs.readFileSync(path.join(root,'vendor/upstream',name+'.js'));
  return{name,globalName,url:`https://cdn.jsdelivr.net/gh/byh-playground/bloom-gamekit@${lock.distCommit}/${name}.js`,bytes:bytes.length,sha256:sha(bytes)};
});
const gameBytes=fs.readFileSync(path.join(root,'src/game.js')),bootstrap=fs.readFileSync(path.join(root,'src/bootstrap.js'));
const manifest={schemaVersion:1,sourceCommit:lock.sourceCommit,distCommit:lock.distCommit,modules,game:{file:'src/game.js',bytes:gameBytes.length,sha256:sha(gameBytes)},bootstrap:{file:'src/bootstrap.js',bytes:bootstrap.length,sha256:sha(bootstrap)}};
const scopeFile=path.join(root,'src/scope.js');
if(fs.existsSync(scopeFile)){const bytes=fs.readFileSync(scopeFile);manifest.scope={file:'src/scope.js',bytes:bytes.length,sha256:sha(bytes)}}
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const marker=/<script id="bloom-runtime-manifest" type="application\/json">[\s\S]*?<\/script>/;
if(!marker.test(html))throw new Error('Runtime manifest marker missing');
html=html.replace(marker,'<script id="bloom-runtime-manifest" type="application/json">'+JSON.stringify(manifest)+'</script>');
const integrity='sha256-'+Buffer.from(manifest.bootstrap.sha256,'hex').toString('base64');
html=html.replace(/<script type="module"[^>]*data-bloom-bootstrap><\/script>/,`<script type="module" src="./src/bootstrap.js?version=${manifest.bootstrap.sha256}" integrity="${integrity}" crossorigin="anonymous" data-bloom-bootstrap></script>`);
fs.writeFileSync(path.join(root,'index.html'),html);
return{modules:modules.length,gameBytes:gameBytes.length,indexBytes:Buffer.byteLength(html),gameSha256:manifest.game.sha256};
}
module.exports={prepareRuntime};
if(require.main===module)console.log(JSON.stringify(prepareRuntime()));
