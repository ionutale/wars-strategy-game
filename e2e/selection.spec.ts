import { test, expect } from "@playwright/test";
import { clickButton, selectEntity, snapshot, spawnUnit, startSkirmish, tapCanvas, worldToScreen } from "./helpers";

test.describe("selection", () => {
  test("tapping a unit selects it and shows the panel", async ({ page }) => {
    await startSkirmish(page);
    const snap = await snapshot(page);
    const worker = snap.entities.find((e) => e.type === "worker" && e.faction === "blue")!;
    await selectEntity(page, worker.id);
    await expect(page.locator(".hud-panel")).toContainText("Worker");
    await expect(page.locator(".hud-panel")).toContainText("HP");
  });

  test("tapping a building selects it and shows train buttons", async ({ page }) => {
    await startSkirmish(page);
    const snap = await snapshot(page);
    const hall = snap.entities.find((e) => e.type === "town-hall" && e.faction === "blue")!;
    await selectEntity(page, hall.id);
    await expect(page.locator(".hud-panel")).toContainText("Town Hall");
    await expect(page.getByRole("button", { name: "Worker" })).toBeVisible();
  });

  test("tapping empty ground deselects", async ({ page }) => {
    await startSkirmish(page);
    const snap = await snapshot(page);
    const worker = snap.entities.find((e) => e.type === "worker" && e.faction === "blue")!;
    await selectEntity(page, worker.id);
    await expect.poll(() => snapshot(page).then((s) => s.selected.length)).toBe(1);
    // find empty ground: a world position away from entities
    const empty = await page.evaluate(() => {
      const s = window.__wars!.session;
      const cam = window.__wars!.cam;
      for (let wx = 10; wx < 50; wx += 2) {
        for (let wy = 10; wy < 40; wy += 2) {
          const near = [...s.world.entities.values()].some(
            (e) => Math.hypot(e.x - wx, e.y - wy) < 2,
          );
          if (!near) {
            const p = cam.worldToScreen(wx, wy);
            if (p.x > 0 && p.x < 844 && p.y > 30 && p.y < 360) return { x: p.x, y: p.y };
          }
        }
      }
      return null;
    });
    await tapCanvas(page, empty.x, empty.y);
    await expect.poll(() => snapshot(page).then((s) => s.selected.length)).toBe(0);
    await expect(page.locator(".hud-panel")).toHaveCount(0);
  });

  test("tapping an enemy unit does not select it", async ({ page }) => {
    await startSkirmish(page);
    const enemy = await spawnUnit(page, "footman", "red", 20, 20);
    const snap = await snapshot(page);
    const e = snap.entities.find((x) => x.id === enemy)!;
    const { x, y } = await worldToScreen(page, e.x, e.y);
    await tapCanvas(page, x, y);
    await expect.poll(() => snapshot(page).then((s) => s.selected.length)).toBe(0);
  });

  test("select-all selects all combat units", async ({ page }) => {
    await startSkirmish(page);
    const f1 = await spawnUnit(page, "footman", "blue", 6, 12);
    const f2 = await spawnUnit(page, "archer", "blue", 7, 13);
    await spawnUnit(page, "worker", "blue", 8, 11); // workers excluded
    await clickButton(page, "⚔ All");
    const snap = await snapshot(page);
    expect(snap.selected).toContain(f1);
    expect(snap.selected).toContain(f2);
    // no workers selected
    const selEntities = snap.entities.filter((e) => snap.selected.includes(e.id));
    expect(selEntities.every((e) => e.type !== "worker")).toBe(true);
    expect(selEntities.length).toBe(2);
  });

  test("selection panel shows the unit's current order", async ({ page }) => {
    await startSkirmish(page);
    const snap = await snapshot(page);
    const worker = snap.entities.find((e) => e.type === "worker" && e.faction === "blue")!;
    await selectEntity(page, worker.id);
    // starting workers auto-gather
    await expect(page.locator(".hud-panel")).toContainText("Gathering");
  });
});
