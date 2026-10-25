import { captureFarmProgress, restoreFarmProgress, sameFarmProgress } from './farm-progress.js';
import { decodeFarmSave, decodeFarmSaveRecord, encodeFarmSave, validateSave, parseSave } from './farm-save-codec.js';
export { validateSave, parseSave };
const KEY = 'bloom-weapon-cards-v4',
    SOURCE_BACKUP_KEY = `${KEY}:species-tree-source-v3`,
    PRIOR_SOURCE_BACKUP_KEY = `${KEY}:species-tree-prior-source-v3`,
    LAST_GOOD_KEY = `${KEY}:last-known-good`,
    IMPORT_SOURCE_KEY = `${KEY}:import-source`,
    UNREADABLE_SOURCE_KEY = `${KEY}:unreadable-source`,
    SAVE_FAILURE_LABELS = Object.freeze({
        'storage-read': '브라우저 저장소 읽기',
        'progress-capture': '농장 진행 데이터 수집',
        'progress-compare': '농장 진행 데이터 비교',
        'progress-validate-encode': '저장 데이터 검증·인코딩',
        'storage-write': '브라우저 저장소 쓰기',
        'storage-backup': '원본 저장 백업',
        'storage-verify': '저장 읽기 검증',
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
class FarmStorage {
    constructor() {
        this.raw = null;
        this._world = null;
        this.savedProgress = null;
        this.error = '';
        this.notice = '';
        this.writable = false;
        this.incompatible = false;
        try {
            this.raw = localStorage.getItem(KEY);
            if (this.raw) {
                try {
                    const RECORD = decodeFarmSaveRecord(this.raw);
                    this.savedProgress = RECORD.progress;
                    if (RECORD.migrated) {
                        const { text: TEXT } = encodeFarmSave(null, this.savedProgress);
                        this.writeVerified(TEXT, this.raw, { source: this.raw });
                        this.raw = TEXT;
                        this.notice =
                            '전체 성장과 최신 병종 트리를 적용했어요. 기존 병력·투자와 원본 저장은 보존했어요.';
                    }
                } catch (error) {
                    this.incompatible = true;
                    this.savedProgress = null;
                    this.error = error.message;
                }
            }
            this.writable = !this.incompatible;
        } catch (error) {
            this.error = error.message;
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
    // Unreadable data is never a fresh-farm request. In particular, a future schema or a failed
    // migration must not flow through the old prelaunch reset and erase the user's source save.
    initializeIncompatible(_world) {
        if (this.incompatible) {
            this.writable = false;
            this.notice = '저장 형식을 읽지 못해 원본을 보존했어요. 저장 내보내기로 보관해 주세요.';
        }
        return false;
    }
    writeVerified(text, original, { source = null, imported = null } = {}) {
        if (localStorage.getItem(KEY) !== original) {
            throw Error('저장 내용이 다른 탭에서 바뀌었어요. 새로고침한 뒤 다시 시도해 주세요.');
        }
        if (source !== null) {
            const PREVIOUS_SOURCE = localStorage.getItem(SOURCE_BACKUP_KEY);
            if (PREVIOUS_SOURCE !== source) {
                // Two bounded migration backups, separate from the rolling autosave backup.
                // A later legacy import must preserve its own source, not just the first migration.
                if (PREVIOUS_SOURCE !== null) {
                    localStorage.setItem(PRIOR_SOURCE_BACKUP_KEY, PREVIOUS_SOURCE);
                    if (localStorage.getItem(PRIOR_SOURCE_BACKUP_KEY) !== PREVIOUS_SOURCE) {
                        throw Error('이전 원본 백업을 확인하지 못했어요. 저장을 변경하지 않았어요.');
                    }
                }
                localStorage.setItem(SOURCE_BACKUP_KEY, source);
                if (localStorage.getItem(SOURCE_BACKUP_KEY) !== source) {
                    throw Error('원본 저장 백업을 확인하지 못했어요. 저장을 변경하지 않았어요.');
                }
            }
        }
        if (imported !== null) {
            localStorage.setItem(IMPORT_SOURCE_KEY, imported);
            if (localStorage.getItem(IMPORT_SOURCE_KEY) !== imported) {
                throw Error('가져올 원본 백업을 확인하지 못했어요. 저장을 변경하지 않았어요.');
            }
        }
        if (original !== null) {
            const BACKUP_KEY = this.incompatible ? UNREADABLE_SOURCE_KEY : LAST_GOOD_KEY;
            localStorage.setItem(BACKUP_KEY, original);
            if (localStorage.getItem(BACKUP_KEY) !== original) {
                throw Error('기존 저장 백업을 확인하지 못했어요. 저장을 변경하지 않았어요.');
            }
        }
        // Recheck after backup I/O, before the only primary-key write.
        if (localStorage.getItem(KEY) !== original) {
            throw Error('다른 탭에서 저장을 변경했어요. 원본을 덮어쓰지 않았어요.');
        }
        let written = false;
        try {
            localStorage.setItem(KEY, text);
            written = true;
            const VERIFIED = localStorage.getItem(KEY);
            if (VERIFIED !== text) {
                throw Error('저장 내용을 다시 읽어 확인하지 못했어요.');
            }
            decodeFarmSave(VERIFIED);
        } catch (error) {
            if (written) {
                // setItem is atomic. Restore the exact original bytes if verification failed;
                // a verified backup remains available even if the browser refuses this rollback.
                try {
                    const CURRENT = localStorage.getItem(KEY);
                    if (CURRENT === text) {
                        if (original === null) {
                            localStorage.removeItem(KEY);
                        } else {
                            localStorage.setItem(KEY, original);
                        }
                    }
                } catch (rollbackError) {
                    reportSaveFailure(rollbackError, 'storage-verify');
                }
            }
            this.writable = false;
            throw error;
        }
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
                throw Error('농장 저장을 찾지 못했어요. 다른 탭에서 새 농장을 시작했을 수 있어요.');
            }
            const { progress: DATA, migrated: MIGRATED } = decodeFarmSaveRecord(TEXT);
            let normalized = TEXT;
            if (MIGRATED) {
                normalized = encodeFarmSave(null, DATA).text;
                this.writeVerified(normalized, TEXT, { source: TEXT });
            }
            this.raw = normalized;
            this.savedProgress = DATA;
            this._world = null;
            this.incompatible = false;
            this.error = '';
            this.notice = '';
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
                this.notice = '';
                return true;
            }
            operation = 'progress-validate-encode';
            const { text: TEXT } = this.serializeCheckpoint(world, data);
            operation = 'storage-write';
            const IO_START = this.profiler?.start();
            try {
                this.writeVerified(TEXT, this.raw);
            } finally {
                this.profiler?.end('saveIO', IO_START);
            }
            this.raw = TEXT;
            this.savedProgress = data;
            this._world = world;
            this.incompatible = false;
            this.error = '';
            this.notice = '';
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
            this.writable = WRITABLE && this.writable;
        }
        return SAVED;
    }
    import(text) {
        if (localStorage.getItem(KEY) !== this.raw) {
            throw Error('저장 내용이 다른 탭에서 바뀌었어요. 새로고침한 뒤 다시 불러와 주세요.');
        }
        const { progress: PROGRESS, migrated: MIGRATED } = decodeFarmSaveRecord(text),
            WORLD = restoreFarmProgress(PROGRESS),
            { data: DATA, text: NORMALIZED } = this.serializeCheckpoint(WORLD);
        this.writeVerified(NORMALIZED, this.raw, {
            source: MIGRATED ? text : null,
            imported: text,
        });
        this.raw = NORMALIZED;
        this.savedProgress = DATA;
        this._world = WORLD;
        this.incompatible = false;
        this.writable = true;
        this.error = '';
        this.notice = '';
        return WORLD;
    }
}
export { FarmStorage };
