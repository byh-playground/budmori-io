import { CASTER_SIZE_PROFILE } from '../model-base.js';
export const DEFINITION = Object.freeze({
    id: 'lightning',
    name: { ko: '낙뢰', en: 'Lightning' },
    condition: 'hits',
    required: 50,
    description: {
        ko: '적 하나에게 벼락을 내려 층·유물 레벨에 따른 기본 피해와 대상 체력에 비례한 피해를 줘요.',
        en: 'Strikes one foe with lightning for base damage by floor and relic level plus damage scaling with the target’s HP.',
    },
    aoeRadius: 0,
    telegraphSeconds: 0,
    boss: Object.freeze({
        ...CASTER_SIZE_PROFILE,
        condition: 'hits',
        required: 15,
        aoeRadiusRatio: 0.5,
        telegraphSeconds: 0.7,
    }),
    damage: Object.freeze({ base: 50, maxHpRatio: 0.01, missingHpRatio: 0, total: false }),
    upgradeAxis: { ko: '기본 피해 ×2 · 체력 비례 계수 유지', en: 'Base damage ×2 · HP-scaling ratio kept' },
});
