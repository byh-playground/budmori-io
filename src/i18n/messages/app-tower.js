import { LOCALE } from '../locale.js';

// Tower climb, doors, cards and boss fight text (src/farm-app.js).
export const APP_TOWER = LOCALE.messages({
    floorBattle: { ko: '전투', en: 'Battle' },
    floorElite: { ko: '정예', en: 'Elite' },
    floorMid: { ko: '중간 보스', en: 'Mid boss' },
    floorPower: { ko: '강화', en: 'Upgrade' },
    floorEvent: { ko: '이벤트', en: 'Event' },
    doorBattle: { ko: '보스 전원 처치', en: 'Defeat every boss' },
    doorElite: { ko: '더 세지만 보상 ×2', en: 'Tougher, but rewards ×2' },
    doorMid: { ko: '피할 수 없어요 · 보상 ×3', en: 'Unavoidable · Rewards ×3' },
    nextBattle: { ko: '전투 준비 · 싸울 상대를 고르세요', en: 'Battle ahead · Pick your opponent' },
    nextMid: { ko: '중간 보스 · 피할 수 없어요', en: 'Mid boss · Unavoidable' },
    nextPower: { ko: '강화 · 카드 한 장을 고르세요', en: 'Upgrade · Pick a card' },
    nextEvent: { ko: '이벤트', en: 'Event' },
    // next: one of the next* texts above.
    doorsTitle: { ko: ({ floor, next }) => `${floor}층 ${next}`, en: ({ floor, next }) => `Floor ${floor} ${next}` },
    // A card button's detail line: rarity · scope/effect · level/cap.
    statDoorDetail: {
        ko: ({ rarity, boss, level, cap }) => `${rarity} · ${boss ? '보스 진영' : '모든 아군'} · ${level}/${cap}장`,
        en: ({ rarity, boss, level, cap }) => `${rarity} · ${boss ? 'Boss side' : 'All allies'} · ${level}/${cap}`,
    },
    passiveDoorDetail: {
        ko: ({ rarity, effect, level, cap }) => `${rarity} · ${effect} · ${level}/${cap}장`,
        en: ({ rarity, effect, level, cap }) => `${rarity} · ${effect} · ${level}/${cap}`,
    },
    bossPicked: { ko: '✓ 보스 선택', en: '✓ Boss pick' },
    receiptTitle: {
        ko: ({ boss, card }) => `${boss ? '보스 획득' : '내 카드'} · ${card}`,
        en: ({ boss, card }) => `${boss ? 'Boss took' : 'My card'} · ${card}`,
    },
    bossMaxed: { ko: '보스 카드 없음 · 모든 후보 강화 완료', en: 'No boss card · Every option is maxed' },
    receiptAnnouncement: {
        ko: ({ boss, card, effect }) => `${boss ? '보스 획득' : '내 카드 획득'} · ${card}. ${effect}`,
        en: ({ boss, card, effect }) => `${boss ? 'Boss took' : 'I took'} · ${card}. ${effect}`,
    },
    floorNow: {
        ko: ({ floor, theme }) => `${floor}층 · ${theme}`,
        en: ({ floor, theme }) => `Floor ${floor} · ${theme}`,
    },
    floorNumber: { ko: ({ floor }) => `${floor}층`, en: ({ floor }) => `Floor ${floor}` },
    floorBannerKind: { ko: ({ theme, kind }) => `${theme} · ${kind}`, en: ({ theme, kind }) => `${theme} · ${kind}` },
    bossChoosing: { ko: '보스가 먼저 고르는 중', en: 'The boss is picking first' },
    bossChoice: { ko: ({ card }) => `보스 선택 · ${card}`, en: ({ card }) => `Boss pick · ${card}` },
    bossChose: { ko: ({ card }) => `보스가 ${card} 선택`, en: ({ card }) => `The boss picked ${card}` },
    bossChoosingNote: {
        ko: '보스가 같은 카드 3장에서 먼저 한 장을 가져가요',
        en: 'The boss takes one of the same 3 cards first',
    },
    pickFromRest: { ko: '남은 카드에서 한 장을 고르세요', en: 'Pick one of the remaining cards' },
    bossTookPickRest: {
        ko: ({ card }) => `보스가 ${card}을(를) 가져갔어요 · 남은 카드에서 고르세요`,
        en: ({ card }) => `The boss took ${card} · Pick one of the remaining cards`,
    },
    floorCleared: {
        ko: ({ floor, downed, cards }) => `${floor}층 돌파 · 쓰러진 병력 ${downed}마리 · 강화 카드 ${cards}장`,
        en: ({ floor, downed, cards }) =>
            `Floor ${floor} cleared · ${downed} ${LOCALE.plural(downed, { one: 'troop', other: 'troops' })} down · ${cards} upgrade ${LOCALE.plural(cards, { one: 'card', other: 'cards' })}`,
    },
    towerResult: {
        ko: ({ floor, record, best }) => `지난 도전 ${floor}층${record ? ' · 새 기록!' : ''} · 최고 ${best}층`,
        en: ({ floor, record, best }) =>
            `Last run: floor ${floor}${record ? ' · New record!' : ''} · Best floor ${best}`,
    },
    deckCard: { ko: ({ slot, name }) => `${slot}번 ${name}`, en: ({ slot, name }) => `No. ${slot} ${name}` },
    commandScatter: { ko: '간격을 넓히며 공격해요', en: 'Spread out and attack' },
    commandRetreat: {
        ko: '공격을 멈추고 물러나며 체력을 빠르게 회복해요',
        en: 'Stop attacking, fall back and heal fast',
    },
    frontlineStatus: {
        ko: ({ fighters, limit, reserves }) => `전선 ${fighters}/${limit} · 예비대 ${reserves}`,
        en: ({ fighters, limit, reserves }) => `Front line ${fighters}/${limit} · Reserves ${reserves}`,
    },
    rewardNone: { ko: '보상 없음', en: 'No reward' },
    rewardNoSprouts: { ko: '이번에는 획득한 새싹이 없어요', en: 'No sprouts this time' },
    rewardSummary: {
        ko: ({ acquired, placed, queued }) =>
            `${acquired}마리 획득 · ${placed}마리 배치${queued ? ` · ${queued}마리 자리 대기` : ''}`,
        en: ({ acquired, placed, queued }) =>
            `${acquired} gained · ${placed} placed${queued ? ` · ${queued} waiting for room` : ''}`,
    },
    bossFloor: {
        ko: ({ floor, final, living, total }) => `${floor}층 · ${final ? '최종 수호자' : `보스 ${living}/${total}`}`,
        en: ({ floor, final, living, total }) =>
            `Floor ${floor} · ${final ? 'Final Guardian' : `Bosses ${living}/${total}`}`,
    },
    bossHealth: { ko: '등장한 보스 합계 체력', en: 'Total HP of bosses on the field' },
    bossMarching: { ko: '보스가 있는 칸으로 가는 중이에요', en: 'Heading to the boss’s tile' },
    bossEnraged: { ko: '격노! 피해 2배, 공격이 빨라져요', en: 'Enraged! Double damage, faster attacks' },
    bossCrownWaiting: {
        ko: '모두 쓰러뜨리면 최종 수호자가 내려와요',
        en: 'Defeat them all to face the Final Guardian',
    },
    bossAllIn: {
        ko: ({ seconds }) => `전원 등장 · 격노까지 ${seconds}초`,
        en: ({ seconds }) => `All bosses in · Enrage in ${seconds}s`,
    },
    // reward: a rewardSummary/rewardNone text.
    victoryJoined: {
        ko: ({ floor, reward }) => `${floor}층 돌파 · 새 기록! 씨앗 ${reward} · 농장에 합류했어요`,
        en: ({ floor, reward }) => `Floor ${floor} cleared · New record! Seeds ${reward} · Joined the farm`,
    },
    victoryPending: {
        ko: ({ floor, reward }) => `${floor}층 돌파 · 새 기록! 씨앗 ${reward} · 공간이 생기면 합류해요`,
        en: ({ floor, reward }) => `Floor ${floor} cleared · New record! Seeds ${reward} · Joins when there’s room`,
    },
    victoryRecord: {
        ko: ({ floor }) => `${floor}층 돌파 · 새 기록!`,
        en: ({ floor }) => `Floor ${floor} cleared · New record!`,
    },
    victoryXp: {
        ko: ({ floor }) => `${floor}층 돌파 · 전체 성장 XP 획득`,
        en: ({ floor }) => `Floor ${floor} cleared · Overall XP gained`,
    },
    defeat: {
        ko: ({ floor, best }) => `${floor}층에서 쓰러졌어요 · 최고 ${best}층 · 쓰러진 병력은 농장에서 쉬어요`,
        en: ({ floor, best }) => `Fell on floor ${floor} · Best floor ${best} · Fallen troops rest on the farm`,
    },
    startFloor: {
        ko: ({ start, highest, best }) => `시작 ${start}층 · 최고 시작 ${highest} · 기록 ${best}층`,
        en: ({ start, highest, best }) => `Start floor ${start} · Highest start ${highest} · Record floor ${best}`,
    },
});
