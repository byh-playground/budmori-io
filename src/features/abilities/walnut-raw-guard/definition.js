export const WALNUT_RAW_GUARD_FEATURE = Object.freeze({
    definition: Object.freeze({
        id: 'walnut-raw-guard',
        species: 5,
        availableByDefault: true,
        minimumTier: 1,
        name: '방어와 반격',
        description:
            '5초마다 2초간 방어력 50을 얻어요. 방어 중 받은 방어 적용 전 피해를 모아 다음 망치에 100/150/225% 추가하며 공격력의 3배까지 적용해요.',
        powerValues: Object.freeze([1, 1.5, 2.25]),
        cooldownTicks: 100,
        durationTicks: 40,
        armorBonus: 50,
        maxBonusAttackMultiples: 3,
    }),
});
