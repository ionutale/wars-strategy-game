import type { Vec2 } from "../core/camera";

export type TerrainType = "grass" | "forest" | "rock";

export interface Tile {
  walkable: boolean;
  terrain: TerrainType;
}

export class MapData {
  tiles: Tile[][];
  constructor(public w: number, public h: number) {
    this.tiles = Array.from({ length: h }, () =>
      Array.from({ length: w }, () => ({ walkable: true, terrain: "grass" as TerrainType })),
    );
  }
  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }
  walkable(x: number, y: number): boolean {
    return this.inBounds(x, y) && this.tiles[y][x].walkable;
  }
  setBlocked(x: number, y: number): void {
    if (this.inBounds(x, y)) this.tiles[y][x].walkable = false;
  }
  setTerrain(x: number, y: number, t: TerrainType): void {
    if (this.inBounds(x, y)) this.tiles[y][x].terrain = t;
  }
}

export function createMap(w: number, h: number): MapData {
  return new MapData(w, h);
}

export interface ResourceNode {
  id: number;
  kind: "gold" | "wood";
  x: number;
  y: number;
  amount: number;
  maxWorkers: number;
}

let resourceId = 1;

export function createGoldMine(x: number, y: number, amount = 1500): ResourceNode {
  return { id: resourceId++, kind: "gold", x, y, amount, maxWorkers: 6 };
}

export function createTreePatch(x: number, y: number, amount = 100): ResourceNode {
  return { id: resourceId++, kind: "wood", x, y, amount, maxWorkers: 4 };
}

const DIAGS = Math.SQRT2;

export function findPath(map: MapData, from: Vec2, to: Vec2): Vec2[] | null {
  const sx = Math.floor(from.x);
  const sy = Math.floor(from.y);
  const gx = Math.floor(to.x);
  const gy = Math.floor(to.y);
  if (!map.walkable(sx, sy) || !map.walkable(gx, gy)) return null;
  if (sx === gx && sy === gy) return [{ x: sx, y: sy }];

  const open: { x: number; y: number; f: number; g: number }[] = [{ x: sx, y: sy, f: 0, g: 0 }];
  const cameFrom = new Map<string, { x: number; y: number } | null>();
  const gScore = new Map<string, number>();
  const key = (x: number, y: number) => `${x},${y}`;
  gScore.set(key(sx, sy), 0);
  const closed = new Set<string>();

  const dirs = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [1, -1], [-1, 1], [-1, -1],
  ];

  while (open.length > 0) {
    open.sort((a, b) => a.f - b.f);
    const cur = open.shift()!;
    const ck = key(cur.x, cur.y);
    if (closed.has(ck)) continue;
    closed.add(ck);
    if (cur.x === gx && cur.y === gy) {
      const path: Vec2[] = [];
      let node: { x: number; y: number } | null = cur;
      while (node) {
        path.unshift({ x: node.x, y: node.y });
        node = cameFrom.get(key(node.x, node.y)) ?? null;
      }
      return path;
    }
    for (const [dx, dy] of dirs) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (!map.walkable(nx, ny)) continue;
      const diag = dx !== 0 && dy !== 0;
      if (diag && (!map.walkable(cur.x + dx, cur.y) || !map.walkable(cur.x, cur.y + dy))) continue;
      const nk = key(nx, ny);
      if (closed.has(nk)) continue;
      const tentative = cur.g + (diag ? DIAGS : 1);
      if (tentative < (gScore.get(nk) ?? Infinity)) {
        gScore.set(nk, tentative);
        cameFrom.set(nk, { x: cur.x, y: cur.y });
        const h = Math.hypot(nx - gx, ny - gy);
        open.push({ x: nx, y: ny, f: tentative + h, g: tentative });
      }
    }
  }
  return null;
}
