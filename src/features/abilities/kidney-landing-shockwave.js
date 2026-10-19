// This feature owns its catalog definition and pure text presentation.
// Formatting receives domain values; it imports no DOM or renderer adapters.
class KidneyLandingShockwavePresentation {
    label(_definition, value) {
        return `충격파 피해 공격력 ×${value} · 반경 기본 사거리 ×${value}`;
    }
    title(value) {
        return `충격파 ×${value}`;
    }
}

export const KIDNEY_LANDING_SHOCKWAVE_FEATURE = Object.freeze({
    definition: Object.freeze({
        id: 'kidney-landing-shockwave',
        species: 2,
        name: '착지 충격파',
        description: '도약 착지 지점에서 기본 공격력과 사거리 기준의 충격파를 내요.',
        rootTier: 3,
        powerValues: Object.freeze([1, 1.5, 2]),
        gradeThresholds: Object.freeze([3, 2, 1]),
    }),
    presentation: Object.freeze(new KidneyLandingShockwavePresentation()),
});
