// Model-derived HUD counts share the model's existing membership/bench revisions.
// The display HP sum belongs to the presentation pass instead: health interpolates
// between simulation ticks and must never be cached with these discrete counts.
export class FarmHudCounts {
    constructor() {
        this.world = null;
        this.unsubscribeHealth = null;
        this.healthRevision = 0;
        this.populationRevision = -1;
        this.population = 0;
        this.battleKey = null;
        this.battle = { hand: new Map(), reserves: 0, fighters: 0 };
    }
    bind(world) {
        if (this.world === world) {
            return;
        }
        this.dispose();
        this.world = world;
        this.unsubscribeHealth = world.unitCollection.onHealthChanged.on((event) => {
            if (event.previousHp > 0 !== event.hp > 0) {
                this.healthRevision++;
            }
        });
    }
    worldPopulation(world) {
        this.bind(world);
        if (this.populationRevision !== world.unitCollection.revision) {
            this.population = 0;
            for (const UNIT of world.unitCollection.items) {
                // This count includes every non-summon, not just permanent residents.
                if (!UNIT.isBattleOnlySummon) {
                    this.population++;
                }
            }
            this.populationRevision = world.unitCollection.revision;
        }
        return this.population;
    }
    battleCounts(world) {
        this.bind(world);
        const PREVIOUS = this.battleKey;
        if (
            !PREVIOUS ||
            PREVIOUS.membership !== world.unitCollection.revision ||
            PREVIOUS.bench !== world._benchRevision ||
            PREVIOUS.health !== this.healthRevision ||
            PREVIOUS.progress !== world.progressRevision ||
            PREVIOUS.tick !== world.simulationTick
        ) {
            // Both the hand cards and command HUD borrow this one query result.
            // Progress catches immediate revival; the tick also covers simulation
            // changes that do not publish a health event. No timer delays the HUD.
            this.battle.hand = world.handCounts;
            this.battle.reserves = 0;
            for (const COUNT of this.battle.hand.values()) {
                this.battle.reserves += COUNT;
            }
            this.battle.fighters = world.fieldFighterCount;
            this.battleKey = {
                membership: world.unitCollection.revision,
                bench: world._benchRevision,
                health: this.healthRevision,
                progress: world.progressRevision,
                tick: world.simulationTick,
            };
        }
        return this.battle;
    }
    dispose() {
        this.unsubscribeHealth?.();
        this.unsubscribeHealth = null;
        this.world = null;
        this.healthRevision = 0;
        this.populationRevision = -1;
        this.population = 0;
        this.battleKey = null;
        this.battle.hand.clear();
        this.battle.reserves = this.battle.fighters = 0;
    }
}
