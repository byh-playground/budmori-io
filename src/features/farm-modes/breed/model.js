import { FarmMode } from '../model-base.js';
import { FEATURE } from './definition.js';
import { scaleMoveSpeed } from '../../../unit-stats.js';
import { farmUpgradeRate } from '../../../farm-upgrades.js';

export class BreedFarmMode extends FarmMode {
    constructor(config) {
        super(FEATURE, config);
    }
    updateReady(world, u, dt) {
        let target = null;
        if (!u.fed) {
            target = world.findNearestGroundFood(u.x, u.y);
            if (target && Math.hypot(target.x - u.x, target.y - u.y) < 0.42) {
                world.food.splice(world.food.indexOf(target), 1);
                world.foodSpatial.remove(target);
                world._foodOrder.delete(target);
                world._removeGroupItem(world._groundedFoods, target);
                world._groundedFoodCount = Math.max(0, world._groundedFoodCount - 1);
                u.meals = 1;
                world.markProgressChanged();
                u.vz = 2;
                world.emit('eat', u.x, u.y, 0.5);
                target = null;
            }
        } else if (u.cooldown === 0) {
            target = world.findOrReserveMate(u);
        }
        const HAS_DESIGNATED_MATE = u.fed && target && world.units.includes(target);
        if (u.fed && !HAS_DESIGNATED_MATE && world.avoidNearbyFood(u, dt)) {
            return;
        }
        if (!target) {
            this.wander(world, u, dt);
            return;
        }
        world.steer(
            u,
            target.x,
            target.y,
            dt,
            scaleMoveSpeed(
                2.2 *
                    (target.phase === 'grounded'
                        ? farmUpgradeRate(world.playerProgression?.farmUpgrades, 'growth')
                        : 1),
                u,
            ),
        );
    }
    resolveContacts(world, units) {
        world.resolveFarmContactPairs(units, true);
        if (!world.hasEligibleSameTierBreedPair()) {
            world.resolveFarmContactPairs(units, false);
        }
        world.resolveMergeTaskAfterMovement();
    }
    pair(world, a, b, priorityResolved) {
        if (
            !a ||
            !b ||
            a === b ||
            a.hp <= 0 ||
            b.hp <= 0 ||
            a.down > 0 ||
            b.down > 0 ||
            a.species !== b.species ||
            !a.mature ||
            !b.mature ||
            a.cooldown > 0 ||
            b.cooldown > 0 ||
            !world.units.includes(a) ||
            !world.units.includes(b) ||
            Math.hypot(a.x - b.x, a.y - b.y) > a.radius + b.radius + 0.2 ||
            world.senseEnemy(a) ||
            world.senseEnemy(b)
        ) {
            return false;
        }
        if (a.isBattleOnlySummon || b.isBattleOnlySummon) {
            return false;
        }
        const OWNER = world.breedingReservationOwner(a, b);
        if (
            !world.canBreedPair(a, b, true) ||
            world.units.length >= world.capacity ||
            (a.mateId && a.mateId !== b.id) ||
            (b.mateId && b.mateId !== a.id) ||
            (!priorityResolved && a.tier !== b.tier && world.hasEligibleSameTierBreedPair()) ||
            !world.unitCollection.reserve(OWNER, [a, b])
        ) {
            return false;
        }
        {
            a.mateId = b.id;
            b.mateId = a.id;
            const CHILD = world.spawn(a.species, 1, (a.x + b.x) / 2, (a.y + b.y) / 2);
            CHILD.growthDuration = world.breedGrowthDuration();
            CHILD.vz = 3;
            a.meals = b.meals = 0;
            a.cooldown = b.cooldown = world.breedCooldownDuration();
            a.cooldownDuration = b.cooldownDuration = a.cooldown;
            world.releaseMate(a);
            world.metrics.births++;
            world.emit('birth', CHILD.x, CHILD.y, 0.7);
        }
        return true;
    }
}
