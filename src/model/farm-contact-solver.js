import { CONFIG } from './farm-config.js';
import { FACTION_CONFIG, hasFaction, areOpposingFactions } from '../core/factions.js';
import { resolveKnockback, resolveStatusDuration } from '../units/unit-stats.js';

function inverseBodyMass(body) {
    if (body.fixed === true) {
        return 0;
    }
    const MASS = Number.isFinite(body.mass) ? body.mass : 1;
    return MASS > 0 ? 1 / MASS : 0;
}
function contact(
    a,
    b,
    radius = a.radius + b.radius,
    heightA = a.height,
    heightB = b.height,
    massA = null,
    massB = null,
) {
    const DX = b.x - a.x,
        DY = b.y - a.y,
        D_LOCAL = Math.hypot(DX, DY),
        R_LOCAL = radius;
    if (a.z > b.z + heightB || b.z > a.z + heightA) {
        return false;
    }
    if (D_LOCAL >= R_LOCAL) {
        return false;
    }
    const NX = D_LOCAL > 1e-6 ? DX / D_LOCAL : 1,
        NY = D_LOCAL > 1e-6 ? DY / D_LOCAL : 0,
        INVERSE_MASS_A = massA ?? inverseBodyMass(a),
        INVERSE_MASS_B = massB ?? inverseBodyMass(b),
        INVERSE_MASS_SUM = INVERSE_MASS_A + INVERSE_MASS_B;
    const CLOSING = (a.vx - b.vx) * NX + (a.vy - b.vy) * NY;
    if (CLOSING > 0 && INVERSE_MASS_SUM > 0) {
        // Preserve the previous 0.57 velocity change per body at equal mass
        // while weighting the resulting impulse by inverse mass.
        const IMPULSE = (CLOSING * 1.14) / INVERSE_MASS_SUM;
        if (INVERSE_MASS_A > 0) {
            const IMPULSE_A = resolveKnockback(IMPULSE, b, a) * INVERSE_MASS_A;
            a.vx -= NX * IMPULSE_A;
            a.vy -= NY * IMPULSE_A;
        }
        if (INVERSE_MASS_B > 0) {
            const IMPULSE_B = resolveKnockback(IMPULSE, a, b) * INVERSE_MASS_B;
            b.vx += NX * IMPULSE_B;
            b.vy += NY * IMPULSE_B;
        }
        if (CLOSING > 2) {
            const RECEIVER =
                INVERSE_MASS_A === 0
                    ? b
                    : INVERSE_MASS_B === 0
                      ? a
                      : Math.hypot(a.vx, a.vy) > Math.hypot(b.vx, b.vy)
                        ? a
                        : b;
            RECEIVER.vz = Math.max(RECEIVER.vz, Math.min(4, CLOSING * 0.2));
            RECEIVER.stun = Math.max(RECEIVER.stun, resolveStatusDuration(0.3, RECEIVER === a ? b : a, RECEIVER));
            RECEIVER.flash = 0.1;
        }
    }
    return true;
}
export const FARM_CONTACT_SOLVER = (base) =>
    class FarmContactSolver extends base {
        _ensureContactSolverBuffers(length) {
            if (this._contactCorrectionX.length >= length) {
                return;
            }
            const CAPACITY = Math.max(length, this._contactCorrectionX.length * 2, 16);
            this._contactCorrectionX = new Float64Array(CAPACITY);
            this._contactCorrectionY = new Float64Array(CAPACITY);
            this._contactCorrectionCount = new Uint32Array(CAPACITY);
        }
        solveContactSeparations(units, dt, bodiesCached = false) {
            if (this.tower.active && this.battleCommand === 'scatter') {
                this._prepareArmySpacing();
            }
            this._ensureContactSolverBuffers(units.length);
            // Body geometry does not change inside a Jacobi solve. Cache it once,
            // rather than evaluating authored shape/grade/giant getters per pair.
            if (!bodiesCached) {
                this._cacheBattleBodies(units);
            }
            const CORRECTION_X = this._contactCorrectionX,
                CORRECTION_Y = this._contactCorrectionY,
                CORRECTION_COUNT = this._contactCorrectionCount,
                BODY_RADIUS = this._battleRadius,
                BODY_HEIGHT = this._battleHeight,
                BODY_INVERSE_MASS = this._battleInverseMass,
                SCATTER_COMMAND = this.tower.active && this.battleCommand === 'scatter',
                QUERY_GAP = SCATTER_COMMAND ? CONFIG.farm.deploy.scatterGap : 0.22,
                ITERATIONS = CONFIG.physics.separationIterations,
                SOFT_FACTOR = 1 - Math.exp((-CONFIG.physics.softSeparationRate * dt) / ITERATIONS);
            let maximumRadius = 0;
            for (let index = 0; index < units.length; index++) {
                maximumRadius = Math.max(maximumRadius, BODY_RADIUS[index]);
            }
            for (let iteration = 0; iteration < ITERATIONS; iteration++) {
                CORRECTION_X.fill(0, 0, units.length);
                CORRECTION_Y.fill(0, 0, units.length);
                CORRECTION_COUNT.fill(0, 0, units.length);
                let correctionCount = 0;
                for (let i = 0; i < units.length; i++) {
                    const UNIT_LOCAL = units[i];
                    if (this.isMergeTaskMaterial(UNIT_LOCAL)) {
                        continue;
                    }
                    const INVERSE_MASS_A = BODY_INVERSE_MASS[i];
                    const PENDING = this._collectContactOrders(
                        UNIT_LOCAL,
                        i + 1,
                        units.length - 1,
                        this._contactPending,
                        BODY_RADIUS[i] + maximumRadius + QUERY_GAP,
                        i,
                        QUERY_GAP,
                    );
                    for (const J of PENDING) {
                        const OTHER = units[J];
                        if (this.isMergeTaskMaterial(OTHER)) {
                            continue;
                        }
                        if (UNIT_LOCAL.z > OTHER.z + BODY_HEIGHT[J] || OTHER.z > UNIT_LOCAL.z + BODY_HEIGHT[i]) {
                            continue;
                        }
                        const DX = OTHER.x - UNIT_LOCAL.x,
                            DY = OTHER.y - UNIT_LOCAL.y,
                            DISTANCE = Math.hypot(DX, DY),
                            RADIUS = BODY_RADIUS[i] + BODY_RADIUS[J],
                            INVERSE_MASS_B = BODY_INVERSE_MASS[J],
                            INVERSE_MASS_SUM = INVERSE_MASS_A + INVERSE_MASS_B;
                        if (INVERSE_MASS_SUM <= 0) {
                            continue;
                        }
                        const SCATTER =
                                SCATTER_COMMAND &&
                                hasFaction(UNIT_LOCAL, FACTION_CONFIG.PLAYER) &&
                                hasFaction(OTHER, FACTION_CONFIG.PLAYER),
                            GAP = SCATTER ? CONFIG.farm.deploy.scatterGap : 0.22,
                            SOFT =
                                DISTANCE >= RADIUS &&
                                DISTANCE < RADIUS + GAP &&
                                UNIT_LOCAL.z < 0.1 &&
                                OTHER.z < 0.1 &&
                                (SCATTER || (UNIT_LOCAL.ability.phase === 'idle' && OTHER.ability.phase === 'idle')),
                            TARGET_DISTANCE = SOFT ? RADIUS + GAP : RADIUS;
                        if (DISTANCE >= TARGET_DISTANCE) {
                            continue;
                        }
                        const ANGLE =
                                ((Math.min(UNIT_LOCAL.id, OTHER.id) * 0.61803398875 +
                                    Math.max(UNIT_LOCAL.id, OTHER.id) * 0.38196601125) %
                                    1) *
                                Math.PI *
                                2,
                            NORMAL_SIGN = UNIT_LOCAL.id < OTHER.id ? 1 : -1,
                            NORMAL_X = DISTANCE > 1e-6 ? DX / DISTANCE : Math.cos(ANGLE) * NORMAL_SIGN,
                            NORMAL_Y = DISTANCE > 1e-6 ? DY / DISTANCE : Math.sin(ANGLE) * NORMAL_SIGN,
                            RELAXATION = SOFT ? SOFT_FACTOR : CONFIG.physics.separationRelaxation,
                            PENETRATION = (TARGET_DISTANCE - DISTANCE) * RELAXATION,
                            SHARE_A = INVERSE_MASS_A / INVERSE_MASS_SUM,
                            SHARE_B = INVERSE_MASS_B / INVERSE_MASS_SUM;
                        CORRECTION_X[i] -= NORMAL_X * PENETRATION * SHARE_A;
                        CORRECTION_Y[i] -= NORMAL_Y * PENETRATION * SHARE_A;
                        CORRECTION_COUNT[i] += SHARE_A > 0 ? 1 : 0;
                        CORRECTION_X[J] += NORMAL_X * PENETRATION * SHARE_B;
                        CORRECTION_Y[J] += NORMAL_Y * PENETRATION * SHARE_B;
                        CORRECTION_COUNT[J] += SHARE_B > 0 ? 1 : 0;
                        correctionCount++;
                    }
                }
                if (!correctionCount) {
                    break;
                }
                for (let i = 0; i < units.length; i++) {
                    const UNIT_LOCAL = units[i],
                        COUNT = CORRECTION_COUNT[i];
                    if (!COUNT) {
                        continue;
                    }
                    let deltaX = CORRECTION_X[i] / COUNT,
                        deltaY = CORRECTION_Y[i] / COUNT;
                    const LENGTH = Math.hypot(deltaX, deltaY),
                        MAX_CORRECTION = Math.max(0.05, BODY_RADIUS[i] * 1.25);
                    if (LENGTH > MAX_CORRECTION) {
                        const SCALE = MAX_CORRECTION / LENGTH;
                        deltaX *= SCALE;
                        deltaY *= SCALE;
                    }
                    UNIT_LOCAL.x += deltaX;
                    UNIT_LOCAL.y += deltaY;
                    this.boundBody(UNIT_LOCAL, this.scene, BODY_RADIUS[i]);
                }
                for (const UNIT_LOCAL of units) {
                    if (CORRECTION_COUNT[this._unitStepOrder.get(UNIT_LOCAL)] > 0) {
                        this.updateUnitSpatial(UNIT_LOCAL);
                    }
                }
                this.metrics.physicsSolverIterations++;
                this.profiler?.count('physicsSolverIterations');
            }
        }
        separateBossUnitsJacobi(units, boss = this.boss) {
            const BOSS = boss;
            if (!BOSS.active || !units.length) {
                return;
            }
            this._ensureContactSolverBuffers(units.length);
            const CORRECTION_X = this._contactCorrectionX,
                CORRECTION_Y = this._contactCorrectionY,
                CORRECTION_COUNT = this._contactCorrectionCount;
            CORRECTION_X.fill(0, 0, units.length);
            CORRECTION_Y.fill(0, 0, units.length);
            CORRECTION_COUNT.fill(0, 0, units.length);
            let correctionCount = 0;
            for (let i = 0; i < units.length; i++) {
                const UNIT_LOCAL = units[i];
                if (
                    !areOpposingFactions(UNIT_LOCAL, BOSS) ||
                    UNIT_LOCAL.hp <= 0 ||
                    !UNIT_LOCAL.dropLanded ||
                    UNIT_LOCAL.z > BOSS.z + BOSS.height ||
                    UNIT_LOCAL.z + UNIT_LOCAL.height < BOSS.z ||
                    inverseBodyMass(UNIT_LOCAL) <= 0
                ) {
                    continue;
                }
                const DX = UNIT_LOCAL.x - BOSS.x,
                    DY = UNIT_LOCAL.y - BOSS.y,
                    DISTANCE = Math.hypot(DX, DY),
                    RADIUS = BOSS.radius + UNIT_LOCAL.radius;
                if (DISTANCE >= RADIUS) {
                    continue;
                }
                const ANGLE = DISTANCE > 1e-6 ? 0 : UNIT_LOCAL.seed,
                    NORMAL_X = DISTANCE > 1e-6 ? DX / DISTANCE : Math.cos(ANGLE),
                    NORMAL_Y = DISTANCE > 1e-6 ? DY / DISTANCE : Math.sin(ANGLE),
                    INDEX = this._unitStepOrder.get(UNIT_LOCAL),
                    OVERLAP = RADIUS - DISTANCE,
                    INWARD = UNIT_LOCAL.vx * NORMAL_X + UNIT_LOCAL.vy * NORMAL_Y;
                CORRECTION_X[INDEX] += NORMAL_X * OVERLAP;
                CORRECTION_Y[INDEX] += NORMAL_Y * OVERLAP;
                CORRECTION_COUNT[INDEX]++;
                correctionCount++;
                if (INWARD < 0) {
                    UNIT_LOCAL.vx -= INWARD * NORMAL_X;
                    UNIT_LOCAL.vy -= INWARD * NORMAL_Y;
                }
            }
            if (!correctionCount) {
                return;
            }
            for (let i = 0; i < units.length; i++) {
                const UNIT_LOCAL = units[i],
                    COUNT = CORRECTION_COUNT[i];
                if (!COUNT) {
                    continue;
                }
                UNIT_LOCAL.x += CORRECTION_X[i] / COUNT;
                UNIT_LOCAL.y += CORRECTION_Y[i] / COUNT;
                this.boundBody(UNIT_LOCAL, this.scene, UNIT_LOCAL.radius);
            }
            for (const UNIT_LOCAL of units) {
                if (CORRECTION_COUNT[this._unitStepOrder.get(UNIT_LOCAL)] > 0) {
                    this.updateUnitSpatial(UNIT_LOCAL);
                }
            }
            this.metrics.physicsSolverIterations++;
            this.profiler?.count('physicsSolverIterations');
        }
        _pushBattlePair(first, second, opposing) {
            const COUNT = this._battlePairCount;
            if (COUNT >= this._battlePairA.length) {
                const CAPACITY = Math.max(256, this._battlePairA.length * 2),
                    A = new Int32Array(CAPACITY),
                    B = new Int32Array(CAPACITY),
                    O = new Uint8Array(CAPACITY);
                A.set(this._battlePairA);
                B.set(this._battlePairB);
                O.set(this._battlePairOpposing);
                this._battlePairA = A;
                this._battlePairB = B;
                this._battlePairOpposing = O;
            }
            this._battlePairA[COUNT] = first;
            this._battlePairB[COUNT] = second;
            this._battlePairOpposing[COUNT] = opposing ? 1 : 0;
            this._battlePairCount = COUNT + 1;
        }
        _cacheBattleBodies(units) {
            if (this._battleRadius.length < units.length) {
                const CAPACITY = Math.max(units.length, this._battleRadius.length * 2, 16);
                this._battleRadius = new Float64Array(CAPACITY);
                this._battleHeight = new Float64Array(CAPACITY);
                this._battleInverseMass = new Float64Array(CAPACITY);
            }
            for (let i = 0; i < units.length; i++) {
                const UNIT_LOCAL = units[i];
                this._battleRadius[i] = UNIT_LOCAL.radius;
                this._battleHeight[i] = UNIT_LOCAL.height;
                this._battleInverseMass[i] = inverseBodyMass(UNIT_LOCAL);
            }
        }
        _collectBattlePairs(units) {
            this._battlePairCount = 0;
            this._cacheBattleBodies(units);
            const RADIUS = this._battleRadius,
                HEIGHT = this._battleHeight;
            const MARGIN = CONFIG.physics.battleNeighborMargin,
                RESERVED = this.unitCollection.reservations.size > 0;
            for (let i = 0; i < units.length; i++) {
                const UNIT_LOCAL = units[i];
                if (
                    UNIT_LOCAL.hp <= 0 ||
                    !UNIT_LOCAL.dropLanded ||
                    (RESERVED && this.isMergeTaskMaterial(UNIT_LOCAL))
                ) {
                    continue;
                }
                const QUERY_RADIUS = RADIUS[i] + CONFIG.unit.maxRadius + MARGIN,
                    PENDING = this._contactPending;
                this.unitSpatial.queryAABB(
                    UNIT_LOCAL.x - QUERY_RADIUS,
                    UNIT_LOCAL.y - QUERY_RADIUS,
                    UNIT_LOCAL.x + QUERY_RADIUS,
                    UNIT_LOCAL.y + QUERY_RADIUS,
                    this._contactQuery,
                );
                PENDING.length = 0;
                // Filter before sorting: only real neighbors are ordered, not every grid candidate.
                for (const OTHER of this._contactQuery) {
                    const J = this._unitStepOrder.get(OTHER);
                    if (
                        J === undefined ||
                        J <= i ||
                        OTHER.hp <= 0 ||
                        !OTHER.dropLanded ||
                        (RESERVED && this.isMergeTaskMaterial(OTHER))
                    ) {
                        continue;
                    }
                    if (UNIT_LOCAL.z > OTHER.z + HEIGHT[J] || OTHER.z > UNIT_LOCAL.z + HEIGHT[i]) {
                        continue;
                    }
                    const REACH = RADIUS[i] + RADIUS[J] + MARGIN,
                        DX = OTHER.x - UNIT_LOCAL.x,
                        DY = OTHER.y - UNIT_LOCAL.y;
                    if (DX * DX + DY * DY < REACH * REACH) {
                        PENDING.push(J);
                    }
                }
                PENDING.sort((a, b) => a - b);
                for (const J of PENDING) {
                    this._pushBattlePair(i, J, areOpposingFactions(UNIT_LOCAL, units[J]));
                }
            }
        }
        battleContacts(units) {
            this._collectBattlePairs(units);
            // Bump impulses and stuns only apply between opposing sides. Allies just separate.
            for (let p = 0; p < this._battlePairCount; p++) {
                if (this._battlePairOpposing[p] && contact(units[this._battlePairA[p]], units[this._battlePairB[p]])) {
                    this.metrics.contacts++;
                }
            }
            this.solveBattleSeparations(units);
        }
        solveBattleSeparations(units) {
            const COUNT = this._battlePairCount;
            if (!COUNT) {
                return;
            }
            this._ensureContactSolverBuffers(units.length);
            if (this._battleMoved.length < units.length) {
                this._battleMoved = new Uint8Array(this._contactCorrectionX.length);
            }
            const CORRECTION_X = this._contactCorrectionX,
                CORRECTION_Y = this._contactCorrectionY,
                CORRECTION_COUNT = this._contactCorrectionCount,
                MOVED = this._battleMoved,
                PAIR_A = this._battlePairA,
                PAIR_B = this._battlePairB,
                PAIR_OPPOSING = this._battlePairOpposing,
                RADIUS = this._battleRadius,
                INVERSE_MASS = this._battleInverseMass,
                ITERATIONS = CONFIG.physics.battleSeparationIterations,
                RELAXATION = CONFIG.physics.separationRelaxation,
                ALLY_SCALE = 1 - CONFIG.physics.battleAllyOverlap;
            MOVED.fill(0, 0, units.length);
            for (let iteration = 0; iteration < ITERATIONS; iteration++) {
                CORRECTION_X.fill(0, 0, units.length);
                CORRECTION_Y.fill(0, 0, units.length);
                CORRECTION_COUNT.fill(0, 0, units.length);
                let correctionCount = 0;
                for (let p = 0; p < COUNT; p++) {
                    const I = PAIR_A[p],
                        J = PAIR_B[p],
                        UNIT_LOCAL = units[I],
                        OTHER = units[J],
                        INVERSE_MASS_A = INVERSE_MASS[I],
                        INVERSE_MASS_B = INVERSE_MASS[J],
                        INVERSE_MASS_SUM = INVERSE_MASS_A + INVERSE_MASS_B;
                    if (INVERSE_MASS_SUM <= 0) {
                        continue;
                    }
                    const DX = OTHER.x - UNIT_LOCAL.x,
                        DY = OTHER.y - UNIT_LOCAL.y,
                        DISTANCE = Math.hypot(DX, DY),
                        TARGET_DISTANCE = (RADIUS[I] + RADIUS[J]) * (PAIR_OPPOSING[p] ? 1 : ALLY_SCALE);
                    if (DISTANCE >= TARGET_DISTANCE) {
                        continue;
                    }
                    const ANGLE =
                            ((Math.min(UNIT_LOCAL.id, OTHER.id) * 0.61803398875 +
                                Math.max(UNIT_LOCAL.id, OTHER.id) * 0.38196601125) %
                                1) *
                            Math.PI *
                            2,
                        NORMAL_SIGN = UNIT_LOCAL.id < OTHER.id ? 1 : -1,
                        NORMAL_X = DISTANCE > 1e-6 ? DX / DISTANCE : Math.cos(ANGLE) * NORMAL_SIGN,
                        NORMAL_Y = DISTANCE > 1e-6 ? DY / DISTANCE : Math.sin(ANGLE) * NORMAL_SIGN,
                        PENETRATION = (TARGET_DISTANCE - DISTANCE) * RELAXATION,
                        SHARE_A = INVERSE_MASS_A / INVERSE_MASS_SUM,
                        SHARE_B = INVERSE_MASS_B / INVERSE_MASS_SUM;
                    CORRECTION_X[I] -= NORMAL_X * PENETRATION * SHARE_A;
                    CORRECTION_Y[I] -= NORMAL_Y * PENETRATION * SHARE_A;
                    CORRECTION_COUNT[I] += SHARE_A > 0 ? 1 : 0;
                    CORRECTION_X[J] += NORMAL_X * PENETRATION * SHARE_B;
                    CORRECTION_Y[J] += NORMAL_Y * PENETRATION * SHARE_B;
                    CORRECTION_COUNT[J] += SHARE_B > 0 ? 1 : 0;
                    correctionCount++;
                }
                if (!correctionCount) {
                    break;
                }
                for (let i = 0; i < units.length; i++) {
                    const UNIT_LOCAL = units[i],
                        COUNT_LOCAL = CORRECTION_COUNT[i];
                    if (!COUNT_LOCAL) {
                        continue;
                    }
                    let deltaX = CORRECTION_X[i] / COUNT_LOCAL,
                        deltaY = CORRECTION_Y[i] / COUNT_LOCAL;
                    const LENGTH = Math.hypot(deltaX, deltaY),
                        MAX_CORRECTION = Math.max(0.05, RADIUS[i] * 1.25);
                    if (LENGTH > MAX_CORRECTION) {
                        const SCALE = MAX_CORRECTION / LENGTH;
                        deltaX *= SCALE;
                        deltaY *= SCALE;
                    }
                    UNIT_LOCAL.x += deltaX;
                    UNIT_LOCAL.y += deltaY;
                    this.boundBody(UNIT_LOCAL, this.scene, RADIUS[i]);
                    MOVED[i] = 1;
                }
                this.metrics.physicsSolverIterations++;
                this.profiler?.count('physicsSolverIterations');
            }
            for (let i = 0; i < units.length; i++) {
                if (MOVED[i]) {
                    this.updateUnitSpatial(units[i]);
                }
            }
        }
        resolveFarmContacts(units, dt = 1 / 20) {
            // Impulses only change velocity/stun, not body geometry or mass. Share the
            // existing solver cache across this pass and the following Jacobi solve.
            this._cacheBattleBodies(units);
            const RADIUS = this._battleRadius,
                HEIGHT = this._battleHeight,
                INVERSE_MASS = this._battleInverseMass,
                GAP = this.tower.active && this.battleCommand === 'scatter' ? CONFIG.farm.deploy.scatterGap : 0.22;
            for (let i = 0; i < units.length; i++) {
                const UNIT_LOCAL = units[i],
                    PENDING = this._collectContactOrders(
                        UNIT_LOCAL,
                        i + 1,
                        units.length - 1,
                        this._contactPending,
                        RADIUS[i] + CONFIG.unit.maxRadius + GAP,
                        i,
                    );
                if (this.isMergeTaskMaterial(UNIT_LOCAL)) {
                    continue;
                }
                for (const J of PENDING) {
                    if (this.isMergeTaskMaterial(units[J])) {
                        continue;
                    }
                    if (
                        contact(
                            UNIT_LOCAL,
                            units[J],
                            RADIUS[i] + RADIUS[J],
                            HEIGHT[i],
                            HEIGHT[J],
                            INVERSE_MASS[i],
                            INVERSE_MASS[J],
                        )
                    ) {
                        this.metrics.contacts++;
                    }
                }
            }
            this.solveContactSeparations(units, dt, true);
        }
        resolveFarmContactPairs(units) {
            for (let i = 0; i < units.length; i++) {
                const UNIT_LOCAL = units[i],
                    PENDING = this._collectContactOrders(UNIT_LOCAL, i + 1, units.length - 1, this._contactPending);
                if (this.isMergeTaskMaterial(UNIT_LOCAL)) {
                    continue;
                }
                for (const J of PENDING) {
                    const OTHER = units[J];
                    if (this.isMergeTaskMaterial(OTHER)) {
                        continue;
                    }
                    this.pair(UNIT_LOCAL, OTHER);
                }
            }
        }
        _collectContactOrders(
            unit,
            minimumOrder,
            maximumOrder,
            out,
            queryRadius = null,
            bodyOrder = null,
            contactGap = 0,
        ) {
            const GAP = this.tower.active && this.battleCommand === 'scatter' ? CONFIG.farm.deploy.scatterGap : 0.22,
                RADIUS = queryRadius ?? unit.radius + CONFIG.unit.maxRadius + GAP;
            this.unitSpatial.queryAABB(
                unit.x - RADIUS,
                unit.y - RADIUS,
                unit.x + RADIUS,
                unit.y + RADIUS,
                this._contactQuery,
            );
            out.length = 0;
            for (const CANDIDATE of this._contactQuery) {
                const ORDER = this._unitStepOrder.get(CANDIDATE);
                if (ORDER !== undefined && ORDER >= minimumOrder && ORDER <= maximumOrder) {
                    if (bodyOrder !== null) {
                        if (
                            unit.z > CANDIDATE.z + this._battleHeight[ORDER] ||
                            CANDIDATE.z > unit.z + this._battleHeight[bodyOrder]
                        ) {
                            continue;
                        }
                        const DX = CANDIDATE.x - unit.x,
                            DY = CANDIDATE.y - unit.y,
                            REACH = this._battleRadius[bodyOrder] + this._battleRadius[ORDER] + contactGap,
                            REACH_SQUARED = REACH * REACH;
                        // Keep the rounding boundary for the original Math.hypot comparison.
                        // Query again after every Jacobi move: a later pass can create a new contact.
                        if (DX * DX + DY * DY > REACH_SQUARED + Math.max(1, REACH_SQUARED) * Number.EPSILON * 8) {
                            continue;
                        }
                    }
                    out.push(ORDER);
                }
            }
            out.sort((a, b) => a - b);
            return out;
        }
    };
