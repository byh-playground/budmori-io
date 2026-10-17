export const DEFINITION = Object.freeze({
    id: 'healing-rain',
    name: '치유의 비',
    condition: 'damageTaken',
    required: 200,
    description: '3초 동안 총 100을 부상한 아군에게 동시에 균등 배분.',
    upgradeAxis: '총 회복량 ×1.5',
    upgradeBase: 100,
    upgradeFactor: 1.5,
    upgradeStep: 0,
    upgradeUnit: ' 회복',
});
