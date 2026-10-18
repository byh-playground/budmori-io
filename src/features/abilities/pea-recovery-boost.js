// The pea's basic ability is a recovery reward. Its pure model values are
// consumed by the unit capability composition and the deterministic simulator.
class PeaRecoveryBoostPresentation {
    label(_definition, value) {
        return `\uC801 \uACF5\uACA9\uC73C\uB85C \uAC15\uC81C \uC774\uB3D9 \uD6C4 \uC774\uB3D9 \uC18D\uB3C4 +${Math.round(value * 100)}%`;
    }
    title(value) {
        return `\uD68C\uBCF5 \uAE30\uB3D9 +${Math.round(value * 100)}%`;
    }
}

export const PEA_RECOVERY_BOOST_FEATURE = Object.freeze({
    definition: Object.freeze({
        id: 'pea-recovery-boost',
        species: 0,
        defaultUnlocked: true,
        name: '\uD68C\uBCF5 \uAE30\uB3D9',
        description:
            '\uC801 \uACF5\uACA9\uC73C\uB85C \uAC15\uC81C \uC774\uB3D9\uC774 \uB05D\uB098\uBA74 2\uCD08 \uB3D9\uC548 \uC774\uB3D9 \uC18D\uB3C4\uAC00 \uC99D\uAC00\uD569\uB2C8\uB2E4.',
        rootTier: 1,
        powerValues: Object.freeze([0.25, 0.35, 0.55]),
        gradeThresholds: Object.freeze([1]),
    }),
    model: Object.freeze({
        durationTicks: 40,
        multiplierForBonus(bonus) {
            return 1 + bonus;
        },
    }),
    presentation: Object.freeze(new PeaRecoveryBoostPresentation()),
});
