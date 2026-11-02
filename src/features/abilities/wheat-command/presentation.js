import { ABILITIES } from '../../../i18n/messages/abilities.js';
export class WheatCommandPresentation {
    label(_definition, value) {
        const BONUS = value * 100,
            BONUS_LABEL = Number.isInteger(BONUS) ? BONUS : BONUS.toFixed(1);
        return ABILITIES.wheatCommandBonus({ bonus: BONUS_LABEL });
    }
    title(value) {
        const BONUS = value * 100,
            BONUS_LABEL = Number.isInteger(BONUS) ? BONUS : BONUS.toFixed(1);
        return ABILITIES.wheatCommandBonus({ bonus: BONUS_LABEL });
    }
    branchLabel(_definition, branchId, value) {
        return branchId === 'range' ? ABILITIES.wheatCommandRangeLabel({ value }) : `${branchId} ${value}`;
    }
    branchTitle(_definition, branchId, value) {
        return branchId === 'range' ? ABILITIES.wheatCommandRangeTitle({ value }) : `${branchId} ${value}`;
    }
}
