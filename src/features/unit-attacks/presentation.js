import { BarleyAttackPresentation } from './barley/presentation.js';
import { WheatAttackPresentation, setWheatBatonLength } from './wheat/presentation.js';
import { RiceAttackPresentation } from './rice/presentation.js';
import { WalnutAttackPresentation } from './walnut/presentation.js';
import { ChestnutAttackPresentation } from './chestnut/presentation.js';
import { RedbeanAttackPresentation } from './redbean/presentation.js';
import { UnitAttackPresentation } from './presentation-base.js';
import { PeaAttackPresentation } from './pea/presentation.js';
import { LobPresentation } from './lob/presentation.js';
import { DualStrikePresentation } from './dual-strike/presentation.js';
import { ATTACK_TYPES, clamp } from '../../model/farm-model.js';

const BARLEY_ATTACK = new BarleyAttackPresentation();
const WHEAT_ATTACK = new WheatAttackPresentation();
const RICE_ATTACK = new RiceAttackPresentation();
const WALNUT_ATTACK = new WalnutAttackPresentation();
const CHESTNUT_ATTACK = new ChestnutAttackPresentation();
const REDBEAN_ATTACK = new RedbeanAttackPresentation();
const PEA_ATTACK = new PeaAttackPresentation();
const DEFAULT_ATTACK = new UnitAttackPresentation();
const ATTACK_PRESENTATIONS = new Map(
    [new DualStrikePresentation(), new LobPresentation()].map((presentation) => [presentation.id, presentation]),
);
export function unitAttackPresentation(unit) {
    // The growing stage wears sprout art while retaining its eventual species.
    // Use that art's common phase clips and elapsed clock, never mature weapon
    // stages, normalized phase clocks or species-specific pose offsets.
    if (unit.isSeedling) {
        return DEFAULT_ATTACK;
    }
    if (unit.species === 8 && unit.ability?.barleyForm) {
        return BARLEY_ATTACK;
    }
    if (unit.species === 7 && unit.ability?.wheatForm) {
        return WHEAT_ATTACK;
    }
    if (unit.species === 6 && unit.ability?.riceForm) {
        return RICE_ATTACK;
    }
    if (unit.species === 5 && unit.ability?.walnutForm) {
        return WALNUT_ATTACK;
    }
    if (unit.species === 3 && unit.ability?.chestnutForm) {
        return CHESTNUT_ATTACK;
    }
    if (unit.species === 2 && unit.ability?.redbeanForm) {
        return REDBEAN_ATTACK;
    }
    if (unit.species === 0 && unit.ability?.peaForm) {
        return PEA_ATTACK;
    }
    return ATTACK_PRESENTATIONS.get(ATTACK_TYPES[unit.species]?.kind) || DEFAULT_ATTACK;
}

export function motionElapsedMs(u, name, clip) {
    if (name === 'idle' || name === 'walk' || name === 'airborne') {
        return ((u.seed || 0) * 80) % clip.durationMs;
    }
    if (
        name === 'windup' ||
        name.startsWith('windup-') ||
        name === 'fire' ||
        name.startsWith('fire-') ||
        name === 'recover'
    ) {
        return clamp((u.ability?.elapsed || 0) * 1000, 0, clip.durationMs);
    }
    if (name === 'hit') {
        return clip.durationMs * (1 - clamp((u.stun || 0) / 0.5, 0, 1));
    }
    if (name === 'landing') {
        return clip.durationMs * (1 - clamp((u.bounce || 0) / 0.22, 0, 1));
    }
    if (name === 'victory') {
        return (Math.abs(u.seed || 0) * 97.531) % clip.durationMs;
    }
    return clip.durationMs;
}
export function unitAttackMotion(unit) {
    const ATTACK = unitAttackPresentation(unit);
    if (unit.ability?.phase === 'windup') {
        return ATTACK.windupMotion?.(unit) || 'windup';
    }
    if (unit.ability?.phase === 'active') {
        return ATTACK.activeMotion(unit);
    }
    if (unit.ability?.phase === 'recover') {
        return ATTACK.recoverMotion(unit);
    }
    return null;
}

// Health/rest/victory belong to the caller; living combat motion and face are
// shared, including the airborne/redbean and grounded recovery priorities.
export function unitCombatMotion(unit) {
    if (!unit.dropLanded || unit.z > 0.1) {
        return 'airborne';
    }
    if (unit.stun > 0) {
        return 'hit';
    }
    if (unit.bounce > 0.04) {
        return 'landing';
    }
    return unitAttackMotion(unit);
}
export function unitCombatExpression(unit) {
    if (unit.stun > 0) {
        return 'hurt';
    }
    if (!unit.dropLanded || unit.z > 0.5) {
        return 'surprised';
    }
    if (unit.walnutGuarding && !unit.isSeedling) {
        return unit.ability?.walnutForm && unitAttackMotion(unit) ? 'guard-attack' : 'guard';
    }
    return unit.ability?.phase === 'windup' ? 'focused' : unit.ability?.phase === 'active' ? 'attack' : null;
}

export function prepareUnitAttackPlayer(player, unit) {
    if (unit.species === 7) {
        setWheatBatonLength(player, unit.ability.wheatLongBaton);
    }
}

export function applyUnitAttackPose(matrix, unit, ground) {
    if (unit.hp <= 0 || unit.stun > 0) {
        return;
    }
    const ATTACK = unitAttackPresentation(unit);
    if (unit.species === 0) {
        if (unit.dropLanded && unit.z === 0) {
            ATTACK.applyGroundedPose?.(matrix, unit, ground);
        }
    } else if ((unit.species !== 2 && unit.species !== 3) || unit.dropLanded) {
        ATTACK.applyPose?.(matrix, unit, ground);
    }
}

export function drawUnitAttackGround(renderer, unit) {
    if (unit.species === 5) {
        if (unit.walnutGuarding && unit.ability.walnutForm) {
            renderer.ring(unit.x, unit.y, unit.radius + 0.08, '#ebcc7a', 0.055);
        }
        WALNUT_ATTACK.drawContact(renderer, unit);
    }
}
export function drawUnitAttackContact(renderer, unit, player, matrix) {
    // Invoke even after an action clears so the native player's short trail is
    // discarded on cancellation, death, or leaving a weapon clip.
    const ATTACK =
        unit.species === 6
            ? RICE_ATTACK
            : unit.species === 7
              ? WHEAT_ATTACK
              : unit.species === 8
                ? BARLEY_ATTACK
                : null;
    ATTACK?.drawContact(renderer, unit, player, matrix);
}

// Reuse the same short release-to-ground easing for either actor role. The
// scratch owns only display offsets; action timing and contact stay in the DTO.
export function updateUnitAttackDisplay(renderer, entry, unit, time, record, enabled = true) {
    const OFFSET = enabled ? unitAttackPresentation(unit).groundOffset?.(renderer, unit, time, record) : null;
    if (OFFSET) {
        entry.offset = OFFSET;
        entry.releasedAt = null;
    } else {
        entry.releasedAt ??= renderer.displayTimeMs;
    }
    const LEFT = entry.releasedAt === null ? 1 : Math.max(0, 1 - (renderer.displayTimeMs - entry.releasedAt) / 120);
    Object.assign(entry.unit, unit, { x: unit.x + entry.offset.x * LEFT, y: unit.y + entry.offset.y * LEFT });
    return entry.unit;
}
