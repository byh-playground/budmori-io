const CHARGE_RATIO = 1.5,
    DURATION_SECONDS = 1;
export const DEFINITION = Object.freeze({
    id: 'healing-rain',
    name: { ko: '치유의 비', en: 'Healing Rain' },
    condition: 'damageTaken',
    description: {
        ko: `총 회복량의 ${CHARGE_RATIO}배만큼 실제 피해를 받으면 층·유물 레벨에 따른 기본 회복과 아군 평균 최대 체력의 10%를 합쳐 ${DURATION_SECONDS}초 동안 부상자에게 나눠 줘요.`,
        en: `After taking ${CHARGE_RATIO}× its total healing in damage, spreads base healing by floor and relic level plus 10% of allies’ average max HP among the wounded over ${DURATION_SECONDS}s.`,
    },
    healing: Object.freeze({ base: 100, maxHpRatio: 0.1 }),
    upgradeAxis: { ko: '기본 회복 ×2 · 평균 최대 체력 계수 유지', en: 'Base healing ×2 · max HP ratio kept' },
    upgradeBase: 100,
    upgradeFactor: 2,
    upgradeStep: 0,
    upgradeUnit: { ko: ' 회복', en: ' healing' },
    durationSeconds: DURATION_SECONDS,
    chargeRatio: CHARGE_RATIO,
});
