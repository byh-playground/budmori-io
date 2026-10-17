import {FACTION_CONFIG} from './factions.js';

// Presentation-only status derived from existing Farm simulation fields.
// Breeding sets meals to zero; merged offspring keep the one meal assigned at birth.
export function farmBreedingCooldown(unit, world, defaultDuration = 10, result = {}) {
  if (world?.scene !== 'farm' || unit?.hp <= 0 || unit?.down > 0 || unit?.cooldown <= 0 || unit?.meals !== 0) return null;
  const duration = unit.cooldownDuration || world.breedCooldownDuration?.() || defaultDuration;
  const remaining = Math.max(0, unit.cooldown);
  result.remaining = remaining; result.duration = duration; result.progress = Math.max(0, Math.min(1, 1 - remaining / duration));
  return result;
}

// The existing down value owns Farm recovery. Raid casualties stay down until
// return: their recent authoritative hit only times the brief visual recoil.
// The caller reuses result; this presentation query never starts a timer.
export function unitRestPresentation(unit, world, duration, result) {
  if (unit.faction !== FACTION_CONFIG.PLAYER || unit.isBattleOnlySummon || unit.hp > 0) return null;
  const recovering = world.scene === 'farm' && unit.down > 0;
  let elapsed = recovering ? Math.max(0, duration - unit.down) : Infinity;
  if (!recovering) {
    for (let i = world.notices.length - 1; i >= 0; i--) {
      const event = world.notices[i];
      if (!Number.isFinite(event.time)) continue;
      const age = world.time - event.time;
      if (age >= .5) break;
      if (event.kind === 'unit-hit' && event.unit === unit.id && age >= 0) { elapsed = age; break; }
    }
  }
  result.phase = elapsed < .5 ? 'defeat' : recovering && unit.down <= .5 ? 'wake' : 'sleep';
  result.elapsed = result.phase === 'defeat' ? elapsed : result.phase === 'wake' ? .5 - unit.down : recovering ? elapsed - .5 : world.time;
  result.progress = recovering ? Math.max(0, Math.min(1, 1 - unit.down / duration)) : -1;
  return result;
}
