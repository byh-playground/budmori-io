export const DEFINITION = Object.freeze({
    id: 'copy',
    name: { ko: '복사', en: 'Copy' },
    condition: 'hits',
    required: 100,
    description: {
        ko: '아군이 가장 많이 모인 곳에 분신을 만들어요. 분신의 체력은 1이며, 전투가 끝나면 사라져요. 분신은 다시 복사하지 않아요.',
        en: 'Makes clones where allies gather most. Clones have 1 HP, vanish after the battle, and are never copied again.',
    },
    upgradeAxis: { ko: '반경 ×1.5', en: 'Radius ×1.5' },
    upgradeBase: 3,
    upgradeFactor: 1.5,
    upgradeStep: 0,
    upgradeUnit: { ko: ' × T1 몸통 지름', en: ' × T1 body width' },
});
