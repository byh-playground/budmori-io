// This feature owns its catalog definition and pure text presentation.
// Formatting receives domain values; it imports no DOM or renderer adapters.
class RiceLowHealthHarvestPresentation {
    label(definition, value, _level, profile) {
        return `HP ${Math.round(definition.targetHpThreshold * 100)}% 이하 대상에게 낫 공격 ATK ×${profile.skillMultiplier * value}`;
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
        description: '낫으로 베는 근접형입니다. 체력이 낮은 적에게 수확 추가 피해를 줍니다.',
        rootTier: 3,
        powerValues: Object.freeze([1.5, 1.75, 2]),
        targetHpThreshold: 0.5,
        gradeThresholds: Object.freeze([3, 2, 1]),
    }),
    presentation: Object.freeze(new RiceLowHealthHarvestPresentation()),
});
