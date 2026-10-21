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
        rule: '탑 오르기를 누르면 보스가 떨어져요. 병력을 투입하면 수십 마리가 자동으로 싸우고, 이기면 문을 골라요. 이긴 보스 종의 숙련이 쌓여 능력 포인트가 돼요.',
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
        // The army is dropped in one by one as the hand allows; once the real win opens the doors, the demo
        // picks the strengthening door after a beat, then ends.
        auto(world, timeMs, memo) {
            const PHASE = world.farmBossEvent.phase;
            if (
                (PHASE === 'dropping' || PHASE === 'fighting') &&
                timeMs >= (memo.nextDeployAt ?? 0) &&
                (memo.attempts ?? 0) < 120
            ) {
                memo.attempts = (memo.attempts ?? 0) + 1;
                memo.nextDeployAt = timeMs + 100;
                const ANGLE = memo.attempts * 2.399963229728653,
                    RADIUS = 60 + (memo.attempts % 3) * 25;
                return {
                    cmd: 'deploy',
                    args: {
                        species: memo.attempts % 6,
                        x: world.boss.x + Math.cos(ANGLE) * RADIUS,
                        y: world.boss.y + Math.sin(ANGLE) * RADIUS * 0.7,
                    },
                };
            }
            if (world.tower.floor > 1) {
                memo.doneAt ??= timeMs;
                return { complete: timeMs - memo.doneAt > 1200 };
            }
            if (world.tower.doors?.length) {
                memo.doorsAt ??= timeMs;
                if (timeMs - memo.doorsAt > 1200 && !memo.picked) {
                    memo.picked = true;
                    return { door: 'boost' };
                }
            }
            return null;
        },
        step(world) {
            if (world.tower.boost.hp > 1 || world.tower.boost.attack > 1) {
                return 'boost';
            }
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
            drop: '보스가 떨어져요. 병력을 투입해요',
            fight: '수십 마리가 자동으로 보스와 싸워요',
            win: '보스를 쓰러뜨렸어요',
            doors: '이겼어요. 다음 문을 골라요',
            boost: '강화를 골랐어요. 이번 도전 동안 모든 유닛이 강해져요',
            next: '고른 문의 다음 층으로 올라가요',
        },
    }),
]);

export function helpSceneById(id) {
    return HELP_SCENES.find((scene) => scene.id === id) ?? null;
}
