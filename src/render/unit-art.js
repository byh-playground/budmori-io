import { labRequested } from '../debug/lab.js';

// The single code setting for body art: 'vector' (native GameKit vectors) or 'sprite' (a baked atlas). It chooses
// presentation only, never game state. Startup progress (src/startup-loading.js) reads it before the game loads to
// know whether the atlas stages run.
export const UNIT_ART = 'vector';

// Help frames and the scene lab keep native vectors instead of preparing a whole atlas.
export function unitArtMode(search) {
    if (!['vector', 'sprite'].includes(UNIT_ART)) {
        throw new TypeError('UNIT_ART must be vector or sprite');
    }
    return new URLSearchParams(search).has('help') || labRequested(search) ? 'previewVector' : UNIT_ART;
}
