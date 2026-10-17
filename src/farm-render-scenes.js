import { FarmScenePresentation } from './features/scenes/farm/presentation.js';
import { RaidScenePresentation } from './features/scenes/raid/presentation.js';

const SCENE_PRESENTATIONS = new Map(
    [new FarmScenePresentation(), new RaidScenePresentation()].map((presentation) => [presentation.id, presentation]),
);
export function scenePresentation(scene) {
    const PRESENTATION = SCENE_PRESENTATIONS.get(scene);
    if (!PRESENTATION) {
        throw new Error('Missing scene presentation for ' + scene);
    }
    return PRESENTATION;
}
