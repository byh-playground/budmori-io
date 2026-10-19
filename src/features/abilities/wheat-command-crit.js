export const WHEAT_COMMAND_CRIT_FEATURE = Object.freeze({
    definition: Object.freeze({
        id: 'wheat-command-crit',
        species: 7,
        availableByDefault: true,
        minimumTier: 1,
        name: '밀의 전투 지휘',
        description:
            '기본 공격을 발사할 때 35% 확률로 밀을 중심으로 범위 내 살아 있는 아군에게 3초 동안 공격 속도 효과를 줘요. 효과는 밀이나 오라 범위를 벗어나도 유지돼요.',
        powerValues: Object.freeze([0.5, 0.75, 1.125]),
        durationTicks: 60,
        triggerChance: 0.35,
        branches: Object.freeze({
            range: Object.freeze({
                name: '명령 반경',
                values: Object.freeze([2, 3, 4.5]),
            }),
        }),
    }),
});
