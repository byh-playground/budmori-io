import { DEFINITION as SKILL_0 } from './features/formation-skills/giant/definition.js';
import { DEFINITION as SKILL_1 } from './features/formation-skills/lightning/definition.js';
import { DEFINITION as SKILL_2 } from './features/formation-skills/meteor/definition.js';
import { DEFINITION as SKILL_3 } from './features/formation-skills/meteor-shower/definition.js';
import { DEFINITION as SKILL_4 } from './features/formation-skills/copy/definition.js';
import { DEFINITION as SKILL_5 } from './features/formation-skills/healing-rain/definition.js';
import { DEFINITION as SKILL_6 } from './features/formation-skills/hammer/definition.js';
import { DEFINITION as SKILL_7 } from './features/formation-skills/ufo/definition.js';
import { DEFINITION as SKILL_8 } from './features/formation-skills/storm-cloud/definition.js';
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
export const BOSS_SKILL_IDS = Object.freeze(['lightning', 'meteor', 'meteor-shower', 'ufo', 'storm-cloud']);
export const FORMATION_MAX_LEVEL = 10;
export const FORMATION_COOLDOWN_SECONDS = 5;
export function formationUpgradeValue(definition, level) {
    const LEVEL = Math.max(1, level);
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
            DEFINITION = SLOT.role === 'boss' && BASE ? { ...BASE, ...BASE.boss } : BASE;
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
            SLOT.charge > DEFINITION.required ||
            !Number.isFinite(SLOT.cooldown) ||
            SLOT.cooldown < 0 ||
            SLOT.cooldown > (SLOT.role === 'boss' ? 0 : FORMATION_COOLDOWN_SECONDS) ||
            typeof SLOT.ownerId !== 'string'
        ) {
            return false;
        }
        SLOTS.add(`${SLOT.role || 'player'}:${SLOT.id}`);
    }
    for (const EFFECT of runtime.effects) {
        if (
            !FORMATION_SKILL_DEFINITIONS.some(({ id }) => id === EFFECT.kind) ||
            (EFFECT.role !== undefined && !['player', 'boss'].includes(EFFECT.role)) ||
            (EFFECT.role === 'boss' && !BOSS_SKILL_IDS.includes(EFFECT.kind)) ||
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
    const CAST = runtime.bossCast;
    if (
        CAST != null &&
        (!BOSS_SKILL_IDS.includes(CAST.id) ||
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
    return runtime.active || (runtime.slots.length === 0 && runtime.effects.length === 0 && CAST == null);
}
export function createFormationRuntime() {
    return { active: false, serial: 0, slots: [], effects: [], bossCast: null };
}
