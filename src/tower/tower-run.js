import { BOSS_SKILL_IDS } from '../formation/formation-skill-state.js';
// The rules of one tower climb that are not about fighting: which kind of floor comes next, and the cards a strengthening
// floor offers. Pure functions of the run state and a random source, so the model only stores the results.

export const TOWER_RUN_SETTINGS = Object.freeze({
    // A floor kind's weight is `base * (1 + gain * floors since it last came)`, so one that stays away becomes likelier.
    // Events weigh nothing while none are registered (TOWER_EVENTS below).
    floorBase: Object.freeze({ battle: 1.5, power: 8, event: 1 }),
    gain: 0.5,
    // A fight is forced once this many floors have passed without one; the fixed mid boss counts as a fight.
    battleMaxGap: 4,
    // A card can be taken this many times in one climb, whatever its rarity.
    cardCap: 10,
    // Rarity weights at floor 0 and how much each floor adds, capped. Order: common, rare, epic.
    // Three cards a strengthening floor, and how likely each kind is to fill a slot: stat 8, passive 1, skill 1.
    cardsPerFloor: 3,
    kindWeights: Object.freeze({ stat: 8, passive: 1, skill: 1 }),
    rarityBase: Object.freeze([70, 25, 5]),
    rarityPerFloor: Object.freeze([0, 0.25, 0.1]),
    rarityMax: Object.freeze([70, 40, 15]),
});

// Event floors: structure only. An event is { id, name, text, available(world), apply(world) } and a floor offers up to
// three of the available ones; none are registered yet.
export const TOWER_EVENTS = Object.freeze([]);

// A climb starts with nothing taken and the first floor already a fight.
export function freshTowerRun() {
    return {
        doors: [],
        nextKind: '',
        cards: [],
        passives: {},
        relics: new Map(),
        bossRelics: new Map(),
        bossCards: [],
        bossPassives: {},
        bossFallen: 0,
        bossCardDraw: null,
        playerPick: null,
        since: { battle: 0, power: 1, event: 1 },
        // This fight's: allies fallen so far and the units whose undying card is already spent.
        fallen: 0,
        undyingUsed: new Set(),
    };
}

// Passive cards: effects that need a condition. Each card adds `values[rarity]` to one total for the whole climb; the
// totals (passiveTotals) are what the fight reads. Stacking, rarity and the ten-card cap are the same as stat cards.
export const PASSIVE_SETTINGS = Object.freeze({
    lastStandBelow: 0.5,
    resolveBelow: 0.3,
    openingSeconds: 10,
    // A fallen ally adds to vengeance this many times at most.
    vengeanceMaxFallen: 10,
    // Healing of a fallen ally's neighbours reaches this far.
    helperRadius: 7,
    resolveMaxReduction: 0.8,
    undyingMaxRestore: 0.9,
});
const NUMBER = (value) => new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 4 }).format(value);
const PERCENT = (value) => `${NUMBER(value * 100)}%`;
export const PASSIVE_CARDS = Object.freeze([
    {
        id: 'last-stand',
        name: '배수진',
        values: [0.15, 0.24, 0.38],
        text: (value) => `체력 50% 이하일 때 공격력 +${PERCENT(value)}`,
    },
    {
        id: 'resolve',
        name: '불굴',
        values: [0.15, 0.22, 0.32],
        text: (value) => `체력 30% 이하일 때 받는 피해 -${PERCENT(value)}`,
    },
    {
        id: 'vengeance',
        name: '복수',
        values: [0.03, 0.045, 0.07],
        text: (value) => `아군이 쓰러질 때마다 공격력 +${PERCENT(value)} (전투 동안, 최대 10회)`,
    },
    {
        id: 'opening',
        name: '선제 공격',
        values: [0.4, 0.6, 0.9],
        text: (value) => `전투 시작 후 ${PASSIVE_SETTINGS.openingSeconds}초간 공격력 +${PERCENT(value)}`,
    },
    {
        id: 'helper',
        name: '도우미',
        values: [0.05, 0.08, 0.12],
        text: (value) => `아군이 쓰러지면 주변 아군을 최대 체력의 ${PERCENT(value)}만큼 회복`,
    },
    {
        id: 'undying',
        name: '불사',
        values: [0.05, 0.15, 0.3],
        text: (value) => `아군마다 전투당 한 번, 치명적인 피해를 견디고 체력 ${PERCENT(value)}로 남음`,
    },
]);

export function passiveCard(id) {
    return PASSIVE_CARDS.find((card) => card.id === id);
}

// The run's passive cards as one {id: total} table: the sum of the taken cards' values.
const BOSS_CARD_PROFILE = Object.freeze({ 'regen-pct': 0.25, 'lifesteal-flat': 0.25, helper: 0.25 });
export function cardValue(card, rarity, role = 'player') {
    return card.values[rarity] * (role === 'boss' ? (BOSS_CARD_PROFILE[card.id] ?? 1) : 1);
}

export function passiveTotals(cards, role = 'player') {
    const TOTALS = {};
    for (const TAKEN of cards) {
        const CARD = passiveCard(TAKEN.id);
        if (CARD) {
            TOTALS[CARD.id] = (TOTALS[CARD.id] || 0) + cardValue(CARD, TAKEN.rarity, role);
        }
    }
    return TOTALS;
}

export const RARITY_NAMES = Object.freeze(['일반', '희귀', '영웅']);

// A stat card adds `values[rarity]` to one stat for the whole climb: `flat` is added to the stat's base, `pct` is added to
// a shared multiplier, so the result is (base + all flat) * (1 + all pct). Armor, crit and lifesteal have no meaningful
// base to scale and so exist as one kind only. Regen `pct` is a share of max HP per second. `icon` names the stat's
// picture in src/ui/icons.js, shared by both kinds of one stat.
const STAT_CARDS = Object.freeze([
    { id: 'attack-pct', stat: 'attackPower', mode: 'pct', name: '공격력', icon: 'attack', values: [0.1, 0.16, 0.25] },
    { id: 'attack-flat', stat: 'attackPower', mode: 'flat', name: '공격력', icon: 'attack', values: [2, 3, 5] },
    { id: 'hp-pct', stat: 'maxHp', mode: 'pct', name: '체력', icon: 'hp', values: [0.12, 0.19, 0.3] },
    { id: 'hp-flat', stat: 'maxHp', mode: 'flat', name: '체력', icon: 'hp', values: [20, 32, 50] },
    { id: 'regen-pct', stat: 'regen', mode: 'pct', name: '재생', icon: 'regen', values: [0.005, 0.008, 0.0125] },
    { id: 'regen-flat', stat: 'regen', mode: 'flat', name: '재생', icon: 'regen', values: [1, 1.6, 2.5] },
    { id: 'armor-flat', stat: 'armor', mode: 'flat', name: '방어력', icon: 'armor', values: [10, 16, 25] },
    {
        id: 'attack-speed-pct',
        stat: 'attackSpeed',
        mode: 'pct',
        name: '공격 속도',
        icon: 'attack-speed',
        values: [0.06, 0.1, 0.15],
    },
    {
        id: 'move-speed-pct',
        stat: 'moveSpeed',
        mode: 'pct',
        name: '이동 속도',
        icon: 'move-speed',
        values: [0.06, 0.1, 0.15],
    },
    {
        id: 'crit-chance-flat',
        stat: 'critChance',
        mode: 'flat',
        name: '치명타 확률',
        icon: 'crit-chance',
        values: [0.05, 0.08, 0.12],
    },
    {
        id: 'crit-multiplier-flat',
        stat: 'critMultiplier',
        mode: 'flat',
        name: '치명타 피해',
        icon: 'crit-damage',
        values: [0.2, 0.32, 0.5],
    },
    {
        id: 'lifesteal-flat',
        stat: 'lifesteal',
        mode: 'flat',
        name: '흡혈',
        icon: 'lifesteal',
        values: [0.03, 0.05, 0.075],
    },
]);

// Previews and receipts use the same units, including the boss's explicit role profile.
function statModifierText(card, value) {
    if (card.stat === 'critChance' || card.stat === 'lifesteal') {
        return `+${NUMBER(value * 100)}%p`;
    }
    if (card.stat === 'regen' && card.mode === 'pct') {
        return `+${NUMBER(value * 100)}% 체력/초`;
    }
    if (card.stat === 'regen') {
        return `+${NUMBER(value)}/초`;
    }
    return card.mode === 'pct' ? `+${NUMBER(value * 100)}%` : `+${NUMBER(value)}`;
}
export function statCardText(card, rarity, role = 'player') {
    return statModifierText(card, cardValue(card, rarity, role));
}

// Applied passive strength, not a claim that its condition has already triggered.
function passiveEffectValue(id, value) {
    if (id === 'resolve') {
        return Math.min(PASSIVE_SETTINGS.resolveMaxReduction, value);
    }
    if (id === 'undying') {
        return Math.min(PASSIVE_SETTINGS.undyingMaxRestore, value);
    }
    return value;
}
export function passiveEffectText(card, value, role = 'player') {
    return card.text(passiveEffectValue(card.id, value)).replaceAll('아군', role === 'boss' ? '보스 진영' : '아군');
}

// One actual before/after value in the same units as the selected card.
export function cardAcquisitionText(receipt) {
    const CARD = receipt.card,
        BEFORE = receipt.before.value,
        AFTER = receipt.after.value;
    if (CARD.type === 'stat') {
        const DEFINITION = statCard(CARD.id);
        return `${DEFINITION.name} 누적 강화 ${statModifierText(DEFINITION, BEFORE)} → ${statModifierText(DEFINITION, AFTER)}`;
    }
    const DEFINITION = passiveCard(CARD.id);
    return `${passiveEffectText(DEFINITION, AFTER, receipt.role)} · 누적 ${PERCENT(BEFORE)} → ${PERCENT(AFTER)}`;
}

export function statCard(id) {
    return STAT_CARDS.find((card) => card.id === id);
}

// The run's cards as one {stat: {flat, pct}} table for the stat resolver.
export function runStatModifiers(cards, role = 'player') {
    const MODS = {};
    for (const TAKEN of cards) {
        const CARD = statCard(TAKEN.id);
        if (CARD) {
            MODS[CARD.stat] ??= { flat: 0, pct: 0 };
            MODS[CARD.stat][CARD.mode] += cardValue(CARD, TAKEN.rarity, role);
        }
    }
    return MODS;
}

export function cardStacks(cards, id) {
    return cards.reduce((sum, card) => sum + (card.id === id ? 1 : 0), 0);
}

function weightedIndex(weights, random) {
    const TOTAL = weights.reduce((sum, weight) => sum + weight, 0);
    let rest = random() * TOTAL;
    for (let index = 0; index < weights.length; index++) {
        rest -= weights[index];
        if (rest < 0 && weights[index] > 0) {
            return index;
        }
    }
    return weights.findLastIndex((weight) => weight > 0);
}

// The next floor's kind: the mid boss is fixed, the top floor and a long gap without one force a fight, the rest is a
// weighted draw.
export function rollFloorKind({ floor, since, random, midBossEvery, topFloor }) {
    const SETTINGS = TOWER_RUN_SETTINGS;
    if (floor % midBossEvery === 0) {
        return 'mid';
    }
    // The top floor is the last: it has to be a fight.
    if (floor >= topFloor || since.battle >= SETTINGS.battleMaxGap) {
        return 'battle';
    }
    const KINDS = Object.keys(SETTINGS.floorBase);
    return KINDS[
        weightedIndex(
            KINDS.map((kind) =>
                kind === 'event' && !TOWER_EVENTS.length
                    ? 0
                    : SETTINGS.floorBase[kind] * (1 + SETTINGS.gain * since[kind]),
            ),
            random,
        )
    ];
}

// Floors since each kind last came; a mid boss is a fight.
export function advanceSince(since, kind) {
    const CAME = kind === 'mid' ? 'battle' : kind;
    return Object.fromEntries(Object.entries(since).map(([key, value]) => [key, key === CAME ? 0 : value + 1]));
}

function rollRarity(floor, random) {
    const SETTINGS = TOWER_RUN_SETTINGS;
    return weightedIndex(
        SETTINGS.rarityBase.map((base, index) =>
            Math.min(SETTINGS.rarityMax[index], base + SETTINGS.rarityPerFloor[index] * floor),
        ),
        random,
    );
}

// A strengthening floor always offers three different cards. Each slot draws its kind by `kindWeights`, then a card of
// that kind; a kind with nothing left to offer is skipped, so there are fewer than three only when almost nothing is left.
export function rollCardOffers({ floor, cards, relics, skillIds, passiveIds, relicSlots, relicMaxLevel, random }) {
    const POOLS = {
        stat: STAT_CARDS.filter((card) => cardStacks(cards, card.id) < TOWER_RUN_SETTINGS.cardCap).map(
            (card) => card.id,
        ),
        skill: skillIds.filter((id) => {
            const LEVEL = relics.get(id) || 0;
            return LEVEL ? LEVEL < relicMaxLevel : relics.size < relicSlots;
        }),
        passive: passiveIds.filter((id) => cardStacks(cards, id) < TOWER_RUN_SETTINGS.cardCap),
    };
    const OFFERS = [];
    while (OFFERS.length < TOWER_RUN_SETTINGS.cardsPerFloor) {
        const TYPES = Object.keys(POOLS).filter((type) => POOLS[type].length);
        if (!TYPES.length) {
            break;
        }
        const TYPE =
                TYPES[
                    weightedIndex(
                        TYPES.map((type) => TOWER_RUN_SETTINGS.kindWeights[type]),
                        random,
                    )
                ],
            ID = POOLS[TYPE].splice(Math.floor(random() * POOLS[TYPE].length), 1)[0];
        OFFERS.push(
            TYPE === 'skill' ? { type: TYPE, id: ID } : { type: TYPE, id: ID, rarity: rollRarity(floor, random) },
        );
    }
    return OFFERS;
}

export function rollEventOffers({ world, random }) {
    const POOL = TOWER_EVENTS.filter((event) => event.available(world)),
        OFFERS = [];
    while (OFFERS.length < 3 && POOL.length) {
        OFFERS.push({ type: 'event', id: POOL.splice(Math.floor(random() * POOL.length), 1)[0].id });
    }
    return OFFERS;
}

function acquisitionState(state, card, role) {
    const LEVEL = card.type === 'skill' ? state.relics.get(card.id) || 0 : cardStacks(state.cards, card.id);
    if (card.type === 'skill') {
        return { level: LEVEL, value: LEVEL };
    }
    const DEFINITION = statCard(card.id),
        VALUE = DEFINITION
            ? runStatModifiers(state.cards, role)[DEFINITION.stat]?.[DEFINITION.mode] || 0
            : passiveEffectValue(card.id, passiveTotals(state.cards, role)[card.id] || 0);
    return { level: LEVEL, value: VALUE };
}

// The receipt is captured in the same transaction as acquisition. Presentation only reads it.
export function applyTowerCard(state, card, role = 'player') {
    const BEFORE = acquisitionState(state, card, role);
    if (card.type === 'skill') {
        state.relics.set(card.id, BEFORE.level + 1);
    } else {
        state.cards.push({ id: card.id, rarity: card.rarity });
    }
    const AFTER = acquisitionState(state, card, role);
    return {
        card: { ...card },
        role,
        before: BEFORE,
        after: AFTER,
        level: AFTER.level,
        status: BEFORE.level ? 'upgraded' : 'acquired',
    };
}

// 'selected' is the time the boss spends eating the card it picked; its outcome shows once it has swallowed.
const CARD_CHOICE_TIMING = Object.freeze({ offers: 0.45, selected: 1.3, total: 1.8 });
export function cardChoicePhase(draw, time) {
    if (!draw || time >= draw.until) {
        return '';
    }
    const ELAPSED = Math.max(0, time - draw.startedAt);
    return ELAPSED < CARD_CHOICE_TIMING.offers
        ? 'offers'
        : ELAPSED < CARD_CHOICE_TIMING.selected
          ? 'selected'
          : 'outcome';
}

// The boss takes first from the same three cards the player is offered, and only a card it can use: a boss skill or
// passive (never 'undying'), a stat card, all within its own caps. Among those: higher rarity first, then
// skill, passive, stat. A skill has no rarity and ranks as the lowest one. With nothing usable it takes nothing.
const BOSS_PICK_TYPE_ORDER = Object.freeze({ skill: 0, passive: 1, stat: 2 });
function bossCanUse(tower, card, slots, maxLevel) {
    if (card.type === 'skill') {
        const LEVEL = tower.bossRelics.get(card.id) || 0;
        return BOSS_SKILL_IDS.includes(card.id) && (LEVEL ? LEVEL < maxLevel : tower.bossRelics.size < slots);
    }
    return (
        !(card.type === 'passive' && card.id === 'undying') &&
        cardStacks(tower.bossCards, card.id) < TOWER_RUN_SETTINGS.cardCap
    );
}
export function pickBossCardIndex(tower, offers, slots = 3, maxLevel = 5) {
    let best = -1;
    for (const [INDEX, CARD] of offers.entries()) {
        if (!bossCanUse(tower, CARD, slots, maxLevel)) {
            continue;
        }
        const BEST = offers[best];
        if (
            !BEST ||
            (CARD.rarity || 0) > (BEST.rarity || 0) ||
            ((CARD.rarity || 0) === (BEST.rarity || 0) &&
                BOSS_PICK_TYPE_ORDER[CARD.type] < BOSS_PICK_TYPE_ORDER[BEST.type])
        ) {
            best = INDEX;
        }
    }
    return best;
}
// `offers` are the shared cards of the floor about to be chosen. Returns the cards left for the player.
export function drawBossCard(tower, offers, time, slots = 3, maxLevel = 5) {
    const STATE = { cards: tower.bossCards, relics: tower.bossRelics },
        OFFER_STATE = { cards: STATE.cards.map((card) => ({ ...card })), relics: [...STATE.relics] },
        SELECTED_INDEX = pickBossCardIndex(tower, offers, slots, maxLevel),
        CARD = offers[SELECTED_INDEX] || null,
        RECEIPT = CARD ? applyTowerCard(STATE, CARD, 'boss') : null;
    tower.bossCardDraw = {
        serial: (tower.bossCardDraw?.serial || 0) + 1,
        floor: tower.floor,
        offers: offers.map((card) => ({ ...card })),
        offerState: OFFER_STATE,
        selectedIndex: SELECTED_INDEX,
        card: CARD,
        id: CARD?.id || '',
        level: RECEIPT?.level || 0,
        status: RECEIPT?.status || 'maxed',
        receipt: RECEIPT,
        startedAt: time,
        until: time + (CARD ? CARD_CHOICE_TIMING.total : 0),
    };
    return offers.filter((_, index) => index !== SELECTED_INDEX);
}
