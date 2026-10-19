const DURATION = 5,
    PULSE_INTERVAL = 0.2,
    PULSE_DAMAGE = 3;
export const DEFINITION = Object.freeze({
    id: 'storm-cloud',
    name: '뇌운',
    condition: 'hits',
    required: 75,
    description: `${DURATION}초 동안 ${PULSE_INTERVAL}초마다 전기 아크 ${PULSE_DAMAGE} 피해 (${(DURATION / PULSE_INTERVAL) * PULSE_DAMAGE} 피해).`,
    upgradeAxis: '지속시간 +1초',
    pulseInterval: PULSE_INTERVAL,
    pulseDamage: PULSE_DAMAGE,
    upgradeBase: DURATION,
    upgradeFactor: 1,
    upgradeStep: 1,
    upgradeUnit: '초',
});
