import { BossAttackPresentation } from '../presentation-base.js';
import { MINION_FEATURES, boltFlight } from './definition.js';
import { Brush } from '../signature/effects/brush.js';
import { ELEMENT_RGB, drawElementRing, emitElementParticles } from '../../../render/element-particles.js';
import { drawElementProjectile } from '../../../render/element-projectile.js';

const RGBA = (element, alpha) => `rgba(${ELEMENT_RGB[element]},${alpha})`;
const MINION_FX = Object.freeze({
    // The height a shot leaves the minion at, and the top of the mortar shell's arc.
    shotLift: 1.4,
    mortarApex: 5,
    boltRadius: 0.3,
    shellRadius: 0.4,
    impactLifeMs: Object.freeze({ 'minion.bolt': 320, 'minion.mortar': 650, 'minion.blast': 800 }),
    // Element particles thrown by an impact, per world unit of its radius.
    particlesPerRadius: 4,
});
// Each kind's mark under its body (a caster has none, it looks as it always did). A lit bomber pulses red.
const MINION_MARKS = Object.freeze({
    ranged: Object.freeze({ color: '#ffd35a', gap: 0.3, width: 0.08 }),
    bomber: Object.freeze({ color: '#ff8a1e', gap: 0.3, width: 0.08, fuse: '#ff3326' }),
});
const POINT = (from, to, t) => ({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t });

// The bolt is a basic attack: no danger area, only the shot charging at the minion and flying to the point. In
// flight it is drawn like any coloured unit's projectile (element-projectile.js).
class MinionBoltPresentation extends BossAttackPresentation {
    constructor() {
        super(MINION_FEATURES.bolt, 'strike', 0.12, 0.12);
        this.shot = { id: 0, element: 0, elapsed: 0, x: 0, y: 0, z: 0 };
    }
    drawTelegraph(renderer, area) {
        const FROM = { x: area.fromX, y: area.fromY },
            TO = { x: area.x, y: area.y };
        if (area.phase === 'windup') {
            const BRUSH = new Brush(renderer);
            BRUSH.add(true);
            BRUSH.dot(
                FROM.x,
                FROM.y,
                MINION_FX.shotLift,
                MINION_FX.boltRadius * (0.6 + area.progress),
                RGBA(area.element, 1),
                0.8,
            );
            BRUSH.done();
            return;
        }
        if (area.phase !== 'active') {
            return;
        }
        const T = boltFlight(FROM, TO, area.elapsed, this.config),
            HEAD = POINT(FROM, TO, T),
            TAIL = POINT(FROM, TO, Math.max(0, T - 0.2)),
            Z = MINION_FX.shotLift * (1 - T) + 0.5 * T;
        Object.assign(this.shot, { element: area.element, elapsed: area.elapsed, x: HEAD.x, y: HEAD.y, z: Z });
        drawElementProjectile(renderer, this.shot, renderer.project(HEAD.x, HEAD.y, Z), { ...TAIL, z: Z + 0.1 });
        const SCREEN = renderer.project(HEAD.x, HEAD.y, Z);
        renderer.ellipse(
            SCREEN.x,
            SCREEN.y,
            renderer.scale * MINION_FX.boltRadius,
            renderer.scale * MINION_FX.boltRadius,
            RGBA(area.element, 0.6),
        );
    }
}

// The shared danger circle at the target, edged in the element's colour, and the shell arcing onto it.
class MinionMortarPresentation extends BossAttackPresentation {
    constructor() {
        super(MINION_FEATURES.mortar, 'strike', 0.12, 0.12);
    }
    drawTelegraph(renderer, area) {
        super.drawTelegraph(renderer, area);
        if (area.phase !== 'windup') {
            return;
        }
        renderer.ring(area.x, area.y, area.reach, RGBA(area.element, 0.55 + 0.35 * area.progress), 0.08);
        const T = area.progress,
            AT = POINT({ x: area.fromX, y: area.fromY }, area, T),
            Z = MINION_FX.shotLift * (1 - T) + 4 * MINION_FX.mortarApex * T * (1 - T),
            BRUSH = new Brush(renderer);
        BRUSH.flat(AT.x, AT.y, MINION_FX.shellRadius, MINION_FX.shellRadius, '#1c1410', 0.25);
        BRUSH.dot(AT.x, AT.y, Z, MINION_FX.shellRadius, '#3b2a1e', 1);
        BRUSH.add(true);
        BRUSH.dot(AT.x, AT.y, Z, MINION_FX.shellRadius * 0.7, RGBA(area.element, 1), 0.9);
        BRUSH.done();
    }
}

// The shared danger circle around the bomber, with a ring that fills it as the fuse burns down, faster and faster.
class MinionBlastPresentation extends BossAttackPresentation {
    constructor() {
        super(MINION_FEATURES.blast, 'strike', 0.12, 0.12);
    }
    drawTelegraph(renderer, area) {
        super.drawTelegraph(renderer, area);
        if (area.phase !== 'windup') {
            return;
        }
        const PULSE = fusePulse(area.elapsed, area.progress);
        renderer.ring(area.x, area.y, area.reach * area.progress, `rgba(255,70,40,${0.45 + 0.45 * PULSE})`, 0.1);
    }
}
export const MINION_PRESENTATIONS = Object.freeze([
    new MinionBoltPresentation(),
    new MinionMortarPresentation(),
    new MinionBlastPresentation(),
]);

// 0..1 throb of a burning fuse that quickens as it runs out.
function fusePulse(elapsed, progress) {
    return 0.5 + 0.5 * Math.sin(elapsed * (10 + 30 * progress));
}
function fuseLit(u) {
    return u.patternId === MINION_FEATURES.blast.id && u.patternPhase === 'windup' && u.hp > 0;
}
// Rings under a ranged or bomber minion (its kind), and a lit bomber's throbbing red ring.
export function addMinionRings(u, addRing) {
    const MARK = MINION_MARKS[u.minionKind];
    if (!MARK || u.hp <= 0) {
        return;
    }
    addRing(u.radius + MARK.gap, MARK.color, MARK.width, 1);
    if (MARK.fuse && fuseLit(u)) {
        const PULSE = fusePulse(u.patternPhaseElapsed, u.patternPhaseElapsed / MINION_FEATURES.blast.config.windup);
        addRing(u.radius + MARK.gap + 0.2 + 0.25 * PULSE, MARK.fuse, 0.08 + 0.08 * PULSE, 1);
    }
}
// A lit bomber glows red over its body.
export function drawMinionFuseGlow(renderer, u) {
    if (!fuseLit(u)) {
        return;
    }
    const PROGRESS = u.patternPhaseElapsed / MINION_FEATURES.blast.config.windup,
        PULSE = fusePulse(u.patternPhaseElapsed, PROGRESS),
        BRUSH = new Brush(renderer);
    BRUSH.add(true);
    BRUSH.dot(u.x, u.y, u.z + u.height * 0.45, u.radius * 1.05, '#ff3a1c', 0.18 + 0.32 * PULSE * (0.5 + PROGRESS));
    BRUSH.done();
}

// Where a minion shot lands: a flash filling the hit circle, the shared element ring and particles scaled to it.
export class MinionImpactPresentation {
    lifeMsFor(event) {
        return MINION_FX.impactLifeMs[event.patternId];
    }
    draw(renderer, event, progress) {
        const R = event.reach,
            FADE = 1 - progress,
            BRUSH = new Brush(renderer);
        BRUSH.add(true);
        BRUSH.flat(
            event.x,
            event.y,
            R * (0.5 + 0.5 * progress),
            R * (0.5 + 0.5 * progress),
            RGBA(event.element, 1),
            0.45 * FADE,
        );
        BRUSH.dot(event.x, event.y, 0.4, R * 0.3 * FADE, '#fff6dc', FADE);
        BRUSH.done();
        if (event.element > 0) {
            drawElementRing(renderer, event.element, event, progress, R * 1.6);
            emitElementParticles(renderer, event.element, { x: event.x, y: event.y, z: 0.2 }, progress, {
                count: Math.max(3, Math.round(R * MINION_FX.particlesPerRadius)),
                size: R,
                seed: Math.round((event.x + event.y) * 10),
            });
        }
    }
}
