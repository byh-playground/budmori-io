import { ABILITIES } from '../../../i18n/messages/abilities.js';
export class ChestnutThornsPresentation {
    label(_definition, value) {
        return ABILITIES.chestnutThornsLabel({ value });
    }
    title(value) {
        return ABILITIES.chestnutThornsTitle({ value });
    }
}
