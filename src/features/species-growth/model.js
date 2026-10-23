import { masteryXpForNextLevel } from '../../ability-state.js';
import { SPECIES_MASTERY_CAP } from './definition.js';

// Activated builds replace legacy investments, rather than running both trees at once.
// The enclosing player/save owner retains receipts, performs schema dispatch and commits this result atomically.
export class SpeciesGrowth {
    constructor(definition) {
        this.definition = definition;
        this.nodes = new Map(definition.nodes.map((node) => [node.id, node]));
    }

    createBuild() {
        return { masteryLevel: 1, masteryXp: 0, nodeRanks: {} };
    }

    investedPoints(build) {
        return Object.entries(build.nodeRanks).reduce(
            (total, [id, rank]) => total + rank * (this.nodes.get(id)?.pointCost ?? NaN),
            0,
        );
    }

    pointsLeft(build) {
        return Math.min(SPECIES_MASTERY_CAP, build.masteryLevel) - this.investedPoints(build);
    }

    isValidBuild(build) {
        if (
            !build ||
            !Number.isSafeInteger(build.masteryLevel) ||
            build.masteryLevel < 1 ||
            build.masteryLevel > SPECIES_MASTERY_CAP ||
            !Number.isFinite(build.masteryXp) ||
            build.masteryXp < 0 ||
            (build.masteryLevel < SPECIES_MASTERY_CAP &&
                build.masteryXp >= masteryXpForNextLevel(build.masteryLevel)) ||
            !build.nodeRanks ||
            typeof build.nodeRanks !== 'object' ||
            Array.isArray(build.nodeRanks) ||
            Object.keys(build).some((key) => !['masteryLevel', 'masteryXp', 'nodeRanks', 'legacyMastery'].includes(key))
        ) {
            return false;
        }
        if (build.legacyMastery !== undefined && !validLegacyMastery(build.legacyMastery)) {
            return false;
        }
        for (const [ID, RANK] of Object.entries(build.nodeRanks)) {
            const NODE = this.nodes.get(ID);
            if (
                !NODE ||
                !Number.isSafeInteger(RANK) ||
                RANK < 0 ||
                RANK > NODE.maxRank ||
                (RANK > 0 && (!this.definition.available || !NODE.available)) ||
                (RANK > 0 && build.masteryLevel < NODE.unlockLevels[RANK - 1]) ||
                (RANK > 0 && NODE.prerequisite && build.nodeRanks[NODE.prerequisite] !== 1)
            ) {
                return false;
            }
        }
        return this.pointsLeft(build) >= 0;
    }

    // Call only after validating the complete legacy save. No reward increment is persisted:
    // entitlement is derived from level, so reloading cannot add the starting point again.
    migrateBuild(legacy) {
        if (!this.definition.available) {
            return legacy;
        }
        if (Object.hasOwn(legacy, 'nodeRanks')) {
            if (!this.isValidBuild(legacy)) {
                throw new TypeError('Invalid species growth build');
            }
            return structuredClone(legacy);
        }
        if (!validLegacyMastery(legacy)) {
            throw new TypeError('Invalid legacy mastery');
        }
        const BUILD = {
            masteryLevel: Math.min(SPECIES_MASTERY_CAP, legacy.masteryLevel),
            masteryXp: legacy.masteryXp,
            nodeRanks: {},
        };
        // Older above-cap levels encode earned XP too. Preserve the original level/remainder verbatim
        // instead of summing a huge exponential series (which could overflow or lose precision).
        if (legacy.masteryLevel > SPECIES_MASTERY_CAP) {
            BUILD.legacyMastery = { masteryLevel: legacy.masteryLevel, masteryXp: legacy.masteryXp };
            BUILD.masteryXp = 0;
        }
        return BUILD;
    }

    awardXp(build, amount) {
        if (!this.isValidBuild(build) || !Number.isFinite(amount) || amount < 0 || amount >= 1e13) {
            return { ok: false, reason: 'invalid-xp', build };
        }
        let experience = build.masteryXp + amount;
        if (!Number.isFinite(experience)) {
            return { ok: false, reason: 'xp-overflow', build };
        }
        let level = build.masteryLevel;
        while (level < SPECIES_MASTERY_CAP && experience >= masteryXpForNextLevel(level)) {
            experience -= masteryXpForNextLevel(level);
            level += 1;
        }
        return {
            ok: true,
            build: { ...structuredClone(build), masteryLevel: level, masteryXp: experience },
            levelsGained: level - build.masteryLevel,
            pointsAwarded: level - build.masteryLevel,
        };
    }

    canPurchase(build, nodeId, context = {}) {
        if (!this.definition.available) {
            return { allowed: false, reason: 'not-available' };
        }
        if (!this.isValidBuild(build)) {
            return { allowed: false, reason: 'invalid-state' };
        }
        const LOCK = growthLockReason(context);
        if (LOCK) {
            return { allowed: false, reason: LOCK };
        }
        const NODE = this.nodes.get(nodeId);
        if (!NODE || !NODE.available) {
            return { allowed: false, reason: NODE ? 'not-available' : 'unknown-node' };
        }
        const RANK = build.nodeRanks[nodeId] || 0;
        if (RANK >= NODE.maxRank) {
            return { allowed: false, reason: 'max-rank' };
        }
        if (NODE.prerequisite && build.nodeRanks[NODE.prerequisite] !== 1) {
            return { allowed: false, reason: 'prerequisite-required' };
        }
        if (build.masteryLevel < NODE.unlockLevels[RANK]) {
            return { allowed: false, reason: 'mastery-required', requiredLevel: NODE.unlockLevels[RANK] };
        }
        if (this.pointsLeft(build) < NODE.pointCost) {
            return { allowed: false, reason: 'insufficient-points' };
        }
        return { allowed: true, reason: null, pointCost: NODE.pointCost };
    }

    purchase(build, nodeId, context = {}) {
        const CHECK = this.canPurchase(build, nodeId, context);
        if (!CHECK.allowed) {
            return { ok: false, reason: CHECK.reason, build };
        }
        const NEXT = structuredClone(build);
        NEXT.nodeRanks[nodeId] = (NEXT.nodeRanks[nodeId] || 0) + 1;
        return { ok: true, build: NEXT, spent: CHECK.pointCost };
    }

    reset(build, context = {}) {
        const REASON = !this.definition.available
            ? 'not-available'
            : !this.isValidBuild(build)
              ? 'invalid-state'
              : growthLockReason(context);
        if (REASON) {
            return { ok: false, reason: REASON, build };
        }
        return {
            ok: true,
            build: { ...structuredClone(build), nodeRanks: {} },
            refunded: this.investedPoints(build),
        };
    }

    // Research never gates merging. The physical grade, not mastery level, bounds the attack form.
    attackTier(build, unitTier) {
        if (!Number.isInteger(unitTier) || unitTier < 1 || unitTier > 6) {
            throw new RangeError('Invalid unit tier');
        }
        if (!this.definition.available) {
            return 1;
        }
        if (!this.isValidBuild(build)) {
            throw new TypeError('Invalid species growth build');
        }
        let tier = 1;
        for (const NODE of this.definition.nodes) {
            if (NODE.kind === 'evolution' && NODE.tier <= unitTier && build.nodeRanks[NODE.id] === 1) {
                tier = Math.max(tier, NODE.tier);
            }
        }
        return tier;
    }
}

function validLegacyMastery(build) {
    return (
        build &&
        Number.isSafeInteger(build.masteryLevel) &&
        build.masteryLevel >= 1 &&
        Number.isFinite(build.masteryXp) &&
        build.masteryXp >= 0 &&
        build.masteryXp < masteryXpForNextLevel(build.masteryLevel)
    );
}

function growthLockReason(context) {
    if (context.inCombat === true || context.runActive === true) {
        return 'combat-lock';
    }
    return context.location === 'farm' ? null : 'farm-only';
}
