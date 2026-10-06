import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const expected=hash(await readFile(new URL('../index.html',import.meta.url)));
const url='https://byh-playground.github.io/budmori-io/';
const deadline=Date.now()+8*60*1000;let observed='not fetched';
while(Date.now()<deadline){
 try{const response=await fetch(url+'?build='+encodeURIComponent(process.env.GITHUB_SHA||expected)+'&check='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(15000)});if(response.ok){const bytes=Buffer.from(await response.arrayBuffer());observed=hash(bytes);if(observed===expected){console.log(JSON.stringify({status:'PASS',url,commit:process.env.GITHUB_SHA,sha256:expected,bytes:bytes.length}));process.exit(0)}}else observed='HTTP '+response.status}catch(error){observed=error.message}
 console.log('Waiting for Pages bytes:',observed,'expected:',expected);await new Promise(r=>setTimeout(r,10000));
}
throw new Error('Pages did not serve the tested index.html within the deployment observation window: '+observed);
