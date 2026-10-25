import { T1_DIAMETER } from '../model-base.js';
const DURATION = 5,
    PULSE_INTERVAL = 0.2,
    PULSE_DAMAGE = 3;
export const DEFINITION = Object.freeze({
    id: 'storm-cloud',
    name: '뇌운',
    condition: 'hits',
    required: 75,
    description: `${DURATION}초 동안 ${PULSE_INTERVAL}초마다 번개로 피해 ${PULSE_DAMAGE}을 줘요 (총 피해 ${(DURATION / PULSE_INTERVAL) * PULSE_DAMAGE}).`,
    targetCount: 1,
    targetRange: 18,
    retargetDelaySeconds: 0,
    boss: Object.freeze({
        condition: 'hits',
        required: 75,
        targetCount: 3,
        targetRange: T1_DIAMETER * 6,
        cloudWidthCap: T1_DIAMETER * 8,
        retargetDelaySeconds: 0.5,
    }),
    upgradeAxis: '지속시간 +1초',
    pulseInterval: PULSE_INTERVAL,
    pulseDamage: PULSE_DAMAGE,
    upgradeBase: DURATION,
    upgradeFactor: 1,
    upgradeStep: 1,
    upgradeUnit: '초',
});
