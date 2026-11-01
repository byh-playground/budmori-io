import { CASTER_SIZE_PROFILE } from '../model-base.js';
const DURATION = 5,
    PULSE_INTERVAL = 0.2;
export const DEFINITION = Object.freeze({
    id: 'storm-cloud',
    name: '뇌운',
    condition: 'hits',
    required: 75,
    description: `${DURATION}초 동안 ${PULSE_INTERVAL}초마다 번개로 층·유물 레벨에 따른 기본 피해와 대상 체력에 비례한 피해를 줘요.`,
    targetCount: 1,
    targetRange: 18,
    retargetDelaySeconds: 0,
    boss: Object.freeze({
        ...CASTER_SIZE_PROFILE,
        condition: 'hits',
        required: 25,
        targetCount: 3,
        targetRangeRatio: 0.5,
        visualWidthRatio: 1,
        retargetDelaySeconds: 0.5,
    }),
    damage: Object.freeze({ base: 75, maxHpRatio: 0, missingHpRatio: 0.005, total: true }),
    upgradeAxis: '기본 피해 ×2 · 체력 비례 계수 유지',
    pulseInterval: PULSE_INTERVAL,
    upgradeBase: DURATION,
    upgradeFactor: 1,
    upgradeStep: 1,
    upgradeUnit: '초',
});
