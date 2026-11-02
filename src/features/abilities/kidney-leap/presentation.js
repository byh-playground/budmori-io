import { ABILITIES } from '../../../i18n/messages/abilities.js';
export class KidneyLeapPresentation {
    label(_definition, value) {
        return ABILITIES.kidneyLeapLabel({ value });
    }
    title(value) {
        return ABILITIES.kidneyLeapTitle({ value });
    }
}
