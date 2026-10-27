import { WORLD_HEIGHT_PROJECTION } from '../../../../vector-sockets.js';

// Shared drawing kit of the five signature effects. Every particle is a pure function of the time since the effect
// began (hash-seeded), so nothing is stored between frames and a replay always looks the same.
export const TAU = Math.PI * 2;
export function clamp(value, low = 0, high = 1) {
    return Math.min(high, Math.max(low, value));
}
export function outBack(t) {
    return 1 + 2.9 * (t - 1) ** 3 + 1.9 * (t - 1) ** 2;
}
export function rand(index, seed = 0) {
    const X = Math.sin(index * 127.1 + seed * 311.7 + 0.5) * 43758.5453;
    return X - Math.floor(X);
}
// A point at `distance` from the origin along `angle` on the ground.
export function polar(x, y, angle, distance) {
    return { x: x + Math.cos(angle) * distance, y: y + Math.sin(angle) * distance };
}
// A thrown fleck: flies out along `angle` (flattened by the view) and falls back under `gravity`.
export function ballistic(x, y, angle, speed, seconds, base, rise, gravity) {
    return {
        x: x + Math.cos(angle) * speed * seconds,
        y: y + Math.sin(angle) * speed * seconds * 0.5,
        z: base + rise * seconds - gravity * seconds * seconds,
    };
}

// World positions in, flat shapes out. `alpha` multiplies whatever the frame had when the brush was made.
export class Brush {
    constructor(renderer) {
        this.renderer = renderer;
        this.ctx = renderer.ctx;
        this.baseAlpha = this.ctx.globalAlpha;
        this.scale = renderer.scale;
    }
    done() {
        this.add(false);
        this.ctx.globalAlpha = this.baseAlpha;
    }
    // Light adds up where it overlaps: glow, sparks and bolts are drawn with the additive operation.
    add(on) {
        const MODE = on ? 'lighter' : 'source-over';
        if (this.ctx.globalCompositeOperation !== MODE) {
            this.ctx.globalCompositeOperation = MODE;
        }
    }
    at(x, y, z = 0) {
        return this.renderer.project(x, y, z);
    }
    dot(x, y, z, radius, color, alpha) {
        const P = this.at(x, y, z);
        this.ctx.globalAlpha = this.baseAlpha * alpha;
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.ellipse(P.x, P.y, Math.max(0.6, radius * this.scale), Math.max(0.6, radius * this.scale), 0, 0, TAU);
        this.ctx.fill();
    }
    flat(x, y, radiusX, radiusY, color, alpha, outline = null, width = 0.06) {
        const P = this.at(x, y);
        this.ctx.globalAlpha = this.baseAlpha * alpha;
        this.ctx.beginPath();
        this.ctx.ellipse(
            P.x,
            P.y,
            Math.max(0.6, radiusX * this.scale),
            Math.max(0.6, radiusY * this.scale * 0.62),
            0,
            0,
            TAU,
        );
        if (color) {
            this.ctx.fillStyle = color;
            this.ctx.fill();
        }
        if (outline) {
            this.ctx.strokeStyle = outline;
            this.ctx.lineWidth = width * this.scale;
            this.ctx.stroke();
        }
    }
    poly(points, fill, alpha, stroke = null, width = 1.4) {
        this.ctx.globalAlpha = this.baseAlpha * alpha;
        this.ctx.beginPath();
        points.forEach((point, index) =>
            index ? this.ctx.lineTo(point[0], point[1]) : this.ctx.moveTo(point[0], point[1]),
        );
        this.ctx.closePath();
        if (fill) {
            this.ctx.fillStyle = fill;
            this.ctx.fill();
        }
        if (stroke) {
            this.ctx.strokeStyle = stroke;
            this.ctx.lineWidth = width;
            this.ctx.lineJoin = 'round';
            this.ctx.stroke();
        }
    }
    // A flat flame packet: a four-cornered sliver pointing along `angle` (screen).
    sliver(x, y, z, size, angle, color, alpha) {
        const P = this.at(x, y, z),
            S = size * this.scale,
            COS = Math.cos(angle),
            SIN = Math.sin(angle),
            CORNERS = [
                [0.78, 0],
                [-0.48, -0.42],
                [-0.72, 0],
                [-0.48, 0.42],
            ];
        this.ctx.globalAlpha = this.baseAlpha * alpha;
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        CORNERS.forEach(([cx, cy], index) => {
            const X = P.x + (cx * COS - cy * SIN) * S,
                Y = P.y + (cx * SIN + cy * COS) * S;
            if (index) {
                this.ctx.lineTo(X, Y);
            } else {
                this.ctx.moveTo(X, Y);
            }
        });
        this.ctx.closePath();
        this.ctx.fill();
    }
    stroke(points, width, color, alpha) {
        this.ctx.globalAlpha = this.baseAlpha * alpha;
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = Math.max(1, width * this.scale);
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.beginPath();
        points.forEach((point, index) =>
            index ? this.ctx.lineTo(point.x, point.y) : this.ctx.moveTo(point.x, point.y),
        );
        this.ctx.stroke();
    }
    // Screen height of `z` world height units.
    lift(z) {
        return z * WORLD_HEIGHT_PROJECTION * this.scale;
    }
}
