import { PRODUCT_VERSION, COMPATIBILITY } from '../version.js';
import {
    captureFarmProgress,
    restoreFarmProgress,
    validateFarmProgress,
    migrateFarmProgress,
    sameFarmProgress,
} from '../model/farm-progress.js';
const MAX_BYTES = 2 * 1024 * 1024;
const COMPATIBILITY_LOCAL = (version) => (typeof version === 'string' ? version.split('.').slice(0, 2).join('.') : '');
const IS_READABLE_COMPATIBILITY = (version) =>
    [
        COMPATIBILITY,
        '0.41',
        '0.40',
        '0.39',
        '0.38',
        '0.37',
        '0.36',
        '0.35',
        '0.34',
        '0.33',
        '0.32',
        '0.31',
        '0.30',
    ].includes(COMPATIBILITY_LOCAL(version));
function readFarmSave(text) {
    if (typeof text !== 'string' || text.length > MAX_BYTES) {
        throw Error('Save data is too large. The original data was left unchanged.');
    }
    const PARSED = JSON.parse(text);
    if (
        PARSED?.schema !== 'budmori-farm' ||
        !IS_READABLE_COMPATIBILITY(PARSED.productVersion) ||
        !PARSED.progress ||
        typeof PARSED.progress !== 'object' ||
        Array.isArray(PARSED.progress) ||
        Object.keys(PARSED).some((key) => !['schema', 'productVersion', 'progress'].includes(key))
    ) {
        throw Error(
            'This save does not match the current Farm schema. Export the original save before importing a compatible save.',
        );
    }
    return PARSED;
}
export function decodeFarmSaveRecord(text) {
    const PARSED = readFarmSave(text);
    if (COMPATIBILITY_LOCAL(PARSED.productVersion) === '0.30' && PARSED.progress.player?.schemaVersion !== 3) {
        throw new TypeError('Invalid legacy farm schema. The original save was left unchanged.');
    }
    const PROGRESS = migrateFarmProgress(PARSED.progress);
    return { progress: PROGRESS, migrated: !sameFarmProgress(PARSED.progress, PROGRESS) };
}
export function decodeFarmSave(text) {
    return decodeFarmSaveRecord(text).progress;
}
export function validateSave(text) {
    decodeFarmSave(text);
    return true;
}
export function parseSave(text) {
    return restoreFarmProgress(decodeFarmSave(text));
}
export function encodeFarmSave(world, data = captureFarmProgress(world)) {
    validateFarmProgress(data);
    const TEXT = JSON.stringify({
        schema: 'budmori-farm',
        productVersion: PRODUCT_VERSION,
        progress: data,
    });
    if (TEXT.length > MAX_BYTES) {
        throw Error('Save data is too large. The original data was left unchanged.');
    }
    return {
        data,
        text: TEXT,
    };
}
