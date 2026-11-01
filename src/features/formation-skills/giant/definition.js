import { formationBaseValue } from '../../../formation/formation-damage.js';
export const DEFINITION = Object.freeze({
    id: 'giant',
    name: '거대화',
    condition: 'damageDealt',
    required: 200,
    description:
        '무작위 아군 3명이 10초 동안 커지고, 기본 공격 한 동작에 층·레벨에 따른 고정 피해를 더해요. 방어력이 25 올라요.',
    upgradeAxis: '동작당 추가 피해 ×2 · 대상 3명·지속 10초 유지',
    upgradeValues: Object.freeze([3]),
    bonusBase: 10,
    durationSeconds: 10,
    sizeMultiplier: 3,
    armorBonus: 25,
    boss: Object.freeze({
        sizeMultiplier: 1.25,
        damageCharge: Object.freeze({ base: 200, maxHpRatio: 0.05 }),
    }),
});

export function giantBonusFor(floor, level, role = 'player') {
    return formationBaseValue(DEFINITION.bonusBase, floor, level, role);
}
export function giantBonusDamage(unit, time) {
    return unit.giantUntil > time ? unit.giantBonusDamage || 0 : 0;
}
