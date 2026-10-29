import { drawUnitFace } from '../../../render/unit-face-draw.js';
const PEANUT_PLAYERS_BY_RENDERER = new WeakMap();

export class PeanutDeathSplitPresentation {
    dispose(renderer) {
        const PLAYERS = PEANUT_PLAYERS_BY_RENDERER.get(renderer);
        if (!PLAYERS) {
            return;
        }
        for (const PLAYER of PLAYERS.values()) {
            PLAYER.dispose();
        }
        PLAYERS.clear();
        PEANUT_PLAYERS_BY_RENDERER.delete(renderer);
    }
    label(_definition, value) {
        return `사망 시 T1 분열체 2마리 · 체력/공격력 ×${value}`;
    }
    title(value) {
        return `분열체 ×${value}`;
    }
    draw(renderer, effect, progress) {
        this.drawSplit(renderer, effect, progress);
    }
    drawSplit(renderer, effect, progress) {
        const RECORD = renderer.vectorAssets.get(effect.species);
        if (!RECORD) {
            return;
        }
        let players = PEANUT_PLAYERS_BY_RENDERER.get(renderer);
        if (!players) {
            players = new Map();
            PEANUT_PLAYERS_BY_RENDERER.set(renderer, players);
        }
        let player = players.get(effect.eventId);
        if (!player) {
            player = globalThis.BloomGamekitVectorAssets.createVectorActor(renderer.ctx, RECORD.compiled, {
                clip: 'fire',
                startedAtMs: 0,
            });
            players.set(effect.eventId, player);
        }
        const CLIP = RECORD.compiled.metadata.clips.fire,
            ELAPSED_MS = Math.max(0, Math.min(CLIP.durationMs, progress * 1000)),
            [, , WIDTH, HEIGHT] = RECORD.compiled.viewBox,
            GROUND = RECORD.anchors.ground,
            POSITION = renderer.project(effect.x, effect.y, effect.z || 0),
            RADIUS = renderer.scale * 0.72,
            SCALE = (2 * RADIUS) / Math.max(WIDTH, HEIGHT),
            CENTER_Y = POSITION.y + (HEIGHT * 0.5 - GROUND.y) * SCALE,
            MATRIX = [SCALE, 0, 0, SCALE, POSITION.x - GROUND.x * SCALE, CENTER_Y - GROUND.y * SCALE],
            ALPHA = Math.max(0, 1 - progress / 0.7);
        player.play('fire', 0);
        player.seek(ELAPSED_MS);
        renderer.ctx.drawVectorActor(player, {
            matrix: MATRIX,
            alpha: ALPHA,
        });
        drawUnitFace(renderer.ctx, RECORD, player, 'surprised', null, MATRIX, ALPHA);
        if (ELAPSED_MS >= CLIP.durationMs) {
            player.dispose();
            players.delete(effect.eventId);
        }
    }
}
