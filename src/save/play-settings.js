import { isWorkBasisPoints, isBreedWeights, isDeployOrder } from '../model/play-choices.js';
import { reportSaveFailure, saveFailureMessage } from './farm-storage.js';

// The player's play settings, kept apart from the farm save: they change often (the last-seen time every few
// seconds) and the farm export does not carry them. null means "not chosen yet": the garden keeps its own value.
//   workBasisPoints  the farm's food share (0..10000)
//   breedWeights     breeding weight per species, null for an even split
//   deployOrder      tower deploy order, every species once
//   lastSeenMs       Date.now() of the last time the farm was on screen, 0 before the first visit (no idle progress)
//   foodMuted        sound effects off
export const PLAY_SETTINGS_SAVE = Object.freeze({
    key: 'budmori-play',
    version: 1,
    create: () => ({ workBasisPoints: null, breedWeights: null, deployOrder: null, lastSeenMs: 0, foodMuted: false }),
    validate: validatePlaySettings,
});
const FIELDS = Object.keys(PLAY_SETTINGS_SAVE.create()).sort().join();
export function validatePlaySettings(data) {
    if (
        !data ||
        typeof data !== 'object' ||
        Object.keys(data).sort().join() !== FIELDS ||
        !(data.workBasisPoints === null || isWorkBasisPoints(data.workBasisPoints)) ||
        !isBreedWeights(data.breedWeights) ||
        !(data.deployOrder === null || isDeployOrder(data.deployOrder)) ||
        !(Number.isSafeInteger(data.lastSeenMs) && data.lastSeenMs >= 0) ||
        typeof data.foodMuted !== 'boolean'
    ) {
        throw new TypeError('플레이 설정 저장 형식이 아니에요.');
    }
}
class PlaySettings {
    static async open(openSave) {
        const SETTINGS = new PlaySettings(openSave(PLAY_SETTINGS_SAVE));
        try {
            await SETTINGS.record.load();
        } catch (error) {
            SETTINGS.fail(error, 'play-load');
        }
        return SETTINGS;
    }
    constructor(record) {
        this.record = record;
        this.error = '';
        record.onExternalChange(() => {
            this.error = saveFailureMessage({ name: 'SaveError', kind: 'conflict' });
            this.onError?.(this.error);
        });
    }
    fail(error, operation) {
        reportSaveFailure(error, operation);
        this.error = saveFailureMessage(error);
        this.onError?.(this.error);
    }
    get locked() {
        return this.record.locked;
    }
    // The saved settings, or null while the record is unreadable.
    get value() {
        return this.record.data;
    }
    // Resolves false after showing why the change was not kept.
    async set(changes) {
        try {
            await this.record.update((draft) => {
                Object.assign(draft, changes);
            });
            return true;
        } catch (error) {
            this.fail(error, 'play-write');
            return false;
        }
    }
}
export { PlaySettings };
