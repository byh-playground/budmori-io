export const DEFINITION = Object.freeze({
    id: 'healing-rain',
    name: '치유의 비',
    condition: 'damageTaken',
    required: 200,
    description: '3초 동안 총 회복량 100을 다친 아군에게 고르게 나눠 줘요.',
    upgradeAxis: '총 회복량 ×1.5',
    upgradeBase: 100,
    upgradeFactor: 1.5,
    upgradeStep: 0,
    upgradeUnit: ' 회복',
    durationSeconds: 3,
});
