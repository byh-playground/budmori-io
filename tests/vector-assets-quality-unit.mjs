import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileVectorAssetFile, VECTOR_ASSET_QUALITY_PRESETS} from '../vendor/upstream-source/modules/vector-assets/compiler.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const config=JSON.parse(await readFile(path.join(root,'scripts/vector-assets-sources.json'),'utf8'));
const specs=[...config.assets.map(asset=>({...asset,kind:'troop',id:asset.species})),...config.bosses.map(asset=>({...asset,kind:'boss'}))];
const results=[];
for(const spec of specs){
  const preset=VECTOR_ASSET_QUALITY_PRESETS[spec.qualityPreset];
  assert(preset,`Unknown shared quality preset ${spec.qualityPreset}`);
  const file=path.join(root,spec.file),source=await readFile(file),expectedHash=createHash('sha256').update(source).digest('hex');
  const current=await compileVectorAssetFile(file,spec.file,preset);
  const legacy=await compileVectorAssetFile(file,spec.file,{curveSegments:16,strokeArcDivisions:12});
  assert.equal(current.sourceSha256,expectedHash,`${spec.file} keeps the exact original SVG source`);
  assert.equal(current.compilerOptions.curveSegments,preset.curveSegments);
  assert.equal(current.compilerOptions.strokeArcDivisions,preset.strokeArcDivisions);
  assert(current.geometry.vertices.length>0&&current.geometry.indices.length>0,`${spec.file} compiles to valid geometry`);
  assert(current.geometry.vertices.byteLength<legacy.geometry.vertices.byteLength,`${spec.file} preset geometry is smaller than legacy 16/12`);
  results.push({file:spec.file,preset:spec.qualityPreset,compilerOptions:current.compilerOptions,geometryBytes:current.geometry.vertices.byteLength,legacyGeometryBytes:legacy.geometry.vertices.byteLength});
}
console.log(JSON.stringify({status:'PASS',results},null,2));
