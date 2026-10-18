import { RiceCriticalPresentation } from './features/abilities/rice-critical/presentation.js';
import { BarleyArmorShredPresentation } from './features/abilities/barley-shred/presentation.js';

export const ABILITY_PRESENTATION_OVERRIDES = new Map([
    ['rice-low-health-harvest', Object.freeze(new RiceCriticalPresentation())],
    ['barley-armor-break', Object.freeze(new BarleyArmorShredPresentation())],
]);
