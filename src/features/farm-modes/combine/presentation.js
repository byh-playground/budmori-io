import { COMBINE_AIR } from './definition.js';

const CLAMP = (value) => Math.max(0, Math.min(1, value));
const EASE = (value) => value * value * (3 - 2 * value);

// Borrow committed tasks synchronously; no actor clones, model coordinates or consumption changes.
export class CombinePresentation {
    constructor() {
        this.parts = new Map();
        this.visuals = new Map();
    }
    prepare(world) {
        this.parts.clear();
        for (const TASK of world.mergeTasks || []) {
            if (!(TASK.partnerSpecies >= 0)) {
                continue;
            }
            if (TASK.phase === 'approach') {
                for (const START of TASK.startPositions) {
                    this.parts.set(START.id, { task: TASK, start: START });
                }
            } else if (TASK.phase === 'animation') {
                this.parts.set(TASK.resultId, { task: TASK });
            }
        }
        for (const ID of this.visuals.keys()) {
            if (!this.parts.has(ID)) {
                this.visuals.delete(ID);
            }
        }
    }
    display(unit) {
        const PART = this.parts.get(unit.id);
        if (!PART || unit.hp <= 0) {
            return unit;
        }
        const { task: TASK, start: START } = PART;
        let visual = this.visuals.get(unit.id);
        if (!visual) {
            visual = {};
            this.visuals.set(unit.id, visual);
        }
        Object.assign(visual, unit);
        const HEIGHT = Math.max(0, TASK.centerZ - unit.height * 0.55);
        if (START) {
            const P = CLAMP(TASK.elapsed / TASK.duration),
                RISE = EASE(CLAMP(P / COMBINE_AIR.riseShare)),
                MOVE = EASE(CLAMP((P - COMBINE_AIR.riseShare) / (1 - COMBINE_AIR.riseShare)));
            visual.x = START.x + (TASK.centerX - START.x) * MOVE;
            visual.y = START.y + (TASK.centerY - START.y) * MOVE;
            visual.z = START.z + (HEIGHT - START.z) * RISE;
        } else {
            const P = EASE(CLAMP((TASK.elapsed - COMBINE_AIR.revealDelay) / (TASK.duration - COMBINE_AIR.revealDelay)));
            visual.x = TASK.centerX + (unit.x - TASK.centerX) * P;
            visual.y = TASK.centerY + (unit.y - TASK.centerY) * P;
            visual.z = HEIGHT + (unit.z - HEIGHT) * P;
        }
        return visual;
    }
}
