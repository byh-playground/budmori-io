'use strict';
// Deterministic asset manifest generation; no source bundle is copied to HTML.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const canonicalTextBytes=bytes=>Buffer.from(bytes.toString('utf8').replace(/\r\n/g,'\n'),'utf8');
function readCanonicalTextAsset(file){
  const source=fs.readFileSync(file),bytes=canonicalTextBytes(source);
  if(!source.equals(bytes))fs.writeFileSync(file,bytes);
  return bytes;
}
function prepareRuntime(root=path.resolve(__dirname,'..')){
const lock=JSON.parse(fs.readFileSync(path.join(root,'gamekit-lock.json'),'utf8'));
const namespaces={'input':'BloomGamekitInput','interpolation':'BloomGamekitInterpolation','camera':'BloomGamekitCamera','hud':'BloomGamekitHud','presentation-events':'BloomGamekitPresentationEvents','debug-tools':'BloomGamekitDebugTools','rendering':'BloomGamekitRendering','vector-assets':'BloomGamekitVectorAssets','vector-assets-loader':'BloomGamekitVectorAssetLoader',deterministic:'BloomGamekitDeterministic',simloop:'BloomGamekitSimloop'};
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const modules=Object.entries(namespaces).map(([name,globalName])=>{
  const bytes=fs.readFileSync(path.join(root,'vendor/upstream',name+'.js'));
  return{name,globalName,url:`https://cdn.jsdelivr.net/gh/byh-playground/bloom-gamekit@${lock.distCommit}/${name}.js`,bytes:bytes.length,sha256:sha(bytes)};
});
const gameBytes=readCanonicalTextAsset(path.join(root,'src/game.js')),bootstrap=readCanonicalTextAsset(path.join(root,'src/bootstrap.js'));
const vectorAssets=require('./vector-sources.cjs').validateVectorSources(root);
const manifest={vectorAssets,schemaVersion:1,sourceCommit:lock.sourceCommit,distCommit:lock.distCommit,modules,game:{file:'src/game.js',bytes:gameBytes.length,sha256:sha(gameBytes)},bootstrap:{file:'src/bootstrap.js',bytes:bootstrap.length,sha256:sha(bootstrap)}};
const scopeFile=path.join(root,'src/scope.js');
if(fs.existsSync(scopeFile)){const bytes=readCanonicalTextAsset(scopeFile);manifest.scope={file:'src/scope.js',bytes:bytes.length,sha256:sha(bytes)}}
const versionSource=fs.readFileSync(path.join(root,'src/version.js'),'utf8');
const productVersion=versionSource.match(/PRODUCT_VERSION\s*=\s*['"]([^'"]+)['"]/)?.[1];
if(!productVersion)throw new Error('Product version is missing from src/version.js');
manifest.productVersion=productVersion;
let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/\r\n/g,'\n');
const marker=/<script id="bloom-runtime-manifest" type="application\/json">[\s\S]*?<\/script>/;
if(!marker.test(html))throw new Error('Runtime manifest marker missing');
html=html.replace(marker,'<script id="bloom-runtime-manifest" type="application/json">'+JSON.stringify(manifest)+'</script>');
const integrity='sha256-'+Buffer.from(manifest.bootstrap.sha256,'hex').toString('base64');
html=html.replace(/<script type="module"[^>]*data-bloom-bootstrap><\/script>/,`<script type="module" src="./src/bootstrap.js?version=${manifest.bootstrap.sha256}" integrity="${integrity}" crossorigin="anonymous" data-bloom-bootstrap></script>`);
fs.writeFileSync(path.join(root,'index.html'),html);
return{modules:modules.length,gameBytes:gameBytes.length,indexBytes:Buffer.byteLength(html),gameSha256:manifest.game.sha256};
}
module.exports={prepareRuntime,canonicalTextBytes};
if(require.main===module)console.log(JSON.stringify(prepareRuntime()));
