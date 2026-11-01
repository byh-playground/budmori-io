import { CASTER_SIZE_PROFILE, T1_DIAMETER, TARGET_SIZE_PROFILE } from '../model-base.js';
export const DEFINITION = Object.freeze({
    id: 'meteor-shower',
    name: '유성우',
    condition: 'hits',
    required: 100,
    description:
        '유성 5개를 0.25초 간격으로 떨어뜨려요. 유성마다 층·유물 레벨에 따른 기본 피해와 대상 체력에 비례한 범위 피해를 주며, 빗나갈 수 있어요.',
    ...TARGET_SIZE_PROFILE,
    // The tier-1 radius is the floor; against a body each meteor's blast is half its drawn width.
    aoeRadius: T1_DIAMETER,
    aoeRadiusRatio: 0.5,
    scatterRadius: T1_DIAMETER * 3,
    scatterRadiusRatio: 0.5,
    fallSeconds: 0.75,
    shotInterval: 0.25,
    boss: Object.freeze({
        ...CASTER_SIZE_PROFILE,
        condition: 'hits',
        required: 30,
        aoeRadiusRatio: 0.5,
        scatterRadiusRatio: 0.5,
    }),
    damage: Object.freeze({ base: 125, maxHpRatio: 0.005, missingHpRatio: 0, total: true }),
    upgradeAxis: '기본 피해 ×2 · 체력 비례 계수 유지',
    upgradeBase: 5,
    upgradeFactor: 1,
    upgradeStep: 1,
    upgradeUnit: '개',
});
