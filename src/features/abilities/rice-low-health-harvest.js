// This feature owns its catalog definition and pure text presentation.
// Formatting receives domain values; it imports no DOM or renderer adapters.
class RiceLowHealthHarvestPresentation {
    label(definition, value) {
        return `HP ${Math.round(definition.targetHpThreshold * 100)}% 이하 대상에게 기본 피해 총 ${value}×`;
    }
    title(value) {
        return `수확 피해 ×${value}`;
    }
}

export const RICE_LOW_HEALTH_HARVEST_FEATURE = Object.freeze({
    definition: Object.freeze({
        id: 'rice-low-health-harvest',
        species: 6,
        name: '수확 낫',
        description: '낫 기본 공격이 체력이 절반 이하인 적에게 더 큰 피해를 줍니다.',
        rootTier: 3,
        powerValues: Object.freeze([1.5, 1.75, 2]),
        targetHpThreshold: 0.5,
        gradeThresholds: Object.freeze([3, 2, 1]),
    }),
    presentation: Object.freeze(new RiceLowHealthHarvestPresentation()),
});
