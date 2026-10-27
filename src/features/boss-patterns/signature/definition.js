import { BOSS_PATTERN_CONFIG } from '../../../boss/boss-patterns.js';

// One feature per element band's signature skill; the config (element, timings, damage) lives with the boss kit.
const SIGNATURE_FEATURE = (id) => Object.freeze({ id, config: BOSS_PATTERN_CONFIG[id] });
export const SIGNATURE_FEATURES = Object.freeze({
    water: SIGNATURE_FEATURE('signature.water'),
    grass: SIGNATURE_FEATURE('signature.grass'),
    fire: SIGNATURE_FEATURE('signature.fire'),
    ice: SIGNATURE_FEATURE('signature.ice'),
    lightning: SIGNATURE_FEATURE('signature.lightning'),
});
