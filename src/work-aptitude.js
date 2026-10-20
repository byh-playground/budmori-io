// What each species is good at: a level from 0 to 3 for every kind of work. 0 cannot do it; the level only changes
// how fast the work goes, and decides who is picked first for a role (see APTITUDE_ORDER). All the numbers live
// here so they can be tuned in one place.
export const WORK_KINDS = Object.freeze(['build', 'food', 'wood', 'stone', 'explore']);
// Roles pick their workers in this order, the best at the work first.
export const APTITUDE_ORDER = WORK_KINDS;
export const APTITUDE_SPEED = Object.freeze([0, 0.7, 1, 1.4]);
// species id -> levels in WORK_KINDS order: build, food, wood, stone, explore
export const SPECIES_APTITUDE = Object.freeze([
    Object.freeze([1, 2, 1, 0, 3]), // 콩: light scout
    Object.freeze([0, 3, 1, 1, 2]), // 옥수수: food
    Object.freeze([2, 0, 0, 3, 2]), // 팥: shatters rock
    Object.freeze([1, 0, 3, 2, 1]), // 밤톨: lumberjack
    Object.freeze([3, 0, 2, 0, 2]), // 땅콩: charges at jobs
    Object.freeze([3, 0, 1, 3, 0]), // 호두: sturdy builder and quarryman
    Object.freeze([1, 3, 1, 0, 2]), // 쌀: food
    Object.freeze([0, 3, 1, 1, 2]), // 밀: food
    Object.freeze([2, 1, 3, 1, 0]), // 보리: lumber generalist
]);
export function aptitudeOf(species, kind) {
    return SPECIES_APTITUDE[species]?.[WORK_KINDS.indexOf(kind)] ?? 2;
}
export function aptitudeSpeed(species, kind) {
    return APTITUDE_SPEED[aptitudeOf(species, kind)];
}
// Picks `count` workers for a role from the pool: the best at the work first (ties go to the lowest id, so the
// choice is stable). Someone who cannot do the work (level 0) is only picked when nobody else is left, and then
// works at the lowest speed rather than not at all.
export const FALLBACK_LEVEL = 1;
export function pickForRole(pool, role, count) {
    const KIND = role,
        RANKED = pool
            .map((unit) => ({ unit, level: aptitudeOf(unit.species, KIND) }))
            .sort((a, b) => b.level - a.level || a.unit.id - b.unit.id);
    return RANKED.slice(0, Math.max(0, count)).map((entry) => ({
        unit: entry.unit,
        level: entry.level > 0 ? entry.level : FALLBACK_LEVEL,
    }));
}
