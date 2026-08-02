import { test, expect } from "@playwright/test";
import { clickButton, selectEntity, snapshot, startCampaignAt, startSkirmish, tapCanvas, worldToScreen } from "./helpers";

test.describe("building", () => {
  test("worker build menu lists all 8 buildings", async ({ page }) => {
    await startSkirmish(page);
    const snap = await snapshot(page);
    const worker = snap.entities.find((e) => e.type === "worker" && e.faction === "blue")!;
    await selectEntity(page, worker.id);
    await clickButton(page, "Build");
    for (const label of ["Farm", "Barracks", "Tower", "Lumber Mill", "Blacksmith", "Stables", "Church", "Castle", "Cancel"]) {
      await expect(page.getByRole("button", { name: label })).toBeVisible();
    }
  });

  test("placing a farm charges resources and raises the food cap", async ({ page }) => {
    await startSkirmish(page);
    let snap = await snapshot(page);
    const worker = snap.entities.find((e) => e.type === "worker" && e.faction === "blue")!;
    const farmsBefore = snap.entities.filter((e) => e.type === "farm" && e.faction === "blue").length;
    const goldBefore = snap.pools.blue.gold;
    const capBefore = snap.foodCap.blue;
    await selectEntity(page, worker.id);
    await clickButton(page, "Build");
    await clickButton(page, "Farm");
    // tap a build site near the base, away from existing entities
    const site = { x: 4.5, y: 4.5 };
    const screen = await worldToScreen(page, site.x, site.y);
    await tapCanvas(page, screen.x, screen.y);
    // farm foundation appears (progress < 1) and gold was charged
    await expect
      .poll(async () => (await snapshot(page)).entities.filter((e) => e.type === "farm" && e.faction === "blue").length)
      .toBe(farmsBefore + 1);
    snap = await snapshot(page);
    expect(snap.pools.blue.gold).toBeLessThan(goldBefore);
    expect(snap.foodCap.blue).toBe(capBefore + 4);
  });

  test("a worker constructs the farm to completion", async ({ page }) => {
    await startSkirmish(page);
    let snap = await snapshot(page);
    const worker = snap.entities.find((e) => e.type === "worker" && e.faction === "blue")!;
    const farmsBefore = snap.entities.filter((e) => e.type === "farm" && e.faction === "blue").length;
    await selectEntity(page, worker.id);
    await clickButton(page, "Build");
    await clickButton(page, "Farm");
    const site = { x: 4.5, y: 4.5 };
    const screen = await worldToScreen(page, site.x, site.y);
    await tapCanvas(page, screen.x, screen.y);
    await expect
      .poll(async () => (await snapshot(page)).entities.filter((e) => e.type === "farm" && e.faction === "blue").length)
      .toBe(farmsBefore + 1);
    // wait for the NEW farm (largest id) to finish construction
    await expect
      .poll(
        async () => {
          const s = await snapshot(page);
          const farms = s.entities.filter((e) => e.type === "farm" && e.faction === "blue");
          const newest = farms.sort((a, b) => b.id - a.id)[0];
          return newest?.progress ?? 0;
        },
        { timeout: 30_000 },
      )
      .toBe(1);
  });

  test("town hall trains a worker", async ({ page }) => {
    await startSkirmish(page);
    const snap = await snapshot(page);
    const hall = snap.entities.find((e) => e.type === "town-hall" && e.faction === "blue")!;
    const workersBefore = snap.entities.filter((e) => e.type === "worker" && e.faction === "blue").length;
    await selectEntity(page, hall.id);
    await clickButton(page, "Worker");
    await expect
      .poll(async () => {
        const s = await snapshot(page);
        const h = s.entities.find((e) => e.id === hall.id)!;
        return h.queue;
      })
      .toEqual(["worker"]);
    // worker spawns after trainTime (8s)
    await expect
      .poll(
        async () =>
          (await snapshot(page)).entities.filter((e) => e.type === "worker" && e.faction === "blue").length,
        { timeout: 20_000 },
      )
      .toBe(workersBefore + 1);
  });

  test("barracks trains footmen into a queue (m4 base)", async ({ page }) => {
    await startCampaignAt(page, 3); // m4 has barracks + enough food
    const snap = await snapshot(page);
    const barracks = snap.entities.find((e) => e.type === "barracks" && e.faction === "blue")!;
    const combatBefore = snap.entities.filter(
      (e) => e.faction === "blue" && (e.type === "footman" || e.type === "archer"),
    ).length;
    await selectEntity(page, barracks.id);
    await clickButton(page, "Footman");
    await clickButton(page, "Archer");
    await expect
      .poll(async () => (await snapshot(page)).entities.find((e) => e.id === barracks.id)!.queue)
      .toEqual(["footman", "archer"]);
    // both spawn eventually
    await expect
      .poll(
        async () =>
          (await snapshot(page)).entities.filter(
            (e) => e.faction === "blue" && (e.type === "footman" || e.type === "archer"),
          ).length,
        { timeout: 40_000 },
      )
      .toBe(combatBefore + 2);
  });

  test("training is blocked without enough food", async ({ page }) => {
    await startSkirmish(page);
    const snap = await snapshot(page);
    const hall = snap.entities.find((e) => e.type === "town-hall" && e.faction === "blue")!;
    await selectEntity(page, hall.id);
    // spam workers until food is exhausted (cap 5 + farm 4 = 9, starts with 3)
    for (let i = 0; i < 20; i++) {
      await clickButton(page, "Worker");
    }
    const s = await snapshot(page);
    const h = s.entities.find((e) => e.id === hall.id)!;
    // queued workers cannot exceed available food (9 - 3 existing = 6)
    expect(h.queue.length).toBeLessThanOrEqual(6);
  });
});
