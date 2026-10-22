import { bossVectorScale } from './vector-sockets.cjs';
import { speciesById } from './species-catalog.js';
import { CONFIG, clamp } from './farm-model.js';
import { BossAttackPose, BossAttackPresentation } from './features/boss-patterns/presentation-base.js';
import { FrontSlamPresentation } from './features/boss-patterns/front-slam/presentation.js';
import { CircleSweepPresentation } from './features/boss-patterns/sweep-360/presentation.js';
import { ChargePresentation } from './features/boss-patterns/charge/presentation.js';
import { LeapSlamPresentation } from './features/boss-patterns/leap-slam/presentation.js';
import { FanSweepPresentation } from './features/boss-patterns/fan-sweep/presentation.js';
import { MouthSummonPresentation } from './features/boss-patterns/mouth-summon/presentation.js';
import { BarleyArmorShredPresentation } from './features/abilities/barley-shred/presentation.js';

const IDLE_PRESENTATION = new BossAttackPresentation();
const BARLEY_SHRED_PRESENTATION = new BarleyArmorShredPresentation();
const BOSS_PRESENTATIONS = new Map(
    [
        new FrontSlamPresentation(),
        new CircleSweepPresentation(),
        new ChargePresentation(),
        new LeapSlamPresentation(),
        new FanSweepPresentation(),
        new MouthSummonPresentation(),
    ].map((presentation) => [presentation.id, presentation]),
);
export function bossAttackPresentation(boss) {
    return BOSS_PRESENTATIONS.get(boss.patternId) || IDLE_PRESENTATION;
}

export class BossPresentation {
    constructor(renderer) {
        this.renderer = renderer;
        this.bossAttackPose = new BossAttackPose();
    }
    bossPose(world, boss = world.boss) {
        const B = boss,
            K = bossAttackPresentation(B).summoning
                ? {
                      x: 0,
                      y: 0,
                      squash: 0,
                  }
                : this.renderer.feel?.boss(this.renderer.displayTimeMs) || {
                      x: 0,
                      y: 0,
                      squash: 0,
                  },
            GROUND = this.renderer.project(B.x + K.x, B.y + K.y, 0),
            P = this.renderer.project(B.x + K.x, B.y + K.y, B.z || 0),
            R = this.renderer.scale * B.radius * 1.16;
        return {
            b: B,
            p: P,
            ground: GROUND,
            r: R,
            k: K,
        };
    }
    bossMotion(b, world) {
        const EVENT = b === world.boss ? world.farmBossEvent : null;
        if (EVENT?.phase === 'celebrating' && EVENT.outcome === 'defeat') {
            return 'idle';
        }
        if (b.hp <= 0) {
            return 'death';
        }
        if (b.flash > 0.09 && b.patternPhase === 'idle') {
            return 'hit';
        }
        if (b.patternPhase === 'windup') {
            return 'windup';
        }
        const PRESENTATION = bossAttackPresentation(b);
        if (b.patternPhase === 'active') {
            return PRESENTATION.activeMotion(b);
        }
        if (b.patternPhase === 'recover') {
            return PRESENTATION.recoverMotion(b);
        }
        return b.phase === 'chase' ? 'walk' : 'idle';
    }
    draw(source, world) {
        // A boss standing on its tile of the map is drawn from its own record; the fighting one is the world's.
        const BOSS = source && source.radius ? source : world.boss,
            { b: B, p: P, k: K } = this.bossPose(world, BOSS),
            EVENT = BOSS === world.boss ? world.farmBossEvent : null,
            SPECIES = B.species,
            PRESENTATION = bossAttackPresentation(B);
        const RECORD = this.renderer.bossSpeciesAssets.get(SPECIES);
        if (!RECORD) {
            throw new Error('Missing required boss vector asset for species ' + SPECIES);
        }
        let instance = this.renderer.bossPlayers.get(SPECIES);
        if (!instance) {
            const PLAYER = RECORD.asset.createPlayer({
                clip: 'idle',
                startedAtMs: this.renderer.displayTimeMs,
            });
            instance = {
                record: RECORD,
                player: PLAYER,
            };
            this.renderer.bossPlayers.set(SPECIES, instance);
        }
        const PLAYER = instance.player;
        this.renderer.bossPlayer = PLAYER;
        this.renderer.bossPlayerAsset = RECORD;
        const METADATA = RECORD.compiled.metadata,
            NAME = this.bossMotion(B, world),
            FALLBACK_CLIP =
                NAME === 'airborne'
                    ? METADATA.clips.strike
                        ? 'strike'
                        : METADATA.clips.fire
                          ? 'fire'
                          : 'idle'
                    : ['strike', 'sweep', 'fire'].includes(NAME) && !METADATA.clips[NAME]
                      ? METADATA.clips.fire
                          ? 'fire'
                          : 'idle'
                      : 'idle',
            CLIP_NAME = METADATA.clips[NAME] ? NAME : FALLBACK_CLIP,
            CLIP = METADATA.clips[CLIP_NAME];
        const TIMED = ['windup', 'strike', 'sweep', 'recover', 'hit', 'death', 'fire', 'airborne'].includes(NAME),
            ELAPSED = B.patternId ? B.patternPhaseElapsed : B.clock;
        const CLIP_START_AT_MS = TIMED
            ? this.renderer.displayTimeMs - Math.min(CLIP.durationMs, Math.max(0, ELAPSED || 0) * 1000)
            : NAME === 'walk'
              ? this.renderer.displayTimeMs - Math.max(0, B.travel || 0) * 110
              : this.renderer.displayTimeMs - (((B.travel || 0) * 37) % CLIP.durationMs);
        PRESENTATION.play(instance, METADATA, B, CLIP_NAME, CLIP_START_AT_MS);
        const SUMMON_OPEN = PRESENTATION.mouthOpen(B);
        const EXPRESSION =
            B.hp <= 0
                ? 'dead'
                : EVENT?.phase === 'celebrating' && EVENT.outcome === 'defeat'
                  ? 'happy'
                  : SUMMON_OPEN
                    ? 'attack'
                    : B.patternPhase === 'windup'
                      ? 'focused'
                      : B.patternPhase === 'active'
                        ? 'attack'
                        : B.flash > 0.07
                          ? 'hurt'
                          : 'neutral';
        if (!METADATA.expressions?.[EXPRESSION] && !METADATA.expressions?.neutral) {
            throw new Error('Boss asset is missing a supported expression');
        }
        const SAFE_EXPRESSION = METADATA.expressions?.[EXPRESSION] ? EXPRESSION : 'neutral';
        if (PLAYER.currentExpression !== SAFE_EXPRESSION) {
            PLAYER.setExpression(SAFE_EXPRESSION);
        }
        PRESENTATION.seek(PLAYER, this.renderer.displayTimeMs);
        const S_LOCAL = this.renderer.scale * bossVectorScale(),
            GROUND = RECORD.anchors.ground,
            MATRIX = [S_LOCAL, 0, 0, S_LOCAL, P.x - GROUND.x * S_LOCAL, P.y - GROUND.y * S_LOCAL];
        const DEFEAT_BOUNCE =
            EVENT?.phase === 'celebrating' && EVENT.outcome === 'defeat'
                ? Math.max(0, Math.sin(((EVENT.elapsed * Math.PI * 2) / CONFIG.farm.bossEvent.celebrationSeconds) * 2))
                : 0;
        const FADE = EVENT?.phase === 'fading' ? clamp(1 - EVENT.elapsed / CONFIG.farm.bossEvent.fadeSeconds, 0, 1) : 1;
        const PARTS = RECORD.parts,
            POSE = PRESENTATION.pose(B, PARTS, this.bossAttackPose, RECORD.hands);
        PLAYER.setBasePose('body', {
            x: 0,
            y: POSE.body.y - 18 * DEFEAT_BOUNCE,
            rotation: POSE.body.rotation,
            scaleX: POSE.body.scaleX * (1 + (K.squash || 0)) * (1 - 0.04 * DEFEAT_BOUNCE),
            scaleY: POSE.body.scaleY * (1 - (K.squash || 0)) * (1 + 0.06 * DEFEAT_BOUNCE),
            opacity: FADE,
        });
        // The hands float: each is moved round the body, and the weapon a species holds goes with its hand.
        const TO_SVG = 1 / bossVectorScale(),
            HELD = speciesById(SPECIES).heldItem;
        for (const [PART, HAND] of Object.entries(POSE.hands)) {
            const AT = { x: HAND.x * TO_SVG, y: HAND.y * TO_SVG + POSE.body.y };
            PLAYER.setBasePose(PART, AT);
            if (HELD?.hand === PART && PARTS.has(HELD.part)) {
                PLAYER.setBasePose(HELD.part, AT);
            }
        }
        for (const [PART, PART_POSE] of Object.entries(POSE.extras)) {
            if (PARTS.has(PART)) {
                PLAYER.setBasePose(PART, PART_POSE);
            }
        }
        const MOUTH_SOCKET = PLAYER.getSocket('mouth'),
            MOUTH_SCREEN = {
                x: MOUTH_SOCKET.x * S_LOCAL + MATRIX[4],
                y: MOUTH_SOCKET.y * S_LOCAL + MATRIX[5],
            };
        this.renderer.ctx.vector.flush();
        PLAYER.draw({
            projection: this.renderer.ctx.vector.projection,
            matrix: MATRIX,
        });
        PRESENTATION.drawRelease(this.renderer, B, POSE, MOUTH_SCREEN);
        BARLEY_SHRED_PRESENTATION.drawStatus(this.renderer, B);
    }
}
