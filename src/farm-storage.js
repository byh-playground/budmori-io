import {PRODUCT_VERSION,COMPATIBILITY} from './version.js';
import {snapshot,restore,normalizeSnapshot,validateSnapshot} from './farm-state.js';
const KEY='bloom-weapon-cards-v4',LEGACY_KEY='bloom-weapon-cards-v3',MAX_BYTES=2*1024*1024;
const READ_COMPATIBILITIES=new Set([COMPATIBILITY,'0.5','0.4']);
const legacyCompatibility=version=>typeof version==='string'?version.split('.').slice(0,2).join('.'):'';
const isReadableCompatibility=version=>READ_COMPATIBILITIES.has(legacyCompatibility(version));
function saveWorld(text){if(typeof text!=='string'||text.length>MAX_BYTES)throw Error('저장 파일이 너무 큽니다.');const data=JSON.parse(text);if(data.schema!=='budmori-farm'||!isReadableCompatibility(data.productVersion))throw Error('이 저장은 현재 '+COMPATIBILITY+' 버전과 호환되지 않습니다. 원본을 내보내 보관한 뒤 새 정원을 시작해 주세요.');return data.world}
export function validateSave(text){validateSnapshot(normalizeSnapshot(saveWorld(text),{migrateLegacyRaid:true}));return true}
export function parseSave(text){return restore(saveWorld(text),{migrateLegacyRaid:true})}
export class FarmStorage{
 constructor(){this.raw=null;this._world=null;this.savedSnapshot=null;this.error='';this.writable=false;this.legacyRaw=null;this.legacyCompatible=false;try{this.raw=localStorage.getItem(KEY);this.legacyRaw=localStorage.getItem(LEGACY_KEY);if(this.raw){if(!isReadableCompatibility(JSON.parse(this.raw).productVersion))throw Error('현재 저장은 호환되지 않는 버전입니다. 원본 키는 그대로 보존했어요.');this.world=parseSave(this.raw)}else if(this.legacyRaw){try{validateSave(this.legacyRaw);this.legacyCompatible=true}catch(e){this.error=e.message}}this.writable=true}catch(e){this.error=e.message}}
 get world(){if(!this._world&&this.savedSnapshot)this._world=restore(this.savedSnapshot);return this._world}
 get hasWorld(){return !!(this._world||this.savedSnapshot)}
 get hasReservedRaid(){const world=this._world||this.savedSnapshot;return world?.activeRaidRunSequence!==null&&world?.activeRaidRunSequence!==undefined}
 set world(value){this._world=value;this.savedSnapshot=null}
 serializeCheckpoint(world){const data=normalizeSnapshot(snapshot(world),{clone:false});validateSnapshot(data);const text=JSON.stringify({schema:'budmori-farm',productVersion:PRODUCT_VERSION,world:data});if(text.length>MAX_BYTES)throw Error('저장 파일이 너무 큽니다.');return{data,text}}
 encode(world){return this.serializeCheckpoint(world).text}
 refresh(){if(!this.writable)return false;try{const text=localStorage.getItem(KEY);if(text===this.raw)return true;if(!text)throw Error('농장 저장을 찾지 못했어요. 다른 탭에서 새 정원을 시작했을 수 있어요.');const world=parseSave(text);this.raw=text;this.world=world;this.error='';return true}catch(e){this.error=e.message||'저장을 다시 읽지 못했어요.';return false}}
 save(world){if(!this.writable)return false;try{if(localStorage.getItem(KEY)!==this.raw){this.error='저장 내용이 다른 탭에서 바뀌었어요. 이 탭을 새로고침해 이어가 주세요.';return false}const {data,text}=this.serializeCheckpoint(world);localStorage.setItem(KEY,text);this.raw=text;this.savedSnapshot=data;this._world=null;this.error='';return true}catch{this.error='저장 공간을 사용할 수 없어요. 기존 저장은 보존했어요. 저장 내보내기로 보관해 주세요.';return false}}
 replace(world){this.writable=true;this.world=world;return this.save(world)}
 import(text){if(localStorage.getItem(KEY)!==this.raw)throw Error('저장 내용이 다른 탭에서 바뀌었어요. 새로고침한 뒤 다시 불러와 주세요.');const world=parseSave(text),{data,text:normalized}=this.serializeCheckpoint(world);localStorage.setItem(KEY,normalized);this.raw=normalized;this.savedSnapshot=data;this._world=world;this.writable=true;this.error='';return world}
}
