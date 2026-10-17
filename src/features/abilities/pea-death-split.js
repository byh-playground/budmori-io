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
        description: '전투에서 쓰러지면 같은 종의 T1 개체를 생성해 전투를 이어갑니다.',
        rootTier: 3,
        powerValues: Object.freeze([2, 3, 4]),
        gradeThresholds: Object.freeze([3, 2, 1]),
    }),
    presentation: Object.freeze(new PeaDeathSplitPresentation()),
});
