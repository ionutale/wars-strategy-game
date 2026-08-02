import { test, expect } from "@playwright/test";
import { advance, clickButton, killAllBuildings, killEntity, setPools, snapshot, startCampaignAt, startSkirmish } from "./helpers";

test.describe("endgame", () => {
  test("destroying all enemy buildings triggers victory", async ({ page }) => {
    await startSkirmish(page);
    const snap = await snapshot(page);
    const redBuildings = snap.entities.filter((e) => e.kind === "building" && e.faction === "red");
    expect(redBuildings.length).toBeGreaterThan(0);
    await killAllBuildings(page, "red");
    await expect(page.getByRole("heading", { name: "VICTORY" })).toBeVisible({ timeout: 15_000 });
    const s = await snapshot(page);
    expect(s.state).toBe("victory");
  });

  test("losing the town hall triggers defeat", async ({ page }) => {
    await startSkirmish(page);
    const snap = await snapshot(page);
    const hall = snap.entities.find((e) => e.type === "town-hall" && e.faction === "blue")!;
    await killEntity(page, hall.id);
    await expect(page.getByRole("heading", { name: "DEFEAT" })).toBeVisible({ timeout: 15_000 });
    const s = await snapshot(page);
    expect(s.state).toBe("defeat");
  });

  test("campaign victory advances to the next mission on Play Again", async ({ page }) => {
    await startCampaignAt(page, 0);
    const snap = await snapshot(page);
    await killAllBuildings(page, "red");
    await expect(page.getByRole("heading", { name: "VICTORY" })).toBeVisible({ timeout: 15_000 });
    await clickButton(page, "Play Again");
    const s = await snapshot(page);
    expect(s.state).toBe("playing");
    expect(s.missionIndex).toBe(1); // advanced to m2
  });

  test("skirmish victory replays a fresh skirmish on Play Again", async ({ page }) => {
    await startSkirmish(page);
    const snap = await snapshot(page);
    await killAllBuildings(page, "red");
    await expect(page.getByRole("heading", { name: "VICTORY" })).toBeVisible({ timeout: 15_000 });
    await clickButton(page, "Play Again");
    const s = await snapshot(page);
    expect(s.state).toBe("playing");
    expect(s.mode).toBe("skirmish");
    // fresh world: resources reset
    expect(s.pools.blue.gold).toBe(1200);
  });

  test("campaign defeat replays the same mission on Play Again", async ({ page }) => {
    await startCampaignAt(page, 0);
    const snap = await snapshot(page);
    const hall = snap.entities.find((e) => e.type === "town-hall" && e.faction === "blue")!;
    await killEntity(page, hall.id);
    await expect(page.getByRole("heading", { name: "DEFEAT" })).toBeVisible({ timeout: 15_000 });
    await clickButton(page, "Play Again");
    const s = await snapshot(page);
    expect(s.state).toBe("playing");
    expect(s.missionIndex).toBe(0); // same mission
  });

  test("main menu button returns to the menu", async ({ page }) => {
    await startSkirmish(page);
    const snap = await snapshot(page);
    for (const b of snap.entities.filter((e) => e.kind === "building" && e.faction === "blue")) {
      await killEntity(page, b.id);
    }
    await expect(page.getByRole("heading", { name: "DEFEAT" })).toBeVisible({ timeout: 15_000 });
    await clickButton(page, "Main Menu");
    await expect(page.getByRole("heading", { name: "WARS" })).toBeVisible();
  });

  test("towers auto-fire at enemies in range", async ({ page }) => {
    await startCampaignAt(page, 4); // m5 has blue towers at (6,6) and (12,6)
    const snap = await snapshot(page);
    const tower = snap.entities.find((e) => e.type === "tower" && e.faction === "blue")!;
    // spawn a red unit near the tower
    await page.evaluate(([t, wx, wy]) => {
      const w = window.__wars!;
      const e = w.createEntity("unit", "red", "footman", wx, wy, 40);
      w.session.world.entities.set(e.id, e);
    }, [tower.id, tower.x + 3, tower.y] as const);
    // tower range is 5 tiles; find any red unit and check it takes damage
    await expect
      .poll(
        async () => {
          const s = await snapshot(page);
          const red = s.entities.filter((e) => e.faction === "red" && e.kind === "unit");
          return red.reduce((min, e) => Math.min(min, e.hp), 999);
        },
        { timeout: 20_000 },
      )
      .toBeLessThan(40);
  });

  test("survive mission wins when the timer expires (m2)", async ({ page }) => {
    await startCampaignAt(page, 1); // m2: survive 8 minutes
    // make the AI harmless so it can't destroy our base before the timer
    await setPools(page, "red", { gold: 0, wood: 0 });
    await advance(page, 8 * 60 + 5); // past the 480s survive threshold
    await expect(page.getByRole("heading", { name: "VICTORY" })).toBeVisible({ timeout: 15_000 });
    const s = await snapshot(page);
    expect(s.state).toBe("victory");
  });

  test("winning the final mission returns to the menu", async ({ page }) => {
    await startCampaignAt(page, 4); // m5: last mission
    await killAllBuildings(page, "red");
    await expect(page.getByRole("heading", { name: "VICTORY" })).toBeVisible({ timeout: 15_000 });
    await clickButton(page, "Play Again");
    // missionIndex 4 -> 5 is out of range -> reload back to the menu
    await expect(page.getByRole("heading", { name: "WARS" })).toBeVisible({ timeout: 15_000 });
  });
});
