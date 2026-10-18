class WheatCommandPresentation {
    label(_definition, value) {
        const BONUS = value * 100,
            BONUS_LABEL = Number.isInteger(BONUS) ? BONUS : BONUS.toFixed(1);
        return `\uACF5\uACA9 \uC18D\uB3C4 \uBCF4\uB108\uC2A4 +${BONUS_LABEL}%`;
    }
    title(value) {
        const BONUS = value * 100,
            BONUS_LABEL = Number.isInteger(BONUS) ? BONUS : BONUS.toFixed(1);
        return `\uACF5\uACA9 \uC18D\uB3C4 \uBCF4\uB108\uC2A4 +${BONUS_LABEL}%`;
    }
    branchLabel(_definition, branchId, value) {
        return branchId === 'range' ? `밀 기본 공격 사거리 ×${value}` : `${branchId} ${value}`;
    }
    branchTitle(_definition, branchId, value) {
        return branchId === 'range' ? `명령 반경 ×${value}` : `${branchId} ${value}`;
    }
}

export const WHEAT_COMMAND_CRIT_FEATURE = Object.freeze({
    definition: Object.freeze({
        id: 'wheat-command-crit',
        species: 7,
        defaultUnlocked: true,
        name: '밀의 전투 지휘',
        description:
            '기본 공격을 발사할 때 35% 확률로 밀을 중심으로 범위 내 살아 있는 아군에게 3초 동안 공격 속도 효과를 줍니다. 효과는 밀이나 오라 범위를 벗어나도 유지됩니다.',
        rootTier: 1,
        powerValues: Object.freeze([0.5, 0.75, 1.125]),
        durationTicks: 60,
        triggerChance: 0.35,
        branches: Object.freeze({
            range: Object.freeze({
                name: '명령 반경',
                values: Object.freeze([2, 3, 4.5]),
            }),
        }),
        gradeThresholds: Object.freeze([1]),
    }),
    presentation: Object.freeze(new WheatCommandPresentation()),
});
