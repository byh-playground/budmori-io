# 공격 발생 신호·수명주기·폐기 성장 정리

## 기준과 변경 범위

- 정규 작업본 기준: `d0636e43a1859033dc4fd8754e9e43008e9f88cc`.
- 별도 checkout baseline: `2e086ba58db269a425d0ae9f452ffe8f1ea3db9f`.
- 기준 HTML SHA-256: `494cd648e4776104ecbbaa28db45fe3b64aa5b5ba03c2fa2a33bad5fa83ccfb1`.
- 최종 HTML SHA-256: `ea0a6e6aa301cc5e9535c43d831ecbcaa4a980565f72e71fa4d6b1ba1a96bbf4`.
- 별도 checkout에서만 수정했다. 실행물은 여전히 `index.html` 하나이며 SDK, CONFIG 수치, 게임 규칙, 물리·기하 계산, wire schema를 변경하지 않았다.

## 실제 소유권 변경

### 기본 공격

`BasicAttack`은 기존 `attack`, `resolveBasicAttack`, 자폭·선형·연쇄·연사·원거리·근접 handler의 실행 본체를 직접 소유한다. 다른 소유자를 호출하기만 하는 새 Mixin/중계 객체가 아니다. 준비/접촉, cooldown/pose/stat 처리, 공간 context 진입·복구 및 capability 선택은 그대로이다.

소유자가 발행하는 발생은 `released`, `detonated`, `lineResolved`, `chainLinked`, `slamResolved`, `meleeResolved`이다. 폭발/선/연쇄/근접 효과 및 rarity trail/launch 오디오 선택은 구독자가 수행한다. 이벤트 이름을 문자열로 받는 범용 bus나 공개 publish API는 추가하지 않았다.

구독은 첫 게임 tick 전에 한 번 등록하며, 기본 subscriber 순서는 다음 기존 실행 순서를 보존한다.

- 피해·domain consequence → 해당 handler 효과
- 자폭 area 피해 → 폭발 ring → 자폭 defeat
- 근접 slam area → slam ring → slash
- 실제 공격 완료 → rarity accent → launch sound
- windup만 만든 호출은 release를 발행하지 않는다.

원래 글로벌 함수 property도 `var` 바인딩으로 보존했다. 실제 함수 정의는 owner 내부에 하나만 남고, 외부 바인딩/기존 debug API는 같은 함수를 가리킨다.

### 패턴 및 무기

`PatternAttack`이 begin/tick/blast 실행 본체와 구독을 함께 소유한다. rarity, audio, resident가 같은 begin/tick을 반복 감싸던 wrapper와 그 전용 capture를 제거했다. 기존 의미상 시점은 다음과 같이 유지한다.

1. 최초 controller 값과 pattern-specific begin
2. rarity 피해량 계산
3. rarity cast 효과와 warning sound
4. resident인 경우 기존 최종 피해량 계산
5. windup 종료 시 execute와 그 피해·blast 효과
6. 실제 execute phase에 진입한 뒤 release sound

`landed`는 blast의 기존 중복 방지 권위로 유지된다. 구독자가 실행 중인 물리나 판정을 대신 결정하지 않는다.

`AbilityAttack`은 기존 family별 payload construction 본체와 완료된 발사 경계를 소유한다. 최초 외부 발사당 한 번 occurrence를 발행하며, 내부 volley의 세 projectile은 세 번 오디오를 생성하지 않는다. 기존 유한 수치 clamp와 family construction·muzzle·Sprout 갱신·source capture 순서는 그대로이다. `weaponLaunchAdapter` 공개 경계의 직접 construction 의미도 유지한다. `soundLaunch`와 더 이상 capture되지 않는 구형 dispatch wrapper는 제거했다.

기존 `CommittedProjectiles`의 명중, 귀환 예고, 귀환 시작 및 `WorldBoss`의 실제 참가자 진입에도 private 발생 신호를 두었다. 이미 실제 실행 본체를 가진 owner 안에서 발행하므로 새로운 빈 forwarding layer가 아니다. 구독자는 이전 `addFx`/`soundCue` payload를 같은 문장 위치에서 enqueue한다. ballistic/높이/충돌/피해 계산은 변경하지 않았다.

### 보상

`ResidentRewards.residentAward`가 기존 acquire 성공 → ledger awarded/awardedTick → 참가자 통계 갱신을 수행한 뒤 award를 발행한다. collection refresh와 ring을 구독자가 순서대로 기록한다. acquire 실패에는 발행하지 않고, 이미 awarded인 ledger의 재호출도 발행하지 않는다. 일반 death/health/owned-death의 기존 owner와 발생 신호는 바꾸지 않았다.

모든 새 구독은 해제 함수를 반환하며 반복 해제는 무효이다. 구독 배열, 함수, 발생 객체는 authority/snapshot에 저장하지 않는다. journal, effect ID, replay 및 confirmed-once 전달 코드는 그대로 사용한다.

### 야생 cull과 계정 이탈

`wildRingCull`의 판정·camp 수량·unit 제거·참조 정리·hunt index 정리·grid 재구성·culled 수량 갱신을 `UnitLifecycle.cullWildOutside` 안으로 이동했다. 공개 함수는 기존 scheduler 진입점이다.

`ProjectileLifecycle.cullWildOwners`는 기존 cull 의미만 담당한다.

- 제거된 owner의 `patternOwned` projectile만 제거
- 제거된 unit/target을 참조하는 아직 실행하지 않은 event 제거
- 이미 발사된 독립 payload는 source 또는 target이 사라져도 기존 attribution·전체 필드를 그대로 보존
- 기존 cull은 일반 `discardProjectile` hook을 부르지 않았으므로 임의로 hook/채널 cleanup을 추가하지 않음

Cull은 죽음이나 inventory detach가 아니다. HP/deadEffect 변경, death/recruit/reward occurrence, 보상 생성 없이 원래 disposal만 한다. `PlayerLifecycle.leave`의 직접 account 삭제는 inventory의 `rarityDisposeAccount` API로 옮겼다. leave의 unit 제거·projectile 종료 순서도 그대로이다.

## 폐기 유료 성장/압축

미도달 최초·tier `ensureGrowthDraft`, `chooseGrowth`, `compressPermanent` 및 spatial wrapper를 제거했다. 전용 capture/helper/busy flag만 함께 삭제했다. `growthTransaction`, `statOfferRandom`, 지원 저장 migration, 전투력 helper와 네 비활성 wire 명령은 보존했다.

세부 호출/덮어쓰기 도달성 증명과 각 의존성의 존치 근거는 `retired-progression-reachability.md`에 있다. `growthDraft`, `growthChoice`, `gate`, `compress`의 encode/decode/queue와 최종 inert adapter에는 변화가 없다.

## 검증

최종 HTML에서 `BLOOM_COMBAT_BASELINE=<검증된 pinned HTML> npm test` 전체 PASS. 초기 별도 checkout에는 기존 validator 기준 Git 객체가 없었으나, 원본 checkout의 정확한 d0636e4 이력을 read-only fetch하여 해결한 뒤 최종 전체 suite를 재실행했다. 테스트 기준이나 assertion을 약화하지 않았다.

추가로 d0636e4 고정 HTML과 최종 HTML을 서로 다른 실제 엔진/내장 SDK realm에서 비교했다.

- `domain-occurrence-lifecycle.cjs`: 168개 전체 canonical bytes/effect ID·payload·순서 경계 PASS. 두 참가자, 실제 네 종 공격, windup/contact, 패턴 cast/execute/landed, 세 payload 발사, 보스 진입/명중/3개 귀환 예고·복귀/보상, 중복 award, cull 및 독립 payload 보존, 구독 순서/해제, 50 tick 진행·동일 50 tick rollback replay의 confirmed-once, 이탈/복원까지 하나의 연속 세계를 사용한다.
- `health-lifecycle-ownership.cjs`: 41개 bytes/effects 경계 PASS.
- `motion-owner-continuation.cjs`: 248개 bytes/effects 경계와 21개 assertion PASS. 다섯 참가자와 일곱 무기 family, live/prepared restore, membership을 포함한다.
- `reset-load-parity.cjs`: 158개 reset/load/migration 경계 PASS.
- `inventory-parity.cjs`: 186개 inventory/membership 경계 PASS.
- `retired-progression.cjs`: 45개 경계 및 24개 명령 검사 PASS, 10/20/30 TPS.
- `git diff --check`: PASS.

두 신규 검사를 `npm run test:shared`에 추가했다. 테스트의 domain-owner source 검사도 여섯 실제 owner 내부에 직접 `addFx`/`soundCue`/`bloomEmit`/`CombatAudio` 선택이 다시 들어오는 것을 막는다.

이는 실제 HTML/SDK의 native V8 검증 및 모의 DOM 경계이다. 이번 lane에서는 브라우저·GPU·실기기 시각 검증이나 별도 성능 비교를 실행하지 않았다. 최종 합본 이후 parent의 브라우저/성능 gate를 대체하지 않는다.

## 통합 주의

- spawn lane과 같은 줄을 편집할 수 있는 capture 목록은 `rarityLegacy`와 `spatialCore`이다. 이 lane은 각각 `beginAttackPattern`, `compressPermanent`만 없앴다. spawn lane의 `spawn` 제거와 모두 합쳐야 한다.
- `package.json`의 test:shared 문자열은 다른 신규 검사와 합집합으로 유지한다.
- projectile/critical 핫픽스의 실제 `launchAbilityShot` 최초 constructor, `gearDamage`, projectile XYZ/appearance 본문은 변경하지 않았다. 무기 construction을 기존 위치의 owner closure로 감싼 부분은 textual merge 위치가 근접할 수 있지만, 내용상 수식 변경은 없다.
- canonical은 수정하지 않았으며 새 규칙/수치/SDK 변경을 이 패치에 섞지 않았다.
