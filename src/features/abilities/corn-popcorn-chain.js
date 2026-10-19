// This feature owns its catalog definition and pure text presentation.
// Formatting receives domain values; it imports no DOM or renderer adapters.
class CornPopcornChainPresentation {
    label(definition, value, level) {
        const RADIUS_MULTIPLIER = definition.radiusMultipliers[level] || definition.radiusMultipliers[0];
        return `착탄 ${definition.fuseSeconds}초 후 · 팝콘 접촉 즉시 연쇄 · 피해 ATK ×${value} · 반경 기본 사거리 ×${definition.baseRangeFraction} ×${RADIUS_MULTIPLIER}`;
    }
    title(value) {
        return `ATK ×${value} 폭발`;
    }
}

export const CORN_POPCORN_CHAIN_FEATURE = Object.freeze({
    definition: Object.freeze({
        id: 'corn-popcorn-chain',
        species: 1,
        name: '팝콘 연쇄 폭발',
        description: '착탄한 알갱이가 잠시 뒤 폭발하고, 주변 팝콘과 닿으면 즉시 연쇄 폭발해요.',
        rootTier: 3,
        powerValues: Object.freeze([0.5, 1, 1.5]),
        radiusMultipliers: Object.freeze([1, 1.5, 2]),
        fuseSeconds: 1,
        baseRangeFraction: 0.25,
        gradeThresholds: Object.freeze([3, 2, 1]),
    }),
    presentation: Object.freeze(new CornPopcornChainPresentation()),
});
