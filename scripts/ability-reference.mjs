import { format as FORMAT } from 'prettier';
import { readFile, writeFile } from 'node:fs/promises';
import { SPECIES_ABILITY_DEFINITIONS } from '../src/ability-catalog.js';
import { speciesById } from '../src/species-catalog.js';
import { growthForAbility } from '../src/features/species-growth/state.js';
import { growthPresentationFor } from '../src/species-growth-presentation.js';

// The current growth panel owns all names, descriptions and rank values.
// Legacy powerValues are save-compatibility data, not the released progression.
const LINES = [
    '# 병종 특성과 성장',
    '',
    '현재 게임의 병종 특성 화면과 같은 설명·수치를 사용합니다. node scripts/ability-reference.mjs로 생성합니다.',
    '9종 모두 T1부터 기본 능력을 사용합니다. 종별 숙련은 최대 Lv.50이며 포인트는 최대 50P입니다. 농장에서 무료로 초기화할 수 있습니다.',
    '공격 진화는 각 2P이며 앞 단계부터 연구합니다. 숙련 Lv.2·6·12·20·30에서 차례로 열립니다. 연구한 공격 형태는 유닛의 합성 등급을 넘지 않습니다.',
    '기본 공격 총피해는 한 번의 공격에 포함된 기본 타격 피해의 합계입니다. 추가 타격 보너스·치명타·적 방어를 적용하기 전 값입니다. 형태 설명의 비율은 타격별 피해 비중입니다.',
    '옛 저장의 강화 수치는 현재 성장 단계로 표시하지 않습니다. 공통 능력치는 [병종 스탯](unit-stats.md)을 참고하세요.',
    '',
];
for (const DEFINITION of SPECIES_ABILITY_DEFINITIONS) {
    const GROWTH = growthForAbility(DEFINITION.id),
        PRESENTATION = growthPresentationFor(DEFINITION.id);
    LINES.push(
        `## ${speciesById(DEFINITION.species).name} · ${PRESENTATION.title}`,
        '',
        PRESENTATION.note,
        '',
        '| 공격 형태 | 동작과 피해 |',
        '| --- | --- |',
        ...PRESENTATION.forms.map(([name, effect], index) => `| T${index + 1} ${name} | ${effect} |`),
        '',
        '| 성장 항목 | 강화 단계 | 효과 | 단계당 비용 |',
        '| --- | --- | --- | --- |',
        ...GROWTH.definition.nodes
            .filter((node) => node.kind !== 'evolution')
            .flatMap((node) =>
                Array.from(
                    { length: node.maxRank + 1 },
                    (_, rank) =>
                        `| ${node.name} | ${rank}/${node.maxRank} | ${PRESENTATION.effect(node.id, rank)} | ${node.pointCost}P |`,
                ),
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
