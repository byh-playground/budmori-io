// Presentation-only status derived from existing Farm simulation fields.
// Breeding sets meals to zero; merged offspring keep the one meal assigned at birth.
export function farmBreedingCooldown(unit, world, defaultDuration = 10, result = {}) {
  if (world?.scene !== 'farm' || unit?.hp <= 0 || unit?.down > 0 || unit?.cooldown <= 0 || unit?.meals !== 0) return null;
  const duration = unit.cooldownDuration || world.breedCooldownDuration?.() || defaultDuration;
  const remaining = Math.max(0, unit.cooldown);
  result.remaining = remaining; result.duration = duration; result.progress = Math.max(0, Math.min(1, 1 - remaining / duration));
  return result;
}

export function farmSleepSeconds(unit, scene) {
  if (scene !== 'farm' || unit?.hp > 0 || !Number.isFinite(unit?.down) || unit.down <= 0) return 0;
  return Math.ceil(unit.down);
}

export function sevenSegmentDigitLines(digit,x,y,size) {
  const segments={
    0:'abcdef',1:'bc',2:'abged',3:'abgcd',4:'fgbc',5:'afgcd',6:'afgecd',7:'abc',8:'abcdefg',9:'abfgcd'
  }[digit]||'';
  const h=size*2.6,w=size*1.75,points={
    a:[{x:x-w/2,y:y-h},{x:x+w/2,y:y-h}],
    b:[{x:x+w/2,y:y-h},{x:x+w/2,y}],
    c:[{x:x+w/2,y},{x:x+w/2,y:y+h}],
    d:[{x:x-w/2,y:y+h},{x:x+w/2,y:y+h}],
    e:[{x:x-w/2,y},{x:x-w/2,y:y+h}],
    f:[{x:x-w/2,y:y-h},{x:x-w/2,y}],
    g:[{x:x-w/2,y},{x:x+w/2,y}]
  };
  return Array.from(segments,segment=>points[segment]);
}
