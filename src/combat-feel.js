import { presentationEventTimeMs } from './farm-model.js';
const { ObjectPool: OBJECT_POOL } = globalThis.BloomGamekitObjectPool;
// Only these primitive unit-land notice copies are owned by the display queue.
// Garden notices, interpolation history and the longer-lived bossHit alias are not pooled.
const CREATE_LANDING_EFFECT = () => ({
    sequence: 0,
    kind: 'unit-land',
    time: 0,
    unit: null,
    x: 0,
    y: 0,
    z: 0,
    strength: 0,
    at: 0,
    heard: false,
});
function resetLandingEffect(e) {
    e.sequence = e.time = e.x = e.y = e.z = e.strength = e.at = 0;
    e.unit = null;
    e.heard = false;
}

// Presentation reads committed combat notices. It never pauses or writes simulation state.
class CombatFeel {
    constructor(audio) {
        this.audio = audio;
        this.world = null;
        this.revision = null;
        this.sequence = 0;
        this.effects = [];
        this.landingPool = new OBJECT_POOL(CREATE_LANDING_EFFECT, resetLandingEffect, 48);
        this.poses = new Map();
        this.bossHit = null;
        this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.counts = {
            hits: 0,
            landings: 0,
        };
    }
    acquireLandingEffect(e, at) {
        const EVENT = this.landingPool.acquire();
        EVENT.sequence = e.sequence;
        EVENT.time = e.time;
        EVENT.unit = e.unit;
        EVENT.x = e.x;
        EVENT.y = e.y;
        EVENT.z = e.z;
        EVENT.strength = e.strength;
        EVENT.at = at;
        EVENT.heard = false;
        return EVENT;
    }
    releaseEffect(event) {
        if (event.kind === 'unit-land') {
            this.landingPool.release(event);
        }
    }
    observe(world, displayTimeMs, revision = 0) {
        if (this.world !== world || this.revision !== revision) {
            this.world = world;
            this.revision = revision;
            this.sequence = world.eventSequence;
            for (const E of this.effects) {
                this.releaseEffect(E);
            }
            this.effects.length = 0;
            this.poses.clear();
            this.bossHit = null;
            return;
        }
        for (const E of world.notices) {
            if (E.sequence <= this.sequence) {
                continue;
            }
            if (['boss-hit', 'unit-hit', 'unit-land', 'attack-launch', 'boss-launch'].includes(E.kind)) {
                const AT = presentationEventTimeMs(E),
                    EVENT =
                        E.kind === 'unit-land'
                            ? this.acquireLandingEffect(E, AT)
                            : {
                                  ...E,
                                  at: AT,
                                  heard: false,
                              };
                this.effects.push(EVENT);
                if (this.effects.length > 48) {
                    this.releaseEffect(this.effects.shift());
                }
                if (E.kind === 'boss-hit') {
                    this.counts.hits++;
                    this.bossHit = EVENT;
                }
                if (E.kind === 'unit-hit') {
                    this.poses.set(E.unit, {
                        at: AT,
                        until: AT + 180,
                        strength: E.strength,
                    });
                    this.counts.hits++;
                }
                if (E.kind === 'unit-land') {
                    this.counts.landings++;
                }
            }
        }
        this.sequence = world.eventSequence;
        // Finish compaction before the next acquire; no released queue slot is read again.
        let retained = 0;
        for (const E of this.effects) {
            if (displayTimeMs - E.at < 430) {
                this.effects[retained++] = E;
            } else {
                this.releaseEffect(E);
            }
        }
        this.effects.length = retained;
        for (const [ID, P] of this.poses) {
            if (displayTimeMs > P.until) {
                this.poses.delete(ID);
            }
        }
    }
    squash(id, displayTimeMs) {
        const P = this.poses.get(id);
        return !P || this.reduced
            ? 0
            : Math.sin(Math.min(1, (displayTimeMs - P.at) / 180) * Math.PI) * Math.min(0.2, P.strength * 0.12);
    }
    boss(displayTimeMs) {
        const E = this.bossHit;
        if (!E || this.reduced) {
            return {
                x: 0,
                y: 0,
                squash: 0,
            };
        }
        const Q = Math.max(0, Math.min(1, (displayTimeMs - E.at) / 160)),
            K = Math.sin(Q * Math.PI) * (1 - Q);
        return {
            x: -E.nx * K * 0.1,
            y: -E.ny * K * 0.1,
            squash: K * 0.035,
        };
    }
    sound(event) {
        if (event.kind === 'boss-hit') {
            this.audio.sound('strike', event.species || 0);
        } else if (event.kind === 'unit-hit') {
            this.audio.sound(event.attackKind === 'sweep' ? 'heavy' : 'strike');
        } else if (event.kind === 'unit-land' && event.strength > 0.2) {
            this.audio.sound('land');
        } else if (event.kind === 'boss-launch') {
            this.audio.sound('launch');
        }
    }
    draw(r, displayTimeMs) {
        for (const E of this.effects) {
            const AGE = displayTimeMs - E.at;
            if (AGE < 0 || AGE > 430) {
                continue;
            }
            if (!E.heard) {
                E.heard = true;
                this.sound(E);
            }
            const Q = AGE / 430,
                HEAVY = E.attackKind === 'sweep',
                IMPACT = E.kind === 'unit-hit' || E.kind === 'boss-hit',
                LANDING = E.kind === 'unit-land';
            if (E.kind === 'attack-launch') {
                const T = Math.min(1, Q / 0.35),
                    P = r.project(E.x, E.y, E.z + 0.2);
                if (T < 1) {
                    r.ellipse(P.x, P.y, r.scale * 0.12 * (1 - T), r.scale * 0.2 * (1 - T), '#ffe7a6');
                }
                continue;
            }
            if (!IMPACT && !LANDING) {
                continue;
            }
            const T = Math.min(1, Q / (LANDING ? 0.9 : 0.7)),
                ALPHA = 1 - T;
            if (ALPHA <= 0) {
                continue;
            }
            const SIZE = LANDING ? 0.7 : HEAVY ? 1.15 : 0.6,
                COLOR = LANDING ? '157,142,107' : E.kind === 'boss-hit' ? '245,199,102' : '231,147,83';
            r.ring(E.x, E.y, 0.15 + T * SIZE, `rgba(${COLOR},${ALPHA * 0.8})`, LANDING ? 0.045 : 0.075);
            const CENTER = r.project(E.x, E.y, E.z || 0.1),
                N = LANDING ? 5 : 6;
            for (let i = 0; i < N; i++) {
                const A = (i * Math.PI * 2) / N + (E.sequence % 11) * 0.19,
                    D = (0.12 + T * SIZE) * (LANDING ? 1.2 : 1),
                    P = r.project(
                        E.x + Math.cos(A) * D,
                        E.y + Math.sin(A) * D,
                        (E.z || 0.1) + (LANDING ? 0.12 : Math.sin(T * Math.PI) * 0.5),
                    );
                if (LANDING) {
                    r.ellipse(
                        P.x,
                        P.y,
                        r.scale * 0.09 * (1 - T),
                        r.scale * 0.045 * (1 - T),
                        `rgba(${COLOR},${ALPHA * 0.65})`,
                        A,
                    );
                } else {
                    const INNER = {
                        x: CENTER.x + (P.x - CENTER.x) * 0.55,
                        y: CENTER.y + (P.y - CENTER.y) * 0.55,
                    };
                    r.line(INNER, P, 0.055, `rgba(255,242,190,${ALPHA})`);
                }
            }
            if (IMPACT && T < 0.28) {
                r.ellipse(CENTER.x, CENTER.y, r.scale * 0.18 * (1 - T), r.scale * 0.12 * (1 - T), '#fff4d6');
            }
        }
    }
}
export { CombatFeel };
