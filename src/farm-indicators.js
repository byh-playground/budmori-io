// Presentation-only status derived from existing Farm simulation fields.
// Breeding sets meals to zero; merged offspring keep the one meal assigned at birth.
export function farmBreedingCooldown(unit, world, defaultDuration = 10) {
  if (world?.scene !== 'farm' || unit?.hp <= 0 || unit?.down > 0 || unit?.cooldown <= 0 || unit?.meals !== 0) return null;
  const duration = unit.cooldownDuration || world.breedCooldownDuration?.() || defaultDuration;
  const remaining = Math.max(0, unit.cooldown);
  return { remaining, duration, progress: Math.max(0, Math.min(1, 1 - remaining / duration)) };
}

export function farmSleepSeconds(unit, scene) {
  if (scene !== 'farm' || unit?.hp > 0 || !Number.isFinite(unit?.down) || unit.down <= 0) return 0;
  return Math.ceil(unit.down);
}

export function splitArcProgress(progress) {
  const sweep = Math.PI * 2 * Math.max(0, Math.min(1, Number(progress) || 0));
  return {
    rear: sweep > 0 ? [0, Math.min(Math.PI, sweep)] : null,
    front: sweep > Math.PI ? [Math.PI, sweep] : null
  };
}
