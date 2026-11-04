import { LOCALE } from '../locale.js';

// Farm HUD, breeding, work, menu and raid text (src/farm-app.js).
export const APP_FARM = LOCALE.messages({
    raidOnlyOnFarm: { ko: '농장에서만 보스에 도전할 수 있어요.', en: 'You can only challenge the boss from the farm.' },
    raidAlreadyFighting: { ko: '이미 전투 중이에요.', en: 'Already in a fight.' },
    raidNoTroops: {
        ko: '싸울 병력이 없어요. 먼저 모리를 키워 주세요.',
        en: 'No troops to fight. Raise some Mori first.',
    },
    mergeCount: { ko: ({ count }) => `합성 ×${count}`, en: ({ count }) => `Merge ×${count}` },
    // label: the button's visible text; reason: the resolved status reason.
    mergeLabel: {
        ko: ({ label, available, reason }) => `${label}${available ? '' : ' 불가'} · ${reason}`,
        en: ({ label, available, reason }) => `${label}${available ? '' : ' unavailable'} · ${reason}`,
    },
    combineLabel: {
        ko: ({ available, reason }) => `조합${available ? '' : ' 불가'} · ${reason}`,
        en: ({ available, reason }) => `Combine${available ? '' : ' unavailable'} · ${reason}`,
    },
    speciesInfo: { ko: ({ name }) => `${name} 병종 정보`, en: ({ name }) => `${name} species info` },
    noSpecies: { ko: '병종이 없어요', en: 'No species yet' },
    breedShare: { ko: ({ name }) => `${name} 번식 몫`, en: ({ name }) => `${name} breeding share` },
    breedPlan: {
        ko: ({ breeders, workers }) => `배분 계획 · 번식 ${breeders} · 먹이 ${workers}`,
        en: ({ breeders, workers }) => `Plan · Breeding ${breeders} · Food ${workers}`,
    },
    sprout: { ko: '새싹', en: 'Sprout' },
    menuClose: { ko: ({ title }) => `${title} 닫기`, en: ({ title }) => `Close ${title}` },
    overallLevel: { ko: ({ level }) => `전체 Lv.${level}`, en: ({ level }) => `Overall Lv.${level}` },
    capacityMax: { ko: '정원 최대', en: 'Max capacity' },
    overallGrowth: {
        ko: ({ xp, capacity, frontline }) => `전체 XP ${xp} · 농장 정원 ${capacity} · 다음 전선 ${frontline}`,
        en: ({ xp, capacity, frontline }) =>
            `Overall XP ${xp} · Farm capacity ${capacity} · Next front line ${frontline}`,
    },
    starterRewardWaiting: {
        ko: '씨앗 보상 대기 · 공간이 생기면 합류해요',
        en: 'Seed reward waiting · Joins when there’s room',
    },
    starterAllAsleep: { ko: '모두 잠자는 중 · 회복을 기다려요', en: 'Everyone’s asleep · Waiting to recover' },
    starterFarmFull: { ko: '농장이 가득 찼어요', en: 'The farm is full' },
    starterBreed: { ko: '번식으로 식구를 늘려요', en: 'Breed to grow your farm' },
    armyHealth: {
        ko: ({ current, max, living, total }) => `${current}/${max} · ${living}/${total}마리`,
        en: ({ current, max, living, total }) =>
            `${current}/${max} · ${living}/${total} ${LOCALE.plural(total, { one: 'troop', other: 'troops' })}`,
    },
    // perMinute: already rounded to one decimal ("2.0").
    workNote: {
        ko: ({ workers, perMinute }) => `일꾼 ${workers}마리 · 먹이 ${perMinute}/분`,
        en: ({ workers, perMinute }) =>
            `${workers} ${LOCALE.plural(workers, { one: 'worker', other: 'workers' })} · ${perMinute} food/min`,
    },
    workFoodFull: { ko: '먹이 가득 · 일꾼 쉼', en: 'Food full · idle' },
    workNoWorkers: { ko: '일꾼 없음 · 먹이 안 만들어짐', en: 'No workers · no food' },
    workHudBreed: { ko: ({ count }) => `번식 ${count}`, en: ({ count }) => `Breeding ${count}` },
    workHudFood: { ko: ({ count }) => `먹이 ${count}`, en: ({ count }) => `Food ${count}` },
});
