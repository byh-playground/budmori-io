import { FarmScenePresentation } from '../features/scenes/farm/presentation.js';

const SCENE_PRESENTATIONS = new Map(
    [new FarmScenePresentation()].map((presentation) => [presentation.id, presentation]),
);
export function scenePresentation(scene) {
    const PRESENTATION = SCENE_PRESENTATIONS.get(scene);
    if (!PRESENTATION) {
        throw new Error('Missing scene presentation for ' + scene);
    }
    return PRESENTATION;
}
