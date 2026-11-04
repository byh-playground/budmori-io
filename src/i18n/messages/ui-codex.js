import { LOCALE } from '../locale.js';

// Codex dialog (src/ui/codex-dialog.js): tabs, recipe list and the discovery grids.
export const CODEX = LOCALE.messages({
    tabRecipes: { ko: '조합식', en: 'Recipes' },
    tabForms: { ko: '성향', en: 'Temperaments' },
    tabColors: { ko: '속성', en: 'Elements' },
    helpRecipes: { ko: '조합 설명 보기', en: 'Show how combining works' },
    helpTemperament: { ko: '성향별 능력치 변화 보기', en: 'Show stat changes by temperament' },
    helpElement: { ko: '속성 상성표 보기', en: 'Show the element chart' },
    temperamentHelpIntro: {
        ko: '성향마다 능력치 하나는 오르고 다른 하나는 내려가요.',
        en: 'Each temperament raises one stat and lowers another.',
    },
    tiltRegen: { ko: '체력 재생 초당 최대 체력의 +1%', en: 'HP regen +1% of max HP per second' },
    elementHelpIntro: {
        ko: '속성 병력은 타격마다 피해의 절반이 속성 피해로 더해져요. 표는 그 속성 피해에 곱해지는 배율이에요(행은 공격, 열은 맞는 쪽). 무속성 병력은 더해지지 않아요.',
        en: 'An element troop adds half of each hit as element damage. The chart shows the multiplier on that element damage (rows attack, columns are hit). Plain troops add none.',
    },
    elementHelpTotal: {
        ko: '그래서 한 번 때릴 때 합계는 유리하면 피해의 200%, 보통이면 150%, 불리하면 125%예요.',
        en: 'So one hit totals 200% of its damage on an advantage, 150% on an even match and 125% on a disadvantage.',
    },
    elementHelpAttack: { ko: '공격', en: 'Attack' },
    elementHelpPlain: { ko: '무속성', en: 'Plain' },
    elementHelpBoss: {
        ko: '보스의 속성 공격은 전부 속성 피해예요. 상성에 따라 ×2·×1·×0.5로 들어오고, 무속성 병력은 항상 ×1.5를 맞아요.',
        en: 'A boss’s element hits are all element damage. They land at ×2, ×1 or ×0.5 by the chart, and plain troops always take ×1.5.',
    },
    undiscovered: { ko: '미발견', en: 'Undiscovered' },
    selected: { ko: '선택됨', en: 'Selected' },
    recipeFound: { ko: '조합 발견', en: 'Combination found' },
    recipeUnknown: { ko: '조합 미확인', en: 'Combination not found yet' },
    owned: {
        ko: ({ count }) => `현재 보유 ${count}마리`,
        en: ({ count }) => `Owned: ${LOCALE.number(count)}`,
    },
    noRecipes: { ko: '이 병종을 재료로 쓰는 조합은 없어요.', en: 'No combination uses this species.' },
    recipesIntro: {
        ko: '발견한 병종을 재료로 쓰는 조합이에요. 미발견 병종은 실루엣으로 보여요. 보유 수는 새싹을 제외한 전체 등급 합계예요.',
        en: 'Combinations that use the species you’ve discovered. Undiscovered species show as silhouettes. Owned counts add up every tier, not counting sprouts.',
    },
    recipesHowTo: {
        ko: '조합식을 고른 뒤 조합 버튼을 누르세요. 각 재료 병종은 번식을 위해 최소 2마리를 남겨요(전체 등급 합산). 남겨둘 2마리를 제외한 여유 유닛 중 같은 등급의 성체를 각 병종에서 1마리씩 조합해요.',
        en: 'Pick a recipe, then press Combine. Each ingredient species keeps at least 2 for breeding (all tiers counted). From the spare units beyond those 2, one adult of the same tier from each species is combined.',
    },
    recipesEmpty: {
        ko: '병종을 발견하면 활용할 수 있는 조합이 여기에 나타나요.',
        en: 'Discover species and the combinations you can use will appear here.',
    },
    formsGrid: { ko: '성향 도감', en: 'Temperament codex' },
    colorsGrid: { ko: '속성 도감', en: 'Element codex' },
});
