import {
    unitAttackPresentation,
    unitAttackMotion,
    unitCombatMotion,
    unitCombatExpression,
    motionElapsedMs,
    prepareUnitAttackPlayer,
    applyUnitAttackPose,
    updateUnitAttackDisplay,
    drawUnitAttackGround,
    drawUnitAttackContact,
} from '../features/unit-attacks/presentation.js';
import { unitAttackDisplayScale } from '../features/unit-attacks/presentation-geometry.js';
import { visibleSkillCast, sampleSkillCastPose } from '../features/skill-cast/presentation.js';
import { bossVectorScale } from '../vector-sockets.js';
import { CONFIG, clamp } from '../model/farm-model.js';
import { BossAttackPose, BossAttackPresentation } from '../features/boss-patterns/presentation-base.js';
import { FrontSlamPresentation } from '../features/boss-patterns/front-slam/presentation.js';
import { CircleSweepPresentation } from '../features/boss-patterns/sweep-360/presentation.js';
import { ChargePresentation } from '../features/boss-patterns/charge/presentation.js';
import { LeapSlamPresentation } from '../features/boss-patterns/leap-slam/presentation.js';
import { FanSweepPresentation } from '../features/boss-patterns/fan-sweep/presentation.js';
import { drawElementMark, drawFaceMarks } from './unit-face-overlay.js';
import { towerElement } from '../tower/tower-theme.js';
import { SIGNATURE_PRESENTATIONS } from '../features/boss-patterns/signature/presentation.js';
import { MouthSummonPresentation } from '../features/boss-patterns/mouth-summon/presentation.js';
import { BarleyArmorShredPresentation } from '../features/abilities/barley-shred/presentation.js';

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
        ...SIGNATURE_PRESENTATIONS,
    ].map((presentation) => [presentation.id, presentation]),
);
export function bossAttackPresentation(boss) {
    return BOSS_PRESENTATIONS.get(boss.patternId) || IDLE_PRESENTATION;
}

export class BossPresentation {
    constructor(renderer) {
        this.renderer = renderer;
        this.attackDisplays = new Map();
        this.preparedVisibleBosses = new Map();
        this.preparedBossFrame = -1;
    }
    sourceBoss(boss) {
        const ENTRY = this.attackDisplays.get(boss.id);
        return boss === ENTRY?.unit ? ENTRY.source : boss;
    }
    basicAttackVisible(boss, world) {
        const EVENT = world.farmBossEvent;
        return (
            boss.hp > 0 &&
            (!EVENT || EVENT.phase === 'fighting') &&
            !visibleSkillCast(boss) &&
            (!boss.patternPhase || boss.patternPhase === 'idle') &&
            !!unitAttackMotion(boss)
        );
    }
    displayBoss(boss, world) {
        const SOURCE = this.sourceBoss(boss);
        let entry = this.attackDisplays.get(SOURCE.id);
        if (
            !entry ||
            entry.world !== world ||
            entry.generation !== SOURCE.generation ||
            entry.species !== SOURCE.species ||
            entry.revision !== world.presentationRevision ||
            entry.time > this.renderer.displayTimeMs
        ) {
            entry = {
                world,
                generation: SOURCE.generation,
                species: SOURCE.species,
                revision: world.presentationRevision,
                unit: {},
                offset: { x: 0, y: 0 },
                releasedAt: null,
            };
            this.attackDisplays.set(SOURCE.id, entry);
        }
        entry.source = SOURCE;
        entry.time = this.renderer.displayTimeMs;
        // A special pattern or card cast owns its pose exclusively. Do not carry
        // an interrupted melee lunge into the existing overlay's socket space.
        if (visibleSkillCast(SOURCE) || (SOURCE.patternPhase && SOURCE.patternPhase !== 'idle')) {
            entry.offset = { x: 0, y: 0 };
        }
        return updateUnitAttackDisplay(
            this.renderer,
            entry,
            SOURCE,
            world.time,
            this.renderer.bossSpeciesAssets.get(SOURCE.species),
            this.basicAttackVisible(SOURCE, world),
        );
    }
    bossPose(world, boss = world.boss) {
        const B = boss,
            K =
                visibleSkillCast(B) || bossAttackPresentation(B).summoning
                    ? {
                          x: 0,
                          y: 0,
                          squash: 0,
                      }
                    : this.renderer.feel?.boss(this.renderer.displayTimeMs, B.id) || {
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
    bossMotion(b, world, event = world.farmBossEvent) {
        const EVENT = event;
        if (EVENT?.phase === 'celebrating' && EVENT.outcome === 'defeat') {
            return 'idle';
        }
        if (b.hp <= 0) {
            return 'death';
        }
        if (visibleSkillCast(b)) {
            return 'idle';
        }
        if (this.basicAttackVisible(b, world)) {
            return unitCombatMotion(b);
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
    prepareVisibleBoss(source, world) {
        const FRAME = this.renderer.device.stats.frame;
        if (this.preparedBossFrame !== FRAME) {
            this.preparedVisibleBosses.clear();
            this.preparedBossFrame = FRAME;
        }
        const SOURCE_BOSS = this.sourceBoss(source);
        const CURRENT_BOSS = SOURCE_BOSS && SOURCE_BOSS.radius ? SOURCE_BOSS : world.boss;
        const CURRENT_RECORD = this.renderer.bossSpeciesAssets.get(CURRENT_BOSS.species);
        const PREPARED_KEY = SOURCE_BOSS.id + ':' + SOURCE_BOSS.generation;
        const CACHED = this.preparedVisibleBosses.get(PREPARED_KEY);
        if (
            CACHED?.world === world &&
            CACHED.source === SOURCE_BOSS &&
            CACHED.displayTimeMs === this.renderer.displayTimeMs &&
            CACHED.revision === world.presentationRevision &&
            CACHED.species === CURRENT_BOSS.species &&
            CACHED.record === CURRENT_RECORD
        ) {
            return CACHED;
        }
        // A boss standing on its tile of the map is drawn from its own record; the fighting one is the world's.
        const SOURCE = SOURCE_BOSS,
            BOSS = CURRENT_BOSS,
            { b: B, p: P, k: K } = this.bossPose(world, this.displayBoss(BOSS, world)),
            EVENT = world.farmBossEvent,
            SPECIES = B.species,
            CAST = !EVENT || EVENT.phase === 'fighting' ? visibleSkillCast(B) : null,
            BASIC = this.basicAttackVisible(B, world),
            ATTACK = unitAttackPresentation(B),
            PRESENTATION = CAST || BASIC ? IDLE_PRESENTATION : bossAttackPresentation(B);
        const RECORD = CURRENT_RECORD;
        if (!RECORD) {
            throw new Error('Missing required boss vector asset for species ' + SPECIES);
        }
        const INSTANCE_KEY = B.id + ':' + B.generation;
        let instance = this.renderer.bossPlayers.get(INSTANCE_KEY);
        if (instance && instance.record !== RECORD) {
            instance.player.dispose();
            this.renderer.bossPlayers.delete(INSTANCE_KEY);
            instance = null;
        }
        if (!instance) {
            const PLAYER = RECORD.asset.createPlayer({
                clip: 'idle',
                startedAtMs: this.renderer.displayTimeMs,
            });
            instance = {
                record: RECORD,
                player: PLAYER,
                attackPose: new BossAttackPose(),
            };
            this.renderer.bossPlayers.set(INSTANCE_KEY, instance);
        }
        const PLAYER = instance.player;
        this.renderer.bossPlayer = PLAYER;
        this.renderer.bossPlayerAsset = RECORD;
        const METADATA = RECORD.compiled.metadata,
            NAME = this.bossMotion(B, world, EVENT),
            CLIP_NAME = ['strike', 'sweep'].includes(NAME) && !METADATA.clips[NAME] ? 'fire' : NAME,
            CLIP = METADATA.clips[CLIP_NAME];
        if (!CLIP) {
            throw new Error(`Missing shared species clip ${CLIP_NAME} for boss ${SPECIES}`);
        }
        const PHASE_TIME_MS = BASIC ? ATTACK.clipElapsedMs?.(B, NAME) : null,
            HAS_PHASE_CLOCK = Number.isFinite(PHASE_TIME_MS),
            TIMED = ['windup', 'strike', 'sweep', 'recover', 'hit', 'death', 'fire', 'airborne'].includes(NAME),
            ELAPSED =
                B.hp <= 0 && EVENT?.phase === 'fighting'
                    ? CLIP.durationMs / 1000
                    : B.patternId
                      ? B.patternPhaseElapsed
                      : B.clock;
        const CLIP_START_AT_MS = BASIC
            ? HAS_PHASE_CLOCK
                ? 0
                : this.renderer.displayTimeMs - motionElapsedMs(B, NAME, CLIP)
            : TIMED
              ? this.renderer.displayTimeMs - Math.min(CLIP.durationMs, Math.max(0, ELAPSED || 0) * 1000)
              : NAME === 'walk'
                ? this.renderer.displayTimeMs - Math.max(0, B.travel || 0) * 110
                : this.renderer.displayTimeMs - (((B.travel || 0) * 37) % CLIP.durationMs);
        if (CAST) {
            // Freeze the neutral authored frame so cast pose and release use only
            // the simulation clock, including restore and repeated same-skill casts.
            PLAYER.play('idle', 0);
            PLAYER.seek(0);
            instance.summoning = false;
        } else if (BASIC) {
            if (instance.summoning || PLAYER.currentClip !== CLIP_NAME) {
                PLAYER.play(CLIP_NAME, CLIP_START_AT_MS);
            }
            instance.summoning = false;
        } else {
            PRESENTATION.play(instance, METADATA, B, CLIP_NAME, CLIP_START_AT_MS);
        }
        const CAST_POSE = CAST ? sampleSkillCastPose(CAST, B.radius / bossVectorScale(B)) : null;
        const SUMMON_OPEN = PRESENTATION.mouthOpen(B);
        const EXPRESSION =
            B.hp <= 0
                ? 'dead'
                : EVENT?.phase === 'celebrating' && EVENT.outcome === 'defeat'
                  ? 'happy'
                  : CAST_POSE
                    ? CAST_POSE.expression
                    : BASIC
                      ? unitCombatExpression(B) || 'neutral'
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
        prepareUnitAttackPlayer(PLAYER, B);
        if (BASIC) {
            PLAYER.seek(HAS_PHASE_CLOCK ? clamp(PHASE_TIME_MS, 0, CLIP.durationMs) : this.renderer.displayTimeMs);
        } else if (!CAST) {
            PRESENTATION.seek(PLAYER, this.renderer.displayTimeMs);
        }
        const S_LOCAL = BASIC
                ? unitAttackDisplayScale(this.renderer, B, world.time)
                : this.renderer.scale * bossVectorScale(B),
            GROUND = RECORD.anchors.ground,
            MATRIX = [S_LOCAL, 0, 0, S_LOCAL, P.x - GROUND.x * S_LOCAL, P.y - GROUND.y * S_LOCAL];
        const DEFEAT_BOUNCE =
            EVENT?.phase === 'celebrating' && EVENT.outcome === 'defeat'
                ? Math.max(0, Math.sin(((EVENT.elapsed * Math.PI * 2) / CONFIG.farm.bossEvent.celebrationSeconds) * 2))
                : 0;
        const FADE = EVENT?.phase === 'fading' ? clamp(1 - EVENT.elapsed / CONFIG.farm.bossEvent.fadeSeconds, 0, 1) : 1;
        const PARTS = RECORD.parts,
            POSE = PRESENTATION.pose(B, PARTS, (instance.attackPose ??= new BossAttackPose()), RECORD.hands);
        // Ordinary pose writes below reset every channel touched by the cast on
        // completion, cancellation or death. No cast pose survives into combat.
        if (CAST_POSE) {
            Object.assign(POSE.body, CAST_POSE.body);
        }
        PLAYER.setBasePose('body', {
            x: 0,
            y: POSE.body.y - 18 * DEFEAT_BOUNCE,
            rotation: POSE.body.rotation,
            scaleX: POSE.body.scaleX * (1 + (K.squash || 0)) * (1 - 0.04 * DEFEAT_BOUNCE),
            scaleY: POSE.body.scaleY * (1 - (K.squash || 0)) * (1 + 0.06 * DEFEAT_BOUNCE),
            opacity: FADE,
        });
        // The same authored rig is retained through idle, basic attacks, special
        // patterns and cards. Root parts receive body translation exactly once;
        // parented limbs/items already inherit it from the native SVG hierarchy.
        const TO_SVG = 1 / bossVectorScale(B);
        for (const [SIDE, HAND] of Object.entries(POSE.hands)) {
            const OFFSET = CAST_POSE?.hands[SIDE] || { x: HAND.x * TO_SVG, y: HAND.y * TO_SVG };
            for (const CHANNEL of RECORD.hands.channels[SIDE]) {
                PLAYER.setBasePose(CHANNEL.part, {
                    x: OFFSET.x,
                    y: OFFSET.y + (CHANNEL.followsBody ? 0 : POSE.body.y),
                });
            }
        }
        for (const [PART, PART_POSE] of Object.entries(POSE.extras)) {
            if (PARTS.has(PART)) {
                PLAYER.setBasePose(PART, PART_POSE);
            }
        }
        if (BASIC) {
            applyUnitAttackPose(MATRIX, B, GROUND);
        }
        PLAYER.preparePose();
        const PREPARED = {
            world,
            source: SOURCE,
            displayTimeMs: this.renderer.displayTimeMs,
            revision: world.presentationRevision,
            boss: B,
            projected: P,
            basic: BASIC,
            player: PLAYER,
            record: RECORD,
            species: SPECIES,
            presentation: PRESENTATION,
            pose: POSE,
            matrix: MATRIX,
            scale: S_LOCAL,
        };
        this.preparedVisibleBosses.set(PREPARED_KEY, PREPARED);
        return PREPARED;
    }
    draw(source, world) {
        const PREPARED = this.prepareVisibleBoss(source, world);
        const {
            boss: B,
            projected: P,
            basic: BASIC,
            player: PLAYER,
            record: RECORD,
            species: SPECIES,
            presentation: PRESENTATION,
            pose: POSE,
            matrix: MATRIX,
            scale: S_LOCAL,
        } = PREPARED;
        this.renderer.bossPlayer = PLAYER;
        this.renderer.bossPlayerAsset = RECORD;
        if (BASIC) {
            drawUnitAttackGround(this.renderer, B);
        }
        if (this.renderer.cornAttachmentBodies.has(B.id)) {
            this.renderer.captureCornAttachmentBody(B, B.id, PLAYER, MATRIX);
        }
        const MOUTH_SOCKET = PLAYER.getSocket('mouth'),
            MOUTH_SCREEN = {
                x: MOUTH_SOCKET.x * S_LOCAL + MATRIX[4],
                y: MOUTH_SOCKET.y * S_LOCAL + MATRIX[5],
            };
        // Keep the main branch's actual overlay submission order unchanged.
        this.renderer.ctx.vector.flush();
        PLAYER.draw({
            projection: this.renderer.ctx.vector.projection,
            matrix: MATRIX,
        });
        PRESENTATION.drawRelease(this.renderer, B, POSE, MOUTH_SCREEN);
        if (world.tower.active && B.hp > 0) {
            // A boss shows its floor band's element like every other enemy: cheeks in its colour and a mark above.
            const ELEMENT = towerElement(world.tower.floor),
                REST = RECORD.anchors.mouth;
            drawFaceMarks(this.renderer.ctx, SPECIES, -1, ELEMENT, MATRIX, {
                x: MOUTH_SOCKET.x - REST.x,
                y: MOUTH_SOCKET.y - REST.y,
            });
            drawElementMark(
                this.renderer.ctx,
                ELEMENT,
                P.x + B.radius * this.renderer.scale * 0.55,
                this.renderer.project(B.x, B.y, (B.z || 0) + B.height + 0.4).y,
                this.renderer.scale * 1.3,
            );
        }
        drawUnitAttackContact(this.renderer, B, PLAYER, MATRIX);
        BARLEY_SHRED_PRESENTATION.drawStatus(this.renderer, B);
    }
}
