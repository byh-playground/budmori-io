import { FEATURE } from './definition.js';
import { isJoyEffect } from '../../../farm-render-effects.js';
import { drawMergeBlackHoles } from '../../farm-modes/merge/presentation.js';

export class FarmScenePresentation {
    constructor() {
        this.id = FEATURE.id;
        this.groundColor = '#d1d8b8';
        this.surfaceColor = '#d9dfc2';
        this.minimumUnitPixels = 11;
        this.hiddenMergeUnitIds = new Set();
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
    drawMergeBlackHoles(renderer, world) {
        drawMergeBlackHoles(renderer, world);
    }
    hiddenUnitIds(world) {
        const IDS = this.hiddenMergeUnitIds;
        IDS.clear();
        for (const TASK of world.mergeTasks || []) {
            if (TASK.phase !== 'approach' || !(TASK.duration > 0) || TASK.elapsed / TASK.duration < 0.82) {
                continue;
            }
            for (const UNIT of world.units) {
                if (!TASK.materialIds.includes(UNIT.id)) {
                    continue;
                }
                const BODY_HEIGHT = Number.isFinite(UNIT.height) ? UNIT.height : 0,
                    BODY_RADIUS = Number.isFinite(UNIT.radius) ? UNIT.radius : 0,
                    IN_APERTURE =
                        Math.hypot(UNIT.x - TASK.centerX, UNIT.y - TASK.centerY) <= Math.max(0.55, BODY_RADIUS * 0.48),
                    INSIDE_DEPTH =
                        UNIT.z >= TASK.centerZ - BODY_HEIGHT * 0.68 && UNIT.z + BODY_HEIGHT >= TASK.centerZ + 0.12;
                if (IN_APERTURE && INSIDE_DEPTH) {
                    IDS.add(UNIT.id);
                }
            }
        }
        return IDS;
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
