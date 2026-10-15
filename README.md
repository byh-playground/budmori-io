# budmori

농장에서 먹이를 뿌리고 번식·합체로 군단을 키워 거대 보스에 도전하는 2.5D WebGL 게임입니다. 메인 버전은 **0.3.0**입니다.

[공개 게임](https://byh-playground.github.io/budmori-io/)

## 실행과 검증

Node.js와 Microsoft Edge가 필요합니다.

```sh
npm ci
npm run build
node scripts/verify-gamekit-source.cjs
npm test
```

정적 서버로 저장소 루트를 열면 실행됩니다. `index.html`, `src/bootstrap.js`, 빌드된 `src/game.js`가 제품 진입점입니다. `npm run build`는 농장 소스를 번들로 만들고 실행 파일 SHA256과 SRI manifest를 갱신합니다. 번들에 SDK를 복제하지 않으며, GameKit은 `gamekit-lock.json`의 불변 CDN ESM을 SHA256 검증 후 로드합니다.

`npm test`는 실제 사용자 흐름 E2E를 180초 안에 실행합니다. `npm run test:browser`, `npm run test:browser:save`, `npm run test:browser:multiplayer`로 필요한 시나리오만 선택할 수 있습니다. 결과 JSON과 화면은 무시된 `tests/output/`에 생성됩니다. 네트워크 시나리오는 실제 공개 relay와 WebRTC를 사용하므로 인터넷 연결이 필요합니다. 실패한 의존성·입장·입력 단계는 실패로 기록합니다.

## 플레이 계약

- 먹이 버튼은 수동 입력마다 1탭이며 별도 쿨타임이 없습니다. 자동 탭의 기본 간격은 실제 시간 0.5초입니다. 두 입력을 합쳐 5탭마다 먹이 1개를 생산합니다. 별도 자동 먹이 공급 경로는 없습니다.
- 후보의 성장 가지와 수치를 유지합니다. 자동 탭 가지는 회복 속도 +10%/단계이며 간격은 `0.5 / (1 + 0.1 × 단계)`초입니다. 시뮬레이션 4×와 별개입니다.
- 3끼를 먹으면 성체가 됩니다. 같은 종의 충분히 먹은 성체 둘은 번식하고, 합체 모드에서는 같은 종·같은 단계의 성체 둘이 다음 단계 하나가 됩니다. 최대 4단계·72마리입니다. 단계별 체력은 ×1.5, 공격력은 ×1.2입니다.
- 보스전에 들어가면 즉시 자동 전투합니다. 탭은 전군 이동, 250ms 누르기 또는 10 CSS px 넘는 드래그는 제어 원 안의 준비된 유닛을 조준합니다. 최대 충전은 실제 시간 1.2초이며 놓으면 실행합니다. Escape, 영역 밖 놓기, 포인터 취소, 창 전환과 메뉴 조작은 취소합니다.
- 왕사슴 돌격은 몸체의 실제 접촉, 씨앗포는 포물선 탄의 착탄, 벼룩은 도약 접촉 또는 착지에서 피해를 적용합니다. 준비·이동/비행·접촉·반동/회복이 분리됩니다.
- 도움말은 `#/help`, 성장 가지는 `#/growth`, 정원과 보스전은 `#/farm`, `#/raid`, 시작은 `#/`로 열립니다. 화면 이동·닫기·이력 복원이 주소와 동기화됩니다.

## 싱글·함께 가꾸기

`FarmSession`이 양쪽에서 같은 `Garden`을 20Hz GameKit 세션으로 진행합니다. 각 틱은 기존 후보의 120Hz 물리를 6회 실행하고, 표시는 이전 위치와 보간합니다. 난수·먹이·성장·공격·충전은 같은 권위 상태에 속합니다.

함께 가꾸기는 최대 5명이 정원·자원·병력과 장면을 공유합니다. 공개 Nostr relay는 발견·서명 signaling에 쓰며, 실제 게임 명령과 입장 스냅샷은 WebRTC/GameKit 세션을 따릅니다. 확정된 구성원만 명령을 제출합니다. 먼저 시작한 충전은 해당 플레이어가 조준·발사·취소를 소유하며, 다른 플레이어는 이를 빼앗지 못합니다. 소유자 퇴장 시 충전은 취소됩니다. 다른 장면으로 함께 이동하는 명령은 공유됩니다.

온라인 정원은 개인 저장에 쓰지 않습니다. 시작 화면에서 함께 가꾸기를 나가면 개인 정원으로 돌아옵니다. 백그라운드에서는 온라인 세션 타이머가 진행되며, 숨겨진 싱글 화면은 진행·탭을 누적하지 않습니다. 브라우저가 프로세스를 동결하거나 네트워크가 끊긴 경우에는 GameKit 연결 상태를 표시합니다.

## 저장

메인 버전에서 `MAJOR.MINOR` 호환 범위를 파생합니다. 0.3 저장은 `productVersion`, `schema: budmori-farm`, 전체 `world`로 구성하고 기존 브라우저 키 `bloom-weapon-cards-v3`를 사용합니다. 새 별도 저장 버전이나 구 게임 호환 실행 경로는 없습니다.

비호환·손상 저장은 자동 삭제·덮어쓰기·마이그레이션하지 않습니다. 원본 내보내기를 제공하고 이어가기를 차단합니다. 새 정원 또는 가져온 파일로 교체하려면 화면에서 명시적으로 확정해야 합니다. 가져오기는 포맷·범위·참조를 검증한 후 저장하며, 실패·취소 시 기존 값은 유지합니다. 저장 시 충전 입력은 취소된 상태로 보관하고, 비행 탄·남은 행동·난수·투자·먹이 탭 나머지는 보존합니다.

## 구현과 기준

- `src/farm-model.js`: 후보에서 분리한 단일 시뮬레이션과 공격·성장 규칙.
- `src/farm-state.js`, `farm-session.js`, `farm-storage.js`: 값 스냅샷·GameKit 명령/멤버십·브라우저 저장.
- `src/farm-renderer.js`, `unit-art.js`, `food-feel.js`: 후보의 실제 WebGL 그림체·3유형 동작·제한된 먹이 피드백.
- `src/farm-app.js`: 시작/복귀·입력·라우팅·함께 가꾸기·성장 UI.

통합 기준은 사용자가 지정한 `farm-three-attacks.html`이며 SHA256은 `f7ba37cf172d8b92ab5c7b55424827eccd8e7b2fd57300a24c2e65f9b4a7a5d6`입니다. 규칙은 [BLOOM 개발](https://github.com/byh-playground/bloom-reference/blob/main/rules/development.html), [프로젝트 관리·검증](https://github.com/byh-playground/bloom-reference/blob/main/rules/project-management.html), [UI/UX](https://github.com/byh-playground/bloom-reference/blob/main/rules/visual-ux.html)를 따릅니다. 이번 검토의 원격 기준은 `a7e9d94ccc8fbaed06d66865d6348d1cf6211753`입니다. 실제 검증·배포 결과는 [PR 41](https://github.com/byh-playground/budmori-io/pull/41)에 기록합니다.

공개 배포는 기존 GitHub Pages `main` 루트 경로를 사용합니다. 머지 후 `node scripts/verify-pages.mjs`로 공개 index·게임·bootstrap의 바이트 수와 SHA256을 비교합니다. 물리 모바일 기기·다른 NAT망·장기 밸런스는 브라우저 PC/터치 에뮬레이션 검증과 구분합니다.
