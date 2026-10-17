// This feature owns its catalog definition and pure text presentation.
// Formatting receives domain values; it imports no DOM or renderer adapters.
// Initial balance draft values remain adjustable, not final user-approved numbers.
class WalnutGuardSlamPresentation {
    label(definition, value, level) {
        return `첫 방어 피격 피해 −${Math.round((1 - definition.receivedDamageMultiplier) * 100)}%·넉백 −${Math.round((1 - definition.receivedKnockbackMultiplier) * 100)}% · 다음 공격 ATK ×${value} · 충격파 반경 기본 사거리 ×${definition.radiusBaseRangeFraction * definition.radiusMultipliers[level]}`;
    }
    title(value) {
        return `반격 피해 ×${value}`;
    }
}

export const WALNUT_GUARD_SLAM_FEATURE = Object.freeze({
    definition: Object.freeze({
        id: 'walnut-guard-slam',
        species: 5,
        name: '웅크리기 반격',
        description:
            '일반 공격 회복 후반에 웅크려 첫 피격을 줄이고, 다음 망치 공격을 충격파로 강화합니다. 수치는 초기 밸런스 초안입니다.',
        rootTier: 3,
        powerValues: Object.freeze([1.5, 1.75, 2]),
        receivedDamageMultiplier: 0.75,
        receivedKnockbackMultiplier: 0.5,
        guardRecoveryStartFraction: 0.5,
        radiusBaseRangeFraction: 0.5,
        radiusMultipliers: Object.freeze([1, 1.25, 1.5]),
        gradeThresholds: Object.freeze([3, 2, 1]),
    }),
    presentation: Object.freeze(new WalnutGuardSlamPresentation()),
});
