import { describe, expect, it } from "vitest";
import { createWorld } from "../../../src/world/world";
import { createEntity } from "../../../src/world/entity";
import { updateMovement, moveTo } from "../../../src/world/systems/movement";

function setup() {
  const w = createWorld(30, 30);
  const u = createEntity("unit", "blue", "footman", 1, 1, 40);
  w.entities.set(u.id, u);
  return { w, u };
}

describe("updateMovement", () => {
  it("walks a path at unit speed", () => {
    const { w, u } = setup();
    moveTo(u, { x: 5, y: 1 }, w.map); // path from 1,1 -> 5,1
    updateMovement(w, 1 / 60);
    expect(u.x).toBeGreaterThan(1);
    expect(u.path).not.toBeNull();
    updateMovement(w, 10);
    expect(u.x).toBeCloseTo(5, 0);
    expect(u.path).toBeNull();
    expect(u.order).toBeNull();
  });

  it("faces the direction of travel", () => {
    const { w, u } = setup();
    moveTo(u, { x: 5, y: 1 }, w.map);
    updateMovement(w, 1);
    expect(Math.abs(Math.cos(u.facing) - 1)).toBeLessThan(0.01); // facing +x
  });

  it("respects blocked tiles via pathfinding", () => {
    const { w, u } = setup();
    w.map.setBlocked(3, 1);
    moveTo(u, { x: 5, y: 1 }, w.map);
    updateMovement(w, 20);
    expect(u.x).toBeCloseTo(5, 0);
  });
});
