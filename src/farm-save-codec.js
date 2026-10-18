import { PRODUCT_VERSION, COMPATIBILITY } from './version.js';
import { normalizeSnapshot, validateSnapshot } from './farm-state.js';
import { captureFarmProgress, restoreFarmProgress, validateFarmProgress } from './farm-progress.js';
import { migrateBaselineAbilityInvestments } from './ability-state.js';
const MAX_BYTES = 2 * 1024 * 1024;
const LEGACY_COMPATIBILITIES = new Set(['0.7', '0.6', '0.5', '0.4']);
const COMPATIBILITY_LOCAL = (version) => (typeof version === 'string' ? version.split('.').slice(0, 2).join('.') : '');
const IS_READABLE_COMPATIBILITY = (version) =>
    COMPATIBILITY_LOCAL(version) === COMPATIBILITY || LEGACY_COMPATIBILITIES.has(COMPATIBILITY_LOCAL(version));
export { IS_READABLE_COMPATIBILITY as isReadableCompatibility };
export function readFarmSave(text) {
    if (typeof text !== 'string' || text.length > MAX_BYTES) {
        throw Error('저장 파일이 너무 큽니다.');
    }
    const PARSED = JSON.parse(text),
        VERSION = COMPATIBILITY_LOCAL(PARSED?.productVersion),
        FIELD = VERSION === COMPATIBILITY ? 'progress' : 'world';
    if (
        PARSED?.schema !== 'budmori-farm' ||
        !IS_READABLE_COMPATIBILITY(PARSED.productVersion) ||
        !PARSED[FIELD] ||
        typeof PARSED[FIELD] !== 'object' ||
        Array.isArray(PARSED[FIELD]) ||
        Object.keys(PARSED).some((key) => !['schema', 'productVersion', FIELD].includes(key))
    ) {
        throw Error(
            '이 저장은 현재 ' +
                COMPATIBILITY +
                ' 버전과 호환되지 않습니다. 원본을 내보내 보관한 뒤 새 정원을 시작해 주세요.',
        );
    }
    return PARSED;
}
export function decodeFarmSave(text) {
    const PARSED = readFarmSave(text);
    let progress = PARSED.progress;
    if (!progress) {
        // Only additive fields may be defaulted. An incomplete source must never
        // turn into a fresh Farm that can overwrite an existing save.
        if (
            !['seed', 'rng', 'units', 'food', 'time', 'nextId', 'scene', 'metrics'].every((key) =>
                Object.hasOwn(PARSED.world, key),
            )
        ) {
            throw Error('이전 저장의 필수 진행 데이터가 누락됐어요. 원본은 그대로 보존합니다.');
        }
        const WORLD = normalizeSnapshot(PARSED.world, {
            migrateLegacyRaid: true,
        });
        validateSnapshot(WORLD);
        progress = captureFarmProgress(WORLD);
    }
    migrateBaselineAbilityInvestments(progress.player);
    validateFarmProgress(progress);
    return progress;
}
export function saveNeedsMigration(text) {
    try {
        return !!readFarmSave(text).world;
    } catch {
        return false;
    }
}
export function saveHasLegacyFarmProgress(text) {
    try {
        const { world: WORLD } = readFarmSave(text);
        return !!WORLD && Object.hasOwn(WORLD, 'progress');
    } catch {
        return false;
    }
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
        throw Error('저장 파일이 너무 큽니다.');
    }
    return {
        data,
        text: TEXT,
    };
}
