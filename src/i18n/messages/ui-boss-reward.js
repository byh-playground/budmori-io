import { LOCALE } from '../locale.js';

// Boss reward chest dialog (src/ui/boss-reward-dialog.js).
export const BOSS_REWARD = LOCALE.messages({
    stage: { ko: ({ stage }) => `${stage}층 · 보스 격파`, en: ({ stage }) => `Floor ${stage} · Boss defeated` },
    title: { ko: '승리 보상', en: 'Victory Reward' },
    chestCount: { ko: '보상 상자 1개', en: '1 reward chest' },
    summaryEmpty: { ko: '다음 전투의 보상을 기대해 주세요', en: 'Better luck in the next battle' },
    summaryJoin: { ko: '새싹이 농장에 합류해요', en: 'Sprouts join your farm' },
    sprouts: {
        ko: ({ count }) => `새싹 ${LOCALE.number(count)}마리`,
        en: ({ count }) => `${LOCALE.number(count)} ${LOCALE.plural(count, { one: 'sprout', other: 'sprouts' })}`,
    },
    chestEmpty: { ko: '이번 상자는 비었어요', en: 'This chest is empty' },
    opening: { ko: '상자가 열려요…', en: 'The chest opens…' },
    pouring: { ko: '새싹이 쏟아져요!', en: 'Sprouts pour out!' },
    placed: {
        ko: ({ count }) => `${LOCALE.number(count)}마리 농장에 배치`,
        en: ({ count }) => `${LOCALE.number(count)} placed on the farm`,
    },
    queued: {
        ko: ({ count }) => `${LOCALE.number(count)}마리 자리 대기`,
        en: ({ count }) => `${LOCALE.number(count)} waiting for space`,
    },
    confirm: { ko: '확인', en: 'OK' },
    skip: { ko: '결과 바로 보기', en: 'Show result' },
});
