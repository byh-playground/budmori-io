import {
    createFormationRuntime,
    isValidFormationSkillState,
    FORMATION_MAX_LEVEL,
    FORMATION_COOLDOWN_SECONDS,
} from './formation-skill-state.js';
import { applyDamage, resolveKnockback, baseUnitStatsFor } from './unit-stats.js';
import { FixedSpatialGrid } from './spatial-grid.js';
import { GiantSkill } from './features/formation-skills/giant/model.js';
import { LightningSkill } from './features/formation-skills/lightning/model.js';
import { LargeMeteorSkill } from './features/formation-skills/meteor/model.js';
import { MeteorShowerSkill } from './features/formation-skills/meteor-shower/model.js';
import { CopySkill } from './features/formation-skills/copy/model.js';
import { HealingRainSkill } from './features/formation-skills/healing-rain/model.js';
import { HammerSkill } from './features/formation-skills/hammer/model.js';
import { UfoSkill } from './features/formation-skills/ufo/model.js';
import { StormCloudSkill } from './features/formation-skills/storm-cloud/model.js';
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
        this.members = new Set(world.units);
        this.injured = new Set();
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
                        this.injured.delete(UNIT);
                    }
                }
            }),
            world.unitCollection.onReset.on(() => {
                this.members = new Set(world.units);
                this.rebuildInjured();
            }),
            world.unitCollection.onReplaced.on(() => {
                this.members = new Set(world.units);
                this.rebuildInjured();
            }),
            world.unitCollection.onHealthChanged.on(({ unitId }) => {
                const UNIT = world._unitForId(unitId);
                if (UNIT) {
                    this.trackHealth(UNIT);
                }
            }),
            world.onCombatResolved.on((event) => this.contribute(event)),
        ];
    }
    trackHealth(unit) {
        const MAX_HP = unit.isFormationClone ? 1 : baseUnitStatsFor(unit.tier, unit.species).maxHp;
        if (unit.faction === 'player' && unit.hp > 0 && unit.hp < MAX_HP) {
            this.injured.add(unit);
        } else {
            this.injured.delete(unit);
        }
    }
    rebuildInjured() {
        this.injured.clear();
        for (const UNIT of this.members) {
            this.trackHealth(UNIT);
        }
    }
    injuredAllies(out = []) {
        out.length = 0;
        for (const UNIT of this.injured) {
            out.push(UNIT);
        }
        return out;
    }
    includeBuild(ownerId, state) {
        if (!this.runtime.active || this.slots.some((slot) => slot.ownerId === ownerId)) {
            return;
        }
        for (const ID of state.equipped) {
            if (ID) {
                this.slots.push({ id: ID, ownerId, level: state.levels[ID], charge: 0, cooldown: 0 });
            }
        }
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
    editable() {
        return this.world.scene === 'farm' && !this.world.running && this.world.farmBossEvent?.phase === 'idle';
    }
    purchase(id) {
        return this.world.mutationNotifications.run(() => {
            const PLAYER = this.world.playerProgression,
                STATE = PLAYER.formationSkills;
            if (
                !this.editable() ||
                !isValidFormationSkillState(STATE) ||
                typeof id !== 'string' ||
                !Object.hasOwn(STATE.levels, id) ||
                STATE.levels[id] >= FORMATION_MAX_LEVEL ||
                PLAYER.availablePoints < 1
            ) {
                return false;
            }
            STATE.levels[id]++;
            PLAYER.availablePoints--;
            this.world.markProgressChanged();
            return true;
        });
    }
    buySlot() {
        return this.world.mutationNotifications.run(() => {
            const PLAYER = this.world.playerProgression;
            if (!this.editable() || PLAYER.formationSkills.slots >= 3 || PLAYER.availablePoints < 1) {
                return false;
            }
            PLAYER.formationSkills.slots++;
            PLAYER.availablePoints--;
            this.world.markProgressChanged();
            return true;
        });
    }
    equip(slot, id) {
        return this.world.mutationNotifications.run(() => {
            const STATE = this.world.playerProgression.formationSkills;
            if (
                !this.editable() ||
                !Number.isInteger(slot) ||
                slot < 0 ||
                slot >= STATE.slots ||
                (id !== null &&
                    (typeof id !== 'string' ||
                        !Object.hasOwn(STATE.levels, id) ||
                        !STATE.levels[id] ||
                        STATE.equipped.includes(id)))
            ) {
                return false;
            }
            while (STATE.equipped.length <= slot) {
                STATE.equipped.push(null);
            }
            STATE.equipped[slot] = id;
            this.world.markProgressChanged();
            return true;
        });
    }
    synchronize() {
        if (this.active && !this.runtime.active) {
            const SERIAL = this.runtime.serial;
            this.world.formationRuntime = createFormationRuntime();
            this.runtime.serial = SERIAL;
            this.rebuildInjured();
            this.runtime.active = true;
            const BUILDS = [{ ownerId: '', state: this.world.playerProgression.formationSkills }];
            for (const BUILD of BUILDS) {
                for (const ID of BUILD.state.equipped) {
                    if (ID) {
                        this.slots.push({
                            id: ID,
                            ownerId: BUILD.ownerId,
                            level: BUILD.state.levels[ID],
                            charge: 0,
                            cooldown: 0,
                        });
                    }
                }
            }
        } else if (!this.active && this.runtime.active) {
            this.end();
        }
    }
    end() {
        for (const UNIT of this.members) {
            UNIT.giantUntil = 0;
            UNIT.giantEndedAt = -10;
        }
        this.world.unitCollection.removeWhere((unit) => unit.isFormationClone, { markProgress: false });
        const SERIAL = this.runtime.serial;
        this.world.formationRuntime = createFormationRuntime();
        this.runtime.serial = SERIAL;
        this.air.clear();
    }
    contribute(event) {
        this.synchronize();
        if (!this.runtime.active || event.excluded) {
            return;
        }
        for (const SLOT of this.slots) {
            const DEFINITION = MODELS.get(SLOT.id).definition;
            SLOT.charge = Math.min(DEFINITION.required, SLOT.charge + Math.max(0, event[DEFINITION.condition] || 0));
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
            if (MODELS.get(EFFECT.kind).update(this, EFFECT, dt)) {
                this.effects[write++] = EFFECT;
            }
        }
        this.effects.length = write;
        for (const SLOT of this.slots) {
            SLOT.cooldown = Math.max(0, SLOT.cooldown - dt);
            const MODEL = MODELS.get(SLOT.id);
            if (SLOT.cooldown < 1e-9 && SLOT.charge >= MODEL.definition.required && MODEL.cast(this, SLOT)) {
                SLOT.charge = 0;
                SLOT.cooldown = FORMATION_COOLDOWN_SECONDS;
                this.world.combat('formation-cast', { skillId: SLOT.id, x: 0, y: 0, z: 0 });
            }
        }
    }
    addEffect(kind, data) {
        const EFFECT = { id: ++this.runtime.serial, kind, age: 0, x: 0, y: 0, z: 0, ...data };
        this.effects.push(EFFECT);
        return EFFECT;
    }
    allies() {
        return [...this.members].filter((unit) => unit.faction === 'player' && unit.hp > 0);
    }
    targetId(target) {
        return target === this.world.boss ? 'boss' : target.id;
    }
    target(id) {
        const TARGET = id === 'boss' ? this.world.boss : this.world._unitForId(id);
        return TARGET?.hp > 0 && TARGET.faction === 'enemy' ? TARGET : null;
    }
    enemy(origin = null) {
        const BOSS = this.world.boss;
        if (BOSS.active && BOSS.hp > 0 && (!origin || Math.hypot(origin.x - BOSS.x, origin.y - BOSS.y) <= 18)) {
            return BOSS;
        }
        for (const UNIT of this.members) {
            if (
                UNIT.faction === 'enemy' &&
                UNIT.hp > 0 &&
                (!origin || Math.hypot(origin.x - UNIT.x, origin.y - UNIT.y) <= 18)
            ) {
                return UNIT;
            }
        }
        return null;
    }
    nearby(x, y, radius) {
        this.world._beginSpatialQueryBatch();
        try {
            return this.world.unitSpatial.queryAABB(x - radius, y - radius, x + radius, y + radius, this.scratch);
        } finally {
            this.world._endSpatialQueryBatch();
        }
    }
    damage(target, amount) {
        if (!target || target.hp <= 0) {
            return;
        }
        applyDamage(target, amount, { armor: this.world.combatTargetDefense(target).armor });
        target.flash = 0.15;
        if (target !== this.world.boss) {
            this.world._syncUnitAliveCount(target);
            if (target.hp <= 0) {
                this.world.handleUnitDeath(target);
            }
        }
    }
    verticalTarget(x, y) {
        const BOSS = this.world.boss;
        if (BOSS.active && BOSS.hp > 0 && BOSS.z <= 0.5 && Math.hypot(BOSS.x - x, BOSS.y - y) <= BOSS.radius + 0.12) {
            return BOSS;
        }
        return (
            this.nearby(x, y, 6).find(
                (unit) =>
                    unit.faction === 'enemy' &&
                    unit.hp > 0 &&
                    unit.z <= 0.5 &&
                    Math.hypot(unit.x - x, unit.y - y) <= unit.radius + 0.12,
            ) || null
        );
    }
    areaDamage(x, y, radius, amount, knock = false, vertical = false) {
        const TARGETS = [...this.nearby(x, y, radius + 6)];
        if (this.world.boss.active) {
            TARGETS.push(this.world.boss);
        }
        for (const TARGET of TARGETS) {
            if (
                TARGET.faction !== 'enemy' ||
                TARGET.hp <= 0 ||
                Math.hypot(TARGET.x - x, TARGET.y - y) > radius + TARGET.radius ||
                (vertical && TARGET.z > 0.5)
            ) {
                continue;
            }
            this.damage(TARGET, amount);
            if (knock) {
                const DX = TARGET.x - x,
                    DY = TARGET.y - y,
                    N = Math.hypot(DX, DY) || 1;
                if (TARGET.knock) {
                    TARGET.knock(DX / N, DY / N, 5, 2);
                } else {
                    const POWER = resolveKnockback(5, null, TARGET);
                    TARGET.knockVx += (DX / N) * POWER;
                    TARGET.knockVy += (DY / N) * POWER;
                }
            }
        }
    }
    canClone(count) {
        return this.world.units.length + count <= this.world.battleCapacity;
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
        for (const OFF of this.subscriptions) {
            OFF();
        }
        this.air.clear();
        this.members.clear();
        this.injured.clear();
    }
}
