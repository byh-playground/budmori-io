export const DEFINITION = Object.freeze({
    id: 'giant',
    name: '거대화',
    condition: 'damageDealt',
    required: 200,
    description: '20초 동안 아군의 몸집과 공격력이 3배가 되고 방어력이 100 올라요.',
    upgradeAxis: '대상 3 → 5 → 8마리 (4레벨부터 8마리)',
    upgradeValues: Object.freeze([3, 5, 8]),
    durationSeconds: 20,
});
