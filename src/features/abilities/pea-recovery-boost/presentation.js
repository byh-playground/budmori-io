export class PeaRecoveryBoostPresentation {
    label(_definition, value) {
        return `적에게 밀려난 뒤 2초 이동 속도 +${Math.round(value * 100)}%`;
    }
    title(value) {
        return `빠른 복귀 +${Math.round(value * 100)}%`;
    }
}
