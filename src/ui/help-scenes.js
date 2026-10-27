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
            food: '낟알이 떨어졌어요. 번식할 3마리가 먹어요',
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
        rule: '탑은 100층까지 이어져요. 농장 최대 정원의 절반만 전선에 서고 나머지는 예비대가 되어, 출전 순서대로 쓰러진 자리를 자동 보충해요. 교전은 접근·공격, 산개는 간격을 넓히며 공격, 후퇴는 공격을 멈추고 적에게서 물러나는 유지 명령이에요. 보스의 붉은 예고를 보고 바꿔 보세요. 철수는 도전을 끝내는 별도 버튼이에요. 층마다 유한한 보스들이 순서대로 합류하고, 현재 보스를 빨리 모두 쓰러뜨리면 다음 보스가 즉시 나와요. 전원을 쓰러뜨려야 층을 깨고 전체 XP를 한 번 받아요. 전체 레벨로 농장 정원이 200부터 1,000까지 자라며, 병종 숙련과는 별개예요. 새 도전은 최고 기록보다 20% 아래에서 시작할 수 있고 더 낮은 층도 자유롭게 골라요. 100층의 마지막 수호자를 쓰러뜨리면 성 정상에서 함께 축하해요.  강화 층에서 카드를 고르면 병력과 보스가 함께 강해져요. 내 카드 획득 뒤 보스 차례가 이어지고, 같은 스탯·패시브·기술 후보 세 장 중 하나를 골라요. 선택한 카드의 실제 강화 변화와 마지막 결과를 다음 문에서도 볼 수 있어요. 복사·불사는 제외하고 기술은 최대 세 종류까지 얻으며, 이후에도 스탯·패시브와 보유 기술 강화가 나와요. 보스 체력 아래에는 방금 얻거나 강화한 기술 표시가 한 번 나타나요. 기술 아이콘에서 충전·5초 쿨·시전 상태를 보고, 눌러서 자세히 확인할 수 있어요. 보스가 힘을 모으는 동안에는 움직이거나 기본 공격을 하지 않고, 보스 공격 기술은 보스 몸집보다 조금 작은 크기로 펼쳐져요. 바닥의 번개 예고는 벗어나 피할 수 있어요. 보스는 늘 새싹이에요. 새싹의 기본 공격을 쓰고, 큰 특수 패턴과 카드 기술은 따로 준비해 사용해요. 씨앗으로 나온 병종의 숙련이 쌓여 숙련 포인트를 얻어요.',
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
                prepare: '알갱이를 쏠 준비를 해요',
                flight: '알갱이가 날아가 적에게 붙어요',
                explosion: '붙은 지 1초 뒤부터 0.1초 간격으로 터져요',
            },
        });
    }),
);

const PEA_PREVIEW_SCENES = Object.freeze(
    Array.from({ length: 6 }, (_, index) => {
        const TIER = index + 1;
        return Object.freeze({
            id: `pea-t${TIER}`,
            title: `콩 T${TIER} 공격 미리보기`,
            seed: 731,
            rate: 0.6,
            durationMs: 9000,
            timeline: [],
            setup(world) {
                world.resetUnits();
                world.setWorkBasisPoints(0);
                const BUILD = world.playerProgression.abilities['pea-recovery-boost'];
                BUILD.masteryLevel = 50;
                BUILD.nodeRanks = Object.fromEntries(
                    Array.from({ length: TIER - 1 }, (_value, tierIndex) => [`evolution-${tierIndex + 2}`, 1]),
                );
                const UNIT = world.spawn(0, TIER, -7, 0);
                UNIT.growth = 3;
                UNIT.growthElapsed = UNIT.growthDuration;
                world.startTower(1);
                world.finishMarch();
                world._benched.clear();
                world._benchRevision++;
                Object.assign(world.boss, { z: 0, hp: 1e7, maxHp: 1e7, stun: 60 });
                world.farmBossEvent.phase = 'fighting';
                world.farmBossEvent.elapsed = 0;
                UNIT.x = -(world.boss.radius + 1.45);
                UNIT.y = 0;
                UNIT.z = 0;
                UNIT.dropLanded = true;
                world._unitSpatialDirty = true;
            },
            step(world) {
                return world.units[0]?.ability.phase === 'active'
                    ? 'contact'
                    : world.units[0]?.ability.phase === 'recover'
                      ? 'recover'
                      : 'prepare';
            },
            steps: {
                prepare: '적을 향해 돌진할 준비를 해요',
                contact: '앞으로 돌진해 적을 들이받아요',
                recover: '들이받은 뒤 다음 돌진을 준비해요',
            },
        });
    }),
);

const REDBEAN_PREVIEW_SCENES = Object.freeze(
    Array.from({ length: 6 }, (_, index) => {
        const TIER = index + 1;
        return Object.freeze({
            id: `redbean-t${TIER}`,
            title: `팥 T${TIER} 공격 미리보기`,
            seed: 731,
            rate: 0.6,
            durationMs: 9000,
            timeline: [],
            setup(world) {
                world.resetUnits();
                world.setWorkBasisPoints(0);
                const BUILD = world.playerProgression.abilities['kidney-continuous-leap'];
                BUILD.masteryLevel = 50;
                BUILD.nodeRanks = Object.fromEntries(
                    Array.from({ length: TIER - 1 }, (_value, tierIndex) => [`evolution-${tierIndex + 2}`, 1]),
                );
                const UNIT = world.spawn(2, TIER, -7, 0);
                UNIT.growth = 3;
                UNIT.growthElapsed = UNIT.growthDuration;
                world.startTower(1);
                world.finishMarch();
                world._benched.clear();
                world._benchRevision++;
                Object.assign(world.boss, { z: 0, hp: 1e7, maxHp: 1e7, stun: 60 });
                world.farmBossEvent.phase = 'fighting';
                world.farmBossEvent.elapsed = 0;
                UNIT.x = -(world.boss.radius + 1.45);
                UNIT.y = 0;
                UNIT.z = 0;
                UNIT.dropLanded = true;
                world._unitSpatialDirty = true;
            },
            step(world) {
                return world.units[0]?.ability.phase === 'active'
                    ? 'contact'
                    : world.units[0]?.ability.phase === 'recover'
                      ? 'recover'
                      : 'prepare';
            },
            steps: {
                prepare: '적을 향해 뛰어오를 준비를 해요',
                contact: '뛰어올라 적을 덮쳐요',
                recover: '착지한 뒤 다음 도약을 준비해요',
            },
        });
    }),
);

const CHESTNUT_PREVIEW_SCENES = Object.freeze(
    Array.from({ length: 6 }, (_, index) => {
        const TIER = index + 1;
        return Object.freeze({
            id: `chestnut-t${TIER}`,
            title: `밤톨 T${TIER} 공격 미리보기`,
            seed: 731,
            rate: 0.6,
            durationMs: 9000,
            timeline: [],
            setup(world) {
                world.resetUnits();
                world.setWorkBasisPoints(0);
                const BUILD = world.playerProgression.abilities['chestnut-target-thorns'];
                BUILD.masteryLevel = 50;
                BUILD.nodeRanks = Object.fromEntries(
                    Array.from({ length: TIER - 1 }, (_value, tierIndex) => [`evolution-${tierIndex + 2}`, 1]),
                );
                const UNIT = world.spawn(3, TIER, -7, 0);
                UNIT.growth = 3;
                UNIT.growthElapsed = UNIT.growthDuration;
                world.startTower(1);
                world.finishMarch();
                world._benched.clear();
                world._benchRevision++;
                Object.assign(world.boss, { z: 0, hp: 1e7, maxHp: 1e7, stun: 60 });
                world.farmBossEvent.phase = 'fighting';
                world.farmBossEvent.elapsed = 0;
                UNIT.x = -(world.boss.radius + (TIER >= 3 ? 2 : 1.45));
                UNIT.y = 0;
                UNIT.z = 0;
                UNIT.dropLanded = true;
                world._unitSpatialDirty = true;
            },
            step(world) {
                return world.projectiles.some((projectile) => projectile.chestnutActionId)
                    ? 'flight'
                    : world.units[0]?.ability.phase === 'recover'
                      ? 'recover'
                      : 'prepare';
            },
            steps: {
                prepare: '가시를 쏠 준비를 해요',
                flight: '가시를 날려 적을 찔러요',
                recover: '가시를 쏜 뒤 다음 공격을 준비해요',
            },
        });
    }),
);

const PEANUT_PREVIEW_SCENES = Object.freeze(
    Array.from({ length: 6 }, (_, index) => {
        const TIER = index + 1;
        return Object.freeze({
            id: `peanut-t${TIER}`,
            title: `땅콩 T${TIER} 공격 미리보기`,
            seed: 731,
            rate: 0.6,
            durationMs: 9000,
            timeline: [],
            setup(world) {
                world.resetUnits();
                world.setWorkBasisPoints(0);
                const BUILD = world.playerProgression.abilities['peanut-death-split'];
                BUILD.masteryLevel = 50;
                BUILD.nodeRanks = Object.fromEntries(
                    Array.from({ length: TIER - 1 }, (_value, tierIndex) => [`evolution-${tierIndex + 2}`, 1]),
                );
                const UNIT = world.spawn(4, TIER, -7, 0);
                UNIT.growth = 3;
                UNIT.growthElapsed = UNIT.growthDuration;
                world.startTower(1);
                world.finishMarch();
                world._benched.clear();
                world._benchRevision++;
                Object.assign(world.boss, { z: 0, hp: 1e7, maxHp: 1e7, stun: 60 });
                world.farmBossEvent.phase = 'fighting';
                world.farmBossEvent.elapsed = 0;
                UNIT.x = -(world.boss.radius + 1.35);
                UNIT.y = 0;
                UNIT.z = 0;
                UNIT.dropLanded = true;
                world._unitSpatialDirty = true;
            },
            step(world) {
                return world.units[0]?.ability.phase === 'active'
                    ? 'contact'
                    : world.units[0]?.ability.phase === 'recover'
                      ? 'recover'
                      : 'prepare';
            },
            steps: {
                prepare: '두 알이 함께 공격할 준비를 해요',
                contact: '두 알이 번갈아 적을 공격해요',
                recover: '협공을 마치고 다음 공격을 준비해요',
            },
        });
    }),
);

const WALNUT_PREVIEW_SCENES = Object.freeze(
    Array.from({ length: 6 }, (_, index) => {
        const TIER = index + 1;
        return Object.freeze({
            id: `walnut-t${TIER}`,
            title: `호두 T${TIER} 공격 미리보기`,
            seed: 731,
            rate: 0.6,
            durationMs: 9000,
            timeline: [],
            setup(world) {
                world.resetUnits();
                world.setWorkBasisPoints(0);
                const BUILD = world.playerProgression.abilities['walnut-raw-guard'];
                BUILD.masteryLevel = 50;
                BUILD.nodeRanks = Object.fromEntries(
                    Array.from({ length: TIER - 1 }, (_value, tierIndex) => [`evolution-${tierIndex + 2}`, 1]),
                );
                const UNIT = world.spawn(5, TIER, -7, 0);
                UNIT.growth = 3;
                UNIT.growthElapsed = UNIT.growthDuration;
                world.startTower(1);
                world.finishMarch();
                world._benched.clear();
                world._benchRevision++;
                Object.assign(world.boss, { z: 0, hp: 1e7, maxHp: 1e7, stun: 60 });
                world.farmBossEvent.phase = 'fighting';
                world.farmBossEvent.elapsed = 0;
                UNIT.x = -(world.boss.radius + 1.35);
                UNIT.y = 0;
                UNIT.z = 0;
                UNIT.dropLanded = true;
                world._unitSpatialDirty = true;
            },
            step(world) {
                return world.units[0]?.ability.phase === 'active'
                    ? 'contact'
                    : world.units[0]?.ability.phase === 'recover'
                      ? 'recover'
                      : 'prepare';
            },
            steps: {
                prepare: '망치를 들어 공격할 준비를 해요',
                contact: '망치를 휘둘러 적을 때려요',
                recover: '망치를 거두고 다음 공격을 준비해요',
            },
        });
    }),
);

const RICE_PREVIEW_SCENES = Object.freeze(
    Array.from({ length: 6 }, (_, index) => {
        const TIER = index + 1;
        return Object.freeze({
            id: `rice-t${TIER}`,
            title: `쌀 T${TIER} 공격 미리보기`,
            seed: 731,
            rate: 0.6,
            durationMs: 9000,
            timeline: [],
            setup(world) {
                world.resetUnits();
                world.setWorkBasisPoints(0);
                const BUILD = world.playerProgression.abilities['rice-low-health-harvest'];
                BUILD.masteryLevel = 50;
                BUILD.nodeRanks = Object.fromEntries(
                    Array.from({ length: TIER - 1 }, (_value, tierIndex) => [`evolution-${tierIndex + 2}`, 1]),
                );
                const UNIT = world.spawn(6, TIER, -7, 0);
                UNIT.growth = 3;
                UNIT.growthElapsed = UNIT.growthDuration;
                world.startTower(1);
                world.finishMarch();
                world._benched.clear();
                world._benchRevision++;
                Object.assign(world.boss, { z: 0, hp: 1e7, maxHp: 1e7, stun: 60 });
                world.farmBossEvent.phase = 'fighting';
                world.farmBossEvent.elapsed = 0;
                UNIT.x = -(world.boss.radius + 1.35);
                UNIT.y = 0;
                UNIT.z = 0;
                UNIT.dropLanded = true;
                world._unitSpatialDirty = true;
            },
            step(world) {
                return world.units[0]?.ability.phase === 'active'
                    ? 'contact'
                    : world.units[0]?.ability.phase === 'recover'
                      ? 'recover'
                      : 'prepare';
            },
            steps: {
                prepare: '낫을 들어 적을 벨 준비를 해요',
                contact: '낫을 휘둘러 적을 베어요',
                recover: '낫을 거두고 다음 공격을 준비해요',
            },
        });
    }),
);

const WHEAT_PREVIEW_SCENES = Object.freeze(
    Array.from({ length: 6 }, (_, index) => {
        const TIER = index + 1;
        return Object.freeze({
            id: `wheat-t${TIER}`,
            title: `밀 T${TIER} 공격 미리보기`,
            seed: 731,
            rate: 0.6,
            durationMs: 9000,
            timeline: [],
            setup(world) {
                world.resetUnits();
                world.setWorkBasisPoints(0);
                const BUILD = world.playerProgression.abilities['wheat-command-crit'];
                BUILD.masteryLevel = 50;
                BUILD.nodeRanks = Object.fromEntries(
                    Array.from({ length: TIER - 1 }, (_value, tierIndex) => [`evolution-${tierIndex + 2}`, 1]),
                );
                const UNIT = world.spawn(7, TIER, -7, 0);
                UNIT.growth = 3;
                UNIT.growthElapsed = UNIT.growthDuration;
                world.startTower(1);
                world.finishMarch();
                world._benched.clear();
                world._benchRevision++;
                Object.assign(world.boss, { z: 0, hp: 1e7, maxHp: 1e7, stun: 60 });
                world.farmBossEvent.phase = 'fighting';
                world.farmBossEvent.elapsed = 0;
                UNIT.x = -(world.boss.radius + 1.35);
                UNIT.y = 0;
                UNIT.z = 0;
                UNIT.dropLanded = true;
                world._unitSpatialDirty = true;
            },
            step(world) {
                return world.units[0]?.ability.phase === 'active'
                    ? 'contact'
                    : world.units[0]?.ability.phase === 'recover'
                      ? 'recover'
                      : 'prepare';
            },
            steps: {
                prepare: '지휘봉을 들어 공격할 준비를 해요',
                contact: '지휘봉을 휘둘러 적을 공격해요',
                recover: '지휘봉을 거두고 다음 공격을 준비해요',
            },
        });
    }),
);

const BARLEY_PREVIEW_SCENES = Object.freeze(
    Array.from({ length: 6 }, (_, index) => {
        const TIER = index + 1;
        return Object.freeze({
            id: `barley-t${TIER}`,
            title: `보리 T${TIER} 공격 미리보기`,
            seed: 731,
            rate: 0.6,
            durationMs: 9000,
            timeline: [],
            setup(world) {
                world.resetUnits();
                world.setWorkBasisPoints(0);
                const BUILD = world.playerProgression.abilities['barley-armor-break'];
                BUILD.masteryLevel = 50;
                BUILD.nodeRanks = Object.fromEntries(
                    Array.from({ length: TIER - 1 }, (_value, tierIndex) => [`evolution-${tierIndex + 2}`, 1]),
                );
                const UNIT = world.spawn(8, TIER, -7, 0);
                UNIT.growth = 3;
                UNIT.growthElapsed = UNIT.growthDuration;
                world.startTower(1);
                world.finishMarch();
                world._benched.clear();
                world._benchRevision++;
                Object.assign(world.boss, { z: 0, hp: 1e7, maxHp: 1e7, stun: 60 });
                world.farmBossEvent.phase = 'fighting';
                world.farmBossEvent.elapsed = 0;
                UNIT.x = -(world.boss.radius + 1.35);
                UNIT.y = 0;
                UNIT.z = 0;
                UNIT.dropLanded = true;
                world._unitSpatialDirty = true;
            },
            step(world) {
                return world.units[0]?.ability.phase === 'active'
                    ? 'contact'
                    : world.units[0]?.ability.phase === 'recover'
                      ? 'recover'
                      : 'prepare';
            },
            steps: {
                prepare: '도리깨를 들어 공격할 준비를 해요',
                contact: '도리깨를 휘둘러 적을 때려요',
                recover: '도리깨를 거두고 다음 공격을 준비해요',
            },
        });
    }),
);
