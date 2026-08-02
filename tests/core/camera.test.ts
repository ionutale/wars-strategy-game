import { describe, expect, it } from "vitest";
import { Camera, PX_PER_TILE } from "../../src/core/camera";

describe("Camera", () => {
  it("converts world<->screen at zoom 1", () => {
    const cam = new Camera(800, 600);
    cam.x = 100;
    cam.y = 50;
    expect(cam.worldToScreen(100, 50)).toEqual({ x: 400, y: 300 }); // world point at screen center
    expect(cam.screenToWorld(400, 300)).toEqual({ x: 100, y: 50 });
    const s = cam.worldToScreen(250, 175);
    expect(s.x).toBe(400 + 150 * PX_PER_TILE);
    expect(s.y).toBe(300 + 125 * PX_PER_TILE);
    expect(cam.screenToWorld(s.x, s.y)).toEqual({ x: 250, y: 175 });
  });

  it("pans by screen pixels scaled by zoom", () => {
    const cam = new Camera(800, 600);
    cam.zoom = 2;
    cam.panScreen(20, -10);
    expect(cam.x).toBeCloseTo(-20 / (2 * PX_PER_TILE), 5); // camera center moves opposite to the drag
    expect(cam.y).toBeCloseTo(10 / (2 * PX_PER_TILE), 5);
  });

  it("zooms about a screen point keeping it fixed", () => {
    const cam = new Camera(800, 600);
    cam.x = 100; cam.y = 100;
    const before = cam.screenToWorld(200, 150);
    cam.setZoom(1.5, 200, 150);
    const after = cam.screenToWorld(200, 150);
    expect(after.x).toBeCloseTo(before.x, 5);
    expect(after.y).toBeCloseTo(before.y, 5);
  });

  it("clamps zoom to [0.2, 3]", () => {
    const cam = new Camera(800, 600);
    cam.setZoom(5, 0, 0);
    expect(cam.zoom).toBe(3);
    cam.setZoom(0.05, 0, 0);
    expect(cam.zoom).toBe(0.2);
  });

  it("clamps the camera center to the map bounds", () => {
    const cam = new Camera(800, 600);
    cam.zoom = 1;
    cam.x = -500;
    cam.y = 9000;
    cam.clampToMap(1000, 1000);
    const halfW = 800 / (2 * PX_PER_TILE);
    const halfH = 600 / (2 * PX_PER_TILE);
    expect(cam.x).toBeCloseTo(halfW, 5);
    expect(cam.y).toBeCloseTo(1000 - halfH, 5);
    cam.x = 999;
    cam.y = -50;
    cam.clampToMap(1000, 1000);
    expect(cam.x).toBeCloseTo(1000 - halfW, 5);
    expect(cam.y).toBeCloseTo(halfH, 5);
  });

  it("computes a zoom that fits the map in the viewport", () => {
    const cam = new Camera(800, 600);
    // 40x30 map: fit = min(800/(40*32), 600/(30*32)) = min(0.625, 0.625)
    expect(cam.fitZoomToMap(40, 30)).toBeCloseTo(0.625, 5);
    // small map fits at max zoom
    expect(cam.fitZoomToMap(5, 5)).toBe(3);
    // huge map clamps at min zoom
    expect(cam.fitZoomToMap(500, 500)).toBe(0.2);
  });
});
