// A spacing order owns locomotion before attack pursuit. Evaluate reachable
// space, not the sum of neighbour pushes (which cancels inside a dense crowd).
// All inputs come from the current logical tick; there is no saved formation.
export function scatterDestination(unit, neighbors, threats, gap, bounds, enemy, attackDistance, radii) {
    const RADIUS = radii.get(unit),
        NEIGHBORS = [],
        LOOK_AHEAD = gap * 1.5;
    for (const OTHER of neighbors) {
        if (OTHER !== unit && OTHER.hp > 0 && OTHER.faction === unit.faction && OTHER.z <= 0.1) {
            NEIGHBORS.push({ x: OTHER.x, y: OTHER.y, distance: RADIUS + (radii.get(OTHER) ?? OTHER.radius) + gap });
        }
    }
    const DX = unit.x - (enemy?.x ?? 0),
        DY = unit.y - (enemy?.y ?? 0),
        BEARING = Math.hypot(DX, DY) > 0.01 ? Math.atan2(DY, DX) : unit.seed * Math.PI * 2,
        CURRENT = crowdCost(unit.x, unit.y, NEIGHBORS, gap, 0.08),
        CROWDED = CURRENT > 0.08,
        CLEAR_DISTANCE = attackDistance + gap * 2;
    if (!CROWDED && (!enemy || Math.hypot(DX, DY) >= CLEAR_DISTANCE)) {
        return null;
    }
    let best = null,
        bestScore = Infinity;
    for (let index = 0; index < 16; index++) {
        const ANGLE = BEARING + (index * Math.PI) / 8,
            X = Math.max(-bounds.x, Math.min(bounds.x, unit.x + Math.cos(ANGLE) * LOOK_AHEAD)),
            Y = Math.max(-bounds.y, Math.min(bounds.y, unit.y + Math.sin(ANGLE) * LOOK_AHEAD)),
            TRAVEL = Math.hypot(X - unit.x, Y - unit.y);
        if (TRAVEL < LOOK_AHEAD * 0.25) {
            continue;
        }
        let score = crowdCost(X, Y, NEIGHBORS, gap, bestScore + 0.05);
        if (enemy) {
            const BLOCKING_APPROACH = Math.max(0, CLEAR_DISTANCE - Math.hypot(X - enemy.x, Y - enemy.y));
            score += BLOCKING_APPROACH * BLOCKING_APPROACH;
        }
        for (const THREAT of threats) {
            const OVERLAP = Math.max(0, THREAT.radius + RADIUS - Math.hypot(X - THREAT.x, Y - THREAT.y));
            score += OVERLAP * OVERLAP * 4;
        }
        // Wait outside the approach space and leave room for the next attackers.
        score -= Math.cos(ANGLE - BEARING) * 0.05;
        score += (1 - TRAVEL / LOOK_AHEAD) * 0.05;
        if (score < bestScore) {
            bestScore = score;
            best = { x: X, y: Y };
        }
    }
    return best;
}

function crowdCost(x, y, neighbors, gap, cutoff) {
    let cost = 0;
    for (const OTHER of neighbors) {
        const DEFICIT = Math.max(0, OTHER.distance - Math.hypot(x - OTHER.x, y - OTHER.y)) / gap;
        cost += DEFICIT * DEFICIT;
        if (cost > cutoff) {
            break;
        }
    }
    return cost;
}
