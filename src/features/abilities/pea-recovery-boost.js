// The pea's basic ability is a recovery reward. Its pure model values are
// consumed by the unit capability composition and the deterministic simulator.
export const PEA_RECOVERY_BOOST_FEATURE = Object.freeze({
    definition: Object.freeze({
        id: 'pea-recovery-boost',
        species: 0,
        availableByDefault: true,
        minimumTier: 1,
        name: { ko: '빠른 복귀', en: 'Quick Return' },
        description: {
            ko: '적에게 밀려난 뒤 움직일 수 있게 되면 2초 동안 이동 속도가 증가해요.',
            en: 'After being knocked back, gains Move Speed for 2s once it can move.',
        },
        powerValues: Object.freeze([0.25, 0.35, 0.55]),
    }),
    model: Object.freeze({
        durationTicks: 40,
        multiplierForBonus(bonus) {
            return 1 + bonus;
        },
    }),
});
