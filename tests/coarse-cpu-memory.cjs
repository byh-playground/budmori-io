'use strict';
/**
 * Isolated actual-engine CPU / sampled-allocation / retained-memory profiler.
 * Run one lane per process, sequentially, with no other benchmark running:
 *   node --expose-gc tests/coarse-cpu-memory.cjs --mode baseline --out-prefix tests/profiles/baseline
 *   node --expose-gc tests/coarse-cpu-memory.cjs --mode coarse --cell 128 --out-prefix tests/profiles/coarse128
 *   node tests/coarse-cpu-memory.cjs --compare tests/profiles/baseline.json tests/profiles/coarse128.json --out-prefix tests/profiles/comparison
 *
 * This profiles the actual 5-human x 1,000-army separated fixture and complete
 * moving adapter steps. It is not a browser/render/network/FPS measurement.
 * HeapProfiler is statistical: reported allocation bytes are estimates, not an
 * exact allocation counter. Without include-collected support it primarily
 * describes sampled surviving allocations. Heap peaks are observed only at
 * tick boundaries. Inspector and instrumentation add measurement overhead.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const inspector = require('node:inspector');
const vm = require('node:vm');
const v8 = require('node:v8');
const {performance, PerformanceObserver, constants} = require('node:perf_hooks');

const HELP = `Usage:
  node --expose-gc tests/coarse-cpu-memory.cjs [options]
  node tests/coarse-cpu-memory.cjs --compare BASELINE.json CANDIDATE.json [--out-prefix PREFIX]

Options:
  --quality-only REPORT.json             Replay final quality, no CPU/heap profile
  --mode baseline|coarse|global|grid|query  Default: baseline
  --cell N                              Default: 128 (baseline is unmodified)
  --warm N                              Moving warm-up ticks, default: 20
  --ticks N                             Profiled moving ticks, default: 60
  --exact true|false                    Candidate narrowphase, default: false
  --source PATH                         Default: index.html next to tests/
  --out-prefix PATH                     Default: tests/profiles/coarse-cpu-MODE-CELL
  --cpu-interval-us N                   CPU sampling interval, default: 1000
  --heap-interval-bytes N               Allocation sampling interval, default: 32768
  --top N                              Hotspot rows per phase, default: 40
  --help                               No engine is created or benchmark run

Artifacts: PREFIX.json, PREFIX.setup.cpuprofile, PREFIX.steady.cpuprofile,
           PREFIX.setup.heapprofile, PREFIX.steady.heapprofile.
Heap files are statistical V8 allocation profiles. CPU files open in DevTools.
Use separate, sequential processes for lane comparisons. --expose-gc enables
forced-GC retained-heap comparison; its absence is explicitly reported.
`;
function parseArgs(argv) {
  const args = {mode:'baseline', cell:128, warm:20, ticks:60, exact:false, top:40,
    source:path.resolve(__dirname,'../index.html'), cpuIntervalUs:1000, heapIntervalBytes:32768};
  const numeric = {'--cell':'cell','--warm':'warm','--ticks':'ticks','--top':'top',
    '--cpu-interval-us':'cpuIntervalUs','--heap-interval-bytes':'heapIntervalBytes'};
  for (let i=0;i<argv.length;i++) {
    const flag=argv[i];
    if(flag==='--help'||flag==='-h'){args.help=true;continue;}
    if(flag==='--quality-only'){args.qualityOnly=path.resolve(argv[++i]);continue;}
    if(flag==='--compare') { if(i+2>=argv.length)throw Error('--compare needs two report paths');args.compare=[argv[++i],argv[++i]];continue; }
    if(numeric[flag]) { args[numeric[flag]]=Number(argv[++i]);continue; }
    if(flag==='--mode') { args.mode=argv[++i];continue; }
    if(flag==='--source') { args.source=path.resolve(argv[++i]);continue; }
    if(flag==='--out-prefix') { args.outPrefix=path.resolve(argv[++i]);continue; }
    if(flag==='--exact') { const value=argv[++i];if(!['true','false'].includes(value))throw Error('--exact must be true or false');args.exact=value==='true';continue; }
    throw Error('Unknown option: '+flag);
  }
  if(!['baseline','coarse','global','grid','query'].includes(args.mode))throw Error('Invalid mode');
  for(const key of ['cell','ticks','top','cpuIntervalUs','heapIntervalBytes'])if(!Number.isSafeInteger(args[key])||args[key]<=0)throw Error('Invalid '+key);
  if(!Number.isSafeInteger(args.warm)||args.warm<0)throw Error('Invalid warm');
  if(!args.outPrefix&&args.qualityOnly)args.outPrefix=args.qualityOnly.replace(/\.json$/,'');
  if(!args.outPrefix)args.outPrefix=path.join(__dirname,'profiles',args.compare?'coarse-cpu-comparison':`coarse-cpu-${args.mode}-${args.cell}`);
  return args;
}
const sha = source => crypto.createHash('sha256').update(source).digest('hex');
function summary(values) {
  const sorted=Array.from(values).sort((a,b)=>a-b),n=sorted.length;
  if(!n)return{count:0};
  const quantile=q=>sorted[Math.min(n-1,Math.floor((n-1)*q))];
  return{count:n,min:sorted[0],p50:quantile(.5),p90:quantile(.9),p95:quantile(.95),max:sorted[n-1],mean:sorted.reduce((a,b)=>a+b,0)/n};
}
function location(frame={}) {
  return {functionName:frame.functionName||'(anonymous)',url:frame.url||'',line:(frame.lineNumber??-1)+1,column:(frame.columnNumber??-1)+1};
}
function keyFor(frame) { return JSON.stringify([frame.functionName,frame.url,frame.line,frame.column]); }
function cpuSummary(profile,top) {
  const nodes=new Map(profile.nodes.map(n=>[n.id,n])),self=new Map(),inclusive=new Map(),rows=new Map();
  const samples=profile.samples||[],deltas=profile.timeDeltas||[];
  const fallback=samples.length?(profile.endTime-profile.startTime)/samples.length:0;
  let sampledMs=0;
  for(let i=0;i<samples.length;i++){const ms=(deltas[i]??fallback)/1000;self.set(samples[i],(self.get(samples[i])||0)+ms);sampledMs+=ms;}
  function visit(id){if(inclusive.has(id))return inclusive.get(id);const node=nodes.get(id);let total=self.get(id)||0;for(const child of node?.children||[])total+=visit(child);inclusive.set(id,total);return total;}
  for(const node of profile.nodes) {
    const frame=location(node.callFrame),key=keyFor(frame);let row=rows.get(key);
    if(!row){row={...frame,selfMs:0,inclusiveMs:0,hitCount:0};rows.set(key,row);}
    row.selfMs+=self.get(node.id)||0;row.inclusiveMs+=visit(node.id);row.hitCount+=node.hitCount||0;
  }
  for(const row of rows.values())row.selfPercent=sampledMs?row.selfMs/sampledMs*100:0;
  return {durationMs:(profile.endTime-profile.startTime)/1000,sampledMs,sampleCount:samples.length,nodeCount:profile.nodes.length,
    topSelf:Array.from(rows.values()).sort((a,b)=>b.selfMs-a.selfMs).slice(0,top),
    topInclusive:Array.from(rows.values()).sort((a,b)=>b.inclusiveMs-a.inclusiveMs).slice(0,top),
    note:'Self time is attributed CPU samples. Inclusive rows can overlap and recursive locations can exceed wall time.'};
}
function allocationSummary(profile,top) {
  const rows=new Map();let nodeCount=0,total=0;
  function visit(node) {
    nodeCount++;const own=node.selfSize||0;let inclusive=own;total+=own;
    for(const child of node.children||[])inclusive+=visit(child);
    const frame=location(node.callFrame),key=keyFor(frame);let row=rows.get(key);
    if(!row){row={...frame,estimatedSelfBytes:0,estimatedInclusiveBytes:0};rows.set(key,row);}
    row.estimatedSelfBytes+=own;row.estimatedInclusiveBytes+=inclusive;return inclusive;
  }
  visit(profile.head);
  for(const row of rows.values())row.estimatedSelfPercent=total?row.estimatedSelfBytes/total*100:0;
  return {estimatedAllocationBytes:total,sampleCount:(profile.samples||[]).length,nodeCount,
    topSelf:Array.from(rows.values()).sort((a,b)=>b.estimatedSelfBytes-a.estimatedSelfBytes).slice(0,top),
    topInclusive:Array.from(rows.values()).sort((a,b)=>b.estimatedInclusiveBytes-a.estimatedInclusiveBytes).slice(0,top),
    note:'Statistical sampled allocation estimates, not exact bytes or object counts. Collection-support metadata determines whether collected allocations are included.'};
}
function memory() {
  return {...process.memoryUsage(),heapSpaces:v8.getHeapSpaceStatistics().map(s=>({name:s.space_name,usedBytes:s.space_used_size,sizeBytes:s.space_size}))};
}
const nextTurn=()=>new Promise(resolve=>setImmediate(resolve));
async function retainedMemory() {
  await nextTurn();
  if(typeof global.gc==='function'){global.gc();await nextTurn();global.gc();await nextTurn();}
  return memory();
}
function difference(after,before) {
  return Object.fromEntries(['heapUsed','heapTotal','rss','external','arrayBuffers'].map(key=>[key,after[key]-before[key]]));
}
function gcSummary(events,start,end,available) {
  const selected=events.filter(e=>e.startTime>=start&&e.startTime<end),byKind={};
  for(const event of selected){const name=event.kind===constants.NODE_PERFORMANCE_GC_MAJOR?'major':event.kind===constants.NODE_PERFORMANCE_GC_MINOR?'minor':event.kind===constants.NODE_PERFORMANCE_GC_INCREMENTAL?'incremental':event.kind===constants.NODE_PERFORMANCE_GC_WEAKCB?'weakCallback':'other';const group=byKind[name]||(byKind[name]={count:0,durationMs:0});group.count++;group.durationMs+=event.duration;}
  return{available,count:selected.length,durationMs:selected.reduce((n,e)=>n+e.duration,0),byKind,
    note:'PerformanceObserver GC entries whose start time falls inside workload boundaries; forced post-workload GC excluded.'};
}
function writeJSON(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');}

function measureContactQuality(world,args) {
    world.c.profileQualityFactory=require('./coarse-pair-enumerator.cjs').createCoarsePairEnumerator.toString();
    const contactQuality=world.json(`(()=>{
      const enumerate=eval('('+profileQualityFactory+')')({mode:'coarse',exact:true,instrument:false});
      const r=enumerate.enumerate(state.units,moaBodyRadius,u=>unitDef(u.type).layer==='AIR',128),depths=[],normalized=[],neighbors=new Uint32Array(r.bodies.length);
      let sumDepth=0,sumNormalized=0,maxDepth=0,maxNormalized=0,samePlayerPairs=0,crossPlayerPairs=0,unownedPairs=0,over25Percent=0,over50Percent=0;
      for(const p of r.pairs){const i=Math.floor(p/r.stride),j=p-i*r.stride,a=r.bodies[i],b=r.bodies[j],limit=r.radii[i]+r.radii[j],depth=Math.max(0,limit-Math.hypot(a.x-b.x,a.y-b.y)),fraction=limit?depth/limit:0;
        sumDepth+=depth;sumNormalized+=fraction;maxDepth=Math.max(maxDepth,depth);maxNormalized=Math.max(maxNormalized,fraction);depths.push(depth);normalized.push(fraction);neighbors[i]++;neighbors[j]++;
        if(a.playerId&&b.playerId){if(a.playerId===b.playerId)samePlayerPairs++;else crossPlayerPairs++;}else unownedPairs++;
        if(fraction>.25)over25Percent++;if(fraction>.5)over50Percent++;
      }
      depths.sort((a,b)=>a-b);normalized.sort((a,b)=>a-b);let bodiesOverlapping=0,maxNeighbors=0;for(const n of neighbors){if(n)bodiesOverlapping++;maxNeighbors=Math.max(maxNeighbors,n);}
      const quantile=(xs,q)=>xs.length?xs[Math.floor((xs.length-1)*q)]:0;
      return{tick:bloomTick,liveBodies:r.bodies.length,exactOverlapCount:r.pairs.length,bodiesOverlapping,maxOverlapNeighbors:maxNeighbors,meanDepth:r.pairs.length?sumDepth/r.pairs.length:0,maxDepth,p50Depth:quantile(depths,.5),p95Depth:quantile(depths,.95),meanNormalizedDepth:r.pairs.length?sumNormalized/r.pairs.length:0,maxNormalizedDepth:maxNormalized,p95NormalizedDepth:quantile(normalized,.95),over25Percent,over50Percent,samePlayerPairs,crossPlayerPairs,unownedPairs};
    })()`);
    contactQuality.movingTicks=args.warm+args.ticks;contactQuality.movementDurationSeconds=(args.warm+args.ticks)/10;
    contactQuality.method='Complete uncapped strict circle overlap enumeration on final positions, same AIR/non-AIR grouping and current moaBodyRadius. Depth is radius sum minus center distance; normalized depth divides by radius sum. Troops/resident included; human leaders excluded. Read-only and outside all measured CPU/allocation/retained regions.';
    delete world.c.profileQualityFactory;
    contactQuality.finalStateHash=world.run('BloomOwnedSDK.hashBytes(bloomAdapter.save())');
    return contactQuality;
}

async function profile(args) {
  const {engine}=require('./native-engine.cjs'),{setup}=require('./coarse-fixture.cjs'),{candidate}=require('./coarse-live-candidate.cjs');
  const source=fs.readFileSync(args.source,'utf8');
  const sourceSHA=sha(source),dependencySHA={};
  for(const file of ['native-engine.cjs','coarse-fixture.cjs','coarse-live-candidate.cjs','coarse-pair-enumerator.cjs'])dependencySHA[file]=sha(fs.readFileSync(path.join(__dirname,file)));
  if(args.mode==='query')dependencySHA['batched-grid-candidate.cjs']=sha(fs.readFileSync(path.join(__dirname,'batched-grid-candidate.cjs')));
  const session=new inspector.Session();session.connect();
  const post=(method,params={})=>new Promise((resolve,reject)=>session.post(method,params,(error,result)=>error?reject(error):resolve(result)));
  const events=[],gcAvailable=PerformanceObserver.supportedEntryTypes.includes('gc');
  const observer=gcAvailable?new PerformanceObserver(list=>{for(const e of list.getEntries())events.push({startTime:e.startTime,duration:e.duration,kind:e.detail?.kind??e.kind,flags:e.detail?.flags??e.flags});}):null;
  if(observer)observer.observe({entryTypes:['gc']});
  let world=null,fixture=null,html=null,stepScript=null,setupPhase=null,steadyPhase=null;
  let cpuActive=false,heapActive=false;
  async function capture(name,work) {
    let heapSampling={requestedIntervalBytes:args.heapIntervalBytes,includeCollectedRequested:true,includeCollectedParametersAccepted:false,available:true};
    await post('Profiler.start');cpuActive=true;
    try {
      await post('HeapProfiler.startSampling',{samplingInterval:args.heapIntervalBytes,includeObjectsCollectedByMajorGC:true,includeObjectsCollectedByMinorGC:true});
      heapActive=true;heapSampling.includeCollectedParametersAccepted=true;
    } catch(error) {
      heapSampling.fallbackReason=String(error.message||error);
      try{await post('HeapProfiler.startSampling',{samplingInterval:args.heapIntervalBytes});heapActive=true;}
      catch(fallback){heapSampling.available=false;heapSampling.error=String(fallback.message||fallback);}
    }
    const start=performance.now();
    const result=work();
    const end=performance.now(),endMemory=memory();
    let heapResult=null,cpuResult=null;
    if(heapActive){heapResult=await post('HeapProfiler.stopSampling');heapActive=false;}
    cpuResult=await post('Profiler.stop');cpuActive=false;
    const cpuFile=args.outPrefix+'.'+name+'.cpuprofile',heapFile=args.outPrefix+'.'+name+'.heapprofile';
    writeJSON(cpuFile,cpuResult.profile);
    if(heapResult)writeJSON(heapFile,heapResult.profile);
    const resultPhase={name,startTime:start,endTime:end,workloadMs:end-start,endMemory,cpu:cpuSummary(cpuResult.profile,args.top),
      allocations:heapResult?allocationSummary(heapResult.profile,args.top):null,heapSampling,
      artifacts:{cpuProfile:cpuFile,heapProfile:heapResult?heapFile:null},...result};
    cpuResult=null;heapResult=null;
    return resultPhase;
  }
  const counts=()=>world.json(`(()=>{const players=WorldPlayers.all();return{tick:bloomTick,units:state.units.length,liveUnits:state.units.reduce((n,u)=>n+(u.hp>0?1:0),0),humanLeaders:players.length,armyByPlayer:players.map(p=>({playerId:p.playerId,liveArmy:state.units.reduce((n,u)=>n+(u.hp>0&&u.playerId===p.playerId?1:0),0)}))}})()`);
  try {
    await post('Profiler.enable');await post('Profiler.setSamplingInterval',{interval:args.cpuIntervalUs});await post('HeapProfiler.enable');
    const beforeSetup=await retainedMemory();
    setupPhase=await capture('setup',()=>{
      html=args.mode==='baseline'?source:args.mode==='query'?require('./batched-grid-candidate.cjs').batchedGridCandidate(source,args.cell):candidate(source,{mode:args.mode,cell:args.cell,exact:args.exact,instrument:false,limit:8});
      world=engine(args.source,html);fixture=setup(world,1000,false);
      stepScript=new vm.Script('bloomAdapter.step({tick:bloomTick,tickRate:CONFIG.sim.tickRate,inputs:frames})',{filename:'coarse-profile-full-adapter-step.js'});
      return{};
    });
    const afterSetup=await retainedMemory(),initialCounts=counts();
    setupPhase.memory={before:beforeSetup,afterForcedGC:afterSetup,retainedDelta:difference(afterSetup,beforeSetup),forcedGC:typeof global.gc==='function'};
    const warmTimes=new Float64Array(args.warm),warmStart=performance.now();
    let warmPeak=afterSetup.heapUsed;
    for(let i=0;i<args.warm;i++){const t=performance.now();stepScript.runInContext(world.c);warmTimes[i]=performance.now()-t;warmPeak=Math.max(warmPeak,process.memoryUsage().heapUsed);}
    const warmEnd=performance.now(),warmEndMemory=memory();
    const beforeSteady=await retainedMemory(),preSteadyCounts=counts(),steadyTimes=new Float64Array(args.ticks);
    steadyPhase=await capture('steady',()=>{
      let peakHeapUsed=beforeSteady.heapUsed,peakRSS=beforeSteady.rss,peakExternal=beforeSteady.external;
      for(let i=0;i<args.ticks;i++) {
        const t=performance.now();stepScript.runInContext(world.c);steadyTimes[i]=performance.now()-t;
        const sample=process.memoryUsage();peakHeapUsed=Math.max(peakHeapUsed,sample.heapUsed);peakRSS=Math.max(peakRSS,sample.rss);peakExternal=Math.max(peakExternal,sample.external);
      }
      return{tickTimingMs:summary(steadyTimes),rawTickMs:Array.from(steadyTimes),peakObservedMemory:{heapUsed:peakHeapUsed,rss:peakRSS,external:peakExternal,samples:args.ticks+1,sampling:'Before steady work and after each complete adapter step; within-tick peaks may be missed.'}};
    });
    const afterSteady=await retainedMemory(),finalCounts=counts();
    steadyPhase.memory={before:beforeSteady,afterForcedGC:afterSteady,retainedDelta:difference(afterSteady,beforeSteady),forcedGC:typeof global.gc==='function'};
    steadyPhase.allocations && (steadyPhase.allocations.estimatedBytesPerTick=steadyPhase.allocations.estimatedAllocationBytes/args.ticks);
    const contactQuality=measureContactQuality(world,args);
    const validSnapshot=world.run('bloomAdapter.validateSnapshot(bloomAdapter.save(),{tick:bloomTick})');
    if(!validSnapshot)throw Error('Final actual-engine snapshot validation failed');
    await nextTurn();
    for(const phase of [setupPhase,steadyPhase])phase.gc=gcSummary(events,phase.startTime,phase.endTime,gcAvailable);
    const report={schema:'budmori-coarse-cpu-memory-v1',createdAt:new Date().toISOString(),mode:args.mode,cell:args.mode==='baseline'?fixture.cell:args.cell,
      sourcePath:args.source,sourceSHA,transformedSourceSHA:sha(html),dependencySHA,node:process.version,v8:process.versions.v8,platform:process.platform,arch:process.arch,
      config:{humans:5,armyPerPlayer:1000,clustered:false,seed:12345,tickRate:10,warmTicks:args.warm,profiledTicks:args.ticks,exact:args.mode==='baseline'?null:args.exact,candidateInstrumentation:false,cpuIntervalUs:args.cpuIntervalUs,heapIntervalBytes:args.heapIntervalBytes,forcedGC:typeof global.gc==='function'},
      fixture,actualCounts:{initial:initialCounts,preSteady:preSteadyCounts,final:finalCounts},contactQuality,finalStateHash:contactQuality.finalStateHash,validSnapshot,
      method:['One actual-engine realm in one isolated process. Five-human separated fixture; all adapter movement/grid/solver/terrain/projectile stages execute.',
        'Setup captures candidate-source construction, engine script compilation/initialization, army creation and initial grid setup. Module imports and reading the original HTML precede setup.',
        'Warmup is moving full adapter work without inspector sampling. Steady work uses a precompiled VM Script containing the unmodified complete adapter-step call.',
        'CPU and allocation sampling overlap. CPU profile files include inspector boundary overhead; workloadMs and tick timings have narrower explicit workload boundaries.',
        'Inspector allocations, engine caches, V8/JIT, the minimal harness and report metadata can affect retained memory; use independent processes and inspect attribution.',
        'Forced-GC snapshots occur after raw profile artifacts and summary creation, allowing temporary profile objects to be collected. No full heap snapshots are taken.',
        'Allocation samples are statistical estimates. Accepted include-collected parameters are reported, but acceptance alone cannot establish every V8 backend behavior.',
        'This is native CPU/heap evidence, not browser/device/GPU/render/network or FPS evidence. Different solver semantics can change subsequent trajectories.'],
      setup:setupPhase,warmup:{startTime:warmStart,endTime:warmEnd,workloadMs:warmEnd-warmStart,tickTimingMs:summary(warmTimes),peakObservedHeapUsed:warmPeak,endMemory:warmEndMemory,afterForcedGC:beforeSteady,retainedDeltaFromSetup:difference(beforeSteady,afterSetup),gc:gcSummary(events,warmStart,warmEnd,gcAvailable)},
      steady:steadyPhase,totalRetainedDelta:difference(afterSteady,beforeSetup),reportPath:args.outPrefix+'.json'};
    writeJSON(report.reportPath,report);
    console.log(JSON.stringify({report:report.reportPath,mode:report.mode,cell:report.cell,sourceSHA,transformedSourceSHA:report.transformedSourceSHA,actualCounts:report.actualCounts,contactQuality,setupMs:setupPhase.workloadMs,steadyTickMs:steadyPhase.tickTimingMs,setupRetainedDelta:setupPhase.memory.retainedDelta,steadyRetainedDelta:steadyPhase.memory.retainedDelta,peakHeapUsed:steadyPhase.peakObservedMemory.heapUsed,estimatedAllocatedBytes:steadyPhase.allocations?.estimatedAllocationBytes,gc:steadyPhase.gc,artifacts:[setupPhase.artifacts,steadyPhase.artifacts]},null,2));
    return report;
  } finally {
    if(heapActive)await post('HeapProfiler.stopSampling').catch(()=>{});
    if(cpuActive)await post('Profiler.stop').catch(()=>{});
    if(observer)observer.disconnect();session.disconnect();
  }
}
async function qualityOnly(args) {
  const report=JSON.parse(fs.readFileSync(args.qualityOnly,'utf8'));
  if(report.schema!=='budmori-coarse-cpu-memory-v1')throw Error('Unsupported profile report');
  const {engine}=require('./native-engine.cjs'),{setup}=require('./coarse-fixture.cjs'),{candidate}=require('./coarse-live-candidate.cjs');
  const source=fs.readFileSync(report.sourcePath,'utf8'),sourceSHA=sha(source);
  if(sourceSHA!==report.sourceSHA)throw Error('Original production source changed; cannot replay requested profile fixture');
  const mode=report.mode,cell=report.cell,config=report.config;
  const html=mode==='baseline'?source:mode==='query'?require('./batched-grid-candidate.cjs').batchedGridCandidate(source,cell):candidate(source,{mode,cell,exact:config.exact,instrument:false,limit:8});
  const transformedSourceSHA=sha(html),dependencySHA={},changedDependencies=[];
  for(const name of Object.keys(report.dependencySHA)){dependencySHA[name]=sha(fs.readFileSync(path.join(__dirname,name)));if(dependencySHA[name]!==report.dependencySHA[name])changedDependencies.push(name);}
  const world=engine(report.sourcePath,html);setup(world,1000,false);
  const stepScript=new vm.Script('bloomAdapter.step({tick:bloomTick,tickRate:CONFIG.sim.tickRate,inputs:frames})',{filename:'coarse-quality-only-adapter-step.js'});
  for(let i=0;i<config.warmTicks+config.profiledTicks;i++)stepScript.runInContext(world.c);
  const quality=measureContactQuality(world,{warm:config.warmTicks,ticks:config.profiledTicks});
  if(report.finalStateHash&&report.finalStateHash!==quality.finalStateHash)throw Error('Final state hash differs from original profile: '+report.finalStateHash+' versus '+quality.finalStateHash);
  const replay={createdAt:new Date().toISOString(),sourceSHA,transformedSourceSHA,originalTransformedSourceSHA:report.transformedSourceSHA,dependencySHA,changedDependencies,
    sameTransformedSource:transformedSourceSHA===report.transformedSourceSHA,originalHashAvailable:!!report.finalStateHash,
    finalStateHash:quality.finalStateHash,finalHashMatchesOriginal:report.finalStateHash?true:null,
    note:'Quality-only deterministic fixture replay, without CPU/allocation sampling. A changed transformed source/dependency is disclosed; absent an original final hash, historical state equality is not asserted.'};
  report.contactQuality=quality;report.qualityReplay=replay;
  const out=args.outPrefix+'.json';writeJSON(out,report);
  console.log(JSON.stringify({report:out,qualityReplay:replay,contactQuality:quality},null,2));return report;
}
function compareReports(args) {
  const [baselinePath,candidatePath]=args.compare.map(p=>path.resolve(p));
  const baseline=JSON.parse(fs.readFileSync(baselinePath,'utf8')),candidate=JSON.parse(fs.readFileSync(candidatePath,'utf8'));
  for(const report of [baseline,candidate])if(report.schema!=='budmori-coarse-cpu-memory-v1')throw Error('Unsupported profile report');
  const delta=(a,b)=>({baseline:a,candidate:b,delta:b-a,ratio:a?b/a:null});
  const phases={};
  for(const name of ['setup','steady']) {
    const a=baseline[name],b=candidate[name];
    const compareRows=(left,right,key)=>{
      const rows=new Map();
      for(const [side,list]of [['baseline',left],['candidate',right]])for(const row of list||[]) {
        const id=keyFor(row);let combined=rows.get(id);if(!combined){combined={functionName:row.functionName,url:row.url,line:row.line,column:row.column,baseline:0,candidate:0};rows.set(id,combined);}combined[side]+=row[key];
      }
      return Array.from(rows.values()).map(row=>({...row,delta:row.candidate-row.baseline})).sort((x,y)=>Math.abs(y.delta)-Math.abs(x.delta)).slice(0,args.top);
    };
    phases[name]={workloadMs:delta(a.workloadMs,b.workloadMs),retainedHeapBytes:delta(a.memory.retainedDelta.heapUsed,b.memory.retainedDelta.heapUsed),
      estimatedAllocationBytes:a.allocations&&b.allocations?delta(a.allocations.estimatedAllocationBytes,b.allocations.estimatedAllocationBytes):null,
      gcCount:delta(a.gc.count,b.gc.count),gcDurationMs:delta(a.gc.durationMs,b.gc.durationMs),
      cpuSelfMsChanges:compareRows(a.cpu.topSelf,b.cpu.topSelf,'selfMs'),
      estimatedAllocationByteChanges:compareRows(a.allocations?.topSelf,b.allocations?.topSelf,'estimatedSelfBytes')};
    if(name==='steady'){phases[name].tickP50Ms=delta(a.tickTimingMs.p50,b.tickTimingMs.p50);phases[name].tickP95Ms=delta(a.tickTimingMs.p95,b.tickTimingMs.p95);phases[name].peakObservedHeapUsed=delta(a.peakObservedMemory.heapUsed,b.peakObservedMemory.heapUsed);}
  }
  const contactQuality={};
  if(baseline.contactQuality&&candidate.contactQuality)for(const key of ['exactOverlapCount','bodiesOverlapping','maxOverlapNeighbors','meanDepth','maxDepth','p95Depth','meanNormalizedDepth','maxNormalizedDepth','p95NormalizedDepth','over25Percent','over50Percent'])contactQuality[key]=delta(baseline.contactQuality[key],candidate.contactQuality[key]);
  const warnings=[];
  if(baseline.sourceSHA!==candidate.sourceSHA)warnings.push('Original source SHA differs.');
  for(const [label,report]of [['baseline',baseline],['candidate',candidate]]) {
    if(report.qualityReplay&&!report.qualityReplay.sameTransformedSource)warnings.push(label+' contact quality was replayed with a changed experimental generator; original profiling state equality is unverified.');
    if(report.setup.artifactWarning||report.steady.artifactWarning)warnings.push(label+' original raw profile artifacts are unavailable; preserved summary and separately labelled supplemental artifacts have different provenance.');
  }
  for(const key of ['warmTicks','profiledTicks','cpuIntervalUs','heapIntervalBytes','forcedGC'])if(baseline.config[key]!==candidate.config[key])warnings.push('Configuration differs: '+key);
  if(!baseline.config.forcedGC||!candidate.config.forcedGC)warnings.push('At least one run lacks --expose-gc; retained-heap deltas include uncollected garbage.');
  if(JSON.stringify(baseline.actualCounts)!==JSON.stringify(candidate.actualCounts))warnings.push('Actual tick/unit populations differ; inspect actualCounts and evolving solver semantics.');
  const report={schema:'budmori-coarse-cpu-memory-comparison-v1',baseline:{path:baselinePath,mode:baseline.mode,cell:baseline.cell,sourceSHA:baseline.sourceSHA,transformedSourceSHA:baseline.transformedSourceSHA,actualCounts:baseline.actualCounts},candidate:{path:candidatePath,mode:candidate.mode,cell:candidate.cell,sourceSHA:candidate.sourceSHA,transformedSourceSHA:candidate.transformedSourceSHA,actualCounts:candidate.actualCounts},phases,contactQuality,warnings,
    notes:['Allocation changes are statistical estimates. Use repeated isolated runs to establish a reliable difference.','Hotspot deltas use saved top-N rows; a missing row is below the exported cutoff, not proven zero.','Locations can shift when experimental code is injected; inspect named functions and full raw profiles.','CPU/allocation sampling adds overhead. Use matched unprofiled tick benchmarks for speed claims.'],reportPath:args.outPrefix+'.json'};
  writeJSON(report.reportPath,report);console.log(JSON.stringify(report,null,2));return report;
}
async function main(argv=process.argv.slice(2)) {
  const args=parseArgs(argv);if(args.help){console.log(HELP);return;}
  if(args.qualityOnly)return qualityOnly(args);if(args.compare)return compareReports(args);return profile(args);
}
module.exports={parseArgs,summary,cpuSummary,allocationSummary,compareReports,qualityOnly,measureContactQuality,profile,main};
if(require.main===module)main().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
