import { CASTER_SIZE_PROFILE, T1_DIAMETER, TARGET_SIZE_PROFILE } from '../model-base.js';
export const DEFINITION = Object.freeze({
    id: 'meteor',
    name: { ko: '운석 낙하', en: 'Meteor' },
    condition: 'damageDealt',
    required: 250,
    description: {
        ko: '정해진 곳에 운석을 떨어뜨려 층·유물 레벨에 따른 기본 피해와 대상 체력에 비례한 범위 피해를 주고 적을 밀쳐내요.',
        en: 'Drops a meteor on a set spot for area damage (base by floor and relic level plus scaling with the target’s HP) and knocks foes back.',
    },
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
        damageCharge: Object.freeze({ base: 500, maxHpRatio: 0.1 }),
        aoeRadiusRatio: 0.5,
        scatterRadiusRatio: 0.5,
    }),
    damage: Object.freeze({ base: 100, maxHpRatio: 0.005, missingHpRatio: 0, total: false }),
    upgradeAxis: { ko: '기본 피해 ×2 · 체력 비례 계수 유지', en: 'Base damage ×2 · HP-scaling ratio kept' },
});
