# 시뮬레이션 주기와 성능 진단

## 주기 소유권

`FarmSession`은 GameKit `simloop`의 20Hz 논리 시계를 사용합니다. 논리 틱마다 `Garden.step(0.05)`를 한 번 호출해 해당 구간의 전체 시간을 보존합니다. AI 결정, 먹이 탐색, 번식·합성, 성장·휴식, 스킬과 장면 시계, 효과 정리, 투사체 수명, 저장 체크포인트는 논리 틱이 소유합니다.

`Garden`은 필요한 이동·접촉 작업만 물리 하위 단계로 나눕니다. 기준 상한은 1/60초이며, 자유 이동체의 단계별 이동량은 현재 최소 몸체 반경의 절반 이하가 되도록 속도 상한에서 단계를 추가합니다. 유닛의 현재 속도와 틱에서 선택한 이동 방향을 함께 고려합니다. 보스 공격의 작성된 경로는 기존 스윕 접촉 판정을 사용하며, 자유 이동체에 일반적인 전체 연속 충돌 판정을 새로 가정하지 않습니다.

공격 발사·피해·생성·제거·저장 신호는 소유 객체가 한 번 발행합니다. 이동과 충돌을 세분화해도 총 `dt`, 논리 사건, 기존 Signal 계약은 유지합니다. catchup은 GameKit의 상한 안에서 논리 틱을 추가 처리하며, 버려진 backlog와 추가 catchup 횟수를 별도로 셉니다.

## 기록 창과 단위

계측은 GameKit `FrameMetrics`의 고정 240프레임 링을 사용합니다. 기록은 고정 숫자 배열에 추가하며 매 프레임 로그, JSON, 월드 스냅샷을 만들지 않습니다. 설정에서 상세 측정을 끄면 구간 시계 호출을 생략하지만 프레임 시각과 실제 장치 카운터는 계속 기록됩니다. 상세 설정을 바꾸면 창을 비워 새 측정 구간으로 시작합니다.

| 이름                                                 | 단위       | 의미                                                      |
| ---------------------------------------------------- | ---------- | --------------------------------------------------------- |
| `cpuMs`                                              | ms         | RAF callback 안의 관찰된 CPU 작업 시간                    |
| `intervalMs`                                         | ms         | 한 RAF callback 시작부터 다음 callback 시작까지의 간격    |
| 각 `stagesMs` 항목                                   | ms         | 해당 구간의 관찰 시간; 요약은 평균, p95, 최대             |
| `logicTicks`, `physicsSteps`                         | 횟수       | 링에 보관된 프레임들의 논리 틱과 실제 물리 하위 단계 합계 |
| `catchupTicks`, `backlogDrops`                       | 횟수       | 정상 첫 틱 외 추가 처리와 제거된 밀린 틱                  |
| `saveCalls`                                          | 횟수       | 저장 시도 횟수                                            |
| `drawCalls`, `vectorFlushCalls`, `vectorSubmissions` | 횟수       | WebGL 실제 draw, 벡터 flush, 제출 호출                    |
| `pathTessellations`, `pathStrokeBuilds`              | 횟수       | 실제 경로 채우기 재분할과 선 기하 생성                    |
| `meshCreates`                                        | 횟수       | retained WebGL mesh 생성                                  |
| `bufferUploads`, `bufferBytes`                       | 횟수, byte | GPU 버퍼 업로드 호출과 전송 바이트                        |

상세 시간 구간은 `simulation`, `logic`, `ai`, `spatial`, `physics`, `collision`, `presentation`, `render`, `ui`, `save`, `saveCapture`, `saveEncode`, `saveIO`, `instrumentation`입니다. `spatial`은 공간 인덱스 재구축과 이동 뒤 항목 갱신만 뜻합니다. AI·충돌 중 발생하는 공간 질의 비용은 각각의 호출 구간에 포함됩니다. 저장 하위 구간은 캡처, 인코딩, 쓰기를 구분합니다.

부모와 자식 구간은 중첩되므로 합산하지 않습니다. `simulation`에는 `logic`·`physics`·저장이 들어가고, `logic`에는 AI와 공간 갱신이 들어가며, `physics`에는 충돌과 물리 중 인덱스 갱신이 들어갑니다. `save`에는 캡처·인코딩·I/O가 들어갑니다. `instrumentation`은 측정 종료 뒤 관찰한 기록 오버헤드의 하한이며 시작 시계 비용은 포함하지 않습니다.

`cpuMs`는 callback에서 관찰한 CPU 시간이고 `intervalMs`는 다음 callback까지의 RAF 간격입니다. 외부 이벤트 대기나 GPU 완료 시간은 이 CPU 구간으로 주장하지 않습니다. GPU 완료 시간은 현재 수집하지 않으므로 `gpuMs`는 `null`입니다. 이 값만으로 실제 모바일 기기의 개선 배율을 주장하지 않습니다.

상세 출력은 창 단위의 횟수·시간 요약과 제한된 느린 프레임 표본을 제공합니다. 기본 복사 텍스트는 짧은 한국어 요약이고, JSON 상세 데이터는 설정의 명시적 내보내기로 확인합니다. WebGL 장치 카운터는 매 프레임 실제 카운터 초기화 지점에서 읽습니다.
