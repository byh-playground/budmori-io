# 시뮬레이션 주기와 성능 진단

## 주기 소유권

`FarmSession` uses GameKit `simloop` at 20Hz. Each `Garden.step(0.05)` advances one logic tick and exactly one physics integration; counters `logicTicks` and `physicsSteps` therefore match.
Collision impulses are applied once after integration. Position separation uses Jacobi iterations: pair corrections are accumulated from fixed iteration-start positions and applied together. These solver passes do not advance simulation time; `physicsSolverIterations` reports them separately.
Boss charge paths and projectiles retain swept collision checks across each 50ms tick. Presentation keeps the existing 50ms interpolation delay. Catch-up may execute multiple complete 50ms ticks, but never subdivides an individual tick.

## 기록 창과 단위

계측은 GameKit `FrameMetrics`의 고정 240프레임 링을 사용합니다. 기록은 고정 숫자 배열에 추가하며 매 프레임 로그, JSON, 월드 스냅샷을 만들지 않습니다. 설정에서 상세 측정을 끄면 구간 시계 호출을 생략하지만 프레임 시각과 실제 장치 카운터는 계속 기록됩니다. 상세 설정을 바꾸면 창을 비워 새 측정 구간으로 시작합니다.

| 이름                                                 | 단위       | 의미                                                       |
| ---------------------------------------------------- | ---------- | ---------------------------------------------------------- |
| `cpuMs`                                              | ms         | RAF callback 안의 관찰된 CPU 작업 시간                     |
| `intervalMs`                                         | ms         | 한 RAF callback 시작부터 다음 callback 시작까지의 간격     |
| 각 `stagesMs` 항목                                   | ms         | 해당 구간의 관찰 시간; 요약은 평균, p95, 최대              |
| `logicTicks`, `physicsSteps`                         | 횟수       | 링에 보관된 프레임들의 논리 틱과 실제 물리 하위 단계 합계  |
| `physicsSolverIterations`                            | 횟수       | 자코비 위치 분리 반복; 시간 진행 없이 위치 보정만 적용     |
| `catchupTicks`, `backlogDrops`                       | 횟수       | 정상 첫 틱 외 추가 처리와 400ms 초과 간격의 backlog drop   |
| `backlogDroppedMs`, `backlogCappedFrames`            | ms, 횟수   | 명시적 drop에서 버린 간격·기존 누적 시간과 cap된 프레임 수 |
| `backlogClippedMs`                                   | ms         | elapsed 입력 상한과 누적기 용량 상한에서 제외된 시간 합    |
| `presentationCaptures`, `presentationEntities`       | 횟수       | 프레임당 프레젠테이션 캡처 수와 SDK에 넘긴 엔티티 수       |
| `saveCalls`                                          | 횟수       | 저장 시도 횟수                                             |
| `drawCalls`, `vectorFlushCalls`, `vectorSubmissions` | 횟수       | WebGL 실제 draw, 벡터 flush, 제출 호출                     |
| `pathTessellations`, `pathStrokeBuilds`              | 횟수       | 실제 경로 채우기 재분할과 선 기하 생성                     |
| `meshCreates`                                        | 횟수       | retained WebGL mesh 생성                                   |
| `bufferUploads`, `bufferBytes`                       | 횟수, byte | GPU 버퍼 업로드 호출과 전송 바이트                         |

상세 시간 구간은 `simulation`, `worldStep`, `logic`, `ai`, `spatial`, `physics`, `collision`, `worldPostStep`, `mutationDispatch`, `worldStepFollowup`, `presentationCapture`, `runtimeCapture`, `presentation`, `render`, `ui`, `save`, `saveCapture`, `instrumentation`입니다. `spatial`은 공간 인덱스 재구축과 이동 뒤 항목 갱신만 뜻합니다. AI·충돌 중 발생하는 공간 질의 비용은 각각의 호출 구간에 포함됩니다. `worldPostStep`은 접촉 사후 처리와 정리, `mutationDispatch`는 논리 틱에서 모은 변경 신호 발행, `worldStepFollowup`은 `onWorldStep` 후처리, `presentationCapture`는 틱 뒤 월드 어댑터 구성과 스냅샷 호출, `runtimeCapture`는 SDK 캡처 자체입니다. SDK의 render schema 컴파일은 클래스별 WeakMap 캐시에 저장되므로 첫 캡처 이후 `runtimeCapture`에는 반복 스키마 컴파일보다 엔티티별 필드 복사, 경로/이력 처리와 트랙 맵 구성 비용이 포함됩니다. 저장 하위 구간은 진행 캡처(`saveCapture`)이고, 인코딩·쓰기는 gamekit `save` 모듈이 비동기로 합니다(측정 구간 밖).

부모와 자식 구간은 중첩되므로 합산하지 않습니다. `simulation`에는 `worldStep`, 프레젠테이션 캡처, 저장과 프레임 안의 다른 시뮬레이션 작업이 들어갑니다. `worldStep`에는 `logic`, `physics`, `worldPostStep`, `mutationDispatch`가 들어갑니다. `logic`에는 AI와 공간 갱신이, `physics`에는 충돌과 물리 중 인덱스 갱신이 들어갑니다. `presentationCapture`에는 `runtimeCapture`가 들어가며, `save`에는 캡처·인코딩·I/O가 들어갑니다. 각 구간 시간과 호출 수는 프레임 안에서 반복된 모든 호출을 합산합니다. 논리·물리 횟수도 호출당이 아니라 RAF 프레임 간 누적입니다. `backlogDrops`는 GameKit의 명시적 400ms 초과 drop 콜백만 뜻합니다. 보통 지연에서도 250ms 입력 상한과 최대 200ms 누적기 용량 때문에 빠진 시간은 `backlogClippedMs`와 `backlogCappedFrames`에 따로 표시합니다. `instrumentation`은 측정 종료 뒤 관찰한 기록 오버헤드의 하한이며 시작 시계 비용은 포함하지 않습니다.

지면에 정착한 먹이는 이동·애니메이션 값이 바뀌지 않으므로 매 논리 틱 SDK 스냅샷에서 제외하고, 프레젠테이션 뷰에서 월드 객체를 직접 참조합니다. 비행·튕김 먹이와 유닛·투사체·효과는 계속 SDK 보간 경로를 사용합니다. 프레임의 `presentationEntities`는 실제 SDK 캡처에 포함한 엔티티 수를 보여 줍니다.

`cpuMs`는 callback에서 관찰한 CPU 시간이고 `intervalMs`는 다음 callback까지의 RAF 간격입니다. 외부 이벤트 대기나 GPU 완료 시간은 이 CPU 구간으로 주장하지 않습니다. GPU 완료 시간은 현재 수집하지 않으므로 `gpuMs`는 `null`입니다. 이 값만으로 실제 모바일 기기의 개선 배율을 주장하지 않습니다.

상세 출력은 창 단위의 횟수·시간 요약과 제한된 느린 프레임 표본을 제공합니다. 기본 복사 텍스트는 짧은 한국어 요약이고, JSON 상세 데이터는 설정의 명시적 내보내기로 확인합니다. WebGL 장치 카운터는 매 프레임 실제 카운터 초기화 지점에서 읽습니다.

## 성능 후속 작업 상태 (Farm 0.8.12)

기준은 Farm 0.8.12, main commit `10c0504` (2026-10-17)입니다. 아래 상태에 따라 우선순위를 유지하고, 새 측정 근거 없이 범위가 큰 성능 구조 변경은 시작하지 않습니다.

### 시뮬레이션 시간 분해 — 원인 미확정

제공된 34 RAF 구간에서 simulation span 평균은 274.1ms/frame이고 logic과 physics stage 합계는 각각 2.7ms/frame, 3.5ms/frame입니다. `FrameMetrics.stage()`는 프레임 내 반복 호출을 합산하고, Farm의 simulation span은 `active.pulse(now)` 전체를 감쌉니다. 따라서 약 267.9ms/frame은 아직 하위 단계에 귀속되지 않았습니다. `FarmSession.capturePresentation`과 첫 사용 runtime/schema compilation 및 이후 cached capture, mutation notifications, `onWorldStep`, `resolveLifeContacts`와 event callbacks를 별도로 계측해야 합니다. 현재 변경으로 이 simulation 병목을 해결했다고 보지 않습니다.

### 지형 retained geometry — 이번 최적화 미적용으로 종료

측정된 지형은 프레임당 primitive 143개와 인스턴스 데이터 9,152바이트를 추가하지만, primitive 제출은 기존 단일 인스턴스 업로드에 묶이고 draw call도 늘지 않습니다. 지형 primitive 생성 메서드 CPU 평균은 0.202ms, terrain on/off 렌더 평균 차이는 약 0.256ms였습니다. 현재 측정으로 retained geometry의 순이득을 입증할 수 없어 이번 최적화는 미적용으로 종료하며, 추가 연구는 진행하지 않습니다.

### outline/body pose 공유 — 윤곽선 패스 제거로 종료 (0.10.7)

등급 윤곽선은 유닛마다 실루엣을 한 번 더 그려 draw call이 유닛당 2개였습니다. 0.10.7에서 윤곽선 패스를 없애고 등급을 바닥 링(2등급 이상)으로 표현합니다. 링은 그림자와 같은 배치에 그려서 유닛당 네이티브 벡터 draw는 1개입니다. GameKit의 `excludeParts` 필터 API 인계는 더 이상 필요하지 않습니다.

### 전투 충돌 비용 (0.10.7)

전투의 아군 분리를 이웃 목록 한 번 구축 + 반복 3회로 바꿨습니다. 아군끼리는 반지름 합의 20%까지 겹칠 수 있고, 아군 간 부딪힘 충격·기절은 없습니다. 아군-적 충돌과 경계 처리는 그대로입니다. 반지름·높이·질량 getter는 틱마다 한 번만 읽습니다.

헤드리스 Chromium(데스크톱급 CPU), 밀집한 아군 몰림에서 한 틱(`Garden.step`) 시간입니다. 모바일 실기기는 미측정입니다.

| 동시 전투 유닛 | 0.10.6  | 0.10.7  |
| -------------- | ------- | ------- |
| 400            | 약 28ms | 약 5ms  |
| 1000           | 약 86ms | 약 10ms |

그 밖의 낮은 우선순위 항목은 현재 근거와 우선순위를 유지하며, 실측 전에는 구조를 크게 바꾸지 않습니다.

## GPU pose diagnostics (0.47.1)

`BUDMORI.poseDiagnostics` returns the official GameKit pose counters for the last rendered frame, including GPU/CPU/uniform draw instances, `cpuFallbackRatio`, `fallbackReasons`, state/base-pose/CPU-pose upload bytes, live allocations and retained texture bytes. The performance recorder also retains `gpuPoseInstances`, `cpuPoseInstances`, `uniformPoseInstances`, and `poseTextureUploadBytes`. These counters measure visible submissions, not all living or culled units. Unsupported animation combinations use the existing CPU pose path without resetting playback clocks.

The GPU texture stores numeric transform channels and evaluated matrices; SVG art remains compiled reusable geometry. Actor sorting and the main branch's actual primitive/vector submission order remain unchanged. Pose preparation runs before visible submissions; no species sorting is used.

Context loss suspends the session clock and RAF work while SDK resources recover. `FarmSession.suspendClock()`/`resumeClock()` exclude the lost interval from the adjusted clock and reset loop timing without changing the user's pause choice or menu state. Even direct pulses cannot advance a suspended session. Successful restoration resumes the same session after all resource listeners finish; failed restoration holds the clock and displays an error. Page disposal clears recovery and prevents late events from reviving resources or rendering. Disposal releases the shared mesh and pose resources.

`gpuMs` in the ordinary support recorder remains unmeasured. Dedicated benchmark GPU queries wrap the entire renderer, including the pose pass, and are reported separately from CPU render/animation/submission time. Physical mobile hardware has not been verified.

## 깊이 기반 병력 배치 (0.67.3)

기준은 0.67.2 `3a93c77` / gamekit 0.39.3이며, 변경은 gamekit 0.39.5의 정점별 깊이·불투명 커버리지 판정·이미지 사각형 직접 제출을 사용합니다. 실제 배포 source `fd2bcffd351a52adab011ba1e1e9a069734da282`, dist `2eaf9b239ced0a51f35e09f133437607b65726cd`의 rendering SHA-256 `620be73dd95d90f4d64d951e690b077c18f4d95f0efe68fcbe084c7f22db5349`가 측정한 후보 파일과 byte 단위로 같은 것을 확인했습니다.

동일한 시드 731·10병종 200마리·50ms 진행·1100×850/DPR1·고정 카메라로 A→B→B→A 교차 측정했습니다. 단계마다 독립 컨텍스트 2개에서 24프레임 준비 뒤 60프레임을 측정해 전후 각각 240표본입니다. Chromium 153 / SwiftShader이며 mock·CPU pose·sprite 대체 없이 기존 native GPU body와 공유 얼굴 이미지를 사용합니다. 모든 회차의 최종 모델 SHA-256은 `6ed03e0b43ff0aa5ba84289ebc777dc42657cf2592348bfec6dd86e5aed0aa54`로 같습니다.

| 프레임당 지표                                 |      이전 |      이후 |
| --------------------------------------------- | --------: | --------: |
| 실제 GPU draw call 중앙값                     |       401 |       129 |
| 메시 draw 중앙값 (병력 수는 200)              |       200 |        67 |
| 렌더 CPU 중앙값                               |   32.30ms |   30.65ms |
| 렌더 CPU p95                                  |   55.70ms |   51.60ms |
| simulation + presentation + render CPU 중앙값 |   57.05ms |   53.35ms |
| 같은 CPU 합계 p95                             |   80.90ms |   84.50ms |
| 실제 device draw 호출 CPU 중앙값              |    2.60ms |    1.20ms |
| 메시 제출 CPU 중앙값                          |    3.70ms |    2.15ms |
| 버퍼 업로드 byte 중앙값                       | 2,910,800 | 3,055,700 |
| 표본 중 이미지 업로드 / 굽기 draw 합계        |     0 / 0 |     0 / 0 |

호출은 약 68%, 렌더 CPU 중앙값은 약 5%, simulation+presentation+render CPU 중앙값은 약 6.5% 줄었습니다. 합계 p95는 좋아지지 않았으므로 끊김 개선을 입증한 것으로 해석하지 않습니다. CPU 구간은 DOM/HUD/입력을 제외한 계측된 FarmSession·표시·렌더이며 전체 앱 FPS가 아닙니다. 계측 자체와 소프트웨어 GPU의 대기·GC 편차가 포함되므로 실기기 성능으로 환산하지 않습니다. 실제 GPU·모바일은 미측정입니다. 깊이 attachment가 추가되며, 정점별 깊이 때문에 전송 byte는 약 5% 늘었습니다.

불투명 커버리지를 증명한 7종의 몸통은 병종/몸 변형별로 모아서 제출합니다. 땅콩·밀·보리의 반투명 외곽, 분신·opacity 모션은 실제 합성 순서를 유지합니다. 병종 ID로 예외를 지정하지 않고 원본 geometry/pose capability로 구분합니다. 그 때문에 혼합 200마리가 한 draw가 되지는 않습니다. 커버리지 판정은 시작 시 1회이며 실제 Chromium에서 10종+호두 guard 11 variant 합계 약31ms였고 일반 프레임에서 실행하지 않습니다.

`npm run test:unit-sprites`의 깊이 장면 9개는 같은 DTO/시각의 원래 actor 순서와 전체 RGBA 픽셀 차이 0을 검사합니다. 정상 겹침·역순/동일 깊이·분신·숨긴/페이드 껍질·외곽 반투명·전부 반투명인 장면·거대화 벡터 얼굴·시설/먹이/전후 링을 포함합니다. sprite 전용 화면은 깊이 버퍼·정책 경계를 추가하지 않습니다. 원본 모델은 렌더로 바뀌지 않습니다.

재실행 명령(관찰 JSON/이미지는 임시 경로에 기록):

```sh
node tests/unit-sprites.e2e.mjs --benchmark --count=200 --backend=vector --output=/tmp/budmori-benchmark
```

동일 CLI를 기준 checkout과 변경 checkout에서 A→B→B→A 순서로 실행하고 JSON의 원본 SHA·시드·카메라·모델 해시·라이브러리 hash를 함께 비교합니다. 브라우저 벤치마크는 기능 E2E와 별도 명령이며 테스트 통과를 성능 근거로 쓰지 않습니다(AI-012·AI-017·PM-010).

## 대규모 농장 ordered 배치 (0.67.7)

사용자가 제공한 0.67.6 / 활동 병력 882마리의 진단에서 RAF CPU 평균568.6ms 중 WebGL 제출526.3ms(약92.6%), 보간19.1ms, 논리·물리 등14.2ms였습니다. 논리18틱/37.75초로 이미 렌더 때문에 진행이 막힌 상태이므로 이14.2ms를 정상20Hz 시뮬레이션 비용으로 해석하지 않습니다. 유닛을 100마리씩만 갱신하도록 논리 시간을 바꾸는 대신 렌더 병목을 먼저 줄였습니다.

GameKit 0.40.2의 `mesh.orderedMeshQuads`를 농장 렌더러에서 켭니다. 불투명 몸통은 기존 병종별 깊이 배치를 유지하고, 반투명 몸통·공유 얼굴·호환되는 번식/합성 표식을 원래 삼각형 순서대로 하나의 indexed stream에 담습니다. 반복되는 키프레임 평가는 지원되는 GPU float target에서 부위당 한 번 준비합니다. float target 미지원 또는 복구 후 미지원이면 직접 GPU program으로 평가하며 CPU 포즈로 바꾸지 않습니다. 원본 아트·45개 공유 얼굴 이미지·깊이·물리20Hz·합성·저장 규칙은 유지합니다.

### 측정 방법과 한계

기준 게임 main `1469f5d`(0.67.6), 기준 GameKit source `f983d7a` / dist `c21ef9b`(0.40.1). 같은 게임 소스와 `orderedMeshQuads` 옵션을 둔 상태에서 rendering 번들만 교체했습니다. 구버전은 그 옵션을 사용하지 않습니다. 기준 번들은 SHA-256 `620be73dd95d90f4d64d951e690b077c18f4d95f0efe68fcbe084c7f22db5349`입니다.

Chromium153.0.8010.12 / Playwright1.63 / Node24.19 / Linux SwiftShader(소프트웨어GPU),1100×850/DPR1,seed731,50ms 고정 진행입니다. 장면마다 독립 컨텍스트에서 A→B→B→A 순서,각 회차 준비12+측정24프레임으로 전후 각각48표본입니다. 실제 FarmSession·Garden·native GPU 벡터와 공유 얼굴을 사용하며 mock·몸통 raster atlas·CPU pose 대체는 없습니다. draw와 GPU query는 포즈 계산 패스를 포함합니다. 각 프레임에서 CPU 측정 밖의1×1 GPU readback과20ms yield로 query 완료를 확인했으므로 고립된 프레임의 제출 비용이며 실제 앱 FPS가 아닙니다. DOM/HUD/입력/자동 저장은 별도 실제 앱 검증 범위입니다.

### 전후 결과

| 장면               | 전/후 | 렌더 CPU 평균 / p95 |  GPU 평균 | draw 평균 | buffer+texture 전송 | GPU buffer / texture |
| ------------------ | ----- | ------------------: | --------: | --------: | ------------------: | -------------------: |
| 밀882              | 이전  |    95.98 / 130.80ms |  962.44ms |    1765.0 |             4.95MiB |        7.0 / 17.1MiB |
| 밀882              | 이후  |     54.07 / 69.80ms |  822.79ms |      17.0 |             4.26MiB |       22.0 / 20.8MiB |
| 혼합1,000          | 이전  |     76.31 / 93.70ms |  985.49ms |     608.0 |             5.30MiB |        7.0 / 17.1MiB |
| 혼합1,000          | 이후  |     52.72 / 67.40ms |  728.91ms |      18.0 |            11.29MiB |       16.0 / 21.0MiB |
| 번식표식 혼합1,000 | 이전  |   114.18 / 137.30ms | 1056.97ms |     609.6 |            16.84MiB |        7.0 / 17.1MiB |
| 번식표식 혼합1,000 | 이후  |     75.84 / 88.90ms |  837.07ms |      22.0 |            15.37MiB |       18.1 / 24.4MiB |

프레임당 렌더 CPU 평균은 밀882에서43.7%,혼합1,000에서30.9%,번식표식 혼합1,000에서33.6% 줄었습니다. 이 소프트웨어 GPU 환경에서 전체 장면을60FPS로 만든 결과는 아닙니다. 혼합 장면의 전송량은5.30→11.29MiB로 늘고 모든 장면에서 캐시 메모리가 늘어납니다. 버퍼 byte만 비교하면 숫자 texture로 옮겨진 전송을 누락하므로 지원 진단에도 texture upload를 함께 표시합니다. draw 감소만으로 개선을 판단하지 않습니다.

장면별 A/B/B/A 최종 모델 SHA-256은 각각 같습니다.

- 밀882: `ad1f7535a83edeb33f96e9312612f74411743389991d40b8b7c70d50c4229ed1`
- 혼합1,000: `e1bf982d86c499caad618d61f040e0c6436d887f134757972c2d50c56826bd3a`
- 번식표식 혼합1,000: `1fd82ecbdaadc1d0e053d642e4eae04906ec3be561ad66dbab97434b6d2a712e`

후보 rendering SHA-256은 `08a110906c3a249c892685940ff79b3ebe7bc34afe36f4c5d6b7b056572ccf8b`입니다. SDK #184 병합 source `e2ad338c216c85c30339505dd314db9d3a8def09` / 공개 dist `d3d6577f15a3a64036d732a3dcda9eee187a32da`의 실제 rendering bytes와 일치함을 확인했습니다.

재현은 동일 게임 소스에서 기준/후보 rendering 번들을 각각 고정하고 아래 CLI를 A→B→B→A로 실행합니다. 관찰물은 임시 경로에만 둡니다. 일회용 override 스크립트는 저장소에 포함하지 않습니다.

```sh
node tests/unit-sprites.e2e.mjs --benchmark --count=882 --backend=vector --species=7 --gpu-readback --warmup=12 --samples=24 --rounds=1 --output=/tmp/budmori-wheat
node tests/unit-sprites.e2e.mjs --benchmark --count=1000 --backend=vector --gpu-readback --warmup=12 --samples=24 --rounds=1 --output=/tmp/budmori-mixed
node tests/unit-sprites.e2e.mjs --benchmark --count=1000 --backend=vector --gpu-readback --breeding-rings --warmup=12 --samples=24 --rounds=1 --output=/tmp/budmori-rings
```

### 기능 검증

기존 깊이 시나리오9개의 전체 RGBA 픽셀 차이0과 모델 비변경을 확인합니다. 이 검사의 원래 reference는 ordered 배치를 끈 native painter로 고정합니다. 새 SDK의 단순 painter 경로도 별도 캡처해 픽셀 차이0과 draw를 기록합니다. 소수 장면에서는 단순 painter의 draw가 깊이 grouping보다 적을 수 있으므로 원래 기준 대비 감소 조건을 보존하고, 성능 판정은 위의 대규모 CPU/GPU 벤치와 구분합니다. 겹침·같은 깊이의ID순서·분신·숨긴/페이드 껍질·반투명 장식·전부 반투명·확대 벡터 얼굴·먹이/시설/전후 링을 포함합니다. SDK interop은 일반 paint/SDF/gradient,작은 용량,65,532정점,중첩 stencil,atlas 변경,복구/정리를 검증합니다. GPU program과 행렬 캐시는9시점×4구성의 픽셀 차이0입니다. capability mask로 float 미지원과 복구 후 손실도 확인했으며 실제 기기 지원성 검증으로 부르지 않습니다.

SDK 전체 core의 기존 GPU-vs-CPU uniform 비교는 auto frame1에서490픽셀(0.1020833%)로 기존0.1% 기준을 넘어 실패합니다. 고정0.40.1 바이너리에서도 같은 위치·오차58을 재현했습니다. 기대값/허용치를 바꾸지 않았고 새 GPU cache는 기존 GPU program을 참조로 별도 비교했습니다. 이 기존 실패를 전체 통과로 보고하지 않습니다(AI-013·PM-010).

실제 앱 RAF·HUD·자동 저장을 유지하고 마우스로 합성 버튼을6초 누른 뒤 합성 완료를 확인했습니다. 수동 pulse나 RAF 대체 없이1,000마리→990마리, T2 10마리, 진행 중 합성18건, 페이지 오류0이었습니다. 소프트웨어 GPU의 실제 앱은약1.18FPS였으며 고립 프레임 개선을 실제 앱FPS 해결로 보고하지 않습니다.

기능 E2E와 성능 측정은 분리하며, 기기 GPU·사용자 PC·모바일은 미측정입니다(AI-012·AI-017·PM-010).

## 기본 병력 불투명 아트 (0.67.8)

기준은 main `41a37a2` /0.67.7/GameKit0.40.2입니다. 기본 병력10종과 호두 방어 변형의 정적 도형을 불투명하게 authoring하고, 땅콩의 부품 숨김/등장은 alpha 대신 크기0으로 접고 펼칩니다. 분신·외부 효과·이미지 가장자리 커버리지는 별도 경로에 남습니다. [아트 계약](./unit-face-layer.md)의 빌드 검사와 실제 WebGL 시나리오가11개 variant·fractional vertex alpha 없음·일반 opacity clip 없음을 검증합니다.

GameKit0.40.3(source `f240b1211fd9086106117773f8458ea3cc4b4fff`,dist `34918d09b47541ce1db2f9a036ff21e2fc9aefa4`)은 세 입력 검사에서 유한한 scale0을 허용합니다. `rendering.js` SHA는0.40.2와 같은 `08a110906c3a249c892685940ff79b3ebe7bc34afe36f4c5d6b7b056572ccf8b`이며 새 렌더 파이프라인을 추가하지 않습니다. 몸통 윤곽·소켓·충돌 치수·clip 시점·이동/회전은 유지합니다.

비교는 기존 CLI로 혼합/밀/땅콩 각각1,000마리,seed731,고정50ms,1100×850/DPR1,회차별 warm12/sample24/round1을 A→B→B→A 순서로 실행합니다. 장면마다 전후48표본이며 원본 snapshot SHA가 같아야 합니다. 프레임별1×1 GPU readback은 렌더 CPU 밖에서 query 완료를 기다립니다. SwiftShader의 고립 프레임 CPU/GPU·draw·전송/메모리 비용이며 앱FPS나 실제PC/모바일 성능으로 환산하지 않습니다. 회차별 수치·모델SHA·실행 환경과 기능 검증 결과는 이 변경의 PR 본문에 기록합니다.

```sh
node tests/unit-sprites.e2e.mjs --benchmark --count=1000 --backend=vector --gpu-readback --warmup=12 --samples=24 --rounds=1 --output=/tmp/opaque-mixed
node tests/unit-sprites.e2e.mjs --benchmark --count=1000 --backend=vector --species=7 --gpu-readback --warmup=12 --samples=24 --rounds=1 --output=/tmp/opaque-wheat
node tests/unit-sprites.e2e.mjs --benchmark --count=1000 --backend=vector --species=4 --gpu-readback --warmup=12 --samples=24 --rounds=1 --output=/tmp/opaque-peanut
```

SDK 교체 검증은 staged root가 가진 검증된 source schema를 사용합니다. 체크아웃의 이전 schema를 고정 import하면 새로 허용된 SVG 입력을 cache 교체 전에 거부하므로 검증 대상 root의 schema를 읽습니다. Git 객체/파일 SHA 검증 후 staging을 검사하고, 성공한 뒤에만 cache를 교체합니다. 규칙 적용: AI-009·010·012·013·015·017,DEV-001·004·014,PM-010.
