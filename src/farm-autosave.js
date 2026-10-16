export const FARM_AUTOSAVE_DEBOUNCE_MS=1000;
export const FARM_AUTOSAVE_MAX_WAIT_MS=10000;

// Farm-specific trailing debounce with a bounded checkpoint interval. It only
// writes when the simulation has marked authoritative Farm state as changed.
export class FarmAutosave{
 constructor(save,{debounceMs=FARM_AUTOSAVE_DEBOUNCE_MS,maxWaitMs=FARM_AUTOSAVE_MAX_WAIT_MS,now=()=>globalThis.performance.now(),setTimer=(fn,delay)=>globalThis.setTimeout(fn,delay),clearTimer=id=>globalThis.clearTimeout(id)}={}){
  this.save=save;this.debounceMs=debounceMs;this.maxWaitMs=maxWaitMs;this.now=now;this.setTimer=setTimer;this.clearTimer=clearTimer;this.timer=null;this.dirty=false;this.dirtySince=0;
 }
 markDirty(){
  const now=this.now();if(!this.dirty){this.dirty=true;this.dirtySince=now}
  if(this.timer!==null)this.clearTimer(this.timer);
  const remaining=Math.max(0,this.maxWaitMs-(now-this.dirtySince));
  this.timer=this.setTimer(()=>{this.timer=null;this.flush()},Math.min(this.debounceMs,remaining));
 }
 flush(){
  this.cancelTimer();if(!this.dirty)return true;
  let saved=false;try{saved=this.save()!==false}catch{saved=false}
  if(saved)this.reset();else this.dirtySince=this.now();
  return saved;
 }
 reset(){this.cancelTimer();this.dirty=false;this.dirtySince=0}
 cancelTimer(){if(this.timer!==null){this.clearTimer(this.timer);this.timer=null}}
}
