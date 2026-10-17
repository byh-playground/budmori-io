const DURATION = 5,
    PULSE_INTERVAL = 0.2,
    PULSE_DAMAGE = 3;
export const DEFINITION = Object.freeze({
    id: 'storm-cloud',
    name: '뇌운',
    condition: 'hits',
    required: 75,
    description: `${DURATION}\ucd08 \ub3d9\uc548 ${PULSE_INTERVAL}\ucd08\ub9c8\ub2e4 \uc804\uae30 \uc544\ud06c ${PULSE_DAMAGE} \ud53c\ud574 (${(DURATION / PULSE_INTERVAL) * PULSE_DAMAGE} \ud53c\ud574).`,
    upgradeAxis: '지속시간 +1초',
    pulseInterval: PULSE_INTERVAL,
    pulseDamage: PULSE_DAMAGE,
    upgradeBase: DURATION,
    upgradeFactor: 1,
    upgradeStep: 1,
    upgradeUnit: '초',
});
