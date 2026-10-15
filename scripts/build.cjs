'use strict';
const path=require('node:path'),{buildSync}=require('esbuild');
const root=path.resolve(__dirname,'..');
(async()=>{
  const {compileTroopAssets}=await import('./compile-vector-assets.mjs');
  const vectorAssets=await compileTroopAssets();
  buildSync({entryPoints:[path.join(root,'src/farm-app.js')],outfile:path.join(root,'src/game.js'),bundle:true,format:'iife',target:'es2022',charset:'utf8',legalComments:'inline'});
  console.log(JSON.stringify({vectorAssets,...require('./update-runtime-manifest.cjs').prepareRuntime(root)},null,2));
})().catch(error=>{console.error(error.stack||error);process.exitCode=1});
