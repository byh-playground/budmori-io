// This feature owns its catalog definition and pure text presentation.
// Formatting receives domain values; it imports no DOM or renderer adapters.
class WheatCommandCritPresentation {
    label(definition, value) {
        return `기본 공격 적중 시 자신 포함 반경 기본 사거리 ×${definition.radiusRangeRatio} 안의 생존 아군 치명타 +${Math.round(value * 100)}%p · ${definition.durationSeconds}초`;
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
        description: '기본 공격 적중 시 자신과 가까운 생존 아군의 치명타 확률을 5초 동안 높입니다.',
        rootTier: 3,
        powerValues: Object.freeze([0.1, 0.25, 0.5]),
        durationSeconds: 5,
        radiusRangeRatio: 2,
        gradeThresholds: Object.freeze([3, 2, 1]),
    }),
    presentation: Object.freeze(new WheatCommandCritPresentation()),
});
