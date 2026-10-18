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

상세 시간 구간은 `simulation`, `worldStep`, `logic`, `ai`, `spatial`, `physics`, `collision`, `worldPostStep`, `mutationDispatch`, `worldStepFollowup`, `presentationCapture`, `runtimeCapture`, `presentation`, `render`, `ui`, `save`, `saveCapture`, `saveEncode`, `saveIO`, `instrumentation`입니다. `spatial`은 공간 인덱스 재구축과 이동 뒤 항목 갱신만 뜻합니다. AI·충돌 중 발생하는 공간 질의 비용은 각각의 호출 구간에 포함됩니다. `worldPostStep`은 접촉 사후 처리와 정리, `mutationDispatch`는 논리 틱에서 모은 변경 신호 발행, `worldStepFollowup`은 `onWorldStep` 후처리, `presentationCapture`는 틱 뒤 월드 어댑터 구성과 스냅샷 호출, `runtimeCapture`는 SDK 캡처 자체입니다. SDK의 render schema 컴파일은 클래스별 WeakMap 캐시에 저장되므로 첫 캡처 이후 `runtimeCapture`에는 반복 스키마 컴파일보다 엔티티별 필드 복사, 경로/이력 처리와 트랙 맵 구성 비용이 포함됩니다. 저장 하위 구간은 캡처, 인코딩, 쓰기를 구분합니다.

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

### outline/body pose 공유 — GameKit API 인계 대기

Farm 0.8.12는 표현식 메타데이터로 윤곽선 패스의 불필요한 얼굴 visibility mutation을 줄였습니다. 보이는 얼굴이 있는 표현식은 복구용 `setExpression`이 pose revision을 무효화하므로 두 draw의 pose 계산은 아직 공유하지 않습니다. 이를 해결하려면 GameKit의 호출별 필터 API `draw({ excludeParts: ReadonlySet<string> })`가 필요합니다. GameKit 담당자의 API 전달 후 Farm에서 mutation 호출을 draw 필터로 바꾸고 핀 통합 및 렌더를 검증합니다.

그 밖의 낮은 우선순위 항목은 현재 근거와 우선순위를 유지하며, 실측 전에는 구조를 크게 바꾸지 않습니다.
