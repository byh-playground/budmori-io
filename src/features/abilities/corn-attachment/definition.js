export const CORN_ATTACHMENT_FEATURE = Object.freeze({
    definition: Object.freeze({
        id: 'corn-kernel-chain',
        species: 1,
        availableByDefault: true,
        minimumTier: 1,
        name: { ko: '부착 알갱이 연쇄 폭발', en: 'Kernel Chain Blast' },
        description: {
            ko: '기본 공격 뒤 알갱이가 대상에 붙어요. 첫 부착 1초 후부터 부착 순서대로 0.1초 간격 폭발하며 알갱이마다 발사자 공격력의 50/75/100% 피해를 줘요.',
            en: 'Basic attacks stick kernels on the target. 1s after the first, they blast in order 0.1s apart, each dealing 50/75/100% of the shooter’s Attack.',
        },
        powerValues: Object.freeze([0.5, 0.75, 1]),
        attachDelayTicks: 20,
        explosionSpacingTicks: 2,
        fadeTicks: 6,
    }),
});
