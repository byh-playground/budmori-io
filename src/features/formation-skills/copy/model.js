import { DEFINITION } from './definition.js';
import { FormationSkill, T1_DIAMETER } from '../model-base.js';
export class CopySkill extends FormationSkill {
    constructor() {
        super(DEFINITION);
    }
    cast(owner, slot) {
        const ORIGINALS = owner.allies().filter((unit) => !unit.isFormationClone),
            RADIUS = this.power(slot.level, T1_DIAMETER * this.definition.upgradeBase);
        let center = null;
        let targets = [];
        for (const UNIT of ORIGINALS) {
            const NEAR = owner
                .nearby(UNIT.x, UNIT.y, RADIUS)
                .filter(
                    (candidate) =>
                        candidate.faction === 'player' &&
                        !candidate.isFormationClone &&
                        candidate.hp > 0 &&
                        Math.hypot(candidate.x - UNIT.x, candidate.y - UNIT.y) <= RADIUS,
                );
            if (NEAR.length > targets.length) {
                center = UNIT;
                targets = NEAR;
            }
        }
        if (!center || !targets.length || !owner.canClone(targets.length)) {
            return false;
        }
        owner.addEffect(DEFINITION.id, { x: center.x, y: center.y, radius: RADIUS, duration: 0.7 });
        for (const UNIT of targets) {
            owner.world.createFormationClone(UNIT);
        }
        return true;
    }
}
