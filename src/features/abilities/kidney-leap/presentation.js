export class KidneyLeapPresentation {
    label(_definition, value) {
        return `가까운 적에게 도약 · 착지 후 도약 재사용 ${Math.round(value * 100)}% 확률`;
    }
    title(value) {
        return `재사용 ${Math.round(value * 100)}%`;
    }
}
