import { describe, expect, it } from "vitest";
import { createWorld } from "../../../src/world/world";
import { createEntity } from "../../../src/world/entity";
import { canPlace, placeFoundation, updateConstruction, trainQueue, canTrain, BUILDINGS, buildCost } from "../../../src/world/systems/building";

function setup() {
  const w = createWorld(40, 40);
  const hall = createEntity("building", "blue", "town-hall", 8, 8, 200);
  w.entities.set(hall.id, hall);
  return { w, hall };
}

describe("building placement", () => {
  it("validates bounds and walkability", () => {
    const { w } = setup();
    expect(canPlace(w, "farm", 1, 1, "blue")).toBe(true);
    w.map.setBlocked(1, 1);
    expect(canPlace(w, "farm", 1, 1, "blue")).toBe(false);
    expect(canPlace(w, "farm", 100, 100, "blue")).toBe(false);
  });

  it("charges resources upfront", () => {
    const { w } = setup();
    const cost = buildCost("farm");
    w.pools.blue.gold = cost.gold;
    w.pools.blue.wood = cost.wood;
    placeFoundation(w, "farm", "blue", 1, 1);
    expect(w.pools.blue.gold).toBe(0);
    expect(w.pools.blue.wood).toBe(0);
  });
});

describe("construction", () => {
  it("progresses when a worker builds and completes at 1", () => {
    const { w, hall } = setup();
    const farm = createEntity("building", "blue", "farm", 1, 1, 50);
    const worker = createEntity("unit", "blue", "worker", 1.5, 1.5, 20);
    worker.order = { type: "build", buildingId: farm.id };
    w.entities.set(farm.id, farm);
    w.entities.set(worker.id, worker);
    updateConstruction(w, 5); // half of the 10s build time
    expect(farm.progress).toBeGreaterThan(0);
    expect(farm.progress).toBeLessThan(1);
    updateConstruction(w, 10); // finish
    expect(farm.progress).toBe(1);
  });
});

describe("training", () => {
  it("trains queued units and charges resources", () => {
    const { w, hall } = setup();
    w.pools.blue.gold = 1000; w.pools.blue.wood = 500;
    expect(canTrain(w, hall, "worker")).toBe(true);
    trainQueue(w, hall, "worker");
    expect(hall.queue).toEqual(["worker"]);
    expect(w.pools.blue.gold).toBeLessThan(1000);
    updateConstruction(w, 0.01); // one tick of training
    expect(hall.progress).toBeGreaterThan(0);
  });
});
