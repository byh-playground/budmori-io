import { createPeanutStrikeSchedule, resolveStrikeMask, PEANUT_BASE_STRIKE } from '../../../unit-combat-patterns.js';

export function createDualStrikeMixin(pathMotion, arenaGeometry) {
    const PATH_MOTION = pathMotion;
    const REPEATED_STRIKE = (base) =>
        class extends PATH_MOTION(base) {
            get strikeDuration() {
                return this.spec.timing.active ?? PEANUT_BASE_STRIKE.activeSeconds;
            }
            prepareAttack(sim) {
                super.prepareAttack?.(sim);
                const ASSAULT_LOCAL = this.strikeConfig?.(sim);
                Object.assign(this.action, {
                    resolvedMask: 0,
                    hitMask: 0,
                    peanutStrikeCount: ASSAULT_LOCAL?.strikeCount || PEANUT_BASE_STRIKE.count,
                    peanutAttackMultiplier: ASSAULT_LOCAL?.attackMultiplier ?? PEANUT_BASE_STRIKE.attackMultiplier,
                    peanutSpreadRadians: ASSAULT_LOCAL?.spreadRadians ?? PEANUT_BASE_STRIKE.spreadRadians,
                });
            }
            createAttackPath() {
                const U = this.owner;
                this.action.path = {
                    from: {
                        x: U.x,
                        y: U.y,
                        z: 0,
                    },
                    to: {
                        x: U.x,
                        y: U.y,
                        z: 0,
                    },
                    height: 0,
                    duration: this.strikeDuration,
                };
            }
            afterMove(sim) {
                const A = this.action,
                    U = this.owner;
                if (this.phase !== 'active' || !A?.path) {
                    return;
                }
                const SCHEDULE = createPeanutStrikeSchedule({
                    strikeCount: A.peanutStrikeCount || 2,
                    attackMultiplier: A.peanutAttackMultiplier ?? PEANUT_BASE_STRIKE.attackMultiplier,
                    spreadRadians: A.peanutSpreadRadians ?? Math.PI / 12,
                    activeSeconds: this.strikeDuration,
                });
                for (const SLOT of SCHEDULE) {
                    if (
                        this.elapsed + 1e-9 < SLOT.dueSeconds ||
                        ((A.resolvedMask || 0) & (1 << SLOT.strikeIndex)) !== 0
                    ) {
                        continue;
                    }
                    const TARGET = sim.attackTarget(U, A);
                    let hit = null;
                    if (TARGET && TARGET.hp > 0) {
                        const DISTANCE = Math.hypot(TARGET.x - U.x, TARGET.y - U.y),
                            REACH = TARGET.radius + U.radius + this.spec.range;
                        if (DISTANCE <= REACH) {
                            const AIM = Math.atan2(TARGET.y - U.y, TARGET.x - U.x),
                                SIDE = SLOT.angleOffsetRadians;
                            const FROM = {
                                x: U.x + Math.cos(AIM + SIDE) * U.radius * 0.45,
                                y: U.y + Math.sin(AIM + SIDE) * U.radius * 0.45,
                                z: 0,
                            };
                            const TO = {
                                x: TARGET.x - Math.cos(AIM) * TARGET.radius * 0.9,
                                y: TARGET.y - Math.sin(AIM) * TARGET.radius * 0.9,
                                z: 0,
                            };
                            hit = arenaGeometry.sweep(FROM, TO, Math.max(0.06, U.radius * 0.2), 0.24, TARGET);
                        }
                    }
                    const STRIKE_ACTION = {
                        ...A,
                        hit: false,
                        strikeIndex: SLOT.strikeIndex,
                    };
                    const DID_HIT =
                        !!hit &&
                        this.resolveAttackHit(sim, STRIKE_ACTION, TARGET, hit, {
                            attackMultiplier: SLOT.attackMultiplier,
                            attackKind: this.spec.kind,
                            strikeIndex: SLOT.strikeIndex,
                        });
                    const MASKS = resolveStrikeMask(A, SLOT.strikeIndex, DID_HIT);
                    if (MASKS) {
                        Object.assign(A, MASKS);
                    }
                }
                if (this.elapsed >= this.strikeDuration - 1e-9) {
                    U.z = 0;
                    U.vz = 0;
                    this.recover(sim, false);
                }
            }
        };
    return REPEATED_STRIKE;
}
