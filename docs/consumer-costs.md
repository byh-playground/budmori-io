# 공통 camera/HUD/diagnostics 소비 비용

2026-10-10 후보. 공통 SDK pin은 변경하지 않았고, 게임 규칙·권위 tick·렌더 소유권도 변경하지 않았습니다.

## 변경

- `bloomSyncCamera()`는 현재 viewport/camera/shake와 실제 view 입력이 달라질 때만 공통 setter를 호출합니다. 같은 프레임의 반복 anchor에서 setter와 옵션 객체 생성을 반복하지 않습니다. 프레임 번호만으로 cache하지 않으므로 resize, zoom, DPR, projection pitch, reset, 입력 조회, `follow()` 뒤의 실제 값 변경도 다음 조회에 반영됩니다.
- `WorldUI.anchorInto()` / `screenInto()`와 body-pose 출력 재사용을 추가했습니다. 기존 `anchor()` / `screen()` 결과는 계속 호출자 소유의 독립 객체입니다. 화면 anchor의 절대 XYZ, 지형 높이, melee/recoil, head extent, world-unit offset과 pixel offset 및 depth 의미를 유지합니다. 광물·회복 숫자 루프만 명시적으로 scratch 출력을 재사용합니다.
- 진단 visibility는 common `DiagnosticRing` v2의 각 레코드가 소유합니다. 소비자가 kind/message만으로 visibility를 덮어쓰던 무제한 `classifications` Map을 제거했습니다. 기본 로그는 명시적으로 `log`를 전달하며 같은 메시지의 blocking/notice/log 레코드가 서로 분류를 바꾸지 않습니다. fatal 레코드 visibility는 common의 `fatal` 값입니다.
- `blockingErrors`와 badge는 기존의 **세션 전체에서 한 번이라도 blocking으로 보고된 고유 kind/message 수**를 유지합니다. 이를 위해 `blockingKeys` Set은 남겼습니다. common snapshot의 `blockerCount`는 현재 retained report 횟수이므로 대체하면 중복·eviction 의미가 달라집니다. 따라서 이 변경이 진단 메모리 전체를 bounded하게 만들었다고 주장하지 않습니다.

## 개발 확인과 측정

임시 Node 검사에서 변경 전/후 실제 소비 함수와 고정 vendor SDK를 함께 실행했습니다. point/ground/body/head, 일반 actor·mother, 높이·recoil·head gap, world/pixel offset, viewport/zoom/shake/DPR/projection 변경 2,000조합의 anchor 및 화면 결과가 일치했습니다. 출력 identity, 기존 결과의 독립 소유, camera follow 이후 조회도 확인했습니다. 추가로 기존 native-engine 도구에서 전체 게임 원본과 고정 SDK를 실행해 실제 초기 actor 200조합의 pose/anchor/screen 결과를 전후 비교했고, 조회 전후 authority snapshot bytes가 동일함을 확인했습니다. 이 검사는 mock DOM의 headless 실행이며 브라우저 렌더 검사가 아닙니다. 단위 검사는 저장소에 추가하지 않습니다.

1,006회 진단 report 시 기존 소비 Map에 1,002개 key가 남는 반면 후보에는 분류 Map 자체가 없습니다. common ring은 20개 레코드를 유지했고 세션 blocking 수는 전후 모두 2였습니다. 동일 kind/message/stack에 blocking→notice→log를 보고하면 후보의 세 레코드는 각 visibility를 유지합니다. fatal 중지 플래그와 notice 누적값도 확인했습니다.

1000회 view 이동 × 프레임당 100 point anchors, 별도 warmup 후 새 Node 프로세스 5회:

| 항목 | 기존 screen | 후보 screenInto |
| --- | ---: | ---: |
| setViewport 호출 | 100,000 | 1 |
| setCamera 호출 | 100,000 | 999 |
| setShake 호출 | 100,000 | 1,000 |
| CPU 중앙값 | 301.09ms | 254.64ms |
| CPU 표본 범위 | 278.46–369.75ms | 249.91–297.25ms |

이 표본은 약 15.4%의 추출 함수 CPU 감소입니다. 전체 게임 RAF, FPS, GPU, 실제 기기 또는 heap/GC 측정이 아닙니다. Node VM 호출 비용이 포함되며 point anchor 재사용을 선택한 경로만 비교했습니다. 호출 수 감소는 확정적이고, 시간 차이는 이 환경의 표본입니다.

## 검증 상태

- PASS: `node --check src/game.js`
- PASS: `node scripts/update-runtime-manifest.cjs` 후 `node scripts/verify-gamekit-source.cjs` (고정 Git provenance, 실제 ESM, 게임 SRI, font asset)
- PASS: 위 임시 equivalence·ownership·diagnostics 검사와 반복 CPU 관측
- **BLOCKED / 전체 PASS 아님:** `CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test`는 source 검증 후 Chromium 실행 단계에서 `process_singleton_posix.cc: socket() failed: Operation not permitted`로 종료했습니다. 실제 플레이 check 0개이며 저장·RTC 시나리오도 실행되지 않았습니다. 브라우저가 실행 가능한 허용된 환경에서 기존 고정 E2E를 완료하기 전에는 병합·배포 검증 완료로 간주하지 않습니다.
