// This feature owns its catalog definition and pure text presentation.
// Formatting receives domain values; it imports no DOM or renderer adapters.
// Initial balance draft values remain adjustable, not final user-approved numbers.
class PeanutSeparatedAssaultPresentation {
    label(definition, value) {
        return `한 공격 주기 ${value}타 · 타격당 ATK ×${definition.strikeAttackMultiplier} · 넓은 협공 궤적`;
    }
    title(value) {
        return `협공 ${value}타`;
    }
}

export const PEANUT_SEPARATED_ASSAULT_FEATURE = Object.freeze({
    definition: Object.freeze({
        id: 'peanut-separated-assault',
        species: 4,
        name: '분리 협공',
        description: '한 땅콩의 두 알이 넓게 벌어져 번갈아 공격합니다. 수치는 초기 밸런스 초안입니다.',
        rootTier: 3,
        powerValues: Object.freeze([3, 4, 5]),
        strikeAttackMultiplier: 0.5,
        spreadRadians: Math.PI / 6,
        gradeThresholds: Object.freeze([3, 2, 1]),
    }),
    presentation: Object.freeze(new PeanutSeparatedAssaultPresentation()),
});
