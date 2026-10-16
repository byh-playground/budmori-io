import {PRODUCT_VERSION,COMPATIBILITY} from './version.js';
import {snapshot,restore} from './farm-state.js';
const KEY='bloom-weapon-cards-v4',LEGACY_KEY='bloom-weapon-cards-v3',MAX_BYTES=2*1024*1024;
const READ_COMPATIBILITIES=new Set([COMPATIBILITY,'0.4']);
const legacyCompatibility=version=>typeof version==='string'?version.split('.').slice(0,2).join('.'):'';
export function parseSave(text){if(typeof text!=='string'||text.length>MAX_BYTES)throw Error('저장 파일이 너무 큽니다.');const data=JSON.parse(text);if(data.schema!=='budmori-farm'||!READ_COMPATIBILITIES.has(legacyCompatibility(data.productVersion)))throw Error('이 저장은 현재 '+COMPATIBILITY+' 버전과 호환되지 않습니다. 원본을 내보내 보관한 뒤 새 정원을 시작해 주세요.');return restore(data.world,{migrateLegacyRaid:true})}
export class FarmStorage{
 constructor(){this.raw=null;this.world=null;this.error='';this.writable=false;this.legacyRaw=null;this.legacyCompatible=false;try{this.raw=localStorage.getItem(KEY);this.legacyRaw=localStorage.getItem(LEGACY_KEY);if(this.raw){if(legacyCompatibility(JSON.parse(this.raw).productVersion)!==COMPATIBILITY)throw Error('현재 저장은 다른 0.5 버전과 호환되지 않습니다. 원본 키는 그대로 보존했어요.');this.world=parseSave(this.raw)}else if(this.legacyRaw){try{parseSave(this.legacyRaw);this.legacyCompatible=true}catch(e){this.error=e.message}}this.writable=true}catch(e){this.error=e.message}}
 encode(world){const data=snapshot(world);return JSON.stringify({schema:'budmori-farm',productVersion:PRODUCT_VERSION,world:data})}
 save(world){if(!this.writable)return false;try{if(localStorage.getItem(KEY)!==this.raw){this.error='저장 내용이 다른 탭에서 바뀌었어요. 이 탭을 새로고침해 이어가 주세요.';return false}const text=this.encode(world);const verified=restore(JSON.parse(text).world);localStorage.setItem(KEY,text);this.raw=text;this.world=verified;this.error='';return true}catch{this.error='저장 공간을 사용할 수 없어요. 기존 저장은 보존했어요. 저장 내보내기로 보관해 주세요.';return false}}
 replace(world){this.writable=true;this.world=world;return this.save(world)}
 import(text){if(localStorage.getItem(KEY)!==this.raw)throw Error('저장 내용이 다른 탭에서 바뀌었어요. 새로고침한 뒤 다시 불러와 주세요.');const world=parseSave(text),normalized=this.encode(world);restore(JSON.parse(normalized).world);localStorage.setItem(KEY,normalized);this.raw=normalized;this.world=world;this.writable=true;this.error='';return world}
}
