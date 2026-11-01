# Pixel FX 참고 기반 표현 개선

## 요구와 적용 기준

사용자는 개발 레퍼런스에 추가한 Pixel FX를 참고해 전반적인 이펙트를 개선하고,
특히 큰 보스에 적중하는 우주선 레이저가 선이 아니라 점처럼 보이는 문제를 고치도록 요청했다.
기존 원본 ES 모듈과 WebGL 렌더러를 유지하며 유물·공통 전투/속성·농장/성장/조합 표현을 다룬다.
전투 수치와 발동 조건은 별도로 승인한 변경만 적용한다. 표현을 위해 피해·판정·세계 난수·시뮬레이션 시간을 바꾸지 않는다.

## 확인한 원본

참고 저장소는 [patch-gg/pixelfx](https://github.com/patch-gg/pixelfx/tree/a84159688af3ca37a4be05a0d422b94451b2e24e),
조회한 불변 커밋은 `a84159688af3ca37a4be05a0d422b94451b2e24e`다.
해당 버전은 244종 효과를 제공한다. 다음 문서와 실제 효과 소스를 비교했다(AI-003·004).

| 원본                                                                                                                                       | 비교한 표현                                             | 적용 위치                  |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- | -------------------------- |
| [작성 계약](https://github.com/patch-gg/pixelfx/blob/a84159688af3ca37a4be05a0d422b94451b2e24e/docs/AUTHORING.md)                           | 결정론적 시각, 로컬 좌표, 앞/뒤 층, 코어·빛·잔여물 분리 | 공통 표현 규칙             |
| [Arcane beam](https://github.com/patch-gg/pixelfx/blob/a84159688af3ca37a4be05a0d422b94451b2e24e/src/fx/arcane/arcane-beam.js)              | 밝은 코어·유색 가장자리·발사구와 끝점의 독립된 빛       | 우주선 레이저              |
| [Lightning strike](https://github.com/patch-gg/pixelfx/blob/a84159688af3ca37a4be05a0d422b94451b2e24e/src/fx/lightning/lightning-strike.js) | 번개 가지, 짧은 접촉광, 끊겨 사라지는 잔광              | 낙뢰·뇌운·전기 속성        |
| [Small explosion](https://github.com/patch-gg/pixelfx/blob/a84159688af3ca37a4be05a0d422b94451b2e24e/src/fx/explosions/small-explosion.js)  | 뜨거운 중심·불꽃·먼지의 서로 다른 수명                  | 운석·유성우·폭발·속성 피격 |
| [Heavy landing](https://github.com/patch-gg/pixelfx/blob/a84159688af3ca37a4be05a0d422b94451b2e24e/src/fx/impacts/heavy-landing.js)         | 접지 충격파와 늦게 가라앉는 먼지/파편                   | 망치·착지·공통 충격        |
| [Heal](https://github.com/patch-gg/pixelfx/blob/a84159688af3ca37a4be05a0d422b94451b2e24e/src/fx/holy/heal.js)                              | 상승 고리·작은 밝은 중심·몸을 덮지 않는 빛              | 1초 급속 회복·성장/등장    |
| [Blunt hit](https://github.com/patch-gg/pixelfx/blob/a84159688af3ca37a4be05a0d422b94451b2e24e/src/fx/impacts/blunt-hit.js)                 | 충돌 접점의 선명한 중심과 방향성 파편                   | 공통 기본 공격 피격        |

원본의 `ImageData` 실시간 합성이나 캐릭터/갤러리 폰트를 제품에 추가하지 않는다.
색·명도·형태·시간의 표현을 비교하고 현재 벡터 렌더러에서 독립적으로 구현한다.
코드 자체를 이식한 부분이 있다면 해당 원본의 MIT 저작권 고지와 라이선스를 함께 보존해야 한다.
참고 프로젝트의 MIT 범위와 별도 폰트 범위는 원본 [LICENSE](https://github.com/patch-gg/pixelfx/blob/a84159688af3ca37a4be05a0d422b94451b2e24e/LICENSE)와
[NOTICE](https://github.com/patch-gg/pixelfx/blob/a84159688af3ca37a4be05a0d422b94451b2e24e/NOTICE.md)를 확인했다.

통합 검증 중 발견한 GPU 몸체 누락은 공통 rendering의 숫자 텍스처 업로드 상태 문제였다.
DOM 이미지 뒤에 남은 premultiply 설정을 숫자 데이터 갱신 전에 초기화하는
[gamekit 0.39.3 수정](https://github.com/byh-playground/bloom-gamekit/pull/179)을 반영했다(AI-009).
소스 `cd27a43f4c71e863fce26e4479ab462710cd6864`, 불변 dist `91fd0004646db5d3f73a19474a1a966cd6e45ee1`을
고정하고 Git 객체·manifest·캐시 무결성을 확인한다. 원본 GPU pose와 얼굴 오버레이를 함께 사용한다.

## 표현 계약과 검증 시나리오

- 접점과 피해 타깃은 실제 모델의 좌표·높이·몸체 정보를 사용한다. 판정과 다른 위치의 번쩍임으로 오류를 숨기지 않는다.
- 우주선은 기체 발사구부터 실제 피격 높이까지 광선이 읽혀야 한다. 큰 보스와 작은 유닛, 양 진영,
  진입/이탈 및 확대/축소에서도 노즐·광선·착탄의 실루엣을 분리한다.
- 낙뢰·운석·망치는 짧은 접촉광과 잔여 파편을 구분하고, 회복·거대화·복사·성장/합체는 상승·확장·분열의 역할을 구분한다.
- 여러 타격의 전체 화면 흰색 점멸이나 무제한 입자 누적으로 예고·몸체·HUD를 가리지 않는다.
- 시각 난수는 효과의 seed/id/age에서만 도출한다. 효과 예산·유닛별 반복·캐시 수명을 확인한다.
- before/after는 같은 seed·viewport·효과 age/tick의 실제 FarmSession 표시 DTO와 native 렌더러를 경유해 캡처한다(AI-015·017).
  결정론적 캡처와 실행 로그를 함께 확인하며, 단일 프레임만으로 움직임 전체나 물리 기기 성능이 검증됐다고 표현하지 않는다(PM-010).

프로젝트 원칙은 [타격감 가이드의 접점](https://github.com/byh-playground/bloom-reference/blob/main/rules/impact-feel.html#contact)과
[화면 밀도](https://github.com/byh-playground/bloom-reference/blob/main/rules/impact-feel.html#density)를 함께 비교했다.
