import { SPECIES_CATALOG } from '../../units/species-catalog.js';

export const SPECIES_MASTERY_CAP = 50;
const EVOLUTION_UNLOCK_LEVELS = Object.freeze([2, 6, 12, 20, 30]);

// Rollout is explicit: a species is enabled only with its attack, effects, UI and save consumer.
// All nine species have their attack, growth presentation and save consumer enabled.
const SPECIES_GROWTH_DEFINITIONS = Object.freeze(
    SPECIES_CATALOG.map(({ id }) =>
        createSpeciesGrowthDefinition(
            id,
            id === 1
                ? {
                      available: true,
                      basic: [
                          { ko: '기본 공격 위력', en: 'Attack Power' },
                          { ko: '부착 폭발 위력', en: 'Blast Power' },
                          { ko: '공격 속도', en: 'Attack Speed' },
                      ],
                      specialty: [
                          { ko: '연쇄 폭발 강화', en: 'Chain Blast' },
                          { ko: '마지막 폭발', en: 'Final Blast' },
                          { ko: '추가 알', en: 'Extra Kernel' },
                      ],
                  }
                : id === 0
                  ? {
                        available: true,
                        basic: [
                            { ko: '박치기 위력', en: 'Headbutt Power' },
                            { ko: '밀려난 뒤 공격 강화', en: 'Rebound Hit' },
                            { ko: '공격 후 대기 감소', en: 'Faster Recovery' },
                        ],
                        specialty: [
                            { ko: '빠른 복귀', en: 'Quick Return' },
                            { ko: '첫 충돌', en: 'First Impact' },
                            { ko: '마지막 충돌', en: 'Final Impact' },
                        ],
                    }
                  : id === 2
                    ? {
                          available: true,
                          basic: [
                              { ko: '도약 위력', en: 'Leap Power' },
                              { ko: '최대 체력', en: 'Max HP' },
                              { ko: '공격 속도', en: 'Attack Speed' },
                          ],
                          specialty: [
                              { ko: '착지 범위', en: 'Landing Area' },
                              { ko: '연속 도약', en: 'Chain Leap' },
                              { ko: '마무리 착지', en: 'Finishing Landing' },
                          ],
                      }
                    : id === 3
                      ? {
                            available: true,
                            basic: [
                                { ko: '가시 위력', en: 'Thorn Power' },
                                { ko: '최대 체력', en: 'Max HP' },
                                { ko: '공격 속도', en: 'Attack Speed' },
                            ],
                            specialty: [
                                { ko: '가시 추가', en: 'Extra Thorn' },
                                { ko: '가시 사거리', en: 'Thorn Range' },
                                { ko: '마지막 가시', en: 'Final Thorn' },
                            ],
                        }
                      : id === 4
                        ? {
                              available: true,
                              basic: [
                                  { ko: '협공 위력', en: 'Pincer Power' },
                                  { ko: '최대 체력', en: 'Max HP' },
                                  { ko: '공격 속도', en: 'Attack Speed' },
                              ],
                              specialty: [
                                  { ko: '협공 범위', en: 'Pincer Area' },
                                  { ko: '마지막 협공', en: 'Final Pincer' },
                                  { ko: '분열체 강화', en: 'Stronger Halves' },
                              ],
                          }
                        : id === 5
                          ? {
                                available: true,
                                basic: [
                                    { ko: '망치 위력', en: 'Hammer Power' },
                                    { ko: '최대 체력', en: 'Max HP' },
                                    { ko: '공격 속도', en: 'Attack Speed' },
                                ],
                                specialty: [
                                    { ko: '방어력', en: 'Defense' },
                                    { ko: '반격 피해', en: 'Counter Damage' },
                                    { ko: '마지막 망치', en: 'Final Hammer' },
                                ],
                            }
                          : id === 6
                            ? {
                                  available: true,
                                  basic: [
                                      { ko: '낫 위력', en: 'Sickle Power' },
                                      { ko: '최대 체력', en: 'Max HP' },
                                      { ko: '공격 속도', en: 'Attack Speed' },
                                  ],
                                  specialty: [
                                      { ko: '치명타 확률', en: 'Crit Chance' },
                                      { ko: '낫 범위', en: 'Sickle Reach' },
                                      { ko: '마지막 낫베기', en: 'Final Slash' },
                                  ],
                              }
                            : id === 7
                              ? {
                                    available: true,
                                    basic: [
                                        { ko: '지휘봉 위력', en: 'Baton Power' },
                                        { ko: '최대 체력', en: 'Max HP' },
                                        { ko: '공격 속도', en: 'Attack Speed' },
                                    ],
                                    specialty: [
                                        { ko: '지휘 공격 속도', en: 'Command Speed' },
                                        { ko: '지휘 반경', en: 'Command Radius' },
                                        { ko: '마지막 지휘봉', en: 'Final Baton' },
                                    ],
                                }
                              : id === 8
                                ? {
                                      available: true,
                                      basic: [
                                          { ko: '도리깨 위력', en: 'Flail Power' },
                                          { ko: '최대 체력', en: 'Max HP' },
                                          { ko: '공격 속도', en: 'Attack Speed' },
                                      ],
                                      specialty: [
                                          { ko: '방어 감소', en: 'Defense Break' },
                                          { ko: '방어 감소 시간', en: 'Break Duration' },
                                          { ko: '마지막 도리깨', en: 'Final Flail' },
                                      ],
                                  }
                                : {},
        ),
    ),
);

function createSpeciesGrowthDefinition(species, { available = false, basic = [], specialty = [] } = {}) {
    const NODES = [
        ...EVOLUTION_UNLOCK_LEVELS.map((level, index) => ({
            id: `evolution-${index + 2}`,
            kind: 'evolution',
            tier: index + 2,
            maxRank: 1,
            pointCost: 2,
            unlockLevels: [level],
            prerequisite: index === 0 ? null : `evolution-${index + 1}`,
            available,
        })),
        ...['basic', 'specialty'].flatMap((kind) =>
            Array.from({ length: 3 }, (_, index) => ({
                id: `${kind}-${index + 1}`,
                kind,
                name: (kind === 'basic' ? basic : specialty)[index] || null,
                maxRank: kind === 'basic' ? 10 : 5,
                pointCost: kind === 'basic' ? 1 : 2,
                unlockLevels:
                    kind === 'basic'
                        ? Array.from({ length: 10 }, (_, rank) => rank * 5 + 1)
                        : Array.from({ length: 5 }, (_, rank) => rank * 8 + 11),
                prerequisite: null,
                available,
            })),
        ),
    ];
    return Object.freeze({
        species,
        available,
        nodes: Object.freeze(
            NODES.map((node) => Object.freeze({ ...node, unlockLevels: Object.freeze(node.unlockLevels) })),
        ),
    });
}

export function speciesGrowthDefinition(species) {
    return SPECIES_GROWTH_DEFINITIONS.find((definition) => definition.species === species) || null;
}

export function growthTreeCapacity(definition) {
    return definition.nodes.reduce((total, node) => total + node.maxRank * node.pointCost, 0);
}
