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
        rule: '일꾼이 곡식 더미를 쳐서 낟알을 만들고, 성체 두 마리가 하나씩 먹으면 새끼가 태어나요. 슬라이더로 번식과 먹이 일꾼의 비율을 정해요.',
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
            food: '낟알이 떨어졌어요. 번식 3마리가 먹어요',
            born: '먹은 두 마리가 번식해 새끼가 태어났어요',
        },
    }),
    Object.freeze({
        id: 'merge',
        title: '합성',
        rule: '합성 버튼을 누를 때마다 가장 낮은 등급의 같은 병종부터 한 번 합쳐요. 재료는 T2 = T1 2마리, T3 = T2 2마리, T4 = T3 3마리, T5 = T4 4마리, T6 = T5 5마리예요.',
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
        rule: '탑 오르기를 누르면 보스가 떨어져요. 병력이 사방에서 자동으로 투입돼 싸우고, 이기면 다음 층의 선택지가 나와요. 강화 층에서 카드를 고르면 이번 도전 동안 병력이 강해져요. 이긴 보스 종의 숙련이 쌓여 능력 포인트가 돼요.',
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
            next: '고른 대로 다음 층이 이어져요. 강화 카드는 도전이 끝날 때까지 유지돼요',
        },
    }),
]);

export function helpSceneById(id) {
    return [...HELP_SCENES, ...CORN_PREVIEW_SCENES].find((scene) => scene.id === id) ?? null;
}

// Research previews use the same isolated help-frame runtime, attack model and renderer as play.
// The target is a stationary training boss, not a second implementation of the attack animation.
const CORN_PREVIEW_SCENES = Object.freeze(
    Array.from({ length: 6 }, (_, index) => {
        const TIER = index + 1;
        return Object.freeze({
            id: `corn-t${TIER}`,
            title: `옥수수 T${TIER} 공격 미리보기`,
            seed: 731,
            rate: 0.6,
            durationMs: 6500,
            timeline: [],
            setup(world) {
                world.resetUnits();
                world.setWorkBasisPoints(0);
                const BUILD = world.playerProgression.abilities['corn-kernel-chain'];
                BUILD.masteryLevel = 50;
                BUILD.nodeRanks = Object.fromEntries(
                    Array.from({ length: TIER - 1 }, (_value, tierIndex) => [`evolution-${tierIndex + 2}`, 1]),
                );
                const UNIT = world.spawn(1, TIER, -7, 0);
                UNIT.growth = 3;
                UNIT.growthElapsed = UNIT.growthDuration;
                world.startTower(1);
                world.finishMarch();
                world._benched.clear();
                world._benchRevision++;
                Object.assign(world.boss, { z: 0, hp: 1e7, maxHp: 1e7, stun: 60 });
                world.farmBossEvent.phase = 'fighting';
                world.farmBossEvent.elapsed = 0;
                UNIT.x = -(world.boss.radius + 4.1 + (TIER - 1) * 0.12);
                UNIT.y = 0;
                UNIT.z = 0;
                UNIT.dropLanded = true;
                world._unitSpatialDirty = true;
            },
            step(world) {
                return world.cornAttachments.groups.some((group) =>
                    group.attachments.some((attachment) => attachment.status === 'fading'),
                )
                    ? 'explosion'
                    : world.projectiles.length > 0
                      ? 'flight'
                      : 'prepare';
            },
            steps: {
                prepare: '고정 훈련 표적 · 실제 공격 준비',
                flight: '실제 투사체의 비행과 충돌',
                explosion: '부착 1초 뒤부터 0.1초 간격의 연쇄 폭발',
            },
        });
    }),
);
