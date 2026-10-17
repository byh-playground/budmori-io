import { PEA_DEATH_SPLIT_FEATURE } from './features/abilities/pea-death-split.js';
import { CORN_BURST_FIRE_FEATURE } from './features/abilities/corn-burst-fire.js';
import { CORN_POPCORN_CHAIN_FEATURE } from './features/abilities/corn-popcorn-chain.js';
import { CHESTNUT_SPIKE_FAN_FEATURE } from './features/abilities/chestnut-spike-fan.js';
import { KIDNEY_CONTINUOUS_LEAP_FEATURE } from './features/abilities/kidney-continuous-leap.js';
import { KIDNEY_LANDING_SHOCKWAVE_FEATURE } from './features/abilities/kidney-landing-shockwave.js';
import { PEANUT_SEPARATED_ASSAULT_FEATURE } from './features/abilities/peanut-separated-assault.js';
import { WALNUT_GUARD_SLAM_FEATURE } from './features/abilities/walnut-guard-slam.js';
import { RICE_LOW_HEALTH_HARVEST_FEATURE } from './features/abilities/rice-low-health-harvest.js';
import { WHEAT_COMMAND_CRIT_FEATURE } from './features/abilities/wheat-command-crit.js';
import { BARLEY_ARMOR_BREAK_FEATURE } from './features/abilities/barley-armor-break.js';

// This is the composition root only. Each feature owns its definition and
// presentation implementation; model consumers receive the unchanged pure data.
const ABILITY_FEATURES = Object.freeze([
    PEA_DEATH_SPLIT_FEATURE,
    CORN_BURST_FIRE_FEATURE,
    CORN_POPCORN_CHAIN_FEATURE,
    CHESTNUT_SPIKE_FAN_FEATURE,
    KIDNEY_CONTINUOUS_LEAP_FEATURE,
    KIDNEY_LANDING_SHOCKWAVE_FEATURE,
    PEANUT_SEPARATED_ASSAULT_FEATURE,
    WALNUT_GUARD_SLAM_FEATURE,
    RICE_LOW_HEALTH_HARVEST_FEATURE,
    WHEAT_COMMAND_CRIT_FEATURE,
    BARLEY_ARMOR_BREAK_FEATURE,
]);
export const SPECIES_ABILITY_DEFINITIONS = Object.freeze(ABILITY_FEATURES.map((feature) => feature.definition));
const ABILITY_FEATURE_BY_ID = new Map(ABILITY_FEATURES.map((feature) => [feature.definition.id, feature]));
export function abilityPresentationFor(abilityId) {
    return ABILITY_FEATURE_BY_ID.get(abilityId)?.presentation;
}
