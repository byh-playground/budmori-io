// Small-world spatial buckets for Farm's meter-scale actors.  The grid is a
// fixed numeric array rather than a string-keyed map; each item occupies one
// center cell, and callers expand queries by their own maximum radius.
const CELL_SIZE = 1.5;
const WORLD_MIN = -64;
const WORLD_SIZE = 128;
const CELL_COUNT = Math.ceil(WORLD_SIZE / CELL_SIZE);
const WORLD_MAX = WORLD_MIN + CELL_COUNT * CELL_SIZE;
const CELL_TOTAL = CELL_COUNT * CELL_COUNT;
class FixedSpatialGrid {
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
        for (const KEY of this.usedCells) {
            this.cells[KEY].length = 0;
            this.touched[KEY] = 0;
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
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            return -1;
        }
        const CX = this.cellX(x),
            CY = this.cellY(y);
        return CX < 0 || CY < 0 || CX >= CELL_COUNT || CY >= CELL_COUNT ? -1 : CY * CELL_COUNT + CX;
    }
    insert(item, x = item?.x, y = item?.y) {
        if (!item) {
            return false;
        }
        const PREVIOUS = this.itemCells.get(item);
        if (PREVIOUS !== undefined) {
            if (PREVIOUS >= 0) {
                this._removeFromCell(item, PREVIOUS);
            } else {
                this._removeOverflow(item);
            }
        }
        const KEY = this._cellKey(x, y);
        this.itemCells.set(item, KEY);
        if (KEY < 0) {
            this.overflowItems.push(item);
            return false;
        }
        let bucket = this.cells[KEY];
        if (!bucket) {
            bucket = this.cells[KEY] = [];
        }
        if (!this.touched[KEY]) {
            this.touched[KEY] = 1;
            this.usedCells.push(KEY);
        }
        bucket.push(item);
        return true;
    }
    update(item, x = item?.x, y = item?.y) {
        if (!item) {
            return false;
        }
        const PREVIOUS = this.itemCells.get(item);
        const NEXT = this._cellKey(x, y);
        if (PREVIOUS === NEXT) {
            return NEXT >= 0;
        }
        if (PREVIOUS !== undefined) {
            if (PREVIOUS >= 0) {
                this._removeFromCell(item, PREVIOUS);
            } else {
                this._removeOverflow(item);
            }
        }
        this.itemCells.set(item, NEXT);
        if (NEXT < 0) {
            this.overflowItems.push(item);
            return false;
        }
        let bucket = this.cells[NEXT];
        if (!bucket) {
            bucket = this.cells[NEXT] = [];
        }
        if (!this.touched[NEXT]) {
            this.touched[NEXT] = 1;
            this.usedCells.push(NEXT);
        }
        bucket.push(item);
        return true;
    }
    remove(item) {
        const KEY = this.itemCells.get(item);
        if (KEY === undefined) {
            return false;
        }
        if (KEY >= 0) {
            this._removeFromCell(item, KEY);
        } else {
            this._removeOverflow(item);
        }
        this.itemCells.delete(item);
        return true;
    }
    _removeOverflow(item) {
        const INDEX = this.overflowItems.indexOf(item);
        if (INDEX < 0) {
            return;
        }
        const LAST = this.overflowItems.pop();
        if (INDEX < this.overflowItems.length) {
            this.overflowItems[INDEX] = LAST;
        }
    }
    _removeFromCell(item, key) {
        const BUCKET = this.cells[key];
        if (!BUCKET) {
            return;
        }
        const INDEX = BUCKET.indexOf(item);
        if (INDEX < 0) {
            return;
        }
        const LAST = BUCKET.pop();
        if (INDEX < BUCKET.length) {
            BUCKET[INDEX] = LAST;
        }
    }
    queryAABB(minX, minY, maxX, maxY, out) {
        out.length = 0;
        if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
            return out;
        }
        if (maxX >= WORLD_MIN && maxY >= WORLD_MIN && minX < WORLD_MAX && minY < WORLD_MAX) {
            const X0 = Math.max(0, this.cellX(minX)),
                Y0 = Math.max(0, this.cellY(minY));
            const X1 = Math.min(CELL_COUNT - 1, this.cellX(maxX)),
                Y1 = Math.min(CELL_COUNT - 1, this.cellY(maxY));
            for (let y = Y0; y <= Y1; y++) {
                const ROW = y * CELL_COUNT;
                for (let x = X0; x <= X1; x++) {
                    const BUCKET = this.cells[ROW + x];
                    if (BUCKET) {
                        for (let i = 0; i < BUCKET.length; i++) {
                            out.push(BUCKET[i]);
                        }
                    }
                }
            }
        }
        for (const ITEM of this.overflowItems) {
            if (ITEM.x >= minX && ITEM.x <= maxX && ITEM.y >= minY && ITEM.y <= maxY) {
                out.push(ITEM);
            }
        }
        return out;
    }
    queryCellRing(centerX, centerY, radius, out) {
        out.length = 0;
        const X0 = centerX - radius,
            X1 = centerX + radius;
        const Y0 = centerY - radius,
            Y1 = centerY + radius;
        if (radius === 0) {
            this._appendCell(centerX, centerY, out);
            return out;
        }
        for (let x = X0; x <= X1; x++) {
            this._appendCell(x, Y0, out);
            this._appendCell(x, Y1, out);
        }
        for (let y = Y0 + 1; y < Y1; y++) {
            this._appendCell(X0, y, out);
            this._appendCell(X1, y, out);
        }
        return out;
    }
    _appendCell(x, y, out) {
        if (x < 0 || y < 0 || x >= CELL_COUNT || y >= CELL_COUNT) {
            return;
        }
        const BUCKET = this.cells[y * CELL_COUNT + x];
        if (BUCKET) {
            for (let i = 0; i < BUCKET.length; i++) {
                out.push(BUCKET[i]);
            }
        }
    }
    distanceToOutsideRing(x, y, centerX, centerY, radius) {
        const LEFT = Math.max(0, centerX - radius),
            RIGHT = Math.min(CELL_COUNT - 1, centerX + radius);
        const BOTTOM = Math.max(0, centerY - radius),
            TOP = Math.min(CELL_COUNT - 1, centerY + radius);
        let nearest = Infinity;
        if (LEFT > 0) {
            nearest = Math.min(nearest, x - (WORLD_MIN + LEFT * CELL_SIZE));
        }
        if (RIGHT < CELL_COUNT - 1) {
            nearest = Math.min(nearest, WORLD_MIN + (RIGHT + 1) * CELL_SIZE - x);
        }
        if (BOTTOM > 0) {
            nearest = Math.min(nearest, y - (WORLD_MIN + BOTTOM * CELL_SIZE));
        }
        if (TOP < CELL_COUNT - 1) {
            nearest = Math.min(nearest, WORLD_MIN + (TOP + 1) * CELL_SIZE - y);
        }
        return Math.max(0, nearest);
    }
}
export { FixedSpatialGrid };
