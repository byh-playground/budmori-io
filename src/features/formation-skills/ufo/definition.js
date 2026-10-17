const DURATION = 5,
    PULSE_INTERVAL = 0.2,
    PULSE_DAMAGE = 4;
export const DEFINITION = Object.freeze({
    id: 'ufo',
    name: '우주선',
    condition: 'critHits',
    required: 10,
    description: `${DURATION}\ucd08 \ub3d9\uc548 ${PULSE_INTERVAL}\ucd08\ub9c8\ub2e4 \uc218\uc9c1 \ub808\uc774\uc800 ${PULSE_DAMAGE} \ud53c\ud574 (${(DURATION / PULSE_INTERVAL) * PULSE_DAMAGE} \ud53c\ud574).`,
    upgradeAxis: '지속시간 +1초',
    pulseInterval: PULSE_INTERVAL,
    pulseDamage: PULSE_DAMAGE,
    upgradeBase: DURATION,
    upgradeFactor: 1,
    upgradeStep: 1,
    upgradeUnit: '초',
});
