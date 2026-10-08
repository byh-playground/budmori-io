'use strict';
/**
 * Experimental complete pair enumeration; this file does not change the game.
 *
 * Browser injection: '(' + createCoarsePairEnumerator.toString() + ')({mode:"coarse"})'.
 * The factory has no external bindings or require dependencies. The same factory
 * is exported through CommonJS and globalThis.BudmoriCoarsePairs.
 *
 * const e = createCoarsePairEnumerator({mode:'coarse', exact:false});
 * const r = e.enumerate(state.units, moaBodyRadius,
 *   u => unitDef(u.type).layer === 'AIR', 64);
 * for (const p of r.pairs) {
 *   const a = r.bodies[Math.floor(p / r.stride)], b = r.bodies[p % r.stride];
 * }
 *
 * Only supplied units are considered; callers choose whether to include leaders.
 * Budmori eligibility is live troops/resident units, all factions, AIR with AIR
 * and non-AIR with non-AIR. Supply the boolean layer adapter above to match it.
 * hp <= 0 / alive === false are excluded; hp may be omitted by synthetic inputs.
 * Radii must be current moaBodyRadius values, NOT combat or visual radius.
 *
 * pairs are unique, ascending numeric-packed stable-ID ranks. bodies is sorted
 * by numeric safe-integer ID; radii[i] is the cached collision radius of bodies[i].
 * Outputs are scratch arrays reused by the next call.
 * instrument:false removes performance.now and per-loop metric updates; stage
 * times/inner-loop counters remain zero; cheap size fields are retained.
 * Output pairs and ordering are unchanged.
 * Broadphase endpoints are padded outward for floating-point roundoff; final
 * emission always tests actual center deltas against the radius sum on both axes.
 * exact:false returns strict AABB-overlap candidates; exact:true returns strict
 * circle overlaps. No contact-count, candidate-count, or work-budget cap exists.
 * The coherent-sort displacement threshold only selects a complete native sort.
 *
 * Coarse: insert full AABB into every touched cell. Any overlapping pair shares
 * cells, and exactly one cell owns it: (max(cx0A,cx0B), max(cy0A,cy0B)). Boundary,
 * negative-coordinate, and arbitrarily larger-than-cell bodies are therefore
 * complete. Very large AABBs can cost many memberships; no work is hidden/capped.
 * Grid: centroid grid + per-layer maximum-radius query halo, canonical ID pairs.
 * Global: one adaptive sweep, then same-layer filtering.
 *
 * Axis/order caches affect work only, never the sorted result. Caches need not be
 * serialized for deterministic peers. Input positions are frozen for one call;
 * if a solver moves bodies, rebuild before its next pass to find new contacts.
 */
function createCoarsePairEnumerator(options = {}) {
  const mode = options.mode || 'coarse';
  if (!['coarse', 'global', 'grid'].includes(mode)) throw Error('Unknown pair mode: ' + mode);
  const exact = !!options.exact, instrument = options.instrument !== false;
  const hysteresis = options.hysteresis === undefined ? 1.25 : options.hysteresis;
  if (!Number.isFinite(hysteresis) || hysteresis < 1) throw Error('Invalid axis hysteresis');
  const now = typeof performance !== 'undefined' && performance.now
    ? () => performance.now() : () => Date.now();
  const recordsById = new Map(), records = [], bodies = [], radii = [], pairs = [];
  const layerGrids = new Map(), activeCells = [];
  const globalCell = {cx:0, cy:0, layer:null, members:[], order:[], axis:'x', stamp:0};
  let epoch = 0, orderMark = 0, previousCellSize = null;
  let pairSortWork = new Float64Array(0), pairSortCounts = null;
  const compareId = (a, b) => a.id - b.id;
  const compareX = (a, b) => a.loX - b.loX || a.id - b.id;
  const compareY = (a, b) => a.loY - b.loY || a.id - b.id;
  function reset() {
    recordsById.clear(); records.length = bodies.length = radii.length = pairs.length = activeCells.length = 0;
    layerGrids.clear(); globalCell.members.length = globalCell.order.length = 0;
    globalCell.axis = 'x'; epoch = orderMark = 0; previousCellSize = null;
  }
  function enumerate(units, radiusFn = u => u.radius, layerFn = u => u.layer === 'AIR', cellSize = 64) {
    const started = instrument ? now() : 0;
    if (!Number.isFinite(cellSize) || cellSize <= 0) throw Error('cellSize must be positive');
    if (previousCellSize !== cellSize) { layerGrids.clear(); previousCellSize = cellSize; }
    epoch++;
    const metrics = {mode, exact, instrument, cellSize, eligible:0, occupiedCells:0, memberships:0,
      maxCellMembership:0, axisXCells:0, axisYCells:0, axisChanges:0,
      reusedOrderEntries:0, insertionShifts:0, sortFallbacks:0,
      cellLookups:0, rawVisits:0, intervalChecks:0, candidateChecks:0,
      ownerRejects:0, layerRejects:0, orthogonalTests:0, circleTests:0, pairCount:0};
    records.length = bodies.length = radii.length = pairs.length = activeCells.length = 0;
    for (const u of units) {
      if (!u || u.hp <= 0 || u.alive === false) continue;
      const id = u.id, x = u.x, y = u.y, radius = radiusFn(u), layer = layerFn(u);
      if (!Number.isSafeInteger(id)) throw Error('Every body needs a unique safe-integer ID');
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(radius) || radius < 0)
        throw Error('Invalid position or collision radius for ' + id);
      if (!Number.isFinite(x - radius) || !Number.isFinite(x + radius) ||
          !Number.isFinite(y - radius) || !Number.isFinite(y + radius)) throw Error('AABB overflow');
      let a = recordsById.get(id);
      if (!a) { a = {id, epoch:0, orderMark:0}; recordsById.set(id, a); }
      if (a.epoch === epoch) throw Error('Duplicate body ID: ' + id);
      a.u=u; a.x=x; a.y=y; a.radius=radius; a.layer=layer; a.epoch=epoch;
      // Center/radius subtraction can report a strict overlap while separately
      // rounded endpoints coincide. Pad before cell ownership AND sweeping so
      // neither an axis choice nor a cell boundary can drop that contact.
      const padX=4*Number.EPSILON*Math.max(1,Math.abs(x),radius);
      const padY=4*Number.EPSILON*Math.max(1,Math.abs(y),radius);
      a.loX=x-radius-padX; a.hiX=x+radius+padX;
      a.loY=y-radius-padY; a.hiY=y+radius+padY;
      if (!Number.isFinite(a.loX) || !Number.isFinite(a.hiX) ||
          !Number.isFinite(a.loY) || !Number.isFinite(a.hiY)) throw Error('Padded AABB overflow');
      records.push(a);
    }
    for (const [id, a] of recordsById) if (a.epoch !== epoch) recordsById.delete(id);
    records.sort(compareId);
    for (let i = 0; i < records.length; i++) { records[i].rank = i; bodies.push(records[i].u); radii.push(records[i].radius); }
    const stride = records.length + 1;
    if (!Number.isSafeInteger(records.length * stride)) throw Error('Pair packing exceeds safe integers');
    metrics.eligible = records.length;
    const projected = instrument ? now() : 0;
    if (mode === 'global') {
      globalCell.members.length = 0;
      for (const a of records) globalCell.members.push(a);
      globalCell.stamp = epoch; activeCells.push(globalCell);
      metrics.memberships = records.length;
    } else {
      for (const grid of layerGrids.values()) {
        grid.maxRadius = 0;
        for (const cell of grid.cells.values()) cell.members.length = 0;
      }
      for (const a of records) {
        let grid = layerGrids.get(a.layer);
        if (!grid) { grid = {cells:new Map(), maxRadius:0}; layerGrids.set(a.layer, grid); }
        grid.maxRadius = Math.max(grid.maxRadius, a.radius);
        a.cx0 = Math.floor((mode === 'grid' ? a.x : a.loX) / cellSize);
        a.cx1 = Math.floor((mode === 'grid' ? a.x : a.hiX) / cellSize);
        a.cy0 = Math.floor((mode === 'grid' ? a.y : a.loY) / cellSize);
        a.cy1 = Math.floor((mode === 'grid' ? a.y : a.hiY) / cellSize);
        if (!Number.isSafeInteger(a.cx0) || !Number.isSafeInteger(a.cx1) || !Number.isSafeInteger(a.cy0) || !Number.isSafeInteger(a.cy1)) throw Error('Cell coordinate exceeds safe integers');
        for (let cy = a.cy0; cy <= a.cy1; cy++) for (let cx = a.cx0; cx <= a.cx1; cx++) {
          const key = cx + ',' + cy;
          let cell = grid.cells.get(key);
          if (!cell) { cell = {cx, cy, layer:a.layer, members:[], order:[], axis:'x', stamp:0}; grid.cells.set(key, cell); }
          if (cell.stamp !== epoch) { cell.stamp = epoch; activeCells.push(cell); }
          cell.members.push(a); if (instrument) metrics.memberships++;
        }
      }
      for (const [layer, grid] of layerGrids) {
        for (const [key, cell] of grid.cells) if (cell.stamp !== epoch) grid.cells.delete(key);
        if (!grid.cells.size) layerGrids.delete(layer);
      }
    }
    metrics.occupiedCells = activeCells.length;
    if (instrument) for (const cell of activeCells) metrics.maxCellMembership = Math.max(metrics.maxCellMembership, cell.members.length);
    const indexed = instrument ? now() : 0;
    if (mode !== 'grid') for (const cell of activeCells) {
      const members = cell.members, n = members.length;
      // Local origins avoid subtracting large, nearly equal squared coordinates.
      const originX = mode === 'global' ? (members[0]?.x || 0) : cell.cx * cellSize;
      const originY = mode === 'global' ? (members[0]?.y || 0) : cell.cy * cellSize;
      let sx = 0, sy = 0, sxx = 0, syy = 0;
      for (const a of members) { const x = a.x-originX, y = a.y-originY; sx+=x; sy+=y; sxx+=x*x; syy+=y*y; }
      const count = n || 1, vx = Math.max(0,sxx/count-(sx/count)**2), vy = Math.max(0,syy/count-(sy/count)**2);
      const before = cell.axis;
      if (before === 'x' ? vy > vx*hysteresis : vx > vy*hysteresis) cell.axis = before === 'x' ? 'y' : 'x';
      const changed = before !== cell.axis, compare = cell.axis === 'x' ? compareX : compareY;
      if (changed) if (instrument) metrics.axisChanges++;
      if (instrument) { if (cell.axis === 'x') metrics.axisXCells++; else metrics.axisYCells++; }
      const order = cell.order;
      if (changed || !order.length) {
        order.length = 0; for (const a of members) order.push(a); order.sort(compare);
      } else {
        const mark = ++orderMark;
        let write = 0;
        for (let i = 0; i < order.length; i++) {
          const a = order[i];
          if (a.epoch !== epoch || mode !== 'global' && (a.layer !== cell.layer ||
            cell.cx < a.cx0 || cell.cx > a.cx1 || cell.cy < a.cy0 || cell.cy > a.cy1)) continue;
          order[write++] = a; a.orderMark = mark; if (instrument) metrics.reusedOrderEntries++;
        }
        order.length = write;
        for (const a of members) if (a.orderMark !== mark) order.push(a);
        let shifts = 0;
        for (let i = 1; i < order.length; i++) {
          const current = order[i]; let j = i-1;
          while (j >= 0 && compare(order[j], current) > 0) { order[j+1] = order[j]; j--; shifts++; }
          order[j+1] = current;
          // This is an algorithm switch, never an incomplete enumeration cap.
          if (shifts > order.length*8) { order.sort(compare); if (instrument) metrics.sortFallbacks++; break; }
        }
        if (instrument) metrics.insertionShifts += shifts;
      }
    }
    const ordered = instrument ? now() : 0;
    function emit(a, b) {
      if (instrument) metrics.orthogonalTests++;
      const sum = a.radius + b.radius, dx = a.x-b.x, dy = a.y-b.y;
      // Padded intervals are conservative only. Preserve the strict AABB
      // contract and make final eligibility independent of the cached axis.
      if (Math.abs(dx) >= sum || Math.abs(dy) >= sum) return;
      if (exact) { if (instrument) metrics.circleTests++; if (dx*dx+dy*dy >= sum*sum) return; }
      const i = a.rank, j = b.rank;
      pairs.push(i < j ? i*stride+j : j*stride+i);
    }
    if (mode === 'grid') {
      for (const a of records) {
        const grid = layerGrids.get(a.layer), r = a.radius+grid.maxRadius;
        const x0 = Math.floor((a.x-r)/cellSize), x1 = Math.floor((a.x+r)/cellSize);
        const y0 = Math.floor((a.y-r)/cellSize), y1 = Math.floor((a.y+r)/cellSize);
        for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
          if (instrument) metrics.cellLookups++;
          const cell = grid.cells.get(cx+','+cy); if (!cell) continue;
          for (const b of cell.members) {
            if (instrument) metrics.rawVisits++;
            if (a.rank >= b.rank) continue;
            if (instrument) metrics.candidateChecks++; emit(a,b);
          }
        }
      }
    } else {
      for (const cell of activeCells) {
        const order = cell.order, x = cell.axis === 'x';
        for (let i = 0; i < order.length; i++) {
          const a = order[i], high = x ? a.hiX : a.hiY;
          for (let j = i+1; j < order.length; j++) {
            const b = order[j]; if (instrument) metrics.intervalChecks++;
            if ((x ? b.loX : b.loY) > high) break;
            if (instrument) metrics.candidateChecks++;
            if (a.layer !== b.layer) { if (instrument) metrics.layerRejects++; continue; }
            if (mode === 'coarse' && (Math.max(a.cx0,b.cx0) !== cell.cx || Math.max(a.cy0,b.cy0) !== cell.cy)) {
              if (instrument) metrics.ownerRejects++; continue;
            }
            emit(a,b);
          }
        }
      }
    }
    const enumerated = instrument ? now() : 0;
    // Two-pass LSD radix sort retains exact numeric ordering for packed uint32
    // pairs without O(P log P) comparator calls. Scratch storage is reused.
    // Large inputs outside uint32 packing retain the complete numeric fallback.
    if (pairs.length >= 8192 && records.length*stride <= 0xffffffff) {
      if (!pairSortCounts) pairSortCounts = new Uint32Array(65536);
      if (pairSortWork.length < pairs.length) {
        let size = Math.max(1024,pairSortWork.length); while(size < pairs.length) size *= 2;
        pairSortWork = new Float64Array(size);
      }
      const counts=pairSortCounts, work=pairSortWork, n=pairs.length;
      counts.fill(0);
      for(let i=0;i<n;i++) counts[pairs[i]&65535]++;
      let offset=0;
      for(let i=0;i<65536;i++){const count=counts[i];counts[i]=offset;offset+=count;}
      for(let i=0;i<n;i++){const value=pairs[i];work[counts[value&65535]++]=value;}
      counts.fill(0);
      for(let i=0;i<n;i++) counts[work[i]>>>16]++;
      offset=0;
      for(let i=0;i<65536;i++){const count=counts[i];counts[i]=offset;offset+=count;}
      for(let i=0;i<n;i++){const value=work[i];pairs[counts[value>>>16]++]=value;}
      metrics.pairSortAlgorithm='radix32';
    } else { pairs.sort((a,b) => a-b); metrics.pairSortAlgorithm='numeric'; }
    const sorted = instrument ? now() : 0;
    metrics.pairCount = pairs.length;
    metrics.projectionMs = projected-started; metrics.indexMs = indexed-projected;
    metrics.orderMs = ordered-indexed; metrics.enumerationMs = enumerated-ordered;
    metrics.pairSortMs = sorted-enumerated; metrics.totalMs = sorted-started;
    return {pairs, bodies, radii, stride, metrics};
  }
  return {enumerate, reset};
}

/** Independent O(n^2) oracle, randomized adversarial boundary tests, no imports. */
function selfTestCoarsePairEnumerator() {
  let seed = 0x183d6271;
  const random = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed>>>0)/4294967296; };
  const assert = (ok, message) => { if (!ok) throw Error(message); };
  const ids = r => r.pairs.map(p => r.bodies[Math.floor(p/r.stride)].id+':'+r.bodies[p%r.stride].id);
  const brute = (units, exact) => {
    const live = units.filter(u => u && !(u.hp<=0) && u.alive!==false).slice().sort((a,b)=>a.id-b.id), out=[];
    for (let i=0;i<live.length;i++) for(let j=i+1;j<live.length;j++) {
      const a=live[i],b=live[j]; if(a.layer!==b.layer)continue;
      const dx=a.x-b.x,dy=a.y-b.y,r=a.radius+b.radius;
      if(exact ? dx*dx+dy*dy<r*r : Math.abs(dx)<r&&Math.abs(dy)<r)out.push(a.id+':'+b.id);
    }
    return out;
  };
  const configs = [];
  for (const exact of [false,true]) {
    configs.push({mode:'global',exact,cellSize:64});
    for (const cellSize of [32,64,128,256]) for (const mode of ['grid','coarse']) configs.push({mode,exact,cellSize});
  }
  const enumerators = configs.map(c=>createCoarsePairEnumerator(c));
  let checks = 0, frames = 0, maximumPairs = 0;
  const check = units => {
    const expected = [brute(units,false),brute(units,true)]; frames++;
    for (let k=0;k<configs.length;k++) {
      const c=configs[k],r=enumerators[k].enumerate(units,u=>u.radius,u=>u.layer,c.cellSize), actual=ids(r);
      assert(JSON.stringify(actual)===JSON.stringify(expected[c.exact?1:0]),JSON.stringify({config:c,frame:frames,expected:expected[c.exact?1:0],actual}));
      assert(new Set(actual).size===actual.length,'Duplicate pairs');
      assert(r.bodies.every((u,i)=>r.radii[i]===u.radius),'Cached radii match stable body order');
      maximumPairs=Math.max(maximumPairs,actual.length);checks++;
    }
  };
  // Contacts crossing cell corners, exact tangencies, negative boundaries, dead
  // bodies, cross-layer exclusion, coincident bodies, and radii > cell size.
  const fixtures=[
    [],[{id:1,x:0,y:0,radius:1,layer:'GROUND',hp:1}],
    [
      {id:-99,x:-.000001,y:-.000001,radius:2,layer:'GROUND',hp:1},
      {id:2,x:.000001,y:.000001,radius:2,layer:'GROUND',hp:1},
      {id:3,x:64,y:64,radius:300,layer:'GROUND',hp:1},
      {id:4,x:350,y:64,radius:8,layer:'GROUND',hp:1},
      {id:5,x:64,y:64,radius:2,layer:'AIR',hp:1},
      {id:6,x:65,y:64,radius:2,layer:'AIR',hp:1},
      {id:7,x:64,y:64,radius:300,layer:'GROUND',hp:0},
      {id:8,x:64,y:64,radius:300,layer:'GROUND',hp:1,alive:false},
      {id:9,x:1000,y:1000,radius:20,layer:'GROUND',hp:1},
      {id:10,x:1040,y:1000,radius:20,layer:'GROUND',hp:1},
      {id:11,x:0,y:0,radius:0,layer:'GROUND',hp:1}
    ]
  ];
  for(const units of fixtures)check(units);
  // Actual-size fractional radii can overlap under the solver's arithmetic
  // while rounded interval endpoints are equal: 1000+7 === 1014.7175-7.7175.
  const nearTangent=[
    {id:1,x:1000,y:2000,radius:7,layer:'GROUND',hp:1},
    {id:2,x:1014.7175,y:2000,radius:7.7175,layer:'GROUND',hp:1}
  ];
  assert(nearTangent[0].x+nearTangent[0].radius===nearTangent[1].x-nearTangent[1].radius,'Rounded endpoint fixture');
  assert(brute(nearTangent,true).length===1,'Solver detects near-tangent fixture');
  check(nearTangent);
  const bits=new DataView(new ArrayBuffer(8));
  const adjacent=(value,step)=>{bits.setFloat64(0,value);bits.setBigUint64(0,bits.getBigUint64(0)+BigInt(step));return bits.getFloat64(0)};
  for(const x of [1000,1800,7200,30000])for(const radius of [7.35,7.7175,11.025,23.1525])for(const step of [-1,0,1])for(const swap of [false,true]){
    const target=x+7+radius,b=step?adjacent(target,step):target;
    check([{id:1,x:swap?2000:x,y:swap?x:2000,radius:7,layer:'GROUND',hp:1},
      {id:2,x:swap?2000:b,y:swap?b:2000,radius,layer:'GROUND',hp:1}]);
  }
  // Equal-variance geometry retains either warmed axis via hysteresis. Before
  // conservative endpoints, X omitted 1:2 while Y emitted it after a restore.
  const balanced=[...nearTangent,
    {id:3,x:1007.35875,y:1992.6412500000001,radius:7,layer:'GROUND',hp:1},
    {id:4,x:1007.35875,y:2007.3587499999999,radius:7,layer:'GROUND',hp:1}];
  for(const mode of ['coarse','global'])for(const exact of [false,true])for(const history of ['cold','x','y']){
    const e=createCoarsePairEnumerator({mode,exact});
    if(history!=='cold')e.enumerate(balanced.map((u,i)=>history==='x'?{...u,y:2000}:{...u,x:1007.35875,y:2000+(i-1.5)*10}),u=>u.radius,u=>u.layer,64);
    const r=e.enumerate(balanced,u=>u.radius,u=>u.layer,64);
    assert(JSON.stringify(ids(r))===JSON.stringify(brute(balanced,exact)),'Near-tangent cache-axis independence '+mode+'/'+exact+'/'+history);
    assert(history==='y'?r.metrics.axisYCells>0:r.metrics.axisXCells>0,'Both retained axes exercised');checks++;
  }
  // A sub-ULP correction still consumes one of the existing eight slots. With
  // only body 1 active, dropping 1:2 changes its accumulated push by four pixels.
  const capped=[...nearTangent,...Array.from({length:8},(_,i)=>({id:i+3,x:1001,y:2000,radius:7,layer:'GROUND',hp:1}))];
  const correction=orderedPairs=>{
    let x=0,count=0;
    for(const pair of orderedPairs){const [a,b]=pair.split(':').map(Number);if(a!==1||count>=8)continue;
      const u=capped.find(u=>u.id===a),v=capped.find(u=>u.id===b),dx=u.x-v.x,dy=u.y-v.y,len=Math.sqrt(dx*dx+dy*dy),sum=u.radius+v.radius;
      if(dx*dx+dy*dy>=sum*sum)continue;x+=dx/len*Math.min(4,(sum-len)*12*.1);count++;
    }return{x,count};
  };
  const expectedCorrection=correction(brute(capped,true));
  assert(expectedCorrection.count===8&&Math.abs(expectedCorrection.x+28)<1e-10,'Near-tangent cap fixture has four-pixel consequence');
  for(const mode of ['coarse','global','grid']){
    const r=createCoarsePairEnumerator({mode,exact:true}).enumerate(capped,u=>u.radius,u=>u.layer,64);
    assert(JSON.stringify(correction(ids(r)))===JSON.stringify(expectedCorrection),'Neighbor-eight consequence '+mode);checks++;
  }
  for(let round=0;round<12;round++) {
    const units=[];
    for(let i=0;i<100;i++) {
      const step=[32,64,128,256][i%4],boundary=i%3===0;
      units.push({id:i*7-123,x:boundary?(Math.floor(random()*16)-8)*step+(random()-.5)*1e-7:(random()-.5)*1400,
        y:boundary?(Math.floor(random()*16)-8)*step+(random()-.5)*1e-7:(random()-.5)*1400,
        radius:i%31===0?180+random()*220:i%7===0?0:1+random()*40,
        layer:i%4===0?'AIR':'GROUND',hp:i%19===0?0:1});
    }
    for(let frame=0;frame<8;frame++) {
      check(units);
      // New object identities and reversed input order exercise ID-keyed reuse.
      units.reverse(); for(let i=0;i<units.length;i++) {
        const u=units[i];units[i]={...u,x:u.x+(random()-.5)*20,y:u.y+(random()-.5)*20};
        if(i%17===0)units[i].layer=units[i].layer==='AIR'?'GROUND':'AIR';
        if(i%23===0)units[i].hp=units[i].hp?0:1;
      }
      if(frame===3){units.splice(10,5);units.push({id:100000+round,x:0,y:0,radius:60,layer:'AIR',hp:1});}
    }
  }
  // A crowded case proves enumeration is complete well beyond old 4/8 caps.
  check(Array.from({length:120},(_,id)=>({id,x:0,y:0,radius:30,layer:'GROUND',hp:1})));
  // Explicit 25% hysteresis: reuse one cell, keep the centroid distribution inside.
  for(const mode of ['coarse','global']) {
    const e=createCoarsePairEnumerator({mode}),axis=[];
    for(const ratio of [1.20,1.30,1.00,.70]) {
      const units=[-20,0,20].map((x,id)=>({id,x:128+x,y:128+x*Math.sqrt(ratio),radius:1,hp:1}));
      const m=e.enumerate(units,u=>u.radius,()=>false,256).metrics;
      axis.push(m.axisYCells?'y':'x');
    }
    assert(JSON.stringify(axis)==='["x","y","y","x"]','25% axis hysteresis '+mode);
  }
  // Different cache histories, radius changes, cell-size changes and input order
  // must produce the same stable-ID ordered result as a fresh enumerator.
  const history=createCoarsePairEnumerator(), fresh=createCoarsePairEnumerator();
  let units=Array.from({length:80},(_,id)=>({id,x:random()*180,y:random()*40,radius:1+random()*50,layer:id%3?'GROUND':'AIR',hp:1}));
  for(let i=0;i<12;i++) {
    const cs=[64,64,32,128,256,64][i%6];
    history.enumerate(units,u=>u.radius,u=>u.layer,cs);
    units=units.reverse().map(u=>({...u,x:u.y,y:u.x,radius:random()*70}));
    const a=ids(history.enumerate(units,u=>u.radius,u=>u.layer,cs));
    fresh.reset();const b=ids(fresh.enumerate(units,u=>u.radius,u=>u.layer,cs));
    assert(JSON.stringify(a)===JSON.stringify(b),'History-independent pair ordering');checks++;
  }
  // Radix sort covers uint32 values with the sign bit set. Only 140 crowded
  // bodies overlap; separated bodies move their packed ranks above 2^31.
  const wide=Array.from({length:47000},(_,id)=>({id,x:id<46860?id*100:4700000,y:0,radius:1,hp:1}));
  const wideExpected=[];
  for(let i=46860;i<47000;i++)for(let j=i+1;j<47000;j++)wideExpected.push(i*47001+j);
  for(const instrument of [true,false]) {
    const r=createCoarsePairEnumerator({mode:'global',exact:true,instrument}).enumerate(wide,u=>u.radius,()=>false,64);
    assert(r.metrics.pairSortAlgorithm==='radix32','Radix branch exercised');
    assert(JSON.stringify(r.pairs)===JSON.stringify(wideExpected),'Unsigned high-bit radix order');
    if(!instrument)assert(r.metrics.totalMs===0&&r.metrics.candidateChecks===0,'Instrumentation disabled');
    checks++;
  }
  const timingSample=createCoarsePairEnumerator().enumerate(units,u=>u.radius,u=>u.layer,64).metrics;
  const timeSum=timingSample.projectionMs+timingSample.indexMs+timingSample.orderMs+timingSample.enumerationMs+timingSample.pairSortMs;
  assert(Math.abs(timeSum-timingSample.totalMs)<1e-7,'Every stage is included in total timing');
  return {passed:true,checks,frames,maximumPairs,coverage:['all requested cell sizes','AABB and exact-circle oracle','negative boundaries and corner contacts','radii larger than cells','ground/AIR/dead eligibility','zero-radius/tangent/coincident bodies','fractional near-tangencies at world scales','near-tangent warm-axis independence','near-tangent neighbor-eight consequence','movement, spawn/death, object and input-order changes','axis hysteresis','cache-history independence','no per-unit or pair caps','all timing stages','uint32 high-bit radix ordering','uninstrumented output'],timingSample};
}

if (typeof module !== 'undefined' && module.exports) module.exports={createCoarsePairEnumerator,selfTestCoarsePairEnumerator};
if (typeof globalThis !== 'undefined') globalThis.BudmoriCoarsePairs={createCoarsePairEnumerator,selfTestCoarsePairEnumerator};
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main===module)
  console.log(JSON.stringify(selfTestCoarsePairEnumerator(),null,2));
