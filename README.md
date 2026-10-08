# Budmori.io · 버드모리

블룸 세계관에서 모아와 동료들을 키우며 탐험하고 싸우는 브라우저 게임입니다. **싱글 플레이와 최대 5명의 공개 P2P 경쟁 플레이**를 지원합니다.

게임 실행·배포·AI 개발의 기준 소스는 **`index.html` 한 파일**입니다. 게임 코드, UI, 데이터와 실행에 필요한 리소스·SDK가 HTML에 포함되어 있으며 별도 패키지 설치나 빌드가 필요하지 않습니다.

## 실행

1. [공개 게임](https://byh-playground.github.io/budmori-io/)을 WebGL 지원 브라우저로 열고 **공개 사냥 시작** 또는 **혼자 플레이/혼자 이어하기**를 선택합니다. 싱글은 저장소의 `index.html`을 내려받아 실행할 수도 있습니다.
2. 브라우저의 로컬 파일 정책으로 실행·저장이 제한되면 폴더를 정적 HTTP 서버로 제공해 엽니다.
3. 싱글 진행을 다른 기기나 브라우저로 옮기기 전에는 **설정·저장 → 백업 다운로드**로 JSON을 저장합니다. 공개 세계의 진행은 개인 백업으로 내보내지 않습니다.

공개 플레이: [Budmori.io](https://byh-playground.github.io/budmori-io/). PR의 후보 변경은 머지 전에는 공개 게임에 반영되지 않습니다.

## 플레이와 조작

- 모아를 이동시키며 자동 공격하고, 야생 동료 영입·영구 군단 수집·합성·성장 카드로 전력을 키웁니다.
- 지역 탐험, 지형 이동, 자동 사냥, 정예·보스의 공격 예고와 회피, 패배 후 회복을 제공합니다.
- **모아 부활:** 쓰러지면 화면을 가리는 팝업 없이 체력 HUD에 남은 시간이 표시되고, 3초 뒤 자동으로 부활합니다. 싱글의 명시적인 메뉴 일시정지는 부활 시간도 멈춥니다. 영구 군단의 기존 부활 대기시간은 유지됩니다.
- **이동:** 목적지를 클릭/탭하거나 WASD·방향키를 사용합니다.
- **구르기:** 목적지를 두 번 클릭/탭하거나 Space를 누릅니다.
- **메뉴:** 화면 메뉴 또는 Esc. 싱글은 세계가 멈추고, 공개 세계는 내 이동 입력만 멈춘 채 다른 참가자와 전투가 계속됩니다. 도감·군단 관리·성장·지도는 화면의 해당 버튼에서 엽니다.
- **싱글 저장:** 자동 저장과 수동 저장, JSON 백업 내보내기·불러오기를 제공합니다. 갑작스러운 브라우저·OS 종료 시 마지막 완료 저장 이후의 진행은 잃을 수 있습니다. 공개 플레이는 싱글 저장을 덮어쓰지 않으며 새 판은 새 모아로 시작합니다. 같은 공개 세계의 새로고침 복귀 조건은 아래 공개 세션 안내를 참고하세요.
- 오류가 발생하면 로컬 진단 창에서 내용을 복사하거나 TXT로 저장할 수 있습니다. 공유 전 내용을 확인하세요.
- 멀티플레이 끊김을 조사할 때는 메뉴의 **진단 정보 → 성능 프로파일링 시작**을 누르고 재현한 뒤 다시 진단 정보를 엽니다. 최근 프레임의 지형 타일 생성/cache hit·miss, terrain/actor 표현, WebGL endFrame·texture upload/flush, 최신 tick/presentation 시간을 로컬 bounded sample과 p50·p95·max 요약으로 확인할 수 있습니다. 프로파일링은 기본적으로 꺼져 있습니다.

현재 HTML의 화면 제목·저장 키·진단 표기에는 기존 **BLOOM** 명칭이 남아 있습니다. 최초 등록은 기존 실행물을 바이트 변경 없이 보존했습니다.

## 개발 기준

### 우선순위와 파일 구성

1. **최적화가 먼저, 재미가 그다음입니다.** 기능·표현을 추가할 때 계산량, 호출 빈도, 메모리, 초기 로딩, 틱·렌더 비용을 함께 판단합니다. 예상과 실제 측정을 구분하며 성능 회귀를 숨기지 않습니다.
2. 실행·배포·AI 수정 대상은 단일 `index.html`로 유지합니다. 작업용 도구나 중간 생성물이 실행 의존성이 되어서는 안 되며, 중간 빌드·임시 결과물을 최종 게임 대신 전달하지 않습니다.
3. 밸런스·타이밍·규모·표현 한도는 해당 `CONFIG`·Definition·정책 설정에서 관리합니다. 같은 규칙을 여러 위치에 하드코딩하거나 서로 다른 구현으로 복제하지 않습니다.
4. 공통 세계관은 [bloom-world](https://github.com/byh-playground/bloom-world)를 참고하고, 게임 고유 규칙은 이 게임에서 관리합니다.

### 유닛 생성 수명주기

- 공개 `spawn()`은 `UnitSpawn.create()` 한 진입점을 사용합니다. 지형의 안전 위치 → 야생 등급 난수 → 라이벌 예약/위치 탐색 → 높이 검증 → 정예 예약 조회 → 기본 몸체 등록 → 조우/영입/귀환 기준점/정예/높이/진영/성장 초기화 → 등급/라이벌 계정 → 최종 위치 제한을 명시적으로 실행합니다. 이전 생성 함수 12개를 이어 부르던 캡처 체인은 남기지 않습니다.
- 인벤토리의 `rarityDeploy()`는 `UnitSpawn.createBody()`에서 몸체를 만든 뒤 인벤토리 레코드·등급·잠금·배치를 설치합니다. 이 경로는 야생 등급 추첨과 외부 지형 배치 단계를 거치지 않던 기존 계약을 유지합니다. 부활은 저장된 몸체·ID를 재사용하며 생성 난수를 새로 쓰지 않습니다.
- 체력의 생성 단계 변경은 `CombatHealth.initializeSpawn()`, 이동·높이·공격 시계는 기존 소유자의 실제 API를 사용합니다. 최종 등급이 덮어쓰는 중간 체력/성장 필드도 직렬화 키 순서와 참조 계약 때문에 원래 순서로 만듭니다. 새 capability, 밸런스, 저장 schema 또는 SDK 변경은 없습니다.
- `tests/spawn-pipeline.cjs`는 실제 HTML/내장 SDK에서 51종 × 6등급 × 4역할, 사람/NPC 인벤토리, 예약·밀집 배치 실패, 잠든 몸체·라이벌·상주 우두머리의 부활을 검사합니다. 240개 연속 공유 세계 틱에서 자연 재생, live/disk/prepared 복원, 패배/회복과 참가/재참가를 이어 검사합니다. 두 HTML 경로를 인자로 주면 전체 snapshot bytes·키 순서·참조 그래프·난수·효과 payload/ID/순서를 이전 실행물과 직접 비교합니다. Native 엔진 검사이며 브라우저/GPU 검증을 대신하지 않습니다.

### 시뮬레이션·렌더링·이동

- **WebGL은 필수입니다.** GPU 렌더링과 보간을 유지하고 성능 문제를 Canvas 2D 게임 렌더러로 대체해 해결하지 않습니다.
- 공개 월드 지형은 정적 WebGL vertex mesh cache를 사용합니다. 지형 도형을 Canvas2D 타일로 rasterize한 뒤 WebGL texture로 재업로드하는 전장 경로는 사용하지 않으며, Canvas2D는 미니맵·UI 같은 보조 표현에만 남깁니다.
- 시뮬레이션은 설정 가능한 고정 TPS를 사용합니다. 현재 기본은 **10 TPS**, 선택지는 **10 / 20 / 30 TPS**입니다. `CONFIG.sim.tickRate`와 `fixedStep`은 `bloomApplyTickRate()`를 통해 함께 맞춥니다. 세션 중 임의 가변 dt로 규칙을 진행하지 않습니다.
- `CONFIG.sim.renderTargetFPS = 60`은 보간 렌더링의 **목표**이며 실제 기기의 60 FPS 보장이 아닙니다. TPS와 FPS를 혼동하지 않습니다.
- 지속시간·쿨다운 등 게임 시간은 **밀리초 기준**으로 정의·저장합니다. SDK의 틱 번호와 입력 순서 카운터는 별도 개념이며, TPS 변경이 게임 내 지속시간을 바꾸지 않아야 합니다.
- 입력 → 결정론적 시뮬레이션 → 표현을 분리합니다. 메인 스레드의 SDK 세션이 권위 상태를 소유하며 입력·고정 틱·표현 경계를 분리합니다. Worker·메시지·delta 미러를 사용하지 않습니다. 렌더는 읽기 전용 descriptor와 별도 scalar pose를 사용하며 권위 상태를 수정하지 않습니다.
- 난수 상태, 타이머, 투사체·공격·군단·진행 상태처럼 미래 결과에 영향을 주는 값은 같은 저장·복원 계약에 포함합니다. 렌더 캐시·오디오·진단은 표현 영역입니다.
- 공간 질의와 이동은 **Spatial Grid 및 국소 회피**를 사용합니다. **NavMesh·A*를 도입하지 않습니다.** 다른 프로젝트의 전역 경로 탐색·캠페인·경제 규칙을 그대로 이식하지 않습니다.

### 컴포넌트와 공통 SDK

- 관계의 기준은 [공통 개발 규칙](https://github.com/byh-playground/bloom-reference/blob/main/rules/development.html)입니다. **IS-A**는 본질적인 타입 관계, **HAS-A**는 독립 부품의 소유권, **CAN-BE**는 선택적으로 가질 수 있는 능력입니다.
- 단순 capability는 상태와 로직을 함께 가진 Subclass Factory Mixin/Trait을 우선 검토합니다. 기존 객체를 중계하기만 하는 Mixin, 불필요한 MixinBase, component 배열과 깊은 wrapper 계층은 만들지 않습니다. 실제 독립 소비자가 없는 capability는 미리 쪼개지 않습니다.
- 모아의 `Rollable`은 방향·쿨다운·무적·진행률과 시작·이동·틱·초기화를 직접 소유합니다. 수동 입력과 자동 사냥은 같은 actor를 사용하고, 저장 경계에서만 기존 flat 필드·키 순서로 투영합니다. 복원·재접속은 검증 뒤 같은 객체 identity에 capability를 복구합니다.
- 실행·대기·예측·롤백·복구는 세션의 상태이며 CAN-BE의 뜻이 아닙니다. 배타적인 상태는 하나의 phase로, 독립적인 상태는 별도 flag로 표현합니다. 기능별로 별도 엔진이나 동기화 체계를 만들지 않습니다.
- [bloom-gamekit](https://github.com/byh-playground/bloom-gamekit)의 rollback-netcode 호환 번들 공개 계약을 사용합니다. 입력 순서·롤백·복구를 게임에 중복 구현하지 않습니다.
- HTML에는 필요한 공통 모듈과 SDK를 오프라인 실행용으로 포함합니다. 원본 SDK 동작은 c3173914519a78834360430071e7a125736d86d5와 호환됩니다. 배포 기준·각 ESM 원본과 포함 IIFE의 SHA-256은 `gamekit-lock.json`에서 검증합니다. 가변 main CDN import는 사용하지 않습니다.
- 공개 플레이는 최대 5명의 P2P 공유 세계를 사용합니다. 공개 릴레이 가용성·NAT 환경·실제 모바일 기기의 성능은 로컬 신호 fixture 검증과 별개입니다. 로컬 5탭 검증에서도 운영과 같은 500ms 신호 발행 간격을 유지하며 일반 게임 타이머로 새로고침·투사체 이동·피해를 확인합니다.

### 저장과 검증

- 디스크 저장은 완료된 시뮬레이션 경계에서 SDK와 같은 정규 snapshot 코덱을 필요할 때 호출합니다. 같은 경계의 반복 저장은 private bytes와 JSON 캐시를 재사용하며, 렌더 상태를 저장 원본으로 삼지 않습니다. SDK adapter.save()의 반환 bytes와 디스크 캐시는 서로 별칭을 공유하지 않습니다.
- 현재 백업은 `budmori-snapshot` JSON envelope와 base64 payload입니다. `BUDMORI_VERSION`의 `0.2.0`을 `productVersion`으로 기록하고 같은 `0.2` 호환군만 읽습니다. 길이·버전·메타데이터·체크섬을 검사하고 손상된 입력은 기존 상태와 저장을 보존하며 거부합니다. FNV 체크섬은 손상 감지용이며 보안 서명이 아닙니다.
- 단위 테스트 조합을 늘리는 것보다 **실제 게임 엔진을 사용하는 하나의 연속 E2E 흐름**을 중심으로 검증합니다. 이동·전투·성장·저장/복원·실패/회복·롤백 등 변경에 관련된 실제 경로를 이어 확인합니다.
- 게임/UI 변경의 실제 플레이와 시각 확인을 정적 검사로 대체하지 않습니다. 시험용 상태 주입, 모의 DOM, native Worker 검사와 실제 브라우저·기기 검사를 분명히 구별합니다.
- 통과·실패·미실행 범위를 기록하며, 미검증 결과를 Stable 또는 VALIDATED로 부르지 않습니다.

## 제품 버전과 저장 호환 정책

- 자동 부활은 이전 수동 부활 클라이언트와 결정론적 실행 결과가 달라집니다. 공개 방 혼합을 막기 위해 0.2 호환군을 사용하며, 기존 0.1 저장은 변경하지 않고 지원하지 않는 버전으로 안내합니다.
- 제품 버전의 단일 원본은 `BUDMORI_VERSION`이며 현재 **0.2.0**입니다. SemVer가 아닙니다. MAJOR는 제품 세대(0=베타, 1=정식), MINOR는 비호환 변경, PATCH는 호환 변경입니다.
- 디스크 envelope는 전체 `productVersion`을 기록합니다. 정규 capsule의 `compatibility`, `CONFIG.version`과 SDK simulationVersion의 호환군은 같은 원본에서 `0.2`로 파생합니다. 호환 PATCH끼리는 같은 정규 bytes와 체크섬을 만들어야 합니다. 별도 디스크 vN/게임 vN 카운터를 두지 않습니다. BLG3 코덱 표식과 외부 SDK 버전은 실제 독립 프로토콜이므로 그대로 둡니다.
- v63, 이전 disk v3/v4, 숫자 배열 payload, 틱 타이머/인구 변환은 지원하지 않습니다. 오래된 저장을 발견하면 “지원하지 않는 저장 버전”과 새 게임·다른 백업 경로를 보여 줍니다. 자동 저장·수동 저장·TPS 변경·페이지 종료는 읽지 못한 원본을 덮어쓰지 않습니다. 확인한 새 게임 또는 정상 백업 불러오기가 현재 저장을 교체합니다.
- 디스크 입력도 정규 코덱·메타데이터·체크섬·전체 그래프 검증과 detached 준비를 통과한 뒤에만 설치합니다. 준비/취소 중 기존 authority·세션·원본 bytes는 변경하지 않습니다.
- 군단 잠금은 inventory record의 `locked`만 소유합니다. 몸체의 `rarityLocked` 필드·getter·복원 binder는 없습니다.
- `tests/save-version-policy.cjs`는 실제 엔진/SDK로 과거 형식 거부, compatible patch 수용, 비호환 minor/major 거부, 저장 보호와 명시적 새 게임을 검사합니다. `npm run test:browser:save`는 실제 Chromium에서 안내·반복 취소·TPS·새로고침·새 게임·파일 import를 검사합니다.

## 작업과 리뷰

최초 실행물 등록 이후의 변경은 `codex/` 작업 브랜치에서 진행하고 `main` 대상 PR로 리뷰합니다. 관련 열린 PR과 기존 변경을 먼저 확인하고 다른 작업을 보존합니다. 병렬 수정은 상태 소유자·함수·공통 계약이 겹치는지도 확인합니다.

PR에는 변경 이유, 실제 검증 결과와 중요한 미검증 범위를 남깁니다. 사용자 지시 없이 머지하거나 공개 배포 설정을 변경하지 않습니다.

커밋 메시지는 한글로 작성합니다.

```text
[타입] 변경 내용 요약

- 필요한 변경 이유와 검증 내용
```

기본 타입: `[feature]`, `[bug-fix]`, `[refactor]`, `[performance]`, `[ui]`, `[balance]`, `[network]`, `[docs]`, `[test]`, `[chore]`. 최초 등록은 `[init]`을 사용합니다.

## 최초 등록 시점의 원본과 확인 범위

- 실행물: 기존 v63 HTML 원본, **1,268,858 bytes**
- SHA-256: `c31b02b717ea74f23378ed598a54cfd8102af1074ab1a3e49461d90893366751`
- 기존 검증에서 실제 엔진·Worker·포함 SDK를 사용한 저장/복원, 대기 입력, 손상 백업 거부, 지연 패킷 롤백 흐름을 확인했습니다. native Mesa 기반 렌더 검사도 수행했습니다.
- **실제 Android 기기와 실제 브라우저의 최종 통합 플레이는 미검증입니다.** 검증 환경의 브라우저 실행·파일 탐색 제한이 있었으며 native 검사를 기기 FPS·브라우저 저장·클립보드 검증으로 확대하지 않습니다.
- 이번 저장소 등록은 같은 원본의 전달이며 새 게임 동작·온라인 플레이·배포 검증을 의미하지 않습니다.

## 원본과 참고

- 생물·전투 데이터 출처: [RALLY FRONTIER · f9d4c28289d7b452a51b70d818fcb657eb4f4d47](https://github.com/byh-playground/rally-frontier/tree/f9d4c28289d7b452a51b70d818fcb657eb4f4d47)
- 공통 SDK: [rollback-netcode](https://github.com/byh-playground/rollback-netcode)
- 개발·리뷰·한글 커밋의 공통 운영은 [RALLY FRONTIER README](https://github.com/byh-playground/rally-frontier/blob/main/README.md)와 [rollback-netcode 작업 지침](https://github.com/byh-playground/rollback-netcode/blob/main/AGENTS.md)을 참고했습니다. 프로젝트별 구현·검증 방식은 위 버드모리 기준을 우선합니다.

## 공통 모듈 전환 범위

- input: ActionState와 DOM 입력 소유권, 클릭/더블탭/키보드 → 기존 SDK 명령 경계
- interpolation: 동일한 단조 receipt/frame 시계, 도착 시점 곡선 retarget, XYZ와 별개인 공격 타이머 reset, 재사용 pose
- rendering: 공통 WebGLDevice만 shader/resource/upload/draw/stencil을 소유합니다. 게임의 곡선/지형/아트/텍스트 atlas와 material은 게임에 남습니다. Canvas2D 전장 fallback은 없습니다.
- camera/hud: 동일한 40도 XYZ 투영과 카메라/앵커; 성장 줌·지형 역투영·체력 표현 정책은 게임 소유
- presentation-events: SDK 확정 이벤트만 한 번 전달합니다. speculative 사운드를 재생하지 않습니다.
- debug-tools: 유한 오류 ring·redaction·clipboard 공통 기능, 게임의 중단/진단 UI를 유지하며 같은 스레드에서 직접 보고
- rollback-netcode: 기존 완전한 snapshot bytes 및 replay/rollback/session/loop 계약 유지

현재 제품은 0.1.0에서 저장 호환성을 명시적으로 끊었습니다. 구버전 importer·migration·fallback은 없으며 원본 v63 fixture는 거부와 원본 보존을 검사합니다. 기존 저장 키는 미지원 저장을 감지하고 보호하기 위해 유지합니다.

## 개발 검증

`npm ci && npm test`는 실제 메인 스레드 런타임/엔진/포함 SDK의 연속 캠페인과 집중 보간 회귀를 검사합니다. `npx playwright install --with-deps chromium && npm run test:browser`는 실제 브라우저 WebGL·메인 스레드 SDK·DOM 입력·전투·저장·죽음/회복·오류 UI를 한 흐름으로 확인합니다. 테스트용 stopped-session fixture는 테스트 서버에서만 삽입되며 `index.html`에는 포함하지 않습니다.

전장 지형은 `ThemedTerrain`과 정적 WebGL mesh가 단일 렌더 경로를 소유합니다. legacy `TerrainHills` Canvas2D raster와 terrain texture upload 경로는 유지하지 않으며, Canvas2D는 sprite/text atlas·미니맵·UI 보조 렌더에만 사용합니다.

PR과 main push의 GitHub Actions는 비용을 제한하기 위해 `npm ci`, 검증기 구문 검사, 고정 gamekit·inline bundle 무결성 검사만 필수로 실행합니다. 실제 브라우저·5인 WebRTC·snapshot·benchmark 검증은 자동 PR 게이트가 아니며, 필요한 경우 Actions의 `workflow_dispatch`로 `Full game verification (manual)`을 실행합니다. 머지 전에는 변경 범위에 맞는 전체 검증을 로컬에서 실행하고 PR에 통과·실패·미실행 범위를 기록합니다. CI가 비싸다는 이유로 이 로컬 검증을 생략하거나 결과를 Stable/VALIDATED로 표시하지 않습니다.

Native V8/Canvas asset raster/GPU command sink 성능 표본은 CPU 제출 비용만 비교합니다. Chromium SwiftShader도 실제 휴대폰 GPU/FPS 검증을 대신하지 않습니다.

### WebGL 배치 재사용 회귀

정적 지형과 일반 sprite는 같은 배치 풀을 재사용합니다. 정적 배치도 생성할 때 빈 `textures` 배열을 소유해야 다음 프레임의 일반 배치로 안전하게 전환할 수 있습니다. 누락되면 `textures.length` 접근 실패 뒤 렌더 정리 단계가 `Renderer.endFrame: b.textures is not iterable`을 보고합니다. `save.load UNSUPPORTED_SAVE_VERSION`과 만료된 공개 복귀 포인터는 이 오류와 별개의 recoverable 진단입니다.

`npm run test:browser:webgl`은 실제 Chromium/SwiftShader에서 정적 배치 수 변화, static→normal→static 재사용, texture 슬롯 초과를 픽셀 색상으로 확인하고, 배치·배열 identity와 불필요한 GPU 재업로드도 검사합니다. 전체 게임 검증은 `npm run test:browser`와 `npm run test:browser:multiplayer`로 실행합니다. 후자는 `BUDMORI_TWO_PLAYER_SOAK_MS=120000` 환경 변수를 설정하면 두 플레이어가 참가한 뒤 실제 시계로 120초 동안 WebGL 프레임·시뮬레이션 진행·fatal 부재를 추가 검사합니다. 로컬 신호 fixture와 실제 WebRTC를 사용하며 공개 릴레이·물리 GPU 검증은 아닙니다.

## v64/v65 전환 당시 검증 결과

- 당시 gamekit source: `5c70abf56c092c00926b1614c599a70968eca3d6`; 배포: `444f51c4cb293268dc6e20ffbc40a9afe963a069`
- 실제 Chromium/SwiftShader + Blob Worker의 시작·WASD·Space·클릭/터치 구르기·메뉴 재개·전투·죽음/회복·저장/불러오기·오류 중단을 CI에서 검사합니다. 입력/복구 fixture는 수동 clock, 별도 전투 단계는 변경하지 않은 production setTimeout scheduler + RAF를 사용합니다.
- Native 연속 캠페인 96개 확인: 원본 v63 저장 bytes/향후 동일 입력 결과, 대기 명령, 손상 저장 거부, 실제 SDK 지연 패킷 rollback 정확 수렴을 포함합니다.
- 보간은 수신 당시 곡선에서 다시 연결합니다. 늦게 도착하는 미래 표본을 예측하지 않으며, 목표에 먼저 도달하면 다음 표본까지 대기합니다. 불규칙 수신의 속도 변화/대기는 남습니다. 공격/flash 새 단계는 XYZ와 별도로 즉시 반영하며 hitstop이 XYZ를 권위 위치로 튀게 하지 않습니다.
- 155 동료 native CPU 제출 비교는 `tests/performance-summary.json`에 기록합니다. 참고 runner `tests/native-render.cjs`는 추가로 `@napi-rs/canvas@0.2.000`이 필요합니다. 같은 원본 HTML을 인수로 실행해 비교하며, no-op GPU sink이므로 GPU 완료시간·실제 브라우저·휴대폰 FPS 측정이 아닙니다.
- main CI는 Pages 응답 전체 bytes의 SHA-256이 검사한 `index.html`과 같은지 배포 후 확인합니다. 실제 휴대폰/기기 GPU 검증은 별도입니다.

## v65 · 회복 후 화면 동기화 수정

회복 시 권위 세계를 복제하면서 내용이 같은 중첩 객체도 새 identity를 갖습니다. 이전 Worker delta가 새 identity 표시는 보내면서 값은 생략하여, 화면 쪽에서 라이벌의 능력 데이터 등 일부 필드를 지우는 문제가 있었습니다. 이제 교체 identity와 전체 값을 함께 보내고 함께 적용합니다. 라이벌을 숨기거나 누락된 능력을 임의 값으로 대체하지 않습니다.

`tests/recovery-mirror.cjs`는 실제20TPS Worker 전투 사망/회복 두 번, 저장 복원, 새 게임 및 내용이 동일한 객체/배열 교체를 연속 검사합니다. 실제 브라우저 검증에는720×1282 backing store/DPR3 모바일 크기와20TPS, 라이벌이 화면에 보이는 회복/불러오기/동일 ID의 다른 역할 재사용을 추가했습니다. 사용자 원본 저장을 받은 것은 아니므로 같은 오류 경계를 재구성한 검증이며, 실제 Android 기기 검증을 의미하지 않습니다. 저장 schema·진행·게임 규칙은 변경하지 않습니다.

## v66 · 단일 스레드 시뮬레이션

현재 고정 SDK source: `059d6babf344efbf54867a342fecdd64f70a6a86`; dist: `17ef4c9340c8d8760ed8f648f1358430dca9c71f`. `BloomSimulation.sdkCommit`과 진단 화면도 같은 source commit을 표시하며 실제 포함 번들은 `gamekit-lock.json`으로 검증합니다.

- Worker 생성, 소스 복제, postMessage 왕복, 그래프 delta 직렬화 및 화면 미러를 제거했습니다. HTML 한 파일의 오프라인 실행은 유지합니다.
- 고정 TPS 시뮬레이션은 SDK `createLoop`의 `backlogPolicy: 'retain'`을 사용하고, 렌더는 별도 RAF에서 scalar pose를 보간합니다. 짧은 지연만 보존하며 `maxBacklogTicks`를 넘는 lifecycle clock gap은 backlog를 폐기하고 현재 시각을 새 기준으로 삼습니다. 온라인 복귀는 stale 클라이언트가 월드를 덮지 않고 canonical snapshot/resync를 사용합니다. 일시정지·재개는 타이밍을 재설정하여 멈춘 시간을 따라잡지 않습니다.
- 실행 중 대기 명령이 있는 저장 요청은 다음 예정 SDK 경계를 기다립니다. 일시정지 중 대기 명령은 게임 시간을 진행하지 않는 suspended SDK 경계에서 확정합니다. 현재는 아래 락스텝 구성처럼 완료 경계에서 필요할 때 snapshot을 캡처합니다.
- 시뮬레이션과 렌더가 CPU를 공유하므로 Worker 제거가 모든 기기에서 더 빠르다는 보장은 없습니다. 실제 Chromium/SwiftShader 전후 벤치마크는 같은 seed·군단·TPS를 사용하고 tick, snapshot, RAF, 입력 지연을 별도 기록합니다. Native V8 결과는 기기 FPS 측정이 아닙니다.

### SDK 원본 검증과 오프라인 실행

싱글 게임 실행에는 네트워크와 npm이 필요하지 않습니다. 공개 P2P 플레이에는 네트워크가 필요합니다. 개발·SDK 갱신 단계에서만 고정 버전 esbuild와 공식 upstream 저장소를 사용합니다. `vendor/upstream`은 정확한 dist/source Git 객체와 manifest/ESM 캐시입니다. `npm test`는 Git 객체 ID, manifest·각 bundle SHA-256과 ESM→IIFE 재생성 bytes를 검증합니다. 변경된 bundle·manifest·source pin을 거부하는 손상 fixture도 검사합니다.

SDK를 갱신할 때는 새 exact source/dist와 lock 및 HTML을 함께 갱신하고 `npm run verify:upstream`으로 공식 저장소에서 해당 불변 객체를 받아 검증합니다. CI에서도 이 검증을 수행합니다. `index.html`은 외부 CDN이나 이 개발용 캐시에 실행 의존성을 갖지 않습니다.


## 전투 책임과 상태 구성

- Is-a는 종·진영·리더의 본질적인 정체성입니다. `UnitCombatDefinition`은 각 종이 소유하는 기본 공격, 투사체 수정, 발사 후 동작, 근접 충격, 피격 감소 capability를 한 번 구성합니다. 중앙 공격·피격 함수에 종 이름 조건문을 누적하지 않습니다.
- Has-a는 그 capability와 객체가 소유하는 데이터입니다. 함수는 불변 정의에만 두고, 유닛의 `pendingMelee`, `attackController`, 배치·상태 데이터는 기존 snapshot 계약으로 저장·복원합니다. 전투 개편은 저장 키·schema·엔티티 ID·속성 순서를 바꾸지 않습니다.
- CAN-BE는 도약·발사 후 동작·피해 감소 등의 선택 능력입니다. 준비·실행·회복·취소는 그 능력의 배타적인 실행 상태입니다. 공격 패턴은 `begin`·`execute`·`tick`·`finish`·`cancel` 계약을 사용하며 도약 정리는 해당 패턴이 소유합니다.
- `attack`, `damage`, `damageValue`, `updateUnit`은 재할당하지 않는 진입점입니다. 피해는 공간 문맥 → 방어/HP/죽음 → 체력 표현 → 반격 → 피격 표현 → 희귀도 표현 → 확정 이벤트 순서로 처리합니다. 중첩 피해의 공간 문맥은 `try/finally`로 복구합니다.
- 유닛 틱은 화면 사냥 경계를 앞뒤에 적용하고 상주 보스·경쟁 리더/군단·일반/특수기 중 한 행동 소유자만 실행합니다. 잠든 야생, 특수기 시작·실행·회복의 상태/외력 호출 순서는 유지합니다. 과거 직사각형 지역·영입 예약·성장 흡혈의 더 이상 실행되지 않는 전투 wrapper는 제거했습니다.
- 수치·공격 순서·난수 소비·투사체 발사 시점의 값·피격 귀속·정규 snapshot bytes는 기존 실행물과 직접 비교합니다. 구조 검사는 전역 전투 함수 덮어쓰기와 중앙 종 분기의 재도입을 막습니다. Native 결과는 실제 브라우저·모바일 성능 검증을 대신하지 않습니다.


전투 비교 기준은 `combat-baseline.json`의 고정 런타임 커밋입니다. 전체 Git 이력을 받은 뒤 `npm test`를 실행하면 해당 HTML을 로컬에서 추출하고 SHA-256을 검사합니다. 이력이 없는 작업 환경에서는 같은 bytes의 HTML 경로를 `BLOOM_COMBAT_BASELINE`에 지정할 수 있습니다. 기존 연속 캠페인의 최종 백업을 두 실행물에 읽어 들여 같은 세계를 이어 진행하고 매 틱 정규 저장 bytes와 전체 표현 이벤트를 비교합니다. 별도 유닛 조합 행렬을 만들지 않습니다.

### 전투 구성 변경의 검증 범위

- 고정 런타임 기준: `bf764fa8249751e28195be9d814334567fe3020c`, HTML SHA-256 `d0218169813c6ec591750065f3abf005230fb6db975a5aa5091bc9cabb3c2d1a`.
- 후보 HTML SHA-256: `517dab4424f4bb08d9108f2d11da68952373db012183784a1a2fcbfc9a26e098`.
- 연속 캠페인 97개 확인. 실제 캠페인 백업의 세계 시간 10.8초부터 이어서 630 SDK 틱과 명시한 전투 fixture를 실행하여 정규 bytes 638회·전체 표현 이벤트 642회 일치를 검사했습니다. 과거 병종 capability, 방패/구르기/진영 경계, 치유·영입, 특수기 6종 완료·취소, 사망 폭발, 경쟁 군단, 상주 보스 씨앗 정리를 포함합니다.
- Native 실제 엔진/SDK, 동일 seed·객체 수에서 3회 번갈아 실행한 틱 p50 중앙값(ms): 10명/10TPS `0.960 → 1.046`, 155명/20TPS `5.649 → 5.740`, 1000명/30TPS `42.786 → 43.671`. 1000명 p95는 `64.960 → 103.788`로 악화된 표본을 그대로 남겼습니다.
- 호스트 부하 영향을 줄이기 위해 같은 프로세스의 두 세계를 매 틱 교대로 실행한 1000명 추가 표본(각 200틱)은 p50 `46.583 → 48.085`, p95 `102.161 → 98.161`, p99 `215.443 → 234.343`ms였습니다. 모든 비교의 최종 권위 hash가 같았습니다. 일관된 속도 향상이나 성능 무회귀를 단정하지 않습니다. 1000명/30TPS는 양쪽 모두 틱 예산을 넘습니다.
- Native 아트 raster/CPU draw 제출 p50 중앙값은 `9.265 → 8.940`ms, p95 `29.778 → 30.247`ms입니다. GPU 완료시간이나 실제 기기 FPS가 아닙니다.
- V8 16KiB heap sampling(수거된 객체 포함)으로 측정한 155명/20TPS 할당 추정 중앙값은 틱당 `1,744,251 → 1,739,501`bytes입니다. 정확한 할당 카운터가 아니며 profiler 자체 비용을 포함합니다.
- 원본 표본은 `tests/combat-performance.json`, `tests/combat-paired-timing.json`, `tests/combat-allocation-results.json`에 보관합니다. 이 구성 변경은 공격·피해·유닛 턴의 책임 분리에 한정하며 게임 전체의 모든 전역 시스템을 개편했다는 뜻은 아닙니다. 정확한 공개 후보의 Chromium/WebGL CI는 별도 최종 gate입니다.


## 락스텝 기본값과 롤백 선택

- `CONFIG.netcode`가 다음 세션의 설정 원본입니다. 기본은 `{mode:'lockstep',checksumInterval:30}`이며, `mode:'rollback'`으로 바꾸면 기존 예측·롤백 경로를 사용합니다. 설정 변경은 새 세션을 만드는 초기화·새 게임·정상 불러오기·TPS 변경 경계에서 적용됩니다. 실행 중인 세션의 mode나 profile을 수정하지 않습니다. 별도 게임 엔진·Worker·설정 저장 schema는 추가하지 않습니다.
- 락스텝은 모든 피어의 해당 틱 입력이 도착해야 실행합니다. 예측 입력·오입력 롤백 재실행·매 틱 롤백 snapshot은 없습니다. 싱글 플레이는 입력 지연 0을 유지하고 공개 세계는 공통 세션 설정을 사용합니다. 선택 TPS와 별도 RAF/WebGL 보간도 그대로입니다.
- 완전한 정규 상태는 초기 세션, 30틱마다의 체크섬 checkpoint, 명시적인 hash/replay/디스크 저장 요청에서 직렬화합니다. 복구는 보관된 checkpoint와 이후 확정 입력으로 현재 상태를 재구성합니다. `checksumInterval`은 양수이며 현재 락스텝 입력 이력 32틱 이내여야 합니다. 주기적인 큰 snapshot 비용까지 없어지는 것은 아닙니다.
- 디스크 캐시는 실제 저장/백업을 요청한 경계에만 생깁니다. SDK의 adapter.save() 호출마다 디스크용 bytes를 따로 복사하지 않습니다. 미래 결과에 영향을 주는 전투 구성·진행·공간 캐시·RNG·타이머는 기존 코덱으로 그대로 보존하며 저장 키·schema·정규 bytes를 바꾸지 않습니다.
- 검증용 네트워크 피어도 모드·TPS·입력 지연·체크섬 주기가 맞아야 연결됩니다. 버전/설정 불일치 시 양쪽 새로고침과 동일 설정 안내를 진단창에 표시합니다. 이 설정 자체와 공개 참가자 admission/bootstrap 구성은 별도 책임입니다.
- 연속 캠페인은 기존 롤백 지연 패킷 구간을 명시적 rollback 설정으로 유지하고, 같은 캠페인 저장에서 락스텝 대기·확정 명령·예측 0·주기 사이의 hash/replay/복구·반복 모드 전환을 이어 검사합니다. 실제 Chromium E2E도 저장/전투/회복 흐름 속에서 두 모드의 반복 전환과 락스텝 매 틱 직렬화 제거를 확인합니다.
- `npm run test:benchmark:modes`는 같은 seed·객체 수·TPS·입력으로 두 모드를 비교합니다. Native 실행은 한 프로세스에서 틱마다 순서를 번갈아 측정하며 10/155/1000 동료를 포함합니다. Chromium 실행은 155 동료에서 실제 WebGL을 사용하되 비용 분리를 위해 수동 SDK 경계의 동일 입력을 사용합니다. 둘 다 advance·simulation step·snapshot을 분리하고, 브라우저는 render CPU 제출 비용도 따로 기록합니다. 디스크 cache 복사 횟수/bytes만 측정하며 SDK 내부 복사나 전체 JS 할당량으로 해석하지 않습니다. 생성자·워밍업·최종 hash 검증 캡처와 런타임 디스크 자동 저장은 측정 구간에서 제외합니다. 실제 기기 FPS·GPU 완료시간·1000 동료 30TPS 보장은 하지 않습니다.

## 공유 세계 · 공개 PvP 세션

싱글과 공개 플레이는 같은 `WorldSimulation`, `PlayerController`, `PlayerCombat`, `PlayerCommands`, snapshot adapter와 SDK loop를 사용합니다. 사람을 AI 라이벌로 바꾸거나 `state.mother`를 참가자마다 교체하지 않습니다. 세계 시간·병력·투사체·재생은 한 번만 진행하고, 각 참가자는 리더·진행·인벤토리·이동/AUTO·사냥 화면 범위를 소유합니다. 명령 소유자는 SDK 입력 프레임에서 정하며 명령 payload로 지정할 수 없습니다. `localPlayerId`는 입력 장치와 `WorldView` 표시 선택에만 사용합니다.

- `CONFIG.session.mode`: `local` / `online`. `persistence`는 각각 `solo` / `none`입니다. 동기화 방식은 별도 `CONFIG.netcode` 설정이며 공개 세계는 lockstep을 사용합니다.
- 게임 시작은 빈 공개 세계에 자동 합류하거나 새 세계를 만듭니다. 한 명으로 즉시 시작하고 최대 5명까지 이후 합류합니다. 싱글은 시작 화면의 별도 버튼으로 선택합니다.
- 공개 세계의 새 참가자는 새 모아로 시작합니다. 기존 싱글 저장을 가져오거나 덮어쓰지 않습니다. 잠깐 끊긴 뒤 같은 세계에 복귀하면 그 세계의 기존 모아·군단·진행을 복원합니다.
- 공개 방 검색/좌석 예약은 기존 공개 Nostr relay, 시뮬레이션 입력·bootstrap은 WebRTC P2P입니다. 별도 운영 서버·DB는 없습니다. 마지막 참가자가 떠난 세계는 종료되며 재접속 식별자만으로 세계를 재생성하지 않습니다.
- 연결 단절 감지 후 복귀 유예 설정은 30초이며 이 동안 세계가 멈춥니다. 인증된 복귀를 시작한 뒤 상태 동기화에는 별도의 30초 전체 membership-transition 제한 (mesh 연결·snapshot/replay·commit 포함)이 적용됩니다. 화면에 남은 대기 시간을 표시하며 메뉴의 나가기/취소는 계속 사용할 수 있습니다. 기한 내 복귀하지 않으면 분리된 세계를 계속 진행하지 않고 연결을 종료합니다. 자동 무한 재시도는 하지 않습니다.
- 새로고침 복귀를 위해 SDK가 이 탭의 `sessionStorage`에 제한된 방 복귀 정보를 보관합니다. 수명은 기본 30분이며 새 판/명시적인 나가기는 이를 폐기합니다. 서명된 동일 세션의 자격 증명을 검증하고, 복귀 비밀은 게임 snapshot/replay/진단에 포함하지 않습니다.
- 온라인 입력 버퍼는 `onlineInputBufferMs: 100`을 현재 TPS의 정수 틱으로 올림합니다. 실제 값은 화면에 표시합니다. 싱글은 0틱을 유지합니다. 지연·합류·복구 중 기다림은 정상 상태이며 추측 입력으로 세계를 진행하지 않습니다.
- 메뉴와 사망은 공개 세계를 정지하지 않습니다. 해당 참가자의 입력만 중립이 됩니다. 사망은 그 참가자의 공격/예약을 정리하고, 회복은 다른 참가자·야생의 체력·투사체를 초기화하지 않습니다.
- 참가자 변경은 확정된 SDK epoch 경계에 한 번 적용합니다. 세계와 전체 tick은 유지합니다. 정상 코디네이터 퇴장은 합의된 후임에게 인계하며, 분할/갑작스러운 단절은 유예 뒤 안전하게 중단합니다.

### 맵과 관심 영역

하나의 정의에서 싱글 3600×3600, 공개 7200×7200을 선택합니다. 지형·미니맵·캠프·우두머리 서식지도 같은 배율에서 파생됩니다. 공개 시작 구역 다섯 곳은 분리되어 있고, 가까운 시작 구역으로부터의 거리로 초반 야생 등급을 정합니다. 입장 위치는 seed와 참가자 ID에 따라 결정하며 다른 리더/지형/우두머리와의 안전 거리를 확인합니다.

야생 재생은 살아 있는 참가자 관심 영역의 합집합을 사용합니다. 중복 셀은 한 번만 세고, 어느 참가자의 화면에서든 보이는 곳에는 생성하지 않습니다. 모든 참가자에게서 멀어진 일반 야생만 회수합니다. 소유 군단·라이벌·우두머리에는 이 회수 규칙을 적용하지 않으며, 군단 재미를 제한하는 새 인구 상한은 추가하지 않습니다. 배경 texture는 작은 타일로 유지하여 커진 맵이 기기 texture 한도를 넘지 않게 합니다.

### 저장 호환성과 검증 범위

공유 정규 상태 kind는 `budmori-world`, 싱글 디스크 envelope kind는 `budmori-snapshot`입니다. 두 경계는 같은 제품 버전 원본에서 호환군을 파생하며 major/minor가 같을 때만 호환됩니다. 구버전 저장은 변환하지 않고 거부합니다. 새 참가자는 충돌하지 않는 별도 entity/account ID를 받습니다. 형식이 바뀐 뒤 예전 전체 bytes와 같다고 주장하지 않습니다. 새 형식끼리의 복원·다음 입력·멤버십 재생은 완전한 정규 bytes로 비교합니다.

개발 검증은 기존 싱글의 연속 저장/전투/회복 경로와 `tests/shared-world.cjs`, `tests/shared-validation.cjs`, `tests/shared-presentation.cjs`를 사용합니다. 실제 게임/SDK와 메모리 패킷 연결을 쓰는 native 검사는 실제 브라우저·WebGL·공개 relay·WebRTC 검사를 대신하지 않습니다. 개발 SDK bundle을 시험할 때는 `--sdk=/absolute/dist/rollback-netcode.js`를 줄 수 있으며, 시험 realm에서만 교체합니다. 최종 배포는 승인된 exact SDK source/dist pin과 실제 브라우저 CI를 별도로 확인해야 합니다.

### 고부하 측정 한계

Native V8 CPU-only 표본에서 싱글 1000 병력의 simulation p50은 이전 실행물 약19.0ms, 공유 실행물 약18.6ms였습니다. 별도 순차 표본이므로 속도 개선을 보장하지 않습니다. 공개 5명×155 병력은 약17ms, 5명×1000은 약127ms로 후자는10TPS의100ms 예산도 넘었습니다. 군단 상한을 낮춰 숨기지 않습니다. 주된 비용은 근접 충돌 탐색·이동·공간 동기화였습니다.

큰 상태의 직렬화와 설치는 아직 동기 작업입니다. 게시된 SDK에서 5명×1000 초기 checkpoint/전송은 약5MB로 허용되었으나, 받는 클라이언트의 검증·설치·재확인은 약2.4초였습니다. 4명×1000 뒤 새 다섯 번째 참가자의 입장에서는 기존 참가자의 약4MB 상태 staging(save/apply/save/restore)이 약677ms, commit load가 약570ms였습니다. 이는 실제 인터넷 방의 총 입장 시간이나 휴대폰 측정이 아니며, 기존 참가자에게도 큰 입장 정지가 생길 수 있음을 보여 줍니다. `maxCatchupSteps`는 이 직렬화/설치 시간을 분할하지 않습니다.

공개 세션은 snapshot8MiB, sparse snapshot-history64MiB, bootstrap transfer8MiB의 byte budget을 사용합니다.64MiB는 미리 할당한 입력 버퍼가 아닌 보관 이력의 상한입니다. 기존 싱글 rollback 이력 설정은 유지합니다. `tests/shared-large-bootstrap.cjs`가 큰 실제 상태로 SDK budget과 완전한 bytes 복원을 검사하고, `test:benchmark:shared`가 5명 부하를 별도로 표시합니다.

## 대규모 snapshot 준비와 결정론적 공간 질의

- 게임 adapter는 `prepareSnapshot`/`loadPreparedSnapshot`으로 외부 snapshot을 한 번 준비한 뒤 단일 사용 토큰으로 설치합니다. 토큰은 bytes와 별도로 보관되고 틱·epoch·버전·TPS·seed·참가자 context에 묶입니다. bytes 변경, 토큰 재사용, context 누락이나 변경은 허용하지 않습니다.
- 정규 graph 형식뿐 아니라 **실제 설치 후 다시 저장되는 authority 형식**까지 확인합니다. 공간 캐시 압축·순서·중복, wrapper 필드와 참조 별칭이 달라지는 입력은 기존 세계를 보존하며 거부합니다. 솔로 이전 저장의 마이그레이션 경로는 유지합니다.
- `saveJob`/`prepareSnapshotJob`/`prepareMembershipJob`은 8 ms 목표의 협력형 pulse를 제공합니다. 캡처·복사 동안 SDK가 하나의 확정 경계를 동결하며, 중간 틱을 섞지 않습니다. 참가자 추가는 별도 소유 그래프에서 준비하고 commit에서 설치합니다. 취소나 실패는 살아 있는 세계를 변경하지 않습니다. Worker는 사용하지 않습니다.
- pulse 예산은 협력형 목표입니다. GC·브라우저 스케줄링·네이티브 메모리 할당까지 강제 선점하는 하드 실시간 보장은 아닙니다. 기존 동기 API와 초기 체크포인트처럼 아직 동기 경로가 필요한 작업도 별도로 측정합니다.
- RALLY FRONTIER는 근방/동맹 질의 grid와 비동맹 최종 겹침 해소용 adaptive SAP를 함께 사용합니다. 이번 숫자 셀 조회·공간/뷰포트 파생 계산 수정은 Budmori의 기존 grid 경로를 최적화한 것이며, Rally adaptive SAP 자체를 측정하거나 대체한 결과가 아닙니다. Map의 snapshot 삽입 순서, center-first 셀 방문 순서, 같은 셀의 객체 순서와 기존 이웃 cutoff를 보존합니다. 군단 상한·AI 빈도·충돌·그래픽 표현은 줄이지 않습니다. SAP로 일괄 교체하지 않습니다.
- `npm test`는 토큰·취소·악성 정규화·동기/협력형 codec·공간 질의 순서와 동일 입력의 canonical bytes를 검사합니다. `npm run test:browser:multiplayer`는 실제 다섯 탭 WebRTC/WebGL E2E, `npm run test:browser:snapshots`는 렌더/전송을 제외한 실제 Chromium snapshot pulse와 event-loop 양보를 측정합니다. native CPU 결과를 기기 FPS로 해석하지 않습니다.

### 이번 변경의 native 측정

같은 seed·입력·5명×군단1000명 fixture를 기준 원본과 최종 후보에서 순차 실행했습니다. 실제 게임 엔진의 CPU 측정이며 기기 FPS가 아닙니다. 원본과 후보 SHA·세부 표본은 `tests/performance-prepared-native.json`에 있습니다.

- 시뮬레이션 틱 p50: 126.2 → 90.1 ms; p95: 164.1 → 102.4 ms. p95 80 ms 목표에는 아직 미달입니다.
- 처음 checkpoint를 받아 설치하는 CPU 비용: 2353 → 877 ms. 후보는 102 pulse로 나뉘었고 가장 긴 pulse는 32.0 ms였습니다.
- 기존4명×군단1000명 세계의 다음 참가자 준비: 698 → 396 ms; commit 설치: 456 → 0.51 ms. 준비+설치 합계는 약 1154 → 396.5 ms로 약 66% 줄어 절반 목표를 충족했습니다. 준비만 따로 보면 약 43% 감소입니다. 협력형 준비의 가장 긴 pulse는 21.5 ms였습니다.
- 일반 동기 snapshot 캡처는 여전히 별도 비용이 있습니다. 5×1000 표본 p50은 138.5 → 120.9 ms입니다. 8 ms pulse 목표나 모든 작업의 50 ms 상한을 보장하지 않습니다.
- 별도 정확성 수정: 소유자가 죽을 때 일반 공격 controller를 빈 패턴의 recovery 상태로 바꾸지 않습니다. 활성 특수기는 계속 정상 취소합니다. 원본의 밀집 전투 snapshot 실패를 최소 재현하고, 사망 저장/복원·회복 회귀를 추가했습니다. 공간 최적화와 이 수정의 효과를 섞지 않도록 밀집 비교에는 동일 guard를 기준 원본에도 적용할 수 있습니다.


## 공통 개발 규칙 리팩터링 · 실행 소유권과 종료 경계

현재 0.1.0은 실행 소유권 정리에 이어 실제 능력·도메인 상태와 생성·복원 경계를 정리합니다. 1~5인 모두 같은 시뮬레이션을 사용하며, 게임 수치와 전투 결과는 유지합니다. 저장 형식은 의도적으로 비호환이며 이전 저장 이관 경로를 남기지 않습니다.

- **단일 시뮬레이션:** 전역 `step` 본체와 재정의 총 16개, 과거 feature 객체의 `step` 캡처 14곳을 제거했습니다. SDK adapter → `bloomRunTick` → `WorldSimulation.step`만 게임 틱을 진행합니다. 1인/최대 5인 모두 같은 경로입니다. 과거 projectile loop와 RAF 기반 SDK driver를 fallback으로 보존하지 않습니다.
- **런타임 소유권:** `bloomMainRuntime()`은 같은 owner를 반환합니다. 실행 phase와 UI phase는 서로 다른 실제 생명주기이며 각각 배타적인 값입니다. 타이머는 `driver`, 디스크 보호·캐시·대기 요청은 `persistence`, UI 구독은 `ui`가 소유합니다. 시간 값 `driver.nextPulseAtMs`의 단위를 명시합니다.
- **공개 세션 소유권:** `lifecycle`, `connection`, `reconnect`, `soloReturn`, `presentation`이 각자의 상태를 소유합니다. 비동기 발견/탈퇴는 generation으로 폐기된 작업을 구분하며, 이전 세션의 늦은 이벤트는 새 세션을 바꾸지 않습니다. 바인딩은 멱등적이며 listener와 label을 함께 해제합니다.
- **명시적 UI 초기화:** 실제로 실행되던 46개 boot wrapper를 `GameUI.mount()`의 순서가 보이는 호출로 교체했습니다. 기능별 초기화·debug API 공개 함수는 해당 기능 곁에 두고, 예전 boot를 캡처하거나 중계하지 않습니다. 과거 저장 이관 분기는 제거했습니다.
- **발신자 소유 신호:** `PublicSession.onChanged`는 세션이 소유하는 읽기 전용 구독 API입니다. phase·참가자·재연결 상태의 불변 snapshot을 발행하고 UI는 구독을 해제합니다. subscriber는 phase를 emit하거나 내부 연결 상태를 직접 변경할 수 없습니다. 권위 SIM의 확정 효과 journal은 별개로 유지합니다.
- **종료:** 사용자의 정상 나가기는 SDK 합의를 기다립니다. 최종 runtime 종료는 발견 작업·room·RAF·DOM/입력 구독·observer·WebGL·audio·journal·대기 저장을 정리합니다. reload용 SDK resume 정보는 보존합니다. 종료한 owner의 reset/load/새 세션 설치가 다시 자원을 만들거나 저장을 덮어쓰지 못하게 하며 `boot()`로 UI를 중복 등록하지 않습니다.
- **참가자 소유권 수정:** 기본/보조 공격·회복·방어·연쇄·공성·공중 적중 등의 개인 통계와 능력 modifier가 실제 행동 주체/방어자의 값을 사용합니다. NPC 행동은 첫 참가자의 통계로 더해지지 않습니다. 이 수정은 기존 결과와 달라지는 범위를 명시한 별도 commit입니다.
- **저장·SDK:** 실제 런타임의 계층형 상태를 그대로 저장합니다. 옛 flat 필드, getter 별칭, 속성 순서 호환표와 controller graph 치환은 제거했습니다. SDK pin과 공개 재접속 핫픽스는 유지합니다. 제품 버전/호환 정책은 위 0.1.0 항목을 따릅니다.
- **실제 능력:** `MoaActor`는 `Rollable`을 실제로 합성합니다. 구르기 상태와 시작·이동·종료 로직은 능력이 소유하며, 기본 공격은 `primaryAttack`이 소유합니다. 각 상태는 저장 가능한 plain record이며 동작만 공유합니다.
- **컴포넌트:** 이동/전개, 공격 타이머/원점, AI 기억, 충격/접촉/새싹/공간 체크포인트를 각 소유 상태로 묶었습니다. 초기화와 복원에서 같은 형식을 사용하며 옛 이름으로 변환하지 않습니다.
- **생성·도메인:** `WorldInitialization`과 `UnitSpawn`이 생성 순서를 명시합니다. 전투·보상·사망·퇴장 사건은 발신 주체가 소유하고 표현은 확정 journal을 구독합니다. 덮어쓰여 실행되지 않던 reset/load/spawn/death 체인과 유료 성장 호환 명령은 제거합니다.

### 이번 변경의 검증

기존 캠페인에 종료·재바인딩 회귀만 추가하며 별도 게임 구현이나 테스트별 규칙을 만들지 않습니다. 단일 브라우저 검사는 중복 boot/owner 접근, 최종 close 후 UI와 WebGL 구독 해제를 포함합니다. PR의 exact head에서 전체 Node 캠페인, 단일 WebGL/모바일 크기, 5탭 WebRTC 합류·재연결, 준비 snapshot 브라우저 측정, 기존 mode 비교를 통과해야 머지합니다. 로컬 Native 검사와 실제 브라우저 CI 결과는 구분합니다.

Native 전후 보조 측정은 `tests/refactor-performance.json`에 기록합니다. 동일 seed·155 동료·20 TPS에서 30 warmup 뒤 200틱을 번갈아 실행했고, 표본 정규 bytes는 일치했습니다. p50 1.501→1.514ms, p95 2.638→2.557ms로 이번 표본에는 뚜렷한 비용 증가가 없었습니다. 이는 공유 heap/JIT의 Native CPU 표본이며 브라우저·네트워크·GPU·기기 FPS 보장이 아닙니다.

### Health, primary attacks, and lifecycle ownership

`CombatHealth` owns distinct damage, healing, ratio-preserving maximum-health growth, grade rebuilding, defeat, revival, and resident regeneration operations. Ratio growth does not count as healing, and resident regeneration keeps its existing silent behavior. Synchronous owner-local occurrence subscriptions run deterministic death/reward/camp consequences in their original order; presentation subscribers enqueue the existing confirmed-tick journal payloads.

Human leaders are real `MoaActor` instances. Their intrinsic primary attack owns pending windup, cooldown, target, pose, attack progression, and firing. `primaryAttack` is an enumerable plain record with nested cooldown and pose clocks. The retired `pendingMoa`, `moaCooldown`, `moaTarget`, and leader `attackPose` fields are not retained. NPC rival attacks retain their distinct existing rules. The input controller does not write primary attack internals.

`PlayerLifecycle`, `UnitLifecycle`, and `ProjectileLifecycle` distinguish defeat, inventory detach, recovery, and membership leave. They deliberately retain the existing different cancellation and disposal policies. Membership delegates leave to the lifecycle owner. Unreachable historical `die`, `defeat`, `recover`, and `updateMoa` implementations and captured continuations are removed; public lifecycle adapters remain; obsolete compatibility command shapes are rejected.

`node tests/health-lifecycle-ownership.cjs` checks independent human attacks, native owned state, health/revival policy, lifecycle cleanup, subscription disposal, confirmed-once replay, and reserved method/state collisions through synchronous and cooperative snapshot preparation. Use the test-only semantic oracle across incompatible artifacts; exact canonical bytes remain required for current-format restore and replay. `tests/unit-update-parity.cjs` likewise uses the actual final death path; its retired `core.die` test hook is not retained as gameplay. The historical direct dead-attacker damage probe uses the still-active area-damage capability.

### 공개 세션 회귀 검증

- 투사체는 지면이 아닌 발사 주체의 몸체 높이에서 출발하며 조준·장애물 검사도 같은 높이 규칙을 사용합니다. 기존 명시적 시작 높이와 곡사 궤적은 유지합니다.
- 공개 통신 호환 식별자는 제품 호환 계열에서 파생됩니다. 이전 공개 세션과 저장 형식은 지원하지 않으며, 이전 저장을 자동 삭제하지 않고 새 게임 선택을 안내합니다.
- 실패 화면의 진단 정보에는 최근 연결 단계와 구체적인 실패 이유가 포함됩니다. 신호 payload·방 식별자·접속 credential은 수집하지 않습니다. 실패했다고 진행 정보를 자동 삭제하거나 다른 세계로 바꾸지 않습니다.

- 공개 transport 연결 예산은 20초, 전체 membership 전환 예산은 30초입니다. 기존 15초 총 전환 제한은 transport 예산보다 짧았으므로 이를 정렬하고 상태 복구 여유 10초를 둡니다. 기한을 넘기면 SDK가 여전히 실패 종료하며 무한 연장은 하지 않습니다.

### Auxiliary timing and pre-admission bootstrap

Auxiliary weapons store one deadline per weapon (`auxScheduleMs`). `sampledAtMs` marks the completed update observed by sprout presentation before the next combat tick. `weaponCooldownSeconds` derives its display without mutation; no `auxCooldowns`, rival `aux`, or `displaySeconds` mirror is saved or imported. Current cadence cards change future launch intervals through `weaponStats`; they do not rescale an already scheduled deadline. The overwritten paid-haste wrapper is removed rather than replaced with an unused rescale API.

Before membership admission, `WorldPlayers` explicitly queries the freshly initialized bootstrap actor. This supports current initialization and is not an old-save importer. The 0.1.0 save-break policy is unchanged. `tests/auxiliary-authority.cjs` compares real engine continuation, seven weapon families, cadence upgrades, sprout values, and same-build snapshot restore at 10/20/30 TPS. An optional second HTML argument is a test-only semantic oracle.
