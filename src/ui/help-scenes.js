import { HELP } from '../i18n/messages/ui-help.js';
import { speciesName } from '../i18n/messages/species.js';

// Help cards: each one is a short run of the real game, played in an isolated frame at half speed.
// The scene owns its setup and scripted commands; the game owns every rule. A caption follows the
// authoritative world state, so it never claims something the run has not shown yet.
export const HELP_PLAYBACK_RATE = 0.5;
// A slow frame never makes the run jump: past this much wall time it just plays slower, instead of dropping time.
export const HELP_MAX_FRAME_MS = 40;

export const HELP_SCENES = Object.freeze([
    Object.freeze({
        id: 'breed',
        title: HELP.breedTitle(),
        points: Object.freeze([HELP.breedPointWorkers(), HELP.breedPointBirth(), HELP.breedPointSlider()]),
        seed: 731,
        rate: 4,
        durationMs: 20000,
        setup(world) {
            // Half the farm works and half breeds: the workers make the food and the breeders eat it, nothing is pre-placed.
            world.setWorkBasisPoints(5000);
            world.setBreedWeights(null);
        },
        timeline: [],
        step(world) {
            if (world.units.length > 6) {
                return 'born';
            }
            return world.food.length > 0 ? 'food' : 'work';
        },
        steps: {
            work: HELP.breedStepWork(),
            food: HELP.breedStepFood(),
            born: HELP.breedStepBorn(),
        },
    }),
    Object.freeze({
        id: 'merge',
        title: HELP.mergeTitle(),
        points: Object.freeze([
            HELP.mergePointOrder(),
            HELP.mergePointCost(),
            HELP.mergePointStats(),
            HELP.mergePointCombine(),
            HELP.mergePointCombineKeep(),
        ]),
        seed: 4102,
        rate: 1,
        durationMs: 5000,
        setup(world) {
            // Nobody works or breeds here, so the only change on screen is the merge.
            world.setWorkBasisPoints(0);
        },
        timeline: [
            { atMs: 500, cmd: 'merge' },
            { atMs: 1000, cmd: 'merge' },
            { atMs: 1500, cmd: 'merge' },
        ],
        step(world) {
            if (world.units.some((unit) => unit.tier >= 2)) {
                return 'done';
            }
            return world.mergeTask ? 'merging' : 'start';
        },
        steps: {
            start: HELP.mergeStepStart(),
            merging: HELP.mergeStepMerging(),
            done: HELP.mergeStepDone(),
        },
    }),
    Object.freeze({
        id: 'tower',
        title: HELP.towerTitle(),
        points: Object.freeze([
            HELP.towerPointFloors(),
            HELP.towerPointFront(),
            HELP.towerPointOrders(),
            HELP.towerPointRetreat(),
            HELP.towerPointBosses(),
        ]),
        seed: 4104,
        rate: 4,
        durationMs: 60000,
        setup(world) {
            world.setWorkBasisPoints(0);
            // A big mixed army: many low tiers and a few high ones, across every species.
            for (let index = 0; index < 50; index++) {
                const ANGLE = index * 2.399963229728653;
                world.spawn(
                    index % 6,
                    1 + (index % 4),
                    Math.cos(ANGLE) * (20 + index),
                    Math.sin(ANGLE) * (14 + index * 0.6),
                );
            }
        },
        timeline: [{ atMs: 100, cmd: 'tower-start', args: { floor: 1 } }],
        // The army drops in by itself; once the real win opens the doors, the demo picks the first one after a beat,
        // then ends.
        auto(world, timeMs, memo) {
            if (world.tower.floor > 1) {
                memo.doneAt ??= timeMs;
                return { complete: timeMs - memo.doneAt > 1200 };
            }
            if (world.tower.doors?.length) {
                memo.doorsAt ??= timeMs;
                if (timeMs - memo.doorsAt > 1200 && !memo.picked) {
                    memo.picked = true;
                    return { pick: 0 };
                }
            }
            return null;
        },
        step(world) {
            if (world.tower.floor > 1) {
                return 'next';
            }
            const PHASE = world.farmBossEvent.phase;
            if (PHASE === 'marching') {
                return 'march';
            }
            if (PHASE === 'dropping') {
                return 'drop';
            }
            if (world.tower.doors?.length) {
                return 'doors';
            }
            if (PHASE === 'fighting') {
                return world.fieldFighterCount > 0 ? 'fight' : 'drop';
            }
            return PHASE === 'idle' && world.tower.floor === 0 ? 'start' : 'win';
        },
        steps: {
            start: HELP.towerStepStart(),
            march: HELP.towerStepMarch(),
            drop: HELP.towerStepDrop(),
            fight: HELP.towerStepFight(),
            win: HELP.towerStepWin(),
            doors: HELP.towerStepDoors(),
            next: HELP.towerStepNext(),
        },
    }),
]);

// Cards that explain a few words and play no run: the panel shows only their points. They are not scenes, so the
// isolated frame (?help=<id>) never loads them.
export const HELP_TEXT_CARDS = Object.freeze([
    Object.freeze({
        id: 'cards',
        title: HELP.cardsTitle(),
        text: true,
        points: Object.freeze([HELP.cardsPointPick(), HELP.cardsPointRun(), HELP.cardsPointRelic()]),
    }),
    Object.freeze({
        id: 'terms',
        title: HELP.termsTitle(),
        text: true,
        points: Object.freeze([HELP.termsPointTier(), HELP.termsPointTemperament(), HELP.termsPointElement()]),
    }),
]);
// The help tab, in order: the played scenes first, then the text cards.
export const HELP_CARDS = Object.freeze([...HELP_SCENES, ...HELP_TEXT_CARDS]);

export function helpSceneById(id) {
    return (
        [
            ...HELP_SCENES,
            ...CORN_PREVIEW_SCENES,
            ...PEA_PREVIEW_SCENES,
            ...REDBEAN_PREVIEW_SCENES,
            ...CHESTNUT_PREVIEW_SCENES,
            ...PEANUT_PREVIEW_SCENES,
            ...WALNUT_PREVIEW_SCENES,
            ...RICE_PREVIEW_SCENES,
            ...WHEAT_PREVIEW_SCENES,
            ...BARLEY_PREVIEW_SCENES,
        ].find((scene) => scene.id === id) ?? null
    );
}

// Research previews use the same isolated help-frame runtime, attack model and renderer as play.
// The target is a stationary training boss, not a second implementation of the attack animation.
const CORN_STEP = (world) =>
    world.cornAttachments.groups.some((group) => group.attachments.some((attachment) => attachment.status === 'fading'))
        ? 'explosion'
        : world.projectiles.length > 0
          ? 'flight'
          : 'prepare';
const CONTACT_STEP = (world) =>
    world.units[0]?.ability.phase === 'active'
        ? 'contact'
        : world.units[0]?.ability.phase === 'recover'
          ? 'recover'
          : 'prepare';
const CHESTNUT_STEP = (world) =>
    world.projectiles.some((projectile) => projectile.chestnutActionId)
        ? 'flight'
        : world.units[0]?.ability.phase === 'recover'
          ? 'recover'
          : 'prepare';

// One tier-by-tier preview card set per species: the unit is built at the given tier (its attack form follows the tier),
// then stands a species-specific distance from a stunned training boss.
function speciesPreviewScenes({ id, species, durationMs, distance, step, steps }) {
    return Object.freeze(
        Array.from({ length: 6 }, (_, index) => {
            const TIER = index + 1;
            return Object.freeze({
                id: `${id}-t${TIER}`,
                title: HELP.previewTitle({ name: speciesName(species), tier: TIER }),
                seed: 731,
                rate: 0.6,
                durationMs,
                timeline: [],
                setup(world) {
                    world.resetUnits();
                    world.setWorkBasisPoints(0);
                    const UNIT = world.spawn(species, TIER, -7, 0);
                    UNIT.growth = 3;
                    UNIT.growthElapsed = UNIT.growthDuration;
                    world.startTower(1);
                    world.finishMarch();
                    world._benched.clear();
                    world._benchRevision++;
                    Object.assign(world.boss, { z: 0, hp: 1e7, maxHp: 1e7, stun: 60 });
                    world.farmBossEvent.phase = 'fighting';
                    world.farmBossEvent.elapsed = 0;
                    UNIT.x = -distance(world.boss.radius, TIER);
                    UNIT.y = 0;
                    UNIT.z = 0;
                    UNIT.dropLanded = true;
                    world._unitSpatialDirty = true;
                },
                step,
                steps,
            });
        }),
    );
}

const CORN_PREVIEW_SCENES = speciesPreviewScenes({
    id: 'corn',
    species: 1,
    durationMs: 6500,
    distance: (radius, tier) => radius + 4.1 + (tier - 1) * 0.12,
    step: CORN_STEP,
    steps: {
        prepare: HELP.cornPrepare(),
        flight: HELP.cornFlight(),
        explosion: HELP.cornExplosion(),
    },
});

const PEA_PREVIEW_SCENES = speciesPreviewScenes({
    id: 'pea',
    species: 0,
    durationMs: 9000,
    distance: (radius) => radius + 1.45,
    step: CONTACT_STEP,
    steps: {
        prepare: HELP.peaPrepare(),
        contact: HELP.peaContact(),
        recover: HELP.peaRecover(),
    },
});

const REDBEAN_PREVIEW_SCENES = speciesPreviewScenes({
    id: 'redbean',
    species: 2,
    durationMs: 9000,
    distance: (radius) => radius + 1.45,
    step: CONTACT_STEP,
    steps: {
        prepare: HELP.redbeanPrepare(),
        contact: HELP.redbeanContact(),
        recover: HELP.redbeanRecover(),
    },
});

const CHESTNUT_PREVIEW_SCENES = speciesPreviewScenes({
    id: 'chestnut',
    species: 3,
    durationMs: 9000,
    distance: (radius, tier) => radius + (tier >= 3 ? 2 : 1.45),
    step: CHESTNUT_STEP,
    steps: {
        prepare: HELP.chestnutPrepare(),
        flight: HELP.chestnutFlight(),
        recover: HELP.chestnutRecover(),
    },
});

const PEANUT_PREVIEW_SCENES = speciesPreviewScenes({
    id: 'peanut',
    species: 4,
    durationMs: 9000,
    distance: (radius) => radius + 1.35,
    step: CONTACT_STEP,
    steps: {
        prepare: HELP.peanutPrepare(),
        contact: HELP.peanutContact(),
        recover: HELP.peanutRecover(),
    },
});

const WALNUT_PREVIEW_SCENES = speciesPreviewScenes({
    id: 'walnut',
    species: 5,
    durationMs: 9000,
    distance: (radius) => radius + 1.35,
    step: CONTACT_STEP,
    steps: {
        prepare: HELP.walnutPrepare(),
        contact: HELP.walnutContact(),
        recover: HELP.walnutRecover(),
    },
});

const RICE_PREVIEW_SCENES = speciesPreviewScenes({
    id: 'rice',
    species: 6,
    durationMs: 9000,
    distance: (radius) => radius + 1.35,
    step: CONTACT_STEP,
    steps: {
        prepare: HELP.ricePrepare(),
        contact: HELP.riceContact(),
        recover: HELP.riceRecover(),
    },
});

const WHEAT_PREVIEW_SCENES = speciesPreviewScenes({
    id: 'wheat',
    species: 7,
    durationMs: 9000,
    distance: (radius) => radius + 1.35,
    step: CONTACT_STEP,
    steps: {
        prepare: HELP.wheatPrepare(),
        contact: HELP.wheatContact(),
        recover: HELP.wheatRecover(),
    },
});

const BARLEY_PREVIEW_SCENES = speciesPreviewScenes({
    id: 'barley',
    species: 8,
    durationMs: 9000,
    distance: (radius) => radius + 1.35,
    step: CONTACT_STEP,
    steps: {
        prepare: HELP.barleyPrepare(),
        contact: HELP.barleyContact(),
        recover: HELP.barleyRecover(),
    },
});
