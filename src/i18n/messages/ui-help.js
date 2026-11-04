import { LOCALE } from '../locale.js';

// Help cards (src/ui/help-scenes.js): titles, bullet points and the captions that follow each scene's step.
export const HELP = LOCALE.messages({
    breedTitle: { ko: '먹이와 번식', en: 'Food and Breeding' },
    breedPointWorkers: { ko: '일꾼이 곡식 더미를 쳐서 낟알을 만들어요', en: 'Workers hit grain piles to make grains' },
    breedPointBirth: {
        ko: '성체 두 마리가 낟알을 하나씩 먹으면 새끼가 태어나요',
        en: 'When two adults each eat a grain, a baby is born',
    },
    breedPointSlider: {
        ko: '슬라이더로 번식과 먹이 일꾼의 비율을 정해요',
        en: 'Use the slider to split the farm between breeding and food workers',
    },
    breedStepWork: { ko: '일꾼 3마리가 곡식 더미를 쳐요', en: '3 workers hit the grain pile' },
    breedStepFood: { ko: '낟알이 떨어졌어요. 번식할 3마리가 먹어요', en: 'Grains dropped. The 3 breeders eat them' },
    breedStepBorn: { ko: '먹은 두 마리가 번식해 새끼가 태어났어요', en: 'The two that ate bred, and a baby was born' },

    mergeTitle: { ko: '합성과 조합', en: 'Merge and Combine' },
    mergePointOrder: {
        ko: '합성을 누를 때마다 가장 낮은 등급의 같은 병종부터 합쳐요',
        en: 'Each Merge press combines the same species, starting from the lowest tier',
    },
    mergePointCost: {
        ko: '재료는 T2 = T1 2마리, T3 = T2 2마리, T4 = T3 3마리, T5 = T4 4마리, T6 = T5 5마리예요',
        en: 'Cost: T2 = 2 × T1, T3 = 2 × T2, T4 = 3 × T3, T5 = 4 × T4, T6 = 5 × T5',
    },
    mergePointStats: { ko: '한 등급 위가 되면 체력과 공격력이 커져요', en: 'One tier up means more HP and Attack' },
    mergePointCombine: {
        ko: '조합은 서로 다른 병종을 재료로 새 병종을 만들어요',
        en: 'Combine turns different species into a new species',
    },
    mergePointCombineKeep: {
        ko: '재료 병종은 번식을 위해 최소 2마리를 남겨야 해요',
        en: 'Each ingredient species must keep at least 2 for breeding',
    },
    mergeStepStart: { ko: '같은 병종 성체가 여럿 있어요', en: 'Several adults of the same species' },
    mergeStepMerging: { ko: '합성을 누르면 두 마리가 모여요', en: 'Press Merge and two of them come together' },
    mergeStepDone: {
        ko: '한 등급 위가 됐어요. 체력과 공격력이 커져요',
        en: 'One tier up. HP and Attack go up',
    },

    towerTitle: { ko: '보스와 탑', en: 'Bosses and the Tower' },
    towerPointFloors: {
        ko: '탑은 100층까지 이어져요. 한 번 도전은 5~15분 정도예요',
        en: 'The tower goes up to floor 100. A run takes about 5 to 15 minutes',
    },
    towerPointFront: {
        ko: '농장 정원만큼의 병력이 전선에 서고, 쓰러진 자리는 예비대가 출전 순서대로 채워요',
        en: 'Troops up to the farm capacity hold the front line; reserves fill fallen spots in deploy order',
    },
    towerPointOrders: {
        ko: '하단 막대를 누르고 있는 동안만 후퇴·산개하고, 떼면 교전으로 돌아와요',
        en: 'Hold the bar at the bottom to retreat or scatter; let go to engage again',
    },
    towerPointRetreat: {
        ko: '후퇴하면 체력이 차올라요. 하지만 오래 끌면 보스가 격노해 회복이 막혀요',
        en: 'Retreating restores health, but drag it out and the boss enrages and healing stops',
    },
    towerPointBosses: {
        ko: '층마다 다양한 속성의 보스가 나와요',
        en: 'Bosses of many different elements appear floor by floor',
    },
    towerStepStart: {
        ko: '탑 오르기를 누르면 병력이 탑으로 향해요',
        en: 'Press Climb the Tower and your troops head out',
    },
    towerStepMarch: { ko: '병력이 탑으로 올라가요', en: 'Troops climb the tower' },
    towerStepDrop: {
        ko: '보스가 떨어져요. 병력이 사방에서 들어와요',
        en: 'The boss drops in. Troops pour in from all sides',
    },
    towerStepFight: { ko: '수십 마리가 자동으로 보스와 싸워요', en: 'Dozens of troops fight the boss automatically' },
    towerStepWin: { ko: '보스를 쓰러뜨렸어요', en: 'The boss is defeated' },
    towerStepDoors: { ko: '이겼어요. 다음 층의 선택지를 골라요', en: 'Victory. Choose what comes on the next floor' },
    towerStepNext: {
        ko: '강화 층에서는 보스가 카드를 먼저 가져가요. 두 쪽의 카드는 이번 도전 동안 유지돼요',
        en: 'On upgrade floors the boss takes a card first. Both sides keep their cards for this run',
    },

    cardsTitle: { ko: '카드와 유물', en: 'Cards and Relics' },
    cardsPointPick: {
        ko: '강화 층에서는 보스가 카드 한 장을 먼저 가져가고, 남은 카드에서 골라요',
        en: 'On upgrade floors the boss takes one card first; you pick from the rest',
    },
    cardsPointRun: {
        ko: '카드는 이번 도전 동안만 유지되고, 새 도전에서는 처음부터 시작해요',
        en: 'Cards last for this run only; a new run starts fresh',
    },
    cardsPointRelic: {
        ko: '유물 문에서는 자동으로 발동하는 힘을 얻어요. 도전이 끝나면 사라져요',
        en: 'Relic doors give you powers that trigger on their own. They vanish when the run ends',
    },

    termsTitle: { ko: '병력 용어', en: 'Troop Terms' },
    termsPointTier: {
        ko: '등급(T1~T6)은 합성할수록 올라가요. 높을수록 강해지고 공격 모션도 바뀌어요',
        en: 'Tier (T1 to T6) goes up as you merge. Higher tiers are stronger and attack in new ways',
    },
    termsPointTemperament: {
        ko: '성향은 병력의 성격이에요. 성향마다 능력치의 배분이 달라요',
        en: 'Temperament is a troop’s personality. Each one splits its stats differently',
    },
    termsPointElement: {
        ko: '속성은 5가지가 있어요. 속성 병력은 피해의 절반이 속성 피해로 더해지고, 상대의 속성에 따라 그 배율이 달라져요',
        en: 'There are 5 elements. An element troop adds half its hit as element damage, and the target’s element changes that multiplier',
    },

    previewTitle: {
        ko: ({ name, tier }) => `${name} T${tier} 공격 미리보기`,
        en: ({ name, tier }) => `${name} T${tier} Attack Preview`,
    },

    cornPrepare: { ko: '알갱이를 쏠 준비를 해요', en: 'Getting ready to shoot kernels' },
    cornFlight: { ko: '알갱이가 날아가 적에게 붙어요', en: 'Kernels fly and stick to the enemy' },
    cornExplosion: {
        ko: '붙은 지 1초 뒤부터 0.1초 간격으로 터져요',
        en: 'From 1s after sticking, they burst every 0.1s',
    },
    peaPrepare: { ko: '적을 향해 돌진할 준비를 해요', en: 'Getting ready to charge the enemy' },
    peaContact: { ko: '앞으로 돌진해 적을 들이받아요', en: 'Charges forward and rams the enemy' },
    peaRecover: { ko: '들이받은 뒤 다음 돌진을 준비해요', en: 'After the ram, gets ready for the next charge' },
    redbeanPrepare: { ko: '적을 향해 뛰어오를 준비를 해요', en: 'Getting ready to leap at the enemy' },
    redbeanContact: { ko: '뛰어올라 적을 덮쳐요', en: 'Leaps up and pounces on the enemy' },
    redbeanRecover: { ko: '착지한 뒤 다음 도약을 준비해요', en: 'Lands and gets ready for the next leap' },
    chestnutPrepare: { ko: '가시를 쏠 준비를 해요', en: 'Getting ready to shoot spikes' },
    chestnutFlight: { ko: '가시를 날려 적을 찔러요', en: 'Shoots spikes that pierce the enemy' },
    chestnutRecover: { ko: '가시를 쏜 뒤 다음 공격을 준비해요', en: 'After shooting, gets ready for the next attack' },
    peanutPrepare: { ko: '두 알이 함께 공격할 준비를 해요', en: 'Both nuts get ready to attack together' },
    peanutContact: { ko: '두 알이 번갈아 적을 공격해요', en: 'The two nuts take turns attacking the enemy' },
    peanutRecover: { ko: '협공을 마치고 다음 공격을 준비해요', en: 'Finishes the team attack and gets ready again' },
    walnutPrepare: { ko: '망치를 들어 공격할 준비를 해요', en: 'Raises the hammer, ready to attack' },
    walnutContact: { ko: '망치를 휘둘러 적을 때려요', en: 'Swings the hammer and smacks the enemy' },
    walnutRecover: { ko: '망치를 거두고 다음 공격을 준비해요', en: 'Lowers the hammer and gets ready again' },
    ricePrepare: { ko: '낫을 들어 적을 벨 준비를 해요', en: 'Raises the sickle, ready to slash' },
    riceContact: { ko: '낫을 휘둘러 적을 베어요', en: 'Swings the sickle and slashes the enemy' },
    riceRecover: { ko: '낫을 거두고 다음 공격을 준비해요', en: 'Lowers the sickle and gets ready again' },
    wheatPrepare: { ko: '지휘봉을 들어 공격할 준비를 해요', en: 'Raises the baton, ready to attack' },
    wheatContact: { ko: '지휘봉을 휘둘러 적을 공격해요', en: 'Swings the baton at the enemy' },
    wheatRecover: { ko: '지휘봉을 거두고 다음 공격을 준비해요', en: 'Lowers the baton and gets ready again' },
    barleyPrepare: { ko: '도리깨를 들어 공격할 준비를 해요', en: 'Raises the flail, ready to attack' },
    barleyContact: { ko: '도리깨를 휘둘러 적을 때려요', en: 'Swings the flail and smacks the enemy' },
    barleyRecover: { ko: '도리깨를 거두고 다음 공격을 준비해요', en: 'Lowers the flail and gets ready again' },
});
