import { SPECIES_CATALOG } from '../../species-catalog.js';

export const SPECIES_MASTERY_CAP = 50;
export const EVOLUTION_UNLOCK_LEVELS = Object.freeze([2, 6, 12, 20, 30]);

// Rollout is explicit: a species is enabled only with its attack, effects, UI and save consumer.
// All nine species have their attack, growth presentation and save consumer enabled.
export const SPECIES_GROWTH_DEFINITIONS = Object.freeze(
    SPECIES_CATALOG.map(({ id }) =>
        createSpeciesGrowthDefinition(
            id,
            id === 1
                ? {
                      available: true,
                      basic: ['평타 위력', '부착 폭발 위력', '공격 속도'],
                      specialty: ['연쇄 가열', '마무리 파열', '추가 알'],
                  }
                : id === 0
                  ? {
                        available: true,
                        basic: ['박치기 위력', '첫 재돌진 위력', '후딜 감소'],
                        specialty: ['재접근 가속', '첫 충돌', '마지막 충돌'],
                    }
                  : id === 2
                    ? {
                          available: true,
                          basic: ['도약 위력', '최대 체력', '공격 속도'],
                          specialty: ['착지 범위', '연속 도약', '마무리 착지'],
                      }
                    : id === 3
                      ? {
                            available: true,
                            basic: ['가시 위력', '최대 체력', '공격 속도'],
                            specialty: ['가시 밀도', '가시 사거리', '집중 마무리'],
                        }
                      : id === 4
                        ? {
                              available: true,
                              basic: ['협공 위력', '최대 체력', '공격 속도'],
                              specialty: ['협공 범위', '중앙 마무리', '분열체 강화'],
                          }
                        : id === 5
                          ? {
                                available: true,
                                basic: ['망치 위력', '최대 체력', '공격 속도'],
                                specialty: ['방어력', '저장 피해 전환', '강타 위력'],
                            }
                          : id === 6
                            ? {
                                  available: true,
                                  basic: ['낫 위력', '최대 체력', '공격 속도'],
                                  specialty: ['수확 치명', '낫 범위', '마지막 수확'],
                              }
                            : id === 7
                              ? {
                                    available: true,
                                    basic: ['지휘봉 위력', '최대 체력', '공격 속도'],
                                    specialty: ['지휘 공속', '지휘 반경', '마무리 강세'],
                                }
                              : id === 8
                                ? {
                                      available: true,
                                      basic: ['도리깨 위력', '최대 체력', '공격 속도'],
                                      specialty: ['방어 파쇄', '파쇄 지속', '마무리 강타'],
                                  }
                                : {},
        ),
    ),
);

export function createSpeciesGrowthDefinition(species, { available = false, basic = [], specialty = [] } = {}) {
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
