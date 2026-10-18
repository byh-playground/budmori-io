export class ChestnutThornsPresentation {
    label(_definition, value) {
        return `3초마다 가시 ${value}발 · 발당 공격력 100% · 0.1초 간격`;
    }
    title(value) {
        return `가시 ${value}발`;
    }
}
