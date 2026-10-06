// Test-server/native-fixture injection only. Never embedded in shipped HTML.
module.exports=`globalThis.__budmoriTest={async request(type,m={}){
 if(type==='__read')return (0,eval)(m.expression);
 if(type==='__fixture'){
  clearTimeout(timer);timer=null;bloomLoop?.stop();bloomSession.close();globalThis.BLOOM_MAIN_TEST_MANUAL=true;
  (0,eval)(m.source);rebuildGrid();spatialBoundary();boundary();playing=true;paused=false;modalKind='';
  if(!bloomAdapter.validateSnapshot(bloomAdapter.save(),{tick:bloomTick}))throw new Error('Invalid stopped-session fixture');
  if(booted)resetPresentation();return true;
 }
 if(type==='__clock'){globalThis.BLOOM_MAIN_TEST_MANUAL=!!m.manual;clearTimeout(timer);timer=null;wasActive=false;bloomLoop.resetTiming();controls();return true}
 if(type==='__breakSession'){bloomStartDriver=()=>{bloomSession.close();throw Error('Controlled session recreation failure')};return true}
 if(type==='init')return runtime.initialize(m);
 if(type==='testTicks'){for(let i=0;i<m.count;i++){const start=performance.now();afterAdvance(bloomSession.advance(bloomEncodeInput({...inputOverride||moaRollCore.sampleSimulationInput(),suspended:paused||!playing||!!modalKind})),start)}return{tick:bloomTick,time:state.time}}
 if(type==='control'){playing=!!m.playing;paused=!!m.paused;modalKind=String(m.modalKind||'');inputOverride=m.input||null;controls();return true}
 if(type==='command'){bloomQueue(m.command.type,Object.fromEntries(Object.entries(m.command).filter(([k])=>k!=='type'&&k!=='version')));return true}
 if(type==='snapshot'||type==='save')return snapshot(type);
 if(type==='reset'){reset();return true}
 if(type==='load')return load(m.disk);
 if(type==='rate')return bloomSetTickRate(m.tickRate);
 if(type==='inspect')return inspect();
 if(type==='close'){runtime.close();return true}
 throw new Error('Unknown test request: '+type);
}};`;
