import { describe, expect, it } from "vitest";
import { createWorld } from "../../../src/world/world";
import { createEntity } from "../../../src/world/entity";
import { createGoldMine, createTreePatch } from "../../../src/world/map";
import { updateEconomy, orderGather, CARGO_CAPACITY } from "../../../src/world/systems/economy";
import { updateMovement } from "../../../src/world/systems/movement";

function setup() {
  const w = createWorld(40, 40);
  const worker = createEntity("unit", "blue", "worker", 2, 2, 20);
  const hall = createEntity("building", "blue", "town-hall", 8, 2, 200);
  const mine = createGoldMine(20, 20);
  w.entities.set(worker.id, worker);
  w.entities.set(hall.id, hall);
  w.resources.set(mine.id, mine);
  return { w, worker, hall, mine };
}

describe("updateEconomy", () => {
  it("carries a full load after reaching the node", () => {
    const { w, worker, mine } = setup();
    orderGather(worker, mine.id);
    worker.x = mine.x;
    worker.y = mine.y;
    updateEconomy(w, 1);
    expect(worker.cargo).toBe(CARGO_CAPACITY);
    expect(worker.cargoType).toBe("gold");
  });

  it("deposits cargo at the nearest town hall", () => {
    const { w, worker, mine, hall } = setup();
    orderGather(worker, mine.id);
    worker.x = mine.x; worker.y = mine.y;
    updateEconomy(w, 1);
    worker.x = hall.x; worker.y = hall.y;
    updateEconomy(w, 1);
    expect(worker.cargo).toBe(0);
    expect(w.pools.blue.gold).toBe(1200 + CARGO_CAPACITY);
  });

  it("depletes the node and stops gathering", () => {
    const { w, worker, mine } = setup();
    mine.amount = 10;
    orderGather(worker, mine.id);
    worker.x = mine.x; worker.y = mine.y;
    updateEconomy(w, 1);
    expect(mine.amount).toBe(0);
    expect(worker.order).toBeNull();
  });

  it("walks to the node when ordered to gather", () => {
    const { w, worker, mine } = setup(); // worker at (2,2), mine at (20,20)
    orderGather(worker, mine.id);
    updateEconomy(w, 0.1);
    expect(worker.path).not.toBeNull();
    // after walking for a while it should get closer (movement drives the path)
    for (let i = 0; i < 60; i++) { updateMovement(w, 1 / 6); updateEconomy(w, 1 / 6); }
    expect(Math.hypot(worker.x - mine.x, worker.y - mine.y)).toBeLessThan(10);
  });

  it("releases workers when a mine is at capacity", () => {
    const { w, worker, mine } = setup();
    mine.maxWorkers = 1;
    const worker2 = createEntity("unit", "blue", "worker", 3, 3, 20);
    w.entities.set(worker2.id, worker2);
    orderGather(worker, mine.id);
    orderGather(worker2, mine.id);
    // both assigned; mine allows 1
    updateEconomy(w, 0.1);
    const stillGathering = [...w.entities.values()].filter(
      (e) => e.type === "worker" && e.order && e.order.type === "gather",
    ).length;
    expect(stillGathering).toBe(1);
  });
});
