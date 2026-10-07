# 폐기된 유료 성장·영구 압축 구현의 도달성 검증

## 기준과 범위

- 기준 커밋: `2e086ba58db269a425d0ae9f452ffe8f1ea3db9f` (`baseline d0636e4 domain completion`). 정규 작업본 `d0636e4`와 같은 HTML이다.
- 기준 `index.html` SHA-256: `494cd648e4776104ecbbaa28db45fe3b64aa5b5ba03c2fa2a33bad5fa83ccfb1`.
- 아래 원본 줄 번호는 이 기준 HTML을 가리킨다.
- 변경은 이미 rarity 규칙에서 비활성화된 유료 성장과 영구 압축의 미도달 실행 본체·전용 의존성에 한정했다. 실행 가능한 성장/전투/스폰/체력/물리 규칙, CONFIG 수치, 저장 schema와 wire 명령은 바꾸지 않았다.

## 왜 실행되지 않는가

1. `ensureGrowthDraft`의 최초 구현(8524)은 8918에서 대체되고, 두 번째 구현도 18226에서 `()=>false`로 대체된다. 이전 구현을 저장한 capture는 없다.
2. `chooseGrowth` 최초 구현(8526)은 8835의 `statTierCore.chooseGrowth`에만 저장된다. 이를 호출하는 코드는 8930의 tier 검사 wrapper뿐이다. 그 wrapper도 18226에서 `()=>false`로 대체되며 다른 capture에 보존되지 않는다. 최초 함수 → capture → wrapper 전체가 실행 진입점을 잃는다.
3. `compressPermanent` 본체(9353)는 9855의 `spatialCore.compressPermanent`에만 저장된다. 그 capture의 유일한 호출자는 10105의 높이/trace wrapper이다. wrapper는 18226에서 `()=>false`로 대체되고 그 이전 함수가 다른 capture에 보존되지 않는다.
4. `initializeGrowthUI`, `publishStatTierUI`, `publishPermanentUI`, `publishSpatialUI`는 즉시 실행되는 등록 코드가 아니라 함수이다. `GameUI.mount()`는 전체 HTML 스크립트 및 최종 명령 adapter 정의가 완료된 뒤 마지막 `boot()`에서만 호출한다. `window.__army`에 공개되는 함수와 클릭 핸들러는 폐기된 본체가 아니라 최종 바인딩을 참조한다.
5. 21805의 `bloomCore`가 저장하는 세 함수는 이미 rarity no-op이다. 이후 최종 `chooseGrowth`/`compressPermanent`는 기존 wire 명령을 queue하고, `ensureGrowthDraft`는 현재 draft 유무만 읽는다. 실제 명령 수신자인 `PlayerProgression.growthDraft/growthChoice`는 `false`, `gate/compress`는 빈 분기이다. 이 마지막 경계는 그대로 보존했다.

따라서 제거 대상의 함수 body는 정상 boot, 명령, tick, live restore, disk import, membership 경로 어느 곳에서도 호출되지 않는다. 제거된 본체 내부의 RNG, HP, 유닛 제거, 저장 및 표현 호출은 원래도 실행되지 않았으므로 새 소유자로 옮기지 않고 삭제한다.

## 함께 제거한 것과 보존한 것

- 제거: `statTierCore.chooseGrowth`, `spatialCore.compressPermanent` capture, 최초 draft만 사용하는 `growthEligible`, tier draft만 사용하는 `statPickWeighted`, 압축 본체만 사용하는 `permanentDetach`.
- 제거: 유료 선택 전용 `growthChoosing`와 압축 전용 `permanentBusy`. 유일한 쓰기 본체를 없앤 후에는 authority install의 false 재설정과 prepared-membership의 임시 보존 외에 의미 있는 소비자가 없었다. 두 값은 snapshot/wire 필드가 아니며 관련 임시 보존·복원 목록에서도 제거했다.
- 보존: `growthTransaction`은 무기 draft/선택에서 사용한다. `statOfferRandom`은 라이벌 선택·공격과 무기 선택에서 사용한다. 이 함수들을 폐기된 성장의 이름만 보고 제거하지 않았다.
- 보존: 카드 registry/검증, `migrateStatGrowth`, 영구 전투력 migration 관련 함수, 현재 canonical disk loader와 capacity/timer migration. 현재 지원되는 과거 저장 입력과 키 순서에는 손대지 않았다.
- 보존: 공개된 영구 능력치/배치 helper, `permanentRetryAt`, trace 관련 저장·표현 구조. `permanentRetryAt`은 현재 snapshot의 필드이므로 폐기된 트랜잭션의 쓰기가 없어도 wire에서 제거하지 않았다.
- 보존: `growthDraft`, `growthChoice`, `gate`, `compress`의 필드 이름·검증·encode/decode·queue adapter·최종 no-op. 글로벌 함수 property를 없애지 않도록 기존 함수 선언과 같은 공개 바인딩을 `var` 선언으로 유지했다.
- 다른 역사적 UI/설정 전체의 삭제, 다른 도메인 리팩터링, 새로운 호환 정책은 이 작업 범위가 아니다.

## 검증

새 `tests/retired-progression.cjs`는 제거한 참조가 돌아오지 않는 구조 검사와 실제 HTML/내장 SDK를 실행하는 검사이다. 기준 HTML을 세 번째 인자로 주면 전후 비교를 하고, 생략하면 같은 실행물의 반복 실행·무변이 검증을 수행하며 결과에 비교 범위를 명시한다.

실행 결과:

- `node tests/retired-progression.cjs index.html <기준 HTML>`: PASS. 10/20/30 TPS에서 45개 비교 경계, 24개 명령 검증. 네 비활성 wire 명령의 encode bytes/필드, 두 참가자에게 반복한 직접 dispatch, 글로벌·in-tick·captured adapter의 무변이, 실제 tick, live restore, membership의 전체 권위 bytes/키 순서/alias graph/RNG 및 효과 배열/ID/순서가 일치한다.
- 인자 없는 신규 검사: PASS. baseline이 없는 CI에서도 구조·무변이·동일 실행물 재현성을 확인한다.
- `tests/reset-load-structure.cjs`: PASS. canonical load, hydration 및 지원 migration 경계 유지.
- `tests/reset-load-parity.cjs index.html <기준 HTML>`: PASS, 158경계. 10/20/30 TPS와 네 seed의 reset, 이동, 패배/회복, disk/export, 지원 v63 capacity/timer migration, 손상 입력의 무변이가 정확히 일치한다.
- `tests/inventory-parity.cjs <기준 HTML> index.html`: PASS, 186경계. 영입/잠금/사망/복원/실제 tick/후발 참가/이탈·재참가의 전체 권위 bytes 일치.
- `tests/prepared-snapshots.cjs`: PASS. membership graph/bytes, incumbent reference, opaque token, 동기/분할 preparation, 취소·실패 무변이, actor alias 및 legacy prototype 검사.
- `tests/codec-jobs.cjs`: PASS. 1,081개 malformed reject, 65개 accepted 입력의 동기/분할 처리 일치, 전체 graph/키/alias, 취소 및 대형 world capture.
- `tests/campaign.cjs`: PASS, 134개 검사. 진행·전투·성장·저장/복원·실패/회복·rollback/지연 입력·과거 전투 결과를 잇는 실제 엔진 캠페인이다. 과거 전투 baseline 파일은 `combat-baseline.json`의 SHA 검증 후 `BLOOM_COMBAT_BASELINE`으로 전달했다. 첫 실행의 로컬 fixture 누락은 이 방법으로 해결했다.

검증 환경은 실제 HTML/SDK를 사용하는 native V8 및 모의 DOM 경계이다. 브라우저/GPU/실기기 검증을 뜻하지 않는다. 전체 aggregate suite는 통합 후 실행해야 한다.
