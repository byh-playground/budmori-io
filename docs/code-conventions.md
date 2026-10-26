# 코드 컨벤션

이 문서는 budmori에서 자동 검사하는 코드 표기와 리뷰 기준을 정리합니다. 공통 정책의 원본은
[Bloom Reference 개발 규칙](https://github.com/byh-playground/bloom-reference/blob/main/rules/development.html)과
[프로젝트 관리·검증 규칙](https://github.com/byh-playground/bloom-reference/blob/main/rules/project-management.html)입니다.
구현·리뷰 시 원본의 최신 규칙을 확인하고, 전체 정책을 이 저장소에 복제하지 않습니다.

## 이름과 선언

- **모든 `const` 바인딩은 `UPPER_SNAKE_CASE`**입니다. 모듈 상수뿐 아니라 지역 값, 객체 참조, 구조 분해,
  화살표 함수, 클래스 팩토리와 mixin도 포함합니다.
- `let` 바인딩과 함수 매개변수는 `camelCase`입니다. 재할당이 없으면 `const`를 사용하며 `var`는 금지합니다.
- 의도적으로 사용하지 않는 매개변수만 `_unused` 또는 `_`처럼 밑줄로 시작할 수 있습니다.
  사용 중인 매개변수를 밑줄로 숨기거나, 사용하지 않는 지역 변수·import를 같은 방법으로 남기지 않습니다.
- 이름 있는 함수 선언은 `lowerCamelCase`, 클래스 선언은 `PascalCase`입니다.
- import 바인딩은 가져오는 API 이름을 유지할 수 있습니다. export 별칭으로 기존 공개 API를 유지합니다.
  새 객체 속성과 메서드는 `camelCase`로 작성합니다. 기존 공개 API·저장 필드·이벤트 이름은 보존하며
  바인딩 이름 검사로 속성 이름까지 기계적으로 바꾸지 않습니다.

```js
const MAX_UNITS = 100;
const UNIT = world.units[0];
const {
    count: UNIT_COUNT,
    rows: [FIRST_ROW],
    ...REST
} = data;
const WITH_HEALTH = (baseClass) => class extends baseClass {};

export { WITH_HEALTH as WithHealth };

function updateUnits(world, elapsedSeconds, _unusedContext) {
    for (let index = 0; index < world.units.length; index++) {
        const UNIT = world.units[index];
        UNIT.elapsed += elapsedSeconds;
    }
}

class FarmController {}
```

`const`는 바인딩의 재할당을 막습니다. 객체 속성을 깊게 불변으로 만들지 않습니다. 예를 들어 `const UNIT`의
`UNIT.hp`는 모델의 권한 안에서 변경할 수 있습니다. 실제 불변 설정이 필요하면 그 계약에 맞게 별도로 동결합니다.

일반적인 독립 동작은 이름 있는 함수 선언으로, 짧은 콜백은 화살표 함수로 작성합니다. 다만 기존 함수·mixin을
표기 통일만을 위해 일괄 변환하지 않습니다. `this`, `arguments`, 생성자 사용 가능 여부와 호이스팅이 바뀔 수
있으므로 `func-style` 같은 일괄 변환 규칙은 사용하지 않습니다. `const`로 선언한 함수는 그대로 대문자 규칙을
따르며 기존 공개 이름은 export 별칭으로 유지할 수 있습니다.

## 포맷과 기본 안전성

- 들여쓰기 4칸, 탭 사용 안 함, 세미콜론 사용
- 작은따옴표, 가능한 곳의 후행 쉼표, 줄 너비 120을 Prettier 설정으로 통일
- 한 줄에 실행문 하나. `for` 헤더의 초기화·조건·증감은 예외
- `if`, `else`, 반복문 본문에 항상 중괄호 사용
- 실패·종료 조건을 먼저 검사하고 early return/continue로 중첩을 줄임. 반환 시점과 정리 순서는 보존
- 비교는 `===` / `!==`. `value == null` / `value != null`로 null과 undefined를 함께 검사하는 경우만 허용
- 사용하지 않는 import·변수, 도달할 수 없는 코드, 중복 클래스 멤버, 잘못된 `super`/`this` 사용 금지
- 빈 블록과 빈 `catch` 금지. 의도적인 무시라면 블록 안에 이유를 설명하는 주석을 남김

Prettier는 공백·줄바꿈·따옴표를, ESLint는 이름·제어 흐름·기본 안전성을 담당합니다. 포맷 확인은 이름 변경이나
의미 보존을 증명하지 않습니다. 린트의 이름 진단은 자동 rename을 제공하지 않으므로 참조와 API 계약을 확인하며
변경해야 합니다.

## 모델 경계

`eslint.config.js`의 `MODEL_FILES`가 순수 모델·상태·진행·저장 코덱의 명시적인 검사 범위입니다. 새 모델 파일을
추가할 때 목록에도 넣습니다. 여기서는 `document`, `localStorage` 전역과 `window.document`,
`globalThis.localStorage` 같은 직접 접근을 금지합니다. 같은 이름의 객체 속성이나 문자열은 금지하지 않습니다.

모델에서 `farm-renderer`, `farm-storage`, `farm-app`, `ability-tree`, `bootstrap` 또는 `renderer/`, `storage/`,
`ui/` 모듈을 import/re-export할 수 없습니다. 정적인 경로의 동적 import와 `require`도 검사합니다.
DOM·디스크·표현 연결은 어댑터가 모델을 사용하는 방향으로 유지합니다. 계산된 모듈 경로나 여러 단계의 전역
별칭을 추적하는 보안 장치는 아니므로 실제 의존 방향은 리뷰에서도 확인합니다.

## 자동 검사 범위와 실행

직접 관리하는 `src/`, `scripts/`, `tests/`의 JavaScript·CommonJS·ESM 및 루트 설정 파일에 적용합니다.
`vendor/`, `node_modules/`, `tests/output/`, `*.generated.*`, `dist/`는 제외합니다.
생성물은 원본을 고친 뒤 기존 빌드 경로로 갱신합니다.

```sh
npm run format
npm run format:check
npm run lint
npm run build
```

`npm run build`는 포맷 확인과 린트를 먼저 실행하며 이 단계에서 소스를 자동 수정하지 않습니다.
기존 SVG XML·DOM id·메타데이터 검사를 재사용하고, 번들 전후에 알려진 GameKit 컴파일 스키마·정점 메시·
base64 serializer, 폐기한 생성 모듈 경로, SVG가 아닌 캐릭터 리소스와 잘못된 manifest 참조를 차단합니다.
일반 렌더링 배열과 vendor는 이 규칙의 대상이 아니며 임의의 번들 용량 상한은 두지 않습니다. 이 검사는
알려진 산출물 서명·경로 검사로, 임의로 난독화·압축·분할한 모든 payload를 검출한다고 보장하지 않습니다.

작업의 실제 위험에 맞는 기존 시나리오도 실행합니다. 포맷·린트는 동작 검증을 대체하지 않습니다. CI의 빠른
검사와 선택적인 브라우저 시나리오 범위는 [README의 실행과 검증](../README.md#실행과-검증)을 따릅니다.

## 리뷰에서 확인할 것

다음 설계 의미는 정규식이나 린트 성공만으로 보장되지 않습니다. 위의 Bloom Reference 원본을 기준으로 리뷰합니다.

- 같은 규칙·설정·저장 계약의 단일 원본(SSOT)을 유지하고 파생 값을 중복 소유하지 않는가
- 상태 변경과 자원 수명에 한 명의 책임 소유자가 있는가
- 네임스페이스와 이름이 기술 편의가 아닌 도메인 의미를 드러내는가
- 상태 전이, 진입·종료, 취소·초기화·폐기와 반복 호출의 의미가 명확한가
- 표시·입력·저장 어댑터가 모델의 상태와 책임을 우회하거나 복제하지 않는가

## 도구 기준

ESLint flat config와 저장소 내부의 작은 바인딩 이름 규칙을 사용합니다. 들여쓰기 등 포맷 규칙을 중복 구현하지
않고 Prettier에 맡깁니다. ESLint 10에 포함된 `max-statements-per-line`은 11로 올리기 전에 대체 규칙을 확인합니다.

- [ESLint flat config](https://eslint.org/docs/latest/use/configure/configuration-files)
- [ESLint custom rules](https://eslint.org/docs/latest/extend/custom-rules)
- [ESLint restricted globals](https://eslint.org/docs/latest/rules/no-restricted-globals)
- [ESLint restricted imports](https://eslint.org/docs/latest/rules/no-restricted-imports)
