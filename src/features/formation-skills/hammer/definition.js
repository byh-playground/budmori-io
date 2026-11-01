import { CASTER_SIZE_PROFILE } from '../model-base.js';
export const DEFINITION = Object.freeze({
    id: 'hammer',
    name: '거대 망치',
    condition: 'allyDeaths',
    required: 3,
    description:
        '층·유물 레벨에 따른 기본 피해와 대상 체력에 비례한 피해를 주고 1초 동안 기절시켜요. 거대한 적을 먼저 노려요.',
    damage: Object.freeze({ base: 50, maxHpRatio: 0, missingHpRatio: 0.01, total: false }),
    upgradeAxis: '기본 피해 ×2 · 체력 비례 계수 유지',
    stunSeconds: 1,
    durationSeconds: 1.2,
    // A boss swings a hammer of its own size; a unit's hammer is as big as the body it comes down on.
    boss: Object.freeze({
        ...CASTER_SIZE_PROFILE,
        condition: 'damageTaken',
        damageCharge: Object.freeze({ base: 1000, maxHpRatio: 0.1 }),
    }),
});
