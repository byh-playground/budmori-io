'use strict';
const path=require('node:path'),{buildSync}=require('esbuild');
const root=path.resolve(__dirname,'..');
buildSync({entryPoints:[path.join(root,'src/farm-app.js')],outfile:path.join(root,'src/game.js'),bundle:true,format:'iife',target:'es2022',charset:'utf8',legalComments:'inline'});
console.log(require('./update-runtime-manifest.cjs').prepareRuntime(root));
