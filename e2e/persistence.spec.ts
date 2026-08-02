import { test, expect } from "@playwright/test";
import { clickButton, killAllBuildings, killEntity, snapshot, startCampaignAt, startSkirmish } from "./helpers";

async function playerId(page: import("@playwright/test").Page): Promise<string> {
  return page.evaluate(() => localStorage.getItem("wars.playerId") ?? "");
}

async function fetchProgress(playerId: string): Promise<{ campaign: Record<string, string>; skirmish: { wins: number; losses: number } }> {
  const res = await fetch(`http://localhost:3001/api/progress?playerId=${encodeURIComponent(playerId)}`);
  expect(res.ok).toBeTruthy();
  return res.json();
}

test.describe("persistence", () => {
  test("a campaign victory records the mission as won", async ({ page }) => {
    await startCampaignAt(page, 0);
    const id = await playerId(page);
    expect(id.length).toBeGreaterThan(8);

    const snap = await snapshot(page);
    await killAllBuildings(page, "red");
    await expect(page.getByRole("heading", { name: "VICTORY" })).toBeVisible({ timeout: 15_000 });

    // wait for the async save to land on the API
    await expect
      .poll(async () => (await fetchProgress(id)).campaign["m1"], { timeout: 10_000 })
      .toBe("won");
  });

  test("a skirmish victory increments skirmish wins (not campaign)", async ({ page }) => {
    await startSkirmish(page);
    const id = await playerId(page);
    const before = (await fetchProgress(id)).skirmish;

    const snap = await snapshot(page);
    await killAllBuildings(page, "red");
    await expect(page.getByRole("heading", { name: "VICTORY" })).toBeVisible({ timeout: 15_000 });

    await expect
      .poll(async () => (await fetchProgress(id)).skirmish.wins, { timeout: 10_000 })
      .toBe(before.wins + 1);
    // campaign map untouched by a skirmish game
    const after = await fetchProgress(id);
    expect(Object.keys(after.campaign).length).toBe(Object.keys(before.campaign ?? {}).length);
  });

  test("a skirmish defeat increments skirmish losses", async ({ page }) => {
    await startSkirmish(page);
    const id = await playerId(page);
    const before = (await fetchProgress(id)).skirmish;

    const snap = await snapshot(page);
    const hall = snap.entities.find((e) => e.type === "town-hall" && e.faction === "blue")!;
    await killEntity(page, hall.id);
    await expect(page.getByRole("heading", { name: "DEFEAT" })).toBeVisible({ timeout: 15_000 });

    await expect
      .poll(async () => (await fetchProgress(id)).skirmish.losses, { timeout: 10_000 })
      .toBe(before.losses + 1);
  });

  test("a second game in the same page load saves again (outcomeSent reset)", async ({ page }) => {
    await startSkirmish(page);
    const id = await playerId(page);
    const before = (await fetchProgress(id)).skirmish;

    // first game: defeat
    let snap = await snapshot(page);
    let hall = snap.entities.find((e) => e.type === "town-hall" && e.faction === "blue")!;
    await killEntity(page, hall.id);
    await expect(page.getByRole("heading", { name: "DEFEAT" })).toBeVisible({ timeout: 15_000 });
    await expect
      .poll(async () => (await fetchProgress(id)).skirmish.losses, { timeout: 10_000 })
      .toBe(before.losses + 1);

    // Play Again -> fresh skirmish; win it
    await clickButton(page, "Play Again");
    snap = await snapshot(page);
    await killAllBuildings(page, "red");
    await expect(page.getByRole("heading", { name: "VICTORY" })).toBeVisible({ timeout: 15_000 });
    await expect
      .poll(async () => (await fetchProgress(id)).skirmish.wins, { timeout: 10_000 })
      .toBe(before.wins + 1);
  });

  test("menu displays saved stats after a win", async ({ page }) => {
    await startSkirmish(page);
    const id = await playerId(page);
    const before = (await fetchProgress(id)).skirmish;
    await killAllBuildings(page, "red");
    await expect(page.getByRole("heading", { name: "VICTORY" })).toBeVisible({ timeout: 15_000 });
    await expect.poll(async () => (await fetchProgress(id)).skirmish.wins, { timeout: 10_000 }).toBe(before.wins + 1);
    await clickButton(page, "Main Menu");
    await expect(page.getByRole("heading", { name: "WARS" })).toBeVisible();
    await expect(page.locator(".menu-stats")).toContainText(`${before.wins + 1}W`);
  });
});
