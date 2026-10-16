export function capsuleContourPoints(area, segments = 12) {
  const {x, y, width, startRadius, endRadius, angle} = area || {};
  if (![x, y, width, startRadius, endRadius, angle].every(Number.isFinite)
      || width <= 0 || startRadius < 0 || endRadius < startRadius) {
    throw new TypeError('A finite capsule attack area is required');
  }
  if (!Number.isSafeInteger(segments) || segments < 4 || segments > 64) {
    throw new RangeError('Capsule arc segments must be an integer from 4 through 64');
  }

  const forward = {x: Math.cos(angle), y: Math.sin(angle)};
  const side = {x: -forward.y, y: forward.x};
  const start = {x: x + forward.x * startRadius, y: y + forward.y * startRadius};
  const end = {x: x + forward.x * endRadius, y: y + forward.y * endRadius};
  const arcPoint = (center, theta) => ({
    x: center.x + width * (forward.x * Math.cos(theta) + side.x * Math.sin(theta)),
    y: center.y + width * (forward.y * Math.cos(theta) + side.y * Math.sin(theta)),
  });

  const points = [arcPoint(start, Math.PI / 2), arcPoint(end, Math.PI / 2)];
  for (let i = 1; i <= segments; i++) points.push(arcPoint(end, Math.PI / 2 - Math.PI * i / segments));
  points.push(arcPoint(start, -Math.PI / 2));
  for (let i = 1; i < segments; i++) points.push(arcPoint(start, -Math.PI / 2 - Math.PI * i / segments));
  return points;
}
