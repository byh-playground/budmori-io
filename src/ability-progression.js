import { SPECIES_ABILITY_DEFINITIONS } from './ability-catalog.js';
import { isValidAbilityProgressionState } from './ability-state.js';
import { isValidPlayerProgressionState } from './player-progression.js';
import { FARM_UPGRADE_MAX_LEVELS, FARM_UPGRADE_NODES } from './farm-upgrades.js';

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
export function getAbilityGradeLevel(state, abilityId) {
    return abilityStateFor(state, abilityId)?.gradeLevel || 0;
}
export function getMinimumApplicableTier(state, abilityId) {
    const DEFINITION = DEFINITION_BY_ID.get(abilityId);
    if (!DEFINITION) {
        return null;
    }
    const GRADE_LEVEL = getAbilityGradeLevel(state, abilityId);
    return DEFINITION.gradeThresholds[Math.min(GRADE_LEVEL, DEFINITION.gradeThresholds.length - 1)];
}
export function isAbilityActive(state, abilityId, unitTier) {
    const INVESTMENT = abilityStateFor(state, abilityId);
    const MINIMUM_TIER = getMinimumApplicableTier(state, abilityId);
    return !!INVESTMENT?.rootUnlocked && Number.isInteger(unitTier) && unitTier >= MINIMUM_TIER;
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
    };
}
export function getInvestedPointCount(state) {
    if (!isValidAbilityProgressionState(state)) {
        return 0;
    }
    return Object.values(state.abilities).reduce(
        (total, investment) => total + Number(investment.rootUnlocked) + investment.powerLevel + investment.gradeLevel,
        0,
    );
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
    if (!NODE) {
        return {
            allowed: false,
            reason: 'unknown-node',
        };
    }
    if (NODE.kind === 'root') {
        if (INVESTMENT.rootUnlocked) {
            return {
                allowed: false,
                reason: 'already-invested',
            };
        }
        const HIGHEST_TIER = context.highestSpeciesTier?.[DEFINITION.species] ?? context.highestSpeciesTier ?? 0;
        if (!Number.isInteger(HIGHEST_TIER) || HIGHEST_TIER < DEFINITION.rootTier) {
            return {
                allowed: false,
                reason: 'requires-rare-tier',
            };
        }
    } else {
        if (!INVESTMENT.rootUnlocked) {
            return {
                allowed: false,
                reason: 'root-required',
            };
        }
        const CURRENT_LEVEL = NODE.kind === 'power' ? INVESTMENT.powerLevel : INVESTMENT.gradeLevel;
        const MAX_LEVEL =
            NODE.kind === 'power' ? DEFINITION.powerValues.length - 1 : DEFINITION.gradeThresholds.length - 1;
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
    if (NODE.kind === 'root') {
        NEXT.abilities[abilityId].rootUnlocked = true;
    } else if (NODE.kind === 'power') {
        NEXT.abilities[abilityId].powerLevel = NODE.level;
    } else {
        NEXT.abilities[abilityId].gradeLevel = NODE.level;
    }
    return {
        ok: true,
        reason: null,
        state: NEXT,
    };
}
export function canResetAbilityProgression(state, context = {}) {
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
    if (getInvestedPointCount(state) === 0) {
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
export function resetAbilityProgression(state, context = {}) {
    const CHECK = canResetAbilityProgression(state, context);
    if (!CHECK.allowed) {
        return {
            ok: false,
            reason: CHECK.reason,
            state,
        };
    }
    const REFUNDED = getInvestedPointCount(state);
    const NEXT = cloneState(state);
    NEXT.availablePoints += REFUNDED;
    NEXT.abilities = Object.fromEntries(
        SPECIES_ABILITY_DEFINITIONS.map((definition) => [
            definition.id,
            {
                rootUnlocked: false,
                powerLevel: 0,
                gradeLevel: 0,
            },
        ]),
    );
    return {
        ok: true,
        reason: null,
        refunded: REFUNDED,
        state: NEXT,
    };
}
export function canPurchaseFarmUpgrade(state, nodeId, context = {}) {
    const NODE = FARM_UPGRADE_NODES.find((candidate) => candidate.id === nodeId);
    if (!NODE) {
        return {
            allowed: false,
            reason: 'unknown-node',
        };
    }
    if (!isValidPlayerProgressionState(state)) {
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
    if (state.farmUpgrades[nodeId] >= FARM_UPGRADE_MAX_LEVELS[nodeId]) {
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
export function purchaseFarmUpgrade(state, nodeId, context = {}) {
    const CHECK = canPurchaseFarmUpgrade(state, nodeId, context);
    if (!CHECK.allowed) {
        return {
            ok: false,
            reason: CHECK.reason,
            state,
        };
    }
    const NEXT = cloneState(state);
    NEXT.availablePoints -= SHARED_ABILITY_POINT_COST;
    NEXT.farmUpgrades[nodeId] += 1;
    return {
        ok: true,
        reason: null,
        state: NEXT,
    };
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
    const INVESTMENT = state?.abilities?.[definition.id] || {
        rootUnlocked: false,
        powerLevel: 0,
        gradeLevel: 0,
    };
    if (NODE.kind === 'root' && INVESTMENT.rootUnlocked) {
        return {
            purchased: true,
            ready: false,
            reason: 'already-invested',
        };
    }
    if (NODE.kind === 'power' && NODE.level <= INVESTMENT.powerLevel) {
        return {
            purchased: true,
            ready: false,
            reason: 'already-invested',
        };
    }
    if (NODE.kind === 'grade' && NODE.level <= INVESTMENT.gradeLevel) {
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
    if (nodeId === 'root') {
        return {
            kind: 'root',
            level: 0,
        };
    }
    const MATCH = /^(power|grade)-(\d+)$/.exec(String(nodeId || ''));
    if (!MATCH) {
        return null;
    }
    return {
        kind: MATCH[1],
        level: Number(MATCH[2]),
    };
}
function cloneState(state) {
    return {
        ...state,
        farmUpgrades: {
            ...state.farmUpgrades,
        },
        abilities: Object.fromEntries(
            Object.entries(state.abilities).map(([id, value]) => [
                id,
                {
                    ...value,
                },
            ]),
        ),
    };
}
function progressionLockReason(context) {
    if (context.location !== 'farm' || context.inCombat === true) {
        return context.inCombat ? 'combat-lock' : 'farm-only';
    }
    return null;
}
