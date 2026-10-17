'use strict';
const path=require('node:path'),{buildSync}=require('esbuild');
const root=path.resolve(__dirname,'..');
async function verifyStartupPresentation(){
  const assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
  const load=file=>import(pathToFileURL(path.join(root,file)).href);
  // Use the real pinned runtime and application models: bundling alone cannot
  // detect a removed simulation method still called by a presentation adapter.
  for(const [name,file] of [['BloomGamekitDeterministic','deterministic'],['BloomGamekitInterpolation','interpolation'],['BloomGamekitSimloop','simloop']])globalThis[name]=await load(`vendor/upstream/${file}.js`);
  const {Garden}=await load('src/farm-model.js'),{FarmSession}=await load('src/farm-session.js');
  const {SPECIES_CATALOG}=await load('src/species-catalog.js'),{scaleAttackRecovery}=await load('src/unit-stats.js');
  const starter=new FarmSession();
  try{
    const view=starter.presentation(performance.now());
    assert.equal(view.units.length,2,'default FarmSession captures both starter peas');
    assert(view.units.every(unit=>unit.species===0&&unit.walnutGuarding===false));
  }finally{starter.dispose()}
  const world=new Garden(),units=SPECIES_CATALOG.map(({id})=>world.spawn(id,3,0,0)),session=new FarmSession(world);
  try{
    const view=session.presentation(performance.now());
    for(const unit of units){
      const rendered=view.units.find(item=>item.id===unit.id);
      assert(rendered&&rendered.species===unit.species&&rendered.walnutGuarding===false,`species ${unit.species} has an initial presentation`);
    }
    const walnut=units.find(unit=>typeof unit.ability.guardConfig==='function'),cycle=walnut.ability;
    const sampleGuard=()=>{
      assert(session.capturePresentation('reset'));
      return session.presentation(performance.now()).units.find(unit=>unit.id===walnut.id).walnutGuarding;
    };
    world.playerProgression.abilities['walnut-guard-slam'].rootUnlocked=true;
    assert(cycle.begin(world,{id:'boss',x:world.boss.x,y:world.boss.y}));cycle.recover(world);
    assert.equal(sampleGuard(),false,'early recovery is not guarding');
    cycle.update(world,scaleAttackRecovery(cycle.spec.timing.recovery,walnut)*.75);
    const actionBefore=JSON.stringify(cycle.action),noticesBefore=world.notices.length;
    assert.equal(sampleGuard(),true,'late recovery presents the active guard');
    assert.equal(sampleGuard(),true,'repeated presentation does not consume the guard');
    assert.equal(JSON.stringify(cycle.action),actionBefore);assert.equal(walnut.walnutEmpoweredNextBasic,false);assert.equal(world.notices.length,noticesBefore);
    assert(cycle.receiveGuard(world));assert.equal(sampleGuard(),false,'consumed guard is no longer presented');
    cycle.ready();assert.equal(sampleGuard(),false,'idle cycle is not guarding');
  }finally{session.dispose()}
  return{starterUnits:2,species:SPECIES_CATALOG.length,walnutGuard:'active, read-only, consumed and idle checked'};
}
(async()=>{
  const {validateVectorSources}=require('./vector-sources.cjs');
  const vectorAssets=validateVectorSources(root);
  const startupPresentation=await verifyStartupPresentation();
  buildSync({entryPoints:[path.join(root,'src/farm-app.js')],outfile:path.join(root,'src/game.js'),bundle:true,format:'iife',target:'es2022',charset:'utf8',legalComments:'inline'});
  console.log(JSON.stringify({startupPresentation,vectorAssets,...require('./update-runtime-manifest.cjs').prepareRuntime(root)},null,2));
})().catch(error=>{console.error(error.stack||error);process.exitCode=1});
