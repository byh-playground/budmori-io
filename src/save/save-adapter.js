import { labRequested } from '../debug/lab.js';

// Help cards (`?help=`), the scene lab (`?lab=`) and the showcase demo (`?showcaseDemo=1`) run this same page.
// They are isolated scenes: whatever they do, the player's save must stay byte for byte as it was.
export function isolatedPage(search) {
    const PARAMS = new URLSearchParams(search);
    return PARAMS.has('help') || labRequested(search) || PARAMS.get('showcaseDemo') === '1';
}
// Opens a gamekit save on this page's storage: the browser's localStorage for play, memory for an isolated scene.
export function saveOpener(search) {
    const SAVE = globalThis.BloomGamekitSave,
        ISOLATED = isolatedPage(search);
    return (options) =>
        SAVE.createSave({ ...options, adapter: ISOLATED ? SAVE.memoryAdapter() : SAVE.localStorageAdapter() });
}
