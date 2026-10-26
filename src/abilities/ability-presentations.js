import { PeaRecoveryBoostPresentation } from '../features/abilities/pea-recovery-boost/presentation.js';
import { KidneyLeapPresentation } from '../features/abilities/kidney-leap/presentation.js';
import { ChestnutThornsPresentation } from '../features/abilities/chestnut-thorns/presentation.js';
import { PeanutDeathSplitPresentation } from '../features/abilities/peanut-death-split/presentation.js';
import { WalnutRawGuardPresentation } from '../features/abilities/walnut-raw-guard/presentation.js';
import { CornAttachmentPresentation } from '../features/abilities/corn-attachment/presentation.js';
import { RiceCriticalPresentation } from '../features/abilities/rice-critical/presentation.js';
import { WheatCommandPresentation } from '../features/abilities/wheat-command/presentation.js';
import { BarleyArmorShredPresentation } from '../features/abilities/barley-shred/presentation.js';

export const ABILITY_PRESENTATION_OVERRIDES = new Map([
    ['pea-recovery-boost', Object.freeze(new PeaRecoveryBoostPresentation())],
    ['kidney-continuous-leap', Object.freeze(new KidneyLeapPresentation())],
    ['chestnut-target-thorns', Object.freeze(new ChestnutThornsPresentation())],
    ['peanut-death-split', Object.freeze(new PeanutDeathSplitPresentation())],
    ['walnut-raw-guard', Object.freeze(new WalnutRawGuardPresentation())],
    ['corn-kernel-chain', Object.freeze(new CornAttachmentPresentation())],
    ['rice-low-health-harvest', Object.freeze(new RiceCriticalPresentation())],
    ['wheat-command-crit', Object.freeze(new WheatCommandPresentation())],
    ['barley-armor-break', Object.freeze(new BarleyArmorShredPresentation())],
]);
