import { CONFIG, STATS } from './farm-config.js';
import { Signal } from '../core/signal.js';
import { FACTION_CONFIG, areOpposingFactions } from '../core/factions.js';
import { CREATE_UNIT_ATTACK_CYCLE } from '../units/attack-cycle.js';
import { createBarleyArmorShredBuckets } from '../features/abilities/barley-shred/model.js';
import {
    unitVisualSize,
    unitVectorScale,
    unitBodyRadius,
    unitBodyHeight,
    unitTorsoHeight,
} from '../features/unit-body/definition.js';
import { baseUnitStatsFor, resolveUnitStats, resolveKnockback, resolveStatusDuration } from '../units/unit-stats.js';
import { kitSpecies } from '../units/species-catalog.js';

const BODY = class Body {
    constructor(x, y) {
        Object.assign(this, {
            x,
            y,
            z: 0,
            vx: 0,
            vy: 0,
            vz: 0,
            angle: 0,
            stun: 0,
            flash: 0,
            bounce: 0,
        });
    }
};
const KNOCKABLE = (baseLocal) =>
    class extends baseLocal {
        knock(nx, ny, power, lift = 0, source = null) {
            const APPLIED_POWER = resolveKnockback(power, source, this);
            this.vx += nx * APPLIED_POWER;
            this.vy += ny * APPLIED_POWER;
            this.vz = Math.max(this.vz, lift * (power > 0 ? APPLIED_POWER / power : 0));
            this.stun = Math.max(this.stun, resolveStatusDuration(0.5, source, this));
            this.flash = 0.18;
        }
        // How fast a free (knocked or falling) body loses speed, per second.
        dragRate() {
            return this.z > 0.04 ? 0.8 : 5;
        }
        integrate(dt) {
            this.x += this.vx * dt;
            this.y += this.vy * dt;
            if (this.z > 0 || this.vz > 0) {
                this.vz -= CONFIG.physics.gravity * dt;
                this.z += this.vz * dt;
                if (this.z < 0) {
                    this.z = 0;
                    if (this.vz < -3) {
                        this.vz = -this.vz * 0.24;
                        this.bounce = 0.22;
                    } else {
                        this.vz = 0;
                    }
                }
            }
            const DRAG = Math.exp(-this.dragRate() * dt);
            this.vx *= DRAG;
            this.vy *= DRAG;
            this.stun = Math.max(0, this.stun - dt);
            this.flash = Math.max(0, this.flash - dt);
            this.bounce = Math.max(0, this.bounce - dt);
        }
    };

const ATTACKING_BODY = (baseLocal) =>
    class extends baseLocal {
        constructor(...args) {
            super(...args);
            this.ability = null;
        } // Assigned after the unit profile is known.
        knock(...args) {
            const SOURCE = args[4] || null;
            this.ability.interrupt();
            this.specialAbility?.interrupt();
            if (this.controller) {
                this.controller.knock(...args);
            } else {
                super.knock(...args);
            }
            if (SOURCE && areOpposingFactions(SOURCE, this)) {
                this.peaRecoveryPending = true;
                if (kitSpecies(this) === 0) {
                    this.peaCounterPending = true;
                    this.peaCounterExpiresAtTick = 0;
                }
            }
        }
        // A unit that is walking to a place keeps the speed it was told to walk at: drag is for bodies that are thrown.
        dragRate() {
            return this.moveControlActive && this.stun <= 0 && this.down <= 0 && this.z <= 0.04 ? 0 : super.dragRate();
        }
        integrate(dt) {
            if (this.controller?.integrate(this._world, dt)) {
                return;
            }
            if (this.moveControlActive && this.stun <= 0 && this.down <= 0) {
                const RATE = 1 - Math.exp(-dt * 3);
                this.vx += (this.moveControlVx - this.vx) * RATE;
                this.vy += (this.moveControlVy - this.vy) * RATE;
            }
            const ATTACK =
                this.specialAbility && this.specialAbility.phase !== 'idle' ? this.specialAbility : this.ability;
            if (!ATTACK.integrate(dt)) {
                super.integrate(dt);
            }
        }
    };
// Mature peanut geometry is a pure function of its valid tier: authored body
// metadata and size configuration are frozen. Preserve the original arithmetic
// and apply the live giant scale only in the getters, never in this table.
const PEANUT_MATURE_GEOMETRY = Object.freeze(
    Array.from({ length: 6 }, (_, index) => {
        const UNIT_LOCAL = { species: 4, tier: index + 1, growthElapsed: 1, growthDuration: 1 };
        return Object.freeze({ radius: unitBodyRadius(UNIT_LOCAL), height: unitBodyHeight(UNIT_LOCAL) });
    }),
);
function peanutMatureGeometry(unit) {
    return unit.species === 4 && unit.mature && Number.isInteger(unit.tier) && unit.tier >= 1 && unit.tier <= 6
        ? PEANUT_MATURE_GEOMETRY[unit.tier - 1]
        : null;
}
// Walnut-only mature geometry uses the same pure authored formulas. Keep the
// peanut cache separate and leave live giant scaling in the getters below.
const WALNUT_MATURE_GEOMETRY = Object.freeze(
    Array.from({ length: 6 }, (_, index) => {
        const UNIT_LOCAL = { species: 5, tier: index + 1, growthElapsed: 1, growthDuration: 1 };
        return Object.freeze({ radius: unitBodyRadius(UNIT_LOCAL), height: unitBodyHeight(UNIT_LOCAL) });
    }),
);
function walnutMatureGeometry(unit) {
    return unit.species === 5 && unit.mature && Number.isInteger(unit.tier) && unit.tier >= 1 && unit.tier <= 6
        ? WALNUT_MATURE_GEOMETRY[unit.tier - 1]
        : null;
}

function initializeFarmLifecycle(unit, x, y) {
    Object.assign(unit, {
        meals: 0,
        growth: 0,
        growthElapsed: 0,
        growthDuration: CONFIG.farm.breeding.growthSeconds,
        age: 0,
        cooldown: 0,
        cooldownDuration: 0,
        mateId: 0,
        perceptionRange: CONFIG.unit.perceptionRange,
        home: {
            x,
            y,
        },
    });
}
const UNIT = class Unit extends ATTACKING_BODY(KNOCKABLE(BODY)) {
    constructor(
        id,
        species,
        tier,
        x,
        y,
        { statProfile = null, bodyProfile = null, attackMotionProfile = null, controller = null } = {},
    ) {
        super(x, y);
        Object.assign(this, {
            id,
            statProfile,
            statModifiers: {},
            bodyProfile,
            attackMotionProfile,
            generation: 0,
            species,
            tier,
            permanentStatMultiplier: 1,
            growthMaxHpMultiplier: 1,
            temperament: 0,
            genes: [0, 0],
            seedling: null,
            faction: FACTION_CONFIG.PLAYER,
            hp: statProfile?.maxHp ?? STATS(tier, species).maxHp,
            down: 0,
            seed: typeof id === 'number' ? id * 2.39996 : 0,
            ownerId: '',
            farmId: 0,
            dropLanded: true,
            isBattleOnlySummon: false,
            battleSummonKind: '',
            battleSummonParentId: 0,
            battleSummonParentGeneration: 0,
            peanutInheritedPowerRank: 0,
            peanutInheritedSpeedRank: 0,
            battleSummonEncounterId: 0,
            countsTowardPermanentRoster: true,
            breedingEligible: true,
            mergeEligible: true,
            canSplit: true,
            splitUsedThisBattle: false,
            deathSplitHandled: false,
            usesPersistentSleep: true,
            lifetime: '',
            chestnutNextThornTick: 0,
            landingRecovery: 0,
            specialAbility: null,
            kidneyLeapReadyTick: 0,
            kidneyLeapLastUseTick: 0,
            peaRecoveryPending: false,
            peaCounterExpiresAtTick: 0,
            peaCounterPending: false,
            peaRecoveryBoostExpiresAtTick: 0,
            peaRecoveryBoostMultiplier: 0,
            walnutNextGuardTick: 0,
            walnutGuardUntilTick: 0,
            walnutStoredRawDamage: 0,
            wheatCommandUntil: 0,
            wheatCommandCritBonus: 0,
            wheatCommandBuffs: [],
            barleyArmorBreakUntil: 0,
            barleyArmorBreakReduction: 0,
            barleyArmorShredBuckets: createBarleyArmorShredBuckets(),
            giantUntil: 0,
            giantBonusDamage: 0,
            giantSizeMultiplier: 3,
            giantEndedAt: -10,
            isFormationClone: false,
            cloneBornAt: -10,
        });
        if (!controller) {
            initializeFarmLifecycle(this, x, y);
        }
        this.controller = controller ? new controller(this) : null;
        this.initializeActions();
        Object.defineProperties(this, {
            onDied: { value: new Signal() },
            onRevived: { value: new Signal() },
            onHealthChanged: { value: new Signal() },
        });
    }
    initializeActions() {
        this.ability = CREATE_UNIT_ATTACK_CYCLE(this);
        this.specialAbility = CREATE_UNIT_ATTACK_CYCLE.createSpecial(this);
    }
    // The one writer of the growing stage. A seed is no species yet: while it grows `species` is null and the species
    // it will become waits in `seedling.heritage`, which only the growth step and the save read. A seed fights as the
    // plain sprout, so entering or leaving the stage swaps the attack, ability and stats it plays by; health keeps its
    // share of the new maximum. The third meal hands the heritage over as the species.
    setSeedling(state) {
        const PREVIOUS_MAX_HP = this.maxHp,
            HEALTH_SHARE = PREVIOUS_MAX_HP > 0 ? this.hp / PREVIOUS_MAX_HP : 1,
            HERITAGE = this.seedling ? this.seedling.heritage : this.species;
        this.seedling = state ? { fed: state.fed, cooldown: state.cooldown, heritage: HERITAGE } : null;
        this.species = state ? null : HERITAGE;
        this.initializeActions();
        if (this.hp > 0) {
            this.hp = Math.min(1, HEALTH_SHARE) * this.maxHp;
        }
        this.notifyHealthCapacity(PREVIOUS_MAX_HP);
    }
    attachWorld(world) {
        Object.defineProperty(this, '_world', { value: world, writable: true, configurable: true });
        for (const SIGNAL of [this.onDied, this.onRevived, this.onHealthChanged]) {
            SIGNAL.scope = world.mutationNotifications;
            SIGNAL.immediate = true;
        }
    }
    notifyHealthCapacity(previousMaxHp) {
        const MAX_HP = this.maxHp;
        if (MAX_HP !== previousMaxHp) {
            this.onHealthChanged.emit({
                unitId: this.id,
                previousHp: this.hp,
                hp: this.hp,
                previousMaxHp,
                maxHp: MAX_HP,
            });
        }
    }
    setBaseStats(values) {
        const PREVIOUS_MAX_HP = this.maxHp;
        this.statProfile = { ...(this.statProfile ?? baseUnitStatsFor(this.tier, kitSpecies(this))), ...values };
        this.notifyHealthCapacity(PREVIOUS_MAX_HP);
    }
    setStatModifiers(modifiers) {
        const PREVIOUS_MAX_HP = this.maxHp;
        this.statModifiers = structuredClone(modifiers);
        this.notifyHealthCapacity(PREVIOUS_MAX_HP);
    }
    get maxHp() {
        return resolveUnitStats(this).maxHp;
    }
    set maxHp(value) {
        this.setBaseStats({ maxHp: value });
    }
    get attackPower() {
        return resolveUnitStats(this).attackPower;
    }
    set attackPower(value) {
        this.setBaseStats({ attackPower: value });
    }
    get moveSpeed() {
        return resolveUnitStats(this).moveSpeed;
    }
    set moveSpeed(value) {
        this.setBaseStats({ moveSpeed: value });
    }
    setHealth(value) {
        const PREVIOUS = this.hp;
        this.hp = value;
        if (PREVIOUS !== value) {
            this.onHealthChanged.emit({ unitId: this.id, previousHp: PREVIOUS, hp: value });
        }
    }
    die() {
        this.ability?.interrupt();
        this.specialAbility?.interrupt();
        this.barleyArmorShredBuckets = createBarleyArmorShredBuckets();
        this.ability?.resetCombatEffects?.();
        if (this.deathSplitHandled) {
            return false;
        }
        this.deathSplitHandled = true;
        this.onDied.emit({ unitId: this.id, x: this.x, y: this.y, z: this.z });
        return true;
    }
    revive(maxHp) {
        this.barleyArmorShredBuckets = createBarleyArmorShredBuckets();
        Object.assign(this, {
            hp: maxHp,
            down: 0,
            z: 0,
            vx: 0,
            vy: 0,
            vz: 0,
            stun: 0,
            flash: 0,
            bounce: 0,
            angle: 0,
            deathSplitHandled: false,
        });
        this.initializeActions();
        this.peaRecoveryPending = false;
        this.peaCounterExpiresAtTick = 0;
        this.peaCounterPending = false;
        this.peaRecoveryBoostExpiresAtTick = 0;
        this.peaRecoveryBoostMultiplier = 0;
        this.onRevived.emit({ unitId: this.id, x: this.x, y: this.y, hp: this.hp });
    }
    dispose() {
        this.ability?.interrupt();
        this.specialAbility?.interrupt();
        this.ability?.resetCombatEffects?.();
        this.onDied.clear();
        this.onRevived.clear();
        this.onHealthChanged.clear();
        this.onDied.scope = this.onRevived.scope = this.onHealthChanged.scope = null;
    }
    get giantScale() {
        return this.giantUntil > (this._world?.time ?? 0) ? (this.giantSizeMultiplier ?? 3) : 1;
    }
    get radius() {
        return (
            (this.bodyProfile?.radius(this) ??
                peanutMatureGeometry(this)?.radius ??
                walnutMatureGeometry(this)?.radius ??
                unitBodyRadius(this)) * this.giantScale
        );
    }
    get mature() {
        return this.growthElapsed >= this.growthDuration - 1e-9;
    }
    get fed() {
        return this.meals >= 1;
    }
    get size() {
        return unitVisualSize(this) * this.giantScale;
    }
    get bodyScale() {
        return (this.bodyProfile?.vectorScale?.(this) ?? unitVectorScale(this)) * this.giantScale;
    }
    get attackRangeOffset() {
        return this.bodyProfile ? Math.max(0, this.radius - unitBodyRadius(this)) : 0;
    }
    get attackGeometryScale() {
        return this.bodyProfile ? this.radius / unitBodyRadius(this) : this.giantScale;
    }
    get height() {
        return (
            (this.bodyProfile?.height(this) ??
                peanutMatureGeometry(this)?.height ??
                walnutMatureGeometry(this)?.height ??
                unitBodyHeight(this)) * this.giantScale
        );
    }
    get bodyHeight() {
        return (this.bodyProfile?.bodyHeight?.(this) ?? unitTorsoHeight(this)) * this.giantScale;
    }
};
export { UNIT as Unit };
