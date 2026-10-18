export class CornAttachmentPresentation {
    label(_definition, value) {
        return `부착 1초 후 연쇄 폭발 · 알갱이마다 공격력 ${Math.round(value * 100)}%`;
    }
    title(value) {
        return `알갱이 ${Math.round(value * 100)}%`;
    }
    drawAttachment(renderer, attachment, group) {
        const P = renderer.project(
                group.targetX + attachment.offsetX,
                group.targetY + attachment.offsetY,
                group.targetZ + 0.5,
            ),
            SIZE = renderer.scale * 0.055,
            ALPHA = attachment.status === 'fading' ? attachment.fadeTicks / 6 : 1;
        renderer.ellipse(P.x, P.y, SIZE, SIZE * 1.2, `rgba(238,192,75,${ALPHA})`, attachment.angle);
        renderer.ellipse(P.x - SIZE * 0.2, P.y - SIZE * 0.35, SIZE * 0.2, SIZE * 0.25, `rgba(255,238,147,${ALPHA})`);
    }
}
