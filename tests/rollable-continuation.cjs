const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
// One continuous actual-engine roll, save, terrain, death and recovery story.
// Independent native-format realms require exact snapshot and effect parity.
const path=require('node:path'),root=path.resolve(__dirname,'..'),{engine}=require('./native-engine.cjs');
const files=[process.argv[2]||root+'/index.html',process.argv[3]||root+'/index.html'],es=files.map(f=>engine(f));
const report={checks:0,effectChecks:0,chapters:[],sources:es.map(e=>e.sha256)};
function same(label){const bytes=es.map(e=>Buffer.from(e.run('bloomAdapter.save()')));assert(bytes[0].equals(bytes[1]),label+' canonical bytes');assert.equal(es[0].run('JSON.stringify(bloomCurrentEffects)'),es[1].run('JSON.stringify(bloomCurrentEffects)'),label+' full VFX');report.checks++;report.effectChecks++;return bytes[0]}
function both(code){for(const e of es)e.run(code)}
function fixture(code){for(const e of es)e.fixture(code);same('stopped boundary')}
function ticks(n,label,input={x:0,y:0,manual:true}){for(let i=0;i<n;i++){for(const e of es)e.tick(1,input);same(label+' '+i)}report.chapters.push(label)}
function roll(x,y){both(`bloomSession.queueCommand(BloomSimulation.encodeCommand({version:1,type:'roll',x:${x},y:${y}}))`);ticks(1,'queued roll begins');assert(es[0].run('state.mother.roll.leftMs>0'));assert(es[1].run('state.mother.roll.leftMs>0&&!Object.hasOwn(state.mother,"rollRemainingMs")'))}
function restore(label){const bytes=same(label+' before');for(const e of es){e.c.qaBytes=Uint8Array.from(bytes);e.run('bloomAdapter.load(qaBytes)')}same(label+' after');assert(es[1].run('state.mother instanceof MoaActor&&state.mother===WorldPlayers.get("solo").leader'));report.chapters.push(label)}
try{
 both('BloomSimulation.initialize(12345);BloomSimulation.createSession();playing=true;paused=false;modalKind="";');same('initialization');
 fixture(`for(const c of state.camps){c.enabled=false;c.spawned=true;c.regrowth=[]}for(const u of state.units){u.stun=1e6;u.aggroAt=u.wanderAt=state.time+1e6}const m=state.mother;resetMoaBody(m);`);
 // Last-direction fallback, explicit intent, partial final fixed interval, disk restore.
 ticks(3,'manual direction remembered',{x:.4,y:-.3,manual:true});roll(0,0);restore('mid-roll live rollback');
 for(const e of es){e.c.qaDisk=e.run('BloomSimulation.disk.snapshot()');assert(e.run('BloomSimulation.disk.load(qaDisk)'));e.run('playing=true;paused=false;modalKind=""')}
 same('mid-roll disk import');assert(es[0].run('state.mother.roll.leftMs>0'));ticks(4,'roll completes after disk restore');ticks(32,'cooldown expiry');
 roll(-32767,12000);ticks(4,'explicit direction and grounded movement');ticks(32,'second cooldown expiry');
 // A terrain boundary forces production sweep/slide rather than unconstrained motion.
 fixture(`const m=state.mother;let found=null;for(let x=0;x<CONFIG.openWorld.width&&!found;x+=32)for(let y=0;y<CONFIG.openWorld.height&&!found;y+=32){if(ThemedTerrain.walkable(x,y,moaBodyRadius(m))&&!ThemedTerrain.walkable(x-130,y,moaBodyRadius(m)))found={x,y}}if(!found)throw Error('No terrain edge');Object.assign(m,found);resetMoaBody(m);spatialUnit(m,true);globalThis.qaEdge={x:m.x,y:m.y};`);
 roll(-32767,0);restore('mid-roll edge checkpoint');ticks(5,'terrain edge swept collision');assert(es[0].run('ThemedTerrain.walkable(state.mother.x,state.mother.y,moaBodyRadius(state.mother))'));
 // Death resets transient roll state but preserves cooldown debt, recovery keeps it.
 ticks(32,'edge cooldown expiry');roll(32767,0);
 fixture(`const p=WorldPlayers.byAccount(-1);bloomInTick=true;bloomCurrentEffects=[];try{PlayerLifecycle.defeat(p,null)}finally{bloomInTick=false}`);
 assert(es[0].run('state.dead&&state.mother.roll.leftMs===0&&state.mother.roll.cooldown.leftMs>0'));restore('dead actor checkpoint');
 both("bloomSession.queueCommand(BloomSimulation.encodeCommand({version:1,type:'recover'}))");ticks(1,'recovery queued');assert(es[0].run('!state.dead'));assert(es[1].run('typeof state.mother.startRoll==="function"'));ticks(35,'recovered continuation');
 const final=same('final');report.finalSHA256=crypto.createHash('sha256').update(final).digest('hex');report.status='PASS';
}catch(error){report.status='FAIL';report.error=error.stack;process.exitCode=1}finally{both('bloomSession?.close()');fs.writeFileSync(root+'/tests/rollable-continuation-results.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2))}
