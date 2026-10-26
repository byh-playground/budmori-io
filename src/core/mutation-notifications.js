// Per-Garden command commit boundary. This only delays occurrence delivery;
// it does not route commands, schedule frames, or retain a replay journal.
export class MutationNotifications {
    constructor() {
        this.depth = 0;
        this.flushing = false;
        this.pending = [];
        this.errors = [];
    }
    begin() {
        this.depth++;
    }
    end(failure = null) {
        this.depth--;
        if (failure && (this.depth > 0 || this.flushing)) {
            throw failure;
        }
        if (failure) {
            this.errors.push(failure);
        }
        if (this.depth === 0 && !this.flushing) {
            this.flush();
        }
    }
    run(action, owner = null, a, b, c, d, e) {
        this.begin();
        let result;
        let failure = null;
        try {
            result = action.call(owner, a, b, c, d, e);
        } catch (error) {
            failure = error;
        }
        this.end(failure);
        return result;
    }
    publish(signal, event, immediate) {
        if (!immediate) {
            this.pending.push({ signal, event });
            if (this.depth === 0 && !this.flushing) {
                this.flush();
            }
            return;
        }
        const ERRORS = signal.deliver(event);
        if (this.depth > 0 || this.flushing) {
            this.errors.push(...ERRORS);
        } else {
            signal.raise(ERRORS);
        }
    }
    flush() {
        if (!this.pending.length && !this.errors.length) {
            return;
        }
        this.flushing = true;
        try {
            // Reentrant commands append to the same FIFO; they cannot flush a
            // second queue in the middle of the current committed occurrence.
            for (let index = 0; index < this.pending.length; index++) {
                const { signal: SIGNAL, event: EVENT } = this.pending[index];
                this.errors.push(...SIGNAL.deliver(EVENT));
            }
        } finally {
            this.pending.length = 0;
            this.flushing = false;
        }
        if (this.errors.length) {
            const ERRORS = this.errors;
            this.errors = [];
            throw ERRORS.length === 1 ? ERRORS[0] : new AggregateError(ERRORS, 'Mutation observers failed.');
        }
    }
}
