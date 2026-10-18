export const BARLEY_ARMOR_BREAK_FEATURE = Object.freeze({
    definition: Object.freeze({
        id: 'barley-armor-break',
        species: 8,
        defaultUnlocked: true,
        name: '도리깨 갑주 파쇄',
        description: '도리깨 기본 공격이 적중하면 방어도를 고정 수치만큼 낮춥니다. 각 적중의 감소가 따로 만료됩니다.',
        rootTier: 1,
        powerValues: Object.freeze([1, 2, 3]),
        durationTicks: 60,
        gradeThresholds: Object.freeze([1]),
    }),
});
