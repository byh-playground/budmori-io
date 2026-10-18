export class WheatCommandPresentation {
    label(_definition, value) {
        const BONUS = value * 100,
            BONUS_LABEL = Number.isInteger(BONUS) ? BONUS : BONUS.toFixed(1);
        return `공격 속도 보너스 +${BONUS_LABEL}%`;
    }
    title(value) {
        const BONUS = value * 100,
            BONUS_LABEL = Number.isInteger(BONUS) ? BONUS : BONUS.toFixed(1);
        return `공격 속도 보너스 +${BONUS_LABEL}%`;
    }
    branchLabel(_definition, branchId, value) {
        return branchId === 'range' ? `주변 기본 공격 사거리 ×${value}` : `${branchId} ${value}`;
    }
    branchTitle(_definition, branchId, value) {
        return branchId === 'range' ? `범위 ×${value}` : `${branchId} ${value}`;
    }
}
