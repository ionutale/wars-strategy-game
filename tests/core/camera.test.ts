import { describe, expect, it } from "vitest";
import { Camera } from "../../src/core/camera";

describe("Camera", () => {
  it("converts world<->screen at zoom 1", () => {
    const cam = new Camera(800, 600);
    cam.x = 100;
    cam.y = 50;
    expect(cam.worldToScreen(100, 50)).toEqual({ x: 400, y: 300 }); // world point at screen center
    expect(cam.screenToWorld(400, 300)).toEqual({ x: 100, y: 50 });
    expect(cam.screenToWorld(cam.worldToScreen(250, 175).x, cam.worldToScreen(250, 175).y)).toEqual({ x: 250, y: 175 });
  });

  it("pans by screen pixels scaled by zoom", () => {
    const cam = new Camera(800, 600);
    cam.zoom = 2;
    cam.panScreen(20, -10); // 10 world units at zoom 2
    expect(cam.x).toBe(-10); // camera center moves opposite to the drag
    expect(cam.y).toBe(5);
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

  it("clamps zoom to [0.8, 2]", () => {
    const cam = new Camera(800, 600);
    cam.setZoom(5, 0, 0);
    expect(cam.zoom).toBe(2);
    cam.setZoom(0.1, 0, 0);
    expect(cam.zoom).toBe(0.8);
  });

  it("clamps the camera center to the map bounds", () => {
    const cam = new Camera(800, 600);
    cam.zoom = 1;
    cam.x = -500;
    cam.y = 9000;
    cam.clampToMap(1000, 1000);
    expect(cam.x).toBe(400); // halfW
    expect(cam.y).toBe(700); // mapH - halfH = 1000 - 300
    cam.x = 900;
    cam.y = 100;
    cam.clampToMap(1000, 1000);
    expect(cam.x).toBe(600); // mapW - halfW
    expect(cam.y).toBe(300); // halfH
  });
});
