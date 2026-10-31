import { CASTER_SIZE_PROFILE, T1_DIAMETER, TARGET_SIZE_PROFILE } from '../model-base.js';
export const DEFINITION = Object.freeze({
    id: 'meteor',
    name: '운석 낙하',
    condition: 'damageDealt',
    required: 250,
    description: '정해진 곳에 운석을 떨어뜨려 주변에 피해 150을 주고 적을 밀쳐내요.',
    ...TARGET_SIZE_PROFILE,
    // The tier-1 radius is the floor; against a body the blast is half its drawn width.
    aoeRadius: T1_DIAMETER * 3,
    aoeRadiusRatio: 0.5,
    scatterRadius: T1_DIAMETER * 3,
    scatterRadiusRatio: 0.5,
    fallSeconds: 0.75,
    shotInterval: 0.25,
    boss: Object.freeze({
        ...CASTER_SIZE_PROFILE,
        condition: 'damageDealt',
        required: 500,
        aoeRadiusRatio: 0.5,
        scatterRadiusRatio: 0.5,
    }),
    upgradeAxis: '피해 ×1.5',
    upgradeBase: 150,
    upgradeFactor: 1.5,
    upgradeStep: 0,
    upgradeUnit: ' 피해',
});
