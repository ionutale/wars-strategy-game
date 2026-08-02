import { describe, expect, it } from "vitest";
import { createWorld } from "../../../src/world/world";
import { createEntity } from "../../../src/world/entity";
import { createGoldMine, createTreePatch } from "../../../src/world/map";
import { AIController, updateAI } from "../../../src/world/systems/ai";
import { updateConstruction } from "../../../src/world/systems/building";
import { updateEconomy } from "../../../src/world/systems/economy";
import { updateMovement } from "../../../src/world/systems/movement";

function setup() {
  const w = createWorld(60, 60);
  const hall = createEntity("building", "red", "town-hall", 50, 50, 300);
  const enemyHall = createEntity("building", "blue", "town-hall", 10, 10, 300);
  hall.progress = 1; // completed
  enemyHall.progress = 1;
  w.entities.set(hall.id, hall);
  w.entities.set(enemyHall.id, enemyHall);
  const mine = createGoldMine(44, 50);
  const trees = createTreePatch(50, 44);
  w.resources.set(mine.id, mine);
  w.resources.set(trees.id, trees);
  const ai = new AIController("red", w, "normal");
  return { w, ai };
}

/** Mini game loop mirroring the Task 19 orchestrator. */
function runFor(ai: AIController, w: ReturnType<typeof setup>["w"], seconds: number): void {
  for (let t = 0; t < seconds; t += 1) {
    updateMovement(w, 1);
    updateEconomy(w, 1);
    updateConstruction(w, 1);
    updateAI(ai, w, 1);
  }
}

describe("updateAI", () => {
  it("trains a worker first", () => {
    const { w, ai } = setup();
    runFor(ai, w, 30); // worker trainTime is 8s
    const workers = [...w.entities.values()].filter((e) => e.type === "worker" && e.faction === "red");
    expect(workers.length).toBeGreaterThanOrEqual(1);
  });

  it("builds a barracks then trains footmen and sends waves", () => {
    const { w, ai } = setup();
    w.pools.red.gold = 100000; w.pools.red.wood = 100000;
    runFor(ai, w, 600); // 10 minutes
    const footmen = [...w.entities.values()].filter((e) => e.type === "footman" && e.faction === "red");
    expect(footmen.length).toBeGreaterThan(0);
    expect(ai.waveCount).toBeGreaterThan(0);
  });

  it("does not spend the player's resources", () => {
    const { w, ai } = setup();
    w.pools.blue.gold = 10;
    w.pools.red.gold = 100000; w.pools.red.wood = 100000;
    runFor(ai, w, 300);
    expect(w.pools.blue.gold).toBe(10);
  });
});
