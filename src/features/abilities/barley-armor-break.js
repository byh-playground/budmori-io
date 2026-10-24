export const BARLEY_ARMOR_BREAK_FEATURE = Object.freeze({
    definition: Object.freeze({
        id: 'barley-armor-break',
        species: 8,
        availableByDefault: true,
        minimumTier: 1,
        name: '도리깨 방어 깨기',
        description: '도리깨 기본 공격이 적중하면 방어력를 고정 수치만큼 낮춰요. 각 적중의 감소가 따로 만료돼요.',
        rootTier: 1,
        powerValues: Object.freeze([1, 2, 3]),
        durationTicks: 60,
    }),
});
