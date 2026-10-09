// CPU submission only: real game/art/path renderer, native Canvas asset raster,
// no-op GPU command sink. This is NOT Chromium, GPU completion, or phone FPS.
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert'),crypto=require('crypto');
const {createCanvas:nativeCanvas}=require('@napi-rs/canvas');function createCanvas(w,h){const c=nativeCanvas(w,h);Object.defineProperty(c,'data',{value:undefined});return c}const {engine}=require('./native-engine.cjs');
const runtimeSource=require('./runtime-source.cjs'),fontFixture=require('./font-asset-fixture.cjs');
(async()=>{
// BUDMORI_RENDER_REPORTS=0 disables disk reports; BUDMORI_RENDER_REPORT_DIR
// redirects them outside tracked results. Console output is always retained.
const file=path.resolve(process.argv[2]||path.join(__dirname,'../index.html')),app=runtimeSource.read(file,fs.readFileSync(file,'utf8'));
assert(app.config&&app.game&&app.bootstrap,'Native render benchmark requires the authentic split runtime manifest, src/game.js, and src/bootstrap.js');
assert.equal(Buffer.byteLength(app.game),app.config.game.bytes,'Native benchmark source length matches the runtime manifest');
assert.equal(runtimeSource.hash(Buffer.from(app.game)),app.config.game.sha256,'Native benchmark game source matches the runtime manifest');
const html=runtimeSource.materialize(file,app.html);
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
function extractRendererIIFE(source){const exported=source.indexOf('global.BloomWebGL=');assert(exported>=0,'Actual src/game.js must define its game-owned BloomWebGL renderer');const start=source.lastIndexOf('(function(global){',exported),closing="})(typeof window!=='undefined'?window:globalThis);",end=source.indexOf(closing,exported);assert(start>=0&&end>=0,'Could not isolate the actual game-owned Renderer IIFE');return source.slice(start,end+closing.length)}
const constants={...{"VERTEX_SHADER":35633,"FRAGMENT_SHADER":35632,"COMPILE_STATUS":35713,"LINK_STATUS":35714,"MAX_TEXTURE_IMAGE_UNITS":34930,"MAX_TEXTURE_SIZE":3379,"ARRAY_BUFFER":34962,"FLOAT":5126,"DEPTH_TEST":2929,"CULL_FACE":2884,"DITHER":3024,"BLEND":3042,"FUNC_ADD":32774,"ONE":1,"ZERO":0,"ONE_MINUS_SRC_ALPHA":771,"SRC_ALPHA":770,"DST_ALPHA":772,"UNPACK_FLIP_Y_WEBGL":37440,"UNPACK_PREMULTIPLY_ALPHA_WEBGL":37441,"UNPACK_COLORSPACE_CONVERSION_WEBGL":37443,"NONE":0,"TEXTURE_2D":3553,"RGBA":6408,"UNSIGNED_BYTE":5121,"TEXTURE_MIN_FILTER":10241,"TEXTURE_MAG_FILTER":10240,"LINEAR":9729,"NEAREST":9728,"TEXTURE_WRAP_S":10242,"TEXTURE_WRAP_T":10243,"CLAMP_TO_EDGE":33071,"TEXTURE0":33984,"SCISSOR_TEST":3089,"STENCIL_TEST":2960,"STENCIL_BUFFER_BIT":1024,"COLOR_BUFFER_BIT":16384,"EQUAL":514,"KEEP":7680,"INCR":7682,"TRIANGLES":4,"DYNAMIC_DRAW":35048},NO_ERROR:0,MAX_VIEWPORT_DIMS:3386,DEPTH_BUFFER_BIT:256,LEQUAL:515,ALWAYS:519,UNPACK_ALIGNMENT:3317};
let serial=0;const funcs=new Map();const gl=new Proxy(constants,{get(o,k){if(k in o)return o[k];if(funcs.has(k))return funcs.get(k);let f;
 if(k==='getParameter')f=c=>c===constants.MAX_TEXTURE_IMAGE_UNITS?8:c===constants.MAX_VIEWPORT_DIMS?[16384,16384]:4096;
 else if(k==='getContextAttributes')f=()=>({depth:false,stencil:true});else if(k==='getError')f=()=>0;
 else if(k==='getShaderParameter'||k==='getProgramParameter')f=()=>true;else if(k==='getShaderInfoLog'||k==='getProgramInfoLog')f=()=>'';else if(k==='isContextLost')f=()=>false;else if(k==='getAttribLocation')f=()=>serial++;
 else if(k.startsWith('create')||k==='getUniformLocation')f=()=>({id:serial++});else f=()=>{};funcs.set(k,f);return f;}});
const doc={createElement:tag=>tag==='canvas'?createCanvas(1,1):{style:{}}},world={ownerDocument:doc,width:390,height:780,style:{},dataset:{},getContext:()=>gl,addEventListener(){},removeEventListener(){}};
const realm=vm.createContext(vm.constants.DONT_CONTEXTIFY);Object.assign(realm,{console,performance,document:doc,Uint8Array,Uint8ClampedArray,Float32Array,TextDecoder,TextEncoder,URL,crypto:crypto.webcrypto,atob,AbortController,DOMException});realm.window=realm;
for(const entry of app.config.modules){const code=scripts.find(s=>new RegExp(`\\bvar\\s+${entry.globalName}\\s*=`).test(s));assert(code,`Missing actual SDK namespace IIFE: ${entry.name}`);vm.runInContext(code,realm,{filename:`${entry.name}.bundle.js`});assert(realm[entry.globalName],`SDK namespace was not initialized: ${entry.globalName}`)}
vm.runInContext(extractRendererIIFE(app.game),realm,{filename:`${file}:game-renderer-iife`});const ctx=realm.BloomWebGL.create(world,{forceWebGL1:true});
const lock=JSON.parse(fs.readFileSync(path.join(app.root,'gamekit-lock.json'),'utf8')),fontAsset=lock.assets.find(item=>item.file.includes('noto-sans-kr-700-v1'));assert(fontAsset,'Native renderer fixture requires the genuine pinned font asset');
const fontBytes=fs.readFileSync(path.join(app.root,'vendor/upstream',fontAsset.file));assert.equal(fontBytes.length,fontAsset.bytes);assert.equal(runtimeSource.hash(fontBytes),fontAsset.sha256);assert.equal(fontFixture.bytes,fontAsset.bytes,'Native renderer uses the same pinned font bytes as the browser fixture');
const fontSource={url:fontFixture.url,version:fontAsset.version,sha256:fontAsset.sha256,bytes:fontAsset.bytes};
realm.fetch=async()=>{const bytes=Uint8Array.from(fontBytes);return{ok:true,status:200,type:'basic',headers:{get(name){return name.toLowerCase()==='content-length'?String(bytes.byteLength):null}},arrayBuffer:async()=>bytes.buffer}};
const fontLoader=new realm.BloomGamekitRendering.FontAssetLoader(ctx.device,fontSource),glyphAtlas=await fontLoader.ready;assert.equal(glyphAtlas.glyphs.size,750,'Native renderer must use the genuine pinned Noto atlas');ctx.setGlyphAtlas(glyphAtlas,fontLoader);
const rendererCall='ctx=(globalThis.BLOOM_HEADLESS ? null : (BloomWebGL.create(canvas)))';assert(html.includes(rendererCall),'Actual split game source renderer bootstrap changed; update the native injection explicitly');const adapted=html.replace(rendererCall,'ctx=globalThis.testContext');
const e=engine(file,adapted,ctx);const old=e.doc.createElement;e.doc.createElement=tag=>tag==='canvas'?createCanvas(1,1):old(tag);realm.RallyArt=e.c.RallyArt;
assert.equal(realm.Float32Array,e.c.Float32Array,'native game/renderer share the Float32Array constructor');
assert.throws(()=>ctx.createStaticMesh(e.run('new Float64Array(6)')),/Static mesh requires Float32Array with six floats per vertex/,'wrong typed-array element type remains invalid');
assert.throws(()=>ctx.createStaticMesh(e.run('new Float32Array(5)')),/Static mesh requires Float32Array with six floats per vertex/,'incomplete six-float vertex layout remains invalid');
let clock=1000;e.c.performance={now:()=>clock};
e.run(fs.readFileSync(path.join(__dirname,'dense-fixture.js'),'utf8'));
e.run('healthEnsureState();healthDOM={root:$("health"),fill:{style:{}},ghost:{style:{}},flash:{style:{}},label:$("motherHealth")};for(const k of ["showDefeat","refreshUI","toast","closeModal","refreshAutoHunt","refreshPermanentHuntControl","showAbilityChoices"])bloomPresentationFunctions[k]=()=>{};BloomSimulation.createSession();view.x=state.mother.x;view.y=state.mother.y;BLOOM_HEADLESS=false;resetPresentation();BLOOM_HEADLESS=true;');
const renderTicks=Number(process.env.RENDER_TICKS||5);assert(Number.isSafeInteger(renderTicks)&&renderTicks>=2,'RENDER_TICKS must leave samples after one warmup tick');
const rows=[],captureRows=[],actorRows=[];let measuringActors=false;
// Gameplay uses the fixture clock; CPU stages always use the host monotonic
// clock. Capture includes the same VM call overhead in baseline and candidate.
e.c.qaCPUClock=()=>performance.now();
e.c.qaRecordActorCPU=elapsed=>{if(measuringActors)actorRows.push(elapsed)};
e.run('(()=>{const original=drawProjectedActors;drawProjectedActors=function(...args){const start=qaCPUClock();try{return original.apply(this,args)}finally{qaRecordActorCPU(qaCPUClock()-start)}}})()');
for(let i=0;i<renderTicks;i++){
 e.tick();e.run('BLOOM_HEADLESS=false;BloomSimulation.present(BloomSimulation.session.confirmedTick);');
 const captureStart=performance.now();e.run('capturePresentation()');captureRows.push(performance.now()-captureStart);e.run('BLOOM_HEADLESS=true;');
 const authorityBefore=Buffer.from(e.run('BloomSimulation.adapter.save()'));
 for(let j=0;j<6;j++){
  clock+=100/6;e.c.alpha=(j+1)/6;const actorCount=actorRows.length,start=performance.now();measuringActors=true;
  try{e.run('BLOOM_HEADLESS=false;render(alpha,1/60);BLOOM_HEADLESS=true;')}finally{measuringActors=false}
  rows.push(performance.now()-start);
  assert(!e.run('BloomDiagnostics.fatal'),JSON.stringify(e.json('BloomDiagnostics.snapshot()')));
  assert.equal(actorRows.length,actorCount+1,'Each measured frame must execute the actual actor stage once');
  assert(ctx.stats().frame>i*6+j,'Each measured render must submit a frame');assert(ctx.stats().available,ctx.stats().failure);
 }
 assert(authorityBefore.equals(Buffer.from(e.run('BloomSimulation.adapter.save()'))),'Positive-dt render-only frames must preserve fresh canonical authority bytes');
}
const before=Buffer.from(e.run('BloomSimulation.adapter.save()'));e.run('BLOOM_HEADLESS=false;render(1,0);BLOOM_HEADLESS=true;');assert(before.equals(Buffer.from(e.run('BloomSimulation.adapter.save()'))));
function cpuSummary(samples){
 assert(samples.length>0&&samples.every(value=>Number.isFinite(value)&&value>=0),'CPU metrics require finite host-clock samples');
 const sorted=samples.slice().sort((a,b)=>a-b);
 return{samples:sorted.length,p50Ms:sorted[Math.floor(sorted.length/2)],p95Ms:sorted[Math.ceil(sorted.length*.95)-1],meanMs:sorted.reduce((a,b)=>a+b,0)/sorted.length};
}
// Exclude the first tick and its six frames from CPU summaries. The final
// zero-dt authority check is not a timing sample; actor collection is disabled.
const sorted=rows.slice(6).sort((a,b)=>a-b),report={kind:'Native V8 CPU submission, mock DOM/GPU sink, actual split game source and authentic font atlas; not browser/GPU/device FPS',sha256:app.config.game.sha256,runtimeManifest:app.config.game,renderTicks,framesPerTick:6,warmupTicks:1,cpuClock:'host performance.now(); capture includes VM call overhead; actor stage includes host callback overhead',captureCPU:cpuSummary(captureRows.slice(1)),actorCPU:cpuSummary(actorRows.slice(6)),samples:sorted.length,median:sorted[Math.floor(sorted.length/2)],p95:sorted[Math.ceil(sorted.length*.95)-1],p99:sorted[Math.ceil(sorted.length*.99)-1],seed:e.run('bloomSeed'),tps:e.run('CONFIG.sim.tickRate'),mean:sorted.reduce((a,b)=>a+b,0)/sorted.length,stats:ctx.stats(),font:{version:fontSource.version,sha256:fontSource.sha256,bytes:fontSource.bytes,glyphs:glyphAtlas.glyphs.size},units:e.run('state.units.length'),friendly:e.run('state.units.filter(u=>u.team==="friendly"&&u.hp>0).length'),authorityUnchanged:true};
console.log(JSON.stringify(report,null,2));
if(process.env.BUDMORI_RENDER_REPORTS!=='0'){
 const directory=path.resolve(process.env.BUDMORI_RENDER_REPORT_DIR||__dirname);fs.mkdirSync(directory,{recursive:true});
 fs.writeFileSync(path.join(directory,path.basename(file)+'.render.json'),JSON.stringify(report,null,2)+'\n');
}
e.run('BloomSimulation.session.close()');
ctx.destroy();
})().catch(error=>{console.error(error);process.exitCode=1});
