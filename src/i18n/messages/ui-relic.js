import { defineMessages } from '../text.js';

// Relic (tower auto-skill) docks and their detail dialog (src/ui/relic-dock.js).
// Values arrive already formatted as strings; `boss` picks the boss side's wording.
export const RELIC = defineMessages({
    seconds: { ko: ({ value }) => `${value}초`, en: ({ value }) => `${value}s` },
    floor: { ko: ({ floor }) => `${floor}층`, en: ({ floor }) => `Floor ${floor}` },
    newSkill: { ko: '새 기술', en: 'New skill' },

    baseDamage: { ko: ({ amount }) => `기본 ${amount}`, en: ({ amount }) => `Base ${amount}` },
    maxHpDamage: {
        ko: ({ percent }) => `대상 최대 체력 ${percent}%`,
        en: ({ percent }) => `${percent}% of target max HP`,
    },
    missingHpDamage: {
        ko: ({ percent }) => `대상이 잃은 체력 ${percent}%`,
        en: ({ percent }) => `${percent}% of target missing HP`,
    },
    castTotal: { ko: ({ parts }) => `1회 발동 총 ${parts}`, en: ({ parts }) => `Total per cast ${parts}` },
    splitOverTime: { ko: ({ duration }) => `${duration} 동안 분할`, en: ({ duration }) => `Split over ${duration}` },
    splitMeteors: {
        ko: ({ count }) => `유성 ${count}개로 분할`,
        en: ({ count }) => `Split into ${count} ${count === 1 ? 'meteor' : 'meteors'}`,
    },
    stun: { ko: ({ duration }) => `${duration} 기절`, en: ({ duration }) => `Stuns for ${duration}` },
    areaDamage: { ko: '범위 피해', en: 'Area damage' },
    singleDamage: { ko: '단일 피해', en: 'Single-target damage' },
    beforeDefense: { ko: '방어 적용 전', en: 'before Defense' },

    giantTargets: {
        ko: ({ count }) => `무작위 ${count}명`,
        en: ({ count }) => `${count} random ${count === 1 ? 'unit' : 'units'}`,
    },
    giantExtraDamage: {
        ko: ({ amount }) => `기본 공격 한 동작 추가 피해 ${amount}`,
        en: ({ amount }) => `+${amount} damage per basic attack action`,
    },
    giantBody: {
        ko: ({ size, armor }) => `몸집 ×${size}, 방어력 +${armor}`,
        en: ({ size, armor }) => `Size ×${size}, Defense +${armor}`,
    },
    giantSplit: { ko: '연타 분할·방어 적용 전', en: 'split across hits, before Defense' },

    copyEffect: {
        ko: ({ boss, amount }) =>
            `${boss ? '보스 진영' : '아군'} 밀집 위치에 체력 1 분신 · 반경 ${amount} × T1 몸통 지름 · 전투 종료까지`,
        en: ({ boss, amount }) =>
            `1-HP clones where ${boss ? 'the boss’s side is' : 'allies are'} densest · Radius ${amount} × T1 body diameter · Until the battle ends`,
    },

    healingTotal: {
        ko: ({ boss, amount, percent }) =>
            `총 회복 ${amount} + ${boss ? '보스 자신의' : '원본 아군 평균'} 최대 체력 ${percent}%`,
        en: ({ boss, amount, percent }) =>
            `Total heal ${amount} + ${percent}% of ${boss ? 'the boss’s own' : 'original allies’ average'} max HP`,
    },
    healingSpread: {
        ko: ({ duration }) => `${duration} 동안 부상자에게 분배`,
        en: ({ duration }) => `Shared among the wounded over ${duration}`,
    },

    casting: { ko: ({ duration }) => `시전 ${duration}`, en: ({ duration }) => `Casting ${duration}` },
    recovering: { ko: ({ duration }) => `후딜 ${duration}`, en: ({ duration }) => `Recovering ${duration}` },
    waitingBattle: { ko: '전투 대기', en: 'Waiting for battle' },
    cooldown: { ko: ({ duration }) => `재사용 ${duration}`, en: ({ duration }) => `Cooldown ${duration}` },
    ready: { ko: '발동 대기', en: 'Ready' },
    charging: { ko: ({ percent }) => `충전 ${percent}%`, en: ({ percent }) => `Charging ${percent}%` },

    conditionDamageDealt: { ko: '준 피해', en: 'Damage dealt' },
    conditionDamageTaken: { ko: '받은 피해', en: 'Damage taken' },
    conditionHits: { ko: '공격 적중', en: 'Hits landed' },
    conditionCritHits: { ko: '치명타', en: 'Critical hits' },
    conditionHitCharge: { ko: '적중 충전', en: 'Hit charge' },
    conditionAllyDeaths: { ko: '아군 쓰러짐', en: 'Allies fallen' },
    conditionTime: { ko: '전투 시간', en: 'Battle time' },
    conditionBossDamageTaken: { ko: '본체가 받은 피해', en: 'Damage taken by the boss' },
    conditionBossDamageDealt: { ko: '본체가 준 피해', en: 'Damage dealt by the boss' },
    conditionBossAllyDeaths: { ko: '보스 진영 쓰러짐', en: 'Boss side fallen' },
    conditionHitChargeRule: {
        ko: ({ bonus }) => `적중당 +1 · 치명타 추가 +${bonus}`,
        en: ({ bonus }) => `+1 per hit · +${bonus} more on a critical hit`,
    },
    thresholdRule: {
        ko: ({ floor, base, percent }) =>
            `${floor}층 기준 ${base}과 시전자 최대 체력 ${percent}% 중 작은 값 · 유물 레벨과 무관`,
        en: ({ floor, base, percent }) =>
            `The lower of ${base} (floor ${floor}) and ${percent}% of the caster’s max HP · Not affected by relic level`,
    },
    healingUnknownBoss: {
        ko: '전투에서 시전자 보스의 최대 체력으로 계산',
        en: 'Calculated in battle from the casting boss’s max HP',
    },
    healingUnknownAlly: {
        ko: '전투에서 현재 원본 아군 기준으로 계산',
        en: 'Calculated in battle from the current original allies',
    },
    healingProgress: {
        ko: ({ total, ratio }) => `이번 총 회복 ${total} · 문턱은 회복량 ×${ratio}`,
        en: ({ total, ratio }) => `Total heal this cast ${total} · Threshold is heal ×${ratio}`,
    },

    dockLabel: {
        ko: ({ boss }) => `${boss ? '보스' : '아군'} 기술`,
        en: ({ boss }) => `${boss ? 'Boss' : 'Ally'} skills`,
    },
    closeDetail: { ko: '기술 상세 닫기', en: 'Close skill details' },
    detailCondition: { ko: '발동 조건', en: 'Trigger' },
    detailState: { ko: '현재 상태', en: 'Status' },
    detailCooldown: { ko: '재사용 대기', en: 'Cooldown' },
    cooldownRule: {
        ko: ({ seconds }) => `${seconds}초 · 조건과 재사용 대기를 모두 채우면 자동 발동`,
        en: ({ seconds }) => `${seconds}s · Casts automatically once the trigger and cooldown are both met`,
    },
    detailTitle: {
        ko: ({ boss, name, level }) => `${boss ? '보스' : '아군'} · ${name} Lv.${level}`,
        en: ({ boss, name, level }) => `${boss ? 'Boss' : 'Ally'} · ${name} Lv.${level}`,
    },
    slotDetail: {
        ko: ({ name, level }) => `${name} Lv.${level} 상세`,
        en: ({ name, level }) => `${name} Lv.${level} details`,
    },
    slotSummary: {
        ko: ({ boss, name, level }) => `${boss ? '보스' : '아군'} ${name} Lv.${level}`,
        en: ({ boss, name, level }) => `${boss ? 'Boss' : 'Ally'} ${name} Lv.${level}`,
    },
    thisBattle: { ko: ({ badge }) => `이번 전투 ${badge}`, en: ({ badge }) => `This battle: ${badge}` },
    viewDetails: { ko: '상세 보기', en: 'View details' },
});
