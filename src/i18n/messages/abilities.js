import { LOCALE } from '../locale.js';

// Ability chips (src/features/abilities/*/presentation.js): `label` is the effect line, `title` the short chip.
const PERCENT = (value) => Math.round(value * 100);

export const ABILITIES = LOCALE.messages({
    barleyShredLabel: {
        ko: ({ value }) => `기본 공격 적중 후 방어력 ${value} 감소 · 감소마다 3초 · 방어력 최저 0`,
        en: ({ value }) => `Basic hits cut Defense by ${value} · 3s each · Defense min 0`,
    },
    barleyShredTitle: { ko: ({ value }) => `방어력 −${value}`, en: ({ value }) => `Defense −${value}` },
    chestnutThornsLabel: {
        ko: ({ value }) => `3초마다 가시 ${value}발 · 발당 공격력 100% · 0.1초 간격`,
        en: ({ value }) => `${value} thorns every 3s · 100% Attack each · 0.1s apart`,
    },
    chestnutThornsTitle: { ko: ({ value }) => `가시 ${value}발`, en: ({ value }) => `${value} thorns` },
    cornAttachmentLabel: {
        ko: ({ value }) => `부착 1초 후 연쇄 폭발 · 알갱이마다 공격력 ${PERCENT(value)}%`,
        en: ({ value }) => `Chain blast 1s after sticking · ${PERCENT(value)}% Attack per kernel`,
    },
    cornAttachmentTitle: {
        ko: ({ value }) => `알갱이 ${PERCENT(value)}%`,
        en: ({ value }) => `Kernel ${PERCENT(value)}%`,
    },
    kidneyLeapLabel: {
        ko: ({ value }) => `가까운 적에게 도약 · 착지 후 도약 재사용 ${PERCENT(value)}% 확률`,
        en: ({ value }) => `Leaps at nearby foes · ${PERCENT(value)}% chance to reset on landing`,
    },
    kidneyLeapTitle: { ko: ({ value }) => `재사용 ${PERCENT(value)}%`, en: ({ value }) => `Reset ${PERCENT(value)}%` },
    peaRecoveryBoostLabel: {
        ko: ({ value }) => `적에게 밀려난 뒤 2초 이동 속도 +${PERCENT(value)}%`,
        en: ({ value }) => `+${PERCENT(value)}% Move Speed for 2s after knockback`,
    },
    peaRecoveryBoostTitle: {
        ko: ({ value }) => `빠른 복귀 +${PERCENT(value)}%`,
        en: ({ value }) => `Quick Return +${PERCENT(value)}%`,
    },
    peanutDeathSplitLabel: {
        ko: ({ value }) => `사망 시 T1 분열체 2마리 · 체력/공격력 ×${value}`,
        en: ({ value }) => `Splits into 2 T1 halves on death · HP/Attack ×${value}`,
    },
    peanutDeathSplitTitle: { ko: ({ value }) => `분열체 ×${value}`, en: ({ value }) => `Halves ×${value}` },
    riceCriticalLabel: {
        ko: ({ value, multiplier }) =>
            `잃은 체력 비율에 따라 치명타 확률 최대 +${PERCENT(value)}%p · 치명타 피해 ×${multiplier}`,
        en: ({ value, multiplier }) =>
            `Crit Chance up to +${PERCENT(value)}%p as the foe loses HP · Crit Damage ×${multiplier}`,
    },
    riceCriticalTitle: {
        ko: ({ value }) => `치명타 최대 +${PERCENT(value)}%p`,
        en: ({ value }) => `Crit up to +${PERCENT(value)}%p`,
    },
    walnutRawGuardLabel: {
        ko: ({ value }) => `5초마다 2초 방어 · 방어력 +50 · 모아 둔 피해의 ${PERCENT(value)}% 추가 반격`,
        en: ({ value }) => `Guard 2s every 5s · Defense +50 · counter with ${PERCENT(value)}% of stored damage`,
    },
    walnutRawGuardTitle: {
        ko: ({ value }) => `추가 피해 ${PERCENT(value)}%`,
        en: ({ value }) => `Bonus damage ${PERCENT(value)}%`,
    },
    wheatCommandBonus: {
        ko: ({ bonus }) => `공격 속도 보너스 +${bonus}%`,
        en: ({ bonus }) => `Attack Speed bonus +${bonus}%`,
    },
    wheatCommandRangeLabel: {
        ko: ({ value }) => `주변 기본 공격 사거리 ×${value}`,
        en: ({ value }) => `Nearby basic attack range ×${value}`,
    },
    wheatCommandRangeTitle: { ko: ({ value }) => `범위 ×${value}`, en: ({ value }) => `Range ×${value}` },
});
