import { ABILITIES } from '../../../i18n/messages/abilities.js';
export class PeaRecoveryBoostPresentation {
    label(_definition, value) {
        return ABILITIES.peaRecoveryBoostLabel({ value });
    }
    title(value) {
        return ABILITIES.peaRecoveryBoostTitle({ value });
    }
}
