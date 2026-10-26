import { FACTION_CONFIG } from '../core/factions.js';

// Presentation-only status derived from existing Farm simulation fields.
// Breeding sets meals to zero; merged offspring keep the one meal assigned at birth.
export function farmBreedingCooldown(unit, world, defaultDuration = 10, result = {}) {
    if (world?.scene !== 'farm' || unit?.hp <= 0 || unit?.down > 0 || unit?.cooldown <= 0 || unit?.meals !== 0) {
        return null;
    }
    const DURATION = unit.cooldownDuration || world.breedCooldownDuration?.() || defaultDuration;
    const REMAINING = Math.max(0, unit.cooldown);
    result.remaining = REMAINING;
    result.duration = DURATION;
    result.progress = Math.max(0, Math.min(1, 1 - REMAINING / DURATION));
    return result;
}

// The existing down value owns Farm recovery. Raid casualties stay down until
// return: their recent authoritative hit only times the brief visual recoil.
// The caller reuses result; this presentation query never starts a timer.
export function unitRestPresentation(unit, world, duration, result) {
    if (unit.faction !== FACTION_CONFIG.PLAYER || unit.isBattleOnlySummon || unit.hp > 0) {
        return null;
    }
    const RECOVERING = world.scene === 'farm' && unit.down > 0;
    let elapsed = RECOVERING ? Math.max(0, duration - unit.down) : Infinity;
    if (!RECOVERING) {
        for (let i = world.notices.length - 1; i >= 0; i--) {
            const EVENT = world.notices[i];
            if (!Number.isFinite(EVENT.time)) {
                continue;
            }
            const AGE = world.time - EVENT.time;
            if (AGE >= 0.5) {
                break;
            }
            if (EVENT.kind === 'unit-hit' && EVENT.unit === unit.id && AGE >= 0) {
                elapsed = AGE;
                break;
            }
        }
    }
    result.phase = elapsed < 0.5 ? 'defeat' : RECOVERING && unit.down <= 0.5 ? 'wake' : 'sleep';
    result.elapsed =
        result.phase === 'defeat'
            ? elapsed
            : result.phase === 'wake'
              ? 0.5 - unit.down
              : RECOVERING
                ? elapsed - 0.5
                : world.time;
    result.progress = RECOVERING ? Math.max(0, Math.min(1, 1 - unit.down / duration)) : -1;
    return result;
}
