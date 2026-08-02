import { test, expect } from "@playwright/test";
import { snapshot, startCampaignAt, startSkirmish } from "./helpers";

test.describe("main menu and game start", () => {
  test("menu shows title and all start options", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "WARS" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Campaign" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Skirmish — Easy" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Skirmish — Normal" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Skirmish — Hard" })).toBeVisible();
  });

  test("campaign starts mission 1 in playing state", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Campaign" }).click();
    // mission intro overlay shows; dismiss it to start the game loop
    await expect(page.getByRole("heading", { name: "First Steps" })).toBeVisible();
    await page.getByRole("button", { name: "Begin" }).click();
    const snap = await snapshot(page);
    expect(snap.state).toBe("playing");
    expect(snap.mode).toBe("campaign");
    expect(snap.missionIndex).toBe(0);
    // player base spawned
    expect(snap.entities.some((e) => e.type === "town-hall" && e.faction === "blue")).toBe(true);
    expect(snap.entities.some((e) => e.type === "town-hall" && e.faction === "red")).toBe(true);
    // camera fits the map (whole map visible)
    const s = await snapshot(page);
    expect(s.cam.zoom).toBeLessThan(1);
  });

  test("skirmish easy/normal/hard all start a game with an AI base", async ({ page }) => {
    for (const d of ["easy", "normal", "hard"] as const) {
      await page.goto("/");
      await page.getByRole("button", { name: `Skirmish — ${d[0].toUpperCase()}${d.slice(1)}` }).click();
      const snap = await snapshot(page);
      expect(snap.state).toBe("playing");
      expect(snap.mode).toBe("skirmish");
      expect(snap.entities.some((e) => e.type === "town-hall" && e.faction === "red")).toBe(true);
      expect(snap.pools.blue.gold).toBe(1200);
      expect(snap.entities.filter((e) => e.type === "worker" && e.faction === "blue").length).toBe(3);
    }
  });

  test("starting workers auto-gather gold", async ({ page }) => {
    await startSkirmish(page);
    const before = (await snapshot(page)).pools.blue.gold;
    await expect
      .poll(async () => (await snapshot(page)).pools.blue.gold, { timeout: 20_000 })
      .toBeGreaterThan(before);
  });

  test("time advances and systems run without errors", async ({ page }) => {
    await startSkirmish(page);
    const t0 = (await snapshot(page)).time;
    await expect.poll(async () => (await snapshot(page)).time).toBeGreaterThan(t0 + 2);
    // no error overlays from the game
    await expect(page.locator(".screen")).toHaveCount(0);
  });

  test("later campaign missions start via hook (m4 full base)", async ({ page }) => {
    await startCampaignAt(page, 3); // m4: castle, barracks, church, stables, blacksmith
    const snap = await snapshot(page);
    expect(snap.missionIndex).toBe(3);
    for (const t of ["castle", "barracks", "church", "stables", "blacksmith"]) {
      expect(snap.entities.some((e) => e.type === t && e.faction === "blue"), t).toBe(true);
    }
  });
});
