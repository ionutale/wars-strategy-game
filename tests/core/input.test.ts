import { describe, expect, it } from "vitest";
import { classifyGesture, DragKind, GESTURE_TAP, GESTURE_DRAG, GESTURE_PINCH } from "../../src/core/input";

describe("classifyGesture", () => {
  it("classifies small movement as a tap", () => {
    const g = classifyGesture({ start: { x: 0, y: 0 }, end: { x: 4, y: 3 } });
    expect(g.kind).toBe(GESTURE_TAP);
  });

  it("classifies large movement as a drag", () => {
    const g = classifyGesture({ start: { x: 0, y: 0 }, end: { x: 100, y: 0 } });
    expect(g.kind).toBe(GESTURE_DRAG);
    expect(g.dx).toBe(100);
    expect(g.dy).toBe(0);
  });

  it("classifies two-pointer spread as pinch", () => {
    const g = classifyGesture({ start: { x: 0, y: 0 }, end: { x: 40, y: 0 } }, { start: { x: 100, y: 0 }, end: { x: 160, y: 0 } });
    expect(g.kind).toBe(GESTURE_PINCH);
    expect(g.scale).toBeCloseTo(1.2, 5); // 120/100 = 1.2
  });

  it("returns scale 1 when fingers start at the same point", () => {
    const g = classifyGesture({ start: { x: 50, y: 50 }, end: { x: 60, y: 50 } }, { start: { x: 50, y: 50 }, end: { x: 80, y: 50 } });
    expect(g.kind).toBe(GESTURE_PINCH);
    expect(g.scale).toBe(1);
  });

  it("distinguishes drag kinds", () => {
    const empty = classifyGesture({ start: { x: 0, y: 0 }, end: { x: 100, y: 0 } });
    expect(empty.kind).toBe(GESTURE_DRAG);
    expect(empty.dragKind).toBe(DragKind.Pan);
  });
});
