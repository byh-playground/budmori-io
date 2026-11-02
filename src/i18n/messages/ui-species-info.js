import { LOCALE } from '../locale.js';

// Species info dialog (src/ui/species-info.js).
export const SPECIES_INFO = LOCALE.messages({
    title: { ko: ({ name }) => `${name} 병종 정보`, en: ({ name }) => `${name} Species Info` },
    trait: { ko: ({ name }) => `병종 특성 · ${name}`, en: ({ name }) => `Species Trait · ${name}` },
    baseStats: { ko: '기본 스펙', en: 'Base Stats' },
    baseStatsNote: {
        ko: '영구 성장·성향·카드·일시 효과를 적용하기 전 수치예요. 공격력은 타격별 배율을 적용하기 전 기준이며, 실제 공격은 병종의 동작과 강화에 따라 달라져요.',
        en: 'Values before permanent growth, temperament, cards and temporary effects. Attack is before per-hit multipliers; actual attacks vary with each species’ moves and upgrades.',
    },
    statColumn: { ko: '능력치', en: 'Stat' },
    bestOwned: { ko: ({ tier }) => `보유 최고 T${tier}`, en: ({ tier }) => `Best owned T${tier}` },
    maxHp: { ko: '체력', en: 'HP' },
    attackPower: { ko: '공격력', en: 'Attack' },
    armor: { ko: '방어력', en: 'Defense' },
    moveSpeed: { ko: '이동 속도', en: 'Move Speed' },
    attackSpeed: { ko: '공격 속도', en: 'Attack Speed' },
    critChance: { ko: '치명타 확률', en: 'Crit Chance' },
    critMultiplier: { ko: '치명타 피해', en: 'Crit Damage' },
});
