// This feature owns its catalog definition and pure text presentation.
// Formatting receives domain values; it imports no DOM or renderer adapters.
export const KIDNEY_CONTINUOUS_LEAP_FEATURE = Object.freeze({
    definition: Object.freeze({
        id: 'kidney-continuous-leap',
        species: 2,
        availableByDefault: true,
        minimumTier: 1,
        name: '연속 도약',
        description:
            '가까운 적에게도 준비되면 도약합니다. 공중에서는 지면 휩쓸기를 피하고, 착지 시 확률적으로 재사용 대기를 초기화합니다.',
        powerValues: Object.freeze([0.2, 0.35, 0.5, 0.65]),
    }),
    model: Object.freeze({
        specialAttackProfile: Object.freeze({
            kind: 'leap',
            timing: Object.freeze({ windup: 0.32, recovery: 0.9 }),
            range: 2.5,
            skillMultiplier: 1.3,
            projectileCount: 0,
            bounces: 0,
        }),
        cooldownTicks: 60,
    }),
});
