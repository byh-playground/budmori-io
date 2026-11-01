const FARM_AUTOSAVE_DEBOUNCE_MS = 1000;
const FARM_AUTOSAVE_MAX_WAIT_MS = 10000;

// Farm-specific trailing debounce with a bounded checkpoint interval. It only
// writes when a progress event (not a movement/display tick) marks the Farm.
class FarmAutosave {
    constructor(
        save,
        {
            debounceMs = FARM_AUTOSAVE_DEBOUNCE_MS,
            maxWaitMs = FARM_AUTOSAVE_MAX_WAIT_MS,
            now = () => globalThis.performance.now(),
            setTimer = (fn, delay) => globalThis.setTimeout(fn, delay),
            clearTimer = (id) => globalThis.clearTimeout(id),
        } = {},
    ) {
        this.save = save;
        this.debounceMs = debounceMs;
        this.maxWaitMs = maxWaitMs;
        this.now = now;
        this.setTimer = setTimer;
        this.clearTimer = clearTimer;
        this.timer = null;
        this.pending = null;
        this.dirty = false;
        this.dirtySince = 0;
        this.deadline = 0;
        this.timerDeadline = 0;
        this.onTimer = () => {
            this.timer = null;
            const REMAINING = this.deadline - this.now();
            if (REMAINING > 0) {
                this.schedule(REMAINING);
            } else {
                this.flush();
            }
        };
    }
    markDirty() {
        const NOW = this.now();
        if (!this.dirty) {
            this.dirty = true;
            this.dirtySince = NOW;
        }
        const REMAINING = Math.max(0, this.maxWaitMs - (NOW - this.dirtySince));
        this.deadline = NOW + Math.min(this.debounceMs, REMAINING);
        // Keep the existing wake-up while changes extend the trailing deadline.
        // It checks the latest deadline instead of replacing a timer every sim tick.
        if (this.timer === null || this.deadline < this.timerDeadline) {
            this.cancelTimer();
            this.schedule(Math.max(0, this.deadline - NOW));
        }
    }
    // save() captures at once and resolves whether it was kept; a refused save stays dirty for the next change.
    async flush() {
        this.cancelTimer();
        if (this.pending) {
            const SAVED = await this.pending;
            return SAVED ? this.flush() : false;
        }
        if (!this.dirty) {
            return true;
        }
        this.reset();
        const SAVING = Promise.resolve(this.save());
        this.pending = SAVING;
        try {
            const SAVED = await SAVING;
            if (!SAVED && !this.dirty) {
                this.dirty = true;
                this.dirtySince = this.now();
            }
            return SAVED;
        } finally {
            this.pending = null;
        }
    }
    schedule(delay) {
        this.timerDeadline = this.now() + delay;
        this.timer = this.setTimer(this.onTimer, delay);
    }
    reset() {
        this.cancelTimer();
        this.dirty = false;
        this.dirtySince = 0;
        this.deadline = 0;
        this.timerDeadline = 0;
    }
    cancelTimer() {
        if (this.timer !== null) {
            this.clearTimer(this.timer);
            this.timer = null;
        }
    }
}
export { FarmAutosave };
