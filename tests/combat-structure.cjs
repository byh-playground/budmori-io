'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const source=fs.readFileSync(process.argv[2]||`${__dirname}/../index.html`,'utf8');
function body(name){const start=source.indexOf(`function ${name}(`);assert(start>=0,`${name} exists`);let i=source.indexOf('{',start),depth=0,quote='';for(;i<source.length;i++){const c=source[i];if(quote){if(c==='\\')i++;else if(c===quote)quote='';continue}if('"\'`'.includes(c)){quote=c;continue}if(source.slice(i,i+2)==='//'){i=source.indexOf('\n',i);continue}if(source.slice(i,i+2)==='/*'){i=source.indexOf('*/',i+2)+1;continue}if(c==='{')depth++;if(c==='}'&&--depth===0)return source.slice(start,i+1)}throw Error(`Unclosed ${name}`)}
for(const name of ['attack','damage','damageValue','updateUnit']){
 assert.equal((source.match(new RegExp(`\\bfunction ${name}\\(`,'g'))||[]).length,1,`${name} has one stable entry`);
 assert(!new RegExp(`(?<![\\w.$])${name}\\s*=\\s*function\\b`).test(source),`${name} cannot be globally overwritten`);
 assert(!new RegExp(`\\b(?:\\w+Core|core|rarityLegacy)\\.${name}\\b`).test(source),`${name} has no captured continuation`);
}
for(const name of ['attack','damage','damageValue','resolveBasicAttack','basicRangedAttack','basicMeleeAttack','applyDamageHealth','updateUnit','updateOrdinaryUnitMovement']){
 assert(!/\.type\s*={2,3}\s*['"](?:rootstalker|medic|siege|skirmisher|sporemoth|pikeman|shellbug|tank)['"]/.test(body(name)),`${name} dispatches capabilities rather than species`);
}
assert(body('resolveBasicAttack').includes('combatDefinition(u).execute('),'Definition owns the basic action');
assert(body('basicRangedAttack').includes('cap.projectileModifiers')&&body('basicRangedAttack').includes('cap.afterProjectile'),'Projectile payload and follow-up are composed capabilities');
assert(body('damageValue').includes('cap.mitigate('),'Definition owns mitigation behavior');
assert(body('recoverAttackPattern').includes('?.finish?.('),'Pattern cleanup belongs to lifecycle capability');
assert(!body('settlePatternBody').includes('c.pattern'),'Jump cleanup does not branch on a pattern ID');
assert(!/patternJumpCanStart\/\.test\(String\(/.test(source),'Registry rebinds are explicit, not source-text heuristics');
const update=body('updateUnit');
for(const name of ['visibleHuntUpdateLeash','residentUpdate','updateRivalUnitBehavior','updatePatternUnitTurn','visibleHuntMarkReturn'])assert(update.includes(name),`Unit turn includes ${name}`);
assert(update.indexOf('visibleHuntUpdateLeash')<update.indexOf('residentUpdate')&&update.indexOf('visibleHuntMarkReturn')>update.indexOf('updatePatternUnitTurn'),'Viewport lifecycle brackets one behavior owner');
assert(body('damage').includes('finally{spatialContext=previous}'),'Nested damage restores scoped spatial context');
assert(body('attack').includes('finally{spatialContext=previous}'),'Nested attack restores scoped spatial context');
assert(body('die').includes('UnitLifecycle.defeat('),'Death entry delegates to the real lifecycle owner');
assert(!source.includes('explosiveDeathImpact'),'Removed unreachable historical postmortem behavior');
assert(!source.includes("if(c.pattern==='jumpSlam'"),'Pattern motion dispatches its capability');
// The SDK tick adapter is the only gameplay clock. Feature-local projectile
// steps are capabilities; historical global step continuations are not.
assert(!/^function step\(/m.test(source),'No retired single-player scheduler');
assert(!/(?<![\w.$])step\s*=\s*function\b/.test(source),'No layered global step overrides');
assert(!/\b(?:\w+Core|core|rarityLegacy)\.step\b/.test(source),'No captured legacy scheduler continuation');
assert(!/\bsoundStep\b/.test(source),'Audio does not wrap a second simulation clock');
for(const capture of source.matchAll(/const (\w+Core|core|rarityLegacy)=\{([\s\S]*?)\};/g)){
 assert(!/(?:^|,)\s*step\s*(?:,|$)/.test(capture[2]),`${capture[1]} does not retain a retired scheduler`);
}
assert(body('bloomRunTick').includes('WorldSimulation.step(CONFIG.sim.fixedStep,inputs)'),'SDK tick calls shared world authority');
assert(!/\b(?:spatialStepDepth|spatialCaptureInitial)\b/.test(source),'Presentation has no abandoned nested scheduler state');
for(const line of source.split('\n').filter(line=>line.includes('window.__army'))){
 assert(!/(?:^|[,{])step[,}]/.test(line),'Public debug API cannot expose the retired scheduler');
}
assert(source.includes('step:bloomRunTick'),'Public tick API uses canonical SDK context');
console.log('PASS stable combat entries, definition-owned capabilities, explicit stages, controller lifecycle and one simulation scheduler');
