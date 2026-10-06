const fs=require('fs'),crypto=require('crypto'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),lock=JSON.parse(fs.readFileSync(path.join(root,'gamekit-lock.json')));
assert.match(lock.sourceCommit,/^[a-f0-9]{40}$/);if(lock.distCommit!==null)assert.match(lock.distCommit,/^[a-f0-9]{40}$/);
for(const module of lock.modules){const begin='/* BEGIN GAMEKIT '+module.name+' */\n',end='/* END GAMEKIT '+module.name+' */',start=html.indexOf(begin);assert(start>=0,module.name);const code=html.slice(start+begin.length,html.indexOf(end,start));assert.equal(crypto.createHash('sha256').update(code).digest('hex'),module.inlineSHA256,module.name+' embedded bytes');assert.match(module.bundleSHA256,/^[a-f0-9]{64}$/)}
assert(!/<script[^>]+src=/i.test(html),'Offline HTML cannot depend on external scripts');
const frontend=html.slice(html.indexOf('* BLOOM mandatory world renderer'),html.indexOf('global.BloomWebGL='));assert(frontend.includes('this.device.draw(')&&!frontend.includes('gl.drawArrays(')&&!frontend.includes('gl.texImage2D('),'game frontend delegates GPU ownership');
console.log('PASS',lock.modules.length,'embedded modules match gamekit-lock.json; source',lock.sourceCommit,'dist',lock.distCommit||'candidate only');
