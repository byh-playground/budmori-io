'use strict';
// Test/benchmark materialization of the actual app program. Runtime production
// always imports ESM; Node VM tools need explicit namespaces in their own realm.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function manifest(html){return JSON.parse(html.match(/<script id="bloom-runtime-manifest" type="application\/json">([\s\S]*?)<\/script>/)?.[1]||'null')}
function read(file,html=fs.readFileSync(file,'utf8')){
  const config=manifest(html);if(!config)return{html,game:null,bootstrap:null,config:null};
  const root=path.dirname(file);
  return{html,config,game:fs.readFileSync(path.join(root,config.game.file),'utf8'),bootstrap:fs.readFileSync(path.join(root,config.bootstrap.file),'utf8'),scope:config.scope?fs.readFileSync(path.join(root,config.scope.file),'utf8'):null,root};
}
function response(app,game=app.game){
  if(!app.config)return{html:game||app.html,game:null,bootstrap:null,gameSha:null};
  const config={...app.config,game:{...app.config.game,bytes:Buffer.byteLength(game),sha256:hash(game)}};
  return{...app,game,config,gameSha:config.game.sha256,html:app.html.replace(/<script id="bloom-runtime-manifest" type="application\/json">[\s\S]*?<\/script>/,'<script id="bloom-runtime-manifest" type="application/json">'+JSON.stringify(config)+'</script>')};
}
function serve(responses){
  const rows=Object.values(responses),variants=new Map(rows.map(row=>[row.gameSha,row]));
  return(req,res)=>{
    const url=new URL(req.url,'http://fixture.invalid');res.setHeader('Cache-Control','no-store');
    if(url.pathname==='/favicon.ico'){res.writeHead(204);res.end();return}
    const selected=responses[url.pathname]||responses['/']||rows[0];
    if(url.pathname==='/src/game.js'){
      const row=variants.get(url.searchParams.get('version'))||selected;
      res.setHeader('Content-Type','text/javascript;charset=utf-8');res.end(row.game);return;
    }
    if(url.pathname==='/src/bootstrap.js'){res.setHeader('Content-Type','text/javascript;charset=utf-8');res.end(selected.bootstrap);return}
    if(url.pathname==='/src/scope.js'&&selected.scope){res.setHeader('Content-Type','text/javascript;charset=utf-8');res.end(selected.scope);return}
    if(url.pathname.startsWith('/src/')){res.writeHead(404);res.end('Unregistered source');return}
    res.setHeader('Content-Type','text/html;charset=utf-8');res.end(selected.html);
  };
}
function materialize(file,html,gameOverride){
  const app=read(file,html);if(!app.config)return html;
  const esbuild=require('esbuild'),scripts=app.config.modules.map(entry=>{
    const bytes=fs.readFileSync(path.join(app.root,'vendor/upstream',entry.name+'.js'));
    if(hash(bytes)!==entry.sha256)throw new Error('Native fixture module integrity: '+entry.name);
    return esbuild.buildSync({stdin:{contents:bytes.toString('utf8'),loader:'js'},format:'iife',globalName:entry.globalName,bundle:true,write:false,platform:'browser',target:'es2022'}).outputFiles[0].text;
  });
  return app.html.replace(/<script id="bloom-runtime-manifest"[^>]*>[\s\S]*?<\/script>/,'').replace(/<script type="module"[^>]*data-bloom-bootstrap><\/script>/,()=>scripts.map(s=>'<script>'+s+'</script>').join('')+'<script>'+(gameOverride??app.game)+'</script>');
}
module.exports={read,response,serve,materialize,manifest,hash};
