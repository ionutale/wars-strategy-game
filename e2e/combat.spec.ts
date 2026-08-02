import { test, expect } from "@playwright/test";
import { clickButton, selectEntity, snapshot, spawnUnit, startSkirmish, tapCanvas, worldToScreen } from "./helpers";

test.describe("combat", () => {
  test("melee unit chases a distant enemy and damages it", async ({ page }) => {
    await startSkirmish(page);
    const footman = await spawnUnit(page, "footman", "blue", 6, 12);
    const enemy = await spawnUnit(page, "footman", "red", 10, 12); // 4 tiles away
    await selectEntity(page, footman);
    await clickButton(page, "Attack");
    const epos = await worldToScreen(page, 10, 12);
    await tapCanvas(page, epos.x, epos.y);
    // the footman must walk into range, then deal damage
    await expect
      .poll(async () => (await snapshot(page)).entities.find((x) => x.id === enemy)!.hp, { timeout: 20_000 })
      .toBeLessThan(40);
  });

  test("ranged unit damages a distant enemy (projectile)", async ({ page }) => {
    await startSkirmish(page);
    const archer = await spawnUnit(page, "archer", "blue", 6, 12);
    const enemy = await spawnUnit(page, "footman", "red", 9, 12); // 3 tiles, within archer range 4
    await selectEntity(page, archer);
    await clickButton(page, "Attack");
    const epos = await worldToScreen(page, 9, 12);
    await tapCanvas(page, epos.x, epos.y);
    await expect
      .poll(async () => (await snapshot(page)).entities.find((x) => x.id === enemy)!.hp, { timeout: 15_000 })
      .toBeLessThan(40);
    // the archer stays put (ranged units don't chase)
    const a = (await snapshot(page)).entities.find((x) => x.id === archer)!;
    expect(Math.hypot(a.x - 6, a.y - 12)).toBeLessThan(0.5);
  });

  test("a killed unit is removed from the world", async ({ page }) => {
    await startSkirmish(page);
    const footman = await spawnUnit(page, "footman", "blue", 6, 12);
    const enemy = await spawnUnit(page, "footman", "red", 7, 12);
    await selectEntity(page, footman);
    await clickButton(page, "Attack");
    const epos = await worldToScreen(page, 7, 12);
    await tapCanvas(page, epos.x, epos.y);
    // blue footman deals 6 dmg/s; red has 40 hp — should die within ~10s
    await expect
      .poll(async () => {
        const s = await snapshot(page);
        return s.entities.find((x) => x.id === enemy) === undefined;
      }, { timeout: 20_000 })
      .toBe(true);
  });

  test("a gathering worker retaliates when attacked", async ({ page }) => {
    await startSkirmish(page);
    const snap = await snapshot(page);
    const worker = snap.entities.find((e) => e.type === "worker" && e.faction === "blue")!;
    // spawn a red unit adjacent and make it attack the worker
    const attacker = await spawnUnit(page, "footman", "red", worker.x + 1, worker.y);
    await page.evaluate(([att, tgt]) => {
      const w = window.__wars!;
      const a = w.session.world.entities.get(att)!;
      const t = w.session.world.entities.get(tgt)!;
      a.order = { type: "attack", targetId: t.id };
    }, [attacker, worker.id] as const);
    // worker fights back (not on stop order)
    await expect
      .poll(async () => (await snapshot(page)).entities.find((x) => x.id === worker.id)!.order, { timeout: 10_000 })
      .toMatchObject({ type: "attack" });
    // and the attacker takes damage (worker hits for 2)
    await expect
      .poll(async () => (await snapshot(page)).entities.find((x) => x.id === attacker)!.hp, { timeout: 15_000 })
      .toBeLessThan(40);
  });
});
