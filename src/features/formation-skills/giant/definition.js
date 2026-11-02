import { formationBaseValue } from '../../../formation/formation-damage.js';
export const DEFINITION = Object.freeze({
    id: 'giant',
    name: { ko: '거대화', en: 'Giant Growth' },
    condition: 'damageDealt',
    required: 200,
    description: {
        ko: '무작위 아군 3명이 10초 동안 커지고, 기본 공격 한 동작에 층·레벨에 따른 고정 피해를 더해요. 방어력이 25 올라요.',
        en: '3 random allies grow for 10s, adding fixed damage by floor and level to each basic attack, and gain 25 Defense.',
    },
    upgradeAxis: {
        ko: '동작당 추가 피해 ×2 · 대상 3명·지속 10초 유지',
        en: 'Bonus damage per attack ×2 · 3 targets, 10s kept',
    },
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
