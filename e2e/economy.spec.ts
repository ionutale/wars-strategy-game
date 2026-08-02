import { test, expect } from "@playwright/test";
import { clickButton, selectEntity, setPools, snapshot, spawnUnit, startSkirmish } from "./helpers";

test.describe("economy — worker inputs", () => {
  test("resource bar shows gold, wood and food", async ({ page }) => {
    await startSkirmish(page);
    await expect(page.locator(".hud-top")).toContainText("Gold 1200");
    await expect(page.locator(".hud-top")).toContainText("Wood 800");
    await expect(page.locator(".hud-top")).toContainText("Food");
  });

  test("starting workers auto-gather gold without input", async ({ page }) => {
    await startSkirmish(page);
    const gold0 = (await snapshot(page)).pools.blue.gold;
    await page.waitForTimeout(5000);
    const gold1 = (await snapshot(page)).pools.blue.gold;
    expect(gold1).toBeGreaterThan(gold0);
  });

  test("Gather Gold button sends an idle worker to mine gold", async ({ page }) => {
    await startSkirmish(page);
    const idle = await spawnUnit(page, "worker", "blue", 6, 16); // fresh, idle
    await selectEntity(page, idle);
    await clickButton(page, "Gather Gold");
    // order is set to gather gold
    await expect
      .poll(async () => (await snapshot(page)).entities.find((x) => x.id === idle)!.order)
      .toMatchObject({ type: "gather" });
    // and gold rises as it mines and deposits
    const gold0 = (await snapshot(page)).pools.blue.gold;
    await expect
      .poll(async () => (await snapshot(page)).pools.blue.gold, { timeout: 30_000 })
      .toBeGreaterThan(gold0);
  });

  test("Gather Wood button sends an idle worker to chop wood", async ({ page }) => {
    await startSkirmish(page);
    const idle = await spawnUnit(page, "worker", "blue", 6, 16);
    await selectEntity(page, idle);
    await clickButton(page, "Gather Wood");
    await expect
      .poll(async () => (await snapshot(page)).entities.find((x) => x.id === idle)!.order)
      .toMatchObject({ type: "gather" });
    const wood0 = (await snapshot(page)).pools.blue.wood;
    await expect
      .poll(async () => (await snapshot(page)).pools.blue.wood, { timeout: 30_000 })
      .toBeGreaterThan(wood0);
  });

  test("a worker gathers a node to depletion and delivers the final load", async ({ page }) => {
    await startSkirmish(page);
    const snap = await snapshot(page);
    const worker = snap.entities.find((e) => e.type === "worker" && e.faction === "blue")!;
    // shrink the nearest wood node to exactly 100 (2 loads of 50)
    await page.evaluate(() => {
      const w = window.__wars!;
      const wood = [...w.session.world.resources.values()].find((r) => r.kind === "wood");
      if (wood) wood.amount = 100;
    });
    const wood0 = (await snapshot(page)).pools.blue.wood;
    await selectEntity(page, worker.id);
    await clickButton(page, "Gather Wood");
    // both loads deposited: pool increases by the full 100
    await expect
      .poll(async () => (await snapshot(page)).pools.blue.wood, { timeout: 40_000 })
      .toBe(wood0 + 100);
    // worker is idle and NOT stranded carrying cargo
    const w2 = (await snapshot(page)).entities.find((e) => e.id === worker.id)!;
    expect(w2.cargo).toBe(0);
    expect(w2.order).toBeNull();
  });

  test("gold mine depletion stops a gathering worker cleanly", async ({ page }) => {
    await startSkirmish(page);
    const snap = await snapshot(page);
    const worker = snap.entities.find((e) => e.type === "worker" && e.faction === "blue")!;
    await page.evaluate(() => {
      const w = window.__wars!;
      const gold = [...w.session.world.resources.values()].find((r) => r.kind === "gold");
      if (gold) gold.amount = 50; // exactly one load
    });
    const gold0 = (await snapshot(page)).pools.blue.gold;
    await selectEntity(page, worker.id);
    await clickButton(page, "Gather Gold");
    await expect
      .poll(async () => (await snapshot(page)).pools.blue.gold, { timeout: 40_000 })
      .toBe(gold0 + 50);
    const w2 = (await snapshot(page)).entities.find((e) => e.id === worker.id)!;
    expect(w2.cargo).toBe(0);
    expect(w2.order).toBeNull();
  });

  test("Stop command halts a gathering worker", async ({ page }) => {
    await startSkirmish(page);
    const snap = await snapshot(page);
    const worker = snap.entities.find((e) => e.type === "worker" && e.faction === "blue")!;
    await selectEntity(page, worker.id);
    await clickButton(page, "Stop");
    await expect
      .poll(async () => (await snapshot(page)).entities.find((x) => x.id === worker.id)!.order)
      .toEqual({ type: "stop" });
  });

  test("Hold command sets hold on a worker", async ({ page }) => {
    await startSkirmish(page);
    const snap = await snapshot(page);
    const worker = snap.entities.find((e) => e.type === "worker" && e.faction === "blue")!;
    await selectEntity(page, worker.id);
    await clickButton(page, "Hold");
    await expect
      .poll(async () => (await snapshot(page)).entities.find((x) => x.id === worker.id)!.order)
      .toEqual({ type: "hold" });
  });

  test("gathering continues automatically without re-clicking", async ({ page }) => {
    await startSkirmish(page);
    const snap = await snapshot(page);
    const worker = snap.entities.find((e) => e.type === "worker" && e.faction === "blue")!;
    await selectEntity(page, worker.id);
    await clickButton(page, "Gather Gold");
    const gold0 = (await snapshot(page)).pools.blue.gold;
    // two deposits without any further clicks
    await expect
      .poll(async () => (await snapshot(page)).pools.blue.gold, { timeout: 40_000 })
      .toBeGreaterThanOrEqual(gold0 + 100);
  });

  test("Gather Wood picks the nearest wood node even after one depletes", async ({ page }) => {
    await startSkirmish(page);
    const snap = await snapshot(page);
    const worker = snap.entities.find((e) => e.type === "worker" && e.faction === "blue")!;
    await selectEntity(page, worker.id);
    await clickButton(page, "Gather Wood");
    // deplete the nearest node quickly by shrinking it
    await page.evaluate(() => {
      const w = window.__wars!;
      const wood = [...w.session.world.resources.values()]
        .filter((r) => r.kind === "wood")
        .sort((a, b) => a.x + a.y - (b.x + b.y))[0];
      if (wood) wood.amount = 50;
    });
    const wood0 = (await snapshot(page)).pools.blue.wood;
    // first node's 50 is delivered; re-clicking finds another node (order stays valid)
    await expect
      .poll(async () => (await snapshot(page)).pools.blue.wood, { timeout: 40_000 })
      .toBeGreaterThanOrEqual(wood0 + 50);
    await selectEntity(page, worker.id);
    await clickButton(page, "Gather Wood");
    await expect
      .poll(async () => (await snapshot(page)).entities.find((x) => x.id === worker.id)!.order)
      .toMatchObject({ type: "gather" });
  });

  test("worker cannot build without a worker selected", async ({ page }) => {
    await startSkirmish(page);
    // select nothing (deselect by tapping empty ground happens in selection spec);
    // Build button only appears for workers
    const snap = await snapshot(page);
    const hall = snap.entities.find((e) => e.type === "town-hall" && e.faction === "blue")!;
    await selectEntity(page, hall.id);
    await expect(page.getByRole("button", { name: "Build" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Gather Gold" })).toHaveCount(0);
  });

  test("resource pools respect faction separation", async ({ page }) => {
    await startSkirmish(page);
    await setPools(page, "red", { gold: 0, wood: 0 });
    const snap = await snapshot(page);
    expect(snap.pools.red.gold).toBe(0);
    // blue pool keeps growing from its own miners
    const gold0 = snap.pools.blue.gold;
    await expect
      .poll(async () => (await snapshot(page)).pools.blue.gold, { timeout: 20_000 })
      .toBeGreaterThan(gold0);
  });
});
