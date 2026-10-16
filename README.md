# budmori

농장에서 먹이를 뿌리고 번식·합체로 병력을 키워, 월드 안에서 추격하는 거대 보스에 도전하는 2.5D WebGL 게임입니다. 메인 버전은 **0.4.5**입니다.

[공개 게임](https://byh-playground.github.io/budmori-io/)

## 실행과 검증

Node.js와 Microsoft Edge가 필요합니다.

```sh
npm ci
npm run build
node scripts/gamekit-provenance.cjs
npm test
```

정적 서버로 저장소 루트를 열면 실행됩니다. `index.html`, `src/bootstrap.js`, 빌드된 `src/game.js`가 제품 진입점입니다. 빌드는 농장 소스와 GameKit 컴파일 SVG를 번들로 만들고 바이트 수·SHA256·SRI manifest를 갱신합니다. GameKit은 `gamekit-lock.json`의 불변 CDN ESM을 검증 후 로드합니다.

`assets/troops/`와 `assets/bosses/`의 SVG가 각 캐릭터 벡터 아트, 클립, 표정, 소켓의 단일 원본입니다. `npm run vector-assets:compile`은 고정 GameKit 컴파일러로 SVG를 검증하고 메시를 생성하며, `npm run build`는 이를 제품 번들에 포함합니다. GameKit의 native `play`, `setExpression`, `seek`, `getSocket`, `draw` API를 사용하고 모든 캐릭터를 공통 `PresentationRuntime` 표시 시각에 맞춥니다. 수동 얼굴 그리기나 SVG 옆 모션 sidecar는 사용하지 않습니다.

`npm test`는 고정 사용자 흐름 E2E를 180초 안에 실행합니다. `npm run test:browser`, `npm run test:browser:save`, `npm run test:browser:multiplayer`, `npm run test:vector-assets`, `npm run test:hungry-expression`, `npm run test:boss-visual`, `npm run verify:raid-load`로 범위를 선택합니다. 결과 JSON·이미지·영상은 무시된 `tests/output/`에 생성됩니다. 네트워크 검사는 실제 공개 relay와 WebRTC를 사용하므로 인터넷이 필요하며, 실패한 의존성·입장·입력 단계는 실패로 기록합니다. 월드 배치·극단 상태의 초기 fixture와 실제 서비스·렌더 경로는 보고서에서 구분합니다.

## 농장

- 수동 먹이는 입력마다 1탭이며 쿨타임이 없습니다. 자동 탭의 기본 간격은 실제 시간 0.5초입니다. 두 입력을 합쳐 5탭마다 먹이 1개를 생산합니다. 별도 자동 먹이 공급은 없습니다.
- 성장 가지는 기존 후보를 유지합니다. 자동 탭 가지는 회복 속도 +10%/단계이며 간격은 `0.5 / (1 + 0.1 × 단계)`초입니다. 시뮬레이션 4×와 별개입니다.
- 3끼를 먹으면 성체가 됩니다. 같은 종의 충분히 먹은 성체 둘은 번식하고, 합체 모드에서는 같은 종·같은 단계의 성체 둘이 다음 단계 하나가 됩니다. 최대 4단계·기본 72마리이며 성장 트리의 정원 확장 4단계로 100마리까지 늘어납니다. 단계별 체력은 ×1.5, 공격력은 ×1.2입니다.

## 자동 군단전

전장에 들어가면 개인 정원 출전 명단이 고정되고, 모든 미투입 병력이 전투 seed와 플레이어 ID에 따라 결정적으로 섞인 순서로 준비됩니다. 전장 지면을 탭하면 다음 병력 한 마리가 탭한 위치 위에서 떨어져 착지 후 자동 전투에 합류합니다. 누르고 있는 동안 같은 위치에 250ms마다 한 마리씩 추가 투입하며 손을 떼면 멈춥니다. 드래그는 배치 위치를 바꾸지 않습니다. 남은 수량과 마지막 투입 위치의 유효 여부를 표시합니다. 개별 이동 명령은 없습니다.

개인 정원은 개인 저장에만 기록하고 전투는 매번 분리된 임시 월드에서 진행합니다. 출전 명단은 전투 시작 전에 고정되며, 전투 중에는 번식·합체·생산하지 않습니다. 전투에서 쓰러진 병력은 개인 정원에서 사라지지 않고, 복귀하면 기존 위치와 체력으로 돌아옵니다. 혼자서는 본인 병력 최대 100마리, 온라인 레이드는 최대 4명의 각자 명단에서 최대 100마리씩 투입해 총 400마리까지 함께 싸웁니다. 두 모드 모두 같은 전투 시뮬레이션과 명령 검증을 사용합니다. 강화는 소유자별로 짧게 지속되며 재사용 대기시간이 있습니다.

- 병력은 전방위에 배치되고, 움직이는 보스 주변의 각도별 위치를 따라 접근·공격합니다. 돌격은 실제 몸체 접촉, 곡사 씨앗탄은 보스 몸체 또는 지면과의 실제 스윕 접촉, 도약은 몸체 접촉 또는 착지로 판정합니다. 준비·발사/이동·접촉·반동·회복을 구분합니다.
- 보스는 살아 있는 병력을 선택해 추격합니다. 기본 공격은 방향을 고정해 0.5초 준비하고 무기를 실제로 뻗어 닿은 병력을 에어본시킵니다. 휩쓸기는 1.05초 전체 원 예고 후 무기가 360도 회전하면서 실제 지나간 몸을 날립니다. 공격별 대상 집합으로 중복 명중을 막고, 높이가 맞지 않는 병력은 타격하지 않습니다. 회복 뒤 다음 추격으로 돌아갑니다.
- 전장 경계는 반경 23×17의 타원 월드 영역입니다. 보스 반경 4.4와 높이 5.2를 실제 접촉에 사용하고, 병력과 보스는 바깥으로 나가지 않습니다. 별도 지형 벽 높이 시스템은 없습니다.
- 전장과 카메라 범위를 함께 넓혀 화면의 보스 크기를 비슷하게 유지하면서 병력을 상대적으로 작게 보이게 합니다. 무기·예고·그림자는 같은 월드 투영을 따릅니다. 보스의 얼굴은 마지막 몸체 표현 레이어에서 읽히며 공격 효과로 지워지지 않습니다.
- 병력은 체력이 0이면 해당 전투에서 쓰러집니다. 모두 쓰러지면 패배, 보스 체력이 0이면 승리합니다. 투사체와 공격 행동을 정리하고 공중에 있던 몸은 중력으로 착지합니다. 정원 복귀 시 병력은 원래 자리·체력으로 회복합니다.

`CombatFeel`은 확정된 공통 전투 사건의 실제 접점·법선·대상을 읽어 국소 섬광, 방향 불꽃, 착지 먼지와 제한된 오디오를 만듭니다. 강한 피격의 대상 표시만 최대 35ms 멈추며 시뮬레이션·입력·네트워크는 계속 진행합니다. 효과 48개·공유 오디오 4 voice 상한을 두고, 동작 줄이기 설정은 이 표현 정지와 변형을 생략합니다. 전체 화면 점멸·전역 hitstop·상시 카메라 흔들림은 사용하지 않습니다.

캐릭터는 SVG 원본을 GameKit이 직접 그리는 둥근 씨앗 군단입니다. 돌격 완두콩은 압축 후 돌진하고, 곡사 수수알은 껍질을 열어 낟알을 발사하며, 도약 콩알은 배아를 접었다 펴며 도약합니다. 몸·얼굴·팔다리의 표정과 동작은 각 SVG 안에 정의하고 전투 단계는 native vector player로 재생합니다. 거대 밤톨은 `assets/bosses/chestnut.svg`의 몸체·팔 소켓·공격 클립을 사용합니다. 무기 접점은 실제 팔 소켓에서 시작하며 보스 AI와 접촉 판정은 같은 전투 모델이 처리합니다.

아군은 현재 방향에서 병종별 사거리를 확보한 뒤 멈춰 공격합니다. 곡사 수수알은 보스가 너무 가까워지면 물러납니다. 아군 체력바는 개별 현재 HP 합계 / 배치된 모든 유닛의 최대 HP 합계입니다. 전사자도 최대 HP에 포함되며 60초 증원 시 현재·최대 합계가 함께 증가합니다. 개별 HP가 판정 기준입니다.

전사자는 XX 눈을 표시하고, 공중이라면 넉백·중력·착지를 마친 위치에 쓰러져 남습니다. 공격·표적·아군 및 보스 몸체 충돌에서 제외되고 착지 후 이동하지 않습니다. 정원 복귀 시 원래 위치와 체력을 회복하며 영구 손실은 없습니다.

## 화면과 함께 가꾸기

도움말 `#/help`, 성장 `#/growth`, 정원 `#/farm`, 전투 `#/raid`, 시작 `#/`는 화면·이력·F5와 동기화됩니다.

`FarmSession`이 싱글·멀티에서 같은 `Garden` 전투 모델과 명령 처리기를 GameKit 20Hz 세션 및 120Hz 물리 하위 스텝으로 진행하며 표시는 보간합니다. 개인 정원 저장은 로컬 명단만 보존하고, 공유 레이드 Garden은 저장하지 않습니다. 레이드는 최대 4명이며 각 투입은 발신 구성원의 고정 명단에서만 다음 무작위 병력을 소비합니다. 연속 투입 번호가 중복·건너뛴 재전송을 거부하고, 소유자와 유닛 ID를 함께 검증합니다. RTC 발견·세션은 전체 제품 버전으로 구분해 다른 전투 규칙이 섞이지 않게 합니다. Nostr는 발견·서명 signaling에, 실제 WebRTC/GameKit은 게임 명령·입장 스냅샷에 사용합니다. 충돌·추격·공격·피격 사건은 싱글과 온라인에서 같은 규칙으로 확정되고 표현은 각 클라이언트가 읽습니다.
표시 프레임은 GameKit `PresentationRuntime`의 단일 샘플을 사용합니다. 20Hz 시뮬레이션과 브라우저 RAF는 같은 단조 시계에 놓이며, 위치·높이·방향·전투 효과·SVG 애니메이션이 같은 표시 시각을 읽습니다. 1x/4x 게임 시계도 동일 프레임에서 샘플링합니다. 결정론적 권위 이벤트의 시간은 시뮬레이션 데이터에 유지하고, 화면의 표시 시각은 클라이언트의 GameKit presentation runtime에서 샘플링합니다. 로드·리셋·장면 경계에서는 GameKit revision 계약에 따라 스냅하며 서로 다른 스냅샷을 보간하지 않습니다.

온라인 전투는 개인 저장에 쓰지 않습니다. 전투에서 나가면 해당 사용자가 보존해 둔 개인 정원으로 돌아옵니다. 온라인 세션은 별도 타이머로 진행하며 숨겨진 개인 정원은 탭·진행을 누적하지 않습니다. 브라우저의 프로세스 동결·네트워크 차단은 정상 실행과 구분합니다.

## 저장과 배포

메인 버전의 `MAJOR.MINOR`에서 호환 범위를 파생합니다. 저장은 `productVersion`, `schema: budmori-farm`, 전체 `world`이며 기존 키 `bloom-weapon-cards-v3`를 씁니다. 0.4는 제거한 수동 명령과 변경된 전투 상태 때문에 0.3과 비호환입니다.

비호환·손상 저장을 자동 삭제·덮어쓰기·마이그레이션하지 않습니다. 원본 내보내기를 제공하고 이어가기를 차단합니다. 전투 직접 링크도 시작 화면으로 돌려 보호하며, 새 정원 또는 유효한 가져오기는 명시적 확인 후 기록합니다. 취소·검증 실패 시 원본을 유지합니다. 난수·남은 행동·비행 탄·먹이 나머지·투자를 보존하며 구 게임 호환 실행 경로는 없습니다.

기존 GitHub Pages `main /`를 그대로 사용합니다. 머지 후 `node scripts/verify-pages.mjs`가 공개 index·게임·bootstrap의 바이트 수와 SHA256을 비교합니다. 실제 검증·배포 기록은 해당 PR에 남깁니다.

## 소스와 기준

- `src/farm-model.js`: 농장, 전방위 자동 AI, 월드 보스 상태기계·충돌·전투 사건.
- `src/farm-state.js`, `farm-session.js`, `farm-storage.js`: 값 스냅샷, 구성원 명령·세션, 저장 보호.
- `src/farm-renderer.js`: 실제 WebGL 투영, GameKit troop/boss vector assets, 전투 예고.
- `assets/troops/*.svg`, `assets/bosses/chestnut.svg`: 캐릭터 몸체·클립·표정·소켓 원본.
- `src/combat-feel.js`, `food-feel.js`: 확정 사건을 읽는 제한된 표현·오디오.
- `src/farm-app.js`: 시작·복귀·농장 입력·라우팅·함께 가꾸기·성장 UI.

농장 원본 기준은 지정 후보 SHA256 `f7ba37cf172d8b92ab5c7b55424827eccd8e7b2fd57300a24c2e65f9b4a7a5d6`이며, 정식 통합 기준은 [PR41](https://github.com/byh-playground/budmori-io/pull/41)의 `6f555cca264b601b23e8e381c2a5ddfac2e10796`입니다.

규칙 원본: [개발](https://github.com/byh-playground/bloom-reference/blob/main/rules/development.html), [프로젝트 관리·검증](https://github.com/byh-playground/bloom-reference/blob/main/rules/project-management.html), [타격감·영상 사례](https://github.com/byh-playground/bloom-reference/blob/main/rules/impact-feel.html), [AI 개발](https://github.com/byh-playground/bloom-reference/blob/main/rules/ai-development.html). 구현 전 [Unity 사건 기반 impulse 공식 문서](https://docs.unity3d.com/Packages/com.unity.cinemachine@3.1/manual/CinemachineImpulseSource.html)와 [타격감 연구](https://arxiv.org/abs/2208.06155)를 읽고 접촉·표현 사건 분리를 대조했습니다. 해당 엔진을 도입하거나 문서의 수치를 게임 규칙으로 복사한 것은 아닙니다.

물리 모바일 기기·서로 다른 NAT망·장기 밸런스는 PC/터치 브라우저·동일 호스트의 실제 공개 RTC 검증과 구분합니다.

씨앗 동작 참고: [Animation Mentor의 squash/stretch](https://www.animationmentor.com/blog/squash-and-stretch-the-12-basic-principles-of-animation/), [anticipation](https://www.animationmentor.com/blog/anticipation-the-12-basic-principles-of-animation/). 압축과 복원 및 발사 전 예고를 병종별 껍질·배아 동작에 적용했습니다. 0.4.3은 저장 구조를 변경하지 않아 0.4 저장과 호환됩니다.
