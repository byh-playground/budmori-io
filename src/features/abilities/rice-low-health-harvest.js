export const RICE_LOW_HEALTH_HARVEST_FEATURE = Object.freeze({
    definition: Object.freeze({
        id: 'rice-low-health-harvest',
        species: 6,
        availableByDefault: true,
        minimumTier: 1,
        name: '수확 낫',
        description: '적이 체력을 잃을수록 쌀의 치명타 확률이 높아집니다. 치명타 피해 배율은 공통 2배입니다.',
        rootTier: 1,
        powerValues: Object.freeze([0.35, 0.55, 0.75]),
    }),
});
