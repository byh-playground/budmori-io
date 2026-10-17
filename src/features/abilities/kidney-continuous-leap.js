// This feature owns its catalog definition and pure text presentation.
// Formatting receives domain values; it imports no DOM or renderer adapters.
class KidneyContinuousLeapPresentation {
    label(_definition, value) {
        return `착지 후 도약 쿨다운 초기화 ${Math.round(value * 100)}%`;
    }
    title(value) {
        return `초기화 ${Math.round(value * 100)}%`;
    }
}

export const KIDNEY_CONTINUOUS_LEAP_FEATURE = Object.freeze({
    definition: Object.freeze({
        id: 'kidney-continuous-leap',
        species: 2,
        name: '연속 도약',
        description: '착지 후 확률적으로 도약 재사용 대기시간을 초기화합니다.',
        rootTier: 3,
        powerValues: Object.freeze([0.2, 0.35, 0.5, 0.65]),
        gradeThresholds: Object.freeze([3, 2, 1]),
    }),
    presentation: Object.freeze(new KidneyContinuousLeapPresentation()),
});
