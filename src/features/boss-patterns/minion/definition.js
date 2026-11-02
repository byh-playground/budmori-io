import { BOSS_PATTERN_CONFIG } from '../../../boss/boss-patterns.js';

// The patterns only boss minions cast (boss/boss-minions.js); the config lives with the boss kit.
const MINION_FEATURE = (id) => Object.freeze({ id, config: BOSS_PATTERN_CONFIG[id] });
export const MINION_FEATURES = Object.freeze({
    bolt: MINION_FEATURE('minion.bolt'),
    mortar: MINION_FEATURE('minion.mortar'),
    blast: MINION_FEATURE('minion.blast'),
});
// Where the bolt is `elapsed` seconds into its active phase, as a 0..1 share of its flight (model and render share it).
export function boltFlight(start, target, elapsed, config) {
    const SECONDS = Math.hypot(target.x - start.x, target.y - start.y) / config.speed;
    return SECONDS > 1e-6 ? Math.min(1, elapsed / SECONDS) : 1;
}
