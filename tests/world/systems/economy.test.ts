import { describe, expect, it } from "vitest";
import { createWorld } from "../../../src/world/world";
import { createEntity } from "../../../src/world/entity";
import { createGoldMine, createTreePatch } from "../../../src/world/map";
import { updateEconomy, orderGather, CARGO_CAPACITY } from "../../../src/world/systems/economy";

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
});
