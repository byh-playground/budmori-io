// This feature owns its catalog definition and pure text presentation.
// Formatting receives domain values; it imports no DOM or renderer adapters.
class BarleyArmorBreakPresentation {
    label(definition, value) {
        return `기본 공격 적중 시 방어도 ${Math.round(value * 100)}% 감소 · ${definition.durationSeconds}초`;
    }
    title(value) {
        return `방어도 ${Math.round(value * 100)}% 감소`;
    }
}

export const BARLEY_ARMOR_BREAK_FEATURE = Object.freeze({
    definition: Object.freeze({
        id: 'barley-armor-break',
        species: 8,
        name: '도리깨 갑주 파쇄',
        description: '도리깨 기본 공격 적중 시 적의 방어도를 낮춰 5초 동안 피해를 더 받게 합니다.',
        rootTier: 3,
        powerValues: Object.freeze([0.25, 0.5, 0.75]),
        durationSeconds: 5,
        gradeThresholds: Object.freeze([3, 2, 1]),
    }),
    presentation: Object.freeze(new BarleyArmorBreakPresentation()),
});
