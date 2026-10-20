import { BOSS_REWARD_SETTINGS, bossStageStats, chooseBossSpecies } from './boss-rewards.js';
import { tileDanger, tileSpecies } from './world-map.js';
const CLAMP_UINT32 = (value) => (Number.isSafeInteger(value) ? value >>> 0 : 0);
export function createFarmBossProgress(seed = 731) {
    return {
        currentStage: 1,
        highestClearedRaidStage: 0,
        encounterSeed: (CLAMP_UINT32(seed) ^ 0xa341316c) >>> 0,
        encounterEpoch: 0,
        nextSelectionId: 1,
        selections: [],
    };
}
function selectionRandom(seed, selectionId, stage, encounterEpoch = 0) {
    const EPOCH_SALT = Math.imul(encounterEpoch >>> 0, 0x27d4eb2d);
    let state = (seed ^ Math.imul(selectionId, 0x9e3779b9) ^ Math.imul(stage, 0x85ebca6b) ^ EPOCH_SALT) >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
}
export function advanceFarmBossEncounterEpoch(progress) {
    if (
        !progress ||
        typeof progress !== 'object' ||
        Array.isArray(progress) ||
        !Number.isSafeInteger(progress.encounterEpoch ?? 0) ||
        (progress.encounterEpoch ?? 0) < 0 ||
        (progress.encounterEpoch ?? 0) >= 1e12 ||
        !Array.isArray(progress.selections)
    ) {
        throw new TypeError('Farm boss encounter progress is invalid');
    }
    progress.encounterEpoch = (progress.encounterEpoch ?? 0) + 1;
    progress.selections = [];
    return progress.encounterEpoch;
}
// `unlocked` skips the "one stage past the highest clear" rule for stages the world map has already earned.
export function selectFarmBossStage(progress, stage, { unlocked = false } = {}) {
    if (
        !progress ||
        !Number.isSafeInteger(progress.highestClearedRaidStage) ||
        progress.highestClearedRaidStage < 0 ||
        progress.highestClearedRaidStage > BOSS_REWARD_SETTINGS.maxStage ||
        !Number.isSafeInteger(stage) ||
        stage < 1 ||
        stage >
            (unlocked
                ? BOSS_REWARD_SETTINGS.maxStage
                : Math.min(BOSS_REWARD_SETTINGS.maxStage, progress.highestClearedRaidStage + 2))
    ) {
        throw new RangeError('Boss stage is outside the supported range');
    }
    let selection = progress.selections.find((entry) => entry.stage === stage);
    if (!selection) {
        const SELECTION_ID = progress.nextSelectionId;
        const RANDOM = selectionRandom(progress.encounterSeed, SELECTION_ID, stage, progress.encounterEpoch ?? 0);
        selection = {
            stage,
            species: chooseBossSpecies(RANDOM),
            selectionId: SELECTION_ID,
        };
        progress.selections.push(selection);
        progress.nextSelectionId += 1;
    }
    progress.currentStage = stage;
    const STATS = bossStageStats(stage);
    return {
        ...selection,
        ...STATS,
    };
}
// The boss of a nest on the world map: the stage comes from the distance to the farms, the species from the tile.
export function selectMapBossStage(progress, map, tile) {
    const PREVIOUS = progress.currentStage,
        SELECTION = selectFarmBossStage(progress, tileDanger(map, tile), { unlocked: true });
    // The legacy stage picker keeps its own position; a map fight must not leave it past the unlocked stages.
    progress.currentStage = PREVIOUS;
    return { ...SELECTION, species: tileSpecies(map, tile) };
}
