import { BREED_RESERVATION_OWNER } from './farm-config.js';

const { StateMachine: STATE_MACHINE } = globalThis.BloomGamekitBehavior;

// One pair's life. Two adults are matched (reserved), then either the child comes (born) or the plan falls through
// (released). Both ends drop the pair from every index in one place, so no half-pair is left behind.
const PAIR_LIFE = new STATE_MACHINE({
    field: 'state',
    initial: 'reserved',
    states: {
        reserved: { to: ['born', 'released'] },
        born: { enter: (pair, pairs) => pairs.drop(pair) },
        released: { enter: (pair, pairs) => pairs.drop(pair) },
    },
});

// The one owner of "who is matched with whom" on the farm. A pair is only a plan, so it is never saved: after a
// load nobody is matched and the units look for mates again.
// Everything that holds a pair for the world lives here: the pair, the unit index and the reservation that keeps the
// two units from being merged away; `reserve` and the end of the pair's life change all three together.
export class BreedPairs {
    constructor(world) {
        this.world = world;
        this.byOwner = new Map();
        this.byUnit = new Map();
    }
    // Pairs that hold a slot for their coming child (the farm counts them against its room).
    get count() {
        return this.byOwner.size;
    }
    has(owner) {
        return this.byOwner.has(owner);
    }
    ownerOf(unit) {
        return this.byUnit.get(unit.id) ?? null;
    }
    // The id of the unit this one is matched with, 0 when it is not.
    mateIdOf(unit) {
        const OWNER = this.byUnit.get(unit.id);
        if (!OWNER) {
            return 0;
        }
        const PAIR = this.byOwner.get(OWNER);
        return PAIR.a === unit.id ? PAIR.b : PAIR.a;
    }
    // The caller has checked the two may be matched. False when the collection cannot reserve them.
    reserve(a, b) {
        const OWNER = BREED_RESERVATION_OWNER(a.id, b.id);
        if (this.byOwner.has(OWNER)) {
            return true;
        }
        if (!this.world.unitCollection.reserve(OWNER, [a, b])) {
            return false;
        }
        this.byOwner.set(OWNER, { owner: OWNER, a: a.id, b: b.id, state: PAIR_LIFE.initial });
        this.byUnit.set(a.id, OWNER);
        this.byUnit.set(b.id, OWNER);
        return true;
    }
    // The plan fell through. False when there was no pair under `owner`.
    release(owner) {
        const PAIR = this.byOwner.get(owner);
        if (!PAIR) {
            return false;
        }
        PAIR_LIFE.transition(PAIR, 'released', this);
        return true;
    }
    releaseUnit(unit) {
        const OWNER = this.byUnit.get(unit.id);
        return OWNER ? this.release(OWNER) : false;
    }
    // The child came.
    complete(unit) {
        const OWNER = this.byUnit.get(unit.id),
            PAIR = OWNER ? this.byOwner.get(OWNER) : null;
        if (!PAIR) {
            return false;
        }
        PAIR_LIFE.transition(PAIR, 'born', this);
        return true;
    }
    // Every plan is cancelled (a new farm, a reset).
    clear() {
        for (const OWNER of [...this.byOwner.keys()]) {
            this.release(OWNER);
        }
    }
    // The pair's end: leave the indexes and give the collection its two units back.
    drop(pair) {
        this.byOwner.delete(pair.owner);
        this.byUnit.delete(pair.a);
        this.byUnit.delete(pair.b);
        this.world.unitCollection.releaseReservations(pair.owner);
    }
}
