import { CopyDissolvePresentation } from '../features/formation-skills/copy/presentation.js';

// One death for every combatant in a fight (#SSOT): troop, boss-summoned minion, boss alike.
//
//   t = 0 .. hold            the body's own death clip with the dead face, then it lies dead; the killing blow's
//                            push carries on (the body keeps its knockback, ghosts drift and slow down the same way)
//   t = hold .. hold + fade  sink and fade: alpha 1 → 0, body squashes toward SINK_SCALE_Y (hold = max(clip, 5 s))
//   after                    not drawn (body, shadow, rings, markers)
//   t = 0 .. PUFF_SECONDS    a small neutral dissolve puff, the formation copy's dissolve in grey
//
// The clock is presentation state keyed by id:generation: the first frame a view is dead (or, for a body the model
// removes on death, missing). Outside a fight (farm idle) no death is sampled and the downed look stays.
export const DEATH_TIMING = Object.freeze({
    holdSeconds: 5,
    ghostDragRate: 4,
    unitFadeSeconds: 0.5,
    bossFadeSeconds: 0.9,
    sinkScaleY: 0.6,
    puffSeconds: 0.6,
});
const PUFF = new CopyDissolvePresentation({ streak: '214,208,196', glint: '255,252,244', spreadPerRadius: 0.8 });

export function fightActive(world) {
    return (world.farmBossEvent?.phase ?? 'idle') !== 'idle' || !!world.tower?.active;
}
function isDead(view) {
    return view.hp <= 0 || view.down > 0;
}
// The model removes these on death (farm-unit-life.js); the renderer keeps their last view for the death.
// A formation copy has its own dissolve (formation-copy-death) instead.
function removedOnDeath(view) {
    return view.isBattleOnlySummon && !view.isFormationClone;
}
// GameKit reuses its interpolated models, so a ghost keeps a copy of the last one.
function copyView(view, target) {
    Object.assign(target, view);
    target.ability = { ...view.ability };
    return target;
}

export class DeathPresentation {
    constructor() {
        this.states = new Map();
        this.ghosts = [];
        this.frame = 0;
    }
    // Once per frame, before anything is drawn. Returns the ghosts to draw beside the world's units.
    observe(world) {
        if (!fightActive(world)) {
            this.clear();
            return this.ghosts;
        }
        this.frame++;
        const NOW = world.time,
            FIGHTING = world.farmBossEvent?.phase === 'fighting';
        for (const UNIT of world.units) {
            this.track(UNIT, NOW);
        }
        for (const BOSS of world.bosses) {
            this.track(BOSS, NOW);
        }
        const GHOSTS = this.ghosts;
        GHOSTS.length = 0;
        for (const [KEY, STATE] of this.states) {
            if (STATE.seenFrame === this.frame) {
                continue;
            }
            if (!STATE.ghost && STATE.last && FIGHTING) {
                STATE.ghost = Object.assign(STATE.last, { hp: 0, down: 0 });
                if (Number.isNaN(STATE.diedAt)) {
                    STATE.diedAt = NOW;
                }
            }
            if (!STATE.ghost || STATE.done) {
                this.states.delete(KEY);
                continue;
            }
            this.drift(STATE, NOW);
            GHOSTS.push(STATE.ghost);
        }
        return GHOSTS;
    }
    // A ghost (its body already removed by the model) keeps sliding from the killing blow and slows to a stop.
    drift(state, now) {
        const GHOST = state.ghost,
            DT = Math.max(0, now - (state.driftAt ?? now)),
            KEEP = Math.exp(-DEATH_TIMING.ghostDragRate * DT);
        state.driftAt = now;
        GHOST.x += ((GHOST.vx || 0) * (1 - KEEP)) / DEATH_TIMING.ghostDragRate;
        GHOST.y += ((GHOST.vy || 0) * (1 - KEEP)) / DEATH_TIMING.ghostDragRate;
        GHOST.vx = (GHOST.vx || 0) * KEEP;
        GHOST.vy = (GHOST.vy || 0) * KEEP;
    }
    // Keyed by id, valid for one generation (a reused id is a new body).
    track(view, now) {
        let state = this.states.get(view.id);
        if (!state || state.generation !== view.generation) {
            // A body first seen already dead (a load, a reserve, a new floor) died before this view: it is long gone.
            state = {
                generation: view.generation,
                seenFrame: 0,
                diedAt: isDead(view) ? -Infinity : NaN,
                last: null,
                ghost: null,
                done: false,
            };
            this.states.set(view.id, state);
        }
        state.seenFrame = this.frame;
        if (!isDead(view)) {
            state.diedAt = NaN;
            state.done = false;
            if (removedOnDeath(view)) {
                state.last = copyView(view, state.last || {});
            }
            return;
        }
        if (Number.isNaN(state.diedAt)) {
            state.diedAt = now;
        }
    }
    // null while alive or outside a fight; otherwise where the body is in its death.
    sample(view, world, clipMs, fadeSeconds) {
        if (!fightActive(world)) {
            return null;
        }
        const STATE = this.states.get(view.id);
        if (!STATE || STATE.generation !== view.generation || Number.isNaN(STATE.diedAt)) {
            return null;
        }
        const AGE = Math.max(0, world.time - STATE.diedAt),
            HOLD = Math.max(clipMs / 1000, DEATH_TIMING.holdSeconds),
            FADE = Math.min(1, Math.max(0, (AGE - HOLD) / fadeSeconds)),
            SINK = FADE * (2 - FADE);
        STATE.done = FADE >= 1;
        return {
            clipMs: Math.min(clipMs, AGE * 1000),
            alpha: 1 - FADE,
            scaleY: 1 - (1 - DEATH_TIMING.sinkScaleY) * SINK,
            puff: AGE < DEATH_TIMING.puffSeconds ? AGE : null,
            done: STATE.done,
        };
    }
    drawPuff(renderer, view, death) {
        if (death.puff === null) {
            return;
        }
        PUFF.draw(renderer, view, death.puff);
    }
    clear() {
        this.states.clear();
        this.ghosts.length = 0;
    }
}
