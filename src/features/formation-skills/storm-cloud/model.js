import { DEFINITION } from './definition.js';
import { FlyingSkill, targetBodyDimensions } from '../model-base.js';

export class StormCloudSkill extends FlyingSkill {
    constructor() {
        super(DEFINITION);
    }
    track(owner, effect, dt) {
        const PROFILE = this.profile(owner);
        if (PROFILE.targetCount === 1) {
            return super.track(owner, effect, dt);
        }
        const PREVIOUS = effect.targets ?? [],
            PRIMARY = owner.target(effect.targetId, effect.targetGeneration) || owner.enemy(effect),
            ORIGIN = PRIMARY ?? effect,
            TARGETS = owner.enemies(ORIGIN, PROFILE.targetRange, PROFILE.targetCount);
        effect.targets = TARGETS.map((target) => {
            const ID = owner.targetId(target),
                GENERATION = owner.targetGeneration?.(target),
                OLD = PREVIOUS.find((entry) => entry.id === ID && entry.generation === GENERATION),
                BODY = targetBodyDimensions(target);
            return {
                id: ID,
                generation: GENERATION,
                x: target.x,
                y: target.y,
                z: BODY.topZ,
                bodyRadius: BODY.bodyRadius,
                bodyHeight: BODY.bodyHeight,
                readyAt: OLD?.readyAt ?? effect.age + PROFILE.retargetDelaySeconds,
            };
        });
        if (TARGETS.length === 0) {
            return null;
        }
        const LEFT = Math.min(...effect.targets.map((target) => target.x - target.bodyRadius)),
            RIGHT = Math.max(...effect.targets.map((target) => target.x + target.bodyRadius)),
            FRONT = Math.min(...effect.targets.map((target) => target.y - target.bodyRadius)),
            BACK = Math.max(...effect.targets.map((target) => target.y + target.bodyRadius)),
            TOP = Math.max(...effect.targets.map((target) => target.z)),
            MAX_RADIUS = Math.max(...effect.targets.map((target) => target.bodyRadius)),
            RATE = 1 - Math.exp(-dt * 6);
        effect.targetId = owner.targetId(TARGETS[0]);
        effect.targetGeneration = owner.targetGeneration?.(TARGETS[0]);
        effect.x += ((LEFT + RIGHT) / 2 - effect.x) * RATE;
        effect.y += ((FRONT + BACK) / 2 - effect.y) * RATE;
        effect.z += (TOP + 2 - effect.z) * RATE;
        effect.targetZ = TOP;
        effect.bodyRadius = MAX_RADIUS;
        effect.cloudSize = Math.min(PROFILE.cloudWidthCap / 3.68, Math.max(MAX_RADIUS * 1.43, (RIGHT - LEFT) / 2));
        return TARGETS[0];
    }
    strike(owner, effect, target) {
        const PROFILE = this.profile(owner);
        if (PROFILE.targetCount === 1) {
            owner.damage(target, PROFILE.pulseDamage);
            return;
        }
        for (const REFERENCE of effect.targets) {
            const TARGET = owner.target(REFERENCE.id, REFERENCE.generation);
            if (TARGET && effect.age >= REFERENCE.readyAt) {
                owner.damage(TARGET, PROFILE.pulseDamage);
            }
        }
    }
}
