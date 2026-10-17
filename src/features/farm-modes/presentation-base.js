export class CelebrationEffect {
    draw(renderer, effect, progress) {
        const COLOR = this.color;
        renderer.ring(effect.x, effect.y, this.radius(progress), COLOR, 0.07);
        for (let i = 0; i < 6; i++) {
            const A = (i * Math.PI) / 3 + progress * this.rotationSpeed,
                SPREAD = this.spread(progress),
                P = renderer.project(
                    effect.x + Math.cos(A) * SPREAD,
                    effect.y + Math.sin(A) * SPREAD,
                    effect.z + progress * 0.9,
                ),
                R = renderer.scale * 0.14;
            renderer.ctx.fillStyle = COLOR;
            this.drawParticle(renderer, P, R);
        }
    }
}
