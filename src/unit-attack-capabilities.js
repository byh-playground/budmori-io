import { createDualStrikeMixin } from './features/unit-attacks/dual-strike/model.js';
import { FEATURE as DUAL_STRIKE_FEATURE } from './features/unit-attacks/dual-strike/definition.js';
import { createLobAttackMixin } from './features/unit-attacks/lob/model.js';
import { FEATURE as LOB_FEATURE } from './features/unit-attacks/lob/definition.js';
import { UNIT_CAPABILITY_COMPOSITIONS, unitCapabilityComposition } from './unit-abilities.js';
import { scaleAttackRecovery, scaleAttackArea, resolveStatusDuration } from './unit-stats.js';
import {
    createBeanSplitDescriptors,
    getCornBurstConfig,
    createCornBurstShotSchedule,
    getPopcornExplosionConfig,
    getChestnutSpikeConfig,
    getChestnutSpikeIntervalSeconds,
    getContinuousLeapConfig,
    shouldResetLeapCooldown,
    getLandingShockwaveConfig,
    getPeanutAssaultConfig,
    getWalnutGuardConfig,
    isWalnutGuardActive,
    getRiceHarvestMultiplier,
    getWheatCommandConfig,
    refreshWheatCommandBuff,
    getBarleyArmorBreakConfig,
    refreshBarleyArmorBreak,
} from './species-abilities.js';

// One-time subclass composition exposes flat cycle methods. Each capability
// owns its state transitions; the historical action/unit field names are the
// save contract, not a second copy or another component hierarchy.
export function composeUnitAttackCycles(
    cycle,
    { ArenaGeometry: arenaGeometry, Ballistics: ballistics, CONFIG: configLocal },
) {
    const PATH_MOTION = (base) =>
        class extends base {
            resolveAttackHit(sim, action, target, point, options) {
                return sim.damageCombatTarget(this.owner, action, target, point, options);
            }
            createAttackPath() {
                const U = this.owner,
                    A = this.action;
                A.path = ballistics.create(U, A.target, this.spec.kind);
                if (this.composition.useActiveDuration) {
                    A.path.duration = this.spec.timing.active ?? A.path.duration;
                }
            }
            integrate(dt) {
                const U = this.owner,
                    A = this.action;
                if (
                    this.phase !== 'active' ||
                    !A?.path ||
                    U.stun > 0 ||
                    U.down > 0 ||
                    U.landingRecovery > 0 ||
                    (U.z > 0.1 && !(A.path.height > 0))
                ) {
                    return false;
                }
                const P = ballistics.sample(A.path, this.elapsed / A.path.duration);
                U.vx = (P.x - U.x) / dt;
                U.vy = (P.y - U.y) / dt;
                U.vz = (P.z - U.z) / dt;
                U.x = P.x;
                U.y = P.y;
                U.z = P.z;
                U.flash = Math.max(0, U.flash - dt);
                U.bounce = Math.max(0, U.bounce - dt);
                return true;
            }
        };
    const CONTACT_ATTACK = (base) =>
        class extends PATH_MOTION(base) {
            afterMove(sim, old) {
                const A = this.action,
                    U = this.owner,
                    TARGET = sim.attackTarget(U, A);
                if (this.phase !== 'active' || !A?.path) {
                    return;
                }
                if (!TARGET || TARGET.hp <= 0) {
                    this.interrupt();
                    return;
                }
                const AREA_RADIUS = scaleAttackArea(U.radius, U),
                    HIT = !A.hit && arenaGeometry.sweep(old, U, AREA_RADIUS, U.height, TARGET);
                if (HIT) {
                    this.resolveAttackHit(sim, A, TARGET, HIT, {
                        attackMultiplier: this.spec.skillMultiplier,
                        attackKind: this.spec.kind,
                    });
                    if (this.composition.contactRecoil) {
                        U.x = HIT.x;
                        U.y = HIT.y;
                        U.z = HIT.z;
                        this.recover(sim, true);
                        return;
                    }
                }
                if (this.elapsed >= A.path.duration) {
                    U.z = 0;
                    U.vz = 0;
                    U.vx = U.vy = 0;
                    if (this.landAttack?.(sim, TARGET)) {
                        return;
                    }
                    this.recover(sim, true);
                }
            }
        };
    const REPEATED_STRIKE = createDualStrikeMixin(PATH_MOTION, arenaGeometry);
    const PROJECTILE_ATTACK = createLobAttackMixin(PATH_MOTION);
    const LANDING = (base) =>
        class extends base {
            landAttack(sim, target) {
                if (super.landAttack?.(sim, target)) {
                    return true;
                }
                const U = this.owner,
                    A = this.action;
                U.bounce = 0.2;
                sim.combatEvent('land-attack', U, A);
                if (
                    !A.hit &&
                    arenaGeometry.overlaps(
                        {
                            x: U.x,
                            y: U.y,
                            z: 0,
                            radius: scaleAttackArea(U.radius + 0.35, U),
                            height: U.height,
                        },
                        target,
                    )
                ) {
                    this.resolveAttackHit(sim, A, target, U, {
                        attackMultiplier: this.spec.skillMultiplier,
                        attackKind: this.spec.kind,
                    });
                }
                return this.resolveLandingEffects?.(sim) || false;
            }
        };
    const LANDING_SHOCKWAVE = (base) =>
        class extends base {
            resolveLandingEffects(sim) {
                const RESET = super.resolveLandingEffects?.(sim),
                    U = this.owner;
                const CONFIG_LOCAL = getLandingShockwaveConfig(sim.abilityProgressionFor(U), U.tier);
                if (CONFIG_LOCAL) {
                    sim.triggerLandingShockwave(U, this.action, CONFIG_LOCAL);
                }
                return RESET;
            }
        };
    const LEAP_RESET = (base) =>
        class extends base {
            resolveLandingEffects(sim) {
                if (super.resolveLandingEffects?.(sim)) {
                    return true;
                }
                const U = this.owner,
                    CONFIG_LOCAL = getContinuousLeapConfig(sim.abilityProgressionFor(U), U.tier);
                if (!CONFIG_LOCAL || !shouldResetLeapCooldown(CONFIG_LOCAL, sim.random())) {
                    return false;
                }
                this.ready();
                sim.combat('leap-cooldown-reset', {
                    unit: U.id,
                    ownerId: U.ownerId,
                    species: U.species,
                });
                return true;
            }
        };
    const ASSAULT = (base) =>
        class extends base {
            strikeConfig(sim) {
                return getPeanutAssaultConfig(sim.abilityProgressionFor(this.owner), this.owner.tier);
            }
        };
    const BURST_FIRE = (base) =>
        class extends base {
            projectileShots(sim) {
                const U = this.owner,
                    CONFIG_LOCAL = getCornBurstConfig(sim.abilityProgressionFor(U), U.tier);
                return CONFIG_LOCAL
                    ? createCornBurstShotSchedule(CONFIG_LOCAL, {
                          activeSeconds: 0,
                          recoverySeconds: scaleAttackRecovery(this.spec.timing.recovery, U),
                      })
                    : super.projectileShots(sim);
            }
        };
    const POPCORN = (base) =>
        class extends base {
            projectileEffect(sim) {
                return getPopcornExplosionConfig(sim.abilityProgressionFor(this.owner), this.owner.tier);
            }
        };
    const GUARD = (base) =>
        class extends base {
            resetCombatEffects() {
                super.resetCombatEffects?.();
                this.owner.walnutEmpoweredNextBasic = false;
            }
            prepareAttack(sim) {
                super.prepareAttack?.(sim);
                const U = this.owner,
                    GUARD_LOCAL = getWalnutGuardConfig(sim.abilityProgressionFor(U), U.tier);
                Object.assign(this.action, {
                    walnutEmpowered: !!GUARD_LOCAL && U.walnutEmpoweredNextBasic,
                    walnutGuardUsed: false,
                });
                U.walnutEmpoweredNextBasic = false;
            }
            guardConfig(sim) {
                const U = this.owner,
                    CONFIG_LOCAL = getWalnutGuardConfig(sim.abilityProgressionFor(U), U.tier);
                return isWalnutGuardActive(U, CONFIG_LOCAL, scaleAttackRecovery(this.spec.timing.recovery, U))
                    ? CONFIG_LOCAL
                    : null;
            }
            receiveGuard(sim) {
                const CONFIG_LOCAL = this.guardConfig(sim);
                if (!CONFIG_LOCAL) {
                    return null;
                }
                this.action.walnutGuardUsed = true;
                this.owner.walnutEmpoweredNextBasic = true;
                const U = this.owner;
                sim.combat('walnut-guard', {
                    unit: U.id,
                    x: U.x,
                    y: U.y,
                    z: U.z,
                });
                return CONFIG_LOCAL;
            }
            resolveAttackHit(sim, action, target, point, options) {
                return action.walnutEmpowered
                    ? sim.triggerWalnutSlam(this.owner, action, target, point)
                    : super.resolveAttackHit(sim, action, target, point, options);
            }
        };
    const LAUNCH_FAN = (base) =>
        class extends base {
            onLaunch(sim, action) {
                super.onLaunch?.(sim, action);
                const U = this.owner,
                    CONFIG_LOCAL = getChestnutSpikeConfig(sim.abilityProgressionFor(U), U.tier);
                if (
                    !CONFIG_LOCAL ||
                    sim.projectiles.length + CONFIG_LOCAL.projectileCount > configLocal.raid.capacity.projectiles
                ) {
                    return;
                }
                const CYCLE_SECONDS = this.spec.timing.windup + scaleAttackRecovery(this.spec.timing.recovery, U),
                    INTERVAL = getChestnutSpikeIntervalSeconds(CONFIG_LOCAL, CYCLE_SECONDS);
                if (!Number.isFinite(INTERVAL) || INTERVAL <= 0) {
                    return;
                }
                U.chestnutBasicCycles++;
                if (U.chestnutBasicCycles % CONFIG_LOCAL.intervalBasicCycles === 0) {
                    sim.spawnChestnutSpikes(U, action, CONFIG_LOCAL);
                }
            }
        };
    const DEATH_SPLIT = (base) =>
        class extends base {
            deathSplitDescriptors(sim, inBattle) {
                return createBeanSplitDescriptors({
                    unit: this.owner,
                    progression: sim.abilityProgressionFor(this.owner),
                    inBattle,
                });
            }
        };
    const HARVEST = (base) =>
        class extends base {
            harvestMultiplier(sim, hp, maxHp) {
                return getRiceHarvestMultiplier(sim.abilityProgressionFor(this.owner), this.owner.tier, hp, maxHp);
            }
        };
    const COMMAND_AURA = (base) =>
        class extends base {
            commandAuraConfig(sim) {
                return getWheatCommandConfig(sim.abilityProgressionFor(this.owner), this.owner.tier);
            }
            onBasicHit(sim, target) {
                super.onBasicHit?.(sim, target);
                const U = this.owner,
                    CONFIG_LOCAL = this.commandAuraConfig(sim);
                if (CONFIG_LOCAL) {
                    refreshWheatCommandBuff(
                        U,
                        CONFIG_LOCAL,
                        sim.time,
                        resolveStatusDuration(CONFIG_LOCAL.durationSeconds, U, null),
                    );
                }
            }
        };
    const ARMOR_BREAK = (base) =>
        class extends base {
            onBasicHit(sim, target) {
                super.onBasicHit?.(sim, target);
                const U = this.owner,
                    CONFIG_LOCAL = getBarleyArmorBreakConfig(sim.abilityProgressionFor(U), U.tier);
                if (CONFIG_LOCAL) {
                    refreshBarleyArmorBreak(
                        target,
                        CONFIG_LOCAL,
                        sim.time,
                        resolveStatusDuration(CONFIG_LOCAL.durationSeconds, U, target),
                    );
                }
            }
        };
    const ATTACKS = {
        contact: CONTACT_ATTACK,
        [LOB_FEATURE.modelKey]: PROJECTILE_ATTACK,
        [DUAL_STRIKE_FEATURE.modelKey]: REPEATED_STRIKE,
    };
    const TRAITS = {
        landing: LANDING,
        landingShockwave: LANDING_SHOCKWAVE,
        leapReset: LEAP_RESET,
        assault: ASSAULT,
        burstFire: BURST_FIRE,
        popcorn: POPCORN,
        guard: GUARD,
        launchFan: LAUNCH_FAN,
        deathSplit: DEATH_SPLIT,
        harvest: HARVEST,
        commandAura: COMMAND_AURA,
        armorBreak: ARMOR_BREAK,
    };
    const MIXIN = (base, ...capabilities) => {
        for (const CAPABILITY of new Set(capabilities)) {
            base = CAPABILITY(base);
        }
        return base;
    };
    const CLASSES = new Map();
    for (const DEFINITION of Object.values(UNIT_CAPABILITY_COMPOSITIONS)) {
        // Function identity dedupes selected traits at class construction only.
        CLASSES.set(
            DEFINITION,
            MIXIN(cycle, ATTACKS[DEFINITION.attack], ...DEFINITION.traits.map((name) => TRAITS[name])),
        );
    }
    return (owner) => new (CLASSES.get(unitCapabilityComposition(owner.species)))(owner);
}
