import { SPECIES_ABILITY_DEFINITIONS } from './ability-definitions.js';
import { PEA_RECOVERY_BOOST_FEATURE } from '../features/abilities/pea-recovery-boost.js';
import { PeaRecoveryBoostModel } from '../features/abilities/pea-recovery-boost/model.js';
import { KIDNEY_CONTINUOUS_LEAP_FEATURE } from '../features/abilities/kidney-continuous-leap.js';
import { KidneyLeapModel } from '../features/abilities/kidney-leap/model.js';
import { CHESTNUT_THORNS_FEATURE } from '../features/abilities/chestnut-thorns/definition.js';
import { ChestnutThornsModel } from '../features/abilities/chestnut-thorns/model.js';
import { PEANUT_DEATH_SPLIT_FEATURE } from '../features/abilities/peanut-death-split/definition.js';
import { PeanutDeathSplitModel } from '../features/abilities/peanut-death-split/model.js';
import { WALNUT_RAW_GUARD_FEATURE } from '../features/abilities/walnut-raw-guard/definition.js';
import { WalnutRawGuardModel } from '../features/abilities/walnut-raw-guard/model.js';
import { CORN_ATTACHMENT_FEATURE } from '../features/abilities/corn-attachment/definition.js';
import { CornAttachmentModel } from '../features/abilities/corn-attachment/model.js';
import { RICE_LOW_HEALTH_HARVEST_FEATURE } from '../features/abilities/rice-low-health-harvest.js';
import { RiceCriticalModel } from '../features/abilities/rice-critical/model.js';
import { WHEAT_COMMAND_CRIT_FEATURE } from '../features/abilities/wheat-command-crit.js';
import { WheatCommandModel } from '../features/abilities/wheat-command/model.js';
import { BARLEY_ARMOR_BREAK_FEATURE } from '../features/abilities/barley-armor-break.js';
import { BarleyArmorShredModel } from '../features/abilities/barley-shred/model.js';
import { ABILITY_PRESENTATION_OVERRIDES } from './ability-presentations.js';

// The feature catalog joins each ability's pure definition, model, and view
// adapter once; combat and UI consumers select the compiled feature by id.
const ABILITY_MODELS = Object.freeze([
    [PEA_RECOVERY_BOOST_FEATURE, PeaRecoveryBoostModel],
    [KIDNEY_CONTINUOUS_LEAP_FEATURE, KidneyLeapModel],
    [CHESTNUT_THORNS_FEATURE, ChestnutThornsModel],
    [PEANUT_DEATH_SPLIT_FEATURE, PeanutDeathSplitModel],
    [WALNUT_RAW_GUARD_FEATURE, WalnutRawGuardModel],
    [CORN_ATTACHMENT_FEATURE, CornAttachmentModel],
    [RICE_LOW_HEALTH_HARVEST_FEATURE, RiceCriticalModel],
    [WHEAT_COMMAND_CRIT_FEATURE, WheatCommandModel],
    [BARLEY_ARMOR_BREAK_FEATURE, BarleyArmorShredModel],
]);
const ABILITY_FEATURES = Object.freeze(
    SPECIES_ABILITY_DEFINITIONS.map((definition, index) =>
        Object.freeze({ definition, model: ABILITY_MODELS[index][1] }),
    ),
);
const ABILITY_FEATURE_BY_ID = new Map(ABILITY_FEATURES.map((feature) => [feature.definition.id, feature]));
const ABILITY_PRESENTATION_BY_ID = new Map(
    ABILITY_FEATURES.map((feature) => [
        feature.definition.id,
        ABILITY_PRESENTATION_OVERRIDES.get(feature.definition.id),
    ]),
);
export { SPECIES_ABILITY_DEFINITIONS };
export function abilityFeatureFor(abilityId) {
    return ABILITY_FEATURE_BY_ID.get(abilityId) || null;
}
export function abilityPresentationFor(abilityId) {
    return ABILITY_PRESENTATION_BY_ID.get(abilityId);
}
