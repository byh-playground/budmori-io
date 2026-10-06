'use strict';
// Optional native complement. Requires @napi-rs/canvas@0.1.100. Serial only;
// alternating order and exact authority checks, no browser/phone FPS claims.
const fs=require('fs'),cp=require('child_process'),crypto=require('crypto');
const path=require('path');const root=path.resolve(__dirname,'..');process.chdir(root);
if(!process.argv[2])throw Error('Usage: node tests/performance-native-suite.cjs BEFORE.html [AFTER.html]');
const files={before:path.resolve(process.argv[2]),after:path.resolve(process.argv[3]||'index.html')};
const report={environment:{node:process.version,platform:process.platform,arch:process.arch,canvas:require('@napi-rs/canvas/package.json').version},status:'Native complementary measurements complete; real browser/Worker-vs-main-thread comparison pending CI',limitations:['Actual game/SDK in V8 with mock DOM; simulation benchmark bypasses Worker transport in both builds.','Renderer includes actual art raster and CPU command submission to a mock GPU sink, not GPU completion or device FPS.','Host load and process startup/JIT introduce noise. Three serial alternating-order repetitions are reported without hiding regressions.','Before/after browser long tasks, input latency and real render-frame distributions must come from performance-browser.mjs; no speedup is inferred from these native numbers.'],sourceSHA256:Object.fromEntries(Object.entries(files).map(([k,p])=>[k,crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')])),native:[],render:[]};
const run=(script,args,env={})=>JSON.parse(cp.execFileSync(process.execPath,[script,...args],{encoding:'utf8',cwd:root,env:{...process.env,...env},timeout:120000,maxBuffer:8e6}));
for(let repeat=0;repeat<3;repeat++){
 for(const scenario of ['sparse','dense','maximum']){const pair={repeat:repeat+1,scenario};for(const label of repeat%2?['after','before']:['before','after'])pair[label]=run('tests/performance-native.cjs',[files[label],scenario]);if(JSON.stringify(pair.before.initial)!==JSON.stringify(pair.after.initial)||pair.before.final.hash!==pair.after.final.hash)throw Error('Different seeded authority evolution');report.native.push(pair);console.log('Completed',repeat+1,scenario);}
 for(const label of repeat%2?['after','before']:['before','after'])report.render.push({repeat:repeat+1,label,...run('tests/native-render.cjs',[files[label]],{RENDER_TICKS:'21',BENCH_NO_READONLY:'0'})});
}
fs.writeFileSync('tests/main-thread-performance.json',JSON.stringify(report,null,2)+'\n');
for(const scenario of ['sparse','dense','maximum'])for(const label of ['before','after'])console.log(scenario,label,report.native.filter(x=>x.scenario===scenario).map(x=>x[label].sessionAdvanceMs.p50));
for(const label of ['before','after'])console.log('render',label,report.render.filter(x=>x.label===label).map(x=>({p50:x.median,p95:x.p95,p99:x.p99})));
