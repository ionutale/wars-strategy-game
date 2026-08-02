import { describe, expect, it } from "vitest";
import { createMap, MapData, findPath } from "../../src/world/map";

function makeMap(w: number, h: number, blocked: [number, number][]): MapData {
  const m = createMap(w, h);
  for (const [x, y] of blocked) m.setBlocked(x, y);
  return m;
}

describe("MapData", () => {
  it("reports bounds and walkability", () => {
    const m = makeMap(5, 5, [[2, 2]]);
    expect(m.inBounds(0, 0)).toBe(true);
    expect(m.inBounds(5, 5)).toBe(false);
    expect(m.walkable(2, 2)).toBe(false);
    expect(m.walkable(1, 1)).toBe(true);
  });
});

describe("findPath", () => {
  it("returns a single waypoint when already at the goal tile", () => {
    const m = makeMap(5, 5, []);
    const path = findPath(m, { x: 2, y: 2 }, { x: 2.4, y: 2.6 });
    expect(path).toEqual([{ x: 2, y: 2 }]);
  });

  it("finds a straight path on open ground", () => {
    const m = makeMap(5, 5, []);
    const path = findPath(m, { x: 0, y: 0 }, { x: 4, y: 0 });
    expect(path).not.toBeNull();
    expect(path![path!.length - 1]).toEqual({ x: 4, y: 0 });
  });

  it("routes around a wall", () => {
    const m = makeMap(5, 5, [[2, 0], [2, 1], [2, 2]]);
    const path = findPath(m, { x: 0, y: 0 }, { x: 4, y: 0 });
    expect(path).not.toBeNull();
    expect(path!.some((p) => p.y === 2)).toBe(true); // had to go around
  });

  it("returns null when the goal is unreachable", () => {
    const m = makeMap(5, 5, [[1, 0], [1, 1], [1, 2], [1, 3], [1, 4]]);
    const path = findPath(m, { x: 0, y: 0 }, { x: 3, y: 0 });
    expect(path).toBeNull();
  });
});
