export const CHESTNUT_THORNS_FEATURE = Object.freeze({
    definition: Object.freeze({
        id: 'chestnut-target-thorns',
        species: 3,
        availableByDefault: true,
        minimumTier: 1,
        name: '대상 가시 연사',
        description:
            '현재 공격 대상을 향해 3초마다 가시를 발사합니다. 가시는 0.1초 간격으로 나가며 각각 공격력 100% 피해를 줍니다.',
        powerValues: Object.freeze([1, 2, 3]),
        cooldownTicks: 60,
        spacingTicks: 2,
        attackProfile: Object.freeze({
            kind: 'chestnut-thorns',
            timing: Object.freeze({ windup: 0, recovery: 0.2 }),
            range: 1.45,
            skillMultiplier: 1,
            projectileCount: 0,
            bounces: 0,
        }),
    }),
});
