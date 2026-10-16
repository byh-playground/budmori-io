'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
function validateVectorSources(root){
  const config=JSON.parse(fs.readFileSync(path.join(root,'scripts/vector-assets-sources.json'),'utf8'));
  if(config.schemaVersion!==1||!Array.isArray(config.assets)||!Array.isArray(config.bosses))throw Error('Invalid vector source inventory');
  const specs=[...config.assets.map(a=>({kind:'troop',id:a.species,file:a.file,qualityPreset:a.qualityPreset})),...config.bosses.map(a=>({kind:'boss',id:a.id,file:a.file,qualityPreset:a.qualityPreset}))];
  const keys=new Set();
  return specs.map(spec=>{
    if(!/^assets\/(troops|bosses)\/[a-z0-9-]+\.svg$/.test(spec.file))throw Error('Original SVG source path required');
    if(spec.kind==='troop'&&(!Number.isSafeInteger(spec.id)||spec.id<0))throw Error('Valid troop species ID required');
    if(spec.kind==='boss'&&(typeof spec.id!=='string'||!/^[a-z][a-z0-9-]*$/.test(spec.id)))throw Error('Valid boss resource ID required');
    if(!['standard','smallAsset'].includes(spec.qualityPreset))throw Error('A shared GameKit SVG quality preset is required');
    const key=spec.kind+':'+spec.id;if(keys.has(key))throw Error('Duplicate SVG resource identity');keys.add(key);
    const bytes=fs.readFileSync(path.join(root,spec.file));
    if(!bytes.length||bytes.length>512*1024)throw Error('SVG source size outside supported bounds');
    return {...spec,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
  });
}
module.exports={validateVectorSources};

if(require.main===module)console.log(JSON.stringify(validateVectorSources(path.resolve(__dirname,'..')),null,2));
