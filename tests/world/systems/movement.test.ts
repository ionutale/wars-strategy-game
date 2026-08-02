import { describe, expect, it } from "vitest";
import { createWorld } from "../../../src/world/world";
import { createEntity } from "../../../src/world/entity";
import { updateMovement, moveTo, setPath } from "../../../src/world/systems/movement";

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
    updateMovement(w, 1 / 12); // half-tile step: partial move sets facing
    expect(Math.abs(Math.cos(u.facing) - 1)).toBeLessThan(0.01); // facing +x
    expect(u.x).toBeGreaterThan(1);
    expect(u.x).toBeLessThan(2);
  });

  it("respects blocked tiles via pathfinding", () => {
    const { w, u } = setup();
    w.map.setBlocked(3, 1);
    moveTo(u, { x: 5, y: 1 }, w.map);
    updateMovement(w, 20);
    expect(u.x).toBeCloseTo(5, 0);
  });

  it("setPath moves a unit without touching its order", () => {
    const { w, u } = setup();
    u.order = { type: "gather", resourceId: 7 };
    setPath(u, { x: 5, y: 1 }, w.map);
    expect(u.path).not.toBeNull();
    expect(u.order).toEqual({ type: "gather", resourceId: 7 });
  });

  it("keeps non-move orders on arrival", () => {
    const { w, u } = setup();
    u.order = { type: "hold" };
    setPath(u, { x: 1.4, y: 1 }, w.map); // short path
    updateMovement(w, 10); // finish
    expect(u.path).toBeNull();
    expect(u.order).toEqual({ type: "hold" });
  });
});
