import { LOCALE } from '../locale.js';

// Codex dialog (src/ui/codex-dialog.js): tabs, recipe list and the discovery grids.
export const CODEX = LOCALE.messages({
    tabRecipes: { ko: '조합식', en: 'Recipes' },
    tabForms: { ko: '성향', en: 'Temperaments' },
    tabColors: { ko: '속성', en: 'Elements' },
    helpTemperament: { ko: '성향별 능력치 변화 보기', en: 'Show stat changes by temperament' },
    helpElement: { ko: '속성 상성표 보기', en: 'Show the element chart' },
    temperamentHelpIntro: {
        ko: '성향마다 능력치 하나는 오르고 다른 하나는 내려가요.',
        en: 'Each temperament raises one stat and lowers another.',
    },
    tiltRegen: { ko: '체력 재생 초당 최대 체력의 +1%', en: 'HP regen +1% of max HP per second' },
    elementHelpIntro: {
        ko: '행은 공격하는 속성, 열은 맞는 쪽이에요. 숫자는 한 번 때릴 때의 피해 배율이에요. 무속성 병력은 항상 100%예요.',
        en: 'Rows attack, columns are hit. Numbers are the damage multiplier per hit. Plain troops always deal 100%.',
    },
    elementHelpAttack: { ko: '공격', en: 'Attack' },
    elementHelpPlain: { ko: '무속성', en: 'Plain' },
    elementHelpBoss: {
        ko: '보스의 속성 공격은 상성에 따라 200%·100%·50%로 들어와요. 무속성 병력은 항상 150%를 맞아요.',
        en: 'A boss’s element hit lands at 200%, 100% or 50% by the chart. Plain troops always take 150%.',
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
