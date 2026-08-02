import { test, expect } from "@playwright/test";
import { clickButton, selectEntity, snapshot, spawnUnit, startSkirmish, tapCanvas, worldToScreen } from "./helpers";

test.describe("command bar", () => {
  test("combat units see Attack/Move/Stop/Hold buttons", async ({ page }) => {
    await startSkirmish(page);
    const footman = await spawnUnit(page, "footman", "blue", 6, 12);
    await selectEntity(page, footman);
    for (const label of ["Attack", "Move", "Stop", "Hold"]) {
      await expect(page.getByRole("button", { name: label })).toBeVisible();
    }
  });

  test("move command walks the unit to the tapped ground", async ({ page }) => {
    await startSkirmish(page);
    const footman = await spawnUnit(page, "footman", "blue", 6, 12);
    await selectEntity(page, footman);
    await clickButton(page, "Move");
    // tap a destination ~10 tiles to the right (and visible on screen)
    const dest = { x: 16, y: 12 };
    const screen = await worldToScreen(page, dest.x, dest.y);
    await tapCanvas(page, screen.x, screen.y);
    // order is move; unit gets closer to destination
    await expect
      .poll(async () => {
        const s = await snapshot(page);
        const e = s.entities.find((x) => x.id === footman)!;
        return Math.hypot(e.x - dest.x, e.y - dest.y);
      }, { timeout: 15_000 })
      .toBeLessThan(3);
  });

  test("attack command targets an enemy unit", async ({ page }) => {
    await startSkirmish(page);
    const footman = await spawnUnit(page, "footman", "blue", 6, 12);
    const enemy = await spawnUnit(page, "footman", "red", 8, 12);
    await selectEntity(page, footman);
    await clickButton(page, "Attack");
    const epos = await worldToScreen(page, 8, 12);
    await tapCanvas(page, epos.x, epos.y);
    await expect
      .poll(async () => (await snapshot(page)).entities.find((x) => x.id === footman)!.order)
      .toMatchObject({ type: "attack", targetId: enemy });
  });

  test("attack on ground moves the unit", async ({ page }) => {
    await startSkirmish(page);
    const footman = await spawnUnit(page, "footman", "blue", 6, 12);
    await selectEntity(page, footman);
    await clickButton(page, "Attack");
    const dest = { x: 15, y: 12 };
    const screen = await worldToScreen(page, dest.x, dest.y);
    await tapCanvas(page, screen.x, screen.y);
    await expect
      .poll(async () => {
        const e = (await snapshot(page)).entities.find((x) => x.id === footman)!;
        return Math.hypot(e.x - dest.x, e.y - dest.y);
      }, { timeout: 15_000 })
      .toBeLessThan(3);
  });

  test("attack actually deals damage to the target", async ({ page }) => {
    await startSkirmish(page);
    const footman = await spawnUnit(page, "footman", "blue", 6, 12);
    const enemy = await spawnUnit(page, "footman", "red", 7, 12);
    await selectEntity(page, footman);
    await clickButton(page, "Attack");
    const epos = await worldToScreen(page, 7, 12);
    await tapCanvas(page, epos.x, epos.y);
    await expect
      .poll(async () => (await snapshot(page)).entities.find((x) => x.id === enemy)!.hp, { timeout: 15_000 })
      .toBeLessThan(40);
  });

  test("stop command halts the unit", async ({ page }) => {
    await startSkirmish(page);
    const footman = await spawnUnit(page, "footman", "blue", 6, 12);
    await selectEntity(page, footman);
    await clickButton(page, "Move");
    const dest = { x: 20, y: 12 };
    const screen = await worldToScreen(page, dest.x, dest.y);
    await tapCanvas(page, screen.x, screen.y);
    await clickButton(page, "Stop");
    await expect
      .poll(async () => (await snapshot(page)).entities.find((x) => x.id === footman)!.order)
      .toEqual({ type: "stop" });
    // unit no longer moves toward the destination
    const e = (await snapshot(page)).entities.find((x) => x.id === footman)!;
    const pos1 = { x: e.x, y: e.y };
    await page.waitForTimeout(500);
    const e2 = (await snapshot(page)).entities.find((x) => x.id === footman)!;
    expect(Math.hypot(e2.x - pos1.x, e2.y - pos1.y)).toBeLessThan(0.5);
  });

  test("hold command sets hold order", async ({ page }) => {
    await startSkirmish(page);
    const footman = await spawnUnit(page, "footman", "blue", 6, 12);
    await selectEntity(page, footman);
    await clickButton(page, "Hold");
    await expect
      .poll(async () => (await snapshot(page)).entities.find((x) => x.id === footman)!.order)
      .toEqual({ type: "hold" });
  });

  test("a hold unit retaliates when attacked", async ({ page }) => {
    await startSkirmish(page);
    const footman = await spawnUnit(page, "footman", "blue", 6, 12);
    const enemy = await spawnUnit(page, "footman", "red", 7, 12);
    await selectEntity(page, footman);
    await clickButton(page, "Hold");
    // force the enemy to attack the hold unit directly via state
    await page.evaluate(([att, tgt]) => {
      const w = window.__wars!;
      const a = w.session.world.entities.get(att)!;
      const t = w.session.world.entities.get(tgt)!;
      a.order = { type: "attack", targetId: t.id };
      a.x = t.x - 1; // adjacent
      a.y = t.y;
    }, [enemy, footman] as const);
    await expect
      .poll(async () => (await snapshot(page)).entities.find((x) => x.id === footman)!.hp, { timeout: 10_000 })
      .toBeLessThan(40);
    // hold unit now fights back (order changed to attack)
    await expect
      .poll(async () => (await snapshot(page)).entities.find((x) => x.id === footman)!.order)
      .toMatchObject({ type: "attack" });
  });

  test("pause freezes the game and resume continues", async ({ page }) => {
    await startSkirmish(page);
    await expect.poll(async () => (await snapshot(page)).time).toBeGreaterThan(1);
    const t0 = (await snapshot(page)).time;
    await clickButton(page, "⏸");
    await expect(page.getByRole("heading", { name: "PAUSED" })).toBeVisible();
    await page.waitForTimeout(1200);
    const t1 = (await snapshot(page)).time;
    expect(t1).toBeCloseTo(t0, 0); // frozen
    await clickButton(page, "Resume");
    await expect(page.getByRole("heading", { name: "PAUSED" })).toHaveCount(0);
    await expect.poll(async () => (await snapshot(page)).time, { timeout: 10_000 }).toBeGreaterThan(t1 + 1);
  });
});

test("catapult fires at an enemy building when tapped on its edge", async ({ page }) => {
  await startSkirmish(page);
  const snap = await snapshot(page);
  const redHall = snap.entities.find((e) => e.type === "town-hall" && e.faction === "red")!;
  const cat = await spawnUnit(page, "catapult", "blue", redHall.x - 7, redHall.y);
  await selectEntity(page, cat);
  await clickButton(page, "Attack");
  // tap 1.4 tiles from the hall's center — still on its footprint
  const edge = await worldToScreen(page, redHall.x - 1.4, redHall.y);
  await tapCanvas(page, edge.x, edge.y);
  // the tap must register as an attack order, not a move
  await expect
    .poll(async () => (await snapshot(page)).entities.find((x) => x.id === cat)!.order)
    .toMatchObject({ type: "attack", targetId: redHall.id });
  // and the building takes splash damage over time
  await expect
    .poll(async () => (await snapshot(page)).entities.find((x) => x.id === redHall.id)!.hp, { timeout: 20_000 })
    .toBeLessThan(300);
});
