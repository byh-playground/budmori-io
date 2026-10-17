import { CelebrationEffect } from '../presentation-base.js';

export class BirthEffect extends CelebrationEffect {
    constructor() {
        super();
        this.color = '#df87a4';
        this.rotationSpeed = 0.3;
    }
    radius(progress) {
        return 0.35 + progress * 1.5;
    }
    spread(progress) {
        return 0.4 + progress * 1.3;
    }
    drawParticle(renderer, point, radius) {
        const C = renderer.ctx,
            COLOR = this.color;
        renderer.ellipse(point.x - radius * 0.44, point.y - radius * 0.25, radius * 0.6, radius * 0.6, COLOR);
        renderer.ellipse(point.x + radius * 0.44, point.y - radius * 0.25, radius * 0.6, radius * 0.6, COLOR);
        C.beginPath();
        C.moveTo(point.x - radius, point.y);
        C.lineTo(point.x, point.y + radius);
        C.lineTo(point.x + radius, point.y);
        C.closePath();
        C.fill();
    }
}
