import { createBarleyAttackMixin } from './features/unit-attacks/barley/model.js';
import { barleyGrowthBuild } from './features/species-growth/barley-attack.js';
import { createWheatAttackMixin } from './features/unit-attacks/wheat/model.js';
import { createRiceAttackMixin } from './features/unit-attacks/rice/model.js';
import { createWalnutAttackMixin } from './features/unit-attacks/walnut/model.js';
import { walnutGrowthBuild } from './features/species-growth/walnut-attack.js';
import { createChestnutAttackMixin } from './features/unit-attacks/chestnut/model.js';
import { chestnutGrowthBuild } from './features/species-growth/chestnut-attack.js';
import { createRedbeanAttackMixin } from './features/unit-attacks/redbean/model.js';
import { redbeanGrowthBuild } from './features/species-growth/redbean-attack.js';
import { createPeaAttackMixin } from './features/unit-attacks/pea/model.js';
import { createDualStrikeMixin } from './features/unit-attacks/dual-strike/model.js';
import { FEATURE as DUAL_STRIKE_FEATURE } from './features/unit-attacks/dual-strike/definition.js';
import { createLobAttackMixin } from './features/unit-attacks/lob/model.js';
import { FEATURE as LOB_FEATURE } from './features/unit-attacks/lob/definition.js';
import {
    UNIT_CAPABILITY_COMPOSITIONS,
    unitCapabilityComposition,
    specialAbilityCompositionFor,
} from './unit-abilities.js';
import { scaleAttackArea } from './unit-stats.js';
import { RiceCriticalModel } from './features/abilities/rice-critical/model.js';
import { WheatCommandModel } from './features/abilities/wheat-command/model.js';
import { BarleyArmorShredModel } from './features/abilities/barley-shred/model.js';
import { PeaRecoveryBoostModel } from './features/abilities/pea-recovery-boost/model.js';
import { KidneyLeapModel } from './features/abilities/kidney-leap/model.js';
import { ChestnutThornsModel } from './features/abilities/chestnut-thorns/model.js';
import { PeanutDeathSplitModel } from './features/abilities/peanut-death-split/model.js';
import { WalnutRawGuardModel } from './features/abilities/walnut-raw-guard/model.js';
import { CornAttachmentModel } from './features/abilities/corn-attachment/model.js';

// One-time subclass composition exposes flat cycle methods. Each capability
// owns its state transitions; the historical action/unit field names are the
// save contract, not a second copy or another component hierarchy.
export function composeUnitAttackCycles(cycle, { ArenaGeometry: arenaGeometry, Ballistics: ballistics }) {
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
                const DELAY = Math.min(dt, A.motionDelay || 0);
                A.motionDelay = Math.max(0, (A.motionDelay || 0) - DELAY);
                this.elapsed += dt - DELAY;
                const P = ballistics.sample(A.path, this.elapsed / A.path.duration, this.motionPoint);
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
    const LEAP_RESET = (base) =>
        class extends base {
            resolveLandingEffects(sim) {
                if (super.resolveLandingEffects?.(sim)) {
                    return true;
                }
                const U = this.owner,
                    CONFIG_LOCAL = KidneyLeapModel.config(sim.abilityProgressionFor(U), U.tier);
                if (
                    !CONFIG_LOCAL ||
                    this.action.leapCooldownResetApplied ||
                    !KidneyLeapModel.shouldResetCooldown(CONFIG_LOCAL, sim.random())
                ) {
                    return false;
                }
                this.action.leapCooldownResetApplied = true;
                this.ready();
                U.kidneyLeapReadyTick = sim.simulationTick;
                U.kidneyLeapLastUseTick = sim.simulationTick;
                sim.combat('leap-cooldown-reset', {
                    unit: U.id,
                    ownerId: U.ownerId,
                    species: U.species,
                });
                return true;
            }
        };
    const KIDNEY_LEAP = (base) =>
        class extends base {
            get spec() {
                return specialAbilityCompositionFor(this.owner.species).profile;
            }
            get composition() {
                return specialAbilityCompositionFor(this.owner.species).composition;
            }
            canBegin(sim) {
                return (
                    !redbeanGrowthBuild(sim.abilityProgressionFor(this.owner)) &&
                    !!KidneyLeapModel.config(sim.abilityProgressionFor(this.owner), this.owner.tier) &&
                    sim.simulationTick >= this.owner.kidneyLeapReadyTick &&
                    this.owner.kidneyLeapLastUseTick !== sim.simulationTick
                );
            }
            onLaunch(sim, action) {
                super.onLaunch?.(sim, action);
                if (action.leapDepartureCommitted) {
                    return;
                }
                action.leapDepartureCommitted = true;
                this.owner.kidneyLeapReadyTick =
                    sim.simulationTick + specialAbilityCompositionFor(this.owner.species).cooldownTicks;
                this.owner.kidneyLeapLastUseTick = sim.simulationTick;
            }
            interrupt() {
                if (this.phase === 'windup' && !this.action?.leapDepartureCommitted) {
                    this.ready();
                    return;
                }
                super.interrupt();
            }
        };
    const CORN_ATTACHMENT = (base) =>
        class extends base {
            projectileEffect(sim) {
                return CornAttachmentModel.projectileEffect(sim.abilityProgressionFor(this.owner), this.owner.tier);
            }
        };
    const GUARD = (base) =>
        class extends base {
            resetCombatEffects() {
                super.resetCombatEffects?.();
                WalnutRawGuardModel.clear(this.owner);
            }
            tryStartGuard(sim) {
                const U = this.owner,
                    CONFIG_LOCAL = WalnutRawGuardModel.config(sim.abilityProgressionFor(U), U.tier);
                if (!WalnutRawGuardModel.start(U, sim.simulationTick, CONFIG_LOCAL)) {
                    return false;
                }
                sim.combat('walnut-guard-start', {
                    unit: U.id,
                    x: U.x,
                    y: U.y,
                    z: U.z || 0,
                    endsAtTick: U.walnutGuardUntilTick,
                });
                return true;
            }
            guardAlongsideAttack(sim) {
                return !!walnutGrowthBuild(sim.abilityProgressionFor(this.owner));
            }
            isGuarding(simulationTick) {
                return WalnutRawGuardModel.isGuarding(this.owner, simulationTick);
            }
            armorModifier(sim, simulationTick) {
                const U = this.owner,
                    CONFIG_LOCAL = WalnutRawGuardModel.config(sim.abilityProgressionFor(U), U.tier);
                return WalnutRawGuardModel.armorBonus(U, simulationTick, CONFIG_LOCAL);
            }
            rawDamageBonus(sim, action, kind) {
                if (this.action?.walnutAttack || action !== this.action || kind !== this.spec.kind) {
                    return 0;
                }
                const U = this.owner,
                    CONFIG_LOCAL = WalnutRawGuardModel.config(sim.abilityProgressionFor(U), U.tier);
                return WalnutRawGuardModel.nextHammerBonus(U, sim.unitStatsFor(U).attackPower, CONFIG_LOCAL);
            }
            afterSuccessfulAttack(_sim, action) {
                if (!this.action?.walnutAttack && action === this.action) {
                    WalnutRawGuardModel.consume(this.owner);
                }
            }
            receiveRawDamage(sim, rawDamage) {
                const U = this.owner,
                    CONFIG_LOCAL = WalnutRawGuardModel.config(sim.abilityProgressionFor(U), U.tier);
                WalnutRawGuardModel.accumulate(U, rawDamage, sim.simulationTick, CONFIG_LOCAL);
            }
        };
    const CHESTNUT_THORNS = (base) =>
        class extends base {
            get spec() {
                return specialAbilityCompositionFor(this.owner.species).profile;
            }
            canBegin(sim) {
                const U = this.owner,
                    CONFIG_LOCAL = ChestnutThornsModel.config(sim.abilityProgressionFor(U), U.tier);
                return (
                    !chestnutGrowthBuild(sim.abilityProgressionFor(U)) &&
                    !!CONFIG_LOCAL &&
                    sim.simulationTick >= (U.chestnutNextThornTick || 0)
                );
            }
            createAttackPath() {
                this.action.path = null;
            }
            onLaunch(sim, action) {
                if (action.thornShotsRemaining !== undefined) {
                    return;
                }
                const U = this.owner,
                    CONFIG_LOCAL = ChestnutThornsModel.config(sim.abilityProgressionFor(U), U.tier),
                    TARGET = sim.attackTarget(U, action);
                if (!CONFIG_LOCAL || !TARGET || TARGET.hp <= 0) {
                    return;
                }
                Object.assign(action, {
                    thornTargetId: action.targetId,
                    thornTargetGeneration: TARGET.generation,
                    thornConfig: CONFIG_LOCAL,
                    thornShotsRemaining: CONFIG_LOCAL.projectileCount - 1,
                    thornNextShotTick: sim.simulationTick + CONFIG_LOCAL.spacingTicks,
                    thornShotIndex: 0,
                });
                if (sim.spawnChestnutThorn(U, action, CONFIG_LOCAL, action.thornShotIndex)) {
                    U.chestnutNextThornTick = sim.simulationTick + CONFIG_LOCAL.cooldownTicks;
                } else {
                    action.thornShotsRemaining = 0;
                }
            }
            launchAttack(sim) {
                super.launchAttack?.(sim);
                this.recover(sim, false);
            }
            updateRecovery(sim) {
                const ACTION = this.action;
                if (!ACTION || ACTION.thornShotsRemaining <= 0 || sim.simulationTick < ACTION.thornNextShotTick) {
                    return;
                }
                const TARGET = ChestnutThornsModel.resolveTarget(
                    sim,
                    ACTION.thornTargetId,
                    ACTION.thornTargetGeneration,
                );
                if (!TARGET || TARGET.hp <= 0) {
                    ACTION.thornShotsRemaining = 0;
                    return;
                }
                ACTION.thornShotIndex += 1;
                if (sim.spawnChestnutThorn(this.owner, ACTION, ACTION.thornConfig, ACTION.thornShotIndex)) {
                    ACTION.thornShotsRemaining -= 1;
                } else {
                    ACTION.thornShotsRemaining = 0;
                }
                ACTION.thornNextShotTick += ACTION.thornConfig.spacingTicks;
            }
        };
    const DEATH_SPLIT = (base) =>
        class extends base {
            deathSplitDescriptors(sim, inBattle) {
                return PeanutDeathSplitModel.descriptors({
                    unit: this.owner,
                    progression: sim.abilityProgressionFor(this.owner),
                    inBattle,
                });
            }
        };
    const RECOVERY_HASTE = (base) =>
        class extends base {
            recoveryHasteConfig(sim) {
                const U = this.owner;
                return PeaRecoveryBoostModel.config(sim.abilityProgressionFor(U), U.tier);
            }
        };
    const RICE_CRITICAL = (base) =>
        class extends base {
            criticalChanceBonus(sim, hp, maxHp) {
                return RiceCriticalModel.chanceBonus(sim.abilityProgressionFor(this.owner), this.owner.tier, hp, maxHp);
            }
        };
    const COMMAND_AURA = (base) =>
        class extends base {
            commandAuraConfig(sim) {
                return WheatCommandModel.config(sim.abilityProgressionFor(this.owner), this.owner.tier);
            }
            onLaunch(sim, action) {
                super.onLaunch?.(sim, action);
                const CONFIG_LOCAL = this.commandAuraConfig(sim);
                if (CONFIG_LOCAL && !action.wheatCommandResolved) {
                    WheatCommandModel.trigger(sim, this.owner, action, CONFIG_LOCAL);
                }
            }
        };
    const ARMOR_BREAK = (base) =>
        class extends base {
            onBasicHit(sim, target) {
                super.onBasicHit?.(sim, target);
                const U = this.owner,
                    CONFIG_LOCAL = BarleyArmorShredModel.config(sim.abilityProgressionFor(U), U.tier);
                if (CONFIG_LOCAL && target.hp > 0 && !barleyGrowthBuild(sim.abilityProgressionFor(U))) {
                    const RESULT = BarleyArmorShredModel.applyHit(target, CONFIG_LOCAL.amount, sim.simulationTick);
                    if (RESULT) {
                        sim.combat('barley-shred', {
                            sourceUnit: U.id,
                            unit: target === sim.boss ? 'boss' : target.id,
                            amount: RESULT.amount,
                            x: target.x,
                            y: target.y,
                            z: target.z || 0,
                        });
                    }
                }
            }
        };
    const ATTACKS = {
        contact: CONTACT_ATTACK,
        barley: createBarleyAttackMixin(CONTACT_ATTACK, arenaGeometry),
        wheat: createWheatAttackMixin(CONTACT_ATTACK, arenaGeometry),
        rice: createRiceAttackMixin(CONTACT_ATTACK, arenaGeometry),
        walnut: createWalnutAttackMixin(CONTACT_ATTACK, arenaGeometry),
        pea: createPeaAttackMixin(CONTACT_ATTACK, arenaGeometry),
        chestnut: createChestnutAttackMixin(CONTACT_ATTACK),
        redbean: createRedbeanAttackMixin(CONTACT_ATTACK, arenaGeometry),
        [LOB_FEATURE.modelKey]: PROJECTILE_ATTACK,
        [DUAL_STRIKE_FEATURE.modelKey]: REPEATED_STRIKE,
    };
    const TRAITS = {
        landing: LANDING,
        leapReset: LEAP_RESET,
        guard: GUARD,
        chestnutThorns: CHESTNUT_THORNS,
        cornAttachment: CORN_ATTACHMENT,
        deathSplit: DEATH_SPLIT,
        riceCritical: RICE_CRITICAL,
        commandAura: COMMAND_AURA,
        armorBreak: ARMOR_BREAK,
        recoveryHaste: RECOVERY_HASTE,
        kidneyLeap: KIDNEY_LEAP,
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
    const CREATE = (owner) => new (CLASSES.get(unitCapabilityComposition(owner.species)))(owner),
        SPECIAL_CLASSES = new Map();
    CREATE.createSpecial = (owner) => {
        const DEFINITION = specialAbilityCompositionFor(owner.species);
        if (!DEFINITION) {
            return null;
        }
        let specialClass = SPECIAL_CLASSES.get(DEFINITION);
        if (!specialClass) {
            specialClass = MIXIN(cycle, ATTACKS[DEFINITION.attack], ...DEFINITION.traits.map((name) => TRAITS[name]));
            SPECIAL_CLASSES.set(DEFINITION, specialClass);
        }
        return new specialClass(owner);
    };
    return CREATE;
}
