import { describe, expect, it } from "vitest";
import { createEntity, isBuilding, isUnit } from "../../src/world/entity";

describe("entity", () => {
  it("allocates unique ids", () => {
    const a = createEntity("unit", "blue", "footman", 0, 0);
    const b = createEntity("unit", "blue", "footman", 0, 0);
    expect(b.id).toBe(a.id + 1);
  });

  it("starts with full hp and no order", () => {
    const e = createEntity("unit", "red", "knight", 5, 5, 100);
    expect(e.hp).toBe(100);
    expect(e.maxHp).toBe(100);
    expect(e.order).toBeNull();
    expect(e.path).toBeNull();
    expect(e.cargo).toBe(0);
    expect(e.queue).toEqual([]);
  });

  it("distinguishes units and buildings", () => {
    expect(isUnit(createEntity("unit", "blue", "worker", 0, 0))).toBe(true);
    expect(isBuilding(createEntity("building", "blue", "town-hall", 0, 0))).toBe(true);
  });
});
