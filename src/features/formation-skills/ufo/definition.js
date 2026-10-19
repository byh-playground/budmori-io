const DURATION = 5,
    PULSE_INTERVAL = 0.2,
    PULSE_DAMAGE = 4;
export const DEFINITION = Object.freeze({
    id: 'ufo',
    name: '우주선',
    condition: 'critHits',
    required: 10,
    description: `${DURATION}초 동안 ${PULSE_INTERVAL}초마다 수직 레이저 ${PULSE_DAMAGE} 피해 (${(DURATION / PULSE_INTERVAL) * PULSE_DAMAGE} 피해).`,
    upgradeAxis: '지속시간 +1초',
    pulseInterval: PULSE_INTERVAL,
    pulseDamage: PULSE_DAMAGE,
    upgradeBase: DURATION,
    upgradeFactor: 1,
    upgradeStep: 1,
    upgradeUnit: '초',
});
