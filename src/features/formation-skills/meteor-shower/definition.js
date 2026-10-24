import { T1_DIAMETER } from '../model-base.js';
export const DEFINITION = Object.freeze({
    id: 'meteor-shower',
    name: '유성우',
    condition: 'hits',
    required: 100,
    description: '유성 5개를 0.25초 간격으로 떨어뜨려요. 유성마다 주변에 피해 25를 주며, 빗나갈 수 있어요.',
    aoeRadius: T1_DIAMETER,
    scatterRadius: T1_DIAMETER * 3,
    fallSeconds: 0.75,
    shotInterval: 0.25,
    shotDamage: 25,
    boss: Object.freeze({ condition: 'hits', required: 100 }),
    upgradeAxis: '유성 +1개',
    upgradeBase: 5,
    upgradeFactor: 1,
    upgradeStep: 1,
    upgradeUnit: '개',
});
