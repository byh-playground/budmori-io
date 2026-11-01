import { validateFarmProgress, migrateFarmProgress } from '../model/farm-progress.js';

// The farm save record: `farm` is the captured farm progress, or null before the player starts a farm.
// The save module adds `schema` and `revision` around it; an export file is this data as JSON.
export const FARM_SAVE = Object.freeze({
    key: 'budmori-farm',
    version: 2,
    create: () => ({ farm: null }),
    validate: validateFarmRecord,
    migrate: { 1: migrateFarmRecord },
});
function migrateFarmRecord(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).join() !== 'farm') {
        throw new TypeError('농장 저장 형식이 아니에요.');
    }
    return { farm: data.farm === null ? null : migrateFarmProgress(data.farm) };
}
export function validateFarmRecord(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).join() !== 'farm') {
        throw new TypeError('농장 저장 형식이 아니에요.');
    }
    if (data.farm !== null) {
        validateFarmProgress(data.farm);
    }
}
export function farmExportText(data) {
    return JSON.stringify(data);
}
// An export file to import: it must hold a farm, not the empty record before the first farm.
export function readFarmExport(text) {
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        throw new TypeError('저장 파일이 JSON 형식이 아니에요.');
    }
    if (data?.farm?.ledger?.boss && Object.hasOwn(data.farm.ledger.boss, 'rewardStreams')) {
        data = migrateFarmRecord(data);
    }
    validateFarmRecord(data);
    if (data.farm === null) {
        throw new TypeError('저장 파일에 농장이 없어요.');
    }
    return data;
}
