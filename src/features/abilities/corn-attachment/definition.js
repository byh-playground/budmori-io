export const CORN_ATTACHMENT_FEATURE = Object.freeze({
    definition: Object.freeze({
        id: 'corn-kernel-chain',
        species: 1,
        availableByDefault: true,
        minimumTier: 1,
        name: '부착 알갱이 연쇄 폭발',
        description:
            '기본 공격 뒤 알갱이가 대상에 붙어요. 첫 부착 1초 후부터 부착 순서대로 0.1초 간격 폭발하며 알갱이마다 발사자 공격력의 50/75/100% 피해를 줘요.',
        powerValues: Object.freeze([0.5, 0.75, 1]),
        attachDelayTicks: 20,
        explosionSpacingTicks: 2,
        fadeTicks: 6,
    }),
});
