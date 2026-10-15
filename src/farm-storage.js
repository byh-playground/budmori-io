import {PRODUCT_VERSION,COMPATIBILITY} from './version.js';
import {snapshot,restore} from './farm-state.js';
const KEY='bloom-weapon-cards-v3',MAX_BYTES=2*1024*1024;
export function parseSave(text){if(typeof text!=='string'||text.length>MAX_BYTES)throw Error('저장 파일이 너무 큽니다.');const data=JSON.parse(text);if(data.schema!=='budmori-farm'||typeof data.productVersion!=='string'||data.productVersion.split('.').slice(0,2).join('.')!==COMPATIBILITY)throw Error('이 저장은 현재 '+COMPATIBILITY+' 버전과 호환되지 않습니다. 원본을 내보내 보관한 뒤 새 정원을 시작해 주세요.');return restore(data.world,{migrateLegacyRaid:true})}
export class FarmStorage{
 constructor(){this.raw=null;this.world=null;this.error='';this.writable=false;try{this.raw=localStorage.getItem(KEY);if(this.raw)this.world=parseSave(this.raw);this.writable=true}catch(e){this.error=e.message}}
 encode(world){const data=snapshot(world);return JSON.stringify({schema:'budmori-farm',productVersion:PRODUCT_VERSION,world:data})}
 save(world){if(!this.writable)return false;try{const text=this.encode(world);const verified=restore(JSON.parse(text).world);localStorage.setItem(KEY,text);this.raw=text;this.world=verified;this.error='';return true}catch{this.error='저장 공간을 사용할 수 없어요. 저장 내보내기로 보관해 주세요.';return false}}
 replace(world){this.writable=true;this.world=world;return this.save(world)}
 import(text){const world=parseSave(text),normalized=this.encode(world);restore(JSON.parse(normalized).world);localStorage.setItem(KEY,normalized);this.raw=normalized;this.world=world;this.writable=true;this.error='';return world}
}
