import { presentationEventTimeMs } from '../model/farm-model.js';
import { DamageNumberPresentation } from './damage-numbers.js';
import { BarleyArmorShredPresentation } from '../features/abilities/barley-shred/presentation.js';
import { PASSIVE_PRESENTATION_EVENTS } from '../tower/tower-passive-presentations.js';
const { ObjectPool: OBJECT_POOL } = globalThis.BloomGamekitObjectPool;
const EMPTY_NOTICES = Object.freeze([]);
// One place for the budget of a fight's feedback: how long an effect lives, how many may be alive, and when the
// decoration thins out. Numbers never thin out; the particles around them do.
const COMBAT_FEEL_CONFIG = Object.freeze({
    lifeMs: 430,
    maxEffects: 96,
    denseHits: 12,
    denseParticles: 2,
});
const BARLEY_SHRED_PRESENTATION = new BarleyArmorShredPresentation();
// Only these primitive unit-land notice copies are owned by the display queue.
// Garden notices, interpolation history and the longer-lived boss hit records are not pooled.
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

// Each notice presentation owns its sound, drawing, and queue-lifetime hooks.
// The shared burst base is a genuine common drawing algorithm; event-specific
// parameters and particle shapes belong to the concrete presentation class.
class BurstPresentation {
    // The ring lies on the floor, so it is drawn under every actor; on top of a tall body it read as a stray circle.
    drawGround(renderer, event, progress) {
        const T = Math.min(1, progress / this.durationFraction),
            ALPHA = 1 - T;
        if (ALPHA > 0) {
            renderer.ring(
                event.x,
                event.y,
                0.15 + T * this.size(event),
                `rgba(${this.color},${ALPHA * 0.8})`,
                this.ringWidth,
            );
        }
    }
    draw(renderer, event, progress, feel) {
        const T = Math.min(1, progress / this.durationFraction),
            ALPHA = 1 - T;
        if (ALPHA <= 0) {
            return;
        }
        const SIZE = this.size(event),
            COLOR = this.color;
        const CENTER = renderer.project(event.x, event.y, event.z || 0.1),
            N = feel?.dense ? Math.min(this.particleCount, COMBAT_FEEL_CONFIG.denseParticles) : this.particleCount;
        for (let i = 0; i < N; i++) {
            const ANGLE = (i * Math.PI * 2) / N + (event.sequence % 11) * 0.19,
                DISTANCE = (0.12 + T * SIZE) * this.distanceMultiplier,
                POINT = renderer.project(
                    event.x + Math.cos(ANGLE) * DISTANCE,
                    event.y + Math.sin(ANGLE) * DISTANCE,
                    (event.z || 0.1) + this.elevation(T),
                );
            this.drawParticle(renderer, POINT, CENTER, ANGLE, ALPHA, COLOR, T);
        }
        this.drawFlash?.(renderer, CENTER, T);
    }
}
class HitPresentation extends BurstPresentation {
    durationFraction = 0.7;
    ringWidth = 0.075;
    particleCount = 6;
    distanceMultiplier = 1;
    draw(renderer, event, progress, feel) {
        super.draw(renderer, event, progress, feel);
        if (event.critical) {
            this.drawCritical(renderer, event, progress);
        }
    }
    // A critical hit reads by shape, not only by colour: a wide orange ring and a star of thick rays, where a normal
    // hit has a thin cream ring and short sparks.
    drawCritical(renderer, event, progress) {
        const T = Math.min(1, progress / 0.58),
            ALPHA = 1 - T,
            CENTER = renderer.project(event.x, event.y, (event.z || 0) + 0.22);
        if (ALPHA <= 0) {
            return;
        }
        renderer.ring(event.x, event.y, 0.3 + T * 0.62, `rgba(255,150,40,${ALPHA * 0.95})`, 0.11);
        for (let index = 0; index < 6; index++) {
            const ANGLE = (index * Math.PI) / 3 + (event.sequence % 7) * 0.08,
                REACH = renderer.scale * (0.16 + T * 0.3),
                START = REACH * 0.45;
            renderer.line(
                { x: CENTER.x + Math.cos(ANGLE) * START, y: CENTER.y + Math.sin(ANGLE) * START },
                { x: CENTER.x + Math.cos(ANGLE) * REACH, y: CENTER.y + Math.sin(ANGLE) * REACH },
                0.075,
                `rgba(255,214,102,${ALPHA})`,
            );
        }
    }
    // Every confirmed hit that did damage gets its own number; a blocked hit has none.
    spawnNumber(feel, event, at, role) {
        if (!(event.damage > 0)) {
            return;
        }
        feel.counts.numbers++;
        feel.push({
            kind: 'damage-number',
            sequence: event.sequence,
            x: event.x,
            y: event.y,
            z: event.z,
            amount: event.damage,
            critical: event.critical,
            role,
            at,
            heard: true,
        });
    }
    size(event) {
        const BASE = event.attackKind === 'sweep' ? 1.15 : 0.6;
        return BASE * (0.75 + 0.3 * Math.min(3, event.strength || 1));
    }
    elevation(progress) {
        return Math.sin(progress * Math.PI) * 0.5;
    }
    drawParticle(renderer, point, center, _angle, alpha) {
        const INNER = {
            x: center.x + (point.x - center.x) * 0.55,
            y: center.y + (point.y - center.y) * 0.55,
        };
        renderer.line(INNER, point, 0.055, `rgba(255,242,190,${alpha})`);
    }
    drawFlash(renderer, center, progress) {
        if (progress < 0.28) {
            renderer.ellipse(
                center.x,
                center.y,
                renderer.scale * 0.18 * (1 - progress),
                renderer.scale * 0.12 * (1 - progress),
                '#fff4d6',
            );
        }
    }
}
class BossHitPresentation extends HitPresentation {
    color = '245,199,102';
    observe(feel, event, displayEvent) {
        feel.counts.hits++;
        feel.bossHits.set(event.targetId, displayEvent);
        feel.kick(event.strength, displayEvent.at);
        this.spawnNumber(feel, event, displayEvent.at, 'dealt');
    }
    sound(audio, event) {
        audio.sound(event.critical ? 'crit' : 'strike', event.species || 0);
    }
}
class UnitHitPresentation extends HitPresentation {
    color = '231,147,83';
    observe(feel, event, _displayEvent, at) {
        this.spawnNumber(feel, event, at, 'taken');
        feel.poses.set(event.unit, {
            at,
            until: at + 180,
            strength: event.strength * (event.critical ? 1.4 : 1),
        });
        feel.counts.hits++;
    }
    sound(audio, event) {
        audio.sound(event.critical ? 'crit' : event.attackKind === 'sweep' ? 'heavy' : 'strike');
    }
}
class UnitLandingPresentation extends BurstPresentation {
    durationFraction = 0.9;
    color = '157,142,107';
    ringWidth = 0.045;
    particleCount = 5;
    distanceMultiplier = 1.2;
    acquire(feel, event, at) {
        return feel.acquireLandingEffect(event, at);
    }
    release(feel, event) {
        feel.landingPool.release(event);
    }
    observe(feel) {
        feel.counts.landings++;
    }
    sound(audio, event) {
        if (event.strength > 0.2) {
            audio.sound('land');
        }
    }
    size() {
        return 0.7;
    }
    elevation() {
        return 0.12;
    }
    drawParticle(renderer, point, _center, angle, alpha, color, progress) {
        renderer.ellipse(
            point.x,
            point.y,
            renderer.scale * 0.09 * (1 - progress),
            renderer.scale * 0.045 * (1 - progress),
            `rgba(${color},${alpha * 0.65})`,
            angle,
        );
    }
}
class AttackLaunchPresentation {
    draw(renderer, event, progress) {
        const T = Math.min(1, progress / 0.35),
            P = renderer.project(event.x, event.y, event.z + 0.2);
        if (T < 1) {
            renderer.ellipse(P.x, P.y, renderer.scale * 0.12 * (1 - T), renderer.scale * 0.2 * (1 - T), '#ffe7a6');
        }
    }
}
class BossLaunchPresentation {
    sound(audio) {
        audio.sound('launch');
    }
}
const COMBAT_EFFECT_PRESENTATIONS = new Map([
    ['damage-number', Object.freeze(new DamageNumberPresentation())],
    ['boss-hit', Object.freeze(new BossHitPresentation())],
    ['unit-hit', Object.freeze(new UnitHitPresentation())],
    ['barley-shred', Object.freeze(BARLEY_SHRED_PRESENTATION)],
    ['unit-land', Object.freeze(new UnitLandingPresentation())],
    ['attack-launch', Object.freeze(new AttackLaunchPresentation())],
    ['boss-launch', Object.freeze(new BossLaunchPresentation())],
    ...PASSIVE_PRESENTATION_EVENTS,
]);

// FarmSession supplies newly signaled notice batches. Presentation never polls
// model history, pauses the simulation, or writes simulation state.
class CombatFeel {
    constructor(audio) {
        this.audio = audio;
        this.world = null;
        this.revision = null;
        this.sequence = 0;
        this.effects = [];
        this.landingPool = new OBJECT_POOL(CREATE_LANDING_EFFECT, resetLandingEffect, 48);
        this.poses = new Map();
        this.bossHits = new Map();
        this.shakeAt = -1e9;
        this.shakePower = 0;
        this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.counts = {
            hits: 0,
            landings: 0,
            numbers: 0,
        };
        this.dense = false;
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
    push(event) {
        this.effects.push(event);
        if (this.effects.length > COMBAT_FEEL_CONFIG.maxEffects) {
            this.releaseEffect(this.effects.shift());
        }
    }
    // How long an effect stays: the effect decides, the shared budget is only the default.
    lifeMs(event) {
        return COMBAT_EFFECT_PRESENTATIONS.get(event.kind)?.lifeMs ?? COMBAT_FEEL_CONFIG.lifeMs;
    }
    releaseEffect(event) {
        COMBAT_EFFECT_PRESENTATIONS.get(event.kind)?.release?.(this, event);
    }
    observe(world, displayTimeMs, revision = 0, notices = EMPTY_NOTICES) {
        if (this.world !== world || this.revision !== revision) {
            this.world = world;
            this.revision = revision;
            this.sequence = world.eventSequence;
            for (const E of this.effects) {
                this.releaseEffect(E);
            }
            this.effects.length = 0;
            this.poses.clear();
            this.bossHits.clear();
            return;
        }
        for (const E of notices) {
            if (E.sequence <= this.sequence) {
                continue;
            }
            const PRESENTATION = COMBAT_EFFECT_PRESENTATIONS.get(E.kind);
            if (!PRESENTATION) {
                continue;
            }
            const AT = presentationEventTimeMs(E),
                EVENT = PRESENTATION.acquire?.(this, E, AT) ?? { ...E, at: AT, heard: false };
            this.push(EVENT);
            PRESENTATION.observe?.(this, E, EVENT, AT);
        }
        this.sequence = world.eventSequence;
        // Finish compaction before the next acquire; no released queue slot is read again.
        let retained = 0;
        for (const E of this.effects) {
            if (displayTimeMs - E.at < this.lifeMs(E)) {
                this.effects[retained++] = E;
            } else {
                this.releaseEffect(E);
            }
        }
        this.effects.length = retained;
        for (const [ID, EVENT] of this.bossHits) {
            if (displayTimeMs - EVENT.at >= 240) {
                this.bossHits.delete(ID);
            }
        }
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
    boss(displayTimeMs, id) {
        const E = this.bossHits.get(id);
        if (!E || this.reduced) {
            return {
                x: 0,
                y: 0,
                squash: 0,
            };
        }
        const POWER = Math.min(3, E.strength || 1),
            Q = Math.max(0, Math.min(1, (displayTimeMs - E.at) / 240)),
            K = Math.sin(Math.min(1, Q * 2) * Math.PI * 0.5) * (1 - Q) ** 2,
            JITTER = Math.sin(Q * 38) * (1 - Q) * 0.05 * POWER;
        return {
            x: -E.nx * K * (0.12 + 0.2 * POWER) + JITTER,
            y: -E.ny * K * (0.12 + 0.2 * POWER),
            squash: K * (0.035 + 0.04 * POWER) * (E.critical ? 1.4 : 1),
        };
    }
    kick(strength, at) {
        this.shakeAt = at;
        this.shakePower = Math.max(0, Math.min(3, strength || 1) - 0.8);
    }
    // World-unit camera offset: a short rattle after strong hits.
    shake(displayTimeMs) {
        const Q = (displayTimeMs - (this.shakeAt || -1e9)) / 220;
        if (this.reduced || Q < 0 || Q >= 1) {
            return 0;
        }
        return Math.sin(Q * 52) * (1 - Q) * 0.09 * (this.shakePower || 0);
    }
    sound(event) {
        COMBAT_EFFECT_PRESENTATIONS.get(event.kind)?.sound?.(this.audio, event);
    }
    drawGround(r, displayTimeMs) {
        for (const E of this.effects) {
            const AGE = displayTimeMs - E.at,
                LIFE = this.lifeMs(E);
            if (AGE >= 0 && AGE <= LIFE) {
                COMBAT_EFFECT_PRESENTATIONS.get(E.kind)?.drawGround?.(r, E, AGE / LIFE);
            }
        }
    }
    draw(r, displayTimeMs) {
        let hits = 0;
        for (const E of this.effects) {
            if (E.kind === 'boss-hit' || E.kind === 'unit-hit') {
                hits++;
            }
        }
        // A crowded moment draws less decoration around each hit; the hits and their numbers all stay.
        this.dense = hits > COMBAT_FEEL_CONFIG.denseHits;
        for (const E of this.effects) {
            const AGE = displayTimeMs - E.at,
                LIFE = this.lifeMs(E);
            if (AGE < 0 || AGE > LIFE) {
                continue;
            }
            if (!E.heard) {
                E.heard = true;
                this.sound(E);
            }
            COMBAT_EFFECT_PRESENTATIONS.get(E.kind)?.draw?.(r, E, AGE / LIFE, this);
        }
    }
}
export { CombatFeel };
