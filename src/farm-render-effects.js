import { CopyDissolvePresentation } from './features/formation-skills/copy/presentation.js';
import { BirthEffect } from './features/farm-modes/breed/presentation.js';
import { MergeEffect, MergeMaterialEffect } from './features/farm-modes/merge/presentation.js';
import { PeanutDeathSplitPresentation } from './features/abilities/peanut-death-split/presentation.js';
import {
    DropDustEffect,
    ThreshEffect,
    EatingEffect,
    FeedEffect,
    FoodLandingEffect,
    ImpactEffect,
    ShockwaveEffect,
} from './features/farm-modes/basic-presentation.js';
import { clamp } from './farm-model.js';

const IMPACT = new ImpactEffect();
const SHOCKWAVE = new ShockwaveEffect();
const PEANUT_SPLIT = new PeanutDeathSplitPresentation();
const EFFECT_PRESENTATIONS = new Map([
    ['formation-copy-death', new CopyDissolvePresentation()],
    ['feed', new FeedEffect()],
    ['food-land', new FoodLandingEffect()],
    ['land', IMPACT],
    ['impact', IMPACT],
    ['landing-shockwave', SHOCKWAVE],
    ['walnut-shockwave', SHOCKWAVE],
    ['peanut-split', PEANUT_SPLIT],
    ['drop-dust', new DropDustEffect()],
    ['thresh', new ThreshEffect()],
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
export function disposeEffectPresentations(renderer) {
    for (const PRESENTATION of EFFECT_PRESENTATIONS.values()) {
        PRESENTATION.dispose?.(renderer);
    }
}
