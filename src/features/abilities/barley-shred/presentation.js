export class BarleyArmorShredPresentation {
    label(_definition, value) {
        return `기본 공격 적중 후 방어도 ${value} 감소 · 감소마다 3초 · 방어도 최저 0`;
    }
    title(value) {
        return `방어도 −${value}`;
    }
    draw(renderer, event, progress) {
        const T = Math.min(1, progress / 0.72),
            ALPHA = 1 - T,
            CENTER = renderer.project(event.x, event.y, (event.z || 0) + 0.18);
        if (ALPHA <= 0) {
            return;
        }
        renderer.ring(event.x, event.y, 0.22 + T * 0.48, `rgba(191,209,196,${ALPHA * 0.72})`, 0.065);
        for (let index = 0; index < 4; index++) {
            const ANGLE = Math.PI / 4 + (index * Math.PI) / 2 + (event.sequence % 5) * 0.12,
                FROM = {
                    x: CENTER.x + Math.cos(ANGLE) * renderer.scale * 0.08,
                    y: CENTER.y + Math.sin(ANGLE) * renderer.scale * 0.08,
                },
                TO = {
                    x: CENTER.x + Math.cos(ANGLE) * renderer.scale * (0.22 + T * 0.18),
                    y: CENTER.y + Math.sin(ANGLE) * renderer.scale * (0.22 + T * 0.18),
                };
            renderer.line(FROM, TO, 0.055, `rgba(229,242,229,${ALPHA})`);
        }
    }
    drawStatus(renderer, target, amount) {
        if (target.hp <= 0 || amount <= 0) {
            return;
        }
        const CENTER = renderer.project(target.x, target.y, (target.z || 0) + (target.height || 0) + 0.16),
            SIZE = renderer.scale * 0.11;
        for (let index = -1; index <= 1; index++) {
            const OFFSET = index * SIZE * 0.8,
                FROM = {
                    x: CENTER.x + OFFSET - SIZE * 0.28,
                    y: CENTER.y + SIZE * 0.42,
                },
                TO = {
                    x: CENTER.x + OFFSET + SIZE * 0.28,
                    y: CENTER.y - SIZE * 0.42,
                };
            renderer.pixelLine(FROM, TO, Math.max(1, renderer.pixelRatio * 1.4), '#d8e5d7');
        }
    }
}
