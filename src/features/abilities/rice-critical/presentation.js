import { COMMON_UNIT_STAT_DEFAULTS } from '../../../units/unit-stats.js';

export class RiceCriticalPresentation {
    label(_definition, value) {
        return `잃은 체력 비율에 따라 치명타 확률 최대 +${Math.round(value * 100)}%p · 치명타 피해 ×${COMMON_UNIT_STAT_DEFAULTS.critMultiplier}`;
    }
    title(value) {
        return `치명타 최대 +${Math.round(value * 100)}%p`;
    }
}
