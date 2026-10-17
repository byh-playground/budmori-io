import { FEATURE } from './definition.js';
import { isJoyEffect } from '../../../farm-render-effects.js';

export class FarmScenePresentation {
    constructor() {
        this.id = FEATURE.id;
        this.groundColor = '#d1d8b8';
        this.surfaceColor = '#d9dfc2';
        this.minimumUnitPixels = 11;
    }
    cameraView(aspect) {
        return aspect > 1.2 ? [Math.max(12, 9 * aspect), 9] : [11.7, 11.7 / aspect];
    }
    bossVisible(world) {
        return world.farmBossEvent?.phase !== 'idle';
    }
    dangerVisible(world) {
        return world.farmBossEvent?.phase === 'fighting';
    }
    hiddenUnitId(world) {
        return world.mergeTask?.phase === 'animation' ? world.mergeTask.resultId : 0;
    }
    victorious() {
        return false;
    }
    unitMood(unit, joyEffects) {
        if (unit.cooldown > 0 && unit.ability?.phase === 'idle') {
            return 'neutral';
        }
        for (const EFFECT of joyEffects) {
            if (Math.hypot(EFFECT.x - unit.x, EFFECT.y - unit.y) < 1.2) {
                return 'happy';
            }
        }
        return unit.fed ? 'neutral' : 'hungry';
    }
    collectJoy(world, joyEffects) {
        joyEffects.length = 0;
        for (const EFFECT of world.effects) {
            if (isJoyEffect(EFFECT)) {
                joyEffects.push(EFFECT);
            }
        }
    }
    collectFood(renderer, world) {
        for (const FOOD of world.food) {
            renderer.addActor(renderer.foodPresentation, FOOD, 0.785 * FOOD.y - 0.62 * FOOD.z, -1);
        }
    }
    drawBoundary() {
        // The personal garden has no Raid boundary stroke.
    }
}
