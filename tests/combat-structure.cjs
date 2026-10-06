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
assert(body('die').includes('combatDefinition(t).afterDeath?.(')&&!body('die').includes("t.type==='pillbug'"),'Postmortem behavior belongs to definition');
assert(!source.includes("if(c.pattern==='jumpSlam'"),'Pattern motion dispatches its capability');
console.log('PASS stable combat entries, definition-owned capabilities, explicit stages and controller lifecycle');
