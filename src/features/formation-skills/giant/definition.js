export const DEFINITION = Object.freeze({
    id: 'giant',
    name: '거대화',
    condition: 'damageDealt',
    required: 200,
    description: '아군 몸집 3배 · 20초 지속 · 공격력 3배 · 방어력 +100.',
    upgradeAxis: '대상 수 3 → 5 → 8 (4레벨부터 8명)',
    upgradeValues: Object.freeze([3, 5, 8]),
    durationSeconds: 20,
});
