import { createAbilityProgressionState } from '../abilities/ability-state.js';
import { SPECIES_ABILITY_DEFINITIONS } from '../abilities/ability-definitions.js';
import { growthForAbility } from '../features/species-growth/state.js';

// 공격 형태는 합성 등급이 정한다. 숙련·투자 없이 진화 노드만 모두 열린 고정 빌드를 읽기 전용으로 둔다.
const AUTO_MASTERY_LEVEL = 30;
function freezeBuild(build) {
    Object.freeze(build.nodeRanks);
    if (build.branchLevels) {
        Object.freeze(build.branchLevels);
    }
    return Object.freeze(build);
}
function createAutoFormProgression() {
    const STATE = createAbilityProgressionState();
    for (const DEFINITION of SPECIES_ABILITY_DEFINITIONS) {
        const GROWTH = growthForAbility(DEFINITION.id),
            BUILD = STATE.abilities[DEFINITION.id];
        if (GROWTH) {
            BUILD.masteryLevel = AUTO_MASTERY_LEVEL;
            for (const NODE of GROWTH.definition.nodes) {
                if (NODE.kind === 'evolution') {
                    BUILD.nodeRanks[NODE.id] = 1;
                }
            }
        }
        freezeBuild(BUILD);
    }
    Object.freeze(STATE.abilities);
    return Object.freeze(STATE);
}
export const AUTO_FORM_PROGRESSION = createAutoFormProgression();
// 보스와 적은 투자 없는 1등급 빌드를 쓴다.
export const NEUTRAL_FORM_PROGRESSION = (() => {
    const STATE = createAbilityProgressionState();
    for (const BUILD of Object.values(STATE.abilities)) {
        freezeBuild(BUILD);
    }
    Object.freeze(STATE.abilities);
    return Object.freeze(STATE);
})();
