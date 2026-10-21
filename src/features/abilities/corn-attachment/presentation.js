// How a stuck kernel looks while it waits and when it pops. The model owns when it explodes; this only reads that.
const DEFAULT_BODY = Object.freeze({ radius: 0.3, height: 1, scale: 1, shiftX: 0, shiftY: 0 });
const POP_RING = 0.5;

export class CornAttachmentPresentation {
    label(_definition, value) {
        return `부착 1초 후 연쇄 폭발 · 알갱이마다 공격력 ${Math.round(value * 100)}%`;
    }
    title(value) {
        return `알갱이 ${Math.round(value * 100)}%`;
    }
    // Spreads the model's small offsets over the visible front of the target's body, so the kernels sit on it
    // (a boss is far bigger than the 0.18 the offsets were made for) and follow its hit recoil.
    anchor(attachment, group, body) {
        const SPREAD = body.radius / 0.18,
            FACE = body.radius * 0.55;
        return {
            x: group.targetX + attachment.offsetX * SPREAD + body.shiftX,
            y: group.targetY - FACE + body.shiftY,
            z: group.targetZ + body.height * (0.5 + (attachment.offsetY / 0.12) * 0.3),
        };
    }
    // A waiting kernel breathes faster as its fuse runs out and turns hot at the end; a popping one flares and shrinks.
    drawAttachment(renderer, attachment, group, { tick, body = DEFAULT_BODY }) {
        const AT = this.anchor(attachment, group, body),
            P = renderer.project(AT.x, AT.y, AT.z),
            FUSE = Math.min(
                1,
                Math.max(0, (tick - group.firstAttachTick) / Math.max(1, group.closeAtTick - group.firstAttachTick)),
            ),
            BASE = renderer.scale * 0.055 * body.scale;
        if (attachment.status === 'fading') {
            const POP = 1 - attachment.fadeTicks / 6;
            renderer.ring(AT.x, AT.y, POP_RING * body.scale * POP, `rgba(255,214,102,${1 - POP})`, 0.06);
            renderer.ellipse(P.x, P.y, BASE * (1.8 - POP), BASE * (1.8 - POP), `rgba(255,246,200,${1 - POP})`);
            return;
        }
        const RATE = 4 + 14 * FUSE * FUSE,
            BREATH = 1 + 0.18 * Math.sin((renderer.displayTimeMs / 1000) * RATE * Math.PI),
            HOT = FUSE > 0.7 ? (FUSE - 0.7) / 0.3 : 0,
            SIZE = BASE * BREATH;
        renderer.ellipse(
            P.x,
            P.y,
            SIZE,
            SIZE * 1.2,
            `rgba(${238 + 17 * HOT},${192 - 70 * HOT},${75 - 30 * HOT},1)`,
            attachment.angle,
        );
        renderer.ellipse(P.x - SIZE * 0.2, P.y - SIZE * 0.35, SIZE * 0.2, SIZE * 0.25, 'rgba(255,238,147,1)');
    }
}
