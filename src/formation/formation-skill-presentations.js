import { GiantPresentation } from '../features/formation-skills/giant/presentation.js';
import { LightningPresentation } from '../features/formation-skills/lightning/presentation.js';
import { MeteorPresentation } from '../features/formation-skills/meteor/presentation.js';
import { MeteorShowerPresentation } from '../features/formation-skills/meteor-shower/presentation.js';
import { CopyPresentation } from '../features/formation-skills/copy/presentation.js';
import { HealingRainPresentation } from '../features/formation-skills/healing-rain/presentation.js';
import { HammerPresentation } from '../features/formation-skills/hammer/presentation.js';
import { UfoPresentation } from '../features/formation-skills/ufo/presentation.js';
import { StormCloudPresentation } from '../features/formation-skills/storm-cloud/presentation.js';
const PRESENTATIONS = new Map([
    ['giant', new GiantPresentation()],
    ['lightning', new LightningPresentation()],
    ['meteor', new MeteorPresentation()],
    ['meteor-shower', new MeteorShowerPresentation()],
    ['copy', new CopyPresentation()],
    ['healing-rain', new HealingRainPresentation()],
    ['hammer', new HammerPresentation()],
    ['ufo', new UfoPresentation()],
    ['storm-cloud', new StormCloudPresentation()],
]);
export function drawFormationEffects(renderer, world) {
    for (const EFFECT of world.formationEffects || []) {
        PRESENTATIONS.get(EFFECT.kind)?.draw(renderer, EFFECT, world);
    }
}

export function includeFormationEffectBounds(world, bounds) {
    for (const EFFECT of world.formationEffects || []) {
        PRESENTATIONS.get(EFFECT.kind)?.includeBounds?.(EFFECT, bounds);
    }
}
