// A local, synchronous occurrence signal. Keep this small contract compatible
// with future GameKit extraction; it is not a global event bus or replay queue.
export class Signal {
    constructor(scope = null, immediate = false) {
        this.listeners = new Set();
        this.scope = scope;
        this.immediate = immediate;
    }
    on(listener) {
        if (typeof listener !== 'function') {
            throw new TypeError('A signal listener must be a function.');
        }
        this.listeners.add(listener);
        return () => this.off(listener);
    }
    off(listener) {
        return this.listeners.delete(listener);
    }
    emit(event) {
        if (this.scope) {
            this.scope.publish(this, event, this.immediate);
        } else {
            this.raise(this.deliver(event));
        }
    }
    deliver(event) {
        // Changes to subscriptions apply to the next occurrence. A dying unit
        // can be removed during delivery without skipping remaining cleanup.
        const ERRORS = [];
        for (const LISTENER of [...this.listeners]) {
            try {
                LISTENER(event);
            } catch (error) {
                ERRORS.push(error);
            }
        }
        return ERRORS;
    }
    raise(errors) {
        if (errors.length) {
            throw errors.length === 1 ? errors[0] : new AggregateError(errors, 'Signal subscribers failed.');
        }
    }
    clear() {
        this.listeners.clear();
    }
}
