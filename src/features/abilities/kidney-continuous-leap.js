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
        description:
            '가까운 적에게도 준비되면 도약합니다. 공중에서는 지면 휩쓸기를 피하고, 착지 시 확률적으로 재사용 대기를 초기화합니다.',
        rootTier: 3,
        powerValues: Object.freeze([0.2, 0.35, 0.5, 0.65]),
        gradeThresholds: Object.freeze([3, 2, 1]),
    }),
    presentation: Object.freeze(new KidneyContinuousLeapPresentation()),
});
