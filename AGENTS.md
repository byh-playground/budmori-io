# 작업 지침

작업 전에 https://raw.githubusercontent.com/byh-playground/bloom-reference/main/AGENTS.md 를 받아 전부 읽고 규칙 줄을 따른다. 상세는 각 줄 끝 [상세] 링크 절만 읽고, 규칙 적용·위반은 ID(예: DEV-001)로 보고한다.

- 저장소: `byh-playground/budmori-io`. 통합 브랜치와 PR 대상: `main`. 작업 브랜치 접두사: `codex/`. 커밋·문서는 한국어(PM-007).
- 머지·배포 (PM-005, PM-006): 검증을 마친 PR은 별도 승인을 묻지 않고 `main`에 머지한다. `main` 푸시는 Pages 워크플로가 공개 주소에 자동 배포하므로 머지가 곧 리모트 확인용 배포다. 별도 `release` 브랜치 승격 절차는 없다.
- Stable은 검증·승인한 커밋에 불변 태그로 명시 승격할 때만 만든다. Pages 배포나 `main` 머지만으로 Stable로 간주하지 않는다(PM-005).
- 실행하지 못한 검증은 PR 본문에 적고, 통과 범위를 실제 브라우저·기기 검증으로 부르지 않는다(PM-010).
- 원본: 루트 `index.html`과 `src/`(또는 저장소 루트 모듈)가 직접 실행·배포되는 원본이다. 검증 명령과 구조는 `README.md`를 따른다.
