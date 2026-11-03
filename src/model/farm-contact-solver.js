import { CONFIG } from './farm-config.js';
import { FACTION_CONFIG, hasFaction, areOpposingFactions } from '../core/factions.js';
import { resolveKnockback, resolveStatusDuration } from '../units/unit-stats.js';

function contactQueryReachSquared(reach) {
    const SQUARED = reach * reach;
    return SQUARED + Math.max(1, SQUARED) * Number.EPSILON * 8;
}
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
// Verlet neighbour list skin (docs/performance-diagnostics.md, 0.67.33): the solve's neighbour lists are built once per
// tick with this much extra reach and reused by every pass until some body has moved half of it from where the list
// was built. Any pair in reach now was then within reach + skin, so the lists stay a superset; every pass still tests
// the true distance, and each list keeps ascending order, so corrections and their floating-point sums are unchanged.
const CONTACT_SKIN = 0.3;
const CONTACT_MERGE = 1,
    CONTACT_IDLE = 2,
    CONTACT_PLAYER = 4;
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
        _prepareFarmContactNeighbors(units, maximumRadius, gap) {
            const NEIGHBORS = this._farmContactNeighbors,
                RADIUS = this._battleRadius,
                HEIGHT = this._battleHeight,
                COUNT = units.length;
            // Uniform grid by design (bloom-reference algorithms A001; docs/performance-diagnostics.md, 0.67.31): an x-axis
            // sweep here took a full-height strip of the farm as candidates (16x the needed pairs at 1,000 troops).
            // A uniform grid rebuilt from the current centers once per solve pass (a Jacobi move may create contacts).
            // A cell is at least the widest reach, so every pair in reach sits in the same or a neighbouring cell. An
            // x-axis sweep would test every body in a full-height strip of the farm instead of its 3x3 cells.
            let minX = Infinity,
                minY = Infinity,
                maxX = -Infinity,
                maxY = -Infinity;
            for (let i = 0; i < COUNT; i++) {
                const UNIT_LOCAL = units[i];
                (NEIGHBORS[i] ||= []).length = 0;
                if (Number.isFinite(UNIT_LOCAL.x) && Number.isFinite(UNIT_LOCAL.y)) {
                    minX = Math.min(minX, UNIT_LOCAL.x);
                    minY = Math.min(minY, UNIT_LOCAL.y);
                    maxX = Math.max(maxX, UNIT_LOCAL.x);
                    maxY = Math.max(maxY, UNIT_LOCAL.y);
                }
            }
            if (!(minX <= maxX)) {
                return;
            }
            // Larger cells keep every pair too, so far-flung bodies only coarsen the grid, never grow it past this.
            let cell = Math.sqrt(contactQueryReachSquared(2 * maximumRadius + gap)) * (1 + 1e-9),
                columns = Math.floor((maxX - minX) / cell) + 1,
                rows = Math.floor((maxY - minY) / cell) + 1;
            while (columns * rows > COUNT * 4 + 1024) {
                cell *= 2;
                columns = Math.floor((maxX - minX) / cell) + 1;
                rows = Math.floor((maxY - minY) / cell) + 1;
            }
            const CELLS = columns * rows;
            if (this._farmContactCellStart.length < CELLS + 1) {
                this._farmContactCellStart = new Int32Array(Math.max(CELLS + 1, this._farmContactCellStart.length * 2));
            }
            if (this._farmContactCellOf.length < COUNT) {
                const CAPACITY = Math.max(COUNT, this._farmContactCellOf.length * 2, 16);
                this._farmContactCellOf = new Int32Array(CAPACITY);
                this._farmContactCellItems = new Int32Array(CAPACITY);
            }
            const START = this._farmContactCellStart,
                CELL_OF = this._farmContactCellOf,
                ITEMS = this._farmContactCellItems;
            START.fill(0, 0, CELLS + 1);
            for (let i = 0; i < COUNT; i++) {
                const UNIT_LOCAL = units[i];
                if (!(Number.isFinite(UNIT_LOCAL.x) && Number.isFinite(UNIT_LOCAL.y))) {
                    CELL_OF[i] = -1;
                    continue;
                }
                const KEY =
                    Math.floor((UNIT_LOCAL.x - minX) / cell) + Math.floor((UNIT_LOCAL.y - minY) / cell) * columns;
                CELL_OF[i] = KEY;
                START[KEY + 1]++;
            }
            for (let key = 0; key < CELLS; key++) {
                START[key + 1] += START[key];
            }
            // Filling in unit order keeps each cell ascending; the start offsets are restored after the fill. Each list
            // stays in ascending order (the prior i/j order): impulses and floating-point sums must not depend on cells.
            for (let i = 0; i < COUNT; i++) {
                if (CELL_OF[i] >= 0) {
                    ITEMS[START[CELL_OF[i]]++] = i;
                }
            }
            for (let key = CELLS; key > 0; key--) {
                START[key] = START[key - 1];
            }
            START[0] = 0;
            for (let i = 0; i < COUNT; i++) {
                const KEY = CELL_OF[i];
                if (KEY < 0) {
                    continue;
                }
                const A = units[i],
                    CX = KEY % columns,
                    CY = (KEY - CX) / columns,
                    LIST = NEIGHBORS[i];
                for (let y = Math.max(0, CY - 1); y <= Math.min(rows - 1, CY + 1); y++) {
                    for (let x = Math.max(0, CX - 1); x <= Math.min(columns - 1, CX + 1); x++) {
                        const OTHER_KEY = x + y * columns;
                        for (let slot = START[OTHER_KEY]; slot < START[OTHER_KEY + 1]; slot++) {
                            const J = ITEMS[slot];
                            if (J <= i) {
                                continue;
                            }
                            const B = units[J];
                            if (A.z > B.z + HEIGHT[J] || B.z > A.z + HEIGHT[i]) {
                                continue;
                            }
                            const DX = B.x - A.x,
                                DY = B.y - A.y,
                                REACH = RADIUS[i] + RADIUS[J] + gap;
                            if (DX * DX + DY * DY <= contactQueryReachSquared(REACH)) {
                                // Lists hold a few bodies: inserting in place keeps them ascending without a sort.
                                let at = LIST.length;
                                LIST.push(J);
                                while (at > 0 && LIST[at - 1] > J) {
                                    LIST[at] = LIST[at - 1];
                                    at--;
                                }
                                LIST[at] = J;
                            }
                        }
                    }
                }
            }
        }
        _contactQueryGap() {
            return this.tower.active && this.battleCommand === 'scatter' ? CONFIG.farm.deploy.scatterGap : 0.22;
        }
        // Neighbour lists in reach + gap + skin of the current centers, remembering those centers.
        _prepareFarmContactList(units, maximumRadius, gap) {
            this._prepareFarmContactNeighbors(units, maximumRadius, gap + CONTACT_SKIN);
            for (let i = 0; i < units.length; i++) {
                this._farmContactAnchorX[i] = units[i].x;
                this._farmContactAnchorY[i] = units[i].y;
            }
        }
        // False once any body moved more than half the skin since the lists were built (or left the finite plane).
        _farmContactListHolds(units) {
            const LIMIT = (CONTACT_SKIN / 2) * (CONTACT_SKIN / 2),
                ANCHOR_X = this._farmContactAnchorX,
                ANCHOR_Y = this._farmContactAnchorY;
            for (let i = 0; i < units.length; i++) {
                const DX = units[i].x - ANCHOR_X[i],
                    DY = units[i].y - ANCHOR_Y[i];
                if (!(DX * DX + DY * DY <= LIMIT)) {
                    return false;
                }
            }
            return true;
        }
        solveContactSeparations(units, dt, bodiesCached = false) {
            if (this.tower.active && this.battleCommand === 'scatter') {
                this._prepareArmySpacing();
            }
            this._ensureContactSolverBuffers(units.length);
            // Body geometry does not change inside a Jacobi solve. Cache it once,
            // rather than evaluating authored shape/grade/giant getters per pair.
            if (!bodiesCached) {
                this._prepareFarmContactList(units, this._cacheBattleBodies(units), this._contactQueryGap());
            }
            const CORRECTION_X = this._contactCorrectionX,
                CORRECTION_Y = this._contactCorrectionY,
                CORRECTION_COUNT = this._contactCorrectionCount,
                BODY_RADIUS = this._battleRadius,
                BODY_HEIGHT = this._battleHeight,
                BODY_INVERSE_MASS = this._battleInverseMass,
                FLAGS = this._contactBodyFlags,
                SCATTER_COMMAND = this.tower.active && this.battleCommand === 'scatter',
                QUERY_GAP = this._contactQueryGap(),
                ITERATIONS = CONFIG.physics.separationIterations,
                SOFT_FACTOR = 1 - Math.exp((-CONFIG.physics.softSeparationRate * dt) / ITERATIONS);
            let maximumRadius = 0;
            for (let index = 0; index < units.length; index++) {
                maximumRadius = Math.max(maximumRadius, BODY_RADIUS[index]);
            }
            for (let iteration = 0; iteration < ITERATIONS; iteration++) {
                if (iteration > 0 && !this._farmContactListHolds(units)) {
                    this._prepareFarmContactList(units, maximumRadius, QUERY_GAP);
                    this.profiler?.count('contactListRebuilds');
                }
                CORRECTION_X.fill(0, 0, units.length);
                CORRECTION_Y.fill(0, 0, units.length);
                CORRECTION_COUNT.fill(0, 0, units.length);
                let correctionCount = 0;
                for (let i = 0; i < units.length; i++) {
                    const UNIT_LOCAL = units[i],
                        FLAGS_A = FLAGS[i];
                    if (FLAGS_A & CONTACT_MERGE) {
                        continue;
                    }
                    const INVERSE_MASS_A = BODY_INVERSE_MASS[i];
                    const PENDING = this._farmContactNeighbors[i];
                    for (const J of PENDING) {
                        const OTHER = units[J],
                            FLAGS_B = FLAGS[J];
                        if (FLAGS_B & CONTACT_MERGE) {
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
                        const SCATTER = SCATTER_COMMAND && (FLAGS_A & FLAGS_B & CONTACT_PLAYER) !== 0,
                            GAP = SCATTER ? CONFIG.farm.deploy.scatterGap : 0.22,
                            SOFT =
                                DISTANCE >= RADIUS &&
                                DISTANCE < RADIUS + GAP &&
                                UNIT_LOCAL.z < 0.1 &&
                                OTHER.z < 0.1 &&
                                (SCATTER || (FLAGS_A & FLAGS_B & CONTACT_IDLE) !== 0),
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
        // Per-tick body caches (radius, height, inverse mass) read by the contact solver; returns the largest radius.
        _cacheBattleBodies(units) {
            if (this._battleRadius.length < units.length) {
                const CAPACITY = Math.max(units.length, this._battleRadius.length * 2, 16);
                this._battleRadius = new Float64Array(CAPACITY);
                this._battleHeight = new Float64Array(CAPACITY);
                this._battleInverseMass = new Float64Array(CAPACITY);
                this._farmContactAnchorX = new Float64Array(CAPACITY);
                this._farmContactAnchorY = new Float64Array(CAPACITY);
                this._contactBodyFlags = new Uint8Array(CAPACITY);
            }
            let maximumRadius = 0;
            for (let i = 0; i < units.length; i++) {
                const UNIT_LOCAL = units[i];
                this._battleRadius[i] = UNIT_LOCAL.radius;
                this._battleHeight[i] = UNIT_LOCAL.height;
                this._battleInverseMass[i] = inverseBodyMass(UNIT_LOCAL);
                // Merge reservations, attack phases and sides hold for the whole contact step: read once per body.
                this._contactBodyFlags[i] =
                    (this.isMergeTaskMaterial(UNIT_LOCAL) ? CONTACT_MERGE : 0) |
                    (UNIT_LOCAL.ability?.phase === 'idle' ? CONTACT_IDLE : 0) |
                    (hasFaction(UNIT_LOCAL, FACTION_CONFIG.PLAYER) ? CONTACT_PLAYER : 0);
                maximumRadius = Math.max(maximumRadius, this._battleRadius[i]);
            }
            return maximumRadius;
        }
        resolveFarmContacts(units, dt = 1 / 20) {
            // Impulses only change velocity/stun, not body geometry or mass. Share the
            // existing solver cache across this pass and the following Jacobi solve.
            const MAXIMUM_RADIUS = this._cacheBattleBodies(units),
                RADIUS = this._battleRadius,
                HEIGHT = this._battleHeight,
                INVERSE_MASS = this._battleInverseMass,
                FIGHTING = this.farmBossEvent.phase !== 'idle';
            // Impulses never move a body, so the separation's first lists serve this pass too: contact() bumps touching
            // bodies only (no gap, no skin) and returns before any change for the rest.
            this._prepareFarmContactList(units, MAXIMUM_RADIUS, this._contactQueryGap());
            for (let i = 0; i < units.length; i++) {
                const UNIT_LOCAL = units[i],
                    PENDING = this._farmContactNeighbors[i];
                if (this._contactBodyFlags[i] & CONTACT_MERGE) {
                    continue;
                }
                for (const J of PENDING) {
                    if (this._contactBodyFlags[J] & CONTACT_MERGE) {
                        continue;
                    }
                    // In a fight, bump impulses and stuns only pass between opposing sides: allies just separate
                    // (solveContactSeparations), so a crowd never stuns its own troops out of their attacks.
                    if (FIGHTING && !areOpposingFactions(UNIT_LOCAL, units[J])) {
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
                // A full farm cannot spawn a child. Merge movement still resolves
                // in its separate scene step, including when it frees capacity.
                if (this.ownedPopulation >= this.capacity) {
                    break;
                }
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
                            REACH = this._battleRadius[bodyOrder] + this._battleRadius[ORDER] + contactGap;
                        // Keep the rounding boundary for the original Math.hypot comparison.
                        // Query again after every Jacobi move: a later pass can create a new contact.
                        if (DX * DX + DY * DY > contactQueryReachSquared(REACH)) {
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
