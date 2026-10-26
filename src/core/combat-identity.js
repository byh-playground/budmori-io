// Actor identity is independent of the HUD's current focus. Generations reject
// stale attacks after an actor ID is reused on another floor.
export function isBossActorId(id) {
    return typeof id === 'string' && /^boss(?:-[1-9][0-9]*)?$/.test(id) && id.length <= 16;
}
export function isCombatActorId(id, allowZero = false) {
    return isBossActorId(id) || (Number.isSafeInteger(id) && id >= (allowZero ? 0 : 1));
}
