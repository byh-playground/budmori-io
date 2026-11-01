import { formationDamageBudget } from './formation-damage.js';
import { isBossActorId, isCombatActorId } from '../core/combat-identity.js';
import { DEFINITION as SKILL_0 } from '../features/formation-skills/giant/definition.js';
import { DEFINITION as SKILL_1 } from '../features/formation-skills/lightning/definition.js';
import { DEFINITION as SKILL_2 } from '../features/formation-skills/meteor/definition.js';
import { DEFINITION as SKILL_3 } from '../features/formation-skills/meteor-shower/definition.js';
import { DEFINITION as SKILL_4 } from '../features/formation-skills/copy/definition.js';
import { DEFINITION as SKILL_5 } from '../features/formation-skills/healing-rain/definition.js';
import { DEFINITION as SKILL_6 } from '../features/formation-skills/hammer/definition.js';
import { DEFINITION as SKILL_7 } from '../features/formation-skills/ufo/definition.js';
import { DEFINITION as SKILL_8 } from '../features/formation-skills/storm-cloud/definition.js';
export const FORMATION_SKILL_DEFINITIONS = Object.freeze([
    SKILL_0,
    SKILL_1,
    SKILL_2,
    SKILL_3,
    SKILL_4,
    SKILL_5,
    SKILL_6,
    SKILL_7,
    SKILL_8,
]);
export const BOSS_SKILL_IDS = Object.freeze(
    FORMATION_SKILL_DEFINITIONS.filter((definition) => definition.id !== 'copy').map((definition) => definition.id),
);
const FORMATION_MAX_LEVEL = 10;
export const FORMATION_COOLDOWN_SECONDS = 5;
export function formationUpgradeValue(definition, level) {
    const LEVEL = Math.max(1, level);
    if (definition.damage && definition.upgradeBase === undefined) {
        return formationDamageBudget(definition, 1, LEVEL).damage;
    }
    if (Array.isArray(definition.upgradeValues) && definition.upgradeValues.length) {
        return definition.upgradeValues[Math.min(LEVEL - 1, definition.upgradeValues.length - 1)];
    }
    return definition.upgradeBase * definition.upgradeFactor ** (LEVEL - 1) + definition.upgradeStep * (LEVEL - 1);
}
export function isValidFormationRuntime(runtime) {
    if (
        !runtime ||
        typeof runtime.active !== 'boolean' ||
        !Number.isSafeInteger(runtime.serial) ||
        runtime.serial < 0 ||
        !Array.isArray(runtime.slots) ||
        runtime.slots.length > 12 ||
        !Array.isArray(runtime.effects) ||
        runtime.effects.length > 1024
    ) {
        return false;
    }
    const IDS = new Set(),
        SLOTS = new Set();
    if (runtime.slots.filter((slot) => slot.role === 'boss').length > 3) {
        return false;
    }
    for (const SLOT of runtime.slots) {
        const BASE = FORMATION_SKILL_DEFINITIONS.find((item) => item.id === SLOT.id),
            DEFINITION = SLOT.role === 'boss' && BASE ? { ...BASE, ...BASE.boss } : BASE,
            DYNAMIC_THRESHOLD = DEFINITION?.healing || DEFINITION?.damageCharge;
        if (
            !DEFINITION ||
            (SLOT.role !== undefined && !['player', 'boss'].includes(SLOT.role)) ||
            (SLOT.role === 'boss' && (!BOSS_SKILL_IDS.includes(SLOT.id) || SLOT.ownerId !== 'boss')) ||
            !Number.isInteger(SLOT.level) ||
            SLOT.level < 1 ||
            SLOT.level > (SLOT.role === 'boss' ? 5 : FORMATION_MAX_LEVEL) ||
            SLOTS.has(`${SLOT.role || 'player'}:${SLOT.id}`) ||
            !Number.isFinite(SLOT.charge) ||
            SLOT.charge < 0 ||
            SLOT.charge > (DYNAMIC_THRESHOLD ? SLOT.required : DEFINITION.required) ||
            (DYNAMIC_THRESHOLD && (!Number.isFinite(SLOT.required) || SLOT.required <= 0)) ||
            (DEFINITION.healing &&
                (!Number.isFinite(SLOT.healingTotal) ||
                    SLOT.healingTotal <= 0 ||
                    !Number.isFinite(SLOT.required) ||
                    SLOT.required !== SLOT.healingTotal * DEFINITION.chargeRatio)) ||
            !Number.isFinite(SLOT.cooldown) ||
            SLOT.cooldown < 0 ||
            SLOT.cooldown > FORMATION_COOLDOWN_SECONDS ||
            typeof SLOT.ownerId !== 'string'
        ) {
            return false;
        }
        SLOTS.add(`${SLOT.role || 'player'}:${SLOT.id}`);
    }
    for (const EFFECT of runtime.effects) {
        const EFFECT_DEFINITION = FORMATION_SKILL_DEFINITIONS.find((definition) => definition.id === EFFECT.kind);
        if (EFFECT_DEFINITION?.healing && EFFECT.recipients !== undefined) {
            if (!Array.isArray(EFFECT.recipients)) {
                return false;
            }
            const RECIPIENTS = new Set();
            for (const RECIPIENT of EFFECT.recipients) {
                if (
                    !RECIPIENT ||
                    !isCombatActorId(RECIPIENT.id) ||
                    !Number.isSafeInteger(RECIPIENT.generation) ||
                    RECIPIENT.generation < 1
                ) {
                    return false;
                }
                const IDENTITY = `${RECIPIENT.id}:${RECIPIENT.generation}`;
                if (RECIPIENTS.has(IDENTITY)) {
                    return false;
                }
                RECIPIENTS.add(IDENTITY);
            }
        }
        if (
            EFFECT_DEFINITION?.healing &&
            (!Number.isFinite(EFFECT.total) ||
                EFFECT.total <= 0 ||
                EFFECT.duration !== EFFECT_DEFINITION.durationSeconds)
        ) {
            return false;
        }
        if (
            (EFFECT.maxHpDamageRatio !== undefined || EFFECT.missingHpDamageRatio !== undefined) &&
            (![EFFECT.damage, EFFECT.maxHpDamageRatio, EFFECT.missingHpDamageRatio].every(Number.isFinite) ||
                EFFECT.damage < 0 ||
                EFFECT.maxHpDamageRatio < 0 ||
                EFFECT.maxHpDamageRatio > 1 ||
                EFFECT.missingHpDamageRatio < 0 ||
                EFFECT.missingHpDamageRatio > 1)
        ) {
            return false;
        }
        if (
            !FORMATION_SKILL_DEFINITIONS.some(({ id }) => id === EFFECT.kind) ||
            (EFFECT.role !== undefined && !['player', 'boss'].includes(EFFECT.role)) ||
            (EFFECT.role === 'boss' && !BOSS_SKILL_IDS.includes(EFFECT.kind)) ||
            ['unitGeneration', 'targetGeneration'].some(
                (key) => EFFECT[key] !== undefined && (!Number.isSafeInteger(EFFECT[key]) || EFFECT[key] < 0),
            ) ||
            (EFFECT.targetCount !== undefined &&
                (!Number.isInteger(EFFECT.targetCount) || EFFECT.targetCount < 1 || EFFECT.targetCount > 3)) ||
            (EFFECT.targets !== undefined &&
                (!Array.isArray(EFFECT.targets) ||
                    EFFECT.targets.length > 3 ||
                    EFFECT.targets.some(
                        (target) =>
                            ![target.x, target.y, target.z, target.bodyRadius, target.bodyHeight, target.readyAt].every(
                                Number.isFinite,
                            ),
                    ))) ||
            !Number.isSafeInteger(EFFECT.id) ||
            EFFECT.id < 1 ||
            EFFECT.id > runtime.serial ||
            IDS.has(EFFECT.id) ||
            !Number.isFinite(EFFECT.age) ||
            EFFECT.age < 0 ||
            !Number.isFinite(EFFECT.duration) ||
            EFFECT.duration <= 0 ||
            ![EFFECT.x, EFFECT.y, EFFECT.z].every(Number.isFinite)
        ) {
            return false;
        }
        IDS.add(EFFECT.id);
    }
    const RETRY_ID = runtime.bossRetrySkillId;
    if (RETRY_ID != null && (!BOSS_SKILL_IDS.includes(RETRY_ID) || !SLOTS.has(`boss:${RETRY_ID}`))) {
        return false;
    }
    const CAST = runtime.bossCast;
    if (
        CAST != null &&
        (!BOSS_SKILL_IDS.includes(CAST.id) ||
            !isBossActorId(CAST.casterId) ||
            !Number.isSafeInteger(CAST.casterGeneration) ||
            CAST.casterGeneration < 1 ||
            !['prepare', 'recover'].includes(CAST.phase) ||
            !Number.isFinite(CAST.elapsed) ||
            CAST.elapsed < 0 ||
            !Number.isFinite(CAST.duration) ||
            CAST.duration <= 0 ||
            !Number.isSafeInteger(CAST.serial) ||
            CAST.serial < 1 ||
            CAST.serial > runtime.serial ||
            !SLOTS.has(`boss:${CAST.id}`))
    ) {
        return false;
    }
    return (
        runtime.active ||
        (runtime.slots.length === 0 && runtime.effects.length === 0 && CAST == null && RETRY_ID == null)
    );
}
export function createFormationRuntime() {
    return { active: false, serial: 0, slots: [], effects: [], bossCast: null, bossRetrySkillId: null };
}
