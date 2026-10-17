import { FEATURE } from './definition.js';
import { CONFIG } from '../../../farm-model.js';

export class RaidScenePresentation {
    constructor() {
        this.id = FEATURE.id;
        this.groundColor = '#cecfb3';
        this.surfaceColor = '#d7d8bf';
        this.minimumUnitPixels = 4.5;
    }
    cameraView(aspect) {
        return aspect > 1.2 ? [Math.max(26.5, 17 * aspect), 17] : [26.5, 26.5 / aspect];
    }
    bossVisible() {
        return true;
    }
    dangerVisible() {
        return true;
    }
    hiddenUnitId() {
        return 0;
    }
    victorious(world) {
        return world.encounter?.outcome === 'victory';
    }
    unitMood() {
        return 'neutral';
    }
    collectJoy(_world, joyEffects) {
        joyEffects.length = 0;
    }
    collectFood() {
        // Food belongs only to the personal garden.
    }
    drawBoundary(renderer) {
        renderer.strokeGroundEllipse(
            0,
            0,
            CONFIG.raid.arena.radiusX - 0.5,
            CONFIG.raid.arena.radiusY - 0.5,
            '#728e61a8',
            0.075,
        );
    }
}
