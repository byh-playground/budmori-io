export const FARM_UPGRADE_MAX_LEVELS = Object.freeze({
    food: 4,
    growth: 4,
    breed: 4,
    merge: 4,
});
export const FARM_CAPACITY_STEPS = Object.freeze([50, 75, 100, 150, 200]);
export const FARM_UPGRADE_NODES = Object.freeze([
    {
        id: 'food',
        name: '자동 탭',
        icon: '◒',
        description: '자동 먹이 생성 간격을 단계마다 10% 줄입니다.',
        value: (level) => `${(0.5 / (1 + 0.1 * level)).toFixed(3)}초 / 탭`,
    },
    {
        id: 'growth',
        name: '먹이 찾기',
        icon: '❧',
        description: '먹이를 향해 움직일 때의 속도를 단계마다 10% 높입니다.',
        value: (level) => `${(2.2 * (1 + 0.1 * level)).toFixed(2)} 속도`,
    },
    {
        id: 'breed',
        name: '번식 회복',
        icon: '♡',
        description: '부모의 번식 대기시간을 단계마다 10% 줄입니다.',
        value: (level) => `${(10 / (1 + 0.1 * level)).toFixed(2)}초`,
    },
    {
        id: 'merge',
        name: '합체 회복',
        icon: '◇',
        description: '합체 후 대기시간을 단계마다 10% 줄입니다.',
        value: (level) => `${(4 / (1 + 0.1 * level)).toFixed(2)}초`,
    },
]);
const FARM_UPGRADE_IDS = Object.freeze(Object.keys(FARM_UPGRADE_MAX_LEVELS));
export function createFarmUpgradeState() {
    return Object.fromEntries(FARM_UPGRADE_IDS.map((id) => [id, 0]));
}
export function isValidFarmUpgradeState(state) {
    if (!state || typeof state !== 'object' || Array.isArray(state)) {
        return false;
    }
    if (Object.keys(state).length !== FARM_UPGRADE_IDS.length) {
        return false;
    }
    return FARM_UPGRADE_IDS.every(
        (id) =>
            Object.hasOwn(state, id) &&
            Number.isSafeInteger(state[id]) &&
            state[id] >= 0 &&
            state[id] <= FARM_UPGRADE_MAX_LEVELS[id],
    );
}
export function getFarmUpgradeLevel(state, id) {
    return Number.isSafeInteger(state?.[id]) ? state[id] : 0;
}
export function getFarmUpgradeInvestedCount(state) {
    if (!isValidFarmUpgradeState(state)) {
        return 0;
    }
    return FARM_UPGRADE_IDS.reduce((total, id) => total + state[id], 0);
}
export function farmUpgradeRate(state, id) {
    return 1 + 0.1 * getFarmUpgradeLevel(state, id);
}
export function getFarmCapacity(capacityLevel = 0) {
    return FARM_CAPACITY_STEPS[Number.isSafeInteger(capacityLevel) ? capacityLevel : 0] ?? FARM_CAPACITY_STEPS[0];
}
export function getAutoTapSeconds(state) {
    return 0.5 / farmUpgradeRate(state, 'food');
}
export function getBreedCooldownSeconds(state, baseSeconds = 10) {
    return baseSeconds / farmUpgradeRate(state, 'breed');
}
export function getMergeCooldownSeconds(state, baseSeconds = 4) {
    return baseSeconds / farmUpgradeRate(state, 'merge');
}
