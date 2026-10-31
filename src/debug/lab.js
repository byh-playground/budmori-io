// The only door into the temporary scene lab. The game team's debug module is meant to replace this one:
// keep these two exports and nothing else in the game needs to change.
//   labRequested(search) -> true when the URL asks for a debug scene (`?lab=...`)
//   labScene(search)     -> a help-compatible scene { id, seed, rate, durationMs, timeline, setup(world), step(world), auto? }
//                           or null; the game plays it exactly like a help card (same clock, renderer, rules).
import { createLabScene } from './scene-lab.js';

export function labRequested(search) {
    return new URLSearchParams(search).has('lab');
}
export function labScene(search) {
    return labRequested(search) ? createLabScene(new URLSearchParams(search).get('lab')) : null;
}
