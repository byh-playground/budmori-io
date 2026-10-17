import { unitBodyRadius } from '../unit-body/definition.cjs';
export const T1_DIAMETER = unitBodyRadius({ species: 0, tier: 1, growthElapsed: 1, growthDuration: 1 }) * 2;
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
        const ANGLE = owner.world.random() * Math.PI * 2;
        owner.addEffect(this.definition.id, {
            x: TARGET.x + Math.cos(ANGLE) * 0.6,
            y: TARGET.y + Math.sin(ANGLE) * 0.6,
            z: TARGET.height + 2,
            targetId: owner.targetId(TARGET),
            duration: this.definition.upgradeBase + this.definition.upgradeStep * (slot.level - 1),
            pulse: 0,
            lastPulse: -10,
            targetX: TARGET.x,
            targetY: TARGET.y,
            targetZ: TARGET.height,
        });
        return true;
    }
    update(owner, effect, dt) {
        effect.age += dt;
        const TARGET = owner.target(effect.targetId) || owner.enemy(effect);
        if (TARGET) {
            effect.targetId = owner.targetId(TARGET);
            const DX = TARGET.x - effect.x,
                DY = TARGET.y - effect.y,
                DISTANCE = Math.hypot(DX, DY),
                RATE = Math.min(1, (dt * 6) / Math.max(DISTANCE, 0.01));
            effect.x += DX * RATE;
            effect.y += DY * RATE;
            effect.z = TARGET.z + TARGET.height + 2;
            effect.targetX = TARGET.x;
            effect.targetY = TARGET.y;
            effect.targetZ = TARGET.z + TARGET.height * 0.6;
        }
        owner.separateAir(effect, dt);
        const ACTIVE_AGE = effect.age - 0.5;
        if (ACTIVE_AGE >= 0 && effect.pulse < Math.floor((effect.duration + 1e-9) / this.interval)) {
            const DUE = Math.min(
                Math.floor((Math.min(ACTIVE_AGE, effect.duration) + 1e-9) / this.interval),
                Math.floor((effect.duration + 1e-9) / this.interval),
            );
            while (effect.pulse < DUE) {
                effect.pulse++;
                if (TARGET && Math.hypot(TARGET.x - effect.x, TARGET.y - effect.y) <= 18) {
                    effect.lastPulse = effect.age;
                    this.strike(owner, effect, TARGET);
                }
            }
        }
        return effect.age < effect.duration + 1;
    }
}
