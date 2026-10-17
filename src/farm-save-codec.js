import {PRODUCT_VERSION,COMPATIBILITY} from './version.js';
import {normalizeSnapshot,validateSnapshot} from './farm-state.js';
import {captureFarmProgress,restoreFarmProgress,validateFarmProgress} from './farm-progress.js';
const MAX_BYTES=2*1024*1024;
const LEGACY_COMPATIBILITIES=new Set(['0.7','0.6','0.5','0.4']);
const compatibility=version=>typeof version==='string'?version.split('.').slice(0,2).join('.') : '';
export const isReadableCompatibility=version=>compatibility(version)===COMPATIBILITY||LEGACY_COMPATIBILITIES.has(compatibility(version));
export function readFarmSave(text){
 if(typeof text!=='string'||text.length>MAX_BYTES)throw Error('저장 파일이 너무 큽니다.');
 const parsed=JSON.parse(text),version=compatibility(parsed?.productVersion),field=version===COMPATIBILITY?'progress':'world';
 if(parsed?.schema!=='budmori-farm'||!isReadableCompatibility(parsed.productVersion)||!parsed[field]||typeof parsed[field]!=='object'||Array.isArray(parsed[field])||Object.keys(parsed).some(key=>!['schema','productVersion',field].includes(key)))throw Error('이 저장은 현재 '+COMPATIBILITY+' 버전과 호환되지 않습니다. 원본을 내보내 보관한 뒤 새 정원을 시작해 주세요.');
 return parsed;
}
export function decodeFarmSave(text){
 const parsed=readFarmSave(text);let progress=parsed.progress;
 if(!progress){
  // Only additive fields may be defaulted. An incomplete source must never
  // turn into a fresh Farm that can overwrite an existing save.
  if(!['seed','rng','units','food','time','nextId','mode','scene','metrics'].every(key=>Object.hasOwn(parsed.world,key)))throw Error('이전 저장의 필수 진행 데이터가 누락됐어요. 원본은 그대로 보존합니다.');
  const world=normalizeSnapshot(parsed.world,{migrateLegacyRaid:true});validateSnapshot(world);progress=captureFarmProgress(world)}
 validateFarmProgress(progress);return progress;
}
export function saveNeedsMigration(text){try{return !!readFarmSave(text).world}catch{return false}}
export function saveHasLegacyFarmProgress(text){try{const {world}=readFarmSave(text);return !!world&&Object.hasOwn(world,'progress')}catch{return false}}
export function validateSave(text){decodeFarmSave(text);return true}
export function parseSave(text){return restoreFarmProgress(decodeFarmSave(text))}
export function encodeFarmSave(world,data=captureFarmProgress(world)){
 validateFarmProgress(data);
 const text=JSON.stringify({schema:'budmori-farm',productVersion:PRODUCT_VERSION,progress:data});
 if(text.length>MAX_BYTES)throw Error('저장 파일이 너무 큽니다.');
 return{data,text};
}
