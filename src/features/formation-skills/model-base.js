import { unitBodyRadius } from '../unit-body/definition.js';
export const T1_DIAMETER = unitBodyRadius({ species: 0, tier: 1, growthElapsed: 1, growthDuration: 1 }) * 2;
// A size reference changes parameters, never the shared skill's targeting or damage algorithm.
export const CASTER_SIZE_PROFILE = Object.freeze({ sizeReference: 'caster', sizeScale: 0.8 });
// A unit's skill is as big as the body it is aimed at, at the same scale a boss's skill is of its caster.
export const TARGET_SIZE_PROFILE = Object.freeze({ sizeReference: 'target', sizeScale: 0.8 });

// Ratios are shares of the resolved diameter. Radius and full-width parameters remain distinct.
export function sizeValue(profile, size, name) {
    const RATIO = profile[`${name}Ratio`];
    return Number.isFinite(RATIO) ? size.sizeRadius * 2 * RATIO : (profile[name] ?? 0);
}

// The size effects are drawn against: a unit's and a boss's hit volume is its drawn body.
export function targetBodyDimensions(target) {
    const BODY_HEIGHT = Number.isFinite(target?.height) ? Math.max(0, target.height) : T1_DIAMETER * 1.7,
        BODY_RADIUS = Number.isFinite(target?.radius) ? Math.max(0, target.radius) : T1_DIAMETER * 0.5,
        BASE_Z = Number.isFinite(target?.z) ? target.z : 0;
    return {
        z: BASE_Z,
        bodyHeight: BODY_HEIGHT,
        bodyRadius: BODY_RADIUS,
        topZ: BASE_Z + BODY_HEIGHT,
    };
}

function targetTop(_owner, target) {
    const BODY = targetBodyDimensions(target),
        MARGIN = Math.max(T1_DIAMETER * 0.12, BODY.bodyHeight * 0.06);
    return BODY.topZ + MARGIN;
}

export class FormationSkill {
    constructor(definition) {
        this.definition = definition;
    }
    profile(owner) {
        return owner.role === 'boss' ? { ...this.definition, ...this.definition.boss } : this.definition;
    }
    sizeState(owner, target) {
        const PROFILE = this.profile(owner),
            REFERENCE = PROFILE.sizeReference === 'caster' ? owner.caster : target,
            BODY = targetBodyDimensions(REFERENCE),
            SCALE = PROFILE.sizeScale ?? 1;
        // radius/height already include the reference's current giant scale. Do not apply it again.
        return { sizeRadius: BODY.bodyRadius * SCALE, sizeHeight: BODY.bodyHeight * SCALE };
    }
    power(level, base) {
        return base * (this.definition.upgradeFactor ?? 1.5) ** (level - 1);
    }
    canCast(owner) {
        // Offensive skills share target eligibility; allied skills override it without rolling targets.
        return Boolean(owner.enemy());
    }
    cast(_owner, _slot) {
        return false;
    }
    update(_owner, effect, dt) {
        effect.age += dt;
        return effect.age <= effect.duration;
    }
}
export class MeteorSkill extends FormationSkill {
    // The blast follows the size reference but never shrinks below the tier-1 radius, so a small target
    // (a summoned minion) still gets the area a unit's meteor always had.
    areaValue(profile, size, name) {
        return Math.max(profile[name] ?? 0, sizeValue(profile, size, name));
    }
    launch(owner, slot, index = 0) {
        const TARGET = owner.enemy();
        if (!TARGET) {
            return false;
        }
        const PROFILE = this.profile(owner),
            SIZE = this.sizeState(owner, TARGET),
            ANGLE = owner.world.random() * Math.PI * 2,
            DISTANCE =
                Math.sqrt(owner.world.random()) *
                (targetBodyDimensions(TARGET).bodyRadius + this.areaValue(PROFILE, SIZE, 'scatterRadius'));
        owner.addEffect(this.definition.id, {
            x: TARGET.x + Math.cos(ANGLE) * DISTANCE,
            y: TARGET.y + Math.sin(ANGLE) * DISTANCE,
            z: 12,
            delay: index * PROFILE.shotInterval,
            fallSeconds: PROFILE.fallSeconds,
            duration: index * PROFILE.shotInterval + PROFILE.fallSeconds + 0.5,
            ...SIZE,
            radius: this.areaValue(PROFILE, SIZE, 'aoeRadius'),
            damage: PROFILE.shotDamage ?? this.power(slot.level, PROFILE.upgradeBase),
            impacted: false,
        });
        return true;
    }
    cast(owner, slot) {
        return this.launch(owner, slot);
    }
    update(owner, effect, dt) {
        effect.age += dt;
        if (!effect.impacted && effect.age + 1e-9 >= effect.delay + (effect.fallSeconds ?? 0.75)) {
            effect.impacted = true;
            owner.areaDamage(effect.x, effect.y, effect.radius, effect.damage, this.knockback === true);
        }
        return effect.age < effect.duration;
    }
}
export class FlyingSkill extends FormationSkill {
    cast(owner, slot) {
        const TARGET = owner.enemy();
        if (!TARGET) {
            return false;
        }
        const ANGLE = owner.world.random() * Math.PI * 2,
            STATE = this.effectState(owner, TARGET, slot, ANGLE);
        owner.addEffect(this.definition.id, STATE);
        return true;
    }
    flyingSizeState(owner, target) {
        const PROFILE = this.profile(owner),
            SIZE = this.sizeState(owner, target);
        return {
            ...SIZE,
            visualWidth: sizeValue(PROFILE, SIZE, 'visualWidth'),
            beamWidth: sizeValue(PROFILE, SIZE, 'beamWidth'),
            targetRange: sizeValue(PROFILE, SIZE, 'targetRange'),
        };
    }
    effectState(owner, target, slot, angle) {
        const PROFILE = this.profile(owner),
            BODY = targetBodyDimensions(target),
            TARGET_Z = targetTop(owner, target);
        return {
            x: target.x + Math.cos(angle) * 0.6,
            y: target.y + Math.sin(angle) * 0.6,
            z: TARGET_Z + 2,
            ...this.flyingSizeState(owner, target),
            bodyHeight: BODY.bodyHeight,
            bodyRadius: BODY.bodyRadius,
            targetId: owner.targetId(target),
            targetGeneration: owner.targetGeneration?.(target),
            targetCount: PROFILE.targetCount,
            duration: PROFILE.upgradeBase + PROFILE.upgradeStep * (slot.level - 1),
            pulse: 0,
            lastPulse: -10,
            targetX: target.x,
            targetY: target.y,
            targetZ: TARGET_Z,
        };
    }
    onPulse(_owner, _effect, _target) {}
    strike(_owner, _effect, _target) {}
    track(owner, effect, dt) {
        const TARGET = owner.target(effect.targetId, effect.targetGeneration) || owner.enemy(effect);
        if (TARGET) {
            const BODY = targetBodyDimensions(TARGET);
            const ID = owner.targetId(TARGET),
                GENERATION = owner.targetGeneration?.(TARGET);
            if (ID !== effect.targetId || GENERATION !== effect.targetGeneration) {
                effect.readyAt = effect.age + this.profile(owner).retargetDelaySeconds;
            }
            effect.targetId = ID;
            effect.targetGeneration = GENERATION;
            const DX = TARGET.x - effect.x,
                DY = TARGET.y - effect.y,
                TARGET_Z = targetTop(owner, TARGET),
                RATE = 1 - Math.exp(-dt * 6);
            effect.x += DX * RATE;
            effect.y += DY * RATE;
            effect.z += (TARGET_Z + 2 - effect.z) * RATE;
            effect.targetX = TARGET.x;
            effect.targetY = TARGET.y;
            effect.targetZ = TARGET_Z;
            effect.bodyHeight = BODY.bodyHeight;
            effect.bodyRadius = BODY.bodyRadius;
            Object.assign(effect, this.flyingSizeState(owner, TARGET));
        }
        return TARGET;
    }
    update(owner, effect, dt) {
        effect.age += dt;
        const TARGET = this.track(owner, effect, dt);
        owner.separateAir(effect, dt);
        const ACTIVE_AGE = effect.age - 0.5;
        const INTERVAL = this.profile(owner).pulseInterval;
        if (ACTIVE_AGE >= 0 && effect.pulse < Math.floor((effect.duration + 1e-9) / INTERVAL)) {
            const DUE = Math.min(
                Math.floor((Math.min(ACTIVE_AGE, effect.duration) + 1e-9) / INTERVAL),
                Math.floor((effect.duration + 1e-9) / INTERVAL),
            );
            while (effect.pulse < DUE) {
                effect.pulse++;
                if (effect.age < (effect.readyAt ?? 0)) {
                    continue;
                }
                effect.lastPulse = effect.age;
                this.onPulse(owner, effect, TARGET);
                if (TARGET && Math.hypot(TARGET.x - effect.x, TARGET.y - effect.y) <= 18) {
                    this.strike(owner, effect, TARGET);
                }
            }
        }
        return effect.age < effect.duration + 1;
    }
}
