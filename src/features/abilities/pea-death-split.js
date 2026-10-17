// This feature owns its catalog definition and pure text presentation.
// Formatting receives domain values; it imports no DOM or renderer adapters.
class PeaDeathSplitPresentation {
    label(_definition, value) {
        return `전투 사망 시 같은 종 T1 ${value}마리 생성`;
    }
    title(value) {
        return `T1 ${value}마리 생성`;
    }
}

export const PEA_DEATH_SPLIT_FEATURE = Object.freeze({
    definition: Object.freeze({
        id: 'pea-death-split',
        species: 0,
        name: '콩 분열',
        description:
            '전투에서 쓰러지면 전투 한정 콩을 생성합니다. 생성된 콩은 다시 분열하지 않으며 전투 종료 시 제거됩니다.',
        rootTier: 3,
        powerValues: Object.freeze([2, 3, 4]),
        gradeThresholds: Object.freeze([3, 2, 1]),
    }),
    presentation: Object.freeze(new PeaDeathSplitPresentation()),
});
