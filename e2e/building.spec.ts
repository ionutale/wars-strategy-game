import { test, expect } from "@playwright/test";
import { clickButton, selectEntity, setPools, snapshot, spawnUnit, startCampaignAt, startSkirmish, tapCanvas, worldToScreen } from "./helpers";

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

  test("placement fails on an occupied site (no charge, no building)", async ({ page }) => {
    await startSkirmish(page);
    let snap = await snapshot(page);
    const worker = snap.entities.find((e) => e.type === "worker" && e.faction === "blue")!;
    const hall = snap.entities.find((e) => e.type === "town-hall" && e.faction === "blue")!;
    const farmsBefore = snap.entities.filter((e) => e.type === "farm" && e.faction === "blue").length;
    const goldBefore = snap.pools.blue.gold;
    await selectEntity(page, worker.id);
    await clickButton(page, "Build");
    await clickButton(page, "Farm");
    // tap right on the town hall (occupied -> canPlace rejects)
    const screen = await worldToScreen(page, hall.x, hall.y);
    await tapCanvas(page, screen.x, screen.y);
    await page.waitForTimeout(1000);
    snap = await snapshot(page);
    expect(snap.entities.filter((e) => e.type === "farm" && e.faction === "blue").length).toBe(farmsBefore);
    expect(snap.pools.blue.gold).toBe(goldBefore); // nothing charged
  });

  test("placement fails without enough gold", async ({ page }) => {
    await startSkirmish(page);
    const snap = await snapshot(page);
    const worker = snap.entities.find((e) => e.type === "worker" && e.faction === "blue")!;
    const farmsBefore = snap.entities.filter((e) => e.type === "farm" && e.faction === "blue").length;
    await setPools(page, "blue", { gold: 0, wood: 800 });
    await selectEntity(page, worker.id);
    await clickButton(page, "Build");
    await clickButton(page, "Barracks"); // costs 180g — can't afford
    const site = { x: 4.5, y: 4.5 };
    const screen = await worldToScreen(page, site.x, site.y);
    await tapCanvas(page, screen.x, screen.y);
    await page.waitForTimeout(1000);
    const s = await snapshot(page);
    expect(s.entities.filter((e) => e.type === "barracks" && e.faction === "blue").length).toBe(0);
    expect(s.entities.filter((e) => e.type === "farm" && e.faction === "blue").length).toBe(farmsBefore);
  });

  test("every building type can be placed", async ({ page }) => {
    await startSkirmish(page);
    let snap = await snapshot(page);
    const worker = snap.entities.find((e) => e.type === "worker" && e.faction === "blue")!;
    const base = { x: 6.5, y: 8.5 };
    const types = [
      { label: "Barracks", type: "barracks", site: { x: 2.5, y: 8.5 } },
      { label: "Tower", type: "tower", site: { x: 4.5, y: 10.5 } },
      { label: "Lumber Mill", type: "lumber-mill", site: { x: 2.5, y: 12.5 } },
      { label: "Blacksmith", type: "blacksmith", site: { x: 4.5, y: 14.5 } },
      { label: "Castle", type: "castle", site: { x: 12.5, y: 10.5 } },
      { label: "Stables", type: "stables", site: { x: 14.5, y: 12.5 } },
      { label: "Church", type: "church", site: { x: 16.5, y: 14.5 } },
    ];
    // give plenty of resources for all of them
    await setPools(page, "blue", { gold: 5000, wood: 5000 });
    for (const t of types) {
      await selectEntity(page, worker.id);
      await clickButton(page, "Build");
      await clickButton(page, t.label);
      const screen = await worldToScreen(page, t.site.x, t.site.y);
      await tapCanvas(page, screen.x, screen.y);
      await expect
        .poll(async () => (await snapshot(page)).entities.filter((e) => e.type === t.type && e.faction === "blue").length, { timeout: 5_000 })
        .toBe(1);
      // complete the foundation instantly so gated buildings can be placed next
      await page.evaluate((t) => {
        const w = window.__wars!;
        const b = [...w.session.world.entities.values()].find((e) => e.type === t && e.faction === "blue");
        if (b) b.progress = 1;
      }, t.type);
      void base;
    }
  });

  test("a built tower fires at enemies", async ({ page }) => {
    await startSkirmish(page);
    let snap = await snapshot(page);
    const worker = snap.entities.find((e) => e.type === "worker" && e.faction === "blue")!;
    await selectEntity(page, worker.id);
    await clickButton(page, "Build");
    await clickButton(page, "Tower");
    const site = { x: 6.5, y: 6.5 };
    const screen = await worldToScreen(page, site.x, site.y);
    await tapCanvas(page, screen.x, screen.y);
    // wait for the tower to be placed and constructed (15s build time)
    await expect
      .poll(async () => (await snapshot(page)).entities.filter((e) => e.type === "tower" && e.faction === "blue").length, { timeout: 5_000 })
      .toBe(1);
    await expect
      .poll(
        async () => {
          const s = await snapshot(page);
          const tower = s.entities.filter((e) => e.type === "tower" && e.faction === "blue").sort((a, b) => b.id - a.id)[0];
          return tower?.progress ?? 0;
        },
        { timeout: 30_000 },
      )
      .toBe(1);
    snap = await snapshot(page);
    const tower = snap.entities.filter((e) => e.type === "tower" && e.faction === "blue").sort((a, b) => b.id - a.id)[0];
    // spawn a red unit within the tower's range (5 tiles)
    const enemy = await spawnUnit(page, "footman", "red", tower.x + 3, tower.y);
    await expect
      .poll(async () => (await snapshot(page)).entities.find((x) => x.id === enemy)!.hp, { timeout: 15_000 })
      .toBeLessThan(40);
  });

  test("every production building trains its unit (m4 base)", async ({ page }) => {
    await startCampaignAt(page, 3); // m4: castle, barracks, stables, church, blacksmith
    const cases = [
      { building: "castle", button: "Worker", unit: "worker" },
      { building: "stables", button: "Knight", unit: "knight" },
      { building: "church", button: "Mage", unit: "mage" },
      { building: "church", button: "Priest", unit: "priest" },
      { building: "blacksmith", button: "Catapult", unit: "catapult" },
    ];
    for (const c of cases) {
      const snap = await snapshot(page);
      const b = snap.entities.find((e) => e.type === c.building && e.faction === "blue")!;
      await selectEntity(page, b.id);
      await clickButton(page, c.button);
      await expect
        .poll(async () => (await snapshot(page)).entities.find((e) => e.id === b.id)!.queue)
        .toContain(c.unit);
    }
  });
});
