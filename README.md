# Budmori.io · 버드모리

블룸 세계관에서 모아와 동료들을 키우며 탐험하고 싸우는 브라우저 게임입니다. 현재 실행물은 **오프라인 싱글 플레이**를 대상으로 합니다.

게임 실행·배포·AI 개발의 기준 소스는 **`index.html` 한 파일**입니다. 게임 코드, UI, 데이터와 실행에 필요한 리소스·SDK가 HTML에 포함되어 있으며 별도 패키지 설치나 빌드가 필요하지 않습니다.

## 실행

1. 저장소의 `index.html`을 내려받아 WebGL을 지원하는 브라우저로 엽니다.
2. 브라우저의 로컬 파일 정책으로 실행·저장이 제한되면 폴더를 정적 HTTP 서버로 제공해 엽니다.
3. 다른 기기나 브라우저로 옮기기 전에는 메뉴의 **진행 백업**으로 JSON을 저장합니다.

공개 플레이: [Budmori.io](https://byh-playground.github.io/budmori-io/). PR의 후보 변경은 머지 전에는 공개 게임에 반영되지 않습니다.

## 플레이와 조작

- 모아를 이동시키며 자동 공격하고, 야생 동료 영입·영구 군단 수집·합성·성장 카드로 전력을 키웁니다.
- 지역 탐험, 지형 이동, 자동 사냥, 정예·보스의 공격 예고와 회피, 패배 후 회복을 제공합니다.
- **이동:** 목적지를 클릭/탭하거나 WASD·방향키를 사용합니다.
- **구르기:** 목적지를 두 번 클릭/탭하거나 Space를 누릅니다.
- **일시정지:** 화면 메뉴 또는 Esc. 도감·군단 관리·성장·지도는 화면의 해당 버튼에서 엽니다.
- **저장:** 자동 저장과 수동 저장, JSON 백업 내보내기·불러오기를 제공합니다. 갑작스러운 브라우저·OS 종료 시 마지막 완료 저장 이후의 진행은 잃을 수 있습니다.
- 오류가 발생하면 로컬 진단 창에서 내용을 복사하거나 TXT로 저장할 수 있습니다. 공유 전 내용을 확인하세요.

현재 HTML의 화면 제목·저장 키·진단 표기에는 기존 **BLOOM** 명칭이 남아 있습니다. 최초 등록은 기존 실행물을 바이트 변경 없이 보존했습니다.

## 개발 기준

### 우선순위와 파일 구성

1. **최적화가 먼저, 재미가 그다음입니다.** 기능·표현을 추가할 때 계산량, 호출 빈도, 메모리, 초기 로딩, 틱·렌더 비용을 함께 판단합니다. 예상과 실제 측정을 구분하며 성능 회귀를 숨기지 않습니다.
2. 실행·배포·AI 수정 대상은 단일 `index.html`로 유지합니다. 작업용 도구나 중간 생성물이 실행 의존성이 되어서는 안 되며, 중간 빌드·임시 결과물을 최종 게임 대신 전달하지 않습니다.
3. 밸런스·타이밍·규모·표현 한도는 해당 `CONFIG`·Definition·정책 설정에서 관리합니다. 같은 규칙을 여러 위치에 하드코딩하거나 서로 다른 구현으로 복제하지 않습니다.
4. 공통 세계관은 [bloom-world](https://github.com/byh-playground/bloom-world)를 참고하고, 게임 고유 규칙은 이 게임에서 관리합니다.

### 시뮬레이션·렌더링·이동

- **WebGL은 필수입니다.** GPU 렌더링과 보간을 유지하고 성능 문제를 Canvas 2D 게임 렌더러로 대체해 해결하지 않습니다.
- 시뮬레이션은 설정 가능한 고정 TPS를 사용합니다. 현재 기본은 **10 TPS**, 선택지는 **10 / 20 / 30 TPS**입니다. `CONFIG.sim.tickRate`와 `fixedStep`은 `bloomApplyTickRate()`를 통해 함께 맞춥니다. 세션 중 임의 가변 dt로 규칙을 진행하지 않습니다.
- `CONFIG.sim.renderTargetFPS = 60`은 보간 렌더링의 **목표**이며 실제 기기의 60 FPS 보장이 아닙니다. TPS와 FPS를 혼동하지 않습니다.
- 지속시간·쿨다운 등 게임 시간은 **밀리초 기준**으로 정의·저장합니다. SDK의 틱 번호와 입력 순서 카운터는 별도 개념이며, TPS 변경이 게임 내 지속시간을 바꾸지 않아야 합니다.
- 입력 → 결정론적 시뮬레이션 → 표현을 분리합니다. 메인 스레드의 SDK 세션이 권위 상태를 소유하며 입력·고정 틱·표현 경계를 분리합니다. Worker·메시지·delta 미러를 사용하지 않습니다. 렌더는 읽기 전용 descriptor와 별도 scalar pose를 사용하며 권위 상태를 수정하지 않습니다.
- 난수 상태, 타이머, 투사체·공격·군단·진행 상태처럼 미래 결과에 영향을 주는 값은 같은 저장·복원 계약에 포함합니다. 렌더 캐시·오디오·진단은 표현 영역입니다.
- 공간 질의와 이동은 **Spatial Grid 및 국소 회피**를 사용합니다. **NavMesh·A*를 도입하지 않습니다.** 다른 프로젝트의 전역 경로 탐색·캠페인·경제 규칙을 그대로 이식하지 않습니다.

### 컴포넌트와 공통 SDK

- **Is-a:** 각 객체가 무엇인지와 자신의 책임을 명확히 합니다.
- **Has-a:** 세션·시뮬레이션·코덱·전송·표현 capability를 구성으로 소유합니다. 상속이나 조건문으로 여러 실행 경로를 늘리지 않습니다.
- **Can-be:** 실행·대기·예측·롤백·복구는 같은 구성의 상태로 다룹니다. 기능별로 별도 엔진이나 동기화 체계를 만들지 않습니다.
- [bloom-gamekit](https://github.com/byh-playground/bloom-gamekit)의 rollback-netcode 호환 번들 공개 계약을 사용합니다. 입력 순서·롤백·복구를 게임에 중복 구현하지 않습니다.
- HTML에는 필요한 공통 모듈과 SDK를 오프라인 실행용으로 포함합니다. 원본 SDK 동작은 c3173914519a78834360430071e7a125736d86d5와 호환됩니다. 배포 기준·각 ESM 원본과 포함 IIFE의 SHA-256은 `gamekit-lock.json`에서 검증합니다. 가변 main CDN import는 사용하지 않습니다.
- SDK에 전송 기능이 있다는 사실은 이 게임의 온라인 멀티플레이가 완성되었다는 뜻이 아닙니다. 현재 사용자용 온라인 플레이는 제공하지 않습니다.

### 저장과 검증

- 디스크 저장은 완료된 시뮬레이션 경계의 정규 snapshot bytes를 사용합니다. 자동 저장을 위해 세계를 다시 수집·직렬화하거나 렌더 상태를 저장 원본으로 삼지 않습니다.
- 현재 백업은 `bloom-snapshot-disk-v3` JSON envelope와 base64 payload입니다. 길이·버전·메타데이터·체크섬을 검사하고 손상된 입력은 기존 상태와 저장을 보존하며 거부합니다. FNV 체크섬은 손상 감지용이며 보안 서명이 아닙니다.
- 단위 테스트 조합을 늘리는 것보다 **실제 게임 엔진을 사용하는 하나의 연속 E2E 흐름**을 중심으로 검증합니다. 이동·전투·성장·저장/복원·실패/회복·롤백 등 변경에 관련된 실제 경로를 이어 확인합니다.
- 게임/UI 변경의 실제 플레이와 시각 확인을 정적 검사로 대체하지 않습니다. 시험용 상태 주입, 모의 DOM, native Worker 검사와 실제 브라우저·기기 검사를 분명히 구별합니다.
- 통과·실패·미실행 범위를 기록하며, 미검증 결과를 Stable 또는 VALIDATED로 부르지 않습니다.

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

저장 schema와 저장 키는 변경하지 않습니다. 기존 v63 정규 저장을 동일 bytes로 복원하고 이후 동일 입력의 결과가 그대로인지 원본 고정 fixture로 검사합니다. 손상/미지원 저장은 기존 저장을 보존하며 거부합니다.

## 개발 검증

`npm ci && npm test`는 실제 메인 스레드 런타임/엔진/포함 SDK의 연속 캠페인과 집중 보간 회귀를 검사합니다. `npx playwright install --with-deps chromium && npm run test:browser`는 실제 브라우저 WebGL·메인 스레드 SDK·DOM 입력·전투·저장·죽음/회복·오류 UI를 한 흐름으로 확인합니다. 테스트용 stopped-session fixture는 테스트 서버에서만 삽입되며 `index.html`에는 포함하지 않습니다.

Native V8/Canvas asset raster/GPU command sink 성능 표본은 CPU 제출 비용만 비교합니다. Chromium SwiftShader도 실제 휴대폰 GPU/FPS 검증을 대신하지 않습니다.

## 현재 전환 검증 결과

- 고정 gamekit source: `9be41746b488d8d51699b6aad023370d9f5389e3`; 배포: `a3e4bd670361b6af653d8ec5686ecb564d428398`
- 실제 Chromium/SwiftShader + Blob Worker의 시작·WASD·Space·클릭/터치 구르기·메뉴 재개·전투·죽음/회복·저장/불러오기·오류 중단을 CI에서 검사합니다. 입력/복구 fixture는 수동 clock, 별도 전투 단계는 변경하지 않은 production setTimeout scheduler + RAF를 사용합니다.
- Native 연속 캠페인 96개 확인: 원본 v63 저장 bytes/향후 동일 입력 결과, 대기 명령, 손상 저장 거부, 실제 SDK 지연 패킷 rollback 정확 수렴을 포함합니다.
- 보간은 수신 당시 곡선에서 다시 연결합니다. 늦게 도착하는 미래 표본을 예측하지 않으며, 목표에 먼저 도달하면 다음 표본까지 대기합니다. 불규칙 수신의 속도 변화/대기는 남습니다. 공격/flash 새 단계는 XYZ와 별도로 즉시 반영하며 hitstop이 XYZ를 권위 위치로 튀게 하지 않습니다.
- 155 동료 native CPU 제출 비교는 `tests/performance-summary.json`에 기록합니다. 참고 runner `tests/native-render.cjs`는 추가로 `@napi-rs/canvas@0.1.100`이 필요합니다. 같은 원본 HTML을 인수로 실행해 비교하며, no-op GPU sink이므로 GPU 완료시간·실제 브라우저·휴대폰 FPS 측정이 아닙니다.
- main CI는 Pages 응답 전체 bytes의 SHA-256이 검사한 `index.html`과 같은지 배포 후 확인합니다. 실제 휴대폰/기기 GPU 검증은 별도입니다.

## v65 · 회복 후 화면 동기화 수정

회복 시 권위 세계를 복제하면서 내용이 같은 중첩 객체도 새 identity를 갖습니다. 이전 Worker delta가 새 identity 표시는 보내면서 값은 생략하여, 화면 쪽에서 라이벌의 능력 데이터 등 일부 필드를 지우는 문제가 있었습니다. 이제 교체 identity와 전체 값을 함께 보내고 함께 적용합니다. 라이벌을 숨기거나 누락된 능력을 임의 값으로 대체하지 않습니다.

`tests/recovery-mirror.cjs`는 실제20TPS Worker 전투 사망/회복 두 번, 저장 복원, 새 게임 및 내용이 동일한 객체/배열 교체를 연속 검사합니다. 실제 브라우저 검증에는720×1282 backing store/DPR3 모바일 크기와20TPS, 라이벌이 화면에 보이는 회복/불러오기/동일 ID의 다른 역할 재사용을 추가했습니다. 사용자 원본 저장을 받은 것은 아니므로 같은 오류 경계를 재구성한 검증이며, 실제 Android 기기 검증을 의미하지 않습니다. 저장 schema·진행·게임 규칙은 변경하지 않습니다.

## v66 · 단일 스레드 시뮬레이션

- Worker 생성, 소스 복제, postMessage 왕복, 그래프 delta 직렬화 및 화면 미러를 제거했습니다. HTML 한 파일의 오프라인 실행은 유지합니다.
- 고정 TPS 시뮬레이션은 SDK `createLoop`의 `backlogPolicy: 'retain'`을 사용하고, 렌더는 별도 RAF에서 scalar pose를 보간합니다. 밀린 실제 실행 시간은 보존하되 한 pulse당 한 tick만 처리한 뒤 이벤트 루프에 양보합니다. 일시정지·재개는 타이밍을 재설정하여 멈춘 시간을 따라잡지 않습니다.
- 실행 중 저장 요청은 다음 예정 SDK 경계를 기다립니다. 일시정지 중 대기 명령은 게임 시간을 진행하지 않는 suspended SDK 경계에서 확정합니다. 저장은 이미 완료된 snapshot bytes를 재사용합니다.
- 시뮬레이션과 렌더가 CPU를 공유하므로 Worker 제거가 모든 기기에서 더 빠르다는 보장은 없습니다. 실제 Chromium/SwiftShader 전후 벤치마크는 같은 seed·군단·TPS를 사용하고 tick, snapshot, RAF, 입력 지연을 별도 기록합니다. Native V8 결과는 기기 FPS 측정이 아닙니다.

### SDK 원본 검증과 오프라인 실행

게임 실행에는 네트워크와 npm이 필요하지 않습니다. 개발·SDK 갱신 단계에서만 고정 버전 esbuild와 공식 upstream 저장소를 사용합니다. `vendor/upstream`은 정확한 dist/source Git 객체와 manifest/ESM 캐시입니다. `npm test`는 Git 객체 ID, manifest·각 bundle SHA-256과 ESM→IIFE 재생성 bytes를 검증합니다. 변경된 bundle·manifest·source pin을 거부하는 손상 fixture도 검사합니다.

SDK를 갱신할 때는 새 exact source/dist와 lock 및 HTML을 함께 갱신하고 `npm run verify:upstream`으로 공식 저장소에서 해당 불변 객체를 받아 검증합니다. CI에서도 이 검증을 수행합니다. `index.html`은 외부 CDN이나 이 개발용 캐시에 실행 의존성을 갖지 않습니다.
