import { format as FORMAT } from 'prettier';
import { readFile, writeFile } from 'node:fs/promises';
import { SPECIES_ABILITY_DEFINITIONS, abilityPresentationFor } from '../src/ability-catalog.js';
import { speciesById } from '../src/species-catalog.js';
import { abilityProfile } from '../src/unit-abilities.js';

// Documentation and the upgrade panel use the same feature-owned definitions and formatters.
const LINES = [
    '# \uC885\uC871 \uB300\uD45C \uB2A5\uB825 \uD6A8\uACFC',
    '',
    '\uC774 \uBB38\uC11C\uB294 \uC885\uC871\uBCC4 \uAE30\uBCF8 \uB2A5\uB825\uACFC \uAC15\uD654 \uC218\uCE58\uB97C \uC815\uB9AC\uD569\uB2C8\uB2E4. node scripts/ability-reference.mjs\uB85C \uC0DD\uC131\uD569\uB2C8\uB2E4.',
    '\uC77C\uBC18 \uBCD1\uC885 \uB300\uD45C \uB2A5\uB825\uC740 Common(T1)\uBD80\uD130 \uBB34\uB8CC\uB85C \uC801\uC6A9\uB429\uB2C8\uB2E4.',
    '\uB300\uD45C \uB2A5\uB825\uC758 \uC218\uCE58\uC640 \uAC15\uD654 \uB2E8\uACC4\uB97C \uD655\uC778\uD558\uC138\uC694. \uACF5\uD1B5 \uC804\uD22C \uC2A4\uD0EF\uC740 [\uBCD1\uC885 \uC2A4\uD0EF](unit-stats.md)\uC744 \uCC38\uACE0\uD558\uC138\uC694.',
    '',
    '',
];
for (const DEFINITION of SPECIES_ABILITY_DEFINITIONS) {
    const PRESENTATION = abilityPresentationFor(DEFINITION.id),
        ACCESS_LABEL =
            'Common(T1)\uBD80\uD130 \uC790\uB3D9 \uC801\uC6A9. \uD3EC\uC778\uD2B8\uB85C \uD6A8\uACFC\uB97C \uAC15\uD654\uD569\uB2C8\uB2E4.';
    LINES.push(
        `## ${speciesById(DEFINITION.species).name} · ${DEFINITION.name}`,
        '',
        DEFINITION.description,
        '',
        ACCESS_LABEL,
        '',
        '| 단계 | 실제 효과 |',
        '| --- | --- |',
        ...DEFINITION.powerValues.map(
            (value, level) =>
                `| ${level === 0 ? '\uAE30\uBCF8 \uB2A5\uB825' : `\uAC15\uD654 ${level}`} | ${PRESENTATION.label(DEFINITION, value, level, abilityProfile(DEFINITION.species))} |`,
        ),
        ...Object.entries(DEFINITION.branches || {}).flatMap(([branchId, branch]) =>
            branch.values.map((value, level) => {
                const NAME = level === 0 ? `${branch.name} 기본` : `${branch.name} 강화 ${level}`;
                return `| ${NAME} | ${PRESENTATION.branchLabel?.(DEFINITION, branchId, value, level, abilityProfile(DEFINITION.species)) ?? `${branch.name} ${value}`} |`;
            }),
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
