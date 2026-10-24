export const DEFINITION = Object.freeze({
    id: 'copy',
    name: '복사',
    condition: 'hits',
    required: 100,
    description:
        '아군이 가장 많이 모인 곳에 분신을 만들어요. 분신의 체력은 1이며, 전투가 끝나면 사라져요. 소환된 아군은 복사하지 않아요.',
    upgradeAxis: '반경 ×1.5',
    upgradeBase: 3,
    upgradeFactor: 1.5,
    upgradeStep: 0,
    upgradeUnit: ' × T1 몸통 지름',
});
