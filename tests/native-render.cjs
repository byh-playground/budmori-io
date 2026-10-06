// CPU submission only: real game/art/path renderer, native Canvas asset raster,
// no-op GPU command sink. This is NOT Chromium, GPU completion, or phone FPS.
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert'),crypto=require('crypto');
const {createCanvas:nativeCanvas}=require('@napi-rs/canvas');function createCanvas(w,h){const c=nativeCanvas(w,h);Object.defineProperty(c,'data',{value:undefined});return c}const {engine}=require('./native-engine.cjs');
const file=path.resolve(process.argv[2]||path.join(__dirname,'../index.html')),html=fs.readFileSync(file,'utf8');
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const constants={...{"VERTEX_SHADER":35633,"FRAGMENT_SHADER":35632,"COMPILE_STATUS":35713,"LINK_STATUS":35714,"MAX_TEXTURE_IMAGE_UNITS":34930,"MAX_TEXTURE_SIZE":3379,"ARRAY_BUFFER":34962,"FLOAT":5126,"DEPTH_TEST":2929,"CULL_FACE":2884,"DITHER":3024,"BLEND":3042,"FUNC_ADD":32774,"ONE":1,"ZERO":0,"ONE_MINUS_SRC_ALPHA":771,"SRC_ALPHA":770,"DST_ALPHA":772,"UNPACK_FLIP_Y_WEBGL":37440,"UNPACK_PREMULTIPLY_ALPHA_WEBGL":37441,"UNPACK_COLORSPACE_CONVERSION_WEBGL":37443,"NONE":0,"TEXTURE_2D":3553,"RGBA":6408,"UNSIGNED_BYTE":5121,"TEXTURE_MIN_FILTER":10241,"TEXTURE_MAG_FILTER":10240,"LINEAR":9729,"NEAREST":9728,"TEXTURE_WRAP_S":10242,"TEXTURE_WRAP_T":10243,"CLAMP_TO_EDGE":33071,"TEXTURE0":33984,"SCISSOR_TEST":3089,"STENCIL_TEST":2960,"STENCIL_BUFFER_BIT":1024,"COLOR_BUFFER_BIT":16384,"EQUAL":514,"KEEP":7680,"INCR":7682,"TRIANGLES":4,"DYNAMIC_DRAW":35048},NO_ERROR:0,MAX_VIEWPORT_DIMS:3386,DEPTH_BUFFER_BIT:256,LEQUAL:515,ALWAYS:519,UNPACK_ALIGNMENT:3317};
let serial=0;const funcs=new Map();const gl=new Proxy(constants,{get(o,k){if(k in o)return o[k];if(funcs.has(k))return funcs.get(k);let f;
 if(k==='getParameter')f=c=>c===constants.MAX_TEXTURE_IMAGE_UNITS?8:c===constants.MAX_VIEWPORT_DIMS?[16384,16384]:4096;
 else if(k==='getContextAttributes')f=()=>({depth:false,stencil:true});else if(k==='getError')f=()=>0;
 else if(k==='getShaderParameter'||k==='getProgramParameter')f=()=>true;else if(k==='getShaderInfoLog'||k==='getProgramInfoLog')f=()=>'';else if(k==='isContextLost')f=()=>false;else if(k==='getAttribLocation')f=()=>serial++;
 else if(k.startsWith('create')||k==='getUniformLocation')f=()=>({id:serial++});else f=()=>{};funcs.set(k,f);return f;}});
const doc={createElement:tag=>tag==='canvas'?createCanvas(1,1):{style:{}}},world={ownerDocument:doc,width:390,height:780,style:{},dataset:{},getContext:()=>gl,addEventListener(){},removeEventListener(){}};
const realm=vm.createContext(vm.constants.DONT_CONTEXTIFY);Object.assign(realm,{console,performance,document:doc,Uint8Array,Uint8ClampedArray});realm.window=realm;
const modules=scripts.find(s=>s.includes('var BloomGamekitInput'));if(modules)vm.runInContext(modules,realm);
vm.runInContext(scripts.find(s=>s.includes('global.BloomWebGL=')),realm);const ctx=realm.BloomWebGL.create(world,{forceWebGL1:true});
const adapted=html.replace('ctx=(globalThis.BLOOM_HEADLESS ? null : (BloomWebGL.create(canvas)))','ctx=globalThis.testContext');
const e=engine(file,adapted,ctx);const old=e.doc.createElement;e.doc.createElement=tag=>tag==='canvas'?createCanvas(1,1):old(tag);realm.RallyArt=e.c.RallyArt;
let clock=1000;e.c.performance={now:()=>clock};
e.run(fs.readFileSync(path.join(__dirname,'dense-fixture.js'),'utf8'));
e.run('healthEnsureState();healthDOM={root:$("health"),fill:{style:{}},ghost:{style:{}},flash:{style:{}},label:$("motherHealth")};for(const k of ["showDefeat","refreshUI","toast","closeModal","refreshAutoHunt","refreshPermanentHuntControl","showAbilityChoices"])bloomPresentationFunctions[k]=()=>{};buildTerrain();BloomSimulation.createSession();view.x=state.mother.x;view.y=state.mother.y;BLOOM_HEADLESS=false;resetPresentation();BLOOM_HEADLESS=true;');
const rows=[];for(let i=0;i<Number(process.env.RENDER_TICKS||5);i++){
 e.tick();e.run('BLOOM_HEADLESS=false;BloomSimulation.present(BloomSimulation.session.confirmedTick);capturePresentation();BLOOM_HEADLESS=true;');
 for(let j=0;j<6;j++){clock+=100/6;e.c.alpha=(j+1)/6;const start=performance.now();e.run('BLOOM_HEADLESS=false;render(alpha,1/60);BLOOM_HEADLESS=true;');rows.push(performance.now()-start);assert(ctx.stats().available,ctx.stats().failure)}
}
const before=Buffer.from(e.run('BloomSimulation.adapter.save()'));e.run('BLOOM_HEADLESS=false;render(1,0);BLOOM_HEADLESS=true;');assert(before.equals(Buffer.from(e.run('BloomSimulation.adapter.save()'))));
const sorted=rows.slice(6).sort((a,b)=>a-b),report={kind:'Native V8 CPU submission, mock DOM/GPU sink, actual game and asset raster; not browser/GPU/device FPS',sha256:crypto.createHash('sha256').update(html).digest('hex'),samples:sorted.length,median:sorted[Math.floor(sorted.length/2)],p95:sorted[Math.ceil(sorted.length*.95)-1],mean:sorted.reduce((a,b)=>a+b,0)/sorted.length,stats:ctx.stats(),units:e.run('state.units.length'),friendly:e.run('state.units.filter(u=>u.team==="friendly"&&u.hp>0).length'),authorityUnchanged:true};
console.log(JSON.stringify(report,null,2));fs.writeFileSync(path.join(__dirname,path.basename(file)+'.render.json'),JSON.stringify(report,null,2));e.run('BloomSimulation.session.close()');
