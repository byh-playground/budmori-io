import { formationDamageForTarget } from './formation-damage.js';
import { createFormationRuntime, FORMATION_COOLDOWN_SECONDS } from './formation-skill-state.js';
import { applyDamage, unitMaxHpFor } from '../units/unit-stats.js';
import { FixedSpatialGrid } from '../core/spatial-grid.js';
import { GiantSkill } from '../features/formation-skills/giant/model.js';
import { LightningSkill } from '../features/formation-skills/lightning/model.js';
import { LargeMeteorSkill } from '../features/formation-skills/meteor/model.js';
import { MeteorShowerSkill } from '../features/formation-skills/meteor-shower/model.js';
import { CopySkill } from '../features/formation-skills/copy/model.js';
import { HealingRainSkill } from '../features/formation-skills/healing-rain/model.js';
import { HammerSkill } from '../features/formation-skills/hammer/model.js';
import { UfoSkill } from '../features/formation-skills/ufo/model.js';
import { StormCloudSkill } from '../features/formation-skills/storm-cloud/model.js';
const MODELS = new Map(
    [
        new GiantSkill(),
        new LightningSkill(),
        new LargeMeteorSkill(),
        new MeteorShowerSkill(),
        new CopySkill(),
        new HealingRainSkill(),
        new HammerSkill(),
        new UfoSkill(),
        new StormCloudSkill(),
    ].map((model) => [model.definition.id, model]),
);
export class FormationSkills {
    constructor(world) {
        this.world = world;
        this.role = 'player';
        this.bossContext = Object.create(this);
        this.bossContext.role = 'boss';
        this.members = new Set(world.units);
        this.injuredByFaction = new Map();
        this.trackedBosses = new Map();
        this.bossContexts = new Map();
        this.rebuildInjured();
        this.scratch = [];
        this.air = new FixedSpatialGrid();
        this.airScratch = [];
        this.subscriptions = [
            world.unitCollection.onAdded.on(({ unitId }) => {
                const UNIT = world._unitForId(unitId);
                if (UNIT) {
                    this.members.add(UNIT);
                    this.trackHealth(UNIT);
                }
            }),
            world.unitCollection.onRemoved.on(({ unitId }) => {
                for (const UNIT of this.members) {
                    if (UNIT.id === unitId) {
                        this.members.delete(UNIT);
                        this.untrackHealth(UNIT);
                    }
                }
            }),
            world.unitCollection.onReset.on(() => this.resetMembers()),
            world.unitCollection.onReplaced.on(() => this.resetMembers()),
            world.unitCollection.onHealthChanged.on(({ unitId }) => {
                const UNIT = world._unitForId(unitId);
                if (UNIT) {
                    this.trackHealth(UNIT);
                }
            }),
            world.onCombatResolved.on((event) => this.contribute(event)),
        ];
    }
    untrackHealth(unit) {
        for (const INJURED of this.injuredByFaction.values()) {
            INJURED.delete(unit);
        }
    }
    trackHealth(unit) {
        this.untrackHealth(unit);
        if (unit.hp <= 0 || unit.hp >= unitMaxHpFor(unit)) {
            return;
        }
        let injured = this.injuredByFaction.get(unit.faction);
        if (!injured) {
            injured = new Set();
            this.injuredByFaction.set(unit.faction, injured);
        }
        injured.add(unit);
    }
    rebuildInjured() {
        this.injuredByFaction.clear();
        for (const UNIT of this.members) {
            this.trackHealth(UNIT);
        }
        for (const BOSS of this.trackedBosses.keys()) {
            this.trackHealth(BOSS);
        }
    }
    resetMembers() {
        this.members = new Set(this.world.units);
        this.rebuildInjured();
    }
    releaseBossHealth() {
        for (const [BOSS, OFF] of this.trackedBosses) {
            OFF();
            this.untrackHealth(BOSS);
        }
        this.trackedBosses.clear();
        this.bossContexts.clear();
    }
    synchronizeBossHealth() {
        const BOSSES = this.active ? this.world.bosses : [];
        for (const [BOSS, OFF] of this.trackedBosses) {
            if (!BOSSES.includes(BOSS)) {
                OFF();
                this.untrackHealth(BOSS);
                this.trackedBosses.delete(BOSS);
            }
        }
        for (const BOSS of BOSSES) {
            if (!this.trackedBosses.has(BOSS)) {
                this.trackedBosses.set(
                    BOSS,
                    BOSS.onHealthChanged.on(() => this.trackHealth(BOSS)),
                );
                this.trackHealth(BOSS);
            }
        }
    }
    injuredAllies(out = []) {
        out.length = 0;
        const INJURED = this.injuredByFaction.get(this.friendlyFaction);
        if (INJURED) {
            for (const UNIT of INJURED) {
                out.push(UNIT);
            }
        }
        return out;
    }
    contextFor(role, casterId = null) {
        if (role !== 'boss') {
            return this;
        }
        if (!casterId) {
            return this.bossContext;
        }
        if (!this.bossContexts.has(casterId)) {
            const CONTEXT = Object.create(this.bossContext);
            CONTEXT.casterId = casterId;
            this.bossContexts.set(casterId, CONTEXT);
        }
        return this.bossContexts.get(casterId);
    }
    get caster() {
        return this.role === 'boss'
            ? this.world._unitForId(
                  this.casterId ||
                      this.currentBossCaster()?.id ||
                      this.world.bosses.find((boss) => boss.active && boss.hp > 0)?.id ||
                      this.world.boss.id,
              )
            : null;
    }
    currentBossCaster() {
        return this.runtime.bossCast
            ? this.world._unitForId(this.runtime.bossCast.casterId)
            : this.world.bosses.find(
                  (boss) =>
                      boss.active &&
                      boss.hp > 0 &&
                      boss.stun <= 0 &&
                      !boss.patternRuntime.active &&
                      boss.ability.phase === 'idle' &&
                      (!boss.specialAbility || boss.specialAbility.phase === 'idle') &&
                      boss.z <= 0.1 &&
                      boss.landingRecovery <= 0,
              );
    }
    get friendlyFaction() {
        return this.role === 'boss' ? 'enemy' : 'player';
    }
    get hostileFaction() {
        return this.role === 'boss' ? 'player' : 'enemy';
    }
    get runtime() {
        return this.world.formationRuntime;
    }
    get slots() {
        return this.runtime.slots;
    }
    get effects() {
        return this.runtime.effects;
    }
    get active() {
        return this.world.farmBossEvent?.phase === 'fighting';
    }
    synchronize() {
        this.synchronizeBossHealth();
        if (this.active && !this.runtime.active) {
            const SERIAL = this.runtime.serial;
            this.world.formationRuntime = createFormationRuntime();
            this.runtime.serial = SERIAL;
            this.runtime.active = true;
            // The relics won on this climb are the skills of every fight in it.
            for (const [ID, LEVEL] of this.world.tower.active ? this.world.tower.relics : []) {
                this.slots.push({ id: ID, ownerId: '', level: LEVEL, charge: 0, cooldown: 0 });
            }
            for (const [ID, LEVEL] of this.world.tower.active ? this.world.tower.bossRelics : []) {
                this.slots.push({ id: ID, ownerId: 'boss', role: 'boss', level: LEVEL, charge: 0, cooldown: 0 });
            }
        } else if (!this.active && this.runtime.active) {
            this.end();
        }
        if (this.runtime.active) {
            for (const SLOT of this.slots) {
                this.requiredFor(SLOT);
            }
        }
    }
    end() {
        this.releaseBossHealth();
        for (const UNIT of [...this.members, ...this.world.bosses]) {
            UNIT.giantUntil = 0;
            UNIT.giantBonusDamage = 0;
            UNIT.giantSizeMultiplier = MODELS.get('giant').definition.sizeMultiplier;
            UNIT.giantEndedAt = -10;
        }
        this.world.unitCollection.removeWhere((unit) => unit.isFormationClone, { markProgress: false });
        const SERIAL = this.runtime.serial;
        this.world.formationRuntime = createFormationRuntime();
        this.runtime.serial = SERIAL;
        this.air.clear();
    }
    requiredFor(slot, context = this.contextFor(slot.role || 'player'), force = false) {
        return MODELS.get(slot.id).requiredCharge(context, slot, force);
    }
    contribute(event) {
        this.synchronize();
        if (!this.runtime.active || event.excluded) {
            return;
        }
        for (const SLOT of this.slots) {
            const ROLE = SLOT.role || 'player',
                CONTEXT = this.contextFor(ROLE),
                ALLY_FACTION = event.allyDeaths > 0 ? event.sourceFaction : null;
            if (ALLY_FACTION ? ALLY_FACTION !== CONTEXT.friendlyFaction : ROLE !== (event.role || 'player')) {
                continue;
            }
            const MODEL = MODELS.get(SLOT.id),
                DEFINITION = MODEL.profile(CONTEXT);
            if (
                ROLE === 'boss' &&
                DEFINITION.condition === 'damageTaken' &&
                !this.world.isBoss(this.world._unitForId(event.targetActor))
            ) {
                continue;
            }
            if (
                ROLE === 'boss' &&
                (['hits', 'hitCharge'].includes(DEFINITION.condition) ||
                    (DEFINITION.damageCharge && DEFINITION.condition === 'damageDealt')) &&
                !this.world.isBoss(this.world._unitForId(event.sourceActor))
            ) {
                continue;
            }
            const REQUIRED = this.requiredFor(SLOT, CONTEXT),
                AMOUNT =
                    DEFINITION.condition === 'hitCharge'
                        ? (event.hits || 0) + (event.critHits || 0) * DEFINITION.criticalChargeBonus
                        : event[DEFINITION.condition] || 0;
            SLOT.charge = Math.min(REQUIRED, SLOT.charge + Math.max(0, AMOUNT));
        }
    }
    update(dt) {
        this.synchronize();
        if (!this.runtime.active) {
            return;
        }
        this.contribute({ time: dt });
        this.air.clear();
        for (const EFFECT of this.effects) {
            if (EFFECT.kind === 'ufo' || EFFECT.kind === 'storm-cloud') {
                this.air.insert(EFFECT);
            }
        }
        let write = 0;
        const COUNT = this.effects.length;
        for (let i = 0; i < COUNT; i++) {
            const EFFECT = this.effects[i];
            if (EFFECT.encounterId !== undefined && EFFECT.encounterId !== this.world.farmBossEvent.encounterId) {
                continue;
            }
            if (MODELS.get(EFFECT.kind).update(this.contextFor(EFFECT.role, EFFECT.casterId), EFFECT, dt)) {
                this.effects[write++] = EFFECT;
            }
        }
        this.effects.length = write;
        for (const SLOT of this.slots) {
            SLOT.cooldown = Math.max(0, SLOT.cooldown - dt);
        }
        this.updateBossCast(dt);
        for (const SLOT of this.slots) {
            if (SLOT.role === 'boss') {
                continue;
            }
            const MODEL = MODELS.get(SLOT.id);
            if (SLOT.cooldown < 1e-9 && SLOT.charge >= this.requiredFor(SLOT, this, true) && MODEL.cast(this, SLOT)) {
                SLOT.charge = 0;
                SLOT.cooldown = FORMATION_COOLDOWN_SECONDS;
                this.world.combat('formation-cast', { skillId: SLOT.id, x: 0, y: 0, z: 0 });
            }
        }
    }
    updateBossCast(dt) {
        let cast = this.runtime.bossCast;
        const BOSS = this.currentBossCaster(),
            CONTEXT = BOSS ? this.contextFor('boss', BOSS.id) : null;
        let failedId = null;
        if (
            !this.world.tower.active ||
            !BOSS?.active ||
            BOSS.hp <= 0 ||
            BOSS.stun > 0 ||
            (cast && BOSS.generation !== cast.casterGeneration)
        ) {
            // Before release the charge remains reserved, not consumed. Existing effects have their own lifetime.
            this.runtime.bossCast = null;
            return;
        }
        if (cast) {
            cast.elapsed += dt;
            if (cast.elapsed + 1e-9 < cast.duration) {
                return;
            }
            if (cast.phase === 'prepare') {
                const SLOT = this.slots.find((slot) => slot.role === 'boss' && slot.id === cast.id),
                    MODEL = SLOT && MODELS.get(SLOT.id);
                if (
                    MODEL &&
                    SLOT.charge >= this.requiredFor(SLOT, CONTEXT, true) &&
                    MODEL.canCast(CONTEXT, SLOT) &&
                    MODEL.cast(CONTEXT, SLOT)
                ) {
                    SLOT.charge = 0;
                    SLOT.cooldown = FORMATION_COOLDOWN_SECONDS;
                    this.world.combat('formation-cast', {
                        skillId: SLOT.id,
                        role: 'boss',
                        x: BOSS.x,
                        y: BOSS.y,
                        z: BOSS.z,
                    });
                    cast.phase = 'recover';
                    cast.elapsed = 0;
                    cast.duration = 0.45;
                    return;
                }
                // An empty release has no recovery; let another skill or physical pursuit proceed this tick.
                failedId = cast.id;
                this.runtime.bossRetrySkillId = failedId;
                this.runtime.bossCast = null;
            } else {
                this.runtime.bossCast = null;
                return;
            }
        }
        if (
            BOSS.patternRuntime.active ||
            BOSS.ability.phase !== 'idle' ||
            (BOSS.specialAbility && BOSS.specialAbility.phase !== 'idle') ||
            BOSS.z > 0.1 ||
            BOSS.landingRecovery > 0 ||
            !CONTEXT.enemy()
        ) {
            return;
        }
        // A failed preparation yields this tick and one subsequent selection,
        // even if eligibility returns immediately. This is not a cooldown and
        // never spends charge or changes the HUD's charged/ready state.
        const RETRY_ID = this.runtime.bossRetrySkillId;
        if (!failedId) {
            this.runtime.bossRetrySkillId = null;
        }
        const SLOT = this.slots.find(
            (slot) =>
                slot.role === 'boss' &&
                slot.id !== failedId &&
                slot.id !== RETRY_ID &&
                slot.cooldown < 1e-9 &&
                slot.charge >= this.requiredFor(slot, CONTEXT, true) &&
                MODELS.get(slot.id).canCast(CONTEXT, slot),
        );
        if (SLOT) {
            cast = {
                id: SLOT.id,
                casterId: BOSS.id,
                casterGeneration: BOSS.generation,
                phase: 'prepare',
                elapsed: 0,
                duration: 0.8,
                serial: ++this.runtime.serial,
            };
            this.runtime.bossCast = cast;
            BOSS.chaseVx = BOSS.chaseVy = 0;
        }
    }
    addEffect(kind, data) {
        const EFFECT = {
            id: ++this.runtime.serial,
            kind,
            role: this.role,
            encounterId: this.world.farmBossEvent.encounterId,
            ...(this.role === 'boss' ? { casterId: this.caster.id, casterGeneration: this.caster.generation } : {}),
            age: 0,
            x: 0,
            y: 0,
            z: 0,
            ...data,
        };
        this.effects.push(EFFECT);
        return EFFECT;
    }
    allies() {
        // Preserve the formation's existing allied roster (including waiting
        // troops); hostile selection separately uses the deployed combat view.
        const ALLIES = [...this.members];
        ALLIES.unshift(...this.world.bosses.filter((boss) => boss.active));
        return ALLIES.filter((unit) => unit.faction === this.friendlyFaction && unit.hp > 0);
    }
    targetId(target) {
        return target.id;
    }
    targetGeneration(target) {
        return target.generation;
    }
    target(id, generation) {
        const TARGET = this.world._unitForId(id);
        return TARGET?.hp > 0 &&
            TARGET.faction === this.hostileFaction &&
            (generation === undefined || TARGET.generation === generation)
            ? TARGET
            : null;
    }
    enemy(origin = null) {
        if (this.role === 'boss') {
            return this.enemies(origin, 18, 1)[0] || null;
        }
        for (const UNIT of this.world.combatUnits()) {
            if (
                UNIT.faction === this.hostileFaction &&
                UNIT.hp > 0 &&
                (!origin || Math.hypot(origin.x - UNIT.x, origin.y - UNIT.y) <= 18)
            ) {
                return UNIT;
            }
        }
        return null;
    }
    enemies(origin = null, range = Infinity, limit = Infinity) {
        const TARGETS = this.world
            .combatUnits()
            .filter(
                (unit) =>
                    unit.faction === this.hostileFaction &&
                    unit.hp > 0 &&
                    unit.dropLanded &&
                    !this.world._benched.has(unit),
            );
        const CENTER = origin || this.caster || this.world.boss;
        return TARGETS.filter((target) => Math.hypot(target.x - CENTER.x, target.y - CENTER.y) <= range)
            .sort(
                (a, b) =>
                    Math.hypot(a.x - CENTER.x, a.y - CENTER.y) - Math.hypot(b.x - CENTER.x, b.y - CENTER.y) ||
                    String(this.targetId(a)).localeCompare(String(this.targetId(b))),
            )
            .slice(0, limit);
    }
    verticalTargets(x, y, width, limit) {
        return this.enemies(null, Infinity)
            .filter((target) => target.z <= 0.5 && Math.hypot(target.x - x, target.y - y) <= target.radius + width / 2)
            .slice(0, limit);
    }
    nearby(x, y, radius) {
        this.world._beginSpatialQueryBatch();
        try {
            return this.world.unitSpatial.queryAABB(x - radius, y - radius, x + radius, y + radius, this.scratch);
        } finally {
            this.world._endSpatialQueryBatch();
        }
    }
    damage(target, amount, components = null) {
        if (!target || target.hp <= 0 || target.faction !== this.hostileFaction) {
            return;
        }
        amount = formationDamageForTarget(amount, components, unitMaxHpFor(target), target.hp);
        const GUARD = target.ability?.receiveGuard?.(this.world);
        amount *= (GUARD?.receivedDamageMultiplier ?? 1) * this.world.passiveReceivedScale(target);
        target.ability?.receiveRawDamage?.(this.world, amount);
        applyDamage(target, amount, { armor: this.world.combatTargetDefense(target).armor });
        this.world.passiveUndying(target);
        target.flash = 0.3;
        // A skill hit reads like any other hit: a burst on the body, a recoil, a shake. Bigger hits are stronger.
        const IS_BOSS = this.world.isBoss(target),
            MAX = Math.max(1, target.maxHp || target.hp || 1),
            STRENGTH = Math.min(3, 1 + (amount / MAX) * 8);
        this.world.combat(IS_BOSS ? 'boss-hit' : 'unit-hit', {
            targetId: target.id,
            unit: IS_BOSS ? 0 : target.id,
            ownerId: 0,
            species: 0,
            sourceUnit: 0,
            attackId: 0,
            strikeIndex: 0,
            attackKind: 'skill',
            buffed: false,
            critical: false,
            damage: amount,
            x: target.x,
            y: target.y,
            z: Math.max(0.2, (target.z || 0) + (target.height || 0.6) * 0.6),
            nx: 0,
            ny: 1,
            strength: STRENGTH,
        });
        this.world._syncUnitAliveCount(target);
        if (target.hp <= 0) {
            this.world.handleUnitDeath(target);
        }
    }
    verticalTarget(x, y) {
        return (
            this.world
                .combatUnits()
                .find(
                    (unit) =>
                        unit.faction === this.hostileFaction &&
                        unit.hp > 0 &&
                        unit.z <= 0.5 &&
                        Math.hypot(unit.x - x, unit.y - y) <= unit.radius + 0.12,
                ) || null
        );
    }
    areaDamage(x, y, radius, amount, knock = false, vertical = false, components = null) {
        const TARGETS = this.role === 'boss' ? this.enemies(null, Infinity) : this.world.combatUnits();
        for (const TARGET of TARGETS) {
            if (
                TARGET.faction !== this.hostileFaction ||
                TARGET.hp <= 0 ||
                Math.hypot(TARGET.x - x, TARGET.y - y) > radius + TARGET.radius ||
                (vertical && TARGET.z > 0.5)
            ) {
                continue;
            }
            this.damage(TARGET, amount, components);
            if (knock) {
                const DX = TARGET.x - x,
                    DY = TARGET.y - y,
                    N = Math.hypot(DX, DY) || 1;
                TARGET.knock(DX / N, DY / N, 5, 2);
            }
        }
    }
    canClone(count) {
        return this.world.unitCollection.items.length + count <= this.world.battleCapacity;
    }
    separateAir(effect, dt) {
        for (const OTHER of this.air.queryAABB(
            effect.x - 1.4,
            effect.y - 1.4,
            effect.x + 1.4,
            effect.y + 1.4,
            this.airScratch,
        )) {
            if (OTHER === effect) {
                continue;
            }
            const DX = effect.x - OTHER.x,
                DY = effect.y - OTHER.y,
                DISTANCE = Math.hypot(DX, DY),
                ANGLE = effect.id * 2.39996,
                FORCE = Math.max(0, 1.4 - DISTANCE) * Math.min(dt * 3, 0.25);
            effect.x += (DISTANCE ? DX / DISTANCE : Math.cos(ANGLE)) * FORCE;
            effect.y += (DISTANCE ? DY / DISTANCE : Math.sin(ANGLE)) * FORCE;
        }
        this.air.update(effect);
    }
    dispose() {
        this.releaseBossHealth();
        for (const OFF of this.subscriptions) {
            OFF();
        }
        this.air.clear();
        this.members.clear();
        this.injuredByFaction.clear();
    }
}
