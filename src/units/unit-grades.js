// One catalog drives merge costs, supported tiers, stat transitions, and the
// historical grade outline palette.
export const UNIT_GRADES = Object.freeze([
    Object.freeze({
        tier: 1,
        name: 'Common',
        materialCost: 0,
        outlineColor: '#d8d4bd',
    }),
    Object.freeze({
        tier: 2,
        name: 'Uncommon',
        materialCost: 2,
        outlineColor: '#83ce76',
    }),
    Object.freeze({
        tier: 3,
        name: 'Rare',
        materialCost: 2,
        outlineColor: '#78b9ff',
    }),
    Object.freeze({
        tier: 4,
        name: 'Epic',
        materialCost: 3,
        outlineColor: '#bd8cff',
    }),
    Object.freeze({
        tier: 5,
        name: 'Legendary',
        materialCost: 4,
        outlineColor: '#ffb354',
    }),
    Object.freeze({
        tier: 6,
        name: 'Mythic',
        materialCost: 5,
        outlineColor: '#ff7086',
    }),
]);
export const MAX_UNIT_TIER = UNIT_GRADES.length;
export const MAX_GRADE_MATERIAL_COUNT = Math.max(...UNIT_GRADES.map((grade) => grade.materialCost));
export function mergeMaterialCostForTier(resultTier) {
    if (!Number.isInteger(resultTier) || resultTier < 2 || resultTier > MAX_UNIT_TIER) {
        return 0;
    }
    return UNIT_GRADES[resultTier - 1].materialCost;
}
