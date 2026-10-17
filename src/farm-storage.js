import { captureFarmProgress, restoreFarmProgress, sameFarmProgress } from './farm-progress.js';
import {
    readFarmSave,
    decodeFarmSave,
    encodeFarmSave,
    isReadableCompatibility,
    saveNeedsMigration,
    saveHasLegacyFarmProgress,
    validateSave,
    parseSave,
} from './farm-save-codec.js';
export { saveHasLegacyFarmProgress, validateSave, parseSave };
const KEY = 'bloom-weapon-cards-v4',
    LEGACY_KEY = 'bloom-weapon-cards-v3';
function migrationNotice(text) {
    return saveHasLegacyFarmProgress(text)
        ? '이전 무료 강화가 종료됐어요. 경험치·유닛 진행은 이어지고 원본은 별도 백업했어요.'
        : '진행도 중심 저장으로 바꿨어요. 경험치·유닛 수·성장·휴식은 이어지고, 위치와 전투 장면은 새로 만들어요. 이전 원본은 별도 백업했어요.';
}
const BACKUP_PREFIX = 'bloom-weapon-cards-legacy-backup-',
    BACKUP_LATEST = 'bloom-weapon-cards-legacy-backup-latest';
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
function preserveLegacySave(text) {
    if (!saveNeedsMigration(text)) {
        return null;
    }
    const DIGEST =
        Array.from(text).reduce((hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619), 2166136261) >>> 0;
    let key = BACKUP_PREFIX + DIGEST.toString(16).padStart(8, '0');
    let suffix = 0;
    while (localStorage.getItem(key) !== null && localStorage.getItem(key) !== text) {
        key = BACKUP_PREFIX + DIGEST.toString(16).padStart(8, '0') + '-' + ++suffix;
    }
    localStorage.setItem(key, text);
    try {
        localStorage.setItem(BACKUP_LATEST, key);
    } catch {
        /* The raw backup remains discoverable by prefix. */
    }
    return {
        key,
        raw: text,
    };
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
        this.legacyBackupRequired = false;
        this.legacyBackup = readLegacyBackup();
        this.migrationNotice = '';
        this.migrationPending = false;
        try {
            this.raw = localStorage.getItem(KEY);
            this.legacyRaw = localStorage.getItem(LEGACY_KEY);
            if (this.raw) {
                if (!isReadableCompatibility(readFarmSave(this.raw).productVersion)) {
                    throw Error('현재 저장은 호환되지 않는 버전입니다. 원본 키는 그대로 보존했어요.');
                }
                const DATA = decodeFarmSave(this.raw);
                this.migrationPending = saveNeedsMigration(this.raw);
                if (this.migrationPending) {
                    this.legacyBackupRequired = true;
                    try {
                        this.legacyBackup = preserveLegacySave(this.raw);
                        this.legacyBackupRequired = false;
                        this.migrationNotice = migrationNotice(this.raw);
                    } catch {
                        throw Error(
                            '이전 저장 원본을 백업하지 못해 덮어쓰지 않았어요. 저장 공간을 비우거나 저장 파일을 내보낸 뒤 다시 시도해 주세요.',
                        );
                    }
                }
                this.savedProgress = DATA;
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
            const DATA = decodeFarmSave(TEXT),
                MIGRATION_PENDING = saveNeedsMigration(TEXT);
            if (MIGRATION_PENDING) {
                this.legacyBackupRequired = true;
                this.legacyBackup = preserveLegacySave(TEXT);
                this.legacyBackupRequired = false;
                this.migrationNotice = migrationNotice(TEXT);
            }
            this.raw = TEXT;
            this.savedProgress = DATA;
            this.migrationPending = MIGRATION_PENDING;
            this._world = null;
            this.error = '';
            return true;
        } catch (e) {
            this.error = this.legacyBackupRequired
                ? '이전 저장 원본을 백업하지 못해 덮어쓰지 않았어요. 저장 공간을 비우거나 저장 파일을 내보낸 뒤 다시 시도해 주세요.'
                : e.message || '저장을 다시 읽지 못했어요.';
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
        if (!this.writable || this.legacyBackupRequired) {
            return false;
        }
        try {
            if (localStorage.getItem(KEY) !== this.raw) {
                this.error = '저장 내용이 다른 탭에서 바뀌었어요. 이 탭을 새로고침해 이어가 주세요.';
                return false;
            }
            const CAPTURE_START = this.profiler?.start();
            const DATA = captureFarmProgress(world);
            this.profiler?.end('saveCapture', CAPTURE_START);
            if (!this.migrationPending && sameFarmProgress(DATA, this.savedProgress)) {
                this._world = world;
                this.error = '';
                return true;
            }
            const { text: TEXT } = this.serializeCheckpoint(world, DATA);
            const IO_START = this.profiler?.start();
            localStorage.setItem(KEY, TEXT);
            this.profiler?.end('saveIO', IO_START);
            this.raw = TEXT;
            this.savedProgress = DATA;
            this.migrationPending = false;
            this._world = world;
            this.error = '';
            return true;
        } catch {
            this.error = '저장 공간을 사용할 수 없어요. 기존 저장은 보존했어요. 저장 내보내기로 보관해 주세요.';
            return false;
        }
    }
    replace(world) {
        if (this.legacyBackupRequired) {
            return false;
        }
        const WRITABLE = this.writable;
        this.writable = true;
        const SAVED = this.save(world);
        if (!SAVED) {
            this.writable = WRITABLE;
        }
        return SAVED;
    }
    import(text) {
        if (this.legacyBackupRequired) {
            throw Error('이전 저장 원본을 백업하지 못해 불러오기를 취소했어요. 기존 저장은 그대로입니다.');
        }
        if (localStorage.getItem(KEY) !== this.raw) {
            throw Error('저장 내용이 다른 탭에서 바뀌었어요. 새로고침한 뒤 다시 불러와 주세요.');
        }
        validateSave(text);
        if (saveNeedsMigration(text)) {
            this.legacyBackupRequired = true;
            try {
                this.legacyBackup = preserveLegacySave(text);
                this.legacyBackupRequired = false;
            } catch {
                throw Error('이전 저장 원본을 백업하지 못해 불러오기를 취소했어요. 기존 저장은 그대로입니다.');
            }
            this.migrationNotice = migrationNotice(text);
        }
        const WORLD = parseSave(text),
            { data: DATA, text: NORMALIZED } = this.serializeCheckpoint(WORLD);
        localStorage.setItem(KEY, NORMALIZED);
        this.raw = NORMALIZED;
        this.savedProgress = DATA;
        this.migrationPending = false;
        this._world = WORLD;
        this.writable = true;
        this.error = '';
        return WORLD;
    }
}
export { FarmStorage };
