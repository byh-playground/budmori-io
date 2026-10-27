import { SIGNATURE_FEATURES } from '../definition.js';
import { Brush, clamp } from './brush.js';
import { FIRE_EFFECT } from './fire.js';
import { GRASS_EFFECT } from './grass.js';
import { ICE_EFFECT } from './ice.js';
import { LIGHTNING_EFFECT } from './lightning.js';
import { WATER_EFFECT } from './water.js';

// Hand-drawn element effects of the five signature skills, keyed by the element each skill's config declares.
export const SIGNATURE_EFFECTS = Object.freeze({
    [SIGNATURE_FEATURES.fire.config.element]: FIRE_EFFECT,
    [SIGNATURE_FEATURES.ice.config.element]: ICE_EFFECT,
    [SIGNATURE_FEATURES.grass.config.element]: GRASS_EFFECT,
    [SIGNATURE_FEATURES.lightning.config.element]: LIGHTNING_EFFECT,
    [SIGNATURE_FEATURES.water.config.element]: WATER_EFFECT,
});

// The moment a signature skill lands (and each burn tick or jump). `progress` runs 0..1 over the effect's life.
export function drawSignatureEffect(renderer, event, progress) {
    const EFFECT = SIGNATURE_EFFECTS[event.element],
        BRUSH = new Brush(renderer);
    EFFECT.draw(BRUSH, event, (progress * EFFECT.lifeMs) / 1000);
    BRUSH.done();
}

// Small signs of the coming skill inside the danger area.
export function drawSignatureWindup(renderer, element, area) {
    const BRUSH = new Brush(renderer);
    SIGNATURE_EFFECTS[element].windup(BRUSH, area, clamp(area.progress), area.elapsed ?? 0);
    BRUSH.done();
}
