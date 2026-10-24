import assert from 'node:assert/strict';
import { SPECIES_ABILITY_DEFINITIONS } from '../src/ability-catalog.js';
import { growthForAbility } from '../src/features/species-growth/state.js';
import { growthPresentationFor } from '../src/species-growth-presentation.js';

let forms = 0;
let effects = 0;
for (const ABILITY of SPECIES_ABILITY_DEFINITIONS) {
    const PRESENTATION = growthPresentationFor(ABILITY.id);
    const GROWTH = growthForAbility(ABILITY.id);
    assert.equal(PRESENTATION.forms.length, 6);
    forms += PRESENTATION.forms.length;
    const STRINGS = [PRESENTATION.title, PRESENTATION.note, ...PRESENTATION.forms.flat()];
    for (const NODE of GROWTH.definition.nodes.filter((entry) => entry.kind !== 'evolution')) {
        STRINGS.push(NODE.name);
        for (let rank = 0; rank <= NODE.maxRank; rank++) {
            STRINGS.push(PRESENTATION.effect(NODE.id, rank));
            effects++;
        }
    }
    for (const TEXT of STRINGS) {
        assert.ok(TEXT.trim().length > 0, ABILITY.id);
        assert.doesNotMatch(
            TEXT,
            /RAW|예산|슬롯|스윕|공속|후딜|런|피해은|피해을|피해과|공격 공격/,
            `${ABILITY.id}: ${TEXT}`,
        );
    }
}
assert.equal(forms, 54);
assert.equal(effects, 459);
const WALNUT = growthPresentationFor('walnut-raw-guard');
assert.match(WALNUT.effect('specialty-2', 0), /100%.*기본 공격 총피해의 3배/);
assert.match(WALNUT.effect('specialty-2', 5), /225%.*기본 공격 총피해의 3배/);
assert.match(WALNUT.note, /치명타와 적 방어를 적용하기 전/);
console.log(
    JSON.stringify({ species: SPECIES_ABILITY_DEFINITIONS.length, forms, rankEffects: effects, status: 'passed' }),
);
