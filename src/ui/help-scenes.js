// Help cards: each one is a short run of the real game, played in an isolated frame at half speed.
// The scene owns its setup and scripted commands; the game owns every rule. A caption follows the
// authoritative world state, so it never claims something the run has not shown yet.
export const HELP_PLAYBACK_RATE = 0.5;
// A slow frame never makes the run jump: past this much wall time it just plays slower, instead of dropping time.
export const HELP_MAX_FRAME_MS = 40;

export const HELP_SCENES = Object.freeze([
    Object.freeze({
        id: 'breed',
        title: '먹이와 번식',
        points: Object.freeze([
            '일꾼이 곡식 더미를 쳐서 낟알을 만들어요',
            '성체 두 마리가 낟알을 하나씩 먹으면 새끼가 태어나요',
            '슬라이더로 번식과 먹이 일꾼의 비율을 정해요',
        ]),
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
            work: '일꾼 3마리가 곡식 더미를 쳐요',
            food: '낟알이 떨어졌어요. 번식할 3마리가 먹어요',
            born: '먹은 두 마리가 번식해 새끼가 태어났어요',
        },
    }),
    Object.freeze({
        id: 'merge',
        title: '합성',
        points: Object.freeze([
            '합성을 누를 때마다 가장 낮은 등급의 같은 병종부터 합쳐요',
            '재료는 T2 = T1 2마리, T3 = T2 2마리, T4 = T3 3마리, T5 = T4 4마리, T6 = T5 5마리예요',
            '한 등급 위가 되면 체력과 공격력이 커져요',
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
            start: '같은 병종 성체가 여럿 있어요',
            merging: '합성을 누르면 두 마리가 모여요',
            done: '한 등급 위가 됐어요. 체력과 공격력이 커져요',
        },
    }),
    Object.freeze({
        id: 'tower',
        title: '보스와 탑',
        points: Object.freeze([
            '탑은 100층까지 이어져요',
            '농장 정원의 절반만 전선에 서고, 쓰러진 자리는 예비대가 출전 순서대로 채워요',
            '보스의 붉은 예고를 보고 교전·산개·후퇴 명령을 바꿔요',
            '강화 층에서는 보스가 카드 한 장을 먼저 가져가고, 남은 카드에서 골라요',
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
            start: '탑 오르기를 누르면 병력이 탑으로 향해요',
            march: '병력이 탑으로 올라가요',
            drop: '보스가 떨어져요. 병력이 사방에서 들어와요',
            fight: '수십 마리가 자동으로 보스와 싸워요',
            win: '보스를 쓰러뜨렸어요',
            doors: '이겼어요. 다음 층의 선택지를 골라요',
            next: '카드를 고르면 보스도 한 장을 뽑아요. 두 쪽의 카드는 이번 도전 동안 유지돼요',
        },
    }),
]);

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
function speciesPreviewScenes({ id, name, species, durationMs, distance, step, steps }) {
    return Object.freeze(
        Array.from({ length: 6 }, (_, index) => {
            const TIER = index + 1;
            return Object.freeze({
                id: `${id}-t${TIER}`,
                title: `${name} T${TIER} 공격 미리보기`,
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
    name: '옥수수',
    species: 1,
    durationMs: 6500,
    distance: (radius, tier) => radius + 4.1 + (tier - 1) * 0.12,
    step: CORN_STEP,
    steps: {
        prepare: '알갱이를 쏠 준비를 해요',
        flight: '알갱이가 날아가 적에게 붙어요',
        explosion: '붙은 지 1초 뒤부터 0.1초 간격으로 터져요',
    },
});

const PEA_PREVIEW_SCENES = speciesPreviewScenes({
    id: 'pea',
    name: '콩',
    species: 0,
    durationMs: 9000,
    distance: (radius) => radius + 1.45,
    step: CONTACT_STEP,
    steps: {
        prepare: '적을 향해 돌진할 준비를 해요',
        contact: '앞으로 돌진해 적을 들이받아요',
        recover: '들이받은 뒤 다음 돌진을 준비해요',
    },
});

const REDBEAN_PREVIEW_SCENES = speciesPreviewScenes({
    id: 'redbean',
    name: '팥',
    species: 2,
    durationMs: 9000,
    distance: (radius) => radius + 1.45,
    step: CONTACT_STEP,
    steps: {
        prepare: '적을 향해 뛰어오를 준비를 해요',
        contact: '뛰어올라 적을 덮쳐요',
        recover: '착지한 뒤 다음 도약을 준비해요',
    },
});

const CHESTNUT_PREVIEW_SCENES = speciesPreviewScenes({
    id: 'chestnut',
    name: '밤톨',
    species: 3,
    durationMs: 9000,
    distance: (radius, tier) => radius + (tier >= 3 ? 2 : 1.45),
    step: CHESTNUT_STEP,
    steps: {
        prepare: '가시를 쏠 준비를 해요',
        flight: '가시를 날려 적을 찔러요',
        recover: '가시를 쏜 뒤 다음 공격을 준비해요',
    },
});

const PEANUT_PREVIEW_SCENES = speciesPreviewScenes({
    id: 'peanut',
    name: '땅콩',
    species: 4,
    durationMs: 9000,
    distance: (radius) => radius + 1.35,
    step: CONTACT_STEP,
    steps: {
        prepare: '두 알이 함께 공격할 준비를 해요',
        contact: '두 알이 번갈아 적을 공격해요',
        recover: '협공을 마치고 다음 공격을 준비해요',
    },
});

const WALNUT_PREVIEW_SCENES = speciesPreviewScenes({
    id: 'walnut',
    name: '호두',
    species: 5,
    durationMs: 9000,
    distance: (radius) => radius + 1.35,
    step: CONTACT_STEP,
    steps: {
        prepare: '망치를 들어 공격할 준비를 해요',
        contact: '망치를 휘둘러 적을 때려요',
        recover: '망치를 거두고 다음 공격을 준비해요',
    },
});

const RICE_PREVIEW_SCENES = speciesPreviewScenes({
    id: 'rice',
    name: '쌀',
    species: 6,
    durationMs: 9000,
    distance: (radius) => radius + 1.35,
    step: CONTACT_STEP,
    steps: {
        prepare: '낫을 들어 적을 벨 준비를 해요',
        contact: '낫을 휘둘러 적을 베어요',
        recover: '낫을 거두고 다음 공격을 준비해요',
    },
});

const WHEAT_PREVIEW_SCENES = speciesPreviewScenes({
    id: 'wheat',
    name: '밀',
    species: 7,
    durationMs: 9000,
    distance: (radius) => radius + 1.35,
    step: CONTACT_STEP,
    steps: {
        prepare: '지휘봉을 들어 공격할 준비를 해요',
        contact: '지휘봉을 휘둘러 적을 공격해요',
        recover: '지휘봉을 거두고 다음 공격을 준비해요',
    },
});

const BARLEY_PREVIEW_SCENES = speciesPreviewScenes({
    id: 'barley',
    name: '보리',
    species: 8,
    durationMs: 9000,
    distance: (radius) => radius + 1.35,
    step: CONTACT_STEP,
    steps: {
        prepare: '도리깨를 들어 공격할 준비를 해요',
        contact: '도리깨를 휘둘러 적을 때려요',
        recover: '도리깨를 거두고 다음 공격을 준비해요',
    },
});
