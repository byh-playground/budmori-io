import {BOSS_REWARD_SETTINGS, bossStageStats, chooseBossSpecies} from './boss-rewards.js';

const clampUint32 = value => Number.isSafeInteger(value) ? value >>> 0 : 0;

export function createFarmBossProgress(seed = 731) {
  return {
    currentStage: 1,
    encounterSeed: (clampUint32(seed) ^ 0xa341316c) >>> 0,
    nextSelectionId: 1,
    selections: []
  };
}

function selectionRandom(seed, selectionId, stage) {
  let state = (seed ^ Math.imul(selectionId, 0x9e3779b9) ^ Math.imul(stage, 0x85ebca6b)) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

export function selectFarmBossStage(progress, stage) {
  if (!progress || !Number.isSafeInteger(stage) || stage < 1 || stage > BOSS_REWARD_SETTINGS.maxStage) throw new RangeError('Boss stage is outside the supported range');
  let selection = progress.selections.find(entry => entry.stage === stage);
  if (!selection) {
    const selectionId = progress.nextSelectionId;
    const random = selectionRandom(progress.encounterSeed, selectionId, stage);
    selection = {stage, species:chooseBossSpecies(random), selectionId};
    progress.selections.push(selection);
    progress.nextSelectionId += 1;
  }
  progress.currentStage = stage;
  const stats = bossStageStats(stage);
  return {...selection, ...stats};
}
