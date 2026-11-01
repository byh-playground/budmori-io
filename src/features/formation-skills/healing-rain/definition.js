const CHARGE_RATIO = 1.5,
    DURATION_SECONDS = 1;
export const DEFINITION = Object.freeze({
    id: 'healing-rain',
    name: '치유의 비',
    condition: 'damageTaken',
    description: `총 회복량의 ${CHARGE_RATIO}배만큼 실제 피해를 받으면 층·유물 레벨에 따른 기본 회복과 아군 평균 최대 체력의 10%를 합쳐 ${DURATION_SECONDS}초 동안 부상자에게 나눠 줘요.`,
    healing: Object.freeze({ base: 100, maxHpRatio: 0.1 }),
    upgradeAxis: '기본 회복 ×2 · 평균 최대 체력 계수 유지',
    upgradeBase: 100,
    upgradeFactor: 2,
    upgradeStep: 0,
    upgradeUnit: ' 회복',
    durationSeconds: DURATION_SECONDS,
    chargeRatio: CHARGE_RATIO,
});
