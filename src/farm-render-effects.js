import { CopyDissolvePresentation } from './features/formation-skills/copy/presentation.js';
import { BirthEffect } from './features/farm-modes/breed/presentation.js';
import { MergeEffect, MergeMaterialEffect } from './features/farm-modes/merge/presentation.js';
import { PopcornExplosionEffect, PopcornImpactEffect } from './features/projectiles/popcorn/presentation.js';
import { clamp } from './farm-model.js';

// Stateless presentations are shared for the renderer lifetime. They consume model
// events without attaching callbacks or presentation state to those events.
class FeedEffect {
    draw(renderer, effect, progress) {
        const E = effect,
            Q = progress;

        renderer.ring(E.x, E.y, 0.15 + Q * 0.35, `rgba(166,121,59,${(1 - Q) * 0.6})`, 0.035);
    }
}

class FoodLandingEffect {
    draw(renderer, effect, progress) {
        const E = effect,
            Q = progress;

        const T = Math.min(1, Q / 0.35);
        renderer.ring(E.x, E.y, 0.1 + T * 0.42, `rgba(194,145,62,${(1 - T) * 0.85})`, 0.055);
        for (let i = 0; i < 3 && T < 1; i++) {
            const A = (i * Math.PI * 2) / 3,
                P = renderer.project(
                    E.x + Math.cos(A) * T * 0.4,
                    E.y + Math.sin(A) * T * 0.4,
                    0.08 + Math.sin(T * Math.PI) * 0.2,
                );
            renderer.ellipse(P.x, P.y, renderer.scale * 0.045, renderer.scale * 0.035, `rgba(245,213,133,${1 - T})`);
        }
    }
}

class ImpactEffect {
    draw(renderer, effect, progress) {
        const E = effect,
            Q = progress;

        renderer.ring(E.x, E.y, 0.1 + Q * 0.8, `rgba(146,131,78,${(1 - Q) * 0.65})`);
    }
}

class ShockwaveEffect {
    draw(renderer, effect, progress) {
        const E = effect,
            Q = progress;

        const PROGRESS = clamp(Q / (E.duration || 0.55), 0, 1),
            RADIUS = Math.max(0.08, E.radius) * (0.2 + 0.8 * PROGRESS);
        renderer.groundEllipse(E.x, E.y, RADIUS, RADIUS, `rgba(225,190,103,${0.12 * (1 - PROGRESS)})`);
        renderer.ring(E.x, E.y, RADIUS, `rgba(234,194,104,${0.82 * (1 - PROGRESS)})`, 0.12 * (1 - PROGRESS) + 0.025);
        renderer.ring(E.x, E.y, Math.max(0.05, RADIUS - 0.12), `rgba(250,225,158,${0.55 * (1 - PROGRESS)})`, 0.045);
    }
}

class DropDustEffect {
    draw(renderer, effect, progress) {
        const E = effect,
            Q = progress;

        const T = Math.min(1, Q / 0.28);
        renderer.ring(E.x, E.y, 0.12 + T * 0.4, `rgba(126,126,99,${(1 - T) * 0.42})`, 0.045);
        for (let i = 0; i < 4; i++) {
            const A = (i * Math.PI) / 2 + T * 0.35,
                P = renderer.project(
                    E.x + Math.cos(A) * T * 0.33,
                    E.y + Math.sin(A) * T * 0.22,
                    0.025 + Math.sin(T * Math.PI) * 0.1,
                );
            renderer.ellipse(P.x, P.y, renderer.scale * 0.045, renderer.scale * 0.03, `rgba(179,169,137,${1 - T})`);
        }
    }
}

class EatingEffect {
    draw(renderer, effect, progress) {
        const E = effect,
            Q = progress;

        for (let i = 0; i < 3; i++) {
            const A = (i * Math.PI * 2) / 3,
                T = Math.min(1, Q / 0.45),
                P = renderer.project(E.x + Math.cos(A) * T * 0.35, E.y + Math.sin(A) * T * 0.35, E.z + T * 0.6);
            renderer.ellipse(
                P.x,
                P.y,
                renderer.scale * 0.05,
                renderer.scale * 0.075,
                `rgba(255,235,160,${Math.max(0, 1 - Q / 0.45)})`,
                A,
            );
        }
    }
}

const IMPACT = new ImpactEffect();
const SHOCKWAVE = new ShockwaveEffect();
const EFFECT_PRESENTATIONS = new Map([
    ['formation-copy-death', new CopyDissolvePresentation()],
    ['feed', new FeedEffect()],
    ['food-land', new FoodLandingEffect()],
    ['land', IMPACT],
    ['impact', IMPACT],
    ['landing-shockwave', SHOCKWAVE],
    ['walnut-shockwave', SHOCKWAVE],
    ['popcorn-explosion', new PopcornExplosionEffect()],
    ['popcorn-kernel-impact', new PopcornImpactEffect()],
    ['drop-dust', new DropDustEffect()],
    ['merge-material', new MergeMaterialEffect()],
    ['birth', new BirthEffect()],
    ['merge', new MergeEffect()],
    ['eat', new EatingEffect()],
]);
const JOY_EFFECTS = new Set(['eat', 'birth', 'merge']);

export function isJoyEffect(effect) {
    return effect.life < 0.85 && JOY_EFFECTS.has(effect.kind);
}
export function drawEffect(renderer, effect) {
    const PRESENTATION = EFFECT_PRESENTATIONS.get(effect.kind);
    if (!PRESENTATION) {
        return;
    }
    const DELAY = Number.isFinite(effect.delay) ? effect.delay : 0,
        SPAN = Number.isFinite(effect.span) ? effect.span : 1;
    if (effect.life < DELAY) {
        return;
    }
    const PROGRESS = Number.isFinite(effect.span) ? clamp((effect.life - DELAY) / SPAN, 0, 1) : effect.life;
    PRESENTATION.draw(renderer, effect, PROGRESS);
}
