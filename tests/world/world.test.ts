import { describe, expect, it } from "vitest";
import { createWorld, drainEvents } from "../../src/world/world";
import { createGoldMine } from "../../src/world/map";
import { createEntity } from "../../src/world/entity";

describe("createWorld", () => {
  it("holds entities, resources, and starting resources", () => {
    const w = createWorld(40, 30);
    const e = createEntity("unit", "blue", "worker", 5, 5, 20);
    const m = createGoldMine(10, 10);
    w.entities.set(e.id, e);
    w.resources.set(m.id, m);
    expect(w.entities.get(e.id)).toBe(e);
    expect(w.pools.blue.gold).toBe(1200);
    expect(w.pools.blue.wood).toBe(800);
    expect(w.foodCap.blue).toBe(5);
  });

  it("logs events for audio/ui", () => {
    const w = createWorld(40, 30);
    w.events.push({ kind: "sfx", name: "select" });
    expect(drainEvents(w)).toEqual([{ kind: "sfx", name: "select" }]);
    expect(w.events.length).toBe(0);
  });
});
