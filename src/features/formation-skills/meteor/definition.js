import { T1_DIAMETER } from '../model-base.js';
export const DEFINITION = Object.freeze({
    id: 'meteor',
    name: '운석 낙하',
    condition: 'damageDealt',
    required: 250,
    description: '정해진 곳에 운석을 떨어뜨려 주변에 피해 150을 주고 적을 밀쳐내요.',
    aoeRadius: T1_DIAMETER * 3,
    scatterRadius: T1_DIAMETER * 3,
    fallSeconds: 0.75,
    shotInterval: 0.25,
    boss: Object.freeze({ condition: 'damageDealt', required: 500 }),
    upgradeAxis: '피해 ×1.5',
    upgradeBase: 150,
    upgradeFactor: 1.5,
    upgradeStep: 0,
    upgradeUnit: ' 피해',
});
