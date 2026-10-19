// The pea's basic ability is a recovery reward. Its pure model values are
// consumed by the unit capability composition and the deterministic simulator.
export const PEA_RECOVERY_BOOST_FEATURE = Object.freeze({
    definition: Object.freeze({
        id: 'pea-recovery-boost',
        species: 0,
        availableByDefault: true,
        minimumTier: 1,
        name: '회복 기동',
        description: '적 공격으로 강제 이동이 끝나면 2초 동안 이동 속도가 증가해요.',
        powerValues: Object.freeze([0.25, 0.35, 0.55]),
    }),
    model: Object.freeze({
        durationTicks: 40,
        multiplierForBonus(bonus) {
            return 1 + bonus;
        },
    }),
});
