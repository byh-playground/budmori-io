import { FormationPresentation, glint, radialStreaks, segmentedRing } from '../presentation-base.js';

// Every size below is a share of the blast radius, so the big meteor and the shower's small ones are one drawing.
const BLAST_SECONDS = 0.5,
    METEOR = Object.freeze({
        // Fall: starts this many radii up and this many radii to the side, then accelerates onto the target.
        fallHeight: 5.5,
        fallSideways: 1.7,
        rock: 0.42,
        glow: 0.85,
        trailSteps: 9,
        trailSpan: 0.22,
        // Blast.
        flash: 0.22,
        scorch: 0.8,
        plumes: 4,
        debris: 10,
        smoke: 4,
    });
const TRAIL_COLORS = Object.freeze(['255,244,200', '255,196,92', '255,128,48', '176,56,28']);

function unit(index, salt) {
    const VALUE = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
    return VALUE - Math.floor(VALUE);
}
function fallPosition(effect, progress) {
    const REMAINING = 1 - progress * progress,
        R = effect.radius;
    return { x: effect.x - R * METEOR.fallSideways * REMAINING, z: R * METEOR.fallHeight * REMAINING };
}

export class MeteorPresentation extends FormationPresentation {
    draw(renderer, effect) {
        const AGE = effect.age - effect.delay,
            FALL_SECONDS = effect.fallSeconds ?? 0.75;
        if (AGE < 0) {
            return;
        }
        if (AGE < FALL_SECONDS) {
            this.drawFall(renderer, effect, AGE / FALL_SECONDS);
        } else {
            this.drawBlast(renderer, effect, Math.min(1, (AGE - FALL_SECONDS) / BLAST_SECONDS));
        }
    }
    // The ground mark shows the real damage radius and closes in as the rock comes down.
    drawTelegraph(renderer, effect, progress) {
        const R = effect.radius;
        renderer.groundEllipse(effect.x, effect.y, R, R, `rgba(255,120,60,${0.08 + progress * 0.2})`);
        segmentedRing(renderer, effect.x, effect.y, 0.015, R, 0.4 + progress * 0.5, progress * 0.2, '255,170,88');
        renderer.ring(
            effect.x,
            effect.y,
            R * (1.7 - progress * 1.2),
            `rgba(255,214,150,${0.5 - progress * 0.3})`,
            R * 0.03,
        );
    }
    drawFall(renderer, effect, progress) {
        const R = effect.radius,
            S = renderer.scale;
        this.drawTelegraph(renderer, effect, progress);
        // The trail replays the rock's own earlier positions, so it always follows the path it really took.
        for (let step = METEOR.trailSteps; step >= 1; step--) {
            const BEHIND = step / METEOR.trailSteps,
                AT = fallPosition(effect, Math.max(0, progress - BEHIND * METEOR.trailSpan)),
                POINT = renderer.project(AT.x, effect.y, AT.z),
                COLOR = TRAIL_COLORS[Math.min(TRAIL_COLORS.length - 1, Math.floor(BEHIND * TRAIL_COLORS.length))],
                SIZE = R * METEOR.rock * (1 - BEHIND * 0.7);
            const TIP = fallPosition(effect, Math.max(0, progress - BEHIND * METEOR.trailSpan - 0.08));
            renderer.spike(
                POINT,
                renderer.project(TIP.x, effect.y, TIP.z),
                SIZE * 1.3,
                `rgba(${COLOR},${0.7 * (1 - BEHIND)})`,
            );
        }
        const AT = fallPosition(effect, progress),
            P = renderer.project(AT.x, effect.y, AT.z),
            ROCK = R * METEOR.rock * S;
        renderer.ellipse(P.x, P.y, ROCK * METEOR.glow * 1.9, ROCK * METEOR.glow * 1.9, 'rgba(255,150,60,0.12)');
        renderer.ellipse(P.x, P.y, ROCK * 1.25, ROCK * 1.25, 'rgba(255,190,90,0.23)');
        renderer.ellipse(P.x, P.y, ROCK, ROCK * 1.1, '#5a3426', progress * 6);
        renderer.ellipse(P.x - ROCK * 0.22, P.y - ROCK * 0.2, ROCK * 0.62, ROCK * 0.6, '#c2602c', progress * 6);
        renderer.ellipse(P.x - ROCK * 0.34, P.y - ROCK * 0.32, ROCK * 0.3, ROCK * 0.28, '#ffd98a');
        // A shadow on the ground grows as it nears.
        renderer.groundEllipse(effect.x, effect.y, R * 0.35 * progress, R * 0.35 * progress, 'rgba(20,12,8,0.25)');
    }
    drawBlast(renderer, effect, progress) {
        const R = effect.radius,
            S = renderer.scale,
            OUT = 1 - (1 - progress) ** 3,
            FADE = 1 - progress,
            HOLD = 1 - progress * progress;
        renderer.groundEllipse(
            effect.x,
            effect.y,
            R * METEOR.scorch,
            R * METEOR.scorch,
            `rgba(28,16,10,${0.42 * (1 - progress * 0.5)})`,
        );
        renderer.groundEllipse(
            effect.x,
            effect.y,
            R * (0.4 + OUT * 0.6),
            R * (0.4 + OUT * 0.6),
            `rgba(239,157,72,${FADE * 0.3})`,
        );
        renderer.ring(effect.x, effect.y, R * OUT, `rgba(255,215,138,${FADE})`, R * (0.11 * FADE + 0.02));
        renderer.ring(effect.x, effect.y, R * OUT * 0.62, `rgba(255,255,255,${FADE})`, R * 0.035 * FADE);
        if (progress < METEOR.flash) {
            const T = 1 - progress / METEOR.flash,
                F = renderer.project(effect.x, effect.y, R * 0.35);
            renderer.ellipse(F.x, F.y, S * R * 0.7, S * R * 0.36, `rgba(255,240,200,${0.8 * T})`);
            renderer.ellipse(F.x, F.y, S * R * 0.28, S * R * 0.19, `rgba(255,255,255,${T})`);
        }
        radialStreaks(renderer, effect.x, effect.y, R * 0.12, R * 1.5, progress / 0.8, effect.id, '255,197,111');
        // Separate tapered tongues leave the struck body's silhouette visible between the flames.
        for (let i = 0; i < METEOR.plumes; i++) {
            const A = (i / METEOR.plumes) * Math.PI * 2 + unit(i, effect.id),
                REACH = R * (0.15 + OUT * 0.4),
                X = effect.x + Math.cos(A) * REACH,
                Y = effect.y + Math.sin(A) * REACH * 0.6,
                BASE_Z = R * (0.05 + progress * 0.3),
                TIP_Z = BASE_Z + R * (0.55 + unit(i, effect.id + 8) * 0.6) * HOLD,
                BASE = renderer.project(X, Y, BASE_Z),
                TIP = renderer.project(X + Math.cos(A) * R * 0.2, Y, TIP_Z),
                CORE = Math.max(0, 1 - progress / 0.55);
            renderer.spike(BASE, TIP, R * 0.5 * HOLD, `rgba(224,93,35,${FADE * 0.7})`);
            renderer.spike(BASE, TIP, R * 0.25 * HOLD, `rgba(255,180,77,${FADE * 0.85})`);
            if (CORE > 0) {
                renderer.spike(
                    BASE,
                    renderer.project(X, Y, BASE_Z + R * 0.45 * CORE),
                    R * 0.1 * CORE,
                    `rgba(255,243,185,${CORE})`,
                );
            }
        }
        for (let i = 0; i < METEOR.smoke; i++) {
            const A = (i / METEOR.smoke) * Math.PI * 2 + 0.7 + unit(i, effect.id + 3),
                P = renderer.project(
                    effect.x + Math.cos(A) * R * 0.5 * OUT,
                    effect.y + Math.sin(A) * R * 0.3 * OUT,
                    R * (0.3 + progress * 1.4),
                );
            renderer.ellipse(
                P.x,
                P.y,
                S * R * (0.2 + progress * 0.3),
                S * R * (0.16 + progress * 0.24),
                `rgba(70,62,58,${FADE * 0.24})`,
            );
        }
        for (let i = 0; i < METEOR.debris; i++) {
            const A = i * 2.39996 + effect.id,
                REACH = R * OUT * (0.35 + 0.65 * unit(i, effect.id)),
                LIFT = R * 1.5 * (0.4 + unit(i, effect.id + 1)) * Math.sin(progress * Math.PI),
                P = renderer.project(effect.x + Math.cos(A) * REACH, effect.y + Math.sin(A) * REACH * 0.7, LIFT);
            const C = renderer.ctx,
                CHIP = S * R * 0.11 * FADE;
            C.beginPath();
            C.moveTo(P.x - CHIP, P.y - CHIP * 0.35);
            C.lineTo(P.x + CHIP * 0.2, P.y - CHIP * 0.85);
            C.lineTo(P.x + CHIP, P.y + CHIP * 0.25);
            C.lineTo(P.x - CHIP * 0.35, P.y + CHIP * 0.7);
            C.closePath();
            C.fillStyle = `rgba(92,56,39,${FADE})`;
            C.fill();
            if (i % 3 === 0) {
                glint(
                    renderer,
                    effect.x + Math.cos(A) * REACH,
                    effect.y + Math.sin(A) * REACH * 0.7,
                    LIFT,
                    R * 0.045 * FADE,
                    FADE,
                    '255,193,98',
                );
            }
        }
    }
}
