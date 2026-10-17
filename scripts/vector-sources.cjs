'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {DOMParser}=require('@xmldom/xmldom');
const SVG_SHAPE_ELEMENTS=new Set(['path','rect','circle','ellipse','line','polyline','polygon']);
function validatePaintedShapeIds(bytes,file){
  const errors=[];
  const document=new DOMParser({onError(level,message){errors.push(`${level}: ${message}`)}}).parseFromString(bytes.toString('utf8'),'image/svg+xml');
  if(errors.length||!document?.documentElement||document.documentElement.nodeName!=='svg')throw new Error(`Invalid SVG XML in ${file}${errors.length?`: ${errors.join('; ')}`:''}`);
  const ids=new Map();let shapeCount=0;
  const visit=node=>{
    if(node.nodeType!==1)return;
    const id=node.getAttribute('id');
    if(id){if(ids.has(id))throw new Error(`Duplicate SVG DOM id "${id}" in ${file}`);ids.set(id,node)}
    if(SVG_SHAPE_ELEMENTS.has(node.nodeName)){
      shapeCount++;
      if(!id)throw new Error(`Painted SVG shape <${node.nodeName}> must keep its DOM id in ${file}`);
    }
    for(let child=node.firstChild;child;child=child.nextSibling)visit(child);
  };
  visit(document.documentElement);
  if(!shapeCount)throw new Error(`No supported painted SVG shapes found in ${file}`);
  return shapeCount;
}
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
    validatePaintedShapeIds(bytes,spec.file);
    return {...spec,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
  });
}
module.exports={validatePaintedShapeIds,validateVectorSources};

if(require.main===module)console.log(JSON.stringify(validateVectorSources(path.resolve(__dirname,'..')),null,2));
