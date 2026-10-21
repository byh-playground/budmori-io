import { SPECIES_ABILITY_DEFINITIONS } from './ability-definitions.js';
import { isValidAbilityProgressionState } from './ability-state.js';
import { isValidPlayerProgressionState } from './player-progression.js';
import { createFormationSkillState, formationInvestedPoints } from './formation-skill-state.js';

// Progression rules are shared by simulation commands and UI queries.
// This module never imports presentation code or reads the DOM.
export const SHARED_ABILITY_POINT_COST = 1;
const DEFINITION_BY_ID = new Map(SPECIES_ABILITY_DEFINITIONS.map((definition) => [definition.id, definition]));
export function abilityStateFor(state, abilityId) {
    if (!DEFINITION_BY_ID.has(abilityId) || !state?.abilities?.[abilityId]) {
        return null;
    }
    return state.abilities[abilityId];
}
export function getAbilityPowerLevel(state, abilityId) {
    return abilityStateFor(state, abilityId)?.powerLevel || 0;
}
export function getAbilityBranchLevel(state, abilityId, branchId) {
    return abilityStateFor(state, abilityId)?.branchLevels?.[branchId] || 0;
}
export function getMinimumApplicableTier(_state, abilityId) {
    const DEFINITION = DEFINITION_BY_ID.get(abilityId);
    if (!DEFINITION) {
        return null;
    }
    return DEFINITION.minimumTier || 1;
}
export function isAbilityActive(state, abilityId, unitTier) {
    const DEFINITION = DEFINITION_BY_ID.get(abilityId),
        MINIMUM_TIER = getMinimumApplicableTier(state, abilityId);
    return DEFINITION?.availableByDefault === true && Number.isInteger(unitTier) && unitTier >= MINIMUM_TIER;
}
export function powerLevelFor(state, abilityId) {
    return getAbilityPowerLevel(state, abilityId);
}
export function getAbilityEffects(state, abilityId, unitTier) {
    const DEFINITION = DEFINITION_BY_ID.get(abilityId);
    if (!DEFINITION || !isAbilityActive(state, abilityId, unitTier)) {
        return null;
    }
    const LEVEL = getAbilityPowerLevel(state, abilityId);
    return {
        abilityId,
        species: DEFINITION.species,
        unitTier,
        powerLevel: LEVEL,
        value: DEFINITION.powerValues[LEVEL],
        branchLevels: Object.fromEntries(
            Object.keys(DEFINITION.branches || {}).map((branchId) => [
                branchId,
                getAbilityBranchLevel(state, abilityId, branchId),
            ]),
        ),
    };
}
export function getInvestedPointCount(state) {
    return getInvestedAbilityPointCount(state);
}
export function getInvestedAbilityPointCount(state, speciesId = null) {
    if (!isValidAbilityProgressionState(state)) {
        return 0;
    }
    const DEFINITIONS =
        speciesId === null
            ? SPECIES_ABILITY_DEFINITIONS
            : SPECIES_ABILITY_DEFINITIONS.filter((definition) => definition.species === speciesId);
    return DEFINITIONS.reduce((total, definition) => {
        const INVESTMENT = state.abilities[definition.id];
        return (
            total +
            INVESTMENT.powerLevel +
            Object.values(INVESTMENT.branchLevels || {}).reduce((branchTotal, level) => branchTotal + level, 0)
        );
    }, 0);
}
export function canPurchaseAbilityNode(state, abilityId, nodeId, context = {}) {
    const DEFINITION = DEFINITION_BY_ID.get(abilityId);
    if (!DEFINITION) {
        return {
            allowed: false,
            reason: 'unknown-ability',
        };
    }
    if (!isValidAbilityProgressionState(state)) {
        return {
            allowed: false,
            reason: 'invalid-state',
        };
    }
    const LOCK_REASON = progressionLockReason(context);
    if (LOCK_REASON) {
        return {
            allowed: false,
            reason: LOCK_REASON,
        };
    }
    const INVESTMENT = state.abilities[abilityId];
    const NODE = parseNodeId(nodeId);
    if (!NODE || !['power', 'branch'].includes(NODE.kind)) {
        return {
            allowed: false,
            reason: 'unknown-node',
        };
    }
    if (NODE.kind === 'branch' && !DEFINITION.branches?.[NODE.branch]) {
        return {
            allowed: false,
            reason: 'unknown-node',
        };
    }
    const CURRENT_LEVEL = NODE.kind === 'power' ? INVESTMENT.powerLevel : INVESTMENT.branchLevels?.[NODE.branch] || 0,
        MAX_LEVEL =
            NODE.kind === 'power'
                ? DEFINITION.powerValues.length - 1
                : DEFINITION.branches[NODE.branch].values.length - 1;
    if (NODE.level <= CURRENT_LEVEL) {
        return {
            allowed: false,
            reason: 'already-invested',
        };
    }
    if (NODE.level !== CURRENT_LEVEL + 1) {
        return {
            allowed: false,
            reason: 'prerequisite-required',
        };
    }
    if (NODE.level > MAX_LEVEL) {
        return {
            allowed: false,
            reason: 'max-level',
        };
    }
    if (state.availablePoints < SHARED_ABILITY_POINT_COST) {
        return {
            allowed: false,
            reason: 'insufficient-points',
        };
    }
    return {
        allowed: true,
        reason: null,
    };
}
export function purchaseAbilityNode(state, abilityId, nodeId, context = {}) {
    const CHECK = canPurchaseAbilityNode(state, abilityId, nodeId, context);
    if (!CHECK.allowed) {
        return {
            ok: false,
            reason: CHECK.reason,
            state,
        };
    }
    const NODE = parseNodeId(nodeId);
    const NEXT = cloneState(state);
    NEXT.availablePoints -= SHARED_ABILITY_POINT_COST;
    if (NODE.kind === 'power') {
        NEXT.abilities[abilityId].powerLevel = NODE.level;
    } else {
        NEXT.abilities[abilityId].branchLevels[NODE.branch] = NODE.level;
    }
    return {
        ok: true,
        reason: null,
        state: NEXT,
    };
}
export function canResetAbilityProgression(state, context = {}, speciesId = null) {
    if (!isValidAbilityProgressionState(state)) {
        return {
            allowed: false,
            reason: 'invalid-state',
        };
    }
    if (speciesId !== null && !SPECIES_ABILITY_DEFINITIONS.some((definition) => definition.species === speciesId)) {
        return {
            allowed: false,
            reason: 'invalid-scope',
        };
    }
    const LOCK_REASON = progressionLockReason(context);
    if (LOCK_REASON) {
        return {
            allowed: false,
            reason: LOCK_REASON,
        };
    }
    if (getInvestedAbilityPointCount(state, speciesId) === 0) {
        return {
            allowed: false,
            reason: 'nothing-invested',
        };
    }
    return {
        allowed: true,
        reason: null,
    };
}
export function resetAbilityProgression(state, context = {}, speciesId = null) {
    const CHECK = canResetAbilityProgression(state, context, speciesId);
    if (!CHECK.allowed) {
        return {
            ok: false,
            reason: CHECK.reason,
            state,
        };
    }
    const REFUNDED = getInvestedAbilityPointCount(state, speciesId);
    const NEXT = cloneState(state);
    NEXT.availablePoints += REFUNDED;
    for (const DEFINITION of SPECIES_ABILITY_DEFINITIONS) {
        if (speciesId === null || DEFINITION.species === speciesId) {
            NEXT.abilities[DEFINITION.id] = {
                ...emptyAbilityInvestment(DEFINITION),
            };
        }
    }
    return {
        ok: true,
        reason: null,
        refunded: REFUNDED,
        state: NEXT,
    };
}
export function canResetPlayerProgression(state, scope = { type: 'all' }, context = {}) {
    if (!isValidPlayerProgressionState(state)) {
        return { allowed: false, reason: 'invalid-state', refunded: 0 };
    }
    const NORMALIZED_SCOPE = normalizeResetScope(scope);
    if (!NORMALIZED_SCOPE) {
        return { allowed: false, reason: 'invalid-scope', refunded: 0 };
    }
    const REFUNDED = progressionResetInvestment(state, NORMALIZED_SCOPE);
    const LOCK_REASON = progressionLockReason(context);
    if (LOCK_REASON) {
        return { allowed: false, reason: LOCK_REASON, refunded: REFUNDED };
    }
    if (REFUNDED === 0) {
        return { allowed: false, reason: 'nothing-invested', refunded: 0 };
    }
    return { allowed: true, reason: null, refunded: REFUNDED };
}
export function resetPlayerProgression(state, scope = { type: 'all' }, context = {}) {
    const NORMALIZED_SCOPE = normalizeResetScope(scope),
        CHECK = canResetPlayerProgression(state, NORMALIZED_SCOPE || scope, context);
    if (!CHECK.allowed) {
        return { ok: false, reason: CHECK.reason, refunded: CHECK.refunded, state };
    }
    const NEXT = cloneState(state),
        TYPE = NORMALIZED_SCOPE.type;
    NEXT.availablePoints += CHECK.refunded;
    if (TYPE === 'all' || TYPE === 'abilities') {
        for (const DEFINITION of SPECIES_ABILITY_DEFINITIONS) {
            if (
                TYPE === 'all' ||
                NORMALIZED_SCOPE.speciesId === undefined ||
                DEFINITION.species === NORMALIZED_SCOPE.speciesId
            ) {
                NEXT.abilities[DEFINITION.id] = {
                    ...emptyAbilityInvestment(DEFINITION),
                };
            }
        }
    }
    if (TYPE === 'all' || TYPE === 'formation') {
        NEXT.formationSkills = createFormationSkillState();
    }
    return { ok: true, reason: null, refunded: CHECK.refunded, state: NEXT };
}
function progressionResetInvestment(state, scope) {
    switch (scope.type) {
        case 'all':
            return getInvestedPointCount(state) + formationInvestedPoints(state.formationSkills);
        case 'abilities':
            return getInvestedAbilityPointCount(state, scope.speciesId ?? null);
        case 'formation':
            return formationInvestedPoints(state.formationSkills);
        default:
            return 0;
    }
}
function normalizeResetScope(scope) {
    const NORMALIZED = typeof scope === 'string' ? { type: scope } : scope;
    if (!NORMALIZED || typeof NORMALIZED !== 'object' || Array.isArray(NORMALIZED)) {
        return null;
    }
    if (NORMALIZED.type === 'all' || NORMALIZED.type === 'formation') {
        return NORMALIZED;
    }
    if (NORMALIZED.type === 'abilities') {
        const SPECIES_ID = NORMALIZED.speciesId;
        if (
            SPECIES_ID === undefined ||
            (Number.isInteger(SPECIES_ID) &&
                SPECIES_ABILITY_DEFINITIONS.some((definition) => definition.species === SPECIES_ID))
        ) {
            return NORMALIZED;
        }
    }
    return null;
}
export function getAbilityNodeStatus(state, definition, nodeId, context = {}) {
    const NODE = parseNodeId(nodeId);
    if (!NODE) {
        return {
            purchased: false,
            ready: false,
            reason: 'unknown-node',
        };
    }
    const INVESTMENT = state?.abilities?.[definition.id] || { powerLevel: 0 };
    if (NODE.kind === 'power' && NODE.level <= INVESTMENT.powerLevel) {
        return {
            purchased: true,
            ready: false,
            reason: 'already-invested',
        };
    }
    if (NODE.kind === 'branch' && NODE.level <= (INVESTMENT.branchLevels?.[NODE.branch] || 0)) {
        return {
            purchased: true,
            ready: false,
            reason: 'already-invested',
        };
    }
    const RESULT = canPurchaseAbilityNode(state, definition.id, nodeId, context);
    return {
        purchased: false,
        ready: RESULT.allowed,
        reason: RESULT.reason,
    };
}
function parseNodeId(nodeId) {
    const MATCH = /^(power|branch-[a-z0-9-]+)-(\d+)$/.exec(String(nodeId || ''));
    if (!MATCH) {
        return null;
    }
    return {
        kind: MATCH[1].startsWith('branch-') ? 'branch' : MATCH[1],
        branch: MATCH[1].startsWith('branch-') ? MATCH[1].slice('branch-'.length) : null,
        level: Number(MATCH[2]),
    };
}
function cloneState(state) {
    return {
        ...state,
        abilities: Object.fromEntries(
            Object.entries(state.abilities).map(([id, value]) => [
                id,
                {
                    ...value,
                    ...(DEFINITION_BY_ID.get(id)?.branches
                        ? {
                              branchLevels: Object.fromEntries(
                                  Object.keys(DEFINITION_BY_ID.get(id).branches).map((branchId) => [
                                      branchId,
                                      value.branchLevels?.[branchId] || 0,
                                  ]),
                              ),
                          }
                        : {}),
                },
            ]),
        ),
        ...(state.formationSkills
            ? {
                  formationSkills: {
                      ...state.formationSkills,
                      levels: { ...state.formationSkills.levels },
                      equipped: [...state.formationSkills.equipped],
                  },
              }
            : {}),
    };
}
function emptyAbilityInvestment(definition) {
    return {
        powerLevel: 0,
        ...(definition.branches
            ? {
                  branchLevels: Object.fromEntries(Object.keys(definition.branches).map((branchId) => [branchId, 0])),
              }
            : {}),
    };
}
function progressionLockReason(context) {
    if (context.location !== 'farm' || context.inCombat === true) {
        return context.inCombat ? 'combat-lock' : 'farm-only';
    }
    return null;
}
