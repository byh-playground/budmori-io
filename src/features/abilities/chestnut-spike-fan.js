// This feature owns its catalog definition and pure text presentation.
// Formatting receives domain values; it imports no DOM or renderer adapters.
class ChestnutSpikeFanPresentation {
    label(definition, value) {
        return `목표 방향 부채꼴 ${Math.round((definition.fanSpreadRadians * 180) / Math.PI)}° ${value}발 · 발당 공격력 ×${definition.projectileAttackMultiplier} · 기본 공격 ${definition.intervalBasicCycles}주기마다`;
    }
    title(value) {
        return `가시 ${value}발`;
    }
}

export const CHESTNUT_SPIKE_FAN_FEATURE = Object.freeze({
    definition: Object.freeze({
        id: 'chestnut-spike-fan',
        species: 3,
        name: '밤톨 가시 부채',
        description: '목표를 향해 부채꼴 가시를 발사해요.',
        rootTier: 3,
        powerValues: Object.freeze([3, 5, 7]),
        projectileAttackMultiplier: 0.5,
        fanSpreadRadians: Math.PI / 2,
        intervalBasicCycles: 4,
        gradeThresholds: Object.freeze([3, 2, 1]),
    }),
    presentation: Object.freeze(new ChestnutSpikeFanPresentation()),
});
