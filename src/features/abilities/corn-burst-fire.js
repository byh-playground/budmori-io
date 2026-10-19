// This feature owns its catalog definition and pure text presentation.
// Formatting receives domain values; it imports no DOM or renderer adapters.
class CornBurstFirePresentation {
    label(definition, value, _level, attackProfile) {
        return `한 공격 주기 · 발사 ${value}발 · 발당 ATK ×${attackProfile.skillMultiplier * definition.projectileAttackShare}`;
    }
    title(value) {
        return `${value}발 연사`;
    }
}

export const CORN_BURST_FIRE_FEATURE = Object.freeze({
    definition: Object.freeze({
        id: 'corn-burst-fire',
        species: 1,
        name: '옥수수 알갱이 연사',
        description: '한 기본 곡사 공격 주기 안에 알갱이를 시간차로 발사해요.',
        rootTier: 3,
        powerValues: Object.freeze([2, 3, 4]),
        projectileAttackShare: 0.5,
        gradeThresholds: Object.freeze([3, 2, 1]),
    }),
    presentation: Object.freeze(new CornBurstFirePresentation()),
});
