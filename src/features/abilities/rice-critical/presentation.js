import { COMMON_UNIT_STAT_DEFAULTS } from '../../../units/unit-stats.js';
import { ABILITIES } from '../../../i18n/messages/abilities.js';

export class RiceCriticalPresentation {
    label(_definition, value) {
        return ABILITIES.riceCriticalLabel({ value, multiplier: COMMON_UNIT_STAT_DEFAULTS.critMultiplier });
    }
    title(value) {
        return ABILITIES.riceCriticalTitle({ value });
    }
}
