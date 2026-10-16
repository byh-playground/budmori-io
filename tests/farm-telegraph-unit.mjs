import assert from 'node:assert/strict';
import {capsuleContourPoints} from '../src/attack-telegraph.js';

const area={x:3,y:2,width:1.25,startRadius:2,endRadius:5,angle:0};
const points=capsuleContourPoints(area,12);
assert.equal(points.length,26,'one closed capsule contour has two tangent sides and two sampled semicircles');
assert.deepEqual(points[0],{x:5,y:3.25});
assert.deepEqual(points[1],{x:8,y:3.25});
assert(Math.abs(points[13].x-8)<1e-12&&Math.abs(points[13].y-.75)<1e-12,'far semicircle ends on the opposite tangent');
assert.deepEqual(points[14],{x:5,y:.75});
for(const point of points){
  assert(Number.isFinite(point.x)&&Number.isFinite(point.y));
  const nearestX=Math.max(5,Math.min(8,point.x));
  assert(Math.abs(Math.hypot(point.x-nearestX,point.y-2)-area.width)<1e-12,'outline stays one radius from the capsule centerline');
}
const vertical=capsuleContourPoints({...area,angle:Math.PI/2});
assert.equal(vertical.length,26);assert(vertical.every(point=>Number.isFinite(point.x)&&Number.isFinite(point.y)));
assert.throws(()=>capsuleContourPoints({...area,width:0}),/capsule attack area/i);
assert.throws(()=>capsuleContourPoints(area,3),/arc segments/i);
console.log('PASS basic boss preview geometry is one finite capsule contour; no gameplay geometry is changed');
