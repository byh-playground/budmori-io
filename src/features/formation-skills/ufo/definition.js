import { CASTER_SIZE_PROFILE } from '../model-base.js';
const DURATION = 5,
    PULSE_INTERVAL = 0.2;
export const DEFINITION = Object.freeze({
    id: 'ufo',
    name: { ko: '우주선', en: 'UFO' },
    condition: 'critHits',
    required: 10,
    description: {
        ko: `${DURATION}초 동안 ${PULSE_INTERVAL}초마다 아래로 레이저를 쏴 층·유물 레벨에 따른 기본 피해와 대상 체력에 비례한 피해를 줘요.`,
        en: `For ${DURATION}s, fires a laser down every ${PULSE_INTERVAL}s for base damage by floor and relic level plus damage scaling with the target’s HP.`,
    },
    targetCount: 1,
    beamWidth: 0,
    retargetDelaySeconds: 0,
    boss: Object.freeze({
        ...CASTER_SIZE_PROFILE,
        condition: 'hitCharge',
        required: 30,
        criticalChargeBonus: 2,
        visualWidthRatio: 1,
        beamWidthRatio: 1,
        targetCount: 3,
        retargetDelaySeconds: 0.5,
    }),
    damage: Object.freeze({ base: 100, maxHpRatio: 0.005, missingHpRatio: 0, total: true }),
    upgradeAxis: { ko: '기본 피해 ×2 · 체력 비례 계수 유지', en: 'Base damage ×2 · HP-scaling ratio kept' },
    pulseInterval: PULSE_INTERVAL,
    upgradeBase: DURATION,
    upgradeFactor: 1,
    upgradeStep: 1,
    upgradeUnit: { ko: '초', en: 's' },
});
