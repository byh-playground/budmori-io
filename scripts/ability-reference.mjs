import { format as FORMAT } from 'prettier';
import { readFile, writeFile } from 'node:fs/promises';
import { SPECIES_ABILITY_DEFINITIONS, abilityPresentationFor } from '../src/ability-catalog.js';
import { speciesById } from '../src/species-catalog.js';
import { unitGradeLabel } from '../src/unit-grades.js';
import { abilityProfile } from '../src/unit-abilities.js';

// Documentation and the upgrade panel use the same feature-owned definitions and formatters.
const LINES = [
    '# 병종 특성 현재 효과',
    '',
    '이 문서는 `node scripts/ability-reference.mjs`로 생성합니다. UI와 동일한 기능 정의·표현을 사용합니다.',
    '공통 스탯과 별도로 투자해야 해금하며, 각 능력의 강화와 적용 등급 완화는 독립된 경로입니다.',
    '쌀·밀·보리의 역할은 확정이며 세부 수치는 현재 초기 조정값입니다. 밤톨의 피해·주기와 땅콩·호두 수치도 초기 조정값입니다.',
    '공통 포인트·전투 중 잠금·저장 정책은 [스탯 계약](unit-stats.md)을 참고하세요.',
    '',
];
for (const DEFINITION of SPECIES_ABILITY_DEFINITIONS) {
    const PRESENTATION = abilityPresentationFor(DEFINITION.id);
    LINES.push(
        `## ${speciesById(DEFINITION.species).name} · ${DEFINITION.name}`,
        '',
        DEFINITION.description,
        '',
        `해금: ${unitGradeLabel(DEFINITION.rootTier)}. 적용 등급: ${DEFINITION.gradeThresholds.map(unitGradeLabel).join(' → ')}.`,
        '',
        '| 단계 | 실제 효과 |',
        '| --- | --- |',
        ...DEFINITION.powerValues.map(
            (value, level) =>
                `| ${level === 0 ? '기본 해금' : `강화 ${level}`} | ${PRESENTATION.label(DEFINITION, value, level, abilityProfile(DEFINITION.species))} |`,
        ),
        '',
    );
}
const OUTPUT = await FORMAT(LINES.join('\n'), { parser: 'markdown', printWidth: 120, tabWidth: 4 });
const DESTINATION = new URL('../docs/ability-reference.md', import.meta.url);
if (process.argv.includes('--check')) {
    const EXISTING = await readFile(DESTINATION, 'utf8');
    if (EXISTING.replaceAll('\r\n', '\n') !== OUTPUT) {
        throw new Error('Ability reference is stale; run node scripts/ability-reference.mjs');
    }
} else {
    await writeFile(DESTINATION, OUTPUT);
}
