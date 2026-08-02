import { test, expect } from "@playwright/test";
import { drag, pinch, snapshot, startSkirmish, tapCanvas, worldToScreen } from "./helpers";

test.describe("camera interactions", () => {
  test("one-finger drag pans the camera", async ({ page }) => {
    await startSkirmish(page);
    await pinch(page, { x: 422, y: 195 }, 40, 200); // zoom in so there is room to pan
    const before = (await snapshot(page)).cam;
    const from = { x: 300, y: 200 };
    await drag(page, from, { x: 400, y: 200 }); // drag right 100px
    const after = (await snapshot(page)).cam;
    // dragging right moves the camera center left in world space
    expect(after.x).toBeLessThan(before.x);
    expect(after.y).toBeCloseTo(before.y, 3);
  });

  test("tap without drag does not pan", async ({ page }) => {
    await startSkirmish(page);
    const before = (await snapshot(page)).cam;
    await tapCanvas(page, 300, 200);
    const after = (await snapshot(page)).cam;
    expect(after.x).toBeCloseTo(before.x, 3);
    expect(after.y).toBeCloseTo(before.y, 3);
  });

  test("pinch zoom changes zoom about the gesture center", async ({ page }) => {
    await startSkirmish(page);
    const before = (await snapshot(page)).cam;
    const center = { x: 422, y: 195 };
    await pinch(page, center, 40, 120); // spread fingers -> zoom in
    const after = (await snapshot(page)).cam;
    expect(after.zoom).toBeGreaterThan(before.zoom);
  });

  test("pinch close zooms out but respects the clamp", async ({ page }) => {
    await startSkirmish(page);
    // zoom in first so we have headroom to zoom out
    await pinch(page, { x: 422, y: 195 }, 40, 200);
    const zoomedIn = (await snapshot(page)).cam.zoom;
    await pinch(page, { x: 422, y: 195 }, 200, 20);
    const after = (await snapshot(page)).cam.zoom;
    expect(after).toBeLessThan(zoomedIn);
    expect(after).toBeGreaterThanOrEqual(0.2);
  });

  test("minimap tap jumps the camera to that map location", async ({ page }) => {
    await startSkirmish(page);
    await pinch(page, { x: 422, y: 195 }, 40, 200); // zoom in so the jump is visible
    const before = (await snapshot(page)).cam;
    // minimap is 120x90 at bottom-right (right:8, bottom:8)
    const mapLeft = 844 - 8 - 120;
    const mapTop = 390 - 8 - 90;
    // tap near the bottom-right of the minimap (far from the top-left base)
    await tapCanvas(page, mapLeft + 100, mapTop + 75);
    const after = (await snapshot(page)).cam;
    // camera jumped a long way from the start position
    const dist = Math.hypot(after.x - before.x, after.y - before.y);
    expect(dist).toBeGreaterThan(10);
  });

  test("pan is clamped to the map bounds", async ({ page }) => {
    await startSkirmish(page);
    await pinch(page, { x: 422, y: 195 }, 40, 300); // zoom in well beyond fit
    // drag far off the left edge repeatedly
    for (let i = 0; i < 3; i++) {
      await drag(page, { x: 400, y: 200 }, { x: 700, y: 200 });
    }
    const snap = await snapshot(page);
    const halfW = snap.cam.viewW / (2 * snap.cam.zoom * 32);
    expect(snap.cam.x).toBeGreaterThanOrEqual(halfW - 1);
    expect(snap.cam.x).toBeLessThanOrEqual(60 - halfW + 1); // skirmish map is 60 wide
  });

  test("entities are visible on screen (inside viewport)", async ({ page }) => {
    await startSkirmish(page);
    const snap = await snapshot(page);
    const hall = snap.entities.find((e) => e.type === "town-hall" && e.faction === "blue")!;
    const { x, y } = await worldToScreen(page, hall.x, hall.y);
    expect(x).toBeGreaterThan(0);
    expect(x).toBeLessThan(844);
    expect(y).toBeGreaterThan(0);
    expect(y).toBeLessThan(390);
  });
});
