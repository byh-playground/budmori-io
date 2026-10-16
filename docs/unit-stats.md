# Common unit stats

이 문서는 공통 유닛 스탯과 종별 공격 프로필의 기준을 설명합니다. 전투 수치의 단일 원본은 `src/unit-stats.js`와 `src/unit-abilities.js`입니다. 현재 종별 공통 스탯은 모두 중립 기본값이며, 새 시스템을 추가한 것만으로 기존 밸런스가 바뀌지 않습니다.

## 공통 스탯

| 스탯 | 기본값 | 적용 |
| --- | ---: | --- |
| `maxHp` | 티어 공식 | 현재 HP 상한과 UI 체력 총량 |
| `attackPower` | 티어 공식 | 종별 `skillMultiplier`를 곱한 기본 공격력 |
| `armor` | 0 | `100 / (100 + 유효 방어력)`로 받는 피해 감소 |
| `armorPenetration` | 0 | 대상 방어력에서 비율만큼 차감, 0–1 범위 |
| `moveSpeed` | 1 | 기존 농장 이동 속도와 레이드 접근 속도 배율 |
| `attackSpeed` | 1 | 종별 회복 시간의 역수 배율. 공격 예고 `windup`은 유지 |
| `critChance` | 0 | 공격 1회당 치명타 확률, 0–1 범위 |
| `critMultiplier` | 1 | 치명타 시 방어 계산 전 피해 배율 |
| `attackArea` | 1 | 근접 스윕 반경과 투사체 충돌 반경 배율 |
| `lifesteal` | 0 | 일반 직접 공격의 실제 HP 손실을 바탕으로 한 회복 비율 |
| `regen` | 0 HP/s | 살아 있는 유닛의 초당 회복량 |
| `healingReceivedMultiplier` | 1 | 흡혈과 재생을 포함한 회복량 배율 |
| `knockbackPower` | 1 | 주는 넉백의 힘 배율 |
| `knockbackResistance` | 0 | 받는 넉백 힘에서 차감하는 비율, 0–1 범위 |
| `statusDuration` | 1 | 주는 제어 효과 지속시간 배율 |
| `statusResistance` | 0 | 받는 제어 효과 지속시간에서 차감하는 비율, 0–1 범위 |

티어 곡선은 기존 수치를 유지합니다. `maxHp = 40 × 1.5^(tier−1)`, `attackPower = 4 × 1.2^(tier−1)`입니다. 따라서 티어 1–4의 체력은 40/60/90/135, 공격력은 4/4.8/5.76/6.912입니다.

## 종별 공격 프로필

공통 스탯은 모든 종에 적용되고, `src/unit-abilities.js`는 종별 행동만 정의합니다. 각 프로필은 `kind`, `windup`, `recovery`, `range`, `skillMultiplier`, `projectileCount`, `bounces`를 가집니다. `range`는 현재 AI가 유지하는 보스와의 선호 간격이며 기존 간격을 보존합니다.

| 종 | 공격 유형 | 선호 간격 | 예고 | 회복 | 스킬 배율 | 투사체/도약 |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| 완두 | 돌진 | 1.45 | 0.28s | 0.65s | 1.0× | 없음 |
| 옥수수 | 포물선 투사체 | 4.1 | 0.38s | 1.25s | 1.6× | 투사체 1개 |
| 강낭콩 | 도약 | 2.5 | 0.32s | 0.9s | 1.3× | 도약 |

## 피해와 회복 처리 순서

1. 티어 공격력에 종별 스킬 배율과 현재 공격 버프를 적용합니다.
2. 공격 단위로 치명타를 판정하고, 치명타 배율을 적용합니다. 광역 공격은 한 번의 치명타 판정을 모든 대상에게 공유합니다.
3. 방어 관통을 적용한 뒤 대상 방어력으로 피해를 줄입니다. 보스 방어력은 기존 규칙대로 현재 체력 비율에서 계산됩니다.
4. 남은 체력보다 큰 피해는 실제 체력 손실까지만 계산합니다.
5. 직접 공격 흡혈은 실제 체력 손실 합계로 계산합니다. 광역 공격은 각 대상의 방어 후·과잉 피해 제외 손실을 합산하고, 그 합계의 1/3 비율만 회복합니다. 최종 회복량은 최대 체력을 넘지 않습니다.

상태 지속 피해와 반사 피해는 흡혈을 발생시키지 않습니다. 소환 유닛의 공격은 그 소환 유닛의 자체 스탯으로만 회복하며 소유자에게 이전하지 않습니다. 회복은 `healingReceivedMultiplier`를 거쳐 공통 상한 처리에 들어갑니다.

## 저장과 네트워크

스탯 프로필은 정적 코드 설정이며 유닛 저장 데이터에 복제하지 않습니다. 기존 세이브의 스냅샷 모양을 바꾸지 않으며, 싱글과 온라인 모두 동일한 `Garden` 결정론 시뮬레이션을 사용합니다. 확률형 치명타가 설정되면 시뮬레이션 시드 PRNG에서 공격 단위로 한 번만 난수를 가져옵니다. 현재 종별 프로필은 모두 중립값이므로 기존 전투의 숫자와 난수 소비 순서는 그대로입니다.

### 주요 코드와 검증

- `src/unit-stats.js`: 공통 기본값, 티어 곡선, 피해·회복·제어 계산.
- `src/unit-abilities.js`: 종별 공격 행동 프로필.
- `src/farm-model.js`: 농장/레이드의 공통 시뮬레이션 적용점.
- `src/farm-session.js`: 렌더링용 최대 체력과 결정론 룸 세션.
- `tests/unit-stats-unit.mjs`: 기본값, 방어·치명타, 직접/광역 흡혈, 회복 상한, 상태·넉백 계산.

이 설계는 Bloom Reference의 공통 스탯 용어와 검증 가이드를 참고합니다. 수치와 적용 순서는 Budmori 규칙이며 다른 게임 프로필의 샘플 값은 가져오지 않았습니다.

- [Bloom Reference: stats](https://github.com/byh-playground/bloom-reference/blob/main/rules/stats.html)
- [Bloom Reference: AI development](https://github.com/byh-playground/bloom-reference/blob/main/rules/ai-development.html)
