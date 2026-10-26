import { CONFIG, CLAMP } from './farm-config.js';

// Simulation types are independent of the renderer skin mapping.
export const ARENA_GEOMETRY = {
    arena(context = 'battle') {
        if (typeof context === 'string') {
            return CONFIG[context].arena;
        }
        return context.scene === 'farm' && context.insideTower ? CONFIG.farm.tower.arena : CONFIG[context.scene].arena;
    },
    rayEnd(start, dx, dy, distance, context, margin = 0) {
        const BOUNDS = this.bounds(context, margin);
        let exit;
        if (this.arena(context).shape === 'rect') {
            exit = Math.min(
                Math.abs(dx) > 1e-12 ? ((dx > 0 ? BOUNDS.x : -BOUNDS.x) - start.x) / dx : Infinity,
                Math.abs(dy) > 1e-12 ? ((dy > 0 ? BOUNDS.y : -BOUNDS.y) - start.y) / dy : Infinity,
            );
        } else {
            const A = (dx / BOUNDS.x) ** 2 + (dy / BOUNDS.y) ** 2,
                B = 2 * ((start.x * dx) / BOUNDS.x ** 2 + (start.y * dy) / BOUNDS.y ** 2),
                C = (start.x / BOUNDS.x) ** 2 + (start.y / BOUNDS.y) ** 2 - 1;
            exit = A > 0 ? (-B + Math.sqrt(Math.max(0, B * B - 4 * A * C))) / (2 * A) : 0;
        }
        const TRAVEL = Math.max(0, Math.min(distance, exit));
        return this.clamp({ x: start.x + dx * TRAVEL, y: start.y + dy * TRAVEL }, context, margin);
    },
    bounds(scene = 'battle', margin = 0) {
        const ARENA = this.arena(scene);
        return {
            x: ARENA.radiusX - margin,
            y: ARENA.radiusY - margin,
        };
    },
    inside(p, scene = 'battle', margin = 0) {
        const R_LOCAL = this.bounds(scene, margin);
        if (this.arena(scene).shape === 'rect') {
            return Math.abs(p.x) <= R_LOCAL.x && Math.abs(p.y) <= R_LOCAL.y;
        }
        return (p.x * p.x) / (R_LOCAL.x * R_LOCAL.x) + (p.y * p.y) / (R_LOCAL.y * R_LOCAL.y) <= 1;
    },
    clamp(p, scene = 'battle', margin = 0) {
        const R_LOCAL = this.bounds(scene, margin);
        if (this.arena(scene).shape === 'rect') {
            return { x: CLAMP(p.x, -R_LOCAL.x, R_LOCAL.x), y: CLAMP(p.y, -R_LOCAL.y, R_LOCAL.y) };
        }
        const K = Math.max(1, Math.hypot(p.x / R_LOCAL.x, p.y / R_LOCAL.y));
        return {
            x: p.x / K,
            y: p.y / K,
        };
    },
    segmentInsideCircle(x, y, tx, ty, cx, cy, radius) {
        const DX = tx - x,
            DY = ty - y,
            LENGTH = DX * DX + DY * DY,
            Q = LENGTH > 1e-12 ? CLAMP(((cx - x) * DX + (cy - y) * DY) / LENGTH, 0, 1) : 0;
        return (x + DX * Q - cx) ** 2 + (y + DY * Q - cy) ** 2 < radius * radius - 1e-10;
    },
    overlaps(a, b) {
        return (
            a.z <= b.z + b.height && a.z + a.height >= b.z && Math.hypot(a.x - b.x, a.y - b.y) <= a.radius + b.radius
        );
    },
    // Swept XY cylinder versus finite Z interval; includes entity radii, never center-only.
    sweep(a, b, r, h, target) {
        const DX = b.x - a.x,
            DY = b.y - a.y,
            DZ = b.z - a.z,
            R = r + target.radius;
        let lo = 0;
        let hi = 1;
        const A = DX * DX + DY * DY,
            B = 2 * ((a.x - target.x) * DX + (a.y - target.y) * DY),
            C = (a.x - target.x) ** 2 + (a.y - target.y) ** 2 - R * R;
        if (A < 1e-12) {
            if (C > 0) {
                return null;
            }
        } else {
            const D = B * B - 4 * A * C;
            if (D < 0) {
                return null;
            }
            lo = Math.max(lo, (-B - Math.sqrt(D)) / (2 * A));
            hi = Math.min(hi, (-B + Math.sqrt(D)) / (2 * A));
        }
        const BOTTOM = target.z - h,
            TOP = target.z + target.height;
        if (Math.abs(DZ) < 1e-12) {
            if (a.z < BOTTOM || a.z > TOP) {
                return null;
            }
        } else {
            let x = (BOTTOM - a.z) / DZ;
            let y = (TOP - a.z) / DZ;
            if (x > y) {
                [x, y] = [y, x];
            }
            lo = Math.max(lo, x);
            hi = Math.min(hi, y);
        }
        if (lo > hi || hi < 0 || lo > 1) {
            return null;
        }
        const T = CLAMP(lo, 0, 1);
        return {
            x: a.x + DX * T,
            y: a.y + DY * T,
            z: a.z + DZ * T,
            t: T,
        };
    },
};

export const BALLISTICS = {
    create(from, to, kind) {
        const DISTANCE = Math.hypot(to.x - from.x, to.y - from.y),
            MELEE = kind === 'ram' || kind === 'punch';
        return {
            from: {
                x: from.x,
                y: from.y,
                z: kind === 'lob' ? 0.45 : 0,
            },
            to: {
                ...to,
            },
            height: MELEE ? 0 : kind === 'lob' ? 2 : 2.7,
            duration: MELEE ? Math.max(0.12, DISTANCE / 10) : 0.65 + DISTANCE * 0.055,
        };
    },
    sample(path, q, output = {}) {
        q = CLAMP(q, 0, 1);
        output.x = path.from.x + (path.to.x - path.from.x) * q;
        output.y = path.from.y + (path.to.y - path.from.y) * q;
        output.z = path.from.z * (1 - q) + 4 * path.height * q * (1 - q);
        return output;
    },
};
