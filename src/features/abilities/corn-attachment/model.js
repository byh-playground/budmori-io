import {
    cornActionFor,
    cornAttackContext,
    cornCriticalRoll,
    cornKernelMultiplier,
} from '../../species-growth/corn-attack.js';
import { getAbilityEffects } from '../../../ability-progression.js';
import { CORN_ATTACHMENT_FEATURE } from './definition.js';

const DEFINITION = CORN_ATTACHMENT_FEATURE.definition;

export class CornAttachmentModel {
    static projectileEffect(progression, tier) {
        const CONFIG_LOCAL = this.config(progression, tier);
        return CONFIG_LOCAL ? { abilityId: DEFINITION.id, config: CONFIG_LOCAL } : null;
    }
    static config(progression, tier) {
        const EFFECT = getAbilityEffects(progression, DEFINITION.id, tier);
        if (!EFFECT) {
            return null;
        }
        return {
            damageMultiplier: EFFECT.value,
            attachDelayTicks: DEFINITION.attachDelayTicks,
            explosionSpacingTicks: DEFINITION.explosionSpacingTicks,
            fadeTicks: DEFINITION.fadeTicks,
        };
    }
    static createManager() {
        return {
            nextGroupId: 1,
            nextAttachmentId: 1,
            groups: [],
            actions: [],
        };
    }
    static attach(world, target, projectile, config) {
        if (!world || !target || target.hp <= 0 || !projectile?.cornPayload || !config) {
            return null;
        }
        const TICK = world.simulationTick,
            TARGET_ID = target.id,
            TARGET_GENERATION = target.generation,
            MANAGER = world.cornAttachments || (world.cornAttachments = this.createManager());
        let group = [...MANAGER.groups]
            .reverse()
            .find(
                (group) =>
                    !group.cornActionId &&
                    group.targetId === TARGET_ID &&
                    group.targetGeneration === TARGET_GENERATION &&
                    group.status === 'collecting' &&
                    TICK < group.closeAtTick,
            );
        if (!group) {
            group = {
                id: MANAGER.nextGroupId++,
                targetId: TARGET_ID,
                targetGeneration: TARGET_GENERATION,
                targetX: target.x,
                targetY: target.y,
                targetZ: target.z || 0,
                firstAttachTick: TICK,
                closeAtTick: TICK + config.attachDelayTicks,
                nextExplosionTick: null,
                status: 'collecting',
                attachments: [],
            };
            MANAGER.groups.push(group);
        }
        const ANGLE = ((group.attachments.length + 1) * 2.399963229728653) % (Math.PI * 2),
            ATTACHMENT = {
                id: MANAGER.nextAttachmentId++,
                groupId: group.id,
                targetId: TARGET_ID,
                targetGeneration: TARGET_GENERATION,
                ownerId: projectile.owner,
                ownerGeneration: projectile.ownerGeneration,
                payload: structuredClone(projectile.cornPayload),
                damageMultiplier: config.damageMultiplier,
                status: 'attached',
                fadeTicks: config.fadeTicks,
                angle: ANGLE,
                offsetX: Math.cos(ANGLE) * 0.18,
                offsetY: Math.sin(ANGLE) * 0.12,
            };
        group.attachments.push(ATTACHMENT);
        return ATTACHMENT;
    }
    static attachEvolved(world, target, projectile, record, damageScale = 1) {
        const MANAGER = world.cornAttachments,
            TARGET_ID = target.id,
            SHOT = record.shots[projectile.cornSlot];
        if (record.firstAttachTick === null) {
            record.firstAttachTick = world.simulationTick;
        }
        let group = MANAGER.groups.find(
            (entry) =>
                entry.cornActionId === record.id &&
                entry.targetId === TARGET_ID &&
                entry.targetGeneration === target.generation,
        );
        if (!group) {
            group = {
                id: MANAGER.nextGroupId++,
                cornActionId: record.id,
                targetId: TARGET_ID,
                targetGeneration: target.generation,
                targetX: target.x,
                targetY: target.y,
                targetZ: target.z || 0,
                firstAttachTick: record.firstAttachTick,
                closeAtTick: record.firstAttachTick + DEFINITION.attachDelayTicks,
                nextExplosionTick: null,
                status: 'collecting',
                attachments: [],
            };
            MANAGER.groups.push(group);
        }
        const INDICES = Array.from({ length: SHOT.kernelCount }, (_, index) => SHOT.kernelStart + index);
        if (record.extraKernel && projectile.cornSlot === record.shots.length - 1) {
            INDICES.push(record.baseKernelCount);
        }
        for (const INDEX of INDICES) {
            const ANGLE = ((INDEX + 1) * 2.399963229728653) % (Math.PI * 2);
            group.attachments.push({
                id: MANAGER.nextAttachmentId++,
                groupId: group.id,
                cornActionId: record.id,
                cornKernelIndex: INDEX,
                cornDamageScale: damageScale,
                explosionTick: group.closeAtTick + INDEX * DEFINITION.explosionSpacingTicks,
                targetId: TARGET_ID,
                targetGeneration: target.generation,
                ownerId: record.owner,
                ownerGeneration: record.ownerGeneration,
                payload: structuredClone(record.source),
                damageMultiplier: cornKernelMultiplier(record, INDEX) * damageScale,
                status: 'attached',
                fadeTicks: DEFINITION.fadeTicks,
                angle: ANGLE,
                offsetX: Math.cos(ANGLE) * 0.18,
                offsetY: Math.sin(ANGLE) * 0.12,
            });
        }
        group.attachments.sort((a, b) => a.cornKernelIndex - b.cornKernelIndex);
        return group;
    }
    static onProjectileHit(world, target, projectile, config) {
        if (!target || target.hp <= 0) {
            return null;
        }
        return this.attach(world, target, projectile, config);
    }
    static advance(world) {
        const MANAGER = world?.cornAttachments;
        if (!MANAGER) {
            return;
        }
        const TICK = world.simulationTick;
        for (const GROUP of MANAGER.groups) {
            const TARGET = this.resolveTarget(world, GROUP.targetId, GROUP.targetGeneration);
            if (TARGET) {
                GROUP.targetX = TARGET.x;
                GROUP.targetY = TARGET.y;
                GROUP.targetZ = TARGET.z || 0;
            }
            if (!TARGET || TARGET.hp <= 0) {
                for (const ATTACHMENT of GROUP.attachments) {
                    if (ATTACHMENT.status === 'attached') {
                        ATTACHMENT.status = 'fading';
                    }
                }
                GROUP.status = 'cancelled';
            } else if (GROUP.status === 'collecting' && TICK >= GROUP.closeAtTick) {
                GROUP.status = 'exploding';
                GROUP.nextExplosionTick = GROUP.closeAtTick;
            }
            if (GROUP.cornActionId && GROUP.status === 'exploding') {
                for (const ATTACHMENT of GROUP.attachments) {
                    if (ATTACHMENT.status !== 'attached' || ATTACHMENT.explosionTick > TICK) {
                        continue;
                    }
                    if (TARGET.hp > 0) {
                        this.explodeEvolved(world, TARGET, ATTACHMENT);
                    }
                    ATTACHMENT.status = 'fading';
                }
                const NEXT = GROUP.attachments.find((entry) => entry.status === 'attached');
                GROUP.nextExplosionTick = NEXT?.explosionTick ?? GROUP.nextExplosionTick;
                if (!NEXT) {
                    GROUP.status = 'complete';
                }
            } else if (GROUP.status === 'exploding' && TICK >= GROUP.nextExplosionTick) {
                const ATTACHMENT = GROUP.attachments.find((entry) => entry.status === 'attached');
                if (ATTACHMENT) {
                    this.explode(world, TARGET, ATTACHMENT);
                    ATTACHMENT.status = 'fading';
                    GROUP.nextExplosionTick += DEFINITION.explosionSpacingTicks;
                } else {
                    GROUP.status = 'complete';
                }
            }
            for (const ATTACHMENT of GROUP.attachments) {
                if (ATTACHMENT.status === 'fading') {
                    ATTACHMENT.fadeTicks -= 1;
                    if (ATTACHMENT.fadeTicks <= 0) {
                        ATTACHMENT.status = 'removed';
                    }
                }
            }
        }
        MANAGER.groups = MANAGER.groups.filter((group) =>
            group.attachments.some((entry) => entry.status !== 'removed'),
        );
        if (MANAGER.actions?.length) {
            const REFERENCED = new Set([
                ...world.projectiles
                    .filter((projectile) => !projectile.hit)
                    .map((projectile) => projectile.cornActionId),
                ...MANAGER.groups.map((group) => group.cornActionId),
                ...world.combatUnits().map((unit) => unit.ability?.action?.cornAttack?.id),
            ]);
            MANAGER.actions = MANAGER.actions.filter((action) => REFERENCED.has(action.id));
        }
    }
    static resolveTarget(world, targetId, generation) {
        const TARGET = world._unitForId(targetId);
        return TARGET?.generation === generation ? TARGET : null;
    }
    static explodeEvolved(world, target, attachment) {
        const RECORD = cornActionFor(world, attachment.cornActionId);
        if (!RECORD) {
            return;
        }
        const CONTEXT = cornAttackContext(
                RECORD,
                1,
                cornCriticalRoll(world, RECORD, target),
                attachment.damageMultiplier,
                world,
            ),
            ACTION = { id: RECORD.id, hit: false };
        CONTEXT.kind = 'corn-attachment-explosion';
        CONTEXT.area = RECORD.form >= 4;
        CONTEXT.strikeIndex = attachment.cornKernelIndex;
        world.damageCombatTarget(
            CONTEXT.source,
            ACTION,
            target,
            { x: target.x, y: target.y, z: target.z || 0 },
            { attackContext: CONTEXT, disableGrainEffects: true },
        );
        world.combat('corn-attachment-explosion', {
            sourceUnit: RECORD.owner,
            targetUnit: target.id,
            x: target.x,
            y: target.y,
            multiplier: attachment.damageMultiplier,
        });
    }
    static explode(world, target, attachment) {
        const PAYLOAD = attachment.payload;
        let source = world._unitForId(attachment.ownerId);
        if (source?.generation !== attachment.ownerGeneration) {
            source = null;
        }
        const ATTACKER = source || {
                id: attachment.ownerId,
                generation: attachment.ownerGeneration,
                ownerId: PAYLOAD.ownerId,
                faction: PAYLOAD.faction,
                isFormationClone: !!PAYLOAD.isFormationClone,
                species: PAYLOAD.species,
                tier: PAYLOAD.tier,
                hp: 0,
                x: PAYLOAD.x,
                y: PAYLOAD.y,
                z: PAYLOAD.z,
            },
            ACTION = { id: ++world.attackSerial, hit: false };
        world.damageCombatTarget(
            ATTACKER,
            ACTION,
            target,
            { x: target.x, y: target.y, z: target.z || 0 },
            {
                attackContext: {
                    source: ATTACKER,
                    sourceKind: 'direct',
                    attackerStats: PAYLOAD.attackerStats,
                    damageMultiplier: attachment.damageMultiplier,
                    attackPowerMultiplier: PAYLOAD.attackPowerMultiplier,
                    kind: 'corn-attachment-explosion',
                    buffed: PAYLOAD.buffed,
                    area: false,
                    criticalRoll: 1,
                    sourceStatOverrides: { ...PAYLOAD.attackerStats, critChance: 0 },
                    hitTargets: null,
                },
                disableGrainEffects: true,
            },
        );
        world.combat('corn-attachment-explosion', {
            sourceUnit: ATTACKER.id,
            targetUnit: target.id,
            x: target.x,
            y: target.y,
            multiplier: attachment.damageMultiplier,
        });
    }
}
