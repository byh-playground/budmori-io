# 병종별 성장 전환 계약

현재 제품은 0.30.41, 싱글 전용이다. 공통 모델은 준비되어 있지만 **활성화된 병종은 없다**.
`features/species-growth/definition.js`의 availability는 모두 false다. 기존 schema 3의
`powerLevel`·`branchLevels`, 숙련과 UI, 대표 능력은 그대로 실행된다. 이번 기반 변경은 새 공격이나
50레벨 제한이 플레이에 적용됐다는 뜻이 아니다.

## 새 트리의 단일 계약

`SpeciesGrowth`는 활성화된 병종의 투자·해금·이관 규칙을 소유한다. DOM·저장소·전투 연출과 독립적이다.

- Lv1에서 1P, Lv50에서 50P. XP는 기존 100 × 1.2^(L−1) 곡선을 사용한다.
- 진화 T2–T6은 각각 2P, 선행 진화를 연구해야 한다. 숙련 해금은 Lv2/6/12/20/30이다.
- 기본 3축은 10랭크 × 1P, 랭크 해금은 Lv1/6/11/16/21/26/31/36/41/46이다.
- 특화 3축은 5랭크 × 2P, 랭크 해금은 Lv11/19/27/35/43이다.
- 전체 용량은 10+30+30=70P. 잔여 포인트는 레벨 예산에서 실제 랭크별 비용을 차감한다.
- 기본·특화 축은 진화 선수조건이 아니다. 합성은 연구와 무관하게 가능하며, 미리 연구해도
  실제 공격은 현재 유닛 등급 이하의 가장 높은 연구 단계만 사용한다.
- 농장에서만 구매·무료 재분배한다. 전투 또는 진행 중인 런에서는 막고 런 시작의 투자를 유지한다.
- 미구현 병종·노드는 구매할 수 없다. 지금 명칭이 비어 있는 기본/특화 슬롯을 UI에 노출하지 않는다.

## 종별 출시와 저장 경계

0단계는 의도적으로 제품 번들·디스크 스키마를 바꾸지 않는 준비 PR이다. 다음 옥수수 출시에서 실제
consumer를 연결한다. 임시 fixture만 활성화해 규칙을 검증할 수 있다. 이것은 일반적인 장기 dead code나
무기한 fallback이 아니라 승인된 9종 순차 전환의 짧은 준비 단계다.

종별 활성화 PR에는 반드시 다음을 함께 포함한다.

1. 실제 T1–T6 공격·성장축 효과·UI, 종별 availability, 기존 대표 능력의 기본 T1 보존.
2. 플레이어 schema dispatch와 종별 build 교체. 검증된 기존 저장만 `migrateBuild`에 전달하고
   종전 power/branch 투자는 전부 지운다. 별도 환급 보너스를 더하지 않는다. 총 예산이 레벨에서
   파생되므로 시작 1P나 환급이 재접속 때 중복 지급되지 않는다.
3. `farm-progress`의 exact keys 및 깊은 복사, `farm-save-codec`의 이관 경계,
   `farm-snapshot`의 별도 shape/schema, `player-progression`의 영수증 중복 방지를 함께 전환한다.
   기반 모델의 `awardXp`는 영수증 소유자가 아니며 이 함수를 보상 처리기로 직접 호출하지 않는다.
4. 새로 켜진 종만 이관하며 미구현 종은 기존 투자·XP·UI를 유지한다. 런 도중 이관하지 않는다.
   저장 가져오기는 실제 농장 재개 경계에서 적용하고 실행 중인 런의 투자 스냅샷은 유지한다.
5. 새 50레벨에서 남는 XP도 저장한다. 옛 Lv50 초과 저장은 원래 레벨·남은 XP를
   `legacyMastery`에 그대로 보존하고 새 masteryLevel=50, masteryXp=0에서 이후 XP를 따로 누적한다.
   거대한 기하급수 합으로 재계산해 정밀도를 잃거나 XP를 버리지 않는다. 아카이브는 소비/보상이 아니다.
6. 활성종의 저장→재로드→반복 이관, 위조/초과 투자 거부, 늦은 중복 보상, 무료 초기화,
   모바일 투자 UI, 런 종료/복귀까지 검증한다. 9종 전환 후 구 투자 실행 경로는 제거하되
   실제 사용자 구 저장을 읽는 단방향 마이그레이션은 유지한다.

## 공격 action 계약

`AttackAction`은 하나의 평타에 유한 슬롯(최대 32개), 단조 시뮬레이션 tick, 총합 1의 피해 가중치를 둔다.
발동/확률/RAW 소비 예산은 action당 한 번만 claim하고, 슬롯별 같은 대상 ID는 한 번만 맞힌다.
같은 보스의 충돌체 여러 개를 서로 다른 대상 ID로 바꾸면 안 된다. 후속 슬롯은 독립 정상 타격이다.

사망·기절·전투 종료의 소유자는 `cancel()`을 호출한다. 이미 발사한 투사체의 생명주기는 별개이며
각 병종 구현에서 유지/취소를 확정한다. 예를 들어 옥수수 발사체가 취소된 근접 action의 hit ledger에
의존하면 안 된다. 이 모델은 목표 재탐색·RNG·VFX를 만들지 않는다. 렌더 LOD가 실제 슬롯을 줄이지 않는다.

## 검증과 근거

개발 중 임시 모델 검사는 저장소 밖에서 실행하고 결과를 PR에 기록한다. 기존 E2E는 사용자 흐름을
그대로 검증한다. 비활성 상태의 기존 출력·전체 저장 roundtrip 일치와 활성 fixture의 비용/이관 검증을
분리하며, 활성 fixture 통과를 실제 공격·화면·저장 consumer 출시 완료라고 부르지 않는다.

기존 코드와 [Bloom 개발 규칙](https://github.com/byh-playground/bloom-reference/blob/main/rules/development.html),
[관리 규칙](https://github.com/byh-playground/bloom-reference/blob/main/rules/project-management.html)을 기준으로 했다.
[MDN Number.MAX_SAFE_INTEGER](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MAX_SAFE_INTEGER)의
정수 정밀도 한계와 [structuredClone](https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone)의
깊은 복사를 확인해 tick/rank 검증과 원본 불변 이관에 사용했다. 기술 자료가 게임의 비용·성장 곡선을 정한 것은 아니다.
