import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

// Run the candidate's unmodified production renderer and bundled SDK on a real
// WebGL context. This focused GPU regression does not claim full-game coverage.
const candidate=process.argv[2]?resolve(process.argv[2]):fileURLToPath(new URL('../index.html',import.meta.url));
const html=await readFile(candidate,'utf8');
const sdk=html.match(/\/\* BEGIN GAMEKIT rendering \*\/([\s\S]*?)\/\* END GAMEKIT rendering \*\//)?.[1];
const renderer=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(match=>match[1]).find(script=>script.includes('global.BloomWebGL='));
assert(sdk&&renderer,'Candidate must contain production WebGL SDK and renderer');
const fixture=`<!doctype html><meta charset="utf-8"><canvas id="view" width="64" height="64"></canvas><script>${sdk}</script><script>${renderer}</script>`;
const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fixture)});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const report={candidate,sourceSHA256:createHash('sha256').update(html).digest('hex'),environment:'Chromium + SwiftShader WebGL1; real draw/readPixels, no physical GPU or full-game claim',checks:[]};
let browser;
try{
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{}),args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage(),pageErrors=[];
 page.on('pageerror',error=>pageErrors.push(error.message));
 const origin=`http://127.0.0.1:${server.address().port}`;
 await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
 await page.goto(origin);
 report.browserVersion=browser.version();
 report.result=await page.evaluate(()=>{
  const result={checks:[],frames:0,pixelChecks:0,submissionErrors:[],diagnostics:[]};
  globalThis.BloomDiagnostics={report(error,meta){result.diagnostics.push({message:error.message,...meta})}};
  let ctx;
  const check=(condition,message)=>{if(!condition)throw new Error(message)};
  try{
   ctx=BloomWebGL.create(document.getElementById('view'),{maxTextures:2,contextAttributes:{preserveDrawingBuffer:true,antialias:false}});
   const gl=ctx.gl,debug=gl.getExtension('WEBGL_debug_renderer_info');
   result.gpu={version:gl.getParameter(gl.VERSION),renderer:gl.getParameter(debug?debug.UNMASKED_RENDERER_WEBGL:gl.RENDERER),maxTextures:ctx.maxTextures};
   check(ctx.maxTextures===2,'Fixture needs two texture slots to exercise overflow');
   const projection=new Float32Array([1,0,0,0,1,0,0,0,1]);
   const rectangle=(x,y,w,h,color)=>ctx.createStaticMesh(new Float32Array([[x,y],[x+w,y],[x+w,y+h],[x,y],[x+w,y+h],[x,y+h]].flatMap(point=>[...point,...color])));
   const red=rectangle(0,0,64,64,[1,0,0,1]);
   const green=rectangle(0,0,32,64,[0,1,0,1]);
   const sprites=[[0,0,255,255],[255,255,0,255],[255,0,255,255]].map(color=>({width:1,height:1,data:new Uint8Array(color)}));
   const pixel=(x,y,expected,label)=>{
    const actual=new Uint8Array(4);gl.readPixels(x,63-y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,actual);
    check(expected.every((value,i)=>Math.abs(value-actual[i])<=1),`${label}: pixel ${x},${y} expected ${expected}, got ${[...actual]}`);
    result.pixelChecks++;
   };
   const frame=(name,paint)=>{
    result.currentFrame=name;
    check(ctx.beginFrame(),`${name}: beginFrame failed`);
    // Keep the game's try/finally boundary: a bad pooled static slot first
    // throws on textures.length, then endFrame surfaces the reported fatal.
    try{paint()}catch(error){result.submissionErrors.push({frame:name,message:error.message});throw error}
    finally{ctx.endFrame()}
    check(gl.getError()===gl.NO_ERROR,`${name}: WebGL error`);
    result.frames++;
   };
   frame('fresh static batches',()=>{ctx.drawStaticMesh(red,projection);ctx.drawStaticMesh(green,projection)});
   pixel(8,8,[0,255,0,255],'Static painter order');pixel(48,8,[255,0,0,255],'Static background');
   const firstSlot=ctx.batches[0];
   frame('sprite reuses fresh static slot',()=>ctx.drawImage(sprites[0],16,16,32,32));
   check(ctx.batches[0]===firstSlot,'Static-to-normal transition must reuse its batch object');
   pixel(32,32,[0,0,255,255],'Sprite in formerly static slot');
   result.checks.push('Fresh static slots become textured batches through the production try/finally frame boundary');

   // Seed all high-water slots once, then alternate scene layouts without
   // changing mesh/texture assets. Capture identity, not implementation text.
   const layouts=[
    ()=>ctx.drawImage(sprites[0],0,0,64,64),
    ()=>{ctx.drawImage(sprites[0],0,0,64,64);ctx.drawStaticMesh(green,projection);ctx.drawImage(sprites[1],24,24,16,16)},
    ()=>{ctx.drawStaticMesh(red,projection);ctx.drawStaticMesh(green,projection);ctx.drawImage(sprites[0],24,24,16,16)},
    ()=>{ctx.drawStaticMesh(red,projection);ctx.drawStaticMesh(green,projection);ctx.drawStaticMesh(red,projection);ctx.drawStaticMesh(green,projection);ctx.drawImage(sprites[0],24,24,16,16)},
    ()=>{ctx.drawStaticMesh(red,projection);for(let i=0;i<3;i++)ctx.drawImage(sprites[i],8+i*16,24,8,8)}
   ];
   for(let i=0;i<layouts.length;i++)frame(`warm layout ${i}`,layouts[i]);
   const batches=ctx.batches.slice(),textures=batches.map(batch=>batch.textures),meshBuffers=[red.buffer,green.buffer];
   const bufferCount=ctx.device.buffers.size,textureCount=ctx.textures.size;
   check(textures.every(Array.isArray),'Every pooled slot owns a reusable textures array');
   let staticUploads=0;
   const uploadVertices=ctx.device.uploadVertices;
   ctx.device.uploadVertices=function(buffer,...args){if(meshBuffers.includes(buffer))staticUploads++;return uploadVertices.call(this,buffer,...args)};
   for(let iteration=0;iteration<120;iteration++){
    const kind=iteration%layouts.length;
    frame(`alternating layout ${kind}, iteration ${iteration}`,layouts[kind]);
    check(ctx.batches.length===batches.length,'Batch pool grew after warmup');
    for(let slot=0;slot<batches.length;slot++){
     check(ctx.batches[slot]===batches[slot],`Batch ${slot} identity changed`);
     check(ctx.batches[slot].textures===textures[slot],`Batch ${slot} textures array was replaced`);
    }
    check(ctx.device.buffers.size===bufferCount&&ctx.textures.size===textureCount,'GPU buffer or texture records grew after warmup');
    check(ctx.frameStats.textureUploads===0,'Unchanged sprite asset was uploaded again');
    if(kind===0)pixel(32,32,[0,0,255,255],'Normal after static');
    if(kind===1){pixel(8,8,[0,255,0,255],'Static after normal');pixel(48,8,[0,0,255,255],'Normal background');pixel(32,32,[255,255,0,255],'Normal after static after normal')}
    if(kind===2||kind===3){pixel(8,8,[0,255,0,255],'Variable static count painter order');pixel(48,8,[255,0,0,255],'Static background');pixel(32,32,[0,0,255,255],'Sprite after static')}
    if(kind===4){
     check(ctx.batchCount===3,'Texture overflow must split the normal batch after the static batch');
     for(let i=0;i<3;i++)pixel(12+i*16,28,[...sprites[i].data],'Texture overflow sprite');
     pixel(48,8,[255,0,0,255],'Overflow preserves static background');
    }
   }
   check(staticUploads===0,'Unchanged static meshes were uploaded again');
   result.pool={batchObjects:batches.length,textureArrays:textures.length,staticUploadsAfterWarmup:staticUploads,meshBuffers:meshBuffers.length,bufferCount,textureCount};
   result.checks.push('120 frames vary static counts and normal/static/normal ordering with framebuffer color assertions','Texture overflow splits textured batches and preserves sprite colors','Batch and texture-array identities remain stable; static buffers and sprite uploads are reused');
   result.stats=ctx.stats();result.passed=true;
  }catch(error){result.passed=false;result.error={message:error.message,stack:error.stack}}
  finally{ctx?.destroy()}
  return result;
 });
 report.pageErrors=pageErrors;
 assert.deepEqual(pageErrors,[],'No uncaught browser errors');
 assert.equal(report.result.passed,true,`${report.result.currentFrame}: ${report.result.error?.message}; submission errors: ${JSON.stringify(report.result.submissionErrors)}`);
 report.checks=report.result.checks;
 console.log(`PASS Chromium/SwiftShader pooled WebGL batches: ${report.result.frames} frames, ${report.result.pixelChecks} pixel checks, ${report.result.pool.batchObjects} stable batch slots; no repeated static/sprite uploads`);
}catch(error){report.error={message:error.message,stack:error.stack};process.exitCode=1;console.error(`FAIL WebGL batch browser regression: ${error.message}`)}
finally{await browser?.close();await new Promise(done=>server.close(done));await writeFile(new URL('./webgl-batches-report.json',import.meta.url),JSON.stringify(report,null,2)+'\n')}
