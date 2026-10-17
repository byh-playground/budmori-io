import {Garden,Unit,createUnitAttackCycle} from './farm-model.js';
import {normalizeSnapshot} from './farm-snapshot-migrations.js';
import {validateSnapshot} from './farm-snapshot-validation.js';
export {snapshot} from './farm-snapshot.js';
export {normalizeSnapshot,validateSnapshot};

// Only hydration constructs runtime owners. DTO shapes and validation do not
// inspect constructors or copy caches back into the persisted field contract.
export function restore(raw,{migrateLegacyRaid=false}={}){
 raw=normalizeSnapshot(raw,{migrateLegacyRaid});validateSnapshot(raw);
 const g=new Garden();
 Object.assign(g,structuredClone(raw));g.rng=new globalThis.BloomGamekitDeterministic.SeededPRNG(raw.rng.state);if(g.boss.patternRuntime.active)g.boss.patternRuntime.active.hitIds=new Set(raw.boss.patternRuntime.active.hitIds);
  g.units=raw.units.map(data=>{const u=Object.assign(new Unit(data.id,data.species,data.tier,data.x,data.y),structuredClone(data));u.ability=Object.assign(createUnitAttackCycle(u),structuredClone(data.ability));return u});g.reconcileMateReservations();return g;
}
