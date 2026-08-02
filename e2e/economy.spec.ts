import { test, expect } from "@playwright/test";
import { clickButton, selectEntity, snapshot, startSkirmish } from "./helpers";

test.describe("economy", () => {
  test("resource bar shows gold, wood and food", async ({ page }) => {
    await startSkirmish(page);
    await expect(page.locator(".hud-top")).toContainText("Gold 1200");
    await expect(page.locator(".hud-top")).toContainText("Wood 800");
    await expect(page.locator(".hud-top")).toContainText("Food");
  });

  test("gather gold increases the gold pool", async ({ page }) => {
    await startSkirmish(page);
    const snap = await snapshot(page);
    const worker = snap.entities.find((e) => e.type === "worker" && e.faction === "blue")!;
    await selectEntity(page, worker.id);
    await clickButton(page, "Gather Gold");
    await expect
      .poll(async () => (await snapshot(page)).pools.blue.gold, { timeout: 30_000 })
      .toBeGreaterThan(1200);
  });

  test("gather wood increases the wood pool", async ({ page }) => {
    await startSkirmish(page);
    const snap = await snapshot(page);
    const worker = snap.entities.find((e) => e.type === "worker" && e.faction === "blue")!;
    await selectEntity(page, worker.id);
    await clickButton(page, "Gather Wood");
    await expect
      .poll(async () => (await snapshot(page)).pools.blue.wood, { timeout: 30_000 })
      .toBeGreaterThan(800);
  });

  test("gold mines deplete over time", async ({ page }) => {
    await startSkirmish(page);
    const before = (await snapshot(page)).resources.filter((r) => r.kind === "gold")[0].amount;
    await expect
      .poll(async () => (await snapshot(page)).resources.filter((r) => r.kind === "gold")[0].amount, { timeout: 40_000 })
      .toBeLessThan(before);
  });

  test("auto-gather continues without player input", async ({ page }) => {
    await startSkirmish(page);
    const gold0 = (await snapshot(page)).pools.blue.gold;
    await page.waitForTimeout(5000);
    const gold1 = (await snapshot(page)).pools.blue.gold;
    await page.waitForTimeout(5000);
    const gold2 = (await snapshot(page)).pools.blue.gold;
    expect(gold1).toBeGreaterThan(gold0);
    expect(gold2).toBeGreaterThan(gold1);
  });
});
