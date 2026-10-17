import {PRODUCT_VERSION,COMPATIBILITY} from './version.js';
import {snapshot,restore,normalizeSnapshot,validateSnapshot} from './farm-state.js';
const MAX_BYTES=2*1024*1024;
// Main-product compatibility remains the only format version: no new schema
// number is needed for an unchanged wire layout and supported legacy fields.
const READ_COMPATIBILITIES=new Set([COMPATIBILITY,'0.6','0.5','0.4']);
const legacyCompatibility=version=>typeof version==='string'?version.split('.').slice(0,2).join('.') : '';
export const isReadableCompatibility=version=>READ_COMPATIBILITIES.has(legacyCompatibility(version));
export function readFarmSave(text){
 if(typeof text!=='string'||text.length>MAX_BYTES)throw Error('저장 파일이 너무 큽니다.');
 const parsed=JSON.parse(text);
 if(parsed.schema!=='budmori-farm'||!isReadableCompatibility(parsed.productVersion)||!parsed.world||typeof parsed.world!=='object'||Array.isArray(parsed.world))throw Error('이 저장은 현재 '+COMPATIBILITY+' 버전과 호환되지 않습니다. 원본을 내보내 보관한 뒤 새 정원을 시작해 주세요.');
 return parsed;
}
export function decodeFarmSave(text){
 const parsed=readFarmSave(text),world=normalizeSnapshot(parsed.world,{migrateLegacyRaid:true});
 validateSnapshot(world);
 return world;
}
export function saveHasLegacyFarmProgress(text){
 try{return Object.hasOwn(readFarmSave(text).world,'progress')}
 catch{return false}
}
export function validateSave(text){decodeFarmSave(text);return true}
export function parseSave(text){return restore(readFarmSave(text).world,{migrateLegacyRaid:true})}

export function encodeFarmSave(world){
 const data=normalizeSnapshot(snapshot(world),{clone:false});
 validateSnapshot(data);
 const text=JSON.stringify({schema:'budmori-farm',productVersion:PRODUCT_VERSION,world:data});
 if(text.length>MAX_BYTES)throw Error('저장 파일이 너무 큽니다.');
 return {data,text};
}
