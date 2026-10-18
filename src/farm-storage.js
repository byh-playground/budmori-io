import { captureFarmProgress, restoreFarmProgress, sameFarmProgress } from './farm-progress.js';
import {
    readFarmSave,
    decodeFarmSave,
    encodeFarmSave,
    isReadableCompatibility,
    validateSave,
    parseSave,
} from './farm-save-codec.js';
export { validateSave, parseSave };
const KEY = 'bloom-weapon-cards-v4',
    LEGACY_KEY = 'bloom-weapon-cards-v3';
const BACKUP_PREFIX = 'bloom-weapon-cards-legacy-backup-',
    BACKUP_LATEST = 'bloom-weapon-cards-legacy-backup-latest',
    SAVE_FAILURE_LABELS = Object.freeze({
        'storage-read': '브라우저 저장소 읽기',
        'progress-capture': '농장 진행 데이터 수집',
        'progress-compare': '농장 진행 데이터 비교',
        'progress-validate-encode': '저장 데이터 검증·인코딩',
        'storage-write': '브라우저 저장소 쓰기',
    });
function reportSaveFailure(error, operation) {
    try {
        globalThis.BloomDiagnostics?.report?.(error, 'farm-save-failure', {
            origin: 'farm-storage',
            source: 'farm-storage.js',
            operation,
        });
    } catch (diagnosticError) {
        console.error('Unable to record Farm save failure diagnostics', diagnosticError);
    }
}
function saveFailureMessage(error, operation) {
    if (operation === 'storage-write' && error?.name === 'QuotaExceededError') {
        return '브라우저 저장 공간이 부족해 저장하지 못했어요. 기존 저장은 보존했어요. 저장 내보내기로 보관해 주세요.';
    }
    const LABEL = SAVE_FAILURE_LABELS[operation] || '저장 처리';
    return `${LABEL} 단계에서 오류가 발생했어요. 기존 저장은 보존했어요. 저장 내보내기로 보관한 뒤 진단 정보를 복사해 주세요.`;
}
function readLegacyBackup() {
    try {
        const PREFERRED = localStorage.getItem(BACKUP_LATEST);
        if (PREFERRED?.startsWith(BACKUP_PREFIX)) {
            const RAW = localStorage.getItem(PREFERRED);
            if (RAW) {
                return {
                    key: PREFERRED,
                    raw: RAW,
                };
            }
        }
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const KEY_LOCAL = localStorage.key(i);
            if (KEY_LOCAL?.startsWith(BACKUP_PREFIX)) {
                const RAW = localStorage.getItem(KEY_LOCAL);
                if (RAW) {
                    return {
                        key: KEY_LOCAL,
                        raw: RAW,
                    };
                }
            }
        }
    } catch {
        // Backup discovery is optional when browser storage is unavailable; the caller keeps recovery blocked.
    }
    return null;
}
class FarmStorage {
    constructor() {
        this.raw = null;
        this._world = null;
        this.savedProgress = null;
        this.error = '';
        this.writable = false;
        this.legacyRaw = null;
        this.legacyCompatible = false;
        this.legacyBackup = readLegacyBackup();
        try {
            this.raw = localStorage.getItem(KEY);
            this.legacyRaw = localStorage.getItem(LEGACY_KEY);
            if (this.raw) {
                if (!isReadableCompatibility(readFarmSave(this.raw).productVersion)) {
                    throw Error('현재 저장은 호환되지 않는 버전입니다. 원본 키는 그대로 보존했어요.');
                }
                this.savedProgress = decodeFarmSave(this.raw);
            } else if (this.legacyRaw) {
                try {
                    validateSave(this.legacyRaw);
                    this.legacyCompatible = true;
                } catch (e) {
                    this.error = e.message;
                }
            }
            this.writable = true;
        } catch (e) {
            this.error = e.message;
        }
    }
    get world() {
        if (!this._world && this.savedProgress) {
            this._world = restoreFarmProgress(this.savedProgress);
        }
        return this._world;
    }
    get hasWorld() {
        return !!(this._world || this.savedProgress);
    }
    get hasReservedRaid() {
        const RUN = this._world?.activeRaidRunSequence ?? this.savedProgress?.ledger.raid.activeRun?.sequence;
        return RUN !== null && RUN !== undefined;
    }
    set world(value) {
        this._world = value;
        this.savedProgress = null;
    }
    serializeCheckpoint(world, data) {
        const START = this.profiler?.start();
        try {
            return encodeFarmSave(world, data);
        } finally {
            this.profiler?.end('saveEncode', START);
        }
    }
    encode(world) {
        return this.serializeCheckpoint(world).text;
    }
    refresh() {
        if (!this.writable) {
            return false;
        }
        try {
            const TEXT = localStorage.getItem(KEY);
            if (TEXT === this.raw) {
                return true;
            }
            if (!TEXT) {
                throw Error('농장 저장을 찾지 못했어요. 다른 탭에서 새 정원을 시작했을 수 있어요.');
            }
            const DATA = decodeFarmSave(TEXT);
            this.raw = TEXT;
            this.savedProgress = DATA;
            this._world = null;
            this.error = '';
            return true;
        } catch (e) {
            this.error = e.message || '저장을 다시 읽지 못했어요.';
            return false;
        }
    }
    save(world) {
        const START = this.profiler?.start();
        this.profiler?.count('saveCalls');
        try {
            return this.saveCheckpoint(world);
        } finally {
            this.profiler?.end('save', START);
        }
    }
    saveCheckpoint(world) {
        if (!this.writable) {
            return false;
        }
        let operation = 'storage-read';
        try {
            if (localStorage.getItem(KEY) !== this.raw) {
                this.error = '저장 내용이 다른 탭에서 바뀌었어요. 이 탭을 새로고침해 이어가 주세요.';
                return false;
            }
            operation = 'progress-capture';
            const CAPTURE_START = this.profiler?.start();
            let data;
            try {
                data = captureFarmProgress(world);
            } finally {
                this.profiler?.end('saveCapture', CAPTURE_START);
            }
            operation = 'progress-compare';
            if (sameFarmProgress(data, this.savedProgress)) {
                this._world = world;
                this.error = '';
                return true;
            }
            operation = 'progress-validate-encode';
            const { text: TEXT } = this.serializeCheckpoint(world, data);
            operation = 'storage-write';
            const IO_START = this.profiler?.start();
            try {
                localStorage.setItem(KEY, TEXT);
            } finally {
                this.profiler?.end('saveIO', IO_START);
            }
            this.raw = TEXT;
            this.savedProgress = data;
            this._world = world;
            this.error = '';
            return true;
        } catch (error) {
            reportSaveFailure(error, operation);
            this.error = saveFailureMessage(error, operation);
            return false;
        }
    }
    replace(world) {
        const WRITABLE = this.writable;
        this.writable = true;
        const SAVED = this.save(world);
        if (!SAVED) {
            this.writable = WRITABLE;
        }
        return SAVED;
    }
    import(text) {
        if (localStorage.getItem(KEY) !== this.raw) {
            throw Error('저장 내용이 다른 탭에서 바뀌었어요. 새로고침한 뒤 다시 불러와 주세요.');
        }
        validateSave(text);
        const WORLD = parseSave(text),
            { data: DATA, text: NORMALIZED } = this.serializeCheckpoint(WORLD);
        localStorage.setItem(KEY, NORMALIZED);
        this.raw = NORMALIZED;
        this.savedProgress = DATA;
        this._world = WORLD;
        this.writable = true;
        this.error = '';
        return WORLD;
    }
}
export { FarmStorage };
