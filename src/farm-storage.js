import {restore} from './farm-state.js';
import {readFarmSave,decodeFarmSave,encodeFarmSave,isReadableCompatibility,saveHasLegacyFarmProgress,validateSave,parseSave} from './farm-save-codec.js';
export {saveHasLegacyFarmProgress,validateSave,parseSave};
const KEY='bloom-weapon-cards-v4',LEGACY_KEY='bloom-weapon-cards-v3';
const BACKUP_PREFIX='bloom-weapon-cards-legacy-backup-',BACKUP_LATEST='bloom-weapon-cards-legacy-backup-latest';
function readLegacyBackup(){
 try{
  const preferred=localStorage.getItem(BACKUP_LATEST);
  if(preferred?.startsWith(BACKUP_PREFIX)){const raw=localStorage.getItem(preferred);if(raw)return{key:preferred,raw}}
  for(let i=localStorage.length-1;i>=0;i--){const key=localStorage.key(i);if(key?.startsWith(BACKUP_PREFIX)){const raw=localStorage.getItem(key);if(raw)return{key,raw}}}
 }catch{}
 return null;
}
function preserveLegacySave(text){
 if(!saveHasLegacyFarmProgress(text))return null;
 const digest=Array.from(text).reduce((hash,char)=>Math.imul(hash^char.charCodeAt(0),16777619),2166136261)>>>0;
 let key=BACKUP_PREFIX+digest.toString(16).padStart(8,'0'),suffix=0;
 while(localStorage.getItem(key)!==null&&localStorage.getItem(key)!==text)key=BACKUP_PREFIX+digest.toString(16).padStart(8,'0')+'-'+(++suffix);
 localStorage.setItem(key,text);
 try{localStorage.setItem(BACKUP_LATEST,key)}catch{/* The raw backup remains discoverable by prefix. */}
 return{key,raw:text};
}
export class FarmStorage{
 constructor(){
  this.raw=null;this._world=null;this.savedSnapshot=null;this.error='';this.writable=false;this.legacyRaw=null;this.legacyCompatible=false;this.legacyBackupRequired=false;
  this.legacyBackup=readLegacyBackup();this.migrationNotice='';
  try{
   this.raw=localStorage.getItem(KEY);this.legacyRaw=localStorage.getItem(LEGACY_KEY);
   if(this.raw){
    if(!isReadableCompatibility(readFarmSave(this.raw).productVersion))throw Error('현재 저장은 호환되지 않는 버전입니다. 원본 키는 그대로 보존했어요.');
    if(saveHasLegacyFarmProgress(this.raw)){
     this.legacyBackupRequired=true;
     try{this.legacyBackup=preserveLegacySave(this.raw);this.legacyBackupRequired=false;this.migrationNotice='이전 활동 기반 강화가 종료되고 경험치 포인트로 통합됐어요. 기존 무료 강화는 초기화되며, 원본 저장은 별도 백업했어요.'}
     catch{throw Error('이전 저장 원본을 백업하지 못해 덮어쓰지 않았어요. 저장 공간을 비우거나 저장 파일을 내보낸 뒤 다시 시도해 주세요.')}
    }
    this.savedSnapshot=decodeFarmSave(this.raw);
   }else if(this.legacyRaw){try{validateSave(this.legacyRaw);this.legacyCompatible=true}catch(e){this.error=e.message}}
   this.writable=true;
  }catch(e){this.error=e.message}
 }
 get world(){if(!this._world&&this.savedSnapshot)this._world=restore(this.savedSnapshot);return this._world}
 get hasWorld(){return !!(this._world||this.savedSnapshot)}
 get hasReservedRaid(){const world=this._world||this.savedSnapshot;return world?.activeRaidRunSequence!==null&&world?.activeRaidRunSequence!==undefined}
 set world(value){this._world=value;this.savedSnapshot=null}
 serializeCheckpoint(world){return encodeFarmSave(world)}
 encode(world){return this.serializeCheckpoint(world).text}
 refresh(){
  if(!this.writable)return false;
  try{
   const text=localStorage.getItem(KEY);if(text===this.raw)return true;if(!text)throw Error('농장 저장을 찾지 못했어요. 다른 탭에서 새 정원을 시작했을 수 있어요.');
   if(saveHasLegacyFarmProgress(text)){this.legacyBackupRequired=true;this.legacyBackup=preserveLegacySave(text);this.legacyBackupRequired=false;this.migrationNotice='이전 활동 기반 강화가 종료되고 경험치 포인트로 통합됐어요. 기존 무료 강화는 초기화되며, 원본 저장은 별도 백업했어요.'}
   const data=decodeFarmSave(text);this.raw=text;this.savedSnapshot=data;this._world=null;this.error='';return true;
  }catch(e){this.error=this.legacyBackupRequired?'이전 저장 원본을 백업하지 못해 덮어쓰지 않았어요. 저장 공간을 비우거나 저장 파일을 내보낸 뒤 다시 시도해 주세요.':e.message||'저장을 다시 읽지 못했어요.';return false}
 }
 save(world){
  if(!this.writable||this.legacyBackupRequired)return false;
  try{
   if(localStorage.getItem(KEY)!==this.raw){this.error='저장 내용이 다른 탭에서 바뀌었어요. 이 탭을 새로고침해 이어가 주세요.';return false}
   const {data,text}=this.serializeCheckpoint(world);localStorage.setItem(KEY,text);this.raw=text;this.savedSnapshot=data;this._world=null;this.error='';return true;
  }catch{this.error='저장 공간을 사용할 수 없어요. 기존 저장은 보존했어요. 저장 내보내기로 보관해 주세요.';return false}
 }
 replace(world){if(this.legacyBackupRequired)return false;this.writable=true;this.world=world;return this.save(world)}
 import(text){
  if(this.legacyBackupRequired)throw Error('이전 저장 원본을 백업하지 못해 불러오기를 취소했어요. 기존 저장은 그대로입니다.');
  if(localStorage.getItem(KEY)!==this.raw)throw Error('저장 내용이 다른 탭에서 바뀌었어요. 새로고침한 뒤 다시 불러와 주세요.');
  validateSave(text);
  if(saveHasLegacyFarmProgress(text)){
   this.legacyBackupRequired=true;
   try{this.legacyBackup=preserveLegacySave(text);this.legacyBackupRequired=false}
   catch{throw Error('이전 저장 원본을 백업하지 못해 불러오기를 취소했어요. 기존 저장은 그대로입니다.')}
   this.migrationNotice='이전 활동 기반 강화가 종료되고 경험치 포인트로 통합됐어요. 기존 무료 강화는 초기화되며, 원본 저장은 별도 백업했어요.';
  }
  const world=parseSave(text),{data,text:normalized}=this.serializeCheckpoint(world);localStorage.setItem(KEY,normalized);this.raw=normalized;this.savedSnapshot=data;this._world=world;this.writable=true;this.error='';return world;
 }
}
