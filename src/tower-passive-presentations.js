// What the player sees of the tower's passive cards: thin marks on a unit while its card is working, and short effects for
// the moments they fire. Everything is sized from the drawn body (`radius`, `height`) and kept close to the unit.
const FULL_TURN = Math.PI * 2;
const EASE_OUT = (t) => 1 - (1 - t) ** 2;

// Marks on a unit: embers while it fights from low health (last stand), a gold ring while it takes less damage (resolve),
// a red ring that deepens with every fallen ally (vengeance) and speed streaks in the opening seconds.
export class PassiveMarksPresentation {
    drawUnit(renderer, u, time) {
        if (u.hp <= 0) {
            return;
        }
        if (u.lastStandOn) {
            this.drawEmbers(renderer, u, time);
        }
        if (u.resolveOn) {
            renderer.ring(
                u.x,
                u.y,
                u.radius * 1.25,
                `rgba(255,214,102,${0.55 + 0.3 * Math.sin(time * 5 + u.seed)})`,
                0.045,
                0,
                FULL_TURN,
                u.height * 0.45,
            );
        }
        if (u.vengeanceStacks > 0) {
            renderer.ring(
                u.x,
                u.y,
                u.radius * 1.4,
                `rgba(226,70,70,${0.22 + 0.06 * u.vengeanceStacks})`,
                0.03 + 0.006 * u.vengeanceStacks,
            );
        }
        if (u.openingLeft > 0) {
            this.drawStreaks(renderer, u);
        }
    }
    drawEmbers(renderer, u, time) {
        for (let index = 0; index < 3; index++) {
            const PHASE = (time * 0.9 + u.seed * 0.37 + index / 3) % 1,
                SIDE = Math.sin(u.seed * 1.7 + index * 2.1) * u.radius * 0.7,
                POINT = renderer.project(u.x + SIDE, u.y, u.z + PHASE * u.height * 0.9);
            renderer.ellipse(
                POINT.x,
                POINT.y,
                renderer.scale * 0.05 * (1 - PHASE * 0.5),
                renderer.scale * 0.05 * (1 - PHASE * 0.5),
                `rgba(255,110,60,${(1 - PHASE) * 0.9})`,
            );
        }
    }
    drawStreaks(renderer, u) {
        const SPEED = Math.hypot(u.vx || 0, u.vy || 0),
            DX = SPEED > 0.2 ? u.vx / SPEED : Math.cos(u.angle),
            DY = SPEED > 0.2 ? u.vy / SPEED : Math.sin(u.angle),
            ALPHA = Math.min(1, u.openingLeft) * 0.6;
        for (let index = 0; index < 3; index++) {
            const LIFT = u.height * (0.25 + index * 0.22),
                NEAR = u.radius * (0.9 + index * 0.1),
                FAR = NEAR + u.radius * (1.4 + index * 0.3);
            renderer.line(
                renderer.project(u.x - DX * NEAR, u.y - DY * NEAR, u.z + LIFT),
                renderer.project(u.x - DX * FAR, u.y - DY * FAR, u.z + LIFT),
                0.04,
                `rgba(255,240,170,${ALPHA})`,
            );
        }
    }
}

// The gold shield of an undying save breaks into shards around the unit.
export class UndyingPresentation {
    lifeMs = 750;
    draw(renderer, event, progress) {
        const T = Math.min(1, progress),
            ALPHA = 1 - T,
            MID = (event.z || 0) + event.height * 0.5,
            CENTER = renderer.project(event.x, event.y, MID);
        renderer.ring(
            event.x,
            event.y,
            event.radius * (1 + 0.7 * EASE_OUT(T)),
            `rgba(255,214,102,${ALPHA})`,
            0.06,
            0,
            FULL_TURN,
            event.height * 0.5,
        );
        for (let index = 0; index < 8; index++) {
            const ANGLE = (index * FULL_TURN) / 8 + 0.3,
                REACH = renderer.scale * (event.radius * (0.9 + 1.2 * EASE_OUT(T))),
                START = REACH * 0.7;
            renderer.line(
                { x: CENTER.x + Math.cos(ANGLE) * START, y: CENTER.y + Math.sin(ANGLE) * START * 0.7 },
                { x: CENTER.x + Math.cos(ANGLE) * REACH, y: CENTER.y + Math.sin(ANGLE) * REACH * 0.7 },
                0.05,
                `rgba(255,236,170,${ALPHA})`,
            );
        }
        if (T < 0.25) {
            renderer.ellipse(
                CENTER.x,
                CENTER.y,
                renderer.scale * event.radius * 1.1 * (1 - T * 3),
                renderer.scale * event.radius * 0.8 * (1 - T * 3),
                `rgba(255,255,255,${0.7 * (1 - T * 4)})`,
            );
        }
    }
}

// Motes that fly from a fallen ally to the allies standing near it.
class MotesPresentation {
    lifeMs = 850;
    draw(renderer, event, progress) {
        const T = Math.min(1, progress);
        for (const TARGET of event.targets) {
            const E = EASE_OUT(T),
                X = event.x + (TARGET.x - event.x) * E,
                Y = event.y + (TARGET.y - event.y) * E,
                START_Z = (event.z || 0) + event.height * 0.5,
                END_Z = (TARGET.z || 0) + TARGET.height * 0.5,
                Z = START_Z + (END_Z - START_Z) * E + Math.sin(T * Math.PI) * 0.8,
                POINT = renderer.project(X, Y, Z);
            renderer.ellipse(
                POINT.x,
                POINT.y,
                renderer.scale * 0.1 * (1 - T * 0.4),
                renderer.scale * 0.06 * (1 - T * 0.4),
                this.color(1 - T * 0.5),
                T * 9,
            );
            if (T > 0.8) {
                renderer.ring(
                    TARGET.x,
                    TARGET.y,
                    0.15 + (T - 0.8) * 2.5,
                    this.color((1 - T) * 4),
                    0.04,
                    0,
                    FULL_TURN,
                    TARGET.height * 0.5,
                );
            }
        }
    }
}
export class HelperPresentation extends MotesPresentation {
    color(alpha) {
        return `rgba(120,220,140,${alpha})`;
    }
}
export class VengeancePresentation extends MotesPresentation {
    color(alpha) {
        return `rgba(235,70,70,${alpha})`;
    }
}

export const PASSIVE_PRESENTATION_EVENTS = Object.freeze([
    ['passive-undying', new UndyingPresentation()],
    ['passive-helper', new HelperPresentation()],
    ['passive-vengeance', new VengeancePresentation()],
]);
