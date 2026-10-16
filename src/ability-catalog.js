// Values and node paths are the confirmed Farm ability specification.
// Point issuance is deliberately absent: the shared wallet starts at zero.
export const SPECIES_ABILITY_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: "pea-death-split",
    species: 0,
    name: "콩 분열",
    description: "전투에서 쓰러지면 같은 종의 T1 개체를 생성해 전투를 이어갑니다.",
    rootTier: 3,
    powerValues: Object.freeze([2, 3, 4]),
    gradeThresholds: Object.freeze([3, 2, 1])
  }),
  Object.freeze({
    id: "corn-burst-fire",
    species: 1,
    name: "옥수수 알갱이 연사",
    description: "한 기본 곡사 공격 주기 안에 알갱이를 시간차로 발사합니다.",
    rootTier: 3,
    powerValues: Object.freeze([2, 3, 4]),
    projectileAttackShare: 0.5,
    gradeThresholds: Object.freeze([3, 2, 1])
  }),
  Object.freeze({
    id: "corn-popcorn-chain",
    species: 1,
    name: "팝콘 연쇄 폭발",
    description: "착탄한 알갱이가 1초 뒤 폭발하고, 주변 팝콘과 닿으면 즉시 연쇄 폭발합니다.",
    rootTier: 3,
    powerValues: Object.freeze([0.5, 1, 1.5]),
    radiusMultipliers: Object.freeze([1, 1.5, 2]),
    fuseSeconds: 1,
    baseRangeFraction: 0.25,
    gradeThresholds: Object.freeze([3, 2, 1])
  }),
  Object.freeze({
    id: "chestnut-spike-fan",
    species: 3,
    name: "밤톨 가시 부채",
    description: "목표를 향해 부채꼴 가시를 발사합니다.",
    rootTier: 3,
    powerValues: Object.freeze([3, 5, 7]),
    projectileAttackMultiplier: 0.5,
    fanSpreadRadians: Math.PI / 2,
    intervalBasicCycles: 4,
    gradeThresholds: Object.freeze([3, 2, 1])
  }),
  Object.freeze({
    id: "kidney-continuous-leap",
    species: 2,
    name: "연속 도약",
    description: "착지 후 확률적으로 도약 재사용 대기시간을 초기화합니다.",
    rootTier: 3,
    powerValues: Object.freeze([0.2, 0.35, 0.5, 0.65]),
    gradeThresholds: Object.freeze([3, 2, 1])
  }),
  Object.freeze({
    id: "kidney-landing-shockwave",
    species: 2,
    name: "착지 충격파",
    description: "도약 착지 지점에서 기본 공격력과 사거리 기준의 충격파를 냅니다.",
    rootTier: 3,
    powerValues: Object.freeze([1, 1.5, 2]),
    gradeThresholds: Object.freeze([3, 2, 1])
  })
]);
