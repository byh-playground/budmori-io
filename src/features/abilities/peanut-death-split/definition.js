export const PEANUT_DEATH_SPLIT_FEATURE = Object.freeze({
    definition: Object.freeze({
        id: 'peanut-death-split',
        species: 4,
        availableByDefault: true,
        minimumTier: 1,
        name: { ko: '사망 분열', en: 'Death Split' },
        description: {
            ko: '전투 중 사망하면 T1 분열체 2마리를 남겨요. 강화마다 분열체의 체력과 공격력이 각각 1.5배가 돼요.',
            en: 'Leaves 2 T1 halves when it dies in battle. Each upgrade multiplies their HP and Attack by 1.5.',
        },
        powerValues: Object.freeze([1, 1.5, 2.25]),
        childCount: 2,
    }),
});
