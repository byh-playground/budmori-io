// Reproduction fixture, not a player save. Lv15 gives 155 legal deployment slots.
BloomSimulation.session?.close();
bloomApplyTickRate(10);BloomSimulation.initialize(12345);
abilityState().xp=abilityThreshold(15);abilityState().level=15;
moaSyncLevelHP(state.mother);state.mother.hp=state.mother.maxHp;
for(const [type,n] of [['swordsman',39],['shellbug',39],['dandelion',39],['archer',38]])rarityAcquire(-1,type,2,n);
for(const r of rarityAccount(-1).active)rarityLock(r.uid,true);
rarityRecall(-1);rebuildGrid();spatialBoundary();
playing=true;paused=false;modalKind='';
