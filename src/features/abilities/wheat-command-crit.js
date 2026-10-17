import { COMMON_UNIT_STAT_DEFAULTS } from '../../unit-stats.js';

// This feature owns its catalog definition and pure text presentation.
// Formatting receives domain values; it imports no DOM or renderer adapters.
class WheatCommandCritPresentation {
    label(definition, value) {
        return `기본 공격 적중 시 자신 포함 반경 기본 사거리 ×${definition.radiusRangeRatio} 안의 생존 아군 치명타 +${Math.round(value * 100)}%p · ${definition.durationSeconds}초 · 치명타 피해 ×${COMMON_UNIT_STAT_DEFAULTS.critMultiplier} · 중첩 시 가장 강한 효과`;
    }
    title(value) {
        return `치명타 +${Math.round(value * 100)}%p`;
    }
}

export const WHEAT_COMMAND_CRIT_FEATURE = Object.freeze({
    definition: Object.freeze({
        id: 'wheat-command-crit',
        species: 7,
        name: '로마 군단장의 지휘',
        description: '로마 군단장처럼 주변 아군을 지휘합니다. 기본 공격 적중 후 주변 아군의 치명타 확률을 높입니다.',
        rootTier: 3,
        powerValues: Object.freeze([0.1, 0.25, 0.5]),
        durationSeconds: 5,
        radiusRangeRatio: 2,
        gradeThresholds: Object.freeze([3, 2, 1]),
    }),
    presentation: Object.freeze(new WheatCommandCritPresentation()),
});
