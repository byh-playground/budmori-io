import { unitBodyRadius, bossBodyHeight, bossBodyRadius } from '../unit-body/definition.cjs';
export const T1_DIAMETER = unitBodyRadius({ species: 0, tier: 1, growthElapsed: 1, growthDuration: 1 }) * 2;

// The size effects are drawn against: the body as it is rendered, never the gameplay hit volume of a boss.
export function targetBodyDimensions(target) {
    const BOSS = target?.isBoss === true,
        BODY_HEIGHT = BOSS
            ? bossBodyHeight(target)
            : Number.isFinite(target?.height)
              ? Math.max(0, target.height)
              : T1_DIAMETER * 1.7,
        BODY_RADIUS = BOSS
            ? bossBodyRadius(target)
            : Number.isFinite(target?.radius)
              ? Math.max(0, target.radius)
              : T1_DIAMETER * 0.5,
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
    power(level, base) {
        return base * (this.definition.upgradeFactor ?? 1.5) ** (level - 1);
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
    launch(owner, slot, index = 0) {
        const TARGET = owner.enemy();
        if (!TARGET) {
            return false;
        }
        const ANGLE = owner.world.random() * Math.PI * 2,
            DISTANCE = Math.sqrt(owner.world.random()) * (TARGET.radius + T1_DIAMETER * 3);
        owner.addEffect(this.definition.id, {
            x: TARGET.x + Math.cos(ANGLE) * DISTANCE,
            y: TARGET.y + Math.sin(ANGLE) * DISTANCE,
            z: 12,
            delay: index * 0.25,
            duration: index * 0.25 + 1.25,
            radius: T1_DIAMETER * 3,
            damage: this.power(slot.level, this.definition.upgradeBase),
            impacted: false,
        });
        return true;
    }
    cast(owner, slot) {
        return this.launch(owner, slot);
    }
    update(owner, effect, dt) {
        effect.age += dt;
        if (!effect.impacted && effect.age + 1e-9 >= effect.delay + 0.75) {
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
    effectState(owner, target, slot, angle) {
        const BODY = targetBodyDimensions(target),
            TARGET_Z = targetTop(owner, target);
        return {
            x: target.x + Math.cos(angle) * 0.6,
            y: target.y + Math.sin(angle) * 0.6,
            z: TARGET_Z + 2,
            bodyHeight: BODY.bodyHeight,
            bodyRadius: BODY.bodyRadius,
            targetId: owner.targetId(target),
            duration: this.definition.upgradeBase + this.definition.upgradeStep * (slot.level - 1),
            pulse: 0,
            lastPulse: -10,
            targetX: target.x,
            targetY: target.y,
            targetZ: TARGET_Z,
        };
    }
    onPulse(_owner, _effect, _target) {}
    strike(_owner, _effect, _target) {}
    update(owner, effect, dt) {
        effect.age += dt;
        const TARGET = owner.target(effect.targetId) || owner.enemy(effect);
        if (TARGET) {
            const BODY = targetBodyDimensions(TARGET);
            effect.targetId = owner.targetId(TARGET);
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
        }
        owner.separateAir(effect, dt);
        const ACTIVE_AGE = effect.age - 0.5;
        const INTERVAL = this.definition.pulseInterval;
        if (ACTIVE_AGE >= 0 && effect.pulse < Math.floor((effect.duration + 1e-9) / INTERVAL)) {
            const DUE = Math.min(
                Math.floor((Math.min(ACTIVE_AGE, effect.duration) + 1e-9) / INTERVAL),
                Math.floor((effect.duration + 1e-9) / INTERVAL),
            );
            while (effect.pulse < DUE) {
                effect.pulse++;
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
