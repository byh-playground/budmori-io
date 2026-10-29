import { BREED_RESERVATION_OWNER, MERGE_RESERVATION_OWNER, CONFIG, CLAMP } from './farm-config.js';
import { RECIPES, inheritGenes, inheritTemperament, lineageRandom, recipeFor } from './lineage.js';
import { mergeMaterialCostForTier } from '../units/unit-grades.js';
import { applyRunGrowthHealth, unitMaxHpFor } from '../units/unit-stats.js';
import { FARM_MODES } from './farm-mode-behaviors.js';
import { AUTO_FORM_PROGRESSION } from './auto-forms.js';
import { Unit as UNIT } from './farm-unit.js';
import { COMBINE_AIR } from '../features/farm-modes/combine/definition.js';

// What a group of materials turns into: the same species one tier up, or - for two different species with a recipe -
// the recipe's species at the same tier.
function mergeOutcome(materials) {
    const FIRST = materials[0];
    if (!FIRST) {
        return null;
    }
    if (materials.every((unit) => unit.species === FIRST.species)) {
        return { species: FIRST.species, tier: FIRST.tier + 1, recipe: null };
    }
    const RECIPE = materials.length === 2 ? recipeFor(materials[0].species, materials[1].species) : null;
    return RECIPE ? { species: RECIPE.result, tier: FIRST.tier, recipe: RECIPE } : null;
}
export const FARM_MERGE_BREED = (base) =>
    class FarmMergeBreed extends base {
        canBreedPair(a, b, requireContact = false) {
            const BATCH = !this._spatialStepActive;
            if (BATCH) {
                this._beginSpatialQueryBatch();
            }
            try {
                const OWNER = this.breedingReservationOwner(a, b),
                    BIRTH_RESERVATION = this._activeBreedReservations?.get(OWNER) || null,
                    RESERVATIONS_AVAILABLE =
                        this.unitCollection.reservationOwner(a) === null ||
                        this.unitCollection.reservationOwner(a) === OWNER;
                return (
                    this.scene === 'farm' &&
                    a !== b &&
                    !a.isBattleOnlySummon &&
                    !b.isBattleOnlySummon &&
                    this.canBreedNow(a) &&
                    this.canBreedNow(b) &&
                    a.hp > 0 &&
                    b.hp > 0 &&
                    a.species === b.species &&
                    a.mature &&
                    b.mature &&
                    a.fed &&
                    b.fed &&
                    a.cooldown <= 0 &&
                    b.cooldown <= 0 &&
                    this.freeRoom(BIRTH_RESERVATION ? OWNER : null) > 0 &&
                    this._unitIsActive(a) &&
                    this._unitIsActive(b) &&
                    RESERVATIONS_AVAILABLE &&
                    (this.unitCollection.reservationOwner(b) === null ||
                        this.unitCollection.reservationOwner(b) === OWNER) &&
                    (!requireContact || Math.hypot(a.x - b.x, a.y - b.y) <= a.radius + b.radius + 0.2)
                );
            } finally {
                if (BATCH) {
                    this._endSpatialQueryBatch();
                }
            }
        }
        breedingReservationOwner(a, b) {
            return BREED_RESERVATION_OWNER(a.id, b.id);
        }
        cancelBreedPlans() {
            for (const OWNER of [...(this._activeBreedReservations?.keys() || [])]) {
                this.releaseActiveBreedReservation(OWNER);
            }
            this._activeBreedReservations?.clear();
        }
        reserveActiveBreedPair(a, b) {
            const OWNER = this.breedingReservationOwner(a, b),
                EXISTING = this._activeBreedReservations.get(OWNER);
            if (EXISTING) {
                return EXISTING.parentIds.includes(a.id) && EXISTING.parentIds.includes(b.id);
            }
            if (
                !a ||
                !b ||
                !this.canBreedPair(a, b) ||
                a.down > 0 ||
                b.down > 0 ||
                (a.mateId && a.mateId !== b.id) ||
                (b.mateId && b.mateId !== a.id)
            ) {
                return false;
            }
            const RESERVATION = { species: a.species, owner: OWNER };
            if (!this.unitCollection.reserve(OWNER, [a, b])) {
                return false;
            }
            this._activeBreedReservations.set(OWNER, {
                owner: OWNER,
                parentIds: [a.id, b.id],
                reservation: RESERVATION,
            });
            a.mateId = b.id;
            b.mateId = a.id;
            return true;
        }
        releaseActiveBreedReservation(owner) {
            const RESERVATION = this._activeBreedReservations?.get(owner);
            if (!RESERVATION) {
                return false;
            }
            this._activeBreedReservations.delete(owner);
            this.unitCollection.releaseReservations(owner);
            for (const ID of RESERVATION.parentIds) {
                const UNIT_LOCAL = this.unitCollection.unitById(ID);
                if (UNIT_LOCAL?.mateId === RESERVATION.parentIds.find((otherId) => otherId !== ID)) {
                    UNIT_LOCAL.mateId = 0;
                }
            }
            return true;
        }
        _isValidBreedReservation(unit, owner) {
            if (!owner?.startsWith('breed:')) {
                return false;
            }
            const MATE = this._unitById.get(unit.mateId);
            return !!(
                MATE &&
                MATE.mateId === unit.id &&
                this.unitCollection.reservationOwner(MATE) === owner &&
                this.breedingReservationOwner(unit, MATE) === owner &&
                this.canBreedPair(unit, MATE) &&
                !this.senseEnemy(unit) &&
                !this.senseEnemy(MATE)
            );
        }
        releaseMate(unit) {
            if (!this._spatialStepActive && this._spatialQueryDepth === 0) {
                this._rebuildUnitSpatialIndex(this.units);
            }
            const MATE = this._unitById.get(unit.mateId);
            if (
                unit.mateId &&
                this.releaseActiveBreedReservation(
                    this.breedingReservationOwner(unit, this.unitCollection.unitById(unit.mateId)),
                )
            ) {
                return true;
            }
            unit.mateId = 0;
            if (MATE && MATE.mateId === unit.id) {
                MATE.mateId = 0;
            }
            const OWNER = this.unitCollection.reservationOwner(unit);
            if (OWNER?.startsWith('breed:')) {
                this.unitCollection.releaseReservations(OWNER);
            }
        }
        reconcileMateReservations() {
            const BATCH = !this._spatialStepActive;
            if (BATCH) {
                this._beginSpatialQueryBatch();
            }
            try {
                if (this.scene !== 'farm') {
                    for (const UNIT_LOCAL of this.units) {
                        this.releaseMate(UNIT_LOCAL);
                    }
                    return;
                }
                for (const TASK of [...this.mergeTasks]) {
                    if (TASK.phase !== 'approach') {
                        continue;
                    }
                    const MATERIALS = TASK.materialIds.map((id) => this._unitById.get(id)),
                        OWNER = MERGE_RESERVATION_OWNER(TASK.materialIds);
                    if (
                        !this.canMergeGroup(MATERIALS, { reservationOwner: OWNER }) ||
                        !this.unitCollection.reserve(OWNER, MATERIALS)
                    ) {
                        this.cancelMergeTask(TASK);
                    }
                }
                for (const UNIT_LOCAL of this.units) {
                    if (!UNIT_LOCAL.mateId) {
                        const OWNER = this.unitCollection.reservationOwner(UNIT_LOCAL);
                        if (OWNER?.startsWith('breed:')) {
                            this.unitCollection.releaseReservations(OWNER);
                        }
                        continue;
                    }
                    const MATE = this._unitById.get(UNIT_LOCAL.mateId);
                    if (
                        !MATE ||
                        MATE.mateId !== UNIT_LOCAL.id ||
                        !this.canBreedPair(UNIT_LOCAL, MATE) ||
                        !this.unitCollection.reserve(this.breedingReservationOwner(UNIT_LOCAL, MATE), [
                            UNIT_LOCAL,
                            MATE,
                        ])
                    ) {
                        this.releaseMate(UNIT_LOCAL);
                    }
                }
            } finally {
                if (BATCH) {
                    this._endSpatialQueryBatch();
                }
            }
        }
        findOrReserveMate(unit) {
            const BATCH = !this._spatialStepActive;
            if (BATCH) {
                this._beginSpatialQueryBatch();
            }
            try {
                if (
                    this.scene !== 'farm' ||
                    !unit.mature ||
                    !unit.fed ||
                    unit.cooldown > 0 ||
                    unit.hp <= 0 ||
                    this.senseEnemy(unit)
                ) {
                    this.releaseMate(unit);
                    return null;
                }
                if (this.freeRoom() <= 0) {
                    this.releaseMate(unit);
                    return null;
                }
                if (unit.mateId) {
                    const CURRENT = this._unitById.get(unit.mateId);
                    if (CURRENT && CURRENT.mateId === unit.id && this.canBreedPair(unit, CURRENT)) {
                        return CURRENT;
                    }
                    this.releaseMate(unit);
                }
                if (this.simulationTick < (unit.nextMateSearchTick || 0)) {
                    return null;
                }
                const CANDIDATES = [];
                for (const CANDIDATE of this.roster.residentsOfSpecies(unit.species)) {
                    if (
                        CANDIDATE === unit ||
                        CANDIDATE.mateId ||
                        CANDIDATE.hp <= 0 ||
                        CANDIDATE.down > 0 ||
                        !CANDIDATE.mature ||
                        !CANDIDATE.fed ||
                        CANDIDATE.cooldown > 0 ||
                        !this.canBreedNow(CANDIDATE) ||
                        this.unitCollection.reservationOwner(CANDIDATE) ||
                        !this.canBreedPair(unit, CANDIDATE)
                    ) {
                        continue;
                    }
                    CANDIDATES.push(CANDIDATE);
                }
                CANDIDATES.sort(
                    (a, b) =>
                        Math.hypot(a.x - unit.x, a.y - unit.y) - Math.hypot(b.x - unit.x, b.y - unit.y) || a.id - b.id,
                );
                for (const MATE of CANDIDATES) {
                    if (!this.reserveActiveBreedPair(unit, MATE)) {
                        continue;
                    }
                    unit.nextMateSearchTick = this.simulationTick + 10;
                    return MATE;
                }
                unit.nextMateSearchTick = this.simulationTick + 10;
                if (!CANDIDATES.length) {
                    return null;
                }
                return null;
            } finally {
                if (BATCH) {
                    this._endSpatialQueryBatch();
                }
            }
        }
        canMergeGroup(materials, { requireContact = false, requireNoEnemy = false, reservationOwner = null } = {}) {
            const BATCH = !this._spatialStepActive;
            if (BATCH) {
                this._beginSpatialQueryBatch();
            }
            try {
                if (!Array.isArray(materials) || materials.length < 2) {
                    return false;
                }
                const FIRST = materials[0],
                    OUTCOME = FIRST ? mergeOutcome(materials) : null;
                if (!OUTCOME) {
                    return false;
                }
                const COMBINE = OUTCOME.recipe !== null,
                    MATERIAL_COUNT = COMBINE ? 2 : mergeMaterialCostForTier(OUTCOME.tier);
                if (MATERIAL_COUNT < 2 || materials.length !== MATERIAL_COUNT || OUTCOME.tier > CONFIG.unit.maxTier) {
                    return false;
                }
                const IDS = new Set();
                for (const UNIT_LOCAL of materials) {
                    if (
                        !UNIT_LOCAL ||
                        IDS.has(UNIT_LOCAL.id) ||
                        UNIT_LOCAL.isBattleOnlySummon ||
                        UNIT_LOCAL.mergeEligible === false ||
                        UNIT_LOCAL.tier !== FIRST.tier ||
                        UNIT_LOCAL.hp <= 0 ||
                        UNIT_LOCAL.down > 0 ||
                        !UNIT_LOCAL.mature ||
                        UNIT_LOCAL.cooldown > 0 ||
                        (this.unitCollection.reservationOwner(UNIT_LOCAL) &&
                            this.unitCollection.reservationOwner(UNIT_LOCAL) !== reservationOwner &&
                            (reservationOwner ||
                                !this._isValidBreedReservation(
                                    UNIT_LOCAL,
                                    this.unitCollection.reservationOwner(UNIT_LOCAL),
                                ))) ||
                        !this._unitIsActive(UNIT_LOCAL)
                    ) {
                        return false;
                    }
                    IDS.add(UNIT_LOCAL.id);
                }
                // Sleeping owned units count toward the minimum roster, but cannot be
                // consumed. The resulting same-species count must remain at least two.
                const EXCLUDED_TASK = reservationOwner
                    ? this.mergeTasks.find(
                          (task) => MERGE_RESERVATION_OWNER(task.materialIds || []) === reservationOwner,
                      )
                    : null;
                for (const MATERIAL_SPECIES of new Set(materials.map((unit) => unit.species))) {
                    const LOSS = COMBINE ? 1 : MATERIAL_COUNT - 1;
                    if (
                        this._ownedSpeciesCounts[MATERIAL_SPECIES] -
                            this._pendingMergeCost(MATERIAL_SPECIES, EXCLUDED_TASK) -
                            LOSS <
                        2
                    ) {
                        return false;
                    }
                }
                if (requireNoEnemy && materials.some((unit) => this.senseEnemy(unit))) {
                    return false;
                }
                if (requireContact) {
                    const ANCHOR = materials[0];
                    for (let index = 1; index < materials.length; index++) {
                        const UNIT_LOCAL = materials[index];
                        if (
                            Math.hypot(ANCHOR.x - UNIT_LOCAL.x, ANCHOR.y - UNIT_LOCAL.y) >
                            ANCHOR.radius + UNIT_LOCAL.radius + 0.2
                        ) {
                            return false;
                        }
                    }
                }
                return true;
            } finally {
                if (BATCH) {
                    this._endSpatialQueryBatch();
                }
            }
        }
        canMergePair(a, b, options = {}) {
            return this.canMergeGroup([a, b], options);
        }
        _collectMergeEligible() {
            for (const GROUP of this._mergeEligibleGroups) {
                GROUP.length = 0;
            }
            for (const GROUP of this._speciesTierGroups) {
                for (const UNIT_LOCAL of GROUP) {
                    if (
                        !UNIT_LOCAL.isBattleOnlySummon &&
                        UNIT_LOCAL.mergeEligible !== false &&
                        UNIT_LOCAL.hp > 0 &&
                        UNIT_LOCAL.down <= 0 &&
                        UNIT_LOCAL.mature &&
                        UNIT_LOCAL.cooldown <= 0 &&
                        (!this.unitCollection.reservationOwner(UNIT_LOCAL) ||
                            this._isValidBreedReservation(
                                UNIT_LOCAL,
                                this.unitCollection.reservationOwner(UNIT_LOCAL),
                            )) &&
                        !this.senseEnemy(UNIT_LOCAL)
                    ) {
                        this._mergeEligibleGroups[
                            UNIT_LOCAL.species * (CONFIG.unit.maxTier + 1) + UNIT_LOCAL.tier
                        ].push(UNIT_LOCAL);
                    }
                }
            }
        }
        selectCombineMaterials(recipeIndex, tier) {
            const RECIPE = RECIPES[recipeIndex];
            if (this.scene !== 'farm' || !RECIPE || !Number.isInteger(tier) || tier < 1 || tier > CONFIG.unit.maxTier) {
                return null;
            }
            const BATCH = !this._spatialStepActive;
            if (BATCH) {
                this._beginSpatialQueryBatch();
            }
            try {
                this._collectMergeEligible();
                const FIRST_GROUP = this._mergeEligibleGroups[RECIPE.a * (CONFIG.unit.maxTier + 1) + tier],
                    SECOND_GROUP = this._mergeEligibleGroups[RECIPE.b * (CONFIG.unit.maxTier + 1) + tier];
                let best = null,
                    bestDistance = Infinity;
                for (const A of FIRST_GROUP) {
                    for (const B of SECOND_GROUP) {
                        const DISTANCE = (A.x - B.x) ** 2 + (A.y - B.y) ** 2;
                        if (
                            DISTANCE < bestDistance ||
                            (DISTANCE === bestDistance && best && A.id + B.id < best[0].id + best[1].id)
                        ) {
                            if (this.canMergeGroup([A, B], { requireNoEnemy: true })) {
                                best = [A, B];
                                bestDistance = DISTANCE;
                            }
                        }
                    }
                }
                return best;
            } finally {
                if (BATCH) {
                    this._endSpatialQueryBatch();
                }
            }
        }
        selectMergeMaterials() {
            if (this.scene !== 'farm') {
                return null;
            }
            const BATCH = !this._spatialStepActive;
            if (BATCH) {
                this._beginSpatialQueryBatch();
            }
            try {
                this._collectMergeEligible();
                const COMPARE_IDS = (left, right) => {
                    for (let index = 0; index < left.length; index++) {
                        if (left[index] !== right[index]) {
                            return left[index] - right[index];
                        }
                    }
                    return 0;
                };
                let bestTier = Infinity;
                let bestDistance = Infinity;
                let bestAnchorId = Infinity;
                let bestMaterialIds = null;
                let bestSortedIds = null;
                const NEAREST = this._mergeNearestScratch,
                    MATERIALS = this._mergeMaterialsScratch,
                    SORTED_IDS = this._mergeIdScratch;
                for (let tier = 1; tier < CONFIG.unit.maxTier; tier++) {
                    const MATERIAL_COUNT = mergeMaterialCostForTier(tier + 1),
                        NEAREST_COUNT = MATERIAL_COUNT - 1;
                    if (MATERIAL_COUNT < 2) {
                        continue;
                    }
                    for (let species = 0; species < CONFIG.unit.speciesCount; species++) {
                        const GROUP = this._mergeEligibleGroups[species * (CONFIG.unit.maxTier + 1) + tier];
                        if (
                            GROUP.length < MATERIAL_COUNT ||
                            this._ownedSpeciesCounts[species] - this._pendingMergeCost(species) - MATERIAL_COUNT + 1 < 2
                        ) {
                            continue;
                        }
                        for (const ANCHOR of GROUP) {
                            NEAREST.length = 0;
                            for (const UNIT_LOCAL of GROUP) {
                                if (UNIT_LOCAL === ANCHOR) {
                                    continue;
                                }
                                const DISTANCE = (UNIT_LOCAL.x - ANCHOR.x) ** 2 + (UNIT_LOCAL.y - ANCHOR.y) ** 2;
                                let insertAt = NEAREST.length;
                                for (let position = 0; position < NEAREST.length; position++) {
                                    const CURRENT = NEAREST[position];
                                    if (
                                        DISTANCE < CURRENT.distance ||
                                        (DISTANCE === CURRENT.distance && UNIT_LOCAL.id < CURRENT.unit.id)
                                    ) {
                                        insertAt = position;
                                        break;
                                    }
                                }
                                if (insertAt >= NEAREST_COUNT) {
                                    continue;
                                }
                                NEAREST.splice(insertAt, 0, {
                                    unit: UNIT_LOCAL,
                                    distance: DISTANCE,
                                });
                                if (NEAREST.length > NEAREST_COUNT) {
                                    NEAREST.length = NEAREST_COUNT;
                                }
                            }
                            if (NEAREST.length !== NEAREST_COUNT) {
                                continue;
                            }
                            MATERIALS.length = 0;
                            MATERIALS.push(ANCHOR);
                            for (const ENTRY of NEAREST) {
                                MATERIALS.push(ENTRY.unit);
                            }
                            if (
                                !this.canMergeGroup(MATERIALS, {
                                    requireNoEnemy: true,
                                })
                            ) {
                                continue;
                            }
                            let distance = 0;
                            for (let i = 0; i < MATERIALS.length; i++) {
                                for (let j = i + 1; j < MATERIALS.length; j++) {
                                    distance +=
                                        (MATERIALS[i].x - MATERIALS[j].x) ** 2 + (MATERIALS[i].y - MATERIALS[j].y) ** 2;
                                }
                            }
                            if (tier > bestTier || (tier === bestTier && distance > bestDistance)) {
                                continue;
                            }
                            SORTED_IDS.length = 0;
                            for (const UNIT_LOCAL of MATERIALS) {
                                SORTED_IDS.push(UNIT_LOCAL.id);
                            }
                            SORTED_IDS.sort((a, b) => a - b);
                            const IDS_ORDER = bestSortedIds ? COMPARE_IDS(SORTED_IDS, bestSortedIds) : -1;
                            if (
                                bestMaterialIds &&
                                (tier > bestTier ||
                                    (tier === bestTier &&
                                        (distance > bestDistance ||
                                            (distance === bestDistance &&
                                                (IDS_ORDER > 0 || (IDS_ORDER === 0 && ANCHOR.id >= bestAnchorId))))))
                            ) {
                                continue;
                            }
                            bestTier = tier;
                            bestDistance = distance;
                            bestAnchorId = ANCHOR.id;
                            bestMaterialIds = MATERIALS.map((unit) => unit.id);
                            bestSortedIds = [...SORTED_IDS];
                        }
                    }
                }
                return bestMaterialIds ? bestMaterialIds.map((id) => this._unitById.get(id)) : null;
            } finally {
                if (BATCH) {
                    this._endSpatialQueryBatch();
                }
            }
        }
        mergeDecision() {
            if (this.scene !== 'farm') {
                return {
                    available: false,
                    code: 'wrong-scene',
                    reason: '농장 화면에서만 합성할 수 있어요.',
                };
            }
            if (this.farmBossEvent?.phase !== 'idle') {
                return {
                    available: false,
                    code: 'boss-event',
                    reason: '레이드 중에는 합성할 수 없어요.',
                };
            }
            const MATERIALS = this.selectMergeMaterials();
            if (!MATERIALS) {
                return {
                    available: false,
                    code: 'no-eligible-materials',
                    reason: '합성할 수 있는 같은 병종이 부족해요.',
                };
            }
            return {
                available: true,
                code: 'ready',
                tier: MATERIALS[0].tier + 1,
                materialCount: MATERIALS.length,
                materials: MATERIALS,
                reason:
                    'T' + MATERIALS[0].tier + ' ' + MATERIALS.length + '마리 → T' + (MATERIALS[0].tier + 1) + ' 합성',
            };
        }
        mergeAvailability() {
            const DECISION = this.mergeDecision();
            return {
                available: DECISION.available,
                code: DECISION.code,
                reason: DECISION.reason,
                ...(DECISION.available
                    ? {
                          tier: DECISION.tier,
                          materialCount: DECISION.materialCount,
                      }
                    : {}),
            };
        }
        setCombineSelection(recipe, tier) {
            if (
                !Number.isInteger(recipe) ||
                recipe < -1 ||
                recipe >= RECIPES.length ||
                !Number.isInteger(tier) ||
                tier < 1 ||
                tier > CONFIG.unit.maxTier ||
                (recipe === this.combine.recipe && tier === this.combine.tier)
            ) {
                return false;
            }
            this.combine = { recipe, tier };
            this._markMergeAvailabilityChanged();
            this.markProgressChanged();
            return true;
        }
        combineDecision() {
            if (this.scene !== 'farm') {
                return { available: false, code: 'wrong-scene', reason: '농장 화면에서만 조합할 수 있어요.' };
            }
            if (this.farmBossEvent?.phase !== 'idle') {
                return { available: false, code: 'boss-event', reason: '레이드 중에는 조합할 수 없어요.' };
            }
            const RECIPE = RECIPES[this.combine.recipe];
            if (!RECIPE) {
                return { available: false, code: 'no-recipe', reason: '도감에서 조합식을 골라 주세요.' };
            }
            const MATERIALS = this.selectCombineMaterials(this.combine.recipe, this.combine.tier);
            if (!MATERIALS) {
                return {
                    available: false,
                    code: 'no-eligible-materials',
                    reason: `T${this.combine.tier} 재료가 부족해요. 번식을 위해 각 병종을 최소 2마리(전체 등급 합산) 남기고, 같은 등급의 성체를 각 1마리씩 사용할 수 있어야 해요.`,
                };
            }
            return {
                available: true,
                code: 'ready',
                tier: this.combine.tier,
                materialCount: 2,
                materials: MATERIALS,
                reason: `T${this.combine.tier} 조합`,
            };
        }
        combineAvailability() {
            const DECISION = this.combineDecision();
            return { available: DECISION.available, code: DECISION.code, reason: DECISION.reason };
        }
        startManualMerge(combine = false) {
            return this.mutateUnits(this._startManualMerge, combine);
        }
        _startManualMerge(combine) {
            const DECISION = combine ? this.combineDecision() : this.mergeDecision();
            if (!DECISION.available) {
                return false;
            }
            const MATERIALS = DECISION.materials;
            const MATERIAL_IDS = MATERIALS.map((unit) => unit.id),
                OWNER = MERGE_RESERVATION_OWNER(MATERIAL_IDS),
                CENTER_X = MATERIALS.reduce((sum, unit) => sum + unit.x, 0) / MATERIALS.length,
                CENTER_Y = MATERIALS.reduce((sum, unit) => sum + unit.y, 0) / MATERIALS.length,
                DURATION = CONFIG.farm.merge.animationSeconds,
                SEQUENCE_WINDOW = DURATION * 0.72,
                STEP = SEQUENCE_WINDOW / MATERIALS.length;
            const REPLACE_OWNERS = [
                ...new Set(
                    MATERIALS.map((unit) => this.unitCollection.reservationOwner(unit)).filter((owner) =>
                        owner?.startsWith('breed:'),
                    ),
                ),
            ];
            if (!this.unitCollection.reserve(OWNER, MATERIALS, { replaceOwners: REPLACE_OWNERS })) {
                return false;
            }
            for (const UNIT_LOCAL of MATERIALS) {
                this.clearFoodTargetSearch(UNIT_LOCAL);
                const MATE = this._unitById.get(UNIT_LOCAL.mateId);
                UNIT_LOCAL.mateId = 0;
                if (MATE?.mateId === UNIT_LOCAL.id) {
                    MATE.mateId = 0;
                }
            }
            const TASK = {
                phase: 'approach',
                aId: MATERIAL_IDS[0],
                bId: MATERIAL_IDS[1],
                materialIds: MATERIAL_IDS,
                startPositions: MATERIALS.map(({ id, x, y, z }) => ({ id, x, y, z })),
                centerX: CENTER_X,
                centerY: CENTER_Y,
                centerZ: CONFIG.farm.merge.centerHeight,
                sourceSpecies: MATERIALS[0].species,
                partnerSpecies: combine ? MATERIALS[1].species : -1,
                sourceTier: MATERIALS[0].tier,
                elapsed: 0,
                duration: DURATION,
            };
            this.mergeTasks.push(TASK);
            MATERIALS.forEach((unit, index) =>
                this.effects.push({
                    kind: 'merge-material',
                    taskKey: OWNER,
                    combine: !!combine,
                    x: unit.x,
                    y: unit.y,
                    z: unit.z,
                    targetX: CENTER_X,
                    targetY: CENTER_Y,
                    targetZ: TASK.centerZ,
                    life: 0,
                    delay: index * STEP,
                    span: STEP,
                    duration: (index + 1) * STEP,
                    sequenceIndex: index,
                    sequenceCount: MATERIALS.length,
                }),
            );
            this._markMergeTasksChanged();
            return true;
        }
        cancelMergeTask(task = this.mergeTask) {
            const TASK = task,
                INDEX = this.mergeTasks.indexOf(TASK);
            if (INDEX < 0) {
                return false;
            }
            if (TASK.materialIds?.length) {
                const OWNER = MERGE_RESERVATION_OWNER(TASK.materialIds);
                if (TASK.phase === 'approach') {
                    for (const ID of TASK.materialIds) {
                        const UNIT_LOCAL = this._unitById.get(ID);
                        if (UNIT_LOCAL && this.unitCollection.has(UNIT_LOCAL) && UNIT_LOCAL.hp > 0) {
                            UNIT_LOCAL.z = 0;
                            UNIT_LOCAL.vx = UNIT_LOCAL.vy = UNIT_LOCAL.vz = 0;
                            UNIT_LOCAL.moveControlActive = false;
                            UNIT_LOCAL.dropLanded = true;
                            this.updateUnitSpatial(UNIT_LOCAL);
                        }
                    }
                    for (let index = this.effects.length - 1; index >= 0; index--) {
                        if (this.effects[index].taskKey === OWNER) {
                            this.effects.splice(index, 1);
                        }
                    }
                }
                this.unitCollection.releaseReservations(OWNER);
            }
            this.mergeTasks.splice(INDEX, 1);
            this._markMergeTasksChanged();
            return true;
        }
        cancelMergeTasks() {
            const TASKS = [...this.mergeTasks];
            for (const TASK of TASKS) {
                this.cancelMergeTask(TASK);
            }
            return TASKS.length > 0;
        }
        advanceMergeTask(dt) {
            if (this.scene !== 'farm') {
                this.cancelMergeTasks();
                return;
            }
            if (this.farmBossEvent?.phase !== 'idle') {
                this.cancelMergeTasks();
                return;
            }
            for (const TASK of [...this.mergeTasks]) {
                if (TASK.phase === 'animation') {
                    TASK.elapsed = Math.min(TASK.duration, TASK.elapsed + dt);
                    if (TASK.elapsed >= TASK.duration - 1e-9) {
                        this.cancelMergeTask(TASK);
                    }
                    continue;
                }
                if (TASK.phase === 'approach') {
                    const MATERIALS = TASK.materialIds.map((id) => this._unitById.get(id)),
                        OWNER = MERGE_RESERVATION_OWNER(TASK.materialIds);
                    if (
                        !this.canMergeGroup(MATERIALS, {
                            requireNoEnemy: true,
                            reservationOwner: OWNER,
                        }) ||
                        !this.unitCollection.reserve(OWNER, MATERIALS)
                    ) {
                        this.cancelMergeTask(TASK);
                        continue;
                    }
                    TASK.elapsed = Math.min(TASK.duration, TASK.elapsed + dt);
                    const PROGRESS = CLAMP(TASK.elapsed / TASK.duration, 0, 1),
                        EASE_IN = PROGRESS ** 2.25,
                        MOVE_DT = Math.max(dt, 1e-6);
                    for (const [INDEX, UNIT_LOCAL] of MATERIALS.entries()) {
                        const START = TASK.startPositions[INDEX],
                            OLD_X = UNIT_LOCAL.x,
                            OLD_Y = UNIT_LOCAL.y,
                            OLD_Z = UNIT_LOCAL.z,
                            NEXT_X = START.x + (TASK.centerX - START.x) * EASE_IN,
                            NEXT_Y = START.y + (TASK.centerY - START.y) * EASE_IN,
                            NEXT_Z = START.z + (TASK.centerZ - START.z) * EASE_IN;
                        UNIT_LOCAL.x = NEXT_X;
                        UNIT_LOCAL.y = NEXT_Y;
                        UNIT_LOCAL.z = NEXT_Z;
                        UNIT_LOCAL.vx = (NEXT_X - OLD_X) / MOVE_DT;
                        UNIT_LOCAL.vy = (NEXT_Y - OLD_Y) / MOVE_DT;
                        UNIT_LOCAL.vz = (NEXT_Z - OLD_Z) / MOVE_DT;
                        UNIT_LOCAL.moveControlActive = false;
                        UNIT_LOCAL.angle = Math.atan2(TASK.centerY - NEXT_Y, TASK.centerX - NEXT_X);
                        this.updateUnitSpatial(UNIT_LOCAL);
                    }
                }
            }
        }
        resolveMergeTaskAfterMovement() {
            let resolved = false;
            for (const TASK of [...this.mergeTasks]) {
                if (TASK.phase !== 'approach') {
                    continue;
                }
                const MATERIALS = TASK.materialIds.map((id) => this._unitById.get(id)),
                    OWNER = MERGE_RESERVATION_OWNER(TASK.materialIds);
                if (TASK.elapsed < TASK.duration - 1e-9) {
                    continue;
                }
                if (
                    this.canMergeGroup(MATERIALS, {
                        requireNoEnemy: true,
                        reservationOwner: OWNER,
                    }) &&
                    this.mergeGroup(MATERIALS, { task: TASK })
                ) {
                    resolved = true;
                } else {
                    this.cancelMergeTask(TASK);
                }
            }
            return resolved;
        }
        pair(a, b) {
            return this.mutateUnits(this._pair, a, b);
        }
        _pair(a, b) {
            return FARM_MODES.breed.pair(this, a, b);
        }
        mergeGroup(materials, options) {
            return this.mutateUnits(this._mergeGroup, materials, options);
        }
        _mergeGroup(materials, { task: taskParam } = {}) {
            const TASK = taskParam;
            const TASK_INDEX = this.mergeTasks.indexOf(TASK),
                OWNER = TASK?.materialIds ? MERGE_RESERVATION_OWNER(TASK.materialIds) : null;
            if (
                TASK_INDEX < 0 ||
                TASK?.phase !== 'approach' ||
                this.scene !== 'farm' ||
                !OWNER ||
                TASK.materialIds.length !== materials.length ||
                !TASK.materialIds.every((id, index) => materials[index]?.id === id) ||
                TASK.elapsed < TASK.duration - 1e-9 ||
                !this.canMergeGroup(materials, {
                    requireNoEnemy: true,
                    reservationOwner: OWNER,
                })
            ) {
                return false;
            }
            const ORDERED = [...materials],
                FIRST = ORDERED[0],
                MATERIAL_IDS = ORDERED.map((unit) => unit.id),
                X = TASK.centerX,
                Y = TASK.centerY,
                Z = TASK.centerZ;
            // Prepare the complete result before the collection owner commits the
            // replacement. A failed preparation never consumes existing units.
            const OUTCOME = mergeOutcome(ORDERED),
                RESULT = new UNIT(this.nextId, OUTCOME.species, OUTCOME.tier, X, Y);
            const LINEAGE_RANDOM = lineageRandom(this.seed, this.nextId, 2);
            RESULT.temperament = inheritTemperament(
                ORDERED.map((unit) => unit.temperament),
                LINEAGE_RANDOM,
            );
            RESULT.genes = inheritGenes(
                ORDERED.map((unit) => unit.genes),
                LINEAGE_RANDOM,
            );
            RESULT.hp = unitMaxHpFor(RESULT);
            applyRunGrowthHealth(RESULT, AUTO_FORM_PROGRESSION, { preserveRatio: true });
            RESULT.dropLanded = false;
            RESULT.meals = 1;
            RESULT.growth = CONFIG.farm.breeding.matureMeals;
            RESULT.growthDuration = this.breedGrowthDuration();
            RESULT.growthElapsed = RESULT.growthDuration;
            RESULT.z = Math.max(0, Z - RESULT.height * 0.85);
            RESULT.vz = -CONFIG.farm.merge.resultFallVelocity;
            RESULT.cooldown = CONFIG.farm.merge.cooldownSeconds;
            RESULT.cooldownDuration = RESULT.cooldown;
            const SEQUENCE_WINDOW = CONFIG.farm.merge.animationSeconds * 0.72,
                STEP = SEQUENCE_WINDOW / ORDERED.length;
            if (
                !this.replaceUnitGroup(
                    ORDERED,
                    RESULT,
                    () => {
                        this.nextId++;
                        TASK.phase = 'animation';
                        TASK.aId = 0;
                        TASK.bId = 0;
                        TASK.materialIds = MATERIAL_IDS;
                        TASK.resultId = RESULT.id;
                        TASK.sourceSpecies = FIRST.species;
                        TASK.partnerSpecies = OUTCOME.recipe ? ORDERED[1].species : -1;
                        TASK.sourceTier = FIRST.tier;
                        this.recordCodex(RESULT);
                        if (OUTCOME.recipe) {
                            this.recordRecipe(RECIPES.indexOf(OUTCOME.recipe));
                        }
                        TASK.elapsed = 0;
                        TASK.duration = CONFIG.farm.merge.animationSeconds;
                        this._markMergeTasksChanged();
                        ORDERED.forEach((unit, index) =>
                            this.effects.push({
                                kind: 'merge-material',
                                combine: !!OUTCOME.recipe,
                                x: unit.x,
                                y: unit.y,
                                z: 0.2,
                                targetX: X,
                                targetY: Y,
                                targetZ: Z,
                                life: 0,
                                delay: index * STEP,
                                span: STEP,
                                duration: (index + 1) * STEP,
                                sequenceIndex: index,
                                sequenceCount: ORDERED.length,
                            }),
                        );
                        this.metrics.merges++;
                    },
                    TASK,
                )
            ) {
                return false;
            }
            this.emit('merge', X, Y, OUTCOME.recipe ? Z : 1, {
                combine: !!OUTCOME.recipe,
                delay: OUTCOME.recipe ? COMBINE_AIR.revealDelay : SEQUENCE_WINDOW,
                span: CONFIG.farm.merge.celebrationSeconds,
                tier: RESULT.tier,
            });
            return true;
        }
    };
