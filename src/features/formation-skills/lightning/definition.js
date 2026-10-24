import { T1_DIAMETER } from '../model-base.js';
export const DEFINITION = Object.freeze({
    id: 'lightning',
    name: '낙뢰',
    condition: 'hits',
    required: 50,
    description: '적 하나에게 벼락을 내려 피해 75를 줘요.',
    aoeRadius: 0,
    telegraphSeconds: 0,
    boss: Object.freeze({ condition: 'hits', required: 50, aoeRadius: T1_DIAMETER * 2, telegraphSeconds: 0.7 }),
    upgradeAxis: '피해 ×1.5',
    upgradeBase: 75,
    upgradeFactor: 1.5,
    upgradeStep: 0,
    upgradeUnit: ' 피해',
});
