import { CASTER_SIZE_PROFILE } from '../model-base.js';
export const DEFINITION = Object.freeze({
    id: 'hammer',
    name: '거대 망치',
    condition: 'allyDeaths',
    required: 3,
    description: '적 하나에게 피해 50을 주고 1초 동안 기절시켜요. 거대한 적을 먼저 노려요.',
    upgradeAxis: '피해 ×1.5',
    upgradeBase: 50,
    upgradeFactor: 1.5,
    upgradeStep: 0,
    upgradeUnit: ' 피해',
    stunSeconds: 1,
    durationSeconds: 1.2,
    // A boss swings a hammer of its own size; a unit's hammer is as big as the body it comes down on.
    boss: Object.freeze({ ...CASTER_SIZE_PROFILE }),
});
