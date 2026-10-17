# 기능별 클래스와 분기 점검

기준: `0.8.0`, PR #125의 `edcd13408d4c581e01cfb5caab78dc24e14e601a`.
이번 변경은 기존 동작·수치·RNG 순서·저장 계약을 유지하는 구조 변경입니다.

## 같은 기능의 관점을 함께 배치

`features/`의 한 기능 아래에 모델과 표현 클래스를 함께 둡니다. 이름이 같은 두 중앙 분기문을
각각 다른 파일로 옮기는 방식 대신, 기능별 구체 클래스가 자신의 동작과 표현을 구현합니다.

| 기능                                                           | 모델 책임                                                              | 표현 책임                        |
| -------------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------- |
| `boss-patterns/*`                                              | 대상 선택, 사용 가능 여부, 공격 영역, 활성화·실행, 무기 위치·타격 분류 | 자세, 동작 clip, 소환 애니메이션 |
| `scenes/farm`, `scenes/raid`                                   | 진입, 유닛 생명주기, 접촉, 전투 갱신, 진행 체크포인트                  | 카메라·지형·가시성·승패 표시     |
| `farm-modes/breed`, `farm-modes/merge`                         | 먹이·짝·합체 이동과 접촉                                               | 탄생·합체·재료 이동 효과         |
| `projectiles/seed`, `projectiles/spike`, `projectiles/popcorn` | 비행, 충돌, 지연 폭발, 연쇄와 수명                                     | 비행·착탄·폭발 표시              |
| `unit-attacks/lob`, `unit-attacks/dual-strike`                 | 기존 공격 capability mixin                                             | 해당 공격·회복 motion            |
| `abilities/*`                                                  | 불변 능력 정의                                                         | 해당 능력의 순수 설명·제목 계산  |

- IS-A: 구체 보스 패턴, 장면, 농장 모드, 투사체는 작은 공통 base contract를 구현합니다.
- HAS-A: Garden은 교체 가능한 장면·모드·패턴 동작을 사용하고 렌더 어댑터는 해당 표현 객체를 사용합니다.
- CAN-BE: 기존 유닛 공격 능력은 subclass-factory mixin과 명시적인 `super` 호출을 유지합니다.
- 기능의 `definition.js`는 모델과 표현이 공유하는 불변 정체성입니다. 보스 수치의 원본은 기존
  `boss-patterns.js`이며, 투사체 타입 판정은 `projectileFeature` / `projectileFlightFeature`가 함께 소유합니다.
- `farm-model.js`, `farm-renderer.js`와 조합 모듈은 공통 실행 순서와 연결을 담당합니다. 새로운 패턴의
  구체 동작·표현은 해당 기능 폴더에 추가합니다.

## 상태와 자원 소유권

`scene`, `mode`, 공격 `phase`, 타이머와 action record는 기존 모델 필드만 사용합니다. 정책 객체에
현재 모드나 타이머를 복제하지 않으며, 저장된 식별자로 동작을 선택하므로 복원 시 별도 동기화가 없습니다.
`Garden.setFarmMode`가 모드 전환과 대기 합체 취소를 소유하고, 세션은 이 API에 명령을 위임합니다.

모델 정책은 초기화 때 한 번 생성합니다. 틱·프레임·유닛마다 전략 객체를 만들지 않습니다. 기존 공간
인덱스·scratch buffer·공격 RNG 순서·2차 팝콘 연쇄 순서를 유지합니다. 렌더의 retained geometry와
actor 자원 수명은 기존 renderer가 소유합니다. 모델은 표현 클래스를 import하지 않으며 새 모델과
공유 정의도 ESLint 모델 경계에 포함됩니다.

## 전체 분기 점검 범위

직접 관리하던 `src/`의 JavaScript/CommonJS 40개 파일을 AST와 소스로 점검했습니다. 생성 번들
`src/game.js`, vendor와 의존성은 구조 변경 대상에서 제외했습니다. 단순히 `else if` 개수를 줄이는
것을 목표로 삼지 않았으며, 타입별 동작이 여러 위치에 흩어진 경우를 우선 분리했습니다.

- 보스 패턴·장면·농장 모드·투사체: 위 기능 클래스로 분리
- 렌더의 보스·장면·공격·효과·투사체 타입 분기: 해당 기능의 표현 클래스로 분리
- 능력별 설명과 실패 사유: 능력별 순수 표현 클래스와 고정 메시지 조회로 분리
- 전투 notice: 이벤트별 클래스가 관찰·사운드·그리기·획득·반납을 함께 소유
- 세션의 명령 switch: 외부 명령 검증·라우팅 경계로 유지. 게임 규칙은 모델에 위임
- 세션의 표현 ID prefix 분류: GameKit이 반환한 표현 record를 고정 컬렉션으로 분류하는 어댑터 경계로 유지
- 앱의 키보드·포인터·history·메뉴 분기: 입력 우선순위, 포커스와 탐색 상태 전이로 유지
- 저장 migration·validation·storage 분기: 버전별 변환, 입력 검증, 복구 결과 판정으로 유지
- `attack-telegraph`의 도형 분기, 충돌·경계·수치 clamp: 기하 계산과 검증으로 유지
- 공통 공격 phase·socket phase와 cooldown/HP 조건: 동일 객체의 생명주기·시간 조건으로 유지

예를 들어 scatter가 공격보다 우선하는 조건이나 hit 유무 검사를 새 종류로 상속시키지 않습니다.
이 조건은 서로 다른 객체의 구체 구현이 아니라 기존 실행 순서·공간 판정의 일부입니다.

## 검증

기존 `npm run build`가 포맷·린트, 시작 presentation, SVG 원본·메타데이터·금지 산출물 검사를 실행합니다.
검증용 일회성 비교는 저장소에 새 테스트 제품군으로 남기지 않습니다.

- 기존/변경 모델 5,400틱 비교: 번식·합체와 6개 보스 패턴의 상태·RNG·공격 영역 일치
- 별도 집중 비교: 사망·농장 회복, 전체 snapshot 복원, compact save, 농장 보스 승리·패배,
  팝콘 비행·연쇄·제거, 모드 재선택과 대기 합체 취소 일치
- 렌더 2,210사례, 실제 GameKit draw packet 41,962개가 기준과 일치. 실제 SVG 18개와 기존 품질 preset을
  사용하고 retained mesh 18개를 유지. CPU packet 비교이며 GPU 화면 검증을 의미하지 않습니다.
- 능력 UI 896사례, 전투 표시 동작 3,711개가 기준과 일치
- 기존 브라우저 E2E 실행은 이 클라우드 환경에서 Edge 부재 및 Chromium 실행 제약으로 완료하지 못했습니다.
  브라우저 화면/GPU 검증은 통과로 기록하지 않습니다.

## 근거

구조와 구현 형식은 [Bloom 개발 규칙](https://github.com/byh-playground/bloom-reference/blob/main/rules/development.html),
요구·비교·검증 순서는 [AI 개발 규칙](https://github.com/byh-playground/bloom-reference/blob/main/rules/ai-development.html),
클래스와 메서드 공유는 [JavaScript classes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes)를
확인했습니다. 버전·배포와 테스트 운용 정책은 기존 프로젝트 관리 규칙과 README를 따릅니다.
