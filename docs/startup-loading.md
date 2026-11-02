# 초기 로딩 화면

`index.html`에 로딩 DOM(문구·`<progress>`·상세 줄·새로고침 링크)과 최소 스타일이 포함돼 JavaScript 실행 전부터 표시됩니다. 나머지 게임 화면은 `data-startup` 동안 보이지 않아 키보드·터치로 중복 시작할 수 없습니다. 새로고침 링크는 모듈 자체가 실패해도 동작합니다. 모든 브라우저 스크립트는 기존 규칙대로 외부 native ES module입니다.

진행 표시는 GameKit `boot` 모듈(`createBoot`·`bindBootProgress`·`yieldFrame`, SDK 0.41.1)이 맡고, `src/startup-loading.js`는 단계·가중치·문구만 정합니다. 막대 하나가 **시작 전체**의 진행률(0→100%, 줄지 않음)이고, 문구는 현재 단계와 전체 퍼센트입니다(예: `애니메이션 이미지를 준비하고 있어요 · 63%`, 영어도 같은 형식). ETA·가짜 진행은 만들지 않습니다. `BudmoriStartup.snapshot()`은 단계별 실제 개수와 wall time을 기록합니다.

모든 재시도는 전체 페이지를 다시 불러옵니다. HTML 링크를 키보드로 선택하는 경로도 같은 방식이므로 이전 시도의 미완료 SDK callback이 새 로딩 상태를 변경할 수 없습니다. 실패하면 문구는 시작 실패, 상세 줄은 원인, 오류 팝업은 기존대로 진단 복사·새로고침을 보여 줍니다. 준비 CPU는 실제 작업만 계측하며, 준비가 필요 없는 정상 프레임 호출은 누적값을 증가시키지 않습니다.

```text
단계 = 실제 개수를 아는 작업 묶음, 순서대로 실행
modules          검증한 SDK 모듈 17개 (boot·debug-tools는 먼저 받아 두고 같이 셈)
vector-download  중복을 제거한 SVG 다운로드 10개 (병렬)
vectors          병력·보스의 품질별 컴파일 20개 (자산 사이 화면 갱신)
game-modules     게임 모듈 그래프 N개를 <link rel=modulepreload>로 병렬 요청 (N = runtime manifest gameModules)
game             그래프 실행·게임 초기화 (개수 모름 → farm-app이 렌더러 생성 뒤 finish)
atlas-plan       atlas 구성 후보 (sprite 백엔드만)
atlas            128MiB 예산에 선택된 atlas 준비 (sprite 백엔드만)
```

- `gameModules`는 `scripts/update-runtime-manifest.cjs`가 고정 GameKit `boot-build.mjs`의 `listModuleGraph({ root: '.', entry: 'src/farm-app.js' })`로 만들어 `index.html` runtime manifest에 커밋합니다. import가 바뀌면 `node scripts/update-runtime-manifest.cjs`를 다시 실행하고, `npm run check`의 `--check`가 어긋난 목록을 막습니다.
- bootstrap은 preload 직후 같은 URL(`document.baseURI` 기준, 첫 항목 = `import.meta.url` 기준 `farm-app.js`)로 `import()`하므로 module map을 재사용하고 게임 모듈을 다시 요청하지 않습니다. 파일 하나라도 실패하면 모든 요청이 끝난 뒤 실패로 보고하고 게임을 import하지 않습니다.
- atlas 단계는 `src/render/unit-art.js`의 `UNIT_ART`(기본 `vector`)가 `sprite`일 때만 단계 목록에 들어갑니다. 기본 vector 경로는 다섯 단계로 막대를 채웁니다.

### 단계 가중치

가중치 = 단계의 측정 wall time(0.1초 단위, 최소 1). 아래 "측정 범위와 검증"의 sprite 경로 6.10초 측정을 기준으로 합니다.

| 단계            | 가중치 | 근거                                                                                                                      |
| --------------- | -----: | ------------------------------------------------------------------------------------------------------------------------- |
| modules         |      1 | 나머지 1.01초(SDK·게임 모듈·초기화)를 로컬 실측 비율(0.31 : 1.38 : 0.82초, `test:startup-loading` vector)로 나눔 → 0.13초 |
| vector-download |      1 | 0.032초 (최소 1)                                                                                                          |
| vectors         |      4 | 0.42초                                                                                                                    |
| game-modules    |      6 | 같은 비율 → 0.55초                                                                                                        |
| game            |      3 | 같은 비율 → 0.33초                                                                                                        |
| atlas-plan      |      2 | atlas 4.64초를 로컬 실측 비율(계획 1.79 : 준비 37.0초, swiftshader)로 나눔 → 0.21초                                       |
| atlas           |     44 | 같은 비율 → 4.43초                                                                                                        |

합은 sprite 경로 61(= 6.1초), 기본 vector 경로 15입니다. atlas 계획/준비 분할과 나머지 분할은 소프트웨어 렌더러·로컬 서버 실측이므로 실제 GPU 기기에서 비율이 다를 수 있습니다.

### preload 효과 관찰 (2026-11-02, 요청마다 40ms 지연)

로컬 정적 서버에 요청마다 40ms를 지연하고 서비스워커 없이(cold) Playwright Chromium 153(swiftshader)에서 `index.html` → 준비 완료까지 3회 중앙값을 쟀습니다. GitHub Pages처럼 HTTP/2(자체 서명 TLS)에서 preload 2.18초, preload 없이 2.47초였고, HTTP/1.1(호스트당 연결 6개)에서는 3.86초 대 3.77초로 차이가 없었습니다. HTTP/2에서도 game-modules 단계가 0.62~0.72초로 40ms보다 훨씬 길어, 파일 285개의 요청·파싱 자체가 비용입니다. 실제 CDN·기기 측정은 아닙니다.

최종 개수는 실행 중 실제 manifest에서 산출됩니다. 미선택 자산의 기존 벡터 fallback과 품질·예산은 바꾸지 않습니다. 단일 컴파일/bake 호출 자체는 동기 작업이며 이 작업을 선점하는 구조는 아닙니다.

## 렌더·시간 계약

- 일반 Diorama 소비자와 context restore의 `prepare()`는 기존 동기 동작입니다. 앱 첫 시작만 명시적으로 `prepareAsync()`를 기다립니다. 같은 preparation iterator를 사용해 계획 순서·이미지·예산을 공유합니다.
- 약 32ms 작업 묶음 뒤 `yieldFrame()`(GameKit boot)으로 화면에 준비 상태를 그릴 기회를 줍니다. 숨겨진 탭의 RAF 중단 때문에 영구 정지하지 않도록 80ms 타이머도 사용합니다.
- 플레이 세션의 시뮬레이션 tick과 RAF 게임 루프는 준비가 끝난 후 시작합니다. 중간에 그래픽 손실·복구 세대 변경·dispose가 발생하면 초기 준비를 실패로 보고 재로딩을 안내합니다. 이전 세대의 일부 빈 이미지를 준비 완료로 취급하지 않습니다.
- 완료 후 overlay를 제거하고 포커스를 게임 시작 메뉴로 넘깁니다. 정상 프레임에 compile/bake/image upload를 추가하지 않습니다. 복구 때의 명시적 재준비 계약도 유지합니다.

## 측정 범위와 검증

로컬 고정 자원과 실제 GTX1660Ti, Chromium 153에서 최종 PC/모바일 가로 기능 검사 시 bootstrap 컨트롤러 시작부터 준비 완료까지 6.10/5.36초였고 atlas 계획·준비 wall time은 4.64/4.13초, 해당 CPU 작업은 4.51/4.01초였습니다. SVG 다운로드는 약 32ms, 품질별 컴파일 단계는 0.42/0.38초였습니다. 이 값은 CDN 지연·최초 HTML 수신·컨트롤러 이전 모듈 다운로드를 포함한 cold startup 벤치가 아닙니다. wall time에는 화면 갱신을 위한 대기가 포함됩니다. 모바일 가로는 같은 PC의 터치 에뮬레이션이며 실물 모바일은 미검증입니다.

`npm run test:startup-loading`은 로직만 검사합니다: vector·sprite 백엔드에서 전체 진행률이 줄지 않고 100%로 끝나는지, 문구가 `단계 · N%` 형식인지, 단계 순서, game-modules가 N/N(manifest의 게임 모듈 전부)에 도달하는지, 게임 모듈마다 요청이 정확히 한 번이고 `game` 단계 시작 뒤 게임 모듈 요청이 0인지(resource timing), atlas 단계 N/N, 그리고 실패 경로(SDK 모듈 503과 키보드 재시도 = 새 realm, 게임 모듈 preload 503, atlas 준비 오류, 준비 중 실제 context loss, bootstrap·로딩 모듈 자체 실패)입니다. 시간 성능은 측정하지 않습니다. 실제 원인은 사용자에게 드러내며 일반 렌더 오류를 context loss로 삼키지 않습니다.

초기 context loss 주입에서는 준비 오류 뒤 `endFrame()`이 `VectorContext frame is unavailable`로 원인을 덮는 경로를 재현했습니다. 확인된 손실 상태에서는 무효 프레임의 마감을 건너뛰어 원래 준비 오류를 표시합니다. 일반 오류는 기존 경로대로 보고하며, 손실을 임의로 추정해 삼키지 않습니다.

별도 복구 회귀의 첫 실행에서 기존 재개 시계 관측 `<120ms` 조건에 162.2ms가 기록돼 실패했습니다. 원본 main 비교는 통과했고, 관측 정보를 추가한 진단에서는 정상 재개 후 증가 40.0/32.6ms가 실제 재개 후 경과 39.9/32.6ms와 일치했습니다. 최종 수정 없는 원본 suite도 모든 시나리오를 통과했습니다. 최초 실패 원인은 확정하지 않았으며 초기 context loss 오류 메시지 수정이 그 시계 실패를 해결했다고 주장하지 않습니다. 시계·검사 기준·기존 단언은 변경하지 않았습니다.
