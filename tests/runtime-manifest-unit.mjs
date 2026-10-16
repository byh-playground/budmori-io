import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {canonicalTextBytes} from '../scripts/update-runtime-manifest.cjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
assert.equal(canonicalTextBytes(Buffer.from('first\r\nsecond\r\n','utf8')).toString('utf8'),'first\nsecond\n');

const indexBytes=await readFile(new URL('../index.html',import.meta.url));
const html=canonicalTextBytes(indexBytes);
assert.deepEqual(indexBytes,html,'built index file is stored in canonical LF form');
const manifest=JSON.parse(html.toString('utf8').match(/<script id="bloom-runtime-manifest" type="application\/json">([\s\S]*?)<\/script>/)?.[1]||'null');
assert.ok(manifest?.game&&manifest?.bootstrap,'runtime asset manifest is present');
const bootstrapIntegrity='sha256-'+Buffer.from(manifest.bootstrap.sha256,'hex').toString('base64');
assert.ok(html.toString('utf8').includes(`integrity="${bootstrapIntegrity}"`),'bootstrap SRI matches the canonical content hash');
for(const asset of [manifest.game,manifest.bootstrap,manifest.scope].filter(Boolean)){
  const bytes=await readFile(new URL('../'+asset.file,import.meta.url));
  assert.equal(bytes.length,asset.bytes,asset.file+' byte length is canonical');
  assert.equal(hash(bytes),asset.sha256,asset.file+' SHA matches canonical Git text bytes');
}
console.log('runtime manifest canonical byte checks passed');
