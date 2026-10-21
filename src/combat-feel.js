import { presentationEventTimeMs } from './farm-model.js';
import { RiceCriticalPresentation } from './features/abilities/rice-critical/presentation.js';
import { BarleyArmorShredPresentation } from './features/abilities/barley-shred/presentation.js';
const { ObjectPool: OBJECT_POOL } = globalThis.BloomGamekitObjectPool;
const EMPTY_NOTICES = Object.freeze([]);
const RICE_CRITICAL_PRESENTATION = new RiceCriticalPresentation();
const BARLEY_SHRED_PRESENTATION = new BarleyArmorShredPresentation();
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

// Each notice presentation owns its sound, drawing, and queue-lifetime hooks.
// The shared burst base is a genuine common drawing algorithm; event-specific
// parameters and particle shapes belong to the concrete presentation class.
class BurstPresentation {
    draw(renderer, event, progress) {
        const T = Math.min(1, progress / this.durationFraction),
            ALPHA = 1 - T;
        if (ALPHA <= 0) {
            return;
        }
        const SIZE = this.size(event),
            COLOR = this.color;
        renderer.ring(event.x, event.y, 0.15 + T * SIZE, `rgba(${COLOR},${ALPHA * 0.8})`, this.ringWidth);
        const CENTER = renderer.project(event.x, event.y, event.z || 0.1),
            N = this.particleCount;
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
    draw(renderer, event, progress) {
        super.draw(renderer, event, progress);
        if (event.critical) {
            RICE_CRITICAL_PRESENTATION.drawCriticalHit(renderer, event, progress);
        }
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
        feel.bossHit = displayEvent;
        feel.kick(event.strength, displayEvent.at);
    }
    sound(audio, event) {
        audio.sound('strike', event.species || 0);
    }
}
class UnitHitPresentation extends HitPresentation {
    color = '231,147,83';
    observe(feel, event, _displayEvent, at) {
        feel.poses.set(event.unit, {
            at,
            until: at + 180,
            strength: event.strength * (event.critical ? 1.4 : 1),
        });
        feel.counts.hits++;
    }
    sound(audio, event) {
        audio.sound(event.attackKind === 'sweep' ? 'heavy' : 'strike');
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
    ['boss-hit', Object.freeze(new BossHitPresentation())],
    ['unit-hit', Object.freeze(new UnitHitPresentation())],
    ['barley-shred', Object.freeze(BARLEY_SHRED_PRESENTATION)],
    ['unit-land', Object.freeze(new UnitLandingPresentation())],
    ['attack-launch', Object.freeze(new AttackLaunchPresentation())],
    ['boss-launch', Object.freeze(new BossLaunchPresentation())],
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
        this.bossHit = null;
        this.shakeAt = -1e9;
        this.shakePower = 0;
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
            this.bossHit = null;
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
            this.effects.push(EVENT);
            if (this.effects.length > 48) {
                this.releaseEffect(this.effects.shift());
            }
            PRESENTATION.observe?.(this, E, EVENT, AT);
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
            const PRESENTATION = COMBAT_EFFECT_PRESENTATIONS.get(E.kind);
            PRESENTATION?.draw?.(r, E, AGE / 430);
        }
    }
}
export { CombatFeel };
