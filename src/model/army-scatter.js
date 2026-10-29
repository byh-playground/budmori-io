// Scatter is Reynolds-style separation blended with a seek toward the attack range.
// Every neighbour inside the spacing radius pushes this unit away, weighted by how far
// it intrudes. All inputs come from the current logical tick; there is no saved formation.
const SEPARATION_WEIGHT = 3;
const SEEK_WEIGHT = 0.35;
// A unit that already reaches the target only leaves its post when neighbours crowd it this hard.
const HOLD_BELOW = 0.05;
const IN_RANGE_HOLD_BELOW = 1.2;

// Returns a heading vector (length 0..~2, 1 = full speed) or null when the unit has room
// and should follow its normal engage behaviour.
export function scatterHeading(unit, neighbors, gap, enemy, attackDistance, radii, out) {
    const RADIUS = radii.get(unit),
        IN_RANGE = enemy ? Math.hypot(unit.x - enemy.x, unit.y - enemy.y) <= attackDistance : false;
    let sepX = 0,
        sepY = 0;
    for (const OTHER of neighbors) {
        if (OTHER === unit || OTHER.hp <= 0 || OTHER.faction !== unit.faction || OTHER.z > 0.1) {
            continue;
        }
        const SPACING = RADIUS + (radii.get(OTHER) ?? OTHER.radius) + gap,
            DX = unit.x - OTHER.x,
            DY = unit.y - OTHER.y,
            DISTANCE_SQUARED = DX * DX + DY * DY;
        if (DISTANCE_SQUARED >= SPACING * SPACING) {
            continue;
        }
        const DISTANCE = Math.sqrt(DISTANCE_SQUARED),
            WEIGHT = (SPACING - DISTANCE) / SPACING;
        if (DISTANCE > 0.01) {
            sepX += (DX / DISTANCE) * WEIGHT;
            sepY += (DY / DISTANCE) * WEIGHT;
        } else {
            // Exactly stacked units split along a stable per-pair direction.
            const ANGLE = ((unit.id - OTHER.id) * 2.39996) % (Math.PI * 2);
            sepX += Math.cos(ANGLE) * WEIGHT;
            sepY += Math.sin(ANGLE) * WEIGHT;
        }
    }
    let headingX = sepX * SEPARATION_WEIGHT,
        headingY = sepY * SEPARATION_WEIGHT;
    if (Math.hypot(headingX, headingY) < (IN_RANGE ? IN_RANGE_HOLD_BELOW : HOLD_BELOW)) {
        return null;
    }
    if (enemy) {
        const TO_X = enemy.x - unit.x,
            TO_Y = enemy.y - unit.y,
            DISTANCE = Math.hypot(TO_X, TO_Y);
        if (DISTANCE > attackDistance) {
            headingX += (TO_X / DISTANCE) * SEEK_WEIGHT;
            headingY += (TO_Y / DISTANCE) * SEEK_WEIGHT;
        }
    }
    out.x = headingX;
    out.y = headingY;
    return out;
}
