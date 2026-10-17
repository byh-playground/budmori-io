export const FARM_AUTOSAVE_DEBOUNCE_MS=1000;
export const FARM_AUTOSAVE_MAX_WAIT_MS=10000;

// Farm-specific trailing debounce with a bounded checkpoint interval. It only
// writes when a progress event (not a movement/display tick) marks the Farm.
export class FarmAutosave{
 constructor(save,{debounceMs=FARM_AUTOSAVE_DEBOUNCE_MS,maxWaitMs=FARM_AUTOSAVE_MAX_WAIT_MS,now=()=>globalThis.performance.now(),setTimer=(fn,delay)=>globalThis.setTimeout(fn,delay),clearTimer=id=>globalThis.clearTimeout(id)}={}){
  this.save=save;this.debounceMs=debounceMs;this.maxWaitMs=maxWaitMs;this.now=now;this.setTimer=setTimer;this.clearTimer=clearTimer;this.timer=null;this.dirty=false;this.dirtySince=0;this.deadline=0;this.timerDeadline=0;
  this.onTimer=()=>{this.timer=null;const remaining=this.deadline-this.now();if(remaining>0)this.schedule(remaining);else this.flush()};
 }
 markDirty(){
  const now=this.now();if(!this.dirty){this.dirty=true;this.dirtySince=now}
  const remaining=Math.max(0,this.maxWaitMs-(now-this.dirtySince));
  this.deadline=now+Math.min(this.debounceMs,remaining);
  // Keep the existing wake-up while changes extend the trailing deadline.
  // It checks the latest deadline instead of replacing a timer every sim tick.
  if(this.timer===null||this.deadline<this.timerDeadline){this.cancelTimer();this.schedule(Math.max(0,this.deadline-now))}
 }
 flush(){
  this.cancelTimer();if(!this.dirty)return true;
  let saved=false;try{saved=this.save()!==false}catch{saved=false}
  if(saved)this.reset();else this.dirtySince=this.now();
  return saved;
 }
 schedule(delay){this.timerDeadline=this.now()+delay;this.timer=this.setTimer(this.onTimer,delay)}
 reset(){this.cancelTimer();this.dirty=false;this.dirtySince=0;this.deadline=0;this.timerDeadline=0}
 cancelTimer(){if(this.timer!==null){this.clearTimer(this.timer);this.timer=null}}
}
