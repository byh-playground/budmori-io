import { captureFarmProgress, restoreFarmProgress, sameFarmProgress } from '../model/farm-progress.js';
import { FARM_SAVE, farmExportText, readFarmExport } from './farm-save-codec.js';

// What the player reads when the save module refuses. A game rule error (invalid progress) is a bug: it keeps the
// existing save and asks for diagnostics.
export function saveFailureMessage(error) {
    switch (error?.name === 'SaveError' ? error.kind : '') {
        case 'unreadable':
            return '저장을 읽지 못해 원본을 그대로 두었어요. 이 브라우저의 저장은 덮어쓰지 않아요.';
        case 'conflict':
            return '다른 탭에서 저장이 바뀌었어요. 이 탭을 새로고침해 이어가 주세요.';
        case 'storage':
            return error.cause?.name === 'QuotaExceededError'
                ? '브라우저 저장 공간이 부족해 저장하지 못했어요. 기존 저장은 그대로예요. 저장 내보내기로 보관해 주세요.'
                : '브라우저 저장소를 쓰지 못했어요. 기존 저장은 그대로예요. 진단 정보를 복사해 알려 주세요.';
        case 'closed':
            return '저장이 닫혔어요. 새로고침해 주세요.';
        default:
            return '저장 데이터를 확인하지 못해 저장하지 않았어요. 기존 저장은 그대로예요. 진단 정보를 복사해 알려 주세요.';
    }
}
export function reportSaveFailure(error, operation) {
    globalThis.BloomDiagnostics.report(error, 'farm-save-failure', {
        origin: 'farm-storage',
        source: 'farm-storage.js',
        operation,
    });
}
// The player's farm in the save module. `error` is the last refusal, shown on the start screen; nothing here
// falls back to an empty farm or retries quietly.
class FarmStorage {
    // openSave(options) creates the save on the adapter the page chose (the browser, or memory for isolated scenes).
    static async open(openSave) {
        const STORAGE = new FarmStorage(openSave(FARM_SAVE));
        await STORAGE.load();
        return STORAGE;
    }
    constructor(record) {
        this.record = record;
        this.savedProgress = null;
        this._world = null;
        this.error = '';
        this.profiler = null;
        record.onExternalChange(() => {
            this.error = saveFailureMessage({ name: 'SaveError', kind: 'conflict' });
            this.onError?.(this.error);
        });
    }
    async load() {
        try {
            this.savedProgress = (await this.record.load()).farm;
            this.error = '';
        } catch (error) {
            this.fail(error, 'load');
        }
    }
    fail(error, operation) {
        reportSaveFailure(error, operation);
        this.error = saveFailureMessage(error);
        this.onError?.(this.error);
    }
    // Discards the stored farm, readable or not, for an empty record. Only after the player confirmed.
    // Throws with the reason; a refused reset leaves the record locked as it was.
    async reset() {
        try {
            this.savedProgress = (await this.record.reset()).farm;
        } catch (error) {
            this.fail(error, 'reset');
            throw new Error(this.error, { cause: error });
        }
        this._world = null;
        this.error = '';
    }
    // An unreadable save stays untouched: no new farm, import or autosave may replace it.
    get locked() {
        return this.record.locked;
    }
    get hasWorld() {
        return !!(this._world || this.savedProgress);
    }
    get world() {
        if (!this._world && this.savedProgress) {
            this._world = restoreFarmProgress(this.savedProgress);
        }
        return this._world;
    }
    set world(value) {
        this._world = value;
        this.savedProgress = null;
    }
    // Captures now and writes in order behind any earlier save. Resolves false after showing why it did not save.
    async save(world) {
        const START = this.profiler?.start();
        this.profiler?.count('saveCalls');
        let data;
        try {
            const CAPTURE_START = this.profiler?.start();
            try {
                data = captureFarmProgress(world);
            } finally {
                this.profiler?.end('saveCapture', CAPTURE_START);
            }
            if (sameFarmProgress(data, this.savedProgress)) {
                this._world = world;
                return true;
            }
        } catch (error) {
            this.fail(error, 'progress-capture');
            return false;
        } finally {
            this.profiler?.end('save', START);
        }
        try {
            const SAVED = await this.record.update((draft) => {
                draft.farm = data;
            });
            this.savedProgress = SAVED.farm;
            this._world = world;
            this.error = '';
            return true;
        } catch (error) {
            this.fail(error, 'storage-write');
            return false;
        }
    }
    // Replaces the whole farm with an export file. Throws with the reason; the current save stays as it was.
    async import(text) {
        const DATA = readFarmExport(text),
            WORLD = restoreFarmProgress(DATA.farm);
        try {
            this.savedProgress = (await this.record.update((draft) => Object.assign(draft, DATA))).farm;
        } catch (error) {
            this.fail(error, 'import');
            throw new Error(this.error, { cause: error });
        }
        this._world = WORLD;
        this.error = '';
        return WORLD;
    }
    exportText() {
        return this.record.data?.farm ? farmExportText(this.record.data) : null;
    }
}
export { FarmStorage };
