import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const canonicalText=bytes=>Buffer.from(bytes.toString('utf8').replace(/\r\n/g,'\n'),'utf8');
const html=canonicalText(await readFile(new URL('../index.html',import.meta.url))),expected=hash(html);
const manifest=JSON.parse(html.toString('utf8').match(/<script id="bloom-runtime-manifest" type="application\/json">([\s\S]*?)<\/script>/)?.[1]||'null');
const files=[{file:'index.html',sha256:expected,bytes:html.length},...[manifest?.game,manifest?.bootstrap,manifest?.scope,...(manifest?.vectorAssets||[])].filter(Boolean)];
const url='https://byh-playground.github.io/budmori-io/';
const deadline=Date.now()+8*60*1000;let observed='not fetched',verified=false;
while(Date.now()<deadline){
 try{const results=await Promise.all(files.map(async spec=>{const target=spec.file==='index.html'?url:new URL(spec.file,url).href;const response=await fetch(target+'?build='+encodeURIComponent(process.env.GITHUB_SHA||expected)+'&check='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error(spec.file+' HTTP '+response.status);const bytes=Buffer.from(await response.arrayBuffer()),actual=hash(bytes);return{file:spec.file,bytes:bytes.length,sha256:actual,match:actual===spec.sha256&&bytes.length===spec.bytes}}));observed=results.filter(r=>!r.match).map(r=>r.file+':'+r.sha256).join(',')||'matched';if(results.every(r=>r.match)){console.log(JSON.stringify({status:'PASS',url,commit:process.env.GITHUB_SHA,sha256:expected,files:results}));verified=true;break}}catch(error){observed=error.message}
 console.log('Waiting for Pages bytes:',observed,'expected:',expected);await new Promise(r=>setTimeout(r,10000));
}
if(!verified)throw new Error('Pages did not serve the tested index.html within the deployment observation window: '+observed);
