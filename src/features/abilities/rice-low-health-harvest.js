export const RICE_LOW_HEALTH_HARVEST_FEATURE = Object.freeze({
    definition: Object.freeze({
        id: 'rice-low-health-harvest',
        species: 6,
        availableByDefault: true,
        minimumTier: 1,
        name: { ko: '수확 낫', en: 'Harvest Sickle' },
        description: {
            ko: '적이 체력을 잃을수록 쌀의 치명타 확률이 높아져요. 치명타 피해 배율은 공통 2배예요.',
            en: 'Rice’s Crit Chance rises as the foe loses HP. Crit Damage is the shared ×2.',
        },
        rootTier: 1,
        powerValues: Object.freeze([0.35, 0.55, 0.75]),
    }),
});
