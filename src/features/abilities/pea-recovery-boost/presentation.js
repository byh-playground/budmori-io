export class PeaRecoveryBoostPresentation {
    label(_definition, value) {
        return `강제 이동 후 2초 이동 속도 +${Math.round(value * 100)}%`;
    }
    title(value) {
        return `회복 기동 +${Math.round(value * 100)}%`;
    }
}
