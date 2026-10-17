// Small-world spatial buckets for Farm's meter-scale actors.  The grid is a
// fixed numeric array rather than a string-keyed map; each item occupies one
// center cell, and callers expand queries by their own maximum radius.
const CELL_SIZE = 1.5;
const WORLD_MIN = -64;
const WORLD_SIZE = 128;
const CELL_COUNT = Math.ceil(WORLD_SIZE / CELL_SIZE);
const WORLD_MAX = WORLD_MIN + CELL_COUNT * CELL_SIZE;
const CELL_TOTAL = CELL_COUNT * CELL_COUNT;

export class FixedSpatialGrid {
  constructor() {
    this.cellSize = CELL_SIZE;
    this.cellCount = CELL_COUNT;
    this.cells = new Array(CELL_TOTAL);
    this.usedCells = [];
    this.touched = new Uint8Array(CELL_TOTAL);
    this.itemCells = new Map();
    this.overflowItems = [];
  }

  clear() {
    for (const key of this.usedCells) {
      this.cells[key].length = 0;
      this.touched[key] = 0;
    }
    this.usedCells.length = 0;
    this.itemCells.clear();
    this.overflowItems.length = 0;
  }

  cellX(x) {
    return Math.floor((x - WORLD_MIN) / CELL_SIZE);
  }

  cellY(y) {
    return Math.floor((y - WORLD_MIN) / CELL_SIZE);
  }

  _cellKey(x, y) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return -1;
    const cx = this.cellX(x), cy = this.cellY(y);
    return cx < 0 || cy < 0 || cx >= CELL_COUNT || cy >= CELL_COUNT ? -1 : cy * CELL_COUNT + cx;
  }

  insert(item, x = item?.x, y = item?.y) {
    if (!item) return false;
    const previous = this.itemCells.get(item);
    if (previous !== undefined) {
      if (previous >= 0) this._removeFromCell(item, previous);
      else this._removeOverflow(item);
    }
    const key = this._cellKey(x, y);
    this.itemCells.set(item, key);
    if (key < 0) {
      this.overflowItems.push(item);
      return false;
    }
    let bucket = this.cells[key];
    if (!bucket) bucket = this.cells[key] = [];
    if (!this.touched[key]) {
      this.touched[key] = 1;
      this.usedCells.push(key);
    }
    bucket.push(item);
    return true;
  }

  update(item, x = item?.x, y = item?.y) {
    if (!item) return false;
    const previous = this.itemCells.get(item);
    const next = this._cellKey(x, y);
    if (previous === next) return next >= 0;
    if (previous !== undefined) {
      if (previous >= 0) this._removeFromCell(item, previous);
      else this._removeOverflow(item);
    }
    this.itemCells.set(item, next);
    if (next < 0) {
      this.overflowItems.push(item);
      return false;
    }
    let bucket = this.cells[next];
    if (!bucket) bucket = this.cells[next] = [];
    if (!this.touched[next]) {
      this.touched[next] = 1;
      this.usedCells.push(next);
    }
    bucket.push(item);
    return true;
  }

  remove(item) {
    const key = this.itemCells.get(item);
    if (key === undefined) return false;
    if (key >= 0) this._removeFromCell(item, key);
    else this._removeOverflow(item);
    this.itemCells.delete(item);
    return true;
  }

  _removeOverflow(item) {
    const index = this.overflowItems.indexOf(item);
    if (index < 0) return;
    const last = this.overflowItems.pop();
    if (index < this.overflowItems.length) this.overflowItems[index] = last;
  }

  _removeFromCell(item, key) {
    const bucket = this.cells[key];
    if (!bucket) return;
    const index = bucket.indexOf(item);
    if (index < 0) return;
    const last = bucket.pop();
    if (index < bucket.length) bucket[index] = last;
  }

  queryAABB(minX, minY, maxX, maxY, out) {
    out.length = 0;
    if (![minX, minY, maxX, maxY].every(Number.isFinite)) return out;
    if (maxX >= WORLD_MIN && maxY >= WORLD_MIN && minX < WORLD_MAX && minY < WORLD_MAX) {
      const x0 = Math.max(0, this.cellX(minX)), y0 = Math.max(0, this.cellY(minY));
      const x1 = Math.min(CELL_COUNT - 1, this.cellX(maxX)), y1 = Math.min(CELL_COUNT - 1, this.cellY(maxY));
      for (let y = y0; y <= y1; y++) {
        const row = y * CELL_COUNT;
        for (let x = x0; x <= x1; x++) {
          const bucket = this.cells[row + x];
          if (bucket) for (let i = 0; i < bucket.length; i++) out.push(bucket[i]);
        }
      }
    }
    for (const item of this.overflowItems) {
      if (item.x >= minX && item.x <= maxX && item.y >= minY && item.y <= maxY) out.push(item);
    }
    return out;
  }

  queryCellRing(centerX, centerY, radius, out) {
    out.length = 0;
    const x0 = centerX - radius, x1 = centerX + radius;
    const y0 = centerY - radius, y1 = centerY + radius;
    if (radius === 0) {
      this._appendCell(centerX, centerY, out);
      return out;
    }
    for (let x = x0; x <= x1; x++) {
      this._appendCell(x, y0, out);
      this._appendCell(x, y1, out);
    }
    for (let y = y0 + 1; y < y1; y++) {
      this._appendCell(x0, y, out);
      this._appendCell(x1, y, out);
    }
    return out;
  }

  _appendCell(x, y, out) {
    if (x < 0 || y < 0 || x >= CELL_COUNT || y >= CELL_COUNT) return;
    const bucket = this.cells[y * CELL_COUNT + x];
    if (bucket) for (let i = 0; i < bucket.length; i++) out.push(bucket[i]);
  }

  distanceToOutsideRing(x, y, centerX, centerY, radius) {
    const left = Math.max(0, centerX - radius), right = Math.min(CELL_COUNT - 1, centerX + radius);
    const bottom = Math.max(0, centerY - radius), top = Math.min(CELL_COUNT - 1, centerY + radius);
    let nearest = Infinity;
    if (left > 0) nearest = Math.min(nearest, x - (WORLD_MIN + left * CELL_SIZE));
    if (right < CELL_COUNT - 1) nearest = Math.min(nearest, WORLD_MIN + (right + 1) * CELL_SIZE - x);
    if (bottom > 0) nearest = Math.min(nearest, y - (WORLD_MIN + bottom * CELL_SIZE));
    if (top < CELL_COUNT - 1) nearest = Math.min(nearest, WORLD_MIN + (top + 1) * CELL_SIZE - y);
    return Math.max(0, nearest);
  }
}
